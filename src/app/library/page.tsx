"use client";
import { useState, useMemo, useCallback, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useCadStore } from "@/stores/cad-store";

// --- Types ---
interface PartParam {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit: string;
}

interface PartDef {
  id: string;
  name: string;
  category: string;
  description: string;
  params: PartParam[];
  downloads: number;
  rating: number;
  author: string;
}

// --- Parametric Part Definitions ---
const partDefinitions: PartDef[] = [
  {
    id: "bolt", name: "Hex Bolt", category: "Fasteners",
    description: "ISO hex head bolt with adjustable size and length",
    params: [
      { key: "size", label: "Size (M)", min: 3, max: 20, step: 1, default: 8, unit: "mm" },
      { key: "length", label: "Length", min: 10, max: 100, step: 5, default: 30, unit: "mm" },
      { key: "headHeight", label: "Head Height", min: 2, max: 14, step: 0.5, default: 5, unit: "mm" },
    ],
    downloads: 2450, rating: 4.8, author: "ISO Standard",
  },
  {
    id: "nut", name: "Hex Nut", category: "Fasteners",
    description: "Standard hex nut with configurable size",
    params: [
      { key: "size", label: "Size (M)", min: 3, max: 20, step: 1, default: 8, unit: "mm" },
      { key: "height", label: "Height", min: 2, max: 16, step: 0.5, default: 6, unit: "mm" },
    ],
    downloads: 1890, rating: 4.7, author: "ISO Standard",
  },
  {
    id: "washer", name: "Flat Washer", category: "Fasteners",
    description: "Flat washer for bolt/nut assemblies",
    params: [
      { key: "size", label: "Size (M)", min: 3, max: 20, step: 1, default: 8, unit: "mm" },
      { key: "thickness", label: "Thickness", min: 0.5, max: 4, step: 0.5, default: 1.5, unit: "mm" },
    ],
    downloads: 1340, rating: 4.5, author: "DIN Standard",
  },
  {
    id: "lbracket", name: "L-Bracket", category: "Brackets",
    description: "L-shaped mounting bracket with adjustable dimensions",
    params: [
      { key: "width", label: "Width", min: 20, max: 100, step: 5, default: 50, unit: "mm" },
      { key: "height", label: "Height", min: 20, max: 100, step: 5, default: 50, unit: "mm" },
      { key: "thickness", label: "Thickness", min: 1, max: 10, step: 0.5, default: 3, unit: "mm" },
    ],
    downloads: 2100, rating: 4.6, author: "ShilpaSutra",
  },
  {
    id: "uchannel", name: "U-Channel", category: "Brackets",
    description: "U-shaped channel profile",
    params: [
      { key: "width", label: "Width", min: 20, max: 120, step: 5, default: 50, unit: "mm" },
      { key: "height", label: "Height", min: 10, max: 80, step: 5, default: 40, unit: "mm" },
      { key: "depth", label: "Depth", min: 30, max: 200, step: 10, default: 100, unit: "mm" },
      { key: "thickness", label: "Wall Thickness", min: 1, max: 8, step: 0.5, default: 3, unit: "mm" },
    ],
    downloads: 890, rating: 4.3, author: "Community",
  },
  {
    id: "spurgear", name: "Spur Gear", category: "Gears",
    description: "Involute spur gear with configurable teeth and module",
    params: [
      { key: "teeth", label: "Teeth Count", min: 10, max: 60, step: 1, default: 20, unit: "" },
      { key: "module", label: "Module", min: 0.5, max: 5, step: 0.5, default: 2, unit: "mm" },
      { key: "faceWidth", label: "Face Width", min: 5, max: 30, step: 1, default: 10, unit: "mm" },
      { key: "bore", label: "Bore Dia", min: 3, max: 25, step: 1, default: 8, unit: "mm" },
    ],
    downloads: 1750, rating: 4.9, author: "Community",
  },
  {
    id: "boxenclosure", name: "Box Enclosure", category: "Enclosures",
    description: "Rectangular enclosure with lid and wall thickness",
    params: [
      { key: "length", label: "Length", min: 40, max: 200, step: 10, default: 120, unit: "mm" },
      { key: "width", label: "Width", min: 30, max: 150, step: 10, default: 80, unit: "mm" },
      { key: "height", label: "Height", min: 20, max: 100, step: 5, default: 40, unit: "mm" },
      { key: "wall", label: "Wall Thickness", min: 1, max: 5, step: 0.5, default: 2, unit: "mm" },
    ],
    downloads: 1420, rating: 4.4, author: "ShilpaSutra",
  },
  {
    id: "pipe", name: "Pipe", category: "Pipes & Fittings",
    description: "Round pipe section with adjustable OD, ID, and length",
    params: [
      { key: "od", label: "Outer Dia", min: 10, max: 100, step: 5, default: 50, unit: "mm" },
      { key: "id", label: "Inner Dia", min: 5, max: 95, step: 5, default: 40, unit: "mm" },
      { key: "length", label: "Length", min: 20, max: 500, step: 10, default: 100, unit: "mm" },
    ],
    downloads: 980, rating: 4.5, author: "ASME",
  },
  {
    id: "flange", name: "Pipe Flange", category: "Pipes & Fittings",
    description: "Flange with bolt circle and configurable holes",
    params: [
      { key: "od", label: "Outer Dia", min: 60, max: 200, step: 10, default: 100, unit: "mm" },
      { key: "id", label: "Inner Dia", min: 20, max: 100, step: 5, default: 50, unit: "mm" },
      { key: "thickness", label: "Thickness", min: 5, max: 25, step: 1, default: 12, unit: "mm" },
      { key: "holes", label: "Bolt Holes", min: 4, max: 12, step: 1, default: 4, unit: "" },
    ],
    downloads: 1560, rating: 4.8, author: "ASME",
  },
  {
    id: "heatsink", name: "Heat Sink", category: "Electronic Components",
    description: "Finned heat sink for thermal management",
    params: [
      { key: "width", label: "Width", min: 20, max: 80, step: 5, default: 40, unit: "mm" },
      { key: "fins", label: "Fin Count", min: 4, max: 20, step: 1, default: 8, unit: "" },
      { key: "finHeight", label: "Fin Height", min: 5, max: 30, step: 1, default: 15, unit: "mm" },
      { key: "baseThick", label: "Base Thickness", min: 2, max: 8, step: 0.5, default: 3, unit: "mm" },
    ],
    downloads: 720, rating: 4.2, author: "Community",
  },
  {
    id: "pcbstandoff", name: "PCB Standoff", category: "Electronic Components",
    description: "Threaded standoff for PCB mounting",
    params: [
      { key: "od", label: "Outer Dia", min: 3, max: 8, step: 0.5, default: 5, unit: "mm" },
      { key: "height", label: "Height", min: 3, max: 20, step: 1, default: 8, unit: "mm" },
      { key: "thread", label: "Thread (M)", min: 2, max: 5, step: 0.5, default: 3, unit: "mm" },
    ],
    downloads: 560, rating: 4.3, author: "Community",
  },
  {
    id: "motormount", name: "Motor Mount", category: "Brackets",
    description: "NEMA-style motor mounting plate",
    params: [
      { key: "width", label: "Width", min: 30, max: 80, step: 5, default: 56, unit: "mm" },
      { key: "thickness", label: "Thickness", min: 2, max: 8, step: 1, default: 4, unit: "mm" },
      { key: "boreSize", label: "Center Bore", min: 10, max: 40, step: 1, default: 22, unit: "mm" },
    ],
    downloads: 1320, rating: 4.7, author: "ShilpaSutra",
  },
];

