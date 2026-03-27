"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { Play, Square, Trash2, Plus, Zap, ChevronDown, ChevronUp, BarChart2 } from "lucide-react";
import {
  BlockType, BlockDef, Wire, SimResult, SystemAnalysis,
  BW, BH, PORT_R, BLOCK_COLORS, BLOCK_LABELS, DEFAULT_PARAMS,
  INPUT_PORTS, OUTPUT_PORTS, LIBRARY_GROUPS,
} from "./sim-types";
import { runSimulation, portPos, bezierPath, uid } from "./sim-engine";
import { analyzeSystem } from "./sim-analysis";
import { CONTROL_TEMPLATES } from "./sim-templates";
import { ScopePanel, ScopePlot } from "./ScopePanel";
import { SystemAnalysisPanel } from "./SystemAnalysisPanel";

// ─── Default diagram ──────────────────────────────────────────────────────────

const defaultBlocks: BlockDef[] = [
  { id: "src1", type: "source", name: "Sine",      x: 60,  y: 120, params: { signal: "sine", amplitude: 1, frequency: 1 } },
  { id: "g1",   type: "gain",   name: "Gain ×2",   x: 240, y: 120, params: { gain: 2 } },
  { id: "tf1",  type: "tf",     name: "1st Order",  x: 420, y: 120, params: { num: "1", den: "0.5 1" } },
  { id: "sc1",  type: "scope",  name: "Output",     x: 620, y: 120, params: {} },
];
const defaultWires: Wire[] = [
  { id: "w1", fromId: "src1", fromPort: 0, toId: "g1",  toPort: 0 },
  { id: "w2", fromId: "g1",   fromPort: 0, toId: "tf1", toPort: 0 },
  { id: "w3", fromId: "tf1",  fromPort: 0, toId: "sc1", toPort: 0 },
];

// ─── Param input helper ───────────────────────────────────────────────────────

