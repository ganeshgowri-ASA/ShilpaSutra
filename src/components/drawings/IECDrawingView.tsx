"use client";
// ─── IEC Drawing View — Generic A3 Landscape SVG Renderer ──────────────────
// Renders any IECDrawingData entry as a standards-compliant engineering drawing.
// A3 landscape: 420×297mm viewBox, 10mm border, blue title block.

import { useState, useCallback } from "react";
import type {
  IECDrawingData, DrawingView, DrawingShape, DimensionLine,
  CenterMark, DatumRef, BOMEntry, RevisionEntry, TitleBlockData,
  ShapeStyle,
} from "@/lib/iecDrawingData";

// ── Sheet constants (A3 landscape in mm) ────────────────────────────────────
const SHEET_W = 420;
const SHEET_H = 297;
const BORDER = 10;
const TITLE_H = 55;
const BOM_W = 140;
const REV_H = 20;
const INNER_X = BORDER;
const INNER_Y = BORDER;
const INNER_W = SHEET_W - 2 * BORDER;
const INNER_H = SHEET_H - 2 * BORDER;
const DRAW_H = INNER_H - TITLE_H;

// ── Colors ──────────────────────────────────────────────────────────────────
const C_TITLE = "#1e3a5f";      // blue title block
const C_DIM = "#404040";        // dark gray dimension lines
const C_GEOM = "#1a1a1a";       // geometry lines
const C_HIDDEN = "#808080";     // hidden lines
const C_CENTER = "#cc0000";     // center lines (red per convention)
const C_HATCH = "#888888";      // crosshatch

// ── Font size (3.5mm equivalent per task spec) ──────────────────────────────
const FONT_DIM = 3.5;
const FONT_LABEL = 4;
const FONT_TITLE = 5;
const FONT_NOTE = 3;
const FONT_ZONE = 3.5;

// ── Shape renderer ──────────────────────────────────────────────────────────
function getStrokeProps(style: ShapeStyle | undefined): { stroke: string; strokeWidth: number; strokeDasharray?: string } {
  if (!style || style === "solid") return { stroke: C_GEOM, strokeWidth: 0.3 };
  if (style === "thick") return { stroke: C_GEOM, strokeWidth: 0.6 };
  if (style === "dashed") return { stroke: C_GEOM, strokeWidth: 0.3, strokeDasharray: "3,1.5" };
  if (style === "hidden") return { stroke: C_HIDDEN, strokeWidth: 0.2, strokeDasharray: "1.5,1" };
  if (style === "center") return { stroke: C_CENTER, strokeWidth: 0.15, strokeDasharray: "8,2,2,2" };
  // phantom
  return { stroke: C_HIDDEN, strokeWidth: 0.15, strokeDasharray: "8,2,2,2,2,2" };
}

function RenderShape({ shape, s, ox, oy }: { shape: DrawingShape; s: number; ox: number; oy: number }) {
  if (shape.type === "rect") {
    const sp = getStrokeProps(shape.style);
    return (
      <rect x={ox + shape.x * s} y={oy + shape.y * s}
        width={shape.w * s} height={shape.h * s}
        fill={shape.fill ?? "none"} {...sp} />
    );
  }
  if (shape.type === "line") {
    const sp = getStrokeProps(shape.style);
    return (
      <line x1={ox + shape.x * s} y1={oy + shape.y * s}
        x2={ox + shape.x2 * s} y2={oy + shape.y2 * s} {...sp} />
    );
  }
  if (shape.type === "circle") {
    const sp = getStrokeProps(shape.style);
    return (
      <circle cx={ox + shape.x * s} cy={oy + shape.y * s}
        r={shape.r * s} fill={shape.fill ?? "none"} {...sp} />
    );
  }
  if (shape.type === "text") {
    const fs = (shape.fontSize ?? 0) > 0 ? shape.fontSize! * s : Math.max(FONT_DIM * 0.8, 2.5);
    return (
      <text x={ox + shape.x * s} y={oy + shape.y * s}
        fontSize={fs} textAnchor={shape.anchor ?? "middle"}
        fill={C_GEOM} fontFamily="Arial, sans-serif"
        dominantBaseline="middle"
        fontWeight={shape.bold ? "bold" : "normal"}>
        {shape.label}
      </text>
    );
  }
  if (shape.type === "arc") {
    const r = shape.r * s;
    const cx = ox + shape.cx * s;
    const cy = oy + shape.cy * s;
    const startRad = (shape.startAngle * Math.PI) / 180;
    const endRad = (shape.endAngle * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = shape.endAngle - shape.startAngle > 180 ? 1 : 0;
    const sp = getStrokeProps(shape.style);
    return (
      <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
        fill="none" {...sp} />
    );
  }
  if (shape.type === "crosshatch") {
    const x = ox + shape.x * s;
    const y = oy + shape.y * s;
    const w = shape.w * s;
    const h = shape.h * s;
    const sp = (shape.spacing ?? 4) * s;
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let d = sp; d < w + h; d += sp) {
      const x1 = x + Math.min(d, w);
      const y1 = y + Math.max(0, d - w);
      const x2 = x + Math.max(0, d - h);
      const y2 = y + Math.min(d, h);
      lines.push({ x1, y1, x2, y2 });
    }
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill="none" stroke="none" />
        {lines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={C_HATCH} strokeWidth={0.12} />
        ))}
      </g>
    );
  }
  return null;
}

