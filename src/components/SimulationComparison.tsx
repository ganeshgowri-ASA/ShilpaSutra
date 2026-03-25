"use client";
import { useState, useCallback } from "react";

export interface SimulationRun {
  id: string;
  name: string;
  timestamp: string;
  material: string;
  meshRes: number;
  elementType: string;
  maxStress: number;
  minStress: number;
  maxDisplacement: number;
  safetyFactor: number;
  iterations: number;
  converged: boolean;
  loads: number;
  constraints: number;
  strainEnergy?: number;
  naturalFreqs?: number[];
}

interface SimulationComparisonProps {
  runs: SimulationRun[];
  onClear?: () => void;
}

function formatDelta(a: number, b: number): { text: string; color: string } {
  if (b === 0) return { text: "—", color: "text-slate-500" };
  const pct = ((a - b) / Math.abs(b)) * 100;
  if (Math.abs(pct) < 0.1) return { text: "0%", color: "text-slate-500" };
  return {
    text: `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`,
    color: pct > 0 ? "text-red-400" : "text-green-400",
  };
}

export default function SimulationComparison({ runs, onClear }: SimulationComparisonProps) {
  const [selectedRuns, setSelectedRuns] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<keyof SimulationRun>("timestamp");

  const toggleRun = useCallback((id: string) => {
    setSelectedRuns(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) :
      prev.length < 4 ? [...prev, id] : prev
    );
  }, []);

  const selected = runs.filter(r => selectedRuns.includes(r.id));
  const sorted = [...runs].sort((a, b) => {
    const va = a[sortBy];
    const vb = b[sortBy];
    if (typeof va === "number" && typeof vb === "number") return vb - va;
    return String(vb).localeCompare(String(va));
  });

  const compareFields: { key: keyof SimulationRun; label: string; unit: string; higherIsBetter: boolean }[] = [
    { key: "maxStress", label: "Max Stress", unit: "MPa", higherIsBetter: false },
    { key: "maxDisplacement", label: "Max Displacement", unit: "mm", higherIsBetter: false },
    { key: "safetyFactor", label: "Safety Factor", unit: "", higherIsBetter: true },
    { key: "iterations", label: "Iterations", unit: "", higherIsBetter: false },
    { key: "meshRes", label: "Mesh Resolution", unit: "", higherIsBetter: true },
  ];

  return (
    <div className="bg-[#0d1117] rounded border border-[#21262d] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
            Simulation Comparison
          </span>
          <span className="text-[9px] text-slate-500">({runs.length} runs)</span>
        </div>
        <div className="flex items-center gap-2">
          {selected.length >= 2 && (
            <span className="text-[9px] text-[#00D4FF]">{selected.length} selected</span>
          )}
          {onClear && (
            <button onClick={onClear} className="text-[9px] text-slate-600 hover:text-red-400">
              Clear History
            </button>
          )}
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="px-3 py-6 text-center text-[10px] text-slate-600">
          Run simulations to compare results. Each run is saved automatically.
        </div>
      ) : (
        <>
          {/* Run selection */}
          <div className="px-3 py-2 border-b border-[#21262d]/50">
            <div className="text-[9px] text-slate-500 mb-1.5">Select up to 4 runs to compare:</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {sorted.map(run => (
                <label key={run.id}
                  className={`flex items-center gap-2 text-[10px] p-1.5 rounded border cursor-pointer ${
                    selectedRuns.includes(run.id)
                      ? "bg-[#00D4FF]/10 border-[#00D4FF]/30 text-white"
                      : "bg-[#161b22] border-[#21262d] text-slate-400 hover:border-[#30363d]"
                  }`}>
                  <input type="checkbox" checked={selectedRuns.includes(run.id)}
                    onChange={() => toggleRun(run.id)}
                    className="accent-[#00D4FF]" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{run.name}</span>
                    <span className="text-slate-600 ml-1">{run.material} | {run.meshRes}x{run.meshRes} {run.elementType}</span>
                  </div>
                  <span className={`text-[9px] ${run.safetyFactor > 2 ? "text-green-400" : run.safetyFactor > 1 ? "text-amber-400" : "text-red-400"}`}>
                    SF: {run.safetyFactor.toFixed(2)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Comparison Table */}
          {selected.length >= 2 && (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-[#21262d]">
                    <th className="text-left py-2 px-3 text-slate-500 font-medium">Parameter</th>
                    {selected.map(run => (
                      <th key={run.id} className="text-right py-2 px-2 text-[#00D4FF] font-medium max-w-[100px] truncate">
                        {run.name}
                      </th>
                    ))}
                    {selected.length === 2 && (
                      <th className="text-right py-2 px-2 text-slate-500 font-medium">Delta</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#21262d]/50">
                    <td className="py-1.5 px-3 text-slate-500">Material</td>
                    {selected.map(run => (
                      <td key={run.id} className="py-1.5 px-2 text-right text-white">{run.material}</td>
                    ))}
                    {selected.length === 2 && <td />}
                  </tr>
                  <tr className="border-b border-[#21262d]/50">
                    <td className="py-1.5 px-3 text-slate-500">Element Type</td>
                    {selected.map(run => (
                      <td key={run.id} className="py-1.5 px-2 text-right text-white">{run.elementType.toUpperCase()}</td>
                    ))}
                    {selected.length === 2 && <td />}
                  </tr>
                  {compareFields.map(field => {
                    const values = selected.map(r => r[field.key] as number);
                    const best = field.higherIsBetter ? Math.max(...values) : Math.min(...values);
                    return (
                      <tr key={field.key} className="border-b border-[#21262d]/50">
                        <td className="py-1.5 px-3 text-slate-500">{field.label}</td>
                        {selected.map((run, idx) => {
                          const val = run[field.key] as number;
                          const isBest = val === best;
                          return (
                            <td key={run.id} className={`py-1.5 px-2 text-right font-bold ${isBest ? "text-[#00D4FF]" : "text-slate-300"}`}>
                              {typeof val === "number" ? val.toFixed(2) : val} {field.unit && <span className="text-slate-600 font-normal">{field.unit}</span>}
                            </td>
                          );
                        })}
                        {selected.length === 2 && (
                          <td className="py-1.5 px-2 text-right">
                            {(() => {
                              const d = formatDelta(values[0], values[1]);
                              return <span className={d.color}>{d.text}</span>;
                            })()}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="py-1.5 px-3 text-slate-500">Converged</td>
                    {selected.map(run => (
                      <td key={run.id} className={`py-1.5 px-2 text-right font-bold ${run.converged ? "text-green-400" : "text-red-400"}`}>
                        {run.converged ? "Yes" : "No"}
                      </td>
                    ))}
                    {selected.length === 2 && <td />}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Bar Chart Comparison */}
          {selected.length >= 2 && (
            <div className="px-3 py-2 border-t border-[#21262d]">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Safety Factor Comparison</div>
              <div className="space-y-1.5">
                {selected.map(run => {
                  const barWidth = Math.min(100, (run.safetyFactor / 4) * 100);
                  return (
                    <div key={run.id} className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-500 w-16 truncate">{run.name}</span>
                      <div className="flex-1 h-3 bg-[#161b22] rounded overflow-hidden">
                        <div className={`h-full rounded ${
                          run.safetyFactor > 2 ? "bg-green-500" : run.safetyFactor > 1 ? "bg-amber-500" : "bg-red-500"
                        }`} style={{ width: `${barWidth}%` }} />
                      </div>
                      <span className={`text-[9px] font-bold w-8 text-right ${
                        run.safetyFactor > 2 ? "text-green-400" : run.safetyFactor > 1 ? "text-amber-400" : "text-red-400"
                      }`}>{run.safetyFactor.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-2 text-[8px] text-slate-600">
                <span>0</span>
                <div className="flex-1 flex justify-between">
                  <span>|</span><span className="text-amber-500">1.0 (Yield)</span><span>|</span><span className="text-green-500">2.0 (Safe)</span><span>|</span>
                </div>
                <span>4+</span>
              </div>
            </div>
          )}

          {selected.length < 2 && runs.length >= 2 && (
            <div className="px-3 py-3 text-center text-[10px] text-slate-600">
              Select at least 2 runs to compare
            </div>
          )}
        </>
      )}
    </div>
  );
}
