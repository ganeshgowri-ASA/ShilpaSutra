"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// UVConditioningChamber — IEC 61215 MQT 10 UV Preconditioning Chamber
// Professional A3 multi-view GA drawing with parametric dimensions
// ═══════════════════════════════════════════════════════════════════════════════

import React from "react";

export interface UVConditioningChamberParams {
  cabinetWidth?: number;
  cabinetHeight?: number;
  cabinetDepth?: number;
  chamberWidth?: number;
  chamberHeight?: number;
  chamberDepth?: number;
  lampCount?: number;
  uvDose?: number;
  wavelengthMin?: number;
  wavelengthMax?: number;
}

const DEFAULTS = {
  cabinetWidth: 1800,
  cabinetHeight: 1600,
  cabinetDepth: 1000,
  lampCount: 8,
  uvDose: 15,
  wavelengthMin: 280,
  wavelengthMax: 400,
};

function resolve(params: UVConditioningChamberParams) {
  return {
    W: params.cabinetWidth ?? params.chamberWidth ?? DEFAULTS.cabinetWidth,
    H: params.cabinetHeight ?? params.chamberHeight ?? DEFAULTS.cabinetHeight,
    D: params.cabinetDepth ?? params.chamberDepth ?? DEFAULTS.cabinetDepth,
    lampCount: params.lampCount ?? DEFAULTS.lampCount,
    uvDose: params.uvDose ?? DEFAULTS.uvDose,
    wavelengthMin: params.wavelengthMin ?? DEFAULTS.wavelengthMin,
    wavelengthMax: params.wavelengthMax ?? DEFAULTS.wavelengthMax,
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

function FrontView({ ox, oy, W, H, lampCount }: { ox: number; oy: number; W: number; H: number; lampCount: number }) {
  const s = 350 / 2000;
  const w = W * s, h = H * s;
  const lampSp = w / (lampCount + 1);

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={w / 2} y={-12} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">FRONT VIEW</text>
      <rect x={0} y={0} width={w} height={h} fill="none" stroke={LN} strokeWidth={1.5} />
      <rect x={8} y={8} width={w - 16} height={h - 16} fill="none" stroke={LN} strokeWidth={0.6} strokeDasharray="6,3" />

      {/* UV lamp array */}
      {Array.from({ length: lampCount }).map((_, i) => {
        const lx = lampSp * (i + 1);
        return (
          <g key={i}>
            <rect x={lx - 4} y={15} width={8} height={45} fill="none" stroke="#a855f7" strokeWidth={0.6} rx={1} />
            <rect x={lx - 2} y={18} width={4} height={39} fill="#a855f7" opacity={0.12} rx={0.5} />
          </g>
        );
      })}
      <text x={w / 2} y={68} fontSize={6} textAnchor="middle" fill="#a855f7" fontFamily="monospace">UV LAMP ARRAY ({lampCount}×)</text>

      {/* Irradiance arrows */}
      {[0.25, 0.5, 0.75].map((f, i) => (
        <g key={i}>
          <line x1={w * f} y1={70} x2={w * f} y2={h * 0.5} stroke="#a855f7" strokeWidth={0.5} strokeDasharray="3,2" />
          <polygon points={`${w * f},${h * 0.5} ${w * f - 2},${h * 0.5 - 6} ${w * f + 2},${h * 0.5 - 6}`} fill="#a855f7" />
        </g>
      ))}

      {/* Module position */}
      <rect x={w * 0.1} y={h * 0.55} width={w * 0.8} height={h * 0.25} fill="none" stroke={ACCENT} strokeWidth={0.8} />
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={i} x1={w * 0.1 + w * 0.8 * (i / 8)} y1={h * 0.55} x2={w * 0.1 + w * 0.8 * (i / 8)} y2={h * 0.8} stroke={ACCENT} strokeWidth={0.15} />
      ))}
      <text x={w / 2} y={h * 0.7} fontSize={6} textAnchor="middle" fill={ACCENT} fontFamily="monospace">PV MODULE</text>

      {/* Sensors */}
      <circle cx={w - 15} cy={h * 0.6} r={3} fill="none" stroke="#ef4444" strokeWidth={0.5} />
      <text x={w - 15} y={h * 0.6 + 8} fontSize={4} textAnchor="middle" fill="#ef4444" fontFamily="monospace">TEMP</text>
      <circle cx={w * 0.5} cy={h * 0.48} r={3} fill="none" stroke="#f59e0b" strokeWidth={0.5} />
      <text x={w * 0.5 + 8} y={h * 0.48 + 1} fontSize={4} fill="#f59e0b" fontFamily="monospace">UV SENSOR</text>

      {/* Control panel */}
      <rect x={w * 0.25} y={h + 3} width={w * 0.5} height={14} fill="none" stroke={ACCENT} strokeWidth={0.5} rx={1} />
      <text x={w / 2} y={h + 12} fontSize={5} textAnchor="middle" fill={ACCENT} fontFamily="monospace">CONTROL PANEL</text>

      <DimH x1={0} x2={w} y={h + 30} label={`${W}`} />
      <DimV y1={0} y2={h} x={-25} label={`${H}`} />
    </g>
  );
}

