"use client";
import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import {
  useCadStore,
  type ToolId,
  type TransformMode,
  materialList,
  getMaterialColor,
} from "@/stores/cad-store";

const Viewport3D = dynamic(() => import("@/components/Viewport3D"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0a0e17] text-slate-500">
      Loading 3D viewport...
    </div>
  ),
});

const AIChatSidebar = dynamic(() => import("@/components/AIChatSidebar"), {
  ssr: false,
});

const AIChatAssistantEnhanced = dynamic(
  () => import("@/components/AIChatAssistantEnhanced"),
  { ssr: false }
);

/* ── Toolbar config ── */
const tools: { id: ToolId; icon: string; label: string; tip: string; group: string }[] = [
  { id: "select", icon: "🔲", label: "Select", tip: "Select & transform (W/R/S)", group: "general" },
  { id: "box", icon: "📦", label: "Box", tip: "Place a box", group: "3d" },
  { id: "cylinder", icon: "⭕", label: "Cylinder", tip: "Place a cylinder", group: "3d" },
  { id: "sphere", icon: "🔵", label: "Sphere", tip: "Place a sphere", group: "3d" },
  { id: "cone", icon: "🔺", label: "Cone", tip: "Place a cone", group: "3d" },
  { id: "line", icon: "📏", label: "Line", tip: "Draw a line - click start, click end (L)", group: "sketch" },
  { id: "arc", icon: "⌒", label: "Arc", tip: "Draw arc - click 3 points (A)", group: "sketch" },
  { id: "circle", icon: "◯", label: "Circle", tip: "Draw circle - click center, drag radius (C)", group: "sketch" },
  { id: "rectangle", icon: "▭", label: "Rect", tip: "Draw rectangle - click corner, drag to opposite", group: "sketch" },
  { id: "measure", icon: "📐", label: "Measure", tip: "Measure distance between two points (M)", group: "general" },
  { id: "delete", icon: "🗑️", label: "Delete", tip: "Delete selected object", group: "general" },
];

const transformModes: { mode: TransformMode; label: string; key: string }[] = [
  { mode: "translate", label: "Move", key: "W" },
  { mode: "rotate", label: "Rotate", key: "R" },
  { mode: "scale", label: "Scale", key: "S" },
];

/* ── STL Export ── */
function exportSceneSTL() {
  const { objects } = useCadStore.getState();
  const meshObjects = objects.filter((o) => !["line", "arc", "circle", "rectangle"].includes(o.type));
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
    totalTriangles += idx ? idx.count / 3 : (geo.attributes.position.count / 3);
  }

  const headerBytes = 80;
  const bufferLength = headerBytes + 4 + totalTriangles * 50;
  const buffer = new ArrayBuffer(bufferLength);
  const dv = new DataView(buffer);

  const header = "ShilpaSutra STL Export";
  for (let i = 0; i < 80; i++) {
    dv.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }
  dv.setUint32(80, totalTriangles, true);

  let offset = 84;
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const normal = new THREE.Vector3();

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

      normal.crossVectors(
        vB.clone().sub(vA),
        vC.clone().sub(vA)
      ).normalize();

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

