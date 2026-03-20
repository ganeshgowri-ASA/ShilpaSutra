"use client";
import { Html, Line } from "@react-three/drei";
import { useCadStore } from "@/stores/cad-store";

export default function MeasurementTool() {
  const measurements = useCadStore((s) => s.measurements);
  const measurePoints = useCadStore((s) => s.measurePoints);
  const measureResult = useCadStore((s) => s.measureResult);
  const unit = useCadStore((s) => s.unit);

  return (
    <group>
      {/* Active measurement in progress */}
      {measurePoints.length >= 1 && (
        <mesh position={measurePoints[0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#FFD700" />
        </mesh>
      )}

      {measurePoints.length === 2 && measureResult && (
        <>
          <Line
            points={[measurePoints[0], measurePoints[1]]}
            color="#FFD700"
            lineWidth={2}
            dashed
            dashSize={0.15}
            gapSize={0.1}
          />
          <mesh position={measurePoints[1]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#FFD700" />
          </mesh>
          <Html
            position={[
              (measurePoints[0][0] + measurePoints[1][0]) / 2,
              (measurePoints[0][1] + measurePoints[1][1]) / 2 + 0.3,
              (measurePoints[0][2] + measurePoints[1][2]) / 2,
            ]}
            center
            style={{ pointerEvents: "none" }}
          >
            <div className="bg-[#0d1117]/95 border border-yellow-500/50 rounded px-2 py-1 whitespace-nowrap">
              <span className="text-[11px] text-yellow-300 font-mono font-bold">
                {measureResult.distance.toFixed(3)} {unit}
              </span>
            </div>
          </Html>
        </>
      )}

      {/* Persisted measurements */}
      {measurements.map((m) => (
        <group key={m.id}>
          {m.points.length >= 2 && (
            <>
              <Line
                points={[m.points[0], m.points[1]]}
                color="#FF6B6B"
                lineWidth={1.5}
                dashed
                dashSize={0.1}
                gapSize={0.08}
              />
              {m.points.map((pt, i) => (
                <mesh key={i} position={pt}>
                  <sphereGeometry args={[0.05, 8, 8]} />
                  <meshBasicMaterial color="#FF6B6B" />
                </mesh>
              ))}
              <Html
                position={[
                  (m.points[0][0] + m.points[1][0]) / 2,
                  (m.points[0][1] + m.points[1][1]) / 2 + 0.2,
                  (m.points[0][2] + m.points[1][2]) / 2,
                ]}
                center
                style={{ pointerEvents: "none" }}
              >
                <div className="bg-[#0d1117]/90 border border-red-400/40 rounded px-1.5 py-0.5 whitespace-nowrap">
                  <span className="text-[9px] text-red-300 font-mono">
                    {m.value.toFixed(3)} {m.unit}
                  </span>
                </div>
              </Html>
            </>
          )}
        </group>
      ))}
    </group>
  );
}
