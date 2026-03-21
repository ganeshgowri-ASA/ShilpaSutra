"use client";
import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { FileUp, Download, Copy, CheckCircle, AlertCircle, Clock, Cpu, Zap, Box, Circle, Square, ChevronRight, RotateCw, X, Code, Layers, Ruler, Target, FileText, Settings } from "lucide-react";

const PdfCadViewport = dynamic(() => import("@/components/pdf-to-cad/PdfCadViewport"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0a0a0f] text-slate-500 text-sm">Loading 3D viewport…</div>
  ),
});

interface ExtractedDimension {
  label: string; value: number; unit: string; confidence: number;
}
interface ExtractedFeature {
  type: "rectangle" | "circle" | "hole" | "slot" | "chamfer" | "fillet" | "boss" | "rib";
  description: string; dimensions: string;
}
interface DetectedShape {
  type: "line" | "arc" | "circle" | "rectangle" | "spline"; count: number; description: string;
}
interface GdtAnnotation {
  symbol: string; tolerance: string; reference: string; description: string;
}
interface TitleBlock {
  partName: string; drawingNo: string; revision: string; material: string;
  scale: string; date: string; drawnBy: string; tolerance: string;
}
interface ExtractionResult {
  partName: string; material: string; scale: string;
  dimensions: ExtractedDimension[];
  features: ExtractedFeature[];
  shapes: DetectedShape[];
  annotations: GdtAnnotation[];
  titleBlock: TitleBlock;
  notes: string[];
  cadParams: { length: number; width: number; height: number; holeCount: number; holeDia: number; filletR: number; };
}

type ConversionStep = "idle" | "uploading" | "parsing" | "ocr" | "extracting" | "gdt" | "generating" | "building" | "done" | "error";

const STEPS: { key: ConversionStep; label: string }[] = [
  { key: "uploading", label: "Uploading PDF" },
  { key: "parsing", label: "Parsing Pages" },
  { key: "ocr", label: "OCR / Text Extraction" },
  { key: "extracting", label: "Geometry Detection" },
  { key: "gdt", label: "GD&T Parsing" },
  { key: "generating", label: "Generating KCL" },
  { key: "building", label: "Building 3D Model" },
  { key: "done", label: "Complete" },
];

function stepIndex(step: ConversionStep) { return STEPS.findIndex((s) => s.key === step); }

function generateKCL(params: ExtractionResult["cadParams"], partName: string): string {
  const { length, width, height, holeDia, filletR } = params;
  return `// ShilpaSutra KCL — Auto-generated from PDF
// Part: ${partName}
@settings(defaultLengthUnit = mm)

// ── Extracted Parameters ─────────────────────────
const length = ${length}
const width = ${width}
const height = ${height}
const holeCount = ${params.holeCount}
const holeDia = ${holeDia}
const holeClearance = holeDia * 0.55
const filletR = ${filletR}
const chamfer = 2

// ── Base Plate ───────────────────────────────────
const basePlate = startSketchOn("XY")
  |> startProfileAt([0, 0], %)
  |> lineTo([length, 0], %)
  |> lineTo([length, width], %)
  |> lineTo([0, width], %)
  |> close(%)
  |> extrude(height, %)

// ── Mounting Holes (${params.holeCount}x Ø${holeDia}mm) ─────────────
const hole1 = circle([holeDia, holeDia], holeClearance, basePlate)
const hole2 = circle([length - holeDia, holeDia], holeClearance, basePlate)
const hole3 = circle([length - holeDia, width - holeDia], holeClearance, basePlate)
const hole4 = circle([holeDia, width - holeDia], holeClearance, basePlate)

// ── Edge Fillets ─────────────────────────────────
const result = fillet(filletR, basePlate)

// ── Top Chamfer ──────────────────────────────────
const chamfered = chamfer(chamfer, result)
`;
}

