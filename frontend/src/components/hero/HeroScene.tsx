"use client";

import { Canvas } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  Vignette,
} from "@react-three/postprocessing";
import { TwinOrb } from "./TwinOrb";

export default function HeroScene() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 3.4], fov: 42 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#09090b"]} />
        <ambientLight intensity={0.15} />
        <pointLight
          position={[3, 2, 4]}
          color="#a78bfa"
          intensity={2.4}
          distance={10}
        />
        <pointLight
          position={[-3, -1, 2]}
          color="#22d3ee"
          intensity={1.6}
          distance={10}
        />

        <TwinOrb />

        <EffectComposer>
          <Bloom
            intensity={0.9}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.4}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.3} darkness={0.85} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
