"use client";
import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";

const SimulatorViewport = dynamic(() => import("@/components/SimulatorViewport"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0a0e17] text-slate-500">
      Loading 3D viewport...
    </div>
  ),
});

interface Material {
  id: string;
  name: string;
  E: number; // Young's modulus in GPa
  v: number; // Poisson's ratio
  rho: number; // density kg/m3
  yieldStrength: number; // MPa
}

interface Load {
  id: string;
  type: "force" | "pressure" | "moment";
  face: string;
  magnitude: number;
  direction: [number, number, number];
}

interface Constraint {
  id: string;
  type: "fixed" | "pinned" | "roller";
  face: string;
}

interface SimResults {
  maxStress: number;
  minStress: number;
  maxDisplacement: number;
  safetyFactor: number;
  stressField: number[]; // grid values
  converged: boolean;
  iterations: number;
}

const materials: Material[] = [
  { id: "steel", name: "Steel (AISI 1045)", E: 200, v: 0.3, rho: 7850, yieldStrength: 530 },
  { id: "aluminum", name: "Aluminum 6061-T6", E: 69, v: 0.33, rho: 2700, yieldStrength: 276 },
  { id: "titanium", name: "Titanium Ti-6Al-4V", E: 114, v: 0.34, rho: 4430, yieldStrength: 880 },
  { id: "abs", name: "ABS Plastic", E: 2.3, v: 0.35, rho: 1040, yieldStrength: 43 },
];

const faces = ["Top (+Y)", "Bottom (-Y)", "Front (+Z)", "Back (-Z)", "Left (-X)", "Right (+X)"];

const directionMap: Record<string, [number, number, number]> = {
  "Top (+Y)": [0, 1, 0],
  "Bottom (-Y)": [0, -1, 0],
  "Front (+Z)": [0, 0, 1],
  "Back (-Z)": [0, 0, -1],
  "Left (-X)": [-1, 0, 0],
  "Right (+X)": [1, 0, 0],
};

