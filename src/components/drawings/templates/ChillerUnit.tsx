"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// ChillerUnit — King Design AUS-S80FN reference
// Industrial chiller unit multi-view GA drawing
// ═══════════════════════════════════════════════════════════════════════════════

import React from "react";

export interface ChillerUnitParams {
  unitWidth?: number;     // mm
  unitHeight?: number;    // mm
  unitDepth?: number;     // mm
  coolingCapacity?: number; // kW
  fanCount?: number;
  fanDiameter?: number;   // mm
  pipeDiameter?: number;  // mm
  flowRate?: number;       // L/min
  voltage?: string;
}

const DEFAULTS: Required<ChillerUnitParams> = {
  unitWidth: 2200,
  unitHeight: 1800,
  unitDepth: 900,
  coolingCapacity: 80,
  fanCount: 6,
  fanDiameter: 450,
  pipeDiameter: 65,
  flowRate: 200,
  voltage: "3-Ph 415V 50Hz",
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
function FrontView({ ox, oy, p }: { ox: number; oy: number; p: Required<ChillerUnitParams> }) {
  const s = 0.06;
  const uw = p.unitWidth * s;
  const uh = p.unitHeight * s;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={uw / 2} y={-8} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">FRONT VIEW</text>

      {/* Unit body */}
      <rect x={0} y={0} width={uw} height={uh} fill="none" stroke={C} strokeWidth={1.2} rx={2} />

      {/* Control panel */}
      <rect x={uw * 0.3} y={uh * 0.15} width={uw * 0.4} height={uh * 0.25} fill="none" stroke={CA} strokeWidth={0.7} rx={1} />
      <text x={uw / 2} y={uh * 0.2} fontSize={3.5} textAnchor="middle" fill={CA} fontFamily="monospace">CONTROL PANEL</text>

      {/* Digital display */}
      <rect x={uw * 0.38} y={uh * 0.22} width={uw * 0.24} height={uh * 0.06} fill="#161b22" stroke={CA} strokeWidth={0.4} rx={0.5} />
      <text x={uw / 2} y={uh * 0.26} fontSize={4} textAnchor="middle" fill="#22c55e" fontFamily="monospace">25.0°C</text>

      {/* Buttons */}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={uw * 0.38 + i * uw * 0.065} y={uh * 0.31} width={uw * 0.04} height={uw * 0.03}
          fill="none" stroke={CD} strokeWidth={0.3} rx={0.5} />
      ))}

      {/* Status LEDs */}
      {[
        { cx: uw * 0.35, color: "#22c55e", label: "RUN" },
        { cx: uw * 0.42, color: "#f59e0b", label: "ALARM" },
        { cx: uw * 0.49, color: "#ef4444", label: "FAULT" },
      ].map((led, i) => (
        <g key={i}>
          <circle cx={led.cx} cy={uh * 0.36} r={1.5} fill={led.color} opacity={0.6} />
          <text x={led.cx} y={uh * 0.36 + 5} fontSize={2.5} textAnchor="middle" fill={CD} fontFamily="monospace">{led.label}</text>
        </g>
      ))}

      {/* Inlet/outlet pipe connections */}
      <circle cx={uw * 0.15} cy={uh * 0.55} r={p.pipeDiameter * s / 2 + 2} fill="none" stroke="#3b82f6" strokeWidth={0.7} />
      <text x={uw * 0.15} y={uh * 0.55 + p.pipeDiameter * s / 2 + 6} fontSize={3} textAnchor="middle" fill="#3b82f6" fontFamily="monospace">
        INLET Ø{p.pipeDiameter}
      </text>
      <circle cx={uw * 0.85} cy={uh * 0.55} r={p.pipeDiameter * s / 2 + 2} fill="none" stroke="#3b82f6" strokeWidth={0.7} />
      <text x={uw * 0.85} y={uh * 0.55 + p.pipeDiameter * s / 2 + 6} fontSize={3} textAnchor="middle" fill="#3b82f6" fontFamily="monospace">
        OUTLET Ø{p.pipeDiameter}
      </text>

      {/* Drain valve */}
      <g transform={`translate(${uw * 0.5},${uh - 5})`}>
        <circle cx={0} cy={0} r={2.5} fill="none" stroke={CD} strokeWidth={0.5} />
        <line x1={-1.5} y1={-1.5} x2={1.5} y2={1.5} stroke={CD} strokeWidth={0.4} />
        <text x={0} y={7} fontSize={3} textAnchor="middle" fill={CD} fontFamily="monospace">DRAIN</text>
      </g>

      {/* Model label plate */}
      <rect x={uw * 0.6} y={uh * 0.7} width={uw * 0.3} height={uh * 0.08} fill="#161b22" stroke={CD} strokeWidth={0.4} />
      <text x={uw * 0.75} y={uh * 0.75} fontSize={3.5} textAnchor="middle" fill={C} fontFamily="monospace">AUS-S{p.coolingCapacity}FN</text>

      {/* Dimensions */}
      <DimH x1={0} x2={uw} y={uh + 18} label={`${p.unitWidth}`} />
      <DimV y1={0} y2={uh} x={-18} label={`${p.unitHeight}`} />
    </g>
  );
}

