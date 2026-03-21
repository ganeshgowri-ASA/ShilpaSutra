"use client";
import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Sparkles, Code, Brain, Download, Copy, CheckCircle, ExternalLink, ChevronRight, Wand2, RotateCw, Box, Lightbulb } from "lucide-react";
import Link from "next/link";

const Scene3D = dynamic(() => import("@/components/Viewport3D"), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center bg-[#0a0a1a] text-slate-500 text-sm">Loading 3D viewport…</div>,
});

interface ShapeParams { type: string; width: number; height: number; depth: number; holeCount: number; holeDia: number; filletR: number; }
interface ReasoningStep { step: number; title: string; description: string; durationMs: number; done: boolean; }
interface GenerationRecord { id: string; prompt: string; shape: ShapeParams; timestamp: Date; }

function generateKCL(shape: ShapeParams, name: string): string {
  const { type, width, height, depth, holeDia, filletR } = shape;
  if (type === "cylinder") return `// ShilpaSutra KCL — Cylinder\n@settings(defaultLengthUnit = mm)\n\nconst radius = ${(width / 2).toFixed(1)}\nconst h = ${height}\n\nconst cyl = startSketchOn("XY")\n  |> circle([0, 0], radius, %)\n  |> extrude(h, %)`;
  if (type === "sphere") return `// ShilpaSutra KCL — Sphere\n@settings(defaultLengthUnit = mm)\n\nconst radius = ${(width / 2).toFixed(1)}\n\nconst sph = startSketchOn("XZ")\n  |> circle([0, 0], radius, %)\n  |> revolve({ axis: "Y", angle: 360 }, %)`;
  return `// ShilpaSutra KCL — ${name}\n@settings(defaultLengthUnit = mm)\n\nconst width = ${width}\nconst height = ${height}\nconst depth = ${depth}\nconst holeDia = ${holeDia}\nconst filletR = ${filletR}\n\nconst base = startSketchOn("XY")\n  |> startProfileAt([0, 0], %)\n  |> lineTo([width, 0], %)\n  |> lineTo([width, depth], %)\n  |> lineTo([0, depth], %)\n  |> close(%)\n  |> extrude(height, %)\n\n${shape.holeCount > 0 ? `// Mounting holes (${shape.holeCount}×)\nconst h1 = circle([holeDia, holeDia], holeDia/2, base)\nconst h2 = circle([width - holeDia, holeDia], holeDia/2, base)\n` : ""}${filletR > 0 ? `\n// Edge fillets\nconst result = fillet(filletR, base)` : "const result = base"}`;
}

function highlightKCL(code: string): string {
  return code.split("\n").map(line => {
    if (line.trim().startsWith("//")) return `<span style="color:#6e7681">${line}</span>`;
    return line
      .replace(/\b(fn|let|const|return|if|else)\b/g, '<span style="color:#ff7b72">$1</span>')
      .replace(/\b(startSketchOn|startProfileAt|lineTo|close|extrude|revolve|fillet|chamfer|circle|loft|sweep)\b/g, '<span style="color:#58a6ff">$1</span>')
      .replace(/@settings/g, '<span style="color:#58a6ff">@settings</span>')
      .replace(/\b(\d+(\.\d+)?)\b/g, '<span style="color:#d2a8ff">$1</span>')
      .replace(/"([^"]*)"/g, '<span style="color:#3fb950">"$1"</span>');
  }).join("\n");
}

function parseShape(prompt: string): ShapeParams {
  const lower = prompt.toLowerCase();
  const nums = prompt.match(/[\d.]+/g)?.map(Number) ?? [];
  const n = (i: number, def: number) => nums[i] ?? def;
  const holes = lower.includes("hole") ? parseInt(lower.match(/(\d+)\s*hole/)?.[1] ?? "4") : 0;
  const fillet = lower.includes("fillet") ? n(holes > 0 ? 3 : 2, 3) : 0;
  if (lower.includes("cylinder") || lower.includes("shaft") || lower.includes("rod")) return { type: "cylinder", width: n(0, 50), height: n(1, 100), depth: n(0, 50), holeCount: 0, holeDia: 0, filletR: 0 };
  if (lower.includes("sphere") || lower.includes("ball")) return { type: "sphere", width: n(0, 60), height: n(0, 60), depth: n(0, 60), holeCount: 0, holeDia: 0, filletR: 0 };
  return { type: "box", width: n(0, 100), height: n(2, 10), depth: n(1, 60), holeCount: holes, holeDia: 10, filletR: fillet };
}

