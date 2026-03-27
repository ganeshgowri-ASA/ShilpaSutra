"use client";

// ─── Template Gallery Page ─────────────────────────────────────────────────
// Browse and launch parametric solar PV (and other domain) design templates.
// Click a template to open TemplateParameterDialog → generate in designer.

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sun, Zap, RefreshCw, Home, Layout,
  Clock, Search, ChevronRight,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  SOLAR_TEMPLATES,
  type SolarTemplate,
  type SolarTemplateCategory,
  type DerivedResults,
} from "@/lib/solar-templates";

// Lazy-load dialog to keep initial bundle small
const TemplateParameterDialog = dynamic(() => import("@/components/TemplateParameterDialog"), { ssr: false });

// ─── Category metadata ─────────────────────────────────────────────────────

type FilterCategory = "all" | "Solar" | "Structural" | "Mechanical" | "Electrical";

const FILTER_TABS: FilterCategory[] = ["all", "Solar", "Structural", "Mechanical", "Electrical"];

const CATEGORY_LABELS: Record<SolarTemplateCategory, string> = {
  pv_module: "PV Module",
  ground_mounted: "Ground Mount",
  single_axis_tracker: "SAT Array",
  rooftop_ballasted: "Rooftop",
  carport_canopy: "Carport",
};

const CATEGORY_ICONS: Record<SolarTemplateCategory, React.ElementType> = {
  pv_module: Sun,
  ground_mounted: Zap,
  single_axis_tracker: RefreshCw,
  rooftop_ballasted: Home,
  carport_canopy: Layout,
};

// All solar templates belong to the "Solar" filter category
const TEMPLATE_FILTER_MAP: Record<string, FilterCategory> = {
  pv_module_bifacial: "Solar",
  ground_fixed_tilt: "Solar",
  single_axis_tracker: "Solar",
  rooftop_ballasted: "Solar",
  carport_canopy: "Solar",
};

// ─── Local storage key for recently used ──────────────────────────────────

const RECENT_KEY = "ss_recent_templates";

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}

function saveRecent(id: string, existing: string[]): string[] {
  const updated = [id, ...existing.filter(x => x !== id)].slice(0, 6);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  return updated;
}

// ─── Template Card ─────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: SolarTemplate;
  onSelect: (id: string) => void;
  badge?: string;
}

function TemplateCard({ template, onSelect, badge }: TemplateCardProps) {
  const Icon = CATEGORY_ICONS[template.category] || Sun;
  return (
    <button
      onClick={() => onSelect(template.id)}
      className="group flex flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-5 text-left transition-all hover:border-amber-500/60 hover:bg-zinc-800/80 hover:shadow-lg hover:shadow-amber-500/10"
    >
      {/* Icon + badge row */}
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 transition-colors group-hover:bg-amber-500/25">
          <Icon size={22} />
        </div>
        {badge && (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
            {badge}
          </span>
        )}
      </div>

      {/* Text */}
      <div>
        <p className="font-semibold text-white leading-tight">{template.name}</p>
        <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{template.description}</p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
          {CATEGORY_LABELS[template.category]}
        </span>
        {template.tags.slice(0, 2).map(tag => (
          <span key={tag} className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
            {tag}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-auto flex items-center gap-1 text-xs font-medium text-amber-400 opacity-0 transition-opacity group-hover:opacity-100">
        Configure & Generate <ChevronRight size={14} />
      </div>
    </button>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [search, setSearch] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>(loadRecent);

  // Filter templates
  const filtered = useMemo(() => {
    return SOLAR_TEMPLATES.filter(t => {
      if (activeFilter !== "all" && TEMPLATE_FILTER_MAP[t.id] !== activeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q));
      }
      return true;
    });
  }, [activeFilter, search]);

  const recentTemplates = useMemo(
    () => recentIds.map(id => SOLAR_TEMPLATES.find(t => t.id === id)).filter(Boolean) as SolarTemplate[],
    [recentIds]
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedTemplateId(id);
    setRecentIds(prev => saveRecent(id, prev));
  }, []);

  const handleGenerate = useCallback(
    (_templateId: string, inputs: Record<string, number | string | boolean>, _derived: DerivedResults) => {
      // Encode params and navigate to designer with template pre-loaded
      const params = new URLSearchParams({ templateId: _templateId, inputs: JSON.stringify(inputs) });
      router.push(`/designer?${params.toString()}`);
    },
    [router]
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Page header */}
      <div className="border-b border-zinc-800 bg-zinc-950/90 px-6 py-6 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Design Templates</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Pre-built parametric templates — configure parameters and generate instantly.
              </p>
            </div>
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search templates…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Category filter tabs */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {FILTER_TABS.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeFilter === cat
                    ? "bg-amber-500 text-black"
                    : "border border-zinc-700 text-zinc-400 hover:border-amber-500/50 hover:text-zinc-200"
                }`}
              >
                {cat === "all" ? "All Templates" : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-10">

        {/* Recently Used */}
        {recentTemplates.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Clock size={15} className="text-amber-400" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Recently Used</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recentTemplates.map(t => (
                <TemplateCard key={t.id} template={t} onSelect={handleSelect} badge="Recent" />
              ))}
            </div>
          </section>
        )}

        {/* Solar PV Templates */}
        {(activeFilter === "all" || activeFilter === "Solar") && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Sun size={15} className="text-amber-400" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Solar PV</h2>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                {filtered.length}
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 py-16 text-center">
                <Search size={32} className="mb-3 text-zinc-600" />
                <p className="font-medium text-zinc-400">No templates match &ldquo;{search}&rdquo;</p>
                <button onClick={() => setSearch("")} className="mt-2 text-sm text-amber-400 hover:underline">
                  Clear search
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map(t => (
                  <TemplateCard key={t.id} template={t} onSelect={handleSelect} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Coming Soon for other categories */}
        {(activeFilter === "Structural" || activeFilter === "Mechanical" || activeFilter === "Electrical") && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 py-24 text-center">
            <span className="mb-3 text-4xl">🔩</span>
            <p className="text-lg font-semibold text-zinc-300">{activeFilter} Templates</p>
            <p className="mt-1 text-sm text-zinc-500">Coming soon — stay tuned for brackets, channels, cable trays and more.</p>
          </div>
        )}
      </div>

      {/* Parameter dialog */}
      {selectedTemplateId && (
        <TemplateParameterDialog
          templateId={selectedTemplateId}
          onClose={() => setSelectedTemplateId(null)}
          onGenerate={handleGenerate}
        />
      )}
    </div>
  );
}
