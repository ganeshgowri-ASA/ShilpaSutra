"use client";
import { useState } from "react";

const sketchTools = [
  { id: "select", icon: "\u25B3", label: "Select", tip: "Click to select objects" },
  { id: "line", icon: "\u2571", label: "Line", tip: "Draw a straight line" },
  { id: "arc", icon: "\u25E0", label: "Arc", tip: "Draw a curved arc" },
  { id: "circle", icon: "\u25CB", label: "Circle", tip: "Draw a circle" },
  { id: "rect", icon: "\u25AD", label: "Rectangle", tip: "Draw a rectangle" },
  { id: "spline", icon: "\u223F", label: "Spline", tip: "Draw a freeform curve" },
];

const solidTools = [
  { id: "extrude", icon: "\u2B06", label: "Extrude", tip: "Pull a sketch into 3D" },
  { id: "revolve", icon: "\u21BB", label: "Revolve", tip: "Spin a sketch around an axis" },
  { id: "loft", icon: "\u2B0C", label: "Loft", tip: "Blend between two sketches" },
  { id: "sweep", icon: "\u21DD", label: "Sweep", tip: "Move a sketch along a path" },
  { id: "fillet", icon: "\u25E2", label: "Fillet", tip: "Round an edge" },
  { id: "chamfer", icon: "\u2B1C", label: "Chamfer", tip: "Bevel an edge" },
];

const boolTools = [
  { id: "union", icon: "\u222A", label: "Union", tip: "Merge solids together" },
  { id: "cut", icon: "\u2212", label: "Cut", tip: "Remove material" },
  { id: "intersect", icon: "\u2229", label: "Intersect", tip: "Keep shared volume" },
];

const featureTree = [
  { id: "origin", label: "Origin", type: "ref", children: [
    { id: "fp", label: "Front Plane", type: "plane" },
    { id: "tp", label: "Top Plane", type: "plane" },
    { id: "sp", label: "Side Plane", type: "plane" },
  ]},
  { id: "s1", label: "Sketch 1", type: "sketch" },
  { id: "e1", label: "Extrude 1 (50mm)", type: "extrude" },
  { id: "f1", label: "Fillet 1 (R3mm)", type: "fillet" },
  { id: "s2", label: "Sketch 2", type: "sketch" },
  { id: "c1", label: "Cut 1 (Through)", type: "cut" },
];

const sampleKCL = `// ShilpaSutra KCL - Parametric Bracket
const width = 60
const height = 40
const depth = 20
const holeR = 5
const filletR = 3

const base = startSketchOn('XY')
  |> rectangle([0,0], [width, height])
  |> close()

const body = extrude(base, depth)
  |> fillet(filletR, allEdges())
`;

type Msg = { role: string; content: string; reasoning?: string };

