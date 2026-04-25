/**
 * PERSON 2 — physiological formulas.
 *
 * These are intentionally simple, transparent, and INPUT-DEPENDENT. Every
 * formula must respond to changing inputs so the demo's "what-if" sliders
 * produce visibly different outputs. No constants masquerading as predictions.
 *
 * Inspired by the Banister fitness-fatigue impulse-response model.
 *   adaptation = k_fitness * TRIMP - k_fatigue * TRIMP * recovery_deficit
 */

import type { TrainingFingerprint, TrainingPlan, UserProfile } from "@/types";
import { clamp } from "@/lib/utils";

/** Training Impulse — basic load metric per session. */
export function trimpPerSession(plan: TrainingPlan): number {
  return plan.durationMinutes * plan.intensity;
}

/** Two-week aggregate load. */
export function aggregateTrimp(plan: TrainingPlan): number {
  return trimpPerSession(plan) * plan.frequencyPerWeek * 2;
}

/** Sleep deficit factor. 7+ hrs = 1.0, less hurts recovery. */
export function recoveryFactor(profile: UserProfile): number {
  const target = 8;
  return clamp(profile.sleepHours / target, 0.5, 1.05);
}

/** Age-adjusted adaptation rate. Younger lifters adapt faster. */
export function ageFactor(profile: UserProfile): number {
  // 20yr → 1.05, 30yr → 1.00, 50yr → 0.85
  return clamp(1.1 - (profile.age - 20) * 0.012, 0.7, 1.1);
}

/** Fitness-level baseline. Beginners gain faster (newbie gains), advanced plateau. */
export function noviceMultiplier(profile: UserProfile): number {
  return profile.fitnessLevel === "beginner"
    ? 1.4
    : profile.fitnessLevel === "intermediate"
    ? 1.0
    : 0.75;
}

export function strengthDelta(
  profile: UserProfile,
  fp: TrainingFingerprint,
  plan: TrainingPlan
): number {
  const trimp = aggregateTrimp(plan);
  const strengthShare = 1 - plan.cardioRatio;
  const base = 0.014 * trimp * strengthShare;
  const formMul = 0.5 + fp.avgFormScore;
  const sym = 1 - fp.asymmetryAvg * 0.6;
  const pct =
    base * formMul * sym * recoveryFactor(profile) * ageFactor(profile) *
    noviceMultiplier(profile);
  return clamp(pct, -2, 22);
}

export function enduranceDelta(
  profile: UserProfile,
  fp: TrainingFingerprint,
  plan: TrainingPlan
): number {
  const trimp = aggregateTrimp(plan);
  const cardioShare = plan.cardioRatio;
  const base = 0.018 * trimp * cardioShare;
  const consistency = 0.5 + fp.tempoConsistency;
  const pct =
    base * consistency * recoveryFactor(profile) * ageFactor(profile) *
    noviceMultiplier(profile);
  return clamp(pct, -1, 20);
}

export function mobilityDelta(
  profile: UserProfile,
  fp: TrainingFingerprint,
  plan: TrainingPlan
): number {
  const base = 1.5 + fp.avgRangeOfMotion * 6;
  const intensityPenalty = plan.intensity > 0.85 ? -1 : 0;
  return clamp(base + intensityPenalty, -1, 12);
}

/** 0..100 readiness score for the next session. */
export function recoveryScore(
  profile: UserProfile,
  fp: TrainingFingerprint,
  plan: TrainingPlan
): number {
  const sleep = recoveryFactor(profile);
  const fatiguePenalty = Math.max(0, -fp.fatigueTrend);
  const loadStress = clamp(aggregateTrimp(plan) / 1500, 0, 1);
  const score = 100 * sleep - 30 * fatiguePenalty - 25 * loadStress;
  return clamp(score, 30, 100);
}

/** Consistency = how reliably the user can hit the plan. */
export function consistencyScore(
  profile: UserProfile,
  fp: TrainingFingerprint,
  plan: TrainingPlan
): number {
  const planFit = 1 - Math.abs(profile.trainingFrequency - plan.frequencyPerWeek) / 7;
  const tempo = fp.tempoConsistency;
  return clamp(100 * (0.5 * planFit + 0.5 * tempo), 35, 100);
}

export function injuryRiskDelta(
  profile: UserProfile,
  fp: TrainingFingerprint,
  plan: TrainingPlan
): number {
  let risk = 0;
  risk += fp.asymmetryAvg * 18;
  risk += (1 - fp.avgFormScore) * 14;
  risk += plan.intensity > 0.85 ? 6 : 0;
  risk += plan.frequencyPerWeek > 5 ? 4 : 0;
  risk -= recoveryFactor(profile) * 8;
  risk -= profile.sleepHours >= 8 ? 3 : 0;
  return clamp(risk, -15, 30);
}

export function estCaloriesPerWeek(profile: UserProfile, plan: TrainingPlan): number {
  // Rough METs estimate: intensity 0.5 ≈ 5 METs, intensity 1.0 ≈ 10 METs
  const mets = 4 + plan.intensity * 6;
  const kcalPerMin = (mets * 3.5 * profile.weightKg) / 200;
  return Math.round(kcalPerMin * plan.durationMinutes * plan.frequencyPerWeek);
}
