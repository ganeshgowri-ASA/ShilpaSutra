"use client";
import { useState, useCallback } from "react";
import { X, Zap } from "lucide-react";

type MeshQuality = "coarse" | "medium" | "fine" | "custom";

interface MeshConfig {
  quality: MeshQuality;
  elementSize: number;
  minElementSize: number;
  growthRate: number;
  layers: number;
  layerGrowthRate: number;
  refinementRegions: number;
  adaptiveRefinement: boolean;
}

const qualityPresets: Record<MeshQuality, Partial<MeshConfig>> = {
  coarse: { elementSize: 10, minElementSize: 5, growthRate: 1.5, layers: 3, layerGrowthRate: 1.3 },
  medium: { elementSize: 5, minElementSize: 2, growthRate: 1.3, layers: 5, layerGrowthRate: 1.2 },
  fine: { elementSize: 2, minElementSize: 0.5, growthRate: 1.1, layers: 8, layerGrowthRate: 1.1 },
  custom: {},
};

/**
 * Mesh Quality controls for FEA/CFD simulation.
 * Coarse/Medium/Fine presets with custom parameter overrides.
 */
export default function MeshQualityPanel({ onClose, onApply }: { onClose: () => void; onApply?: (config: MeshConfig) => void }) {
  const [config, setConfig] = useState<MeshConfig>({
    quality: "medium",
    elementSize: 5,
    minElementSize: 2,
    growthRate: 1.3,
    layers: 5,
    layerGrowthRate: 1.2,
    refinementRegions: 0,
    adaptiveRefinement: false,
  });

  const handleQualityChange = useCallback((quality: MeshQuality) => {
    if (quality !== "custom") {
      const preset = qualityPresets[quality];
      setConfig(prev => ({ ...prev, quality, ...preset }));
    } else {
      setConfig(prev => ({ ...prev, quality }));
    }
  }, []);

  const handleApply = useCallback(() => {
    onApply?.(config);
    onClose();
  }, [config, onApply, onClose]);

  // Estimate element count
  const estimatedElements = Math.round(1000 / (config.elementSize * config.elementSize) * 500);

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto animate-scale-in">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl shadow-black/50 w-[360px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d]">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-emerald-400" />
            <span className="text-sm font-semibold text-white">Mesh Quality</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#21262d] transition-all">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Quality presets */}
          <div>
            <label className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider block mb-2">Quality Preset</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["coarse", "medium", "fine", "custom"] as MeshQuality[]).map((q) => {
                const colors: Record<MeshQuality, string> = {
                  coarse: "#f59e0b", medium: "#3b82f6", fine: "#22c55e", custom: "#a855f7",
                };
                const icons: Record<MeshQuality, string> = {
                  coarse: "▦", medium: "▣", fine: "▩", custom: "⚙",
                };
                return (
                  <button
                    key={q}
                    onClick={() => handleQualityChange(q)}
                    className={`py-2.5 rounded-lg border text-[10px] font-medium transition-all ${
                      config.quality === q
                        ? "border-opacity-50"
                        : "border-[#21262d] text-slate-400 hover:text-white hover:bg-[#21262d]"
                    }`}
                    style={config.quality === q ? {
                      backgroundColor: `${colors[q]}15`,
                      borderColor: `${colors[q]}50`,
                      color: colors[q],
                    } : undefined}
                  >
                    <div className="text-sm mb-0.5">{icons[q]}</div>
                    <div className="capitalize">{q}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mesh parameters */}
          <div className="space-y-3 p-3 bg-[#0d1117] rounded-lg border border-[#21262d]">
            <div className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider">Parameters</div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[8px] text-slate-500 block mb-1">Element Size (mm)</label>
                <input
                  type="number"
                  value={config.elementSize}
                  onChange={(e) => setConfig(prev => ({ ...prev, elementSize: parseFloat(e.target.value) || 1, quality: "custom" }))}
                  step={0.5}
                  min={0.1}
                  className="w-full px-2 py-1.5 bg-[#161b22] border border-[#21262d] rounded text-[10px] text-white font-mono focus:border-[#00D4FF]/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[8px] text-slate-500 block mb-1">Min Element Size (mm)</label>
                <input
                  type="number"
                  value={config.minElementSize}
                  onChange={(e) => setConfig(prev => ({ ...prev, minElementSize: parseFloat(e.target.value) || 0.1, quality: "custom" }))}
                  step={0.1}
                  min={0.01}
                  className="w-full px-2 py-1.5 bg-[#161b22] border border-[#21262d] rounded text-[10px] text-white font-mono focus:border-[#00D4FF]/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[8px] text-slate-500 block mb-1">Growth Rate</label>
                <input
                  type="number"
                  value={config.growthRate}
                  onChange={(e) => setConfig(prev => ({ ...prev, growthRate: parseFloat(e.target.value) || 1.1, quality: "custom" }))}
                  step={0.05}
                  min={1.0}
                  max={2.0}
                  className="w-full px-2 py-1.5 bg-[#161b22] border border-[#21262d] rounded text-[10px] text-white font-mono focus:border-[#00D4FF]/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[8px] text-slate-500 block mb-1">Boundary Layers</label>
                <input
                  type="number"
                  value={config.layers}
                  onChange={(e) => setConfig(prev => ({ ...prev, layers: parseInt(e.target.value) || 1, quality: "custom" }))}
                  step={1}
                  min={0}
                  max={20}
                  className="w-full px-2 py-1.5 bg-[#161b22] border border-[#21262d] rounded text-[10px] text-white font-mono focus:border-[#00D4FF]/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Adaptive refinement */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                config.adaptiveRefinement ? "bg-emerald-500/20 border-emerald-500/50" : "border-[#30363d]"
              }`}>
                {config.adaptiveRefinement && <span className="text-emerald-400 text-[8px] font-bold">✓</span>}
              </div>
              <input
                type="checkbox"
                checked={config.adaptiveRefinement}
                onChange={(e) => setConfig(prev => ({ ...prev, adaptiveRefinement: e.target.checked }))}
                className="sr-only"
              />
              <span className="text-[9px] text-slate-400 group-hover:text-slate-300 transition-colors">Adaptive mesh refinement</span>
            </label>
          </div>

          {/* Mesh quality visualization */}
          <div className="flex items-center gap-3 p-2.5 bg-[#0d1117] rounded-lg border border-[#21262d]">
            <svg width={60} height={40} viewBox="0 0 60 40">
              {/* Simple mesh preview */}
              {Array.from({ length: Math.min(8, Math.floor(20 / config.elementSize)) }, (_, i) =>
                Array.from({ length: Math.min(6, Math.floor(15 / config.elementSize)) }, (_, j) => (
                  <rect
                    key={`${i}-${j}`}
                    x={i * (60 / Math.min(8, Math.floor(20 / config.elementSize)))}
                    y={j * (40 / Math.min(6, Math.floor(15 / config.elementSize)))}
                    width={60 / Math.min(8, Math.floor(20 / config.elementSize)) - 0.5}
                    height={40 / Math.min(6, Math.floor(15 / config.elementSize)) - 0.5}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={0.5}
                    opacity={0.4}
                  />
                ))
              )}
            </svg>
            <div>
              <div className="text-[9px] text-slate-400">Estimated Elements</div>
              <div className="text-[12px] font-mono font-semibold text-emerald-400">{estimatedElements.toLocaleString()}</div>
              <div className="text-[7px] text-slate-600">
                {estimatedElements < 5000 ? "Fast solve" : estimatedElements < 50000 ? "Moderate" : "High accuracy"}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#21262d]">
          <button onClick={onClose} className="px-3 py-1.5 text-[10px] text-slate-400 hover:text-white border border-[#21262d] rounded-md hover:bg-[#21262d] transition-all">
            Cancel
          </button>
          <button onClick={handleApply} className="px-4 py-1.5 text-[10px] font-semibold text-white bg-emerald-500/20 border border-emerald-500/30 rounded-md hover:bg-emerald-500/30 transition-all">
            Generate Mesh
          </button>
        </div>
      </div>
    </div>
  );
}
