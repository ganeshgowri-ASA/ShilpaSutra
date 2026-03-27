"use client";

import { useState } from "react";
import {
  Scissors,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Save,
  BoxSelect,
  RotateCcw,
} from "lucide-react";
import { useVisualizationStore, type ClippingPlane } from "@/stores/visualization-store";

const PLANE_PRESETS = [
  { label: "+X", normal: [1, 0, 0] as [number, number, number] },
  { label: "-X", normal: [-1, 0, 0] as [number, number, number] },
  { label: "+Y", normal: [0, 1, 0] as [number, number, number] },
  { label: "-Y", normal: [0, -1, 0] as [number, number, number] },
  { label: "+Z", normal: [0, 0, 1] as [number, number, number] },
  { label: "-Z", normal: [0, 0, -1] as [number, number, number] },
];

export default function SectionCutsPanel() {
  const {
    clippingPlanes,
    sectionBox,
    savedViewpoints,
    addClippingPlane,
    removeClippingPlane,
    updateClippingPlane,
    toggleSectionBox,
    updateSectionBox,
    saveViewpoint,
    loadViewpoint,
    deleteViewpoint,
  } = useVisualizationStore();

  const [viewpointName, setViewpointName] = useState("");

  const handleAddPlane = (normal: [number, number, number]) => {
    if (clippingPlanes.length >= 6) return;
    const plane: ClippingPlane = {
      id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      normal,
      distance: 0,
      enabled: true,
      visible: true,
    };
    addClippingPlane(plane);
  };

  const handleSaveViewpoint = () => {
    if (!viewpointName.trim()) return;
    saveViewpoint(viewpointName.trim());
    setViewpointName("");
  };

  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#21262d]">
        <Scissors size={13} className="text-[#00D4FF]" />
        <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
          Section Cuts
        </span>
        <span className="ml-auto text-[9px] text-slate-600">
          {clippingPlanes.length}/6 planes
        </span>
      </div>

      <div className="p-2 space-y-2">
        {/* Section box toggle */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-[#161b22] rounded">
          <div className="flex items-center gap-2">
            <BoxSelect size={12} className="text-slate-500" />
            <span className="text-[10px] text-slate-300 font-medium">
              Section Box
            </span>
          </div>
          <button
            onClick={toggleSectionBox}
            className={`w-8 h-4 rounded-full transition-colors ${
              sectionBox.enabled ? "bg-[#00D4FF]" : "bg-slate-700"
            } relative`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                sectionBox.enabled ? "translate-x-4.5 left-0.5" : "left-0.5"
              }`}
              style={{ left: sectionBox.enabled ? "16px" : "2px" }}
            />
          </button>
        </div>

        {/* Section box extents */}
        {sectionBox.enabled && (
          <div className="px-2 py-1.5 bg-[#161b22] rounded space-y-1">
            <div className="text-[9px] text-slate-600 font-bold uppercase">Box Extents</div>
            {(["min", "max"] as const).map((bound) => (
              <div key={bound} className="flex items-center gap-1">
                <span className="text-[9px] text-slate-500 w-6 uppercase">{bound}</span>
                {[0, 1, 2].map((axis) => (
                  <input
                    key={axis}
                    type="number"
                    step={0.5}
                    value={sectionBox[bound][axis]}
                    onChange={(e) => {
                      const newVal = [...sectionBox[bound]] as [number, number, number];
                      newVal[axis] = parseFloat(e.target.value) || 0;
                      updateSectionBox({ [bound]: newVal });
                    }}
                    className="w-14 bg-[#0d1117] border border-[#21262d] rounded text-[9px] text-slate-300 px-1 py-0.5 text-center font-mono focus:outline-none focus:border-[#00D4FF]/30"
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Add clipping plane */}
        <div>
          <div className="text-[9px] text-slate-600 font-bold uppercase px-1 mb-1">
            Add Clipping Plane
          </div>
          <div className="flex gap-1 flex-wrap px-1">
            {PLANE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleAddPlane(preset.normal)}
                disabled={clippingPlanes.length >= 6}
                className="px-2 py-0.5 bg-[#161b22] border border-[#21262d] rounded text-[9px] text-slate-400 hover:text-[#00D4FF] hover:border-[#00D4FF]/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active clipping planes */}
        {clippingPlanes.length > 0 && (
          <div className="space-y-1">
            <div className="text-[9px] text-slate-600 font-bold uppercase px-1">
              Active Planes
            </div>
            {clippingPlanes.map((plane) => (
              <div
                key={plane.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-[#161b22] rounded"
              >
                <button
                  onClick={() =>
                    updateClippingPlane(plane.id, { enabled: !plane.enabled })
                  }
                  className="w-4 h-4 flex items-center justify-center"
                >
                  {plane.enabled ? (
                    <Eye size={10} className="text-[#00D4FF]" />
                  ) : (
                    <EyeOff size={10} className="text-slate-700" />
                  )}
                </button>

                <span className="text-[9px] text-slate-400 font-mono flex-1">
                  N({plane.normal.join(", ")})
                </span>

                <input
                  type="range"
                  min={-10}
                  max={10}
                  step={0.1}
                  value={plane.distance}
                  onChange={(e) =>
                    updateClippingPlane(plane.id, {
                      distance: parseFloat(e.target.value),
                    })
                  }
                  className="w-16 h-1 accent-[#00D4FF]"
                />

                <span className="text-[8px] text-slate-600 font-mono w-8 text-right">
                  {plane.distance.toFixed(1)}
                </span>

                <button
                  onClick={() => removeClippingPlane(plane.id)}
                  className="w-4 h-4 flex items-center justify-center text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={9} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Saved viewpoints */}
        <div className="border-t border-[#21262d] pt-2">
          <div className="text-[9px] text-slate-600 font-bold uppercase px-1 mb-1">
            Saved Viewpoints
          </div>

          <div className="flex gap-1 px-1 mb-1">
            <input
              type="text"
              placeholder="Viewpoint name..."
              value={viewpointName}
              onChange={(e) => setViewpointName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveViewpoint()}
              className="flex-1 bg-[#161b22] border border-[#21262d] rounded text-[9px] text-slate-300 px-2 py-0.5 placeholder-slate-700 focus:outline-none focus:border-[#00D4FF]/30"
            />
            <button
              onClick={handleSaveViewpoint}
              disabled={!viewpointName.trim()}
              className="px-2 py-0.5 bg-[#00D4FF]/10 text-[#00D4FF] rounded text-[9px] hover:bg-[#00D4FF]/20 transition-colors disabled:opacity-30"
            >
              <Save size={10} />
            </button>
          </div>

          {savedViewpoints.length > 0 && (
            <div className="space-y-0.5 px-1">
              {savedViewpoints.map((vp) => (
                <div
                  key={vp.id}
                  className="flex items-center gap-1.5 px-2 py-0.5 bg-[#161b22] rounded group"
                >
                  <span className="text-[9px] text-slate-400 flex-1 truncate">
                    {vp.name}
                  </span>
                  <button
                    onClick={() => loadViewpoint(vp.id)}
                    className="text-[8px] text-[#00D4FF] hover:underline opacity-0 group-hover:opacity-100"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => deleteViewpoint(vp.id)}
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={8} className="text-slate-600 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
