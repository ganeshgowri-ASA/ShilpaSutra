"use client";
import { useState, useCallback, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import Link from "next/link";

// --- Types ---
interface ParsedShape {
  type: "box" | "cylinder" | "sphere" | "cone" | "torus" | "pipe" | "l-bracket" | "gear" | "default";
  dims: { w: number; h: number; d: number; r?: number; r2?: number };
  fillet?: number;
  holes?: number;
}

interface Generation {
  id: string;
  prompt: string;
  status: "generating" | "complete" | "error";
  format: string;
  time?: string;
  shape?: ParsedShape;
}

// --- Parser ---
function parseShape(text: string): ParsedShape {
  const t = text.toLowerCase();
  const num = (pattern: RegExp) => { const m = t.match(pattern); return m ? parseFloat(m[1]) : null; };

  // Dimensions: 100x50x30, 100 x 50 x 30
  const xyzMatch = t.match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/);
  // Diameter + height: D50 H100 or d=50 h=100
  const dMatch = t.match(/[dD]\s*=?\s*(\d+(?:\.\d+)?)/);
  const hMatch = t.match(/[hH]\s*=?\s*(\d+(?:\.\d+)?)/);
  // OD/ID for pipe
  const odMatch = t.match(/[oO][dD]\s*=?\s*(\d+(?:\.\d+)?)/);
  const idMatch = t.match(/[iI][dD]\s*=?\s*(\d+(?:\.\d+)?)/);
  // Fillet
  const filletMatch = t.match(/(\d+(?:\.\d+)?)\s*mm\s*fillet/);
  // Holes
  const holesMatch = t.match(/(\d+)\s*hole/);

  const scale = (v: number) => v / 100; // mm → Three.js units

  // Shape detection
  if (t.includes("pipe") || t.includes("tube")) {
    const od = odMatch ? parseFloat(odMatch[1]) : (dMatch ? parseFloat(dMatch[1]) : 60);
    const id = idMatch ? parseFloat(idMatch[1]) : od * 0.6;
    const l = hMatch ? parseFloat(hMatch[1]) : (xyzMatch ? parseFloat(xyzMatch[3]) : 200);
    return { type: "pipe", dims: { w: scale(od), h: scale(l), d: scale(od), r: scale(od / 2), r2: scale(id / 2) } };
  }

  if (t.includes("cylinder") || t.includes("rod") || t.includes("shaft")) {
    const d = dMatch ? parseFloat(dMatch[1]) : (xyzMatch ? parseFloat(xyzMatch[1]) : 50);
    const h = hMatch ? parseFloat(hMatch[1]) : (xyzMatch ? parseFloat(xyzMatch[2]) : 100);
    return { type: "cylinder", dims: { w: scale(d), h: scale(h), d: scale(d), r: scale(d / 2) } };
  }

  if (t.includes("sphere") || t.includes("ball")) {
    const d = dMatch ? parseFloat(dMatch[1]) : (xyzMatch ? parseFloat(xyzMatch[1]) : 80);
    return { type: "sphere", dims: { w: scale(d), h: scale(d), d: scale(d), r: scale(d / 2) } };
  }

  if (t.includes("cone")) {
    const d = dMatch ? parseFloat(dMatch[1]) : (xyzMatch ? parseFloat(xyzMatch[1]) : 80);
    const h = hMatch ? parseFloat(hMatch[1]) : (xyzMatch ? parseFloat(xyzMatch[2]) : 60);
    return { type: "cone", dims: { w: scale(d), h: scale(h), d: scale(d), r: scale(d / 2) } };
  }

  if (t.includes("torus") || t.includes("ring") || t.includes("washer")) {
    const od = odMatch ? parseFloat(odMatch[1]) : (xyzMatch ? parseFloat(xyzMatch[1]) : 100);
    const id = idMatch ? parseFloat(idMatch[1]) : 20;
    return { type: "torus", dims: { w: scale(od), h: scale(id / 2), d: scale(od), r: scale(od / 2), r2: scale(id / 2) } };
  }

  if (t.includes("l-bracket") || t.includes("l bracket") || t.includes("angle bracket")) {
    const w = xyzMatch ? parseFloat(xyzMatch[1]) : 100;
    const h = xyzMatch ? parseFloat(xyzMatch[2]) : 80;
    const thick = xyzMatch ? parseFloat(xyzMatch[3]) : 5;
    return { type: "l-bracket", dims: { w: scale(w), h: scale(h), d: scale(thick) } };
  }

  if (t.includes("gear") || t.includes("sprocket")) {
    const d = num(/(\d+)\s*teeth/) ? (num(/(\d+)\s*teeth/)! * (num(/module\s*(\d+)/) || 2)) : 60;
    return { type: "gear", dims: { w: scale(d), h: scale(20), d: scale(d), r: scale(d / 2) } };
  }

  // Default: box
  const w = xyzMatch ? parseFloat(xyzMatch[1]) : 100;
  const h = xyzMatch ? parseFloat(xyzMatch[2]) : 50;
  const d = xyzMatch ? parseFloat(xyzMatch[3]) : 30;
  return {
    type: "box",
    dims: { w: scale(w), h: scale(h), d: scale(d) },
    fillet: filletMatch ? parseFloat(filletMatch[1]) : undefined,
    holes: holesMatch ? parseInt(holesMatch[1]) : undefined,
  };
}

