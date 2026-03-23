"use client";
import { useCallback, useState } from "react";
import {
  useCadStore,
  materialList,
  getMaterialColor,
  type UnitType,
} from "@/stores/cad-store";
import {
  Settings2, Move, RotateCw, Scale, Ruler, Palette,
  Info, PanelRightClose, PanelRight, Download,
} from "lucide-react";
import * as THREE from "three";

function NumericInput({
  value,
  onChange,
  label,
  unit = "mm",
  step = 0.1,
  min,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  unit?: string;
  step?: number;
  min?: number;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartValue, setDragStartValue] = useState(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      setIsDragging(true);
      setDragStartX(e.clientX);
      setDragStartValue(value);

      const handleMouseMove = (me: MouseEvent) => {
        const dx = me.clientX - e.clientX;
        const sensitivity = me.shiftKey ? 0.01 : 0.1;
        const newValue = parseFloat((value + dx * sensitivity).toFixed(2));
        onChange(min !== undefined ? Math.max(min, newValue) : newValue);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [value, onChange, min]
  );

  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[10px] text-slate-500 w-6 cursor-ew-resize select-none"
        onMouseDown={handleMouseDown}
      >
        {label}
      </span>
      <div className="flex-1 relative">
        <input
          type="number"
          step={step}
          min={min}
          value={Number(value.toFixed(2))}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(min !== undefined ? Math.max(min, v) : v);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              const inc = e.shiftKey ? 10 : 1;
              onChange(value + inc * step);
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              const inc = e.shiftKey ? 10 : 1;
              const newVal = value - inc * step;
              onChange(min !== undefined ? Math.max(min, newVal) : newVal);
            }
          }}
          className="w-full bg-[#0d1117] text-[11px] text-white rounded px-2 py-1 border border-[#16213e] focus:border-[#00D4FF]/50 outline-none text-right pr-8 font-mono"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-600">
          {unit}
        </span>
      </div>
    </div>
  );
}

