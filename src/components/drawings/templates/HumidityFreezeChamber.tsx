"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// HumidityFreezeChamber — IEC 61215 MQT 12 Humidity-Freeze Test Chamber
// Professional A3 multi-view GA drawing with parametric dimensions
// ═══════════════════════════════════════════════════════════════════════════════

import React from "react";

export interface HumidityFreezeChamberParams {
  cabinetWidth?: number;
  cabinetHeight?: number;
  cabinetDepth?: number;
  chamberWidth?: number;
  chamberHeight?: number;
  chamberDepth?: number;
  tempMin?: number;
  tempMax?: number;
  humidityMax?: number;
  cycleCount?: number;
}

const DEFAULTS = {
  cabinetWidth: 1800,
  cabinetHeight: 2200,
  cabinetDepth: 1200,
  tempMin: -40,
  tempMax: 85,
  humidityMax: 85,
  cycleCount: 10,
};

function resolve(params: HumidityFreezeChamberParams) {
  return {
    W: params.cabinetWidth ?? params.chamberWidth ?? DEFAULTS.cabinetWidth,
    H: params.cabinetHeight ?? params.chamberHeight ?? DEFAULTS.cabinetHeight,
    D: params.cabinetDepth ?? params.chamberDepth ?? DEFAULTS.cabinetDepth,
    tempMin: params.tempMin ?? DEFAULTS.tempMin,
    tempMax: params.tempMax ?? DEFAULTS.tempMax,
    humidityMax: params.humidityMax ?? DEFAULTS.humidityMax,
    cycleCount: params.cycleCount ?? DEFAULTS.cycleCount,
  };
}

const TXT = "#CCCCCC"; const LN = "#E0E0E0"; const DIM = "#88CCFF"; const TITLE = "#58a6ff"; const ACCENT = "#00D4FF"; const SUB = "#8b949e";

