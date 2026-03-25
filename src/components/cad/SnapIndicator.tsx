"use client";
import { useMemo } from "react";
import { useCadStore, type CadObject } from "@/stores/cad-store";

export type SnapType =
  | "endpoint"
  | "midpoint"
  | "center"
  | "intersection"
  | "tangent"
  | "perpendicular"
  | "nearest"
  | "quadrant"
  | "grid"
  | "origin"
  | "none";

export interface SnapPoint {
  position: [number, number]; // 2D screen-space or sketch-plane coords
  worldPos: [number, number, number]; // 3D world position
  type: SnapType;
  entityId?: string;
}

// Snap type visual config
const SNAP_CONFIG: Record<SnapType, { color: string; symbol: string; label: string; size: number }> = {
  endpoint:      { color: "#22c55e", symbol: "square",   label: "Endpoint",      size: 7 },
  midpoint:      { color: "#eab308", symbol: "triangle", label: "Midpoint",      size: 7 },
  center:        { color: "#ef4444", symbol: "circle",   label: "Center",        size: 7 },
  intersection:  { color: "#f97316", symbol: "cross",    label: "Intersection",  size: 8 },
  tangent:       { color: "#a855f7", symbol: "tangent",  label: "Tangent",       size: 8 },
  perpendicular: { color: "#06b6d4", symbol: "perp",     label: "Perpendicular", size: 8 },
  nearest:       { color: "#64748b", symbol: "diamond",  label: "Nearest",       size: 6 },
  quadrant:      { color: "#ec4899", symbol: "diamond",  label: "Quadrant",      size: 7 },
  grid:          { color: "#475569", symbol: "dot",      label: "Grid",          size: 4 },
  origin:        { color: "#00D4FF", symbol: "cross",    label: "Origin",        size: 9 },
  none:          { color: "transparent", symbol: "",      label: "",              size: 0 },
};

