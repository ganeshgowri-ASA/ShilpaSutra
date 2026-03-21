"use client";
import { useState, useRef, useCallback } from "react";
import { Upload, FileBox, Layers, Settings, Ruler, Target, Shield, Cpu, Zap, CheckCircle, Copy, ExternalLink, Download, Eye, Box, ChevronDown, ChevronRight, BarChart3, Scale, X, Code } from "lucide-react";
import Link from "next/link";

interface DetectedFeature {
  type: string; name: string; dimensions: string; confidence: number; color: string;
}
interface Parameter { name: string; value: number; unit: string; }
interface MaterialSuggestion { name: string; density: number; yieldStrength: number; costRating: number; color: string; }
interface ToleranceSpec { feature: string; type: string; value: string; reference: string; }
interface ModelStats { vertices: number; faces: number; edges: number; bodies: number; shells: number; volume: number; surfaceArea: number; }
interface AnalysisResult {
  partName: string; format: string; fileSize: number;
  boundingBox: { x: number; y: number; z: number };
  stats: ModelStats;
  features: DetectedFeature[];
  parameters: Parameter[];
  materials: MaterialSuggestion[];
  tolerances: ToleranceSpec[];
}

type AnalysisStep = "idle" | "loading" | "parsing" | "meshing" | "detecting" | "generating" | "done";
type ResultTab = "features" | "parameters" | "materials" | "tolerances";

const STEPS: { key: AnalysisStep; label: string }[] = [
  { key: "loading", label: "Loading File" },
  { key: "parsing", label: "Parsing Geometry" },
  { key: "meshing", label: "Mesh Analysis" },
  { key: "detecting", label: "Feature Detection" },
  { key: "generating", label: "Generating KCL" },
  { key: "done", label: "Complete" },
];

function generateReverseKCL(result: AnalysisResult): string {
  const p = result.parameters.reduce((acc, p) => { acc[p.name] = p.value; return acc; }, {} as Record<string, number>);
  return `// Reverse-engineered KCL — ShilpaSutra AI
// Source: ${result.partName} (${result.format})
@settings(defaultLengthUnit = mm)

// ── Detected Parameters ───────────────────────
const length = ${p.length ?? result.boundingBox.x}
const width  = ${p.width ?? result.boundingBox.y}
const height = ${p.height ?? result.boundingBox.z}
const holeDia = ${p.holeDia ?? 10}
const holeClearance = holeDia * 0.55
const filletR = ${p.filletR ?? 4}
const chamfer = ${p.chamfer ?? 2}

// ── Step 1: Base Extrude ──────────────────────
const body = startSketchOn("XY")
  |> startProfileAt([0, 0], %)
  |> lineTo([length, 0], %)
  |> lineTo([length, width], %)
  |> lineTo([0, width], %)
  |> close(%)
  |> extrude(height, %)

// ── Step 2: Through Holes (4×) ────────────────
const h1 = circle([holeDia, holeDia], holeClearance, body)
const h2 = circle([length - holeDia, holeDia], holeClearance, body)
const h3 = circle([length - holeDia, width - holeDia], holeClearance, body)
const h4 = circle([holeDia, width - holeDia], holeClearance, body)

// ── Step 3: Edge Fillets ──────────────────────
const filleted = fillet(filletR, body)

// ── Step 4: Top Chamfer ───────────────────────
const result = chamfer(chamfer, filleted)
`;
}

function highlightKCL(code: string): string {
  return code.split("\n").map(line => {
    if (line.trim().startsWith("//")) return `<span style="color:#6e7681">${line}</span>`;
    return line
      .replace(/\b(fn|let|const|return)\b/g, '<span style="color:#ff7b72">$1</span>')
      .replace(/\b(startSketchOn|startProfileAt|lineTo|close|extrude|revolve|fillet|chamfer|circle|loft|sweep|shell)\b/g, '<span style="color:#58a6ff">$1</span>')
      .replace(/@settings/g, '<span style="color:#58a6ff">@settings</span>')
      .replace(/\b(\d+(\.\d+)?)\b/g, '<span style="color:#d2a8ff">$1</span>')
      .replace(/"([^"]*)"/g, '<span style="color:#3fb950">"$1"</span>');
  }).join("\n");
}

