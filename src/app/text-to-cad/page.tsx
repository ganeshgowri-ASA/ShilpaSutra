"use client";
import { useState } from "react";

const examplePrompts = [
  "Create a spur gear with 20 teeth, module 2, 10mm face width",
  "Design an L-bracket with two M8 mounting holes, 3mm thick aluminum",
  "Generate a pipe flange DN50 PN16 with 4 bolt holes",
  "Create a bearing housing for 6205 bearing with snap ring groove",
  "Design a heat sink with 12 fins, 50x50mm base, 25mm height",
  "Create an M8x30 hex head bolt with washer face",
];

const outputFormats = ["STEP", "STL", "OBJ", "GLTF", "IGES", "DXF", "FreeCAD (.FCStd)", "SolidWorks (.SLDPRT)", "AutoCAD (.DWG)", "Parasolid (.X_T)"];

type Generation = {
  id: string;
  prompt: string;
  status: "generating" | "complete" | "error";
  format: string;
  time?: string;
  vertices?: number;
  faces?: number;
};

export default function TextToCADPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("STEP");
  const [inputMode, setInputMode] = useState<"text"|"image"|"sketch">("text");
  const [generations, setGenerations] = useState<Generation[]>([
    { id: "g1", prompt: "Spur gear with 20 teeth, module 2", status: "complete", format: "STEP", time: "4.2s", vertices: 2840, faces: 1420 },
    { id: "g2", prompt: "L-bracket with M8 holes, 3mm aluminum", status: "complete", format: "STL", time: "2.8s", vertices: 156, faces: 82 },
  ]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const generate = () => {
    if (!prompt.trim()) return;
    const newGen: Generation = {
      id: `g${Date.now()}`,
      prompt: prompt,
      status: "generating",
      format: selectedFormat,
    };
    setGenerations(prev => [newGen, ...prev]);
    setPrompt("");
    setTimeout(() => {
      setGenerations(prev => prev.map(g => g.id === newGen.id ? { ...g, status: "complete", time: `${(Math.random()*5+1).toFixed(1)}s`, vertices: Math.floor(Math.random()*5000+500), faces: Math.floor(Math.random()*2500+200) } : g));
    }, 3000);
  };

  return (
    <div className="flex flex-col h-screen bg-[#1a1a2e] text-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 bg-[#16213e] border-b border-[#0f3460] text-sm flex-shrink-0">
        <span className="font-bold text-[#e94560]">SS</span>
        <span className="font-bold">Text / Multimodal to CAD</span>
        <div className="flex border border-[#0f3460] rounded overflow-hidden ml-4">
          {(["text","image","sketch"] as const).map(m => (
            <button key={m} onClick={() => setInputMode(m)} className={`px-3 py-1 capitalize text-xs ${inputMode===m ? "bg-[#e94560]" : "hover:bg-[#1a4a80]"}`}>
              {m==="text" ? "Text Prompt" : m==="image" ? "Image to CAD" : "Sketch to CAD"}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-400">Powered by ShilpaSutra AI Engine</span>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT - Input */}
        <div className="w-96 bg-[#16213e] border-r border-[#0f3460] flex flex-col flex-shrink-0">
          <div className="p-4">
            <div className="text-xs font-bold mb-2">Describe your 3D model</div>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key==="Enter" && !e.shiftKey && (e.preventDefault(), generate())} placeholder="e.g., Create a spur gear with 20 teeth..." className="w-full h-32 bg-[#0d1117] rounded-lg px-3 py-2 text-sm outline-none border border-[#0f3460] focus:border-[#e94560] resize-none" />
            <div className="flex gap-2 mt-3">
              <select value={selectedFormat} onChange={e => setSelectedFormat(e.target.value)} className="bg-[#0d1117] border border-[#0f3460] rounded px-2 py-1.5 text-xs">
                {outputFormats.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <button onClick={() => setShowAdvanced(!showAdvanced)} className="bg-[#0f3460] hover:bg-[#1a4a80] px-3 py-1.5 rounded text-xs">Advanced</button>
              <button onClick={generate} className="flex-1 bg-[#e94560] hover:bg-[#d63750] py-1.5 rounded text-xs font-bold">Generate CAD</button>
            </div>
            {showAdvanced && (
              <div className="mt-3 p-3 bg-[#0d1117] rounded-lg border border-[#0f3460] text-xs space-y-2">
                <div className="flex justify-between"><span className="text-slate-400">Tolerance</span><span>0.01mm</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Mesh Quality</span><span>High</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Parametric</span><span className="text-green-400">Yes</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Units</span><span>mm</span></div>
              </div>
            )}
          </div>
          <div className="px-4 py-2 border-t border-[#0f3460]">
            <div className="text-xs font-bold mb-2">Example Prompts</div>
            <div className="space-y-1">
              {examplePrompts.map((p, i) => (
                <button key={i} onClick={() => setPrompt(p)} className="w-full text-left bg-[#0f3460] hover:bg-[#1a4a80] rounded px-3 py-1.5 text-xs text-slate-300">{p}</button>
              ))}
            </div>
          </div>
        </div>
        {/* CENTER - Preview */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            {generations.length > 0 && generations[0].status === "complete" ? (
              <div className="text-center z-10">
                <div className="relative w-48 h-48 mx-auto mb-4">
                  <div className="absolute inset-0 border-2 border-[#e94560]/30 rounded-xl flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-32 h-32 text-[#e94560]">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" />
                      {Array.from({length: 20}).map((_, i) => {
                        const angle = (i * 18) * Math.PI / 180;
                        const x1 = 50 + 35 * Math.cos(angle);
                        const y1 = 50 + 35 * Math.sin(angle);
                        const x2 = 50 + 45 * Math.cos(angle);
                        const y2 = 50 + 45 * Math.sin(angle);
                        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1" />;
                      })}
                      <circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>
                <div className="text-[#e94560] text-sm font-bold">Generated: {generations[0].prompt}</div>
                <div className="text-slate-500 text-xs mt-1">{generations[0].vertices} vertices | {generations[0].faces} faces | {generations[0].time}</div>
                <div className="flex gap-2 mt-3 justify-center">
                  <button className="bg-green-600 hover:bg-green-500 px-4 py-1.5 rounded text-xs font-bold">Download {generations[0].format}</button>
                  <button className="bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded text-xs">Open in Designer</button>
                  <button className="bg-purple-600 hover:bg-purple-500 px-4 py-1.5 rounded text-xs">Run Simulation</button>
                </div>
              </div>
            ) : (
              <div className="text-center z-10">
                <div className="text-6xl mb-4">CAD</div>
                <div className="text-slate-400 text-sm">Describe a part and watch it generate</div>
                <div className="text-slate-600 text-xs mt-1">Supports: Text, Image upload, Sketch input</div>
              </div>
            )}
          </div>
        </div>
        {/* RIGHT - History */}
        <div className="w-72 bg-[#16213e] border-l border-[#0f3460] flex flex-col flex-shrink-0">
          <div className="px-3 py-2 border-b border-[#0f3460] text-xs font-bold">Generation History</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {generations.map(g => (
              <div key={g.id} className={`p-2 rounded-lg border ${g.status==="complete" ? "border-green-600/30 bg-green-900/10" : g.status==="generating" ? "border-yellow-600/30 bg-yellow-900/10" : "border-red-600/30 bg-red-900/10"}`}>
                <div className="text-xs truncate">{g.prompt}</div>
                <div className="flex items-center gap-2 mt-1 text-[10px]">
                  <span className={g.status==="complete" ? "text-green-400" : g.status==="generating" ? "text-yellow-400" : "text-red-400"}>{g.status}</span>
                  <span className="text-slate-500">{g.format}</span>
                  {g.time && <span className="text-slate-500">{g.time}</span>}
                </div>
                {g.status==="complete" && (
                  <div className="flex gap-1 mt-1">
                    <button className="text-[10px] bg-[#0f3460] px-2 py-0.5 rounded hover:bg-[#1a4a80]">Download</button>
                    <button className="text-[10px] bg-[#0f3460] px-2 py-0.5 rounded hover:bg-[#1a4a80]">Preview</button>
                    <button className="text-[10px] bg-[#0f3460] px-2 py-0.5 rounded hover:bg-[#1a4a80]">Edit</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 px-4 py-1 bg-[#0d1117] border-t border-[#0f3460] text-[10px] text-slate-500 flex-shrink-0">
        <span>Mode: <span className="text-white capitalize">{inputMode}</span></span>
        <span>Format: <span className="text-white">{selectedFormat}</span></span>
        <span>Generated: <span className="text-white">{generations.filter(g => g.status==="complete").length}</span></span>
        <span className="ml-auto">AI Engine: ShilpaSutra Zookeeper v1.0 | Supports 10 export formats</span>
      </div>
    </div>
  );
}