// ── Top View ──
function TopView({ ox, oy, p }: { ox: number; oy: number; p: Required<ChillerUnitParams> }) {
  const s = 0.06;
  const uw = p.unitWidth * s;
  const ud = p.unitDepth * s;
  const fanR = p.fanDiameter * s / 2;
  const cols = Math.min(p.fanCount, 3);
  const rows = Math.ceil(p.fanCount / cols);

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={uw / 2} y={-8} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">TOP VIEW</text>

      <rect x={0} y={0} width={uw} height={ud} fill="none" stroke={C} strokeWidth={1} />

      {/* Condenser fans */}
      {Array.from({ length: p.fanCount }).map((_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const cx = uw / (cols + 1) * (c + 1);
        const cy = ud / (rows + 1) * (r + 1);
        return (
          <g key={`fan-${i}`}>
            {/* Fan guard grille - concentric circles */}
            <circle cx={cx} cy={cy} r={fanR} fill="none" stroke={C} strokeWidth={0.6} />
            <circle cx={cx} cy={cy} r={fanR * 0.75} fill="none" stroke={CD} strokeWidth={0.3} />
            <circle cx={cx} cy={cy} r={fanR * 0.5} fill="none" stroke={CD} strokeWidth={0.2} />
            <circle cx={cx} cy={cy} r={fanR * 0.25} fill="none" stroke={CD} strokeWidth={0.2} />
            {/* Fan blades (radial spokes) */}
            {Array.from({ length: 8 }).map((_, bi) => {
              const angle = (bi / 8) * Math.PI * 2;
              return (
                <line key={bi} x1={cx} y1={cy}
                  x2={cx + Math.cos(angle) * fanR * 0.9} y2={cy + Math.sin(angle) * fanR * 0.9}
                  stroke={CD} strokeWidth={0.3} />
              );
            })}
            {/* Center hub */}
            <circle cx={cx} cy={cy} r={2} fill={CD} opacity={0.3} />
          </g>
        );
      })}

      {/* Refrigerant service valves */}
      <circle cx={uw - 8} cy={ud * 0.3} r={2} fill="none" stroke="#a855f7" strokeWidth={0.5} />
      <text x={uw - 8} y={ud * 0.3 + 6} fontSize={2.5} textAnchor="middle" fill="#a855f7" fontFamily="monospace">REF SVC</text>

      {/* Electrical junction box */}
      <rect x={uw - 18} y={ud - 12} width={14} height={8} fill="none" stroke="#f59e0b" strokeWidth={0.5} />
      <text x={uw - 11} y={ud - 6} fontSize={2.5} textAnchor="middle" fill="#f59e0b" fontFamily="monospace">ELEC JB</text>

      <DimH x1={0} x2={uw} y={ud + 14} label={`${p.unitWidth}`} />
      <DimV y1={0} y2={ud} x={-16} label={`${p.unitDepth}`} />
    </g>
  );
}

