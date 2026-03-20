"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SettingsState {
  // General
  theme: "dark" | "light" | "system";
  language: string;
  autoSaveInterval: string;
  defaultUnits: string;
  angleUnits: string;

  // Viewport
  gridSize: number;
  snapPrecision: number;
  bgColor: string;
  antiAliasing: string;
  showGrid: boolean;
  showAxes: boolean;
  perspectiveMode: string;

  // AI
  aiModel: string;
  apiKeyAnthropic: string;
  apiKeyOpenAI: string;
  apiKeyGoogle: string;
  temperature: number;
  maxTokens: number;

  // Export
  defaultExportFormat: string;
  meshQuality: string;
  includeMetadata: boolean;

  // Actions
  update: (partial: Partial<Omit<SettingsState, "update" | "reset">>) => void;
  reset: () => void;
}

const defaultSettings = {
  theme: "dark" as const,
  language: "en",
  autoSaveInterval: "5min",
  defaultUnits: "mm",
  angleUnits: "deg",
  gridSize: 10,
  snapPrecision: 1,
  bgColor: "#0d1117",
  antiAliasing: "high",
  showGrid: true,
  showAxes: true,
  perspectiveMode: "perspective",
  aiModel: "claude-sonnet",
  apiKeyAnthropic: "",
  apiKeyOpenAI: "",
  apiKeyGoogle: "",
  temperature: 0.7,
  maxTokens: 4096,
  defaultExportFormat: "STEP",
  meshQuality: "medium",
  includeMetadata: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      update: (partial) => set(partial),
      reset: () => set(defaultSettings),
    }),
    { name: "shilpasutra-settings" }
  )
);
