"use client";
import { useState, useMemo } from "react";
import {
  Building2, Columns, Anchor, Weight, Combine, Play, BarChart3,
  Plus, Trash2, Download, AlertTriangle, CheckCircle2, Settings2,
} from "lucide-react";
import {
  STANDARD_SECTIONS, STRUCTURAL_MATERIALS, CODE_COMBINATIONS,
  type StructuralNode, type BeamElement, type LoadCase, type MemberLoad,
  type NodalLoad, type DesignCheck, type MemberResult,
  solveFrame2D, checkMemberIS800,
} from "@/lib/structural-engine";
import {
  designIsolatedFooting, bearingCapacityIS6403,
  type SoilProfile, type FootingResult,
} from "@/lib/foundation-engine";

type Tab = "model" | "properties" | "supports" | "loads" | "combinations" | "analysis" | "results";
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "model", label: "Model", icon: <Building2 size={14} /> },
  { id: "properties", label: "Properties", icon: <Columns size={14} /> },
  { id: "supports", label: "Supports", icon: <Anchor size={14} /> },
  { id: "loads", label: "Loads", icon: <Weight size={14} /> },
  { id: "combinations", label: "Combinations", icon: <Combine size={14} /> },
  { id: "analysis", label: "Analysis", icon: <Play size={14} /> },
  { id: "results", label: "Results", icon: <BarChart3 size={14} /> },
];

// ── Demo data ──
const demoNodes: StructuralNode[] = [
  { id: "N1", x: 0, y: 0, z: 0, restraints: [true, true, false, false, false, true] },
  { id: "N2", x: 4000, y: 0, z: 0, restraints: [true, true, false, false, false, true] },
  { id: "N3", x: 0, y: 3000, z: 0, restraints: [false, false, false, false, false, false] },
  { id: "N4", x: 4000, y: 3000, z: 0, restraints: [false, false, false, false, false, false] },
  { id: "N5", x: 2000, y: 4500, z: 0, restraints: [false, false, false, false, false, false] },
];

const demoElements: BeamElement[] = [
  { id: "E1", nodeI: "N1", nodeJ: "N3", sectionId: "ISMB200", materialId: "Fe250", type: "beam" },
  { id: "E2", nodeI: "N2", nodeJ: "N4", sectionId: "ISMB200", materialId: "Fe250", type: "beam" },
  { id: "E3", nodeI: "N3", nodeJ: "N4", sectionId: "ISMB250", materialId: "Fe250", type: "beam" },
  { id: "E4", nodeI: "N3", nodeJ: "N5", sectionId: "ISMB150", materialId: "Fe250", type: "beam" },
  { id: "E5", nodeI: "N4", nodeJ: "N5", sectionId: "ISMB150", materialId: "Fe250", type: "beam" },
];

const demoLoadCase: LoadCase = {
  id: "LC1", name: "Dead + Live", type: "dead",
  nodalLoads: [
    { nodeId: "N5", fx: 0, fy: -50, fz: 0, mx: 0, my: 0, mz: 0 },
    { nodeId: "N3", fx: 10, fy: 0, fz: 0, mx: 0, my: 0, mz: 0 },
  ],
  memberLoads: [
    { elementId: "E3", type: "udl", direction: "GY", values: [-5] },
  ],
};

const demoSoil: SoilProfile = {
  type: "sand", cohesion: 0, frictionAngle: 30, unitWeight: 18,
  waterTableDepth: 5, allowableBearing: 150, sptN: 20, subgradeModulus: 25000,
};

// ── Helpers ──
function cn(...classes: (string | false | undefined)[]) { return classes.filter(Boolean).join(" "); }
const inputCls = "w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-slate-200 focus:border-[#00D4FF] focus:outline-none";
const btnPrimary = "flex items-center gap-1.5 px-3 py-1.5 bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30 rounded text-xs font-medium hover:bg-[#00D4FF]/25 transition-colors";
const btnDanger = "flex items-center gap-1.5 px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-xs hover:bg-red-500/20 transition-colors";

