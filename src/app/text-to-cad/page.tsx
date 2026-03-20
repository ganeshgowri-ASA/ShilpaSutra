"use client";
import { useState, useCallback, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

// --- Types ---
interface Generation {
  id: string;
  prompt: string;
  status: "generating" | "complete" | "error";
  format: string;
  time?: string;
  vertices?: number;
  faces?: number;
  model?: string;
  dims?: ParsedDimensions | null;
}

interface PromptTemplate {
  label: string;
  prompt: string;
  category: string;
}

// --- Data ---
const outputFormats = ["STEP", "STL", "OBJ", "glTF", "IGES", "DXF"];

const aiModels = [
  { id: "claude-sonnet", label: "Claude Sonnet", badge: "Fast" },
  { id: "claude-opus", label: "Claude Opus", badge: "Best" },
  { id: "gpt-4o", label: "GPT-4o", badge: "" },
  { id: "gemini-pro", label: "Gemini Pro", badge: "" },
];

const promptTemplates: PromptTemplate[] = [
  { label: "Simple Bracket", prompt: "Create an L-bracket with 2 mounting holes, 50mm wide, 30mm tall, 3mm thick", category: "Brackets" },
  { label: "Spur Gear", prompt: "Create a spur gear with 20 teeth, module 2, 10mm face width, 8mm bore", category: "Gears" },
  { label: "Box Enclosure", prompt: "Design a box enclosure 120x80x40mm with 2mm wall thickness and a removable lid", category: "Enclosures" },
  { label: "Pipe Assembly", prompt: "Create a pipe section DN50 with flanges on both ends, 200mm long", category: "Piping" },
  { label: "Heat Sink", prompt: "Design a heat sink with 12 fins, 50x50mm base, 25mm height, aluminum", category: "Thermal" },
  { label: "Motor Mount", prompt: "Create a NEMA23 motor mounting plate, 4mm thick, with center bore and mounting holes", category: "Brackets" },
  { label: "Custom", prompt: "", category: "Custom" },
];

// --- Dimension parser ---
interface ParsedDimensions {
  width: number;
  height: number;
  depth: number;
  unit: string;
}

function parseDimensions(text: string): ParsedDimensions | null {
  // Match patterns like "200mm x 100mm x 50mm", "200 x 100 x 50mm", "200×100×50 mm"
  const pattern =
    /(\d+(?:\.\d+)?)\s*(mm|cm|m|in|")?\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|in|")?\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|in|")?/i;
  const match = text.match(pattern);
  if (!match) return null;

  const unit = (match[2] || match[4] || match[6] || "mm").toLowerCase();
  const toScale = (v: number, u: string): number => {
    // normalise all units to mm then divide by 100 so 100mm = 1 Three.js unit
    let mm = v;
    if (u === "cm") mm = v * 10;
    else if (u === "m") mm = v * 1000;
    else if (u === "in" || u === '"') mm = v * 25.4;
    return mm / 100;
  };

  return {
    width: toScale(parseFloat(match[1]), unit),
    height: toScale(parseFloat(match[3]), unit),
    depth: toScale(parseFloat(match[5]), unit),
    unit,
  };
}

// --- 3D Preview geometry ---
function GeneratedPreview({ shape, dims }: { shape: string; dims?: ParsedDimensions | null }) {
  // Parsed dimensions → exact BoxGeometry
  if (dims) {
    return (
      <mesh>
        <boxGeometry args={[dims.width, dims.height, dims.depth]} />
        <meshStandardMaterial color="#00D4FF" metalness={0.3} roughness={0.5} transparent opacity={0.9} />
      </mesh>
    );
  }

  if (shape === "bracket") {
    return (
      <group>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[1.2, 0.1, 0.6]} />
          <meshStandardMaterial color="#00D4FF" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[-0.55, 0.5, 0]}>
          <boxGeometry args={[0.1, 1, 0.6]} />
          <meshStandardMaterial color="#00D4FF" metalness={0.4} roughness={0.5} />
        </mesh>
      </group>
    );
  }
  if (shape === "gear") {
    return (
      <group>
        <mesh>
          <cylinderGeometry args={[0.7, 0.7, 0.3, 20]} />
          <meshStandardMaterial color="#b87333" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.15, 0.15, 0.31, 16]} />
          <meshStandardMaterial color="#0d1117" />
        </mesh>
      </group>
    );
  }
  if (shape === "box") {
    return (
      <mesh>
        <boxGeometry args={[1.2, 0.5, 0.8]} />
        <meshStandardMaterial color="#4a5568" metalness={0.2} roughness={0.6} transparent opacity={0.8} />
      </mesh>
    );
  }
  return (
    <mesh>
      <torusKnotGeometry args={[0.4, 0.15, 100, 16]} />
      <meshStandardMaterial color="#00D4FF" metalness={0.3} roughness={0.5} />
    </mesh>
  );
}

