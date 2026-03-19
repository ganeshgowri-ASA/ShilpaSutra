"use client";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";

const AssemblyViewport = dynamic(() => import("@/components/AssemblyViewport"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0a0e17] text-slate-500">
      Loading 3D viewport...
    </div>
  ),
});

type JointType = "fixed" | "revolute" | "prismatic" | "cylindrical" | "planar";

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
}

interface AssemblyConstraint {
  id: string;
  type: JointType;
  partA: string;
  partB: string;
  label: string;
}

interface CollisionResult {
  partA: string;
  partB: string;
  overlap: number;
}

const jointTypes: { type: JointType; label: string; icon: string; desc: string }[] = [
  { type: "fixed", label: "Fixed", icon: "F", desc: "No relative motion" },
  { type: "revolute", label: "Revolute", icon: "R", desc: "Rotation about one axis" },
  { type: "prismatic", label: "Prismatic", icon: "P", desc: "Translation along one axis" },
  { type: "cylindrical", label: "Cylindrical", icon: "C", desc: "Rotation + translation" },
  { type: "planar", label: "Planar", icon: "S", desc: "Motion in a plane" },
];

const defaultParts: AssemblyPart[] = [
  { id: "base", name: "Base Plate", type: "box", position: [0, 0.15, 0], rotation: [0, 0, 0], dimensions: { width: 4, height: 0.3, depth: 3 }, color: "#6688aa", material: "Aluminum 6061", mass: 2.1, locked: true },
  { id: "bracket_l", name: "Bracket Left", type: "box", position: [-1.2, 1, 0], rotation: [0, 0, 0], dimensions: { width: 0.3, height: 1.7, depth: 1.5 }, color: "#88aacc", material: "Steel AISI 304", mass: 1.4, locked: false },
  { id: "bracket_r", name: "Bracket Right", type: "box", position: [1.2, 1, 0], rotation: [0, 0, 0], dimensions: { width: 0.3, height: 1.7, depth: 1.5 }, color: "#88aacc", material: "Steel AISI 304", mass: 1.4, locked: false },
  { id: "shaft", name: "Shaft", type: "cylinder", position: [0, 1.5, 0], rotation: [0, 0, Math.PI / 2], dimensions: { width: 0.2, height: 3, depth: 0.2 }, color: "#aabbcc", material: "Steel AISI 304", mass: 0.8, locked: false },
  { id: "motor", name: "Motor Mount", type: "box", position: [0, 2.2, 0], rotation: [0, 0, 0], dimensions: { width: 1.2, height: 0.8, depth: 1 }, color: "#445566", material: "Aluminum 6061", mass: 0.9, locked: false },
];

const defaultConstraints: AssemblyConstraint[] = [
  { id: "c1", type: "fixed", partA: "base", partB: "bracket_l", label: "Base-BracketL Fixed" },
  { id: "c2", type: "fixed", partA: "base", partB: "bracket_r", label: "Base-BracketR Fixed" },
  { id: "c3", type: "revolute", partA: "bracket_l", partB: "shaft", label: "Shaft Revolute Joint" },
  { id: "c4", type: "fixed", partA: "shaft", partB: "motor", label: "Motor-Shaft Fixed" },
];

function checkCollisions(parts: AssemblyPart[]): CollisionResult[] {
  const results: CollisionResult[] = [];
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i];
      const b = parts[j];
      // Simple AABB collision
      const aMin = [a.position[0] - a.dimensions.width / 2, a.position[1] - a.dimensions.height / 2, a.position[2] - a.dimensions.depth / 2];
      const aMax = [a.position[0] + a.dimensions.width / 2, a.position[1] + a.dimensions.height / 2, a.position[2] + a.dimensions.depth / 2];
      const bMin = [b.position[0] - b.dimensions.width / 2, b.position[1] - b.dimensions.height / 2, b.position[2] - b.dimensions.depth / 2];
      const bMax = [b.position[0] + b.dimensions.width / 2, b.position[1] + b.dimensions.height / 2, b.position[2] + b.dimensions.depth / 2];

      const overlapX = Math.max(0, Math.min(aMax[0], bMax[0]) - Math.max(aMin[0], bMin[0]));
      const overlapY = Math.max(0, Math.min(aMax[1], bMax[1]) - Math.max(aMin[1], bMin[1]));
      const overlapZ = Math.max(0, Math.min(aMax[2], bMax[2]) - Math.max(aMin[2], bMin[2]));

      if (overlapX > 0.01 && overlapY > 0.01 && overlapZ > 0.01) {
        const overlap = Math.min(overlapX, overlapY, overlapZ);
        results.push({ partA: a.id, partB: b.id, overlap: Math.round(overlap * 1000) / 1000 });
      }
    }
  }
  return results;
}

