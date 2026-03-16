"use client";
import { useState } from "react";

const sheets = [
  { id: "s1", name: "Sheet 1 - Front View", size: "A3", scale: "1:1" },
  { id: "s2", name: "Sheet 2 - Section A-A", size: "A3", scale: "2:1" },
  { id: "s3", name: "Sheet 3 - Detail Views", size: "A4", scale: "5:1" },
];

const gdtSymbols = [
  { id: "flatness", label: "Flatness", symbol: "\u25AF" },
  { id: "parallelism", label: "Parallelism", symbol: "\u2225" },
  { id: "perpendicularity", label: "Perpendicularity", symbol: "\u27C2" },
  { id: "position", label: "Position", symbol: "\u2295" },
  { id: "concentricity", label: "Concentricity", symbol: "\u25CE" },
  { id: "runout", label: "Runout", symbol: "\u2197" },
  { id: "cylindricity", label: "Cylindricity", symbol: "\u232D" },
  { id: "symmetry", label: "Symmetry", symbol: "\u232F" },
];

const dimTools = ["Linear", "Angular", "Radius", "Diameter", "Ordinate", "Baseline", "Chain"];
const annotTools = ["Note", "Leader", "Balloon", "Surface Finish", "Weld Symbol", "Datum"];
const exportFormats = ["PDF", "DXF (AutoCAD)", "DWG (AutoCAD)", "SVG", "PNG (High-Res)"];