// ── Rear View ──
function RearView({ ox, oy, p }: { ox: number; oy: number; p: Required<ChillerUnitParams> }) {
  const s = 0.06;
  const uw = p.unitWidth * s;
  const uh = p.unitHeight * s;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={uw / 2} y={-8} fontSize={6} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">REAR VIEW</text>

      <rect x={0} y={0} width={uw} height={uh} fill="none" stroke={C} strokeWidth={0.8} />

      {/* Heat exchanger fins (dense parallel lines) */}
      <rect x={5} y={5} width={uw - 10} height={uh * 0.65} fill="none" stroke={CD} strokeWidth={0.4} />
      {Array.from({ length: 40 }).map((_, i) => (
        <line key={i} x1={5 + (uw - 10) * (i / 40)} y1={5}
          x2={5 + (uw - 10) * (i / 40)} y2={5 + uh * 0.65}
          stroke={CD} strokeWidth={0.15} />
      ))}
      <text x={uw / 2} y={uh * 0.35} fontSize={3.5} textAnchor="middle" fill={CD} fontFamily="monospace">HEAT EXCHANGER FINS</text>

      {/* Service access panel */}
      <rect x={uw * 0.2} y={uh * 0.72} width={uw * 0.6} height={uh * 0.2}
        fill="none" stroke={C} strokeWidth={0.5} strokeDasharray="3,2" />
      {/* Screw positions */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <circle cx={uw * 0.2 + 5 + (uw * 0.6 - 10) * (i / 3)} cy={uh * 0.72 + 4} r={1} fill="none" stroke={CD} strokeWidth={0.3} />
          <circle cx={uw * 0.2 + 5 + (uw * 0.6 - 10) * (i / 3)} cy={uh * 0.92 - 4} r={1} fill="none" stroke={CD} strokeWidth={0.3} />
        </g>
      ))}
      <text x={uw / 2} y={uh * 0.84} fontSize={3} textAnchor="middle" fill={CD} fontFamily="monospace">SERVICE PANEL</text>

      {/* Mounting bracket holes */}
      {[
        { x: 8, y: uh - 8 }, { x: uw - 8, y: uh - 8 },
        { x: 8, y: uh - 25 }, { x: uw - 8, y: uh - 25 },
      ].map((h, i) => (
        <g key={i}>
          <circle cx={h.x} cy={h.y} r={2.5} fill="none" stroke={CA} strokeWidth={0.5} />
          <line x1={h.x - 3.5} y1={h.y} x2={h.x + 3.5} y2={h.y} stroke={CA} strokeWidth={0.2} />
          <line x1={h.x} y1={h.y - 3.5} x2={h.x} y2={h.y + 3.5} stroke={CA} strokeWidth={0.2} />
        </g>
      ))}
    </g>
  );
}

// ── Hole Position Diagram ──
function HolePositionDiagram({ ox, oy, p }: { ox: number; oy: number; p: Required<ChillerUnitParams> }) {
  const s = 0.04;
  const uw = p.unitWidth * s;
  const uh = p.unitHeight * s;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={uw / 2} y={-8} fontSize={5} textAnchor="middle" fill={CT} fontWeight="bold" fontFamily="monospace">HOLE POSITION DIAGRAM</text>

      {/* Outline */}
      <rect x={0} y={0} width={uw} height={uh} fill="none" stroke={CD} strokeWidth={0.5} strokeDasharray="3,2" />

      {/* Datum lines */}
      <line x1={0} y1={0} x2={0} y2={uh + 10} stroke="#ef4444" strokeWidth={0.3} strokeDasharray="4,2,1,2" />
      <line x1={0} y1={uh} x2={uw + 10} y2={uh} stroke="#ef4444" strokeWidth={0.3} strokeDasharray="4,2,1,2" />
      <text x={-3} y={uh + 5} fontSize={3} fill="#ef4444" fontFamily="monospace" textAnchor="end">DATUM</text>

      {/* Bolt holes with dimensions */}
      {[
        { x: 8 * s, y: 8 * s, label: "M12" },
        { x: (p.unitWidth - 8) * s, y: 8 * s, label: "M12" },
        { x: 8 * s, y: (p.unitHeight - 8) * s, label: "M12" },
        { x: (p.unitWidth - 8) * s, y: (p.unitHeight - 8) * s, label: "M12" },
      ].map((hole, i) => (
        <g key={i}>
          <circle cx={hole.x} cy={hole.y} r={2.5} fill="none" stroke={CA} strokeWidth={0.6} />
          <line x1={hole.x - 3.5} y1={hole.y} x2={hole.x + 3.5} y2={hole.y} stroke={CA} strokeWidth={0.2} />
          <line x1={hole.x} y1={hole.y - 3.5} x2={hole.x} y2={hole.y + 3.5} stroke={CA} strokeWidth={0.2} />
          <text x={hole.x} y={hole.y - 5} fontSize={3} textAnchor="middle" fill={CA} fontFamily="monospace">{hole.label}</text>
        </g>
      ))}

      {/* Position dimensions from datum */}
      <DimH x1={0} x2={8 * s} y={uh + 8} label="80" ext={4} />
      <DimH x1={0} x2={(p.unitWidth - 8) * s} y={uh + 16} label={`${p.unitWidth - 80}`} ext={4} />
    </g>
  );
}

