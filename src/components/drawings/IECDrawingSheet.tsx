"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// IEC Drawing Sheet — A3 landscape SVG renderer for IEC equipment drawings
// Now delegates to the unified drawingEngine via iecDrawingAdapter.
// Retains the original React SVG rendering as a fallback / direct mode.
// ═══════════════════════════════════════════════════════════════════════════════

import type { IECDrawingData, DrawingView, DrawingShape } from "@/lib/iecDrawingData";
import { iecToDrawing } from "@/lib/iecDrawingAdapter";
import { renderDrawingToSVG, createA3Viewport } from "@/lib/drawingEngine";

// ── SVG sheet constants (A3 landscape in SVG units ≈ mm) ─────────────────────
const W = 841, H = 594;
const MARGIN = 8, FRAME = 18;
const TITLE_H = 110;
const INNER_X = MARGIN + FRAME;
const INNER_Y = MARGIN + FRAME;
const INNER_W = W - 2 * (MARGIN + FRAME);
const INNER_H = H - 2 * (MARGIN + FRAME) - TITLE_H;
const C = "#1e3a5f";

// ── Props ───────────────────────────────────────────────────────────────────

interface IECDrawingSheetProps {
  /** IEC drawing data to render. */
  data: IECDrawingData;
  /** If true, use unified engine SVG export instead of React SVG. */
  useEngine?: boolean;
}

// ── Scale + render a DrawingView into a given SVG area ───────────────────────
function renderViewShapes(view: DrawingView, areaW: number, areaH: number) {
  const PAD = 20;
  const scaleX = (areaW - PAD * 2) / view.width_mm;
  const scaleY = (areaH - PAD * 2 - 20) / view.height_mm;
  const s = Math.min(scaleX, scaleY, 1);
  const ox = PAD + ((areaW - PAD * 2) - view.width_mm * s) / 2;
  const oy = PAD;

  return view.shapes.map((sh: DrawingShape, i: number) => {
    const key = `sh-${i}`;
    const sx = ox + sh.x * s, sy = oy + sh.y * s;
    const sw = (sh.w ?? 0) * s, sh_ = (sh.h ?? 0) * s;

    const stroke = C;
    const strokeW = sh.style === 'thick' ? 1.8 : sh.style === 'hidden' ? 0.4 : 0.9;
    const dashArr = sh.style === 'dashed' ? '4,2' : sh.style === 'hidden' ? '2,2' : undefined;
    const fill = sh.fill ?? 'none';

    if (sh.type === 'rect') {
      return (
        <rect key={key} x={sx} y={sy} width={sw} height={sh_}
          fill={fill} stroke={stroke} strokeWidth={strokeW}
          strokeDasharray={dashArr} />
      );
    }
    if (sh.type === 'line') {
      const ex = ox + (sh.x2 ?? sh.x) * s, ey = oy + (sh.y2 ?? sh.y) * s;
      return (
        <line key={key} x1={sx} y1={sy} x2={ex} y2={ey}
          stroke={stroke} strokeWidth={strokeW} strokeDasharray={dashArr} />
      );
    }
    if (sh.type === 'circle') {
      return (
        <circle key={key} cx={sx} cy={sy} r={(sh.r ?? 5) * s}
          fill={fill || 'none'} stroke={stroke} strokeWidth={strokeW} />
      );
    }
    if (sh.type === 'text') {
      return (
        <text key={key} x={sx} y={sy} fontSize={6} textAnchor="middle"
          fill={C} fontFamily="Arial, sans-serif" dominantBaseline="middle">
          {sh.label}
        </text>
      );
    }
    return null;
  });
}

