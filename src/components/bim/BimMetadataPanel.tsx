"use client";
import { useState } from "react";
import type { IfcParseResult, IfcMeshData, IfcEntity, IfcSpatialNode } from "@/lib/ifc-engine";

interface Props {
  ifcResult: IfcParseResult;
  selectedMesh: IfcMeshData | null;
  selectedEntity: IfcEntity | null;
  onSelectEntity: (id: number) => void;
}

type PanelTab = "hierarchy" | "types" | "properties" | "header";

/* ── Spatial tree item ──────────────────────────────────── */
function SpatialTreeItem({
  node,
  depth,
  onSelect,
}: {
  node: IfcSpatialNode;
  depth: number;
  onSelect: (id: number) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) setOpen(!open);
          onSelect(node.id);
        }}
        className="flex items-center gap-1.5 py-1 px-2 w-full text-left hover:bg-[#1a1a2e] rounded transition-colors"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <span className="text-[10px] text-slate-600 w-3 shrink-0">
          {hasChildren ? (open ? "▼" : "▶") : "·"}
        </span>
        <span className="text-[10px] text-emerald-400/60 font-mono shrink-0 w-28 truncate">{node.type}</span>
        <span className="text-[10px] text-slate-300 truncate flex-1">{node.name}</span>
        {node.children.length > 0 && (
          <span className="text-[9px] text-slate-600 shrink-0">({node.children.length})</span>
        )}
      </button>
      {open &&
        hasChildren &&
        node.children.map((child) => (
          <SpatialTreeItem key={child.id} node={child} depth={depth + 1} onSelect={onSelect} />
        ))}
    </div>
  );
}

