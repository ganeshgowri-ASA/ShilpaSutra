'use client';

/**
 * PVArrayViewer.tsx — Upgraded 3D viewer for PV arrays and IEC equipment.
 * Uses geometry from pv3DGeometry.ts, PBR materials from materials3D.ts,
 * proper lighting (directional + ambient + hemisphere), shadow mapping.
 */

import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import {
  OrbitControls,
  GizmoHelper,
  GizmoViewport,
  Environment,
  ContactShadows,
  Html,
} from '@react-three/drei';
import {
  Group,
  Mesh,
  Vector3,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  MeshStandardMaterial,
  Color,
} from 'three';
import { buildPVArray, type PVArrayParams, type PVBuildResult } from '@/lib/pvModule3DBuilder';
import { getPVMaterial, buildPVScene, framePVCamera, disposePVScene } from '@/lib/pvGeometryRenderer';
import {
  type IECEquipmentGeometry,
  type GeomPrimitive,
  buildIECEquipmentGeometry,
} from '@/lib/pv3DGeometry';
import { getIECMaterial } from '@/lib/materials3D';

// ─── IEC Equipment mesh (single primitive) ───────────────────────────────────

function createGeomFromPrimitive(prim: GeomPrimitive) {
  const [a, b, c] = prim.dimensions;
  switch (prim.type) {
    case 'box':
      return new BoxGeometry(a, b, c);
    case 'cylinder':
      return new CylinderGeometry(a, a, b, 24);
    case 'torus':
      return new TorusGeometry(a, b, 24, 12);
    case 'sphere':
      return new SphereGeometry(a, 24, 16);
  }
}

function IECPrimitiveMesh({
  prim,
  hoveredId,
  onHover,
}: {
  prim: GeomPrimitive;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}) {
  const meshRef = useRef<Mesh>(null);
  const geo = useMemo(() => createGeomFromPrimitive(prim), [prim]);
  const mat = useMemo(() => getIECMaterial(prim.material), [prim.material]);
  const isHovered = hoveredId === prim.id;

  useEffect(() => {
    if (!meshRef.current) return;
    const m = meshRef.current.material as MeshStandardMaterial;
    if (isHovered) {
      m.emissive = new Color('#00d4ff');
      m.emissiveIntensity = 0.3;
    } else {
      m.emissive = new Color('#000000');
      m.emissiveIntensity = 0;
    }
  }, [isHovered]);

  return (
    <mesh
      ref={meshRef}
      geometry={geo}
      material={mat}
      position={prim.position as [number, number, number]}
      rotation={prim.rotation as [number, number, number]}
      castShadow
      receiveShadow
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(prim.id);
      }}
      onPointerOut={() => onHover(null)}
    />
  );
}

// ─── IEC Equipment scene ─────────────────────────────────────────────────────

function IECEquipmentScene({
  geometry,
  hoveredId,
  onHover,
}: {
  geometry: IECEquipmentGeometry;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}) {
  return (
    <group>
      {geometry.primitives.map((prim) => (
        <IECPrimitiveMesh
          key={prim.id}
          prim={prim}
          hoveredId={hoveredId}
          onHover={onHover}
        />
      ))}
    </group>
  );
}

// ─── PV Array scene (using existing pvGeometryRenderer) ──────────────────────

function PVArrayScene({ buildResult }: { buildResult: PVBuildResult }) {
  const groupRef = useRef<Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    // Clear previous children
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }
    const scene = buildPVScene(buildResult, { addLights: false, useSubGroups: true });
    groupRef.current.add(scene);

    return () => {
      disposePVScene(scene);
    };
  }, [buildResult]);

  return <group ref={groupRef} />;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export type PVViewerMode = 'pv_array' | 'iec_equipment';

interface PVArrayViewerProps {
  mode?: PVViewerMode;
  pvParams?: Partial<PVArrayParams>;
  iecTemplateId?: string;
  className?: string;
}

export default function PVArrayViewer({
  mode = 'pv_array',
  pvParams,
  iecTemplateId = 'iec_mechanical_load_fixture',
  className = '',
}: PVArrayViewerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState('');

  // PV array build result
  const pvBuildResult = useMemo(() => {
    if (mode !== 'pv_array') return null;
    return buildPVArray(pvParams ?? {});
  }, [mode, pvParams]);

  // IEC equipment geometry
  const iecGeometry = useMemo(() => {
    if (mode !== 'iec_equipment') return null;
    return buildIECEquipmentGeometry(iecTemplateId) ?? null;
  }, [mode, iecTemplateId]);

  // Camera position
  const cameraPos = useMemo((): [number, number, number] => {
    if (mode === 'iec_equipment' && iecGeometry) {
      const [bx, by, bz] = iecGeometry.boundingBox;
      return [bx * 1.2, by * 1.0, bz * 1.5];
    }
    return [15, 12, 20];
  }, [mode, iecGeometry]);

  // Hover label
  useEffect(() => {
    if (!hoveredId || !iecGeometry) {
      setHoveredLabel('');
      return;
    }
    const prim = iecGeometry.primitives.find((p) => p.id === hoveredId);
    setHoveredLabel(prim?.label ?? '');
  }, [hoveredId, iecGeometry]);

  return (
    <div className={`relative w-full h-full bg-surface-900 ${className}`}>
      {/* Part label tooltip */}
      {hoveredLabel && (
        <div className="absolute top-3 left-3 z-10 bg-black/80 text-cyan-300 text-xs px-2 py-1 rounded pointer-events-none">
          {hoveredLabel}
        </div>
      )}

      <Canvas
        shadows="soft"
        dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        camera={{
          position: cameraPos,
          fov: 45,
          near: 0.01,
          far: 1000,
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[8, 12, 6]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
        />
        <hemisphereLight args={['#b1d8ff', '#444444', 0.5]} />
        <Environment preset="studio" />

        {/* Scene content */}
        {mode === 'pv_array' && pvBuildResult && (
          <PVArrayScene buildResult={pvBuildResult} />
        )}

        {mode === 'iec_equipment' && iecGeometry && (
          <IECEquipmentScene
            geometry={iecGeometry}
            hoveredId={hoveredId}
            onHover={setHoveredId}
          />
        )}

        {/* Ground */}
        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={0.4}
          scale={30}
          blur={1.5}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#2a2a30" metalness={0} roughness={0.9} />
        </mesh>

        {/* Controls */}
        <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport labelColor="white" axisHeadScale={1} />
        </GizmoHelper>
      </Canvas>

      {/* Info bar */}
      {mode === 'iec_equipment' && iecGeometry && (
        <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-black/50 flex items-center gap-3">
          <span className="text-xs text-gray-300 font-medium">{iecGeometry.name}</span>
          <span className="text-xs text-gray-500">{iecGeometry.standard}</span>
          <span className="text-xs text-gray-600">{iecGeometry.primitives.length} parts</span>
        </div>
      )}
      {mode === 'pv_array' && pvBuildResult && (
        <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-black/50 flex items-center gap-3">
          <span className="text-xs text-gray-300 font-medium">
            PV Array {pvBuildResult.meta.totalModules} modules
          </span>
          <span className="text-xs text-gray-500">
            {pvBuildResult.meta.dcCapacityKWp} kWp
          </span>
          <span className="text-xs text-gray-600">
            {pvBuildResult.primitives.length} parts
          </span>
        </div>
      )}
    </div>
  );
}
