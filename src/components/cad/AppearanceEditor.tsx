"use client";
import { useState, useCallback } from "react";
import { useCadStore } from "@/stores/cad-store";
import { X, Palette } from "lucide-react";

interface MaterialPreset {
  id: string;
  name: string;
  color: string;
  metalness: number;
  roughness: number;
  opacity: number;
  category: string;
}

const materialPresets: MaterialPreset[] = [
  // Metals
  { id: "steel", name: "Steel", color: "#8899aa", metalness: 0.9, roughness: 0.3, opacity: 1, category: "Metal" },
  { id: "aluminum", name: "Aluminum", color: "#c0c8d0", metalness: 0.85, roughness: 0.2, opacity: 1, category: "Metal" },
  { id: "copper", name: "Copper", color: "#b87333", metalness: 0.95, roughness: 0.2, opacity: 1, category: "Metal" },
  { id: "brass", name: "Brass", color: "#cd9b1d", metalness: 0.9, roughness: 0.25, opacity: 1, category: "Metal" },
  { id: "titanium", name: "Titanium", color: "#878681", metalness: 0.85, roughness: 0.35, opacity: 1, category: "Metal" },
  { id: "chrome", name: "Chrome", color: "#e8e8e8", metalness: 1.0, roughness: 0.05, opacity: 1, category: "Metal" },
  { id: "gold", name: "Gold", color: "#ffd700", metalness: 1.0, roughness: 0.1, opacity: 1, category: "Metal" },
  // Plastics
  { id: "abs_white", name: "ABS White", color: "#f0f0f0", metalness: 0.0, roughness: 0.6, opacity: 1, category: "Plastic" },
  { id: "abs_black", name: "ABS Black", color: "#2a2a2a", metalness: 0.0, roughness: 0.5, opacity: 1, category: "Plastic" },
  { id: "nylon", name: "Nylon", color: "#e8dcc8", metalness: 0.0, roughness: 0.7, opacity: 1, category: "Plastic" },
  { id: "polycarbonate", name: "Polycarbonate", color: "#d4e8f0", metalness: 0.05, roughness: 0.1, opacity: 0.85, category: "Plastic" },
  { id: "acrylic", name: "Acrylic", color: "#e0f0ff", metalness: 0.0, roughness: 0.05, opacity: 0.7, category: "Plastic" },
  // Other
  { id: "rubber", name: "Rubber", color: "#1a1a1a", metalness: 0.0, roughness: 0.95, opacity: 1, category: "Other" },
  { id: "wood_oak", name: "Oak Wood", color: "#a0724a", metalness: 0.0, roughness: 0.8, opacity: 1, category: "Other" },
  { id: "carbon_fiber", name: "Carbon Fiber", color: "#1a1a1a", metalness: 0.3, roughness: 0.4, opacity: 1, category: "Other" },
  { id: "ceramic", name: "Ceramic", color: "#f5f0e8", metalness: 0.05, roughness: 0.3, opacity: 1, category: "Other" },
  { id: "glass", name: "Glass", color: "#e0f0ff", metalness: 0.1, roughness: 0.0, opacity: 0.3, category: "Other" },
];

/**
 * Appearance/Material Editor with visual preview swatches.
 * Apply materials to selected objects with real-time preview.
 */
