"use client";
import { useState, useCallback } from "react";

interface ProbePoint {
  id: string;
  x: number;
  y: number;
  value: number;
}

interface ResultVisualizationProps {
  /** 2D stress/temperature field data */
  field: number[];
  /** Grid size (field is gridSize x gridSize) */
  gridSize: number;
  /** Field name for labels */
  fieldName: string;
  /** Unit string */
  unit: string;
  /** Min value */
  minValue: number;
  /** Max value */
  maxValue: number;
  /** Colormap name */
  colormap?: "rainbow" | "jet" | "viridis" | "coolwarm";
}

function valueToColor(t: number, colormap: string): string {
  const c = Math.max(0, Math.min(1, t));
  if (colormap === "coolwarm") {
    const r = c < 0.5 ? Math.round(59 + c * 2 * 196) : 255;
    const g = c < 0.5 ? Math.round(76 + c * 2 * 179) : Math.round(255 - (c - 0.5) * 2 * 179);
    const b = c < 0.5 ? 255 : Math.round(255 - (c - 0.5) * 2 * 196);
    return `rgb(${r},${g},${b})`;
  }
  if (colormap === "viridis") {
    const r = Math.round(68 + c * 185);
    const g = Math.round(1 + c * 205 - Math.pow(c, 2) * 100);
    const b = Math.round(84 + c * 60 - Math.pow(c, 1.5) * 140);
    return `rgb(${Math.min(253, r)},${Math.min(231, g)},${Math.max(37, b)})`;
  }
  // Rainbow/jet
  if (c < 0.25) {
    return `rgb(0,${Math.round(c * 4 * 255)},255)`;
  } else if (c < 0.5) {
    return `rgb(0,255,${Math.round((1 - (c - 0.25) * 4) * 255)})`;
  } else if (c < 0.75) {
    return `rgb(${Math.round((c - 0.5) * 4 * 255)},255,0)`;
  }
  return `rgb(255,${Math.round((1 - (c - 0.75) * 4) * 255)},0)`;
}

