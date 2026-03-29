"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// IgnitabilityChamber — King Design MST23/24 reference
// Fire/ignitability test chamber multi-view GA drawing
// ═══════════════════════════════════════════════════════════════════════════════

import React from "react";

export interface IgnitabilityChamberParams {
  chimneyWidth?: number;   // mm
  chimneyHeight?: number;  // mm
  chimneyDepth?: number;   // mm
  windowDiameter?: number; // mm
  burnerAngle?: number;    // degrees max rotation
}

const DEFAULTS: Required<IgnitabilityChamberParams> = {
  chimneyWidth: 900,
  chimneyHeight: 2400,
  chimneyDepth: 600,
  windowDiameter: 600,
  burnerAngle: 90,
};

const C = "#c9d1d9";
const CA = "#00D4FF";
const CD = "#8b949e";
const CT = "#58a6ff";
const BG = "#0d1117";

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

function DimV({ y1, y2, x, label }: { y1: number; y2: number; x: number; label: string }) {
  const mid = (y1 + y2) / 2;
  return (
    <g stroke={CD} strokeWidth={0.5} fill="none">
      <line x1={x - 12} y1={y1} x2={x + 3} y2={y1} />
      <line x1={x - 12} y1={y2} x2={x + 3} y2={y2} />
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
function FrontView({ ox, oy, p }: { ox: number; oy: number; p: Required<IgnitabilityChamberParams> }) {
  const s = 0.07;
  const cw = p.chimneyWidth * s;
  const ch = p.chimneyHeight * s;
  const wd = p.windowDiameter * s / 2;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={cw / 2} y={-10} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">FRONT VIEW</text>

      {/* Exhaust hood at top */}
      <polygon points={`${-10},${0} ${cw + 10},${0} ${cw - 5},${-18} ${5},${-18}`}
        fill="none" stroke={C} strokeWidth={0.8} />
      <text x={cw / 2} y={-8} fontSize={3.5} textAnchor="middle" fill={CD} fontFamily="monospace">EXHAUST HOOD</text>

      {/* Chimney body */}
      <rect x={0} y={0} width={cw} height={ch} fill="none" stroke={C} strokeWidth={1.2} />

      {/* Draft screen (mesh pattern) */}
      <rect x={4} y={8} width={cw - 8} height={ch * 0.25} fill="none" stroke={CD} strokeWidth={0.5} />
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={`dm-${i}`} x1={4 + (cw - 8) * (i / 12)} y1={8} x2={4 + (cw - 8) * (i / 12)} y2={8 + ch * 0.25}
          stroke={CD} strokeWidth={0.15} />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={`dh-${i}`} x1={4} y1={8 + ch * 0.25 * (i / 6)} x2={cw - 4} y2={8 + ch * 0.25 * (i / 6)}
          stroke={CD} strokeWidth={0.15} />
      ))}
      <text x={cw / 2} y={8 + ch * 0.125} fontSize={3.5} textAnchor="middle" fill={CD} fontFamily="monospace">DRAFT SCREEN</text>

      {/* Specimen holder platform */}
      <rect x={8} y={ch * 0.45} width={cw - 16} height={3} fill="none" stroke={CA} strokeWidth={0.8} />
      <text x={cw / 2} y={ch * 0.45 - 3} fontSize={3.5} textAnchor="middle" fill={CA} fontFamily="monospace">SPECIMEN HOLDER</text>

      {/* Observation window */}
      <circle cx={cw / 2} cy={ch * 0.6} r={wd} fill="none" stroke={C} strokeWidth={0.8} />
      <circle cx={cw / 2} cy={ch * 0.6} r={wd - 2} fill="none" stroke={CD} strokeWidth={0.3} />
      <text x={cw / 2} y={ch * 0.6 + wd + 7} fontSize={3.5} textAnchor="middle" fill={CD} fontFamily="monospace">Ø{p.windowDiameter} WINDOW</text>

      {/* Burner assembly below specimen */}
      <g transform={`translate(${cw / 2},${ch * 0.75})`}>
        {/* Burner tip */}
        <rect x={-3} y={0} width={6} height={12} fill="none" stroke="#ef4444" strokeWidth={0.6} />
        {/* Flame */}
        <path d="M0,-8 Q-4,-4 0,0 Q4,-4 0,-8" fill="none" stroke="#f59e0b" strokeWidth={0.5} />
        {/* Gas supply line */}
        <line x1={3} y1={6} x2={25} y2={6} stroke={CD} strokeWidth={0.5} />
        {/* Ignition electrode */}
        <line x1={-3} y1={2} x2={-10} y2={-4} stroke="#a855f7" strokeWidth={0.4} />
        <circle cx={-10} cy={-4} r={1} fill="#a855f7" />
      </g>
      <text x={cw / 2 + 28} y={ch * 0.75 + 8} fontSize={3} fill={CD} fontFamily="monospace">GAS SUPPLY</text>

      {/* Human figure for scale (1.7m) */}
      <g transform={`translate(${cw + 25},${ch - 1.7 * 1000 * s})`}>
        <circle cx={0} cy={5} r={4} fill="none" stroke="#6b7280" strokeWidth={0.4} />
        <line x1={0} y1={9} x2={0} y2={50} stroke="#6b7280" strokeWidth={0.4} />
        <line x1={0} y1={20} x2={-10} y2={35} stroke="#6b7280" strokeWidth={0.4} />
        <line x1={0} y1={20} x2={10} y2={35} stroke="#6b7280" strokeWidth={0.4} />
        <line x1={0} y1={50} x2={-8} y2={70} stroke="#6b7280" strokeWidth={0.4} />
        <line x1={0} y1={50} x2={8} y2={70} stroke="#6b7280" strokeWidth={0.4} />
        <text x={0} y={80} fontSize={3} textAnchor="middle" fill="#6b7280" fontFamily="monospace">1.7m REF</text>
      </g>

      {/* Dimensions */}
      <DimH x1={0} x2={cw} y={ch + 18} label={`${p.chimneyWidth}`} />
      <DimV y1={0} y2={ch} x={-20} label={`${p.chimneyHeight}`} />

      {/* Balloon callouts */}
      <Balloon x={cw / 2} y={-10} num={1} tx={-20} ty={-15} />
      <Balloon x={cw / 2} y={8 + ch * 0.125} num={2} tx={-20} ty={30} />
      <Balloon x={cw / 2} y={ch * 0.45} num={3} tx={-20} ty={ch * 0.45} />
      <Balloon x={cw / 2} y={ch * 0.6} num={4} tx={-20} ty={ch * 0.6 + 20} />
    </g>
  );
}