export default function AssemblyPage() {
  const [parts, setParts] = useState<AssemblyPart[]>(defaultParts);
  const [constraints, setConstraints] = useState<AssemblyConstraint[]>(defaultConstraints);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [exploded, setExploded] = useState(false);
  const [explodeFactor, setExplodeFactor] = useState(2.0);
  const [showCollisions, setShowCollisions] = useState(true);
  const [bomView, setBomView] = useState(false);
  const [activeJointType, setActiveJointType] = useState<JointType>("fixed");
  const [tab, setTab] = useState<"parts" | "constraints" | "properties">("parts");

  const collisions = showCollisions ? checkCollisions(parts) : [];
  const totalMass = parts.reduce((sum, p) => sum + p.mass, 0);

  const addPart = (type: AssemblyPart["type"]) => {
    const id = `part_${Date.now()}`;
    const names: Record<string, string> = { box: "Block", cylinder: "Shaft", sphere: "Ball", cone: "Cone" };
    const colors = ["#7799bb", "#99aabb", "#668899", "#8899aa", "#556677"];
    setParts((prev) => [
      ...prev,
      {
        id,
        name: `${names[type]} ${prev.length + 1}`,
        type,
        position: [0, 2 + Math.random(), 0],
        rotation: [0, 0, 0],
        dimensions: type === "cylinder" ? { width: 0.3, height: 1.5, depth: 0.3 } : { width: 1, height: 1, depth: 1 },
        color: colors[prev.length % colors.length],
        material: "Steel AISI 304",
        mass: 0.5 + Math.random() * 2,
        locked: false,
      },
    ]);
  };

  const removePart = (id: string) => {
    setParts((prev) => prev.filter((p) => p.id !== id));
    setConstraints((prev) => prev.filter((c) => c.partA !== id && c.partB !== id));
    if (selectedPart === id) setSelectedPart(null);
  };

  const addConstraint = () => {
    if (parts.length < 2) return;
    const partA = selectedPart || parts[0].id;
    const partB = parts.find((p) => p.id !== partA)?.id;
    if (!partB) return;
    setConstraints((prev) => [
      ...prev,
      {
        id: `con_${Date.now()}`,
        type: activeJointType,
        partA,
        partB,
        label: `${parts.find((p) => p.id === partA)?.name}-${parts.find((p) => p.id === partB)?.name} ${activeJointType}`,
      },
    ]);
  };

  const removeConstraint = (id: string) => {
    setConstraints((prev) => prev.filter((c) => c.id !== id));
  };

  const updatePart = (id: string, updates: Partial<AssemblyPart>) => {
    setParts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const selected = parts.find((p) => p.id === selectedPart);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#21262d] px-4 py-2 flex items-center gap-2 shrink-0">
        <span className="text-xs font-bold text-[#e94560]">Assembly Workspace</span>
        <div className="h-5 w-px bg-[#21262d] mx-1" />

        {/* Joint type selector */}
        <span className="text-[9px] text-slate-500 uppercase">Joint:</span>
        {jointTypes.map((j) => (
          <button
            key={j.type}
            onClick={() => setActiveJointType(j.type)}
            title={j.desc}
            className={`px-2 py-1 rounded text-[10px] ${
              activeJointType === j.type ? "bg-[#e94560] text-white" : "bg-[#21262d] text-slate-400 hover:text-white"
            }`}
          >
            {j.label}
          </button>
        ))}

        <div className="flex-1" />

        <button
          onClick={() => setExploded(!exploded)}
          className={`px-3 py-1 rounded text-xs font-medium ${exploded ? "bg-yellow-600 text-white" : "bg-[#21262d] text-slate-400 hover:text-white"}`}
        >
          {exploded ? "Collapse" : "Explode"}
        </button>
        {exploded && (
          <input
            type="range"
            min="1"
            max="5"
            step="0.5"
            value={explodeFactor}
            onChange={(e) => setExplodeFactor(parseFloat(e.target.value))}
            className="w-20 accent-yellow-500"
            title={`Explode factor: ${explodeFactor}x`}
          />
        )}
        <button
          onClick={() => setShowCollisions(!showCollisions)}
          className={`px-3 py-1 rounded text-xs ${showCollisions ? (collisions.length > 0 ? "bg-red-600 text-white" : "bg-green-600 text-white") : "bg-[#21262d] text-slate-400"}`}
        >
          {showCollisions ? (collisions.length > 0 ? `${collisions.length} Collisions` : "No Collisions") : "Check Collisions"}
        </button>
        <button
          onClick={() => setBomView(!bomView)}
          className={`px-3 py-1 rounded text-xs ${bomView ? "bg-blue-600 text-white" : "bg-[#21262d] text-slate-400 hover:text-white"}`}
        >
          BOM
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div className="w-72 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-[#21262d]">
            {(["parts", "constraints", "properties"] as const).map((t) => (
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
            {tab === "parts" && (
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 flex-1">Parts ({parts.length})</span>
                  {(["box", "cylinder", "sphere", "cone"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => addPart(t)}
                      className="text-[10px] px-2 py-1 bg-[#21262d] rounded text-slate-300 hover:bg-[#e94560] hover:text-white capitalize"
                    >
                      +{t === "box" ? "Box" : t === "cylinder" ? "Cyl" : t === "sphere" ? "Sph" : "Cone"}
                    </button>
                  ))}
                </div>
                {parts.map((part) => (
                  <div
                    key={part.id}
                    onClick={() => setSelectedPart(part.id)}
                    className={`bg-[#0d1117] rounded p-2 border text-xs cursor-pointer ${
                      selectedPart === part.id ? "border-[#e94560] bg-[#e94560]/5" : "border-[#21262d] hover:border-[#30363d]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: part.color }} />
                        <span className="text-white font-medium">{part.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {part.locked && <span className="text-[9px] text-yellow-500">LOCKED</span>}
                        <button onClick={(e) => { e.stopPropagation(); removePart(part.id); }} className="text-slate-600 hover:text-red-400 text-[10px]">x</button>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {part.material} | {part.mass.toFixed(1)} kg | {part.type}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "constraints" && (
              <div className="space-y-3">
                <button
                  onClick={addConstraint}
                  className="w-full bg-[#21262d] hover:bg-[#30363d] text-xs py-2 rounded text-white border border-[#21262d]"
                >
                  + Add {activeJointType} Constraint
                </button>
                {constraints.map((c) => (
                  <div key={c.id} className="bg-[#0d1117] rounded p-2 border border-[#21262d] text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded text-[10px] flex items-center justify-center font-bold ${
                          c.type === "fixed" ? "bg-blue-600" : c.type === "revolute" ? "bg-green-600" : c.type === "prismatic" ? "bg-yellow-600" : "bg-purple-600"
                        }`}>
                          {c.type[0].toUpperCase()}
                        </span>
                        <span className="text-white">{c.label}</span>
                      </div>
                      <button onClick={() => removeConstraint(c.id)} className="text-slate-600 hover:text-red-400 text-[10px]">x</button>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 ml-7">
                      Type: {c.type} | {parts.find((p) => p.id === c.partA)?.name} &harr; {parts.find((p) => p.id === c.partB)?.name}
                    </div>
                  </div>
                ))}

                {collisions.length > 0 && (
                  <>
                    <h4 className="text-xs font-bold text-red-400 uppercase mt-4">Collisions Detected</h4>
                    {collisions.map((col, i) => (
                      <div key={i} className="bg-red-500/10 border border-red-500/30 rounded p-2 text-xs text-red-300">
                        {parts.find((p) => p.id === col.partA)?.name} &harr; {parts.find((p) => p.id === col.partB)?.name}
                        <span className="text-[10px] text-red-400 ml-2">overlap: {col.overlap}m</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {tab === "properties" && selected && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase">{selected.name}</h3>
                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Name</span>
                    <input
                      type="text"
                      value={selected.name}
                      onChange={(e) => updatePart(selected.id, { name: e.target.value })}
                      className="w-32 bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-right"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Color</span>
                    <input
                      type="color"
                      value={selected.color}
                      onChange={(e) => updatePart(selected.id, { color: e.target.value })}
                      className="w-8 h-6 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Mass (kg)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={selected.mass}
                      onChange={(e) => updatePart(selected.id, { mass: parseFloat(e.target.value) || 0.1 })}
                      className="w-20 bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-right"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.locked}
                      onChange={(e) => updatePart(selected.id, { locked: e.target.checked })}
                      className="accent-[#e94560]"
                    />
                    Lock Position
                  </label>
                </div>

                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                  <div className="text-slate-400 mb-1">Position</div>
                  {(["X", "Y", "Z"] as const).map((axis, i) => (
                    <div key={axis} className="flex items-center justify-between">
                      <span className="text-slate-500">{axis}</span>
                      <input
                        type="number"
                        step="0.1"
                        value={Number(selected.position[i].toFixed(2))}
                        onChange={(e) => {
                          const pos = [...selected.position] as [number, number, number];
                          pos[i] = parseFloat(e.target.value) || 0;
                          updatePart(selected.id, { position: pos });
                        }}
                        className="w-20 bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-right"
                      />
                    </div>
                  ))}
                </div>

                <div className="bg-[#0d1117] rounded p-3 border border-[#21262d] text-xs space-y-2">
                  <div className="text-slate-400 mb-1">Dimensions</div>
                  {(["width", "height", "depth"] as const).map((d) => (
                    <div key={d} className="flex items-center justify-between">
                      <span className="text-slate-500 capitalize">{d}</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={selected.dimensions[d]}
                        onChange={(e) => updatePart(selected.id, { dimensions: { ...selected.dimensions, [d]: parseFloat(e.target.value) || 0.1 } })}
                        className="w-20 bg-[#161b22] text-white rounded px-2 py-1 border border-[#21262d] text-right"
                      />
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
            parts={parts}
            constraints={constraints}
            selectedPart={selectedPart}
            onSelectPart={setSelectedPart}
            exploded={exploded}
            explodeFactor={explodeFactor}
            collisions={collisions}
          />
        </div>

        {/* BOM Panel */}
        {bomView && (
          <div className="w-72 bg-[#161b22] border-l border-[#21262d] flex flex-col shrink-0">
            <div className="px-3 py-2 border-b border-[#21262d] text-xs font-bold text-slate-300">Bill of Materials</div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#21262d] text-slate-400">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Part</th>
                    <th className="text-left p-2">Material</th>
                    <th className="text-right p-2">Mass</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((p, i) => (
                    <tr key={p.id} className="border-b border-[#21262d]/50 text-slate-300">
                      <td className="p-2">{i + 1}</td>
                      <td className="p-2">{p.name}</td>
                      <td className="p-2 text-slate-500">{p.material}</td>
                      <td className="p-2 text-right">{p.mass.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-3 border-t border-[#21262d] text-xs space-y-1">
                <div className="text-slate-400">Total Parts: <span className="text-white">{parts.length}</span></div>
                <div className="text-slate-400">Total Mass: <span className="text-white">{totalMass.toFixed(2)} kg</span></div>
                <div className="text-slate-400">Constraints: <span className="text-white">{constraints.length}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-4 px-4 py-1 bg-[#0d1117] border-t border-[#21262d] text-[10px] text-slate-500 shrink-0">
        <span>Parts: {parts.length}</span>
        <span>Constraints: {constraints.length}</span>
        <span>Mass: {totalMass.toFixed(2)} kg</span>
        <span>Collisions: <span className={collisions.length > 0 ? "text-red-400" : "text-green-400"}>{collisions.length}</span></span>
        {exploded && <span className="text-yellow-400">Exploded View ({explodeFactor}x)</span>}
        <span className="ml-auto">Assembly Engine v2.0</span>
      </div>
    </div>
  );
}
