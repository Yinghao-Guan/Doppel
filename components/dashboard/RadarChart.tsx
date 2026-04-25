"use client";

/**
 * PERSON 3 — radar chart showing the projection across all dimensions.
 */

import {
  Radar,
  RadarChart as ReRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { useAthleteStore } from "@/lib/store/useAthleteStore";

export function RadarChart() {
  const projection = useAthleteStore((s) => s.projection);

  const data = projection
    ? [
        { axis: "Strength", value: clamp(projection.strengthDeltaPct * 5, 0, 100) },
        { axis: "Endurance", value: clamp(projection.enduranceDeltaPct * 5, 0, 100) },
        { axis: "Mobility", value: clamp(projection.mobilityDeltaPct * 8, 0, 100) },
        { axis: "Recovery", value: projection.recoveryScore },
        { axis: "Consistency", value: projection.consistencyScore },
        { axis: "Safety", value: clamp(100 - projection.injuryRiskDeltaPct * 3, 0, 100) },
      ]
    : [];

  return (
    <div className="card h-72">
      <h2 className="h-section text-white mb-3">Performance Radar</h2>
      {projection ? (
        <ResponsiveContainer width="100%" height="90%">
          <ReRadarChart data={data}>
            <PolarGrid stroke="#2a2d3a" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "#6b7280", fontSize: 9 }}
              stroke="#2a2d3a"
            />
            <Radar
              dataKey="value"
              stroke="#7c5cff"
              fill="#7c5cff"
              fillOpacity={0.35}
              strokeWidth={2}
            />
          </ReRadarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-muted">Run a set to see your radar.</p>
      )}
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
