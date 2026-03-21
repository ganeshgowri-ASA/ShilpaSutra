"use client";
import { useState } from "react";
import dynamic from "next/dynamic";

const CFDAdvancedViewport = dynamic(
  () => import("@/components/CFDViewport").catch(() => ({ default: () => null })),
  { ssr: false }
);

type CFDTab = "flowfield" | "contours" | "residuals" | "forces" | "mesh";
type ContourField = "pressure" | "velocity" | "temperature";
type TurbModel = "laminar" | "k-epsilon" | "k-omega" | "sa" | "les" | "des";

const TURB_MODELS: { id: TurbModel; label: string; desc: string; eqn: string }[] = [
  { id: "laminar", label: "Laminar", desc: "Re < 2300, no turbulence modeling", eqn: "∂u/∂t + (u·∇)u = -∇p/ρ + ν∇²u" },
  { id: "k-epsilon", label: "k-ε Standard", desc: "General industrial flows, wall-bounded", eqn: "∂k/∂t + U·∇k = Pk - ε + ∇·(ν+νt/σk)∇k" },
  { id: "k-omega", label: "k-ω SST", desc: "Adverse pressure gradients, separated flows", eqn: "∂ω/∂t + U·∇ω = α(ω/k)Pk - βω² + ∇·(ν+σωνt)∇ω" },
  { id: "sa", label: "Spalart-Allmaras", desc: "External aerodynamics, single equation", eqn: "∂ν̃/∂t + u·∇ν̃ = Cb1S̃ν̃ + (1/σ)∇·[(ν+ν̃)∇ν̃]" },
  { id: "les", label: "LES", desc: "Large Eddy Simulation — high accuracy", eqn: "∂ūi/∂t + ∂(ūiūj)/∂xj = -∂p̄/∂xi + ∂/∂xj(2νS̄ij - τij)" },
  { id: "des", label: "DES", desc: "Detached Eddy Simulation — hybrid RANS-LES", eqn: "Hybrid RANS near-wall + LES away from wall" },
];

function fieldColor(val: number): string {
  const t = Math.max(0, Math.min(1, val));
  if (t < 0.25) { const s = t / 0.25; return `rgb(0,${Math.round(s * 255)},255)`; }
  if (t < 0.5) { const s = (t - 0.25) / 0.25; return `rgb(0,255,${Math.round(255 - s * 255)})`; }
  if (t < 0.75) { const s = (t - 0.5) / 0.25; return `rgb(${Math.round(s * 255)},255,0)`; }
  const s = (t - 0.75) / 0.25; return `rgb(255,${Math.round(255 - s * 255)},0)`;
}

