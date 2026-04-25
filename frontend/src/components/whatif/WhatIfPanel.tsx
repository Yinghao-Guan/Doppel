"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Sparkles, Loader2, AlertTriangle, Lightbulb } from "lucide-react";
import { whatIf, CoachClientError } from "@/lib/coach-client";
import type {
  ModelForecast,
  ModelScores,
  ModelSignals,
  PlanCandidate,
  TrainingFingerprint,
  UserProfile,
  WhatIfResult,
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

function buildChangeDescription(
  sessions: number,
  intensity: IntensityLevel,
): string {
  const parts: string[] = [];
  if (sessions !== BASELINE_PLAN.sessions_per_week) {
    parts.push(
      `Move from ${BASELINE_PLAN.sessions_per_week} to ${sessions} sessions per week`,
    );
  }
  if (intensity !== BASELINE_PLAN.intensity) {
    parts.push(`shift intensity from ${BASELINE_PLAN.intensity} to ${intensity}`);
  }
  return parts.length === 0
    ? "Keep the current plan unchanged."
    : parts.join(" and ") + ".";
}

export function WhatIfPanel() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState(5);
  const [intensityIdx, setIntensityIdx] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WhatIfResult | null>(null);

  const intensity = INTENSITY_LEVELS[intensityIdx];
  const after = useMemo(
    () => modelAfterForecast(sessions, intensityIdx),
    [sessions, intensityIdx],
  );
  const changeDescription = useMemo(
    () => buildChangeDescription(sessions, intensity),
    [sessions, intensity],
  );

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".wi-fade", {
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

  async function handleAsk() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await whatIf({
        profile: PROFILE,
        fingerprint: FINGERPRINT,
        current_plan: BASELINE_PLAN,
        before_predictions: BASELINE_FORECAST,
        after_predictions: after,
        change_description: changeDescription,
      });
      setResult(res.result);
    } catch (err) {
      const msg =
        err instanceof CoachClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unknown error.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={rootRef} className="mt-10 space-y-8">
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
          . The coach narrative below is live from
          <code className="mx-1 rounded bg-[var(--surface-2)] px-1 py-0.5 text-[10px] text-[var(--fg-dim)]">
            /api/coach/what-if
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

      {/* change description + ask button */}
      <div className="wi-fade glass rounded-2xl p-7">
        <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
          CHANGE
        </p>
        <p className="mt-3 text-base text-[var(--fg)]">{changeDescription}</p>
        <button
          onClick={handleAsk}
          disabled={loading}
          className="cta glass mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-mono tracking-[0.2em] text-[var(--fg)] transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            background: "var(--accent)",
            color: "#fff",
            boxShadow: "0 12px 36px -12px var(--accent)",
          }}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              ASKING THE COACH…
            </>
          ) : (
            <>
              <Sparkles size={14} />
              ASK THE COACH
            </>
          )}
        </button>
      </div>

      {/* error */}
      {error && (
        <div className="wi-fade glass flex items-start gap-3 rounded-2xl p-5 text-sm text-[var(--fg-dim)]">
          <AlertTriangle
            size={16}
            className="mt-0.5 shrink-0 text-[var(--danger)]"
          />
          <div>
            <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--danger)]">
              ERROR
            </p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* coach response */}
      {result && (
        <div className="wi-fade space-y-5">
          {Object.keys(result.parameter_changes).length > 0 && (
            <div className="glass rounded-2xl p-6">
              <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
                PARAMETER CHANGES
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(result.parameter_changes).map(([k, v]) => (
                  <span
                    key={k}
                    className="rounded-md border border-[var(--glass-border)] bg-[var(--surface-2)] px-3 py-1.5 font-mono text-xs text-[var(--fg-dim)]"
                  >
                    <span className="text-[var(--fg-mute)]">{k}:</span>{" "}
                    <span className="text-[var(--fg)]">{v}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="glass rounded-2xl p-6">
            <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
              INTERPRETATION
            </p>
            <p className="mt-3 text-base leading-relaxed text-[var(--fg-dim)]">
              {result.interpretation}
            </p>
          </div>

          <div
            className="glass rounded-2xl p-6"
            style={{
              boxShadow:
                "inset 0 1px 0 0 var(--glass-highlight), 0 18px 50px -16px var(--accent)",
            }}
          >
            <p className="font-mono text-[10px] tracking-[0.3em] text-[var(--accent)]">
              KEY INSIGHT
            </p>
            <p className="mt-3 font-display text-xl font-medium leading-snug text-[var(--fg)]">
              {result.key_insight}
            </p>
          </div>
        </div>
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
