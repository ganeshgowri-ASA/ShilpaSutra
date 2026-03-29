"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// ChillerUnit — Industrial Chiller Unit
// Professional A3 multi-view GA drawing with parametric dimensions
// ═══════════════════════════════════════════════════════════════════════════════

import React from "react";

export interface ChillerUnitParams {
  cabinetWidth?: number;
  cabinetHeight?: number;
  cabinetDepth?: number;
  unitWidth?: number;
  unitHeight?: number;
  unitDepth?: number;
  coolingCapacity?: number;
  fanCount?: number;
  fanDiameter?: number;
  pipeDiameter?: number;
  flowRate?: number;
  voltage?: string;
}

const DEFAULTS = {
  cabinetWidth: 2200,
  cabinetHeight: 1800,
  cabinetDepth: 900,
  coolingCapacity: 80,
  fanCount: 6,
  fanDiameter: 450,
  pipeDiameter: 65,
  flowRate: 200,
  voltage: "3-Ph 415V 50Hz",
};

function resolve(params: ChillerUnitParams) {
  return {
    W: params.cabinetWidth ?? params.unitWidth ?? DEFAULTS.cabinetWidth,
    H: params.cabinetHeight ?? params.unitHeight ?? DEFAULTS.cabinetHeight,
    D: params.cabinetDepth ?? params.unitDepth ?? DEFAULTS.cabinetDepth,
    coolingCapacity: params.coolingCapacity ?? DEFAULTS.coolingCapacity,
    fanCount: params.fanCount ?? DEFAULTS.fanCount,
    fanDiameter: params.fanDiameter ?? DEFAULTS.fanDiameter,
    pipeDiameter: params.pipeDiameter ?? DEFAULTS.pipeDiameter,
    flowRate: params.flowRate ?? DEFAULTS.flowRate,
    voltage: params.voltage ?? DEFAULTS.voltage,
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
  const uw = p.W * s, uh = p.H * s;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={uw / 2} y={-12} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">FRONT VIEW</text>
      <rect x={0} y={0} width={uw} height={uh} fill="none" stroke={LN} strokeWidth={1.5} rx={2} />

      {/* Control panel */}
      <rect x={uw * 0.25} y={uh * 0.1} width={uw * 0.5} height={uh * 0.28} fill="none" stroke={ACCENT} strokeWidth={0.8} rx={1} />
      <text x={uw / 2} y={uh * 0.14} fontSize={5} textAnchor="middle" fill={ACCENT} fontFamily="monospace">CONTROL PANEL</text>

      {/* Digital display */}
      <rect x={uw * 0.32} y={uh * 0.17} width={uw * 0.36} height={uh * 0.08} fill="#161b22" stroke={ACCENT} strokeWidth={0.5} rx={1} />
      <text x={uw / 2} y={uh * 0.22} fontSize={7} textAnchor="middle" fill="#22c55e" fontFamily="monospace">25.0°C</text>

      {/* Buttons */}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={uw * 0.33 + i * uw * 0.08} y={uh * 0.28} width={uw * 0.05} height={uw * 0.04}
          fill="none" stroke={SUB} strokeWidth={0.4} rx={1} />
      ))}

      {/* Status LEDs */}
      {[
        { cx: uw * 0.3, color: "#22c55e", label: "RUN" },
        { cx: uw * 0.4, color: "#f59e0b", label: "ALARM" },
        { cx: uw * 0.5, color: "#ef4444", label: "FAULT" },
      ].map((led, i) => (
        <g key={i}>
          <circle cx={led.cx} cy={uh * 0.34} r={2.5} fill={led.color} opacity={0.5} />
          <text x={led.cx} y={uh * 0.34 + 8} fontSize={4} textAnchor="middle" fill={SUB} fontFamily="monospace">{led.label}</text>
        </g>
      ))}

      {/* Pipe connections */}
      <circle cx={uw * 0.12} cy={uh * 0.55} r={p.pipeDiameter * s / 2 + 3} fill="none" stroke="#3b82f6" strokeWidth={0.8} />
      <text x={uw * 0.12} y={uh * 0.55 + p.pipeDiameter * s / 2 + 10} fontSize={5} textAnchor="middle" fill="#3b82f6" fontFamily="monospace">
        INLET Ø{p.pipeDiameter}
      </text>
      <circle cx={uw * 0.88} cy={uh * 0.55} r={p.pipeDiameter * s / 2 + 3} fill="none" stroke="#3b82f6" strokeWidth={0.8} />
      <text x={uw * 0.88} y={uh * 0.55 + p.pipeDiameter * s / 2 + 10} fontSize={5} textAnchor="middle" fill="#3b82f6" fontFamily="monospace">
        OUTLET Ø{p.pipeDiameter}
      </text>

      {/* Drain valve */}
      <circle cx={uw * 0.5} cy={uh - 8} r={4} fill="none" stroke={SUB} strokeWidth={0.5} />
      <line x1={uw * 0.5 - 2.5} y1={uh - 10.5} x2={uw * 0.5 + 2.5} y2={uh - 5.5} stroke={SUB} strokeWidth={0.4} />
      <text x={uw * 0.5} y={uh + 4} fontSize={4} textAnchor="middle" fill={SUB} fontFamily="monospace">DRAIN</text>

      {/* Model plate */}
      <rect x={uw * 0.6} y={uh * 0.7} width={uw * 0.3} height={uh * 0.08} fill="#161b22" stroke={SUB} strokeWidth={0.5} />
      <text x={uw * 0.75} y={uh * 0.76} fontSize={5} textAnchor="middle" fill={TXT} fontFamily="monospace">AUS-S{p.coolingCapacity}FN</text>

      <DimH x1={0} x2={uw} y={uh + 25} label={`${p.W}`} />
      <DimV y1={0} y2={uh} x={-25} label={`${p.H}`} />
    </g>
  );
}

