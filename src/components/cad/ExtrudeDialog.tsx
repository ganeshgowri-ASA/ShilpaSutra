"use client";
import { useState, useCallback } from "react";
import { useCadStore } from "@/stores/cad-store";
import { Layers, X, Check, ArrowUp } from "lucide-react";

interface ExtrudeDialogProps {
  onClose: () => void;
}

export default function ExtrudeDialog({ onClose }: ExtrudeDialogProps) {
  const selectedId = useCadStore((s) => s.selectedId);
  const objects = useCadStore((s) => s.objects);
  const extrudeFromSketch = useCadStore((s) => s.extrudeFromSketch);

  const selected = objects.find((o) => o.id === selectedId);
  const sketchTypes = ["rectangle", "circle"];
  const isValidSketch = selected && sketchTypes.includes(selected.type);

  const [distance, setDistance] = useState(10);

  const handleApply = useCallback(() => {
    if (!selected || !isValidSketch) return;
    extrudeFromSketch(selected.id, distance);
    onClose();
  }, [selected, isValidSketch, distance, extrudeFromSketch, onClose]);

  if (!isValidSketch) {
    return (
      <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-[#1a1a2e]/95 border border-red-500/40 rounded-lg p-4 z-20 backdrop-blur-sm shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Layers size={14} className="text-[#00D4FF]" />
          <span className="text-xs font-semibold text-white">Extrude</span>
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
        <Layers size={14} className="text-[#00D4FF]" />
        <span className="text-xs font-semibold text-white">Extrude from Sketch</span>
        <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white"><X size={12} /></button>
      </div>

      {/* Profile info */}
      <div className="text-[10px] text-slate-400 mb-3">
        Profile: <span className="text-[#00D4FF]">{selected.name}</span>
        <span className="text-slate-600 ml-1">({selected.type})</span>
      </div>

      {/* Distance input */}
      <div className="mb-4">
        <label className="text-[10px] text-slate-400 block mb-1">
          <ArrowUp size={10} className="inline mr-1" />
          Extrude Distance (mm)
        </label>
        <input
          type="number"
          value={distance}
          onChange={(e) => setDistance(parseFloat(e.target.value) || 1)}
          min={0.1}
          step={1}
          className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1.5 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none"
          autoFocus
        />
      </div>

      {/* Preview info */}
      <div className="bg-[#0d1117] rounded p-2 mb-3 text-[10px] text-slate-500">
        Extrudes the selected {selected.type} sketch by <span className="text-[#00D4FF]">{distance} mm</span> along the normal axis.
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleApply}
          className="flex-1 flex items-center justify-center gap-1 bg-[#00D4FF]/20 hover:bg-[#00D4FF]/30 text-[#00D4FF] text-[11px] px-3 py-1.5 rounded border border-[#00D4FF]/40 transition-colors"
        >
          <Check size={12} /> Extrude
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
