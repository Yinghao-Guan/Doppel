"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

useGLTF.preload("/models/wireframe_man.glb");

type WireframeTwinProps = {
  position?: [number, number, number];
  scale?: number;
  rotateY?: boolean;
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

    // Fresnel — for edge glow + slight hue bias toward silhouette.
    float fres = pow(1.0 - max(0.0, dot(N, V)), 1.6);

    // Hue sweeps up the body and rotates with time. Slight horizontal shift
    // adds chromatic separation as the model spins.
    float hue = vWorldPos.y * 0.18
              + vWorldPos.x * 0.06
              + uTime * 0.18
              + fres * 0.12;

    // Saturated full-spectrum body color (HDR brightness for bloom).
    vec3 body = hsv2rgb(vec3(fract(hue), 0.95, 1.0)) * 1.8;

    // Strong silhouette edge glow.
    vec3 col = body + fres * 1.4;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function WireframeTwin({
  position = [3, 0, 0],
  scale = 1.2,
  rotateY = true,
}: WireframeTwinProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/models/wireframe_man.glb") as unknown as {
    scene: THREE.Group;
  };

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        wireframe: true,
        transparent: false,
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
        },
      }),
    [],
  );

  const cloned = useMemo(() => {
    // Strip skeleton — render rest-pose geometry as plain meshes.
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
