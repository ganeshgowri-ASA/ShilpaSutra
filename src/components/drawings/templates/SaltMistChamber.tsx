"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// SaltMistChamber — IEC 61701 Salt Mist Corrosion Test Chamber
// Professional A3 multi-view GA drawing with parametric dimensions
// ═══════════════════════════════════════════════════════════════════════════════

import React from "react";

export interface SaltMistChamberParams {
  cabinetWidth?: number;
  cabinetHeight?: number;
  cabinetDepth?: number;
  chamberWidth?: number;
  chamberHeight?: number;
  chamberDepth?: number;
  nozzleCount?: number;
  saltConcentration?: number;
  temperature?: number;
}

const DEFAULTS = {
  cabinetWidth: 2000,
  cabinetHeight: 1800,
  cabinetDepth: 1200,
  nozzleCount: 6,
  saltConcentration: 5,
  temperature: 35,
};

function resolve(params: SaltMistChamberParams) {
  return {
    W: params.cabinetWidth ?? params.chamberWidth ?? DEFAULTS.cabinetWidth,
    H: params.cabinetHeight ?? params.chamberHeight ?? DEFAULTS.cabinetHeight,
    D: params.cabinetDepth ?? params.chamberDepth ?? DEFAULTS.cabinetDepth,
    nozzleCount: params.nozzleCount ?? DEFAULTS.nozzleCount,
    saltConcentration: params.saltConcentration ?? DEFAULTS.saltConcentration,
    temperature: params.temperature ?? DEFAULTS.temperature,
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
  const nSp = w / (p.nozzleCount + 1);

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={w / 2} y={-12} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">FRONT VIEW</text>
      <rect x={0} y={0} width={w} height={h} fill="none" stroke={LN} strokeWidth={1.5} rx={3} />
      <rect x={6} y={6} width={w - 12} height={h - 12} fill="none" stroke={SUB} strokeWidth={0.5} strokeDasharray="4,3" />

      {/* Salt spray nozzles */}
      {Array.from({ length: p.nozzleCount }).map((_, i) => {
        const nx = nSp * (i + 1);
        return (
          <g key={i}>
            <circle cx={nx} cy={18} r={5} fill="none" stroke={ACCENT} strokeWidth={0.6} />
            <circle cx={nx} cy={18} r={1.5} fill={ACCENT} opacity={0.4} />
            <line x1={nx - 8} y1={28} x2={nx} y2={18} stroke={ACCENT} strokeWidth={0.3} />
            <line x1={nx + 8} y1={28} x2={nx} y2={18} stroke={ACCENT} strokeWidth={0.3} />
            {[0, -4, 4, -2, 2].map((dx, j) => (
              <circle key={j} cx={nx + dx} cy={30 + j * 3} r={1} fill={ACCENT} opacity={0.25} />
            ))}
          </g>
        );
      })}
      <text x={w / 2} y={42} fontSize={6} textAnchor="middle" fill={ACCENT} fontFamily="monospace">SALT SPRAY NOZZLES ({p.nozzleCount}×)</text>

      {/* Specimen rack */}
      <g transform={`translate(${w * 0.08},${h * 0.35})`}>
        <rect x={0} y={0} width={w * 0.84} height={h * 0.3} fill="none" stroke={ACCENT} strokeWidth={0.7} />
        <line x1={0} y1={h * 0.3} x2={w * 0.12} y2={0} stroke={SUB} strokeWidth={0.5} />
        <line x1={w * 0.84} y1={h * 0.3} x2={w * 0.72} y2={0} stroke={SUB} strokeWidth={0.5} />
        <rect x={w * 0.05} y={h * 0.05} width={w * 0.33} height={h * 0.2} fill="none" stroke={ACCENT} strokeWidth={0.5} />
        <rect x={w * 0.42} y={h * 0.05} width={w * 0.33} height={h * 0.2} fill="none" stroke={ACCENT} strokeWidth={0.5} />
        <text x={w * 0.42} y={h * 0.18} fontSize={5} textAnchor="middle" fill={ACCENT} fontFamily="monospace">PV MODULES</text>
      </g>

      {/* Salt solution reservoir */}
      <rect x={w * 0.25} y={h - 22} width={w * 0.5} height={16} fill="none" stroke="#f59e0b" strokeWidth={0.7} rx={2} />
      <text x={w / 2} y={h - 11} fontSize={5} textAnchor="middle" fill="#f59e0b" fontFamily="monospace">{p.saltConcentration}% NaCl RESERVOIR</text>

      {/* Drain */}
      <line x1={w / 2} y1={h} x2={w / 2} y2={h + 10} stroke={SUB} strokeWidth={0.6} />
      <text x={w / 2} y={h + 16} fontSize={4} textAnchor="middle" fill={SUB} fontFamily="monospace">DRAIN</text>

      {/* Temperature */}
      <circle cx={w - 15} cy={h * 0.5} r={3} fill="none" stroke="#ef4444" strokeWidth={0.5} />
      <text x={w - 15} y={h * 0.5 + 8} fontSize={4} textAnchor="middle" fill="#ef4444" fontFamily="monospace">{p.temperature}°C</text>

      <DimH x1={0} x2={w} y={h + 30} label={`${p.W}`} />
      <DimV y1={0} y2={h} x={-25} label={`${p.H}`} />
    </g>
  );
}

