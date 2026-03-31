"use client";
import { useState, useCallback, useMemo, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  CheckCircle2, Circle, Package, ChevronDown, ChevronRight,
  Loader2, Brain, LayoutTemplate, HelpCircle, SkipForward,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { matchTemplateFromPrompt, extractCapacityKWp } from "@/lib/solar-templates";

// Dynamic imports for equipment templates (avoid SSR issues with SVG)
const ThermalCyclingChamber = dynamic(() => import("@/components/drawings/templates/ThermalCyclingChamber"), { ssr: false });
const UVConditioningChamber = dynamic(() => import("@/components/drawings/templates/UVConditioningChamber"), { ssr: false });
const HumidityFreezeChamber = dynamic(() => import("@/components/drawings/templates/HumidityFreezeChamber"), { ssr: false });
const SaltMistChamber = dynamic(() => import("@/components/drawings/templates/SaltMistChamber"), { ssr: false });
const MechanicalLoadFrame = dynamic(() => import("@/components/drawings/templates/MechanicalLoadFrame"), { ssr: false });
const SolarSimulatorComp = dynamic(() => import("@/components/drawings/templates/SolarSimulator"), { ssr: false });
const IgnitabilityChamber = dynamic(() => import("@/components/drawings/templates/IgnitabilityChamber"), { ssr: false });
const ChillerUnit = dynamic(() => import("@/components/drawings/templates/ChillerUnit"), { ssr: false });

const EQUIPMENT_TEMPLATE_MAP: Record<string, React.ComponentType<{ params?: Record<string, unknown> }>> = {
  thermal_cycling_chamber: ThermalCyclingChamber as unknown as React.ComponentType<{ params?: Record<string, unknown> }>,
  iec_uv_conditioning_chamber: UVConditioningChamber as unknown as React.ComponentType<{ params?: Record<string, unknown> }>,
  humidity_freeze_chamber: HumidityFreezeChamber as unknown as React.ComponentType<{ params?: Record<string, unknown> }>,
  salt_mist_chamber: SaltMistChamber as unknown as React.ComponentType<{ params?: Record<string, unknown> }>,
  mechanical_load_test: MechanicalLoadFrame as unknown as React.ComponentType<{ params?: Record<string, unknown> }>,
  solar_simulator: SolarSimulatorComp as unknown as React.ComponentType<{ params?: Record<string, unknown> }>,
  ignitability_chamber: IgnitabilityChamber as unknown as React.ComponentType<{ params?: Record<string, unknown> }>,
  chiller_unit: ChillerUnit as unknown as React.ComponentType<{ params?: Record<string, unknown> }>,
};
import ThinkingModeSelector, { type ThinkingMode, resolveThinkingMode } from "@/components/cad/ThinkingModeSelector";
import AttachmentBar, { type Attachment, buildAttachmentContext, getImageBase64 } from "@/components/cad/AttachmentBar";
import { getClarifyingQuestions, buildEnrichedPrompt, type ClarifyingQuestion } from "@/lib/clarifying-questions";
import ParametricSliders from "@/components/cad/ParametricSliders";
import { type SimulationIntent } from "@/lib/ai-reasoning-engine";

// --- Types ---
interface ReasoningStep { step: number; action: string; detail: string; status: string; }
interface BOMEntry { partName: string; quantity: number; material: string; dimensions: string; color: string; }
interface AssemblyPart {
  type: "box"|"cylinder"|"sphere"|"cone"; name: string;
  position: [number,number,number]; rotation?: [number,number,number];
  dimensions: { width: number; height: number; depth: number };
  material: string; color: string; opacity?: number; metalness?: number; roughness?: number;
}
interface Generation {
  id: string; prompt: string; status: "generating"|"complete"|"error";
  format: string; time?: string; parts?: AssemblyPart[];
  reasoning?: ReasoningStep[]; bom?: BOMEntry[];
  isAssembly?: boolean; objectType?: string; summary?: string;
  simulationIntent?: SimulationIntent;
  simulationRunning?: boolean;
  simulationResults?: any;
}

// --- 3D Part Mesh ---
function PartMesh({ part }: { part: AssemblyPart }) {
  const pos = part.position; const rot = part.rotation||[0,0,0]; const d = part.dimensions;
  const mat = <meshStandardMaterial color={part.color} metalness={part.metalness??0.4} roughness={part.roughness??0.5} transparent={part.opacity!==undefined&&part.opacity<1} opacity={part.opacity??1}/>;
  if (part.type==="cylinder") return <mesh position={pos} rotation={rot}><cylinderGeometry args={[d.width,d.width,d.height,32]}/>{mat}</mesh>;
  if (part.type==="sphere")   return <mesh position={pos} rotation={rot}><sphereGeometry args={[d.width,32,32]}/>{mat}</mesh>;
  if (part.type==="cone")     return <mesh position={pos} rotation={rot}><coneGeometry args={[d.width,d.height,32]}/>{mat}</mesh>;
  return <mesh position={pos} rotation={rot}><boxGeometry args={[d.width,d.height,d.depth]}/>{mat}</mesh>;
}

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
];

