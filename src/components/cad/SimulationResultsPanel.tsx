"use client";

import { useState } from "react";
import Link from "next/link";

// ANSYS-style jet colormap (blue → cyan → green → yellow → red)
const JET_COLORS = [
  "#0000ff", "#0040ff", "#0080ff", "#00bfff", "#00ffff",
  "#00ff80", "#00ff00", "#80ff00", "#ffff00", "#ffbf00",
  "#ff8000", "#ff4000", "#ff0000",
];

function getJetColor(t: number): string {
  const idx = Math.max(0, Math.min(JET_COLORS.length - 1, Math.floor(t * (JET_COLORS.length - 1))));
  return JET_COLORS[idx];
}

interface FieldResult {
  max: number;
  min?: number;
  avg?: number;
  unit: string;
}

interface SimulationResultsPanelProps {
  analysisType: "structural" | "thermal" | "cfd";
  results: Record<string, any>;
  isRunning?: boolean;
  objectType?: string;
}

export default function SimulationResultsPanel({
  analysisType,
  results,
  isRunning,
  objectType,
}: SimulationResultsPanelProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (!results) return null;

  // Define tabs based on analysis type
  const tabs = analysisType === "structural"
    ? [
        { label: "Von Mises Stress", key: "vonMisesStress", icon: "σ", color: "text-red-400" },
        { label: "Displacement", key: "displacement", icon: "δ", color: "text-blue-400" },
        { label: "Safety Factor", key: "safetyFactor", icon: "SF", color: "text-green-400" },
      ]
    : analysisType === "thermal"
    ? [
        { label: "Temperature", key: "temperature", icon: "T", color: "text-red-400" },
        { label: "Heat Flux", key: "heatFlux", icon: "q", color: "text-orange-400" },
      ]
    : [
        { label: "Velocity", key: "velocity", icon: "V", color: "text-blue-400" },
        { label: "Pressure", key: "pressure", icon: "P", color: "text-green-400" },
        { label: "Wall Shear", key: "wallShearStress", icon: "τ", color: "text-amber-400" },
      ];

  const activeData = results[tabs[activeTab]?.key];

  // Generate a fake contour strip for visual effect
  const contourSteps = 40;

  // Status badge
  const safetyFactor = results.safetyFactor;
  const sfBadge =
    typeof safetyFactor === "number"
      ? safetyFactor > 2
        ? { text: "PASS", cls: "bg-green-500/20 text-green-400 border-green-500/30" }
        : safetyFactor > 1
        ? { text: "MARGINAL", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" }
        : { text: "FAIL", cls: "bg-red-500/20 text-red-400 border-red-500/30" }
      : null;

  return (
    <div className="bg-[#0d1117] border-t border-[#21262d]">
      {/* Header Bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#161b22] border-b border-[#21262d]">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-amber-400 animate-pulse" : "bg-green-400"}`} />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            {analysisType} Analysis
          </span>
          {objectType && <span className="text-[10px] text-slate-500">• {objectType}</span>}
        </div>

        {sfBadge && (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${sfBadge.cls}`}>
            {sfBadge.text} (SF={safetyFactor})
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {results.wallTime && (
            <span className="text-[10px] text-slate-500 font-mono">⏱ {results.wallTime}</span>
          )}
          <Link
            href="/simulator"
            className="text-[10px] bg-[#21262d] hover:bg-[#30363d] px-2 py-1 rounded text-slate-400 hover:text-white transition-colors"
          >
            Open Full Simulator →
          </Link>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-0 px-4 bg-[#0d1117] border-b border-[#21262d]">
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(i)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 transition-all ${
              activeTab === i
                ? `${tab.color} border-current`
                : "text-slate-500 border-transparent hover:text-slate-300"
            }`}
          >
            <span className="font-mono font-bold text-[10px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 py-3 flex gap-4">
        {/* Contour Heatmap Strip */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[8px] text-slate-500 font-mono">MAX</span>
          <div className="w-4 h-40 rounded overflow-hidden flex flex-col-reverse border border-[#21262d]">
            {Array.from({ length: contourSteps }).map((_, i) => (
              <div
                key={i}
                className="flex-1"
                style={{ backgroundColor: getJetColor(i / (contourSteps - 1)) }}
              />
            ))}
          </div>
          <span className="text-[8px] text-slate-500 font-mono">MIN</span>
        </div>

        {/* Results Grid */}
        <div className="flex-1 grid grid-cols-3 gap-3">
          {activeData && typeof activeData === "object" && "max" in activeData ? (
            <>
              <ResultCard
                label="Maximum"
                value={activeData.max}
                unit={activeData.unit}
                color="text-red-400"
                bgColor="bg-red-500/5"
                borderColor="border-red-500/20"
              />
              {activeData.avg !== undefined && (
                <ResultCard
                  label="Average"
                  value={activeData.avg}
                  unit={activeData.unit}
                  color="text-amber-400"
                  bgColor="bg-amber-500/5"
                  borderColor="border-amber-500/20"
                />
              )}
              {activeData.min !== undefined && (
                <ResultCard
                  label="Minimum"
                  value={activeData.min}
                  unit={activeData.unit}
                  color="text-blue-400"
                  bgColor="bg-blue-500/5"
                  borderColor="border-blue-500/20"
                />
              )}
            </>
          ) : typeof safetyFactor === "number" && tabs[activeTab]?.key === "safetyFactor" ? (
            <ResultCard
              label="Safety Factor"
              value={safetyFactor}
              unit="×"
              color={safetyFactor > 2 ? "text-green-400" : "text-red-400"}
              bgColor={safetyFactor > 2 ? "bg-green-500/5" : "bg-red-500/5"}
              borderColor={safetyFactor > 2 ? "border-green-500/20" : "border-red-500/20"}
            />
          ) : (
            <div className="col-span-3 text-slate-500 text-xs py-4 text-center">
              No data available for this field
            </div>
          )}

          {/* Additional metrics row */}
          {results.strain && tabs[activeTab]?.key === "vonMisesStress" && (
            <ResultCard
              label="Max Strain"
              value={results.strain.max}
              unit={results.strain.unit}
              color="text-purple-400"
              bgColor="bg-purple-500/5"
              borderColor="border-purple-500/20"
            />
          )}
          {results.massFlowRate && analysisType === "cfd" && (
            <ResultCard
              label="Mass Flow (inlet)"
              value={results.massFlowRate.inlet?.toFixed(3)}
              unit={results.massFlowRate.unit}
              color="text-cyan-400"
              bgColor="bg-cyan-500/5"
              borderColor="border-cyan-500/20"
            />
          )}
        </div>

        {/* Mini Convergence Chart */}
        {results.convergence && (
          <div className="w-48 flex flex-col">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">
              Convergence
            </span>
            <div className="flex-1 bg-[#161b22] rounded border border-[#21262d] p-2 flex items-end gap-px">
              {results.convergence.slice(-20).map((c: any, i: number) => {
                const maxR = Math.max(...results.convergence.map((x: any) => x.residual));
                const h = maxR > 0 ? (c.residual / maxR) * 100 : 0;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t transition-all"
                    style={{
                      height: `${Math.max(2, h)}%`,
                      backgroundColor: h > 50 ? "#f59e0b" : h > 20 ? "#22c55e" : "#00D4FF",
                    }}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-slate-600 font-mono">
                {results.converged !== false ? "✓ Converged" : "⚠ Not converged"}
              </span>
              <span className="text-[8px] text-slate-600 font-mono">
                {results.iterations || "—"} iter
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  unit,
  color,
  bgColor,
  borderColor,
}: {
  label: string;
  value: number | string;
  unit: string;
  color: string;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-3`}>
      <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-600 font-mono">{unit}</div>
    </div>
  );
}
