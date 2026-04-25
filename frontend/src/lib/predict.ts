import type {
  PredictInput,
  PredictOutput,
  PredictSignals,
  RawPredictInput,
} from "@/types/predict";

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

function buildSignals(input: PredictInput): PredictSignals {
  return {
    form_quality: round1(clamp(input.avg_form_score, 0, 1) * 100),
    depth_score: round1(clamp(input.avg_depth_score, 0, 1) * 100),
    tempo_consistency: round1(clamp(input.tempo_consistency, 0, 1) * 100),
    stability: round1(clamp(input.stability_score, 0, 1) * 100),
    fatigue_trend: round1(clamp(1 - input.fatigue_slope, 0, 1) * 100),
    asymmetry: round1(clamp(1 - (input.left_right_asymmetry ?? 0.1), 0, 1) * 100),
    range_of_motion: round1(clamp(input.range_of_motion ?? input.avg_depth_score, 0, 1) * 100),
    movement_quality: round1(clamp(input.movement_quality_score ?? 0.6, 0, 1) * 100),
  };
}

function buildSummary(scores: PredictOutput["scores"]): string {
  const { readiness_score, injury_risk_score } = scores;
  if (readiness_score >= 70 && injury_risk_score < 30) {
    return "Movement quality looks strong and injury risk is low. You're ready for a strength-focused session.";
  }
  if (injury_risk_score >= 55) {
    return "Injury risk is elevated. Prioritize mobility and controlled tempo work before adding load.";
  }
  if (readiness_score < 50) {
    return "Readiness is dipping. Recovery, hydration, and a lighter session today will pay off tomorrow.";
  }
  return "You're in a balanced zone. A moderate session with focus on form will keep your trajectory climbing.";
}

function buildExplanations(input: PredictInput, scores: PredictOutput["scores"]): string[] {
  const out: string[] = [];
  const mq = (input.movement_quality_score ?? 0.6) * 100;
  if (mq >= 65) {
    out.push("Overall movement quality was strong, lifting readiness and strength potential.");
  } else if (mq < 45) {
    out.push("Movement quality dipped through the set, dragging readiness down.");
  }

  if (input.fatigue_slope > 0.35) {
    out.push("Fatigue built up across the set, lowering readiness and increasing risk.");
  } else if (input.fatigue_slope < 0.15) {
    out.push("Fatigue stayed low across the set, supporting endurance potential.");
  }

  if ((input.left_right_asymmetry ?? 0.1) < 0.12) {
    out.push("Symmetry stayed controlled, helping keep injury risk low.");
  } else {
    out.push("Left/right asymmetry crept up, nudging injury risk higher.");
  }

  if (input.knee_valgus_risk >= 0.4) {
    out.push("Knee valgus risk was detected on multiple reps, contributing to injury risk.");
  }

  if (scores.strength_potential_score >= 70) {
    out.push("Form and stability metrics suggest strong upside for progressive overload.");
  }

  return out.slice(0, 4);
}

function buildRecommendations(input: PredictInput, scores: PredictOutput["scores"]): string[] {
  const out: string[] = [];

  if (scores.injury_risk_score >= 55) {
    out.push("Reduce intensity and focus on controlled form work before increasing load.");
  }
  if (scores.readiness_score < 50) {
    out.push("Prioritize recovery, hydration, and lighter training today.");
  }
  if (scores.readiness_score >= 70 && scores.injury_risk_score < 35) {
    out.push("You are ready for progressive overload in the next strength session.");
  }
  if (input.knee_valgus_risk >= 0.4) {
    out.push("Add tempo squats and single-leg work to stabilize the knee track.");
  }
  if ((input.left_right_asymmetry ?? 0.1) >= 0.15) {
    out.push("Mix in unilateral exercises to bring left/right balance back in line.");
  }
  if (out.length === 0) {
    out.push("Hold steady — your training fingerprint is balanced. Re-test in 3 days.");
  }

  return out.slice(0, 4);
}

export function mockPredict(canonical: PredictInput): PredictOutput {
  const form = canonical.avg_form_score;
  const depth = canonical.avg_depth_score;
  const tempo = canonical.tempo_consistency;
  const stability = canonical.stability_score;
  const fatigue = canonical.fatigue_slope;
  const knee = canonical.knee_valgus_risk;
  const asym = canonical.left_right_asymmetry ?? 0.1;
  const mq = canonical.movement_quality_score ?? 0.6;

  const readiness = clamp(
    0.32 * form + 0.22 * stability + 0.18 * tempo + 0.18 * mq - 0.25 * fatigue - 0.15 * knee,
    0,
    1,
  );
  const injury = clamp(
    0.30 * knee + 0.22 * (1 - form) + 0.18 * fatigue + 0.18 * asym + 0.12 * (1 - stability),
    0,
    1,
  );
  const strength = clamp(
    0.30 * form + 0.22 * stability + 0.18 * mq + 0.15 * depth - 0.18 * fatigue - 0.10 * knee,
    0,
    1,
  );
  const endurance = clamp(
    0.30 * (1 - fatigue) + 0.22 * tempo + 0.18 * stability + 0.15 * mq + 0.10 * (canonical.Workout_Frequency / 7),
    0,
    1,
  );

  const scores = {
    readiness_score: round1(readiness * 100),
    injury_risk_score: round1(injury * 100),
    strength_potential_score: round1(strength * 100),
    endurance_potential_score: round1(endurance * 100),
  };

  return {
    scores,
    signals: buildSignals(canonical),
    summary: buildSummary(scores),
    explanations: buildExplanations(canonical, scores),
    recommendations: buildRecommendations(canonical, scores),
  };
}

export async function predict(raw: RawPredictInput): Promise<PredictOutput> {
  const canonical = normalizeInput(raw);
  await new Promise((r) => setTimeout(r, 320));
  return mockPredict(canonical);
}
