"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// PVModuleDrawingView — A1 landscape renderer for PV module and array drawings
// Uses the unified drawingEngine to render multi-view engineering sheets.
// Supports PDF export via browser print API.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useRef } from "react";
import type { Drawing, Viewport } from "@/lib/drawingEngine";
import { renderDrawingToSVG } from "@/lib/drawingEngine";
import { createPVModuleDrawing } from "@/lib/pvModuleDrawing";
import { createPVArrayDrawing } from "@/lib/pvArrayDrawing";

// ── Types ──────────────────────────────────────────────────────────────────

type PVDrawingType = "pvModule" | "pvArray";

interface PVModuleDrawingViewProps {
  /** Which PV drawing to show. */
  drawingType: PVDrawingType;
  /** Callback to navigate back. */
  onBack?: () => void;
}

// ── A1 Landscape Viewport (841×594mm) ──────────────────────────────────────

function createA1Viewport(): Viewport {
  return Object.freeze({ width: 841, height: 594, panX: 0, panY: 0, zoom: 1 });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function PVModuleDrawingView({ drawingType, onBack }: PVModuleDrawingViewProps) {
  const [viewport, setViewport] = useState<Viewport>(createA1Viewport);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);

  // Build the drawing (memoised — pure data, no side effects)
  const drawing: Readonly<Drawing> = useMemo(() => {
    return drawingType === "pvModule"
      ? createPVModuleDrawing()
      : createPVArrayDrawing();
  }, [drawingType]);

  // Render SVG string
  const svgString = useMemo(() => {
    return renderDrawingToSVG(drawing, viewport);
  }, [drawing, viewport]);

  // ── Zoom ──────────────────────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setViewport(vp => ({
      ...vp,
      zoom: Math.max(0.1, Math.min(10, vp.zoom * factor)),
    }));
  }, []);

  // ── Pan ───────────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !panStart) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    setPanStart({ x: e.clientX, y: e.clientY });
    setViewport(vp => ({ ...vp, panX: vp.panX + dx, panY: vp.panY + dy }));
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setPanStart(null);
  }, []);

  // ── Export SVG ────────────────────────────────────────────────────────

  const exportSVG = useCallback(() => {
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${drawing.id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [svgString, drawing.id]);

  // ── Export PDF (browser print) ────────────────────────────────────────

  const exportPDF = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const cleanSvg = svgString.replace(/^<\?xml[^?]*\?>\s*/, "");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>${drawing.title}</title>
      <style>
        @page { size: 841mm 594mm landscape; margin: 0; }
        body { margin: 0; display: flex; align-items: center; justify-content: center; }
        svg { width: 100vw; height: 100vh; }
      </style></head>
      <body>${cleanSvg}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [svgString, drawing.title]);

  // ── Reset viewport ────────────────────────────────────────────────────

  const resetView = useCallback(() => {
    setViewport(createA1Viewport());
  }, []);

  // ── Drawing metadata ──────────────────────────────────────────────────

  const meta = drawing.titleBlock;
  const label = drawingType === "pvModule"
    ? "PV Module 540Wp Bifacial"
    : "PV Array 24-Module Ground Mount";

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-white">
      {/* ── Header bar ── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#161b22] border-b border-[#21262d] shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded border border-[#21262d] hover:border-[#30363d] transition-colors"
          >
            &larr; Back
          </button>
        )}
        <span className="text-[12px] font-semibold text-white">{label}</span>
        <span className="text-[10px] text-slate-500">{meta?.standard ?? ""}</span>
        <span className="ml-auto text-[10px] text-slate-600">
          Part No: {meta?.partNo ?? ""} &middot; Scale: {meta?.scale ?? ""}
        </span>
        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={() => setViewport(vp => ({ ...vp, zoom: Math.min(10, vp.zoom * 1.2) }))}
            className="text-[11px] px-2 py-0.5 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-300"
          >
            +
          </button>
          <span className="text-[10px] text-slate-500 w-10 text-center">
            {Math.round(viewport.zoom * 100)}%
          </span>
          <button
            onClick={() => setViewport(vp => ({ ...vp, zoom: Math.max(0.1, vp.zoom / 1.2) }))}
            className="text-[11px] px-2 py-0.5 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-300"
          >
            &minus;
          </button>
          <button
            onClick={resetView}
            className="text-[10px] px-2 py-0.5 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-300 ml-1"
          >
            Reset
          </button>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={exportSVG}
            className="text-[10px] px-2 py-0.5 rounded bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 font-medium"
          >
            SVG
          </button>
          <button
            onClick={exportPDF}
            className="text-[10px] px-2 py-0.5 rounded bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 font-medium"
          >
            PDF
          </button>
        </div>
      </div>

      {/* ── Drawing canvas ── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex items-start justify-center cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="bg-white rounded shadow-xl"
          style={{ width: "100%", maxWidth: 1100, aspectRatio: "841/594" }}
          dangerouslySetInnerHTML={{ __html: svgString.replace(/^<\?xml[^?]*\?>\s*/, "") }}
        />
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center gap-4 px-4 py-1 bg-[#161b22] border-t border-[#21262d] text-[10px] text-slate-500">
        <span>Layers: {drawing.layers.filter(l => l.visible).length}/{drawing.layers.length}</span>
        <span>Sheet: A1 Landscape (841x594mm)</span>
        <span>Zoom: {Math.round(viewport.zoom * 100)}%</span>
        <span className="flex-1" />
        <span>Shift+Drag to pan &middot; Scroll to zoom</span>
      </div>
    </div>
  );
}
