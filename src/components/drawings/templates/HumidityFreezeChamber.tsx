"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// HumidityFreezeChamber — IEC 61215 MQT 12 Humidity-Freeze Test Chamber
// ═══════════════════════════════════════════════════════════════════════════════

import React from "react";

export interface HumidityFreezeChamberParams {
  chamberWidth?: number;
  chamberHeight?: number;
  chamberDepth?: number;
  tempMin?: number;
  tempMax?: number;
  humidityMax?: number;    // %RH
  cycleCount?: number;
}

const DEFAULTS: Required<HumidityFreezeChamberParams> = {
  chamberWidth: 1800,
  chamberHeight: 2200,
  chamberDepth: 1200,
  tempMin: -40,
  tempMax: 85,
  humidityMax: 85,
  cycleCount: 10,
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

function FrontView({ ox, oy, p }: { ox: number; oy: number; p: Required<HumidityFreezeChamberParams> }) {
  const s = 0.065;
  const w = p.chamberWidth * s, h = p.chamberHeight * s;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={w / 2} y={-8} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">FRONT VIEW</text>
      {/* Outer casing */}
      <rect x={-4} y={-4} width={w + 8} height={h + 8} fill="none" stroke={C} strokeWidth={1.2} rx={2} />
      {/* Inner chamber */}
      <rect x={6} y={6} width={w - 12} height={h - 12} fill="none" stroke={C} strokeWidth={0.6} />
      {/* Steam generator at bottom */}
      <rect x={w * 0.3} y={h - 18} width={w * 0.4} height={12} fill="none" stroke="#3b82f6" strokeWidth={0.6} rx={1} />
      <text x={w / 2} y={h - 10} fontSize={3} textAnchor="middle" fill="#3b82f6" fontFamily="monospace">STEAM GEN</text>
      {/* Humidity droplets */}
      {[0.2, 0.35, 0.5, 0.65, 0.8].map((f, i) => (
        <g key={i} opacity={0.4}>
          <circle cx={w * f} cy={h * 0.25} r={1.5} fill="#3b82f6" />
          <circle cx={w * f + 5} cy={h * 0.32} r={1} fill="#3b82f6" />
        </g>
      ))}
      {/* Cooling coils */}
      {[0.15, 0.85].map((f, i) => (
        <g key={i}>
          <path d={`M${w * f},${10} Q${w * f + 4},${15} ${w * f},${20} Q${w * f - 4},${25} ${w * f},${30} Q${w * f + 4},${35} ${w * f},${40}`}
            fill="none" stroke="#3b82f6" strokeWidth={0.4} />
        </g>
      ))}
      {/* Heating elements */}
      {[0.15, 0.85].map((f, i) => (
        <g key={i}>
          <path d={`M${w * f},${h * 0.55} Q${w * f + 4},${h * 0.58} ${w * f},${h * 0.61} Q${w * f - 4},${h * 0.64} ${w * f},${h * 0.67}`}
            fill="none" stroke="#ef4444" strokeWidth={0.4} />
        </g>
      ))}
      {/* Module position */}
      <rect x={w * 0.15} y={h * 0.35} width={w * 0.7} height={h * 0.18} fill="none" stroke={CA} strokeWidth={0.7} />
      <text x={w / 2} y={h * 0.45} fontSize={4} textAnchor="middle" fill={CA} fontFamily="monospace">PV MODULE</text>
      {/* Humidity sensor */}
      <circle cx={w - 12} cy={h * 0.3} r={2} fill="none" stroke="#3b82f6" strokeWidth={0.4} />
      <text x={w - 12} y={h * 0.3 + 6} fontSize={2.5} textAnchor="middle" fill="#3b82f6" fontFamily="monospace">RH%</text>
      {/* Temp sensor */}
      <circle cx={w - 12} cy={h * 0.5} r={2} fill="none" stroke="#ef4444" strokeWidth={0.4} />
      <text x={w - 12} y={h * 0.5 + 6} fontSize={2.5} textAnchor="middle" fill="#ef4444" fontFamily="monospace">T°C</text>
      {/* Door */}
      <rect x={w + 1} y={h * 0.15} width={3} height={h * 0.3} fill="none" stroke={C} strokeWidth={0.5} rx={0.5} />
      {/* Control panel */}
      <rect x={w * 0.25} y={h + 1} width={w * 0.5} height={8} fill="none" stroke={CA} strokeWidth={0.5} rx={1} />
      <text x={w / 2} y={h + 7} fontSize={3} textAnchor="middle" fill={CA} fontFamily="monospace">CONTROL</text>
      <DimH x1={-4} x2={w + 4} y={h + 22} label={`${p.chamberWidth}`} />
      <DimV y1={-4} y2={h + 4} x={-20} label={`${p.chamberHeight}`} />
    </g>
  );
}

