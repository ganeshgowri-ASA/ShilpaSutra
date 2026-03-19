"use client";
import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

const RendererViewport = dynamic(() => import("@/components/RendererViewport"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0a0e17] text-slate-500">
      Loading 3D renderer...
    </div>
  ),
});

interface PBRMaterial {
  color: string;
  metalness: number;
  roughness: number;
  emissive: string;
  emissiveIntensity: number;
  opacity: number;
  transparent: boolean;
}

interface LightConfig {
  id: string;
  type: "directional" | "point" | "spot" | "ambient";
  color: string;
  intensity: number;
  position: [number, number, number];
  castShadow: boolean;
}

type EnvironmentPreset = "sunset" | "dawn" | "night" | "warehouse" | "forest" | "apartment" | "studio" | "city" | "park" | "lobby";

const defaultMaterial: PBRMaterial = {
  color: "#c0c8d0",
  metalness: 0.5,
  roughness: 0.3,
  emissive: "#000000",
  emissiveIntensity: 0,
  opacity: 1,
  transparent: false,
};

const materialPresets: Record<string, PBRMaterial> = {
  "Chrome": { color: "#e8e8e8", metalness: 1.0, roughness: 0.05, emissive: "#000000", emissiveIntensity: 0, opacity: 1, transparent: false },
  "Brushed Steel": { color: "#8899aa", metalness: 0.9, roughness: 0.35, emissive: "#000000", emissiveIntensity: 0, opacity: 1, transparent: false },
  "Gold": { color: "#ffd700", metalness: 1.0, roughness: 0.15, emissive: "#000000", emissiveIntensity: 0, opacity: 1, transparent: false },
  "Copper": { color: "#b87333", metalness: 0.95, roughness: 0.2, emissive: "#000000", emissiveIntensity: 0, opacity: 1, transparent: false },
  "Matte Plastic": { color: "#e94560", metalness: 0, roughness: 0.9, emissive: "#000000", emissiveIntensity: 0, opacity: 1, transparent: false },
  "Glossy Plastic": { color: "#2266cc", metalness: 0, roughness: 0.1, emissive: "#000000", emissiveIntensity: 0, opacity: 1, transparent: false },
  "Rubber": { color: "#333333", metalness: 0, roughness: 1.0, emissive: "#000000", emissiveIntensity: 0, opacity: 1, transparent: false },
  "Glass": { color: "#ffffff", metalness: 0.1, roughness: 0.05, emissive: "#000000", emissiveIntensity: 0, opacity: 0.3, transparent: true },
  "Wood": { color: "#8B4513", metalness: 0, roughness: 0.7, emissive: "#000000", emissiveIntensity: 0, opacity: 1, transparent: false },
  "Ceramic": { color: "#f5f5f0", metalness: 0.1, roughness: 0.4, emissive: "#000000", emissiveIntensity: 0, opacity: 1, transparent: false },
};

const envPresets: EnvironmentPreset[] = ["sunset", "dawn", "night", "warehouse", "forest", "apartment", "studio", "city", "park", "lobby"];