// ── Specification Table ──
function SpecTable({ ox, oy, p }: { ox: number; oy: number; p: Required<ChillerUnitParams> }) {
  const rows = [
    ["Parameter", "Value"],
    ["Cooling Capacity", `${p.coolingCapacity} kW`],
    ["Refrigerant", "R-410A"],
    ["Voltage", p.voltage],
    ["Flow Rate", `${p.flowRate} L/min`],
    ["Fan Count", `${p.fanCount}× Ø${p.fanDiameter}mm`],
    ["Pipe Connection", `Ø${p.pipeDiameter}mm`],
    ["Dimensions", `${p.unitWidth}×${p.unitHeight}×${p.unitDepth}`],
  ];
  const cw = [60, 80];
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

export default function ChillerUnit({ params = {} }: { params?: ChillerUnitParams }) {
  const p = { ...DEFAULTS, ...params };
  const W = 841, H = 594;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ background: BG }} fontFamily="monospace">
      <rect x={8} y={8} width={W - 16} height={H - 16} fill="none" stroke="#30363d" strokeWidth={1.2} />
      <rect x={14} y={14} width={W - 28} height={H - 28} fill="none" stroke="#21262d" strokeWidth={0.6} />

      <text x={W / 2} y={30} fontSize={10} textAnchor="middle" fill={CA} fontWeight="bold">
        CHILLER UNIT — AUS-S{p.coolingCapacity}FN
      </text>

      <FrontView ox={30} oy={50} p={p} />
      <TopView ox={30} oy={310} p={p} />
      <RearView ox={310} oy={50} p={p} />
      <HolePositionDiagram ox={310} oy={310} p={p} />
      <SpecTable ox={620} oy={50} p={p} />

      {/* Title block */}
      <g transform={`translate(${W - 260},${H - 55})`}>
        <rect x={0} y={0} width={240} height={40} fill="#161b22" stroke="#30363d" strokeWidth={0.8} />
        <line x1={80} y1={0} x2={80} y2={40} stroke="#21262d" strokeWidth={0.4} />
        <line x1={160} y1={0} x2={160} y2={40} stroke="#21262d" strokeWidth={0.4} />
        <line x1={0} y1={20} x2={240} y2={20} stroke="#21262d" strokeWidth={0.4} />
        <text x={4} y={12} fontSize={4} fill={CD}>DRAWN BY</text>
        <text x={4} y={34} fontSize={5} fill={C} fontWeight="bold">ShilpaSutra AI</text>
        <text x={84} y={12} fontSize={4} fill={CD}>PART NO.</text>
        <text x={84} y={34} fontSize={5} fill={C} fontWeight="bold">SS-CHL-001</text>
        <text x={164} y={12} fontSize={4} fill={CD}>SCALE</text>
        <text x={164} y={34} fontSize={5} fill={C}>NOT TO SCALE</text>
      </g>

      <g transform={`translate(20,${H - 70})`}>
        <text fontSize={4.5} fill={CD} fontWeight="bold">NOTES:</text>
        <text y={8} fontSize={3.8} fill={CD}>1. ALL DIMENSIONS IN MM. 2. REFRIGERANT: R-410A (GWP 2088).</text>
        <text y={15} fontSize={3.8} fill={CD}>3. ELECTRICAL: {p.voltage}. 4. MIN CLEARANCE: 500mm ALL SIDES FOR AIRFLOW.</text>
      </g>
    </svg>
  );
}
