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
  uniform vec3 uColorA;  // cool / cyan
  uniform vec3 uColorB;  // hot / magenta
  uniform vec3 uColorC;  // accent flash / warm
  uniform vec3 uRim;     // rim glow color

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);

    // Fresnel — strong at silhouette edges, faint at facing angles.
    float fres = pow(1.0 - max(0.0, dot(N, V)), 2.4);

    // Vertical sweep that animates over time (looks like light traveling up the body).
    float sweep = sin(vWorldPos.y * 1.6 + uTime * 1.3) * 0.5 + 0.5;

    // Three-stop chroma gradient based on sweep + view angle.
    vec3 base = mix(uColorA, uColorB, sweep);
    vec3 mid  = mix(base, uColorC, smoothstep(0.45, 0.95, fres));

    // Rim is the dominant edge color — pushes brightness so bloom catches it.
    vec3 col = mid + uRim * fres * 1.4;

    // Slight boost so the wireframe pops in dark areas
    col += 0.08;

    // Alpha: slightly transparent overall, more solid at edges (rim).
    float alpha = 0.55 + fres * 0.45;

    gl_FragColor = vec4(col, alpha);
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
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: new THREE.Color("#00d9ff") },
          uColorB: { value: new THREE.Color("#ff2d95") },
          uColorC: { value: new THREE.Color("#ffe27a") },
          uRim: { value: new THREE.Color("#ffffff") },
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
