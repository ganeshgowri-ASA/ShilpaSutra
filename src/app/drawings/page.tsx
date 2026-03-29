"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { getIECDrawingData, type IECDrawingData } from "@/lib/iecDrawingData";
import IECDrawingSheet from "@/components/drawings/IECDrawingSheet";
import { addRecentDrawing, showToast, TemplateCompareMode } from "@/components/CommandPalette";
import {
  ThermalCyclingChamber,
  UVConditioningChamber,
  HumidityFreezeChamber,
  SaltMistChamber,
  MechanicalLoadFrame,
  SolarSimulator,
  IgnitabilityChamber,
  ChillerUnit,
  EQUIPMENT_TEMPLATES,
  type EquipmentTemplateId,
} from "@/components/drawings/templates";

// ─── GD&T SVG Symbols ──────────────────────────────────────────────────────

// Inline SVG components for GD&T symbols
const GdtSymbols: Record<string, React.FC> = {
  flatness: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  ),
  straightness: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  ),
  circularity: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
    </svg>
  ),
  cylindricity: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <ellipse cx="12" cy="7" rx="8" ry="3" />
      <line x1="4" y1="7" x2="4" y2="17" />
      <line x1="20" y1="7" x2="20" y2="17" />
      <path d="M4,17 Q12,20 20,17" />
    </svg>
  ),
  position: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  ),
  perpendicularity: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="5" y1="19" x2="19" y2="19" />
      <line x1="12" y1="19" x2="12" y2="5" />
    </svg>
  ),
  parallelism: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="3" y1="8" x2="18" y2="8" />
      <line x1="6" y1="16" x2="21" y2="16" />
    </svg>
  ),
  angularity: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="4" y1="20" x2="12" y2="4" />
      <line x1="4" y1="20" x2="20" y2="20" />
    </svg>
  ),
  concentricity: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  runout: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4,12 Q12,4 20,12" />
      <line x1="20" y1="8" x2="20" y2="16" />
    </svg>
  ),
};

const gdtToolbar = [
  { id: "flatness", label: "Flatness", symbol: "⏥" },
  { id: "straightness", label: "Straightness", symbol: "⏤" },
  { id: "circularity", label: "Circularity", symbol: "○" },
  { id: "cylindricity", label: "Cylindricity", symbol: "⌀" },
  { id: "position", label: "Position", symbol: "⊕" },
  { id: "perpendicularity", label: "Perpendicularity", symbol: "⊥" },
  { id: "parallelism", label: "Parallelism", symbol: "∥" },
  { id: "angularity", label: "Angularity", symbol: "∠" },
  { id: "concentricity", label: "Concentricity", symbol: "◎" },
  { id: "runout", label: "Run-Out", symbol: "↗" },
];

interface GdtAnnotation {
  id: string;
  symbol: string;
  label: string;
  tolerance: string;
  datum: string;
  x: number;
  y: number;
}

interface DatumLabel {
  id: string;
  letter: string;
  x: number;
  y: number;
}

// GD&T Feature Control Frame SVG
function FeatureControlFrame({ annotation }: { annotation: GdtAnnotation }) {
  const sym = gdtToolbar.find(t => t.id === annotation.symbol);
  const GdtSvg = GdtSymbols[annotation.symbol];
  const boxW = annotation.datum ? 155 : annotation.tolerance ? 110 : 60;
  return (
    <g transform={`translate(${annotation.x},${annotation.y})`} fontFamily="Arial, sans-serif">
      {/* Main frame */}
      <rect x={0} y={0} width={boxW} height={22} fill="white" stroke="#1e3a5f" strokeWidth="1" />
      {/* Symbol cell */}
      <rect x={0} y={0} width={28} height={22} fill="#f0f6ff" stroke="#1e3a5f" strokeWidth="0.5" />
      <text x={14} y={15} fontSize="13" textAnchor="middle" fill="#1e3a5f" dominantBaseline="middle">
        {sym?.symbol || "?"}
      </text>
      {/* Divider */}
      <line x1={28} y1={0} x2={28} y2={22} stroke="#1e3a5f" strokeWidth="0.5" />
      {/* Tolerance cell */}
      <text x={36} y={14} fontSize="9" fill="#1e3a5f">⌀{annotation.tolerance}</text>
      {annotation.datum && (
        <>
          <line x1={boxW - 30} y1={0} x2={boxW - 30} y2={22} stroke="#1e3a5f" strokeWidth="0.5" />
          <text x={boxW - 15} y={14} fontSize="9" textAnchor="middle" fill="#1e3a5f">{annotation.datum}</text>
        </>
      )}
      {/* Leader line */}
      <line x1={14} y1={22} x2={14} y2={36} stroke="#1e3a5f" strokeWidth="0.7" />
      <polygon points={`14,36 11,30 17,30`} fill="#1e3a5f" />
    </g>
  );
}

