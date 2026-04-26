"""FastAPI backend for AthleteTwin — wallet auth, training records, proof hashes, and badge NFTs."""
from __future__ import annotations

import json
import os
import secrets
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

# Allow importing ml/predict
sys.path.insert(0, str(Path(__file__).parent))

from badges import BADGE_DEFS, badge_def_by_id, evaluate_badges
from db import (
    delete_nonce,
    get_badge_claim,
    get_badge_claims_for_wallet,
    get_nonce,
    get_records_for_wallet,
    get_records_for_wallet_asc,
    init_db,
    save_badge_claim,
    save_training_record,
    upsert_nonce,
)
from ml.predict import predict_from_payload
from proof import generate_proof_hash, proof_summary

app = FastAPI(title="AthleteTwin API")
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_ROOT = Path(__file__).resolve().parent


def load_env_files() -> None:
    for env_path in (PROJECT_ROOT / ".env", BACKEND_ROOT / ".env"):
        if not env_path.exists():
            continue
        for raw_line in env_path.read_text().splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            if not key:
                continue
            os.environ.setdefault(key, value)


load_env_files()


def get_allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "").strip()
    if raw:
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
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
        import base58

        pubkey_bytes = base58.b58decode(body.wallet)
        sig_bytes = base58.b58decode(body.signature)
        message = f"AthleteTwin login: {body.nonce}".encode()

        verify_key = nacl.signing.VerifyKey(pubkey_bytes)
        verify_key.verify(message, sig_bytes)
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid signature: {exc}") from exc

    delete_nonce(body.wallet)
    # In production: return a real JWT. For hackathon: return a simple token.
    token = secrets.token_hex(32)
    return {"token": token, "wallet": body.wallet}


@app.post("/predict")
def predict(body: dict[str, Any]) -> dict[str, Any]:
    try:
        return predict_from_payload(body)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc


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


class BadgeClaimIn(BaseModel):
    wallet: str
    badge_id: str


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
        "badges": build_badge_response(record["wallet"]),
    }


@app.get("/training/records/{wallet}")
def get_records(wallet: str) -> list[dict]:
    return get_records_for_wallet(wallet)


# ─── Badges ──────────────────────────────────────────────────────────────────


@app.get("/badges/catalog")
def get_badge_catalog() -> list[dict]:
    return BADGE_DEFS


@app.get("/badges/{wallet}")
def get_badges(wallet: str) -> list[dict]:
    return build_badge_response(wallet)


@app.post("/badges/claim")
def claim_badge(body: BadgeClaimIn) -> dict:
    badge = badge_def_by_id(body.badge_id)
    if badge is None:
        raise HTTPException(status_code=404, detail="Badge not found.")

    existing_claim = get_badge_claim(body.wallet, body.badge_id)
    if existing_claim is not None:
        return {
            "ok": True,
            "already_claimed": True,
            "badge": merge_badge_and_claim(badge, existing_claim),
        }

    badges = build_badge_response(body.wallet)
    badge_state = next((item for item in badges if item["id"] == body.badge_id), None)
    if badge_state is None or not badge_state["eligible"]:
        raise HTTPException(status_code=400, detail="Milestone not reached yet.")

    metadata_uri = badge_metadata_uri(body.badge_id)
    minted = mint_badge_nft(wallet=body.wallet, badge=badge, metadata_uri=metadata_uri)
    claimed_at = int(time.time())
    save_badge_claim(
        wallet=body.wallet,
        badge_id=body.badge_id,
        badge_account=minted["badge_account"],
        mint_address=minted["mint_address"],
        tx_signature=minted["tx_signature"],
        metadata_uri=metadata_uri,
        claimed_at=claimed_at,
    )

    claim = get_badge_claim(body.wallet, body.badge_id)
    return {
        "ok": True,
        "already_claimed": False,
        "badge": merge_badge_and_claim(badge_state, claim),
    }


@app.get("/badge-metadata/{badge_id}.json")
def get_badge_metadata(badge_id: str) -> dict:
    badge = badge_def_by_id(badge_id)
    if badge is None:
        raise HTTPException(status_code=404, detail="Badge not found.")
    image_uri = badge_image_uri(badge_id)
    return {
        "name": f"{badge['name']} · doppel",
        "symbol": "DOPPEL",
        "description": badge["description"],
        "image": image_uri,
        "attributes": [
            {"trait_type": "Category", "value": "Milestone Badge"},
            {"trait_type": "Milestone", "value": badge["name"]},
            {"trait_type": "Rule", "value": badge["short_rule"]},
        ],
        "properties": {
            "files": [{"uri": image_uri, "type": "image/svg+xml"}],
            "category": "image",
        },
    }


