from __future__ import annotations

import csv
import json
import random
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
RAW_DATA_PATH = ROOT_DIR / "data" / "raw" / "fitness.csv"
PROCESSED_DATA_PATH = ROOT_DIR / "data" / "processed" / "training_data.csv"
FEATURE_SCHEMA_PATH = ROOT_DIR / "models" / "feature_columns.json"
RANDOM_SEED = 42

REAL_FEATURES = [
    "Age",
    "Gender",
    "Weight",
    "Height",
    "Max_BPM",
    "Avg_BPM",
    "Resting_BPM",
    "Session_Duration",
    "Calories_Burned",
    "Workout_Type",
    "Fat_Percentage",
    "Water_Intake",
    "Workout_Frequency",
    "Experience_Level",
    "BMI",
]

SYNTHETIC_CV_FEATURES = [
    "rep_count",
    "avg_depth_score",
    "avg_form_score",
    "tempo_consistency",
    "stability_score",
    "left_right_asymmetry",
    "fatigue_slope",
    "range_of_motion",
    "knee_valgus_risk",
    "back_angle_risk",
    "movement_quality_score",
]

TARGET_FEATURES = [
    "readiness_score",
    "injury_risk_score",
    "strength_potential_score",
    "endurance_potential_score",
]

RAW_COLUMN_MAPPING = {
    "Weight (kg)": "Weight",
    "Height (m)": "Height",
    "Session_Duration (hours)": "Session_Duration",
    "Water_Intake (liters)": "Water_Intake",
    "Workout_Frequency (days/week)": "Workout_Frequency",
}

EXPERIENCE_LABELS = {
    1: "Beginner",
    2: "Intermediate",
    3: "Advanced",
}

EXPERIENCE_RANGES = {
    "Beginner": {
        "form_score": (0.45, 0.75),
        "depth_score": (0.40, 0.75),
        "tempo": (0.40, 0.75),
        "stability": (0.40, 0.75),
        "asymmetry": (0.15, 0.45),
        "fatigue": (0.20, 0.60),
        "rep_count": (8, 18),
    },
    "Intermediate": {
        "form_score": (0.60, 0.88),
        "depth_score": (0.60, 0.90),
        "tempo": (0.60, 0.88),
        "stability": (0.60, 0.88),
        "asymmetry": (0.08, 0.30),
        "fatigue": (0.10, 0.40),
        "rep_count": (12, 24),
    },
    "Advanced": {
        "form_score": (0.75, 0.98),
        "depth_score": (0.75, 1.00),
        "tempo": (0.75, 0.98),
        "stability": (0.75, 0.98),
        "asymmetry": (0.03, 0.18),
        "fatigue": (0.03, 0.25),
        "rep_count": (16, 30),
    },
}

NUMERIC_REAL_FEATURES = [
    "Age",
    "Weight",
    "Height",
    "Max_BPM",
    "Avg_BPM",
    "Resting_BPM",
    "Session_Duration",
    "Calories_Burned",
    "Fat_Percentage",
    "Water_Intake",
    "Workout_Frequency",
    "BMI",
]


def clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def normalize_experience_level(value: str) -> str:
    text = str(value).strip().title()
    if text in EXPERIENCE_RANGES:
        return text
    if text.isdigit():
        return EXPERIENCE_LABELS.get(int(text), "Beginner")
    try:
        return EXPERIENCE_LABELS.get(int(float(text)), "Beginner")
    except ValueError:
        return "Beginner"


def standardize_real_row(row: dict[str, str]) -> dict[str, object]:
    renamed = {}
    for source_key, value in row.items():
        target_key = RAW_COLUMN_MAPPING.get(source_key, source_key)
        renamed[target_key] = value

    missing = [column for column in REAL_FEATURES if column not in renamed]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    cleaned: dict[str, object] = {}
    for column in NUMERIC_REAL_FEATURES:
        raw_value = str(renamed[column]).strip()
        if raw_value == "":
            raise ValueError(f"Missing numeric value for {column}")
        cleaned[column] = float(raw_value)

    cleaned["Gender"] = str(renamed["Gender"]).strip().title()
    cleaned["Workout_Type"] = str(renamed["Workout_Type"]).strip().title()
    cleaned["Experience_Level"] = normalize_experience_level(str(renamed["Experience_Level"]))
    return cleaned


def round4(value: float) -> float:
    return round(value, 4)


