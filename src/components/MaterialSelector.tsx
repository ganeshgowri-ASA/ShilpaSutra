"use client";
import { useState } from "react";
import {
  materialsDatabase,
  materialCategories,
  type EngineeringMaterial,
  type MaterialCategory,
} from "@/lib/materials-database";

interface MaterialSelectorProps {
  selectedMaterialId: string | null;
  onSelect: (material: EngineeringMaterial) => void;
  onClose: () => void;
}

export default function MaterialSelector({ selectedMaterialId, onSelect, onClose }: MaterialSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<MaterialCategory | "All">("All");
  const [search, setSearch] = useState("");

  const filtered = materialsDatabase.filter((m) => {
    const matchesCategory = activeCategory === "All" || m.category === activeCategory;
    const matchesSearch =
      search === "" ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#161b22] border border-[#21262d] rounded-xl shadow-2xl w-[800px] max-h-[600px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#21262d] flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Material Library</h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search materials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#0d1117] border border-[#21262d] rounded px-3 py-1.5 text-xs text-white w-48 focus:border-[#00D4FF] outline-none"
            />
            <button onClick={onClose} className="text-slate-400 hover:text-white text-xs px-2">
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Category sidebar */}
          <div className="w-48 border-r border-[#21262d] p-2 overflow-y-auto">
            <button
              onClick={() => setActiveCategory("All")}
              className={`w-full text-left px-3 py-2 rounded text-xs mb-1 ${
                activeCategory === "All" ? "bg-[#00D4FF]/10 text-[#00D4FF]" : "text-slate-400 hover:text-white hover:bg-[#21262d]"
              }`}
            >
              All Materials ({materialsDatabase.length})
            </button>
            {materialCategories.map((cat) => {
              const count = materialsDatabase.filter((m) => m.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded text-xs mb-1 flex items-center gap-2 ${
                    activeCategory === cat.id
                      ? "bg-[#00D4FF]/10 text-[#00D4FF]"
                      : "text-slate-400 hover:text-white hover:bg-[#21262d]"
                  }`}
                >
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cat.color }} />
                  <span className="flex-1">{cat.label}</span>
                  <span className="text-[9px] text-slate-600">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Materials list */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-1 gap-2">
              {filtered.map((mat) => (
                <button
                  key={mat.id}
                  onClick={() => onSelect(mat)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    selectedMaterialId === mat.id
                      ? "border-[#00D4FF] bg-[#00D4FF]/5"
                      : "border-[#21262d] bg-[#0d1117] hover:border-[#30363d]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded" style={{ backgroundColor: mat.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white">{mat.name}</div>
                      <div className="text-[10px] text-slate-500">{mat.description}</div>
                    </div>
                    <div className="text-[9px] text-slate-600 bg-[#161b22] px-2 py-0.5 rounded">{mat.category}</div>
                  </div>

                  {/* Properties row */}
                  <div className="flex gap-3 mt-2 text-[9px]">
                    <span className="text-slate-500">
                      Density: <span className="text-slate-300">{mat.density} kg/m³</span>
                    </span>
                    <span className="text-slate-500">
                      E: <span className="text-slate-300">{mat.youngsModulus} GPa</span>
                    </span>
                    <span className="text-slate-500">
                      σy: <span className="text-slate-300">{mat.yieldStrength} MPa</span>
                    </span>
                    <span className="text-slate-500">
                      σu: <span className="text-slate-300">{mat.ultimateStrength} MPa</span>
                    </span>
                    <span className="text-slate-500">
                      ν: <span className="text-slate-300">{mat.poissonRatio}</span>
                    </span>
                    <span className="text-slate-500">
                      k: <span className="text-slate-300">{mat.thermalConductivity} W/(m·K)</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="text-center text-slate-500 text-xs py-8">No materials match your search.</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#21262d] text-[9px] text-slate-600">
          {filtered.length} materials shown | Data sourced from ASM International, MatWeb, and CES EduPack
        </div>
      </div>
    </div>
  );
}
