"use client";
import { create } from "zustand";

export type ToolId =
  | "select"
  | "box"
  | "cylinder"
  | "sphere"
  | "cone"
  | "line"
  | "arc"
  | "circle"
  | "rectangle"
  | "polygon"
  | "spline"
  | "ellipse"
  | "construction_line"
  | "delete"
  | "measure"
  | "measure_angle"
  | "extrude"
  | "revolve"
  | "loft"
  | "sweep"
  | "boolean_union"
  | "boolean_subtract"
  | "boolean_intersect"
  | "fillet"
  | "chamfer"
  | "shell"
  | "draft"
  | "mirror"
  | "scale_tool"
  | "move_tool"
  | "rotate_tool"
  | "linear_pattern"
  | "circular_pattern"
  | "path_pattern"
  | "section_view"
  | "mass_properties"
  | "trim"
  | "extend"
  | "offset"
  | "mirror_sketch"
  | "ai_text_to_cad"
  | "ai_suggest"
  | "ai_optimize"
  | "ai_explain";

export type TransformMode = "translate" | "rotate" | "scale";

export type RibbonTab = "sketch" | "solid" | "modify" | "inspect" | "view" | "ai" | "constraints";

export type ViewMode = "wireframe" | "shaded" | "realistic";

export type UnitType = "mm" | "cm" | "m" | "inch";

export interface CadObject {
  id: string;
  type: "box" | "cylinder" | "sphere" | "cone" | "line" | "arc" | "circle" | "rectangle" | "mesh";
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  dimensions: { width: number; height: number; depth: number };
  material: string;
  color: string;
  visible: boolean;
  locked: boolean;
  // Material properties
  opacity: number;
  metalness: number;
  roughness: number;
  // Line-specific
  linePoints?: [number, number, number][];
  // Arc-specific
  arcPoints?: [number, number, number][];
  arcRadius?: number;
  // Circle-specific
  circleCenter?: [number, number, number];
  circleRadius?: number;
  // Rectangle-specific
  rectCorners?: [[number, number, number], [number, number, number]];
  // Mesh-specific (AI-generated)
  meshVertices?: number[];
  meshIndices?: number[];
}

export interface FeatureNode {
  id: string;
  type: string;
  name: string;
  objectId: string;
  parentId?: string;
  children: string[];
  visible: boolean;
  locked: boolean;
  expanded: boolean;
}

export interface Measurement {
  id: string;
  type: "distance" | "angle";
  points: [number, number, number][];
  value: number;
  unit: string;
}

const materialColors: Record<string, string> = {
  "Steel (AISI 1045)": "#8899aa",
  "Aluminum 6061-T6": "#c0c8d0",
  "Titanium Ti-6Al-4V": "#7a8a9a",
  "ABS Plastic": "#e94560",
  "Copper C110": "#b87333",
  "Brass C360": "#c9a84c",
  "Nylon PA6": "#e8e0d0",
  "Polycarbonate": "#d0e8ff",
};

export const getMaterialColor = (mat: string) =>
  materialColors[mat] || "#4a9eff";

export const materialList = Object.keys(materialColors);

let idCounter = 0;

const MAX_HISTORY = 50;

interface HistoryEntry {
  objects: CadObject[];
  selectedId: string | null;
  featureHistory: FeatureNode[];
}

interface CadState {
  objects: CadObject[];
  selectedId: string | null;
  selectedIds: string[];
  activeTool: ToolId;
  transformMode: TransformMode;
  snapGrid: boolean;
  unit: UnitType;
  gridSize: number;

  // Ribbon
  activeRibbonTab: RibbonTab;
  ribbonCollapsed: boolean;

  // View
  viewMode: ViewMode;
  showGrid: boolean;
  showOrigin: boolean;
  showDimensions: boolean;
  perspectiveMode: boolean;

  // Feature tree
  featureHistory: FeatureNode[];
  selectedFeatures: string[];
  featureTreeCollapsed: boolean;

  // Property panel
  propertyPanelCollapsed: boolean;

