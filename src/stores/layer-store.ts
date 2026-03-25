"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  frozen: boolean;
  lineweight: number; // px
  linetype: "solid" | "dashed" | "dotted" | "dashdot" | "center" | "phantom";
  opacity: number; // 0-1
}

const DEFAULT_COLORS = [
  "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00",
  "#ff00ff", "#00ffff", "#ff8800", "#88ff00", "#8800ff",
  "#ff0088", "#0088ff",
];

let layerIdCounter = 1;

function createLayerId(): string {
  return `layer_${Date.now()}_${layerIdCounter++}`;
}

interface LayerState {
  layers: Layer[];
  activeLayerId: string;

  addLayer: (name?: string) => string;
  deleteLayer: (id: string) => void;
  renameLayer: (id: string, name: string) => void;
  setLayerColor: (id: string, color: string) => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  toggleFreeze: (id: string) => void;
  setLineweight: (id: string, weight: number) => void;
  setLinetype: (id: string, linetype: Layer["linetype"]) => void;
  setOpacity: (id: string, opacity: number) => void;
  setActiveLayer: (id: string) => void;
  getActiveLayer: () => Layer;
  getLayerById: (id: string) => Layer | undefined;
  reorderLayer: (id: string, newIndex: number) => void;
}

const defaultLayer: Layer = {
  id: "layer_0",
  name: "0",
  color: "#ffffff",
  visible: true,
  locked: false,
  frozen: false,
  lineweight: 1,
  linetype: "solid",
  opacity: 1,
};

const defectsLayer: Layer = {
  id: "layer_defpoints",
  name: "Defpoints",
  color: "#888888",
  visible: true,
  locked: false,
  frozen: false,
  lineweight: 0.5,
  linetype: "solid",
  opacity: 0.5,
};

export const useLayerStore = create<LayerState>()(
  persist(
    (set, get) => ({
      layers: [defaultLayer, defectsLayer],
      activeLayerId: "layer_0",

      addLayer: (name?: string) => {
        const id = createLayerId();
        const layers = get().layers;
        const colorIdx = layers.length % DEFAULT_COLORS.length;
        const layerName = name || `Layer ${layers.length}`;
        const newLayer: Layer = {
          id,
          name: layerName,
          color: DEFAULT_COLORS[colorIdx],
          visible: true,
          locked: false,
          frozen: false,
          lineweight: 1,
          linetype: "solid",
          opacity: 1,
        };
        set({ layers: [...layers, newLayer] });
        return id;
      },

      deleteLayer: (id: string) => {
        const { layers, activeLayerId } = get();
        // Cannot delete layer 0 or if only one layer remains
        if (id === "layer_0" || layers.length <= 1) return;
        const filtered = layers.filter((l) => l.id !== id);
        const newActive = id === activeLayerId ? filtered[0].id : activeLayerId;
        set({ layers: filtered, activeLayerId: newActive });
      },

      renameLayer: (id: string, name: string) => {
        set({
          layers: get().layers.map((l) =>
            l.id === id ? { ...l, name } : l
          ),
        });
      },

      setLayerColor: (id: string, color: string) => {
        set({
          layers: get().layers.map((l) =>
            l.id === id ? { ...l, color } : l
          ),
        });
      },

      toggleVisibility: (id: string) => {
        set({
          layers: get().layers.map((l) =>
            l.id === id ? { ...l, visible: !l.visible } : l
          ),
        });
      },

      toggleLock: (id: string) => {
        set({
          layers: get().layers.map((l) =>
            l.id === id ? { ...l, locked: !l.locked } : l
          ),
        });
      },

      toggleFreeze: (id: string) => {
        // Cannot freeze active layer
        if (id === get().activeLayerId) return;
        set({
          layers: get().layers.map((l) =>
            l.id === id ? { ...l, frozen: !l.frozen } : l
          ),
        });
      },

      setLineweight: (id: string, weight: number) => {
        set({
          layers: get().layers.map((l) =>
            l.id === id ? { ...l, lineweight: weight } : l
          ),
        });
      },

      setLinetype: (id: string, linetype: Layer["linetype"]) => {
        set({
          layers: get().layers.map((l) =>
            l.id === id ? { ...l, linetype } : l
          ),
        });
      },

      setOpacity: (id: string, opacity: number) => {
        set({
          layers: get().layers.map((l) =>
            l.id === id ? { ...l, opacity: Math.max(0, Math.min(1, opacity)) } : l
          ),
        });
      },

      setActiveLayer: (id: string) => {
        const layer = get().layers.find((l) => l.id === id);
        if (layer && !layer.frozen && !layer.locked) {
          set({ activeLayerId: id });
        }
      },

      getActiveLayer: () => {
        const { layers, activeLayerId } = get();
        return layers.find((l) => l.id === activeLayerId) || layers[0];
      },

      getLayerById: (id: string) => {
        return get().layers.find((l) => l.id === id);
      },

      reorderLayer: (id: string, newIndex: number) => {
        const layers = [...get().layers];
        const oldIndex = layers.findIndex((l) => l.id === id);
        if (oldIndex === -1 || newIndex < 0 || newIndex >= layers.length) return;
        const [moved] = layers.splice(oldIndex, 1);
        layers.splice(newIndex, 0, moved);
        set({ layers });
      },
    }),
    { name: "shilpasutra-layers" }
  )
);
