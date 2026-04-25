"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useAthleteStore } from "@/lib/athlete-store";
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

export function CapturePanel() {
  const fingerprint = useAthleteStore((s) => s.fingerprint);
  const rootRef = useRef<HTMLDivElement>(null);

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
