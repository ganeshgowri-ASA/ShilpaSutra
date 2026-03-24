"use client";
import { useMemo } from "react";
import { useCadStore } from "@/stores/cad-store";
import { useSettingsStore } from "@/stores/settings-store";

interface SketchGridProps {
  width: number;
  height: number;
}

/**
 * Professional CAD sketch grid with configurable major/minor grid lines.
 * Renders as an SVG overlay matching SolidWorks-style grid appearance.
 * - Minor grid lines: thin, subtle
 * - Major grid lines: slightly thicker, more visible
 * - Origin crosshair always visible
 */
export default function SketchGrid({ width, height }: SketchGridProps) {
  const sketchPlane = useCadStore((s) => s.sketchPlane);
  const gridSize = useSettingsStore((s) => s.gridSize);
  const showGrid = useSettingsStore((s) => s.showGrid);

  const gridConfig = useMemo(() => {
    const minorSpacing = gridSize; // e.g., 10px per minor grid cell
    const majorSpacing = minorSpacing * 5; // every 5th line is a major line
    const cx = width / 2;
    const cy = height / 2;

    const minorLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const majorLines: { x1: number; y1: number; x2: number; y2: number }[] = [];

    // Vertical lines
    for (let x = cx % minorSpacing; x < width; x += minorSpacing) {
      const isMajor = Math.abs((x - cx) % majorSpacing) < 0.5;
      (isMajor ? majorLines : minorLines).push({ x1: x, y1: 0, x2: x, y2: height });
    }

    // Horizontal lines
    for (let y = cy % minorSpacing; y < height; y += minorSpacing) {
      const isMajor = Math.abs((y - cy) % majorSpacing) < 0.5;
      (isMajor ? majorLines : minorLines).push({ x1: 0, y1: y, x2: width, y2: y });
    }

    return { minorLines, majorLines, cx, cy };
  }, [width, height, gridSize]);

  if (!sketchPlane || !showGrid) return null;

  const planeColors: Record<string, { minor: string; major: string; origin: string }> = {
    xy: { minor: "rgba(99, 102, 241, 0.06)", major: "rgba(99, 102, 241, 0.12)", origin: "rgba(99, 102, 241, 0.4)" },
    xz: { minor: "rgba(34, 197, 94, 0.06)", major: "rgba(34, 197, 94, 0.12)", origin: "rgba(34, 197, 94, 0.4)" },
    yz: { minor: "rgba(239, 68, 68, 0.06)", major: "rgba(239, 68, 68, 0.12)", origin: "rgba(239, 68, 68, 0.4)" },
  };

  const colors = planeColors[sketchPlane] || planeColors.xz;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-[1]"
      width={width}
      height={height}
      style={{ overflow: "hidden" }}
    >
      {/* Minor grid lines */}
      {gridConfig.minorLines.map((l, i) => (
        <line
          key={`minor-${i}`}
          x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={colors.minor}
          strokeWidth={0.5}
        />
      ))}

      {/* Major grid lines */}
      {gridConfig.majorLines.map((l, i) => (
        <line
          key={`major-${i}`}
          x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={colors.major}
          strokeWidth={1}
        />
      ))}

      {/* Origin crosshair - always visible on sketch plane */}
      <line
        x1={gridConfig.cx} y1={0}
        x2={gridConfig.cx} y2={height}
        stroke={colors.origin}
        strokeWidth={1.5}
        strokeDasharray="6 3"
      />
      <line
        x1={0} y1={gridConfig.cy}
        x2={width} y2={gridConfig.cy}
        stroke={colors.origin}
        strokeWidth={1.5}
        strokeDasharray="6 3"
      />

      {/* Origin marker */}
      <circle cx={gridConfig.cx} cy={gridConfig.cy} r={4} fill="none" stroke={colors.origin} strokeWidth={1.5} />
      <circle cx={gridConfig.cx} cy={gridConfig.cy} r={1.5} fill={colors.origin} />

      {/* Grid spacing label */}
      <text
        x={gridConfig.cx + 8}
        y={gridConfig.cy - 8}
        fill={colors.origin}
        fontSize={9}
        fontFamily="monospace"
        opacity={0.7}
      >
        {gridSize}mm
      </text>
    </svg>
  );
}
