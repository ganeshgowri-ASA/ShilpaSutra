"use client";
import { useState } from "react";

// ── Types ───────────────────────────────────────────────────
type PaperSize = "A4" | "A3" | "A2" | "A1";
type ViewType = "front" | "top" | "right" | "isometric" | "section";

interface TitleBlock {
  title: string;
  partNo: string;
  rev: string;
  material: string;
  drawnBy: string;
  date: string;
  checkedBy: string;
  scale: string;
  sheet: string;
  project: string;
}

// ── Constants ───────────────────────────────────────────────
const paperSizes: Record<PaperSize, { w: number; h: number; label: string }> = {
  A4: { w: 297, h: 210, label: "A4 Landscape" },
  A3: { w: 420, h: 297, label: "A3 Landscape" },
  A2: { w: 594, h: 420, label: "A2 Landscape" },
  A1: { w: 841, h: 594, label: "A1 Landscape" },
};

const MARGIN = 10;
const TB_W = 180; // title block width
const TB_H = 56; // title block height

// ── SVG sub-components ──────────────────────────────────────

/** Dimension line with extension lines and text */
function DimH({ x1, x2, y, label, offset = 12 }: { x1: number; x2: number; y: number; label: string; offset?: number }) {
  const dy = y + offset;
  return (
    <g className="dim" stroke="#3b82f6" strokeWidth={0.4} fill="#3b82f6">
      {/* extension lines */}
      <line x1={x1} y1={y} x2={x1} y2={dy + 2} strokeDasharray="1,1" />
      <line x1={x2} y1={y} x2={x2} y2={dy + 2} strokeDasharray="1,1" />
      {/* dimension line */}
      <line x1={x1} y1={dy} x2={x2} y2={dy} />
      {/* arrows */}
      <polygon points={`${x1},${dy} ${x1 + 2},${dy - 0.8} ${x1 + 2},${dy + 0.8}`} />
      <polygon points={`${x2},${dy} ${x2 - 2},${dy - 0.8} ${x2 - 2},${dy + 0.8}`} />
      {/* text */}
      <text x={(x1 + x2) / 2} y={dy - 1.5} textAnchor="middle" fontSize={3.2} stroke="none">{label}</text>
    </g>
  );
}

function DimV({ y1, y2, x, label, offset = 12 }: { y1: number; y2: number; x: number; label: string; offset?: number }) {
  const dx = x + offset;
  return (
    <g className="dim" stroke="#3b82f6" strokeWidth={0.4} fill="#3b82f6">
      <line x1={x} y1={y1} x2={dx + 2} y2={y1} strokeDasharray="1,1" />
      <line x1={x} y1={y2} x2={dx + 2} y2={y2} strokeDasharray="1,1" />
      <line x1={dx} y1={y1} x2={dx} y2={y2} />
      <polygon points={`${dx},${y1} ${dx - 0.8},${y1 + 2} ${dx + 0.8},${y1 + 2}`} />
      <polygon points={`${dx},${y2} ${dx - 0.8},${y2 - 2} ${dx + 0.8},${y2 - 2}`} />
      <text x={dx + 2} y={(y1 + y2) / 2 + 1} fontSize={3.2} stroke="none">{label}</text>
    </g>
  );
}

