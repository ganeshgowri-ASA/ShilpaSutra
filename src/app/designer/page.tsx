"use client";
import { useState } from "react";

const tools = [
  { id: "select", icon: "🔲", label: "Select", tip: "Click to select objects" },
  { id: "line", icon: "📏", label: "Line", tip: "Draw a straight line" },
  { id: "arc", icon: "🌙", label: "Arc", tip: "Draw a curved arc" },
  { id: "circle", icon: "⭕", label: "Circle", tip: "Draw a circle" },
  { id: "rect", icon: "⬜", label: "Rectangle", tip: "Draw a rectangle" },
  { id: "spline", icon: "〰️", label: "Spline", tip: "Draw a freeform curve" },
  { id: "extrude", icon: "📦", label: "Extrude", tip: "Pull a sketch into 3D" },
  { id: "revolve", icon: "🔄", label: "Revolve", tip: "Spin sketch around axis" },
  { id: "loft", icon: "🔀", label: "Loft", tip: "Blend between sketches" },
  { id: "fillet", icon: "🔘", label: "Fillet", tip: "Round an edge" },
  { id: "chamfer", icon: "📐", label: "Chamfer", tip: "Bevel an edge" },
  { id: "mirror", icon: "🪞", label: "Mirror", tip: "Mirror geometry" },
  { id: "pattern", icon: "🔣", label: "Pattern", tip: "Linear/circular pattern" },
  { id: "measure", icon: "📐", label: "Measure", tip: "Measure distance/angle" },
  { id: "trim", icon: "✂️", label: "Trim", tip: "Trim/extend curves" },
];

export default function DesignerPage() {
  const [activeTool, setActiveTool] = useState("select");
  const [showProps, setShowProps] = useState(true);
  const [snapGrid, setSnapGrid] = useState(true);
  const [unit, setUnit] = useState("mm");
  const t = tools.find(x => x.id === activeTool);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Top Ribbon Toolbar */}
      <div className="bg-[#161b22] border-b border-[#21262d] px-3 py-1.5 flex items-center gap-1 shrink-0">
        <span className="text-xs font-bold text-[#e94560] mr-2">CAD Designer</span>
        <div className="h-5 w-px bg-[#21262d] mx-1" />
        {tools.map(tool => (
          <button key={tool.id} onClick={() => setActiveTool(tool.id)} title={tool.tip}
            className={`w-8 h-8 rounded flex items-center justify-center text-base transition-all ${activeTool === tool.id ? "bg-[#e94560] text-white shadow" : "text-slate-400 hover:text-white hover:bg-[#21262d]"}`}>
            {tool.icon}
          </button>
        ))}
        <div className="flex-1" />
        <select value={unit} onChange={e => setUnit(e.target.value)} className="bg-[#0d1117] text-xs text-slate-300 rounded px-2 py-1 border border-[#21262d]">
          <option value="mm">mm</option><option value="cm">cm</option><option value="in">inch</option><option value="m">m</option>
        </select>
        <button onClick={() => setSnapGrid(!snapGrid)} className={`text-xs px-2 py-1 rounded border ${snapGrid ? "border-green-500 text-green-400" : "border-[#21262d] text-slate-500"}`}>
          {snapGrid ? "Grid: ON" : "Grid: OFF"}
        </button>
        <button onClick={() => setShowProps(!showProps)} className="text-xs px-2 py-1 rounded border border-[#21262d] text-slate-400 hover:text-white">
          {showProps ? "Hide Props" : "Show Props"}
        </button>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Viewport */}
        <div className="flex-1 relative bg-[#0a0e14]">
          {/* Grid */}
          <div className="absolute inset-0" style={{backgroundImage:"radial-gradient(circle, #1a2332 1px, transparent 1px)",backgroundSize:"24px 24px"}} />
          {/* Origin crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-px h-32 bg-green-500/30 absolute left-1/2 -translate-x-1/2 -top-16" />
            <div className="h-px w-32 bg-red-500/30 absolute top-1/2 -translate-y-1/2 -left-16" />
            <div className="w-2 h-2 rounded-full bg-white/40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          {/* Center info */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <div className="text-6xl mb-4 opacity-20">{t?.icon}</div>
            <div className="text-sm text-slate-500">{t?.tip || "Select a tool to begin"}</div>
            <div className="text-xs text-slate-600 mt-1">Click in viewport to draw</div>
          </div>
          {/* View controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1">
            <button className="w-8 h-8 bg-[#161b22] border border-[#21262d] rounded text-slate-400 hover:text-white text-sm">+</button>
            <button className="w-8 h-8 bg-[#161b22] border border-[#21262d] rounded text-slate-400 hover:text-white text-sm">-</button>
            <button className="w-8 h-8 bg-[#161b22] border border-[#21262d] rounded text-slate-400 hover:text-white text-xs">Fit</button>
          </div>
          {/* Axes label */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[10px]">
            <span className="text-red-400">X</span>
            <span className="text-green-400">Y</span>
            <span className="text-blue-400">Z</span>
            <span className="text-slate-600 ml-2">Unit: {unit}</span>
          </div>
          {/* Status bar */}
          <div className="absolute top-2 left-2 flex items-center gap-2">
            <span className="text-[10px] bg-[#161b22]/80 border border-[#21262d] rounded px-2 py-0.5 text-slate-400">Tool: {t?.label}</span>
            <span className="text-[10px] bg-[#161b22]/80 border border-[#21262d] rounded px-2 py-0.5 text-slate-400">Snap: {snapGrid ? "Grid" : "Off"}</span>
          </div>
        </div>

        {/* Properties Panel */}
        {showProps && (
          <div className="w-64 bg-[#161b22] border-l border-[#21262d] p-3 overflow-y-auto shrink-0">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Properties</h3>
            <div className="space-y-3">
              <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
                <div className="text-xs text-slate-400 mb-1">Active Tool</div>
                <div className="text-sm font-semibold text-white flex items-center gap-2"><span className="text-lg">{t?.icon}</span> {t?.label}</div>
                <div className="text-[10px] text-slate-500 mt-1">{t?.tip}</div>
              </div>
              <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
                <div className="text-xs text-slate-400 mb-2">Position</div>
                <div className="grid grid-cols-3 gap-2">
                  {["X","Y","Z"].map(axis => (
                    <div key={axis}>
                      <label className="text-[10px] text-slate-500">{axis}</label>
                      <input type="number" defaultValue="0" className="w-full bg-[#161b22] text-xs text-white rounded px-2 py-1 border border-[#21262d]" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
                <div className="text-xs text-slate-400 mb-2">Dimensions</div>
                <div className="space-y-2">
                  {["Width","Height","Depth"].map(d => (
                    <div key={d} className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-500">{d}</label>
                      <input type="number" defaultValue="100" className="w-20 bg-[#161b22] text-xs text-white rounded px-2 py-1 border border-[#21262d] text-right" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
                <div className="text-xs text-slate-400 mb-2">Material</div>
                <select className="w-full bg-[#161b22] text-xs text-white rounded px-2 py-1 border border-[#21262d]">
                  <option>Steel (AISI 1045)</option><option>Aluminum 6061-T6</option><option>Titanium Ti-6Al-4V</option><option>ABS Plastic</option>
                </select>
              </div>
              <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
                <div className="text-xs text-slate-400 mb-2">Quick Actions</div>
                <div className="grid grid-cols-2 gap-1">
                  {["Export STEP","Export STL","Run FEA","AI Assist"].map(a => (
                    <button key={a} className="text-[10px] py-1.5 rounded bg-[#21262d] text-slate-300 hover:bg-[#e94560] hover:text-white transition-colors">{a}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
