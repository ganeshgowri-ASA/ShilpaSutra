"use client";
import { useEffect, useRef, useState, useMemo, useCallback, Component, type ReactNode } from "react";
import { useCadStore, type ToolId } from "@/stores/cad-store";

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

/**
 * Professional CAD sketch overlay providing:
 * 1. Full-viewport crosshair cursor
 * 2. Real-time dimension display while drawing (length + angle at cursor)
 * 3. Snap point text labels (colored dots at endpoints/midpoints/centers)
 * 4. Dynamic input box at cursor
 * 5. Coordinate readout
 * 6. Alignment guide indicators
 * 7. Active sketch plane border highlight
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

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isOverCanvas, setIsOverCanvas] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Focus input when drawing starts
  useEffect(() => {
    if (hasClickPoints && isDrawing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [hasClickPoints, isDrawing]);

  // Compute live dimensions (useMemo, not useCallback)
  const dims = useMemo(() => {
    if (!hasClickPoints || !previewPoint || clickPoints.length === 0) return null;
    const start = clickPoints[0];
    const end = previewPoint;

    if (activeTool === "line" || activeTool === "construction_line") {
      const dx = end[0] - start[0];
      const dz = end[2] - start[2];
      const dy = end[1] - start[1];
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
      // Compute angle in the active sketch plane's 2D coordinate system
      const angle = sketchPlane === "xy"
        ? Math.atan2(dy, dx) * (180 / Math.PI)
        : sketchPlane === "yz"
        ? Math.atan2(dz, dy) * (180 / Math.PI)
        : Math.atan2(dz, dx) * (180 / Math.PI); // xz (default)
      return { type: "line" as const, length, angle };
    }

    if (activeTool === "rectangle") {
      const w = Math.abs(end[0] - start[0]);
      const h = Math.abs(end[2] - start[2]);
      return { type: "rect" as const, width: w, height: h };
    }

    if (activeTool === "circle") {
      const dx = end[0] - start[0];
      const dz = end[2] - start[2];
      const radius = Math.sqrt(dx * dx + dz * dz);
      return { type: "circle" as const, radius, diameter: radius * 2 };
    }

    return null;
  }, [hasClickPoints, previewPoint, clickPoints, activeTool]);

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
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20"
      style={{ overflow: "hidden" }}
    >
      {/* ── Full-viewport crosshair (two thin lines spanning the whole viewport) ── */}
      <div
        className="absolute top-0 bottom-0"
        style={{
          left: mousePos.x,
          width: 1,
          background: "rgba(0, 212, 255, 0.6)",
          transform: "translateX(-0.5px)",
        }}
      />
      <div
        className="absolute left-0 right-0"
        style={{
          top: mousePos.y,
          height: 1,
          background: "rgba(0, 212, 255, 0.6)",
          transform: "translateY(-0.5px)",
        }}
      />
      {/* Small center dot at crosshair intersection */}
      <div
        className="absolute"
        style={{
          left: mousePos.x - 3,
          top: mousePos.y - 3,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "rgba(0, 212, 255, 0.9)",
          pointerEvents: "none",
        }}
      />

      {/* ── Coordinate readout at crosshair intersection ── */}
      {cursorPosition && (
        <div
          className="absolute"
          style={{
            left: mousePos.x + 14,
            top: mousePos.y + 14,
            whiteSpace: "nowrap",
          }}
        >
          <div className="bg-[#0d1117]/90 border border-[#16213e] rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-300 backdrop-blur-sm">
            {cursorPosition[0].toFixed(2)}, {cursorPosition[2].toFixed(2)}
          </div>
        </div>
      )}

      {/* ── Snap visual indicator: colored square (endpoints) or circle (centers) at cursor ── */}
      {snapType && snapType !== "Grid" && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: mousePos.x - 9,
            top: mousePos.y - 9,
            width: 18,
            height: 18,
            border: `2px solid ${snapColors[snapType] || "#ffaa00"}`,
            borderRadius: snapType === "Center" ? "50%" : "2px",
            background: `${snapColors[snapType] || "#ffaa00"}20`,
            boxShadow: `0 0 8px ${snapColors[snapType] || "#ffaa00"}60`,
          }}
        />
      )}

      {/* ── Snap type label ── */}
      {snapType && snapType !== "Grid" && (
        <div
          className="absolute"
          style={{
            left: mousePos.x + 14,
            top: mousePos.y - 24,
            whiteSpace: "nowrap",
          }}
        >
          <div
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm"
            style={{
              background: "rgba(13, 17, 23, 0.9)",
              border: `1px solid ${snapColors[snapType] || "#666"}`,
              color: snapColors[snapType] || "#999",
            }}
          >
            {snapType}
          </div>
        </div>
      )}

      {/* ── Real-time dimension display while drawing ── */}
      {dims && (
        <div
          className="absolute"
          style={{
            left: mousePos.x + 20,
            top: mousePos.y - 44,
            whiteSpace: "nowrap",
          }}
        >
          <div className="bg-[#0d1117]/95 border border-[#00D4FF]/50 rounded-md px-2.5 py-1.5 backdrop-blur-sm shadow-xl shadow-black/40">
            {dims.type === "line" && (
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-mono font-bold text-[#00D4FF]">
                  {dims.length.toFixed(2)}{unit}
                </span>
                <span className="text-[10px] text-slate-500">@</span>
                <span className="text-[12px] font-mono font-bold text-[#ffaa00]">
                  {(((dims.angle % 360) + 360) % 360).toFixed(1)}°
                </span>
              </div>
            )}
            {dims.type === "rect" && (
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-mono font-bold text-[#00D4FF]">
                  {dims.width.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500">×</span>
                <span className="text-[12px] font-mono font-bold text-[#00D4FF]">
                  {dims.height.toFixed(2)}{unit}
                </span>
              </div>
            )}
            {dims.type === "circle" && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">R</span>
                <span className="text-[12px] font-mono font-bold text-[#00D4FF]">
                  {dims.radius.toFixed(2)}{unit}
                </span>
                <span className="text-[9px] text-slate-600">⌀{dims.diameter.toFixed(2)}</span>
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

      {/* ── Dynamic input box at cursor ── */}
      {isDrawing && hasClickPoints && (
        <div
          className="absolute pointer-events-auto"
          style={{
            left: mousePos.x + 20,
            top: mousePos.y + 30,
            whiteSpace: "nowrap",
          }}
        >
          <div className="bg-[#0d1117]/95 border border-[#00D4FF]/50 rounded-md px-1.5 py-1 backdrop-blur-sm shadow-lg flex items-center gap-1">
            <span className="text-[9px] text-slate-500">
              {activeTool === "circle" ? "R:" : activeTool === "rectangle" ? "W,H:" : "L:"}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={dynamicInputValue}
              onChange={(e) => setDynamicInputValue(e.target.value)}
              onKeyDown={handleDynamicInput}
              placeholder={activeTool === "rectangle" ? "w,h" : "value"}
              className="w-16 bg-transparent text-[11px] text-[#00D4FF] font-mono outline-none border-none placeholder:text-slate-600"
              autoComplete="off"
            />
            <span className="text-[9px] text-slate-600">{unit}</span>
          </div>
        </div>
      )}

      {/* Constraint symbols on geometry are rendered via ConstraintIndicators in Three.js */}

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
