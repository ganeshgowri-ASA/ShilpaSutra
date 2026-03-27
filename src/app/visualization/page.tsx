"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { parseIFC, type IfcParseResult, type IfcSpatialNode, type IfcMeshData, CATEGORY_COLORS } from "@/lib/ifc-engine";
import { BimMetadataPanel } from "@/components/bim/BimMetadataPanel";

/* ── Canvas-based simple IFC viewer ─────────────────────── */
interface ViewerState {
  rotX: number;
  rotY: number;
  zoom: number;
  panX: number;
  panY: number;
}

const INITIAL_VIEW: ViewerState = { rotX: -0.4, rotY: 0.5, zoom: 1, panX: 0, panY: 0 };

function project3D(
  x: number, y: number, z: number,
  view: ViewerState,
  w: number, h: number
): [number, number, number] {
  // Apply rotation
  const cosX = Math.cos(view.rotX), sinX = Math.sin(view.rotX);
  const cosY = Math.cos(view.rotY), sinY = Math.sin(view.rotY);

  // Rotate Y
  const x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;
  // Rotate X
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;

  // Perspective projection
  const fov = 500 * view.zoom;
  const depth = z2 + 30;
  const px = (x1 * fov) / depth + w / 2 + view.panX;
  const py = (-y2 * fov) / depth + h / 2 + view.panY;
  return [px, py, depth];
}

