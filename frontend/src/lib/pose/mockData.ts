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
