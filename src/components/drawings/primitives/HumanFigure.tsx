"use client";
import React from "react";

export interface HumanFigureProps {
  x: number;
  y: number;
  /** Height of figure in mm (default 1700mm) */
  height?: number;
  /** Drawing scale factor */
  scale: number;
  stroke?: string;
  textColor?: string;
  /** Show height dimension line */
  showDimension?: boolean;
}

/**
 * Simple human silhouette for scale reference in engineering drawings.
 * Proportional: head, torso, arms, legs.
 */
export default function HumanFigure({
  x,
  y,
  height = 1700,
  scale,
  stroke = "#E0E0E0",
  textColor = "#CCCCCC",
  showDimension = true,
}: HumanFigureProps) {
  const h = height * scale;
  const lineW = 0.35 * scale;
  const fontSize = 3 * scale;

  // Proportions relative to total height
  const headR = h * 0.04; // head radius
  const headCY = y - h + headR; // top of head
  const neckY = headCY + headR;
  const shoulderY = neckY + h * 0.05;
  const shoulderW = h * 0.12;
  const waistY = shoulderY + h * 0.28;
  const hipY = waistY + h * 0.05;
  const hipW = h * 0.1;
  const kneeY = hipY + h * 0.25;
  const footY = y; // ground level
  const armEndY = waistY + h * 0.05;

  return (
    <g className="human-figure" opacity={0.5}>
      {/* Head */}
      <circle
        cx={x}
        cy={headCY}
        r={headR}
        fill={stroke}
        fillOpacity={0.15}
        stroke={stroke}
        strokeWidth={lineW}
      />

      {/* Neck */}
      <line
        x1={x}
        y1={neckY}
        x2={x}
        y2={shoulderY}
        stroke={stroke}
        strokeWidth={lineW}
      />

      {/* Shoulders */}
      <line
        x1={x - shoulderW}
        y1={shoulderY}
        x2={x + shoulderW}
        y2={shoulderY}
        stroke={stroke}
        strokeWidth={lineW}
      />

      {/* Torso */}
      <line
        x1={x}
        y1={shoulderY}
        x2={x}
        y2={waistY}
        stroke={stroke}
        strokeWidth={lineW}
      />

      {/* Arms */}
      <line
        x1={x - shoulderW}
        y1={shoulderY}
        x2={x - shoulderW * 0.8}
        y2={armEndY}
        stroke={stroke}
        strokeWidth={lineW}
      />
      <line
        x1={x + shoulderW}
        y1={shoulderY}
        x2={x + shoulderW * 0.8}
        y2={armEndY}
        stroke={stroke}
        strokeWidth={lineW}
      />

      {/* Hips */}
      <line
        x1={x - hipW}
        y1={hipY}
        x2={x + hipW}
        y2={hipY}
        stroke={stroke}
        strokeWidth={lineW}
      />

      {/* Waist to hips */}
      <line
        x1={x}
        y1={waistY}
        x2={x}
        y2={hipY}
        stroke={stroke}
        strokeWidth={lineW}
      />

      {/* Left leg */}
      <line
        x1={x - hipW}
        y1={hipY}
        x2={x - hipW * 0.6}
        y2={kneeY}
        stroke={stroke}
        strokeWidth={lineW}
      />
      <line
        x1={x - hipW * 0.6}
        y1={kneeY}
        x2={x - hipW * 0.5}
        y2={footY}
        stroke={stroke}
        strokeWidth={lineW}
      />

      {/* Right leg */}
      <line
        x1={x + hipW}
        y1={hipY}
        x2={x + hipW * 0.6}
        y2={kneeY}
        stroke={stroke}
        strokeWidth={lineW}
      />
      <line
        x1={x + hipW * 0.6}
        y1={kneeY}
        x2={x + hipW * 0.5}
        y2={footY}
        stroke={stroke}
        strokeWidth={lineW}
      />

      {/* Height dimension line */}
      {showDimension && (
        <g>
          <line
            x1={x + shoulderW + 4 * scale}
            y1={y}
            x2={x + shoulderW + 4 * scale}
            y2={y - h}
            stroke={textColor}
            strokeWidth={lineW}
            opacity={0.6}
          />
          {/* Bottom tick */}
          <line
            x1={x + shoulderW + 2 * scale}
            y1={y}
            x2={x + shoulderW + 6 * scale}
            y2={y}
            stroke={textColor}
            strokeWidth={lineW}
            opacity={0.6}
          />
          {/* Top tick */}
          <line
            x1={x + shoulderW + 2 * scale}
            y1={y - h}
            x2={x + shoulderW + 6 * scale}
            y2={y - h}
            stroke={textColor}
            strokeWidth={lineW}
            opacity={0.6}
          />
          {/* Label */}
          <text
            x={x + shoulderW + 8 * scale}
            y={y - h / 2}
            textAnchor="start"
            dominantBaseline="central"
            fill={textColor}
            fontSize={fontSize}
            fontFamily="'Courier New', monospace"
            opacity={0.6}
          >
            {height} mm
          </text>
        </g>
      )}
    </g>
  );
}