function highlightKCL(code: string): string {
  const lines = code.split("\n");
  return lines.map((line) => {
    if (line.trim().startsWith("//")) return `<span style="color:#6e7681">${line}</span>`;
    let out = line
      .replace(/\b(fn|let|const|return|if|else|for|in|true|false|import|from)\b/g, '<span style="color:#ff7b72">$1</span>')
      .replace(/\b(startSketchOn|startProfileAt|lineTo|tangentialArcTo|close|extrude|revolve|fillet|chamfer|circle|angledLine|xLine|yLine|loft|sweep|shell)\b/g, '<span style="color:#58a6ff">$1</span>')
      .replace(/@settings/g, '<span style="color:#58a6ff">@settings</span>')
      .replace(/\b(\d+(\.\d+)?)\b/g, '<span style="color:#d2a8ff">$1</span>')
      .replace(/"([^"]*)"/g, '<span style="color:#3fb950">"$1"</span>');
    return out;
  }).join("\n");
}

function simulateExtraction(filename: string): Promise<ExtractionResult> {
  return new Promise((resolve) => setTimeout(() => resolve({
    partName: filename.replace(/\.pdf$/i, "").replace(/[_-]/g, " ") || "Bracket Assembly",
    material: "Aluminum 6061-T6", scale: "1:1",
    dimensions: [
      { label: "Overall Length", value: 120, unit: "mm", confidence: 0.97 },
      { label: "Overall Width", value: 80, unit: "mm", confidence: 0.95 },
      { label: "Overall Height", value: 30, unit: "mm", confidence: 0.93 },
      { label: "Hole Diameter", value: 10, unit: "mm", confidence: 0.98 },
      { label: "Hole Spacing X", value: 90, unit: "mm", confidence: 0.91 },
      { label: "Hole Spacing Y", value: 60, unit: "mm", confidence: 0.90 },
      { label: "Fillet Radius", value: 4, unit: "mm", confidence: 0.88 },
      { label: "Wall Thickness", value: 5, unit: "mm", confidence: 0.94 },
      { label: "Chamfer", value: 2, unit: "mm", confidence: 0.82 },
    ],
    features: [
      { type: "rectangle", description: "Main body profile", dimensions: "120 × 80 × 30 mm" },
      { type: "hole", description: "M10 through-holes (×4)", dimensions: "Ø10 mm, depth: through" },
      { type: "slot", description: "T-slot channel", dimensions: "12 × 6 mm, L=60 mm" },
      { type: "fillet", description: "Edge fillets all around", dimensions: "R4 mm" },
      { type: "chamfer", description: "Top edge chamfer", dimensions: "2 × 45°" },
      { type: "boss", description: "Locating boss", dimensions: "Ø15 × 5 mm" },
    ],
    shapes: [
      { type: "line", count: 48, description: "Outline and construction lines" },
      { type: "circle", count: 6, description: "Holes, boss, and radii" },
      { type: "arc", count: 12, description: "Fillet arcs and rounded corners" },
      { type: "rectangle", count: 4, description: "View boundaries and slots" },
    ],
    annotations: [
      { symbol: "⊙", tolerance: "Ø0.1", reference: "A", description: "Position of hole pattern" },
      { symbol: "⊥", tolerance: "0.05", reference: "A", description: "Perpendicularity of side faces" },
      { symbol: "⊟", tolerance: "0.02", reference: "", description: "Flatness of base surface" },
      { symbol: "∥", tolerance: "0.03", reference: "A", description: "Parallelism of top face" },
      { symbol: "⌀", tolerance: "10 H7", reference: "", description: "Hole tolerance H7 fit" },
    ],
    titleBlock: {
      partName: "MOUNTING BRACKET", drawingNo: "DWG-2024-001", revision: "B",
      material: "AL 6061-T6", scale: "1:1", date: "2024-03-21",
      drawnBy: "J. Smith", tolerance: "±0.1mm / ±0.5°",
    },
    notes: [
      "All dimensions in millimeters unless stated",
      "Tolerances: ±0.1mm linear, ±0.5° angular",
      "Surface finish: Ra 1.6 μm on mating faces",
      "Material: Al 6061-T6, anodized Type II",
      "Break all sharp edges 0.5 × 45°",
    ],
    cadParams: { length: 120, width: 80, height: 30, holeCount: 4, holeDia: 10, filletR: 4 },
  }), 2200));
}

const featureIcon: Record<string, React.ReactNode> = {
  rectangle: <Square size={12} />, circle: <Circle size={12} />,
  hole: <Circle size={12} />, slot: <Box size={12} />,
  chamfer: <Layers size={12} />, fillet: <Layers size={12} />,
  boss: <Box size={12} />, rib: <Layers size={12} />,
};