// Equipment drawing prompt suggestions
const EQUIPMENT_PROMPTS = [
  { label: "Generate thermal cycling chamber 1500x2200x1200mm with 3 shelves", templateId: "thermal_cycling_chamber", cat: "IEC Equipment" },
  { label: "Create UV conditioning chamber for IEC 61215 MQT 10", templateId: "iec_uv_conditioning_chamber", cat: "IEC Equipment" },
  { label: "Draw solar simulator class AAA 2m x 2m test area", templateId: "solar_simulator", cat: "IEC Equipment" },
  { label: "Design salt mist chamber per IEC 61701", templateId: "salt_mist_chamber", cat: "IEC Equipment" },
  { label: "Mechanical load test frame IEC 62782 for PV modules", templateId: "mechanical_load_test", cat: "IEC Equipment" },
  { label: "Humidity freeze chamber 85/85 test IEC 61215", templateId: "humidity_freeze_chamber", cat: "IEC Equipment" },
  { label: "Ignitability test chamber with chimney per IEC 61730", templateId: "ignitability_chamber", cat: "IEC Equipment" },
  { label: "Industrial chiller unit 80kW R-410A", templateId: "chiller_unit", cat: "IEC Equipment" },
];

// Equipment keyword → template ID mapping
const EQUIPMENT_KEYWORDS: { keywords: string[]; templateId: string }[] = [
  { keywords: ["thermal", "cycling", "temperature cycling", "tcc", "mqt 11"], templateId: "thermal_cycling_chamber" },
  { keywords: ["uv", "ultraviolet", "uv conditioning", "mqt 10"], templateId: "iec_uv_conditioning_chamber" },
  { keywords: ["humidity", "freeze", "humidity-freeze", "damp heat", "mqt 12", "85/85"], templateId: "humidity_freeze_chamber" },
  { keywords: ["salt", "mist", "salt spray", "corrosion", "iec 61701"], templateId: "salt_mist_chamber" },
  { keywords: ["mechanical load", "load frame", "load test", "mqt 16", "iec 62782"], templateId: "mechanical_load_test" },
  { keywords: ["solar simulator", "sun simulator", "flash test", "aaa", "iec 60904"], templateId: "solar_simulator" },
  { keywords: ["ignitability", "fire test", "flame test", "chimney", "ul 790", "iec 61730"], templateId: "ignitability_chamber" },
  { keywords: ["chiller", "cooling unit", "refrigeration", "condenser unit"], templateId: "chiller_unit" },
];

/** Parse dimensions from text like "1500x2200x1200mm" */
function parseDimensionsFromText(text: string): { w?: number; h?: number; d?: number } | null {
  const match = text.match(/(\d+)\s*[x×]\s*(\d+)\s*[x×]\s*(\d+)\s*mm/i);
  if (match) return { w: parseInt(match[1]), h: parseInt(match[2]), d: parseInt(match[3]) };
  return null;
}

/** Parse IEC standard from text */
function parseStandardFromText(text: string): string | null {
  const match = text.match(/IEC\s*\d{5}(?:\s*MQT\s*\d+)?/i);
  return match ? match[0] : null;
}

