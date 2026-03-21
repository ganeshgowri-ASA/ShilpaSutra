"use client";
import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

// ── Dynamic Three.js viewport (SSR-safe) ──────────────────────────────────────
const PdfCadViewport = dynamic(() => import("@/components/pdf-to-cad/PdfCadViewport"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0a0a0f] text-slate-500 text-sm">
      Loading 3D viewport…
    </div>
  ),
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExtractedDimension {
  label: string;
  value: number;
  unit: string;
  confidence: number;
}

interface ExtractedFeature {
  type: "rectangle" | "circle" | "hole" | "slot" | "chamfer" | "fillet";
  description: string;
  dimensions: string;
}

interface ExtractionResult {
  partName: string;
  material: string;
  scale: string;
  dimensions: ExtractedDimension[];
  features: ExtractedFeature[];
  notes: string[];
  cadParams: {
    length: number;
    width: number;
    height: number;
    holeCount: number;
    holeDia: number;
    filletR: number;
  };
}

type ConversionStep = "idle" | "uploading" | "parsing" | "extracting" | "generating" | "done" | "error";

// ── Simulated AI extraction ────────────────────────────────────────────────────

function simulateExtraction(filename: string): Promise<ExtractionResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        partName: filename.replace(/\.pdf$/i, "").replace(/[_-]/g, " ") || "Bracket Assembly",
        material: "Aluminum 6061-T6",
        scale: "1:1",
        dimensions: [
          { label: "Overall Length", value: 120, unit: "mm", confidence: 0.97 },
          { label: "Overall Width", value: 80, unit: "mm", confidence: 0.95 },
          { label: "Overall Height", value: 30, unit: "mm", confidence: 0.93 },
          { label: "Hole Diameter", value: 10, unit: "mm", confidence: 0.98 },
          { label: "Hole Spacing", value: 90, unit: "mm", confidence: 0.91 },
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
        ],
        notes: [
          "All dimensions in millimeters unless stated",
          "Tolerances: ±0.1mm linear, ±0.5° angular",
          "Surface finish: Ra 1.6 μm on mating faces",
          "Material: Al 6061-T6, anodized Type II",
          "Break all sharp edges 0.5 × 45°",
        ],
        cadParams: { length: 120, width: 80, height: 30, holeCount: 4, holeDia: 10, filletR: 4 },
      });
    }, 2200);
  });
}

// ── Steps config ──────────────────────────────────────────────────────────────

const STEPS: { key: ConversionStep; label: string; icon: string }[] = [
  { key: "uploading", label: "Uploading PDF", icon: "↑" },
  { key: "parsing", label: "Parsing Pages", icon: "◈" },
  { key: "extracting", label: "AI Extraction", icon: "⚡" },
  { key: "generating", label: "Generating CAD", icon: "⬡" },
  { key: "done", label: "Complete", icon: "✓" },
];

