import { create } from "zustand";

// ── Types ──────────────────────────────────────────────────────────

export interface FederatedModel {
  id: string;
  name: string;
  discipline: "structural" | "electrical" | "mechanical" | "architectural" | "piping" | "other";
  visible: boolean;
  opacity: number;
  color: string;
  componentIds: string[];
  loaded: boolean;
}

export interface ModelComponent {
  id: string;
  name: string;
  modelId: string;
  parentId: string | null;
  children: string[];
  visible: boolean;
  selected: boolean;
  meshData?: {
    vertices: number[];
    indices: number[];
    normals?: number[];
  };
  boundingBox?: {
    min: [number, number, number];
    max: [number, number, number];
  };
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  metadata: Record<string, string | number>;
  constructionPhase?: number;
  phaseStatus?: "planned" | "in-progress" | "completed";
}

export interface ClippingPlane {
  id: string;
  normal: [number, number, number];
  distance: number;
  enabled: boolean;
  visible: boolean;
}

export interface SectionBox {
  enabled: boolean;
  min: [number, number, number];
  max: [number, number, number];
}

export interface SavedViewpoint {
  id: string;
  name: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  clippingPlanes: ClippingPlane[];
  sectionBox: SectionBox | null;
  timestamp: number;
}

export interface WalkthroughKeyframe {
  id: string;
  position: [number, number, number];
  target: [number, number, number];
  time: number;
}

export interface Measurement3D {
  id: string;
  type: "distance" | "angle" | "area";
  points: [number, number, number][];
  value: number;
  unit: string;
  label?: string;
}

export interface Annotation3D {
  id: string;
  text: string;
  position: [number, number, number];
  anchorPoint: [number, number, number];
  color: string;
  visible: boolean;
  createdAt: number;
}

export interface ClashResult {
  id: string;
  type: "hard" | "soft";
  severity: "critical" | "major" | "minor";
  componentA: string;
  componentB: string;
  location: [number, number, number];
  distance?: number;
  description: string;
  resolved: boolean;
}

export interface ClashGroup {
  id: string;
  name: string;
  groupA: string[];
  groupB: string[];
}

export type NavigationMode = "orbit" | "pan" | "zoom" | "walkthrough" | "measure" | "annotate" | "section";
export type ToolMode = "orbit" | "pan" | "zoom" | "fit-all" | "section-box" | "measure-distance" | "measure-angle" | "measure-area" | "annotate" | "walkthrough";

export interface ConstructionPhase {
  id: number;
  name: string;
  color: string;
  startDate?: string;
  endDate?: string;
}

// ── Discipline color map ───────────────────────────────────────────

export const DISCIPLINE_COLORS: Record<string, string> = {
  structural: "#3b82f6",
  electrical: "#eab308",
  mechanical: "#22c55e",
  architectural: "#a855f7",
  piping: "#f97316",
  other: "#6b7280",
};

// ── Default construction phases ────────────────────────────────────

export const DEFAULT_PHASES: ConstructionPhase[] = [
  { id: 0, name: "Foundation", color: "#6b7280" },
  { id: 1, name: "Structure", color: "#3b82f6" },
  { id: 2, name: "Modules", color: "#22c55e" },
  { id: 3, name: "Electrical", color: "#eab308" },
  { id: 4, name: "Commissioning", color: "#a855f7" },
];

// ── Store ──────────────────────────────────────────────────────────

interface VisualizationState {
  // Models & components
  models: FederatedModel[];
  components: Map<string, ModelComponent>;
  selectedComponentId: string | null;
  expandedNodes: Set<string>;

  // Navigation
  navigationMode: NavigationMode;
  activeTool: ToolMode;