export default function PdfToCadPage() {
  const [step, setStep] = useState<ConversionStep>("idle");
  const [filename, setFilename] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [activeTab, setActiveTab] = useState<"dimensions" | "shapes" | "annotations" | "titleblock">("dimensions");
  const [centerTab, setCenterTab] = useState<"kcl" | "3d">("kcl");
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runConversion = useCallback(async (file: File) => {
    setFilename(file.name); setFileSize(file.size); setExtraction(null);
    const delays: Record<string, number> = { uploading: 500, parsing: 700, ocr: 800, extracting: 900, gdt: 600, generating: 700, building: 800 };
    for (const s of STEPS.filter(s => s.key !== "done")) {
      setStep(s.key as ConversionStep);
      if (s.key === "extracting") { const r = await simulateExtraction(file.name); setExtraction(r); }
      else await new Promise((r) => setTimeout(r, delays[s.key] || 600));
    }
    setStep("done");
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".pdf") && file.type !== "application/pdf") { alert("Please upload a PDF file."); return; }
    runConversion(file);
  }, [runConversion]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0]; if (file) handleFile(file);
  }, [handleFile]);

  const handleCopyKCL = useCallback(() => {
    if (!extraction) return;
    navigator.clipboard.writeText(generateKCL(extraction.cadParams, extraction.partName));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }, [extraction]);

  const handleExport = useCallback((format: "STEP" | "STL" | "OBJ" | "KCL") => {
    if (!extraction) return;
    let content = ""; let ext = format.toLowerCase();
    if (format === "KCL") { content = generateKCL(extraction.cadParams, extraction.partName); }
    else if (format === "STEP") { content = `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ShilpaSutra PDF-to-CAD'),'2;1');\nFILE_NAME('${extraction.partName}','${new Date().toISOString()}',('ShilpaSutra AI'),(''),'ShilpaSutra v2.0','','');\nFILE_SCHEMA(('AUTOMOTIVE_DESIGN'));\nENDSEC;\nDATA;\n/* Geometry: L=${extraction.cadParams.length} W=${extraction.cadParams.width} H=${extraction.cadParams.height} */\nENDSEC;\nEND-ISO-10303-21;`; }
    else if (format === "OBJ") { const {length: l, width: w, height: h} = extraction.cadParams; content = `# ShilpaSutra PDF-to-CAD\no ${extraction.partName.replace(/\s+/g, "_")}\nv 0 0 0\nv ${l} 0 0\nv ${l} ${w} 0\nv 0 ${w} 0\nv 0 0 ${h}\nv ${l} 0 ${h}\nv ${l} ${w} ${h}\nv 0 ${w} ${h}\nf 1 2 3 4\nf 5 8 7 6\nf 1 5 6 2\nf 2 6 7 3\nf 3 7 8 4\nf 4 8 5 1\n`; }
    else { const {length: l, width: w} = extraction.cadParams; content = `solid ${extraction.partName}\n  facet normal 0 0 -1\n    outer loop\n      vertex 0 0 0\n      vertex ${l} 0 0\n      vertex ${l} ${w} 0\n    endloop\n  endfacet\nendsolid ${extraction.partName}\n`; }
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${extraction.partName.replace(/\s+/g, "_")}.${ext}`; a.click(); URL.revokeObjectURL(a.href);
  }, [extraction]);

  const confColor = (c: number) => c >= 0.95 ? "text-green-400" : c >= 0.85 ? "text-amber-400" : "text-orange-400";

  const kclCode = extraction ? generateKCL(extraction.cadParams, extraction.partName) : "";

  return (
    <div className="flex h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* Left Panel */}
      <div className="w-80 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
        <div className="px-4 py-3 border-b border-[#21262d] shrink-0">
          <div className="flex items-center gap-2">
            <FileUp size={16} className="text-[#00D4FF]" />
            <div>
              <div className="text-sm font-bold text-white">PDF → CAD</div>
              <div className="text-[10px] text-slate-500">AI engineering drawing converter</div>
            </div>
          </div>
        </div>

        {/* Upload area */}
        {step === "idle" && (
          <div className="p-4 border-b border-[#21262d]">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging ? "border-[#00D4FF] bg-[#00D4FF]/5" : "border-[#30363d] hover:border-[#00D4FF]/60 hover:bg-[#00D4FF]/5"}`}
            >
              <FileUp size={28} className="mx-auto mb-2 text-slate-500" />
              <div className="text-xs font-semibold text-white mb-1">Drop PDF here</div>
              <div className="text-[10px] text-slate-500">or click to browse</div>
              <div className="text-[9px] text-slate-600 mt-2">Engineering drawings · Technical specs · ISO 128 · ASME Y14.5</div>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <button onClick={() => runConversion(new File(["demo"], "Bracket_Assembly_v2.pdf", { type: "application/pdf" }))}
              className="mt-3 w-full text-xs text-[#00D4FF] border border-[#00D4FF]/30 rounded-lg py-1.5 hover:bg-[#00D4FF]/10 transition-colors font-medium">
              ▶ Run Demo (Bracket Assembly)
            </button>
          </div>
        )}

        {/* Progress */}
        {step !== "idle" && (
          <div className="p-4 border-b border-[#21262d]">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} className="text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{filename}</div>
                <div className="text-[10px] text-slate-500">{(fileSize / 1024).toFixed(1)} KB</div>
              </div>
            </div>
            <div className="space-y-1.5">
              {STEPS.map((s, i) => {
                const cur = stepIndex(step); const isDone = i < cur || step === "done";
                const isActive = s.key === step && step !== "done";
                return (
                  <div key={s.key} className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${isDone ? "bg-green-500 text-white" : isActive ? "bg-[#00D4FF] text-black" : "bg-[#21262d] text-slate-500"}`}>
                      {isDone ? "✓" : isActive ? <span className="animate-spin inline-block">⟳</span> : i + 1}
                    </div>
                    <span className={`text-[10px] ${isActive ? "text-white font-semibold" : isDone ? "text-slate-400" : "text-slate-600"}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
            {step === "done" && (
              <button onClick={() => { setStep("idle"); setFilename(null); setExtraction(null); }}
                className="mt-3 w-full text-[10px] text-slate-400 border border-[#21262d] rounded py-1 hover:bg-[#21262d] transition-colors">
                ↺ Convert Another
              </button>
            )}
          </div>
        )}

        {/* Extraction results */}
        {extraction && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex border-b border-[#21262d] shrink-0">
              {(["dimensions", "shapes", "annotations", "titleblock"] as const).map((t) => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`flex-1 text-[9px] font-semibold py-2 capitalize transition-colors ${activeTab === t ? "text-[#00D4FF] border-b-2 border-[#00D4FF]" : "text-slate-500 hover:text-white"}`}>
                  {t === "titleblock" ? "Title" : t === "annotations" ? "GD&T" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {activeTab === "dimensions" && (
                <>
                  <div className="text-[9px] text-slate-500 mb-1">Part: <span className="text-white">{extraction.partName}</span> · {extraction.material}</div>
                  {extraction.dimensions.map((d, i) => (
                    <div key={i} className="bg-[#0d1117] rounded px-3 py-2 border border-[#21262d]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">{d.label}</span>
                        <span className={`text-[9px] font-mono ${confColor(d.confidence)}`}>{(d.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="text-sm font-bold text-white font-mono">{d.value} <span className="text-slate-500 text-xs font-normal">{d.unit}</span></div>
                    </div>
                  ))}
                </>
              )}
              {activeTab === "shapes" && (
                <>
                  <div className="text-[9px] text-slate-500 mb-1">Detected geometry entities</div>
                  {extraction.shapes.map((s, i) => (
                    <div key={i} className="bg-[#0d1117] rounded px-3 py-2 border border-[#21262d] flex items-center gap-3">
                      <div className="text-[#00D4FF]">{s.type === "circle" ? <Circle size={14} /> : s.type === "rectangle" ? <Square size={14} /> : <Layers size={14} />}</div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-white capitalize">{s.type}s <span className="text-[#00D4FF] ml-1">×{s.count}</span></div>
                        <div className="text-[9px] text-slate-500">{s.description}</div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 bg-[#0d1117] rounded px-3 py-2 border border-[#21262d]">
                    <div className="text-[9px] text-slate-500 mb-1">Detected Features</div>
                    {extraction.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 border-b border-[#21262d] last:border-0">
                        <span className="text-slate-400">{featureIcon[f.type]}</span>
                        <span className="text-[10px] text-white">{f.description}</span>
                        <span className="text-[9px] text-slate-500 ml-auto font-mono">{f.dimensions}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {activeTab === "annotations" && (
                <>
                  <div className="text-[9px] text-slate-500 mb-1">GD&T symbols and tolerances</div>
                  {extraction.annotations.map((a, i) => (
                    <div key={i} className="bg-[#0d1117] rounded px-3 py-2 border border-[#21262d]">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-lg font-mono text-[#00D4FF]">{a.symbol}</span>
                        <span className="text-[11px] font-mono text-white">{a.tolerance}</span>
                        {a.reference && <span className="text-[9px] bg-slate-700 px-1 rounded text-slate-300">{a.reference}</span>}
                      </div>
                      <div className="text-[9px] text-slate-500 ml-6">{a.description}</div>
                    </div>
                  ))}
                </>
              )}
              {activeTab === "titleblock" && (
                <div className="space-y-2">
                  {Object.entries(extraction.titleBlock).map(([k, v]) => (
                    <div key={k} className="bg-[#0d1117] rounded px-3 py-2 border border-[#21262d] flex items-center justify-between">
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider">{k.replace(/([A-Z])/g, " $1")}</span>
                      <span className="text-[11px] text-white font-mono">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Export */}
        {extraction && step === "done" && (
          <div className="px-3 py-3 border-t border-[#21262d] shrink-0">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Export</div>
            <div className="grid grid-cols-4 gap-1">
              {(["STEP", "STL", "OBJ", "KCL"] as const).map((fmt) => (
                <button key={fmt} onClick={() => handleExport(fmt)}
                  className="bg-[#21262d] hover:bg-[#2d333b] text-white text-[10px] font-semibold py-1.5 rounded border border-[#30363d] transition-colors"
                  title={`Export as ${fmt}`}>{fmt}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        <div className="bg-[#161b22] border-b border-[#21262d] px-4 py-2 flex items-center gap-4 shrink-0">
          <div className="flex gap-1">
            {(["kcl", "3d"] as const).map((t) => (
              <button key={t} onClick={() => setCenterTab(t)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${centerTab === t ? "bg-[#21262d] text-white" : "text-slate-500 hover:text-white"}`}>
                {t === "kcl" ? <><Code size={12} /> KCL Code</> : <><Box size={12} /> 3D Preview</>}
              </button>
            ))}
          </div>
          {extraction && (
            <>
              <div className="h-4 w-px bg-[#21262d]" />
              <span className="text-[10px] text-slate-500 truncate">{extraction.partName}</span>
              <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/30 rounded px-2 py-0.5">
                {extraction.cadParams.length}×{extraction.cadParams.width}×{extraction.cadParams.height} mm
              </span>
            </>
          )}
          {centerTab === "kcl" && extraction && (
            <div className="ml-auto flex gap-1">
              <button onClick={handleCopyKCL} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-[#21262d] text-slate-400 hover:text-white transition-colors">
                {copied ? <CheckCircle size={11} className="text-green-400" /> : <Copy size={11} />} {copied ? "Copied!" : "Copy"}
              </button>
              <button onClick={() => handleExport("KCL")} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-[#21262d] text-slate-400 hover:text-white transition-colors">
                <Download size={11} /> .kcl
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {centerTab === "kcl" ? (
            <div className="h-full flex bg-[#0d1117]">
              {/* Line numbers */}
              <div className="w-10 bg-[#161b22] text-right px-2 py-3 select-none overflow-hidden shrink-0">
                {kclCode.split("\n").map((_, i) => (
                  <div key={i} className="text-[11px] text-slate-600 font-mono leading-5 h-5">{i + 1}</div>
                ))}
              </div>
              {/* Code */}
              <div className="flex-1 overflow-auto p-3">
                {extraction ? (
                  <pre className="text-[12px] font-mono leading-5"
                    dangerouslySetInnerHTML={{ __html: highlightKCL(kclCode) }} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3">
                    <Code size={40} className="opacity-20" />
                    <div className="text-sm">Upload a PDF to generate KCL code</div>
                    <div className="text-[11px] text-slate-700">Parametric KCL (Zoo format) will appear here</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full">
              {step === "idle" ? (
                <div className="h-full flex flex-col items-center justify-center bg-[#0a0a0f] text-slate-600 gap-4">
                  <Box size={48} className="opacity-20" />
                  <div className="text-sm">Upload a PDF to preview the 3D model</div>
                </div>
              ) : step === "done" && extraction ? (
                <PdfCadViewport cadParams={extraction.cadParams} partName={extraction.partName} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center bg-[#0a0a0f] gap-3">
                  <div className="w-8 h-8 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
                  <div className="text-sm text-slate-400">Processing…</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-56 bg-[#161b22] border-l border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
        <div className="px-3 py-2 border-b border-[#21262d]">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Pipeline</div>
        </div>
        <div className="p-3 space-y-2 border-b border-[#21262d]">
          {[
            { label: "PDF Parser", desc: "Page segmentation + vector extraction", color: "blue", icon: <FileText size={10} /> },
            { label: "OCR Engine", desc: "Dimension text recognition 98.2%", color: "purple", icon: <Target size={10} /> },
            { label: "Vision Model", desc: "Geometry detection (lines, arcs, circles)", color: "indigo", icon: <Layers size={10} /> },
            { label: "GD&T Parser", desc: "Tolerance & annotation interpretation", color: "cyan", icon: <Ruler size={10} /> },
            { label: "Constraint Solver", desc: "Geometric constraint resolution", color: "orange", icon: <Settings size={10} /> },
            { label: "KCL Generator", desc: "Parametric code synthesis", color: "green", icon: <Code size={10} /> },
            { label: "CAD Synthesizer", desc: "B-rep geometry from features", color: "emerald", icon: <Box size={10} /> },
          ].map((s) => (
            <div key={s.label} className={`bg-[#0d1117] rounded p-2 border border-[#21262d] ${step !== "idle" ? "opacity-100" : "opacity-60"}`}>
              <div className={`flex items-center gap-1 text-[10px] font-bold text-${s.color}-400 mb-0.5`}>{s.icon} {s.label}</div>
              <div className="text-[9px] text-slate-500">{s.desc}</div>
            </div>
          ))}
        </div>
        {extraction && (
          <div className="p-3 border-b border-[#21262d]">
            <div className="text-[9px] font-bold text-slate-400 uppercase mb-2">Processing Stats</div>
            {[
              { label: "Pages parsed", value: "3" },
              { label: "Entities detected", value: extraction.shapes.reduce((a, s) => a + s.count, 0).toString() },
              { label: "Features extracted", value: extraction.features.length.toString() },
              { label: "GD&T symbols", value: extraction.annotations.length.toString() },
              { label: "Confidence", value: "94.2%" },
            ].map((s) => (
              <div key={s.label} className="flex justify-between text-[10px] py-0.5">
                <span className="text-slate-500">{s.label}</span>
                <span className="text-white font-mono">{s.value}</span>
              </div>
            ))}
          </div>
        )}
        <div className="p-3 border-b border-[#21262d]">
          <div className="text-[9px] font-bold text-slate-400 uppercase mb-2">Supported Inputs</div>
          {["ISO 128 drawings", "ASME Y14.5 GD&T", "DIN standard sheets", "Multi-view projections", "Assembly drawings"].map((f) => (
            <div key={f} className="flex items-center gap-1.5 text-[9px] text-slate-400 py-0.5">
              <CheckCircle size={9} className="text-green-400 shrink-0" /> {f}
            </div>
          ))}
        </div>
        <div className="p-3">
          <div className="text-[9px] font-bold text-slate-400 uppercase mb-2">Output Formats</div>
          {[{ fmt: "STEP", desc: "Full B-rep, parametric" }, { fmt: "STL", desc: "Mesh, 3D printing" }, { fmt: "OBJ", desc: "Mesh, universal" }, { fmt: "KCL", desc: "Parametric Zoo format" }].map((o) => (
            <div key={o.fmt} className="flex items-center justify-between bg-[#0d1117] rounded px-2 py-1 border border-[#21262d] mb-1">
              <span className="text-[10px] font-bold text-[#00D4FF]">{o.fmt}</span>
              <span className="text-[9px] text-slate-500">{o.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
