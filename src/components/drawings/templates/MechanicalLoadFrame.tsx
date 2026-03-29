"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// MechanicalLoadFrame — IEC 62782 / IEC 61215 MQT 16
// Professional A3 multi-view GA drawing with parametric dimensions
// ═══════════════════════════════════════════════════════════════════════════════

import React from "react";

export interface MechanicalLoadFrameParams {
  cabinetWidth?: number;
  cabinetHeight?: number;
  cabinetDepth?: number;
  frameWidth?: number;
  frameHeight?: number;
  frameDepth?: number;
  moduleWidth?: number;
  moduleHeight?: number;
  maxLoadFront?: number;
  maxLoadRear?: number;
  actuatorForce?: number;
}

const DEFAULTS = {
  cabinetWidth: 1600,
  cabinetHeight: 2200,
  cabinetDepth: 800,
  moduleWidth: 2000,
  moduleHeight: 1000,
  maxLoadFront: 5400,
  maxLoadRear: 2400,
  actuatorForce: 50,
};

function resolve(params: MechanicalLoadFrameParams) {
  return {
    W: params.cabinetWidth ?? params.frameWidth ?? DEFAULTS.cabinetWidth,
    H: params.cabinetHeight ?? params.frameHeight ?? DEFAULTS.cabinetHeight,
    D: params.cabinetDepth ?? params.frameDepth ?? DEFAULTS.cabinetDepth,
    moduleWidth: params.moduleWidth ?? DEFAULTS.moduleWidth,
    moduleHeight: params.moduleHeight ?? DEFAULTS.moduleHeight,
    maxLoadFront: params.maxLoadFront ?? DEFAULTS.maxLoadFront,
    maxLoadRear: params.maxLoadRear ?? DEFAULTS.maxLoadRear,
    actuatorForce: params.actuatorForce ?? DEFAULTS.actuatorForce,
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
  const s = 350 / 2200;
  const fw = p.W * s, fh = p.H * s;
  const col = 10;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={fw / 2} y={-12} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">FRONT VIEW</text>

      {/* Base plate */}
      <rect x={-12} y={fh} width={fw + 24} height={6} fill="none" stroke={LN} strokeWidth={1.2} />
      {[-8, fw + 8, fw / 3, (2 * fw) / 3].map((bx, i) => (
        <circle key={i} cx={bx} cy={fh + 3} r={2} fill="none" stroke={LN} strokeWidth={0.5} />
      ))}

      {/* 4 Vertical columns */}
      {[0, fw / 3, (2 * fw) / 3, fw - col].map((cx, i) => (
        <g key={`col-${i}`}>
          <rect x={cx + col / 2 - 1.5} y={0} width={3} height={fh} fill="none" stroke={LN} strokeWidth={0.8} />
          <rect x={cx + col / 2 - 8} y={0} width={16} height={3} fill="none" stroke={LN} strokeWidth={0.7} />
          <rect x={cx + col / 2 - 8} y={fh - 3} width={16} height={3} fill="none" stroke={LN} strokeWidth={0.7} />
        </g>
      ))}

      {/* Cross-bracing */}
      <line x1={col / 2} y1={fh * 0.15} x2={fw / 3 + col / 2} y2={fh * 0.45} stroke={LN} strokeWidth={0.5} strokeDasharray="3,2" />
      <line x1={col / 2} y1={fh * 0.45} x2={fw / 3 + col / 2} y2={fh * 0.15} stroke={LN} strokeWidth={0.5} strokeDasharray="3,2" />

      {/* Load beam */}
      <rect x={-8} y={5} width={fw + 16} height={8} fill="none" stroke={LN} strokeWidth={1} />

      {/* Hydraulic actuator */}
      <rect x={fw / 2 - 12} y={16} width={24} height={28} fill="none" stroke={ACCENT} strokeWidth={0.8} rx={1} />
      <rect x={fw / 2 - 6} y={44} width={12} height={18} fill="none" stroke={ACCENT} strokeWidth={0.6} />
      <text x={fw / 2 + 16} y={30} fontSize={5} fill={ACCENT} fontFamily="monospace">ACTUATOR</text>

      {/* Load cell */}
      <rect x={fw / 2 - 8} y={62} width={16} height={8} fill="none" stroke="#f59e0b" strokeWidth={0.6} />
      <text x={fw / 2 + 14} y={68} fontSize={4} fill="#f59e0b" fontFamily="monospace">LOAD CELL</text>

      {/* Pressure pad */}
      <rect x={fw / 2 - 35} y={72} width={70} height={5} fill="none" stroke={LN} strokeWidth={0.8} />

      {/* PV Module */}
      <g transform={`translate(${fw / 2 - 55},${fh * 0.5})`}>
        <rect x={0} y={0} width={110} height={55} fill="none" stroke={ACCENT} strokeWidth={0.9} />
        {Array.from({ length: 10 }).map((_, ci) => (
          <line key={ci} x1={11 * (ci + 1)} y1={0} x2={11 * (ci + 1)} y2={55} stroke={ACCENT} strokeWidth={0.15} />
        ))}
        {Array.from({ length: 5 }).map((_, ri) => (
          <line key={ri} x1={0} y1={11 * (ri + 1)} x2={110} y2={11 * (ri + 1)} stroke={ACCENT} strokeWidth={0.15} />
        ))}
        <text x={55} y={-4} fontSize={5} textAnchor="middle" fill={ACCENT} fontFamily="monospace">PV MODULE</text>
      </g>

      {/* Force arrows */}
      {[-20, -8, 8, 20].map((dx, i) => (
        <g key={i}>
          <line x1={fw / 2 + dx} y1={78} x2={fw / 2 + dx} y2={fh * 0.5 - 5} stroke="#ef4444" strokeWidth={0.7} />
          <polygon points={`${fw / 2 + dx},${fh * 0.5 - 5} ${fw / 2 + dx - 2.5},${fh * 0.5 - 12} ${fw / 2 + dx + 2.5},${fh * 0.5 - 12}`} fill="#ef4444" stroke="none" />
        </g>
      ))}
      <text x={fw / 2 + 35} y={fh * 0.35} fontSize={5} fill="#ef4444" fontFamily="monospace">{p.maxLoadFront}Pa</text>

      {/* Support table */}
      <rect x={fw / 2 - 60} y={fh * 0.5 + 55} width={120} height={4} fill="none" stroke={LN} strokeWidth={0.7} />
      {[fw / 2 - 48, fw / 2 + 48].map((lx, i) => (
        <rect key={i} x={lx - 3} y={fh * 0.5 + 59} width={6} height={fh * 0.3} fill="none" stroke={LN} strokeWidth={0.5} />
      ))}

      <DimH x1={0} x2={fw} y={fh + 25} label={`${p.W}`} />
      <DimV y1={0} y2={fh} x={-25} label={`${p.H}`} />
    </g>
  );
}

