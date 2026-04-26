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
  return window.__doppelLandingStep ?? "hero";
}

export function setLandingStep(next: LandingStep) {
  if (typeof window === "undefined") return;
  if (window.__doppelLandingStep === next) return;
  window.__doppelLandingStep = next;
  window.dispatchEvent(new CustomEvent<LandingStep>(EVT, { detail: next }));
}

export function useLandingStep(): LandingStep {
  const [step, setStep] = useState<LandingStep>("hero");

  useEffect(() => {
    setStep(readCurrent());
    const handler = (e: Event) => {
      const ce = e as CustomEvent<LandingStep>;
      setStep(ce.detail);
    };
    window.addEventListener(EVT, handler);
    return () => window.removeEventListener(EVT, handler);
  }, []);

  return step;
}