function SliderInput({
  value,
  onChange,
  label,
  min = 0,
  max = 1,
  step = 0.01,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500">{label}</span>
        <span className="text-[10px] text-slate-400 font-mono">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 accent-[#00D4FF] bg-[#16213e] rounded-full appearance-none cursor-pointer"
      />
    </div>
  );
}

function computeVolume(obj: { type: string; dimensions: { width: number; height: number; depth: number } }) {
  switch (obj.type) {
    case "box":
      return obj.dimensions.width * obj.dimensions.height * obj.dimensions.depth;
    case "cylinder":
      return Math.PI * obj.dimensions.width * obj.dimensions.width * obj.dimensions.height;
    case "sphere":
      return (4 / 3) * Math.PI * Math.pow(obj.dimensions.width, 3);
    case "cone":
      return (1 / 3) * Math.PI * obj.dimensions.width * obj.dimensions.width * obj.dimensions.height;
    default:
      return 0;
  }
}

function computeSurfaceArea(obj: { type: string; dimensions: { width: number; height: number; depth: number } }) {
  switch (obj.type) {
    case "box": {
      const { width: w, height: h, depth: d } = obj.dimensions;
      return 2 * (w * h + h * d + w * d);
    }
    case "cylinder": {
      const r = obj.dimensions.width;
      const h = obj.dimensions.height;
      return 2 * Math.PI * r * (r + h);
    }
    case "sphere":
      return 4 * Math.PI * obj.dimensions.width * obj.dimensions.width;
    case "cone": {
      const r = obj.dimensions.width;
      const h = obj.dimensions.height;
      const slant = Math.sqrt(r * r + h * h);
      return Math.PI * r * (r + slant);
    }
    default:
      return 0;
  }
}

/* ── STL Export ── */
function exportSceneSTL() {
  const { objects } = useCadStore.getState();
  const meshObjects = objects.filter(
    (o) => !["line", "arc", "circle", "rectangle"].includes(o.type)
  );
  if (meshObjects.length === 0) {
    alert("No 3D objects to export");
    return;
  }

  const geometries: { geo: THREE.BufferGeometry; matrix: THREE.Matrix4 }[] = [];
  for (const obj of meshObjects) {
    let geo: THREE.BufferGeometry;
    switch (obj.type) {
      case "box":
        geo = new THREE.BoxGeometry(obj.dimensions.width, obj.dimensions.height, obj.dimensions.depth);
        break;
      case "cylinder":
        geo = new THREE.CylinderGeometry(obj.dimensions.width, obj.dimensions.width, obj.dimensions.height, 32);
        break;
      case "sphere":
        geo = new THREE.SphereGeometry(obj.dimensions.width, 32, 32);
        break;
      case "cone":
        geo = new THREE.ConeGeometry(obj.dimensions.width, obj.dimensions.height, 32);
        break;
      default:
        continue;
    }
    const mat = new THREE.Matrix4();
    mat.compose(
      new THREE.Vector3(...obj.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...obj.rotation)),
      new THREE.Vector3(...obj.scale)
    );
    geometries.push({ geo, matrix: mat });
  }

  let totalTriangles = 0;
  for (const { geo } of geometries) {
    const idx = geo.index;
    totalTriangles += idx ? idx.count / 3 : geo.attributes.position.count / 3;
  }

  const bufferLength = 80 + 4 + totalTriangles * 50;
  const buffer = new ArrayBuffer(bufferLength);
  const dv = new DataView(buffer);
  const header = "ShilpaSutra STL Export";
  for (let i = 0; i < 80; i++) {
    dv.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }
  dv.setUint32(80, totalTriangles, true);

  let offset = 84;
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3(), normal = new THREE.Vector3();

  for (const { geo, matrix } of geometries) {
    const pos = geo.attributes.position;
    const idx = geo.index;
    const triCount = idx ? idx.count / 3 : pos.count / 3;
    for (let i = 0; i < triCount; i++) {
      const i0 = idx ? idx.getX(i * 3) : i * 3;
      const i1 = idx ? idx.getX(i * 3 + 1) : i * 3 + 1;
      const i2 = idx ? idx.getX(i * 3 + 2) : i * 3 + 2;
      vA.fromBufferAttribute(pos, i0).applyMatrix4(matrix);
      vB.fromBufferAttribute(pos, i1).applyMatrix4(matrix);
      vC.fromBufferAttribute(pos, i2).applyMatrix4(matrix);
      normal.crossVectors(vB.clone().sub(vA), vC.clone().sub(vA)).normalize();
      dv.setFloat32(offset, normal.x, true); offset += 4;
      dv.setFloat32(offset, normal.y, true); offset += 4;
      dv.setFloat32(offset, normal.z, true); offset += 4;
      dv.setFloat32(offset, vA.x, true); offset += 4;
      dv.setFloat32(offset, vA.y, true); offset += 4;
      dv.setFloat32(offset, vA.z, true); offset += 4;
      dv.setFloat32(offset, vB.x, true); offset += 4;
      dv.setFloat32(offset, vB.y, true); offset += 4;
      dv.setFloat32(offset, vB.z, true); offset += 4;
      dv.setFloat32(offset, vC.x, true); offset += 4;
      dv.setFloat32(offset, vC.y, true); offset += 4;
      dv.setFloat32(offset, vC.z, true); offset += 4;
      dv.setUint16(offset, 0, true); offset += 2;
    }
    geo.dispose();
  }

  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "shilpasutra-export.stl";
  a.click();
  URL.revokeObjectURL(url);
}

