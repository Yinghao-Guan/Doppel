"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Flame,
  Scale,
  Activity,
  Check,
} from "lucide-react";
import { generatePlan, CoachClientError } from "@/lib/coach-client";
import type {
  ModelForecast,
  ModelScores,
  ModelSignals,
  PlanCandidate,
  TargetMetric,
  TrainingFingerprint,
  UserProfile,
} from "@/lib/coach-types";

const PROFILE: UserProfile = {
  age: 28,
  height_cm: 178,
  weight_kg: 76,
  fitness_level: "intermediate",
  training_frequency_per_week: 3,
  sleep_hours: 7,
};

const FINGERPRINT: TrainingFingerprint = {
  exercise_type: "back_squat",
  rep_count: 8,
  range_of_motion_score: 82,
  tempo_consistency: 71,
  form_score: 76,
  stability_score: 80,
  asymmetry: 14,
  fatigue_trend: 0.18,
  injury_risk_signals: ["mild knee valgus on rep 6"],
  avg_depth_score: 82,
  knee_valgus_risk: 0.22,
};

const BASELINE_PLAN: PlanCandidate = {
  plan_name: "Baseline 3x/wk",
  philosophy: "Progressive Overload",
  sessions_per_week: 3,
  intensity: "moderate",
  exercise_mix: { strength: 0.6, cardio: 0.2, mobility: 0.2 },
  weekly_schedule: [],
  rationale: "Baseline progressive squat-focused plan honoring current fatigue.",
};

const STARTER_PLANS: PlanCandidate[] = [
  {
    plan_name: "Strength ramp 4x/wk",
    philosophy: "Progressive Overload",
    sessions_per_week: 4,
    intensity: "moderate-high",
    exercise_mix: { strength: 0.65, cardio: 0.15, mobility: 0.2 },
    weekly_schedule: [],
    rationale:
      "Preview card: one extra strength day while preserving mobility work and recovery spacing.",
  },
  {
    plan_name: "Hybrid engine split",
    philosophy: "Balanced Hybrid",
    sessions_per_week: 5,
    intensity: "moderate",
    exercise_mix: { strength: 0.4, cardio: 0.4, mobility: 0.2 },
    weekly_schedule: [],
    rationale:
      "Preview card: balances lifting and conditioning when you want fitness gains without aggressive loading.",
  },
  {
    plan_name: "Recovery-first rebuild",
    philosophy: "Controlled Intensity",
    sessions_per_week: 3,
    intensity: "low",
    exercise_mix: { strength: 0.35, cardio: 0.2, mobility: 0.45 },
    weekly_schedule: [],
    rationale:
      "Preview card: lower intensity with extra mobility when fatigue or asymmetry is becoming the limiter.",
  },
];

const BASELINE_FORECAST: ModelForecast = {
  scores: {
    readiness_score: 72.0,
    injury_risk_score: 22.0,
    strength_potential_score: 64.0,
    endurance_potential_score: 58.0,
  },
  signals: {
    form_quality: 76.0,
    depth_score: 82.0,
    tempo_consistency: 71.0,
    stability: 80.0,
    fatigue_trend: 18.0,
    asymmetry: 14.0,
    range_of_motion: 82.0,
    movement_quality: 74.0,
  },
  summary:
    "Movement quality is solid and readiness is in the green. Cleared for a strength-focused session.",
  explanations: [
    "Form quality and stability stayed high across the set, lifting strength potential.",
    "Mild fatigue trend caps readiness from going higher.",
    "Asymmetry stayed controlled, keeping injury risk modest.",
  ],
  recommendations: [
    "Cap working sets at RPE 8 to keep injury risk modest.",
    "Prioritize sleep and protein intake on training days.",
  ],
};

const INTENSITY_LEVELS = ["low", "moderate", "moderate-high", "high"] as const;
type IntensityLevel = (typeof INTENSITY_LEVELS)[number];

const GOAL_OPTIONS: { value: TargetMetric; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "endurance", label: "Endurance" },
  { value: "weight_loss", label: "Weight loss" },
  { value: "mobility", label: "Mobility" },
  { value: "general_fitness", label: "General fitness" },
];

const DEFAULT_CONSTRAINTS = ["no overhead pressing", "home gym only"];

