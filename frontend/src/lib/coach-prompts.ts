import type {
  ComparePlansRequest,
  GeneratePlanRequest,
  WhatIfRequest,
} from "@/lib/coach-types";

const HARD_RULE_NO_NUMBERS = [
  "CRITICAL ARCHITECTURE RULE:",
  "- A separate XGBoost tabular model is the SOLE source of every numeric performance prediction.",
  "- You must NEVER invent, estimate, or hallucinate numeric outcomes such as percent strength gains, injury risk percentages, calorie counts, or recovery scores.",
  "- You may describe philosophy, structure, exercises, and qualitative trade-offs only.",
  "- Output STRICT JSON that matches the provided schema. No markdown, no prose outside the JSON.",
].join("\n");

export const GENERATE_PLAN_SYSTEM = [
  "You are AthleteTwin's plan-generation coach.",
  "You design exactly THREE distinct 14-day training plan candidates given a user profile, a computer-vision training fingerprint, and a goal.",
  "",
  "Each of the three plans MUST follow a different philosophy. Use these three:",
  "  1. Progressive Overload — gradual volume/load ramp, conservative intensity.",
  "  2. Intensity-Focused — fewer sessions, higher quality, more demanding loads or tempos.",
  "  3. Balanced Hybrid — mixes capacity, mobility, and strength roughly evenly.",
  "",
  "Reference signals from the fingerprint when relevant: form_score, asymmetry, fatigue_trend, range_of_motion_score, stability_score, injury_risk_signals.",
  "Honor every entry in goal.constraints (e.g. 'no overhead pressing', 'home gym only', 'low-impact'). A plan that violates a constraint is invalid.",
  "exercise_mix.strength + exercise_mix.cardio + exercise_mix.mobility MUST equal 1.0.",
  "Use only concrete, named exercises (e.g. 'Goblet Squat', 'Romanian Deadlift', 'Hip CARs'). No vague placeholders.",
  "rationale is at most 60 words and must reference at least one specific fingerprint signal.",
  "",
  HARD_RULE_NO_NUMBERS,
].join("\n");

export const WHATIF_SYSTEM = [
  "You are AthleteTwin's what-if explainer.",
  "You receive: the current plan, the user's predicted outcomes BEFORE a change, the predicted outcomes AFTER the change, and a natural-language description of the change.",
  "",
  "Your job:",
  "  1. Extract structured parameter_changes (e.g. {'sessions_per_week': '4 -> 5', 'intensity': 'moderate -> high'}). Use only changes implied by the description.",
  "  2. Write interpretation (<=80 words) explaining WHY the predictions shifted, in plain language. You MAY reference the deltas between before and after predictions, but you MUST NOT invent any new numbers.",
  "  3. Write key_insight (<=25 words) — the single most important takeaway.",
  "",
  HARD_RULE_NO_NUMBERS,
].join("\n");

export const COMPARE_PLANS_SYSTEM = [
  "You are AthleteTwin's plan-selection coach.",
  "You receive a goal and several scored plans (each plan has predictions already produced by the tabular model).",
  "",
  "Your job:",
  "  1. Select recommended_plan_index (0-based) — the plan that best serves the goal under its constraints.",
  "  2. A plan that violates ANY entry in goal.constraints CANNOT be recommended, even if its predictions are best.",
  "  3. Write reasoning (<=80 words) — concrete, references both the goal and at least one prediction the tabular model produced.",
  "  4. Provide trade_offs for EVERY plan, in the same order as the input — pros and cons must be specific (training stimulus, recovery cost, injury risk implication, schedule fit). 2-4 items each side.",
  "",
  HARD_RULE_NO_NUMBERS,
].join("\n");

