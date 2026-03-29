"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// IgnitabilityChamber — IEC 61730 / UL 790 Fire Test Chamber
// Professional A3 multi-view GA drawing with parametric dimensions
// ═══════════════════════════════════════════════════════════════════════════════

import React from "react";

export interface IgnitabilityChamberParams {
  cabinetWidth?: number;
  cabinetHeight?: number;
  cabinetDepth?: number;
  chimneyWidth?: number;
  chimneyHeight?: number;
  chimneyDepth?: number;
  windowDiameter?: number;
  burnerAngle?: number;
}

const DEFAULTS = {
  cabinetWidth: 900,
  cabinetHeight: 2400,
  cabinetDepth: 600,
  windowDiameter: 600,
  burnerAngle: 90,
};

function resolve(params: IgnitabilityChamberParams) {
  return {
    W: params.cabinetWidth ?? params.chimneyWidth ?? DEFAULTS.cabinetWidth,
    H: params.cabinetHeight ?? params.chimneyHeight ?? DEFAULTS.cabinetHeight,
    D: params.cabinetDepth ?? params.chimneyDepth ?? DEFAULTS.cabinetDepth,
    windowDiameter: params.windowDiameter ?? DEFAULTS.windowDiameter,
    burnerAngle: params.burnerAngle ?? DEFAULTS.burnerAngle,
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
  const s = 350 / 2400;
  const cw = p.W * s, ch = p.H * s;
  const wd = p.windowDiameter * s / 2;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={cw / 2} y={-14} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">FRONT VIEW</text>

      {/* Exhaust hood */}
      <polygon points={`${-12},${0} ${cw + 12},${0} ${cw - 8},${-25} ${8},${-25}`}
        fill="none" stroke={LN} strokeWidth={0.9} />
      <text x={cw / 2} y={-10} fontSize={5} textAnchor="middle" fill={SUB} fontFamily="monospace">EXHAUST HOOD</text>

      {/* Chimney body */}
      <rect x={0} y={0} width={cw} height={ch} fill="none" stroke={LN} strokeWidth={1.5} />

      {/* Draft screen */}
      <rect x={6} y={12} width={cw - 12} height={ch * 0.22} fill="none" stroke={SUB} strokeWidth={0.6} />
      {Array.from({ length: 14 }).map((_, i) => (
        <line key={i} x1={6 + (cw - 12) * (i / 14)} y1={12} x2={6 + (cw - 12) * (i / 14)} y2={12 + ch * 0.22}
          stroke={SUB} strokeWidth={0.2} />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={i} x1={6} y1={12 + ch * 0.22 * (i / 7)} x2={cw - 6} y2={12 + ch * 0.22 * (i / 7)}
          stroke={SUB} strokeWidth={0.2} />
      ))}
      <text x={cw / 2} y={12 + ch * 0.11} fontSize={5} textAnchor="middle" fill={SUB} fontFamily="monospace">DRAFT SCREEN</text>

      {/* Specimen holder */}
      <rect x={12} y={ch * 0.42} width={cw - 24} height={5} fill="none" stroke={ACCENT} strokeWidth={0.9} />
      <text x={cw / 2} y={ch * 0.42 - 5} fontSize={5} textAnchor="middle" fill={ACCENT} fontFamily="monospace">SPECIMEN HOLDER</text>

      {/* Observation window */}
      <circle cx={cw / 2} cy={ch * 0.58} r={wd} fill="none" stroke={LN} strokeWidth={0.9} />
      <circle cx={cw / 2} cy={ch * 0.58} r={wd - 3} fill="none" stroke={SUB} strokeWidth={0.3} />
      <text x={cw / 2} y={ch * 0.58 + wd + 10} fontSize={5} textAnchor="middle" fill={SUB} fontFamily="monospace">Ø{p.windowDiameter} WINDOW</text>

      {/* Burner assembly */}
      <g transform={`translate(${cw / 2},${ch * 0.73})`}>
        <rect x={-4} y={0} width={8} height={18} fill="none" stroke="#ef4444" strokeWidth={0.7} />
        <path d="M0,-12 Q-5,-6 0,0 Q5,-6 0,-12" fill="none" stroke="#f59e0b" strokeWidth={0.6} />
        <line x1={4} y1={9} x2={35} y2={9} stroke={SUB} strokeWidth={0.6} />
        <line x1={-4} y1={3} x2={-14} y2={-6} stroke="#a855f7" strokeWidth={0.5} />
        <circle cx={-14} cy={-6} r={1.5} fill="#a855f7" />
      </g>
      <text x={cw / 2 + 38} y={ch * 0.73 + 12} fontSize={5} fill={SUB} fontFamily="monospace">GAS SUPPLY</text>

      {/* Human figure for scale */}
      <g transform={`translate(${cw + 35},${ch - 120})`}>
        <circle cx={0} cy={6} r={5} fill="none" stroke="#6b7280" strokeWidth={0.5} />
        <line x1={0} y1={11} x2={0} y2={65} stroke="#6b7280" strokeWidth={0.5} />
        <line x1={0} y1={25} x2={-12} y2={45} stroke="#6b7280" strokeWidth={0.5} />
        <line x1={0} y1={25} x2={12} y2={45} stroke="#6b7280" strokeWidth={0.5} />
        <line x1={0} y1={65} x2={-10} y2={90} stroke="#6b7280" strokeWidth={0.5} />
        <line x1={0} y1={65} x2={10} y2={90} stroke="#6b7280" strokeWidth={0.5} />
        <text x={0} y={100} fontSize={4} textAnchor="middle" fill="#6b7280" fontFamily="monospace">1.7m REF</text>
      </g>

      <DimH x1={0} x2={cw} y={ch + 25} label={`${p.W}`} />
      <DimV y1={0} y2={ch} x={-25} label={`${p.H}`} />
    </g>
  );
}