/** Front view: rectangular bracket with 2 holes */
function FrontView({ x, y }: { x: number; y: number }) {
  const W = 80, H = 50;
  const ox = x, oy = y;
  return (
    <g>
      {/* label */}
      <text x={ox + W / 2} y={oy - 4} textAnchor="middle" fontSize={3.5} fill="#94a3b8" fontWeight="bold">FRONT VIEW</text>
      {/* center lines */}
      <line x1={ox + W / 2} y1={oy - 3} x2={ox + W / 2} y2={oy + H + 3} stroke="#64748b" strokeWidth={0.2} strokeDasharray="4,1,1,1" />
      <line x1={ox - 3} y1={oy + H / 2} x2={ox + W + 3} y2={oy + H / 2} stroke="#64748b" strokeWidth={0.2} strokeDasharray="4,1,1,1" />
      {/* outline */}
      <rect x={ox} y={oy} width={W} height={H} fill="none" stroke="#e2e8f0" strokeWidth={0.8} />
      {/* holes */}
      <circle cx={ox + 20} cy={oy + H / 2} r={6} fill="none" stroke="#e2e8f0" strokeWidth={0.6} />
      <circle cx={ox + 60} cy={oy + H / 2} r={6} fill="none" stroke="#e2e8f0" strokeWidth={0.6} />
      {/* hole center marks */}
      <line x1={ox + 18} y1={oy + H / 2} x2={ox + 22} y2={oy + H / 2} stroke="#64748b" strokeWidth={0.2} />
      <line x1={ox + 20} y1={oy + H / 2 - 2} x2={ox + 20} y2={oy + H / 2 + 2} stroke="#64748b" strokeWidth={0.2} />
      <line x1={ox + 58} y1={oy + H / 2} x2={ox + 62} y2={oy + H / 2} stroke="#64748b" strokeWidth={0.2} />
      <line x1={ox + 60} y1={oy + H / 2 - 2} x2={ox + 60} y2={oy + H / 2 + 2} stroke="#64748b" strokeWidth={0.2} />
      {/* hidden line (back hole hidden edges) */}
      <line x1={ox} y1={oy + 15} x2={ox + W} y2={oy + 15} stroke="#64748b" strokeWidth={0.3} strokeDasharray="3,2" />
      <line x1={ox} y1={oy + 35} x2={ox + W} y2={oy + 35} stroke="#64748b" strokeWidth={0.3} strokeDasharray="3,2" />
      {/* dimensions */}
      <DimH x1={ox} x2={ox + W} y={oy + H} label="80.00" offset={8} />
      <DimV y1={oy} y2={oy + H} x={ox + W} label="50.00" offset={8} />
      {/* hole diameter */}
      <text x={ox + 20} y={oy + H / 2 - 8} textAnchor="middle" fontSize={2.8} fill="#22d3ee">⌀12.00</text>
      <line x1={ox + 20} y1={oy + H / 2 - 6} x2={ox + 20} y2={oy + H / 2 - 1.5} stroke="#22d3ee" strokeWidth={0.3} markerEnd="" />
    </g>
  );
}

/** Top view: rectangular outline with hidden hole circles */
function TopView({ x, y }: { x: number; y: number }) {
  const W = 80, H = 30;
  const ox = x, oy = y;
  return (
    <g>
      <text x={ox + W / 2} y={oy - 4} textAnchor="middle" fontSize={3.5} fill="#94a3b8" fontWeight="bold">TOP VIEW</text>
      <line x1={ox + W / 2} y1={oy - 3} x2={ox + W / 2} y2={oy + H + 3} stroke="#64748b" strokeWidth={0.2} strokeDasharray="4,1,1,1" />
      <rect x={ox} y={oy} width={W} height={H} fill="none" stroke="#e2e8f0" strokeWidth={0.8} />
      {/* hidden circles (holes seen from top) */}
      <circle cx={ox + 20} cy={oy + H / 2} r={6} fill="none" stroke="#64748b" strokeWidth={0.3} strokeDasharray="2,1.5" />
      <circle cx={ox + 60} cy={oy + H / 2} r={6} fill="none" stroke="#64748b" strokeWidth={0.3} strokeDasharray="2,1.5" />
      {/* ribs hidden */}
      <rect x={ox + 10} y={oy + 5} width={60} height={20} fill="none" stroke="#64748b" strokeWidth={0.3} strokeDasharray="3,2" />
      <DimH x1={ox} x2={ox + W} y={oy + H} label="80.00" offset={6} />
      <DimV y1={oy} y2={oy + H} x={ox + W} label="30.00" offset={6} />
    </g>
  );
}

