"use client";
import React, { useState, useCallback, useRef, useEffect, Component, type ErrorInfo, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useCadStore } from "@/stores/cad-store";
import { Package, History, Layers, RulerIcon, Settings2, Grid3X3, MessageSquare } from "lucide-react";
import type { SelectionFilterType } from "@/components/cad/SelectionFilter";

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

const RibbonToolbar = dynamic(() => import("@/components/cad/RibbonToolbar"), { ssr: false });
const FeatureTree = dynamic(() => import("@/components/cad/FeatureTree"), { ssr: false });
const PropertyPanel = dynamic(() => import("@/components/cad/PropertyPanel"), { ssr: false });
const DesignerCommandBar = dynamic(() => import("@/components/cad/DesignerCommandBar"), { ssr: false });
const AIChatSidebar = dynamic(() => import("@/components/AIChatSidebar"), { ssr: false });
const AIChatAssistantEnhanced = dynamic(() => import("@/components/AIChatAssistantEnhanced"), { ssr: false });
const EdgeSelector = dynamic(() => import("@/components/cad/EdgeSelector"), { ssr: false });
const ShellDraftPanel = dynamic(() => import("@/components/cad/ShellDraftPanel"), { ssr: false });
const PatternDialog = dynamic(() => import("@/components/cad/PatternDialog"), { ssr: false });
const HistoryTimeline = dynamic(() => import("@/components/cad/HistoryTimeline"), { ssr: false });
const SketchToolbar = dynamic(() => import("@/components/cad/SketchToolbar"), { ssr: false });
const SketchOverlay = dynamic(() => import("@/components/cad/SketchOverlay"), { ssr: false });
const ExtrudeDialog = dynamic(() => import("@/components/cad/ExtrudeDialog"), { ssr: false });
const RevolveDialog = dynamic(() => import("@/components/cad/RevolveDialog"), { ssr: false });
const ComponentsPanel = dynamic(() => import("@/components/cad/ComponentsPanel"), { ssr: false });
const ParametricPanel = dynamic(() => import("@/components/cad/ParametricPanel"), { ssr: false });
const MassPropertiesDialog = dynamic(() => import("@/components/cad/MassPropertiesDialog"), { ssr: false });
const AnimationTimeline = dynamic(() => import("@/components/cad/AnimationTimeline"), { ssr: false });

// New Phase 4 components
const NavigationCube = dynamic(() => import("@/components/cad/NavigationCube"), { ssr: false });
const SelectionFilter = dynamic(() => import("@/components/cad/SelectionFilter"), { ssr: false });
const UndoHistoryPanel = dynamic(() => import("@/components/cad/UndoHistoryPanel"), { ssr: false });
const HoleWizardDialog = dynamic(() => import("@/components/cad/HoleWizardDialog"), { ssr: false });
const ReferenceGeometryPanel = dynamic(() => import("@/components/cad/ReferenceGeometryPanel"), { ssr: false });
const ConfigurationManager = dynamic(() => import("@/components/cad/ConfigurationManager"), { ssr: false });
const AppearanceEditor = dynamic(() => import("@/components/cad/AppearanceEditor"), { ssr: false });
const SketchGrid = dynamic(() => import("@/components/cad/SketchGrid"), { ssr: false });
const LayerPanel = dynamic(() => import("@/components/cad/LayerPanel"), { ssr: false });
const DimensionTools = dynamic(() => import("@/components/cad/DimensionTools"), { ssr: false });
const SnapIndicatorOverlay = dynamic(() => import("@/components/cad/SnapIndicator"), { ssr: false });
const EntityPropertiesPanel = dynamic(() => import("@/components/cad/EntityPropertiesPanel"), { ssr: false });
const GridControls = dynamic(() => import("@/components/cad/GridControls"), { ssr: false });
const CoordinateInput = dynamic(() => import("@/components/cad/CoordinateInput"), { ssr: false });
const AIToolPanel = dynamic(() => import("@/components/cad/AIToolPanel"), { ssr: false });

