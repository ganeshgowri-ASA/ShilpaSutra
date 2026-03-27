"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  useCadStore,
  type RibbonTab,
  type ToolId,
} from "@/stores/cad-store";
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
  HardDrive, History, Trash2, X, Download,
} from "lucide-react";
import { saveSnapshot, MAIN_BRANCH, type VersionEntry } from "@/lib/version-control";

const ExportPanel = dynamic(() => import("@/components/cad/ExportPanel"), { ssr: false });
const VersionHistory = dynamic(() => import("@/components/VersionHistory"), { ssr: false });
const VersionCompare = dynamic(() => import("@/components/VersionCompare"), { ssr: false });

// ── localStorage Save/Load Drawings ─────────────────────────────────────
const DRAWINGS_KEY = "shilpasutra_saved_drawings";

interface SavedDrawing {
  id: string;
  name: string;
  timestamp: number;
  objectCount: number;
  objects: unknown[];
}

function getSavedDrawings(): SavedDrawing[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DRAWINGS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveDrawingToStorage(name: string): SavedDrawing {
  const state = useCadStore.getState();
  const drawings = getSavedDrawings();
  const entry: SavedDrawing = {
    id: crypto.randomUUID(),
    name,
    timestamp: Date.now(),
    objectCount: state.objects.length,
    objects: state.objects,
  };
  drawings.unshift(entry);
  localStorage.setItem(DRAWINGS_KEY, JSON.stringify(drawings));
  return entry;
}

function loadDrawingFromStorage(id: string): boolean {
  const drawings = getSavedDrawings();
  const drawing = drawings.find((d) => d.id === id);
  if (!drawing) return false;
  useCadStore.setState({ objects: drawing.objects as ReturnType<typeof useCadStore.getState>["objects"] });
  return true;
}

function deleteDrawingFromStorage(id: string) {
  const drawings = getSavedDrawings().filter((d) => d.id !== id);
  localStorage.setItem(DRAWINGS_KEY, JSON.stringify(drawings));
}

interface ToolButton {
  id: ToolId | string;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  action?: () => void;
}

const ICON_SIZE = 16;

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
  { id: "extrude_cut", icon: <Layers size={ICON_SIZE} />, label: "Ext.Cut" },
  { id: "revolve", icon: <RotateCw size={ICON_SIZE} />, label: "Revolve" },
  { id: "revolve_cut", icon: <RotateCw size={ICON_SIZE} />, label: "Rev.Cut" },
  { id: "loft", icon: <Layers size={ICON_SIZE} />, label: "Loft" },
  { id: "sweep", icon: <ArrowRight size={ICON_SIZE} />, label: "Sweep" },
  { id: "hole_wizard", icon: <CircleDot size={ICON_SIZE} />, label: "Hole Wiz" },
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
  { id: "interference_check", icon: <Crosshair size={ICON_SIZE} />, label: "Interfer." },
  { id: "ref_geometry", icon: <Axis3D size={ICON_SIZE} />, label: "Ref.Geo" },
  { id: "appearance_editor", icon: <Sun size={ICON_SIZE} />, label: "Appear." },
  { id: "config_manager", icon: <Layers size={ICON_SIZE} />, label: "Config" },
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
  { id: "constraints", label: "Constraints" },
];

const constraintTools: ToolButton[] = [
  { id: "select", icon: <MousePointer2 size={ICON_SIZE} />, label: "Select", shortcut: "Esc" },
  { id: "measure", icon: <Ruler size={ICON_SIZE} />, label: "Dimension" },
  { id: "select", icon: <Lock size={ICON_SIZE} />, label: "Fix" },
  { id: "select", icon: <Minus size={ICON_SIZE} />, label: "Horizontal" },
  { id: "select", icon: <ArrowRight size={ICON_SIZE} />, label: "Vertical" },
  { id: "select", icon: <Grid3X3 size={ICON_SIZE} />, label: "Parallel" },
  { id: "select", icon: <Crosshair size={ICON_SIZE} />, label: "Perpend." },
  { id: "select", icon: <CircleDot size={ICON_SIZE} />, label: "Coincident" },
  { id: "select", icon: <Combine size={ICON_SIZE} />, label: "Equal" },
  { id: "select", icon: <FlipHorizontal size={ICON_SIZE} />, label: "Symmetric" },
];

