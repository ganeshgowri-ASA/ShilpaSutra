"use client";
import { useState, useRef, useCallback, useEffect } from "react";

/* ── Types ── */
interface BlockPort {
  id: string;
  side: "left" | "right" | "top" | "bottom";
  label: string;
  type: "thermal" | "signal";
}

interface Block {
  id: string;
  type: "heat-source" | "heat-sink" | "resistor" | "capacitor" | "convection" | "radiation" | "temperature-sensor" | "ground";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  params: Record<string, number>;
  ports: BlockPort[];
}

interface Wire {
  id: string;
  fromBlock: string;
  fromPort: string;
  toBlock: string;
  toPort: string;
}

interface SimResult {
  nodeTemperatures: Record<string, number>;
  heatFlows: Record<string, number>;
  steadyState: boolean;
  maxTemp: number;
  minTemp: number;
}

/* ── Block Definitions ── */
const BLOCK_CATALOG: {
  type: Block["type"];
  label: string;
  icon: string;
  color: string;
  defaultParams: Record<string, number>;
  ports: Omit<BlockPort, "id">[];
  desc: string;
}[] = [
  {
    type: "heat-source",
    label: "Heat Source",
    icon: "Q",
    color: "#ef4444",
    defaultParams: { power_W: 50 },
    ports: [
      { side: "right", label: "out", type: "thermal" },
    ],
    desc: "Constant heat source (W)",
  },
  {
    type: "heat-sink",
    label: "Heat Sink",
    icon: "S",
    color: "#3b82f6",
    defaultParams: { temperature_C: 25 },
    ports: [
      { side: "left", label: "in", type: "thermal" },
    ],
    desc: "Fixed temperature boundary",
  },
  {
    type: "resistor",
    label: "Thermal Resistor",
    icon: "R",
    color: "#f59e0b",
    defaultParams: { resistance_KperW: 0.5 },
    ports: [
      { side: "left", label: "in", type: "thermal" },
      { side: "right", label: "out", type: "thermal" },
    ],
    desc: "Thermal resistance (K/W)",
  },
  {
    type: "capacitor",
    label: "Thermal Mass",
    icon: "C",
    color: "#8b5cf6",
    defaultParams: { capacitance_JperK: 500 },
    ports: [
      { side: "left", label: "in", type: "thermal" },
      { side: "bottom", label: "gnd", type: "thermal" },
    ],
    desc: "Thermal capacitance (J/K)",
  },
  {
    type: "convection",
    label: "Convection",
    icon: "h",
    color: "#06b6d4",
    defaultParams: { h_WperM2K: 25, area_m2: 0.01 },
    ports: [
      { side: "left", label: "solid", type: "thermal" },
      { side: "right", label: "fluid", type: "thermal" },
    ],
    desc: "Convective heat transfer",
  },
  {
    type: "radiation",
    label: "Radiation",
    icon: "E",
    color: "#ec4899",
    defaultParams: { emissivity: 0.9, area_m2: 0.01 },
    ports: [
      { side: "left", label: "surface", type: "thermal" },
      { side: "right", label: "ambient", type: "thermal" },
    ],
    desc: "Radiative heat transfer",
  },
  {
    type: "temperature-sensor",
    label: "Temp Sensor",
    icon: "T",
    color: "#10b981",
    defaultParams: {},
    ports: [
      { side: "left", label: "in", type: "thermal" },
      { side: "right", label: "signal", type: "signal" },
    ],
    desc: "Temperature measurement",
  },
  {
    type: "ground",
    label: "Thermal Ground",
    icon: "G",
    color: "#6b7280",
    defaultParams: { temperature_C: 20 },
    ports: [
      { side: "top", label: "ref", type: "thermal" },
    ],
    desc: "Reference temperature node",
  },
];

let blockIdCounter = 0;

function createBlock(type: Block["type"], x: number, y: number): Block {
  const catalog = BLOCK_CATALOG.find((b) => b.type === type)!;
  const id = `blk_${++blockIdCounter}_${Date.now()}`;
  return {
    id,
    type,
    label: catalog.label,
    x,
    y,
    width: 120,
    height: 60,
    params: { ...catalog.defaultParams },
    ports: catalog.ports.map((p, i) => ({
      ...p,
      id: `${id}_port_${i}`,
    })),
  };
}