type AIToolType = "ai_text_to_cad" | "ai_suggest" | "ai_optimize" | "ai_explain" | null;

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
  const [aiMode, setAiMode] = useState<"basic" | "enhanced">("enhanced");
  const [parametricOpen, setParametricOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [showExtrudeDialog, setShowExtrudeDialog] = useState(false);
  const [showRevolveDialog, setShowRevolveDialog] = useState(false);
  const [showMassProps, setShowMassProps] = useState(false);
  const [rightTab, setRightTab] = useState<"properties" | "components">("properties");

  // New Phase 4 state
  const [showUndoHistory, setShowUndoHistory] = useState(false);
  const [showHoleWizard, setShowHoleWizard] = useState(false);
  const [showRefGeometry, setShowRefGeometry] = useState(false);
  const [showConfigManager, setShowConfigManager] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [showDimensionTools, setShowDimensionTools] = useState(false);
  const [showEntityProps, setShowEntityProps] = useState(false);
  const [showGridControls, setShowGridControls] = useState(false);
  const [activeAITool, setActiveAITool] = useState<AIToolType>(null);
  const [selectionFilters, setSelectionFilters] = useState<Set<SelectionFilterType>>(
    () => new Set<SelectionFilterType>(["vertex", "edge", "face", "body", "component"])
  );

  const sketchTools = ["line", "polyline", "arc", "circle", "rectangle", "polygon", "spline", "ellipse", "construction_line",
    "arc_3point", "arc_tangent", "circle_3point", "center_rectangle", "slot", "point", "centerline",
    "hatch", "revision_cloud", "infinite_line", "multiline"];
  const isSketchMode = sketchTools.includes(activeTool) || !!sketchPlane;

  const handleCloseOperation = useCallback(() => {
    setActiveOperation(null);
  }, [setActiveOperation]);

  const handleExtrude = useCallback(() => setShowExtrudeDialog(true), []);
  const handleRevolve = useCallback(() => setShowRevolveDialog(true), []);
  const handleMassProps = useCallback(() => setShowMassProps(true), []);
  const handleRefGeometry = useCallback(() => setShowRefGeometry(true), []);
  const handleAppearance = useCallback(() => setShowAppearance(true), []);
  const handleConfigManager = useCallback(() => setShowConfigManager(true), []);
  const handleHoleWizard = useCallback(() => setShowHoleWizard(true), []);

  const handleAITool = useCallback((tool: "ai_text_to_cad" | "ai_suggest" | "ai_optimize" | "ai_explain") => {
    setActiveAITool((prev) => (prev === tool ? null : tool));
  }, []);

  // Keyboard shortcut: Ctrl+Shift+G to open Text-to-CAD inline
  // Also listen for AI tool events from context menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "G") {
        e.preventDefault();
        setActiveAITool((prev) => (prev === "ai_text_to_cad" ? null : "ai_text_to_cad"));
      }
    };
    const handleAIToolEvent = (e: Event) => {
      const tool = (e as CustomEvent).detail?.tool as AIToolType;
      if (tool) setActiveAITool(tool);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("shilpasutra:ai-tool", handleAIToolEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("shilpasutra:ai-tool", handleAIToolEvent);
    };
  }, []);

  const handleToggleFilter = useCallback((filter: SelectionFilterType) => {
    setSelectionFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Ribbon Toolbar (top) */}
      <RibbonToolbar
        onExtrude={handleExtrude}
        onRevolve={handleRevolve}
        onMassProps={handleMassProps}
        onRefGeometry={handleRefGeometry}
        onAppearance={handleAppearance}
        onConfigManager={handleConfigManager}
        onHoleWizard={handleHoleWizard}
        onAITool={handleAITool}
      />

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

            {/* Sketch Grid (SVG overlay for grid lines) */}
            <ViewportErrorBoundary fallback={null}>
              <SketchGrid width={1920} height={1080} />
            </ViewportErrorBoundary>

            {/* Professional sketch overlay (crosshair, dimensions, snap, dynamic input) */}
            <ViewportErrorBoundary fallback={null}>
              <SketchOverlay containerRef={viewportRef} />
            </ViewportErrorBoundary>

            {/* Snap indicator overlay with visual markers */}
            <ViewportErrorBoundary fallback={null}>
              <SnapIndicatorOverlay
                containerWidth={1920}
                containerHeight={1080}
                activeSnap={null}
              />
            </ViewportErrorBoundary>

            {/* Sketch Toolbar (floating, top center) */}
            <SketchToolbar visible={isSketchMode} />

            {/* Navigation Cube (top right) - only when not in sketch mode and no measure */}
            {!measureResult && !isSketchMode && (
              <NavigationCube />
            )}

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

            {/* Selection Filter (bottom left, above sketch plane selector) */}
            <SelectionFilter activeFilters={selectionFilters} onToggle={handleToggleFilter} />

            {/* Layer Panel (left side, floating) */}
            {showLayerPanel && (
              <div className="absolute top-14 left-3 z-20 pointer-events-auto animate-scale-in">
                <LayerPanel onClose={() => setShowLayerPanel(false)} />
              </div>
            )}

            {/* Layer & Dimension toggle buttons */}
            <div className="absolute bottom-14 left-3 z-10 pointer-events-auto flex items-center gap-1.5">
              <button
                onClick={() => setShowLayerPanel(!showLayerPanel)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-150 backdrop-blur-md shadow-panel ${
                  showLayerPanel
                    ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                    : "text-slate-400 hover:text-white bg-[#0d1117]/80 hover:bg-[#21262d] border border-[#21262d]"
                }`}
                title="Toggle Layers Panel"
              >
                <Layers size={12} />
                Layers
              </button>
              <button
                onClick={() => setShowDimensionTools(!showDimensionTools)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-150 backdrop-blur-md shadow-panel ${
                  showDimensionTools
                    ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                    : "text-slate-400 hover:text-white bg-[#0d1117]/80 hover:bg-[#21262d] border border-[#21262d]"
                }`}
                title="Toggle Dimension Tools"
              >
                <RulerIcon size={12} />
                Dims
              </button>
              <button
                onClick={() => setShowEntityProps(!showEntityProps)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-150 backdrop-blur-md shadow-panel ${
                  showEntityProps
                    ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                    : "text-slate-400 hover:text-white bg-[#0d1117]/80 hover:bg-[#21262d] border border-[#21262d]"
                }`}
                title="Toggle Entity Properties"
              >
                <Settings2 size={12} />
                Props
              </button>
              <button
                onClick={() => setShowGridControls(!showGridControls)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-150 backdrop-blur-md shadow-panel ${
                  showGridControls
                    ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                    : "text-slate-400 hover:text-white bg-[#0d1117]/80 hover:bg-[#21262d] border border-[#21262d]"
                }`}
                title="Toggle Grid Controls"
              >
                <Grid3X3 size={12} />
                Grid
              </button>
            </div>

            {/* Dimension Tools Panel */}
            {showDimensionTools && (
              <div className="absolute top-14 left-[310px] z-20 pointer-events-auto animate-scale-in">
                <DimensionTools onClose={() => setShowDimensionTools(false)} />
              </div>
            )}

            {/* Entity Properties Panel */}
            {showEntityProps && (
              <div className="absolute top-14 right-3 z-20 pointer-events-auto animate-scale-in">
                <EntityPropertiesPanel onClose={() => setShowEntityProps(false)} />
              </div>
            )}

            {/* Grid Controls Panel */}
            {showGridControls && (
              <div className="absolute bottom-28 left-3 z-20 pointer-events-auto animate-scale-in">
                <GridControls onClose={() => setShowGridControls(false)} />
              </div>
            )}

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

            {/* AI + Parametric + History toggle buttons - top right */}
            {!measureResult && isSketchMode && (
              <div className="absolute top-[72px] right-3 flex items-center gap-1 z-10 pointer-events-auto">
                <button onClick={() => setShowUndoHistory(!showUndoHistory)}
                  className={`p-1.5 rounded-md text-[10px] transition-all duration-150 backdrop-blur-md shadow-panel ${showUndoHistory ? "bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30" : "text-slate-400 hover:text-white bg-[#0d1117]/80 hover:bg-[#21262d] border border-[#21262d]"}`}
                  title="Undo History">
                  <History size={12} />
                </button>
              </div>
            )}

            {!measureResult && !isSketchMode && (
              <div className="absolute top-[92px] right-3 flex items-center gap-1 z-10 pointer-events-auto">
                <button onClick={() => setShowUndoHistory(!showUndoHistory)}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all duration-150 backdrop-blur-md shadow-panel ${showUndoHistory ? "bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30" : "text-slate-400 hover:text-white bg-[#0d1117]/80 hover:bg-[#21262d] border border-[#21262d]"}`}
                  title="Undo History">
                  Hist
                </button>
                <button onClick={() => setParametricOpen(!parametricOpen)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all duration-150 backdrop-blur-md shadow-panel ${parametricOpen ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-slate-400 hover:text-white bg-[#0d1117]/80 hover:bg-[#21262d] border border-[#21262d]"}`}>
                  Param
                </button>
                {aiOpen && (
                  <button
                    onClick={() => setAiMode(aiMode === "basic" ? "enhanced" : "basic")}
                    className={`text-[10px] px-2 py-1 rounded-md border font-medium transition-all duration-150 backdrop-blur-md ${
                      aiMode === "enhanced"
                        ? "border-purple-500/30 text-purple-400 bg-purple-500/10"
                        : "border-[#21262d] text-slate-500 bg-[#0d1117]/80"
                    }`}
                  >
                    {aiMode === "enhanced" ? "ShilpaSutra AI" : "Basic"}
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

            {/* Undo History Panel */}
            {showUndoHistory && (
              <UndoHistoryPanel onClose={() => setShowUndoHistory(false)} />
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

            {/* Hole Wizard Dialog */}
            {showHoleWizard && (
              <HoleWizardDialog onClose={() => setShowHoleWizard(false)} />
            )}

            {/* Reference Geometry Panel */}
            {showRefGeometry && (
              <ReferenceGeometryPanel onClose={() => setShowRefGeometry(false)} />
            )}

            {/* Configuration Manager */}
            {showConfigManager && (
              <ConfigurationManager onClose={() => setShowConfigManager(false)} />
            )}

            {/* Appearance Editor */}
            {showAppearance && (
              <AppearanceEditor onClose={() => setShowAppearance(false)} />
            )}

            {/* Quick Text-to-CAD button (floating, bottom right) */}
            {!activeAITool && !isSketchMode && (
              <button
                onClick={() => setActiveAITool("ai_text_to_cad")}
                title="Text to CAD (Ctrl+Shift+G)"
                className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600/90 hover:bg-purple-500 text-white text-[10px] font-medium shadow-lg shadow-purple-900/30 backdrop-blur-md transition-all duration-200 hover:shadow-purple-500/20 hover:scale-105 pointer-events-auto"
              >
                <MessageSquare size={12} />
                Text to CAD
              </button>
            )}

            {/* AI Tool Panel (floating, top center) */}
            {activeAITool && (
              <AIToolPanel toolType={activeAITool} onClose={() => setActiveAITool(null)} />
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
        {aiOpen && aiMode === "enhanced" && <AIChatAssistantEnhanced onClose={() => setAiOpen(false)} />}
      </div>

      {/* Timeline toggle + Coordinate Input + Command Bar */}
      <div className="flex items-center gap-2 px-3 py-1 bg-[#0d1117] border-t border-[#21262d]">
        <button onClick={() => setTimelineOpen(!timelineOpen)}
          className={`text-[9px] font-semibold px-2.5 py-0.5 rounded-md border transition-all duration-150 ${timelineOpen ? "border-[#00D4FF]/30 text-[#00D4FF] bg-[#00D4FF]/10" : "border-[#21262d] text-slate-500 hover:text-slate-300 hover:border-[#30363d]"}`}>
          Timeline
        </button>
        <div className="h-3 w-px bg-[#21262d]" />
        <CoordinateInput />
      </div>

      {/* Command Bar (bottom) */}
      <DesignerCommandBar />
    </div>
  );
}
