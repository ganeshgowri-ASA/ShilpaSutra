"use client";
import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";

const AssemblyAdvancedViewport = dynamic(
  () =>
    import("@react-three/fiber").then((mod) => {
      const { Canvas } = mod;
      return function AssemblyCanvas(props: {
        parts: AssemblyPart[];
        exploded: boolean;
        explodeProgress: number;
        selectedPart: string | null;
      }) {
        return (
          <Canvas camera={{ position: [6, 4, 6], fov: 50 }} style={{ background: "#0a0a0f" }}>
            <AssemblyScene {...props} />
          </Canvas>
        );
      };
    }),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0f] text-slate-500">
        Loading 3D viewport...
      </div>
    ),
  }
);

/* ── Types ── */
interface AssemblyPart {
  id: string;
  name: string;
  shape: "box" | "cylinder" | "sphere";
  position: [number, number, number];
  explodeOffset: [number, number, number];
  dimensions: [number, number, number];
  color: string;
  material: string;
  mass: number;
  visible: boolean;
}

type ConstraintType = "mate" | "align" | "insert" | "angle" | "distance";

interface Constraint {
  id: string;
  type: ConstraintType;
  partA: string;
  partB: string;
  value?: number;
  satisfied: boolean;
}

interface BOMRow {
  partName: string;
  quantity: number;
  material: string;
  mass: number;
}

type SideTab = "tree" | "constraints" | "bom";

/* ── Data ── */
const defaultParts: AssemblyPart[] = [
  { id: "base", name: "Base Plate", shape: "box", position: [0, 0.15, 0], explodeOffset: [0, -2, 0], dimensions: [3, 0.3, 2.5], color: "#5577aa", material: "Aluminum 6061", mass: 2.1, visible: true },
  { id: "bracket_l", name: "Left Bracket", shape: "box", position: [-0.9, 1, 0], explodeOffset: [-2, 0, 0], dimensions: [0.25, 1.5, 1.2], color: "#7799bb", material: "Steel 304", mass: 1.2, visible: true },
  { id: "bracket_r", name: "Right Bracket", shape: "box", position: [0.9, 1, 0], explodeOffset: [2, 0, 0], dimensions: [0.25, 1.5, 1.2], color: "#7799bb", material: "Steel 304", mass: 1.2, visible: true },
  { id: "shaft", name: "Shaft", shape: "cylinder", position: [0, 1.5, 0], explodeOffset: [0, 2, 0], dimensions: [0.15, 2.5, 0.15], color: "#99aabb", material: "Steel 304", mass: 0.6, visible: true },
  { id: "motor", name: "Motor Housing", shape: "box", position: [0, 2.2, 0], explodeOffset: [0, 3.5, 0], dimensions: [1, 0.7, 0.8], color: "#445566", material: "Aluminum 6061", mass: 1.5, visible: true },
];

const defaultConstraints: Constraint[] = [
  { id: "c1", type: "mate", partA: "base", partB: "bracket_l", satisfied: true },
  { id: "c2", type: "mate", partA: "base", partB: "bracket_r", satisfied: true },
  { id: "c3", type: "align", partA: "bracket_l", partB: "shaft", satisfied: true },
  { id: "c4", type: "insert", partA: "shaft", partB: "motor", satisfied: true },
  { id: "c5", type: "distance", partA: "bracket_l", partB: "bracket_r", value: 1.55, satisfied: true },
  { id: "c6", type: "angle", partA: "base", partB: "motor", value: 0, satisfied: true },
];

const constraintTypes: { type: ConstraintType; label: string; icon: string; desc: string }[] = [
  { type: "mate", label: "Mate", icon: "M", desc: "Face-to-face contact" },
  { type: "align", label: "Align", icon: "A", desc: "Axis alignment" },
  { type: "insert", label: "Insert", icon: "I", desc: "Concentric + mate" },
  { type: "angle", label: "Angle", icon: "An", desc: "Angular constraint" },
  { type: "distance", label: "Distance", icon: "D", desc: "Offset distance" },
];