type PhilosophyVisual = { icon: typeof Activity; tone: string };
function philosophyVisual(philosophy: string): PhilosophyVisual {
  const p = philosophy.toLowerCase();
  if (p.includes("progressive") || p.includes("overload")) {
    return { icon: TrendingUp, tone: "var(--accent-cyan)" };
  }
  if (p.includes("intensity")) return { icon: Flame, tone: "var(--danger)" };
  if (p.includes("balanced") || p.includes("hybrid")) {
    return { icon: Scale, tone: "var(--accent)" };
  }
  return { icon: Activity, tone: "var(--accent)" };
}

const SCORE_LABEL: Record<keyof ModelScores, string> = {
  readiness_score: "Readiness",
  injury_risk_score: "Injury risk",
  strength_potential_score: "Strength potential",
  endurance_potential_score: "Endurance potential",
};

const SCORE_DIRECTION: Record<keyof ModelScores, "up" | "down"> = {
  readiness_score: "up",
  injury_risk_score: "down",
  strength_potential_score: "up",
  endurance_potential_score: "up",
};

const SIGNAL_LABEL: Record<keyof ModelSignals, string> = {
  form_quality: "Form quality",
  depth_score: "Depth",
  tempo_consistency: "Tempo",
  stability: "Stability",
  fatigue_trend: "Fatigue",
  asymmetry: "Asymmetry",
  range_of_motion: "Range of motion",
  movement_quality: "Movement quality",
};

const SIGNAL_DIRECTION: Record<keyof ModelSignals, "up" | "down"> = {
  form_quality: "up",
  depth_score: "up",
  tempo_consistency: "up",
  stability: "up",
  fatigue_trend: "down",
  asymmetry: "down",
  range_of_motion: "up",
  movement_quality: "up",
};

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}
function r1(v: number): number {
  return Math.round(v * 10) / 10;
}

function modelAfterForecast(
  sessions: number,
  intensityIdx: number,
): ModelForecast {
  const dSessions = sessions - BASELINE_PLAN.sessions_per_week;
  const dIntensity = intensityIdx - 1;
  const b = BASELINE_FORECAST;

  const scores: ModelScores = {
    readiness_score: r1(
      clamp(b.scores.readiness_score - dSessions * 4 - dIntensity * 5),
    ),
    injury_risk_score: r1(
      clamp(b.scores.injury_risk_score + dSessions * 4 + dIntensity * 6),
    ),
    strength_potential_score: r1(
      clamp(b.scores.strength_potential_score + dSessions * 3 + dIntensity * 4),
    ),
    endurance_potential_score: r1(
      clamp(b.scores.endurance_potential_score + dSessions * 4 + dIntensity * 2),
    ),
  };

  const signals: ModelSignals = {
    form_quality: r1(clamp(b.signals.form_quality - dIntensity * 2)),
    depth_score: r1(clamp(b.signals.depth_score)),
    tempo_consistency: r1(clamp(b.signals.tempo_consistency - dIntensity * 1.5)),
    stability: r1(clamp(b.signals.stability - dIntensity * 1.5)),
    fatigue_trend: r1(
      clamp(b.signals.fatigue_trend + dSessions * 4 + dIntensity * 5),
    ),
    asymmetry: r1(clamp(b.signals.asymmetry + dIntensity * 1.5)),
    range_of_motion: r1(clamp(b.signals.range_of_motion - dIntensity * 1.0)),
    movement_quality: r1(
      clamp(b.signals.movement_quality - dSessions * 1 - dIntensity * 2),
    ),
  };

  return {
    scores,
    signals,
    summary: buildSummary(scores),
    explanations: buildExplanations(scores, signals, dSessions, dIntensity),
    recommendations: buildRecommendations(scores, dIntensity),
  };
}

function buildSummary(s: ModelScores): string {
  if (s.injury_risk_score >= 40) {
    return "Injury risk is climbing into the danger zone — workload may outstrip recovery.";
  }
  if (s.readiness_score >= 75 && s.strength_potential_score >= 65) {
    return "Movement quality looks strong and readiness is high. Cleared for a strength-focused session.";
  }
  if (s.readiness_score < 55) {
    return "Readiness is dipping — recovery debt is starting to limit gains.";
  }
  return "Outlook is balanced; strength and endurance both move with the schedule.";
}