/** Right side view */
function RightView({ x, y }: { x: number; y: number }) {
  const W = 30, H = 50;
  const ox = x, oy = y;
  return (
    <g>
      <text x={ox + W / 2} y={oy - 4} textAnchor="middle" fontSize={3.5} fill="#94a3b8" fontWeight="bold">RIGHT VIEW</text>
      <line x1={ox + W / 2} y1={oy - 3} x2={ox + W / 2} y2={oy + H + 3} stroke="#64748b" strokeWidth={0.2} strokeDasharray="4,1,1,1" />
      <line x1={ox - 3} y1={oy + H / 2} x2={ox + W + 3} y2={oy + H / 2} stroke="#64748b" strokeWidth={0.2} strokeDasharray="4,1,1,1" />
      <rect x={ox} y={oy} width={W} height={H} fill="none" stroke="#e2e8f0" strokeWidth={0.8} />
      {/* hidden hole */}
      <circle cx={ox + W / 2} cy={oy + H / 2} r={6} fill="none" stroke="#64748b" strokeWidth={0.3} strokeDasharray="2,1.5" />
      <DimH x1={ox} x2={ox + W} y={oy + H} label="30.00" offset={6} />
      <DimV y1={oy} y2={oy + H} x={ox + W} label="50.00" offset={6} />
    </g>
  );
}

/** Isometric view: simple wireframe */
function IsoView({ x, y }: { x: number; y: number }) {
  const ox = x, oy = y;
  // Simplified isometric box
  const pts = {
    A: [ox, oy + 20],       // front-bottom-left
    B: [ox + 40, oy + 10],  // front-bottom-right
    C: [ox + 40, oy - 15],  // front-top-right
    D: [ox, oy - 5],        // front-top-left
    E: [ox + 15, oy + 12],  // back-bottom-left
    F: [ox + 55, oy + 2],   // back-bottom-right
    G: [ox + 55, oy - 23],  // back-top-right
    H: [ox + 15, oy - 13],  // back-top-left
  };
  return (
    <g>
      <text x={ox + 27} y={oy - 28} textAnchor="middle" fontSize={3.5} fill="#94a3b8" fontWeight="bold">ISOMETRIC</text>
      {/* front face */}
      <polygon
        points={`${pts.A[0]},${pts.A[1]} ${pts.B[0]},${pts.B[1]} ${pts.C[0]},${pts.C[1]} ${pts.D[0]},${pts.D[1]}`}
        fill="none" stroke="#e2e8f0" strokeWidth={0.7}
      />
      {/* top face */}
      <polygon
        points={`${pts.D[0]},${pts.D[1]} ${pts.C[0]},${pts.C[1]} ${pts.G[0]},${pts.G[1]} ${pts.H[0]},${pts.H[1]}`}
        fill="none" stroke="#e2e8f0" strokeWidth={0.7}
      />
      {/* right face */}
      <polygon
        points={`${pts.B[0]},${pts.B[1]} ${pts.F[0]},${pts.F[1]} ${pts.G[0]},${pts.G[1]} ${pts.C[0]},${pts.C[1]}`}
        fill="none" stroke="#e2e8f0" strokeWidth={0.7}
      />
      {/* hidden edges */}
      <line x1={pts.A[0]} y1={pts.A[1]} x2={pts.E[0]} y2={pts.E[1]} stroke="#64748b" strokeWidth={0.3} strokeDasharray="2,1.5" />
      <line x1={pts.E[0]} y1={pts.E[1]} x2={pts.F[0]} y2={pts.F[1]} stroke="#64748b" strokeWidth={0.3} strokeDasharray="2,1.5" />
      <line x1={pts.E[0]} y1={pts.E[1]} x2={pts.H[0]} y2={pts.H[1]} stroke="#64748b" strokeWidth={0.3} strokeDasharray="2,1.5" />
    </g>
  );
}

