"use client";

/**
 * PERSON 3 — main projection card. Shows the 14-day forecast with rationale
 * tooltips so judges can see the math behind each number.
 */

import { TrendingUp, ShieldAlert, Heart, Flame } from "lucide-react";
import { useAthleteStore } from "@/lib/store/useAthleteStore";
import { fmtSignedPct } from "@/lib/utils";

export function ProjectionCard() {
  const projection = useAthleteStore((s) => s.projection);

  if (!projection) {
    return (
      <div className="card">
        <h2 className="h-section text-white mb-2">14-Day Projection</h2>
        <p className="text-sm text-muted">
          Complete a set to project your future performance.
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="h-section text-white">14-Day Projection</h2>
          <p className="text-xs text-muted mt-0.5">
            From your current training fingerprint
          </p>
        </div>
        <span className="pill border-accent/40 text-accent">
          horizon: {projection.horizonDays} days
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric
          icon={<TrendingUp className="w-4 h-4" />}
          label="Strength"
          value={fmtSignedPct(projection.strengthDeltaPct)}
          positive={projection.strengthDeltaPct >= 0}
          tip={projection.rationale.strength}
        />
        <Metric
          icon={<Heart className="w-4 h-4" />}
          label="Endurance"
          value={fmtSignedPct(projection.enduranceDeltaPct)}
          positive={projection.enduranceDeltaPct >= 0}
          tip={projection.rationale.endurance}
        />
        <Metric
          icon={<Flame className="w-4 h-4" />}
          label="Mobility"
          value={fmtSignedPct(projection.mobilityDeltaPct)}
          positive={projection.mobilityDeltaPct >= 0}
          tip={projection.rationale.mobility}
        />
        <Metric
          icon={<ShieldAlert className="w-4 h-4" />}
          label="Injury Risk"
          value={fmtSignedPct(projection.injuryRiskDeltaPct)}
          positive={projection.injuryRiskDeltaPct < 0}
          tip={projection.rationale.injuryRisk}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <ScoreBar label="Recovery" value={projection.recoveryScore} />
        <ScoreBar label="Consistency" value={projection.consistencyScore} />
        <div className="bg-bg-elevated border border-border rounded-lg p-3">
          <div className="text-xs text-muted">Calories / week</div>
          <div className="metric-value text-2xl mt-1 tabular-nums">
            {projection.estCaloriesPerWeek.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  positive,
  tip,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  positive: boolean;
  tip: string;
}) {
  return (
    <div
      className="bg-bg-elevated border border-border rounded-lg p-3 group relative cursor-help"
      title={tip}
    >
      <div className="flex items-center gap-1.5 text-muted text-xs">
        {icon}
        {label}
      </div>
      <div
        className={`metric-value text-2xl mt-1 ${
          positive ? "metric-positive" : "metric-negative"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-bg-elevated border border-border rounded-lg p-3">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="tabular-nums text-white font-semibold">
          {value}/100
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-bg overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent to-accent-glow"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