function buildExplanations(
  s: ModelScores,
  sig: ModelSignals,
  dSessions: number,
  dIntensity: number,
): string[] {
  const out: string[] = [];
  if (dSessions > 0) {
    out.push(
      `Adding ${dSessions} session(s) raises strength stimulus but compounds fatigue.`,
    );
  } else if (dSessions < 0) {
    out.push("Cutting sessions improves recovery but trims potential gains.");
  }
  if (dIntensity > 0) {
    out.push(
      `Higher intensity drops form quality (${sig.form_quality.toFixed(0)}) and lifts injury risk.`,
    );
  } else if (dIntensity < 0) {
    out.push("Lower intensity protects form and stability at the cost of stimulus.");
  }
  if (s.injury_risk_score >= 40) {
    out.push("Asymmetry and fatigue are stacking — recovery becomes the bottleneck.");
  }
  if (out.length === 0) out.push("No meaningful change versus baseline.");
  return out;
}

function buildRecommendations(s: ModelScores, dIntensity: number): string[] {
  const out: string[] = [];
  if (s.injury_risk_score >= 40) {
    out.push("Insert an extra recovery day before the next heavy session.");
  }
  if (dIntensity > 0) {
    out.push("Trim warm-up volume and emphasize tempo on top sets.");
  }
  if (s.strength_potential_score >= 75) {
    out.push("You are ready for progressive overload in the next strength session.");
  }
  if (out.length === 0) out.push("Hold the current load and reassess after the next session.");
  return out;
}