// ── Side View ──
function SideView({ ox, oy, p }: { ox: number; oy: number; p: Required<IgnitabilityChamberParams> }) {
  const s = 0.07;
  const cd = p.chimneyDepth * s;
  const ch = p.chimneyHeight * s;
  const bAngle = p.burnerAngle;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={cd / 2} y={-10} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">SIDE VIEW</text>

      <rect x={0} y={0} width={cd} height={ch} fill="none" stroke={C} strokeWidth={0.8} />

      {/* Burner arm with rotation arc */}
      <g transform={`translate(${cd / 2},${ch * 0.75})`}>
        <line x1={0} y1={0} x2={0} y2={20} stroke="#ef4444" strokeWidth={0.6} />
        {/* Arc showing rotation */}
        <path d={`M0,20 A20,20 0 0,1 ${20 * Math.sin(bAngle * Math.PI / 180)},${20 - 20 * Math.cos(bAngle * Math.PI / 180) + 20}`}
          fill="none" stroke={CD} strokeWidth={0.4} strokeDasharray="2,1" />
        <text x={15} y={30} fontSize={3} fill={CD} fontFamily="monospace">0–{bAngle}°</text>
      </g>

      {/* Gas supply manifold */}
      <rect x={cd + 5} y={ch * 0.7} width={20} height={10} fill="none" stroke={CD} strokeWidth={0.5} />
      <text x={cd + 15} y={ch * 0.7 - 3} fontSize={3} textAnchor="middle" fill={CD} fontFamily="monospace">PRESSURE REG.</text>

      {/* Flow meter */}
      <rect x={cd + 5} y={ch * 0.7 + 14} width={20} height={8} fill="none" stroke={CD} strokeWidth={0.5} />
      <text x={cd + 15} y={ch * 0.7 + 20} fontSize={3} textAnchor="middle" fill={CD} fontFamily="monospace">FLOW METER</text>

      {/* Thermocouple positions */}
      {[0.2, 0.4, 0.65].map((f, i) => (
        <g key={i}>
          <line x1={cd} y1={ch * f} x2={cd + 4} y2={ch * f} stroke="#ef4444" strokeWidth={0.3} />
          <circle cx={cd + 4} cy={ch * f} r={1} fill="#ef4444" />
          <text x={cd + 7} y={ch * f + 1.5} fontSize={2.5} fill="#ef4444" fontFamily="monospace">TC{i + 1}</text>
        </g>
      ))}

      <DimH x1={0} x2={cd} y={ch + 18} label={`${p.chimneyDepth}`} />
    </g>
  );
}