function DimH({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  return (
    <g stroke={SUB} strokeWidth={0.7} fill="none">
      <line x1={x1} y1={y - 15} x2={x1} y2={y + 4} /><line x1={x2} y1={y - 15} x2={x2} y2={y + 4} />
      <line x1={x1 + 4} y1={y} x2={x2 - 4} y2={y} />
      <polygon points={`${x1},${y} ${x1 + 5},${y - 2} ${x1 + 5},${y + 2}`} fill={SUB} stroke="none" />
      <polygon points={`${x2},${y} ${x2 - 5},${y - 2} ${x2 - 5},${y + 2}`} fill={SUB} stroke="none" />
      <text x={(x1 + x2) / 2} y={y - 4} fontSize={7} textAnchor="middle" fill={DIM} stroke="none" fontFamily="monospace">{label}</text>
    </g>
  );
}

function DimV({ y1, y2, x, label }: { y1: number; y2: number; x: number; label: string }) {
  const mid = (y1 + y2) / 2;
  return (
    <g stroke={SUB} strokeWidth={0.7} fill="none">
      <line x1={x - 15} y1={y1} x2={x + 4} y2={y1} /><line x1={x - 15} y1={y2} x2={x + 4} y2={y2} />
      <line x1={x} y1={y1 + 4} x2={x} y2={y2 - 4} />
      <polygon points={`${x},${y1} ${x - 2},${y1 + 5} ${x + 2},${y1 + 5}`} fill={SUB} stroke="none" />
      <polygon points={`${x},${y2} ${x - 2},${y2 - 5} ${x + 2},${y2 - 5}`} fill={SUB} stroke="none" />
      <text x={x - 6} y={mid} fontSize={7} textAnchor="middle" fill={DIM} stroke="none" fontFamily="monospace"
        transform={`rotate(-90,${x - 6},${mid})`}>{label}</text>
    </g>
  );
}

function FrontView({ ox, oy, p }: { ox: number; oy: number; p: ReturnType<typeof resolve> }) {
  const s = 350 / 2000;
  const w = p.W * s, h = p.H * s;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={w / 2} y={-12} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">FRONT VIEW</text>
      <rect x={-5} y={-5} width={w + 10} height={h + 10} fill="none" stroke={LN} strokeWidth={1.5} rx={2} />
      <rect x={8} y={8} width={w - 16} height={h - 16} fill="none" stroke={LN} strokeWidth={0.7} />

      {/* Steam generator */}
      <rect x={w * 0.25} y={h - 25} width={w * 0.5} height={18} fill="none" stroke="#3b82f6" strokeWidth={0.7} rx={1} />
      <text x={w / 2} y={h - 14} fontSize={5} textAnchor="middle" fill="#3b82f6" fontFamily="monospace">STEAM GENERATOR</text>

      {/* Humidity droplets */}
      {[0.2, 0.35, 0.5, 0.65, 0.8].map((f, i) => (
        <g key={i} opacity={0.4}>
          <circle cx={w * f} cy={h * 0.2} r={2} fill="#3b82f6" />
          <circle cx={w * f + 6} cy={h * 0.27} r={1.5} fill="#3b82f6" />
        </g>
      ))}

      {/* Cooling coils */}
      {[0.12, 0.88].map((f, i) => (
        <path key={i} d={`M${w * f},${15} Q${w * f + 5},${22} ${w * f},${29} Q${w * f - 5},${36} ${w * f},${43} Q${w * f + 5},${50} ${w * f},${57}`}
          fill="none" stroke="#3b82f6" strokeWidth={0.5} />
      ))}

      {/* Heating elements */}
      {[0.12, 0.88].map((f, i) => (
        <path key={i} d={`M${w * f},${h * 0.55} Q${w * f + 5},${h * 0.58} ${w * f},${h * 0.61} Q${w * f - 5},${h * 0.64} ${w * f},${h * 0.67}`}
          fill="none" stroke="#ef4444" strokeWidth={0.5} />
      ))}

      {/* Module position */}
      <rect x={w * 0.12} y={h * 0.35} width={w * 0.76} height={h * 0.15} fill="none" stroke={ACCENT} strokeWidth={0.8} />
      <text x={w / 2} y={h * 0.44} fontSize={6} textAnchor="middle" fill={ACCENT} fontFamily="monospace">PV MODULE</text>

      {/* Sensors */}
      <circle cx={w - 18} cy={h * 0.3} r={3} fill="none" stroke="#3b82f6" strokeWidth={0.5} />
      <text x={w - 18} y={h * 0.3 + 8} fontSize={4} textAnchor="middle" fill="#3b82f6" fontFamily="monospace">RH%</text>
      <circle cx={w - 18} cy={h * 0.5} r={3} fill="none" stroke="#ef4444" strokeWidth={0.5} />
      <text x={w - 18} y={h * 0.5 + 8} fontSize={4} textAnchor="middle" fill="#ef4444" fontFamily="monospace">T°C</text>

      {/* Door handle */}
      <rect x={w + 3} y={h * 0.3} width={4} height={28} fill="none" stroke={LN} strokeWidth={0.6} rx={1} />

      {/* Control */}
      <rect x={w * 0.2} y={h + 3} width={w * 0.6} height={14} fill="none" stroke={ACCENT} strokeWidth={0.5} rx={1} />
      <text x={w / 2} y={h + 12} fontSize={5} textAnchor="middle" fill={ACCENT} fontFamily="monospace">CONTROL PANEL</text>

      <DimH x1={-5} x2={w + 5} y={h + 30} label={`${p.W}`} />
      <DimV y1={-5} y2={h + 5} x={-25} label={`${p.H}`} />
    </g>
  );
}

function RightView({ ox, oy, p }: { ox: number; oy: number; p: ReturnType<typeof resolve> }) {
  const s = 200 / 2000;
  const d = p.D * s, h = p.H * s;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={d / 2} y={-12} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">RIGHT VIEW</text>
      <rect x={0} y={0} width={d} height={h} fill="none" stroke={LN} strokeWidth={1} />
      <rect x={d - 20} y={h * 0.1} width={20} height={h * 0.3} fill="none" stroke={SUB} strokeWidth={0.5} />
      <text x={d - 10} y={h * 0.25} fontSize={4} textAnchor="middle" fill={SUB} fontFamily="monospace"
        transform={`rotate(-90,${d - 10},${h * 0.25})`}>REFRIG.</text>
      {/* Air circulation */}
      {[0.3, 0.5, 0.7].map((f, i) => (
        <g key={i}>
          <line x1={8} y1={h * f} x2={d - 25} y2={h * f} stroke="#22c55e" strokeWidth={0.4} />
          <polygon points={`${d - 25},${h * f} ${d - 30},${h * f - 2} ${d - 30},${h * f + 2}`} fill="#22c55e" />
        </g>
      ))}
      <DimH x1={0} x2={d} y={h + 25} label={`${p.D}`} />
    </g>
  );
}

