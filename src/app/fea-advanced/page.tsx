"use client";
import { useState } from "react";
import dynamic from "next/dynamic";

const ModeShapeViewport = dynamic(
  () => import("@/components/SimulatorViewport").catch(() => ({ default: () => null })),
  { ssr: false }
);

type FEATab = "modal" | "thermal" | "fatigue" | "convergence" | "mesh" | "contact" | "safety";

const MODES = [
  { freq: 142.3, damping: 2.1, participation: 34.2, desc: "1st Bending (XZ plane)" },
  { freq: 287.6, damping: 1.8, participation: 28.7, desc: "2nd Bending (YZ plane)" },
  { freq: 412.1, damping: 3.2, participation: 18.4, desc: "1st Torsional" },
  { freq: 698.4, damping: 2.5, participation: 12.1, desc: "3rd Bending (XZ plane)" },
  { freq: 834.7, damping: 4.1, participation: 6.6, desc: "2nd Torsional" },
];

function tempToHex(t: number): string {
  const r = Math.min(255, Math.round(t * 2.55));
  const g = Math.min(255, Math.round(Math.sin((t / 100) * Math.PI) * 255));
  const b = Math.max(0, Math.round(255 - t * 2.55));
  return `rgb(${r},${g},${b})`;
}

function safetyColor(sf: number): string {
  if (sf >= 2.0) return "#3fb950";
  if (sf >= 1.5) return "#d29922";
  if (sf >= 1.0) return "#f85149";
  return "#8b0000";
}