function RightView({ ox, oy, p }: { ox: number; oy: number; p: ReturnType<typeof resolve> }) {
  const s = 200 / 2400;
  const cd = p.D * s, ch = p.H * s;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={cd / 2} y={-14} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">SIDE VIEW</text>
      <rect x={0} y={0} width={cd} height={ch} fill="none" stroke={LN} strokeWidth={0.9} />

      {/* Burner arm rotation */}
      <g transform={`translate(${cd / 2},${ch * 0.73})`}>
        <line x1={0} y1={0} x2={0} y2={28} stroke="#ef4444" strokeWidth={0.7} />
        <path d={`M0,28 A28,28 0 0,1 ${28 * Math.sin(p.burnerAngle * Math.PI / 180)},${28 - 28 * Math.cos(p.burnerAngle * Math.PI / 180) + 28}`}
          fill="none" stroke={SUB} strokeWidth={0.5} strokeDasharray="3,2" />
        <text x={18} y={42} fontSize={5} fill={SUB} fontFamily="monospace">0–{p.burnerAngle}°</text>
      </g>

      {/* Gas manifold */}
      <rect x={cd + 8} y={ch * 0.68} width={28} height={14} fill="none" stroke={SUB} strokeWidth={0.5} />
      <text x={cd + 22} y={ch * 0.68 - 4} fontSize={4} textAnchor="middle" fill={SUB} fontFamily="monospace">PRESSURE REG.</text>

      {/* Flow meter */}
      <rect x={cd + 8} y={ch * 0.68 + 18} width={28} height={12} fill="none" stroke={SUB} strokeWidth={0.5} />
      <text x={cd + 22} y={ch * 0.68 + 26} fontSize={4} textAnchor="middle" fill={SUB} fontFamily="monospace">FLOW METER</text>

      {/* Thermocouples */}
      {[0.2, 0.4, 0.62].map((f, i) => (
        <g key={i}>
          <line x1={cd} y1={ch * f} x2={cd + 6} y2={ch * f} stroke="#ef4444" strokeWidth={0.4} />
          <circle cx={cd + 6} cy={ch * f} r={1.5} fill="#ef4444" />
          <text x={cd + 10} y={ch * f + 2} fontSize={4} fill="#ef4444" fontFamily="monospace">TC{i + 1}</text>
        </g>
      ))}

      <DimH x1={0} x2={cd} y={ch + 25} label={`${p.D}`} />
    </g>
  );
}

