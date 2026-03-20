"use client";
import { useState, useCallback } from "react";
import { useCadStore, type ToolId } from "@/stores/cad-store";
import {
  Pencil, Spline, Circle, Square, Pentagon, Hexagon,
  Minus, RotateCw, Scissors, FlipHorizontal, ArrowRight,
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
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
      <div className="bg-[#1a1a2e]/95 border border-[#16213e] rounded-lg backdrop-blur-sm shadow-xl">
        {/* Sketch plane selector */}
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#16213e]">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider mr-1">Sketch Plane:</span>
          <div className="relative">
            <button
              onClick={() => setShowPlaneSelector(!showPlaneSelector)}
              className="text-[10px] text-[#00D4FF] bg-[#00D4FF]/10 border border-[#00D4FF]/30 rounded px-2 py-0.5 hover:bg-[#00D4FF]/20 transition-colors"
            >
              {sketchPlane === "face" ? "Face" : sketchPlane.toUpperCase()}
            </button>
            {showPlaneSelector && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPlaneSelector(false)} />
                <div className="absolute top-full left-0 mt-1 bg-[#1a1a2e] border border-[#16213e] rounded shadow-xl py-1 z-50">
                  {(["xy", "xz", "yz", "face"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePlaneChange(p)}
                      className={`w-full px-3 py-1 text-[10px] text-left hover:bg-[#0f3460] transition-colors ${
                        sketchPlane === p ? "text-[#00D4FF]" : "text-slate-400"
                      }`}
                    >
                      {p === "face" ? "Select Face" : `${p.toUpperCase()} Plane`}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="w-px h-4 bg-[#16213e] mx-1" />

          {/* Auto-constraints toggle */}
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={autoConstraints}
              onChange={(e) => setAutoConstraints(e.target.checked)}
              className="w-3 h-3 rounded border-[#16213e]"
            />
            <span className="text-[9px] text-slate-400">Auto-Constrain</span>
          </label>

          <div className="w-px h-4 bg-[#16213e] mx-1" />

          {/* Exit sketch */}
          <button
            onClick={() => setActiveTool("select")}
            className="text-[10px] text-slate-400 hover:text-red-400 flex items-center gap-0.5 transition-colors"
          >
            <X size={10} /> Exit
          </button>
        </div>

        {/* Tool buttons */}
        <div className="flex items-center px-1 py-1 gap-0.5">
          {/* Select */}
          <button
            onClick={() => setActiveTool("select")}
            className={`flex flex-col items-center justify-center w-[38px] h-[40px] rounded transition-colors ${
              activeTool === "select"
                ? "bg-[#00D4FF]/20 text-[#00D4FF]"
                : "hover:bg-[#0f3460] text-slate-400 hover:text-white"
            }`}
            title="Select (Esc)"
          >
            <MousePointer2 size={14} />
            <span className="text-[8px] mt-0.5">Select</span>
          </button>

          <div className="w-px h-8 bg-[#16213e]" />

          {/* Sketch entities */}
          {sketchEntities.map((entity) => (
            <button
              key={entity.id}
              onClick={() => handleEntityClick(entity)}
              className={`flex flex-col items-center justify-center w-[38px] h-[40px] rounded transition-colors ${
                activeTool === entity.toolId
                  ? "bg-[#00D4FF]/20 text-[#00D4FF]"
                  : "hover:bg-[#0f3460] text-slate-400 hover:text-white"
              }`}
              title={entity.shortcut ? `${entity.label} (${entity.shortcut})` : entity.label}
            >
              {entity.icon}
              <span className="text-[8px] mt-0.5">{entity.label}</span>
            </button>
          ))}

          <div className="w-px h-8 bg-[#16213e]" />

          {/* Sketch operations */}
          {sketchOperations.map((op) => (
            <button
              key={op.id}
              onClick={() => handleOpClick(op.id)}
              className={`flex flex-col items-center justify-center w-[38px] h-[40px] rounded transition-colors ${
                activeOp === op.id
                  ? "bg-orange-500/20 text-orange-400"
                  : "hover:bg-[#0f3460] text-slate-400 hover:text-white"
              }`}
              title={op.label}
            >
              {op.icon}
              <span className="text-[8px] mt-0.5">{op.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
