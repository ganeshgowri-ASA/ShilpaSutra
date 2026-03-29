"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// ThermalCyclingChamber — IEC 61215 MQT 11 Thermal Cycling Chamber
// Professional A3 multi-view GA drawing with parametric dimensions
// ═══════════════════════════════════════════════════════════════════════════════

import React from "react";

export interface ThermalCyclingChamberParams {
  cabinetWidth?: number;   // mm (default 2000)
  cabinetHeight?: number;  // mm (default 2500)
  cabinetDepth?: number;   // mm (default 2000)
  // Legacy aliases
  chamberWidth?: number;
  chamberHeight?: number;
  chamberDepth?: number;
  shelfCount?: number;
  tempMin?: number;
  tempMax?: number;
  rampRate?: number;
}

const DEFAULTS = {
  cabinetWidth: 2000,
  cabinetHeight: 2500,
  cabinetDepth: 2000,
  shelfCount: 3,
  tempMin: -40,
  tempMax: 100,
  rampRate: 3,
};

function resolve(params: ThermalCyclingChamberParams) {
  return {
    W: params.cabinetWidth ?? params.chamberWidth ?? DEFAULTS.cabinetWidth,
    H: params.cabinetHeight ?? params.chamberHeight ?? DEFAULTS.cabinetHeight,
    D: params.cabinetDepth ?? params.chamberDepth ?? DEFAULTS.cabinetDepth,
    shelfCount: params.shelfCount ?? DEFAULTS.shelfCount,
    tempMin: params.tempMin ?? DEFAULTS.tempMin,
    tempMax: params.tempMax ?? DEFAULTS.tempMax,
    rampRate: params.rampRate ?? DEFAULTS.rampRate,
  };
}

// ── Colors ──
const TXT = "#CCCCCC";
const LN = "#E0E0E0";
const DIM = "#88CCFF";
const TITLE = "#58a6ff";
const ACCENT = "#00D4FF";
const SUB = "#8b949e";

