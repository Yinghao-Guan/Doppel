"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

let splashHasPlayed = false;

const PHRASES = ["CALIBRATING", "LOADING MODEL", "READY"] as const;
const PHASE_INTERVAL_MS = 1000;
const MIN_DURATION_MS = 1300;
const MAX_DURATION_MS = 3500;

export default function SplashScreen() {
  const [visible, setVisible] = useState(!splashHasPlayed);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const phraseRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (splashHasPlayed) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const phaseTimer = window.setInterval(() => {
      setPhaseIndex((i) => Math.min(i + 1, PHRASES.length - 1));
    }, PHASE_INTERVAL_MS);

    const minDelay = new Promise<void>((r) =>
      window.setTimeout(r, MIN_DURATION_MS),
    );
    const fontsReady = (document.fonts?.ready ??
      Promise.resolve()) as Promise<unknown>;
    const windowLoaded =
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise<void>((r) =>
            window.addEventListener("load", () => r(), { once: true }),
          );
    const twoFrames = new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    );
    const safetyCap = new Promise<void>((r) =>
      window.setTimeout(r, MAX_DURATION_MS),
    );

    const ready = Promise.all([
      minDelay,
      fontsReady,
      windowLoaded,
      twoFrames,
    ]).then(() => undefined);
    const dismissTrigger = Promise.race([ready, safetyCap]);

    let cancelled = false;
    dismissTrigger.then(() => {
      if (cancelled) return;
      splashHasPlayed = true;
      window.dispatchEvent(new Event("doppel:splash-dismissed"));
      window.clearInterval(phaseTimer);

      const node = rootRef.current;
      if (!node) {
        setVisible(false);
        return;
      }

      node.style.pointerEvents = "none";

      if (reduced) {
        gsap.to(node, {
          opacity: 0,
          duration: 0.25,
          ease: "power1.out",
          onComplete: () => setVisible(false),
        });
      } else {
        gsap.to(node, {
          opacity: 0,
          filter: "blur(8px)",
          scale: 1.04,
          duration: 0.5,
          ease: "power2.in",
          onComplete: () => setVisible(false),
        });
      }
    });

    return () => {
      cancelled = true;
      window.clearInterval(phaseTimer);
    };
  }, []);

  useEffect(() => {
    if (!phraseRef.current || splashHasPlayed) return;
    gsap.fromTo(
      phraseRef.current,
      { opacity: 0, y: -4 },
      { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" },
    );
  }, [phaseIndex]);

  if (!visible) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden
      style={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[var(--bg)]"
    >
      <div className="flex flex-col items-center gap-9">
        <svg
          width="140"
          height="140"
          viewBox="-60 -60 120 120"
          className="splash-sphere"
          style={{
            filter: "drop-shadow(0 0 12px color-mix(in srgb, var(--accent-cyan) 60%, transparent))",
          }}
        >
          <defs>
            <linearGradient
              id="splash-sphere-grad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop
                offset="0%"
                style={{ stopColor: "var(--accent-cyan)" }}
              />
              <stop offset="55%" style={{ stopColor: "var(--fg)" }} />
              <stop offset="100%" style={{ stopColor: "var(--accent)" }} />
            </linearGradient>
          </defs>
          <g
            stroke="url(#splash-sphere-grad)"
            strokeWidth="1"
            fill="none"
            opacity="0.9"
          >
            <circle r="50" />
            <ellipse rx="42" ry="6" cy="-26" />
            <ellipse rx="48" ry="10" cy="-13" />
            <ellipse rx="50" ry="12" cy="0" />
            <ellipse rx="48" ry="10" cy="13" />
            <ellipse rx="42" ry="6" cy="26" />
            <ellipse rx="6" ry="50" />
            <ellipse rx="22" ry="50" />
            <ellipse rx="36" ry="50" />
            <ellipse rx="48" ry="50" />
          </g>
        </svg>

        <span
          className="brand-shimmer font-display font-medium tracking-[-0.045em]"
          style={{ fontSize: "3.75rem", lineHeight: 1 }}
        >
          doppel
        </span>

        <span ref={phraseRef} className="eyebrow">
          {PHRASES[phaseIndex]}
        </span>
      </div>
    </div>
  );
}
