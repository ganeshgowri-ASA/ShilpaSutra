"use client";
import { useState } from "react";

const parts = [
  { name: "Hex Bolt M8", category: "Fasteners", format: "STEP", author: "ISO", downloads: 1240, rating: 4.8, params: "M8x30, Grade 8.8" },
  { name: "Hex Nut M8", category: "Fasteners", format: "STEP", author: "ISO", downloads: 980, rating: 4.7, params: "M8, Grade 8" },
  { name: "Spur Gear 20T", category: "Gears", format: "STEP", author: "Community", downloads: 856, rating: 4.9, params: "Module 2, 20 teeth" },
  { name: "Helical Gear 30T", category: "Gears", format: "STEP", author: "Community", downloads: 432, rating: 4.6, params: "Module 1.5, Helix 15°" },
  { name: "L-Bracket 50mm", category: "Brackets", format: "STL", author: "ShilpaSutra", downloads: 2100, rating: 4.5, params: "50x50x5mm, Steel" },
  { name: "U-Channel 100mm", category: "Brackets", format: "STEP", author: "Community", downloads: 345, rating: 4.3, params: "100x50x40mm" },
  { name: "Bearing 6205", category: "Bearings", format: "STEP", author: "SKF", downloads: 1890, rating: 4.9, params: "25x52x15mm, Deep groove" },
  { name: "Thrust Bearing 51105", category: "Bearings", format: "STEP", author: "SKF", downloads: 670, rating: 4.7, params: "25x42x11mm" },
  { name: "Heat Sink 40mm", category: "Thermal", format: "STL", author: "Community", downloads: 560, rating: 4.4, params: "40x40x10mm, Aluminum" },
  { name: "Pipe Flange DN50", category: "Piping", format: "STEP", author: "ASME", downloads: 1450, rating: 4.8, params: "DN50, PN16, RF" },
  { name: "Enclosure Box", category: "Enclosures", format: "STEP", author: "Community", downloads: 780, rating: 4.2, params: "120x80x40mm, IP65" },
  { name: "Timing Pulley GT2", category: "Gears", format: "STEP", author: "Community", downloads: 920, rating: 4.6, params: "20 teeth, 5mm bore" },
  { name: "Spring Washer M10", category: "Fasteners", format: "STEP", author: "DIN", downloads: 430, rating: 4.5, params: "M10, DIN 127" },
  { name: "Ball Valve DN25", category: "Piping", format: "STEP", author: "Community", downloads: 560, rating: 4.3, params: "DN25, 2-way, SS316" },
  { name: "Motor Mount NEMA23", category: "Brackets", format: "STL", author: "ShilpaSutra", downloads: 1200, rating: 4.7, params: "NEMA23, Aluminum" },
  { name: "CPU Cooler Tower", category: "Thermal", format: "STEP", author: "Community", downloads: 340, rating: 4.1, params: "4 heatpipes, 120mm fan" },
];

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [view, setView] = useState<"grid"|"list">("grid");
  const [sort, setSort] = useState("downloads");
  const [selected, setSelected] = useState<number|null>(null);

  const cats = ["All", ...Array.from(new Set(parts.map(p => p.category)))];
  const filtered = parts
    .filter(p => (cat==="All" || p.category===cat) && p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => sort==="downloads" ? b.downloads-a.downloads : sort==="rating" ? b.rating-a.rating : a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col h-screen bg-[#1a1a2e] text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#16213e] border-b border-[#0f3460] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-[#e94560]">SS</span>
          <h1 className="text-sm font-bold">Parts Library</h1>
          <span className="text-xs text-slate-500">{filtered.length} parts</span>
        </div>
        <div className="flex gap-2">
          <button className="bg-[#e94560] hover:bg-[#d63750] px-4 py-1.5 rounded text-xs font-bold">+ Upload Part</button>
          <button className="bg-[#0f3460] hover:bg-[#1a4a80] px-3 py-1 rounded text-xs">AI Generate Part</button>
        </div>
      </div>
      {/* Filters */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#0d1117] border-b border-[#0f3460] flex-shrink-0">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search parts..."
          className="bg-[#16213e] rounded px-3 py-1.5 text-xs w-64 outline-none border border-[#0f3460] focus:border-[#e94560]" />
        <div className="flex gap-1">
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-3 py-1 rounded text-xs ${cat===c ? "bg-[#e94560] text-white" : "bg-[#0f3460] text-slate-300 hover:bg-[#1a4a80]"}`}>{c}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select value={sort} onChange={e => setSort(e.target.value)} className="bg-[#0f3460] text-xs rounded px-2 py-1 border border-[#0f3460]">
            <option value="downloads">Most Downloaded</option>
            <option value="rating">Highest Rated</option>
            <option value="name">Alphabetical</option>
          </select>
          <button onClick={() => setView("grid")} className={`px-2 py-1 rounded text-xs ${view==="grid" ? "bg-[#e94560]" : "bg-[#0f3460]"}`}>▦</button>
          <button onClick={() => setView("list")} className={`px-2 py-1 rounded text-xs ${view==="list" ? "bg-[#e94560]" : "bg-[#0f3460]"}`}>☰</button>
        </div>
      </div>
      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          {view==="grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((p,i) => (
                <div key={i} onClick={() => setSelected(i)}
                  className={`bg-[#16213e] rounded-lg p-3 cursor-pointer hover:ring-2 hover:ring-[#e94560] transition-all ${
                    selected===i ? "ring-2 ring-[#e94560]" : "border border-[#0f3460]"
                  }`}>
                  <div className="h-24 bg-[#0d1117] rounded flex items-center justify-center mb-2">
                    <div className="text-3xl text-slate-600">📦</div>
                  </div>
                  <div className="text-xs font-medium truncate">{p.name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-slate-500">{p.category}</span>
                    <span className="text-[10px] bg-[#0f3460] px-1.5 py-0.5 rounded">{p.format}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                    <span>⭐ {p.rating}</span>
                    <span>⬇️ {p.downloads}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((p,i) => (
                <div key={i} onClick={() => setSelected(i)}
                  className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-[#0f3460] text-xs ${
                    selected===i ? "bg-[#0f3460] border border-[#e94560]" : ""
                  }`}>
                  <div className="w-10 h-10 bg-[#0d1117] rounded flex items-center justify-center text-slate-600">📦</div>
                  <div className="flex-1"><div className="font-medium">{p.name}</div><div className="text-[10px] text-slate-500">{p.params}</div></div>
                  <span className="text-slate-500">{p.category}</span>
                  <span className="bg-[#0f3460] px-1.5 py-0.5 rounded text-[10px]">{p.format}</span>
                  <span className="text-[10px]">⭐ {p.rating}</span>
                  <span className="text-[10px] text-slate-500">⬇️ {p.downloads}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Detail Panel */}
        {selected!==null && (
          <div className="w-64 bg-[#16213e] border-l border-[#0f3460] p-3 flex-shrink-0 overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold">Part Details</h3>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white text-xs">✕</button>
            </div>
            <div className="h-32 bg-[#0d1117] rounded flex items-center justify-center mb-3">
              <div className="text-4xl text-slate-600">📦</div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="font-medium text-sm">{filtered[selected]?.name}</div>
              <div className="text-slate-500">{filtered[selected]?.params}</div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-[#0d1117] p-2 rounded"><div className="text-slate-500">Category</div><div>{filtered[selected]?.category}</div></div>
                <div className="bg-[#0d1117] p-2 rounded"><div className="text-slate-500">Format</div><div>{filtered[selected]?.format}</div></div>
                <div className="bg-[#0d1117] p-2 rounded"><div className="text-slate-500">Rating</div><div>⭐ {filtered[selected]?.rating}</div></div>
                <div className="bg-[#0d1117] p-2 rounded"><div className="text-slate-500">Downloads</div><div>{filtered[selected]?.downloads}</div></div>
              </div>
              <div className="text-[10px] text-slate-500">Author: {filtered[selected]?.author}</div>
              <button className="w-full bg-[#e94560] hover:bg-[#d63750] py-2 rounded font-bold">⬇️ Download {filtered[selected]?.format}</button>
              <button className="w-full bg-[#0f3460] hover:bg-[#1a4a80] py-2 rounded">Open in Designer</button>
              <button className="w-full bg-[#0f3460] hover:bg-[#1a4a80] py-2 rounded">Send to Simulator</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
