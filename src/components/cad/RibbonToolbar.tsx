"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useCadStore,
  type RibbonTab,
  type ToolId,
} from "@/stores/cad-store";
import { useRouter } from "next/navigation";
import {
  MousePointer2, Pencil, Square, Circle, Spline, Triangle,
  Ruler, Lock, Box, Cylinder, RotateCw, Layers,
  Combine, Minus, Merge, Grid3X3, RotateCcw,
  Scissors, Pentagon, Shell, FlipHorizontal, Move, RotateCw as RotateIcon,
  Scale, ArrowRight, CircleDot, Eye, EyeOff,
  RulerIcon, Crosshair, ScanLine, Weight,
  MonitorSmartphone, Maximize2, Sun, Moon, Grid2X2, Axis3D,
  MessageSquare, Wand2, Zap, HelpCircle,
  Undo2, Redo2, ChevronDown, ChevronUp,
  Activity, Wind,
} from "lucide-react";

interface ToolButton {
  id: ToolId | string;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  action?: () => void;
}

const ICON_SIZE = 18;

const sketchTools: ToolButton[] = [
  { id: "select", icon: <MousePointer2 size={ICON_SIZE} />, label: "Select", shortcut: "Esc" },
  { id: "line", icon: <Pencil size={ICON_SIZE} />, label: "Line", shortcut: "L" },
  { id: "rectangle", icon: <Square size={ICON_SIZE} />, label: "Rectangle", shortcut: "R" },
  { id: "circle", icon: <Circle size={ICON_SIZE} />, label: "Circle", shortcut: "C" },
  { id: "arc", icon: <Spline size={ICON_SIZE} />, label: "Arc", shortcut: "A" },
  { id: "polygon", icon: <Pentagon size={ICON_SIZE} />, label: "Polygon" },
  { id: "spline", icon: <Spline size={ICON_SIZE} />, label: "Spline" },
  { id: "measure", icon: <Ruler size={ICON_SIZE} />, label: "Dimension", shortcut: "D" },
];

const solidTools: ToolButton[] = [
  { id: "box", icon: <Box size={ICON_SIZE} />, label: "Box", shortcut: "B" },
  { id: "cylinder", icon: <Cylinder size={ICON_SIZE} />, label: "Cylinder" },
  { id: "sphere", icon: <CircleDot size={ICON_SIZE} />, label: "Sphere" },
  { id: "cone", icon: <Triangle size={ICON_SIZE} />, label: "Cone" },
  { id: "extrude", icon: <Layers size={ICON_SIZE} />, label: "Extrude", shortcut: "E" },
  { id: "revolve", icon: <RotateCw size={ICON_SIZE} />, label: "Revolve" },
  { id: "loft", icon: <Layers size={ICON_SIZE} />, label: "Loft" },
  { id: "sweep", icon: <ArrowRight size={ICON_SIZE} />, label: "Sweep" },
  { id: "boolean_union", icon: <Combine size={ICON_SIZE} />, label: "Union" },
  { id: "boolean_subtract", icon: <Minus size={ICON_SIZE} />, label: "Subtract" },
  { id: "boolean_intersect", icon: <Merge size={ICON_SIZE} />, label: "Intersect" },
  { id: "linear_pattern", icon: <Grid3X3 size={ICON_SIZE} />, label: "Linear Pat." },
  { id: "circular_pattern", icon: <RotateCcw size={ICON_SIZE} />, label: "Circular Pat." },
];

const modifyTools: ToolButton[] = [
  { id: "fillet", icon: <Spline size={ICON_SIZE} />, label: "Fillet", shortcut: "F" },
  { id: "chamfer", icon: <Scissors size={ICON_SIZE} />, label: "Chamfer" },
  { id: "shell", icon: <Shell size={ICON_SIZE} />, label: "Shell" },
  { id: "draft", icon: <Triangle size={ICON_SIZE} />, label: "Draft" },
  { id: "mirror", icon: <FlipHorizontal size={ICON_SIZE} />, label: "Mirror" },
  { id: "scale_tool", icon: <Scale size={ICON_SIZE} />, label: "Scale", shortcut: "S" },
  { id: "move_tool", icon: <Move size={ICON_SIZE} />, label: "Move", shortcut: "W" },
  { id: "rotate_tool", icon: <RotateIcon size={ICON_SIZE} />, label: "Rotate", shortcut: "R" },
];

