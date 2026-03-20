"use client";
import { useMemo } from "react";
import { Html, Line } from "@react-three/drei";
import { useConstraintStore, type ConstraintType } from "@/stores/constraint-store";
import { useCadStore } from "@/stores/cad-store";

const constraintSymbols: Record<ConstraintType, string> = {
  coincident: "\u25CF",
  parallel: "\u2225",
  perpendicular: "\u22A5",
  tangent: "\u2312",
  equal: "=",
  fix: "\u2693",
  horizontal: "\u2500",
  vertical: "\u2502",
  concentric: "\u25CE",
  symmetric: "\u2194",
};

const constraintColors: Record<ConstraintType, string> = {
  coincident: "#ff6b35",
  parallel: "#4ecdc4",
  perpendicular: "#45b7d1",
  tangent: "#f7dc6f",
  equal: "#bb8fce",
  fix: "#e74c3c",
  horizontal: "#2ecc71",
  vertical: "#3498db",
  concentric: "#e67e22",
  symmetric: "#9b59b6",
};

export default function ConstraintIndicators() {
  const constraints = useConstraintStore((s) => s.constraints);
  const showConstraints = useConstraintStore((s) => s.showConstraints);
  const constraintStatus = useConstraintStore((s) => s.constraintStatus);
  const objects = useCadStore((s) => s.objects);

  const indicators = useMemo(() => {
    if (!showConstraints) return [];

    return constraints.map((constraint) => {
      const positions = constraint.entityIds
        .map((id) => {
          const obj = objects.find((o) => o.id === id);
          return obj ? obj.position : null;
        })
        .filter(Boolean) as [number, number, number][];

      if (positions.length === 0) return null;

      // Calculate indicator position (midpoint or first entity)
      const indicatorPos: [number, number, number] = positions.length >= 2
        ? [
            (positions[0][0] + positions[1][0]) / 2,
            Math.max(positions[0][1], positions[1][1]) + 0.5,
            (positions[0][2] + positions[1][2]) / 2,
          ]
        : [
            positions[0][0],
            positions[0][1] + 0.8,
            positions[0][2],
          ];

      return {
        id: constraint.id,
        type: constraint.type,
        position: indicatorPos,
        positions,
        satisfied: constraint.satisfied,
        color: constraintColors[constraint.type],
        symbol: constraintSymbols[constraint.type],
      };
    }).filter(Boolean);
  }, [constraints, showConstraints, objects]);

  if (!showConstraints || indicators.length === 0) return null;

  const statusColor = constraintStatus === "fully" ? "#2ecc71" : constraintStatus === "over" ? "#e74c3c" : "#3498db";

  return (
    <group>
      {indicators.map((ind) => {
        if (!ind) return null;
        return (
          <group key={ind.id}>
            {/* Constraint symbol overlay */}
            <Html
              position={ind.position}
              center
              style={{ pointerEvents: "none" }}
            >
              <div
                className="flex items-center gap-1 rounded-full px-1.5 py-0.5 border backdrop-blur-sm"
                style={{
                  backgroundColor: `${ind.color}20`,
                  borderColor: `${ind.color}60`,
                }}
              >
                <span
                  className="text-[10px] font-bold"
                  style={{ color: ind.color }}
                >
                  {ind.symbol}
                </span>
              </div>
            </Html>

            {/* Connection lines between constrained entities */}
            {ind.positions.length >= 2 && (
              <Line
                points={[ind.positions[0], ind.positions[1]]}
                color={statusColor}
                lineWidth={1}
                dashed
                dashSize={0.1}
                gapSize={0.05}
              />
            )}

            {/* Small sphere at constraint position */}
            <mesh position={ind.position}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshBasicMaterial color={ind.color} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