function getToolsForTab(tab: RibbonTab): ToolButton[] {
  switch (tab) {
    case "sketch": return sketchTools;
    case "solid": return solidTools;
    case "modify": return modifyTools;
    case "inspect": return inspectTools;
    case "ai": return aiTools;
    case "constraints": return constraintTools;
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

export default function RibbonToolbar({ onExtrude, onRevolve, onMassProps, onRefGeometry, onAppearance, onConfigManager, onHoleWizard, onAITool }: { onExtrude?: () => void; onRevolve?: () => void; onMassProps?: () => void; onRefGeometry?: () => void; onAppearance?: () => void; onConfigManager?: () => void; onHoleWizard?: () => void; onAITool?: (tool: "ai_text_to_cad" | "ai_suggest" | "ai_optimize" | "ai_explain" | "ai_fea" | "ai_cfd") => void } = {}) {
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

  const addObject = useCadStore((s) => s.addObject);

  // ── localStorage Save/Load state ──
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [compareVersions, setCompareVersions] = useState<[VersionEntry, VersionEntry] | null>(null);
  const [saveName, setSaveName] = useState("");
  const [savedDrawings, setSavedDrawings] = useState<SavedDrawing[]>([]);

  const openSaveModal = useCallback(() => {
    const d = new Date();
    setSaveName(`Drawing ${d.toLocaleDateString()} ${d.toLocaleTimeString()}`);
    setShowSaveModal(true);
  }, []);

  const openLoadModal = useCallback(() => {
    setSavedDrawings(getSavedDrawings());
    setShowLoadModal(true);
  }, []);

  const handleSaveDrawing = useCallback(() => {
    if (!saveName.trim()) return;
    const state = useCadStore.getState();
    saveDrawingToStorage(saveName.trim());
    saveSnapshot(state.objects as Parameters<typeof saveSnapshot>[0], saveName.trim(), MAIN_BRANCH)
      .catch((e) => console.warn("[VersionControl] snapshot failed:", e));
    setShowSaveModal(false);
  }, [saveName]);

  const handleLoadDrawing = useCallback((id: string) => {
    loadDrawingFromStorage(id);
    setShowLoadModal(false);
  }, []);

  const handleDeleteDrawing = useCallback((id: string) => {
    deleteDrawingFromStorage(id);
    setSavedDrawings(getSavedDrawings());
  }, []);

  const handleToolClick = useCallback(
    (id: string) => {
      if (id === "delete") {
        useCadStore.getState().deleteSelected();
        return;
      }
      // Primitive shapes: create immediately at origin and select
      const primitiveTypes: Record<string, "box" | "cylinder" | "sphere" | "cone"> = {
        box: "box", cylinder: "cylinder", sphere: "sphere", cone: "cone",
      };
      if (primitiveTypes[id]) {
        const newId = addObject(primitiveTypes[id]);
        const store = useCadStore.getState();
        const obj = store.objects.find((o) => o.id === newId);
        if (obj) {
          store.updateObject(newId, {
            position: [0, obj.dimensions.height / 2, 0],
          });
        }
        store.selectObject(newId);
        return;
      }
      // Extrude/Revolve: open dialog
      // AI tools: open inline panels via callback
      if (id === "ai_text_to_cad" || id === "ai_suggest" || id === "ai_optimize" || id === "ai_explain" || id === "ai_fea" || id === "ai_cfd") {
        onAITool?.(id as "ai_text_to_cad" | "ai_suggest" | "ai_optimize" | "ai_explain" | "ai_fea" | "ai_cfd");
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
      if (id === "mass_properties") {
        onMassProps?.();
        return;
      }
      if (id === "ref_geometry") {
        onRefGeometry?.();
        return;
      }
      if (id === "appearance_editor") {
        onAppearance?.();
        return;
      }
      if (id === "config_manager") {
        onConfigManager?.();
        return;
      }
      if (id === "hole_wizard") {
        onHoleWizard?.();
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
    [setActiveTool, setActiveOperation, addObject, booleanUnion, booleanSubtract, booleanIntersect, selectedId, selectedIds, onExtrude, onRevolve, onMassProps, onRefGeometry, onAppearance, onConfigManager, onHoleWizard, onAITool, router]
  );

  const handleTabDoubleClick = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  const currentTools = activeTab === "view" ? [] : getToolsForTab(activeTab);

  return (
    <div className="bg-[#161b22] border-b border-[#21262d] shrink-0 select-none">
      {/* Tab headers */}
      <div className="flex items-center bg-[#0d1117] px-1">
        {/* Undo/Redo quick access */}
        <div className="flex items-center gap-0.5 mr-2 pr-2 border-r border-[#21262d]">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            title="Undo (Ctrl+Z)"
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#21262d] disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Y)"
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#21262d] disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150"
          >
            <Redo2 size={14} />
          </button>
        </div>

        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onDoubleClick={handleTabDoubleClick}
            className={`px-3.5 py-2 text-[11px] font-semibold tracking-wide transition-all duration-150 relative ${
              activeTab === tab.id
                ? "text-[#00D4FF]"
                : "text-slate-500 hover:text-slate-200"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1 right-1 h-[2px] bg-[#00D4FF] rounded-full" />
            )}
          </button>
        ))}

        <div className="flex-1" />

        {/* Analysis + Project buttons */}
        <div className="flex items-center gap-1.5 mr-2">
          <button onClick={() => router.push("/simulator")}
            title="Send current model to FEA simulator"
            className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-150">
            FEA
          </button>
          <button onClick={() => router.push("/cfd")}
            title="Send current model to CFD solver"
            className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-500/10 hover:bg-blue-500/25 text-blue-400 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-150">
            CFD
          </button>
          <div className="w-px h-4 bg-[#21262d] mx-0.5" />
          <button onClick={saveProject} title="Save project as .shilpa file"
            className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-[#21262d] hover:bg-[#30363d] text-slate-300 border border-[#30363d] hover:border-[#484f58] transition-all duration-150">
            Save
          </button>
          <button onClick={loadProject} title="Load .shilpa project file"
            className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-[#21262d] hover:bg-[#30363d] text-slate-300 border border-[#30363d] hover:border-[#484f58] transition-all duration-150">
            Load
          </button>
          <button onClick={() => setShowExportPanel(true)} title="Export model (PNG, PDF, STL, OBJ, DXF, JSON)"
            className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-150 flex items-center gap-1">
            <Download size={10} /> Export
          </button>
          <div className="w-px h-4 bg-[#21262d] mx-0.5" />
          <button onClick={openSaveModal} title="Quick save versioned snapshot to browser storage"
            className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-purple-500/10 hover:bg-purple-500/25 text-purple-400 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-150 flex items-center gap-1">
            <HardDrive size={10} /> Quick Save
          </button>
          <button onClick={() => setShowVersionHistory(true)} title="Open version history & branch manager"
            className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-purple-500/10 hover:bg-purple-500/25 text-purple-400 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-150 flex items-center gap-1">
            <History size={10} /> History
          </button>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#21262d] transition-all duration-150"
          title={collapsed ? "Expand ribbon" : "Collapse ribbon"}
        >
          {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
      </div>

      {/* Tool buttons with icon + label on hover */}
      {!collapsed && (
        <div className="px-2 py-1.5 flex items-center gap-0.5 min-h-[40px] bg-[#161b22] animate-fade-in">
          {activeTab === "view" ? (
            /* View tab */
            <div className="flex items-center gap-0.5">
              {cameraViews.map((view) => (
                <button
                  key={view.label}
                  onClick={() => setCameraView(view.label.toLowerCase())}
                  title={view.shortcut ? `${view.label} (${view.shortcut})` : view.label}
                  className="group relative flex flex-col items-center justify-center w-9 h-9 rounded-md hover:bg-[#21262d] transition-all duration-150 text-slate-400 hover:text-white"
                >
                  <MonitorSmartphone size={15} />
                  <span className="text-[7px] mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">{view.label}</span>
                </button>
              ))}
              <div className="w-px h-6 bg-[#21262d] mx-1.5" />
              {(["wireframe", "shaded", "realistic"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  title={`${mode.charAt(0).toUpperCase() + mode.slice(1)}`}
                  className={`group relative flex flex-col items-center justify-center w-9 h-9 rounded-md transition-all duration-150 ${
                    viewMode === mode ? "bg-[#00D4FF]/15 text-[#00D4FF] shadow-glow-sm" : "hover:bg-[#21262d] text-slate-400 hover:text-white"
                  }`}
                >
                  {mode === "wireframe" ? <Grid2X2 size={15} /> : mode === "shaded" ? <Sun size={15} /> : <Moon size={15} />}
                  <span className="text-[7px] mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity capitalize">{mode}</span>
                </button>
              ))}
              <div className="w-px h-6 bg-[#21262d] mx-1.5" />
              <button onClick={() => setShowGrid(!showGrid)} title="Grid (G)"
                className={`group flex flex-col items-center justify-center w-9 h-9 rounded-md transition-all duration-150 ${showGrid ? "bg-[#00D4FF]/15 text-[#00D4FF]" : "hover:bg-[#21262d] text-slate-400 hover:text-white"}`}>
                <Grid3X3 size={15} />
                <span className="text-[7px] mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">Grid</span>
              </button>
              <button onClick={() => setShowOrigin(!showOrigin)} title="Origin Axes"
                className={`group flex flex-col items-center justify-center w-9 h-9 rounded-md transition-all duration-150 ${showOrigin ? "bg-[#00D4FF]/15 text-[#00D4FF]" : "hover:bg-[#21262d] text-slate-400 hover:text-white"}`}>
                <Axis3D size={15} />
                <span className="text-[7px] mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">Origin</span>
              </button>
              <button onClick={() => setPerspectiveMode(!perspectiveMode)} title="Perspective/Ortho (5)"
                className={`group flex flex-col items-center justify-center w-9 h-9 rounded-md transition-all duration-150 ${!perspectiveMode ? "bg-[#00D4FF]/15 text-[#00D4FF]" : "hover:bg-[#21262d] text-slate-400 hover:text-white"}`}>
                <Maximize2 size={15} />
                <span className="text-[7px] mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">Ortho</span>
              </button>
            </div>
          ) : (
            /* Standard tool buttons - icon + label */
            currentTools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => tool.action ? tool.action() : handleToolClick(tool.id)}
                title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
                className={`group relative flex flex-col items-center justify-center min-w-[36px] h-9 px-1 rounded-md transition-all duration-150 ${
                  activeTool === tool.id
                    ? "bg-[#00D4FF]/15 text-[#00D4FF] shadow-glow-sm"
                    : "hover:bg-[#21262d] text-slate-400 hover:text-white"
                }`}
              >
                {tool.icon}
                <span className={`text-[7px] mt-0.5 transition-opacity ${
                  activeTool === tool.id ? "opacity-100" : "opacity-50 group-hover:opacity-100"
                }`}>{tool.label}</span>
                {tool.shortcut && (
                  <span className="absolute -top-0.5 -right-0.5 text-[7px] text-slate-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity bg-[#0d1117] rounded px-0.5">{tool.shortcut}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* Export Panel Modal */}
      {showExportPanel && <ExportPanel onClose={() => setShowExportPanel(false)} />}

      {/* Version History Panel */}
      {showVersionHistory && (
        <VersionHistory
          onClose={() => setShowVersionHistory(false)}
          onCompare={(a, b) => {
            setCompareVersions([a, b]);
            setShowVersionHistory(false);
          }}
        />
      )}

      {/* Version Compare Overlay */}
      {compareVersions && (
        <VersionCompare
          versionA={compareVersions[0]}
          versionB={compareVersions[1]}
          onClose={() => setCompareVersions(null)}
        />
      )}

      {/* Save Drawing Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl shadow-2xl w-[360px] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white">Save Drawing</span>
              <button onClick={() => setShowSaveModal(false)} className="text-slate-500 hover:text-white"><X size={14} /></button>
            </div>
            <input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveDrawing(); if (e.key === "Escape") setShowSaveModal(false); }}
              placeholder="Drawing name..."
              className="w-full bg-[#161b22] text-xs text-slate-200 rounded-lg px-3 py-2 outline-none border border-[#21262d] focus:border-purple-500/50 mb-3"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSaveModal(false)} className="px-3 py-1.5 text-[10px] rounded-md bg-[#21262d] text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSaveDrawing} className="px-3 py-1.5 text-[10px] rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Load Drawing Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl shadow-2xl w-[420px] max-h-[70vh] flex flex-col p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white">Load Drawing</span>
              <button onClick={() => setShowLoadModal(false)} className="text-slate-500 hover:text-white"><X size={14} /></button>
            </div>
            {savedDrawings.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-8">No saved drawings found.</div>
            ) : (
              <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                {savedDrawings.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#161b22] border border-[#21262d] hover:border-purple-500/30 group transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-200 truncate">{d.name}</div>
                      <div className="text-[9px] text-slate-600">{d.objectCount} objects &middot; {new Date(d.timestamp).toLocaleString()}</div>
                    </div>
                    <button
                      onClick={() => handleLoadDrawing(d.id)}
                      className="px-2 py-1 text-[9px] rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors shrink-0"
                    >Load</button>
                    <button
                      onClick={() => handleDeleteDrawing(d.id)}
                      className="p-1 text-slate-600 hover:text-red-400 transition-colors shrink-0"
                    ><Trash2 size={11} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-3">
              <button onClick={() => setShowLoadModal(false)} className="px-3 py-1.5 text-[10px] rounded-md bg-[#21262d] text-slate-400 hover:text-white transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
