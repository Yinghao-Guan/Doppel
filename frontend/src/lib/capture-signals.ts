"use client";

import type { CVFields } from "@/types/predict";

const DEFAULT_SIGNALS: CVFields = {
  rep_count: 8,
  avg_form_score: 0.78,
  avg_depth_score: 0.72,
  tempo_consistency: 0.81,
  stability_score: 0.69,
  fatigue_slope: 0.24,
  knee_valgus_risk: 0.21,
};

export function useCaptureSignals(): CVFields {
  return DEFAULT_SIGNALS;
}
