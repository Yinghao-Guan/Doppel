"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Activity, Flame, Zap, Check } from "lucide-react";
import type { PredictScores } from "@/types/predict";
import { ScoreQuadrant } from "@/components/readiness/ScoreQuadrant";

type PlanDelta = {
  strength: number;
  endurance: number;
  injury: number;
};

type PlanDef = {
  id: string;
  label: string;
  blurb: string;
  icon: typeof Activity;
  tone: string;
  delta: PlanDelta;
};

const PLANS: PlanDef[] = [
  {
    id: "A",
    label: "Cardio-heavy",
    blurb: "5x zone-2 + 1 long ride. Low joint load, slow strength gain.",
    icon: Activity,
    tone: "var(--accent-cyan)",
    delta: { strength: 4, endurance: 12, injury: -6 },
  },
  {
    id: "B",
    label: "Mixed training",
    blurb: "3x lift + 2x conditioning + 1 mobility. Balanced.",
    icon: Zap,
    tone: "var(--accent)",
    delta: { strength: 9, endurance: 7, injury: -2 },
  },
  {
    id: "C",
    label: "HIIT focus",
    blurb: "5x intervals + 1 lift. Fastest gains, highest risk.",
    icon: Flame,
    tone: "var(--danger)",
    delta: { strength: 11, endurance: 9, injury: 11 },
  },
];

const clamp = (v: number) => Math.max(0, Math.min(100, v));

function simulate(
  baseline: PredictScores,
  plan: PlanDef,
  frequency: number,
  intensity: number,
): PredictScores {
  const mult = (frequency / 4) * (intensity / 60);
  const dStr = plan.delta.strength * mult;
  const dEnd = plan.delta.endurance * mult;
  const dInj = plan.delta.injury * mult;
  // Readiness moves with gains and against injury risk.
  const dReady = (dStr + dEnd) / 2 - dInj / 2;
  return {
    strength_potential_score: clamp(baseline.strength_potential_score + dStr),
    endurance_potential_score: clamp(baseline.endurance_potential_score + dEnd),
    injury_risk_score: clamp(baseline.injury_risk_score + dInj),
    readiness_score: clamp(baseline.readiness_score + dReady),
  };
}

export function SimulatePanel({ baseline }: { baseline: PredictScores }) {
  const [selected, setSelected] = useState<string>("B");
  const [frequency, setFrequency] = useState(4);
  const [intensity, setIntensity] = useState(60);
  const rootRef = useRef<HTMLDivElement>(null);

  const plan = useMemo(
    () => PLANS.find((p) => p.id === selected) ?? PLANS[1],
    [selected],
  );

  const simulated = useMemo(
    () => simulate(baseline, plan, frequency, intensity),
    [baseline, plan, frequency, intensity],
  );

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".sim-fade",
        { opacity: 0, y: 18, filter: "blur(6px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          stagger: 0.06,
          duration: 0.7,
          ease: "power3.out",
          clearProps: "filter,transform,opacity",
        },
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="space-y-6">
      <div className="sim-fade">
        {/* Same component used by Now — just fed simulated scores. */}
        <ScoreQuadrant key={`${plan.id}-${frequency}-${intensity}`} scores={simulated} />
      </div>

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
          Move the sliders &mdash; the same scoring chart from Now re-renders
          with the projected outcome.
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
