"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// SolarSimulator — Class AAA Solar Simulator IEC 60904-9
// Professional A3 multi-view GA drawing with parametric dimensions
// ═══════════════════════════════════════════════════════════════════════════════

import React from "react";

export interface SolarSimulatorParams {
  cabinetWidth?: number;
  cabinetHeight?: number;
  cabinetDepth?: number;
  testAreaW?: number;
  testAreaH?: number;
  irradiance?: number;
  lampRows?: number;
  lampCols?: number;
  housingWidth?: number;
  housingHeight?: number;
  ductDiameter?: number;
}

const DEFAULTS = {
  cabinetWidth: 2400,
  cabinetHeight: 1200,
  cabinetDepth: 1200,
  testAreaW: 2000,
  testAreaH: 2000,
  irradiance: 1000,
  lampRows: 4,
  lampCols: 4,
  ductDiameter: 200,
};

function resolve(params: SolarSimulatorParams) {
  return {
    W: params.cabinetWidth ?? params.housingWidth ?? DEFAULTS.cabinetWidth,
    H: params.cabinetHeight ?? params.housingHeight ?? DEFAULTS.cabinetHeight,
    D: params.cabinetDepth ?? DEFAULTS.cabinetDepth,
    testAreaW: params.testAreaW ?? DEFAULTS.testAreaW,
    testAreaH: params.testAreaH ?? DEFAULTS.testAreaH,
    irradiance: params.irradiance ?? DEFAULTS.irradiance,
    lampRows: params.lampRows ?? DEFAULTS.lampRows,
    lampCols: params.lampCols ?? DEFAULTS.lampCols,
    ductDiameter: params.ductDiameter ?? DEFAULTS.ductDiameter,
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
  const hw = p.W * s, hh = p.H * s;
  const lampSpX = hw / (p.lampCols + 1);
  const lampSpY = hh / (p.lampRows + 1);
  const tw = p.testAreaW * s;
  const totalH = hh + 140;

  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={hw / 2} y={-12} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">FRONT VIEW</text>

      {/* Lamp housing */}
      <rect x={0} y={0} width={hw} height={hh} fill="none" stroke={LN} strokeWidth={1.5} rx={2} />
      <text x={hw / 2} y={hh + 10} fontSize={5} textAnchor="middle" fill={SUB} fontFamily="monospace">LAMP HOUSING</text>

      {/* Lamp array */}
      {Array.from({ length: p.lampRows }).map((_, r) =>
        Array.from({ length: p.lampCols }).map((_, c) => {
          const lx = lampSpX * (c + 1), ly = lampSpY * (r + 1);
          return (
            <g key={`lamp-${r}-${c}`}>
              <circle cx={lx} cy={ly} r={8} fill="none" stroke={ACCENT} strokeWidth={0.6} />
              <circle cx={lx} cy={ly} r={3} fill={ACCENT} opacity={0.2} />
            </g>
          );
        })
      )}

      {/* Filter assembly */}
      <rect x={15} y={hh + 16} width={hw - 30} height={6} fill="none" stroke="#a855f7" strokeWidth={0.6} />
      <text x={hw / 2} y={hh + 20} fontSize={4} textAnchor="middle" fill="#a855f7" fontFamily="monospace">AM1.5 FILTER</text>
      <rect x={15} y={hh + 24} width={hw - 30} height={4} fill="none" stroke="#a855f7" strokeWidth={0.4} />
      <text x={hw / 2} y={hh + 27} fontSize={3.5} textAnchor="middle" fill="#a855f7" fontFamily="monospace">DIFFUSER</text>

      {/* Light cone */}
      <line x1={hw * 0.1} y1={hh + 30} x2={(hw - tw) / 2} y2={totalH - 12} stroke="#fbbf24" strokeWidth={0.4} strokeDasharray="4,3" />
      <line x1={hw * 0.9} y1={hh + 30} x2={(hw + tw) / 2} y2={totalH - 12} stroke="#fbbf24" strokeWidth={0.4} strokeDasharray="4,3" />

      {/* Test plane */}
      <line x1={(hw - tw) / 2} y1={totalH} x2={(hw + tw) / 2} y2={totalH} stroke={ACCENT} strokeWidth={1.2} />
      <text x={hw / 2} y={totalH + 12} fontSize={6} textAnchor="middle" fill={ACCENT} fontFamily="monospace">TEST PLANE</text>

      {/* Module table */}
      <rect x={(hw - tw) / 2 - 6} y={totalH + 3} width={tw + 12} height={8} fill="none" stroke={LN} strokeWidth={0.8} />

      <DimH x1={0} x2={hw} y={totalH + 30} label={`${p.W}`} />
      <DimV y1={0} y2={hh} x={-25} label={`${p.H}`} />
    </g>
  );
}

