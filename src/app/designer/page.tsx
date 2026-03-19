"use client";
import { useCallback } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import {
  useCadStore,
  type ToolId,
  type TransformMode,
  materialList,
  getMaterialColor,
} from "@/stores/cad-store";

// Dynamic import to avoid SSR issues with Three.js
const Viewport3D = dynamic(() => import("@/components/Viewport3D"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0a0e17] text-slate-500">
      Loading 3D viewport...
    </div>
  ),
});

/* ── Toolbar config ── */
const tools: { id: ToolId; icon: string; label: string; tip: string }[] = [
  { id: "select", icon: "🔲", label: "Select", tip: "Select & transform (W/R/S)" },
  { id: "box", icon: "📦", label: "Box", tip: "Place a box" },
  { id: "cylinder", icon: "⭕", label: "Cylinder", tip: "Place a cylinder" },
  { id: "sphere", icon: "🔵", label: "Sphere", tip: "Place a sphere" },
  { id: "cone", icon: "🔺", label: "Cone", tip: "Place a cone" },
  { id: "line", icon: "📏", label: "Line", tip: "Draw a line (click two points)" },
  { id: "delete", icon: "🗑️", label: "Delete", tip: "Delete selected object" },
];

const transformModes: { mode: TransformMode; label: string; key: string }[] = [
  { mode: "translate", label: "Move", key: "W" },
  { mode: "rotate", label: "Rotate", key: "R" },
  { mode: "scale", label: "Scale", key: "S" },
];

/* ── STL Export ── */
function exportSceneSTL() {
  const { objects } = useCadStore.getState();
  const meshObjects = objects.filter((o) => o.type !== "line");
  if (meshObjects.length === 0) {
    alert("No objects to export");
    return;
  }

  // Build binary STL
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

  // Count triangles
  let totalTriangles = 0;
  for (const { geo } of geometries) {
    const idx = geo.index;
    totalTriangles += idx ? idx.count / 3 : (geo.attributes.position.count / 3);
  }

  // Write binary STL
  const headerBytes = 80;
  const bufferLength = headerBytes + 4 + totalTriangles * 50;
  const buffer = new ArrayBuffer(bufferLength);
  const dv = new DataView(buffer);

  // Header (80 bytes)
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

      // Normal
      dv.setFloat32(offset, normal.x, true); offset += 4;
      dv.setFloat32(offset, normal.y, true); offset += 4;
      dv.setFloat32(offset, normal.z, true); offset += 4;
      // Vertices
      dv.setFloat32(offset, vA.x, true); offset += 4;
      dv.setFloat32(offset, vA.y, true); offset += 4;
      dv.setFloat32(offset, vA.z, true); offset += 4;
      dv.setFloat32(offset, vB.x, true); offset += 4;
      dv.setFloat32(offset, vB.y, true); offset += 4;
      dv.setFloat32(offset, vB.z, true); offset += 4;
      dv.setFloat32(offset, vC.x, true); offset += 4;
      dv.setFloat32(offset, vC.y, true); offset += 4;
      dv.setFloat32(offset, vC.z, true); offset += 4;
      // Attribute byte count
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

/* ── OBJ Export (as simplified STEP alternative) ── */
function exportSceneOBJ() {
  const { objects } = useCadStore.getState();
  const meshObjects = objects.filter((o) => o.type !== "line");
  if (meshObjects.length === 0) {
    alert("No objects to export");
    return;
  }

  let objStr = "# ShilpaSutra OBJ Export\n# Generated by ShilpaSutra CAD Designer\n\n";
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
  const activeTool = useCadStore((s) => s.activeTool);

  const selected = objects.find((o) => o.id === selectedId);

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
              Use toolbar to add objects
            </div>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
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
                  <span>{obj.name}</span>
                  <span className="text-[9px] text-slate-600">{obj.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected ? (
          <>
            {/* Name */}
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

            {/* Position */}
            {selected.type !== "line" && (
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
            )}

            {/* Dimensions */}
            {selected.type !== "line" && (
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
            )}

            {/* Material */}
            {selected.type !== "line" && (
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
            )}

            {/* Delete */}
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

        {/* Quick Actions */}
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

        {/* Keyboard shortcuts */}
        <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
          <div className="text-xs text-slate-400 mb-2">Shortcuts</div>
          <div className="space-y-1 text-[10px] text-slate-500">
            <div>W - Move | R - Rotate | S - Scale</div>
            <div>Delete - Remove object</div>
            <div>Esc - Select tool</div>
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

        {/* Shape tools */}
        {tools.map((tool) => (
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

        <div className="flex-1" />

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
          {snapGrid ? "Grid: ON" : "Grid: OFF"}
        </button>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Viewport */}
        <div className="flex-1 relative">
          <Viewport3D showGrid={snapGrid} />
          {/* Status bar overlay */}
          <div className="absolute top-2 left-2 flex items-center gap-2 pointer-events-none">
            <span className="text-[10px] bg-[#161b22]/80 border border-[#21262d] rounded px-2 py-0.5 text-slate-400">
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
          </div>
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
      </div>
    </div>
  );
}
