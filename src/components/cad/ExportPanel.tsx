"use client";
import { useState, useCallback } from "react";
import {
  X, Download, Image, FileText, Box, File, Database, Clock, CheckCircle, AlertCircle,
} from "lucide-react";
import { useCadStore, type CadObject } from "@/stores/cad-store";
import {
  geometryToExportMesh,
  exportSTLAscii,
  exportOBJ,
  type ExportMesh,
} from "@/lib/export-engine";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find the Three.js canvas in the DOM */
function getViewportCanvas(): HTMLCanvasElement | null {
  return document.querySelector("canvas[data-engine]") as HTMLCanvasElement | null;
}

/** Build a THREE.BufferGeometry for a CadObject */
function cadObjectToGeometry(obj: CadObject): THREE.BufferGeometry | null {
  // Custom mesh data
  if (obj.meshVertices && obj.meshVertices.length > 0) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(obj.meshVertices, 3));
    if (obj.meshIndices && obj.meshIndices.length > 0) {
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(obj.meshIndices), 1));
    }
    geo.computeVertexNormals();
    return geo;
  }

  const { width, height, depth } = obj.dimensions;
  switch (obj.type) {
    case "box":
      return new THREE.BoxGeometry(width, height, depth);
    case "cylinder":
      return new THREE.CylinderGeometry(width, width, height, 32);
    case "sphere":
      return new THREE.SphereGeometry(width, 32, 32);
    case "cone":
      return new THREE.ConeGeometry(width, height, 32);
    default:
      return null;
  }
}

/** Apply object transform to geometry (position + rotation + scale) */
function applyTransform(geo: THREE.BufferGeometry, obj: CadObject): THREE.BufferGeometry {
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3(...obj.position);
  const rot = new THREE.Euler(...obj.rotation);
  const scl = new THREE.Vector3(...obj.scale);
  m.compose(pos, new THREE.Quaternion().setFromEuler(rot), scl);
  geo.applyMatrix4(m);
  return geo;
}

/** Collect ExportMesh for every solid object */
function collectMeshes(objects: CadObject[]): { mesh: ExportMesh; name: string }[] {
  const result: { mesh: ExportMesh; name: string }[] = [];
  for (const obj of objects) {
    if (!obj.visible) continue;
    const geo = cadObjectToGeometry(obj);
    if (!geo) continue;
    applyTransform(geo, obj);
    geo.computeVertexNormals();
    result.push({ mesh: geometryToExportMesh(geo), name: obj.name });
    geo.dispose();
  }
  return result;
}

