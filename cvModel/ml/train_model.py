from __future__ import annotations

import csv
import json
import pickle
from pathlib import Path

from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_extraction import DictVectorizer


ROOT_DIR = Path(__file__).resolve().parents[1]
TRAINING_DATA_PATH = ROOT_DIR / "data" / "processed" / "training_data.csv"
MODEL_PATH = ROOT_DIR / "models" / "athlete_model.pkl"
FEATURE_SCHEMA_PATH = ROOT_DIR / "models" / "feature_columns.json"

TARGET_FEATURES = [
    "readiness_score",
    "injury_risk_score",
    "strength_potential_score",
    "endurance_potential_score",
]

CATEGORICAL_FEATURES = ["Gender", "Workout_Type", "Experience_Level"]


def load_rows(path: Path = TRAINING_DATA_PATH) -> tuple[list[dict[str, str]], list[str]]:
    with path.open("r", encoding="utf-8", newline="") as source_file:
        reader = csv.DictReader(source_file)
        rows = list(reader)
        fieldnames = list(reader.fieldnames or [])
    return rows, fieldnames


def split_features_and_targets(
    rows: list[dict[str, str]],
    fieldnames: list[str],
) -> tuple[list[dict[str, object]], list[list[float]], list[str]]:
    feature_columns = [name for name in fieldnames if name not in TARGET_FEATURES]
    feature_dicts: list[dict[str, object]] = []
    targets: list[list[float]] = []

    for row in rows:
        feature_row: dict[str, object] = {}
        for column in feature_columns:
            raw_value = row[column]
            if column in CATEGORICAL_FEATURES:
                feature_row[column] = raw_value
            else:
                feature_row[column] = float(raw_value)
        feature_dicts.append(feature_row)
        targets.append([float(row[target]) for target in TARGET_FEATURES])

    return feature_dicts, targets, feature_columns


def train_model() -> dict[str, object]:
    rows, fieldnames = load_rows()
    if not rows:
        raise ValueError("Training dataset is empty.")

    missing_targets = [target for target in TARGET_FEATURES if target not in fieldnames]
    if missing_targets:
        raise ValueError(f"Training dataset is missing target columns: {missing_targets}")

    feature_dicts, targets, raw_feature_columns = split_features_and_targets(rows, fieldnames)

    vectorizer = DictVectorizer(sparse=False)
    x_matrix = vectorizer.fit_transform(feature_dicts)

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=10,
        random_state=42,
    )
    model.fit(x_matrix, targets)

    artifact = {
        "model": model,
        "vectorizer": vectorizer,
        "raw_feature_columns": raw_feature_columns,
        "encoded_feature_columns": list(vectorizer.feature_names_),
        "target_columns": TARGET_FEATURES,
    }
    return artifact


def save_model_artifact(artifact: dict[str, object], path: Path = MODEL_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as model_file:
        pickle.dump(artifact, model_file)


def update_feature_schema(artifact: dict[str, object], path: Path = FEATURE_SCHEMA_PATH) -> None:
    schema: dict[str, object] = {}
    if path.exists():
        schema = json.loads(path.read_text(encoding="utf-8"))

    schema["categorical_features"] = CATEGORICAL_FEATURES
    schema["target_features"] = TARGET_FEATURES
    schema["training_input_columns"] = artifact["raw_feature_columns"]
    schema["encoded_feature_columns"] = artifact["encoded_feature_columns"]
    schema["model_artifact"] = str(MODEL_PATH.relative_to(ROOT_DIR))

    path.write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    artifact = train_model()
    save_model_artifact(artifact)
    update_feature_schema(artifact)
    print(f"Saved trained model to {MODEL_PATH}")
    print(f"Updated feature schema at {FEATURE_SCHEMA_PATH}")


if __name__ == "__main__":
    main()
