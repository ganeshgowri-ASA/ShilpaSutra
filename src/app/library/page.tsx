"use client";
import { useState } from "react";

const parts = [
  { name: "Hex Bolt M8", category: "Fasteners", format: "STEP" },
  { name: "Spur Gear 20T", category: "Gears", format: "STEP" },
  { name: "L-Bracket 50mm", category: "Brackets", format: "STL" },
  { name: "Bearing 6205", category: "Bearings", format: "STEP" },
  { name: "Heat Sink 40mm", category: "Thermal", format: "STL" },
  { name: "Enclosure Box", category: "Enclosures", format: "STEP" },
];

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
    const cats = ["All",...Array.from(new Set(parts.map(p=>p.category)))];
  const filtered = parts.filter(p=>(cat==="All"||p.category===cat)&&p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex flex-col">
      <header className="border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Parts Library</h1>
          <button className="px-4 py-2 bg-brand-600 rounded-lg text-sm">Upload Part</button>
        </div>
        <div className="flex gap-3 mt-3">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search parts..." className="flex-1 max-w-md bg-surface-light border border-gray-600 rounded-lg px-4 py-2 text-sm outline-none"/>
          <div className="flex gap-1">{cats.map(c=>(<button key={c} onClick={()=>setCat(c)} className={`px-3 py-1.5 rounded text-xs ${cat===c?"bg-brand-600 text-white":"bg-surface-lighter text-gray-300"}`}>{c}</button>))}</div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((part,i)=>(
            <div key={i} className="bg-surface-light rounded-xl border border-gray-700 hover:border-brand-500 transition overflow-hidden cursor-pointer group">
              <div className="h-40 bg-gray-800 flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-600 group-hover:text-brand-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
              </div>
              <div className="p-4">
                <h3 className="font-medium">{part.name}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">{part.category}</span>
                  <span className="text-xs px-2 py-0.5 bg-surface-lighter rounded">{part.format}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
