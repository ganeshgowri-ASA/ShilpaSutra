"use client";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
  Target, Anchor, Ruler, TriangleRight, Diameter,
  CircleDot, Milestone, AlertTriangle, Filter,
  Lightbulb, Check, X, Pencil,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants & metadata
// ---------------------------------------------------------------------------

const ALL_CONSTRAINT_TYPES: ConstraintType[] = [
  "coincident", "parallel", "perpendicular", "tangent", "equal",
  "fix", "horizontal", "vertical", "concentric", "symmetric",
  "distance", "angle", "radius", "diameter", "midpoint",
];

const DIMENSIONAL_TYPES = new Set<ConstraintType>([
  "distance", "angle", "radius", "diameter",
]);

const GEOMETRIC_TYPES = new Set<ConstraintType>([
  "coincident", "parallel", "perpendicular", "tangent", "equal",
  "fix", "horizontal", "vertical", "concentric", "symmetric", "midpoint",
]);

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
  distance: <Ruler size={12} />,
  angle: <TriangleRight size={12} />,
  radius: <CircleDot size={12} />,
  diameter: <Diameter size={12} />,
  midpoint: <Milestone size={12} />,
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
  distance: "Distance",
  angle: "Angle",
  radius: "Radius",
  diameter: "Diameter",
  midpoint: "Midpoint",
};

const constraintDescriptions: Record<ConstraintType, string> = {
  coincident: "Force two points to share the same position",
  parallel: "Make two lines or edges parallel to each other",
  perpendicular: "Make two lines meet at a 90-degree angle",
  tangent: "Make a curve tangent to a line or another curve",
  equal: "Force two segments to have the same length",
  fix: "Lock an entity in place so it cannot move",
  horizontal: "Constrain a line or two points to be horizontal",
  vertical: "Constrain a line or two points to be vertical",
  concentric: "Make two circles or arcs share a center point",
  symmetric: "Mirror entities across an axis of symmetry",
  distance: "Set a specific distance between two entities",
  angle: "Set a specific angle between two lines or edges",
  radius: "Set the radius of a circle or arc",
  diameter: "Set the diameter of a circle or arc",
  midpoint: "Constrain a point to the midpoint of a segment",
};

const dimensionalUnits: Record<string, string> = {
  distance: "mm",
  angle: "deg",
  radius: "mm",
  diameter: "mm",
};

const statusColors = {
  under: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/40",
    label: "Under-constrained",
    dot: "bg-blue-400",
  },
  fully: {
    bg: "bg-green-500/20",
    text: "text-green-400",
    border: "border-green-500/40",
    label: "Fully constrained",
    dot: "bg-green-400",
  },
  over: {
    bg: "bg-red-500/20",
    text: "text-red-400",
    border: "border-red-500/40",
    label: "Over-constrained",
    dot: "bg-red-400",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isDimensional(type: ConstraintType): boolean {
  return DIMENSIONAL_TYPES.has(type);
}

function getMinEntities(type: ConstraintType): number {
  switch (type) {
    case "fix":
    case "horizontal":
    case "vertical":
    case "radius":
    case "diameter":
      return 1;
    default:
      return 2;
  }
}

/** Detect conflicting constraints: same entities + same type, or contradictory type pairs. */
function detectConflicts(constraints: GeometricConstraint[]): Set<string> {
  const conflicting = new Set<string>();
  const contradictoryPairs: [ConstraintType, ConstraintType][] = [
    ["horizontal", "vertical"],
    ["parallel", "perpendicular"],
    ["radius", "diameter"],
  ];

  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {
      const a = constraints[i];
      const b = constraints[j];
      const aKey = [...a.entityIds].sort().join(",");
      const bKey = [...b.entityIds].sort().join(",");

      if (aKey !== bKey) continue;

      // Same type on the same entities is always a conflict
      if (a.type === b.type) {
        conflicting.add(a.id);
        conflicting.add(b.id);
        continue;
      }

      // Contradictory type pairs on same entities
      for (const [t1, t2] of contradictoryPairs) {
        if (
          (a.type === t1 && b.type === t2) ||
          (a.type === t2 && b.type === t1)
        ) {
          conflicting.add(a.id);
          conflicting.add(b.id);
        }
      }
    }
  }
  return conflicting;
}

interface SuggestedConstraint {
  type: ConstraintType;
  entityIds: string[];
  label: string;
  targetValue?: number;
  reason: string;
}

