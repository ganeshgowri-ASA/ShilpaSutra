"use client";
import { useState, useCallback } from "react";
import { useLayerStore, type Layer } from "@/stores/layer-store";
import {
  Layers, Plus, Trash2, Eye, EyeOff, Lock, Unlock,
  Snowflake, ChevronDown, ChevronRight, Palette, GripVertical,
} from "lucide-react";

const PRESET_COLORS = [
  "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00",
  "#ff00ff", "#00ffff", "#ff8800", "#88ff00", "#8800ff",
  "#ff0088", "#0088ff", "#888888", "#cc4444", "#44cc44",
  "#4444cc",
];

const LINETYPES: Layer["linetype"][] = [
  "solid", "dashed", "dotted", "dashdot", "center", "phantom",
];

const LINEWEIGHTS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3];

interface LayerPanelProps {
  onClose?: () => void;
}

export default function LayerPanel({ onClose }: LayerPanelProps) {
  const layers = useLayerStore((s) => s.layers);
  const activeLayerId = useLayerStore((s) => s.activeLayerId);
  const addLayer = useLayerStore((s) => s.addLayer);
  const deleteLayer = useLayerStore((s) => s.deleteLayer);
  const renameLayer = useLayerStore((s) => s.renameLayer);
  const setLayerColor = useLayerStore((s) => s.setLayerColor);
  const toggleVisibility = useLayerStore((s) => s.toggleVisibility);
  const toggleLock = useLayerStore((s) => s.toggleLock);
  const toggleFreeze = useLayerStore((s) => s.toggleFreeze);
  const setLineweight = useLayerStore((s) => s.setLineweight);
  const setLinetype = useLayerStore((s) => s.setLinetype);
  const setActiveLayer = useLayerStore((s) => s.setActiveLayer);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const handleAddLayer = useCallback(() => {
    addLayer();
  }, [addLayer]);

  const handleDeleteLayer = useCallback(
    (id: string) => {
      deleteLayer(id);
    },
    [deleteLayer]
  );

  const startRename = useCallback((layer: Layer) => {
    setEditingId(layer.id);
    setEditName(layer.name);
  }, []);

  const commitRename = useCallback(() => {
    if (editingId && editName.trim()) {
      renameLayer(editingId, editName.trim());
    }
    setEditingId(null);
  }, [editingId, editName, renameLayer]);

  return (
    <div className="flex flex-col bg-[#0d1117] border border-[#21262d] rounded-lg shadow-2xl shadow-black/40 w-72 max-h-[500px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d] bg-[#161b22]">
        <div className="flex items-center gap-2">
          <Layers size={13} className="text-[#00D4FF]" />
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Layers
          </span>
          <span className="text-[9px] text-slate-600 bg-[#21262d] px-1.5 py-0.5 rounded-full">
            {layers.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleAddLayer}
            className="p-1 rounded hover:bg-[#21262d] text-slate-400 hover:text-emerald-400 transition-colors"
            title="Add Layer"
          >
            <Plus size={13} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[#21262d] text-slate-500 hover:text-white transition-colors"
            >
              <ChevronDown size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-3 py-1 border-b border-[#21262d]/50 text-[8px] text-slate-600 uppercase tracking-wider font-semibold">
        <span className="w-4" />
        <span className="w-4 text-center" title="Visible">V</span>
        <span className="w-4 text-center ml-1" title="Lock">L</span>
        <span className="w-4 text-center ml-1" title="Freeze">F</span>
        <span className="w-3 ml-1" />
        <span className="flex-1 ml-1.5">Name</span>
        <span className="w-10 text-center">Wt</span>
        <span className="w-6" />
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {layers.map((layer) => {
          const isActive = layer.id === activeLayerId;
          const isExpanded = expandedId === layer.id;

          return (
            <div key={layer.id}>
              {/* Layer row */}
              <div
                className={`flex items-center px-2 py-1.5 cursor-pointer border-l-2 transition-all duration-100 group ${
                  isActive
                    ? "bg-[#00D4FF]/8 border-l-[#00D4FF] text-white"
                    : "border-l-transparent text-slate-400 hover:bg-[#161b22] hover:text-slate-200"
                } ${layer.frozen ? "opacity-40" : ""}`}
                onClick={() => setActiveLayer(layer.id)}
                onDoubleClick={() => startRename(layer)}
              >
                {/* Expand toggle */}
                <button
                  className="w-4 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedId(isExpanded ? null : layer.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown size={10} className="text-slate-500" />
                  ) : (
                    <ChevronRight size={10} className="text-slate-600" />
                  )}
                </button>

                {/* Visibility */}
                <button
                  className="w-4 flex-shrink-0 flex justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVisibility(layer.id);
                  }}
                  title={layer.visible ? "Hide layer" : "Show layer"}
                >
                  {layer.visible ? (
                    <Eye size={11} className="text-slate-400 group-hover:text-white" />
                  ) : (
                    <EyeOff size={11} className="text-red-400/60" />
                  )}
                </button>

                {/* Lock */}
                <button
                  className="w-4 flex-shrink-0 flex justify-center ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLock(layer.id);
                  }}
                  title={layer.locked ? "Unlock layer" : "Lock layer"}
                >
                  {layer.locked ? (
                    <Lock size={10} className="text-yellow-500/70" />
                  ) : (
                    <Unlock size={10} className="text-slate-600 group-hover:text-slate-400" />
                  )}
                </button>

                {/* Freeze */}
                <button
                  className="w-4 flex-shrink-0 flex justify-center ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFreeze(layer.id);
                  }}
                  title={layer.frozen ? "Thaw layer" : "Freeze layer"}
                >
                  <Snowflake
                    size={10}
                    className={layer.frozen ? "text-cyan-400/70" : "text-slate-700 group-hover:text-slate-500"}
                  />
                </button>

                {/* Color swatch */}
                <button
                  className="w-3 h-3 rounded-sm flex-shrink-0 ml-1 border border-[#21262d] hover:border-white/30 transition-colors"
                  style={{ backgroundColor: layer.color }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setColorPickerFor(colorPickerFor === layer.id ? null : layer.id);
                  }}
                  title="Change color"
                />

                {/* Name */}
                <div className="flex-1 ml-1.5 min-w-0">
                  {editingId === layer.id ? (
                    <input
                      className="w-full bg-[#0d1117] border border-[#00D4FF]/40 rounded px-1 py-0.5 text-[10px] text-white outline-none"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-[10px] truncate block font-medium">
                      {layer.name}
                      {isActive && (
                        <span className="text-[8px] text-[#00D4FF]/60 ml-1">active</span>
                      )}
                    </span>
                  )}
                </div>

                {/* Lineweight indicator */}
                <span className="w-10 text-center text-[9px] text-slate-600 font-mono">
                  {layer.lineweight}px
                </span>

                {/* Delete button */}
                <button
                  className="w-6 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteLayer(layer.id);
                  }}
                  title="Delete layer"
                >
                  <Trash2 size={10} className="text-red-400/60 hover:text-red-400" />
                </button>
              </div>

              {/* Color picker dropdown */}
              {colorPickerFor === layer.id && (
                <div className="px-3 py-2 bg-[#161b22] border-t border-b border-[#21262d]/50">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        className={`w-4 h-4 rounded-sm border transition-all ${
                          layer.color === color
                            ? "border-white scale-110"
                            : "border-[#21262d] hover:border-slate-400"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          setLayerColor(layer.id, color);
                          setColorPickerFor(null);
                        }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={layer.color}
                    onChange={(e) => setLayerColor(layer.id, e.target.value)}
                    className="w-full h-5 cursor-pointer rounded bg-transparent"
                  />
                </div>
              )}

              {/* Expanded properties */}
              {isExpanded && (
                <div className="px-4 py-2 bg-[#161b22]/60 border-b border-[#21262d]/30 space-y-2">
                  {/* Linetype */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500 w-14">Linetype</span>
                    <select
                      className="flex-1 bg-[#0d1117] border border-[#21262d] rounded px-1.5 py-0.5 text-[9px] text-slate-300 outline-none"
                      value={layer.linetype}
                      onChange={(e) =>
                        setLinetype(layer.id, e.target.value as Layer["linetype"])
                      }
                    >
                      {LINETYPES.map((lt) => (
                        <option key={lt} value={lt}>
                          {lt.charAt(0).toUpperCase() + lt.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Lineweight */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500 w-14">Weight</span>
                    <select
                      className="flex-1 bg-[#0d1117] border border-[#21262d] rounded px-1.5 py-0.5 text-[9px] text-slate-300 outline-none"
                      value={layer.lineweight}
                      onChange={(e) =>
                        setLineweight(layer.id, parseFloat(e.target.value))
                      }
                    >
                      {LINEWEIGHTS.map((w) => (
                        <option key={w} value={w}>
                          {w}px
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Linetype preview */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500 w-14">Preview</span>
                    <svg width="100" height="8" className="flex-1">
                      <line
                        x1={0}
                        y1={4}
                        x2={100}
                        y2={4}
                        stroke={layer.color}
                        strokeWidth={layer.lineweight}
                        strokeDasharray={
                          layer.linetype === "dashed" ? "8 4" :
                          layer.linetype === "dotted" ? "2 3" :
                          layer.linetype === "dashdot" ? "8 3 2 3" :
                          layer.linetype === "center" ? "12 3 4 3" :
                          layer.linetype === "phantom" ? "12 3 4 3 4 3" :
                          "none"
                        }
                      />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer - active layer summary */}
      <div className="px-3 py-1.5 border-t border-[#21262d] bg-[#161b22] flex items-center gap-2">
        <div
          className="w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: layers.find((l) => l.id === activeLayerId)?.color || "#fff" }}
        />
        <span className="text-[9px] text-slate-400">
          Active: <span className="text-white font-medium">{layers.find((l) => l.id === activeLayerId)?.name || "0"}</span>
        </span>
      </div>
    </div>
  );
}
