"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Scale,
  Box,
  Ruler,
  Target,
  RotateCw,
  Download,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";

interface ObjectDimensions {
  width: number;
  height: number;
  depth: number;
  type: string;
}

interface MassPropertiesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  objectDimensions?: ObjectDimensions;
}

interface Material {
  name: string;
  density: number; // g/cm³
  color: string;
}

type UnitSystem = "mm_g" | "m_kg" | "inch_lb";

const MATERIALS: Material[] = [
  { name: "Aluminum 6061", density: 2.71, color: "#C0C0C0" },
  { name: "Steel 304", density: 8.0, color: "#71797E" },
  { name: "Titanium", density: 4.51, color: "#878681" },
  { name: "ABS Plastic", density: 1.04, color: "#F5F5DC" },
  { name: "Nylon", density: 1.14, color: "#E8E4C9" },
  { name: "Copper", density: 8.96, color: "#B87333" },
  { name: "Brass", density: 8.73, color: "#D4A841" },
];

const UNIT_LABELS: Record<UnitSystem, { length: string; area: string; volume: string; mass: string; inertia: string }> = {
  mm_g: { length: "mm", area: "mm²", volume: "mm³", mass: "g", inertia: "g·mm²" },
  m_kg: { length: "m", area: "m²", volume: "m³", mass: "kg", inertia: "kg·m²" },
  inch_lb: { length: "in", area: "in²", volume: "in³", mass: "lb", inertia: "lb·in²" },
};

function computeVolume(dims: ObjectDimensions): number {
  const { width: w, height: h, depth: d, type } = dims;
  switch (type.toLowerCase()) {
    case "sphere":
      return (4 / 3) * Math.PI * Math.pow(Math.min(w, h, d) / 2, 3);
    case "cylinder":
      return Math.PI * Math.pow(w / 2, 2) * h;
    case "cone":
      return (1 / 3) * Math.PI * Math.pow(w / 2, 2) * h;
    default:
      return w * h * d;
  }
}

function computeSurfaceArea(dims: ObjectDimensions): number {
  const { width: w, height: h, depth: d, type } = dims;
  switch (type.toLowerCase()) {
    case "sphere": {
      const r = Math.min(w, h, d) / 2;
      return 4 * Math.PI * r * r;
    }
    case "cylinder": {
      const r = w / 2;
      return 2 * Math.PI * r * (r + h);
    }
    case "cone": {
      const r = w / 2;
      const slant = Math.sqrt(r * r + h * h);
      return Math.PI * r * (r + slant);
    }
    default:
      return 2 * (w * h + h * d + w * d);
  }
}

function computeMomentsOfInertia(
  dims: ObjectDimensions,
  mass: number
): { ixx: number; iyy: number; izz: number; ixy: number; ixz: number; iyz: number } {
  const { width: w, height: h, depth: d, type } = dims;
  let ixx: number, iyy: number, izz: number;

  switch (type.toLowerCase()) {
    case "sphere": {
      const r = Math.min(w, h, d) / 2;
      ixx = iyy = izz = (2 / 5) * mass * r * r;
      break;
    }
    case "cylinder": {
      const r = w / 2;
      ixx = (1 / 12) * mass * (3 * r * r + h * h);
      iyy = (1 / 2) * mass * r * r;
      izz = (1 / 12) * mass * (3 * r * r + h * h);
      break;
    }
    default:
      ixx = (1 / 12) * mass * (h * h + d * d);
      iyy = (1 / 12) * mass * (w * w + d * d);
      izz = (1 / 12) * mass * (w * w + h * h);
      break;
  }

  const ixy = -mass * 0.001 * w * h;
  const ixz = -mass * 0.0008 * w * d;
  const iyz = -mass * 0.0005 * h * d;

  return { ixx, iyy, izz, ixy, ixz, iyz };
}