function AssemblyScene({
  parts,
  exploded,
  explodeProgress,
  selectedPart,
}: {
  parts: AssemblyPart[];
  exploded: boolean;
  explodeProgress: number;
  selectedPart: string | null;
}) {
  const { OrbitControls, Grid } = require("@react-three/drei");
  const THREE = require("three");

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.7} />
      <pointLight position={[-3, 2, -3]} intensity={0.3} color="#00D4FF" />
      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#1a1a2e"
        sectionSize={2}
        sectionColor="#252540"
        fadeDistance={15}
        position={[0, -0.5, 0]}
      />
      {parts
        .filter((p) => p.visible)
        .map((part) => {
          const t = exploded ? explodeProgress : 0;
          const pos: [number, number, number] = [
            part.position[0] + part.explodeOffset[0] * t,
            part.position[1] + part.explodeOffset[1] * t,
            part.position[2] + part.explodeOffset[2] * t,
          ];
          const isSelected = selectedPart === part.id;
          return (
            <mesh key={part.id} position={pos}>
              {part.shape === "box" && (
                <boxGeometry args={part.dimensions} />
              )}
              {part.shape === "cylinder" && (
                <cylinderGeometry args={[part.dimensions[0], part.dimensions[0], part.dimensions[1], 32]} />
              )}
              {part.shape === "sphere" && (
                <sphereGeometry args={[part.dimensions[0], 32, 32]} />
              )}
              <meshStandardMaterial
                color={isSelected ? "#00D4FF" : part.color}
                metalness={0.4}
                roughness={0.4}
                transparent={isSelected}
                opacity={isSelected ? 0.8 : 1}
              />
            </mesh>
          );
        })}
      {/* Explode lines */}
      {exploded &&
        explodeProgress > 0 &&
        parts
          .filter((p) => p.visible)
          .map((part) => {
            const t = explodeProgress;
            return (
              <line key={`line-${part.id}`}>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[
                      new Float32Array([
                        ...part.position,
                        part.position[0] + part.explodeOffset[0] * t,
                        part.position[1] + part.explodeOffset[1] * t,
                        part.position[2] + part.explodeOffset[2] * t,
                      ]),
                      3,
                    ]}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#00D4FF" transparent opacity={0.3} />
              </line>
            );
          })}
      <OrbitControls enableDamping dampingFactor={0.05} />
    </>
  );
}

function computeDOF(constraints: Constraint[]): number {
  const totalParts = 5;
  const rigidDOF = totalParts * 6;
  const constraintDOF = constraints.filter((c) => c.satisfied).length * 3;
  return Math.max(0, rigidDOF - constraintDOF - 6);
}

