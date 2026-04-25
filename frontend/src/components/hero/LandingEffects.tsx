"use client";

import {
  EffectComposer,
  Bloom,
  Vignette,
} from "@react-three/postprocessing";

export function LandingEffects() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.4}
        luminanceThreshold={0.4}
        luminanceSmoothing={0.5}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.15} darkness={1.4} />
    </EffectComposer>
  );
}
