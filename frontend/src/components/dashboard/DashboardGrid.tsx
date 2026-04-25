"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowUpRight, ArrowDownRight, Minus, Pencil, Loader2 } from "lucide-react";
import { useProfile } from "@/lib/profile-store";
import { useCaptureSignals } from "@/lib/capture-signals";
import { predict } from "@/lib/predict";
import type { PredictOutput, ProfileFields } from "@/types/predict";
import { ProfileDrawer } from "@/components/readiness/ProfileDrawer";

type Trend = "up" | "down" | "flat";
type Metric = {
  label: string;
  today: number;
  forecast: number;
  unit: string;
  trend: Trend;
  tone: string;
};

function buildMetrics(today: PredictOutput, forecast: PredictOutput): Metric[] {
  function metric(
    label: string,
    todayVal: number,
    forecastVal: number,
    tone: string,
  ): Metric {
    const delta = forecastVal - todayVal;
    const trend: Trend = delta > 0.5 ? "up" : delta < -0.5 ? "down" : "flat";
    return {
      label,
      today: Math.round(todayVal),
      forecast: Math.round(forecastVal),
      unit: "%",
      trend,
      tone,
    };
  }

  return [
    metric("Strength", today.scores.strength_potential_score, forecast.scores.strength_potential_score, "var(--accent)"),
    metric("Endurance", today.scores.endurance_potential_score, forecast.scores.endurance_potential_score, "var(--accent-cyan)"),
    metric("Mobility", today.signals.range_of_motion, forecast.signals.range_of_motion, "var(--success)"),
    metric("Recovery", today.scores.readiness_score, forecast.scores.readiness_score, "var(--warn)"),
    metric("Consistency", today.signals.tempo_consistency, forecast.signals.tempo_consistency, "var(--accent)"),
    metric("Injury risk", today.scores.injury_risk_score, forecast.scores.injury_risk_score, "var(--danger)"),
  ];
}

