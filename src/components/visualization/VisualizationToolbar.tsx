"use client";

import {
  MousePointer,
  Move,
  ZoomIn,
  Maximize,
  BoxSelect,
  Ruler,
  MessageSquare,
  Footprints,
  AlertTriangle,
  Layers,
  Clock,
  Scissors,
  TriangleAlert,
  RotateCcw,
  Compass,
} from "lucide-react";
import { useVisualizationStore, type ToolMode } from "@/stores/visualization-store";

interface ToolButton {
  id: ToolMode;
  label: string;
  icon: React.ReactNode;
  group: string;
}

const tools: ToolButton[] = [
  { id: "orbit", label: "Orbit", icon: <Compass size={15} />, group: "navigate" },
  { id: "pan", label: "Pan", icon: <Move size={15} />, group: "navigate" },
  { id: "zoom", label: "Zoom", icon: <ZoomIn size={15} />, group: "navigate" },
  { id: "fit-all", label: "Fit All", icon: <Maximize size={15} />, group: "navigate" },
  { id: "section-box", label: "Section Box", icon: <BoxSelect size={15} />, group: "section" },
  { id: "measure-distance", label: "Distance", icon: <Ruler size={15} />, group: "measure" },
  { id: "measure-angle", label: "Angle", icon: <Scissors size={15} />, group: "measure" },
  { id: "measure-area", label: "Area", icon: <MousePointer size={15} />, group: "measure" },
  { id: "annotate", label: "Annotate", icon: <MessageSquare size={15} />, group: "annotate" },
  { id: "walkthrough", label: "Walkthrough", icon: <Footprints size={15} />, group: "walkthrough" },
];

export default function VisualizationToolbar() {
  const {
    activeTool,
    setActiveTool,
    showClashes,
    toggleShowClashes,
    clashResults,
    timelineActive,
    toggleTimeline,
    sectionBox,
    toggleSectionBox,
    walkthroughActive,
    toggleWalkthrough,
  } = useVisualizationStore();

  const unresolvedClashes = clashResults.filter((c) => !c.resolved).length;

  const handleToolClick = (tool: ToolMode) => {
    if (tool === "fit-all") {
      // Fit-all is a one-shot action, don't persist as active tool
      setActiveTool("orbit");
      return;
    }
    if (tool === "section-box") {
      toggleSectionBox();
      return;
    }
    if (tool === "walkthrough") {
      toggleWalkthrough();
      return;
    }
    setActiveTool(tool);
  };

  // Group tools by category
  const groups = [
    { id: "navigate", label: "Navigate" },
    { id: "section", label: "Section" },
    { id: "measure", label: "Measure" },
    { id: "annotate", label: "Annotate" },
    { id: "walkthrough", label: "Walk" },
  ];

  return (
    <div className="flex items-center gap-0.5 bg-[#0d1117] border-b border-[#21262d] px-2 py-1">
      {groups.map((group, gi) => (
        <div key={group.id} className="flex items-center gap-0.5">
          {gi > 0 && (
            <div className="w-px h-5 bg-[#21262d] mx-1" />
          )}
          {tools
            .filter((t) => t.group === group.id)
            .map((tool) => {
              const isActive =
                tool.id === activeTool ||
                (tool.id === "section-box" && sectionBox.enabled) ||
                (tool.id === "walkthrough" && walkthroughActive);

              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id)}
                  title={tool.label}
                  className={`relative w-8 h-8 rounded flex items-center justify-center transition-all duration-150 ${
                    isActive
                      ? "bg-[#00D4FF]/15 text-[#00D4FF] shadow-glow-sm"
                      : "text-slate-500 hover:text-slate-200 hover:bg-[#161b22]"
                  }`}
                >
                  {tool.icon}
                </button>
              );
            })}
        </div>
      ))}

      {/* Separator */}
      <div className="w-px h-5 bg-[#21262d] mx-1" />

      {/* Clash detection toggle */}
      <button
        onClick={toggleShowClashes}
        title={`Clashes ${showClashes ? "visible" : "hidden"} (${unresolvedClashes} unresolved)`}
        className={`relative w-8 h-8 rounded flex items-center justify-center transition-all duration-150 ${
          showClashes
            ? "bg-red-500/15 text-red-400"
            : "text-slate-500 hover:text-slate-200 hover:bg-[#161b22]"
        }`}
      >
        <AlertTriangle size={15} />
        {unresolvedClashes > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[7px] font-bold text-white flex items-center justify-center">
            {unresolvedClashes > 9 ? "9+" : unresolvedClashes}
          </span>
        )}
      </button>

      {/* 4D Timeline toggle */}
      <button
        onClick={toggleTimeline}
        title={`4D Timeline ${timelineActive ? "active" : "inactive"}`}
        className={`w-8 h-8 rounded flex items-center justify-center transition-all duration-150 ${
          timelineActive
            ? "bg-purple-500/15 text-purple-400"
            : "text-slate-500 hover:text-slate-200 hover:bg-[#161b22]"
        }`}
      >
        <Clock size={15} />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* View reset */}
      <button
        onClick={() => setActiveTool("orbit")}
        title="Reset view"
        className="w-8 h-8 rounded flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-[#161b22] transition-all duration-150"
      >
        <RotateCcw size={15} />
      </button>
    </div>
  );
}