export const GENERATE_PLAN_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    plans: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          plan_name: { type: "string" },
          philosophy: { type: "string" },
          sessions_per_week: { type: "integer", minimum: 1, maximum: 7 },
          intensity: {
            type: "string",
            enum: ["low", "moderate", "moderate-high", "high"],
          },
          exercise_mix: {
            type: "object",
            properties: {
              strength: { type: "number" },
              cardio: { type: "number" },
              mobility: { type: "number" },
            },
            required: ["strength", "cardio", "mobility"],
          },
          weekly_schedule: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "string" },
                focus: { type: "string" },
                exercises: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      sets: { type: "integer" },
                      reps: { type: "integer" },
                      duration_minutes: { type: "integer" },
                      notes: { type: "string" },
                    },
                    required: ["name"],
                  },
                },
                duration_minutes: { type: "integer" },
              },
              required: ["day", "focus", "exercises", "duration_minutes"],
            },
          },
          rationale: { type: "string" },
        },
        required: [
          "plan_name",
          "philosophy",
          "sessions_per_week",
          "intensity",
          "exercise_mix",
          "weekly_schedule",
          "rationale",
        ],
      },
    },
  },
  required: ["plans"],
};

export const WHATIF_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    result: {
      type: "object",
      properties: {
        parameter_changes: {
          type: "object",
          additionalProperties: { type: "string" },
        },
        interpretation: { type: "string" },
        key_insight: { type: "string" },
      },
      required: ["parameter_changes", "interpretation", "key_insight"],
    },
  },
  required: ["result"],
};

export const COMPARE_PLANS_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    comparison: {
      type: "object",
      properties: {
        recommended_plan_index: { type: "integer", minimum: 0 },
        reasoning: { type: "string" },
        trade_offs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              plan_name: { type: "string" },
              pros: { type: "array", items: { type: "string" } },
              cons: { type: "array", items: { type: "string" } },
            },
            required: ["plan_name", "pros", "cons"],
          },
        },
      },
      required: ["recommended_plan_index", "reasoning", "trade_offs"],
    },
  },
  required: ["comparison"],
};

export function buildGeneratePlanUserMessage(req: GeneratePlanRequest): string {
  return [
    "Generate exactly 3 plan candidates as STRICT JSON matching the schema.",
    "",
    "USER PROFILE:",
    JSON.stringify(req.profile, null, 2),
    "",
    "TRAINING FINGERPRINT (from MediaPipe CV):",
    JSON.stringify(req.fingerprint, null, 2),
    "",
    "GOAL:",
    JSON.stringify(req.goal, null, 2),
    "",
    "Reminder: do NOT predict numeric outcomes. The tabular model will score these plans separately.",
  ].join("\n");
}

export function buildWhatIfUserMessage(req: WhatIfRequest): string {
  return [
    "Explain the what-if change as STRICT JSON matching the schema.",
    "",
    "USER PROFILE:",
    JSON.stringify(req.profile, null, 2),
    "",
    "TRAINING FINGERPRINT:",
    JSON.stringify(req.fingerprint, null, 2),
    "",
    "CURRENT PLAN:",
    JSON.stringify(req.current_plan, null, 2),
    "",
    "PREDICTIONS BEFORE CHANGE (from tabular model):",
    JSON.stringify(req.before_predictions, null, 2),
    "",
    "PREDICTIONS AFTER CHANGE (from tabular model):",
    JSON.stringify(req.after_predictions, null, 2),
    "",
    "CHANGE DESCRIPTION:",
    req.change_description,
    "",
    "Reminder: only reference numbers that already exist in the predictions above. Do not invent any.",
  ].join("\n");
}

export function buildComparePlansUserMessage(req: ComparePlansRequest): string {
  return [
    "Compare the scored plans and pick a winner as STRICT JSON matching the schema.",
    "",
    "GOAL:",
    JSON.stringify(req.goal, null, 2),
    "",
    "SCORED PLANS (each carries predictions already produced by the tabular model):",
    JSON.stringify(req.scored_plans, null, 2),
    "",
    "Reminder: a plan that violates any goal.constraints entry cannot be recommended. Do not invent numbers.",
  ].join("\n");
}