export default function FEAAdvancedPage() {
  const [activeTab, setActiveTab] = useState<FEATab>("modal");
  const [selectedMode, setSelectedMode] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [appliedStress, setAppliedStress] = useState(150);
  const [contactType, setContactType] = useState<"bonded" | "sliding" | "friction">("bonded");
  const [frictionCoeff, setFrictionCoeff] = useState(0.3);
  const [contactPenetration, setContactPenetration] = useState(0.01);
  const [meshRefinement, setMeshRefinement] = useState(2);

  const fatigueCycles = Math.round(1e8 * Math.exp(-appliedStress / 80));
  const fatigueLife = fatigueCycles > 1e6 ? `${(fatigueCycles / 1e6).toFixed(1)}M cycles` : `${(fatigueCycles / 1e3).toFixed(0)}K cycles`;

  // Mesh quality grid (10x10)
  const meshQuality = Array.from({ length: 100 }, (_, i) => {
    const x = (i % 10) / 10; const y = Math.floor(i / 10) / 10;
    return 0.6 + 0.35 * Math.sin(x * Math.PI) * Math.sin(y * Math.PI) + 0.05 * Math.random();
  });

  // Convergence data
  const convergence = Array.from({ length: 50 }, (_, i) => 1.0 * Math.exp(-i / 8) + 0.001);

  // Safety factor grid
  const safetyFactors = Array.from({ length: 100 }, (_, i) => {
    const x = (i % 10) / 10; const y = Math.floor(i / 10) / 10;
    return 0.8 + 2.5 * Math.sin(x * Math.PI * 0.8) * Math.sin(y * Math.PI * 0.8);
  });

  const tabs: { id: FEATab; label: string }[] = [
    { id: "modal", label: "Modal" },
    { id: "thermal", label: "Thermal" },
    { id: "fatigue", label: "Fatigue" },
    { id: "convergence", label: "Convergence" },
    { id: "mesh", label: "Mesh Quality" },
    { id: "contact", label: "Contact" },
    { id: "safety", label: "Safety Factor" },
  ];

  return (
    <div className="flex h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* Left setup panel */}
      <div className="w-72 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
        <div className="px-4 py-3 border-b border-[#21262d]">
          <div className="text-sm font-bold text-white">FEA Advanced</div>
          <div className="text-[10px] text-slate-500">Finite Element Analysis — Professional Suite</div>
        </div>

        {/* Analysis Setup */}
        <div className="p-3 border-b border-[#21262d]">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Analysis Type</div>
          <div className="space-y-1">
            {["Static Structural", "Modal (Natural Frequency)", "Thermal Steady-State", "Fatigue (S-N Method)", "Buckling"].map(t => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="analysis" defaultChecked={t.includes("Modal")} className="text-[#00D4FF]" />
                <span className="text-[10px] text-slate-300">{t}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Material */}
        <div className="p-3 border-b border-[#21262d]">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Material</div>
          <select className="w-full bg-[#21262d] text-white text-[10px] rounded px-2 py-1.5 border border-[#30363d] outline-none">
            <option>Aluminum 6061-T6 (E=69 GPa)</option>
            <option>Stainless Steel 304 (E=193 GPa)</option>
            <option>Titanium Ti-6Al-4V (E=114 GPa)</option>
            <option>ABS Plastic (E=2.3 GPa)</option>
          </select>
          <div className="mt-2 space-y-1">
            {[["E (Young's Modulus)", "69 GPa"], ["ν (Poisson's Ratio)", "0.33"], ["ρ (Density)", "2700 kg/m³"], ["σy (Yield Strength)", "276 MPa"], ["Su (Ultimate)", "310 MPa"]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between text-[9px]">
                <span className="text-slate-500">{k}</span>
                <span className="text-white font-mono">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mesh Settings */}
        <div className="p-3 border-b border-[#21262d]">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Mesh Settings</div>
          <div className="space-y-2">
            <div>
              <div className="text-[9px] text-slate-500 mb-1">Refinement Level: {meshRefinement}</div>
              <input type="range" min={1} max={5} value={meshRefinement} onChange={e => setMeshRefinement(parseInt(e.target.value))}
                className="w-full h-1.5 appearance-none rounded bg-[#21262d] cursor-pointer" />
            </div>
            <div className="flex justify-between text-[9px]">
              <span className="text-slate-500">Element Type</span><span className="text-white">Tet10 (Quadratic)</span>
            </div>
            <div className="flex justify-between text-[9px]">
              <span className="text-slate-500">Total Elements</span><span className="text-white font-mono">{(12400 * meshRefinement).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[9px]">
              <span className="text-slate-500">Total Nodes</span><span className="text-white font-mono">{(18600 * meshRefinement).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Results summary */}
        <div className="p-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Results Summary</div>
          <div className="space-y-1">
            {[["Max von Mises", "187.4 MPa", "text-orange-400"], ["Max Displacement", "0.342 mm", "text-blue-400"], ["Min Safety Factor", "1.47", "text-yellow-400"], ["1st Nat. Frequency", "142.3 Hz", "text-green-400"], ["Total DOF", "55,800", "text-slate-300"]].map(([k, v, c]) => (
              <div key={k as string} className="flex justify-between items-center">
                <span className="text-[9px] text-slate-500">{k}</span>
                <span className={`text-[10px] font-mono font-bold ${c}`}>{v}</span>
              </div>
            ))}
          </div>
          <button className="mt-3 w-full text-[10px] text-slate-400 border border-[#21262d] rounded py-1.5 hover:bg-[#21262d] transition-colors">
            Export Results (.csv)
          </button>
        </div>
      </div>

      {/* Center visualization */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tabs */}
        <div className="bg-[#161b22] border-b border-[#21262d] px-4 flex items-center gap-1 shrink-0 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 text-[10px] font-semibold whitespace-nowrap transition-colors ${activeTab === t.id ? "text-[#00D4FF] border-b-2 border-[#00D4FF]" : "text-slate-500 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* Modal Analysis */}
          {activeTab === "modal" && (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-3">
                {MODES.map((m, i) => (
                  <div key={i} onClick={() => setSelectedMode(i)}
                    className={`bg-[#161b22] rounded-lg p-3 border cursor-pointer transition-colors ${selectedMode === i ? "border-[#00D4FF] bg-[#00D4FF]/5" : "border-[#21262d] hover:border-[#30363d]"}`}>
                    <div className="text-[9px] text-slate-500 mb-1">Mode {i + 1}</div>
                    <div className="text-lg font-bold text-white">{m.freq}</div>
                    <div className="text-[9px] text-slate-500">Hz</div>
                    <div className="text-[9px] text-green-400 mt-1">{m.participation}% mass</div>
                  </div>
                ))}
              </div>
              <div className="bg-[#161b22] rounded-lg border border-[#21262d] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-bold text-white">Mode {selectedMode + 1}: {MODES[selectedMode].desc}</div>
                    <div className="text-[10px] text-slate-500">f = {MODES[selectedMode].freq} Hz · ζ = {MODES[selectedMode].damping}% · Mass participation = {MODES[selectedMode].participation}%</div>
                  </div>
                  <button onClick={() => setAnimating(!animating)} className={`text-[10px] px-3 py-1 rounded border transition-colors ${animating ? "border-red-500/40 text-red-400 bg-red-500/10" : "border-[#00D4FF]/40 text-[#00D4FF] bg-[#00D4FF]/10"}`}>
                    {animating ? "■ Stop" : "▶ Animate"}
                  </button>
                </div>
                {/* Mode shape visualization */}
                <div className="h-48 bg-[#0d1117] rounded border border-[#21262d] flex items-center justify-center relative overflow-hidden">
                  <svg viewBox="0 0 400 160" className="w-full h-full">
                    {Array.from({ length: 20 }, (_, i) => {
                      const x = (i / 19) * 380 + 10;
                      const amp = animating ? Math.sin(i / 19 * Math.PI * (selectedMode + 1)) * 30 : Math.sin(i / 19 * Math.PI * (selectedMode + 1)) * 20;
                      return <circle key={i} cx={x} cy={80 + amp} r="4" fill="#00D4FF" opacity={0.8} />;
                    })}
                    {Array.from({ length: 19 }, (_, i) => {
                      const x1 = (i / 19) * 380 + 10; const x2 = ((i + 1) / 19) * 380 + 10;
                      const amp1 = Math.sin(i / 19 * Math.PI * (selectedMode + 1)) * 20;
                      const amp2 = Math.sin((i + 1) / 19 * Math.PI * (selectedMode + 1)) * 20;
                      return <line key={i} x1={x1} y1={80 + amp1} x2={x2} y2={80 + amp2} stroke="#00D4FF" strokeWidth="2" opacity={0.5} />;
                    })}
                    <line x1="10" y1="80" x2="390" y2="80" stroke="#21262d" strokeWidth="1" strokeDasharray="4" />
                    <text x="10" y="155" fill="#6e7681" fontSize="9">0</text>
                    <text x="375" y="155" fill="#6e7681" fontSize="9">L</text>
                  </svg>
                  <div className="absolute top-2 right-2 text-[9px] text-slate-600 bg-[#161b22]/80 px-2 py-1 rounded">Mode shape — deformation ×{animating ? "50" : "30"}</div>
                </div>
              </div>
            </div>
          )}

          {/* Thermal */}
          {activeTab === "thermal" && (
            <div className="space-y-4">
              <div className="bg-[#161b22] rounded-lg border border-[#21262d] p-4">
                <div className="text-sm font-bold text-white mb-3">Temperature Distribution</div>
                <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(20, 1fr)" }}>
                  {Array.from({ length: 400 }, (_, i) => {
                    const x = i % 20; const y = Math.floor(i / 20);
                    const t = 20 + 80 * Math.sin(x / 20 * Math.PI) * (1 - y / 20 * 0.7) + Math.random() * 5;
                    return <div key={i} className="aspect-square rounded-sm" style={{ background: tempToHex(t) }} title={`${t.toFixed(0)}°C`} />;
                  })}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-3 rounded" style={{ background: "linear-gradient(to right, rgb(0,0,255), rgb(0,255,0), rgb(255,0,0))" }} />
                    <span className="text-[9px] text-slate-500">20°C → 100°C</span>
                  </div>
                  <div className="flex gap-4 text-[10px]">
                    <span className="text-blue-400">Min: 22.1°C</span>
                    <span className="text-red-400">Max: 98.7°C</span>
                    <span className="text-slate-400">Avg: 61.3°C</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fatigue */}
          {activeTab === "fatigue" && (
            <div className="space-y-4">
              <div className="bg-[#161b22] rounded-lg border border-[#21262d] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-white">S-N Curve (Wöhler Curve)</div>
                  <div className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded px-2 py-0.5">Al 6061-T6</div>
                </div>
                <div className="mb-3">
                  <label className="text-[10px] text-slate-400">Applied Stress: <span className="text-white font-mono">{appliedStress} MPa</span></label>
                  <input type="range" min={50} max={276} value={appliedStress} onChange={e => setAppliedStress(parseInt(e.target.value))}
                    className="w-full mt-1 h-1.5 appearance-none rounded bg-[#21262d] cursor-pointer" />
                </div>
                <svg viewBox="0 0 500 200" className="w-full h-48 bg-[#0d1117] rounded border border-[#21262d]">
                  {/* Grid */}
                  {[0.25, 0.5, 0.75].map(t => (
                    <line key={t} x1="40" y1={40 + t * 140} x2="480" y2={40 + t * 140} stroke="#21262d" strokeWidth="1" />
                  ))}
                  {/* S-N curve */}
                  <polyline points={Array.from({length: 50}, (_, i) => { const x = 40 + i * 8.8; const logN = 3 + i * 0.14; const stress = 350 * Math.exp(-logN * 0.18); return `${x},${40 + 140 * (1 - Math.min(stress, 300) / 300)}`; }).join(" ")}
                    fill="none" stroke="#58a6ff" strokeWidth="2" />
                  {/* Operating point */}
                  {(() => {
                    const logN = Math.log10(fatigueCycles); const normN = Math.max(0, Math.min(1, (logN - 3) / 7));
                    const normS = 1 - appliedStress / 300;
                    return <circle cx={40 + normN * 440} cy={40 + 140 * normS} r="5" fill="#f85149" stroke="#fff" strokeWidth="1.5" />;
                  })()}
                  {/* Labels */}
                  <text x="45" y="195" fill="#6e7681" fontSize="8">10³</text>
                  <text x="150" y="195" fill="#6e7681" fontSize="8">10⁵</text>
                  <text x="280" y="195" fill="#6e7681" fontSize="8">10⁷</text>
                  <text x="420" y="195" fill="#6e7681" fontSize="8">10⁹</text>
                  <text x="10" y="45" fill="#6e7681" fontSize="8">300</text>
                  <text x="10" y="115" fill="#6e7681" fontSize="8">150</text>
                  <text x="10" y="180" fill="#6e7681" fontSize="8">0</text>
                </svg>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-[11px] text-slate-400">Fatigue Life at {appliedStress} MPa:</div>
                  <div className={`text-sm font-bold ${fatigueCycles > 1e7 ? "text-green-400" : fatigueCycles > 1e5 ? "text-yellow-400" : "text-red-400"}`}>{fatigueLife}</div>
                </div>
              </div>
            </div>
          )}

          {/* Convergence */}
          {activeTab === "convergence" && (
            <div className="bg-[#161b22] rounded-lg border border-[#21262d] p-4">
              <div className="text-sm font-bold text-white mb-3">Residual Convergence</div>
              <svg viewBox="0 0 500 220" className="w-full h-52 bg-[#0d1117] rounded border border-[#21262d]">
                {[0.001, 0.01, 0.1, 1.0].map((v, i) => (
                  <line key={i} x1="40" y1={200 - i * 55} x2="480" y2={200 - i * 55} stroke="#21262d" strokeWidth="1" />
                ))}
                <line x1="40" y1="10" x2="40" y2="200" stroke="#21262d" strokeWidth="1" />
                <polyline
                  points={convergence.map((v, i) => `${40 + i * 8.8},${200 - Math.log10(v / 0.001) * 55}`).join(" ")}
                  fill="none" stroke="#00D4FF" strokeWidth="2" />
                <line x1="40" y1="145" x2="480" y2="145" stroke="#3fb950" strokeWidth="1" strokeDasharray="6,3" />
                <text x="460" y="140" fill="#3fb950" fontSize="8">1e-4</text>
                {[0, 10, 20, 30, 40, 49].map(i => (
                  <text key={i} x={40 + i * 8.8} y="215" fill="#6e7681" fontSize="8">{i}</text>
                ))}
                <text x="10" y="205" fill="#6e7681" fontSize="8">1</text>
                <text x="2" y="150" fill="#6e7681" fontSize="8">10⁻³</text>
                <text x="2" y="95" fill="#6e7681" fontSize="8">10⁻⁵</text>
              </svg>
              <div className="flex items-center justify-between mt-2 text-[10px]">
                <span className="text-slate-500">Iterations: 47</span>
                <span className="text-green-400">Converged at: 1.2×10⁻⁴</span>
                <span className="text-slate-500">Tolerance: 1.0×10⁻⁴</span>
              </div>
            </div>
          )}

          {/* Mesh Quality */}
          {activeTab === "mesh" && (
            <div className="space-y-4">
              <div className="bg-[#161b22] rounded-lg border border-[#21262d] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-white">Mesh Quality (Aspect Ratio)</div>
                  <div className="flex gap-3 text-[9px]">
                    <span className="text-green-400">■ Good (&gt;0.8)</span>
                    <span className="text-yellow-400">■ Fair (0.5-0.8)</span>
                    <span className="text-red-400">■ Poor (&lt;0.5)</span>
                  </div>
                </div>
                <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(10, 1fr)" }}>
                  {meshQuality.map((q, i) => (
                    <div key={i} className="aspect-square rounded-sm" title={`Quality: ${q.toFixed(2)}`}
                      style={{ background: q > 0.8 ? "#3fb950" : q > 0.5 ? "#d29922" : "#f85149", opacity: 0.5 + q * 0.5 }} />
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-4 mt-4">
                  {[["Min Quality", "0.62"], ["Max Quality", "0.97"], ["Avg Quality", "0.84"], ["Poor Elements", "3.2%"]].map(([k, v]) => (
                    <div key={k as string} className="bg-[#0d1117] rounded p-2 border border-[#21262d] text-center">
                      <div className="text-[9px] text-slate-500">{k}</div>
                      <div className="text-sm font-bold text-white">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Contact */}
          {activeTab === "contact" && (
            <div className="space-y-4">
              <div className="bg-[#161b22] rounded-lg border border-[#21262d] p-4">
                <div className="text-sm font-bold text-white mb-3">Contact Analysis Setup</div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {(["bonded", "sliding", "friction"] as const).map(ct => (
                    <button key={ct} onClick={() => setContactType(ct)}
                      className={`py-3 rounded-lg border text-center capitalize text-xs font-semibold transition-colors ${contactType === ct ? "border-[#00D4FF] text-[#00D4FF] bg-[#00D4FF]/10" : "border-[#21262d] text-slate-400 hover:border-[#30363d]"}`}>
                      {ct}
                      <div className="text-[8px] font-normal mt-0.5 text-slate-500">
                        {ct === "bonded" ? "No separation" : ct === "sliding" ? "No friction" : "With friction"}
                      </div>
                    </button>
                  ))}
                </div>
                {contactType === "friction" && (
                  <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] mb-3">
                    <label className="text-[10px] text-slate-400">Friction Coefficient μ: <span className="text-white font-mono">{frictionCoeff.toFixed(2)}</span></label>
                    <input type="range" min={0} max={1} step={0.05} value={frictionCoeff} onChange={e => setFrictionCoeff(parseFloat(e.target.value))}
                      className="w-full mt-1 h-1.5 appearance-none rounded bg-[#21262d] cursor-pointer" />
                  </div>
                )}
                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d]">
                  <label className="text-[10px] text-slate-400">Max Penetration Tolerance: <span className="text-white font-mono">{contactPenetration.toFixed(3)} mm</span></label>
                  <input type="range" min={0.001} max={0.1} step={0.001} value={contactPenetration} onChange={e => setContactPenetration(parseFloat(e.target.value))}
                    className="w-full mt-1 h-1.5 appearance-none rounded bg-[#21262d] cursor-pointer" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[["Contact Status", "Active"], ["Contact Pairs", "3"], ["Max Pressure", "47.3 MPa"], ["Slip Distance", contactType === "bonded" ? "0.000 mm" : "0.042 mm"]].map(([k, v]) => (
                    <div key={k as string} className="bg-[#0d1117] rounded p-2 border border-[#21262d]">
                      <div className="text-[9px] text-slate-500">{k}</div>
                      <div className="text-[11px] font-bold text-white">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Safety Factor */}
          {activeTab === "safety" && (
            <div className="space-y-4">
              <div className="bg-[#161b22] rounded-lg border border-[#21262d] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-white">Safety Factor Distribution</div>
                  <div className="flex gap-3 text-[9px]">
                    <span className="text-green-400">■ &gt;2.0</span>
                    <span className="text-yellow-400">■ 1.5–2.0</span>
                    <span className="text-orange-400">■ 1.0–1.5</span>
                    <span className="text-red-400">■ &lt;1.0</span>
                  </div>
                </div>
                <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(10, 1fr)" }}>
                  {safetyFactors.map((sf, i) => (
                    <div key={i} className="aspect-square rounded-sm" title={`SF: ${sf.toFixed(2)}`}
                      style={{ background: safetyColor(sf), opacity: 0.7 }} />
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-4 mt-4">
                  {[["Min SF", "1.02", "text-red-400"], ["Max SF", "3.24", "text-green-400"], ["Avg SF", "1.96", "text-yellow-400"], ["Critical Regions", "4", "text-orange-400"]].map(([k, v, c]) => (
                    <div key={k as string} className="bg-[#0d1117] rounded p-2 border border-[#21262d] text-center">
                      <div className="text-[9px] text-slate-500">{k}</div>
                      <div className={`text-sm font-bold ${c}`}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right results panel */}
      <div className="w-56 bg-[#161b22] border-l border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
        <div className="px-3 py-2 border-b border-[#21262d]">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Results</div>
        </div>
        <div className="p-3 space-y-3">
          <div>
            <div className="text-[9px] text-slate-500 uppercase mb-1">Stress (von Mises)</div>
            <div className="text-lg font-bold text-orange-400">187.4 MPa</div>
            <div className="w-full bg-[#21262d] rounded-full h-1.5 mt-1">
              <div className="h-1.5 rounded-full bg-orange-400" style={{ width: `${187.4/310*100}%` }} />
            </div>
            <div className="text-[8px] text-slate-600 mt-0.5">Su = 310 MPa</div>
          </div>
          <div>
            <div className="text-[9px] text-slate-500 uppercase mb-1">Max Displacement</div>
            <div className="text-lg font-bold text-blue-400">0.342 mm</div>
          </div>
          <div>
            <div className="text-[9px] text-slate-500 uppercase mb-1">Safety Factor</div>
            <div className="text-lg font-bold text-yellow-400">1.47</div>
          </div>
          <div className="border-t border-[#21262d] pt-2">
            <div className="text-[9px] text-slate-500 uppercase mb-2">Modal Modes</div>
            {MODES.map((m, i) => (
              <div key={i} className={`flex justify-between items-center py-1 cursor-pointer ${selectedMode === i ? "text-[#00D4FF]" : "text-slate-400"}`} onClick={() => { setSelectedMode(i); setActiveTab("modal"); }}>
                <span className="text-[9px]">Mode {i + 1}</span>
                <span className="text-[9px] font-mono">{m.freq} Hz</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#21262d] pt-2">
            <div className="text-[9px] text-slate-500 uppercase mb-1">Reaction Forces</div>
            {[["Fx", "0.0 N"], ["Fy", "-2847 N"], ["Fz", "0.0 N"], ["Mx", "0.0 Nm"]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between text-[9px] py-0.5">
                <span className="text-slate-500">{k}</span>
                <span className="text-white font-mono">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