export default function DrawingsPage() {
  const [activeSheet, setActiveSheet] = useState("s1");
  const [activeTool, setActiveTool] = useState("Linear");
  const [activeGDT, setActiveGDT] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [titleBlock, setTitleBlock] = useState({ title: "Bracket Assembly", partNo: "SS-001", rev: "A", material: "Al 6061-T6", drawn: "ShilpaSutra AI", date: "2026-03-16" });

  return (
    <div className="flex flex-col h-screen bg-[#1a1a2e] text-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 bg-[#16213e] border-b border-[#0f3460] text-sm flex-shrink-0">
        <span className="font-bold text-[#e94560]">SS</span>
        <span className="font-bold">2D Drawings & GD&T</span>
        <div className="flex gap-1 ml-4">
          <span className="text-slate-500 text-xs">Dim:</span>
          {dimTools.map(d => (
            <button key={d} onClick={() => setActiveTool(d)} className={`px-2 py-1 rounded text-xs ${activeTool===d ? "bg-[#e94560]" : "bg-[#0f3460] hover:bg-[#1a4a80]"}`}>{d}</button>
          ))}
        </div>
        <div className="flex gap-1 ml-2">
          <span className="text-slate-500 text-xs">Annot:</span>
          {annotTools.map(a => (
            <button key={a} onClick={() => setActiveTool(a)} className={`px-2 py-1 rounded text-xs ${activeTool===a ? "bg-blue-600" : "bg-[#0f3460] hover:bg-[#1a4a80]"}`}>{a}</button>
          ))}
        </div>
        <div className="ml-auto relative">
          <button onClick={() => setShowExport(!showExport)} className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-xs font-bold">Export Drawing</button>
          {showExport && (
            <div className="absolute right-0 top-full mt-1 bg-[#16213e] border border-[#0f3460] rounded shadow-lg z-50">
              {exportFormats.map(f => (
                <div key={f} onClick={() => setShowExport(false)} className="px-4 py-2 hover:bg-[#e94560] cursor-pointer text-xs whitespace-nowrap">{f}</div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 bg-[#16213e] border-r border-[#0f3460] flex flex-col flex-shrink-0">
          <div className="px-3 py-2 border-b border-[#0f3460] text-xs font-bold">Sheets</div>
          <div className="p-2">
            {sheets.map(s => (
              <div key={s.id} onClick={() => setActiveSheet(s.id)} className={`py-1.5 px-2 rounded text-xs cursor-pointer mb-1 ${activeSheet===s.id ? "bg-[#e94560]/20 border border-[#e94560]" : "hover:bg-[#0f3460]"}`}>
                <div>{s.name}</div>
                <div className="text-[10px] text-slate-500">{s.size} | {s.scale}</div>
              </div>
            ))}
            <button className="w-full mt-2 border border-dashed border-[#0f3460] py-1 rounded text-xs text-slate-400 hover:text-white">+ New Sheet</button>
          </div>
          <div className="px-3 py-2 border-t border-[#0f3460] text-xs font-bold">GD&T Symbols</div>
          <div className="p-2 grid grid-cols-2 gap-1">
            {gdtSymbols.map(g => (
              <button key={g.id} onClick={() => setActiveGDT(g.id)} className={`px-2 py-1.5 rounded text-xs flex items-center gap-1 ${activeGDT===g.id ? "bg-orange-600" : "bg-[#0f3460] hover:bg-[#1a4a80]"}`}>
                <span className="text-sm">{g.symbol}</span>
                <span className="text-[10px]">{g.label}</span>
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="p-2 border-t border-[#0f3460] text-[10px]">
            <div className="font-bold text-xs mb-1">Title Block</div>
            <div className="text-slate-400">Title: <span className="text-white">{titleBlock.title}</span></div>
            <div className="text-slate-400">Part: <span className="text-white">{titleBlock.partNo}</span></div>
            <div className="text-slate-400">Rev: <span className="text-white">{titleBlock.rev}</span></div>
            <div className="text-slate-400">Material: <span className="text-white">{titleBlock.material}</span></div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-white/5 relative">
          <div className="w-[80%] h-[85%] bg-white/[0.03] border border-slate-600 rounded relative">
            <div className="absolute top-4 left-4 text-[10px] text-slate-500">A3 - Landscape | Scale {sheets.find(s => s.id===activeSheet)?.scale}</div>
            <div className="absolute inset-8 border border-dashed border-slate-700 flex items-center justify-center">
              <div className="text-center">
                <svg viewBox="0 0 200 150" className="w-48 h-36 mx-auto mb-2">
                  <rect x="40" y="30" width="120" height="80" fill="none" stroke="#475569" strokeWidth="1" />
                  <line x1="40" y1="70" x2="160" y2="70" stroke="#475569" strokeWidth="0.5" strokeDasharray="4" />
                  <line x1="100" y1="30" x2="100" y2="110" stroke="#475569" strokeWidth="0.5" strokeDasharray="4" />
                  <circle cx="70" cy="55" r="8" fill="none" stroke="#e94560" strokeWidth="1" />
                  <circle cx="130" cy="55" r="8" fill="none" stroke="#e94560" strokeWidth="1" />
                  <line x1="40" y1="120" x2="70" y2="120" stroke="#3b82f6" strokeWidth="1" />
                  <text x="55" y="130" fill="#3b82f6" fontSize="6" textAnchor="middle">60.00</text>
                  <line x1="170" y1="30" x2="170" y2="70" stroke="#3b82f6" strokeWidth="1" />
                  <text x="180" y="55" fill="#3b82f6" fontSize="6" textAnchor="middle">40.00</text>
                </svg>
                <div className="text-slate-400 text-xs">Drawing View - {sheets.find(s => s.id===activeSheet)?.name}</div>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 w-64 border-t border-l border-slate-600 p-2 text-[8px] text-slate-400">
              <div className="grid grid-cols-2 gap-x-2">
                <span>Title: {titleBlock.title}</span>
                <span>Part No: {titleBlock.partNo}</span>
                <span>Drawn: {titleBlock.drawn}</span>
                <span>Date: {titleBlock.date}</span>
                <span>Material: {titleBlock.material}</span>
                <span>Rev: {titleBlock.rev}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 px-4 py-1 bg-[#0d1117] border-t border-[#0f3460] text-[10px] text-slate-500 flex-shrink-0">
        <span>Sheet: {sheets.find(s => s.id===activeSheet)?.name}</span>
        <span>Tool: <span className="text-white">{activeTool}</span></span>
        {activeGDT && <span>GD&T: <span className="text-orange-400">{gdtSymbols.find(g => g.id===activeGDT)?.label}</span></span>}
        <span className="ml-auto">Drawing Engine v1.0 | ISO 128 / ASME Y14.5</span>
      </div>
    </div>
  );
}
