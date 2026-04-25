from __future__ import annotations

import json
import pickle
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT_DIR / "models" / "athlete_model.pkl"


def load_artifact(path: Path = MODEL_PATH) -> dict[str, object]:
    with path.open("rb") as model_file:
        return pickle.load(model_file)


def predict(sample: dict[str, object]) -> dict[str, float]:
    artifact = load_artifact()
    vectorizer = artifact["vectorizer"]
    model = artifact["model"]
    target_columns = artifact["target_columns"]

    x_matrix = vectorizer.transform([sample])
    prediction = model.predict(x_matrix)[0]
    return {target: round(float(value), 4) for target, value in zip(target_columns, prediction)}


def main() -> None:
    sample = {
        "Age": 28.0,
        "Gender": "Male",
        "Weight": 72.0,
        "Height": 1.78,
        "Max_BPM": 185.0,
        "Avg_BPM": 154.0,
        "Resting_BPM": 60.0,
        "Session_Duration": 1.2,
        "Calories_Burned": 950.0,
        "Workout_Type": "Hiit",
        "Fat_Percentage": 18.0,
        "Water_Intake": 2.8,
        "Workout_Frequency": 4.0,
        "Experience_Level": "Intermediate",
        "BMI": 22.7,
        "rep_count": 20.0,
        "avg_depth_score": 0.78,
        "avg_form_score": 0.81,
        "tempo_consistency": 0.79,
        "stability_score": 0.76,
        "left_right_asymmetry": 0.16,
        "fatigue_slope": 0.24,
        "range_of_motion": 0.80,
        "knee_valgus_risk": 0.18,
        "back_angle_risk": 0.20,
        "movement_quality_score": 0.78,
    }
    print(json.dumps(predict(sample), indent=2))


if __name__ == "__main__":
    main()