// ── Detail View - Burner Assembly (Scale 5:1) ──
function BurnerDetail({ ox, oy }: { ox: number; oy: number }) {
  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={40} y={-8} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">DETAIL B (5:1) — BURNER ASSY</text>

      {/* Burner tube cross-section */}
      <rect x={25} y={0} width={30} height={50} fill="none" stroke={C} strokeWidth={0.8} rx={1} />
      <text x={40} y={28} fontSize={3.5} textAnchor="middle" fill={CD} fontFamily="monospace">BURNER TUBE</text>

      {/* Flame guard */}
      <path d="M20,0 L25,0 L25,15 L20,10 Z" fill="none" stroke={C} strokeWidth={0.6} />
      <path d="M55,0 L60,0 L60,10 L55,15 Z" fill="none" stroke={C} strokeWidth={0.6} />

      {/* Pilot light */}
      <circle cx={20} cy={5} r={2} fill="none" stroke="#f59e0b" strokeWidth={0.5} />
      <circle cx={20} cy={5} r={0.8} fill="#f59e0b" />

      {/* Gas mixing chamber */}
      <rect x={28} y={52} width={24} height={18} fill="none" stroke={C} strokeWidth={0.6} rx={2} />
      <text x={40} y={64} fontSize={3} textAnchor="middle" fill={CD} fontFamily="monospace">GAS MIX</text>

      {/* Balloon callouts */}
      <Balloon x={40} y={25} num={1} tx={75} ty={10} />
      <Balloon x={22} y={5} num={2} tx={75} ty={25} />
      <Balloon x={20} y={5} num={3} tx={75} ty={40} />
      <Balloon x={40} y={62} num={4} tx={75} ty={55} />
      <Balloon x={40} y={-2} num={5} tx={75} ty={70} />
    </g>
  );
}

