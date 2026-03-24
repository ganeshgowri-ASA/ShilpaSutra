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

const MassPropertiesDialog = dynamic(
  () => import("@/components/cad/MassPropertiesDialog"),
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
  const [showMassProps, setShowMassProps] = useState(false);
  const [rightTab, setRightTab] = useState<"properties" | "components">("properties");

  const sketchTools = ["line", "arc", "circle", "rectangle", "polygon", "spline", "ellipse", "construction_line"];
  const isSketchMode = sketchTools.includes(activeTool) || !!sketchPlane;

  const handleCloseOperation = useCallback(() => {
    setActiveOperation(null);
  }, [setActiveOperation]);

  const handleExtrude = useCallback(() => setShowExtrudeDialog(true), []);
  const handleRevolve = useCallback(() => setShowRevolveDialog(true), []);
  const handleMassProps = useCallback(() => setShowMassProps(true), []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Ribbon Toolbar (top) */}
      <RibbonToolbar onExtrude={handleExtrude} onRevolve={handleRevolve} onMassProps={handleMassProps} />

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

            {/* Status overlay - top left (below sketch toolbar area) */}
            <div className={`absolute left-3 flex items-center gap-1.5 pointer-events-none z-[5] ${isSketchMode ? "top-[72px]" : "top-3"}`}>
              {!isSketchMode && (
                <span
                  className="text-[9px] font-medium bg-[#0d1117]/75 border border-[#1a2233] rounded px-2 py-0.5 backdrop-blur-sm text-slate-500"
                >
                  {activeTool === "select" ? "Select" : activeTool.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              )}
              {selectedId && (
                <span className="text-[9px] font-medium bg-[#0d1117]/75 border border-[#00D4FF]/15 rounded px-2 py-0.5 text-[#7dc4e0] backdrop-blur-sm">
                  Selected
                </span>
              )}
              {sketchPlane && (
                <span className="text-[9px] font-medium bg-[#0d1117]/75 border border-[#00D4FF]/15 rounded px-2 py-0.5 text-[#7dc4e0]/70 backdrop-blur-sm">
                  Sketch: {sketchPlane.toUpperCase()}
                </span>
              )}
            </div>

            {/* Sketch plane selector - bottom left */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 z-10 pointer-events-auto">
              {!sketchPlane ? (
                <div className="flex items-center gap-1 bg-[#0d1117]/80 backdrop-blur-md rounded-lg p-1 border border-[#21262d] shadow-panel">
                  <span className="text-[9px] text-slate-600 font-semibold uppercase tracking-wider px-1.5">Sketch</span>
                  {(["xy", "xz", "yz"] as const).map((plane) => {
                    const colors: Record<string, string> = {
                      xy: "#6366f1",
                      xz: "#22c55e",
                      yz: "#ef4444",
                    };
                    return (
                      <button
                        key={plane}
                        onClick={() => enterSketchMode(plane)}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-md text-slate-400 hover:text-white transition-all duration-150"
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = colors[plane] + "20";
                          (e.target as HTMLElement).style.color = colors[plane];
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = "";
                          (e.target as HTMLElement).style.color = "";
                        }}
                      >
                        {plane.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <button
                  onClick={exitSketchMode}
                  className="text-[10px] px-5 py-1.5 rounded-full border border-red-500/20 text-red-400/90 bg-[#0d1117]/80 hover:bg-red-500/10 hover:border-red-500/35 transition-all duration-200 backdrop-blur-md font-medium flex items-center gap-2 shadow-[0_0_12px_rgba(239,68,68,0.08)]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500/70 animate-pulse" />
                  Exit Sketch
                </button>
              )}
            </div>

            {/* Measurement overlay - top right */}
            {measureResult && (
              <div className="absolute top-3 right-3 bg-[#0d1117]/90 border border-yellow-500/30 rounded-xl p-3.5 pointer-events-auto z-10 backdrop-blur-md shadow-2xl shadow-black/30 animate-scale-in">
                <div className="text-[9px] text-yellow-500 font-bold mb-1.5 uppercase tracking-wider">Measurement</div>
                <div className="text-xs text-white font-mono">
                  Distance: <span className="text-yellow-300 font-bold">{measureResult.distance} {unit}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-1.5 space-x-2">
                  <span>dX: <span className="text-slate-300">{measureResult.dx}</span></span>
                  <span>dY: <span className="text-slate-300">{measureResult.dy}</span></span>
                  <span>dZ: <span className="text-slate-300">{measureResult.dz}</span></span>
                </div>
                <button
                  onClick={clearMeasure}
                  className="mt-2.5 text-[10px] text-slate-500 hover:text-white transition-colors px-2 py-0.5 rounded-md hover:bg-[#21262d]"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Parametric Panel */}
            {parametricOpen && <ParametricPanel onClose={() => setParametricOpen(false)} />}

            {/* AI + Parametric toggle buttons - top right */}
            {!measureResult && (
              <div className="absolute top-3 right-3 flex items-center gap-1 z-10 pointer-events-auto">
                <button onClick={() => setParametricOpen(!parametricOpen)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all duration-150 backdrop-blur-md shadow-panel ${parametricOpen ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-slate-400 hover:text-white bg-[#0d1117]/80 hover:bg-[#21262d] border border-[#21262d]"}`}>
                  Param
                </button>
                {aiOpen && (
                  <button
                    onClick={() => setAiMode(aiMode === "basic" ? "zookeeper" : "basic")}
                    className={`text-[10px] px-2 py-1 rounded-md border font-medium transition-all duration-150 backdrop-blur-md ${
                      aiMode === "zookeeper"
                        ? "border-purple-500/30 text-purple-400 bg-purple-500/10"
                        : "border-[#21262d] text-slate-500 bg-[#0d1117]/80"
                    }`}
                  >
                    {aiMode === "zookeeper" ? "Zookeeper" : "Basic"}
                  </button>
                )}
                <button
                  onClick={() => setAiOpen(!aiOpen)}
                  className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all duration-150 backdrop-blur-md shadow-panel ${
                    aiOpen
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                      : "text-slate-400 hover:text-white bg-[#0d1117]/80 hover:bg-[#21262d] border border-[#21262d]"
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

            {/* Mass Properties Dialog */}
            {showMassProps && (
              <MassPropertiesDialog onClose={() => setShowMassProps(false)} />
            )}

            {/* History Timeline (floating, bottom right) */}
            <HistoryTimeline />
          </div>

          {/* Animation Timeline (bottom, toggleable) */}
          {timelineOpen && <AnimationTimeline onClose={() => setTimelineOpen(false)} />}
        </div>

        {/* Right Panel: Properties / Components - only shows when object selected or explicitly opened */}
        {selectedId && (
          <div className="flex flex-col border-l border-[#21262d] flex-shrink-0 w-64 animate-slide-in-right">
            <div className="flex border-b border-[#21262d] bg-[#0d1117] flex-shrink-0">
              <button
                onClick={() => setRightTab("properties")}
                className={`flex-1 py-2 text-[11px] font-semibold tracking-wide transition-all duration-150 relative ${rightTab === "properties" ? "text-[#00D4FF]" : "text-slate-500 hover:text-white"}`}
              >
                Properties
                {rightTab === "properties" && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#00D4FF] rounded-full" />}
              </button>
              <button
                onClick={() => setRightTab("components")}
                className={`flex-1 py-2 text-[11px] font-semibold tracking-wide transition-all duration-150 flex items-center justify-center gap-1 relative ${rightTab === "components" ? "text-[#00D4FF]" : "text-slate-500 hover:text-white"}`}
              >
                <Package size={11} /> Components
                {rightTab === "components" && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#00D4FF] rounded-full" />}
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
      <div className="flex items-center gap-2 px-3 py-1 bg-[#0d1117] border-t border-[#21262d]">
        <button onClick={() => setTimelineOpen(!timelineOpen)}
          className={`text-[9px] font-semibold px-2.5 py-0.5 rounded-md border transition-all duration-150 ${timelineOpen ? "border-[#00D4FF]/30 text-[#00D4FF] bg-[#00D4FF]/10" : "border-[#21262d] text-slate-500 hover:text-slate-300 hover:border-[#30363d]"}`}>
          Timeline
        </button>
      </div>

      {/* Command Bar (bottom) */}
      <DesignerCommandBar />
    </div>
  );
}
