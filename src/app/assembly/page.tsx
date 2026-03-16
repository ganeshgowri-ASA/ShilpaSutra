"use client";
import { useState } from "react";

const parts = [
  { id: "p1", name: "Base Plate", type: "part", file: "base_plate.kcl" },
  { id: "p2", name: "Bracket L", type: "part", file: "bracket_l.kcl" },
  { id: "p3", name: "Bracket R", type: "part", file: "bracket_r.kcl" },
  { id: "p4", name: "M8 Bolt x4", type: "fastener", file: "m8_bolt.kcl" },
  { id: "p5", name: "M8 Nut x4", type: "fastener", file: "m8_nut.kcl" },
  { id: "p6", name: "Motor Mount", type: "part", file: "motor_mount.kcl" },
];

const constraints = [
  { id: "c1", type: "Fixed", parts: "Base Plate", icon: "F" },
  { id: "c2", type: "Coincident", parts: "Bracket L - Base Plate", icon: "C" },
  { id: "c3", type: "Coincident", parts: "Bracket R - Base Plate", icon: "C" },
  { id: "c4", type: "Concentric", parts: "Bolt - Bracket Hole", icon: "O" },
  { id: "c5", type: "Distance", parts: "Motor Mount - Base (50mm)", icon: "D" },
];

const constraintTypes = ["Fixed", "Coincident", "Concentric", "Parallel", "Perpendicular", "Distance", "Angle", "Tangent", "Gear", "Rack & Pinion"];