export default function DesignerPage() {
  const [activeTool, setActiveTool] = useState("select");
  const [leftPanel, setLeftPanel] = useState<"tree"|"code">("tree");
  const [rightPanel, setRightPanel] = useState(true);
  const [codeContent, setCodeContent] = useState(sampleKCL);
  const [chatInput, setChatInput] = useState("");
  const [mode, setMode] = useState<"click"|"code"|"ai">("click");
  const [viewAngle, setViewAngle] = useState("Iso");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["origin"]));
  const [showTip, setShowTip] = useState("");
  const [chatMsgs, setChatMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Welcome to ShilpaSutra AI Designer! I can help you create 3D models from text descriptions." },
  ]);
  const [showExport, setShowExport] = useState(false);
  const [units, setUnits] = useState("mm");
  const [gridOn, setGridOn] = useState(true);
  const [snapOn, setSnapOn] = useState(true);

  const toggleNode = (id: string) => {
    const next = new Set(expandedNodes);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedNodes(next);
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg: Msg = { role: "user", content: chatInput };
    const aiReply: Msg = {
      role: "assistant",
      content: `I understand you want to: "${chatInput}". Generating parametric KCL code and updating the 3D viewport.`,
      reasoning: "Analyzing prompt > Generating parametric KCL > Rendering B-rep"
    };
    setChatMsgs(prev => [...prev, userMsg, aiReply]);
    setChatInput("");
  };

  const typeColor: Record<string, string> = {
    ref: "text-slate-400", plane: "text-blue-400", sketch: "text-yellow-400",
    extrude: "text-green-400", fillet: "text-purple-400", cut: "text-orange-400"
  };

  const typeIcon: Record<string, string> = {
    ref: "\u25C6", plane: "\u25A1", sketch: "\u270E",
    extrude: "\u2B06", fillet: "\u25E2", cut: "\u2212"
  };

  return (
    <div className="flex flex-col h-screen bg-[#1a1a2e] text-white overflow-hidden">
      {/* TOP TOOLBAR */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#16213e] border-b border-[#0f3460] text-sm flex-shrink-0">
        <span className="font-bold text-[#e94560]">SS</span>
        <div className="flex border border-[#0f3460] rounded overflow-hidden ml-2">
          {(["click","code","ai"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} className={`px-3 py-1 capitalize text-xs font-medium transition-colors ${mode===m ? "bg-[#e94560] text-white" : "text-slate-300 hover:bg-[#1a4a80]"}`}>
              {m==="click" ? "Point & Click" : m==="code" ? "KCL Code" : "AI Assistant"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-3">
          <span className="text-slate-500 text-xs">Sketch:</span>
          {sketchTools.map(t => (
            <button key={t.id} onMouseEnter={() => setShowTip(t.tip)} onMouseLeave={() => setShowTip("")} onClick={() => setActiveTool(t.id)} className={`px-2 py-1 rounded text-sm transition-all ${activeTool===t.id ? "bg-[#e94560] text-white" : "bg-[#0f3460] hover:bg-[#1a4a80] text-slate-200"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-3">
          <span className="text-slate-500 text-xs">Solid:</span>
          {solidTools.map(t => (
            <button key={t.id} onMouseEnter={() => setShowTip(t.tip)} onMouseLeave={() => setShowTip("")} onClick={() => setActiveTool(t.id)} className={`px-2 py-1 rounded text-sm transition-all ${activeTool===t.id ? "bg-[#e94560] text-white" : "bg-[#0f3460] hover:bg-[#1a4a80] text-slate-200"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-3">
          <span className="text-slate-500 text-xs">Boolean:</span>
          {boolTools.map(t => (
            <button key={t.id} onMouseEnter={() => setShowTip(t.tip)} onMouseLeave={() => setShowTip("")} onClick={() => setActiveTool(t.id)} className={`px-2 py-1 rounded text-sm transition-all ${activeTool===t.id ? "bg-[#e94560] text-white" : "bg-[#0f3460] hover:bg-[#1a4a80] text-slate-200"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto relative">
          <button onClick={() => setShowExport(!showExport)} className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-xs font-bold">Export</button>
          {showExport && (
            <div className="absolute right-0 top-full mt-1 bg-[#16213e] border border-[#0f3460] rounded shadow-lg z-50">
              {["STEP","STL","OBJ","GLTF","DXF"].map(f => (
                <div key={f} onClick={() => setShowExport(false)} className="px-4 py-1 hover:bg-[#e94560] cursor-pointer rounded text-xs">{f}</div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Hint bar */}
      {showTip && (
        <div className="px-3 py-1 bg-[#0d1117] text-xs text-slate-400 border-b border-[#0f3460] flex-shrink-0">
          {showTip}
        </div>
      )}
      {/* MAIN WORKSPACE */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-64 bg-[#16213e] border-r border-[#0f3460] flex flex-col flex-shrink-0">
          <div className="flex border-b border-[#0f3460]">
            <button onClick={() => setLeftPanel("tree")} className={`flex-1 py-2 text-xs font-medium ${leftPanel==="tree" ? "bg-[#0f3460] text-white" : "text-slate-400 hover:text-white"}`}>Feature Tree</button>
            <button onClick={() => setLeftPanel("code")} className={`flex-1 py-2 text-xs font-medium ${leftPanel==="code" ? "bg-[#0f3460] text-white" : "text-slate-400 hover:text-white"}`}>KCL Code</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {leftPanel==="tree" ? (
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Model Feature Tree</div>
                {featureTree.map(item => (
                  <div key={item.id}>
                    <div onClick={() => item.children && toggleNode(item.id)} className={`flex items-center gap-1 py-1 px-1 hover:bg-[#0f3460] rounded cursor-pointer ${typeColor[item.type]}`}>
                      {item.children && <span className="text-[10px]">{expandedNodes.has(item.id) ? "\u25BC" : "\u25B6"}</span>}
                      <span className="text-xs">{typeIcon[item.type]}</span>
                      <span className="text-xs">{item.label}</span>
                    </div>
                    {item.children && expandedNodes.has(item.id) && (
                      <div className="ml-4">
                        {item.children.map(c => (
                          <div key={c.id} className={`flex items-center gap-1 py-0.5 px-1 text-xs ${typeColor[c.type]}`}>
                            <span>{typeIcon[c.type]}</span>
                            <span>{c.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <textarea value={codeContent} onChange={e => setCodeContent(e.target.value)} className="w-full h-full bg-[#0d1117] text-green-300 font-mono text-xs p-2 resize-none outline-none" spellCheck={false} />
            )}
          </div>
        </div>
        {/* CENTER - 3D VIEWPORT */}
        <div className="flex-1 flex flex-col bg-[#1a1a2e] relative">
          <div className="flex-1 flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: gridOn ? "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)" : "none", backgroundSize: "40px 40px" }} />
            <div className="text-center z-10">
              <div className="relative w-48 h-48 mx-auto mb-4">
                <div className="absolute inset-4 border-2 border-blue-500/30 rounded-lg transform rotate-12 skew-x-6" />
                <div className="absolute inset-8 border-2 border-purple-500/30 rounded transform -rotate-6" />
                <div className="absolute inset-0 border-2 border-dashed border-slate-600 rounded-xl flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-24 h-24 text-slate-500">
                    <rect x="20" y="30" width="60" height="40" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
                    <circle cx="35" cy="50" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="65" cy="50" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>
              <div className="text-slate-400 text-sm font-medium">3D Viewport - B-rep Engine</div>
              <div className="text-slate-600 text-xs mt-1">Three.js + R3F | Geometry Kernel Ready</div>
            </div>
            <div className="absolute bottom-4 left-4 flex gap-1">
              {["Front","Top","Right","Iso"].map(v => (
                <button key={v} onClick={() => setViewAngle(v)} className={`px-2 py-1 rounded text-xs ${viewAngle===v ? "bg-[#e94560] text-white" : "bg-[#0f3460] text-slate-300 hover:bg-[#1a4a80]"}`}>{v}</button>
              ))}
            </div>
            <div className="absolute top-4 right-4 bg-[#16213e]/80 rounded p-2 text-[10px]">
              <div className="text-slate-400">Active: <span className="text-white capitalize">{activeTool}</span></div>
              <div className="text-slate-400">View: <span className="text-white">{viewAngle}</span></div>
              <div className="text-slate-400">Mode: <span className="text-[#e94560] capitalize">{mode}</span></div>
            </div>
          </div>
        </div>
        {/* RIGHT PANEL - AI CHAT */}
        {rightPanel && (
          <div className="w-72 bg-[#16213e] border-l border-[#0f3460] flex flex-col flex-shrink-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#0f3460]">
              <span className="text-xs font-bold">ShilpaSutra AI</span>
              <button onClick={() => setRightPanel(false)} className="text-slate-500 hover:text-white text-xs">X</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMsgs.map((m, i) => (
                <div key={i} className={`text-xs ${m.role==="user" ? "text-right" : ""}`}>
                  <div className={`inline-block rounded-lg px-3 py-2 max-w-full ${m.role==="user" ? "bg-[#e94560] text-white" : "bg-[#0f3460] text-slate-200"}`}>
                    {m.content}
                    {m.reasoning && (
                      <details className="mt-1">
                        <summary className="text-[10px] text-slate-400 cursor-pointer">View reasoning</summary>
                        <div className="text-[10px] text-slate-500 mt-1">{m.reasoning}</div>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 py-1 border-t border-[#0f3460]">
              <div className="text-[10px] text-slate-500 mb-1">Quick prompts:</div>
              <div className="flex flex-wrap gap-1">
                {["Gear 20 teeth","M8 Bolt","Pipe flange","Add fillet 5mm"].map(p => (
                  <button key={p} onClick={() => setChatInput(p)} className="bg-[#0f3460] text-[10px] px-2 py-0.5 rounded hover:bg-[#1a4a80] text-slate-300">{p}</button>
                ))}
              </div>
            </div>
            <div className="p-2 border-t border-[#0f3460]">
              <div className="flex gap-1">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==="Enter" && sendChat()} placeholder="Describe a 3D model..." className="flex-1 bg-[#0d1117] rounded px-2 py-1.5 text-xs outline-none border border-[#0f3460] focus:border-[#e94560]" />
                <button onClick={sendChat} className="bg-[#e94560] hover:bg-[#d63750] px-3 py-1 rounded text-xs font-bold">Send</button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* STATUS BAR */}
      <div className="flex items-center gap-4 px-4 py-1 bg-[#0d1117] border-t border-[#0f3460] text-[10px] text-slate-500 flex-shrink-0">
        <span>Units: <button onClick={() => setUnits(units==="mm" ? "in" : "mm")} className="text-white hover:text-[#e94560]">{units}</button></span>
        <span>Grid: <button onClick={() => setGridOn(!gridOn)} className={gridOn ? "text-green-400" : "text-red-400"}>{gridOn ? "On" : "Off"}</button></span>
        <span>Snap: <button onClick={() => setSnapOn(!snapOn)} className={snapOn ? "text-green-400" : "text-red-400"}>{snapOn ? "On" : "Off"}</button></span>
        <span>Tool: <span className="text-white capitalize">{activeTool}</span></span>
        <span className="ml-auto">Vertices: 156 | Faces: 82 | Bodies: 1</span>
        <span>Engine: B-rep Kernel v1.0</span>
        {!rightPanel && <button onClick={() => setRightPanel(true)} className="text-[#e94560] hover:text-white">Open AI Chat</button>}
      </div>
    </div>
  );
}
