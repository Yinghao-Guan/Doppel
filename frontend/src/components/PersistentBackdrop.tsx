"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Canvas, useThree } from "@react-three/fiber";
import gsap from "gsap";
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

// How long after isLanding flips false we wait before unmounting the
// wireframe twin. Must be >= its opacity tween duration (1.8s) so the
// unmount happens once the model is already invisible.
const TWIN_UNMOUNT_DELAY_MS = 2100;

// Camera anchor positions for the landing -> app traversal. Landing sits back
// and lower so the topo field reads as a horizon; app dollies forward and up
// so it feels like flying *over* the terrain and *past* the wireframe twin
// into the content. Big 14-unit forward dolly (z: 6 -> -8) plus 2.4 up
// produces a real "fly-through" — the camera passes the twin at z=0 and
// ends up beyond it. Math check:
//   - Terrain plane rotated -PI/2.05 about X, positioned at (0, -3.5, -55),
//     200 units long, so its near edge sits around world z = +44 and its
//     far edge around world z = -155. Even at z = -8 there's ~147 units of
//     terrain ahead of the camera, so it never looks at empty space.
//   - Highest terrain peaks reach roughly y = -1 (base -3.5 + amp 2.6).
//     Camera at y = 4 is comfortably above, no clipping.
//   - Wireframe twin sits at (3, 0, 0) scale 1.2. Camera at (0, 4, -8)
//     passes 3 units left and 4 units above it — close enough to feel a
//     fly-by, far enough not to intersect.
const CAM_LANDING = { x: 0, y: 1.6, z: 6 };
const CAM_APP = { x: 0, y: 4.0, z: -8 };

function BackdropCamera({ isLanding }: { isLanding: boolean }) {
  const { camera } = useThree();
  const didInit = useRef(false);

  useEffect(() => {
    const target = isLanding ? CAM_LANDING : CAM_APP;

    // First mount: snap to the correct anchor so refresh on /app doesn't
    // animate from the landing position.
    if (!didInit.current) {
      camera.position.set(target.x, target.y, target.z);
      didInit.current = true;
      return;
    }

    const tween = gsap.to(camera.position, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration: 1.4,
      ease: "power3.inOut",
      overwrite: "auto",
    });
    return () => {
      tween.kill();
    };
  }, [isLanding, camera]);

  return null;
}

export function PersistentBackdrop() {
  const pathname = usePathname();
  const landingStep = useLandingStep();
  const isLanding = pathname === "/" && landingStep === "hero";

  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Cap DPR at 1 only when the user has opted into reduced motion. This is the
  // single signal we trust — heuristics like navigator.deviceMemory misreport
  // capable iPads as low-end and would aliase the wireframe edges visibly.
  const [dprMax, setDprMax] = useState(1.5);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setDprMax(mq.matches ? 1 : 1.5);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Defer the WIREFRAME-TWIN unmount: when isLanding flips off, keep it
  // mounted for the duration of its 1.8s opacity tween, then unmount once
  // it's invisible so the GPU teardown happens later, out of sight.
  // LandingEffects (the EffectComposer) is NOT gated by this — it stays
  // mounted always, because unmounting it instantly removes the bloom +
  // vignette pipeline from rendering, which produces a visible "snap" from
  // the BLOOM_APP/VIGNETTE_APP values to nothing in a single frame.
  const [twinMounted, setTwinMounted] = useState(isLanding);
  useEffect(() => {
    if (isLanding) {
      setTwinMounted(true);
      return;
    }
    const t = window.setTimeout(
      () => setTwinMounted(false),
      TWIN_UNMOUNT_DELAY_MS,
    );
    return () => window.clearTimeout(t);
  }, [isLanding]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    >
      <Canvas
        dpr={[1, dprMax]}
        camera={{ position: [0, 1.6, 6], fov: 65, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        frameloop={hidden ? "never" : "always"}
      >
        <color attach="background" args={["#09090b"]} />

        <BackdropCamera isLanding={isLanding} />

        <TopoField
          scrollSpeed={isLanding ? 1.1 : 0.7}
          // Aggressive 87% drop on the terrain shader brightness multiplier
          // in app mode. Combined with bloom going to zero AND vignette
          // increasing in app mode (see LandingEffects), this produces a
          // bg that's actually visibly dim — earlier "subtle" drops weren't
          // perceptually significant.
          intensity={isLanding ? 0.8 : 0.1}
        />

        {twinMounted && (
          <Suspense fallback={null}>
            <WireframeTwin
              position={[3, 0, 0]}
              scale={1.2}
              active={isLanding}
            />
          </Suspense>
        )}

        {/* Always mounted: unmounting the EffectComposer would remove the
            bloom + vignette pipeline in a single frame, producing the
            "instant dim" snap. The bloom/vignette intensities are tweened
            via refs (see LandingEffects), not React state, so keeping this
            mounted is cheap. */}
        <Suspense fallback={null}>
          <LandingEffects active={isLanding} />
        </Suspense>
      </Canvas>
    </div>
  );
}
