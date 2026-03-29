"use client";
import React from "react";

export interface LeaderCalloutProps {
  /** Leader line origin (text side) */
  x: number;
  y: number;
  /** Target point on the drawing */
  targetX: number;
  targetY: number;
  text: string;
  /** BOM reference balloon number */
  balloonNumber?: number;
  style?: "text" | "balloon" | "flag";
  stroke?: string;
  textColor?: string;
  scale?: number;
}

/**
 * Leader callout with angled line, target dot, and text/balloon/flag.
 */
export default function LeaderCallout({
  x,
  y,
  targetX,
  targetY,
  text,
  balloonNumber,
  style = "text",
  stroke = "#E0E0E0",
  textColor = "#CCCCCC",
  scale = 1,
}: LeaderCalloutProps) {
  const lineW = 0.35 * scale;
  const fontSize = 3.5 * scale;
  const dotR = 1 * scale;
  const shelfLen = text.length * fontSize * 0.6 + 4 * scale;
  const balloonR = 5 * scale;

  // Shelf extends to the right from (x, y) by default
  const shelfDir = x > targetX ? 1 : -1;
  const shelfEndX = x + shelfDir * shelfLen;

  if (style === "balloon") {
    const num = balloonNumber ?? 0;
    return (
      <g className="leader-callout-balloon">
        {/* Leader line */}
        <line
          x1={targetX}
          y1={targetY}
          x2={x}
          y2={y}
          stroke={stroke}
          strokeWidth={lineW}
        />
        {/* Target dot */}
        <circle cx={targetX} cy={targetY} r={dotR} fill={stroke} />
        {/* Balloon circle */}
        <circle
          cx={x}
          cy={y}
          r={balloonR}
          fill="none"
          stroke={stroke}
          strokeWidth={lineW * 2}
        />
        {/* Number inside balloon */}
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textColor}
          fontSize={fontSize}
          fontWeight="bold"
          fontFamily="'Courier New', monospace"
        >
          {num}
        </text>
      </g>
    );
  }

  if (style === "flag") {
    const flagW = 6 * scale;
    const flagH = 4 * scale;
    return (
      <g className="leader-callout-flag">
        {/* Leader line */}
        <line
          x1={targetX}
          y1={targetY}
          x2={x}
          y2={y}
          stroke={stroke}
          strokeWidth={lineW}
        />
        {/* Target dot */}
        <circle cx={targetX} cy={targetY} r={dotR} fill={stroke} />
        {/* Flag triangle */}
        <polygon
          points={`${x},${y} ${x + flagW},${y - flagH / 2} ${x + flagW},${y + flagH / 2}`}
          fill={stroke}
          opacity={0.3}
          stroke={stroke}
          strokeWidth={lineW}
        />
        {/* Text next to flag */}
        <text
          x={x + flagW + 2 * scale}
          y={y}
          textAnchor="start"
          dominantBaseline="central"
          fill={textColor}
          fontSize={fontSize}
          fontFamily="'Courier New', monospace"
        >
          {text}
        </text>
      </g>
    );
  }

  // Default: text style with shelf line
  return (
    <g className="leader-callout-text">
      {/* Leader line from target to shelf start */}
      <line
        x1={targetX}
        y1={targetY}
        x2={x}
        y2={y}
        stroke={stroke}
        strokeWidth={lineW}
      />
      {/* Target dot */}
      <circle cx={targetX} cy={targetY} r={dotR} fill={stroke} />
      {/* Horizontal shelf line */}
      <line
        x1={x}
        y1={y}
        x2={shelfEndX}
        y2={y}
        stroke={stroke}
        strokeWidth={lineW}
      />
      {/* Text above shelf */}
      <text
        x={x + (shelfDir * shelfLen) / 2}
        y={y - fontSize * 0.5}
        textAnchor="middle"
        fill={textColor}
        fontSize={fontSize}
        fontFamily="'Courier New', monospace"
      >
        {text}
      </text>
    </g>
  );
}
