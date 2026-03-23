"use client";
import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { Canvas, useThree, useFrame, ThreeEvent } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewport,
  Environment,
  ContactShadows,
  TransformControls,
  Line,
  Html,
} from "@react-three/drei";
import * as THREE from "three";
import {
  useCadStore,
  type CadObject,
  type ToolId,
} from "@/stores/cad-store";
import DimensionOverlay from "@/components/cad/DimensionOverlay";
import MeasurementTool from "@/components/cad/MeasurementTool";
import ConstraintIndicators from "@/components/cad/ConstraintIndicators";
import SmartDimensions from "@/components/cad/SmartDimensions";
import ViewportContextMenu from "@/components/cad/ViewportContextMenu";

const SKETCH_TOOLS: ToolId[] = ["line", "arc", "circle", "rectangle", "polygon", "spline", "ellipse", "construction_line"];
const SKETCH_Y = 0.02;

/* ── Snap helper ── */
function snap(value: number, gridSize: number, enabled: boolean): number {
  if (!enabled) return value;
  return Math.round(value / gridSize) * gridSize;
}

/* ── Custom mesh geometry from vertex/index data ── */
function CustomBufferGeometry({ vertices, indices }: { vertices: number[]; indices: number[] }) {
  const geoRef = useRef<THREE.BufferGeometry>(null);
  useEffect(() => {
    const geo = geoRef.current;
    if (!geo) return;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
  }, [vertices, indices]);
  return <bufferGeometry ref={geoRef} />;
}

