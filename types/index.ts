/**
 * SHARED CONTRACTS — DO NOT EDIT WITHOUT TEAM AGREEMENT.
 *
 * This file is the single source of truth for data shapes that flow between
 * Person 1 (CV) → Person 2 (prediction/LLM) → Person 3 (UI) → Person 4 (sim).
 *
 * If you need a new field, add it here first, then announce in chat so the
 * other owners adapt their code. Do not change existing field names.
 */

// ─────────────────────────────────────────────────────────────────────────────
// USER PROFILE — owned by Person 3 (ProfileForm)
// ─────────────────────────────────────────────────────────────────────────────

export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type Goal = "strength" | "endurance" | "weight_loss" | "mobility";

export interface UserProfile {
  age: number;            // years
  heightCm: number;
  weightKg: number;
  fitnessLevel: FitnessLevel;
  goal: Goal;
  trainingFrequency: number; // sessions per week
  sleepHours: number;        // average per night
}

// ─────────────────────────────────────────────────────────────────────────────
// CV OUTPUT — owned by Person 1 (lib/pose/analyzer.ts)
// Person 1 emits a TrainingFingerprint after the user finishes a set.
// ─────────────────────────────────────────────────────────────────────────────

export type Exercise = "squat" | "pushup" | "deadlift";

export interface RepEvent {
  index: number;          // 1-based
  durationMs: number;     // eccentric + concentric
  minKneeAngle: number;   // deg, for squat depth
  maxKneeAngle: number;
  formScore: number;      // 0..1, heuristic from joint angles
  asymmetryPct: number;   // 0..1, L/R difference
}

export interface TrainingFingerprint {
  exercise: Exercise;
  totalReps: number;
  avgFormScore: number;     // 0..1
  avgRangeOfMotion: number; // 0..1, normalized
  tempoConsistency: number; // 0..1, lower variance = higher
  asymmetryAvg: number;     // 0..1
  fatigueTrend: number;     // -1..1, negative = degrading across set
  injuryRiskMarkers: string[]; // e.g. ["knee_valgus", "lumbar_flexion"]
  reps: RepEvent[];
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PREDICTION OUTPUT — owned by Person 2 (lib/prediction/engine.ts)
// Takes UserProfile + TrainingFingerprint + TrainingPlan → Projection.
// ─────────────────────────────────────────────────────────────────────────────

export interface TrainingPlan {
  id: "A" | "B" | "C" | "custom";
  label: string;             // "Cardio-heavy", "Mixed", "HIIT"
  frequencyPerWeek: number;
  intensity: number;         // 0..1
  cardioRatio: number;       // 0..1, share of cardio vs strength
  durationMinutes: number;
}

export interface Projection {
  horizonDays: number;          // typically 14
  strengthDeltaPct: number;     // e.g. +9 means +9%
  enduranceDeltaPct: number;
  mobilityDeltaPct: number;
  recoveryScore: number;        // 0..100
  consistencyScore: number;     // 0..100
  injuryRiskDeltaPct: number;   // negative = lower risk
  estCaloriesPerWeek: number;
  // For UI: how each value was computed (shown on hover)
  rationale: ProjectionRationale;
}

export interface ProjectionRationale {
  strength: string;     // "3.2 RPE × 4 sessions × 0.87 form score → +9.1%"
  endurance: string;
  mobility: string;
  recovery: string;
  injuryRisk: string;
}

export interface CoachAdvice {
  summary: string;             // 1-2 sentence headline
  recommendations: string[];   // 3-5 bullets
  warnings: string[];          // injury or recovery flags
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATOR OUTPUT — owned by Person 4 (components/simulator/*)
// Plan comparison data for the radar/curve charts.
// ─────────────────────────────────────────────────────────────────────────────

export interface PlanComparison {
  plans: { plan: TrainingPlan; projection: Projection }[];
  recommendedId: TrainingPlan["id"];
  // Per-day curve points for the growth-curve chart
  curves: GrowthCurvePoint[];
}

export interface GrowthCurvePoint {
  day: number;               // 0..14
  planA: number;             // strength score
  planB: number;
  planC: number;
}