def generate_cv_features(row: dict[str, object], rng: random.Random) -> dict[str, object]:
    experience = str(row["Experience_Level"])
    bmi = float(row["BMI"])
    workout_freq = float(row["Workout_Frequency"])
    avg_bpm = float(row["Avg_BPM"])
    resting_bpm = float(row["Resting_BPM"])
    duration = float(row["Session_Duration"])

    ranges = EXPERIENCE_RANGES[experience]

    avg_form_score = rng.uniform(*ranges["form_score"])
    avg_depth_score = rng.uniform(*ranges["depth_score"])
    tempo_consistency = rng.uniform(*ranges["tempo"])
    stability_score = rng.uniform(*ranges["stability"])
    left_right_asymmetry = rng.uniform(*ranges["asymmetry"])
    fatigue_slope = rng.uniform(*ranges["fatigue"])

    bmi_factor = clamp((bmi - 25.0) / 15.0)
    duration_factor = clamp((duration - 1.0) / 1.0)
    avg_bpm_factor = clamp((avg_bpm - 140.0) / 40.0)
    workout_factor = clamp((workout_freq - 3.0) / 4.0)
    recovery_penalty = clamp((resting_bpm - 60.0) / 20.0)

    stability_score = clamp(stability_score - 0.15 * bmi_factor - 0.05 * recovery_penalty)
    fatigue_slope = clamp(
        fatigue_slope
        + 0.12 * bmi_factor
        + 0.12 * duration_factor
        + 0.10 * avg_bpm_factor
        + 0.05 * workout_factor
        + 0.05 * recovery_penalty
    )

    avg_form_score = clamp(avg_form_score - 0.05 * fatigue_slope + rng.uniform(-0.03, 0.03))
    avg_depth_score = clamp(avg_depth_score - 0.08 * bmi_factor - 0.04 * fatigue_slope + rng.uniform(-0.03, 0.03))
    tempo_consistency = clamp(tempo_consistency - 0.06 * fatigue_slope + rng.uniform(-0.03, 0.03))
    left_right_asymmetry = clamp(left_right_asymmetry + 0.08 * bmi_factor + 0.06 * fatigue_slope + rng.uniform(-0.02, 0.02))

    range_of_motion = clamp(
        0.45 * avg_depth_score
        + 0.30 * avg_form_score
        + 0.20 * stability_score
        - 0.10 * bmi_factor
        + rng.uniform(-0.04, 0.04)
    )
    knee_valgus_risk = clamp(
        0.45 * left_right_asymmetry
        + 0.30 * (1.0 - stability_score)
        + 0.20 * bmi_factor
        + 0.10 * fatigue_slope
        + rng.uniform(-0.04, 0.04)
    )
    back_angle_risk = clamp(
        0.40 * (1.0 - avg_form_score)
        + 0.25 * fatigue_slope
        + 0.20 * (1.0 - stability_score)
        + 0.15 * duration_factor
        + rng.uniform(-0.04, 0.04)
    )

    rep_baseline = rng.randint(ranges["rep_count"][0], ranges["rep_count"][1])
    rep_adjustment = round(6 * duration_factor + 2 * workout_factor - 2 * fatigue_slope)
    rep_count = max(4, rep_baseline + rep_adjustment)

    movement_quality_score = clamp(
        0.30 * avg_form_score
        + 0.20 * avg_depth_score
        + 0.20 * tempo_consistency
        + 0.20 * stability_score
        + 0.10 * range_of_motion
        - 0.10 * left_right_asymmetry
    )

    return {
        "rep_count": rep_count,
        "avg_depth_score": round4(avg_depth_score),
        "avg_form_score": round4(avg_form_score),
        "tempo_consistency": round4(tempo_consistency),
        "stability_score": round4(stability_score),
        "left_right_asymmetry": round4(left_right_asymmetry),
        "fatigue_slope": round4(fatigue_slope),
        "range_of_motion": round4(range_of_motion),
        "knee_valgus_risk": round4(knee_valgus_risk),
        "back_angle_risk": round4(back_angle_risk),
        "movement_quality_score": round4(movement_quality_score),
    }


def save_feature_schema(path: Path = FEATURE_SCHEMA_PATH) -> None:
    schema = {
        "real_features": REAL_FEATURES,
        "synthetic_cv_features": SYNTHETIC_CV_FEATURES,
        "target_features": TARGET_FEATURES,
        "categorical_features": ["Gender", "Workout_Type", "Experience_Level"],
        "numeric_real_features": NUMERIC_REAL_FEATURES,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")


def build_training_dataset(input_path: Path = RAW_DATA_PATH, output_path: Path = PROCESSED_DATA_PATH) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    rng = random.Random(RANDOM_SEED)
    fieldnames = REAL_FEATURES + SYNTHETIC_CV_FEATURES

    with input_path.open("r", encoding="utf-8", newline="") as source_file:
        reader = csv.DictReader(source_file)
        rows = []
        for raw_row in reader:
            try:
                real_row = standardize_real_row(raw_row)
            except ValueError:
                continue
            cv_row = generate_cv_features(real_row, rng)
            rows.append({**real_row, **cv_row})

    with output_path.open("w", encoding="utf-8", newline="") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    build_training_dataset()
    save_feature_schema()
    print(f"Saved processed dataset to {PROCESSED_DATA_PATH}")
    print(f"Saved feature schema to {FEATURE_SCHEMA_PATH}")


if __name__ == "__main__":
    main()
