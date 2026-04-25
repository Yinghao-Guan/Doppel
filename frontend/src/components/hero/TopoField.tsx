"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAccent } from "@/components/AccentProvider";

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  uniform float uScrollSpeed;
  varying float vHeight;
  varying float vDistance;
  varying vec2 vUv;

  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vec3 p = position;
    // Make the noise field "scroll" along the plane's local Y so the terrain
    // appears to drift toward the camera once the plane is rotated to lie flat.
    float scrollY = p.y - uTime * uScrollSpeed;
    float n  = snoise(vec3(p.x * 0.13, scrollY * 0.13, 0.0));
    float n2 = snoise(vec3(p.x * 0.34 + 17.0, scrollY * 0.34, 9.3)) * 0.4;
    float n3 = snoise(vec3(p.x * 0.78 + 99.0, scrollY * 0.78, 3.7)) * 0.08;
    float h = (n + n2 + n3) * uAmp;

    vec3 displaced = vec3(p.x, p.y, h);
    vHeight = h;
    vUv = uv;

    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    vDistance = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorLow;
  uniform vec3 uColorHigh;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uAmp;
  varying float vHeight;
  varying float vDistance;
  varying vec2 vUv;

  void main() {
    float t = smoothstep(-uAmp * 0.9, uAmp * 0.9, vHeight);
    vec3 col = mix(uColorLow, uColorHigh, t);

    // Brighten the ridges so bloom catches them — but keep it subtle.
    col += pow(t, 4.0) * 0.25;

    // Distance fog (linear) — far lines fade into the bg.
    float fog = clamp(1.0 - (vDistance - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    vec3 final = mix(uFogColor, col, fog);

    // Edge fade on the left/right of the plane so it doesn't end abruptly.
    float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(0.0, 0.18, 1.0 - vUv.x);

    gl_FragColor = vec4(final, fog * edge);
  }
`;

export function TopoField() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { accent } = useAccent();

  // Single big subdivided plane lying flat (XZ after rotation), extending forward.
  const geometry = useMemo(
    () => new THREE.PlaneGeometry(120, 200, 80, 160),
    [],
  );

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  // Update terrain colors live when the user picks a new accent.
  useEffect(() => {
    if (!matRef.current) return;
    matRef.current.uniforms.uColorHigh.value.set(accent.accentCyan);
    matRef.current.uniforms.uColorLow.value
      .set(accent.accentDeep)
      .multiplyScalar(0.18);
  }, [accent]);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2.05, 0, 0]}
      position={[0, -3.5, -55]}
    >
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        wireframe
        transparent
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
          uAmp: { value: 2.6 },
          uScrollSpeed: { value: 1.1 },
          uColorLow: { value: new THREE.Color("#1e1b4b") },
          uColorHigh: { value: new THREE.Color("#0e7490") },
          uFogColor: { value: new THREE.Color("#09090b") },
          uFogNear: { value: 12 },
          uFogFar: { value: 110 },
        }}
      />
    </mesh>
  );
}
