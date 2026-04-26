"""FastAPI backend for AthleteTwin — wallet auth, training records, proof hashes."""
from __future__ import annotations

import logging
import secrets
import sys
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# Allow importing ml/predict
sys.path.insert(0, str(Path(__file__).parent))

from db import (
    NoncePendingError,
    delete_nonce,
    get_nonce,
    get_records_for_wallet,
    init_db,
    save_training_record,
    upsert_nonce,
)
from proof import generate_proof_hash, proof_summary

logger = logging.getLogger("athlete_twin")

MAX_BODY_BYTES = 32 * 1024
MAX_WALLET_STR_LEN = 64
SOLANA_PUBKEY_LEN = 32


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests whose declared Content-Length exceeds MAX_BODY_BYTES."""

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > MAX_BODY_BYTES:
                    return JSONResponse(
                        {"detail": "Payload too large"}, status_code=413
                    )
            except ValueError:
                return JSONResponse({"detail": "Invalid Content-Length"}, status_code=400)
        return await call_next(request)


limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

app = FastAPI(title="AthleteTwin API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(BodySizeLimitMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _validate_wallet(wallet: str) -> bytes:
    """Validate a Solana wallet string and return the decoded 32-byte pubkey."""
    if not isinstance(wallet, str) or len(wallet) == 0 or len(wallet) > MAX_WALLET_STR_LEN:
        raise HTTPException(status_code=400, detail="Invalid wallet.")
    try:
        import base58

        pubkey_bytes = base58.b58decode(wallet)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid wallet.")
    if len(pubkey_bytes) != SOLANA_PUBKEY_LEN:
        raise HTTPException(status_code=400, detail="Invalid wallet.")
    return pubkey_bytes


@app.on_event("startup")
def startup() -> None:
    init_db()


# ─── Auth ────────────────────────────────────────────────────────────────────


class NonceRequest(BaseModel):
    wallet: str


class VerifyRequest(BaseModel):
    wallet: str
    signature: str  # base58-encoded Ed25519 signature
    nonce: str


@app.post("/auth/nonce")
@limiter.limit("5/minute")
def request_nonce(request: Request, body: NonceRequest) -> dict:
    _validate_wallet(body.wallet)
    nonce = secrets.token_hex(16)
    try:
        upsert_nonce(body.wallet, nonce)
    except NoncePendingError as exc:
        raise HTTPException(status_code=429, detail=str(exc))
    return {"nonce": nonce}


@app.post("/auth/verify")
@limiter.limit("10/minute")
def verify_signature(request: Request, body: VerifyRequest) -> dict:
    """Verify a Solana wallet signature over the nonce message."""
    pubkey_bytes = _validate_wallet(body.wallet)

    stored_nonce = get_nonce(body.wallet)
    if stored_nonce is None:
        raise HTTPException(status_code=400, detail="Nonce not found or expired.")
    if stored_nonce != body.nonce:
        raise HTTPException(status_code=400, detail="Nonce mismatch.")

    try:
        try:
            import nacl.signing
            import base58

            sig_bytes = base58.b58decode(body.signature)
            if len(sig_bytes) != 64:
                raise HTTPException(status_code=401, detail="Invalid signature.")
            message = f"AthleteTwin login: {body.nonce}".encode()

            verify_key = nacl.signing.VerifyKey(pubkey_bytes)
            verify_key.verify(message, sig_bytes)
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Signature verification failed: %s", exc)
            raise HTTPException(status_code=401, detail="Invalid signature.")
    finally:
        # Always burn the nonce, even on signature failure, to block brute-retry.
        delete_nonce(body.wallet)

    # In production: return a real JWT. For hackathon: return a simple token.
    token = secrets.token_hex(32)
    return {"token": token, "wallet": body.wallet}


# ─── Training Records ────────────────────────────────────────────────────────


class TrainingRecordIn(BaseModel):
    wallet: str
    exercise: str
    reps: int
    form_score: int          # 0–100
    fatigue_score: int       # 0–100
    strength_delta: int      # predicted delta
    endurance_delta: int
    injury_risk_delta: int
    timestamp: int | None = None


@app.post("/training/save")
@limiter.limit("30/minute")
def save_record(request: Request, body: TrainingRecordIn) -> dict:
    _validate_wallet(body.wallet)
    record = body.model_dump()
    if record["timestamp"] is None:
        record["timestamp"] = int(time.time())

    proof_hash = generate_proof_hash(record)
    record["proof_hash"] = proof_hash

    record_id = save_training_record(record)
    return {
        "id": record_id,
        "proof_hash": proof_hash,
        "summary": proof_summary(record),
    }


@app.get("/training/records/{wallet}")
@limiter.limit("60/minute")
def get_records(request: Request, wallet: str) -> list[dict]:
    _validate_wallet(wallet)
    return get_records_for_wallet(wallet)


# ─── Run ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