export default function ResultVisualization({
  field,
  gridSize,
  fieldName,
  unit,
  minValue,
  maxValue,
  colormap = "rainbow",
}: ResultVisualizationProps) {
  const [probes, setProbes] = useState<ProbePoint[]>([]);
  const [showMinMax, setShowMinMax] = useState(true);
  const [selectedColormap, setSelectedColormap] = useState(colormap);
  const [hoveredCell, setHoveredCell] = useState<{ i: number; j: number; value: number } | null>(null);

  const range = maxValue - minValue || 1;

  // Find min/max positions
  let minIdx = 0, maxIdx = 0;
  for (let i = 0; i < field.length; i++) {
    if (field[i] < field[minIdx]) minIdx = i;
    if (field[i] > field[maxIdx]) maxIdx = i;
  }
  const minPos = { x: (minIdx % gridSize) / (gridSize - 1), y: Math.floor(minIdx / gridSize) / (gridSize - 1) };
  const maxPos = { x: (maxIdx % gridSize) / (gridSize - 1), y: Math.floor(maxIdx / gridSize) / (gridSize - 1) };

  const addProbe = useCallback((i: number, j: number) => {
    const idx = j * gridSize + i;
    if (idx >= 0 && idx < field.length) {
      setProbes(prev => [...prev, {
        id: Date.now().toString(),
        x: i / (gridSize - 1),
        y: j / (gridSize - 1),
        value: field[idx],
      }]);
    }
  }, [field, gridSize]);

  const removeProbe = useCallback((id: string) => {
    setProbes(prev => prev.filter(p => p.id !== id));
  }, []);

  // Render a downsampled view for the contour
  const displaySize = Math.min(gridSize, 40);
  const cellSize = 100 / displaySize;

  return (
    <div className="bg-[#0d1117] rounded border border-[#21262d] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d]">
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
          {fieldName} Distribution
        </span>
        <div className="flex items-center gap-2">
          <select value={selectedColormap} onChange={e => setSelectedColormap(e.target.value as typeof selectedColormap)}
            className="bg-[#161b22] text-[9px] text-white rounded px-1.5 py-0.5 border border-[#21262d]">
            <option value="rainbow">Rainbow</option>
            <option value="jet">Jet</option>
            <option value="viridis">Viridis</option>
            <option value="coolwarm">Cool-Warm</option>
          </select>
          <button onClick={() => setShowMinMax(!showMinMax)}
            className={`text-[9px] px-1.5 py-0.5 rounded border ${showMinMax ? "border-[#00D4FF]/30 text-[#00D4FF] bg-[#00D4FF]/10" : "border-[#21262d] text-slate-500"}`}>
            Min/Max
          </button>
        </div>
      </div>

      {/* Contour Map */}
      <div className="relative p-3">
        <svg viewBox="0 0 100 100" className="w-full aspect-square max-h-[200px] rounded border border-[#21262d]"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const i = Math.min(gridSize - 1, Math.floor(x * gridSize));
            const j = Math.min(gridSize - 1, Math.floor(y * gridSize));
            addProbe(i, j);
          }}>
          {/* Cells */}
          {Array.from({ length: displaySize }, (_, j) =>
            Array.from({ length: displaySize }, (_, i) => {
              const si = Math.floor((i / displaySize) * gridSize);
              const sj = Math.floor((j / displaySize) * gridSize);
              const idx = sj * gridSize + si;
              const val = field[idx] || 0;
              const t = (val - minValue) / range;
              return (
                <rect key={`${i}-${j}`}
                  x={i * cellSize} y={j * cellSize}
                  width={cellSize + 0.3} height={cellSize + 0.3}
                  fill={valueToColor(t, selectedColormap)}
                  onMouseEnter={() => setHoveredCell({ i: si, j: sj, value: val })}
                  onMouseLeave={() => setHoveredCell(null)}
                  className="cursor-crosshair"
                />
              );
            })
          )}

          {/* Min/Max markers */}
          {showMinMax && (
            <>
              <circle cx={minPos.x * 100} cy={minPos.y * 100} r={2.5} fill="none" stroke="#4488ff" strokeWidth={0.8} />
              <text x={minPos.x * 100 + 3} y={minPos.y * 100 - 2} fill="#4488ff" fontSize="3.5" fontWeight="bold">
                MIN
              </text>
              <circle cx={maxPos.x * 100} cy={maxPos.y * 100} r={2.5} fill="none" stroke="#ff4444" strokeWidth={0.8} />
              <text x={maxPos.x * 100 + 3} y={maxPos.y * 100 - 2} fill="#ff4444" fontSize="3.5" fontWeight="bold">
                MAX
              </text>
            </>
          )}

          {/* Probe markers */}
          {probes.map(p => (
            <g key={p.id}>
              <line x1={p.x * 100 - 2} y1={p.y * 100} x2={p.x * 100 + 2} y2={p.y * 100} stroke="#fff" strokeWidth={0.5} />
              <line x1={p.x * 100} y1={p.y * 100 - 2} x2={p.x * 100} y2={p.y * 100 + 2} stroke="#fff" strokeWidth={0.5} />
              <circle cx={p.x * 100} cy={p.y * 100} r={1.5} fill="none" stroke="#fff" strokeWidth={0.4} />
            </g>
          ))}
        </svg>

        {/* Hover tooltip */}
        {hoveredCell && (
          <div className="absolute top-1 left-1 bg-[#161b22]/90 border border-[#21262d] rounded px-2 py-1 text-[9px] pointer-events-none">
            <span className="text-slate-400">({hoveredCell.i}, {hoveredCell.j}):</span>{" "}
            <span className="text-[#00D4FF] font-bold">{hoveredCell.value.toFixed(2)} {unit}</span>
          </div>
        )}
      </div>

      {/* Color Legend */}
      <div className="px-3 pb-2">
        <div className="h-3 rounded"
          style={{
            background: `linear-gradient(to right, ${
              Array.from({ length: 10 }, (_, i) => valueToColor(i / 9, selectedColormap)).join(", ")
            })`,
          }}
        />
        <div className="flex justify-between text-[8px] text-slate-500 mt-0.5">
          <span>{minValue.toFixed(2)} {unit}</span>
          <span>{((minValue + maxValue) / 2).toFixed(2)} {unit}</span>
          <span>{maxValue.toFixed(2)} {unit}</span>
        </div>
      </div>

      {/* Probes List */}
      {probes.length > 0 && (
        <div className="border-t border-[#21262d] px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Probes ({probes.length})</span>
            <button onClick={() => setProbes([])} className="text-[8px] text-slate-600 hover:text-red-400">Clear All</button>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {probes.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between text-[9px] bg-[#161b22] rounded px-2 py-1">
                <span className="text-slate-500">P{idx + 1} ({(p.x * 100).toFixed(0)}%, {(p.y * 100).toFixed(0)}%)</span>
                <span className="text-[#00D4FF] font-bold">{p.value.toFixed(2)} {unit}</span>
                <button onClick={() => removeProbe(p.id)} className="text-slate-600 hover:text-red-400 ml-2">x</button>
              </div>
            ))}
          </div>
          <div className="text-[8px] text-slate-600 mt-1">Click on the contour map to place probes</div>
        </div>
      )}

      {/* Stats */}
      <div className="border-t border-[#21262d] px-3 py-2 grid grid-cols-3 gap-2 text-[9px]">
        <div>
          <span className="text-slate-500">Min:</span>
          <span className="text-blue-400 ml-1 font-bold">{minValue.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-slate-500">Max:</span>
          <span className="text-red-400 ml-1 font-bold">{maxValue.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-slate-500">Range:</span>
          <span className="text-white ml-1 font-bold">{range.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
