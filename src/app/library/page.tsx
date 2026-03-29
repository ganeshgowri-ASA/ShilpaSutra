"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ExplorationProgress } from "@/components/CommandPalette";
import {
  EQUIPMENT_TEMPLATES,
  type EquipmentTemplateId,
} from "@/components/drawings/templates";

// ─── Equipment Catalog Data ───────────────────────────────────────────────────

type Category = "All" | "Climatic" | "Mechanical" | "Optical" | "Fire" | "Support";

interface EquipmentItem {
  id: EquipmentTemplateId;
  name: string;
  standard: string;
  category: Category;
  description: string;
  specs: string[];
  tempRange?: string;
  capacity?: string;
}

const EQUIPMENT_CATALOG: EquipmentItem[] = [
  {
    id: "thermal_cycling_chamber",
    name: "Thermal Cycling Chamber",
    standard: "IEC 61215 MQT 11",
    category: "Climatic",
    description: "Temperature cycling test for PV modules",
    specs: ["-40\u00B0C to +85\u00B0C", "200 cycles standard", "Ramp rate 100\u00B0C/hr"],
    tempRange: "-40\u00B0C to +85\u00B0C",
    capacity: "Full-size PV modules",
  },
  {
    id: "iec_uv_conditioning_chamber",
    name: "UV Conditioning Chamber",
    standard: "IEC 61215 MQT 10",
    category: "Optical",
    description: "UV preconditioning exposure for PV modules",
    specs: ["60 kWh/m\u00B2 UV exposure", "UV-A & UV-B lamps", "Irradiance monitoring"],
    tempRange: "60\u00B0C \u00B15\u00B0C",
    capacity: "60 kWh/m\u00B2",
  },
  {
    id: "humidity_freeze_chamber",
    name: "Humidity Freeze Chamber",
    standard: "IEC 61215 MQT 12/13",
    category: "Climatic",
    description: "Combined humidity and freeze testing for PV modules",
    specs: ["85\u00B0C / 85% RH", "-40\u00B0C freeze", "10 cycles DH + HF"],
    tempRange: "-40\u00B0C to +85\u00B0C",
    capacity: "85% RH max",
  },
  {
    id: "salt_mist_chamber",
    name: "Salt Mist Chamber",
    standard: "IEC 61701",
    category: "Climatic",
    description: "Salt spray corrosion testing for PV modules",
    specs: ["5% NaCl solution", "35\u00B0C chamber temp", "96hr exposure cycles"],
    tempRange: "35\u00B0C \u00B12\u00B0C",
    capacity: "5% NaCl salt spray",
  },
  {
    id: "mechanical_load_test",
    name: "Mechanical Load Frame",
    standard: "IEC 62782",
    category: "Mechanical",
    description: "Uniform mechanical load testing for PV modules",
    specs: ["Up to 5400Pa front", "Up to 2400Pa rear", "Pneumatic/hydraulic"],
    capacity: "5400Pa uniform load",
  },
  {
    id: "solar_simulator",
    name: "Solar Simulator",
    standard: "IEC 60904-9",
    category: "Optical",
    description: "Class AAA solar simulator for I-V characterization",
    specs: ["1000 W/m\u00B2 irradiance", "Class AAA rating", "AM1.5G spectrum"],
    capacity: "1000 W/m\u00B2",
  },
  {
    id: "ignitability_chamber",
    name: "Ignitability Test Chamber",
    standard: "IEC 61730 MST 23",
    category: "Fire",
    description: "Fire/ignitability test chamber for PV modules",
    specs: ["Chimney-type design", "Flame spread test", "Burning brand test"],
    tempRange: "Up to 750\u00B0C",
  },
  {
    id: "chiller_unit",
    name: "Chiller Unit",
    standard: "Support Equipment",
    category: "Support",
    description: "Industrial chiller unit for test lab cooling",
    specs: ["40\u201380 TR cooling", "R-410A refrigerant", "Variable speed compressor"],
    capacity: "40\u201380 TR cooling",
  },
];

const CATEGORIES: Category[] = ["All", "Climatic", "Mechanical", "Optical", "Fire", "Support"];

const CATEGORY_COLORS: Record<Category, string> = {
  All: "#00D4FF",
  Climatic: "#3b82f6",
  Mechanical: "#f59e0b",
  Optical: "#a855f7",
  Fire: "#ef4444",
  Support: "#6b7280",
};

// ─── Mini SVG Thumbnails per template ──────────────────────────────────────────

