"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Pencil, Loader2 } from "lucide-react";
import { useProfile } from "@/lib/profile-store";
import { useCaptureSignals } from "@/lib/capture-signals";
import { predict } from "@/lib/predict";
import type { PredictOutput, ProfileFields } from "@/types/predict";
import { ProfileDrawer } from "./ProfileDrawer";
import { ScoreQuadrant } from "./ScoreQuadrant";
import { SignalRadar } from "./SignalRadar";
import { SummaryCard } from "./SummaryCard";
import { ExplanationList } from "./ExplanationList";
import { RecommendationCards } from "./RecommendationCards";
import { TwinTabs, type TwinMode } from "@/components/twin/TwinTabs";
import { SimulatePanel } from "@/components/simulate/SimulatePanel";

export function ReadinessView() {
  const { profile, isComplete, hydrated } = useProfile();
  const cv = useCaptureSignals();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [result, setResult] = useState<PredictOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<TwinMode>("now");
  const rootRef = useRef<HTMLDivElement>(null);
  const openedOnce = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!isComplete && !openedOnce.current) {
      openedOnce.current = true;
      const id = window.setTimeout(() => setDrawerOpen(true), 350);
      return () => window.clearTimeout(id);
    }
  }, [hydrated, isComplete]);

  useEffect(() => {
    if (!hydrated || !isComplete) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const raw = { ...(profile as ProfileFields), ...cv };
    predict(raw)
      .then((res) => {
        if (cancelled) return;
        setResult(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to run readout.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, isComplete, profile, cv]);

  useEffect(() => {
    if (!result || !rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".rd-fade", {
        opacity: 0,
        y: 18,
        filter: "blur(6px)",
        stagger: 0.06,
        duration: 0.7,
        ease: "power3.out",
      });
    }, rootRef);
    return () => ctx.revert();
  }, [result, mode]);

  return (
    <div ref={rootRef} className="mt-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono text-[10px] tracking-[0.28em] text-[var(--fg-mute)]">
          {isComplete ? (
            <>
              PROFILE LOCKED ·{" "}
              <span className="text-[var(--fg-dim)]">
                {profile.Age}y · {profile.Gender?.[0]} ·{" "}
                {profile.Workout_Frequency}/wk · {profile.Experience_Level} ·{" "}
                {profile.Workout_Type}
              </span>
            </>
          ) : (
            "PROFILE INCOMPLETE — TAP EDIT TO RUN A READOUT"
          )}
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="cta glass cta-ghost text-xs font-mono tracking-[0.2em] py-2 px-4"
        >
          <Pencil size={12} />
          {isComplete ? "EDIT PROFILE" : "SET PROFILE"}
        </button>
      </div>

      {isComplete && result && (
        <div className="mb-6 flex justify-center">
          <TwinTabs mode={mode} onChange={setMode} />
        </div>
      )}

      {!isComplete && hydrated && (
        <EmptyState onOpen={() => setDrawerOpen(true)} />
      )}

      {isComplete && loading && <LoadingState />}

      {isComplete && error && <ErrorState message={error} />}

      {isComplete && result && !error && mode === "now" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <ScoreQuadrant scores={result.scores} />
            <SignalRadar signals={result.signals} />
          </div>

          <SummaryCard summary={result.summary} />

          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <ExplanationList items={result.explanations} />
            <div>
              <RecommendationCards items={result.recommendations} />
            </div>
          </div>
        </div>
      )}

      {isComplete && result && mode === "whatif" && (
        <SimulatePanel baseline={result.scores} />
      )}

      <ProfileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

function EmptyState({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="glass relative flex flex-col items-center gap-4 rounded-2xl p-12 text-center">
      <p className="eyebrow">Awaiting input</p>
      <h2 className="font-display text-2xl text-[var(--fg)]">
        Add a profile and we&apos;ll run your readout.
      </h2>
      <p className="max-w-md text-sm text-[var(--fg-dim)]">
        Seven quick fields — age, height, weight, workout frequency, experience,
        type, gender. The model takes it from there.
      </p>
      <button onClick={onOpen} className="cta cta-primary mt-2">
        Set profile
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="relative">
      <div className="glass flex items-center justify-center gap-3 rounded-2xl py-20">
        <Loader2
          size={18}
          className="animate-spin text-[var(--accent-cyan)]"
          strokeWidth={2.2}
        />
        <span className="font-mono text-xs tracking-[0.3em] text-[var(--fg-dim)]">
          RUNNING READOUT…
        </span>
      </div>
      <div className="scan-sweep" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="glass rounded-2xl border border-[var(--danger)]/30 p-6 text-sm text-[var(--fg-dim)]">
      <p className="eyebrow mb-2">Readout error</p>
      <p>{message}</p>
    </div>
  );
}