function TopView({ ox, oy, p }: { ox: number; oy: number; p: ReturnType<typeof resolve> }) {
  const s = 350 / 2000;
  const w = p.W * s, d = Math.min(p.D * s, 120);

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={w / 2} y={-8} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">TOP VIEW</text>
      <rect x={0} y={0} width={w} height={d} fill="none" stroke={LN} strokeWidth={1.2} />
      <circle cx={w * 0.15} cy={d * 0.3} r={5} fill="none" stroke="#3b82f6" strokeWidth={0.5} />
      <text x={w * 0.15} y={d * 0.3 + 10} fontSize={4} textAnchor="middle" fill="#3b82f6" fontFamily="monospace">WATER IN</text>
      <circle cx={w * 0.15} cy={d * 0.7} r={5} fill="none" stroke="#3b82f6" strokeWidth={0.5} />
      <text x={w * 0.15} y={d * 0.7 + 10} fontSize={4} textAnchor="middle" fill="#3b82f6" fontFamily="monospace">WATER OUT</text>
      {/* Condenser */}
      <rect x={w + 15} y={d * 0.15} width={45} height={d * 0.7} fill="none" stroke={SUB} strokeWidth={0.5} />
      <text x={w + 37} y={d * 0.55} fontSize={5} textAnchor="middle" fill={SUB} fontFamily="monospace">COND.</text>
      <line x1={w} y1={d * 0.4} x2={w + 15} y2={d * 0.4} stroke={SUB} strokeWidth={0.4} />
      <line x1={w} y1={d * 0.6} x2={w + 15} y2={d * 0.6} stroke={SUB} strokeWidth={0.4} />
      <DimH x1={0} x2={w} y={d + 15} label={`${p.W}`} />
    </g>
  );
}

function SpecTable({ ox, oy, p }: { ox: number; oy: number; p: ReturnType<typeof resolve> }) {
  const rows = [
    ["Parameter", "Value"],
    ["Temperature Range", `${p.tempMin}°C to +${p.tempMax}°C`],
    ["Humidity Range", `Up to ${p.humidityMax}% RH`],
    ["Humidity Control", "±3% RH"],
    ["Cycle Count", `${p.cycleCount} cycles`],
    ["Dimensions (WxHxD)", `${p.W}×${p.H}×${p.D} mm`],
    ["Refrigerant", "R-404A / R-507"],
    ["Heating", "Ni-Cr heaters"],
    ["Control", "PLC + HMI"],
    ["Power Supply", "3-Ph 415V 50Hz"],
    ["Condensation Drain", "Provided"],
    ["Standard", "IEC 61215 MQT 12"],
  ];
  const cw = [120, 140]; const rh = 14;
  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={0} y={-6} fontSize={9} fill={TITLE} fontWeight="bold" fontFamily="monospace">SPECIFICATION TABLE</text>
      {rows.map((row, ri) => (
        <g key={ri}>{row.map((cell, ci) => {
          const rx = cw.slice(0, ci).reduce((a, b) => a + b, 0);
          return (
            <g key={ci}>
              <rect x={rx} y={ri * rh} width={cw[ci]} height={rh}
                fill={ri === 0 ? "#21262d" : "none"} stroke={SUB} strokeWidth={0.5} />
              <text x={rx + 4} y={ri * rh + 10} fontSize={6}
                fill={ri === 0 ? ACCENT : TXT} fontWeight={ri === 0 ? "bold" : "normal"} fontFamily="monospace">{cell}</text>
            </g>
          );
        })}</g>
      ))}
    </g>
  );
}

