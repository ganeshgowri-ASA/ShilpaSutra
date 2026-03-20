"use client";
import { useState, useCallback, useRef } from "react";
import {
  useCadStore,
  type CadObject,
} from "@/stores/cad-store";
import {
  Eye, EyeOff, Lock, Unlock, ChevronRight, ChevronDown,
  Box, Cylinder, Circle, Minus, Triangle, Spline, Square,
  PenLine, Search, Layers, MoreVertical, Trash2, Copy,
  Edit3, PanelLeftClose, PanelLeft,
} from "lucide-react";

function getTypeIcon(type: string, size = 14) {
  switch (type) {
    case "box": return <Box size={size} />;
    case "cylinder": return <Cylinder size={size} />;
    case "sphere": return <Circle size={size} />;
    case "cone": return <Triangle size={size} />;
    case "line": return <Minus size={size} />;
    case "arc": return <Spline size={size} />;
    case "circle": return <Circle size={size} />;
    case "rectangle": return <Square size={size} />;
    default: return <Box size={size} />;
  }
}

interface ContextMenuState {
  x: number;
  y: number;
  objectId: string;
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
  const [planeVisibility, setPlaneVisibility] = useState({ xy: true, xz: true, yz: true });

  const editInputRef = useRef<HTMLInputElement>(null);

  const filteredObjects = searchQuery
    ? objects.filter((o) => o.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : objects;

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

        {/* Objects */}
        {filteredObjects.length === 0 ? (
          <div className="px-3 py-4 text-center text-[10px] text-slate-600">
            {searchQuery ? "No matching objects" : "No objects yet"}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredObjects.map((obj) => {
              const isSelected = selectedId === obj.id || selectedIds.includes(obj.id);
              return (
                <div
                  key={obj.id}
                  onClick={(e) => handleClick(obj.id, e)}
                  onDoubleClick={() => handleDoubleClick(obj)}
                  onContextMenu={(e) => handleContextMenu(e, obj.id)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer group transition-colors ${
                    isSelected
                      ? "bg-[#00D4FF]/15 text-[#00D4FF]"
                      : "text-slate-400 hover:bg-[#0f3460]/40 hover:text-slate-300"
                  }`}
                >
                  <span className={`shrink-0 ${isSelected ? "text-[#00D4FF]" : "text-slate-500"}`}>
                    {getTypeIcon(obj.type)}
                  </span>

                  {editingId === obj.id ? (
                    <input
                      ref={editInputRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleRename(obj.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(obj.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 bg-[#0d1117] text-[11px] px-1 py-0.5 rounded border border-[#00D4FF]/50 outline-none text-white min-w-0"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="flex-1 text-[11px] truncate">{obj.name}</span>
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
            })}
          </div>
        )}
      </div>

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