// ── Dimension helpers ──
function DimH({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  return (
    <g stroke={SUB} strokeWidth={0.7} fill="none">
      <line x1={x1} y1={y - 15} x2={x1} y2={y + 4} />
      <line x1={x2} y1={y - 15} x2={x2} y2={y + 4} />
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
      <line x1={x - 15} y1={y1} x2={x + 4} y2={y1} />
      <line x1={x - 15} y1={y2} x2={x + 4} y2={y2} />
      <line x1={x} y1={y1 + 4} x2={x} y2={y2 - 4} />
      <polygon points={`${x},${y1} ${x - 2},${y1 + 5} ${x + 2},${y1 + 5}`} fill={SUB} stroke="none" />
      <polygon points={`${x},${y2} ${x - 2},${y2 - 5} ${x + 2},${y2 - 5}`} fill={SUB} stroke="none" />
      <text x={x - 6} y={mid} fontSize={7} textAnchor="middle" fill={DIM} stroke="none" fontFamily="monospace"
        transform={`rotate(-90,${x - 6},${mid})`}>{label}</text>
    </g>
  );
}

// ── FRONT VIEW ──
function FrontView({ ox, oy, W, H, shelfCount }: { ox: number; oy: number; W: number; H: number; shelfCount: number }) {
  // Scale: fit 2000mm into ~350px → scale factor
  const s = 350 / 2000;
  const w = W * s;
  const h = H * s;
  const shelfSp = (h - 40) / (shelfCount + 1);

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={w / 2} y={-12} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">FRONT VIEW</text>

      {/* Outer cabinet */}
      <rect x={0} y={0} width={w} height={h} fill="none" stroke={LN} strokeWidth={1.5} />

      {/* Inner door outline (dashed) */}
      <rect x={10} y={10} width={w - 20} height={h - 20} fill="none" stroke={LN} strokeWidth={0.8} strokeDasharray="8,4" />

      {/* Door hinges (3 circles on right side) */}
      {[0.2, 0.5, 0.8].map((f, i) => (
        <circle key={i} cx={w - 12} cy={10 + (h - 20) * f} r={4} fill="none" stroke={LN} strokeWidth={0.6} />
      ))}

      {/* Inspection window 400x400 with crosshairs */}
      {(() => {
        const winW = Math.min(400 * s, w * 0.6);
        const winH = Math.min(400 * s, h * 0.3);
        const wx = (w - winW) / 2;
        const wy = h * 0.25;
        return (
          <g>
            <rect x={wx} y={wy} width={winW} height={winH} fill="none" stroke={ACCENT} strokeWidth={0.8} />
            <line x1={wx + winW / 2} y1={wy} x2={wx + winW / 2} y2={wy + winH} stroke={ACCENT} strokeWidth={0.3} strokeDasharray="3,3" />
            <line x1={wx} y1={wy + winH / 2} x2={wx + winW} y2={wy + winH / 2} stroke={ACCENT} strokeWidth={0.3} strokeDasharray="3,3" />
            <text x={wx + winW / 2} y={wy - 3} fontSize={5} textAnchor="middle" fill={SUB} fontFamily="monospace">INSPECTION WINDOW</text>
          </g>
        );
      })()}

      {/* Shelves */}
      {Array.from({ length: shelfCount }).map((_, i) => {
        const sy = 20 + shelfSp * (i + 1);
        return (
          <g key={i}>
            <line x1={15} y1={sy} x2={w - 15} y2={sy} stroke={LN} strokeWidth={0.6} />
            <text x={w - 18} y={sy - 3} fontSize={5} fill={SUB} fontFamily="monospace" textAnchor="end">SHELF {i + 1}</text>
          </g>
        );
      })}

      {/* Control panel at bottom-right */}
      {(() => {
        const cpx = w * 0.55, cpy = h * 0.82, cpw = w * 0.38, cph = h * 0.12;
        return (
          <g>
            <rect x={cpx} y={cpy} width={cpw} height={cph} fill="none" stroke={ACCENT} strokeWidth={0.7} />
            <text x={cpx + cpw / 2} y={cpy - 3} fontSize={5} textAnchor="middle" fill={ACCENT} fontFamily="monospace">CONTROL PANEL</text>
            {/* HMI screen */}
            <rect x={cpx + 5} y={cpy + 4} width={cpw * 0.5} height={cph - 8} fill="none" stroke={ACCENT} strokeWidth={0.4} rx={1} />
            <text x={cpx + 5 + cpw * 0.25} y={cpy + cph / 2 + 2} fontSize={4} textAnchor="middle" fill={ACCENT} fontFamily="monospace">HMI</text>
            {/* Emergency stop circle */}
            <circle cx={cpx + cpw * 0.7} cy={cpy + cph / 2} r={cph * 0.3} fill="none" stroke="#ef4444" strokeWidth={0.8} />
            <text x={cpx + cpw * 0.7} y={cpy + cph / 2 + 1.5} fontSize={3.5} textAnchor="middle" fill="#ef4444" fontFamily="monospace">E-STOP</text>
            {/* Status LEDs */}
            {[0, 1, 2].map((j) => (
              <circle key={j} cx={cpx + cpw * 0.88} cy={cpy + 6 + j * 8} r={2}
                fill="none" stroke={["#22c55e", "#f59e0b", "#ef4444"][j]} strokeWidth={0.5} />
            ))}
          </g>
        );
      })()}

      {/* Port holes: 125mm right, 50mm left */}
      <circle cx={w - 8} cy={h * 0.45} r={125 * s / 2} fill="none" stroke={LN} strokeWidth={0.6} />
      <text x={w + 5} y={h * 0.45 + 2} fontSize={4} fill={SUB} fontFamily="monospace">Ø125</text>
      <circle cx={8} cy={h * 0.45} r={50 * s / 2} fill="none" stroke={LN} strokeWidth={0.6} />
      <text x={-12} y={h * 0.45 + 2} fontSize={4} fill={SUB} fontFamily="monospace" textAnchor="end">Ø50</text>

      {/* Ramp trapezoid at base */}
      <polygon points={`${w * 0.1},${h} ${w * 0.05},${h + 15} ${w * 0.95},${h + 15} ${w * 0.9},${h}`}
        fill="none" stroke={LN} strokeWidth={0.8} />
      <text x={w / 2} y={h + 11} fontSize={5} textAnchor="middle" fill={SUB} fontFamily="monospace">RAMP / BASE FRAME</text>

      {/* 4 castor circles */}
      {[0.15, 0.38, 0.62, 0.85].map((f, i) => (
        <circle key={i} cx={w * f} cy={h + 20} r={5} fill="none" stroke={LN} strokeWidth={0.6} />
      ))}

      {/* Dimension lines */}
      <DimH x1={0} x2={w} y={h + 38} label={`${W}`} />
      <DimV y1={0} y2={h} x={-25} label={`${H}`} />
    </g>
  );
}

