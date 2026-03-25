"use client";
import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewport,
  Environment,
  Line,
} from "@react-three/drei";
import * as THREE from "three";

interface Load {
  id: string;
  type: string;
  face: string;
  magnitude: number;
  direction: [number, number, number];
}

interface Constraint {
  id: string;
  type: string;
  face: string;
}

interface SimResults {
  maxStress: number;
  minStress: number;
  maxDisplacement: number;
  safetyFactor: number;
  stressField: number[];
  converged: boolean;
  iterations: number;
}

interface SimulatorViewportProps {
  geometry: "box" | "cylinder" | "sphere";
  dimensions: { width: number; height: number; depth: number };
  loads: Load[];
  constraints: Constraint[];
  results: SimResults | null;
  showContour: boolean;
  meshRes: number;
  showWireframe?: boolean;
  elementType?: string;
}

const facePositions: Record<string, { pos: [number, number, number]; dir: [number, number, number] }> = {
  "Top (+Y)": { pos: [0, 1, 0], dir: [0, 1, 0] },
  "Bottom (-Y)": { pos: [0, -1, 0], dir: [0, -1, 0] },
  "Front (+Z)": { pos: [0, 0, 1], dir: [0, 0, 1] },
  "Back (-Z)": { pos: [0, 0, -1], dir: [0, 0, -1] },
  "Left (-X)": { pos: [-1, 0, 0], dir: [-1, 0, 0] },
  "Right (+X)": { pos: [1, 0, 0], dir: [1, 0, 0] },
};

// Color map: blue -> cyan -> green -> yellow -> red
function stressToColor(stress: number, minStress: number, maxStress: number): THREE.Color {
  const range = maxStress - minStress;
  if (range === 0) return new THREE.Color(0x0000ff);

  const t = Math.max(0, Math.min(1, (stress - minStress) / range));

  // 5-color gradient
  if (t < 0.25) {
    const s = t / 0.25;
    return new THREE.Color().setRGB(0, s, 1);
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return new THREE.Color().setRGB(0, 1, 1 - s);
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return new THREE.Color().setRGB(s, 1, 0);
  } else {
    const s = (t - 0.75) / 0.25;
    return new THREE.Color().setRGB(1, 1 - s, 0);
  }
}

/* ── Geometry with stress contour ── */
function SimGeometry({
  geometry,
  dimensions,
  results,
  showContour,
  meshRes,
}: {
  geometry: "box" | "cylinder" | "sphere";
  dimensions: { width: number; height: number; depth: number };
  results: SimResults | null;
  showContour: boolean;
  meshRes: number;
}) {
  const geo = useMemo(() => {
    const segs = Math.max(8, meshRes);
    switch (geometry) {
      case "box":
        return new THREE.BoxGeometry(
          dimensions.width,
          dimensions.height,
          dimensions.depth,
          segs,
          segs,
          segs
        );
      case "cylinder":
        return new THREE.CylinderGeometry(
          dimensions.width,
          dimensions.width,
          dimensions.height,
          32,
          segs
        );
      case "sphere":
        return new THREE.SphereGeometry(dimensions.width, segs, segs);
    }
  }, [geometry, dimensions, meshRes]);

  const coloredGeo = useMemo(() => {
    if (!showContour || !results || results.stressField.length === 0) return null;

    const g = geo.clone();
    const posAttr = g.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      // Map vertex position to stress field
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);

      // Normalize to 0-1 based on geometry bounds
      const hw = dimensions.width / 2;
      const hh = dimensions.height / 2;
      const hd = dimensions.depth / 2;

      const nx = Math.max(0, Math.min(1, (x + hw) / (hw * 2)));
      const ny = Math.max(0, Math.min(1, (y + hh) / (hh * 2)));

      // Sample stress field
      const gridSize = Math.round(Math.sqrt(results.stressField.length));
      const gi = Math.min(gridSize - 1, Math.floor(nx * (gridSize - 1)));
      const gj = Math.min(gridSize - 1, Math.floor(ny * (gridSize - 1)));
      const stressIdx = gj * gridSize + gi;
      const stress = results.stressField[stressIdx] || 0;

      const c = stressToColor(stress, results.minStress, results.maxStress);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [geo, showContour, results, dimensions]);

  return (
    <group position={[0, dimensions.height / 2, 0]}>
      <mesh geometry={coloredGeo || geo}>
        {showContour && coloredGeo ? (
          <meshStandardMaterial
            vertexColors
            metalness={0.1}
            roughness={0.6}
            side={THREE.DoubleSide}
          />
        ) : (
          <meshStandardMaterial
            color="#4a6a8a"
            metalness={0.3}
            roughness={0.5}
            transparent
            opacity={0.85}
          />
        )}
      </mesh>
      {/* Wireframe overlay */}
      <mesh geometry={geo}>
        <meshBasicMaterial wireframe color="#ffffff" transparent opacity={0.05} />
      </mesh>
    </group>
  );
}