@app.get("/badge-art/{badge_id}.svg")
def get_badge_art(badge_id: str) -> Response:
    badge = badge_def_by_id(badge_id)
    if badge is None:
        raise HTTPException(status_code=404, detail="Badge not found.")
    badge_slug = badge["id"].replace("-", " ").upper()
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="{badge['name']}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050816"/>
      <stop offset="55%" stop-color="{badge['accent']}"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <radialGradient id="shine" cx="50%" cy="35%" r="60%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.7)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="800" height="800" rx="60" fill="url(#bg)"/>
  <circle cx="400" cy="310" r="172" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="18"/>
  <circle cx="400" cy="310" r="120" fill="url(#shine)" opacity="0.6"/>
  <path d="M270 525h260l-54 118H324z" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.5)" stroke-width="10"/>
  <text x="400" y="292" text-anchor="middle" fill="#f8fafc" font-size="54" font-family="Avenir Next, Trebuchet MS, sans-serif" letter-spacing="8">DOPPEL</text>
  <text x="400" y="350" text-anchor="middle" fill="#e2e8f0" font-size="70" font-family="Avenir Next, Trebuchet MS, sans-serif" font-weight="700">{badge['name']}</text>
  <text x="400" y="610" text-anchor="middle" fill="#e2e8f0" font-size="28" font-family="SFMono-Regular, ui-monospace, monospace" letter-spacing="5">{badge_slug}</text>
  <text x="400" y="664" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-size="24" font-family="SFMono-Regular, ui-monospace, monospace">SOLANA DEVNET ACHIEVEMENT NFT</text>
</svg>"""
    return Response(content=svg, media_type="image/svg+xml")


# ─── Helpers ─────────────────────────────────────────────────────────────────


def build_badge_response(wallet: str) -> list[dict]:
    records = get_records_for_wallet_asc(wallet)
    claims = get_badge_claims_for_wallet(wallet)
    claimed_ids = [claim["badge_id"] for claim in claims]
    badges = evaluate_badges(records, claimed_ids)
    claims_by_badge_id = {claim["badge_id"]: claim for claim in claims}
    return [
        merge_badge_and_claim(badge, claims_by_badge_id.get(badge["id"]))
        for badge in badges
    ]


def merge_badge_and_claim(badge: dict, claim: dict | None) -> dict:
    if claim is None:
        return {
            **badge,
            "mint_address": None,
            "badge_account": None,
            "tx_signature": None,
            "metadata_uri": badge_metadata_uri(badge["id"]),
            "claimed_at": None,
        }
    return {
        **badge,
        "claimed": True,
        "claimable": False,
        "badge_account": claim["badge_account"] or None,
        "mint_address": claim["mint_address"],
        "tx_signature": claim["tx_signature"],
        "metadata_uri": claim["metadata_uri"],
        "claimed_at": claim["claimed_at"],
    }


def badge_metadata_uri(badge_id: str) -> str:
    base = os.getenv("BADGE_BASE_URL", "").strip().rstrip("/")
    if base:
        return f"{base}/badge-metadata/{badge_id}.json"
    return f"http://localhost:8000/badge-metadata/{badge_id}.json"


def badge_image_uri(badge_id: str) -> str:
    base = os.getenv("BADGE_BASE_URL", "").strip().rstrip("/")
    if base:
        return f"{base}/badge-art/{badge_id}.svg"
    return f"http://localhost:8000/badge-art/{badge_id}.svg"


def mint_badge_nft(*, wallet: str, badge: dict, metadata_uri: str) -> dict[str, str]:
    script = PROJECT_ROOT / "frontend" / "scripts" / "mint-badge.mjs"
    env = os.environ.copy()
    env["BADGE_NAME"] = badge["name"]
    env["BADGE_SYMBOL"] = "DOPPEL"
    env["BADGE_ID"] = badge["id"]
    env["BADGE_METADATA_URI"] = metadata_uri
    env["BADGE_RECIPIENT"] = wallet

    try:
        proc = subprocess.run(
            ["node", str(script)],
            cwd=PROJECT_ROOT,
            check=True,
            capture_output=True,
            text=True,
            env=env,
        )
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.strip() or exc.stdout.strip() or str(exc)
        raise HTTPException(status_code=500, detail=f"Badge mint failed: {stderr}") from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail="Node.js is required to mint badge NFTs.") from exc

    try:
        payload = json.loads(proc.stdout.strip())
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="Badge minter returned invalid JSON.") from exc

    if (
        not payload.get("mintAddress")
        or not payload.get("txSignature")
        or not payload.get("badgeAccount")
    ):
        raise HTTPException(status_code=500, detail="Badge minter returned incomplete result.")

    return {
        "badge_account": payload["badgeAccount"],
        "mint_address": payload["mintAddress"],
        "tx_signature": payload["txSignature"],
    }


# ─── Run ─────────────────────────────────────────────────────────────────────


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
