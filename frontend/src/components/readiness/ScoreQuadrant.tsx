"use client";

import type { PredictScores } from "@/types/predict";
import { ScoreRing } from "./ScoreRing";

type Props = { scores: PredictScores };

export function ScoreQuadrant({ scores }: Props) {
  const today = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rd-fade glass-strong relative rounded-2xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <p className="eyebrow">Today&apos;s readout</p>
        <span className="font-mono text-[10px] tracking-[0.3em] text-[var(--fg-mute)]">
          {today.toUpperCase()} · DOPPEL-1
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-x-12">
        <div className="flex justify-center">
          <ScoreRing
            label="Readiness"
            value={scores.readiness_score}
            tone="var(--accent)"
            toneStop="var(--accent-cyan)"
            delay={0.1}
          />
        </div>
        <div className="flex justify-center">
          <ScoreRing
            label="Injury risk"
            value={scores.injury_risk_score}
            tone="var(--danger)"
            toneStop="var(--warn)"
            invert
            delay={0.18}
          />
        </div>
        <div className="flex justify-center">
          <ScoreRing
            label="Strength potential"
            value={scores.strength_potential_score}
            tone="var(--accent-deep)"
            toneStop="var(--accent)"
            delay={0.26}
          />
        </div>
        <div className="flex justify-center">
          <ScoreRing
            label="Endurance potential"
            value={scores.endurance_potential_score}
            tone="var(--success)"
            toneStop="var(--accent-cyan)"
            delay={0.34}
          />
        </div>
      </div>
    </div>
  );
}