// ── RIGHT VIEW ──
function RightView({ ox, oy, D, H }: { ox: number; oy: number; D: number; H: number }) {
  const s = 200 / 2000;
  const d = D * s;
  const h = H * s;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={d / 2} y={-12} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">RIGHT VIEW</text>

      {/* Side profile */}
      <rect x={0} y={0} width={d} height={h} fill="none" stroke={LN} strokeWidth={1.2} />

      {/* Port hole */}
      <circle cx={d * 0.4} cy={h * 0.45} r={8} fill="none" stroke={LN} strokeWidth={0.6} />
      <text x={d * 0.4} y={h * 0.45 + 14} fontSize={4} textAnchor="middle" fill={SUB} fontFamily="monospace">PORT</text>

      {/* Evaporator pipe stubs */}
      {[0.25, 0.35].map((f, i) => (
        <g key={i}>
          <circle cx={d + 6} cy={h * f} r={4} fill="none" stroke={LN} strokeWidth={0.5} />
          <line x1={d} y1={h * f} x2={d + 2} y2={h * f} stroke={LN} strokeWidth={0.5} />
        </g>
      ))}
      <text x={d + 14} y={h * 0.3} fontSize={4} fill={SUB} fontFamily="monospace">EVAP.</text>
      <text x={d + 14} y={h * 0.3 + 6} fontSize={4} fill={SUB} fontFamily="monospace">PIPES</text>

      {/* Refrigeration unit at back */}
      <rect x={d - 25} y={h * 0.6} width={25} height={h * 0.3} fill="none" stroke={SUB} strokeWidth={0.5} />
      <text x={d - 12} y={h * 0.75} fontSize={4} textAnchor="middle" fill={SUB} fontFamily="monospace"
        transform={`rotate(-90,${d - 12},${h * 0.75})`}>REFRIG. UNIT</text>

      {/* Dimension */}
      <DimH x1={0} x2={d} y={h + 25} label={`${D}`} />
      <text x={d / 2} y={h + 40} fontSize={6} textAnchor="middle" fill={SUB} fontFamily="monospace">DEPTH: {D}mm</text>
    </g>
  );
}

// ── TOP VIEW ──
function TopView({ ox, oy, W, D }: { ox: number; oy: number; W: number; D: number }) {
  const s = 350 / 2000;
  const w = W * s;
  const d = Math.min(D * s, 120);

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={w / 2} y={-8} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">TOP VIEW</text>

      {/* W x D rectangle */}
      <rect x={0} y={0} width={w} height={d} fill="none" stroke={LN} strokeWidth={1.2} />

      {/* Water inlet/outlet circles */}
      <circle cx={w * 0.2} cy={d * 0.3} r={5} fill="none" stroke="#3b82f6" strokeWidth={0.6} />
      <text x={w * 0.2} y={d * 0.3 + 10} fontSize={4} textAnchor="middle" fill="#3b82f6" fontFamily="monospace">WATER IN</text>
      <circle cx={w * 0.2} cy={d * 0.7} r={5} fill="none" stroke="#3b82f6" strokeWidth={0.6} />
      <text x={w * 0.2} y={d * 0.7 + 10} fontSize={4} textAnchor="middle" fill="#3b82f6" fontFamily="monospace">WATER OUT</text>

      {/* RRU rect connected by lines */}
      <rect x={w + 20} y={d * 0.15} width={50} height={d * 0.7} fill="none" stroke={SUB} strokeWidth={0.6} />
      <text x={w + 45} y={d * 0.5 + 2} fontSize={5} textAnchor="middle" fill={SUB} fontFamily="monospace">RRU</text>
      <line x1={w} y1={d * 0.35} x2={w + 20} y2={d * 0.35} stroke={SUB} strokeWidth={0.5} />
      <line x1={w} y1={d * 0.65} x2={w + 20} y2={d * 0.65} stroke={SUB} strokeWidth={0.5} />

      {/* Boiler tank rect */}
      <rect x={w * 0.6} y={-30} width={w * 0.3} height={22} fill="none" stroke="#ef4444" strokeWidth={0.5} />
      <text x={w * 0.75} y={-16} fontSize={5} textAnchor="middle" fill="#ef4444" fontFamily="monospace">BOILER TANK</text>
      <line x1={w * 0.75} y1={-8} x2={w * 0.75} y2={0} stroke="#ef4444" strokeWidth={0.4} />

      <DimH x1={0} x2={w} y={d + 15} label={`${W}`} />
    </g>
  );
}