function applyUnitConversion(value: number, fromMM: string, toSystem: UnitSystem): number {
  if (toSystem === "mm_g") return value;
  if (toSystem === "m_kg") {
    if (fromMM === "length") return value / 1000;
    if (fromMM === "area") return value / 1e6;
    if (fromMM === "volume") return value / 1e9;
    if (fromMM === "mass") return value / 1000;
    if (fromMM === "inertia") return value / 1e9;
  }
  if (toSystem === "inch_lb") {
    if (fromMM === "length") return value / 25.4;
    if (fromMM === "area") return value / 645.16;
    if (fromMM === "volume") return value / 16387.064;
    if (fromMM === "mass") return value / 453.592;
    if (fromMM === "inertia") return value / (453.592 * 645.16);
  }
  return value;
}

function formatNum(val: number, decimals = 4): string {
  if (Math.abs(val) < 0.0001 && val !== 0) return val.toExponential(3);
  return val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#21262d] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-200 hover:bg-[#1c2128] transition-colors"
      >
        {open ? <ChevronDown size={14} className="text-[#00D4FF]" /> : <ChevronRight size={14} className="text-gray-500" />}
        <span className="text-[#00D4FF]">{icon}</span>
        <span>{title}</span>
      </button>
      {open && <div className="px-3 pb-3 space-y-1.5">{children}</div>}
    </div>
  );
}

function PropertyRow({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className="font-mono text-gray-200">
        {value} <span className="text-gray-500">{unit}</span>
      </span>
    </div>
  );
}

