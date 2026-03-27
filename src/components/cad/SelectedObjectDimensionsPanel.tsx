"use client";
import { useCallback } from "react";
import { useCadStore } from "@/stores/cad-store";
import { Settings2, X } from "lucide-react";

const MM = 10; // scene unit → mm multiplier

interface DimFieldProps {
  label: string;
  valueMm: number;
  onChange: (mm: number) => void;
  min?: number;
  max?: number;
}

function DimField({ label, valueMm, onChange, min = 1, max = 5000 }: DimFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-400 w-16 shrink-0">{label}</span>
      <input
        type="number"
        value={Math.round(valueMm * 10) / 10}
        min={min}
        max={max}
        step={0.5}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v) && v >= min) onChange(v);
        }}
        className="flex-1 bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-[10px] text-slate-200 font-mono outline-none focus:border-[#00D4FF]/40 hover:border-[#30363d] transition-colors text-right"
      />
      <span className="text-[9px] text-slate-600 w-6 shrink-0">mm</span>
    </div>
  );
}

interface Props {
  onClose?: () => void;
}

export default function SelectedObjectDimensionsPanel({ onClose }: Props) {
  const selectedId = useCadStore((s) => s.selectedId);
  const objects = useCadStore((s) => s.objects);
  const updateObject = useCadStore((s) => s.updateObject);

  const obj = objects.find((o) => o.id === selectedId);

  const update = useCallback(
    (field: "width" | "height" | "depth", mm: number) => {
      if (!selectedId) return;
      const current = obj?.dimensions ?? { width: 1, height: 1, depth: 1 };
      const newDims = { ...current, [field]: mm / MM };
      // Keep position centred vertically when height changes
      if (field === "height") {
        const newY = newDims.height / 2;
        updateObject(selectedId, { dimensions: newDims, position: [
          obj?.position[0] ?? 0,
          newY,
          obj?.position[2] ?? 0,
        ] });
      } else {
        updateObject(selectedId, { dimensions: newDims });
      }
    },
    [selectedId, obj, updateObject]
  );

  const updateMat = useCallback(
    (field: "metalness" | "roughness" | "opacity", val: number) => {
      if (!selectedId) return;
      updateObject(selectedId, { [field]: val });
    },
    [selectedId, updateObject]
  );

  if (!obj) {
    return (
      <div className="w-56 bg-[#161b22] border border-[#21262d] rounded-xl shadow-2xl p-4">
        <p className="text-[10px] text-slate-500 text-center">Select an object to edit dimensions</p>
      </div>
    );
  }

  const d = obj.dimensions;
  const wMm = d.width * MM;
  const hMm = d.height * MM;
  const depMm = d.depth * MM;

  const isCylinder = obj.type === "cylinder";
  const isSphere = obj.type === "sphere";
  const isMesh = obj.type === "mesh";

  return (
    <div className="w-56 bg-[#161b22] border border-[#21262d] rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d]">
        <div className="flex items-center gap-1.5">
          <Settings2 size={12} className="text-[#00D4FF]" />
          <span className="text-[11px] font-bold text-white truncate max-w-[120px]">{obj.name}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors">
            <X size={12} />
          </button>
        )}
      </div>

      <div className="p-3 space-y-2">
        <p className="text-[9px] uppercase tracking-wider text-slate-600 font-semibold">Dimensions</p>

        {isSphere ? (
          <DimField label="Radius" valueMm={wMm} onChange={(mm) => {
            if (!selectedId) return;
            updateObject(selectedId, { dimensions: { width: mm/MM, height: mm/MM, depth: mm/MM } });
          }} />
        ) : isCylinder ? (
          <>
            <DimField label="Diameter" valueMm={wMm * 2} onChange={(mm) => update("width", mm / 2)} />
            <DimField label="Height" valueMm={hMm} onChange={(mm) => update("height", mm)} />
          </>
        ) : isMesh ? (
          <p className="text-[10px] text-slate-500">Mesh geometry — use text prompt to modify</p>
        ) : (
          <>
            <DimField label="Width (X)" valueMm={wMm} onChange={(mm) => update("width", mm)} />
            <DimField label="Height (Y)" valueMm={hMm} onChange={(mm) => update("height", mm)} />
            <DimField label="Depth (Z)" valueMm={depMm} onChange={(mm) => update("depth", mm)} />
          </>
        )}

        {/* Position */}
        <p className="text-[9px] uppercase tracking-wider text-slate-600 font-semibold pt-1">Position</p>
        {(["x","y","z"] as const).map((axis, i) => (
          <div key={axis} className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 w-16 shrink-0">{axis.toUpperCase()}</span>
            <input
              type="number"
              value={Math.round(obj.position[i] * MM * 10) / 10}
              step={1}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && selectedId) {
                  const p = [...obj.position] as [number,number,number];
                  p[i] = v / MM;
                  updateObject(selectedId, { position: p });
                }
              }}
              className="flex-1 bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-[10px] text-slate-200 font-mono outline-none focus:border-[#00D4FF]/40 hover:border-[#30363d] transition-colors text-right"
            />
            <span className="text-[9px] text-slate-600 w-6 shrink-0">mm</span>
          </div>
        ))}

        {/* Material */}
        <p className="text-[9px] uppercase tracking-wider text-slate-600 font-semibold pt-1">Material</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 w-16 shrink-0">Color</span>
          <input type="color" value={obj.color || "#888888"}
            onChange={(e) => selectedId && updateObject(selectedId, { color: e.target.value })}
            className="w-8 h-6 rounded border border-[#21262d] bg-transparent cursor-pointer" />
          <span className="text-[10px] text-slate-500 font-mono">{obj.color}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 w-16 shrink-0">Metalness</span>
          <input type="range" min={0} max={1} step={0.05} value={obj.metalness ?? 0.4}
            onChange={(e) => updateMat("metalness", parseFloat(e.target.value))}
            className="flex-1 h-1 accent-[#00D4FF]" />
          <span className="text-[9px] text-slate-500 w-6">{((obj.metalness ?? 0.4) * 100).toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 w-16 shrink-0">Roughness</span>
          <input type="range" min={0} max={1} step={0.05} value={obj.roughness ?? 0.5}
            onChange={(e) => updateMat("roughness", parseFloat(e.target.value))}
            className="flex-1 h-1 accent-[#00D4FF]" />
          <span className="text-[9px] text-slate-500 w-6">{((obj.roughness ?? 0.5) * 100).toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 w-16 shrink-0">Opacity</span>
          <input type="range" min={0.05} max={1} step={0.05} value={obj.opacity ?? 1}
            onChange={(e) => updateMat("opacity", parseFloat(e.target.value))}
            className="flex-1 h-1 accent-[#00D4FF]" />
          <span className="text-[9px] text-slate-500 w-6">{((obj.opacity ?? 1) * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