function RightView({ ox, oy, p }: { ox: number; oy: number; p: ReturnType<typeof resolve> }) {
  const s = 200 / 2200;
  const fd = p.D * s, fh = p.H * s;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={fd / 2} y={-12} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">SIDE VIEW</text>
      <rect x={0} y={0} width={fd} height={fh} fill="none" stroke={LN} strokeWidth={0.8} />
      <rect x={3} y={0} width={8} height={fh} fill="none" stroke={LN} strokeWidth={0.5} />
      <rect x={fd - 11} y={0} width={8} height={fh} fill="none" stroke={LN} strokeWidth={0.5} />

      {/* Actuator */}
      <rect x={fd / 2 - 8} y={16} width={16} height={24} fill="none" stroke={ACCENT} strokeWidth={0.7} rx={1} />
      <rect x={fd / 2 - 4} y={40} width={8} height={20} fill="none" stroke={ACCENT} strokeWidth={0.5} />

      {/* Module side view */}
      <rect x={8} y={fh * 0.5} width={fd - 16} height={3} fill="none" stroke={ACCENT} strokeWidth={0.8} />
      <path d={`M8,${fh * 0.5 + 1.5} Q${fd / 2},${fh * 0.5 + 12} ${fd - 8},${fh * 0.5 + 1.5}`}
        fill="none" stroke="#f59e0b" strokeWidth={0.6} strokeDasharray="3,2" />
      <text x={fd / 2 + 14} y={fh * 0.5 + 14} fontSize={4} fill="#f59e0b" fontFamily="monospace">DEFLECTION</text>

      {/* LVDT */}
      <line x1={fd * 0.75} y1={fh * 0.5 - 15} x2={fd * 0.75} y2={fh * 0.5} stroke="#a855f7" strokeWidth={0.5} />
      <circle cx={fd * 0.75} cy={fh * 0.5} r={1.5} fill="#a855f7" />
      <text x={fd * 0.75 + 6} y={fh * 0.5 - 8} fontSize={4} fill="#a855f7" fontFamily="monospace">LVDT</text>

      <DimH x1={0} x2={fd} y={fh + 25} label={`${p.D}`} />
    </g>
  );
}

