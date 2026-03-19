"use client";
import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";

const CFDViewport = dynamic(() => import("@/components/CFDViewport"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0a0e17] text-slate-500">
      Loading 3D viewport...
    </div>
  ),
});

type BoundaryType = "temperature" | "heatFlux" | "convection" | "insulated";
type FlowModel = "laminar" | "k-epsilon" | "k-omega-sst";

interface ThermalBoundary {
  id: string;
  face: string;
  type: BoundaryType;
  value: number;
  heatTransferCoeff?: number; // for convection
  ambientTemp?: number; // for convection
}

interface CFDResults {
  temperatureField: number[];
  velocityField: number[];
  pressureField: number[];
  minTemp: number;
  maxTemp: number;
  avgTemp: number;
  maxVelocity: number;
  convergenceHistory: number[];
  iterations: number;
  converged: boolean;
}

const faces = ["Top (+Y)", "Bottom (-Y)", "Front (+Z)", "Back (-Z)", "Left (-X)", "Right (+X)"];

const fluidMaterials = [
  { id: "air", name: "Air", density: 1.225, cp: 1006, k: 0.026, mu: 1.81e-5 },
  { id: "water", name: "Water", density: 998, cp: 4182, k: 0.606, mu: 1.003e-3 },
  { id: "oil", name: "Engine Oil", density: 884, cp: 1909, k: 0.145, mu: 0.486 },
];

const solidMaterials = [
  { id: "aluminum", name: "Aluminum 6061", k: 167, cp: 896, density: 2700 },
  { id: "steel", name: "Steel AISI 304", k: 16.2, cp: 500, density: 7900 },
  { id: "copper", name: "Copper C110", k: 391, cp: 385, density: 8960 },
  { id: "ceramic", name: "Alumina Ceramic", k: 30, cp: 880, density: 3950 },
];

