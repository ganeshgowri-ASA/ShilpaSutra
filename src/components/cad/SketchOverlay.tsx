"use client";
import { useEffect, useRef, useState, useMemo, useCallback, Component, type ReactNode } from "react";
import { useCadStore, type ToolId } from "@/stores/cad-store";
import { useConstraintStore } from "@/stores/constraint-store";

const SKETCH_TOOLS: ToolId[] = [
  "line", "arc", "circle", "rectangle", "polygon", "spline", "ellipse", "construction_line",
];

interface SketchOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/* ── Error boundary to prevent sketch overlay errors from crashing the page ── */
interface ErrorBoundaryState { hasError: boolean }
class SketchOverlayErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) {
    console.warn("[SketchOverlay] Caught render error:", error.message);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/* ── Constraint inference types ── */
type InferredConstraint = {
  type: "horizontal" | "vertical" | "perpendicular" | "tangent" | "coincident" | "equal" | "45deg" | "parallel";
  label: string;
  color: string;
};

/** Detect near-constraint conditions for real-time feedback */
function inferConstraintFromAngle(angle: number): InferredConstraint | null {
  const normalizedAngle = ((angle % 360) + 360) % 360;
  const tolerance = 3; // degrees

  if (Math.abs(normalizedAngle) < tolerance || Math.abs(normalizedAngle - 360) < tolerance || Math.abs(normalizedAngle - 180) < tolerance) {
    return { type: "horizontal", label: "Horizontal", color: "#00ff88" };
  }
  if (Math.abs(normalizedAngle - 90) < tolerance || Math.abs(normalizedAngle - 270) < tolerance) {
    return { type: "vertical", label: "Vertical", color: "#00ff88" };
  }
  if (Math.abs(normalizedAngle - 45) < tolerance || Math.abs(normalizedAngle - 135) < tolerance ||
      Math.abs(normalizedAngle - 225) < tolerance || Math.abs(normalizedAngle - 315) < tolerance) {
    return { type: "45deg", label: "45°", color: "#ffaa00" };
  }
  return null;
}

/**
 * Professional CAD sketch overlay providing:
 * 1. Full-viewport crosshair cursor
 * 2. Real-time dimension display while drawing (length + angle at cursor)
 * 3. Snap point text labels (colored dots at endpoints/midpoints/centers)
 * 4. Dynamic input box at cursor
 * 5. Coordinate readout
 * 6. Alignment guide indicators
 * 7. Active sketch plane border highlight
 * 8. Constraint inference labels (Horizontal, Vertical, 45°, Perpendicular)
 * 9. Ortho lock indicator
 * 10. Enhanced snap modes (Nearest, Quadrant, Perpendicular, Tangent)
 * 11. Distance-from-origin display
 * 12. Polar tracking guides
 */
function SketchOverlayInner({ containerRef }: SketchOverlayProps) {
  const activeTool = useCadStore((s) => s.activeTool);
  const sketchPlane = useCadStore((s) => s.sketchPlane);
  const cursorPosition = useCadStore((s) => s.cursorPosition);
  const sketchDrawState = useCadStore((s) => s.sketchDrawState);
  const unit = useCadStore((s) => s.unit);
  const dynamicInputValue = useCadStore((s) => s.dynamicInputValue);
  const setDynamicInputValue = useCadStore((s) => s.setDynamicInputValue);
  const setDynamicInputActive = useCadStore((s) => s.setDynamicInputActive);

  const constraints = useConstraintStore((s) => s.constraints);
  const constraintStatus = useConstraintStore((s) => s.constraintStatus);
  const activeSketchId = useCadStore((s) => s.activeSketchId);
  const objects = useCadStore((s) => s.objects);
  const isConstructionMode = useCadStore((s) => s.isConstructionMode);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isOverCanvas, setIsOverCanvas] = useState(false);
  const [orthoLocked, setOrthoLocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Count sketch entities and DOF
  const sketchEntityCount = useMemo(() => {
    if (!activeSketchId) return 0;
    return objects.filter(o => o.sketchId === activeSketchId).length;
  }, [activeSketchId, objects]);

  const constraintCount = constraints.length;
  const dofStatus = useMemo(() => {
    if (constraintStatus === "fully") return { label: "Fully Constrained", color: "#22c55e" };
    if (constraintStatus === "over") return { label: "Over-Constrained", color: "#ef4444" };
    const entityDof = sketchEntityCount * 2; // simplified: 2 DOF per entity
    const remaining = Math.max(0, entityDof - constraintCount);
    return { label: `Under-Constrained (${remaining} DOF)`, color: "#f59e0b" };
  }, [constraintStatus, sketchEntityCount, constraintCount]);

  const isSketchMode = SKETCH_TOOLS.includes(activeTool) || !!sketchPlane;
  const isDrawing = SKETCH_TOOLS.includes(activeTool);

  const clickPoints = sketchDrawState?.clickPoints ?? [];
  const previewPoint = sketchDrawState?.previewPoint ?? null;
  const hasClickPoints = clickPoints.length > 0;

  // Track container bounds & mouse position
  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setIsOverCanvas(
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom
      );
    };
    const handleLeave = () => setIsOverCanvas(false);
    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [containerRef]);

  // Track Shift key for ortho lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setOrthoLocked(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setOrthoLocked(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Focus input when drawing starts
  useEffect(() => {
    if (hasClickPoints && isDrawing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [hasClickPoints, isDrawing]);

  // Compute live dimensions
  const dims = useMemo(() => {
    if (!hasClickPoints || !previewPoint || clickPoints.length === 0) return null;
    const start = clickPoints[0];
    const end = previewPoint;

    if (activeTool === "line" || activeTool === "construction_line") {
      const dx = end[0] - start[0];
      const dz = end[2] - start[2];
      const dy = end[1] - start[1];
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const angle = sketchPlane === "xy"
        ? Math.atan2(dy, dx) * (180 / Math.PI)
        : sketchPlane === "yz"
        ? Math.atan2(dz, dy) * (180 / Math.PI)
        : Math.atan2(dz, dx) * (180 / Math.PI);
      return { type: "line" as const, length, angle, dx: Math.abs(dx), dz: Math.abs(dz) };
    }

    if (activeTool === "rectangle") {
      const w = Math.abs(end[0] - start[0]);
      const h = Math.abs(end[2] - start[2]);
      const area = w * h;
      const perimeter = 2 * (w + h);
      return { type: "rect" as const, width: w, height: h, area, perimeter };
    }

    if (activeTool === "circle") {
      const dx = end[0] - start[0];
      const dz = end[2] - start[2];
      const radius = Math.sqrt(dx * dx + dz * dz);
      const circumference = 2 * Math.PI * radius;
      const area = Math.PI * radius * radius;
      return { type: "circle" as const, radius, diameter: radius * 2, circumference, area };
    }

    if (activeTool === "arc") {
      const dx = end[0] - start[0];
      const dz = end[2] - start[2];
      const radius = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx) * (180 / Math.PI);
      return { type: "arc" as const, radius, angle };
    }

    if (activeTool === "polygon") {
      const dx = end[0] - start[0];
      const dz = end[2] - start[2];
      const radius = Math.sqrt(dx * dx + dz * dz);
      return { type: "polygon" as const, radius };
    }

    if (activeTool === "ellipse") {
      const rx = Math.abs(end[0] - start[0]);
      const ry = Math.abs(end[2] - start[2]);
      return { type: "ellipse" as const, rx, ry };
    }

    return null;
  }, [hasClickPoints, previewPoint, clickPoints, activeTool, sketchPlane]);

  // Infer constraint from current drawing angle
  const inferredConstraint = useMemo(() => {
    if (!dims || dims.type !== "line") return null;
    return inferConstraintFromAngle(dims.angle);
  }, [dims]);

  // Distance from origin
  const distanceFromOrigin = useMemo(() => {
    if (!cursorPosition) return null;
    return Math.sqrt(
      cursorPosition[0] * cursorPosition[0] +
      cursorPosition[1] * cursorPosition[1] +
      cursorPosition[2] * cursorPosition[2]
    );
  }, [cursorPosition]);

  // Handle dynamic input
  const handleDynamicInput = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setDynamicInputValue("");
        setDynamicInputActive(false);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        return;
      }
    },
    [setDynamicInputValue, setDynamicInputActive]
  );

  if (!isSketchMode || !isOverCanvas) return null;

  const snapType = sketchDrawState?.snapType ?? null;
  const snapColors: Record<string, string> = {
    Endpoint: "#ff8c00",
    Midpoint: "#00ff88",
    Center: "#ff00ff",
    Intersection: "#ff4444",
    Grid: "#666666",
    Nearest: "#00aaff",
    Quadrant: "#ff6600",
    Perpendicular: "#8855ff",
    Tangent: "#ffcc00",
    Node: "#00ffcc",
    Parallel: "#44ff88",
  };

  const snapShapes: Record<string, "square" | "circle" | "diamond" | "triangle"> = {
    Endpoint: "square",
    Midpoint: "triangle",
    Center: "circle",
    Intersection: "diamond",
    Nearest: "diamond",
    Quadrant: "diamond",
    Perpendicular: "square",
    Tangent: "circle",
    Node: "circle",
    Parallel: "square",
  };

  const snapShape = snapType ? snapShapes[snapType] || "square" : "square";

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20"
      style={{ overflow: "hidden" }}
    >
      {/* ── Full-viewport crosshair (thin, subtle like AutoCAD) ── */}
      <div
        className="absolute top-0 bottom-0"
        style={{
          left: mousePos.x,
          width: 1,
          background: orthoLocked ? "rgba(255, 170, 0, 0.35)" : "rgba(180, 195, 210, 0.3)",
          transform: "translateX(-0.5px)",
        }}
      />
      <div
        className="absolute left-0 right-0"
        style={{
          top: mousePos.y,
          height: 1,
          background: orthoLocked ? "rgba(255, 170, 0, 0.35)" : "rgba(180, 195, 210, 0.3)",
          transform: "translateY(-0.5px)",
        }}
      />
      {/* Precise crosshair at cursor (thin + symbol, not a dot) */}
      <svg
        className="absolute pointer-events-none"
        style={{ left: mousePos.x - 8, top: mousePos.y - 8, width: 16, height: 16 }}
        viewBox="0 0 16 16"
      >
        <line x1="8" y1="2" x2="8" y2="6" stroke={orthoLocked ? "rgba(255, 170, 0, 0.8)" : "rgba(200, 210, 220, 0.7)"} strokeWidth="0.8" />
        <line x1="8" y1="10" x2="8" y2="14" stroke={orthoLocked ? "rgba(255, 170, 0, 0.8)" : "rgba(200, 210, 220, 0.7)"} strokeWidth="0.8" />
        <line x1="2" y1="8" x2="6" y2="8" stroke={orthoLocked ? "rgba(255, 170, 0, 0.8)" : "rgba(200, 210, 220, 0.7)"} strokeWidth="0.8" />
        <line x1="10" y1="8" x2="14" y2="8" stroke={orthoLocked ? "rgba(255, 170, 0, 0.8)" : "rgba(200, 210, 220, 0.7)"} strokeWidth="0.8" />
      </svg>

      {/* ── Ortho lock indicator ── */}
      {orthoLocked && (
        <div
          className="absolute"
          style={{ left: mousePos.x + 14, top: mousePos.y - 40, whiteSpace: "nowrap" }}
        >
          <div className="bg-[#0d1117]/95 border border-[#ffaa00]/60 rounded px-1.5 py-0.5 text-[9px] font-bold text-[#ffaa00] backdrop-blur-sm">
            ORTHO
          </div>
        </div>
      )}

      {/* ── Coordinate readout (compact) ── */}
      {cursorPosition && (
        <div
          className="absolute"
          style={{ left: mousePos.x + 14, top: mousePos.y + 14, whiteSpace: "nowrap" }}
        >
          <div className="bg-[#0d1117]/85 border border-[#1a2233] rounded px-1 py-0.5 backdrop-blur-sm">
            <span className="text-[9px] font-mono text-slate-400">
              {cursorPosition[0].toFixed(2)}, {cursorPosition[2].toFixed(2)}
            </span>
            {distanceFromOrigin !== null && (
              <span className="text-[8px] font-mono text-slate-600 ml-1.5">
                d:{distanceFromOrigin.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Snap visual indicator (compact) ── */}
      {snapType && snapType !== "Grid" && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: mousePos.x - 6,
            top: mousePos.y - 6,
            width: 12,
            height: 12,
            border: `1.5px solid ${snapColors[snapType] || "#ffaa00"}`,
            borderRadius: snapShape === "circle" ? "50%" : "1px",
            background: `${snapColors[snapType] || "#ffaa00"}15`,
            boxShadow: `0 0 4px ${snapColors[snapType] || "#ffaa00"}30`,
            transform: snapShape === "diamond" ? "rotate(45deg)" : undefined,
          }}
        />
      )}

      {/* ── Snap type label (subtle) ── */}
      {snapType && snapType !== "Grid" && (
        <div
          className="absolute"
          style={{ left: mousePos.x + 12, top: mousePos.y - 20, whiteSpace: "nowrap" }}
        >
          <span
            className="text-[8px] font-medium"
            style={{ color: snapColors[snapType] || "#999", opacity: 0.7 }}
          >
            {snapType}
          </span>
        </div>
      )}

      {/* ── Constraint inference label (refined) ── */}
      {inferredConstraint && hasClickPoints && (
        <div
          className="absolute"
          style={{
            left: mousePos.x - 30,
            top: mousePos.y - 50,
            whiteSpace: "nowrap",
          }}
        >
          <div
            className="rounded px-1.5 py-0.5 text-[8px] font-semibold"
            style={{
              background: `${inferredConstraint.color}10`,
              border: `1px solid ${inferredConstraint.color}50`,
              color: inferredConstraint.color,
              opacity: 0.85,
            }}
          >
            {inferredConstraint.label}
          </div>
        </div>
      )}

      {/* ── Real-time dimension display (clean tooltip) ── */}
      {dims && (
        <div
          className="absolute"
          style={{ left: mousePos.x + 18, top: mousePos.y - 44, whiteSpace: "nowrap" }}
        >
          <div className="bg-[#0d1117]/92 border border-[#1e2a3a] rounded px-2 py-1 backdrop-blur-sm shadow-lg shadow-black/30">
            {dims.type === "line" && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono font-semibold text-[#7dc4e0]">
                  {dims.length.toFixed(2)}
                </span>
                <span className="text-[8px] text-slate-600">@</span>
                <span className="text-[10px] font-mono font-semibold text-[#d4a574]">
                  {(((dims.angle % 360) + 360) % 360).toFixed(1)}°
                </span>
              </div>
            )}
            {dims.type === "rect" && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono font-semibold text-[#7dc4e0]">
                  {dims.width.toFixed(2)}
                </span>
                <span className="text-[8px] text-slate-600">×</span>
                <span className="text-[10px] font-mono font-semibold text-[#7dc4e0]">
                  {dims.height.toFixed(2)}
                </span>
              </div>
            )}
            {dims.type === "circle" && (
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-slate-500">R</span>
                <span className="text-[10px] font-mono font-semibold text-[#7dc4e0]">
                  {dims.radius.toFixed(2)}
                </span>
                <span className="text-[8px] text-slate-600 ml-0.5">⌀{dims.diameter.toFixed(2)}</span>
              </div>
            )}
            {dims.type === "arc" && (
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-slate-500">R</span>
                <span className="text-[10px] font-mono font-semibold text-[#7dc4e0]">
                  {dims.radius.toFixed(2)}
                </span>
                <span className="text-[8px] text-slate-600">@</span>
                <span className="text-[10px] font-mono font-semibold text-[#d4a574]">
                  {(((dims.angle % 360) + 360) % 360).toFixed(1)}°
                </span>
              </div>
            )}
            {dims.type === "polygon" && (
              <span className="text-[10px] font-mono font-semibold text-[#7dc4e0]">
                R {dims.radius.toFixed(2)}
              </span>
            )}
            {dims.type === "ellipse" && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono font-semibold text-[#7dc4e0]">
                  {dims.rx.toFixed(2)}
                </span>
                <span className="text-[8px] text-slate-600">×</span>
                <span className="text-[10px] font-mono font-semibold text-[#7dc4e0]">
                  {dims.ry.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Alignment guide indicators ── */}
      {sketchDrawState?.alignH && sketchDrawState?.alignRefPoint && (
        <div
          className="absolute left-0 right-0"
          style={{
            top: mousePos.y,
            height: 1,
            background: "repeating-linear-gradient(90deg, #00ff88 0px, #00ff88 4px, transparent 4px, transparent 8px)",
            transform: "translateY(-0.5px)",
            opacity: 0.6,
          }}
        />
      )}
      {sketchDrawState?.alignV && sketchDrawState?.alignRefPoint && (
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: mousePos.x,
            width: 1,
            background: "repeating-linear-gradient(180deg, #00ff88 0px, #00ff88 4px, transparent 4px, transparent 8px)",
            transform: "translateX(-0.5px)",
            opacity: 0.6,
          }}
        />
      )}

      {/* ── Polar tracking guide (45° angles from click point) ── */}
      {hasClickPoints && isDrawing && inferredConstraint && (
        <div
          className="absolute"
          style={{
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }}>
            {/* Dashed tracking line from first click to cursor */}
            <line
              x1={mousePos.x - 200 * Math.cos(((dims as { angle: number })?.angle ?? 0) * Math.PI / 180)}
              y1={mousePos.y + 200 * Math.sin(((dims as { angle: number })?.angle ?? 0) * Math.PI / 180)}
              x2={mousePos.x + 200 * Math.cos(((dims as { angle: number })?.angle ?? 0) * Math.PI / 180)}
              y2={mousePos.y - 200 * Math.sin(((dims as { angle: number })?.angle ?? 0) * Math.PI / 180)}
              stroke={inferredConstraint.color}
              strokeWidth="0.5"
              strokeDasharray="6 4"
              opacity="0.4"
            />
          </svg>
        </div>
      )}

      {/* ── Dynamic input box at cursor ── */}
      {isDrawing && hasClickPoints && (
        <div
          className="absolute pointer-events-auto"
          style={{ left: mousePos.x + 18, top: mousePos.y + 28, whiteSpace: "nowrap" }}
        >
          <div className="bg-[#0d1117]/90 border border-[#1e2a3a] rounded px-1.5 py-0.5 backdrop-blur-sm shadow-md flex items-center gap-1">
            <span className="text-[8px] text-slate-600">
              {activeTool === "circle" ? "R:" :
               activeTool === "rectangle" ? "W,H:" :
               activeTool === "arc" ? "R,A:" :
               activeTool === "ellipse" ? "Rx,Ry:" :
               activeTool === "polygon" ? "R:" :
               "L:"}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={dynamicInputValue}
              onChange={(e) => setDynamicInputValue(e.target.value)}
              onKeyDown={handleDynamicInput}
              placeholder={
                activeTool === "rectangle" ? "w,h" :
                activeTool === "arc" ? "r,angle" :
                activeTool === "ellipse" ? "rx,ry" :
                "value"
              }
              className="w-16 bg-transparent text-[10px] text-[#7dc4e0] font-mono outline-none border-none placeholder:text-slate-700"
              autoComplete="off"
            />
            <span className="text-[8px] text-slate-600">{unit}</span>
          </div>
        </div>
      )}

      {/* ── Status bar at bottom of viewport (minimal) ── */}
      {isSketchMode && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-[#0d1117]/80 border border-[#1a2233] rounded-md px-2.5 py-0.5 backdrop-blur-sm flex items-center gap-2 text-[8px] font-mono text-slate-500">
            <span className={
              sketchPlane === "xy" ? "text-blue-400/70" :
              sketchPlane === "xz" ? "text-green-400/70" :
              "text-red-400/70"
            }>{(sketchPlane || "xz").toUpperCase()}</span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-400">{activeTool.replace("_", " ")}</span>
            {orthoLocked && (
              <>
                <span className="text-slate-700">|</span>
                <span className="text-[#d4a574] font-semibold">ORTHO</span>
              </>
            )}
            {snapType && (
              <>
                <span className="text-slate-700">|</span>
                <span style={{ color: snapColors[snapType] || "#666", opacity: 0.7 }}>
                  {snapType}
                </span>
              </>
            )}
            {isConstructionMode && (
              <>
                <span className="text-slate-700">|</span>
                <span className="text-sky-400 font-semibold">CONSTRUCTION</span>
              </>
            )}
            {sketchEntityCount > 0 && (
              <>
                <span className="text-slate-700">|</span>
                <span className="text-slate-400">{sketchEntityCount} entities</span>
              </>
            )}
            {sketchEntityCount > 0 && (
              <>
                <span className="text-slate-700">|</span>
                <span style={{ color: dofStatus.color }} className="font-semibold">{dofStatus.label}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Active sketch plane border highlight ── */}
      {sketchPlane && (
        <div
          className="absolute inset-0 rounded-none pointer-events-none"
          style={{
            border: `2px solid ${
              sketchPlane === "xy" ? "rgba(68, 68, 255, 0.3)" :
              sketchPlane === "xz" ? "rgba(68, 255, 68, 0.3)" :
              "rgba(255, 68, 68, 0.3)"
            }`,
            boxShadow: `inset 0 0 20px ${
              sketchPlane === "xy" ? "rgba(68, 68, 255, 0.08)" :
              sketchPlane === "xz" ? "rgba(68, 255, 68, 0.08)" :
              "rgba(255, 68, 68, 0.08)"
            }`,
          }}
        />
      )}
    </div>
  );
}

export default function SketchOverlay(props: SketchOverlayProps) {
  return (
    <SketchOverlayErrorBoundary>
      <SketchOverlayInner {...props} />
    </SketchOverlayErrorBoundary>
  );
}
