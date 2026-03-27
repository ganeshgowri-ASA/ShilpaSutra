"use client";

import { useState } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Download,
  Palette,
} from "lucide-react";
import {
  useVisualizationStore,
  type Annotation3D,
} from "@/stores/visualization-store";

const ANNOTATION_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#a855f7", "#ec4899", "#ffffff",
];

export default function AnnotationsPanel() {
  const {
    annotations,
    activeTool,
    setActiveTool,
    addAnnotation,
    removeAnnotation,
    updateAnnotation,
    clearAnnotations,
    cameraTarget,
  } = useVisualizationStore();

  const [newText, setNewText] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3b82f6");

  const handleAddAnnotation = () => {
    if (!newText.trim()) return;
    const annotation: Annotation3D = {
      id: `ann-${Date.now()}`,
      text: newText.trim(),
      position: [cameraTarget[0], cameraTarget[1] + 1, cameraTarget[2]],
      anchorPoint: [...cameraTarget],
      color: selectedColor,
      visible: true,
      createdAt: Date.now(),
    };
    addAnnotation(annotation);
    setNewText("");
  };

  const handleExport = () => {
    const data = annotations.map((a) => ({
      text: a.text,
      position: a.position,
      anchor: a.anchorPoint,
      color: a.color,
      date: new Date(a.createdAt).toISOString(),
    }));
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `annotations-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#21262d]">
        <MessageSquare size={13} className="text-[#00D4FF]" />
        <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
          Annotations
        </span>
        <span className="ml-auto text-[9px] text-slate-600">
          {annotations.length} notes
        </span>
      </div>

      <div className="p-2 space-y-2">
        {/* Activate annotation mode */}
        <button
          onClick={() => setActiveTool(activeTool === "annotate" ? "orbit" : "annotate")}
          className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-medium transition-colors ${
            activeTool === "annotate"
              ? "bg-[#00D4FF]/15 text-[#00D4FF]"
              : "bg-[#161b22] text-slate-400 hover:text-slate-200"
          }`}
        >
          <MessageSquare size={11} />
          {activeTool === "annotate" ? "Click in viewport to place" : "Add Annotation Mode"}
        </button>

        {/* Quick-add annotation */}
        <div className="space-y-1">
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Annotation text..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddAnnotation()}
              className="flex-1 bg-[#161b22] border border-[#21262d] rounded text-[9px] text-slate-300 px-2 py-1 placeholder-slate-700 focus:outline-none focus:border-[#00D4FF]/30"
            />
            <button
              onClick={handleAddAnnotation}
              disabled={!newText.trim()}
              className="px-2 py-1 bg-[#00D4FF]/10 text-[#00D4FF] rounded text-[9px] hover:bg-[#00D4FF]/20 transition-colors disabled:opacity-30"
            >
              <Plus size={10} />
            </button>
          </div>

          {/* Color picker */}
          <div className="flex items-center gap-1 px-1">
            <Palette size={10} className="text-slate-600" />
            {ANNOTATION_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  selectedColor === color
                    ? "border-white scale-110"
                    : "border-transparent hover:border-slate-500"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <button
            onClick={handleExport}
            disabled={annotations.length === 0}
            className="flex items-center gap-1 px-2 py-0.5 bg-[#161b22] text-slate-400 rounded text-[9px] hover:text-slate-200 transition-colors disabled:opacity-30"
          >
            <Download size={9} />
            Export
          </button>
          <button
            onClick={clearAnnotations}
            disabled={annotations.length === 0}
            className="flex items-center gap-1 px-2 py-0.5 bg-[#161b22] text-slate-400 rounded text-[9px] hover:text-red-400 transition-colors disabled:opacity-30"
          >
            <Trash2 size={9} />
            Clear All
          </button>
        </div>

        {/* Annotations list */}
        <div className="max-h-[200px] overflow-y-auto thin-scrollbar space-y-0.5">
          {annotations.length === 0 ? (
            <div className="text-center py-3 text-slate-700">
              <MessageSquare size={18} className="mx-auto mb-1" />
              <div className="text-[9px]">No annotations yet</div>
            </div>
          ) : (
            annotations.map((ann) => (
              <div
                key={ann.id}
                className="flex items-start gap-1.5 px-2 py-1 bg-[#161b22] rounded group"
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0 mt-1"
                  style={{ backgroundColor: ann.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] text-slate-300 break-words">
                    {ann.text}
                  </div>
                  <div className="text-[8px] text-slate-700 font-mono">
                    ({ann.anchorPoint.map((v) => v.toFixed(1)).join(", ")})
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() =>
                      updateAnnotation(ann.id, { visible: !ann.visible })
                    }
                  >
                    {ann.visible ? (
                      <Eye size={9} className="text-slate-500" />
                    ) : (
                      <EyeOff size={9} className="text-slate-700" />
                    )}
                  </button>
                  <button onClick={() => removeAnnotation(ann.id)}>
                    <Trash2 size={9} className="text-slate-600 hover:text-red-400" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
