"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// ThermalCyclingChamber — IEC 61215 MQT 11 Thermal Cycling Chamber
// Professional multi-view GA drawing with parametric dimensions
// ═══════════════════════════════════════════════════════════════════════════════

import React from "react";

export interface ThermalCyclingChamberParams {
  chamberWidth?: number;   // mm
  chamberHeight?: number;  // mm
  chamberDepth?: number;   // mm
  shelfCount?: number;
  tempMin?: number;        // °C
  tempMax?: number;        // °C
  rampRate?: number;       // °C/min
}

const DEFAULTS: Required<ThermalCyclingChamberParams> = {
  chamberWidth: 1500,
  chamberHeight: 2200,
  chamberDepth: 1200,
  shelfCount: 3,
  tempMin: -40,
  tempMax: 85,
  rampRate: 3,
};

const C = "#c9d1d9"; const CA = "#00D4FF"; const CD = "#8b949e"; const CT = "#58a6ff"; const BG = "#0d1117";

function DimH({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  return (
    <g stroke={CD} strokeWidth={0.5} fill="none">
      <line x1={x1} y1={y - 12} x2={x1} y2={y + 3} /><line x1={x2} y1={y - 12} x2={x2} y2={y + 3} />
      <line x1={x1 + 3} y1={y} x2={x2 - 3} y2={y} />
      <polygon points={`${x1},${y} ${x1 + 4},${y - 1.5} ${x1 + 4},${y + 1.5}`} fill={CD} stroke="none" />
      <polygon points={`${x2},${y} ${x2 - 4},${y - 1.5} ${x2 - 4},${y + 1.5}`} fill={CD} stroke="none" />
      <text x={(x1 + x2) / 2} y={y - 3} fontSize={5} textAnchor="middle" fill={CA} stroke="none" fontFamily="monospace">{label}</text>
    </g>
  );
}
function DimV({ y1, y2, x, label }: { y1: number; y2: number; x: number; label: string }) {
  const mid = (y1 + y2) / 2;
  return (
    <g stroke={CD} strokeWidth={0.5} fill="none">
      <line x1={x - 12} y1={y1} x2={x + 3} y2={y1} /><line x1={x - 12} y1={y2} x2={x + 3} y2={y2} />
      <line x1={x} y1={y1 + 3} x2={x} y2={y2 - 3} />
      <polygon points={`${x},${y1} ${x - 1.5},${y1 + 4} ${x + 1.5},${y1 + 4}`} fill={CD} stroke="none" />
      <polygon points={`${x},${y2} ${x - 1.5},${y2 - 4} ${x + 1.5},${y2 - 4}`} fill={CD} stroke="none" />
      <text x={x - 4} y={mid} fontSize={5} textAnchor="middle" fill={CA} stroke="none" fontFamily="monospace"
        transform={`rotate(-90,${x - 4},${mid})`}>{label}</text>
    </g>
  );
}

function FrontView({ ox, oy, p }: { ox: number; oy: number; p: Required<ThermalCyclingChamberParams> }) {
  const s = 0.07;
  const w = p.chamberWidth * s, h = p.chamberHeight * s;
  const shelfSp = h / (p.shelfCount + 1);

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={w / 2} y={-8} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">FRONT VIEW</text>
      {/* Outer casing */}
      <rect x={-5} y={-5} width={w + 10} height={h + 10} fill="none" stroke={C} strokeWidth={1.2} rx={2} />
      {/* Inner chamber */}
      <rect x={5} y={5} width={w - 10} height={h - 10} fill="none" stroke={C} strokeWidth={0.7} />
      {/* Insulation hatch pattern */}
      {Array.from({ length: 20 }).map((_, i) => (
        <line key={i} x1={-5 + (w + 10) * (i / 20)} y1={-5} x2={-5 + (w + 10) * (i / 20) + 5} y2={0}
          stroke={CD} strokeWidth={0.15} />
      ))}
      {/* Shelves */}
      {Array.from({ length: p.shelfCount }).map((_, i) => {
        const sy = 5 + shelfSp * (i + 1);
        return (
          <g key={i}>
            <rect x={8} y={sy - 1} width={w - 16} height={2} fill="none" stroke={CA} strokeWidth={0.5} />
            <text x={w - 12} y={sy + 4} fontSize={3} fill={CA} fontFamily="monospace">SHELF {i + 1}</text>
          </g>
        );
      })}
      {/* Heating coils (side) */}
      {[0.2, 0.5, 0.8].map((f, i) => (
        <g key={i}>
          <path d={`M2,${h * f} Q4,${h * f - 3} 2,${h * f - 6} Q0,${h * f - 9} 2,${h * f - 12}`}
            fill="none" stroke="#ef4444" strokeWidth={0.4} />
          <path d={`M${w - 2},${h * f} Q${w - 4},${h * f - 3} ${w - 2},${h * f - 6} Q${w},${h * f - 9} ${w - 2},${h * f - 12}`}
            fill="none" stroke="#3b82f6" strokeWidth={0.4} />
        </g>
      ))}
      <text x={-8} y={h * 0.5} fontSize={3} fill="#ef4444" fontFamily="monospace" transform={`rotate(-90,-8,${h * 0.5})`}>HEAT</text>
      <text x={w + 8} y={h * 0.5} fontSize={3} fill="#3b82f6" fontFamily="monospace" transform={`rotate(90,${w + 8},${h * 0.5})`}>COOL</text>
      {/* Fan at top */}
      <circle cx={w / 2} cy={12} r={8} fill="none" stroke={CD} strokeWidth={0.5} />
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return <line key={i} x1={w / 2} y1={12} x2={w / 2 + Math.cos(a) * 7} y2={12 + Math.sin(a) * 7} stroke={CD} strokeWidth={0.3} />;
      })}
      {/* Door handle */}
      <rect x={w + 2} y={h * 0.4} width={3} height={20} fill="none" stroke={C} strokeWidth={0.6} rx={1} />
      {/* Control panel area */}
      <rect x={w * 0.25} y={h + 2} width={w * 0.5} height={8} fill="none" stroke={CA} strokeWidth={0.5} rx={1} />
      <text x={w / 2} y={h + 8} fontSize={3} textAnchor="middle" fill={CA} fontFamily="monospace">CONTROL PANEL</text>
      {/* Dimensions */}
      <DimH x1={-5} x2={w + 5} y={h + 25} label={`${p.chamberWidth}`} />
      <DimV y1={-5} y2={h + 5} x={-22} label={`${p.chamberHeight}`} />
    </g>
  );
}

