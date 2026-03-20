"use client";
import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";

const AssemblyViewport = dynamic(() => import("@/components/AssemblyViewport"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0a0e17] text-slate-500">
      Loading 3D viewport...
    </div>
  ),
});

type JointType = "fixed" | "revolute" | "prismatic" | "cylindrical" | "planar" | "coincident" | "concentric" | "distance" | "angle" | "tangent";

interface AssemblyPart {
  id: string;
  name: string;
  type: "box" | "cylinder" | "sphere" | "cone";
  position: [number, number, number];
  rotation: [number, number, number];
  dimensions: { width: number; height: number; depth: number };
  color: string;
  material: string;
  mass: number;
  locked: boolean;
  visible: boolean;
}

interface AssemblyConstraint {
  id: string;
  type: JointType;
  partA: string;
  partB: string;
  label: string;
  value?: number;
}

interface CollisionResult {
  partA: string;
  partB: string;
  overlap: number;
}

const mateTypes: { type: JointType; label: string; icon: string; desc: string }[] = [
  { type: "fixed", label: "Fixed", icon: "F", desc: "No relative motion" },
  { type: "coincident", label: "Coincident", icon: "Co", desc: "Face-to-face contact" },
  { type: "concentric", label: "Concentric", icon: "Cn", desc: "Axis-to-axis alignment" },
  { type: "distance", label: "Distance", icon: "D", desc: "Offset between faces" },
  { type: "angle", label: "Angle", icon: "A", desc: "Angle between planes" },
  { type: "tangent", label: "Tangent", icon: "T", desc: "Tangent surface contact" },
  { type: "revolute", label: "Revolute", icon: "R", desc: "Rotation about one axis" },
  { type: "prismatic", label: "Prismatic", icon: "P", desc: "Translation along one axis" },
];

const defaultParts: AssemblyPart[] = [
  { id: "base", name: "Base Plate", type: "box", position: [0, 0.15, 0], rotation: [0, 0, 0], dimensions: { width: 4, height: 0.3, depth: 3 }, color: "#6688aa", material: "Aluminum 6061", mass: 2.1, locked: true, visible: true },
  { id: "bracket_l", name: "Bracket Left", type: "box", position: [-1.2, 1, 0], rotation: [0, 0, 0], dimensions: { width: 0.3, height: 1.7, depth: 1.5 }, color: "#88aacc", material: "Steel AISI 304", mass: 1.4, locked: false, visible: true },
  { id: "bracket_r", name: "Bracket Right", type: "box", position: [1.2, 1, 0], rotation: [0, 0, 0], dimensions: { width: 0.3, height: 1.7, depth: 1.5 }, color: "#88aacc", material: "Steel AISI 304", mass: 1.4, locked: false, visible: true },
  { id: "shaft", name: "Shaft", type: "cylinder", position: [0, 1.5, 0], rotation: [0, 0, Math.PI / 2], dimensions: { width: 0.2, height: 3, depth: 0.2 }, color: "#aabbcc", material: "Steel AISI 304", mass: 0.8, locked: false, visible: true },
  { id: "motor", name: "Motor Mount", type: "box", position: [0, 2.2, 0], rotation: [0, 0, 0], dimensions: { width: 1.2, height: 0.8, depth: 1 }, color: "#445566", material: "Aluminum 6061", mass: 0.9, locked: false, visible: true },
];

const defaultConstraints: AssemblyConstraint[] = [
  { id: "c1", type: "fixed", partA: "base", partB: "bracket_l", label: "Base-BracketL Fixed" },
  { id: "c2", type: "fixed", partA: "base", partB: "bracket_r", label: "Base-BracketR Fixed" },
  { id: "c3", type: "revolute", partA: "bracket_l", partB: "shaft", label: "Shaft Revolute Joint" },
  { id: "c4", type: "fixed", partA: "shaft", partB: "motor", label: "Motor-Shaft Fixed" },
];

