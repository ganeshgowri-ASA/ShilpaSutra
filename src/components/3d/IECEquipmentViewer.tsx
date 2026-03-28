'use client';

/**
 * IECEquipmentViewer.tsx — Dedicated 3D viewer for IEC test equipment.
 * Features: exploded view, cut-section (clip plane), wireframe overlay,
 * part highlighting on hover (raycasting), measurement tool, orbit/pan/zoom.
 */

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
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
  Plane,
  Raycaster,
  Color,
  type Object3D,
} from 'three';
import {
  type IECEquipmentGeometry,
  type GeomPrimitive,
  buildIECEquipmentGeometry,
  getAllIECGeometryIds,
  type IECGeometryBuilderId,
} from '@/lib/pv3DGeometry';
import { getIECMaterial } from '@/lib/materials3D';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ViewerState {
  exploded: boolean;
  explodeFactor: number;
  clipEnabled: boolean;
  clipZ: number;
  wireframe: boolean;
  measureMode: boolean;
}

interface MeasurePoint {
  position: Vector3;
  label: string;
}

// ─── Geometry factory ────────────────────────────────────────────────────────

function createGeometry(prim: GeomPrimitive) {
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

// ─── Single mesh component ───────────────────────────────────────────────────

interface PrimMeshProps {
  prim: GeomPrimitive;
  explodedOffset: Vector3;
  exploded: boolean;
  explodeFactor: number;
  wireframeOverlay: boolean;
  clipPlane: Plane | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onMeasureClick: (point: Vector3, label: string) => void;
  measureMode: boolean;
}

const PrimMesh = React.memo(function PrimMesh({
  prim,
  explodedOffset,
  exploded,
  explodeFactor,
  wireframeOverlay,
  clipPlane,
  hoveredId,
  onHover,
  onMeasureClick,
  measureMode,
}: PrimMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const geo = useMemo(() => createGeometry(prim), [prim]);
  const baseMat = useMemo(() => getIECMaterial(prim.material), [prim.material]);

  const mat = useMemo(() => {
    const m = baseMat.clone();
    if (wireframeOverlay) {
      m.wireframe = true;
      m.opacity = 0.4;
      m.transparent = true;
    }
    if (clipPlane) {
      m.clippingPlanes = [clipPlane];
      m.clipShadows = true;
    }
    return m;
  }, [baseMat, wireframeOverlay, clipPlane]);

  const isHovered = hoveredId === prim.id;

  useEffect(() => {
    if (meshRef.current) {
      const m = meshRef.current.material as MeshStandardMaterial;
      if (isHovered) {
        m.emissive = new Color('#00d4ff');
        m.emissiveIntensity = 0.35;
      } else {
        m.emissive = new Color('#000000');
        m.emissiveIntensity = 0;
      }
    }
  }, [isHovered]);

  // Exploded view position interpolation
  useFrame(() => {
    if (!meshRef.current) return;
    const [px, py, pz] = prim.position;
    const targetX = px + (exploded ? explodedOffset.x * explodeFactor : 0);
    const targetY = py + (exploded ? explodedOffset.y * explodeFactor : 0);
    const targetZ = pz + (exploded ? explodedOffset.z * explodeFactor : 0);
    meshRef.current.position.lerp(new Vector3(targetX, targetY, targetZ), 0.08);
  });

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onHover(prim.id);
    },
    [prim.id, onHover]
  );

  const handlePointerOut = useCallback(() => {
    onHover(null);
  }, [onHover]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (measureMode) {
        e.stopPropagation();
        const point = e.point.clone();
        onMeasureClick(point, prim.label);
      }
    },
    [measureMode, prim.label, onMeasureClick]
  );

  return (
    <mesh
      ref={meshRef}
      geometry={geo}
      material={mat}
      position={prim.position as [number, number, number]}
      rotation={prim.rotation as [number, number, number]}
      castShadow={prim.castShadow}
      receiveShadow={prim.receiveShadow}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      userData={{ primId: prim.id, primLabel: prim.label, primGroup: prim.group }}
    />
  );
});

// ─── Measurement line component ──────────────────────────────────────────────

function MeasurementLine({
  points,
  onClear,
}: {
  points: MeasurePoint[];
  onClear: () => void;
}) {
  if (points.length < 2) return null;
  const p1 = points[0].position;
  const p2 = points[1].position;
  const mid = new Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  const dist = p1.distanceTo(p2);

  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ff4444" linewidth={2} />
      </line>
      {/* Endpoint markers */}
      <mesh position={p1}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshBasicMaterial color="#ff4444" />
      </mesh>
      <mesh position={p2}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshBasicMaterial color="#ff4444" />
      </mesh>
      {/* Distance label */}
      <Html position={mid} center style={{ pointerEvents: 'auto' }}>
        <div
          className="bg-black/80 text-white px-2 py-1 rounded text-xs font-mono whitespace-nowrap cursor-pointer"
          onClick={onClear}
          title="Click to clear"
        >
          {(dist * 1000).toFixed(1)} mm
        </div>
      </Html>
    </group>
  );
}

