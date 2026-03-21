"use client";
import { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Link from "next/link";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";

// ── Step definitions ──────────────────────────────────────────────────────
const PART_TYPES = [
  { id: "bracket",   label: "Bracket",   desc: "L or U shaped mounting bracket", fields: ["width","height","thickness","holeCount"] },
  { id: "enclosure", label: "Enclosure", desc: "Box/case for electronics or parts", fields: ["width","height","depth","wallThickness"] },
  { id: "pipe",      label: "Pipe",      desc: "Hollow cylindrical pipe or tube", fields: ["diameter","length","wallThickness"] },
  { id: "gear",      label: "Gear",      desc: "Spur gear with custom tooth count", fields: ["teeth","module","thickness","boreD"] },
  { id: "frame",     label: "Frame",     desc: "Rectangular structural frame",   fields: ["width","height","depth","profileSize"] },
  { id: "custom",    label: "Custom",    desc: "Describe in natural language",    fields: ["prompt"] },
];

const MATERIALS = [
  { id: "steel",    label: "Steel",    desc: "AISI 304", color: "#7a8a9a", E: 200, yield: 250 },
  { id: "aluminum", label: "Aluminum", desc: "6061-T6",  color: "#c0c8d0", E: 69,  yield: 276 },
  { id: "plastic",  label: "Plastic",  desc: "ABS",      color: "#e8d8a0", E: 2.3, yield: 40  },
  { id: "wood",     label: "Wood",     desc: "Pine",     color: "#c8a060", E: 12,  yield: 30  },
  { id: "concrete", label: "Concrete", desc: "C25/30",   color: "#9090a0", E: 30,  yield: 25  },
];

const FIELD_LABELS: Record<string, { label: string; unit: string; def: number }> = {
  width:         { label: "Width",          unit: "mm", def: 50  },
  height:        { label: "Height",         unit: "mm", def: 50  },
  depth:         { label: "Depth",          unit: "mm", def: 50  },
  thickness:     { label: "Thickness",      unit: "mm", def: 5   },
  wallThickness: { label: "Wall Thickness", unit: "mm", def: 3   },
  holeCount:     { label: "Mounting Holes", unit: "",   def: 2   },
  diameter:      { label: "Diameter",       unit: "mm", def: 100 },
  length:        { label: "Length",         unit: "mm", def: 500 },
  teeth:         { label: "Teeth Count",    unit: "",   def: 20  },
  module:        { label: "Module",         unit: "",   def: 2   },
  boreD:         { label: "Bore Diameter",  unit: "mm", def: 15  },
  profileSize:   { label: "Profile Size",   unit: "mm", def: 40  },
  prompt:        { label: "Description",    unit: "",   def: 0   },
};

// ── Mini 3D Preview ───────────────────────────────────────────────────────
function WizardPreview({ partId, dims, matColor }: { partId: string; dims: Record<string, number>; matColor: string }) {
  const s = (mm: number) => Math.max(0.05, mm / 100);
  const mat = <meshStandardMaterial color={matColor} metalness={0.3} roughness={0.5} />;
  if (partId === "gear") {
    const r = ((dims.teeth || 20) * (dims.module || 2)) / 2 / 100;
    return (
      <group>
        <mesh><cylinderGeometry args={[r, r, s(dims.thickness || 10), 32]} />{mat}</mesh>
        {Array.from({ length: Math.min(dims.teeth || 20, 24) }, (_, i) => {
          const a = (i / (dims.teeth || 20)) * Math.PI * 2;
          return <mesh key={i} position={[Math.cos(a) * r * 1.18, 0, Math.sin(a) * r * 1.18]} rotation={[0, a, 0]}>
            <boxGeometry args={[0.05, s(dims.thickness || 10), 0.035]} />{mat}
          </mesh>;
        })}
      </group>
    );
  }
  if (partId === "pipe") {
    const r = s(dims.diameter || 100) / 2;
    const wr = Math.max(0.01, r - s(dims.wallThickness || 5));
    return (
      <group>
        <mesh><cylinderGeometry args={[r, r, s(dims.length || 500), 32, 1, true]} />{mat}</mesh>
        <mesh><cylinderGeometry args={[wr, wr, s(dims.length || 500), 32, 1, true]} />
          <meshStandardMaterial color={matColor} side={1} metalness={0.3} roughness={0.5} transparent opacity={0.5} />
        </mesh>
      </group>
    );
  }
  if (partId === "bracket") {
    const w = s(dims.width || 50), h = s(dims.height || 50), t = s(dims.thickness || 5);
    return (
      <group>
        <mesh position={[0, 0, t / 2]}><boxGeometry args={[w, t, t * 5]} />{mat}</mesh>
        <mesh position={[-w / 2 + t / 2, h / 2, 0]}><boxGeometry args={[t, h, t * 5]} />{mat}</mesh>
      </group>
    );
  }
  if (partId === "frame") {
    const w = s(dims.width || 200), h = s(dims.height || 150), d = s(dims.depth || 10), p = s(dims.profileSize || 40);
    return (
      <group>
        <mesh position={[0, h / 2, 0]}><boxGeometry args={[w, p, d]} />{mat}</mesh>
        <mesh position={[0, -h / 2, 0]}><boxGeometry args={[w, p, d]} />{mat}</mesh>
        <mesh position={[-w / 2, 0, 0]}><boxGeometry args={[p, h, d]} />{mat}</mesh>
        <mesh position={[w / 2, 0, 0]}><boxGeometry args={[p, h, d]} />{mat}</mesh>
      </group>
    );
  }
  // enclosure or custom → box
  return <mesh><boxGeometry args={[s(dims.width || 100), s(dims.height || 60), s(dims.depth || 40)]} />{mat}</mesh>;
}

// ── Wizard ────────────────────────────────────────────────────────────────
export default function WizardPage() {
  const [step, setStep] = useState(1);
  const [partId, setPartId]     = useState("");
  const [dims, setDims]         = useState<Record<string, number>>({});
  const [matId, setMatId]       = useState("steel");
  const [prompt, setPrompt]     = useState("");
  const [done, setDone]         = useState(false);

  const part     = PART_TYPES.find(p => p.id === partId);
  const material = MATERIALS.find(m => m.id === matId) || MATERIALS[0];

  const setDim = (k: string, v: string) => setDims(d => ({ ...d, [k]: parseFloat(v) || 0 }));
  const getDim = (k: string) => dims[k] ?? FIELD_LABELS[k]?.def ?? 0;

  const canNext = () => {
    if (step === 1) return !!partId;
    if (step === 2) return true;
    if (step === 3) return !!matId;
    return true;
  };

  const STEPS = ["What to design", "Enter dimensions", "Choose material", "Preview", "Analyze & Export"];

  return (
    <div className="flex-1 flex flex-col bg-[#0d1117] text-white overflow-hidden">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#21262d] px-6 py-3 flex items-center gap-4 flex-shrink-0">
        <span className="text-sm font-bold text-[#00D4FF]">Design Wizard</span>
        <span className="text-slate-600 text-xs">Step-by-step guided design for everyone</span>
      </div>

      {/* Step progress */}
      <div className="bg-[#161b22] border-b border-[#21262d] px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all ${step === i + 1 ? "bg-[#00D4FF]/20 text-[#00D4FF] font-semibold" : done || step > i + 1 ? "text-green-400" : "text-slate-500"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === i + 1 ? "bg-[#00D4FF] text-black" : step > i + 1 ? "bg-green-500 text-white" : "bg-[#21262d] text-slate-400"}`}>
                  {step > i + 1 ? <Check size={10} /> : i + 1}
                </span>
                {s}
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={14} className="text-slate-700 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left – step content */}
        <div className="w-96 border-r border-[#21262d] flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="p-6 flex-1">

            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-white">What are you designing?</h2>
                <p className="text-xs text-slate-500">Choose the type of part to design. The wizard will guide you through the rest.</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {PART_TYPES.map(p => (
                    <button key={p.id} onClick={() => setPartId(p.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${partId === p.id ? "border-[#00D4FF]/60 bg-[#00D4FF]/10" : "border-[#21262d] hover:border-[#30363d] bg-[#161b22]"}`}>
                      <div className={`text-sm font-semibold ${partId === p.id ? "text-[#00D4FF]" : "text-white"}`}>{p.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && part && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-white">Enter dimensions</h2>
                <p className="text-xs text-slate-500">Fill in the dimensions for your {part.label.toLowerCase()}.</p>
                {part.id === "custom" ? (
                  <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={5}
                    placeholder="Describe what you want to create in detail..."
                    className="w-full bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#00D4FF] resize-none mt-4" />
                ) : (
                  <div className="space-y-3 mt-4">
                    {part.fields.map(f => {
                      const fl = FIELD_LABELS[f];
                      return (
                        <div key={f}>
                          <label className="text-xs text-slate-400 mb-1 block">{fl.label} {fl.unit && <span className="text-slate-600">({fl.unit})</span>}</label>
                          <input type="number" value={getDim(f) || fl.def} onChange={e => setDim(f, e.target.value)}
                            className="w-full bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#00D4FF]" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-white">Choose material</h2>
                <p className="text-xs text-slate-500">Select the material for strength and weight calculations.</p>
                <div className="space-y-2 mt-4">
                  {MATERIALS.map(m => (
                    <button key={m.id} onClick={() => setMatId(m.id)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${matId === m.id ? "border-[#00D4FF]/60 bg-[#00D4FF]/10" : "border-[#21262d] hover:border-[#30363d] bg-[#161b22]"}`}>
                      <div className="w-6 h-6 rounded-full border-2 border-white/20 flex-shrink-0" style={{ background: m.color }} />
                      <div>
                        <div className={`text-sm font-semibold ${matId === m.id ? "text-[#00D4FF]" : "text-white"}`}>{m.label}</div>
                        <div className="text-[10px] text-slate-500">{m.desc} · E={m.E} GPa · σy={m.yield} MPa</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4 - preview info */}
            {step === 4 && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-white">Preview your design</h2>
                <p className="text-xs text-slate-500">Rotate the 3D model to inspect it from all angles.</p>
                <div className="mt-4 bg-[#161b22] rounded-xl border border-[#21262d] p-4 space-y-2">
                  <div className="text-xs font-bold text-slate-300 mb-2">Summary</div>
                  <div className="text-xs text-slate-400 flex justify-between"><span>Part type</span><span className="text-white capitalize">{partId}</span></div>
                  <div className="text-xs text-slate-400 flex justify-between"><span>Material</span><span className="text-white">{material.label}</span></div>
                  {part?.fields.filter(f => f !== "prompt").map(f => (
                    <div key={f} className="text-xs text-slate-400 flex justify-between">
                      <span>{FIELD_LABELS[f]?.label}</span>
                      <span className="text-white">{getDim(f) || FIELD_LABELS[f]?.def} {FIELD_LABELS[f]?.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5 - analyze */}
            {step === 5 && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-white">Analyze & Export</h2>
                <p className="text-xs text-slate-500">Run simulations or export your design.</p>
                <div className="mt-4 space-y-2">
                  <Link href="/simulator" className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl hover:bg-green-500/20 transition-colors">
                    <span className="text-green-400 text-lg">⚡</span>
                    <div><div className="text-sm font-semibold text-green-400">Run FEA (Stress Analysis)</div><div className="text-[10px] text-slate-500">One-click structural analysis with Steel preset</div></div>
                  </Link>
                  <Link href="/cfd" className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 transition-colors">
                    <span className="text-blue-400 text-lg">🌊</span>
                    <div><div className="text-sm font-semibold text-blue-400">Run CFD (Flow Analysis)</div><div className="text-[10px] text-slate-500">Auto-configure wind tunnel and run</div></div>
                  </Link>
                  <Link href="/designer" className="flex items-center gap-3 p-3 bg-[#00D4FF]/10 border border-[#00D4FF]/30 rounded-xl hover:bg-[#00D4FF]/20 transition-colors">
                    <span className="text-[#00D4FF] text-lg">✏️</span>
                    <div><div className="text-sm font-semibold text-[#00D4FF]">Open in Designer</div><div className="text-[10px] text-slate-500">Edit with full CAD tools</div></div>
                  </Link>
                  <button onClick={() => alert("Exporting STL...")} className="w-full flex items-center gap-3 p-3 bg-[#21262d] border border-[#30363d] rounded-xl hover:bg-[#30363d] transition-colors">
                    <span className="text-slate-400 text-lg">📦</span>
                    <div className="text-left"><div className="text-sm font-semibold text-white">Export STL</div><div className="text-[10px] text-slate-500">Ready for 3D printing or CNC</div></div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="p-4 border-t border-[#21262d] flex gap-2">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-[#21262d] text-slate-400 hover:text-white text-sm transition-colors">
                <ChevronLeft size={14} /> Back
              </button>
            )}
            {step < 5 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                className="flex-1 flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-[#00D4FF] hover:bg-[#00b8d9] disabled:opacity-40 text-black font-bold text-sm transition-colors">
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={() => { setStep(1); setPartId(""); setDims({}); setMatId("steel"); }}
                className="flex-1 px-4 py-2 rounded-lg bg-[#21262d] text-slate-300 text-sm hover:bg-[#30363d] transition-colors">
                Start Over
              </button>
            )}
          </div>
        </div>

        {/* Right – 3D Preview */}
        <div className="flex-1 relative bg-[#0a0e17]">
          {partId ? (
            <Suspense fallback={<div className="h-full flex items-center justify-center text-slate-500">Loading 3D…</div>}>
              <Canvas camera={{ position: [2, 1.5, 2.5], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[4, 5, 3]} intensity={1.3} />
                <directionalLight position={[-2, 2, -2]} intensity={0.4} />
                <WizardPreview partId={partId} dims={dims} matColor={material.color} />
                <OrbitControls autoRotate autoRotateSpeed={1.2} />
              </Canvas>
            </Suspense>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-20 h-20 rounded-2xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 flex items-center justify-center text-[#00D4FF] text-2xl font-bold">3D</div>
              <div className="text-slate-400 text-sm">Select a part type to see the preview</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