function checkCollisions(parts: AssemblyPart[]): CollisionResult[] {
  const results: CollisionResult[] = [];
  const visible = parts.filter(p => p.visible);
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const a = visible[i], b = visible[j];
      const aMin = [a.position[0] - a.dimensions.width / 2, a.position[1] - a.dimensions.height / 2, a.position[2] - a.dimensions.depth / 2];
      const aMax = [a.position[0] + a.dimensions.width / 2, a.position[1] + a.dimensions.height / 2, a.position[2] + a.dimensions.depth / 2];
      const bMin = [b.position[0] - b.dimensions.width / 2, b.position[1] - b.dimensions.height / 2, b.position[2] - b.dimensions.depth / 2];
      const bMax = [b.position[0] + b.dimensions.width / 2, b.position[1] + b.dimensions.height / 2, b.position[2] + b.dimensions.depth / 2];
      const overlapX = Math.max(0, Math.min(aMax[0], bMax[0]) - Math.max(aMin[0], bMin[0]));
      const overlapY = Math.max(0, Math.min(aMax[1], bMax[1]) - Math.max(aMin[1], bMin[1]));
      const overlapZ = Math.max(0, Math.min(aMax[2], bMax[2]) - Math.max(aMin[2], bMin[2]));
      if (overlapX > 0.01 && overlapY > 0.01 && overlapZ > 0.01) {
        results.push({ partA: a.id, partB: b.id, overlap: Math.round(Math.min(overlapX, overlapY, overlapZ) * 1000) / 1000 });
      }
    }
  }
  return results;
}

function solveConstraint(
  partA: AssemblyPart,
  partB: AssemblyPart,
  constraintType: JointType,
  value?: number
): Partial<AssemblyPart> {
  switch (constraintType) {
    case "coincident":
    case "tangent":
      return {
        position: [
          partB.position[0],
          partA.position[1] + partA.dimensions.height / 2 + partB.dimensions.height / 2,
          partB.position[2],
        ],
      };
    case "concentric":
      return {
        position: [
          partA.position[0],
          partB.position[1],
          partA.position[2],
        ],
      };
    case "distance": {
      const dist = value ?? 0.1;
      return {
        position: [
          partB.position[0],
          partA.position[1] + partA.dimensions.height / 2 + dist + partB.dimensions.height / 2,
          partB.position[2],
        ],
      };
    }
    case "fixed":
      return {};
    case "angle": {
      const rad = ((value ?? 0) * Math.PI) / 180;
      return { rotation: [partB.rotation[0], rad, partB.rotation[2]] };
    }
    default:
      return {};
  }
}

