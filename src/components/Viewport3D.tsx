"use client";
import { useRef, useCallback, useEffect, useState, useMemo } from "react";
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
} from "@/stores/cad-store";

const SKETCH_TOOLS: ToolId[] = ["line", "arc", "circle", "rectangle"];
const SKETCH_Y = 0.02; // Slight offset above grid for sketch entities

/* ── Snap helper ── */
function snap(value: number, gridSize: number, enabled: boolean): number {
  if (!enabled) return value;
  return Math.round(value / gridSize) * gridSize;
}

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

/* ── Sketch Line object ── */
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
      {/* Endpoint markers */}
      {obj.linePoints.map((pt, i) => (
        <mesh key={i} position={pt}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={isSelected ? "#e94560" : "#00ffff"} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Sketch Arc object ── */
function CadArc({ obj }: { obj: CadObject }) {
  const selectedId = useCadStore((s) => s.selectedId);
  const selectObject = useCadStore((s) => s.selectObject);
  const activeTool = useCadStore((s) => s.activeTool);
  const isSelected = selectedId === obj.id;

  const arcPoints = useMemo(() => {
    if (!obj.arcPoints || obj.arcPoints.length < 3) return [];
    const [p1, p2, p3] = obj.arcPoints;
    // Compute arc through 3 points on XZ plane
    return computeArcThrough3Points(p1, p2, p3);
  }, [obj.arcPoints]);

  if (arcPoints.length < 2) return null;

  return (
    <group
      onClick={(e) => {
        if (activeTool !== "select") return;
        e.stopPropagation();
        selectObject(obj.id);
      }}
    >
      <Line
        points={arcPoints}
        color={isSelected ? "#e94560" : obj.color}
        lineWidth={isSelected ? 3 : 2}
      />
      {obj.arcPoints?.map((pt, i) => (
        <mesh key={i} position={pt}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={isSelected ? "#e94560" : "#ff00ff"} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Sketch Circle object ── */
function CadCircle({ obj }: { obj: CadObject }) {
  const selectedId = useCadStore((s) => s.selectedId);
  const selectObject = useCadStore((s) => s.selectObject);
  const activeTool = useCadStore((s) => s.activeTool);
  const isSelected = selectedId === obj.id;

  const circlePoints = useMemo(() => {
    if (!obj.circleCenter || !obj.circleRadius) return [];
    const segments = 64;
    const points: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push([
        obj.circleCenter[0] + Math.cos(angle) * obj.circleRadius,
        SKETCH_Y,
        obj.circleCenter[2] + Math.sin(angle) * obj.circleRadius,
      ]);
    }
    return points;
  }, [obj.circleCenter, obj.circleRadius]);

  if (circlePoints.length < 2) return null;

  return (
    <group
      onClick={(e) => {
        if (activeTool !== "select") return;
        e.stopPropagation();
        selectObject(obj.id);
      }}
    >
      <Line
        points={circlePoints}
        color={isSelected ? "#e94560" : obj.color}
        lineWidth={isSelected ? 3 : 2}
      />
      {/* Center marker */}
      {obj.circleCenter && (
        <mesh position={obj.circleCenter}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={isSelected ? "#e94560" : "#00ff00"} />
        </mesh>
      )}
    </group>
  );
}

/* ── Sketch Rectangle object ── */
function CadRectangle({ obj }: { obj: CadObject }) {
  const selectedId = useCadStore((s) => s.selectedId);
  const selectObject = useCadStore((s) => s.selectObject);
  const activeTool = useCadStore((s) => s.activeTool);
  const isSelected = selectedId === obj.id;

  const rectPoints = useMemo(() => {
    if (!obj.rectCorners) return [];
    const [c1, c2] = obj.rectCorners;
    return [
      [c1[0], SKETCH_Y, c1[2]] as [number, number, number],
      [c2[0], SKETCH_Y, c1[2]] as [number, number, number],
      [c2[0], SKETCH_Y, c2[2]] as [number, number, number],
      [c1[0], SKETCH_Y, c2[2]] as [number, number, number],
      [c1[0], SKETCH_Y, c1[2]] as [number, number, number], // close
    ];
  }, [obj.rectCorners]);

  if (rectPoints.length < 4) return null;

  return (
    <group
      onClick={(e) => {
        if (activeTool !== "select") return;
        e.stopPropagation();
        selectObject(obj.id);
      }}
    >
      <Line
        points={rectPoints}
        color={isSelected ? "#e94560" : obj.color}
        lineWidth={isSelected ? 3 : 2}
      />
      {obj.rectCorners?.map((pt, i) => (
        <mesh key={i} position={[pt[0], SKETCH_Y, pt[2]]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={isSelected ? "#e94560" : "#ffaa00"} />
        </mesh>
      ))}
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
  const sketchTypes = ["line", "arc", "circle", "rectangle"];

  if (!selected || sketchTypes.includes(selected.type) || activeTool !== "select") return null;

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

/* ── Ground plane click handler for placing 3D objects ── */
function GroundPlane() {
  const activeTool = useCadStore((s) => s.activeTool);
  const addObject = useCadStore((s) => s.addObject);
  const selectObject = useCadStore((s) => s.selectObject);
  const snapGrid = useCadStore((s) => s.snapGrid);
  const gridSize = useCadStore((s) => s.gridSize);

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
        if (activeTool === "select") {
          selectObject(null);
        }
        return;
      }
      e.stopPropagation();
      const point = e.point;
      const id = addObject(shapeType);
      const store = useCadStore.getState();
      const obj = store.objects.find((o) => o.id === id);
      if (obj) {
        const yOffset = obj.dimensions.height / 2;
        useCadStore.getState().updateObject(id, {
          position: [
            snap(point.x, gridSize, snapGrid),
            yOffset,
            snap(point.z, gridSize, snapGrid),
          ],
        });
      }
    },
    [activeTool, addObject, selectObject, snapGrid, gridSize]
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

/* ── Sketch drawing tools (line, arc, circle, rectangle) ── */
function SketchDrawTools() {
  const activeTool = useCadStore((s) => s.activeTool);
  const addLine = useCadStore((s) => s.addLine);
  const addArc = useCadStore((s) => s.addArc);
  const addCircle = useCadStore((s) => s.addCircle);
  const addRectangle = useCadStore((s) => s.addRectangle);
  const snapGrid = useCadStore((s) => s.snapGrid);
  const gridSize = useCadStore((s) => s.gridSize);

  // Shared state for sketch drawing
  const [clickPoints, setClickPoints] = useState<[number, number, number][]>([]);
  const [previewPoint, setPreviewPoint] = useState<[number, number, number] | null>(null);
  const controlsRef = useRef<ReturnType<typeof useThree> | null>(null);

  // Reset when tool changes
  useEffect(() => {
    setClickPoints([]);
    setPreviewPoint(null);
  }, [activeTool]);

  if (!SKETCH_TOOLS.includes(activeTool)) return null;

  const getSnappedPoint = (point: THREE.Vector3): [number, number, number] => {
    return [
      snap(point.x, gridSize, snapGrid),
      SKETCH_Y,
      snap(point.z, gridSize, snapGrid),
    ];
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const p = getSnappedPoint(e.point);

    if (activeTool === "line") {
      if (clickPoints.length === 0) {
        setClickPoints([p]);
      } else {
        addLine([clickPoints[0], p]);
        setClickPoints([]);
        setPreviewPoint(null);
      }
    } else if (activeTool === "arc") {
      const newPoints = [...clickPoints, p];
      if (newPoints.length < 3) {
        setClickPoints(newPoints);
      } else {
        // 3 points: start, pass-through, end
        const arcPts = computeArcThrough3Points(newPoints[0], newPoints[1], newPoints[2]);
        const radius = arcPts.length > 0
          ? Math.sqrt(
              Math.pow(arcPts[0][0] - arcPts[Math.floor(arcPts.length / 2)][0], 2) +
              Math.pow(arcPts[0][2] - arcPts[Math.floor(arcPts.length / 2)][2], 2)
            ) / 2
          : 1;
        addArc(newPoints, radius);
        setClickPoints([]);
        setPreviewPoint(null);
      }
    } else if (activeTool === "circle") {
      if (clickPoints.length === 0) {
        setClickPoints([p]);
      } else {
        const center = clickPoints[0];
        const radius = Math.sqrt(
          Math.pow(p[0] - center[0], 2) + Math.pow(p[2] - center[2], 2)
        );
        if (radius > 0.05) {
          addCircle(center, radius);
        }
        setClickPoints([]);
        setPreviewPoint(null);
      }
    } else if (activeTool === "rectangle") {
      if (clickPoints.length === 0) {
        setClickPoints([p]);
      } else {
        addRectangle(clickPoints[0], p);
        setClickPoints([]);
        setPreviewPoint(null);
      }
    }
  };

  const handleMove = (e: ThreeEvent<MouseEvent>) => {
    if (clickPoints.length > 0) {
      setPreviewPoint(getSnappedPoint(e.point));
    }
  };

  // Preview rendering
  const renderPreview = () => {
    if (clickPoints.length === 0 || !previewPoint) return null;

    if (activeTool === "line") {
      return (
        <>
          <Line
            points={[clickPoints[0], previewPoint]}
            color="#ffff00"
            lineWidth={2}
            dashed
            dashSize={0.15}
            gapSize={0.1}
          />
          {/* Length label would go here */}
        </>
      );
    }

    if (activeTool === "arc") {
      if (clickPoints.length === 1) {
        return (
          <Line
            points={[clickPoints[0], previewPoint]}
            color="#ff00ff"
            lineWidth={1}
            dashed
            dashSize={0.15}
            gapSize={0.1}
          />
        );
      }
      if (clickPoints.length === 2) {
        const arcPreview = computeArcThrough3Points(clickPoints[0], clickPoints[1], previewPoint);
        if (arcPreview.length > 1) {
          return (
            <Line
              points={arcPreview}
              color="#ff00ff"
              lineWidth={2}
              dashed
              dashSize={0.15}
              gapSize={0.1}
            />
          );
        }
      }
      return null;
    }

    if (activeTool === "circle") {
      const center = clickPoints[0];
      const radius = Math.sqrt(
        Math.pow(previewPoint[0] - center[0], 2) +
        Math.pow(previewPoint[2] - center[2], 2)
      );
      if (radius < 0.05) return null;
      const segments = 64;
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        pts.push([
          center[0] + Math.cos(angle) * radius,
          SKETCH_Y,
          center[2] + Math.sin(angle) * radius,
        ]);
      }
      return (
        <>
          <Line
            points={pts}
            color="#00ff00"
            lineWidth={2}
            dashed
            dashSize={0.15}
            gapSize={0.1}
          />
          {/* Radius line */}
          <Line
            points={[center, previewPoint]}
            color="#00ff00"
            lineWidth={1}
            dashed
            dashSize={0.1}
            gapSize={0.1}
          />
        </>
      );
    }

    if (activeTool === "rectangle") {
      const c1 = clickPoints[0];
      const c2 = previewPoint;
      const pts: [number, number, number][] = [
        [c1[0], SKETCH_Y, c1[2]],
        [c2[0], SKETCH_Y, c1[2]],
        [c2[0], SKETCH_Y, c2[2]],
        [c1[0], SKETCH_Y, c2[2]],
        [c1[0], SKETCH_Y, c1[2]],
      ];
      return (
        <Line
          points={pts}
          color="#ffaa00"
          lineWidth={2}
          dashed
          dashSize={0.15}
          gapSize={0.1}
        />
      );
    }

    return null;
  };

  return (
    <>
      {/* Click detection plane for sketching */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onClick={handleClick}
        onPointerMove={handleMove}
        visible={false}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Preview */}
      {renderPreview()}

      {/* Click point markers */}
      {clickPoints.map((pt, i) => (
        <mesh key={i} position={pt}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#ffff00" />
        </mesh>
      ))}

      {/* Cursor crosshair at preview point */}
      {previewPoint && (
        <group position={previewPoint}>
          <Line
            points={[[-0.15, 0, 0], [0.15, 0, 0]]}
            color="#ffffff"
            lineWidth={1}
          />
          <Line
            points={[[0, 0, -0.15], [0, 0, 0.15]]}
            color="#ffffff"
            lineWidth={1}
          />
        </group>
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
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
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
        case "l":
          setActiveTool("line");
          break;
        case "a":
          if (!e.ctrlKey && !e.metaKey) setActiveTool("arc");
          break;
        case "c":
          if (!e.ctrlKey && !e.metaKey) setActiveTool("circle");
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, setTransformMode, setActiveTool]);

  return null;
}

/* ── Helper: compute arc through 3 points ── */
function computeArcThrough3Points(
  p1: [number, number, number],
  p2: [number, number, number],
  p3: [number, number, number]
): [number, number, number][] {
  // Work in XZ plane
  const ax = p1[0], az = p1[2];
  const bx = p2[0], bz = p2[2];
  const cx = p3[0], cz = p3[2];

  const D = 2 * (ax * (bz - cz) + bx * (cz - az) + cx * (az - bz));
  if (Math.abs(D) < 1e-10) {
    // Points are collinear, return straight line segments
    return [p1, p2, p3];
  }

  const ux = ((ax * ax + az * az) * (bz - cz) + (bx * bx + bz * bz) * (cz - az) + (cx * cx + cz * cz) * (az - bz)) / D;
  const uz = ((ax * ax + az * az) * (cx - bx) + (bx * bx + bz * bz) * (ax - cx) + (cx * cx + cz * cz) * (bx - ax)) / D;

  const radius = Math.sqrt((ax - ux) * (ax - ux) + (az - uz) * (az - uz));

  // Compute angles for each point
  let angle1 = Math.atan2(az - uz, ax - ux);
  let angle2 = Math.atan2(bz - uz, bx - ux);
  let angle3 = Math.atan2(cz - uz, cx - ux);

  // Determine arc direction (ensure p2 is between p1 and p3)
  const normalize = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  angle1 = normalize(angle1);
  angle2 = normalize(angle2);
  angle3 = normalize(angle3);

  let startAngle = angle1;
  let endAngle = angle3;

  // Check if going counterclockwise from angle1 to angle3 passes through angle2
  const ccwSpan = normalize(angle3 - angle1);
  const ccwToMid = normalize(angle2 - angle1);

  let totalAngle: number;
  if (ccwToMid < ccwSpan) {
    // CCW direction includes the midpoint
    totalAngle = ccwSpan;
  } else {
    // CW direction includes the midpoint
    totalAngle = ccwSpan - 2 * Math.PI;
  }

  const segments = Math.max(16, Math.abs(Math.round(totalAngle / (Math.PI / 32))));
  const points: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + totalAngle * t;
    points.push([
      ux + radius * Math.cos(angle),
      SKETCH_Y,
      uz + radius * Math.sin(angle),
    ]);
  }

  return points;
}

/* ── Sketch plane indicator ── */
function SketchPlaneIndicator() {
  const activeTool = useCadStore((s) => s.activeTool);

  if (!SKETCH_TOOLS.includes(activeTool)) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
      <planeGeometry args={[20, 20]} />
      <meshBasicMaterial
        color="#0066ff"
        transparent
        opacity={0.03}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
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
  const activeTool = useCadStore((s) => s.activeTool);
  const isSketchMode = SKETCH_TOOLS.includes(activeTool);

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
            cellColor={isSketchMode ? "#1a3744" : "#1a2744"}
            sectionSize={2}
            sectionThickness={1}
            sectionColor={isSketchMode ? "#0f6060" : "#0f3460"}
            fadeDistance={25}
            infiniteGrid
          />
        )}

        {showAxes && <axesHelper args={[3]} />}

        <SketchPlaneIndicator />
        <GroundPlane />
        <SketchDrawTools />

        {objects.map((obj) => {
          switch (obj.type) {
            case "line":
              return <CadLine key={obj.id} obj={obj} />;
            case "arc":
              return <CadArc key={obj.id} obj={obj} />;
            case "circle":
              return <CadCircle key={obj.id} obj={obj} />;
            case "rectangle":
              return <CadRectangle key={obj.id} obj={obj} />;
            default:
              return <CadMesh key={obj.id} obj={obj} />;
          }
        })}

        <SelectedTransform />

        <ContactShadows position={[0, -0.01, 0]} opacity={0.4} blur={2} />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          // Disable orbit when in sketch mode and actively drawing
          enabled={!isSketchMode || true}
        />

        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport labelColor="white" axisHeadScale={0.8} />
        </GizmoHelper>

        <Environment preset="city" />
        <KeyboardHandler />
      </Canvas>
    </div>
  );
}