export function DashboardGrid() {
  const { profile, isComplete, hydrated } = useProfile();
  const cv = useCaptureSignals();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [metrics, setMetrics] = useState<Metric[] | null>(null);
  const [summary, setSummary] = useState("");
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hydrated || !isComplete) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const raw = { ...(profile as ProfileFields), ...cv };
    // 14d projection: simulate modest improvement after consistent training
    const raw14d = {
      ...raw,
      avg_form_score: Math.min(1, cv.avg_form_score + 0.05),
      stability_score: Math.min(1, cv.stability_score + 0.05),
      fatigue_slope: Math.max(0, cv.fatigue_slope - 0.05),
      rep_count: cv.rep_count + 1,
    };

    Promise.all([predict(raw), predict(raw14d)])
      .then(([todayRes, forecastRes]) => {
        if (cancelled) return;
        setMetrics(buildMetrics(todayRes, forecastRes));
        setSummary(todayRes.summary);
        setRecommendations(todayRes.recommendations);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to run forecast.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, isComplete, profile, cv]);

  useEffect(() => {
    if (!metrics || !rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".dash-fade", {
        opacity: 0,
        y: 18,
        filter: "blur(6px)",
        stagger: 0.05,
        duration: 0.7,
        ease: "power3.out",
      });
      gsap.from(".bar-fill", {
        scaleX: 0,
        transformOrigin: "left center",
        stagger: 0.06,
        duration: 0.9,
        ease: "power3.out",
        delay: 0.15,
      });
    }, rootRef);
    return () => ctx.revert();
  }, [metrics]);

  if (!hydrated) return null;

  if (!isComplete) {
    return (
      <div className="mt-10">
        <div className="glass flex flex-col items-center gap-4 rounded-2xl p-12 text-center">
          <p className="eyebrow">Awaiting profile</p>
          <h2 className="font-display text-2xl text-[var(--fg)]">
            Set your profile to see your 14-day forecast.
          </h2>
          <p className="max-w-md text-sm text-[var(--fg-dim)]">
            Seven quick fields and the model will project your training
            trajectory.
          </p>
          <button
            onClick={() => setDrawerOpen(true)}
            className="cta cta-primary mt-2"
          >
            Set profile
          </button>
        </div>
        <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-10 glass flex items-center justify-center gap-3 rounded-2xl py-20">
        <Loader2
          size={18}
          className="animate-spin text-[var(--accent-cyan)]"
          strokeWidth={2.2}
        />
        <span className="font-mono text-xs tracking-[0.3em] text-[var(--fg-dim)]">
          RUNNING FORECAST…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-10 glass rounded-2xl border border-[var(--danger)]/30 p-6 text-sm text-[var(--fg-dim)]">
        <p className="eyebrow mb-2">Forecast error</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div ref={rootRef} className="mt-10 space-y-8">
      <div className="flex justify-end">
        <button
          onClick={() => setDrawerOpen(true)}
          className="cta glass cta-ghost text-xs font-mono tracking-[0.2em] py-2 px-4"
        >
          <Pencil size={12} />
          EDIT PROFILE
        </button>
      </div>

      {/* metric grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <MetricCard key={m.label} m={m} />
        ))}
      </div>

      {/* coach block */}
      <div className="dash-fade glass rounded-2xl p-7">
        <div className="mb-4 flex items-center justify-between">
          <p className="eyebrow">Coach · Recommendation</p>
          <span className="font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
            MODEL &middot; DOPPEL
          </span>
        </div>
        <p className="text-lg leading-relaxed text-[var(--fg)]">{summary}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {recommendations.map((r) => (
            <span
              key={r}
              className="rounded-full border border-[var(--glass-border)] bg-[var(--surface)]/50 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-[var(--fg-dim)]"
            >
              {r}
            </span>
          ))}
        </div>
      </div>

      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

function MetricCard({ m }: { m: Metric }) {
  const delta = m.forecast - m.today;
  const TrendIcon =
    m.trend === "up"
      ? ArrowUpRight
      : m.trend === "down"
        ? ArrowDownRight
        : Minus;
  const trendColor =
    m.label === "Injury risk"
      ? m.trend === "up"
        ? "var(--danger)"
        : "var(--success)"
      : m.trend === "up"
        ? "var(--success)"
        : m.trend === "down"
          ? "var(--warn)"
          : "var(--fg-mute)";

  const pct = Math.min(100, Math.max(0, m.forecast));
  const todayPct = Math.min(100, Math.max(0, m.today));

  return (
    <div className="dash-fade glass rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[var(--fg-mute)]">
            {m.label.toUpperCase()}
          </p>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-medium text-[var(--fg)]">
              {m.forecast}
            </span>
            <span className="font-mono text-xs text-[var(--fg-mute)]">
              {m.unit}
            </span>
          </div>
        </div>
        <div
          className="flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px]"
          style={{ color: trendColor, background: "rgba(255,255,255,0.04)" }}
        >
          <TrendIcon size={12} strokeWidth={2.4} />
          {delta > 0 ? `+${delta}` : delta}
        </div>
      </div>

      {/* dual bar: today vs forecast */}
      <div className="mt-5 space-y-2">
        <Bar
          pct={todayPct}
          tone="var(--fg-mute)"
          label="Today"
          labelValue={`${m.today}${m.unit}`}
        />
        <Bar
          pct={pct}
          tone={m.tone}
          label="14d"
          labelValue={`${m.forecast}${m.unit}`}
        />
      </div>
    </div>
  );
}

function Bar({
  pct,
  tone,
  label,
  labelValue,
}: {
  pct: number;
  tone: string;
  label: string;
  labelValue: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between font-mono text-[10px] text-[var(--fg-mute)]">
        <span>{label}</span>
        <span>{labelValue}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="bar-fill h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: tone,
            boxShadow: `0 0 12px ${tone}`,
          }}
        />
      </div>
    </div>
  );
}
