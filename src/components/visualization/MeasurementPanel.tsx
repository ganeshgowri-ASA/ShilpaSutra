"use client";

import { useMemo } from "react";
import {
  Ruler,
  Trash2,
  Download,
  CornerDownRight,
  Triangle,
  Square,
} from "lucide-react";
import {
  useVisualizationStore,
  type Measurement3D,
} from "@/stores/visualization-store";

export default function MeasurementPanel() {
  const {
    measurements,
    activeTool,
    setActiveTool,
    removeMeasurement,
    clearMeasurements,
    activeMeasurementPoints,
  } = useVisualizationStore();

  const measureTools = [
    { id: "measure-distance" as const, label: "Distance", icon: <Ruler size={12} /> },
    { id: "measure-angle" as const, label: "Angle", icon: <Triangle size={12} /> },
    { id: "measure-area" as const, label: "Area", icon: <Square size={12} /> },
  ];

  const handleExport = () => {
    const data = measurements.map((m) => ({
      type: m.type,
      value: m.value,
      unit: m.unit,
      label: m.label || "",
      points: m.points.map((p) => `(${p[0].toFixed(3)}, ${p[1].toFixed(3)}, ${p[2].toFixed(3)})`),
    }));
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `measurements-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatValue = (m: Measurement3D) => {
    switch (m.type) {
      case "distance":
        return `${m.value.toFixed(3)} ${m.unit}`;
      case "angle":
        return `${m.value.toFixed(1)}°`;
      case "area":
        return `${m.value.toFixed(4)} ${m.unit}²`;
      default:
        return `${m.value.toFixed(3)}`;
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "distance": return <Ruler size={10} className="text-[#00D4FF]" />;
      case "angle": return <Triangle size={10} className="text-purple-400" />;
      case "area": return <Square size={10} className="text-green-400" />;
      default: return <Ruler size={10} />;
    }
  };

  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#21262d]">
        <Ruler size={13} className="text-[#00D4FF]" />
        <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
          Measurements
        </span>
        <span className="ml-auto text-[9px] text-slate-600">
          {measurements.length} items
        </span>
      </div>

      <div className="p-2 space-y-2">
        {/* Tool selection */}
        <div className="flex gap-1">
          {measureTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium transition-colors flex-1 justify-center ${
                activeTool === tool.id
                  ? "bg-[#00D4FF]/15 text-[#00D4FF]"
                  : "bg-[#161b22] text-slate-500 hover:text-slate-300"
              }`}
            >
              {tool.icon}
              {tool.label}
            </button>
          ))}
        </div>

        {/* Active measurement hint */}
        {activeMeasurementPoints.length > 0 && (
          <div className="px-2 py-1 bg-[#161b22] rounded text-[9px] text-slate-500">
            <span className="text-[#00D4FF] font-medium">
              {activeMeasurementPoints.length}
            </span>{" "}
            point(s) selected. Click to add more.
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1">
          <button
            onClick={handleExport}
            disabled={measurements.length === 0}
            className="flex items-center gap-1 px-2 py-0.5 bg-[#161b22] text-slate-400 rounded text-[9px] hover:text-slate-200 transition-colors disabled:opacity-30"
          >
            <Download size={9} />
            Export
          </button>
          <button
            onClick={clearMeasurements}
            disabled={measurements.length === 0}
            className="flex items-center gap-1 px-2 py-0.5 bg-[#161b22] text-slate-400 rounded text-[9px] hover:text-red-400 transition-colors disabled:opacity-30"
          >
            <Trash2 size={9} />
            Clear All
          </button>
        </div>

        {/* Measurement list */}
        <div className="max-h-[200px] overflow-y-auto thin-scrollbar space-y-0.5">
          {measurements.length === 0 ? (
            <div className="text-center py-3 text-slate-700">
              <Ruler size={18} className="mx-auto mb-1" />
              <div className="text-[9px]">No measurements yet</div>
              <div className="text-[8px] text-slate-800">
                Select a tool and click points in viewport
              </div>
            </div>
          ) : (
            measurements.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-[#161b22] rounded group"
              >
                {typeIcon(m.type)}
                <span className="text-[9px] text-slate-400 capitalize w-12">
                  {m.type}
                </span>
                <span className="text-[10px] text-slate-200 font-mono font-medium flex-1">
                  {formatValue(m)}
                </span>
                {m.label && (
                  <span className="text-[8px] text-slate-600 truncate max-w-[60px]">
                    {m.label}
                  </span>
                )}
                <button
                  onClick={() => removeMeasurement(m.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={9} className="text-slate-600 hover:text-red-400" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
