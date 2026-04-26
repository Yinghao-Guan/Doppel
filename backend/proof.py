"""Proof hash generation for training records."""
from __future__ import annotations

import hashlib
import json


def generate_proof_hash(record: dict) -> str:
    """SHA-256 hash of the canonical JSON of the training record."""
    # Exclude proof_hash itself if present, and id
    canonical = {k: v for k, v in record.items() if k not in ("proof_hash", "id")}
    data = json.dumps(canonical, sort_keys=True)
    return hashlib.sha256(data.encode()).hexdigest()


def proof_summary(record: dict) -> dict:
    return {
        "exercise": record.get("exercise"),
        "reps": record.get("reps"),
        "form_score": record.get("form_score"),
        "proof_hash": record.get("proof_hash"),
    }