/* ── Force arrows ── */
function ForceArrow({ load, dimensions }: { load: Load; dimensions: { width: number; height: number; depth: number } }) {
  const faceInfo = facePositions[load.face];
  if (!faceInfo) return null;

  const hw = dimensions.width / 2;
  const hh = dimensions.height / 2;
  const hd = dimensions.depth / 2;

  // Position arrow at face center
  const basePos: [number, number, number] = [
    faceInfo.pos[0] * hw,
    faceInfo.pos[1] * hh + dimensions.height / 2,
    faceInfo.pos[2] * hd,
  ];

  const arrowLength = 1.5;
  const dir = load.direction;
  const tipPos: [number, number, number] = [
    basePos[0] + dir[0] * arrowLength,
    basePos[1] + dir[1] * arrowLength,
    basePos[2] + dir[2] * arrowLength,
  ];

  // Arrow head
  const headSize = 0.15;
  const headBase: [number, number, number] = [
    tipPos[0] - dir[0] * 0.3,
    tipPos[1] - dir[1] * 0.3,
    tipPos[2] - dir[2] * 0.3,
  ];

  return (
    <group>
      {/* Arrow shaft */}
      <Line
        points={[basePos, tipPos]}
        color="#ff4444"
        lineWidth={3}
      />
      {/* Arrow head (cone) */}
      <mesh position={tipPos}>
        <coneGeometry args={[headSize, 0.3, 8]} />
        <meshBasicMaterial color="#ff4444" />
      </mesh>
      {/* Force label */}
      <group position={[tipPos[0] + 0.3, tipPos[1] + 0.2, tipPos[2]]}>
        <mesh>
          <planeGeometry args={[0.8, 0.25]} />
          <meshBasicMaterial color="#ff4444" transparent opacity={0.8} />
        </mesh>
      </group>
    </group>
  );
}