// ── ISOMETRIC VIEW ──
function IsometricView({ ox, oy }: { ox: number; oy: number }) {
  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={150} y={-8} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">ISOMETRIC VIEW</text>
      <g transform="skewX(-30) skewY(15)">
        {/* Front face */}
        <rect x={0} y={0} width={120} height={160} fill="none" stroke={LN} strokeWidth={1} />
        {/* Top face */}
        <polygon points="0,0 60,-30 180,-30 120,0" fill="none" stroke={LN} strokeWidth={0.8} />
        {/* Right face */}
        <polygon points="120,0 180,-30 180,130 120,160" fill="none" stroke={LN} strokeWidth={0.8} />
        {/* Door outline on front */}
        <rect x={8} y={8} width={104} height={144} fill="none" stroke={SUB} strokeWidth={0.4} strokeDasharray="4,3" />
        {/* Window on front */}
        <rect x={25} y={30} width={70} height={50} fill="none" stroke={ACCENT} strokeWidth={0.5} />
        {/* Control panel */}
        <rect x={60} y={120} width={50} height={30} fill="none" stroke={ACCENT} strokeWidth={0.4} />
      </g>
    </g>
  );
}

// ── SPEC TABLE ──
function SpecTable({ ox, oy, W, H, D, tempMin, tempMax, rampRate }: {
  ox: number; oy: number; W: number; H: number; D: number;
  tempMin: number; tempMax: number; rampRate: number;
}) {
  const rows = [
    ["Parameter", "Value"],
    ["Internal Capacity", "10,000 L"],
    ["Temperature Range", `${tempMin}°C to +${tempMax}°C`],
    ["Ramp Rate", `${rampRate}°C/min`],
    ["Dimensions (WxHxD)", `${W}×${H}×${D} mm`],
    ["Refrigerant", "R-404A / R-507"],
    ["Compressor", "Semi-hermetic scroll"],
    ["Heating", "Ni-Cr heaters 15kW"],
    ["Control", "PLC + 10\" HMI"],
    ["Power Supply", "3-Ph 415V 50Hz"],
    ["Insulation", "100mm PU foam"],
    ["Weight (approx)", "~2500 kg"],
  ];
  const cw = [120, 140];
  const rh = 14;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={0} y={-6} fontSize={9} fill={TITLE} fontWeight="bold" fontFamily="monospace">SPECIFICATION TABLE</text>
      {rows.map((row, ri) => (
        <g key={ri}>
          {row.map((cell, ci) => {
            const rx = cw.slice(0, ci).reduce((a, b) => a + b, 0);
            return (
              <g key={ci}>
                <rect x={rx} y={ri * rh} width={cw[ci]} height={rh}
                  fill={ri === 0 ? "#21262d" : "none"} stroke={SUB} strokeWidth={0.5} />
                <text x={rx + 4} y={ri * rh + 10} fontSize={6}
                  fill={ri === 0 ? ACCENT : TXT} fontWeight={ri === 0 ? "bold" : "normal"} fontFamily="monospace">{cell}</text>
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}

// ── TITLE BLOCK ──
function TitleBlock({ y: ty, W, H, D }: { y: number; W: number; H: number; D: number }) {
  const bw = 1189;
  const bh = 60;
  return (
    <g transform={`translate(0,${ty})`}>
      <rect x={0} y={0} width={bw} height={bh} fill="#161b22" stroke={SUB} strokeWidth={1} />
      {/* Dividers */}
      <line x1={240} y1={0} x2={240} y2={bh} stroke={SUB} strokeWidth={0.5} />
      <line x1={540} y1={0} x2={540} y2={bh} stroke={SUB} strokeWidth={0.5} />
      <line x1={740} y1={0} x2={740} y2={bh} stroke={SUB} strokeWidth={0.5} />
      <line x1={920} y1={0} x2={920} y2={bh} stroke={SUB} strokeWidth={0.5} />
      <line x1={0} y1={bh / 2} x2={bw} y2={bh / 2} stroke={SUB} strokeWidth={0.3} />

      {/* Company */}
      <text x={10} y={18} fontSize={10} fill={ACCENT} fontWeight="bold" fontFamily="monospace">ShilpaSutra AI</text>
      <text x={10} y={48} fontSize={7} fill={TXT} fontFamily="monospace">www.shilpasutra.com</text>

      {/* Title */}
      <text x={250} y={18} fontSize={8} fill={SUB} fontFamily="monospace">TITLE</text>
      <text x={250} y={45} fontSize={10} fill={TXT} fontWeight="bold" fontFamily="monospace">THERMAL CYCLING CHAMBER — IEC 61215 MQT 11</text>

      {/* Scale */}
      <text x={550} y={18} fontSize={8} fill={SUB} fontFamily="monospace">SCALE</text>
      <text x={550} y={45} fontSize={10} fill={TXT} fontFamily="monospace">1:50</text>

      {/* Material */}
      <text x={750} y={18} fontSize={8} fill={SUB} fontFamily="monospace">MATERIAL</text>
      <text x={750} y={45} fontSize={9} fill={TXT} fontFamily="monospace">Outer: GI / Inner: SS304</text>

      {/* Date & Part No */}
      <text x={930} y={18} fontSize={8} fill={SUB} fontFamily="monospace">DATE: 2026-03-29</text>
      <text x={930} y={45} fontSize={8} fill={TXT} fontFamily="monospace">DWG NO: SS-TCC-001 REV A</text>
    </g>
  );
}

// ── GENERAL NOTES ──
function GeneralNotes({ ox, oy }: { ox: number; oy: number }) {
  const notes = [
    "1. ALL DIMENSIONS IN MILLIMETERS UNLESS OTHERWISE STATED.",
    "2. MINIMUM 500mm CLEARANCE ON ALL SIDES FOR AIRFLOW.",
    "3. OPERATING WEIGHT ~2500 kg — VERIFY FLOOR LOADING.",
    "4. ELECTRICAL: 3-PHASE 415V 50Hz, 80A MCB REQUIRED.",
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

// ── MAIN COMPONENT ──
export default function ThermalCyclingChamber({ params = {} }: { params?: ThermalCyclingChamberParams }) {
  const p = resolve(params);

  return (
    <svg viewBox="0 0 1189 841" className="w-full h-full" style={{ background: "transparent" }} fontFamily="monospace">
      {/* Sheet border */}
      <rect x={5} y={5} width={1179} height={831} fill="none" stroke="#30363d" strokeWidth={1.5} />
      <rect x={12} y={12} width={1165} height={817} fill="none" stroke="#21262d" strokeWidth={0.7} />

      {/* TOP VIEW at (50, 10) — 350px wide, 120px tall */}
      <TopView ox={50} oy={50} W={p.W} D={p.D} />

      {/* FRONT VIEW at (50, 150) — 350px wide */}
      <FrontView ox={50} oy={190} W={p.W} H={p.H} shelfCount={p.shelfCount} />

      {/* RIGHT VIEW at (450, 150) — 200px wide */}
      <RightView ox={460} oy={190} D={p.D} H={p.H} />

      {/* ISOMETRIC VIEW at (700, 10) — 300x250px */}
      <IsometricView ox={700} oy={40} />

      {/* SPEC TABLE at (700, 400) */}
      <SpecTable ox={700} oy={340} W={p.W} H={p.H} D={p.D}
        tempMin={p.tempMin} tempMax={p.tempMax} rampRate={p.rampRate} />

      {/* GENERAL NOTES at (700, 620) */}
      <GeneralNotes ox={700} oy={600} />

      {/* TITLE BLOCK at (0, 770) full width */}
      <TitleBlock y={770} W={p.W} H={p.H} D={p.D} />
    </svg>
  );
}
