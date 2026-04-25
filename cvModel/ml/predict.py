from __future__ import annotations

import argparse
import json
import pickle
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT_DIR / "models" / "athlete_model.pkl"
FEATURE_SCHEMA_PATH = ROOT_DIR / "models" / "feature_columns.json"

TARGET_COLUMNS = [
    "readiness_score",
    "injury_risk_score",
    "strength_potential_score",
    "endurance_potential_score",
]

DEFAULT_PROFILE = {
    "Resting_BPM": 65,
    "Avg_BPM": 140,
    "Max_BPM": 190,
    "Session_Duration": 1.0,
    "Water_Intake": 2.5,
    "Calories_Burned": 400,
    "Fat_Percentage": 18,
}

FIELD_ALIASES = {
    "age": "Age",
    "gender": "Gender",
    "height": "Height",
    "height_m": "Height",
    "height_cm": "Height",
    "weight": "Weight",
    "weight_kg": "Weight",
    "workout_frequency": "Workout_Frequency",
    "experience_level": "Experience_Level",
    "workout_type": "Workout_Type",
    "reps": "rep_count",
    "form_score": "avg_form_score",
    "depth_score": "avg_depth_score",
    "tempo": "tempo_consistency",
    "tempo_consistency": "tempo_consistency",
    "stability": "stability_score",
    "fatigue": "fatigue_slope",
    "fatigue_trend": "fatigue_slope",
    "knee_risk": "knee_valgus_risk",
    "knee_valgus": "knee_valgus_risk",
}

DEMO_CASES = {
    "beginner_bad_form": {
        "Age": 31,
        "Gender": "Male",
        "Weight": 86,
        "Height": 1.76,
        "Max_BPM": 182,
        "Avg_BPM": 165,
        "Resting_BPM": 76,
        "Session_Duration": 1.4,
        "Calories_Burned": 720,
        "Workout_Type": "Strength",
        "Fat_Percentage": 27,
        "Water_Intake": 1.7,
        "Workout_Frequency": 2,
        "Experience_Level": "Beginner",
        "BMI": 27.8,
        "rep_count": 9,
        "avg_depth_score": 0.46,
        "avg_form_score": 0.51,
        "tempo_consistency": 0.49,
        "stability_score": 0.52,
        "left_right_asymmetry": 0.37,
        "fatigue_slope": 0.58,
        "range_of_motion": 0.50,
        "knee_valgus_risk": 0.46,
        "back_angle_risk": 0.42,
    },
    "intermediate_balanced": {
        "Age": 24,
        "Gender": "Female",
        "Weight": 64,
        "Height": 1.68,
        "Max_BPM": 188,
        "Avg_BPM": 150,
        "Resting_BPM": 61,
        "Session_Duration": 1.1,
        "Calories_Burned": 520,
        "Workout_Type": "Hiit",
        "Fat_Percentage": 22,
        "Water_Intake": 2.6,
        "Workout_Frequency": 4,
        "Experience_Level": "Intermediate",
        "BMI": 22.7,
        "rep_count": 14,
        "avg_depth_score": 0.76,
        "avg_form_score": 0.79,
        "tempo_consistency": 0.75,
        "stability_score": 0.77,
        "left_right_asymmetry": 0.16,
        "fatigue_slope": 0.24,
        "range_of_motion": 0.78,
        "knee_valgus_risk": 0.18,
        "back_angle_risk": 0.19,
    },
    "advanced_good_form": {
        "Age": 27,
        "Gender": "Male",
        "Weight": 74,
        "Height": 1.8,
        "Max_BPM": 186,
        "Avg_BPM": 148,
        "Resting_BPM": 56,
        "Session_Duration": 1.2,
        "Calories_Burned": 610,
        "Workout_Type": "Strength",
        "Fat_Percentage": 15,
        "Water_Intake": 3.1,
        "Workout_Frequency": 5,
        "Experience_Level": "Advanced",
        "BMI": 22.8,
        "rep_count": 18,
        "avg_depth_score": 0.89,
        "avg_form_score": 0.92,
        "tempo_consistency": 0.87,
        "stability_score": 0.90,
        "left_right_asymmetry": 0.08,
        "fatigue_slope": 0.11,
        "range_of_motion": 0.91,
        "knee_valgus_risk": 0.10,
        "back_angle_risk": 0.11,
    },
    "minimal_frontend_input": {
        "age": 22,
        "gender": "Male",
        "height_cm": 175,
        "weight_kg": 72,
        "workout_frequency": 4,
        "experience_level": "Intermediate",
        "workout_type": "Strength",
        "reps": 10,
        "form_score": 0.84,
        "depth_score": 0.80,
        "tempo_consistency": 0.78,
        "stability": 0.82,
        "fatigue_trend": 0.18,
        "knee_risk": 0.12,
    },
}


def clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def load_artifact(path: Path = MODEL_PATH) -> dict[str, object]:
    with path.open("rb") as model_file:
        return pickle.load(model_file)


def load_feature_schema(path: Path = FEATURE_SCHEMA_PATH) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def compute_bmi(weight: float, height: float) -> float:
    if height <= 0:
        return 0.0
    return weight / (height * height)


def compute_movement_quality_score(input_data: dict[str, object]) -> float:
    return clamp(
        0.28 * float(input_data["avg_form_score"])
        + 0.20 * float(input_data["avg_depth_score"])
        + 0.18 * float(input_data["tempo_consistency"])
        + 0.18 * float(input_data["stability_score"])
        + 0.12 * float(input_data["range_of_motion"])
        - 0.06 * float(input_data["left_right_asymmetry"])
        - 0.05 * float(input_data["fatigue_slope"])
    )


def normalize_gender(value: object) -> str:
    normalized = str(value).strip().title()
    if normalized in {"Male", "Female"}:
        return normalized
    return ""


def normalize_workout_type(value: object) -> str:
    normalized = str(value).strip().title()
    if normalized in {"Strength", "Cardio", "Hiit", "Yoga"}:
        return normalized
    return normalized


def normalize_experience_level(value: object) -> str:
    normalized = str(value).strip().title()
    if normalized in {"Beginner", "Intermediate", "Advanced"}:
        return normalized
    if normalized.isdigit():
        return {"1": "Beginner", "2": "Intermediate", "3": "Advanced"}.get(normalized, "Beginner")
    return "Beginner"


def coerce_number(value: object, default: float = 0.0) -> float:
    if value in ("", None):
        return default
    return float(value)


def apply_aliases(user_input: dict[str, object]) -> dict[str, object]:
    adapted: dict[str, object] = {}
    for key, value in user_input.items():
        target_key = FIELD_ALIASES.get(key, key)
        adapted[target_key] = value
    return adapted


def normalize_height(processed: dict[str, object], original_input: dict[str, object]) -> None:
    if "height_cm" in original_input and original_input["height_cm"] not in ("", None):
        processed["Height"] = coerce_number(original_input["height_cm"]) / 100.0
        return

    if "Height" not in processed or processed["Height"] in ("", None):
        return

    height_value = coerce_number(processed["Height"])
    if height_value > 3.0:
        height_value = height_value / 100.0
    processed["Height"] = height_value


def apply_profile_defaults(processed: dict[str, object]) -> None:
    for key, value in DEFAULT_PROFILE.items():
        if key not in processed or processed[key] in ("", None):
            processed[key] = value


def apply_cv_defaults(processed: dict[str, object]) -> None:
    if "left_right_asymmetry" not in processed or processed["left_right_asymmetry"] in ("", None):
        processed["left_right_asymmetry"] = 0.1

    if "range_of_motion" not in processed or processed["range_of_motion"] in ("", None):
        processed["range_of_motion"] = processed.get("avg_depth_score", 0.0)

    if "back_angle_risk" not in processed or processed["back_angle_risk"] in ("", None):
        processed["back_angle_risk"] = 1.0 - coerce_number(processed.get("avg_form_score", 0.0))


