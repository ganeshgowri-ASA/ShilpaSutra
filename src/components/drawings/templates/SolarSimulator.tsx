"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// SolarSimulator — Class AAA Solar Simulator (WACOM/Eternal Sun reference)
// IEC 60904-9 compliant multi-view GA drawing
// ═══════════════════════════════════════════════════════════════════════════════

import React from "react";

export interface SolarSimulatorParams {
  testAreaW?: number;     // mm
  testAreaH?: number;     // mm
  irradiance?: number;    // W/m²
  lampRows?: number;
  lampCols?: number;
  housingWidth?: number;  // mm
  housingHeight?: number; // mm
  ductDiameter?: number;  // mm
}

const DEFAULTS: Required<SolarSimulatorParams> = {
  testAreaW: 2000,
  testAreaH: 2000,
  irradiance: 1000,
  lampRows: 4,
  lampCols: 4,
  housingWidth: 2400,
  housingHeight: 1200,
  ductDiameter: 200,
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

// ── Front View ──
function FrontView({ ox, oy, p }: { ox: number; oy: number; p: Required<SolarSimulatorParams> }) {
  const s = 0.065;
  const hw = p.housingWidth * s;
  const hh = p.housingHeight * s;
  const tw = p.testAreaW * s;
  const th = p.testAreaH * s;
  const lampSpX = hw / (p.lampCols + 1);
  const lampSpY = hh / (p.lampRows + 1);
  const totalH = hh + 100; // housing + gap + test plane

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={hw / 2} y={-8} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">FRONT VIEW</text>

      {/* Light source housing */}
      <rect x={0} y={0} width={hw} height={hh} fill="none" stroke={C} strokeWidth={1.2} rx={2} />
      <text x={hw / 2} y={hh + 7} fontSize={3.5} textAnchor="middle" fill={CD} fontFamily="monospace">LAMP HOUSING</text>

      {/* Lamp array (circles in grid) */}
      {Array.from({ length: p.lampRows }).map((_, r) =>
        Array.from({ length: p.lampCols }).map((_, c) => {
          const lx = lampSpX * (c + 1);
          const ly = lampSpY * (r + 1);
          return (
            <g key={`lamp-${r}-${c}`}>
              <circle cx={lx} cy={ly} r={6} fill="none" stroke={CA} strokeWidth={0.5} />
              <circle cx={lx} cy={ly} r={2} fill={CA} opacity={0.3} />
            </g>
          );
        })
      )}

      {/* Optical filter assembly (layered rectangles below lamps) */}
      <rect x={10} y={hh + 12} width={hw - 20} height={4} fill="none" stroke="#a855f7" strokeWidth={0.6} />
      <text x={hw / 2} y={hh + 15} fontSize={3} textAnchor="middle" fill="#a855f7" fontFamily="monospace">AM1.5 FILTER</text>
      <rect x={10} y={hh + 18} width={hw - 20} height={3} fill="none" stroke="#a855f7" strokeWidth={0.4} />
      <text x={hw / 2} y={hh + 20.5} fontSize={2.5} textAnchor="middle" fill="#a855f7" fontFamily="monospace">DIFFUSER</text>

      {/* Collimating optics - angled trapezoids */}
      <polygon points={`${hw * 0.15},${hh + 24} ${hw * 0.05},${hh + 38} ${hw * 0.95},${hh + 38} ${hw * 0.85},${hh + 24}`}
        fill="none" stroke={C} strokeWidth={0.5} strokeDasharray="2,1" />

      {/* Light beam cone (dotted lines) */}
      <line x1={hw * 0.1} y1={hh + 38} x2={(hw - tw) / 2} y2={totalH - 8} stroke="#fbbf24" strokeWidth={0.3} strokeDasharray="3,2" />
      <line x1={hw * 0.9} y1={hh + 38} x2={(hw + tw) / 2} y2={totalH - 8} stroke="#fbbf24" strokeWidth={0.3} strokeDasharray="3,2" />

      {/* Test plane */}
      <line x1={(hw - tw) / 2} y1={totalH} x2={(hw + tw) / 2} y2={totalH} stroke={CA} strokeWidth={1} />
      <text x={hw / 2} y={totalH + 9} fontSize={4} textAnchor="middle" fill={CA} fontFamily="monospace">TEST PLANE</text>

      {/* Module positioning table */}
      <rect x={(hw - tw) / 2 - 5} y={totalH + 2} width={tw + 10} height={6} fill="none" stroke={C} strokeWidth={0.7} />
      {/* Alignment marks */}
      {[0.25, 0.5, 0.75].map((f, i) => (
        <g key={i}>
          <line x1={(hw - tw) / 2 + tw * f - 2} y1={totalH + 5} x2={(hw - tw) / 2 + tw * f + 2} y2={totalH + 5} stroke={CA} strokeWidth={0.3} />
          <line x1={(hw - tw) / 2 + tw * f} y1={totalH + 3} x2={(hw - tw) / 2 + tw * f} y2={totalH + 7} stroke={CA} strokeWidth={0.3} />
        </g>
      ))}

      {/* Uniformity measurement points */}
      {[0.2, 0.4, 0.6, 0.8].map((fx) =>
        [0.0].map((fy) => (
          <g key={`u-${fx}-${fy}`}>
            <line x1={(hw - tw) / 2 + tw * fx - 1.5} y1={totalH - 1} x2={(hw - tw) / 2 + tw * fx + 1.5} y2={totalH - 1} stroke="#22c55e" strokeWidth={0.3} />
            <line x1={(hw - tw) / 2 + tw * fx} y1={totalH - 2.5} x2={(hw - tw) / 2 + tw * fx} y2={totalH + 0.5} stroke="#22c55e" strokeWidth={0.3} />
          </g>
        ))
      )}

      {/* Dimensions */}
      <DimH x1={0} x2={hw} y={totalH + 22} label={`${p.housingWidth}`} />
      <DimV y1={0} y2={hh} x={-18} label={`${p.housingHeight}`} />
    </g>
  );
}

