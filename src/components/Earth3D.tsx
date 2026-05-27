"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, useTexture } from "@react-three/drei";
import * as THREE from "three";

// ── Shaders ──────────────────────────────────────────────────────────────────

const ATMO_VERTEX = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

// Primary rim Fresnel — tight, bright neon green
const ATMO_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  float rim = pow(0.60 - dot(vNormal, vViewDir), 2.2);
  rim = clamp(rim, 0.0, 1.0);
  gl_FragColor = vec4(uColor * rim * uIntensity, rim * uIntensity);
}
`;

// Outer halo — wider, softer, more diffuse
const HALO_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  float rim = pow(0.45 - dot(vNormal, vViewDir), 1.6);
  rim = clamp(rim, 0.0, 1.0);
  gl_FragColor = vec4(uColor * rim * uIntensity, rim * 0.35);
}
`;

// City lights shader — faint golden dots on the dark side
const CITY_FRAGMENT = /* glsl */ `
uniform sampler2D uLightsMap;
uniform vec3 uSunDir;
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  // Only show lights on the dark side
  float dayFactor = dot(normalize(vNormal), normalize(uSunDir));
  float nightBlend = clamp(-dayFactor * 3.0, 0.0, 1.0);
  gl_FragColor = vec4(vec3(1.0, 0.85, 0.4) * nightBlend * 0.4, nightBlend * 0.3);
}
`;

// ── Earth sphere ──────────────────────────────────────────────────────────────

function EarthSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture("/earth-blue-marble.webp");

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * ((Math.PI * 2) / 45);
    }
  });

  return (
    <mesh ref={meshRef} rotation={[0, -Math.PI * 0.55, 0]}>
      <sphereGeometry args={[1, 128, 128]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.78}
        metalness={0.02}
      />
    </mesh>
  );
}

// ── Primary atmosphere (tight bright rim) ────────────────────────────────────

function AtmosphereGlow() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#00FF88") },
      uIntensity: { value: 1.55 },
    }),
    []
  );

  useFrame((state) => {
    if (matRef.current) {
      const t = state.clock.getElapsedTime();
      (matRef.current.uniforms.uIntensity as { value: number }).value =
        1.55 + Math.sin(t * 0.8) * 0.18;
    }
  });

  return (
    <mesh scale={1.12}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={ATMO_VERTEX}
        fragmentShader={ATMO_FRAGMENT}
        uniforms={uniforms}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Outer soft halo (wider glow ring) ────────────────────────────────────────

function OuterHalo() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#44FF99") },
      uIntensity: { value: 0.7 },
    }),
    []
  );

  useFrame((state) => {
    if (matRef.current) {
      const t = state.clock.getElapsedTime();
      (matRef.current.uniforms.uIntensity as { value: number }).value =
        0.7 + Math.sin(t * 0.5 + 1.2) * 0.12;
    }
  });

  return (
    <mesh scale={1.28}>
      <sphereGeometry args={[1, 48, 48]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={ATMO_VERTEX}
        fragmentShader={HALO_FRAGMENT}
        uniforms={uniforms}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Placeholder while texture loads ──────────────────────────────────────────

function PlanetPlaceholder() {
  return (
    <mesh>
      <sphereGeometry args={[1, 48, 48]} />
      <meshStandardMaterial
        color="#04180e"
        emissive="#004422"
        emissiveIntensity={0.5}
        roughness={1}
      />
    </mesh>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function Earth3D() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      camera={{ position: [0, 0, 3.8], fov: 40 }}
      style={{ background: "transparent", width: "100%", height: "100%" }}
    >
      {/* Dim ambient + strong sun-side directional */}
      <ambientLight intensity={0.12} />
      <directionalLight position={[5, 2, 3]} intensity={1.8} color="#fff8f0" />
      {/* Soft fill from the other side so the dark limb isn't pitch black */}
      <directionalLight position={[-4, -1, -2]} intensity={0.08} color="#001a0a" />

      {/* 23.4° axial tilt for the whole Earth group */}
      <group rotation={[0, 0, (-23.4 * Math.PI) / 180]}>
        <OuterHalo />
        <AtmosphereGlow />
        <Suspense fallback={<PlanetPlaceholder />}>
          <EarthSphere />
        </Suspense>
      </group>

      {/* Dense starfield — more depth, faster twinkle */}
      <Stars
        radius={80}
        depth={60}
        count={3500}
        factor={3}
        fade
        speed={0.6}
      />
    </Canvas>
  );
}