export default function RendererPage() {
  const [geometry, setGeometry] = useState<"box" | "cylinder" | "sphere" | "torus" | "torusKnot">("sphere");
  const [material, setMaterial] = useState<PBRMaterial>(defaultMaterial);
  const [envPreset, setEnvPreset] = useState<EnvironmentPreset>("studio");
  const [envIntensity, setEnvIntensity] = useState(1.0);
  const [showShadows, setShowShadows] = useState(true);
  const [showGround, setShowGround] = useState(true);
  const [groundColor, setGroundColor] = useState("#1a1a2e");
  const [bgColor, setBgColor] = useState("#0a0e17");
  const [lights, setLights] = useState<LightConfig[]>([
    { id: "key", type: "directional", color: "#ffffff", intensity: 1.0, position: [5, 8, 5], castShadow: true },
    { id: "fill", type: "directional", color: "#8899ff", intensity: 0.4, position: [-3, 4, -5], castShadow: false },
    { id: "ambient", type: "ambient", color: "#ffffff", intensity: 0.3, position: [0, 0, 0], castShadow: false },
  ]);
  const [tab, setTab] = useState<"material" | "lighting" | "scene" | "export">("material");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const applyPreset = (name: string) => {
    const preset = materialPresets[name];
    if (preset) setMaterial({ ...preset });
  };

  const updateLight = (id: string, updates: Partial<LightConfig>) => {
    setLights((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  const addLight = () => {
    setLights((prev) => [
      ...prev,
      {
        id: `light_${Date.now()}`,
        type: "point",
        color: "#ffffff",
        intensity: 1.0,
        position: [Math.random() * 6 - 3, 3 + Math.random() * 3, Math.random() * 6 - 3],
        castShadow: false,
      },
    ]);
  };

  const removeLight = (id: string) => {
    setLights((prev) => prev.filter((l) => l.id !== id));
  };

  const exportImage = useCallback((format: "png" | "jpeg") => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `shilpasutra-render.${format}`;
    link.href = canvas.toDataURL(`image/${format}`, format === "jpeg" ? 0.95 : undefined);
    link.click();
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#21262d] px-4 py-2 flex items-center gap-3 shrink-0">
        <span className="text-xs font-bold text-[#e94560]">Photo Renderer</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          {(["box", "cylinder", "sphere", "torus", "torusKnot"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGeometry(g)}
              className={`text-[10px] px-2 py-1 rounded capitalize ${
                geometry === g ? "bg-[#e94560] text-white" : "bg-[#21262d] text-slate-400 hover:text-white"
              }`}
            >
              {g === "torusKnot" ? "Knot" : g}
            </button>
          ))}
        </div>
        <div className="h-5 w-px bg-[#21262d]" />
        <button
          onClick={() => exportImage("png")}
          className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded font-semibold"
        >
          Export PNG
        </button>
        <button
          onClick={() => exportImage("jpeg")}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded font-semibold"
        >
          Export JPEG
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-72 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-[#21262d]">
            {(["material", "lighting", "scene", "export"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 ${
                  tab === t ? "border-[#e94560] text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {tab === "material" && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase">Material Presets</h3>
                <div className="grid grid-cols-2 gap-1">
                  {Object.keys(materialPresets).map((name) => (
                    <button
                      key={name}
                      onClick={() => applyPreset(name)}
                      className="text-[10px] py-1.5 px-2 rounded bg-[#0d1117] border border-[#21262d] text-slate-300 hover:border-[#e94560] hover:text-white transition-colors text-left"
                    >
                      {name}
                    </button>
                  ))}
                </div>

                <h3 className="text-xs font-bold text-slate-300 uppercase mt-4">PBR Properties</h3>
                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500">Color</span>
                      <input type="color" value={material.color} onChange={(e) => setMaterial({ ...material, color: e.target.value })} className="w-8 h-6 rounded cursor-pointer" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500">Metalness</span>
                      <span className="text-slate-400 text-[10px]">{material.metalness.toFixed(2)}</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.01" value={material.metalness} onChange={(e) => setMaterial({ ...material, metalness: parseFloat(e.target.value) })} className="w-full accent-[#e94560]" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500">Roughness</span>
                      <span className="text-slate-400 text-[10px]">{material.roughness.toFixed(2)}</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.01" value={material.roughness} onChange={(e) => setMaterial({ ...material, roughness: parseFloat(e.target.value) })} className="w-full accent-[#e94560]" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500">Emissive</span>
                      <input type="color" value={material.emissive} onChange={(e) => setMaterial({ ...material, emissive: e.target.value })} className="w-8 h-6 rounded cursor-pointer" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500">Emissive Intensity</span>
                      <span className="text-slate-400 text-[10px]">{material.emissiveIntensity.toFixed(2)}</span>
                    </div>
                    <input type="range" min="0" max="5" step="0.1" value={material.emissiveIntensity} onChange={(e) => setMaterial({ ...material, emissiveIntensity: parseFloat(e.target.value) })} className="w-full accent-[#e94560]" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500">Opacity</span>
                      <span className="text-slate-400 text-[10px]">{material.opacity.toFixed(2)}</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.01" value={material.opacity} onChange={(e) => setMaterial({ ...material, opacity: parseFloat(e.target.value), transparent: parseFloat(e.target.value) < 1 })} className="w-full accent-[#e94560]" />
                  </div>
                </div>
              </div>
            )}

            {tab === "lighting" && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase">Lights</h3>
                <button onClick={addLight} className="w-full bg-[#21262d] hover:bg-[#30363d] text-xs py-2 rounded text-white border border-[#21262d]">
                  + Add Light
                </button>
                {lights.map((light) => (
                  <div key={light.id} className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-400 font-medium capitalize">{light.type}</span>
                      <button onClick={() => removeLight(light.id)} className="text-slate-600 hover:text-red-400 text-[10px]">remove</button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Type</span>
                      <select value={light.type} onChange={(e) => updateLight(light.id, { type: e.target.value as LightConfig["type"] })} className="bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-[11px]">
                        <option value="directional">Directional</option>
                        <option value="point">Point</option>
                        <option value="spot">Spot</option>
                        <option value="ambient">Ambient</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Color</span>
                      <input type="color" value={light.color} onChange={(e) => updateLight(light.id, { color: e.target.value })} className="w-8 h-6 rounded cursor-pointer" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-500">Intensity</span>
                        <span className="text-slate-400 text-[10px]">{light.intensity.toFixed(1)}</span>
                      </div>
                      <input type="range" min="0" max="5" step="0.1" value={light.intensity} onChange={(e) => updateLight(light.id, { intensity: parseFloat(e.target.value) })} className="w-full accent-yellow-500" />
                    </div>
                    {light.type !== "ambient" && (
                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={light.castShadow} onChange={(e) => updateLight(light.id, { castShadow: e.target.checked })} className="accent-[#e94560]" />
                        Cast Shadow
                      </label>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === "scene" && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase">Environment</h3>
                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">HDR Preset</span>
                    <select value={envPreset} onChange={(e) => setEnvPreset(e.target.value as EnvironmentPreset)} className="bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d]">
                      {envPresets.map((p) => (<option key={p} value={p}>{p}</option>))}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500">Env Intensity</span>
                      <span className="text-slate-400 text-[10px]">{envIntensity.toFixed(1)}</span>
                    </div>
                    <input type="range" min="0" max="3" step="0.1" value={envIntensity} onChange={(e) => setEnvIntensity(parseFloat(e.target.value))} className="w-full accent-[#e94560]" />
                  </div>
                </div>

                <h3 className="text-xs font-bold text-slate-300 uppercase mt-4">Ground</h3>
                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={showGround} onChange={(e) => setShowGround(e.target.checked)} className="accent-[#e94560]" />
                    Show Ground Plane
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={showShadows} onChange={(e) => setShowShadows(e.target.checked)} className="accent-[#e94560]" />
                    Contact Shadows
                  </label>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Ground Color</span>
                    <input type="color" value={groundColor} onChange={(e) => setGroundColor(e.target.value)} className="w-8 h-6 rounded cursor-pointer" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">BG Color</span>
                    <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-8 h-6 rounded cursor-pointer" />
                  </div>
                </div>
              </div>
            )}

            {tab === "export" && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase">Export Render</h3>
                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-3">
                  <div className="text-slate-400 mb-2">Export the current viewport as an image.</div>
                  <button
                    onClick={() => exportImage("png")}
                    className="w-full bg-green-600 hover:bg-green-500 py-2 rounded text-xs font-bold text-white"
                  >
                    Export as PNG (lossless)
                  </button>
                  <button
                    onClick={() => exportImage("jpeg")}
                    className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded text-xs font-bold text-white"
                  >
                    Export as JPEG (95% quality)
                  </button>
                </div>
                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs">
                  <div className="text-slate-400 mb-1">Render Info</div>
                  <div className="text-slate-500">Geometry: <span className="text-white capitalize">{geometry}</span></div>
                  <div className="text-slate-500">Environment: <span className="text-white capitalize">{envPreset}</span></div>
                  <div className="text-slate-500">Lights: <span className="text-white">{lights.length}</span></div>
                  <div className="text-slate-500">Shadows: <span className="text-white">{showShadows ? "On" : "Off"}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3D Viewport */}
        <div className="flex-1 relative">
          <RendererViewport
            geometry={geometry}
            material={material}
            envPreset={envPreset}
            envIntensity={envIntensity}
            lights={lights}
            showShadows={showShadows}
            showGround={showGround}
            groundColor={groundColor}
            bgColor={bgColor}
          />
        </div>
      </div>
    </div>
  );
}
