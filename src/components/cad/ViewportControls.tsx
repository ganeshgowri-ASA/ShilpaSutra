"use client";

import { useState } from "react";

interface ViewportControlsProps {
  onViewChange?: (view: string) => void;
  onRenderModeChange?: (mode: string) => void;
  onToggleGrid?: () => void;
  onToggleAxes?: () => void;
  showGrid?: boolean;
  showAxes?: boolean;
}

const VIEW_PRESETS = [
  { label: "ISO", icon: "◇", tooltip: "Isometric View", position: [3, 2, 3] },
  { label: "Front", icon: "▣", tooltip: "Front View (+Z)", position: [0, 0, 5] },
  { label: "Top", icon: "▤", tooltip: "Top View (+Y)", position: [0, 5, 0] },
  { label: "Right", icon: "▥", tooltip: "Right View (+X)", position: [5, 0, 0] },
  { label: "Back", icon: "▣", tooltip: "Back View (-Z)", position: [0, 0, -5] },
  { label: "Left", icon: "▥", tooltip: "Left View (-X)", position: [-5, 0, 0] },
];

const RENDER_MODES = [
  { label: "Shaded", icon: "●", value: "shaded" },
  { label: "Wireframe", icon: "◻", value: "wireframe" },
  { label: "X-Ray", icon: "◈", value: "xray" },
  { label: "Flat", icon: "■", value: "flat" },
];

export default function ViewportControls({
  onViewChange,
  onRenderModeChange,
  onToggleGrid,
  onToggleAxes,
  showGrid = true,
  showAxes = true,
}: ViewportControlsProps) {
  const [activeView, setActiveView] = useState("ISO");
  const [activeMode, setActiveMode] = useState("shaded");
  const [showPanel, setShowPanel] = useState(false);

  return (
    <>
      {/* Axis Gizmo (top-right of viewport) */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
        {/* Mini axis indicator */}
        <div className="w-14 h-14 bg-[#161b22]/80 backdrop-blur border border-[#21262d] rounded-lg flex items-center justify-center relative">
          <svg width="40" height="40" viewBox="0 0 40 40">
            {/* X axis (red) */}
            <line x1="20" y1="20" x2="36" y2="14" stroke="#ef4444" strokeWidth="2" />
            <text x="37" y="14" fill="#ef4444" fontSize="8" fontWeight="bold">X</text>
            {/* Y axis (green) */}
            <line x1="20" y1="20" x2="20" y2="4" stroke="#22c55e" strokeWidth="2" />
            <text x="22" y="6" fill="#22c55e" fontSize="8" fontWeight="bold">Y</text>
            {/* Z axis (blue) */}
            <line x1="20" y1="20" x2="8" y2="30" stroke="#3b82f6" strokeWidth="2" />
            <text x="4" y="34" fill="#3b82f6" fontSize="8" fontWeight="bold">Z</text>
            {/* Origin dot */}
            <circle cx="20" cy="20" r="2" fill="#fff" />
          </svg>
        </div>

        {/* View Controls Toggle */}
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="w-8 h-8 bg-[#161b22]/80 backdrop-blur border border-[#21262d] rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:border-[#00D4FF]/30 transition-all text-xs"
          title="Viewport Controls"
        >
          ⚙
        </button>
      </div>

      {/* Expanded Control Panel */}
      {showPanel && (
        <div className="absolute top-20 right-3 z-20 w-44 bg-[#161b22]/95 backdrop-blur border border-[#21262d] rounded-lg shadow-2xl overflow-hidden">
          {/* View Presets */}
          <div className="p-2 border-b border-[#21262d]">
            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold px-1">View Presets</span>
            <div className="grid grid-cols-3 gap-1 mt-1.5">
              {VIEW_PRESETS.map((v) => (
                <button
                  key={v.label}
                  onClick={() => {
                    setActiveView(v.label);
                    onViewChange?.(v.label);
                  }}
                  className={`text-[9px] py-1.5 px-1 rounded font-medium transition-all ${
                    activeView === v.label
                      ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                      : "text-slate-400 hover:bg-[#21262d] hover:text-white border border-transparent"
                  }`}
                  title={v.tooltip}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Render Modes */}
          <div className="p-2 border-b border-[#21262d]">
            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold px-1">Render Mode</span>
            <div className="grid grid-cols-2 gap-1 mt-1.5">
              {RENDER_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => {
                    setActiveMode(m.value);
                    onRenderModeChange?.(m.value);
                  }}
                  className={`flex items-center gap-1 text-[9px] py-1.5 px-2 rounded font-medium transition-all ${
                    activeMode === m.value
                      ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                      : "text-slate-400 hover:bg-[#21262d] hover:text-white border border-transparent"
                  }`}
                >
                  <span>{m.icon}</span> {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="p-2 space-y-1.5">
            <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={() => onToggleGrid?.()}
                className="accent-[#00D4FF] w-3 h-3"
              />
              Show Grid
            </label>
            <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={showAxes}
                onChange={() => onToggleAxes?.()}
                className="accent-[#00D4FF] w-3 h-3"
              />
              Show Axes
            </label>
          </div>
        </div>
      )}

      {/* Bottom-left: Dimensions annotation */}
      <div className="absolute bottom-14 left-4 z-10 bg-[#161b22]/80 backdrop-blur border border-[#21262d] rounded px-2 py-1 flex items-center gap-3">
        <span className="text-[9px] text-slate-500">Scale: 10mm = 1 unit</span>
        <span className="text-[9px] text-slate-600">|</span>
        <span className="text-[9px] text-slate-500">Units: mm</span>
      </div>
    </>
  );
}