// ── Render dimension lines ────────────────────────────────────────────────────
function HDim({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  const mx = (x1 + x2) / 2;
  return (
    <g stroke={C} strokeWidth={0.5} fill="none">
      <line x1={x1} y1={y - 8} x2={x1} y2={y + 2} />
      <line x1={x2} y1={y - 8} x2={x2} y2={y + 2} />
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <polygon points={`${x2},${y} ${x2-4},${y-2} ${x2-4},${y+2}`} fill={C} />
      <polygon points={`${x1},${y} ${x1+4},${y-2} ${x1+4},${y+2}`} fill={C} />
      <text x={mx} y={y - 3} fontSize={6} textAnchor="middle" fill={C}
        stroke="none" fontFamily="Arial, sans-serif">{label}</text>
    </g>
  );
}

function VDim({ y1, y2, x, label }: { y1: number; y2: number; x: number; label: string }) {
  const my = (y1 + y2) / 2;
  return (
    <g stroke={C} strokeWidth={0.5} fill="none">
      <line x1={x - 8} y1={y1} x2={x + 2} y2={y1} />
      <line x1={x - 8} y1={y2} x2={x + 2} y2={y2} />
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <polygon points={`${x},${y2} ${x-2},${y2-4} ${x+2},${y2-4}`} fill={C} />
      <polygon points={`${x},${y1} ${x-2},${y1+4} ${x+2},${y1+4}`} fill={C} />
      <text x={x - 3} y={my} fontSize={6} textAnchor="middle" fill={C}
        stroke="none" fontFamily="Arial, sans-serif"
        transform={`rotate(-90,${x - 3},${my})`}>{label}</text>
    </g>
  );
}

// ── Render one view panel ─────────────────────────────────────────────────────
function ViewPanel({ view, x, y, w, h }: { view: DrawingView; x: number; y: number; w: number; h: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect width={w} height={h} fill="white" stroke={C} strokeWidth={0.8} />
      {renderViewShapes(view, w, h)}
      <HDim x1={10} x2={w - 10} y={h - 10} label={`${view.width_mm} mm`} />
      <VDim y1={10} y2={h - 20} x={w - 8} label={`${view.height_mm} mm`} />
      <text x={w / 2} y={h + 10} fontSize={7.5} textAnchor="middle"
        fill={C} fontWeight="bold" fontFamily="Arial, sans-serif">
        {view.label}
      </text>
    </g>
  );
}

// ── Title block ───────────────────────────────────────────────────────────────
function TitleBlock({ d }: { d: IECDrawingData }) {
  const x = MARGIN + FRAME, y = H - MARGIN - TITLE_H;
  const ww = INNER_W;
  const lw = 0.6;
  const cell = (label: string, value: string, bx: number, by: number, bw: number) => (
    <g key={`${label}-${bx}`}>
      <rect x={bx} y={by} width={bw} height={28} fill="#f0f6ff" stroke={C} strokeWidth={lw} />
      <text x={bx + 3} y={by + 9} fontSize={6} fill={C} fontFamily="Arial">{label}</text>
      <text x={bx + 3} y={by + 22} fontSize={8} fill={C} fontFamily="Arial" fontWeight="bold">{value}</text>
    </g>
  );

  const today = new Date().toISOString().slice(0, 10);
  return (
    <g>
      <rect x={x} y={y} width={ww} height={TITLE_H} fill="#f0f6ff" stroke={C} strokeWidth={1.5} />
      {cell("EQUIPMENT NAME", d.name, x, y, 280)}
      {cell("STANDARD", d.standard, x + 280, y, 160)}
      {cell("PART NO.", d.partNo, x + 440, y, 120)}
      {cell("MATERIAL", d.material, x + 560, y, 140)}
      {cell("SCALE", d.scale, x + 700, y, 60)}
      {cell("DRAWN BY", "ShilpaSutra AI", x, y + 28, 120)}
      {cell("DATE", today, x + 120, y + 28, 90)}
      {cell("CHECKED BY", "—", x + 210, y + 28, 100)}
      {cell("APPROVED BY", "—", x + 310, y + 28, 90)}
      {cell("SHEET", "1 of 1", x + 400, y + 28, 80)}
      {cell("REV.", "A", x + 480, y + 28, 40)}
      {cell("PROJECT", "ShilpaSutra PV Lab", x + 520, y + 28, 200)}
      <rect x={x} y={y + 56} width={ww} height={TITLE_H - 56} fill="white" stroke={C} strokeWidth={lw} />
      <text x={x + 6} y={y + 67} fontSize={6.5} fill={C} fontFamily="Arial" fontWeight="bold">NOTES:</text>
      {d.notes.map((note, i) => (
        <text key={i} x={x + 6} y={y + 79 + i * 9} fontSize={6} fill="#374151" fontFamily="Arial">{note}</text>
      ))}
    </g>
  );
}

// ── Main IEC Drawing Sheet ────────────────────────────────────────────────────
export default function IECDrawingSheet({ data, useEngine = false }: IECDrawingSheetProps) {
  // Engine mode: convert to Drawing and render via unified engine
  if (useEngine) {
    const unifiedDrawing = iecToDrawing(data);
    const svgString = renderDrawingToSVG(unifiedDrawing, createA3Viewport());
    const cleanSvg = svgString.replace(/^<\?xml[^?]*\?>\s*/, '');
    return (
      <div className="w-full h-full" style={{ background: "white" }}
        dangerouslySetInnerHTML={{ __html: cleanSvg }} />
    );
  }

  // Legacy React SVG mode (original rendering)
  const nViews = data.views.length;
  const drawH = INNER_H;
  const drawW = INNER_W;
  const cols = Math.min(nViews, 3);
  const colW = Math.floor(drawW / cols) - 4;
  const rows = Math.ceil(nViews / cols);
  const rowH = Math.floor(drawH / rows) - 14;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ background: "white" }}
      fontFamily="Arial, sans-serif">

      <rect x={MARGIN} y={MARGIN} width={W - 2 * MARGIN} height={H - 2 * MARGIN}
        fill="white" stroke={C} strokeWidth={1.5} />
      <rect x={INNER_X} y={INNER_Y} width={INNER_W} height={INNER_H}
        fill="none" stroke={C} strokeWidth={1.8} />

      {["A","B","C","D"].map((z, i) => (
        <g key={z}>
          <text x={MARGIN + 4} y={INNER_Y + 15 + i * 85} fontSize={7} fill="#9ca3af">{z}</text>
          <text x={W - MARGIN - 4} y={INNER_Y + 15 + i * 85} fontSize={7} fill="#9ca3af" textAnchor="end">{z}</text>
        </g>
      ))}
      {[1,2,3,4,5,6,7].map((n, i) => (
        <text key={n} x={INNER_X + 15 + i * 100} y={MARGIN + 8} fontSize={7} fill="#9ca3af" textAnchor="middle">{n}</text>
      ))}

      <line x1={W/2} y1={MARGIN} x2={W/2} y2={MARGIN+7} stroke={C} strokeWidth={0.7}/>
      <line x1={W/2} y1={H-MARGIN} x2={W/2} y2={H-MARGIN-7} stroke={C} strokeWidth={0.7}/>
      <line x1={MARGIN} y1={H/2} x2={MARGIN+7} y2={H/2} stroke={C} strokeWidth={0.7}/>
      <line x1={W-MARGIN} y1={H/2} x2={W-MARGIN-7} y2={H/2} stroke={C} strokeWidth={0.7}/>

      <g transform={`translate(${MARGIN+14},${H - MARGIN - TITLE_H - 20})`}>
        <circle cx={0} cy={0} r={12} fill="none" stroke={C} strokeWidth={0.7}/>
        <polygon points="-10,-4 -3,-7 -3,7 -10,4" fill={C}/>
        <circle cx={6} cy={0} r={4} fill="none" stroke={C} strokeWidth={0.7}/>
        <text x={0} y={18} fontSize={6} textAnchor="middle" fill={C}>ISO E</text>
      </g>

      {data.views.map((view, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const vx = INNER_X + col * (colW + 4);
        const vy = INNER_Y + row * (rowH + 14);
        return <ViewPanel key={idx} view={view} x={vx} y={vy} w={colW} h={rowH} />;
      })}

      <TitleBlock d={data} />

      <text x={INNER_X + 4} y={INNER_Y - 3} fontSize={7} fill={C} fontFamily="Arial">
        A3 · LANDSCAPE · {data.standard}
      </text>
    </svg>
  );
}
