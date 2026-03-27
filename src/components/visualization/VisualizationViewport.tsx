"use client";

import { useRef, useMemo, useEffect, useCallback, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewport,
  Html,
  Line,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import {
  useVisualizationStore,
  DISCIPLINE_COLORS,
  type ModelComponent,
  type ClashResult,
  type Measurement3D,
  type Annotation3D,
  type ClippingPlane as ClipPlane,
} from "@/stores/visualization-store";

// ── Component mesh ─────────────────────────────────────────────────

function ComponentMesh({ component }: { component: ModelComponent }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const {
    models,
    selectedComponentId,
    selectComponent,
    currentPhase,
    timelineActive,
    clashResults,
    showClashes,
  } = useVisualizationStore();

  const model = useMemo(
    () => models.find((m) => m.id === component.modelId),
    [models, component.modelId]
  );

  const isSelected = selectedComponentId === component.id;

  // Phase visibility
  const phaseVisible = useMemo(() => {
    if (!timelineActive || currentPhase === -1) return true;
    if (component.constructionPhase === undefined) return true;
    return component.constructionPhase <= currentPhase;
  }, [timelineActive, currentPhase, component.constructionPhase]);

  // Clash highlighting
  const isClashing = useMemo(() => {
    if (!showClashes) return false;
    return clashResults.some(
      (c) =>
        !c.resolved &&
        (c.componentA === component.id || c.componentB === component.id)
    );
  }, [showClashes, clashResults, component.id]);

  if (!component.visible || !phaseVisible) return null;
  if (model && !model.visible) return null;

  const opacity = model ? model.opacity : 1;
  const baseColor = model?.color || "#6b7280";

  // Phase-based coloring
  let color = baseColor;
  if (timelineActive && component.phaseStatus) {
    switch (component.phaseStatus) {
      case "completed": color = "#22c55e"; break;
      case "in-progress": color = "#eab308"; break;
      case "planned": color = "#3b82f6"; break;
    }
  }
  if (isClashing) color = "#ef4444";
  if (isSelected) color = "#00D4FF";

  return (
    <group
      position={component.position}
      rotation={new THREE.Euler(...component.rotation)}
    >
      <mesh
        ref={meshRef}
        scale={component.scale}
        onClick={(e) => {
          e.stopPropagation();
          selectComponent(component.id);
        }}
        castShadow
        receiveShadow
      >
        {component.meshData && component.meshData.vertices.length > 0 ? (
          <CustomBufferGeometry meshData={component.meshData} />
        ) : (
          <boxGeometry args={[1, 1, 1]} />
        )}
        <meshStandardMaterial
          color={color}
          transparent={opacity < 1 || isClashing}
          opacity={isClashing ? 0.7 : opacity}
          metalness={0.2}
          roughness={0.6}
          emissive={isSelected ? "#00D4FF" : isClashing ? "#ef4444" : "#000000"}
          emissiveIntensity={isSelected ? 0.15 : isClashing ? 0.3 : 0}
        />
      </mesh>

      {/* Selection outline */}
      {isSelected && (
        <mesh scale={component.scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color="#00D4FF"
            wireframe
            transparent
            opacity={0.4}
          />
        </mesh>
      )}

      {/* Clash pulse indicator */}
      {isClashing && showClashes && (
        <ClashPulse scale={component.scale} />
      )}
    </group>
  );
}

// ── Custom buffer geometry ─────────────────────────────────────────

function CustomBufferGeometry({
  meshData,
}: {
  meshData: { vertices: number[]; indices: number[]; normals?: number[] };
}) {
  const geomRef = useRef<THREE.BufferGeometry>(null);

  useEffect(() => {
    if (!geomRef.current) return;
    const geom = geomRef.current;

    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(meshData.vertices, 3)
    );

    if (meshData.indices.length > 0) {
      geom.setIndex(meshData.indices);
    }

    if (meshData.normals && meshData.normals.length > 0) {
      geom.setAttribute(
        "normal",
        new THREE.Float32BufferAttribute(meshData.normals, 3)
      );
    } else {
      geom.computeVertexNormals();
    }

    geom.computeBoundingSphere();
  }, [meshData]);

  return <bufferGeometry ref={geomRef} />;
}

// ── Clash pulse effect ─────────────────────────────────────────────

function ClashPulse({ scale }: { scale: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = Math.sin(clock.getElapsedTime() * 4) * 0.5 + 0.5;
    meshRef.current.material = meshRef.current.material as THREE.MeshBasicMaterial;
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = t * 0.3;
    const s = 1 + t * 0.05;
    meshRef.current.scale.set(scale[0] * s, scale[1] * s, scale[2] * s);
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#ef4444" transparent opacity={0.2} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── Clash markers ──────────────────────────────────────────────────

function ClashMarkers() {
  const { clashResults, showClashes, selectedClashId, selectClash } =
    useVisualizationStore();

  if (!showClashes) return null;

  const unresolvedClashes = clashResults.filter((c) => !c.resolved);

  return (
    <>
      {unresolvedClashes.map((clash) => (
        <group key={clash.id} position={clash.location}>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              selectClash(clash.id);
            }}
          >
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial
              color={
                clash.severity === "critical"
                  ? "#ef4444"
                  : clash.severity === "major"
                  ? "#f97316"
                  : "#eab308"
              }
              transparent
              opacity={selectedClashId === clash.id ? 1 : 0.7}
            />
          </mesh>
          {selectedClashId === clash.id && (
            <Html center distanceFactor={8}>
              <div className="bg-[#161b22] border border-red-500/30 rounded px-2 py-1 text-[9px] text-slate-300 whitespace-nowrap shadow-lg pointer-events-none">
                <div className="font-bold text-red-400 capitalize">
                  {clash.type} - {clash.severity}
                </div>
                <div>{clash.description}</div>
              </div>
            </Html>
          )}
        </group>
      ))}
    </>
  );
}

// ── Measurement overlays ───────────────────────────────────────────

function MeasurementOverlays() {
  const { measurements, activeMeasurementPoints } = useVisualizationStore();

  return (
    <>
      {/* Active measurement points */}
      {activeMeasurementPoints.map((point, i) => (
        <mesh key={`mp-${i}`} position={point}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshBasicMaterial color="#00D4FF" />
        </mesh>
      ))}

      {/* Completed measurements */}
      {measurements.map((m) => (
        <MeasurementDisplay key={m.id} measurement={m} />
      ))}
    </>
  );
}

function MeasurementDisplay({ measurement }: { measurement: Measurement3D }) {
  if (measurement.points.length < 2) return null;

  const midpoint: [number, number, number] = [
    (measurement.points[0][0] + measurement.points[1][0]) / 2,
    (measurement.points[0][1] + measurement.points[1][1]) / 2 + 0.15,
    (measurement.points[0][2] + measurement.points[1][2]) / 2,
  ];

  return (
    <group>
      {/* Points */}
      {measurement.points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshBasicMaterial color="#00D4FF" />
        </mesh>
      ))}

      {/* Line between points */}
      <Line
        points={measurement.points}
        color="#00D4FF"
        lineWidth={1.5}
        dashed
        dashSize={0.1}
        gapSize={0.05}
      />

      {/* Label */}
      <Html position={midpoint} center distanceFactor={8}>
        <div className="bg-[#161b22]/90 border border-[#00D4FF]/30 rounded px-1.5 py-0.5 text-[9px] text-[#00D4FF] font-mono whitespace-nowrap pointer-events-none">
          {measurement.type === "angle"
            ? `${measurement.value.toFixed(1)}°`
            : `${measurement.value.toFixed(3)} ${measurement.unit}`}
        </div>
      </Html>
    </group>
  );
}

