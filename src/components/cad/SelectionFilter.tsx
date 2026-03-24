"use client";
import { useState, useCallback } from "react";
import {
  CircleDot, Minus, Square, Box, Layers,
} from "lucide-react";

export type SelectionFilterType = "vertex" | "edge" | "face" | "body" | "component";

interface SelectionFilterProps {
  activeFilters: Set<SelectionFilterType>;
  onToggle: (filter: SelectionFilterType) => void;
}

const filters: { id: SelectionFilterType; icon: React.ReactNode; label: string; shortcut: string; color: string }[] = [
  { id: "vertex", icon: <CircleDot size={12} />, label: "Vertices", shortcut: "V", color: "#f59e0b" },
  { id: "edge", icon: <Minus size={12} />, label: "Edges", shortcut: "E", color: "#3b82f6" },
  { id: "face", icon: <Square size={12} />, label: "Faces", shortcut: "F", color: "#22c55e" },
  { id: "body", icon: <Box size={12} />, label: "Bodies", shortcut: "B", color: "#a855f7" },
  { id: "component", icon: <Layers size={12} />, label: "Components", shortcut: "C", color: "#06b6d4" },
];

/**
 * SolidWorks-style selection filter toolbar.
 * Allows filtering what geometry types can be selected (vertices, edges, faces, bodies).
 */
export default function SelectionFilter({ activeFilters, onToggle }: SelectionFilterProps) {
  const [expanded, setExpanded] = useState(true);

  const handleToggleAll = useCallback(() => {
    const allActive = filters.every(f => activeFilters.has(f.id));
    filters.forEach(f => {
      if (allActive && activeFilters.has(f.id)) onToggle(f.id);
      if (!allActive && !activeFilters.has(f.id)) onToggle(f.id);
    });
  }, [activeFilters, onToggle]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="absolute bottom-12 left-3 z-10 pointer-events-auto text-[8px] px-2 py-1 rounded-md bg-[#0d1117]/80 border border-[#21262d] text-slate-500 hover:text-white hover:border-[#30363d] transition-all backdrop-blur-sm"
        title="Show Selection Filter"
      >
        Filter
      </button>
    );
  }

  return (
    <div className="absolute bottom-12 left-3 z-10 pointer-events-auto">
      <div className="bg-[#0d1117]/90 border border-[#21262d] rounded-lg backdrop-blur-md shadow-lg flex items-center gap-0.5 px-1.5 py-1">
        <span className="text-[7px] text-slate-600 font-semibold uppercase tracking-wider mr-1 select-none">Filter</span>
        {filters.map((f) => {
          const isActive = activeFilters.has(f.id);
          return (
            <button
              key={f.id}
              onClick={() => onToggle(f.id)}
              title={`${f.label} (${f.shortcut})`}
              className={`relative flex items-center justify-center w-7 h-6 rounded transition-all duration-150 ${
                isActive
                  ? "text-white"
                  : "text-slate-600 hover:text-slate-300 hover:bg-[#21262d]"
              }`}
              style={isActive ? {
                backgroundColor: `${f.color}20`,
                color: f.color,
                boxShadow: `0 0 6px ${f.color}15`,
              } : undefined}
            >
              {f.icon}
              <span className="absolute -bottom-0.5 text-[5px] font-mono opacity-50">{f.shortcut}</span>
            </button>
          );
        })}
        <div className="w-px h-4 bg-[#21262d] mx-0.5" />
        <button
          onClick={handleToggleAll}
          className="text-[7px] px-1.5 py-0.5 rounded text-slate-500 hover:text-[#00D4FF] hover:bg-[#00D4FF]/10 transition-all font-semibold"
          title="Toggle All Filters"
        >
          ALL
        </button>
        <button
          onClick={() => setExpanded(false)}
          className="text-[7px] px-1 py-0.5 rounded text-slate-600 hover:text-slate-300 transition-all ml-0.5"
          title="Collapse"
        >
          ×
        </button>
      </div>
    </div>
  );
}