/* ── Fixed support visualization ── */
function FixedSupport({ constraint, dimensions }: { constraint: Constraint; dimensions: { width: number; height: number; depth: number } }) {
  const faceInfo = facePositions[constraint.face];
  if (!faceInfo) return null;

  const hw = dimensions.width / 2;
  const hh = dimensions.height / 2;
  const hd = dimensions.depth / 2;

  const pos: [number, number, number] = [
    faceInfo.pos[0] * hw,
    faceInfo.pos[1] * hh + dimensions.height / 2,
    faceInfo.pos[2] * hd,
  ];

  // Ground hatching lines
  const lines: [number, number, number][][] = [];
  const n = 5;
  const size = 0.8;

  for (let i = 0; i <= n; i++) {
    const t = -size / 2 + (i / n) * size;
    // Create hash marks perpendicular to the face
    if (Math.abs(faceInfo.dir[1]) > 0.5) {
      // Top/bottom face
      lines.push([
        [pos[0] + t, pos[1], pos[2] - size / 2],
        [pos[0] + t - 0.15, pos[1] - 0.2 * Math.sign(faceInfo.dir[1]), pos[2] - size / 2],
      ]);
    } else if (Math.abs(faceInfo.dir[0]) > 0.5) {
      // Left/right face
      lines.push([
        [pos[0], pos[1] + t, pos[2]],
        [pos[0] - 0.2 * Math.sign(faceInfo.dir[0]), pos[1] + t - 0.15, pos[2]],
      ]);
    } else {
      // Front/back face
      lines.push([
        [pos[0] + t, pos[1], pos[2]],
        [pos[0] + t - 0.15, pos[1], pos[2] - 0.2 * Math.sign(faceInfo.dir[2])],
      ]);
    }
  }

  return (
    <group>
      {/* Fixed support indicator - triangles */}
      {lines.map((pts, i) => (
        <Line key={i} points={pts} color="#4488ff" lineWidth={2} />
      ))}
      {/* Support base line */}
      <mesh position={pos}>
        <boxGeometry args={[
          Math.abs(faceInfo.dir[0]) > 0.5 ? 0.05 : size,
          Math.abs(faceInfo.dir[1]) > 0.5 ? 0.05 : size,
          Math.abs(faceInfo.dir[2]) > 0.5 ? 0.05 : size,
        ]} />
        <meshBasicMaterial color="#4488ff" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

/* ── Pinned support visualization ── */
function PinnedSupport({ constraint, dimensions }: { constraint: Constraint; dimensions: { width: number; height: number; depth: number } }) {
  const faceInfo = facePositions[constraint.face];
  if (!faceInfo) return null;

  const hw = dimensions.width / 2;
  const hh = dimensions.height / 2;
  const hd = dimensions.depth / 2;
  const pos: [number, number, number] = [
    faceInfo.pos[0] * hw,
    faceInfo.pos[1] * hh + dimensions.height / 2,
    faceInfo.pos[2] * hd,
  ];

  return (
    <group>
      {/* Pin triangle */}
      <mesh position={[pos[0], pos[1] - 0.15, pos[2]]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.2, 0.3, 3]} />
        <meshBasicMaterial color="#44bb44" transparent opacity={0.7} />
      </mesh>
      {/* Pin circle */}
      <mesh position={pos}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshBasicMaterial color="#44bb44" />
      </mesh>
    </group>
  );
}

/* ── Roller support visualization ── */
function RollerSupport({ constraint, dimensions }: { constraint: Constraint; dimensions: { width: number; height: number; depth: number } }) {
  const faceInfo = facePositions[constraint.face];
  if (!faceInfo) return null;

  const hw = dimensions.width / 2;
  const hh = dimensions.height / 2;
  const hd = dimensions.depth / 2;
  const pos: [number, number, number] = [
    faceInfo.pos[0] * hw,
    faceInfo.pos[1] * hh + dimensions.height / 2,
    faceInfo.pos[2] * hd,
  ];

  const rollers: [number, number, number][] = [];
  for (let i = -1; i <= 1; i++) {
    const offset = i * 0.25;
    if (Math.abs(faceInfo.dir[1]) > 0.5) {
      rollers.push([pos[0] + offset, pos[1] - 0.2 * Math.sign(faceInfo.dir[1]), pos[2]]);
    } else if (Math.abs(faceInfo.dir[0]) > 0.5) {
      rollers.push([pos[0] - 0.2 * Math.sign(faceInfo.dir[0]), pos[1] + offset, pos[2]]);
    } else {
      rollers.push([pos[0] + offset, pos[1], pos[2] - 0.2 * Math.sign(faceInfo.dir[2])]);
    }
  }

  return (
    <group>
      {rollers.map((rPos, i) => (
        <mesh key={i} position={rPos} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.12, 12]} />
          <meshBasicMaterial color="#dddd44" />
        </mesh>
      ))}
      {/* Ground line beneath rollers */}
      <Line
        points={[
          [rollers[0][0] - 0.1, rollers[0][1] - 0.08, rollers[0][2]],
          [rollers[2][0] + 0.1, rollers[2][1] - 0.08, rollers[2][2]],
        ]}
        color="#dddd44"
        lineWidth={2}
      />
    </group>
  );
}

