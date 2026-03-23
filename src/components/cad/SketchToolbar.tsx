"use client";
import { useState, useCallback } from "react";
import { useCadStore, type ToolId } from "@/stores/cad-store";
import {
  Pencil, Spline, Circle, Square, Pentagon,
  Minus, Scissors, FlipHorizontal, ArrowRight,
  RulerIcon, Construction, Ellipsis, MousePointer2, X,
} from "lucide-react";

export type SketchEntity =
  | "line"
  | "arc"
  | "circle"
  | "rectangle"
  | "polygon"
  | "spline"
  | "ellipse"
  | "construction_line";

export type SketchOperation =
  | "trim"
  | "extend"
  | "offset"
  | "mirror_sketch"
  | "dimension";

interface SketchToolbarProps {
  visible: boolean;
  onSelectPlane?: (plane: "xy" | "xz" | "yz" | "face") => void;
}

const sketchEntities: {
  id: SketchEntity;
  icon: React.ReactNode;
  label: string;
  toolId: ToolId;
  shortcut?: string;
}[] = [
  { id: "line", icon: <Pencil size={14} />, label: "Line", toolId: "line", shortcut: "L" },
  { id: "arc", icon: <Spline size={14} />, label: "Arc", toolId: "arc", shortcut: "A" },
  { id: "circle", icon: <Circle size={14} />, label: "Circle", toolId: "circle", shortcut: "C" },
  { id: "rectangle", icon: <Square size={14} />, label: "Rect", toolId: "rectangle", shortcut: "R" },
  { id: "polygon", icon: <Pentagon size={14} />, label: "Polygon", toolId: "polygon" },
  { id: "spline", icon: <Spline size={14} />, label: "Spline", toolId: "spline" },
  { id: "ellipse", icon: <Ellipsis size={14} />, label: "Ellipse", toolId: "circle" },
  { id: "construction_line", icon: <Construction size={14} />, label: "Constr.", toolId: "line" },
];

const sketchOperations: {
  id: SketchOperation;
  icon: React.ReactNode;
  label: string;
}[] = [
  { id: "trim", icon: <Scissors size={14} />, label: "Trim" },
  { id: "extend", icon: <ArrowRight size={14} />, label: "Extend" },
  { id: "offset", icon: <Minus size={14} />, label: "Offset" },
  { id: "mirror_sketch", icon: <FlipHorizontal size={14} />, label: "Mirror" },
  { id: "dimension", icon: <RulerIcon size={14} />, label: "Dimension" },
];

