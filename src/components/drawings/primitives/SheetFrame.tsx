"use client";
import React from "react";

export interface SheetFrameProps {
  size: "A4" | "A3" | "A2" | "A1";
  orientation: "landscape" | "portrait";
  stroke?: string;
  textColor?: string;
  bgColor?: string;
  scale?: number;
  children?: React.ReactNode;
}

/** ISO sheet sizes in mm [width, height] in portrait orientation */
const SHEET_SIZES: Record<string, [number, number]> = {
  A4: [210, 297],
  A3: [297, 420],
  A2: [420, 594],
  A1: [594, 841],
};

const VERT_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const HORIZ_LABELS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
];

/**
 * Drawing sheet frame with border, grid references, center marks, and trim marks.
 */
export default function SheetFrame({
  size,
  orientation,
  stroke = "#E0E0E0",
  textColor = "#888888",
  bgColor = "#1a1a2e",
  scale = 1,
  children,
}: SheetFrameProps) {
  const s = scale;
  const base = SHEET_SIZES[size];
  const [sheetW, sheetH] =
    orientation === "landscape" ? [base[1], base[0]] : base;

  const w = sheetW * s;
  const h = sheetH * s;

  const marginTop = 20 * s;
  const marginRight = 20 * s;
  const marginBottom = 20 * s;
  const marginLeft = 25 * s; // binding side wider

  const lineW = 0.35 * s;
  const boldLineW = 0.7 * s;
  const fontSize = 3 * s;
  const markLen = 5 * s;

  const innerX = marginLeft;
  const innerY = marginTop;
  const innerW = w - marginLeft - marginRight;
  const innerH = h - marginTop - marginBottom;

  // Grid cell sizes
  const cellW = innerW / 12;
  const cellH = innerH / 8;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      className="sheet-frame"
    >
      {/* Background */}
      <rect x={0} y={0} width={w} height={h} fill={bgColor} />

      {/* Trim marks at corners */}
      {[
        [0, 0],
        [w, 0],
        [0, h],
        [w, h],
      ].map(([cx, cy], i) => {
        const dx = cx === 0 ? 1 : -1;
        const dy = cy === 0 ? 1 : -1;
        return (
          <g key={`trim-${i}`}>
            <line
              x1={cx}
              y1={cy}
              x2={cx + dx * markLen}
              y2={cy}
              stroke={stroke}
              strokeWidth={lineW}
            />
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy + dy * markLen}
              stroke={stroke}
              strokeWidth={lineW}
            />
          </g>
        );
      })}

      {/* Center marks at sheet edges */}
      {[
        [w / 2, 0, 0, 1],
        [w / 2, h, 0, -1],
        [0, h / 2, 1, 0],
        [w, h / 2, -1, 0],
      ].map(([cx, cy, dx, dy], i) => (
        <g key={`center-${i}`}>
          <line
            x1={cx as number}
            y1={cy as number}
            x2={(cx as number) + (dx as number) * markLen}
            y2={(cy as number) + (dy as number) * markLen}
            stroke={stroke}
            strokeWidth={lineW}
          />
        </g>
      ))}

      {/* Drawing border */}
      <rect
        x={innerX}
        y={innerY}
        width={innerW}
        height={innerH}
        fill="none"
        stroke={stroke}
        strokeWidth={boldLineW}
      />

      {/* Grid reference labels — horizontal (1-12 across top & bottom) */}
      {HORIZ_LABELS.map((label, i) => (
        <g key={`h-${i}`}>
          <text
            x={innerX + cellW * i + cellW / 2}
            y={innerY - fontSize * 0.6}
            textAnchor="middle"
            fill={textColor}
            fontSize={fontSize}
            fontFamily="'Courier New', monospace"
          >
            {label}
          </text>
          <text
            x={innerX + cellW * i + cellW / 2}
            y={innerY + innerH + fontSize * 1.2}
            textAnchor="middle"
            fill={textColor}
            fontSize={fontSize}
            fontFamily="'Courier New', monospace"
          >
            {label}
          </text>
          {/* Grid tick marks */}
          <line
            x1={innerX + cellW * i}
            y1={innerY}
            x2={innerX + cellW * i}
            y2={innerY - 2 * s}
            stroke={stroke}
            strokeWidth={lineW}
          />
          <line
            x1={innerX + cellW * i}
            y1={innerY + innerH}
            x2={innerX + cellW * i}
            y2={innerY + innerH + 2 * s}
            stroke={stroke}
            strokeWidth={lineW}
          />
        </g>
      ))}

      {/* Grid reference labels — vertical (A-H along left & right) */}
      {VERT_LABELS.map((label, i) => (
        <g key={`v-${i}`}>
          <text
            x={innerX - fontSize * 1.2}
            y={innerY + cellH * i + cellH / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill={textColor}
            fontSize={fontSize}
            fontFamily="'Courier New', monospace"
          >
            {label}
          </text>
          <text
            x={innerX + innerW + fontSize * 1.2}
            y={innerY + cellH * i + cellH / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill={textColor}
            fontSize={fontSize}
            fontFamily="'Courier New', monospace"
          >
            {label}
          </text>
          {/* Grid tick marks */}
          <line
            x1={innerX}
            y1={innerY + cellH * i}
            x2={innerX - 2 * s}
            y2={innerY + cellH * i}
            stroke={stroke}
            strokeWidth={lineW}
          />
          <line
            x1={innerX + innerW}
            y1={innerY + cellH * i}
            x2={innerX + innerW + 2 * s}
            y2={innerY + cellH * i}
            stroke={stroke}
            strokeWidth={lineW}
          />
        </g>
      ))}

      {/* Drawing content area */}
      <g transform={`translate(${innerX},${innerY})`}>{children}</g>
    </svg>
  );
}
