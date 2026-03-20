"use client";
import { useState } from "react";

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

export default function DrawingsPage() {
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

  return (
    <div className="flex h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* ── Left sidebar ── */}
      <div className="w-60 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
        <div className="px-3 py-2 border-b border-[#21262d]">
          <span className="text-xs font-bold text-[#00D4FF]">Engineering Drawing</span>
        </div>

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
          <button
            onClick={() => {
              const svg = document.querySelector("svg");
              if (!svg) return;
              const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
              const a = document.createElement("a");
              a.download = `${title.partNo}_drawing.svg`;
              a.href = URL.createObjectURL(blob);
              a.click();
            }}
            className="w-full bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-1.5 rounded"
          >
            Export SVG
          </button>
        </div>
      </div>

      {/* ── Drawing canvas ── */}
      <div className="flex-1 bg-[#1a1f2e] flex items-center justify-center overflow-auto p-6">
        <div className="shadow-2xl" style={{ width: "min(100%, 1100px)", aspectRatio: "841/594" }}>
          <EngineeringSheet
            title={title}
            revisions={revisions}
            scale={scale}
            gdtAnnotations={gdtAnnotations}
            datumLabels={datumLabels}
          />
        </div>
      </div>
    </div>
  );
}
