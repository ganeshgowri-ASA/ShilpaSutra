"use client";
import { useState, useCallback } from "react";
import { useCadStore } from "@/stores/cad-store";
import { useSettingsStore } from "@/stores/settings-store";
import {
  Grid3X3, Eye, EyeOff, Magnet, X, Settings2,
  ChevronDown, ChevronRight,
} from "lucide-react";

const GRID_PRESETS = [
  { label: "Fine (1mm)", size: 1 },
  { label: "Standard (5mm)", size: 5 },
  { label: "Medium (10mm)", size: 10 },
  { label: "Coarse (25mm)", size: 25 },
  { label: "Large (50mm)", size: 50 },
  { label: "XL (100mm)", size: 100 },
];

interface GridControlsProps {
  onClose: () => void;
}

export default function GridControls({ onClose }: GridControlsProps) {
  const showGrid = useCadStore((s) => s.showGrid);
  const setShowGrid = useCadStore((s) => s.setShowGrid);
  const snapGrid = useCadStore((s) => s.snapGrid);
  const setSnapGrid = useCadStore((s) => s.setSnapGrid);
  const gridSize = useCadStore((s) => s.gridSize);
  const unit = useCadStore((s) => s.unit);
  const showOrigin = useCadStore((s) => s.showOrigin);
  const setShowOrigin = useCadStore((s) => s.setShowOrigin);

  const settingsGridSize = useSettingsStore((s) => s.gridSize);
  const updateSettings = useSettingsStore((s) => s.update);
  const settingsShowGrid = useSettingsStore((s) => s.showGrid);
  const settingsShowAxes = useSettingsStore((s) => s.showAxes);

  const [customSize, setCustomSize] = useState(settingsGridSize.toString());
  const [majorInterval, setMajorInterval] = useState(5);
  const [gridColor, setGridColor] = useState("#1a2233");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleGridSizeChange = useCallback((size: number) => {
    updateSettings({ gridSize: size });
    setCustomSize(size.toString());
  }, [updateSettings]);

  const handleCustomSizeSubmit = useCallback(() => {
    const val = parseFloat(customSize);
    if (!isNaN(val) && val > 0) {
      updateSettings({ gridSize: val });
    }
  }, [customSize, updateSettings]);

  return (
    <div className="flex flex-col bg-[#0d1117] border border-[#21262d] rounded-lg shadow-2xl shadow-black/40 w-64 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d] bg-[#161b22]">
        <div className="flex items-center gap-2">
          <Grid3X3 size={13} className="text-[#00D4FF]" />
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Grid & Snap
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[#21262d] text-slate-500 hover:text-white transition-colors">
          <X size={12} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Grid visibility toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showGrid ? <Eye size={12} className="text-slate-400" /> : <EyeOff size={12} className="text-slate-600" />}
            <span className="text-[10px] text-slate-300">Show Grid</span>
          </div>
          <button
            onClick={() => {
              setShowGrid(!showGrid);
              updateSettings({ showGrid: !settingsShowGrid });
            }}
            className={`w-8 h-4 rounded-full transition-colors duration-200 ${
              showGrid ? "bg-[#00D4FF]" : "bg-[#21262d]"
            }`}
          >
            <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${
              showGrid ? "translate-x-4" : "translate-x-0.5"
            }`} />
          </button>
        </div>

        {/* Snap to grid toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Magnet size={12} className={snapGrid ? "text-[#00D4FF]" : "text-slate-600"} />
            <span className="text-[10px] text-slate-300">Snap to Grid</span>
          </div>
          <button
            onClick={() => setSnapGrid(!snapGrid)}
            className={`w-8 h-4 rounded-full transition-colors duration-200 ${
              snapGrid ? "bg-[#00D4FF]" : "bg-[#21262d]"
            }`}
          >
            <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${
              snapGrid ? "translate-x-4" : "translate-x-0.5"
            }`} />
          </button>
        </div>

        {/* Show origin toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-slate-500 font-bold">+</span>
            <span className="text-[10px] text-slate-300">Show Origin</span>
          </div>
          <button
            onClick={() => {
              setShowOrigin(!showOrigin);
              updateSettings({ showAxes: !settingsShowAxes });
            }}
            className={`w-8 h-4 rounded-full transition-colors duration-200 ${
              showOrigin ? "bg-[#00D4FF]" : "bg-[#21262d]"
            }`}
          >
            <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${
              showOrigin ? "translate-x-4" : "translate-x-0.5"
            }`} />
          </button>
        </div>

        {/* Grid spacing presets */}
        <div className="space-y-1.5">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Grid Spacing</span>
          <div className="grid grid-cols-3 gap-1">
            {GRID_PRESETS.map((preset) => (
              <button
                key={preset.size}
                onClick={() => handleGridSizeChange(preset.size)}
                className={`px-1.5 py-1 rounded text-[9px] font-medium transition-all ${
                  settingsGridSize === preset.size
                    ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                    : "text-slate-400 bg-[#161b22] border border-[#21262d] hover:border-[#30363d] hover:text-white"
                }`}
              >
                {preset.size}{unit}
              </button>
            ))}
          </div>
        </div>

        {/* Custom grid spacing */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-500 w-12">Custom</span>
          <div className="flex-1 relative">
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              onBlur={handleCustomSizeSubmit}
              onKeyDown={(e) => { if (e.key === "Enter") handleCustomSizeSubmit(); }}
              className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-[10px] text-white font-mono outline-none focus:border-[#00D4FF]/40"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-600">{unit}</span>
          </div>
        </div>

        {/* Advanced settings (collapsible) */}
        <div>
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="flex items-center gap-1 text-[9px] text-slate-500 uppercase tracking-wider font-semibold hover:text-slate-300 transition-colors"
          >
            {advancedOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            <Settings2 size={10} />
            Advanced
          </button>
          {advancedOpen && (
            <div className="mt-2 space-y-2 pl-4">
              {/* Major line interval */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 w-16">Major every</span>
                <select
                  className="flex-1 bg-[#0d1117] border border-[#21262d] rounded px-1.5 py-0.5 text-[9px] text-slate-300 outline-none"
                  value={majorInterval}
                  onChange={(e) => setMajorInterval(parseInt(e.target.value))}
                >
                  {[2, 4, 5, 8, 10].map((n) => (
                    <option key={n} value={n}>{n} lines</option>
                  ))}
                </select>
              </div>

              {/* Grid snap precision (from settings store) */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 w-16">Snap prec.</span>
                <select
                  className="flex-1 bg-[#0d1117] border border-[#21262d] rounded px-1.5 py-0.5 text-[9px] text-slate-300 outline-none"
                  value={useSettingsStore.getState().snapPrecision}
                  onChange={(e) => updateSettings({ snapPrecision: parseInt(e.target.value) })}
                >
                  {[0, 1, 2, 3, 4].map((p) => (
                    <option key={p} value={p}>{p === 0 ? "Integer" : `${p} decimal${p > 1 ? "s" : ""}`}</option>
                  ))}
                </select>
              </div>

              {/* Current grid info */}
              <div className="text-[8px] text-slate-600 space-y-0.5">
                <div>Minor spacing: {settingsGridSize}{unit}</div>
                <div>Major spacing: {settingsGridSize * majorInterval}{unit}</div>
                <div>Snap grid: {gridSize}{unit}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