/** Section view with cross-hatch */
function SectionView({ x, y }: { x: number; y: number }) {
  const W = 80, H = 50;
  const ox = x, oy = y;
  const wallT = 8; // wall thickness
  return (
    <g>
      <text x={ox + W / 2} y={oy - 4} textAnchor="middle" fontSize={3.5} fill="#ef4444" fontWeight="bold">SECTION A-A</text>
      {/* cutting plane arrows */}
      <text x={ox - 8} y={oy + H / 2 + 1.5} textAnchor="middle" fontSize={4} fill="#ef4444" fontWeight="bold">A</text>
      <text x={ox + W + 8} y={oy + H / 2 + 1.5} textAnchor="middle" fontSize={4} fill="#ef4444" fontWeight="bold">A</text>
      {/* outer rectangle */}
      <rect x={ox} y={oy} width={W} height={H} fill="none" stroke="#e2e8f0" strokeWidth={0.8} />
      {/* inner cutout (hollow) */}
      <rect x={ox + wallT} y={oy + wallT} width={W - wallT * 2} height={H - wallT * 2} fill="#0f172a" stroke="#e2e8f0" strokeWidth={0.6} />
      {/* cross-hatching on the solid sections (45° lines) */}
      <defs>
        <pattern id="hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="3" stroke="#ef4444" strokeWidth="0.3" opacity="0.5" />
        </pattern>
        <clipPath id="section-clip-top">
          <rect x={ox} y={oy} width={W} height={wallT} />
        </clipPath>
        <clipPath id="section-clip-bottom">
          <rect x={ox} y={oy + H - wallT} width={W} height={wallT} />
        </clipPath>
        <clipPath id="section-clip-left">
          <rect x={ox} y={oy} width={wallT} height={H} />
        </clipPath>
        <clipPath id="section-clip-right">
          <rect x={ox + W - wallT} y={oy} width={wallT} height={H} />
        </clipPath>
      </defs>
      <rect x={ox} y={oy} width={W} height={wallT} fill="url(#hatch)" clipPath="url(#section-clip-top)" />
      <rect x={ox} y={oy + H - wallT} width={W} height={wallT} fill="url(#hatch)" clipPath="url(#section-clip-bottom)" />
      <rect x={ox} y={oy} width={wallT} height={H} fill="url(#hatch)" clipPath="url(#section-clip-left)" />
      <rect x={ox + W - wallT} y={oy} width={wallT} height={H} fill="url(#hatch)" clipPath="url(#section-clip-right)" />
      {/* wall thickness dimension */}
      <DimH x1={ox} x2={ox + wallT} y={oy + H} label="8.00" offset={6} />
    </g>
  );
}

/** SVG Title Block */
function TitleBlockSVG({ tb, svgW, svgH }: { tb: TitleBlock; svgW: number; svgH: number }) {
  const bx = svgW - MARGIN - TB_W;
  const by = svgH - MARGIN - TB_H;
  const rowH = 8;

  const rows: { label: string; value: string; col: 0 | 1 }[] = [
    { label: "TITLE", value: tb.title, col: 0 },
    { label: "PART NO.", value: tb.partNo, col: 1 },
    { label: "DRAWN BY", value: tb.drawnBy, col: 0 },
    { label: "DATE", value: tb.date, col: 1 },
    { label: "MATERIAL", value: tb.material, col: 0 },
    { label: "REV", value: tb.rev, col: 1 },
    { label: "SCALE", value: tb.scale, col: 0 },
    { label: "SHEET", value: tb.sheet, col: 1 },
    { label: "CHECKED", value: tb.checkedBy, col: 0 },
    { label: "PROJECT", value: tb.project, col: 1 },
  ];

  return (
    <g>
      {/* border */}
      <rect x={bx} y={by} width={TB_W} height={TB_H} fill="#0d1117" stroke="#475569" strokeWidth={0.6} />
      {/* header */}
      <rect x={bx} y={by} width={TB_W} height={8} fill="#1e293b" stroke="#475569" strokeWidth={0.4} />
      <text x={bx + TB_W / 2} y={by + 5.5} textAnchor="middle" fontSize={3.5} fill="#00D4FF" fontWeight="bold">
        SHILPASUTRA ENGINEERING
      </text>
      {/* grid cells */}
      {rows.map((r, i) => {
        const row = Math.floor(i / 2);
        const cx = bx + r.col * (TB_W / 2);
        const cy = by + 8 + row * rowH;
        return (
          <g key={i}>
            <rect x={cx} y={cy} width={TB_W / 2} height={rowH} fill="none" stroke="#334155" strokeWidth={0.3} />
            <text x={cx + 2} y={cy + 3} fontSize={2} fill="#64748b">{r.label}</text>
            <text x={cx + 2} y={cy + 6.5} fontSize={2.8} fill="#e2e8f0" fontWeight={r.label === "REV" ? "bold" : "normal"}>{r.value}</text>
          </g>
        );
      })}
    </g>
  );
}