// ── Annotation markers ─────────────────────────────────────────────

function AnnotationMarkers() {
  const { annotations } = useVisualizationStore();

  return (
    <>
      {annotations
        .filter((a) => a.visible)
        .map((ann) => (
          <group key={ann.id}>
            {/* Leader line */}
            <Line
              points={[ann.anchorPoint, ann.position]}
              color={ann.color}
              lineWidth={1}
            />

            {/* Anchor point */}
            <mesh position={ann.anchorPoint}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshBasicMaterial color={ann.color} />
            </mesh>

            {/* Text label */}
            <Html position={ann.position} center distanceFactor={10}>
              <div
                className="rounded px-2 py-1 text-[9px] text-white font-medium whitespace-nowrap shadow-lg pointer-events-none max-w-[200px] break-words"
                style={{
                  backgroundColor: `${ann.color}dd`,
                  border: `1px solid ${ann.color}`,
                }}
              >
                {ann.text}
              </div>
            </Html>
          </group>
        ))}
    </>
  );
}

// ── Section box visualization ──────────────────────────────────────

function SectionBoxHelper() {
  const { sectionBox } = useVisualizationStore();

  if (!sectionBox.enabled) return null;

  const size: [number, number, number] = [
    sectionBox.max[0] - sectionBox.min[0],
    sectionBox.max[1] - sectionBox.min[1],
    sectionBox.max[2] - sectionBox.min[2],
  ];

  const center: [number, number, number] = [
    (sectionBox.min[0] + sectionBox.max[0]) / 2,
    (sectionBox.min[1] + sectionBox.max[1]) / 2,
    (sectionBox.min[2] + sectionBox.max[2]) / 2,
  ];

  return (
    <group position={center}>
      <mesh>
        <boxGeometry args={size} />
        <meshBasicMaterial
          color="#00D4FF"
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
        <lineBasicMaterial color="#00D4FF" transparent opacity={0.4} />
      </lineSegments>
    </group>
  );
}