/* ── Spring support visualization ── */
function SpringSupport({ constraint, dimensions }: { constraint: Constraint; dimensions: { width: number; height: number; depth: number } }) {
  const faceInfo = facePositions[constraint.face];
  if (!faceInfo) return null;

  const hw = dimensions.width / 2;
  const hh = dimensions.height / 2;
  const hd = dimensions.depth / 2;
  const pos: [number, number, number] = [
    faceInfo.pos[0] * hw,
    faceInfo.pos[1] * hh + dimensions.height / 2,
    faceInfo.pos[2] * hd,
  ];

  // Zigzag spring along the face normal direction
  const springPts: [number, number, number][] = [];
  const coils = 5;
  const springLen = 0.8;
  const amplitude = 0.12;
  const dir = faceInfo.dir;

  for (let i = 0; i <= coils * 4; i++) {
    const t = i / (coils * 4);
    const along = t * springLen;
    const lateral = (i % 2 === 0 ? 1 : -1) * amplitude * (i > 0 && i < coils * 4 ? 1 : 0);
    springPts.push([
      pos[0] + dir[0] * along + (Math.abs(dir[1]) > 0.5 ? lateral : 0),
      pos[1] + dir[1] * along + (Math.abs(dir[0]) > 0.5 ? lateral : Math.abs(dir[2]) > 0.5 ? lateral : 0),
      pos[2] + dir[2] * along,
    ]);
  }

  return (
    <group>
      <Line points={springPts} color="#bb44ff" lineWidth={2.5} />
      <mesh position={[pos[0] + dir[0] * springLen, pos[1] + dir[1] * springLen, pos[2] + dir[2] * springLen]}>
        <boxGeometry args={[0.3, 0.05, 0.3]} />
        <meshBasicMaterial color="#bb44ff" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

/* ── Pressure load visualization (distributed arrows) ── */
function PressureArrows({ load, dimensions }: { load: Load; dimensions: { width: number; height: number; depth: number } }) {
  const faceInfo = facePositions[load.face];
  if (!faceInfo) return null;

  const hw = dimensions.width / 2;
  const hh = dimensions.height / 2;
  const hd = dimensions.depth / 2;

  const basePos: [number, number, number] = [
    faceInfo.pos[0] * hw,
    faceInfo.pos[1] * hh + dimensions.height / 2,
    faceInfo.pos[2] * hd,
  ];

  const arrows: [number, number, number][] = [];
  const grid = 3;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const spread = 0.3;
      if (Math.abs(faceInfo.dir[1]) > 0.5) {
        arrows.push([basePos[0] + i * spread, basePos[1], basePos[2] + j * spread]);
      } else if (Math.abs(faceInfo.dir[0]) > 0.5) {
        arrows.push([basePos[0], basePos[1] + i * spread, basePos[2] + j * spread]);
      } else {
        arrows.push([basePos[0] + i * spread, basePos[1] + j * spread, basePos[2]]);
      }
    }
  }

  const dir = load.direction;
  const arrowLen = 0.6;

  return (
    <group>
      {arrows.map((aPos, idx) => {
        const tip: [number, number, number] = [
          aPos[0] + dir[0] * arrowLen,
          aPos[1] + dir[1] * arrowLen,
          aPos[2] + dir[2] * arrowLen,
        ];
        return (
          <group key={idx}>
            <Line points={[aPos, tip]} color="#ff8844" lineWidth={2} />
            <mesh position={tip}>
              <coneGeometry args={[0.06, 0.15, 6]} />
              <meshBasicMaterial color="#ff8844" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ── Select constraint visualization by type ── */
function ConstraintVis({ constraint, dimensions }: { constraint: Constraint; dimensions: { width: number; height: number; depth: number } }) {
  switch (constraint.type) {
    case "pinned":
      return <PinnedSupport constraint={constraint} dimensions={dimensions} />;
    case "roller":
      return <RollerSupport constraint={constraint} dimensions={dimensions} />;
    case "spring":
      return <SpringSupport constraint={constraint} dimensions={dimensions} />;
    default:
      return <FixedSupport constraint={constraint} dimensions={dimensions} />;
  }
}

/* ── Select load visualization by type ── */
function LoadVis({ load, dimensions }: { load: Load; dimensions: { width: number; height: number; depth: number } }) {
  if (load.type === "pressure" || load.type === "distributed") {
    return <PressureArrows load={load} dimensions={dimensions} />;
  }
  return <ForceArrow load={load} dimensions={dimensions} />;
}

export default function SimulatorViewport({
  geometry,
  dimensions,
  loads,
  constraints,
  results,
  showContour,
  meshRes,
  showWireframe,
}: SimulatorViewportProps) {
  return (
    <div className="w-full h-full bg-[#0a0e17]">
      <Canvas
        camera={{ position: [4, 4, 4], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#0a0e17" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={0.7} />
        <directionalLight position={[-3, 4, -5]} intensity={0.3} />

        <Grid
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#1a2744"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#0f3460"
          fadeDistance={15}
          infiniteGrid
        />

        <axesHelper args={[2]} />

        <SimGeometry
          geometry={geometry}
          dimensions={dimensions}
          results={results}
          showContour={showContour}
          meshRes={meshRes}
        />

        {/* Wireframe overlay (toggled) */}
        {showWireframe && (
          <group position={[0, dimensions.height / 2, 0]}>
            <mesh>
              {geometry === "box" ? (
                <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth, meshRes, meshRes, meshRes]} />
              ) : geometry === "cylinder" ? (
                <cylinderGeometry args={[dimensions.width, dimensions.width, dimensions.height, 32, meshRes]} />
              ) : (
                <sphereGeometry args={[dimensions.width, meshRes, meshRes]} />
              )}
              <meshBasicMaterial wireframe color="#00D4FF" transparent opacity={0.15} />
            </mesh>
          </group>
        )}

        {/* Load visualizations (type-aware) */}
        {loads.map((load) => (
          <LoadVis key={load.id} load={load} dimensions={dimensions} />
        ))}

        {/* Constraint visualizations (type-aware) */}
        {constraints.map((c) => (
          <ConstraintVis key={c.id} constraint={c} dimensions={dimensions} />
        ))}

        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />

        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport labelColor="white" axisHeadScale={0.8} />
        </GizmoHelper>

        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