// --- 3D Preview ---
function ShapePreview({ shape }: { shape: ParsedShape }) {
  const color = "#00D4FF";
  const mat = <meshStandardMaterial color={color} metalness={0.35} roughness={0.45} />;

  if (shape.type === "cylinder") {
    return <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[shape.dims.r ?? 0.25, shape.dims.r ?? 0.25, shape.dims.h, 32]} />{mat}</mesh>;
  }
  if (shape.type === "sphere") {
    return <mesh><sphereGeometry args={[shape.dims.r ?? 0.4, 32, 32]} />{mat}</mesh>;
  }
  if (shape.type === "cone") {
    return <mesh rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[shape.dims.r ?? 0.4, shape.dims.h, 32]} />{mat}</mesh>;
  }
  if (shape.type === "torus") {
    return <mesh><torusGeometry args={[shape.dims.r ?? 0.5, shape.dims.r2 ?? 0.1, 16, 64]} />{mat}</mesh>;
  }
  if (shape.type === "pipe") {
    return (
      <group>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[shape.dims.r ?? 0.3, shape.dims.r ?? 0.3, shape.dims.h, 32]} />{mat}</mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[shape.dims.r2 ?? 0.2, shape.dims.r2 ?? 0.2, shape.dims.h * 1.01, 32]} /><meshStandardMaterial color="#0d1117" /></mesh>
      </group>
    );
  }
  if (shape.type === "l-bracket") {
    return (
      <group>
        <mesh position={[0, shape.dims.h / 2, 0]}><boxGeometry args={[shape.dims.w, shape.dims.d, shape.dims.h * 0.6]} />{mat}</mesh>
        <mesh position={[-shape.dims.w / 2 + shape.dims.d / 2, 0, 0]}><boxGeometry args={[shape.dims.d, shape.dims.h, shape.dims.h * 0.6]} />{mat}</mesh>
      </group>
    );
  }
  if (shape.type === "gear") {
    return (
      <group>
        <mesh><cylinderGeometry args={[shape.dims.r ?? 0.3, shape.dims.r ?? 0.3, shape.dims.h, 24]} />{mat}</mesh>
        <mesh><cylinderGeometry args={[0.1, 0.1, shape.dims.h * 1.1, 16]} /><meshStandardMaterial color="#0d1117" /></mesh>
      </group>
    );
  }
  // box (default)
  return <mesh><boxGeometry args={[shape.dims.w, shape.dims.h, shape.dims.d]} />{mat}</mesh>;
}

// --- Example prompts (20) ---
const EXAMPLES = [
  { label: "Steel plate 200×100×10mm", cat: "Plate" },
  { label: "Cylinder D50 H100mm", cat: "Solid" },
  { label: "Pipe OD60 ID40 L200mm", cat: "Pipe" },
  { label: "Hex bolt M10×50", cat: "Fastener" },
  { label: "Spur gear 20 teeth module 2", cat: "Gear" },
  { label: "L-bracket 100×80×5mm", cat: "Bracket" },
  { label: "Flange DN50 PN16", cat: "Piping" },
  { label: "Torus OD100 ID20mm", cat: "Ring" },
  { label: "Cone base D80 top D20 H60mm", cat: "Solid" },
  { label: "Box 100×50×30mm with 5mm fillet", cat: "Box" },
  { label: "T-bracket 120×80×6mm", cat: "Bracket" },
  { label: "Washer OD30 ID10 T3mm", cat: "Fastener" },
  { label: "Hex nut M12", cat: "Fastener" },
  { label: "Sphere D100mm", cat: "Solid" },
  { label: "Spring D40 wire D5 L100mm", cat: "Spring" },
  { label: "Aluminum extrusion 40×40 L300mm", cat: "Extrusion" },
  { label: "Tube square 50×50×3mm L200mm", cat: "Tube" },
  { label: "Motor mount NEMA23 4mm thick", cat: "Bracket" },
  { label: "Heat sink 12 fins 50×50mm base", cat: "Thermal" },
  { label: "Valve body DN80 PN25", cat: "Piping" },
];

const FORMATS = ["STEP", "STL", "OBJ", "glTF", "IGES"];

