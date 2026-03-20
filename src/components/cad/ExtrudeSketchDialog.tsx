"use client";
import { useState, useCallback } from "react";
import { useCadStore } from "@/stores/cad-store";
import { Layers, X, Check } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function ExtrudeSketchDialog({ onClose }: Props) {
  const objects = useCadStore((s) => s.objects);
  const selectedId = useCadStore((s) => s.selectedId);
  const selectedIds = useCadStore((s) => s.selectedIds);
  const addGeneratedObject = useCadStore((s) => s.addGeneratedObject);
  const addFeature = useCadStore((s) => s.addFeature);
  const pushHistory = useCadStore((s) => s.pushHistory);

  const [height, setHeight] = useState(2);
  const [direction, setDirection] = useState<"positive" | "negative" | "symmetric">("positive");

  // Find sketch objects to extrude
  const sketchTypes = ["rectangle", "circle", "line"];
  const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
  const sketchObjs = objects.filter(
    (o) => ids.includes(o.id) && sketchTypes.includes(o.type)
  );

  // Also allow extruding last sketch object if nothing selected
  const candidates = sketchObjs.length > 0
    ? sketchObjs
    : objects.filter((o) => sketchTypes.includes(o.type)).slice(-1);

  const handleExtrude = useCallback(() => {
    if (candidates.length === 0) {
      alert("No sketch profile selected. Select a rectangle or circle first.");
      return;
    }
    pushHistory();
    const h = Math.abs(height);
    const yOffset = direction === "negative" ? -h / 2 : direction === "symmetric" ? 0 : h / 2;

    candidates.forEach((obj) => {
      if (obj.type === "rectangle" && obj.rectCorners) {
        const [c1, c2] = obj.rectCorners;
        const w = Math.abs(c2[0] - c1[0]);
        const d = Math.abs(c2[2] - c1[2]);
        const cx = (c1[0] + c2[0]) / 2;
        const cz = (c1[2] + c2[2]) / 2;
        const extH = direction === "symmetric" ? h * 2 : h;
        const id = addGeneratedObject({
          type: "box",
          name: `Extrude(${obj.name})`,
          position: [cx, yOffset + (direction === "negative" ? -extH / 2 : extH / 2), cz],
          dimensions: { width: w || 1, height: extH, depth: d || 1 },
          color: "#4a9eff",
          material: "Aluminum 6061-T6",
        });
        addFeature({
          id: `feat_extrude_${id}`,
          type: "extrude",
          name: `Extrude(${obj.name})`,
          objectId: id,
          visible: true,
          locked: false,
        });
      } else if (obj.type === "circle" && obj.circleRadius && obj.circleCenter) {
        const extH = direction === "symmetric" ? h * 2 : h;
        const cy = yOffset + (direction === "negative" ? -extH / 2 : extH / 2);
        const id = addGeneratedObject({
          type: "cylinder",
          name: `Extrude(${obj.name})`,
          position: [obj.circleCenter[0], cy, obj.circleCenter[2]],
          dimensions: { width: obj.circleRadius, height: extH, depth: obj.circleRadius },
          color: "#4a9eff",
          material: "Aluminum 6061-T6",
        });
        addFeature({
          id: `feat_extrude_${id}`,
          type: "extrude",
          name: `Extrude(${obj.name})`,
          objectId: id,
          visible: true,
          locked: false,
        });
      }
    });

    onClose();
  }, [candidates, height, direction, pushHistory, addGeneratedObject, addFeature, onClose]);

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#1a1a2e] border border-[#16213e] rounded-xl shadow-2xl w-72">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#16213e]">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-[#00D4FF]" />
          <span className="text-sm font-semibold text-white">Extrude Sketch</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Profile info */}
        {candidates.length === 0 ? (
          <p className="text-xs text-yellow-400">No sketch profile found. Draw a rectangle or circle first.</p>
        ) : (
          <p className="text-xs text-slate-400">
            Extruding: <span className="text-white">{candidates.map((o) => o.name).join(", ")}</span>
          </p>
        )}

        {/* Height */}
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Extrude Distance</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0.1}
              max={20}
              step={0.1}
              value={height}
              onChange={(e) => setHeight(parseFloat(e.target.value))}
              className="flex-1 accent-[#00D4FF]"
            />
            <input
              type="number"
              value={height}
              min={0.1}
              step={0.1}
              onChange={(e) => setHeight(Math.max(0.1, parseFloat(e.target.value) || 1))}
              className="w-16 bg-[#0d1117] border border-[#16213e] rounded px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-[#00D4FF]"
            />
          </div>
        </div>

        {/* Direction */}
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Direction</label>
          <div className="flex gap-1">
            {(["positive", "negative", "symmetric"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className={`flex-1 py-1 rounded text-[11px] capitalize transition-colors ${
                  direction === d
                    ? "bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/40"
                    : "bg-[#0d1117] text-slate-400 border border-[#16213e] hover:border-[#00D4FF]/30"
                }`}
              >
                {d === "positive" ? "+Z" : d === "negative" ? "-Z" : "±Z"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={onClose}
          className="flex-1 py-2 rounded border border-[#16213e] text-slate-400 text-xs hover:text-white hover:border-slate-500 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleExtrude}
          disabled={candidates.length === 0}
          className="flex-1 py-2 rounded bg-[#00D4FF]/20 border border-[#00D4FF]/40 text-[#00D4FF] text-xs font-medium hover:bg-[#00D4FF]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
        >
          <Check size={12} />
          Extrude
        </button>
      </div>
    </div>
  );
}
