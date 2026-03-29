"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// MechanicalLoadFrame — IEC 62782 / IEC 61215 MQT 16 Mechanical Load Test Frame
// Professional multi-view GA drawing with parametric dimensions
// ═══════════════════════════════════════════════════════════════════════════════

import React from "react";

export interface MechanicalLoadFrameParams {
  frameWidth?: number;   // mm
  frameHeight?: number;  // mm
  frameDepth?: number;   // mm
  moduleWidth?: number;  // mm
  moduleHeight?: number; // mm
  maxLoadFront?: number; // Pa
  maxLoadRear?: number;  // Pa
  actuatorForce?: number;// kN
}

const DEFAULTS: Required<MechanicalLoadFrameParams> = {
  frameWidth: 1600,
  frameHeight: 2200,
  frameDepth: 800,
  moduleWidth: 2000,
  moduleHeight: 1000,
  maxLoadFront: 5400,
  maxLoadRear: 2400,
  actuatorForce: 50,
};

// ── Drawing constants ──
const C = "#c9d1d9";       // primary stroke (light for dark bg)
const CA = "#00D4FF";       // accent / dimension color
const CD = "#8b949e";       // dimension lines
const CT = "#58a6ff";       // title text
const CW = "#f0f6ff";       // white fill for light areas
const BG = "#0d1117";       // dark background

// ── SVG Primitives ──
function DimH({ x1, x2, y, label, ext = 12 }: { x1: number; x2: number; y: number; label: string; ext?: number }) {
  return (
    <g stroke={CD} strokeWidth={0.5} fill="none">
      <line x1={x1} y1={y - ext} x2={x1} y2={y + 3} />
      <line x1={x2} y1={y - ext} x2={x2} y2={y + 3} />
      <line x1={x1 + 3} y1={y} x2={x2 - 3} y2={y} />
      <polygon points={`${x1},${y} ${x1 + 4},${y - 1.5} ${x1 + 4},${y + 1.5}`} fill={CD} stroke="none" />
      <polygon points={`${x2},${y} ${x2 - 4},${y - 1.5} ${x2 - 4},${y + 1.5}`} fill={CD} stroke="none" />
      <text x={(x1 + x2) / 2} y={y - 3} fontSize={5} textAnchor="middle" fill={CA} stroke="none" fontFamily="monospace">{label}</text>
    </g>
  );
}

function DimV({ y1, y2, x, label, ext = 12 }: { y1: number; y2: number; x: number; label: string; ext?: number }) {
  const mid = (y1 + y2) / 2;
  return (
    <g stroke={CD} strokeWidth={0.5} fill="none">
      <line x1={x - ext} y1={y1} x2={x + 3} y2={y1} />
      <line x1={x - ext} y1={y2} x2={x + 3} y2={y2} />
      <line x1={x} y1={y1 + 3} x2={x} y2={y2 - 3} />
      <polygon points={`${x},${y1} ${x - 1.5},${y1 + 4} ${x + 1.5},${y1 + 4}`} fill={CD} stroke="none" />
      <polygon points={`${x},${y2} ${x - 1.5},${y2 - 4} ${x + 1.5},${y2 - 4}`} fill={CD} stroke="none" />
      <text x={x - 4} y={mid} fontSize={5} textAnchor="middle" fill={CA} stroke="none" fontFamily="monospace"
        transform={`rotate(-90,${x - 4},${mid})`}>{label}</text>
    </g>
  );
}

function Balloon({ x, y, num, tx, ty }: { x: number; y: number; num: number; tx: number; ty: number }) {
  return (
    <g>
      <circle cx={tx} cy={ty} r={5} fill="none" stroke={CA} strokeWidth={0.5} />
      <text x={tx} y={ty + 1.5} fontSize={4} textAnchor="middle" fill={CA} fontFamily="monospace">{num}</text>
      <line x1={x} y1={y} x2={tx} y2={ty} stroke={CA} strokeWidth={0.3} strokeDasharray="1.5,1" />
    </g>
  );
}

