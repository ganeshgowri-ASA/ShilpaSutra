"use client";
import { useState, useCallback, useMemo, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  CheckCircle2, Circle, Package, ChevronDown, ChevronRight,
  Loader2, Brain, LayoutTemplate,
} from "lucide-react";
import Link from "next/link";
import { matchTemplateFromPrompt, extractCapacityKWp } from "@/lib/solar-templates";

// --- Types ---
interface ReasoningStep {
  step: number;
  action: string;
  detail: string;
  status: string;
}

interface BOMEntry {
  partName: string;
  quantity: number;
  material: string;
  dimensions: string;
  color: string;
}

interface AssemblyPart {
  type: "box" | "cylinder" | "sphere" | "cone";
  name: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  dimensions: { width: number; height: number; depth: number };
  material: string;
  color: string;
  opacity?: number;
  metalness?: number;
  roughness?: number;
}

interface Generation {
  id: string;
  prompt: string;
  status: "generating" | "complete" | "error";
  format: string;
  time?: string;
  parts?: AssemblyPart[];
  reasoning?: ReasoningStep[];
  bom?: BOMEntry[];
  isAssembly?: boolean;
  objectType?: string;
  summary?: string;
}

// --- 3D Assembly Preview ---
function PartMesh({ part }: { part: AssemblyPart }) {
  const pos = part.position;
  const rot = part.rotation || [0, 0, 0];
  const d = part.dimensions;

  const mat = (
    <meshStandardMaterial
      color={part.color}
      metalness={part.metalness ?? 0.4}
      roughness={part.roughness ?? 0.5}
      transparent={part.opacity !== undefined && part.opacity < 1}
      opacity={part.opacity ?? 1}
    />
  );

  if (part.type === "cylinder") {
    return (
      <mesh position={pos} rotation={rot}>
        <cylinderGeometry args={[d.width, d.width, d.height, 32]} />
        {mat}
      </mesh>
    );
  }
  if (part.type === "sphere") {
    return (
      <mesh position={pos} rotation={rot}>
        <sphereGeometry args={[d.width, 32, 32]} />
        {mat}
      </mesh>
    );
  }
  if (part.type === "cone") {
    return (
      <mesh position={pos} rotation={rot}>
        <coneGeometry args={[d.width, d.height, 32]} />
        {mat}
      </mesh>
    );
  }
  // box (default)
  return (
    <mesh position={pos} rotation={rot}>
      <boxGeometry args={[d.width, d.height, d.depth]} />
      {mat}
    </mesh>
  );
}

function AssemblyPreview({ parts }: { parts: AssemblyPart[] }) {
  return (
    <group>
      {parts.map((part, i) => (
        <PartMesh key={i} part={part} />
      ))}
    </group>
  );
}

// --- Example prompts ---
const EXAMPLES = [
  { label: "Solar PV module 2m x 1m x 35mm aluminum frame bifacial glass-to-glass", cat: "Assembly" },
  { label: "M8 hex bolt 40mm long with nut and washer", cat: "Fastener" },
  { label: "L-bracket 100x80x3mm steel with 4 mounting holes", cat: "Bracket" },
  { label: "Cylindrical heat sink 50mm dia 30mm tall with 12 fins", cat: "Thermal" },
  { label: "Electronics enclosure 200x150x60mm with lid, ventilation slots", cat: "Enclosure" },
  { label: "Steel plate 200x100x10mm", cat: "Plate" },
  { label: "Cylinder D50 H100mm", cat: "Solid" },
  { label: "Pipe OD60 ID40 L200mm", cat: "Pipe" },
  { label: "Spur gear 20 teeth module 2", cat: "Gear" },
  { label: "Flange DN50 PN16", cat: "Piping" },
  { label: "Box 100x50x30mm with 5mm fillet", cat: "Box" },
  { label: "Heat sink 8 fins 60x60mm base", cat: "Thermal" },
];

const FORMATS = ["STEP", "STL", "OBJ", "glTF", "IGES"];

