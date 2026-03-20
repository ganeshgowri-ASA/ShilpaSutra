"use client";
import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { useCadStore, type CadObject } from "@/stores/cad-store";

function DimensionLabel({
  position,
  value,
  unit,
}: {
  position: [number, number, number];
  value: string;
  unit: string;
}) {
  return (
    <Html position={position} center style={{ pointerEvents: "none" }}>
      <div className="bg-[#0d1117]/90 border border-[#00D4FF]/40 rounded px-1.5 py-0.5 whitespace-nowrap">
        <span className="text-[10px] text-white font-mono">
          {value} <span className="text-[#00D4FF]">{unit}</span>
        </span>
      </div>
    </Html>
  );
}

function DimensionLine({
  start,
  end,
}: {
  start: [number, number, number];
  end: [number, number, number];
}) {
  const points = useMemo(
    () => [start, end].map(([x, y, z]) => [x, y, z] as [number, number, number]),
    [start, end]
  );

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2}
          array={new Float32Array([...points[0], ...points[1]])}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#00D4FF" opacity={0.6} transparent />
    </line>
  );
}

function BoxDimensions({ obj }: { obj: CadObject }) {
  const { width, height, depth } = obj.dimensions;
  const [px, py, pz] = obj.position;
  const hw = width / 2, hh = height / 2, hd = depth / 2;

  return (
    <group>
      {/* Width - bottom */}
      <DimensionLine
        start={[px - hw, py - hh - 0.3, pz + hd]}
        end={[px + hw, py - hh - 0.3, pz + hd]}
      />
      <DimensionLabel
        position={[px, py - hh - 0.5, pz + hd]}
        value={width.toFixed(2)}
        unit="mm"
      />

      {/* Height - side */}
      <DimensionLine
        start={[px + hw + 0.3, py - hh, pz + hd]}
        end={[px + hw + 0.3, py + hh, pz + hd]}
      />
      <DimensionLabel
        position={[px + hw + 0.6, py, pz + hd]}
        value={height.toFixed(2)}
        unit="mm"
      />

      {/* Depth - front */}
      <DimensionLine
        start={[px - hw - 0.3, py - hh, pz - hd]}
        end={[px - hw - 0.3, py - hh, pz + hd]}
      />
      <DimensionLabel
        position={[px - hw - 0.6, py - hh, pz]}
        value={depth.toFixed(2)}
        unit="mm"
      />
    </group>
  );
}

function CylinderDimensions({ obj }: { obj: CadObject }) {
  const radius = obj.dimensions.width;
  const height = obj.dimensions.height;
  const [px, py, pz] = obj.position;
  const hh = height / 2;

  return (
    <group>
      {/* Radius - top */}
      <DimensionLine
        start={[px, py + hh + 0.2, pz]}
        end={[px + radius, py + hh + 0.2, pz]}
      />
      <DimensionLabel
        position={[px + radius / 2, py + hh + 0.5, pz]}
        value={`R${radius.toFixed(2)}`}
        unit="mm"
      />

      {/* Height - side */}
      <DimensionLine
        start={[px + radius + 0.3, py - hh, pz]}
        end={[px + radius + 0.3, py + hh, pz]}
      />
      <DimensionLabel
        position={[px + radius + 0.6, py, pz]}
        value={height.toFixed(2)}
        unit="mm"
      />
    </group>
  );
}

function SphereDimensions({ obj }: { obj: CadObject }) {
  const radius = obj.dimensions.width;
  const diameter = radius * 2;
  const [px, py, pz] = obj.position;

  return (
    <group>
      {/* Diameter line through center */}
      <DimensionLine
        start={[px - radius, py, pz]}
        end={[px + radius, py, pz]}
      />
      <DimensionLabel
        position={[px, py + radius + 0.5, pz]}
        value={`D${diameter.toFixed(2)}`}
        unit="mm"
      />
    </group>
  );
}

export default function DimensionOverlay() {
  const selectedId = useCadStore((s) => s.selectedId);
  const objects = useCadStore((s) => s.objects);
  const showDimensions = useCadStore((s) => s.showDimensions);

  const selected = objects.find((o) => o.id === selectedId);

  if (!showDimensions || !selected) return null;

  const sketchTypes = ["line", "arc", "circle", "rectangle"];
  if (sketchTypes.includes(selected.type)) return null;
  if (selected.visible === false) return null;

  switch (selected.type) {
    case "box":
      return <BoxDimensions obj={selected} />;
    case "cylinder":
      return <CylinderDimensions obj={selected} />;
    case "sphere":
      return <SphereDimensions obj={selected} />;
    case "cone":
      return <CylinderDimensions obj={selected} />;
    default:
      return null;
  }
}
