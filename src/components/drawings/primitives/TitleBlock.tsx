"use client";
import React from "react";

export interface TitleBlockProps {
  equipmentName: string;
  standard: string;
  partNo: string;
  material: string;
  finish?: string;
  weight?: string;
  scale: string;
  sheet: string;
  rev: string;
  project: string;
  drawnBy: string;
  date: string;
  checkedBy?: string;
  approvedBy?: string;
  thirdAngleProjection?: boolean;
  /** Position offset */
  x?: number;
  y?: number;
  width?: number;
  stroke?: string;
  textColor?: string;
  bgColor?: string;
  scaleVal?: number;
}

/**
 * ISO 7200 title block for engineering drawings.
 */
export default function TitleBlock({
  equipmentName,
  standard,
  partNo,
  material,
  finish,
  weight,
  scale: drawingScale,
  sheet,
  rev,
  project,
  drawnBy,
  date,
  checkedBy,
  approvedBy,
  thirdAngleProjection = true,
  x = 0,
  y = 0,
  width = 180,
  stroke = "#E0E0E0",
  textColor = "#CCCCCC",
  bgColor = "#1a1a2e",
  scaleVal = 1,
}: TitleBlockProps) {
  const s = scaleVal;
  const w = width * s;
  const rowH = 7 * s;
  const totalH = rowH * 6;
  const fontSize = 2.8 * s;
  const labelSize = 2 * s;
  const lineW = 0.35 * s;
  const boldLineW = 0.7 * s;

  // Column widths as fractions
  const col1 = w * 0.15; // Labels
  const col2 = w * 0.35; // Values
  const col3 = w * 0.15; // Labels
  const col4 = w * 0.35; // Values

  const cell = (
    cx: number,
    cy: number,
    cw: number,
    ch: number,
    label: string,
    val: string,
    bold = false
  ) => (
    <g key={`${label}-${cx}-${cy}`}>
      <rect
        x={cx}
        y={cy}
        width={cw}
        height={ch}
        fill="none"
        stroke={stroke}
        strokeWidth={lineW}
      />
      <text
        x={cx + 1.5 * s}
        y={cy + labelSize + 0.5 * s}
        fill={stroke}
        fontSize={labelSize}
        fontFamily="'Courier New', monospace"
        opacity={0.6}
      >
        {label}
      </text>
      <text
        x={cx + 1.5 * s}
        y={cy + ch - 1.5 * s}
        fill={textColor}
        fontSize={fontSize}
        fontWeight={bold ? "bold" : "normal"}
        fontFamily="'Courier New', monospace"
      >
        {val}
      </text>
    </g>
  );

  // Third Angle Projection symbol: truncated cone with circle
  const projSymbol = (px: number, py: number) => {
    const r = 2.5 * s;
    return (
      <g>
        {/* Truncated cone (trapezoid side view) */}
        <line
          x1={px - r}
          y1={py + r}
          x2={px - r * 0.5}
          y2={py - r}
          stroke={stroke}
          strokeWidth={lineW}
        />
        <line
          x1={px + r}
          y1={py + r}
          x2={px + r * 0.5}
          y2={py - r}
          stroke={stroke}
          strokeWidth={lineW}
        />
        <line
          x1={px - r}
          y1={py + r}
          x2={px + r}
          y2={py + r}
          stroke={stroke}
          strokeWidth={lineW}
        />
        <line
          x1={px - r * 0.5}
          y1={py - r}
          x2={px + r * 0.5}
          y2={py - r}
          stroke={stroke}
          strokeWidth={lineW}
        />
        {/* Circle to the right */}
        <circle
          cx={px + r * 2}
          cy={py}
          r={r * 0.8}
          fill="none"
          stroke={stroke}
          strokeWidth={lineW}
        />
        <line
          x1={px + r * 2}
          y1={py - r * 0.8}
          x2={px + r * 2}
          y2={py + r * 0.8}
          stroke={stroke}
          strokeWidth={lineW}
        />
      </g>
    );
  };

  return (
    <g className="title-block" transform={`translate(${x},${y})`}>
      {/* Outer border */}
      <rect
        x={0}
        y={0}
        width={w}
        height={totalH}
        fill={bgColor}
        stroke={stroke}
        strokeWidth={boldLineW}
      />

      {/* Row 1: Equipment Name (full width, bold) */}
      <rect
        x={0}
        y={0}
        width={w}
        height={rowH}
        fill="none"
        stroke={stroke}
        strokeWidth={lineW}
      />
      <text
        x={w / 2}
        y={rowH / 2 + fontSize * 0.35}
        textAnchor="middle"
        fill={textColor}
        fontSize={fontSize * 1.3}
        fontWeight="bold"
        fontFamily="'Courier New', monospace"
      >
        {equipmentName}
      </text>

      {/* Row 2 */}
      {cell(0, rowH, col1 + col2, rowH, "PROJECT", project)}
      {cell(col1 + col2, rowH, col3 + col4, rowH, "STANDARD", standard)}

      {/* Row 3 */}
      {cell(0, rowH * 2, col1 + col2, rowH, "PART NO.", partNo)}
      {cell(col1 + col2, rowH * 2, col3 + col4, rowH, "MATERIAL", material)}

      {/* Row 4 */}
      {cell(0, rowH * 3, col1, rowH, "SCALE", drawingScale)}
      {cell(col1, rowH * 3, col2, rowH, "SHEET", sheet)}
      {cell(col1 + col2, rowH * 3, col3, rowH, "REV", rev)}
      {cell(
        col1 + col2 + col3,
        rowH * 3,
        col4,
        rowH,
        "WEIGHT",
        weight || "-"
      )}

      {/* Row 5 */}
      {cell(0, rowH * 4, col1 + col2, rowH, "DRAWN BY", drawnBy)}
      {cell(col1 + col2, rowH * 4, col3 + col4, rowH, "DATE", date)}

      {/* Row 6 */}
      {cell(0, rowH * 5, col1 + col2, rowH, "CHECKED BY", checkedBy || "-")}
      {cell(
        col1 + col2,
        rowH * 5,
        col3 + col4,
        rowH,
        "APPROVED BY",
        approvedBy || "-"
      )}

      {/* Third Angle Projection symbol */}
      {thirdAngleProjection &&
        projSymbol(w - 15 * s, totalH - rowH * 0.5)}

      {/* Finish field (small, in corner) */}
      {finish && (
        <text
          x={w - 2 * s}
          y={rowH * 3 - 1 * s}
          textAnchor="end"
          fill={stroke}
          fontSize={labelSize}
          fontFamily="'Courier New', monospace"
          opacity={0.6}
        >
          FINISH: {finish}
        </text>
      )}
    </g>
  );
}