export default function CFDAdvancedPage() {
  const [activeTab, setActiveTab] = useState<CFDTab>("flowfield");
  const [turbModel, setTurbModel] = useState<TurbModel>("k-omega");
  const [contourField, setContourField] = useState<ContourField>("velocity");
  const [showStreamlines, setShowStreamlines] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const [inletVelocity, setInletVelocity] = useState(10);
  const [inletTurb, setInletTurb] = useState(5);
  const [maxIter] = useState(2000);
  const [currentIter] = useState(847);

  // Contour field data (20x20 grid)
  const contourData = Array.from({ length: 400 }, (_, i) => {
    const x = (i % 20) / 20; const y = Math.floor(i / 20) / 20;
    if (contourField === "velocity") return Math.sin(x * Math.PI) * (0.3 + 0.7 * Math.abs(0.5 - y) * 2) + 0.1 * Math.random();
    if (contourField === "pressure") return 1 - x * 0.8 + 0.15 * Math.sin(y * Math.PI * 3) + 0.05 * Math.random();
    return 0.2 + 0.6 * Math.sin(x * Math.PI * 0.8) * Math.sin(y * Math.PI) + 0.1 * Math.random();
  });

  // Residual data (7 lines, 50 points)
  const residualLines = [
    { name: "Continuity", color: "#58a6ff" },
    { name: "x-Mom", color: "#f85149" },
    { name: "y-Mom", color: "#3fb950" },
    { name: "z-Mom", color: "#d29922" },
    { name: "Energy", color: "#a371f7" },
    { name: "k", color: "#00D4FF" },
    { name: "ε/ω", color: "#ff9f43" },
  ].map((l, li) => ({
    ...l,
    data: Array.from({ length: 50 }, (_, i) => 1.0 * Math.exp(-(i + li) / (7 + li * 1.5)) + 0.0001 + 0.0003 * Math.random()),
  }));

  // Mesh quality
  const meshQuality = Array.from({ length: 400 }, (_, i) => {
    const x = (i % 20) / 20; const y = Math.floor(i / 20) / 20;
    return 0.5 + 0.45 * Math.sin(x * Math.PI) * Math.sin(y * Math.PI) + 0.05 * Math.random();
  });

  const tabs: { id: CFDTab; label: string }[] = [
    { id: "flowfield", label: "Flow Field" },
    { id: "contours", label: "Contours" },
    { id: "residuals", label: "Residuals" },
    { id: "forces", label: "Forces" },
    { id: "mesh", label: "Mesh" },
  ];

  return (
    <div className="flex h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* Left setup panel */}
      <div className="w-72 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
        <div className="px-4 py-3 border-b border-[#21262d]">
          <div className="text-sm font-bold">CFD Advanced</div>
          <div className="text-[10px] text-slate-500">Computational Fluid Dynamics — Pro</div>
        </div>

        {/* Turbulence model */}
        <div className="p-3 border-b border-[#21262d]">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Turbulence Model</div>
          <div className="space-y-1.5">
            {TURB_MODELS.map(m => (
              <div key={m.id} onClick={() => setTurbModel(m.id)}
                className={`bg-[#0d1117] rounded p-2 border cursor-pointer transition-colors ${turbModel === m.id ? "border-[#00D4FF]/60 bg-[#00D4FF]/5" : "border-[#21262d] hover:border-[#30363d]"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-white">{m.label}</span>
                  {turbModel === m.id && <span className="text-[8px] text-[#00D4FF]">●</span>}
                </div>
                <div className="text-[8px] text-slate-500 mt-0.5">{m.desc}</div>
                {turbModel === m.id && <div className="text-[8px] text-slate-600 font-mono mt-1 bg-[#161b22] rounded px-1.5 py-0.5">{m.eqn}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Boundary conditions */}
        <div className="p-3 border-b border-[#21262d]">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Boundary Conditions</div>
          <div className="space-y-2">
            <div className="bg-[#0d1117] rounded p-2 border border-[#21262d]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-blue-400 font-semibold">INLET</span>
                <span className="text-[9px] text-slate-500">Velocity Inlet</span>
              </div>
              <div>
                <label className="text-[9px] text-slate-500">Velocity: <span className="text-white font-mono">{inletVelocity} m/s</span></label>
                <input type="range" min={1} max={50} value={inletVelocity} onChange={e => setInletVelocity(parseInt(e.target.value))}
                  className="w-full mt-0.5 h-1 appearance-none rounded bg-[#21262d] cursor-pointer" />
              </div>
              <div className="mt-1">
                <label className="text-[9px] text-slate-500">Turbulence Intensity: <span className="text-white font-mono">{inletTurb}%</span></label>
                <input type="range" min={1} max={20} value={inletTurb} onChange={e => setInletTurb(parseInt(e.target.value))}
                  className="w-full mt-0.5 h-1 appearance-none rounded bg-[#21262d] cursor-pointer" />
              </div>
            </div>
            {[{ label: "OUTLET", type: "Pressure Outlet", value: "p = 0 Pa (gauge)" }, { label: "WALL", type: "No-Slip Wall", value: "u = 0, v = 0, w = 0" }, { label: "TOP/BOT", type: "Symmetry", value: "∂/∂n = 0" }].map(bc => (
              <div key={bc.label} className="bg-[#0d1117] rounded p-2 border border-[#21262d]">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-semibold ${bc.label === "OUTLET" ? "text-red-400" : bc.label === "WALL" ? "text-slate-300" : "text-green-400"}`}>{bc.label}</span>
                  <span className="text-[9px] text-slate-500">{bc.type}</span>
                </div>
                <div className="text-[9px] text-slate-600 font-mono mt-0.5">{bc.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Solver settings */}
        <div className="p-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Solver Settings</div>
          <div className="space-y-1">
            {[["Algorithm", "SIMPLE"], ["Time", "Steady-State"], ["Iterations", `${currentIter}/${maxIter}`], ["Under-Relax. p", "0.3"], ["Under-Relax. U", "0.7"], ["Under-Relax. k/ε", "0.8"]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between text-[9px]">
                <span className="text-slate-500">{k}</span>
                <span className="text-white font-mono">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tabs */}
        <div className="bg-[#161b22] border-b border-[#21262d] px-4 flex items-center gap-1 shrink-0">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 text-[10px] font-semibold transition-colors ${activeTab === t.id ? "text-[#00D4FF] border-b-2 border-[#00D4FF]" : "text-slate-500 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex gap-2 text-[9px]">
            <label className="flex items-center gap-1 cursor-pointer text-slate-400">
              <input type="checkbox" checked={showStreamlines} onChange={e => setShowStreamlines(e.target.checked)} className="w-3 h-3" /> Streamlines
            </label>
            <label className="flex items-center gap-1 cursor-pointer text-slate-400">
              <input type="checkbox" checked={showParticles} onChange={e => setShowParticles(e.target.checked)} className="w-3 h-3" /> Particles
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* Flow Field */}
          {activeTab === "flowfield" && (
            <div className="space-y-3">
              <div className="bg-[#161b22] rounded-lg border border-[#21262d] p-4">
                <div className="text-sm font-bold text-white mb-3">Streamlines — {turbModel.toUpperCase()} · U∞={inletVelocity} m/s</div>
                <svg viewBox="0 0 500 200" className="w-full h-48 bg-[#0a0a0f] rounded border border-[#21262d]">
                  {/* Body shape */}
                  <ellipse cx="250" cy="100" rx="60" ry="30" fill="#161b22" stroke="#21262d" strokeWidth="2" />
                  {/* Streamlines */}
                  {showStreamlines && [20, 50, 80, 120, 150, 180].map((y, i) => {
                    const pts = Array.from({ length: 40 }, (_, j) => {
                      const x = 10 + j * 12.5;
                      const dy = y === 100 ? 0 : (y - 100) * Math.exp(-Math.abs(x - 250) / 80) * 0.15;
                      return `${x},${y + dy}`;
                    }).join(" ");
                    return <polyline key={i} points={pts} fill="none" stroke={`hsl(${200 + i * 20},80%,60%)`} strokeWidth="1.5" opacity="0.7" />;
                  })}
                  {/* Particles */}
                  {showParticles && [30, 75, 125, 165].map((y, i) => (
                    <circle key={i} cx={80 + (i * 73)} cy={y} r="3" fill="#00D4FF" opacity="0.9" />
                  ))}
                  {/* Arrow indicators */}
                  <text x="10" y="12" fill="#3fb950" fontSize="9" fontWeight="bold">U∞ = {inletVelocity} m/s →</text>
                  <text x="400" y="195" fill="#f85149" fontSize="9">p=0</text>
                </svg>
              </div>
            </div>
          )}

          {/* Contours */}
          {activeTab === "contours" && (
            <div className="space-y-3">
              <div className="bg-[#161b22] rounded-lg border border-[#21262d] p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-sm font-bold text-white">Contour Plot</div>
                  <div className="flex gap-1">
                    {(["pressure", "velocity", "temperature"] as const).map(f => (
                      <button key={f} onClick={() => setContourField(f)}
                        className={`text-[10px] px-2 py-0.5 rounded capitalize transition-colors ${contourField === f ? "bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/40" : "text-slate-500 hover:text-white border border-[#21262d]"}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(20, 1fr)" }}>
                      {contourData.map((v, i) => (
                        <div key={i} className="aspect-square" style={{ background: fieldColor(v) }} />
                      ))}
                    </div>
                  </div>
                  {/* Color bar */}
                  <div className="flex flex-col items-center gap-1 w-8 shrink-0">
                    <div className="text-[8px] text-slate-500">{contourField === "pressure" ? "1.0" : contourField === "velocity" ? `${inletVelocity}` : "100°C"}</div>
                    <div className="flex-1 w-4 rounded" style={{ background: "linear-gradient(to bottom, rgb(255,0,0), rgb(255,255,0), rgb(0,255,0), rgb(0,255,255), rgb(0,0,255))" }} />
                    <div className="text-[8px] text-slate-500">{contourField === "pressure" ? "0.0" : "0"}</div>
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-[10px]">
                  <span className="text-blue-400">Min: {contourField === "pressure" ? "0.12 Pa" : contourField === "velocity" ? "0.3 m/s" : "22°C"}</span>
                  <span className="text-white font-mono">{contourField.toUpperCase()}</span>
                  <span className="text-red-400">Max: {contourField === "pressure" ? "1.02 Pa" : contourField === "velocity" ? `${(inletVelocity * 1.35).toFixed(1)} m/s` : "98°C"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Residuals */}
          {activeTab === "residuals" && (
            <div className="bg-[#161b22] rounded-lg border border-[#21262d] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-white">Residual Convergence</div>
                <div className="text-[10px] text-green-400">Converging ✓</div>
              </div>
              <svg viewBox="0 0 520 230" className="w-full h-56 bg-[#0a0a0f] rounded border border-[#21262d]">
                {[0, 1, 2, 3, 4].map(i => (
                  <line key={i} x1="50" y1={30 + i * 44} x2="510" y2={30 + i * 44} stroke="#21262d" strokeWidth="1" />
                ))}
                <line x1="50" y1="204" x2="510" y2="204" stroke="#3fb950" strokeWidth="1.5" strokeDasharray="6,3" />
                <text x="480" y="198" fill="#3fb950" fontSize="8">1e-4</text>
                {residualLines.map((l, li) => (
                  <polyline key={li}
                    points={l.data.map((v, i) => `${50 + i * 9.2},${204 - Math.max(0, Math.log10(v / 1e-6)) * 28}`).join(" ")}
                    fill="none" stroke={l.color} strokeWidth="1.5" opacity="0.85" />
                ))}
                {[0, 10, 20, 30, 40, 49].map(i => (
                  <text key={i} x={50 + i * 9.2} y="220" fill="#6e7681" fontSize="7">{Math.round(i * (currentIter / 49))}</text>
                ))}
                {["1e0", "1e-2", "1e-4", "1e-6"].map((v, i) => (
                  <text key={v} x="2" y={40 + i * 55} fill="#6e7681" fontSize="7">{v}</text>
                ))}
              </svg>
              <div className="flex flex-wrap gap-2 mt-2">
                {residualLines.map(l => (
                  <span key={l.name} className="flex items-center gap-1 text-[9px]" style={{ color: l.color }}>
                    <span>—</span> {l.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Forces */}
          {activeTab === "forces" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[["Drag Coeff (Cd)", "0.342", "text-red-400"], ["Lift Coeff (Cl)", "0.128", "text-blue-400"], ["Moment Coeff (Cm)", "0.045", "text-green-400"]].map(([k, v, c]) => (
                  <div key={k as string} className="bg-[#161b22] rounded-lg border border-[#21262d] p-4 text-center">
                    <div className="text-[9px] text-slate-500 mb-1">{k}</div>
                    <div className={`text-2xl font-bold ${c}`}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="bg-[#161b22] rounded-lg border border-[#21262d] p-4">
                <div className="text-sm font-bold text-white mb-3">Force Coefficient History</div>
                <svg viewBox="0 0 500 160" className="w-full h-40 bg-[#0a0a0f] rounded border border-[#21262d]">
                  {[0.25, 0.5, 0.75].map(t => (
                    <line key={t} x1="40" y1={20 + t * 120} x2="490" y2={20 + t * 120} stroke="#21262d" strokeWidth="1" />
                  ))}
                  {["Cd", "Cl"].map((name, li) => {
                    const base = li === 0 ? 0.342 : 0.128;
                    const points = Array.from({ length: 50 }, (_, i) => {
                      const v = base + (Math.random() - 0.5) * 0.02 * Math.exp(-i / 20);
                      return `${40 + i * 9.2},${20 + 120 * (1 - (v / 0.6))}`;
                    }).join(" ");
                    return <polyline key={name} points={points} fill="none" stroke={li === 0 ? "#f85149" : "#58a6ff"} strokeWidth="2" />;
                  })}
                  <text x="470" y="60" fill="#f85149" fontSize="9">Cd</text>
                  <text x="470" y="100" fill="#58a6ff" fontSize="9">Cl</text>
                </svg>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {[["Reference Area", "0.01 m²"], ["Reference Velocity", `${inletVelocity} m/s`], ["Reference Pressure", "101325 Pa"], ["Dynamic Pressure", `${(0.5 * 1.225 * inletVelocity ** 2).toFixed(0)} Pa`]].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between text-[10px]">
                      <span className="text-slate-500">{k}</span>
                      <span className="text-white font-mono">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mesh */}
          {activeTab === "mesh" && (
            <div className="bg-[#161b22] rounded-lg border border-[#21262d] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-white">Mesh Quality</div>
                <div className="flex gap-3 text-[9px]">
                  <span className="text-green-400">■ Good</span>
                  <span className="text-yellow-400">■ Fair</span>
                  <span className="text-red-400">■ Poor</span>
                </div>
              </div>
              <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(20, 1fr)" }}>
                {meshQuality.map((q, i) => (
                  <div key={i} className="aspect-square rounded-sm"
                    style={{ background: q > 0.8 ? "#3fb950" : q > 0.5 ? "#d29922" : "#f85149", opacity: 0.4 + q * 0.6 }} />
                ))}
              </div>
              <div className="grid grid-cols-4 gap-3 mt-4">
                {[["Total Cells", "284,520"], ["Boundary Layers", "8"], ["Y+ (avg)", "1.5"], ["Skewness (max)", "0.72"]].map(([k, v]) => (
                  <div key={k as string} className="bg-[#0d1117] rounded p-2 border border-[#21262d] text-center">
                    <div className="text-[9px] text-slate-500">{k}</div>
                    <div className="text-[11px] font-bold text-white">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right results panel */}
      <div className="w-56 bg-[#161b22] border-l border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
        <div className="px-3 py-2 border-b border-[#21262d]">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Solver Status</div>
        </div>
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded px-2 py-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
            <span className="text-[10px] text-green-400 font-semibold">Converging</span>
          </div>
          <div className="space-y-1">
            {[["Iteration", `${currentIter} / ${maxIter}`], ["Wall Clock", "02:34:12"], ["Time/Iter", "~11s"], ["Courant Max", "0.95"], ["Courant Avg", "0.23"]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between text-[9px]">
                <span className="text-slate-500">{k}</span>
                <span className="text-white font-mono">{v}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-[#21262d] pt-2">
            <div className="text-[9px] text-slate-500 uppercase mb-1">Y+ Statistics</div>
            {[["Min Y+", "0.8", "text-green-400"], ["Max Y+", "4.2", "text-yellow-400"], ["Avg Y+", "1.5", "text-green-400"]].map(([k, v, c]) => (
              <div key={k as string} className="flex justify-between text-[9px]">
                <span className="text-slate-500">{k}</span>
                <span className={`font-mono ${c}`}>{v}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-[#21262d] pt-2">
            <div className="text-[9px] text-slate-500 uppercase mb-1">Mass Flow Balance</div>
            {[["Inlet", `${(1.225 * inletVelocity * 0.01).toFixed(3)} kg/s`], ["Outlet", `${(1.225 * inletVelocity * 0.01).toFixed(3)} kg/s`], ["Imbalance", "0.0012%"]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between text-[9px]">
                <span className="text-slate-500">{k}</span>
                <span className="text-white font-mono">{v}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-[#21262d] pt-2">
            <div className="text-[9px] text-slate-500 uppercase mb-1">Force Coefficients</div>
            {[["Cd", "0.342", "↑"], ["Cl", "0.128", "→"], ["Cm", "0.045", "→"]].map(([k, v, t]) => (
              <div key={k as string} className="flex justify-between items-center text-[9px]">
                <span className="text-slate-500">{k}</span>
                <span className="text-white font-mono">{v} <span className="text-slate-600 text-[8px]">{t}</span></span>
              </div>
            ))}
          </div>

          <button className="w-full text-[10px] text-slate-400 border border-[#21262d] rounded py-1.5 hover:bg-[#21262d] transition-colors">
            Export Results
          </button>
          <button className="w-full text-[10px] text-[#00D4FF] border border-[#00D4FF]/30 rounded py-1.5 hover:bg-[#00D4FF]/10 transition-colors">
            + Add Probe Point
          </button>
        </div>
      </div>
    </div>
  );
}