function ParamInput({ label, k, block, update }: {
  label: string; k: string; block: BlockDef;
  update: (key: string, value: number) => void;
}) {
  return (
    <div>
      <label className="text-[10px] text-slate-500 block mb-1">{label}</label>
      <input type="number" step="any" value={Number(block.params[k]) || 0}
        onChange={(e) => update(k, parseFloat(e.target.value) || 0)}
        className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white font-mono" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SimScapePage() {
  const [blocks, setBlocks] = useState<BlockDef[]>(defaultBlocks);
  const [wires, setWires] = useState<Wire[]>(defaultWires);
  const [selected, setSelected] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [analysis, setAnalysis] = useState<SystemAnalysis | null>(null);
  const [running, setRunning] = useState(false);
  const [tEnd, setTEnd] = useState(10);
  const [steps, setSteps] = useState(500);
  const [scopeOpen, setScopeOpen] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [pendingWire, setPendingWire] = useState<{ fromId: string; fromPort: number; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const draggingRef = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const selectedBlock = blocks.find((b) => b.id === selected);

  const handleRun = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const result = runSimulation(blocks, wires, tEnd, steps);
      setSimResult(result);
      // Find first scope block for step response metrics
      const scopeB = blocks.find((b) => b.type === "scope");
      const scopeSig = scopeB ? { time: result.time, values: result.signals[scopeB.id] ?? [] } : undefined;
      setAnalysis(analyzeSystem(blocks, wires, scopeSig));
      setRunning(false);
    }, 50);
  }, [blocks, wires, tEnd, steps]);

  const addBlock = useCallback((type: BlockType) => {
    const id = uid();
    setBlocks((prev) => [...prev, {
      id, type, name: BLOCK_LABELS[type],
      x: 80 + Math.random() * 300, y: 80 + Math.random() * 200,
      params: { ...DEFAULT_PARAMS[type] },
    }]);
    setSelected(id);
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selected) return;
    setBlocks((p) => p.filter((b) => b.id !== selected));
    setWires((p) => p.filter((w) => w.fromId !== selected && w.toId !== selected));
    setSelected(null);
  }, [selected]);

  const loadTemplate = useCallback((idx: number) => {
    const t = CONTROL_TEMPLATES[idx];
    if (!t) return;
    setBlocks([...t.blocks]);
    setWires([...t.wires]);
    setSelected(null);
    setSimResult(null);
    setAnalysis(null);
  }, []);

  const onBlockMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelected(id);
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    draggingRef.current = { id, ox: e.clientX - block.x, oy: e.clientY - block.y };
  }, [blocks]);

  const onCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (draggingRef.current) {
      const { id, ox, oy } = draggingRef.current;
      setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, x: e.clientX - ox, y: e.clientY - oy } : b));
    }
  }, []);

  const onCanvasMouseUp = useCallback(() => { draggingRef.current = null; setPendingWire(null); }, []);

  const onOutputPortClick = useCallback((e: React.MouseEvent, blockId: string, port: number) => {
    e.stopPropagation();
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const pos = portPos(block, "out", port, OUTPUT_PORTS[block.type]);
    setPendingWire({ fromId: blockId, fromPort: port, x: pos.x, y: pos.y });
  }, [blocks]);

  const onInputPortClick = useCallback((e: React.MouseEvent, blockId: string, port: number) => {
    e.stopPropagation();
    if (!pendingWire || pendingWire.fromId === blockId) { setPendingWire(null); return; }
    setWires((prev) => {
      const filtered = prev.filter((w) => !(w.toId === blockId && w.toPort === port));
      return [...filtered, { id: uid(), fromId: pendingWire.fromId, fromPort: pendingWire.fromPort, toId: blockId, toPort: port }];
    });
    setPendingWire(null);
    setSimResult(null);
  }, [pendingWire]);

  const updateParam = useCallback((key: string, value: string | number) => {
    if (!selected) return;
    setBlocks((prev) => prev.map((b) => b.id === selected ? { ...b, params: { ...b.params, [key]: value } } : b));
    setSimResult(null);
  }, [selected]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (document.activeElement?.tagName === "INPUT") return;
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected]);

  const scopeBlocks = blocks.filter((b) => b.type === "scope" || b.type === "bode" || b.type === "rootlocus" || b.type === "nyquist");

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117] text-white">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#161b22] border-b border-[#21262d] shrink-0 flex-wrap">
        <Zap size={16} className="text-[#00D4FF] shrink-0" />
        <h1 className="text-sm font-bold text-white shrink-0">SimScape</h1>
        {/* Template dropdown */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-slate-500 shrink-0">Template:</span>
          <select onChange={(e) => loadTemplate(Number(e.target.value))} defaultValue=""
            className="bg-[#0d1117] border border-[#21262d] rounded px-2 py-0.5 text-[11px] text-slate-300 cursor-pointer">
            <option value="" disabled>Select…</option>
            {CONTROL_TEMPLATES.map((t, i) => <option key={i} value={i}>{t.name}</option>)}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-slate-500">t_end</span>
          <input value={tEnd} onChange={(e) => setTEnd(Number(e.target.value))} type="number" min={1} max={200}
            className="w-14 bg-[#0d1117] border border-[#21262d] rounded px-2 py-0.5 text-xs text-white" />
          <span className="text-[10px] text-slate-500">steps</span>
          <input value={steps} onChange={(e) => setSteps(Number(e.target.value))} type="number" min={50} max={2000}
            className="w-18 bg-[#0d1117] border border-[#21262d] rounded px-2 py-0.5 text-xs text-white" />
          <button onClick={() => setShowAnalysis((v) => !v)}
            className={`px-2 py-1 rounded border text-xs flex items-center gap-1 transition-colors ${showAnalysis ? "border-[#be185d] text-[#f472b6]" : "border-[#21262d] text-slate-400 hover:text-white"}`}>
            <BarChart2 size={11} /> Analysis
          </button>
          <button onClick={() => { setBlocks([]); setWires([]); setSimResult(null); setSelected(null); setAnalysis(null); }}
            className="px-2 py-1 rounded border border-[#21262d] text-slate-400 hover:text-white text-xs flex items-center gap-1">
            <Trash2 size={12} /> Clear
          </button>
          <button onClick={handleRun} disabled={running}
            className="px-3 py-1 rounded bg-green-600/80 hover:bg-green-600 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-50">
            {running ? <><Square size={12} /> Running…</> : <><Play size={12} /> Run</>}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: block palette */}
        <div className="w-36 bg-[#161b22] border-r border-[#21262d] flex flex-col overflow-y-auto p-2 gap-2 shrink-0">
          {LIBRARY_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="text-[8px] text-slate-600 uppercase tracking-wider px-1 mb-1">{group.label}</div>
              {group.types.map((type) => (
                <button key={type} onClick={() => addBlock(type)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded border border-[#21262d] text-xs text-slate-300 hover:text-white hover:border-slate-600 transition-colors text-left group mb-0.5">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: BLOCK_COLORS[type] }} />
                  <span className="truncate text-[10px]">{BLOCK_LABELS[type]}</span>
                  <Plus size={9} className="ml-auto opacity-0 group-hover:opacity-100 shrink-0" />
                </button>
              ))}
            </div>
          ))}
          {selected && (
            <button onClick={deleteSelected}
              className="mt-auto flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 border border-red-900/40 hover:bg-red-900/20">
              <Trash2 size={10} /> Delete
            </button>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={canvasRef} className="flex-1 relative overflow-auto bg-[#0a0a1a] cursor-default select-none"
            style={{ backgroundImage: "radial-gradient(circle, #1e293b 1px, transparent 1px)", backgroundSize: "24px 24px" }}
            onMouseMove={onCanvasMouseMove} onMouseUp={onCanvasMouseUp} onClick={() => { setSelected(null); setPendingWire(null); }}>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
              {wires.map((w) => {
                const fb = blocks.find((b) => b.id === w.fromId), tb = blocks.find((b) => b.id === w.toId);
                if (!fb || !tb) return null;
                const fp = portPos(fb, "out", w.fromPort, OUTPUT_PORTS[fb.type]);
                const tp = portPos(tb, "in",  w.toPort,  INPUT_PORTS[tb.type]);
                return <path key={w.id} d={bezierPath(fp.x, fp.y, tp.x, tp.y)} fill="none" stroke="#00D4FF" strokeWidth={1.5} strokeOpacity={0.7} />;
              })}
              {pendingWire && (
                <path d={bezierPath(pendingWire.x, pendingWire.y, mousePos.x, mousePos.y)}
                  fill="none" stroke="#00D4FF" strokeWidth={1.5} strokeDasharray="6 3" strokeOpacity={0.5} />
              )}
            </svg>

            {blocks.map((block) => {
              const color = BLOCK_COLORS[block.type];
              const isSelected = selected === block.id;
              const inPorts = INPUT_PORTS[block.type], outPorts = OUTPUT_PORTS[block.type];
              const scopeVals = simResult?.signals[block.id];
              const isViewer = ["scope","bode","rootlocus","nyquist"].includes(block.type);
              return (
                <div key={block.id} style={{ position: "absolute", left: block.x, top: block.y, width: BW, height: isViewer && scopeVals ? BH + 44 : BH, userSelect: "none" }}
                  onMouseDown={(e) => onBlockMouseDown(e, block.id)}>
                  <div style={{ width: BW, height: BH, borderColor: isSelected ? "#00D4FF" : color, borderWidth: isSelected ? 2 : 1 }}
                    className="absolute rounded-lg border bg-[#161b22] flex flex-col items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden shadow-lg">
                    <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-lg" style={{ background: color }} />
                    <span className="text-[10px] font-bold mt-1 px-1 truncate w-full text-center" style={{ color }}>{BLOCK_LABELS[block.type]}</span>
                    <span className="text-[9px] text-slate-400 truncate w-full text-center px-1">{block.name}</span>
                    {block.type === "gain" && <span className="text-[9px] text-slate-500 font-mono">K={block.params.gain}</span>}
                    {(block.type === "tf" || block.type === "plant") && <span className="text-[9px] text-slate-500 font-mono">{block.params.num}/{block.params.den}</span>}
                    {block.type === "source" && <span className="text-[9px] text-slate-500">{block.params.signal} A={block.params.amplitude}</span>}
                    {block.type === "pid" && <span className="text-[9px] text-slate-500 font-mono">Kp={block.params.kp}</span>}
                    {block.type === "saturation" && <span className="text-[9px] text-slate-500 font-mono">[{block.params.min},{block.params.max}]</span>}
                    {block.type === "delay" && <span className="text-[9px] text-slate-500 font-mono">Td={block.params.delay}s</span>}
                    {isViewer && scopeVals && simResult && <div className="px-1 pb-1"><ScopePlot values={scopeVals} /></div>}
                  </div>
                  {Array.from({ length: inPorts }).map((_, i) => {
                    const pos = portPos(block, "in", i, inPorts);
                    return <div key={i} style={{ position: "absolute", left: pos.x - block.x - PORT_R, top: pos.y - block.y - PORT_R, width: PORT_R * 2, height: PORT_R * 2 }}
                      className="rounded-full bg-slate-600 border border-slate-500 cursor-crosshair hover:bg-[#00D4FF] transition-colors z-10 pointer-events-auto"
                      onClick={(e) => onInputPortClick(e, block.id, i)} />;
                  })}
                  {Array.from({ length: outPorts }).map((_, i) => {
                    const pos = portPos(block, "out", i, outPorts);
                    return <div key={i} style={{ position: "absolute", left: pos.x - block.x - PORT_R, top: pos.y - block.y - PORT_R, width: PORT_R * 2, height: PORT_R * 2, background: pendingWire ? "#4ade80" : "#374151", borderRadius: "50%", border: "1px solid #64748b", cursor: "crosshair", zIndex: 10 }}
                      onClick={(e) => onOutputPortClick(e, block.id, i)} />;
                  })}
                </div>
              );
            })}
          </div>

          <ScopePanel scopeBlocks={scopeBlocks} simResult={simResult} tEnd={tEnd} analysis={analysis} open={scopeOpen} onToggle={() => setScopeOpen((v) => !v)} />
        </div>

        {/* Right: param panel or analysis panel */}
        {showAnalysis && analysis ? (
          <SystemAnalysisPanel analysis={analysis} />
        ) : selectedBlock ? (
          <div className="w-52 bg-[#161b22] border-l border-[#21262d] flex flex-col overflow-y-auto p-3 gap-3 shrink-0">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Parameters</div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Name</label>
              <input value={selectedBlock.name} onChange={(e) => setBlocks((prev) => prev.map((b) => b.id === selected ? { ...b, name: e.target.value } : b))}
                className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white" />
            </div>
            <div className="h-px bg-[#21262d]" />
            <div className="text-[10px]" style={{ color: BLOCK_COLORS[selectedBlock.type] }}>{BLOCK_LABELS[selectedBlock.type]}</div>
            {selectedBlock.type === "source" && <>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Signal</label>
                <select value={String(selectedBlock.params.signal)} onChange={(e) => updateParam("signal", e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white">
                  {["sine","cosine","step","ramp","square"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <ParamInput label="Amplitude" k="amplitude" block={selectedBlock} update={updateParam} />
              {["sine","cosine","square"].includes(String(selectedBlock.params.signal)) && <ParamInput label="Frequency (Hz)" k="frequency" block={selectedBlock} update={updateParam} />}
              {selectedBlock.params.signal === "step" && <ParamInput label="Step Time (s)" k="stepTime" block={selectedBlock} update={updateParam} />}
            </>}
            {selectedBlock.type === "step_input" && <><ParamInput label="Amplitude" k="amplitude" block={selectedBlock} update={updateParam} /><ParamInput label="Step Time (s)" k="stepTime" block={selectedBlock} update={updateParam} /></>}
            {selectedBlock.type === "ramp_input" && <ParamInput label="Slope" k="slope" block={selectedBlock} update={updateParam} />}
            {selectedBlock.type === "gain" && <ParamInput label="Gain (K)" k="gain" block={selectedBlock} update={updateParam} />}
            {selectedBlock.type === "constant" && <ParamInput label="Value" k="value" block={selectedBlock} update={updateParam} />}
            {selectedBlock.type === "integrator" && <ParamInput label="Initial Condition" k="ic" block={selectedBlock} update={updateParam} />}
            {(selectedBlock.type === "sum" || selectedBlock.type === "feedback") && (
              <div><label className="text-[10px] text-slate-500 block mb-1">Signs (++ or +-)</label>
                <input value={String(selectedBlock.params.signs)} onChange={(e) => updateParam("signs", e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white font-mono" /></div>
            )}
            {(selectedBlock.type === "tf" || selectedBlock.type === "plant") && <>
              <div><label className="text-[10px] text-slate-500 block mb-1">Numerator</label>
                <input value={String(selectedBlock.params.num)} onChange={(e) => updateParam("num", e.target.value)} className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white font-mono" /></div>
              <div><label className="text-[10px] text-slate-500 block mb-1">Denominator</label>
                <input value={String(selectedBlock.params.den)} onChange={(e) => updateParam("den", e.target.value)} className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white font-mono" /></div>
            </>}
            {selectedBlock.type === "pid" && <><ParamInput label="Kp" k="kp" block={selectedBlock} update={updateParam} /><ParamInput label="Ki" k="ki" block={selectedBlock} update={updateParam} /><ParamInput label="Kd" k="kd" block={selectedBlock} update={updateParam} /></>}
            {selectedBlock.type === "saturation" && <><ParamInput label="Min" k="min" block={selectedBlock} update={updateParam} /><ParamInput label="Max" k="max" block={selectedBlock} update={updateParam} /></>}
            {selectedBlock.type === "delay" && <ParamInput label="Delay (s)" k="delay" block={selectedBlock} update={updateParam} />}
            {selectedBlock.type === "statespace" && <>
              <div><label className="text-[10px] text-slate-500 block mb-1">A (state)</label>
                <input value={String(selectedBlock.params.a)} onChange={(e) => updateParam("a", e.target.value)} className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white font-mono" /></div>
              <div><label className="text-[10px] text-slate-500 block mb-1">B (input)</label>
                <input value={String(selectedBlock.params.b)} onChange={(e) => updateParam("b", e.target.value)} className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white font-mono" /></div>
              <div><label className="text-[10px] text-slate-500 block mb-1">C (output)</label>
                <input value={String(selectedBlock.params.c)} onChange={(e) => updateParam("c", e.target.value)} className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white font-mono" /></div>
              <div><label className="text-[10px] text-slate-500 block mb-1">D (feedthrough)</label>
                <input value={String(selectedBlock.params.d)} onChange={(e) => updateParam("d", e.target.value)} className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white font-mono" /></div>
              <ParamInput label="Initial Condition" k="ic" block={selectedBlock} update={updateParam} />
            </>}
            <div className="mt-auto text-[9px] text-slate-600 font-mono">ID: {selectedBlock.id}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
