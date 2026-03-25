"use client";
import { useState, useCallback, useMemo } from "react";
import { useCadStore, type CadObject } from "@/stores/cad-store";
import { useLayerStore, type Layer } from "@/stores/layer-store";
import {
  Palette, Settings2, Eye, EyeOff, Lock, Unlock,
  ChevronDown, ChevronRight, X, Layers, Info,
  Pencil, Circle, Square, Minus, Spline,
} from "lucide-react";

const ENTITY_COLORS = [
  "#4a9eff", "#ff4444", "#22c55e", "#eab308", "#a855f7",
  "#ec4899", "#06b6d4", "#f97316", "#ffffff", "#888888",
  "#ff6b6b", "#51cf66", "#339af0", "#fcc419", "#845ef7",
];

const LINETYPES = ["solid", "dashed", "dotted", "dashdot", "center", "phantom"] as const;
const LINEWEIGHTS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5];

function getEntityIcon(type: string) {
  switch (type) {
    case "line": case "polyline": case "centerline": return <Pencil size={11} />;
    case "circle": case "arc": case "ellipse": return <Circle size={11} />;
    case "rectangle": return <Square size={11} />;
    case "spline": return <Spline size={11} />;
    default: return <Minus size={11} />;
  }
}

function getEntityTypeName(type: string): string {
  const names: Record<string, string> = {
    line: "Line", polyline: "Polyline", arc: "Arc", circle: "Circle",
    rectangle: "Rectangle", polygon: "Polygon", ellipse: "Ellipse",
    spline: "Spline", point: "Point", slot: "Slot", centerline: "Centerline",
    hatch: "Hatch", revision_cloud: "Rev Cloud", infinite_line: "Infinite Line",
    box: "Box", cylinder: "Cylinder", sphere: "Sphere", cone: "Cone", mesh: "Mesh",
  };
  return names[type] || type;
}

function getEntityGeometryInfo(obj: CadObject): { label: string; value: string }[] {
  const info: { label: string; value: string }[] = [];
  const fmt = (n: number) => n.toFixed(3);

  if (obj.type === "line" && obj.linePoints && obj.linePoints.length >= 2) {
    const [p1, p2] = obj.linePoints;
    const len = Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2 + (p2[2] - p1[2]) ** 2);
    info.push(
      { label: "Start", value: `(${fmt(p1[0])}, ${fmt(p1[2])})` },
      { label: "End", value: `(${fmt(p2[0])}, ${fmt(p2[2])})` },
      { label: "Length", value: fmt(len) },
      { label: "Angle", value: `${(Math.atan2(p2[2] - p1[2], p2[0] - p1[0]) * 180 / Math.PI).toFixed(1)}°` }
    );
  }

  if (obj.type === "polyline" && obj.polylinePoints) {
    info.push(
      { label: "Vertices", value: `${obj.polylinePoints.length}` },
      { label: "Closed", value: obj.polylineClosed ? "Yes" : "No" }
    );
    let totalLen = 0;
    for (let i = 0; i < obj.polylinePoints.length - 1; i++) {
      const [a, b] = [obj.polylinePoints[i], obj.polylinePoints[i + 1]];
      totalLen += Math.sqrt((b[0] - a[0]) ** 2 + (b[2] - a[2]) ** 2);
    }
    info.push({ label: "Length", value: fmt(totalLen) });
  }

  if (obj.type === "circle" && obj.circleCenter && obj.circleRadius) {
    info.push(
      { label: "Center", value: `(${fmt(obj.circleCenter[0])}, ${fmt(obj.circleCenter[2])})` },
      { label: "Radius", value: fmt(obj.circleRadius) },
      { label: "Diameter", value: fmt(obj.circleRadius * 2) },
      { label: "Circumference", value: fmt(2 * Math.PI * obj.circleRadius) },
      { label: "Area", value: fmt(Math.PI * obj.circleRadius ** 2) }
    );
  }

  if (obj.type === "ellipse" && obj.ellipseCenter && obj.ellipseRx && obj.ellipseRy) {
    info.push(
      { label: "Center", value: `(${fmt(obj.ellipseCenter[0])}, ${fmt(obj.ellipseCenter[2])})` },
      { label: "Semi-Major (Rx)", value: fmt(obj.ellipseRx) },
      { label: "Semi-Minor (Ry)", value: fmt(obj.ellipseRy) },
      { label: "Area", value: fmt(Math.PI * obj.ellipseRx * obj.ellipseRy) }
    );
  }

  if (obj.type === "rectangle" && obj.rectCorners) {
    const [c1, c2] = obj.rectCorners;
    const w = Math.abs(c2[0] - c1[0]);
    const h = Math.abs(c2[2] - c1[2]);
    info.push(
      { label: "Corner 1", value: `(${fmt(c1[0])}, ${fmt(c1[2])})` },
      { label: "Corner 2", value: `(${fmt(c2[0])}, ${fmt(c2[2])})` },
      { label: "Width", value: fmt(w) },
      { label: "Height", value: fmt(h) },
      { label: "Area", value: fmt(w * h) },
      { label: "Perimeter", value: fmt(2 * (w + h)) }
    );
  }

  if (obj.type === "arc" && obj.arcPoints && obj.arcRadius) {
    info.push(
      { label: "Radius", value: fmt(obj.arcRadius) }
    );
    if (obj.arcPoints.length >= 3) {
      info.push(
        { label: "Start", value: `(${fmt(obj.arcPoints[0][0])}, ${fmt(obj.arcPoints[0][2])})` },
        { label: "Center", value: `(${fmt(obj.arcPoints[1][0])}, ${fmt(obj.arcPoints[1][2])})` },
        { label: "End", value: `(${fmt(obj.arcPoints[2][0])}, ${fmt(obj.arcPoints[2][2])})` }
      );
    }
  }

  if (obj.type === "polygon" && obj.polygonPoints) {
    info.push(
      { label: "Sides", value: `${obj.polygonSides || obj.polygonPoints.length}` },
      { label: "Vertices", value: `${obj.polygonPoints.length}` }
    );
  }

  if (obj.type === "hatch") {
    info.push(
      { label: "Pattern", value: obj.hatchPattern || "solid" },
      { label: "Scale", value: fmt(obj.hatchScale || 1) },
      { label: "Angle", value: `${(obj.hatchAngle || 0).toFixed(1)}°` }
    );
  }

  if (obj.type === "point" && obj.pointPosition) {
    info.push({ label: "Position", value: `(${fmt(obj.pointPosition[0])}, ${fmt(obj.pointPosition[2])})` });
  }

  return info;
}

