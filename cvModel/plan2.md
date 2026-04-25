# 📊 AthleteTwin — Model Evaluation & Feature Importance Plan

## 🧠 Goal

Validate that the model:
1. **Actually learned the label patterns**
2. Produces **reasonable outputs (0–1 range, stable)**
3. Relies on **meaningful features (not noise)**

---

## 🧩 Step 1: Train/Test Split

### Why
Avoid evaluating on training data (overfitting illusion)

### Implementation

```python
from sklearn.model_selection import train_test_split

X = df[feature_columns]
y = df[
    [
        "readiness_score",
        "injury_risk_score",
        "strength_potential_score",
        "endurance_potential_score",
    ]
]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
```

---

## 📉 Step 2: Train Model (with split)

```python
from sklearn.ensemble import RandomForestRegressor

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=10,
    random_state=42
)

model.fit(X_train, y_train)
```

---

## 📏 Step 3: Evaluation Metrics

### Metrics to compute

- MAE (Mean Absolute Error)
- RMSE (Root Mean Squared Error)
- R² score

---

### Implementation

```python
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import numpy as np

y_pred = model.predict(X_test)

for i, col in enumerate(y.columns):
    mae = mean_absolute_error(y_test.iloc[:, i], y_pred[:, i])
    rmse = np.sqrt(mean_squared_error(y_test.iloc[:, i], y_pred[:, i]))
    r2 = r2_score(y_test.iloc[:, i], y_pred[:, i])

    print(f"{col}:")
    print(f"  MAE: {mae:.4f}")
    print(f"  RMSE: {rmse:.4f}")
    print(f"  R2: {r2:.4f}")
```

---

## ✅ Step 4: Sanity Checks (VERY IMPORTANT)

After prediction:

```python
print(y_pred.min(), y_pred.max())
```

### Expected

```text
Values should be roughly between 0 and 1
```

---

### Manual sanity tests

Test edge cases:

```text
Case 1:
  High form + low fatigue → high readiness, low risk

Case 2:
  Low form + high fatigue → low readiness, high risk

Case 3:
  Advanced athlete vs beginner → different baseline
```

👉 If model doesn’t reflect these → rules or features need adjustment

---

## 🌳 Step 5: Feature Importance

### Why

Understand what the model is using to make decisions

---

### Implementation

```python
import pandas as pd

importances = model.feature_importances_

feature_importance_df = pd.DataFrame({
    "feature": feature_columns,
    "importance": importances
}).sort_values(by="importance", ascending=False)

print(feature_importance_df.head(15))
```

---

## 🔍 Step 6: Interpret Results

### What you WANT to see

Top features should include:

```text
movement_quality_score
fatigue_slope
avg_form_score
stability_score
knee_valgus_risk
workout_frequency
experience_level
resting_bpm
```

---

### 🚨 Red flags

If you see:

```text
random columns dominating
irrelevant features at top
only 1 feature dominating everything
```

👉 Then:
- Your label rules may be too simple
- Synthetic data may lack variation
- Some features may be constant / noisy

---

## 📈 Step 7: Plot Feature Importance

```python
import matplotlib.pyplot as plt

top_n = 15
top_features = feature_importance_df.head(top_n)

plt.figure()
plt.barh(top_features["feature"], top_features["importance"])
plt.gca().invert_yaxis()
plt.title("Top Feature Importances")
plt.xlabel("Importance")
plt.ylabel("Feature")
plt.show()
```

---

## 🧪 Step 8: Save Evaluation Results

```python
feature_importance_df.to_csv("models/feature_importance.csv", index=False)
```

---

## 🧭 Step 9: Final Checklist

```text
✔ Model trains without error
✔ Metrics computed (MAE / RMSE / R²)
✔ Predictions in valid range (0–1)
✔ Feature importance looks reasonable
✔ Manual sanity tests pass
```

---

## 🧠 Key Insight

```text
Evaluation ≠ proving scientific accuracy

Evaluation = ensuring:
- model is consistent
- outputs make sense
- system behaves predictably
```

---

## 🚀 Next Step After This

```text
→ Connect model to predict.py
→ Feed real + CV inputs
→ Send outputs to LLM coach
→ Build demo UI
```