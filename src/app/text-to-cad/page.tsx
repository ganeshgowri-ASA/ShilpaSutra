"use client";
import { useState, useCallback, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────
interface ParsedShape {
  type: "box" | "cylinder" | "sphere" | "pipe" | "gear" | "bracket";
  w: number; h: number; d: number; // Three.js units (100mm = 1)
  r?: number; wallR?: number; teeth?: number;
}

interface Template { label: string; prompt: string; category: string }

// ── 20+ Prompt Templates ───────────────────────────────────────────────────
const TEMPLATES: Template[] = [
  // Mechanical
  { label: "Spur Gear", prompt: "Create a gear with 20 teeth, module 2, 10mm thick", category: "Mechanical" },
  { label: "V-Belt Pulley", prompt: "Design a pulley 80mm diameter, 25mm wide, 15mm bore", category: "Mechanical" },
  { label: "Shaft Collar", prompt: "Make a shaft collar 20mm bore, 40mm OD, 15mm wide", category: "Mechanical" },
  { label: "Crank Arm", prompt: "Create a crank arm 150mm long, 20mm wide, 8mm thick", category: "Mechanical" },
  // Structural
  { label: "L-Bracket", prompt: "Create an L-bracket 50x50x5mm with 10mm mounting holes", category: "Structural" },
  { label: "I-Beam", prompt: "Design an I-beam 200mm long, 50mm wide, 80mm tall, 5mm flange", category: "Structural" },
  { label: "Angle Iron", prompt: "Make an angle iron 100x100x8mm, 300mm long", category: "Structural" },
  { label: "Gusset Plate", prompt: "Create a triangular gusset plate 80x80x6mm", category: "Structural" },
  // Plumbing
  { label: "Pipe Section", prompt: "Make a pipe 100mm diameter, 500mm long, 5mm wall thickness", category: "Plumbing" },
  { label: "Elbow 90°", prompt: "Create a 90-degree elbow pipe 50mm diameter, 5mm wall", category: "Plumbing" },
  { label: "Flange", prompt: "Design a pipe flange DN100, 160mm OD, 18mm thick, 8 holes M16", category: "Plumbing" },
  { label: "T-Joint", prompt: "Make a T-junction pipe 50mm diameter, 3mm wall thickness", category: "Plumbing" },
  // Enclosures
  { label: "Enclosure Box", prompt: "Design a box enclosure 150x100x60mm with 2mm wall thickness", category: "Enclosures" },
  { label: "Electronics Case", prompt: "Create electronics case 200x120x40mm with lid and vents", category: "Enclosures" },
  { label: "Junction Box", prompt: "Make a junction box 80x80x50mm, IP65 style with flanges", category: "Enclosures" },
  // Solar / Energy
  { label: "PV Solar Panel", prompt: "Create a PV solar module 2m x 1m with 35mm frame thickness", category: "Solar" },
  { label: "Solar Frame", prompt: "Design a solar panel mounting frame 1.65m x 0.99m, 40mm profile", category: "Solar" },
  // Furniture
  { label: "Table Leg", prompt: "Create a square table leg 40x40mm, 720mm tall", category: "Furniture" },
  { label: "Shelf Bracket", prompt: "Design a shelf bracket 200mm deep, 150mm tall, 4mm thick", category: "Furniture" },
  // Electrical
  { label: "DIN Rail", prompt: "Make a DIN rail mount 35mm wide, 300mm long, 7.5mm deep", category: "Electrical" },
  { label: "Heat Sink", prompt: "Design a heat sink 60x60mm base, 30mm tall, 12 fins, 2mm thick", category: "Electrical" },
];

const CATEGORIES = Array.from(new Set(TEMPLATES.map(t => t.category)));

// ── Natural-language parser ────────────────────────────────────────────────
function toMm(v: number, unit: string): number {
  if (unit === "cm") return v * 10;
  if (unit === "m")  return v * 1000;
  if (unit === "in" || unit === '"') return v * 25.4;
  return v; // default mm
}
const NUM  = /(\d+(?:\.\d+)?)/;
const UNIT = /(mm|cm|m|in|")?/;
const X    = /\s*[x×*]\s*/;

function parseShape(text: string): ParsedShape {
  const t = text.toLowerCase();
  const scale = (mm: number) => mm / 100;

  // PV / solar module  "2m x 1m"  or  "2000x1000mm"
  if (t.includes("solar") || t.includes("pv") || t.includes("panel")) {
    const m = text.match(new RegExp(`${NUM.source}\\s*${UNIT.source}${X.source}${NUM.source}\\s*${UNIT.source}`, "i"));
    const w = m ? toMm(parseFloat(m[1]), (m[2]||"mm").toLowerCase()) : 2000;
    const d = m ? toMm(parseFloat(m[3]), (m[4]||"mm").toLowerCase()) : 1000;
    const frameM = text.match(/(\d+)\s*mm\s*frame/i);
    const h = frameM ? parseFloat(frameM[1]) : 35;
    return { type: "box", w: scale(w), h: scale(h), d: scale(d) };
  }

  // Gear
  if (t.includes("gear") || t.includes("teeth")) {
    const teethM = text.match(/(\d+)\s*teeth/i);
    const modM   = text.match(/module\s*(\d+(?:\.\d+)?)/i);
    const thickM = text.match(/(\d+)\s*mm\s*thick/i) || text.match(/(\d+)\s*mm\s*face/i);
    const teeth  = teethM ? parseInt(teethM[1]) : 20;
    const mod    = modM   ? parseFloat(modM[1]) : 2;
    const thick  = thickM ? parseFloat(thickM[1]) : 10;
    const pitchR = (teeth * mod) / 2;
    return { type: "gear", w: scale(pitchR * 2), h: scale(thick), d: scale(pitchR * 2), r: scale(pitchR), teeth };
  }

  // Pipe / hollow cylinder
  if (t.includes("pipe") || t.includes("tube") || t.includes("elbow") || t.includes("duct")) {
    const diaM  = text.match(/(\d+(?:\.\d+)?)\s*mm\s*dia/i) || text.match(/(\d+(?:\.\d+)?)\s*mm\s*OD/i) || text.match(/DN\s*(\d+)/i);
    const lenM  = text.match(/(\d+(?:\.\d+)?)\s*mm\s*long/i);
    const wallM = text.match(/(\d+(?:\.\d+)?)\s*mm\s*wall/i);
    const dia   = diaM  ? parseFloat(diaM[1]) : 100;
    const len   = lenM  ? parseFloat(lenM[1]) : 500;
    const wall  = wallM ? parseFloat(wallM[1]) : 5;
    return { type: "pipe", w: scale(dia), h: scale(len), d: scale(dia), r: scale(dia / 2), wallR: scale((dia - wall * 2) / 2) };
  }

  // Cylinder / shaft / pulley / collar
  if (t.includes("cylinder") || t.includes("shaft") || t.includes("pulley") || t.includes("collar") || t.includes("rod")) {
    const diaM = text.match(/(\d+(?:\.\d+)?)\s*mm\s*dia/i) || text.match(/(\d+(?:\.\d+)?)\s*mm\s*OD/i);
    const lenM = text.match(/(\d+(?:\.\d+)?)\s*mm\s*(long|tall|high)/i);
    const dia  = diaM ? parseFloat(diaM[1]) : 50;
    const len  = lenM ? parseFloat(lenM[1]) : 100;
    return { type: "cylinder", w: scale(dia), h: scale(len), d: scale(dia), r: scale(dia / 2) };
  }

  // Bracket / plate / gusset  "50x50x5mm"
  const triDim = text.match(new RegExp(`${NUM.source}\\s*${UNIT.source}${X.source}${NUM.source}\\s*${UNIT.source}${X.source}${NUM.source}\\s*${UNIT.source}`, "i"));
  if (triDim || t.includes("bracket") || t.includes("plate") || t.includes("beam") || t.includes("rail")) {
    if (triDim) {
      const u = (triDim[2] || triDim[4] || triDim[6] || "mm").toLowerCase();
      return { type: "bracket", w: scale(toMm(parseFloat(triDim[1]), u)), h: scale(toMm(parseFloat(triDim[5]), u)), d: scale(toMm(parseFloat(triDim[3]), u)) };
    }
    return { type: "bracket", w: 0.5, h: 0.5, d: 0.05 };
  }

  // Sphere
  if (t.includes("sphere") || t.includes("ball")) {
    const rM = text.match(/(\d+)\s*mm/i);
    const r  = rM ? parseFloat(rM[1]) / 2 : 50;
    return { type: "sphere", w: scale(r * 2), h: scale(r * 2), d: scale(r * 2), r: scale(r) };
  }

  // Generic box (WxHxD)
  if (triDim) {
    const u = String(triDim[2] || triDim[4] || triDim[6] || "mm").toLowerCase();
    return { type: "box" as const, w: scale(toMm(parseFloat(triDim[1]), u)), h: scale(toMm(parseFloat(triDim[5]), u)), d: scale(toMm(parseFloat(triDim[3]), u)) };
  }
  // simple "NNN mm"
  const single = text.match(/(\d+)\s*mm/i);
  const s = single ? parseFloat(single[1]) / 100 : 1;
  return { type: "box", w: s, h: s * 0.5, d: s * 0.6 };
}

// ── 3D Preview Mesh ────────────────────────────────────────────────────────
function ShapePreview({ shape }: { shape: ParsedShape }) {
  const mat = <meshStandardMaterial color="#00D4FF" metalness={0.35} roughness={0.45} transparent opacity={0.92} />;
  const dark = <meshStandardMaterial color="#0d1117" />;

  if (shape.type === "gear") {
    return (
      <group>
        <mesh><cylinderGeometry args={[shape.r!, shape.r!, shape.h, 32]} />{mat}</mesh>
        {Array.from({ length: shape.teeth || 20 }, (_, i) => {
          const angle = (i / (shape.teeth || 20)) * Math.PI * 2;
          const toothR = shape.r! * 1.18;
          return (
            <mesh key={i} position={[Math.cos(angle) * toothR, 0, Math.sin(angle) * toothR]} rotation={[0, angle, 0]}>
              <boxGeometry args={[0.06, shape.h, 0.04]} />{mat}
            </mesh>
          );
        })}
        <mesh><cylinderGeometry args={[shape.r! * 0.25, shape.r! * 0.25, shape.h + 0.01, 16]} />{dark}</mesh>
      </group>
    );
  }
  if (shape.type === "pipe") {
    return (
      <group>
        <mesh><cylinderGeometry args={[shape.r!, shape.r!, shape.h, 32, 1, true]} />{mat}</mesh>
        <mesh><cylinderGeometry args={[shape.wallR!, shape.wallR!, shape.h, 32, 1, true]} />
          <meshStandardMaterial color="#00D4FF" side={1} metalness={0.35} roughness={0.45} transparent opacity={0.7} />
        </mesh>
      </group>
    );
  }
  if (shape.type === "cylinder") {
    return <mesh><cylinderGeometry args={[shape.r!, shape.r!, shape.h, 32]} />{mat}</mesh>;
  }
  if (shape.type === "sphere") {
    return <mesh><sphereGeometry args={[shape.r!, 32, 32]} />{mat}</mesh>;
  }
  if (shape.type === "bracket") {
    return (
      <group>
        <mesh position={[0, 0, shape.d / 2]}>
          <boxGeometry args={[shape.w, shape.d * 0.8, shape.d]} />{mat}
        </mesh>
        <mesh position={[-shape.w / 2 + shape.d / 2, shape.h / 2, 0]}>
          <boxGeometry args={[shape.d, shape.h, shape.d]} />{mat}
        </mesh>
      </group>
    );
  }
  // box (default)
  return <mesh><boxGeometry args={[shape.w, shape.h, shape.d]} />{mat}</mesh>;
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function TextToCADPage() {
  const [prompt, setPrompt]           = useState("");
  const [liveShape, setLiveShape]     = useState<ParsedShape | null>(null);
  const [activeCat, setActiveCat]     = useState("Mechanical");
  const [format, setFormat]           = useState("STEP");
  const [generating, setGenerating]   = useState(false);
  const [generated, setGenerated]     = useState(false);

  const handlePromptChange = (v: string) => {
    setPrompt(v);
    if (v.trim().length > 6) setLiveShape(parseShape(v));
    else setLiveShape(null);
    setGenerated(false);
  };

  const generate = useCallback(() => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setLiveShape(parseShape(prompt));
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 1800);
  }, [prompt]);

  const catTemplates = TEMPLATES.filter(t => t.category === activeCat);

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#161b22] border-b border-[#21262d] text-sm flex-shrink-0">
        <span className="font-bold text-[#00D4FF]">Text to CAD</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400 text-xs">Describe any part and get an instant 3D preview</span>
        <div className="ml-auto flex items-center gap-2">
          <select value={format} onChange={e => setFormat(e.target.value)}
            className="bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-slate-300">
            {["STEP","STL","OBJ","glTF","DXF"].map(f => <option key={f}>{f}</option>)}
          </select>
          <Link href="/designer" className="text-xs bg-[#21262d] hover:bg-[#30363d] px-3 py-1 rounded text-slate-300 transition-colors">
            Open Designer
          </Link>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT – Input + Templates */}
        <div className="w-80 bg-[#161b22] border-r border-[#21262d] flex flex-col flex-shrink-0">
          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            <div className="text-xs font-bold text-slate-300">Describe your part</div>
            <textarea
              value={prompt}
              onChange={e => handlePromptChange(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(); } }}
              placeholder={'e.g. "Create a pipe 100mm diameter, 500mm long, 5mm wall"'}
              className="w-full h-28 bg-[#0d1117] rounded-lg px-3 py-2.5 text-sm border border-[#21262d] focus:border-[#00D4FF] outline-none resize-none placeholder-slate-600"
            />
            <button onClick={generate} disabled={!prompt.trim() || generating}
              className="w-full bg-[#00D4FF] hover:bg-[#00b8d9] disabled:opacity-40 text-black py-2 rounded-lg text-sm font-bold transition-colors">
              {generating ? "Generating…" : "Generate CAD"}
            </button>

            {/* Live parse feedback */}
            {liveShape && (
              <div className="bg-[#0d1117] rounded-lg border border-[#00D4FF]/20 px-3 py-2 text-xs space-y-1">
                <div className="text-[#00D4FF] font-semibold">Detected: {liveShape.type.toUpperCase()}</div>
                <div className="text-slate-400">W {(liveShape.w*100).toFixed(0)}mm · H {(liveShape.h*100).toFixed(0)}mm · D {(liveShape.d*100).toFixed(0)}mm</div>
              </div>
            )}

            {/* Category tabs */}
            <div className="pt-2">
              <div className="text-xs font-bold text-slate-300 mb-2">Templates</div>
              <div className="flex flex-wrap gap-1 mb-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setActiveCat(cat)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${activeCat === cat ? "border-[#00D4FF]/50 text-[#00D4FF] bg-[#00D4FF]/10" : "border-[#21262d] text-slate-500 hover:text-white"}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                {catTemplates.map(t => (
                  <button key={t.label} onClick={() => { setPrompt(t.prompt); handlePromptChange(t.prompt); }}
                    className="w-full text-left bg-[#0d1117] hover:bg-[#21262d] border border-[#21262d] rounded-lg px-3 py-2 transition-colors group">
                    <div className="text-xs font-semibold text-slate-300 group-hover:text-[#00D4FF]">{t.label}</div>
                    <div className="text-[10px] text-slate-600 mt-0.5 truncate">{t.prompt}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER – 3D Canvas */}
        <div className="flex-1 relative">
          {liveShape ? (
            <Suspense fallback={<div className="h-full flex items-center justify-center text-slate-500 text-sm">Loading 3D…</div>}>
              <Canvas camera={{ position: [2, 1.5, 2.5], fov: 45 }} className="w-full h-full">
                <ambientLight intensity={0.5} />
                <directionalLight position={[4, 5, 3]} intensity={1.2} />
                <directionalLight position={[-2, 2, -2]} intensity={0.4} />
                <ShapePreview shape={liveShape} />
                <OrbitControls autoRotate={!generating} autoRotateSpeed={1.5} />
                <Grid args={[10, 10]} cellColor="#21262d" sectionColor="#21262d" position={[0, -1.2, 0]} />
              </Canvas>
              {/* Overlay badges */}
              <div className="absolute top-3 left-3 flex gap-2">
                <span className="bg-[#161b22]/90 border border-[#21262d] px-2 py-1 rounded text-[10px] text-slate-400 backdrop-blur">
                  {liveShape.type.toUpperCase()} · {(liveShape.w*100).toFixed(0)}×{(liveShape.h*100).toFixed(0)}×{(liveShape.d*100).toFixed(0)} mm
                </span>
                {generating && <span className="bg-[#00D4FF]/20 border border-[#00D4FF]/40 px-2 py-1 rounded text-[10px] text-[#00D4FF] animate-pulse">Generating…</span>}
                {generated && !generating && <span className="bg-green-500/20 border border-green-500/40 px-2 py-1 rounded text-[10px] text-green-400">Ready</span>}
              </div>
              {generated && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  <Link href="/simulator" className="bg-[#00D4FF] hover:bg-[#00b8d9] text-black px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-lg">
                    Analyze Stress (FEA)
                  </Link>
                  <Link href="/cfd" className="bg-[#21262d] hover:bg-[#30363d] text-white px-4 py-2 rounded-lg text-xs transition-colors shadow-lg">
                    Analyze Flow (CFD)
                  </Link>
                  <button className="bg-[#21262d] hover:bg-[#30363d] text-white px-4 py-2 rounded-lg text-xs transition-colors shadow-lg">
                    Export {format}
                  </button>
                </div>
              )}
            </Suspense>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-24 h-24 rounded-2xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 flex items-center justify-center text-[#00D4FF] text-3xl font-bold">3D</div>
              <div className="text-slate-300 font-semibold">Type a part description to see a live 3D preview</div>
              <div className="text-slate-600 text-sm max-w-xs">Supports gears, pipes, brackets, panels, enclosures and more. Parses dimensions in mm, cm, m, inches.</div>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 py-1 bg-[#161b22] border-t border-[#21262d] text-[10px] text-slate-500 flex-shrink-0">
        <span>Templates: <span className="text-white">{TEMPLATES.length}</span></span>
        <span>Format: <span className="text-white">{format}</span></span>
        <span>Units: <span className="text-white">mm / cm / m / in</span></span>
        <span className="ml-auto">ShilpaSutra AI Engine v2.0</span>
      </div>
    </div>
  );
}