function SideView({ ox, oy, p }: { ox: number; oy: number; p: Required<ThermalCyclingChamberParams> }) {
  const s = 0.07;
  const d = p.chamberDepth * s, h = p.chamberHeight * s;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={d / 2} y={-8} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">SIDE VIEW</text>
      <rect x={0} y={0} width={d} height={h} fill="none" stroke={C} strokeWidth={0.8} />
      {/* Refrigeration unit at back */}
      <rect x={d - 15} y={h * 0.1} width={15} height={h * 0.3} fill="none" stroke={CD} strokeWidth={0.5} />
      <text x={d - 7} y={h * 0.25} fontSize={3} textAnchor="middle" fill={CD} fontFamily="monospace" transform={`rotate(-90,${d - 7},${h * 0.25})`}>REFRIG.</text>
      {/* Air circulation arrows */}
      {[0.3, 0.5, 0.7].map((f, i) => (
        <g key={i}>
          <line x1={5} y1={h * f} x2={d - 20} y2={h * f} stroke="#22c55e" strokeWidth={0.3} />
          <polygon points={`${d - 20},${h * f} ${d - 24},${h * f - 1.5} ${d - 24},${h * f + 1.5}`} fill="#22c55e" />
        </g>
      ))}
      <DimH x1={0} x2={d} y={h + 18} label={`${p.chamberDepth}`} />
    </g>
  );
}