export default function SketchToolbar({ visible, onSelectPlane }: SketchToolbarProps) {
  const activeTool = useCadStore((s) => s.activeTool);
  const setActiveTool = useCadStore((s) => s.setActiveTool);
  const isConstructionMode = useCadStore((s) => s.isConstructionMode);
  const setIsConstructionMode = useCadStore((s) => s.setIsConstructionMode);

  const [activeOp, setActiveOp] = useState<SketchOperation | null>(null);
  const [sketchPlane, setSketchPlane] = useState<"xy" | "xz" | "yz" | "face">("xz");
  const [autoConstraints, setAutoConstraints] = useState(true);
  const [showPlaneSelector, setShowPlaneSelector] = useState(false);

  const handleEntityClick = useCallback(
    (entity: typeof sketchEntities[0]) => {
      setActiveTool(entity.toolId);
      setActiveOp(null);
    },
    [setActiveTool]
  );

  const handleOpClick = useCallback(
    (op: SketchOperation) => {
      setActiveOp(activeOp === op ? null : op);
    },
    [activeOp]
  );

  const handlePlaneChange = useCallback(
    (plane: "xy" | "xz" | "yz" | "face") => {
      setSketchPlane(plane);
      setShowPlaneSelector(false);
      onSelectPlane?.(plane);
    },
    [onSelectPlane]
  );

  const sketchTools: ToolId[] = ["line", "arc", "circle", "rectangle", "polygon", "spline"];
  const isInSketchMode = sketchTools.includes(activeTool);

  if (!visible && !isInSketchMode) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-auto animate-scale-in">
      <div className="bg-[#161b22]/97 border border-[#30363d] rounded-xl backdrop-blur-md shadow-2xl shadow-black/40">
        {/* Sketch plane selector */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[#21262d]">
          <span className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold mr-1">Plane</span>
          <div className="relative">
            <button
              onClick={() => setShowPlaneSelector(!showPlaneSelector)}
              className="text-[10px] text-[#00D4FF] bg-[#00D4FF]/10 border border-[#00D4FF]/25 rounded-md px-2.5 py-0.5 hover:bg-[#00D4FF]/20 hover:border-[#00D4FF]/40 transition-all duration-150 font-semibold"
            >
              {sketchPlane === "face" ? "Face" : sketchPlane.toUpperCase()}
            </button>
            {showPlaneSelector && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPlaneSelector(false)} />
                <div className="absolute top-full left-0 mt-1.5 bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl shadow-black/50 py-1 z-50 min-w-[120px] animate-scale-in">
                  {(["xy", "xz", "yz", "face"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePlaneChange(p)}
                      className={`w-full px-3 py-1.5 text-[10px] text-left hover:bg-[#21262d] transition-all duration-150 ${
                        sketchPlane === p ? "text-[#00D4FF] bg-[#00D4FF]/5" : "text-slate-400"
                      }`}
                    >
                      {p === "face" ? "Select Face" : `${p.toUpperCase()} Plane`}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="w-px h-4 bg-[#21262d] mx-1" />

          {/* Auto-constraints toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer group">
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all duration-150 ${
              autoConstraints
                ? "bg-[#00D4FF]/20 border-[#00D4FF]/50"
                : "border-[#30363d] group-hover:border-[#484f58]"
            }`}>
              {autoConstraints && <span className="text-[#00D4FF] text-[8px] font-bold">&#10003;</span>}
            </div>
            <input
              type="checkbox"
              checked={autoConstraints}
              onChange={(e) => setAutoConstraints(e.target.checked)}
              className="sr-only"
            />
            <span className="text-[9px] text-slate-400 group-hover:text-slate-300 transition-colors">Auto-Constrain</span>
          </label>

          <div className="w-px h-4 bg-[#21262d] mx-1" />

          {/* Exit sketch */}
          <button
            onClick={() => setActiveTool("select")}
            className="text-[10px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-all duration-150 px-1.5 py-0.5 rounded-md hover:bg-red-500/10"
          >
            <X size={10} /> Exit
          </button>
        </div>

        {/* Tool buttons */}
        <div className="flex items-center px-1.5 py-1.5 gap-0.5">
          {/* Select */}
          <button
            onClick={() => setActiveTool("select")}
            className={`flex flex-col items-center justify-center w-[40px] h-[42px] rounded-lg transition-all duration-150 ${
              activeTool === "select"
                ? "bg-[#00D4FF]/15 text-[#00D4FF] shadow-glow-sm"
                : "hover:bg-[#21262d] text-slate-400 hover:text-white"
            }`}
            title="Select (Esc)"
          >
            <MousePointer2 size={15} />
            <span className="text-[7px] mt-0.5 font-medium">Select</span>
          </button>

          <div className="w-px h-8 bg-[#21262d] mx-0.5" />

          {/* Sketch entities */}
          {sketchEntities.map((entity) => (
            <button
              key={entity.id}
              onClick={() => handleEntityClick(entity)}
              className={`group flex flex-col items-center justify-center w-[40px] h-[42px] rounded-lg transition-all duration-150 ${
                activeTool === entity.toolId
                  ? "bg-[#00D4FF]/15 text-[#00D4FF] shadow-glow-sm"
                  : "hover:bg-[#21262d] text-slate-400 hover:text-white"
              }`}
              title={entity.shortcut ? `${entity.label} (${entity.shortcut})` : entity.label}
            >
              {entity.icon}
              <span className="text-[7px] mt-0.5 font-medium">{entity.label}</span>
              {entity.shortcut && (
                <span className="absolute -top-0.5 -right-0.5 text-[7px] text-slate-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity bg-[#0d1117] rounded px-0.5">{entity.shortcut}</span>
              )}
            </button>
          ))}

          <div className="w-px h-8 bg-[#21262d] mx-0.5" />

          {/* Construction mode toggle */}
          <button
            onClick={() => setIsConstructionMode(!isConstructionMode)}
            className={`flex flex-col items-center justify-center w-[40px] h-[42px] rounded-lg transition-all duration-150 ${
              isConstructionMode
                ? "bg-cyan-500/15 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.12)]"
                : "hover:bg-[#21262d] text-slate-400 hover:text-white"
            }`}
            title="Construction Mode (toggle between geometry/construction)"
          >
            <Construction size={15} />
            <span className="text-[7px] mt-0.5 font-medium">Constr.</span>
          </button>

          <div className="w-px h-8 bg-[#21262d] mx-0.5" />

          {/* Sketch operations */}
          {sketchOperations.map((op) => (
            <button
              key={op.id}
              onClick={() => handleOpClick(op.id)}
              className={`flex flex-col items-center justify-center w-[40px] h-[42px] rounded-lg transition-all duration-150 ${
                activeOp === op.id
                  ? "bg-orange-500/15 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.12)]"
                  : "hover:bg-[#21262d] text-slate-400 hover:text-white"
              }`}
              title={op.label}
            >
              {op.icon}
              <span className="text-[7px] mt-0.5 font-medium">{op.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
