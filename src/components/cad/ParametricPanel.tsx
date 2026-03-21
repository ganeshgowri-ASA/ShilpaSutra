"use client";
import { useState } from "react";
import { useCadStore } from "@/stores/cad-store";

interface SliderProps {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void; unit?: string;
}
function Slider({ label, value, min, max, onChange, unit = "mm" }: SliderProps) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-400">{label}</span>
        <span className="text-[#00D4FF] font-mono">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="w-full h-1 accent-[#00D4FF] bg-[#21262d] rounded appearance-none cursor-pointer" />
    </div>
  );
}

export default function ParametricPanel({ onClose }: { onClose: () => void }) {
  const addObject = useCadStore(s => s.addObject);
  const updateObject = useCadStore(s => s.updateObject);

  const [tab, setTab] = useState<"box" | "cylinder" | "pipe">("box");

  // Box params
  const [boxL, setBoxL] = useState(100);
  const [boxW, setBoxW] = useState(50);
  const [boxH, setBoxH] = useState(30);

  // Cylinder params
  const [cylD, setCylD] = useState(50);
  const [cylH, setCylH] = useState(100);

  // Pipe params
  const [pipeOD, setPipeOD] = useState(60);
  const [pipeID, setPipeID] = useState(40);
  const [pipeL, setPipeL] = useState(200);

  const scale = (v: number) => v / 100;

  const addToScene = () => {
    if (tab === "box") {
      const id = addObject("box");
      updateObject(id, { dimensions: { width: scale(boxL), height: scale(boxH), depth: scale(boxW) } });
    } else if (tab === "cylinder") {
      const id = addObject("cylinder");
      updateObject(id, { dimensions: { width: scale(cylD), height: scale(cylH), depth: scale(cylD) } });
    } else {
      const id = addObject("cylinder");
      updateObject(id, { dimensions: { width: scale(pipeOD), height: scale(pipeL), depth: scale(pipeOD) } });
    }
  };

  return (
    <div className="absolute top-12 left-2 z-30 w-60 bg-[#161b22] border border-[#21262d] rounded-lg shadow-xl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d]">
        <span className="text-xs font-bold text-slate-300">Parametric Components</span>
        <button onClick={onClose} className="text-slate-500 hover:text-white text-xs">✕</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#21262d]">
        {(["box", "cylinder", "pipe"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[10px] font-semibold capitalize transition-colors ${tab === t ? "text-[#00D4FF] border-b-2 border-[#00D4FF]" : "text-slate-500 hover:text-slate-300"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-3">
        {tab === "box" && (
          <>
            <Slider label="Length" value={boxL} min={10} max={500} onChange={setBoxL} />
            <Slider label="Width"  value={boxW} min={10} max={500} onChange={setBoxW} />
            <Slider label="Height" value={boxH} min={10} max={500} onChange={setBoxH} />
            <div className="text-[9px] text-slate-600 mt-1">Preview: {boxL}×{boxW}×{boxH} mm</div>
          </>
        )}
        {tab === "cylinder" && (
          <>
            <Slider label="Diameter" value={cylD} min={5}  max={400} onChange={v => { setCylD(v); }} />
            <Slider label="Height"   value={cylH} min={10} max={500} onChange={setCylH} />
            <div className="text-[9px] text-slate-600 mt-1">Preview: D{cylD} H{cylH} mm</div>
          </>
        )}
        {tab === "pipe" && (
          <>
            <Slider label="Outer Dia" value={pipeOD} min={10} max={300} onChange={v => { setPipeOD(v); if (v <= pipeID) setPipeID(v - 4); }} />
            <Slider label="Inner Dia" value={pipeID} min={4}  max={pipeOD - 2} onChange={setPipeID} />
            <Slider label="Length"    value={pipeL}  min={20} max={1000} onChange={setPipeL} />
            <div className="text-[9px] text-slate-600 mt-1">Wall: {((pipeOD - pipeID) / 2).toFixed(1)} mm</div>
          </>
        )}

        <button onClick={addToScene}
          className="w-full bg-[#00D4FF] hover:bg-[#00b8d9] text-black text-xs py-1.5 rounded font-bold transition-colors mt-1">
          Add to Scene
        </button>
      </div>
    </div>
  );
}
