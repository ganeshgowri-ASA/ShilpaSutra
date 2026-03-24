"use client";
import { useMemo } from "react";
import { useCadStore } from "@/stores/cad-store";
import { X, Weight, Box, Ruler } from "lucide-react";

const MATERIAL_DENSITIES: Record<string, number> = {
  "Steel (AISI 1045)": 7850,
  "Aluminum 6061-T6": 2700,
  "Titanium Ti-6Al-4V": 4430,
  "ABS Plastic": 1050,
  "Copper C110": 8900,
  "Brass C360": 8500,
  "Nylon PA6": 1140,
  "Polycarbonate": 1200,
};

export default function MassPropertiesDialog({ onClose }: { onClose: () => void }) {
  const selectedId = useCadStore((s) => s.selectedId);
  const objects = useCadStore((s) => s.objects);
  const unit = useCadStore((s) => s.unit);

  const selected = objects.find((o) => o.id === selectedId);

  const properties = useMemo(() => {
    if (!selected) return null;

    const w = selected.dimensions.width;
    const h = selected.dimensions.height;
    const d = selected.dimensions.depth;

    let volume = 0;
    let surfaceArea = 0;

    switch (selected.type) {
      case "box":
        volume = w * h * d;
        surfaceArea = 2 * (w * h + h * d + w * d);
        break;
      case "cylinder":
        volume = Math.PI * w * w * h;
        surfaceArea = 2 * Math.PI * w * (w + h);
        break;
      case "sphere":
        volume = (4 / 3) * Math.PI * w * w * w;
        surfaceArea = 4 * Math.PI * w * w;
        break;
      case "cone":
        volume = (1 / 3) * Math.PI * w * w * h;
        const slant = Math.sqrt(w * w + h * h);
        surfaceArea = Math.PI * w * (w + slant);
        break;
      case "mesh":
        // Estimate from bounding box
        volume = w * h * d * 0.65; // approximate fill factor
        surfaceArea = 2 * (w * h + h * d + w * d);
        break;
      default:
        return null;
    }

    // Convert scene units to mm (scene 1 unit = 10mm)
    const scaleToMm = 10;
    const volumeMm3 = volume * Math.pow(scaleToMm, 3);
    const surfaceAreaMm2 = surfaceArea * Math.pow(scaleToMm, 2);

    const density = MATERIAL_DENSITIES[selected.material] || 7850;
    const volumeM3 = volumeMm3 / 1e9;
    const mass = density * volumeM3; // kg

    // Center of mass (geometric center for primitives)
    const com = selected.position;

    // Moments of inertia (approximation for box)
    const massKg = mass;
    const wMm = w * scaleToMm;
    const hMm = h * scaleToMm;
    const dMm = d * scaleToMm;
    const Ixx = (massKg / 12) * (hMm * hMm + dMm * dMm);
    const Iyy = (massKg / 12) * (wMm * wMm + dMm * dMm);
    const Izz = (massKg / 12) * (wMm * wMm + hMm * hMm);

    return {
      volume: volumeMm3,
      surfaceArea: surfaceAreaMm2,
      mass,
      density,
      centerOfMass: com,
      Ixx, Iyy, Izz,
      boundingBox: { w: wMm, h: hMm, d: dMm },
    };
  }, [selected]);

  if (!selected || !properties) {
    return (
      <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-[#1a1a2e]/95 border border-[#00D4FF]/40 rounded-lg p-4 z-20 backdrop-blur-sm shadow-xl min-w-[300px]">
        <div className="flex items-center gap-2 mb-2">
          <Weight size={14} className="text-[#00D4FF]" />
          <span className="text-xs font-semibold text-white">Mass Properties</span>
          <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white"><X size={12} /></button>
        </div>
        <p className="text-[11px] text-slate-500">Select a 3D object to view mass properties.</p>
      </div>
    );
  }

  const fmt = (v: number, dec = 2) => v.toFixed(dec);

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-[#1a1a2e]/95 border border-[#00D4FF]/40 rounded-lg p-4 z-20 backdrop-blur-sm shadow-xl min-w-[320px] max-w-[380px]">
      <div className="flex items-center gap-2 mb-3">
        <Weight size={14} className="text-[#00D4FF]" />
        <span className="text-xs font-semibold text-white">Mass Properties</span>
        <span className="text-[9px] text-slate-500 ml-1">({selected.name})</span>
        <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white"><X size={12} /></button>
      </div>

      <div className="space-y-2">
        {/* Volume & Surface Area */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#0d1117] rounded p-2">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Volume</div>
            <div className="text-[12px] text-white font-mono">{fmt(properties.volume)} mm&sup3;</div>
            <div className="text-[9px] text-slate-600">{fmt(properties.volume / 1e6, 4)} dm&sup3;</div>
          </div>
          <div className="bg-[#0d1117] rounded p-2">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Surface Area</div>
            <div className="text-[12px] text-white font-mono">{fmt(properties.surfaceArea)} mm&sup2;</div>
          </div>
        </div>

        {/* Mass & Material */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#0d1117] rounded p-2">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Mass</div>
            <div className="text-[12px] text-emerald-400 font-mono font-bold">
              {properties.mass < 1 ? `${fmt(properties.mass * 1000)} g` : `${fmt(properties.mass)} kg`}
            </div>
          </div>
          <div className="bg-[#0d1117] rounded p-2">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Density</div>
            <div className="text-[12px] text-white font-mono">{properties.density} kg/m&sup3;</div>
            <div className="text-[9px] text-slate-600">{selected.material}</div>
          </div>
        </div>

        {/* Center of Mass */}
        <div className="bg-[#0d1117] rounded p-2">
          <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Center of Mass</div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-[9px] text-red-400">X:</span>{" "}
              <span className="text-[11px] text-white font-mono">{fmt(properties.centerOfMass[0] * 10)}</span>
            </div>
            <div>
              <span className="text-[9px] text-green-400">Y:</span>{" "}
              <span className="text-[11px] text-white font-mono">{fmt(properties.centerOfMass[1] * 10)}</span>
            </div>
            <div>
              <span className="text-[9px] text-blue-400">Z:</span>{" "}
              <span className="text-[11px] text-white font-mono">{fmt(properties.centerOfMass[2] * 10)}</span>
            </div>
          </div>
        </div>

        {/* Bounding Box */}
        <div className="bg-[#0d1117] rounded p-2">
          <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Bounding Box</div>
          <div className="text-[11px] text-white font-mono">
            {fmt(properties.boundingBox.w)} x {fmt(properties.boundingBox.h)} x {fmt(properties.boundingBox.d)} mm
          </div>
        </div>

        {/* Moments of Inertia */}
        <div className="bg-[#0d1117] rounded p-2">
          <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Moments of Inertia (about COM)</div>
          <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-300">
            <div>Ixx: {fmt(properties.Ixx, 1)}</div>
            <div>Iyy: {fmt(properties.Iyy, 1)}</div>
            <div>Izz: {fmt(properties.Izz, 1)}</div>
          </div>
          <div className="text-[8px] text-slate-600 mt-0.5">kg&middot;mm&sup2;</div>
        </div>
      </div>

      <button onClick={onClose} className="mt-3 w-full text-[10px] py-1.5 text-slate-400 hover:text-white rounded border border-[#21262d] hover:border-[#30363d] transition-colors">
        Close
      </button>
    </div>
  );
}
