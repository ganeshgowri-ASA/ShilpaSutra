"use client";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useCadStore } from "@/stores/cad-store";
import { Package, LayoutGrid, Scissors, Scale, Eye, Maximize2, Grid3X3, Axis3D } from "lucide-react";

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
const ExtrudeDialog = dynamic(() => import("@/components/cad/ExtrudeDialog"), { ssr: false });
const RevolveDialog = dynamic(() => import("@/components/cad/RevolveDialog"), { ssr: false });
const ComponentsPanel = dynamic(() => import("@/components/cad/ComponentsPanel"), { ssr: false });
const ParametricPanel = dynamic(() => import("@/components/cad/ParametricPanel"), { ssr: false });
const AnimationTimeline = dynamic(() => import("@/components/cad/AnimationTimeline"), { ssr: false });
const ViewCube = dynamic(() => import("@/components/cad/ViewCube"), { ssr: false });
const MassPropertiesPanel = dynamic(() => import("@/components/cad/MassPropertiesPanel"), { ssr: false });
const SectionViewPanel = dynamic(() => import("@/components/cad/SectionViewPanel"), { ssr: false });

// View style types
type ViewStyle = "shaded" | "wireframe" | "shaded_edges" | "xray";
type ViewLayout = "single" | "quad";

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

  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"basic" | "zookeeper">("zookeeper");
  const [parametricOpen, setParametricOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [showExtrudeDialog, setShowExtrudeDialog] = useState(false);
  const [showRevolveDialog, setShowRevolveDialog] = useState(false);
  const [rightTab, setRightTab] = useState<"properties" | "components">("properties");

  // Professional viewport features
  const [viewStyle, setViewStyle] = useState<ViewStyle>("shaded");
  const [viewLayout, setViewLayout] = useState<ViewLayout>("single");
  const [showMassProps, setShowMassProps] = useState(false);
  const [showSectionView, setShowSectionView] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showOrigin, setShowOrigin] = useState(true);
  const [cameraRotation] = useState({ x: -25, y: 35, z: 0 });

  const sketchTools = ["line", "arc", "circle", "rectangle", "polygon", "spline", "ellipse", "construction_line"];
  const isSketchMode = sketchTools.includes(activeTool) || !!sketchPlane;

  const handleCloseOperation = useCallback(() => {
    setActiveOperation(null);
  }, [setActiveOperation]);

  const handleExtrude = useCallback(() => setShowExtrudeDialog(true), []);
  const handleRevolve = useCallback(() => setShowRevolveDialog(true), []);

  const viewStyles: { id: ViewStyle; label: string }[] = [
    { id: "shaded", label: "Shaded" },
    { id: "wireframe", label: "Wire" },
    { id: "shaded_edges", label: "Edges" },
    { id: "xray", label: "X-Ray" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Ribbon Toolbar (top) */}
      <RibbonToolbar onExtrude={handleExtrude} onRevolve={handleRevolve} />

      {/* Main workspace area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Feature Tree (left - collapsible) */}
        <FeatureTree />

        {/* Center: 3D Viewport area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Professional Viewport Toolbar */}
          <div className="flex items-center gap-1 px-2 py-1 bg-[#161b22] border-b border-[#21262d] shrink-0">
            {/* Layout buttons */}
            <button
              onClick={() => setViewLayout(viewLayout === "single" ? "quad" : "single")}
              className={`p-1 rounded transition-colors ${viewLayout === "quad" ? "text-[#00D4FF] bg-[#00D4FF]/10" : "text-slate-500 hover:text-white hover:bg-[#21262d]"}`}
              title="Toggle Quad View"
            >
              <LayoutGrid size={14} />
            </button>

            <div className="w-px h-4 bg-[#21262d] mx-0.5" />

            {/* View style buttons */}
            {viewStyles.map((vs) => (
              <button
                key={vs.id}
                onClick={() => setViewStyle(vs.id)}
                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                  viewStyle === vs.id
                    ? "text-[#00D4FF] bg-[#00D4FF]/10"
                    : "text-slate-500 hover:text-white hover:bg-[#21262d]"
                }`}
              >
                {vs.label}
              </button>
            ))}

            <div className="w-px h-4 bg-[#21262d] mx-0.5" />

            {/* Toggle buttons */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-1 rounded transition-colors ${showGrid ? "text-[#00D4FF]" : "text-slate-500 hover:text-white"}`}
              title="Toggle Grid"
            >
              <Grid3X3 size={13} />
            </button>
            <button
              onClick={() => setShowOrigin(!showOrigin)}
              className={`p-1 rounded transition-colors ${showOrigin ? "text-[#00D4FF]" : "text-slate-500 hover:text-white"}`}
              title="Toggle Origin Axes"
            >
              <Axis3D size={13} />
            </button>
            <button
              onClick={() => setShowSectionView(!showSectionView)}
              className={`p-1 rounded transition-colors ${showSectionView ? "text-orange-400 bg-orange-400/10" : "text-slate-500 hover:text-white"}`}
              title="Section View"
            >
              <Scissors size={13} />
            </button>
            <button
              onClick={() => setShowMassProps(!showMassProps)}
              className={`p-1 rounded transition-colors ${showMassProps ? "text-green-400 bg-green-400/10" : "text-slate-500 hover:text-white"}`}
              title="Mass Properties"
            >
              <Scale size={13} />
            </button>

            <div className="flex-1" />

            {/* View style indicator */}
            <span className="text-[9px] text-slate-600 font-mono">
              {viewStyle.replace("_", "+").toUpperCase()} | {viewLayout.toUpperCase()}
            </span>
          </div>

          {/* Viewport Content */}
          <div className="flex-1 relative min-w-0">
            {viewLayout === "single" ? (
              /* Single viewport */
              <Viewport3D />
            ) : (
              /* Quad viewport layout */
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-[#21262d]">
                {[
                  { label: "Top (XY)", view: "top" },
                  { label: "Perspective", view: "iso" },
                  { label: "Front (XZ)", view: "front" },
                  { label: "Right (YZ)", view: "right" },
                ].map((vp, i) => (
                  <div key={vp.view} className="relative bg-[#0a0a1a]">
                    <div className="absolute top-1 left-1 z-10">
                      <span className="text-[9px] bg-[#1a1a2e]/90 text-slate-400 px-1.5 py-0.5 rounded border border-[#16213e]">
                        {vp.label}
                      </span>
                    </div>
                    {i === 1 ? (
                      <Viewport3D />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Eye size={20} className="text-slate-700 mx-auto mb-1" />
                          <div className="text-[10px] text-slate-600">{vp.label}</div>
                          <div className="text-[8px] text-slate-700 mt-0.5">Orthographic projection</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* View Cube - top right of viewport */}
            <ViewCube
              cameraRotation={cameraRotation}
              onViewChange={() => {}}
            />

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
              {viewStyle !== "shaded" && (
                <span className="text-[10px] bg-[#1a1a2e]/90 border border-purple-500/30 rounded px-2 py-0.5 text-purple-400 backdrop-blur-sm">
                  {viewStyle === "wireframe" ? "Wireframe" : viewStyle === "xray" ? "X-Ray" : "Shaded + Edges"}
                </span>
              )}
            </div>

            {/* Sketch plane selector - bottom left */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1 z-10 pointer-events-auto">
              {!sketchPlane ? (
                <>
                  <span className="text-[10px] text-slate-500 mr-1">Sketch:</span>
                  {(["xy", "xz", "yz"] as const).map((plane) => (
                    <button
                      key={plane}
                      onClick={() => enterSketchMode(plane)}
                      className="text-[10px] px-2 py-0.5 rounded border border-[#16213e] text-slate-400 bg-[#1a1a2e]/80 hover:border-[#00D4FF]/40 hover:text-[#00D4FF] transition-colors backdrop-blur-sm"
                    >
                      {plane.toUpperCase()}
                    </button>
                  ))}
                </>
              ) : (
                <button
                  onClick={exitSketchMode}
                  className="text-[10px] px-3 py-1 rounded border border-red-500/40 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors backdrop-blur-sm"
                >
                  Exit Sketch
                </button>
              )}
            </div>

            {/* Measurement overlay - top right (below ViewCube) */}
            {measureResult && (
              <div className="absolute top-28 right-2 bg-[#1a1a2e]/95 border border-yellow-500/40 rounded-lg p-3 pointer-events-auto z-10 backdrop-blur-sm">
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

            {/* Mass Properties Panel */}
            <MassPropertiesPanel
              isOpen={showMassProps}
              onClose={() => setShowMassProps(false)}
            />

            {/* Section View Panel */}
            <SectionViewPanel
              isOpen={showSectionView}
              onClose={() => setShowSectionView(false)}
              onSectionChange={() => {}}
            />

            {/* AI + Parametric toggle buttons - below ViewCube area */}
            {!measureResult && (
              <div className="absolute top-28 right-4 flex items-center gap-1 z-10 pointer-events-auto">
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

        {/* Right Panel: Properties / Components */}
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
              {rightTab === "properties" ? <PropertyPanel /> : <ComponentsPanel />}
            </div>
          </div>
        )}

        {/* AI Chat Sidebar */}
        {aiOpen && aiMode === "basic" && <AIChatSidebar onClose={() => setAiOpen(false)} />}
        {aiOpen && aiMode === "zookeeper" && <AIChatAssistantEnhanced onClose={() => setAiOpen(false)} />}
      </div>

      {/* Timeline toggle + status bar */}
      <div className="flex items-center gap-2 px-3 py-0.5 bg-[#0d1117] border-t border-[#16213e]">
        <button onClick={() => setTimelineOpen(!timelineOpen)}
          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${timelineOpen ? "border-[#00D4FF]/40 text-[#00D4FF] bg-[#00D4FF]/10" : "border-[#16213e] text-slate-500 hover:text-slate-300"}`}>
          Timeline
        </button>
        <div className="w-px h-3 bg-[#21262d]" />
        <span className="text-[9px] text-slate-600">
          View: {viewStyle.replace("_", "+").toUpperCase()}
        </span>
        <span className="text-[9px] text-slate-600">|</span>
        <span className="text-[9px] text-slate-600">
          Grid: {showGrid ? "ON" : "OFF"}
        </span>
        <span className="text-[9px] text-slate-600">|</span>
        <span className="text-[9px] text-slate-600">
          Unit: {unit}
        </span>
        {showSectionView && (
          <>
            <span className="text-[9px] text-slate-600">|</span>
            <span className="text-[9px] text-orange-400">Section Active</span>
          </>
        )}
        <div className="flex-1" />
        <span className="text-[9px] text-slate-600">ShilpaSutra CAD Engine v2.0</span>
      </div>

      {/* Command Bar (bottom) */}
      <DesignerCommandBar />
    </div>
  );
}
