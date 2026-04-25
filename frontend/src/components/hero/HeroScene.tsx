"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  Vignette,
} from "@react-three/postprocessing";
import { TopoField } from "./TopoField";
import { WireframeTwin } from "./WireframeTwin";

export default function HeroScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.6, 6], fov: 65, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#09090b"]} />

        <TopoField />
        <Suspense fallback={null}>
          <WireframeTwin position={[3, 0, 0]} scale={1.2} />
        </Suspense>

        <EffectComposer>
          <Bloom
            intensity={0.4}
            luminanceThreshold={0.4}
            luminanceSmoothing={0.5}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.15} darkness={1.4} />
        </EffectComposer>
      </Canvas>
      {/* Soft radial dim behind the wordmark so terrain never out-shouts the text */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(9,9,11,0.92) 0%, rgba(9,9,11,0.7) 35%, rgba(9,9,11,0.25) 70%, rgba(9,9,11,0) 100%)",
        }}
      />
    </div>
  );
}
