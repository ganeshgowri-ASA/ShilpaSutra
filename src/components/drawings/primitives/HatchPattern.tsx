"use client";
import React from "react";

export type HatchMaterial =
  | "steel"
  | "insulation"
  | "concrete"
  | "rubber"
  | "glass"
  | "aluminum"
  | "copper"
  | "air"
  | "water";

export interface HatchPatternProps {
  material: HatchMaterial;
  patternId: string;
  /** Stroke color for pattern lines */
  stroke?: string;
}

/**
 * SVG <defs> hatch patterns per ISO 128-50.
 * Renders a <defs> block containing a <pattern> element.
 * Apply via fill={`url(#${patternId})`} on target shapes.
 */
export default function HatchPattern({
  material,
  patternId,
  stroke = "#E0E0E0",
}: HatchPatternProps) {
  const thin = 0.18;
  const normal = 0.25;

  switch (material) {
    case "steel":
      // 45-degree parallel lines, spacing 2mm
      return (
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={2}
            height={2}
            patternTransform="rotate(45)"
          >
            <line
              x1={0}
              y1={0}
              x2={2}
              y2={0}
              stroke={stroke}
              strokeWidth={thin}
            />
          </pattern>
        </defs>
      );

    case "insulation":
      // Zigzag pattern
      return (
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={4}
            height={4}
          >
            <path
              d="M0,4 L2,0 L4,4"
              fill="none"
              stroke={stroke}
              strokeWidth={thin}
            />
          </pattern>
        </defs>
      );

    case "concrete":
      // Dots + triangles random scatter
      return (
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={8}
            height={8}
          >
            <circle cx={2} cy={2} r={0.4} fill={stroke} />
            <circle cx={6} cy={6} r={0.4} fill={stroke} />
            <circle cx={5} cy={1} r={0.3} fill={stroke} />
            <circle cx={1} cy={5} r={0.3} fill={stroke} />
            <polygon
              points="3,5 4,3.5 5,5"
              fill="none"
              stroke={stroke}
              strokeWidth={thin}
            />
            <polygon
              points="6,8 7,6.5 8,8"
              fill="none"
              stroke={stroke}
              strokeWidth={thin}
            />
          </pattern>
        </defs>
      );

    case "rubber":
      // 45-degree cross-hatch
      return (
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={3}
            height={3}
          >
            <line
              x1={0}
              y1={0}
              x2={3}
              y2={3}
              stroke={stroke}
              strokeWidth={thin}
            />
            <line
              x1={3}
              y1={0}
              x2={0}
              y2={3}
              stroke={stroke}
              strokeWidth={thin}
            />
          </pattern>
        </defs>
      );

    case "glass":
      // Single line near edges only
      return (
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={6}
            height={6}
            patternTransform="rotate(45)"
          >
            <line
              x1={0}
              y1={0.5}
              x2={6}
              y2={0.5}
              stroke={stroke}
              strokeWidth={thin}
            />
          </pattern>
        </defs>
      );

    case "aluminum":
      // 45-degree lines, wider spacing 3mm
      return (
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={3}
            height={3}
            patternTransform="rotate(45)"
          >
            <line
              x1={0}
              y1={0}
              x2={3}
              y2={0}
              stroke={stroke}
              strokeWidth={thin}
            />
          </pattern>
        </defs>
      );

    case "copper":
      // 45-degree lines with perpendicular short dashes
      return (
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={4}
            height={4}
            patternTransform="rotate(45)"
          >
            <line
              x1={0}
              y1={0}
              x2={4}
              y2={0}
              stroke={stroke}
              strokeWidth={thin}
            />
            <line
              x1={2}
              y1={0}
              x2={2}
              y2={1.5}
              stroke={stroke}
              strokeWidth={thin}
            />
          </pattern>
        </defs>
      );

    case "air":
      // Empty — no fill
      return (
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={1}
            height={1}
          />
        </defs>
      );

    case "water":
      // Wavy horizontal lines
      return (
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={8}
            height={4}
          >
            <path
              d="M0,2 Q2,0 4,2 Q6,4 8,2"
              fill="none"
              stroke={stroke}
              strokeWidth={normal}
            />
          </pattern>
        </defs>
      );

    default:
      return null;
  }
}
