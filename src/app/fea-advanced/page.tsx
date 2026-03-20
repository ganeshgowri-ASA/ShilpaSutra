"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

const ModeShapeViewport = dynamic(
  () =>
    import("@react-three/fiber").then((mod) => {
      const { Canvas } = mod;
      return function ModeShapeCanvas(props: {
        modeIndex: number;
        animating: boolean;
      }) {
        return (
          <Canvas
            camera={{ position: [4, 3, 4], fov: 50 }}
            style={{ background: "#0a0a0f" }}
          >
            <ModeShapeScene
              modeIndex={props.modeIndex}
              animating={props.animating}
            />
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

function ModeShapeScene({
  modeIndex,
  animating,
}: {
  modeIndex: number;
  animating: boolean;
}) {
  const { useFrame } = require("@react-three/fiber");
  const { OrbitControls, Grid } = require("@react-three/drei");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meshRef = useRef<any>(null);
  const timeRef = useRef(0);

  const modeDeformations = [
    { axis: "y", scale: 0.3, twist: 0 },
    { axis: "x", scale: 0.25, twist: 0.5 },
    { axis: "z", scale: 0.2, twist: 1.0 },
    { axis: "y", scale: 0.35, twist: 1.5 },
    { axis: "x", scale: 0.15, twist: 2.0 },
  ];

  useFrame((_state: unknown, delta: number) => {
    if (!meshRef.current || !animating) return;
    timeRef.current += delta * 3;
    const mode = modeDeformations[modeIndex] || modeDeformations[0];
    const amp = Math.sin(timeRef.current) * mode.scale;
    if (mode.axis === "y") {
      meshRef.current.scale.set(1, 1 + amp, 1);
      meshRef.current.rotation.z = amp * mode.twist;
    } else if (mode.axis === "x") {
      meshRef.current.scale.set(1 + amp, 1, 1);
      meshRef.current.rotation.y = amp * mode.twist;
    } else {
      meshRef.current.scale.set(1, 1, 1 + amp);
      meshRef.current.rotation.x = amp * mode.twist;
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-3, 2, -3]} intensity={0.3} color="#00D4FF" />
      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#1a1a2e"
        sectionSize={2}
        sectionColor="#252540"
        fadeDistance={15}
        position={[0, -1, 0]}
      />
      <mesh ref={meshRef} position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 1, 1.5]} />
        <meshStandardMaterial
          color="#00D4FF"
          wireframe
          transparent
          opacity={0.6}
        />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 1, 1.5]} />
        <meshStandardMaterial
          color="#00D4FF"
          transparent
          opacity={0.15}
        />
      </mesh>
      <OrbitControls enableDamping dampingFactor={0.05} />
    </>
  );
}

/* ── Types ── */
interface ModalMode {
  id: number;
  frequency: number;
  damping: number;
  participation: number;
  description: string;
}

interface ThermalNode {
  id: string;
  x: number;
  y: number;
  temperature: number;
}

interface FatiguePoint {
  stress: number;
  cycles: number;
}

interface ConvergencePoint {
  iteration: number;
  error: number;
}

type AnalysisTab = "modal" | "thermal" | "fatigue" | "convergence";

/* ── Sample Data ── */
const modalModes: ModalMode[] = [
  { id: 1, frequency: 42.7, damping: 0.021, participation: 0.82, description: "1st Bending (Y)" },
  { id: 2, frequency: 118.3, damping: 0.018, participation: 0.64, description: "1st Torsion (Z)" },
  { id: 3, frequency: 203.9, damping: 0.015, participation: 0.43, description: "2nd Bending (X)" },
  { id: 4, frequency: 287.1, damping: 0.012, participation: 0.31, description: "2nd Torsion (Y)" },
  { id: 5, frequency: 364.5, damping: 0.009, participation: 0.18, description: "3rd Bending (Z)" },
];

const thermalNodes: ThermalNode[] = Array.from({ length: 100 }, (_, i) => ({
  id: `n${i}`,
  x: (i % 10) * 10,
  y: Math.floor(i / 10) * 10,
  temperature: 25 + Math.random() * 175,
}));

const fatigueData: FatiguePoint[] = [
  { stress: 400, cycles: 1e3 },
  { stress: 350, cycles: 5e3 },
  { stress: 300, cycles: 2e4 },
  { stress: 260, cycles: 8e4 },
  { stress: 220, cycles: 3e5 },
  { stress: 190, cycles: 1e6 },
  { stress: 170, cycles: 5e6 },
  { stress: 155, cycles: 1e7 },
];

const convergenceData: ConvergencePoint[] = Array.from({ length: 25 }, (_, i) => ({
  iteration: i + 1,
  error: 1.0 * Math.exp(-0.15 * i) + Math.random() * 0.02,
}));

function tempToColor(t: number, min: number, max: number): string {
  const ratio = Math.max(0, Math.min(1, (t - min) / (max - min)));
  if (ratio < 0.25) {
    const r = 0, g = Math.round(ratio * 4 * 255), b = 255;
    return `rgb(${r},${g},${b})`;
  } else if (ratio < 0.5) {
    const r = 0, g = 255, b = Math.round((1 - (ratio - 0.25) * 4) * 255);
    return `rgb(${r},${g},${b})`;
  } else if (ratio < 0.75) {
    const r = Math.round((ratio - 0.5) * 4 * 255), g = 255, b = 0;
    return `rgb(${r},${g},${b})`;
  } else {
    const r = 255, g = Math.round((1 - (ratio - 0.75) * 4) * 255), b = 0;
    return `rgb(${r},${g},${b})`;
  }
}

export default function FEAAdvancedPage() {
  const [activeTab, setActiveTab] = useState<AnalysisTab>("modal");
  const [selectedMode, setSelectedMode] = useState(0);
  const [animating, setAnimating] = useState(true);
  const [fatigueLife, setFatigueLife] = useState<number | null>(null);
  const [appliedStress, setAppliedStress] = useState(250);

  const predictLife = useCallback(() => {
    const sorted = [...fatigueData].sort((a, b) => a.stress - b.stress);
    if (appliedStress >= sorted[sorted.length - 1].stress) {
      setFatigueLife(sorted[sorted.length - 1].cycles);
      return;
    }
    if (appliedStress <= sorted[0].stress) {
      setFatigueLife(sorted[0].cycles);
      return;
    }
    for (let i = 0; i < sorted.length - 1; i++) {
      if (appliedStress >= sorted[i].stress && appliedStress <= sorted[i + 1].stress) {
        const t = (appliedStress - sorted[i].stress) / (sorted[i + 1].stress - sorted[i].stress);
        const logC1 = Math.log10(sorted[i].cycles);
        const logC2 = Math.log10(sorted[i + 1].cycles);
        setFatigueLife(Math.round(Math.pow(10, logC1 + t * (logC2 - logC1))));
        return;
      }
    }
  }, [appliedStress]);

  const exportResults = useCallback(() => {
    const lines = [
      "FEA Advanced Analysis Results",
      "============================",
      "",
      "Modal Analysis:",
      "Mode | Frequency (Hz) | Damping | Participation | Description",
      ...modalModes.map(
        (m) => `${m.id}    | ${m.frequency.toFixed(1)}          | ${m.damping.toFixed(3)}  | ${m.participation.toFixed(2)}           | ${m.description}`
      ),
      "",
      "Convergence: " + convergenceData.length + " iterations",
      "Final error: " + convergenceData[convergenceData.length - 1].error.toFixed(4),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fea_results.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const tabs: { id: AnalysisTab; label: string; icon: string }[] = [
    { id: "modal", label: "Modal Analysis", icon: "M" },
    { id: "thermal", label: "Thermal", icon: "T" },
    { id: "fatigue", label: "Fatigue", icon: "F" },
    { id: "convergence", label: "Convergence", icon: "C" },
  ];

  const minTemp = Math.min(...thermalNodes.map((n) => n.temperature));
  const maxTemp = Math.max(...thermalNodes.map((n) => n.temperature));
  const maxErr = Math.max(...convergenceData.map((c) => c.error));
  const maxFatigueStress = Math.max(...fatigueData.map((f) => f.stress));
  const maxCyclesLog = Math.max(...fatigueData.map((f) => Math.log10(f.cycles)));

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="h-12 border-b border-[#1a1a2e] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[#00D4FF] font-bold text-sm">FEA</span>
          <span className="text-slate-400 text-xs">Advanced Finite Element Analysis</span>
        </div>
        <button
          onClick={exportResults}
          className="px-3 py-1.5 bg-[#00D4FF]/10 text-[#00D4FF] text-xs rounded hover:bg-[#00D4FF]/20 transition-colors border border-[#00D4FF]/20"
        >
          Export Results
        </button>
      </div>

      {/* Tabs */}
      <div className="h-10 border-b border-[#1a1a2e] flex items-center px-4 gap-1 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                : "text-slate-400 hover:text-white hover:bg-[#1a1a2e]"
            }`}
          >
            <span className="mr-1.5 font-bold">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {activeTab === "modal" && (
          <>
            {/* 3D Viewport */}
            <div className="flex-1 relative">
              <ModeShapeViewport modeIndex={selectedMode} animating={animating} />
              <div className="absolute bottom-4 left-4 flex gap-2">
                <button
                  onClick={() => setAnimating(!animating)}
                  className={`px-3 py-1.5 rounded text-xs ${
                    animating
                      ? "bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30"
                      : "bg-[#1a1a2e] text-slate-400 border border-[#252540]"
                  }`}
                >
                  {animating ? "Pause" : "Animate"}
                </button>
              </div>
              <div className="absolute top-4 left-4 bg-[#0a0a0f]/80 backdrop-blur px-3 py-2 rounded border border-[#1a1a2e]">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Mode Shape</div>
                <div className="text-[#00D4FF] text-sm font-bold">
                  Mode {selectedMode + 1}: {modalModes[selectedMode].description}
                </div>
                <div className="text-slate-400 text-xs">
                  {modalModes[selectedMode].frequency} Hz
                </div>
              </div>
            </div>

            {/* Frequencies Table */}
            <div className="w-[380px] border-l border-[#1a1a2e] bg-[#0d0d14] overflow-y-auto">
              <div className="p-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Natural Frequencies
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-[#1a1a2e]">
                      <th className="text-left py-2 font-medium">Mode</th>
                      <th className="text-right py-2 font-medium">Freq (Hz)</th>
                      <th className="text-right py-2 font-medium">Damping</th>
                      <th className="text-right py-2 font-medium">Part.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalModes.map((mode, idx) => (
                      <tr
                        key={mode.id}
                        onClick={() => setSelectedMode(idx)}
                        className={`cursor-pointer transition-colors border-b border-[#1a1a2e]/50 ${
                          selectedMode === idx
                            ? "bg-[#00D4FF]/10 text-[#00D4FF]"
                            : "text-slate-300 hover:bg-[#1a1a2e]"
                        }`}
                      >
                        <td className="py-2 font-medium">{mode.id}</td>
                        <td className="py-2 text-right">{mode.frequency.toFixed(1)}</td>
                        <td className="py-2 text-right">{mode.damping.toFixed(3)}</td>
                        <td className="py-2 text-right">{(mode.participation * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 p-3 bg-[#0a0a0f] rounded border border-[#1a1a2e]">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Mode Details</div>
                  <div className="text-xs text-slate-300">{modalModes[selectedMode].description}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500">Frequency:</span>
                      <span className="text-[#00D4FF] ml-1">{modalModes[selectedMode].frequency} Hz</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Period:</span>
                      <span className="text-white ml-1">{(1000 / modalModes[selectedMode].frequency).toFixed(2)} ms</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Damping:</span>
                      <span className="text-white ml-1">{(modalModes[selectedMode].damping * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Participation:</span>
                      <span className="text-white ml-1">{(modalModes[selectedMode].participation * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "thermal" && (
          <div className="flex-1 overflow-auto p-6">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
              Temperature Distribution
            </h3>
            <div className="relative bg-[#0d0d14] rounded border border-[#1a1a2e] p-4">
              {/* Color map grid */}
              <div className="grid gap-0" style={{ gridTemplateColumns: "repeat(10, 1fr)" }}>
                {thermalNodes.map((node) => (
                  <div
                    key={node.id}
                    className="aspect-square relative group cursor-crosshair"
                    style={{ backgroundColor: tempToColor(node.temperature, minTemp, maxTemp) }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[8px] font-bold text-white drop-shadow-lg">
                        {node.temperature.toFixed(0)}°
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Color bar legend */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[10px] text-slate-500">{minTemp.toFixed(0)}°C</span>
                <div
                  className="flex-1 h-4 rounded"
                  style={{
                    background: "linear-gradient(to right, rgb(0,0,255), rgb(0,255,255), rgb(0,255,0), rgb(255,255,0), rgb(255,0,0))",
                  }}
                />
                <span className="text-[10px] text-slate-500">{maxTemp.toFixed(0)}°C</span>
              </div>
            </div>
            {/* Stats */}
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                { label: "Min Temp", value: `${minTemp.toFixed(1)}°C`, color: "text-blue-400" },
                { label: "Max Temp", value: `${maxTemp.toFixed(1)}°C`, color: "text-red-400" },
                { label: "Avg Temp", value: `${((minTemp + maxTemp) / 2).toFixed(1)}°C`, color: "text-yellow-400" },
                { label: "Gradient", value: `${(maxTemp - minTemp).toFixed(1)}°C`, color: "text-[#00D4FF]" },
              ].map((s) => (
                <div key={s.label} className="bg-[#0d0d14] rounded border border-[#1a1a2e] p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</div>
                  <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "fatigue" && (
          <div className="flex-1 overflow-auto p-6">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
              S-N Curve (Fatigue Life)
            </h3>
            {/* S-N Chart */}
            <div className="bg-[#0d0d14] rounded border border-[#1a1a2e] p-4">
              <svg viewBox="0 0 600 300" className="w-full max-w-[800px]">
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((r) => (
                  <line
                    key={`h${r}`}
                    x1={60}
                    y1={20 + r * 240}
                    x2={580}
                    y2={20 + r * 240}
                    stroke="#1a1a2e"
                    strokeWidth={1}
                  />
                ))}
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map((r) => (
                  <line
                    key={`v${r}`}
                    x1={60 + r * 520}
                    y1={20}
                    x2={60 + r * 520}
                    y2={260}
                    stroke="#1a1a2e"
                    strokeWidth={1}
                  />
                ))}
                {/* Axes labels */}
                <text x={30} y={150} fill="#666" fontSize="10" textAnchor="middle" transform="rotate(-90,30,150)">
                  Stress (MPa)
                </text>
                <text x={320} y={290} fill="#666" fontSize="10" textAnchor="middle">
                  Cycles (log scale)
                </text>
                {/* Y axis ticks */}
                {[0, 100, 200, 300, 400].map((v) => (
                  <text
                    key={`yt${v}`}
                    x={55}
                    y={260 - (v / maxFatigueStress) * 240 + 4}
                    fill="#555"
                    fontSize="9"
                    textAnchor="end"
                  >
                    {v}
                  </text>
                ))}
                {/* X axis ticks */}
                {[3, 4, 5, 6, 7].map((v) => (
                  <text
                    key={`xt${v}`}
                    x={60 + ((v - 3) / (maxCyclesLog - 3)) * 520}
                    y={275}
                    fill="#555"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    10^{v}
                  </text>
                ))}
                {/* S-N curve */}
                <polyline
                  points={fatigueData
                    .map((p) => {
                      const x = 60 + ((Math.log10(p.cycles) - 3) / (maxCyclesLog - 3)) * 520;
                      const y = 260 - (p.stress / maxFatigueStress) * 240;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="#00D4FF"
                  strokeWidth={2}
                />
                {/* Data points */}
                {fatigueData.map((p, i) => {
                  const x = 60 + ((Math.log10(p.cycles) - 3) / (maxCyclesLog - 3)) * 520;
                  const y = 260 - (p.stress / maxFatigueStress) * 240;
                  return (
                    <circle key={i} cx={x} cy={y} r={4} fill="#00D4FF" stroke="#0a0a0f" strokeWidth={2} />
                  );
                })}
              </svg>
            </div>
            {/* Life Prediction */}
            <div className="mt-4 bg-[#0d0d14] rounded border border-[#1a1a2e] p-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Fatigue Life Prediction
              </h4>
              <div className="flex items-end gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                    Applied Stress (MPa)
                  </label>
                  <input
                    type="number"
                    value={appliedStress}
                    onChange={(e) => setAppliedStress(Number(e.target.value))}
                    className="w-32 bg-[#0a0a0f] border border-[#252540] rounded px-3 py-1.5 text-sm text-white focus:border-[#00D4FF] outline-none"
                  />
                </div>
                <button
                  onClick={predictLife}
                  className="px-4 py-1.5 bg-[#00D4FF]/15 text-[#00D4FF] text-sm rounded hover:bg-[#00D4FF]/25 transition-colors border border-[#00D4FF]/30"
                >
                  Predict Life
                </button>
                {fatigueLife !== null && (
                  <div className="text-sm">
                    <span className="text-slate-400">Predicted Life: </span>
                    <span className="text-[#00D4FF] font-bold">{fatigueLife.toLocaleString()} cycles</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "convergence" && (
          <div className="flex-1 overflow-auto p-6">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
              Solution Convergence
            </h3>
            <div className="bg-[#0d0d14] rounded border border-[#1a1a2e] p-4">
              <svg viewBox="0 0 600 300" className="w-full max-w-[800px]">
                {/* Grid */}
                {[0, 0.25, 0.5, 0.75, 1].map((r) => (
                  <line
                    key={`h${r}`}
                    x1={60}
                    y1={20 + r * 240}
                    x2={580}
                    y2={20 + r * 240}
                    stroke="#1a1a2e"
                    strokeWidth={1}
                  />
                ))}
                {/* Axes */}
                <text x={30} y={150} fill="#666" fontSize="10" textAnchor="middle" transform="rotate(-90,30,150)">
                  Residual Error
                </text>
                <text x={320} y={290} fill="#666" fontSize="10" textAnchor="middle">
                  Iteration
                </text>
                {/* Convergence line */}
                <polyline
                  points={convergenceData
                    .map((p) => {
                      const x = 60 + ((p.iteration - 1) / (convergenceData.length - 1)) * 520;
                      const y = 260 - (p.error / maxErr) * 240;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="#00D4FF"
                  strokeWidth={2}
                />
                {/* Threshold line */}
                <line
                  x1={60}
                  y1={260 - (0.05 / maxErr) * 240}
                  x2={580}
                  y2={260 - (0.05 / maxErr) * 240}
                  stroke="#ff4444"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
                <text
                  x={585}
                  y={260 - (0.05 / maxErr) * 240 + 4}
                  fill="#ff4444"
                  fontSize="9"
                >
                  Tol
                </text>
                {/* Points */}
                {convergenceData.map((p) => {
                  const x = 60 + ((p.iteration - 1) / (convergenceData.length - 1)) * 520;
                  const y = 260 - (p.error / maxErr) * 240;
                  return (
                    <circle key={p.iteration} cx={x} cy={y} r={3} fill="#00D4FF" stroke="#0a0a0f" strokeWidth={1.5} />
                  );
                })}
              </svg>
            </div>
            {/* Stats */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "Iterations", value: convergenceData.length.toString() },
                { label: "Final Error", value: convergenceData[convergenceData.length - 1].error.toFixed(4) },
                { label: "Status", value: convergenceData[convergenceData.length - 1].error < 0.05 ? "Converged" : "Running" },
              ].map((s) => (
                <div key={s.label} className="bg-[#0d0d14] rounded border border-[#1a1a2e] p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</div>
                  <div className={`text-lg font-bold ${s.value === "Converged" ? "text-green-400" : "text-[#00D4FF]"}`}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