const OPERATION_TOOLS = ["fillet", "chamfer", "shell", "draft", "mirror", "linear_pattern", "circular_pattern"];
const BOOLEAN_TOOLS = ["boolean_union", "boolean_subtract", "boolean_intersect"];

const inspectTools: ToolButton[] = [
  { id: "measure", icon: <RulerIcon size={ICON_SIZE} />, label: "Distance", shortcut: "M" },
  { id: "measure_angle", icon: <Crosshair size={ICON_SIZE} />, label: "Angle" },
  { id: "section_view", icon: <ScanLine size={ICON_SIZE} />, label: "Section" },
  { id: "mass_properties", icon: <Weight size={ICON_SIZE} />, label: "Mass Props" },
];

const aiTools: ToolButton[] = [
  { id: "ai_text_to_cad", icon: <MessageSquare size={ICON_SIZE} />, label: "Text to CAD" },
  { id: "ai_suggest", icon: <Wand2 size={ICON_SIZE} />, label: "Suggest Fix" },
  { id: "ai_optimize", icon: <Zap size={ICON_SIZE} />, label: "Optimize" },
  { id: "ai_explain", icon: <HelpCircle size={ICON_SIZE} />, label: "Explain" },
  { id: "ai_fea", icon: <Activity size={ICON_SIZE} />, label: "Analyze Stress" },
  { id: "ai_cfd", icon: <Wind size={ICON_SIZE} />, label: "Analyze Flow" },
];

const tabs: { id: RibbonTab; label: string }[] = [
  { id: "sketch", label: "Sketch" },
  { id: "solid", label: "Solid" },
  { id: "modify", label: "Modify" },
  { id: "inspect", label: "Inspect" },
  { id: "view", label: "View" },
  { id: "ai", label: "AI" },
];

function getToolsForTab(tab: RibbonTab): ToolButton[] {
  switch (tab) {
    case "sketch": return sketchTools;
    case "solid": return solidTools;
    case "modify": return modifyTools;
    case "inspect": return inspectTools;
    case "ai": return aiTools;
    default: return [];
  }
}

const cameraViews = [
  { label: "Front", shortcut: "1" },
  { label: "Back", shortcut: "" },
  { label: "Left", shortcut: "" },
  { label: "Right", shortcut: "3" },
  { label: "Top", shortcut: "7" },
  { label: "Bottom", shortcut: "" },
  { label: "Iso", shortcut: "0" },
];