function computeThermalCFD(
  boundaries: ThermalBoundary[],
  meshRes: number,
  solidMat: string,
  fluidMat: string,
  inletVelocity: number,
): CFDResults {
  const gridSize = meshRes;
  const totalNodes = gridSize * gridSize;
  const temperatureField = new Array(totalNodes).fill(293.15); // 20°C default
  const velocityField = new Array(totalNodes).fill(0);
  const pressureField = new Array(totalNodes).fill(101325);

  const solid = solidMaterials.find((m) => m.id === solidMat) || solidMaterials[0];
  const fluid = fluidMaterials.find((m) => m.id === fluidMat) || fluidMaterials[0];

  // Apply boundary conditions
  const tempBCs: { x: number; y: number; temp: number }[] = [];
  const heatFluxBCs: { x: number; y: number; flux: number }[] = [];

  for (const bc of boundaries) {
    const faceIdx = faces.indexOf(bc.face);
    let pos = { x: 0.5, y: 0.5 };
    switch (faceIdx) {
      case 0: pos = { x: 0.5, y: 0 }; break;
      case 1: pos = { x: 0.5, y: 1 }; break;
      case 2: pos = { x: 0.5, y: 0.5 }; break;
      case 3: pos = { x: 0.5, y: 0.5 }; break;
      case 4: pos = { x: 0, y: 0.5 }; break;
      case 5: pos = { x: 1, y: 0.5 }; break;
    }

    if (bc.type === "temperature") {
      tempBCs.push({ ...pos, temp: bc.value + 273.15 });
    } else if (bc.type === "heatFlux") {
      heatFluxBCs.push({ ...pos, flux: bc.value });
    } else if (bc.type === "convection") {
      const h = bc.heatTransferCoeff || 25;
      const tAmb = (bc.ambientTemp || 20) + 273.15;
      tempBCs.push({ ...pos, temp: tAmb + bc.value / h });
    }
  }

  // Iterative solver (simplified Gauss-Seidel)
  const convergenceHistory: number[] = [];
  const maxIter = 200;

  for (let iter = 0; iter < maxIter; iter++) {
    let maxResidual = 0;

    for (let j = 0; j < gridSize; j++) {
      for (let i = 0; i < gridSize; i++) {
        const idx = j * gridSize + i;
        const x = i / (gridSize - 1);
        const y = j / (gridSize - 1);

        let newTemp = temperatureField[idx];
        let influenced = false;

        // Temperature BC influence
        for (const bc of tempBCs) {
          const dist = Math.sqrt((x - bc.x) ** 2 + (y - bc.y) ** 2);
          const weight = Math.exp(-dist * 4);
          newTemp = newTemp * (1 - weight) + bc.temp * weight;
          influenced = true;
        }

        // Heat flux influence
        for (const hf of heatFluxBCs) {
          const dist = Math.sqrt((x - hf.x) ** 2 + (y - hf.y) ** 2);
          const effect = (hf.flux / (solid.k * 100)) * Math.exp(-dist * 3);
          newTemp += effect;
          influenced = true;
        }

        // Neighbor averaging (diffusion)
        if (i > 0 && i < gridSize - 1 && j > 0 && j < gridSize - 1) {
          const avg =
            (temperatureField[idx - 1] +
              temperatureField[idx + 1] +
              temperatureField[idx - gridSize] +
              temperatureField[idx + gridSize]) /
            4;
          newTemp = influenced ? newTemp * 0.7 + avg * 0.3 : avg;
        }

        // Velocity field (simplified flow pattern)
        velocityField[idx] = inletVelocity * (1 - Math.pow(2 * y - 1, 2)) * (0.8 + 0.4 * Math.random());

        // Advection effect
        if (inletVelocity > 0 && i > 0) {
          const advection = velocityField[idx] * 0.01 * (temperatureField[idx - 1] - temperatureField[idx]);
          newTemp += advection;
        }

        // Pressure field
        pressureField[idx] = 101325 - 0.5 * fluid.density * velocityField[idx] ** 2;

        const residual = Math.abs(newTemp - temperatureField[idx]);
        maxResidual = Math.max(maxResidual, residual);
        temperatureField[idx] = newTemp;
      }
    }

    convergenceHistory.push(maxResidual);
    if (maxResidual < 1e-4 && iter > 20) break;
  }

  // Smooth
  const smoothed = [...temperatureField];
  for (let pass = 0; pass < 5; pass++) {
    for (let j = 1; j < gridSize - 1; j++) {
      for (let i = 1; i < gridSize - 1; i++) {
        const idx = j * gridSize + i;
        smoothed[idx] =
          (temperatureField[idx] * 2 +
            temperatureField[idx - 1] +
            temperatureField[idx + 1] +
            temperatureField[idx - gridSize] +
            temperatureField[idx + gridSize]) /
          6;
      }
    }
    for (let i = 0; i < totalNodes; i++) {
      temperatureField[i] = smoothed[i];
    }
  }

  const temps = temperatureField.filter((t) => t > 0);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;

  return {
    temperatureField,
    velocityField,
    pressureField,
    minTemp: Math.round((minTemp - 273.15) * 100) / 100,
    maxTemp: Math.round((maxTemp - 273.15) * 100) / 100,
    avgTemp: Math.round((avgTemp - 273.15) * 100) / 100,
    maxVelocity: Math.round(Math.max(...velocityField) * 1000) / 1000,
    convergenceHistory,
    iterations: convergenceHistory.length,
    converged: convergenceHistory[convergenceHistory.length - 1] < 1e-3,
  };
}

