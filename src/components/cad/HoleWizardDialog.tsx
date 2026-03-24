"use client";
import { useState, useCallback } from "react";
import { useCadStore } from "@/stores/cad-store";
import { X, Circle, CircleDot } from "lucide-react";

type HoleType = "simple" | "counterbore" | "countersink" | "tapped" | "through" | "blind";
type HoleStandard = "ANSI_Metric" | "ANSI_Inch" | "ISO";

interface HoleConfig {
  type: HoleType;
  standard: HoleStandard;
  diameter: number;
  depth: number;
  cbDiameter: number;
  cbDepth: number;
  cskAngle: number;
  cskDiameter: number;
  threadSize: string;
  threadPitch: number;
  throughAll: boolean;
}

const defaultConfig: HoleConfig = {
  type: "simple",
  standard: "ANSI_Metric",
  diameter: 5,
  depth: 20,
  cbDiameter: 10,
  cbDepth: 5,
  cskAngle: 82,
  cskDiameter: 10,
  threadSize: "M5",
  threadPitch: 0.8,
  throughAll: false,
};

const holeTypes: { id: HoleType; label: string; icon: React.ReactNode }[] = [
  { id: "simple", label: "Simple", icon: <Circle size={14} /> },
  { id: "counterbore", label: "Counterbore", icon: <CircleDot size={14} /> },
  { id: "countersink", label: "Countersink", icon: <CircleDot size={14} /> },
  { id: "tapped", label: "Tapped", icon: <CircleDot size={14} /> },
  { id: "through", label: "Through All", icon: <Circle size={14} /> },
  { id: "blind", label: "Blind", icon: <Circle size={14} /> },
];

const standardThreadSizes: Record<string, string[]> = {
  ANSI_Metric: ["M2", "M2.5", "M3", "M4", "M5", "M6", "M8", "M10", "M12", "M14", "M16", "M20", "M24"],
  ANSI_Inch: ["#2-56", "#4-40", "#6-32", "#8-32", "#10-24", "1/4-20", "5/16-18", "3/8-16", "1/2-13"],
  ISO: ["M3", "M4", "M5", "M6", "M8", "M10", "M12", "M16", "M20"],
};

const threadPitches: Record<string, number> = {
  M2: 0.4, "M2.5": 0.45, M3: 0.5, M4: 0.7, M5: 0.8, M6: 1.0, M8: 1.25,
  M10: 1.5, M12: 1.75, M14: 2.0, M16: 2.0, M20: 2.5, M24: 3.0,
};

/**
 * Hole Wizard dialog - SolidWorks-style hole creation tool.
 * Supports simple, counterbore, countersink, tapped holes with standard sizes.
 */
