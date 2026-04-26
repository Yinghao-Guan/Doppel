"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

type WireframeTwinProps = {
  position?: [number, number, number];
  scale?: number;
  rotateY?: boolean;
  active?: boolean;
};

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;

    vec4 mvPos = viewMatrix * worldPos;
    vViewDir = normalize(-mvPos.xyz);

    vNormal = normalize(normalMatrix * normal);

    gl_Position = projectionMatrix * mvPos;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  // HSV → RGB conversion (Iñigo Quilez)
  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);

    float fres = pow(1.0 - max(0.0, dot(N, V)), 1.6);

    float hue = vWorldPos.y * 0.18
              + vWorldPos.x * 0.06
              + uTime * 0.18
              + fres * 0.12;

    vec3 body = hsv2rgb(vec3(fract(hue), 0.95, 1.0)) * 1.8;

    vec3 col = body + fres * 1.4;

    gl_FragColor = vec4(col, uOpacity);
  }
`;

export function WireframeTwin({
  position = [3, 0, 0],
  scale = 1.2,
  rotateY = true,
  active = true,
}: WireframeTwinProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/models/wireframe_man.draco.glb") as unknown as {
    scene: THREE.Group;
  };

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        wireframe: true,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: active ? 1 : 0 },
        },
      }),
    // Material is created once per mount; uOpacity is tweened by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const cloned = useMemo(() => {
    const group = new THREE.Group();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mesh = new THREE.Mesh(m.geometry, material);
      group.add(mesh);
    });

    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    group.position.sub(center);
    return group;
  }, [scene, material]);

  // Tween opacity when `active` changes so the model fades in/out instead of
  // popping when the parent decides to mount/unmount it. Linear ease so the
  // model fade is at constant rate, matching the bloom/vignette/intensity
  // dimming that happens in parallel.
  useEffect(() => {
    const tween = gsap.to(material.uniforms.uOpacity, {
      value: active ? 1 : 0,
      duration: 1.8,
      ease: "none",
      overwrite: "auto",
    });
    return () => {
      tween.kill();
    };
  }, [active, material]);

  // Dispose the ShaderMaterial on unmount so its GPU program doesn't leak
  // across remounts. Geometries come from drei's useGLTF cache and are SHARED
  // across mounts — disposing them would corrupt the cache and break the next
  // remount, so they are intentionally left alone.
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useFrame((state, delta) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    if (rotateY && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.18;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}