const categories = ["All", "Fasteners", "Brackets", "Gears", "Enclosures", "Pipes & Fittings", "Electronic Components"];

// --- 3D Preview Components ---
function BoltPreview({ params }: { params: Record<string, number> }) {
  const s = (params.size || 8) / 20;
  const len = (params.length || 30) / 40;
  return (
    <group>
      <mesh position={[0, len / 2, 0]}>
        <cylinderGeometry args={[s * 0.4, s * 0.4, len, 16]} />
        <meshStandardMaterial color="#8899aa" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, len + s * 0.2, 0]}>
        <cylinderGeometry args={[s * 0.8, s * 0.8, s * 0.4, 6]} />
        <meshStandardMaterial color="#778899" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function NutPreview({ params }: { params: Record<string, number> }) {
  const s = (params.size || 8) / 12;
  const h = (params.height || 6) / 12;
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[s * 0.7, s * 0.7, h, 6]} />
        <meshStandardMaterial color="#8899aa" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[s * 0.35, s * 0.35, h + 0.01, 16]} />
        <meshStandardMaterial color="#0d1117" />
      </mesh>
    </group>
  );
}

function WasherPreview({ params }: { params: Record<string, number> }) {
  const s = (params.size || 8) / 12;
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[s * 0.5, s * 0.15, 8, 24]} />
      <meshStandardMaterial color="#c0c8d0" metalness={0.5} roughness={0.4} />
    </mesh>
  );
}