// ── Main Page ───────────────────────────────────────────────
export default function DrawingsPage() {
  const [paperSize, setPaperSize] = useState<PaperSize>("A3");
  const [activeView, setActiveView] = useState<ViewType | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [standard, setStandard] = useState<"ISO" | "ASME">("ISO");
  const [titleBlock, setTitleBlock] = useState<TitleBlock>({
    title: "Bracket Assembly",
    partNo: "SS-BRK-001",
    rev: "A",
    material: "Al 6061-T6",
    drawnBy: "ShilpaSutra AI",
    date: "2026-03-20",
    checkedBy: "—",
    scale: "1:1",
    sheet: "1 of 1",
    project: "ShilpaSutra Demo",
  });
  const [editingTitle, setEditingTitle] = useState(false);

  const paper = paperSizes[paperSize];
  const svgW = paper.w;
  const svgH = paper.h;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Toolbar */}
      <div className="bg-[#161b22] border-b border-[#21262d] px-3 py-1.5 flex items-center gap-2 shrink-0">
        <span className="text-xs font-bold text-[#00D4FF]">2D Drawings</span>
        <div className="h-4 w-px bg-[#21262d] mx-1" />

        {/* View selector */}
        <span className="text-[9px] text-slate-500 uppercase">Highlight:</span>
        {(["front", "top", "right", "isometric", "section"] as ViewType[]).map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(activeView === v ? null : v)}
            className={`px-2 py-1 rounded text-[10px] capitalize ${
              activeView === v ? "bg-[#00D4FF] text-black font-bold" : "bg-[#21262d] text-slate-400 hover:text-white"
            }`}
          >
            {v}
          </button>
        ))}

        <div className="h-4 w-px bg-[#21262d] mx-1" />

        <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} className="accent-[#00D4FF]" />
          Grid
        </label>

        <select
          value={standard}
          onChange={(e) => setStandard(e.target.value as "ISO" | "ASME")}
          className="bg-[#21262d] text-xs text-white rounded px-2 py-1 border border-[#30363d] ml-2"
        >
          <option value="ISO">ISO 128</option>
          <option value="ASME">ASME Y14.5</option>
        </select>

        <select
          value={paperSize}
          onChange={(e) => setPaperSize(e.target.value as PaperSize)}
          className="bg-[#21262d] text-xs text-white rounded px-2 py-1 border border-[#30363d]"
        >
          {(Object.keys(paperSizes) as PaperSize[]).map((sz) => (
            <option key={sz} value={sz}>{paperSizes[sz].label}</option>
          ))}
        </select>

        <div className="flex-1" />
        <button className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-xs font-bold text-white">
          Export PDF
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar: title block editor */}
        <div className="w-56 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Title Block</span>
              <button onClick={() => setEditingTitle(!editingTitle)} className="text-[9px] text-[#00D4FF] hover:text-white">
                {editingTitle ? "Done" : "Edit"}
              </button>
            </div>
            {editingTitle ? (
              <div className="space-y-1.5">
                {(Object.keys(titleBlock) as (keyof TitleBlock)[]).map((key) => (
                  <div key={key} className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-500 w-14 capitalize shrink-0">{key.replace(/([A-Z])/g, " $1")}</span>
                    <input
                      type="text"
                      value={titleBlock[key]}
                      onChange={(e) => setTitleBlock((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="flex-1 bg-[#0d1117] text-[10px] text-white rounded px-1.5 py-0.5 border border-[#21262d]"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[9px] space-y-1">
                {(Object.keys(titleBlock) as (keyof TitleBlock)[]).map((key) => (
                  <div key={key} className="text-slate-500">
                    {key.replace(/([A-Z])/g, " $1")}: <span className="text-white">{titleBlock[key]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Drawing info */}
          <div className="px-3 py-2 border-t border-[#21262d] mt-auto">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Drawing Info</div>
            <div className="text-[9px] space-y-1 text-slate-500">
              <div>Paper: <span className="text-white">{paper.label}</span></div>
              <div>Standard: <span className="text-white">{standard}</span></div>
              <div>Projection: <span className="text-white">{standard === "ISO" ? "First Angle" : "Third Angle"}</span></div>
              <div>Units: <span className="text-white">mm</span></div>
              <div>Views: <span className="text-white">5 (Front, Top, Right, Iso, Section)</span></div>
            </div>
          </div>
        </div>

        {/* Drawing canvas */}
        <div className="flex-1 flex items-center justify-center bg-[#080c12] overflow-auto p-6">
          <div className="shadow-2xl" style={{ maxWidth: "100%", maxHeight: "100%" }}>
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              width="100%"
              style={{ maxHeight: "calc(100vh - 120px)", background: "#0d1117", borderRadius: 4, border: "1px solid #21262d" }}
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Grid */}
              {showGrid && (
                <>
                  <defs>
                    <pattern id="smallGrid" width="5" height="5" patternUnits="userSpaceOnUse">
                      <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#1e293b" strokeWidth="0.15" />
                    </pattern>
                    <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
                      <rect width="25" height="25" fill="url(#smallGrid)" />
                      <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1e293b" strokeWidth="0.3" />
                    </pattern>
                  </defs>
                  <rect x={MARGIN} y={MARGIN} width={svgW - MARGIN * 2} height={svgH - MARGIN * 2} fill="url(#grid)" />
                </>
              )}

              {/* Drawing border */}
              <rect x={MARGIN} y={MARGIN} width={svgW - MARGIN * 2} height={svgH - MARGIN * 2} fill="none" stroke="#475569" strokeWidth={0.8} />
              {/* Inner border */}
              <rect x={MARGIN + 1} y={MARGIN + 1} width={svgW - MARGIN * 2 - 2} height={svgH - MARGIN * 2 - 2} fill="none" stroke="#334155" strokeWidth={0.3} />

              {/* Projection symbol (ISO first angle) */}
              <g transform={`translate(${MARGIN + 8},${svgH - MARGIN - 12})`}>
                <circle cx={0} cy={4} r={3} fill="none" stroke="#64748b" strokeWidth={0.3} />
                <line x1={-3} y1={4} x2={3} y2={4} stroke="#64748b" strokeWidth={0.3} />
                <line x1={0} y1={1} x2={0} y2={7} stroke="#64748b" strokeWidth={0.3} />
                <text x={5} y={5.5} fontSize={2.5} fill="#64748b">
                  {standard === "ISO" ? "1st Angle" : "3rd Angle"}
                </text>
              </g>

              {/* ── Orthographic views ── */}
              {/* Front view (top-left quadrant) */}
              <g opacity={activeView && activeView !== "front" ? 0.3 : 1}>
                <FrontView x={30} y={20} />
              </g>

              {/* Top view (below front) */}
              <g opacity={activeView && activeView !== "top" ? 0.3 : 1}>
                <TopView x={30} y={100} />
              </g>

              {/* Right view (right of front) */}
              <g opacity={activeView && activeView !== "right" ? 0.3 : 1}>
                <RightView x={140} y={20} />
              </g>

              {/* Isometric view (top-right area) */}
              <g opacity={activeView && activeView !== "isometric" ? 0.3 : 1}>
                <IsoView x={220} y={60} />
              </g>

              {/* Section view (bottom-right area) */}
              <g opacity={activeView && activeView !== "section" ? 0.3 : 1}>
                <SectionView x={200} y={150} />
              </g>

              {/* Section cutting plane indicator on front view */}
              <line x1={30 + 40} y1={16} x2={30 + 40} y2={74} stroke="#ef4444" strokeWidth={0.5} strokeDasharray="6,2,1,2" />
              <text x={30 + 40 - 3} y={15} fontSize={3} fill="#ef4444" fontWeight="bold">A</text>
              <text x={30 + 40 - 3} y={77} fontSize={3} fill="#ef4444" fontWeight="bold">A</text>

              {/* Title Block */}
              <TitleBlockSVG tb={titleBlock} svgW={svgW} svgH={svgH} />
            </svg>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 py-1 bg-[#161b22] border-t border-[#21262d] text-[10px] text-slate-500 shrink-0">
        <span>Paper: {paper.label}</span>
        <span>Scale: {titleBlock.scale}</span>
        <span>Standard: {standard}</span>
        <span>Grid: {showGrid ? "ON" : "OFF"}</span>
        {activeView && <span>Highlight: <span className="text-[#00D4FF] capitalize">{activeView}</span></span>}
        <span className="ml-auto">Drawing Engine v2.0 | SVG Renderer</span>
      </div>
    </div>
  );
}
