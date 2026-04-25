"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Activity, Flame, Zap, Check } from "lucide-react";

type Plan = {
  id: string;
  label: string;
  blurb: string;
  icon: typeof Activity;
  tone: string;
  outcomes: { label: string; delta: number; unit: string }[];
};

const PLANS: Plan[] = [
  {
    id: "A",
    label: "Cardio-heavy",
    blurb: "5x zone-2 + 1 long ride. Low joint load, slow strength gain.",
    icon: Activity,
    tone: "var(--accent-cyan)",
    outcomes: [
      { label: "Strength", delta: 4, unit: "%" },
      { label: "Endurance", delta: 12, unit: "%" },
      { label: "Injury risk", delta: -6, unit: "%" },
    ],
  },
  {
    id: "B",
    label: "Mixed training",
    blurb: "3x lift + 2x conditioning + 1 mobility. Balanced.",
    icon: Zap,
    tone: "var(--accent)",
    outcomes: [
      { label: "Strength", delta: 9, unit: "%" },
      { label: "Endurance", delta: 7, unit: "%" },
      { label: "Injury risk", delta: -2, unit: "%" },
    ],
  },
  {
    id: "C",
    label: "HIIT focus",
    blurb: "5x intervals + 1 lift. Fastest gains, highest risk.",
    icon: Flame,
    tone: "var(--danger)",
    outcomes: [
      { label: "Strength", delta: 11, unit: "%" },
      { label: "Endurance", delta: 9, unit: "%" },
      { label: "Injury risk", delta: 11, unit: "%" },
    ],
  },
];

export function SimulatePanel() {
  const [selected, setSelected] = useState<string>("B");
  const [frequency, setFrequency] = useState(4);
  const [intensity, setIntensity] = useState(60);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".sim-fade", {
        opacity: 0,
        y: 18,
        filter: "blur(6px)",
        stagger: 0.06,
        duration: 0.7,
        ease: "power3.out",
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="mt-10 space-y-8">
      {/* plan cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {PLANS.map((p) => {
          const active = selected === p.id;
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`sim-fade glass relative rounded-2xl p-6 text-left transition-all ${
                active
                  ? "ring-1 ring-[var(--accent)]"
                  : "opacity-70 hover:opacity-100"
              }`}
              style={
                active
                  ? {
                      boxShadow: `inset 0 1px 0 0 var(--glass-highlight), 0 18px 50px -16px ${p.tone}`,
                    }
                  : undefined
              }
            >
              {active && (
                <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ background: `${p.tone}22`, color: p.tone }}
              >
                <Icon size={18} strokeWidth={1.8} />
              </div>
              <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
                PLAN {p.id}
              </p>
              <h3 className="font-display text-xl font-medium text-[var(--fg)]">
                {p.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--fg-dim)]">
                {p.blurb}
              </p>

              <div className="mt-5 space-y-2">
                {p.outcomes.map((o) => {
                  const positive =
                    o.label === "Injury risk" ? o.delta < 0 : o.delta > 0;
                  return (
                    <div
                      key={o.label}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-[var(--fg-mute)]">{o.label}</span>
                      <span
                        className="font-mono"
                        style={{
                          color: positive
                            ? "var(--success)"
                            : "var(--danger)",
                        }}
                      >
                        {o.delta > 0 ? "+" : ""}
                        {o.delta}
                        {o.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      {/* sliders */}
      <div className="sim-fade glass grid gap-6 rounded-2xl p-7 md:grid-cols-2">
        <Slider
          label="Sessions per week"
          value={frequency}
          min={1}
          max={7}
          unit=""
          onChange={setFrequency}
        />
        <Slider
          label="Avg intensity"
          value={intensity}
          min={20}
          max={100}
          unit="%"
          onChange={setIntensity}
        />
        <p className="md:col-span-2 text-xs leading-relaxed text-[var(--fg-mute)]">
          Move the sliders &mdash; the forecast endpoint will re-run XGBoost +
          rule-based adaptation logic and stream new outcomes back. Wired in
          once the ML team ships
          <code className="mx-1 rounded bg-[var(--surface-2)] px-1 py-0.5 text-[10px] text-[var(--fg-dim)]">
            /api/forecast
          </code>
          .
        </p>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-mono text-[10px] tracking-[0.25em] text-[var(--fg-mute)]">
          {label.toUpperCase()}
        </span>
        <span className="font-display text-2xl font-medium text-[var(--fg)]">
          {value}
          <span className="ml-0.5 text-xs text-[var(--fg-mute)]">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="doppel-slider w-full"
      />
    </div>
  );
}