function EquipmentThumbnail({ id }: { id: EquipmentTemplateId }) {
  const thumbnails: Record<string, React.ReactNode> = {
    thermal_cycling_chamber: (
      <svg viewBox="0 0 200 140" className="w-full h-full">
        <rect x="20" y="15" width="160" height="110" rx="4" fill="#1a2332" stroke="#3b82f6" strokeWidth="2" />
        <rect x="35" y="30" width="130" height="70" rx="2" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,2" />
        <line x1="35" y1="55" x2="165" y2="55" stroke="#3b82f6" strokeWidth="0.5" opacity="0.5" />
        <line x1="35" y1="75" x2="165" y2="75" stroke="#3b82f6" strokeWidth="0.5" opacity="0.5" />
        <rect x="60" y="35" width="80" height="25" rx="1" fill="#3b82f6" opacity="0.15" stroke="#3b82f6" strokeWidth="0.5" />
        <text x="100" y="52" fontSize="8" fill="#3b82f6" textAnchor="middle" fontFamily="monospace">-40/+85°C</text>
        <circle cx="45" cy="110" r="5" fill="none" stroke="#3b82f6" strokeWidth="1" />
        <circle cx="155" cy="110" r="5" fill="none" stroke="#3b82f6" strokeWidth="1" />
        <rect x="75" y="105" width="50" height="12" rx="2" fill="#3b82f6" opacity="0.2" stroke="#3b82f6" strokeWidth="0.5" />
        <text x="100" y="114" fontSize="7" fill="#60a5fa" textAnchor="middle" fontFamily="monospace">CTRL</text>
      </svg>
    ),
    iec_uv_conditioning_chamber: (
      <svg viewBox="0 0 200 140" className="w-full h-full">
        <rect x="20" y="15" width="160" height="110" rx="4" fill="#1a2332" stroke="#a855f7" strokeWidth="2" />
        <rect x="35" y="30" width="130" height="70" rx="2" fill="none" stroke="#a855f7" strokeWidth="1" />
        {[50, 75, 100, 125, 150].map(x => (
          <g key={x}>
            <line x1={x} y1="32" x2={x} y2="55" stroke="#a855f7" strokeWidth="1.5" opacity="0.7" />
            <circle cx={x} cy="32" r="2" fill="#a855f7" opacity="0.8" />
          </g>
        ))}
        <rect x="45" y="62" width="110" height="30" rx="1" fill="#a855f7" opacity="0.1" stroke="#a855f7" strokeWidth="0.5" strokeDasharray="3,2" />
        <text x="100" y="80" fontSize="7" fill="#a855f7" textAnchor="middle" fontFamily="monospace">MODULE AREA</text>
        <text x="100" y="118" fontSize="7" fill="#c084fc" textAnchor="middle" fontFamily="monospace">60 kWh/m²</text>
      </svg>
    ),
    humidity_freeze_chamber: (
      <svg viewBox="0 0 200 140" className="w-full h-full">
        <rect x="20" y="15" width="160" height="110" rx="4" fill="#1a2332" stroke="#3b82f6" strokeWidth="2" />
        <rect x="35" y="30" width="130" height="70" rx="2" fill="none" stroke="#3b82f6" strokeWidth="1" />
        {[45, 60, 75, 90, 105, 120, 135, 150].map((x, i) => (
          <circle key={x} cx={x} cy={40 + (i % 3) * 5} r="2" fill="#60a5fa" opacity="0.5" />
        ))}
        <path d="M50,85 Q65,70 80,85 Q95,100 110,85 Q125,70 140,85" fill="none" stroke="#93c5fd" strokeWidth="1" opacity="0.5" />
        <text x="100" y="65" fontSize="8" fill="#3b82f6" textAnchor="middle" fontFamily="monospace">85°C/85%RH</text>
        <text x="100" y="118" fontSize="7" fill="#60a5fa" textAnchor="middle" fontFamily="monospace">DH + HF TEST</text>
      </svg>
    ),
    salt_mist_chamber: (
      <svg viewBox="0 0 200 140" className="w-full h-full">
        <rect x="20" y="15" width="160" height="110" rx="4" fill="#1a2332" stroke="#3b82f6" strokeWidth="2" />
        <path d="M30,25 L30,95 Q30,100 35,100 L165,100 Q170,100 170,95 L170,25" fill="none" stroke="#3b82f6" strokeWidth="1" />
        {[55, 80, 105, 130, 155].map(x => (
          <g key={x}>
            <line x1={x} y1="35" x2={x} y2="45" stroke="#60a5fa" strokeWidth="1" />
            <circle cx={x} cy="48" r="1.5" fill="#60a5fa" opacity="0.6" />
            <circle cx={x - 3} cy="55" r="1" fill="#60a5fa" opacity="0.4" />
            <circle cx={x + 4} cy="52" r="1" fill="#60a5fa" opacity="0.3" />
          </g>
        ))}
        <rect x="50" y="65" width="100" height="25" rx="1" fill="#3b82f6" opacity="0.1" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="3,2" />
        <text x="100" y="82" fontSize="7" fill="#3b82f6" textAnchor="middle" fontFamily="monospace">5% NaCl</text>
        <text x="100" y="118" fontSize="7" fill="#60a5fa" textAnchor="middle" fontFamily="monospace">SALT SPRAY</text>
      </svg>
    ),
    mechanical_load_test: (
      <svg viewBox="0 0 200 140" className="w-full h-full">
        <rect x="30" y="15" width="10" height="110" rx="1" fill="#1a2332" stroke="#f59e0b" strokeWidth="1.5" />
        <rect x="160" y="15" width="10" height="110" rx="1" fill="#1a2332" stroke="#f59e0b" strokeWidth="1.5" />
        <line x1="30" y1="20" x2="170" y2="20" stroke="#f59e0b" strokeWidth="2" />
        <line x1="30" y1="120" x2="170" y2="120" stroke="#f59e0b" strokeWidth="2" />
        <rect x="50" y="35" width="100" height="65" rx="2" fill="#f59e0b" opacity="0.08" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,2" />
        <text x="100" y="72" fontSize="8" fill="#f59e0b" textAnchor="middle" fontFamily="monospace">5400 Pa</text>
        {[60, 80, 100, 120, 140].map(x => (
          <g key={x}>
            <line x1={x} y1="28" x2={x} y2="35" stroke="#fbbf24" strokeWidth="1" />
            <polygon points={`${x},35 ${x - 2},30 ${x + 2},30`} fill="#fbbf24" />
          </g>
        ))}
        <text x="100" y="118" fontSize="7" fill="#fbbf24" textAnchor="middle" fontFamily="monospace">LOAD FRAME</text>
      </svg>
    ),
    solar_simulator: (
      <svg viewBox="0 0 200 140" className="w-full h-full">
        <rect x="25" y="10" width="150" height="40" rx="3" fill="#1a2332" stroke="#a855f7" strokeWidth="1.5" />
        {[50, 75, 100, 125, 150].map(x => (
          <g key={x}>
            <circle cx={x} cy="30" r="6" fill="#fbbf24" opacity="0.3" stroke="#fbbf24" strokeWidth="0.5" />
            <circle cx={x} cy="30" r="3" fill="#fbbf24" opacity="0.6" />
            <line x1={x} y1="50" x2={x} y2="80" stroke="#fbbf24" strokeWidth="0.5" opacity="0.3" />
          </g>
        ))}
        <rect x="40" y="85" width="120" height="35" rx="2" fill="#a855f7" opacity="0.08" stroke="#a855f7" strokeWidth="1" strokeDasharray="3,2" />
        <text x="100" y="107" fontSize="7" fill="#a855f7" textAnchor="middle" fontFamily="monospace">MODULE UNDER TEST</text>
        <text x="100" y="72" fontSize="8" fill="#fbbf24" textAnchor="middle" fontFamily="monospace">1000 W/m²</text>
      </svg>
    ),
    ignitability_chamber: (
      <svg viewBox="0 0 200 140" className="w-full h-full">
        <rect x="60" y="10" width="80" height="105" rx="3" fill="#1a2332" stroke="#ef4444" strokeWidth="1.5" />
        <rect x="70" y="18" width="60" height="55" rx="1" fill="none" stroke="#ef4444" strokeWidth="0.8" />
        <circle cx="100" cy="90" r="12" fill="none" stroke="#ef4444" strokeWidth="1" />
        <circle cx="100" cy="90" r="8" fill="#ef4444" opacity="0.1" />
        <path d="M95,50 Q98,35 100,30 Q102,35 105,50" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.6" />
        <path d="M92,55 Q96,40 100,33 Q104,40 108,55" fill="none" stroke="#fbbf24" strokeWidth="0.8" opacity="0.4" />
        <text x="100" y="130" fontSize="7" fill="#ef4444" textAnchor="middle" fontFamily="monospace">CHIMNEY TEST</text>
      </svg>
    ),
    chiller_unit: (
      <svg viewBox="0 0 200 140" className="w-full h-full">
        <rect x="20" y="25" width="160" height="90" rx="4" fill="#1a2332" stroke="#6b7280" strokeWidth="1.5" />
        {[45, 75, 105, 135].map(x => (
          <g key={x}>
            <circle cx={x} cy="55" r="12" fill="none" stroke="#6b7280" strokeWidth="1" />
            <circle cx={x} cy="55" r="8" fill="#6b7280" opacity="0.1" />
            <line x1={x - 5} y1="55" x2={x + 5} y2="55" stroke="#6b7280" strokeWidth="0.5" />
            <line x1={x} y1="50" x2={x} y2="60" stroke="#6b7280" strokeWidth="0.5" />
          </g>
        ))}
        <rect x="35" y="80" width="130" height="22" rx="2" fill="#6b7280" opacity="0.1" stroke="#6b7280" strokeWidth="0.5" />
        <text x="100" y="95" fontSize="7" fill="#6b7280" textAnchor="middle" fontFamily="monospace">COMPRESSOR UNIT</text>
        <text x="100" y="130" fontSize="7" fill="#9ca3af" textAnchor="middle" fontFamily="monospace">40-80 TR</text>
      </svg>
    ),
  };
  return <>{thumbnails[id] || thumbnails.thermal_cycling_chamber}</>;
}

