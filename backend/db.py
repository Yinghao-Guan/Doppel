"""SQLite database setup and helpers."""
from __future__ import annotations

import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).parent / "athlete.db"


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
        conn.execute("""
            CREATE TABLE IF NOT EXISTS nonces (
                wallet TEXT PRIMARY KEY,
                nonce TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS badge_claims (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                wallet TEXT NOT NULL,
                badge_id TEXT NOT NULL,
                badge_account TEXT NOT NULL DEFAULT '',
                mint_address TEXT NOT NULL,
                tx_signature TEXT NOT NULL,
                metadata_uri TEXT NOT NULL,
                claimed_at INTEGER NOT NULL,
                UNIQUE(wallet, badge_id)
            )
        """)
        ensure_column(conn, "badge_claims", "badge_account", "TEXT NOT NULL DEFAULT ''")
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


def get_records_for_wallet_asc(wallet: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM training_records WHERE wallet = ? ORDER BY timestamp ASC, id ASC",
            (wallet,),
        ).fetchall()
        return [dict(row) for row in rows]


def save_badge_claim(
    wallet: str,
    badge_id: str,
    badge_account: str,
    mint_address: str,
    tx_signature: str,
    metadata_uri: str,
    claimed_at: int | None = None,
) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO badge_claims
               (wallet, badge_id, badge_account, mint_address, tx_signature, metadata_uri, claimed_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                wallet,
                badge_id,
                badge_account,
                mint_address,
                tx_signature,
                metadata_uri,
                claimed_at or int(time.time()),
            ),
        )
        conn.commit()
        return cur.lastrowid


def get_badge_claims_for_wallet(wallet: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM badge_claims WHERE wallet = ? ORDER BY claimed_at DESC, id DESC",
            (wallet,),
        ).fetchall()
        return [dict(row) for row in rows]


def get_badge_claim(wallet: str, badge_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM badge_claims WHERE wallet = ? AND badge_id = ?",
            (wallet, badge_id),
        ).fetchone()
        return dict(row) if row else None


def upsert_nonce(wallet: str, nonce: str) -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO nonces (wallet, nonce, created_at) VALUES (?, ?, ?)",
            (wallet, nonce, int(time.time())),
        )
        conn.commit()


def get_nonce(wallet: str) -> str | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT nonce, created_at FROM nonces WHERE wallet = ?", (wallet,)
        ).fetchone()
        if not row:
            return None
        # Nonce expires after 5 minutes
        if int(time.time()) - row["created_at"] > 300:
            return None
        return row["nonce"]


def delete_nonce(wallet: str) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM nonces WHERE wallet = ?", (wallet,))
        conn.commit()


def ensure_column(
    conn: sqlite3.Connection,
    table_name: str,
    column_name: str,
    column_def: str,
) -> None:
    columns = {
        row["name"]
        for row in conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    }
    if column_name not in columns:
        conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_def}")
