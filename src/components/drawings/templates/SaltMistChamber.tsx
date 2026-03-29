"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// SaltMistChamber — IEC 61701 Salt Mist Corrosion Test Chamber
// ═══════════════════════════════════════════════════════════════════════════════

import React from "react";

export interface SaltMistChamberParams {
  chamberWidth?: number;
  chamberHeight?: number;
  chamberDepth?: number;
  nozzleCount?: number;
  saltConcentration?: number; // %
  temperature?: number;       // °C
}

const DEFAULTS: Required<SaltMistChamberParams> = {
  chamberWidth: 2000,
  chamberHeight: 1800,
  chamberDepth: 1200,
  nozzleCount: 6,
  saltConcentration: 5,
  temperature: 35,
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

function FrontView({ ox, oy, p }: { ox: number; oy: number; p: Required<SaltMistChamberParams> }) {
  const s = 0.06;
  const w = p.chamberWidth * s, h = p.chamberHeight * s;
  const nSp = w / (p.nozzleCount + 1);

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={w / 2} y={-8} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">FRONT VIEW</text>
      {/* Chamber body (corrosion-resistant) */}
      <rect x={0} y={0} width={w} height={h} fill="none" stroke={C} strokeWidth={1.2} rx={3} />
      {/* Inner liner */}
      <rect x={4} y={4} width={w - 8} height={h - 8} fill="none" stroke={CD} strokeWidth={0.4} strokeDasharray="3,2" />
      {/* Salt spray nozzles at top */}
      {Array.from({ length: p.nozzleCount }).map((_, i) => {
        const nx = nSp * (i + 1);
        return (
          <g key={i}>
            <circle cx={nx} cy={12} r={3} fill="none" stroke={CA} strokeWidth={0.5} />
            <circle cx={nx} cy={12} r={1} fill={CA} opacity={0.4} />
            {/* Spray pattern */}
            <line x1={nx - 6} y1={18} x2={nx} y2={12} stroke={CA} strokeWidth={0.2} />
            <line x1={nx + 6} y1={18} x2={nx} y2={12} stroke={CA} strokeWidth={0.2} />
            {/* Mist droplets */}
            {[0, -3, 3, -1, 1].map((dx, j) => (
              <circle key={j} cx={nx + dx} cy={20 + j * 2} r={0.6} fill={CA} opacity={0.3} />
            ))}
          </g>
        );
      })}
      <text x={w / 2} y={30} fontSize={3.5} textAnchor="middle" fill={CA} fontFamily="monospace">SALT SPRAY NOZZLES ({p.nozzleCount}×)</text>
      {/* Specimen rack */}
      <g transform={`translate(${w * 0.1},${h * 0.35})`}>
        <rect x={0} y={0} width={w * 0.8} height={h * 0.3} fill="none" stroke={CA} strokeWidth={0.6} />
        {/* Rack supports (V-shape for 15°-30° angle) */}
        <line x1={0} y1={h * 0.3} x2={w * 0.1} y2={0} stroke={CD} strokeWidth={0.4} />
        <line x1={w * 0.8} y1={h * 0.3} x2={w * 0.7} y2={0} stroke={CD} strokeWidth={0.4} />
        {/* Modules on rack */}
        <rect x={w * 0.05} y={h * 0.05} width={w * 0.3} height={h * 0.2} fill="none" stroke={CA} strokeWidth={0.4} />
        <rect x={w * 0.4} y={h * 0.05} width={w * 0.3} height={h * 0.2} fill="none" stroke={CA} strokeWidth={0.4} />
        <text x={w * 0.4} y={h * 0.18} fontSize={3} textAnchor="middle" fill={CA} fontFamily="monospace">PV MODULES</text>
      </g>
      {/* Salt solution reservoir */}
      <rect x={w * 0.3} y={h - 15} width={w * 0.4} height={10} fill="none" stroke="#f59e0b" strokeWidth={0.6} rx={1} />
      <text x={w / 2} y={h - 8} fontSize={3} textAnchor="middle" fill="#f59e0b" fontFamily="monospace">{p.saltConcentration}% NaCl RESERVOIR</text>
      {/* Drain */}
      <line x1={w / 2} y1={h} x2={w / 2} y2={h + 6} stroke={CD} strokeWidth={0.5} />
      <text x={w / 2} y={h + 10} fontSize={2.5} textAnchor="middle" fill={CD} fontFamily="monospace">DRAIN</text>
      {/* Temperature indicator */}
      <circle cx={w - 10} cy={h * 0.5} r={2} fill="none" stroke="#ef4444" strokeWidth={0.4} />
      <text x={w - 10} y={h * 0.5 + 6} fontSize={2.5} textAnchor="middle" fill="#ef4444" fontFamily="monospace">{p.temperature}°C</text>
      <DimH x1={0} x2={w} y={h + 22} label={`${p.chamberWidth}`} />
      <DimV y1={0} y2={h} x={-18} label={`${p.chamberHeight}`} />
    </g>
  );
}