// ─── Library Page ─────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("shilpasutra_favorites");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem("shilpasutra_favorites", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const filtered = useMemo(() => {
    return EQUIPMENT_CATALOG.filter(item => {
      if (category !== "All" && item.category !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.standard.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.specs.some(s => s.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [search, category]);

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-[#21262d] bg-[#161b22]">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">IEC PV Test Equipment Library</h1>
              <p className="text-sm text-slate-400 mt-1">Professional engineering drawings for photovoltaic testing equipment</p>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-500">{EQUIPMENT_CATALOG.length} templates available</div>
              <div className="text-[10px] text-slate-600 mt-0.5">IEC 61215 / 61730 / 60904 / 62782</div>
              <ExplorationProgress />
            </div>
          </div>

          {/* Search + Filter */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zm-.82 4.74a6 6 0 1 1 1.06-1.06l3.04 3.04a.75.75 0 1 1-1.06 1.06l-3.04-3.04z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search equipment by name, standard, or specs..."
                className="w-full bg-[#0d1117] border border-[#21262d] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#00D4FF] focus:outline-none transition-colors"
              />
            </div>
            <div className="flex gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    category === cat
                      ? "text-white shadow-lg"
                      : "bg-[#21262d] text-slate-400 hover:text-white hover:bg-[#2d333b]"
                  }`}
                  style={category === cat ? { backgroundColor: CATEGORY_COLORS[cat] + "30", color: CATEGORY_COLORS[cat], border: `1px solid ${CATEGORY_COLORS[cat]}60` } : {}}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Equipment Grid ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-slate-500 text-lg mb-2">No equipment found</div>
              <div className="text-slate-600 text-sm">Try adjusting your search or filter</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(item => {
                const catColor = CATEGORY_COLORS[item.category];
                return (
                  <div
                    key={item.id}
                    className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden hover:border-[#30363d] transition-all group hover:shadow-xl hover:shadow-black/20"
                  >
                    {/* Thumbnail */}
                    <div className="relative bg-[#0d1117] border-b border-[#21262d] p-2" style={{ height: 160 }}>
                      <EquipmentThumbnail id={item.id} />
                      {/* Favorite star */}
                      <button
                        onClick={() => toggleFavorite(item.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-[#161b22]/80 hover:bg-[#21262d] transition-colors"
                        title={favorites.has(item.id) ? "Remove from favorites" : "Add to favorites"}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill={favorites.has(item.id) ? "#fbbf24" : "none"} stroke={favorites.has(item.id) ? "#fbbf24" : "#6b7280"} strokeWidth="1.5">
                          <path d="M8 1.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 12.2 3.8 14.5l.8-4.7L1.2 6.5l4.7-.7L8 1.5z" />
                        </svg>
                      </button>
                      {/* Category badge */}
                      <div
                        className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: catColor + "20", color: catColor, border: `1px solid ${catColor}40` }}
                      >
                        {item.category}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      {/* Name + Standard */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-bold text-white group-hover:text-[#00D4FF] transition-colors leading-tight">{item.name}</h3>
                        <span className="shrink-0 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20">
                          {item.standard}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-slate-400 mb-3 line-clamp-1">{item.description}</p>

                      {/* Specs */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {item.specs.map((spec, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-[#21262d] text-[9px] text-slate-400 font-mono">
                            {spec}
                          </span>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/drawings?template=${item.id}`)}
                          className="flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/20 transition-colors"
                        >
                          Open Drawing
                        </button>
                        <button
                          onClick={() => router.push(`/drawings?template=${item.id}&edit=true`)}
                          className="flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold bg-[#21262d] text-slate-300 border border-[#30363d] hover:bg-[#2d333b] hover:text-white transition-colors"
                        >
                          Customize
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
