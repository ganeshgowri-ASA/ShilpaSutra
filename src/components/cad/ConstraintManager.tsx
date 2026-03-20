"use client";
import { useState } from "react";
import {
  useConstraintStore,
  type ConstraintType,
  type GeometricConstraint,
} from "@/stores/constraint-store";
import { useCadStore } from "@/stores/cad-store";
import {
  Link2, ArrowRight, ArrowDown, Circle, Equal,
  Lock, Unlock, Trash2, Eye, EyeOff, ChevronDown, ChevronRight,
  Minus, RotateCw, Maximize2, FlipHorizontal,
  Target, Anchor,
} from "lucide-react";

const constraintIcons: Record<ConstraintType, React.ReactNode> = {
  coincident: <Target size={12} />,
  parallel: <ArrowRight size={12} />,
  perpendicular: <Maximize2 size={12} />,
  tangent: <RotateCw size={12} />,
  equal: <Equal size={12} />,
  fix: <Anchor size={12} />,
  horizontal: <Minus size={12} />,
  vertical: <ArrowDown size={12} />,
  concentric: <Circle size={12} />,
  symmetric: <FlipHorizontal size={12} />,
};

const constraintLabels: Record<ConstraintType, string> = {
  coincident: "Coincident",
  parallel: "Parallel",
  perpendicular: "Perpendicular",
  tangent: "Tangent",
  equal: "Equal",
  fix: "Fix",
  horizontal: "Horizontal",
  vertical: "Vertical",
  concentric: "Concentric",
  symmetric: "Symmetric",
};

const statusColors = {
  under: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/40", label: "Under-constrained" },
  fully: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/40", label: "Fully constrained" },
  over: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/40", label: "Over-constrained" },
};

export default function ConstraintManager() {
  const constraints = useConstraintStore((s) => s.constraints);
  const constraintStatus = useConstraintStore((s) => s.constraintStatus);
  const showConstraints = useConstraintStore((s) => s.showConstraints);
  const setShowConstraints = useConstraintStore((s) => s.setShowConstraints);
  const removeConstraint = useConstraintStore((s) => s.removeConstraint);
  const toggleConstraintLock = useConstraintStore((s) => s.toggleConstraintLock);
  const selectConstraint = useConstraintStore((s) => s.selectConstraint);
  const selectedConstraintId = useConstraintStore((s) => s.selectedConstraintId);
  const addConstraint = useConstraintStore((s) => s.addConstraint);
  const selectedIds = useCadStore((s) => s.selectedIds);
  const selectedId = useCadStore((s) => s.selectedId);

  const [expanded, setExpanded] = useState(true);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const statusStyle = statusColors[constraintStatus];

  const handleAddConstraint = (type: ConstraintType) => {
    const entities = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    if (entities.length === 0) return;

    addConstraint({
      type,
      entityIds: entities,
    });
    setAddMenuOpen(false);
  };

  return (
    <div className="border-t border-[#16213e]">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#0f3460]/30 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          {expanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
          <Link2 size={12} className="text-orange-400" />
          <span className="text-[11px] font-medium text-slate-300">Constraints</span>
          <span className="text-[10px] text-slate-500">({constraints.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`px-1.5 py-0.5 rounded text-[9px] ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border`}>
            {statusStyle.label}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowConstraints(!showConstraints);
            }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#0f3460]"
          >
            {showConstraints ? <Eye size={10} className="text-slate-500" /> : <EyeOff size={10} className="text-slate-600" />}
          </button>
        </div>
      </button>

      {expanded && (
        <div className="px-2 pb-2">
          {/* Add constraint buttons */}
          <div className="relative mb-1">
            <button
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              className="w-full text-[10px] text-slate-400 hover:text-white bg-[#0d1117] border border-[#16213e] hover:border-[#00D4FF]/40 rounded px-2 py-1 transition-colors"
            >
              + Add Constraint
            </button>
            {addMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAddMenuOpen(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-[#16213e] rounded-lg shadow-xl py-1 z-50 max-h-[200px] overflow-y-auto">
                  {(Object.keys(constraintLabels) as ConstraintType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => handleAddConstraint(type)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-slate-300 hover:bg-[#0f3460] transition-colors"
                    >
                      <span className="text-orange-400">{constraintIcons[type]}</span>
                      {constraintLabels[type]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Constraint list */}
          {constraints.length === 0 ? (
            <div className="text-[10px] text-slate-600 text-center py-2">
              No constraints defined
            </div>
          ) : (
            <div className="space-y-0.5 max-h-[150px] overflow-y-auto">
              {constraints.map((c) => (
                <div
                  key={c.id}
                  onClick={() => selectConstraint(c.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer group transition-colors ${
                    selectedConstraintId === c.id
                      ? "bg-orange-500/15 text-orange-400"
                      : "text-slate-400 hover:bg-[#0f3460]/40"
                  }`}
                >
                  <span className={`shrink-0 ${c.satisfied ? "text-green-400" : "text-orange-400"}`}>
                    {constraintIcons[c.type]}
                  </span>
                  <span className="flex-1 text-[10px] truncate">
                    {constraintLabels[c.type]}
                    <span className="text-slate-600 ml-1">({c.entityIds.length})</span>
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleConstraintLock(c.id);
                      }}
                      className="w-4 h-4 flex items-center justify-center rounded hover:bg-[#0f3460]"
                    >
                      {c.locked ? <Lock size={8} className="text-red-400" /> : <Unlock size={8} className="text-slate-600" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeConstraint(c.id);
                      }}
                      className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-900/30"
                    >
                      <Trash2 size={8} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
