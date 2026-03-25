"use client";
import { useState, useCallback, useMemo } from "react";
import { useCadStore, type CadObject } from "@/stores/cad-store";
import {
  RulerIcon, CircleDot, Triangle, ArrowUpDown,
  Wand2, Settings2, X,
} from "lucide-react";

export type DimensionType =
  | "linear"
  | "angular"
  | "radial"
  | "diametric"
  | "ordinate_x"
  | "ordinate_y"
  | "arc_length"
  | "auto";

export interface DimensionAnnotation {
  id: string;
  type: DimensionType;
  objectIds: string[];
  value: number;
  formattedValue: string;
  unit: string;
  position: [number, number, number]; // display position
  textAngle: number;
  isDriving: boolean;
  tolerance?: { plus: number; minus: number };
  prefix?: string;
  suffix?: string;
}

export type DimensionStyle = {
  arrowSize: number;
  textHeight: number;
  extensionLineGap: number;
  extensionLineOvershoot: number;
  lineColor: string;
  textColor: string;
  precision: number;
};

const DEFAULT_STYLE: DimensionStyle = {
  arrowSize: 0.1,
  textHeight: 0.15,
  extensionLineGap: 0.05,
  extensionLineOvershoot: 0.1,
  lineColor: "#00D4FF",
  textColor: "#ffffff",
  precision: 2,
};

// ── Geometry helpers ──

function vec2Angle(dx: number, dy: number): number {
  return Math.atan2(dy, dx);
}

function angleBetweenLines(
  l1Start: [number, number],
  l1End: [number, number],
  l2Start: [number, number],
  l2End: [number, number]
): number {
  const a1 = vec2Angle(l1End[0] - l1Start[0], l1End[1] - l1Start[1]);
  const a2 = vec2Angle(l2End[0] - l2Start[0], l2End[1] - l2Start[1]);
  let angle = Math.abs(a2 - a1);
  if (angle > Math.PI) angle = 2 * Math.PI - angle;
  return angle;
}

