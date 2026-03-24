"use client";
import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { useAssemblyStore } from "@/stores/assembly-store";
import type { MateType } from "@/lib/mate-solver";

// ─── Visual symbols for each mate type ───────────────────────────────────────

const mateSymbols: Record<MateType, string> = {
  coincident: "\u25CF",    // ●
  concentric: "\u25CE",    // ◎
  distance: "\u2194",      // ↔
  parallel: "\u2225",      // ∥
  perpendicular: "\u22A5", // ⊥
  angle: "\u2220",         // ∠
  lock: "\u26BF",          // ⚿
  gear: "\u2699",          // ⚙
};

const mateColors: Record<MateType, string> = {
  coincident: "#ff6b35",
  concentric: "#e67e22",
  distance: "#00D4FF",
  parallel: "#4ecdc4",
  perpendicular: "#45b7d1",
  angle: "#ff8800",
  lock: "#e74c3c",
  gear: "#9b59b6",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function MateIndicators() {
  const mates = useAssemblyStore((s) => s.mates);
  const showMateIndicators = useAssemblyStore((s) => s.showMateIndicators);
  const selectedMateId = useAssemblyStore((s) => s.selectedMateId);
  const selectMate = useAssemblyStore((s) => s.selectMate);

  const indicators = useMemo(() => {
    if (!showMateIndicators) return [];

    return mates
      .filter((m) => !m.suppressed)
      .map((mate) => {
        // Position indicator at midpoint of the two face positions
        const midX = (mate.face1.position[0] + mate.face2.position[0]) / 2;
        const midY = (mate.face1.position[1] + mate.face2.position[1]) / 2;
        const midZ = (mate.face1.position[2] + mate.face2.position[2]) / 2;

        const isSelected = selectedMateId === mate.id;
        const color = mateColors[mate.type];
        const symbol = mateSymbols[mate.type];

        return {
          id: mate.id,
          position: [midX, midY, midZ] as [number, number, number],
          color,
          symbol,
          type: mate.type,
          satisfied: mate.satisfied,
          isSelected,
          // Individual face positions for connector lines
          face1Pos: mate.face1.position,
          face2Pos: mate.face2.position,
        };
      });
  }, [mates, showMateIndicators, selectedMateId]);

  if (indicators.length === 0) return null;

  return (
    <group name="mate-indicators">
      {indicators.map((ind) => (
        <group key={ind.id}>
          {/* Connector line from face1 to face2 */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([
                  ...ind.face1Pos,
                  ...ind.face2Pos,
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={ind.satisfied ? "#2ecc71" : ind.color}
              transparent
              opacity={ind.isSelected ? 0.8 : 0.3}
              linewidth={1}
            />
          </line>

          {/* Mate icon at midpoint */}
          <Html
            position={ind.position}
            center
            distanceFactor={8}
            style={{ pointerEvents: "auto" }}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                selectMate(ind.isSelected ? null : ind.id);
              }}
              className={`cursor-pointer select-none transition-all duration-150 ${
                ind.isSelected ? "scale-125" : "hover:scale-110"
              }`}
              title={`${ind.type}${ind.satisfied ? " (satisfied)" : " (unsatisfied)"}`}
            >
              <div
                className={`flex items-center justify-center rounded-full border-2 backdrop-blur-sm ${
                  ind.isSelected
                    ? "w-7 h-7 shadow-lg"
                    : "w-5 h-5"
                }`}
                style={{
                  backgroundColor: `${ind.color}22`,
                  borderColor: ind.satisfied ? "#2ecc71" : ind.color,
                  boxShadow: ind.isSelected ? `0 0 12px ${ind.color}40` : undefined,
                }}
              >
                <span
                  className="font-bold"
                  style={{
                    color: ind.satisfied ? "#2ecc71" : ind.color,
                    fontSize: ind.isSelected ? "14px" : "10px",
                  }}
                >
                  {ind.symbol}
                </span>
              </div>
              {/* Type label on hover/select */}
              {ind.isSelected && (
                <div
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-bold rounded px-1.5 py-0.5"
                  style={{
                    backgroundColor: `${ind.color}33`,
                    color: ind.color,
                    border: `1px solid ${ind.color}44`,
                  }}
                >
                  {ind.type}
                </div>
              )}
            </div>
          </Html>

          {/* Small sphere markers at each face */}
          <mesh position={ind.face1Pos}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial
              color={ind.satisfied ? "#2ecc71" : ind.color}
              transparent
              opacity={0.6}
            />
          </mesh>
          <mesh position={ind.face2Pos}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial
              color={ind.satisfied ? "#2ecc71" : ind.color}
              transparent
              opacity={0.6}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