function SectionView({ ox, oy, p }: { ox: number; oy: number; p: Required<SaltMistChamberParams> }) {
  const s = 0.06;
  const d = p.chamberDepth * s, h = p.chamberHeight * s;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={d / 2} y={-8} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">SECTION B-B</text>
      <rect x={0} y={0} width={d} height={h} fill="none" stroke={C} strokeWidth={0.8} />
      {/* Specimen at 15° angle */}
      <line x1={d * 0.15} y1={h * 0.6} x2={d * 0.85} y2={h * 0.35} stroke={CA} strokeWidth={0.7} />
      <text x={d * 0.5} y={h * 0.44} fontSize={3} textAnchor="middle" fill={CA} fontFamily="monospace" transform={`rotate(-15,${d * 0.5},${h * 0.44})`}>15° ANGLE</text>
      {/* Condensate collection */}
      <path d={`M5,${h - 5} L${d / 2},${h - 2} L${d - 5},${h - 5}`} fill="none" stroke="#3b82f6" strokeWidth={0.4} />
      <text x={d / 2} y={h - 8} fontSize={2.5} textAnchor="middle" fill="#3b82f6" fontFamily="monospace">CONDENSATE</text>
      {/* Air inlet */}
      <rect x={-3} y={h * 0.8} width={6} height={8} fill="none" stroke="#22c55e" strokeWidth={0.4} />
      <text x={-6} y={h * 0.85} fontSize={2.5} fill="#22c55e" fontFamily="monospace" textAnchor="end">AIR IN</text>
      {/* Exhaust */}
      <rect x={d - 3} y={5} width={6} height={8} fill="none" stroke={CD} strokeWidth={0.4} />
      <text x={d + 6} y={10} fontSize={2.5} fill={CD} fontFamily="monospace">EXHAUST</text>
      <DimH x1={0} x2={d} y={h + 18} label={`${p.chamberDepth}`} />
    </g>
  );
}

function SpecTable({ ox, oy, p }: { ox: number; oy: number; p: Required<SaltMistChamberParams> }) {
  const rows = [
    ["Parameter", "Value"],
    ["Salt Solution", `${p.saltConcentration}% NaCl`],
    ["Temperature", `${p.temperature}±2°C`],
    ["Nozzle Count", `${p.nozzleCount}`],
    ["Chamber Size", `${p.chamberWidth}×${p.chamberHeight}×${p.chamberDepth}`],
    ["Standard", "IEC 61701"],
    ["Material", "FRP / PP-lined"],
  ];
  const cw = [60, 85]; const rh = 9;
  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={0} y={-4} fontSize={5} fill={CT} fontWeight="bold" fontFamily="monospace">SPECIFICATION TABLE</text>
      {rows.map((row, ri) => (
        <g key={ri}>{row.map((cell, ci) => {
          const rx = cw.slice(0, ci).reduce((a, b) => a + b, 0);
          return (
            <g key={ci}>
              <rect x={rx} y={ri * rh} width={cw[ci]} height={rh}
                fill={ri === 0 ? "#21262d" : "none"} stroke={CD} strokeWidth={0.4} />
              <text x={rx + 3} y={ri * rh + 6.5} fontSize={3.8}
                fill={ri === 0 ? CA : C} fontWeight={ri === 0 ? "bold" : "normal"} fontFamily="monospace">{cell}</text>
            </g>
          );
        })}</g>
      ))}
    </g>
  );
}

export default function SaltMistChamber({ params = {} }: { params?: SaltMistChamberParams }) {
  const p = { ...DEFAULTS, ...params };
  const W = 841, H = 594;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ background: BG }} fontFamily="monospace">
      <rect x={8} y={8} width={W - 16} height={H - 16} fill="none" stroke="#30363d" strokeWidth={1.2} />
      <rect x={14} y={14} width={W - 28} height={H - 28} fill="none" stroke="#21262d" strokeWidth={0.6} />
      <text x={W / 2} y={30} fontSize={10} textAnchor="middle" fill={CA} fontWeight="bold">
        SALT MIST CORROSION CHAMBER — IEC 61701
      </text>
      <FrontView ox={30} oy={55} p={p} />
      <SectionView ox={310} oy={55} p={p} />
      <SpecTable ox={480} oy={55} p={p} />
      <g transform={`translate(${W - 260},${H - 55})`}>
        <rect x={0} y={0} width={240} height={40} fill="#161b22" stroke="#30363d" strokeWidth={0.8} />
        <line x1={80} y1={0} x2={80} y2={40} stroke="#21262d" strokeWidth={0.4} />
        <line x1={160} y1={0} x2={160} y2={40} stroke="#21262d" strokeWidth={0.4} />
        <line x1={0} y1={20} x2={240} y2={20} stroke="#21262d" strokeWidth={0.4} />
        <text x={4} y={12} fontSize={4} fill={CD}>DRAWN BY</text>
        <text x={4} y={34} fontSize={5} fill={C} fontWeight="bold">ShilpaSutra AI</text>
        <text x={84} y={12} fontSize={4} fill={CD}>PART NO.</text>
        <text x={84} y={34} fontSize={5} fill={C} fontWeight="bold">SS-SMC-001</text>
        <text x={164} y={12} fontSize={4} fill={CD}>SCALE</text>
        <text x={164} y={34} fontSize={5} fill={C}>NOT TO SCALE</text>
      </g>
      <g transform={`translate(20,${H - 70})`}>
        <text fontSize={4.5} fill={CD} fontWeight="bold">NOTES:</text>
        <text y={8} fontSize={3.8} fill={CD}>1. ALL DIMENSIONS IN MM. 2. CHAMBER: FRP CONSTRUCTION. 3. SPECIMEN ANGLE: 15°–30° FROM VERTICAL.</text>
      </g>
    </svg>
  );
}
