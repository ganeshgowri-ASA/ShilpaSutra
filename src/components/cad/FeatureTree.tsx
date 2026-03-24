"use client";
import { useState, useCallback, useRef } from "react";
import {
  useCadStore,
  type CadObject,
} from "@/stores/cad-store";
import {
  Eye, EyeOff, Lock, Unlock, ChevronRight, ChevronDown,
  Box, Cylinder, Circle, Minus, Triangle, Spline, Square,
  Search, Layers, MoreVertical, Trash2, Copy,
  Edit3, PanelLeftClose, PanelLeft, GitBranch, Wrench, Shapes,
  RotateCw, Grid3X3, Combine, ArrowUp,
  Scissors, Target, Hash, Grip,
} from "lucide-react";
import ConstraintManager from "@/components/cad/ConstraintManager";

const SKETCH_TYPES = new Set(["line", "arc", "circle", "rectangle", "polygon", "spline", "ellipse", "construction_line"]);
const SOLID_TYPES = new Set(["box", "cylinder", "sphere", "cone"]);

function getTypeIcon(type: string, featureType?: string, size = 14) {
  // Feature icons
  if (featureType === "extrude") return <ArrowUp size={size} className="text-emerald-400" />;
  if (featureType === "revolve") return <RotateCw size={size} className="text-blue-400" />;
  if (featureType === "boolean_union") return <Combine size={size} className="text-orange-400" />;
  if (featureType === "boolean_subtract") return <Minus size={size} className="text-red-400" />;
  if (featureType === "boolean_intersect") return <Shapes size={size} className="text-purple-400" />;
  if (featureType === "linear_pattern") return <Grid3X3 size={size} className="text-cyan-400" />;
  if (featureType === "circular_pattern") return <RotateCw size={size} className="text-cyan-400" />;

  switch (type) {
    case "box": return <Box size={size} />;
    case "cylinder": return <Cylinder size={size} />;
    case "sphere": return <Circle size={size} />;
    case "cone": return <Triangle size={size} />;
    case "line": return <Minus size={size} className="text-cyan-400" />;
    case "arc": return <Spline size={size} className="text-purple-400" />;
    case "circle": return <Circle size={size} className="text-green-400" />;
    case "rectangle": return <Square size={size} className="text-orange-400" />;
    case "mesh": return <Wrench size={size} className="text-slate-400" />;
    default: return <Box size={size} />;
  }
}

function getFeatureParamsSummary(obj: CadObject): string {
  if (!obj.featureParams) return "";
  const p = obj.featureParams;
  if (obj.featureType === "extrude") return `d=${p.distance}mm`;
  if (obj.featureType === "revolve") return `${p.angle}°`;
  if (obj.featureType === "boolean_union") return `union`;
  if (obj.featureType === "boolean_subtract") return `subtract`;
  if (obj.featureType === "boolean_intersect") return `intersect`;
  return "";
}

interface ContextMenuState {
  x: number;
  y: number;
  objectId: string;
}

