"use client";
import React from "react";

export interface SpecificationItem {
  label: string;
  value: string;
  unit?: string;
}

export interface SpecificationTableProps {
  specs: SpecificationItem[];
  x: number;
  y: number;
  width: number;
  title?: string;
  stroke?: string;
  textColor?: string;
  bgColor?: string;
  altRowColor?: string;
  scale?: number;
}

/**
 * Bordered specification table with alternating row shading.
 * Matches CME-TA-GA specification panel style.
 */
export default function SpecificationTable({
  specs,
  x,
  y,
  width,
  title,
  stroke = "#E0E0E0",
  textColor = "#CCCCCC",
  bgColor = "#1a1a2e",
  altRowColor = "#22223a",
  scale = 1,
}: SpecificationTableProps) {
  const s = scale;
  const w = width * s;
  const rowH = 6 * s;
  const headerH = title ? 8 * s : 0;
  const fontSize = 2.8 * s;
  const labelSize = 2.5 * s;
  const lineW = 0.35 * s;
  const boldLineW = 0.7 * s;
  const labelColW = w * 0.55;
  const valueColW = w * 0.45;
  const totalH = headerH + rowH * specs.length;
  const pad = 2 * s;

  return (
    <g className="specification-table" transform={`translate(${x},${y})`}>
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

      {/* Title bar */}
      {title && (
        <>
          <rect
            x={0}
            y={0}
            width={w}
            height={headerH}
            fill={altRowColor}
            stroke={stroke}
            strokeWidth={lineW}
          />
          <text
            x={w / 2}
            y={headerH / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill={textColor}
            fontSize={fontSize * 1.1}
            fontWeight="bold"
            fontFamily="'Courier New', monospace"
          >
            {title}
          </text>
        </>
      )}

      {/* Column divider */}
      <line
        x1={labelColW}
        y1={headerH}
        x2={labelColW}
        y2={totalH}
        stroke={stroke}
        strokeWidth={lineW}
      />

      {/* Rows */}
      {specs.map((spec, i) => {
        const ry = headerH + rowH * i;
        const isAlt = i % 2 === 1;
        const displayVal = spec.unit
          ? `${spec.value} ${spec.unit}`
          : spec.value;

        return (
          <g key={`spec-${i}`}>
            {/* Row background */}
            {isAlt && (
              <rect
                x={0}
                y={ry}
                width={w}
                height={rowH}
                fill={altRowColor}
              />
            )}

            {/* Row border */}
            <line
              x1={0}
              y1={ry}
              x2={w}
              y2={ry}
              stroke={stroke}
              strokeWidth={lineW}
              opacity={0.4}
            />

            {/* Label */}
            <text
              x={pad}
              y={ry + rowH / 2}
              textAnchor="start"
              dominantBaseline="central"
              fill={stroke}
              fontSize={labelSize}
              fontFamily="'Courier New', monospace"
            >
              {spec.label}
            </text>

            {/* Value */}
            <text
              x={labelColW + pad}
              y={ry + rowH / 2}
              textAnchor="start"
              dominantBaseline="central"
              fill={textColor}
              fontSize={fontSize}
              fontFamily="'Courier New', monospace"
            >
              {displayVal}
            </text>
          </g>
        );
      })}
    </g>
  );
}
