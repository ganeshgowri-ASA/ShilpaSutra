"use client";
import { useMemo, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewport,
  Line,
} from "@react-three/drei";
import * as THREE from "three";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface VectorGlyphData {
  x: number;
  y: number;
  u: number;
  v: number;
  magnitude: number;
  colorT: number;
}

export interface ContourCellData {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  colorT: number;
}

export interface StreamlineData {
  points: { x: number; y: number }[];
  magnitudes: number[];
}

export interface SectionCutData {
  positions: number[];
  values: number[];
  label: string;
  orientation: "horizontal" | "vertical";
  cutPosition: number;
}

export interface CFDAdvancedViewportProps {
  /** Domain dimensions */
  domainWidth: number;
  domainHeight: number;
  /** Display mode */
  displayMode: "velocity" | "pressure" | "temperature" | "turbulence" | "yplus";
  /** Velocity vector glyphs */
  vectors?: VectorGlyphData[];
  /** Contour cells for surface coloring */
  contours?: ContourCellData[];
  /** Streamline paths */
  streamlines?: StreamlineData[];
  /** Section cut data */
  sectionCuts?: SectionCutData[];
  /** Show animated particles */
  showParticles?: boolean;
  /** Show velocity arrows */
  showVectors?: boolean;
  /** Show contour fill */
  showContours?: boolean;
  /** Show streamlines */
  showStreamlines?: boolean;
  /** Show mesh wireframe */
  showMesh?: boolean;
  /** Colormap */
  colormap?: "rainbow" | "jet" | "viridis" | "coolwarm";
  /** Arrow scale factor */
  arrowScale?: number;
}

// ----------------------------------------------------------------------------
// Color mapping
// ----------------------------------------------------------------------------

function colorFromT(t: number, colormap: string): THREE.Color {
  const c = Math.max(0, Math.min(1, t));
  if (colormap === "coolwarm") {
    const r = c < 0.5 ? (59 + c * 2 * 196) / 255 : 1;
    const g = c < 0.5 ? (76 + c * 2 * 179) / 255 : (255 - (c - 0.5) * 2 * 179) / 255;
    const b = c < 0.5 ? 1 : (255 - (c - 0.5) * 2 * 196) / 255;
    return new THREE.Color(r, g, b);
  }
  if (colormap === "viridis") {
    const r = (68 + c * 185) / 255;
    const g = (1 + c * 205 - c * c * 100) / 255;
    const b = Math.max(37, 84 + c * 60 - Math.pow(c, 1.5) * 140) / 255;
    return new THREE.Color(Math.min(1, r), Math.min(1, g), b);
  }
  // Jet / Rainbow
  if (c < 0.25) return new THREE.Color(0, c * 4, 1);
  if (c < 0.5) return new THREE.Color(0, 1, 1 - (c - 0.25) * 4);
  if (c < 0.75) return new THREE.Color((c - 0.5) * 4, 1, 0);
  return new THREE.Color(1, 1 - (c - 0.75) * 4, 0);
}

// ----------------------------------------------------------------------------
// Contour Surface
// ----------------------------------------------------------------------------

function ContourSurface({
  contours,
  colormap,
  domainWidth,
  domainHeight,
}: {
  contours: ContourCellData[];
  colormap: string;
  domainWidth: number;
  domainHeight: number;
}) {
  const geometry = useMemo(() => {
    if (contours.length === 0) return null;

    // Determine grid dimensions
    const uniqueX = new Set(contours.map((c) => c.x));
    const uniqueY = new Set(contours.map((c) => c.y));
    const nx = uniqueX.size;
    const ny = uniqueY.size;

    const geo = new THREE.PlaneGeometry(domainWidth, domainHeight, nx, ny);
    const colors = new Float32Array(geo.attributes.position.count * 3);

    // Map contour data to vertex colors
    const sortedContours = [...contours].sort((a, b) => a.y - b.y || a.x - b.x);

    for (let i = 0; i < geo.attributes.position.count; i++) {
      const ci = Math.min(i, sortedContours.length - 1);
      const t = sortedContours[ci]?.colorT ?? 0;
      const color = colorFromT(t, colormap);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [contours, colormap, domainWidth, domainHeight]);

  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.01, 0]}
    >
      <meshBasicMaterial vertexColors side={THREE.DoubleSide} transparent opacity={0.9} />
    </mesh>
  );
}

// ----------------------------------------------------------------------------
// Velocity Vectors (Arrow Glyphs)
// ----------------------------------------------------------------------------

