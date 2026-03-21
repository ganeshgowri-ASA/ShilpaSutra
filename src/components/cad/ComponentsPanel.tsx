"use client";
import { useState } from "react";
import { useCadStore } from "@/stores/cad-store";
import { Plus } from "lucide-react";

type CadTypeName = "box" | "cylinder" | "sphere";

interface ComponentDef {
  id: string;
  label: string;
  category: string;
  icon: string;
  params: { key: string; label: string; unit: string; min: number; max: number; def: number }[];
  generate: (p: Record<string, number>) => { cadType: CadTypeName; w: number; h: number; d: number; color: string };
}

const COMPONENTS: ComponentDef[] = [
  {
    id: "bolt", label: "Hex Bolt", category: "Fasteners", icon: "🔩",
    params: [
      { key: "size", label: "Thread (M)", unit: "", min: 3, max: 20, def: 8 },
      { key: "length", label: "Length", unit: "mm", min: 10, max: 200, def: 40 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.size / 100, h: p.length / 100, d: p.size / 100, color: "#8a9a8a" }),
  },
  {
    id: "nut", label: "Hex Nut", category: "Fasteners", icon: "🔩",
    params: [{ key: "size", label: "Thread (M)", unit: "", min: 3, max: 20, def: 8 }],
    generate: (p) => ({ cadType: "box", w: p.size * 1.7 / 100, h: p.size * 0.8 / 100, d: p.size * 1.7 / 100, color: "#7a8a7a" }),
  },
  {
    id: "bearing", label: "Ball Bearing", category: "Bearings", icon: "⚙️",
    params: [
      { key: "series", label: "Series (60xx)", unit: "", min: 0, max: 9, def: 2 },
      { key: "width", label: "Width", unit: "mm", min: 5, max: 30, def: 11 },
    ],
    generate: (p) => {
      const od = (60 + p.series * 5) / 100;
      return { cadType: "cylinder", w: od, h: p.width / 100, d: od, color: "#a0b0c0" };
    },
  },
  {
    id: "spring", label: "Compression Spring", category: "Springs", icon: "🌀",
    params: [
      { key: "dia", label: "Wire Dia", unit: "mm", min: 1, max: 10, def: 2 },
      { key: "coils", label: "Coils", unit: "", min: 3, max: 20, def: 8 },
      { key: "length", label: "Free Length", unit: "mm", min: 10, max: 200, def: 60 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.dia * 5 / 100, h: p.length / 100, d: p.dia * 5 / 100, color: "#c0c060" }),
  },
  {
    id: "gear", label: "Spur Gear", category: "Gears", icon: "⚙️",
    params: [
      { key: "teeth", label: "Teeth", unit: "", min: 8, max: 100, def: 20 },
      { key: "module", label: "Module", unit: "", min: 1, max: 5, def: 2 },
      { key: "width", label: "Width", unit: "mm", min: 5, max: 50, def: 10 },
    ],
    generate: (p) => {
      const pd = (p.teeth * p.module) / 100;
      return { cadType: "cylinder", w: pd, h: p.width / 100, d: pd, color: "#b0906a" };
    },
  },
  {
    id: "pipe_seg", label: "Pipe Segment", category: "Pipes", icon: "🔧",
    params: [
      { key: "dia", label: "OD", unit: "mm", min: 10, max: 300, def: 50 },
      { key: "length", label: "Length", unit: "mm", min: 50, max: 2000, def: 300 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.dia / 100, h: p.length / 100, d: p.dia / 100, color: "#7090b0" }),
  },
];

const CATEGORIES = Array.from(new Set(COMPONENTS.map(c => c.category)));

export default function ComponentsPanel() {
  const addGeneratedObject = useCadStore(s => s.addGeneratedObject);
  const [activeCat, setActiveCat] = useState(CATEGORIES[0]);
  const [selected, setSelected] = useState<ComponentDef | null>(null);
  const [params, setParams] = useState<Record<string, number>>({});

  const selectComp = (c: ComponentDef) => {
    setSelected(c);
    const defaults: Record<string, number> = {};
    c.params.forEach(p => { defaults[p.key] = p.def; });
    setParams(defaults);
  };

  const addToScene = () => {
    if (!selected) return;
    const geo = selected.generate(params);
    addGeneratedObject({
      type: geo.cadType,
      name: selected.label,
      color: geo.color,
      dimensions: { width: geo.w * 100, height: geo.h * 100, depth: geo.d * 100 },
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-white text-xs">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-[#21262d] bg-[#161b22]">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)}
            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${activeCat === cat ? "border-[#00D4FF]/50 text-[#00D4FF] bg-[#00D4FF]/10" : "border-[#21262d] text-slate-500 hover:text-white"}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Component list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {COMPONENTS.filter(c => c.category === activeCat).map(comp => (
          <button key={comp.id} onClick={() => selectComp(comp)}
            className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center gap-2 ${selected?.id === comp.id ? "border-[#00D4FF]/40 bg-[#00D4FF]/10" : "border-[#21262d] hover:border-[#30363d] bg-[#161b22]"}`}>
            <span className="text-base">{comp.icon}</span>
            <span className={`font-semibold ${selected?.id === comp.id ? "text-[#00D4FF]" : "text-slate-300"}`}>{comp.label}</span>
          </button>
        ))}
      </div>

      {/* Parameter editor */}
      {selected && (
        <div className="border-t border-[#21262d] p-3 space-y-2 bg-[#161b22]">
          <div className="font-bold text-slate-300">{selected.icon} {selected.label}</div>
          {selected.params.map(p => (
            <div key={p.key}>
              <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                <span>{p.label} {p.unit && `(${p.unit})`}</span>
                <span className="text-white font-mono">{params[p.key] ?? p.def}</span>
              </div>
              <input type="range" min={p.min} max={p.max} step={p.key === "series" ? 1 : p.max > 100 ? 5 : 1}
                value={params[p.key] ?? p.def}
                onChange={e => setParams(prev => ({ ...prev, [p.key]: parseFloat(e.target.value) }))}
                className="w-full h-1 accent-[#00D4FF] cursor-pointer" />
            </div>
          ))}
          <button onClick={addToScene}
            className="w-full mt-2 flex items-center justify-center gap-1.5 bg-[#00D4FF] hover:bg-[#00b8d9] text-black font-bold py-1.5 rounded-lg transition-colors">
            <Plus size={13} /> Add to Scene
          </button>
        </div>
      )}
    </div>
  );
}
