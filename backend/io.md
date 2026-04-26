## Input

The frontend can send either:

- canonical model field names
- frontend-friendly alias field names

The backend adapter will normalize them before prediction.

---

## 1. Required Input

These fields are the minimum practical input needed for prediction.

### Required profile fields

```text
Age
Gender
Height
Weight
Workout_Frequency
Experience_Level
Workout_Type
```

### Required CV fields

```text
rep_count
avg_form_score
avg_depth_score
tempo_consistency
stability_score
fatigue_slope
knee_valgus_risk
```

---

## 2. Supported Alias Input Names

The backend currently supports these aliases:

```text
age -> Age
gender -> Gender
height -> Height
height_m -> Height
height_cm -> Height
weight -> Weight
weight_kg -> Weight
workout_frequency -> Workout_Frequency
experience_level -> Experience_Level
workout_type -> Workout_Type

reps -> rep_count
form_score -> avg_form_score
depth_score -> avg_depth_score
tempo -> tempo_consistency
tempo_consistency -> tempo_consistency
stability -> stability_score
fatigue -> fatigue_slope
fatigue_trend -> fatigue_slope
knee_risk -> knee_valgus_risk
knee_valgus -> knee_valgus_risk
```

---

## 3. Optional Input

These fields are optional because the backend will auto-fill defaults if they
are missing.

### Optional profile fields with defaults

```text
Resting_BPM       default: 65
Avg_BPM           default: 140
Max_BPM           default: 190
Session_Duration  default: 1.0
Water_Intake      default: 2.5
Calories_Burned   default: 400
Fat_Percentage    default: 18
```

### Optional CV fields with defaults / derivation

```text
left_right_asymmetry  default: 0.1
range_of_motion       default: avg_depth_score
back_angle_risk       default: 1 - avg_form_score
movement_quality_score  auto-computed if missing
BMI                     auto-computed if missing
```

---

## 4. Automatically Derived Fields

The backend derives these fields when not provided:

### BMI

```text
BMI = Weight / (Height ^ 2)
```

If `BMI` is already provided, the backend keeps the provided value.

### Height normalization

If `Height` is greater than `3`, it is treated as centimeters and converted to meters.

Examples:

```text
175 -> 1.75
height_cm = 175 -> Height = 1.75
```

### CV derived fields

```text
range_of_motion = avg_depth_score
back_angle_risk = 1 - avg_form_score
left_right_asymmetry = 0.1
```

These are only applied if the frontend does not provide real values.

### Movement quality score

If `movement_quality_score` is missing, backend computes:

```python
movement_quality_score = (
    0.28 * avg_form_score +
    0.20 * avg_depth_score +
    0.18 * tempo_consistency +
    0.18 * stability_score +
    0.12 * range_of_motion -
    0.06 * left_right_asymmetry -
    0.05 * fatigue_slope
)
```

Then it is clamped to:

```text
0–1
```

---

## 5. Canonical Model Input After Adapter

After normalization, the model receives a standardized dict with these fields:

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

---

## Output

The model returns a JSON-ready object with this structure:

```python
{
    "scores": {
        "readiness_score": float,
        "injury_risk_score": float,
        "strength_potential_score": float,
        "endurance_potential_score": float,
    },
    "signals": {
        "form_quality": float,
        "depth_score": float,
        "tempo_consistency": float,
        "stability": float,
        "fatigue_trend": float,
        "asymmetry": float,
        "range_of_motion": float,
        "movement_quality": float,
    },
    "summary": str,
    "explanations": list[str],
    "recommendations": list[str],
}
```

---

## 1. Scores

Core model outputs:

```text
readiness_score
injury_risk_score
strength_potential_score
endurance_potential_score
```

All score values are returned as:

```text
0–100 percentage scale
rounded to 1 decimal place
```

---

## 2. Signals

Supporting display signals returned for frontend use:

```text
form_quality
depth_score
tempo_consistency
stability
fatigue_trend
asymmetry
range_of_motion
movement_quality
```

These are also returned as:

```text
0–100 percentage scale
rounded to 1 decimal place
```

They are derived from the processed model input, not predicted as separate targets.

---

## 3. Summary

`summary` is a short natural-language overview of the athlete's current state.

Example:

```text
Movement quality looks strong and injury risk is low. You are ready for a strength-focused session.
```

---

## 4. Explanations

`explanations` is a short list describing why the model produced the result.

Examples:

```text
- Fatigue built up across the set, lowering readiness and increasing risk.
- Overall movement quality was strong, lifting readiness and strength potential.
- Symmetry stayed controlled, helping keep injury risk low.
```

---

## 5. Recommendations

`recommendations` is a short list of suggested actions.

Examples:

```text
- Reduce intensity and focus on controlled form work before increasing load.
- Prioritize recovery, hydration, and lighter training today.
- You are ready for progressive overload in the next strength session.
```

---

## Final Principle

```text
Frontend may send minimal input.
Backend adapter expands it into full model input.
Model returns 4 scores.
Prediction layer also returns summary, explanations, recommendations, and supporting signals.
```
