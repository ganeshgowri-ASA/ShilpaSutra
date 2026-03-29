"use client";
import React from "react";

export interface BOMItem {
  no: number;
  partName: string;
  material: string;
  qty: number;
  remarks?: string;
}

export interface BOMTableProps {
  items: BOMItem[];
  x: number;
  y: number;
  width: number;
  stroke?: string;
  textColor?: string;
  bgColor?: string;
  altRowColor?: string;
  scale?: number;
}

/**
 * Bill of Materials table matching WACOM STG-2000 drawing style.
 * Columns: No. | Part Name | Material | Qty | Remarks
 */
export default function BOMTable({
  items,
  x,
  y,
  width,
  stroke = "#E0E0E0",
  textColor = "#CCCCCC",
  bgColor = "#1a1a2e",
  altRowColor = "#22223a",
  scale = 1,
}: BOMTableProps) {
  const s = scale;
  const w = width * s;
  const rowH = 6 * s;
  const headerH = 7 * s;
  const fontSize = 2.8 * s;
  const headerFontSize = 2.5 * s;
  const lineW = 0.35 * s;
  const boldLineW = 0.7 * s;
  const pad = 2 * s;
  const totalH = headerH + rowH * items.length;

  // Column widths as fractions of total width
  const cols = [
    { label: "NO.", width: w * 0.08 },
    { label: "PART NAME", width: w * 0.35 },
    { label: "MATERIAL", width: w * 0.25 },
    { label: "QTY", width: w * 0.1 },
    { label: "REMARKS", width: w * 0.22 },
  ];

  // Cumulative x positions
  const colX: number[] = [];
  let cx = 0;
  for (const col of cols) {
    colX.push(cx);
    cx += col.width;
  }

  return (
    <g className="bom-table" transform={`translate(${x},${y})`}>
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

      {/* Header row */}
      <rect
        x={0}
        y={0}
        width={w}
        height={headerH}
        fill={altRowColor}
        stroke={stroke}
        strokeWidth={lineW}
      />

      {/* Column headers */}
      {cols.map((col, i) => (
        <g key={`hdr-${i}`}>
          {/* Column divider */}
          {i > 0 && (
            <line
              x1={colX[i]}
              y1={0}
              x2={colX[i]}
              y2={totalH}
              stroke={stroke}
              strokeWidth={lineW}
            />
          )}
          {/* Header text */}
          <text
            x={colX[i] + col.width / 2}
            y={headerH / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill={textColor}
            fontSize={headerFontSize}
            fontWeight="bold"
            fontFamily="'Courier New', monospace"
          >
            {col.label}
          </text>
        </g>
      ))}

      {/* Data rows */}
      {items.map((item, i) => {
        const ry = headerH + rowH * i;
        const isAlt = i % 2 === 1;
        const values = [
          String(item.no),
          item.partName,
          item.material,
          String(item.qty),
          item.remarks || "",
        ];

        return (
          <g key={`row-${i}`}>
            {/* Alternating row background */}
            {isAlt && (
              <rect
                x={0}
                y={ry}
                width={w}
                height={rowH}
                fill={altRowColor}
              />
            )}

            {/* Row separator */}
            <line
              x1={0}
              y1={ry}
              x2={w}
              y2={ry}
              stroke={stroke}
              strokeWidth={lineW}
              opacity={0.4}
            />

            {/* Cell values */}
            {values.map((val, j) => (
              <text
                key={`cell-${i}-${j}`}
                x={j === 0 || j === 3 ? colX[j] + cols[j].width / 2 : colX[j] + pad}
                y={ry + rowH / 2}
                textAnchor={j === 0 || j === 3 ? "middle" : "start"}
                dominantBaseline="central"
                fill={textColor}
                fontSize={fontSize}
                fontFamily="'Courier New', monospace"
              >
                {val}
              </text>
            ))}
          </g>
        );
      })}
    </g>
  );
}