function VelocityVectors({
  vectors,
  colormap,
  scale,
  domainWidth,
  domainHeight,
}: {
  vectors: VectorGlyphData[];
  colormap: string;
  scale: number;
  domainWidth: number;
  domainHeight: number;
}) {
  const arrowData = useMemo(() => {
    return vectors.map((v) => {
      const x = v.x - domainWidth / 2;
      const z = v.y - domainHeight / 2;
      const mag = Math.max(v.magnitude, 1e-10);
      const len = Math.min(mag * scale, domainWidth * 0.05);
      const nx = v.u / mag;
      const nz = v.v / mag;
      const color = colorFromT(v.colorT, colormap);

      return {
        start: [x, 0.05, z] as [number, number, number],
        end: [x + nx * len, 0.05, z + nz * len] as [number, number, number],
        color,
      };
    });
  }, [vectors, colormap, scale, domainWidth, domainHeight]);

  return (
    <group>
      {arrowData.map((arrow, i) => (
        <Line
          key={i}
          points={[arrow.start, arrow.end]}
          color={arrow.color}
          lineWidth={1.5}
        />
      ))}
    </group>
  );
}

// ----------------------------------------------------------------------------
// Streamlines (3D Lines)
// ----------------------------------------------------------------------------

function StreamlineViz({
  streamlines,
  colormap,
  domainWidth,
  domainHeight,
}: {
  streamlines: StreamlineData[];
  colormap: string;
  domainWidth: number;
  domainHeight: number;
}) {
  const paths = useMemo(() => {
    return streamlines.map((sl) => {
      const maxMag = Math.max(...sl.magnitudes, 1e-10);
      const points = sl.points.map((p) => [
        p.x - domainWidth / 2,
        0.03,
        p.y - domainHeight / 2,
      ] as [number, number, number]);
      const avgT = sl.magnitudes.reduce((a, b) => a + b, 0) / sl.magnitudes.length / maxMag;
      const color = colorFromT(Math.min(1, avgT * 2), colormap);
      return { points, color };
    });
  }, [streamlines, colormap, domainWidth, domainHeight]);

  return (
    <group>
      {paths.map((path, i) => (
        path.points.length > 1 && (
          <Line
            key={i}
            points={path.points}
            color={path.color}
            lineWidth={2}
            transparent
            opacity={0.7}
          />
        )
      ))}
    </group>
  );
}

// ----------------------------------------------------------------------------
// Animated Particles
// ----------------------------------------------------------------------------

function AnimatedParticles({
  domainWidth,
  domainHeight,
  count,
}: {
  domainWidth: number;
  domainHeight: number;
  count: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const velocities = useRef<Float32Array>(new Float32Array(count * 3));

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    const hw = domainWidth / 2;
    const hh = domainHeight / 2;

    for (let i = 0; i < count; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * domainWidth,
        0.02 + Math.random() * 0.02,
        (Math.random() - 0.5) * domainHeight,
      );
      dummy.scale.setScalar(0.015);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      velocities.current[i * 3] = 0.5 + Math.random() * 1.5;
      velocities.current[i * 3 + 1] = 0;
      velocities.current[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [count, domainWidth, domainHeight]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    const hw = domainWidth / 2;

    for (let i = 0; i < count; i++) {
      meshRef.current.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

      dummy.position.x += velocities.current[i * 3] * delta;
      dummy.position.z += velocities.current[i * 3 + 2] * delta;

      if (dummy.position.x > hw) {
        dummy.position.x = -hw;
        dummy.position.z = (Math.random() - 0.5) * domainHeight;
      }

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#00D4FF" transparent opacity={0.8} />
    </instancedMesh>
  );
}

// ----------------------------------------------------------------------------
// Section Cut Plane
// ----------------------------------------------------------------------------

function SectionCutPlane({
  cut,
  domainWidth,
  domainHeight,
}: {
  cut: SectionCutData;
  domainWidth: number;
  domainHeight: number;
}) {
  const hw = domainWidth / 2;
  const hh = domainHeight / 2;

  if (cut.orientation === "horizontal") {
    const z = cut.cutPosition - hh;
    return (
      <group>
        <Line
          points={[[-hw, 0.1, z], [hw, 0.1, z]]}
          color="#ff4444"
          lineWidth={2}
          dashed
          dashSize={0.1}
          gapSize={0.05}
        />
        {/* Small marker at cut position */}
        <mesh position={[-hw - 0.1, 0.1, z]}>
          <boxGeometry args={[0.05, 0.15, 0.05]} />
          <meshBasicMaterial color="#ff4444" />
        </mesh>
      </group>
    );
  }

  const x = cut.cutPosition - hw;
  return (
    <group>
      <Line
        points={[[x, 0.1, -hh], [x, 0.1, hh]]}
        color="#44ff44"
        lineWidth={2}
        dashed
        dashSize={0.1}
        gapSize={0.05}
      />
      <mesh position={[x, 0.1, -hh - 0.1]}>
        <boxGeometry args={[0.05, 0.15, 0.05]} />
        <meshBasicMaterial color="#44ff44" />
      </mesh>
    </group>
  );
}

// ----------------------------------------------------------------------------
// Domain Wireframe
// ----------------------------------------------------------------------------

function DomainBox({ width, height }: { width: number; height: number }) {
  const hw = width / 2;
  const hh = height / 2;
  const wallH = 0.3;

  return (
    <group>
      <Line
        points={[
          [-hw, 0, -hh], [hw, 0, -hh], [hw, 0, hh], [-hw, 0, hh], [-hw, 0, -hh],
        ]}
        color="#1a3a5c"
        lineWidth={1.5}
      />
      {/* Inlet/outlet markers */}
      <Line points={[[-hw, 0, -hh], [-hw, wallH, -hh]]} color="#44ff44" lineWidth={2} />
      <Line points={[[-hw, 0, hh], [-hw, wallH, hh]]} color="#44ff44" lineWidth={2} />
      <Line points={[[hw, 0, -hh], [hw, wallH, -hh]]} color="#ff4444" lineWidth={2} />
      <Line points={[[hw, 0, hh], [hw, wallH, hh]]} color="#ff4444" lineWidth={2} />
    </group>
  );
}

// ----------------------------------------------------------------------------
// Color Legend Bar (HUD overlay in 3D space)
// ----------------------------------------------------------------------------

function ColorLegend({
  colormap,
  label,
  min,
  max,
  unit,
}: {
  colormap: string;
  label: string;
  min: number;
  max: number;
  unit: string;
}) {
  const barGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.1, 1.5, 1, 20);
    const colors = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < geo.attributes.position.count; i++) {
      const y = geo.attributes.position.getY(i);
      const t = (y + 0.75) / 1.5;
      const color = colorFromT(t, colormap);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [colormap]);

  return null; // Legend is rendered as HTML overlay instead
}

