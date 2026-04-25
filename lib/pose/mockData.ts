/**
 * PERSON 1 — pre-baked TrainingFingerprints for Demo Mode and tests.
 *
 * Used by:
 *  - Demo Mode toggle when no camera is available.
 *  - P4 plan-adaptation demos (MOCK_BAD_FORM, MOCK_FATIGUED).
 *  - Any storybook / unit test that needs a stable fingerprint.
 *
 * Invariants (enforced manually — keep them true on edit):
 *  - All scores live in [0, 1].
 *  - totalReps === reps.length.
 *  - fatigueTrend in [-1, 1].
 *  - injuryRiskMarkers reflect the rules the analyzer applies:
 *      asymmetryAvg > 0.08 → "L/R asymmetry"
 *      avgFormScore < 0.55 → "low form score"
 *      fatigueTrend < -0.4 → "fatigue collapse"
 */

import type { RepEvent, TrainingFingerprint } from "@/types";

/**
 * Round helper local to this file so we don't drag in a runtime dep just for
 * trimming decimals in literals.
 */
function r(n: number, decimals = 3): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/**
 * Build a RepEvent. Centralized so depth + asymmetry consistently produce a
 * sensible formScore that mirrors the analyzer's heuristic.
 */
function rep(
  index: number,
  durationMs: number,
  minKneeAngle: number,
  asymmetryPct: number,
  formScore: number
): RepEvent {
  return {
    index,
    durationMs,
    minKneeAngle,
    maxKneeAngle: 175,
    formScore: r(formScore),
    asymmetryPct: r(asymmetryPct),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// MOCK_FINGERPRINT — intermediate lifter, 5 clean squats with mild drift.
// ─────────────────────────────────────────────────────────────────────────

const cleanReps: RepEvent[] = [
  rep(1, 1850, 95, 0.04, 0.9),
  rep(2, 1900, 96, 0.05, 0.87),
  rep(3, 1980, 99, 0.06, 0.84),
  rep(4, 2050, 102, 0.07, 0.79),
  rep(5, 2150, 105, 0.08, 0.75),
];

export const MOCK_FINGERPRINT: TrainingFingerprint = {
  exercise: "squat",
  totalReps: cleanReps.length,
  avgFormScore: 0.83,
  asymmetryAvg: 0.06,
  avgRangeOfMotion: 0.78,
  tempoConsistency: 0.82,
  fatigueTrend: -0.18,
  injuryRiskMarkers: [],
  reps: cleanReps,
  timestamp: Date.now(),
};

// ─────────────────────────────────────────────────────────────────────────
// MOCK_BAD_FORM — 7 reps, low form, L/R asymmetry. Used by P4 to demo plan
// adaptation when the prediction engine surfaces injury risk.
// ─────────────────────────────────────────────────────────────────────────

const badReps: RepEvent[] = [
  rep(1, 1700, 118, 0.12, 0.6),
  rep(2, 1750, 120, 0.13, 0.58),
  rep(3, 1800, 122, 0.14, 0.55),
  rep(4, 1850, 124, 0.14, 0.55),
  rep(5, 1900, 125, 0.15, 0.53),
  rep(6, 2000, 127, 0.15, 0.52),
  rep(7, 2100, 130, 0.16, 0.5),
];

export const MOCK_BAD_FORM: TrainingFingerprint = {
  exercise: "squat",
  totalReps: badReps.length,
  avgFormScore: 0.55,
  asymmetryAvg: 0.14,
  avgRangeOfMotion: 0.58,
  tempoConsistency: 0.78,
  fatigueTrend: -0.22,
  injuryRiskMarkers: ["L/R asymmetry", "low form score"],
  reps: badReps,
  timestamp: Date.now(),
};

// ─────────────────────────────────────────────────────────────────────────
// MOCK_FATIGUED — 8 reps with strong form collapse across the set.
// ─────────────────────────────────────────────────────────────────────────

const fatiguedReps: RepEvent[] = [
  rep(1, 1800, 98, 0.05, 0.88),
  rep(2, 1900, 100, 0.05, 0.83),
  rep(3, 2000, 104, 0.06, 0.76),
  rep(4, 2150, 110, 0.07, 0.68),
  rep(5, 2300, 115, 0.08, 0.6),
  rep(6, 2450, 122, 0.09, 0.5),
  rep(7, 2600, 128, 0.1, 0.42),
  rep(8, 2800, 135, 0.11, 0.34),
];

export const MOCK_FATIGUED: TrainingFingerprint = {
  exercise: "squat",
  totalReps: fatiguedReps.length,
  avgFormScore: 0.63,
  asymmetryAvg: 0.076,
  avgRangeOfMotion: 0.65,
  tempoConsistency: 0.62,
  fatigueTrend: -0.6,
  injuryRiskMarkers: ["fatigue collapse"],
  reps: fatiguedReps,
  timestamp: Date.now(),
};