// ── Dimension line renderer ─────────────────────────────────────────────────
function RenderDimension({ dim, s, ox, oy }: { dim: DimensionLine; s: number; ox: number; oy: number }) {
  const arrowLen = 2;
  const extLen = 3;
  const textLabel = dim.tolerance ? `${dim.text} ${dim.tolerance}` : dim.text;

  if (dim.dir === "h") {
    const y = oy + dim.at * s + dim.offset;
    const x1 = ox + dim.p1 * s;
    const x2 = ox + dim.p2 * s;
    const mx = (x1 + x2) / 2;
    const ey = oy + dim.at * s;
    return (
      <g stroke={C_DIM} strokeWidth={0.2} fill="none">
        {/* Extension lines */}
        <line x1={x1} y1={ey} x2={x1} y2={y + (dim.offset > 0 ? 1 : -1)} />
        <line x1={x2} y1={ey} x2={x2} y2={y + (dim.offset > 0 ? 1 : -1)} />
        {/* Dimension line */}
        <line x1={x1} y1={y} x2={x2} y2={y} />
        {/* Arrowheads */}
        <polygon points={`${x1},${y} ${x1 + arrowLen},${y - 0.7} ${x1 + arrowLen},${y + 0.7}`} fill={C_DIM} stroke="none" />
        <polygon points={`${x2},${y} ${x2 - arrowLen},${y - 0.7} ${x2 - arrowLen},${y + 0.7}`} fill={C_DIM} stroke="none" />
        {/* Text */}
        <text x={mx} y={y - 1.2} fontSize={FONT_DIM} textAnchor="middle"
          fill={C_DIM} stroke="none" fontFamily="Arial, sans-serif">{textLabel}</text>
      </g>
    );
  }
  // Vertical
  const x = ox + dim.at * s + dim.offset;
  const y1 = oy + dim.p1 * s;
  const y2 = oy + dim.p2 * s;
  const my = (y1 + y2) / 2;
  const ex = ox + dim.at * s;
  return (
    <g stroke={C_DIM} strokeWidth={0.2} fill="none">
      <line x1={ex} y1={y1} x2={x + (dim.offset > 0 ? 1 : -1)} y2={y1} />
      <line x1={ex} y1={y2} x2={x + (dim.offset > 0 ? 1 : -1)} y2={y2} />
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <polygon points={`${x},${y1} ${x - 0.7},${y1 + arrowLen} ${x + 0.7},${y1 + arrowLen}`} fill={C_DIM} stroke="none" />
      <polygon points={`${x},${y2} ${x - 0.7},${y2 - arrowLen} ${x + 0.7},${y2 - arrowLen}`} fill={C_DIM} stroke="none" />
      <text x={x - 1.5} y={my} fontSize={FONT_DIM} textAnchor="middle"
        fill={C_DIM} stroke="none" fontFamily="Arial, sans-serif"
        transform={`rotate(-90,${x - 1.5},${my})`}>{textLabel}</text>
    </g>
  );
}

// ── Center mark renderer ────────────────────────────────────────────────────
function RenderCenterMark({ cm, s, ox, oy }: { cm: CenterMark; s: number; ox: number; oy: number }) {
  const cx = ox + cm.x * s;
  const cy = oy + cm.y * s;
  const half = cm.size * s * 0.5;
  return (
    <g stroke={C_CENTER} strokeWidth={0.12} strokeDasharray="4,1,1,1">
      <line x1={cx - half} y1={cy} x2={cx + half} y2={cy} />
      <line x1={cx} y1={cy - half} x2={cx} y2={cy + half} />
    </g>
  );
}