/** Trigger a file download in the browser */
function downloadBlob(data: BlobPart, filename: string, mime: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Format a date stamp */
function dateStamp(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

// Scene units -> mm (10 scene units = 100mm)
const SCENE_TO_MM = 10;

function dimStr(obj: CadObject): string {
  const d = obj.dimensions;
  return `${(d.width * SCENE_TO_MM).toFixed(1)} x ${(d.height * SCENE_TO_MM).toFixed(1)} x ${(d.depth * SCENE_TO_MM).toFixed(1)} mm`;
}

// ---------------------------------------------------------------------------
// Export functions
// ---------------------------------------------------------------------------

async function exportPNG() {
  const canvas = getViewportCanvas();
  if (!canvas) throw new Error("Viewport canvas not found");
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `shilpasutra-${dateStamp()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function exportPDF(objects: CadObject[], projectName: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Title
  doc.setFontSize(20);
  doc.text(projectName || "ShilpaSutra Model", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Exported ${new Date().toLocaleString()}`, 14, 25);
  doc.setTextColor(0);

  // Viewport screenshot
  const canvas = getViewportCanvas();
  if (canvas) {
    try {
      const imgData = canvas.toDataURL("image/png");
      doc.addImage(imgData, "PNG", 14, 30, 180, 100);
    } catch { /* canvas tainted - skip image */ }
  }

  // Assembly info
  const solidObjects = objects.filter(o => ["box", "cylinder", "sphere", "cone", "mesh"].includes(o.type));
  doc.setFontSize(12);
  doc.text(`Assembly: ${solidObjects.length} objects`, 14, 140);

  // BOM table header
  let y = 148;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Name", 14, y);
  doc.text("Type", 90, y);
  doc.text("Dimensions", 120, y);
  doc.text("Material", 200, y);
  doc.line(14, y + 1, 280, y + 1);
  y += 6;

  doc.setFont("helvetica", "normal");
  for (const obj of solidObjects) {
    if (y > 195) {
      doc.addPage();
      y = 14;
    }
    doc.text(obj.name.slice(0, 40), 14, y);
    doc.text(obj.type, 90, y);
    doc.text(dimStr(obj), 120, y);
    doc.text(obj.material || "-", 200, y);
    y += 5;
  }

  doc.save(`shilpasutra-${dateStamp()}.pdf`);
}

function exportSTL(objects: CadObject[]) {
  const meshes = collectMeshes(objects);
  if (meshes.length === 0) throw new Error("No solid geometry to export");
  // Combine all meshes into a single STL
  const parts = meshes.map(m => exportSTLAscii(m.mesh, m.name));
  const combined = parts.join("\n");
  downloadBlob(combined, `shilpasutra-${dateStamp()}.stl`, "model/stl");
}

function exportOBJFile(objects: CadObject[]) {
  const meshes = collectMeshes(objects);
  if (meshes.length === 0) throw new Error("No solid geometry to export");
  let vertexOffset = 0;
  const parts: string[] = [`# ShilpaSutra OBJ Export - ${new Date().toISOString()}\n`];
  for (const { mesh, name } of meshes) {
    parts.push(`o ${name}\n`);
    const vCount = mesh.vertices.length / 3;
    for (let i = 0; i < vCount; i++) {
      parts.push(`v ${mesh.vertices[i * 3].toFixed(6)} ${mesh.vertices[i * 3 + 1].toFixed(6)} ${mesh.vertices[i * 3 + 2].toFixed(6)}\n`);
    }
    if (mesh.normals) {
      for (let i = 0; i < vCount; i++) {
        parts.push(`vn ${mesh.normals[i * 3].toFixed(6)} ${mesh.normals[i * 3 + 1].toFixed(6)} ${mesh.normals[i * 3 + 2].toFixed(6)}\n`);
      }
    }
    if (mesh.indices) {
      for (let i = 0; i < mesh.indices.length; i += 3) {
        const a = mesh.indices[i] + vertexOffset + 1;
        const b = mesh.indices[i + 1] + vertexOffset + 1;
        const c = mesh.indices[i + 2] + vertexOffset + 1;
        if (mesh.normals) {
          parts.push(`f ${a}//${a} ${b}//${b} ${c}//${c}\n`);
        } else {
          parts.push(`f ${a} ${b} ${c}\n`);
        }
      }
    } else {
      const triCount = vCount / 3;
      for (let i = 0; i < triCount; i++) {
        const a = i * 3 + vertexOffset + 1;
        parts.push(`f ${a} ${a + 1} ${a + 2}\n`);
      }
    }
    vertexOffset += vCount;
  }
  downloadBlob(parts.join(""), `shilpasutra-${dateStamp()}.obj`, "model/obj");
}

function exportDXF(objects: CadObject[]) {
  const solidObjects = objects.filter(o => o.visible && ["box", "cylinder", "sphere", "cone", "mesh"].includes(o.type));
  if (solidObjects.length === 0) throw new Error("No geometry to export");

  const lines: string[] = [];
  // DXF header
  lines.push("0", "SECTION", "2", "HEADER", "0", "ENDSEC");
  lines.push("0", "SECTION", "2", "ENTITIES");

  for (const obj of solidObjects) {
    const [px, py] = [obj.position[0], obj.position[2]]; // top-down XZ projection
    const { width, depth } = obj.dimensions;
    const hw = width / 2;
    const hd = depth / 2;

    if (obj.type === "cylinder" || obj.type === "sphere") {
      // Circle in XZ plane
      lines.push("0", "CIRCLE", "8", "0");
      lines.push("10", px.toFixed(6), "20", py.toFixed(6), "30", "0.0");
      lines.push("40", (width).toFixed(6)); // radius
    } else {
      // Rectangle outline in XZ plane
      const corners = [
        [px - hw, py - hd],
        [px + hw, py - hd],
        [px + hw, py + hd],
        [px - hw, py + hd],
      ];
      for (let i = 0; i < 4; i++) {
        const [x1, y1] = corners[i];
        const [x2, y2] = corners[(i + 1) % 4];
        lines.push("0", "LINE", "8", "0");
        lines.push("10", x1.toFixed(6), "20", y1.toFixed(6), "30", "0.0");
        lines.push("11", x2.toFixed(6), "21", y2.toFixed(6), "31", "0.0");
      }
    }
  }

  lines.push("0", "ENDSEC", "0", "EOF");
  downloadBlob(lines.join("\n"), `shilpasutra-${dateStamp()}.dxf`, "application/dxf");
}

function exportJSON(objects: CadObject[]) {
  const data = {
    format: "shilpasutra-scene",
    version: 1,
    exportedAt: new Date().toISOString(),
    objectCount: objects.length,
    objects,
  };
  downloadBlob(JSON.stringify(data, null, 2), `shilpasutra-${dateStamp()}.json`, "application/json");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ExportStatus = "idle" | "running" | "done" | "error";

interface FormatEntry {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  disabled?: boolean;
  tag?: string;
}

const FORMATS: FormatEntry[] = [
  { id: "png",  label: "Screenshot (PNG)", desc: "High-res viewport capture", icon: <Image size={16} /> },
  { id: "pdf",  label: "PDF Report",       desc: "Screenshot + BOM table",     icon: <FileText size={16} /> },
  { id: "stl",  label: "STL (3D Print)",   desc: "ASCII STL mesh export",      icon: <Box size={16} /> },
  { id: "obj",  label: "OBJ (Wavefront)",  desc: "Mesh with normals",          icon: <Box size={16} /> },
  { id: "step", label: "STEP / IGES",      desc: "Requires OpenCascade",       icon: <File size={16} />, disabled: true, tag: "Coming Soon" },
  { id: "dxf",  label: "DXF (2D Drawing)", desc: "Top-down outline projection", icon: <File size={16} /> },
  { id: "json", label: "JSON Scene",       desc: "Full scene data (re-import)", icon: <Database size={16} /> },
];

export default function ExportPanel({ onClose }: { onClose: () => void }) {
  const objects = useCadStore((s) => s.objects);
  const [status, setStatus] = useState<Record<string, ExportStatus>>({});
  const [error, setError] = useState<string | null>(null);

  const solidCount = objects.filter(o => ["box", "cylinder", "sphere", "cone", "mesh"].includes(o.type)).length;

  const runExport = useCallback(async (formatId: string) => {
    setError(null);
    setStatus(prev => ({ ...prev, [formatId]: "running" }));
    try {
      switch (formatId) {
        case "png":  await exportPNG(); break;
        case "pdf":  await exportPDF(objects, "ShilpaSutra Model"); break;
        case "stl":  exportSTL(objects); break;
        case "obj":  exportOBJFile(objects); break;
        case "dxf":  exportDXF(objects); break;
        case "json": exportJSON(objects); break;
        default: break;
      }
      setStatus(prev => ({ ...prev, [formatId]: "done" }));
      setTimeout(() => setStatus(prev => ({ ...prev, [formatId]: "idle" })), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Export failed";
      setError(msg);
      setStatus(prev => ({ ...prev, [formatId]: "error" }));
      setTimeout(() => setStatus(prev => ({ ...prev, [formatId]: "idle" })), 3000);
    }
  }, [objects]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl w-[480px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#21262d]">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Download size={16} className="text-cyan-400" />
              Export Model
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {objects.length} objects &middot; {solidCount} solid bodies
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#21262d] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-3 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] flex items-center gap-2">
            <AlertCircle size={12} />
            {error}
          </div>
        )}

        {/* Format list */}
        <div className="p-4 space-y-2">
          {FORMATS.map((fmt) => {
            const st = status[fmt.id] || "idle";
            return (
              <button
                key={fmt.id}
                disabled={fmt.disabled || st === "running"}
                onClick={() => !fmt.disabled && runExport(fmt.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-150 group ${
                  fmt.disabled
                    ? "opacity-40 cursor-not-allowed bg-[#0d1117]"
                    : "bg-[#0d1117] hover:bg-[#1c2333] border border-transparent hover:border-cyan-500/30 cursor-pointer"
                }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${
                  fmt.disabled ? "bg-[#161b22] text-slate-600" : "bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20"
                }`}>
                  {fmt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                    {fmt.label}
                    {fmt.tag && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">
                        {fmt.tag}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500">{fmt.desc}</div>
                </div>
                <div className="flex-shrink-0 w-6 flex items-center justify-center">
                  {st === "running" && <Clock size={14} className="text-cyan-400 animate-spin" />}
                  {st === "done" && <CheckCircle size={14} className="text-green-400" />}
                  {st === "error" && <AlertCircle size={14} className="text-red-400" />}
                  {st === "idle" && !fmt.disabled && (
                    <Download size={14} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#21262d] flex items-center justify-between">
          <span className="text-[10px] text-slate-600">Units: mm &middot; Scene scale: 10mm = 1 unit</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-[10px] font-medium bg-[#21262d] hover:bg-[#30363d] text-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