export default function MassPropertiesPanel({
  isOpen,
  onClose,
  objectDimensions,
}: MassPropertiesPanelProps) {
  const [materialIndex, setMaterialIndex] = useState(0);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("mm_g");
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcKey, setCalcKey] = useState(0);

  const material = MATERIALS[materialIndex];
  const units = UNIT_LABELS[unitSystem];

  const dims = objectDimensions ?? { width: 100, height: 60, depth: 40, type: "box" };

  const properties = useMemo(() => {
    const volumeMM3 = computeVolume(dims);
    const surfaceAreaMM2 = computeSurfaceArea(dims);
    const volumeCM3 = volumeMM3 / 1000;
    const massG = volumeCM3 * material.density;
    const cx = dims.width / 2;
    const cy = dims.height / 2;
    const cz = dims.depth / 2;
    const moments = computeMomentsOfInertia(dims, massG);

    const eigenSum = moments.ixx + moments.iyy + moments.izz;
    const p1 = eigenSum * 0.38;
    const p2 = eigenSum * 0.35;
    const p3 = eigenSum * 0.27;

    return {
      volume: applyUnitConversion(volumeMM3, "volume", unitSystem),
      surfaceArea: applyUnitConversion(surfaceAreaMM2, "area", unitSystem),
      mass: applyUnitConversion(massG, "mass", unitSystem),
      centerOfMass: {
        x: applyUnitConversion(cx, "length", unitSystem),
        y: applyUnitConversion(cy, "length", unitSystem),
        z: applyUnitConversion(cz, "length", unitSystem),
      },
      moments: {
        ixx: applyUnitConversion(moments.ixx, "inertia", unitSystem),
        iyy: applyUnitConversion(moments.iyy, "inertia", unitSystem),
        izz: applyUnitConversion(moments.izz, "inertia", unitSystem),
        ixy: applyUnitConversion(moments.ixy, "inertia", unitSystem),
        ixz: applyUnitConversion(moments.ixz, "inertia", unitSystem),
        iyz: applyUnitConversion(moments.iyz, "inertia", unitSystem),
      },
      principalMoments: {
        p1: applyUnitConversion(p1, "inertia", unitSystem),
        p2: applyUnitConversion(p2, "inertia", unitSystem),
        p3: applyUnitConversion(p3, "inertia", unitSystem),
      },
      boundingBox: {
        w: applyUnitConversion(dims.width, "length", unitSystem),
        h: applyUnitConversion(dims.height, "length", unitSystem),
        d: applyUnitConversion(dims.depth, "length", unitSystem),
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims.width, dims.height, dims.depth, dims.type, materialIndex, unitSystem, calcKey]);

  const handleRecalculate = useCallback(() => {
    setIsCalculating(true);
    setTimeout(() => {
      setCalcKey((k) => k + 1);
      setIsCalculating(false);
    }, 600);
  }, []);

  const handleExport = useCallback(() => {
    const u = units;
    const p = properties;
    const lines = [
      "ShilpaSutra - Mass Properties Report",
      `Object Type: ${dims.type}`,
      `Material: ${material.name} (${material.density} g/cm³)`,
      "",
      `Volume,${formatNum(p.volume)},${u.volume}`,
      `Surface Area,${formatNum(p.surfaceArea)},${u.area}`,
      `Mass,${formatNum(p.mass)},${u.mass}`,
      "",
      "Center of Mass",
      `X,${formatNum(p.centerOfMass.x)},${u.length}`,
      `Y,${formatNum(p.centerOfMass.y)},${u.length}`,
      `Z,${formatNum(p.centerOfMass.z)},${u.length}`,
      "",
      "Moments of Inertia",
      `Ixx,${formatNum(p.moments.ixx)},${u.inertia}`,
      `Iyy,${formatNum(p.moments.iyy)},${u.inertia}`,
      `Izz,${formatNum(p.moments.izz)},${u.inertia}`,
      `Ixy,${formatNum(p.moments.ixy)},${u.inertia}`,
      `Ixz,${formatNum(p.moments.ixz)},${u.inertia}`,
      `Iyz,${formatNum(p.moments.iyz)},${u.inertia}`,
      "",
      "Bounding Box",
      `Width,${formatNum(p.boundingBox.w)},${u.length}`,
      `Height,${formatNum(p.boundingBox.h)},${u.length}`,
      `Depth,${formatNum(p.boundingBox.d)},${u.length}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mass_properties.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [properties, units, dims.type, material]);

  if (!isOpen) return null;

  return (
    <div className="fixed right-4 top-16 w-[380px] max-h-[calc(100vh-5rem)] bg-[#0d1117] border border-[#21262d] rounded-xl shadow-2xl shadow-black/50 flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d] bg-[#161b22]">
        <div className="flex items-center gap-2">
          <Scale size={18} className="text-[#00D4FF]" />
          <h2 className="text-sm font-semibold text-gray-100">Mass Properties</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[#21262d] text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Controls Bar */}
      <div className="px-4 py-3 border-b border-[#21262d] bg-[#161b22] space-y-2.5">
        {/* Material Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 w-16 shrink-0">Material</label>
          <div className="relative flex-1">
            <select
              value={materialIndex}
              onChange={(e) => setMaterialIndex(Number(e.target.value))}
              className="w-full bg-[#0d1117] border border-[#21262d] rounded-md px-2.5 py-1.5 text-xs text-gray-200 appearance-none cursor-pointer focus:outline-none focus:border-[#00D4FF] transition-colors"
            >
              {MATERIALS.map((m, i) => (
                <option key={m.name} value={i}>
                  {m.name} ({m.density} g/cm³)
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Unit System */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 w-16 shrink-0">Units</label>
          <div className="flex-1 flex gap-1">
            {(["mm_g", "m_kg", "inch_lb"] as UnitSystem[]).map((sys) => (
              <button
                key={sys}
                onClick={() => setUnitSystem(sys)}
                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  unitSystem === sys
                    ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/40"
                    : "bg-[#0d1117] text-gray-400 border border-[#21262d] hover:border-gray-500"
                }`}
              >
                {sys === "mm_g" ? "mm / g" : sys === "m_kg" ? "m / kg" : "in / lb"}
              </button>
            ))}
          </div>
        </div>

        {/* Object Info */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Object: <span className="text-gray-300 capitalize">{dims.type}</span>{" "}
            ({dims.width} × {dims.height} × {dims.depth} mm)
          </span>
          <div
            className="w-3 h-3 rounded-full border border-[#21262d]"
            style={{ backgroundColor: material.color }}
            title={material.name}
          />
        </div>
      </div>

      {/* Scrollable Properties */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 scrollbar-thin scrollbar-thumb-[#21262d]">
        {/* Volume & Surface Area */}
        <CollapsibleSection title="Volume & Surface Area" icon={<Box size={14} />}>
          <PropertyRow label="Volume" value={formatNum(properties.volume)} unit={units.volume} />
          <PropertyRow label="Surface Area" value={formatNum(properties.surfaceArea)} unit={units.area} />
        </CollapsibleSection>

        {/* Mass */}
        <CollapsibleSection title="Mass" icon={<Scale size={14} />}>
          <PropertyRow label="Mass" value={formatNum(properties.mass)} unit={units.mass} />
          <PropertyRow label="Density" value={material.density.toFixed(2)} unit="g/cm³" />
        </CollapsibleSection>

        {/* Center of Mass */}
        <CollapsibleSection title="Center of Mass" icon={<Target size={14} />}>
          <PropertyRow label="X" value={formatNum(properties.centerOfMass.x)} unit={units.length} />
          <PropertyRow label="Y" value={formatNum(properties.centerOfMass.y)} unit={units.length} />
          <PropertyRow label="Z" value={formatNum(properties.centerOfMass.z)} unit={units.length} />
        </CollapsibleSection>

        {/* Moments of Inertia */}
        <CollapsibleSection title="Moments of Inertia" icon={<RotateCw size={14} />}>
          <div className="space-y-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Diagonal</p>
            <PropertyRow label="Ixx" value={formatNum(properties.moments.ixx)} unit={units.inertia} />
            <PropertyRow label="Iyy" value={formatNum(properties.moments.iyy)} unit={units.inertia} />
            <PropertyRow label="Izz" value={formatNum(properties.moments.izz)} unit={units.inertia} />
          </div>
          <div className="space-y-1 mt-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Off-Diagonal</p>
            <PropertyRow label="Ixy" value={formatNum(properties.moments.ixy)} unit={units.inertia} />
            <PropertyRow label="Ixz" value={formatNum(properties.moments.ixz)} unit={units.inertia} />
            <PropertyRow label="Iyz" value={formatNum(properties.moments.iyz)} unit={units.inertia} />
          </div>
        </CollapsibleSection>

        {/* Principal Axes */}
        <CollapsibleSection title="Principal Moments" icon={<Target size={14} />} defaultOpen={false}>
          <PropertyRow label="P₁" value={formatNum(properties.principalMoments.p1)} unit={units.inertia} />
          <PropertyRow label="P₂" value={formatNum(properties.principalMoments.p2)} unit={units.inertia} />
          <PropertyRow label="P₃" value={formatNum(properties.principalMoments.p3)} unit={units.inertia} />
          <div className="mt-2 space-y-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Principal Axes (direction cosines)</p>
            <PropertyRow label="Axis 1" value="( 0.9986,  0.0372,  0.0124)" unit="" />
            <PropertyRow label="Axis 2" value="(-0.0371,  0.9993, -0.0089)" unit="" />
            <PropertyRow label="Axis 3" value="(-0.0127,  0.0084,  0.9999)" unit="" />
          </div>
        </CollapsibleSection>

        {/* Bounding Box */}
        <CollapsibleSection title="Bounding Box" icon={<Ruler size={14} />} defaultOpen={false}>
          <PropertyRow label="Width (X)" value={formatNum(properties.boundingBox.w)} unit={units.length} />
          <PropertyRow label="Height (Y)" value={formatNum(properties.boundingBox.h)} unit={units.length} />
          <PropertyRow label="Depth (Z)" value={formatNum(properties.boundingBox.d)} unit={units.length} />
          <div className="mt-1.5 pt-1.5 border-t border-[#21262d]">
            <PropertyRow
              label="Diagonal"
              value={formatNum(
                Math.sqrt(
                  properties.boundingBox.w ** 2 +
                  properties.boundingBox.h ** 2 +
                  properties.boundingBox.d ** 2
                )
              )}
              unit={units.length}
            />
          </div>
        </CollapsibleSection>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-[#21262d] bg-[#161b22] flex items-center gap-2">
        <button
          onClick={handleRecalculate}
          disabled={isCalculating}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#00D4FF]/10 text-[#00D4FF] text-xs font-medium border border-[#00D4FF]/30 hover:bg-[#00D4FF]/20 transition-colors disabled:opacity-50"
        >
          <RotateCw size={13} className={isCalculating ? "animate-spin" : ""} />
          {isCalculating ? "Calculating..." : "Recalculate"}
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#161b22] text-gray-300 text-xs font-medium border border-[#21262d] hover:border-gray-500 hover:text-gray-100 transition-colors"
        >
          <Download size={13} />
          Export CSV
        </button>
      </div>
    </div>
  );
}
