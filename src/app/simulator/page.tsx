"use client";
import { useState } from "react";

const workflowSteps = [
  { id: "geometry", label: "1. Geometry", icon: "\u25A1", desc: "Import or select CAD model" },
  { id: "mesh", label: "2. Meshing", icon: "\u25A6", desc: "Generate finite element mesh" },
  { id: "physics", label: "3. Physics", icon: "\u2699", desc: "Set boundary conditions & loads" },
  { id: "material", label: "4. Materials", icon: "\u25C9", desc: "Assign material properties" },
  { id: "solver", label: "5. Solver", icon: "\u25B6", desc: "Configure and run solver" },
  { id: "results", label: "6. Results", icon: "\u2606", desc: "Visualize & post-process" },
];

const analysisTypes = [
  { id: "structural", label: "Structural (FEA)", desc: "Static stress, strain, deformation" },
  { id: "thermal", label: "Thermal", desc: "Heat transfer & temperature" },
  { id: "cfd", label: "CFD Flow", desc: "Incompressible/compressible flow" },
  { id: "modal", label: "Modal", desc: "Natural frequencies & mode shapes" },
  { id: "fatigue", label: "Fatigue", desc: "Cycle life & failure prediction" },
];

const meshTypes = [
  { id: "auto", label: "Auto (Recommended)", desc: "AI picks best mesh settings" },
  { id: "tet4", label: "Tet4", desc: "Linear tetrahedra - fast" },
  { id: "tet10", label: "Tet10", desc: "Quadratic tet - accurate" },
  { id: "hex8", label: "Hex8", desc: "Hexahedra - structured" },
  { id: "hybrid", label: "Hybrid", desc: "Mix tet + hex + prism" },
];

const materials = [
  { id: "steel", name: "Steel (AISI 1045)", E: "200 GPa", v: "0.29", rho: "7850", k: "49.8" },
  { id: "aluminum", name: "Aluminum 6061-T6", E: "69 GPa", v: "0.33", rho: "2700", k: "167" },
  { id: "titanium", name: "Titanium Ti-6Al-4V", E: "114 GPa", v: "0.34", rho: "4430", k: "6.7" },
  { id: "abs", name: "ABS Plastic", E: "2.3 GPa", v: "0.35", rho: "1040", k: "0.17" },
  { id: "copper", name: "Copper C11000", E: "117 GPa", v: "0.34", rho: "8940", k: "388" },
];

const bcTypes = [
  { id: "fixed", label: "Fixed Support", icon: "\u25A0", desc: "Zero displacement on face" },
  { id: "force", label: "Applied Force", icon: "\u2192", desc: "Point or distributed force" },
  { id: "pressure", label: "Pressure", icon: "\u25BD", desc: "Uniform pressure on face" },
  { id: "displacement", label: "Displacement", icon: "\u21C6", desc: "Prescribed displacement" },
  { id: "temperature", label: "Temperature", icon: "\u2668", desc: "Fixed temperature BC" },
  { id: "convection", label: "Convection", icon: "\u223F", desc: "Heat convection on surface" },
  { id: "inlet", label: "Inlet (CFD)", icon: "\u2192", desc: "Flow inlet velocity" },
  { id: "outlet", label: "Outlet (CFD)", icon: "\u2190", desc: "Pressure outlet" },
  { id: "wall", label: "Wall (CFD)", icon: "\u2588", desc: "No-slip wall condition" },
  { id: "symmetry", label: "Symmetry", icon: "\u2225", desc: "Symmetry plane" },
];

const solverTypes = [
  { id: "static", label: "Static Linear" },
  { id: "nonlinear", label: "Static Non-linear" },
  { id: "transient", label: "Transient" },
  { id: "steady", label: "Steady-State" },
  { id: "eigenvalue", label: "Eigenvalue" },
];

