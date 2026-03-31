"use client";

import { useState, useEffect, useCallback } from "react";

// Minimal shape – accepts both the full engine AssemblyPart and the page-local one
interface PartLike {
  dimensions: { width: number; height: number; depth: number };
  material?: string;
}

// Common engineering materials for the selector
const MATERIAL_PRESETS = [
  { name: "Steel AISI 304", E: 193, density: 8000, yield: 215, color: "#8899aa" },
  { name: "Steel AISI 1020", E: 205, density: 7850, yield: 350, color: "#7a8a9a" },
  { name: "Aluminum 6061-T6", E: 69, density: 2700, yield: 276, color: "#b8c8d8" },
  { name: "Aluminum 7075-T6", E: 72, density: 2810, yield: 503, color: "#a0b0c0" },
  { name: "Titanium Ti-6Al-4V", E: 114, density: 4430, yield: 880, color: "#9090a0" },
  { name: "Copper C11000", E: 117, density: 8940, yield: 69, color: "#cc8855" },
  { name: "ABS Plastic", E: 2.3, density: 1050, yield: 43, color: "#e0e0d0" },
  { name: "Nylon 6/6", E: 3.3, density: 1140, yield: 79, color: "#f0e8d0" },
  { name: "Carbon Fiber (UD)", E: 135, density: 1600, yield: 1500, color: "#333340" },
  { name: "Glass Fiber", E: 73, density: 2500, yield: 3400, color: "#c8d0d8" },
];

export interface ParametricSlidersProps {
  parts: PartLike[];
  onUpdate: (dims: Record<string, number>, material?: string, loadMagnitude?: number) => void;
  isRunning?: boolean;
  analysisType?: string;
}

export default function ParametricSliders({ parts, onUpdate, isRunning, analysisType }: ParametricSlidersProps) {
  const [localDims, setLocalDims] = useState<Record<string, number>>({});
  const [selectedMaterial, setSelectedMaterial] = useState("Steel AISI 1020");
  const [loadMagnitude, setLoadMagnitude] = useState(1000);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (parts.length === 0) return;
    const basePart = parts[0];
    setLocalDims({
      length: Math.round(basePart.dimensions.width * 10 * 10) / 10,
      thickness: Math.round(basePart.dimensions.height * 10 * 10) / 10,
      width: Math.round(basePart.dimensions.depth * 10 * 10) / 10,
    });
  }, [parts]);

  const handleChange = useCallback((key: string, value: number) => {
    setLocalDims(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyChanges = useCallback(() => {
    onUpdate(localDims, selectedMaterial, loadMagnitude);
  }, [localDims, selectedMaterial, loadMagnitude, onUpdate]);

  if (Object.keys(localDims).length === 0) return null;

  const currentMat = MATERIAL_PRESETS.find(m => m.name === selectedMaterial);

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 mb-4 mt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-[#30363d] pb-2">
        <h4 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5 tracking-wider">
          <svg className="w-3.5 h-3.5 text-[#00D4FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Parametric Fine-Tuning
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[9px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showAdvanced ? "▾ Less" : "▸ More"}
          </button>
          <button
            onClick={applyChanges}
            disabled={isRunning}
            className="text-[10px] bg-[#00D4FF]/10 text-[#00D4FF] hover:bg-[#00D4FF]/20 px-2.5 py-1 rounded font-medium disabled:opacity-40 transition-colors"
          >
            {isRunning ? "⟳ Running..." : "▶ Apply & Simulate"}
          </button>
        </div>
      </div>

      {/* Dimension Sliders */}
      <div className="space-y-2.5">
        {Object.entries(localDims).map(([key, value]) => {
          const isAngle = key.includes("angle") || key.includes("tilt");
          const min = isAngle ? 0 : Math.max(1, Math.round(value * 0.2));
          const max = isAngle ? 90 : Math.max(10, Math.round(value * 3));

          return (
            <div key={key}>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-400 capitalize">{key}</span>
                <span className="text-white font-mono text-[10px] bg-[#21262d] px-1.5 py-0.5 rounded">
                  {value.toFixed(1)} {isAngle ? "°" : "mm"}
                </span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={isAngle ? 1 : 0.5}
                value={value}
                onChange={(e) => handleChange(key, parseFloat(e.target.value))}
                className="w-full accent-[#00D4FF] h-1 bg-[#21262d] rounded-full appearance-none cursor-pointer"
              />
            </div>
          );
        })}
      </div>

      {/* Material Selector */}
      <div className="mt-3 pt-3 border-t border-[#30363d]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Material</span>
          {currentMat && (
            <span className="text-[9px] text-slate-500 font-mono">
              E={currentMat.E} GPa · σy={currentMat.yield} MPa
            </span>
          )}
        </div>
        <select
          value={selectedMaterial}
          onChange={(e) => setSelectedMaterial(e.target.value)}
          className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1.5 text-[11px] text-slate-300 outline-none focus:border-[#00D4FF] appearance-none cursor-pointer"
        >
          {MATERIAL_PRESETS.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name} — E={m.E} GPa, ρ={m.density} kg/m³
            </option>
          ))}
        </select>
      </div>

      {/* Load Magnitude (for structural/thermal) */}
      {(analysisType === "structural" || analysisType === "thermal" || !analysisType) && (
        <div className="mt-3 pt-3 border-t border-[#30363d]">
          <div className="flex justify-between text-[11px] mb-0.5">
            <span className="text-slate-400">
              {analysisType === "thermal" ? "Heat Load" : "Applied Force"}
            </span>
            <span className="text-white font-mono text-[10px] bg-[#21262d] px-1.5 py-0.5 rounded">
              {loadMagnitude} {analysisType === "thermal" ? "W" : "N"}
            </span>
          </div>
          <input
            type="range"
            min={100}
            max={50000}
            step={100}
            value={loadMagnitude}
            onChange={(e) => setLoadMagnitude(parseInt(e.target.value))}
            className="w-full accent-[#00D4FF] h-1 bg-[#21262d] rounded-full appearance-none cursor-pointer"
          />
        </div>
      )}

      {/* Advanced: Material Properties (expanded) */}
      {showAdvanced && currentMat && (
        <div className="mt-3 pt-3 border-t border-[#30363d]">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Material Properties</span>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { label: "Young's Modulus", value: `${currentMat.E} GPa`, icon: "E" },
              { label: "Density", value: `${currentMat.density} kg/m³`, icon: "ρ" },
              { label: "Yield Strength", value: `${currentMat.yield} MPa`, icon: "σy" },
              { label: "Color", value: currentMat.color, icon: "🎨" },
            ].map((prop) => (
              <div key={prop.label} className="flex items-center gap-2 bg-[#0d1117] rounded px-2 py-1.5">
                <span className="text-[10px] font-mono text-[#00D4FF] w-4">{prop.icon}</span>
                <div>
                  <div className="text-[9px] text-slate-500">{prop.label}</div>
                  <div className="text-[10px] text-slate-300 font-mono">{prop.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[8px] text-slate-600 mt-2.5 pt-2 border-t border-[#30363d]/50">
        Adjustments trigger CAD regeneration + background simulation.
      </p>
    </div>
  );
}