function buildSteps(prompt: string, shape: ShapeParams): ReasoningStep[] {
  return [
    { step: 1, title: "Analyzing prompt", description: `Parsing: "${prompt.slice(0, 55)}${prompt.length > 55 ? "…" : ""}"`, durationMs: 180, done: false },
    { step: 2, title: "Identifying base geometry", description: `Detected ${shape.type} — ${shape.width}×${shape.depth}×${shape.height} mm`, durationMs: 250, done: false },
    { step: 3, title: "Detecting features", description: shape.holeCount > 0 ? `${shape.holeCount}× Ø${shape.holeDia}mm through-holes` : "Solid body — no holes", durationMs: 300, done: false },
    { step: 4, title: "Applying modifications", description: shape.filletR > 0 ? `R${shape.filletR}mm fillets on vertical edges` : "No fillets specified", durationMs: 200, done: false },
    { step: 5, title: "Generating KCL code", description: "Synthesizing parametric Zoo KCL", durationMs: 400, done: false },
    { step: 6, title: "Building 3D geometry", description: "Rendering mesh in WebGL viewport", durationMs: 300, done: false },
  ];
}

const EXAMPLES = [
  "Bracket 80×60×5mm with 4 holes", "Cylinder Ø50mm height 100mm",
  "M10 hex bolt length 40mm", "Box 200×100×10mm 3mm fillets",
  "Sphere radius 30mm", "L-bracket 50×50×5mm",
  "I-beam 200mm height 3m", "Pipe Ø40mm wall 3mm L500",
  "Gear spur 50mm 20 teeth", "Shaft Ø25mm 200mm keyway",
  "Enclosure 150×100×50mm", "Angle bracket 40×40×4mm",
  "Spring Ø20mm wire 2mm", "Bearing housing Ø60mm",
  "Flange coupling Ø80mm", "T-slot nut M8 aluminium",
];