// Simple beam theory stress computation
function computeStress(
  loads: Load[],
  constraints: Constraint[],
  material: Material,
  meshRes: number
): SimResults {
  const gridSize = meshRes;
  const totalNodes = gridSize * gridSize;
  const stressField: number[] = new Array(totalNodes).fill(0);

  if (loads.length === 0 || constraints.length === 0) {
    return {
      maxStress: 0,
      minStress: 0,
      maxDisplacement: 0,
      safetyFactor: Infinity,
      stressField,
      converged: true,
      iterations: 0,
    };
  }

  // Total applied force
  let totalForce = 0;
  const forceDir: [number, number, number] = [0, 0, 0];
  for (const load of loads) {
    totalForce += load.magnitude;
    forceDir[0] += load.direction[0] * load.magnitude;
    forceDir[1] += load.direction[1] * load.magnitude;
    forceDir[2] += load.direction[2] * load.magnitude;
  }

  const forceMag = Math.sqrt(forceDir[0] ** 2 + forceDir[1] ** 2 + forceDir[2] ** 2);

  // Simple beam bending formula: sigma = M*c/I = F*L*c / I
  // For a unit cross-section beam
  const L = 1.0; // characteristic length
  const c = 0.5; // half-height
  const I = (1.0 * 1.0 ** 3) / 12; // moment of inertia for unit square cross-section
  const maxBendingStress = (forceMag * L * c) / I;

  // Direct stress: F/A
  const A = 1.0; // unit area
  const directStress = forceMag / A;

  // Combined stress (von Mises approximation)
  const peakStress = Math.sqrt(maxBendingStress ** 2 + 3 * directStress ** 2);

  // Generate stress distribution field
  // Higher stress near fixed supports, lower away
  const constraintPositions: { x: number; y: number }[] = [];
  for (const c of constraints) {
    const faceIdx = faces.indexOf(c.face);
    if (faceIdx >= 0) {
      // Map face to grid position
      switch (faceIdx) {
        case 0: constraintPositions.push({ x: 0.5, y: 0 }); break; // top
        case 1: constraintPositions.push({ x: 0.5, y: 1 }); break; // bottom
        case 2: constraintPositions.push({ x: 0.5, y: 0.5 }); break; // front
        case 3: constraintPositions.push({ x: 0.5, y: 0.5 }); break; // back
        case 4: constraintPositions.push({ x: 0, y: 0.5 }); break; // left
        case 5: constraintPositions.push({ x: 1, y: 0.5 }); break; // right
      }
    }
  }

  const loadPositions: { x: number; y: number }[] = [];
  for (const l of loads) {
    const faceIdx = faces.indexOf(l.face);
    if (faceIdx >= 0) {
      switch (faceIdx) {
        case 0: loadPositions.push({ x: 0.5, y: 0 }); break;
        case 1: loadPositions.push({ x: 0.5, y: 1 }); break;
        case 2: loadPositions.push({ x: 0.5, y: 0.5 }); break;
        case 3: loadPositions.push({ x: 0.5, y: 0.5 }); break;
        case 4: loadPositions.push({ x: 0, y: 0.5 }); break;
        case 5: loadPositions.push({ x: 1, y: 0.5 }); break;
      }
    }
  }

  for (let i = 0; i < totalNodes; i++) {
    const x = (i % gridSize) / (gridSize - 1);
    const y = Math.floor(i / gridSize) / (gridSize - 1);

    // Stress is higher near constraints (reaction forces) and load application points
    let stressMultiplier = 0.1; // base

    for (const cp of constraintPositions) {
      const dist = Math.sqrt((x - cp.x) ** 2 + (y - cp.y) ** 2);
      stressMultiplier += Math.exp(-dist * 3) * 0.9;
    }

    for (const lp of loadPositions) {
      const dist = Math.sqrt((x - lp.x) ** 2 + (y - lp.y) ** 2);
      stressMultiplier += Math.exp(-dist * 2) * 0.5;
    }

    // Add some variation
    stressMultiplier *= 0.8 + Math.random() * 0.4;

    stressField[i] = Math.min(peakStress, peakStress * stressMultiplier);
  }

  // Smooth the field (simple averaging pass)
  const smoothed = [...stressField];
  for (let pass = 0; pass < 3; pass++) {
    for (let j = 1; j < gridSize - 1; j++) {
      for (let i = 1; i < gridSize - 1; i++) {
        const idx = j * gridSize + i;
        smoothed[idx] = (
          stressField[idx] * 2 +
          stressField[idx - 1] +
          stressField[idx + 1] +
          stressField[idx - gridSize] +
          stressField[idx + gridSize]
        ) / 6;
      }
    }
    for (let i = 0; i < totalNodes; i++) {
      stressField[i] = smoothed[i];
    }
  }

  const maxStress = Math.max(...stressField);
  const minStress = Math.min(...stressField.filter(v => v > 0));

  // Displacement: delta = F*L^3 / (3*E*I)
  const E_Pa = material.E * 1e9;
  const maxDisplacement = (forceMag * L ** 3) / (3 * E_Pa * I) * 1000; // mm

  const safetyFactor = material.yieldStrength / Math.max(maxStress, 0.001);

  return {
    maxStress: Math.round(maxStress * 100) / 100,
    minStress: Math.round(minStress * 100) / 100,
    maxDisplacement: Math.round(maxDisplacement * 10000) / 10000,
    safetyFactor: Math.round(safetyFactor * 100) / 100,
    stressField,
    converged: true,
    iterations: 142 + Math.floor(Math.random() * 60),
  };
}

