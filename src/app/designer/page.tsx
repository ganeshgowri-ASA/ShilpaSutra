"use client";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useCadStore } from "@/stores/cad-store";

const Viewport3D = dynamic(() => import("@/components/Viewport3D"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0a0a1a] text-slate-500">
      Loading 3D viewport...
    </div>
  ),
});

const RibbonToolbar = dynamic(
  () => import("@/components/cad/RibbonToolbar"),
  { ssr: false }
);

const FeatureTree = dynamic(
  () => import("@/components/cad/FeatureTree"),
  { ssr: false }
);

const PropertyPanel = dynamic(
  () => import("@/components/cad/PropertyPanel"),
  { ssr: false }
);

const DesignerCommandBar = dynamic(
  () => import("@/components/cad/DesignerCommandBar"),
  { ssr: false }
);

const AIChatSidebar = dynamic(() => import("@/components/AIChatSidebar"), {
  ssr: false,
});

const AIChatAssistantEnhanced = dynamic(
  () => import("@/components/AIChatAssistantEnhanced"),
  { ssr: false }
);

const EdgeSelector = dynamic(
  () => import("@/components/cad/EdgeSelector"),
  { ssr: false }
);

const ShellDraftPanel = dynamic(
  () => import("@/components/cad/ShellDraftPanel"),
  { ssr: false }
);

const PatternDialog = dynamic(
  () => import("@/components/cad/PatternDialog"),
  { ssr: false }
);

const HistoryTimeline = dynamic(
  () => import("@/components/cad/HistoryTimeline"),
  { ssr: false }
);

const SketchToolbar = dynamic(
  () => import("@/components/cad/SketchToolbar"),
  { ssr: false }
);

export default function DesignerPage() {
  const activeTool = useCadStore((s) => s.activeTool);
  const selectedId = useCadStore((s) => s.selectedId);
  const measureResult = useCadStore((s) => s.measureResult);
  const clearMeasure = useCadStore((s) => s.clearMeasure);
  const unit = useCadStore((s) => s.unit);
  const activeOperation = useCadStore((s) => s.activeOperation);
  const setActiveOperation = useCadStore((s) => s.setActiveOperation);
  const sketchPlane = useCadStore((s) => s.sketchPlane);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"basic" | "zookeeper">("zookeeper");

  const sketchTools = ["line", "arc", "circle", "rectangle", "polygon", "spline", "ellipse", "construction_line"];
  const isSketchMode = sketchTools.includes(activeTool);

  const handleCloseOperation = useCallback(() => {
    setActiveOperation(null);
  }, [setActiveOperation]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Ribbon Toolbar (top) */}
      <RibbonToolbar />

      {/* Main workspace area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Feature Tree (left 240px) */}
        <FeatureTree />

        {/* Center: Viewport */}
        <div className="flex-1 relative min-w-0">
          <Viewport3D />

          {/* Sketch Toolbar (floating, top center) */}
          <SketchToolbar visible={isSketchMode} />

          {/* Status overlay - top left */}
          <div className="absolute top-2 left-2 flex items-center gap-2 pointer-events-none z-10">
            <span
              className={`text-[10px] bg-[#1a1a2e]/90 border rounded px-2 py-0.5 backdrop-blur-sm ${
                isSketchMode
                  ? "border-[#00D4FF]/40 text-[#00D4FF]"
                  : "border-[#16213e] text-slate-400"
              }`}
            >
              {activeTool === "select" ? "Select" : activeTool.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
            {selectedId && (
              <span className="text-[10px] bg-[#1a1a2e]/90 border border-[#00D4FF]/30 rounded px-2 py-0.5 text-[#00D4FF] backdrop-blur-sm">
                Selected
              </span>
            )}
            {isSketchMode && (
              <span className="text-[10px] bg-[#1a1a2e]/90 border border-[#00D4FF]/30 rounded px-2 py-0.5 text-[#00D4FF]/80 backdrop-blur-sm">
                Sketch Mode - {sketchPlane.toUpperCase()} Plane
              </span>
            )}
          </div>

          {/* Measurement overlay - top right */}
          {measureResult && (
            <div className="absolute top-2 right-2 bg-[#1a1a2e]/95 border border-yellow-500/40 rounded-lg p-3 pointer-events-auto z-10 backdrop-blur-sm">
              <div className="text-[10px] text-yellow-400 font-bold mb-1">Measurement</div>
              <div className="text-xs text-white font-mono">
                Distance: <span className="text-yellow-300">{measureResult.distance} {unit}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">
                dX: {measureResult.dx} | dY: {measureResult.dy} | dZ: {measureResult.dz}
              </div>
              <button
                onClick={clearMeasure}
                className="mt-2 text-[10px] text-slate-500 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {/* AI toggle button */}
          {!measureResult && (
            <div className="absolute top-2 right-2 flex items-center gap-1 z-10 pointer-events-auto">
              {aiOpen && (
                <button
                  onClick={() => setAiMode(aiMode === "basic" ? "zookeeper" : "basic")}
                  className={`text-[10px] px-2 py-1 rounded border transition-colors backdrop-blur-sm ${
                    aiMode === "zookeeper"
                      ? "border-purple-500/40 text-purple-400 bg-purple-500/10"
                      : "border-[#16213e] text-slate-500 bg-[#1a1a2e]/80"
                  }`}
                >
                  {aiMode === "zookeeper" ? "Zookeeper" : "Basic"}
                </button>
              )}
              <button
                onClick={() => setAiOpen(!aiOpen)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  aiOpen
                    ? "bg-purple-600 text-white"
                    : "text-slate-400 hover:text-white bg-[#1a1a2e]/80 hover:bg-[#0f3460] border border-[#16213e] backdrop-blur-sm"
                }`}
              >
                AI
              </button>
            </div>
          )}

          {/* Operation dialogs (floating over viewport) */}
          {(activeOperation === "fillet" || activeOperation === "chamfer") && (
            <EdgeSelector
              mode={activeOperation}
              onClose={handleCloseOperation}
            />
          )}

          {(activeOperation === "shell" || activeOperation === "draft") && (
            <ShellDraftPanel
              mode={activeOperation}
              onClose={handleCloseOperation}
            />
          )}

          {(activeOperation === "linear_pattern" || activeOperation === "circular_pattern" || activeOperation === "mirror" || activeOperation === "path_pattern") && (
            <PatternDialog
              initialMode={
                activeOperation === "linear_pattern" ? "linear" :
                activeOperation === "circular_pattern" ? "circular" :
                activeOperation === "path_pattern" ? "path" : "mirror"
              }
              onClose={handleCloseOperation}
            />
          )}

          {/* History Timeline (floating, bottom right) */}
          <HistoryTimeline />
        </div>

        {/* Property Panel (right 280px) */}
        <PropertyPanel />

        {/* AI Chat Sidebar */}
        {aiOpen && aiMode === "basic" && <AIChatSidebar onClose={() => setAiOpen(false)} />}
        {aiOpen && aiMode === "zookeeper" && <AIChatAssistantEnhanced onClose={() => setAiOpen(false)} />}
      </div>

      {/* Command Bar (bottom 40px) */}
      <DesignerCommandBar />
    </div>
  );
}