function exportSceneOBJ() {
  const { objects } = useCadStore.getState();
  const meshObjects = objects.filter((o) => !["line", "arc", "circle", "rectangle"].includes(o.type));
  if (meshObjects.length === 0) {
    alert("No 3D objects to export");
    return;
  }

  let objStr = "# ShilpaSutra OBJ Export\n\n";
  let vertexOffset = 0;

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
        geo = new THREE.SphereGeometry(obj.dimensions.width, 16, 16);
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

    objStr += `o ${obj.name}\n`;
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mat);
      objStr += `v ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}\n`;
    }

    const idx = geo.index;
    if (idx) {
      for (let i = 0; i < idx.count; i += 3) {
        objStr += `f ${idx.getX(i) + 1 + vertexOffset} ${idx.getX(i + 1) + 1 + vertexOffset} ${idx.getX(i + 2) + 1 + vertexOffset}\n`;
      }
    }
    vertexOffset += pos.count;
    geo.dispose();
  }

  const blob = new Blob([objStr], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "shilpasutra-export.obj";
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Properties Panel ── */
function PropertiesPanel() {
  const selectedId = useCadStore((s) => s.selectedId);
  const objects = useCadStore((s) => s.objects);
  const updateObject = useCadStore((s) => s.updateObject);
  const deleteObject = useCadStore((s) => s.deleteObject);

  const selected = objects.find((o) => o.id === selectedId);
  const sketchTypes = ["line", "arc", "circle", "rectangle"];

  return (
    <div className="w-64 bg-[#161b22] border-l border-[#21262d] p-3 overflow-y-auto shrink-0">
      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
        Properties
      </h3>
      <div className="space-y-3">
        {/* Scene tree */}
        <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
          <div className="text-xs text-slate-400 mb-2">Scene Objects ({objects.length})</div>
          {objects.length === 0 ? (
            <div className="text-[10px] text-slate-600">
              Use toolbar to add objects or sketch entities
            </div>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {objects.map((obj) => (
                <button
                  key={obj.id}
                  onClick={() => useCadStore.getState().selectObject(obj.id)}
                  className={`w-full text-left text-[11px] px-2 py-1 rounded flex items-center justify-between ${
                    selectedId === obj.id
                      ? "bg-[#e94560]/20 text-[#e94560]"
                      : "text-slate-400 hover:bg-[#21262d]"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-[9px]">
                      {sketchTypes.includes(obj.type) ? "✏️" : "🧊"}
                    </span>
                    {obj.name}
                  </span>
                  <span className="text-[9px] text-slate-600">{obj.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected ? (
          <>
            <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
              <div className="text-xs text-slate-400 mb-1">Selected</div>
              <input
                type="text"
                value={selected.name}
                onChange={(e) =>
                  updateObject(selected.id, { name: e.target.value })
                }
                className="w-full bg-[#161b22] text-sm font-semibold text-white rounded px-2 py-1 border border-[#21262d]"
              />
            </div>

            {!sketchTypes.includes(selected.type) && (
              <>
                <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
                  <div className="text-xs text-slate-400 mb-2">Position</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["X", "Y", "Z"] as const).map((axis, i) => (
                      <div key={axis}>
                        <label className="text-[10px] text-slate-500">{axis}</label>
                        <input
                          type="number"
                          step="0.1"
                          value={Number(selected.position[i].toFixed(2))}
                          onChange={(e) => {
                            const pos = [...selected.position] as [number, number, number];
                            pos[i] = parseFloat(e.target.value) || 0;
                            updateObject(selected.id, { position: pos });
                          }}
                          className="w-full bg-[#161b22] text-xs text-white rounded px-2 py-1 border border-[#21262d]"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
                  <div className="text-xs text-slate-400 mb-2">Dimensions</div>
                  <div className="space-y-2">
                    {selected.type === "sphere" ? (
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-slate-500">Radius</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={selected.dimensions.width}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0.1;
                            updateObject(selected.id, {
                              dimensions: { width: v, height: v, depth: v },
                            });
                          }}
                          className="w-20 bg-[#161b22] text-xs text-white rounded px-2 py-1 border border-[#21262d] text-right"
                        />
                      </div>
                    ) : selected.type === "cylinder" || selected.type === "cone" ? (
                      <>
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-slate-500">Radius</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={selected.dimensions.width}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0.1;
                              updateObject(selected.id, {
                                dimensions: { ...selected.dimensions, width: v, depth: v },
                              });
                            }}
                            className="w-20 bg-[#161b22] text-xs text-white rounded px-2 py-1 border border-[#21262d] text-right"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-slate-500">Height</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={selected.dimensions.height}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0.1;
                              updateObject(selected.id, {
                                dimensions: { ...selected.dimensions, height: v },
                              });
                            }}
                            className="w-20 bg-[#161b22] text-xs text-white rounded px-2 py-1 border border-[#21262d] text-right"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {(
                          [
                            ["Width", "width"],
                            ["Height", "height"],
                            ["Depth", "depth"],
                          ] as const
                        ).map(([label, key]) => (
                          <div key={key} className="flex items-center justify-between">
                            <label className="text-[10px] text-slate-500">{label}</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0.1"
                              value={selected.dimensions[key]}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value) || 0.1;
                                updateObject(selected.id, {
                                  dimensions: { ...selected.dimensions, [key]: v },
                                });
                              }}
                              className="w-20 bg-[#161b22] text-xs text-white rounded px-2 py-1 border border-[#21262d] text-right"
                            />
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
                  <div className="text-xs text-slate-400 mb-2">Material</div>
                  <select
                    value={selected.material}
                    onChange={(e) => {
                      updateObject(selected.id, {
                        material: e.target.value,
                        color: getMaterialColor(e.target.value),
                      });
                    }}
                    className="w-full bg-[#161b22] text-xs text-white rounded px-2 py-1 border border-[#21262d]"
                  >
                    {materialList.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2 mt-2">
                    <div
                      className="w-4 h-4 rounded border border-[#21262d]"
                      style={{ backgroundColor: selected.color }}
                    />
                    <span className="text-[10px] text-slate-500">{selected.color}</span>
                  </div>
                </div>
              </>
            )}

            {/* Sketch entity info */}
            {sketchTypes.includes(selected.type) && (
              <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
                <div className="text-xs text-slate-400 mb-2">Sketch Entity</div>
                <div className="text-[10px] text-slate-500 space-y-1">
                  <div>Type: <span className="text-white">{selected.type}</span></div>
                  {selected.type === "circle" && selected.circleRadius && (
                    <div>Radius: <span className="text-white">{selected.circleRadius.toFixed(2)}</span></div>
                  )}
                  {selected.type === "line" && selected.linePoints && selected.linePoints.length === 2 && (
                    <div>Length: <span className="text-white">
                      {Math.sqrt(
                        Math.pow(selected.linePoints[1][0] - selected.linePoints[0][0], 2) +
                        Math.pow(selected.linePoints[1][2] - selected.linePoints[0][2], 2)
                      ).toFixed(2)}
                    </span></div>
                  )}
                  {selected.type === "rectangle" && selected.rectCorners && (
                    <>
                      <div>Width: <span className="text-white">{Math.abs(selected.rectCorners[1][0] - selected.rectCorners[0][0]).toFixed(2)}</span></div>
                      <div>Height: <span className="text-white">{Math.abs(selected.rectCorners[1][2] - selected.rectCorners[0][2]).toFixed(2)}</span></div>
                    </>
                  )}
                  <div className="text-slate-600 mt-1">Plane: XZ (Y=0)</div>
                </div>
              </div>
            )}

            <button
              onClick={() => deleteObject(selected.id)}
              className="w-full text-xs py-2 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-900/40 transition-colors"
            >
              Delete Object
            </button>
          </>
        ) : (
          <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
            <div className="text-xs text-slate-400 mb-1">No Selection</div>
            <div className="text-[10px] text-slate-600">
              Click an object to see its properties, or use a tool to create geometry.
            </div>
          </div>
        )}

        <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
          <div className="text-xs text-slate-400 mb-2">Export</div>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={exportSceneSTL}
              className="text-[10px] py-1.5 rounded bg-[#21262d] text-slate-300 hover:bg-[#e94560] hover:text-white transition-colors"
            >
              Export STL
            </button>
            <button
              onClick={exportSceneOBJ}
              className="text-[10px] py-1.5 rounded bg-[#21262d] text-slate-300 hover:bg-[#e94560] hover:text-white transition-colors"
            >
              Export OBJ
            </button>
          </div>
        </div>

        <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
          <div className="text-xs text-slate-400 mb-2">Shortcuts</div>
          <div className="space-y-1 text-[10px] text-slate-500">
            <div>W - Move | R - Rotate | S - Scale</div>
            <div>L - Line | A - Arc | C - Circle</div>
            <div>Delete - Remove | Esc - Select tool</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Designer Page ── */
export default function DesignerPage() {
  const activeTool = useCadStore((s) => s.activeTool);
  const setActiveTool = useCadStore((s) => s.setActiveTool);
  const transformMode = useCadStore((s) => s.transformMode);
  const setTransformMode = useCadStore((s) => s.setTransformMode);
  const snapGrid = useCadStore((s) => s.snapGrid);
  const setSnapGrid = useCadStore((s) => s.setSnapGrid);
  const unit = useCadStore((s) => s.unit);
  const setUnit = useCadStore((s) => s.setUnit);
  const deleteSelected = useCadStore((s) => s.deleteSelected);
  const selectedId = useCadStore((s) => s.selectedId);

  const undo = useCadStore((s) => s.undo);
  const redo = useCadStore((s) => s.redo);
  const undoStack = useCadStore((s) => s.undoStack);
  const redoStack = useCadStore((s) => s.redoStack);
  const measureResult = useCadStore((s) => s.measureResult);
  const measurePoints = useCadStore((s) => s.measurePoints);
  const clearMeasure = useCadStore((s) => s.clearMeasure);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"basic" | "zookeeper">("zookeeper");

  const sketchTools = ["line", "arc", "circle", "rectangle"];
  const isSketchMode = sketchTools.includes(activeTool);

  const handleToolClick = useCallback(
    (id: ToolId) => {
      if (id === "delete") {
        deleteSelected();
        return;
      }
      setActiveTool(id);
    },
    [setActiveTool, deleteSelected]
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Top Ribbon Toolbar */}
      <div className="bg-[#161b22] border-b border-[#21262d] px-3 py-1.5 flex items-center gap-1 shrink-0">
        <span className="text-xs font-bold text-[#e94560] mr-2">
          CAD Designer
        </span>
        <div className="h-5 w-px bg-[#21262d] mx-1" />

        {/* 3D Shape tools */}
        {tools.filter(t => t.group !== "sketch").map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            title={tool.tip}
            className={`w-8 h-8 rounded flex items-center justify-center text-base transition-all ${
              activeTool === tool.id
                ? "bg-[#e94560] text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-[#21262d]"
            }`}
          >
            {tool.icon}
          </button>
        ))}

        <div className="h-5 w-px bg-[#21262d] mx-1" />

        {/* Sketch tools with label */}
        <span className="text-[9px] text-slate-500 uppercase tracking-wider mr-1">Sketch</span>
        {tools.filter(t => t.group === "sketch").map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            title={tool.tip}
            className={`px-2 h-8 rounded flex items-center justify-center gap-1 text-xs transition-all ${
              activeTool === tool.id
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-[#21262d]"
            }`}
          >
            <span className="text-sm">{tool.icon}</span>
            <span className="text-[10px]">{tool.label}</span>
          </button>
        ))}

        <div className="h-5 w-px bg-[#21262d] mx-2" />

        {/* Transform modes (only show when select is active) */}
        {activeTool === "select" && (
          <>
            {transformModes.map((tm) => (
              <button
                key={tm.mode}
                onClick={() => setTransformMode(tm.mode)}
                title={`${tm.label} (${tm.key})`}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                  transformMode === tm.mode
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-[#21262d]"
                }`}
              >
                {tm.label}
              </button>
            ))}
            <div className="h-5 w-px bg-[#21262d] mx-2" />
          </>
        )}

        {/* Undo/Redo */}
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          title="Undo (Ctrl+Z)"
          className="w-8 h-8 rounded flex items-center justify-center text-sm transition-all disabled:opacity-30 text-slate-400 hover:text-white hover:bg-[#21262d]"
        >
          ↩
        </button>
        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          title="Redo (Ctrl+Y)"
          className="w-8 h-8 rounded flex items-center justify-center text-sm transition-all disabled:opacity-30 text-slate-400 hover:text-white hover:bg-[#21262d]"
        >
          ↪
        </button>

        <div className="h-5 w-px bg-[#21262d] mx-1" />

        <div className="flex-1" />

        {/* Sketch mode indicator */}
        {isSketchMode && (
          <span className="text-[10px] bg-blue-600/20 border border-blue-500/40 text-blue-400 rounded px-2 py-0.5 mr-2">
            Sketch Mode - Drawing on XZ plane
          </span>
        )}

        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="bg-[#0d1117] text-xs text-slate-300 rounded px-2 py-1 border border-[#21262d]"
        >
          <option value="mm">mm</option>
          <option value="cm">cm</option>
          <option value="in">inch</option>
          <option value="m">m</option>
        </select>
        <button
          onClick={() => setSnapGrid(!snapGrid)}
          className={`text-xs px-2 py-1 rounded border ${
            snapGrid
              ? "border-green-500 text-green-400"
              : "border-[#21262d] text-slate-500"
          }`}
        >
          {snapGrid ? "Snap: ON" : "Snap: OFF"}
        </button>

        <div className="h-5 w-px bg-[#21262d] mx-1" />

        {/* AI Mode toggle */}
        {aiOpen && (
          <button
            onClick={() => setAiMode(aiMode === "basic" ? "zookeeper" : "basic")}
            className={`text-[10px] px-2 py-1 rounded border transition-colors ${
              aiMode === "zookeeper"
                ? "border-purple-500/40 text-purple-400 bg-purple-500/10"
                : "border-[#21262d] text-slate-500"
            }`}
            title="Toggle AI mode"
          >
            {aiMode === "zookeeper" ? "Zookeeper" : "Basic"}
          </button>
        )}
        {/* AI Chat toggle */}
        <button
          onClick={() => setAiOpen(!aiOpen)}
          className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
            aiOpen
              ? "bg-purple-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-[#21262d] border border-[#21262d]"
          }`}
        >
          <span>AI</span>
        </button>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Viewport */}
        <div className="flex-1 relative">
          <Viewport3D showGrid={snapGrid} />
          {/* Status bar overlay */}
          <div className="absolute top-2 left-2 flex items-center gap-2 pointer-events-none">
            <span className={`text-[10px] bg-[#161b22]/80 border rounded px-2 py-0.5 ${
              isSketchMode
                ? "border-blue-500/40 text-blue-400"
                : "border-[#21262d] text-slate-400"
            }`}>
              Tool: {tools.find((t) => t.id === activeTool)?.label}
            </span>
            {activeTool === "select" && (
              <span className="text-[10px] bg-[#161b22]/80 border border-[#21262d] rounded px-2 py-0.5 text-blue-400">
                {transformMode}
              </span>
            )}
            {selectedId && (
              <span className="text-[10px] bg-[#161b22]/80 border border-[#21262d] rounded px-2 py-0.5 text-[#e94560]">
                Selected
              </span>
            )}
            {isSketchMode && (
              <span className="text-[10px] bg-[#161b22]/80 border border-blue-500/40 rounded px-2 py-0.5 text-blue-300">
                Click in viewport to draw
              </span>
            )}
            {activeTool === "measure" && (
              <span className="text-[10px] bg-[#161b22]/80 border border-yellow-500/40 rounded px-2 py-0.5 text-yellow-300">
                {measurePoints.length === 0 ? "Click first point" : measurePoints.length === 1 ? "Click second point" : "Measurement complete"}
              </span>
            )}
          </div>

          {/* Measurement result overlay */}
          {measureResult && (
            <div className="absolute top-2 right-2 bg-[#161b22]/95 border border-yellow-500/40 rounded-lg p-3 pointer-events-auto">
              <div className="text-[10px] text-yellow-400 font-bold mb-1">Measurement</div>
              <div className="text-xs text-white font-mono">
                Distance: <span className="text-yellow-300">{measureResult.distance} {unit}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">
                dX: {measureResult.dx} | dY: {measureResult.dy} | dZ: {measureResult.dz}
              </div>
              <button
                onClick={clearMeasure}
                className="mt-2 text-[10px] text-slate-500 hover:text-white"
              >
                Clear
              </button>
            </div>
          )}

          {/* Axes label */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[10px] pointer-events-none">
            <span className="text-red-400">X</span>
            <span className="text-green-400">Y</span>
            <span className="text-blue-400">Z</span>
            <span className="text-slate-600 ml-2">Unit: {unit}</span>
          </div>
        </div>

        {/* Properties Panel */}
        <PropertiesPanel />

        {/* AI Chat Sidebar */}
        {aiOpen && aiMode === "basic" && <AIChatSidebar onClose={() => setAiOpen(false)} />}
        {aiOpen && aiMode === "zookeeper" && <AIChatAssistantEnhanced onClose={() => setAiOpen(false)} />}
      </div>
    </div>
  );
}