// ── Side View (System Layout) ──
function SystemLayout({ ox, oy, p }: { ox: number; oy: number; p: Required<SolarSimulatorParams> }) {
  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={80} y={-8} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">SIDE VIEW — SYSTEM LAYOUT</text>

      {/* Lamp housing with cooling duct */}
      <rect x={20} y={0} width={80} height={50} fill="none" stroke={C} strokeWidth={1} rx={2} />
      <text x={60} y={28} fontSize={4} textAnchor="middle" fill={CD} fontFamily="monospace">LAMP HOUSING</text>

      {/* Cooling duct */}
      <rect x={105} y={10} width={40} height={14} fill="none" stroke={C} strokeWidth={0.6} rx={2} />
      {/* Airflow arrows */}
      {[112, 125, 138].map((ax, i) => (
        <g key={i}>
          <line x1={ax} y1={17} x2={ax + 6} y2={17} stroke="#22c55e" strokeWidth={0.4} />
          <polygon points={`${ax + 6},${17} ${ax + 4},${15.5} ${ax + 4},${18.5}`} fill="#22c55e" />
        </g>
      ))}
      <text x={125} y={8} fontSize={3} textAnchor="middle" fill={CD} fontFamily="monospace">Ø{p.ductDiameter}mm DUCT</text>

      {/* Chilled water connections */}
      <line x1={100} y1={35} x2={130} y2={35} stroke="#3b82f6" strokeWidth={0.6} />
      <line x1={100} y1={42} x2={130} y2={42} stroke="#3b82f6" strokeWidth={0.6} />
      {/* Valve symbols */}
      <polygon points="130,33 137,35 130,37" fill="none" stroke="#3b82f6" strokeWidth={0.4} />
      <polygon points="130,40 137,42 130,44" fill="none" stroke="#3b82f6" strokeWidth={0.4} />
      <text x={140} y={37} fontSize={3} fill="#3b82f6" fontFamily="monospace">CW SUPPLY</text>
      <text x={140} y={44} fontSize={3} fill="#3b82f6" fontFamily="monospace">CW RETURN</text>

      {/* Power supply unit */}
      <rect x={20} y={70} width={50} height={35} fill="none" stroke={C} strokeWidth={0.8} rx={2} />
      <text x={45} y={90} fontSize={4} textAnchor="middle" fill={CD} fontFamily="monospace">PSU</text>
      {/* Cable routing */}
      <path d="M45,70 L45,55 L45,50" fill="none" stroke="#f59e0b" strokeWidth={0.5} strokeDasharray="2,1" />

      {/* Control rack */}
      <rect x={90} y={60} width={30} height={50} fill="none" stroke={C} strokeWidth={0.8} rx={1} />
      <text x={105} y={88} fontSize={3.5} textAnchor="middle" fill={CD} fontFamily="monospace">CONTROL</text>
      <text x={105} y={93} fontSize={3.5} textAnchor="middle" fill={CD} fontFamily="monospace">RACK</text>
      {/* Module indicators */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={95} y={65 + i * 7} width={20} height={4} fill="none" stroke={CD} strokeWidth={0.3} rx={0.5} />
      ))}

      {/* Duct diameter callout */}
      <text x={125} y={28} fontSize={3} fill={CD} fontFamily="monospace">Ø{p.ductDiameter}</text>
    </g>
  );
}