function drawIFCScene(
  ctx: CanvasRenderingContext2D,
  meshes: IfcMeshData[],
  view: ViewerState,
  selectedId: number | null
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(0, 0, w, h);

  // Draw grid
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let i = -10; i <= 10; i++) {
    const [ax, ay] = project3D(i * 2, 0, -20, view, w, h);
    const [bx, by] = project3D(i * 2, 0, 20, view, w, h);
    const [cx, cy] = project3D(-20, 0, i * 2, view, w, h);
    const [dx, dy] = project3D(20, 0, i * 2, view, w, h);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(dx, dy); ctx.stroke();
  }

  // Sort meshes by depth (painter's algorithm)
  const sorted = [...meshes].sort((a, b) => {
    const [,,da] = project3D(a.position[0], a.position[1], a.position[2], view, w, h);
    const [,,db] = project3D(b.position[0], b.position[1], b.position[2], view, w, h);
    return db - da;
  });

  for (const mesh of sorted) {
    const [r, g, bl] = mesh.color;
    const isSelected = mesh.entityId === selectedId;
    const alpha = isSelected ? 1.0 : 0.75;

    // Draw as a simple box outline + filled face using projected corners
    const d = mesh.dimensions;
    const [px, py, pz] = mesh.position;
    const hw = d.width / 2, hh = d.height / 2, hd = d.depth / 2;

    const corners3D: [number, number, number][] = [
      [px-hw, py-hh, pz-hd], [px+hw, py-hh, pz-hd],
      [px+hw, py+hh, pz-hd], [px-hw, py+hh, pz-hd],
      [px-hw, py-hh, pz+hd], [px+hw, py-hh, pz+hd],
      [px+hw, py+hh, pz+hd], [px-hw, py+hh, pz+hd],
    ];
    const pts = corners3D.map(([x, y, z]) => project3D(x, y, z, view, w, h));

    // Faces: front, back, top, right
    const faces = [
      [4,5,6,7], // back face
      [0,1,2,3], // front face
      [3,2,6,7], // top
      [1,5,6,2], // right
    ];

    const lightFactors = [0.7, 1.0, 0.85, 0.6];
    for (let fi = 0; fi < faces.length; fi++) {
      const face = faces[fi];
      const lf = lightFactors[fi];
      const fr = Math.min(1, r * lf);
      const fg = Math.min(1, g * lf);
      const fb = Math.min(1, bl * lf);
      ctx.fillStyle = `rgba(${Math.round(fr*255)},${Math.round(fg*255)},${Math.round(fb*255)},${alpha})`;
      ctx.strokeStyle = isSelected ? "#00ffaa" : "rgba(0,0,0,0.3)";
      ctx.lineWidth = isSelected ? 2 : 0.5;
      ctx.beginPath();
      ctx.moveTo(pts[face[0]][0], pts[face[0]][1]);
      for (let i = 1; i < face.length; i++) ctx.lineTo(pts[face[i]][0], pts[face[i]][1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Label for selected
    if (isSelected) {
      const [lx, ly] = project3D(px, py + hh + 0.5, pz, view, w, h);
      ctx.fillStyle = "#00ffaa";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(mesh.name, lx, ly);
    }
  }
}

/* ── Page component ─────────────────────────────────────── */
export default function VisualizationPage() {
  const [ifcResult, setIfcResult] = useState<IfcParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedMeshId, setSelectedMeshId] = useState<number | null>(null);
  const [view, setView] = useState<ViewerState>(INITIAL_VIEW);
  const [dragging, setDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [dragOver, setDragOver] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redraw canvas on state change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ifcResult) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawIFCScene(ctx, ifcResult.meshes, view, selectedMeshId);
  }, [ifcResult, view, selectedMeshId]);

  const loadIFC = useCallback((text: string, name: string) => {
    const result = parseIFC(text);
    setIfcResult(result);
    setFileName(name);
    setSelectedMeshId(null);
    setView(INITIAL_VIEW);
  }, []);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => loadIFC(e.target?.result as string, file.name);
    reader.readAsText(file);
  }, [loadIFC]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // Mouse orbit controls
  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    if (e.buttons === 1) {
      setView((v) => ({ ...v, rotY: v.rotY + dx * 0.008, rotX: v.rotX + dy * 0.008 }));
    } else if (e.buttons === 4) {
      setView((v) => ({ ...v, panX: v.panX + dx, panY: v.panY + dy }));
    }
    setLastMouse({ x: e.clientX, y: e.clientY });
  };
  const onMouseUp = () => setDragging(false);
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setView((v) => ({ ...v, zoom: Math.max(0.1, Math.min(5, v.zoom * (1 - e.deltaY * 0.001))) }));
  };

  // Canvas click → pick mesh
  const onCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ifcResult || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    // Find closest mesh to click point
    let best: IfcMeshData | null = null;
    let bestDist = 30;
    for (const mesh of ifcResult.meshes) {
      const [px, py] = project3D(mesh.position[0], mesh.position[1], mesh.position[2], view, w, h);
      const dist = Math.sqrt((px - mx) ** 2 + (py - my) ** 2);
      if (dist < bestDist) { bestDist = dist; best = mesh; }
    }
    setSelectedMeshId(best?.entityId ?? null);
  }, [ifcResult, view]);

  const selectedMesh = ifcResult?.meshes.find((m) => m.entityId === selectedMeshId) ?? null;
  const selectedEntity = selectedMeshId ? ifcResult?.entities.get(selectedMeshId) ?? null : null;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="h-12 border-b border-[#1a1a2e] flex items-center px-4 gap-3 shrink-0">
        <span className="text-emerald-400 font-bold text-sm">BIM</span>
        <span className="text-slate-400 text-xs">IFC Visualization Viewer</span>
        {ifcResult && (
          <>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-300 truncate max-w-[200px]">{fileName}</span>
            <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
              {ifcResult.schema}
            </span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            Load IFC
          </button>
          {ifcResult && (
            <button
              onClick={() => setShowPanel(!showPanel)}
              className="px-3 py-1.5 text-xs bg-[#1a1a2e] text-slate-400 rounded border border-[#252540] hover:bg-[#252540] transition-colors"
            >
              {showPanel ? "Hide" : "Show"} Panel
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept=".ifc" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 3D Canvas */}
        <div
          className="flex-1 relative"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {!ifcResult ? (
            <div className={`absolute inset-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 transition-colors cursor-pointer
              ${dragOver ? "border-emerald-400 bg-emerald-400/5" : "border-[#252540] hover:border-emerald-400/40"}`}
              onClick={() => fileInputRef.current?.click()}>
              <div className="text-4xl text-emerald-400/40">⬡</div>
              <div className="text-sm text-slate-400">Drop an IFC file here or click to browse</div>
              <div className="text-xs text-slate-600">Supports IFC2x3 and IFC4</div>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={800} height={600}
              className="w-full h-full cursor-grab active:cursor-grabbing"
              style={{ imageRendering: "pixelated" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onWheel={onWheel}
              onClick={onCanvasClick}
            />
          )}

          {/* Category legend */}
          {ifcResult && (
            <div className="absolute bottom-4 left-4 bg-[#0d0d14]/90 border border-[#1a1a2e] rounded-lg p-3">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Category Colors</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {(Object.entries(CATEGORY_COLORS) as [string, [number,number,number]][]).map(([cat, [r,g,b]]) => (
                  <div key={cat} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ background: `rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)})` }} />
                    <span className="text-[10px] text-slate-400 capitalize">{cat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls hint */}
          {ifcResult && (
            <div className="absolute bottom-4 right-4 text-[10px] text-slate-600 text-right">
              <div>Left drag: orbit</div>
              <div>Middle drag: pan</div>
              <div>Scroll: zoom</div>
              <div>Click: select</div>
            </div>
          )}
        </div>

        {/* Side panel */}
        {ifcResult && showPanel && (
          <BimMetadataPanel
            ifcResult={ifcResult}
            selectedMesh={selectedMesh}
            selectedEntity={selectedEntity}
            onSelectEntity={(id) => setSelectedMeshId(id)}
          />
        )}
      </div>
    </div>
  );
}
