"use client";
import { useState, useCallback } from "react";
import { useCadStore } from "@/stores/cad-store";
import { RotateCw, X, Check } from "lucide-react";

interface RevolveDialogProps {
  onClose: () => void;
}

export default function RevolveDialog({ onClose }: RevolveDialogProps) {
  const selectedId = useCadStore((s) => s.selectedId);
  const objects = useCadStore((s) => s.objects);
  const revolveFromSketch = useCadStore((s) => s.revolveFromSketch);

  const selected = objects.find((o) => o.id === selectedId);
  const sketchTypes = ["rectangle", "circle", "polygon"];
  const isValidSketch = selected && (sketchTypes.includes(selected.type) || selected.isProfile);

  const [angle, setAngle] = useState(360);

  const handleApply = useCallback(() => {
    if (!selected || !isValidSketch) return;
    revolveFromSketch(selected.id, angle);
    onClose();
  }, [selected, isValidSketch, angle, revolveFromSketch, onClose]);

  if (!isValidSketch) {
    return (
      <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-[#1a1a2e]/95 border border-red-500/40 rounded-lg p-4 z-20 backdrop-blur-sm shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <RotateCw size={14} className="text-[#00D4FF]" />
          <span className="text-xs font-semibold text-white">Revolve</span>
          <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white"><X size={12} /></button>
        </div>
        <p className="text-[11px] text-red-400">
          Select a Rectangle or Circle sketch first.
        </p>
        <p className="text-[10px] text-slate-500 mt-1">
          Active: {selected?.type || "none"}
        </p>
      </div>
    );
  }

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-[#1a1a2e]/95 border border-[#00D4FF]/40 rounded-lg p-4 z-20 backdrop-blur-sm shadow-xl min-w-[260px]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <RotateCw size={14} className="text-[#00D4FF]" />
        <span className="text-xs font-semibold text-white">Revolve from Sketch</span>
        <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white"><X size={12} /></button>
      </div>

      {/* Profile info */}
      <div className="text-[10px] text-slate-400 mb-3">
        Profile: <span className="text-[#00D4FF]">{selected.name}</span>
        <span className="text-slate-600 ml-1">({selected.type})</span>
      </div>

      {/* Angle input */}
      <div className="mb-3">
        <label className="text-[10px] text-slate-400 block mb-1">Revolution Angle (°)</label>
        <input
          type="number"
          value={angle}
          onChange={(e) => setAngle(Math.min(360, Math.max(1, parseFloat(e.target.value) || 360)))}
          min={1}
          max={360}
          step={15}
          className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1.5 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none"
          autoFocus
        />
      </div>

      {/* Angle presets */}
      <div className="flex gap-1 mb-3">
        {[90, 180, 270, 360].map((a) => (
          <button
            key={a}
            onClick={() => setAngle(a)}
            className={`flex-1 text-[10px] py-1 rounded border transition-colors ${
              angle === a ? "border-[#00D4FF]/50 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-[#16213e] text-slate-500 hover:text-white"
            }`}
          >
            {a}°
          </button>
        ))}
      </div>

      {/* Info */}
      <div className="bg-[#0d1117] rounded p-2 mb-3 text-[10px] text-slate-500">
        Revolves the {selected.type} profile <span className="text-[#00D4FF]">{angle}°</span> around the Y axis.
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleApply}
          className="flex-1 flex items-center justify-center gap-1 bg-[#00D4FF]/20 hover:bg-[#00D4FF]/30 text-[#00D4FF] text-[11px] px-3 py-1.5 rounded border border-[#00D4FF]/40 transition-colors"
        >
          <Check size={12} /> Revolve
        </button>
        <button
          onClick={onClose}
          className="flex items-center justify-center gap-1 text-slate-400 hover:text-white text-[11px] px-3 py-1.5 rounded border border-[#16213e] hover:border-slate-500 transition-colors"
        >
          <X size={12} /> Cancel
        </button>
      </div>
    </div>
  );
}