function TopView({ ox, oy, p }: { ox: number; oy: number; p: ReturnType<typeof resolve> }) {
  const s = 350 / 2200;
  const uw = p.W * s, ud = Math.min(p.D * s, 120);
  const fanR = p.fanDiameter * s / 2;
  const cols = Math.min(p.fanCount, 3);
  const rows = Math.ceil(p.fanCount / cols);

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={uw / 2} y={-8} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">TOP VIEW</text>
      <rect x={0} y={0} width={uw} height={ud} fill="none" stroke={LN} strokeWidth={1.2} />

      {/* Condenser fans */}
      {Array.from({ length: p.fanCount }).map((_, i) => {
        const r = Math.floor(i / cols), c = i % cols;
        const cx = uw / (cols + 1) * (c + 1), cy = ud / (rows + 1) * (r + 1);
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={fanR} fill="none" stroke={LN} strokeWidth={0.7} />
            <circle cx={cx} cy={cy} r={fanR * 0.7} fill="none" stroke={SUB} strokeWidth={0.3} />
            <circle cx={cx} cy={cy} r={fanR * 0.4} fill="none" stroke={SUB} strokeWidth={0.2} />
            {Array.from({ length: 8 }).map((_, bi) => {
              const angle = (bi / 8) * Math.PI * 2;
              return (
                <line key={bi} x1={cx} y1={cy}
                  x2={cx + Math.cos(angle) * fanR * 0.85} y2={cy + Math.sin(angle) * fanR * 0.85}
                  stroke={SUB} strokeWidth={0.3} />
              );
            })}
            <circle cx={cx} cy={cy} r={3} fill={SUB} opacity={0.25} />
          </g>
        );
      })}

      {/* Electrical junction box */}
      <rect x={uw - 22} y={ud - 15} width={18} height={12} fill="none" stroke="#f59e0b" strokeWidth={0.5} />
      <text x={uw - 13} y={ud - 6} fontSize={4} textAnchor="middle" fill="#f59e0b" fontFamily="monospace">ELEC JB</text>

      <DimH x1={0} x2={uw} y={ud + 15} label={`${p.W}`} />
      <DimV y1={0} y2={ud} x={-20} label={`${p.D}`} />
    </g>
  );
}

