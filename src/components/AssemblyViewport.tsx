"use client";
import { useCallback, useMemo } from "react";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewport,
  Environment,
  ContactShadows,
  Line,
} from "@react-three/drei";
import * as THREE from "three";

interface AssemblyPart {
  id: string;
  name: string;
  type: "box" | "cylinder" | "sphere" | "cone";
  position: [number, number, number];
  rotation: [number, number, number];
  dimensions: { width: number; height: number; depth: number };
  color: string;
  material: string;
  mass: number;
  locked: boolean;
}

interface AssemblyConstraint {
  id: string;
  type: string;
  partA: string;
  partB: string;
  label: string;
}

interface CollisionResult {
  partA: string;
  partB: string;
  overlap: number;
}

interface AssemblyViewportProps {
  parts: AssemblyPart[];
  constraints: AssemblyConstraint[];
  selectedPart: string | null;
  onSelectPart: (id: string | null) => void;
  exploded: boolean;
  explodeFactor: number;
  collisions: CollisionResult[];
}

function getExplodedPosition(
  part: AssemblyPart,
  allParts: AssemblyPart[],
  factor: number
): [number, number, number] {
  // Calculate centroid of all parts
  const cx = allParts.reduce((s, p) => s + p.position[0], 0) / allParts.length;
  const cy = allParts.reduce((s, p) => s + p.position[1], 0) / allParts.length;
  const cz = allParts.reduce((s, p) => s + p.position[2], 0) / allParts.length;

  const dx = part.position[0] - cx;
  const dy = part.position[1] - cy;
  const dz = part.position[2] - cz;

  return [
    cx + dx * factor,
    cy + dy * factor,
    cz + dz * factor,
  ];
}

function PartMesh({
  part,
  isSelected,
  onClick,
  explodedPos,
  hasCollision,
}: {
  part: AssemblyPart;
  isSelected: boolean;
  onClick: () => void;
  explodedPos: [number, number, number] | null;
  hasCollision: boolean;
}) {
  const pos = explodedPos || part.position;

  const geo = (() => {
    switch (part.type) {
      case "box":
        return <boxGeometry args={[part.dimensions.width, part.dimensions.height, part.dimensions.depth]} />;
      case "cylinder":
        return <cylinderGeometry args={[part.dimensions.width, part.dimensions.width, part.dimensions.height, 32]} />;
      case "sphere":
        return <sphereGeometry args={[part.dimensions.width, 32, 32]} />;
      case "cone":
        return <coneGeometry args={[part.dimensions.width, part.dimensions.height, 32]} />;
    }
  })();

  return (
    <mesh
      position={pos}
      rotation={part.rotation}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick();
      }}
      castShadow
      receiveShadow
    >
      {geo}
      <meshStandardMaterial
        color={hasCollision ? "#ff4444" : part.color}
        metalness={0.4}
        roughness={0.5}
        emissive={isSelected ? "#e94560" : hasCollision ? "#ff0000" : "#000000"}
        emissiveIntensity={isSelected ? 0.2 : hasCollision ? 0.1 : 0}
        transparent={isSelected}
        opacity={isSelected ? 0.9 : 1}
      />
      {isSelected && (
        <lineSegments>
          <edgesGeometry
            args={[
              (() => {
                switch (part.type) {
                  case "box":
                    return new THREE.BoxGeometry(part.dimensions.width, part.dimensions.height, part.dimensions.depth);
                  case "cylinder":
                    return new THREE.CylinderGeometry(part.dimensions.width, part.dimensions.width, part.dimensions.height, 32);
                  case "sphere":
                    return new THREE.SphereGeometry(part.dimensions.width, 16, 16);
                  case "cone":
                    return new THREE.ConeGeometry(part.dimensions.width, part.dimensions.height, 32);
                }
              })(),
            ]}
          />
          <lineBasicMaterial color="#e94560" linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  );
}

function ConstraintLines({
  constraints,
  parts,
  exploded,
  explodeFactor,
}: {
  constraints: AssemblyConstraint[];
  parts: AssemblyPart[];
  exploded: boolean;
  explodeFactor: number;
}) {
  return (
    <>
      {constraints.map((c) => {
        const partA = parts.find((p) => p.id === c.partA);
        const partB = parts.find((p) => p.id === c.partB);
        if (!partA || !partB) return null;

        const posA = exploded ? getExplodedPosition(partA, parts, explodeFactor) : partA.position;
        const posB = exploded ? getExplodedPosition(partB, parts, explodeFactor) : partB.position;

        const color =
          c.type === "fixed" ? "#4488ff" :
          c.type === "revolute" ? "#44ff88" :
          c.type === "prismatic" ? "#ffaa44" :
          "#aa44ff";

        return (
          <group key={c.id}>
            <Line points={[posA, posB]} color={color} lineWidth={1.5} dashed dashSize={0.1} gapSize={0.05} />
            {/* Joint indicator sphere at midpoint */}
            <mesh position={[(posA[0] + posB[0]) / 2, (posA[1] + posB[1]) / 2, (posA[2] + posB[2]) / 2]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color={color} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

export default function AssemblyViewport({
  parts,
  constraints,
  selectedPart,
  onSelectPart,
  exploded,
  explodeFactor,
  collisions,
}: AssemblyViewportProps) {
  const collidingParts = useMemo(() => {
    const set = new Set<string>();
    collisions.forEach((c) => { set.add(c.partA); set.add(c.partB); });
    return set;
  }, [collisions]);

  return (
    <div className="w-full h-full bg-[#0a0e17]">
      <Canvas
        camera={{ position: [6, 5, 6], fov: 50, near: 0.1, far: 1000 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#0a0e17" }}
        onPointerMissed={() => onSelectPart(null)}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <directionalLight position={[-3, 4, -5]} intensity={0.3} />

        <Grid
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#1a2744"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#0f3460"
          fadeDistance={20}
          infiniteGrid
        />

        <axesHelper args={[3]} />

        {parts.map((part) => (
          <PartMesh
            key={part.id}
            part={part}
            isSelected={selectedPart === part.id}
            onClick={() => onSelectPart(part.id)}
            explodedPos={exploded ? getExplodedPosition(part, parts, explodeFactor) : null}
            hasCollision={collidingParts.has(part.id)}
          />
        ))}

        <ConstraintLines
          constraints={constraints}
          parts={parts}
          exploded={exploded}
          explodeFactor={explodeFactor}
        />

        <ContactShadows position={[0, -0.01, 0]} opacity={0.4} blur={2} />

        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />

        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport labelColor="white" axisHeadScale={0.8} />
        </GizmoHelper>

        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