export default function HoleWizardDialog({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<HoleConfig>(defaultConfig);
  const addObject = useCadStore((s) => s.addObject);
  const selectedId = useCadStore((s) => s.selectedId);

  const updateConfig = useCallback((partial: Partial<HoleConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...partial };
      // Auto-update thread pitch when thread size changes
      if (partial.threadSize && threadPitches[partial.threadSize]) {
        next.threadPitch = threadPitches[partial.threadSize];
      }
      return next;
    });
  }, []);

  const handleApply = useCallback(() => {
    // Create a cylinder representing the hole (negative volume in real CAD)
    const holeId = addObject("cylinder");
    const store = useCadStore.getState();
    store.updateObject(holeId, {
      name: `Hole - ${config.type} ${config.type === "tapped" ? config.threadSize : `⌀${config.diameter}`}`,
      dimensions: {
        width: config.diameter / 10,
        height: (config.throughAll ? 100 : config.depth) / 10,
        depth: config.diameter / 10,
      },
      color: "#ff4444",
      opacity: 0.6,
    });
    store.selectObject(holeId);
    onClose();
  }, [config, addObject, onClose]);

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto animate-scale-in">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl shadow-black/50 w-[420px] max-h-[75vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d]">
          <div className="flex items-center gap-2">
            <CircleDot size={16} className="text-[#00D4FF]" />
            <span className="text-sm font-semibold text-white">Hole Wizard</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#21262d] transition-all">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Hole Type */}
          <div>
            <label className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider block mb-2">Hole Type</label>
            <div className="grid grid-cols-3 gap-1.5">
              {holeTypes.map((ht) => (
                <button
                  key={ht.id}
                  onClick={() => updateConfig({ type: ht.id })}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-[10px] font-medium transition-all ${
                    config.type === ht.id
                      ? "bg-[#00D4FF]/10 border-[#00D4FF]/30 text-[#00D4FF]"
                      : "border-[#21262d] text-slate-400 hover:text-white hover:border-[#30363d] hover:bg-[#21262d]"
                  }`}
                >
                  {ht.icon}
                  {ht.label}
                </button>
              ))}
            </div>
          </div>

          {/* Standard */}
          <div>
            <label className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider block mb-1.5">Standard</label>
            <div className="flex gap-1.5">
              {(["ANSI_Metric", "ANSI_Inch", "ISO"] as HoleStandard[]).map((std) => (
                <button
                  key={std}
                  onClick={() => updateConfig({ standard: std })}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-medium border transition-all ${
                    config.standard === std
                      ? "bg-[#00D4FF]/10 border-[#00D4FF]/30 text-[#00D4FF]"
                      : "border-[#21262d] text-slate-400 hover:text-white hover:bg-[#21262d]"
                  }`}
                >
                  {std.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Hole Dimensions */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Diameter (mm)</label>
              <input
                type="number"
                value={config.diameter}
                onChange={(e) => updateConfig({ diameter: parseFloat(e.target.value) || 0 })}
                step={0.5}
                min={0.5}
                className="w-full px-2.5 py-1.5 bg-[#0d1117] border border-[#21262d] rounded-md text-xs text-white font-mono focus:border-[#00D4FF]/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                {config.throughAll ? "Through All" : "Depth (mm)"}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={config.depth}
                  onChange={(e) => updateConfig({ depth: parseFloat(e.target.value) || 0 })}
                  step={1}
                  min={1}
                  disabled={config.throughAll}
                  className="flex-1 px-2.5 py-1.5 bg-[#0d1117] border border-[#21262d] rounded-md text-xs text-white font-mono focus:border-[#00D4FF]/50 focus:outline-none disabled:opacity-40"
                />
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.throughAll}
                    onChange={(e) => updateConfig({ throughAll: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                    config.throughAll ? "bg-[#00D4FF]/20 border-[#00D4FF]/50" : "border-[#30363d]"
                  }`}>
                    {config.throughAll && <span className="text-[#00D4FF] text-[8px] font-bold">✓</span>}
                  </div>
                  <span className="text-[8px] text-slate-500">Thru</span>
                </label>
              </div>
            </div>
          </div>

          {/* Counterbore settings */}
          {config.type === "counterbore" && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#0d1117] rounded-lg border border-[#21262d]">
              <div className="col-span-2 text-[8px] text-slate-500 font-semibold uppercase tracking-wider">Counterbore</div>
              <div>
                <label className="text-[8px] text-slate-500 block mb-1">CB Diameter (mm)</label>
                <input
                  type="number"
                  value={config.cbDiameter}
                  onChange={(e) => updateConfig({ cbDiameter: parseFloat(e.target.value) || 0 })}
                  step={0.5}
                  className="w-full px-2 py-1 bg-[#161b22] border border-[#21262d] rounded text-[10px] text-white font-mono focus:border-[#00D4FF]/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[8px] text-slate-500 block mb-1">CB Depth (mm)</label>
                <input
                  type="number"
                  value={config.cbDepth}
                  onChange={(e) => updateConfig({ cbDepth: parseFloat(e.target.value) || 0 })}
                  step={0.5}
                  className="w-full px-2 py-1 bg-[#161b22] border border-[#21262d] rounded text-[10px] text-white font-mono focus:border-[#00D4FF]/50 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Countersink settings */}
          {config.type === "countersink" && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#0d1117] rounded-lg border border-[#21262d]">
              <div className="col-span-2 text-[8px] text-slate-500 font-semibold uppercase tracking-wider">Countersink</div>
              <div>
                <label className="text-[8px] text-slate-500 block mb-1">CSK Diameter (mm)</label>
                <input
                  type="number"
                  value={config.cskDiameter}
                  onChange={(e) => updateConfig({ cskDiameter: parseFloat(e.target.value) || 0 })}
                  step={0.5}
                  className="w-full px-2 py-1 bg-[#161b22] border border-[#21262d] rounded text-[10px] text-white font-mono focus:border-[#00D4FF]/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[8px] text-slate-500 block mb-1">CSK Angle (°)</label>
                <input
                  type="number"
                  value={config.cskAngle}
                  onChange={(e) => updateConfig({ cskAngle: parseFloat(e.target.value) || 0 })}
                  step={1}
                  className="w-full px-2 py-1 bg-[#161b22] border border-[#21262d] rounded text-[10px] text-white font-mono focus:border-[#00D4FF]/50 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Thread settings */}
          {config.type === "tapped" && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#0d1117] rounded-lg border border-[#21262d]">
              <div className="col-span-2 text-[8px] text-slate-500 font-semibold uppercase tracking-wider">Thread</div>
              <div>
                <label className="text-[8px] text-slate-500 block mb-1">Thread Size</label>
                <select
                  value={config.threadSize}
                  onChange={(e) => updateConfig({ threadSize: e.target.value })}
                  className="w-full px-2 py-1 bg-[#161b22] border border-[#21262d] rounded text-[10px] text-white font-mono focus:border-[#00D4FF]/50 focus:outline-none"
                >
                  {standardThreadSizes[config.standard].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[8px] text-slate-500 block mb-1">Pitch (mm)</label>
                <input
                  type="number"
                  value={config.threadPitch}
                  onChange={(e) => updateConfig({ threadPitch: parseFloat(e.target.value) || 0 })}
                  step={0.05}
                  className="w-full px-2 py-1 bg-[#161b22] border border-[#21262d] rounded text-[10px] text-white font-mono focus:border-[#00D4FF]/50 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Preview SVG */}
          <div className="flex justify-center py-2">
            <svg width={160} height={100} viewBox="0 0 160 100">
              <rect x={10} y={10} width={140} height={80} fill="#0d1117" stroke="#21262d" rx={2} />
              {/* Simple hole cross-section */}
              <rect x={60} y={20} width={config.diameter * 2} height={config.throughAll ? 60 : config.depth * 1.5}
                fill="#1a1a2e" stroke="#00D4FF" strokeWidth={1} rx={1} />
              {config.type === "counterbore" && (
                <rect x={50} y={20} width={config.cbDiameter * 2} height={config.cbDepth * 2}
                  fill="#1a1a2e" stroke="#3b82f6" strokeWidth={0.8} rx={1} />
              )}
              {config.type === "countersink" && (
                <polygon points={`50,20 ${60 + config.diameter * 2},20 ${60 + config.diameter},${20 + config.cskAngle / 10} 60,${20 + config.cskAngle / 10}`}
                  fill="#1a1a2e" stroke="#f59e0b" strokeWidth={0.8} />
              )}
              {config.type === "tapped" && (
                <>
                  {Array.from({ length: Math.floor(config.depth / (config.threadPitch * 3)) }, (_, i) => (
                    <line key={i}
                      x1={59} y1={25 + i * config.threadPitch * 3}
                      x2={60 + config.diameter * 2 + 1} y2={25 + i * config.threadPitch * 3}
                      stroke="#22c55e" strokeWidth={0.5} strokeDasharray="2 1"
                    />
                  ))}
                </>
              )}
              {/* Dimension lines */}
              <line x1={60} y1={15} x2={60 + config.diameter * 2} y2={15} stroke="#8b949e" strokeWidth={0.5} />
              <text x={60 + config.diameter} y={13} textAnchor="middle" fill="#8b949e" fontSize={7} fontFamily="monospace">
                ⌀{config.diameter}
              </text>
            </svg>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#21262d]">
          <span className="text-[9px] text-slate-500">
            {config.type === "tapped" ? `${config.threadSize} × ${config.threadPitch}mm pitch` : `⌀${config.diameter}mm ${config.throughAll ? "through all" : `depth ${config.depth}mm`}`}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-[10px] text-slate-400 hover:text-white border border-[#21262d] rounded-md hover:bg-[#21262d] transition-all">
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 text-[10px] font-semibold text-white bg-[#00D4FF]/20 border border-[#00D4FF]/30 rounded-md hover:bg-[#00D4FF]/30 transition-all"
            >
              Create Hole
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