function ObjectRow({
  obj,
  isSelected,
  onSelect,
  onContextMenu,
  editingId,
  editName,
  editInputRef,
  onDoubleClick,
  setEditName,
  onRename,
  setEditingId,
  updateObject,
}: {
  obj: CadObject;
  isSelected: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  editingId: string | null;
  editName: string;
  editInputRef: React.RefObject<HTMLInputElement>;
  onDoubleClick: (obj: CadObject) => void;
  setEditName: (v: string) => void;
  onRename: (id: string) => void;
  setEditingId: (id: string | null) => void;
  updateObject: (id: string, updates: Partial<CadObject>) => void;
}) {
  const paramSummary = getFeatureParamsSummary(obj);
  return (
    <div
      onClick={(e) => onSelect(obj.id, e)}
      onDoubleClick={() => onDoubleClick(obj)}
      onContextMenu={(e) => onContextMenu(e, obj.id)}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer group transition-all duration-150 ${
        isSelected
          ? "bg-[#00D4FF]/10 text-[#00D4FF] shadow-[inset_0_0_0_1px_rgba(0,212,255,0.15)]"
          : "text-slate-400 hover:bg-[#21262d]/50 hover:text-slate-300"
      }`}
    >
      <span className={`shrink-0 ${isSelected ? "text-[#00D4FF]" : "text-slate-500"}`}>
        {getTypeIcon(obj.type, obj.featureType)}
      </span>

      {editingId === obj.id ? (
        <input
          ref={editInputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={() => onRename(obj.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onRename(obj.id);
            if (e.key === "Escape") setEditingId(null);
          }}
          className="flex-1 bg-[#0d1117] text-[11px] px-1.5 py-0.5 rounded-md border border-[#00D4FF]/40 outline-none text-white min-w-0"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 text-[11px] truncate font-medium">{obj.name}</span>
      )}

      {paramSummary && (
        <span className="text-[8px] text-slate-600 shrink-0 font-mono bg-[#0d1117] px-1 rounded">{paramSummary}</span>
      )}
      {obj.sketchId && (
        <span className="text-[7px] text-cyan-500/50 shrink-0 font-mono">S</span>
      )}
      {obj.isProfile && (
        <span className="text-[7px] text-emerald-500/50 shrink-0 font-mono bg-emerald-500/5 px-0.5 rounded">P</span>
      )}

      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-150">
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateObject(obj.id, { visible: !obj.visible });
          }}
          className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-[#21262d]"
        >
          {obj.visible !== false ? (
            <Eye size={10} className="text-slate-500" />
          ) : (
            <EyeOff size={10} className="text-slate-600" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateObject(obj.id, { locked: !obj.locked });
          }}
          className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-[#21262d]"
        >
          {obj.locked ? (
            <Lock size={10} className="text-red-400" />
          ) : (
            <Unlock size={10} className="text-slate-600" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function FeatureTree() {
  const objects = useCadStore((s) => s.objects);
  const selectedId = useCadStore((s) => s.selectedId);
  const selectedIds = useCadStore((s) => s.selectedIds);
  const selectObject = useCadStore((s) => s.selectObject);
  const toggleSelectObject = useCadStore((s) => s.toggleSelectObject);
  const updateObject = useCadStore((s) => s.updateObject);
  const deleteObject = useCadStore((s) => s.deleteObject);
  const featureTreeCollapsed = useCadStore((s) => s.featureTreeCollapsed);
  const setFeatureTreeCollapsed = useCadStore((s) => s.setFeatureTreeCollapsed);
  const featureHistory = useCadStore((s) => s.featureHistory);
  const enterSketchMode = useCadStore((s) => s.enterSketchMode);
  const sketchPlane = useCadStore((s) => s.sketchPlane);
  const setActiveTool = useCadStore((s) => s.setActiveTool);
  const exitSketchMode = useCadStore((s) => s.exitSketchMode);

  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [originExpanded, setOriginExpanded] = useState(true);
  const [sketchesExpanded, setSketchesExpanded] = useState(true);
  const [featuresExpanded, setFeaturesExpanded] = useState(true);
  const [bodiesExpanded, setBodiesExpanded] = useState(true);
  const [componentsExpanded, setComponentsExpanded] = useState(true);
  const [rollbackIdx, setRollbackIdx] = useState<number | null>(null);
  const [planeVisibility, setPlaneVisibility] = useState({ xy: true, xz: true, yz: true });

  const editInputRef = useRef<HTMLInputElement>(null);

  // Categorize objects
  const filteredObjects = searchQuery
    ? objects.filter((o) => o.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : objects;

  const sketches = filteredObjects.filter((o) => SKETCH_TYPES.has(o.type));
  const features = filteredObjects.filter((o) => o.type === "mesh" && o.featureType);
  const bodies = filteredObjects.filter((o) => SOLID_TYPES.has(o.type) || (o.type === "mesh" && !o.featureType));
  const components = filteredObjects.filter((o) => o.componentType);

  const handleClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        toggleSelectObject(id);
      } else {
        selectObject(id);
      }
    },
    [selectObject, toggleSelectObject]
  );

  const handleDoubleClick = useCallback((obj: CadObject) => {
    setEditingId(obj.id);
    setEditName(obj.name);
    setTimeout(() => editInputRef.current?.select(), 10);
  }, []);

  const handleRename = useCallback(
    (id: string) => {
      if (editName.trim()) {
        updateObject(id, { name: editName.trim() });
      }
      setEditingId(null);
    },
    [editName, updateObject]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, objectId: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, objectId });
    },
    []
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      const obj = objects.find((o) => o.id === id);
      if (obj) {
        const store = useCadStore.getState();
        store.addGeneratedObject({
          ...obj,
          name: `${obj.name} (Copy)`,
          position: [obj.position[0] + 1, obj.position[1], obj.position[2] + 1],
        });
      }
      setContextMenu(null);
    },
    [objects]
  );

  const commonRowProps = {
    editingId,
    editName,
    editInputRef,
    onDoubleClick: handleDoubleClick,
    setEditName,
    onRename: handleRename,
    setEditingId,
    updateObject,
  };

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    items: CadObject[],
    expanded: boolean,
    setExpanded: (v: boolean) => void,
    count: number
  ) => (
    <div className="mb-0.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-slate-400 hover:bg-[#21262d]/60 transition-all duration-150 group"
      >
        <span className="transition-transform duration-150" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
          <ChevronRight size={11} className="text-slate-600 group-hover:text-slate-400" />
        </span>
        {icon}
        <span className="text-[11px] font-semibold tracking-wide">{title}</span>
        <span className="ml-auto text-[8px] text-slate-600 bg-[#0d1117] rounded-full px-1.5 py-0.5 font-mono min-w-[18px] text-center">{count}</span>
      </button>
      {expanded && items.length > 0 && (
        <div className="ml-3 pl-2 border-l border-[#21262d]/60 space-y-px mt-0.5 animate-fade-in">
          {items.map((obj) => {
            const isSelected = selectedId === obj.id || selectedIds.includes(obj.id);
            return (
              <ObjectRow
                key={obj.id}
                obj={obj}
                isSelected={isSelected}
                onSelect={handleClick}
                onContextMenu={handleContextMenu}
                {...commonRowProps}
              />
            );
          })}
        </div>
      )}
      {expanded && items.length === 0 && (
        <div className="ml-3 pl-2 border-l border-[#21262d]/60 py-2 text-[10px] text-slate-600 italic px-2">
          {searchQuery ? "No matching items" : "No items yet"}
        </div>
      )}
    </div>
  );

  if (featureTreeCollapsed) {
    return (
      <div className="w-10 bg-[#161b22] border-r border-[#21262d] flex flex-col items-center pt-2 shrink-0">
        <button
          onClick={() => setFeatureTreeCollapsed(false)}
          className="w-8 h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#21262d] transition-all duration-150"
          title="Expand Feature Tree"
        >
          <PanelLeft size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[240px] bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#21262d]">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-[#00D4FF]" />
          <span className="text-[11px] font-bold text-slate-200 tracking-wide">Feature Tree</span>
        </div>
        <button
          onClick={() => setFeatureTreeCollapsed(true)}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#21262d] transition-all duration-150"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="px-2.5 py-2 border-b border-[#21262d]">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter objects..."
            className="w-full bg-[#0d1117] text-[11px] text-slate-300 rounded-md pl-7 pr-2 py-1.5 border border-[#21262d] focus:border-[#00D4FF]/40 outline-none placeholder-slate-600 transition-colors duration-150"
          />
        </div>
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-y-auto thin-scrollbar px-1.5 py-1.5">
        {/* Origin folder */}
        <div className="mb-0.5">
          <button
            onClick={() => setOriginExpanded(!originExpanded)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-slate-400 hover:bg-[#21262d]/60 transition-all duration-150 group"
          >
            <span className="transition-transform duration-150" style={{ transform: originExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
              <ChevronRight size={11} className="text-slate-600 group-hover:text-slate-400" />
            </span>
            <Layers size={12} className="text-yellow-500/80" />
            <span className="text-[11px] font-semibold tracking-wide">Origin</span>
          </button>
          {originExpanded && (
            <div className="ml-3 pl-2 border-l border-[#21262d]/60 space-y-px mt-0.5 animate-fade-in">
              {(["xy", "xz", "yz"] as const).map((plane) => {
                const planeColors: Record<string, string> = { xy: "text-blue-400/70", xz: "text-green-400/70", yz: "text-red-400/70" };
                const isActive = sketchPlane === plane;
                return (
                  <div
                    key={plane}
                    onClick={() => {
                      if (isActive) {
                        exitSketchMode();
                      } else {
                        enterSketchMode(plane);
                      }
                    }}
                    className={`flex items-center justify-between px-2 py-1 rounded-md cursor-pointer group transition-colors duration-150 ${
                      isActive
                        ? "bg-[#00D4FF]/10 text-[#00D4FF] shadow-[inset_0_0_0_1px_rgba(0,212,255,0.15)]"
                        : "hover:bg-[#21262d]/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-mono font-medium ${isActive ? "text-[#00D4FF]" : planeColors[plane] || "text-slate-500"}`}>{plane.toUpperCase()} Plane</span>
                      {isActive && <span className="text-[8px] text-emerald-400 font-medium animate-pulse">Sketching</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {!isActive && (
                        <span className="text-[8px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">Click to sketch</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaneVisibility((p) => ({ ...p, [plane]: !p[plane] }));
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-all duration-150"
                      >
                        {planeVisibility[plane] ? (
                          <Eye size={10} className="text-slate-500" />
                        ) : (
                          <EyeOff size={10} className="text-slate-600" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sketch Groups (from feature history) */}
        {featureHistory.filter(f => f.type === "sketch_group").map((sketchGroup) => {
          const sketchEntities = objects.filter(o => o.sketchId === sketchGroup.id);
          const isLocked = (sketchGroup as { sketchStatus?: string }).sketchStatus === "locked";
          // Find child features (extrude/revolve) that reference this sketch
          const childFeatures = featureHistory.filter(f =>
            f.parentId === sketchGroup.id && f.type !== "sketch_group"
          );
          return (
            <div key={sketchGroup.id} className="mb-0.5">
              <button
                onClick={() => setSketchesExpanded(!sketchesExpanded)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-slate-400 hover:bg-[#21262d]/60 transition-all duration-150 group"
              >
                <span className="transition-transform duration-150" style={{ transform: sketchesExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                  <ChevronRight size={11} className="text-slate-600 group-hover:text-slate-400" />
                </span>
                <GitBranch size={12} className={isLocked ? "text-emerald-400" : "text-cyan-400"} />
                <span className="text-[11px] font-semibold tracking-wide">{sketchGroup.name}</span>
                <span className="ml-auto flex items-center gap-1">
                  {isLocked && <Lock size={8} className="text-emerald-500/60" />}
                  <span className="text-[8px] text-slate-600 bg-[#0d1117] rounded-full px-1.5 py-0.5 font-mono">{sketchEntities.length}</span>
                </span>
              </button>
              {sketchesExpanded && (sketchEntities.length > 0 || childFeatures.length > 0) && (
                <div className="ml-3 pl-2 border-l border-[#21262d]/60 space-y-px mt-0.5">
                  {sketchEntities.map((obj) => {
                    const isSelected = selectedId === obj.id || selectedIds.includes(obj.id);
                    return (
                      <ObjectRow
                        key={obj.id}
                        obj={obj}
                        isSelected={isSelected}
                        onSelect={handleClick}
                        onContextMenu={handleContextMenu}
                        {...commonRowProps}
                      />
                    );
                  })}
                  {/* Child features (Extrude, Revolve) derived from this sketch */}
                  {childFeatures.map((feat) => {
                    const featObj = objects.find(o => o.id === feat.objectId);
                    if (!featObj) return null;
                    const isSelected = selectedId === featObj.id || selectedIds.includes(featObj.id);
                    return (
                      <ObjectRow
                        key={featObj.id}
                        obj={featObj}
                        isSelected={isSelected}
                        onSelect={handleClick}
                        onContextMenu={handleContextMenu}
                        {...commonRowProps}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Sketches section */}
        {renderSection(
          "Sketches",
          <GitBranch size={12} className="text-cyan-400" />,
          sketches,
          sketchesExpanded,
          setSketchesExpanded,
          sketches.length
        )}

        {/* Features section */}
        {renderSection(
          "Features",
          <Wrench size={12} className="text-emerald-400" />,
          features,
          featuresExpanded,
          setFeaturesExpanded,
          features.length
        )}

        {/* Bodies section */}
        {renderSection(
          "Bodies",
          <Box size={12} className="text-slate-400" />,
          bodies,
          bodiesExpanded,
          setBodiesExpanded,
          bodies.length
        )}

        {/* Components section */}
        {renderSection(
          "Components",
          <Shapes size={12} className="text-orange-400" />,
          components,
          componentsExpanded,
          setComponentsExpanded,
          components.length
        )}

        {/* Rollback Bar */}
        <div className="mt-2 mx-1.5">
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/5 border border-dashed border-blue-500/20 cursor-row-resize hover:border-blue-500/40 transition-colors group"
            title="Drag to roll back feature history (SolidWorks-style)"
          >
            <div className="w-full h-[2px] bg-blue-500/30 rounded-full group-hover:bg-blue-500/50 transition-colors" />
            <Grip size={10} className="text-blue-500/40 group-hover:text-blue-400 shrink-0" />
          </div>
          {rollbackIdx !== null && (
            <div className="text-[9px] text-blue-400 mt-0.5 px-2">
              Rolled back to step {rollbackIdx + 1}
            </div>
          )}
        </div>
      </div>

      {/* Constraint Manager */}
      <ConstraintManager />

      {/* Footer */}
      <div className="px-3 py-2 border-t border-[#21262d] text-[10px] text-slate-600 flex items-center justify-between">
        <span>{objects.length} object{objects.length !== 1 ? "s" : ""}</span>
        {selectedIds.length > 1 && <span className="text-[#00D4FF]/70">{selectedIds.length} selected</span>}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl shadow-black/50 py-1 min-w-[160px] animate-scale-in"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                const obj = objects.find((o) => o.id === contextMenu.objectId);
                if (obj) {
                  setEditingId(obj.id);
                  setEditName(obj.name);
                }
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-[#21262d] transition-colors duration-150"
            >
              <Edit3 size={12} className="text-slate-500" /> Rename
            </button>
            <button
              onClick={() => handleDuplicate(contextMenu.objectId)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-[#21262d] transition-colors duration-150"
            >
              <Copy size={12} className="text-slate-500" /> Duplicate
            </button>
            <button
              onClick={() => {
                const obj = objects.find((o) => o.id === contextMenu.objectId);
                if (obj) updateObject(obj.id, { visible: !obj.visible });
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-[#21262d] transition-colors duration-150"
            >
              <EyeOff size={12} className="text-slate-500" /> Toggle Visibility
            </button>
            {/* Suppress feature */}
            {(() => {
              const obj = objects.find((o) => o.id === contextMenu.objectId);
              return obj?.featureType ? (
                <button
                  onClick={() => {
                    updateObject(contextMenu.objectId, { locked: true, visible: false });
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] text-yellow-400 hover:bg-yellow-500/10 transition-colors duration-150"
                >
                  <MoreVertical size={12} /> Suppress Feature
                </button>
              ) : null;
            })()}
            {/* Edit Sketch */}
            {(() => {
              const obj = objects.find((o) => o.id === contextMenu.objectId);
              return obj && SKETCH_TYPES.has(obj.type) ? (
                <button
                  onClick={() => {
                    const store = useCadStore.getState();
                    const plane = obj.sketchPlane || "xz";
                    store.enterSketchMode(plane);
                    store.selectObject(obj.id);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] text-cyan-400 hover:bg-cyan-500/10 transition-colors duration-150"
                >
                  <Edit3 size={12} /> Edit Sketch
                </button>
              ) : null;
            })()}
            <div className="h-px bg-[#21262d] my-1" />
            <button
              onClick={() => {
                deleteObject(contextMenu.objectId);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-500/10 transition-colors duration-150"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