interface EntityPropertiesPanelProps {
  onClose: () => void;
}

export default function EntityPropertiesPanel({ onClose }: EntityPropertiesPanelProps) {
  const selectedId = useCadStore((s) => s.selectedId);
  const selectedIds = useCadStore((s) => s.selectedIds);
  const objects = useCadStore((s) => s.objects);
  const updateObject = useCadStore((s) => s.updateObject);
  const pushHistory = useCadStore((s) => s.pushHistory);
  const unit = useCadStore((s) => s.unit);

  const layers = useLayerStore((s) => s.layers);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [geometryExpanded, setGeometryExpanded] = useState(true);
  const [styleExpanded, setStyleExpanded] = useState(true);
  const [layerExpanded, setLayerExpanded] = useState(true);

  const selected = useMemo(
    () => objects.find((o) => o.id === selectedId),
    [objects, selectedId]
  );

  const handleColorChange = useCallback((color: string) => {
    if (!selectedId) return;
    pushHistory();
    updateObject(selectedId, { color });
  }, [selectedId, pushHistory, updateObject]);

  const handleOpacityChange = useCallback((opacity: number) => {
    if (!selectedId) return;
    pushHistory();
    updateObject(selectedId, { opacity });
  }, [selectedId, pushHistory, updateObject]);

  const handleLayerChange = useCallback((layerId: string) => {
    if (!selectedId) return;
    pushHistory();
    updateObject(selectedId, { layerId });
  }, [selectedId, pushHistory, updateObject]);

  const handleVisibilityToggle = useCallback(() => {
    if (!selectedId || !selected) return;
    pushHistory();
    updateObject(selectedId, { visible: !selected.visible });
  }, [selectedId, selected, pushHistory, updateObject]);

  const handleLockToggle = useCallback(() => {
    if (!selectedId || !selected) return;
    pushHistory();
    updateObject(selectedId, { locked: !selected.locked });
  }, [selectedId, selected, pushHistory, updateObject]);

  if (!selected) {
    return (
      <div className="flex flex-col bg-[#0d1117] border border-[#21262d] rounded-lg shadow-2xl shadow-black/40 w-64 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d] bg-[#161b22]">
          <div className="flex items-center gap-2">
            <Settings2 size={13} className="text-[#00D4FF]" />
            <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Properties</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#21262d] text-slate-500 hover:text-white transition-colors">
            <X size={12} />
          </button>
        </div>
        <div className="p-4 text-center text-[10px] text-slate-600">
          Select an entity to view properties
        </div>
      </div>
    );
  }

  const geometryInfo = getEntityGeometryInfo(selected);
  const assignedLayer = layers.find((l) => l.id === selected.layerId) || layers[0];

  return (
    <div className="flex flex-col bg-[#0d1117] border border-[#21262d] rounded-lg shadow-2xl shadow-black/40 w-64 max-h-[600px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d] bg-[#161b22]">
        <div className="flex items-center gap-2">
          <Settings2 size={13} className="text-[#00D4FF]" />
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Properties</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[#21262d] text-slate-500 hover:text-white transition-colors">
          <X size={12} />
        </button>
      </div>

      {/* Entity header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#161b22]/50 border-b border-[#21262d]/50">
        <span className="text-[#00D4FF]">{getEntityIcon(selected.type)}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-white font-medium truncate">{selected.name}</div>
          <div className="text-[8px] text-slate-500">{getEntityTypeName(selected.type)} · {selected.id.slice(0, 12)}</div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleVisibilityToggle} className="p-0.5 rounded hover:bg-[#21262d] transition-colors">
            {selected.visible ? <Eye size={10} className="text-slate-400" /> : <EyeOff size={10} className="text-red-400/60" />}
          </button>
          <button onClick={handleLockToggle} className="p-0.5 rounded hover:bg-[#21262d] transition-colors">
            {selected.locked ? <Lock size={10} className="text-yellow-500/70" /> : <Unlock size={10} className="text-slate-600" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Style section */}
        <div className="border-b border-[#21262d]/50">
          <button
            onClick={() => setStyleExpanded(!styleExpanded)}
            className="flex items-center gap-1.5 w-full px-3 py-1.5 text-[9px] text-slate-500 uppercase tracking-wider font-semibold hover:bg-[#161b22] transition-colors"
          >
            {styleExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            <Palette size={10} />
            Style
          </button>
          {styleExpanded && (
            <div className="px-3 pb-2 space-y-2">
              {/* Color */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 w-14">Color</span>
                <button
                  className="w-5 h-5 rounded border border-[#21262d] hover:border-white/30 transition-colors"
                  style={{ backgroundColor: selected.color }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                />
                <span className="text-[9px] text-slate-400 font-mono">{selected.color}</span>
              </div>
              {showColorPicker && (
                <div className="flex flex-wrap gap-1 ml-16">
                  {ENTITY_COLORS.map((c) => (
                    <button
                      key={c}
                      className={`w-4 h-4 rounded-sm border transition-all ${
                        selected.color === c ? "border-white scale-110" : "border-[#21262d] hover:border-slate-400"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => { handleColorChange(c); setShowColorPicker(false); }}
                    />
                  ))}
                </div>
              )}

              {/* Opacity */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 w-14">Opacity</span>
                <input
                  type="range"
                  min={0} max={1} step={0.05}
                  value={selected.opacity}
                  onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                  className="flex-1 h-1 accent-[#00D4FF] bg-[#16213e] rounded-full appearance-none cursor-pointer"
                />
                <span className="text-[9px] text-slate-400 font-mono w-8 text-right">
                  {Math.round(selected.opacity * 100)}%
                </span>
              </div>

              {/* Construction mode indicator */}
              {selected.isConstruction && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-orange-500/10 border border-orange-500/20">
                  <Info size={9} className="text-orange-400" />
                  <span className="text-[9px] text-orange-400">Construction geometry</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Layer section */}
        <div className="border-b border-[#21262d]/50">
          <button
            onClick={() => setLayerExpanded(!layerExpanded)}
            className="flex items-center gap-1.5 w-full px-3 py-1.5 text-[9px] text-slate-500 uppercase tracking-wider font-semibold hover:bg-[#161b22] transition-colors"
          >
            {layerExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            <Layers size={10} />
            Layer
          </button>
          {layerExpanded && (
            <div className="px-3 pb-2">
              <select
                className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-[10px] text-slate-300 outline-none"
                value={selected.layerId || layers[0]?.id || ""}
                onChange={(e) => handleLayerChange(e.target.value)}
              >
                {layers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.color})
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div
                  className="w-3 h-3 rounded-sm border border-[#21262d]"
                  style={{ backgroundColor: assignedLayer.color }}
                />
                <span className="text-[9px] text-slate-500">
                  {assignedLayer.linetype} · {assignedLayer.lineweight}px
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Geometry section */}
        <div className="border-b border-[#21262d]/50">
          <button
            onClick={() => setGeometryExpanded(!geometryExpanded)}
            className="flex items-center gap-1.5 w-full px-3 py-1.5 text-[9px] text-slate-500 uppercase tracking-wider font-semibold hover:bg-[#161b22] transition-colors"
          >
            {geometryExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            <Info size={10} />
            Geometry
          </button>
          {geometryExpanded && (
            <div className="px-3 pb-2 space-y-1">
              {geometryInfo.length === 0 ? (
                <div className="text-[9px] text-slate-600 italic">No geometry data</div>
              ) : (
                geometryInfo.map((info, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-500">{info.label}</span>
                    <span className="text-[9px] text-white font-mono">{info.value}</span>
                  </div>
                ))
              )}
              {/* Unit indicator */}
              <div className="text-[8px] text-slate-600 mt-1 text-right">Units: {unit}</div>
            </div>
          )}
        </div>

        {/* Sketch info */}
        {selected.sketchPlane && (
          <div className="px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-slate-500">Sketch Plane</span>
              <span className="text-[9px] text-[#00D4FF] font-mono">{selected.sketchPlane.toUpperCase()}</span>
            </div>
            {selected.sketchId && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] text-slate-500">Sketch ID</span>
                <span className="text-[9px] text-slate-400 font-mono">{selected.sketchId.slice(0, 12)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-[#21262d] bg-[#161b22] flex items-center justify-between">
        <span className="text-[8px] text-slate-600">
          {selectedIds.length > 1 ? `${selectedIds.length} selected` : getEntityTypeName(selected.type)}
        </span>
        <span className="text-[8px] text-slate-600 font-mono">
          ({selected.position[0].toFixed(1)}, {selected.position[2].toFixed(1)})
        </span>
      </div>
    </div>
  );
}