// ─── Scene content ───────────────────────────────────────────────────────────

function SceneContent({
  geometry,
  state,
  hoveredId,
  setHoveredId,
  measurePoints,
  onMeasureClick,
  onClearMeasure,
}: {
  geometry: IECEquipmentGeometry;
  state: ViewerState;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  measurePoints: MeasurePoint[];
  onMeasureClick: (point: Vector3, label: string) => void;
  onClearMeasure: () => void;
}) {
  const { gl } = useThree();

  // Clip plane
  const clipPlane = useMemo(() => {
    if (!state.clipEnabled) return null;
    return new Plane(new Vector3(0, 0, -1), state.clipZ);
  }, [state.clipEnabled, state.clipZ]);

  useEffect(() => {
    gl.localClippingEnabled = state.clipEnabled;
  }, [gl, state.clipEnabled]);

  // Compute exploded offsets per group
  const groupCentroids = useMemo(() => {
    const groups = new Map<string, { sum: Vector3; count: number }>();
    for (const p of geometry.primitives) {
      const g = groups.get(p.group) ?? { sum: new Vector3(), count: 0 };
      g.sum.add(new Vector3(p.position[0], p.position[1], p.position[2]));
      g.count++;
      groups.set(p.group, g);
    }
    const centroids = new Map<string, Vector3>();
    groups.forEach((v, k) => {
      centroids.set(k, v.sum.divideScalar(v.count));
    });
    return centroids;
  }, [geometry.primitives]);

  const sceneCentroid = useMemo(() => {
    const c = new Vector3();
    let n = 0;
    groupCentroids.forEach((v) => {
      c.add(v);
      n++;
    });
    return n > 0 ? c.divideScalar(n) : c;
  }, [groupCentroids]);

  const explodedOffsets = useMemo(() => {
    const offsets = new Map<string, Vector3>();
    groupCentroids.forEach((centroid, group) => {
      const dir = new Vector3().subVectors(centroid, sceneCentroid);
      if (dir.length() < 0.001) dir.set(0, 1, 0);
      else dir.normalize();
      offsets.set(group, dir);
    });
    return offsets;
  }, [groupCentroids, sceneCentroid]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <hemisphereLight
        args={['#b1d8ff', '#444444', 0.5]}
      />

      {/* Environment map for PBR reflections */}
      <Environment preset="studio" />

      {/* Equipment meshes */}
      {geometry.primitives.map((prim) => (
        <PrimMesh
          key={prim.id}
          prim={prim}
          explodedOffset={explodedOffsets.get(prim.group) ?? new Vector3()}
          exploded={state.exploded}
          explodeFactor={state.explodeFactor}
          wireframeOverlay={state.wireframe}
          clipPlane={clipPlane}
          hoveredId={hoveredId}
          onHover={setHoveredId}
          onMeasureClick={onMeasureClick}
          measureMode={state.measureMode}
        />
      ))}

      {/* Measurement visualization */}
      <MeasurementLine points={measurePoints} onClear={onClearMeasure} />

      {/* Ground shadow */}
      <ContactShadows
        position={[0, -(geometry.boundingBox[1] / 2 + 0.01), 0]}
        opacity={0.5}
        scale={Math.max(geometry.boundingBox[0], geometry.boundingBox[2]) * 2}
        blur={1.5}
      />

      {/* Ground plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -(geometry.boundingBox[1] / 2 + 0.01), 0]}
        receiveShadow
      >
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#2a2a30" metalness={0} roughness={0.9} />
      </mesh>

      {/* Controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={0.1}
        maxDistance={50}
      />

      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport labelColor="white" axisHeadScale={1} />
      </GizmoHelper>
    </>
  );
}

// ─── Toolbar button ──────────────────────────────────────────────────────────

function ToolButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
        active
          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
          : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Main viewer component ───────────────────────────────────────────────────

interface IECEquipmentViewerProps {
  templateId?: string;
  className?: string;
}

export default function IECEquipmentViewer({
  templateId,
  className = '',
}: IECEquipmentViewerProps) {
  const [selectedId, setSelectedId] = useState<string>(
    templateId ?? 'iec_mechanical_load_fixture'
  );
  const [state, setState] = useState<ViewerState>({
    exploded: false,
    explodeFactor: 0.5,
    clipEnabled: false,
    clipZ: 0,
    wireframe: false,
    measureMode: false,
  });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [measurePoints, setMeasurePoints] = useState<MeasurePoint[]>([]);
  const [hoveredLabel, setHoveredLabel] = useState<string>('');

  const geometry = useMemo(() => buildIECEquipmentGeometry(selectedId), [selectedId]);

  const allIds = useMemo(() => getAllIECGeometryIds(), []);

  const handleMeasureClick = useCallback(
    (point: Vector3, label: string) => {
      setMeasurePoints((prev) => {
        if (prev.length >= 2) return [{ position: point, label }];
        return [...prev, { position: point, label }];
      });
    },
    []
  );

  const handleClearMeasure = useCallback(() => {
    setMeasurePoints([]);
  }, []);

  // Find hovered label for tooltip
  useEffect(() => {
    if (!hoveredId || !geometry) {
      setHoveredLabel('');
      return;
    }
    const prim = geometry.primitives.find((p) => p.id === hoveredId);
    setHoveredLabel(prim?.label ?? '');
  }, [hoveredId, geometry]);

  // Update selectedId when prop changes
  useEffect(() => {
    if (templateId) setSelectedId(templateId);
  }, [templateId]);

  const toggle = (key: keyof ViewerState) => {
    setState((s) => ({ ...s, [key]: !s[key] }));
  };

  if (!geometry) {
    return (
      <div className={`flex items-center justify-center h-full bg-surface-900 text-gray-400 ${className}`}>
        No geometry found for template: {selectedId}
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-surface-900 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-black/30 border-b border-white/5 flex-wrap">
        {/* Template selector */}
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="bg-white/5 border border-white/10 text-gray-200 text-xs rounded px-2 py-1.5 max-w-[200px]"
        >
          {allIds.map((id) => (
            <option key={id} value={id}>
              {id.replace('iec_', '').replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        <div className="w-px h-5 bg-white/10" />

        <ToolButton
          active={state.exploded}
          onClick={() => toggle('exploded')}
          title="Exploded View (E)"
        >
          Explode
        </ToolButton>

        {state.exploded && (
          <input
            type="range"
            min={0.1}
            max={2}
            step={0.05}
            value={state.explodeFactor}
            onChange={(e) =>
              setState((s) => ({ ...s, explodeFactor: parseFloat(e.target.value) }))
            }
            className="w-20 accent-cyan-500"
            title={`Explode factor: ${state.explodeFactor.toFixed(2)}`}
          />
        )}

        <ToolButton
          active={state.clipEnabled}
          onClick={() => toggle('clipEnabled')}
          title="Cut Section (C)"
        >
          Section
        </ToolButton>

        {state.clipEnabled && (
          <input
            type="range"
            min={-geometry.boundingBox[2] / 2}
            max={geometry.boundingBox[2] / 2}
            step={0.01}
            value={state.clipZ}
            onChange={(e) =>
              setState((s) => ({ ...s, clipZ: parseFloat(e.target.value) }))
            }
            className="w-20 accent-cyan-500"
            title={`Clip Z: ${state.clipZ.toFixed(2)}m`}
          />
        )}

        <ToolButton
          active={state.wireframe}
          onClick={() => toggle('wireframe')}
          title="Wireframe (W)"
        >
          Wire
        </ToolButton>

        <ToolButton
          active={state.measureMode}
          onClick={() => {
            toggle('measureMode');
            setMeasurePoints([]);
          }}
          title="Measure Tool (M)"
        >
          Measure
        </ToolButton>

        {measurePoints.length > 0 && state.measureMode && (
          <span className="text-xs text-gray-400 ml-1">
            {measurePoints.length === 1
              ? 'Click 2nd point...'
              : `${(measurePoints[0].position.distanceTo(measurePoints[1].position) * 1000).toFixed(1)} mm`}
          </span>
        )}

        <div className="flex-1" />

        {/* Part count */}
        <span className="text-xs text-gray-500">
          {geometry.primitives.length} parts
        </span>
      </div>

      {/* Hover tooltip */}
      {hoveredLabel && (
        <div className="absolute top-14 left-4 z-10 bg-black/80 text-cyan-300 text-xs px-2 py-1 rounded pointer-events-none">
          {hoveredLabel}
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative">
        <Canvas
          shadows="soft"
          dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          camera={{
            position: [
              geometry.boundingBox[0] * 1.2,
              geometry.boundingBox[1] * 1.0,
              geometry.boundingBox[2] * 1.5,
            ],
            fov: 45,
            near: 0.01,
            far: 100,
          }}
          onCreated={({ gl }) => {
            gl.localClippingEnabled = state.clipEnabled;
          }}
        >
          <SceneContent
            geometry={geometry}
            state={state}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            measurePoints={measurePoints}
            onMeasureClick={handleMeasureClick}
            onClearMeasure={handleClearMeasure}
          />
        </Canvas>

        {/* Keyboard shortcuts help */}
        <div className="absolute bottom-2 right-2 text-[10px] text-gray-600">
          LMB: Orbit | RMB: Pan | Scroll: Zoom
          {state.measureMode && ' | Click: Measure'}
        </div>
      </div>

      {/* Equipment info bar */}
      <div className="px-3 py-1.5 bg-black/30 border-t border-white/5 flex items-center gap-4">
        <span className="text-xs text-gray-300 font-medium">{geometry.name}</span>
        <span className="text-xs text-gray-500">{geometry.standard}</span>
        <span className="text-xs text-gray-600">
          {geometry.boundingBox.map((v) => `${(v * 1000).toFixed(0)}`).join(' × ')} mm
        </span>
      </div>
    </div>
  );
}
