"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { Play, Square, Trash2, Plus, Zap, ChevronDown, ChevronUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType = "source" | "gain" | "sum" | "integrator" | "tf" | "pid" | "scope" | "constant";

interface BlockDef {
  id: string;
  type: BlockType;
  name: string;
  x: number;
  y: number;
  params: Record<string, number | string>;
}

interface Wire {
  id: string;
  fromId: string;
  fromPort: number;
  toId: string;
  toPort: number;
}

interface SimResult {
  time: number[];
  signals: Record<string, number[]>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BW = 120, BH = 56;
const PORT_R = 5;

const BLOCK_COLORS: Record<BlockType, string> = {
  source:     "#16a34a",
  gain:       "#2563eb",
  sum:        "#ea580c",
  integrator: "#7c3aed",
  tf:         "#0891b2",
  pid:        "#ca8a04",
  scope:      "#dc2626",
  constant:   "#475569",
};

const BLOCK_LABELS: Record<BlockType, string> = {
  source:     "Source",
  gain:       "Gain",
  sum:        "Sum",
  integrator: "∫ 1/s",
  tf:         "TF",
  pid:        "PID",
  scope:      "Scope",
  constant:   "K",
};

const DEFAULT_PARAMS: Record<BlockType, Record<string, number | string>> = {
  source:     { signal: "sine", amplitude: 1, frequency: 1, stepTime: 1 },
  gain:       { gain: 2 },
  sum:        { signs: "++" },
  integrator: { ic: 0 },
  tf:         { num: "1", den: "1 1" },
  pid:        { kp: 1, ki: 0.1, kd: 0.01 },
  scope:      {},
  constant:   { value: 1 },
};

// Number of input ports per block type
const INPUT_PORTS: Record<BlockType, number> = {
  source: 0, constant: 0,
  gain: 1, integrator: 1, tf: 1, scope: 1,
  sum: 2, pid: 1,
};
const OUTPUT_PORTS: Record<BlockType, number> = {
  source: 1, constant: 1, gain: 1, integrator: 1,
  tf: 1, pid: 1, sum: 1, scope: 0,
};

// ─── Simulation engine ────────────────────────────────────────────────────────

function runSimulation(blocks: BlockDef[], wires: Wire[], tEnd = 10, steps = 500): SimResult {
  const dt = tEnd / steps;
  const time = Array.from({ length: steps }, (_, i) => i * dt);
  const signals: Record<string, number[]> = {};
  blocks.forEach((b) => { signals[b.id] = new Array(steps).fill(0); });

  // Simple state per block
  const state: Record<string, Record<string, number>> = {};
  blocks.forEach((b) => { state[b.id] = { intState: 0, pidInt: 0, pidPrev: 0 }; });

  // Build adjacency: toId -> fromId list
  const incomingMap: Record<string, string[]> = {};
  blocks.forEach((b) => { incomingMap[b.id] = []; });
  wires.forEach((w) => {
    if (!incomingMap[w.toId]) incomingMap[w.toId] = [];
    incomingMap[w.toId].push(w.fromId);
  });

  // Topological sort (simple)
  const sorted = topSort(blocks, wires);

  for (let n = 0; n < steps; n++) {
    const t = time[n];
    for (const block of sorted) {
      const inputs = (incomingMap[block.id] || []).map((id) => signals[id][n] ?? 0);
      const u = inputs[0] ?? 0;
      const p = block.params;

      switch (block.type) {
        case "source": {
          const A = Number(p.amplitude) || 1;
          const f = Number(p.frequency) || 1;
          if (p.signal === "sine") signals[block.id][n] = A * Math.sin(2 * Math.PI * f * t);
          else if (p.signal === "cosine") signals[block.id][n] = A * Math.cos(2 * Math.PI * f * t);
          else if (p.signal === "step") signals[block.id][n] = t >= (Number(p.stepTime) || 1) ? A : 0;
          else if (p.signal === "ramp") signals[block.id][n] = A * t;
          else if (p.signal === "square") signals[block.id][n] = A * Math.sign(Math.sin(2 * Math.PI * f * t));
          break;
        }
        case "constant":
          signals[block.id][n] = Number(p.value) || 1;
          break;
        case "gain":
          signals[block.id][n] = u * (Number(p.gain) || 1);
          break;
        case "sum": {
          const signs = String(p.signs || "++");
          let s = 0;
          inputs.forEach((v, i) => { s += (signs[i] === "-" ? -1 : 1) * v; });
          signals[block.id][n] = s;
          break;
        }
        case "integrator": {
          if (n === 0) { signals[block.id][n] = Number(p.ic) || 0; state[block.id].intState = Number(p.ic) || 0; }
          else { state[block.id].intState += u * dt; signals[block.id][n] = state[block.id].intState; }
          break;
        }
        case "tf": {
          // Simple 1st-order: Y(s)/U(s) = 1/(tau*s + 1) approx
          // den: "tau 1" means tau*s + 1
          const denParts = String(p.den || "1 1").trim().split(/\s+/).map(Number);
          const tau = denParts.length >= 2 ? (denParts[0] || 1) : 1;
          const a = dt / (tau + dt);
          if (n === 0) { signals[block.id][n] = 0; }
          else { signals[block.id][n] = (1 - a) * (signals[block.id][n - 1] ?? 0) + a * u; }
          break;
        }
        case "pid": {
          const Kp = Number(p.kp) || 1;
          const Ki = Number(p.ki) || 0;
          const Kd = Number(p.kd) || 0;
          if (n === 0) { state[block.id].pidInt = 0; state[block.id].pidPrev = u; }
          state[block.id].pidInt += u * dt;
          const deriv = n === 0 ? 0 : (u - state[block.id].pidPrev) / dt;
          state[block.id].pidPrev = u;
          signals[block.id][n] = Kp * u + Ki * state[block.id].pidInt + Kd * deriv;
          break;
        }
        case "scope":
          signals[block.id][n] = u;
          break;
      }
    }
  }
  return { time, signals };
}

function topSort(blocks: BlockDef[], wires: Wire[]): BlockDef[] {
  const inDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};
  blocks.forEach((b) => { inDegree[b.id] = 0; adj[b.id] = []; });
  wires.forEach((w) => {
    inDegree[w.toId] = (inDegree[w.toId] || 0) + 1;
    (adj[w.fromId] = adj[w.fromId] || []).push(w.toId);
  });
  const queue = blocks.filter((b) => inDegree[b.id] === 0).map((b) => b.id);
  const sorted: BlockDef[] = [];
  const idMap = Object.fromEntries(blocks.map((b) => [b.id, b]));
  while (queue.length) {
    const id = queue.shift()!;
    if (idMap[id]) sorted.push(idMap[id]);
    (adj[id] || []).forEach((nid) => {
      inDegree[nid]--;
      if (inDegree[nid] === 0) queue.push(nid);
    });
  }
  // Append any not in sorted (cycles)
  blocks.forEach((b) => { if (!sorted.find((s) => s.id === b.id)) sorted.push(b); });
  return sorted;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function portPos(block: BlockDef, kind: "in" | "out", port = 0, total = 1): { x: number; y: number } {
  const step = BH / (total + 1);
  if (kind === "in") return { x: block.x, y: block.y + step * (port + 1) };
  return { x: block.x + BW, y: block.y + step * (port + 1) };
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const cx = (x1 + x2) / 2;
  return `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`;
}

let _id = 0;
const uid = () => `b${++_id}`;

// ─── Default diagram ──────────────────────────────────────────────────────────

const defaultBlocks: BlockDef[] = [
  { id: "src1", type: "source",     name: "Sine",       x: 60,  y: 120, params: { signal: "sine", amplitude: 1, frequency: 1 } },
  { id: "g1",   type: "gain",       name: "Gain ×2",    x: 240, y: 120, params: { gain: 2 } },
  { id: "tf1",  type: "tf",         name: "1st Order",  x: 420, y: 120, params: { num: "1", den: "0.5 1" } },
  { id: "sc1",  type: "scope",      name: "Output",     x: 620, y: 120, params: {} },
];
const defaultWires: Wire[] = [
  { id: "w1", fromId: "src1", fromPort: 0, toId: "g1",  toPort: 0 },
  { id: "w2", fromId: "g1",   fromPort: 0, toId: "tf1", toPort: 0 },
  { id: "w3", fromId: "tf1",  fromPort: 0, toId: "sc1", toPort: 0 },
];

// ─── Mini Scope Plot ──────────────────────────────────────────────────────────

function ScopePlot({ time, values }: { time: number[]; values: number[] }) {
  if (!values.length) return null;
  const W = 100, H = 36;
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - minV) / range) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mt-1">
      <rect width={W} height={H} fill="#0a0a1a" rx={2} />
      <polyline points={pts.join(" ")} fill="none" stroke="#00D4FF" strokeWidth={1.2} />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SimScapePage() {
  const [blocks, setBlocks] = useState<BlockDef[]>(defaultBlocks);
  const [wires, setWires] = useState<Wire[]>(defaultWires);
  const [selected, setSelected] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [running, setRunning] = useState(false);
  const [tEnd, setTEnd] = useState(10);
  const [steps, setSteps] = useState(500);
  const [scopeOpen, setScopeOpen] = useState(true);

  // Wire connection state
  const [pendingWire, setPendingWire] = useState<{ fromId: string; fromPort: number; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Drag state
  const draggingRef = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedBlock = blocks.find((b) => b.id === selected);

  // ── Run simulation ────────────────────────────────────────────────────────

  const handleRun = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const result = runSimulation(blocks, wires, tEnd, steps);
      setSimResult(result);
      setRunning(false);
    }, 50);
  }, [blocks, wires, tEnd, steps]);

  // ── Add block ─────────────────────────────────────────────────────────────

  const addBlock = useCallback((type: BlockType) => {
    const id = uid();
    setBlocks((prev) => [...prev, {
      id, type, name: BLOCK_LABELS[type],
      x: 100 + Math.random() * 200, y: 80 + Math.random() * 200,
      params: { ...DEFAULT_PARAMS[type] },
    }]);
    setSelected(id);
  }, []);

  // ── Delete selected ───────────────────────────────────────────────────────

  const deleteSelected = useCallback(() => {
    if (!selected) return;
    setBlocks((p) => p.filter((b) => b.id !== selected));
    setWires((p) => p.filter((w) => w.fromId !== selected && w.toId !== selected));
    setSelected(null);
  }, [selected]);

  // ── Drag ──────────────────────────────────────────────────────────────────

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

  const onCanvasMouseUp = useCallback(() => {
    draggingRef.current = null;
    setPendingWire(null);
  }, []);

  // ── Port click ────────────────────────────────────────────────────────────

  const onOutputPortClick = useCallback((e: React.MouseEvent, blockId: string, port: number) => {
    e.stopPropagation();
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const pos = portPos(block, "out", port, OUTPUT_PORTS[block.type]);
    setPendingWire({ fromId: blockId, fromPort: port, x: pos.x, y: pos.y });
  }, [blocks]);

  const onInputPortClick = useCallback((e: React.MouseEvent, blockId: string, port: number) => {
    e.stopPropagation();
    if (!pendingWire) return;
    // Don't connect to self
    if (pendingWire.fromId === blockId) { setPendingWire(null); return; }
    // Remove existing wire to same input port
    setWires((prev) => {
      const filtered = prev.filter((w) => !(w.toId === blockId && w.toPort === port));
      return [...filtered, { id: uid(), fromId: pendingWire.fromId, fromPort: pendingWire.fromPort, toId: blockId, toPort: port }];
    });
    setPendingWire(null);
    setSimResult(null);
  }, [pendingWire]);

  // ── Update param ──────────────────────────────────────────────────────────

  const updateParam = useCallback((key: string, value: string | number) => {
    if (!selected) return;
    setBlocks((prev) => prev.map((b) => b.id === selected ? { ...b, params: { ...b.params, [key]: value } } : b));
    setSimResult(null);
  }, [selected]);

  const updateName = useCallback((name: string) => {
    if (!selected) return;
    setBlocks((prev) => prev.map((b) => b.id === selected ? { ...b, name } : b));
  }, [selected]);

  // ── Canvas click (deselect) ───────────────────────────────────────────────

  const onCanvasClick = useCallback(() => {
    setSelected(null);
    setPendingWire(null);
  }, []);

  // ── Keyboard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const active = document.activeElement;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected]);

  // ── Scope blocks ──────────────────────────────────────────────────────────

  const scopeBlocks = blocks.filter((b) => b.type === "scope");

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117] text-white">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#161b22] border-b border-[#21262d] shrink-0">
        <Zap size={16} className="text-[#00D4FF]" />
        <h1 className="text-sm font-bold text-white">SimScape — Block Diagram Simulation</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-slate-500">t_end</span>
          <input value={tEnd} onChange={(e) => setTEnd(Number(e.target.value))} type="number" min={1} max={100}
            className="w-16 bg-[#0d1117] border border-[#21262d] rounded px-2 py-0.5 text-xs text-white" />
          <span className="text-[10px] text-slate-500">steps</span>
          <input value={steps} onChange={(e) => setSteps(Number(e.target.value))} type="number" min={50} max={2000}
            className="w-20 bg-[#0d1117] border border-[#21262d] rounded px-2 py-0.5 text-xs text-white" />
          <button onClick={() => { setBlocks([]); setWires([]); setSimResult(null); setSelected(null); }}
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
        {/* Left sidebar: block palette */}
        <div className="w-40 bg-[#161b22] border-r border-[#21262d] flex flex-col overflow-y-auto p-2 gap-1 shrink-0">
          <div className="text-[9px] text-slate-500 uppercase tracking-wider px-1 mb-1">Block Library</div>
          {(Object.keys(BLOCK_LABELS) as BlockType[]).map((type) => (
            <button key={type} onClick={() => addBlock(type)}
              className="flex items-center gap-2 px-2 py-1.5 rounded border border-[#21262d] text-xs text-slate-300 hover:text-white hover:border-slate-600 transition-colors text-left group">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: BLOCK_COLORS[type] }} />
              <span>{BLOCK_LABELS[type]}</span>
              <Plus size={10} className="ml-auto opacity-0 group-hover:opacity-100" />
            </button>
          ))}
          <div className="mt-2 pt-2 border-t border-[#21262d] text-[9px] text-slate-600 leading-relaxed px-1">
            Click to add block to canvas. Drag blocks to move. Click output port (right) then input port (left) to connect.
          </div>
          {selected && (
            <button onClick={deleteSelected}
              className="mt-auto flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 border border-red-900/40 hover:bg-red-900/20 transition-colors">
              <Trash2 size={10} /> Delete Block
            </button>
          )}
        </div>

        {/* Main canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={canvasRef} className="flex-1 relative overflow-auto bg-[#0a0a1a] cursor-default select-none"
            style={{ backgroundImage: "radial-gradient(circle, #1e293b 1px, transparent 1px)", backgroundSize: "24px 24px" }}
            onMouseMove={onCanvasMouseMove} onMouseUp={onCanvasMouseUp} onClick={onCanvasClick}>
            {/* SVG layer for wires */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
              {/* Existing wires */}
              {wires.map((w) => {
                const fb = blocks.find((b) => b.id === w.fromId);
                const tb = blocks.find((b) => b.id === w.toId);
                if (!fb || !tb) return null;
                const fp = portPos(fb, "out", w.fromPort, OUTPUT_PORTS[fb.type]);
                const tp = portPos(tb, "in", w.toPort, INPUT_PORTS[tb.type]);
                return (
                  <path key={w.id} d={bezierPath(fp.x, fp.y, tp.x, tp.y)}
                    fill="none" stroke="#00D4FF" strokeWidth={1.5} strokeOpacity={0.7} />
                );
              })}
              {/* Pending wire */}
              {pendingWire && (
                <path d={bezierPath(pendingWire.x, pendingWire.y, mousePos.x, mousePos.y)}
                  fill="none" stroke="#00D4FF" strokeWidth={1.5} strokeDasharray="6 3" strokeOpacity={0.5} />
              )}
            </svg>

            {/* Blocks */}
            {blocks.map((block) => {
              const color = BLOCK_COLORS[block.type];
              const isSelected = selected === block.id;
              const inPorts = INPUT_PORTS[block.type];
              const outPorts = OUTPUT_PORTS[block.type];
              const scopeVals = simResult?.signals[block.id];

              return (
                <div key={block.id}
                  style={{ position: "absolute", left: block.x, top: block.y, width: BW, height: block.type === "scope" && scopeVals ? BH + 44 : BH, userSelect: "none" }}
                  onMouseDown={(e) => onBlockMouseDown(e, block.id)}
                  className="group">
                  {/* Block body */}
                  <div style={{ width: BW, height: BH, borderColor: isSelected ? "#00D4FF" : color, borderWidth: isSelected ? 2 : 1 }}
                    className="absolute rounded-lg border bg-[#161b22] flex flex-col items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden shadow-lg">
                    <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-lg" style={{ background: color }} />
                    <span className="text-[10px] font-bold mt-1 px-1 truncate w-full text-center" style={{ color }}>
                      {BLOCK_LABELS[block.type]}
                    </span>
                    <span className="text-[9px] text-slate-400 truncate w-full text-center px-1">{block.name}</span>
                    {block.type === "gain" && (
                      <span className="text-[9px] text-slate-500 font-mono">K={block.params.gain}</span>
                    )}
                    {block.type === "tf" && (
                      <span className="text-[9px] text-slate-500 font-mono">{block.params.num}/{block.params.den}</span>
                    )}
                    {block.type === "source" && (
                      <span className="text-[9px] text-slate-500">{block.params.signal} A={block.params.amplitude}</span>
                    )}
                    {block.type === "pid" && (
                      <span className="text-[9px] text-slate-500 font-mono">Kp={block.params.kp}</span>
                    )}
                    {/* Scope mini-plot */}
                    {block.type === "scope" && scopeVals && simResult && (
                      <div className="px-1 pb-1">
                        <ScopePlot time={simResult.time} values={scopeVals} />
                      </div>
                    )}
                  </div>

                  {/* Input ports */}
                  {Array.from({ length: inPorts }).map((_, i) => {
                    const pos = portPos(block, "in", i, inPorts);
                    return (
                      <div key={i} style={{ position: "absolute", left: pos.x - block.x - PORT_R, top: pos.y - block.y - PORT_R, width: PORT_R * 2, height: PORT_R * 2 }}
                        className="rounded-full bg-slate-600 border border-slate-500 cursor-crosshair hover:bg-[#00D4FF] hover:border-[#00D4FF] transition-colors z-10 pointer-events-auto"
                        onClick={(e) => onInputPortClick(e, block.id, i)} />
                    );
                  })}

                  {/* Output ports */}
                  {Array.from({ length: outPorts }).map((_, i) => {
                    const pos = portPos(block, "out", i, outPorts);
                    return (
                      <div key={i}
                        style={{ position: "absolute", left: pos.x - block.x - PORT_R, top: pos.y - block.y - PORT_R, width: PORT_R * 2, height: PORT_R * 2, background: pendingWire ? "#4ade80" : "#374151", borderRadius: "50%", border: "1px solid #64748b", cursor: "crosshair", zIndex: 10 }}
                        onClick={(e) => onOutputPortClick(e, block.id, i)} />
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Scope panel (bottom) */}
          {scopeBlocks.length > 0 && (
            <div className={`bg-[#161b22] border-t border-[#21262d] shrink-0 transition-all ${scopeOpen ? "h-48" : "h-8"}`}>
              <button onClick={() => setScopeOpen(!scopeOpen)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-slate-400 hover:text-white transition-colors">
                {scopeOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                <span>Scope Outputs ({scopeBlocks.length} channel{scopeBlocks.length !== 1 ? "s" : ""})</span>
                {!simResult && <span className="text-slate-600 ml-auto">Run simulation to see output</span>}
              </button>
              {scopeOpen && (
                <div className="flex gap-4 px-4 pb-2 overflow-x-auto">
                  {scopeBlocks.map((sb) => {
                    const vals = simResult?.signals[sb.id];
                    const time = simResult?.time;
                    if (!vals || !time) return (
                      <div key={sb.id} className="flex-shrink-0 w-48 h-32 rounded border border-[#21262d] flex items-center justify-center">
                        <span className="text-[10px] text-slate-600">{sb.name}: no data</span>
                      </div>
                    );
                    const W = 200, H = 120;
                    const minV = Math.min(...vals), maxV = Math.max(...vals);
                    const range = maxV - minV || 1;
                    const pts = vals.map((v, i) => {
                      const x = (i / (vals.length - 1)) * W;
                      const y = H - ((v - minV) / range) * (H - 10) - 5;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    });
                    return (
                      <div key={sb.id} className="flex-shrink-0 flex flex-col gap-1">
                        <div className="text-[9px] text-slate-500 font-medium">{sb.name}</div>
                        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
                          <rect width={W} height={H} fill="#0a0a1a" rx={4} />
                          <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#1e293b" strokeWidth={1} />
                          <line x1={0} y1={0} x2={0} y2={H} stroke="#1e293b" strokeWidth={1} />
                          <polyline points={pts.join(" ")} fill="none" stroke="#00D4FF" strokeWidth={1.5} />
                          <text x={4} y={H - 3} fontSize={8} fill="#475569" fontFamily="monospace">{minV.toFixed(2)}</text>
                          <text x={4} y={10} fontSize={8} fill="#475569" fontFamily="monospace">{maxV.toFixed(2)}</text>
                          <text x={W - 4} y={H - 3} fontSize={8} fill="#475569" fontFamily="monospace" textAnchor="end">{tEnd}s</text>
                        </svg>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel: block parameters */}
        {selectedBlock && (
          <div className="w-52 bg-[#161b22] border-l border-[#21262d] flex flex-col overflow-y-auto p-3 gap-3 shrink-0">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Block Parameters</div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Name</label>
              <input value={selectedBlock.name} onChange={(e) => updateName(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white" />
            </div>
            <div className="h-px bg-[#21262d]" />
            <div className="text-[10px]" style={{ color: BLOCK_COLORS[selectedBlock.type] }}>
              {BLOCK_LABELS[selectedBlock.type]}
            </div>

            {/* Source params */}
            {selectedBlock.type === "source" && (
              <>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Signal Type</label>
                  <select value={String(selectedBlock.params.signal)} onChange={(e) => updateParam("signal", e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white">
                    {["sine", "cosine", "step", "ramp", "square"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <ParamInput label="Amplitude" k="amplitude" block={selectedBlock} update={updateParam} />
                {["sine","cosine","square"].includes(String(selectedBlock.params.signal)) && (
                  <ParamInput label="Frequency (Hz)" k="frequency" block={selectedBlock} update={updateParam} />
                )}
                {selectedBlock.params.signal === "step" && (
                  <ParamInput label="Step Time (s)" k="stepTime" block={selectedBlock} update={updateParam} />
                )}
                {selectedBlock.params.signal === "ramp" && (
                  <ParamInput label="Slope" k="amplitude" block={selectedBlock} update={updateParam} />
                )}
              </>
            )}
            {selectedBlock.type === "gain" && <ParamInput label="Gain (K)" k="gain" block={selectedBlock} update={updateParam} />}
            {selectedBlock.type === "constant" && <ParamInput label="Value" k="value" block={selectedBlock} update={updateParam} />}
            {selectedBlock.type === "integrator" && <ParamInput label="Initial Condition" k="ic" block={selectedBlock} update={updateParam} />}
            {selectedBlock.type === "sum" && (
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Signs (e.g. ++, +-)</label>
                <input value={String(selectedBlock.params.signs)} onChange={(e) => updateParam("signs", e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white font-mono" />
              </div>
            )}
            {selectedBlock.type === "tf" && (
              <>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Numerator (space-sep)</label>
                  <input value={String(selectedBlock.params.num)} onChange={(e) => updateParam("num", e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Denominator (tau 1)</label>
                  <input value={String(selectedBlock.params.den)} onChange={(e) => updateParam("den", e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white font-mono" />
                </div>
              </>
            )}
            {selectedBlock.type === "pid" && (
              <>
                <ParamInput label="Kp (Proportional)" k="kp" block={selectedBlock} update={updateParam} />
                <ParamInput label="Ki (Integral)" k="ki" block={selectedBlock} update={updateParam} />
                <ParamInput label="Kd (Derivative)" k="kd" block={selectedBlock} update={updateParam} />
              </>
            )}

            <div className="mt-auto">
              <div className="text-[9px] text-slate-600 font-mono">ID: {selectedBlock.id}</div>
              <div className="text-[9px] text-slate-600 font-mono">pos: ({Math.round(selectedBlock.x)}, {Math.round(selectedBlock.y)})</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
