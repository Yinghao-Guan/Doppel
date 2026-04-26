"""Badge milestone rules and response shaping."""
from __future__ import annotations

from collections.abc import Iterable
from datetime import UTC, datetime
from typing import TypedDict


class BadgeDef(TypedDict):
    id: str
    name: str
    description: str
    short_rule: str
    accent: str


BADGE_DEFS: list[BadgeDef] = [
    {
        "id": "proof-starter",
        "name": "Proof Starter",
        "description": "Awarded for putting your first verified workout on Solana.",
        "short_rule": "Submit 1 onchain training proof.",
        "accent": "#7dd3fc",
    },
    {
        "id": "consistency-10",
        "name": "Consistency 10",
        "description": "Awarded for building an early habit with ten recorded workouts.",
        "short_rule": "Reach 10 total training proofs.",
        "accent": "#34d399",
    },
    {
        "id": "form-elite",
        "name": "Form Elite",
        "description": "Awarded for demonstrating consistently strong technique.",
        "short_rule": "Score 90+ form on 3 workouts.",
        "accent": "#fbbf24",
    },
    {
        "id": "streak-7",
        "name": "Streak 7",
        "description": "Awarded for showing up seven days in a row.",
        "short_rule": "Record workouts on 7 consecutive days.",
        "accent": "#f472b6",
    },
]


def badge_def_by_id(badge_id: str) -> BadgeDef | None:
    for badge in BADGE_DEFS:
        if badge["id"] == badge_id:
            return badge
    return None


def evaluate_badges(records: list[dict], claimed_badge_ids: Iterable[str]) -> list[dict]:
    claimed_set = set(claimed_badge_ids)
    total_workouts = len(records)
    elite_workouts = sum(1 for record in records if int(record.get("form_score", 0)) >= 90)
    streak_days = longest_daily_streak(records)

    progress = {
        "proof-starter": min(total_workouts, 1),
        "consistency-10": min(total_workouts, 10),
        "form-elite": min(elite_workouts, 3),
        "streak-7": min(streak_days, 7),
    }
    targets = {
        "proof-starter": 1,
        "consistency-10": 10,
        "form-elite": 3,
        "streak-7": 7,
    }
    achieved = {
        "proof-starter": total_workouts >= 1,
        "consistency-10": total_workouts >= 10,
        "form-elite": elite_workouts >= 3,
        "streak-7": streak_days >= 7,
    }

    results: list[dict] = []
    for badge in BADGE_DEFS:
        badge_id = badge["id"]
        results.append(
            {
                **badge,
                "eligible": achieved[badge_id],
                "claimed": badge_id in claimed_set,
                "claimable": achieved[badge_id] and badge_id not in claimed_set,
                "progress": progress[badge_id],
                "target": targets[badge_id],
            }
        )
    return results


def longest_daily_streak(records: list[dict]) -> int:
    if not records:
        return 0

    unique_days = sorted(
        {
            datetime.fromtimestamp(int(record["timestamp"]), UTC).date()
            for record in records
            if record.get("timestamp") is not None
        }
    )
    if not unique_days:
        return 0

    longest = 1
    current = 1
    for idx in range(1, len(unique_days)):
        delta = (unique_days[idx] - unique_days[idx - 1]).days
        if delta == 1:
            current += 1
            longest = max(longest, current)
        elif delta > 1:
            current = 1
    return longest
