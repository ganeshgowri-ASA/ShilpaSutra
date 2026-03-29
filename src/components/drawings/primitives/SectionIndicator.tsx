"use client";
import React from "react";

export interface SectionIndicatorProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  direction: "left" | "right" | "up" | "down";
  stroke?: string;
  textColor?: string;
  scale?: number;
}

/**
 * Section cut indicator per ISO 128.
 * Long-dash-dot-dash line with semi-circle arrows and labels.
 */
export default function SectionIndicator({
  x1,
  y1,
  x2,
  y2,
  label,
  direction,
  stroke = "#E0E0E0",
  textColor = "#CCCCCC",
  scale = 1,
}: SectionIndicatorProps) {
  const lineW = 0.35 * scale;
  const fontSize = 5 * scale;
  const arrowR = 4 * scale; // semi-circle radius

  // Direction vectors for the arrow semi-circles
  const dirMap: Record<string, { dx: number; dy: number }> = {
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
  };
  const dir = dirMap[direction];

  // Semi-circle arrow path at a point, opening toward direction
  const semiCircleArrow = (cx: number, cy: number) => {
    // Perpendicular to direction for the semicircle arc
    const perpX = -dir.dy;
    const perpY = dir.dx;

    const startX = cx + perpX * arrowR;
    const startY = cy + perpY * arrowR;
    const endX = cx - perpX * arrowR;
    const endY = cy - perpY * arrowR;

    // Arrowhead tip
    const tipX = endX + dir.dx * 2 * scale;
    const tipY = endY + dir.dy * 2 * scale;
    const barb1X = endX - dir.dx * 1.5 * scale + perpX * scale;
    const barb1Y = endY - dir.dy * 1.5 * scale + perpY * scale;

    return (
      <g>
        <path
          d={`M ${startX},${startY} A ${arrowR} ${arrowR} 0 0 ${
            dir.dx + dir.dy > 0 ? 1 : 0
          } ${endX},${endY}`}
          fill="none"
          stroke={stroke}
          strokeWidth={lineW * 2}
        />
        <polygon
          points={`${tipX},${tipY} ${barb1X},${barb1Y} ${endX},${endY}`}
          fill={stroke}
        />
      </g>
    );
  };

  // Label offset from the section line endpoints
  const labelOffset = fontSize * 1.5;

  return (
    <g className="section-indicator">
      {/* Section line: long-dash-dot-dash per ISO 128 */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={stroke}
        strokeWidth={lineW * 1.5}
        strokeDasharray={`${25 * scale},${3 * scale},${5 * scale},${3 * scale}`}
      />

      {/* Semi-circle arrows at both ends */}
      {semiCircleArrow(x1, y1)}
      {semiCircleArrow(x2, y2)}

      {/* Labels at both ends */}
      <text
        x={x1 + dir.dx * labelOffset}
        y={y1 + dir.dy * labelOffset}
        textAnchor="middle"
        dominantBaseline="central"
        fill={textColor}
        fontSize={fontSize}
        fontWeight="bold"
        fontFamily="'Courier New', monospace"
      >
        {label}
      </text>
      <text
        x={x2 + dir.dx * labelOffset}
        y={y2 + dir.dy * labelOffset}
        textAnchor="middle"
        dominantBaseline="central"
        fill={textColor}
        fontSize={fontSize}
        fontWeight="bold"
        fontFamily="'Courier New', monospace"
      >
        {label}
      </text>
    </g>
  );
}
