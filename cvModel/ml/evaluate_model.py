from __future__ import annotations

import argparse
import csv
import json
import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_extraction import DictVectorizer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

from train_model import CATEGORICAL_FEATURES, TARGET_FEATURES, load_rows, split_features_and_targets


ROOT_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT_DIR / "models"
TRAINING_DATA_PATH = ROOT_DIR / "data" / "processed" / "training_data.csv"


def evaluate_model(excluded_features: set[str] | None = None) -> dict[str, object]:
    rows, fieldnames = load_rows(TRAINING_DATA_PATH)
    if not rows:
        raise ValueError("Training dataset is empty.")

    feature_dicts, targets, _ = split_features_and_targets(
        rows,
        fieldnames,
        excluded_features=excluded_features,
    )

    x_train_raw, x_test_raw, y_train, y_test = train_test_split(
        feature_dicts,
        targets,
        test_size=0.2,
        random_state=42,
    )

    vectorizer = DictVectorizer(sparse=False)
    x_train = vectorizer.fit_transform(x_train_raw)
    x_test = vectorizer.transform(x_test_raw)

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=10,
        random_state=42,
    )
    model.fit(x_train, y_train)
    y_pred = model.predict(x_test)

    metrics: dict[str, dict[str, float]] = {}
    for index, column in enumerate(TARGET_FEATURES):
        actual = [row[index] for row in y_test]
        predicted = [float(row[index]) for row in y_pred]
        metrics[column] = {
            "mae": round(mean_absolute_error(actual, predicted), 4),
            "rmse": round(math.sqrt(mean_squared_error(actual, predicted)), 4),
            "r2": round(r2_score(actual, predicted), 4),
        }

    prediction_values = [float(value) for row in y_pred for value in row]
    prediction_range = {
        "min_prediction": round(min(prediction_values), 4),
        "max_prediction": round(max(prediction_values), 4),
        "within_expected_range": min(prediction_values) >= 0.0 and max(prediction_values) <= 1.0,
    }

    feature_importance = sorted(
        (
            {"feature": feature, "importance": round(float(importance), 6)}
            for feature, importance in zip(vectorizer.feature_names_, model.feature_importances_)
        ),
        key=lambda item: item["importance"],
        reverse=True,
    )

    sanity_checks = build_sanity_checks(model, vectorizer)

    return {
        "metrics": metrics,
        "prediction_range": prediction_range,
        "feature_importance": feature_importance,
        "sanity_checks": sanity_checks,
        "metadata": {
            "train_rows": len(x_train_raw),
            "test_rows": len(x_test_raw),
            "categorical_features": CATEGORICAL_FEATURES,
            "target_features": TARGET_FEATURES,
            "excluded_features": sorted(excluded_features or set()),
        },
    }