// Find snap points from sketch entities
function findSnapPoints(objects: CadObject[], sketchPlane: string | null): SnapPoint[] {
  const points: SnapPoint[] = [];
  const Y = 0.02;

  // Origin snap
  points.push({
    position: [0, 0],
    worldPos: [0, Y, 0],
    type: "origin",
  });

  for (const obj of objects) {
    if (!obj.visible || obj.suppressed) continue;

    // Line endpoints and midpoint
    if (obj.type === "line" && obj.linePoints && obj.linePoints.length >= 2) {
      const [p1, p2] = obj.linePoints;
      points.push(
        { position: [p1[0], p1[2]], worldPos: p1, type: "endpoint", entityId: obj.id },
        { position: [p2[0], p2[2]], worldPos: p2, type: "endpoint", entityId: obj.id },
        {
          position: [(p1[0] + p2[0]) / 2, (p1[2] + p2[2]) / 2],
          worldPos: [(p1[0] + p2[0]) / 2, Y, (p1[2] + p2[2]) / 2],
          type: "midpoint",
          entityId: obj.id,
        }
      );
    }

    // Polyline endpoints and midpoints
    if (obj.type === "polyline" && obj.polylinePoints && obj.polylinePoints.length >= 2) {
      for (let i = 0; i < obj.polylinePoints.length; i++) {
        const p = obj.polylinePoints[i];
        points.push({
          position: [p[0], p[2]],
          worldPos: p,
          type: "endpoint",
          entityId: obj.id,
        });
        if (i < obj.polylinePoints.length - 1) {
          const next = obj.polylinePoints[i + 1];
          points.push({
            position: [(p[0] + next[0]) / 2, (p[2] + next[2]) / 2],
            worldPos: [(p[0] + next[0]) / 2, Y, (p[2] + next[2]) / 2],
            type: "midpoint",
            entityId: obj.id,
          });
        }
      }
    }

    // Circle center and quadrant points
    if (obj.type === "circle" && obj.circleCenter && obj.circleRadius) {
      const c = obj.circleCenter;
      const r = obj.circleRadius;
      points.push(
        { position: [c[0], c[2]], worldPos: c, type: "center", entityId: obj.id },
        { position: [c[0] + r, c[2]], worldPos: [c[0] + r, Y, c[2]], type: "quadrant", entityId: obj.id },
        { position: [c[0] - r, c[2]], worldPos: [c[0] - r, Y, c[2]], type: "quadrant", entityId: obj.id },
        { position: [c[0], c[2] + r], worldPos: [c[0], Y, c[2] + r], type: "quadrant", entityId: obj.id },
        { position: [c[0], c[2] - r], worldPos: [c[0], Y, c[2] - r], type: "quadrant", entityId: obj.id }
      );
    }

    // Ellipse center
    if (obj.type === "ellipse" && obj.ellipseCenter) {
      const c = obj.ellipseCenter;
      points.push({
        position: [c[0], c[2]],
        worldPos: c,
        type: "center",
        entityId: obj.id,
      });
      if (obj.ellipseRx && obj.ellipseRy) {
        points.push(
          { position: [c[0] + obj.ellipseRx, c[2]], worldPos: [c[0] + obj.ellipseRx, Y, c[2]], type: "quadrant", entityId: obj.id },
          { position: [c[0] - obj.ellipseRx, c[2]], worldPos: [c[0] - obj.ellipseRx, Y, c[2]], type: "quadrant", entityId: obj.id },
          { position: [c[0], c[2] + obj.ellipseRy], worldPos: [c[0], Y, c[2] + obj.ellipseRy], type: "quadrant", entityId: obj.id },
          { position: [c[0], c[2] - obj.ellipseRy], worldPos: [c[0], Y, c[2] - obj.ellipseRy], type: "quadrant", entityId: obj.id }
        );
      }
    }

    // Rectangle corners and edge midpoints
    if (obj.type === "rectangle" && obj.rectCorners) {
      const [c1, c2] = obj.rectCorners;
      points.push(
        { position: [c1[0], c1[2]], worldPos: c1, type: "endpoint", entityId: obj.id },
        { position: [c2[0], c2[2]], worldPos: c2, type: "endpoint", entityId: obj.id },
        { position: [c1[0], c2[2]], worldPos: [c1[0], Y, c2[2]], type: "endpoint", entityId: obj.id },
        { position: [c2[0], c1[2]], worldPos: [c2[0], Y, c1[2]], type: "endpoint", entityId: obj.id },
        // Edge midpoints
        { position: [(c1[0] + c2[0]) / 2, c1[2]], worldPos: [(c1[0] + c2[0]) / 2, Y, c1[2]], type: "midpoint", entityId: obj.id },
        { position: [(c1[0] + c2[0]) / 2, c2[2]], worldPos: [(c1[0] + c2[0]) / 2, Y, c2[2]], type: "midpoint", entityId: obj.id },
        { position: [c1[0], (c1[2] + c2[2]) / 2], worldPos: [c1[0], Y, (c1[2] + c2[2]) / 2], type: "midpoint", entityId: obj.id },
        { position: [c2[0], (c1[2] + c2[2]) / 2], worldPos: [c2[0], Y, (c1[2] + c2[2]) / 2], type: "midpoint", entityId: obj.id }
      );
    }

    // Arc endpoints and center
    if (obj.type === "arc" && obj.arcPoints && obj.arcPoints.length >= 3) {
      const [p1, center, p2] = obj.arcPoints;
      points.push(
        { position: [p1[0], p1[2]], worldPos: p1, type: "endpoint", entityId: obj.id },
        { position: [p2[0], p2[2]], worldPos: p2, type: "endpoint", entityId: obj.id },
        { position: [center[0], center[2]], worldPos: center, type: "center", entityId: obj.id }
      );
    }

    // Point entity
    if (obj.type === "point" && obj.pointPosition) {
      points.push({
        position: [obj.pointPosition[0], obj.pointPosition[2]],
        worldPos: obj.pointPosition,
        type: "endpoint",
        entityId: obj.id,
      });
    }
  }

  // Find line-line intersections
  const lines = objects.filter(
    (o) => o.type === "line" && o.linePoints && o.linePoints.length >= 2 && o.visible && !o.suppressed
  );
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const l1 = lines[i].linePoints!;
      const l2 = lines[j].linePoints!;
      const ix = lineLineIntersect2D(
        [l1[0][0], l1[0][2]], [l1[1][0], l1[1][2]],
        [l2[0][0], l2[0][2]], [l2[1][0], l2[1][2]]
      );
      if (ix) {
        points.push({
          position: ix,
          worldPos: [ix[0], Y, ix[1]],
          type: "intersection",
        });
      }
    }
  }

  return points;
}

function lineLineIntersect2D(
  a1: [number, number], a2: [number, number],
  b1: [number, number], b2: [number, number]
): [number, number] | null {
  const dax = a2[0] - a1[0], day = a2[1] - a1[1];
  const dbx = b2[0] - b1[0], dby = b2[1] - b1[1];
  const denom = dax * dby - day * dbx;
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((b1[0] - a1[0]) * dby - (b1[1] - a1[1]) * dbx) / denom;
  const u = ((b1[0] - a1[0]) * day - (b1[1] - a1[1]) * dax) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [a1[0] + t * dax, a1[1] + t * day];
}

// Get closest snap point to cursor
export function findClosestSnap(
  cursorPos: [number, number],
  snapPoints: SnapPoint[],
  snapRadius: number = 0.3,
  enabledTypes: Set<SnapType> = new Set(["endpoint", "midpoint", "center", "intersection", "tangent", "perpendicular", "nearest", "quadrant", "origin"])
): SnapPoint | null {
  let closest: SnapPoint | null = null;
  let closestDist = snapRadius;

  // Priority order: endpoint > midpoint > center > intersection > quadrant > tangent > perpendicular > nearest > origin > grid
  const priority: SnapType[] = ["endpoint", "midpoint", "center", "intersection", "quadrant", "tangent", "perpendicular", "nearest", "origin", "grid"];

  for (const type of priority) {
    if (!enabledTypes.has(type)) continue;
    for (const sp of snapPoints) {
      if (sp.type !== type) continue;
      const d = Math.sqrt((sp.position[0] - cursorPos[0]) ** 2 + (sp.position[1] - cursorPos[1]) ** 2);
      if (d < closestDist) {
        closestDist = d;
        closest = sp;
      }
    }
    if (closest) break; // Found a snap at this priority level
  }

  return closest;
}

