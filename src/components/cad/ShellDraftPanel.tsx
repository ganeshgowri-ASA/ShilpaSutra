"use client";
import { useState, useCallback } from "react";
import { useCadStore } from "@/stores/cad-store";
import { Shell, Triangle, X, Check, Eye, Layers } from "lucide-react";

interface ShellDraftPanelProps {
  mode: "shell" | "draft";
  onClose: () => void;
}

export default function ShellDraftPanel({ mode, onClose }: ShellDraftPanelProps) {
  const selectedId = useCadStore((s) => s.selectedId);
  const objects = useCadStore((s) => s.objects);
  const updateObject = useCadStore((s) => s.updateObject);
  const pushHistory = useCadStore((s) => s.pushHistory);

  const selected = objects.find((o) => o.id === selectedId);

  // Shell params
  const [wallThickness, setWallThickness] = useState(0.2);
  const [multiThickness, setMultiThickness] = useState(false);
  const [faceThicknesses, setFaceThicknesses] = useState<Record<string, number>>({});

  // Draft params
  const [draftAngle, setDraftAngle] = useState(3);
  const [neutralPlane, setNeutralPlane] = useState<"top" | "bottom" | "mid">("bottom");
  const [showAnalysis, setShowAnalysis] = useState(false);

  const [previewActive, setPreviewActive] = useState(true);

  const handleApply = useCallback(() => {
    if (!selected) return;
    pushHistory();

    if (mode === "shell") {
      updateObject(selected.id, {
        name: `${selected.name} [Shell t=${wallThickness.toFixed(1)}]`,
        opacity: 0.85,
      });
    } else {
      updateObject(selected.id, {
        name: `${selected.name} [Draft ${draftAngle.toFixed(1)}\u00B0]`,
      });
    }

    onClose();
  }, [selected, mode, wallThickness, draftAngle, pushHistory, updateObject, onClose]);

  if (!selected) {
    return (
      <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-[#1a1a2e]/95 border border-red-500/40 rounded-lg p-4 z-20 backdrop-blur-sm">
        <p className="text-[11px] text-red-400">Select an object first</p>
        <button onClick={onClose} className="mt-2 text-[10px] text-slate-400 hover:text-white">Close</button>
      </div>
    );
  }

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-[#1a1a2e]/95 border border-[#00D4FF]/40 rounded-lg p-4 z-20 backdrop-blur-sm min-w-[280px] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {mode === "shell" ? <Shell size={14} className="text-[#00D4FF]" /> : <Triangle size={14} className="text-[#00D4FF]" />}
          <span className="text-xs font-semibold text-white">
            {mode === "shell" ? "Shell Operation" : "Draft Operation"}
          </span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white">
          <X size={14} />
        </button>
      </div>

      <div className="text-[10px] text-slate-400 mb-3">
        Target: <span className="text-[#00D4FF]">{selected.name}</span>
      </div>

      {mode === "shell" ? (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-slate-400">Wall Thickness</label>
            <input
              type="number"
              value={wallThickness}
              onChange={(e) => setWallThickness(parseFloat(e.target.value) || 0)}
              step={0.05}
              min={0.01}
              className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none mt-0.5"
            />
          </div>

          {/* Multi-thickness toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={multiThickness}
              onChange={(e) => setMultiThickness(e.target.checked)}
              className="rounded border-[#16213e]"
            />
            <span className="text-[10px] text-slate-400">Multi-thickness (per face)</span>
          </label>

          {multiThickness && (
            <div className="bg-[#0d1117] rounded p-2 space-y-1">
              {["Top", "Bottom", "Front", "Back", "Left", "Right"].map((face) => (
                <div key={face} className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">{face}</span>
                  <input
                    type="number"
                    value={faceThicknesses[face] ?? wallThickness}
                    onChange={(e) =>
                      setFaceThicknesses((p) => ({ ...p, [face]: parseFloat(e.target.value) || wallThickness }))
                    }
                    step={0.05}
                    min={0.01}
                    className="w-16 bg-[#16213e] text-white text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="text-[9px] text-slate-600 bg-[#0d1117] rounded p-2">
            <Layers size={10} className="inline mr-1" />
            Click faces to select which to remove (hollow out). Selected faces become openings.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-slate-400">Draft Angle (\u00B0)</label>
            <input
              type="number"
              value={draftAngle}
              onChange={(e) => setDraftAngle(parseFloat(e.target.value) || 0)}
              step={0.5}
              min={0.1}
              max={45}
              className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none mt-0.5"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400">Neutral Plane</label>
            <div className="flex gap-1 mt-0.5">
              {(["top", "bottom", "mid"] as const).map((plane) => (
                <button
                  key={plane}
                  onClick={() => setNeutralPlane(plane)}
                  className={`flex-1 text-[10px] px-2 py-1 rounded border transition-colors capitalize ${
                    neutralPlane === plane
                      ? "border-[#00D4FF]/50 bg-[#00D4FF]/10 text-[#00D4FF]"
                      : "border-[#16213e] text-slate-500 hover:text-white"
                  }`}
                >
                  {plane}
                </button>
              ))}
            </div>
          </div>

          {/* Draft analysis */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showAnalysis}
              onChange={(e) => setShowAnalysis(e.target.checked)}
              className="rounded border-[#16213e]"
            />
            <span className="text-[10px] text-slate-400">Show draft analysis color map</span>
          </label>

          {showAnalysis && (
            <div className="bg-[#0d1117] rounded p-2">
              <div className="text-[9px] text-slate-500 mb-1">Draft Analysis Legend:</div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-green-500" />
                  <span className="text-[9px] text-slate-400">Sufficient</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-yellow-500" />
                  <span className="text-[9px] text-slate-400">Marginal</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-red-500" />
                  <span className="text-[9px] text-slate-400">Undercut</span>
                </div>
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
