import type { RepEvent, TrainingFingerprint } from "@/types/fingerprint";

const cleanReps: RepEvent[] = [
  { index: 1, durationMs: 1850, minKneeAngle: 95,  maxKneeAngle: 175, formScore: 0.9,  asymmetryPct: 0.04 },
  { index: 2, durationMs: 1900, minKneeAngle: 96,  maxKneeAngle: 175, formScore: 0.87, asymmetryPct: 0.05 },
  { index: 3, durationMs: 1980, minKneeAngle: 99,  maxKneeAngle: 175, formScore: 0.84, asymmetryPct: 0.06 },
  { index: 4, durationMs: 2050, minKneeAngle: 102, maxKneeAngle: 175, formScore: 0.79, asymmetryPct: 0.07 },
  { index: 5, durationMs: 2150, minKneeAngle: 105, maxKneeAngle: 175, formScore: 0.75, asymmetryPct: 0.08 },
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

// 7 reps, shallow depth + L/R imbalance.
// Should trigger markers: "L/R asymmetry" + "low form score".
const badFormReps: RepEvent[] = [
  { index: 1, durationMs: 1700, minKneeAngle: 130, maxKneeAngle: 175, formScore: 0.55, asymmetryPct: 0.14 },
  { index: 2, durationMs: 1750, minKneeAngle: 128, maxKneeAngle: 175, formScore: 0.52, asymmetryPct: 0.13 },
  { index: 3, durationMs: 1700, minKneeAngle: 132, maxKneeAngle: 175, formScore: 0.48, asymmetryPct: 0.15 },
  { index: 4, durationMs: 1800, minKneeAngle: 130, maxKneeAngle: 175, formScore: 0.50, asymmetryPct: 0.13 },
  { index: 5, durationMs: 1850, minKneeAngle: 134, maxKneeAngle: 175, formScore: 0.46, asymmetryPct: 0.16 },
  { index: 6, durationMs: 1900, minKneeAngle: 130, maxKneeAngle: 175, formScore: 0.50, asymmetryPct: 0.14 },
  { index: 7, durationMs: 1850, minKneeAngle: 132, maxKneeAngle: 175, formScore: 0.48, asymmetryPct: 0.13 },
];

export const MOCK_BAD_FORM: TrainingFingerprint = {
  exercise: "squat",
  totalReps: badFormReps.length,
  avgFormScore: 0.50,
  asymmetryAvg: 0.14,
  avgRangeOfMotion: 0.55,
  tempoConsistency: 0.78,
  fatigueTrend: -0.05,
  injuryRiskMarkers: ["L/R asymmetry", "low form score"],
  reps: badFormReps,
  timestamp: Date.now(),
};

// 8 reps, form degrades from 0.85 → 0.45 across the set.
// Should trigger marker: "fatigue collapse" (fatigueTrend < -0.4).
const fatiguedReps: RepEvent[] = [
  { index: 1, durationMs: 1850, minKneeAngle: 96,  maxKneeAngle: 175, formScore: 0.85, asymmetryPct: 0.05 },
  { index: 2, durationMs: 1900, minKneeAngle: 99,  maxKneeAngle: 175, formScore: 0.78, asymmetryPct: 0.05 },
  { index: 3, durationMs: 2000, minKneeAngle: 104, maxKneeAngle: 175, formScore: 0.70, asymmetryPct: 0.06 },
  { index: 4, durationMs: 2200, minKneeAngle: 110, maxKneeAngle: 175, formScore: 0.65, asymmetryPct: 0.06 },
  { index: 5, durationMs: 2400, minKneeAngle: 116, maxKneeAngle: 175, formScore: 0.60, asymmetryPct: 0.06 },
  { index: 6, durationMs: 2600, minKneeAngle: 122, maxKneeAngle: 175, formScore: 0.55, asymmetryPct: 0.07 },
  { index: 7, durationMs: 2800, minKneeAngle: 128, maxKneeAngle: 175, formScore: 0.50, asymmetryPct: 0.07 },
  { index: 8, durationMs: 3000, minKneeAngle: 134, maxKneeAngle: 175, formScore: 0.45, asymmetryPct: 0.07 },
];

export const MOCK_FATIGUED: TrainingFingerprint = {
  exercise: "squat",
  totalReps: fatiguedReps.length,
  avgFormScore: 0.64,
  asymmetryAvg: 0.06,
  avgRangeOfMotion: 0.62,
  tempoConsistency: 0.55,
  fatigueTrend: -0.46,
  injuryRiskMarkers: ["fatigue collapse"],
  reps: fatiguedReps,
  timestamp: Date.now(),
};
