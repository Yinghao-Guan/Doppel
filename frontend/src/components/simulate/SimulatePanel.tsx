"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Activity, Flame, Loader2, Zap, Check } from "lucide-react";
import { useProfile } from "@/lib/profile-store";
import { useCaptureSignals } from "@/lib/capture-signals";
import { predict } from "@/lib/predict";
import type { PredictOutput, ProfileFields } from "@/types/predict";
import { ProfileDrawer } from "@/components/readiness/ProfileDrawer";

type PlanDef = {
  id: string;
  label: string;
  blurb: string;
  icon: typeof Activity;
  tone: string;
  workoutType: string;
};

const PLANS: PlanDef[] = [
  {
    id: "A",
    label: "Cardio-heavy",
    blurb: "5x zone-2 + 1 long ride. Low joint load, slow strength gain.",
    icon: Activity,
    tone: "var(--accent-cyan)",
    workoutType: "Cardio",
  },
  {
    id: "B",
    label: "Mixed training",
    blurb: "3x lift + 2x conditioning + 1 mobility. Balanced.",
    icon: Zap,
    tone: "var(--accent)",
    workoutType: "Strength",
  },
  {
    id: "C",
    label: "HIIT focus",
    blurb: "5x intervals + 1 lift. Fastest gains, highest risk.",
    icon: Flame,
    tone: "var(--danger)",
    workoutType: "HIIT",
  },
];

type OutcomeMetric = { label: string; delta: number; unit: string };
type PlanOutcomes = Record<string, OutcomeMetric[]>;

function buildOutcomes(
  baseline: PredictOutput,
  simulated: PredictOutput,
): OutcomeMetric[] {
  const d = (a: number, b: number) => Math.round(b - a);
  return [
    {
      label: "Strength",
      delta: d(
        baseline.scores.strength_potential_score,
        simulated.scores.strength_potential_score,
      ),
      unit: "%",
    },
    {
      label: "Endurance",
      delta: d(
        baseline.scores.endurance_potential_score,
        simulated.scores.endurance_potential_score,
      ),
      unit: "%",
    },
    {
      label: "Recovery",
      delta: d(
        baseline.scores.readiness_score,
        simulated.scores.readiness_score,
      ),
      unit: "%",
    },
    {
      label: "Injury risk",
      delta: d(
        baseline.scores.injury_risk_score,
        simulated.scores.injury_risk_score,
      ),
      unit: "%",
    },
  ];
}

export function SimulatePanel() {
  const { profile, isComplete, hydrated } = useProfile();
  const cv = useCaptureSignals();
  const [selected, setSelected] = useState<string>("B");
  const [frequency, setFrequency] = useState(4);
  const [intensity, setIntensity] = useState(60);
  const [planOutcomes, setPlanOutcomes] = useState<PlanOutcomes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSimulation = useCallback(() => {
    if (!isComplete || !hydrated) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setError(null);

      const baseInput = { ...(profile as ProfileFields), ...cv };

      // baseline: current profile unchanged
      // each plan: swap workout type, apply slider-driven adjustments
      const simInputs = PLANS.map((p) => ({
        ...baseInput,
        Workout_Type: p.workoutType,
        Workout_Frequency: frequency,
        fatigue_slope: Math.min(0.8, (intensity / 100) * 0.5),
        Avg_BPM: Math.round(80 + intensity),
        avg_form_score: Math.max(
          0.3,
          cv.avg_form_score - (intensity - 50) / 200,
        ),
      }));

      Promise.all([predict(baseInput), ...simInputs.map(predict)])
        .then(([baseline, ...sims]) => {
          const outcomes: PlanOutcomes = {};
          PLANS.forEach((p, i) => {
            outcomes[p.id] = buildOutcomes(baseline, sims[i]);
          });
          setPlanOutcomes(outcomes);
          setLoading(false);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Simulation failed.");
          setLoading(false);
        });
    }, 400);
  }, [isComplete, hydrated, profile, cv, frequency, intensity]);

  useEffect(() => {
    runSimulation();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [runSimulation]);

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

  if (!hydrated) return null;

  if (!isComplete) {
    return (
      <div className="mt-10">
        <div className="glass flex flex-col items-center gap-4 rounded-2xl p-12 text-center">
          <p className="eyebrow">Awaiting profile</p>
          <h2 className="font-display text-2xl text-[var(--fg)]">
            Set your profile to run simulations.
          </h2>
          <p className="max-w-md text-sm text-[var(--fg-dim)]">
            The what-if engine needs your baseline to compare against.
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

  return (
    <div ref={rootRef} className="mt-10 space-y-8">
      {/* plan cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {PLANS.map((p) => {
          const active = selected === p.id;
          const Icon = p.icon;
          const outcomes = planOutcomes?.[p.id];
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

              <div className="mt-5 space-y-2 min-h-[80px]">
                {loading ? (
                  <div className="flex items-center gap-2 text-xs text-[var(--fg-mute)]">
                    <Loader2 size={12} className="animate-spin" strokeWidth={2} />
                    <span className="font-mono tracking-widest">COMPUTING…</span>
                  </div>
                ) : error ? (
                  <p className="text-xs text-[var(--danger)]">{error}</p>
                ) : (outcomes ?? []).map((o) => {
                    const positive =
                      o.label === "Injury risk" ? o.delta < 0 : o.delta > 0;
                    const neutral = o.delta === 0;
                    return (
                      <div
                        key={o.label}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-[var(--fg-mute)]">{o.label}</span>
                        <span
                          className="font-mono"
                          style={{
                            color: neutral
                              ? "var(--fg-mute)"
                              : positive
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
      </div>

      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
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
