"use client";
import { useState } from "react";

const steps = [
  { id: "geometry", label: "1. Geometry", icon: "📐", desc: "Import or select CAD model" },
  { id: "mesh", label: "2. Meshing", icon: "🔲", desc: "Generate finite element mesh" },
  { id: "physics", label: "3. Physics", icon: "⚡", desc: "Set boundary conditions & loads" },
  { id: "material", label: "4. Materials", icon: "🧱", desc: "Assign material properties" },
  { id: "solver", label: "5. Solver", icon: "▶️", desc: "Configure and run solver" },
  { id: "results", label: "6. Results", icon: "📊", desc: "Visualize & post-process" },
];

const materials = [
  { id: "steel", name: "Steel (AISI 1045)", E: "200 GPa", rho: "7850 kg/m3" },
  { id: "aluminum", name: "Aluminum 6061-T6", E: "69 GPa", rho: "2700 kg/m3" },
  { id: "titanium", name: "Titanium Ti-6Al-4V", E: "114 GPa", rho: "4430 kg/m3" },
  { id: "abs", name: "ABS Plastic", E: "2.3 GPa", rho: "1040 kg/m3" },
];

export default function SimulatorPage() {
  const [step, setStep] = useState("geometry");
  const [analysis, setAnalysis] = useState("structural");
  const [mat, setMat] = useState("steel");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const runSolver = () => {
    setRunning(true); setProgress(0); setDone(false);
    const iv = setInterval(() => {
      setProgress(p => { if (p >= 100) { clearInterval(iv); setRunning(false); setDone(true); setStep("results"); return 100; } return p + 2; });
    }, 80);
  };

  const stepIdx = steps.findIndex(s => s.id === step);
  const m = materials.find(x => x.id === mat);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#21262d] px-4 py-2 flex items-center gap-3 shrink-0">
        <span className="text-xs font-bold text-[#e94560]">FEA / CFD Simulator</span>
        <select value={analysis} onChange={e => setAnalysis(e.target.value)} className="bg-[#0d1117] text-xs rounded px-2 py-1 border border-[#21262d] text-slate-300">
          <option value="structural">Structural (FEA)</option><option value="thermal">Thermal</option><option value="cfd">CFD Flow</option><option value="modal">Modal</option>
        </select>
        <div className="flex-1" />
        <button onClick={runSolver} disabled={running} className="bg-[#e94560] hover:bg-[#d63750] disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded font-semibold">
          {running ? `Solving... ${progress}%` : "▶ Run Simulation"}
        </button>
      </div>

      {/* Workflow Steps */}
      <div className="bg-[#161b22] border-b border-[#21262d] flex items-center shrink-0">
        {steps.map((s, i) => (
          <button key={s.id} onClick={() => setStep(s.id)} className={`flex items-center gap-1.5 px-4 py-2 text-xs border-b-2 transition-all ${step === s.id ? "border-[#e94560] text-white bg-[#0d1117]" : i < stepIdx ? "border-green-500 text-green-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
            <span>{i < stepIdx ? "✅" : s.icon}</span> {s.label}
          </button>
        ))}
        {running && <div className="flex-1 mx-4"><div className="h-1 bg-[#21262d] rounded-full overflow-hidden"><div className="h-full bg-[#e94560] transition-all" style={{width:`${progress}%`}} /></div></div>}
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-72 bg-[#161b22] border-r border-[#21262d] p-3 overflow-y-auto shrink-0">
          {step === "geometry" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase">Geometry Setup</h3>
              <button className="w-full bg-[#21262d] hover:bg-[#30363d] text-xs py-2 rounded text-white">📂 Import STEP/STL File</button>
              <button className="w-full bg-[#21262d] hover:bg-[#30363d] text-xs py-2 rounded text-white">✏️ Select from Designer</button>
              <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-1">
                <div className="text-slate-400">Loaded: <span className="text-white">Bracket_v2.step</span></div>
                <div className="text-slate-500">Faces: 24 | Edges: 36</div>
                <div className="text-slate-500">Volume: 48,000 mm3</div>
              </div>
              <button onClick={() => setStep("mesh")} className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold">Next: Meshing →</button>
            </div>
          )}
          {step === "mesh" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase">Mesh Generation</h3>
              {["Auto (AI)", "Tet4 - Fast", "Tet10 - Accurate", "Hex8 - Structured"].map(m => (
                <label key={m} className="flex items-center gap-2 text-xs text-slate-300 bg-[#0d1117] p-2 rounded border border-[#21262d] cursor-pointer hover:border-[#30363d]">
                  <input type="radio" name="mesh" defaultChecked={m.includes("Auto")} className="accent-[#e94560]" /> {m}
                </label>
              ))}
              <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-1">
                <div className="text-slate-500">Nodes: <span className="text-green-400">12,450</span></div>
                <div className="text-slate-500">Elements: <span className="text-green-400">68,230</span></div>
                <div className="text-slate-500">Quality: <span className="text-green-400">Good (0.87)</span></div>
              </div>
              <button onClick={() => setStep("physics")} className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold">Next: Physics →</button>
            </div>
          )}
          {step === "physics" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase">Boundary Conditions</h3>
              {["🔒 Fixed Support","➡️ Applied Force","⬇️ Pressure","🌡️ Temperature","💨 Convection"].map(bc => (
                <label key={bc} className="flex items-center gap-2 text-xs text-slate-300 bg-[#0d1117] p-2 rounded border border-[#21262d] cursor-pointer hover:border-[#30363d]">
                  <input type="checkbox" defaultChecked={bc.includes("Fixed") || bc.includes("Force")} className="accent-[#e94560]" /> {bc}
                </label>
              ))}
              <button onClick={() => setStep("material")} className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold">Next: Materials →</button>
            </div>
          )}
          {step === "material" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase">Material Assignment</h3>
              {materials.map(m => (
                <label key={m.id} className="flex items-start gap-2 text-xs bg-[#0d1117] p-2 rounded border border-[#21262d] cursor-pointer hover:border-[#30363d]">
                  <input type="radio" name="mat" checked={mat === m.id} onChange={() => setMat(m.id)} className="accent-[#e94560] mt-0.5" />
                  <div><div className="text-white font-medium">{m.name}</div><div className="text-slate-500">E: {m.E} | Density: {m.rho}</div></div>
                </label>
              ))}
              <button onClick={() => setStep("solver")} className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold">Next: Solver →</button>
            </div>
          )}
          {step === "solver" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase">Solver Configuration</h3>
              <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                <div className="text-slate-400">Analysis: <span className="text-white">{analysis}</span></div>
                <div className="text-slate-400">Material: <span className="text-white">{m?.name}</span></div>
                <div className="text-slate-400">Mesh: <span className="text-white">68,230 elements</span></div>
                <div className="text-slate-400">Max Iterations: <span className="text-white">500</span></div>
                <div className="text-slate-400">Tolerance: <span className="text-white">1e-6</span></div>
              </div>
              <button onClick={runSolver} disabled={running} className="w-full bg-[#e94560] hover:bg-[#d63750] disabled:opacity-50 py-2 rounded text-xs font-bold">
                {running ? `Solving... ${progress}%` : "▶ Run Simulation"}
              </button>
            </div>
          )}
          {step === "results" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase">Post-Processing</h3>
              {done && <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded p-2">✅ Converged in 342 iterations</div>}
              <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-1">
                <div className="text-slate-400">Max Stress: <span className="text-amber-400 font-bold">245.6 MPa</span></div>
                <div className="text-slate-400">Max Displacement: <span className="text-blue-400 font-bold">0.032 mm</span></div>
                <div className="text-slate-400">Safety Factor: <span className="text-green-400 font-bold">2.85</span></div>
              </div>
              <button className="w-full bg-[#21262d] hover:bg-[#30363d] text-xs py-2 rounded text-white">📄 Export Report (PDF)</button>
              <button className="w-full bg-[#21262d] hover:bg-[#30363d] text-xs py-2 rounded text-white">💾 Export VTK Data</button>
            </div>
          )}
        </div>

        {/* Viewport */}
        <div className="flex-1 relative bg-[#0a0e14]">
          <div className="absolute inset-0" style={{backgroundImage:"radial-gradient(circle, #1a2332 1px, transparent 1px)",backgroundSize:"24px 24px"}} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            {step === "results" && done ? (
              <div>
                <div className="text-xs text-slate-400 mb-2">Von Mises Stress Contour</div>
                <div className="w-64 h-4 rounded bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 to-red-500 mb-1" />
                <div className="flex justify-between text-[10px] text-slate-500 w-64"><span>0.0 MPa</span><span>245.6 MPa</span></div>
              </div>
            ) : (
              <div>
                <div className="text-6xl mb-4 opacity-20">{steps.find(s => s.id === step)?.icon}</div>
                <div className="text-sm text-slate-500">{steps.find(s => s.id === step)?.desc}</div>
                <div className="text-xs text-slate-600 mt-2">OpenFOAM + CalculiX Backend</div>
              </div>
            )}
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] text-slate-600">
            <span>Analysis: {analysis} | Step: {step} | Material: {m?.name}</span>
            <span>Engine: OpenFOAM + CalculiX</span>
          </div>
        </div>
      </div>
    </div>
  );
}
