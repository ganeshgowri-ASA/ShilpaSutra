"use client";
import { useState } from "react";
import { MATERIALS, MATERIAL_CATEGORIES, EngineeringMaterial } from "@/lib/materials";

interface MaterialSelectorProps {
  selectedId?: string;
  onSelect: (material: EngineeringMaterial) => void;
  compact?: boolean;
}

export default function MaterialSelector({ selectedId, onSelect, compact = false }: MaterialSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const categories = ["All", ...MATERIAL_CATEGORIES];

  const filtered = MATERIALS.filter((m) => {
    const matchCat = activeCategory === "All" || m.category === activeCategory;
    const matchSearch =
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const selected = MATERIALS.find((m) => m.id === selectedId);
  const hovered = MATERIALS.find((m) => m.id === hoveredId);
  const preview = hovered || selected;

  return (
    <div className={`flex flex-col gap-2 ${compact ? "text-[10px]" : "text-xs"} text-white`}>
      {/* Search */}
      <input
        type="text"
        placeholder="Search materials…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00D4FF]"
      />

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2 py-0.5 rounded text-[9px] font-medium border transition-colors ${
              activeCategory === cat
                ? "bg-[#00D4FF]/20 border-[#00D4FF]/60 text-[#00D4FF]"
                : "bg-[#0d1117] border-[#21262d] text-slate-400 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Material list */}
      <div className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5">
        {filtered.map((mat) => (
          <button
            key={mat.id}
            onClick={() => onSelect(mat)}
            onMouseEnter={() => setHoveredId(mat.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
              selectedId === mat.id
                ? "bg-[#00D4FF]/10 border border-[#00D4FF]/40"
                : "bg-[#0d1117] border border-transparent hover:border-[#21262d] hover:bg-[#161b22]"
            }`}
          >
            {/* Color swatch */}
            <span
              className="w-3 h-3 rounded-sm shrink-0 border border-black/20"
              style={{ backgroundColor: mat.color }}
            />
            <span className="flex-1 truncate font-medium">{mat.name}</span>
            <span className="text-[9px] text-slate-500 shrink-0">{mat.density} kg/m³</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-slate-600 py-4">No materials found</div>
        )}
      </div>

      {/* Properties panel */}
      {preview && (
        <div className="bg-[#0d1117] border border-[#21262d] rounded p-2.5 space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-4 h-4 rounded border border-black/30"
              style={{ backgroundColor: preview.color }}
            />
            <span className="font-bold text-white">{preview.name}</span>
            <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-[#21262d] text-slate-400">{preview.category}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px]">
            <PropRow label="Density" value={`${preview.density.toLocaleString()} kg/m³`} />
            <PropRow label="Young's Modulus" value={`${preview.youngsModulus} GPa`} />
            <PropRow label="Poisson Ratio" value={preview.poissonRatio.toString()} />
            <PropRow label="Yield Strength" value={`${preview.yieldStrength} MPa`} />
            <PropRow label="Ultimate Str." value={`${preview.ultimateStrength} MPa`} />
            <PropRow label="Thermal Cond." value={`${preview.thermalConductivity} W/m·K`} />
            <PropRow label="CTE" value={`${preview.cte} µm/m·°C`} />
            <PropRow label="Metalness" value={preview.metalness.toFixed(2)} />
            <PropRow label="Roughness" value={preview.roughness.toFixed(2)} />
          </div>

          {preview.notes && (
            <p className="text-[9px] text-slate-500 italic border-t border-[#21262d] pt-1 mt-1">
              {preview.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-1">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-300 font-mono">{value}</span>
    </div>
  );
}