// ── Clipping planes manager ────────────────────────────────────────

function ClippingPlanesManager() {
  const { clippingPlanes, sectionBox } = useVisualizationStore();
  const { gl } = useThree();

  useEffect(() => {
    const planes: THREE.Plane[] = [];

    // User clipping planes
    for (const cp of clippingPlanes) {
      if (cp.enabled) {
        const normal = new THREE.Vector3(...cp.normal);
        planes.push(new THREE.Plane(normal, cp.distance));
      }
    }

    // Section box planes
    if (sectionBox.enabled) {
      planes.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), -sectionBox.min[0]));
      planes.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), sectionBox.max[0]));
      planes.push(new THREE.Plane(new THREE.Vector3(0, 1, 0), -sectionBox.min[1]));
      planes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), sectionBox.max[1]));
      planes.push(new THREE.Plane(new THREE.Vector3(0, 0, 1), -sectionBox.min[2]));
      planes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), sectionBox.max[2]));
    }

    gl.clippingPlanes = planes;
    gl.localClippingEnabled = planes.length > 0;

    return () => {
      gl.clippingPlanes = [];
      gl.localClippingEnabled = false;
    };
  }, [clippingPlanes, sectionBox, gl]);

  return null;
}

// ── Walkthrough camera controller ──────────────────────────────────

