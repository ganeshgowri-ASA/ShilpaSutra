"use client";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useCadStore } from "@/stores/cad-store";
import { Save, FolderOpen, FilePlus, Package } from "lucide-react";

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

const AnimationTimeline = dynamic(
  () => import("@/components/cad/AnimationTimeline"),
  { ssr: false }
);

const STORAGE_KEY = "shilpasutra_project";

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
  const objects = useCadStore((s) => s.objects);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"basic" | "zookeeper">("zookeeper");
  const [showExtrudeDialog, setShowExtrudeDialog] = useState(false);
  const [showRevolveDialog, setShowRevolveDialog] = useState(false);
  const [rightTab, setRightTab] = useState<"properties" | "components">("properties");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "loaded">("idle");

  const sketchTools = ["line", "arc", "circle", "rectangle", "polygon", "spline", "ellipse", "construction_line"];
  const isSketchMode = sketchTools.includes(activeTool) || !!sketchPlane;

  const handleCloseOperation = useCallback(() => {
    setActiveOperation(null);
  }, [setActiveOperation]);

  const handleExtrude = useCallback(() => setShowExtrudeDialog(true), []);
  const handleRevolve = useCallback(() => setShowRevolveDialog(true), []);

  // Project Save/Load
  const saveProject = useCallback(() => {
    try {
      const state = useCadStore.getState();
      const data = {
        version: "1.0",
        savedAt: new Date().toISOString(),
        objects: state.objects,
        featureHistory: state.featureHistory,
        unit: state.unit,
        viewMode: state.viewMode,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      console.error("Save failed:", e);
    }
  }, []);

  const loadProject = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { alert("No saved project found."); return; }
      const data = JSON.parse(raw);
      const store = useCadStore.getState();
      // Restore objects via addGeneratedObject equivalent
      if (data.objects && Array.isArray(data.objects)) {
        const VALID = ["box", "cylinder", "sphere", "cone", "mesh", "line", "arc", "circle", "rectangle"] as const;
        type VT = typeof VALID[number];
        data.objects.forEach((obj: Record<string, unknown>) => {
          const rawT = String(obj.type || "box");
          const safeType: VT = (VALID as readonly string[]).includes(rawT) ? rawT as VT : "box";
          store.addGeneratedObject({
            type: safeType,
            name: String(obj.name || "Loaded Object"),
            dimensions: (obj.dimensions as { width: number; height: number; depth: number }) || { width: 100, height: 100, depth: 100 },
            color: String(obj.color || "#00D4FF"),
          });
        });
      }
      setSaveStatus("loaded");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      console.error("Load failed:", e);
      alert("Failed to load project.");
    }
  }, []);

  const newProject = useCallback(() => {
    if (objects.length > 0 && !confirm("Start a new project? Unsaved changes will be lost.")) return;
    window.location.reload();
  }, [objects.length]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Project toolbar strip */}
      <div className="flex items-center gap-1 px-3 py-1 bg-[#0d1117] border-b border-[#21262d]/50 flex-shrink-0">
        <span className="text-[10px] text-slate-600 mr-2">Project:</span>
        <button onClick={newProject} title="New Project"
          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-[#21262d] text-slate-500 hover:text-white hover:border-[#30363d] transition-colors">
          <FilePlus size={11} /> New
        </button>
        <button onClick={saveProject} title="Save to localStorage"
          className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-colors ${saveStatus === "saved" ? "border-green-500/40 text-green-400" : "border-[#21262d] text-slate-500 hover:text-white hover:border-[#30363d]"}`}>
          <Save size={11} /> {saveStatus === "saved" ? "Saved!" : "Save"}
        </button>
        <button onClick={loadProject} title="Load from localStorage"
          className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-colors ${saveStatus === "loaded" ? "border-blue-500/40 text-blue-400" : "border-[#21262d] text-slate-500 hover:text-white hover:border-[#30363d]"}`}>
          <FolderOpen size={11} /> {saveStatus === "loaded" ? "Loaded!" : "Load"}
        </button>
        <span className="text-[10px] text-slate-700 ml-2">{objects.length} object{objects.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Ribbon Toolbar (top) */}
      <RibbonToolbar onExtrude={handleExtrude} onRevolve={handleRevolve} />

      {/* Main workspace area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Feature Tree (left 240px) */}
        <FeatureTree />

        {/* Center: Viewport + Animation Timeline */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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

            {/* Extrude Dialog */}
            {showExtrudeDialog && (
              <ExtrudeDialog onClose={() => { setShowExtrudeDialog(false); }} />
            )}

            {/* Revolve Dialog */}
            {showRevolveDialog && (
              <RevolveDialog onClose={() => { setShowRevolveDialog(false); }} />
            )}

            {/* History Timeline (floating, bottom right) */}
            <HistoryTimeline />
          </div>

          {/* Animation Timeline (bottom) */}
          <AnimationTimeline />
        </div>

        {/* Right Panel: Properties / Components tabs */}
        <div className="flex flex-col border-l border-[#21262d] flex-shrink-0 w-72">
          {/* Tab switcher */}
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

        {/* AI Chat Sidebar */}
        {aiOpen && aiMode === "basic" && <AIChatSidebar onClose={() => setAiOpen(false)} />}
        {aiOpen && aiMode === "zookeeper" && <AIChatAssistantEnhanced onClose={() => setAiOpen(false)} />}
      </div>

      {/* Command Bar (bottom 40px) */}
      <DesignerCommandBar />
    </div>
  );
}
