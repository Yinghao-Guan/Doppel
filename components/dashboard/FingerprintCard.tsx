"use client";

/**
 * PERSON 3 — shows the live training fingerprint extracted from the camera.
 */

import { Activity, AlertTriangle } from "lucide-react";
import { useAthleteStore } from "@/lib/store/useAthleteStore";

export function FingerprintCard() {
  const fp = useAthleteStore((s) => s.fingerprint);

  if (!fp) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-accent" />
          <h2 className="h-section text-white">Training Fingerprint</h2>
        </div>
        <p className="text-sm text-muted">
          Complete a set to generate your fingerprint.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          <h2 className="h-section text-white">Training Fingerprint</h2>
        </div>
        <span className="pill">{fp.exercise}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Reps" value={fp.totalReps.toString()} />
        <Stat label="Form Score" value={pct(fp.avgFormScore)} />
        <Stat label="Range of Motion" value={pct(fp.avgRangeOfMotion)} />
        <Stat label="Tempo Consistency" value={pct(fp.tempoConsistency)} />
        <Stat label="L/R Asymmetry" value={pct(fp.asymmetryAvg)} negative />
        <Stat
          label="Fatigue Trend"
          value={fp.fatigueTrend.toFixed(2)}
          negative={fp.fatigueTrend < 0}
        />
      </div>

      {fp.injuryRiskMarkers.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-bg-elevated border border-accent-red/30">
          <div className="flex items-center gap-2 text-accent-red text-xs font-semibold mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Risk markers detected
          </div>
          <div className="flex flex-wrap gap-1.5">
            {fp.injuryRiskMarkers.map((m) => (
              <span key={m} className="pill border-accent-red/40 text-accent-red">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  negative,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="bg-bg-elevated border border-border rounded-lg p-3">
      <div className="text-xs text-muted">{label}</div>
      <div
        className={`metric-value ${negative ? "metric-negative" : "metric-neutral"} text-2xl mt-1`}
      >
        {value}
      </div>
    </div>
  );
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
