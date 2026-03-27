"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  type TurbulenceModelType,
  getTurbulenceModelInfo,
} from "@/lib/cfd-turbulence";
import {
  createBoundaryLayerConfig,
  computeInflationLayers,
  generateMeshIndependenceConfigs,
  computeGCI,
} from "@/lib/cfd-boundary";
import {
  type PVArrayConfig,
  type WindConditions,
  parsePVWindCommand,
  generateWindAnalysisReport,
  calculatePVWindLoads,
} from "@/lib/cfd-wind-analysis";

const CFDAdvViewport = dynamic(
  () => import("@/components/CFDAdvancedViewport"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#0a0e17] text-slate-500">
        Loading 3D viewport...
      </div>
    ),
  },
);

const ConvergenceMonitor = dynamic(
  () => import("@/components/ConvergenceMonitor"),
  { ssr: false },
);

/* ── Types ── */
type SolverAlgo = "SIMPLE" | "PISO";
type SideTab = "solver" | "mesh" | "boundary" | "wind" | "results";

interface BoundaryCondition {
  id: string;
  name: string;
  type: "velocity-inlet" | "pressure-outlet" | "wall" | "symmetry" | "periodic";
  velocity?: number;
  pressure?: number;
  temperature?: number;
  wallType?: "no-slip" | "slip";
}

/* ── Static data ── */
const defaultBCs: BoundaryCondition[] = [
  { id: "bc1", name: "Inlet", type: "velocity-inlet", velocity: 5.0, temperature: 300 },
  { id: "bc2", name: "Outlet", type: "pressure-outlet", pressure: 0 },
  { id: "bc3", name: "Top Wall", type: "wall", temperature: 350, wallType: "no-slip" },
  { id: "bc4", name: "Bottom Wall", type: "wall", temperature: 300, wallType: "no-slip" },
  { id: "bc5", name: "Side", type: "symmetry" },
];

const turbModels: { id: TurbulenceModelType; label: string }[] = [
  { id: "laminar", label: "Laminar" },
  { id: "k-epsilon", label: "k-epsilon" },
  { id: "k-omega-sst", label: "k-omega SST" },
  { id: "spalart-allmaras", label: "Spalart-Allmaras" },
];

const fluidPresets = [
  { id: "air", label: "Air (20 °C)", density: 1.225, viscosity: 1.81e-5 },
  { id: "water", label: "Water (20 °C)", density: 998, viscosity: 1.003e-3 },
  { id: "custom", label: "Custom", density: 1.0, viscosity: 1e-5 },
];

/* ── Simulated solver ── */
function runDemoSolver(iters: number) {
  const residuals: number[] = [];
  const forces: { time: number; cd: number; cl: number }[] = [];
  for (let i = 0; i < iters; i++) {
    residuals.push(Math.exp(-0.06 * i) + Math.random() * 0.01);
    forces.push({
      time: i * 0.01,
      cd: 0.45 + 0.05 * Math.exp(-0.04 * i) + Math.random() * 0.01,
      cl: 0.12 + 0.03 * Math.exp(-0.03 * i) + Math.random() * 0.005,
    });
  }
  return { residuals, forces };
}

