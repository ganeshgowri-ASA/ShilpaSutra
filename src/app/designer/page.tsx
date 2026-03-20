"use client";
import { useState } from "react";
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

export default function DesignerPage() {
  const activeTool = useCadStore((s) => s.activeTool);
  const selectedId = useCadStore((s) => s.selectedId);
  const measureResult = useCadStore((s) => s.measureResult);
  const clearMeasure = useCadStore((s) => s.clearMeasure);
  const unit = useCadStore((s) => s.unit);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"basic" | "zookeeper">("zookeeper");

  const sketchTools = ["line", "arc", "circle", "rectangle"];
  const isSketchMode = sketchTools.includes(activeTool);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Part 1: Ribbon Toolbar (top) */}
      <RibbonToolbar />

      {/* Main workspace area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Part 2: Feature Tree (left 240px) */}
        <FeatureTree />

        {/* Center: Viewport */}
        <div className="flex-1 relative min-w-0">
          <Viewport3D />

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
                Sketch Mode - XZ Plane
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
        </div>

        {/* Part 3: Property Panel (right 280px) */}
        <PropertyPanel />

        {/* AI Chat Sidebar */}
        {aiOpen && aiMode === "basic" && <AIChatSidebar onClose={() => setAiOpen(false)} />}
        {aiOpen && aiMode === "zookeeper" && <AIChatAssistantEnhanced onClose={() => setAiOpen(false)} />}
      </div>

      {/* Part 7: Command Bar (bottom 40px) */}
      <DesignerCommandBar />
    </div>
  );
}
