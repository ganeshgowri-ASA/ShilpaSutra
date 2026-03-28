"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// DrawingCanvas — Unified canvas for rendering drawings with zoom/pan & export
// Uses the drawingEngine for all rendering; supports PNG, SVG, DXF export.
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useState, useCallback, useEffect } from "react";
import type { Drawing, Viewport } from "@/lib/drawingEngine";
import { renderDrawingToSVG, renderDrawingToCanvas, createA3Viewport } from "@/lib/drawingEngine";

// ── Props ───────────────────────────────────────────────────────────────────

interface DrawingCanvasProps {
  /** The drawing to render. */
  drawing: Readonly<Drawing>;
  /** Render mode: SVG (vector) or Canvas (raster). */
  mode?: "svg" | "canvas";
  /** Class name for the outer container. */
  className?: string;
  /** Callback when Ctrl+S is pressed. */
  onSave?: () => void;
  /** Callback when Ctrl+Z is pressed. */
  onUndo?: () => void;
  /** Callback when Ctrl+Y is pressed. */
  onRedo?: () => void;
  /** Callback when Ctrl+E is pressed. */
  onExport?: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function DrawingCanvas({
  drawing,
  mode = "svg",
  className = "",
  onSave,
  onUndo,
  onRedo,
  onExport,
}: DrawingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [viewport, setViewport] = useState<Viewport>(createA3Viewport);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);

  // ── Zoom ────────────────────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setViewport(vp => ({
      ...vp,
      zoom: Math.max(0.1, Math.min(10, vp.zoom * factor)),
    }));
  }, []);

  // ── Pan ─────────────────────────────────────────────────────────────

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

  // ── Keyboard shortcuts ──────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      switch (e.key.toLowerCase()) {
        case 'z': e.preventDefault(); onUndo?.(); break;
        case 'y': e.preventDefault(); onRedo?.(); break;
        case 's': e.preventDefault(); onSave?.(); break;
        case 'e': e.preventDefault(); onExport?.(); break;
        case '0': e.preventDefault(); setViewport(createA3Viewport()); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onUndo, onRedo, onSave, onExport]);

  // ── Canvas rendering ────────────────────────────────────────────────

  useEffect(() => {
    if (mode !== "canvas" || !canvasRef.current) return;
    renderDrawingToCanvas(drawing, canvasRef.current, viewport);
  }, [drawing, viewport, mode]);

  // ── Export Functions ────────────────────────────────────────────────

  const exportSVG = useCallback(() => {
    const svg = renderDrawingToSVG(drawing, viewport);
    downloadBlob(svg, `${drawing.title}.svg`, 'image/svg+xml');
  }, [drawing, viewport]);

  const exportPNG = useCallback(() => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = viewport.width * 2;
    tempCanvas.height = viewport.height * 2;
    renderDrawingToCanvas(drawing, tempCanvas, viewport);
    tempCanvas.toBlob(blob => {
      if (blob) downloadBlob(blob, `${drawing.title}.png`, 'image/png');
    });
  }, [drawing, viewport]);

  // ── Render ──────────────────────────────────────────────────────────

  const svgString = mode === "svg" ? renderDrawingToSVG(drawing, viewport) : "";

  return (
    <div className={`relative flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b text-sm">
        <span className="font-semibold text-gray-700 truncate">{drawing.title}</span>
        <span className="text-gray-400">|</span>
        <span className="text-gray-500">{drawing.standard}</span>
        <div className="flex-1" />
        <button onClick={() => setViewport(vp => ({ ...vp, zoom: Math.min(10, vp.zoom * 1.2) }))}
          className="px-2 py-0.5 rounded hover:bg-gray-200" title="Zoom In">+</button>
        <span className="text-xs text-gray-500 w-12 text-center">{Math.round(viewport.zoom * 100)}%</span>
        <button onClick={() => setViewport(vp => ({ ...vp, zoom: Math.max(0.1, vp.zoom / 1.2) }))}
          className="px-2 py-0.5 rounded hover:bg-gray-200" title="Zoom Out">−</button>
        <button onClick={() => setViewport(createA3Viewport())}
          className="px-2 py-0.5 rounded hover:bg-gray-200 text-xs" title="Reset View (Ctrl+0)">Reset</button>
        <span className="text-gray-300">|</span>
        <button onClick={exportSVG}
          className="px-2 py-0.5 rounded hover:bg-blue-100 text-blue-600 text-xs font-medium">SVG</button>
        <button onClick={exportPNG}
          className="px-2 py-0.5 rounded hover:bg-blue-100 text-blue-600 text-xs font-medium">PNG</button>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-gray-100 cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {mode === "svg" ? (
          <div
            className="w-full h-full flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: svgString.replace(/^<\?xml[^?]*\?>\s*/, '') }}
          />
        ) : (
          <canvas ref={canvasRef} className="w-full h-full" />
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-3 py-1 bg-gray-50 border-t text-xs text-gray-500">
        <span>Layers: {drawing.layers.filter(l => l.visible).length}/{drawing.layers.length}</span>
        <span>Scale: 1:{drawing.scale}</span>
        <span>Zoom: {Math.round(viewport.zoom * 100)}%</span>
        <span className="flex-1" />
        <span>Shift+Drag to pan · Scroll to zoom · Ctrl+0 to reset</span>
      </div>
    </div>
  );
}

// ── Download Helper ─────────────────────────────────────────────────────────

function downloadBlob(data: string | Blob, filename: string, mimeType: string): void {
  const blob = typeof data === 'string' ? new Blob([data], { type: mimeType }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
