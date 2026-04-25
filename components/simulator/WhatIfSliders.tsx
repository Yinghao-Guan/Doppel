"use client";

/**
 * PERSON 4 — sliders for live what-if. Each change re-runs simulate() and
 * updates the global projection so every chart and card updates instantly.
 */

import { useEffect, useState } from "react";
import { Sliders } from "lucide-react";
import { useAthleteStore } from "@/lib/store/useAthleteStore";
import { simulate } from "@/lib/prediction/engine";
import type { TrainingPlan } from "@/types";

export function WhatIfSliders() {
  const profile = useAthleteStore((s) => s.profile);
  const fp = useAthleteStore((s) => s.fingerprint);
  const selectedPlan = useAthleteStore((s) => s.selectedPlan);
  const setProjection = useAthleteStore((s) => s.setProjection);
  const setSelectedPlan = useAthleteStore((s) => s.setSelectedPlan);

  const [draft, setDraft] = useState<TrainingPlan | null>(null);

  // Sync draft when an external plan is selected
  useEffect(() => {
    if (selectedPlan) setDraft(selectedPlan);
  }, [selectedPlan]);

  // Recompute projection on every draft change
  useEffect(() => {
    if (!profile || !fp || !draft) return;
    setProjection(simulate(profile, fp, draft));
    setSelectedPlan(draft);
  }, [draft, profile, fp, setProjection, setSelectedPlan]);

  if (!draft) {
    return (
      <div className="card">
        <h2 className="h-section text-white mb-2">What-If Simulator</h2>
        <p className="text-sm text-muted">
          Pick a plan above to start tweaking parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Sliders className="w-4 h-4 text-accent" />
        <h2 className="h-section text-white">What-If Simulator</h2>
      </div>

      <Slider
        label="Frequency"
        value={draft.frequencyPerWeek}
        min={1}
        max={7}
        step={1}
        suffix="× / week"
        onChange={(v) => setDraft({ ...draft, frequencyPerWeek: v })}
      />
      <Slider
        label="Intensity"
        value={draft.intensity}
        min={0.3}
        max={1}
        step={0.05}
        suffix={draft.intensity >= 0.85 ? "high" : draft.intensity >= 0.6 ? "moderate" : "low"}
        format={(v) => v.toFixed(2)}
        onChange={(v) => setDraft({ ...draft, intensity: v })}
      />
      <Slider
        label="Cardio share"
        value={draft.cardioRatio}
        min={0}
        max={1}
        step={0.05}
        suffix={`${Math.round(draft.cardioRatio * 100)}% cardio`}
        format={(v) => v.toFixed(2)}
        onChange={(v) => setDraft({ ...draft, cardioRatio: v })}
      />
      <Slider
        label="Session length"
        value={draft.durationMinutes}
        min={15}
        max={90}
        step={5}
        suffix="min"
        onChange={(v) => setDraft({ ...draft, durationMinutes: v })}
      />
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums font-medium">
          {format ? format(value) : value} {suffix && <span className="text-muted">{suffix}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
  );
}
