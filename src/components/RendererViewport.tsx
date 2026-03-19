"use client";
import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  GizmoHelper,
  GizmoViewport,
} from "@react-three/drei";
import * as THREE from "three";

interface PBRMaterial {
  color: string;
  metalness: number;
  roughness: number;
  emissive: string;
  emissiveIntensity: number;
  opacity: number;
  transparent: boolean;
}

interface LightConfig {
  id: string;
  type: "directional" | "point" | "spot" | "ambient";
  color: string;
  intensity: number;
  position: [number, number, number];
  castShadow: boolean;
}

type EnvironmentPreset = "sunset" | "dawn" | "night" | "warehouse" | "forest" | "apartment" | "studio" | "city" | "park" | "lobby";

interface RendererViewportProps {
  geometry: "box" | "cylinder" | "sphere" | "torus" | "torusKnot";
  material: PBRMaterial;
  envPreset: EnvironmentPreset;
  envIntensity: number;
  lights: LightConfig[];
  showShadows: boolean;
  showGround: boolean;
  groundColor: string;
  bgColor: string;
}

function RenderGeometry({
  geometry,
  material,
}: {
  geometry: RendererViewportProps["geometry"];
  material: PBRMaterial;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geo = (() => {
    switch (geometry) {
      case "box":
        return <boxGeometry args={[2, 2, 2]} />;
      case "cylinder":
        return <cylinderGeometry args={[1, 1, 2.5, 64]} />;
      case "sphere":
        return <sphereGeometry args={[1.5, 64, 64]} />;
      case "torus":
        return <torusGeometry args={[1.2, 0.5, 32, 100]} />;
      case "torusKnot":
        return <torusKnotGeometry args={[1, 0.35, 128, 32]} />;
    }
  })();

  const yOffset = geometry === "torus" ? 1.5 : geometry === "torusKnot" ? 1.5 : geometry === "box" ? 1 : geometry === "cylinder" ? 1.25 : 1.5;

  return (
    <mesh ref={meshRef} position={[0, yOffset, 0]} castShadow receiveShadow>
      {geo}
      <meshStandardMaterial
        color={material.color}
        metalness={material.metalness}
        roughness={material.roughness}
        emissive={material.emissive}
        emissiveIntensity={material.emissiveIntensity}
        opacity={material.opacity}
        transparent={material.transparent}
        side={material.transparent ? THREE.DoubleSide : THREE.FrontSide}
        envMapIntensity={1}
      />
    </mesh>
  );
}

function SceneLights({ lights }: { lights: LightConfig[] }) {
  return (
    <>
      {lights.map((light) => {
        switch (light.type) {
          case "directional":
            return (
              <directionalLight
                key={light.id}
                position={light.position}
                color={light.color}
                intensity={light.intensity}
                castShadow={light.castShadow}
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-near={0.1}
                shadow-camera-far={50}
                shadow-camera-left={-5}
                shadow-camera-right={5}
                shadow-camera-top={5}
                shadow-camera-bottom={-5}
              />
            );
          case "point":
            return (
              <pointLight
                key={light.id}
                position={light.position}
                color={light.color}
                intensity={light.intensity}
                castShadow={light.castShadow}
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
              />
            );
          case "spot":
            return (
              <spotLight
                key={light.id}
                position={light.position}
                color={light.color}
                intensity={light.intensity}
                castShadow={light.castShadow}
                angle={Math.PI / 6}
                penumbra={0.5}
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
              />
            );
          case "ambient":
            return (
              <ambientLight
                key={light.id}
                color={light.color}
                intensity={light.intensity}
              />
            );
        }
      })}
    </>
  );
}

function GroundPlane({ color, receiveShadow }: { color: string; receiveShadow: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow={receiveShadow}>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color={color} metalness={0} roughness={0.8} />
    </mesh>
  );
}

export default function RendererViewport({
  geometry,
  material,
  envPreset,
  envIntensity,
  lights,
  showShadows,
  showGround,
  groundColor,
  bgColor,
}: RendererViewportProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [4, 3, 4], fov: 45, near: 0.1, far: 1000 }}
        shadows
        gl={{
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        style={{ background: bgColor }}
      >
        <SceneLights lights={lights} />

        <RenderGeometry geometry={geometry} material={material} />

        {showGround && <GroundPlane color={groundColor} receiveShadow={showShadows} />}

        {showShadows && (
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.6}
            scale={10}
            blur={2.5}
            far={4}
          />
        )}

        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />

        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport labelColor="white" axisHeadScale={0.8} />
        </GizmoHelper>

        <Environment preset={envPreset} environmentIntensity={envIntensity} />
      </Canvas>
    </div>
  );
}