function LBracketPreview({ params }: { params: Record<string, number> }) {
  const w = (params.width || 50) / 60;
  const h = (params.height || 50) / 60;
  const t = (params.thickness || 3) / 20;
  return (
    <group>
      <mesh position={[0, t / 2, 0]}>
        <boxGeometry args={[w, t, w * 0.6]} />
        <meshStandardMaterial color="#c0c8d0" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[-w / 2 + t / 2, h / 2, 0]}>
        <boxGeometry args={[t, h, w * 0.6]} />
        <meshStandardMaterial color="#c0c8d0" metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  );
}

function UChannelPreview({ params }: { params: Record<string, number> }) {
  const w = (params.width || 50) / 70;
  const h = (params.height || 40) / 70;
  const d = (params.depth || 100) / 120;
  const t = (params.thickness || 3) / 30;
  return (
    <group rotation={[0, 0.3, 0]}>
      <mesh position={[0, -h / 2 + t / 2, 0]}>
        <boxGeometry args={[w, t, d]} />
        <meshStandardMaterial color="#c0c8d0" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[-w / 2 + t / 2, 0, 0]}>
        <boxGeometry args={[t, h, d]} />
        <meshStandardMaterial color="#c0c8d0" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[w / 2 - t / 2, 0, 0]}>
        <boxGeometry args={[t, h, d]} />
        <meshStandardMaterial color="#c0c8d0" metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  );
}

function GearPreview({ params }: { params: Record<string, number> }) {
  const teeth = params.teeth || 20;
  const fw = (params.faceWidth || 10) / 20;
  const bore = (params.bore || 8) / 30;
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.8, 0.8, fw, teeth]} />
        <meshStandardMaterial color="#b87333" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[bore, bore, fw + 0.01, 16]} />
        <meshStandardMaterial color="#0d1117" />
      </mesh>
    </group>
  );
}

function BoxEnclosurePreview({ params }: { params: Record<string, number> }) {
  const l = (params.length || 120) / 150;
  const w = (params.width || 80) / 150;
  const h = (params.height || 40) / 100;
  return (
    <mesh>
      <boxGeometry args={[l, h, w]} />
      <meshStandardMaterial color="#4a5568" metalness={0.2} roughness={0.6} transparent opacity={0.85} />
    </mesh>
  );
}

function PipePreview({ params }: { params: Record<string, number> }) {
  const od = (params.od || 50) / 80;
  const len = (params.length || 100) / 120;
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[od * 0.3, od * 0.15, 16, 32, Math.PI * 2]} />
      <meshStandardMaterial color="#8899aa" metalness={0.5} roughness={0.3} />
    </mesh>
  );
}

function FlangePreview({ params }: { params: Record<string, number> }) {
  const od = (params.od || 100) / 120;
  const thick = (params.thickness || 12) / 30;
  const holes = params.holes || 4;
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[od, od, thick, 32]} />
        <meshStandardMaterial color="#8899aa" metalness={0.5} roughness={0.3} />
      </mesh>
      {Array.from({ length: holes }).map((_, i) => {
        const a = (i / holes) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * od * 0.7, 0, Math.sin(a) * od * 0.7]}>
            <cylinderGeometry args={[0.06, 0.06, thick + 0.01, 8]} />
            <meshStandardMaterial color="#0d1117" />
          </mesh>
        );
      })}
    </group>
  );
}

