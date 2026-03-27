"use client";
import { useState, useEffect, useRef, useCallback } from "react";

export interface ResidualSeries {
  name: string;
  color: string;
  data: number[];
}

export interface ForceHistoryPoint {
  time: number;
  cd: number;
  cl: number;
}

interface ConvergenceMonitorProps {
  /** Array of residual data series (e.g., continuity, momentum, energy) */
  series: ResidualSeries[];
  /** Total iterations completed */
  iterations: number;
  /** Whether the solver is currently running */
  isRunning: boolean;
  /** Convergence tolerance threshold line */
  tolerance?: number;
  /** Whether convergence has been achieved */
  converged?: boolean;
  /** Log scale for Y axis */
  logScale?: boolean;
  /** Title override */
  title?: string;
  /** Force/moment history for force plot */
  forceHistory?: ForceHistoryPoint[];
  /** Callback when auto-stop triggers convergence */
  onAutoStop?: () => void;
  /** Enable auto-stop when convergence criteria met */
  autoStop?: boolean;
  /** Estimated remaining iterations */
  estimatedRemaining?: number;
  /** Current simulation time (for transient) */
  currentTime?: number;
  /** Solver algorithm label */
  solverLabel?: string;
  /** Courant number */
  courantNumber?: number;
}

export default function ConvergenceMonitor({
  series,
  iterations,
  isRunning,
  tolerance = 1e-4,
  converged = false,
  logScale: initialLogScale = true,
  title = "Convergence Monitor",
  forceHistory,
  onAutoStop,
  autoStop = false,
  estimatedRemaining,
  currentTime,
  solverLabel,
  courantNumber,
}: ConvergenceMonitorProps) {
  const [logScale, setLogScale] = useState(initialLogScale);
  const [autoScroll, setAutoScroll] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<{ iter: number; values: Record<string, number> } | null>(null);
  const [showForces, setShowForces] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const forceSvgRef = useRef<SVGSVGElement>(null);
  const autoStopFired = useRef(false);

  // Auto-stop: trigger when all residuals below tolerance
  useEffect(() => {
    if (!autoStop || !isRunning || autoStopFired.current || !onAutoStop) return;
    if (series.length === 0) return;
    const allBelow = series.every(s => {
      const last = s.data[s.data.length - 1];
      return last !== undefined && last < tolerance;
    });
    if (allBelow && iterations > 20) {
      autoStopFired.current = true;
      onAutoStop();
    }
  }, [series, iterations, isRunning, autoStop, tolerance, onAutoStop]);

  // Reset auto-stop flag when solver restarts
  useEffect(() => {
    if (isRunning) autoStopFired.current = false;
  }, [isRunning]);

  const maxDataLen = Math.max(1, ...series.map(s => s.data.length));
  const allValues = series.flatMap(s => s.data).filter(v => v > 0);
  const rawMin = allValues.length > 0 ? Math.min(...allValues) : 1e-6;
  const rawMax = allValues.length > 0 ? Math.max(...allValues) : 1;

  const yMin = logScale ? Math.floor(Math.log10(Math.max(rawMin, 1e-10))) : 0;
  const yMax = logScale ? Math.ceil(Math.log10(rawMax)) + 0.5 : rawMax * 1.1;

  const chartW = 560;
  const chartH = 160;
  const padL = 50;
  const padR = 10;
  const padT = 10;
  const padB = 25;

  const toX = useCallback((i: number) => padL + (i / Math.max(1, maxDataLen - 1)) * (chartW - padL - padR), [maxDataLen]);
  const toY = useCallback((v: number) => {
    const val = logScale ? Math.log10(Math.max(v, 1e-10)) : v;
    const t = (val - yMin) / (yMax - yMin);
    return padT + (1 - t) * (chartH - padT - padB);
  }, [logScale, yMin, yMax]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || maxDataLen < 2) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * chartW;
    const iter = Math.round(((x - padL) / (chartW - padL - padR)) * (maxDataLen - 1));
    if (iter < 0 || iter >= maxDataLen) { setHoveredPoint(null); return; }
    const values: Record<string, number> = {};
    for (const s of series) {
      if (iter < s.data.length) values[s.name] = s.data[iter];
    }
    setHoveredPoint({ iter, values });
  }, [series, maxDataLen]);

  // Y-axis grid lines
  const yTicks: number[] = [];
  if (logScale) {
    for (let e = Math.floor(yMin); e <= Math.ceil(yMax); e++) yTicks.push(e);
  } else {
    const step = (yMax - yMin) / 5;
    for (let i = 0; i <= 5; i++) yTicks.push(yMin + i * step);
  }

  return (
    <div className="bg-[#0d1117] rounded border border-[#21262d] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{title}</span>
          {isRunning && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00D4FF]/15 text-[#00D4FF] animate-pulse">
              SOLVING
            </span>
          )}
          {converged && !isRunning && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">
              CONVERGED
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLogScale(!logScale)}
            className={`text-[9px] px-1.5 py-0.5 rounded border ${logScale ? "border-[#00D4FF]/30 text-[#00D4FF] bg-[#00D4FF]/10" : "border-[#21262d] text-slate-500"}`}>
            Log
          </button>
          <span className="text-[9px] text-slate-500">Iter: {iterations}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-[#21262d]/50">
        {series.map(s => (
          <span key={s.name} className="flex items-center gap-1 text-[9px] text-slate-400">
            <span className="w-2.5 h-0.5 rounded" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
        <span className="flex items-center gap-1 text-[9px] text-slate-400">
          <span className="w-2.5 h-0.5 rounded border-dashed border-b border-red-500" style={{ borderBottom: "1px dashed #ff4444" }} />
          Tolerance
        </span>
      </div>

      {/* Chart */}
      <div className="px-2 py-1">
        <svg ref={svgRef} viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-[180px]"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}>

          {/* Grid lines */}
          {yTicks.map((tick, i) => {
            const y = toY(logScale ? Math.pow(10, tick) : tick);
            if (y < padT || y > chartH - padB) return null;
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#1a2030" strokeWidth={0.5} />
                <text x={padL - 4} y={y + 3} fill="#555" fontSize="8" textAnchor="end">
                  {logScale ? `1e${tick}` : tick.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => {
            const iter = Math.round(t * (maxDataLen - 1));
            return (
              <text key={t} x={toX(iter)} y={chartH - 5} fill="#555" fontSize="8" textAnchor="middle">
                {iter + 1}
              </text>
            );
          })}

          {/* Tolerance line */}
          {tolerance > 0 && (
            <line
              x1={padL} y1={toY(tolerance)} x2={chartW - padR} y2={toY(tolerance)}
              stroke="#ff4444" strokeWidth={1} strokeDasharray="4,3" opacity={0.7}
            />
          )}

          {/* Data series */}
          {series.map(s => {
            if (s.data.length < 2) return null;
            const points = s.data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
            return (
              <polyline key={s.name} points={points} fill="none" stroke={s.color} strokeWidth={1.5} opacity={0.9} />
            );
          })}

          {/* Hover crosshair */}
          {hoveredPoint && (
            <line
              x1={toX(hoveredPoint.iter)} y1={padT}
              x2={toX(hoveredPoint.iter)} y2={chartH - padB}
              stroke="#ffffff" strokeWidth={0.5} opacity={0.3} strokeDasharray="2,2"
            />
          )}
        </svg>
      </div>

      {/* Hover tooltip */}
      {hoveredPoint && (
        <div className="px-3 pb-2 flex items-center gap-3 text-[9px]">
          <span className="text-slate-500">Iter {hoveredPoint.iter + 1}:</span>
          {Object.entries(hoveredPoint.values).map(([name, val]) => {
            const s = series.find(s => s.name === name);
            return (
              <span key={name} style={{ color: s?.color || "#fff" }}>
                {name}: {val.toExponential(3)}
              </span>
            );
          })}
        </div>
      )}

      {/* Force History Plot */}
      {showForces && forceHistory && forceHistory.length > 1 && (
        <div className="px-2 py-1 border-t border-[#21262d]/50">
          <div className="flex items-center gap-2 px-1 mb-1">
            <span className="text-[9px] text-slate-500 font-bold uppercase">Force Coefficients</span>
            <span className="flex items-center gap-1 text-[8px] text-slate-500">
              <span className="w-2 h-0.5 rounded bg-[#ff6b6b]" /> Cd
            </span>
            <span className="flex items-center gap-1 text-[8px] text-slate-500">
              <span className="w-2 h-0.5 rounded bg-[#4ecdc4]" /> Cl
            </span>
          </div>
          <svg ref={forceSvgRef} viewBox={`0 0 ${chartW} 80`} className="w-full h-[80px]">
            {(() => {
              const fLen = forceHistory.length;
              const cdMin = Math.min(...forceHistory.map(f => f.cd));
              const cdMax = Math.max(...forceHistory.map(f => f.cd));
              const clMin = Math.min(...forceHistory.map(f => f.cl));
              const clMax = Math.max(...forceHistory.map(f => f.cl));
              const fMin = Math.min(cdMin, clMin);
              const fMax = Math.max(cdMax, clMax);
              const fRange = fMax - fMin || 1;
              const fToX = (i: number) => padL + (i / Math.max(1, fLen - 1)) * (chartW - padL - padR);
              const fToY = (v: number) => 5 + (1 - (v - fMin) / fRange) * 65;

              const cdPoints = forceHistory.map((f, i) => `${fToX(i)},${fToY(f.cd)}`).join(" ");
              const clPoints = forceHistory.map((f, i) => `${fToX(i)},${fToY(f.cl)}`).join(" ");

              return (
                <>
                  <line x1={padL} y1={5} x2={padL} y2={70} stroke="#1a2030" strokeWidth={0.5} />
                  <line x1={padL} y1={70} x2={chartW - padR} y2={70} stroke="#1a2030" strokeWidth={0.5} />
                  <text x={padL - 4} y={10} fill="#555" fontSize="7" textAnchor="end">{fMax.toFixed(3)}</text>
                  <text x={padL - 4} y={72} fill="#555" fontSize="7" textAnchor="end">{fMin.toFixed(3)}</text>
                  <polyline points={cdPoints} fill="none" stroke="#ff6b6b" strokeWidth={1.2} opacity={0.9} />
                  <polyline points={clPoints} fill="none" stroke="#4ecdc4" strokeWidth={1.2} opacity={0.9} />
                </>
              );
            })()}
          </svg>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-3 py-1.5 border-t border-[#21262d]/50 text-[9px] text-slate-500">
        {series.map(s => {
          const last = s.data[s.data.length - 1];
          return (
            <span key={s.name}>
              {s.name}: <span style={{ color: s.color }}>{last !== undefined ? last.toExponential(2) : "—"}</span>
            </span>
          );
        })}
        {forceHistory && (
          <button onClick={() => setShowForces(!showForces)}
            className={`ml-auto text-[8px] px-1.5 py-0.5 rounded border ${showForces ? "border-[#00D4FF]/30 text-[#00D4FF] bg-[#00D4FF]/10" : "border-[#21262d] text-slate-600"}`}>
            Forces
          </button>
        )}
      </div>

      {/* Extended status bar */}
      <div className="flex items-center gap-3 px-3 py-1 border-t border-[#21262d]/30 text-[8px] text-slate-600">
        {solverLabel && <span>{solverLabel}</span>}
        {currentTime !== undefined && <span>t = {currentTime.toFixed(4)}s</span>}
        {courantNumber !== undefined && (
          <span className={courantNumber > 1 ? "text-red-400" : ""}>CFL = {courantNumber.toFixed(3)}</span>
        )}
        {estimatedRemaining !== undefined && estimatedRemaining < Infinity && (
          <span>~{estimatedRemaining} iters remaining</span>
        )}
        {autoStop && <span className="text-green-400/60">Auto-stop ON</span>}
      </div>
    </div>
  );
}
