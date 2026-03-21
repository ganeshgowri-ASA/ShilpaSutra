"use client";
import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, GizmoHelper, GizmoViewport } from "@react-three/drei";
import * as THREE from "three";

interface CadParams {
  length: number;
  width: number;
  height: number;
  holeCount: number;
  holeDia: number;
  filletR: number;
}

interface Props {
  cadParams: CadParams;
  partName: string;
}

// ── Scale helper: normalise to ~2 units ───────────────────────────────────────
function scaleUnit(mm: number) {
  return mm / 60;
}

// ── Hole cylinders ─────────────────────────────────────────────────────────────
function HoleCylinder({
  x, y, z, r, h, color,
}: {
  x: number; y: number; z: number; r: number; h: number; color: string;
}) {
  return (
    <mesh position={[x, y, z]}>
      <cylinderGeometry args={[r, r, h, 24]} />
      <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
    </mesh>
  );
}

// ── Animated part ─────────────────────────────────────────────────────────────
function CadPart({ params }: { params: CadParams }) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.18;
    }
  });

  const L = scaleUnit(params.length);
  const W = scaleUnit(params.width);
  const H = scaleUnit(params.height);
  const hR = scaleUnit(params.holeDia / 2);

  // Hole positions: 4 corners inset
  const inset = L * 0.2;
  const holePositions: [number, number, number][] = [
    [-L / 2 + inset, 0, -W / 2 + inset],
    [L / 2 - inset, 0, -W / 2 + inset],
    [-L / 2 + inset, 0, W / 2 - inset],
    [L / 2 - inset, 0, W / 2 - inset],
  ];

  return (
    <group ref={groupRef}>
      {/* Main body */}
      <mesh
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <boxGeometry args={[L, H, W]} />
        <meshStandardMaterial
          color={hovered ? "#2a9fd4" : "#8ab4cd"}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Slot channel */}
      <mesh position={[0, H / 2 + 0.001, 0]}>
        <boxGeometry args={[L * 0.5, H * 0.4, W * 0.12]} />
        <meshStandardMaterial color="#1a3a55" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Through-holes */}
      {holePositions.slice(0, params.holeCount).map((pos, i) => (
        <HoleCylinder
          key={i}
          x={pos[0]} y={pos[1]} z={pos[2]}
          r={hR} h={H * 1.2}
          color="#1e2d3d"
        />
      ))}

      {/* Chamfer indicator on top edge */}
      <mesh position={[0, H / 2 + 0.001, W / 2 - 0.02]}>
        <boxGeometry args={[L * 0.95, 0.01, 0.04]} />
        <meshStandardMaterial color="#00D4FF" emissive="#00D4FF" emissiveIntensity={0.4} />
      </mesh>

      {/* Wireframe overlay */}
      <mesh>
        <boxGeometry args={[L, H, W]} />
        <meshBasicMaterial color="#00D4FF" wireframe opacity={0.08} transparent />
      </mesh>
    </group>
  );
}

// ── Axis labels ───────────────────────────────────────────────────────────────
function DimensionLabel({ text, position }: { text: string; position: [number, number, number] }) {
  return null; // Simplified: labels via HTML overlay
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function Scene({ params, partName }: { params: CadParams; partName: string }) {
  return (
    <>
      <color attach="background" args={["#0a0a0f"]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-3, 4, -4]} intensity={0.5} color="#4080ff" />
      <pointLight position={[0, 3, 0]} intensity={0.3} color="#00D4FF" />

      <CadPart params={params} />

      <Grid
        args={[12, 12]}
        position={[0, -scaleUnit(params.height) / 2 - 0.05, 0]}
        cellColor="#1e2a3a"
        sectionColor="#203040"
        fadeDistance={10}
        infiniteGrid
      />

      <OrbitControls makeDefault autoRotate={false} enablePan enableZoom enableRotate />

      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport axisColors={["#ff4060", "#60c030", "#2080ff"]} labelColor="white" />
      </GizmoHelper>
    </>
  );
}

// ── Exported component ────────────────────────────────────────────────────────
export default function PdfCadViewport({ cadParams, partName }: Props) {
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [3, 2.5, 3], fov: 45 }}
        shadows
        dpr={[1, 2]}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene params={cadParams} partName={partName} />
      </Canvas>

      {/* Overlay: dimension tags */}
      <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-none">
        <div className="bg-[#0d1117]/80 border border-[#21262d] rounded px-2 py-1 text-[10px] font-mono text-[#00D4FF]">
          L: {cadParams.length} mm
        </div>
        <div className="bg-[#0d1117]/80 border border-[#21262d] rounded px-2 py-1 text-[10px] font-mono text-[#00D4FF]">
          W: {cadParams.width} mm
        </div>
        <div className="bg-[#0d1117]/80 border border-[#21262d] rounded px-2 py-1 text-[10px] font-mono text-[#00D4FF]">
          H: {cadParams.height} mm
        </div>
      </div>

      {/* Part name */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#0d1117]/80 border border-[#21262d] rounded px-3 py-1 text-[11px] text-slate-400 font-semibold pointer-events-none">
        {partName}
      </div>
    </div>
  );
}
