"use client";
import { useState, useCallback, useEffect } from "react";
import { useCadStore, type ToolId } from "@/stores/cad-store";
import {
  trimLine,
  extendLine,
  offsetLine,
  mirrorLine,
  sketchFillet,
  sketchChamfer,
  type SketchEntity2D,
} from "@/lib/sketch-engine";
import {
  Pencil, Spline, Circle, Square, Pentagon,
  Minus, Scissors, FlipHorizontal, ArrowRight,
  RulerIcon, Construction, Ellipsis, MousePointer2, X,
  Grid3X3, Magnet, CornerDownRight, Hash,
  Octagon, ChevronDown,
} from "lucide-react";

export type SketchEntity =
  | "line"
  | "arc"
  | "arc_3point"
  | "arc_tangent"
  | "circle"
  | "circle_3point"
  | "rectangle"
  | "center_rectangle"
  | "polygon"
  | "spline"
  | "ellipse"
  | "construction_line"
  | "centerline"
  | "point"
  | "slot"
  | "slot_arc"
  | "parabola"
  | "sketch_text"
  | "fillet_sketch"
  | "chamfer_sketch";

export type SketchOperation =
  | "trim"
  | "power_trim"
  | "extend"
  | "offset"
  | "offset_entities"
  | "convert_entities"
  | "mirror_sketch"
  | "mirror_entities"
  | "split_entities"
  | "dimension"
  | "sketch_fillet"
  | "sketch_chamfer"
  | "move_entities"
  | "copy_entities"
  | "rotate_entities"
  | "linear_sketch_pattern"
  | "circular_sketch_pattern";

export type SnapMode =
  | "endpoint"
  | "midpoint"
  | "center"
  | "intersection"
  | "grid"
  | "nearest"
  | "quadrant"
  | "perpendicular";

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
  { id: "arc_3point", icon: <Spline size={14} />, label: "3P Arc", toolId: "arc_3point" },
  { id: "arc_tangent", icon: <Spline size={14} />, label: "Tan Arc", toolId: "arc_tangent" },
  { id: "circle", icon: <Circle size={14} />, label: "Circle", toolId: "circle", shortcut: "C" },
  { id: "circle_3point", icon: <Circle size={14} />, label: "3P Circle", toolId: "circle_3point" },
  { id: "rectangle", icon: <Square size={14} />, label: "Rect", toolId: "rectangle", shortcut: "R" },
  { id: "center_rectangle", icon: <Square size={14} />, label: "C.Rect", toolId: "center_rectangle" },
  { id: "polygon", icon: <Pentagon size={14} />, label: "Polygon", toolId: "polygon" },
  { id: "spline", icon: <Spline size={14} />, label: "Spline", toolId: "spline" },
  { id: "ellipse", icon: <Ellipsis size={14} />, label: "Ellipse", toolId: "ellipse" },
  { id: "parabola", icon: <Spline size={14} />, label: "Parabola", toolId: "parabola" },
  { id: "slot", icon: <Minus size={14} />, label: "Slot", toolId: "slot" },
  { id: "slot_arc", icon: <Minus size={14} />, label: "Arc Slot", toolId: "slot_arc" },
  { id: "sketch_text", icon: <Hash size={14} />, label: "Text", toolId: "sketch_text" },
  { id: "point", icon: <Octagon size={14} />, label: "Point", toolId: "point" },
  { id: "centerline", icon: <Construction size={14} />, label: "C.Line", toolId: "centerline" },
  { id: "construction_line", icon: <Construction size={14} />, label: "Constr.", toolId: "construction_line" },
];