  // Undo/redo
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];

  // Measurement
  measurePoints: [number, number, number][];
  measureResult: { distance: number; dx: number; dy: number; dz: number } | null;
  measurements: Measurement[];

  // Command bar
  commandHistory: string[];

  // Camera target view
  cameraView: string | null;

  // Sketch mode
  sketchPlane: "xy" | "xz" | "yz";
  autoConstraints: boolean;

  // Active operation dialogs
  activeOperation: "fillet" | "chamfer" | "shell" | "draft" | "linear_pattern" | "circular_pattern" | "mirror" | "path_pattern" | null;

  // History timeline
  showHistoryTimeline: boolean;

  // Actions
  setActiveTool: (tool: ToolId) => void;
  setTransformMode: (mode: TransformMode) => void;
  setSnapGrid: (v: boolean) => void;
  setUnit: (u: UnitType) => void;
  setActiveRibbonTab: (tab: RibbonTab) => void;
  setRibbonCollapsed: (v: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setShowGrid: (v: boolean) => void;
  setShowOrigin: (v: boolean) => void;
  setShowDimensions: (v: boolean) => void;
  setPerspectiveMode: (v: boolean) => void;
  setFeatureTreeCollapsed: (v: boolean) => void;
  setPropertyPanelCollapsed: (v: boolean) => void;
  setCameraView: (view: string | null) => void;
  setSketchPlane: (plane: "xy" | "xz" | "yz") => void;
  setAutoConstraints: (v: boolean) => void;
  setActiveOperation: (op: CadState["activeOperation"]) => void;
  setShowHistoryTimeline: (v: boolean) => void;

  addObject: (type: CadObject["type"]) => string;
  addLine: (points: [number, number, number][]) => string;
  addArc: (points: [number, number, number][], radius: number) => string;
  addCircle: (center: [number, number, number], radius: number) => string;
  addRectangle: (corner1: [number, number, number], corner2: [number, number, number]) => string;
  addGeneratedObject: (obj: Partial<CadObject> & { type: CadObject["type"]; name: string }) => string;
  selectObject: (id: string | null) => void;
  toggleSelectObject: (id: string) => void;
  updateObject: (id: string, updates: Partial<CadObject>) => void;
  deleteSelected: () => void;
  deleteObject: (id: string) => void;
  getSelected: () => CadObject | undefined;
  snapToGrid: (value: number) => number;

  // Feature tree actions
  addFeature: (node: Omit<FeatureNode, "children" | "expanded">) => void;
  removeFeature: (id: string) => void;
  reorderFeature: (id: string, newIndex: number) => void;
  renameFeature: (id: string, name: string) => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;

  // Undo/redo
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Measurement
  addMeasurePoint: (point: [number, number, number]) => void;
  clearMeasure: () => void;
  addMeasurement: (measurement: Omit<Measurement, "id">) => void;
  clearMeasurements: () => void;

  // Command
  executeCommand: (cmd: string) => void;
}

