"use client";

/**
 * PERSON 4 — 14-day growth-curve chart for the three plans.
 */

import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { useMemo } from "react";
import { useAthleteStore } from "@/lib/store/useAthleteStore";
import { comparePlans } from "@/lib/prediction/engine";

export function GrowthCurve() {
  const profile = useAthleteStore((s) => s.profile);
  const fp = useAthleteStore((s) => s.fingerprint);

  const data = useMemo(() => {
    if (!profile || !fp) return [];
    return comparePlans(profile, fp).curves;
  }, [profile, fp]);

  return (
    <div className="card h-72">
      <h2 className="h-section text-white mb-3">14-Day Strength Curve</h2>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
            <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 11 }} stroke="#2a2d3a" />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} stroke="#2a2d3a" />
            <Tooltip
              contentStyle={{
                background: "#11121a",
                border: "1px solid #2a2d3a",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="planA" stroke="#34d399" strokeWidth={2} dot={false} name="Plan A · Cardio" />
            <Line type="monotone" dataKey="planB" stroke="#7c5cff" strokeWidth={2.5} dot={false} name="Plan B · Mixed" />
            <Line type="monotone" dataKey="planC" stroke="#fbbf24" strokeWidth={2} dot={false} name="Plan C · HIIT" />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-muted">Run a set to see growth curves.</p>
      )}
    </div>
  );
}