function dist2D(a: [number, number], b: [number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

// ── Auto-dimension: analyze an object and generate all meaningful dimensions ──

function autoDimension(obj: CadObject, unit: string, precision: number): DimensionAnnotation[] {
  const dims: DimensionAnnotation[] = [];
  const fmt = (v: number) => v.toFixed(precision);
  const Y = 0.02;

  if (obj.type === "line" && obj.linePoints && obj.linePoints.length >= 2) {
    const [p1, p2] = obj.linePoints;
    const len = Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[2] - p1[2]) ** 2);
    const midX = (p1[0] + p2[0]) / 2;
    const midZ = (p1[2] + p2[2]) / 2;
    dims.push({
      id: `dim_${obj.id}_len`,
      type: "linear",
      objectIds: [obj.id],
      value: len,
      formattedValue: `${fmt(len)} ${unit}`,
      unit,
      position: [midX, Y + 0.15, midZ],
      textAngle: Math.atan2(p2[2] - p1[2], p2[0] - p1[0]),
      isDriving: true,
    });
    // Horizontal component
    const dx = Math.abs(p2[0] - p1[0]);
    if (dx > 0.01) {
      dims.push({
        id: `dim_${obj.id}_dx`,
        type: "ordinate_x",
        objectIds: [obj.id],
        value: dx,
        formattedValue: `dX: ${fmt(dx)} ${unit}`,
        unit,
        position: [midX, Y + 0.3, p1[2] - 0.2],
        textAngle: 0,
        isDriving: false,
      });
    }
    // Vertical component
    const dz = Math.abs(p2[2] - p1[2]);
    if (dz > 0.01) {
      dims.push({
        id: `dim_${obj.id}_dz`,
        type: "ordinate_y",
        objectIds: [obj.id],
        value: dz,
        formattedValue: `dY: ${fmt(dz)} ${unit}`,
        unit,
        position: [p1[0] - 0.2, Y + 0.15, midZ],
        textAngle: Math.PI / 2,
        isDriving: false,
      });
    }
    // Angle from horizontal
    const angle = Math.atan2(p2[2] - p1[2], p2[0] - p1[0]) * 180 / Math.PI;
    if (Math.abs(angle) > 0.5 && Math.abs(Math.abs(angle) - 90) > 0.5) {
      dims.push({
        id: `dim_${obj.id}_angle`,
        type: "angular",
        objectIds: [obj.id],
        value: angle,
        formattedValue: `${fmt(Math.abs(angle))}°`,
        unit: "°",
        position: [p1[0] + 0.3, Y + 0.15, p1[2] + 0.3],
        textAngle: 0,
        isDriving: false,
      });
    }
  }

  if (obj.type === "circle" && obj.circleCenter && obj.circleRadius) {
    const c = obj.circleCenter;
    dims.push({
      id: `dim_${obj.id}_radius`,
      type: "radial",
      objectIds: [obj.id],
      value: obj.circleRadius,
      formattedValue: `R${fmt(obj.circleRadius)} ${unit}`,
      unit,
      position: [c[0] + obj.circleRadius * 0.7, Y + 0.1, c[2] + obj.circleRadius * 0.7],
      textAngle: Math.PI / 4,
      isDriving: true,
    });
    dims.push({
      id: `dim_${obj.id}_diameter`,
      type: "diametric",
      objectIds: [obj.id],
      value: obj.circleRadius * 2,
      formattedValue: `⌀${fmt(obj.circleRadius * 2)} ${unit}`,
      unit,
      position: [c[0], Y + 0.1, c[2] - obj.circleRadius - 0.2],
      textAngle: 0,
      isDriving: true,
    });
  }

  if (obj.type === "ellipse" && obj.ellipseCenter && obj.ellipseRx && obj.ellipseRy) {
    const c = obj.ellipseCenter;
    dims.push({
      id: `dim_${obj.id}_rx`,
      type: "radial",
      objectIds: [obj.id],
      value: obj.ellipseRx,
      formattedValue: `Rx: ${fmt(obj.ellipseRx)} ${unit}`,
      unit,
      position: [c[0] + obj.ellipseRx + 0.1, Y + 0.1, c[2]],
      textAngle: 0,
      isDriving: true,
    });
    dims.push({
      id: `dim_${obj.id}_ry`,
      type: "radial",
      objectIds: [obj.id],
      value: obj.ellipseRy,
      formattedValue: `Ry: ${fmt(obj.ellipseRy)} ${unit}`,
      unit,
      position: [c[0], Y + 0.1, c[2] + obj.ellipseRy + 0.1],
      textAngle: Math.PI / 2,
      isDriving: true,
    });
  }

  if (obj.type === "rectangle" && obj.rectCorners) {
    const [c1, c2] = obj.rectCorners;
    const w = Math.abs(c2[0] - c1[0]);
    const h = Math.abs(c2[2] - c1[2]);
    dims.push({
      id: `dim_${obj.id}_w`,
      type: "linear",
      objectIds: [obj.id],
      value: w,
      formattedValue: `${fmt(w)} ${unit}`,
      unit,
      position: [(c1[0] + c2[0]) / 2, Y + 0.1, Math.min(c1[2], c2[2]) - 0.2],
      textAngle: 0,
      isDriving: true,
    });
    dims.push({
      id: `dim_${obj.id}_h`,
      type: "linear",
      objectIds: [obj.id],
      value: h,
      formattedValue: `${fmt(h)} ${unit}`,
      unit,
      position: [Math.max(c1[0], c2[0]) + 0.2, Y + 0.1, (c1[2] + c2[2]) / 2],
      textAngle: Math.PI / 2,
      isDriving: true,
    });
  }

  if (obj.type === "arc" && obj.arcRadius) {
    const r = obj.arcRadius;
    dims.push({
      id: `dim_${obj.id}_arcr`,
      type: "radial",
      objectIds: [obj.id],
      value: r,
      formattedValue: `R${fmt(r)} ${unit}`,
      unit,
      position: obj.arcPoints?.[1] || [0, Y, 0],
      textAngle: 0,
      isDriving: true,
    });
    if (obj.arcPoints && obj.arcPoints.length >= 3) {
      const [s, , e] = obj.arcPoints;
      const arcLen = r * Math.acos(
        Math.max(-1, Math.min(1, ((s[0] - (obj.arcPoints[1]?.[0] || 0)) * (e[0] - (obj.arcPoints[1]?.[0] || 0)) +
        (s[2] - (obj.arcPoints[1]?.[2] || 0)) * (e[2] - (obj.arcPoints[1]?.[2] || 0))) / (r * r)))
      );
      if (!isNaN(arcLen) && arcLen > 0) {
        dims.push({
          id: `dim_${obj.id}_arclen`,
          type: "arc_length",
          objectIds: [obj.id],
          value: arcLen,
          formattedValue: `⌒${fmt(arcLen)} ${unit}`,
          unit,
          position: [(s[0] + e[0]) / 2, Y + 0.2, (s[2] + e[2]) / 2],
          textAngle: 0,
          isDriving: false,
        });
      }
    }
  }

  return dims;
}