// ── Datum reference renderer ────────────────────────────────────────────────
function RenderDatum({ datum, s, ox, oy }: { datum: DatumRef; s: number; ox: number; oy: number }) {
  const x = ox + datum.x * s;
  const y = oy + datum.y * s;
  const sz = 4;
  let points = "";
  let tx = x, ty = y;
  if (datum.dir === "down") { points = `${x},${y} ${x - sz},${y + sz * 1.5} ${x + sz},${y + sz * 1.5}`; ty = y + sz * 1.5 + 2; }
  else if (datum.dir === "up") { points = `${x},${y} ${x - sz},${y - sz * 1.5} ${x + sz},${y - sz * 1.5}`; ty = y - sz * 1.5 - 2; }
  else if (datum.dir === "left") { points = `${x},${y} ${x - sz * 1.5},${y - sz} ${x - sz * 1.5},${y + sz}`; tx = x - sz * 1.5 - 3; }
  else { points = `${x},${y} ${x + sz * 1.5},${y - sz} ${x + sz * 1.5},${y + sz}`; tx = x + sz * 1.5 + 3; }
  return (
    <g>
      <polygon points={points} fill="none" stroke={C_GEOM} strokeWidth={0.3} />
      <text x={tx} y={ty} fontSize={FONT_LABEL} textAnchor="middle" dominantBaseline="middle"
        fill={C_GEOM} fontWeight="bold" fontFamily="Arial, sans-serif">{datum.label}</text>
    </g>
  );
}

// ── View panel ──────────────────────────────────────────────────────────────
function ViewPanel({ view, x, y, w, h }: { view: DrawingView; x: number; y: number; w: number; h: number }) {
  const padX = 8;
  const padY = 8;
  const availW = w - padX * 2;
  const availH = h - padY * 2 - 6; // reserve 6 for label
  const scaleX = availW / view.width_mm;
  const scaleY = availH / view.height_mm;
  const s = Math.min(scaleX, scaleY);
  const ox = x + padX + (availW - view.width_mm * s) / 2;
  const oy = y + padY + (availH - view.height_mm * s) / 2;

  return (
    <g>
      {/* View border */}
      <rect x={x} y={y} width={w} height={h} fill="white" stroke={C_TITLE} strokeWidth={0.3} />
      {/* Shapes */}
      {view.shapes.map((sh, i) => <RenderShape key={`s${i}`} shape={sh} s={s} ox={ox} oy={oy} />)}
      {/* Dimensions */}
      {view.dimensions.map((d, i) => <RenderDimension key={`d${i}`} dim={d} s={s} ox={ox} oy={oy} />)}
      {/* Center marks */}
      {view.centerMarks.map((cm, i) => <RenderCenterMark key={`cm${i}`} cm={cm} s={s} ox={ox} oy={oy} />)}
      {/* Datum refs */}
      {view.datumRefs.map((dr, i) => <RenderDatum key={`dr${i}`} datum={dr} s={s} ox={ox} oy={oy} />)}
      {/* View label */}
      <text x={x + w / 2} y={y + h - 2} fontSize={FONT_LABEL} fontWeight="bold"
        textAnchor="middle" fill={C_TITLE} fontFamily="Arial, sans-serif">{view.label}</text>
    </g>
  );
}