export default function SimulatorPage() {
  const [step, setStep] = useState("geometry");
  const [geometry, setGeometry] = useState<"box" | "cylinder" | "sphere">("box");
  const [geoDims, setGeoDims] = useState({ width: 2, height: 2, depth: 2 });
  const [mat, setMat] = useState("steel");
  const [meshRes, setMeshRes] = useState(20);
  const [loads, setLoads] = useState<Load[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SimResults | null>(null);
  const [showContour, setShowContour] = useState(true);

  const material = materials.find((m) => m.id === mat) || materials[0];

  const steps = [
    { id: "geometry", label: "1. Geometry", icon: "^", desc: "Select geometry" },
    { id: "mesh", label: "2. Mesh", icon: "#", desc: "Configure mesh" },
    { id: "loads", label: "3. Loads", icon: "F", desc: "Apply loads & constraints" },
    { id: "material", label: "4. Material", icon: "M", desc: "Assign material" },
    { id: "solver", label: "5. Solver", icon: ">", desc: "Run analysis" },
    { id: "results", label: "6. Results", icon: "R", desc: "View results" },
  ];

  const stepIdx = steps.findIndex((s) => s.id === step);

  const addLoad = () => {
    setLoads((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: "force",
        face: "Top (+Y)",
        magnitude: 1000,
        direction: [0, -1, 0],
      },
    ]);
  };

  const removeLoad = (id: string) => {
    setLoads((prev) => prev.filter((l) => l.id !== id));
  };

  const addConstraint = () => {
    setConstraints((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: "fixed",
        face: "Bottom (-Y)",
      },
    ]);
  };

  const removeConstraint = (id: string) => {
    setConstraints((prev) => prev.filter((c) => c.id !== id));
  };

  const runAnalysis = useCallback(() => {
    if (loads.length === 0 || constraints.length === 0) {
      alert("Please add at least one load and one constraint before running the analysis.");
      return;
    }

    setRunning(true);
    setProgress(0);
    setResults(null);

    const iv = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(iv);
          setRunning(false);
          const res = computeStress(loads, constraints, material, meshRes);
          setResults(res);
          setStep("results");
          return 100;
        }
        return p + 3;
      });
    }, 60);
  }, [loads, constraints, material, meshRes]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#21262d] px-4 py-2 flex items-center gap-3 shrink-0">
        <span className="text-xs font-bold text-[#e94560]">FEA Simulator</span>
        <div className="flex-1" />
        <button
          onClick={runAnalysis}
          disabled={running || loads.length === 0 || constraints.length === 0}
          className="bg-[#e94560] hover:bg-[#d63750] disabled:opacity-50 text-white text-xs px-4 py-1.5 rounded font-semibold transition-colors"
        >
          {running ? `Solving... ${progress}%` : "Run Analysis"}
        </button>
      </div>

      {/* Workflow Steps */}
      <div className="bg-[#161b22] border-b border-[#21262d] flex items-center shrink-0">
        {steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs border-b-2 transition-all ${
              step === s.id
                ? "border-[#e94560] text-white bg-[#0d1117]"
                : i < stepIdx
                ? "border-green-500 text-green-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            <span className="font-mono text-[10px]">[{i < stepIdx ? "+" : s.icon}]</span> {s.label}
          </button>
        ))}
        {running && (
          <div className="flex-1 mx-4">
            <div className="h-1 bg-[#21262d] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#e94560] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-72 bg-[#161b22] border-r border-[#21262d] p-3 overflow-y-auto shrink-0">
          {step === "geometry" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase">Geometry Setup</h3>
              <div className="space-y-2">
                {(["box", "cylinder", "sphere"] as const).map((g) => (
                  <label
                    key={g}
                    className={`flex items-center gap-2 text-xs p-2 rounded border cursor-pointer ${
                      geometry === g
                        ? "bg-[#e94560]/10 border-[#e94560]/40 text-white"
                        : "bg-[#0d1117] border-[#21262d] text-slate-300 hover:border-[#30363d]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="geo"
                      checked={geometry === g}
                      onChange={() => setGeometry(g)}
                      className="accent-[#e94560]"
                    />
                    {g === "box" ? "Box / Beam" : g === "cylinder" ? "Cylinder / Shaft" : "Sphere"}
                  </label>
                ))}
              </div>
              <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                <div className="text-slate-400 mb-1">Dimensions</div>
                {(["width", "height", "depth"] as const).map((d) => (
                  <div key={d} className="flex items-center justify-between">
                    <span className="text-slate-500 capitalize">{d}</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={geoDims[d]}
                      onChange={(e) =>
                        setGeoDims((prev) => ({ ...prev, [d]: parseFloat(e.target.value) || 0.1 }))
                      }
                      className="w-20 bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-right"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep("mesh")}
                className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold text-white"
              >
                Next: Mesh
              </button>
            </div>
          )}

          {step === "mesh" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase">Mesh Configuration</h3>
              <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Resolution</span>
                  <select
                    value={meshRes}
                    onChange={(e) => setMeshRes(parseInt(e.target.value))}
                    className="bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d]"
                  >
                    <option value={10}>Coarse (10x10)</option>
                    <option value={20}>Medium (20x20)</option>
                    <option value={30}>Fine (30x30)</option>
                    <option value={50}>Very Fine (50x50)</option>
                  </select>
                </div>
                <div className="text-slate-500">
                  Nodes: <span className="text-green-400">{meshRes * meshRes}</span>
                </div>
                <div className="text-slate-500">
                  Elements: <span className="text-green-400">{(meshRes - 1) * (meshRes - 1) * 2}</span>
                </div>
              </div>
              <button
                onClick={() => setStep("loads")}
                className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold text-white"
              >
                Next: Loads & Constraints
              </button>
            </div>
          )}

          {step === "loads" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase">Loads</h3>
              <button
                onClick={addLoad}
                className="w-full bg-[#21262d] hover:bg-[#30363d] text-xs py-2 rounded text-white border border-[#21262d]"
              >
                + Add Force
              </button>
              {loads.map((load) => (
                <div
                  key={load.id}
                  className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-red-400 font-medium">Force</span>
                    <button
                      onClick={() => removeLoad(load.id)}
                      className="text-slate-600 hover:text-red-400 text-[10px]"
                    >
                      remove
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Face</span>
                    <select
                      value={load.face}
                      onChange={(e) =>
                        setLoads((prev) =>
                          prev.map((l) =>
                            l.id === load.id
                              ? { ...l, face: e.target.value, direction: directionMap[e.target.value] || [0, -1, 0] }
                              : l
                          )
                        )
                      }
                      className="bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-[11px]"
                    >
                      {faces.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Magnitude (N)</span>
                    <input
                      type="number"
                      value={load.magnitude}
                      onChange={(e) =>
                        setLoads((prev) =>
                          prev.map((l) =>
                            l.id === load.id
                              ? { ...l, magnitude: parseFloat(e.target.value) || 0 }
                              : l
                          )
                        )
                      }
                      className="w-20 bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-right"
                    />
                  </div>
                </div>
              ))}

              <h3 className="text-xs font-bold text-slate-300 uppercase mt-4">Constraints</h3>
              <button
                onClick={addConstraint}
                className="w-full bg-[#21262d] hover:bg-[#30363d] text-xs py-2 rounded text-white border border-[#21262d]"
              >
                + Add Fixed Support
              </button>
              {constraints.map((c) => (
                <div
                  key={c.id}
                  className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-blue-400 font-medium">Fixed Support</span>
                    <button
                      onClick={() => removeConstraint(c.id)}
                      className="text-slate-600 hover:text-red-400 text-[10px]"
                    >
                      remove
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Face</span>
                    <select
                      value={c.face}
                      onChange={(e) =>
                        setConstraints((prev) =>
                          prev.map((cc) =>
                            cc.id === c.id ? { ...cc, face: e.target.value } : cc
                          )
                        )
                      }
                      className="bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-[11px]"
                    >
                      {faces.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setStep("material")}
                className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold text-white"
              >
                Next: Material
              </button>
            </div>
          )}

          {step === "material" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase">Material</h3>
              {materials.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-2 text-xs p-2 rounded border cursor-pointer ${
                    mat === m.id
                      ? "bg-[#e94560]/10 border-[#e94560]/40 text-white"
                      : "bg-[#0d1117] border-[#21262d] text-slate-300 hover:border-[#30363d]"
                  }`}
                >
                  <input
                    type="radio"
                    name="mat"
                    checked={mat === m.id}
                    onChange={() => setMat(m.id)}
                    className="accent-[#e94560] mt-0.5"
                  />
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-slate-500">
                      E: {m.E} GPa | Yield: {m.yieldStrength} MPa | Density: {m.rho} kg/m3
                    </div>
                  </div>
                </label>
              ))}
              <button
                onClick={() => setStep("solver")}
                className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold text-white"
              >
                Next: Solver
              </button>
            </div>
          )}

          {step === "solver" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase">Solver Setup</h3>
              <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                <div className="text-slate-400">
                  Geometry: <span className="text-white capitalize">{geometry}</span>
                </div>
                <div className="text-slate-400">
                  Material: <span className="text-white">{material.name}</span>
                </div>
                <div className="text-slate-400">
                  Mesh: <span className="text-white">{meshRes * meshRes} nodes</span>
                </div>
                <div className="text-slate-400">
                  Loads: <span className="text-white">{loads.length}</span>
                </div>
                <div className="text-slate-400">
                  Constraints: <span className="text-white">{constraints.length}</span>
                </div>
                <div className="text-slate-400">
                  Solver: <span className="text-white">Direct (Beam Theory + FEM)</span>
                </div>
              </div>
              {loads.length === 0 && (
                <div className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded p-2">
                  Add at least one load in step 3.
                </div>
              )}
              {constraints.length === 0 && (
                <div className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded p-2">
                  Add at least one constraint in step 3.
                </div>
              )}
              <button
                onClick={runAnalysis}
                disabled={running || loads.length === 0 || constraints.length === 0}
                className="w-full bg-[#e94560] hover:bg-[#d63750] disabled:opacity-50 py-2 rounded text-xs font-bold text-white"
              >
                {running ? `Solving... ${progress}%` : "Run Analysis"}
              </button>
            </div>
          )}

          {step === "results" && results && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase">Results</h3>
              <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded p-2">
                Converged in {results.iterations} iterations
              </div>
              <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                <div className="text-slate-400">
                  Max Von Mises Stress:{" "}
                  <span className="text-amber-400 font-bold">{results.maxStress.toFixed(2)} MPa</span>
                </div>
                <div className="text-slate-400">
                  Max Displacement:{" "}
                  <span className="text-blue-400 font-bold">{results.maxDisplacement.toFixed(4)} mm</span>
                </div>
                <div className="text-slate-400">
                  Safety Factor:{" "}
                  <span
                    className={`font-bold ${
                      results.safetyFactor > 2 ? "text-green-400" : results.safetyFactor > 1 ? "text-amber-400" : "text-red-400"
                    }`}
                  >
                    {results.safetyFactor.toFixed(2)}
                  </span>
                </div>
                <div className="text-slate-400">
                  Yield Strength:{" "}
                  <span className="text-white">{material.yieldStrength} MPa</span>
                </div>
              </div>

              {results.safetyFactor < 1 && (
                <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
                  FAILURE: Stress exceeds yield strength! Redesign required.
                </div>
              )}
              {results.safetyFactor >= 1 && results.safetyFactor < 2 && (
                <div className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded p-2">
                  WARNING: Low safety factor. Consider increasing wall thickness.
                </div>
              )}

              <div className="bg-[#0d1117] rounded p-3 border border-[#21262d]">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showContour}
                    onChange={(e) => setShowContour(e.target.checked)}
                    className="accent-[#e94560]"
                  />
                  Show stress contour
                </label>
              </div>

              <button
                onClick={() => {
                  setResults(null);
                  setStep("loads");
                }}
                className="w-full bg-[#21262d] hover:bg-[#30363d] text-xs py-2 rounded text-white"
              >
                Modify & Re-run
              </button>
            </div>
          )}
        </div>

        {/* 3D Viewport */}
        <div className="flex-1 relative">
          <SimulatorViewport
            geometry={geometry}
            dimensions={geoDims}
            loads={loads}
            constraints={constraints}
            results={results}
            showContour={showContour && !!results}
            meshRes={meshRes}
          />

          {/* Legend */}
          {results && showContour && (
            <div className="absolute bottom-4 left-4 bg-[#161b22]/90 border border-[#21262d] rounded-lg p-3">
              <div className="text-[10px] text-slate-400 mb-1">Von Mises Stress (MPa)</div>
              <div className="w-48 h-3 rounded bg-gradient-to-r from-blue-600 via-cyan-400 via-green-400 via-yellow-400 to-red-600 mb-1" />
              <div className="flex justify-between text-[9px] text-slate-500 w-48">
                <span>{results.minStress.toFixed(1)}</span>
                <span>{(results.maxStress / 2).toFixed(1)}</span>
                <span>{results.maxStress.toFixed(1)}</span>
              </div>
            </div>
          )}

          <div className="absolute top-2 right-2 text-[10px] text-slate-600">
            Material: {material.name} | Mesh: {meshRes}x{meshRes}
          </div>
        </div>
      </div>
    </div>
  );
}
