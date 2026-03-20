"use client";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Camera,
  Sun,
  Palette,
  Download,
  RotateCw,
  Eye,
  Box,
  Circle,
  Square,
  MonitorPlay,
} from "lucide-react";

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

interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
}

type EnvironmentPreset = "sunset" | "dawn" | "night" | "warehouse" | "forest" | "apartment" | "studio" | "city" | "park" | "lobby";
type RenderQuality = "draft" | "standard" | "high";
type BgMode = "solid" | "gradient" | "transparent" | "environment";
type Resolution = "720p" | "1080p" | "4k";

const defaultMaterial: PBRMaterial = {
  color: "#c0c8d0", metalness: 0.5, roughness: 0.3,
  emissive: "#000000", emissiveIntensity: 0, opacity: 1, transparent: false,
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

const envPresets: { id: EnvironmentPreset; label: string; category: string }[] = [
  { id: "studio", label: "Studio", category: "Indoor" },
  { id: "warehouse", label: "Workshop", category: "Indoor" },
  { id: "lobby", label: "Showroom", category: "Indoor" },
  { id: "apartment", label: "Apartment", category: "Indoor" },
  { id: "sunset", label: "Sunset", category: "Outdoor" },
  { id: "dawn", label: "Dawn", category: "Outdoor" },
  { id: "park", label: "Park", category: "Outdoor" },
  { id: "forest", label: "Forest", category: "Outdoor" },
  { id: "city", label: "City", category: "HDR Sky" },
  { id: "night", label: "Night", category: "HDR Sky" },
];

const cameraPresets: { label: string; shortLabel: string; preset: CameraPreset }[] = [
  { label: "Front", shortLabel: "F", preset: { position: [0, 1.5, 6], target: [0, 1.5, 0] } },
  { label: "Back", shortLabel: "Bk", preset: { position: [0, 1.5, -6], target: [0, 1.5, 0] } },
  { label: "Left", shortLabel: "L", preset: { position: [-6, 1.5, 0], target: [0, 1.5, 0] } },
  { label: "Right", shortLabel: "R", preset: { position: [6, 1.5, 0], target: [0, 1.5, 0] } },
  { label: "Top", shortLabel: "T", preset: { position: [0, 8, 0], target: [0, 0, 0] } },
  { label: "Bottom", shortLabel: "Bt", preset: { position: [0, -6, 0], target: [0, 1.5, 0] } },
  { label: "Isometric", shortLabel: "Iso", preset: { position: [4, 3, 4], target: [0, 1, 0] } },
];

export default function RendererPage() {
  const [geometry, setGeometry] = useState<"box" | "cylinder" | "sphere" | "torus" | "torusKnot">("sphere");
  const [material, setMaterial] = useState<PBRMaterial>(defaultMaterial);
  const [envPreset, setEnvPreset] = useState<EnvironmentPreset>("studio");
  const [envIntensity, setEnvIntensity] = useState(1.0);
  const [showShadows, setShowShadows] = useState(true);
  const [showGround, setShowGround] = useState(true);
  const [groundColor, setGroundColor] = useState("#1a1a2e");
  const [bgColor, setBgColor] = useState("#0a0e17");
  const [bgMode, setBgMode] = useState<BgMode>("solid");
  const [lights, setLights] = useState<LightConfig[]>([
    { id: "key", type: "directional", color: "#ffffff", intensity: 1.0, position: [5, 8, 5], castShadow: true },
    { id: "fill", type: "directional", color: "#8899ff", intensity: 0.4, position: [-3, 4, -5], castShadow: false },
    { id: "rim", type: "point", color: "#ff8844", intensity: 0.6, position: [0, 3, -4], castShadow: false },
  ]);
  const [tab, setTab] = useState<"material" | "lighting" | "camera" | "export">("material");
  const [fov, setFov] = useState(50);
  const [dofEnabled, setDofEnabled] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [rotateSpeed, setRotateSpeed] = useState(1.0);
  const [renderQuality, setRenderQuality] = useState<RenderQuality>("draft");
  const [resolution, setResolution] = useState<Resolution>("1080p");
  const [splitView, setSplitView] = useState(false);
  const [activeCameraPreset, setActiveCameraPreset] = useState<CameraPreset | null>(null);
  const [antialiasing, setAntialiasing] = useState(true);
  const [showEnvMap, setShowEnvMap] = useState(true);
  const [showAO, setShowAO] = useState(false);

  const applyPreset = (name: string) => {
    const preset = materialPresets[name];
    if (preset) setMaterial({ ...preset });
  };

  const updateLight = (id: string, updates: Partial<LightConfig>) => {
    setLights(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const addLight = () => {
    setLights(prev => [...prev, {
      id: `light_${Date.now()}`, type: "point", color: "#ffffff", intensity: 1.0,
      position: [Math.random() * 6 - 3, 3 + Math.random() * 3, Math.random() * 6 - 3], castShadow: false,
    }]);
  };

  const removeLight = (id: string) => setLights(prev => prev.filter(l => l.id !== id));

  const exportImage = useCallback((format: "png" | "jpeg") => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `shilpasutra-render-${resolution}.${format}`;
    link.href = canvas.toDataURL(`image/${format}`, format === "jpeg" ? 0.95 : undefined);
    link.click();
  }, [resolution]);

  const tabIcons = {
    material: <Palette size={11} />,
    lighting: <Sun size={11} />,
    camera: <Camera size={11} />,
    export: <Download size={11} />,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#21262d] px-4 py-2 flex items-center gap-2 shrink-0">
        <span className="text-xs font-bold text-[#00D4FF]">Photo Renderer</span>
        <div className="h-5 w-px bg-[#21262d] mx-1" />

        {/* Geometry selector */}
        {(["box", "cylinder", "sphere", "torus", "torusKnot"] as const).map(g => (
          <button key={g} onClick={() => setGeometry(g)}
            className={`text-[10px] px-2 py-1 rounded capitalize ${geometry === g ? "bg-[#00D4FF] text-black font-bold" : "bg-[#21262d] text-slate-400 hover:text-white"}`}>
            {g === "torusKnot" ? "Knot" : g}
          </button>
        ))}

        <div className="flex-1" />

        {/* Camera presets in header */}
        <div className="flex items-center gap-0.5 mr-2">
          <Camera size={11} className="text-slate-500 mr-1" />
          {cameraPresets.map(cp => (
            <button
              key={cp.label}
              onClick={() => setActiveCameraPreset({ ...cp.preset })}
              title={cp.label}
              className="text-[9px] px-1.5 py-0.5 rounded bg-[#21262d] text-slate-400 hover:text-white hover:bg-[#30363d] transition-colors"
            >
              {cp.shortLabel}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-[#21262d]" />

        {/* Quality */}
        <select value={renderQuality} onChange={e => setRenderQuality(e.target.value as RenderQuality)}
          className="bg-[#21262d] text-[10px] text-white rounded px-2 py-1 border border-[#30363d]">
          <option value="draft">Draft</option>
          <option value="standard">Standard (4x)</option>
          <option value="high">High Quality</option>
        </select>

        <button onClick={() => setSplitView(!splitView)}
          className={`text-[10px] px-2 py-1 rounded flex items-center gap-1 ${splitView ? "bg-purple-600 text-white" : "bg-[#21262d] text-slate-400"}`}>
          <MonitorPlay size={11} /> Split
        </button>

        <button onClick={() => setAutoRotate(!autoRotate)}
          className={`text-[10px] px-2 py-1 rounded flex items-center gap-1 ${autoRotate ? "bg-amber-500 text-black" : "bg-[#21262d] text-slate-400"}`}>
          <RotateCw size={11} /> Turntable
        </button>

        <div className="h-5 w-px bg-[#21262d]" />
        <button onClick={() => exportImage("png")}
          className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded font-semibold">
          PNG
        </button>
        <button onClick={() => exportImage("jpeg")}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded font-semibold">
          JPEG
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-72 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0">
          <div className="flex border-b border-[#21262d]">
            {(["material", "lighting", "camera", "export"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 flex items-center justify-center gap-1 ${tab === t ? "border-[#00D4FF] text-white" : "border-transparent text-slate-500"}`}>
                {tabIcons[t]} {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {tab === "material" && (
              <>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Presets</h3>
                <div className="grid grid-cols-2 gap-1">
                  {Object.keys(materialPresets).map(name => (
                    <button key={name} onClick={() => applyPreset(name)}
                      className="text-[10px] py-1.5 px-2 rounded bg-[#0d1117] border border-[#21262d] text-slate-300 hover:border-[#00D4FF] hover:text-white text-left">
                      {name}
                    </button>
                  ))}
                </div>

                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3">PBR Properties</h3>
                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Color</span>
                    <input type="color" value={material.color} onChange={e => setMaterial({ ...material, color: e.target.value })} className="w-8 h-6 rounded cursor-pointer" />
                  </div>
                  {[
                    { key: "metalness", label: "Metalness", max: 1, step: 0.01 },
                    { key: "roughness", label: "Roughness", max: 1, step: 0.01 },
                    { key: "emissiveIntensity", label: "Emissive Int.", max: 5, step: 0.1 },
                    { key: "opacity", label: "Opacity", max: 1, step: 0.01 },
                  ].map(p => (
                    <div key={p.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-500">{p.label}</span>
                        <span className="text-slate-400 text-[10px]">{((material as unknown as Record<string, number>)[p.key]).toFixed(2)}</span>
                      </div>
                      <input type="range" min="0" max={p.max} step={p.step}
                        value={(material as unknown as Record<string, number>)[p.key]}
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          setMaterial(prev => ({ ...prev, [p.key]: val, ...(p.key === "opacity" && val < 1 ? { transparent: true } : p.key === "opacity" ? { transparent: false } : {}) }));
                        }}
                        className="w-full accent-[#00D4FF]" />
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Emissive</span>
                    <input type="color" value={material.emissive} onChange={e => setMaterial({ ...material, emissive: e.target.value })} className="w-8 h-6 rounded cursor-pointer" />
                  </div>
                </div>
              </>
            )}

            {tab === "lighting" && (
              <>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Environment Map</h3>
                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={showEnvMap} onChange={e => setShowEnvMap(e.target.checked)} className="accent-[#00D4FF]" />
                    Enable Environment Map
                  </label>
                  <div className={`grid grid-cols-2 gap-1 ${!showEnvMap ? "opacity-40 pointer-events-none" : ""}`}>
                    {envPresets.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setEnvPreset(p.id)}
                        className={`text-[10px] py-1.5 px-2 rounded text-left ${envPreset === p.id ? "bg-[#00D4FF]/20 border-[#00D4FF] text-[#00D4FF]" : "bg-[#161b22] border-[#21262d] text-slate-400 hover:text-white"} border`}
                      >
                        <div className="font-medium">{p.label}</div>
                        <div className="text-[8px] text-slate-600">{p.category}</div>
                      </button>
                    ))}
                  </div>
                  <div className={!showEnvMap ? "opacity-40 pointer-events-none" : ""}>
                    <div className="flex items-center justify-between mb-1 mt-2">
                      <span className="text-slate-500">Intensity</span>
                      <span className="text-slate-400 text-[10px]">{envIntensity.toFixed(1)}</span>
                    </div>
                    <input type="range" min="0" max="3" step="0.1" value={envIntensity}
                      onChange={e => setEnvIntensity(parseFloat(e.target.value))} className="w-full accent-[#00D4FF]" />
                  </div>
                </div>

                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Post-Processing</h3>
                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={showAO} onChange={e => setShowAO(e.target.checked)} className="accent-[#00D4FF]" />
                    Ambient Occlusion
                  </label>
                  {showAO && (
                    <div className="text-[10px] text-slate-500 bg-[#161b22] rounded px-2 py-1.5">
                      SSAO enabled — darkens crevices and contact areas for depth
                    </div>
                  )}
                </div>

                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Lights</h3>
                <button onClick={addLight}
                  className="w-full bg-[#21262d] hover:bg-[#30363d] text-xs py-1.5 rounded text-white border border-[#21262d]">
                  + Add Light
                </button>
                {lights.map(light => (
                  <div key={light.id} className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-400 font-medium capitalize">{light.id} ({light.type})</span>
                      <button onClick={() => removeLight(light.id)} className="text-slate-600 hover:text-red-400 text-[10px]">remove</button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Color</span>
                      <input type="color" value={light.color} onChange={e => updateLight(light.id, { color: e.target.value })} className="w-8 h-6 rounded cursor-pointer" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-500">Intensity</span>
                        <span className="text-slate-400 text-[10px]">{light.intensity.toFixed(1)}</span>
                      </div>
                      <input type="range" min="0" max="5" step="0.1" value={light.intensity}
                        onChange={e => updateLight(light.id, { intensity: parseFloat(e.target.value) })} className="w-full accent-yellow-500" />
                    </div>
                    {light.type !== "ambient" && (
                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={light.castShadow}
                          onChange={e => updateLight(light.id, { castShadow: e.target.checked })} className="accent-[#00D4FF]" />
                        Shadow
                      </label>
                    )}
                  </div>
                ))}
              </>
            )}

            {tab === "camera" && (
              <>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Camera Presets</h3>
                <div className="grid grid-cols-4 gap-1">
                  {cameraPresets.map(cp => (
                    <button
                      key={cp.label}
                      onClick={() => setActiveCameraPreset({ ...cp.preset })}
                      className="text-[10px] py-2 rounded bg-[#0d1117] border border-[#21262d] text-slate-300 hover:border-[#00D4FF] hover:text-[#00D4FF] transition-colors text-center"
                      title={cp.label}
                    >
                      {cp.shortLabel}
                    </button>
                  ))}
                </div>

                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3">Camera Settings</h3>
                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500">FOV</span>
                      <span className="text-slate-400 text-[10px]">{fov}</span>
                    </div>
                    <input type="range" min="20" max="120" value={fov}
                      onChange={e => setFov(parseInt(e.target.value))} className="w-full accent-[#00D4FF]" />
                  </div>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={dofEnabled} onChange={e => setDofEnabled(e.target.checked)} className="accent-[#00D4FF]" />
                    Depth of Field
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={antialiasing} onChange={e => setAntialiasing(e.target.checked)} className="accent-[#00D4FF]" />
                    Anti-Aliasing
                  </label>
                </div>

                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Scene</h3>
                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Background</span>
                    <select value={bgMode} onChange={e => setBgMode(e.target.value as BgMode)}
                      className="bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d]">
                      <option value="solid">Solid Color</option>
                      <option value="gradient">Gradient</option>
                      <option value="transparent">Transparent</option>
                      <option value="environment">Environment</option>
                    </select>
                  </div>
                  {bgMode === "solid" && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">BG Color</span>
                      <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-6 rounded cursor-pointer" />
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={showGround} onChange={e => setShowGround(e.target.checked)} className="accent-[#00D4FF]" />
                    Ground Plane
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={showShadows} onChange={e => setShowShadows(e.target.checked)} className="accent-[#00D4FF]" />
                    Contact Shadows
                  </label>
                  {showGround && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Ground Color</span>
                      <input type="color" value={groundColor} onChange={e => setGroundColor(e.target.value)} className="w-8 h-6 rounded cursor-pointer" />
                    </div>
                  )}
                </div>

                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Turntable</h3>
                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={autoRotate} onChange={e => setAutoRotate(e.target.checked)} className="accent-[#00D4FF]" />
                    Auto-Rotate
                  </label>
                  {autoRotate && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-500">Speed</span>
                        <span className="text-slate-400 text-[10px]">{rotateSpeed.toFixed(1)}x</span>
                      </div>
                      <input type="range" min="0.1" max="5" step="0.1" value={rotateSpeed}
                        onChange={e => setRotateSpeed(parseFloat(e.target.value))} className="w-full accent-[#00D4FF]" />
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === "export" && (
              <>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Screenshot</h3>
                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Resolution</span>
                    <select value={resolution} onChange={e => setResolution(e.target.value as Resolution)}
                      className="bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d]">
                      <option value="720p">720p (1280x720)</option>
                      <option value="1080p">1080p (1920x1080)</option>
                      <option value="4k">4K (3840x2160)</option>
                    </select>
                  </div>
                  <button onClick={() => exportImage("png")}
                    className="w-full bg-green-600 hover:bg-green-500 py-2 rounded text-xs font-bold text-white">
                    Export PNG (lossless)
                  </button>
                  <button onClick={() => exportImage("jpeg")}
                    className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded text-xs font-bold text-white">
                    Export JPEG (95%)
                  </button>
                </div>

                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3">Render Info</h3>
                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-1">
                  <div className="text-slate-500">Geometry: <span className="text-white capitalize">{geometry}</span></div>
                  <div className="text-slate-500">Environment: <span className="text-white capitalize">{envPreset}</span></div>
                  <div className="text-slate-500">Lights: <span className="text-white">{lights.length}</span></div>
                  <div className="text-slate-500">Quality: <span className="text-white capitalize">{renderQuality}</span></div>
                  <div className="text-slate-500">Shadows: <span className="text-white">{showShadows ? "On" : "Off"}</span></div>
                  <div className="text-slate-500">Env Map: <span className="text-white">{showEnvMap ? "On" : "Off"}</span></div>
                  <div className="text-slate-500">Ambient Occlusion: <span className="text-white">{showAO ? "On" : "Off"}</span></div>
                  <div className="text-slate-500">Anti-Aliasing: <span className="text-white">{antialiasing ? "On" : "Off"}</span></div>
                  <div className="text-slate-500">Auto-Rotate: <span className="text-white">{autoRotate ? "On" : "Off"}</span></div>
                </div>
              </>
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
            showEnvMap={showEnvMap}
            showAO={showAO}
            lights={lights}
            showShadows={showShadows}
            showGround={showGround}
            groundColor={groundColor}
            bgColor={bgColor}
            autoRotate={autoRotate}
            rotateSpeed={rotateSpeed}
            fov={fov}
            cameraPreset={activeCameraPreset}
            antialias={antialiasing}
          />

          {/* Viewport info */}
          <div className="absolute top-2 right-2 text-[10px] text-slate-600 bg-[#0d1117]/60 rounded px-2 py-1">
            {renderQuality} | {envPreset} | {lights.length} lights {autoRotate && "| rotating"}
          </div>
        </div>
      </div>
    </div>
  );
}
