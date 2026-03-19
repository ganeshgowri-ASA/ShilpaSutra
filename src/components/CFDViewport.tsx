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

interface ThermalBoundary {
  id: string;
  face: string;
  type: string;
  value: number;
  heatTransferCoeff?: number;
  ambientTemp?: number;
}

interface CFDResults {
  temperatureField: number[];
  velocityField: number[];
  pressureField: number[];
  minTemp: number;
  maxTemp: number;
  avgTemp: number;
  maxVelocity: number;
  convergenceHistory: number[];
  iterations: number;
  converged: boolean;
}

interface CFDViewportProps {
  geometry: "box" | "cylinder" | "sphere";
  dimensions: { width: number; height: number; depth: number };
  boundaries: ThermalBoundary[];
  results: CFDResults | null;
  displayMode: "temperature" | "velocity" | "pressure";
  meshRes: number;
}

const faces = ["Top (+Y)", "Bottom (-Y)", "Front (+Z)", "Back (-Z)", "Left (-X)", "Right (+X)"];

const facePositions: Record<string, { pos: [number, number, number]; dir: [number, number, number] }> = {
  "Top (+Y)": { pos: [0, 1, 0], dir: [0, 1, 0] },
  "Bottom (-Y)": { pos: [0, -1, 0], dir: [0, -1, 0] },
  "Front (+Z)": { pos: [0, 0, 1], dir: [0, 0, 1] },
  "Back (-Z)": { pos: [0, 0, -1], dir: [0, 0, -1] },
  "Left (-X)": { pos: [-1, 0, 0], dir: [-1, 0, 0] },
  "Right (+X)": { pos: [1, 0, 0], dir: [1, 0, 0] },
};

function fieldToColor(value: number, min: number, max: number): THREE.Color {
  const range = max - min;
  if (range === 0) return new THREE.Color(0x0000ff);
  const t = Math.max(0, Math.min(1, (value - min) / range));

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

function CFDGeometry({
  geometry,
  dimensions,
  results,
  displayMode,
  meshRes,
}: {
  geometry: "box" | "cylinder" | "sphere";
  dimensions: { width: number; height: number; depth: number };
  results: CFDResults | null;
  displayMode: string;
  meshRes: number;
}) {
  const geo = useMemo(() => {
    const segs = Math.max(8, meshRes);
    switch (geometry) {
      case "box":
        return new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.depth, segs, segs, segs);
      case "cylinder":
        return new THREE.CylinderGeometry(dimensions.width, dimensions.width, dimensions.height, 32, segs);
      case "sphere":
        return new THREE.SphereGeometry(dimensions.width, segs, segs);
    }
  }, [geometry, dimensions, meshRes]);

  const coloredGeo = useMemo(() => {
    if (!results) return null;

    const field =
      displayMode === "temperature" ? results.temperatureField :
      displayMode === "velocity" ? results.velocityField :
      results.pressureField;

    if (field.length === 0) return null;

    let min: number, max: number;
    if (displayMode === "temperature") {
      min = results.minTemp + 273.15;
      max = results.maxTemp + 273.15;
    } else if (displayMode === "velocity") {
      min = 0;
      max = results.maxVelocity || 1;
    } else {
      const validP = field.filter((v) => v > 0);
      min = Math.min(...validP);
      max = Math.max(...validP);
    }

    const g = geo.clone();
    const posAttr = g.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);

      const hw = dimensions.width / 2;
      const hh = dimensions.height / 2;

      const nx = Math.max(0, Math.min(1, (x + hw) / (hw * 2)));
      const ny = Math.max(0, Math.min(1, (y + hh) / (hh * 2)));

      const gridSize = Math.round(Math.sqrt(field.length));
      const gi = Math.min(gridSize - 1, Math.floor(nx * (gridSize - 1)));
      const gj = Math.min(gridSize - 1, Math.floor(ny * (gridSize - 1)));
      const fieldIdx = gj * gridSize + gi;
      const value = field[fieldIdx] || 0;

      const c = fieldToColor(value, min, max);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [geo, results, displayMode, dimensions]);

  return (
    <group position={[0, dimensions.height / 2, 0]}>
      <mesh geometry={coloredGeo || geo}>
        {coloredGeo ? (
          <meshStandardMaterial vertexColors metalness={0.1} roughness={0.6} side={THREE.DoubleSide} />
        ) : (
          <meshStandardMaterial color="#4a6a8a" metalness={0.3} roughness={0.5} transparent opacity={0.85} />
        )}
      </mesh>
      <mesh geometry={geo}>
        <meshBasicMaterial wireframe color="#ffffff" transparent opacity={0.05} />
      </mesh>
    </group>
  );
}

