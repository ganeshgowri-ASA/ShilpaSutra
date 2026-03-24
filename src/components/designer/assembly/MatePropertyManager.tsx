"use client";
import { useState, useCallback } from "react";
import {
  useAssemblyStore,
  type MateStatus,
} from "@/stores/assembly-store";
import type { MateType } from "@/lib/mate-solver";
import {
  Link2, Target, Circle, Ruler, TriangleRight,
  ArrowRight, Maximize2, Lock, Plus, Trash2,
  Eye, EyeOff, ChevronDown, ChevronRight,
  Play, Pause, Check, X, AlertTriangle,
  Settings, Crosshair, RotateCw,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const MATE_TYPES: { type: MateType; label: string; icon: React.ReactNode; description: string; hasValue: boolean }[] = [
  { type: "coincident", label: "Coincident", icon: <Target size={14} />, description: "Faces flush together", hasValue: false },
  { type: "concentric", label: "Concentric", icon: <Circle size={14} />, description: "Cylinder axes aligned", hasValue: false },
  { type: "distance", label: "Distance", icon: <Ruler size={14} />, description: "Specified gap between faces", hasValue: true },
  { type: "angle", label: "Angle", icon: <TriangleRight size={14} />, description: "Specified angle between faces", hasValue: true },
  { type: "parallel", label: "Parallel", icon: <ArrowRight size={14} />, description: "Faces parallel", hasValue: false },
  { type: "perpendicular", label: "Perpendicular", icon: <Maximize2 size={14} />, description: "Faces at 90°", hasValue: false },
  { type: "lock", label: "Lock", icon: <Lock size={14} />, description: "Fix relative position & orientation", hasValue: false },
  { type: "gear", label: "Gear", icon: <RotateCw size={14} />, description: "Mechanical gear ratio", hasValue: true },
];

const statusColors: Record<MateStatus, string> = {
  satisfied: "text-emerald-400",
  unsatisfied: "text-amber-400",
  suppressed: "text-slate-500",
  error: "text-red-400",
};

const statusIcons: Record<MateStatus, React.ReactNode> = {
  satisfied: <Check size={10} className="text-emerald-400" />,
  unsatisfied: <AlertTriangle size={10} className="text-amber-400" />,
  suppressed: <Pause size={10} className="text-slate-500" />,
  error: <X size={10} className="text-red-400" />,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function MatePropertyManager() {
  const mates = useAssemblyStore((s) => s.mates);
  const selectedMateId = useAssemblyStore((s) => s.selectedMateId);
  const pickingMode = useAssemblyStore((s) => s.pickingMode);
  const pickedFace1 = useAssemblyStore((s) => s.pickedFace1);
  const pickedFace2 = useAssemblyStore((s) => s.pickedFace2);
  const pendingMateType = useAssemblyStore((s) => s.pendingMateType);
  const pendingMateValue = useAssemblyStore((s) => s.pendingMateValue);
  const showMateIndicators = useAssemblyStore((s) => s.showMateIndicators);
  const lastSolveResult = useAssemblyStore((s) => s.lastSolveResult);

  const selectMate = useAssemblyStore((s) => s.selectMate);
  const removeMate = useAssemblyStore((s) => s.removeMate);
  const suppressMate = useAssemblyStore((s) => s.suppressMate);
  const unsuppressMate = useAssemblyStore((s) => s.unsuppressMate);
  const startPicking = useAssemblyStore((s) => s.startPicking);
  const cancelPicking = useAssemblyStore((s) => s.cancelPicking);
  const setPendingMateType = useAssemblyStore((s) => s.setPendingMateType);
  const setPendingMateValue = useAssemblyStore((s) => s.setPendingMateValue);
  const confirmMate = useAssemblyStore((s) => s.confirmMate);
  const setShowMateIndicators = useAssemblyStore((s) => s.setShowMateIndicators);
  const getMateStatus = useAssemblyStore((s) => s.getMateStatus);
  const solve = useAssemblyStore((s) => s.solve);

  const [matesExpanded, setMatesExpanded] = useState(true);
  const [typeExpanded, setTypeExpanded] = useState(true);

  const selectedMate = mates.find((m) => m.id === selectedMateId);
  const selectedMateInfo = MATE_TYPES.find((t) => t.type === selectedMate?.type);

  const handleAddMate = useCallback((type: MateType) => {
    startPicking(type);
  }, [startPicking]);

  const handleConfirm = useCallback(() => {
    confirmMate();
  }, [confirmMate]);

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-lg overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d]">
        <div className="flex items-center gap-2">
          <Link2 size={14} className="text-[#00D4FF]" />
          <span className="text-[11px] font-bold text-slate-200 tracking-wide">Assembly Mates</span>
          <span className="text-[8px] text-slate-600 bg-[#0d1117] rounded-full px-1.5 py-0.5 font-mono">{mates.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowMateIndicators(!showMateIndicators)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#21262d]"
            title={showMateIndicators ? "Hide mate indicators" : "Show mate indicators"}
          >
            {showMateIndicators ? <Eye size={10} className="text-slate-500" /> : <EyeOff size={10} className="text-slate-600" />}
          </button>
          <button
            onClick={() => solve()}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#21262d]"
            title="Re-solve mates"
          >
            <Play size={10} className="text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Picking Mode Banner */}
      {pickingMode && (
        <div className="px-3 py-2 bg-[#00D4FF]/10 border-b border-[#00D4FF]/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crosshair size={12} className="text-[#00D4FF] animate-pulse" />
              <span className="text-[10px] text-[#00D4FF] font-semibold">
                {!pickedFace1 ? "Select first face/edge" : !pickedFace2 ? "Select second face/edge" : "Ready to confirm"}
              </span>
            </div>
            <button
              onClick={cancelPicking}
              className="text-[9px] text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-red-500/10"
            >
              Cancel
            </button>
          </div>

          {/* Picked entities summary */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className={`text-[9px] px-2 py-0.5 rounded border ${
              pickedFace1 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-[#30363d] text-slate-500"
            }`}>
              Face 1: {pickedFace1 ? `Part ${pickedFace1.partId}` : "—"}
            </div>
            <span className="text-slate-600 text-[8px]">→</span>
            <div className={`text-[9px] px-2 py-0.5 rounded border ${
              pickedFace2 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-[#30363d] text-slate-500"
            }`}>
              Face 2: {pickedFace2 ? `Part ${pickedFace2.partId}` : "—"}
            </div>
          </div>

          {/* Value input for distance/angle mates */}
          {MATE_TYPES.find((t) => t.type === pendingMateType)?.hasValue && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[9px] text-slate-400">
                {pendingMateType === "distance" ? "Distance:" : pendingMateType === "angle" ? "Angle:" : "Value:"}
              </span>
              <input
                type="number"
                value={pendingMateValue}
                onChange={(e) => setPendingMateValue(parseFloat(e.target.value) || 0)}
                className="w-16 text-[10px] bg-[#0d1117] border border-[#30363d] rounded px-1.5 py-0.5 text-white focus:border-[#00D4FF]/50 focus:outline-none"
                step={pendingMateType === "angle" ? 1 : 0.1}
              />
              <span className="text-[8px] text-slate-500">
                {pendingMateType === "angle" ? "deg" : "mm"}
              </span>
            </div>
          )}

          {/* Confirm button */}
          {pickedFace1 && pickedFace2 && (
            <button
              onClick={handleConfirm}
              className="mt-2 w-full text-[10px] font-semibold bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 rounded-md py-1 hover:bg-[#00D4FF]/30 transition-all"
            >
              Confirm Mate
            </button>
          )}
        </div>
      )}

      {/* Mate Type Selector */}
      <div className="border-b border-[#21262d]">
        <button
          onClick={() => setTypeExpanded(!typeExpanded)}
          className="w-full flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:bg-[#21262d]/60 transition-all"
        >
          <span className="transition-transform" style={{ transform: typeExpanded ? "rotate(90deg)" : "rotate(0)" }}>
            <ChevronRight size={10} className="text-slate-600" />
          </span>
          <Plus size={10} className="text-emerald-400" />
          <span className="text-[10px] font-semibold">Add Mate</span>
        </button>
        {typeExpanded && (
          <div className="grid grid-cols-2 gap-0.5 px-2 pb-2">
            {MATE_TYPES.map((mt) => (
              <button
                key={mt.type}
                onClick={() => handleAddMate(mt.type)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] transition-all ${
                  pickingMode && pendingMateType === mt.type
                    ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                    : "text-slate-400 hover:bg-[#21262d] hover:text-slate-300 border border-transparent"
                }`}
                title={mt.description}
              >
                <span className={pickingMode && pendingMateType === mt.type ? "text-[#00D4FF]" : "text-slate-500"}>
                  {mt.icon}
                </span>
                {mt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mate List */}
      <div>
        <button
          onClick={() => setMatesExpanded(!matesExpanded)}
          className="w-full flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:bg-[#21262d]/60 transition-all"
        >
          <span className="transition-transform" style={{ transform: matesExpanded ? "rotate(90deg)" : "rotate(0)" }}>
            <ChevronRight size={10} className="text-slate-600" />
          </span>
          <Settings size={10} className="text-slate-500" />
          <span className="text-[10px] font-semibold">Active Mates</span>
          <span className="ml-auto text-[8px] text-slate-600 bg-[#0d1117] rounded-full px-1.5 py-0.5 font-mono">{mates.length}</span>
        </button>
        {matesExpanded && (
          <div className="px-1.5 pb-1.5 space-y-px max-h-[300px] overflow-y-auto thin-scrollbar">
            {mates.length === 0 && (
              <div className="text-[10px] text-slate-600 italic px-2 py-3 text-center">
                No mates defined. Click &quot;Add Mate&quot; above.
              </div>
            )}
            {mates.map((mate) => {
              const status = getMateStatus(mate.id);
              const info = MATE_TYPES.find((t) => t.type === mate.type);
              const isSelected = selectedMateId === mate.id;
              return (
                <div
                  key={mate.id}
                  onClick={() => selectMate(isSelected ? null : mate.id)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer group transition-all ${
                    isSelected
                      ? "bg-[#00D4FF]/10 text-[#00D4FF] shadow-[inset_0_0_0_1px_rgba(0,212,255,0.15)]"
                      : "text-slate-400 hover:bg-[#21262d]/50 hover:text-slate-300"
                  }`}
                >
                  {/* Status icon */}
                  <span className="shrink-0">{statusIcons[status]}</span>

                  {/* Type icon */}
                  <span className={`shrink-0 ${isSelected ? "text-[#00D4FF]" : "text-slate-500"}`}>
                    {info?.icon}
                  </span>

                  {/* Label */}
                  <span className="flex-1 text-[10px] truncate font-medium">
                    {info?.label ?? mate.type}
                    {mate.value !== undefined && info?.hasValue && (
                      <span className="text-[8px] text-slate-500 ml-1 font-mono">
                        {mate.value}{mate.type === "angle" ? "°" : "mm"}
                      </span>
                    )}
                  </span>

                  {/* Part IDs */}
                  <span className="text-[7px] text-slate-600 shrink-0 font-mono">
                    {mate.face1.partId.slice(0, 4)}↔{mate.face2.partId.slice(0, 4)}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        mate.suppressed ? unsuppressMate(mate.id) : suppressMate(mate.id);
                      }}
                      className="w-4 h-4 flex items-center justify-center rounded hover:bg-[#21262d]"
                      title={mate.suppressed ? "Unsuppress" : "Suppress"}
                    >
                      {mate.suppressed ? <Play size={8} className="text-emerald-400" /> : <Pause size={8} className="text-slate-500" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMate(mate.id);
                      }}
                      className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/10"
                      title="Delete mate"
                    >
                      <Trash2 size={8} className="text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Mate Detail */}
      {selectedMate && (
        <div className="border-t border-[#21262d] px-3 py-2 space-y-1.5">
          <div className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold">Mate Details</div>
          <div className="grid grid-cols-2 gap-1">
            <div className="text-[9px] text-slate-500">Type</div>
            <div className="text-[9px] text-slate-300 font-medium">{selectedMateInfo?.label}</div>
            <div className="text-[9px] text-slate-500">Part 1</div>
            <div className="text-[9px] text-slate-300 font-mono">{selectedMate.face1.partId}</div>
            <div className="text-[9px] text-slate-500">Part 2</div>
            <div className="text-[9px] text-slate-300 font-mono">{selectedMate.face2.partId}</div>
            {selectedMateInfo?.hasValue && (
              <>
                <div className="text-[9px] text-slate-500">Value</div>
                <div className="text-[9px] text-[#00D4FF] font-mono">
                  {selectedMate.value}{selectedMate.type === "angle" ? "°" : "mm"}
                </div>
              </>
            )}
            <div className="text-[9px] text-slate-500">Status</div>
            <div className={`text-[9px] font-medium ${statusColors[getMateStatus(selectedMate.id)]}`}>
              {getMateStatus(selectedMate.id)}
            </div>
          </div>
        </div>
      )}

      {/* Solver Status */}
      {lastSolveResult && (
        <div className="border-t border-[#21262d] px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${lastSolveResult.success ? "bg-emerald-400" : "bg-amber-400"}`} />
            <span className="text-[9px] text-slate-400">
              {lastSolveResult.success ? "Solved" : "Not converged"}
            </span>
          </div>
          <span className="text-[8px] text-slate-600 font-mono">
            {lastSolveResult.iterations} iter · res={lastSolveResult.maxResidual.toExponential(2)}
          </span>
        </div>
      )}
    </div>
  );
}