// ── Bar chart component ──
function BarDiagram({ data, maxVal, label, color }: { data: number[]; maxVal: number; label: string; color: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] text-slate-500 font-medium">{label}</div>
      <div className="flex items-end gap-px h-16">
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end">
            <div
              style={{ height: `${Math.abs(v) / (maxVal || 1) * 100}%`, backgroundColor: color }}
              className={cn("w-full min-h-[2px] rounded-t-sm", v < 0 && "opacity-60")}
              title={`Station ${i}: ${v.toFixed(2)}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──
export default function StructuralAnalysisPage() {
  const [activeTab, setActiveTab] = useState<Tab>("model");
  const [nodes, setNodes] = useState(demoNodes);
  const [elements, setElements] = useState(demoElements);
  const [loadCase] = useState(demoLoadCase);
  const [analysisRun, setAnalysisRun] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedCombos, setSelectedCombos] = useState<string[]>(["IS800-1", "IS800-4"]);
  const [resultSubTab, setResultSubTab] = useState<"forces" | "reactions" | "design" | "foundation">("forces");

  const sections = STANDARD_SECTIONS;
  const materials = STRUCTURAL_MATERIALS;

  // Run analysis
  const analysisResult = useMemo(() => {
    if (!analysisRun) return null;
    return solveFrame2D(nodes, elements, sections, materials, loadCase);
  }, [analysisRun, nodes, elements, sections, materials, loadCase]);

  const footingResult = useMemo(() => {
    if (!analysisResult) return null;
    return designIsolatedFooting({
      axialLoad: 300, momentX: 0, momentZ: 20,
      columnWidth: 300, columnDepth: 300, depth: 1.5,
      concreteGrade: 25, steelGrade: 500, soil: demoSoil, coverMm: 50,
    });
  }, [analysisResult]);

  function handleRunAnalysis() {
    setRunning(true); setProgress(0);
    const steps = [10, 25, 40, 60, 80, 95, 100];
    let i = 0;
    const iv = setInterval(() => {
      setProgress(steps[i]);
      i++;
      if (i >= steps.length) { clearInterval(iv); setRunning(false); setAnalysisRun(true); setActiveTab("results"); }
    }, 300);
  }

  function addNode() {
    const id = `N${nodes.length + 1}`;
    setNodes([...nodes, { id, x: 0, y: 0, z: 0, restraints: [false, false, false, false, false, false] }]);
  }

  function removeNode(id: string) { setNodes(nodes.filter(n => n.id !== id)); }

  // ── Render tab content ──
  function renderModel() {
    return (
      <div className="grid grid-cols-2 gap-4">
        {/* Nodes */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300">Nodes ({nodes.length})</span>
            <button onClick={addNode} className={btnPrimary}><Plus size={12} />Add</button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-5 gap-1 text-[9px] text-slate-500 font-mono px-1">
              <span>ID</span><span>X (mm)</span><span>Y (mm)</span><span>Z (mm)</span><span></span>
            </div>
            {nodes.map(n => (
              <div key={n.id} className="grid grid-cols-5 gap-1 items-center">
                <span className="text-[10px] text-[#00D4FF] font-mono">{n.id}</span>
                <input className={inputCls} value={n.x} readOnly />
                <input className={inputCls} value={n.y} readOnly />
                <input className={inputCls} value={n.z} readOnly />
                <button onClick={() => removeNode(n.id)} className="text-red-400 hover:text-red-300"><Trash2 size={11} /></button>
              </div>
            ))}
          </div>
        </div>
        {/* Elements */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300">Elements ({elements.length})</span>
            <button className={btnPrimary}><Plus size={12} />Add</button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-5 gap-1 text-[9px] text-slate-500 font-mono px-1">
              <span>ID</span><span>Node I</span><span>Node J</span><span>Section</span><span>Type</span>
            </div>
            {elements.map(e => (
              <div key={e.id} className="grid grid-cols-5 gap-1 items-center text-[10px] text-slate-300 font-mono">
                <span className="text-[#00D4FF]">{e.id}</span>
                <span>{e.nodeI}</span><span>{e.nodeJ}</span>
                <span className="text-amber-400">{e.sectionId}</span>
                <span className="text-slate-500">{e.type}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Visual preview */}
        <div className="col-span-2 bg-[#161b22] border border-[#21262d] rounded-lg p-3">
          <span className="text-xs font-bold text-slate-300 mb-2 block">Structure Preview</span>
          <svg viewBox="-200 -600 4600 5400" className="w-full h-52 bg-[#0d1117] rounded">
            <g transform="scale(1,-1) translate(0,-4800)">
              {elements.map(e => {
                const nI = nodes.find(n => n.id === e.nodeI);
                const nJ = nodes.find(n => n.id === e.nodeJ);
                if (!nI || !nJ) return null;
                return <line key={e.id} x1={nI.x} y1={nI.y} x2={nJ.x} y2={nJ.y} stroke="#00D4FF" strokeWidth={40} />;
              })}
              {nodes.map(n => (
                <g key={n.id}>
                  <circle cx={n.x} cy={n.y} r={80} fill={n.restraints[0] || n.restraints[1] ? "#f59e0b" : "#22d3ee"} />
                  <text x={n.x} y={n.y - 140} fill="#94a3b8" fontSize={180} textAnchor="middle" transform={`scale(1,-1) translate(0,${-2 * n.y + 140})`}>{n.id}</text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>
    );
  }

  function renderProperties() {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-3">
          <span className="text-xs font-bold text-slate-300 mb-2 block">Section Profiles</span>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            <div className="grid grid-cols-6 gap-1 text-[8px] text-slate-500 font-mono px-1">
              <span>Name</span><span>Type</span><span>A (mm²)</span><span>Ixx (mm⁴)</span><span>Zxx (mm³)</span><span>D (mm)</span>
            </div>
            {sections.map(s => (
              <div key={s.id} className="grid grid-cols-6 gap-1 text-[9px] text-slate-300 font-mono hover:bg-[#21262d] px-1 rounded">
                <span className="text-amber-400">{s.name}</span>
                <span className="text-slate-500">{s.type}</span>
                <span>{s.area}</span>
                <span>{(s.Ixx / 1e4).toFixed(1)}e4</span>
                <span>{(s.Zxx / 1e3).toFixed(1)}e3</span>
                <span>{s.depth}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-3">
          <span className="text-xs font-bold text-slate-300 mb-2 block">Materials</span>
          <div className="space-y-1">
            <div className="grid grid-cols-5 gap-1 text-[8px] text-slate-500 font-mono px-1">
              <span>Name</span><span>E (MPa)</span><span>fy (MPa)</span><span>fu (MPa)</span><span>ρ (kg/m³)</span>
            </div>
            {materials.map(m => (
              <div key={m.id} className="grid grid-cols-5 gap-1 text-[9px] text-slate-300 font-mono hover:bg-[#21262d] px-1 rounded">
                <span className="text-green-400">{m.name}</span>
                <span>{m.E}</span><span>{m.fy}</span><span>{m.fu}</span><span>{m.density}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderSupports() {
    return (
      <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-3">
        <span className="text-xs font-bold text-slate-300 mb-2 block">Support Conditions (6-DOF)</span>
        <div className="space-y-1">
          <div className="grid grid-cols-8 gap-1 text-[8px] text-slate-500 font-mono px-1">
            <span>Node</span><span>Fx</span><span>Fy</span><span>Fz</span><span>Mx</span><span>My</span><span>Mz</span><span>Type</span>
          </div>
          {nodes.map(n => {
            const fixed = n.restraints.every(r => r);
            const pinned = n.restraints[0] && n.restraints[1] && !n.restraints[5];
            const free = n.restraints.every(r => !r);
            const label = fixed ? "Fixed" : pinned ? "Pinned" : free ? "Free" : "Custom";
            return (
              <div key={n.id} className="grid grid-cols-8 gap-1 items-center text-[9px] font-mono">
                <span className="text-[#00D4FF]">{n.id}</span>
                {n.restraints.map((r, i) => (
                  <div key={i} className={cn("w-4 h-4 rounded border flex items-center justify-center text-[8px]",
                    r ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "bg-[#0d1117] border-[#30363d] text-slate-600"
                  )}>{r ? "✓" : "○"}</div>
                ))}
                <span className={cn("text-[9px]", label === "Fixed" ? "text-red-400" : label === "Pinned" ? "text-amber-400" : "text-slate-500")}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderLoads() {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-3">
          <span className="text-xs font-bold text-slate-300 mb-2 block">Nodal Loads</span>
          <div className="space-y-1">
            <div className="grid grid-cols-7 gap-1 text-[8px] text-slate-500 font-mono px-1">
              <span>Node</span><span>Fx(kN)</span><span>Fy(kN)</span><span>Fz(kN)</span><span>Mx(kNm)</span><span>My(kNm)</span><span>Mz(kNm)</span>
            </div>
            {loadCase.nodalLoads.map((l, i) => (
              <div key={i} className="grid grid-cols-7 gap-1 text-[9px] text-slate-300 font-mono">
                <span className="text-[#00D4FF]">{l.nodeId}</span>
                <span className={l.fx ? "text-red-400" : ""}>{l.fx}</span>
                <span className={l.fy ? "text-red-400" : ""}>{l.fy}</span>
                <span>{l.fz}</span><span>{l.mx}</span><span>{l.my}</span><span>{l.mz}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-3">
          <span className="text-xs font-bold text-slate-300 mb-2 block">Member Loads</span>
          <div className="space-y-1">
            <div className="grid grid-cols-4 gap-1 text-[8px] text-slate-500 font-mono px-1">
              <span>Element</span><span>Type</span><span>Direction</span><span>Value</span>
            </div>
            {loadCase.memberLoads.map((l, i) => (
              <div key={i} className="grid grid-cols-4 gap-1 text-[9px] text-slate-300 font-mono">
                <span className="text-[#00D4FF]">{l.elementId}</span>
                <span className="text-amber-400">{l.type}</span>
                <span>{l.direction}</span>
                <span className="text-red-400">{l.values.join(", ")} kN/m</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderCombinations() {
    return (
      <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-3">
        <span className="text-xs font-bold text-slate-300 mb-2 block">Load Combinations (IS 456 / IS 800 / ASCE 7)</span>
        <div className="space-y-1">
          <div className="grid grid-cols-4 gap-1 text-[8px] text-slate-500 font-mono px-1">
            <span>Select</span><span>Name</span><span>Code</span><span>Factors</span>
          </div>
          {CODE_COMBINATIONS.map(c => (
            <div key={c.id} className="grid grid-cols-4 gap-1 items-center text-[9px] font-mono hover:bg-[#21262d] px-1 rounded">
              <input
                type="checkbox"
                checked={selectedCombos.includes(c.id)}
                onChange={() => setSelectedCombos(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                className="accent-[#00D4FF]"
              />
              <span className="text-slate-300">{c.name}</span>
              <span className="text-amber-400">{c.code}</span>
              <span className="text-slate-500">{c.factors.map(f => `${f.factor}×${f.loadCaseId}`).join(" + ")}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderAnalysis() {
    return (
      <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Run Structural Analysis</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Direct stiffness method • 2D frame • {nodes.length} nodes • {elements.length} elements</p>
          </div>
          <button onClick={handleRunAnalysis} disabled={running} className={cn(btnPrimary, running && "opacity-50 cursor-not-allowed")}>
            <Play size={14} />{running ? "Running..." : "Run Analysis"}
          </button>
        </div>
        {running && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400"><span>Assembling stiffness matrix...</span><span>{progress}%</span></div>
            <div className="w-full h-2 bg-[#0d1117] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#00D4FF] to-[#00ff88] transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          {[{ l: "Analysis Type", v: "Linear Static" }, { l: "Solver", v: "Gaussian Elimination" }, { l: "DOFs", v: `${nodes.length * 3}` },
           { l: "Combinations", v: `${selectedCombos.length} selected` }, { l: "Design Code", v: "IS 800:2007" }, { l: "Foundation", v: "IS 456:2000" }
          ].map(({ l, v }) => (
            <div key={l} className="bg-[#0d1117] rounded p-2">
              <div className="text-[8px] text-slate-500">{l}</div>
              <div className="text-xs text-slate-200 font-medium">{v}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderResults() {
    if (!analysisResult) return <div className="text-sm text-slate-500 text-center py-12">Run analysis first to see results.</div>;
    const subTabs = [
      { id: "forces" as const, label: "Member Forces" },
      { id: "reactions" as const, label: "Reactions" },
      { id: "design" as const, label: "Design Checks" },
      { id: "foundation" as const, label: "Foundation" },
    ];
    return (
      <div className="space-y-3">
        <div className="flex gap-1">
          {subTabs.map(t => (
            <button key={t.id} onClick={() => setResultSubTab(t.id)}
              className={cn("px-3 py-1 text-xs rounded", resultSubTab === t.id ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30" : "text-slate-500 hover:text-slate-300")}>
              {t.label}
            </button>
          ))}
          <button className={cn(btnPrimary, "ml-auto")} onClick={() => {
            const text = JSON.stringify(analysisResult, null, 2);
            const blob = new Blob([text], { type: "text/plain" });
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "structural-results.json"; a.click();
          }}><Download size={12} />Export</button>
        </div>

        {resultSubTab === "forces" && (
          <div className="space-y-3">
            {analysisResult.memberResults.map(mr => {
              const maxForce = Math.max(...[...mr.axialForce, ...mr.shearY, ...mr.momentZ].map(Math.abs), 1);
              return (
                <div key={mr.elementId} className="bg-[#161b22] border border-[#21262d] rounded-lg p-3">
                  <span className="text-[10px] font-bold text-[#00D4FF]">Element {mr.elementId}</span>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <BarDiagram data={mr.axialForce} maxVal={maxForce} label="Axial Force (kN)" color="#22d3ee" />
                    <BarDiagram data={mr.shearY} maxVal={maxForce} label="Shear Force (kN)" color="#f59e0b" />
                    <BarDiagram data={mr.momentZ} maxVal={maxForce} label="Bending Moment (kNm)" color="#a78bfa" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {resultSubTab === "reactions" && (
          <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-3">
            <div className="grid grid-cols-7 gap-1 text-[8px] text-slate-500 font-mono px-1 mb-1">
              <span>Node</span><span>Fx (kN)</span><span>Fy (kN)</span><span>Fz (kN)</span><span>Mx (kNm)</span><span>My (kNm)</span><span>Mz (kNm)</span>
            </div>
            {analysisResult.reactions.map(r => (
              <div key={r.nodeId} className="grid grid-cols-7 gap-1 text-[9px] font-mono text-slate-300">
                <span className="text-[#00D4FF]">{r.nodeId}</span>
                <span>{r.fx.toFixed(2)}</span><span>{r.fy.toFixed(2)}</span><span>{r.fz.toFixed(2)}</span>
                <span>{r.mx.toFixed(2)}</span><span>{r.my.toFixed(2)}</span><span>{r.mz.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {resultSubTab === "design" && (
          <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-3">
            <span className="text-xs font-bold text-slate-300 mb-2 block">Member Design Check — IS 800:2007</span>
            <div className="grid grid-cols-7 gap-1 text-[8px] text-slate-500 font-mono px-1 mb-1">
              <span>Element</span><span>Axial</span><span>Bending</span><span>Shear</span><span>Combined</span><span>Deflection</span><span>Status</span>
            </div>
            {analysisResult.designChecks.map(dc => (
              <div key={dc.elementId} className="grid grid-cols-7 gap-1 text-[9px] font-mono items-center">
                <span className="text-[#00D4FF]">{dc.elementId}</span>
                <span>{dc.axialRatio.toFixed(3)}</span>
                <span>{dc.bendingRatio.toFixed(3)}</span>
                <span>{dc.shearRatio.toFixed(3)}</span>
                <span className={dc.combinedRatio > 1 ? "text-red-400 font-bold" : "text-green-400"}>{dc.combinedRatio.toFixed(3)}</span>
                <span>{dc.deflectionRatio.toFixed(3)}</span>
                <span className="flex items-center gap-1">
                  {dc.status === "PASS" ? <CheckCircle2 size={11} className="text-green-400" /> : <AlertTriangle size={11} className="text-red-400" />}
                  <span className={dc.status === "PASS" ? "text-green-400" : "text-red-400"}>{dc.status}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {resultSubTab === "foundation" && footingResult && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-3">
              <span className="text-xs font-bold text-slate-300 mb-2 block">Isolated Footing Design (IS 456)</span>
              <div className="space-y-1 text-[10px]">
                {[
                  ["Size", `${footingResult.lengthM}m × ${footingResult.widthM}m × ${footingResult.depthMm}mm`],
                  ["Max Soil Pressure", `${footingResult.soilPressureMax} kN/m²`],
                  ["Punching Shear Ratio", footingResult.punchingShearRatio.toString()],
                  ["One-Way Shear Ratio", footingResult.oneWayShearRatio.toString()],
                  ["Flexure Ratio", footingResult.flexureRatio.toString()],
                  ["Concrete Volume", `${footingResult.concreteVolume} m³`],
                  ["Steel Weight", `${footingResult.steelWeight} kg`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className="text-slate-200 font-mono">{v}</span></div>
                ))}
                <div className={cn("mt-1 px-2 py-1 rounded text-center font-bold", footingResult.status === "SAFE" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                  {footingResult.status}
                </div>
              </div>
            </div>
            <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-3">
              <span className="text-xs font-bold text-slate-300 mb-2 block">Design Steps</span>
              <div className="space-y-0.5 max-h-52 overflow-y-auto">
                {footingResult.designSteps.map((s, i) => (
                  <div key={i} className="text-[9px] text-slate-400 font-mono leading-relaxed">
                    <span className="text-[#00D4FF] mr-1">{i + 1}.</span>{s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const tabRenderers: Record<Tab, () => React.ReactNode> = {
    model: renderModel, properties: renderProperties, supports: renderSupports,
    loads: renderLoads, combinations: renderCombinations, analysis: renderAnalysis, results: renderResults,
  };

  return (
    <div className="h-full flex flex-col bg-[#0d1117] text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#21262d]">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-[#00D4FF]" />
          <h1 className="text-sm font-bold">Structural Analysis</h1>
          <span className="text-[9px] text-slate-600 bg-[#161b22] px-2 py-0.5 rounded border border-[#21262d]">STAAD Pro-style</span>
        </div>
        <div className="flex items-center gap-2">
          <Settings2 size={14} className="text-slate-500" />
          <span className="text-[10px] text-slate-500">IS 800 / IS 456</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-4 py-1.5 border-b border-[#21262d] bg-[#0d1117]">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all",
              activeTab === t.id ? "bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/25" : "text-slate-500 hover:text-slate-300 hover:bg-[#161b22]"
            )}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tabRenderers[activeTab]()}
      </div>
    </div>
  );
}