/** Match equipment type from prompt text */
function matchEquipmentTemplate(text: string): string | null {
  const lower = text.toLowerCase();
  for (const { keywords, templateId } of EQUIPMENT_KEYWORDS) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return templateId;
    }
  }
  return null;
}

const FORMATS = ["STEP", "STL", "OBJ", "glTF", "IGES"];

// --- Main ---
export default function TextToCADPage() {
  const [prompt, setPrompt]       = useState("");
  const [format, setFormat]       = useState("STEP");
  const [mode, setMode]           = useState<ThinkingMode>("Auto");
  const [attachments, setAttach]  = useState<Attachment[]>([]);
  const [questions, setQuestions] = useState<ClarifyingQuestion[]|null>(null);
  const [answers, setAnswers]     = useState<Record<string,string>>({});
  const [generations, setGens]    = useState<Generation[]>([]);
  const [activeId, setActiveId]   = useState<string|null>(null);
  const [showBOM, setShowBOM]     = useState(true);
  const [showReasoning, setShowReasoning] = useState(true);

  const doGenerate = useCallback(async (text: string) => {
    const id = `g${Date.now()}`; const t0 = Date.now();
    const resolved = resolveThinkingMode(mode, text);
    const attCtx   = buildAttachmentContext(attachments);
    const imgB64   = getImageBase64(attachments);
    setGens(prev => [{ id, prompt: text, status: "generating", format }, ...prev]);
    setActiveId(id);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text + attCtx, thinkingMode: resolved, imageBase64: imgB64 || undefined }),
      });
      const data = await res.json();
      const elapsed = ((Date.now()-t0)/1000).toFixed(1);
      
      let newGenUpdate: Partial<Generation> = { status: "error" };
      
      if (data.isAssembly && data.assemblyParts) {
        newGenUpdate = { status:"complete", time:`${elapsed}s`, parts:data.assemblyParts, reasoning:data.reasoning, bom:data.bom, isAssembly:true, objectType:data.object?.name||"Assembly", summary:data.message, simulationIntent: data.simulationIntent };
      } else if (data.object) {
        const obj = data.object;
        const singlePart: AssemblyPart = { type:obj.type, name:obj.name, position:[0,obj.dimensions.height/2,0], dimensions:obj.dimensions, material:"Steel", color:"#00D4FF", metalness:0.35, roughness:0.45 };
        newGenUpdate = { status:"complete", time:`${elapsed}s`, parts:[singlePart], objectType:obj.name, summary:data.message, simulationIntent: data.simulationIntent };
      }
      
      setGens(prev => prev.map(g => g.id!==id ? g : { ...g, ...newGenUpdate }));

      // Automatically run simulation if intent exists
      if (newGenUpdate.simulationIntent) {
         runSimulation(id, newGenUpdate.simulationIntent, newGenUpdate.parts || []);
      }

    } catch {
      setGens(prev => prev.map(g => g.id!==id ? g : { ...g, status:"error" }));
    }
  }, [mode, attachments, format]);

  const runSimulation = async (id: string, intent: SimulationIntent, parts: AssemblyPart[]) => {
    setGens(prev => prev.map(g => g.id !== id ? g : { ...g, simulationRunning: true }));
    try {
      // Mock simulation delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisType: intent.analysisType,
          meshElements: 400,
          material: { name: parts[0]?.material || "Steel", E: "205e9", v: "0.29", rho: "7850", k: "50" },
          boundaryConditions: intent.constraints,
          solverConfig: { type: "static", maxIterations: 100, tolerance: 1e-4 },
        })
      });
      const simData = await res.json();
      setGens(prev => prev.map(g => g.id !== id ? g : { ...g, simulationRunning: false, simulationResults: simData.results }));
    } catch {
      setGens(prev => prev.map(g => g.id !== id ? g : { ...g, simulationRunning: false }));
    }
  };

  const handleParametricUpdate = (dims: Record<string, number>) => {
    if (!active) return;
    // Reconstruct prompt with new dims to regenerate
    const appendedDims = Object.entries(dims).map(([k,v]) => `${k} ${v}mm`).join(", ");
    const newPrompt = `Regenerate ${active.objectType} but with ${appendedDims}. KEEP other details same as: ${active.prompt}`;
    doGenerate(newPrompt);
  };

  const handleGenerate = useCallback((overrideText?: string) => {
    const text = (overrideText ?? prompt).trim();
    if (!text) return;
    if (!overrideText) setPrompt("");
    // Check for clarifying questions (skip if prompt is fully specified)
    if (!overrideText && !questions) {
      const cq = getClarifyingQuestions(text);
      if (cq) { setQuestions(cq.questions); return; }
    }
    const enriched = questions ? buildEnrichedPrompt(text, answers) : text;
    setQuestions(null); setAnswers({});
    doGenerate(enriched);
  }, [prompt, questions, answers, doGenerate]);

  const active = generations.find(g => g.id === activeId);
  const suggestedTemplate = useMemo(() => matchTemplateFromPrompt(prompt), [prompt]);
  const suggestedCapacity  = useMemo(() => extractCapacityKWp(prompt), [prompt]);
  const [equipmentDrawingId, setEquipmentDrawingId] = useState<string | null>(null);
  const [showEquipmentDrawing, setShowEquipmentDrawing] = useState(false);
  const [showEquipmentPrompts, setShowEquipmentPrompts] = useState(false);

  // Detect equipment template from prompt
  const detectedEquipment = useMemo(() => matchEquipmentTemplate(prompt), [prompt]);
  const detectedDimensions = useMemo(() => parseDimensionsFromText(prompt), [prompt]);
  const detectedStandard = useMemo(() => parseStandardFromText(prompt), [prompt]);

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#161b22] border-b border-[#21262d] text-sm shrink-0">
        <Brain size={16} className="text-purple-400" />
        <span className="font-bold text-[#00D4FF]">Text to CAD</span>
        <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">AI Reasoning Engine</span>
        <div className="ml-auto flex items-center gap-2">
          <ThinkingModeSelector value={mode} onChange={setMode} />
          <select value={format} onChange={e => setFormat(e.target.value)}
            className="bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-slate-300">
            {FORMATS.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT */}
        <div className="w-80 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
          <div className="p-3 space-y-3">
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
              placeholder="e.g. Solar PV array 20 modules 15° tilt ground mount"
              className="w-full h-24 bg-[#0d1117] rounded px-3 py-2 text-sm outline-none border border-[#21262d] focus:border-[#00D4FF] resize-none placeholder-slate-600" />

            {/* Attachment bar */}
            <AttachmentBar attachments={attachments} onChange={setAttach} accentClass="text-purple-400" />

            <button onClick={() => handleGenerate()} disabled={!prompt.trim()}
              className="w-full bg-[#00D4FF] hover:bg-[#00b8d9] disabled:opacity-40 text-black py-2 rounded text-xs font-bold transition-colors">
              Generate Assembly
            </button>

            {/* Clarifying Questions */}
            {questions && (
              <div className="bg-[#0d1117] border border-amber-500/30 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <HelpCircle size={12} className="text-amber-400" />
                  <span className="text-[10px] font-semibold text-amber-400">Quick questions before generating</span>
                </div>
                <div className="space-y-2">
                  {questions.map(q => (
                    <div key={q.id} className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-32 shrink-0">{q.question}</span>
                      <input type="text" value={answers[q.id]||""} onChange={e=>setAnswers(a=>({...a,[q.id]:e.target.value}))}
                        placeholder={q.placeholder}
                        className="flex-1 min-w-0 bg-[#161b22] border border-[#21262d] rounded px-2 py-1 text-[10px] text-slate-200 placeholder-slate-700 outline-none focus:border-amber-500/40"/>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2.5">
                  <button onClick={() => handleGenerate()} className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 rounded bg-[#00D4FF] hover:bg-[#00b8d9] text-black transition-colors">
                    <CheckCircle2 size={11}/> Generate
                  </button>
                  <button onClick={() => { setQuestions(null); setAnswers({}); doGenerate(prompt.trim()); }} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 px-2">
                    <SkipForward size={11}/> Skip
                  </button>
                </div>
              </div>
            )}

            {/* Template recommendation */}
            {suggestedTemplate && (
              <Link href={`/templates?open=${suggestedTemplate.id}${suggestedCapacity?`&capacity=${suggestedCapacity}`:""}`}
                className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] text-amber-300 hover:border-amber-500/70 transition-colors">
                <LayoutTemplate size={14} className="mt-0.5 shrink-0 text-amber-400" />
                <span><span className="font-semibold">Template available:</span> {suggestedTemplate.name}{suggestedCapacity?` · ${suggestedCapacity>=1000?(suggestedCapacity/1000).toFixed(1)+" MWp":suggestedCapacity+" kWp"}`:""} — use parametric template →</span>
              </Link>
            )}

            {/* Reasoning Steps */}
            {active?.reasoning && active.reasoning.length>0 && (
              <div>
                <button onClick={()=>setShowReasoning(!showReasoning)} className="flex items-center gap-1.5 text-[10px] font-bold text-purple-400 uppercase tracking-wider w-full">
                  {showReasoning?<ChevronDown size={10}/>:<ChevronRight size={10}/>}<Brain size={10}/>Reasoning ({active.reasoning.length})
                </button>
                {showReasoning&&(
                  <div className="mt-1.5 space-y-1 bg-[#0d1117] rounded-lg border border-purple-500/20 p-2">
                    {active.reasoning.map((step: any) =>(
                      <div key={step.step} className="flex items-start gap-1.5 text-[10px]">
                        <span className="mt-0.5 shrink-0">{step.status==="done"?<CheckCircle2 size={10} className="text-emerald-400"/>:<Circle size={10} className="text-slate-600"/>}</span>
                        <span className="text-purple-400 font-medium shrink-0">{step.action}:</span>
                        <span className="text-slate-300">{step.detail}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {active?.status === "complete" && active.parts && (
              <ParametricSliders 
                parts={active.parts} 
                onUpdate={handleParametricUpdate} 
                isRunning={active.simulationRunning} 
              />
            )}

            {/* BOM */}
            {active?.bom && active.bom.length>0 && (
              <div>
                <button onClick={()=>setShowBOM(!showBOM)} className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider w-full">
                  {showBOM?<ChevronDown size={10}/>:<ChevronRight size={10}/>}<Package size={10}/>Bill of Materials ({active.bom.length})
                </button>
                {showBOM&&(
                  <div className="mt-1.5 bg-[#0d1117] rounded-lg border border-emerald-500/20 overflow-hidden">
                    <table className="w-full text-[9px]"><thead><tr className="border-b border-[#21262d] text-slate-500"><th className="text-left px-2 py-1">Part</th><th className="text-center px-1 py-1">Qty</th><th className="text-left px-1 py-1">Material</th></tr></thead>
                      <tbody>{active.bom.map((entry,i)=>(
                        <tr key={i} className="border-b border-[#21262d]/50">
                          <td className="px-2 py-1 text-slate-300 flex items-center gap-1"><span className="w-2 h-2 rounded-sm shrink-0" style={{backgroundColor:entry.color}}/>{entry.partName}</td>
                          <td className="text-center px-1 py-1 text-slate-400">{entry.quantity}</td>
                          <td className="px-1 py-1 text-slate-500 truncate max-w-[80px]">{entry.material}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Equipment drawing detection */}
            {detectedEquipment && (
              <div className="bg-[#0d1117] border border-[#00D4FF]/40 rounded-lg p-2.5 text-[11px]">
                <div className="flex items-center gap-1.5 mb-1">
                  <LayoutTemplate size={12} className="text-[#00D4FF]" />
                  <span className="font-semibold text-[#00D4FF]">Equipment Drawing Detected</span>
                </div>
                <div className="text-slate-400 text-[10px] mb-2">
                  Matched: <span className="text-white">{detectedEquipment.replace(/_/g, " ")}</span>
                  {detectedDimensions && <span className="ml-1 text-slate-500">({detectedDimensions.w}×{detectedDimensions.h}×{detectedDimensions.d}mm)</span>}
                  {detectedStandard && <span className="ml-1 text-amber-400">{detectedStandard}</span>}
                </div>
                <button
                  onClick={() => { setEquipmentDrawingId(detectedEquipment); setShowEquipmentDrawing(true); }}
                  className="w-full bg-[#00D4FF] text-black text-[10px] font-bold py-1.5 rounded hover:bg-[#00b8d9] transition-colors"
                >
                  Generate 2D GA Drawing →
                </button>
              </div>
            )}

            {/* Equipment Drawing Prompts */}
            <div>
              <button onClick={() => setShowEquipmentPrompts(!showEquipmentPrompts)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-[#00D4FF] uppercase tracking-wider w-full mb-1">
                {showEquipmentPrompts ? <ChevronDown size={10}/> : <ChevronRight size={10}/>}
                <LayoutTemplate size={10}/>IEC Equipment Drawings
              </button>
              {showEquipmentPrompts && (
                <div className="grid grid-cols-1 gap-1 mb-2">
                  {EQUIPMENT_PROMPTS.map(ep => (
                    <button key={ep.templateId}
                      onClick={() => { setEquipmentDrawingId(ep.templateId); setShowEquipmentDrawing(true); setPrompt(ep.label); }}
                      className="text-left bg-[#0d1117] hover:bg-[#21262d] border border-[#00D4FF]/20 hover:border-[#00D4FF]/50 rounded px-2.5 py-1.5 transition-colors group">
                      <span className="text-[10px] text-slate-300 group-hover:text-[#00D4FF]">{ep.label}</span>
                      <span className="ml-2 text-[8px] text-[#00D4FF]/60">{ep.cat}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Examples</div>
            <div className="grid grid-cols-1 gap-1">
              {EXAMPLES.map(ex=>(
                <button key={ex.label} onClick={()=>{ setPrompt(ex.label); handleGenerate(ex.label); }} className="text-left bg-[#0d1117] hover:bg-[#21262d] border border-[#21262d] rounded px-2.5 py-1.5 transition-colors group">
                  <span className="text-[10px] text-slate-300 group-hover:text-[#00D4FF]">{ex.label}</span>
                  <span className="ml-2 text-[9px] text-slate-600">{ex.cat}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER - 3D Preview + 2D Drawing side by side */}
        <div className={`flex-1 relative bg-[#0d1117] flex ${showEquipmentDrawing && equipmentDrawingId ? "flex-row" : ""}`}>
          {/* 2D Equipment Drawing Panel */}
          {showEquipmentDrawing && equipmentDrawingId && EQUIPMENT_TEMPLATE_MAP[equipmentDrawingId] && (() => {
            const DrawingComp = EQUIPMENT_TEMPLATE_MAP[equipmentDrawingId];
            const drawingParams: Record<string, unknown> = {};
            if (detectedDimensions) {
              // Map detected dimensions to template params
              const dimKeys = ["chamberWidth", "frameWidth", "unitWidth", "chimneyWidth", "housingWidth", "testAreaW"];
              const heightKeys = ["chamberHeight", "frameHeight", "unitHeight", "chimneyHeight", "housingHeight", "testAreaH"];
              const depthKeys = ["chamberDepth", "frameDepth", "unitDepth", "chimneyDepth"];
              if (detectedDimensions.w) dimKeys.forEach(k => drawingParams[k] = detectedDimensions.w);
              if (detectedDimensions.h) heightKeys.forEach(k => drawingParams[k] = detectedDimensions.h);
              if (detectedDimensions.d) depthKeys.forEach(k => drawingParams[k] = detectedDimensions.d);
            }
            return (
              <div className="w-1/2 border-r border-[#21262d] flex flex-col">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161b22] border-b border-[#21262d] shrink-0">
                  <LayoutTemplate size={12} className="text-[#00D4FF]" />
                  <span className="text-[10px] font-bold text-[#00D4FF]">2D GA Drawing</span>
                  <span className="text-[9px] text-slate-500">{equipmentDrawingId.replace(/_/g, " ")}</span>
                  <button onClick={() => setShowEquipmentDrawing(false)}
                    className="ml-auto text-[9px] text-slate-500 hover:text-white">✕ Close</button>
                </div>
                <div className="flex-1 overflow-auto p-2 flex items-center justify-center bg-[#0a0e14]">
                  <div style={{ width: "100%", maxWidth: 700, aspectRatio: "841/594" }}>
                    <DrawingComp params={drawingParams} />
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161b22] border-t border-[#21262d] shrink-0">
                  <Link href={`/drawings?template=${equipmentDrawingId}`}
                    className="text-[9px] text-[#00D4FF] hover:text-white">Open in Drawings →</Link>
                </div>
              </div>
            );
          })()}

          {/* 3D Preview */}
          <div className={`relative ${showEquipmentDrawing && equipmentDrawingId ? "w-1/2" : "flex-1"}`}>
            {showEquipmentDrawing && equipmentDrawingId && (
              <div className="absolute top-2 left-2 z-10 bg-[#161b22]/80 border border-[#21262d] rounded px-2 py-1">
                <span className="text-[9px] text-slate-400">3D Isometric View</span>
              </div>
            )}
            {active?.status==="generating"&&(
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-center"><Loader2 size={48} className="text-purple-400 animate-spin mx-auto mb-3"/>
                  <div className="text-purple-400 text-sm font-semibold">AI Reasoning Engine</div>
                  <div className="text-slate-500 text-xs mt-1">Thinking mode: {mode} · Decomposing into sub-parts...</div>
                </div>
              </div>
            )}
            {active?.status==="complete"&&active.parts&&active.parts.length>0&&(
              <Suspense fallback={null}>
                <Canvas camera={{position:[3,2,3],fov:40}}>
                  <ambientLight intensity={0.5}/><directionalLight position={[3,4,2]} intensity={1}/><directionalLight position={[-2,3,-1]} intensity={0.3}/>
                  <group>{active.parts.map((p,i)=><PartMesh key={i} part={p}/>)}</group>
                  <OrbitControls autoRotate autoRotateSpeed={1}/>
                  <gridHelper args={[6,30,"#21262d","#21262d"]}/>
                </Canvas>
                <div className="absolute bottom-4 left-4 bg-[#161b22]/90 border border-[#21262d] rounded px-3 py-2 text-xs max-w-sm">
                  <div className="text-[#00D4FF] font-semibold truncate">{active.objectType||active.prompt}</div>
                  <div className="text-slate-500 mt-0.5">{active.isAssembly?`${active.parts.length} parts`:"1 part"} · {active.time} · {active.format}</div>
                  {active.summary&&<div className="text-slate-400 mt-1 text-[10px] leading-relaxed">{active.summary}</div>}
                </div>
                <div className="absolute top-4 right-4 flex gap-2">
                  <button className="bg-[#00D4FF] hover:bg-[#00b8d9] text-black px-3 py-1.5 rounded text-xs font-bold shadow-lg">Send to Designer</button>
                  <button className="bg-[#21262d] hover:bg-[#30363d] text-white px-3 py-1.5 rounded text-xs shadow">Export {active.format}</button>
                </div>

                {active.simulationIntent && (
                  <div className="absolute top-4 left-4 bg-[#161b22]/95 border border-[#4ecdc4]/30 rounded p-3 w-64 shadow-xl backdrop-blur">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#21262d]">
                      <div className="w-2 h-2 rounded-full bg-[#4ecdc4] animate-pulse" />
                      <span className="text-xs font-bold text-[#4ecdc4] uppercase tracking-wider">Simulation</span>
                      {active.simulationRunning && <Loader2 size={12} className="text-[#4ecdc4] animate-spin ml-auto"/>}
                    </div>
                    
                    <div className="text-[10px] space-y-1 text-slate-300">
                      <div className="flex justify-between"><span>Analysis:</span> <span className="font-mono text-white capitalize">{active.simulationIntent.analysisType}</span></div>
                      {active.simulationIntent.loads[0] && (
                        <div className="flex justify-between"><span>Load:</span> <span className="font-mono text-white">{active.simulationIntent.loads[0].magnitude}</span></div>
                      )}
                    </div>

                    {active.simulationResults && (
                      <div className="mt-3 pt-2 border-t border-[#21262d] space-y-1">
                        {active.simulationResults.vonMisesStress && (
                           <div className="flex justify-between text-[10px]"><span className="text-slate-400">Max Stress:</span> <span className="text-amber-400 font-bold">{active.simulationResults.vonMisesStress.max} {active.simulationResults.vonMisesStress.unit}</span></div>
                        )}
                        {active.simulationResults.displacement && (
                           <div className="flex justify-between text-[10px]"><span className="text-slate-400">Displacement:</span> <span className="text-blue-400 font-bold">{active.simulationResults.displacement.max} {active.simulationResults.displacement.unit}</span></div>
                        )}
                        {active.simulationResults.temperature && (
                           <div className="flex justify-between text-[10px]"><span className="text-slate-400">Max Temp:</span> <span className="text-red-400 font-bold">{active.simulationResults.temperature.max} {active.simulationResults.temperature.unit}</span></div>
                        )}
                        {active.simulationResults.safetyFactor !== undefined && (
                           <div className="flex justify-between text-[10px]"><span className="text-slate-400">Safety Factor:</span> <span className={active.simulationResults.safetyFactor > 2 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>{active.simulationResults.safetyFactor}</span></div>
                        )}
                        <Link href="/simulator" className="block w-full text-center mt-2 bg-[#4ecdc4]/10 hover:bg-[#4ecdc4]/20 border border-[#4ecdc4]/30 text-[#4ecdc4] text-[10px] py-1 rounded transition-colors">View Detailed Report →</Link>
                      </div>
                    )}
                  </div>
                )}
              </Suspense>
            )}
            {active?.status==="error"&&<div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm">Generation failed. Try again.</div>}
            {!active&&!showEquipmentDrawing&&<div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">Describe a part or assembly to generate</div>}
            {!active&&showEquipmentDrawing&&<div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">3D preview will appear here after generation</div>}
          </div>
        </div>

        {/* RIGHT - Assembly Tree + History */}
        <div className="w-64 bg-[#161b22] border-l border-[#21262d] flex flex-col shrink-0">
          {active?.isAssembly&&active.parts&&(
            <div className="border-b border-[#21262d]">
              <div className="px-3 py-2 text-[10px] font-bold text-purple-400 uppercase tracking-wider">Assembly Tree ({active.parts.length})</div>
              <div className="max-h-60 overflow-y-auto px-2 pb-2 space-y-0.5">
                {active.parts.map((part,i)=>(
                  <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] hover:bg-[#21262d]">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{backgroundColor:part.color}}/>
                    <span className="text-slate-300 truncate">{part.name}</span>
                    <span className="text-slate-600 ml-auto shrink-0">{part.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="px-3 py-2 border-b border-[#21262d] text-xs font-bold text-slate-300">History ({generations.length})</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {generations.map(g=>(
              <div key={g.id} onClick={()=>setActiveId(g.id)} className={`p-2 rounded cursor-pointer border text-xs transition-all ${activeId===g.id?"bg-[#00D4FF]/10 border-[#00D4FF]/30":"border-[#21262d] hover:border-[#30363d]"}`}>
                <div className="truncate text-slate-300">{g.prompt}</div>
                <div className="flex items-center gap-2 mt-1 text-[10px]">
                  <span className={g.status==="complete"?"text-green-400":g.status==="error"?"text-red-400":"text-[#00D4FF] animate-pulse"}>{g.status}</span>
                  {g.isAssembly&&<span className="text-purple-400">{g.parts?.length} parts</span>}
                  <span className="text-slate-600">{g.format}</span>
                  {g.time&&<span className="text-slate-600">{g.time}</span>}
                </div>
              </div>
            ))}
            {generations.length===0&&<div className="text-slate-600 text-[11px] p-2">No generations yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