// ── Title block ─────────────────────────────────────────────────────────────
function TitleBlock({ tb, notes, bom, revisions }: {
  tb: TitleBlockData; notes: string[]; bom: BOMEntry[]; revisions: RevisionEntry[];
}) {
  const x = BORDER;
  const y = SHEET_H - BORDER - TITLE_H;
  const w = INNER_W;
  const cellH = 11;

  const cell = (label: string, value: string, cx: number, cy: number, cw: number, ch: number) => (
    <g key={`${label}-${cx}-${cy}`}>
      <rect x={cx} y={cy} width={cw} height={ch} fill="#eef3fa" stroke={C_TITLE} strokeWidth={0.25} />
      <text x={cx + 1.5} y={cy + 3.5} fontSize={2.5} fill={C_TITLE} fontFamily="Arial">{label}</text>
      <text x={cx + 1.5} y={cy + ch - 2} fontSize={3.2} fill={C_TITLE} fontFamily="Arial" fontWeight="bold">{value}</text>
    </g>
  );

  // BOM section (right side of title block)
  const bomX = x + w - BOM_W;
  const bomCellH = 7;

  return (
    <g>
      {/* Title block background */}
      <rect x={x} y={y} width={w} height={TITLE_H} fill="#eef3fa" stroke={C_TITLE} strokeWidth={0.6} />

      {/* Row 1: main info */}
      {cell("EQUIPMENT", tb.name, x, y, 120, cellH)}
      {cell("STANDARD", tb.standard, x + 120, y, 70, cellH)}
      {cell("PART NO.", tb.partNo, x + 190, y, 55, cellH)}
      {cell("DWG NO.", tb.drawingNo, x + 245, y, 55, cellH)}
      {cell("MATERIAL", tb.material, x + 300, y, 70, cellH)}
      {cell("SCALE", tb.scale, x + 370, y, 30, cellH)}

      {/* Row 2: admin */}
      {cell("DRAWN", tb.drawnBy, x, y + cellH, 55, cellH)}
      {cell("DATE", tb.date, x + 55, y + cellH, 45, cellH)}
      {cell("CHECKED", tb.checkedBy, x + 100, y + cellH, 45, cellH)}
      {cell("APPROVED", tb.approvedBy, x + 145, y + cellH, 45, cellH)}
      {cell("SHEET", tb.sheet, x + 190, y + cellH, 30, cellH)}
      {cell("REV", tb.rev, x + 220, y + cellH, 20, cellH)}
      {cell("SURFACE", tb.surfaceFinish ?? "—", x + 240, y + cellH, 70, cellH)}
      {cell("WEIGHT", tb.weight ?? "—", x + 310, y + cellH, 40, cellH)}
      {cell("PROJECT", tb.project, x + 350, y + cellH, 50, cellH)}

      {/* Row 3: Notes */}
      <rect x={x} y={y + cellH * 2} width={w - BOM_W} height={TITLE_H - cellH * 2}
        fill="white" stroke={C_TITLE} strokeWidth={0.25} />
      <text x={x + 2} y={y + cellH * 2 + 4} fontSize={3} fill={C_TITLE} fontWeight="bold"
        fontFamily="Arial">NOTES:</text>
      {notes.slice(0, 6).map((n, i) => (
        <text key={i} x={x + 2} y={y + cellH * 2 + 8 + i * 4} fontSize={FONT_NOTE}
          fill="#374151" fontFamily="Arial">{n}</text>
      ))}

      {/* Revision table (top of BOM area) */}
      <rect x={bomX} y={y + cellH * 2} width={BOM_W} height={REV_H}
        fill="#f0f4f8" stroke={C_TITLE} strokeWidth={0.25} />
      <text x={bomX + 2} y={y + cellH * 2 + 4} fontSize={2.5} fill={C_TITLE}
        fontWeight="bold" fontFamily="Arial">REV TABLE</text>
      <text x={bomX + 2} y={y + cellH * 2 + 8} fontSize={2} fill={C_TITLE} fontFamily="Arial">
        REV | DATE | DESCRIPTION</text>
      {revisions.slice(0, 3).map((r, i) => (
        <text key={i} x={bomX + 2} y={y + cellH * 2 + 12 + i * 3} fontSize={2}
          fill="#374151" fontFamily="Arial">{`${r.rev} | ${r.date} | ${r.description}`}</text>
      ))}

      {/* BOM table */}
      <rect x={bomX} y={y + cellH * 2 + REV_H} width={BOM_W}
        height={TITLE_H - cellH * 2 - REV_H}
        fill="white" stroke={C_TITLE} strokeWidth={0.25} />
      <text x={bomX + 2} y={y + cellH * 2 + REV_H + 4} fontSize={2.5} fill={C_TITLE}
        fontWeight="bold" fontFamily="Arial">BOM (PARTIAL)</text>
      {bom.slice(0, 3).map((b, i) => (
        <text key={i} x={bomX + 2} y={y + cellH * 2 + REV_H + 8 + i * 3} fontSize={2}
          fill="#374151" fontFamily="Arial">{`${b.item}. ${b.description} (×${b.qty})`}</text>
      ))}
    </g>
  );
}

