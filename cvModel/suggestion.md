# AthleteTwin — Label Rule Change Priorities

## Current Situation

Based on the latest evaluation results:

- `readiness_score`, `injury_risk_score`, and `strength_potential_score` already perform well
- `endurance_potential_score` is the weakest target
- `Experience_Level` still has too much influence in feature importance
- prediction range is valid but somewhat narrow

So the goal is not to rewrite everything at once.

The goal is:

```text
improve endurance logic first
reduce over-reliance on Experience_Level
preserve current stability
avoid making too many distribution changes at the same time
```

---

## 1. Suggested To Adopt Now

These changes are high-value and relatively low-risk.

### A. Make endurance more structured

This is the most important improvement.

Current issue:

```text
endurance_potential_score has the weakest R²
```

Recommended direction:

```python
cardio_signal = (
    0.45 * heart_rate_load +
    0.30 * session_duration_score +
    0.25 * workout_frequency_score
)

cardio_signal = clamp(cardio_signal)

endurance_potential_score = (
    0.34 * cardio_signal +
    0.22 * session_duration_score +
    0.18 * workout_frequency_score +
    0.12 * tempo_consistency +
    0.10 * recovery_score -
    0.14 * fatigue_slope
)

endurance_potential_score = clamp(endurance_potential_score)
```

Why adopt now:

- it directly addresses the weakest label
- it creates a clearer primary driver
- it should improve learnability without destabilizing the whole system

---

### B. Reduce Experience_Level influence

Current issue:

```text
Experience_Level is too high in feature importance
```

Recommended direction:

```python
experience_score_map = {
    "Beginner": 0.35,
    "Intermediate": 0.60,
    "Advanced": 0.80,
}
```

And reduce its role inside label formulas, especially:

- `readiness_score`
- `strength_potential_score`

Why adopt now:

- it directly matches current evaluation evidence
- it should push the model to rely more on movement and recovery features

---

### C. Improve recovery_score

Recommended direction:

```python
recovery_score = (
    0.45 * resting_hr_score +
    0.30 * hydration_score +
    0.25 * bmi_score
)

recovery_score = clamp(recovery_score)
```

Why adopt now:

- this makes recovery more interpretable
- it strengthens a useful physiological signal without being too disruptive
- it should help both readiness and endurance

---

## 2. Suggested To Try Later

These changes may be useful, but they should be tested only after the first round above.

### A. Update movement_quality_score

Suggested direction:

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

movement_quality_score = clamp(movement_quality_score)
```

Why later:

- this may improve realism
- but `movement_quality_score` is already the strongest feature
- changing it too early will affect all downstream labels at once

This is a useful second-round change, not the first one.

---

### B. Adjust injury_risk_score with more secondary terms

Suggested direction:

```python
injury_risk_score = (
    0.26 * knee_valgus_risk +
    0.22 * left_right_asymmetry +
    0.20 * fatigue_slope +
    0.16 * back_angle_risk +
    0.10 * (1 - avg_form_score) +
    0.06 * (1 - stability_score)
)

injury_risk_score = clamp(injury_risk_score)
```

Why later:

- current injury prediction is already strong
- this may improve realism, but it is not solving the main current problem

---

### C. Slight score widening

Suggested direction:

```python
def widen_score(score, strength=0.85):
    return clamp(score ** strength)
```

Why later:

- the current output range is narrow
- but this transformation changes the score distribution itself
- it should only be tested after the core rules are stable

This is a presentation-oriented optimization, not a first-priority modeling fix.

---

## 3. Do Not Change Yet

These ideas are not necessarily bad, but they should not be applied right now.

### A. Do not add noise yet

Suggested idea from the previous draft:

```python
def add_noise(score, std=0.015):
    return clamp(score + np.random.normal(0, std))
```

Reason to avoid for now:

- noise will reduce apparent learnability
- it makes before/after comparison less clean
- it becomes harder to tell whether rule changes helped or hurt

Noise should be added only after:

- label rules are settled
- endurance improves
- feature importance looks healthier

---

### B. Do not rewrite every label at once

Reason to avoid:

- too many simultaneous changes make evaluation hard to interpret
- if metrics improve or worsen, you will not know why

Recommended process:

```text
1. fix endurance rule
2. reduce Experience_Level weight
3. improve recovery_score
4. retrain and re-evaluate
5. only then consider movement_quality changes
6. only then test widening or noise
```

---

## Recommended Order

Use this order for the next iteration:

```text
Phase 1
- improve endurance_potential_score
- reduce Experience_Level weight
- improve recovery_score

Phase 2
- retrain
- re-run evaluation
- check feature importance

Phase 3
- if needed, revise movement_quality_score
- if needed, revise injury_risk_score

Phase 4
- only if demo output still feels too compressed:
  test score widening

Phase 5
- only after rules stabilize:
  test adding small noise
```

---

## Final Recommendation

```text
Adopt some of the optimization ideas, but not all at once.

Best immediate moves:
- endurance rule
- lower Experience_Level influence
- better recovery score

Wait on:
- movement quality rewrite
- injury rule expansion
- score widening

Do not add yet:
- random noise
- full-system rewrite in one pass
```
