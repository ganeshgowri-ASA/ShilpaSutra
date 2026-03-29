"use client";
import React from "react";

export type ValveType =
  | "gate"
  | "globe"
  | "check"
  | "ball"
  | "butterfly"
  | "relief"
  | "solenoid";

export interface ValveSymbolProps {
  x: number;
  y: number;
  type: ValveType;
  rotation?: number;
  scale?: number;
  stroke?: string;
}

/**
 * Standard P&ID valve symbols per ISO 10628.
 */
export default function ValveSymbol({
  x,
  y,
  type,
  rotation = 0,
  scale = 1,
  stroke = "#E0E0E0",
}: ValveSymbolProps) {
  const s = scale;
  const lineW = 0.5 * s;
  const sz = 8 * s; // base symbol size

  const content = () => {
    switch (type) {
      case "gate":
        // Two triangles meeting at center (bowtie)
        return (
          <>
            <polygon
              points={`${-sz},${-sz / 2} ${-sz},${sz / 2} ${0},${0}`}
              fill="none"
              stroke={stroke}
              strokeWidth={lineW}
            />
            <polygon
              points={`${sz},${-sz / 2} ${sz},${sz / 2} ${0},${0}`}
              fill="none"
              stroke={stroke}
              strokeWidth={lineW}
            />
            {/* Stem */}
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={-sz}
              stroke={stroke}
              strokeWidth={lineW}
            />
            <line
              x1={-sz * 0.4}
              y1={-sz}
              x2={sz * 0.4}
              y2={-sz}
              stroke={stroke}
              strokeWidth={lineW}
            />
          </>
        );

      case "globe":
        // Two triangles with a circle in the middle
        return (
          <>
            <polygon
              points={`${-sz},${-sz / 2} ${-sz},${sz / 2} ${0},${0}`}
              fill="none"
              stroke={stroke}
              strokeWidth={lineW}
            />
            <polygon
              points={`${sz},${-sz / 2} ${sz},${sz / 2} ${0},${0}`}
              fill="none"
              stroke={stroke}
              strokeWidth={lineW}
            />
            <circle
              cx={0}
              cy={0}
              r={sz * 0.25}
              fill="none"
              stroke={stroke}
              strokeWidth={lineW}
            />
          </>
        );

      case "check":
        // Single triangle with arrow direction
        return (
          <>
            <polygon
              points={`${-sz},${-sz / 2} ${-sz},${sz / 2} ${sz},${0}`}
              fill="none"
              stroke={stroke}
              strokeWidth={lineW}
            />
            {/* Stopper line */}
            <line
              x1={sz}
              y1={-sz / 2}
              x2={sz}
              y2={sz / 2}
              stroke={stroke}
              strokeWidth={lineW * 2}
            />
          </>
        );

      case "ball":
        // Two triangles with filled circle
        return (
          <>
            <polygon
              points={`${-sz},${-sz / 2} ${-sz},${sz / 2} ${0},${0}`}
              fill="none"
              stroke={stroke}
              strokeWidth={lineW}
            />
            <polygon
              points={`${sz},${-sz / 2} ${sz},${sz / 2} ${0},${0}`}
              fill="none"
              stroke={stroke}
              strokeWidth={lineW}
            />
            <circle
              cx={0}
              cy={0}
              r={sz * 0.3}
              fill={stroke}
              fillOpacity={0.3}
              stroke={stroke}
              strokeWidth={lineW}
            />
          </>
        );

      case "butterfly":
        // Circle with a line through it
        return (
          <>
            <circle
              cx={0}
              cy={0}
              r={sz * 0.6}
              fill="none"
              stroke={stroke}
              strokeWidth={lineW}
            />
            <line
              x1={-sz * 0.6}
              y1={0}
              x2={sz * 0.6}
              y2={0}
              stroke={stroke}
              strokeWidth={lineW * 2}
            />
            {/* Disc */}
            <line
              x1={0}
              y1={-sz * 0.5}
              x2={0}
              y2={sz * 0.5}
              stroke={stroke}
              strokeWidth={lineW}
            />
          </>
        );

      case "relief":
        // Triangle pointing up with spring symbol
        return (
          <>
            <polygon
              points={`${-sz},${sz / 2} ${sz},${sz / 2} ${0},${-sz / 2}`}
              fill="none"
              stroke={stroke}
              strokeWidth={lineW}
            />
            {/* Spring zigzag on top */}
            <path
              d={`M${0},${-sz / 2} L${-sz * 0.2},${-sz * 0.7} L${sz * 0.2},${-sz * 0.9} L${-sz * 0.2},${-sz * 1.1} L${0},${-sz * 1.2}`}
              fill="none"
              stroke={stroke}
              strokeWidth={lineW}
            />
          </>
        );

      case "solenoid":
        // Gate valve with solenoid box on top
        return (
          <>
            <polygon
              points={`${-sz},${-sz / 2} ${-sz},${sz / 2} ${0},${0}`}
              fill="none"
              stroke={stroke}
              strokeWidth={lineW}
            />
            <polygon
              points={`${sz},${-sz / 2} ${sz},${sz / 2} ${0},${0}`}
              fill="none"
              stroke={stroke}
              strokeWidth={lineW}
            />
            {/* Stem */}
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={-sz * 0.6}
              stroke={stroke}
              strokeWidth={lineW}
            />
            {/* Solenoid box */}
            <rect
              x={-sz * 0.4}
              y={-sz * 1.2}
              width={sz * 0.8}
              height={sz * 0.6}
              fill="none"
              stroke={stroke}
              strokeWidth={lineW}
            />
            {/* Solenoid diagonal */}
            <line
              x1={-sz * 0.3}
              y1={-sz * 0.7}
              x2={sz * 0.3}
              y2={-sz * 1.1}
              stroke={stroke}
              strokeWidth={lineW}
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <g
      className={`valve-symbol valve-${type}`}
      transform={`translate(${x},${y}) rotate(${rotation})`}
    >
      {content()}
    </g>
  );
}
