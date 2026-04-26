"use client";

import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import {
  EffectComposer,
  Bloom,
  Vignette,
} from "@react-three/postprocessing";
import gsap from "gsap";

// Bloom drops to ZERO in app mode (smooth via ref-based tween, no
// reconstruction snap). Vignette goes UP in app mode so the corners get
// even darker — combined with terrain intensity dropping ~87%, this
// makes the bg actually read as dim rather than the previous too-subtle
// shifts that the user couldn't see.
const BLOOM_LANDING = 0.4;
const BLOOM_APP = 0;
const VIGNETTE_LANDING = 1.4;
const VIGNETTE_APP = 2.0;

type BloomLike = { intensity: number };
type VignetteLike = { darkness: number };

export function LandingEffects({ active = true }: { active?: boolean }) {
  const bloomRef = useRef<BloomLike | null>(null);
  const vignetteRef = useRef<VignetteLike | null>(null);
  const didInit = useRef(false);

  // Pass options as constructor `args` (NOT as separate props). The
  // @react-three/postprocessing wrapper memoizes args via
  // `useMemo([JSON.stringify(props)])` — passing `intensity={x}` as a prop
  // and changing x makes the memo invalidate, which makes R3F reconstruct
  // the underlying BloomEffect AND rebuild the EffectComposer's pass chain
  // on every prop change. When that happened 60×/sec from a state-driven
  // tween, the bloom contribution effectively died at click time. By
  // putting initial values in `args` (a stable useMemo([], []) reference)
  // and mutating .intensity / .darkness via the captured ref from gsap
  // onUpdate, the pipeline is built once and the live values change
  // smoothly without any React reconciliation involvement.
  const bloomArgs = useMemo(
    () => [
      {
        intensity: BLOOM_LANDING,
        luminanceThreshold: 0.4,
        luminanceSmoothing: 0.5,
        mipmapBlur: true,
      },
    ],
    [],
  );
  const vignetteArgs = useMemo(
    () => [
      {
        eskil: false,
        offset: 0.15,
        darkness: VIGNETTE_LANDING,
      },
    ],
    [],
  );

  const setBloomEffect = useCallback((instance: BloomLike | null) => {
    bloomRef.current = instance;
  }, []);
  const setVignetteEffect = useCallback((instance: VignetteLike | null) => {
    vignetteRef.current = instance;
  }, []);

  useLayoutEffect(() => {
    const bloom = bloomRef.current;
    const vignette = vignetteRef.current;
    if (!bloom || !vignette) return;

    const targetB = active ? BLOOM_LANDING : BLOOM_APP;
    const targetV = active ? VIGNETTE_LANDING : VIGNETTE_APP;

    // First mount: snap to current target with no animation.
    if (!didInit.current) {
      bloom.intensity = targetB;
      vignette.darkness = targetV;
      didInit.current = true;
      return;
    }

    // Subsequent active flips: tween smoothly over 1.8s linear.
    const obj = { b: bloom.intensity, v: vignette.darkness };
    const tween = gsap.to(obj, {
      b: targetB,
      v: targetV,
      duration: 1.8,
      ease: "none",
      onUpdate: () => {
        if (bloomRef.current) bloomRef.current.intensity = obj.b;
        if (vignetteRef.current) vignetteRef.current.darkness = obj.v;
      },
    });
    return () => {
      tween.kill();
    };
  }, [active]);

  return (
    <EffectComposer>
      <Bloom ref={setBloomEffect} args={bloomArgs} />
      <Vignette ref={setVignetteEffect} args={vignetteArgs} />
    </EffectComposer>
  );
}
