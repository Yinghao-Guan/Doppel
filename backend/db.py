"""SQLite database setup and helpers."""
from __future__ import annotations

import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).parent / "athlete.db"
NONCE_TTL_SECONDS = 300


class NoncePendingError(Exception):
    """Raised when a fresh nonce already exists for this wallet."""


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS training_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                wallet TEXT NOT NULL,
                exercise TEXT NOT NULL,
                reps INTEGER NOT NULL,
                form_score INTEGER NOT NULL,
                fatigue_score INTEGER NOT NULL,
                strength_delta INTEGER NOT NULL,
                endurance_delta INTEGER NOT NULL,
                injury_risk_delta INTEGER NOT NULL,
                proof_hash TEXT NOT NULL,
                timestamp INTEGER NOT NULL
            )
        """)
        conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_training_records_proof_hash "
            "ON training_records(proof_hash)"
        )
        conn.execute("""
            CREATE TABLE IF NOT EXISTS nonces (
                wallet TEXT PRIMARY KEY,
                nonce TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
        """)
        conn.commit()


def save_training_record(record: dict) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO training_records
               (wallet, exercise, reps, form_score, fatigue_score,
                strength_delta, endurance_delta, injury_risk_delta, proof_hash, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                record["wallet"],
                record["exercise"],
                record["reps"],
                record["form_score"],
                record["fatigue_score"],
                record["strength_delta"],
                record["endurance_delta"],
                record["injury_risk_delta"],
                record["proof_hash"],
                record.get("timestamp", int(time.time())),
            ),
        )
        conn.commit()
        return cur.lastrowid


def get_records_for_wallet(wallet: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM training_records WHERE wallet = ? ORDER BY timestamp DESC",
            (wallet,),
        ).fetchall()
        return [dict(row) for row in rows]


def upsert_nonce(wallet: str, nonce: str) -> None:
    """Insert a nonce. If a pending one exists, raise NoncePendingError so
    attackers can't overwrite a victim's pending nonce by spamming /auth/nonce."""
    now = int(time.time())
    with get_conn() as conn:
        # Sweep expired nonce for this wallet first.
        conn.execute(
            "DELETE FROM nonces WHERE wallet = ? AND created_at < ?",
            (wallet, now - NONCE_TTL_SECONDS),
        )
        try:
            conn.execute(
                "INSERT INTO nonces (wallet, nonce, created_at) VALUES (?, ?, ?)",
                (wallet, nonce, now),
            )
        except sqlite3.IntegrityError as exc:
            raise NoncePendingError(
                "A nonce is already pending for this wallet. Wait or complete the existing flow."
            ) from exc
        conn.commit()


def get_nonce(wallet: str) -> str | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT nonce, created_at FROM nonces WHERE wallet = ?", (wallet,)
        ).fetchone()
        if not row:
            return None
        if int(time.time()) - row["created_at"] > NONCE_TTL_SECONDS:
            return None
        return row["nonce"]


def delete_nonce(wallet: str) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM nonces WHERE wallet = ?", (wallet,))
        conn.commit()