// ── BOM Table ──
function BOMTable({ ox, oy }: { ox: number; oy: number }) {
  const headers = ["No", "Part", "Material", "Qty"];
  const cw = [14, 60, 50, 16];
  const rh = 9;
  const data = [
    ["1", "Chimney Body", "SS304", "1"],
    ["2", "Draft Screen", "SS Wire 25×25", "1"],
    ["3", "Burner Assy", "Brass/SS", "1"],
    ["4", "Obs. Window", "Borosilicate", "1"],
    ["5", "Exhaust Hood", "SS304", "1"],
    ["6", "Specimen Holder", "SS316", "1"],
  ];

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={0} y={-4} fontSize={5} fill={CT} fontWeight="bold" fontFamily="monospace">BILL OF MATERIALS</text>
      {/* Header */}
      {headers.map((h, i) => {
        const rx = cw.slice(0, i).reduce((a, b) => a + b, 0);
        return (
          <g key={i}>
            <rect x={rx} y={0} width={cw[i]} height={rh} fill="#21262d" stroke={CD} strokeWidth={0.4} />
            <text x={rx + cw[i] / 2} y={6.5} fontSize={3.5} textAnchor="middle" fill={CA} fontWeight="bold" fontFamily="monospace">{h}</text>
          </g>
        );
      })}
      {/* Data */}
      {data.map((row, ri) => (
        <g key={ri}>
          {row.map((cell, ci) => {
            const rx = cw.slice(0, ci).reduce((a, b) => a + b, 0);
            return (
              <g key={ci}>
                <rect x={rx} y={(ri + 1) * rh} width={cw[ci]} height={rh} fill="none" stroke={CD} strokeWidth={0.3} />
                <text x={rx + (ci === 0 || ci === 3 ? cw[ci] / 2 : 3)} y={(ri + 1) * rh + 6.5} fontSize={3.5}
                  textAnchor={ci === 0 || ci === 3 ? "middle" : "start"} fill={C} fontFamily="monospace">{cell}</text>
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}

export default function IgnitabilityChamber({ params = {} }: { params?: IgnitabilityChamberParams }) {
  const p = { ...DEFAULTS, ...params };
  const W = 841, H = 594;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ background: BG }} fontFamily="monospace">
      <rect x={8} y={8} width={W - 16} height={H - 16} fill="none" stroke="#30363d" strokeWidth={1.2} />
      <rect x={14} y={14} width={W - 28} height={H - 28} fill="none" stroke="#21262d" strokeWidth={0.6} />

      <text x={W / 2} y={30} fontSize={10} textAnchor="middle" fill={CA} fontWeight="bold">
        IGNITABILITY TEST CHAMBER — IEC 61730 / UL 790
      </text>

      <FrontView ox={50} oy={55} p={p} />
      <SideView ox={260} oy={55} p={p} />
      <BurnerDetail ox={420} oy={55} />
      <BOMTable ox={420} oy={220} />

      {/* Title block */}
      <g transform={`translate(${W - 260},${H - 55})`}>
        <rect x={0} y={0} width={240} height={40} fill="#161b22" stroke="#30363d" strokeWidth={0.8} />
        <line x1={80} y1={0} x2={80} y2={40} stroke="#21262d" strokeWidth={0.4} />
        <line x1={160} y1={0} x2={160} y2={40} stroke="#21262d" strokeWidth={0.4} />
        <line x1={0} y1={20} x2={240} y2={20} stroke="#21262d" strokeWidth={0.4} />
        <text x={4} y={12} fontSize={4} fill={CD}>DRAWN BY</text>
        <text x={4} y={34} fontSize={5} fill={C} fontWeight="bold">ShilpaSutra AI</text>
        <text x={84} y={12} fontSize={4} fill={CD}>PART NO.</text>
        <text x={84} y={34} fontSize={5} fill={C} fontWeight="bold">SS-IGN-001</text>
        <text x={164} y={12} fontSize={4} fill={CD}>SCALE</text>
        <text x={164} y={34} fontSize={5} fill={C}>NOT TO SCALE</text>
      </g>

      <g transform={`translate(20,${H - 70})`}>
        <text fontSize={4.5} fill={CD} fontWeight="bold">NOTES:</text>
        <text y={8} fontSize={3.8} fill={CD}>1. ALL DIMENSIONS IN MM. 2. CHIMNEY MATERIAL: SS304 STAINLESS STEEL.</text>
        <text y={15} fontSize={3.8} fill={CD}>3. OBSERVATION WINDOW: BOROSILICATE GLASS T=10mm. 4. GAS: METHANE/PROPANE PER STANDARD.</text>
      </g>
    </svg>
  );
}