def build_sanity_checks(model: RandomForestRegressor, vectorizer: DictVectorizer) -> list[dict[str, object]]:
    cases = [
        {
            "name": "high_form_low_fatigue",
            "description": "High form + low fatigue should yield high readiness and low injury risk.",
            "sample": {
                "Age": 27.0,
                "Gender": "Female",
                "Weight": 64.0,
                "Height": 1.7,
                "Max_BPM": 184.0,
                "Avg_BPM": 148.0,
                "Resting_BPM": 56.0,
                "Session_Duration": 1.1,
                "Calories_Burned": 760.0,
                "Workout_Type": "Strength",
                "Fat_Percentage": 19.0,
                "Water_Intake": 3.2,
                "Workout_Frequency": 5.0,
                "Experience_Level": "Advanced",
                "BMI": 22.1,
                "rep_count": 24.0,
                "avg_depth_score": 0.91,
                "avg_form_score": 0.94,
                "tempo_consistency": 0.90,
                "stability_score": 0.92,
                "left_right_asymmetry": 0.08,
                "fatigue_slope": 0.10,
                "range_of_motion": 0.91,
                "knee_valgus_risk": 0.10,
                "back_angle_risk": 0.09,
                "movement_quality_score": 0.91,
            },
        },
        {
            "name": "low_form_high_fatigue",
            "description": "Low form + high fatigue should yield low readiness and high injury risk.",
            "sample": {
                "Age": 34.0,
                "Gender": "Male",
                "Weight": 91.0,
                "Height": 1.75,
                "Max_BPM": 178.0,
                "Avg_BPM": 169.0,
                "Resting_BPM": 78.0,
                "Session_Duration": 1.8,
                "Calories_Burned": 980.0,
                "Workout_Type": "Hiit",
                "Fat_Percentage": 29.0,
                "Water_Intake": 1.8,
                "Workout_Frequency": 5.0,
                "Experience_Level": "Beginner",
                "BMI": 29.7,
                "rep_count": 12.0,
                "avg_depth_score": 0.42,
                "avg_form_score": 0.39,
                "tempo_consistency": 0.44,
                "stability_score": 0.40,
                "left_right_asymmetry": 0.42,
                "fatigue_slope": 0.79,
                "range_of_motion": 0.43,
                "knee_valgus_risk": 0.62,
                "back_angle_risk": 0.58,
                "movement_quality_score": 0.39,
            },
        },
        {
            "name": "advanced_vs_beginner_baseline",
            "description": "Advanced athlete baseline should differ from beginner baseline under similar physical profile.",
            "sample": {
                "Age": 29.0,
                "Gender": "Male",
                "Weight": 74.0,
                "Height": 1.8,
                "Max_BPM": 182.0,
                "Avg_BPM": 150.0,
                "Resting_BPM": 60.0,
                "Session_Duration": 1.2,
                "Calories_Burned": 820.0,
                "Workout_Type": "Cardio",
                "Fat_Percentage": 18.0,
                "Water_Intake": 2.7,
                "Workout_Frequency": 4.0,
                "Experience_Level": "Advanced",
                "BMI": 22.8,
                "rep_count": 22.0,
                "avg_depth_score": 0.82,
                "avg_form_score": 0.84,
                "tempo_consistency": 0.80,
                "stability_score": 0.81,
                "left_right_asymmetry": 0.12,
                "fatigue_slope": 0.22,
                "range_of_motion": 0.83,
                "knee_valgus_risk": 0.16,
                "back_angle_risk": 0.17,
                "movement_quality_score": 0.82,
            },
        },
        {
            "name": "beginner_baseline",
            "description": "Beginner baseline companion case for comparison with advanced athlete.",
            "sample": {
                "Age": 29.0,
                "Gender": "Male",
                "Weight": 74.0,
                "Height": 1.8,
                "Max_BPM": 182.0,
                "Avg_BPM": 150.0,
                "Resting_BPM": 60.0,
                "Session_Duration": 1.2,
                "Calories_Burned": 820.0,
                "Workout_Type": "Cardio",
                "Fat_Percentage": 18.0,
                "Water_Intake": 2.7,
                "Workout_Frequency": 4.0,
                "Experience_Level": "Beginner",
                "BMI": 22.8,
                "rep_count": 15.0,
                "avg_depth_score": 0.62,
                "avg_form_score": 0.63,
                "tempo_consistency": 0.60,
                "stability_score": 0.61,
                "left_right_asymmetry": 0.24,
                "fatigue_slope": 0.38,
                "range_of_motion": 0.63,
                "knee_valgus_risk": 0.27,
                "back_angle_risk": 0.29,
                "movement_quality_score": 0.61,
            },
        },
    ]

    results = []
    for case in cases:
        prediction = model.predict(vectorizer.transform([case["sample"]]))[0]
        results.append(
            {
                "name": case["name"],
                "description": case["description"],
                "prediction": {
                    target: round(float(value), 4)
                    for target, value in zip(TARGET_FEATURES, prediction)
                },
            }
        )
    return results


def save_feature_importance_csv(feature_importance: list[dict[str, object]], path: Path) -> None:
    with path.open("w", encoding="utf-8", newline="") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=["feature", "importance"])
        writer.writeheader()
        writer.writerows(feature_importance)


def save_feature_importance_plot(feature_importance: list[dict[str, object]], path: Path) -> None:
    top_features = feature_importance[:15]
    labels = [item["feature"] for item in top_features]
    values = [item["importance"] for item in top_features]

    plt.figure(figsize=(10, 6))
    plt.barh(labels, values)
    plt.gca().invert_yaxis()
    plt.title("Top Feature Importances")
    plt.xlabel("Importance")
    plt.ylabel("Feature")
    plt.tight_layout()
    plt.savefig(path, dpi=200)
    plt.close()


def save_json(payload: object, path: Path) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def build_output_paths(suffix: str) -> dict[str, Path]:
    suffix_part = f"_{suffix}" if suffix else ""
    return {
        "metrics": MODELS_DIR / f"evaluation_metrics{suffix_part}.json",
        "feature_importance_csv": MODELS_DIR / f"feature_importance{suffix_part}.csv",
        "feature_importance_plot": MODELS_DIR / f"feature_importance{suffix_part}.png",
        "sanity_checks": MODELS_DIR / f"sanity_checks{suffix_part}.json",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--exclude-feature", action="append", default=[])
    parser.add_argument("--output-suffix", default="")
    args = parser.parse_args()

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    excluded_features = set(args.exclude_feature)
    output_paths = build_output_paths(args.output_suffix)
    results = evaluate_model(excluded_features=excluded_features)
    save_json(
        {
            "metrics": results["metrics"],
            "prediction_range": results["prediction_range"],
            "metadata": results["metadata"],
        },
        output_paths["metrics"],
    )
    save_feature_importance_csv(results["feature_importance"], output_paths["feature_importance_csv"])
    save_feature_importance_plot(results["feature_importance"], output_paths["feature_importance_plot"])
    save_json(results["sanity_checks"], output_paths["sanity_checks"])

    print(f"Saved evaluation metrics to {output_paths['metrics']}")
    print(f"Saved feature importance CSV to {output_paths['feature_importance_csv']}")
    print(f"Saved feature importance plot to {output_paths['feature_importance_plot']}")
    print(f"Saved sanity checks to {output_paths['sanity_checks']}")
    print(json.dumps(results["metrics"], indent=2))
    print(json.dumps(results["prediction_range"], indent=2))


if __name__ == "__main__":
    main()
