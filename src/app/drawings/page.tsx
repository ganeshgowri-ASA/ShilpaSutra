"use client";
import { useState, useCallback } from "react";

type PaperSize = "A4" | "A3" | "A2" | "A1";
type DimTool = "linear" | "angular" | "radial" | "diameter" | "ordinate";
type ViewType = "front" | "top" | "right" | "isometric" | "section" | "detail";

interface Sheet {
  id: string;
  name: string;
  size: PaperSize;
  scale: string;
  views: DrawingView[];
}

interface DrawingView {
  id: string;
  type: ViewType;
  label: string;
  x: number;
  y: number;
  scale: string;
}

interface Dimension {
  id: string;
  type: DimTool;
  value: string;
  tolerance?: string;
}

interface GDTFrame {
  id: string;
  symbol: string;
  label: string;
  tolerance: string;
  datum?: string;
}

interface TitleBlock {
  title: string;
  partNo: string;
  rev: string;
  material: string;
  drawnBy: string;
  date: string;
  checkedBy: string;
  scale: string;
  sheet: string;
  project: string;
}

const paperSizes: Record<PaperSize, { width: number; height: number; label: string }> = {
  A4: { width: 210, height: 297, label: "A4 (210x297mm)" },
  A3: { width: 297, height: 420, label: "A3 (297x420mm)" },
  A2: { width: 420, height: 594, label: "A2 (420x594mm)" },
  A1: { width: 594, height: 841, label: "A1 (594x841mm)" },
};

const scales = ["1:1", "1:2", "1:5", "1:10", "2:1", "5:1", "10:1"];

const gdtSymbols: { id: string; label: string; symbol: string; category: string }[] = [
  { id: "flatness", label: "Flatness", symbol: "\u25AF", category: "Form" },
  { id: "parallelism", label: "Parallelism", symbol: "\u2225", category: "Orientation" },
  { id: "perpendicularity", label: "Perpendicularity", symbol: "\u27C2", category: "Orientation" },
  { id: "position", label: "Position", symbol: "\u2295", category: "Location" },
  { id: "concentricity", label: "Concentricity", symbol: "\u25CE", category: "Location" },
  { id: "runout", label: "Runout", symbol: "\u2197", category: "Runout" },
  { id: "cylindricity", label: "Cylindricity", symbol: "\u232D", category: "Form" },
  { id: "symmetry", label: "Symmetry", symbol: "\u232F", category: "Location" },
];

const dimTools: { id: DimTool; label: string; icon: string }[] = [
  { id: "linear", label: "Linear", icon: "↔" },
  { id: "angular", label: "Angular", icon: "∠" },
  { id: "radial", label: "Radial", icon: "R" },
  { id: "diameter", label: "Diameter", icon: "⌀" },
  { id: "ordinate", label: "Ordinate", icon: "⊥" },
];

const annotTools = [
  { id: "note", label: "Note", icon: "N" },
  { id: "leader", label: "Leader", icon: "→" },
  { id: "balloon", label: "Balloon", icon: "◯" },
  { id: "surface", label: "Surface Finish", icon: "▽" },
  { id: "weld", label: "Weld Symbol", icon: "⊻" },
  { id: "datum", label: "Datum", icon: "▲" },
];

const exportFormats = [
  { id: "pdf", label: "PDF (Vector)", ext: "pdf" },
  { id: "dxf", label: "DXF (AutoCAD)", ext: "dxf" },
  { id: "svg", label: "SVG (Web)", ext: "svg" },
];

const defaultSheets: Sheet[] = [
  {
    id: "s1", name: "Sheet 1 - General Assembly", size: "A3", scale: "1:1",
    views: [
      { id: "v1", type: "front", label: "Front View", x: 25, y: 20, scale: "1:1" },
      { id: "v2", type: "top", label: "Top View", x: 25, y: 55, scale: "1:1" },
      { id: "v3", type: "right", label: "Right View", x: 60, y: 20, scale: "1:1" },
      { id: "v4", type: "isometric", label: "Isometric", x: 60, y: 55, scale: "1:2" },
    ],
  },
  {
    id: "s2", name: "Sheet 2 - Section A-A", size: "A3", scale: "2:1",
    views: [
      { id: "v5", type: "section", label: "Section A-A", x: 30, y: 30, scale: "2:1" },
      { id: "v6", type: "detail", label: "Detail B (5:1)", x: 65, y: 30, scale: "5:1" },
    ],
  },
];

