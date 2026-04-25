"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

type Trend = "up" | "down" | "flat";
type Metric = {
  label: string;
  today: number;
  forecast: number;
  unit: string;
  trend: Trend;
  tone: string;
};

const METRICS: Metric[] = [
  { label: "Strength", today: 62, forecast: 71, unit: "%", trend: "up", tone: "var(--accent)" },
  { label: "Endurance", today: 54, forecast: 60, unit: "%", trend: "up", tone: "var(--accent-cyan)" },
  { label: "Mobility", today: 48, forecast: 52, unit: "%", trend: "up", tone: "var(--success)" },
  { label: "Recovery", today: 71, forecast: 68, unit: "%", trend: "down", tone: "var(--warn)" },
  { label: "Consistency", today: 80, forecast: 84, unit: "%", trend: "up", tone: "var(--accent)" },
  { label: "Injury risk", today: 18, forecast: 29, unit: "%", trend: "up", tone: "var(--danger)" },
];

export function DashboardGrid() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
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
  }, []);

  return (
    <div ref={rootRef} className="mt-10 space-y-8">
      {/* metric grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {METRICS.map((m) => (
          <MetricCard key={m.label} m={m} />
        ))}
      </div>

      {/* AI coach block */}
      <div className="dash-fade glass rounded-2xl p-7">
        <div className="mb-4 flex items-center justify-between">
          <p className="eyebrow">Coach · Recommendation</p>
          <span className="font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
            LLM &middot; Doppel-1
          </span>
        </div>
        <p className="text-lg leading-relaxed text-[var(--fg)]">
          Knee instability detected on rep 6&ndash;8 of your squat set. Your
          14-day strength curve looks great, but injury risk is climbing
          alongside it.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--fg-dim)]">
          Try swapping two of your high-intensity sessions for mobility +
          eccentric tempo work. Forecast updates instantly in the simulator.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {["Reduce frequency", "Add mobility day", "Swap to tempo squat", "Re-test in 7 days"].map(
            (chip) => (
              <span
                key={chip}
                className="rounded-full border border-[var(--glass-border)] bg-[var(--surface)]/50 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-[var(--fg-dim)]"
              >
                {chip}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ m }: { m: Metric }) {
  const delta = m.forecast - m.today;
  const TrendIcon = m.trend === "up" ? ArrowUpRight : m.trend === "down" ? ArrowDownRight : Minus;
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
            <span className="font-mono text-xs text-[var(--fg-mute)]">{m.unit}</span>
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
        <Bar pct={todayPct} tone="var(--fg-mute)" label="Today" labelValue={`${m.today}${m.unit}`} />
        <Bar pct={pct} tone={m.tone} label="14d" labelValue={`${m.forecast}${m.unit}`} />
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