export default function AppearanceEditor({ onClose }: { onClose: () => void }) {
  const selectedId = useCadStore((s) => s.selectedId);
  const objects = useCadStore((s) => s.objects);
  const updateObject = useCadStore((s) => s.updateObject);

  const selectedObj = objects.find((o) => o.id === selectedId);
  const [activeCategory, setActiveCategory] = useState("Metal");
  const [customColor, setCustomColor] = useState(selectedObj?.color || "#4a9eff");
  const [customMetalness, setCustomMetalness] = useState(selectedObj?.metalness ?? 0.3);
  const [customRoughness, setCustomRoughness] = useState(selectedObj?.roughness ?? 0.5);
  const [customOpacity, setCustomOpacity] = useState(selectedObj?.opacity ?? 1.0);

  const categories = Array.from(new Set(materialPresets.map(m => m.category)));

  const handleApplyPreset = useCallback((preset: MaterialPreset) => {
    if (!selectedId) return;
    updateObject(selectedId, {
      color: preset.color,
      metalness: preset.metalness,
      roughness: preset.roughness,
      opacity: preset.opacity,
      material: preset.name.toLowerCase().replace(/\s/g, "_"),
    });
    setCustomColor(preset.color);
    setCustomMetalness(preset.metalness);
    setCustomRoughness(preset.roughness);
    setCustomOpacity(preset.opacity);
  }, [selectedId, updateObject]);

  const handleApplyCustom = useCallback(() => {
    if (!selectedId) return;
    updateObject(selectedId, {
      color: customColor,
      metalness: customMetalness,
      roughness: customRoughness,
      opacity: customOpacity,
    });
  }, [selectedId, updateObject, customColor, customMetalness, customRoughness, customOpacity]);

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto animate-scale-in">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl shadow-black/50 w-[380px] max-h-[75vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d]">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-[#00D4FF]" />
            <span className="text-sm font-semibold text-white">Appearance Editor</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#21262d] transition-all">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {!selectedId && (
            <div className="text-center py-6 text-[10px] text-slate-500">
              Select an object to edit its appearance.
            </div>
          )}

          {selectedId && (
            <>
              {/* Material Preview */}
              <div className="flex items-center gap-3 p-3 bg-[#0d1117] rounded-lg border border-[#21262d]">
                <div
                  className="w-14 h-14 rounded-lg shadow-inner"
                  style={{
                    background: `linear-gradient(135deg, ${customColor}, ${customColor}cc)`,
                    opacity: customOpacity,
                    boxShadow: customMetalness > 0.5
                      ? `inset 0 -2px 8px rgba(255,255,255,${customMetalness * 0.3}), 0 2px 8px rgba(0,0,0,0.3)`
                      : `inset 0 2px 4px rgba(0,0,0,${customRoughness * 0.3})`,
                  }}
                />
                <div>
                  <div className="text-[11px] font-medium text-white">{selectedObj?.name || "Object"}</div>
                  <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                    {customColor} · M:{customMetalness.toFixed(2)} · R:{customRoughness.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Category tabs */}
              <div className="flex gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex-1 py-1.5 rounded-md text-[9px] font-semibold transition-all ${
                      activeCategory === cat
                        ? "bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/25"
                        : "text-slate-500 hover:text-white hover:bg-[#21262d] border border-transparent"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Material presets grid */}
              <div className="grid grid-cols-4 gap-1.5">
                {materialPresets
                  .filter((m) => m.category === activeCategory)
                  .map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className="group flex flex-col items-center gap-1 p-2 rounded-lg border border-[#21262d] hover:border-[#00D4FF]/30 hover:bg-[#00D4FF]/5 transition-all"
                      title={`${preset.name}: Metalness ${preset.metalness}, Roughness ${preset.roughness}`}
                    >
                      <div
                        className="w-8 h-8 rounded-md shadow-sm group-hover:scale-110 transition-transform"
                        style={{
                          background: `linear-gradient(135deg, ${preset.color}, ${preset.color}cc)`,
                          opacity: preset.opacity,
                          boxShadow: preset.metalness > 0.5
                            ? `inset 0 -1px 4px rgba(255,255,255,${preset.metalness * 0.2})`
                            : undefined,
                        }}
                      />
                      <span className="text-[7px] text-slate-500 group-hover:text-white transition-colors truncate w-full text-center">
                        {preset.name}
                      </span>
                    </button>
                  ))}
              </div>

              {/* Custom sliders */}
              <div className="space-y-3 p-3 bg-[#0d1117] rounded-lg border border-[#21262d]">
                <div className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider">Custom Properties</div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-slate-400">Color</span>
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => { setCustomColor(e.target.value); handleApplyCustom(); }}
                      className="w-6 h-4 rounded cursor-pointer bg-transparent border-none"
                    />
                  </div>
                </div>

                {[
                  { label: "Metalness", value: customMetalness, setter: setCustomMetalness },
                  { label: "Roughness", value: customRoughness, setter: setCustomRoughness },
                  { label: "Opacity", value: customOpacity, setter: setCustomOpacity },
                ].map(({ label, value, setter }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-slate-400">{label}</span>
                      <span className="text-[8px] text-slate-600 font-mono">{value.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={value}
                      onChange={(e) => {
                        setter(parseFloat(e.target.value));
                      }}
                      onMouseUp={handleApplyCustom}
                      className="w-full h-1 bg-[#21262d] rounded-full appearance-none cursor-pointer accent-[#00D4FF]"
                    />
                  </div>
                ))}

                <button
                  onClick={handleApplyCustom}
                  className="w-full py-1.5 text-[9px] font-semibold text-[#00D4FF] bg-[#00D4FF]/10 border border-[#00D4FF]/20 rounded-md hover:bg-[#00D4FF]/20 transition-all"
                >
                  Apply Custom
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-4 py-2.5 border-t border-[#21262d]">
          <button onClick={onClose} className="px-3 py-1.5 text-[10px] text-slate-400 hover:text-white border border-[#21262d] rounded-md hover:bg-[#21262d] transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
