"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useCadStore, type ToolId } from "@/stores/cad-store";

const SKETCH_TOOLS: ToolId[] = [
  "line", "arc", "circle", "rectangle", "polygon", "spline", "ellipse", "construction_line",
];

interface SketchOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Professional CAD sketch overlay providing:
 * 1. Full-viewport crosshair cursor
 * 2. Real-time dimension display while drawing
 * 3. Snap point text labels
 * 4. Dynamic input box at cursor
 * 5. Coordinate readout
 * 6. Constraint symbols on geometry
 * 7. Alignment guide indicators
 */
export default function SketchOverlay({ containerRef }: SketchOverlayProps) {
  const activeTool = useCadStore((s) => s.activeTool);
  const sketchPlane = useCadStore((s) => s.sketchPlane);
  const cursorPosition = useCadStore((s) => s.cursorPosition);
  const sketchDrawState = useCadStore((s) => s.sketchDrawState);
  const unit = useCadStore((s) => s.unit);
  const objects = useCadStore((s) => s.objects);
  const dynamicInputValue = useCadStore((s) => s.dynamicInputValue);
  const dynamicInputActive = useCadStore((s) => s.dynamicInputActive);
  const setDynamicInputValue = useCadStore((s) => s.setDynamicInputValue);
  const setDynamicInputActive = useCadStore((s) => s.setDynamicInputActive);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [containerBounds, setContainerBounds] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [isOverCanvas, setIsOverCanvas] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSketchMode = SKETCH_TOOLS.includes(activeTool) || !!sketchPlane;
  const isDrawing = SKETCH_TOOLS.includes(activeTool) && activeTool !== "construction_line" || activeTool === "construction_line";
  const hasClickPoints = sketchDrawState.clickPoints.length > 0;

  // Track container bounds
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateBounds = () => {
      const rect = el.getBoundingClientRect();
      setContainerBounds({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    };
    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  // Track mouse position
  useEffect(() => {
    const el = containerRef.current;
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

  // Compute live dimensions
  const liveDimensions = useCallback(() => {
    if (!hasClickPoints || !sketchDrawState.previewPoint) return null;
    const start = sketchDrawState.clickPoints[0];
    const end = sketchDrawState.previewPoint;

    if (activeTool === "line" || activeTool === "construction_line") {
      const dx = end[0] - start[0];
      const dz = end[2] - start[2];
      const dy = end[1] - start[1];
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const angle = Math.atan2(dz, dx) * (180 / Math.PI);
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
  }, [hasClickPoints, sketchDrawState.previewPoint, sketchDrawState.clickPoints, activeTool]);

  const dims = liveDimensions();

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
        // Tab switches between length/angle (future enhancement)
        return;
      }
      // Enter applies the value - actual application happens in Viewport3D
    },
    [setDynamicInputValue, setDynamicInputActive]
  );

  if (!isSketchMode || !isOverCanvas) return null;

  const snapType = sketchDrawState.snapType;
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
      {/* ── Full-viewport crosshair ── */}
      {/* Vertical line */}
      <div
        className="absolute top-0 bottom-0"
        style={{
          left: mousePos.x,
          width: 1,
          background: "rgba(0, 212, 255, 0.35)",
          transform: "translateX(-0.5px)",
        }}
      />
      {/* Horizontal line */}
      <div
        className="absolute left-0 right-0"
        style={{
          top: mousePos.y,
          height: 1,
          background: "rgba(0, 212, 255, 0.35)",
          transform: "translateY(-0.5px)",
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
          <div className="bg-[#1a1a2e]/95 border border-[#00D4FF]/40 rounded-md px-2 py-1 backdrop-blur-sm shadow-lg">
            {dims.type === "line" && (
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-[#00D4FF]">
                  L: {dims.length.toFixed(1)}{unit}
                </span>
                <span className="text-[11px] font-mono text-[#ffaa00]">
                  A: {(((dims.angle % 360) + 360) % 360).toFixed(1)}°
                </span>
              </div>
            )}
            {dims.type === "rect" && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-[#00D4FF]">
                  {dims.width.toFixed(1)} × {dims.height.toFixed(1)} {unit}
                </span>
              </div>
            )}
            {dims.type === "circle" && (
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-[#00D4FF]">
                  R: {dims.radius.toFixed(2)}{unit}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  ⌀{dims.diameter.toFixed(2)}{unit}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Alignment guide indicators ── */}
      {sketchDrawState.alignH && sketchDrawState.alignRefPoint && (
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
      {sketchDrawState.alignV && sketchDrawState.alignRefPoint && (
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

      {/* ── Constraint symbols on existing geometry ── */}
      {/* These are rendered via the ConstraintIndicators component in Three.js */}
      {/* Here we show additional 2D constraint symbols for sketch entities */}
      {objects.map((obj) => {
        if (!obj.visible) return null;
        const symbols: { symbol: string; color: string }[] = [];

        if (obj.type === "line" && obj.linePoints && obj.linePoints.length === 2) {
          const [p1, p2] = obj.linePoints;
          const dx = Math.abs(p2[0] - p1[0]);
          const dz = Math.abs(p2[2] - p1[2]);
          if (dx < 0.01 && dz > 0.1) symbols.push({ symbol: "V", color: "#4488ff" });
          if (dz < 0.01 && dx > 0.1) symbols.push({ symbol: "H", color: "#44ff88" });
        }

        // We can't easily project 3D→2D without camera info here,
        // so constraint symbols on actual geometry are handled via Three.js Html component
        return null;
      })}

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