function getPortPosition(block: Block, port: BlockPort): { x: number; y: number } {
  const samePortsSameSide = block.ports.filter((p) => p.side === port.side);
  const idx = samePortsSameSide.indexOf(port);
  const total = samePortsSameSide.length;

  switch (port.side) {
    case "left":
      return { x: block.x, y: block.y + (block.height * (idx + 1)) / (total + 1) };
    case "right":
      return { x: block.x + block.width, y: block.y + (block.height * (idx + 1)) / (total + 1) };
    case "top":
      return { x: block.x + (block.width * (idx + 1)) / (total + 1), y: block.y };
    case "bottom":
      return { x: block.x + (block.width * (idx + 1)) / (total + 1), y: block.y + block.height };
  }
}

/* ── Thermal Simulation ── */
function runThermalSim(blocks: Block[], wires: Wire[]): SimResult {
  const nodeTemperatures: Record<string, number> = {};
  const heatFlows: Record<string, number> = {};

  // Initialize all blocks with default temperature
  blocks.forEach((b) => {
    if (b.type === "heat-sink" || b.type === "ground") {
      nodeTemperatures[b.id] = b.params.temperature_C || 20;
    } else {
      nodeTemperatures[b.id] = 25; // ambient default
    }
  });

  // Iterative solver
  for (let iter = 0; iter < 100; iter++) {
    blocks.forEach((block) => {
      if (block.type === "heat-sink" || block.type === "ground") return; // fixed temp

      if (block.type === "heat-source") {
        // Find connected blocks
        const connectedWires = wires.filter((w) => w.fromBlock === block.id || w.toBlock === block.id);
        if (connectedWires.length > 0) {
          const neighbor = connectedWires[0].fromBlock === block.id ? connectedWires[0].toBlock : connectedWires[0].fromBlock;
          const neighborTemp = nodeTemperatures[neighbor] || 25;
          // Heat source increases temperature
          nodeTemperatures[block.id] = neighborTemp + block.params.power_W * 0.5;
          heatFlows[block.id] = block.params.power_W;
        }
      }

      if (block.type === "resistor") {
        const connectedWires = wires.filter((w) => w.fromBlock === block.id || w.toBlock === block.id);
        if (connectedWires.length >= 2) {
          const neighbors = connectedWires.map((w) => w.fromBlock === block.id ? w.toBlock : w.fromBlock);
          const t1 = nodeTemperatures[neighbors[0]] || 25;
          const t2 = nodeTemperatures[neighbors[1]] || 25;
          nodeTemperatures[block.id] = (t1 + t2) / 2;
          heatFlows[block.id] = Math.abs(t1 - t2) / (block.params.resistance_KperW || 1);
        } else if (connectedWires.length === 1) {
          const neighbor = connectedWires[0].fromBlock === block.id ? connectedWires[0].toBlock : connectedWires[0].fromBlock;
          nodeTemperatures[block.id] = nodeTemperatures[neighbor] || 25;
        }
      }

      if (block.type === "convection") {
        const connectedWires = wires.filter((w) => w.fromBlock === block.id || w.toBlock === block.id);
        if (connectedWires.length >= 2) {
          const neighbors = connectedWires.map((w) => w.fromBlock === block.id ? w.toBlock : w.fromBlock);
          const tSolid = nodeTemperatures[neighbors[0]] || 80;
          const tFluid = nodeTemperatures[neighbors[1]] || 25;
          const h = block.params.h_WperM2K || 25;
          const A = block.params.area_m2 || 0.01;
          heatFlows[block.id] = h * A * Math.abs(tSolid - tFluid);
          nodeTemperatures[block.id] = (tSolid + tFluid) / 2;
        }
      }

      if (block.type === "capacitor") {
        const connectedWires = wires.filter((w) => w.fromBlock === block.id || w.toBlock === block.id);
        if (connectedWires.length > 0) {
          const neighbor = connectedWires[0].fromBlock === block.id ? connectedWires[0].toBlock : connectedWires[0].fromBlock;
          nodeTemperatures[block.id] = nodeTemperatures[neighbor] || 25;
        }
      }

      if (block.type === "radiation") {
        const connectedWires = wires.filter((w) => w.fromBlock === block.id || w.toBlock === block.id);
        if (connectedWires.length >= 2) {
          const neighbors = connectedWires.map((w) => w.fromBlock === block.id ? w.toBlock : w.fromBlock);
          const t1 = (nodeTemperatures[neighbors[0]] || 80) + 273.15;
          const t2 = (nodeTemperatures[neighbors[1]] || 25) + 273.15;
          const sigma = 5.67e-8;
          const eps = block.params.emissivity || 0.9;
          const A = block.params.area_m2 || 0.01;
          heatFlows[block.id] = eps * sigma * A * (Math.pow(t1, 4) - Math.pow(t2, 4));
          nodeTemperatures[block.id] = ((t1 + t2) / 2) - 273.15;
        }
      }

      if (block.type === "temperature-sensor") {
        const connectedWires = wires.filter((w) => w.fromBlock === block.id || w.toBlock === block.id);
        if (connectedWires.length > 0) {
          const neighbor = connectedWires[0].fromBlock === block.id ? connectedWires[0].toBlock : connectedWires[0].fromBlock;
          nodeTemperatures[block.id] = nodeTemperatures[neighbor] || 25;
        }
      }
    });
  }

  const temps = Object.values(nodeTemperatures);
  return {
    nodeTemperatures,
    heatFlows,
    steadyState: true,
    maxTemp: temps.length > 0 ? Math.max(...temps) : 25,
    minTemp: temps.length > 0 ? Math.min(...temps) : 25,
  };
}