function TemperatureProfile({ ox, oy, p }: { ox: number; oy: number; p: Required<HumidityFreezeChamberParams> }) {
  const gw = 160, gh = 100;
  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={gw / 2} y={-8} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">CYCLE PROFILE</text>
      {/* Axes */}
      <line x1={0} y1={gh / 2} x2={gw} y2={gh / 2} stroke={CD} strokeWidth={0.3} strokeDasharray="2,2" />
      <line x1={0} y1={0} x2={0} y2={gh} stroke={CD} strokeWidth={0.5} />
      <line x1={0} y1={gh} x2={gw} y2={gh} stroke={CD} strokeWidth={0.5} />
      {/* Labels */}
      <text x={-5} y={5} fontSize={3} fill="#ef4444" fontFamily="monospace" textAnchor="end">+{p.tempMax}°C</text>
      <text x={-5} y={gh / 2 + 2} fontSize={3} fill={CD} fontFamily="monospace" textAnchor="end">0°C</text>
      <text x={-5} y={gh} fontSize={3} fill="#3b82f6" fontFamily="monospace" textAnchor="end">{p.tempMin}°C</text>
      <text x={gw / 2} y={gh + 10} fontSize={3} textAnchor="middle" fill={CD} fontFamily="monospace">TIME (hrs)</text>
      {/* Profile curve: ramp up → hold → ramp down → hold → repeat */}
      <path d={`M0,${gh * 0.15} L${gw * 0.1},${gh * 0.15} L${gw * 0.15},${gh * 0.85} L${gw * 0.35},${gh * 0.85} L${gw * 0.4},${gh * 0.15} L${gw * 0.6},${gh * 0.15} L${gw * 0.65},${gh * 0.85} L${gw * 0.85},${gh * 0.85} L${gw * 0.9},${gh * 0.15} L${gw},${gh * 0.15}`}
        fill="none" stroke={CA} strokeWidth={0.8} />
      {/* Humidity overlay */}
      <path d={`M0,${gh * 0.3} L${gw * 0.1},${gh * 0.3} L${gw * 0.12},${gh * 0.5} L${gw * 0.35},${gh * 0.5} L${gw * 0.38},${gh * 0.3} L${gw * 0.6},${gh * 0.3} L${gw * 0.62},${gh * 0.5} L${gw * 0.85},${gh * 0.5} L${gw * 0.88},${gh * 0.3} L${gw},${gh * 0.3}`}
        fill="none" stroke="#3b82f6" strokeWidth={0.5} strokeDasharray="3,1" />
      <text x={gw + 5} y={gh * 0.15} fontSize={3} fill={CA} fontFamily="monospace">T°C</text>
      <text x={gw + 5} y={gh * 0.3} fontSize={3} fill="#3b82f6" fontFamily="monospace">RH%</text>
    </g>
  );
}

function SpecTable({ ox, oy, p }: { ox: number; oy: number; p: Required<HumidityFreezeChamberParams> }) {
  const rows = [
    ["Parameter", "Value"],
    ["Temp Range", `${p.tempMin}°C to +${p.tempMax}°C`],
    ["Humidity", `up to ${p.humidityMax}% RH`],
    ["Cycle Count", `${p.cycleCount} cycles`],
    ["Chamber Size", `${p.chamberWidth}×${p.chamberHeight}×${p.chamberDepth}`],
    ["Standard", "IEC 61215 MQT 12"],
  ];
  const cw = [60, 90]; const rh = 9;
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

export default function HumidityFreezeChamber({ params = {} }: { params?: HumidityFreezeChamberParams }) {
  const p = { ...DEFAULTS, ...params };
  const W = 841, H = 594;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ background: BG }} fontFamily="monospace">
      <rect x={8} y={8} width={W - 16} height={H - 16} fill="none" stroke="#30363d" strokeWidth={1.2} />
      <rect x={14} y={14} width={W - 28} height={H - 28} fill="none" stroke="#21262d" strokeWidth={0.6} />
      <text x={W / 2} y={30} fontSize={10} textAnchor="middle" fill={CA} fontWeight="bold">
        HUMIDITY-FREEZE CHAMBER — IEC 61215 MQT 12
      </text>
      <FrontView ox={40} oy={55} p={p} />
      <TemperatureProfile ox={310} oy={55} p={p} />
      <SpecTable ox={310} oy={210} p={p} />
      <g transform={`translate(${W - 260},${H - 55})`}>
        <rect x={0} y={0} width={240} height={40} fill="#161b22" stroke="#30363d" strokeWidth={0.8} />
        <line x1={80} y1={0} x2={80} y2={40} stroke="#21262d" strokeWidth={0.4} />
        <line x1={160} y1={0} x2={160} y2={40} stroke="#21262d" strokeWidth={0.4} />
        <line x1={0} y1={20} x2={240} y2={20} stroke="#21262d" strokeWidth={0.4} />
        <text x={4} y={12} fontSize={4} fill={CD}>DRAWN BY</text>
        <text x={4} y={34} fontSize={5} fill={C} fontWeight="bold">ShilpaSutra AI</text>
        <text x={84} y={12} fontSize={4} fill={CD}>PART NO.</text>
        <text x={84} y={34} fontSize={5} fill={C} fontWeight="bold">SS-HFC-001</text>
        <text x={164} y={12} fontSize={4} fill={CD}>SCALE</text>
        <text x={164} y={34} fontSize={5} fill={C}>NOT TO SCALE</text>
      </g>
      <g transform={`translate(20,${H - 70})`}>
        <text fontSize={4.5} fill={CD} fontWeight="bold">NOTES:</text>
        <text y={8} fontSize={3.8} fill={CD}>1. ALL DIMENSIONS IN MM. 2. HUMIDITY CONTROL: ±3% RH. 3. CONDENSATION DRAIN PROVIDED.</text>
      </g>
    </svg>
  );
}