def preprocess_input(user_input: dict[str, object]) -> dict[str, object]:
    schema = load_feature_schema()
    training_columns = list(schema["training_input_columns"])
    categorical_features = set(schema["categorical_features"])

    processed = apply_aliases(user_input)
    normalize_height(processed, user_input)
    apply_profile_defaults(processed)
    apply_cv_defaults(processed)

    processed["Gender"] = normalize_gender(processed.get("Gender", ""))
    processed["Workout_Type"] = normalize_workout_type(processed.get("Workout_Type", ""))
    processed["Experience_Level"] = normalize_experience_level(processed.get("Experience_Level", "Beginner"))

    if "BMI" not in processed or processed["BMI"] in ("", None):
        processed["BMI"] = compute_bmi(
            coerce_number(processed.get("Weight", 0.0)),
            coerce_number(processed.get("Height", 0.0)),
        )

    if "movement_quality_score" not in processed or processed["movement_quality_score"] in ("", None):
        processed["movement_quality_score"] = compute_movement_quality_score(processed)

    normalized: dict[str, object] = {}
    for column in training_columns:
        if column in categorical_features:
            normalized[column] = processed.get(column, "")
        else:
            normalized[column] = coerce_number(processed.get(column, 0.0))

    return normalized


def run_model(processed_input: dict[str, object]) -> dict[str, float]:
    artifact = load_artifact()
    vectorizer = artifact["vectorizer"]
    model = artifact["model"]
    target_columns = artifact["target_columns"]

    x_matrix = vectorizer.transform([processed_input])
    prediction = model.predict(x_matrix)[0]

    return {
        target: round(clamp(float(value)) * 100.0, 1)
        for target, value in zip(target_columns, prediction)
    }


def generate_explanations(input_data: dict[str, object], scores: dict[str, float]) -> list[str]:
    explanations: list[str] = []

    if float(input_data["fatigue_slope"]) > 0.45:
        explanations.append("Fatigue built up across the set, lowering readiness and increasing risk.")
    if float(input_data["avg_form_score"]) < 0.65:
        explanations.append("Form quality was below target, reducing strength potential and increasing risk.")
    if float(input_data["knee_valgus_risk"]) > 0.35:
        explanations.append("Knee valgus risk was elevated, which pushed injury risk higher.")
    if float(input_data["stability_score"]) < 0.65:
        explanations.append("Stability was inconsistent, suggesting control issues during the movement.")
    if float(input_data["tempo_consistency"]) > 0.75:
        explanations.append("Tempo consistency was strong, which supported readiness and endurance.")
    if float(input_data["movement_quality_score"]) > 0.75:
        explanations.append("Overall movement quality was strong, lifting readiness and strength potential.")
    if scores["injury_risk_score"] < 25 and float(input_data["left_right_asymmetry"]) < 0.18:
        explanations.append("Symmetry stayed controlled, helping keep injury risk low.")

    if not explanations:
        explanations.append("Movement signals were mixed, resulting in moderate predicted scores.")

    return explanations[:4]


def generate_recommendations(input_data: dict[str, object], scores: dict[str, float]) -> list[str]:
    recommendations: list[str] = []

    if scores["injury_risk_score"] > 40:
        recommendations.append("Reduce intensity and focus on controlled form work before increasing load.")
    if scores["readiness_score"] < 50:
        recommendations.append("Prioritize recovery, hydration, and lighter training today.")
    if float(input_data["avg_form_score"]) < 0.7:
        recommendations.append("Practice slow bodyweight reps to improve squat mechanics.")
    if float(input_data["fatigue_slope"]) > 0.4:
        recommendations.append("Add longer rest intervals between sets to limit fatigue accumulation.")
    if float(input_data["knee_valgus_risk"]) > 0.3:
        recommendations.append("Focus on knee tracking and glute activation drills.")
    if scores["strength_potential_score"] > 70:
        recommendations.append("You are ready for progressive overload in the next strength session.")
    if scores["endurance_potential_score"] > 65:
        recommendations.append("A steady conditioning block would fit well today.")

    if not recommendations:
        recommendations.append("Keep the session moderate and monitor form quality across reps.")

    return recommendations[:4]