function RightView({ ox, oy, p }: { ox: number; oy: number; p: ReturnType<typeof resolve> }) {
  const s = 200 / 2200;
  const uw = p.W * s, uh = p.H * s;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={uw / 2} y={-12} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">REAR VIEW</text>
      <rect x={0} y={0} width={uw} height={uh} fill="none" stroke={LN} strokeWidth={1} />

      {/* Heat exchanger fins */}
      <rect x={8} y={8} width={uw - 16} height={uh * 0.6} fill="none" stroke={SUB} strokeWidth={0.5} />
      {Array.from({ length: 30 }).map((_, i) => (
        <line key={i} x1={8 + (uw - 16) * (i / 30)} y1={8} x2={8 + (uw - 16) * (i / 30)} y2={8 + uh * 0.6}
          stroke={SUB} strokeWidth={0.15} />
      ))}
      <text x={uw / 2} y={uh * 0.35} fontSize={5} textAnchor="middle" fill={SUB} fontFamily="monospace">HEAT EXCHANGER FINS</text>

      {/* Service panel */}
      <rect x={uw * 0.15} y={uh * 0.7} width={uw * 0.7} height={uh * 0.2}
        fill="none" stroke={LN} strokeWidth={0.6} strokeDasharray="4,3" />
      <text x={uw / 2} y={uh * 0.82} fontSize={4} textAnchor="middle" fill={SUB} fontFamily="monospace">SERVICE PANEL</text>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <circle cx={uw * 0.15 + 6 + (uw * 0.7 - 12) * (i / 3)} cy={uh * 0.7 + 5} r={1.5} fill="none" stroke={SUB} strokeWidth={0.3} />
          <circle cx={uw * 0.15 + 6 + (uw * 0.7 - 12) * (i / 3)} cy={uh * 0.9 - 5} r={1.5} fill="none" stroke={SUB} strokeWidth={0.3} />
        </g>
      ))}

      <DimH x1={0} x2={uw} y={uh + 25} label={`${p.W}`} />
    </g>
  );
}

function SpecTable({ ox, oy, p }: { ox: number; oy: number; p: ReturnType<typeof resolve> }) {
  const rows = [
    ["Parameter", "Value"],
    ["Cooling Capacity", `${p.coolingCapacity} kW`],
    ["Refrigerant", "R-410A"],
    ["Voltage", p.voltage],
    ["Flow Rate", `${p.flowRate} L/min`],
    ["Fan Count", `${p.fanCount}× Ø${p.fanDiameter}mm`],
    ["Pipe Connection", `Ø${p.pipeDiameter}mm`],
    ["Dimensions (WxHxD)", `${p.W}×${p.H}×${p.D} mm`],
    ["Operating Temp", "5°C to 35°C"],
    ["Noise Level", "<68 dB(A)"],
    ["Control", "Microprocessor PID"],
    ["Weight (approx)", "~850 kg"],
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
      <text x={250} y={45} fontSize={10} fill={TXT} fontWeight="bold" fontFamily="monospace">CHILLER UNIT — AUS-S80FN</text>
      <text x={550} y={18} fontSize={8} fill={SUB} fontFamily="monospace">SCALE</text>
      <text x={550} y={45} fontSize={10} fill={TXT} fontFamily="monospace">1:50</text>
      <text x={750} y={18} fontSize={8} fill={SUB} fontFamily="monospace">MATERIAL</text>
      <text x={750} y={45} fontSize={9} fill={TXT} fontFamily="monospace">GI + Copper piping</text>
      <text x={930} y={18} fontSize={8} fill={SUB} fontFamily="monospace">DATE: 2026-03-29</text>
      <text x={930} y={45} fontSize={8} fill={TXT} fontFamily="monospace">DWG NO: SS-CHL-001 REV A</text>
    </g>
  );
}

function GeneralNotes({ ox, oy }: { ox: number; oy: number }) {
  const notes = [
    "1. ALL DIMENSIONS IN MILLIMETERS UNLESS OTHERWISE STATED.",
    "2. REFRIGERANT: R-410A (GWP 2088).",
    "3. MINIMUM 500mm CLEARANCE ALL SIDES FOR AIRFLOW.",
    "4. ELECTRICAL: 3-PH 415V 50Hz, DEDICATED BREAKER.",
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

export default function ChillerUnit({ params = {} }: { params?: ChillerUnitParams }) {
  const p = resolve(params);

  return (
    <svg viewBox="0 0 1189 841" className="w-full h-full" style={{ background: "transparent" }} fontFamily="monospace">
      <rect x={5} y={5} width={1179} height={831} fill="none" stroke="#30363d" strokeWidth={1.5} />
      <rect x={12} y={12} width={1165} height={817} fill="none" stroke="#21262d" strokeWidth={0.7} />

      <TopView ox={50} oy={50} p={p} />
      <FrontView ox={50} oy={210} p={p} />
      <RightView ox={460} oy={210} p={p} />
      <SpecTable ox={700} oy={340} p={p} />
      <GeneralNotes ox={700} oy={600} />
      <TitleBlock y={770} />
    </svg>
  );
}