function PreviewCanvas({ shape, dims }: { shape: string; dims?: ParsedDimensions | null }) {
  return (
    <Canvas camera={{ position: [2, 1.5, 2], fov: 40 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 2]} intensity={1} />
      <directionalLight position={[-2, 2, -1]} intensity={0.3} />
      <GeneratedPreview shape={shape} dims={dims} />
      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={2} />
      <gridHelper args={[4, 20, "#21262d", "#21262d"]} />
    </Canvas>
  );
}

// --- Main Component ---
export default function TextToCADPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("STEP");
  const [selectedModel, setSelectedModel] = useState("claude-sonnet");
  const [inputMode, setInputMode] = useState<"text" | "image" | "sketch">("text");
  const [temperature, setTemperature] = useState(0.7);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [generations, setGenerations] = useState<Generation[]>([
    {
      id: "g1",
      prompt: "Spur gear with 20 teeth, module 2",
      status: "complete",
      format: "STEP",
      time: "4.2s",
      vertices: 2840,
      faces: 1420,
      model: "claude-sonnet",
    },
    {
      id: "g2",
      prompt: "L-bracket with M8 holes, 3mm aluminum",
      status: "complete",
      format: "STL",
      time: "2.8s",
      vertices: 156,
      faces: 82,
      model: "claude-sonnet",
    },
  ]);
  const [activeGen, setActiveGen] = useState<string | null>("g1");

  const generate = useCallback(() => {
    if (!prompt.trim()) return;
    const parsedDims = parseDimensions(prompt);
    const newGen: Generation = {
      id: `g${Date.now()}`,
      prompt,
      status: "generating",
      format: selectedFormat,
      model: selectedModel,
      dims: parsedDims,
    };
    setGenerations((prev) => [newGen, ...prev]);
    setActiveGen(newGen.id);
    setPrompt("");
    setTimeout(() => {
      setGenerations((prev) =>
        prev.map((g) =>
          g.id === newGen.id
            ? {
                ...g,
                status: "complete",
                time: `${(Math.random() * 5 + 1).toFixed(1)}s`,
                vertices: Math.floor(Math.random() * 5000 + 500),
                faces: Math.floor(Math.random() * 2500 + 200),
              }
            : g
        )
      );
    }, 3000);
  }, [prompt, selectedFormat, selectedModel]);

  const activeGeneration = generations.find((g) => g.id === activeGen);
  const isGenerating = activeGeneration?.status === "generating";

  const getPreviewShape = (prompt: string): string => {
    const lower = prompt.toLowerCase();
    if (lower.includes("bracket") || lower.includes("mount")) return "bracket";
    if (lower.includes("gear") || lower.includes("teeth")) return "gear";
    if (lower.includes("box") || lower.includes("enclosure")) return "box";
    return "default";
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#161b22] border-b border-[#21262d] text-sm flex-shrink-0">
        <span className="font-bold text-[#00D4FF]">Text to CAD</span>
        <div className="flex border border-[#21262d] rounded-lg overflow-hidden ml-3">
          {(["text", "image", "sketch"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setInputMode(m)}
              className={`px-3 py-1 text-xs transition-colors ${
                inputMode === m
                  ? "bg-[#00D4FF]/20 text-[#00D4FF]"
                  : "text-slate-400 hover:text-white hover:bg-[#21262d]"
              }`}
            >
              {m === "text" ? "Text Prompt" : m === "image" ? "Image to CAD" : "Sketch to CAD"}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-slate-500">Model:</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-[#0d1117] border border-[#21262d] rounded-lg px-2 py-1 text-xs text-slate-300"
          >
            {aiModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} {m.badge ? `(${m.badge})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT - Input Panel */}
        <div className="w-96 bg-[#161b22] border-r border-[#21262d] flex flex-col flex-shrink-0">
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="text-xs font-bold text-slate-300 mb-2">Describe your 3D model</div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  generate();
                }
              }}
              placeholder="e.g., Create a bracket with 2 mounting holes, 50mm wide, 30mm tall, 3mm thick"
              className="w-full h-32 bg-[#0d1117] rounded-lg px-3 py-2.5 text-sm outline-none border border-[#21262d] focus:border-[#00D4FF] resize-none transition-colors placeholder-slate-600"
            />

            <div className="flex gap-2 mt-3">
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="bg-[#0d1117] border border-[#21262d] rounded-lg px-2 py-1.5 text-xs text-slate-300"
              >
                {outputFormats.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${
                  showAdvanced
                    ? "border-[#00D4FF]/30 text-[#00D4FF] bg-[#00D4FF]/10"
                    : "border-[#21262d] text-slate-400 hover:text-white bg-[#0d1117]"
                }`}
              >
                Advanced
              </button>
              <button
                onClick={generate}
                disabled={!prompt.trim() || isGenerating}
                className="flex-1 bg-[#00D4FF] hover:bg-[#00b8d9] disabled:opacity-40 disabled:cursor-not-allowed text-black py-1.5 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-[#00D4FF]/20"
              >
                {isGenerating ? "Generating..." : "Generate CAD"}
              </button>
            </div>

            {showAdvanced && (
              <div className="mt-3 p-3 bg-[#0d1117] rounded-lg border border-[#21262d] text-xs space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Temperature</span>
                    <span className="text-[#00D4FF] font-mono">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-1 bg-[#21262d] rounded-lg appearance-none cursor-pointer accent-[#00D4FF]"
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tolerance</span>
                  <span>0.01mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mesh Quality</span>
                  <span>High</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Parametric</span>
                  <span className="text-green-400">Yes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Units</span>
                  <span>mm</span>
                </div>
              </div>
            )}

            {/* Template Prompts */}
            <div className="mt-4">
              <div className="text-xs font-bold text-slate-300 mb-2">Prompt Templates</div>
              <div className="grid grid-cols-2 gap-1.5">
                {promptTemplates
                  .filter((t) => t.prompt)
                  .map((t) => (
                    <button
                      key={t.label}
                      onClick={() => setPrompt(t.prompt)}
                      className="text-left bg-[#0d1117] hover:bg-[#21262d] border border-[#21262d] rounded-lg px-2.5 py-2 transition-colors group"
                    >
                      <div className="text-[10px] font-semibold text-slate-300 group-hover:text-[#00D4FF] transition-colors">
                        {t.label}
                      </div>
                      <div className="text-[9px] text-slate-600 mt-0.5">{t.category}</div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER - 3D Preview */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative">
            {/* Grid bg */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />

            {isGenerating ? (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <div className="absolute inset-0 border-2 border-[#00D4FF]/20 rounded-full animate-ping" />
                    <div className="absolute inset-2 border-2 border-[#00D4FF]/40 rounded-full animate-spin" />
                    <div className="absolute inset-4 border-2 border-t-[#00D4FF] border-transparent rounded-full animate-spin" style={{ animationDuration: "0.8s" }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[#00D4FF] text-sm font-bold">AI</span>
                    </div>
                  </div>
                  <div className="text-[#00D4FF] text-sm font-semibold">Generating 3D Model...</div>
                  <div className="text-slate-500 text-xs mt-1">
                    Using {aiModels.find((m) => m.id === selectedModel)?.label}
                  </div>
                  {/* Shimmer bars */}
                  <div className="mt-4 space-y-2 w-48 mx-auto">
                    <div className="h-2 rounded bg-gradient-to-r from-[#21262d] via-[#00D4FF]/20 to-[#21262d] animate-pulse" />
                    <div className="h-2 rounded bg-gradient-to-r from-[#21262d] via-[#00D4FF]/20 to-[#21262d] animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <div className="h-2 rounded bg-gradient-to-r from-[#21262d] via-[#00D4FF]/20 to-[#21262d] animate-pulse w-3/4 mx-auto" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </div>
            ) : activeGeneration && activeGeneration.status === "complete" ? (
              <div className="absolute inset-0 z-10">
                <Suspense
                  fallback={
                    <div className="h-full flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin" />
                    </div>
                  }
                >
                  <PreviewCanvas shape={getPreviewShape(activeGeneration.prompt)} dims={activeGeneration.dims} />
                </Suspense>
                {/* Overlay info */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="bg-[#161b22]/90 backdrop-blur rounded-lg px-3 py-2 border border-[#21262d]">
                    <div className="text-xs font-semibold text-[#00D4FF] truncate max-w-[300px]">
                      {activeGeneration.prompt}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {activeGeneration.vertices} vertices | {activeGeneration.faces} faces |{" "}
                      {activeGeneration.time}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="bg-[#00D4FF] hover:bg-[#00b8d9] text-black px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                      Send to Designer
                    </button>
                    <button className="bg-[#21262d] hover:bg-[#30363d] text-white px-3 py-1.5 rounded-lg text-xs transition-colors">
                      Export {activeGeneration.format}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 flex items-center justify-center">
                    <span className="text-[#00D4FF] text-2xl font-bold">3D</span>
                  </div>
                  <div className="text-slate-300 text-sm font-semibold">Describe a part to generate</div>
                  <div className="text-slate-600 text-xs mt-1">
                    Supports text, image upload, and sketch input
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Generated Parameters Panel (bottom) */}
          {activeGeneration && activeGeneration.status === "complete" && (
            <div className="h-28 bg-[#161b22] border-t border-[#21262d] flex-shrink-0 overflow-x-auto">
              <div className="px-4 py-2">
                <div className="text-[10px] font-bold text-slate-400 mb-2">
                  Generated Parameters
                  {activeGeneration.dims && (
                    <span className="ml-2 text-[#00D4FF] font-normal">
                      (parsed from prompt · {activeGeneration.dims.unit})
                    </span>
                  )}
                </div>
                <div className="flex gap-4">
                  {activeGeneration.dims
                    ? [
                        { label: "Width", value: (activeGeneration.dims.width * 100).toFixed(1), unit: activeGeneration.dims.unit },
                        { label: "Height", value: (activeGeneration.dims.height * 100).toFixed(1), unit: activeGeneration.dims.unit },
                        { label: "Depth", value: (activeGeneration.dims.depth * 100).toFixed(1), unit: activeGeneration.dims.unit },
                      ].map((p) => (
                        <div key={p.label} className="min-w-[80px]">
                          <div className="text-[9px] text-slate-500">{p.label}</div>
                          <div className="flex items-baseline gap-0.5 mt-0.5">
                            <input
                              type="number"
                              defaultValue={p.value}
                              className="w-14 bg-[#0d1117] border border-[#21262d] rounded px-1.5 py-0.5 text-xs text-white outline-none focus:border-[#00D4FF]"
                            />
                            <span className="text-[9px] text-slate-600">{p.unit}</span>
                          </div>
                        </div>
                      ))
                    : [
                        { label: "Width", value: "50.0", unit: "mm" },
                        { label: "Height", value: "30.0", unit: "mm" },
                        { label: "Thickness", value: "3.0", unit: "mm" },
                        { label: "Holes", value: "2", unit: "" },
                        { label: "Hole Dia", value: "8.5", unit: "mm" },
                        { label: "Fillet Rad", value: "2.0", unit: "mm" },
                      ].map((p) => (
                        <div key={p.label} className="min-w-[80px]">
                          <div className="text-[9px] text-slate-500">{p.label}</div>
                          <div className="flex items-baseline gap-0.5 mt-0.5">
                            <input
                              type="number"
                              defaultValue={p.value}
                              className="w-14 bg-[#0d1117] border border-[#21262d] rounded px-1.5 py-0.5 text-xs text-white outline-none focus:border-[#00D4FF]"
                            />
                            {p.unit && <span className="text-[9px] text-slate-600">{p.unit}</span>}
                          </div>
                        </div>
                      ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT - History Panel */}
        <div className="w-72 bg-[#161b22] border-l border-[#21262d] flex flex-col flex-shrink-0">
          <div className="px-3 py-2.5 border-b border-[#21262d] flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">History</span>
            <span className="text-[10px] text-slate-500">{generations.length} items</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {generations.map((g) => (
              <div
                key={g.id}
                onClick={() => setActiveGen(g.id)}
                className={`p-2.5 rounded-lg cursor-pointer transition-all ${
                  activeGen === g.id
                    ? "bg-[#00D4FF]/10 border border-[#00D4FF]/30"
                    : "border border-[#21262d] hover:border-[#30363d]"
                }`}
              >
                <div className="text-xs truncate">{g.prompt}</div>
                <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                  <span
                    className={`flex items-center gap-1 ${
                      g.status === "complete"
                        ? "text-green-400"
                        : g.status === "generating"
                        ? "text-[#00D4FF]"
                        : "text-red-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        g.status === "complete"
                          ? "bg-green-400"
                          : g.status === "generating"
                          ? "bg-[#00D4FF] animate-pulse"
                          : "bg-red-400"
                      }`}
                    />
                    {g.status}
                  </span>
                  <span className="text-slate-600">{g.format}</span>
                  {g.time && <span className="text-slate-600">{g.time}</span>}
                </div>
                {g.status === "complete" && (
                  <div className="flex gap-1 mt-2">
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] bg-[#21262d] hover:bg-[#30363d] px-2 py-0.5 rounded transition-colors"
                    >
                      Download
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] bg-[#21262d] hover:bg-[#30363d] px-2 py-0.5 rounded transition-colors"
                    >
                      Designer
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] bg-[#21262d] hover:bg-[#30363d] px-2 py-0.5 rounded transition-colors"
                    >
                      Simulate
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-4 px-4 py-1 bg-[#161b22] border-t border-[#21262d] text-[10px] text-slate-500 flex-shrink-0">
        <span>
          Mode: <span className="text-white capitalize">{inputMode}</span>
        </span>
        <span>
          Model: <span className="text-[#00D4FF]">{aiModels.find((m) => m.id === selectedModel)?.label}</span>
        </span>
        <span>
          Format: <span className="text-white">{selectedFormat}</span>
        </span>
        <span>
          Generated: <span className="text-white">{generations.filter((g) => g.status === "complete").length}</span>
        </span>
        <span className="ml-auto">ShilpaSutra AI Engine v2.0 | {outputFormats.length} export formats</span>
      </div>
    </div>
  );
}
