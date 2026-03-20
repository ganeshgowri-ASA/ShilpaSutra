"use client";
import { useState, useCallback, useRef } from "react";
import { useCadStore, type CadObject } from "@/stores/cad-store";

/* ── Types ── */
type FileFormat = "STEP" | "STL" | "OBJ" | "IGES" | "glTF" | "FBX" | "PLY" | "Unknown";
type UnitSystem = "mm" | "cm" | "m" | "in";

interface ImportedFile {
  id: string;
  name: string;
  format: FileFormat;
  size: number;
  date: string;
  status: "ready" | "importing" | "error";
}

interface ExportOptions {
  format: FileFormat;
  units: UnitSystem;
  precision: "low" | "medium" | "high";
  includeTextures: boolean;
  mergeMeshes: boolean;
}

/* ── Helpers ── */
function detectFormat(filename: string): FileFormat {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, FileFormat> = {
    step: "STEP", stp: "STEP", stl: "STL", obj: "OBJ",
    iges: "IGES", igs: "IGES", gltf: "glTF", glb: "glTF",
    fbx: "FBX", ply: "PLY",
  };
  return map[ext || ""] || "Unknown";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const formatColors: Record<FileFormat, string> = {
  STEP: "text-blue-400 bg-blue-400/10",
  STL: "text-green-400 bg-green-400/10",
  OBJ: "text-yellow-400 bg-yellow-400/10",
  IGES: "text-purple-400 bg-purple-400/10",
  glTF: "text-orange-400 bg-orange-400/10",
  FBX: "text-red-400 bg-red-400/10",
  PLY: "text-teal-400 bg-teal-400/10",
  Unknown: "text-slate-400 bg-slate-400/10",
};

const exportFormats: FileFormat[] = ["STEP", "STL", "OBJ", "IGES", "glTF", "FBX", "PLY"];

/* ── DXF Generation ── */
function generateDxf(objects: CadObject[]): string {
  let entities = "";

  for (const obj of objects) {
    if (obj.visible === false) continue;

    if (obj.type === "line" && obj.linePoints && obj.linePoints.length >= 2) {
      for (let i = 0; i < obj.linePoints.length - 1; i++) {
        const p1 = obj.linePoints[i];
        const p2 = obj.linePoints[i + 1];
        entities +=
          `0\nLINE\n8\n0\n` +
          `10\n${p1[0].toFixed(4)}\n20\n${p1[2].toFixed(4)}\n30\n0.0\n` +
          `11\n${p2[0].toFixed(4)}\n21\n${p2[2].toFixed(4)}\n31\n0.0\n`;
      }
    } else if (obj.type === "circle" && obj.circleCenter && obj.circleRadius) {
      entities +=
        `0\nCIRCLE\n8\n0\n` +
        `10\n${obj.circleCenter[0].toFixed(4)}\n20\n${obj.circleCenter[2].toFixed(4)}\n30\n0.0\n` +
        `40\n${obj.circleRadius.toFixed(4)}\n`;
    } else if (obj.type === "arc" && obj.arcPoints && obj.arcPoints.length >= 3) {
      // Compute arc center/radius from 3 points
      const [p1, , p3] = obj.arcPoints;
      const cx = (p1[0] + p3[0]) / 2;
      const cz = (p1[2] + p3[2]) / 2;
      const radius = Math.sqrt(Math.pow(p3[0] - p1[0], 2) + Math.pow(p3[2] - p1[2], 2)) / 2;
      const startAngle = (Math.atan2(p1[2] - cz, p1[0] - cx) * 180) / Math.PI;
      const endAngle = (Math.atan2(p3[2] - cz, p3[0] - cx) * 180) / Math.PI;
      entities +=
        `0\nARC\n8\n0\n` +
        `10\n${cx.toFixed(4)}\n20\n${cz.toFixed(4)}\n30\n0.0\n` +
        `40\n${radius.toFixed(4)}\n` +
        `50\n${startAngle.toFixed(4)}\n51\n${endAngle.toFixed(4)}\n`;
    } else if (obj.type === "rectangle" && obj.rectCorners) {
      const [c1, c2] = obj.rectCorners;
      const corners: [number, number][] = [
        [c1[0], c1[2]],
        [c2[0], c1[2]],
        [c2[0], c2[2]],
        [c1[0], c2[2]],
      ];
      for (let i = 0; i < 4; i++) {
        const from = corners[i];
        const to = corners[(i + 1) % 4];
        entities +=
          `0\nLINE\n8\n0\n` +
          `10\n${from[0].toFixed(4)}\n20\n${from[1].toFixed(4)}\n30\n0.0\n` +
          `11\n${to[0].toFixed(4)}\n21\n${to[1].toFixed(4)}\n31\n0.0\n`;
      }
    } else if (obj.type === "box") {
      const { width, depth } = obj.dimensions;
      const [px, , pz] = obj.position;
      const hw = width / 2, hd = depth / 2;
      const corners: [number, number][] = [
        [px - hw, pz - hd],
        [px + hw, pz - hd],
        [px + hw, pz + hd],
        [px - hw, pz + hd],
      ];
      for (let i = 0; i < 4; i++) {
        const from = corners[i];
        const to = corners[(i + 1) % 4];
        entities +=
          `0\nLINE\n8\n0\n` +
          `10\n${from[0].toFixed(4)}\n20\n${from[1].toFixed(4)}\n30\n0.0\n` +
          `11\n${to[0].toFixed(4)}\n21\n${to[1].toFixed(4)}\n31\n0.0\n`;
      }
    } else if (obj.type === "cylinder" || obj.type === "cone" || obj.type === "sphere") {
      const radius = obj.dimensions.width;
      entities +=
        `0\nCIRCLE\n8\n0\n` +
        `10\n${obj.position[0].toFixed(4)}\n20\n${obj.position[2].toFixed(4)}\n30\n0.0\n` +
        `40\n${radius.toFixed(4)}\n`;
    }
  }

  return `0\nSECTION\n2\nENTITIES\n${entities}0\nENDSEC\n0\nEOF\n`;
}
const unitSystems: UnitSystem[] = ["mm", "cm", "m", "in"];

const sampleFiles: ImportedFile[] = [
  { id: "f1", name: "bracket_assembly.step", format: "STEP", size: 2457600, date: "2026-03-18", status: "ready" },
  { id: "f2", name: "gear_housing.stl", format: "STL", size: 1843200, date: "2026-03-17", status: "ready" },
  { id: "f3", name: "turbine_blade.obj", format: "OBJ", size: 3276800, date: "2026-03-15", status: "ready" },
  { id: "f4", name: "exhaust_manifold.iges", format: "IGES", size: 4915200, date: "2026-03-14", status: "ready" },
];

export default function ImportExportPage() {
  const cadObjects = useCadStore((s) => s.objects);
  const [files, setFiles] = useState<ImportedFile[]>(sampleFiles);
  const [dragOver, setDragOver] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportOpts, setExportOpts] = useState<ExportOptions>({
    format: "STEP",
    units: "mm",
    precision: "high",
    includeTextures: false,
    mergeMeshes: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles: ImportedFile[] = droppedFiles.map((f, i) => ({
      id: `imp-${Date.now()}-${i}`,
      name: f.name,
      format: detectFormat(f.name),
      size: f.size,
      date: new Date().toISOString().split("T")[0],
      status: "ready",
    }));
    setFiles((prev) => [...newFiles, ...prev]);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const newFiles: ImportedFile[] = selected.map((f, i) => ({
      id: `inp-${Date.now()}-${i}`,
      name: f.name,
      format: detectFormat(f.name),
      size: f.size,
      date: new Date().toISOString().split("T")[0],
      status: "ready",
    }));
    setFiles((prev) => [...newFiles, ...prev]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleExport = useCallback(() => {
    const content = `Export Configuration\nFormat: ${exportOpts.format}\nUnits: ${exportOpts.units}\nPrecision: ${exportOpts.precision}\nInclude Textures: ${exportOpts.includeTextures}\nMerge Meshes: ${exportOpts.mergeMeshes}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export_config.${exportOpts.format.toLowerCase()}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExport(false);
  }, [exportOpts]);

  const handleDxfExport = useCallback(() => {
    const dxfContent = generateDxf(cadObjects);
    const blob = new Blob([dxfContent], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shilpasutra_export.dxf";
    a.click();
    URL.revokeObjectURL(url);
  }, [cadObjects]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="h-12 border-b border-[#1a1a2e] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[#00D4FF] font-bold text-sm">I/O</span>
          <span className="text-slate-400 text-xs">Import / Export File Hub</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDxfExport}
            className="px-3 py-1.5 bg-orange-500/10 text-orange-400 text-xs rounded hover:bg-orange-500/20 transition-colors border border-orange-500/20"
            title="Export current CAD objects as DXF (LINE, CIRCLE, ARC primitives)"
          >
            Export DXF
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="px-3 py-1.5 bg-[#00D4FF]/10 text-[#00D4FF] text-xs rounded hover:bg-[#00D4FF]/20 transition-colors border border-[#00D4FF]/20"
          >
            Export Model
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Drag & Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
            dragOver
              ? "border-[#00D4FF] bg-[#00D4FF]/5"
              : "border-[#252540] hover:border-[#00D4FF]/40 bg-[#0d0d14]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".step,.stp,.stl,.obj,.iges,.igs,.gltf,.glb,.fbx,.ply"
            onChange={handleFileInput}
            className="hidden"
          />
          <div className="text-3xl mb-3 text-[#00D4FF]/60">
            {dragOver ? "+" : "^"}
          </div>
          <div className="text-sm text-slate-300 font-medium">
            {dragOver ? "Drop files here" : "Drag & drop CAD files or click to browse"}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            STEP, STL, OBJ, IGES, glTF, FBX, PLY
          </div>
        </div>

        {/* Recent Files */}
        <div className="mt-8">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
            Recent Files ({files.length})
          </h3>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-[#0d0d14] rounded-lg border border-[#1a1a2e] hover:border-[#252540] transition-colors"
              >
                <div className={`px-2 py-1 rounded text-[10px] font-bold ${formatColors[file.format]}`}>
                  {file.format}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{file.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {formatSize(file.size)} · {file.date}
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded ${
                    file.status === "ready"
                      ? "bg-green-500/10 text-green-400"
                      : file.status === "importing"
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {file.status}
                </span>
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-xs text-slate-500 hover:text-red-400 px-2 py-1 transition-colors"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      {showExport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl w-[440px] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-white">Export Model</h3>
              <button
                onClick={() => setShowExport(false)}
                className="text-slate-500 hover:text-white text-xs"
              >
                x
              </button>
            </div>

            {/* Format */}
            <div className="mb-4">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2">Format</label>
              <div className="grid grid-cols-4 gap-1.5">
                {exportFormats.map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setExportOpts((o) => ({ ...o, format: fmt }))}
                    className={`py-2 rounded text-xs font-medium transition-colors ${
                      exportOpts.format === fmt
                        ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                        : "bg-[#0a0a0f] text-slate-400 border border-[#1a1a2e] hover:border-[#252540]"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Units */}
            <div className="mb-4">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2">Units</label>
              <div className="flex gap-1.5">
                {unitSystems.map((u) => (
                  <button
                    key={u}
                    onClick={() => setExportOpts((o) => ({ ...o, units: u }))}
                    className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                      exportOpts.units === u
                        ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                        : "bg-[#0a0a0f] text-slate-400 border border-[#1a1a2e]"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Precision */}
            <div className="mb-4">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2">Precision</label>
              <div className="flex gap-1.5">
                {(["low", "medium", "high"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setExportOpts((o) => ({ ...o, precision: p }))}
                    className={`flex-1 py-2 rounded text-xs font-medium capitalize transition-colors ${
                      exportOpts.precision === p
                        ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                        : "bg-[#0a0a0f] text-slate-400 border border-[#1a1a2e]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOpts.includeTextures}
                  onChange={(e) => setExportOpts((o) => ({ ...o, includeTextures: e.target.checked }))}
                  className="accent-[#00D4FF]"
                />
                <span className="text-xs text-slate-300">Include textures</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOpts.mergeMeshes}
                  onChange={(e) => setExportOpts((o) => ({ ...o, mergeMeshes: e.target.checked }))}
                  className="accent-[#00D4FF]"
                />
                <span className="text-xs text-slate-300">Merge meshes</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowExport(false)}
                className="flex-1 py-2 rounded text-xs font-medium text-slate-400 border border-[#252540] hover:bg-[#1a1a2e] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="flex-1 py-2 rounded text-xs font-medium bg-[#00D4FF] text-black hover:bg-[#00bde6] transition-colors"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