  // Camera
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];

  // Clipping & sections
  clippingPlanes: ClippingPlane[];
  sectionBox: SectionBox;
  savedViewpoints: SavedViewpoint[];

  // Walkthrough
  walkthroughActive: boolean;
  walkthroughSpeed: number;
  walkthroughEyeHeight: number;
  walkthroughKeyframes: WalkthroughKeyframe[];
  walkthroughPlaying: boolean;
  walkthroughTime: number;

  // Measurements & annotations
  measurements: Measurement3D[];
  annotations: Annotation3D[];
  activeMeasurementPoints: [number, number, number][];

  // Clash detection
  clashResults: ClashResult[];
  clashGroups: ClashGroup[];
  showClashes: boolean;
  clashMinGap: number;
  selectedClashId: string | null;

  // 4D Timeline
  phases: ConstructionPhase[];
  currentPhase: number;
  timelineActive: boolean;

  // Actions ─ Models
  addModel: (model: FederatedModel) => void;
  removeModel: (id: string) => void;
  toggleModelVisibility: (id: string) => void;
  setModelOpacity: (id: string, opacity: number) => void;
  colorByDiscipline: () => void;

  // Actions ─ Components
  addComponent: (component: ModelComponent) => void;
  removeComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;
  toggleComponentVisibility: (id: string) => void;
  toggleNodeExpanded: (id: string) => void;

  // Actions ─ Navigation
  setNavigationMode: (mode: NavigationMode) => void;
  setActiveTool: (tool: ToolMode) => void;
  setCameraPosition: (pos: [number, number, number]) => void;
  setCameraTarget: (target: [number, number, number]) => void;

  // Actions ─ Clipping
  addClippingPlane: (plane: ClippingPlane) => void;
  removeClippingPlane: (id: string) => void;
  updateClippingPlane: (id: string, updates: Partial<ClippingPlane>) => void;
  toggleSectionBox: () => void;
  updateSectionBox: (updates: Partial<SectionBox>) => void;
  saveViewpoint: (name: string) => void;
  loadViewpoint: (id: string) => void;
  deleteViewpoint: (id: string) => void;

  // Actions ─ Walkthrough
  toggleWalkthrough: () => void;
  setWalkthroughSpeed: (speed: number) => void;
  setWalkthroughEyeHeight: (height: number) => void;
  addWalkthroughKeyframe: (kf: WalkthroughKeyframe) => void;
  removeWalkthroughKeyframe: (id: string) => void;
  setWalkthroughPlaying: (playing: boolean) => void;
  setWalkthroughTime: (time: number) => void;

  // Actions ─ Measurements
  addMeasurement: (m: Measurement3D) => void;
  removeMeasurement: (id: string) => void;
  clearMeasurements: () => void;
  addMeasurementPoint: (point: [number, number, number]) => void;
  clearMeasurementPoints: () => void;

  // Actions ─ Annotations
  addAnnotation: (a: Annotation3D) => void;
  removeAnnotation: (id: string) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation3D>) => void;
  clearAnnotations: () => void;

  // Actions ─ Clash detection
  setClashResults: (results: ClashResult[]) => void;
  clearClashResults: () => void;
  toggleShowClashes: () => void;
  setClashMinGap: (gap: number) => void;
  selectClash: (id: string | null) => void;
  resolveClash: (id: string) => void;
  addClashGroup: (group: ClashGroup) => void;
  removeClashGroup: (id: string) => void;

  // Actions ─ 4D Timeline
  setCurrentPhase: (phase: number) => void;
  toggleTimeline: () => void;
  setComponentPhase: (componentId: string, phase: number) => void;
  setComponentPhaseStatus: (componentId: string, status: "planned" | "in-progress" | "completed") => void;
  addPhase: (phase: ConstructionPhase) => void;
  removePhase: (id: number) => void;
}

