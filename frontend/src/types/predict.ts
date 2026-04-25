export type Gender = "Male" | "Female";
export type ExperienceLevel = "Beginner" | "Intermediate" | "Advanced";
export type WorkoutType = "Strength" | "Cardio" | "HIIT" | "Yoga";

export interface ProfileFields {
  Age: number;
  Gender: Gender;
  Height: number;
  Weight: number;
  Workout_Frequency: number;
  Experience_Level: ExperienceLevel;
  Workout_Type: WorkoutType;
}

export interface CVFields {
  rep_count: number;
  avg_form_score: number;
  avg_depth_score: number;
  tempo_consistency: number;
  stability_score: number;
  fatigue_slope: number;
  knee_valgus_risk: number;
}

export interface OptionalProfileFields {
  Resting_BPM?: number;
  Avg_BPM?: number;
  Max_BPM?: number;
  Session_Duration?: number;
  Water_Intake?: number;
  Calories_Burned?: number;
  Fat_Percentage?: number;
}

export interface OptionalCVFields {
  left_right_asymmetry?: number;
  range_of_motion?: number;
  back_angle_risk?: number;
  movement_quality_score?: number;
  BMI?: number;
}

export type PredictInput = ProfileFields &
  CVFields &
  OptionalProfileFields &
  OptionalCVFields;

export interface PredictAliasInput {
  age?: number;
  gender?: Gender;
  height?: number;
  height_m?: number;
  height_cm?: number;
  weight?: number;
  weight_kg?: number;
  workout_frequency?: number;
  experience_level?: ExperienceLevel;
  workout_type?: WorkoutType;

  reps?: number;
  form_score?: number;
  depth_score?: number;
  tempo?: number;
  tempo_consistency?: number;
  stability?: number;
  fatigue?: number;
  fatigue_trend?: number;
  knee_risk?: number;
  knee_valgus?: number;
}

export interface PredictScores {
  readiness_score: number;
  injury_risk_score: number;
  strength_potential_score: number;
  endurance_potential_score: number;
}

export interface PredictSignals {
  form_quality: number;
  depth_score: number;
  tempo_consistency: number;
  stability: number;
  fatigue_trend: number;
  asymmetry: number;
  range_of_motion: number;
  movement_quality: number;
}

export interface PredictOutput {
  scores: PredictScores;
  signals: PredictSignals;
  summary: string;
  explanations: string[];
  recommendations: string[];
}

export type RawPredictInput = Partial<PredictInput> &
  PredictAliasInput &
  Record<string, unknown>;