// ── Border, zones, projection symbol ────────────────────────────────────────
function SheetBorder() {
  const zones = ["A", "B", "C", "D"];
  const cols = [1, 2, 3, 4, 5, 6];
  const colW = INNER_W / cols.length;
  const rowH = DRAW_H / zones.length;
  return (
    <g>
      {/* Outer border */}
      <rect x={BORDER} y={BORDER} width={INNER_W} height={INNER_H}
        fill="white" stroke={C_TITLE} strokeWidth={0.6} />
      {/* Drawing area frame */}
      <rect x={BORDER} y={BORDER} width={INNER_W} height={DRAW_H}
        fill="none" stroke={C_TITLE} strokeWidth={0.4} />
      {/* Zone labels */}
      {zones.map((z, i) => (
        <g key={z}>
          <text x={BORDER - 3} y={BORDER + rowH * i + rowH / 2} fontSize={FONT_ZONE}
            textAnchor="middle" fill="#9ca3af" fontFamily="Arial">{z}</text>
          <text x={SHEET_W - BORDER + 3} y={BORDER + rowH * i + rowH / 2} fontSize={FONT_ZONE}
            textAnchor="middle" fill="#9ca3af" fontFamily="Arial">{z}</text>
        </g>
      ))}
      {cols.map((n, i) => (
        <text key={n} x={BORDER + colW * i + colW / 2} y={BORDER - 3} fontSize={FONT_ZONE}
          textAnchor="middle" fill="#9ca3af" fontFamily="Arial">{n}</text>
      ))}
      {/* Centering ticks */}
      <line x1={SHEET_W / 2} y1={0} x2={SHEET_W / 2} y2={BORDER - 1} stroke={C_TITLE} strokeWidth={0.3} />
      <line x1={SHEET_W / 2} y1={SHEET_H} x2={SHEET_W / 2} y2={SHEET_H - BORDER + 1} stroke={C_TITLE} strokeWidth={0.3} />
      <line x1={0} y1={SHEET_H / 2} x2={BORDER - 1} y2={SHEET_H / 2} stroke={C_TITLE} strokeWidth={0.3} />
      <line x1={SHEET_W} y1={SHEET_H / 2} x2={SHEET_W - BORDER + 1} y2={SHEET_H / 2} stroke={C_TITLE} strokeWidth={0.3} />
      {/* ISO E third-angle projection symbol */}
      <g transform={`translate(${BORDER + 6},${BORDER + DRAW_H - 10})`}>
        <circle cx={0} cy={0} r={5} fill="none" stroke={C_TITLE} strokeWidth={0.3} />
        <polygon points="-4,-1.5 -1,-3 -1,3 -4,1.5" fill={C_TITLE} />
        <circle cx={3} cy={0} r={2} fill="none" stroke={C_TITLE} strokeWidth={0.3} />
        <text x={0} y={8} fontSize={2.5} textAnchor="middle" fill={C_TITLE} fontFamily="Arial">ISO E</text>
      </g>
    </g>
  );
}

// ── Main exported component ─────────────────────────────────────────────────
export default function IECDrawingView({ data }: { data: IECDrawingData }) {
  // Zoom/pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.5, Math.min(5, z * factor)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.shiftKey) {
      setDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  // Calculate viewBox for zoom/pan
  const vbW = SHEET_W / zoom;
  const vbH = SHEET_H / zoom;
  const vbX = (SHEET_W - vbW) / 2 - pan.x / zoom;
  const vbY = (SHEET_H - vbH) / 2 - pan.y / zoom;

  // Layout views in a grid
  const nViews = data.views.length;
  const cols = Math.min(nViews, 2);
  const rows = Math.ceil(nViews / cols);
  const viewW = (INNER_W - 4) / cols;
  const viewH = (DRAW_H - 4) / rows;

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      className="w-full h-full"
      style={{ background: "white", cursor: dragging ? "grabbing" : "default" }}
      fontFamily="Arial, sans-serif"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Sheet border and zones */}
      <SheetBorder />

      {/* View panels */}
      {data.views.map((view, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const vx = BORDER + 2 + col * viewW;
        const vy = BORDER + 2 + row * viewH;
        return <ViewPanel key={idx} view={view} x={vx} y={vy} w={viewW - 2} h={viewH - 2} />;
      })}

      {/* Title block with notes, BOM, revisions */}
      <TitleBlock
        tb={data.titleBlock}
        notes={data.notes}
        bom={data.bom}
        revisions={data.revisions}
      />

      {/* Sheet label */}
      <text x={BORDER + 2} y={BORDER - 3} fontSize={FONT_NOTE} fill={C_TITLE} fontFamily="Arial">
        A3 LANDSCAPE · {data.titleBlock.standard} · TOL: {data.generalTolerances}
      </text>
    </svg>
  );
}