function RightView({ ox, oy, D, H }: { ox: number; oy: number; D: number; H: number }) {
  const s = 200 / 2000;
  const d = D * s, h = H * s;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={d / 2} y={-12} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">RIGHT VIEW</text>
      <rect x={0} y={0} width={d} height={h} fill="none" stroke={LN} strokeWidth={1.2} />
      {/* Reflector */}
      <path d={`M8,8 Q${d / 2},25 ${d - 8},8`} fill="none" stroke={SUB} strokeWidth={0.6} />
      <text x={d / 2} y={20} fontSize={5} textAnchor="middle" fill={SUB} fontFamily="monospace">REFLECTOR</text>
      {/* Ventilation */}
      <rect x={d - 8} y={h * 0.3} width={8} height={h * 0.4} fill="none" stroke="#22c55e" strokeWidth={0.5} />
      {[0.35, 0.5, 0.65].map((f, i) => (
        <g key={i}>
          <line x1={d} y1={h * f} x2={d + 8} y2={h * f} stroke="#22c55e" strokeWidth={0.4} />
          <polygon points={`${d + 8},${h * f} ${d + 5},${h * f - 2} ${d + 5},${h * f + 2}`} fill="#22c55e" />
        </g>
      ))}
      <DimH x1={0} x2={d} y={h + 25} label={`${D}`} />
    </g>
  );
}

function TopView({ ox, oy, W, D }: { ox: number; oy: number; W: number; D: number }) {
  const s = 350 / 2000;
  const w = W * s, d = Math.min(D * s, 120);

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={w / 2} y={-8} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">TOP VIEW</text>
      <rect x={0} y={0} width={w} height={d} fill="none" stroke={LN} strokeWidth={1.2} />
      {/* Lamp positions */}
      {Array.from({ length: 4 }).map((_, i) => (
        <circle key={i} cx={w * (i + 1) / 5} cy={d * 0.5} r={5} fill="none" stroke="#a855f7" strokeWidth={0.4} />
      ))}
      {/* Exhaust duct */}
      <rect x={w + 15} y={d * 0.2} width={40} height={d * 0.6} fill="none" stroke={SUB} strokeWidth={0.5} />
      <text x={w + 35} y={d * 0.55} fontSize={5} textAnchor="middle" fill={SUB} fontFamily="monospace">EXHAUST</text>
      <line x1={w} y1={d * 0.5} x2={w + 15} y2={d * 0.5} stroke={SUB} strokeWidth={0.4} />
      <DimH x1={0} x2={w} y={d + 15} label={`${W}`} />
    </g>
  );
}

function SpecTable({ ox, oy, p }: { ox: number; oy: number; p: ReturnType<typeof resolve> }) {
  const rows = [
    ["Parameter", "Value"],
    ["UV Dose", `${p.uvDose} kWh/m²`],
    ["Wavelength", `${p.wavelengthMin}–${p.wavelengthMax} nm`],
    ["Lamp Count", `${p.lampCount}`],
    ["Lamp Type", "Fluorescent UVA-340"],
    ["Chamber Temp", "60±5°C"],
    ["Dimensions (WxHxD)", `${p.W}×${p.H}×${p.D} mm`],
    ["Control", "PLC + HMI"],
    ["Power Supply", "3-Ph 415V 50Hz"],
    ["Irradiance Sensor", "Solar-calibrated"],
    ["Standard", "IEC 61215 MQT 10"],
    ["Weight (approx)", "~800 kg"],
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
      <text x={250} y={45} fontSize={10} fill={TXT} fontWeight="bold" fontFamily="monospace">UV CONDITIONING CHAMBER — IEC 61215 MQT 10</text>
      <text x={550} y={18} fontSize={8} fill={SUB} fontFamily="monospace">SCALE</text>
      <text x={550} y={45} fontSize={10} fill={TXT} fontFamily="monospace">1:50</text>
      <text x={750} y={18} fontSize={8} fill={SUB} fontFamily="monospace">MATERIAL</text>
      <text x={750} y={45} fontSize={9} fill={TXT} fontFamily="monospace">Outer: GI / Inner: SS304</text>
      <text x={930} y={18} fontSize={8} fill={SUB} fontFamily="monospace">DATE: 2026-03-29</text>
      <text x={930} y={45} fontSize={8} fill={TXT} fontFamily="monospace">DWG NO: SS-UVC-001 REV A</text>
    </g>
  );
}

function GeneralNotes({ ox, oy }: { ox: number; oy: number }) {
  const notes = [
    "1. ALL DIMENSIONS IN MILLIMETERS UNLESS OTHERWISE STATED.",
    "2. UV LAMPS: FLUORESCENT UVA-340, REPLACE EVERY 2000 HRS.",
    "3. CHAMBER OPERATING TEMP: 60±5°C.",
    "4. IRRADIANCE UNIFORMITY: ±15% OVER TEST AREA.",
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

export default function UVConditioningChamber({ params = {} }: { params?: UVConditioningChamberParams }) {
  const p = resolve(params);

  return (
    <svg viewBox="0 0 1189 841" className="w-full h-full" style={{ background: "transparent" }} fontFamily="monospace">
      <rect x={5} y={5} width={1179} height={831} fill="none" stroke="#30363d" strokeWidth={1.5} />
      <rect x={12} y={12} width={1165} height={817} fill="none" stroke="#21262d" strokeWidth={0.7} />

      <TopView ox={50} oy={50} W={p.W} D={p.D} />
      <FrontView ox={50} oy={190} W={p.W} H={p.H} lampCount={p.lampCount} />
      <RightView ox={460} oy={190} D={p.D} H={p.H} />
      <SpecTable ox={700} oy={340} p={p} />
      <GeneralNotes ox={700} oy={600} />
      <TitleBlock y={770} />
    </svg>
  );
}