export const useCadStore = create<CadState>((set, get) => ({
  objects: [],
  selectedId: null,
  selectedIds: [],
  activeTool: "select",
  transformMode: "translate",
  snapGrid: true,
  unit: "mm",
  gridSize: 0.5,

  // Ribbon
  activeRibbonTab: "solid",
  ribbonCollapsed: false,

  // View
  viewMode: "shaded",
  showGrid: true,
  showOrigin: true,
  showDimensions: true,
  perspectiveMode: true,

  // Feature tree
  featureHistory: [],
  selectedFeatures: [],
  featureTreeCollapsed: false,

  // Property panel
  propertyPanelCollapsed: false,

  // Undo/redo
  undoStack: [],
  redoStack: [],

  // Measurement
  measurePoints: [],
  measureResult: null,
  measurements: [],

  // Command
  commandHistory: [],

  // Camera
  cameraView: null,

  // Sketch mode
  sketchPlane: "xz",
  autoConstraints: true,

  // Active operation
  activeOperation: null,

  // History timeline
  showHistoryTimeline: false,

  // Setters
  setActiveTool: (tool) => set({ activeTool: tool, measurePoints: [], measureResult: null }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  setSnapGrid: (v) => set({ snapGrid: v }),
  setUnit: (u) => set({ unit: u }),
  setActiveRibbonTab: (tab) => set({ activeRibbonTab: tab }),
  setRibbonCollapsed: (v) => set({ ribbonCollapsed: v }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setShowGrid: (v) => set({ showGrid: v }),
  setShowOrigin: (v) => set({ showOrigin: v }),
  setShowDimensions: (v) => set({ showDimensions: v }),
  setPerspectiveMode: (v) => set({ perspectiveMode: v }),
  setFeatureTreeCollapsed: (v) => set({ featureTreeCollapsed: v }),
  setPropertyPanelCollapsed: (v) => set({ propertyPanelCollapsed: v }),
  setCameraView: (view) => set({ cameraView: view }),
  setSketchPlane: (plane) => set({ sketchPlane: plane }),
  setAutoConstraints: (v) => set({ autoConstraints: v }),
  setActiveOperation: (op) => set({ activeOperation: op }),
  setShowHistoryTimeline: (v) => set({ showHistoryTimeline: v }),

  snapToGrid: (value: number) => {
    const { snapGrid, gridSize } = get();
    if (!snapGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  },

  pushHistory: () => {
    const { objects, selectedId, featureHistory, undoStack } = get();
    const entry: HistoryEntry = {
      objects: JSON.parse(JSON.stringify(objects)),
      selectedId,
      featureHistory: JSON.parse(JSON.stringify(featureHistory)),
    };
    const newStack = [...undoStack, entry];
    if (newStack.length > MAX_HISTORY) newStack.shift();
    set({ undoStack: newStack, redoStack: [] });
  },

  undo: () => {
    const { undoStack, objects, selectedId, featureHistory } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    const currentEntry: HistoryEntry = {
      objects: JSON.parse(JSON.stringify(objects)),
      selectedId,
      featureHistory: JSON.parse(JSON.stringify(featureHistory)),
    };
    set({
      objects: prev.objects,
      selectedId: prev.selectedId,
      featureHistory: prev.featureHistory,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, currentEntry],
    });
  },

  redo: () => {
    const { redoStack, objects, selectedId, featureHistory } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const currentEntry: HistoryEntry = {
      objects: JSON.parse(JSON.stringify(objects)),
      selectedId,
      featureHistory: JSON.parse(JSON.stringify(featureHistory)),
    };
    set({
      objects: next.objects,
      selectedId: next.selectedId,
      featureHistory: next.featureHistory,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, currentEntry],
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  addMeasurePoint: (point) => {
    const { measurePoints } = get();
    if (measurePoints.length === 0) {
      set({ measurePoints: [point], measureResult: null });
    } else {
      const p1 = measurePoints[0];
      const dx = point[0] - p1[0];
      const dy = point[1] - p1[1];
      const dz = point[2] - p1[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      set({
        measurePoints: [measurePoints[0], point],
        measureResult: {
          distance: Math.round(distance * 1000) / 1000,
          dx: Math.round(Math.abs(dx) * 1000) / 1000,
          dy: Math.round(Math.abs(dy) * 1000) / 1000,
          dz: Math.round(Math.abs(dz) * 1000) / 1000,
        },
      });
    }
  },

  clearMeasure: () => set({ measurePoints: [], measureResult: null }),

  addMeasurement: (measurement) => {
    const id = `meas_${Date.now()}`;
    set((s) => ({
      measurements: [...s.measurements, { ...measurement, id }],
    }));
  },

  clearMeasurements: () => set({ measurements: [] }),

  // Feature tree actions
  addFeature: (node) => {
    set((s) => ({
      featureHistory: [
        ...s.featureHistory,
        { ...node, children: [], expanded: true },
      ],
    }));
  },

  removeFeature: (id) => {
    set((s) => ({
      featureHistory: s.featureHistory.filter((f) => f.id !== id),
    }));
  },

  reorderFeature: (id, newIndex) => {
    set((s) => {
      const features = [...s.featureHistory];
      const oldIndex = features.findIndex((f) => f.id === id);
      if (oldIndex === -1) return s;
      const [item] = features.splice(oldIndex, 1);
      features.splice(newIndex, 0, item);
      return { featureHistory: features };
    });
  },

  renameFeature: (id, name) => {
    set((s) => ({
      featureHistory: s.featureHistory.map((f) =>
        f.id === id ? { ...f, name } : f
      ),
    }));
    // Also rename the associated object
    const feature = get().featureHistory.find((f) => f.id === id);
    if (feature) {
      get().updateObject(feature.objectId, { name });
    }
  },

  toggleVisibility: (id) => {
    const feature = get().featureHistory.find((f) => f.id === id);
    if (!feature) return;
    const newVisible = !feature.visible;
    set((s) => ({
      featureHistory: s.featureHistory.map((f) =>
        f.id === id ? { ...f, visible: newVisible } : f
      ),
    }));
    get().updateObject(feature.objectId, { visible: newVisible });
  },

  toggleLock: (id) => {
    const feature = get().featureHistory.find((f) => f.id === id);
    if (!feature) return;
    const newLocked = !feature.locked;
    set((s) => ({
      featureHistory: s.featureHistory.map((f) =>
        f.id === id ? { ...f, locked: newLocked } : f
      ),
    }));
    get().updateObject(feature.objectId, { locked: newLocked });
  },

  selectObject: (id) => set({ selectedId: id, selectedIds: id ? [id] : [] }),

  toggleSelectObject: (id) => {
    set((s) => {
      const ids = s.selectedIds.includes(id)
        ? s.selectedIds.filter((i) => i !== id)
        : [...s.selectedIds, id];
      return { selectedIds: ids, selectedId: ids.length > 0 ? ids[ids.length - 1] : null };
    });
  },

  addObject: (type) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const defaults: Record<
      string,
      { dims: { width: number; height: number; depth: number }; name: string }
    > = {
      box: { dims: { width: 2, height: 2, depth: 2 }, name: "Box" },
      cylinder: { dims: { width: 1, height: 2, depth: 1 }, name: "Cylinder" },
      sphere: { dims: { width: 1.5, height: 1.5, depth: 1.5 }, name: "Sphere" },
      cone: { dims: { width: 1, height: 2, depth: 1 }, name: "Cone" },
    };
    const d = defaults[type] || defaults.box;
    const count = get().objects.filter((o) => o.type === type).length;
    const obj: CadObject = {
      id,
      type,
      name: `${d.name} ${count + 1}`,
      position: [0, d.dims.height / 2, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions: { ...d.dims },
      material: "Steel (AISI 1045)",
      color: getMaterialColor("Steel (AISI 1045)"),
      visible: true,
      locked: false,
      opacity: 1,
      metalness: 0.4,
      roughness: 0.5,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));

    // Add feature node
    get().addFeature({
      id: `feat_${id}`,
      type: obj.type,
      name: obj.name,
      objectId: id,
      visible: true,
      locked: false,
    });

    return id;
  },

  addLine: (points) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.type === "line").length;
    const obj: CadObject = {
      id,
      type: "line",
      name: `Line ${count + 1}`,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions: { width: 0, height: 0, depth: 0 },
      material: "Steel (AISI 1045)",
      color: "#00ffff",
      visible: true,
      locked: false,
      opacity: 1,
      metalness: 0,
      roughness: 1,
      linePoints: points,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));
    get().addFeature({
      id: `feat_${id}`,
      type: "line",
      name: obj.name,
      objectId: id,
      visible: true,
      locked: false,
    });
    return id;
  },

  addArc: (points, radius) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.type === "arc").length;
    const obj: CadObject = {
      id,
      type: "arc",
      name: `Arc ${count + 1}`,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions: { width: 0, height: 0, depth: 0 },
      material: "Steel (AISI 1045)",
      color: "#ff00ff",
      visible: true,
      locked: false,
      opacity: 1,
      metalness: 0,
      roughness: 1,
      arcPoints: points,
      arcRadius: radius,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));
    get().addFeature({
      id: `feat_${id}`,
      type: "arc",
      name: obj.name,
      objectId: id,
      visible: true,
      locked: false,
    });
    return id;
  },

  addCircle: (center, radius) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.type === "circle").length;
    const obj: CadObject = {
      id,
      type: "circle",
      name: `Circle ${count + 1}`,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions: { width: radius * 2, height: 0, depth: radius * 2 },
      material: "Steel (AISI 1045)",
      color: "#00ff00",
      visible: true,
      locked: false,
      opacity: 1,
      metalness: 0,
      roughness: 1,
      circleCenter: center,
      circleRadius: radius,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));
    get().addFeature({
      id: `feat_${id}`,
      type: "circle",
      name: obj.name,
      objectId: id,
      visible: true,
      locked: false,
    });
    return id;
  },

  addRectangle: (corner1, corner2) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.type === "rectangle").length;
    const obj: CadObject = {
      id,
      type: "rectangle",
      name: `Rectangle ${count + 1}`,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions: {
        width: Math.abs(corner2[0] - corner1[0]),
        height: 0,
        depth: Math.abs(corner2[2] - corner1[2]),
      },
      material: "Steel (AISI 1045)",
      color: "#ffaa00",
      visible: true,
      locked: false,
      opacity: 1,
      metalness: 0,
      roughness: 1,
      rectCorners: [corner1, corner2],
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));
    get().addFeature({
      id: `feat_${id}`,
      type: "rectangle",
      name: obj.name,
      objectId: id,
      visible: true,
      locked: false,
    });
    return id;
  },

  addGeneratedObject: (partial) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const obj: CadObject = {
      id,
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions: { width: 2, height: 2, depth: 2 },
      material: "Steel (AISI 1045)",
      color: getMaterialColor("Steel (AISI 1045)"),
      visible: true,
      locked: false,
      opacity: 1,
      metalness: 0.4,
      roughness: 0.5,
      ...partial,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));
    get().addFeature({
      id: `feat_${id}`,
      type: obj.type,
      name: obj.name,
      objectId: id,
      visible: true,
      locked: false,
    });
    return id;
  },

  updateObject: (id, updates) =>
    set((s) => ({
      objects: s.objects.map((o) => {
        if (o.id !== id) return o;
        const merged = { ...o, ...updates };
        if (updates.material && !updates.color) {
          merged.color = getMaterialColor(updates.material);
        }
        return merged;
      }),
    })),

  deleteSelected: () => {
    const { selectedId, selectedIds } = get();
    const idsToDelete = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    if (idsToDelete.length === 0) return;
    get().pushHistory();
    set((s) => ({
      objects: s.objects.filter((o) => !idsToDelete.includes(o.id)),
      featureHistory: s.featureHistory.filter((f) => !idsToDelete.includes(f.objectId)),
      selectedId: null,
      selectedIds: [],
    }));
  },

  deleteObject: (id) => {
    get().pushHistory();
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== id),
      featureHistory: s.featureHistory.filter((f) => f.objectId !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
      selectedIds: s.selectedIds.filter((i) => i !== id),
    }));
  },

  getSelected: () => {
    const { objects, selectedId } = get();
    return objects.find((o) => o.id === selectedId);
  },

  executeCommand: (cmd: string) => {
    const parts = cmd.trim().toUpperCase().split(/\s+/);
    const command = parts[0];
    const store = get();

    set((s) => ({
      commandHistory: [...s.commandHistory.slice(-49), cmd],
    }));

    switch (command) {
      case "UNDO":
        store.undo();
        break;
      case "REDO":
        store.redo();
        break;
      case "DELETE":
        store.deleteSelected();
        break;
      case "COPY": {
        const sel = store.getSelected();
        if (sel) {
          const newObj = { ...sel, name: `${sel.name} (Copy)` };
          store.addGeneratedObject(newObj);
        }
        break;
      }
      case "BOX":
        store.addObject("box");
        break;
      case "CYLINDER":
        store.addObject("cylinder");
        break;
      case "SPHERE":
        store.addObject("sphere");
        break;
      case "CONE":
        store.addObject("cone");
        break;
      case "EXTRUDE": {
        store.setActiveTool("extrude");
        break;
      }
      case "FILLET": {
        const radius = parseFloat(parts[1]) || 1;
        store.setActiveTool("fillet");
        // Store radius in a way the tool can access
        void radius;
        break;
      }
      case "CHAMFER": {
        const dist = parseFloat(parts[1]) || 1;
        store.setActiveTool("chamfer");
        void dist;
        break;
      }
      case "MOVE": {
        if (parts.length >= 4) {
          const sel = store.getSelected();
          if (sel) {
            const x = parseFloat(parts[1]) || 0;
            const y = parseFloat(parts[2]) || 0;
            const z = parseFloat(parts[3]) || 0;
            store.pushHistory();
            store.updateObject(sel.id, {
              position: [sel.position[0] + x, sel.position[1] + y, sel.position[2] + z],
            });
          }
        }
        break;
      }
      case "ROTATE": {
        const angle = parseFloat(parts[1]) || 0;
        const sel = store.getSelected();
        if (sel) {
          store.pushHistory();
          store.updateObject(sel.id, {
            rotation: [sel.rotation[0], sel.rotation[1] + (angle * Math.PI) / 180, sel.rotation[2]],
          });
        }
        break;
      }
      default:
        break;
    }
  },
}));
