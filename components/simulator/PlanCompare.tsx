"use client";

/**
 * PERSON 4 — plan comparison cards. Recomputes when fingerprint or profile changes.
 *
 * Calls Person 2's `comparePlans()` function — never reaches into formulas.
 */

import { useEffect, useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import { useAthleteStore } from "@/lib/store/useAthleteStore";
import { comparePlans } from "@/lib/prediction/engine";
import { fmtSignedPct } from "@/lib/utils";
import type { TrainingPlan } from "@/types";

export function PlanCompare() {
  const profile = useAthleteStore((s) => s.profile);
  const fp = useAthleteStore((s) => s.fingerprint);
  const setSelectedPlan = useAthleteStore((s) => s.setSelectedPlan);
  const setProjection = useAthleteStore((s) => s.setProjection);

  const comparison = useMemo(() => {
    if (!profile || !fp) return null;
    return comparePlans(profile, fp);
  }, [profile, fp]);

  // When the comparison first computes, push the recommended plan into the store
  useEffect(() => {
    if (!comparison) return;
    const rec = comparison.plans.find((p) => p.plan.id === comparison.recommendedId);
    if (rec) {
      setSelectedPlan(rec.plan);
      setProjection(rec.projection);
    }
  }, [comparison, setSelectedPlan, setProjection]);

  if (!comparison) {
    return (
      <div className="card">
        <h2 className="h-section text-white mb-2">Training Plan Comparison</h2>
        <p className="text-sm text-muted">
          Complete a set to compare 14-day outcomes across plans.
        </p>
      </div>
    );
  }

  const handleSelect = (plan: TrainingPlan) => {
    const item = comparison.plans.find((p) => p.plan.id === plan.id);
    if (!item) return;
    setSelectedPlan(item.plan);
    setProjection(item.projection);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="h-section text-white">Plan Comparison</h2>
          <p className="text-xs text-muted mt-0.5">
            Click a plan to load its projection
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {comparison.plans.map(({ plan, projection }) => {
          const isRec = comparison.recommendedId === plan.id;
          return (
            <button
              key={plan.id}
              onClick={() => handleSelect(plan)}
              className={`text-left bg-bg-elevated border rounded-lg p-4 transition hover:border-accent ${
                isRec ? "border-accent shadow-glow" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted">Plan {plan.id}</div>
                  <div className="font-semibold">{plan.label}</div>
                </div>
                {isRec && (
                  <span className="pill border-accent/40 text-accent">
                    <CheckCircle2 className="w-3 h-3" />
                    Recommended
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <Row label="Strength" v={fmtSignedPct(projection.strengthDeltaPct)} good={projection.strengthDeltaPct >= 0} />
                <Row label="Endurance" v={fmtSignedPct(projection.enduranceDeltaPct)} good={projection.enduranceDeltaPct >= 0} />
                <Row label="Recovery" v={`${projection.recoveryScore}/100`} good={projection.recoveryScore >= 65} />
                <Row label="Risk" v={fmtSignedPct(projection.injuryRiskDeltaPct)} good={projection.injuryRiskDeltaPct < 0} />
              </div>
              <div className="mt-3 text-xs text-muted">
                {plan.frequencyPerWeek}× / wk · {plan.durationMinutes}min · intensity {plan.intensity.toFixed(2)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, v, good }: { label: string; v: string; good: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted text-xs">{label}</span>
      <span
        className={`tabular-nums font-medium ${
          good ? "text-accent-green" : "text-accent-red"
        }`}
      >
        {v}
      </span>
    </div>
  );
}