function WalkthroughController() {
  const {
    walkthroughActive,
    walkthroughSpeed,
    walkthroughEyeHeight,
    walkthroughKeyframes,
    walkthroughPlaying,
    walkthroughTime,
    setWalkthroughTime,
    setCameraPosition,
    setCameraTarget,
  } = useVisualizationStore();
  const { camera } = useThree();
  const keysRef = useRef<Set<string>>(new Set());
  const yawRef = useRef(0);
  const pitchRef = useRef(0);

  // WASD movement
  useEffect(() => {
    if (!walkthroughActive) return;

    const handleKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        yawRef.current -= e.movementX * 0.002;
        pitchRef.current -= e.movementY * 0.002;
        pitchRef.current = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitchRef.current));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [walkthroughActive]);

  useFrame((_, delta) => {
    if (!walkthroughActive) return;

    // Playback mode
    if (walkthroughPlaying && walkthroughKeyframes.length >= 2) {
      const newTime = walkthroughTime + delta;
      const maxTime = walkthroughKeyframes[walkthroughKeyframes.length - 1].time;

      if (newTime >= maxTime) {
        setWalkthroughTime(0);
        return;
      }

      setWalkthroughTime(newTime);

      // Find keyframe pair
      let kfA = walkthroughKeyframes[0];
      let kfB = walkthroughKeyframes[1];
      for (let i = 0; i < walkthroughKeyframes.length - 1; i++) {
        if (newTime >= walkthroughKeyframes[i].time && newTime <= walkthroughKeyframes[i + 1].time) {
          kfA = walkthroughKeyframes[i];
          kfB = walkthroughKeyframes[i + 1];
          break;
        }
      }

      const t = (newTime - kfA.time) / (kfB.time - kfA.time);
      const pos: [number, number, number] = [
        kfA.position[0] + (kfB.position[0] - kfA.position[0]) * t,
        kfA.position[1] + (kfB.position[1] - kfA.position[1]) * t,
        kfA.position[2] + (kfB.position[2] - kfA.position[2]) * t,
      ];
      const target: [number, number, number] = [
        kfA.target[0] + (kfB.target[0] - kfA.target[0]) * t,
        kfA.target[1] + (kfB.target[1] - kfA.target[1]) * t,
        kfA.target[2] + (kfB.target[2] - kfA.target[2]) * t,
      ];

      camera.position.set(...pos);
      camera.lookAt(...target);
      setCameraPosition(pos);
      setCameraTarget(target);
      return;
    }

    // WASD movement
    const keys = keysRef.current;
    const speed = walkthroughSpeed * delta * (keys.has("shift") ? 2 : 1);

    const forward = new THREE.Vector3(
      Math.sin(yawRef.current),
      0,
      Math.cos(yawRef.current)
    );
    const right = new THREE.Vector3(
      Math.cos(yawRef.current),
      0,
      -Math.sin(yawRef.current)
    );

    const movement = new THREE.Vector3();
    if (keys.has("w")) movement.add(forward.clone().multiplyScalar(speed));
    if (keys.has("s")) movement.add(forward.clone().multiplyScalar(-speed));
    if (keys.has("a")) movement.add(right.clone().multiplyScalar(-speed));
    if (keys.has("d")) movement.add(right.clone().multiplyScalar(speed));
    if (keys.has(" ")) movement.y += speed;
    if (keys.has("control")) movement.y -= speed;

    if (movement.length() > 0) {
      camera.position.add(movement);
      camera.position.y = Math.max(walkthroughEyeHeight, camera.position.y);

      const lookDir = new THREE.Vector3(
        Math.sin(yawRef.current) * Math.cos(pitchRef.current),
        Math.sin(pitchRef.current),
        Math.cos(yawRef.current) * Math.cos(pitchRef.current)
      );

      const target = camera.position.clone().add(lookDir);
      camera.lookAt(target);

      setCameraPosition([camera.position.x, camera.position.y, camera.position.z]);
      setCameraTarget([target.x, target.y, target.z]);
    }
  });

  return null;
}

// ── Click handler for measurements ─────────────────────────────────

