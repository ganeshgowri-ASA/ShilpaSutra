"use client";
import { useState, useCallback } from "react";
import { useCadStore } from "@/stores/cad-store";
import {
  Grid3X3, RotateCcw, FlipHorizontal, X, Check,
  ArrowRight, Spline,
} from "lucide-react";

type PatternMode = "linear" | "circular" | "mirror" | "path";

interface PatternDialogProps {
  initialMode: PatternMode;
  onClose: () => void;
}

export default function PatternDialog({ initialMode, onClose }: PatternDialogProps) {
  const selectedId = useCadStore((s) => s.selectedId);
  const objects = useCadStore((s) => s.objects);
  const pushHistory = useCadStore((s) => s.pushHistory);
  const addGeneratedObject = useCadStore((s) => s.addGeneratedObject);

  const selected = objects.find((o) => o.id === selectedId);

  const [mode, setMode] = useState<PatternMode>(initialMode);

  // Linear pattern
  const [linearCountX, setLinearCountX] = useState(3);
  const [linearCountY, setLinearCountY] = useState(1);
  const [linearSpacingX, setLinearSpacingX] = useState(3);
  const [linearSpacingY, setLinearSpacingY] = useState(3);
  const [skipInstances, setSkipInstances] = useState<number[]>([]);

  // Circular pattern
  const [circularCount, setCircularCount] = useState(6);
  const [circularAngle, setCircularAngle] = useState(360);
  const [circularAxis, setCircularAxis] = useState<"x" | "y" | "z">("y");
  const [equalSpacing, setEqualSpacing] = useState(true);

  // Mirror
  const [mirrorPlane, setMirrorPlane] = useState<"xy" | "xz" | "yz">("yz");

  const [previewActive, setPreviewActive] = useState(true);

  const handleApply = useCallback(() => {
    if (!selected) return;
    pushHistory();

    const sketchTypes = ["line", "arc", "circle", "rectangle"];
    const isSketch = sketchTypes.includes(selected.type);

    if (mode === "linear") {
      for (let x = 0; x < linearCountX; x++) {
        for (let y = 0; y < linearCountY; y++) {
          if (x === 0 && y === 0) continue; // Skip seed
          const index = x * linearCountY + y;
          if (skipInstances.includes(index)) continue;

          const offsetX = x * linearSpacingX;
          const offsetZ = y * linearSpacingY;

          addGeneratedObject({
            ...selected,
            name: `${selected.name} [${x + 1},${y + 1}]`,
            position: [
              selected.position[0] + offsetX,
              selected.position[1],
              selected.position[2] + offsetZ,
            ],
          });
        }
      }
    } else if (mode === "circular") {
      const angleStep = (circularAngle / circularCount) * (Math.PI / 180);
      for (let i = 1; i < circularCount; i++) {
        const angle = angleStep * i;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        let newPos: [number, number, number];

        switch (circularAxis) {
          case "y":
            newPos = [
              selected.position[0] * cos - selected.position[2] * sin,
              selected.position[1],
              selected.position[0] * sin + selected.position[2] * cos,
            ];
            break;
          case "x":
            newPos = [
              selected.position[0],
              selected.position[1] * cos - selected.position[2] * sin,
              selected.position[1] * sin + selected.position[2] * cos,
            ];
            break;
          case "z":
            newPos = [
              selected.position[0] * cos - selected.position[1] * sin,
              selected.position[0] * sin + selected.position[1] * cos,
              selected.position[2],
            ];
            break;
        }

        addGeneratedObject({
          ...selected,
          name: `${selected.name} [C${i + 1}]`,
          position: newPos,
          rotation: circularAxis === "y"
            ? [selected.rotation[0], selected.rotation[1] + angle, selected.rotation[2]]
            : selected.rotation,
        });
      }
    } else if (mode === "mirror") {
      const newPos: [number, number, number] = [...selected.position];
      const newScale: [number, number, number] = [...selected.scale];

      switch (mirrorPlane) {
        case "yz":
          newPos[0] = -newPos[0];
          newScale[0] = -newScale[0];
          break;
        case "xz":
          newPos[1] = -newPos[1];
          newScale[1] = -newScale[1];
          break;
        case "xy":
          newPos[2] = -newPos[2];
          newScale[2] = -newScale[2];
          break;
      }

      addGeneratedObject({
        ...selected,
        name: `${selected.name} [Mirror]`,
        position: newPos,
        scale: newScale,
      });
    }

    onClose();
  }, [selected, mode, linearCountX, linearCountY, linearSpacingX, linearSpacingY, skipInstances, circularCount, circularAngle, circularAxis, mirrorPlane, pushHistory, addGeneratedObject, onClose]);

  if (!selected) {
    return (
      <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-[#1a1a2e]/95 border border-red-500/40 rounded-lg p-4 z-20 backdrop-blur-sm">
        <p className="text-[11px] text-red-400">Select a seed object first</p>
        <button onClick={onClose} className="mt-2 text-[10px] text-slate-400 hover:text-white">Close</button>
      </div>
    );
  }

  return (
    <div className="absolute top-12 right-4 bg-[#1a1a2e]/95 border border-[#00D4FF]/40 rounded-lg p-4 z-20 backdrop-blur-sm min-w-[300px] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-white">Pattern / Mirror</span>
        <button onClick={onClose} className="text-slate-500 hover:text-white">
          <X size={14} />
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 mb-3">
        {([
          { id: "linear" as PatternMode, icon: <Grid3X3 size={12} />, label: "Linear" },
          { id: "circular" as PatternMode, icon: <RotateCcw size={12} />, label: "Circular" },
          { id: "mirror" as PatternMode, icon: <FlipHorizontal size={12} />, label: "Mirror" },
          { id: "path" as PatternMode, icon: <Spline size={12} />, label: "Path" },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 text-[10px] px-2 py-1.5 rounded border transition-colors ${
              mode === tab.id
                ? "border-[#00D4FF]/50 bg-[#00D4FF]/10 text-[#00D4FF]"
                : "border-[#16213e] text-slate-500 hover:text-white"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="text-[10px] text-slate-400 mb-3">
        Seed: <span className="text-[#00D4FF]">{selected.name}</span>
      </div>

      {/* Mode-specific controls */}
      {mode === "linear" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400">X Count</label>
              <input
                type="number"
                value={linearCountX}
                onChange={(e) => setLinearCountX(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={50}
                className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Y Count</label>
              <input
                type="number"
                value={linearCountY}
                onChange={(e) => setLinearCountY(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={50}
                className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">X Spacing</label>
              <input
                type="number"
                value={linearSpacingX}
                onChange={(e) => setLinearSpacingX(parseFloat(e.target.value) || 1)}
                step={0.5}
                min={0.1}
                className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Y Spacing</label>
              <input
                type="number"
                value={linearSpacingY}
                onChange={(e) => setLinearSpacingY(parseFloat(e.target.value) || 1)}
                step={0.5}
                min={0.1}
                className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none mt-0.5"
              />
            </div>
          </div>
          <div className="text-[9px] text-slate-600">
            Total instances: {linearCountX * linearCountY - skipInstances.length}
          </div>
        </div>
      )}

      {mode === "circular" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400">Count</label>
              <input
                type="number"
                value={circularCount}
                onChange={(e) => setCircularCount(Math.max(2, parseInt(e.target.value) || 2))}
                min={2}
                max={100}
                className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Total Angle (\u00B0)</label>
              <input
                type="number"
                value={circularAngle}
                onChange={(e) => setCircularAngle(parseFloat(e.target.value) || 360)}
                step={15}
                min={1}
                max={360}
                className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none mt-0.5"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400">Axis</label>
            <div className="flex gap-1 mt-0.5">
              {(["x", "y", "z"] as const).map((axis) => (
                <button
                  key={axis}
                  onClick={() => setCircularAxis(axis)}
                  className={`flex-1 text-[10px] px-2 py-1 rounded border transition-colors uppercase ${
                    circularAxis === axis
                      ? "border-[#00D4FF]/50 bg-[#00D4FF]/10 text-[#00D4FF]"
                      : "border-[#16213e] text-slate-500 hover:text-white"
                  }`}
                >
                  {axis}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={equalSpacing}
              onChange={(e) => setEqualSpacing(e.target.checked)}
              className="rounded border-[#16213e]"
            />
            <span className="text-[10px] text-slate-400">Equal spacing</span>
          </label>
        </div>
      )}

      {mode === "mirror" && (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-slate-400">Mirror Plane</label>
            <div className="flex gap-1 mt-0.5">
              {(["yz", "xz", "xy"] as const).map((plane) => (
                <button
                  key={plane}
                  onClick={() => setMirrorPlane(plane)}
                  className={`flex-1 text-[10px] px-2 py-1 rounded border transition-colors uppercase ${
                    mirrorPlane === plane
                      ? "border-[#00D4FF]/50 bg-[#00D4FF]/10 text-[#00D4FF]"
                      : "border-[#16213e] text-slate-500 hover:text-white"
                  }`}
                >
                  {plane}
                </button>
              ))}
            </div>
          </div>
          <div className="text-[9px] text-slate-600 bg-[#0d1117] rounded p-2">
            Mirror will create a reflected copy across the {mirrorPlane.toUpperCase()} plane passing through the origin.
          </div>
        </div>
      )}

      {mode === "path" && (
        <div className="text-[10px] text-slate-500 bg-[#0d1117] rounded p-3 text-center">
          <Spline size={16} className="mx-auto mb-1 text-slate-600" />
          Select a sketch curve as the pattern path.
          <br />
          <span className="text-[9px] text-slate-600">Click a line, arc, or spline in the viewport.</span>
        </div>
      )}

      {/* Preview toggle */}
      <label className="flex items-center gap-2 mt-3 cursor-pointer">
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
