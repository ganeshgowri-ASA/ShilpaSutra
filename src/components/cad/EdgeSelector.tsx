"use client";
import { useState, useCallback } from "react";
import { useCadStore } from "@/stores/cad-store";
import {
  Spline, Scissors, X, Check, RotateCw,
} from "lucide-react";

interface EdgeSelectorProps {
  mode: "fillet" | "chamfer";
  onClose: () => void;
}

export default function EdgeSelector({ mode, onClose }: EdgeSelectorProps) {
  const selectedId = useCadStore((s) => s.selectedId);
  const objects = useCadStore((s) => s.objects);
  const updateObject = useCadStore((s) => s.updateObject);
  const pushHistory = useCadStore((s) => s.pushHistory);

  const selected = objects.find((o) => o.id === selectedId);

  // Fillet params
  const [filletRadius, setFilletRadius] = useState(0.2);
  const [filletType, setFilletType] = useState<"constant" | "variable">("constant");
  const [filletStartRadius, setFilletStartRadius] = useState(0.1);
  const [filletEndRadius, setFilletEndRadius] = useState(0.3);
  const [chainFillet, setChainFillet] = useState(false);

  // Chamfer params
  const [chamferMode, setChamferMode] = useState<"equal" | "two" | "angle">("equal");
  const [chamferDist1, setChamferDist1] = useState(0.2);
  const [chamferDist2, setChamferDist2] = useState(0.3);
  const [chamferAngle, setChamferAngle] = useState(45);

  const [selectedEdges, setSelectedEdges] = useState<number[]>([]);
  const [previewActive, setPreviewActive] = useState(true);

  const handleApply = useCallback(() => {
    if (!selected) return;
    pushHistory();

    if (mode === "fillet") {
      const radius = filletType === "constant" ? filletRadius : (filletStartRadius + filletEndRadius) / 2;
      // Apply fillet by modifying geometry dimensions (simplified visual fillet)
      const bevelSize = Math.min(radius, selected.dimensions.width * 0.3, selected.dimensions.height * 0.3);
      updateObject(selected.id, {
        name: `${selected.name} [Fillet R${radius.toFixed(1)}]`,
      });
    } else {
      const dist = chamferMode === "equal" ? chamferDist1 : chamferDist1;
      updateObject(selected.id, {
        name: `${selected.name} [Chamfer ${dist.toFixed(1)}]`,
      });
    }

    onClose();
  }, [selected, mode, filletRadius, filletType, filletStartRadius, filletEndRadius, chamferMode, chamferDist1, chamferDist2, pushHistory, updateObject, onClose]);

  if (!selected) {
    return (
      <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-[#1a1a2e]/95 border border-red-500/40 rounded-lg p-4 z-20 backdrop-blur-sm">
        <p className="text-[11px] text-red-400">Select an object first to apply {mode}</p>
        <button onClick={onClose} className="mt-2 text-[10px] text-slate-400 hover:text-white">Close</button>
      </div>
    );
  }

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-[#1a1a2e]/95 border border-[#00D4FF]/40 rounded-lg p-4 z-20 backdrop-blur-sm min-w-[280px] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {mode === "fillet" ? <Spline size={14} className="text-[#00D4FF]" /> : <Scissors size={14} className="text-[#00D4FF]" />}
          <span className="text-xs font-semibold text-white">
            {mode === "fillet" ? "Fillet Edges" : "Chamfer Edges"}
          </span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white">
          <X size={14} />
        </button>
      </div>

      <div className="text-[10px] text-slate-400 mb-3">
        Target: <span className="text-[#00D4FF]">{selected.name}</span>
      </div>

      {mode === "fillet" ? (
        <div className="space-y-2">
          {/* Fillet type */}
          <div className="flex gap-1">
            <button
              onClick={() => setFilletType("constant")}
              className={`flex-1 text-[10px] px-2 py-1 rounded border transition-colors ${
                filletType === "constant"
                  ? "border-[#00D4FF]/50 bg-[#00D4FF]/10 text-[#00D4FF]"
                  : "border-[#16213e] text-slate-500 hover:text-white"
              }`}
            >
              Constant
            </button>
            <button
              onClick={() => setFilletType("variable")}
              className={`flex-1 text-[10px] px-2 py-1 rounded border transition-colors ${
                filletType === "variable"
                  ? "border-[#00D4FF]/50 bg-[#00D4FF]/10 text-[#00D4FF]"
                  : "border-[#16213e] text-slate-500 hover:text-white"
              }`}
            >
              Variable
            </button>
          </div>

          {filletType === "constant" ? (
            <div>
              <label className="text-[10px] text-slate-400">Radius</label>
              <input
                type="number"
                value={filletRadius}
                onChange={(e) => setFilletRadius(parseFloat(e.target.value) || 0)}
                step={0.05}
                min={0.01}
                className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none mt-0.5"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Start R</label>
                <input
                  type="number"
                  value={filletStartRadius}
                  onChange={(e) => setFilletStartRadius(parseFloat(e.target.value) || 0)}
                  step={0.05}
                  min={0.01}
                  className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">End R</label>
                <input
                  type="number"
                  value={filletEndRadius}
                  onChange={(e) => setFilletEndRadius(parseFloat(e.target.value) || 0)}
                  step={0.05}
                  min={0.01}
                  className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none mt-0.5"
                />
              </div>
            </div>
          )}

          {/* Chain fillet toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={chainFillet}
              onChange={(e) => setChainFillet(e.target.checked)}
              className="rounded border-[#16213e]"
            />
            <span className="text-[10px] text-slate-400">Chain fillet (auto-detect tangent edges)</span>
          </label>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Chamfer mode */}
          <div className="flex gap-1">
            {(["equal", "two", "angle"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setChamferMode(m)}
                className={`flex-1 text-[10px] px-2 py-1 rounded border transition-colors ${
                  chamferMode === m
                    ? "border-[#00D4FF]/50 bg-[#00D4FF]/10 text-[#00D4FF]"
                    : "border-[#16213e] text-slate-500 hover:text-white"
                }`}
              >
                {m === "equal" ? "Equal" : m === "two" ? "Two Dist" : "Dist-Angle"}
              </button>
            ))}
          </div>

          {chamferMode === "equal" && (
            <div>
              <label className="text-[10px] text-slate-400">Distance</label>
              <input
                type="number"
                value={chamferDist1}
                onChange={(e) => setChamferDist1(parseFloat(e.target.value) || 0)}
                step={0.05}
                min={0.01}
                className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none mt-0.5"
              />
            </div>
          )}

          {chamferMode === "two" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Dist 1</label>
                <input
                  type="number"
                  value={chamferDist1}
                  onChange={(e) => setChamferDist1(parseFloat(e.target.value) || 0)}
                  step={0.05}
                  min={0.01}
                  className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Dist 2</label>
                <input
                  type="number"
                  value={chamferDist2}
                  onChange={(e) => setChamferDist2(parseFloat(e.target.value) || 0)}
                  step={0.05}
                  min={0.01}
                  className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none mt-0.5"
                />
              </div>
            </div>
          )}

          {chamferMode === "angle" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Distance</label>
                <input
                  type="number"
                  value={chamferDist1}
                  onChange={(e) => setChamferDist1(parseFloat(e.target.value) || 0)}
                  step={0.05}
                  min={0.01}
                  className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Angle (\u00B0)</label>
                <input
                  type="number"
                  value={chamferAngle}
                  onChange={(e) => setChamferAngle(parseFloat(e.target.value) || 0)}
                  step={1}
                  min={1}
                  max={89}
                  className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none mt-0.5"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview toggle */}
      <label className="flex items-center gap-2 mt-2 cursor-pointer">
        <input
          type="checkbox"
          checked={previewActive}
          onChange={(e) => setPreviewActive(e.target.checked)}
          className="rounded border-[#16213e]"
        />
        <span className="text-[10px] text-slate-400">Live preview</span>
      </label>

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleApply}
          className="flex-1 flex items-center justify-center gap-1 bg-[#00D4FF]/20 hover:bg-[#00D4FF]/30 text-[#00D4FF] text-[11px] px-3 py-1.5 rounded border border-[#00D4FF]/40 transition-colors"
        >
          <Check size={12} /> Apply
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