// ── Angular dimension between two lines ──

function angularDimension(
  obj1: CadObject,
  obj2: CadObject,
  unit: string,
  precision: number
): DimensionAnnotation | null {
  if (obj1.type !== "line" || obj2.type !== "line") return null;
  if (!obj1.linePoints || !obj2.linePoints) return null;
  if (obj1.linePoints.length < 2 || obj2.linePoints.length < 2) return null;

  const l1s: [number, number] = [obj1.linePoints[0][0], obj1.linePoints[0][2]];
  const l1e: [number, number] = [obj1.linePoints[1][0], obj1.linePoints[1][2]];
  const l2s: [number, number] = [obj2.linePoints[0][0], obj2.linePoints[0][2]];
  const l2e: [number, number] = [obj2.linePoints[1][0], obj2.linePoints[1][2]];

  const angle = angleBetweenLines(l1s, l1e, l2s, l2e);
  const angleDeg = angle * 180 / Math.PI;

  const midX = (l1s[0] + l1e[0] + l2s[0] + l2e[0]) / 4;
  const midZ = (l1s[1] + l1e[1] + l2s[1] + l2e[1]) / 4;

  return {
    id: `dim_angular_${obj1.id}_${obj2.id}`,
    type: "angular",
    objectIds: [obj1.id, obj2.id],
    value: angleDeg,
    formattedValue: `${angleDeg.toFixed(precision)}°`,
    unit: "°",
    position: [midX, 0.02, midZ],
    textAngle: 0,
    isDriving: false,
  };
}

// ── Dimension Panel Component ──

interface DimensionToolsProps {
  onClose: () => void;
}