def generate_summary(scores: dict[str, float]) -> str:
    readiness = scores["readiness_score"]
    risk = scores["injury_risk_score"]
    strength = scores["strength_potential_score"]
    endurance = scores["endurance_potential_score"]

    if readiness >= 70 and risk <= 25:
        if strength >= endurance:
            return "Movement quality looks strong and injury risk is low. You are ready for a strength-focused session."
        return "Readiness is high and risk is controlled. You are in a good position for conditioning work."

    if risk >= 40:
        return "Injury risk is elevated relative to readiness. Today should emphasize control, recovery, and lighter loading."

    if readiness < 50:
        return "Readiness is limited today. A lighter technical session is a better fit than pushing intensity."

    return "Scores are moderate overall. A controlled training session with attention to form is appropriate."


def build_supporting_signals(input_data: dict[str, object]) -> dict[str, float]:
    return {
        "form_quality": round(clamp(float(input_data["avg_form_score"])) * 100.0, 1),
        "depth_score": round(clamp(float(input_data["avg_depth_score"])) * 100.0, 1),
        "tempo_consistency": round(clamp(float(input_data["tempo_consistency"])) * 100.0, 1),
        "stability": round(clamp(float(input_data["stability_score"])) * 100.0, 1),
        "fatigue_trend": round(clamp(float(input_data["fatigue_slope"])) * 100.0, 1),
        "asymmetry": round(clamp(float(input_data["left_right_asymmetry"])) * 100.0, 1),
        "range_of_motion": round(clamp(float(input_data["range_of_motion"])) * 100.0, 1),
        "movement_quality": round(clamp(float(input_data["movement_quality_score"])) * 100.0, 1),
    }


def predict_athlete_outcome(user_input: dict[str, object]) -> dict[str, object]:
    processed_input = preprocess_input(user_input)
    scores = run_model(processed_input)
    explanations = generate_explanations(processed_input, scores)
    recommendations = generate_recommendations(processed_input, scores)
    signals = build_supporting_signals(processed_input)

    return {
        "scores": scores,
        "signals": signals,
        "summary": generate_summary(scores),
        "explanations": explanations,
        "recommendations": recommendations,
    }


def print_cli_output(case_name: str, result: dict[str, object]) -> None:
    scores = result["scores"]
    print("AthleteTwin Prediction")
    print()
    if case_name:
        print(f"Case: {case_name}")
        print()
    print(f"Readiness: {scores['readiness_score']:.1f}%")
    print(f"Injury Risk: {scores['injury_risk_score']:.1f}%")
    print(f"Strength Potential: {scores['strength_potential_score']:.1f}%")
    print(f"Endurance Potential: {scores['endurance_potential_score']:.1f}%")
    print()
    print("Summary:")
    print(f"- {result['summary']}")
    print()
    print("Why:")
    for explanation in result["explanations"]:
        print(f"- {explanation}")
    print()
    print("Recommendations:")
    for recommendation in result["recommendations"]:
        print(f"- {recommendation}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "demo_case",
        nargs="?",
        help="One of: beginner_bad_form, intermediate_balanced, advanced_good_form, minimal_frontend_input",
    )
    parser.add_argument("--json", action="store_true", help="Print JSON output instead of human-readable output.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    case_name = args.demo_case or "intermediate_balanced"
    if case_name not in DEMO_CASES:
        raise SystemExit(f"Unknown demo case: {case_name}")

    result = predict_athlete_outcome(DEMO_CASES[case_name])
    if args.json:
        print(json.dumps(result, indent=2))
        return

    print_cli_output(case_name, result)


if __name__ == "__main__":
    main()
