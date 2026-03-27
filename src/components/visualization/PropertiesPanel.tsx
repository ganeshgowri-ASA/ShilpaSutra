"use client";

import { useMemo } from "react";
import {
  Info,
  MapPin,
  RotateCw,
  Maximize2,
  Tag,
  Hash,
  Palette,
  Box,
} from "lucide-react";
import { useVisualizationStore, DISCIPLINE_COLORS } from "@/stores/visualization-store";

export default function PropertiesPanel() {
  const { components, models, selectedComponentId, clashResults } =
    useVisualizationStore();

  const selectedComponent = useMemo(() => {
    if (!selectedComponentId) return null;
    return components.get(selectedComponentId) || null;
  }, [components, selectedComponentId]);

  const parentModel = useMemo(() => {
    if (!selectedComponent) return null;
    return models.find((m) => m.id === selectedComponent.modelId) || null;
  }, [models, selectedComponent]);

  const componentClashes = useMemo(() => {
    if (!selectedComponentId) return [];
    return clashResults.filter(
      (c) =>
        !c.resolved &&
        (c.componentA === selectedComponentId || c.componentB === selectedComponentId)
    );
  }, [clashResults, selectedComponentId]);

  if (!selectedComponent) {
    return (
      <div className="h-full flex flex-col bg-[#0d1117] border-l border-[#21262d]">
        <div className="px-3 py-2 border-b border-[#21262d]">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-[#00D4FF]" />
            <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
              Properties
            </span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-700">
            <Box size={24} className="mx-auto mb-2" />
            <div className="text-[10px]">Select a component</div>
            <div className="text-[9px] text-slate-800">
              Click in the tree or viewport
            </div>
          </div>
        </div>
      </div>
    );
  }

  const disciplineColor = parentModel
    ? DISCIPLINE_COLORS[parentModel.discipline] || DISCIPLINE_COLORS.other
    : "#6b7280";

  return (
    <div className="h-full flex flex-col bg-[#0d1117] border-l border-[#21262d]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#21262d]">
        <div className="flex items-center gap-2 mb-1">
          <Info size={14} className="text-[#00D4FF]" />
          <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
            Properties
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: disciplineColor }}
          />
          <span className="text-[11px] font-semibold text-slate-200 truncate">
            {selectedComponent.name}
          </span>
        </div>
        {parentModel && (
          <div className="text-[9px] text-slate-600 mt-0.5">
            Model: {parentModel.name} ({parentModel.discipline})
          </div>
        )}
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto thin-scrollbar">
        {/* Transform */}
        <PropertySection title="Transform" icon={<MapPin size={11} />}>
          <PropertyRow label="Position X" value={selectedComponent.position[0].toFixed(3)} />
          <PropertyRow label="Position Y" value={selectedComponent.position[1].toFixed(3)} />
          <PropertyRow label="Position Z" value={selectedComponent.position[2].toFixed(3)} />
        </PropertySection>

        <PropertySection title="Rotation" icon={<RotateCw size={11} />}>
          <PropertyRow label="Rotation X" value={`${(selectedComponent.rotation[0] * 180 / Math.PI).toFixed(1)}°`} />
          <PropertyRow label="Rotation Y" value={`${(selectedComponent.rotation[1] * 180 / Math.PI).toFixed(1)}°`} />
          <PropertyRow label="Rotation Z" value={`${(selectedComponent.rotation[2] * 180 / Math.PI).toFixed(1)}°`} />
        </PropertySection>

        <PropertySection title="Scale" icon={<Maximize2 size={11} />}>
          <PropertyRow label="Scale X" value={selectedComponent.scale[0].toFixed(3)} />
          <PropertyRow label="Scale Y" value={selectedComponent.scale[1].toFixed(3)} />
          <PropertyRow label="Scale Z" value={selectedComponent.scale[2].toFixed(3)} />
        </PropertySection>

        {/* Bounding box */}
        {selectedComponent.boundingBox && (
          <PropertySection title="Bounding Box" icon={<Box size={11} />}>
            <PropertyRow
              label="Min"
              value={`(${selectedComponent.boundingBox.min.map((v) => v.toFixed(2)).join(", ")})`}
            />
            <PropertyRow
              label="Max"
              value={`(${selectedComponent.boundingBox.max.map((v) => v.toFixed(2)).join(", ")})`}
            />
            <PropertyRow
              label="Size"
              value={`${(selectedComponent.boundingBox.max[0] - selectedComponent.boundingBox.min[0]).toFixed(2)} × ${(selectedComponent.boundingBox.max[1] - selectedComponent.boundingBox.min[1]).toFixed(2)} × ${(selectedComponent.boundingBox.max[2] - selectedComponent.boundingBox.min[2]).toFixed(2)}`}
            />
          </PropertySection>
        )}

        {/* Metadata */}
        {Object.keys(selectedComponent.metadata).length > 0 && (
          <PropertySection title="Metadata" icon={<Tag size={11} />}>
            {Object.entries(selectedComponent.metadata).map(([key, value]) => (
              <PropertyRow key={key} label={key} value={String(value)} />
            ))}
          </PropertySection>
        )}

        {/* Phase info */}
        {selectedComponent.constructionPhase !== undefined && (
          <PropertySection title="Construction Phase" icon={<Hash size={11} />}>
            <PropertyRow label="Phase" value={String(selectedComponent.constructionPhase)} />
            <PropertyRow label="Status" value={selectedComponent.phaseStatus || "planned"} />
          </PropertySection>
        )}

        {/* Clashes */}
        {componentClashes.length > 0 && (
          <PropertySection title="Clashes" icon={<Palette size={11} />}>
            {componentClashes.map((clash) => (
              <div
                key={clash.id}
                className={`text-[9px] px-2 py-1 rounded mb-0.5 ${
                  clash.severity === "critical"
                    ? "bg-red-500/10 text-red-400"
                    : clash.severity === "major"
                    ? "bg-orange-500/10 text-orange-400"
                    : "bg-yellow-500/10 text-yellow-400"
                }`}
              >
                <div className="font-medium capitalize">
                  {clash.type} - {clash.severity}
                </div>
                <div className="text-[8px] opacity-80 mt-0.5">
                  {clash.description}
                </div>
              </div>
            ))}
          </PropertySection>
        )}

        {/* Component ID */}
        <PropertySection title="Identification" icon={<Hash size={11} />}>
          <PropertyRow label="ID" value={selectedComponent.id} />
          <PropertyRow label="Model ID" value={selectedComponent.modelId} />
          <PropertyRow label="Visible" value={selectedComponent.visible ? "Yes" : "No"} />
        </PropertySection>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function PropertySection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[#21262d]/50">
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="px-3 pb-2">{children}</div>
    </div>
  );
}

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[9px] text-slate-600">{label}</span>
      <span className="text-[9px] text-slate-300 font-mono truncate ml-2 max-w-[120px]">
        {value}
      </span>
    </div>
  );
}