// ── Front View ──
function FrontView({ ox, oy, p }: { ox: number; oy: number; p: Required<MechanicalLoadFrameParams> }) {
  const s = 0.08; // scale factor mm -> SVG units
  const fw = p.frameWidth * s;
  const fh = p.frameHeight * s;
  const col = 8; // column width
  const flange = 12; // I-beam flange width

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={fw / 2} y={-8} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">FRONT VIEW</text>

      {/* Base plate */}
      <rect x={-10} y={fh} width={fw + 20} height={4} fill="none" stroke={C} strokeWidth={1.2} />
      {/* Anchor bolt holes */}
      {[-5, fw + 5, fw / 3, (2 * fw) / 3].map((bx, i) => (
        <circle key={i} cx={bx} cy={fh + 2} r={1.5} fill="none" stroke={C} strokeWidth={0.5} />
      ))}

      {/* 4 Vertical columns (I-beam profile) */}
      {[0, fw / 3, (2 * fw) / 3, fw - col].map((cx, i) => (
        <g key={`col-${i}`}>
          {/* Web */}
          <rect x={cx + col / 2 - 1} y={0} width={2} height={fh} fill="none" stroke={C} strokeWidth={0.7} />
          {/* Top flange */}
          <rect x={cx + col / 2 - flange / 2} y={0} width={flange} height={2} fill="none" stroke={C} strokeWidth={0.7} />
          {/* Bottom flange */}
          <rect x={cx + col / 2 - flange / 2} y={fh - 2} width={flange} height={2} fill="none" stroke={C} strokeWidth={0.7} />
        </g>
      ))}

      {/* Cross-bracing */}
      <line x1={col / 2} y1={fh * 0.15} x2={fw / 3 + col / 2} y2={fh * 0.45} stroke={C} strokeWidth={0.5} strokeDasharray="2,1" />
      <line x1={col / 2} y1={fh * 0.45} x2={fw / 3 + col / 2} y2={fh * 0.15} stroke={C} strokeWidth={0.5} strokeDasharray="2,1" />
      <line x1={(2 * fw) / 3 + col / 2} y1={fh * 0.15} x2={fw - col / 2} y2={fh * 0.45} stroke={C} strokeWidth={0.5} strokeDasharray="2,1" />
      <line x1={(2 * fw) / 3 + col / 2} y1={fh * 0.45} x2={fw - col / 2} y2={fh * 0.15} stroke={C} strokeWidth={0.5} strokeDasharray="2,1" />

      {/* Horizontal load beam at top */}
      <rect x={-5} y={4} width={fw + 10} height={6} fill="none" stroke={C} strokeWidth={1} />

      {/* Hydraulic actuator (cylinder + piston) */}
      <rect x={fw / 2 - 8} y={12} width={16} height={20} fill="none" stroke={CA} strokeWidth={0.8} rx={1} />
      <rect x={fw / 2 - 4} y={32} width={8} height={12} fill="none" stroke={CA} strokeWidth={0.6} />
      <text x={fw / 2 + 12} y={22} fontSize={3.5} fill={CA} fontFamily="monospace">ACTUATOR</text>

      {/* Load cell */}
      <rect x={fw / 2 - 5} y={44} width={10} height={5} fill="none" stroke="#f59e0b" strokeWidth={0.6} />
      {/* Wire leads */}
      <line x1={fw / 2 + 5} y1={46} x2={fw / 2 + 12} y2={44} stroke="#f59e0b" strokeWidth={0.3} />
      <line x1={fw / 2 + 5} y1={48} x2={fw / 2 + 12} y2={50} stroke="#f59e0b" strokeWidth={0.3} />

      {/* Pressure distribution pad */}
      <rect x={fw / 2 - 25} y={50} width={50} height={3} fill="none" stroke={C} strokeWidth={0.8} />

      {/* PV Module on support table */}
      <g transform={`translate(${fw / 2 - 40},${fh * 0.5})`}>
        {/* Module outline */}
        <rect x={0} y={0} width={80} height={40} fill="none" stroke={CA} strokeWidth={0.8} />
        {/* Cell grid pattern */}
        {Array.from({ length: 8 }).map((_, ci) => (
          <line key={`cg-${ci}`} x1={10 * (ci + 1)} y1={0} x2={10 * (ci + 1)} y2={40} stroke={CA} strokeWidth={0.15} />
        ))}
        {Array.from({ length: 4 }).map((_, ri) => (
          <line key={`rg-${ri}`} x1={0} y1={8 * (ri + 1)} x2={80} y2={8 * (ri + 1)} stroke={CA} strokeWidth={0.15} />
        ))}
        <text x={40} y={-3} fontSize={3.5} textAnchor="middle" fill={CA} fontFamily="monospace">PV MODULE</text>
      </g>

      {/* Support table with telescoping legs */}
      <rect x={fw / 2 - 45} y={fh * 0.5 + 40} width={90} height={3} fill="none" stroke={C} strokeWidth={0.6} />
      {[fw / 2 - 35, fw / 2 + 35].map((lx, i) => (
        <g key={`leg-${i}`}>
          <rect x={lx - 2} y={fh * 0.5 + 43} width={4} height={fh * 0.35} fill="none" stroke={C} strokeWidth={0.5} />
          {/* Bolt holes for height adjustment */}
          {[0.25, 0.5, 0.75].map((f, j) => (
            <circle key={j} cx={lx} cy={fh * 0.5 + 43 + fh * 0.35 * f} r={0.8} fill="none" stroke={C} strokeWidth={0.3} />
          ))}
        </g>
      ))}

      {/* Force arrows - downward applied load */}
      {[-15, -5, 5, 15].map((dx, i) => (
        <g key={`fa-${i}`}>
          <line x1={fw / 2 + dx} y1={55} x2={fw / 2 + dx} y2={fh * 0.5 - 3} stroke="#ef4444" strokeWidth={0.6} />
          <polygon points={`${fw / 2 + dx},${fh * 0.5 - 3} ${fw / 2 + dx - 2},${fh * 0.5 - 8} ${fw / 2 + dx + 2},${fh * 0.5 - 8}`} fill="#ef4444" stroke="none" />
        </g>
      ))}
      <text x={fw / 2 + 30} y={fh * 0.35} fontSize={3.5} fill="#ef4444" fontFamily="monospace">{p.maxLoadRear}Pa UNIFORM</text>

      {/* Reaction force arrows at base */}
      {[fw * 0.2, fw * 0.5, fw * 0.8].map((rx, i) => (
        <g key={`ra-${i}`}>
          <line x1={rx} y1={fh + 6} x2={rx} y2={fh + 16} stroke="#22c55e" strokeWidth={0.6} />
          <polygon points={`${rx},${fh + 6} ${rx - 2},${fh + 11} ${rx + 2},${fh + 11}`} fill="#22c55e" stroke="none" />
        </g>
      ))}

      {/* Dimension lines */}
      <DimH x1={0} x2={fw} y={fh + 22} label={`${p.frameWidth}`} ext={6} />
      <DimV y1={0} y2={fh} x={-20} label={`${p.frameHeight}`} />

      {/* Balloon callouts */}
      <Balloon x={fw / 2} y={22} num={1} tx={fw + 15} ty={15} />
      <Balloon x={fw / 2} y={46} num={2} tx={fw + 15} ty={35} />
      <Balloon x={fw / 2} y={51} num={3} tx={fw + 15} ty={55} />
      <Balloon x={fw / 2 - 40} y={fh * 0.5 + 20} num={4} tx={-25} ty={fh * 0.5 + 20} />
    </g>
  );
}

