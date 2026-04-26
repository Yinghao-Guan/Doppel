"""FastAPI backend for AthleteTwin — wallet auth, training records, proof hashes."""
from __future__ import annotations

import secrets
import sys
import time
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Allow importing ml/predict
sys.path.insert(0, str(Path(__file__).parent))

from db import (
    delete_nonce,
    get_nonce,
    get_records_for_wallet,
    init_db,
    save_training_record,
    upsert_nonce,
)
from proof import generate_proof_hash, proof_summary

app = FastAPI(title="AthleteTwin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
def request_nonce(body: NonceRequest) -> dict:
    nonce = secrets.token_hex(16)
    upsert_nonce(body.wallet, nonce)
    return {"nonce": nonce}


@app.post("/auth/verify")
def verify_signature(body: VerifyRequest) -> dict:
    """Verify a Solana wallet signature over the nonce message."""
    stored_nonce = get_nonce(body.wallet)
    if stored_nonce is None:
        raise HTTPException(status_code=400, detail="Nonce not found or expired.")
    if stored_nonce != body.nonce:
        raise HTTPException(status_code=400, detail="Nonce mismatch.")

    try:
        import nacl.signing
        import nacl.encoding
        import base58

        pubkey_bytes = base58.b58decode(body.wallet)
        sig_bytes = base58.b58decode(body.signature)
        message = f"AthleteTwin login: {body.nonce}".encode()

        verify_key = nacl.signing.VerifyKey(pubkey_bytes)
        verify_key.verify(message, sig_bytes)
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid signature: {exc}")

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
def save_record(body: TrainingRecordIn) -> dict:
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
def get_records(wallet: str) -> list[dict]:
    return get_records_for_wallet(wallet)


# ─── Run ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