/** Derive auto-suggestions from the currently selected entities. */
function inferSuggestions(selectedIds: string[]): SuggestedConstraint[] {
  if (selectedIds.length === 0) return [];

  const suggestions: SuggestedConstraint[] = [];

  if (selectedIds.length === 1) {
    suggestions.push({
      type: "fix",
      entityIds: [...selectedIds],
      label: "Fix position",
      reason: "Lock the selected entity in place",
    });
    suggestions.push({
      type: "horizontal",
      entityIds: [...selectedIds],
      label: "Make horizontal",
      reason: "Align to horizontal axis",
    });
    suggestions.push({
      type: "vertical",
      entityIds: [...selectedIds],
      label: "Make vertical",
      reason: "Align to vertical axis",
    });
    suggestions.push({
      type: "radius",
      entityIds: [...selectedIds],
      label: "Set radius",
      targetValue: 5,
      reason: "Define radius for arc or circle",
    });
    suggestions.push({
      type: "diameter",
      entityIds: [...selectedIds],
      label: "Set diameter",
      targetValue: 10,
      reason: "Define diameter for arc or circle",
    });
  }

  if (selectedIds.length === 2) {
    suggestions.push({
      type: "coincident",
      entityIds: [...selectedIds],
      label: "Make coincident",
      reason: "Merge the two selected points",
    });
    suggestions.push({
      type: "parallel",
      entityIds: [...selectedIds],
      label: "Make parallel",
      reason: "Align edges in the same direction",
    });
    suggestions.push({
      type: "perpendicular",
      entityIds: [...selectedIds],
      label: "Make perpendicular",
      reason: "Set edges at a 90-degree angle",
    });
    suggestions.push({
      type: "equal",
      entityIds: [...selectedIds],
      label: "Make equal",
      reason: "Force both segments to equal length",
    });
    suggestions.push({
      type: "distance",
      entityIds: [...selectedIds],
      label: "Set distance",
      targetValue: 10,
      reason: "Define the spacing between entities",
    });
    suggestions.push({
      type: "angle",
      entityIds: [...selectedIds],
      label: "Set angle",
      targetValue: 45,
      reason: "Define the angle between edges",
    });
    suggestions.push({
      type: "midpoint",
      entityIds: [...selectedIds],
      label: "Midpoint",
      reason: "Pin a point to the segment midpoint",
    });
  }

  if (selectedIds.length >= 3) {
    suggestions.push({
      type: "symmetric",
      entityIds: [...selectedIds],
      label: "Symmetric",
      reason: "Mirror entities about a reference axis",
    });
  }

  return suggestions;
}

// ---------------------------------------------------------------------------
// Inline value editor sub-component
// ---------------------------------------------------------------------------

