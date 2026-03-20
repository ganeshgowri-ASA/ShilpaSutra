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
import { Evaluator, Brush, SUBTRACTION, ADDITION, INTERSECTION } from "three-bvh-csg";
import {
  useCadStore,
  type CadObject,
  type ToolId,
} from "@/stores/cad-store";
import DimensionOverlay from "@/components/cad/DimensionOverlay";
import MeasurementTool from "@/components/cad/MeasurementTool";
import ConstraintIndicators from "@/components/cad/ConstraintIndicators";
import SmartDimensions from "@/components/cad/SmartDimensions";

const SKETCH_TOOLS: ToolId[] = ["line", "arc", "circle", "rectangle", "polygon", "spline", "ellipse", "construction_line"];
const BOOLEAN_TOOLS: ToolId[] = ["boolean_union", "boolean_subtract", "boolean_intersect"];
const SKETCH_Y = 0.02;

/* ── Snap helper ── */
function snap(value: number, gridSize: number, enabled: boolean): number {
  if (!enabled) return value;
  return Math.round(value / gridSize) * gridSize;
}

/* ── Helper: build THREE geometry from CadObject ── */
function buildGeometry(obj: CadObject): THREE.BufferGeometry {
  switch (obj.type) {
    case "box":
      return new THREE.BoxGeometry(obj.dimensions.width, obj.dimensions.height, obj.dimensions.depth);
    case "cylinder":
      return new THREE.CylinderGeometry(obj.dimensions.width, obj.dimensions.width, obj.dimensions.height, 32);
    case "sphere":
      return new THREE.SphereGeometry(obj.dimensions.width, 32, 32);
    case "cone":
      return new THREE.ConeGeometry(obj.dimensions.width, obj.dimensions.height, 32);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

/* ── Boolean CSG Operations ── */
function BooleanOperator() {
  const booleanMode = useCadStore((s) => s.booleanMode);
  const setBooleanMode = useCadStore((s) => s.setBooleanMode);
  const selectedIds = useCadStore((s) => s.selectedIds);
  const objects = useCadStore((s) => s.objects);
  const addGeneratedObject = useCadStore((s) => s.addGeneratedObject);
  const deleteObject = useCadStore((s) => s.deleteObject);
  const pushHistory = useCadStore((s) => s.pushHistory);

  useEffect(() => {
    if (!booleanMode) return;
    if (selectedIds.length < 2) {
      alert("Select 2 objects first, then choose a boolean operation.");
      setBooleanMode(null);
      return;
    }

    const objs = selectedIds.map((id) => objects.find((o) => o.id === id)).filter(Boolean) as CadObject[];
    const solidObjs = objs.filter((o) => ["box","cylinder","sphere","cone","mesh"].includes(o.type));
    if (solidObjs.length < 2) {
      alert("Boolean operations require 2 solid objects.");
      setBooleanMode(null);
      return;
    }

    try {
      const evaluator = new Evaluator();
      const matA = new THREE.MeshStandardMaterial({ color: solidObjs[0].color });
      const matB = new THREE.MeshStandardMaterial({ color: solidObjs[1].color });

      const geoA = buildGeometry(solidObjs[0]);
      const geoB = buildGeometry(solidObjs[1]);
      const meshA = new Brush(geoA, matA);
      const meshB = new Brush(geoB, matB);

      // Apply transforms
      meshA.position.set(...solidObjs[0].position);
      meshA.rotation.set(...solidObjs[0].rotation);
      meshA.scale.set(...solidObjs[0].scale);
      meshB.position.set(...solidObjs[1].position);
      meshB.rotation.set(...solidObjs[1].rotation);
      meshB.scale.set(...solidObjs[1].scale);

      meshA.updateMatrixWorld(true);
      meshB.updateMatrixWorld(true);

      const op = booleanMode === "union" ? ADDITION : booleanMode === "subtract" ? SUBTRACTION : INTERSECTION;
      const result = evaluator.evaluate(meshA, meshB, op);

      // Extract vertices and indices from result
      const geo = result.geometry;
      const positions = geo.attributes.position;
      const vertices: number[] = [];
      const indices: number[] = [];

      for (let i = 0; i < positions.count; i++) {
        vertices.push(positions.getX(i), positions.getY(i), positions.getZ(i));
      }

      if (geo.index) {
        for (let i = 0; i < geo.index.count; i++) {
          indices.push(geo.index.getX(i));
        }
      } else {
        for (let i = 0; i < positions.count; i++) indices.push(i);
      }

      pushHistory();
      const opName = booleanMode === "union" ? "Union" : booleanMode === "subtract" ? "Subtract" : "Intersect";
      addGeneratedObject({
        type: "mesh",
        name: `${opName}(${solidObjs[0].name}, ${solidObjs[1].name})`,
        position: [0, 0, 0],
        color: solidObjs[0].color,
        material: solidObjs[0].material,
        meshVertices: vertices,
        meshIndices: indices,
      });

      // Delete source objects
      solidObjs.forEach((o) => deleteObject(o.id));

      // Cleanup
      geoA.dispose();
      geoB.dispose();
      matA.dispose();
      matB.dispose();
    } catch (err) {
      console.error("Boolean operation failed:", err);
    }

    setBooleanMode(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booleanMode]);

  return null;
}

/* ── Single CAD mesh ── */
function CadMesh({ obj }: { obj: CadObject }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const selectedId = useCadStore((s) => s.selectedId);
  const selectedIds = useCadStore((s) => s.selectedIds);
  const selectObject = useCadStore((s) => s.selectObject);
  const toggleSelectObject = useCadStore((s) => s.toggleSelectObject);
  const setContextMenu = useCadStore((s) => s.setContextMenu);
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

  const handleContextMenu = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      e.nativeEvent.preventDefault();
      selectObject(obj.id);
      setContextMenu({ x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, objectId: obj.id });
    },
    [selectObject, setContextMenu, obj.id]
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
      case "mesh":
        if (obj.meshVertices && obj.meshIndices) {
          return (
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array(obj.meshVertices), 3]}
              />
              <bufferAttribute
                attach="index"
                args={[new Uint32Array(obj.meshIndices), 1]}
              />
            </bufferGeometry>
          );
        }
        return <boxGeometry args={[1, 1, 1]} />;
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
      onContextMenu={handleContextMenu}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
      userData={{ cadId: obj.id }}
    >
      {geometry}
      <meshStandardMaterial
        color={obj.color}
        metalness={obj.metalness ?? 0.4}
        roughness={obj.roughness ?? 0.5}
        opacity={obj.opacity ?? 1}
        transparent={(obj.opacity ?? 1) < 1}
        emissive={isSelected ? "#00D4FF" : hovered ? "#334466" : "#000000"}
        emissiveIntensity={isSelected ? 0.2 : hovered ? 0.12 : 0}
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
        color={isSelected ? "#00D4FF" : obj.color}
        lineWidth={isSelected ? 3 : 2}
      />
      {obj.linePoints.map((pt, i) => (
        <mesh key={i} position={pt}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={isSelected ? "#00D4FF" : "#00ffff"} />
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
  const setCursorPosition = useCadStore((s) => s.setCursorPosition);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (activeTool === "measure") {
        e.stopPropagation();
        const p = e.point;
        addMeasurePoint([snap(p.x, gridSize, snapGrid), 0, snap(p.z, gridSize, snapGrid)]);
        return;
      }
      if (activeTool === "measure_angle") {
        e.stopPropagation();
        const p = e.point;
        const pts = useCadStore.getState().measurePoints;
        if (pts.length < 3) {
          addMeasurePoint([snap(p.x, gridSize, snapGrid), 0, snap(p.z, gridSize, snapGrid)]);
        } else {
          useCadStore.getState().clearMeasure();
        }
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
      onPointerMove={(e) => {
        const p = e.point;
        setCursorPosition([
          Math.round(snap(p.x, gridSize, snapGrid) * 100) / 100,
          0,
          Math.round(snap(p.z, gridSize, snapGrid) * 100) / 100,
        ]);
      }}
      visible={false}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
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
  // Determine plane rotation and coordinate mapping based on sketchPlane
  // xz: ground plane (default), xy: front plane, yz: side plane
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
  }, [activeTool]);

  if (!SKETCH_TOOLS.includes(activeTool)) return null;

  const getSnappedPoint = (point: THREE.Vector3): [number, number, number] => {
    if (plane === "xy") {
      return [snap(point.x, gridSize, snapGrid), snap(point.y, gridSize, snapGrid), 0.01];
    } else if (plane === "yz") {
      return [0.01, snap(point.y, gridSize, snapGrid), snap(point.z, gridSize, snapGrid)];
    }
    // xz (default)
    return [snap(point.x, gridSize, snapGrid), SKETCH_Y, snap(point.z, gridSize, snapGrid)];
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
    } else if (activeTool === "polygon") {
      // Double-click closes polygon; single click adds vertex
      const newPoints = [...clickPoints, p];
      if (clickPoints.length >= 2 && Math.sqrt(
        Math.pow(p[0] - clickPoints[0][0], 2) + Math.pow(p[2] - clickPoints[0][2], 2)
      ) < 0.3) {
        // Close polygon - draw edges
        for (let i = 0; i < clickPoints.length; i++) {
          addLine([clickPoints[i], clickPoints[(i + 1) % clickPoints.length]]);
        }
        setClickPoints([]);
        setPreviewPoint(null);
      } else {
        setClickPoints(newPoints);
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
    if (clickPoints.length > 0) {
      setPreviewPoint(getSnappedPoint(e.point));
    }
  };

  const renderPreview = () => {
    if (clickPoints.length === 0 || !previewPoint) return null;

    if (activeTool === "line" || activeTool === "polygon") {
      const pts: [number,number,number][] = clickPoints.length >= 2
        ? [...clickPoints, previewPoint]
        : [clickPoints[0], previewPoint];
      return (
        <>
          <Line points={pts} color="#ffff00" lineWidth={2} dashed dashSize={0.15} gapSize={0.1} />
          {activeTool === "polygon" && clickPoints.length >= 2 && (
            <Line points={[previewPoint, clickPoints[0]]} color="#ffff0060" lineWidth={1} dashed dashSize={0.1} gapSize={0.1} />
          )}
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
      {clickPoints.map((pt, i) => (
        <mesh key={i} position={pt}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#ffff00" />
        </mesh>
      ))}
      {previewPoint && (
        <group position={previewPoint}>
          <Line points={[[-0.15, 0, 0], [0.15, 0, 0]]} color="#ffffff" lineWidth={1} />
          <Line points={[[0, 0, -0.15], [0, 0, 0.15]]} color="#ffffff" lineWidth={1} />
        </group>
      )}
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
  const selectAll = useCadStore((s) => s.selectAll);
  const duplicateSelected = useCadStore((s) => s.duplicateSelected);
  const setTransformMode = useCadStore((s) => s.setTransformMode);
  const setActiveTool = useCadStore((s) => s.setActiveTool);
  const selectObject = useCadStore((s) => s.selectObject);
  const undo = useCadStore((s) => s.undo);
  const redo = useCadStore((s) => s.redo);
  const setSnapGrid = useCadStore((s) => s.setSnapGrid);
  const snapGrid = useCadStore((s) => s.snapGrid);
  const showDimensions = useCadStore((s) => s.showDimensions);
  const setShowDimensions = useCadStore((s) => s.setShowDimensions);
  const setCameraView = useCadStore((s) => s.setCameraView);
  const setPerspectiveMode = useCadStore((s) => s.setPerspectiveMode);
  const perspectiveMode = useCadStore((s) => s.perspectiveMode);
  const objects = useCadStore((s) => s.objects);

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
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "Z"))) {
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
        case "f": {
          // Fit/zoom to selection or all objects
          setCameraView("iso");
          break;
        }
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
  }, [deleteSelected, selectAll, duplicateSelected, selectObject, setTransformMode, setActiveTool, undo, redo, setSnapGrid, snapGrid, showDimensions, setShowDimensions, setCameraView, setPerspectiveMode, perspectiveMode, objects]);

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

/* ── Sketch plane indicator ── */
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

  return (
    <>
      <mesh rotation={rotation} position={position}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial color="#00D4FF" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>
      {/* Grid lines on sketch plane */}
      {[-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10].map((i) => (
        <group key={i}>
          <Line
            points={plane === "xz" ? [[i, 0.006, -10], [i, 0.006, 10]] as [number,number,number][] : plane === "xy" ? [[i, -10, 0.006], [i, 10, 0.006]] as [number,number,number][] : [[0.006, i, -10], [0.006, i, 10]] as [number,number,number][]}
            color="#00D4FF"
            lineWidth={0.4}
            transparent
            opacity={0.15}
          />
          <Line
            points={plane === "xz" ? [[-10, 0.006, i], [10, 0.006, i]] as [number,number,number][] : plane === "xy" ? [[-10, i, 0.006], [10, i, 0.006]] as [number,number,number][] : [[0.006, -10, i], [0.006, 10, i]] as [number,number,number][]}
            color="#00D4FF"
            lineWidth={0.4}
            transparent
            opacity={0.15}
          />
        </group>
      ))}
    </>
  );
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

/* ── Context Menu ── */
function ContextMenu() {
  const contextMenu = useCadStore((s) => s.contextMenu);
  const setContextMenu = useCadStore((s) => s.setContextMenu);
  const objects = useCadStore((s) => s.objects);
  const deleteObject = useCadStore((s) => s.deleteObject);
  const toggleVisibility = useCadStore((s) => s.toggleVisibility);
  const featureHistory = useCadStore((s) => s.featureHistory);
  const duplicateSelected = useCadStore((s) => s.duplicateSelected);
  const updateObject = useCadStore((s) => s.updateObject);
  const [colorInput, setColorInput] = useState<string | null>(null);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    return () => window.removeEventListener("click", close);
  }, [setContextMenu]);

  if (!contextMenu) return null;

  const obj = objects.find((o) => o.id === contextMenu.objectId);
  const feat = featureHistory.find((f) => f.objectId === contextMenu.objectId);
  if (!obj) return null;

  const items = [
    {
      label: feat?.visible !== false ? "Hide" : "Show",
      action: () => {
        if (feat) toggleVisibility(feat.id);
        setContextMenu(null);
      },
    },
    {
      label: "Duplicate",
      action: () => { duplicateSelected(); setContextMenu(null); },
    },
    { label: "divider" },
    {
      label: "Change Color",
      action: () => { setColorInput(obj.color); },
    },
    { label: "divider" },
    {
      label: "Delete",
      action: () => { deleteObject(obj.id); setContextMenu(null); },
      danger: true,
    },
  ];

  return (
    <div
      style={{ position: "fixed", left: contextMenu.x, top: contextMenu.y, zIndex: 9999 }}
      className="bg-[#1a1a2e] border border-[#16213e] rounded-lg shadow-2xl py-1 min-w-[160px]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 text-[10px] text-slate-500 border-b border-[#16213e] mb-1 font-medium truncate">
        {obj.name}
      </div>
      {colorInput !== null && (
        <div className="px-3 py-2 flex items-center gap-2">
          <input
            type="color"
            value={colorInput}
            onChange={(e) => setColorInput(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border-0"
          />
          <button
            className="text-[11px] text-[#00D4FF] hover:text-white"
            onClick={() => {
              updateObject(obj.id, { color: colorInput! });
              setColorInput(null);
              setContextMenu(null);
            }}
          >
            Apply
          </button>
          <button
            className="text-[11px] text-slate-500 hover:text-white"
            onClick={() => setColorInput(null)}
          >
            Cancel
          </button>
        </div>
      )}
      {items.map((item, i) =>
        item.label === "divider" ? (
          <div key={i} className="my-1 h-px bg-[#16213e]" />
        ) : (
          <button
            key={i}
            onClick={item.action}
            className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors hover:bg-[#0f3460] ${
              item.danger ? "text-red-400 hover:text-red-300" : "text-slate-300 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
}

/* ── Boolean Operation UI trigger ── */
function BooleanToolActivator() {
  const activeTool = useCadStore((s) => s.activeTool);
  const setBooleanMode = useCadStore((s) => s.setBooleanMode);
  const setActiveTool = useCadStore((s) => s.setActiveTool);

  useEffect(() => {
    if (BOOLEAN_TOOLS.includes(activeTool)) {
      const mode = activeTool === "boolean_union" ? "union"
        : activeTool === "boolean_subtract" ? "subtract" : "intersect";
      setBooleanMode(mode);
      setActiveTool("select");
    }
  }, [activeTool, setBooleanMode, setActiveTool]);

  return null;
}

/* ── Angle measurement annotation ── */
function AngleMeasurement() {
  const measurePoints = useCadStore((s) => s.measurePoints);
  const activeTool = useCadStore((s) => s.activeTool);
  const addMeasurePoint = useCadStore((s) => s.addMeasurePoint);

  if (activeTool !== "measure_angle") return null;

  let angleDisplay = "";
  if (measurePoints.length === 3) {
    const [p1, p2, p3] = measurePoints;
    const v1 = new THREE.Vector3(p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]).normalize();
    const v2 = new THREE.Vector3(p3[0] - p2[0], p3[1] - p2[1], p3[2] - p2[2]).normalize();
    const angle = (Math.acos(Math.max(-1, Math.min(1, v1.dot(v2)))) * 180) / Math.PI;
    angleDisplay = `${angle.toFixed(1)}°`;
  }

  return (
    <>
      {measurePoints.map((pt, i) => (
        <mesh key={i} position={pt}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#ffaa00" />
        </mesh>
      ))}
      {measurePoints.length >= 2 && (
        <Line points={[measurePoints[0], measurePoints[1]]} color="#ffaa00" lineWidth={2} dashed dashSize={0.15} gapSize={0.1} />
      )}
      {measurePoints.length === 3 && (
        <>
          <Line points={[measurePoints[1], measurePoints[2]]} color="#ffaa00" lineWidth={2} dashed dashSize={0.15} gapSize={0.1} />
          <Html position={measurePoints[1]}>
            <div className="bg-[#1a1a2e]/95 border border-yellow-500/50 rounded px-2 py-1 text-xs text-yellow-300 font-mono whitespace-nowrap pointer-events-none -translate-x-1/2 -translate-y-8">
              {angleDisplay}
            </div>
          </Html>
        </>
      )}
    </>
  );
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
  const contextMenu = useCadStore((s) => s.contextMenu);

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        onPointerMissed={() => {
          useCadStore.getState().selectObject(null);
          useCadStore.getState().setContextMenu(null);
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

        <BooleanOperator />
        <BooleanToolActivator />
        <SelectedTransform />
        <DimensionOverlay />
        <SmartDimensions />
        <MeasurementTool />
        <AngleMeasurement />
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

        <GizmoHelper alignment="bottom-left" margin={[60, 60]}>
          <GizmoViewport
            labelColor="white"
            axisHeadScale={0.8}
            axisColors={["#ff4444", "#44ff44", "#4444ff"]}
          />
        </GizmoHelper>

        <CameraController />
        <Environment preset="city" />
        <KeyboardHandler />
      </Canvas>
      {contextMenu && <ContextMenu />}
    </div>
  );
}