/* ── Single CAD mesh ── */
function CadMesh({ obj }: { obj: CadObject }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const selectedId = useCadStore((s) => s.selectedId);
  const selectedIds = useCadStore((s) => s.selectedIds);
  const selectObject = useCadStore((s) => s.selectObject);
  const toggleSelectObject = useCadStore((s) => s.toggleSelectObject);
  const activeTool = useCadStore((s) => s.activeTool);
  const isSelected = selectedId === obj.id || selectedIds.includes(obj.id);
  const [hovered, setHovered] = useState(false);

  if (obj.visible === false) return null;

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (activeTool !== "select") return;
      e.stopPropagation();
      if (e.nativeEvent.ctrlKey || e.nativeEvent.metaKey) {
        toggleSelectObject(obj.id);
      } else {
        selectObject(obj.id);
      }
    },
    [activeTool, selectObject, toggleSelectObject, obj.id]
  );

  // For "mesh" type with vertex data, render as CustomBufferGeometry
  if (obj.type === "mesh" && obj.meshVertices && obj.meshIndices && obj.meshVertices.length > 0) {
    return (
      <mesh
        ref={meshRef}
        position={obj.position}
        rotation={obj.rotation}
        scale={obj.scale}
        onClick={handleClick}
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerLeave={() => setHovered(false)}
        userData={{ cadId: obj.id }}
      >
        <CustomBufferGeometry vertices={obj.meshVertices} indices={obj.meshIndices} />
        <meshStandardMaterial
          color={obj.color}
          metalness={obj.metalness ?? 0.4}
          roughness={obj.roughness ?? 0.5}
          opacity={obj.opacity ?? 1}
          transparent={(obj.opacity ?? 1) < 1}
          emissive={isSelected ? "#00D4FF" : hovered ? "#4a7aff" : "#000000"}
          emissiveIntensity={isSelected ? 0.15 : hovered ? 0.08 : 0}
        />
      </mesh>
    );
  }

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
      onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      userData={{ cadId: obj.id }}
    >
      {geometry}
      <meshStandardMaterial
        color={obj.color}
        metalness={obj.metalness ?? 0.4}
        roughness={obj.roughness ?? 0.5}
        opacity={obj.opacity ?? 1}
        transparent={(obj.opacity ?? 1) < 1}
        emissive={isSelected ? "#00D4FF" : hovered ? "#4a7aff" : "#000000"}
        emissiveIntensity={isSelected ? 0.15 : hovered ? 0.08 : 0}
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
          <lineBasicMaterial color="#00D4FF" linewidth={2} />
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
  if (obj.visible === false) return null;

  const isConstruction = obj.name.startsWith("Construction") || obj.color === "#00D4FF";

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
        color={isSelected ? "#00D4FF" : isConstruction ? "#00D4FF" : obj.color}
        lineWidth={isSelected ? 3 : 2}
        dashed={isConstruction}
        dashSize={isConstruction ? 0.2 : undefined}
        gapSize={isConstruction ? 0.1 : undefined}
      />
      {obj.linePoints.map((pt, i) => (
        <mesh key={i} position={pt}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={isSelected ? "#00D4FF" : isConstruction ? "#00D4FF" : "#00ffff"} />
        </mesh>
      ))}
      {/* Constraint symbols via Html */}
      {obj.linePoints.length === 2 && (() => {
        const [p1, p2] = obj.linePoints!;
        const dx = Math.abs(p2[0] - p1[0]);
        const dz = Math.abs(p2[2] - p1[2]);
        const mid: [number, number, number] = [
          (p1[0] + p2[0]) / 2,
          (p1[1] + p2[1]) / 2 + 0.15,
          (p1[2] + p2[2]) / 2,
        ];
        if (dz < 0.01 && dx > 0.1) {
          return (
            <Html position={mid} center style={{ pointerEvents: "none" }}>
              <span className="text-[10px] font-bold text-green-400/60 bg-[#0d1117]/70 px-1 rounded">H</span>
            </Html>
          );
        }
        if (dx < 0.01 && dz > 0.1) {
          return (
            <Html position={mid} center style={{ pointerEvents: "none" }}>
              <span className="text-[10px] font-bold text-blue-400/60 bg-[#0d1117]/70 px-1 rounded">V</span>
            </Html>
          );
        }
        return null;
      })()}
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
    return computeArcThrough3Points(p1, p2, p3);
  }, [obj.arcPoints]);

  if (arcPoints.length < 2) return null;
  if (obj.visible === false) return null;

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
        color={isSelected ? "#00D4FF" : obj.color}
        lineWidth={isSelected ? 3 : 2}
      />
      {obj.arcPoints?.map((pt, i) => (
        <mesh key={i} position={pt}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={isSelected ? "#00D4FF" : "#ff00ff"} />
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
  if (obj.visible === false) return null;

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
        color={isSelected ? "#00D4FF" : obj.color}
        lineWidth={isSelected ? 3 : 2}
      />
      {obj.circleCenter && (
        <mesh position={obj.circleCenter}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={isSelected ? "#00D4FF" : "#00ff00"} />
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
      [c1[0], SKETCH_Y, c1[2]] as [number, number, number],
    ];
  }, [obj.rectCorners]);

  if (rectPoints.length < 4) return null;
  if (obj.visible === false) return null;

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
        color={isSelected ? "#00D4FF" : obj.color}
        lineWidth={isSelected ? 3 : 2}
      />
      {obj.rectCorners?.map((pt, i) => (
        <mesh key={i} position={[pt[0], SKETCH_Y, pt[2]]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={isSelected ? "#00D4FF" : "#ffaa00"} />
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformRef = useRef<any>(null);

  const selected = objects.find((o) => o.id === selectedId);
  const sketchTypes = ["line", "arc", "circle", "rectangle"];

  if (!selected || sketchTypes.includes(selected.type) || activeTool !== "select") return null;
  if (selected.locked) return null;

  return (
    <TransformControls
      ref={transformRef}
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

/* ── Ground plane click handler ── */
function GroundPlane() {
  const activeTool = useCadStore((s) => s.activeTool);
  const addObject = useCadStore((s) => s.addObject);
  const selectObject = useCadStore((s) => s.selectObject);
  const snapGrid = useCadStore((s) => s.snapGrid);
  const gridSize = useCadStore((s) => s.gridSize);
  const addMeasurePoint = useCadStore((s) => s.addMeasurePoint);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (activeTool === "measure" || activeTool === "measure_angle") {
        e.stopPropagation();
        const p = e.point;
        addMeasurePoint([
          snap(p.x, gridSize, snapGrid),
          0,
          snap(p.z, gridSize, snapGrid),
        ]);
        return;
      }

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
    [activeTool, addObject, selectObject, snapGrid, gridSize, addMeasurePoint]
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

/* ── Snap detection helper ── */
function findSnapPoint(
  point: [number, number, number],
  objects: CadObject[],
  threshold: number
): { point: [number, number, number]; type: string } | null {
  if (!point || !Array.isArray(objects)) return null;
  const candidates: { point: [number, number, number]; type: string; dist: number }[] = [];

  for (const obj of objects) {
    if (!obj || obj.visible === false) continue;

    // Endpoints
    if (obj.type === "line" && Array.isArray(obj.linePoints)) {
      for (const lp of obj.linePoints) {
        if (!lp) continue;
        const d = Math.sqrt(Math.pow(point[0] - lp[0], 2) + Math.pow(point[2] - lp[2], 2));
        if (d < threshold) candidates.push({ point: lp, type: "Endpoint", dist: d });
      }
      // Midpoint
      if (obj.linePoints.length >= 2 && obj.linePoints[0] && obj.linePoints[1]) {
        const mid: [number, number, number] = [
          (obj.linePoints[0][0] + obj.linePoints[1][0]) / 2,
          (obj.linePoints[0][1] + obj.linePoints[1][1]) / 2,
          (obj.linePoints[0][2] + obj.linePoints[1][2]) / 2,
        ];
        const d = Math.sqrt(Math.pow(point[0] - mid[0], 2) + Math.pow(point[2] - mid[2], 2));
        if (d < threshold) candidates.push({ point: mid, type: "Midpoint", dist: d });
      }
    }

    // Circle center
    if (obj.type === "circle" && obj.circleCenter) {
      const d = Math.sqrt(Math.pow(point[0] - obj.circleCenter[0], 2) + Math.pow(point[2] - obj.circleCenter[2], 2));
      if (d < threshold) candidates.push({ point: obj.circleCenter, type: "Center", dist: d });
    }

    // Rectangle corners
    if (obj.type === "rectangle" && Array.isArray(obj.rectCorners) && obj.rectCorners.length >= 2) {
      for (const rc of obj.rectCorners) {
        if (!rc) continue;
        const rp: [number, number, number] = [rc[0], SKETCH_Y, rc[2]];
        const d = Math.sqrt(Math.pow(point[0] - rp[0], 2) + Math.pow(point[2] - rp[2], 2));
        if (d < threshold) candidates.push({ point: rp, type: "Endpoint", dist: d });
      }
      // Rectangle midpoints
      const c1 = obj.rectCorners[0];
      const c2 = obj.rectCorners[1];
      if (c1 && c2) {
        const mids: [number, number, number][] = [
          [(c1[0] + c2[0]) / 2, SKETCH_Y, c1[2]],
          [(c1[0] + c2[0]) / 2, SKETCH_Y, c2[2]],
          [c1[0], SKETCH_Y, (c1[2] + c2[2]) / 2],
          [c2[0], SKETCH_Y, (c1[2] + c2[2]) / 2],
        ];
        for (const mid of mids) {
          const d = Math.sqrt(Math.pow(point[0] - mid[0], 2) + Math.pow(point[2] - mid[2], 2));
          if (d < threshold) candidates.push({ point: mid, type: "Midpoint", dist: d });
        }
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.dist - b.dist);
  return { point: candidates[0].point, type: candidates[0].type };
}

/* ── Check alignment with existing points ── */
function checkAlignment(
  point: [number, number, number],
  objects: CadObject[],
  threshold: number
): { alignH: boolean; alignV: boolean; refPoint: [number, number, number] | null } {
  let alignH = false;
  let alignV = false;
  let refPoint: [number, number, number] | null = null;

  if (!point || !Array.isArray(objects)) return { alignH, alignV, refPoint };

  for (const obj of objects) {
    if (!obj || obj.visible === false) continue;
    const points: [number, number, number][] = [];
    if (Array.isArray(obj.linePoints)) {
      for (const lp of obj.linePoints) {
        if (lp) points.push(lp);
      }
    }
    if (obj.circleCenter) points.push(obj.circleCenter);
    if (Array.isArray(obj.rectCorners) && obj.rectCorners.length >= 2) {
      const rc0 = obj.rectCorners[0];
      const rc1 = obj.rectCorners[1];
      if (rc0) points.push([rc0[0], SKETCH_Y, rc0[2]]);
      if (rc1) points.push([rc1[0], SKETCH_Y, rc1[2]]);
    }

    for (const p of points) {
      if (!p) continue;
      if (Math.abs(point[0] - p[0]) < threshold && !alignV) {
        alignV = true;
        refPoint = p;
      }
      if (Math.abs(point[2] - p[2]) < threshold && !alignH) {
        alignH = true;
        refPoint = refPoint || p;
      }
    }
  }

  return { alignH, alignV, refPoint };
}

/* ── Sketch drawing tools ── */
function SketchDrawTools() {
  const activeTool = useCadStore((s) => s.activeTool);
  const sketchPlane = useCadStore((s) => s.sketchPlane);
  const addLine = useCadStore((s) => s.addLine);
  const addArc = useCadStore((s) => s.addArc);
  const addCircle = useCadStore((s) => s.addCircle);
  const addRectangle = useCadStore((s) => s.addRectangle);
  const snapGrid = useCadStore((s) => s.snapGrid);
  const gridSize = useCadStore((s) => s.gridSize);
  const objects = useCadStore((s) => s.objects);
  const isConstructionMode = useCadStore((s) => s.isConstructionMode);
  const setSketchDrawState = useCadStore((s) => s.setSketchDrawState);

  const plane = sketchPlane || "xz";
  const planeRotation: [number, number, number] = plane === "xz"
    ? [-Math.PI / 2, 0, 0]
    : plane === "xy"
    ? [0, 0, 0]
    : [0, Math.PI / 2, 0];
  const planeOffset: [number, number, number] = plane === "xz"
    ? [0, 0.01, 0]
    : plane === "xy"
    ? [0, 0, 0.01]
    : [0.01, 0, 0];

  const [clickPoints, setClickPoints] = useState<[number, number, number][]>([]);
  const [previewPoint, setPreviewPoint] = useState<[number, number, number] | null>(null);

  useEffect(() => {
    setClickPoints([]);
    setPreviewPoint(null);
    setSketchDrawState({ clickPoints: [], previewPoint: null, activeTool, snapType: null, alignH: false, alignV: false, alignRefPoint: null });
  }, [activeTool, setSketchDrawState]);

  // Sync draw state to store for overlay
  useEffect(() => {
    setSketchDrawState({ clickPoints, previewPoint, activeTool });
  }, [clickPoints, previewPoint, activeTool, setSketchDrawState]);

  if (!SKETCH_TOOLS.includes(activeTool)) return null;

  const SNAP_THRESHOLD = 0.3;

  const getSnappedPoint = (point: THREE.Vector3): [number, number, number] => {
    let raw: [number, number, number];
    if (plane === "xy") {
      raw = [snap(point.x, gridSize, snapGrid), snap(point.y, gridSize, snapGrid), 0.01];
    } else if (plane === "yz") {
      raw = [0.01, snap(point.y, gridSize, snapGrid), snap(point.z, gridSize, snapGrid)];
    } else {
      raw = [snap(point.x, gridSize, snapGrid), SKETCH_Y, snap(point.z, gridSize, snapGrid)];
    }

    // Check for object snap points
    const snapResult = findSnapPoint(raw, objects, SNAP_THRESHOLD);
    if (snapResult) {
      setSketchDrawState({ snapType: snapResult.type });
      return snapResult.point;
    }

    // Check alignment
    const alignment = checkAlignment(raw, objects, 0.15);
    setSketchDrawState({ snapType: snapGrid ? "Grid" : null, alignH: alignment.alignH, alignV: alignment.alignV, alignRefPoint: alignment.refPoint });
    return raw;
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!e.point) return;
    let p: [number, number, number];
    try {
      p = getSnappedPoint(e.point);
    } catch (err) {
      console.warn("[SketchDrawTools] getSnappedPoint error:", err);
      return;
    }

    const effectiveTool = isConstructionMode ? "construction_line" : activeTool;

    if (effectiveTool === "line" || effectiveTool === "construction_line") {
      if (clickPoints.length === 0) {
        setClickPoints([p]);
      } else {
        addLine([clickPoints[0], p]);
        // If construction mode, mark the line differently (via color)
        if (isConstructionMode) {
          const state = useCadStore.getState();
          const lastObj = state.objects[state.objects.length - 1];
          if (lastObj) {
            useCadStore.getState().updateObject(lastObj.id, {
              color: "#00D4FF",
              name: lastObj.name.replace("Line", "Construction"),
            });
          }
        }
        setClickPoints([]);
        setPreviewPoint(null);
      }
    } else if (activeTool === "arc") {
      const newPoints = [...clickPoints, p];
      if (newPoints.length < 3) {
        setClickPoints(newPoints);
      } else {
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
    if (!e.point) return;
    try {
      const snapped = getSnappedPoint(e.point);
      if (clickPoints.length > 0) {
        setPreviewPoint(snapped);
      }
    } catch (err) {
      console.warn("[SketchDrawTools] handleMove error:", err);
    }
  };

  const renderPreview = () => {
    if (clickPoints.length === 0 || !previewPoint) return null;

    const previewColor = isConstructionMode ? "#00D4FF" : undefined;

    if (activeTool === "line" || activeTool === "construction_line") {
      return (
        <Line
          points={[clickPoints[0], previewPoint]}
          color={previewColor || "#ffff00"}
          lineWidth={2}
          dashed
          dashSize={0.15}
          gapSize={0.1}
        />
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
          <Line points={pts} color="#00ff00" lineWidth={2} dashed dashSize={0.15} gapSize={0.1} />
          <Line points={[center, previewPoint]} color="#00ff00" lineWidth={1} dashed dashSize={0.1} gapSize={0.1} />
        </>
      );
    }

    if (activeTool === "rectangle") {
      const c1 = clickPoints[0];
      const c2 = previewPoint;
      const pts: [number, number, number][] = plane === "xy"
        ? [
            [c1[0], c1[1], 0.01], [c2[0], c1[1], 0.01],
            [c2[0], c2[1], 0.01], [c1[0], c2[1], 0.01], [c1[0], c1[1], 0.01],
          ]
        : plane === "yz"
        ? [
            [0.01, c1[1], c1[2]], [0.01, c1[1], c2[2]],
            [0.01, c2[1], c2[2]], [0.01, c2[1], c1[2]], [0.01, c1[1], c1[2]],
          ]
        : [
            [c1[0], SKETCH_Y, c1[2]], [c2[0], SKETCH_Y, c1[2]],
            [c2[0], SKETCH_Y, c2[2]], [c1[0], SKETCH_Y, c2[2]], [c1[0], SKETCH_Y, c1[2]],
          ];
      return (
        <Line points={pts} color="#ffaa00" lineWidth={2} dashed dashSize={0.15} gapSize={0.1} />
      );
    }

    return null;
  };

  // Collect all snap-able points for visual indicators
  const snapIndicators = useMemo(() => {
    const points: { pos: [number, number, number]; type: string }[] = [];
    for (const obj of objects) {
      if (!obj || obj.visible === false) continue;
      if (Array.isArray(obj.linePoints)) {
        for (const lp of obj.linePoints) {
          if (lp) points.push({ pos: lp, type: "endpoint" });
        }
        if (obj.linePoints.length >= 2 && obj.linePoints[0] && obj.linePoints[1]) {
          points.push({
            pos: [
              (obj.linePoints[0][0] + obj.linePoints[1][0]) / 2,
              (obj.linePoints[0][1] + obj.linePoints[1][1]) / 2,
              (obj.linePoints[0][2] + obj.linePoints[1][2]) / 2,
            ],
            type: "midpoint",
          });
        }
      }
      if (obj.circleCenter) {
        points.push({ pos: obj.circleCenter, type: "center" });
      }
      if (Array.isArray(obj.rectCorners) && obj.rectCorners.length >= 2 && obj.rectCorners[0] && obj.rectCorners[1]) {
        points.push({ pos: [obj.rectCorners[0][0], SKETCH_Y, obj.rectCorners[0][2]], type: "endpoint" });
        points.push({ pos: [obj.rectCorners[1][0], SKETCH_Y, obj.rectCorners[1][2]], type: "endpoint" });
        points.push({ pos: [obj.rectCorners[1][0], SKETCH_Y, obj.rectCorners[0][2]], type: "endpoint" });
        points.push({ pos: [obj.rectCorners[0][0], SKETCH_Y, obj.rectCorners[1][2]], type: "endpoint" });
      }
    }
    return points;
  }, [objects]);

  const snapPointColor = (type: string) => {
    switch (type) {
      case "endpoint": return "#ff8c00";
      case "midpoint": return "#00ff88";
      case "center": return "#ff00ff";
      default: return "#ffaa00";
    }
  };

  return (
    <>
      <mesh
        rotation={planeRotation}
        position={planeOffset}
        onClick={handleClick}
        onPointerMove={handleMove}
        visible={false}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {renderPreview()}
      {/* Click points */}
      {clickPoints.map((pt, i) => (
        <mesh key={i} position={pt}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={isConstructionMode ? "#00D4FF" : "#ffff00"} />
        </mesh>
      ))}
      {/* Crosshair at preview point */}
      {previewPoint && (
        <group position={previewPoint}>
          <Line points={[[-0.15, 0, 0], [0.15, 0, 0]]} color="#ffffff" lineWidth={1} />
          <Line points={[[0, 0, -0.15], [0, 0, 0.15]]} color="#ffffff" lineWidth={1} />
        </group>
      )}
      {/* Snap point indicators - colored dots at snap-able points */}
      {snapIndicators.map((si, i) => (
        <mesh key={`snap-${i}`} position={si.pos}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color={snapPointColor(si.type)} transparent opacity={0.7} />
        </mesh>
      ))}
    </>
  );
}

/* ── Camera Controller - responds to cameraView and sketchPlane changes ── */
function CameraController() {
  const cameraView = useCadStore((s) => s.cameraView);
  const setCameraView = useCadStore((s) => s.setCameraView);
  const sketchPlane = useCadStore((s) => s.sketchPlane);
  const { camera } = useThree();

  // Lock camera to orthographic view when entering sketch mode
  useEffect(() => {
    const distance = 10;
    if (sketchPlane) {
      const positions: Record<string, [number, number, number]> = {
        xy: [0, 0, distance],
        xz: [0, distance, 0.01],
        yz: [distance, 0, 0],
      };
      camera.position.set(...positions[sketchPlane]);
      camera.lookAt(0, 0, 0);
      // Switch to orthographic-like by using a very narrow FOV
      if ((camera as THREE.PerspectiveCamera).fov !== undefined) {
        (camera as THREE.PerspectiveCamera).fov = 2;
        (camera as THREE.PerspectiveCamera).position.multiplyScalar(25);
      }
      camera.updateProjectionMatrix();
    } else {
      // Restore perspective camera
      if ((camera as THREE.PerspectiveCamera).fov !== undefined) {
        (camera as THREE.PerspectiveCamera).fov = 50;
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);
      }
      camera.updateProjectionMatrix();
    }
  }, [sketchPlane, camera]);

  useEffect(() => {
    if (!cameraView) return;

    const distance = 8;
    const targets: Record<string, [number, number, number]> = {
      front: [0, 0, distance],
      back: [0, 0, -distance],
      left: [-distance, 0, 0],
      right: [distance, 0, 0],
      top: [0, distance, 0.01],
      bottom: [0, -distance, 0.01],
      iso: [distance * 0.7, distance * 0.7, distance * 0.7],
    };

    const target = targets[cameraView];
    if (target) {
      camera.position.set(...target);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }

    setCameraView(null);
  }, [cameraView, camera, setCameraView]);

  return null;
}

/* ── Keyboard shortcuts ── */
function KeyboardHandler() {
  const deleteSelected = useCadStore((s) => s.deleteSelected);
  const setTransformMode = useCadStore((s) => s.setTransformMode);
  const setActiveTool = useCadStore((s) => s.setActiveTool);
  const undo = useCadStore((s) => s.undo);
  const redo = useCadStore((s) => s.redo);
  const setSnapGrid = useCadStore((s) => s.setSnapGrid);
  const snapGrid = useCadStore((s) => s.snapGrid);
  const showDimensions = useCadStore((s) => s.showDimensions);
  const setShowDimensions = useCadStore((s) => s.setShowDimensions);
  const setCameraView = useCadStore((s) => s.setCameraView);
  const setPerspectiveMode = useCadStore((s) => s.setPerspectiveMode);
  const perspectiveMode = useCadStore((s) => s.perspectiveMode);
  const selectAll = useCadStore((s) => s.selectAll);
  const duplicateSelected = useCadStore((s) => s.duplicateSelected);
  const selectObject = useCadStore((s) => s.selectObject);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        selectAll();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      switch (e.key) {
        case "Delete":
        case "Backspace":
          deleteSelected();
          break;
        case "g":
          setSnapGrid(!snapGrid);
          break;
        case "w":
          setTransformMode("translate");
          break;
        case "r":
          if (!e.ctrlKey && !e.metaKey) setTransformMode("rotate");
          break;
        case "s":
          if (!e.ctrlKey && !e.metaKey) setTransformMode("scale");
          break;
        case "Escape":
          setActiveTool("select");
          selectObject(null);
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
        case "m":
          setActiveTool("measure");
          break;
        case "d":
          if (!e.ctrlKey && !e.metaKey) setShowDimensions(!showDimensions);
          break;
        case "f":
          setCameraView("iso");
          break;
        case "1":
          setCameraView("front");
          break;
        case "3":
          setCameraView("right");
          break;
        case "7":
          setCameraView("top");
          break;
        case "5":
          setPerspectiveMode(!perspectiveMode);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, setTransformMode, setActiveTool, undo, redo, setSnapGrid, snapGrid, showDimensions, setShowDimensions, setCameraView, setPerspectiveMode, perspectiveMode, selectAll, duplicateSelected, selectObject]);

  return null;
}

/* ── Helper: compute arc through 3 points ── */
function computeArcThrough3Points(
  p1: [number, number, number],
  p2: [number, number, number],
  p3: [number, number, number]
): [number, number, number][] {
  const ax = p1[0], az = p1[2];
  const bx = p2[0], bz = p2[2];
  const cx = p3[0], cz = p3[2];

  const D = 2 * (ax * (bz - cz) + bx * (cz - az) + cx * (az - bz));
  if (Math.abs(D) < 1e-10) {
    return [p1, p2, p3];
  }

  const ux = ((ax * ax + az * az) * (bz - cz) + (bx * bx + bz * bz) * (cz - az) + (cx * cx + cz * cz) * (az - bz)) / D;
  const uz = ((ax * ax + az * az) * (cx - bx) + (bx * bx + bz * bz) * (ax - cx) + (cx * cx + cz * cz) * (bx - ax)) / D;

  const radius = Math.sqrt((ax - ux) * (ax - ux) + (az - uz) * (az - uz));

  const normalize = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  let angle1 = normalize(Math.atan2(az - uz, ax - ux));
  const angle2 = normalize(Math.atan2(bz - uz, bx - ux));
  const angle3 = normalize(Math.atan2(cz - uz, cx - ux));

  const ccwSpan = normalize(angle3 - angle1);
  const ccwToMid = normalize(angle2 - angle1);

  let totalAngle: number;
  if (ccwToMid < ccwSpan) {
    totalAngle = ccwSpan;
  } else {
    totalAngle = ccwSpan - 2 * Math.PI;
  }

  const segments = Math.max(16, Math.abs(Math.round(totalAngle / (Math.PI / 32))));
  const points: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = angle1 + totalAngle * t;
    points.push([
      ux + radius * Math.cos(angle),
      SKETCH_Y,
      uz + radius * Math.sin(angle),
    ]);
  }

  return points;
}

/* ── Sketch plane indicator with professional grid ── */
function SketchPlaneIndicator() {
  const activeTool = useCadStore((s) => s.activeTool);
  const sketchPlane = useCadStore((s) => s.sketchPlane);

  if (!SKETCH_TOOLS.includes(activeTool) && !sketchPlane) return null;

  const plane = sketchPlane || "xz";
  const rotation: [number, number, number] = plane === "xz"
    ? [-Math.PI / 2, 0, 0]
    : plane === "xy"
    ? [0, 0, 0]
    : [0, Math.PI / 2, 0];
  const position: [number, number, number] = plane === "xz"
    ? [0, 0.005, 0]
    : plane === "xy"
    ? [0, 0, 0.005]
    : [0.005, 0, 0];

  const planeColor = plane === "xy" ? "#4444ff" : plane === "xz" ? "#44ff44" : "#ff4444";
  const y = 0.006;

  // Generate grid lines: major every 10 units, minor every 1 unit
  const gridLines = useMemo(() => {
    const major: [number, number, number][][] = [];
    const minor: [number, number, number][][] = [];
    const extent = 20;

    for (let i = -extent; i <= extent; i++) {
      const isMajor = i % 10 === 0;
      const target = isMajor ? major : minor;

      if (plane === "xz") {
        target.push([[i, y, -extent], [i, y, extent]]);
        target.push([[-extent, y, i], [extent, y, i]]);
      } else if (plane === "xy") {
        target.push([[i, -extent, y], [i, extent, y]]);
        target.push([[-extent, i, y], [extent, i, y]]);
      } else {
        target.push([[y, i, -extent], [y, i, extent]]);
        target.push([[y, -extent, i], [y, extent, i]]);
      }
    }
    return { major, minor };
  }, [plane]);

  return (
    <>
      {/* Sketch plane background */}
      <mesh rotation={rotation} position={position}>
        <planeGeometry args={[40, 40]} />
        <meshBasicMaterial color={planeColor} transparent opacity={0.03} side={THREE.DoubleSide} />
      </mesh>
      {/* Minor grid lines (every 1 unit) */}
      {gridLines.minor.map((pts, i) => (
        <Line
          key={`minor-${i}`}
          points={pts as [number, number, number][]}
          color="#00D4FF"
          lineWidth={0.3}
          transparent
          opacity={0.06}
        />
      ))}
      {/* Major grid lines (every 10 units) */}
      {gridLines.major.map((pts, i) => (
        <Line
          key={`major-${i}`}
          points={pts as [number, number, number][]}
          color="#00D4FF"
          lineWidth={0.6}
          transparent
          opacity={0.2}
        />
      ))}
    </>
  );
}

/* ── Cursor position tracker ── */
function CursorTracker() {
  const setCursorPosition = useCadStore((s) => s.setCursorPosition);
  const { raycaster, camera, gl } = useThree();
  const groundRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!groundRef.current) return;
    const intersects = raycaster.intersectObject(groundRef.current);
    if (intersects.length > 0) {
      const p = intersects[0].point;
      setCursorPosition([
        Math.round(p.x * 100) / 100,
        Math.round(p.y * 100) / 100,
        Math.round(p.z * 100) / 100,
      ]);
    }
  });

  void camera;
  void gl;

  return (
    <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} visible={false}>
      <planeGeometry args={[1000, 1000]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

/* ── Selection resize handles ── */
function SelectionHandles() {
  const selectedId = useCadStore((s) => s.selectedId);
  const objects = useCadStore((s) => s.objects);
  const activeTool = useCadStore((s) => s.activeTool);

  const selected = objects.find((o) => o.id === selectedId);
  if (!selected || activeTool !== "select") return null;

  // For sketch entities, show handles at key points
  if (selected.type === "line" && selected.linePoints && selected.linePoints.length === 2) {
    const [p1, p2] = selected.linePoints;
    const mid: [number, number, number] = [
      (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2,
    ];
    return (
      <group>
        {[p1, p2, mid].map((pt, i) => (
          <mesh key={i} position={pt}>
            <boxGeometry args={[0.08, 0.08, 0.08]} />
            <meshBasicMaterial color={i === 2 ? "#00ff88" : "#ffffff"} />
          </mesh>
        ))}
      </group>
    );
  }

  if (selected.type === "rectangle" && selected.rectCorners) {
    const [c1, c2] = selected.rectCorners;
    const corners: [number, number, number][] = [
      [c1[0], SKETCH_Y, c1[2]],
      [c2[0], SKETCH_Y, c1[2]],
      [c2[0], SKETCH_Y, c2[2]],
      [c1[0], SKETCH_Y, c2[2]],
    ];
    const midpoints: [number, number, number][] = corners.map((c, i) => {
      const next = corners[(i + 1) % corners.length];
      return [(c[0] + next[0]) / 2, SKETCH_Y, (c[2] + next[2]) / 2];
    });
    return (
      <group>
        {corners.map((pt, i) => (
          <mesh key={`c-${i}`} position={pt}>
            <boxGeometry args={[0.08, 0.08, 0.08]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}
        {midpoints.map((pt, i) => (
          <mesh key={`m-${i}`} position={pt}>
            <boxGeometry args={[0.06, 0.06, 0.06]} />
            <meshBasicMaterial color="#00ff88" />
          </mesh>
        ))}
      </group>
    );
  }

  if (selected.type === "circle" && selected.circleCenter && selected.circleRadius) {
    const c = selected.circleCenter;
    const r = selected.circleRadius;
    const quadrants: [number, number, number][] = [
      [c[0] + r, SKETCH_Y, c[2]],
      [c[0] - r, SKETCH_Y, c[2]],
      [c[0], SKETCH_Y, c[2] + r],
      [c[0], SKETCH_Y, c[2] - r],
    ];
    return (
      <group>
        {quadrants.map((pt, i) => (
          <mesh key={i} position={pt}>
            <boxGeometry args={[0.07, 0.07, 0.07]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}
      </group>
    );
  }

  return null;
}

/* ── Background gradient ── */
function GradientBackground() {
  const { scene } = useThree();

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, "#0a0a1a");
    gradient.addColorStop(1, "#1a1a2e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;

    return () => {
      texture.dispose();
    };
  }, [scene]);

  return null;
}

/* ── Main Viewport ── */
interface Viewport3DProps {
  mode?: "designer" | "simulator" | "assembly";
}

export default function Viewport3D({ mode }: Viewport3DProps) {
  const objects = useCadStore((s) => s.objects);
  const activeTool = useCadStore((s) => s.activeTool);
  const showGrid = useCadStore((s) => s.showGrid);
  const showOrigin = useCadStore((s) => s.showOrigin);
  const sketchPlane = useCadStore((s) => s.sketchPlane);
  const isSketchMode = SKETCH_TOOLS.includes(activeTool);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div className={`w-full h-full relative ${isSketchMode ? "cursor-none" : ""}`} onContextMenu={handleContextMenu}>
      {contextMenu && (
        <ViewportContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        onPointerMissed={() => {
          useCadStore.getState().selectObject(null);
        }}
      >
        <GradientBackground />

        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />
        <directionalLight position={[-3, 4, -5]} intensity={0.3} />

        {showGrid && (
          <Grid
            args={[20, 20]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor={isSketchMode ? "#1a3744" : "#1a2744"}
            sectionSize={5}
            sectionThickness={1}
            sectionColor={isSketchMode ? "#0f6060" : "#0f3460"}
            fadeDistance={25}
            infiniteGrid
          />
        )}

        {showOrigin && <axesHelper args={[3]} />}

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
        <SelectionHandles />
        <DimensionOverlay />
        <SmartDimensions />
        <MeasurementTool />
        <ConstraintIndicators />

        <ContactShadows position={[0, -0.01, 0]} opacity={0.4} blur={2} />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          enabled={!sketchPlane}
          enableRotate={!sketchPlane}
          enableZoom={true}
          enablePan={!sketchPlane}
        />

        <GizmoHelper alignment="top-right" margin={[80, 80]}>
          <GizmoViewport
            labelColor="white"
            axisHeadScale={0.8}
            axisColors={["#ff4444", "#44ff44", "#4444ff"]}
          />
        </GizmoHelper>

        <CameraController />
        <CursorTracker />
        <Environment preset="city" />
        <KeyboardHandler />
      </Canvas>
    </div>
  );
}

