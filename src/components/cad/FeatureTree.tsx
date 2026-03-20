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
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer group transition-colors ${
        isSelected
          ? "bg-[#00D4FF]/15 text-[#00D4FF]"
          : "text-slate-400 hover:bg-[#0f3460]/40 hover:text-slate-300"
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
          className="flex-1 bg-[#0d1117] text-[11px] px-1 py-0.5 rounded border border-[#00D4FF]/50 outline-none text-white min-w-0"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 text-[11px] truncate">{obj.name}</span>
      )}

      {paramSummary && (
        <span className="text-[9px] text-slate-600 shrink-0">{paramSummary}</span>
      )}

      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateObject(obj.id, { visible: !obj.visible });
          }}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#0f3460]"
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
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#0f3460]"
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

  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [originExpanded, setOriginExpanded] = useState(true);
  const [sketchesExpanded, setSketchesExpanded] = useState(true);
  const [featuresExpanded, setFeaturesExpanded] = useState(true);
  const [bodiesExpanded, setBodiesExpanded] = useState(true);
  const [planeVisibility, setPlaneVisibility] = useState({ xy: true, xz: true, yz: true });

  const editInputRef = useRef<HTMLInputElement>(null);

  // Categorize objects
  const filteredObjects = searchQuery
    ? objects.filter((o) => o.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : objects;

  const sketches = filteredObjects.filter((o) => SKETCH_TYPES.has(o.type));
  const features = filteredObjects.filter((o) => o.type === "mesh" && o.featureType);
  const bodies = filteredObjects.filter((o) => SOLID_TYPES.has(o.type) || (o.type === "mesh" && !o.featureType));

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
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:bg-[#0f3460]/50 transition-colors"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {icon}
        <span className="text-[11px] font-medium">{title}</span>
        <span className="ml-auto text-[9px] text-slate-600 bg-[#0d1117] rounded px-1">{count}</span>
      </button>
      {expanded && items.length > 0 && (
        <div className="ml-4 space-y-0.5">
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
        <div className="ml-4 py-1 text-[10px] text-slate-700 px-2">
          {searchQuery ? "No matching" : "Empty"}
        </div>
      )}
    </div>
  );

  if (featureTreeCollapsed) {
    return (
      <div className="w-10 bg-[#1a1a2e] border-r border-[#16213e] flex flex-col items-center pt-2 shrink-0">
        <button
          onClick={() => setFeatureTreeCollapsed(false)}
          className="w-8 h-8 rounded flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#0f3460] transition-colors"
          title="Expand Feature Tree"
        >
          <PanelLeft size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[240px] bg-[#1a1a2e] border-r border-[#16213e] flex flex-col shrink-0 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#16213e]">
        <div className="flex items-center gap-1.5">
          <Layers size={14} className="text-[#00D4FF]" />
          <span className="text-xs font-semibold text-slate-300">Feature Tree</span>
        </div>
        <button
          onClick={() => setFeatureTreeCollapsed(true)}
          className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#0f3460] transition-colors"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 border-b border-[#16213e]">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter..."
            className="w-full bg-[#0d1117] text-[11px] text-slate-300 rounded pl-7 pr-2 py-1.5 border border-[#16213e] focus:border-[#00D4FF]/50 outline-none placeholder-slate-600"
          />
        </div>
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {/* Origin folder */}
        <div className="mb-1">
          <button
            onClick={() => setOriginExpanded(!originExpanded)}
            className="w-full flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:bg-[#0f3460]/50 transition-colors"
          >
            {originExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Layers size={12} className="text-yellow-500" />
            <span className="text-[11px]">Origin</span>
          </button>
          {originExpanded && (
            <div className="ml-5 space-y-0.5">
              {(["xy", "xz", "yz"] as const).map((plane) => (
                <div
                  key={plane}
                  className="flex items-center justify-between px-2 py-0.5 rounded hover:bg-[#0f3460]/30 group"
                >
                  <span className="text-[10px] text-slate-500 uppercase">{plane.toUpperCase()} Plane</span>
                  <button
                    onClick={() => setPlaneVisibility((p) => ({ ...p, [plane]: !p[plane] }))}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {planeVisibility[plane] ? (
                      <Eye size={10} className="text-slate-500" />
                    ) : (
                      <EyeOff size={10} className="text-slate-600" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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
      </div>

      {/* Constraint Manager */}
      <ConstraintManager />

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-[#16213e] text-[10px] text-slate-600">
        {objects.length} object{objects.length !== 1 ? "s" : ""}
        {selectedIds.length > 1 && ` (${selectedIds.length} selected)`}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-[#1a1a2e] border border-[#16213e] rounded-lg shadow-xl py-1 min-w-[160px]"
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
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-[#0f3460] transition-colors"
            >
              <Edit3 size={12} /> Rename
            </button>
            <button
              onClick={() => handleDuplicate(contextMenu.objectId)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-[#0f3460] transition-colors"
            >
              <Copy size={12} /> Duplicate
            </button>
            <button
              onClick={() => {
                const obj = objects.find((o) => o.id === contextMenu.objectId);
                if (obj) updateObject(obj.id, { visible: !obj.visible });
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-[#0f3460] transition-colors"
            >
              <EyeOff size={12} /> Toggle Visibility
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
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-yellow-400 hover:bg-yellow-900/30 transition-colors"
                >
                  <MoreVertical size={12} /> Suppress Feature
                </button>
              ) : null;
            })()}
            <div className="h-px bg-[#16213e] my-1" />
            <button
              onClick={() => {
                deleteObject(contextMenu.objectId);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-900/30 transition-colors"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