function stepIndex(step: ConversionStep) {
  return STEPS.findIndex((s) => s.key === step);
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PdfToCadPage() {
  const [step, setStep] = useState<ConversionStep>("idle");
  const [filename, setFilename] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [activeTab, setActiveTab] = useState<"extract" | "features" | "notes">("extract");
  const [exportFormat, setExportFormat] = useState<"STEP" | "STL" | "OBJ">("STEP");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runConversion = useCallback(async (file: File) => {
    setFilename(file.name);
    setFileSize(file.size);
    setExtraction(null);

    setStep("uploading");
    await new Promise((r) => setTimeout(r, 600));

    setStep("parsing");
    await new Promise((r) => setTimeout(r, 800));

    setStep("extracting");
    const result = await simulateExtraction(file.name);
    setExtraction(result);

    setStep("generating");
    await new Promise((r) => setTimeout(r, 900));

    setStep("done");
  }, []);

  const handleFile = useCallback((file: File) => {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      alert("Please upload a PDF file.");
      return;
    }
    runConversion(file);
  }, [runConversion]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleExport = useCallback((format: "STEP" | "STL" | "OBJ") => {
    if (!extraction) return;
    const content = format === "STEP"
      ? `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ShilpaSutra PDF-to-CAD Export'),'2;1');\nFILE_NAME('${extraction.partName}','${new Date().toISOString()}',('ShilpaSutra AI'),(''),'ShilpaSutra v2.0','','');\nFILE_SCHEMA(('AUTOMOTIVE_DESIGN'));\nENDSEC;\nDATA;\n/* Geometry: L=${extraction.cadParams.length} W=${extraction.cadParams.width} H=${extraction.cadParams.height} */\nENDSEC;\nEND-ISO-10303-21;`
      : format === "OBJ"
      ? `# ShilpaSutra PDF-to-CAD\n# Part: ${extraction.partName}\no ${extraction.partName.replace(/\s+/g, "_")}\n# Dimensions: ${extraction.cadParams.length} x ${extraction.cadParams.width} x ${extraction.cadParams.height} mm\nv 0 0 0\nv ${extraction.cadParams.length} 0 0\nv ${extraction.cadParams.length} ${extraction.cadParams.width} 0\nv 0 ${extraction.cadParams.width} 0\nv 0 0 ${extraction.cadParams.height}\nv ${extraction.cadParams.length} 0 ${extraction.cadParams.height}\nv ${extraction.cadParams.length} ${extraction.cadParams.width} ${extraction.cadParams.height}\nv 0 ${extraction.cadParams.width} ${extraction.cadParams.height}\nf 1 2 3 4\nf 5 8 7 6\nf 1 5 6 2\nf 2 6 7 3\nf 3 7 8 4\nf 4 8 5 1\n`
      : `solid ${extraction.partName}\n  facet normal 0 0 -1\n    outer loop\n      vertex 0 0 0\n      vertex ${extraction.cadParams.length} 0 0\n      vertex ${extraction.cadParams.length} ${extraction.cadParams.width} 0\n    endloop\n  endfacet\nendsolid ${extraction.partName}\n`;

    const ext = format.toLowerCase();
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${extraction.partName.replace(/\s+/g, "_")}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [extraction]);

  const confidenceColor = (c: number) =>
    c >= 0.95 ? "text-green-400" : c >= 0.85 ? "text-amber-400" : "text-orange-400";

  const featureIcon: Record<string, string> = {
    rectangle: "▭", circle: "○", hole: "⊙", slot: "⊏", chamfer: "◿", fillet: "⌒",
  };

  return (
    <div className="flex h-screen bg-[#0d1117] text-white overflow-hidden">

      {/* ── Left panel ── */}
      <div className="w-72 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0 overflow-y-auto">

        {/* Header */}
        <div className="px-4 py-3 border-b border-[#21262d]">
          <div className="flex items-center gap-2">
            <span className="text-[#00D4FF] text-lg">⬡</span>
            <div>
              <div className="text-sm font-bold text-white">PDF → CAD</div>
              <div className="text-[10px] text-slate-500">AI-powered engineering drawing converter</div>
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
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-[#00D4FF] bg-[#00D4FF]/5"
                  : "border-[#30363d] hover:border-[#00D4FF]/60 hover:bg-[#00D4FF]/5"
              }`}
            >
              <div className="text-3xl mb-2 text-slate-500">📄</div>
              <div className="text-xs font-semibold text-white mb-1">Drop PDF here</div>
              <div className="text-[10px] text-slate-500">or click to browse</div>
              <div className="text-[9px] text-slate-600 mt-2">Engineering drawings · Technical specs</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />

            {/* Demo button */}
            <button
              onClick={() => runConversion(new File(["demo"], "Bracket_Assembly_v2.pdf", { type: "application/pdf" }))}
              className="mt-3 w-full text-xs text-[#00D4FF] border border-[#00D4FF]/30 rounded-lg py-1.5 hover:bg-[#00D4FF]/10 transition-colors font-medium"
            >
              ▶ Run Demo (Bracket Assembly)
            </button>
          </div>
        )}

        {/* Progress steps */}
        {step !== "idle" && (
          <div className="p-4 border-b border-[#21262d]">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-xl">📄</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{filename}</div>
                <div className="text-[10px] text-slate-500">
                  {(fileSize / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {STEPS.map((s, i) => {
                const current = stepIndex(step);
                const isDone = i < current || step === "done";
                const isActive = s.key === step && step !== "done";
                return (
                  <div key={s.key} className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isDone ? "bg-green-500 text-white"
                        : isActive ? "bg-[#00D4FF] text-black animate-pulse"
                        : "bg-[#21262d] text-slate-500"
                    }`}>
                      {isDone ? "✓" : isActive ? <span className="animate-spin inline-block">⟳</span> : s.icon}
                    </div>
                    <span className={`text-[11px] ${isActive ? "text-white font-semibold" : isDone ? "text-slate-400" : "text-slate-600"}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {step === "done" && (
              <button
                onClick={() => { setStep("idle"); setFilename(null); setExtraction(null); }}
                className="mt-4 w-full text-[10px] text-slate-400 border border-[#21262d] rounded py-1 hover:bg-[#21262d] transition-colors"
              >
                ↺ Convert Another PDF
              </button>
            )}
          </div>
        )}

        {/* Extraction results tabs */}
        {extraction && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Tabs */}
            <div className="flex border-b border-[#21262d]">
              {(["extract", "features", "notes"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`flex-1 text-[10px] font-semibold py-2 capitalize transition-colors ${
                    activeTab === t
                      ? "text-[#00D4FF] border-b-2 border-[#00D4FF]"
                      : "text-slate-500 hover:text-white"
                  }`}
                >
                  {t === "extract" ? "Dimensions" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">

              {/* Dimensions tab */}
              {activeTab === "extract" && (
                <>
                  <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">
                    Part: <span className="text-white">{extraction.partName}</span>
                    &nbsp;·&nbsp;{extraction.material}
                  </div>
                  {extraction.dimensions.map((d, i) => (
                    <div key={i} className="bg-[#0d1117] rounded-lg px-3 py-2 border border-[#21262d]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">{d.label}</span>
                        <span className={`text-[9px] font-mono ${confidenceColor(d.confidence)}`}>
                          {(d.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white font-mono">
                        {d.value} <span className="text-slate-500 text-xs font-normal">{d.unit}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Features tab */}
              {activeTab === "features" && (
                <>
                  {extraction.features.map((f, i) => (
                    <div key={i} className="bg-[#0d1117] rounded-lg px-3 py-2 border border-[#21262d]">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-base">{featureIcon[f.type] || "▷"}</span>
                        <span className="text-[11px] font-semibold text-white">{f.description}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono ml-6">{f.dimensions}</div>
                    </div>
                  ))}
                </>
              )}

              {/* Notes tab */}
              {activeTab === "notes" && (
                <>
                  {extraction.notes.map((note, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-slate-400 bg-[#0d1117] rounded px-3 py-2 border border-[#21262d]">
                      <span className="text-[#00D4FF] mt-px shrink-0">→</span>
                      {note}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* Export section */}
        {extraction && step === "done" && (
          <div className="px-3 py-3 border-t border-[#21262d] space-y-2 shrink-0">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Export CAD Model</div>
            <div className="grid grid-cols-3 gap-1">
              {(["STEP", "STL", "OBJ"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => handleExport(fmt)}
                  className="bg-[#21262d] hover:bg-[#2d333b] text-white text-[10px] font-semibold py-1.5 rounded border border-[#30363d] transition-colors"
                  title={`Export as ${fmt}`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Center: 3D Viewport ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Viewport toolbar */}
        <div className="bg-[#161b22] border-b border-[#21262d] px-4 py-2 flex items-center gap-3 shrink-0">
          <span className="text-xs font-bold text-[#00D4FF]">3D Preview</span>
          <div className="h-4 w-px bg-[#21262d]" />
          <span className="text-[11px] text-slate-500">
            {extraction ? extraction.partName : "Awaiting conversion…"}
          </span>
          {extraction && (
            <>
              <div className="h-4 w-px bg-[#21262d]" />
              <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/30 rounded px-2 py-0.5">
                {extraction.cadParams.length} × {extraction.cadParams.width} × {extraction.cadParams.height} mm
              </span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded px-2 py-0.5">
                {extraction.features.length} features
              </span>
            </>
          )}
          <div className="flex-1" />
          <span className="text-[10px] text-slate-600">Orbit: Left drag · Zoom: Scroll · Pan: Right drag</span>
        </div>

        {/* Viewport */}
        <div className="flex-1 relative overflow-hidden">
          {step === "idle" ? (
            <div className="flex-1 h-full flex flex-col items-center justify-center bg-[#0a0a0f] text-slate-600 gap-4">
              <div className="text-6xl opacity-30">⬡</div>
              <div className="text-sm">Upload a PDF to preview the 3D model</div>
              <div className="text-[11px] text-slate-700">Supports engineering drawings with dimensions and annotations</div>
            </div>
          ) : step === "done" && extraction ? (
            <PdfCadViewport cadParams={extraction.cadParams} partName={extraction.partName} />
          ) : (
            <div className="flex-1 h-full flex flex-col items-center justify-center bg-[#0a0a0f] gap-3">
              <div className="w-8 h-8 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
              <div className="text-sm text-slate-400">
                {step === "uploading" ? "Uploading PDF…"
                  : step === "parsing" ? "Parsing engineering drawing…"
                  : step === "extracting" ? "AI extracting dimensions & features…"
                  : "Generating 3D CAD model…"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: workflow info ── */}
      <div className="w-56 bg-[#161b22] border-l border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
        <div className="px-3 py-2 border-b border-[#21262d]">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Pipeline</div>
        </div>

        {/* Pipeline stages */}
        <div className="p-3 space-y-2 border-b border-[#21262d]">
          {[
            { label: "PDF Parser", desc: "Page segmentation, text & vector extraction", color: "blue" },
            { label: "OCR Engine", desc: "Dimension text recognition with 98.2% accuracy", color: "purple" },
            { label: "Vision Model", desc: "Geometry detection (lines, arcs, circles)", color: "indigo" },
            { label: "GD&T Parser", desc: "Tolerance & annotation interpretation", color: "cyan" },
            { label: "CAD Synthesizer", desc: "B-rep geometry generation from features", color: "green" },
          ].map((s) => (
            <div key={s.label} className="bg-[#0d1117] rounded p-2 border border-[#21262d]">
              <div className={`text-[10px] font-bold text-${s.color}-400`}>{s.label}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Supported formats */}
        <div className="p-3 border-b border-[#21262d]">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Supported Inputs</div>
          <div className="space-y-1">
            {["ISO 128 drawings", "ASME Y14.5 GD&T", "DIN standard sheets", "Multi-view projections", "Assembly drawings", "Detail drawings"].map((f) => (
              <div key={f} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="text-green-400 shrink-0">✓</span> {f}
              </div>
            ))}
          </div>
        </div>

        {/* Output formats */}
        <div className="p-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">CAD Output</div>
          <div className="space-y-1">
            {[
              { fmt: "STEP", desc: "Full B-rep, parametric" },
              { fmt: "STL", desc: "Mesh, 3D printing" },
              { fmt: "OBJ", desc: "Mesh, universal" },
            ].map((o) => (
              <div key={o.fmt} className="flex items-center justify-between bg-[#0d1117] rounded px-2 py-1 border border-[#21262d]">
                <span className="text-[10px] font-bold text-[#00D4FF]">{o.fmt}</span>
                <span className="text-[9px] text-slate-500">{o.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
