import type { PredictInput, PredictOutput, RawPredictInput } from "@/types/predict";
import { BACKEND_URL } from "@/lib/solana";

const ALIAS_MAP: Record<string, keyof PredictInput> = {
  age: "Age",
  gender: "Gender",
  height: "Height",
  height_m: "Height",
  height_cm: "Height",
  weight: "Weight",
  weight_kg: "Weight",
  workout_frequency: "Workout_Frequency",
  experience_level: "Experience_Level",
  workout_type: "Workout_Type",

  reps: "rep_count",
  form_score: "avg_form_score",
  depth_score: "avg_depth_score",
  tempo: "tempo_consistency",
  tempo_consistency: "tempo_consistency",
  stability: "stability_score",
  fatigue: "fatigue_slope",
  fatigue_trend: "fatigue_slope",
  knee_risk: "knee_valgus_risk",
  knee_valgus: "knee_valgus_risk",
};

const PROFILE_DEFAULTS = {
  Resting_BPM: 65,
  Avg_BPM: 140,
  Max_BPM: 190,
  Session_Duration: 1.0,
  Water_Intake: 2.5,
  Calories_Burned: 400,
  Fat_Percentage: 18,
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const round1 = (v: number) => Math.round(v * 10) / 10;

export function normalizeInput(raw: RawPredictInput): PredictInput {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null) continue;
    const canonical = ALIAS_MAP[key] ?? (key as keyof PredictInput);
    out[canonical] = value;
  }

  if (typeof out.Height === "number" && out.Height > 3) {
    out.Height = (out.Height as number) / 100;
  }

  for (const [key, def] of Object.entries(PROFILE_DEFAULTS)) {
    if (out[key] === undefined) out[key] = def;
  }

  const depth = (out.avg_depth_score as number) ?? 0.6;
  const form = (out.avg_form_score as number) ?? 0.7;
  const fatigue = (out.fatigue_slope as number) ?? 0.2;

  if (out.left_right_asymmetry === undefined) out.left_right_asymmetry = 0.1;
  if (out.range_of_motion === undefined) out.range_of_motion = depth;
  if (out.back_angle_risk === undefined) out.back_angle_risk = 1 - form;

  if (out.BMI === undefined) {
    const h = out.Height as number;
    const w = out.Weight as number;
    if (typeof h === "number" && typeof w === "number" && h > 0) {
      out.BMI = round1(w / (h * h));
    }
  }

  if (out.movement_quality_score === undefined) {
    const tempo = (out.tempo_consistency as number) ?? 0.6;
    const stability = (out.stability_score as number) ?? 0.6;
    const rom = out.range_of_motion as number;
    const asym = out.left_right_asymmetry as number;
    const mqs =
      0.28 * form +
      0.20 * depth +
      0.18 * tempo +
      0.18 * stability +
      0.12 * rom -
      0.06 * asym -
      0.05 * fatigue;
    out.movement_quality_score = clamp(mqs, 0, 1);
  }

  return out as unknown as PredictInput;
}

export async function predict(raw: RawPredictInput): Promise<PredictOutput> {
  const response = await fetch(`${BACKEND_URL}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(raw),
  });

  if (!response.ok) {
    let message = "Prediction request failed.";
    try {
      const payload = (await response.json()) as { error?: string; detail?: string };
      if (payload.detail) {
        message = payload.detail;
      } else if (payload.error) {
        message = payload.error;
      }
    } catch {
      // ignore json parse error and keep generic message
    }
    throw new Error(message);
  }

  return (await response.json()) as PredictOutput;
}
