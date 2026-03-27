"use client";

import { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Box,
  Layers,
  Search,
  FolderOpen,
  Folder,
} from "lucide-react";
import {
  useVisualizationStore,
  DISCIPLINE_COLORS,
  type ModelComponent,
  type FederatedModel,
} from "@/stores/visualization-store";

// ── Tree node component ────────────────────────────────────────────

function TreeNode({
  component,
  depth,
  filter,
}: {
  component: ModelComponent;
  depth: number;
  filter: string;
}) {
  const {
    components,
    selectedComponentId,
    expandedNodes,
    selectComponent,
    toggleComponentVisibility,
    toggleNodeExpanded,
  } = useVisualizationStore();

  const children = useMemo(() => {
    return Array.from(components.values()).filter(
      (c) => c.parentId === component.id
    );
  }, [components, component.id]);

  const hasChildren = children.length > 0;
  const isExpanded = expandedNodes.has(component.id);
  const isSelected = selectedComponentId === component.id;

  // Filter check
  if (filter && !component.name.toLowerCase().includes(filter.toLowerCase())) {
    const hasMatchingChild = children.some((c) =>
      c.name.toLowerCase().includes(filter.toLowerCase())
    );
    if (!hasMatchingChild && children.length === 0) return null;
  }

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer group transition-colors duration-100 ${
          isSelected
            ? "bg-[#00D4FF]/15 text-[#00D4FF]"
            : "text-slate-400 hover:bg-[#161b22] hover:text-slate-200"
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={() => selectComponent(component.id)}
      >
        {/* Expand/collapse */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleNodeExpanded(component.id);
          }}
          className="w-4 h-4 flex items-center justify-center shrink-0"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={11} />
            ) : (
              <ChevronRight size={11} />
            )
          ) : (
            <span className="w-2 h-2 rounded-full bg-slate-700" />
          )}
        </button>

        {/* Icon */}
        <Box size={12} className="shrink-0 opacity-60" />

        {/* Name */}
        <span className="text-[10px] font-medium truncate flex-1">
          {component.name}
        </span>

        {/* Visibility toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleComponentVisibility(component.id);
          }}
          className="w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {component.visible ? (
            <Eye size={10} className="text-slate-500" />
          ) : (
            <EyeOff size={10} className="text-slate-700" />
          )}
        </button>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.id}
              component={child}
              depth={depth + 1}
              filter={filter}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Model group header ─────────────────────────────────────────────

function ModelGroup({ model }: { model: FederatedModel }) {
  const {
    components,
    expandedNodes,
    toggleModelVisibility,
    toggleNodeExpanded,
  } = useVisualizationStore();
  const [filter] = useState("");

  const rootComponents = useMemo(() => {
    return Array.from(components.values()).filter(
      (c) => c.modelId === model.id && c.parentId === null
    );
  }, [components, model.id]);

  const isExpanded = expandedNodes.has(model.id);
  const disciplineColor = DISCIPLINE_COLORS[model.discipline] || DISCIPLINE_COLORS.other;

  return (
    <div className="mb-1">
      {/* Model header */}
      <div
        className="flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer hover:bg-[#161b22] transition-colors group"
        onClick={() => toggleNodeExpanded(model.id)}
      >
        <button className="w-4 h-4 flex items-center justify-center shrink-0">
          {isExpanded ? (
            <FolderOpen size={12} style={{ color: disciplineColor }} />
          ) : (
            <Folder size={12} style={{ color: disciplineColor }} />
          )}
        </button>

        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: disciplineColor }}
        />

        <span className="text-[11px] font-semibold text-slate-200 truncate flex-1">
          {model.name}
        </span>

        <span className="text-[8px] text-slate-600 uppercase tracking-wide">
          {model.discipline}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleModelVisibility(model.id);
          }}
          className="w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {model.visible ? (
            <Eye size={10} className="text-slate-500" />
          ) : (
            <EyeOff size={10} className="text-slate-700" />
          )}
        </button>
      </div>

      {/* Components */}
      {isExpanded && (
        <div className="ml-1">
          {rootComponents.map((comp) => (
            <TreeNode
              key={comp.id}
              component={comp}
              depth={1}
              filter={filter}
            />
          ))}
          {rootComponents.length === 0 && (
            <div className="text-[9px] text-slate-700 py-1 px-4 italic">
              No components loaded
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────

export default function ModelTreePanel() {
  const { models, components } = useVisualizationStore();
  const [search, setSearch] = useState("");

  const totalComponents = components.size;
  const visibleCount = Array.from(components.values()).filter((c) => c.visible).length;

  return (
    <div className="h-full flex flex-col bg-[#0d1117] border-r border-[#21262d]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#21262d]">
        <div className="flex items-center gap-2 mb-2">
          <Layers size={14} className="text-[#00D4FF]" />
          <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
            Model Tree
          </span>
          <span className="ml-auto text-[9px] text-slate-600">
            {visibleCount}/{totalComponents}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={11}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600"
          />
          <input
            type="text"
            placeholder="Filter components..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#161b22] border border-[#21262d] rounded text-[10px] text-slate-300 pl-6 pr-2 py-1 placeholder-slate-700 focus:outline-none focus:border-[#00D4FF]/30"
          />
        </div>
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden thin-scrollbar px-1 py-1">
        {models.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-700">
            <Layers size={24} />
            <span className="text-[10px]">No models loaded</span>
            <span className="text-[9px] text-slate-800">
              Use Federation panel to load models
            </span>
          </div>
        ) : (
          models.map((model) => (
            <ModelGroup key={model.id} model={model} />
          ))
        )}
      </div>
    </div>
  );
}