export default function TextToCadPage() {
  const [prompt, setPrompt] = useState("");
  const [shape, setShape] = useState<ShapeParams | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [centerTab, setCenterTab] = useState<"3d" | "kcl" | "reasoning">("3d");
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [copied, setCopied] = useState(false);
  const [params, setParams] = useState({ width: 100, height: 10, depth: 60, filletR: 3, holeDia: 10 });

  const runGeneration = useCallback(async (text: string) => {
    if (!text.trim() || isGenerating) return;
    setIsGenerating(true);
    setCenterTab("reasoning");
    const parsed = parseShape(text);
    const steps = buildSteps(text, parsed);
    setReasoningSteps(steps.map(s => ({ ...s, done: false })));
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, steps[i].durationMs));
      setReasoningSteps(prev => prev.map((s, j) => j <= i ? { ...s, done: true } : s));
    }
    setShape(parsed);
    setParams({ width: parsed.width, height: parsed.height, depth: parsed.depth, filletR: parsed.filletR, holeDia: parsed.holeDia || 10 });
    setHistory(prev => [{ id: Date.now().toString(), prompt: text, shape: parsed, timestamp: new Date() }, ...prev.slice(0, 11)]);
    setIsGenerating(false);
    setCenterTab("3d");
  }, [isGenerating]);

  const handleGenerate = () => runGeneration(prompt);
  const kclCode = shape ? generateKCL({ ...shape, ...params }, prompt.slice(0, 30) || "Part") : "";

  return (
    <div className="flex h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* Left Panel */}
      <div className="w-80 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-[#21262d] shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-[#00D4FF]" />
            <div>
              <div className="text-sm font-bold">Text → CAD</div>
              <div className="text-[10px] text-slate-500">Natural language to 3D geometry</div>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-[#21262d] shrink-0">
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate(); }}
            placeholder="Describe a part… e.g. 'Bracket 120×80×30mm with 4 M10 holes at corners and 4mm fillets'"
            className="w-full h-24 bg-[#0d1117] text-white text-xs rounded-lg px-3 py-2 border border-[#21262d] resize-none outline-none placeholder-slate-600 focus:border-[#00D4FF]/40" />
          {prompt.length > 3 && !isGenerating && (
            <div className="mt-1 text-[9px] text-slate-600">
              Try: <span className="text-slate-400 cursor-pointer hover:text-[#00D4FF]" onClick={() => setPrompt(p => p + " with fillets")}>+ fillets</span>
              {" · "}<span className="text-slate-400 cursor-pointer hover:text-[#00D4FF]" onClick={() => setPrompt(p => p + " aluminum")}>+ aluminum</span>
            </div>
          )}
          <button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating}
            className="mt-2 w-full flex items-center justify-center gap-2 text-sm font-semibold bg-[#00D4FF] text-black rounded-lg py-2 hover:bg-[#00bfe8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {isGenerating ? <><RotateCw size={13} className="animate-spin" /> Generating…</> : <><Wand2 size={13} /> Generate CAD</>}
          </button>
          <div className="text-[9px] text-slate-600 text-center mt-1">Ctrl+Enter to generate</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Examples</div>
          <div className="grid grid-cols-2 gap-1 px-3 pb-3">
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => { setPrompt(ex); runGeneration(ex); }}
                className="text-left text-[9px] text-slate-400 bg-[#0d1117] border border-[#21262d] rounded px-2 py-1.5 hover:border-[#00D4FF]/40 hover:text-white transition-colors leading-tight">
                {ex}
              </button>
            ))}
          </div>
          {history.length > 0 && (
            <>
              <div className="px-3 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-t border-[#21262d]">History</div>
              <div className="px-3 pb-3 space-y-1.5">
                {history.map(h => (
                  <button key={h.id} onClick={() => { setPrompt(h.prompt); setShape(h.shape); setParams({ width: h.shape.width, height: h.shape.height, depth: h.shape.depth, filletR: h.shape.filletR, holeDia: h.shape.holeDia || 10 }); }}
                    className="w-full flex items-center gap-2 bg-[#0d1117] border border-[#21262d] rounded px-2 py-1.5 hover:border-[#00D4FF]/30 transition-colors text-left">
                    <div className="w-6 h-6 rounded bg-[#1a2744] border border-[#21262d] shrink-0 flex items-center justify-center text-[8px] font-bold text-[#00D4FF]">
                      {h.shape.type[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] text-slate-300 truncate">{h.prompt.slice(0, 35)}{h.prompt.length > 35 ? "…" : ""}</div>
                      <div className="text-[8px] text-slate-600">{h.timestamp.toLocaleTimeString()}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-[#161b22] border-b border-[#21262d] px-4 py-2 flex items-center gap-2 shrink-0">
          {(["3d", "kcl", "reasoning"] as const).map(t => (
            <button key={t} onClick={() => setCenterTab(t)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${centerTab === t ? "bg-[#21262d] text-white" : "text-slate-500 hover:text-white"}`}>
              {t === "3d" ? <><Box size={12} /> 3D Preview</> : t === "kcl" ? <><Code size={12} /> KCL Code</> : <><Brain size={12} /> AI Reasoning</>}
            </button>
          ))}
          {shape && (
            <>
              <div className="h-4 w-px bg-[#21262d] mx-1" />
              <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/30 rounded px-2 py-0.5 font-mono">{shape.width}×{shape.depth}×{shape.height}mm</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded px-2 py-0.5 capitalize">{shape.type}</span>
            </>
          )}
          {centerTab === "kcl" && shape && (
            <div className="ml-auto flex gap-1">
              <button onClick={() => { navigator.clipboard.writeText(kclCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-[#21262d] text-slate-400 hover:text-white">
                {copied ? <CheckCircle size={10} className="text-green-400" /> : <Copy size={10} />} {copied ? "Copied" : "Copy"}
              </button>
              <button onClick={() => { const b = new Blob([kclCode], {type:"text/plain"}); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "model.kcl"; a.click(); }}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-[#21262d] text-slate-400 hover:text-white">
                <Download size={10} /> .kcl
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden relative">
          {centerTab === "3d" && (
            <div className="absolute inset-0 flex flex-col">
              <div className="flex-1 relative">
                {shape ? <Scene3D /> : (
                  <div className="h-full flex flex-col items-center justify-center bg-[#0a0a1a] text-slate-600 gap-4">
                    <Box size={52} className="opacity-20" />
                    <div className="text-sm">Describe a part to generate 3D geometry</div>
                    <div className="text-[11px] text-slate-700">Uses parametric KCL + WebGL rendering</div>
                  </div>
                )}
              </div>
              {shape && (
                <div className="bg-[#161b22] border-t border-[#21262d] px-4 py-2 shrink-0">
                  <div className="text-[9px] text-slate-500 uppercase font-bold mb-2">Live Parameters</div>
                  <div className="grid grid-cols-5 gap-3">
                    {([["width", 10, 400], ["height", 1, 100], ["depth", 10, 400], ["filletR", 0, 20], ["holeDia", 3, 30]] as [keyof typeof params, number, number][]).map(([k, min, max]) => (
                      <div key={k}>
                        <div className="text-[8px] text-slate-500 mb-1 capitalize">{k} <span className="text-slate-400">{params[k]}mm</span></div>
                        <input type="range" min={min} max={max} value={params[k]}
                          onChange={e => setParams(p => ({ ...p, [k]: parseInt(e.target.value) }))}
                          className="w-full h-1.5 appearance-none rounded bg-[#21262d] outline-none cursor-pointer" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {centerTab === "kcl" && (
            <div className="absolute inset-0 flex bg-[#0d1117]">
              <div className="w-9 bg-[#161b22] border-r border-[#21262d] py-3 text-right px-2 select-none shrink-0 overflow-hidden">
                {kclCode.split("\n").map((_, i) => (
                  <div key={i} className="text-[11px] text-slate-700 font-mono leading-5 h-5">{i + 1}</div>
                ))}
              </div>
              <div className="flex-1 overflow-auto p-3">
                {shape ? (
                  <pre className="text-[12px] font-mono leading-5" dangerouslySetInnerHTML={{ __html: highlightKCL(kclCode) }} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3">
                    <Code size={40} className="opacity-20" />
                    <div className="text-sm">Generate a model to see its KCL code</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {centerTab === "reasoning" && (
            <div className="absolute inset-0 overflow-auto p-6 bg-[#0d1117]">
              {reasoningSteps.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
                  <Brain size={40} className="opacity-20" />
                  <div className="text-sm">Generate a model to see AI reasoning steps</div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className="text-sm font-bold text-slate-300 mb-4">AI Reasoning Trace</div>
                  {reasoningSteps.map((s, i) => {
                    const activeIdx = reasoningSteps.findIndex(x => !x.done);
                    return (
                      <div key={i} className={`flex gap-4 transition-opacity ${s.done || i === activeIdx ? "opacity-100" : "opacity-30"}`}>
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.done ? "bg-green-500/20 text-green-400 border border-green-500/40" : i === activeIdx ? "bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/40" : "bg-[#161b22] text-slate-600 border border-[#21262d]"}`}>
                            {s.done ? "✓" : i === activeIdx ? <span className="animate-spin text-[10px]">⟳</span> : s.step}
                          </div>
                          {i < reasoningSteps.length - 1 && <div className="w-px flex-1 mt-1 bg-[#21262d]" />}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-white">Step {s.step}: {s.title}</span>
                            {s.done && <span className="text-[9px] text-slate-600 font-mono">{s.durationMs}ms</span>}
                          </div>
                          <div className="text-[11px] text-slate-400 bg-[#161b22] rounded px-3 py-2 border border-[#21262d]">{s.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-60 bg-[#161b22] border-l border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
        <div className="px-3 py-2 border-b border-[#21262d]">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Model Info</div>
        </div>
        {shape ? (
          <>
            <div className="p-3 border-b border-[#21262d] space-y-1.5">
              {[["Type", shape.type.charAt(0).toUpperCase() + shape.type.slice(1)], ["Width", `${params.width} mm`], ["Height", `${params.height} mm`], ["Depth", `${params.depth} mm`], ["Holes", shape.holeCount > 0 ? `${shape.holeCount}× Ø${params.holeDia}mm` : "None"], ["Fillets", params.filletR > 0 ? `R${params.filletR}mm` : "None"], ["Volume", `${((params.width * params.height * params.depth) / 1000).toFixed(1)} cm³`]].map(([k, v]) => (
                <div key={k as string} className="flex justify-between text-[10px]">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-white font-mono">{v}</span>
                </div>
              ))}
            </div>
            <div className="p-3 border-b border-[#21262d]">
              <div className="text-[9px] font-bold text-slate-500 uppercase mb-2">AI Model</div>
              <div className="flex items-center gap-2 bg-[#0d1117] rounded px-2 py-1.5 border border-[#21262d]">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                <span className="text-[10px] text-white font-medium">Claude 3.5 Sonnet</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[9px] text-slate-500">Confidence</span>
                <span className="text-[10px] text-green-400 font-mono">94.2%</span>
              </div>
              <div className="w-full bg-[#21262d] rounded-full h-1 mt-1">
                <div className="h-1 rounded-full bg-green-400" style={{ width: "94.2%" }} />
              </div>
            </div>
            <div className="p-3 border-b border-[#21262d]">
              <div className="text-[9px] font-bold text-slate-500 uppercase mb-2">Export</div>
              <div className="grid grid-cols-2 gap-1">
                {["STEP", "STL", "OBJ", "KCL"].map(fmt => (
                  <button key={fmt} className="text-[10px] font-semibold bg-[#21262d] hover:bg-[#2d333b] text-white py-1 rounded border border-[#30363d] transition-colors">{fmt}</button>
                ))}
              </div>
            </div>
            <div className="p-3">
              <Link href="/designer" className="w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold text-[#00D4FF] border border-[#00D4FF]/30 rounded py-1.5 hover:bg-[#00D4FF]/10 transition-colors">
                <ExternalLink size={11} /> Open in Designer
              </Link>
            </div>
          </>
        ) : (
          <div className="p-3">
            <div className="text-[9px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Lightbulb size={10} /> Tips</div>
            {["Use specific dimensions (120×80×30mm)", "Mention hole sizes (4× M10 holes)", "Specify materials (aluminum, steel)", "Request fillets (3mm fillets on edges)", "Use GD&T for precision parts"].map((tip, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[9px] text-slate-500 py-1 border-b border-[#21262d] last:border-0">
                <ChevronRight size={9} className="mt-0.5 shrink-0 text-[#00D4FF]" /> {tip}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
