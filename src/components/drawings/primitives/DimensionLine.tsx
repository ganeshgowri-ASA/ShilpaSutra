"use client";
import React from "react";

export interface DimensionLineTolerance {
  upper: number;
  lower: number;
}

export interface DimensionLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  value: string;
  unit?: string;
  /** Perpendicular offset from the measured points */
  offset?: number;
  style?: "linear" | "angular" | "radius" | "diameter";
  tolerance?: DimensionLineTolerance;
  /** Line/text color */
  stroke?: string;
  /** Text color for dimension value */
  textColor?: string;
  /** Scale factor: mm to SVG units */
  scale?: number;
}

/**
 * ISO 129 dimension line with extension lines, arrowheads,
 * centered text, and optional tolerance stack.
 */
export default function DimensionLine({
  x1,
  y1,
  x2,
  y2,
  value,
  unit = "",
  offset = 10,
  style = "linear",
  tolerance,
  stroke = "#88CCFF",
  textColor = "#CCCCCC",
  scale = 1,
}: DimensionLineProps) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;

  // Unit direction along the dimension
  const ux = dx / len;
  const uy = dy / len;

  // Perpendicular direction (for offset)
  const px = -uy;
  const py = ux;

  const ext = 2 * scale; // extension line overshoot (2mm)
  const arrowLen = 3 * scale; // arrowhead length (3mm)
  const arrowW = 0.5 * scale; // arrowhead half-width (1mm / 2)
  const lineW = 0.35 * scale;
  const fontSize = 3.5 * scale;
  const tolFontSize = 2.5 * scale;

  // Offset start/end points
  const sx = x1 + px * offset;
  const sy = y1 + py * offset;
  const ex = x2 + px * offset;
  const ey = y2 + py * offset;

  // Midpoint of dimension line
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;

  // Angle for text rotation
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  // Keep text readable (not upside down)
  if (angle > 90 || angle < -90) angle += 180;

  const displayValue = unit ? `${value} ${unit}` : value;

  if (style === "radius" || style === "diameter") {
    const prefix = style === "radius" ? "R" : "\u2300";
    return (
      <g className="dimension-line">
        {/* Leader line from center to edge */}
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={stroke}
          strokeWidth={lineW}
        />
        {/* Arrowhead at end */}
        <polygon
          points={`
            ${x2},${y2}
            ${x2 - ux * arrowLen + px * arrowW},${y2 - uy * arrowLen + py * arrowW}
            ${x2 - ux * arrowLen - px * arrowW},${y2 - uy * arrowLen - py * arrowW}
          `}
          fill={stroke}
        />
        {/* Text */}
        <text
          x={mx}
          y={my - fontSize * 0.4}
          textAnchor="middle"
          fill={textColor}
          fontSize={fontSize}
          fontFamily="'Courier New', monospace"
          transform={`rotate(${angle}, ${mx}, ${my})`}
        >
          {prefix}
          {displayValue}
        </text>
      </g>
    );
  }

  return (
    <g className="dimension-line">
      {/* Extension lines */}
      <line
        x1={x1}
        y1={y1}
        x2={sx + px * ext}
        y2={sy + py * ext}
        stroke={stroke}
        strokeWidth={lineW}
      />
      <line
        x1={x2}
        y1={y2}
        x2={ex + px * ext}
        y2={ey + py * ext}
        stroke={stroke}
        strokeWidth={lineW}
      />

      {/* Dimension line */}
      <line
        x1={sx}
        y1={sy}
        x2={ex}
        y2={ey}
        stroke={stroke}
        strokeWidth={lineW}
      />

      {/* Arrowhead at start */}
      <polygon
        points={`
          ${sx},${sy}
          ${sx + ux * arrowLen + px * arrowW},${sy + uy * arrowLen + py * arrowW}
          ${sx + ux * arrowLen - px * arrowW},${sy + uy * arrowLen - py * arrowW}
        `}
        fill={stroke}
      />

      {/* Arrowhead at end */}
      <polygon
        points={`
          ${ex},${ey}
          ${ex - ux * arrowLen + px * arrowW},${ey - uy * arrowLen + py * arrowW}
          ${ex - ux * arrowLen - px * arrowW},${ey - uy * arrowLen - py * arrowW}
        `}
        fill={stroke}
      />

      {/* Dimension value text */}
      <text
        x={mx}
        y={my - fontSize * 0.4}
        textAnchor="middle"
        fill={textColor}
        fontSize={fontSize}
        fontFamily="'Courier New', monospace"
        transform={`rotate(${angle}, ${mx}, ${my})`}
      >
        {displayValue}
      </text>

      {/* Tolerance stack */}
      {tolerance && (
        <g transform={`rotate(${angle}, ${mx}, ${my})`}>
          <text
            x={mx + fontSize * (displayValue.length / 2 + 1)}
            y={my - fontSize * 0.6}
            textAnchor="start"
            fill={textColor}
            fontSize={tolFontSize}
            fontFamily="'Courier New', monospace"
          >
            +{tolerance.upper}
          </text>
          <text
            x={mx + fontSize * (displayValue.length / 2 + 1)}
            y={my + tolFontSize * 0.3}
            textAnchor="start"
            fill={textColor}
            fontSize={tolFontSize}
            fontFamily="'Courier New', monospace"
          >
            {tolerance.lower}
          </text>
        </g>
      )}
    </g>
  );
}