function SpecTable({ ox, oy, p }: { ox: number; oy: number; p: Required<ThermalCyclingChamberParams> }) {
  const rows = [
    ["Parameter", "Value"],
    ["Temp Range", `${p.tempMin}°C to +${p.tempMax}°C`],
    ["Ramp Rate", `${p.rampRate}°C/min`],
    ["Chamber Size", `${p.chamberWidth}×${p.chamberHeight}×${p.chamberDepth}`],
    ["Shelves", `${p.shelfCount}`],
    ["Standard", "IEC 61215 MQT 11"],
  ];
  const cw = [60, 90]; const rh = 9;
  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={0} y={-4} fontSize={5} fill={CT} fontWeight="bold" fontFamily="monospace">SPECIFICATION TABLE</text>
      {rows.map((row, ri) => (
        <g key={ri}>
          {row.map((cell, ci) => {
            const rx = cw.slice(0, ci).reduce((a, b) => a + b, 0);
            return (
              <g key={ci}>
                <rect x={rx} y={ri * rh} width={cw[ci]} height={rh}
                  fill={ri === 0 ? "#21262d" : "none"} stroke={CD} strokeWidth={0.4} />
                <text x={rx + 3} y={ri * rh + 6.5} fontSize={3.8}
                  fill={ri === 0 ? CA : C} fontWeight={ri === 0 ? "bold" : "normal"} fontFamily="monospace">{cell}</text>
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}

export default function ThermalCyclingChamber({ params = {} }: { params?: ThermalCyclingChamberParams }) {
  const p = { ...DEFAULTS, ...params };
  const W = 841, H = 594;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ background: BG }} fontFamily="monospace">
      <rect x={8} y={8} width={W - 16} height={H - 16} fill="none" stroke="#30363d" strokeWidth={1.2} />
      <rect x={14} y={14} width={W - 28} height={H - 28} fill="none" stroke="#21262d" strokeWidth={0.6} />
      <text x={W / 2} y={30} fontSize={10} textAnchor="middle" fill={CA} fontWeight="bold">
        THERMAL CYCLING CHAMBER — IEC 61215 MQT 11
      </text>
      <FrontView ox={50} oy={55} p={p} />
      <SideView ox={320} oy={55} p={p} />
      <SpecTable ox={500} oy={55} p={p} />
      <g transform={`translate(${W - 260},${H - 55})`}>
        <rect x={0} y={0} width={240} height={40} fill="#161b22" stroke="#30363d" strokeWidth={0.8} />
        <line x1={80} y1={0} x2={80} y2={40} stroke="#21262d" strokeWidth={0.4} />
        <line x1={160} y1={0} x2={160} y2={40} stroke="#21262d" strokeWidth={0.4} />
        <line x1={0} y1={20} x2={240} y2={20} stroke="#21262d" strokeWidth={0.4} />
        <text x={4} y={12} fontSize={4} fill={CD}>DRAWN BY</text>
        <text x={4} y={34} fontSize={5} fill={C} fontWeight="bold">ShilpaSutra AI</text>
        <text x={84} y={12} fontSize={4} fill={CD}>PART NO.</text>
        <text x={84} y={34} fontSize={5} fill={C} fontWeight="bold">SS-TCC-001</text>
        <text x={164} y={12} fontSize={4} fill={CD}>SCALE</text>
        <text x={164} y={34} fontSize={5} fill={C}>NOT TO SCALE</text>
      </g>
      <g transform={`translate(20,${H - 70})`}>
        <text fontSize={4.5} fill={CD} fontWeight="bold">NOTES:</text>
        <text y={8} fontSize={3.8} fill={CD}>1. ALL DIMENSIONS IN MM. 2. INSULATION: 100mm PU FOAM. 3. REFRIGERANT: R-404A.</text>
      </g>
    </svg>
  );
}
