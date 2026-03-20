"use client";
import { useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  GizmoHelper,
  GizmoViewport,
} from "@react-three/drei";
import { EffectComposer, SSAO } from "@react-three/postprocessing";
import * as THREE from "three";
import type { CadObject } from "@/stores/cad-store";

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

interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
}

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
  autoRotate?: boolean;
  rotateSpeed?: number;
  fov?: number;
  cameraPreset?: CameraPreset | null;
  antialias?: boolean;
  ssaoEnabled?: boolean;
  designerObjects?: CadObject[];
}

function CameraController({ preset, fov }: { preset?: CameraPreset | null; fov?: number }) {
  const { camera } = useThree();

  useEffect(() => {
    if (preset) {
      camera.position.set(...preset.position);
      camera.lookAt(new THREE.Vector3(...preset.target));
    }
  }, [preset, camera]);

  useEffect(() => {
    if (fov && camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [fov, camera]);

  return null;
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

function DesignerObjectMesh({ obj, material }: { obj: CadObject; material: PBRMaterial }) {
  const geo = (() => {
    switch (obj.type) {
      case "box":
        return <boxGeometry args={[obj.dimensions.width, obj.dimensions.height, obj.dimensions.depth]} />;
      case "cylinder":
        return <cylinderGeometry args={[obj.dimensions.width / 2, obj.dimensions.width / 2, obj.dimensions.height, 64]} />;
      case "sphere":
        return <sphereGeometry args={[obj.dimensions.width / 2, 64, 64]} />;
      case "cone":
        return <coneGeometry args={[obj.dimensions.width / 2, obj.dimensions.height, 64]} />;
      default:
        return <boxGeometry args={[obj.dimensions.width || 1, obj.dimensions.height || 1, obj.dimensions.depth || 1]} />;
    }
  })();

  return (
    <mesh
      position={obj.position}
      rotation={obj.rotation as unknown as [number, number, number]}
      castShadow
      receiveShadow
    >
      {geo}
      <meshStandardMaterial
        color={obj.color}
        metalness={material.metalness}
        roughness={material.roughness}
        emissive={material.emissive}
        emissiveIntensity={material.emissiveIntensity}
        opacity={obj.opacity}
        transparent={obj.opacity < 1}
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
  autoRotate = false,
  rotateSpeed = 1.0,
  fov = 45,
  cameraPreset = null,
  antialias = true,
  ssaoEnabled = false,
  designerObjects,
}: RendererViewportProps) {
  const hasDesignerObjects = designerObjects && designerObjects.length > 0;

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [4, 3, 4], fov, near: 0.1, far: 1000 }}
        shadows
        gl={{
          antialias,
          alpha: false,
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        style={{ background: bgColor }}
      >
        <CameraController preset={cameraPreset} fov={fov} />
        <SceneLights lights={lights} />

        {hasDesignerObjects ? (
          designerObjects!
            .filter(o => o.visible && ["box", "cylinder", "sphere", "cone"].includes(o.type))
            .map(obj => (
              <DesignerObjectMesh key={obj.id} obj={obj} material={material} />
            ))
        ) : (
          <RenderGeometry geometry={geometry} material={material} />
        )}

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

        {ssaoEnabled && (
          <EffectComposer>
            <SSAO
              radius={0.1}
              intensity={30}
              luminanceInfluence={0.6}
              color={new THREE.Color("black")}
            />
          </EffectComposer>
        )}

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          autoRotate={autoRotate}
          autoRotateSpeed={rotateSpeed * 2}
        />

        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport labelColor="white" axisHeadScale={0.8} />
        </GizmoHelper>

        <Environment preset={envPreset} environmentIntensity={envIntensity} />
      </Canvas>
    </div>
  );
}
