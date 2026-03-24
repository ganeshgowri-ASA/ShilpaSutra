"use client";
import { useCallback } from "react";
import {
  useAssemblyStore,
  type DiagnosticLevel,
} from "@/stores/assembly-store";
import {
  AlertTriangle, Check, AlertCircle, XCircle,
  RefreshCw, ChevronDown, ChevronRight, Info,
} from "lucide-react";
import { useState } from "react";

const levelConfig: Record<DiagnosticLevel, { icon: React.ReactNode; color: string; bgColor: string; borderColor: string; label: string }> = {
  ok: {
    icon: <Check size={12} />,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    label: "OK",
  },
  "under-defined": {
    icon: <Info size={12} />,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    label: "Under-defined",
  },
  "over-defined": {
    icon: <AlertTriangle size={12} />,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    label: "Over-defined",
  },
  conflicting: {
    icon: <XCircle size={12} />,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    label: "Conflict",
  },
};

export default function MateDiagnostics() {
  const diagnostics = useAssemblyStore((s) => s.diagnostics);
  const showDiagnostics = useAssemblyStore((s) => s.showDiagnostics);
  const runDiagnostics = useAssemblyStore((s) => s.runDiagnostics);
  const setShowDiagnostics = useAssemblyStore((s) => s.setShowDiagnostics);
  const selectMate = useAssemblyStore((s) => s.selectMate);
  const selectPart = useAssemblyStore((s) => s.selectPart);
  const lastSolveResult = useAssemblyStore((s) => s.lastSolveResult);

  const [expanded, setExpanded] = useState(true);

  const handleRunDiagnostics = useCallback(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  const overallLevel: DiagnosticLevel = diagnostics.length === 0
    ? "ok"
    : diagnostics.some((d) => d.level === "conflicting")
      ? "conflicting"
      : diagnostics.some((d) => d.level === "over-defined")
        ? "over-defined"
        : diagnostics.some((d) => d.level === "under-defined")
          ? "under-defined"
          : "ok";

  const overallConfig = levelConfig[overallLevel];

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-lg overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d]">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
        >
          <span className="transition-transform" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0)" }}>
            <ChevronRight size={10} className="text-slate-600" />
          </span>
          <AlertCircle size={14} className={overallConfig.color} />
          <span className="text-[11px] font-bold tracking-wide">Mate Diagnostics</span>
          {diagnostics.length > 0 && (
            <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${overallConfig.bgColor} ${overallConfig.color} border ${overallConfig.borderColor}`}>
              {overallConfig.label}
            </span>
          )}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className={`text-[9px] px-1.5 py-0.5 rounded transition-all ${
              showDiagnostics ? "text-[#00D4FF] bg-[#00D4FF]/10" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {showDiagnostics ? "On" : "Off"}
          </button>
          <button
            onClick={handleRunDiagnostics}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#21262d] text-slate-400 hover:text-white transition-colors"
            title="Run diagnostics"
          >
            <RefreshCw size={10} />
          </button>
        </div>
      </div>

      {expanded && showDiagnostics && (
        <div className="px-2 py-1.5 space-y-1 max-h-[200px] overflow-y-auto thin-scrollbar">
          {diagnostics.length === 0 && (
            <div className="text-[10px] text-slate-600 italic text-center py-3">
              Click refresh to run diagnostics
            </div>
          )}
          {diagnostics.map((diag, idx) => {
            const config = levelConfig[diag.level];
            return (
              <div
                key={idx}
                className={`flex items-start gap-2 px-2 py-1.5 rounded-md border ${config.bgColor} ${config.borderColor}`}
              >
                <span className={`shrink-0 mt-0.5 ${config.color}`}>{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-[10px] font-medium ${config.color}`}>{config.label}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">{diag.message}</div>
                  {/* Clickable links to affected entities */}
                  {(diag.affectedMateIds.length > 0 || diag.affectedPartIds.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {diag.affectedPartIds.map((pid) => (
                        <button
                          key={pid}
                          onClick={() => selectPart(pid)}
                          className="text-[7px] font-mono px-1 py-0.5 rounded bg-[#0d1117] border border-[#30363d] text-slate-400 hover:text-[#00D4FF] hover:border-[#00D4FF]/30 transition-colors"
                        >
                          Part:{pid.slice(0, 8)}
                        </button>
                      ))}
                      {diag.affectedMateIds.map((mid) => (
                        <button
                          key={mid}
                          onClick={() => selectMate(mid)}
                          className="text-[7px] font-mono px-1 py-0.5 rounded bg-[#0d1117] border border-[#30363d] text-slate-400 hover:text-orange-400 hover:border-orange-500/30 transition-colors"
                        >
                          Mate:{mid.slice(0, 8)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Solve summary */}
          {lastSolveResult && (
            <div className="flex items-center justify-between px-2 py-1 mt-1 border-t border-[#21262d]">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${lastSolveResult.success ? "bg-emerald-400" : "bg-amber-400"}`} />
                <span className="text-[9px] text-slate-400">
                  {lastSolveResult.success ? "All mates satisfied" : "Some mates unsatisfied"}
                </span>
              </div>
              <span className="text-[8px] text-slate-600 font-mono">
                {lastSolveResult.iterations} iters
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
