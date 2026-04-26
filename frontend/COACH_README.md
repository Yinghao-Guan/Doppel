# AthleteTwin Coach (Gemma 4 + Ollama)

Local LLM-driven coach for AthleteTwin. Gemma writes plans and explanations; the
tabular XGBoost service produces every number. This is a hard architecture rule
and is encoded in every system prompt.

## 1. Install Ollama and pull the model

```bash
# macOS
brew install ollama
# or download from https://ollama.com/download

# Pull the default model (~4B params)
ollama pull gemma4:e4b

# Run the daemon (leave this running in another terminal)
ollama serve
```

Sanity check:

```bash
curl http://localhost:11434/api/tags
```

## 2. Model size cheat-sheet

| Tag           | Params | Approx RAM | Use case                                |
| ------------- | ------ | ---------- | --------------------------------------- |
| `gemma4:e2b`  | ~2B    | ~3 GB      | Tiny laptop demos, fastest latency      |
| `gemma4:e4b`  | ~4B    | ~5 GB      | **Default** — good balance for hackathon|
| `gemma4:26b`  | ~26B   | ~24 GB     | Higher-quality plans, needs a real GPU  |
| `gemma4:31b`  | ~31B   | ~28 GB     | Best quality; workstation / server only |

If your machine struggles with `gemma4:e4b`, switch via the `GEMMA_MODEL`
environment variable — no code changes needed.

## 3. Environment variables

Configured in `frontend/.env.local` (gitignored). See `frontend/.env.example`.

| Var            | Default                  | Notes                                    |
| -------------- | ------------------------ | ---------------------------------------- |
| `OLLAMA_HOST`  | `http://localhost:11434` | Override if running Ollama remotely      |
| `GEMMA_MODEL`  | `gemma4:e4b`             | Any tag from `ollama list`               |

## 4. Architecture

```
┌──────────────────┐    fetch     ┌─────────────────────┐
│ React (Next.js)  │ ───────────► │ /api/coach/*        │
│  capture/sim UI  │              │  Next.js route      │
└────────┬─────────┘              └──────────┬──────────┘
         │                                   │ ollamaChatJson
         │                                   ▼
         │                       ┌─────────────────────┐
         │                       │ Ollama (localhost)  │
         │                       │ Gemma 4             │
         │                       │  • plan candidates  │
         │                       │  • what-if text     │
         │                       │  • plan comparison  │
         │                       └─────────────────────┘
         │
         │  (separate request — source of truth for numbers)
         ▼
┌─────────────────────┐
│ XGBoost service     │
│ profile + fingerprint
│ + plan ──► predictions
└─────────────────────┘
```

The frontend orchestrates: it asks Gemma for plan candidates, then **scores
each plan with the tabular model**, then asks Gemma to compare the scored
plans. Gemma never sees a plan and outputs numbers in the same call.

## 5. End-to-end frontend example

```ts
import {
  generatePlan,
  whatIf,
  comparePlans,
} from "@/lib/coach-client";
import type {
  ScoredPlan,
  Predictions,
  PlanCandidate,
} from "@/lib/coach-types";

// Your tabular model client lives elsewhere; signature shown for illustration.
declare function scorePlanWithXgb(args: {
  profile: UserProfile;
  fingerprint: TrainingFingerprint;
  plan: PlanCandidate;
}): Promise<Predictions>;

async function recommend(
  profile: UserProfile,
  fingerprint: TrainingFingerprint,
  goal: Goal,
) {
  // 1. Gemma drafts 3 candidates (no numbers).
  const { plans } = await generatePlan({ profile, fingerprint, goal });

  // 2. XGBoost scores each candidate.
  const scored: ScoredPlan[] = await Promise.all(
    plans.map(async (plan) => ({
      plan,
      predictions: await scorePlanWithXgb({ profile, fingerprint, plan }),
    })),
  );

  // 3. Gemma reads the scored plans and picks a winner.
  const { comparison } = await comparePlans({ goal, scored_plans: scored });

  const winner = scored[comparison.recommended_plan_index];
  return { scored, comparison, winner };
}
```

## 6. What-if pattern

When the user tweaks a parameter (e.g. "what if I trained 5 days instead of 3?"):

```ts
// 1. Build the modified plan locally (UI form state).
const modifiedPlan = { ...currentPlan, sessions_per_week: 5 };

// 2. Re-score both with XGBoost.
const before_predictions = await scorePlanWithXgb({ profile, fingerprint, plan: currentPlan });
const after_predictions  = await scorePlanWithXgb({ profile, fingerprint, plan: modifiedPlan });

// 3. Ask Gemma to interpret — it only references numbers we hand it.
const { result } = await whatIf({
  profile,
  fingerprint,
  current_plan: currentPlan,
  before_predictions,
  after_predictions,
  change_description: "Increase from 3 to 5 sessions per week.",
});

// result.parameter_changes, result.interpretation, result.key_insight
```

## 7. curl test for /api/coach/generate-plan

Boot the app (`pnpm dev`) and hit it:

```bash
curl -X POST http://localhost:3000/api/coach/generate-plan \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "age": 28,
      "height_cm": 178,
      "weight_kg": 76,
      "fitness_level": "intermediate",
      "training_frequency_per_week": 3,
      "sleep_hours": 7
    },
    "fingerprint": {
      "exercise_type": "back_squat",
      "rep_count": 8,
      "range_of_motion_score": 82,
      "tempo_consistency": 71,
      "form_score": 76,
      "stability_score": 80,
      "asymmetry": 14,
      "fatigue_trend": 0.18,
      "injury_risk_signals": ["mild knee valgus on rep 6"]
    },
    "goal": {
      "target_metric": "strength",
      "target_change_pct": 15,
      "horizon_days": 14,
      "constraints": ["no overhead pressing", "home gym only"]
    }
  }'
```

Expect a JSON body of shape `{ "plans": [ /* 3 PlanCandidate objects */ ] }`
with **no** numeric outcome predictions inside the plans.

## 8. Error responses

| Status | Meaning                                           |
| ------ | ------------------------------------------------- |
| 400    | Missing or malformed request fields               |
| 502    | Ollama returned an unparseable / out-of-range body|
| 503    | Ollama daemon unreachable (`ollama serve` not up) |
| 500    | Model not pulled, or unexpected server error      |

The 503 case includes a hint to run `ollama serve`; the model-not-found case
includes the exact `ollama pull <model>` command.