function RightView({ ox, oy, p }: { ox: number; oy: number; p: ReturnType<typeof resolve> }) {
  const s = 200 / 2000;
  const d = p.D * s, h = p.H * s;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={d / 2} y={-12} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">SIDE VIEW</text>
      <rect x={0} y={0} width={d} height={h} fill="none" stroke={LN} strokeWidth={1} />
      {/* Specimen at 15° angle */}
      <line x1={d * 0.15} y1={h * 0.6} x2={d * 0.85} y2={h * 0.3} stroke={ACCENT} strokeWidth={0.8} />
      <text x={d * 0.5} y={h * 0.42} fontSize={5} textAnchor="middle" fill={ACCENT} fontFamily="monospace"
        transform={`rotate(-15,${d * 0.5},${h * 0.42})`}>15° ANGLE</text>
      {/* Condensate */}
      <path d={`M8,${h - 8} L${d / 2},${h - 4} L${d - 8},${h - 8}`} fill="none" stroke="#3b82f6" strokeWidth={0.5} />
      <text x={d / 2} y={h - 12} fontSize={4} textAnchor="middle" fill="#3b82f6" fontFamily="monospace">CONDENSATE</text>
      {/* Air inlet */}
      <rect x={-5} y={h * 0.8} width={10} height={12} fill="none" stroke="#22c55e" strokeWidth={0.5} />
      <text x={-10} y={h * 0.86} fontSize={4} fill="#22c55e" fontFamily="monospace" textAnchor="end">AIR IN</text>
      {/* Exhaust */}
      <rect x={d - 5} y={8} width={10} height={12} fill="none" stroke={SUB} strokeWidth={0.5} />
      <text x={d + 8} y={15} fontSize={4} fill={SUB} fontFamily="monospace">EXHAUST</text>
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
      {/* Nozzle positions */}
      {Array.from({ length: p.nozzleCount }).map((_, i) => (
        <circle key={i} cx={w * (i + 1) / (p.nozzleCount + 1)} cy={d * 0.3} r={4} fill="none" stroke={ACCENT} strokeWidth={0.4} />
      ))}
      {/* Air supply pipe */}
      <line x1={-15} y1={d * 0.5} x2={0} y2={d * 0.5} stroke="#22c55e" strokeWidth={0.6} />
      <text x={-18} y={d * 0.5 + 5} fontSize={4} fill="#22c55e" fontFamily="monospace" textAnchor="end">AIR</text>
      {/* Salt supply */}
      <line x1={w + 15} y1={d * 0.5} x2={w} y2={d * 0.5} stroke="#f59e0b" strokeWidth={0.6} />
      <text x={w + 18} y={d * 0.5 + 5} fontSize={4} fill="#f59e0b" fontFamily="monospace">NaCl</text>
      <DimH x1={0} x2={w} y={d + 15} label={`${p.W}`} />
    </g>
  );
}

function SpecTable({ ox, oy, p }: { ox: number; oy: number; p: ReturnType<typeof resolve> }) {
  const rows = [
    ["Parameter", "Value"],
    ["Salt Solution", `${p.saltConcentration}% NaCl`],
    ["Temperature", `${p.temperature}±2°C`],
    ["Nozzle Count", `${p.nozzleCount}`],
    ["Specimen Angle", "15°–30° from vertical"],
    ["Dimensions (WxHxD)", `${p.W}×${p.H}×${p.D} mm`],
    ["Chamber Material", "FRP / PP-lined"],
    ["pH Range", "6.5–7.2"],
    ["Fog Collection", "1–2 mL/hr/80cm²"],
    ["Air Supply", "Compressed, oil-free"],
    ["Power Supply", "1-Ph 230V 50Hz"],
    ["Standard", "IEC 61701"],
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
      <text x={250} y={45} fontSize={10} fill={TXT} fontWeight="bold" fontFamily="monospace">SALT MIST CORROSION CHAMBER — IEC 61701</text>
      <text x={550} y={18} fontSize={8} fill={SUB} fontFamily="monospace">SCALE</text>
      <text x={550} y={45} fontSize={10} fill={TXT} fontFamily="monospace">1:50</text>
      <text x={750} y={18} fontSize={8} fill={SUB} fontFamily="monospace">MATERIAL</text>
      <text x={750} y={45} fontSize={9} fill={TXT} fontFamily="monospace">FRP / PP-lined</text>
      <text x={930} y={18} fontSize={8} fill={SUB} fontFamily="monospace">DATE: 2026-03-29</text>
      <text x={930} y={45} fontSize={8} fill={TXT} fontFamily="monospace">DWG NO: SS-SMC-001 REV A</text>
    </g>
  );
}

function GeneralNotes({ ox, oy }: { ox: number; oy: number }) {
  const notes = [
    "1. ALL DIMENSIONS IN MILLIMETERS UNLESS OTHERWISE STATED.",
    "2. CHAMBER: FRP CONSTRUCTION, CORROSION-RESISTANT.",
    "3. SPECIMEN ANGLE: 15°–30° FROM VERTICAL PER IEC 61701.",
    "4. COMPRESSED AIR: OIL-FREE, 1 BAR REGULATED.",
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

export default function SaltMistChamber({ params = {} }: { params?: SaltMistChamberParams }) {
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
