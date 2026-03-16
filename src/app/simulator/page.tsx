"use client";
import { useState } from "react";

const workflowSteps = [
  { id: "geometry", label: "1. Geometry", icon: "□", desc: "Import or select CAD model" },
  { id: "mesh", label: "2. Meshing", icon: "▦", desc: "Generate finite element mesh" },
  { id: "physics", label: "3. Physics", icon: "⚙", desc: "Set boundary conditions & loads" },
  { id: "material", label: "4. Materials", icon: "◉", desc: "Assign material properties" },
  { id: "solver", label: "5. Solver", icon: "▶", desc: "Configure and run solver" },
  { id: "results", label: "6. Results", icon: "☆", desc: "Visualize & post-process" },
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
  { id: "fixed", label: "Fixed Support", icon: "■", desc: "Zero displacement on face" },
  { id: "force", label: "Applied Force", icon: "→", desc: "Point or distributed force" },
  { id: "pressure", label: "Pressure", icon: "▽", desc: "Uniform pressure on face" },
  { id: "displacement", label: "Displacement", icon: "⇆", desc: "Prescribed displacement" },
  { id: "temperature", label: "Temperature", icon: "♨", desc: "Fixed temperature BC" },
  { id: "convection", label: "Convection", icon: "∿", desc: "Heat convection on surface" },
  { id: "inlet", label: "Inlet (CFD)", icon: "→", desc: "Flow inlet velocity" },
  { id: "outlet", label: "Outlet (CFD)", icon: "←", desc: "Pressure outlet" },
  { id: "wall", label: "Wall (CFD)", icon: "█", desc: "No-slip wall condition" },
  { id: "symmetry", label: "Symmetry", icon: "∥", desc: "Symmetry plane" },
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
  const [selectedBCs, setSelectedBCs] = useState(["fixed","force"]);
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
    <div className="flex flex-col h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#0f3460]">
        <div className="flex items-center gap-3">
          <span className="bg-[#e94560] text-white font-bold px-2 py-1 rounded text-xs">SS</span>
          <h1 className="text-sm font-bold">FEA / CFD Simulator</h1>
          <select value={analysis} onChange={e => setAnalysis(e.target.value)} className="bg-[#0f3460] text-xs rounded px-2 py-1 border border-[#0f3460]">
            {analysisTypes.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runSolver} className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1">
            {running ? `Solving... ${progress}%` : "▶ Run Simulation"}
          </button>
          <button className="bg-[#0f3460] hover:bg-[#16213e] px-3 py-1.5 rounded text-xs">Import Geometry</button>
          <button className="bg-[#0f3460] hover:bg-[#16213e] px-3 py-1.5 rounded text-xs">⬇ Export Results</button>
        </div>
      </div>

      {/* Workflow Progress Bar */}
      <div className="flex items-center bg-[#161b22] border-b border-[#0f3460] overflow-x-auto">
        {workflowSteps.map((s, i) => (
          <button key={s.id} onClick={() => setStep(s.id)} className={`flex items-center gap-1 px-3 py-2 text-xs border-b-2 transition-all ${
            step===s.id ? "border-[#e94560] text-white bg-[#16213e]" : i < stepIdx ? "border-green-500 text-green-400" : "border-transparent text-slate-500 hover:text-slate-300"
          }`}>
            <span>{i < stepIdx ? "✓" : s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
        {running && (
          <div className="flex-1 mx-4">
            <div className="h-1 bg-[#0f3460] rounded"><div className="h-1 bg-green-500 rounded transition-all" style={{width:`${progress}%`}} /></div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Step Controls */}
        <div className="w-80 bg-[#161b22] border-r border-[#0f3460] overflow-y-auto p-4 space-y-4">
          {/* Step-specific controls */}
          {step==="geometry" && (
            <div className="space-y-3">
              <h3 className="text-[#e94560] font-bold text-sm">Geometry Setup</h3>
              <p className="text-slate-400 text-xs">Import a CAD model or select from your designs.</p>
              <button className="w-full bg-[#0f3460] hover:bg-[#16213e] py-2 rounded text-xs">Import STEP/STL File</button>
              <button className="w-full bg-[#0f3460] hover:bg-[#16213e] py-2 rounded text-xs">Select from Designer</button>
              <div className="bg-[#0d1117] rounded p-3 text-xs space-y-1 border border-[#0f3460]">
                <div>Loaded: <span className="text-white font-bold">Bracket_v2.step</span></div>
                <div>Faces: <span className="text-green-400">24</span> | Edges: <span className="text-green-400">36</span></div>
                <div>Volume: <span className="text-green-400">48,000 mm³</span></div>
              </div>
              <button onClick={() => setStep("mesh")} className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold">Next: Meshing →</button>
            </div>
          )}
          {step==="mesh" && (
            <div className="space-y-3">
              <h3 className="text-[#e94560] font-bold text-sm">Mesh Generation</h3>
              <p className="text-slate-400 text-xs">Choose element type and control mesh density.</p>
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Element Type</label>
                {meshTypes.map(m => (
                  <label key={m.id} className="flex items-start gap-2 bg-[#0d1117] p-2 rounded border border-[#0f3460] cursor-pointer">
                    <input type="radio" name="mesh" checked={meshType===m.id} onChange={() => setMeshType(m.id)} className="accent-[#e94560]" />
                    <div>
                      <div className="text-xs font-bold">{m.label}</div>
                      <div className="text-[10px] text-slate-500">{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Max Element Size (mm)</label>
                <input type="range" min="1" max="20" value={meshSize} onChange={e => setMeshSize(e.target.value)} className="w-full accent-[#e94560]" />
                <div className="text-xs text-right text-green-400">{meshSize} mm</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Refinement Levels</label>
                <input type="range" min="0" max="5" value={meshRefine} onChange={e => setMeshRefine(e.target.value)} className="w-full accent-[#e94560]" />
                <div className="text-xs text-right text-green-400">Level {meshRefine}</div>
              </div>
              <div className="bg-[#0d1117] rounded p-3 text-xs space-y-1 border border-[#0f3460]">
                <div>Nodes: <span className="text-green-400">12,450</span></div>
                <div>Elements: <span className="text-green-400">68,230</span></div>
                <div>Quality: <span className="text-green-400">Good (0.87)</span></div>
              </div>
              <button className="w-full bg-[#0f3460] hover:bg-[#16213e] py-2 rounded text-xs">Generate Mesh</button>
              <button onClick={() => setStep("physics")} className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold">Next: Physics →</button>
            </div>
          )}
          {step==="physics" && (
            <div className="space-y-3">
              <h3 className="text-[#e94560] font-bold text-sm">Boundary Conditions & Loads</h3>
              <p className="text-slate-400 text-xs">Click faces in viewport, then assign conditions below.</p>
              {bcTypes.filter(b => analysis==="cfd" ? ["inlet","outlet","wall","symmetry"].includes(b.id) : !["inlet","outlet","wall"].includes(b.id)).map(b => (
                <label key={b.id} className="flex items-start gap-2 bg-[#0d1117] p-2 rounded border border-[#0f3460] cursor-pointer">
                  <input type="checkbox" checked={selectedBCs.includes(b.id)} onChange={() => toggleBC(b.id)} className="accent-[#e94560]" />
                  <div>
                    <div className="text-xs font-bold">{b.icon} {b.label}</div>
                    <div className="text-[10px] text-slate-500">{b.desc}</div>
                  </div>
                </label>
              ))}
              {analysis==="cfd" && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Turbulence Model</label>
                    <select value={turbModel} onChange={e => setTurbModel(e.target.value)} className="w-full bg-[#0d1117] text-xs rounded px-2 py-1.5 border border-[#0f3460]">
                      <option value="laminar">Laminar</option>
                      <option value="k-epsilon">k-epsilon</option>
                      <option value="k-omega">k-omega SST</option>
                      <option value="spalart">Spalart-Allmaras</option>
                      <option value="les">LES</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Inlet Velocity (m/s)</label>
                    <input type="number" value={inletVel} onChange={e => setInletVel(e.target.value)} className="w-full bg-[#0d1117] text-xs rounded px-2 py-1.5 border border-[#0f3460]" />
                  </div>
                </div>
              )}
              <button onClick={() => setStep("material")} className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold">Next: Materials →</button>
            </div>
          )}
          {step==="material" && (
            <div className="space-y-3">
              <h3 className="text-[#e94560] font-bold text-sm">Material Assignment</h3>
              <p className="text-slate-400 text-xs">Select material for each body/region.</p>
              {materials.map(m => (
                <label key={m.id} className="flex items-start gap-2 bg-[#0d1117] p-2 rounded border border-[#0f3460] cursor-pointer">
                  <input type="radio" name="mat" checked={selectedMat===m.id} onChange={() => setSelectedMat(m.id)} className="accent-[#e94560] mr-2" />
                  <div>
                    <div className="text-xs font-bold">{m.name}</div>
                    <div className="text-[10px] text-slate-500">E: {m.E} | ν: {m.v} | ρ: {m.rho} kg/m³ | k: {m.k} W/mK</div>
                  </div>
                </label>
              ))}
              <button className="w-full bg-[#0f3460] hover:bg-[#16213e] py-2 rounded text-xs">+ Custom Material</button>
              <button onClick={() => setStep("solver")} className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold">Next: Solver →</button>
            </div>
          )}
          {step==="solver" && (
            <div className="space-y-3">
              <h3 className="text-[#e94560] font-bold text-sm">Solver Configuration</h3>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Solver Type</label>
                <select value={solver} onChange={e => setSolver(e.target.value)} className="w-full bg-[#0d1117] text-xs rounded px-2 py-1.5 border border-[#0f3460]">
                  {solverTypes.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Max Iterations</label>
                <input type="number" defaultValue="500" className="w-full bg-[#0d1117] text-xs rounded px-2 py-1.5 border border-[#0f3460]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Convergence Tolerance</label>
                <input type="text" defaultValue="1e-6" className="w-full bg-[#0d1117] text-xs rounded px-2 py-1.5 border border-[#0f3460]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Time Step (transient)</label>
                <input type="text" defaultValue="0.01" className="w-full bg-[#0d1117] text-xs rounded px-2 py-1.5 border border-[#0f3460]" />
              </div>
              <div className="bg-[#0d1117] rounded p-3 text-xs space-y-1 border border-[#0f3460]">
                <div>Analysis: <span className="text-green-400">{analysis}</span></div>
                <div>Material: <span className="text-green-400">{mat?.name}</span></div>
                <div>BCs: <span className="text-green-400">{selectedBCs.length} applied</span></div>
                <div>Mesh: <span className="text-green-400">68,230 elements</span></div>
              </div>
              <button onClick={runSolver} className="w-full bg-green-600 hover:bg-green-700 py-2 rounded text-xs font-bold">
                {running ? `Solving... ${progress}%` : "▶ Run Simulation"}
              </button>
            </div>
          )}
          {step==="results" && (
            <div className="space-y-3">
              <h3 className="text-[#e94560] font-bold text-sm">Post-Processing</h3>
              {converged && <div className="bg-green-900/30 border border-green-600 rounded p-2 text-xs text-green-400">✓ Solution converged in 342 iterations</div>}
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Result Field</label>
                {resultTypes.map(r => (
                  <label key={r.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="radio" name="result" checked={resultView===r.id} onChange={() => setResultView(r.id)} className="accent-[#e94560]" />
                    <span>{r.label} ({r.unit})</span>
                  </label>
                ))}
              </div>
              <div className="bg-[#0d1117] rounded p-3 text-xs space-y-1 border border-[#0f3460]">
                <div>Max Stress: <span className="text-red-400">245.6 MPa</span></div>
                <div>Max Displacement: <span className="text-yellow-400">0.032 mm</span></div>
                <div>Safety Factor: <span className="text-green-400">2.85</span></div>
              </div>
              <button className="w-full bg-[#0f3460] hover:bg-[#16213e] py-2 rounded text-xs">⬇ Export Report (PDF)</button>
              <button className="w-full bg-[#0f3460] hover:bg-[#16213e] py-2 rounded text-xs">⬇ Export VTK Data</button>
            </div>
          )}
        </div>

        {/* CENTER - Simulation Viewport */}
        <div className="flex-1 relative bg-[#0d1117] flex items-center justify-center">
          {/* Grid bg */}
          <div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle, #333 1px, transparent 1px)",backgroundSize:"20px 20px"}} />
          {step==="results" && converged ? (
            <div className="relative z-10 text-center">
              <div className="w-64 h-48 mx-auto rounded border border-[#0f3460] relative overflow-hidden" style={{background:"linear-gradient(135deg, #00f 0%, #0ff 25%, #0f0 50%, #ff0 75%, #f00 100%)"}}>
                <div className="absolute top-2 right-2 text-[10px] bg-black/50 px-1 rounded">Max: 245.6</div>
                <div className="absolute bottom-2 left-2 text-[10px] bg-black/50 px-1 rounded">Min: 0.0</div>
              </div>
              <div className="text-xs text-slate-400 mt-2">Von Mises Stress Contour</div>
              <div className="text-[10px] text-slate-500">Range: 0.0 - 245.6 MPa</div>
            </div>
          ) : (
            <div className="relative z-10 text-center">
              <div className="w-32 h-32 mx-auto border-2 border-dashed border-slate-600 rounded flex items-center justify-center text-4xl text-slate-600">
                {step==="mesh" ? "▦" : step==="physics" ? "⚙" : step==="solver" && running ? "⏳" : "□"}
              </div>
              <div className="text-sm text-slate-500 mt-4">
                {step==="geometry" ? "Import geometry to begin" : step==="mesh" ? "Mesh preview will appear here" : step==="physics" ? "Select faces to apply BCs" : running ? "Solver running..." : "Configure solver and run"}
              </div>
              <div className="text-xs text-slate-600 mt-1">OpenFOAM + CalculiX Backend</div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#161b22] border-t border-[#0f3460] text-[10px] text-slate-500">
        <div className="flex items-center gap-4">
          <span>Analysis: <span className="text-white font-bold">{analysis}</span></span>
          <span>Step: <span className="text-green-400">{step}</span></span>
          <span>Mesh: {meshType}</span>
          <span>Material: {mat?.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Solver: {solver} | BCs: {selectedBCs.length}</span>
          <span>Engine: OpenFOAM + CalculiX</span>
        </div>
      </div>
    </div>
  );
}