export default function AssemblyAdvancedPage() {
  const [parts, setParts] = useState<AssemblyPart[]>(defaultParts);
  const [constraints, setConstraints] = useState<Constraint[]>(defaultConstraints);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [exploded, setExploded] = useState(false);
  const [explodeProgress, setExplodeProgress] = useState(0);
  const [sideTab, setSideTab] = useState<SideTab>("tree");
  const animRef = useRef<number | null>(null);

  const toggleExplode = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const target = exploded ? 0 : 1;
    const start = explodeProgress;
    const startTime = Date.now();
    const duration = 600;

    function animate() {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const val = start + (target - start) * eased;
      setExplodeProgress(val);
      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setExploded(!exploded);
      }
    }
    animate();
  }, [exploded, explodeProgress]);

  const togglePartVisibility = useCallback((id: string) => {
    setParts((prev) => prev.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p)));
  }, []);

  const dof = computeDOF(constraints);

  const bomData: BOMRow[] = parts.map((p) => ({
    partName: p.name,
    quantity: 1,
    material: p.material,
    mass: p.mass,
  }));
  const totalMass = bomData.reduce((s, b) => s + b.mass * b.quantity, 0);

  const sideTabs: { id: SideTab; label: string }[] = [
    { id: "tree", label: "Components" },
    { id: "constraints", label: "Constraints" },
    { id: "bom", label: "BOM" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="h-12 border-b border-[#1a1a2e] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[#00D4FF] font-bold text-sm">ASM</span>
          <span className="text-slate-400 text-xs">Advanced Assembly Workspace</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">DOF:</span>
            <span className={`font-bold ${dof === 0 ? "text-green-400" : "text-yellow-400"}`}>
              {dof}
            </span>
          </div>
          <button
            onClick={toggleExplode}
            className={`px-3 py-1.5 text-xs rounded transition-colors border ${
              exploded
                ? "bg-[#00D4FF]/15 text-[#00D4FF] border-[#00D4FF]/30"
                : "text-slate-400 border-[#252540] hover:border-[#00D4FF]/30"
            }`}
          >
            {exploded ? "Collapse" : "Explode"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Viewport */}
        <div className="flex-1">
          <AssemblyAdvancedViewport
            parts={parts}
            exploded={exploded}
            explodeProgress={explodeProgress}
            selectedPart={selectedPart}
          />
        </div>

        {/* Side Panel */}
        <div className="w-[340px] border-l border-[#1a1a2e] bg-[#0d0d14] flex flex-col shrink-0">
          <div className="flex border-b border-[#1a1a2e]">
            {sideTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setSideTab(t.id)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  sideTab === t.id
                    ? "text-[#00D4FF] border-b-2 border-[#00D4FF] bg-[#00D4FF]/5"
                    : "text-slate-500 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {sideTab === "tree" && (
              <div className="space-y-1.5">
                {parts.map((part) => (
                  <div
                    key={part.id}
                    onClick={() => setSelectedPart(selectedPart === part.id ? null : part.id)}
                    className={`flex items-center gap-2 p-2.5 rounded cursor-pointer transition-colors ${
                      selectedPart === part.id
                        ? "bg-[#00D4FF]/10 border border-[#00D4FF]/30"
                        : "hover:bg-[#1a1a2e] border border-transparent"
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePartVisibility(part.id);
                      }}
                      className={`w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center ${
                        part.visible ? "bg-[#00D4FF]/20 text-[#00D4FF]" : "bg-[#1a1a2e] text-slate-600"
                      }`}
                    >
                      {part.visible ? "V" : "H"}
                    </button>
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: part.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white truncate">{part.name}</div>
                      <div className="text-[10px] text-slate-500">{part.material} · {part.mass} kg</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sideTab === "constraints" && (
              <div>
                {/* Constraint type selector */}
                <div className="grid grid-cols-5 gap-1 mb-4">
                  {constraintTypes.map((ct) => (
                    <div
                      key={ct.type}
                      className="flex flex-col items-center p-2 rounded bg-[#0a0a0f] border border-[#1a1a2e] hover:border-[#00D4FF]/30 cursor-pointer transition-colors"
                      title={ct.desc}
                    >
                      <span className="text-[10px] font-bold text-[#00D4FF]">{ct.icon}</span>
                      <span className="text-[8px] text-slate-500 mt-0.5">{ct.label}</span>
                    </div>
                  ))}
                </div>
                {/* Active constraints */}
                <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">
                  Active Constraints
                </h4>
                <div className="space-y-1.5">
                  {constraints.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 p-2 rounded bg-[#0a0a0f] border border-[#1a1a2e]">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          c.satisfied ? "bg-green-400" : "bg-red-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-white">
                          <span className="text-[#00D4FF] font-medium capitalize">{c.type}</span>
                          <span className="text-slate-500 mx-1">|</span>
                          {c.partA} — {c.partB}
                        </div>
                        {c.value !== undefined && (
                          <div className="text-[10px] text-slate-500">
                            Value: {c.value}{c.type === "angle" ? "°" : " mm"}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sideTab === "bom" && (
              <div>
                <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-3">
                  Bill of Materials
                </h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-[#1a1a2e]">
                      <th className="text-left py-2 font-medium">#</th>
                      <th className="text-left py-2 font-medium">Part</th>
                      <th className="text-right py-2 font-medium">Qty</th>
                      <th className="text-right py-2 font-medium">Mass</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bomData.map((row, i) => (
                      <tr key={i} className="border-b border-[#1a1a2e]/50 text-slate-300">
                        <td className="py-2 text-slate-500">{i + 1}</td>
                        <td className="py-2">
                          <div className="font-medium">{row.partName}</div>
                          <div className="text-[10px] text-slate-500">{row.material}</div>
                        </td>
                        <td className="py-2 text-right">{row.quantity}</td>
                        <td className="py-2 text-right">{row.mass.toFixed(1)} kg</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[#252540] text-white font-bold">
                      <td colSpan={2} className="py-2">Total</td>
                      <td className="py-2 text-right">{bomData.reduce((s, b) => s + b.quantity, 0)}</td>
                      <td className="py-2 text-right">{totalMass.toFixed(1)} kg</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