function RightView({ ox, oy, p }: { ox: number; oy: number; p: ReturnType<typeof resolve> }) {
  return (
    <g transform={`translate(${ox},${oy})`}>
      <text x={100} y={-12} fontSize={9} textAnchor="middle" fill={TITLE} fontWeight="bold" fontFamily="monospace">SIDE VIEW — SYSTEM LAYOUT</text>

      {/* Lamp housing */}
      <rect x={25} y={0} width={100} height={65} fill="none" stroke={LN} strokeWidth={1} rx={2} />
      <text x={75} y={35} fontSize={6} textAnchor="middle" fill={SUB} fontFamily="monospace">LAMP HOUSING</text>

      {/* Cooling duct */}
      <rect x={130} y={12} width={50} height={18} fill="none" stroke={LN} strokeWidth={0.6} rx={2} />
      {[138, 153, 168].map((ax, i) => (
        <g key={i}>
          <line x1={ax} y1={21} x2={ax + 8} y2={21} stroke="#22c55e" strokeWidth={0.5} />
          <polygon points={`${ax + 8},${21} ${ax + 5},${19} ${ax + 5},${23}`} fill="#22c55e" />
        </g>
      ))}
      <text x={155} y={8} fontSize={5} textAnchor="middle" fill={SUB} fontFamily="monospace">Ø{p.ductDiameter}mm DUCT</text>

      {/* Chilled water */}
      <line x1={125} y1={44} x2={165} y2={44} stroke="#3b82f6" strokeWidth={0.7} />
      <line x1={125} y1={54} x2={165} y2={54} stroke="#3b82f6" strokeWidth={0.7} />
      <text x={175} y={46} fontSize={5} fill="#3b82f6" fontFamily="monospace">CW SUPPLY</text>
      <text x={175} y={56} fontSize={5} fill="#3b82f6" fontFamily="monospace">CW RETURN</text>

      {/* PSU */}
      <rect x={25} y={90} width={65} height={45} fill="none" stroke={LN} strokeWidth={0.8} rx={2} />
      <text x={57} y={116} fontSize={6} textAnchor="middle" fill={SUB} fontFamily="monospace">PSU</text>
      <path d="M57,90 L57,70 L57,65" fill="none" stroke="#f59e0b" strokeWidth={0.6} strokeDasharray="3,2" />

      {/* Control rack */}
      <rect x={115} y={80} width={40} height={65} fill="none" stroke={LN} strokeWidth={0.8} rx={1} />
      <text x={135} y={116} fontSize={5} textAnchor="middle" fill={SUB} fontFamily="monospace">CONTROL</text>
      <text x={135} y={124} fontSize={5} textAnchor="middle" fill={SUB} fontFamily="monospace">RACK</text>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={120} y={86 + i * 9} width={28} height={5} fill="none" stroke={SUB} strokeWidth={0.3} rx={0.5} />
      ))}
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
      {/* Lamp grid dots */}
      {Array.from({ length: p.lampCols }).map((_, c) =>
        Array.from({ length: Math.min(p.lampRows, 3) }).map((_, r) => (
          <circle key={`${c}-${r}`} cx={w * (c + 1) / (p.lampCols + 1)} cy={d * (r + 1) / 4}
            r={4} fill="none" stroke={ACCENT} strokeWidth={0.3} />
        ))
      )}
      {/* Duct connection */}
      <circle cx={w + 20} cy={d * 0.5} r={10} fill="none" stroke={LN} strokeWidth={0.5} />
      <text x={w + 20} y={d * 0.5 + 16} fontSize={4} textAnchor="middle" fill={SUB} fontFamily="monospace">Ø{p.ductDiameter}</text>
      <line x1={w} y1={d * 0.5} x2={w + 10} y2={d * 0.5} stroke={LN} strokeWidth={0.4} />
      <DimH x1={0} x2={w} y={d + 15} label={`${p.W}`} />
    </g>
  );
}

function SpecTable({ ox, oy, p }: { ox: number; oy: number; p: ReturnType<typeof resolve> }) {
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
    ["Cooling", "Forced air + chilled water"],
    ["Lamp Life", ">2000 hrs"],
    ["Power Supply", "3-Ph 415V 50Hz"],
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
      <text x={250} y={45} fontSize={10} fill={TXT} fontWeight="bold" fontFamily="monospace">SOLAR SIMULATOR — CLASS AAA — IEC 60904-9</text>
      <text x={550} y={18} fontSize={8} fill={SUB} fontFamily="monospace">SCALE</text>
      <text x={550} y={45} fontSize={10} fill={TXT} fontFamily="monospace">1:50</text>
      <text x={750} y={18} fontSize={8} fill={SUB} fontFamily="monospace">MATERIAL</text>
      <text x={750} y={45} fontSize={9} fill={TXT} fontFamily="monospace">Aluminium / Steel frame</text>
      <text x={930} y={18} fontSize={8} fill={SUB} fontFamily="monospace">DATE: 2026-03-29</text>
      <text x={930} y={45} fontSize={8} fill={TXT} fontFamily="monospace">DWG NO: SS-SIM-001 REV A</text>
    </g>
  );
}

function GeneralNotes({ ox, oy }: { ox: number; oy: number }) {
  const notes = [
    "1. ALL DIMENSIONS IN MILLIMETERS UNLESS OTHERWISE STATED.",
    "2. CLASSIFICATION PER IEC 60904-9:2020.",
    "3. COOLING: FORCED AIR + CHILLED WATER LOOP.",
    "4. LAMP LIFE: >2000 HRS, REPLACE AS ARRAY.",
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

export default function SolarSimulator({ params = {} }: { params?: SolarSimulatorParams }) {
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