export default function AssemblyPage() {
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [activeConstraint, setActiveConstraint] = useState("Coincident");
  const [bomView, setBomView] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [motionStudy, setMotionStudy] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-[#1a1a2e] text-white overflow-hidden">
      {/* TOP BAR */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#16213e] border-b border-[#0f3460] text-sm flex-shrink-0">
        <span className="font-bold text-[#e94560]">SS</span>
        <span className="font-bold">Assembly Workspace</span>
        <div className="flex gap-1 ml-4">
          {constraintTypes.map(c => (
            <button key={c} onClick={() => setActiveConstraint(c)} className={`px-2 py-1 rounded text-xs ${activeConstraint===c ? "bg-[#e94560] text-white" : "bg-[#0f3460] text-slate-300 hover:bg-[#1a4a80]"}`}>{c}</button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setExploded(!exploded)} className={`px-3 py-1 rounded text-xs font-bold ${exploded ? "bg-yellow-600" : "bg-[#0f3460]"}`}>{exploded ? "Collapse" : "Explode"}</button>
          <button onClick={() => setMotionStudy(!motionStudy)} className={`px-3 py-1 rounded text-xs font-bold ${motionStudy ? "bg-purple-600" : "bg-[#0f3460]"}`}>Motion Study</button>
          <button onClick={() => setBomView(!bomView)} className={`px-3 py-1 rounded text-xs font-bold ${bomView ? "bg-blue-600" : "bg-[#0f3460]"}`}>BOM</button>
          <button className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-xs font-bold">Export Assembly</button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT - Assembly Tree */}
        <div className="w-64 bg-[#16213e] border-r border-[#0f3460] flex flex-col flex-shrink-0">
          <div className="px-3 py-2 border-b border-[#0f3460] text-xs font-bold">Assembly Tree</div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="text-[10px] text-slate-500 uppercase mb-1">Parts ({parts.length})</div>
            {parts.map(p => (
              <div key={p.id} onClick={() => setSelectedPart(p.id)} className={`flex items-center gap-2 py-1.5 px-2 rounded text-xs cursor-pointer ${selectedPart===p.id ? "bg-[#e94560]/20 border border-[#e94560]" : "hover:bg-[#0f3460]"}`}>
                <span className={p.type==="fastener" ? "text-yellow-400" : "text-blue-400"}>{p.type==="fastener" ? "F" : "P"}</span>
                <span>{p.name}</span>
              </div>
            ))}
            <div className="text-[10px] text-slate-500 uppercase mt-3 mb-1">Constraints ({constraints.length})</div>
            {constraints.map(c => (
              <div key={c.id} className="flex items-center gap-2 py-1 px-2 text-xs text-slate-300">
                <span className="w-4 h-4 bg-[#0f3460] rounded text-[10px] flex items-center justify-center">{c.icon}</span>
                <span>{c.type}: {c.parts}</span>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-[#0f3460]">
            <button className="w-full bg-[#e94560] hover:bg-[#d63750] py-1.5 rounded text-xs font-bold">+ Add Part</button>
          </div>
        </div>
        {/* CENTER - 3D Viewport */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            <div className="text-center z-10">
              <div className="relative w-64 h-48 mx-auto mb-4">
                <div className="absolute bottom-0 left-4 right-4 h-8 border-2 border-blue-400/40 rounded" />
                <div className="absolute bottom-8 left-8 w-12 h-24 border-2 border-green-400/40 rounded" />
                <div className="absolute bottom-8 right-8 w-12 h-24 border-2 border-green-400/40 rounded" />
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-12 border-2 border-purple-400/40 rounded" />
                {exploded && <div className="absolute inset-0 border-2 border-dashed border-yellow-400/30 rounded-xl" />}
              </div>
              <div className="text-slate-400 text-sm font-medium">Assembly Viewport {exploded ? "(Exploded View)" : ""}</div>
              <div className="text-slate-600 text-xs mt-1">{parts.length} parts | {constraints.length} constraints | Fully constrained</div>
            </div>
          </div>
          {motionStudy && (
            <div className="h-32 bg-[#0d1117] border-t border-[#0f3460] p-3">
              <div className="text-xs font-bold text-purple-400 mb-2">Motion Study Timeline</div>
              <div className="flex items-center gap-2">
                <button className="text-xs bg-purple-600 px-2 py-1 rounded">Play</button>
                <div className="flex-1 h-2 bg-[#16213e] rounded-full"><div className="w-1/3 h-full bg-purple-500 rounded-full" /></div>
                <span className="text-[10px] text-slate-500">0:00 / 2:00</span>
              </div>
              <div className="flex gap-4 mt-2 text-[10px] text-slate-400">
                <span>Rotation: Motor Mount (360 deg/s)</span>
                <span>Linear: Bracket L (0-50mm)</span>
              </div>
            </div>
          )}
        </div>
        {/* RIGHT - BOM / Properties */}
        {bomView && (
          <div className="w-72 bg-[#16213e] border-l border-[#0f3460] flex flex-col flex-shrink-0">
            <div className="px-3 py-2 border-b border-[#0f3460] text-xs font-bold">Bill of Materials (BOM)</div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-[#0f3460] text-slate-400"><th className="text-left p-2">#</th><th className="text-left p-2">Part</th><th className="text-left p-2">Qty</th><th className="text-left p-2">Material</th></tr></thead>
                <tbody>
                  <tr className="border-b border-[#0f3460]/50"><td className="p-2">1</td><td className="p-2">Base Plate</td><td className="p-2">1</td><td className="p-2">Al 6061</td></tr>
                  <tr className="border-b border-[#0f3460]/50"><td className="p-2">2</td><td className="p-2">Bracket L</td><td className="p-2">1</td><td className="p-2">Steel</td></tr>
                  <tr className="border-b border-[#0f3460]/50"><td className="p-2">3</td><td className="p-2">Bracket R</td><td className="p-2">1</td><td className="p-2">Steel</td></tr>
                  <tr className="border-b border-[#0f3460]/50"><td className="p-2">4</td><td className="p-2">M8 Bolt</td><td className="p-2">4</td><td className="p-2">SS 304</td></tr>
                  <tr className="border-b border-[#0f3460]/50"><td className="p-2">5</td><td className="p-2">M8 Nut</td><td className="p-2">4</td><td className="p-2">SS 304</td></tr>
                  <tr className="border-b border-[#0f3460]/50"><td className="p-2">6</td><td className="p-2">Motor Mount</td><td className="p-2">1</td><td className="p-2">Al 6061</td></tr>
                </tbody>
              </table>
              <div className="p-3 border-t border-[#0f3460] text-xs">
                <div className="text-slate-400">Total Parts: <span className="text-white">12</span></div>
                <div className="text-slate-400">Total Mass: <span className="text-white">2.34 kg</span></div>
                <div className="text-slate-400">Unique: <span className="text-white">6</span></div>
              </div>
            </div>
            <div className="p-2 border-t border-[#0f3460] flex gap-1">
              <button className="flex-1 bg-green-600 hover:bg-green-500 py-1 rounded text-xs">Export CSV</button>
              <button className="flex-1 bg-blue-600 hover:bg-blue-500 py-1 rounded text-xs">Export PDF</button>
            </div>
          </div>
        )}
      </div>
      {/* STATUS BAR */}
      <div className="flex items-center gap-4 px-4 py-1 bg-[#0d1117] border-t border-[#0f3460] text-[10px] text-slate-500 flex-shrink-0">
        <span>Parts: {parts.length}</span>
        <span>Constraints: {constraints.length}</span>
        <span>Status: <span className="text-green-400">Fully Constrained</span></span>
        <span>Active: <span className="text-white">{activeConstraint}</span></span>
        <span className="ml-auto">Assembly Engine v1.0</span>
      </div>
    </div>
  );
}
