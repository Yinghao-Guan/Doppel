"use client";

import { useEffect, useId, useRef } from "react";
import gsap from "gsap";

type Props = {
  label: string;
  value: number;
  tone: string;
  toneStop?: string;
  invert?: boolean;
  delay?: number;
};

const SIZE = 168;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export function ScoreRing({
  label,
  value,
  tone,
  toneStop,
  invert = false,
  delay = 0,
}: Props) {
  const arcRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gradId = useId().replace(/[:]/g, "");

  useEffect(() => {
    if (!arcRef.current || !numRef.current) return;
    const safe = Math.max(0, Math.min(100, value));
    const offset = CIRC * (1 - safe / 100);

    const arc = arcRef.current;
    const num = numRef.current;
    arc.style.strokeDasharray = String(CIRC);
    arc.style.strokeDashoffset = String(CIRC);
    num.textContent = "0";

    const counter = { v: 0 };
    const tl = gsap.timeline({ delay });
    tl.to(arc, {
      strokeDashoffset: offset,
      duration: 1.4,
      ease: "power3.out",
    }, 0);
    tl.to(counter, {
      v: safe,
      duration: 1.4,
      ease: "power3.out",
      onUpdate: () => {
        if (numRef.current) {
          numRef.current.textContent = counter.v.toFixed(1);
        }
      },
    }, 0);

    return () => {
      tl.kill();
    };
  }, [value, delay]);

  const stop = toneStop ?? tone;

  return (
    <div
      ref={wrapRef}
      className="relative flex flex-col items-center"
      style={{ ["--ring-tone" as string]: tone }}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="score-ring-glow"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            {/* `stop-color` set via style (not attribute) so CSS variables
                resolve and re-render reliably when the accent changes. */}
            <stop offset="0%" style={{ stopColor: tone }} />
            <stop offset="100%" style={{ stopColor: stop }} />
          </linearGradient>
        </defs>
        <circle
          className="score-ring-track"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
        />
        <circle
          ref={arcRef}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span
          ref={numRef}
          className="font-display text-4xl font-medium tabular-nums text-[var(--fg)]"
        >
          0
        </span>
        <span className="font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
          / 100
        </span>
      </div>
      <p className="mt-3 font-mono text-[10px] tracking-[0.28em] text-[var(--fg-dim)]">
        {label.toUpperCase()}
      </p>
      {invert && (
        <span className="mt-1 font-mono text-[9px] tracking-[0.25em] text-[var(--fg-mute)]">
          LOWER IS BETTER
        </span>
      )}
    </div>
  );
}