// ── SVG Snap Indicator Symbols ──

function SnapSymbol({ type, x, y, size }: { type: SnapType; x: number; y: number; size: number }) {
  const config = SNAP_CONFIG[type];
  if (!config || type === "none") return null;

  const s = size || config.size;

  switch (config.symbol) {
    case "square":
      return (
        <rect
          x={x - s} y={y - s} width={s * 2} height={s * 2}
          fill="none" stroke={config.color} strokeWidth={2}
        />
      );
    case "triangle":
      return (
        <polygon
          points={`${x},${y - s} ${x - s},${y + s} ${x + s},${y + s}`}
          fill="none" stroke={config.color} strokeWidth={2}
        />
      );
    case "circle":
      return (
        <circle
          cx={x} cy={y} r={s}
          fill="none" stroke={config.color} strokeWidth={2}
        />
      );
    case "cross":
      return (
        <g stroke={config.color} strokeWidth={2}>
          <line x1={x - s} y1={y} x2={x + s} y2={y} />
          <line x1={x} y1={y - s} x2={x} y2={y + s} />
        </g>
      );
    case "diamond":
      return (
        <polygon
          points={`${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`}
          fill="none" stroke={config.color} strokeWidth={2}
        />
      );
    case "tangent":
      return (
        <g stroke={config.color} strokeWidth={2}>
          <circle cx={x} cy={y} r={s * 0.6} fill="none" />
          <line x1={x - s} y1={y + s * 0.6} x2={x + s} y2={y + s * 0.6} />
        </g>
      );
    case "perp":
      return (
        <g stroke={config.color} strokeWidth={2}>
          <line x1={x} y1={y - s} x2={x} y2={y + s} />
          <line x1={x - s * 0.6} y1={y + s} x2={x + s * 0.6} y2={y + s} />
        </g>
      );
    case "dot":
      return (
        <circle cx={x} cy={y} r={s} fill={config.color} />
      );
    default:
      return null;
  }
}

// ── Main Snap Indicator Overlay ──

interface SnapIndicatorOverlayProps {
  containerWidth: number;
  containerHeight: number;
  activeSnap: SnapPoint | null;
  allSnapPoints?: SnapPoint[];
  showAllSnaps?: boolean;
}

export default function SnapIndicatorOverlay({
  containerWidth,
  containerHeight,
  activeSnap,
  allSnapPoints,
  showAllSnaps = false,
}: SnapIndicatorOverlayProps) {
  const sketchPlane = useCadStore((s) => s.sketchPlane);

  if (!sketchPlane) return null;

  // Convert world position to screen position (simplified - assumes centered viewport)
  const worldToScreen = (pos: [number, number]): [number, number] => {
    // Simplified projection: scale factor of ~100px per world unit, centered
    const scale = 100;
    return [
      containerWidth / 2 + pos[0] * scale,
      containerHeight / 2 - pos[1] * scale, // flip Y
    ];
  };

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-[15]"
      width={containerWidth}
      height={containerHeight}
      style={{ overflow: "hidden" }}
    >
      {/* Show all snap points as subtle markers when enabled */}
      {showAllSnaps && allSnapPoints?.map((sp, i) => {
        const [sx, sy] = worldToScreen(sp.position);
        if (sx < 0 || sx > containerWidth || sy < 0 || sy > containerHeight) return null;
        const config = SNAP_CONFIG[sp.type];
        return (
          <g key={`snap-${i}`} opacity={0.25}>
            <SnapSymbol type={sp.type} x={sx} y={sy} size={config.size * 0.6} />
          </g>
        );
      })}

      {/* Active snap indicator - prominent */}
      {activeSnap && activeSnap.type !== "none" && (() => {
        const [sx, sy] = worldToScreen(activeSnap.position);
        const config = SNAP_CONFIG[activeSnap.type];
        return (
          <g>
            {/* Glow effect */}
            <circle cx={sx} cy={sy} r={14} fill={config.color} opacity={0.1} />

            {/* Symbol */}
            <SnapSymbol type={activeSnap.type} x={sx} y={sy} size={config.size} />

            {/* Label */}
            <rect
              x={sx + 12} y={sy - 8}
              width={config.label.length * 6 + 8} height={14}
              rx={3}
              fill="#0d1117"
              fillOpacity={0.9}
              stroke={config.color}
              strokeWidth={1}
              strokeOpacity={0.5}
            />
            <text
              x={sx + 16} y={sy + 3}
              fill={config.color}
              fontSize={9}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {config.label}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

// Re-export for use in other components
export { findSnapPoints, SNAP_CONFIG };
export type { SnapPoint as SnapPointData };
