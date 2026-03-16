"use client";
import { useState } from "react";

const tools = [
  { name: "Select" }, { name: "Line" }, { name: "Arc" },
  { name: "Circle" }, { name: "Rectangle" }, { name: "Extrude" },
  { name: "Revolve" }, { name: "Fillet" }, { name: "Boolean" },
];

export default function DesignerPage() {
  const [activeTool, setActiveTool] = useState("Select");
  const [chatOpen, setChatOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Welcome to ShilpaSutra AI Designer! Describe what you want to create." },
  ]);
  const [chatInput, setChatInput] = useState("");

  const handleSend = () => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev,
      { role: "user", content: chatInput },
      { role: "assistant", content: `Generating 3D model for: "${chatInput}". Processing...` },
    ]);
    setChatInput("");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-surface-light border-b border-gray-700 px-4 py-2">
        <div className="flex items-center gap-1">
          {["Home","Design","Analysis","AI","Export"].map((t)=>(
            <button key={t} className="px-3 py-1.5 text-xs font-medium rounded hover:bg-surface-lighter transition text-gray-300">{t}</button>
          ))}
        </div>
        <div className="flex items-center gap-1 mt-2">
          {tools.map((tool)=>(
            <button key={tool.name} onClick={()=>setActiveTool(tool.name)}
              className={`px-3 py-1.5 text-xs rounded transition ${activeTool===tool.name?"bg-brand-600 text-white":"bg-surface-lighter text-gray-300 hover:bg-gray-600"}`}>
              {tool.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-52 bg-surface-light border-r border-gray-700 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase border-b border-gray-700">Feature Tree</div>
          <div className="p-2 space-y-1">
            {["Origin","Front Plane","Top Plane","Side Plane","Sketch 1","Extrude 1","Fillet 1"].map((item,i)=>(
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-surface-lighter cursor-pointer">
                <span className="text-gray-500 text-xs">{i<4?"▸":"▾"}</span>
                <span className={i<4?"text-gray-400":"text-white"}>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-4 border-2 border-dashed border-gray-600 rounded-xl flex items-center justify-center">
              <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            </div>
            <p className="text-gray-500 text-sm">3D Viewport - Three.js + R3F Engine</p>
            <p className="text-gray-600 text-xs mt-1">Use AI chat or sketch tools to create geometry</p>
          </div>
          <div className="absolute bottom-4 left-4 flex gap-2">
            {["Front","Top","Iso"].map(v=>(<button key={v} className="px-2 py-1 bg-surface-light/80 rounded text-xs text-gray-300 border border-gray-600">{v}</button>))}
          </div>
          <div className="absolute top-4 right-4 text-xs text-gray-500">Tool: {activeTool}</div>
        </div>
        {chatOpen&&(
          <div className="w-80 bg-surface-light border-l border-gray-700 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center text-xs font-bold">AI</div>
                <span className="text-sm font-medium">ShilpaSutra AI</span>
              </div>
              <button onClick={()=>setChatOpen(false)} className="text-gray-400 hover:text-white text-xs">Close</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg,i)=>(
                <div key={i} className={`text-sm ${msg.role==="user"?"text-right":""}`}>
                  <div className={`inline-block px-3 py-2 rounded-lg max-w-[90%] ${msg.role==="user"?"bg-brand-600":"bg-surface-lighter"}`}>{msg.content}</div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-700 flex gap-2">
              <input value={chatInput} onChange={(e)=>setChatInput(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&handleSend()}
                placeholder="Describe a 3D model..." className="flex-1 bg-surface px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-brand-500 outline-none"/>
              <button onClick={handleSend} className="px-3 py-2 bg-brand-600 rounded-lg text-sm">Send</button>
            </div>
          </div>
        )}
      </div>
      <div className="bg-surface-light border-t border-gray-700 px-4 py-1.5 flex items-center justify-between text-xs text-gray-400">
        <div className="flex gap-4"><span>Units: mm</span><span>Grid: On</span><span>Snap: On</span></div>
        <div className="flex gap-4"><span>Vertices: 0</span><span>Faces: 0</span><span>Bodies: 0</span></div>
      </div>
    </div>
  );
}
