"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Loader2 } from "lucide-react";
import { useAthleteStore } from "@/lib/athlete-store";
import { useProfile } from "@/lib/profile-store";
import { useCaptureSignals } from "@/lib/capture-signals";
import { predict } from "@/lib/predict";
import type { PredictOutput, ProfileFields } from "@/types/predict";
import { PoseCamera } from "./PoseCamera";

const SIGNAL_DEFS = [
  {
    key: "totalReps" as const,
    label: "REPS",
    unit: "reps",
    tone: "var(--accent)",
    fmt: (v: number) => String(v),
  },
  {
    key: "avgFormScore" as const,
    label: "FORM SCORE",
    unit: "%",
    tone: "var(--success)",
    fmt: (v: number) => String(Math.round(v * 100)),
  },
  {
    key: "tempoConsistency" as const,
    label: "TEMPO",
    unit: "%",
    tone: "var(--accent-cyan)",
    fmt: (v: number) => String(Math.round(v * 100)),
  },
  {
    key: "avgRangeOfMotion" as const,
    label: "RANGE OF MOTION",
    unit: "%",
    tone: "var(--accent)",
    fmt: (v: number) => String(Math.round(v * 100)),
  },
  {
    key: "fatigueTrend" as const,
    label: "FATIGUE",
    unit: "",
    tone: "var(--warn)",
    fmt: (v: number) => (v > 0.05 ? "improving" : v < -0.05 ? "declining" : "stable"),
  },
  {
    key: "asymmetryAvg" as const,
    label: "ASYMMETRY",
    unit: "%",
    tone: "var(--danger)",
    fmt: (v: number) => String(Math.round(v * 100)),
  },
];

const SCORE_DEFS = [
  { key: "readiness_score" as const,         label: "READINESS",  tone: "var(--warn)" },
  { key: "strength_potential_score" as const, label: "STRENGTH",   tone: "var(--accent)" },
  { key: "endurance_potential_score" as const,label: "ENDURANCE",  tone: "var(--accent-cyan)" },
  { key: "injury_risk_score" as const,        label: "INJURY RISK",tone: "var(--danger)" },
];

export function CapturePanel({ onFinish }: { onFinish?: () => void }) {
  const fingerprint = useAthleteStore((s) => s.fingerprint);
  const { profile, isComplete } = useProfile();
  const cv = useCaptureSignals();
  const [prediction, setPrediction] = useState<PredictOutput | null>(null);
  const [predLoading, setPredLoading] = useState(false);
  const [predError, setPredError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Re-run prediction whenever a completed set is captured.
  useEffect(() => {
    if (!fingerprint || fingerprint.totalReps === 0 || !isComplete) return;
    let cancelled = false;
    setPredLoading(true);
    setPredError(null);
    predict({ ...(profile as ProfileFields), ...cv })
      .then((res) => { if (!cancelled) { setPrediction(res); setPredLoading(false); } })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPredError(err instanceof Error ? err.message : "Prediction failed.");
          setPredLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [fingerprint?.timestamp]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".cap-fade", {
        opacity: 0,
        y: 16,
        filter: "blur(6px)",
        stagger: 0.06,
        duration: 0.7,
        ease: "power3.out",
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      {/* Real camera with pose detection */}
      <div className="cap-fade">
        <PoseCamera />
      </div>

      {/* Training fingerprint signals */}
      <div className="cap-fade glass rounded-2xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <p className="eyebrow">Training fingerprint</p>
          <span className="font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
            {fingerprint ? "LAST SET" : "AWAITING SET"}
          </span>
        </div>

        {fingerprint ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              {SIGNAL_DEFS.map((s) => {
                const raw = fingerprint[s.key];
                const display = s.fmt(raw as number);
                return (
                  <div
                    key={s.label}
                    className="rounded-xl border border-[var(--glass-border)] bg-[var(--surface)]/50 p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background: s.tone,
                          boxShadow: `0 0 8px ${s.tone}`,
                        }}
                      />
                      <span className="font-mono text-[10px] tracking-[0.25em] text-[var(--fg-mute)]">
                        {s.label}
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="font-display text-3xl font-medium text-[var(--fg)]">
                        {display}
                      </span>
                      {s.unit && (
                        <span className="font-mono text-[11px] text-[var(--fg-mute)]">
                          {s.unit}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {fingerprint.injuryRiskMarkers.length > 0 && (
              <div className="mt-4 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3">
                <p className="mb-1 font-mono text-[10px] tracking-[0.2em] text-[var(--danger)]">
                  RISK FLAGS
                </p>
                <div className="flex flex-wrap gap-2">
                  {fingerprint.injuryRiskMarkers.map((m) => (
                    <span
                      key={m}
                      className="rounded-full border border-[var(--danger)]/40 px-2 py-0.5 font-mono text-[10px] text-[var(--danger)]"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Model prediction */}
            <div className="mt-5 border-t border-[var(--glass-border)] pt-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="eyebrow">Model · Readout</p>
                {predLoading && (
                  <Loader2
                    size={13}
                    strokeWidth={2}
                    className="animate-spin text-[var(--accent-cyan)]"
                  />
                )}
              </div>

              {predError && (
                <p className="text-xs text-[var(--danger)]">{predError}</p>
              )}

              {!isComplete && !predLoading && (
                <p className="text-xs text-[var(--fg-mute)]">
                  Set your profile to see model scores.
                </p>
              )}

              {prediction && !predLoading && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {SCORE_DEFS.map((s) => (
                      <div
                        key={s.key}
                        className="rounded-xl border border-[var(--glass-border)] bg-[var(--surface)]/50 p-3"
                      >
                        <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--fg-mute)]">
                          {s.label}
                        </p>
                        <p
                          className="mt-1 font-display text-2xl font-medium"
                          style={{ color: s.tone }}
                        >
                          {Math.round(prediction.scores[s.key])}
                          <span className="ml-0.5 font-mono text-[10px] text-[var(--fg-mute)]">
                            %
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>

                  {prediction.summary && (
                    <p className="mt-4 text-sm leading-relaxed text-[var(--fg-dim)]">
                      {prediction.summary}
                    </p>
                  )}

                  {prediction.recommendations.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {prediction.recommendations.map((r) => (
                        <span
                          key={r}
                          className="rounded-full border border-[var(--glass-border)] bg-[var(--surface)]/50 px-2 py-0.5 font-mono text-[10px] tracking-[0.15em] text-[var(--fg-dim)]"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {onFinish && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={onFinish}
                        className="cta cta-primary"
                      >
                        Continue to twin
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {SIGNAL_DEFS.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-[var(--glass-border)] bg-[var(--surface)]/50 p-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full opacity-40"
                    style={{ background: s.tone }}
                  />
                  <span className="font-mono text-[10px] tracking-[0.25em] text-[var(--fg-mute)]">
                    {s.label}
                  </span>
                </div>
                <div className="mt-3">
                  <span className="font-display text-3xl font-medium text-[var(--fg-mute)]">
                    —
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
