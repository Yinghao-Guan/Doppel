"use client";

import { useMemo } from "react";
import { useAthleteStore } from "@/lib/athlete-store";
import type { CVFields } from "@/types/predict";
import { clamp } from "@/lib/utils";

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
  const fingerprint = useAthleteStore((s) => s.fingerprint);

  return useMemo(() => {
    if (!fingerprint) return DEFAULT_SIGNALS;

    // fatigueTrend is -1..1 (negative = form declining = more fatigue).
    // fatigue_slope is 0..1 (higher = more fatigued).
    const fatigue_slope = clamp(-fingerprint.fatigueTrend * 0.5 + 0.2, 0, 0.8);

    // Higher asymmetry → lower stability and higher knee valgus risk.
    const stability_score = clamp(1 - fingerprint.asymmetryAvg * 2, 0, 1);
    const knee_valgus_risk = clamp(fingerprint.asymmetryAvg * 1.5, 0, 1);

    return {
      rep_count: fingerprint.totalReps,
      avg_form_score: fingerprint.avgFormScore,
      avg_depth_score: fingerprint.avgRangeOfMotion,
      tempo_consistency: fingerprint.tempoConsistency,
      stability_score,
      fatigue_slope,
      knee_valgus_risk,
    };
  }, [fingerprint]);
}