function HeatSinkPreview({ params }: { params: Record<string, number> }) {
  const w = (params.width || 40) / 60;
  const fins = params.fins || 8;
  const fh = (params.finHeight || 15) / 30;
  const bt = (params.baseThick || 3) / 20;
  return (
    <group>
      <mesh position={[0, -fh / 2, 0]}>
        <boxGeometry args={[w, bt, w]} />
        <meshStandardMaterial color="#c0c8d0" metalness={0.5} roughness={0.4} />
      </mesh>
      {Array.from({ length: fins }).map((_, i) => {
        const x = -w / 2 + (w / (fins - 1)) * i;
        return (
          <mesh key={i} position={[x, 0, 0]}>
            <boxGeometry args={[0.02, fh, w * 0.9]} />
            <meshStandardMaterial color="#c0c8d0" metalness={0.5} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

function GenericPreview() {
  return (
    <mesh>
      <cylinderGeometry args={[0.4, 0.4, 0.8, 16]} />
      <meshStandardMaterial color="#8899aa" metalness={0.4} roughness={0.5} />
    </mesh>
  );
}

const previewMap: Record<string, React.FC<{ params: Record<string, number> }>> = {
  bolt: BoltPreview,
  nut: NutPreview,
  washer: WasherPreview,
  lbracket: LBracketPreview,
  uchannel: UChannelPreview,
  spurgear: GearPreview,
  boxenclosure: BoxEnclosurePreview,
  pipe: PipePreview,
  flange: FlangePreview,
  heatsink: HeatSinkPreview,
};

function PartThumbnail({ partId, params }: { partId: string; params: Record<string, number> }) {
  const PreviewComp = previewMap[partId];
  return (
    <Canvas camera={{ position: [2, 1.5, 2], fov: 40 }} style={{ background: "transparent" }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 2]} intensity={1} />
      {PreviewComp ? <PreviewComp params={params} /> : <GenericPreview />}
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={3} />
    </Canvas>
  );
}

// --- Main Component ---
export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("downloads");
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [partParams, setPartParams] = useState<Record<string, Record<string, number>>>({});

  const addObject = useCadStore((s) => s.addGeneratedObject);

  const getParams = useCallback(
    (part: PartDef): Record<string, number> => {
      if (partParams[part.id]) return partParams[part.id];
      const defaults: Record<string, number> = {};
      part.params.forEach((p) => (defaults[p.key] = p.default));
      return defaults;
    },
    [partParams]
  );

  const updateParam = useCallback((partId: string, key: string, value: number) => {
    setPartParams((prev) => ({
      ...prev,
      [partId]: { ...prev[partId], [key]: value },
    }));
  }, []);

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return partDefinitions
      .filter(
        (p) =>
          (activeCat === "All" || p.category === activeCat) &&
          (p.name.toLowerCase().includes(lower) ||
            p.category.toLowerCase().includes(lower) ||
            p.description.toLowerCase().includes(lower))
      )
      .sort((a, b) =>
        sortBy === "downloads"
          ? b.downloads - a.downloads
          : sortBy === "rating"
          ? b.rating - a.rating
          : a.name.localeCompare(b.name)
      );
  }, [search, activeCat, sortBy]);

  const selectedDef = partDefinitions.find((p) => p.id === selectedPart);

  const handleAddToDesigner = useCallback(
    (part: PartDef) => {
      const params = getParams(part);
      const dimStr = part.params.map((p) => `${p.label}: ${params[p.key]}${p.unit}`).join(", ");
      addObject({
        type: "box",
        name: `${part.name} (${dimStr})`,
        dimensions: {
          width: params.width || params.size || params.od || 2,
          height: params.height || params.length || params.faceWidth || 2,
          depth: params.depth || params.width || params.size || 2,
        },
      });
    },
    [getParams, addObject]
  );

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-[#21262d] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-[#00D4FF] text-sm">Parts Library</span>
          <span className="text-[10px] text-slate-500 bg-[#21262d] px-2 py-0.5 rounded-full">
            {filtered.length} parts
          </span>
        </div>
        <div className="flex gap-2">
          <button className="bg-[#00D4FF] hover:bg-[#00b8d9] text-black px-4 py-1.5 rounded-lg text-xs font-bold transition-colors">
            + Upload Part
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#161b22]/50 border-b border-[#21262d] flex-shrink-0">
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parts..."
            className="bg-[#0d1117] rounded-lg px-3 py-1.5 pl-8 text-xs w-56 outline-none border border-[#21262d] focus:border-[#00D4FF] transition-colors"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
            &#128269;
          </span>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-colors ${
                activeCat === c
                  ? "bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30"
                  : "bg-[#21262d] text-slate-400 hover:text-white hover:bg-[#30363d] border border-transparent"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#0d1117] text-xs rounded-lg px-2 py-1.5 border border-[#21262d] text-slate-300"
          >
            <option value="downloads">Most Downloaded</option>
            <option value="rating">Highest Rated</option>
            <option value="name">Alphabetical</option>
          </select>
          <div className="flex border border-[#21262d] rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-2.5 py-1.5 text-xs transition-colors ${
                viewMode === "grid" ? "bg-[#00D4FF]/20 text-[#00D4FF]" : "text-slate-500 hover:text-white"
              }`}
            >
              &#9638;&#9638;
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1.5 text-xs border-l border-[#21262d] transition-colors ${
                viewMode === "list" ? "bg-[#00D4FF]/20 text-[#00D4FF]" : "text-slate-500 hover:text-white"
              }`}
            >
              &#9776;
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Parts Grid/List */}
        <div className="flex-1 overflow-y-auto p-4">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPart(p.id)}
                  className={`bg-[#161b22] rounded-xl cursor-pointer hover:shadow-lg hover:shadow-[#00D4FF]/5 transition-all group ${
                    selectedPart === p.id
                      ? "ring-2 ring-[#00D4FF] shadow-lg shadow-[#00D4FF]/10"
                      : "border border-[#21262d] hover:border-[#30363d]"
                  }`}
                >
                  <div className="h-28 rounded-t-xl overflow-hidden bg-[#0d1117]">
                    <Suspense
                      fallback={
                        <div className="h-full flex items-center justify-center text-slate-600">
                          <div className="w-6 h-6 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin" />
                        </div>
                      }
                    >
                      <PartThumbnail partId={p.id} params={getParams(p)} />
                    </Suspense>
                  </div>
                  <div className="p-2.5">
                    <div className="text-xs font-semibold truncate group-hover:text-[#00D4FF] transition-colors">
                      {p.name}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-slate-500">{p.category}</span>
                      <span className="text-[10px] text-[#00D4FF]/70">{p.author}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-500">
                      <span className="text-amber-400">&#9733; {p.rating}</span>
                      <span>{p.downloads.toLocaleString()} dl</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPart(p.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                    selectedPart === p.id
                      ? "bg-[#00D4FF]/10 border border-[#00D4FF]/30"
                      : "hover:bg-[#161b22] border border-transparent"
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#0d1117] flex-shrink-0">
                    <Suspense fallback={<div className="w-full h-full" />}>
                      <PartThumbnail partId={p.id} params={getParams(p)} />
                    </Suspense>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{p.description}</div>
                  </div>
                  <span className="text-[10px] text-slate-500 flex-shrink-0">{p.category}</span>
                  <span className="text-[10px] text-amber-400 flex-shrink-0">&#9733; {p.rating}</span>
                  <span className="text-[10px] text-slate-500 flex-shrink-0">{p.downloads.toLocaleString()}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToDesigner(p);
                    }}
                    className="bg-[#00D4FF] hover:bg-[#00b8d9] text-black px-3 py-1 rounded-lg text-[10px] font-bold flex-shrink-0 transition-colors"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <div className="text-3xl mb-3">&#128270;</div>
              <div className="text-sm">No parts found</div>
              <div className="text-xs mt-1">Try adjusting your search or category filter</div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedDef && (
          <div className="w-80 bg-[#161b22] border-l border-[#21262d] flex flex-col flex-shrink-0">
            <div className="flex justify-between items-center px-4 py-2.5 border-b border-[#21262d]">
              <h3 className="text-xs font-bold text-[#00D4FF]">Part Details</h3>
              <button
                onClick={() => setSelectedPart(null)}
                className="text-slate-500 hover:text-white text-sm transition-colors"
              >
                &#x2715;
              </button>
            </div>

            {/* 3D Preview */}
            <div className="h-48 bg-[#0d1117] border-b border-[#21262d]">
              <Suspense
                fallback={
                  <div className="h-full flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin" />
                  </div>
                }
              >
                <PartThumbnail partId={selectedDef.id} params={getParams(selectedDef)} />
              </Suspense>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Info */}
              <div>
                <h4 className="font-semibold text-sm">{selectedDef.name}</h4>
                <p className="text-[10px] text-slate-500 mt-1">{selectedDef.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-[#0d1117] p-2 rounded-lg">
                  <div className="text-slate-500">Category</div>
                  <div className="text-white mt-0.5">{selectedDef.category}</div>
                </div>
                <div className="bg-[#0d1117] p-2 rounded-lg">
                  <div className="text-slate-500">Author</div>
                  <div className="text-white mt-0.5">{selectedDef.author}</div>
                </div>
                <div className="bg-[#0d1117] p-2 rounded-lg">
                  <div className="text-slate-500">Rating</div>
                  <div className="text-amber-400 mt-0.5">&#9733; {selectedDef.rating}</div>
                </div>
                <div className="bg-[#0d1117] p-2 rounded-lg">
                  <div className="text-slate-500">Downloads</div>
                  <div className="text-white mt-0.5">{selectedDef.downloads.toLocaleString()}</div>
                </div>
              </div>

              {/* Parametric Sliders */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2">Parameters</h4>
                <div className="space-y-3">
                  {selectedDef.params.map((param) => {
                    const val = getParams(selectedDef)[param.key];
                    return (
                      <div key={param.key}>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-slate-400">{param.label}</span>
                          <span className="text-[#00D4FF] font-mono">
                            {val}
                            {param.unit}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          value={val}
                          onChange={(e) =>
                            updateParam(selectedDef.id, param.key, parseFloat(e.target.value))
                          }
                          className="w-full h-1 bg-[#21262d] rounded-lg appearance-none cursor-pointer accent-[#00D4FF]"
                        />
                        <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                          <span>
                            {param.min}
                            {param.unit}
                          </span>
                          <span>
                            {param.max}
                            {param.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dimension Summary */}
              <div className="bg-[#0d1117] rounded-lg p-3">
                <div className="text-[10px] font-bold text-slate-400 mb-1.5">Current Dimensions</div>
                {selectedDef.params.map((param) => (
                  <div key={param.key} className="flex justify-between text-[10px] py-0.5">
                    <span className="text-slate-500">{param.label}</span>
                    <span className="text-white font-mono">
                      {getParams(selectedDef)[param.key]}
                      {param.unit}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => handleAddToDesigner(selectedDef)}
                  className="w-full bg-[#00D4FF] hover:bg-[#00b8d9] text-black py-2.5 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-[#00D4FF]/20"
                >
                  Add to Designer
                </button>
                <button className="w-full bg-[#21262d] hover:bg-[#30363d] text-slate-300 py-2 rounded-lg text-xs transition-colors">
                  Export as STEP
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-4 px-4 py-1 bg-[#161b22] border-t border-[#21262d] text-[10px] text-slate-500 flex-shrink-0">
        <span>
          Category: <span className="text-white">{activeCat}</span>
        </span>
        <span>
          Showing: <span className="text-white">{filtered.length}</span> of{" "}
          <span className="text-white">{partDefinitions.length}</span>
        </span>
        <span>
          View: <span className="text-white capitalize">{viewMode}</span>
        </span>
        <span className="ml-auto">ShilpaSutra Parts Library v2.0 | Parametric Components</span>
      </div>
    </div>
  );
}