export default function DrawingsPage() {
  const [sheets, setSheets] = useState<Sheet[]>(defaultSheets);
  const [activeSheetId, setActiveSheetId] = useState("s1");
  const [activeTool, setActiveTool] = useState<string>("linear");
  const [activeGDT, setActiveGDT] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [lineWeight, setLineWeight] = useState<"thin" | "medium" | "thick">("medium");
  const [standard, setStandard] = useState<"ISO" | "ASME">("ISO");
  const [titleBlock, setTitleBlock] = useState<TitleBlock>({
    title: "Bracket Assembly",
    partNo: "SS-BRK-001",
    rev: "A",
    material: "Al 6061-T6",
    drawnBy: "ShilpaSutra AI",
    date: "2026-03-20",
    checkedBy: "—",
    scale: "1:1",
    sheet: "1 of 2",
    project: "ShilpaSutra Demo",
  });
  const [editingTitle, setEditingTitle] = useState(false);

  const activeSheet = sheets.find((s) => s.id === activeSheetId) || sheets[0];
  const paperInfo = paperSizes[activeSheet.size];

  const addSheet = () => {
    const id = `s_${Date.now()}`;
    setSheets((prev) => [
      ...prev,
      {
        id,
        name: `Sheet ${prev.length + 1}`,
        size: "A3" as PaperSize,
        scale: "1:1",
        views: [],
      },
    ]);
    setActiveSheetId(id);
  };

  const addView = (type: ViewType) => {
    setSheets((prev) =>
      prev.map((s) =>
        s.id === activeSheetId
          ? {
              ...s,
              views: [
                ...s.views,
                {
                  id: `v_${Date.now()}`,
                  type,
                  label: `${type.charAt(0).toUpperCase() + type.slice(1)} View`,
                  x: 20 + Math.random() * 40,
                  y: 20 + Math.random() * 40,
                  scale: s.scale,
                },
              ],
            }
          : s
      )
    );
  };

  const exportDrawing = useCallback((format: string) => {
    const blob = new Blob([`ShilpaSutra Drawing Export - ${format}\nSheet: ${activeSheet.name}\nScale: ${activeSheet.scale}`], { type: "text/plain" });
    const link = document.createElement("a");
    link.download = `${titleBlock.partNo}_${activeSheet.name}.${format}`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    setShowExport(false);
  }, [activeSheet, titleBlock]);

  const getLineStyle = (type: string) => {
    switch (type) {
      case "visible": return { strokeWidth: 2, strokeDasharray: "none" };
      case "hidden": return { strokeWidth: 1, strokeDasharray: "6,3" };
      case "center": return { strokeWidth: 0.5, strokeDasharray: "12,3,3,3" };
      default: return { strokeWidth: 1, strokeDasharray: "none" };
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Header Toolbar */}
      <div className="bg-[#161b22] border-b border-[#21262d] px-3 py-1.5 flex items-center gap-2 shrink-0">
        <span className="text-xs font-bold text-[#00D4FF]">2D Drawings</span>
        <div className="h-4 w-px bg-[#21262d] mx-1" />

        {/* Dimension Tools */}
        <span className="text-[9px] text-slate-500 uppercase">Dim:</span>
        {dimTools.map((d) => (
          <button
            key={d.id}
            onClick={() => setActiveTool(d.id)}
            className={`px-2 py-1 rounded text-[10px] font-medium ${
              activeTool === d.id ? "bg-[#00D4FF] text-black" : "bg-[#21262d] text-slate-400 hover:text-white"
            }`}
          >
            <span className="mr-0.5">{d.icon}</span> {d.label}
          </button>
        ))}

        <div className="h-4 w-px bg-[#21262d] mx-1" />

        {/* Annotation Tools */}
        <span className="text-[9px] text-slate-500 uppercase">Annot:</span>
        {annotTools.map((a) => (
          <button
            key={a.id}
            onClick={() => setActiveTool(a.id)}
            className={`px-2 py-1 rounded text-[10px] ${
              activeTool === a.id ? "bg-blue-600 text-white" : "bg-[#21262d] text-slate-400 hover:text-white"
            }`}
          >
            {a.label}
          </button>
        ))}

        <div className="flex-1" />

        {/* Standard selector */}
        <select
          value={standard}
          onChange={(e) => setStandard(e.target.value as "ISO" | "ASME")}
          className="bg-[#21262d] text-xs text-white rounded px-2 py-1 border border-[#30363d]"
        >
          <option value="ISO">ISO 128</option>
          <option value="ASME">ASME Y14.5</option>
        </select>

        {/* Export */}
        <div className="relative">
          <button
            onClick={() => setShowExport(!showExport)}
            className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-xs font-bold text-white"
          >
            Export
          </button>
          {showExport && (
            <div className="absolute right-0 top-full mt-1 bg-[#161b22] border border-[#21262d] rounded shadow-xl z-50 min-w-[160px]">
              {exportFormats.map((f) => (
                <button
                  key={f.id}
                  onClick={() => exportDrawing(f.ext)}
                  className="w-full px-4 py-2 hover:bg-[#00D4FF]/10 text-xs text-left text-slate-300 hover:text-white"
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-56 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0">
          {/* Sheets */}
          <div className="px-3 py-2 border-b border-[#21262d]">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sheets</div>
            {sheets.map((s) => (
              <div
                key={s.id}
                onClick={() => setActiveSheetId(s.id)}
                className={`py-1.5 px-2 rounded text-xs cursor-pointer mb-1 ${
                  activeSheetId === s.id
                    ? "bg-[#00D4FF]/10 border border-[#00D4FF]/40 text-white"
                    : "hover:bg-[#21262d] text-slate-400"
                }`}
              >
                <div className="font-medium">{s.name}</div>
                <div className="text-[9px] text-slate-500">
                  {s.size} | {s.scale} | {s.views.length} views
                </div>
              </div>
            ))}
            <button
              onClick={addSheet}
              className="w-full mt-1 border border-dashed border-[#21262d] py-1 rounded text-[10px] text-slate-500 hover:text-white hover:border-[#00D4FF]"
            >
              + New Sheet
            </button>
          </div>

          {/* Views */}
          <div className="px-3 py-2 border-b border-[#21262d]">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Add View</div>
            <div className="grid grid-cols-2 gap-1">
              {(["front", "top", "right", "isometric", "section", "detail"] as ViewType[]).map((v) => (
                <button
                  key={v}
                  onClick={() => addView(v)}
                  className="px-2 py-1.5 rounded text-[10px] bg-[#0d1117] border border-[#21262d] text-slate-400 hover:border-[#00D4FF] hover:text-white capitalize"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* GD&T Symbols */}
          <div className="px-3 py-2 border-b border-[#21262d]">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">GD&T Symbols</div>
            <div className="grid grid-cols-2 gap-1">
              {gdtSymbols.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveGDT(activeGDT === g.id ? null : g.id)}
                  className={`px-1.5 py-1.5 rounded text-[10px] flex items-center gap-1 ${
                    activeGDT === g.id
                      ? "bg-orange-600 text-white"
                      : "bg-[#0d1117] border border-[#21262d] text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="text-sm leading-none">{g.symbol}</span>
                  <span className="text-[9px] truncate">{g.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Drawing Settings */}
          <div className="px-3 py-2 border-b border-[#21262d] space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Settings</div>
            <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer">
              <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} className="accent-[#00D4FF]" />
              Show Grid
            </label>
            <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer">
              <input type="checkbox" checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} className="accent-[#00D4FF]" />
              Snap to Grid
            </label>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">Line Weight</span>
              <select
                value={lineWeight}
                onChange={(e) => setLineWeight(e.target.value as typeof lineWeight)}
                className="bg-[#0d1117] text-[10px] text-white rounded px-1.5 py-0.5 border border-[#21262d]"
              >
                <option value="thin">Thin</option>
                <option value="medium">Medium</option>
                <option value="thick">Thick</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">Paper Size</span>
              <select
                value={activeSheet.size}
                onChange={(e) =>
                  setSheets((prev) =>
                    prev.map((s) => (s.id === activeSheetId ? { ...s, size: e.target.value as PaperSize } : s))
                  )
                }
                className="bg-[#0d1117] text-[10px] text-white rounded px-1.5 py-0.5 border border-[#21262d]"
              >
                {(Object.keys(paperSizes) as PaperSize[]).map((sz) => (
                  <option key={sz} value={sz}>{paperSizes[sz].label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">Scale</span>
              <select
                value={activeSheet.scale}
                onChange={(e) =>
                  setSheets((prev) =>
                    prev.map((s) => (s.id === activeSheetId ? { ...s, scale: e.target.value } : s))
                  )
                }
                className="bg-[#0d1117] text-[10px] text-white rounded px-1.5 py-0.5 border border-[#21262d]"
              >
                {scales.map((sc) => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Title Block Editor */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Title Block</span>
              <button
                onClick={() => setEditingTitle(!editingTitle)}
                className="text-[9px] text-[#00D4FF] hover:text-white"
              >
                {editingTitle ? "Done" : "Edit"}
              </button>
            </div>
            {editingTitle ? (
              <div className="space-y-1.5">
                {(Object.keys(titleBlock) as (keyof TitleBlock)[]).map((key) => (
                  <div key={key} className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-500 w-14 capitalize shrink-0">{key.replace(/([A-Z])/g, " $1")}</span>
                    <input
                      type="text"
                      value={titleBlock[key]}
                      onChange={(e) => setTitleBlock((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="flex-1 bg-[#0d1117] text-[10px] text-white rounded px-1.5 py-0.5 border border-[#21262d]"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[9px] space-y-0.5">
                <div className="text-slate-500">Title: <span className="text-white">{titleBlock.title}</span></div>
                <div className="text-slate-500">Part: <span className="text-white">{titleBlock.partNo}</span></div>
                <div className="text-slate-500">Rev: <span className="text-white">{titleBlock.rev}</span></div>
                <div className="text-slate-500">Material: <span className="text-white">{titleBlock.material}</span></div>
                <div className="text-slate-500">Drawn: <span className="text-white">{titleBlock.drawnBy}</span></div>
                <div className="text-slate-500">Project: <span className="text-white">{titleBlock.project}</span></div>
              </div>
            )}
          </div>
        </div>

        {/* Drawing Canvas Area */}
        <div className="flex-1 flex items-center justify-center bg-[#0a0e14] relative overflow-auto p-8">
          {/* Paper */}
          <div
            className="bg-white/[0.03] border border-slate-600 rounded relative shadow-2xl"
            style={{
              width: `${Math.max(paperInfo.width * 2.2, 600)}px`,
              height: `${Math.max(paperInfo.height * 1.6, 500)}px`,
            }}
          >
            {/* Paper info */}
            <div className="absolute top-3 left-4 text-[9px] text-slate-600 flex items-center gap-3">
              <span>{activeSheet.size} - Landscape</span>
              <span>Scale: {activeSheet.scale}</span>
              <span>Standard: {standard}</span>
              {showGrid && <span className="text-[#00D4FF]/40">Grid: ON</span>}
            </div>

            {/* Grid overlay */}
            {showGrid && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#00D4FF" strokeWidth="0.3" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            )}

            {/* Drawing border */}
            <div className="absolute inset-6 border border-dashed border-slate-700/50" />

            {/* Views */}
            {activeSheet.views.map((view) => (
              <div
                key={view.id}
                className="absolute border border-slate-700/30 rounded hover:border-[#00D4FF]/40 transition-colors cursor-move group"
                style={{
                  left: `${view.x}%`,
                  top: `${view.y}%`,
                  width: view.type === "detail" ? "18%" : "30%",
                  height: view.type === "detail" ? "25%" : "35%",
                }}
              >
                {/* View label */}
                <div className="absolute -top-4 left-0 text-[8px] text-slate-500 group-hover:text-[#00D4FF]">
                  {view.label} ({view.scale})
                </div>

                {/* View content */}
                <svg viewBox="0 0 200 150" className="w-full h-full">
                  {/* Center lines */}
                  <line x1="100" y1="5" x2="100" y2="145" stroke="#475569" {...getLineStyle("center")} />
                  <line x1="5" y1="75" x2="195" y2="75" stroke="#475569" {...getLineStyle("center")} />

                  {view.type === "front" && (
                    <>
                      <rect x="40" y="25" width="120" height="100" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
                      <circle cx="70" cy="55" r="12" fill="none" stroke="#00D4FF" strokeWidth="1" />
                      <circle cx="130" cy="55" r="12" fill="none" stroke="#00D4FF" strokeWidth="1" />
                      <line x1="40" y1="85" x2="160" y2="85" stroke="#475569" {...getLineStyle("hidden")} />
                      {/* Dimensions */}
                      <line x1="40" y1="135" x2="160" y2="135" stroke="#3b82f6" strokeWidth="0.8" />
                      <line x1="40" y1="130" x2="40" y2="140" stroke="#3b82f6" strokeWidth="0.5" />
                      <line x1="160" y1="130" x2="160" y2="140" stroke="#3b82f6" strokeWidth="0.5" />
                      <text x="100" y="143" fill="#3b82f6" fontSize="7" textAnchor="middle">120.00</text>
                      <line x1="170" y1="25" x2="170" y2="125" stroke="#3b82f6" strokeWidth="0.8" />
                      <line x1="165" y1="25" x2="175" y2="25" stroke="#3b82f6" strokeWidth="0.5" />
                      <line x1="165" y1="125" x2="175" y2="125" stroke="#3b82f6" strokeWidth="0.5" />
                      <text x="185" y="78" fill="#3b82f6" fontSize="7" textAnchor="middle" transform="rotate(90,185,78)">100.00</text>
                    </>
                  )}

                  {view.type === "top" && (
                    <>
                      <rect x="40" y="35" width="120" height="80" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
                      <circle cx="70" cy="75" r="12" fill="none" stroke="#00D4FF" strokeWidth="1" />
                      <circle cx="130" cy="75" r="12" fill="none" stroke="#00D4FF" strokeWidth="1" />
                      <rect x="55" y="60" width="90" height="30" fill="none" stroke="#475569" {...getLineStyle("hidden")} />
                    </>
                  )}

                  {view.type === "right" && (
                    <>
                      <rect x="50" y="25" width="100" height="100" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
                      <line x1="50" y1="85" x2="150" y2="85" stroke="#475569" {...getLineStyle("hidden")} />
                      <circle cx="100" cy="55" r="12" fill="none" stroke="#00D4FF" strokeWidth="1" />
                    </>
                  )}

                  {view.type === "isometric" && (
                    <>
                      <polygon points="60,40 140,40 160,70 160,120 80,120 60,90" fill="none" stroke="#94a3b8" strokeWidth="1.2" />
                      <line x1="60" y1="40" x2="60" y2="90" stroke="#94a3b8" strokeWidth="1.2" />
                      <line x1="60" y1="90" x2="80" y2="120" stroke="#94a3b8" strokeWidth="1.2" />
                      <line x1="140" y1="40" x2="160" y2="70" stroke="#94a3b8" strokeWidth="1.2" />
                      <line x1="60" y1="90" x2="140" y2="90" stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="4,2" />
                    </>
                  )}

                  {view.type === "section" && (
                    <>
                      <rect x="30" y="20" width="140" height="110" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
                      {/* Hatch pattern */}
                      {Array.from({ length: 12 }, (_, i) => (
                        <line key={i} x1={30 + i * 12} y1={20} x2={30 + i * 12 + 20} y2={130} stroke="#e94560" strokeWidth="0.4" opacity="0.4" />
                      ))}
                      <rect x="60" y="45" width="80" height="60" fill="#0d1117" stroke="#94a3b8" strokeWidth="1" />
                      <text x="100" y="12" fill="#e94560" fontSize="8" textAnchor="middle" fontWeight="bold">SECTION A-A</text>
                    </>
                  )}

                  {view.type === "detail" && (
                    <>
                      <circle cx="100" cy="75" r="50" fill="none" stroke="#e94560" strokeWidth="1" strokeDasharray="4,2" />
                      <rect x="70" y="50" width="60" height="50" fill="none" stroke="#94a3b8" strokeWidth="2" />
                      <circle cx="100" cy="75" r="8" fill="none" stroke="#00D4FF" strokeWidth="1.5" />
                      <text x="100" y="12" fill="#e94560" fontSize="8" textAnchor="middle" fontWeight="bold">DETAIL B (5:1)</text>
                    </>
                  )}
                </svg>
              </div>
            ))}

            {/* Title Block */}
            <div className="absolute bottom-0 right-0 w-72 border-t border-l border-slate-600/80 bg-[#0d1117]/50">
              <div className="grid grid-cols-2 gap-px bg-slate-700/30">
                <div className="bg-[#0d1117]/80 px-2 py-1">
                  <div className="text-[7px] text-slate-500 uppercase">Title</div>
                  <div className="text-[9px] text-white font-medium">{titleBlock.title}</div>
                </div>
                <div className="bg-[#0d1117]/80 px-2 py-1">
                  <div className="text-[7px] text-slate-500 uppercase">Part Number</div>
                  <div className="text-[9px] text-white font-medium">{titleBlock.partNo}</div>
                </div>
                <div className="bg-[#0d1117]/80 px-2 py-1">
                  <div className="text-[7px] text-slate-500 uppercase">Drawn By</div>
                  <div className="text-[9px] text-slate-300">{titleBlock.drawnBy}</div>
                </div>
                <div className="bg-[#0d1117]/80 px-2 py-1">
                  <div className="text-[7px] text-slate-500 uppercase">Date</div>
                  <div className="text-[9px] text-slate-300">{titleBlock.date}</div>
                </div>
                <div className="bg-[#0d1117]/80 px-2 py-1">
                  <div className="text-[7px] text-slate-500 uppercase">Material</div>
                  <div className="text-[9px] text-slate-300">{titleBlock.material}</div>
                </div>
                <div className="bg-[#0d1117]/80 px-2 py-1">
                  <div className="text-[7px] text-slate-500 uppercase">Rev</div>
                  <div className="text-[9px] text-white font-bold">{titleBlock.rev}</div>
                </div>
                <div className="bg-[#0d1117]/80 px-2 py-1">
                  <div className="text-[7px] text-slate-500 uppercase">Scale</div>
                  <div className="text-[9px] text-slate-300">{activeSheet.scale}</div>
                </div>
                <div className="bg-[#0d1117]/80 px-2 py-1">
                  <div className="text-[7px] text-slate-500 uppercase">Sheet</div>
                  <div className="text-[9px] text-slate-300">{titleBlock.sheet}</div>
                </div>
              </div>
              <div className="bg-[#0d1117]/80 px-2 py-1 border-t border-slate-700/30">
                <div className="text-[7px] text-slate-500 uppercase">Project</div>
                <div className="text-[9px] text-[#00D4FF] font-medium">{titleBlock.project}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-4 px-4 py-1 bg-[#161b22] border-t border-[#21262d] text-[10px] text-slate-500 shrink-0">
        <span>Sheet: {activeSheet.name}</span>
        <span>Paper: {activeSheet.size}</span>
        <span>Scale: {activeSheet.scale}</span>
        <span>Views: {activeSheet.views.length}</span>
        <span>Tool: <span className="text-white">{activeTool}</span></span>
        {activeGDT && (
          <span>
            GD&T: <span className="text-orange-400">{gdtSymbols.find((g) => g.id === activeGDT)?.label}</span>
          </span>
        )}
        <span>Grid: {showGrid ? "ON" : "OFF"}</span>
        <span>Snap: {snapEnabled ? "ON" : "OFF"}</span>
        <span className="ml-auto">Drawing Engine v2.0 | {standard} Standard</span>
      </div>
    </div>
  );
}