// Datum triangle symbol SVG
function DatumTriangle({ datum }: { datum: DatumLabel }) {
  return (
    <g transform={`translate(${datum.x},${datum.y})`} fontFamily="Arial, sans-serif">
      {/* Filled triangle pointing down */}
      <polygon points="0,0 -8,-14 8,-14" fill="#1e3a5f" />
      {/* Datum box */}
      <rect x={-10} y={-30} width={20} height={16} fill="white" stroke="#1e3a5f" strokeWidth="1" />
      <text x={0} y={-18} fontSize="10" textAnchor="middle" fill="#1e3a5f" fontWeight="bold">{datum.letter}</text>
    </g>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface TitleBlock {
  partName: string;
  partNo: string;
  material: string;
  drawnBy: string;
  checkedBy: string;
  approvedBy: string;
  date: string;
  scale: string;
  sheet: string;
  revision: string;
  project: string;
  company: string;
}

interface RevisionRow {
  rev: string;
  date: string;
  description: string;
  by: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCALES = ["1:1", "1:2", "1:5", "1:10", "2:1", "5:1"];

const defaultTitle: TitleBlock = {
  partName: "Mounting Bracket",
  partNo: "SS-BRK-001",
  material: "Aluminum 6061-T6",
  drawnBy: "ShilpaSutra AI",
  checkedBy: "G. Gowri",
  approvedBy: "—",
  date: "2026-03-20",
  scale: "1:1",
  sheet: "1 of 1",
  revision: "A",
  project: "ShilpaSutra Demo",
  company: "ShilpaSutra",
};

const defaultRevisions: RevisionRow[] = [
  { rev: "A", date: "2026-03-20", description: "Initial release", by: "AI" },
  { rev: "B", date: "—", description: "", by: "" },
  { rev: "C", date: "—", description: "", by: "" },
];

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function ArrowR({ x, y }: { x: number; y: number }) {
  return <polygon points={`${x},${y} ${x - 6},${y - 3} ${x - 6},${y + 3}`} fill="#1e3a5f" />;
}
function ArrowL({ x, y }: { x: number; y: number }) {
  return <polygon points={`${x},${y} ${x + 6},${y - 3} ${x + 6},${y + 3}`} fill="#1e3a5f" />;
}
function ArrowD({ x, y }: { x: number; y: number }) {
  return <polygon points={`${x},${y} ${x - 3},${y - 6} ${x + 3},${y - 6}`} fill="#1e3a5f" />;
}
function ArrowU({ x, y }: { x: number; y: number }) {
  return <polygon points={`${x},${y} ${x - 3},${y + 6} ${x + 3},${y + 6}`} fill="#1e3a5f" />;
}

function HDim({
  x1, x2, y, value, ext = 15,
}: {
  x1: number; x2: number; y: number; value: string; ext?: number;
}) {
  return (
    <g stroke="#1e3a5f" strokeWidth="0.7" fill="none">
      <line x1={x1} y1={y - ext} x2={x1} y2={y + 4} />
      <line x1={x2} y1={y - ext} x2={x2} y2={y + 4} />
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <ArrowR x={x2} y={y} />
      <ArrowL x={x1} y={y} />
      <text x={(x1 + x2) / 2} y={y - 4} fontSize="9" textAnchor="middle" fill="#1e3a5f" stroke="none" fontFamily="Arial, sans-serif">
        {value}
      </text>
    </g>
  );
}

function VDim({
  y1, y2, x, value, ext = 15,
}: {
  y1: number; y2: number; x: number; value: string; ext?: number;
}) {
  const mid = (y1 + y2) / 2;
  return (
    <g stroke="#1e3a5f" strokeWidth="0.7" fill="none">
      <line x1={x - ext} y1={y1} x2={x + 4} y2={y1} />
      <line x1={x - ext} y1={y2} x2={x + 4} y2={y2} />
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <ArrowD x={x} y={y2} />
      <ArrowU x={x} y={y1} />
      <text x={x + 5} y={mid + 3} fontSize="9" textAnchor="start" fill="#1e3a5f" stroke="none"
        fontFamily="Arial, sans-serif" transform={`rotate(-90,${x + 5},${mid + 3})`}>
        {value}
      </text>
    </g>
  );
}

// ─── Views ────────────────────────────────────────────────────────────────────

function FrontView({ ox, oy }: { ox: number; oy: number }) {
  const W = 120, H = 80, thick = 10;
  return (
    <g transform={`translate(${ox},${oy})`} fontFamily="Arial, sans-serif">
      <rect x={0} y={H - thick} width={W} height={thick} fill="#dbeafe" stroke="#1e3a5f" strokeWidth="1.4" />
      <rect x={0} y={0} width={thick} height={H} fill="#dbeafe" stroke="#1e3a5f" strokeWidth="1.4" />
      <circle cx={80} cy={H - thick / 2} r={4} fill="white" stroke="#1e3a5f" strokeWidth="1" />
      <circle cx={thick / 2} cy={30} r={4} fill="white" stroke="#1e3a5f" strokeWidth="1" />
      <line x1={80} y1={H - thick - 8} x2={80} y2={H + 2} stroke="#1e3a5f" strokeWidth="0.5" strokeDasharray="6,3,2,3" />
      <line x1={-6} y1={30} x2={thick + 8} y2={30} stroke="#1e3a5f" strokeWidth="0.5" strokeDasharray="6,3,2,3" />
      <HDim x1={0} x2={W} y={H + 28} value="120.00" ext={12} />
      <VDim y1={0} y2={H} x={-28} value="80.00" ext={12} />
      <HDim x1={0} x2={thick} y={-16} value="10.00" ext={8} />
      <text x={W / 2} y={H + 52} fontSize="10" textAnchor="middle" fill="#1e3a5f" fontWeight="bold">
        FRONT VIEW
      </text>
    </g>
  );
}

function TopView({ ox, oy }: { ox: number; oy: number }) {
  const W = 120, D = 60, thick = 10;
  return (
    <g transform={`translate(${ox},${oy})`} fontFamily="Arial, sans-serif">
      <rect x={0} y={0} width={W} height={D} fill="#dbeafe" stroke="#1e3a5f" strokeWidth="1.4" />
      <rect x={0} y={0} width={thick} height={D} fill="none" stroke="#1e3a5f" strokeWidth="0.7" strokeDasharray="6,3" />
      <circle cx={80} cy={D / 2} r={4} fill="white" stroke="#1e3a5f" strokeWidth="1" />
      <line x1={80} y1={-6} x2={80} y2={D + 6} stroke="#1e3a5f" strokeWidth="0.5" strokeDasharray="6,3,2,3" />
      <line x1={74} y1={D / 2} x2={86} y2={D / 2} stroke="#1e3a5f" strokeWidth="0.5" strokeDasharray="6,3,2,3" />
      <HDim x1={0} x2={W} y={D + 26} value="120.00" ext={10} />
      <VDim y1={0} y2={D} x={-26} value="60.00" ext={10} />
      <text x={W / 2} y={D + 50} fontSize="10" textAnchor="middle" fill="#1e3a5f" fontWeight="bold">
        TOP VIEW
      </text>
    </g>
  );
}

function RightView({ ox, oy }: { ox: number; oy: number }) {
  const D = 60, H = 80, thick = 10;
  return (
    <g transform={`translate(${ox},${oy})`} fontFamily="Arial, sans-serif">
      <rect x={0} y={H - thick} width={D} height={thick} fill="#dbeafe" stroke="#1e3a5f" strokeWidth="1.4" />
      <rect x={0} y={0} width={thick} height={H} fill="none" stroke="#1e3a5f" strokeWidth="0.7" strokeDasharray="6,3" />
      <path d={`M${thick},${H - thick} Q${thick},${H - thick - 20} ${thick + 20},${H - thick - 20}`}
        fill="none" stroke="#1e3a5f" strokeWidth="1" />
      <circle cx={D / 2} cy={H - thick / 2} r={4} fill="white" stroke="#1e3a5f" strokeWidth="1" />
      <line x1={D / 2} y1={H - thick - 8} x2={D / 2} y2={H + 2} stroke="#1e3a5f" strokeWidth="0.5" strokeDasharray="6,3,2,3" />
      <HDim x1={0} x2={D} y={H + 28} value="60.00" ext={12} />
      <VDim y1={0} y2={H} x={D + 28} value="80.00" ext={12} />
      <VDim y1={H - thick} y2={H} x={-28} value="10.00" ext={8} />
      <text x={D / 2} y={H + 52} fontSize="10" textAnchor="middle" fill="#1e3a5f" fontWeight="bold">
        RIGHT VIEW
      </text>
    </g>
  );
}

// ─── Title Block SVG ──────────────────────────────────────────────────────────

function TitleBlockSVG({ t, scale }: { t: TitleBlock; scale: string }) {
  const x = 375, y = 472, w = 460, h = 118;
  const c = "#1e3a5f";
  const lw = 0.7;

  const cell = (label: string, value: string, bx: number, by: number) => (
    <g key={label}>
      <text x={bx + 3} y={by + 9} fontSize="7" fill={c} fontFamily="Arial">{label}</text>
      <text x={bx + 3} y={by + 21} fontSize="9" fill={c} fontFamily="Arial" fontWeight="bold">{value}</text>
    </g>
  );

  const row1 = [
    { label: "PART NAME", value: t.partName, bx: x, bw: 120 },
    { label: "PART NO.", value: t.partNo, bx: x + 120, bw: 90 },
    { label: "MATERIAL", value: t.material, bx: x + 210, bw: 100 },
    { label: "SCALE", value: scale, bx: x + 310, bw: 60 },
    { label: "REV.", value: t.revision, bx: x + 370, bw: 65 },
  ];
  const row2 = [
    { label: "DRAWN BY", value: t.drawnBy, bx: x, bw: 100 },
    { label: "DATE", value: t.date, bx: x + 100, bw: 80 },
    { label: "CHECKED BY", value: t.checkedBy, bx: x + 180, bw: 100 },
    { label: "APPROVED BY", value: t.approvedBy, bx: x + 280, bw: 90 },
    { label: "SHEET", value: t.sheet, bx: x + 370, bw: 65 },
  ];
  const row3 = [
    { label: "PROJECT", value: t.project, bx: x, bw: 230 },
    { label: "COMPANY / OWNER", value: t.company, bx: x + 230, bw: 205 },
  ];

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#f0f6ff" stroke={c} strokeWidth={1.5} />
      {/* row dividers */}
      <line x1={x} y1={y + 37} x2={x + w} y2={y + 37} stroke={c} strokeWidth={lw} />
      <line x1={x} y1={y + 74} x2={x + w} y2={y + 74} stroke={c} strokeWidth={lw} />
      {/* row 1 verticals */}
      {[120, 210, 310, 370].map((dx) => (
        <line key={`r1-${dx}`} x1={x + dx} y1={y} x2={x + dx} y2={y + 37} stroke={c} strokeWidth={lw} />
      ))}
      {/* row 2 verticals */}
      {[100, 180, 280, 370].map((dx) => (
        <line key={`r2-${dx}`} x1={x + dx} y1={y + 37} x2={x + dx} y2={y + 74} stroke={c} strokeWidth={lw} />
      ))}
      {/* row 3 verticals */}
      <line x1={x + 230} y1={y + 74} x2={x + 230} y2={y + h} stroke={c} strokeWidth={lw} />
      {/* content */}
      {row1.map((col) => cell(col.label, col.value, col.bx, y))}
      {row2.map((col) => cell(col.label, col.value, col.bx, y + 37))}
      {row3.map((col) => cell(col.label, col.value, col.bx, y + 74))}
    </g>
  );
}

// ─── Revision Table SVG ───────────────────────────────────────────────────────

function RevisionTableSVG({ rows }: { rows: RevisionRow[] }) {
  const x = 660, y = 22, colW = [30, 62, 180, 30], rh = 18;
  const headers = ["REV", "DATE", "DESCRIPTION", "BY"];
  const c = "#1e3a5f";
  const totalW = colW.reduce((a, b) => a + b, 0);

  return (
    <g fontFamily="Arial, sans-serif">
      <text x={x + totalW / 2} y={y - 4} fontSize="8" textAnchor="middle" fill={c} fontWeight="bold">REVISION TABLE</text>
      {/* header row */}
      <rect x={x} y={y} width={totalW} height={rh} fill="#dbeafe" stroke={c} strokeWidth={0.8} />
      {headers.map((h, i) => {
        const cx = x + colW.slice(0, i).reduce((a, b) => a + b, 0);
        return (
          <g key={h}>
            {i > 0 && <line x1={cx} y1={y} x2={cx} y2={y + rh} stroke={c} strokeWidth={0.5} />}
            <text x={cx + colW[i] / 2} y={y + 12} fontSize="8" textAnchor="middle" fill={c} fontWeight="bold">{h}</text>
          </g>
        );
      })}
      {/* data rows */}
      {rows.map((row, ri) => {
        const ry = y + (ri + 1) * rh;
        const vals = [row.rev, row.date, row.description, row.by];
        return (
          <g key={ri}>
            <rect x={x} y={ry} width={totalW} height={rh} fill={ri % 2 === 0 ? "white" : "#f8faff"} stroke={c} strokeWidth={0.5} />
            {vals.map((v, i) => {
              const cx = x + colW.slice(0, i).reduce((a, b) => a + b, 0);
              return (
                <g key={i}>
                  {i > 0 && <line x1={cx} y1={ry} x2={cx} y2={ry + rh} stroke={c} strokeWidth={0.5} />}
                  <text x={cx + colW[i] / 2} y={ry + 12} fontSize="8" textAnchor="middle" fill={c}>{v}</text>
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

// ─── Full Engineering Sheet ───────────────────────────────────────────────────

function EngineeringSheet({
  title,
  revisions,
  scale,
  gdtAnnotations,
  datumLabels,
}: {
  title: TitleBlock;
  revisions: RevisionRow[];
  scale: string;
  gdtAnnotations: GdtAnnotation[];
  datumLabels: DatumLabel[];
}) {
  const W = 841, H = 594;
  const margin = 10, frame = 20;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ background: "white" }} fontFamily="Arial, sans-serif">
      {/* Sheet outer border */}
      <rect x={margin} y={margin} width={W - 2 * margin} height={H - 2 * margin}
        fill="white" stroke="#1e3a5f" strokeWidth={1.5} />
      {/* Inner drawing frame */}
      <rect x={margin + frame} y={margin + frame}
        width={W - 2 * (margin + frame)} height={H - 2 * (margin + frame) - 125}
        fill="none" stroke="#1e3a5f" strokeWidth={2} />

      {/* Centering ticks */}
      <line x1={W / 2} y1={margin} x2={W / 2} y2={margin + 8} stroke="#1e3a5f" strokeWidth={0.8} />
      <line x1={W / 2} y1={H - margin} x2={W / 2} y2={H - margin - 8} stroke="#1e3a5f" strokeWidth={0.8} />
      <line x1={margin} y1={H / 2} x2={margin + 8} y2={H / 2} stroke="#1e3a5f" strokeWidth={0.8} />
      <line x1={W - margin} y1={H / 2} x2={W - margin - 8} y2={H / 2} stroke="#1e3a5f" strokeWidth={0.8} />

      {/* Zone labels */}
      {["A", "B", "C", "D"].map((z, i) => (
        <g key={z}>
          <text x={margin + 5} y={margin + frame + 15 + i * 90} fontSize="8" fill="#9ca3af">{z}</text>
          <text x={W - margin - 5} y={margin + frame + 15 + i * 90} fontSize="8" fill="#9ca3af" textAnchor="end">{z}</text>
        </g>
      ))}
      {[1, 2, 3, 4, 5, 6, 7].map((n, i) => (
        <text key={n} x={margin + frame + 15 + i * 100} y={margin + 9} fontSize="8" fill="#9ca3af" textAnchor="middle">{n}</text>
      ))}

      {/* Title block */}
      <TitleBlockSVG t={title} scale={scale} />

      {/* Revision table */}
      <RevisionTableSVG rows={revisions} />

      {/* ── FRONT VIEW ── */}
      <FrontView ox={70} oy={65} />

      {/* ── TOP VIEW ── */}
      <TopView ox={70} oy={290} />

      {/* ── RIGHT SIDE VIEW ── */}
      <RightView ox={310} oy={65} />

      {/* ── Isometric sketch ── */}
      <g transform="translate(450,240)" opacity={0.65}>
        <polygon points="70,0 140,35 140,115 70,150 0,115 0,35"
          fill="#dbeafe" stroke="#1e3a5f" strokeWidth="1.2" />
        <line x1={70} y1={0} x2={70} y2={150} stroke="#1e3a5f" strokeWidth={0.6} strokeDasharray="5,3" />
        <line x1={0} y1={75} x2={140} y2={75} stroke="#1e3a5f" strokeWidth={0.6} strokeDasharray="5,3" />
        <text x={70} y={170} fontSize="9" textAnchor="middle" fill="#1e3a5f" fontWeight="bold">ISOMETRIC</text>
      </g>

      {/* ── ISO projection symbol ── */}
      <g transform="translate(42,488)">
        <circle cx={0} cy={0} r={14} fill="none" stroke="#1e3a5f" strokeWidth={0.8} />
        <polygon points="-12,-5 -4,-8 -4,8 -12,5" fill="#1e3a5f" />
        <circle cx={7} cy={0} r={5} fill="none" stroke="#1e3a5f" strokeWidth={0.8} />
        <text x={0} y={20} fontSize="7" textAnchor="middle" fill="#1e3a5f">ISO E</text>
      </g>

      {/* ── GD&T Annotations ── */}
      {gdtAnnotations.map(a => (
        <FeatureControlFrame key={a.id} annotation={a} />
      ))}

      {/* ── Datum Labels ── */}
      {datumLabels.map(d => (
        <DatumTriangle key={d.id} datum={d} />
      ))}

      {/* ── General notes ── */}
      <g transform="translate(70,465)">
        <text fontSize="8" fill="#1e3a5f" fontWeight="bold" y={0}>GENERAL NOTES:</text>
        {[
          "1. ALL DIMENSIONS IN MILLIMETERS UNLESS OTHERWISE STATED.",
          "2. TOLERANCES: LINEAR ±0.10mm  ANGULAR ±0.5°",
          "3. SURFACE FINISH: Ra 1.6µm ON ALL MATING SURFACES",
          "4. BREAK ALL SHARP EDGES 0.5 × 45° UNLESS NOTED",
          "5. DO NOT SCALE DRAWING",
        ].map((note, i) => (
          <text key={i} y={11 + i * 11} fontSize="7.5" fill="#374151">{note}</text>
        ))}
      </g>
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ── Equipment Template Renderer ─────────────────────────────────────────────
const TEMPLATE_COMPONENTS: Record<EquipmentTemplateId, React.FC<{ params?: Record<string, unknown> }>> = {
  thermal_cycling_chamber: ThermalCyclingChamber as React.FC<{ params?: Record<string, unknown> }>,
  iec_uv_conditioning_chamber: UVConditioningChamber as React.FC<{ params?: Record<string, unknown> }>,
  humidity_freeze_chamber: HumidityFreezeChamber as React.FC<{ params?: Record<string, unknown> }>,
  salt_mist_chamber: SaltMistChamber as React.FC<{ params?: Record<string, unknown> }>,
  mechanical_load_test: MechanicalLoadFrame as React.FC<{ params?: Record<string, unknown> }>,
  solar_simulator: SolarSimulator as React.FC<{ params?: Record<string, unknown> }>,
  ignitability_chamber: IgnitabilityChamber as React.FC<{ params?: Record<string, unknown> }>,
  chiller_unit: ChillerUnit as React.FC<{ params?: Record<string, unknown> }>,
};

// Parametric dimension definitions per template
const TEMPLATE_DIMENSIONS: Record<string, { key: string; label: string; min: number; max: number; step: number; default: number }[]> = {
  thermal_cycling_chamber: [
    { key: "chamberWidth", label: "Width (mm)", min: 800, max: 3000, step: 50, default: 1500 },
    { key: "chamberHeight", label: "Height (mm)", min: 1200, max: 3000, step: 50, default: 2200 },
    { key: "chamberDepth", label: "Depth (mm)", min: 600, max: 2000, step: 50, default: 1200 },
    { key: "shelfCount", label: "Shelves", min: 1, max: 8, step: 1, default: 3 },
  ],
  iec_uv_conditioning_chamber: [
    { key: "chamberWidth", label: "Width (mm)", min: 800, max: 3000, step: 50, default: 1800 },
    { key: "chamberHeight", label: "Height (mm)", min: 800, max: 2500, step: 50, default: 1600 },
    { key: "lampCount", label: "UV Lamps", min: 4, max: 16, step: 1, default: 8 },
  ],
  humidity_freeze_chamber: [
    { key: "chamberWidth", label: "Width (mm)", min: 800, max: 3000, step: 50, default: 1800 },
    { key: "chamberHeight", label: "Height (mm)", min: 1200, max: 3000, step: 50, default: 2200 },
    { key: "humidityMax", label: "Max RH (%)", min: 50, max: 98, step: 1, default: 85 },
  ],
  salt_mist_chamber: [
    { key: "chamberWidth", label: "Width (mm)", min: 800, max: 3000, step: 50, default: 2000 },
    { key: "chamberHeight", label: "Height (mm)", min: 800, max: 2500, step: 50, default: 1800 },
    { key: "nozzleCount", label: "Nozzles", min: 2, max: 12, step: 1, default: 6 },
  ],
  mechanical_load_test: [
    { key: "frameWidth", label: "Frame W (mm)", min: 1000, max: 2500, step: 50, default: 1600 },
    { key: "frameHeight", label: "Frame H (mm)", min: 1500, max: 3000, step: 50, default: 2200 },
    { key: "maxLoadFront", label: "Front Load (Pa)", min: 1000, max: 8000, step: 100, default: 5400 },
    { key: "maxLoadRear", label: "Rear Load (Pa)", min: 1000, max: 5000, step: 100, default: 2400 },
  ],
  solar_simulator: [
    { key: "testAreaW", label: "Test Area W (mm)", min: 500, max: 4000, step: 100, default: 2000 },
    { key: "testAreaH", label: "Test Area H (mm)", min: 500, max: 4000, step: 100, default: 2000 },
    { key: "lampRows", label: "Lamp Rows", min: 2, max: 8, step: 1, default: 4 },
    { key: "lampCols", label: "Lamp Cols", min: 2, max: 8, step: 1, default: 4 },
    { key: "irradiance", label: "Irradiance (W/m²)", min: 200, max: 1500, step: 50, default: 1000 },
  ],
  ignitability_chamber: [
    { key: "chimneyWidth", label: "Chimney W (mm)", min: 500, max: 1500, step: 50, default: 900 },
    { key: "chimneyHeight", label: "Chimney H (mm)", min: 1500, max: 3500, step: 50, default: 2400 },
    { key: "windowDiameter", label: "Window Ø (mm)", min: 300, max: 800, step: 50, default: 600 },
  ],
  chiller_unit: [
    { key: "unitWidth", label: "Width (mm)", min: 1000, max: 3500, step: 50, default: 2200 },
    { key: "unitHeight", label: "Height (mm)", min: 1000, max: 2500, step: 50, default: 1800 },
    { key: "coolingCapacity", label: "Capacity (kW)", min: 20, max: 200, step: 10, default: 80 },
    { key: "fanCount", label: "Fans", min: 2, max: 12, step: 1, default: 6 },
  ],
};

// ─── Presets per template ─────────────────────────────────────────────────────
const TEMPLATE_PRESETS: Record<string, { label: string; values: Record<string, number> }[]> = {
  thermal_cycling_chamber: [
    { label: "Small (Lab)", values: { chamberWidth: 1000, chamberHeight: 1600, chamberDepth: 800, shelfCount: 2 } },
    { label: "Medium (Production)", values: { chamberWidth: 1500, chamberHeight: 2200, chamberDepth: 1200, shelfCount: 3 } },
    { label: "Large (Utility)", values: { chamberWidth: 2500, chamberHeight: 2800, chamberDepth: 1800, shelfCount: 6 } },
  ],
  iec_uv_conditioning_chamber: [
    { label: "Small (Lab)", values: { chamberWidth: 1000, chamberHeight: 1000, lampCount: 4 } },
    { label: "Medium (Production)", values: { chamberWidth: 1800, chamberHeight: 1600, lampCount: 8 } },
    { label: "Large (Utility)", values: { chamberWidth: 2800, chamberHeight: 2200, lampCount: 14 } },
  ],
  humidity_freeze_chamber: [
    { label: "Small (Lab)", values: { chamberWidth: 1000, chamberHeight: 1400, humidityMax: 85 } },
    { label: "Medium (Production)", values: { chamberWidth: 1800, chamberHeight: 2200, humidityMax: 85 } },
    { label: "Large (Utility)", values: { chamberWidth: 2800, chamberHeight: 2800, humidityMax: 95 } },
  ],
  salt_mist_chamber: [
    { label: "Small (Lab)", values: { chamberWidth: 1000, chamberHeight: 1000, nozzleCount: 3 } },
    { label: "Medium (Production)", values: { chamberWidth: 2000, chamberHeight: 1800, nozzleCount: 6 } },
    { label: "Large (Utility)", values: { chamberWidth: 2800, chamberHeight: 2400, nozzleCount: 10 } },
  ],
  mechanical_load_test: [
    { label: "Small (Lab)", values: { frameWidth: 1200, frameHeight: 1800, maxLoadFront: 2400, maxLoadRear: 1200 } },
    { label: "Medium (Production)", values: { frameWidth: 1600, frameHeight: 2200, maxLoadFront: 5400, maxLoadRear: 2400 } },
    { label: "Large (Utility)", values: { frameWidth: 2200, frameHeight: 2800, maxLoadFront: 7000, maxLoadRear: 4000 } },
  ],
  solar_simulator: [
    { label: "Small (Lab)", values: { testAreaW: 1000, testAreaH: 1000, lampRows: 2, lampCols: 2, irradiance: 1000 } },
    { label: "Medium (Production)", values: { testAreaW: 2000, testAreaH: 2000, lampRows: 4, lampCols: 4, irradiance: 1000 } },
    { label: "Large (Utility)", values: { testAreaW: 3500, testAreaH: 3500, lampRows: 6, lampCols: 6, irradiance: 1200 } },
  ],
  ignitability_chamber: [
    { label: "Small (Lab)", values: { chimneyWidth: 600, chimneyHeight: 1800, windowDiameter: 400 } },
    { label: "Medium (Production)", values: { chimneyWidth: 900, chimneyHeight: 2400, windowDiameter: 600 } },
    { label: "Large (Utility)", values: { chimneyWidth: 1300, chimneyHeight: 3200, windowDiameter: 750 } },
  ],
  chiller_unit: [
    { label: "Small (Lab)", values: { unitWidth: 1200, unitHeight: 1200, coolingCapacity: 30, fanCount: 2 } },
    { label: "Medium (Production)", values: { unitWidth: 2200, unitHeight: 1800, coolingCapacity: 80, fanCount: 6 } },
    { label: "Large (Utility)", values: { unitWidth: 3200, unitHeight: 2200, coolingCapacity: 180, fanCount: 10 } },
  ],
};

export default function DrawingsPage() {
  // ── Template detection via URL params (no useSearchParams = no Suspense needed)
  const [iecData, setIecData] = useState<IECDrawingData | null>(null);
  const [equipmentTemplate, setEquipmentTemplate] = useState<EquipmentTemplateId | null>(null);
  const [templateParams, setTemplateParams] = useState<Record<string, number>>({});
  const [viewToggles, setViewToggles] = useState({ front: true, side: true, detail: true, spec: true });
  const [dimPanelOpen, setDimPanelOpen] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  // Tab state for default view: "equipment" (primary) or "bracket" (legacy mounting bracket)
  const [defaultTab, setDefaultTab] = useState<"equipment" | "bracket">("equipment");

  // Listen for custom events from command palette
  useEffect(() => {
    const handleExport = () => {
      const svgEl = drawingRef.current?.querySelector("svg");
      if (!svgEl) return;
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("width", "1100");
      clone.setAttribute("height", String(Math.round(1100 * 594 / 841)));
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" });
      const a = document.createElement("a");
      a.download = `ShilpaSutra_${equipmentTemplate || "drawing"}.svg`;
      a.href = URL.createObjectURL(blob);
      a.click();
      URL.revokeObjectURL(a.href);
      showToast("SVG exported successfully");
    };
    const handleToggleDims = () => setDimPanelOpen(prev => !prev);
    const handleCompare = () => setCompareMode(true);

    document.addEventListener("shilpasutra:export", handleExport);
    document.addEventListener("shilpasutra:toggle-dims", handleToggleDims);
    document.addEventListener("shilpasutra:compare", handleCompare);
    return () => {
      document.removeEventListener("shilpasutra:export", handleExport);
      document.removeEventListener("shilpasutra:toggle-dims", handleToggleDims);
      document.removeEventListener("shilpasutra:compare", handleCompare);
    };
  }, [equipmentTemplate]);

  // Track recently opened templates and explored progress
  useEffect(() => {
    if (equipmentTemplate) {
      const tmeta = EQUIPMENT_TEMPLATES[equipmentTemplate];
      addRecentDrawing(equipmentTemplate, tmeta.name, tmeta.standard, window.location.href);
      // Track exploration progress
      try {
        const stored = localStorage.getItem("shilpasutra_explored");
        const explored: string[] = stored ? JSON.parse(stored) : [];
        if (!explored.includes(equipmentTemplate)) {
          explored.push(equipmentTemplate);
          localStorage.setItem("shilpasutra_explored", JSON.stringify(explored));
        }
      } catch {}
    }
  }, [equipmentTemplate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tid = params.get("template");
    const editMode = params.get("edit");
    if (tid) {
      // Check if it's an equipment template first
      if (tid in EQUIPMENT_TEMPLATES) {
        setEquipmentTemplate(tid as EquipmentTemplateId);

        // Read all dimension params from URL with parseInt + fallback to template defaults
        const dims = TEMPLATE_DIMENSIONS[tid] || [];
        const urlParams: Record<string, number> = {};

        // Read cabinetWidth/Height/Depth/shelves explicitly
        for (const paramKey of ["cabinetWidth", "cabinetHeight", "cabinetDepth", "shelves"]) {
          const raw = params.get(paramKey);
          if (raw) {
            const parsed = parseInt(raw, 10);
            if (!isNaN(parsed)) urlParams[paramKey] = parsed;
          }
        }

        // Read any dimension keys defined for this template
        for (const dim of dims) {
          const raw = params.get(dim.key);
          if (raw) {
            const parsed = parseInt(raw, 10);
            urlParams[dim.key] = !isNaN(parsed) ? parsed : dim.default;
          }
        }

        // Also read any other numeric params from the URL
        for (const [key, val] of params.entries()) {
          if (key !== "template" && key !== "edit" && !isNaN(Number(val)) && val !== "" && !(key in urlParams)) {
            urlParams[key] = parseInt(val, 10) || Number(val);
          }
        }

        if (Object.keys(urlParams).length > 0) {
          setTemplateParams(urlParams);
        }

        // If edit=true, open dimension panel by default (handled by existing UI)
        if (editMode === "true") {
          setEditOpen(true);
        }
      } else {
        setIecData(getIECDrawingData(tid));
      }
    }
  }, []);

  const [title, setTitle] = useState<TitleBlock>(defaultTitle);
  const [revisions, setRevisions] = useState<RevisionRow[]>(defaultRevisions);
  const [scale, setScale] = useState("1:1");
  const [editOpen, setEditOpen] = useState(false);
  const [activeGdtSymbol, setActiveGdtSymbol] = useState<string | null>(null);
  const [gdtAnnotations, setGdtAnnotations] = useState<GdtAnnotation[]>([
    { id: "gdt1", symbol: "flatness", label: "Flatness", tolerance: "0.05", datum: "", x: 180, y: 180 },
    { id: "gdt2", symbol: "position", label: "Position", tolerance: "0.10", datum: "A", x: 350, y: 150 },
  ]);
  const [datumLabels, setDatumLabels] = useState<DatumLabel[]>([
    { id: "d1", letter: "A", x: 100, y: 220 },
  ]);
  const [gdtTab, setGdtTab] = useState<"symbols" | "datums">("symbols");
  const [newTolerance, setNewTolerance] = useState("0.05");
  const [newDatum, setNewDatum] = useState("");
  const [newDatumLetter, setNewDatumLetter] = useState("B");

  const updateTitle = (key: keyof TitleBlock, value: string) =>
    setTitle((prev) => ({ ...prev, [key]: value }));

  const addGdtAnnotation = (symbolId: string) => {
    const sym = gdtToolbar.find(t => t.id === symbolId);
    if (!sym) return;
    setGdtAnnotations(prev => [...prev, {
      id: `gdt_${Date.now()}`,
      symbol: symbolId,
      label: sym.label,
      tolerance: newTolerance,
      datum: newDatum,
      x: 120 + prev.length * 20,
      y: 200 + prev.length * 30,
    }]);
    setActiveGdtSymbol(null);
  };

  const addDatumLabel = () => {
    setDatumLabels(prev => [...prev, {
      id: `datum_${Date.now()}`,
      letter: newDatumLetter,
      x: 150 + prev.length * 40,
      y: 300,
    }]);
    setNewDatumLetter(l => String.fromCharCode(l.charCodeAt(0) + 1));
  };

  const removeGdtAnnotation = (id: string) =>
    setGdtAnnotations(prev => prev.filter(a => a.id !== id));

  const removeDatumLabel = (id: string) =>
    setDatumLabels(prev => prev.filter(d => d.id !== id));

  const [exporting, setExporting] = useState<string | null>(null);
  const drawingRef = useRef<HTMLDivElement>(null);

  const getFilename = (ext: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const safeName = title.partName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    return `ShilpaSutra_Drawing_${safeName}_${today}.${ext}`;
  };

  const captureCanvas = async (): Promise<HTMLCanvasElement> => {
    const svgEl = drawingRef.current?.querySelector("svg");
    if (!svgEl) throw new Error("SVG element not found");
    // Use layout width/height; fall back to A3 landscape proportions if 0
    const width = svgEl.clientWidth || 1100;
    const height = svgEl.clientHeight || Math.round(1100 * 594 / 841);
    // Clone and set explicit pixel dimensions so browsers size the image correctly
    const svgClone = svgEl.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute("width", String(width));
    svgClone.setAttribute("height", String(height));
    svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = 3;
        const cvs = document.createElement("canvas");
        cvs.width = width * scale;
        cvs.height = height * scale;
        const ctx = cvs.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, cvs.width, cvs.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(cvs);
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const exportPDF = async () => {
    if (!drawingRef.current) return;
    setExporting("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const canvas = await captureCanvas();
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgH = pw * ratio;
      const yOff = imgH < ph ? (ph - imgH) / 2 : 0;
      pdf.addImage(imgData, "JPEG", 0, yOff, pw, Math.min(imgH, ph));
      pdf.save(getFilename("pdf"));
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(null);
    }
  };

  const exportDOCX = async () => {
    if (!drawingRef.current) return;
    setExporting("docx");
    try {
      const { Document, Paragraph, TextRun, ImageRun, Packer } = await import("docx");
      const { saveAs } = await import("file-saver");
      const canvas = await captureCanvas();
      const imgData = canvas.toDataURL("image/png");
      const base64 = imgData.replace(/^data:image\/png;base64,/, "");
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      const titleRows = [
        ["Part Name", title.partName],
        ["Part No", title.partNo],
        ["Material", title.material],
        ["Scale", scale],
        ["Revision", title.revision],
        ["Drawn By", title.drawnBy],
        ["Date", title.date],
        ["Checked By", title.checkedBy],
        ["Approved By", title.approvedBy],
        ["Sheet", title.sheet],
        ["Project", title.project],
        ["Company", title.company],
      ];

      const generalNotes = [
        "1. ALL DIMENSIONS IN MILLIMETERS UNLESS OTHERWISE STATED.",
        "2. TOLERANCES: LINEAR ±0.10mm  ANGULAR ±0.5°",
        "3. SURFACE FINISH: Ra 1.6µm ON ALL MATING SURFACES",
        "4. BREAK ALL SHARP EDGES 0.5 × 45° UNLESS NOTED",
        "5. DO NOT SCALE DRAWING",
      ];

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ children: [new TextRun({ text: "ShilpaSutra Engineering Drawing", bold: true, size: 32 })] }),
            new Paragraph({ children: [new TextRun({ text: `${title.partName}  |  ${title.partNo}  |  Rev ${title.revision}`, size: 22 })] }),
            new Paragraph({ children: [] }),
            new Paragraph({
              children: [new ImageRun({ data: bytes, transformation: { width: 600, height: Math.round(600 * canvas.height / canvas.width) }, type: "png" })],
            }),
            new Paragraph({ children: [] }),
            new Paragraph({ children: [new TextRun({ text: "TITLE BLOCK INFORMATION", bold: true, size: 24 })] }),
            ...titleRows.map(([k, v]) => new Paragraph({
              children: [new TextRun({ text: `${k}: `, bold: true }), new TextRun({ text: v })],
            })),
            new Paragraph({ children: [] }),
            new Paragraph({ children: [new TextRun({ text: "REVISION HISTORY", bold: true, size: 24 })] }),
            ...revisions.map(r => new Paragraph({
              children: [
                new TextRun({ text: `Rev ${r.rev} (${r.date}): `, bold: true }),
                new TextRun({ text: r.description || "—" }),
                ...(r.by ? [new TextRun({ text: `  — ${r.by}` })] : []),
              ],
            })),
            new Paragraph({ children: [] }),
            new Paragraph({ children: [new TextRun({ text: "GD&T ANNOTATIONS", bold: true, size: 24 })] }),
            ...gdtAnnotations.map(a => {
              const sym = gdtToolbar.find(t => t.id === a.symbol);
              return new Paragraph({
                children: [new TextRun({ text: `${sym?.symbol || a.symbol}  ${a.label}:  ⌀${a.tolerance}${a.datum ? `  | Datum ${a.datum}` : ""}` })],
              });
            }),
            new Paragraph({ children: [] }),
            new Paragraph({ children: [new TextRun({ text: "GENERAL NOTES", bold: true, size: 24 })] }),
            ...generalNotes.map(note => new Paragraph({ children: [new TextRun({ text: note })] })),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, getFilename("docx"));
    } catch (err) {
      console.error("DOCX export failed:", err);
    } finally {
      setExporting(null);
    }
  };

  // ── Equipment template drawing ──
  if (equipmentTemplate) {
    const TemplateComp = TEMPLATE_COMPONENTS[equipmentTemplate];
    const tmeta = EQUIPMENT_TEMPLATES[equipmentTemplate];
    const dims = TEMPLATE_DIMENSIONS[equipmentTemplate] || [];

    const updateParam = (key: string, value: number) => {
      setTemplateParams(prev => {
        const next = { ...prev, [key]: value };
        // Update URL params in real-time
        const url = new URL(window.location.href);
        url.searchParams.set(key, String(value));
        window.history.replaceState({}, "", url.toString());
        return next;
      });
    };

    const handleExportSVG = () => {
      const svgEl = drawingRef.current?.querySelector("svg");
      if (!svgEl) return;
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("width", "1100");
      clone.setAttribute("height", String(Math.round(1100 * 594 / 841)));
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" });
      const a = document.createElement("a"); a.download = `ShilpaSutra_${equipmentTemplate}.svg`;
      a.href = URL.createObjectURL(blob); a.click(); URL.revokeObjectURL(a.href);
      showToast("SVG exported successfully");
    };

    const handleExportPDF = async () => {
      const svgEl = drawingRef.current?.querySelector("svg");
      if (!svgEl) return;
      setExporting("pdf");
      try {
        const { jsPDF } = await import("jspdf");
        const canvas = await captureCanvas();
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, "JPEG", 0, 0, pw, ph);
        pdf.save(`ShilpaSutra_${equipmentTemplate}.pdf`);
        showToast("PDF exported successfully");
      } catch (err) { console.error("PDF export failed:", err); }
      finally { setExporting(null); }
    };

    return (
      <div className="flex h-screen bg-[#0d1117] text-white overflow-hidden">
        {/* Left sidebar - Template selector + dimension editor */}
        <div className="w-64 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
          <div className="px-3 py-2 border-b border-[#21262d]">
            <span className="text-xs font-bold text-[#00D4FF]">Equipment Templates</span>
          </div>

          {/* Template selector */}
          <div className="px-3 py-2 border-b border-[#21262d]">
            <div className="text-[10px] text-slate-400 uppercase mb-1 font-bold">Template</div>
            <select
              value={equipmentTemplate}
              onChange={e => {
                const newId = e.target.value as EquipmentTemplateId;
                setEquipmentTemplate(newId);
                setTemplateParams({});
                const url = new URL(window.location.href);
                url.searchParams.set("template", newId);
                // Clear old dimension params
                for (const key of Array.from(url.searchParams.keys())) {
                  if (key !== "template") url.searchParams.delete(key);
                }
                window.history.replaceState({}, "", url.toString());
              }}
              className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-[10px] text-white"
            >
              {Object.entries(EQUIPMENT_TEMPLATES).map(([id, t]) => (
                <option key={id} value={id}>{t.name}</option>
              ))}
            </select>
            <div className="mt-1 text-[9px] text-slate-500">{tmeta.standard}</div>
            <div className="mt-0.5 text-[9px] text-slate-600">{tmeta.description}</div>
          </div>

          {/* Dimension editor */}
          {dims.length > 0 && (
            <div className="px-3 py-2 border-b border-[#21262d]">
              <div className="text-[10px] text-slate-400 uppercase mb-2 font-bold">Parametric Dimensions</div>
              <div className="space-y-2">
                {dims.map(dim => {
                  const val = templateParams[dim.key] ?? dim.default;
                  return (
                    <div key={dim.key}>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-slate-400">{dim.label}</span>
                        <span className="text-[#00D4FF] font-mono">{val}</span>
                      </div>
                      <input
                        type="range"
                        min={dim.min} max={dim.max} step={dim.step} value={val}
                        onChange={e => updateParam(dim.key, Number(e.target.value))}
                        className="w-full h-1 bg-[#21262d] rounded-lg appearance-none cursor-pointer accent-[#00D4FF]"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* View toggles */}
          <div className="px-3 py-2 border-b border-[#21262d]">
            <div className="text-[10px] text-slate-400 uppercase mb-1 font-bold">View Toggles</div>
            {(["front", "side", "detail", "spec"] as const).map(v => (
              <label key={v} className="flex items-center gap-2 py-0.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={viewToggles[v]}
                  onChange={e => setViewToggles(prev => ({ ...prev, [v]: e.target.checked }))}
                  className="w-3 h-3 rounded accent-[#00D4FF]"
                />
                <span className="text-[10px] text-slate-300 capitalize">{v} view</span>
              </label>
            ))}
          </div>

          {/* Export */}
          <div className="px-3 py-2">
            <div className="text-[10px] text-slate-400 uppercase mb-2 font-bold">Export</div>
            <div className="grid grid-cols-3 gap-1">
              <button onClick={handleExportSVG}
                className="bg-[#21262d] hover:bg-[#2d333b] text-white text-[10px] font-semibold py-1.5 rounded border border-[#30363d]">SVG</button>
              <button onClick={handleExportPDF} disabled={!!exporting}
                className="bg-[#21262d] hover:bg-[#2d333b] disabled:opacity-40 text-white text-[10px] font-semibold py-1.5 rounded border border-[#30363d]">
                {exporting === "pdf" ? "..." : "PDF"}
              </button>
              <button disabled title="DXF export (coming soon)"
                className="bg-[#21262d] text-slate-600 text-[10px] font-semibold py-1.5 rounded border border-[#30363d] cursor-not-allowed">DXF</button>
            </div>
          </div>

          {/* Back button */}
          <div className="px-3 py-2 mt-auto">
            <button onClick={() => { setEquipmentTemplate(null); setTemplateParams({}); }}
              className="w-full text-[10px] text-slate-400 hover:text-white py-1.5 rounded border border-[#21262d] hover:border-[#30363d] transition-colors">
              ← Default Drawing
            </button>
          </div>
        </div>

        {/* Drawing canvas */}
        <div className="flex-1 bg-[#1a1f2e] flex items-center justify-center overflow-auto p-6 relative">
          <div ref={drawingRef} className="shadow-2xl" style={{ width: "min(100%, 1100px)", aspectRatio: "841/594" }}>
            <TemplateComp params={templateParams} />
          </div>

          {/* ── Floating Dimension Customizer Panel (right side) ── */}
          {dims.length > 0 && (
            <div className={`absolute top-4 right-4 z-40 transition-all duration-300 ${dimPanelOpen ? "w-72" : "w-10"}`}>
              {/* Collapse toggle */}
              <button
                onClick={() => setDimPanelOpen(!dimPanelOpen)}
                className="absolute -left-3 top-3 z-50 w-6 h-6 rounded-full bg-[#00D4FF] text-black flex items-center justify-center text-xs font-bold shadow-lg hover:scale-110 transition-transform"
                title={dimPanelOpen ? "Collapse" : "Expand dimensions"}
              >
                {dimPanelOpen ? "›" : "‹"}
              </button>

              {dimPanelOpen && (
                <div className="bg-[#161b22]/95 backdrop-blur-sm border border-[#21262d] rounded-xl shadow-2xl overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-[#21262d] bg-[#0d1117]/60">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-[#00D4FF] uppercase tracking-wider">Dimensions</div>
                      <span className="text-[8px] text-slate-500 font-mono">{tmeta.name}</span>
                    </div>
                  </div>

                  {/* Quick presets */}
                  {TEMPLATE_PRESETS[equipmentTemplate] && (
                    <div className="px-4 py-2 border-b border-[#21262d]">
                      <div className="text-[9px] text-slate-500 uppercase font-bold mb-1.5">Quick Presets</div>
                      <select
                        onChange={e => {
                          const preset = TEMPLATE_PRESETS[equipmentTemplate]?.[Number(e.target.value)];
                          if (preset) {
                            const url = new URL(window.location.href);
                            Object.entries(preset.values).forEach(([k, v]) => {
                              url.searchParams.set(k, String(v));
                            });
                            window.history.replaceState({}, "", url.toString());
                            setTemplateParams(prev => ({ ...prev, ...preset.values }));
                          }
                          e.target.value = "";
                        }}
                        defaultValue=""
                        className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1.5 text-[10px] text-white cursor-pointer"
                      >
                        <option value="" disabled>Select a preset...</option>
                        {TEMPLATE_PRESETS[equipmentTemplate]?.map((p, i) => (
                          <option key={i} value={i}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Dimension sliders with numeric input */}
                  <div className="px-4 py-3 space-y-3 max-h-[50vh] overflow-y-auto">
                    {dims.map(dim => {
                      const val = templateParams[dim.key] ?? dim.default;
                      return (
                        <div key={dim.key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-slate-400 font-medium">{dim.label}</span>
                            <input
                              type="number"
                              min={dim.min} max={dim.max} step={dim.step} value={val}
                              onChange={e => {
                                const v = Number(e.target.value);
                                if (!isNaN(v) && v >= dim.min && v <= dim.max) updateParam(dim.key, v);
                              }}
                              className="w-16 bg-[#0d1117] border border-[#21262d] rounded px-1.5 py-0.5 text-[10px] text-[#00D4FF] font-mono text-right focus:border-[#00D4FF] focus:outline-none"
                            />
                          </div>
                          <input
                            type="range"
                            min={dim.min} max={dim.max} step={dim.step} value={val}
                            onChange={e => updateParam(dim.key, Number(e.target.value))}
                            className="w-full h-1.5 bg-[#21262d] rounded-lg appearance-none cursor-pointer accent-[#00D4FF]"
                          />
                          <div className="flex justify-between text-[8px] text-slate-600 mt-0.5">
                            <span>{dim.min}</span>
                            <span>{dim.max}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mini 3D wireframe preview (CSS 3D) */}
                  <div className="px-4 py-3 border-t border-[#21262d]">
                    <div className="text-[9px] text-slate-500 uppercase font-bold mb-2">3D Preview</div>
                    <div className="flex items-center justify-center h-24" style={{ perspective: "300px" }}>
                      {(() => {
                        const w = dims.find(d => d.key.includes("Width") || d.key.includes("testAreaW") || d.key.includes("frameWidth") || d.key.includes("chimneyWidth") || d.key.includes("unitWidth"));
                        const h = dims.find(d => d.key.includes("Height") || d.key.includes("testAreaH") || d.key.includes("frameHeight") || d.key.includes("chimneyHeight") || d.key.includes("unitHeight"));
                        const dDim = dims.find(d => d.key.includes("Depth"));
                        const wVal = w ? (templateParams[w.key] ?? w.default) : 1500;
                        const hVal = h ? (templateParams[h.key] ?? h.default) : 2000;
                        const dVal = dDim ? (templateParams[dDim.key] ?? dDim.default) : 1000;
                        const maxDim = Math.max(wVal, hVal, dVal);
                        const sw = Math.max(20, (wVal / maxDim) * 70);
                        const sh = Math.max(20, (hVal / maxDim) * 70);
                        const sd = Math.max(8, (dVal / maxDim) * 30);
                        return (
                          <div
                            className="relative"
                            style={{
                              width: sw,
                              height: sh,
                              transformStyle: "preserve-3d",
                              transform: "rotateX(-20deg) rotateY(-30deg)",
                            }}
                          >
                            {/* Front face */}
                            <div className="absolute inset-0 border border-[#00D4FF]/50 bg-[#00D4FF]/5" style={{ transform: `translateZ(${sd / 2}px)` }} />
                            {/* Back face */}
                            <div className="absolute inset-0 border border-[#00D4FF]/20 bg-[#00D4FF]/3" style={{ transform: `translateZ(${-sd / 2}px)` }} />
                            {/* Top face */}
                            <div className="absolute border border-[#00D4FF]/30 bg-[#00D4FF]/5" style={{ width: sw, height: sd, top: 0, left: 0, transformOrigin: "top", transform: `rotateX(90deg) translateZ(0px) translateY(${-sd / 2}px)` }} />
                            {/* Right face */}
                            <div className="absolute border border-[#00D4FF]/30 bg-[#00D4FF]/3" style={{ width: sd, height: sh, top: 0, right: 0, transformOrigin: "right", transform: `rotateY(90deg) translateZ(0px) translateX(${sd / 2}px)` }} />
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="px-4 py-3 border-t border-[#21262d] space-y-1.5">
                    <button
                      onClick={() => {
                        setTemplateParams({});
                        const url = new URL(window.location.href);
                        for (const key of Array.from(url.searchParams.keys())) {
                          if (key !== "template") url.searchParams.delete(key);
                        }
                        window.history.replaceState({}, "", url.toString());
                      }}
                      className="w-full text-[10px] text-slate-400 hover:text-white py-1.5 rounded border border-[#21262d] hover:border-[#30363d] transition-colors"
                    >
                      Reset to Default
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="w-full text-[10px] font-semibold py-1.5 rounded border transition-colors bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/30 hover:bg-[#00D4FF]/20"
                    >
                      {copiedLink ? "Copied!" : "Share Link"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {exporting && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#161b22] border border-[#00D4FF]/60 rounded-lg px-4 py-3 flex items-center gap-3 shadow-2xl">
            <span className="inline-block w-4 h-4 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-white font-medium">Generating {exporting.toUpperCase()}…</span>
          </div>
        )}

        {compareMode && <TemplateCompareMode onClose={() => setCompareMode(false)} />}
      </div>
    );
  }

  // ── IEC template drawing (if URL ?template= matches a known IEC template) ──
  if (iecData) {
    return (
      <div className="flex flex-col h-screen bg-[#0d1117] text-white">
        <div className="flex items-center gap-3 px-4 py-2 bg-[#161b22] border-b border-[#21262d] shrink-0">
          <button onClick={() => setIecData(null)}
            className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded border border-[#21262d] hover:border-[#30363d] transition-colors">
            ← Default Drawing
          </button>
          <span className="text-[12px] font-semibold text-white">{iecData.name}</span>
          <span className="text-[10px] text-slate-500">{iecData.standard}</span>
          <span className="ml-auto text-[10px] text-slate-600">Part No: {iecData.partNo} · Scale: {iecData.scale}</span>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
          <div className="bg-white rounded shadow-xl" style={{ width: "100%", maxWidth: 1100, aspectRatio: "841/594" }}>
            <IECDrawingSheet data={iecData} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* ── Left sidebar ── */}
      <div className="w-60 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
        {/* Tab switcher: Equipment Templates (primary) | Engineering Drawing */}
        <div className="flex border-b border-[#21262d]">
          <button
            onClick={() => setDefaultTab("equipment")}
            className={`flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              defaultTab === "equipment"
                ? "text-[#00D4FF] border-b-2 border-[#00D4FF] bg-[#161b22]"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Equipment
          </button>
          <button
            onClick={() => setDefaultTab("bracket")}
            className={`flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              defaultTab === "bracket"
                ? "text-[#00D4FF] border-b-2 border-[#00D4FF] bg-[#161b22]"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Drawing
          </button>
        </div>

        {defaultTab === "equipment" ? (
          <>
            {/* Equipment Templates - PRIMARY */}
            <div className="px-3 py-2 border-b border-[#21262d]">
              <div className="text-[10px] text-slate-400 uppercase mb-2 font-bold tracking-wider">IEC PV Test Equipment</div>
              <div className="space-y-1">
                {Object.entries(EQUIPMENT_TEMPLATES).map(([id, t]) => (
                  <button
                    key={id}
                    onClick={() => {
                      setEquipmentTemplate(id as EquipmentTemplateId);
                      setTemplateParams({});
                      const url = new URL(window.location.href);
                      url.searchParams.set("template", id);
                      window.history.replaceState({}, "", url.toString());
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-[9px] bg-[#0d1117] hover:bg-[#21262d] border border-[#21262d] hover:border-[#00D4FF]/40 transition-colors"
                  >
                    <div className="text-slate-200 font-medium">{t.name}</div>
                    <div className="text-slate-500 text-[8px]">{t.standard}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-3 py-3 text-center">
              <div className="text-[9px] text-slate-600 mb-2">Select a template above to view its engineering drawing</div>
              <a href="/library" className="text-[10px] text-[#00D4FF] hover:text-white transition-colors font-medium">
                Browse Full Catalog →
              </a>
            </div>
          </>
        ) : (
          <>
            {/* Legacy Mounting Bracket Drawing sidebar */}
            {/* GD&T Toolbar */}
            <div className="px-3 py-2 border-b border-[#21262d]">
              <div className="text-[10px] text-slate-400 uppercase mb-1 font-bold">GD&T Annotations</div>
              <div className="flex gap-1 mb-1">
                <button onClick={() => setGdtTab("symbols")}
                  className={`text-[9px] px-2 py-0.5 rounded ${gdtTab === "symbols" ? "bg-[#00D4FF] text-black" : "bg-[#21262d] text-slate-400"}`}>
                  Symbols
                </button>
                <button onClick={() => setGdtTab("datums")}
                  className={`text-[9px] px-2 py-0.5 rounded ${gdtTab === "datums" ? "bg-[#00D4FF] text-black" : "bg-[#21262d] text-slate-400"}`}>
                  Datums
                </button>
              </div>

              {gdtTab === "symbols" && (
                <>
                  <div className="grid grid-cols-5 gap-0.5 mb-2">
                    {gdtToolbar.map(tool => {
                      const Sym = GdtSymbols[tool.id];
                      return (
                        <button
                          key={tool.id}
                          onClick={() => setActiveGdtSymbol(activeGdtSymbol === tool.id ? null : tool.id)}
                          title={tool.label}
                          className={`p-1 rounded flex items-center justify-center text-xs border ${
                            activeGdtSymbol === tool.id
                              ? "bg-[#00D4FF]/20 border-[#00D4FF] text-[#00D4FF]"
                              : "bg-[#0d1117] border-[#21262d] text-slate-300 hover:border-[#00D4FF]"
                          }`}
                        >
                          {Sym ? <Sym /> : <span className="text-xs">{tool.symbol}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {activeGdtSymbol && (
                    <div className="bg-[#0d1117] rounded p-2 border border-[#00D4FF]/40 space-y-1.5 mb-2">
                      <div className="text-[9px] text-[#00D4FF] font-bold uppercase">
                        {gdtToolbar.find(t => t.id === activeGdtSymbol)?.label}
                      </div>
                      <div>
                        <div className="text-[8px] text-slate-500">Tolerance</div>
                        <input value={newTolerance} onChange={e => setNewTolerance(e.target.value)}
                          className="w-full bg-[#161b22] border border-[#21262d] rounded px-1.5 py-0.5 text-[9px] text-white" />
                      </div>
                      <div>
                        <div className="text-[8px] text-slate-500">Datum Ref.</div>
                        <input value={newDatum} onChange={e => setNewDatum(e.target.value)} placeholder="A, B, C..."
                          className="w-full bg-[#161b22] border border-[#21262d] rounded px-1.5 py-0.5 text-[9px] text-white" />
                      </div>
                      <button onClick={() => addGdtAnnotation(activeGdtSymbol)}
                        className="w-full bg-[#00D4FF] text-black text-[9px] font-bold py-1 rounded">
                        + Place Annotation
                      </button>
                    </div>
                  )}

                  <div className="space-y-0.5 max-h-32 overflow-y-auto">
                    {gdtAnnotations.map(a => {
                      const sym = gdtToolbar.find(t => t.id === a.symbol);
                      return (
                        <div key={a.id} className="flex items-center justify-between bg-[#0d1117] rounded px-2 py-0.5 border border-[#21262d]">
                          <span className="text-[9px] text-slate-300">{sym?.symbol} {a.label} ⌀{a.tolerance}{a.datum ? ` |${a.datum}|` : ""}</span>
                          <button onClick={() => removeGdtAnnotation(a.id)} className="text-slate-600 hover:text-red-400 text-[9px]">×</button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {gdtTab === "datums" && (
                <>
                  <div className="flex items-center gap-1 mb-1">
                    <div className="text-[8px] text-slate-500">Letter:</div>
                    <input value={newDatumLetter} onChange={e => setNewDatumLetter(e.target.value.toUpperCase())}
                      maxLength={2}
                      className="w-10 bg-[#0d1117] border border-[#21262d] rounded px-1 py-0.5 text-[9px] text-white text-center" />
                    <button onClick={addDatumLabel}
                      className="flex-1 bg-[#21262d] hover:bg-[#00D4FF] hover:text-black text-[9px] py-0.5 rounded text-white">
                      + Add Datum ▲
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {datumLabels.map(d => (
                      <div key={d.id} className="flex items-center justify-between bg-[#0d1117] rounded px-2 py-0.5 border border-[#21262d]">
                        <span className="text-[9px] text-slate-300">▲ Datum {d.letter}</span>
                        <button onClick={() => removeDatumLabel(d.id)} className="text-slate-600 hover:text-red-400 text-[9px]">×</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Scale */}
            <div className="px-3 py-2 border-b border-[#21262d]">
              <div className="text-[10px] text-slate-400 uppercase mb-1">Scale</div>
              <select
                value={scale}
                onChange={(e) => setScale(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white"
              >
                {SCALES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Title block editor */}
            <div className="px-3 py-2 border-b border-[#21262d]">
              <button
                onClick={() => setEditOpen(!editOpen)}
                className="text-[10px] text-[#00D4FF] hover:text-white w-full text-left font-bold uppercase"
              >
                {editOpen ? "▾" : "▸"} Title Block
              </button>
              {editOpen && (
                <div className="mt-2 space-y-1.5">
                  {(Object.keys(title) as (keyof TitleBlock)[]).map((k) => (
                    <div key={k}>
                      <div className="text-[9px] text-slate-500 capitalize">{k.replace(/([A-Z])/g, " $1")}</div>
                      <input
                        value={title[k]}
                        onChange={(e) => updateTitle(k, e.target.value)}
                        className="w-full bg-[#0d1117] border border-[#21262d] rounded px-1.5 py-0.5 text-[10px] text-white"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revisions */}
            <div className="px-3 py-2 border-b border-[#21262d]">
              <div className="text-[10px] text-slate-400 uppercase mb-1">Revisions</div>
              {revisions.map((r, i) => (
                <div key={i} className="mb-2 p-1.5 bg-[#0d1117] rounded border border-[#21262d]">
                  <div className="grid grid-cols-2 gap-1 mb-1">
                    <div>
                      <div className="text-[8px] text-slate-500">Rev</div>
                      <input value={r.rev}
                        onChange={(e) => setRevisions((prev) => prev.map((row, idx) => idx === i ? { ...row, rev: e.target.value } : row))}
                        className="w-full bg-[#161b22] border border-[#21262d] rounded px-1 py-0.5 text-[9px] text-white" />
                    </div>
                    <div>
                      <div className="text-[8px] text-slate-500">Date</div>
                      <input value={r.date}
                        onChange={(e) => setRevisions((prev) => prev.map((row, idx) => idx === i ? { ...row, date: e.target.value } : row))}
                        className="w-full bg-[#161b22] border border-[#21262d] rounded px-1 py-0.5 text-[9px] text-white" />
                    </div>
                  </div>
                  <div className="text-[8px] text-slate-500">Description</div>
                  <input value={r.description}
                    onChange={(e) => setRevisions((prev) => prev.map((row, idx) => idx === i ? { ...row, description: e.target.value } : row))}
                    className="w-full bg-[#161b22] border border-[#21262d] rounded px-1 py-0.5 text-[9px] text-white" />
                </div>
              ))}
            </div>

            {/* Export */}
            <div className="px-3 py-2">
              <div className="text-[10px] text-slate-400 uppercase mb-2 font-bold tracking-wider">Export</div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => {
                    const svg = drawingRef.current?.querySelector("svg");
                    if (!svg) return;
                    const clone = svg.cloneNode(true) as SVGSVGElement;
                    clone.setAttribute("width", String(svg.clientWidth || 1100));
                    clone.setAttribute("height", String(svg.clientHeight || Math.round(1100 * 594 / 841)));
                    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
                    const svgData = new XMLSerializer().serializeToString(clone);
                    const blob = new Blob([svgData], { type: "image/svg+xml" });
                    const a = document.createElement("a");
                    a.download = getFilename("svg");
                    a.href = URL.createObjectURL(blob);
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                  disabled={!!exporting}
                  className="bg-[#21262d] hover:bg-[#2d333b] disabled:opacity-40 text-white text-[10px] font-semibold py-1.5 px-1 rounded border border-[#30363d] flex flex-col items-center justify-center gap-0.5 transition-colors"
                  title="Export SVG"
                >
                  SVG
                </button>
                <button
                  onClick={exportPDF}
                  disabled={!!exporting}
                  className="bg-[#21262d] hover:bg-[#2d333b] disabled:opacity-40 text-white text-[10px] font-semibold py-1.5 px-1 rounded border border-[#30363d] flex flex-col items-center justify-center gap-0.5 transition-colors"
                  title="Export PDF"
                >
                  {exporting === "pdf" ? "..." : "PDF"}
                </button>
                <button
                  onClick={exportDOCX}
                  disabled={!!exporting}
                  className="bg-[#21262d] hover:bg-[#2d333b] disabled:opacity-40 text-white text-[10px] font-semibold py-1.5 px-1 rounded border border-[#30363d] flex flex-col items-center justify-center gap-0.5 transition-colors"
                  title="Export DOCX"
                >
                  {exporting === "docx" ? "..." : "DOCX"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Main content area ── */}
      <div className="flex-1 bg-[#1a1f2e] flex items-center justify-center overflow-auto p-6">
        {defaultTab === "equipment" ? (
          <div className="flex flex-col items-center justify-center gap-6 max-w-3xl w-full">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2">IEC PV Test Equipment</h1>
              <p className="text-sm text-slate-400">Select an equipment template from the sidebar to view its engineering drawing, or browse the full catalog.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
              {Object.entries(EQUIPMENT_TEMPLATES).map(([id, t]) => (
                <button
                  key={id}
                  onClick={() => {
                    setEquipmentTemplate(id as EquipmentTemplateId);
                    setTemplateParams({});
                    const url = new URL(window.location.href);
                    url.searchParams.set("template", id);
                    window.history.replaceState({}, "", url.toString());
                  }}
                  className="bg-[#161b22] border border-[#21262d] hover:border-[#00D4FF]/60 rounded-lg p-3 text-left transition-all hover:bg-[#1c2333] group"
                >
                  <div className="w-full h-20 bg-[#0d1117] rounded mb-2 flex items-center justify-center border border-[#21262d] group-hover:border-[#00D4FF]/30">
                    <svg viewBox="0 0 80 56" width="70" height="49" className="text-slate-600 group-hover:text-[#00D4FF]/60">
                      <rect x="5" y="5" width="70" height="46" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      <rect x="15" y="12" width="50" height="32" rx="1" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3,2" />
                      <line x1="40" y1="5" x2="40" y2="51" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
                    </svg>
                  </div>
                  <div className="text-[10px] font-semibold text-slate-200 group-hover:text-white truncate">{t.name}</div>
                  <div className="text-[8px] text-slate-500 mt-0.5">{t.standard}</div>
                </button>
              ))}
            </div>
            <a href="/library"
              className="mt-2 px-4 py-2 bg-[#00D4FF]/10 border border-[#00D4FF]/30 rounded-lg text-[#00D4FF] text-xs font-medium hover:bg-[#00D4FF]/20 transition-colors">
              Browse Full Equipment Catalog →
            </a>
          </div>
        ) : (
          <div ref={drawingRef} className="shadow-2xl" style={{ width: "min(100%, 1100px)", aspectRatio: "841/594" }}>
            <EngineeringSheet
              title={title}
              revisions={revisions}
              scale={scale}
              gdtAnnotations={gdtAnnotations}
              datumLabels={datumLabels}
            />
          </div>
        )}
      </div>

      {/* ── Export loading toast ── */}
      {exporting && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161b22] border border-[#00D4FF]/60 rounded-lg px-4 py-3 flex items-center gap-3 shadow-2xl">
          <span className="inline-block w-4 h-4 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-white font-medium">
            Generating {exporting.toUpperCase()}…
          </span>
        </div>
      )}
    </div>
  );
}