// --- Main ---
export default function TextToCADPage() {
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState("STEP");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showBOM, setShowBOM] = useState(true);
  const [showReasoning, setShowReasoning] = useState(true);

  const generate = useCallback(async (p?: string) => {
    const text = (p ?? prompt).trim();
    if (!text) return;
    const id = `g${Date.now()}`;
    const startTime = Date.now();
    setGenerations(prev => [{ id, prompt: text, status: "generating", format }, ...prev]);
    setActiveId(id);
    if (!p) setPrompt("");

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (data.isAssembly && data.assemblyParts) {
        setGenerations(prev => prev.map(g => g.id === id ? {
          ...g,
          status: "complete",
          time: `${elapsed}s`,
          parts: data.assemblyParts,
          reasoning: data.reasoning,
          bom: data.bom,
          isAssembly: true,
          objectType: data.object?.name || "Assembly",
          summary: data.message,
        } : g));
      } else {
        // Single part - wrap in parts array for preview
        const obj = data.object;
        if (obj) {
          const singlePart: AssemblyPart = {
            type: obj.type,
            name: obj.name,
            position: [0, obj.dimensions.height / 2, 0],
            dimensions: obj.dimensions,
            material: "Steel",
            color: "#00D4FF",
            metalness: 0.35,
            roughness: 0.45,
          };
          setGenerations(prev => prev.map(g => g.id === id ? {
            ...g,
            status: "complete",
            time: `${elapsed}s`,
            parts: [singlePart],
            objectType: obj.name,
            summary: data.message,
          } : g));
        } else {
          setGenerations(prev => prev.map(g => g.id === id ? { ...g, status: "error" } : g));
        }
      }
    } catch {
      setGenerations(prev => prev.map(g => g.id === id ? { ...g, status: "error" } : g));
    }
  }, [prompt, format]);

  const active = generations.find(g => g.id === activeId);

  // Template recommendation from prompt
  const suggestedTemplate = useMemo(() => matchTemplateFromPrompt(prompt), [prompt]);
  const suggestedCapacity = useMemo(() => extractCapacityKWp(prompt), [prompt]);

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#161b22] border-b border-[#21262d] text-sm shrink-0">
        <Brain size={16} className="text-purple-400" />
        <span className="font-bold text-[#00D4FF]">Text to CAD</span>
        <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">AI Reasoning Engine</span>
        <select value={format} onChange={e => setFormat(e.target.value)}
          className="ml-auto bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-slate-300">
          {FORMATS.map(f => <option key={f}>{f}</option>)}
        </select>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT - Input + Examples + Reasoning */}
        <div className="w-80 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
          <div className="p-3 space-y-3">
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(); } }}
              placeholder="e.g. Solar PV module 2m x 1m x 35mm aluminum frame bifacial"
              className="w-full h-24 bg-[#0d1117] rounded px-3 py-2 text-sm outline-none border border-[#21262d] focus:border-[#00D4FF] resize-none placeholder-slate-600" />
            <button onClick={() => generate()}
              disabled={!prompt.trim()}
              className="w-full bg-[#00D4FF] hover:bg-[#00b8d9] disabled:opacity-40 text-black py-2 rounded text-xs font-bold transition-colors">
              Generate Assembly
            </button>

            {/* Template recommendation banner */}
            {suggestedTemplate && (
              <Link
                href={`/templates?open=${suggestedTemplate.id}${suggestedCapacity ? `&capacity=${suggestedCapacity}` : ""}`}
                className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] text-amber-300 hover:border-amber-500/70 hover:bg-amber-500/15 transition-colors"
              >
                <LayoutTemplate size={14} className="mt-0.5 shrink-0 text-amber-400" />
                <span>
                  <span className="font-semibold">Template available:</span>{" "}
                  {suggestedTemplate.name}
                  {suggestedCapacity ? ` · ${suggestedCapacity >= 1000 ? (suggestedCapacity / 1000).toFixed(1) + " MWp" : suggestedCapacity + " kWp"}` : ""}
                  {" "}— use parametric template for precise BOS sizing →
                </span>
              </Link>
            )}

            {/* Reasoning Steps */}
            {active?.reasoning && active.reasoning.length > 0 && (
              <div>
                <button onClick={() => setShowReasoning(!showReasoning)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-purple-400 uppercase tracking-wider w-full">
                  {showReasoning ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  <Brain size={10} />
                  Reasoning Steps ({active.reasoning.length})
                </button>
                {showReasoning && (
                  <div className="mt-1.5 space-y-1 bg-[#0d1117] rounded-lg border border-purple-500/20 p-2">
                    {active.reasoning.map((step) => (
                      <div key={step.step} className="flex items-start gap-1.5 text-[10px]">
                        <span className="mt-0.5 shrink-0">
                          {step.status === "done"
                            ? <CheckCircle2 size={10} className="text-emerald-400" />
                            : <Circle size={10} className="text-slate-600" />}
                        </span>
                        <span className="text-purple-400 font-medium shrink-0">{step.action}:</span>
                        <span className="text-slate-300">{step.detail}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* BOM */}
            {active?.bom && active.bom.length > 0 && (
              <div>
                <button onClick={() => setShowBOM(!showBOM)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider w-full">
                  {showBOM ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  <Package size={10} />
                  Bill of Materials ({active.bom.length})
                </button>
                {showBOM && (
                  <div className="mt-1.5 bg-[#0d1117] rounded-lg border border-emerald-500/20 overflow-hidden">
                    <table className="w-full text-[9px]">
                      <thead>
                        <tr className="border-b border-[#21262d] text-slate-500">
                          <th className="text-left px-2 py-1">Part</th>
                          <th className="text-center px-1 py-1">Qty</th>
                          <th className="text-left px-1 py-1">Material</th>
                        </tr>
                      </thead>
                      <tbody>
                        {active.bom.map((entry, i) => (
                          <tr key={i} className="border-b border-[#21262d]/50">
                            <td className="px-2 py-1 text-slate-300 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
                              {entry.partName}
                            </td>
                            <td className="text-center px-1 py-1 text-slate-400">{entry.quantity}</td>
                            <td className="px-1 py-1 text-slate-500 truncate max-w-[80px]">{entry.material}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Examples — click to generate</div>
            <div className="grid grid-cols-1 gap-1">
              {EXAMPLES.map(ex => (
                <button key={ex.label} onClick={() => { setPrompt(ex.label); generate(ex.label); }}
                  className="text-left bg-[#0d1117] hover:bg-[#21262d] border border-[#21262d] rounded px-2.5 py-1.5 transition-colors group">
                  <span className="text-[10px] text-slate-300 group-hover:text-[#00D4FF]">{ex.label}</span>
                  <span className="ml-2 text-[9px] text-slate-600">{ex.cat}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER - 3D Preview */}
        <div className="flex-1 relative bg-[#0d1117]">
          {active?.status === "generating" && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <Loader2 size={48} className="text-purple-400 animate-spin mx-auto mb-3" />
                <div className="text-purple-400 text-sm font-semibold">AI Reasoning Engine</div>
                <div className="text-slate-500 text-xs mt-1">Decomposing into sub-parts...</div>
              </div>
            </div>
          )}
          {active?.status === "complete" && active.parts && active.parts.length > 0 && (
            <Suspense fallback={null}>
              <Canvas camera={{ position: [3, 2, 3], fov: 40 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[3, 4, 2]} intensity={1} />
                <directionalLight position={[-2, 3, -1]} intensity={0.3} />
                <AssemblyPreview parts={active.parts} />
                <OrbitControls autoRotate autoRotateSpeed={1} />
                <gridHelper args={[6, 30, "#21262d", "#21262d"]} />
              </Canvas>
              <div className="absolute bottom-4 left-4 bg-[#161b22]/90 border border-[#21262d] rounded px-3 py-2 text-xs max-w-sm">
                <div className="text-[#00D4FF] font-semibold truncate">{active.objectType || active.prompt}</div>
                <div className="text-slate-500 mt-0.5">
                  {active.isAssembly ? `${active.parts.length} parts` : "1 part"} · {active.time} · {active.format}
                </div>
                {active.summary && (
                  <div className="text-slate-400 mt-1 text-[10px] leading-relaxed">{active.summary}</div>
                )}
              </div>
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button className="bg-[#00D4FF] hover:bg-[#00b8d9] text-black px-3 py-1.5 rounded text-xs font-bold">Send to Designer</button>
                <button className="bg-[#21262d] hover:bg-[#30363d] text-white px-3 py-1.5 rounded text-xs">Export {active.format}</button>
              </div>
            </Suspense>
          )}
          {active?.status === "error" && (
            <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm">
              Generation failed. Try again.
            </div>
          )}
          {!active && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">
              Describe a part or assembly to generate
            </div>
          )}
        </div>

        {/* RIGHT - Assembly Tree + History */}
        <div className="w-64 bg-[#161b22] border-l border-[#21262d] flex flex-col shrink-0">
          {/* Assembly Tree */}
          {active?.isAssembly && active.parts && (
            <div className="border-b border-[#21262d]">
              <div className="px-3 py-2 text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                Assembly Tree ({active.parts.length})
              </div>
              <div className="max-h-60 overflow-y-auto px-2 pb-2 space-y-0.5">
                {active.parts.map((part, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] hover:bg-[#21262d] transition-colors">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: part.color }} />
                    <span className="text-slate-300 truncate">{part.name}</span>
                    <span className="text-slate-600 ml-auto shrink-0">{part.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History */}
          <div className="px-3 py-2 border-b border-[#21262d] text-xs font-bold text-slate-300">History ({generations.length})</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {generations.map(g => (
              <div key={g.id} onClick={() => setActiveId(g.id)}
                className={`p-2 rounded cursor-pointer border text-xs transition-all ${activeId === g.id ? "bg-[#00D4FF]/10 border-[#00D4FF]/30" : "border-[#21262d] hover:border-[#30363d]"}`}>
                <div className="truncate text-slate-300">{g.prompt}</div>
                <div className="flex items-center gap-2 mt-1 text-[10px]">
                  <span className={g.status === "complete" ? "text-green-400" : g.status === "error" ? "text-red-400" : "text-[#00D4FF] animate-pulse"}>{g.status}</span>
                  {g.isAssembly && <span className="text-purple-400">{g.parts?.length} parts</span>}
                  <span className="text-slate-600">{g.format}</span>
                  {g.time && <span className="text-slate-600">{g.time}</span>}
                </div>
              </div>
            ))}
            {generations.length === 0 && <div className="text-slate-600 text-[11px] p-2">No generations yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