export default function PropertyPanel() {
  const selectedId = useCadStore((s) => s.selectedId);
  const objects = useCadStore((s) => s.objects);
  const updateObject = useCadStore((s) => s.updateObject);
  const deleteObject = useCadStore((s) => s.deleteObject);
  const unit = useCadStore((s) => s.unit);
  const collapsed = useCadStore((s) => s.propertyPanelCollapsed);
  const setCollapsed = useCadStore((s) => s.setPropertyPanelCollapsed);

  const selected = objects.find((o) => o.id === selectedId);
  const sketchTypes = ["line", "arc", "circle", "rectangle"];

  return (
    <div className="w-full bg-[#1a1a2e] flex flex-col shrink-0 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#16213e]">
        <div className="flex items-center gap-1.5">
          <Settings2 size={14} className="text-[#00D4FF]" />
          <span className="text-xs font-semibold text-slate-300">Properties</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#0f3460] transition-colors"
        >
          <PanelRightClose size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {selected ? (
          <>
            {/* Object Name */}
            <div className="bg-[#0d1117] rounded-lg p-3 border border-[#16213e]">
              <div className="text-[10px] text-slate-500 mb-1">Name</div>
              <input
                type="text"
                value={selected.name}
                onChange={(e) => updateObject(selected.id, { name: e.target.value })}
                className="w-full bg-[#1a1a2e] text-sm font-semibold text-white rounded px-2 py-1 border border-[#16213e] focus:border-[#00D4FF]/50 outline-none"
              />
            </div>

            {!sketchTypes.includes(selected.type) && (
              <>
                {/* Transform */}
                <div className="bg-[#0d1117] rounded-lg p-3 border border-[#16213e]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Move size={12} className="text-[#00D4FF]" />
                    <span className="text-[10px] text-slate-400 font-medium">Position</span>
                  </div>
                  <div className="space-y-1.5">
                    {(["X", "Y", "Z"] as const).map((axis, i) => (
                      <NumericInput
                        key={axis}
                        label={axis}
                        value={selected.position[i]}
                        unit={unit}
                        onChange={(v) => {
                          const pos = [...selected.position] as [number, number, number];
                          pos[i] = v;
                          updateObject(selected.id, { position: pos });
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-[#0d1117] rounded-lg p-3 border border-[#16213e]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <RotateCw size={12} className="text-[#00D4FF]" />
                    <span className="text-[10px] text-slate-400 font-medium">Rotation</span>
                  </div>
                  <div className="space-y-1.5">
                    {(["X", "Y", "Z"] as const).map((axis, i) => (
                      <NumericInput
                        key={axis}
                        label={axis}
                        value={Number(((selected.rotation[i] * 180) / Math.PI).toFixed(1))}
                        unit="deg"
                        step={1}
                        onChange={(v) => {
                          const rot = [...selected.rotation] as [number, number, number];
                          rot[i] = (v * Math.PI) / 180;
                          updateObject(selected.id, { rotation: rot });
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Dimensions */}
                <div className="bg-[#0d1117] rounded-lg p-3 border border-[#16213e]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Ruler size={12} className="text-[#00D4FF]" />
                    <span className="text-[10px] text-slate-400 font-medium">Dimensions</span>
                  </div>
                  <div className="space-y-1.5">
                    {selected.type === "sphere" ? (
                      <NumericInput
                        label="R"
                        value={selected.dimensions.width}
                        unit={unit}
                        min={0.1}
                        onChange={(v) =>
                          updateObject(selected.id, {
                            dimensions: { width: v, height: v, depth: v },
                          })
                        }
                      />
                    ) : selected.type === "cylinder" || selected.type === "cone" ? (
                      <>
                        <NumericInput
                          label="R"
                          value={selected.dimensions.width}
                          unit={unit}
                          min={0.1}
                          onChange={(v) =>
                            updateObject(selected.id, {
                              dimensions: { ...selected.dimensions, width: v, depth: v },
                            })
                          }
                        />
                        <NumericInput
                          label="H"
                          value={selected.dimensions.height}
                          unit={unit}
                          min={0.1}
                          onChange={(v) =>
                            updateObject(selected.id, {
                              dimensions: { ...selected.dimensions, height: v },
                            })
                          }
                        />
                      </>
                    ) : (
                      <>
                        <NumericInput
                          label="W"
                          value={selected.dimensions.width}
                          unit={unit}
                          min={0.1}
                          onChange={(v) =>
                            updateObject(selected.id, {
                              dimensions: { ...selected.dimensions, width: v },
                            })
                          }
                        />
                        <NumericInput
                          label="H"
                          value={selected.dimensions.height}
                          unit={unit}
                          min={0.1}
                          onChange={(v) =>
                            updateObject(selected.id, {
                              dimensions: { ...selected.dimensions, height: v },
                            })
                          }
                        />
                        <NumericInput
                          label="D"
                          value={selected.dimensions.depth}
                          unit={unit}
                          min={0.1}
                          onChange={(v) =>
                            updateObject(selected.id, {
                              dimensions: { ...selected.dimensions, depth: v },
                            })
                          }
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Material */}
                <div className="bg-[#0d1117] rounded-lg p-3 border border-[#16213e]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Palette size={12} className="text-[#00D4FF]" />
                    <span className="text-[10px] text-slate-400 font-medium">Material</span>
                  </div>
                  <select
                    value={selected.material}
                    onChange={(e) =>
                      updateObject(selected.id, {
                        material: e.target.value,
                        color: getMaterialColor(e.target.value),
                      })
                    }
                    className="w-full bg-[#1a1a2e] text-[11px] text-white rounded px-2 py-1.5 border border-[#16213e] focus:border-[#00D4FF]/50 outline-none mb-2"
                  >
                    {materialList.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="color"
                      value={selected.color}
                      onChange={(e) => updateObject(selected.id, { color: e.target.value })}
                      className="w-6 h-6 rounded border border-[#16213e] cursor-pointer bg-transparent"
                    />
                    <span className="text-[10px] text-slate-500 font-mono">{selected.color}</span>
                  </div>

                  <div className="space-y-2">
                    <SliderInput
                      label="Opacity"
                      value={selected.opacity ?? 1}
                      onChange={(v) => updateObject(selected.id, { opacity: v })}
                    />
                    <SliderInput
                      label="Metalness"
                      value={selected.metalness ?? 0.4}
                      onChange={(v) => updateObject(selected.id, { metalness: v })}
                    />
                    <SliderInput
                      label="Roughness"
                      value={selected.roughness ?? 0.5}
                      onChange={(v) => updateObject(selected.id, { roughness: v })}
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="bg-[#0d1117] rounded-lg p-3 border border-[#16213e]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Info size={12} className="text-[#00D4FF]" />
                    <span className="text-[10px] text-slate-400 font-medium">Info</span>
                  </div>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Volume</span>
                      <span className="text-white font-mono">
                        {computeVolume(selected).toFixed(2)} {unit}^3
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Surface Area</span>
                      <span className="text-white font-mono">
                        {computeSurfaceArea(selected).toFixed(2)} {unit}^2
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bounding Box</span>
                      <span className="text-white font-mono text-[9px]">
                        {selected.dimensions.width.toFixed(1)}x{selected.dimensions.height.toFixed(1)}x{selected.dimensions.depth.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Sketch entity info - EDITABLE */}
            {sketchTypes.includes(selected.type) && (
              <div className="bg-[#0d1117] rounded-lg p-3 border border-[#16213e]">
                <div className="flex items-center gap-1.5 mb-2">
                  <Ruler size={12} className="text-[#00D4FF]" />
                  <span className="text-[10px] text-slate-400 font-medium">Sketch Entity</span>
                </div>
                <div className="text-[10px] text-slate-500 space-y-2">
                  <div>Type: <span className="text-white capitalize">{selected.type}</span></div>

                  {/* Editable circle radius */}
                  {selected.type === "circle" && selected.circleRadius != null && selected.circleCenter && (
                    <NumericInput
                      label="R"
                      value={selected.circleRadius}
                      unit={unit}
                      min={0.05}
                      onChange={(v) => {
                        updateObject(selected.id, {
                          circleRadius: v,
                          dimensions: { width: v * 2, height: 0, depth: v * 2 },
                        });
                      }}
                    />
                  )}

                  {/* Editable line length */}
                  {selected.type === "line" && selected.linePoints && selected.linePoints.length === 2 && (() => {
                    const [p1, p2] = selected.linePoints;
                    const dx = p2[0] - p1[0];
                    const dz = p2[2] - p1[2];
                    const currentLength = Math.sqrt(dx * dx + dz * dz);
                    const angle = Math.atan2(dz, dx);
                    return (
                      <>
                        <NumericInput
                          label="L"
                          value={currentLength}
                          unit={unit}
                          min={0.05}
                          onChange={(newLength) => {
                            const newP2: [number, number, number] = [
                              p1[0] + Math.cos(angle) * newLength,
                              p2[1],
                              p1[2] + Math.sin(angle) * newLength,
                            ];
                            updateObject(selected.id, {
                              linePoints: [p1, newP2],
                            });
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 w-6">A</span>
                          <span className="text-[10px] text-white font-mono">
                            {((angle * 180 / Math.PI + 360) % 360).toFixed(1)}°
                          </span>
                        </div>
                      </>
                    );
                  })()}

                  {/* Editable rectangle dimensions */}
                  {selected.type === "rectangle" && selected.rectCorners && (() => {
                    const [c1, c2] = selected.rectCorners;
                    const w = Math.abs(c2[0] - c1[0]);
                    const h = Math.abs(c2[2] - c1[2]);
                    return (
                      <>
                        <NumericInput
                          label="W"
                          value={w}
                          unit={unit}
                          min={0.05}
                          onChange={(newW) => {
                            const signX = c2[0] >= c1[0] ? 1 : -1;
                            const newC2: [number, number, number] = [
                              c1[0] + signX * newW, c2[1], c2[2],
                            ];
                            updateObject(selected.id, {
                              rectCorners: [c1, newC2],
                              dimensions: { width: newW, height: 0, depth: h },
                            });
                          }}
                        />
                        <NumericInput
                          label="H"
                          value={h}
                          unit={unit}
                          min={0.05}
                          onChange={(newH) => {
                            const signZ = c2[2] >= c1[2] ? 1 : -1;
                            const newC2: [number, number, number] = [
                              c2[0], c2[1], c1[2] + signZ * newH,
                            ];
                            updateObject(selected.id, {
                              rectCorners: [c1, newC2],
                              dimensions: { width: w, height: 0, depth: newH },
                            });
                          }}
                        />
                      </>
                    );
                  })()}

                  {/* Position (editable for all sketch types) */}
                  {selected.type === "line" && selected.linePoints && selected.linePoints.length >= 1 && (
                    <div className="mt-2 pt-2 border-t border-[#16213e]">
                      <div className="text-[9px] text-slate-500 mb-1">Start Point</div>
                      <div className="space-y-1">
                        <NumericInput
                          label="X"
                          value={selected.linePoints[0][0]}
                          unit={unit}
                          onChange={(v) => {
                            const pts = [...selected.linePoints!] as [number, number, number][];
                            pts[0] = [v, pts[0][1], pts[0][2]];
                            updateObject(selected.id, { linePoints: pts });
                          }}
                        />
                        <NumericInput
                          label="Z"
                          value={selected.linePoints[0][2]}
                          unit={unit}
                          onChange={(v) => {
                            const pts = [...selected.linePoints!] as [number, number, number][];
                            pts[0] = [pts[0][0], pts[0][1], v];
                            updateObject(selected.id, { linePoints: pts });
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {selected.type === "circle" && selected.circleCenter && (
                    <div className="mt-2 pt-2 border-t border-[#16213e]">
                      <div className="text-[9px] text-slate-500 mb-1">Center</div>
                      <div className="space-y-1">
                        <NumericInput
                          label="X"
                          value={selected.circleCenter[0]}
                          unit={unit}
                          onChange={(v) => {
                            updateObject(selected.id, {
                              circleCenter: [v, selected.circleCenter![1], selected.circleCenter![2]],
                            });
                          }}
                        />
                        <NumericInput
                          label="Z"
                          value={selected.circleCenter[2]}
                          unit={unit}
                          onChange={(v) => {
                            updateObject(selected.id, {
                              circleCenter: [selected.circleCenter![0], selected.circleCenter![1], v],
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Export & Delete */}
            <div className="space-y-2">
              <button
                onClick={exportSceneSTL}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] py-2 rounded bg-[#0f3460] text-slate-300 hover:bg-[#00D4FF]/20 hover:text-[#00D4FF] border border-[#16213e] transition-colors"
              >
                <Download size={12} /> Export STL
              </button>
              <button
                onClick={() => deleteObject(selected.id)}
                className="w-full text-[11px] py-2 rounded bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/30 transition-colors"
              >
                Delete Object
              </button>
            </div>
          </>
        ) : (
          <div className="bg-[#0d1117] rounded-lg p-4 border border-[#16213e] text-center">
            <Settings2 size={24} className="text-slate-600 mx-auto mb-2" />
            <div className="text-[11px] text-slate-500">No Selection</div>
            <div className="text-[10px] text-slate-600 mt-1">
              Click an object to see its properties
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
