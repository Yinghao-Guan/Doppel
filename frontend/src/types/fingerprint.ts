export type Exercise = "squat" | "pushup" | "deadlift";

export interface RepEvent {
  index: number;
  durationMs: number;
  minKneeAngle: number;
  maxKneeAngle: number;
  formScore: number;
  asymmetryPct: number;
}

export interface TrainingFingerprint {
  exercise: Exercise;
  totalReps: number;
  avgFormScore: number;     // 0..1
  avgRangeOfMotion: number; // 0..1
  tempoConsistency: number; // 0..1
  asymmetryAvg: number;     // 0..1
  fatigueTrend: number;     // -1..1, negative = degrading
  injuryRiskMarkers: string[];
  reps: RepEvent[];
  timestamp: number;
}
