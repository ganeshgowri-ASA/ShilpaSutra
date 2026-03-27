"use client";
import type {
  StructuralNode,
  BeamElement,
  SectionProfile,
  StructuralMaterial,
  LoadCase,
} from "@/lib/structural-engine";

// ---- Geometry Tab ----
export function GeometryTab({
  nodes, setNodes, elements, setElements,
}: {
  nodes: StructuralNode[];
  setNodes: (n: StructuralNode[]) => void;
  elements: BeamElement[];
  setElements: (e: BeamElement[]) => void;
}) {
  return (
    <div className="flex gap-4 p-4 overflow-auto flex-1">
      <div className="flex-1">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Nodes</p>
        <table className="w-full text-xs text-slate-300 border-collapse mb-4">
          <thead>
            <tr className="text-slate-500 border-b border-[#21262d]">
              <th className="text-left py-1 pr-2">ID</th>
              <th className="text-right pr-2">X (mm)</th>
              <th className="text-right pr-2">Y (mm)</th>
              <th className="text-right pr-2">Z (mm)</th>
              <th className="text-left pl-2">Restraints</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((n) => (
              <tr key={n.id} className="border-b border-[#21262d]/50">
                <td className="py-1 pr-2 text-cyan-400">{n.id}</td>
                <td className="text-right pr-2">{n.x}</td>
                <td className="text-right pr-2">{n.y}</td>
                <td className="text-right pr-2">{n.z}</td>
                <td className="text-slate-500 pl-2 font-mono">{n.restraints.map((r) => (r ? "1" : "0")).join(" ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={() => {
            const id = `N${nodes.length + 1}`;
            setNodes([...nodes, { id, x: 0, y: 0, z: 0, restraints: [false, false, false, false, false, false] }]);
          }}
          className="text-xs bg-[#21262d] hover:bg-[#30363d] text-slate-300 px-3 py-1 rounded transition-colors"
        >
          + Add Node
        </button>
      </div>
      <div className="flex-1">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Members</p>
        <table className="w-full text-xs text-slate-300 border-collapse mb-4">
          <thead>
            <tr className="text-slate-500 border-b border-[#21262d]">
              <th className="text-left py-1 pr-2">ID</th>
              <th className="text-left pr-2">Node I</th>
              <th className="text-left pr-2">Node J</th>
              <th className="text-left pr-2">Section</th>
              <th className="text-left">Type</th>
            </tr>
          </thead>
          <tbody>
            {elements.map((e) => (
              <tr key={e.id} className="border-b border-[#21262d]/50">
                <td className="py-1 pr-2 text-cyan-400">{e.id}</td>
                <td className="pr-2">{e.nodeI}</td>
                <td className="pr-2">{e.nodeJ}</td>
                <td className="pr-2 text-yellow-400">{e.sectionId}</td>
                <td className="capitalize text-slate-400">{e.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={() => {
            const id = `B${elements.length + 1}`;
            setElements([...elements, { id, nodeI: "N1", nodeJ: "N2", sectionId: "S1", materialId: "M1", type: "beam" }]);
          }}
          className="text-xs bg-[#21262d] hover:bg-[#30363d] text-slate-300 px-3 py-1 rounded transition-colors"
        >
          + Add Member
        </button>
      </div>
    </div>
  );
}

// ---- Loads Tab ----
export function LoadsTab({
  loadCase, setLoadCase,
}: {
  loadCase: LoadCase;
  setLoadCase: (lc: LoadCase) => void;
}) {
  return (
    <div className="flex flex-col gap-4 p-4 overflow-auto flex-1">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400">Case Name</label>
          <input
            className="mt-1 w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500"
            value={loadCase.name}
            onChange={(e) => setLoadCase({ ...loadCase, name: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">Type</label>
          <select
            className="mt-1 w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500"
            value={loadCase.type}
            onChange={(e) => setLoadCase({ ...loadCase, type: e.target.value as LoadCase["type"] })}
          >
            {["dead", "live", "wind", "seismic", "temperature", "other"].map((t) => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Member Loads</p>
        <table className="w-full text-xs text-slate-300 border-collapse">
          <thead>
            <tr className="text-slate-500 border-b border-[#21262d]">
              <th className="text-left py-1 pr-3">Member</th>
              <th className="text-left pr-3">Type</th>
              <th className="text-left pr-3">Direction</th>
              <th className="text-right">Value (kN or kN/m)</th>
            </tr>
          </thead>
          <tbody>
            {loadCase.memberLoads.map((l, i) => (
              <tr key={i} className="border-b border-[#21262d]/50">
                <td className="py-1 pr-3 text-cyan-400">{l.elementId}</td>
                <td className="pr-3">{l.type}</td>
                <td className="pr-3">{l.direction}</td>
                <td className="text-right">{l.values.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Nodal Loads</p>
        <table className="w-full text-xs text-slate-300 border-collapse">
          <thead>
            <tr className="text-slate-500 border-b border-[#21262d]">
              <th className="text-left py-1 pr-3">Node</th>
              <th className="text-right pr-3">Fx (kN)</th>
              <th className="text-right pr-3">Fy (kN)</th>
              <th className="text-right">Mz (kNm)</th>
            </tr>
          </thead>
          <tbody>
            {loadCase.nodalLoads.map((l, i) => (
              <tr key={i} className="border-b border-[#21262d]/50">
                <td className="py-1 pr-3 text-cyan-400">{l.nodeId}</td>
                <td className="text-right pr-3">{l.fx}</td>
                <td className="text-right pr-3">{l.fy}</td>
                <td className="text-right">{l.mz}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Materials Tab ----
export function MaterialsTab({
  sections, materials,
}: {
  sections: SectionProfile[];
  materials: StructuralMaterial[];
}) {
  return (
    <div className="flex gap-4 p-4 overflow-auto flex-1">
      <div className="flex-1">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Sections</p>
        {sections.map((s) => (
          <div key={s.id} className="bg-[#161b22] border border-[#21262d] rounded p-3 mb-2 text-xs">
            <p className="text-cyan-400 font-medium mb-1">{s.name} ({s.id})</p>
            <div className="grid grid-cols-3 gap-1 text-slate-400">
              <span>Area: {s.area.toLocaleString()} mm²</span>
              <span>Ixx: {(s.Ixx / 1e4).toFixed(0)} cm⁴</span>
              <span>Iyy: {(s.Iyy / 1e4).toFixed(0)} cm⁴</span>
              <span>Depth: {s.depth} mm</span>
              <span>Width: {s.width} mm</span>
              <span>Type: {s.type.toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Materials</p>
        {materials.map((m) => (
          <div key={m.id} className="bg-[#161b22] border border-[#21262d] rounded p-3 mb-2 text-xs">
            <p className="text-yellow-400 font-medium mb-1">{m.name} ({m.id})</p>
            <div className="grid grid-cols-3 gap-1 text-slate-400">
              <span>E: {m.E.toLocaleString()} MPa</span>
              <span>G: {m.G.toLocaleString()} MPa</span>
              <span>fy: {m.fy} MPa</span>
              <span>fu: {m.fu} MPa</span>
              <span>ρ: {m.density} kg/m³</span>
              <span>ν: {m.poisson}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Analysis Tab ----
export function AnalysisTab({
  comboName, setComboName, comboFactor, setComboFactor, onRun, running, log,
}: {
  comboName: string;
  setComboName: (v: string) => void;
  comboFactor: number;
  setComboFactor: (v: number) => void;
  onRun: () => void;
  running: boolean;
  log: string[];
}) {
  return (
    <div className="flex flex-col gap-4 p-4 overflow-auto flex-1">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400">Combination Name</label>
          <input
            className="mt-1 w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500"
            value={comboName}
            onChange={(e) => setComboName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">Load Factor</label>
          <input
            type="number" step="0.1"
            className="mt-1 w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500"
            value={comboFactor}
            onChange={(e) => setComboFactor(parseFloat(e.target.value))}
          />
        </div>
      </div>
      <div className="flex gap-2">
        {["Linear Static", "P-Delta", "Modal", "Buckling"].map((m) => (
          <button
            key={m}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              m === "Linear Static"
                ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                : "border-[#30363d] text-slate-500 cursor-not-allowed"
            }`}
            disabled={m !== "Linear Static"}
          >
            {m}
          </button>
        ))}
      </div>
      <button
        onClick={onRun}
        disabled={running}
        className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold text-sm py-2 rounded transition-colors"
      >
        {running ? "Analyzing..." : "Run Analysis"}
      </button>
      {log.length > 0 && (
        <div className="bg-[#0d1117] border border-[#21262d] rounded p-3 font-mono text-xs text-slate-400 space-y-0.5">
          {log.map((line, i) => <p key={i}>{line}</p>)}
        </div>
      )}
    </div>
  );
}
