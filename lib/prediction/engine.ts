/**
 * PERSON 2 — main entry point. Components and the simulator only call
 * `simulate()` and `comparePlans()`. They never reach inside formulas.ts.
 */

import type {
  GrowthCurvePoint,
  PlanComparison,
  Projection,
  TrainingFingerprint,
  TrainingPlan,
  UserProfile,
} from "@/types";
import {
  consistencyScore,
  enduranceDelta,
  estCaloriesPerWeek,
  injuryRiskDelta,
  mobilityDelta,
  recoveryScore,
  strengthDelta,
} from "./formulas";
import { round } from "@/lib/utils";

export const DEFAULT_PLANS: TrainingPlan[] = [
  {
    id: "A",
    label: "Cardio-Heavy",
    frequencyPerWeek: 5,
    intensity: 0.6,
    cardioRatio: 0.8,
    durationMinutes: 45,
  },
  {
    id: "B",
    label: "Mixed",
    frequencyPerWeek: 4,
    intensity: 0.7,
    cardioRatio: 0.4,
    durationMinutes: 50,
  },
  {
    id: "C",
    label: "HIIT + Strength",
    frequencyPerWeek: 4,
    intensity: 0.9,
    cardioRatio: 0.3,
    durationMinutes: 40,
  },
];

export function simulate(
  profile: UserProfile,
  fp: TrainingFingerprint,
  plan: TrainingPlan,
  horizonDays = 14
): Projection {
  const strength = strengthDelta(profile, fp, plan);
  const endurance = enduranceDelta(profile, fp, plan);
  const mobility = mobilityDelta(profile, fp, plan);
  const recovery = recoveryScore(profile, fp, plan);
  const consistency = consistencyScore(profile, fp, plan);
  const injury = injuryRiskDelta(profile, fp, plan);
  const kcals = estCaloriesPerWeek(profile, plan);

  return {
    horizonDays,
    strengthDeltaPct: round(strength, 1),
    enduranceDeltaPct: round(endurance, 1),
    mobilityDeltaPct: round(mobility, 1),
    recoveryScore: round(recovery, 0),
    consistencyScore: round(consistency, 0),
    injuryRiskDeltaPct: round(injury, 1),
    estCaloriesPerWeek: kcals,
    rationale: {
      strength: `${plan.frequencyPerWeek} sess/wk × ${plan.intensity.toFixed(2)} RPE × ${fp.avgFormScore.toFixed(2)} form → ${round(strength, 1)}%`,
      endurance: `${plan.cardioRatio.toFixed(2)} cardio share × ${fp.tempoConsistency.toFixed(2)} tempo → ${round(endurance, 1)}%`,
      mobility: `${fp.avgRangeOfMotion.toFixed(2)} ROM at high intensity → ${round(mobility, 1)}%`,
      recovery: `${profile.sleepHours}h sleep, fatigue trend ${fp.fatigueTrend.toFixed(2)} → ${round(recovery, 0)}/100`,
      injuryRisk: `${(fp.asymmetryAvg * 100).toFixed(0)}% asymmetry, ${(fp.avgFormScore * 100).toFixed(0)}% form → ${round(injury, 1)}%`,
    },
  };
}

export function comparePlans(
  profile: UserProfile,
  fp: TrainingFingerprint,
  plans: TrainingPlan[] = DEFAULT_PLANS,
  horizonDays = 14
): PlanComparison {
  const items = plans.map((plan) => ({
    plan,
    projection: simulate(profile, fp, plan, horizonDays),
  }));

  // Recommend the plan that best matches the user's goal.
  const goalKey: Record<UserProfile["goal"], keyof Projection> = {
    strength: "strengthDeltaPct",
    endurance: "enduranceDeltaPct",
    weight_loss: "estCaloriesPerWeek",
    mobility: "mobilityDeltaPct",
  };
  const key = goalKey[profile.goal];
  const best = items.reduce((acc, cur) =>
    (cur.projection[key] as number) > (acc.projection[key] as number) ? cur : acc
  );

  // Build per-day curves (smooth growth using sqrt(t) — adaptation is non-linear).
  const curves: GrowthCurvePoint[] = [];
  for (let day = 0; day <= horizonDays; day++) {
    const f = Math.sqrt(day / horizonDays);
    curves.push({
      day,
      planA: round(items[0].projection.strengthDeltaPct * f, 2),
      planB: round(items[1].projection.strengthDeltaPct * f, 2),
      planC: round(items[2].projection.strengthDeltaPct * f, 2),
    });
  }

  return { plans: items, recommendedId: best.plan.id, curves };
}
