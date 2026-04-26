export type FitnessLevel = "beginner" | "intermediate" | "advanced";

export type TargetMetric =
  | "strength"
  | "endurance"
  | "weight_loss"
  | "mobility"
  | "general_fitness";

export type Intensity = "low" | "moderate" | "moderate-high" | "high";

export interface UserProfile {
  age: number;
  height_cm: number;
  weight_kg: number;
  fitness_level: FitnessLevel;
  training_frequency_per_week: number;
  sleep_hours: number;
}

export interface TrainingFingerprint {
  exercise_type: string;
  rep_count: number;
  range_of_motion_score: number;
  tempo_consistency: number;
  form_score: number;
  stability_score: number;
  asymmetry: number;
  fatigue_trend: number;
  injury_risk_signals: string[];
  avg_depth_score?: number;
  knee_valgus_risk?: number;
}

export interface Predictions {
  strength_change_pct: number;
  endurance_change_pct: number;
  mobility_score: number;
  recovery_score: number;
  consistency_score: number;
  injury_risk_pct: number;
  estimated_calorie_burn: number;
}

export interface ModelScores {
  readiness_score: number;
  injury_risk_score: number;
  strength_potential_score: number;
  endurance_potential_score: number;
}

export interface ModelSignals {
  form_quality: number;
  depth_score: number;
  tempo_consistency: number;
  stability: number;
  fatigue_trend: number;
  asymmetry: number;
  range_of_motion: number;
  movement_quality: number;
}

export interface ModelForecast {
  scores: ModelScores;
  signals: ModelSignals;
  summary: string;
  explanations: string[];
  recommendations: string[];
}

export interface Goal {
  target_metric: TargetMetric;
  target_change_pct?: number;
  horizon_days: number;
  constraints: string[];
}

export interface ScheduledExercise {
  name: string;
  sets?: number;
  reps?: number;
  duration_minutes?: number;
  notes?: string;
}

export interface ScheduledDay {
  day: string;
  focus: string;
  exercises: ScheduledExercise[];
  duration_minutes: number;
}

export interface ExerciseMix {
  strength: number;
  cardio: number;
  mobility: number;
}

export interface PlanCandidate {
  plan_name: string;
  philosophy: string;
  sessions_per_week: number;
  intensity: Intensity;
  exercise_mix: ExerciseMix;
  weekly_schedule: ScheduledDay[];
  rationale: string;
}

export interface ScoredPlan {
  plan: PlanCandidate;
  predictions: Predictions;
}

export interface PlanTradeOff {
  plan_name: string;
  pros: string[];
  cons: string[];
}

export interface PlanComparison {
  recommended_plan_index: number;
  reasoning: string;
  trade_offs: PlanTradeOff[];
}

export interface WhatIfResult {
  parameter_changes: Record<string, string>;
  interpretation: string;
  key_insight: string;
}

export interface GeneratePlanRequest {
  profile: UserProfile;
  fingerprint: TrainingFingerprint;
  goal: Goal;
}

export interface GeneratePlanResponse {
  plans: PlanCandidate[];
}

export interface WhatIfRequest {
  profile: UserProfile;
  fingerprint: TrainingFingerprint;
  current_plan: PlanCandidate;
  before_predictions: ModelForecast;
  after_predictions: ModelForecast;
  change_description: string;
}

export interface WhatIfResponse {
  result: WhatIfResult;
}

export interface ComparePlansRequest {
  goal: Goal;
  scored_plans: ScoredPlan[];
}

export interface ComparePlansResponse {
  comparison: PlanComparison;
}
