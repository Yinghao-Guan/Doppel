"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { HeroOverlay } from "@/components/HeroOverlay";
import { CapturePanel } from "@/components/capture/CapturePanel";
import { ReadinessView } from "@/components/readiness/ReadinessView";
import { TopNav } from "@/components/TopNav";
import { setLandingStep } from "@/lib/landing-step";
import { useTransitionNavigate } from "@/lib/page-transition";

type Step = "hero" | "capture" | "twin";

function stepFromParam(value: string | null): Step {
  if (value === "capture") return "capture";
  if (value === "twin") return "twin";
  return "hero";
}

export function LandingShell() {
  const search = useSearchParams();
  const initial: Step = stepFromParam(search.get("step"));
  const [step, setStep] = useState<Step>(initial);
  const router = useRouter();
  const navigate = useTransitionNavigate();
  const contentRef = useRef<HTMLDivElement>(null);

  // Keep local step in sync with URL — supports nav clicks and back/forward.
  useEffect(() => {
    setStep(stepFromParam(search.get("step")));
  }, [search]);

  useEffect(() => {
    setLandingStep(step === "hero" ? "hero" : "app");
    return () => {
      setLandingStep("hero");
    };
  }, [step]);

  // After arriving from a transition (which faded <main>), make sure main is
  // visible again on mount so the hero/capture content isn't stuck hidden.
  useEffect(() => {
    const main = document.querySelector("main");
    if (main) gsap.set(main, { opacity: 1 });
  }, []);

  useEffect(() => {
    if (step === "hero" || !contentRef.current) return;
    // The previous transition faded <main> out — bring it back, then slide
    // the new step content in so the swap feels like one continuous move.
    const main = document.querySelector("main");
    if (main) gsap.set(main, { opacity: 1 });
    gsap.fromTo(
      contentRef.current,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.55,
        ease: "power3.out",
      },
    );
  }, [step]);

  if (step === "hero") {
    return (
      <>
        <TopNav hideBrand hideNav />
        <HeroOverlay
          onStart={() => {
            // Make capture state addressable so TopNav and refresh land here.
            router.replace("/?step=capture", { scroll: false });
            setStep("capture");
          }}
        />
      </>
    );
  }

  return (
    <>
      <TopNav />
      <div
        ref={contentRef}
        className="relative z-10 flex-1 px-6 pb-16 pt-4 md:px-14"
      >
        <div className="mx-auto max-w-[1800px]">
          {step === "capture" && (
            <>
              <p className="eyebrow mb-3">Step 01 · Capture</p>
              <h1 className="headline text-3xl text-[var(--fg)] sm:text-4xl md:text-5xl">
                Record your <span className="brand-shimmer">fingerprint.</span>
              </h1>
              <p className="mt-4 max-w-xl text-base text-[var(--fg-dim)]">
                Five to ten reps in front of the camera. The pose model extracts
                your training fingerprint &mdash; form, depth, tempo, stability.
              </p>
              <CapturePanel onFinish={() => navigate("/?step=twin")} />
            </>
          )}
          {step === "twin" && (
            <>
              <p className="eyebrow mb-3">Step 02 · Twin</p>
              <h1 className="headline text-3xl text-[var(--fg)] sm:text-4xl md:text-5xl">
                Meet your <span className="brand-shimmer">twin.</span>
              </h1>
              <p className="mt-4 max-w-xl text-base text-[var(--fg-dim)]">
                Your profile and last capture, run through the model. Toggle
                between
                <span className="font-mono"> Now</span> and
                <span className="font-mono"> What if</span> to see today&apos;s
                readout or simulate a different training plan &mdash; same
                chart, hypothetical inputs.
              </p>
              <ReadinessView />
            </>
          )}
        </div>
      </div>
    </>
  );
}