export default function CFDAdvancedPage() {
  /* ── State ── */
  const [sideTab, setSideTab] = useState<SideTab>("solver");
  const [turbModel, setTurbModel] = useState<TurbulenceModelType>("k-omega-sst");
  const [solverAlgo, setSolverAlgo] = useState<SolverAlgo>("SIMPLE");
  const [boundaries, setBoundaries] = useState<BoundaryCondition[]>(defaultBCs);
  const [fluid, setFluid] = useState(fluidPresets[0]);
  const [inletVelocity, setInletVelocity] = useState(5);
  const [maxIter, setMaxIter] = useState(500);
  const [convergenceTol, setConvergenceTol] = useState(1e-4);

  // Visualization toggles
  const [showStreamlines, setShowStreamlines] = useState(true);
  const [showVectors, setShowVectors] = useState(false);
  const [showParticles, setShowParticles] = useState(true);
  const [showContours, setShowContours] = useState(true);
  const [displayMode, setDisplayMode] = useState<"velocity" | "pressure" | "temperature" | "turbulence">("velocity");

  // Solver state
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [residuals, setResiduals] = useState<number[]>([]);
  const [forceHistory, setForceHistory] = useState<{ time: number; cd: number; cl: number }[]>([]);
  const [converged, setConverged] = useState(false);

  // Mesh
  const [meshNx, setMeshNx] = useState(40);
  const [meshNy, setMeshNy] = useState(20);
  const [blLayers, setBlLayers] = useState(10);
  const [blGrowth, setBlGrowth] = useState(1.2);

  // Wind analysis
  const [windPrompt, setWindPrompt] = useState("");
  const [windReport, setWindReport] = useState<ReturnType<typeof generateWindAnalysisReport> | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval>>();

  /* ── Solver run ── */
  const runSolver = useCallback(() => {
    setRunning(true);
    setProgress(0);
    setResiduals([]);
    setForceHistory([]);
    setConverged(false);

    const result = runDemoSolver(maxIter);
    let step = 0;

    timerRef.current = setInterval(() => {
      step += 2;
      if (step >= maxIter) {
        clearInterval(timerRef.current);
        setRunning(false);
        setConverged(true);
        setResiduals(result.residuals);
        setForceHistory(result.forces);
        setProgress(100);
        setSideTab("results");
        return;
      }
      setProgress(Math.round((step / maxIter) * 100));
      setResiduals(result.residuals.slice(0, step));
      setForceHistory(result.forces.slice(0, step));
    }, 30);
  }, [maxIter]);

  const stopSolver = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  /* ── Boundary layer config ── */
  const blConfig = createBoundaryLayerConfig(turbModel, inletVelocity, 1, fluid.density, fluid.viscosity);
  const inflation = computeInflationLayers({ numLayers: blLayers, firstLayerHeight: blConfig.firstLayerHeight, growthRatio: blGrowth, totalThickness: 0 });
  const turbInfo = getTurbulenceModelInfo(turbModel);

  /* ── Wind analysis ── */
  const runWindAnalysis = useCallback(() => {
    const parsed = parsePVWindCommand(windPrompt);
    if (!parsed) return;
    const pvConfig: PVArrayConfig = {
      rows: parsed.rows, columns: parsed.columns,
      moduleWidth: 1.0, moduleHeight: 2.0,
      tiltAngle: parsed.tiltAngle, groundClearance: 0.8,
      rowSpacing: 5, mountType: "ground-fixed",
    };
    const conditions: WindConditions = {
      basicWindSpeed: parsed.velocity, windDirection: parsed.direction,
      terrainCategory: parsed.terrainCategory, topographyFactor: 1.0,
      importanceFactor: 1.0, referenceHeight: 3,
    };
    const report = generateWindAnalysisReport(pvConfig, conditions);
    setWindReport(report);
  }, [windPrompt]);

  /* ── Update BC helper ── */
  const updateBC = useCallback((id: string, field: string, value: number | string) => {
    setBoundaries(prev => prev.map(bc => bc.id === id ? { ...bc, [field]: value } : bc));
  }, []);

  /* ── Residual series for monitor ── */
  const resSeries = [
    { name: "Continuity", color: "#00D4FF", data: residuals },
    { name: "Momentum", color: "#ff6b6b", data: residuals.map(r => r * 0.8 + Math.random() * 0.005) },
    { name: "Energy", color: "#4ecdc4", data: residuals.map(r => r * 0.6 + Math.random() * 0.003) },
  ];

  const tabs: { id: SideTab; label: string }[] = [
    { id: "solver", label: "Solver" },
    { id: "mesh", label: "Mesh" },
    { id: "boundary", label: "BCs" },
    { id: "wind", label: "Wind" },
    { id: "results", label: "Results" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="h-12 border-b border-[#1a1a2e] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[#00D4FF] font-bold text-sm">CFD Pro</span>
          <span className="text-slate-500 text-xs">{solverAlgo} | {turbModels.find(t => t.id === turbModel)?.label}</span>
          {running && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00D4FF]/15 text-[#00D4FF] animate-pulse">SOLVING {progress}%</span>}
          {converged && !running && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">CONVERGED</span>}
        </div>
        <div className="flex items-center gap-2">
          {(["velocity", "pressure", "temperature", "turbulence"] as const).map(m => (
            <button key={m} onClick={() => setDisplayMode(m)}
              className={`text-[10px] px-2 py-1 rounded capitalize ${displayMode === m ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30" : "text-slate-500 border border-[#252540]"}`}>
              {m}
            </button>
          ))}
          <div className="w-px h-5 bg-[#252540] mx-1" />
          {[
            { key: "showStreamlines", label: "Stream", val: showStreamlines, set: setShowStreamlines },
            { key: "showVectors", label: "Vectors", val: showVectors, set: setShowVectors },
            { key: "showParticles", label: "Particles", val: showParticles, set: setShowParticles },
          ].map(t => (
            <button key={t.key} onClick={() => t.set(!t.val)}
              className={`text-[10px] px-2 py-1 rounded ${t.val ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30" : "text-slate-500 border border-[#252540]"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* 3D Viewport + Convergence */}
        <div className="flex-1 relative flex flex-col">
          <div className="flex-1">
            <CFDAdvViewport
              domainWidth={4} domainHeight={2}
              displayMode={displayMode}
              showStreamlines={showStreamlines}
              showVectors={showVectors}
              showParticles={showParticles}
              showContours={showContours}
              colormap="jet"
            />
          </div>
          <div className="h-[220px] border-t border-[#1a1a2e] shrink-0">
            <ConvergenceMonitor
              series={resSeries}
              iterations={residuals.length}
              isRunning={running}
              tolerance={convergenceTol}
              converged={converged}
              forceHistory={forceHistory}
              autoStop
              onAutoStop={stopSolver}
              solverLabel={`${solverAlgo} + ${turbModel}`}
              courantNumber={running ? 0.3 + Math.random() * 0.4 : undefined}
            />
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-[310px] border-l border-[#1a1a2e] bg-[#0d0d14] flex flex-col shrink-0">
          <div className="flex border-b border-[#1a1a2e]">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setSideTab(t.id)}
                className={`flex-1 py-2 text-[10px] font-medium ${sideTab === t.id ? "text-[#00D4FF] border-b-2 border-[#00D4FF] bg-[#00D4FF]/5" : "text-slate-500 hover:text-white"}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Solver Tab */}
            {sideTab === "solver" && (
              <>
                <Section title="Algorithm">
                  <div className="flex gap-1">
                    {(["SIMPLE", "PISO"] as SolverAlgo[]).map(a => (
                      <button key={a} onClick={() => setSolverAlgo(a)}
                        className={`flex-1 py-1.5 text-[10px] rounded border ${solverAlgo === a ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-[#1a1a2e] text-slate-500"}`}>
                        {a} {a === "PISO" && "(Transient)"}
                      </button>
                    ))}
                  </div>
                </Section>
                <Section title="Turbulence Model">
                  {turbModels.map(tm => (
                    <button key={tm.id} onClick={() => setTurbModel(tm.id)}
                      className={`w-full text-left p-2 rounded border mb-1 ${turbModel === tm.id ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-white" : "border-[#1a1a2e] text-slate-400"}`}>
                      <div className="text-[10px] font-medium">{tm.label}</div>
                      {turbModel === tm.id && <div className="text-[9px] mt-0.5 text-slate-500">{turbInfo.description}</div>}
                    </button>
                  ))}
                </Section>
                <Section title="Fluid">
                  <select value={fluid.id} onChange={e => setFluid(fluidPresets.find(f => f.id === e.target.value) || fluidPresets[0])}
                    className="w-full bg-[#0a0a0f] border border-[#1a1a2e] rounded px-2 py-1.5 text-[10px] text-white">
                    {fluidPresets.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-1 mt-1 text-[9px] text-slate-500">
                    <span>rho = {fluid.density} kg/m3</span>
                    <span>mu = {fluid.viscosity.toExponential(2)} Pa.s</span>
                  </div>
                </Section>
                <Section title="Parameters">
                  <Field label="Inlet Velocity" value={inletVelocity} unit="m/s" onChange={setInletVelocity} />
                  <Field label="Max Iterations" value={maxIter} onChange={setMaxIter} />
                  <Field label="Convergence" value={convergenceTol} onChange={setConvergenceTol} />
                </Section>
                <button onClick={running ? stopSolver : runSolver}
                  className={`w-full py-2 rounded font-bold text-xs ${running ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-[#00D4FF] text-black"}`}>
                  {running ? "Stop Solver" : "Run Solver"}
                </button>
              </>
            )}

            {/* Mesh Tab */}
            {sideTab === "mesh" && (
              <>
                <Section title="Grid Resolution">
                  <Field label="Cells X" value={meshNx} onChange={setMeshNx} />
                  <Field label="Cells Y" value={meshNy} onChange={setMeshNy} />
                  <div className="text-[9px] text-slate-500 mt-1">Total: {meshNx * meshNy} cells</div>
                </Section>
                <Section title="Boundary Layer">
                  <Field label="Layers" value={blLayers} onChange={setBlLayers} />
                  <Field label="Growth Ratio" value={blGrowth} onChange={setBlGrowth} />
                  <div className="text-[9px] text-slate-500 mt-1">
                    1st layer: {blConfig.firstLayerHeight.toExponential(2)} m<br />
                    Total BL: {inflation.totalThickness.toFixed(4)} m<br />
                    Y+ target: {turbInfo.yPlusRange[0]}-{turbInfo.yPlusRange[1]}
                  </div>
                  <div className="mt-2 text-[8px] text-slate-600">
                    {inflation.heights.map((h, i) => (
                      <span key={i} className="mr-1">L{i + 1}: {h.toExponential(1)}</span>
                    ))}
                  </div>
                </Section>
                <Section title="Mesh Independence">
                  {generateMeshIndependenceConfigs(meshNx, meshNy).map(c => (
                    <div key={c.level} className="flex items-center justify-between text-[10px] p-1.5 rounded bg-[#0a0a0f] border border-[#1a1a2e] mb-1">
                      <span className="capitalize text-slate-300">{c.level}</span>
                      <span className="text-slate-500">{c.nx}x{c.ny} = {c.nx * c.ny} cells</span>
                    </div>
                  ))}
                </Section>
              </>
            )}

            {/* Boundary Conditions Tab */}
            {sideTab === "boundary" && (
              <>
                <Section title="Boundary Conditions">
                  {boundaries.map(bc => (
                    <div key={bc.id} className="p-2 bg-[#0a0a0f] rounded border border-[#1a1a2e] mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium text-white">{bc.name}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${
                          bc.type === "velocity-inlet" ? "bg-green-500/15 text-green-400"
                          : bc.type === "pressure-outlet" ? "bg-red-500/15 text-red-400"
                          : bc.type === "wall" ? "bg-yellow-500/15 text-yellow-400"
                          : "bg-blue-500/15 text-blue-400"
                        }`}>{bc.type.split("-")[0]}</span>
                      </div>
                      {bc.velocity !== undefined && (
                        <div className="flex items-center gap-1 text-[10px] mt-1">
                          <span className="text-slate-500 w-12">Vel</span>
                          <input type="number" value={bc.velocity} onChange={e => updateBC(bc.id, "velocity", Number(e.target.value))}
                            className="flex-1 bg-[#0d0d14] border border-[#252540] rounded px-1.5 py-0.5 text-white text-[10px] outline-none" />
                          <span className="text-slate-600 text-[9px]">m/s</span>
                        </div>
                      )}
                      {bc.pressure !== undefined && (
                        <div className="flex items-center gap-1 text-[10px] mt-1">
                          <span className="text-slate-500 w-12">P</span>
                          <input type="number" value={bc.pressure} onChange={e => updateBC(bc.id, "pressure", Number(e.target.value))}
                            className="flex-1 bg-[#0d0d14] border border-[#252540] rounded px-1.5 py-0.5 text-white text-[10px] outline-none" />
                          <span className="text-slate-600 text-[9px]">Pa</span>
                        </div>
                      )}
                      {bc.wallType && (
                        <div className="flex gap-1 mt-1">
                          {(["no-slip", "slip"] as const).map(w => (
                            <button key={w} onClick={() => updateBC(bc.id, "wallType", w)}
                              className={`flex-1 text-[9px] py-0.5 rounded border ${bc.wallType === w ? "border-[#00D4FF]/30 text-[#00D4FF]" : "border-[#252540] text-slate-600"}`}>
                              {w}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </Section>
              </>
            )}

            {/* Wind Analysis Tab */}
            {sideTab === "wind" && (
              <>
                <Section title="PV Wind Analysis">
                  <div className="text-[9px] text-slate-500 mb-2">
                    Describe your analysis in natural language:
                  </div>
                  <textarea value={windPrompt}
                    onChange={e => setWindPrompt(e.target.value)}
                    placeholder='e.g. "Run wind analysis on PV array at 40 m/s from south"'
                    className="w-full bg-[#0a0a0f] border border-[#1a1a2e] rounded px-2 py-1.5 text-[10px] text-white h-16 resize-none outline-none focus:border-[#00D4FF]" />
                  <button onClick={runWindAnalysis} disabled={!windPrompt.trim()}
                    className="w-full mt-1 py-1.5 bg-[#00D4FF] text-black text-[10px] rounded font-bold disabled:opacity-40">
                    Analyze Wind Loads
                  </button>
                </Section>
                {windReport && (
                  <>
                    <Section title="Direction Results">
                      {windReport.directionResults.map(r => (
                        <div key={r.direction} className="flex items-center justify-between text-[10px] p-1.5 bg-[#0a0a0f] rounded border border-[#1a1a2e] mb-1">
                          <span className="text-slate-300 w-14">{r.label}</span>
                          <span className="text-[#00D4FF]">Cp={r.codeCp.toFixed(3)}</span>
                          <span className="text-yellow-400">{r.loads.upliftForce.toFixed(0)}N</span>
                        </div>
                      ))}
                    </Section>
                    <Section title="Critical Case">
                      <div className="text-[10px] space-y-0.5 text-slate-300">
                        <div>Max Uplift: <span className="text-red-400">{windReport.criticalCase.maxUplift.toFixed(0)} N</span></div>
                        <div>Max Drag: <span className="text-yellow-400">{windReport.criticalCase.maxDrag.toFixed(0)} N</span></div>
                        <div>Max Moment: <span className="text-[#00D4FF]">{windReport.criticalCase.maxMoment.toFixed(0)} N.m</span></div>
                      </div>
                    </Section>
                    <Section title="Recommendations">
                      {windReport.recommendations.map((r, i) => (
                        <div key={i} className="text-[9px] text-slate-500 mb-1">- {r}</div>
                      ))}
                    </Section>
                    <div className="text-[8px] text-slate-600 mt-1">{windReport.codeReference}</div>
                  </>
                )}
              </>
            )}

            {/* Results Tab */}
            {sideTab === "results" && (
              <>
                <Section title="Solution Status">
                  <div className="text-[10px] space-y-1 text-slate-300">
                    <div>Iterations: <span className="text-white font-bold">{residuals.length}</span></div>
                    <div>Final residual: <span className="text-[#00D4FF] font-bold">{residuals.length > 0 ? residuals[residuals.length - 1].toExponential(3) : "—"}</span></div>
                    <div>Status: <span className={converged ? "text-green-400" : "text-yellow-400"}>{converged ? "Converged" : running ? "Running" : "Not started"}</span></div>
                  </div>
                </Section>
                {forceHistory.length > 0 && (
                  <Section title="Force Coefficients">
                    <div className="text-[10px] space-y-1 text-slate-300">
                      <div>Cd = <span className="text-[#ff6b6b] font-bold">{forceHistory[forceHistory.length - 1].cd.toFixed(4)}</span></div>
                      <div>Cl = <span className="text-[#4ecdc4] font-bold">{forceHistory[forceHistory.length - 1].cl.toFixed(4)}</span></div>
                    </div>
                  </Section>
                )}
                <Section title="Turbulence">
                  <div className="text-[10px] text-slate-300">
                    <div>Model: <span className="text-white">{turbInfo.name}</span></div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{turbInfo.recommended}</div>
                    <div className="text-[9px] text-slate-500">Y+ range: {turbInfo.yPlusRange[0]}-{turbInfo.yPlusRange[1]}</div>
                  </div>
                </Section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Utility components ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</h4>
      {children}
    </div>
  );
}

function Field({ label, value, unit, onChange }: { label: string; value: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2 text-[10px] mb-1">
      <span className="text-slate-500 w-24">{label}</span>
      <input type="number" value={value} step="any"
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 bg-[#0a0a0f] border border-[#1a1a2e] rounded px-2 py-1 text-white text-[10px] outline-none focus:border-[#00D4FF]" />
      {unit && <span className="text-slate-600 text-[9px] w-8">{unit}</span>}
    </div>
  );
}