export default function RibbonToolbar() {
  const router = useRouter();
  const saveProject = useCallback(() => {
    const state = useCadStore.getState();
    const data = {
      version: "1.0",
      app: "ShilpaSutra",
      created: Date.now(),
      objects: state.objects,
      sketches: [],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const d = new Date();
    a.download = `project-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}.shilpa`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const loadProject = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".shilpa,.json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.objects) {
            useCadStore.setState({ objects: data.objects });
          }
          alert(`Project loaded: ${(data.objects ?? []).length} objects`);
        } catch {
          alert("Invalid project file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const activeTab = useCadStore((s) => s.activeRibbonTab);
  const setActiveTab = useCadStore((s) => s.setActiveRibbonTab);
  const collapsed = useCadStore((s) => s.ribbonCollapsed);
  const setCollapsed = useCadStore((s) => s.setRibbonCollapsed);
  const activeTool = useCadStore((s) => s.activeTool);
  const setActiveTool = useCadStore((s) => s.setActiveTool);
  const undo = useCadStore((s) => s.undo);
  const redo = useCadStore((s) => s.redo);
  const undoStack = useCadStore((s) => s.undoStack);
  const redoStack = useCadStore((s) => s.redoStack);
  const viewMode = useCadStore((s) => s.viewMode);
  const setViewMode = useCadStore((s) => s.setViewMode);
  const showGrid = useCadStore((s) => s.showGrid);
  const setShowGrid = useCadStore((s) => s.setShowGrid);
  const showOrigin = useCadStore((s) => s.showOrigin);
  const setShowOrigin = useCadStore((s) => s.setShowOrigin);
  const setCameraView = useCadStore((s) => s.setCameraView);
  const perspectiveMode = useCadStore((s) => s.perspectiveMode);
  const setPerspectiveMode = useCadStore((s) => s.setPerspectiveMode);

  const setActiveOperation = useCadStore((s) => s.setActiveOperation);
  const booleanUnion = useCadStore((s) => s.booleanUnion);
  const booleanSubtract = useCadStore((s) => s.booleanSubtract);
  const booleanIntersect = useCadStore((s) => s.booleanIntersect);
  const selectedId = useCadStore((s) => s.selectedId);
  const selectedIds = useCadStore((s) => s.selectedIds);

  const handleToolClick = useCallback(
    (id: string) => {
      if (id === "delete") {
        useCadStore.getState().deleteSelected();
        return;
      }
      // Extrude/Revolve: open dialog
      if (id === "ai_fea") {
        router.push("/simulator?auto=true");
        return;
      }
      if (id === "ai_cfd") {
        router.push("/cfd?auto=true");
        return;
      }
      if (id === "extrude") {
        onExtrude?.();
        return;
      }
      if (id === "revolve") {
        onRevolve?.();
        return;
      }
      // Boolean CSG operations
      if (id === "boolean_union") {
        const ids = selectedIds.length >= 2 ? selectedIds : selectedId ? [selectedId] : [];
        if (ids.length >= 2) { booleanUnion(ids); }
        else { alert("Select 2 or more objects for Union"); }
        return;
      }
      if (id === "boolean_subtract") {
        const ids = selectedIds.length >= 2 ? selectedIds : selectedId ? [selectedId] : [];
        if (ids.length >= 2) { booleanSubtract(ids[0], ids[1]); }
        else { alert("Select 2 objects: target then tool (Ctrl+click)"); }
        return;
      }
      if (id === "boolean_intersect") {
        const ids = selectedIds.length >= 2 ? selectedIds : selectedId ? [selectedId] : [];
        if (ids.length >= 2) { booleanIntersect(ids); }
        else { alert("Select 2 or more objects for Intersect"); }
        return;
      }
      // Open operation dialogs for fillet/chamfer/shell/draft/mirror/patterns
      if (OPERATION_TOOLS.includes(id)) {
        setActiveOperation(id as "fillet" | "chamfer" | "shell" | "draft" | "mirror" | "linear_pattern" | "circular_pattern");
        return;
      }
      setActiveTool(id as ToolId);
    },
    [setActiveTool, setActiveOperation, booleanUnion, booleanSubtract, booleanIntersect, selectedId, selectedIds, onExtrude, onRevolve]
  );

  const handleTabDoubleClick = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  const currentTools = activeTab === "view" ? [] : getToolsForTab(activeTab);

  return (
    <div className="bg-[#16213e] border-b border-[#1a1a2e]/50 shrink-0 select-none">
      {/* Tab headers */}
      <div className="flex items-center bg-[#1a1a2e] px-2">
        {/* Undo/Redo quick access */}
        <div className="flex items-center gap-0.5 mr-3 pr-3 border-r border-[#16213e]">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            title="Undo (Ctrl+Z)"
            className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#0f3460] disabled:opacity-30 transition-colors"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Y)"
            className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#0f3460] disabled:opacity-30 transition-colors"
          >
            <Redo2 size={14} />
          </button>
        </div>

        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onDoubleClick={handleTabDoubleClick}
            className={`px-4 py-1.5 text-xs font-medium transition-colors relative ${
              activeTab === tab.id
                ? "text-[#00D4FF]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00D4FF]" />
            )}
          </button>
        ))}

        <div className="flex-1" />

        {/* Analysis + Project buttons */}
        <div className="flex items-center gap-1 mr-2">
          <button onClick={() => router.push("/simulator")}
            title="Send current model to FEA simulator"
            className="px-2 py-1 rounded text-[10px] font-semibold bg-green-700/30 hover:bg-green-700/60 text-green-400 border border-green-700/40 transition-colors">
            FEA
          </button>
          <button onClick={() => router.push("/cfd")}
            title="Send current model to CFD solver"
            className="px-2 py-1 rounded text-[10px] font-semibold bg-blue-700/30 hover:bg-blue-700/60 text-blue-400 border border-blue-700/40 transition-colors">
            CFD
          </button>
          <div className="w-px h-4 bg-[#21262d] mx-0.5" />
          <button onClick={saveProject} title="Save project as .shilpa file"
            className="px-2 py-1 rounded text-[10px] bg-[#21262d] hover:bg-[#30363d] text-slate-300 border border-[#30363d] transition-colors">
            Save
          </button>
          <button onClick={loadProject} title="Load .shilpa project file"
            className="px-2 py-1 rounded text-[10px] bg-[#21262d] hover:bg-[#30363d] text-slate-300 border border-[#30363d] transition-colors">
            Load
          </button>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-white"
          title={collapsed ? "Expand ribbon" : "Collapse ribbon"}
        >
          {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
      </div>

      {/* Tool buttons */}
      {!collapsed && (
        <div className="px-3 py-2 flex items-start gap-1 min-h-[64px]">
          {activeTab === "view" ? (
            /* View tab - special layout */
            <div className="flex items-start gap-4">
              {/* Camera views */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Camera</span>
                <div className="flex items-center gap-0.5">
                  {cameraViews.map((view) => (
                    <button
                      key={view.label}
                      onClick={() => setCameraView(view.label.toLowerCase())}
                      title={view.shortcut ? `${view.label} (${view.shortcut})` : view.label}
                      className="flex flex-col items-center justify-center w-[44px] h-[44px] rounded hover:bg-[#0f3460] transition-colors group"
                    >
                      <MonitorSmartphone size={16} className="text-slate-400 group-hover:text-white" />
                      <span className="text-[8px] text-slate-500 group-hover:text-slate-300 mt-0.5">{view.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-px h-12 bg-[#1a1a2e]" />

              {/* Display modes */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Display</span>
                <div className="flex items-center gap-0.5">
                  {(["wireframe", "shaded", "realistic"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} display mode`}
                      className={`flex flex-col items-center justify-center w-[52px] h-[44px] rounded transition-colors ${
                        viewMode === mode
                          ? "bg-[#00D4FF]/20 text-[#00D4FF]"
                          : "hover:bg-[#0f3460] text-slate-400"
                      }`}
                    >
                      {mode === "wireframe" ? <Grid2X2 size={16} /> : mode === "shaded" ? <Sun size={16} /> : <Moon size={16} />}
                      <span className="text-[8px] mt-0.5 capitalize">{mode}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-px h-12 bg-[#1a1a2e]" />

              {/* Toggles */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Toggles</span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    title="Toggle grid display (G)"
                    className={`flex flex-col items-center justify-center w-[44px] h-[44px] rounded transition-colors ${
                      showGrid ? "bg-[#00D4FF]/20 text-[#00D4FF]" : "hover:bg-[#0f3460] text-slate-400"
                    }`}
                  >
                    <Grid3X3 size={16} />
                    <span className="text-[8px] mt-0.5">Grid</span>
                  </button>
                  <button
                    onClick={() => setShowOrigin(!showOrigin)}
                    title="Toggle origin axes display"
                    className={`flex flex-col items-center justify-center w-[44px] h-[44px] rounded transition-colors ${
                      showOrigin ? "bg-[#00D4FF]/20 text-[#00D4FF]" : "hover:bg-[#0f3460] text-slate-400"
                    }`}
                  >
                    <Axis3D size={16} />
                    <span className="text-[8px] mt-0.5">Origin</span>
                  </button>
                  <button
                    onClick={() => setPerspectiveMode(!perspectiveMode)}
                    className={`flex flex-col items-center justify-center w-[52px] h-[44px] rounded transition-colors ${
                      !perspectiveMode ? "bg-[#00D4FF]/20 text-[#00D4FF]" : "hover:bg-[#0f3460] text-slate-400"
                    }`}
                    title="Toggle perspective/ortho (5)"
                  >
                    <Maximize2 size={16} />
                    <span className="text-[8px] mt-0.5">{perspectiveMode ? "Persp" : "Ortho"}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Standard tool buttons */
            currentTools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => tool.action ? tool.action() : handleToolClick(tool.id)}
                title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
                className={`flex flex-col items-center justify-center w-[48px] h-[52px] rounded transition-colors group ${
                  activeTool === tool.id
                    ? "bg-[#00D4FF]/20 text-[#00D4FF]"
                    : "hover:bg-[#0f3460] text-slate-400 hover:text-white"
                }`}
              >
                <div className="w-7 h-7 flex items-center justify-center">
                  {tool.icon}
                </div>
                <span className="text-[9px] mt-0.5 leading-none text-center whitespace-nowrap">
                  {tool.label}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