export default function AssemblyPage() {
  const [parts, setParts] = useState<AssemblyPart[]>(defaultParts);
  const [constraints, setConstraints] = useState<AssemblyConstraint[]>(defaultConstraints);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [exploded, setExploded] = useState(false);
  const [explodeFactor, setExplodeFactor] = useState(2.0);
  const [showCollisions, setShowCollisions] = useState(true);
  const [activeJointType, setActiveJointType] = useState<JointType>("fixed");
  const [tab, setTab] = useState<"tree" | "mates" | "properties">("tree");
  const [animating, setAnimating] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);
  const [showBOM, setShowBOM] = useState(false);
  const [showSection, setShowSection] = useState(false);
  const [distanceValue, setDistanceValue] = useState(0.1);

  const collisions = showCollisions ? checkCollisions(parts) : [];
  const totalMass = parts.reduce((sum, p) => sum + p.mass, 0);
  const visibleParts = parts.filter(p => p.visible);

  // Exploded animation
  useEffect(() => {
    if (!animating) return;
    const iv = setInterval(() => {
      setAnimProgress(p => {
        if (p >= 100) { setAnimating(false); return 100; }
        return p + 2;
      });
    }, 30);
    return () => clearInterval(iv);
  }, [animating]);

  const toggleAnimation = () => {
    if (animating) { setAnimating(false); return; }
    setExploded(true);
    setAnimProgress(0);
    setAnimating(true);
  };

  const addPart = (type: AssemblyPart["type"]) => {
    const id = `part_${Date.now()}`;
    const names: Record<string, string> = { box: "Block", cylinder: "Shaft", sphere: "Ball", cone: "Cone" };
    const colors = ["#7799bb", "#99aabb", "#668899", "#8899aa", "#556677"];
    setParts(prev => [...prev, {
      id, name: `${names[type]} ${prev.length + 1}`, type,
      position: [0, 2 + Math.random(), 0], rotation: [0, 0, 0],
      dimensions: type === "cylinder" ? { width: 0.3, height: 1.5, depth: 0.3 } : { width: 1, height: 1, depth: 1 },
      color: colors[prev.length % colors.length],
      material: "Steel AISI 304", mass: +(0.5 + Math.random() * 2).toFixed(1), locked: false, visible: true,
    }]);
  };

  const removePart = (id: string) => {
    setParts(prev => prev.filter(p => p.id !== id));
    setConstraints(prev => prev.filter(c => c.partA !== id && c.partB !== id));
    if (selectedPart === id) setSelectedPart(null);
  };

  const toggleVisibility = (id: string) => {
    setParts(prev => prev.map(p => p.id === id ? { ...p, visible: !p.visible } : p));
  };

  const addConstraint = () => {
    if (parts.length < 2) return;
    const partAId = selectedPart || parts[0].id;
    const partBId = parts.find(p => p.id !== partAId)?.id;
    if (!partBId) return;
    const newConstraint: AssemblyConstraint = {
      id: `con_${Date.now()}`, type: activeJointType, partA: partAId, partB: partBId,
      label: `${parts.find(p => p.id === partAId)?.name}-${parts.find(p => p.id === partBId)?.name} ${activeJointType}`,
      value: activeJointType === "distance" ? distanceValue : activeJointType === "angle" ? 45 : undefined,
    };
    setConstraints(prev => [...prev, newConstraint]);
    // Solve constraint and update partB position
    setParts(prev => {
      const pA = prev.find(p => p.id === partAId);
      const pB = prev.find(p => p.id === partBId);
      if (!pA || !pB) return prev;
      const updates = solveConstraint(pA, pB, activeJointType, newConstraint.value);
      return prev.map(p => p.id === partBId ? { ...p, ...updates } : p);
    });
  };

  const applyAllMates = () => {
    setParts(prev => {
      let updated = [...prev];
      for (const c of constraints) {
        const pA = updated.find(p => p.id === c.partA);
        const pB = updated.find(p => p.id === c.partB);
        if (!pA || !pB) continue;
        const upd = solveConstraint(pA, pB, c.type, c.value);
        updated = updated.map(p => p.id === c.partB ? { ...p, ...upd } : p);
      }
      return updated;
    });
  };

  const removeConstraint = (id: string) => setConstraints(prev => prev.filter(c => c.id !== id));

  const updatePart = (id: string, updates: Partial<AssemblyPart>) => {
    setParts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const exportBOMCSV = useCallback(() => {
    const header = "Item,Part Name,Qty,Material,Mass (kg)\n";
    const rows = parts.map((p, i) => `${i + 1},${p.name},1,${p.material},${p.mass.toFixed(1)}`).join("\n");
    const blob = new Blob([header + rows + `\n,TOTAL,,${parts.length},${totalMass.toFixed(2)}`], { type: "text/csv" });
    const link = document.createElement("a");
    link.download = "assembly_bom.csv";
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [parts, totalMass]);

  const selected = parts.find(p => p.id === selectedPart);

  const mateColor = (type: JointType) => {
    const colors: Record<string, string> = { fixed: "bg-blue-600", revolute: "bg-green-600", prismatic: "bg-yellow-600", coincident: "bg-cyan-600", concentric: "bg-teal-600", distance: "bg-orange-600", angle: "bg-pink-600", tangent: "bg-lime-600" };
    return colors[type] || "bg-purple-600";
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#21262d] px-4 py-2 flex items-center gap-2 shrink-0">
        <span className="text-xs font-bold text-[#00D4FF]">Assembly Workspace</span>
        <div className="h-5 w-px bg-[#21262d] mx-1" />

        {/* Mate type quick-select */}
        <span className="text-[9px] text-slate-500">Mate:</span>
        <div className="flex gap-0.5">
          {mateTypes.slice(0, 6).map(j => (
            <button key={j.type} onClick={() => setActiveJointType(j.type)} title={j.desc}
              className={`px-1.5 py-1 rounded text-[9px] ${activeJointType === j.type ? "bg-[#00D4FF] text-black font-bold" : "bg-[#21262d] text-slate-400 hover:text-white"}`}>
              {j.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button onClick={() => setShowSection(!showSection)}
          className={`px-2 py-1 rounded text-[10px] ${showSection ? "bg-purple-600 text-white" : "bg-[#21262d] text-slate-400"}`}>
          Section
        </button>

        <button onClick={toggleAnimation}
          className={`px-2 py-1 rounded text-[10px] ${animating ? "bg-amber-500 text-black" : "bg-[#21262d] text-slate-400 hover:text-white"}`}>
          {animating ? "Stop" : "Animate"}
        </button>

        <button onClick={() => setExploded(!exploded)}
          className={`px-3 py-1 rounded text-xs font-medium ${exploded ? "bg-yellow-600 text-white" : "bg-[#21262d] text-slate-400 hover:text-white"}`}>
          {exploded ? "Collapse" : "Explode"}
        </button>
        {exploded && (
          <input type="range" min="1" max="5" step="0.5" value={explodeFactor}
            onChange={e => setExplodeFactor(parseFloat(e.target.value))} className="w-16 accent-yellow-500" title={`${explodeFactor}x`} />
        )}

        <button onClick={() => setShowCollisions(!showCollisions)}
          className={`px-2 py-1 rounded text-[10px] ${showCollisions ? (collisions.length > 0 ? "bg-red-600 text-white" : "bg-green-600 text-white") : "bg-[#21262d] text-slate-400"}`}>
          {collisions.length > 0 ? `${collisions.length} Clash` : "No Clash"}
        </button>

        <button onClick={() => setShowBOM(!showBOM)}
          className={`px-2 py-1 rounded text-[10px] ${showBOM ? "bg-blue-600 text-white" : "bg-[#21262d] text-slate-400 hover:text-white"}`}>
          BOM
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-72 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0">
          <div className="flex border-b border-[#21262d]">
            {(["tree", "mates", "properties"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 ${tab === t ? "border-[#00D4FF] text-white" : "border-transparent text-slate-500"}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {tab === "tree" && (
              <div className="space-y-2">
                {/* Add Part buttons */}
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-[10px] text-slate-400 flex-1">Parts ({parts.length})</span>
                  {(["box", "cylinder", "sphere", "cone"] as const).map(t => (
                    <button key={t} onClick={() => addPart(t)}
                      className="text-[9px] px-1.5 py-1 bg-[#21262d] rounded text-slate-300 hover:bg-[#00D4FF] hover:text-black capitalize">
                      +{t === "box" ? "Box" : t === "cylinder" ? "Cyl" : t === "sphere" ? "Sph" : "Cone"}
                    </button>
                  ))}
                </div>

                {/* Parts Tree */}
                {parts.map(part => (
                  <div key={part.id}
                    onClick={() => setSelectedPart(part.id)}
                    className={`bg-[#0d1117] rounded p-2 border text-xs cursor-pointer ${selectedPart === part.id ? "border-[#00D4FF] bg-[#00D4FF]/5" : "border-[#21262d] hover:border-[#30363d]"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Visibility toggle */}
                        <button onClick={e => { e.stopPropagation(); toggleVisibility(part.id); }}
                          className={`text-[10px] ${part.visible ? "text-green-400" : "text-slate-600"}`}>
                          {part.visible ? "V" : "H"}
                        </button>
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: part.color }} />
                        <span className={`font-medium ${part.visible ? "text-white" : "text-slate-500"}`}>{part.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {part.locked && <span className="text-[8px] text-yellow-500">LCK</span>}
                        <button onClick={e => { e.stopPropagation(); removePart(part.id); }}
                          className="text-slate-600 hover:text-red-400 text-[10px]">x</button>
                      </div>
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5 ml-7">
                      {part.material} | {part.mass.toFixed(1)} kg | {part.type}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "mates" && (
              <div className="space-y-2">
                {activeJointType === "distance" && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-slate-400">Distance (m):</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={distanceValue}
                      onChange={e => setDistanceValue(parseFloat(e.target.value) || 0.1)}
                      className="flex-1 bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-xs text-right"
                    />
                  </div>
                )}
                <button onClick={addConstraint}
                  className="w-full bg-[#21262d] hover:bg-[#30363d] text-xs py-2 rounded text-white border border-[#21262d] mb-1">
                  + Add {activeJointType} Mate
                </button>
                <button onClick={applyAllMates}
                  className="w-full bg-blue-600/20 hover:bg-blue-600/40 text-xs py-2 rounded text-blue-300 border border-blue-600/30 mb-1">
                  Apply All Mates
                </button>

                {constraints.map(c => (
                  <div key={c.id} className="bg-[#0d1117] rounded p-2 border border-[#21262d] text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded text-[9px] flex items-center justify-center font-bold text-white ${mateColor(c.type)}`}>
                          {c.type[0].toUpperCase()}
                        </span>
                        <span className="text-white truncate max-w-[160px]">{c.label}</span>
                      </div>
                      <button onClick={() => removeConstraint(c.id)} className="text-slate-600 hover:text-red-400 text-[10px]">x</button>
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1 ml-7">
                      {c.type} | {parts.find(p => p.id === c.partA)?.name} - {parts.find(p => p.id === c.partB)?.name}
                    </div>
                  </div>
                ))}

                {collisions.length > 0 && (
                  <>
                    <h4 className="text-[10px] font-bold text-red-400 uppercase mt-3">Interference Detected</h4>
                    {collisions.map((col, i) => (
                      <div key={i} className="bg-red-500/10 border border-red-500/30 rounded p-2 text-xs text-red-300">
                        {parts.find(p => p.id === col.partA)?.name} - {parts.find(p => p.id === col.partB)?.name}
                        <span className="text-[9px] text-red-400 ml-1">({col.overlap}m)</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {tab === "properties" && selected && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300">{selected.name}</h3>
                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Name</span>
                    <input type="text" value={selected.name}
                      onChange={e => updatePart(selected.id, { name: e.target.value })}
                      className="w-32 bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-right" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Color</span>
                    <input type="color" value={selected.color}
                      onChange={e => updatePart(selected.id, { color: e.target.value })} className="w-8 h-6 rounded cursor-pointer" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Mass (kg)</span>
                    <input type="number" step="0.1" value={selected.mass}
                      onChange={e => updatePart(selected.id, { mass: parseFloat(e.target.value) || 0.1 })}
                      className="w-20 bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-right" />
                  </div>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={selected.locked}
                      onChange={e => updatePart(selected.id, { locked: e.target.checked })} className="accent-[#00D4FF]" />
                    Lock Position
                  </label>
                </div>

                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                  <div className="text-slate-400 mb-1">Position</div>
                  {(["X", "Y", "Z"] as const).map((axis, i) => (
                    <div key={axis} className="flex items-center justify-between">
                      <span className="text-slate-500">{axis}</span>
                      <input type="number" step="0.1" value={Number(selected.position[i].toFixed(2))}
                        onChange={e => {
                          const pos = [...selected.position] as [number, number, number];
                          pos[i] = parseFloat(e.target.value) || 0;
                          updatePart(selected.id, { position: pos });
                        }}
                        className="w-20 bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-right" />
                    </div>
                  ))}
                </div>

                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                  <div className="text-slate-400 mb-1">Dimensions</div>
                  {(["width", "height", "depth"] as const).map(d => (
                    <div key={d} className="flex items-center justify-between">
                      <span className="text-slate-500 capitalize">{d}</span>
                      <input type="number" step="0.1" min="0.1" value={selected.dimensions[d]}
                        onChange={e => updatePart(selected.id, { dimensions: { ...selected.dimensions, [d]: parseFloat(e.target.value) || 0.1 } })}
                        className="w-20 bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-right" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "properties" && !selected && (
              <div className="text-xs text-slate-500 p-3">Select a part to view properties.</div>
            )}
          </div>
        </div>

        {/* 3D Viewport */}
        <div className="flex-1 relative">
          <AssemblyViewport
            parts={visibleParts}
            constraints={constraints}
            selectedPart={selectedPart}
            onSelectPart={setSelectedPart}
            exploded={exploded}
            explodeFactor={animating ? explodeFactor * (animProgress / 100) : explodeFactor}
            collisions={collisions}
          />
        </div>

        {/* BOM Panel */}
        {showBOM && (
          <div className="w-72 bg-[#161b22] border-l border-[#21262d] flex flex-col shrink-0">
            <div className="px-3 py-2 border-b border-[#21262d] flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Bill of Materials</span>
              <button onClick={exportBOMCSV} className="text-[9px] text-[#00D4FF] hover:text-white">Export CSV</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#21262d] text-slate-400">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Part</th>
                    <th className="text-center p-2">Qty</th>
                    <th className="text-left p-2">Material</th>
                    <th className="text-right p-2">Mass</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((p, i) => (
                    <tr key={p.id} className="border-b border-[#21262d]/50 text-slate-300">
                      <td className="p-2">{i + 1}</td>
                      <td className="p-2 text-white">{p.name}</td>
                      <td className="p-2 text-center">1</td>
                      <td className="p-2 text-slate-500 text-[10px]">{p.material}</td>
                      <td className="p-2 text-right">{p.mass.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-3 border-t border-[#21262d] text-xs space-y-1">
                <div className="text-slate-400">Total Parts: <span className="text-white">{parts.length}</span></div>
                <div className="text-slate-400">Total Mass: <span className="text-white">{totalMass.toFixed(2)} kg</span></div>
                <div className="text-slate-400">Mates: <span className="text-white">{constraints.length}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-4 px-4 py-1 bg-[#0d1117] border-t border-[#21262d] text-[10px] text-slate-500 shrink-0">
        <span>Parts: {parts.length} ({visibleParts.length} visible)</span>
        <span>Mates: {constraints.length}</span>
        <span>Mass: {totalMass.toFixed(2)} kg</span>
        <span>Collisions: <span className={collisions.length > 0 ? "text-red-400" : "text-green-400"}>{collisions.length}</span></span>
        {exploded && <span className="text-yellow-400">Exploded ({explodeFactor}x)</span>}
        {animating && <span className="text-amber-400">Animating... {animProgress.toFixed(0)}%</span>}
        {showSection && <span className="text-purple-400">Section View</span>}
        <span className="ml-auto">Assembly Engine v2.0</span>
      </div>
    </div>
  );
}
