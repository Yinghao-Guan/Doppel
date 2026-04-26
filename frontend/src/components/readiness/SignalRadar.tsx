"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import type { PredictSignals } from "@/types/predict";

const SIZE = 360;
const CENTER = SIZE / 2;
const MAX_R = 130;
const LABEL_R = MAX_R + 26;

const ORDER: { key: keyof PredictSignals; label: string }[] = [
  { key: "form_quality", label: "FORM" },
  { key: "depth_score", label: "DEPTH" },
  { key: "tempo_consistency", label: "TEMPO" },
  { key: "stability", label: "STABILITY" },
  { key: "fatigue_trend", label: "FATIGUE" },
  { key: "asymmetry", label: "SYMMETRY" },
  { key: "range_of_motion", label: "ROM" },
  { key: "movement_quality", label: "QUALITY" },
];

function pointFor(i: number, total: number, radius: number) {
  const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

type Props = { signals: PredictSignals };

export function SignalRadar({ signals }: Props) {
  const polyRef = useRef<SVGPolygonElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const gradId = useId().replace(/[:]/g, "");

  const targetPoints = useMemo(
    () =>
      ORDER.map((s, i) => {
        const v = Math.max(0, Math.min(100, signals[s.key])) / 100;
        return pointFor(i, ORDER.length, MAX_R * v);
      }),
    [signals],
  );

  const axisEnds = useMemo(
    () => ORDER.map((_, i) => pointFor(i, ORDER.length, MAX_R)),
    [],
  );

  const labelPositions = useMemo(
    () => ORDER.map((_, i) => pointFor(i, ORDER.length, LABEL_R)),
    [],
  );

  useEffect(() => {
    if (!polyRef.current) return;
    const center = ORDER.map(() => `${CENTER},${CENTER}`).join(" ");
    polyRef.current.setAttribute("points", center);

    const target = targetPoints.map((p) => `${p.x},${p.y}`).join(" ");

    const proxy = { t: 0 };
    const tween = gsap.to(proxy, {
      t: 1,
      duration: 1.6,
      ease: "power3.out",
      delay: 0.4,
      onUpdate: () => {
        if (!polyRef.current) return;
        const interp = targetPoints
          .map((p) => {
            const x = CENTER + (p.x - CENTER) * proxy.t;
            const y = CENTER + (p.y - CENTER) * proxy.t;
            return `${x},${y}`;
          })
          .join(" ");
        polyRef.current.setAttribute("points", interp);
      },
      onComplete: () => {
        polyRef.current?.setAttribute("points", target);
      },
    });

    return () => {
      tween.kill();
    };
  }, [targetPoints]);

  return (
    <div className="rd-fade glass relative rounded-2xl p-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="eyebrow">Signal radar</p>
        <span className="font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
          8 axes · 0–100
        </span>
      </div>

      <div className="relative mx-auto" style={{ width: SIZE, maxWidth: "100%" }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width="100%"
          style={{ height: "auto" }}
          className="block"
        >
          <defs>
            <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
              {/* `stop-color` set via style so CSS variables resolve and
                  update when the accent preset changes. */}
              <stop
                offset="0%"
                style={{ stopColor: "var(--accent-cyan)", stopOpacity: 0.65 }}
              />
              <stop
                offset="100%"
                style={{ stopColor: "var(--accent)", stopOpacity: 0.25 }}
              />
            </radialGradient>
          </defs>

          {/* concentric grid */}
          {[0.25, 0.5, 0.75, 1].map((step) => (
            <circle
              key={step}
              cx={CENTER}
              cy={CENTER}
              r={MAX_R * step}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={1}
            />
          ))}

          {/* axis spokes */}
          {axisEnds.map((p, i) => (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={p.x}
              y2={p.y}
              strokeWidth={1}
              // Stroke set via style so the CSS var resolves to the current
              // accent and live-updates when it changes.
              style={{
                stroke:
                  hoverIdx === i
                    ? "var(--accent-cyan)"
                    : "rgba(255,255,255,0.08)",
                transition: "stroke 180ms ease",
              }}
            />
          ))}

          {/* signal polygon */}
          <polygon
            ref={polyRef}
            points={`${CENTER},${CENTER}`}
            fill={`url(#${gradId})`}
            strokeWidth={1.4}
            strokeLinejoin="round"
            style={{
              stroke: "var(--accent-cyan)",
              filter:
                "drop-shadow(0 0 14px color-mix(in srgb, var(--accent-cyan) 60%, transparent))",
            }}
          />

          {/* value pulse dots */}
          {targetPoints.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 5 : 3}
              style={{
                fill: "var(--accent-cyan)",
                filter:
                  "drop-shadow(0 0 6px color-mix(in srgb, var(--accent-cyan) 80%, transparent))",
                transition: "r 180ms ease",
              }}
            />
          ))}

          {/* axis labels + interactive hit area */}
          {labelPositions.map((p, i) => {
            const sig = ORDER[i];
            const value = signals[sig.key];
            return (
              <g
                key={sig.key}
                style={{ cursor: "default" }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <text
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily="var(--font-mono), ui-monospace, monospace"
                  fontSize="10"
                  letterSpacing="0.22em"
                  style={{
                    fill: hoverIdx === i ? "var(--fg)" : "var(--fg-dim)",
                    transition: "fill 180ms ease",
                  }}
                >
                  {sig.label}
                </text>
                {hoverIdx === i && (
                  <text
                    x={p.x}
                    y={p.y + 14}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontFamily="var(--font-display), system-ui, sans-serif"
                    fontSize="11"
                    style={{ fill: "var(--accent-cyan)" }}
                  >
                    {value.toFixed(1)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* legend strip */}
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        {ORDER.map((s) => (
          <div
            key={s.key}
            className="flex items-center justify-between font-mono text-[10px] tracking-[0.18em] text-[var(--fg-mute)]"
          >
            <span>{s.label}</span>
            <span className="text-[var(--fg-dim)] tabular-nums">
              {signals[s.key].toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