function ValueEditor({
  constraint,
  onSave,
}: {
  constraint: GeometricConstraint;
  onSave: (id: string, value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(
    String(constraint.targetValue ?? constraint.value ?? 0)
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const unit = dimensionalUnits[constraint.type] ?? "";

  // Sync draft when constraint value changes externally
  useEffect(() => {
    if (!editing) {
      setDraft(String(constraint.targetValue ?? constraint.value ?? 0));
    }
  }, [constraint.targetValue, constraint.value, editing]);

  // Auto-focus and select on edit start
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed) && parsed >= 0) {
      onSave(constraint.id, parsed);
    }
    setEditing(false);
  }, [draft, constraint.id, onSave]);

  const cancel = useCallback(() => {
    setDraft(String(constraint.targetValue ?? constraint.value ?? 0));
    setEditing(false);
  }, [constraint.targetValue, constraint.value]);

  if (!editing) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        className="flex items-center gap-0.5 text-[9px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-1 rounded transition-colors"
        title={`Edit ${constraintLabels[constraint.type]} value`}
      >
        <span>
          {constraint.targetValue ?? constraint.value ?? "—"}
          {unit && (
            <span className="text-cyan-600 ml-0.5">{unit}</span>
          )}
        </span>
        <Pencil size={7} />
      </button>
    );
  }

  return (
    <div
      className="flex items-center gap-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        autoFocus
        type="number"
        step="any"
        min="0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        onBlur={commit}
        className="w-14 text-[9px] bg-[#0d1117] border border-cyan-500/60 rounded px-1 py-0.5 text-cyan-300 outline-none focus:border-cyan-400"
      />
      {unit && (
        <span className="text-[8px] text-cyan-600">{unit}</span>
      )}
      <button
        onClick={commit}
        className="w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-green-900/40"
        title="Confirm"
      >
        <Check size={8} className="text-green-400" />
      </button>
      <button
        onClick={cancel}
        className="w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-red-900/40"
        title="Cancel"
      >
        <X size={8} className="text-red-400" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Constraint row sub-component
// ---------------------------------------------------------------------------

function ConstraintRow({
  constraint,
  isSelected,
  isConflicting,
  onSelect,
  onRemove,
  onToggleLock,
  onValueSave,
}: {
  constraint: GeometricConstraint;
  isSelected: boolean;
  isConflicting: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleLock: (id: string) => void;
  onValueSave: (id: string, value: number) => void;
}) {
  const dimensional = isDimensional(constraint.type);

  return (
    <div
      onClick={() => onSelect(constraint.id)}
      className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer group transition-colors ${
        isSelected
          ? "bg-orange-500/15 border border-orange-500/30"
          : isConflicting
          ? "bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/10"
          : "border border-transparent text-slate-400 hover:bg-[#0f3460]/40"
      }`}
      title={constraintDescriptions[constraint.type]}
    >
      {/* Constraint icon */}
      <span
        className={`shrink-0 ${
          isConflicting
            ? "text-amber-400"
            : constraint.satisfied
            ? "text-green-400"
            : "text-orange-400"
        }`}
      >
        {constraintIcons[constraint.type]}
      </span>

      {/* Label and entity count */}
      <div className="flex-1 min-w-0">
        <span
          className={`text-[10px] truncate block ${
            isSelected ? "text-orange-300" : "text-slate-300"
          }`}
        >
          {constraintLabels[constraint.type]}
          <span className="text-slate-600 ml-1">
            ({constraint.entityIds.length}
            {constraint.entityIds.length === 1 ? " entity" : " entities"})
          </span>
        </span>
      </div>

      {/* Conflict warning indicator */}
      {isConflicting && (
        <span
          className="shrink-0"
          title="Potential conflict: duplicate or contradictory constraint detected on the same entities"
        >
          <AlertTriangle size={10} className="text-amber-400 animate-pulse" />
        </span>
      )}

      {/* Satisfaction indicator dot */}
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          constraint.satisfied ? "bg-green-400" : "bg-slate-600"
        }`}
        title={constraint.satisfied ? "Satisfied" : "Unsatisfied"}
      />

      {/* Dimensional value editor */}
      {dimensional && (
        <ValueEditor constraint={constraint} onSave={onValueSave} />
      )}

      {/* Lock toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleLock(constraint.id);
        }}
        className={`w-4 h-4 flex items-center justify-center rounded shrink-0 transition-opacity ${
          constraint.locked
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100"
        } hover:bg-[#0f3460]`}
        title={constraint.locked ? "Unlock constraint" : "Lock constraint"}
      >
        {constraint.locked ? (
          <Lock size={8} className="text-red-400" />
        ) : (
          <Unlock size={8} className="text-slate-600" />
        )}
      </button>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(constraint.id);
        }}
        className="w-4 h-4 flex items-center justify-center rounded shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/30"
        title="Remove constraint"
      >
        <Trash2 size={8} className="text-red-400" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ConstraintManager() {
  // Store selectors
  const constraints = useConstraintStore((s) => s.constraints);
  const constraintStatus = useConstraintStore((s) => s.constraintStatus);
  const showConstraints = useConstraintStore((s) => s.showConstraints);
  const setShowConstraints = useConstraintStore((s) => s.setShowConstraints);
  const removeConstraint = useConstraintStore((s) => s.removeConstraint);
  const toggleConstraintLock = useConstraintStore((s) => s.toggleConstraintLock);
  const selectConstraint = useConstraintStore((s) => s.selectConstraint);
  const selectedConstraintId = useConstraintStore((s) => s.selectedConstraintId);
  const addConstraint = useConstraintStore((s) => s.addConstraint);
  const updateConstraint = useConstraintStore((s) => s.updateConstraint);
  const clearConstraints = useConstraintStore((s) => s.clearConstraints);
  const selectedIds = useCadStore((s) => s.selectedIds);
  const selectedId = useCadStore((s) => s.selectedId);

  // Local UI state
  const [expanded, setExpanded] = useState(true);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [filterType, setFilterType] = useState<ConstraintType | "all">("all");
  const [filterCategory, setFilterCategory] = useState<"all" | "geometric" | "dimensional">("all");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  // Reset delete-all confirmation after a timeout
  useEffect(() => {
    if (!confirmDeleteAll) return;
    const timer = setTimeout(() => setConfirmDeleteAll(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmDeleteAll]);

  // Derived data
  const statusStyle = statusColors[constraintStatus];
  const conflictingIds = useMemo(() => detectConflicts(constraints), [constraints]);

  const entitySelection = useMemo(
    () =>
      selectedIds.length > 0
        ? selectedIds
        : selectedId
        ? [selectedId]
        : [],
    [selectedIds, selectedId],
  );

  const suggestions = useMemo(
    () => inferSuggestions(entitySelection),
    [entitySelection],
  );

  const filteredConstraints = useMemo(() => {
    let result = constraints;

    // Category filter
    if (filterCategory === "geometric") {
      result = result.filter((c) => GEOMETRIC_TYPES.has(c.type));
    } else if (filterCategory === "dimensional") {
      result = result.filter((c) => DIMENSIONAL_TYPES.has(c.type));
    }

    // Type filter
    if (filterType !== "all") {
      result = result.filter((c) => c.type === filterType);
    }

    return result;
  }, [constraints, filterType, filterCategory]);

  // Statistics
  const stats = useMemo(() => {
    const satisfied = constraints.filter((c) => c.satisfied).length;
    const locked = constraints.filter((c) => c.locked).length;
    const conflicts = conflictingIds.size;
    return { satisfied, locked, conflicts, total: constraints.length };
  }, [constraints, conflictingIds]);

  // Active types present in the current constraint list
  const activeTypes = useMemo((): ConstraintType[] => {
    const types = new Set<ConstraintType>(constraints.map((c) => c.type));
    return Array.from(types).sort(
      (a: ConstraintType, b: ConstraintType) =>
        ALL_CONSTRAINT_TYPES.indexOf(a) - ALL_CONSTRAINT_TYPES.indexOf(b),
    );
  }, [constraints]);

  // Handlers
  const handleAddConstraint = useCallback(
    (type: ConstraintType) => {
      if (entitySelection.length < getMinEntities(type)) return;
      addConstraint({
        type,
        entityIds: entitySelection,
        ...(isDimensional(type) ? { value: 0, targetValue: 0 } : {}),
      });
      setAddMenuOpen(false);
    },
    [entitySelection, addConstraint],
  );

  const handleApplySuggestion = useCallback(
    (s: SuggestedConstraint) => {
      addConstraint({
        type: s.type,
        entityIds: s.entityIds,
        ...(s.targetValue !== undefined
          ? { value: s.targetValue, targetValue: s.targetValue }
          : {}),
      });
    },
    [addConstraint],
  );

  const handleValueSave = useCallback(
    (id: string, value: number) => {
      updateConstraint(id, { targetValue: value, value });
    },
    [updateConstraint],
  );

  const handleDeleteAll = useCallback(() => {
    if (!confirmDeleteAll) {
      setConfirmDeleteAll(true);
      return;
    }
    clearConstraints();
    setConfirmDeleteAll(false);
    setFilterType("all");
    setFilterCategory("all");
  }, [confirmDeleteAll, clearConstraints]);

  const handleLockAll = useCallback(() => {
    constraints.forEach((c) => {
      if (!c.locked) toggleConstraintLock(c.id);
    });
  }, [constraints, toggleConstraintLock]);

  const handleUnlockAll = useCallback(() => {
    constraints.forEach((c) => {
      if (c.locked) toggleConstraintLock(c.id);
    });
  }, [constraints, toggleConstraintLock]);

  return (
    <div className="border-t border-[#16213e]">
      {/* ── Header ─────────────────────────────────────────────── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#0f3460]/30 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          {expanded ? (
            <ChevronDown size={12} className="text-slate-500" />
          ) : (
            <ChevronRight size={12} className="text-slate-500" />
          )}
          <Link2 size={12} className="text-orange-400" />
          <span className="text-[11px] font-medium text-slate-300">
            Constraints
          </span>
          <span className="text-[10px] text-slate-500">
            ({stats.total})
          </span>
          {stats.conflicts > 0 && (
            <span className="text-[9px] text-amber-400 flex items-center gap-0.5">
              <AlertTriangle size={9} />
              {stats.conflicts}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Status badge */}
          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}
            />
            {statusStyle.label}
          </div>
          {/* Visibility toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowConstraints(!showConstraints);
            }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#0f3460]"
            title={
              showConstraints
                ? "Hide constraint indicators"
                : "Show constraint indicators"
            }
          >
            {showConstraints ? (
              <Eye size={10} className="text-slate-500" />
            ) : (
              <EyeOff size={10} className="text-slate-600" />
            )}
          </button>
        </div>
      </button>

      {expanded && (
        <div className="px-2 pb-2 space-y-1">
          {/* ── Statistics bar ──────────────────────────────────── */}
          {constraints.length > 0 && (
            <div className="flex items-center gap-2 px-2 py-1 bg-[#0d1117] rounded border border-[#16213e] text-[8px]">
              <span className="text-green-400">
                {stats.satisfied}/{stats.total} satisfied
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-slate-500">
                {stats.locked} locked
              </span>
              {stats.conflicts > 0 && (
                <>
                  <span className="text-slate-700">|</span>
                  <span className="text-amber-400">
                    {stats.conflicts} conflicts
                  </span>
                </>
              )}
            </div>
          )}

          {/* ── Batch operations ──────────────────────────────── */}
          {constraints.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDeleteAll}
                className={`flex-1 text-[9px] rounded px-1.5 py-0.5 transition-colors border ${
                  confirmDeleteAll
                    ? "text-white bg-red-600/40 border-red-500/60 animate-pulse"
                    : "text-red-400 hover:text-red-300 bg-[#0d1117] border-[#16213e] hover:border-red-500/40"
                }`}
              >
                {confirmDeleteAll ? "Confirm Delete All?" : "Delete All"}
              </button>
              <button
                onClick={handleLockAll}
                className="flex-1 text-[9px] text-slate-400 hover:text-white bg-[#0d1117] border border-[#16213e] hover:border-orange-500/40 rounded px-1.5 py-0.5 transition-colors"
                title="Lock all constraints to prevent solver from modifying them"
              >
                Lock All
              </button>
              <button
                onClick={handleUnlockAll}
                className="flex-1 text-[9px] text-slate-400 hover:text-white bg-[#0d1117] border border-[#16213e] hover:border-green-500/40 rounded px-1.5 py-0.5 transition-colors"
                title="Unlock all constraints so the solver can modify them"
              >
                Unlock All
              </button>
            </div>
          )}

          {/* ── Add constraint button + dropdown ─────────────── */}
          <div className="relative">
            <button
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              disabled={entitySelection.length === 0}
              className={`w-full text-[10px] bg-[#0d1117] border border-[#16213e] rounded px-2 py-1 transition-colors ${
                entitySelection.length === 0
                  ? "text-slate-600 cursor-not-allowed"
                  : "text-slate-400 hover:text-white hover:border-[#00D4FF]/40"
              }`}
            >
              + Add Constraint
              {entitySelection.length === 0 && (
                <span className="text-[8px] text-slate-700 ml-1">
                  (select entities first)
                </span>
              )}
            </button>
            {addMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setAddMenuOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-[#16213e] rounded-lg shadow-xl z-50 max-h-[280px] overflow-y-auto">
                  {/* Geometric constraints section */}
                  <div className="px-2 pt-1.5 pb-0.5 text-[8px] text-slate-600 uppercase tracking-wider">
                    Geometric
                  </div>
                  {ALL_CONSTRAINT_TYPES.filter((t) => GEOMETRIC_TYPES.has(t)).map(
                    (type) => {
                      const minEntities = getMinEntities(type);
                      const canApply = entitySelection.length >= minEntities;
                      return (
                        <button
                          key={type}
                          onClick={() => handleAddConstraint(type)}
                          disabled={!canApply}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-[10px] transition-colors ${
                            canApply
                              ? "text-slate-300 hover:bg-[#0f3460]"
                              : "text-slate-600 cursor-not-allowed"
                          }`}
                          title={constraintDescriptions[type]}
                        >
                          <span className="text-orange-400">
                            {constraintIcons[type]}
                          </span>
                          {constraintLabels[type]}
                          {!canApply && (
                            <span className="ml-auto text-[8px] text-slate-700">
                              {minEntities}+ entities
                            </span>
                          )}
                        </button>
                      );
                    },
                  )}
                  {/* Dimensional constraints section */}
                  <div className="px-2 pt-2 pb-0.5 text-[8px] text-slate-600 uppercase tracking-wider border-t border-[#16213e] mt-1">
                    Dimensional
                  </div>
                  {ALL_CONSTRAINT_TYPES.filter((t) => DIMENSIONAL_TYPES.has(t)).map(
                    (type) => {
                      const minEntities = getMinEntities(type);
                      const canApply = entitySelection.length >= minEntities;
                      return (
                        <button
                          key={type}
                          onClick={() => handleAddConstraint(type)}
                          disabled={!canApply}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-[10px] transition-colors ${
                            canApply
                              ? "text-slate-300 hover:bg-[#0f3460]"
                              : "text-slate-600 cursor-not-allowed"
                          }`}
                          title={constraintDescriptions[type]}
                        >
                          <span className="text-orange-400">
                            {constraintIcons[type]}
                          </span>
                          {constraintLabels[type]}
                          <span className="ml-auto text-[8px] text-cyan-500/60">
                            {dimensionalUnits[type]}
                          </span>
                          {!canApply && (
                            <span className="text-[8px] text-slate-700 ml-1">
                              {minEntities}+ entities
                            </span>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── Filter by type ───────────────────────────────── */}
          {constraints.length > 0 && (
            <div className="flex items-center gap-1">
              <Filter size={10} className="text-slate-600 shrink-0" />
              {/* Category filter */}
              <select
                value={filterCategory}
                onChange={(e) =>
                  setFilterCategory(
                    e.target.value as "all" | "geometric" | "dimensional",
                  )
                }
                className="text-[9px] bg-[#0d1117] border border-[#16213e] rounded px-1 py-0.5 text-slate-400 outline-none focus:border-[#00D4FF]/40 appearance-none cursor-pointer"
              >
                <option value="all">All</option>
                <option value="geometric">Geometric</option>
                <option value="dimensional">Dimensional</option>
              </select>
              {/* Type filter */}
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as ConstraintType | "all")
                }
                className="flex-1 text-[9px] bg-[#0d1117] border border-[#16213e] rounded px-1.5 py-0.5 text-slate-400 outline-none focus:border-[#00D4FF]/40 appearance-none cursor-pointer"
              >
                <option value="all">All types</option>
                {activeTypes.map((t) => (
                  <option key={t} value={t}>
                    {constraintLabels[t]} (
                    {constraints.filter((c) => c.type === t).length})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ── Auto-suggest section ─────────────────────────── */}
          {suggestions.length > 0 && (
            <div>
              <button
                onClick={() => setSuggestionsOpen(!suggestionsOpen)}
                className="w-full flex items-center gap-1 text-[9px] text-yellow-500/80 hover:text-yellow-400 transition-colors px-1 py-0.5"
              >
                <Lightbulb size={10} />
                <span>
                  Suggestions ({suggestions.length})
                </span>
                {suggestionsOpen ? (
                  <ChevronDown size={9} />
                ) : (
                  <ChevronRight size={9} />
                )}
              </button>
              {suggestionsOpen && (
                <div className="space-y-0.5 ml-2 mt-0.5 max-h-[120px] overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <div
                      key={`${s.type}-${i}`}
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-500/5 border border-yellow-500/10 text-[9px] text-slate-400"
                      title={s.reason}
                    >
                      <span className="text-orange-400">
                        {constraintIcons[s.type]}
                      </span>
                      <span className="flex-1 truncate">{s.label}</span>
                      {s.targetValue !== undefined && (
                        <span className="text-cyan-400 text-[8px]">
                          ={s.targetValue}
                          {dimensionalUnits[s.type] && (
                            <span className="text-cyan-600">
                              {dimensionalUnits[s.type]}
                            </span>
                          )}
                        </span>
                      )}
                      <button
                        onClick={() => handleApplySuggestion(s)}
                        className="text-[8px] text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 px-1.5 py-0.5 rounded transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Constraint list ───────────────────────────────── */}
          {filteredConstraints.length === 0 ? (
            <div className="text-[10px] text-slate-600 text-center py-3">
              {constraints.length === 0
                ? "No constraints defined. Select entities and add constraints."
                : "No constraints match the current filter."}
            </div>
          ) : (
            <div className="space-y-0.5 max-h-[220px] overflow-y-auto">
              {filteredConstraints.map((c) => (
                <ConstraintRow
                  key={c.id}
                  constraint={c}
                  isSelected={selectedConstraintId === c.id}
                  isConflicting={conflictingIds.has(c.id)}
                  onSelect={selectConstraint}
                  onRemove={removeConstraint}
                  onToggleLock={toggleConstraintLock}
                  onValueSave={handleValueSave}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