export default function DimensionTools({ onClose }: DimensionToolsProps) {
  const selectedId = useCadStore((s) => s.selectedId);
  const selectedIds = useCadStore((s) => s.selectedIds);
  const objects = useCadStore((s) => s.objects);
  const unit = useCadStore((s) => s.unit);

  const [activeDimType, setActiveDimType] = useState<DimensionType>("auto");
  const [style, setStyle] = useState<DimensionStyle>(DEFAULT_STYLE);
  const [showStyleEditor, setShowStyleEditor] = useState(false);
  const [dimensions, setDimensions] = useState<DimensionAnnotation[]>([]);

  const selected = useMemo(
    () => objects.find((o) => o.id === selectedId),
    [objects, selectedId]
  );

  const handleGenerateDimensions = useCallback(() => {
    const newDims: DimensionAnnotation[] = [];

    if (activeDimType === "auto" && selected) {
      newDims.push(...autoDimension(selected, unit, style.precision));
    }

    if (activeDimType === "angular" && selectedIds.length >= 2) {
      const obj1 = objects.find((o) => o.id === selectedIds[0]);
      const obj2 = objects.find((o) => o.id === selectedIds[1]);
      if (obj1 && obj2) {
        const dim = angularDimension(obj1, obj2, unit, style.precision);
        if (dim) newDims.push(dim);
      }
    }

    if (activeDimType === "radial" && selected) {
      if (selected.type === "circle" && selected.circleCenter && selected.circleRadius) {
        const c = selected.circleCenter;
        newDims.push({
          id: `dim_rad_${selected.id}`,
          type: "radial",
          objectIds: [selected.id],
          value: selected.circleRadius,
          formattedValue: `R${selected.circleRadius.toFixed(style.precision)} ${unit}`,
          unit,
          position: [c[0] + selected.circleRadius * 0.7, 0.02, c[2]],
          textAngle: 0,
          isDriving: true,
        });
      }
    }

    if (activeDimType === "diametric" && selected) {
      if (selected.type === "circle" && selected.circleCenter && selected.circleRadius) {
        const c = selected.circleCenter;
        newDims.push({
          id: `dim_dia_${selected.id}`,
          type: "diametric",
          objectIds: [selected.id],
          value: selected.circleRadius * 2,
          formattedValue: `⌀${(selected.circleRadius * 2).toFixed(style.precision)} ${unit}`,
          unit,
          position: [c[0], 0.02, c[2] - selected.circleRadius - 0.2],
          textAngle: 0,
          isDriving: true,
        });
      }
    }

    if ((activeDimType === "ordinate_x" || activeDimType === "ordinate_y") && selected) {
      if (selected.type === "line" && selected.linePoints && selected.linePoints.length >= 2) {
        const [p1, p2] = selected.linePoints;
        if (activeDimType === "ordinate_x") {
          newDims.push({
            id: `dim_ordx_${selected.id}_0`,
            type: "ordinate_x",
            objectIds: [selected.id],
            value: p1[0],
            formattedValue: `X: ${p1[0].toFixed(style.precision)}`,
            unit,
            position: [p1[0], 0.02, p1[2] - 0.3],
            textAngle: 0,
            isDriving: false,
          });
          newDims.push({
            id: `dim_ordx_${selected.id}_1`,
            type: "ordinate_x",
            objectIds: [selected.id],
            value: p2[0],
            formattedValue: `X: ${p2[0].toFixed(style.precision)}`,
            unit,
            position: [p2[0], 0.02, p2[2] - 0.3],
            textAngle: 0,
            isDriving: false,
          });
        } else {
          newDims.push({
            id: `dim_ordy_${selected.id}_0`,
            type: "ordinate_y",
            objectIds: [selected.id],
            value: p1[2],
            formattedValue: `Y: ${p1[2].toFixed(style.precision)}`,
            unit,
            position: [p1[0] - 0.3, 0.02, p1[2]],
            textAngle: Math.PI / 2,
            isDriving: false,
          });
          newDims.push({
            id: `dim_ordy_${selected.id}_1`,
            type: "ordinate_y",
            objectIds: [selected.id],
            value: p2[2],
            formattedValue: `Y: ${p2[2].toFixed(style.precision)}`,
            unit,
            position: [p2[0] - 0.3, 0.02, p2[2]],
            textAngle: Math.PI / 2,
            isDriving: false,
          });
        }
      }
    }

    if (activeDimType === "linear" && selected) {
      const dims = autoDimension(selected, unit, style.precision);
      newDims.push(...dims.filter((d) => d.type === "linear"));
    }

    setDimensions(newDims);
  }, [activeDimType, selected, selectedIds, objects, unit, style.precision]);

  const dimTypes: { id: DimensionType; icon: React.ReactNode; label: string }[] = [
    { id: "auto", icon: <Wand2 size={13} />, label: "Auto" },
    { id: "linear", icon: <RulerIcon size={13} />, label: "Linear" },
    { id: "angular", icon: <Triangle size={13} />, label: "Angular" },
    { id: "radial", icon: <CircleDot size={13} />, label: "Radial" },
    { id: "diametric", icon: <CircleDot size={13} />, label: "Diameter" },
    { id: "ordinate_x", icon: <ArrowUpDown size={13} />, label: "Ord. X" },
    { id: "ordinate_y", icon: <ArrowUpDown size={13} />, label: "Ord. Y" },
    { id: "arc_length", icon: <RulerIcon size={13} />, label: "Arc Len" },
  ];

  return (
    <div className="flex flex-col bg-[#0d1117] border border-[#21262d] rounded-lg shadow-2xl shadow-black/40 w-80 max-h-[600px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d] bg-[#161b22]">
        <div className="flex items-center gap-2">
          <RulerIcon size={13} className="text-[#00D4FF]" />
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Dimension Tools
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowStyleEditor(!showStyleEditor)}
            className="p-1 rounded hover:bg-[#21262d] text-slate-400 hover:text-white transition-colors"
            title="Dimension Style"
          >
            <Settings2 size={12} />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#21262d] text-slate-500 hover:text-white transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Dimension type selector */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-[#21262d]/50">
        {dimTypes.map((dt) => (
          <button
            key={dt.id}
            onClick={() => setActiveDimType(dt.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium transition-all ${
              activeDimType === dt.id
                ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                : "text-slate-400 hover:text-white bg-[#161b22] border border-[#21262d] hover:border-[#30363d]"
            }`}
          >
            {dt.icon}
            {dt.label}
          </button>
        ))}
      </div>

      {/* Style editor (collapsible) */}
      {showStyleEditor && (
        <div className="px-3 py-2 border-b border-[#21262d]/50 space-y-2 bg-[#161b22]/50">
          <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Style</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[8px] text-slate-500">Precision</label>
              <select
                className="w-full bg-[#0d1117] border border-[#21262d] rounded px-1.5 py-0.5 text-[9px] text-slate-300"
                value={style.precision}
                onChange={(e) => setStyle({ ...style, precision: parseInt(e.target.value) })}
              >
                {[0, 1, 2, 3, 4].map((p) => (
                  <option key={p} value={p}>{p} decimal{p !== 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[8px] text-slate-500">Text Height</label>
              <input
                type="number"
                step="0.05"
                min="0.05"
                value={style.textHeight}
                onChange={(e) => setStyle({ ...style, textHeight: parseFloat(e.target.value) || 0.15 })}
                className="w-full bg-[#0d1117] border border-[#21262d] rounded px-1.5 py-0.5 text-[9px] text-slate-300"
              />
            </div>
            <div>
              <label className="text-[8px] text-slate-500">Arrow Size</label>
              <input
                type="number"
                step="0.02"
                min="0.02"
                value={style.arrowSize}
                onChange={(e) => setStyle({ ...style, arrowSize: parseFloat(e.target.value) || 0.1 })}
                className="w-full bg-[#0d1117] border border-[#21262d] rounded px-1.5 py-0.5 text-[9px] text-slate-300"
              />
            </div>
            <div>
              <label className="text-[8px] text-slate-500">Line Color</label>
              <input
                type="color"
                value={style.lineColor}
                onChange={(e) => setStyle({ ...style, lineColor: e.target.value })}
                className="w-full h-5 cursor-pointer rounded bg-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Generate button */}
      <div className="px-3 py-2 border-b border-[#21262d]/50">
        <button
          onClick={handleGenerateDimensions}
          disabled={!selected && selectedIds.length === 0}
          className={`w-full py-1.5 rounded text-[10px] font-medium transition-all ${
            selected || selectedIds.length > 0
              ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/25"
              : "bg-[#161b22] text-slate-600 border border-[#21262d] cursor-not-allowed"
          }`}
        >
          {activeDimType === "auto" ? "Auto-Dimension Selected" : `Add ${activeDimType.replace("_", " ")} Dimension`}
        </button>
        {!selected && selectedIds.length === 0 && (
          <p className="text-[9px] text-slate-600 mt-1 text-center">Select an entity first</p>
        )}
        {activeDimType === "angular" && selectedIds.length < 2 && (
          <p className="text-[9px] text-yellow-500/60 mt-1 text-center">Select 2 lines for angular dimension</p>
        )}
      </div>

      {/* Dimensions list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {dimensions.length === 0 ? (
          <div className="p-4 text-center text-[10px] text-slate-600">
            No dimensions generated yet
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {dimensions.map((dim) => (
              <div
                key={dim.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#161b22] border border-[#21262d]/50 group hover:border-[#00D4FF]/20 transition-colors"
              >
                <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  dim.type === "linear" ? "bg-blue-500/15 text-blue-400" :
                  dim.type === "angular" ? "bg-orange-500/15 text-orange-400" :
                  dim.type === "radial" ? "bg-green-500/15 text-green-400" :
                  dim.type === "diametric" ? "bg-purple-500/15 text-purple-400" :
                  dim.type === "ordinate_x" || dim.type === "ordinate_y" ? "bg-yellow-500/15 text-yellow-400" :
                  "bg-slate-500/15 text-slate-400"
                }`}>
                  {dim.type === "ordinate_x" ? "ORD-X" :
                   dim.type === "ordinate_y" ? "ORD-Y" :
                   dim.type === "arc_length" ? "ARC" :
                   dim.type.slice(0, 3).toUpperCase()}
                </span>
                <span className="flex-1 text-[10px] text-white font-mono">
                  {dim.formattedValue}
                </span>
                <span className="text-[8px] text-slate-600">
                  {dim.isDriving ? "DRV" : "REF"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-[#21262d] bg-[#161b22] text-[9px] text-slate-500">
        {dimensions.length} dimension{dimensions.length !== 1 ? "s" : ""}
        {" · "}
        {activeDimType === "auto" ? "Auto mode" : activeDimType}
      </div>
    </div>
  );
}