export default function CFDPage() {
  const [step, setStep] = useState("geometry");
  const [geometry, setGeometry] = useState<"box" | "cylinder" | "sphere">("box");
  const [geoDims, setGeoDims] = useState({ width: 2, height: 1, depth: 2 });
  const [meshRes, setMeshRes] = useState(20);
  const [boundaries, setBoundaries] = useState<ThermalBoundary[]>([]);
  const [solidMat, setSolidMat] = useState("aluminum");
  const [fluidMat, setFluidMat] = useState("air");
  const [flowModel, setFlowModel] = useState<FlowModel>("laminar");
  const [inletVelocity, setInletVelocity] = useState(1.0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<CFDResults | null>(null);
  const [displayMode, setDisplayMode] = useState<"temperature" | "velocity" | "pressure">("temperature");

  const steps = [
    { id: "geometry", label: "1. Domain", icon: "^" },
    { id: "mesh", label: "2. Mesh", icon: "#" },
    { id: "boundaries", label: "3. Boundaries", icon: "T" },
    { id: "materials", label: "4. Materials", icon: "M" },
    { id: "solver", label: "5. Solver", icon: ">" },
    { id: "results", label: "6. Results", icon: "R" },
  ];

  const stepIdx = steps.findIndex((s) => s.id === step);

  const addBoundary = () => {
    setBoundaries((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        face: "Top (+Y)",
        type: "temperature",
        value: 100,
      },
    ]);
  };

  const removeBoundary = (id: string) => {
    setBoundaries((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBoundary = (id: string, updates: Partial<ThermalBoundary>) => {
    setBoundaries((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  const runSimulation = useCallback(() => {
    if (boundaries.length === 0) {
      alert("Add at least one boundary condition.");
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
          const res = computeThermalCFD(boundaries, meshRes, solidMat, fluidMat, inletVelocity);
          setResults(res);
          setStep("results");
          return 100;
        }
        return p + 2;
      });
    }, 50);
  }, [boundaries, meshRes, solidMat, fluidMat, inletVelocity]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#21262d] px-4 py-2 flex items-center gap-3 shrink-0">
        <span className="text-xs font-bold text-[#e94560]">CFD Thermal Analysis</span>
        <div className="flex-1" />
        {results && (
          <div className="flex items-center gap-1">
            {(["temperature", "velocity", "pressure"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setDisplayMode(mode)}
                className={`text-[10px] px-2 py-1 rounded capitalize ${
                  displayMode === mode
                    ? "bg-[#e94560] text-white"
                    : "bg-[#21262d] text-slate-400 hover:text-white"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={runSimulation}
          disabled={running || boundaries.length === 0}
          className="bg-[#e94560] hover:bg-[#d63750] disabled:opacity-50 text-white text-xs px-4 py-1.5 rounded font-semibold transition-colors"
        >
          {running ? `Solving... ${progress}%` : "Run CFD"}
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
              <div className="h-full bg-[#e94560] transition-all" style={{ width: `${progress}%` }} />
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
              <h3 className="text-xs font-bold text-slate-300 uppercase">Domain Geometry</h3>
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
                    <input type="radio" name="geo" checked={geometry === g} onChange={() => setGeometry(g)} className="accent-[#e94560]" />
                    {g === "box" ? "Rectangular Channel" : g === "cylinder" ? "Pipe / Tube" : "Sphere / Vessel"}
                  </label>
                ))}
              </div>
              <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                <div className="text-slate-400 mb-1">Dimensions (m)</div>
                {(["width", "height", "depth"] as const).map((d) => (
                  <div key={d} className="flex items-center justify-between">
                    <span className="text-slate-500 capitalize">{d}</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={geoDims[d]}
                      onChange={(e) => setGeoDims((prev) => ({ ...prev, [d]: parseFloat(e.target.value) || 0.1 }))}
                      className="w-20 bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-right"
                    />
                  </div>
                ))}
              </div>
              <button onClick={() => setStep("mesh")} className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold text-white">
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
                <div className="text-slate-500">Nodes: <span className="text-green-400">{meshRes * meshRes}</span></div>
                <div className="text-slate-500">Elements: <span className="text-green-400">{(meshRes - 1) * (meshRes - 1) * 2}</span></div>
              </div>
              <button onClick={() => setStep("boundaries")} className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold text-white">
                Next: Boundary Conditions
              </button>
            </div>
          )}

          {step === "boundaries" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase">Thermal Boundaries</h3>
              <button
                onClick={addBoundary}
                className="w-full bg-[#21262d] hover:bg-[#30363d] text-xs py-2 rounded text-white border border-[#21262d]"
              >
                + Add Boundary Condition
              </button>
              {boundaries.map((bc) => (
                <div key={bc.id} className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-orange-400 font-medium">Thermal BC</span>
                    <button onClick={() => removeBoundary(bc.id)} className="text-slate-600 hover:text-red-400 text-[10px]">
                      remove
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Face</span>
                    <select
                      value={bc.face}
                      onChange={(e) => updateBoundary(bc.id, { face: e.target.value })}
                      className="bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-[11px]"
                    >
                      {faces.map((f) => (<option key={f} value={f}>{f}</option>))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Type</span>
                    <select
                      value={bc.type}
                      onChange={(e) => updateBoundary(bc.id, { type: e.target.value as BoundaryType })}
                      className="bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-[11px]"
                    >
                      <option value="temperature">Fixed Temperature</option>
                      <option value="heatFlux">Heat Flux (W/m2)</option>
                      <option value="convection">Convection</option>
                      <option value="insulated">Insulated (q=0)</option>
                    </select>
                  </div>
                  {bc.type !== "insulated" && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">
                        {bc.type === "temperature" ? "Temp (C)" : bc.type === "heatFlux" ? "Flux (W/m2)" : "Power (W)"}
                      </span>
                      <input
                        type="number"
                        value={bc.value}
                        onChange={(e) => updateBoundary(bc.id, { value: parseFloat(e.target.value) || 0 })}
                        className="w-20 bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-right"
                      />
                    </div>
                  )}
                  {bc.type === "convection" && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">h (W/m2K)</span>
                        <input
                          type="number"
                          value={bc.heatTransferCoeff || 25}
                          onChange={(e) => updateBoundary(bc.id, { heatTransferCoeff: parseFloat(e.target.value) || 25 })}
                          className="w-20 bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-right"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">T_amb (C)</span>
                        <input
                          type="number"
                          value={bc.ambientTemp || 20}
                          onChange={(e) => updateBoundary(bc.id, { ambientTemp: parseFloat(e.target.value) || 20 })}
                          className="w-20 bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-right"
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
              <button onClick={() => setStep("materials")} className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold text-white">
                Next: Materials
              </button>
            </div>
          )}

          {step === "materials" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase">Solid Material</h3>
              {solidMaterials.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-2 text-xs p-2 rounded border cursor-pointer ${
                    solidMat === m.id ? "bg-[#e94560]/10 border-[#e94560]/40 text-white" : "bg-[#0d1117] border-[#21262d] text-slate-300"
                  }`}
                >
                  <input type="radio" name="solid" checked={solidMat === m.id} onChange={() => setSolidMat(m.id)} className="accent-[#e94560] mt-0.5" />
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-slate-500">k: {m.k} W/mK | Cp: {m.cp} J/kgK</div>
                  </div>
                </label>
              ))}
              <h3 className="text-xs font-bold text-slate-300 uppercase mt-4">Fluid</h3>
              {fluidMaterials.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-2 text-xs p-2 rounded border cursor-pointer ${
                    fluidMat === m.id ? "bg-blue-500/10 border-blue-500/40 text-white" : "bg-[#0d1117] border-[#21262d] text-slate-300"
                  }`}
                >
                  <input type="radio" name="fluid" checked={fluidMat === m.id} onChange={() => setFluidMat(m.id)} className="accent-blue-500 mt-0.5" />
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-slate-500">rho: {m.density} | Cp: {m.cp} | k: {m.k}</div>
                  </div>
                </label>
              ))}
              <button onClick={() => setStep("solver")} className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded text-xs font-bold text-white">
                Next: Solver
              </button>
            </div>
          )}

          {step === "solver" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase">Solver Configuration</h3>
              <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Flow Model</span>
                  <select
                    value={flowModel}
                    onChange={(e) => setFlowModel(e.target.value as FlowModel)}
                    className="bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d]"
                  >
                    <option value="laminar">Laminar</option>
                    <option value="k-epsilon">k-epsilon</option>
                    <option value="k-omega-sst">k-omega SST</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Inlet Velocity (m/s)</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={inletVelocity}
                    onChange={(e) => setInletVelocity(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-right"
                  />
                </div>
              </div>
              <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-1">
                <div className="text-slate-400">Geometry: <span className="text-white capitalize">{geometry}</span></div>
                <div className="text-slate-400">Solid: <span className="text-white">{solidMaterials.find((m) => m.id === solidMat)?.name}</span></div>
                <div className="text-slate-400">Fluid: <span className="text-white">{fluidMaterials.find((m) => m.id === fluidMat)?.name}</span></div>
                <div className="text-slate-400">Mesh: <span className="text-white">{meshRes}x{meshRes} ({meshRes * meshRes} nodes)</span></div>
                <div className="text-slate-400">BCs: <span className="text-white">{boundaries.length}</span></div>
                <div className="text-slate-400">Model: <span className="text-white">{flowModel}</span></div>
              </div>
              {boundaries.length === 0 && (
                <div className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded p-2">
                  Add at least one boundary condition.
                </div>
              )}
              <button
                onClick={runSimulation}
                disabled={running || boundaries.length === 0}
                className="w-full bg-[#e94560] hover:bg-[#d63750] disabled:opacity-50 py-2 rounded text-xs font-bold text-white"
              >
                {running ? `Solving... ${progress}%` : "Run CFD Simulation"}
              </button>
            </div>
          )}

          {step === "results" && results && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase">Thermal Results</h3>
              <div className={`text-xs ${results.converged ? "text-green-400 bg-green-500/10 border-green-500/30" : "text-amber-400 bg-amber-500/10 border-amber-500/30"} border rounded p-2`}>
                {results.converged ? `Converged in ${results.iterations} iterations` : `Completed ${results.iterations} iterations (not fully converged)`}
              </div>

              <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                <div className="text-slate-300 font-medium mb-1">Temperature</div>
                <div className="text-slate-400">Min: <span className="text-blue-400 font-bold">{results.minTemp.toFixed(1)} C</span></div>
                <div className="text-slate-400">Max: <span className="text-red-400 font-bold">{results.maxTemp.toFixed(1)} C</span></div>
                <div className="text-slate-400">Avg: <span className="text-yellow-400 font-bold">{results.avgTemp.toFixed(1)} C</span></div>
              </div>

              <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                <div className="text-slate-300 font-medium mb-1">Flow</div>
                <div className="text-slate-400">Max Velocity: <span className="text-cyan-400 font-bold">{results.maxVelocity.toFixed(3)} m/s</span></div>
                <div className="text-slate-400">Flow Model: <span className="text-white">{flowModel}</span></div>
              </div>

              <div className="bg-[#0d1117] rounded p-3 border border-[#21262d]">
                <div className="text-xs text-slate-400 mb-2">Display Mode</div>
                <div className="flex flex-col gap-1">
                  {(["temperature", "velocity", "pressure"] as const).map((mode) => (
                    <label key={mode} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="display"
                        checked={displayMode === mode}
                        onChange={() => setDisplayMode(mode)}
                        className="accent-[#e94560]"
                      />
                      <span className="capitalize">{mode} contour</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={() => { setResults(null); setStep("boundaries"); }}
                className="w-full bg-[#21262d] hover:bg-[#30363d] text-xs py-2 rounded text-white"
              >
                Modify & Re-run
              </button>
            </div>
          )}
        </div>

        {/* 3D Viewport */}
        <div className="flex-1 relative">
          <CFDViewport
            geometry={geometry}
            dimensions={geoDims}
            boundaries={boundaries}
            results={results}
            displayMode={displayMode}
            meshRes={meshRes}
          />

          {/* Temperature Legend */}
          {results && (
            <div className="absolute bottom-4 left-4 bg-[#161b22]/90 border border-[#21262d] rounded-lg p-3">
              <div className="text-[10px] text-slate-400 mb-1 capitalize">{displayMode} Distribution</div>
              <div className="w-48 h-3 rounded bg-gradient-to-r from-blue-600 via-cyan-400 via-green-400 via-yellow-400 to-red-600 mb-1" />
              <div className="flex justify-between text-[9px] text-slate-500 w-48">
                {displayMode === "temperature" && (
                  <>
                    <span>{results.minTemp.toFixed(0)} C</span>
                    <span>{results.avgTemp.toFixed(0)} C</span>
                    <span>{results.maxTemp.toFixed(0)} C</span>
                  </>
                )}
                {displayMode === "velocity" && (
                  <>
                    <span>0 m/s</span>
                    <span>{(results.maxVelocity / 2).toFixed(2)}</span>
                    <span>{results.maxVelocity.toFixed(2)}</span>
                  </>
                )}
                {displayMode === "pressure" && (
                  <>
                    <span>Low</span>
                    <span>Mid</span>
                    <span>High</span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="absolute top-2 right-2 text-[10px] text-slate-600">
            {solidMaterials.find((m) => m.id === solidMat)?.name} | {fluidMaterials.find((m) => m.id === fluidMat)?.name} | {meshRes}x{meshRes}
          </div>
        </div>
      </div>
    </div>
  );
}