// --- Main ---
export default function TextToCADPage() {
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState("STEP");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const generate = useCallback((p?: string) => {
    const text = (p ?? prompt).trim();
    if (!text) return;
    const id = `g${Date.now()}`;
    const shape = parseShape(text);
    setGenerations(prev => [{ id, prompt: text, status: "generating", format, shape }, ...prev]);
    setActiveId(id);
    if (!p) setPrompt("");
    setTimeout(() => {
      setGenerations(prev => prev.map(g => g.id === id ? { ...g, status: "complete", time: `${(Math.random() * 4 + 1).toFixed(1)}s` } : g));
    }, 2000);
  }, [prompt, format]);

  const active = generations.find(g => g.id === activeId);

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#161b22] border-b border-[#21262d] text-sm shrink-0">
        <span className="font-bold text-[#00D4FF]">Text to CAD</span>
        <select value={format} onChange={e => setFormat(e.target.value)}
          className="ml-auto bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-slate-300">
          {FORMATS.map(f => <option key={f}>{f}</option>)}
        </select>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT */}
        <div className="w-80 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
          <div className="p-3 space-y-3">
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(); } }}
              placeholder="e.g. Box 100×50×30mm with 5mm fillets"
              className="w-full h-24 bg-[#0d1117] rounded px-3 py-2 text-sm outline-none border border-[#21262d] focus:border-[#00D4FF] resize-none placeholder-slate-600" />
            <button onClick={() => generate()}
              disabled={!prompt.trim()}
              className="w-full bg-[#00D4FF] hover:bg-[#00b8d9] disabled:opacity-40 text-black py-2 rounded text-xs font-bold transition-colors">
              Generate CAD
            </button>

            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Examples — click to generate</div>
            <div className="grid grid-cols-1 gap-1">
              {EXAMPLES.map(ex => (
                <button key={ex.label} onClick={() => { setPrompt(ex.label); generate(ex.label); }}
                  className="text-left bg-[#0d1117] hover:bg-[#21262d] border border-[#21262d] rounded px-2.5 py-1.5 transition-colors group">
                  <span className="text-[10px] text-slate-300 group-hover:text-[#00D4FF]">{ex.label}</span>
                  <span className="ml-2 text-[9px] text-slate-600">{ex.cat}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER - 3D Preview */}
        <div className="flex-1 relative bg-[#0d1117]">
          {active?.status === "generating" && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="w-16 h-16 border-2 border-t-[#00D4FF] border-[#21262d] rounded-full animate-spin mx-auto mb-3" />
                <div className="text-[#00D4FF] text-sm font-semibold">Generating 3D Model…</div>
              </div>
            </div>
          )}
          {active?.status === "complete" && active.shape && (
            <Suspense fallback={null}>
              <Canvas camera={{ position: [2, 1.5, 2], fov: 40 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[3, 4, 2]} intensity={1} />
                <ShapePreview shape={active.shape} />
                <OrbitControls autoRotate autoRotateSpeed={1.5} />
                <gridHelper args={[4, 20, "#21262d", "#21262d"]} />
              </Canvas>
              <div className="absolute bottom-4 left-4 bg-[#161b22]/90 border border-[#21262d] rounded px-3 py-2 text-xs">
                <div className="text-[#00D4FF] font-semibold truncate max-w-xs">{active.prompt}</div>
                <div className="text-slate-500 mt-0.5">Type: {active.shape.type} · {active.time} · {active.format}</div>
              </div>
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button className="bg-[#00D4FF] hover:bg-[#00b8d9] text-black px-3 py-1.5 rounded text-xs font-bold">Send to Designer</button>
                <button className="bg-[#21262d] hover:bg-[#30363d] text-white px-3 py-1.5 rounded text-xs">Export {active.format}</button>
              </div>
            </Suspense>
          )}
          {!active && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">
              Describe a part to generate
            </div>
          )}
        </div>

        {/* RIGHT - History */}
        <div className="w-60 bg-[#161b22] border-l border-[#21262d] flex flex-col shrink-0">
          <div className="px-3 py-2 border-b border-[#21262d] text-xs font-bold text-slate-300">History ({generations.length})</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {generations.map(g => (
              <div key={g.id} onClick={() => setActiveId(g.id)}
                className={`p-2 rounded cursor-pointer border text-xs transition-all ${activeId === g.id ? "bg-[#00D4FF]/10 border-[#00D4FF]/30" : "border-[#21262d] hover:border-[#30363d]"}`}>
                <div className="truncate text-slate-300">{g.prompt}</div>
                <div className="flex items-center gap-2 mt-1 text-[10px]">
                  <span className={g.status === "complete" ? "text-green-400" : "text-[#00D4FF] animate-pulse"}>{g.status}</span>
                  <span className="text-slate-600">{g.format}</span>
                  {g.time && <span className="text-slate-600">{g.time}</span>}
                </div>
              </div>
            ))}
            {generations.length === 0 && <div className="text-slate-600 text-[11px] p-2">No generations yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
