"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// UVConditioningChamber — IEC 61215 MQT 10 UV Preconditioning Chamber
// ═══════════════════════════════════════════════════════════════════════════════

import React from "react";

export interface UVConditioningChamberParams {
  chamberWidth?: number;
  chamberHeight?: number;
  chamberDepth?: number;
  lampCount?: number;
  uvDose?: number;        // kWh/m²
  wavelengthMin?: number; // nm
  wavelengthMax?: number; // nm
}

const DEFAULTS: Required<UVConditioningChamberParams> = {
  chamberWidth: 1800,
  chamberHeight: 1600,
  chamberDepth: 1000,
  lampCount: 8,
  uvDose: 15,
  wavelengthMin: 280,
  wavelengthMax: 400,
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

function FrontView({ ox, oy, p }: { ox: number; oy: number; p: Required<UVConditioningChamberParams> }) {
  const s = 0.065;
  const w = p.chamberWidth * s, h = p.chamberHeight * s;
  const lampSp = w / (p.lampCount + 1);

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={w / 2} y={-8} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">FRONT VIEW</text>
      {/* Chamber body */}
      <rect x={0} y={0} width={w} height={h} fill="none" stroke={C} strokeWidth={1.2} rx={2} />
      {/* UV lamp array at top */}
      {Array.from({ length: p.lampCount }).map((_, i) => {
        const lx = lampSp * (i + 1);
        return (
          <g key={i}>
            <rect x={lx - 3} y={8} width={6} height={30} fill="none" stroke="#a855f7" strokeWidth={0.5} rx={1} />
            {/* UV glow */}
            <rect x={lx - 2} y={10} width={4} height={26} fill="#a855f7" opacity={0.15} rx={0.5} />
          </g>
        );
      })}
      <text x={w / 2} y={48} fontSize={3.5} textAnchor="middle" fill="#a855f7" fontFamily="monospace">UV LAMP ARRAY ({p.lampCount}×)</text>
      {/* Module position */}
      <rect x={w * 0.1} y={h * 0.45} width={w * 0.8} height={h * 0.35} fill="none" stroke={CA} strokeWidth={0.7} />
      {/* Cell pattern */}
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={i} x1={w * 0.1 + w * 0.8 * (i / 8)} y1={h * 0.45} x2={w * 0.1 + w * 0.8 * (i / 8)} y2={h * 0.8} stroke={CA} strokeWidth={0.15} />
      ))}
      <text x={w / 2} y={h * 0.65} fontSize={4} textAnchor="middle" fill={CA} fontFamily="monospace">PV MODULE</text>
      {/* Irradiance arrows */}
      {[0.25, 0.5, 0.75].map((f, i) => (
        <g key={i}>
          <line x1={w * f} y1={50} x2={w * f} y2={h * 0.42} stroke="#a855f7" strokeWidth={0.4} strokeDasharray="2,1" />
          <polygon points={`${w * f},${h * 0.42} ${w * f - 1.5},${h * 0.42 - 5} ${w * f + 1.5},${h * 0.42 - 5}`} fill="#a855f7" />
        </g>
      ))}
      {/* Temperature sensor */}
      <circle cx={w - 10} cy={h * 0.6} r={2} fill="none" stroke="#ef4444" strokeWidth={0.4} />
      <text x={w - 10} y={h * 0.6 + 6} fontSize={2.5} textAnchor="middle" fill="#ef4444" fontFamily="monospace">TEMP</text>
      {/* UV sensor */}
      <circle cx={w * 0.5} cy={h * 0.4} r={2} fill="none" stroke="#f59e0b" strokeWidth={0.4} />
      <text x={w * 0.5 + 6} y={h * 0.4} fontSize={2.5} fill="#f59e0b" fontFamily="monospace">UV SENSOR</text>
      <DimH x1={0} x2={w} y={h + 20} label={`${p.chamberWidth}`} />
      <DimV y1={0} y2={h} x={-18} label={`${p.chamberHeight}`} />
    </g>
  );
}

function SectionView({ ox, oy, p }: { ox: number; oy: number; p: Required<UVConditioningChamberParams> }) {
  const s = 0.065;
  const d = p.chamberDepth * s, h = p.chamberHeight * s;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={d / 2} y={-8} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">SECTION A-A</text>
      <rect x={0} y={0} width={d} height={h} fill="none" stroke={C} strokeWidth={0.8} />
      {/* Reflector at top */}
      <path d={`M5,5 Q${d / 2},15 ${d - 5},5`} fill="none" stroke={CD} strokeWidth={0.5} />
      <text x={d / 2} y={12} fontSize={3} textAnchor="middle" fill={CD} fontFamily="monospace">REFLECTOR</text>
      {/* Ventilation */}
      <rect x={d - 5} y={h * 0.3} width={5} height={h * 0.4} fill="none" stroke="#22c55e" strokeWidth={0.4} />
      {[0.35, 0.5, 0.65].map((f, i) => (
        <g key={i}>
          <line x1={d} y1={h * f} x2={d + 5} y2={h * f} stroke="#22c55e" strokeWidth={0.3} />
          <polygon points={`${d + 5},${h * f} ${d + 3},${h * f - 1} ${d + 3},${h * f + 1}`} fill="#22c55e" />
        </g>
      ))}
      <DimH x1={0} x2={d} y={h + 18} label={`${p.chamberDepth}`} />
    </g>
  );
}

function SpecTable({ ox, oy, p }: { ox: number; oy: number; p: Required<UVConditioningChamberParams> }) {
  const rows = [
    ["Parameter", "Value"],
    ["UV Dose", `${p.uvDose} kWh/m²`],
    ["Wavelength", `${p.wavelengthMin}–${p.wavelengthMax} nm`],
    ["Lamp Count", `${p.lampCount}`],
    ["Chamber Size", `${p.chamberWidth}×${p.chamberHeight}×${p.chamberDepth}`],
    ["Standard", "IEC 61215 MQT 10"],
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

export default function UVConditioningChamber({ params = {} }: { params?: UVConditioningChamberParams }) {
  const p = { ...DEFAULTS, ...params };
  const W = 841, H = 594;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ background: BG }} fontFamily="monospace">
      <rect x={8} y={8} width={W - 16} height={H - 16} fill="none" stroke="#30363d" strokeWidth={1.2} />
      <rect x={14} y={14} width={W - 28} height={H - 28} fill="none" stroke="#21262d" strokeWidth={0.6} />
      <text x={W / 2} y={30} fontSize={10} textAnchor="middle" fill={CA} fontWeight="bold">
        UV CONDITIONING CHAMBER — IEC 61215 MQT 10
      </text>
      <FrontView ox={40} oy={55} p={p} />
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
        <text x={84} y={34} fontSize={5} fill={C} fontWeight="bold">SS-UVC-001</text>
        <text x={164} y={12} fontSize={4} fill={CD}>SCALE</text>
        <text x={164} y={34} fontSize={5} fill={C}>NOT TO SCALE</text>
      </g>
      <g transform={`translate(20,${H - 70})`}>
        <text fontSize={4.5} fill={CD} fontWeight="bold">NOTES:</text>
        <text y={8} fontSize={3.8} fill={CD}>1. ALL DIMENSIONS IN MM. 2. UV LAMPS: FLUORESCENT UVA-340. 3. CHAMBER TEMP: 60±5°C.</text>
      </g>
    </svg>
  );
}