// ----------------------------------------------------------------------------
// Main Viewport
// ----------------------------------------------------------------------------

function CFDScene({
  domainWidth,
  domainHeight,
  displayMode,
  vectors,
  contours,
  streamlines,
  sectionCuts,
  showParticles,
  showVectors,
  showContours,
  showStreamlines,
  showMesh,
  colormap,
  arrowScale,
}: CFDAdvancedViewportProps) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={0.6} />
      <directionalLight position={[-3, 4, -5]} intensity={0.3} />

      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#0f1a2e"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#0f3460"
        fadeDistance={15}
        position={[0, -0.01, 0]}
      />

      <DomainBox width={domainWidth} height={domainHeight} />

      {showContours && contours && contours.length > 0 && (
        <ContourSurface
          contours={contours}
          colormap={colormap || "jet"}
          domainWidth={domainWidth}
          domainHeight={domainHeight}
        />
      )}

      {showVectors && vectors && vectors.length > 0 && (
        <VelocityVectors
          vectors={vectors}
          colormap={colormap || "jet"}
          scale={arrowScale || 0.3}
          domainWidth={domainWidth}
          domainHeight={domainHeight}
        />
      )}

      {showStreamlines && streamlines && streamlines.length > 0 && (
        <StreamlineViz
          streamlines={streamlines}
          colormap={colormap || "jet"}
          domainWidth={domainWidth}
          domainHeight={domainHeight}
        />
      )}

      {showParticles && (
        <AnimatedParticles
          domainWidth={domainWidth}
          domainHeight={domainHeight}
          count={80}
        />
      )}

      {sectionCuts?.map((cut, i) => (
        <SectionCutPlane
          key={i}
          cut={cut}
          domainWidth={domainWidth}
          domainHeight={domainHeight}
        />
      ))}

      <axesHelper args={[1]} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport labelColor="white" axisHeadScale={0.8} />
      </GizmoHelper>
    </>
  );
}

export default function CFDAdvancedViewport(props: CFDAdvancedViewportProps) {
  return (
    <div className="w-full h-full bg-[#0a0e17] relative">
      <Canvas
        camera={{ position: [3, 4, 3], fov: 50, near: 0.01, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#0a0e17" }}
      >
        <CFDScene {...props} />
      </Canvas>

      {/* Display mode label */}
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <span className="text-[9px] px-2 py-0.5 rounded bg-[#00D4FF]/15 text-[#00D4FF] font-bold uppercase">
          {props.displayMode}
        </span>
        {props.showVectors && (
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">Vectors</span>
        )}
        {props.showStreamlines && (
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">Streamlines</span>
        )}
        {props.showParticles && (
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">Particles</span>
        )}
      </div>

      {/* Inlet/Outlet labels */}
      <div className="absolute bottom-2 left-2 text-[8px] text-green-400/60">INLET</div>
      <div className="absolute bottom-2 right-2 text-[8px] text-red-400/60">OUTLET</div>
    </div>
  );
}
