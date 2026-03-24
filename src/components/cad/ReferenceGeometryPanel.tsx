"use client";
import { useState, useCallback } from "react";
import { useCadStore } from "@/stores/cad-store";
import { X, Crosshair, ArrowRight, CircleDot, Plane } from "lucide-react";

type RefGeoType = "plane" | "axis" | "point";
type PlaneMethod = "offset" | "angle" | "3point" | "normal_to_curve" | "midplane";
type AxisMethod = "2point" | "intersection" | "cylindrical" | "normal";

/**
 * Reference Geometry creation panel - SolidWorks-style.
 * Create Reference Planes, Axes, and Points for construction geometry.
 */
export default function ReferenceGeometryPanel({ onClose }: { onClose: () => void }) {
  const [refType, setRefType] = useState<RefGeoType>("plane");
  const [planeMethod, setPlaneMethod] = useState<PlaneMethod>("offset");
  const [axisMethod, setAxisMethod] = useState<AxisMethod>("2point");
  const [offsetDistance, setOffsetDistance] = useState(10);
  const [offsetAngle, setOffsetAngle] = useState(0);
  const [refPlane, setRefPlane] = useState<"xy" | "xz" | "yz">("xz");
  const [flipDirection, setFlipDirection] = useState(false);

  const addObject = useCadStore((s) => s.addObject);

  const handleCreate = useCallback(() => {
    if (refType === "plane") {
      // Create a visual reference plane
      const id = addObject("box");
      const store = useCadStore.getState();
      const planeOffset = flipDirection ? -offsetDistance / 10 : offsetDistance / 10;
      const pos: [number, number, number] =
        refPlane === "xy" ? [0, planeOffset, 0] :
        refPlane === "xz" ? [0, planeOffset, 0] :
        [planeOffset, 0, 0];

      store.updateObject(id, {
        name: `Ref.Plane (${refPlane.toUpperCase()} +${offsetDistance}mm)`,
        position: pos,
        dimensions: { width: 4, height: 0.01, depth: 4 },
        color: refPlane === "xy" ? "#6366f1" : refPlane === "xz" ? "#22c55e" : "#ef4444",
        opacity: 0.15,
      });
      store.selectObject(id);
    } else if (refType === "axis") {
      const id = addObject("cylinder");
      const store = useCadStore.getState();
      store.updateObject(id, {
        name: `Ref.Axis (${axisMethod})`,
        dimensions: { width: 0.02, height: 6, depth: 0.02 },
        color: "#f59e0b",
        opacity: 0.4,
      });
      store.selectObject(id);
    } else {
      const id = addObject("sphere");
      const store = useCadStore.getState();
      store.updateObject(id, {
        name: "Ref.Point",
        dimensions: { width: 0.1, height: 0.1, depth: 0.1 },
        color: "#ef4444",
        opacity: 0.8,
      });
      store.selectObject(id);
    }
    onClose();
  }, [refType, planeMethod, axisMethod, offsetDistance, refPlane, flipDirection, addObject, onClose]);

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto animate-scale-in">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl shadow-black/50 w-[360px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d]">
          <div className="flex items-center gap-2">
            <Plane size={16} className="text-[#00D4FF]" />
            <span className="text-sm font-semibold text-white">Reference Geometry</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#21262d] transition-all">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Type selector */}
          <div className="flex gap-1.5">
            {([
              { id: "plane" as RefGeoType, icon: <Plane size={13} />, label: "Plane" },
              { id: "axis" as RefGeoType, icon: <ArrowRight size={13} />, label: "Axis" },
              { id: "point" as RefGeoType, icon: <CircleDot size={13} />, label: "Point" },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => setRefType(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[10px] font-medium transition-all ${
                  refType === t.id
                    ? "bg-[#00D4FF]/10 border-[#00D4FF]/30 text-[#00D4FF]"
                    : "border-[#21262d] text-slate-400 hover:text-white hover:bg-[#21262d]"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Plane settings */}
          {refType === "plane" && (
            <>
              <div>
                <label className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider block mb-1.5">Method</label>
                <div className="grid grid-cols-3 gap-1">
                  {([
                    { id: "offset" as PlaneMethod, label: "Offset" },
                    { id: "angle" as PlaneMethod, label: "At Angle" },
                    { id: "3point" as PlaneMethod, label: "3 Points" },
                    { id: "normal_to_curve" as PlaneMethod, label: "Normal" },
                    { id: "midplane" as PlaneMethod, label: "Midplane" },
                  ]).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPlaneMethod(m.id)}
                      className={`px-2 py-1.5 rounded text-[9px] font-medium border transition-all ${
                        planeMethod === m.id
                          ? "bg-[#00D4FF]/10 border-[#00D4FF]/25 text-[#00D4FF]"
                          : "border-[#21262d] text-slate-500 hover:text-white hover:bg-[#21262d]"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider block mb-1.5">Reference Plane</label>
                <div className="flex gap-1.5">
                  {(["xy", "xz", "yz"] as const).map((p) => {
                    const colors = { xy: "#6366f1", xz: "#22c55e", yz: "#ef4444" };
                    return (
                      <button
                        key={p}
                        onClick={() => setRefPlane(p)}
                        className={`flex-1 py-1.5 rounded-md text-[10px] font-semibold border transition-all ${
                          refPlane === p
                            ? `border-opacity-50 text-opacity-100`
                            : "border-[#21262d] text-slate-500 hover:text-white hover:bg-[#21262d]"
                        }`}
                        style={refPlane === p ? {
                          backgroundColor: `${colors[p]}15`,
                          borderColor: `${colors[p]}50`,
                          color: colors[p],
                        } : undefined}
                      >
                        {p.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] text-slate-500 block mb-1">Offset Distance (mm)</label>
                  <input
                    type="number"
                    value={offsetDistance}
                    onChange={(e) => setOffsetDistance(parseFloat(e.target.value) || 0)}
                    step={5}
                    className="w-full px-2.5 py-1.5 bg-[#0d1117] border border-[#21262d] rounded-md text-xs text-white font-mono focus:border-[#00D4FF]/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-slate-500 block mb-1">Flip Direction</label>
                  <button
                    onClick={() => setFlipDirection(!flipDirection)}
                    className={`w-full py-1.5 rounded-md text-[10px] font-medium border transition-all ${
                      flipDirection
                        ? "bg-orange-500/10 border-orange-500/25 text-orange-400"
                        : "border-[#21262d] text-slate-500 hover:text-white hover:bg-[#21262d]"
                    }`}
                  >
                    {flipDirection ? "⟵ Flipped" : "⟶ Normal"}
                  </button>
                </div>
              </div>

              {planeMethod === "angle" && (
                <div>
                  <label className="text-[8px] text-slate-500 block mb-1">Angle (°)</label>
                  <input
                    type="number"
                    value={offsetAngle}
                    onChange={(e) => setOffsetAngle(parseFloat(e.target.value) || 0)}
                    step={5}
                    className="w-full px-2.5 py-1.5 bg-[#0d1117] border border-[#21262d] rounded-md text-xs text-white font-mono focus:border-[#00D4FF]/50 focus:outline-none"
                  />
                </div>
              )}
            </>
          )}

          {/* Axis settings */}
          {refType === "axis" && (
            <div>
              <label className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider block mb-1.5">Method</label>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { id: "2point" as AxisMethod, label: "Two Points" },
                  { id: "intersection" as AxisMethod, label: "Intersection" },
                  { id: "cylindrical" as AxisMethod, label: "Cylindrical Face" },
                  { id: "normal" as AxisMethod, label: "Normal to Plane" },
                ]).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setAxisMethod(m.id)}
                    className={`px-2 py-2 rounded-lg text-[9px] font-medium border transition-all ${
                      axisMethod === m.id
                        ? "bg-[#00D4FF]/10 border-[#00D4FF]/25 text-[#00D4FF]"
                        : "border-[#21262d] text-slate-500 hover:text-white hover:bg-[#21262d]"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="text-[8px] text-slate-600 mt-2">
                {axisMethod === "2point" && "Select two points or vertices to define the axis direction."}
                {axisMethod === "intersection" && "Select two planes. The axis passes through their intersection."}
                {axisMethod === "cylindrical" && "Select a cylindrical face to extract its central axis."}
                {axisMethod === "normal" && "Select a plane and a point. Axis is normal to the plane at that point."}
              </p>
            </div>
          )}

          {/* Point settings */}
          {refType === "point" && (
            <div className="space-y-3">
              <p className="text-[9px] text-slate-400">
                Create a reference point by clicking on geometry or entering coordinates.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["X", "Y", "Z"] as const).map((axis) => (
                  <div key={axis}>
                    <label className="text-[8px] text-slate-500 block mb-1">{axis}</label>
                    <input
                      type="number"
                      defaultValue={0}
                      step={1}
                      className="w-full px-2 py-1.5 bg-[#0d1117] border border-[#21262d] rounded text-[10px] text-white font-mono focus:border-[#00D4FF]/50 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#21262d]">
          <button onClick={onClose} className="px-3 py-1.5 text-[10px] text-slate-400 hover:text-white border border-[#21262d] rounded-md hover:bg-[#21262d] transition-all">
            Cancel
          </button>
          <button onClick={handleCreate} className="px-4 py-1.5 text-[10px] font-semibold text-white bg-[#00D4FF]/20 border border-[#00D4FF]/30 rounded-md hover:bg-[#00D4FF]/30 transition-all">
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
