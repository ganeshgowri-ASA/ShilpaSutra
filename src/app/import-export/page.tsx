"use client";
import { useState, useCallback, useRef } from "react";

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
const unitSystems: UnitSystem[] = ["mm", "cm", "m", "in"];

const sampleFiles: ImportedFile[] = [
  { id: "f1", name: "bracket_assembly.step", format: "STEP", size: 2457600, date: "2026-03-18", status: "ready" },
  { id: "f2", name: "gear_housing.stl", format: "STL", size: 1843200, date: "2026-03-17", status: "ready" },
  { id: "f3", name: "turbine_blade.obj", format: "OBJ", size: 3276800, date: "2026-03-15", status: "ready" },
  { id: "f4", name: "exhaust_manifold.iges", format: "IGES", size: 4915200, date: "2026-03-14", status: "ready" },
];

export default function ImportExportPage() {
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
    // Generate a basic DXF file with LINE and CIRCLE entities from sample scene objects
    const sceneObjects = [
      { type: "LINE", x1: 0, y1: 0, x2: 100, y2: 0 },
      { type: "LINE", x1: 100, y1: 0, x2: 100, y2: 50 },
      { type: "LINE", x1: 100, y1: 50, x2: 0, y2: 50 },
      { type: "LINE", x1: 0, y1: 50, x2: 0, y2: 0 },
      { type: "CIRCLE", cx: 50, cy: 25, r: 15 },
    ];

    let dxf = "0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n";

    for (const obj of sceneObjects) {
      if (obj.type === "LINE") {
        const o = obj as { type: string; x1: number; y1: number; x2: number; y2: number };
        dxf += `0\nLINE\n8\n0\n10\n${o.x1}\n20\n${o.y1}\n30\n0\n11\n${o.x2}\n21\n${o.y2}\n31\n0\n`;
      } else if (obj.type === "CIRCLE") {
        const o = obj as { type: string; cx: number; cy: number; r: number };
        dxf += `0\nCIRCLE\n8\n0\n10\n${o.cx}\n20\n${o.cy}\n30\n0\n40\n${o.r}\n`;
      }
    }

    dxf += "0\nENDSEC\n0\nEOF\n";

    const blob = new Blob([dxf], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shilpasutra_export.dxf";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

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
            className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 text-xs rounded hover:bg-yellow-500/20 transition-colors border border-yellow-500/20"
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
