"use client";
import React, { useState, useCallback, useRef, Component, type ErrorInfo, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useCadStore } from "@/stores/cad-store";
import { Package } from "lucide-react";

/* ── Error Boundary to prevent full-page crashes ── */
class ViewportErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Designer component error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex-1 flex items-center justify-center bg-[#0a0a1a] text-slate-400">
            <div className="text-center p-6">
              <div className="text-red-400 text-sm font-medium mb-2">Component Error</div>
              <div className="text-xs text-slate-500 mb-3 max-w-sm">
                {this.state.error?.message || "An unexpected error occurred"}
              </div>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="text-xs px-3 py-1.5 rounded bg-[#1a1a2e] border border-[#16213e] text-slate-300 hover:text-white hover:border-[#00D4FF]/40 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

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

const SketchOverlay = dynamic(
  () => import("@/components/cad/SketchOverlay"),
  { ssr: false }
);

const ExtrudeDialog = dynamic(
  () => import("@/components/cad/ExtrudeDialog"),
  { ssr: false }
);

const RevolveDialog = dynamic(
  () => import("@/components/cad/RevolveDialog"),
  { ssr: false }
);

const ComponentsPanel = dynamic(
  () => import("@/components/cad/ComponentsPanel"),
  { ssr: false }
);

const ParametricPanel = dynamic(
  () => import("@/components/cad/ParametricPanel"),
  { ssr: false }
);

const AnimationTimeline = dynamic(
  () => import("@/components/cad/AnimationTimeline"),
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
  const enterSketchMode = useCadStore((s) => s.enterSketchMode);
  const exitSketchMode = useCadStore((s) => s.exitSketchMode);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"basic" | "zookeeper">("zookeeper");
  const [parametricOpen, setParametricOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [showExtrudeDialog, setShowExtrudeDialog] = useState(false);
  const [showRevolveDialog, setShowRevolveDialog] = useState(false);
  const [rightTab, setRightTab] = useState<"properties" | "components">("properties");

  const sketchTools = ["line", "arc", "circle", "rectangle", "polygon", "spline", "ellipse", "construction_line"];
  const isSketchMode = sketchTools.includes(activeTool) || !!sketchPlane;

  const handleCloseOperation = useCallback(() => {
    setActiveOperation(null);
  }, [setActiveOperation]);

  const handleExtrude = useCallback(() => setShowExtrudeDialog(true), []);
  const handleRevolve = useCallback(() => setShowRevolveDialog(true), []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Ribbon Toolbar (top) */}
      <RibbonToolbar onExtrude={handleExtrude} onRevolve={handleRevolve} />

      {/* Main workspace area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Feature Tree (left - collapsible) */}
        <FeatureTree />

        {/* Center: 3D Viewport - HERO element, takes all remaining space */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 relative min-w-0" ref={viewportRef}>
            <ViewportErrorBoundary>
              <Viewport3D />
            </ViewportErrorBoundary>

            {/* Professional sketch overlay (crosshair, dimensions, snap, dynamic input) */}
            <ViewportErrorBoundary fallback={null}>
              <SketchOverlay containerRef={viewportRef} />
            </ViewportErrorBoundary>

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
              {sketchPlane && (
                <span className="text-[10px] bg-[#1a1a2e]/90 border border-[#00D4FF]/30 rounded px-2 py-0.5 text-[#00D4FF]/80 backdrop-blur-sm">
                  Sketch Mode - {sketchPlane.toUpperCase()} Plane
                </span>
              )}
            </div>

            {/* Sketch plane selector - bottom left */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1 z-10 pointer-events-auto">
              {!sketchPlane ? (
                <>
                  <span className="text-[10px] text-slate-500 mr-1">Sketch:</span>
                  {(["xy", "xz", "yz"] as const).map((plane) => {
                    const colors: Record<string, string> = {
                      xy: "#4444ff",
                      xz: "#44ff44",
                      yz: "#ff4444",
                    };
                    return (
                      <button
                        key={plane}
                        onClick={() => enterSketchMode(plane)}
                        className="text-[10px] px-2 py-0.5 rounded border border-[#16213e] text-slate-400 bg-[#1a1a2e]/80 hover:text-white transition-all duration-150 backdrop-blur-sm hover:scale-105"
                        style={{ borderColor: undefined }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.borderColor = colors[plane] + "66";
                          (e.target as HTMLElement).style.color = colors[plane];
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.borderColor = "";
                          (e.target as HTMLElement).style.color = "";
                        }}
                      >
                        {plane.toUpperCase()}
                      </button>
                    );
                  })}
                </>
              ) : (
                <button
                  onClick={exitSketchMode}
                  className="text-[10px] px-4 py-1.5 rounded-md border border-red-500/50 text-red-400 bg-red-500/15 hover:bg-red-500/30 transition-all duration-150 backdrop-blur-sm font-medium flex items-center gap-1.5 shadow-lg shadow-red-500/10"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Exit Sketch
                </button>
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

            {/* Parametric Panel */}
            {parametricOpen && <ParametricPanel onClose={() => setParametricOpen(false)} />}

            {/* AI + Parametric toggle buttons - top right */}
            {!measureResult && (
              <div className="absolute top-2 right-2 flex items-center gap-1 z-10 pointer-events-auto">
                <button onClick={() => setParametricOpen(!parametricOpen)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${parametricOpen ? "bg-green-600 text-white" : "text-slate-400 hover:text-white bg-[#1a1a2e]/80 hover:bg-[#0f3460] border border-[#16213e] backdrop-blur-sm"}`}>
                  Param
                </button>
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
              <EdgeSelector mode={activeOperation} onClose={handleCloseOperation} />
            )}

            {(activeOperation === "shell" || activeOperation === "draft") && (
              <ShellDraftPanel mode={activeOperation} onClose={handleCloseOperation} />
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

            {/* Extrude Dialog */}
            {showExtrudeDialog && (
              <ExtrudeDialog onClose={() => setShowExtrudeDialog(false)} />
            )}

            {/* Revolve Dialog */}
            {showRevolveDialog && (
              <RevolveDialog onClose={() => setShowRevolveDialog(false)} />
            )}

            {/* History Timeline (floating, bottom right) */}
            <HistoryTimeline />
          </div>

          {/* Animation Timeline (bottom, toggleable) */}
          {timelineOpen && <AnimationTimeline onClose={() => setTimelineOpen(false)} />}
        </div>

        {/* Right Panel: Properties / Components - only shows when object selected or explicitly opened */}
        {selectedId && (
          <div className="flex flex-col border-l border-[#21262d] flex-shrink-0 w-64">
            <div className="flex border-b border-[#21262d] bg-[#161b22] flex-shrink-0">
              <button
                onClick={() => setRightTab("properties")}
                className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${rightTab === "properties" ? "text-[#00D4FF] border-b-2 border-[#00D4FF]" : "text-slate-500 hover:text-white"}`}
              >
                Properties
              </button>
              <button
                onClick={() => setRightTab("components")}
                className={`flex-1 py-1.5 text-[11px] font-medium transition-colors flex items-center justify-center gap-1 ${rightTab === "components" ? "text-[#00D4FF] border-b-2 border-[#00D4FF]" : "text-slate-500 hover:text-white"}`}
              >
                <Package size={11} /> Components
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {rightTab === "properties" ? (
                <PropertyPanel />
              ) : (
                <ComponentsPanel />
              )}
            </div>
          </div>
        )}

        {/* AI Chat Sidebar */}
        {aiOpen && aiMode === "basic" && <AIChatSidebar onClose={() => setAiOpen(false)} />}
        {aiOpen && aiMode === "zookeeper" && <AIChatAssistantEnhanced onClose={() => setAiOpen(false)} />}
      </div>

      {/* Timeline toggle + Command Bar */}
      <div className="flex items-center gap-2 px-3 py-0.5 bg-[#0d1117] border-t border-[#16213e]">
        <button onClick={() => setTimelineOpen(!timelineOpen)}
          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${timelineOpen ? "border-[#00D4FF]/40 text-[#00D4FF] bg-[#00D4FF]/10" : "border-[#16213e] text-slate-500 hover:text-slate-300"}`}>
          Timeline
        </button>
      </div>

      {/* Command Bar (bottom) */}
      <DesignerCommandBar />
    </div>
  );
}