const sketchOperations: {
  id: SketchOperation;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}[] = [
  { id: "trim", icon: <Scissors size={14} />, label: "Trim", shortcut: "T" },
  { id: "power_trim", icon: <Scissors size={14} />, label: "P.Trim" },
  { id: "extend", icon: <ArrowRight size={14} />, label: "Extend", shortcut: "X" },
  { id: "split_entities", icon: <Scissors size={14} />, label: "Split" },
  { id: "offset", icon: <Minus size={14} />, label: "Offset", shortcut: "O" },
  { id: "offset_entities", icon: <Minus size={14} />, label: "Off.Ent" },
  { id: "convert_entities", icon: <ArrowRight size={14} />, label: "Convert" },
  { id: "mirror_sketch", icon: <FlipHorizontal size={14} />, label: "Mirror", shortcut: "M" },
  { id: "mirror_entities", icon: <FlipHorizontal size={14} />, label: "Mir.Ent" },
  { id: "dimension", icon: <RulerIcon size={14} />, label: "Dimension", shortcut: "D" },
  { id: "sketch_fillet", icon: <CornerDownRight size={14} />, label: "Sk.Fillet" },
  { id: "sketch_chamfer", icon: <Octagon size={14} />, label: "Sk.Chamfer" },
  { id: "move_entities", icon: <ArrowRight size={14} />, label: "Move" },
  { id: "rotate_entities", icon: <ArrowRight size={14} />, label: "Rotate" },
  { id: "linear_sketch_pattern", icon: <Grid3X3 size={14} />, label: "Lin.Pat" },
  { id: "circular_sketch_pattern", icon: <Grid3X3 size={14} />, label: "Cir.Pat" },
];

