"use client";

import { useState, useMemo, useCallback } from "react";
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  MapPin,
  Download,
  Play,
  Trash2,
  Settings,
} from "lucide-react";
import {
  useVisualizationStore,
  type ClashResult,
} from "@/stores/visualization-store";
import {
  detectClashes,
  createPVClashGroups,
  exportClashReport,
} from "@/lib/clash-detection";

type FilterType = "all" | "hard" | "soft";
type FilterSeverity = "all" | "critical" | "major" | "minor";

export default function ClashDetectionPanel() {
  const {
    components,
    models,
    clashResults,
    clashMinGap,
    selectedClashId,
    setClashResults,
    clearClashResults,
    setClashMinGap,
    selectClash,
    resolveClash,
    selectComponent,
    setCameraPosition,
    setCameraTarget,
  } = useVisualizationStore();

  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const filteredClashes = useMemo(() => {
    return clashResults.filter((c) => {
      if (filterType !== "all" && c.type !== filterType) return false;
      if (filterSeverity !== "all" && c.severity !== filterSeverity) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const compA = components.get(c.componentA);
        const compB = components.get(c.componentB);
        const matchA = compA?.name.toLowerCase().includes(term);
        const matchB = compB?.name.toLowerCase().includes(term);
        if (!matchA && !matchB && !c.description.toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [clashResults, filterType, filterSeverity, searchTerm, components]);

  const stats = useMemo(() => ({
    total: clashResults.length,
    hard: clashResults.filter((c) => c.type === "hard").length,
    soft: clashResults.filter((c) => c.type === "soft").length,
    critical: clashResults.filter((c) => c.severity === "critical" && !c.resolved).length,
    resolved: clashResults.filter((c) => c.resolved).length,
  }), [clashResults]);

  const handleRunDetection = useCallback(() => {
    const pvGroups = createPVClashGroups(components);
    const results = detectClashes(components, {
      minGap: clashMinGap,
      checkHard: true,
      checkSoft: true,
      useMeshLevel: false,
      clashGroups: pvGroups.length > 0 ? pvGroups : undefined,
    });
    setClashResults(results);
  }, [components, clashMinGap, setClashResults]);

  const handleExport = useCallback(() => {
    const report = exportClashReport(clashResults, components);
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clash-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [clashResults, components]);

  const handleClashClick = (clash: ClashResult) => {
    selectClash(clash.id);
    // Navigate camera to clash location
    setCameraTarget(clash.location);
    setCameraPosition([
      clash.location[0] + 3,
      clash.location[1] + 2,
      clash.location[2] + 3,
    ]);
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "text-red-400 bg-red-500/10";
      case "major": return "text-orange-400 bg-orange-500/10";
      case "minor": return "text-yellow-400 bg-yellow-500/10";
      default: return "text-slate-400 bg-slate-500/10";
    }
  };

  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#21262d]">
        <AlertTriangle size={13} className="text-red-400" />
        <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
          Clash Detection
        </span>
        <span className="ml-auto text-[9px] text-slate-600">
          {stats.total} clashes
        </span>
      </div>

      <div className="p-2 space-y-2">
        {/* Stats bar */}
        <div className="flex gap-1.5">
          <StatBadge label="Hard" count={stats.hard} color="text-red-400 bg-red-500/10" />
          <StatBadge label="Soft" count={stats.soft} color="text-orange-400 bg-orange-500/10" />
          <StatBadge label="Critical" count={stats.critical} color="text-red-400 bg-red-500/10" />
          <StatBadge label="Resolved" count={stats.resolved} color="text-green-400 bg-green-500/10" />
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <button
            onClick={handleRunDetection}
            className="flex items-center gap-1 px-2 py-1 bg-[#00D4FF]/10 text-[#00D4FF] rounded text-[9px] font-medium hover:bg-[#00D4FF]/20 transition-colors flex-1 justify-center"
          >
            <Play size={10} />
            Run Detection
          </button>
          <button
            onClick={handleExport}
            disabled={clashResults.length === 0}
            className="flex items-center gap-1 px-2 py-1 bg-[#161b22] text-slate-400 rounded text-[9px] hover:text-slate-200 transition-colors disabled:opacity-30"
          >
            <Download size={10} />
            Export
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              showSettings ? "bg-[#00D4FF]/10 text-[#00D4FF]" : "bg-[#161b22] text-slate-500 hover:text-slate-300"
            }`}
          >
            <Settings size={10} />
          </button>
          <button
            onClick={clearClashResults}
            disabled={clashResults.length === 0}
            className="w-7 h-7 rounded bg-[#161b22] flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30"
          >
            <Trash2 size={10} />
          </button>
        </div>

        {/* Settings */}
        {showSettings && (
          <div className="px-2 py-1.5 bg-[#161b22] rounded space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-500 w-16">Min Gap</span>
              <input
                type="range"
                min={0.01}
                max={1}
                step={0.01}
                value={clashMinGap}
                onChange={(e) => setClashMinGap(parseFloat(e.target.value))}
                className="flex-1 h-1 accent-[#00D4FF]"
              />
              <span className="text-[9px] text-slate-400 font-mono w-10 text-right">
                {clashMinGap.toFixed(2)}m
              </span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-1 items-center">
          <div className="relative flex-1">
            <Search size={10} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              placeholder="Search clashes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#161b22] border border-[#21262d] rounded text-[9px] text-slate-300 pl-5 pr-2 py-0.5 placeholder-slate-700 focus:outline-none focus:border-[#00D4FF]/30"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="bg-[#161b22] border border-[#21262d] rounded text-[9px] text-slate-400 px-1 py-0.5 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="hard">Hard</option>
            <option value="soft">Soft</option>
          </select>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as FilterSeverity)}
            className="bg-[#161b22] border border-[#21262d] rounded text-[9px] text-slate-400 px-1 py-0.5 focus:outline-none"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
          </select>
        </div>

        {/* Clash list */}
        <div className="max-h-[300px] overflow-y-auto thin-scrollbar space-y-0.5">
          {filteredClashes.length === 0 ? (
            <div className="text-center py-4 text-slate-700">
              <AlertTriangle size={20} className="mx-auto mb-1" />
              <div className="text-[10px]">
                {clashResults.length === 0
                  ? "No clashes detected. Run detection first."
                  : "No clashes match current filters."}
              </div>
            </div>
          ) : (
            filteredClashes.map((clash) => {
              const compA = components.get(clash.componentA);
              const compB = components.get(clash.componentB);
              const isSelected = selectedClashId === clash.id;

              return (
                <div
                  key={clash.id}
                  onClick={() => handleClashClick(clash)}
                  className={`px-2 py-1.5 rounded cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#00D4FF]/10 border border-[#00D4FF]/20"
                      : "bg-[#161b22] hover:bg-[#1a2030] border border-transparent"
                  } ${clash.resolved ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[8px] font-bold uppercase px-1 py-0 rounded ${severityColor(clash.severity)}`}
                    >
                      {clash.severity}
                    </span>
                    <span className="text-[8px] text-slate-600 uppercase">
                      {clash.type}
                    </span>
                    {clash.resolved && (
                      <CheckCircle size={9} className="text-green-500 ml-auto" />
                    )}
                    {!clash.resolved && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resolveClash(clash.id);
                        }}
                        className="ml-auto text-[8px] text-slate-600 hover:text-green-400 transition-colors"
                        title="Mark as resolved"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    {compA?.name || clash.componentA} ↔ {compB?.name || clash.componentB}
                  </div>
                  {clash.distance !== undefined && clash.distance > 0 && (
                    <div className="text-[8px] text-slate-600 mt-0.5">
                      Gap: {clash.distance.toFixed(3)}m
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function StatBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${color}`}>
      {count} {label}
    </div>
  );
}
