"use client";

import { useEffect, useState } from "react";

export type LandingStep = "hero" | "app";

const EVT = "doppel:landingstep";

declare global {
  interface Window {
    __doppelLandingStep?: LandingStep;
  }
}

function readCurrent(): LandingStep {
  if (typeof window === "undefined") return "hero";
  if (window.__doppelLandingStep) return window.__doppelLandingStep;
  // First read on a fresh page load: the LandingShell hasn't mounted yet so
  // the window signal is unset. Derive the step from the URL directly so
  // consumers (the persistent backdrop) initialize with the right values
  // and don't fire a landing -> app tween on hard-refresh of an app URL.
  const params = new URLSearchParams(window.location.search);
  const step = params.get("step");
  return step === "capture" || step === "twin" ? "app" : "hero";
}

export function setLandingStep(next: LandingStep) {
  if (typeof window === "undefined") return;
  if (window.__doppelLandingStep === next) return;
  window.__doppelLandingStep = next;
  window.dispatchEvent(new CustomEvent<LandingStep>(EVT, { detail: next }));
}

export function useLandingStep(): LandingStep {
  // Lazy initializer reads the URL synchronously on first render so the
  // initial value is correct on hard-refresh of /?step=capture or
  // /?step=twin. PersistentBackdropMount renders client-only (ssr:false),
  // so this initializer always runs in the browser.
  const [step, setStep] = useState<LandingStep>(() => readCurrent());

  useEffect(() => {
    // Re-sync once on mount in case the window signal changed between the
    // lazy initializer and the first effect (e.g. during hydration).
    const current = readCurrent();
    setStep((prev) => (prev === current ? prev : current));

    const handler = (e: Event) => {
      const ce = e as CustomEvent<LandingStep>;
      setStep(ce.detail);
    };
    window.addEventListener(EVT, handler);
    return () => window.removeEventListener(EVT, handler);
  }, []);

  return step;
}