// ── Side View ──
function SideView({ ox, oy, p }: { ox: number; oy: number; p: Required<MechanicalLoadFrameParams> }) {
  const s = 0.08;
  const fd = p.frameDepth * s;
  const fh = p.frameHeight * s;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={fd / 2} y={-8} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">SIDE VIEW</text>

      {/* Frame depth */}
      <rect x={0} y={0} width={fd} height={fh} fill="none" stroke={C} strokeWidth={0.7} />

      {/* Columns */}
      <rect x={2} y={0} width={6} height={fh} fill="none" stroke={C} strokeWidth={0.5} />
      <rect x={fd - 8} y={0} width={6} height={fh} fill="none" stroke={C} strokeWidth={0.5} />

      {/* Actuator cylinder detail */}
      <rect x={fd / 2 - 6} y={12} width={12} height={18} fill="none" stroke={CA} strokeWidth={0.7} rx={1} />
      {/* Piston rod */}
      <rect x={fd / 2 - 2.5} y={30} width={5} height={15} fill="none" stroke={CA} strokeWidth={0.5} />

      {/* Module (side view - thin) */}
      <rect x={5} y={fh * 0.5} width={fd - 10} height={2} fill="none" stroke={CA} strokeWidth={0.7} />
      {/* Module deflection curve (dashed) */}
      <path d={`M5,${fh * 0.5 + 1} Q${fd / 2},${fh * 0.5 + 8} ${fd - 5},${fh * 0.5 + 1}`}
        fill="none" stroke="#f59e0b" strokeWidth={0.5} strokeDasharray="2,1" />
      <text x={fd / 2 + 10} y={fh * 0.5 + 10} fontSize={3} fill="#f59e0b" fontFamily="monospace">DEFLECTION</text>

      {/* LVDT sensor */}
      <line x1={fd * 0.75} y1={fh * 0.5 - 10} x2={fd * 0.75} y2={fh * 0.5} stroke="#a855f7" strokeWidth={0.4} />
      <circle cx={fd * 0.75} cy={fh * 0.5} r={1} fill="#a855f7" />
      <text x={fd * 0.75 + 5} y={fh * 0.5 - 5} fontSize={3} fill="#a855f7" fontFamily="monospace">LVDT</text>

      {/* Dimension */}
      <DimH x1={0} x2={fd} y={fh + 18} label={`${p.frameDepth}`} ext={6} />
    </g>
  );
}

