"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Circle, Square, Activity, ArrowRight } from "lucide-react";
import gsap from "gsap";

const SIGNALS = [
  { label: "REPS", value: "0", unit: "/ 10", tone: "var(--accent)" },
  { label: "FORM SCORE", value: "—", unit: "%", tone: "var(--success)" },
  { label: "TEMPO", value: "—", unit: "s/rep", tone: "var(--accent-cyan)" },
  { label: "RANGE OF MOTION", value: "—", unit: "°", tone: "var(--accent)" },
  { label: "FATIGUE", value: "—", unit: "trend", tone: "var(--warn)" },
  { label: "ASYMMETRY", value: "—", unit: "%", tone: "var(--danger)" },
];

export function CapturePanel({ onFinish }: { onFinish?: () => void } = {}) {
  const [recording, setRecording] = useState(false);
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
      {/* webcam preview placeholder */}
      <div className="cap-fade glass relative aspect-video overflow-hidden rounded-2xl">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <Camera size={36} strokeWidth={1.4} className="text-[var(--fg-mute)]" />
            <p className="font-mono text-xs tracking-[0.2em] text-[var(--fg-mute)]">
              CAMERA NOT CONNECTED
            </p>
            <p className="max-w-xs text-sm text-[var(--fg-dim)]">
              MediaPipe pose feed will mount here. Allow camera access to begin.
            </p>
          </div>
        </div>

        {/* subtle frame markers */}
        <div className="pointer-events-none absolute inset-3 rounded-xl border border-[var(--glass-border)]" />
        <div className="absolute left-4 top-4 font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
          FEED &middot; OFFLINE
        </div>
        <div className="absolute right-4 top-4 flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              recording ? "bg-[var(--danger)] animate-pulse" : "bg-[var(--fg-mute)]"
            }`}
          />
          {recording ? "RECORDING" : "IDLE"}
        </div>

        {/* skeleton overlay placeholder */}
        <SkeletonOverlay />

        {/* controls */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3">
          <button
            onClick={() => setRecording((r) => !r)}
            className="cta cta-primary"
          >
            {recording ? <Square size={14} fill="currentColor" /> : <Circle size={14} fill="currentColor" />}
            {recording ? "Stop" : "Begin recording"}
          </button>
          <button className="cta glass cta-ghost">
            <Activity size={14} />
            Calibrate
          </button>
        </div>
      </div>

      {/* live signal grid */}
      <div className="cap-fade glass rounded-2xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <p className="eyebrow">Training fingerprint</p>
          <span className="font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
            LIVE
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {SIGNALS.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-[var(--glass-border)] bg-[var(--surface)]/50 p-4"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: s.tone, boxShadow: `0 0 8px ${s.tone}` }}
                />
                <span className="font-mono text-[10px] tracking-[0.25em] text-[var(--fg-mute)]">
                  {s.label}
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-3xl font-medium text-[var(--fg)]">
                  {s.value}
                </span>
                <span className="font-mono text-[11px] text-[var(--fg-mute)]">
                  {s.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-[var(--fg-mute)]">
          Signals populate once the pose model locks onto your skeleton. Backend
          team is wiring MediaPipe + the feature extractor into the
          <code className="mx-1 rounded bg-[var(--surface-2)] px-1 py-0.5 text-[10px] text-[var(--fg-dim)]">
            /api/pose
          </code>
          stream.
        </p>
        {onFinish && (
          <button
            type="button"
            onClick={onFinish}
            className="cta cta-primary mt-6 w-full justify-center"
          >
            See your twin
            <ArrowRight size={14} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </div>
  );
}

function SkeletonOverlay() {
  // Just decorative SVG so the camera tile feels alive even without a feed.
  return (
    <svg
      className="pointer-events-none absolute inset-0 m-auto h-3/5 w-auto opacity-30"
      viewBox="0 0 100 160"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      style={{ color: "var(--accent-cyan)" }}
    >
      <circle cx="50" cy="20" r="8" />
      <line x1="50" y1="28" x2="50" y2="80" />
      <line x1="50" y1="38" x2="20" y2="60" />
      <line x1="50" y1="38" x2="80" y2="60" />
      <line x1="50" y1="80" x2="30" y2="130" />
      <line x1="50" y1="80" x2="70" y2="130" />
      {[20, 80, 30, 70].map((x, i) => (
        <circle
          key={i}
          cx={x}
          cy={i < 2 ? 60 : 130}
          r="2"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