function TopView({ ox, oy, p }: { ox: number; oy: number; p: ReturnType<typeof resolve> }) {
  const s = 350 / 2400;
  const w = p.W * s, d = Math.min(p.D * s, 120);

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={w / 2} y={-8} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">TOP VIEW</text>
      <rect x={0} y={0} width={w} height={d} fill="none" stroke={LN} strokeWidth={1.2} />
      {/* Exhaust opening */}
      <rect x={w * 0.2} y={d * 0.2} width={w * 0.6} height={d * 0.6} fill="none" stroke={SUB} strokeWidth={0.5} strokeDasharray="4,3" />
      <text x={w * 0.5} y={d * 0.55} fontSize={5} textAnchor="middle" fill={SUB} fontFamily="monospace">EXHAUST</text>
      {/* Gas inlet pipe */}
      <circle cx={w + 12} cy={d * 0.5} r={4} fill="none" stroke={SUB} strokeWidth={0.4} />
      <text x={w + 12} y={d * 0.5 + 9} fontSize={4} textAnchor="middle" fill={SUB} fontFamily="monospace">GAS</text>
      <line x1={w} y1={d * 0.5} x2={w + 8} y2={d * 0.5} stroke={SUB} strokeWidth={0.4} />
      <DimH x1={0} x2={w} y={d + 15} label={`${p.W}`} />
    </g>
  );
}

function SpecTable({ ox, oy, p }: { ox: number; oy: number; p: ReturnType<typeof resolve> }) {
  const rows = [
    ["Parameter", "Value"],
    ["Chimney Size (WxHxD)", `${p.W}×${p.H}×${p.D} mm`],
    ["Observation Window", `Ø${p.windowDiameter} mm`],
    ["Burner Rotation", `0–${p.burnerAngle}°`],
    ["Draft Screen", "SS wire 25×25 mesh"],
    ["Chimney Material", "SS304 stainless"],
    ["Window Material", "Borosilicate T=10mm"],
    ["Gas Type", "Methane / Propane"],
    ["Thermocouple", "Type K, 3 positions"],
    ["Ignition", "Pilot + spark electrode"],
    ["Control", "PLC + HMI"],
    ["Standard", "IEC 61730 / UL 790"],
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
      <text x={250} y={45} fontSize={10} fill={TXT} fontWeight="bold" fontFamily="monospace">IGNITABILITY TEST CHAMBER — IEC 61730 / UL 790</text>
      <text x={550} y={18} fontSize={8} fill={SUB} fontFamily="monospace">SCALE</text>
      <text x={550} y={45} fontSize={10} fill={TXT} fontFamily="monospace">1:50</text>
      <text x={750} y={18} fontSize={8} fill={SUB} fontFamily="monospace">MATERIAL</text>
      <text x={750} y={45} fontSize={9} fill={TXT} fontFamily="monospace">SS304 Stainless Steel</text>
      <text x={930} y={18} fontSize={8} fill={SUB} fontFamily="monospace">DATE: 2026-03-29</text>
      <text x={930} y={45} fontSize={8} fill={TXT} fontFamily="monospace">DWG NO: SS-IGN-001 REV A</text>
    </g>
  );
}

function GeneralNotes({ ox, oy }: { ox: number; oy: number }) {
  const notes = [
    "1. ALL DIMENSIONS IN MILLIMETERS UNLESS OTHERWISE STATED.",
    "2. CHIMNEY MATERIAL: SS304 STAINLESS STEEL.",
    "3. OBSERVATION WINDOW: BOROSILICATE GLASS T=10mm.",
    "4. GAS: METHANE/PROPANE PER STANDARD REQUIREMENTS.",
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

export default function IgnitabilityChamber({ params = {} }: { params?: IgnitabilityChamberParams }) {
  const p = resolve(params);

  return (
    <svg viewBox="0 0 1189 841" className="w-full h-full" style={{ background: "transparent" }} fontFamily="monospace">
      <rect x={5} y={5} width={1179} height={831} fill="none" stroke="#30363d" strokeWidth={1.5} />
      <rect x={12} y={12} width={1165} height={817} fill="none" stroke="#21262d" strokeWidth={0.7} />

      <TopView ox={50} oy={50} p={p} />
      <FrontView ox={50} oy={190} p={p} />
      <RightView ox={330} oy={190} p={p} />
      <SpecTable ox={700} oy={340} p={p} />
      <GeneralNotes ox={700} oy={600} />
      <TitleBlock y={770} />
    </svg>
  );
}
