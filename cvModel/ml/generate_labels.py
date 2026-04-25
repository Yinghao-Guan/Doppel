from __future__ import annotations

import csv
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
TRAINING_DATA_PATH = ROOT_DIR / "data" / "processed" / "training_data.csv"

TARGET_FEATURES = [
    "readiness_score",
    "injury_risk_score",
    "strength_potential_score",
    "endurance_potential_score",
]

EXPERIENCE_SCORES = {
    "Beginner": 0.35,
    "Intermediate": 0.65,
    "Advanced": 0.90,
}


def clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def round4(value: float) -> float:
    return round(value, 4)


def normalize(value: float, min_value: float, max_value: float) -> float:
    if max_value <= min_value:
        return 0.0
    return clamp((value - min_value) / (max_value - min_value))


def calculate_recovery_score(row: dict[str, str]) -> float:
    resting_bpm = float(row["Resting_BPM"])
    fatigue_slope = float(row["fatigue_slope"])
    water_intake = float(row["Water_Intake"])

    resting_component = 1.0 - normalize(resting_bpm, 50.0, 90.0)
    hydration_component = normalize(water_intake, 1.5, 4.0)
    recovery_score = (
        0.60 * resting_component
        + 0.25 * hydration_component
        + 0.15 * (1.0 - fatigue_slope)
    )
    return clamp(recovery_score)


def calculate_hydration_score(row: dict[str, str]) -> float:
    water_intake = float(row["Water_Intake"])
    return clamp(normalize(water_intake, 1.5, 4.0))


def calculate_workout_frequency_score(row: dict[str, str]) -> float:
    workout_frequency = float(row["Workout_Frequency"])
    return clamp(normalize(workout_frequency, 1.0, 7.0))


def calculate_session_duration_score(row: dict[str, str]) -> float:
    session_duration = float(row["Session_Duration"])
    return clamp(normalize(session_duration, 0.5, 2.0))


def calculate_cardio_signal(row: dict[str, str]) -> float:
    avg_bpm = float(row["Avg_BPM"])
    max_bpm = float(row["Max_BPM"])
    resting_bpm = float(row["Resting_BPM"])

    effort_component = clamp(avg_bpm / max(max_bpm, 1.0))
    recovery_component = 1.0 - normalize(resting_bpm, 50.0, 90.0)
    return clamp(0.65 * effort_component + 0.35 * recovery_component)


def calculate_experience_score(row: dict[str, str]) -> float:
    return EXPERIENCE_SCORES.get(str(row["Experience_Level"]).strip().title(), 0.35)


def generate_labels(row: dict[str, str]) -> dict[str, float]:
    movement_quality_score = float(row["movement_quality_score"])
    fatigue_slope = float(row["fatigue_slope"])
    knee_valgus_risk = float(row["knee_valgus_risk"])
    left_right_asymmetry = float(row["left_right_asymmetry"])
    back_angle_risk = float(row["back_angle_risk"])
    avg_form_score = float(row["avg_form_score"])

    recovery_score = calculate_recovery_score(row)
    experience_score = calculate_experience_score(row)
    hydration_score = calculate_hydration_score(row)
    workout_frequency_score = calculate_workout_frequency_score(row)
    session_duration_score = calculate_session_duration_score(row)
    cardio_signal = calculate_cardio_signal(row)

    readiness_score = clamp(
        0.30 * movement_quality_score
        + 0.25 * recovery_score
        + 0.20 * experience_score
        + 0.15 * hydration_score
        - 0.20 * fatigue_slope
    )

    injury_risk_score = clamp(
        0.30 * knee_valgus_risk
        + 0.25 * left_right_asymmetry
        + 0.20 * fatigue_slope
        + 0.15 * back_angle_risk
        + 0.10 * (1.0 - avg_form_score)
    )

    strength_potential_score = clamp(
        0.30 * movement_quality_score
        + 0.25 * workout_frequency_score
        + 0.20 * experience_score
        + 0.15 * session_duration_score
        - 0.15 * fatigue_slope
    )

    endurance_potential_score = clamp(
        0.30 * cardio_signal
        + 0.25 * workout_frequency_score
        + 0.20 * session_duration_score
        + 0.15 * recovery_score
        - 0.10 * fatigue_slope
    )

    return {
        "readiness_score": round4(readiness_score),
        "injury_risk_score": round4(injury_risk_score),
        "strength_potential_score": round4(strength_potential_score),
        "endurance_potential_score": round4(endurance_potential_score),
    }


def build_labeled_training_data(path: Path = TRAINING_DATA_PATH) -> None:
    with path.open("r", encoding="utf-8", newline="") as source_file:
        reader = csv.DictReader(source_file)
        rows = []
        fieldnames = list(reader.fieldnames or [])
        for row in reader:
            labeled_row = {**row, **generate_labels(row)}
            rows.append(labeled_row)

    for target in TARGET_FEATURES:
        if target not in fieldnames:
            fieldnames.append(target)

    with path.open("w", encoding="utf-8", newline="") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    build_labeled_training_data()
    print(f"Saved labeled dataset to {TRAINING_DATA_PATH}")


if __name__ == "__main__":
    main()