function TitleBlock({ y: ty }: { y: number }) {
  const bw = 1189, bh = 60;
  return (
    <g transform={`translate(0,${ty})`}>
      <rect x={0} y={0} width={bw} height={bh} fill="#161b22" stroke={SUB} strokeWidth={1} />
      <line x1={240} y1={0} x2={240} y2={bh} stroke={SUB} strokeWidth={0.5} />
      <line x1={540} y1={0} x2={540} y2={bh} stroke={SUB} strokeWidth={0.5} />
      <line x1={740} y1={0} x2={740} y2={bh} stroke={SUB} strokeWidth={0.5} />
      <line x1={920} y1={0} x2={920} y2={bh} stroke={SUB} strokeWidth={0.5} />
      <line x1={0} y1={bh / 2} x2={bw} y2={bh / 2} stroke={SUB} strokeWidth={0.3} />
      <text x={10} y={18} fontSize={10} fill={ACCENT} fontWeight="bold" fontFamily="monospace">ShilpaSutra AI</text>
      <text x={10} y={48} fontSize={7} fill={TXT} fontFamily="monospace">www.shilpasutra.com</text>
      <text x={250} y={18} fontSize={8} fill={SUB} fontFamily="monospace">TITLE</text>
      <text x={250} y={45} fontSize={10} fill={TXT} fontWeight="bold" fontFamily="monospace">HUMIDITY-FREEZE CHAMBER — IEC 61215 MQT 12</text>
      <text x={550} y={18} fontSize={8} fill={SUB} fontFamily="monospace">SCALE</text>
      <text x={550} y={45} fontSize={10} fill={TXT} fontFamily="monospace">1:50</text>
      <text x={750} y={18} fontSize={8} fill={SUB} fontFamily="monospace">MATERIAL</text>
      <text x={750} y={45} fontSize={9} fill={TXT} fontFamily="monospace">Outer: GI / Inner: SS304</text>
      <text x={930} y={18} fontSize={8} fill={SUB} fontFamily="monospace">DATE: 2026-03-29</text>
      <text x={930} y={45} fontSize={8} fill={TXT} fontFamily="monospace">DWG NO: SS-HFC-001 REV A</text>
    </g>
  );
}

function GeneralNotes({ ox, oy }: { ox: number; oy: number }) {
  const notes = [
    "1. ALL DIMENSIONS IN MILLIMETERS UNLESS OTHERWISE STATED.",
    "2. HUMIDITY CONTROL: ±3% RH AT STEADY STATE.",
    "3. CONDENSATION DRAIN PROVIDED AT BASE.",
    "4. MINIMUM 500mm CLEARANCE ALL SIDES FOR AIRFLOW.",
  ];
  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={0} y={-6} fontSize={9} fill={TITLE} fontWeight="bold" fontFamily="monospace">GENERAL NOTES</text>
      <rect x={0} y={0} width={260} height={notes.length * 16 + 8} fill="none" stroke={SUB} strokeWidth={0.5} />
      {notes.map((note, i) => (
        <text key={i} x={6} y={14 + i * 16} fontSize={6} fill={TXT} fontFamily="monospace">{note}</text>
      ))}
    </g>
  );
}

export default function HumidityFreezeChamber({ params = {} }: { params?: HumidityFreezeChamberParams }) {
  const p = resolve(params);

  return (
    <svg viewBox="0 0 1189 841" className="w-full h-full" style={{ background: "transparent" }} fontFamily="monospace">
      <rect x={5} y={5} width={1179} height={831} fill="none" stroke="#30363d" strokeWidth={1.5} />
      <rect x={12} y={12} width={1165} height={817} fill="none" stroke="#21262d" strokeWidth={0.7} />

      <TopView ox={50} oy={50} p={p} />
      <FrontView ox={50} oy={190} p={p} />
      <RightView ox={460} oy={190} p={p} />
      <SpecTable ox={700} oy={340} p={p} />
      <GeneralNotes ox={700} oy={600} />
      <TitleBlock y={770} />
    </svg>
  );
}
