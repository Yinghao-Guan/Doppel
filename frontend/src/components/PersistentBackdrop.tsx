"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import dynamic from "next/dynamic";
import { TopoField } from "@/components/hero/TopoField";
import { useLandingStep } from "@/lib/landing-step";

const WireframeTwin = dynamic(
  () =>
    import("@/components/hero/WireframeTwin").then((m) => m.WireframeTwin),
  { ssr: false },
);

const LandingEffects = dynamic(
  () =>
    import("@/components/hero/LandingEffects").then((m) => m.LandingEffects),
  { ssr: false },
);

const LANDING_DIM =
  "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(9,9,11,0.92) 0%, rgba(9,9,11,0.7) 35%, rgba(9,9,11,0.25) 70%, rgba(9,9,11,0) 100%)";
const APP_DIM =
  "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(9,9,11,0.95) 0%, rgba(9,9,11,0.7) 55%, rgba(9,9,11,0.4) 100%)";

export function PersistentBackdrop() {
  const pathname = usePathname();
  const landingStep = useLandingStep();
  // The mesh + landing FX should only show on the hero state of `/`,
  // not while the inline capture wizard is visible.
  const isLanding = pathname === "/" && landingStep === "hero";

  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    >
      <Canvas
        dpr={isLanding ? [1, 1.5] : [1, 1]}
        camera={{ position: [0, 1.6, 6], fov: 65, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        frameloop={hidden ? "never" : "always"}
      >
        <color attach="background" args={["#09090b"]} />

        <TopoField
          scrollSpeed={isLanding ? 1.1 : 0.5}
          intensity={isLanding ? 0.8 : 0.45}
          throttleHalf={!isLanding}
        />

        {isLanding && (
          <Suspense fallback={null}>
            <WireframeTwin position={[3, 0, 0]} scale={1.2} />
          </Suspense>
        )}

        {isLanding && (
          <Suspense fallback={null}>
            <LandingEffects />
          </Suspense>
        )}
      </Canvas>

      {/* Two stacked dim overlays that crossfade so the page-mode swap is smooth */}
      <div
        className="absolute inset-0 transition-opacity duration-700 ease-out"
        style={{ background: LANDING_DIM, opacity: isLanding ? 1 : 0 }}
      />
      <div
        className="absolute inset-0 transition-opacity duration-700 ease-out"
        style={{ background: APP_DIM, opacity: isLanding ? 0 : 1 }}
      />
    </div>
  );
}
