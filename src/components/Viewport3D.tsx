"use client";
import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

interface Viewport3DProps {
  mode?: "designer" | "simulator" | "assembly";
  showGrid?: boolean;
  showAxes?: boolean;
  viewAngle?: "front" | "top" | "right" | "iso";
  children?: React.ReactNode;
}

function SampleGeometry({ mode }: { mode: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (meshRef.current && mode === "designer") {
      meshRef.current.rotation.y += delta * 0.2;
    }
  });

  if (mode === "assembly") {
    return (
      <group>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[3, 0.3, 2]} />
          <meshStandardMaterial color="#4a9eff" wireframe={false} />
        </mesh>
        <mesh position={[-0.8, 0.8, 0]}>
          <boxGeometry args={[0.3, 1.3, 1.5]} />
          <meshStandardMaterial color="#e94560" />
        </mesh>
        <mesh position={[0.8, 0.8, 0]}>
          <boxGeometry args={[0.3, 1.3, 1.5]} />
          <meshStandardMaterial color="#e94560" />
        </mesh>
        {[-0.5, 0.5].map((x, i) =>
          [-0.4, 0.4].map((z, j) => (
            <mesh key={`bolt-${i}-${j}`} position={[x, 0.2, z]}>
              <cylinderGeometry args={[0.06, 0.06, 0.4, 8]} />
              <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
            </mesh>
          ))
        )}
      </group>
    );
  }

  if (mode === "simulator") {
    return (
      <group>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[2, 1, 1.5]} />
          <meshStandardMaterial color="#4a9eff" transparent opacity={0.6} />
        </mesh>
        <mesh position={[-1.5, 0.5, 0]}>
          <boxGeometry args={[1, 1.5, 1.5]} />
          <meshStandardMaterial color="#22c55e" transparent opacity={0.4} />
        </mesh>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(2, 1, 1.5)]} />
          <lineBasicMaterial color="#0ff" />
        </lineSegments>
      </group>
    );
  }

  return (
    <mesh
      ref={meshRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial
        color={hovered ? "#e94560" : "#4a9eff"}
        wireframe={false}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  );
}

const cameraPositions: Record<string, [number, number, number]> = {
  front: [0, 0, 5],
  top: [0, 5, 0.01],
  right: [5, 0, 0],
  iso: [3, 3, 3],
};

export default function Viewport3D({
  mode = "designer",
  showGrid = true,
  showAxes = true,
  viewAngle = "iso",
  children,
}: Viewport3DProps) {
  const pos = cameraPositions[viewAngle] || cameraPositions.iso;

  return (
    <div className="w-full h-full bg-[#0a0e17]">
      <Canvas
        camera={{ position: pos, fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#0a0e17" }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />
        <directionalLight position={[-3, 4, -5]} intensity={0.3} />

        {showGrid && (
          <Grid
            args={[20, 20]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#1a2744"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="#0f3460"
            fadeDistance={25}
            infiniteGrid
          />
        )}

        {showAxes && <axesHelper args={[3]} />}

        {children || <SampleGeometry mode={mode} />}

        <ContactShadows position={[0, -0.01, 0]} opacity={0.4} blur={2} />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={1}
          maxDistance={50}
        />

        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport labelColor="white" axisHeadScale={0.8} />
        </GizmoHelper>

        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