export function WhatIfPanel() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState(5);
  const [intensityIdx, setIntensityIdx] = useState(2);
  const [plans, setPlans] = useState<PlanCandidate[] | null>(null);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [goalMetric, setGoalMetric] = useState<TargetMetric>("strength");
  const [appliedPlanIdx, setAppliedPlanIdx] = useState<number | null>(null);

  const intensity = INTENSITY_LEVELS[intensityIdx];
  const after = useMemo(
    () => modelAfterForecast(sessions, intensityIdx),
    [sessions, intensityIdx],
  );
  const showingPreview = !plansLoading && !plansError && plans === null;
  const displayPlans = plans ?? STARTER_PLANS;

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".wi-fade",
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

  async function handleGeneratePlans() {
    setPlansLoading(true);
    setPlansError(null);
    setPlans(null);
    setAppliedPlanIdx(null);
    try {
      const res = await generatePlan({
        profile: PROFILE,
        fingerprint: FINGERPRINT,
        goal: {
          target_metric: goalMetric,
          target_change_pct: 15,
          horizon_days: 14,
          constraints: DEFAULT_CONSTRAINTS,
        },
      });
      setPlans(res.plans);
    } catch (err) {
      const msg =
        err instanceof CoachClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unknown error.";
      setPlansError(msg);
    } finally {
      setPlansLoading(false);
    }
  }

  function applyPlan(plan: PlanCandidate, idx: number) {
    setSessions(plan.sessions_per_week);
    const i = INTENSITY_LEVELS.indexOf(plan.intensity as IntensityLevel);
    if (i >= 0) setIntensityIdx(i);
    setAppliedPlanIdx(idx);
  }

  return (
    <div ref={rootRef} className="mt-10 space-y-8">
      {/* plan suggestions */}
      <div className="wi-fade glass-strong rounded-2xl p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
              SUGGESTED PLANS
            </p>
            <h2 className="mt-1 font-display text-xl font-medium text-[var(--fg)]">
              Three coach-authored options
            </h2>
            <p className="mt-1 text-sm text-[var(--fg-dim)]">
              Generated from your profile + fingerprint. Tap
              <span className="mx-1 rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[11px] text-[var(--fg)]">
                GENERATE 3 PLANS
              </span>
              to replace the previews below with live model output.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.25em] text-[var(--fg-mute)]">
                GOAL
              </span>
              <select
                value={goalMetric}
                onChange={(e) =>
                  setGoalMetric(e.target.value as TargetMetric)
                }
                className="rounded-lg border border-[var(--glass-border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--fg)] outline-none focus:border-[var(--accent)]"
              >
                {GOAL_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={handleGeneratePlans}
              disabled={plansLoading}
              className="cta glass inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-mono tracking-[0.2em] transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                background: "var(--accent-cyan)",
                color: "#0a0a0a",
                boxShadow: "0 12px 36px -12px var(--accent-cyan)",
              }}
            >
              {plansLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  GENERATING…
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  GENERATE 3 PLANS
                </>
              )}
            </button>
          </div>
        </div>

        {plansError && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--fg-dim)]">
            <AlertTriangle
              size={16}
              className="mt-0.5 shrink-0 text-[var(--danger)]"
            />
            <p>{plansError}</p>
          </div>
        )}

        {showingPreview && (
          <div className="mt-5 rounded-xl border border-[var(--glass-border)] bg-[var(--surface)]/70 px-4 py-3 text-sm text-[var(--fg-dim)]">
            Preview cards are shown by default so this section stays visible.
            Generate to fetch model-authored plans.
          </div>
        )}

        {displayPlans.length > 0 && (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {displayPlans.map((p, i) => (
              <PlanCard
                key={i}
                plan={p}
                index={i}
                applied={!showingPreview && appliedPlanIdx === i}
                preview={showingPreview}
                onApply={showingPreview ? undefined : () => applyPlan(p, i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* sliders */}
      <div className="wi-fade glass grid gap-7 rounded-2xl p-7 md:grid-cols-2">
        <Slider
          label="Sessions per week"
          value={sessions}
          min={1}
          max={7}
          unit=""
          onChange={setSessions}
        />
        <StepSlider
          label="Intensity"
          value={intensityIdx}
          options={INTENSITY_LEVELS as unknown as string[]}
          onChange={setIntensityIdx}
        />
        <p className="md:col-span-2 text-xs leading-relaxed text-[var(--fg-mute)]">
          Baseline:&nbsp;
          <span className="text-[var(--fg-dim)]">
            {BASELINE_PLAN.sessions_per_week} sessions / week ·{" "}
            {BASELINE_PLAN.intensity}
          </span>
          . Score deltas come from a placeholder model that mirrors the io.md
          output schema; the real scores will arrive from
          <code className="mx-1 rounded bg-[var(--surface-2)] px-1 py-0.5 text-[10px] text-[var(--fg-dim)]">
            /api/forecast
          </code>
          .
        </p>
      </div>

      {/* before/after forecasts */}
      <div className="wi-fade grid gap-5 md:grid-cols-2">
        <ForecastCard
          title="Before"
          subtitle={`${BASELINE_PLAN.sessions_per_week} × / week · ${BASELINE_PLAN.intensity}`}
          forecast={BASELINE_FORECAST}
        />
        <ForecastCard
          title="After"
          subtitle={`${sessions} × / week · ${intensity}`}
          forecast={after}
          compareTo={BASELINE_FORECAST}
          accent
        />
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  index,
  applied,
  preview,
  onApply,
}: {
  plan: PlanCandidate;
  index: number;
  applied: boolean;
  preview: boolean;
  onApply?: () => void;
}) {
  const { icon: Icon, tone } = philosophyVisual(plan.philosophy);
  const mix = plan.exercise_mix;
  return (
    <div
      className="glass-strong relative flex flex-col rounded-2xl p-5 transition-all"
      style={
        applied
          ? {
              boxShadow: `inset 0 1px 0 0 var(--glass-highlight), 0 18px 50px -16px ${tone}`,
              borderColor: tone,
            }
          : undefined
      }
    >
      {applied && (
        <span
          className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full text-white"
          style={{ background: tone }}
        >
          <Check size={14} strokeWidth={3} />
        </span>
      )}
      <div
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ background: `${tone}22`, color: tone }}
      >
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
        OPTION {String.fromCharCode(65 + index)} · {plan.philosophy.toUpperCase()}
        {preview ? " · PREVIEW" : ""}
      </p>
      <h3 className="mt-1 font-display text-lg font-medium text-[var(--fg)]">
        {plan.plan_name}
      </h3>

      <div className="mt-4 flex items-center gap-4 text-sm">
        <div>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[var(--fg-mute)]">
            SESSIONS
          </p>
          <p className="mt-0.5 font-display text-xl text-[var(--fg)]">
            {plan.sessions_per_week}×
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[var(--fg-mute)]">
            INTENSITY
          </p>
          <p className="mt-0.5 font-display text-base capitalize text-[var(--fg)]">
            {plan.intensity}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="font-mono text-[10px] tracking-[0.25em] text-[var(--fg-mute)]">
          MIX
        </p>
        <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            style={{ width: `${mix.strength * 100}%`, background: "var(--accent)" }}
            title={`Strength ${Math.round(mix.strength * 100)}%`}
          />
          <div
            style={{ width: `${mix.cardio * 100}%`, background: "var(--accent-cyan)" }}
            title={`Cardio ${Math.round(mix.cardio * 100)}%`}
          />
          <div
            style={{ width: `${mix.mobility * 100}%`, background: "var(--success)" }}
            title={`Mobility ${Math.round(mix.mobility * 100)}%`}
          />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10px] text-[var(--fg-mute)]">
          <span>S {Math.round(mix.strength * 100)}%</span>
          <span>C {Math.round(mix.cardio * 100)}%</span>
          <span>M {Math.round(mix.mobility * 100)}%</span>
        </div>
      </div>

      <p className="mt-4 flex-1 text-xs leading-relaxed text-[var(--fg-dim)]">
        {plan.rationale}
      </p>

      {preview ? (
        <div className="mt-5 rounded-lg border border-dashed border-[var(--glass-border)] bg-[var(--surface)]/55 px-3 py-2 text-center font-mono text-[10px] tracking-[0.22em] text-[var(--fg-mute)]">
          GENERATE TO LOAD LIVE PLAN
        </div>
      ) : (
        <button
          onClick={onApply}
          className="mt-5 w-full rounded-lg border border-[var(--glass-border)] bg-[var(--surface-2)] py-2 font-mono text-[10px] tracking-[0.25em] text-[var(--fg-dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--fg)]"
        >
          {applied ? "APPLIED ✓" : "USE THIS PLAN"}
        </button>
      )}
    </div>
  );
}

function ForecastCard({
  title,
  subtitle,
  forecast,
  compareTo,
  accent,
}: {
  title: string;
  subtitle: string;
  forecast: ModelForecast;
  compareTo?: ModelForecast;
  accent?: boolean;
}) {
  return (
    <div
      className="glass rounded-2xl p-6"
      style={
        accent
          ? {
              boxShadow:
                "inset 0 1px 0 0 var(--glass-highlight), 0 18px 50px -16px var(--accent-cyan)",
            }
          : undefined
      }
    >
      <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
        {title.toUpperCase()}
      </p>
      <p className="mt-1 font-display text-lg text-[var(--fg)]">{subtitle}</p>

      <div className="mt-5 space-y-3">
        {(Object.keys(SCORE_LABEL) as (keyof ModelScores)[]).map((k) => (
          <ScoreRow
            key={k}
            label={SCORE_LABEL[k]}
            value={forecast.scores[k]}
            base={compareTo?.scores[k]}
            direction={SCORE_DIRECTION[k]}
            emphasized
          />
        ))}
      </div>

      <details className="mt-5 group">
        <summary className="cursor-pointer font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)] hover:text-[var(--fg-dim)]">
          SIGNALS
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2">
          {(Object.keys(SIGNAL_LABEL) as (keyof ModelSignals)[]).map((k) => (
            <ScoreRow
              key={k}
              label={SIGNAL_LABEL[k]}
              value={forecast.signals[k]}
              base={compareTo?.signals[k]}
              direction={SIGNAL_DIRECTION[k]}
            />
          ))}
        </div>
      </details>

      <div className="mt-5 border-t border-[var(--glass-border)] pt-4">
        <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
          MODEL SUMMARY
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--fg-dim)]">
          {forecast.summary}
        </p>
        {forecast.recommendations.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {forecast.recommendations.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-[var(--fg-dim)]"
              >
                <Lightbulb
                  size={12}
                  className="mt-0.5 shrink-0 text-[var(--accent-cyan)]"
                />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ScoreRow({
  label,
  value,
  base,
  direction,
  emphasized,
}: {
  label: string;
  value: number;
  base?: number;
  direction: "up" | "down";
  emphasized?: boolean;
}) {
  const delta = base !== undefined ? value - base : undefined;
  const goodDir = direction === "up" ? 1 : -1;
  const positive = delta === undefined ? null : delta * goodDir > 0;
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-[var(--fg-mute)]">{label}</span>
      <span className="flex items-baseline gap-2">
        <span
          className={
            emphasized
              ? "font-mono text-[var(--fg)]"
              : "font-mono text-xs text-[var(--fg-dim)]"
          }
        >
          {value.toFixed(1)}
        </span>
        {delta !== undefined && Math.abs(delta) > 0.05 && (
          <span
            className="font-mono text-xs"
            style={{
              color:
                positive === null
                  ? "var(--fg-mute)"
                  : positive
                    ? "var(--success)"
                    : "var(--danger)",
            }}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}
          </span>
        )}
      </span>
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

function StepSlider({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: string[];
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-mono text-[10px] tracking-[0.25em] text-[var(--fg-mute)]">
          {label.toUpperCase()}
        </span>
        <span className="font-display text-2xl font-medium capitalize text-[var(--fg)]">
          {options[value]}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={options.length - 1}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="doppel-slider w-full"
      />
      <div className="mt-2 flex justify-between font-mono text-[10px] text-[var(--fg-mute)]">
        {options.map((o) => (
          <span key={o}>{o}</span>
        ))}
      </div>
    </div>
  );
}