/* ── Search/filter types ────────────────────────────────── */
function TypesPanel({
  typeCounts,
  onSelectType,
}: {
  typeCounts: Record<string, number>;
  onSelectType: (type: string) => void;
}) {
  const [search, setSearch] = useState("");
  const entries = Object.entries(typeCounts)
    .filter(([t]) => t.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[1] - a[1]);
  const total = Object.values(typeCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[#1a1a2e]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search IFC types…"
          className="w-full px-2 py-1.5 text-xs bg-[#0a0a0f] border border-[#252540] rounded text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"
        />
        <div className="text-[10px] text-slate-600 mt-1.5">{entries.length} types · {total.toLocaleString()} total</div>
      </div>
      <div className="flex-1 overflow-auto">
        {entries.map(([type, count]) => (
          <button
            key={type}
            onClick={() => onSelectType(type)}
            className="flex items-center justify-between px-3 py-2 w-full text-left hover:bg-[#1a1a2e] border-b border-[#1a1a2e]/50 transition-colors"
          >
            <span className="text-[11px] text-slate-300 font-mono">{type}</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 rounded-full bg-emerald-500/30 overflow-hidden" style={{ width: 40 }}>
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(100, (count / Math.max(...Object.values(typeCounts))) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] text-emerald-400 font-bold w-8 text-right">{count}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Properties panel ───────────────────────────────────── */
function PropertiesPanel({
  selectedMesh,
  selectedEntity,
  ifcResult,
}: {
  selectedMesh: IfcMeshData | null;
  selectedEntity: IfcEntity | null;
  ifcResult: IfcParseResult;
}) {
  if (!selectedMesh) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="text-2xl text-slate-700 mb-2">⬡</div>
        <div className="text-xs text-slate-500">Click an element in the viewer to see its IFC properties</div>
      </div>
    );
  }

  // Gather property sets for this entity
  const entityPsets: Array<{ name: string; props: Record<string, string | number | boolean> }> = [];
  ifcResult.propertySets.forEach((pset) => {
    // Check if this pset is linked (simplified: show pset with matching entity refs)
    entityPsets.push({ name: pset.name, props: pset.properties });
  });

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Entity header */}
      <div className="p-3 border-b border-[#1a1a2e] bg-emerald-500/5">
        <div className="text-[10px] text-emerald-400 font-mono">{selectedMesh.entityType}</div>
        <div className="text-sm text-white font-medium mt-0.5">{selectedMesh.name}</div>
        <div className="text-[10px] text-slate-500 mt-0.5">#{selectedMesh.entityId}</div>
      </div>

      {/* Geometry info */}
      <div className="p-3 border-b border-[#1a1a2e]">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Geometry</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["Category", selectedMesh.category],
            ["Width", `${selectedMesh.dimensions.width.toFixed(3)} m`],
            ["Height", `${selectedMesh.dimensions.height.toFixed(3)} m`],
            ["Depth", `${selectedMesh.dimensions.depth.toFixed(3)} m`],
            ["Position X", `${selectedMesh.position[0].toFixed(3)} m`],
            ["Position Y", `${selectedMesh.position[1].toFixed(3)} m`],
          ].map(([label, value]) => (
            <div key={label} className="bg-[#0a0a0f] rounded p-2 border border-[#1a1a2e]">
              <div className="text-[9px] text-slate-600 uppercase tracking-wider">{label}</div>
              <div className="text-[11px] text-white mt-0.5 truncate">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Color swatch */}
      <div className="p-3 border-b border-[#1a1a2e]">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Render Color</div>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded border border-[#252540]"
            style={{ background: `rgb(${selectedMesh.color.map((c) => Math.round(c * 255)).join(",")})` }}
          />
          <span className="text-xs text-slate-400 font-mono">
            rgb({selectedMesh.color.map((c) => Math.round(c * 255)).join(", ")})
          </span>
        </div>
      </div>

      {/* Raw entity attrs */}
      {selectedEntity && (
        <div className="p-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Raw IFC Attributes</div>
          <div className="space-y-1">
            {selectedEntity.attrs.map((attr, i) => (
              <div key={i} className="flex gap-2 text-[10px]">
                <span className="text-slate-600 w-4 shrink-0">{i}</span>
                <span className="text-slate-400 truncate">
                  {attr === null ? "—" :
                    typeof attr === "object" && "ref" in attr ? `#${attr.ref}` :
                    typeof attr === "object" && "items" in attr ? `(${attr.items.length} items)` :
                    String(attr)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Header info panel ──────────────────────────────────── */
function HeaderPanel({ ifcResult }: { ifcResult: IfcParseResult }) {
  const rows = [
    ["Schema", ifcResult.schema],
    ["Project", ifcResult.projectName],
    ["Origin App", ifcResult.originApplication || "—"],
    ["Author", ifcResult.authorName || "—"],
    ["Created", ifcResult.creationDate || "—"],
    ["Total Entities", ifcResult.stats.totalEntities.toLocaleString()],
    ["Geometry Elements", ifcResult.stats.geometryEntities.toLocaleString()],
    ["Property Sets", ifcResult.stats.propertySetCount.toLocaleString()],
  ];

  return (
    <div className="p-3 space-y-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">IFC File Header</div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between items-center py-1.5 border-b border-[#1a1a2e]">
          <span className="text-[11px] text-slate-500">{label}</span>
          <span className="text-[11px] text-white font-medium">{value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main panel ─────────────────────────────────────────── */
export function BimMetadataPanel({ ifcResult, selectedMesh, selectedEntity, onSelectEntity }: Props) {
  const [activeTab, setActiveTab] = useState<PanelTab>("hierarchy");

  const tabs: { id: PanelTab; label: string }[] = [
    { id: "hierarchy", label: "Tree" },
    { id: "types", label: "Types" },
    { id: "properties", label: "Props" },
    { id: "header", label: "Info" },
  ];

  return (
    <div className="w-72 border-l border-[#1a1a2e] flex flex-col bg-[#0d0d14]">
      {/* Tab bar */}
      <div className="flex border-b border-[#1a1a2e] shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-[11px] font-medium transition-colors ${
              activeTab === tab.id
                ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-400/5"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "hierarchy" && ifcResult.spatialRoot && (
          <div className="h-full overflow-auto py-1">
            <SpatialTreeItem node={ifcResult.spatialRoot} depth={0} onSelect={onSelectEntity} />
          </div>
        )}
        {activeTab === "hierarchy" && !ifcResult.spatialRoot && (
          <div className="flex items-center justify-center h-full text-xs text-slate-600">No spatial hierarchy found</div>
        )}
        {activeTab === "types" && (
          <TypesPanel typeCounts={ifcResult.typeCounts} onSelectType={() => {}} />
        )}
        {activeTab === "properties" && (
          <PropertiesPanel selectedMesh={selectedMesh} selectedEntity={selectedEntity} ifcResult={ifcResult} />
        )}
        {activeTab === "header" && <HeaderPanel ifcResult={ifcResult} />}
      </div>
    </div>
  );
}