// ── Detail View A - Actuator Assembly (Scale 2:1) ──
function DetailViewA({ ox, oy }: { ox: number; oy: number }) {
  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={40} y={-8} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">DETAIL A (2:1) — ACTUATOR ASSY</text>

      {/* Hydraulic cylinder body */}
      <rect x={10} y={0} width={60} height={30} fill="none" stroke={C} strokeWidth={1} rx={2} />
      <text x={40} y={18} fontSize={4} textAnchor="middle" fill={CD} fontFamily="monospace">HYDRAULIC CYL</text>

      {/* Piston rod */}
      <rect x={30} y={30} width={20} height={16} fill="none" stroke={C} strokeWidth={0.8} />

      {/* Swivel joint */}
      <circle cx={40} cy={50} r={4} fill="none" stroke={CA} strokeWidth={0.7} />
      <circle cx={40} cy={50} r={1} fill={CA} />

      {/* Load cell */}
      <rect x={28} y={55} width={24} height={8} fill="none" stroke="#f59e0b" strokeWidth={0.7} />
      <text x={40} y={61} fontSize={3} textAnchor="middle" fill="#f59e0b" fontFamily="monospace">LOAD CELL</text>

      {/* Pressure pad */}
      <rect x={15} y={65} width={50} height={5} fill="none" stroke={C} strokeWidth={0.8} />

      {/* Bolt pattern */}
      {[20, 35, 50, 65].map((bx, i) => (
        <g key={i}>
          <circle cx={bx} cy={-4} r={1.5} fill="none" stroke={CD} strokeWidth={0.4} />
          <line x1={bx} y1={-5.5} x2={bx} y2={-2.5} stroke={CD} strokeWidth={0.2} />
          <line x1={bx - 1.5} y1={-4} x2={bx + 1.5} y2={-4} stroke={CD} strokeWidth={0.2} />
        </g>
      ))}

      {/* Balloon callouts */}
      <Balloon x={40} y={15} num={1} tx={80} ty={5} />
      <Balloon x={40} y={38} num={2} tx={80} ty={25} />
      <Balloon x={40} y={50} num={3} tx={80} ty={45} />
      <Balloon x={40} y={59} num={4} tx={80} ty={60} />
      <Balloon x={40} y={67} num={5} tx={80} ty={72} />
    </g>
  );
}