function TopView({ ox, oy, p }: { ox: number; oy: number; p: ReturnType<typeof resolve> }) {
  const s = 350 / 2200;
  const w = p.W * s, d = Math.min(p.D * s, 120);

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={w / 2} y={-8} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">TOP VIEW</text>
      <rect x={0} y={0} width={w} height={d} fill="none" stroke={LN} strokeWidth={1.2} />
      {/* Column positions */}
      {[0.05, 0.35, 0.65, 0.95].map((f, i) => (
        <rect key={i} x={w * f - 5} y={2} width={10} height={d - 4} fill="none" stroke={LN} strokeWidth={0.4} />
      ))}
      {/* Actuator cylinder top */}
      <circle cx={w * 0.5} cy={d * 0.5} r={10} fill="none" stroke={ACCENT} strokeWidth={0.6} />
      <text x={w * 0.5} y={d * 0.5 + 15} fontSize={4} textAnchor="middle" fill={ACCENT} fontFamily="monospace">ACTUATOR</text>
      {/* Hydraulic hoses */}
      <line x1={w * 0.5 + 10} y1={d * 0.5} x2={w + 15} y2={d * 0.5} stroke="#ef4444" strokeWidth={0.4} />
      <text x={w + 18} y={d * 0.5 + 2} fontSize={4} fill="#ef4444" fontFamily="monospace">HPU</text>
      <DimH x1={0} x2={w} y={d + 15} label={`${p.W}`} />
    </g>
  );
}

function SpecTable({ ox, oy, p }: { ox: number; oy: number; p: ReturnType<typeof resolve> }) {
  const rows = [
    ["Parameter", "Value"],
    ["Max Load (Front)", `${p.maxLoadFront} Pa`],
    ["Max Load (Rear)", `${p.maxLoadRear} Pa`],
    ["Module Size", `up to ${p.moduleWidth}×${p.moduleHeight} mm`],
    ["Actuator Force", `${p.actuatorForce} kN hydraulic`],
    ["Frame Size (WxHxD)", `${p.W}×${p.H}×${p.D} mm`],
    ["Frame Material", "S355 structural steel"],
    ["Load Application", "Uniform via air bag"],
    ["Deflection Sensor", "LVDT ±0.01mm"],
    ["Cycle Capability", "3 cycles front/rear"],
    ["Power Supply", "3-Ph 415V 50Hz"],
    ["Standard", "IEC 62782 / MQT 16"],
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
      <text x={250} y={45} fontSize={10} fill={TXT} fontWeight="bold" fontFamily="monospace">MECHANICAL LOAD TEST FRAME — IEC 62782 / MQT 16</text>
      <text x={550} y={18} fontSize={8} fill={SUB} fontFamily="monospace">SCALE</text>
      <text x={550} y={45} fontSize={10} fill={TXT} fontFamily="monospace">1:50</text>
      <text x={750} y={18} fontSize={8} fill={SUB} fontFamily="monospace">MATERIAL</text>
      <text x={750} y={45} fontSize={9} fill={TXT} fontFamily="monospace">S355 Structural Steel</text>
      <text x={930} y={18} fontSize={8} fill={SUB} fontFamily="monospace">DATE: 2026-03-29</text>
      <text x={930} y={45} fontSize={8} fill={TXT} fontFamily="monospace">DWG NO: SS-MLF-001 REV A</text>
    </g>
  );
}

function GeneralNotes({ ox, oy }: { ox: number; oy: number }) {
  const notes = [
    "1. ALL DIMENSIONS IN MILLIMETERS UNLESS OTHERWISE STATED.",
    "2. FRAME: S355 STRUCTURAL STEEL, HOT-DIP GALVANIZED.",
    "3. LOAD PER IEC 62782 §5.2 — UNIFORM DISTRIBUTION.",
    "4. LVDT DISPLACEMENT ACCURACY ±0.01mm.",
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

export default function MechanicalLoadFrame({ params = {} }: { params?: MechanicalLoadFrameParams }) {
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
