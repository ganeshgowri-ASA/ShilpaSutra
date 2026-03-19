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
  | "delete"
  | "measure";

export type TransformMode = "translate" | "rotate" | "scale";

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
  // Line-specific
  linePoints?: [number, number, number][];
  // Arc-specific: [center, start, end]
  arcPoints?: [number, number, number][];
  arcRadius?: number;
  // Circle-specific
  circleCenter?: [number, number, number];
  circleRadius?: number;
  // Rectangle-specific: [corner1, corner2]
  rectCorners?: [[number, number, number], [number, number, number]];
  // Mesh-specific (AI-generated)
  meshVertices?: number[];
  meshIndices?: number[];
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
}

interface CadState {
  objects: CadObject[];
  selectedId: string | null;
  activeTool: ToolId;
  transformMode: TransformMode;
  snapGrid: boolean;
  unit: string;
  gridSize: number;

  // Undo/redo
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];

  // Measurement
  measurePoints: [number, number, number][];
  measureResult: { distance: number; dx: number; dy: number; dz: number } | null;

  setActiveTool: (tool: ToolId) => void;
  setTransformMode: (mode: TransformMode) => void;
  setSnapGrid: (v: boolean) => void;
  setUnit: (u: string) => void;
  addObject: (type: CadObject["type"]) => string;
  addLine: (points: [number, number, number][]) => string;
  addArc: (points: [number, number, number][], radius: number) => string;
  addCircle: (center: [number, number, number], radius: number) => string;
  addRectangle: (corner1: [number, number, number], corner2: [number, number, number]) => string;
  addGeneratedObject: (obj: Partial<CadObject> & { type: CadObject["type"]; name: string }) => string;
  selectObject: (id: string | null) => void;
  updateObject: (id: string, updates: Partial<CadObject>) => void;
  deleteSelected: () => void;
  deleteObject: (id: string) => void;
  getSelected: () => CadObject | undefined;
  snapToGrid: (value: number) => number;

  // Undo/redo
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Measurement
  addMeasurePoint: (point: [number, number, number]) => void;
  clearMeasure: () => void;
}

export const useCadStore = create<CadState>((set, get) => ({
  objects: [],
  selectedId: null,
  activeTool: "select",
  transformMode: "translate",
  snapGrid: true,
  unit: "mm",
  gridSize: 0.5,
  undoStack: [],
  redoStack: [],
  measurePoints: [],
  measureResult: null,

  setActiveTool: (tool) => set({ activeTool: tool, measurePoints: [], measureResult: null }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  setSnapGrid: (v) => set({ snapGrid: v }),
  setUnit: (u) => set({ unit: u }),

  snapToGrid: (value: number) => {
    const { snapGrid, gridSize } = get();
    if (!snapGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  },

  pushHistory: () => {
    const { objects, selectedId, undoStack } = get();
    const entry: HistoryEntry = {
      objects: JSON.parse(JSON.stringify(objects)),
      selectedId,
    };
    const newStack = [...undoStack, entry];
    if (newStack.length > MAX_HISTORY) newStack.shift();
    set({ undoStack: newStack, redoStack: [] });
  },

  undo: () => {
    const { undoStack, objects, selectedId } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    const currentEntry: HistoryEntry = {
      objects: JSON.parse(JSON.stringify(objects)),
      selectedId,
    };
    set({
      objects: prev.objects,
      selectedId: prev.selectedId,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, currentEntry],
    });
  },

  redo: () => {
    const { redoStack, objects, selectedId } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const currentEntry: HistoryEntry = {
      objects: JSON.parse(JSON.stringify(objects)),
      selectedId,
    };
    set({
      objects: next.objects,
      selectedId: next.selectedId,
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
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id }));
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
      linePoints: points,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id }));
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
      arcPoints: points,
      arcRadius: radius,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id }));
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
      circleCenter: center,
      circleRadius: radius,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id }));
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
      rectCorners: [corner1, corner2],
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id }));
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
      ...partial,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id }));
    return id;
  },

  selectObject: (id) => set({ selectedId: id }),

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
    const { selectedId } = get();
    if (!selectedId) return;
    get().pushHistory();
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== selectedId),
      selectedId: null,
    }));
  },

  deleteObject: (id) => {
    get().pushHistory();
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },

  getSelected: () => {
    const { objects, selectedId } = get();
    return objects.find((o) => o.id === selectedId);
  },
}));
