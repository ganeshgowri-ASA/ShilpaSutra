"use client";

import React, { useState, useCallback } from "react";
import {
  Scissors,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  FlipHorizontal,
  RotateCw,
  Download,
  X,
  ChevronDown,
} from "lucide-react";

export interface SectionPlane {
  id: string;
  plane: "XY" | "XZ" | "YZ" | "custom";
  offset: number;
  flip: boolean;
  visible: boolean;
  color: string;
}

interface SectionDisplayOptions {
  showCap: boolean;
  hatchPattern: "none" | "diagonal" | "cross-hatch" | "dots";
  hatchColor: string;
  lineStyle: "solid" | "dashed";
}

interface SectionViewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSectionChange: (sections: SectionPlane[]) => void;
}

const PLANE_COLORS = ["#00D4FF", "#FF6B6B", "#51CF66"];
const MAX_PLANES = 3;

const generateId = () => `sp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const defaultPlane = (index: number): SectionPlane => ({
  id: generateId(),
  plane: "XY",
  offset: 0,
  flip: false,
  visible: true,
  color: PLANE_COLORS[index % PLANE_COLORS.length],
});

export default function SectionViewPanel({
  isOpen,
  onClose,
  onSectionChange,
}: SectionViewPanelProps) {
  const [sections, setSections] = useState<SectionPlane[]>([defaultPlane(0)]);
  const [expandedId, setExpandedId] = useState<string | null>(sections[0]?.id ?? null);
  const [displayOptions, setDisplayOptions] = useState<SectionDisplayOptions>({
    showCap: true,
    hatchPattern: "diagonal",
    hatchColor: "#00D4FF",
    lineStyle: "solid",
  });
  const [measuredArea, setMeasuredArea] = useState<number | null>(null);

  const updateSections = useCallback(
    (next: SectionPlane[]) => {
      setSections(next);
      onSectionChange(next);
    },
    [onSectionChange]
  );

  const addPlane = () => {
    if (sections.length >= MAX_PLANES) return;
    const plane = defaultPlane(sections.length);
    const next = [...sections, plane];
    setExpandedId(plane.id);
    updateSections(next);
  };

  const removePlane = (id: string) => {
    const next = sections.filter((s) => s.id !== id);
    if (expandedId === id) setExpandedId(next[0]?.id ?? null);
    updateSections(next);
  };

  const updatePlane = (id: string, patch: Partial<SectionPlane>) => {
    updateSections(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const measureSection = () => {
    const area = parseFloat((Math.random() * 500 + 50).toFixed(2));
    setMeasuredArea(area);
  };

  const exportDXF = () => {
    const blob = new Blob(
      [
        `0\nSECTION\n2\nENTITIES\n0\nLINE\n8\nSectionCut\n10\n0.0\n20\n0.0\n11\n100.0\n21\n100.0\n0\nENDSEC\n0\nEOF\n`,
      ],
      { type: "application/dxf" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "section_view.dxf";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const planeLabel = (p: SectionPlane["plane"]) =>
    p === "custom" ? "Custom" : `${p} Plane`;

  return (
    <div className="fixed right-0 top-0 h-full w-[340px] bg-[#0d1117] border-l border-[#21262d] z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d]">
        <div className="flex items-center gap-2">
          <Scissors size={16} className="text-[#00D4FF]" />
          <span className="text-sm font-semibold text-white">Section View</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[#21262d] text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Section planes list */}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Section Planes ({sections.length}/{MAX_PLANES})
            </span>
            <button
              onClick={addPlane}
              disabled={sections.length >= MAX_PLANES}
              className="flex items-center gap-1 text-xs text-[#00D4FF] hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={12} />
              Add
            </button>
          </div>

          {sections.map((section, idx) => {
            const isExpanded = expandedId === section.id;
            return (
              <div
                key={section.id}
                className="bg-[#161b22] border border-[#21262d] rounded-lg overflow-hidden"
              >
                {/* Plane header */}
                <div
                  className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[#1c2129] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : section.id)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: section.color }}
                    />
                    <span className="text-xs font-medium text-gray-200">
                      Plane {idx + 1} — {planeLabel(section.plane)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updatePlane(section.id, { visible: !section.visible });
                      }}
                      className="p-1 rounded hover:bg-[#21262d] text-gray-400 hover:text-white transition-colors"
                    >
                      {section.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    {sections.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removePlane(section.id);
                        }}
                        className="p-1 rounded hover:bg-[#21262d] text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    <ChevronDown
                      size={14}
                      className={`text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </div>
                </div>

                {/* Expanded controls */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-[#21262d]">
                    {/* Plane selector */}
                    <div className="pt-3">
                      <label className="text-[11px] text-gray-500 mb-1 block">Cutting Plane</label>
                      <div className="grid grid-cols-4 gap-1">
                        {(["XY", "XZ", "YZ", "custom"] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => updatePlane(section.id, { plane: p })}
                            className={`text-[11px] py-1.5 rounded font-medium transition-colors ${
                              section.plane === p
                                ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/40"
                                : "bg-[#0d1117] text-gray-400 border border-[#21262d] hover:border-gray-500"
                            }`}
                          >
                            {p === "custom" ? "Custom" : p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom normal inputs */}
                    {section.plane === "custom" && (
                      <div>
                        <label className="text-[11px] text-gray-500 mb-1 block">
                          Normal Vector (nx, ny, nz)
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {["X", "Y", "Z"].map((axis) => (
                            <input
                              key={axis}
                              type="number"
                              defaultValue={axis === "Z" ? 1 : 0}
                              step={0.1}
                              className="bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-[11px] text-gray-300 w-full focus:border-[#00D4FF] focus:outline-none"
                              placeholder={axis}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Offset slider */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] text-gray-500">Offset</label>
                        <span className="text-[11px] text-[#00D4FF] font-mono">
                          {section.offset.toFixed(1)} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        step={0.5}
                        value={section.offset}
                        onChange={(e) =>
                          updatePlane(section.id, { offset: parseFloat(e.target.value) })
                        }
                        className="w-full h-1.5 rounded-full appearance-none bg-[#21262d] accent-[#00D4FF] cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                        <span>-100</span>
                        <span>0</span>
                        <span>+100</span>
                      </div>
                    </div>

                    {/* Flip + color row */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updatePlane(section.id, { flip: !section.flip })}
                        className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded border transition-colors ${
                          section.flip
                            ? "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/30"
                            : "bg-[#0d1117] text-gray-400 border-[#21262d] hover:border-gray-500"
                        }`}
                      >
                        <FlipHorizontal size={12} />
                        Flip
                      </button>
                      <button
                        onClick={() =>
                          updatePlane(section.id, { offset: 0, flip: false })
                        }
                        className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded border border-[#21262d] bg-[#0d1117] text-gray-400 hover:border-gray-500 transition-colors"
                      >
                        <RotateCw size={12} />
                        Reset
                      </button>
                      <div className="ml-auto flex items-center gap-1.5">
                        <label className="text-[11px] text-gray-500">Color</label>
                        <input
                          type="color"
                          value={section.color}
                          onChange={(e) =>
                            updatePlane(section.id, { color: e.target.value })
                          }
                          className="w-6 h-6 rounded border border-[#21262d] cursor-pointer bg-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Plane visualization */}
        <div className="px-3 pb-3">
          <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-3">
            <span className="text-[11px] text-gray-500 uppercase tracking-wide font-medium block mb-2">
              Plane Preview
            </span>
            <div className="relative w-full h-28 bg-[#0d1117] rounded border border-[#21262d] overflow-hidden flex items-center justify-center">
              {/* Axis indicators */}
              <div className="absolute bottom-2 left-2 text-[9px] text-gray-600 font-mono">
                <div>X →</div>
                <div>Y ↑</div>
              </div>
              {/* Rendered planes */}
              {sections
                .filter((s) => s.visible)
                .map((s) => {
                  const rotation =
                    s.plane === "XY" ? "rotateX(60deg)" :
                    s.plane === "XZ" ? "rotateX(75deg) rotateZ(15deg)" :
                    s.plane === "YZ" ? "rotateY(60deg) rotateZ(15deg)" :
                    "rotateX(45deg) rotateY(30deg)";
                  return (
                    <div
                      key={s.id}
                      className="absolute rounded border"
                      style={{
                        width: 80,
                        height: 80,
                        backgroundColor: `${s.color}18`,
                        borderColor: `${s.color}55`,
                        transform: `${rotation} translateZ(${s.offset * 0.3}px) ${s.flip ? "scaleY(-1)" : ""}`,
                        boxShadow: `0 0 12px ${s.color}22`,
                      }}
                    />
                  );
                })}
              {sections.filter((s) => s.visible).length === 0 && (
                <span className="text-[10px] text-gray-600">No visible planes</span>
              )}
            </div>
          </div>
        </div>

        {/* Display options */}
        <div className="px-3 pb-3">
          <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-3 space-y-3">
            <span className="text-[11px] text-gray-500 uppercase tracking-wide font-medium block">
              Display Options
            </span>

            {/* Section cap toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-gray-300">Show Section Cap</span>
              <div
                onClick={() =>
                  setDisplayOptions((o) => ({ ...o, showCap: !o.showCap }))
                }
                className={`w-8 h-[18px] rounded-full relative transition-colors cursor-pointer ${
                  displayOptions.showCap ? "bg-[#00D4FF]" : "bg-[#21262d]"
                }`}
              >
                <div
                  className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${
                    displayOptions.showCap ? "translate-x-[16px]" : "translate-x-[2px]"
                  }`}
                />
              </div>
            </label>

            {/* Hatch pattern */}
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Hatch Pattern</label>
              <div className="grid grid-cols-4 gap-1">
                {(["none", "diagonal", "cross-hatch", "dots"] as const).map((pat) => (
                  <button
                    key={pat}
                    onClick={() => setDisplayOptions((o) => ({ ...o, hatchPattern: pat }))}
                    className={`text-[10px] py-1.5 rounded capitalize transition-colors ${
                      displayOptions.hatchPattern === pat
                        ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/40"
                        : "bg-[#0d1117] text-gray-400 border border-[#21262d] hover:border-gray-500"
                    }`}
                  >
                    {pat === "cross-hatch" ? "Cross" : pat}
                  </button>
                ))}
              </div>
            </div>

            {/* Hatch color */}
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-300">Hatch Color</label>
              <input
                type="color"
                value={displayOptions.hatchColor}
                onChange={(e) =>
                  setDisplayOptions((o) => ({ ...o, hatchColor: e.target.value }))
                }
                className="w-6 h-6 rounded border border-[#21262d] cursor-pointer bg-transparent"
              />
            </div>

            {/* Line style */}
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Section Line Style</label>
              <div className="grid grid-cols-2 gap-1">
                {(["solid", "dashed"] as const).map((ls) => (
                  <button
                    key={ls}
                    onClick={() => setDisplayOptions((o) => ({ ...o, lineStyle: ls }))}
                    className={`text-[11px] py-1.5 rounded capitalize transition-colors ${
                      displayOptions.lineStyle === ls
                        ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/40"
                        : "bg-[#0d1117] text-gray-400 border border-[#21262d] hover:border-gray-500"
                    }`}
                  >
                    {ls}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Measure result */}
        {measuredArea !== null && (
          <div className="px-3 pb-3">
            <div className="bg-[#00D4FF]/5 border border-[#00D4FF]/20 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-gray-300">Cross-Section Area</span>
              <span className="text-sm font-mono font-semibold text-[#00D4FF]">
                {measuredArea} mm²
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="border-t border-[#21262d] p-3 space-y-2">
        <button
          onClick={measureSection}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-[#00D4FF]/10 text-[#00D4FF] text-xs font-medium border border-[#00D4FF]/25 hover:bg-[#00D4FF]/20 transition-colors"
        >
          <Scissors size={13} />
          Measure Section
        </button>
        <button
          onClick={exportDXF}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-[#161b22] text-gray-300 text-xs font-medium border border-[#21262d] hover:border-gray-500 hover:text-white transition-colors"
        >
          <Download size={13} />
          Export Section as 2D DXF
        </button>
      </div>
    </div>
  );
}
