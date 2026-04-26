"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { HeroOverlay } from "@/components/HeroOverlay";
import { CapturePanel } from "@/components/capture/CapturePanel";
import { TopNav } from "@/components/TopNav";
import { setLandingStep } from "@/lib/landing-step";
import { useTransitionNavigate } from "@/lib/page-transition";

type Step = "hero" | "capture";

export function LandingShell() {
  const search = useSearchParams();
  const initial: Step = search.get("step") === "capture" ? "capture" : "hero";
  const [step, setStep] = useState<Step>(initial);
  const router = useRouter();
  const navigate = useTransitionNavigate();
  const captureRef = useRef<HTMLDivElement>(null);

  // Keep local step in sync with URL — supports nav clicks and back/forward.
  useEffect(() => {
    const fromUrl: Step = search.get("step") === "capture" ? "capture" : "hero";
    setStep(fromUrl);
  }, [search]);

  useEffect(() => {
    setLandingStep(step === "hero" ? "hero" : "app");
    return () => {
      setLandingStep("hero");
    };
  }, [step]);

  // After arriving from a transition (which faded <main>), make sure main is
  // visible again on mount so the hero/capture content isn't stuck blurred.
  useEffect(() => {
    const main = document.querySelector("main");
    if (main) gsap.set(main, { opacity: 1, filter: "blur(0px)" });
  }, []);

  useEffect(() => {
    if (step !== "capture" || !captureRef.current) return;
    // The hero CTA faded <main> out — bring it back, then dolly the
    // capture content in from blur so the swap feels like one continuous move.
    const main = document.querySelector("main");
    if (main) {
      gsap.set(main, { opacity: 1, filter: "blur(0px)" });
    }
    gsap.fromTo(
      captureRef.current,
      { opacity: 0, y: 24, filter: "blur(8px)" },
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.7,
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
        ref={captureRef}
        className="relative z-10 flex-1 px-6 pb-16 pt-4 md:px-14"
      >
        <div className="mx-auto max-w-[1800px]">
          <p className="eyebrow mb-3">Step 01 · Capture</p>
          <h1 className="headline text-3xl text-[var(--fg)] sm:text-4xl md:text-5xl">
            Record your <span className="brand-shimmer">fingerprint.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-[var(--fg-dim)]">
            Five to ten reps in front of the camera. The pose model extracts
            your training fingerprint &mdash; form, depth, tempo, stability.
          </p>
          <CapturePanel onFinish={() => navigate("/twin")} />
        </div>
      </div>
    </>
  );
}