function MeasurementClickHandler() {
  const {
    activeTool,
    activeMeasurementPoints,
    addMeasurementPoint,
    addMeasurement,
    clearMeasurementPoints,
  } = useVisualizationStore();
  const { raycaster, camera, scene } = useThree();

  const isMeasuring =
    activeTool === "measure-distance" ||
    activeTool === "measure-angle" ||
    activeTool === "measure-area";

  const handleClick = useCallback(
    (event: THREE.Event) => {
      if (!isMeasuring) return;

      // Use the intersection point from the event
      const threeEvent = event as unknown as { point?: THREE.Vector3 };
      if (!threeEvent.point) return;

      const point: [number, number, number] = [
        threeEvent.point.x,
        threeEvent.point.y,
        threeEvent.point.z,
      ];

      const newPoints = [...activeMeasurementPoints, point];
      addMeasurementPoint(point);

      // Complete measurement based on type
      if (activeTool === "measure-distance" && newPoints.length === 2) {
        const dx = newPoints[1][0] - newPoints[0][0];
        const dy = newPoints[1][1] - newPoints[0][1];
        const dz = newPoints[1][2] - newPoints[0][2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        addMeasurement({
          id: `meas-${Date.now()}`,
          type: "distance",
          points: newPoints,
          value: dist,
          unit: "m",
        });
        clearMeasurementPoints();
      } else if (activeTool === "measure-angle" && newPoints.length === 3) {
        // Angle between two vectors from point B
        const v1 = [
          newPoints[0][0] - newPoints[1][0],
          newPoints[0][1] - newPoints[1][1],
          newPoints[0][2] - newPoints[1][2],
        ];
        const v2 = [
          newPoints[2][0] - newPoints[1][0],
          newPoints[2][1] - newPoints[1][1],
          newPoints[2][2] - newPoints[1][2],
        ];
        const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
        const mag1 = Math.sqrt(v1[0] ** 2 + v1[1] ** 2 + v1[2] ** 2);
        const mag2 = Math.sqrt(v2[0] ** 2 + v2[1] ** 2 + v2[2] ** 2);
        const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * (180 / Math.PI);

        addMeasurement({
          id: `meas-${Date.now()}`,
          type: "angle",
          points: newPoints,
          value: angle,
          unit: "deg",
        });
        clearMeasurementPoints();
      } else if (activeTool === "measure-area" && newPoints.length >= 3) {
        // Calculate area using Shoelace-like formula for 3D polygon
        let area = 0;
        for (let i = 1; i < newPoints.length - 1; i++) {
          const ab = [
            newPoints[i][0] - newPoints[0][0],
            newPoints[i][1] - newPoints[0][1],
            newPoints[i][2] - newPoints[0][2],
          ];
          const ac = [
            newPoints[i + 1][0] - newPoints[0][0],
            newPoints[i + 1][1] - newPoints[0][1],
            newPoints[i + 1][2] - newPoints[0][2],
          ];
          const crossX = ab[1] * ac[2] - ab[2] * ac[1];
          const crossY = ab[2] * ac[0] - ab[0] * ac[2];
          const crossZ = ab[0] * ac[1] - ab[1] * ac[0];
          area += Math.sqrt(crossX ** 2 + crossY ** 2 + crossZ ** 2) / 2;
        }

        addMeasurement({
          id: `meas-${Date.now()}`,
          type: "area",
          points: newPoints,
          value: area,
          unit: "m",
        });
        clearMeasurementPoints();
      }
    },
    [isMeasuring, activeTool, activeMeasurementPoints, addMeasurementPoint, addMeasurement, clearMeasurementPoints]
  );

  return null;
}

// ── Scene content ──────────────────────────────────────────────────

function SceneContent() {
  const { components, walkthroughActive, selectComponent } = useVisualizationStore();

  const allComponents = useMemo(
    () => Array.from(components.values()),
    [components]
  );

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight position={[-5, 8, -5]} intensity={0.3} />

      {/* Grid */}
      <Grid
        args={[40, 40]}
        position={[0, -0.01, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a2030"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#21262d"
        fadeDistance={30}
        fadeStrength={1}
        infiniteGrid
      />

      {/* Ground plane for click targets */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          selectComponent(null);
        }}
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#0a0e14" transparent opacity={0.3} />
      </mesh>

      {/* Components */}
      {allComponents.map((comp) => (
        <ComponentMesh key={comp.id} component={comp} />
      ))}

      {/* Clash markers */}
      <ClashMarkers />

      {/* Measurements */}
      <MeasurementOverlays />

      {/* Annotations */}
      <AnnotationMarkers />

      {/* Section box visualization */}
      <SectionBoxHelper />

      {/* Clipping planes */}
      <ClippingPlanesManager />

      {/* Measurement click handler */}
      <MeasurementClickHandler />

      {/* Walkthrough controller */}
      <WalkthroughController />

      {/* Camera controls */}
      {!walkthroughActive && (
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.1}
          minDistance={0.5}
          maxDistance={100}
        />
      )}

      {/* Gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport
          axisColors={["#ef4444", "#22c55e", "#3b82f6"]}
          labelColor="white"
        />
      </GizmoHelper>
    </>
  );
}

// ── Main viewport ──────────────────────────────────────────────────

export default function VisualizationViewport() {
  const { walkthroughActive } = useVisualizationStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleCanvasClick = useCallback(() => {
    if (walkthroughActive && canvasRef.current) {
      canvasRef.current.requestPointerLock();
    }
  }, [walkthroughActive]);

  return (
    <div className="w-full h-full relative bg-[#080b10]" onClick={handleCanvasClick}>
      <Canvas
        ref={canvasRef}
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        camera={{
          position: [10, 8, 10],
          fov: 45,
          near: 0.1,
          far: 1000,
        }}
      >
        <SceneContent />
      </Canvas>

      {/* Walkthrough overlay */}
      {walkthroughActive && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#161b22]/80 backdrop-blur border border-[#21262d] rounded px-3 py-1 text-[10px] text-slate-400 pointer-events-none">
          WASD to move &middot; Mouse to look &middot; Click viewport to lock cursor &middot; ESC to unlock
        </div>
      )}
    </div>
  );
}