/* ── Main Component ── */
export default function ThermalBlockDiagram() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ blockId: string; offsetX: number; offsetY: number } | null>(null);
  const [wiring, setWiring] = useState<{ fromBlock: string; fromPort: string } | null>(null);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [showCatalog, setShowCatalog] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  // ── Drag & Drop from catalog ──
  const handleCatalogDragStart = useCallback((e: React.DragEvent, type: Block["type"]) => {
    e.dataTransfer.setData("blockType", type);
  }, []);

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("blockType") as Block["type"];
    if (!type) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - 60;
    const y = e.clientY - rect.top - 30;
    const newBlock = createBlock(type, x, y);
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedBlock(newBlock.id);
    setSimResult(null);
  }, []);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // ── Block Dragging ──
  const handleBlockMouseDown = useCallback((e: React.MouseEvent, blockId: string) => {
    e.stopPropagation();
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging({
      blockId,
      offsetX: e.clientX - rect.left - block.x,
      offsetY: e.clientY - rect.top - block.y,
    });
    setSelectedBlock(blockId);
  }, [blocks]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - dragging.offsetX;
    const y = e.clientY - rect.top - dragging.offsetY;
    setBlocks((prev) =>
      prev.map((b) => (b.id === dragging.blockId ? { ...b, x: Math.max(0, x), y: Math.max(0, y) } : b))
    );
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // ── Port clicking (wiring) ──
  const handlePortClick = useCallback((e: React.MouseEvent, blockId: string, portId: string) => {
    e.stopPropagation();
    if (!wiring) {
      setWiring({ fromBlock: blockId, fromPort: portId });
    } else {
      if (wiring.fromBlock !== blockId) {
        const newWire: Wire = {
          id: `wire_${Date.now()}`,
          fromBlock: wiring.fromBlock,
          fromPort: wiring.fromPort,
          toBlock: blockId,
          toPort: portId,
        };
        setWires((prev) => [...prev, newWire]);
        setSimResult(null);
      }
      setWiring(null);
    }
  }, [wiring]);

  // ── Delete selected ──
  const deleteSelected = useCallback(() => {
    if (!selectedBlock) return;
    setWires((prev) => prev.filter((w) => w.fromBlock !== selectedBlock && w.toBlock !== selectedBlock));
    setBlocks((prev) => prev.filter((b) => b.id !== selectedBlock));
    setSelectedBlock(null);
    setSimResult(null);
  }, [selectedBlock]);

  // ── Run simulation ──
  const runSim = useCallback(() => {
    const result = runThermalSim(blocks, wires);
    setSimResult(result);
  }, [blocks, wires]);

  // ── Update params ──
  const updateBlockParam = useCallback((blockId: string, key: string, value: number) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, params: { ...b.params, [key]: value } } : b
      )
    );
    setSimResult(null);
  }, []);

  // ── Keyboard ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelected();
      }
      if (e.key === "Escape") {
        setWiring(null);
        setSelectedBlock(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected]);

  const selectedBlockData = blocks.find((b) => b.id === selectedBlock);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Catalog Panel */}
      {showCatalog && (
        <div className="w-56 bg-[#161b22] border-r border-[#21262d] p-3 overflow-y-auto shrink-0">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Block Library</h3>
          <div className="text-[10px] text-slate-500 mb-2">Drag blocks onto the canvas</div>
          <div className="space-y-1.5">
            {BLOCK_CATALOG.map((cat) => (
              <div
                key={cat.type}
                draggable
                onDragStart={(e) => handleCatalogDragStart(e, cat.type)}
                className="flex items-center gap-2 bg-[#0d1117] rounded border border-[#21262d] p-2 cursor-grab hover:border-[#30363d] active:cursor-grabbing transition-colors"
              >
                <div
                  className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: cat.color + "40", borderColor: cat.color, borderWidth: 1 }}
                >
                  {cat.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-white font-medium truncate">{cat.label}</div>
                  <div className="text-[9px] text-slate-500 truncate">{cat.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Selected block properties */}
          {selectedBlockData && (
            <div className="mt-4 space-y-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Properties</h3>
              <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                <div className="text-white font-medium">{selectedBlockData.label}</div>
                <div className="text-[10px] text-slate-500">ID: {selectedBlockData.id.slice(0, 12)}</div>
                {Object.entries(selectedBlockData.params).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 text-[10px] truncate">{key.replace(/_/g, " ")}</span>
                    <input
                      type="number"
                      step="any"
                      value={val}
                      onChange={(e) => updateBlockParam(selectedBlockData.id, key, parseFloat(e.target.value) || 0)}
                      className="w-20 bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-right text-[11px]"
                    />
                  </div>
                ))}
                {simResult && simResult.nodeTemperatures[selectedBlockData.id] !== undefined && (
                  <div className="pt-2 border-t border-[#21262d]">
                    <div className="text-[10px] text-slate-500">Computed Temperature</div>
                    <div className="text-sm font-bold text-amber-400">
                      {simResult.nodeTemperatures[selectedBlockData.id].toFixed(1)} C
                    </div>
                    {simResult.heatFlows[selectedBlockData.id] !== undefined && (
                      <div className="text-[10px] text-slate-400">
                        Heat flow: {simResult.heatFlows[selectedBlockData.id].toFixed(2)} W
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={deleteSelected}
                className="w-full text-[10px] py-1.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-900/40"
              >
                Delete Block
              </button>
            </div>
          )}
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative bg-[#0a0e17]">
        <svg
          ref={svgRef}
          className="w-full h-full"
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={() => { setSelectedBlock(null); setWiring(null); }}
        >
          {/* Grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a1f2b" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Wires */}
          {wires.map((wire) => {
            const fromBlock = blocks.find((b) => b.id === wire.fromBlock);
            const toBlock = blocks.find((b) => b.id === wire.toBlock);
            if (!fromBlock || !toBlock) return null;
            const fromPort = fromBlock.ports.find((p) => p.id === wire.fromPort);
            const toPort = toBlock.ports.find((p) => p.id === wire.toPort);
            if (!fromPort || !toPort) return null;
            const p1 = getPortPosition(fromBlock, fromPort);
            const p2 = getPortPosition(toBlock, toPort);
            const mx = (p1.x + p2.x) / 2;
            return (
              <g key={wire.id}>
                <path
                  d={`M ${p1.x} ${p1.y} C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}`}
                  fill="none"
                  stroke={simResult ? "#f59e0b" : "#4a5568"}
                  strokeWidth={2}
                  strokeDasharray={simResult ? undefined : "4 2"}
                />
                {/* Animated flow indicator */}
                {simResult && (
                  <circle r="3" fill="#f59e0b">
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      path={`M ${p1.x} ${p1.y} C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}`}
                    />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Wiring preview */}
          {wiring && (
            <line
              x1={(() => {
                const b = blocks.find((bl) => bl.id === wiring.fromBlock);
                const p = b?.ports.find((pp) => pp.id === wiring.fromPort);
                return b && p ? getPortPosition(b, p).x : 0;
              })()}
              y1={(() => {
                const b = blocks.find((bl) => bl.id === wiring.fromBlock);
                const p = b?.ports.find((pp) => pp.id === wiring.fromPort);
                return b && p ? getPortPosition(b, p).y : 0;
              })()}
              x2={dragging ? 0 : 0}
              y2={dragging ? 0 : 0}
              stroke="#e94560"
              strokeWidth={2}
              strokeDasharray="6 3"
              pointerEvents="none"
            />
          )}

          {/* Blocks */}
          {blocks.map((block) => {
            const catalog = BLOCK_CATALOG.find((c) => c.type === block.type)!;
            const isSelected = selectedBlock === block.id;
            const temp = simResult?.nodeTemperatures[block.id];

            return (
              <g key={block.id}>
                {/* Block body */}
                <rect
                  x={block.x}
                  y={block.y}
                  width={block.width}
                  height={block.height}
                  rx={6}
                  fill={isSelected ? catalog.color + "30" : "#161b22"}
                  stroke={isSelected ? catalog.color : "#30363d"}
                  strokeWidth={isSelected ? 2 : 1}
                  onMouseDown={(e) => handleBlockMouseDown(e, block.id)}
                  className="cursor-move"
                />

                {/* Icon */}
                <text
                  x={block.x + 15}
                  y={block.y + block.height / 2 + 5}
                  fill={catalog.color}
                  fontSize={16}
                  fontWeight="bold"
                  fontFamily="monospace"
                  pointerEvents="none"
                >
                  {catalog.icon}
                </text>

                {/* Label */}
                <text
                  x={block.x + 32}
                  y={block.y + block.height / 2 - 4}
                  fill="white"
                  fontSize={10}
                  fontWeight="600"
                  pointerEvents="none"
                >
                  {block.label}
                </text>

                {/* Param summary */}
                <text
                  x={block.x + 32}
                  y={block.y + block.height / 2 + 10}
                  fill="#64748b"
                  fontSize={9}
                  pointerEvents="none"
                >
                  {Object.entries(block.params)
                    .map(([k, v]) => `${k.split("_")[0]}=${v}`)
                    .join(" ")}
                </text>

                {/* Temperature display when simulated */}
                {temp !== undefined && (
                  <text
                    x={block.x + block.width - 5}
                    y={block.y - 5}
                    fill="#f59e0b"
                    fontSize={10}
                    fontWeight="bold"
                    textAnchor="end"
                    pointerEvents="none"
                  >
                    {temp.toFixed(1)}C
                  </text>
                )}

                {/* Ports */}
                {block.ports.map((port) => {
                  const pos = getPortPosition(block, port);
                  const isWiringFrom = wiring?.fromBlock === block.id && wiring?.fromPort === port.id;
                  return (
                    <g key={port.id}>
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={6}
                        fill={isWiringFrom ? "#e94560" : port.type === "thermal" ? "#f59e0b" : "#10b981"}
                        stroke={wiring && !isWiringFrom ? "#e94560" : "#0d1117"}
                        strokeWidth={2}
                        onClick={(e) => handlePortClick(e, block.id, port.id)}
                        className={`cursor-crosshair ${wiring && !isWiringFrom ? "animate-pulse" : ""}`}
                      />
                      <text
                        x={pos.x}
                        y={pos.y + (port.side === "top" ? -10 : port.side === "bottom" ? 14 : 0)}
                        fill="#64748b"
                        fontSize={8}
                        textAnchor="middle"
                        pointerEvents="none"
                      >
                        {port.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Empty state */}
          {blocks.length === 0 && (
            <text x="50%" y="50%" textAnchor="middle" fill="#30363d" fontSize={14}>
              Drag blocks from the library to build a thermal circuit
            </text>
          )}
        </svg>

        {/* Toolbar overlay */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            onClick={() => setShowCatalog(!showCatalog)}
            className={`text-[10px] px-2 py-1 rounded border transition-colors ${
              showCatalog ? "border-[#e94560]/40 text-[#e94560] bg-[#e94560]/10" : "border-[#21262d] text-slate-500 bg-[#161b22]"
            }`}
          >
            Library
          </button>
          <button
            onClick={runSim}
            disabled={blocks.length === 0}
            className="bg-[#e94560] hover:bg-[#d63750] disabled:opacity-50 text-white text-[10px] px-3 py-1 rounded font-semibold transition-colors"
          >
            Run Thermal Sim
          </button>
        </div>

        {/* Wiring hint */}
        {wiring && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] bg-[#e94560]/20 text-[#e94560] border border-[#e94560]/40 rounded px-3 py-1">
            Click a port on another block to complete the wire (Esc to cancel)
          </div>
        )}

        {/* Simulation results */}
        {simResult && (
          <div className="absolute bottom-2 left-2 bg-[#161b22]/90 border border-[#21262d] rounded-lg p-3 max-w-xs">
            <div className="text-[10px] font-bold text-white mb-1">Thermal Simulation Results</div>
            <div className="text-[10px] text-slate-400 space-y-0.5">
              <div>Status: <span className="text-green-400">{simResult.steadyState ? "Steady State" : "Transient"}</span></div>
              <div>Max Temp: <span className="text-red-400 font-bold">{simResult.maxTemp.toFixed(1)} C</span></div>
              <div>Min Temp: <span className="text-blue-400 font-bold">{simResult.minTemp.toFixed(1)} C</span></div>
              <div>Blocks: <span className="text-white">{blocks.length}</span> | Connections: <span className="text-white">{wires.length}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