function simulateAnalysis(filename: string): Promise<AnalysisResult> {
  return new Promise(resolve => setTimeout(() => resolve({
    partName: filename.replace(/\.(stl|obj|step|stp|iges|gltf)$/i, "").replace(/[_-]/g, " ") || "Bracket Assembly",
    format: filename.split(".").pop()?.toUpperCase() ?? "STL",
    fileSize: 284672,
    boundingBox: { x: 120, y: 80, z: 30 },
    stats: { vertices: 12847, faces: 25694, edges: 38541, bodies: 1, shells: 1, volume: 241600, surfaceArea: 38240 },
    features: [
      { type: "extrude", name: "Base Extrude", dimensions: "120×80×30 mm", confidence: 0.98, color: "emerald" },
      { type: "hole", name: "Through Holes ×4", dimensions: "Ø10 mm, depth: through", confidence: 0.97, color: "blue" },
      { type: "fillet", name: "Edge Fillets", dimensions: "R4 mm, 8 edges", confidence: 0.94, color: "purple" },
      { type: "chamfer", name: "Top Chamfer", dimensions: "2×45°, 4 edges", confidence: 0.91, color: "orange" },
      { type: "slot", name: "T-Slot Channel", dimensions: "12×6×60 mm", confidence: 0.88, color: "cyan" },
      { type: "boss", name: "Locating Boss", dimensions: "Ø15×5 mm", confidence: 0.85, color: "yellow" },
    ],
    parameters: [
      { name: "length", value: 120, unit: "mm" },
      { name: "width", value: 80, unit: "mm" },
      { name: "height", value: 30, unit: "mm" },
      { name: "holeDia", value: 10, unit: "mm" },
      { name: "holeSpacingX", value: 90, unit: "mm" },
      { name: "holeSpacingY", value: 60, unit: "mm" },
      { name: "filletR", value: 4, unit: "mm" },
      { name: "chamfer", value: 2, unit: "mm" },
      { name: "slotWidth", value: 12, unit: "mm" },
      { name: "wallThickness", value: 5, unit: "mm" },
    ],
    materials: [
      { name: "Aluminum 6061-T6", density: 2.70, yieldStrength: 276, costRating: 3, color: "blue" },
      { name: "Stainless Steel 304", density: 8.00, yieldStrength: 215, costRating: 4, color: "slate" },
      { name: "Titanium Ti-6Al-4V", density: 4.43, yieldStrength: 880, costRating: 5, color: "purple" },
    ],
    tolerances: [
      { feature: "Base surface", type: "Flatness", value: "0.05 mm", reference: "" },
      { feature: "Side faces", type: "Perpendicularity", value: "0.08 mm", reference: "A" },
      { feature: "Hole pattern", type: "Position", value: "Ø0.1 mm", reference: "A|B" },
      { feature: "Hole diameter", type: "Fit", value: "Ø10 H7", reference: "" },
      { feature: "All faces", type: "Surface Finish", value: "Ra 1.6 μm", reference: "" },
    ],
  }), 3000));
}

const featureTypeIcon: Record<string, string> = {
  extrude: "▭", hole: "⊙", fillet: "⌒", chamfer: "◿", slot: "⊏", boss: "⊕",
};