// ── Specification Table ──
function SpecTable({ ox, oy, p }: { ox: number; oy: number; p: Required<MechanicalLoadFrameParams> }) {
  const rows = [
    ["Parameter", "Value"],
    ["Max Load (Front)", `${p.maxLoadFront} Pa`],
    ["Max Load (Rear)", `${p.maxLoadRear} Pa`],
    ["Module Size", `up to ${p.moduleWidth}×${p.moduleHeight} mm`],
    ["Actuator Force", `${p.actuatorForce} kN hydraulic`],
    ["Frame Size", `${p.frameWidth}×${p.frameHeight}×${p.frameDepth} mm`],
    ["Standard", "IEC 62782 / IEC 61215 MQT 16"],
  ];
  const cw = [65, 90];
  const rh = 9;

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

// ── Main Component ──
export default function MechanicalLoadFrame({ params = {} }: { params?: MechanicalLoadFrameParams }) {
  const p = { ...DEFAULTS, ...params };
  const W = 841, H = 594;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ background: BG }} fontFamily="monospace">
      {/* Sheet border */}
      <rect x={8} y={8} width={W - 16} height={H - 16} fill="none" stroke="#30363d" strokeWidth={1.2} />
      <rect x={14} y={14} width={W - 28} height={H - 28} fill="none" stroke="#21262d" strokeWidth={0.6} />

      {/* Title */}
      <text x={W / 2} y={30} fontSize={10} textAnchor="middle" fill={CA} fontWeight="bold">
        MECHANICAL LOAD TEST FRAME — IEC 62782 / IEC 61215 MQT 16
      </text>

      {/* Front View */}
      <FrontView ox={60} oy={55} p={p} />

      {/* Side View */}
      <SideView ox={330} oy={55} p={p} />

      {/* Detail View A */}
      <DetailViewA ox={480} oy={55} />

      {/* Specification Table */}
      <SpecTable ox={480} oy={230} p={p} />

      {/* Title block */}
      <g transform={`translate(${W - 260},${H - 55})`}>
        <rect x={0} y={0} width={240} height={40} fill="#161b22" stroke="#30363d" strokeWidth={0.8} />
        <line x1={80} y1={0} x2={80} y2={40} stroke="#21262d" strokeWidth={0.4} />
        <line x1={160} y1={0} x2={160} y2={40} stroke="#21262d" strokeWidth={0.4} />
        <line x1={0} y1={20} x2={240} y2={20} stroke="#21262d" strokeWidth={0.4} />
        <text x={4} y={12} fontSize={4} fill={CD}>DRAWN BY</text>
        <text x={4} y={34} fontSize={5} fill={C} fontWeight="bold">ShilpaSutra AI</text>
        <text x={84} y={12} fontSize={4} fill={CD}>PART NO.</text>
        <text x={84} y={34} fontSize={5} fill={C} fontWeight="bold">SS-MLF-001</text>
        <text x={164} y={12} fontSize={4} fill={CD}>SCALE</text>
        <text x={164} y={34} fontSize={5} fill={C}>NOT TO SCALE</text>
      </g>

      {/* Notes */}
      <g transform={`translate(20,${H - 70})`}>
        <text fontSize={4.5} fill={CD} fontWeight="bold">NOTES:</text>
        <text y={8} fontSize={3.8} fill={CD}>1. ALL DIMENSIONS IN MM. 2. FRAME MATERIAL: S355 STRUCTURAL STEEL.</text>
        <text y={15} fontSize={3.8} fill={CD}>3. LOAD APPLICATION PER IEC 62782 §5.2. 4. LVDT DISPLACEMENT ACCURACY ±0.01mm.</text>
      </g>
    </svg>
  );
}
