# 🏋️ AthleteTwin ML Pipeline Plan

## 🧠 Overall Pipeline

```text
real_fitness_dataset.csv
        ↓
clean / encode real features
        ↓
generate synthetic CV features (per row)
        ↓
generate labels (rule-based)
        ↓
train ML model
        ↓
save model + feature schema
```

---

## 📊 Step 1: Define Final Dataset Schema

Each training row should include:

### 🔹 Real Dataset Features
```text
Age
Gender
Weight
Height
Max_BPM
Avg_BPM
Resting_BPM
Session_Duration
Calories_Burned
Workout_Type
Fat_Percentage
Water_Intake
Workout_Frequency
Experience_Level
BMI
```

### 🔹 Synthetic CV Features
```text
rep_count
avg_depth_score
avg_form_score
tempo_consistency
stability_score
left_right_asymmetry
fatigue_slope
range_of_motion
knee_valgus_risk
back_angle_risk
movement_quality_score
```

### 🔹 Labels (Targets)
```text
readiness_score
injury_risk_score
strength_potential_score
endurance_potential_score
```

---

## 📁 Step 2: Project Structure

```text
project/
  data/
    raw/
      gym_members_exercise_tracking_synthetic_data.csv
    processed/
      training_data.csv

  ml/
    generate_cv_features.py
    generate_labels.py
    train_model.py
    predict.py

  models/
    athlete_model.pkl
    feature_columns.json
```

---

## ⚙️ Step 3: Generate Synthetic CV Features

### Core Function

```python
def generate_cv_features(row):
    # extract real data
    experience = row["Experience_Level"]
    bmi = row["BMI"]
    workout_freq = row["Workout_Frequency"]
    avg_bpm = row["Avg_BPM"]
    resting_bpm = row["Resting_BPM"]
    duration = row["Session_Duration"]

    # generate features based on experience level
```

---

### 🎯 Base Ranges by Experience Level

| Feature | Beginner | Intermediate | Advanced |
|--------|----------|-------------|----------|
| form_score | 0.45–0.75 | 0.60–0.88 | 0.75–0.98 |
| depth_score | 0.40–0.75 | 0.60–0.90 | 0.75–1.00 |
| tempo | 0.40–0.75 | 0.60–0.88 | 0.75–0.98 |
| stability | 0.40–0.75 | 0.60–0.88 | 0.75–0.98 |
| asymmetry | 0.15–0.45 | 0.08–0.30 | 0.03–0.18 |
| fatigue | 0.20–0.60 | 0.10–0.40 | 0.03–0.25 |

---

### 🔄 Adjust Based on Real Data

```text
BMI high → stability ↓, fatigue ↑
Session duration long → fatigue ↑
Avg_BPM high → fatigue ↑
Workout frequency high → fatigue ↑ (slightly)
```

---

## 📐 Step 4: Compute Movement Quality

```python
movement_quality_score = (
    0.30 * avg_form_score +
    0.20 * avg_depth_score +
    0.20 * tempo_consistency +
    0.20 * stability_score +
    0.10 * range_of_motion -
    0.10 * left_right_asymmetry
)

# clamp to 0–1
movement_quality_score = max(0, min(1, movement_quality_score))
```

---

## 🧮 Step 5: Generate Labels

### 🔹 Readiness Score

```python
readiness_score = (
    0.30 * movement_quality_score +
    0.25 * recovery_score +
    0.20 * experience_score +
    0.15 * hydration_score -
    0.20 * fatigue_slope
)
```

---

### 🔹 Injury Risk

```python
injury_risk_score = (
    0.30 * knee_valgus_risk +
    0.25 * left_right_asymmetry +
    0.20 * fatigue_slope +
    0.15 * back_angle_risk +
    0.10 * (1 - avg_form_score)
)
```

---

### 🔹 Strength Potential

```python
strength_potential_score = (
    0.30 * movement_quality_score +
    0.25 * workout_frequency_score +
    0.20 * experience_score +
    0.15 * session_duration_score -
    0.15 * fatigue_slope
)
```

---

### 🔹 Endurance Potential

```python
endurance_potential_score = (
    0.30 * cardio_signal +
    0.25 * workout_frequency_score +
    0.20 * session_duration_score +
    0.15 * recovery_score -
    0.10 * fatigue_slope
)
```

---

## 🤖 Step 6: Train Model

### Model Choice

```python
from sklearn.ensemble import RandomForestRegressor

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=10,
    random_state=42
)
```

---

### Multi-output Training

```python
y = df[
    [
        "readiness_score",
        "injury_risk_score",
        "strength_potential_score",
        "endurance_potential_score",
    ]
]
```

---

## 💾 Step 7: Save Model

Save:

```text
models/athlete_model.pkl
models/feature_columns.json
```

---

## 🚀 Step 8: Implementation Order

```text
1. Load real dataset
2. Clean column names
3. Encode categorical features (Gender, Workout_Type, Experience_Level)
4. Generate synthetic CV features
5. Compute movement_quality_score
6. Generate labels
7. Train model
8. Save model
9. Build predict() function
10. Connect to frontend
```

---

## 🎯 Minimal Working Output

### Input

```text
user profile + CV features
```

### Output

```text
readiness_score
injury_risk_score
strength_potential_score
endurance_potential_score
```

---

### Example UI Output

```text
Current readiness: 78%
Injury risk: 23%
Strength potential: 71%
Endurance potential: 64%
```

---

## 🧠 Key Insight

```text
Real dataset = user + workout context
Synthetic CV = movement quality
Rule-based labels = simulated outcomes
ML model = learns relationship between all three
```