// ── Specification Table ──
function SpecTable({ ox, oy, p }: { ox: number; oy: number; p: Required<SolarSimulatorParams> }) {
  const rows = [
    ["Parameter", "Value"],
    ["Classification", "AAA (IEC 60904-9)"],
    ["Illuminated Area", `${p.testAreaW}×${p.testAreaH} mm`],
    ["Irradiance", `${p.irradiance} W/m²`],
    ["Spectrum", "AM1.5G"],
    ["Lamp Array", `${p.lampRows}×${p.lampCols} Xenon/LED`],
    ["Spectral Match", "0.75–1.25 (Class A)"],
    ["Non-Uniformity", "≤±2% (Class A)"],
    ["Temporal Instab.", "≤±2% (Class A)"],
  ];
  const cw = [65, 85];
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

export default function SolarSimulator({ params = {} }: { params?: SolarSimulatorParams }) {
  const p = { ...DEFAULTS, ...params };
  const W = 841, H = 594;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ background: BG }} fontFamily="monospace">
      <rect x={8} y={8} width={W - 16} height={H - 16} fill="none" stroke="#30363d" strokeWidth={1.2} />
      <rect x={14} y={14} width={W - 28} height={H - 28} fill="none" stroke="#21262d" strokeWidth={0.6} />

      <text x={W / 2} y={30} fontSize={10} textAnchor="middle" fill={CA} fontWeight="bold">
        SOLAR SIMULATOR — CLASS AAA — IEC 60904-9
      </text>

      <FrontView ox={40} oy={50} p={p} />
      <SystemLayout ox={440} oy={50} p={p} />
      <SpecTable ox={440} oy={300} p={p} />

      {/* Title block */}
      <g transform={`translate(${W - 260},${H - 55})`}>
        <rect x={0} y={0} width={240} height={40} fill="#161b22" stroke="#30363d" strokeWidth={0.8} />
        <line x1={80} y1={0} x2={80} y2={40} stroke="#21262d" strokeWidth={0.4} />
        <line x1={160} y1={0} x2={160} y2={40} stroke="#21262d" strokeWidth={0.4} />
        <line x1={0} y1={20} x2={240} y2={20} stroke="#21262d" strokeWidth={0.4} />
        <text x={4} y={12} fontSize={4} fill={CD}>DRAWN BY</text>
        <text x={4} y={34} fontSize={5} fill={C} fontWeight="bold">ShilpaSutra AI</text>
        <text x={84} y={12} fontSize={4} fill={CD}>PART NO.</text>
        <text x={84} y={34} fontSize={5} fill={C} fontWeight="bold">SS-SIM-001</text>
        <text x={164} y={12} fontSize={4} fill={CD}>SCALE</text>
        <text x={164} y={34} fontSize={5} fill={C}>NOT TO SCALE</text>
      </g>

      <g transform={`translate(20,${H - 70})`}>
        <text fontSize={4.5} fill={CD} fontWeight="bold">NOTES:</text>
        <text y={8} fontSize={3.8} fill={CD}>1. ALL DIMENSIONS IN MM. 2. CLASSIFICATION PER IEC 60904-9:2020.</text>
        <text y={15} fontSize={3.8} fill={CD}>3. COOLING SYSTEM: FORCED AIR + CHILLED WATER. 4. LAMP LIFE: &gt;2000 hrs.</text>
      </g>
    </svg>
  );
}
