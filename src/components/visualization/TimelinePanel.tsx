"use client";

import { useMemo } from "react";
import {
  Clock,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useVisualizationStore, DEFAULT_PHASES } from "@/stores/visualization-store";

const PHASE_STATUS_COLORS = {
  planned: "#3b82f6",
  "in-progress": "#eab308",
  completed: "#22c55e",
};

export default function TimelinePanel() {
  const {
    phases,
    currentPhase,
    timelineActive,
    components,
    setCurrentPhase,
    toggleTimeline,
  } = useVisualizationStore();

  const phaseStats = useMemo(() => {
    const stats: Record<number, { total: number; planned: number; inProgress: number; completed: number }> = {};
    for (const phase of phases) {
      stats[phase.id] = { total: 0, planned: 0, inProgress: 0, completed: 0 };
    }
    for (const [, comp] of components) {
      if (comp.constructionPhase !== undefined && stats[comp.constructionPhase]) {
        stats[comp.constructionPhase].total++;
        if (comp.phaseStatus === "completed") stats[comp.constructionPhase].completed++;
        else if (comp.phaseStatus === "in-progress") stats[comp.constructionPhase].inProgress++;
        else stats[comp.constructionPhase].planned++;
      }
    }
    return stats;
  }, [phases, components]);

  if (!timelineActive) return null;

  return (
    <div className="bg-[#0d1117] border-t border-[#21262d] px-3 py-2">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2">
        <Clock size={13} className="text-purple-400" />
        <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
          4D Construction Timeline
        </span>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setCurrentPhase(-1)}
            className="w-6 h-6 rounded flex items-center justify-center bg-[#161b22] text-slate-500 hover:text-slate-300"
            title="Show all phases"
          >
            <SkipBack size={11} />
          </button>

          <button
            onClick={() => setCurrentPhase(Math.max(-1, currentPhase - 1))}
            disabled={currentPhase <= -1}
            className="w-6 h-6 rounded flex items-center justify-center bg-[#161b22] text-slate-500 hover:text-slate-300 disabled:opacity-30"
          >
            <ChevronLeft size={11} />
          </button>

          <span className="text-[10px] text-slate-400 font-medium min-w-[80px] text-center">
            {currentPhase === -1
              ? "All Phases"
              : phases.find((p) => p.id === currentPhase)?.name || `Phase ${currentPhase}`}
          </span>

          <button
            onClick={() => setCurrentPhase(Math.min(phases.length - 1, currentPhase + 1))}
            disabled={currentPhase >= phases.length - 1}
            className="w-6 h-6 rounded flex items-center justify-center bg-[#161b22] text-slate-500 hover:text-slate-300 disabled:opacity-30"
          >
            <ChevronRight size={11} />
          </button>

          <button
            onClick={() => setCurrentPhase(phases.length - 1)}
            className="w-6 h-6 rounded flex items-center justify-center bg-[#161b22] text-slate-500 hover:text-slate-300"
            title="Show final state"
          >
            <SkipForward size={11} />
          </button>
        </div>
      </div>

      {/* Timeline bar */}
      <div className="flex gap-1">
        {phases.map((phase) => {
          const stats = phaseStats[phase.id] || { total: 0, planned: 0, inProgress: 0, completed: 0 };
          const isActive = currentPhase === -1 || phase.id <= currentPhase;
          const isCurrent = phase.id === currentPhase;

          return (
            <button
              key={phase.id}
              onClick={() => setCurrentPhase(phase.id)}
              className={`flex-1 rounded transition-all duration-200 ${
                isCurrent
                  ? "ring-1 ring-[#00D4FF] ring-offset-1 ring-offset-[#0d1117]"
                  : ""
              }`}
            >
              <div
                className={`px-2 py-1.5 rounded transition-opacity ${
                  isActive ? "opacity-100" : "opacity-30"
                }`}
                style={{ backgroundColor: `${phase.color}15` }}
              >
                <div
                  className="text-[9px] font-bold truncate"
                  style={{ color: phase.color }}
                >
                  {phase.name}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="flex-1 h-1 bg-[#21262d] rounded-full overflow-hidden">
                    {stats.total > 0 && (
                      <div className="h-full flex">
                        <div
                          className="h-full"
                          style={{
                            width: `${(stats.completed / stats.total) * 100}%`,
                            backgroundColor: PHASE_STATUS_COLORS.completed,
                          }}
                        />
                        <div
                          className="h-full"
                          style={{
                            width: `${(stats.inProgress / stats.total) * 100}%`,
                            backgroundColor: PHASE_STATUS_COLORS["in-progress"],
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <span className="text-[7px] text-slate-600 font-mono">
                    {stats.total}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-1.5 justify-center">
        {Object.entries(PHASE_STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-[8px] text-slate-600 capitalize">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
