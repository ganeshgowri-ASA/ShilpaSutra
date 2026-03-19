"use client";
import { useRef, useCallback, useEffect, useState } from "react";
import { Canvas, useThree, ThreeEvent } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewport,
  Environment,
  ContactShadows,
  TransformControls,
  Line,
} from "@react-three/drei";
import * as THREE from "three";
import {
  useCadStore,
  type CadObject,
  type ToolId,
  type TransformMode,
} from "@/stores/cad-store";

/* ── Single CAD mesh ── */
function CadMesh({ obj }: { obj: CadObject }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const selectedId = useCadStore((s) => s.selectedId);
  const selectObject = useCadStore((s) => s.selectObject);
  const activeTool = useCadStore((s) => s.activeTool);
  const isSelected = selectedId === obj.id;

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (activeTool !== "select") return;
      e.stopPropagation();
      selectObject(obj.id);
    },
    [activeTool, selectObject, obj.id]
  );

  const geometry = (() => {
    switch (obj.type) {
      case "box":
        return (
          <boxGeometry
            args={[obj.dimensions.width, obj.dimensions.height, obj.dimensions.depth]}
          />
        );
      case "cylinder":
        return (
          <cylinderGeometry
            args={[obj.dimensions.width, obj.dimensions.width, obj.dimensions.height, 32]}
          />
        );
      case "sphere":
        return <sphereGeometry args={[obj.dimensions.width, 32, 32]} />;
      case "cone":
        return (
          <coneGeometry
            args={[obj.dimensions.width, obj.dimensions.height, 32]}
          />
        );
      default:
        return <boxGeometry args={[1, 1, 1]} />;
    }
  })();

  return (
    <mesh
      ref={meshRef}
      position={obj.position}
      rotation={obj.rotation}
      scale={obj.scale}
      onClick={handleClick}
      userData={{ cadId: obj.id }}
    >
      {geometry}
      <meshStandardMaterial
        color={obj.color}
        metalness={0.4}
        roughness={0.5}
        emissive={isSelected ? "#e94560" : "#000000"}
        emissiveIntensity={isSelected ? 0.15 : 0}
      />
      {isSelected && (
        <lineSegments>
          <edgesGeometry
            args={[
              (() => {
                switch (obj.type) {
                  case "box":
                    return new THREE.BoxGeometry(
                      obj.dimensions.width,
                      obj.dimensions.height,
                      obj.dimensions.depth
                    );
                  case "cylinder":
                    return new THREE.CylinderGeometry(
                      obj.dimensions.width,
                      obj.dimensions.width,
                      obj.dimensions.height,
                      32
                    );
                  case "sphere":
                    return new THREE.SphereGeometry(obj.dimensions.width, 16, 16);
                  case "cone":
                    return new THREE.ConeGeometry(
                      obj.dimensions.width,
                      obj.dimensions.height,
                      32
                    );
                  default:
                    return new THREE.BoxGeometry(1, 1, 1);
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

/* ── Line object ── */
function CadLine({ obj }: { obj: CadObject }) {
  const selectedId = useCadStore((s) => s.selectedId);
  const selectObject = useCadStore((s) => s.selectObject);
  const activeTool = useCadStore((s) => s.activeTool);
  const isSelected = selectedId === obj.id;

  if (!obj.linePoints || obj.linePoints.length < 2) return null;

  return (
    <group
      onClick={(e) => {
        if (activeTool !== "select") return;
        e.stopPropagation();
        selectObject(obj.id);
      }}
    >
      <Line
        points={obj.linePoints}
        color={isSelected ? "#e94560" : obj.color}
        lineWidth={isSelected ? 3 : 2}
      />
    </group>
  );
}

/* ── Transform wrapper for selected object ── */
function SelectedTransform() {
  const selectedId = useCadStore((s) => s.selectedId);
  const objects = useCadStore((s) => s.objects);
  const transformMode = useCadStore((s) => s.transformMode);
  const updateObject = useCadStore((s) => s.updateObject);
  const activeTool = useCadStore((s) => s.activeTool);
  const transformRef = useRef<typeof TransformControls | null>(null);

  const selected = objects.find((o) => o.id === selectedId);

  if (!selected || selected.type === "line" || activeTool !== "select") return null;

  return (
    <TransformControls
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={transformRef as any}
      mode={transformMode}
      position={selected.position}
      rotation={new THREE.Euler(...selected.rotation)}
      scale={new THREE.Vector3(...selected.scale)}
      onObjectChange={(e) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctrl = e?.target as any;
        if (!ctrl?.object) return;
        const obj = ctrl.object;
        updateObject(selected.id, {
          position: [obj.position.x, obj.position.y, obj.position.z],
          rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
          scale: [obj.scale.x, obj.scale.y, obj.scale.z],
        });
      }}
    >
      <mesh visible={false}>
        <boxGeometry args={[0.01, 0.01, 0.01]} />
      </mesh>
    </TransformControls>
  );
}

/* ── Ground plane click handler for placing objects ── */
function GroundPlane() {
  const activeTool = useCadStore((s) => s.activeTool);
  const addObject = useCadStore((s) => s.addObject);
  const selectObject = useCadStore((s) => s.selectObject);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      const toolToType: Partial<Record<ToolId, CadObject["type"]>> = {
        box: "box",
        cylinder: "cylinder",
        sphere: "sphere",
        cone: "cone",
      };
      const shapeType = toolToType[activeTool];
      if (!shapeType) {
        // Click on empty area in select mode → deselect
        if (activeTool === "select") {
          selectObject(null);
        }
        return;
      }
      e.stopPropagation();
      const point = e.point;
      const id = addObject(shapeType);
      // Update position to click point
      const store = useCadStore.getState();
      const obj = store.objects.find((o) => o.id === id);
      if (obj) {
        const yOffset = obj.dimensions.height / 2;
        useCadStore.getState().updateObject(id, {
          position: [
            Math.round(point.x * 2) / 2,
            yOffset,
            Math.round(point.z * 2) / 2,
          ],
        });
      }
    },
    [activeTool, addObject, selectObject]
  );

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
      onClick={handleClick}
      visible={false}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

/* ── Line drawing tool ── */
function LineDrawTool() {
  const activeTool = useCadStore((s) => s.activeTool);
  const addLine = useCadStore((s) => s.addLine);
  const [startPoint, setStartPoint] = useState<[number, number, number] | null>(
    null
  );
  const [previewEnd, setPreviewEnd] = useState<[number, number, number] | null>(
    null
  );
  const { gl } = useThree();

  useEffect(() => {
    if (activeTool !== "line") {
      setStartPoint(null);
      setPreviewEnd(null);
    }
  }, [activeTool]);

  if (activeTool !== "line") return null;

  return (
    <>
      {/* Click plane for line drawing */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onClick={(e) => {
          e.stopPropagation();
          const p: [number, number, number] = [
            Math.round(e.point.x * 4) / 4,
            0.05,
            Math.round(e.point.z * 4) / 4,
          ];
          if (!startPoint) {
            setStartPoint(p);
          } else {
            addLine([startPoint, p]);
            setStartPoint(null);
            setPreviewEnd(null);
          }
        }}
        onPointerMove={(e) => {
          if (startPoint) {
            setPreviewEnd([
              Math.round(e.point.x * 4) / 4,
              0.05,
              Math.round(e.point.z * 4) / 4,
            ]);
          }
        }}
        visible={false}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {/* Preview line */}
      {startPoint && previewEnd && (
        <Line
          points={[startPoint, previewEnd]}
          color="#ffff00"
          lineWidth={2}
          dashed
          dashSize={0.2}
          gapSize={0.1}
        />
      )}
      {/* Start point indicator */}
      {startPoint && (
        <mesh position={startPoint}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#ffff00" />
        </mesh>
      )}
    </>
  );
}

/* ── Keyboard shortcuts ── */
function KeyboardHandler() {
  const deleteSelected = useCadStore((s) => s.deleteSelected);
  const setTransformMode = useCadStore((s) => s.setTransformMode);
  const setActiveTool = useCadStore((s) => s.setActiveTool);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      switch (e.key) {
        case "Delete":
        case "Backspace":
          deleteSelected();
          break;
        case "g":
        case "w":
          setTransformMode("translate");
          break;
        case "r":
          setTransformMode("rotate");
          break;
        case "s":
          if (!e.ctrlKey && !e.metaKey) setTransformMode("scale");
          break;
        case "Escape":
          setActiveTool("select");
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, setTransformMode, setActiveTool]);

  return null;
}

/* ── Main Viewport ── */
interface Viewport3DProps {
  mode?: "designer" | "simulator" | "assembly";
  showGrid?: boolean;
  showAxes?: boolean;
}

export default function Viewport3D({
  showGrid = true,
  showAxes = true,
}: Viewport3DProps) {
  const objects = useCadStore((s) => s.objects);

  return (
    <div className="w-full h-full bg-[#0a0e17]">
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        style={{ background: "#0a0e17" }}
        onPointerMissed={() => {
          useCadStore.getState().selectObject(null);
        }}
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

        <GroundPlane />
        <LineDrawTool />

        {objects.map((obj) =>
          obj.type === "line" ? (
            <CadLine key={obj.id} obj={obj} />
          ) : (
            <CadMesh key={obj.id} obj={obj} />
          )
        )}

        <SelectedTransform />

        <ContactShadows position={[0, -0.01, 0]} opacity={0.4} blur={2} />

        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />

        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport labelColor="white" axisHeadScale={0.8} />
        </GizmoHelper>

        <Environment preset="city" />
        <KeyboardHandler />
      </Canvas>
    </div>
  );
}