export default function CadAnalyzerPage() {
  const [step, setStep] = useState<AnalysisStep>("idle");
  const [filename, setFilename] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [tab, setTab] = useState<ResultTab>("features");
  const [isDragging, setIsDragging] = useState(false);
  const [viewStyle, setViewStyle] = useState<"shaded" | "wireframe" | "xray">("shaded");
  const [cameraView, setCameraView] = useState("iso");
  const [showBBox, setShowBBox] = useState(false);
  const [showDims, setShowDims] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ pipeline: true, stats: true, mass: true, complexity: true });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runAnalysis = useCallback(async (file: File) => {
    setFilename(file.name); setResult(null);
    const delays: Partial<Record<AnalysisStep, number>> = { loading: 500, parsing: 700, meshing: 800, detecting: 1200, generating: 600 };
    for (const s of STEPS.filter(s => s.key !== "done")) {
      setStep(s.key as AnalysisStep);
      if (s.key === "detecting") { const r = await simulateAnalysis(file.name); setResult(r); }
      else await new Promise(r => setTimeout(r, delays[s.key as AnalysisStep] ?? 600));
    }
    setStep("done");
  }, []);

  const handleFile = useCallback((file: File) => { runAnalysis(file); }, [runAnalysis]);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, [handleFile]);

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(generateReverseKCL(result));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const toggleSection = (k: string) => setExpandedSections(p => ({ ...p, [k]: !p[k] }));

  const kclCode = result ? generateReverseKCL(result) : "";
  const estMass = result ? ((result.stats.volume / 1000) * (result.materials[selectedMaterial]?.density ?? 2.7)).toFixed(1) : "—";
  const complexityScore = result ? Math.min(100, Math.round((result.features.length * 12) + (result.stats.faces / 1000))) : 0;

  return (
    <div className="flex h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* Left Panel */}
      <div className="w-80 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
        <div className="px-4 py-3 border-b border-[#21262d] shrink-0">
          <div className="flex items-center gap-2">
            <FileBox size={16} className="text-[#00D4FF]" />
            <div>
              <div className="text-sm font-bold">CAD Analyzer</div>
              <div className="text-[10px] text-slate-500">AI reverse-engineering & feature detection</div>
            </div>
          </div>
        </div>

        {/* Upload */}
        {step === "idle" && (
          <div className="p-4 border-b border-[#21262d]">
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${isDragging ? "border-[#00D4FF] bg-[#00D4FF]/5" : "border-[#30363d] hover:border-[#00D4FF]/60 hover:bg-[#00D4FF]/5"}`}
            >
              <Upload size={24} className="mx-auto mb-2 text-slate-500" />
              <div className="text-xs font-semibold mb-1">Drop CAD file here</div>
              <div className="text-[10px] text-slate-500">or click to browse</div>
              <div className="text-[9px] text-slate-600 mt-2">STL · OBJ · STEP · STP · IGES · glTF · GLB</div>
            </div>
            <input ref={fileInputRef} type="file" accept=".stl,.obj,.step,.stp,.iges,.igs,.gltf,.glb" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <button onClick={() => runAnalysis(new File([""], "Bracket_Assembly.stl"))}
              className="mt-3 w-full text-xs text-[#00D4FF] border border-[#00D4FF]/30 rounded-lg py-1.5 hover:bg-[#00D4FF]/10 transition-colors font-medium">
              ▶ Run Demo (Bracket Assembly)
            </button>
          </div>
        )}

        {/* Progress */}
        {step !== "idle" && (
          <div className="p-4 border-b border-[#21262d]">
            {filename && (
              <div className="flex items-center gap-2 mb-3 bg-[#0d1117] rounded p-2 border border-[#21262d]">
                <FileBox size={14} className="text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold truncate">{filename}</div>
                  {result && <div className="text-[9px] text-slate-500">{result.stats.vertices.toLocaleString()} vertices · {result.stats.faces.toLocaleString()} faces</div>}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              {STEPS.map((s, i) => {
                const cur = STEPS.findIndex(x => x.key === step);
                const isDone = i < cur || step === "done"; const isActive = s.key === step && step !== "done";
                return (
                  <div key={s.key} className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${isDone ? "bg-green-500 text-white" : isActive ? "bg-[#00D4FF] text-black" : "bg-[#21262d] text-slate-500"}`}>
                      {isDone ? "✓" : isActive ? <span className="animate-spin inline-block text-[8px]">⟳</span> : i + 1}
                    </div>
                    <span className={`text-[10px] ${isActive ? "text-white font-semibold" : isDone ? "text-slate-400" : "text-slate-600"}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
            {step === "done" && (
              <button onClick={() => { setStep("idle"); setFilename(null); setResult(null); }}
                className="mt-3 w-full text-[10px] text-slate-400 border border-[#21262d] rounded py-1 hover:bg-[#21262d]">
                ↺ Analyze Another File
              </button>
            )}
          </div>
        )}

        {/* Result Tabs */}
        {result && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex border-b border-[#21262d] shrink-0">
              {(["features", "parameters", "materials", "tolerances"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 text-[9px] font-semibold py-2 capitalize transition-colors ${tab === t ? "text-[#00D4FF] border-b-2 border-[#00D4FF]" : "text-slate-500 hover:text-white"}`}>
                  {t === "tolerances" ? "Tol." : t.slice(0, 5)}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {tab === "features" && result.features.map((f, i) => (
                <div key={i} className="bg-[#0d1117] rounded px-3 py-2 border border-[#21262d]">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-base">{featureTypeIcon[f.type] ?? "▷"}</span>
                    <span className="text-[11px] font-semibold text-white">{f.name}</span>
                    <span className={`ml-auto text-[9px] font-mono text-${f.color}-400`}>{(f.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono ml-6">{f.dimensions}</div>
                </div>
              ))}
              {tab === "parameters" && (
                <div className="space-y-2">
                  {result.parameters.map((p, i) => (
                    <div key={i} className="bg-[#0d1117] rounded px-3 py-2 border border-[#21262d] flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 flex-1">{p.name}</span>
                      <input type="number" defaultValue={p.value}
                        className="w-16 bg-[#21262d] text-white text-[11px] font-mono px-2 py-0.5 rounded border border-[#30363d] text-right" />
                      <span className="text-[9px] text-slate-500 w-8">{p.unit}</span>
                    </div>
                  ))}
                </div>
              )}
              {tab === "materials" && result.materials.map((m, i) => (
                <div key={i} onClick={() => setSelectedMaterial(i)}
                  className={`bg-[#0d1117] rounded px-3 py-2 border transition-colors cursor-pointer ${selectedMaterial === i ? "border-[#00D4FF]/60" : "border-[#21262d] hover:border-[#30363d]"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-white">{m.name}</span>
                    {selectedMaterial === i && <CheckCircle size={11} className="text-[#00D4FF]" />}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[["Density", `${m.density} g/cm³`], ["Yield", `${m.yieldStrength} MPa`], ["Cost", "★".repeat(m.costRating)]].map(([k, v]) => (
                      <div key={k} className="text-center">
                        <div className="text-[8px] text-slate-600">{k}</div>
                        <div className="text-[9px] text-slate-300 font-mono">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {tab === "tolerances" && result.tolerances.map((t, i) => (
                <div key={i} className="bg-[#0d1117] rounded px-3 py-2 border border-[#21262d]">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-semibold text-white">{t.type}</span>
                    <span className="text-[10px] font-mono text-[#00D4FF]">{t.value}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500">{t.feature}</span>
                    {t.reference && <span className="text-[9px] bg-slate-700 px-1 rounded text-slate-300">Ref: {t.reference}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 3D Viewer toolbar */}
        <div className="bg-[#161b22] border-b border-[#21262d] px-3 py-2 flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold text-slate-400">3D MODEL VIEWER</span>
          <div className="h-4 w-px bg-[#21262d]" />
          {(["shaded", "wireframe", "xray"] as const).map(s => (
            <button key={s} onClick={() => setViewStyle(s)}
              className={`text-[10px] px-2 py-0.5 rounded transition-colors capitalize ${viewStyle === s ? "bg-[#00D4FF]/10 text-[#00D4FF]" : "text-slate-500 hover:text-white"}`}>
              {s === "xray" ? "X-Ray" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <div className="h-4 w-px bg-[#21262d]" />
          {["Front", "Back", "Top", "Bottom", "Left", "Right", "Iso"].map(v => (
            <button key={v} onClick={() => setCameraView(v.toLowerCase())}
              className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${cameraView === v.toLowerCase() ? "text-[#00D4FF]" : "text-slate-600 hover:text-white"}`}>
              {v}
            </button>
          ))}
          <div className="h-4 w-px bg-[#21262d]" />
          <button onClick={() => setShowBBox(!showBBox)} className={`text-[10px] px-2 py-0.5 rounded transition-colors ${showBBox ? "text-[#00D4FF]" : "text-slate-500 hover:text-white"}`}>BBox</button>
          <button onClick={() => setShowDims(!showDims)} className={`text-[10px] px-2 py-0.5 rounded transition-colors ${showDims ? "text-[#00D4FF]" : "text-slate-500 hover:text-white"}`}>Dims</button>
        </div>

        {/* 3D Viewer area */}
        <div className="flex-1 relative bg-[#0a0a0f] flex items-center justify-center overflow-hidden" style={{ minHeight: "200px" }}>
          {step === "idle" ? (
            <div className="text-center text-slate-600">
              <FileBox size={52} className="mx-auto mb-3 opacity-20" />
              <div className="text-sm">Upload a CAD file to analyze</div>
              <div className="text-[11px] mt-1 text-slate-700">Supports STL · OBJ · STEP · IGES · glTF</div>
            </div>
          ) : step !== "done" ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
              <div className="text-sm text-slate-400">Analyzing geometry…</div>
            </div>
          ) : result ? (
            <div className="relative w-full h-full">
              {/* Pseudo 3D box visualization */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative" style={{ perspective: "600px" }}>
                  <div style={{
                    width: "180px", height: "120px",
                    background: viewStyle === "wireframe" ? "transparent" : viewStyle === "xray" ? "rgba(0,212,255,0.05)" : "linear-gradient(135deg,#1a2744,#0d1b2a)",
                    border: `2px solid ${viewStyle === "wireframe" ? "#00D4FF" : "#1a3a5c"}`,
                    transform: "rotateX(-20deg) rotateY(35deg)",
                    transformStyle: "preserve-3d",
                    boxShadow: viewStyle !== "wireframe" ? "inset 0 0 40px rgba(0,212,255,0.1), 0 20px 60px rgba(0,0,0,0.5)" : "none",
                    position: "relative",
                  }}>
                    {/* Grid overlay for wireframe */}
                    {viewStyle === "wireframe" && [0.25, 0.5, 0.75].map(t => (
                      <div key={t} style={{ position: "absolute", top: `${t * 100}%`, left: 0, right: 0, height: 1, background: "#00D4FF33" }} />
                    ))}
                    {viewStyle === "wireframe" && [0.25, 0.5, 0.75].map(t => (
                      <div key={t} style={{ position: "absolute", left: `${t * 100}%`, top: 0, bottom: 0, width: 1, background: "#00D4FF33" }} />
                    ))}
                    {/* Hole indicators */}
                    {[0.2, 0.8].map(x => [0.2, 0.8].map(y => (
                      <div key={`${x}-${y}`} style={{ position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, transform: "translate(-50%,-50%)", width: 12, height: 12, borderRadius: "50%", border: "1.5px solid #00D4FF", background: "transparent" }} />
                    )))}
                    {/* Dimension annotations */}
                    {showDims && (
                      <>
                        <div style={{ position: "absolute", bottom: -24, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: "#00D4FF", whiteSpace: "nowrap" }}>
                          ↔ {result.boundingBox.x} mm
                        </div>
                        <div style={{ position: "absolute", right: -56, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: "#00D4FF", whiteSpace: "nowrap" }}>
                          {result.boundingBox.y} mm ↕
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {/* View label */}
              <div className="absolute top-2 left-2 text-[9px] bg-[#161b22]/80 text-slate-400 px-2 py-1 rounded border border-[#21262d]">
                {viewStyle.toUpperCase()} · {cameraView.toUpperCase()} VIEW
              </div>
              {showBBox && (
                <div className="absolute top-2 right-2 text-[9px] bg-[#161b22]/80 text-[#00D4FF] px-2 py-1 rounded border border-[#00D4FF]/30">
                  {result.boundingBox.x}×{result.boundingBox.y}×{result.boundingBox.z} mm
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* KCL Code panel */}
        <div className="h-52 border-t border-[#21262d] flex flex-col shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161b22] border-b border-[#21262d] shrink-0">
            <Code size={12} className="text-[#00D4FF]" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Reverse-Engineered KCL</span>
            <div className="ml-auto flex gap-1">
              <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-[#21262d] text-slate-400 hover:text-white transition-colors">
                {copied ? <CheckCircle size={10} className="text-green-400" /> : <Copy size={10} />} {copied ? "Copied" : "Copy"}
              </button>
              <Link href="/designer" className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-[#00D4FF]/30 text-[#00D4FF] hover:bg-[#00D4FF]/10 transition-colors">
                <ExternalLink size={10} /> Open in Designer
              </Link>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex">
            <div className="w-9 bg-[#0d1117] text-right px-2 py-2 select-none shrink-0 border-r border-[#21262d]">
              {kclCode.split("\n").map((_, i) => (
                <div key={i} className="text-[10px] text-slate-700 font-mono leading-[18px] h-[18px]">{i + 1}</div>
              ))}
            </div>
            <div className="flex-1 overflow-x-auto p-2">
              {result ? (
                <pre className="text-[11px] font-mono leading-[18px]" dangerouslySetInnerHTML={{ __html: highlightKCL(kclCode) }} />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 text-xs">Upload a CAD file to generate reverse-engineered KCL code</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-64 bg-[#161b22] border-l border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
        {/* Pipeline */}
        <div className="border-b border-[#21262d]">
          <button onClick={() => toggleSection("pipeline")} className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-400 uppercase hover:text-white">
            RE Pipeline {expandedSections.pipeline ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          {expandedSections.pipeline && (
            <div className="px-3 pb-3 space-y-1.5">
              {[
                { label: "File Parser", icon: <FileBox size={10} />, color: "blue" },
                { label: "Mesh Analyzer", icon: <Layers size={10} />, color: "purple" },
                { label: "Feature Detector", icon: <Target size={10} />, color: "cyan" },
                { label: "Param Extractor", icon: <Ruler size={10} />, color: "green" },
                { label: "KCL Generator", icon: <Code size={10} />, color: "orange" },
                { label: "Material AI", icon: <Scale size={10} />, color: "emerald" },
              ].map(s => (
                <div key={s.label} className={`flex items-center gap-2 bg-[#0d1117] rounded px-2 py-1.5 border border-[#21262d] ${step !== "idle" ? "opacity-100" : "opacity-50"}`}>
                  <span className={`text-${s.color}-400`}>{s.icon}</span>
                  <span className="text-[10px] text-slate-300">{s.label}</span>
                  {step === "done" && <CheckCircle size={9} className="ml-auto text-green-400" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        {result && (
          <>
            <div className="border-b border-[#21262d]">
              <button onClick={() => toggleSection("stats")} className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-400 uppercase hover:text-white">
                Model Statistics {expandedSections.stats ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {expandedSections.stats && (
                <div className="px-3 pb-3 space-y-1">
                  {[
                    ["Vertices", result.stats.vertices.toLocaleString()],
                    ["Faces", result.stats.faces.toLocaleString()],
                    ["Edges", result.stats.edges.toLocaleString()],
                    ["Bodies", result.stats.bodies],
                    ["Shells", result.stats.shells],
                    ["Format", result.format],
                    ["File Size", `${(result.fileSize / 1024).toFixed(0)} KB`],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between text-[10px]">
                      <span className="text-slate-500">{k}</span>
                      <span className="text-white font-mono">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-b border-[#21262d]">
              <button onClick={() => toggleSection("mass")} className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-400 uppercase hover:text-white">
                Mass Properties {expandedSections.mass ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {expandedSections.mass && (
                <div className="px-3 pb-3 space-y-1">
                  {[
                    ["Volume", `${(result.stats.volume / 1000).toFixed(1)} cm³`],
                    ["Surface Area", `${(result.stats.surfaceArea / 100).toFixed(1)} cm²`],
                    ["Est. Mass", `${estMass} g`],
                    ["Material", result.materials[selectedMaterial]?.name.split(" ")[0] ?? "Al"],
                    ["Density", `${result.materials[selectedMaterial]?.density ?? 2.7} g/cm³`],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between text-[10px]">
                      <span className="text-slate-500">{k}</span>
                      <span className="text-white font-mono">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-b border-[#21262d]">
              <button onClick={() => toggleSection("complexity")} className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-400 uppercase hover:text-white">
                Complexity {expandedSections.complexity ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {expandedSections.complexity && (
                <div className="px-3 pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-500">Score</span>
                    <span className="text-[13px] font-bold text-[#00D4FF]">{complexityScore}/100</span>
                  </div>
                  <div className="w-full bg-[#21262d] rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${complexityScore}%`, background: complexityScore > 70 ? "#f85149" : complexityScore > 40 ? "#d29922" : "#3fb950" }} />
                  </div>
                  <div className="text-[9px] text-slate-600 mt-1">
                    {complexityScore > 70 ? "High complexity — advanced machining required" : complexityScore > 40 ? "Medium complexity — standard CNC operations" : "Low complexity — basic operations"}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-3 space-y-2 mt-auto">
              <Link href="/designer"
                className="w-full flex items-center justify-center gap-2 text-[11px] font-semibold bg-[#00D4FF] text-black rounded-lg py-2 hover:bg-[#00bfe8] transition-colors">
                <ExternalLink size={12} /> Reproduce in Designer
              </Link>
              <button className="w-full flex items-center justify-center gap-2 text-[10px] text-slate-400 border border-[#21262d] rounded-lg py-1.5 hover:bg-[#21262d] transition-colors">
                <Download size={11} /> Export Analysis Report
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