const resultTypes = [
  { id: "vonmises", label: "Von Mises Stress", unit: "MPa" },
  { id: "displacement", label: "Displacement", unit: "mm" },
  { id: "strain", label: "Strain", unit: "-" },
  { id: "temperature", label: "Temperature", unit: "K" },
  { id: "velocity", label: "Velocity", unit: "m/s" },
  { id: "pressure", label: "Pressure Field", unit: "Pa" },
];

export default function SimulatorPage() {
  const [step, setStep] = useState("geometry");
  const [analysis, setAnalysis] = useState("structural");
  const [meshType, setMeshType] = useState("auto");
  const [meshSize, setMeshSize] = useState("5");
  const [meshRefine, setMeshRefine] = useState("2");
  const [selectedMat, setSelectedMat] = useState("steel");
  const [selectedBCs, setSelectedBCs] = useState<string[]>(["fixed","force"]);
  const [solver, setSolver] = useState("static");
  const [turbModel, setTurbModel] = useState("k-epsilon");
  const [inletVel, setInletVel] = useState("10");
  const [resultView, setResultView] = useState("vonmises");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [converged, setConverged] = useState(false);

  const runSolver = () => {
    setRunning(true); setProgress(0); setConverged(false);
    const iv = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(iv); setRunning(false); setConverged(true); setStep("results"); return 100; }
        return p + 2;
      });
    }, 80);
  };

  const toggleBC = (id: string) => {
    setSelectedBCs(prev => prev.includes(id) ? prev.filter(x => x!==id) : [...prev, id]);
  };

  const mat = materials.find(m => m.id===selectedMat);
  const stepIdx = workflowSteps.findIndex(s => s.id===step);

  return (
    <div className="flex flex-col h-screen bg-[#1a1a2e] text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#16213e] border-b border-[#0f3460] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-[#e94560]">SS</span>
          <h1 className="text-sm font-bold">FEA / CFD Simulator</h1>
          <select value={analysis} onChange={e => setAnalysis(e.target.value)}
            className="bg-[#0f3460] text-xs rounded px-2 py-1 border border-[#0f3460]">
            {analysisTypes.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={runSolver} disabled={running}
            className={`px-4 py-1.5 rounded text-xs font-bold ${running ? "bg-yellow-600 animate-pulse" : "bg-green-600 hover:bg-green-500"}`}>
            {running ? `Solving... ${progress}%` : "\u25B6 Run Simulation"}
          </button>
          <button className="bg-[#0f3460] hover:bg-[#1a4a80] px-3 py-1 rounded text-xs">Import Geometry</button>
          <button className="bg-[#0f3460] hover:bg-[#1a4a80] px-3 py-1 rounded text-xs">\u2B07 Export Results</button>
        </div>
      </div>

      {/* Workflow Progress Bar */}
      <div className="flex items-center bg-[#0d1117] border-b border-[#0f3460] px-2 flex-shrink-0">
        {workflowSteps.map((s, i) => (
          <button key={s.id} onClick={() => setStep(s.id)}
            className={`flex items-center gap-1 px-3 py-2 text-xs border-b-2 transition-all ${
              step===s.id ? "border-[#e94560] text-white bg-[#16213e]" :
              i < stepIdx ? "border-green-500 text-green-400" :
              "border-transparent text-slate-500 hover:text-slate-300"
            }`}>
            <span>{i < stepIdx ? "\u2713" : s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
        {running && (
          <div className="ml-auto flex items-center gap-2 text-xs">
            <div className="w-32 bg-[#0f3460] rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full transition-all" style={{width:`${progress}%`}} />
            </div>
            <span className="text-green-400">{progress}%</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Step Controls */}
        <div className="w-72 bg-[#16213e] border-r border-[#0f3460] overflow-y-auto flex-shrink-0 p-3">
          {/* Step-specific controls */}
          {step==="geometry" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#e94560]">Geometry Setup</h3>
              <p className="text-[10px] text-slate-400">Import a CAD model or select from your designs.</p>
              <button className="w-full bg-[#0f3460] hover:bg-[#1a4a80] py-2 rounded text-xs">Import STEP/STL File</button>
              <button className="w-full bg-[#0f3460] hover:bg-[#1a4a80] py-2 rounded text-xs">Select from Designer</button>
              <div className="bg-[#0d1117] rounded p-2 text-[10px]">
                <div className="text-slate-400">Loaded: <span className="text-white">Bracket_v2.step</span></div>
                <div className="text-slate-400">Faces: <span className="text-white">24</span> | Edges: <span className="text-white">36</span></div>
                <div className="text-slate-400">Volume: <span className="text-white">48,000 mm\u00B3</span></div>
              </div>
              <button onClick={() => setStep("mesh")} className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold">Next: Meshing \u2192</button>
            </div>
          )}

          {step==="mesh" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#e94560]">Mesh Generation</h3>
              <p className="text-[10px] text-slate-400">Choose element type and control mesh density.</p>
              <label className="text-[10px] text-slate-400">Element Type</label>
              {meshTypes.map(m => (
                <label key={m.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs ${meshType===m.id ? "bg-[#0f3460] border border-[#e94560]" : "bg-[#0d1117] hover:bg-[#0f3460]"}`}>
                  <input type="radio" name="mesh" checked={meshType===m.id} onChange={() => setMeshType(m.id)} className="accent-[#e94560]" />
                  <div><div className="font-medium">{m.label}</div><div className="text-[10px] text-slate-500">{m.desc}</div></div>
                </label>
              ))}
              <label className="text-[10px] text-slate-400">Max Element Size (mm)</label>
              <input type="range" min="1" max="20" value={meshSize} onChange={e => setMeshSize(e.target.value)} className="w-full accent-[#e94560]" />
              <div className="text-xs text-center">{meshSize} mm</div>
              <label className="text-[10px] text-slate-400">Refinement Levels</label>
              <input type="range" min="0" max="5" value={meshRefine} onChange={e => setMeshRefine(e.target.value)} className="w-full accent-[#e94560]" />
              <div className="text-xs text-center">Level {meshRefine}</div>
              <div className="bg-[#0d1117] rounded p-2 text-[10px]">
                <div className="text-slate-400">Nodes: <span className="text-white">12,450</span></div>
                <div className="text-slate-400">Elements: <span className="text-white">68,230</span></div>
                <div className="text-slate-400">Quality: <span className="text-green-400">Good (0.87)</span></div>
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded text-xs font-bold">Generate Mesh</button>
              <button onClick={() => setStep("physics")} className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold">Next: Physics \u2192</button>
            </div>
          )}

          {step==="physics" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#e94560]">Boundary Conditions & Loads</h3>
              <p className="text-[10px] text-slate-400">Click faces in viewport, then assign conditions below.</p>
              {bcTypes.filter(b => analysis==="cfd" ? ["inlet","outlet","wall","symmetry"].includes(b.id) : !["inlet","outlet","wall"].includes(b.id)).map(b => (
                <label key={b.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs ${selectedBCs.includes(b.id) ? "bg-[#0f3460] border border-[#e94560]" : "bg-[#0d1117] hover:bg-[#0f3460]"}`}>
                  <input type="checkbox" checked={selectedBCs.includes(b.id)} onChange={() => toggleBC(b.id)} className="accent-[#e94560]" />
                  <div><div>{b.icon} {b.label}</div><div className="text-[10px] text-slate-500">{b.desc}</div></div>
                </label>
              ))}
              {analysis==="cfd" && (
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400">Turbulence Model</label>
                  <select value={turbModel} onChange={e => setTurbModel(e.target.value)} className="w-full bg-[#0d1117] text-xs rounded px-2 py-1.5 border border-[#0f3460]">
                    <option value="laminar">Laminar</option>
                    <option value="k-epsilon">k-epsilon</option>
                    <option value="k-omega">k-omega SST</option>
                    <option value="spalart">Spalart-Allmaras</option>
                    <option value="les">LES</option>
                  </select>
                  <label className="text-[10px] text-slate-400">Inlet Velocity (m/s)</label>
                  <input type="number" value={inletVel} onChange={e => setInletVel(e.target.value)} className="w-full bg-[#0d1117] text-xs rounded px-2 py-1.5 border border-[#0f3460]" />
                </div>
              )}
              <button onClick={() => setStep("material")} className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold">Next: Materials \u2192</button>
            </div>
          )}

          {step==="material" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#e94560]">Material Assignment</h3>
              <p className="text-[10px] text-slate-400">Select material for each body/region.</p>
              {materials.map(m => (
                <label key={m.id} className={`block p-2 rounded cursor-pointer text-xs ${selectedMat===m.id ? "bg-[#0f3460] border border-[#e94560]" : "bg-[#0d1117] hover:bg-[#0f3460]"}`}>
                  <input type="radio" name="mat" checked={selectedMat===m.id} onChange={() => setSelectedMat(m.id)} className="accent-[#e94560] mr-2" />
                  <span className="font-medium">{m.name}</span>
                  <div className="grid grid-cols-2 gap-1 mt-1 text-[10px] text-slate-500">
                    <span>E: {m.E}</span><span>\u03BD: {m.v}</span>
                    <span>\u03C1: {m.rho} kg/m\u00B3</span><span>k: {m.k} W/mK</span>
                  </div>
                </label>
              ))}
              <button className="w-full bg-[#0f3460] hover:bg-[#1a4a80] py-2 rounded text-xs">+ Custom Material</button>
              <button onClick={() => setStep("solver")} className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold">Next: Solver \u2192</button>
            </div>
          )}

          {step==="solver" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#e94560]">Solver Configuration</h3>
              <label className="text-[10px] text-slate-400">Solver Type</label>
              <select value={solver} onChange={e => setSolver(e.target.value)} className="w-full bg-[#0d1117] text-xs rounded px-2 py-1.5 border border-[#0f3460]">
                {solverTypes.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <label className="text-[10px] text-slate-400">Max Iterations</label>
              <input type="number" defaultValue="500" className="w-full bg-[#0d1117] text-xs rounded px-2 py-1.5 border border-[#0f3460]" />
              <label className="text-[10px] text-slate-400">Convergence Tolerance</label>
              <input type="text" defaultValue="1e-6" className="w-full bg-[#0d1117] text-xs rounded px-2 py-1.5 border border-[#0f3460]" />
              <label className="text-[10px] text-slate-400">Time Step (transient)</label>
              <input type="text" defaultValue="0.01" className="w-full bg-[#0d1117] text-xs rounded px-2 py-1.5 border border-[#0f3460]" />
              <div className="bg-[#0d1117] rounded p-2 text-[10px] text-slate-400">
                <div>Analysis: <span className="text-white capitalize">{analysis}</span></div>
                <div>Material: <span className="text-white">{mat?.name}</span></div>
                <div>BCs: <span className="text-white">{selectedBCs.length} applied</span></div>
                <div>Mesh: <span className="text-white">68,230 elements</span></div>
              </div>
              <button onClick={runSolver} disabled={running} className={`w-full py-2 rounded text-xs font-bold ${running ? "bg-yellow-600 animate-pulse" : "bg-green-600 hover:bg-green-500"}`}>
                {running ? `Solving... ${progress}%` : "\u25B6 Run Simulation"}
              </button>
            </div>
          )}

          {step==="results" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#e94560]">Post-Processing</h3>
              {converged && <div className="bg-green-900/30 border border-green-600 rounded p-2 text-[10px] text-green-400">\u2713 Solution converged in 342 iterations</div>}
              <label className="text-[10px] text-slate-400">Result Field</label>
              {resultTypes.map(r => (
                <label key={r.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs ${resultView===r.id ? "bg-[#0f3460] border border-[#e94560]" : "bg-[#0d1117] hover:bg-[#0f3460]"}`}>
                  <input type="radio" name="result" checked={resultView===r.id} onChange={() => setResultView(r.id)} className="accent-[#e94560]" />
                  <span>{r.label} ({r.unit})</span>
                </label>
              ))}
              <div className="bg-[#0d1117] rounded p-2 text-[10px]">
                <div className="text-slate-400">Max Stress: <span className="text-red-400">245.6 MPa</span></div>
                <div className="text-slate-400">Max Displacement: <span className="text-yellow-400">0.032 mm</span></div>
                <div className="text-slate-400">Safety Factor: <span className="text-green-400">2.85</span></div>
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded text-xs font-bold">\u2B07 Export Report (PDF)</button>
              <button className="w-full bg-[#0f3460] hover:bg-[#1a4a80] py-2 rounded text-xs">\u2B07 Export VTK Data</button>
            </div>
          )}
        </div>

        {/* CENTER - Simulation Viewport */}
        <div className="flex-1 flex flex-col bg-[#1a1a2e] relative">
          <div className="flex-1 flex items-center justify-center relative">
            {/* Grid bg */}
            <div className="absolute inset-0 opacity-5" style={{backgroundImage:"linear-gradient(rgba(255,255,255,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.15) 1px,transparent 1px)",backgroundSize:"30px 30px"}} />
            <div className="text-center z-10">
              {step==="results" && converged ? (
                <div>
                  <div className="w-64 h-48 mx-auto rounded-lg relative overflow-hidden mb-3" style={{background:"linear-gradient(135deg,#1a3a8a,#e94560,#f59e0b)"}}>
                    <div className="absolute inset-0 flex items-center justify-center text-white/80">
                      <svg viewBox="0 0 120 80" className="w-48 h-32">
                        <rect x="10" y="10" width="60" height="40" rx="3" fill="none" stroke="white" strokeWidth="1.5" opacity="0.6" />
                        <rect x="25" y="20" width="30" height="20" rx="2" fill="rgba(233,69,96,0.4)" stroke="white" strokeWidth="1" />
                        <text x="80" y="15" fontSize="6" fill="white" opacity="0.8">Max: 245.6</text>
                        <text x="80" y="25" fontSize="6" fill="white" opacity="0.8">Min: 0.0</text>
                        <rect x="100" y="10" width="10" height="60" rx="1" fill="url(#grad)" />
                        <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="red" /><stop offset="50%" stopColor="yellow" /><stop offset="100%" stopColor="blue" /></linearGradient></defs>
                      </svg>
                    </div>
                  </div>
                  <div className="text-slate-300 text-sm">Von Mises Stress Contour</div>
                  <div className="text-slate-500 text-xs">Range: 0.0 - 245.6 MPa</div>
                </div>
              ) : (
                <div>
                  <div className="w-48 h-48 mx-auto mb-4 border-2 border-dashed border-slate-600 rounded-xl flex items-center justify-center">
                    <div className="text-4xl text-slate-600">{step==="mesh" ? "\u25A6" : step==="physics" ? "\u2699" : step==="solver" && running ? "\u23F3" : "\u25A1"}</div>
                  </div>
                  <div className="text-slate-400 text-sm">{step==="geometry" ? "Import geometry to begin" : step==="mesh" ? "Mesh preview will appear here" : step==="physics" ? "Select faces to apply BCs" : running ? "Solver running..." : "Configure solver and run"}</div>
                  <div className="text-slate-600 text-xs mt-1">OpenFOAM + CalculiX Backend</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-4 px-4 py-1 bg-[#0d1117] border-t border-[#0f3460] text-[10px] text-slate-500 flex-shrink-0">
        <span>Analysis: <span className="text-white capitalize">{analysis}</span></span>
        <span>Step: <span className="text-[#e94560] capitalize">{step}</span></span>
        <span>Mesh: {meshType}</span>
        <span>Material: {mat?.name}</span>
        <span className="ml-auto">Solver: {solver} | BCs: {selectedBCs.length}</span>
        <span>Engine: OpenFOAM + CalculiX</span>
      </div>
    </div>
  );
}