export const useVisualizationStore = create<VisualizationState>((set, get) => ({
  // Initial state
  models: [],
  components: new Map(),
  selectedComponentId: null,
  expandedNodes: new Set(),

  navigationMode: "orbit",
  activeTool: "orbit",

  cameraPosition: [10, 8, 10],
  cameraTarget: [0, 0, 0],

  clippingPlanes: [],
  sectionBox: { enabled: false, min: [-5, -5, -5], max: [5, 5, 5] },
  savedViewpoints: [],

  walkthroughActive: false,
  walkthroughSpeed: 2,
  walkthroughEyeHeight: 1.7,
  walkthroughKeyframes: [],
  walkthroughPlaying: false,
  walkthroughTime: 0,

  measurements: [],
  annotations: [],
  activeMeasurementPoints: [],

  clashResults: [],
  clashGroups: [],
  showClashes: true,
  clashMinGap: 0.05,
  selectedClashId: null,

  phases: [...DEFAULT_PHASES],
  currentPhase: -1,
  timelineActive: false,

  // ── Model actions ──

  addModel: (model) => set((s) => ({ models: [...s.models, model] })),

  removeModel: (id) =>
    set((s) => {
      const model = s.models.find((m) => m.id === id);
      const newComponents = new Map(s.components);
      if (model) {
        model.componentIds.forEach((cid) => newComponents.delete(cid));
      }
      return {
        models: s.models.filter((m) => m.id !== id),
        components: newComponents,
      };
    }),

  toggleModelVisibility: (id) =>
    set((s) => ({
      models: s.models.map((m) =>
        m.id === id ? { ...m, visible: !m.visible } : m
      ),
    })),

  setModelOpacity: (id, opacity) =>
    set((s) => ({
      models: s.models.map((m) =>
        m.id === id ? { ...m, opacity } : m
      ),
    })),

  colorByDiscipline: () =>
    set((s) => ({
      models: s.models.map((m) => ({
        ...m,
        color: DISCIPLINE_COLORS[m.discipline] || DISCIPLINE_COLORS.other,
      })),
    })),

  // ── Component actions ──

  addComponent: (component) =>
    set((s) => {
      const newComponents = new Map(s.components);
      newComponents.set(component.id, component);
      return { components: newComponents };
    }),

  removeComponent: (id) =>
    set((s) => {
      const newComponents = new Map(s.components);
      newComponents.delete(id);
      return { components: newComponents };
    }),

  selectComponent: (id) => set({ selectedComponentId: id }),

  toggleComponentVisibility: (id) =>
    set((s) => {
      const newComponents = new Map(s.components);
      const comp = newComponents.get(id);
      if (comp) {
        newComponents.set(id, { ...comp, visible: !comp.visible });
      }
      return { components: newComponents };
    }),

  toggleNodeExpanded: (id) =>
    set((s) => {
      const newExpanded = new Set(s.expandedNodes);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return { expandedNodes: newExpanded };
    }),

  // ── Navigation actions ──

  setNavigationMode: (mode) => set({ navigationMode: mode }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setCameraPosition: (pos) => set({ cameraPosition: pos }),
  setCameraTarget: (target) => set({ cameraTarget: target }),

  // ── Clipping actions ──

  addClippingPlane: (plane) =>
    set((s) => {
      if (s.clippingPlanes.length >= 6) return s;
      return { clippingPlanes: [...s.clippingPlanes, plane] };
    }),

  removeClippingPlane: (id) =>
    set((s) => ({
      clippingPlanes: s.clippingPlanes.filter((p) => p.id !== id),
    })),

  updateClippingPlane: (id, updates) =>
    set((s) => ({
      clippingPlanes: s.clippingPlanes.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  toggleSectionBox: () =>
    set((s) => ({
      sectionBox: { ...s.sectionBox, enabled: !s.sectionBox.enabled },
    })),

  updateSectionBox: (updates) =>
    set((s) => ({
      sectionBox: { ...s.sectionBox, ...updates },
    })),

  saveViewpoint: (name) =>
    set((s) => ({
      savedViewpoints: [
        ...s.savedViewpoints,
        {
          id: `vp-${Date.now()}`,
          name,
          cameraPosition: [...s.cameraPosition],
          cameraTarget: [...s.cameraTarget],
          clippingPlanes: s.clippingPlanes.map((p) => ({ ...p })),
          sectionBox: s.sectionBox.enabled ? { ...s.sectionBox } : null,
          timestamp: Date.now(),
        },
      ],
    })),

  loadViewpoint: (id) => {
    const vp = get().savedViewpoints.find((v) => v.id === id);
    if (!vp) return;
    set({
      cameraPosition: [...vp.cameraPosition],
      cameraTarget: [...vp.cameraTarget],
      clippingPlanes: vp.clippingPlanes.map((p) => ({ ...p })),
      sectionBox: vp.sectionBox ? { ...vp.sectionBox } : get().sectionBox,
    });
  },

  deleteViewpoint: (id) =>
    set((s) => ({
      savedViewpoints: s.savedViewpoints.filter((v) => v.id !== id),
    })),

  // ── Walkthrough actions ──

  toggleWalkthrough: () =>
    set((s) => ({
      walkthroughActive: !s.walkthroughActive,
      navigationMode: !s.walkthroughActive ? "walkthrough" : "orbit",
    })),

  setWalkthroughSpeed: (speed) => set({ walkthroughSpeed: speed }),
  setWalkthroughEyeHeight: (height) => set({ walkthroughEyeHeight: height }),

  addWalkthroughKeyframe: (kf) =>
    set((s) => ({
      walkthroughKeyframes: [...s.walkthroughKeyframes, kf].sort(
        (a, b) => a.time - b.time
      ),
    })),

  removeWalkthroughKeyframe: (id) =>
    set((s) => ({
      walkthroughKeyframes: s.walkthroughKeyframes.filter((k) => k.id !== id),
    })),

  setWalkthroughPlaying: (playing) => set({ walkthroughPlaying: playing }),
  setWalkthroughTime: (time) => set({ walkthroughTime: time }),

  // ── Measurement actions ──

  addMeasurement: (m) =>
    set((s) => ({ measurements: [...s.measurements, m] })),

  removeMeasurement: (id) =>
    set((s) => ({
      measurements: s.measurements.filter((m) => m.id !== id),
    })),

  clearMeasurements: () => set({ measurements: [], activeMeasurementPoints: [] }),

  addMeasurementPoint: (point) =>
    set((s) => ({
      activeMeasurementPoints: [...s.activeMeasurementPoints, point],
    })),

  clearMeasurementPoints: () => set({ activeMeasurementPoints: [] }),

  // ── Annotation actions ──

  addAnnotation: (a) =>
    set((s) => ({ annotations: [...s.annotations, a] })),

  removeAnnotation: (id) =>
    set((s) => ({
      annotations: s.annotations.filter((a) => a.id !== id),
    })),

  updateAnnotation: (id, updates) =>
    set((s) => ({
      annotations: s.annotations.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),

  clearAnnotations: () => set({ annotations: [] }),

  // ── Clash detection actions ──

  setClashResults: (results) => set({ clashResults: results }),
  clearClashResults: () => set({ clashResults: [], selectedClashId: null }),
  toggleShowClashes: () => set((s) => ({ showClashes: !s.showClashes })),
  setClashMinGap: (gap) => set({ clashMinGap: gap }),
  selectClash: (id) => set({ selectedClashId: id }),

  resolveClash: (id) =>
    set((s) => ({
      clashResults: s.clashResults.map((c) =>
        c.id === id ? { ...c, resolved: true } : c
      ),
    })),

  addClashGroup: (group) =>
    set((s) => ({ clashGroups: [...s.clashGroups, group] })),

  removeClashGroup: (id) =>
    set((s) => ({
      clashGroups: s.clashGroups.filter((g) => g.id !== id),
    })),

  // ── 4D Timeline actions ──

  setCurrentPhase: (phase) => set({ currentPhase: phase }),
  toggleTimeline: () => set((s) => ({ timelineActive: !s.timelineActive })),

  setComponentPhase: (componentId, phase) =>
    set((s) => {
      const newComponents = new Map(s.components);
      const comp = newComponents.get(componentId);
      if (comp) {
        newComponents.set(componentId, { ...comp, constructionPhase: phase });
      }
      return { components: newComponents };
    }),

  setComponentPhaseStatus: (componentId, status) =>
    set((s) => {
      const newComponents = new Map(s.components);
      const comp = newComponents.get(componentId);
      if (comp) {
        newComponents.set(componentId, { ...comp, phaseStatus: status });
      }
      return { components: newComponents };
    }),

  addPhase: (phase) =>
    set((s) => ({ phases: [...s.phases, phase] })),

  removePhase: (id) =>
    set((s) => ({ phases: s.phases.filter((p) => p.id !== id) })),
}));