function BoundaryIndicator({
  boundary,
  dimensions,
}: {
  boundary: ThermalBoundary;
  dimensions: { width: number; height: number; depth: number };
}) {
  const faceInfo = facePositions[boundary.face];
  if (!faceInfo) return null;

  const hw = dimensions.width / 2;
  const hh = dimensions.height / 2;
  const hd = dimensions.depth / 2;

  const pos: [number, number, number] = [
    faceInfo.pos[0] * hw,
    faceInfo.pos[1] * hh + dimensions.height / 2,
    faceInfo.pos[2] * hd,
  ];

  const color =
    boundary.type === "temperature" ? "#ff4444" :
    boundary.type === "heatFlux" ? "#ff8800" :
    boundary.type === "convection" ? "#44aaff" :
    "#888888";

  return (
    <group>
      <mesh position={pos}>
        <boxGeometry
          args={[
            Math.abs(faceInfo.dir[0]) > 0.5 ? 0.05 : dimensions.width * 0.6,
            Math.abs(faceInfo.dir[1]) > 0.5 ? 0.05 : dimensions.height * 0.6,
            Math.abs(faceInfo.dir[2]) > 0.5 ? 0.05 : dimensions.depth * 0.6,
          ]}
        />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
      {/* Heat flow arrows for heat flux type */}
      {boundary.type === "heatFlux" &&
        [-0.3, 0, 0.3].map((offset, i) => {
          const arrowStart: [number, number, number] = [
            pos[0] + (Math.abs(faceInfo.dir[0]) < 0.5 ? offset : 0),
            pos[1] + (Math.abs(faceInfo.dir[1]) < 0.5 ? offset : 0),
            pos[2] + (Math.abs(faceInfo.dir[2]) < 0.5 ? offset : 0),
          ];
          const arrowEnd: [number, number, number] = [
            arrowStart[0] - faceInfo.dir[0] * 0.5,
            arrowStart[1] - faceInfo.dir[1] * 0.5,
            arrowStart[2] - faceInfo.dir[2] * 0.5,
          ];
          return <Line key={i} points={[arrowStart, arrowEnd]} color="#ff8800" lineWidth={2} />;
        })}
    </group>
  );
}

// Streamlines visualization
function Streamlines({ dimensions, results }: { dimensions: { width: number; height: number; depth: number }; results: CFDResults }) {
  const streamlines = useMemo(() => {
    const lines: [number, number, number][][] = [];
    const nLines = 8;
    const hw = dimensions.width / 2;
    const hh = dimensions.height / 2;

    for (let i = 0; i < nLines; i++) {
      const y = -hh + ((i + 0.5) / nLines) * dimensions.height;
      const points: [number, number, number][] = [];
      const nPoints = 20;

      for (let j = 0; j <= nPoints; j++) {
        const t = j / nPoints;
        const x = -hw + t * dimensions.width;
        // Parabolic velocity profile
        const velFactor = 1 - Math.pow(2 * (y / dimensions.height), 2);
        const yOffset = Math.sin(t * Math.PI * 2) * 0.02 * velFactor;
        points.push([x, y + dimensions.height / 2 + yOffset, 0]);
      }
      lines.push(points);
    }
    return lines;
  }, [dimensions, results]);

  return (
    <group>
      {streamlines.map((points, i) => (
        <Line key={i} points={points} color="#00ffff" lineWidth={1} transparent opacity={0.4} />
      ))}
    </group>
  );
}

export default function CFDViewport({
  geometry,
  dimensions,
  boundaries,
  results,
  displayMode,
  meshRes,
}: CFDViewportProps) {
  return (
    <div className="w-full h-full bg-[#0a0e17]">
      <Canvas
        camera={{ position: [4, 3, 4], fov: 50, near: 0.1, far: 1000 }}
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

        <CFDGeometry
          geometry={geometry}
          dimensions={dimensions}
          results={results}
          displayMode={displayMode}
          meshRes={meshRes}
        />

        {boundaries.map((bc) => (
          <BoundaryIndicator key={bc.id} boundary={bc} dimensions={dimensions} />
        ))}

        {results && displayMode === "velocity" && (
          <Streamlines dimensions={dimensions} results={results} />
        )}

        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />

        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport labelColor="white" axisHeadScale={0.8} />
        </GizmoHelper>

        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