const snapModes: { id: SnapMode; label: string }[] = [
  { id: "endpoint", label: "Endpoint" },
  { id: "midpoint", label: "Midpoint" },
  { id: "center", label: "Center" },
  { id: "intersection", label: "Intersection" },
  { id: "grid", label: "Grid" },
  { id: "nearest", label: "Nearest" },
  { id: "quadrant", label: "Quadrant" },
  { id: "perpendicular", label: "Perpendicular" },
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

  // Polygon sides selector (3-12)
  const [polygonSides, setPolygonSides] = useState(6);

  // Spline degree selector (2-5)
  const [splineDegree, setSplineDegree] = useState(3);

  // Snap modes
  const [activeSnaps, setActiveSnaps] = useState<Set<SnapMode>>(
    new Set<SnapMode>(["endpoint", "midpoint", "center", "intersection"])
  );
  const [showSnapMenu, setShowSnapMenu] = useState(false);

  // Ortho mode (constrain to 0/45/90 degree angles)
  const [orthoMode, setOrthoMode] = useState(false);

  // Grid snap
  const [gridSnap, setGridSnap] = useState(false);
  const [gridSize, setGridSize] = useState("1.0");

  // Active sketch entity for detecting polygon/spline tool
  const [activeEntity, setActiveEntity] = useState<SketchEntity | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toUpperCase();

      // Operation shortcuts
      switch (key) {
        case "T":
          setActiveOp((prev) => (prev === "trim" ? null : "trim"));
          break;
        case "X":
          setActiveOp((prev) => (prev === "extend" ? null : "extend"));
          break;
        case "O":
          setActiveOp((prev) => (prev === "offset" ? null : "offset"));
          break;
        case "M":
          setActiveOp((prev) => (prev === "mirror_sketch" ? null : "mirror_sketch"));
          break;
        case "D":
          setActiveOp((prev) => (prev === "dimension" ? null : "dimension"));
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleEntityClick = useCallback(
    (entity: (typeof sketchEntities)[0]) => {
      setActiveTool(entity.toolId);
      setActiveEntity(entity.id);
      setActiveOp(null);
    },
    [setActiveTool]
  );

  const handleOpClick = useCallback(
    (op: SketchOperation) => {
      if (activeOp === op) {
        setActiveOp(null);
        return;
      }
      setActiveOp(op);

      // Execute operations that can work immediately on selected entities
      const cadStore = useCadStore.getState();
      const selected = cadStore.getSelected();
      if (!selected) return;

      const activeSketchId = cadStore.activeSketchId;
      const sketchEntities = activeSketchId
        ? cadStore.objects.filter((o) => o.sketchId === activeSketchId)
        : [];

      switch (op) {
        case "trim": {
          // Trim requires a line selected and other entities to trim against
          if (selected.type === "line" && selected.linePoints && selected.linePoints.length >= 2) {
            const otherEntities: SketchEntity2D[] = sketchEntities
              .filter((e) => e.id !== selected.id)
              .map((e) => {
                if (e.type === "line" && e.linePoints && e.linePoints.length >= 2)
                  return { type: "line" as const, points: e.linePoints.map((p) => [p[0], p[2]] as [number, number]) };
                if (e.type === "circle" && e.circleCenter && e.circleRadius)
                  return { type: "circle" as const, center: [e.circleCenter[0], e.circleCenter[2]] as [number, number], radius: e.circleRadius };
                return null;
              })
              .filter(Boolean) as SketchEntity2D[];

            if (otherEntities.length > 0) {
              const lp = selected.linePoints;
              const midPt: [number, number] = [(lp[0][0] + lp[1][0]) / 2, (lp[0][2] + lp[1][2]) / 2];
              const result = trimLine(
                [lp[0][0], lp[0][2]], [lp[1][0], lp[1][2]],
                midPt, otherEntities
              );
              if (result.success && result.remainingSegments.length > 0) {
                cadStore.pushHistory();
                cadStore.deleteObject(selected.id);
                const SKETCH_Y = 0.02;
                for (const seg of result.remainingSegments) {
                  cadStore.addLine([
                    [seg.start[0], SKETCH_Y, seg.start[1]],
                    [seg.end[0], SKETCH_Y, seg.end[1]],
                  ]);
                }
              }
            }
          }
          setActiveOp(null);
          break;
        }

        case "offset": {
          // Offset: create a parallel copy of the selected line at a fixed distance
          if (selected.type === "line" && selected.linePoints && selected.linePoints.length >= 2) {
            const lp = selected.linePoints;
            const offsetDist = 0.5; // Default offset distance
            const result = offsetLine(
              [lp[0][0], lp[0][2]], [lp[1][0], lp[1][2]],
              offsetDist
            );
            cadStore.pushHistory();
            const SKETCH_Y = 0.02;
            cadStore.addLine([
              [result.start[0], SKETCH_Y, result.start[1]],
              [result.end[0], SKETCH_Y, result.end[1]],
            ]);
          }
          setActiveOp(null);
          break;
        }

        case "mirror_sketch": {
          // Mirror across Y axis (X=0 line)
          if (selected.type === "line" && selected.linePoints && selected.linePoints.length >= 2) {
            const lp = selected.linePoints;
            const result = mirrorLine(
              [lp[0][0], lp[0][2]], [lp[1][0], lp[1][2]],
              [0, -10], [0, 10] // Mirror about Y axis
            );
            cadStore.pushHistory();
            const SKETCH_Y = 0.02;
            cadStore.addLine([
              [result.start[0], SKETCH_Y, result.start[1]],
              [result.end[0], SKETCH_Y, result.end[1]],
            ]);
          }
          setActiveOp(null);
          break;
        }

        case "sketch_fillet": {
          // Fillet two selected lines
          const selectedIds = cadStore.selectedIds;
          if (selectedIds.length >= 2) {
            const line1 = cadStore.objects.find((o) => o.id === selectedIds[0]);
            const line2 = cadStore.objects.find((o) => o.id === selectedIds[1]);
            if (line1?.type === "line" && line2?.type === "line" &&
                line1.linePoints?.length === 2 && line2.linePoints?.length === 2) {
              const result = sketchFillet(
                [line1.linePoints[0][0], line1.linePoints[0][2]],
                [line1.linePoints[1][0], line1.linePoints[1][2]],
                [line2.linePoints[0][0], line2.linePoints[0][2]],
                [line2.linePoints[1][0], line2.linePoints[1][2]],
                0.3 // Default fillet radius
              );
              if (result) {
                cadStore.pushHistory();
                const SKETCH_Y = 0.02;
                // Update line1 with trimmed version
                cadStore.updateObject(line1.id, {
                  linePoints: [
                    [result.trimmedLine1.start[0], SKETCH_Y, result.trimmedLine1.start[1]],
                    [result.trimmedLine1.end[0], SKETCH_Y, result.trimmedLine1.end[1]],
                  ],
                });
                // Update line2 with trimmed version
                cadStore.updateObject(line2.id, {
                  linePoints: [
                    [result.trimmedLine2.start[0], SKETCH_Y, result.trimmedLine2.start[1]],
                    [result.trimmedLine2.end[0], SKETCH_Y, result.trimmedLine2.end[1]],
                  ],
                });
                // Add fillet arc
                const arcCenter: [number, number, number] = [result.arc.center[0], SKETCH_Y, result.arc.center[1]];
                const arcStart: [number, number, number] = [
                  result.arc.center[0] + Math.cos(result.arc.startAngle) * result.arc.radius,
                  SKETCH_Y,
                  result.arc.center[1] + Math.sin(result.arc.startAngle) * result.arc.radius,
                ];
                const arcEnd: [number, number, number] = [
                  result.arc.center[0] + Math.cos(result.arc.endAngle) * result.arc.radius,
                  SKETCH_Y,
                  result.arc.center[1] + Math.sin(result.arc.endAngle) * result.arc.radius,
                ];
                cadStore.addArc([arcStart, arcCenter, arcEnd], result.arc.radius);
              }
            }
          }
          setActiveOp(null);
          break;
        }

        case "sketch_chamfer": {
          // Chamfer two selected lines
          const selIds = cadStore.selectedIds;
          if (selIds.length >= 2) {
            const line1 = cadStore.objects.find((o) => o.id === selIds[0]);
            const line2 = cadStore.objects.find((o) => o.id === selIds[1]);
            if (line1?.type === "line" && line2?.type === "line" &&
                line1.linePoints?.length === 2 && line2.linePoints?.length === 2) {
              const result = sketchChamfer(
                [line1.linePoints[0][0], line1.linePoints[0][2]],
                [line1.linePoints[1][0], line1.linePoints[1][2]],
                [line2.linePoints[0][0], line2.linePoints[0][2]],
                [line2.linePoints[1][0], line2.linePoints[1][2]],
                0.3 // Default chamfer distance
              );
              if (result) {
                cadStore.pushHistory();
                const SKETCH_Y = 0.02;
                cadStore.updateObject(line1.id, {
                  linePoints: [
                    [result.trimmedLine1.start[0], SKETCH_Y, result.trimmedLine1.start[1]],
                    [result.trimmedLine1.end[0], SKETCH_Y, result.trimmedLine1.end[1]],
                  ],
                });
                cadStore.updateObject(line2.id, {
                  linePoints: [
                    [result.trimmedLine2.start[0], SKETCH_Y, result.trimmedLine2.start[1]],
                    [result.trimmedLine2.end[0], SKETCH_Y, result.trimmedLine2.end[1]],
                  ],
                });
                cadStore.addLine([
                  [result.chamferLine.start[0], SKETCH_Y, result.chamferLine.start[1]],
                  [result.chamferLine.end[0], SKETCH_Y, result.chamferLine.end[1]],
                ]);
              }
            }
          }
          setActiveOp(null);
          break;
        }

        case "move_entities": {
          // Move selected entity by a small offset (visual feedback would need more UI)
          if (selected.type === "line" && selected.linePoints && selected.linePoints.length >= 2) {
            cadStore.pushHistory();
            const lp = selected.linePoints;
            cadStore.updateObject(selected.id, {
              linePoints: lp.map((p) => [p[0] + 0.5, p[1], p[2] + 0.5] as [number, number, number]),
            });
          }
          setActiveOp(null);
          break;
        }

        default:
          // For dimension and other ops, leave the op active for user interaction
          break;
      }
    },
    [activeOp, setActiveTool],
  );

  const handlePlaneChange = useCallback(
    (plane: "xy" | "xz" | "yz" | "face") => {
      setSketchPlane(plane);
      setShowPlaneSelector(false);
      onSelectPlane?.(plane);
    },
    [onSelectPlane]
  );

  const toggleSnapMode = useCallback((mode: SnapMode) => {
    setActiveSnaps((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) {
        next.delete(mode);
      } else {
        next.add(mode);
      }
      return next;
    });
  }, []);

  const sketchTools: ToolId[] = ["line", "arc", "arc_3point", "arc_tangent", "circle", "circle_3point", "rectangle", "center_rectangle", "polygon", "spline", "ellipse", "parabola", "slot", "slot_arc", "sketch_text", "point", "centerline", "construction_line"];
  const isInSketchMode = sketchTools.includes(activeTool);

  if (!visible && !isInSketchMode) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-auto animate-scale-in">
      <div className="bg-[#161b22]/97 border border-[#30363d] rounded-xl backdrop-blur-md shadow-2xl shadow-black/40">
        {/* Top bar: Plane selector + snap/ortho/grid controls */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[#21262d] flex-wrap">
          {/* Plane selector */}
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

          {/* Ortho mode toggle */}
          <button
            onClick={() => setOrthoMode(!orthoMode)}
            className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md transition-all duration-150 ${
              orthoMode
                ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                : "text-slate-400 hover:text-slate-300 border border-transparent hover:bg-[#21262d]"
            }`}
            title="Ortho Mode - Constrain to 0/45/90 degree angles (F8)"
          >
            <Hash size={10} />
            Ortho
          </button>

          {/* Grid snap toggle + size */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setGridSnap(!gridSnap)}
              className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md transition-all duration-150 ${
                gridSnap
                  ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                  : "text-slate-400 hover:text-slate-300 border border-transparent hover:bg-[#21262d]"
              }`}
              title="Grid Snap (F9)"
            >
              <Grid3X3 size={10} />
              Grid
            </button>
            {gridSnap && (
              <input
                type="text"
                value={gridSize}
                onChange={(e) => setGridSize(e.target.value)}
                className="w-10 text-[9px] text-center bg-[#0d1117] border border-[#30363d] rounded px-1 py-0.5 text-[#00D4FF] focus:border-[#00D4FF]/50 focus:outline-none"
                title="Grid size"
              />
            )}
          </div>

          <div className="w-px h-4 bg-[#21262d] mx-1" />

          {/* Snap mode selector */}
          <div className="relative">
            <button
              onClick={() => setShowSnapMenu(!showSnapMenu)}
              className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md transition-all duration-150 ${
                activeSnaps.size > 0
                  ? "bg-green-500/10 text-green-400 border border-green-500/25"
                  : "text-slate-400 hover:text-slate-300 border border-transparent hover:bg-[#21262d]"
              }`}
              title="Object Snap Settings"
            >
              <Magnet size={10} />
              Snap ({activeSnaps.size})
              <ChevronDown size={8} />
            </button>
            {showSnapMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSnapMenu(false)} />
                <div className="absolute top-full right-0 mt-1.5 bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl shadow-black/50 py-1 z-50 min-w-[160px] animate-scale-in">
                  <div className="px-3 py-1 text-[8px] text-slate-500 uppercase tracking-widest font-semibold border-b border-[#21262d]">
                    Object Snap Modes
                  </div>
                  {snapModes.map((snap) => (
                    <button
                      key={snap.id}
                      onClick={() => toggleSnapMode(snap.id)}
                      className={`w-full px-3 py-1.5 text-[10px] text-left flex items-center gap-2 hover:bg-[#21262d] transition-all duration-150 ${
                        activeSnaps.has(snap.id) ? "text-green-400" : "text-slate-400"
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-all ${
                        activeSnaps.has(snap.id)
                          ? "bg-green-500/20 border-green-500/50"
                          : "border-[#30363d]"
                      }`}>
                        {activeSnaps.has(snap.id) && <span className="text-green-400 text-[7px] font-bold">&#10003;</span>}
                      </div>
                      {snap.label}
                    </button>
                  ))}
                  <div className="border-t border-[#21262d] mt-1 pt-1 px-3 py-1 flex gap-2">
                    <button
                      onClick={() => setActiveSnaps(new Set(snapModes.map((s) => s.id)))}
                      className="text-[9px] text-[#00D4FF] hover:text-[#00D4FF]/80 transition-colors"
                    >
                      All
                    </button>
                    <button
                      onClick={() => setActiveSnaps(new Set())}
                      className="text-[9px] text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      None
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

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
              className={`group relative flex flex-col items-center justify-center w-[40px] h-[42px] rounded-lg transition-all duration-150 ${
                activeEntity === entity.id
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
              className={`group relative flex flex-col items-center justify-center w-[40px] h-[42px] rounded-lg transition-all duration-150 ${
                activeOp === op.id
                  ? "bg-orange-500/15 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.12)]"
                  : "hover:bg-[#21262d] text-slate-400 hover:text-white"
              }`}
              title={op.shortcut ? `${op.label} (${op.shortcut})` : op.label}
            >
              {op.icon}
              <span className="text-[7px] mt-0.5 font-medium">{op.label}</span>
              {op.shortcut && (
                <span className="absolute -top-0.5 -right-0.5 text-[7px] text-slate-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity bg-[#0d1117] rounded px-0.5">{op.shortcut}</span>
              )}
            </button>
          ))}
        </div>

        {/* Contextual sub-panels: Polygon sides / Spline degree */}
        {(activeEntity === "polygon" || activeEntity === "spline") && (
          <div className="flex items-center gap-2 px-3 py-1.5 border-t border-[#21262d]">
            {activeEntity === "polygon" && (
              <>
                <span className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold">Sides</span>
                <div className="flex items-center gap-1">
                  {[3, 4, 5, 6, 8, 10, 12].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPolygonSides(n)}
                      className={`text-[10px] w-6 h-5 rounded transition-all duration-150 font-mono ${
                        polygonSides === n
                          ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                          : "text-slate-400 hover:text-white hover:bg-[#21262d] border border-transparent"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <div className="w-px h-4 bg-[#21262d] mx-1" />
                  <input
                    type="number"
                    min={3}
                    max={12}
                    value={polygonSides}
                    onChange={(e) => {
                      const v = Math.max(3, Math.min(12, parseInt(e.target.value) || 3));
                      setPolygonSides(v);
                    }}
                    className="w-10 text-[9px] text-center bg-[#0d1117] border border-[#30363d] rounded px-1 py-0.5 text-[#00D4FF] focus:border-[#00D4FF]/50 focus:outline-none"
                    title="Custom sides (3-12)"
                  />
                </div>
              </>
            )}
            {activeEntity === "spline" && (
              <>
                <span className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold">Degree</span>
                <div className="flex items-center gap-1">
                  {[2, 3, 4, 5].map((d) => (
                    <button
                      key={d}
                      onClick={() => setSplineDegree(d)}
                      className={`text-[10px] px-2 h-5 rounded transition-all duration-150 font-mono ${
                        splineDegree === d
                          ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                          : "text-slate-400 hover:text-white hover:bg-[#21262d] border border-transparent"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                  <span className="text-[8px] text-slate-500 ml-1">
                    {splineDegree === 2 ? "Quadratic" : splineDegree === 3 ? "Cubic" : splineDegree === 4 ? "Quartic" : "Quintic"}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
