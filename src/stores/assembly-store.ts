"use client";
import { create } from "zustand";
import {
  type MateType,
  type AssemblyMate,
  type AssemblyPart,
  type MateFace,
  type MateResult,
  solveMates,
  evaluateMateResidual,
} from "@/lib/mate-solver";

// ───────────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────────

export type MateStatus = "satisfied" | "unsatisfied" | "suppressed" | "error";

export type DiagnosticLevel = "ok" | "under-defined" | "over-defined" | "conflicting";

export interface MateDiagnostic {
  level: DiagnosticLevel;
  message: string;
  affectedMateIds: string[];
  affectedPartIds: string[];
}

export interface ComponentPattern {
  id: string;
  type: "linear" | "circular";
  sourcePartIds: string[];
  count: number;
  // Linear pattern
  direction?: [number, number, number];
  spacing?: number;
  // Circular pattern
  axis?: [number, number, number];
  axisPoint?: [number, number, number];
  totalAngle?: number; // degrees
  instances: string[][]; // array of partId arrays per instance
}

export interface AssemblyState {
  // Parts
  parts: Map<string, AssemblyPart>;
  selectedPartId: string | null;

  // Mates
  mates: AssemblyMate[];
  selectedMateId: string | null;

  // Entity picking for mate creation
  pickingMode: boolean;
  pickedFace1: MateFace | null;
  pickedFace2: MateFace | null;
  pendingMateType: MateType;
  pendingMateValue: number;

  // Solver state
  lastSolveResult: MateResult | null;
  autoSolve: boolean;

  // Diagnostics
  diagnostics: MateDiagnostic[];

  // Component patterns
  patterns: ComponentPattern[];

  // Visibility
  showMateIndicators: boolean;
  showDiagnostics: boolean;

  // ── Part actions ──
  addPart: (part: AssemblyPart) => void;
  removePart: (id: string) => void;
  updatePart: (id: string, updates: Partial<AssemblyPart>) => void;
  selectPart: (id: string | null) => void;
  togglePartFixed: (id: string) => void;

  // ── Mate actions ──
  addMate: (mate: Omit<AssemblyMate, "id" | "satisfied">) => string;
  removeMate: (id: string) => void;
  updateMate: (id: string, updates: Partial<AssemblyMate>) => void;
  selectMate: (id: string | null) => void;
  suppressMate: (id: string) => void;
  unsuppressMate: (id: string) => void;

  // ── Entity picking ──
  startPicking: (mateType: MateType) => void;
  cancelPicking: () => void;
  pickFace: (face: MateFace) => void;
  setPendingMateType: (type: MateType) => void;
  setPendingMateValue: (value: number) => void;
  confirmMate: () => string | null;

  // ── Solver ──
  solve: () => MateResult;
  setAutoSolve: (v: boolean) => void;

  // ── Diagnostics ──
  runDiagnostics: () => MateDiagnostic[];

  // ── Patterns ──
  addLinearPattern: (sourcePartIds: string[], direction: [number, number, number], spacing: number, count: number) => string;
  addCircularPattern: (sourcePartIds: string[], axis: [number, number, number], axisPoint: [number, number, number], totalAngle: number, count: number) => string;
  removePattern: (id: string) => void;

  // ── Visibility ──
  setShowMateIndicators: (v: boolean) => void;
  setShowDiagnostics: (v: boolean) => void;

  // ── Utility ──
  getMatesForPart: (partId: string) => AssemblyMate[];
  getMateStatus: (mateId: string) => MateStatus;
  clearAll: () => void;
}

// ───────────────────────────────────────────────────────────────────────────────
// Counter
// ───────────────────────────────────────────────────────────────────────────────

let mateCounter = 0;
let patternCounter = 0;

// ───────────────────────────────────────────────────────────────────────────────
// Store
// ───────────────────────────────────────────────────────────────────────────────

export const useAssemblyStore = create<AssemblyState>((set, get) => ({
  parts: new Map(),
  selectedPartId: null,

  mates: [],
  selectedMateId: null,

  pickingMode: false,
  pickedFace1: null,
  pickedFace2: null,
  pendingMateType: "coincident",
  pendingMateValue: 0,

  lastSolveResult: null,
  autoSolve: true,

  diagnostics: [],

  patterns: [],

  showMateIndicators: true,
  showDiagnostics: true,

  // ── Part actions ──────────────────────────────────────────────────────────

  addPart: (part) => {
    set((s) => {
      const newParts = new Map(s.parts);
      newParts.set(part.id, { ...part });
      return { parts: newParts };
    });
  },

  removePart: (id) => {
    set((s) => {
      const newParts = new Map(s.parts);
      newParts.delete(id);
      const newMates = s.mates.filter(
        (m) => m.face1.partId !== id && m.face2.partId !== id
      );
      return {
        parts: newParts,
        mates: newMates,
        selectedPartId: s.selectedPartId === id ? null : s.selectedPartId,
      };
    });
  },

  updatePart: (id, updates) => {
    set((s) => {
      const newParts = new Map(s.parts);
      const existing = newParts.get(id);
      if (existing) {
        newParts.set(id, { ...existing, ...updates });
      }
      return { parts: newParts };
    });
  },

  selectPart: (id) => set({ selectedPartId: id }),

  togglePartFixed: (id) => {
    set((s) => {
      const newParts = new Map(s.parts);
      const part = newParts.get(id);
      if (part) {
        newParts.set(id, { ...part, fixed: !part.fixed });
      }
      return { parts: newParts };
    });
  },

  // ── Mate actions ──────────────────────────────────────────────────────────

  addMate: (mate) => {
    const id = `mate_${++mateCounter}_${Date.now()}`;
    const newMate: AssemblyMate = { ...mate, id, satisfied: false };
    set((s) => ({ mates: [...s.mates, newMate] }));

    const state = get();
    if (state.autoSolve) {
      state.solve();
    }
    return id;
  },

  removeMate: (id) => {
    set((s) => ({
      mates: s.mates.filter((m) => m.id !== id),
      selectedMateId: s.selectedMateId === id ? null : s.selectedMateId,
    }));
  },

  updateMate: (id, updates) => {
    set((s) => ({
      mates: s.mates.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
    const state = get();
    if (state.autoSolve) {
      state.solve();
    }
  },

  selectMate: (id) => set({ selectedMateId: id }),

  suppressMate: (id) => {
    set((s) => ({
      mates: s.mates.map((m) =>
        m.id === id ? { ...m, suppressed: true } : m
      ),
    }));
  },

  unsuppressMate: (id) => {
    set((s) => ({
      mates: s.mates.map((m) =>
        m.id === id ? { ...m, suppressed: false } : m
      ),
    }));
    const state = get();
    if (state.autoSolve) {
      state.solve();
    }
  },

  // ── Entity picking ────────────────────────────────────────────────────────

  startPicking: (mateType) => {
    set({
      pickingMode: true,
      pickedFace1: null,
      pickedFace2: null,
      pendingMateType: mateType,
    });
  },

  cancelPicking: () => {
    set({
      pickingMode: false,
      pickedFace1: null,
      pickedFace2: null,
    });
  },

  pickFace: (face) => {
    const { pickedFace1 } = get();
    if (!pickedFace1) {
      set({ pickedFace1: face });
    } else {
      set({ pickedFace2: face });
    }
  },

  setPendingMateType: (type) => set({ pendingMateType: type }),
  setPendingMateValue: (value) => set({ pendingMateValue: value }),

  confirmMate: () => {
    const { pickedFace1, pickedFace2, pendingMateType, pendingMateValue } = get();
    if (!pickedFace1 || !pickedFace2) return null;

    const id = get().addMate({
      type: pendingMateType,
      face1: pickedFace1,
      face2: pickedFace2,
      value: pendingMateValue,
      suppressed: false,
    });

    set({
      pickingMode: false,
      pickedFace1: null,
      pickedFace2: null,
    });

    return id;
  },

  // ── Solver ────────────────────────────────────────────────────────────────

  solve: () => {
    const { mates, parts } = get();
    const workingParts = new Map<string, AssemblyPart>();
    parts.forEach((part, id) => {
      workingParts.set(id, {
        ...part,
        position: [...part.position],
        rotation: [...part.rotation],
      });
    });

    const result = solveMates(mates, workingParts);

    // Write solved positions back
    set((s) => {
      const newParts = new Map(s.parts);
      workingParts.forEach((solvedPart, id) => {
        const existing = newParts.get(id);
        if (existing) {
          newParts.set(id, {
            ...existing,
            position: [...solvedPart.position],
            rotation: [...solvedPart.rotation],
          });
        }
      });
      return {
        parts: newParts,
        lastSolveResult: result,
        mates: s.mates.map((m) => {
          const activeMate = mates.find((am) => am.id === m.id);
          return activeMate ? { ...m, satisfied: activeMate.satisfied } : m;
        }),
      };
    });

    return result;
  },

  setAutoSolve: (v) => set({ autoSolve: v }),

  // ── Diagnostics ───────────────────────────────────────────────────────────

  runDiagnostics: () => {
    const { mates, parts } = get();
    const diagnostics: MateDiagnostic[] = [];

    const activeMates = mates.filter((m) => !m.suppressed);

    // 1. Check per-part constraint count
    const partMateCount = new Map<string, string[]>();
    for (const mate of activeMates) {
      const p1Mates = partMateCount.get(mate.face1.partId) ?? [];
      p1Mates.push(mate.id);
      partMateCount.set(mate.face1.partId, p1Mates);

      const p2Mates = partMateCount.get(mate.face2.partId) ?? [];
      p2Mates.push(mate.id);
      partMateCount.set(mate.face2.partId, p2Mates);
    }

    // Under-defined: movable parts with < 1 mate
    parts.forEach((part, partId) => {
      if (part.fixed) return;
      const mateIds = partMateCount.get(partId) ?? [];
      if (mateIds.length === 0) {
        diagnostics.push({
          level: "under-defined",
          message: `Part "${part.name}" has no mates and is free to move.`,
          affectedMateIds: [],
          affectedPartIds: [partId],
        });
      }
    });

    // Over-defined: part with > 6 constraints (6 DOF in 3D)
    partMateCount.forEach((mateIds, partId) => {
      const part = parts.get(partId);
      if (!part || part.fixed) return;
      if (mateIds.length > 6) {
        diagnostics.push({
          level: "over-defined",
          message: `Part "${part.name}" has ${mateIds.length} mates, which may over-constrain it (6 DOF max).`,
          affectedMateIds: mateIds,
          affectedPartIds: [partId],
        });
      }
    });

    // Conflicting: unsatisfied mates after solve
    const unsatisfied = activeMates.filter((m) => !m.satisfied);
    if (unsatisfied.length > 0) {
      const residuals = unsatisfied.map((m) => {
        const r = evaluateMateResidual(m, parts);
        return { mate: m, residual: r };
      });

      for (const { mate, residual } of residuals) {
        if (residual > 1e-3) {
          diagnostics.push({
            level: "conflicting",
            message: `Mate "${mate.type}" (${mate.id}) has residual ${residual.toFixed(6)} — may conflict with other mates.`,
            affectedMateIds: [mate.id],
            affectedPartIds: [mate.face1.partId, mate.face2.partId],
          });
        }
      }
    }

    // All OK
    if (diagnostics.length === 0) {
      diagnostics.push({
        level: "ok",
        message: "Assembly is fully defined with no conflicts.",
        affectedMateIds: [],
        affectedPartIds: [],
      });
    }

    set({ diagnostics });
    return diagnostics;
  },

  // ── Patterns ──────────────────────────────────────────────────────────────

  addLinearPattern: (sourcePartIds, direction, spacing, count) => {
    const id = `pattern_${++patternCounter}_${Date.now()}`;
    const instances: string[][] = [];

    const state = get();
    for (let i = 1; i < count; i++) {
      const instancePartIds: string[] = [];
      for (const srcId of sourcePartIds) {
        const srcPart = state.parts.get(srcId);
        if (!srcPart) continue;
        const newPartId = `${srcId}_lp_${i}`;
        const newPart: AssemblyPart = {
          ...srcPart,
          id: newPartId,
          name: `${srcPart.name} (LP ${i + 1})`,
          position: [
            srcPart.position[0] + direction[0] * spacing * i,
            srcPart.position[1] + direction[1] * spacing * i,
            srcPart.position[2] + direction[2] * spacing * i,
          ],
          fixed: false,
        };
        state.addPart(newPart);
        instancePartIds.push(newPartId);
      }
      instances.push(instancePartIds);
    }

    const pattern: ComponentPattern = {
      id,
      type: "linear",
      sourcePartIds,
      count,
      direction,
      spacing,
      instances,
    };
    set((s) => ({ patterns: [...s.patterns, pattern] }));
    return id;
  },

  addCircularPattern: (sourcePartIds, axis, axisPoint, totalAngle, count) => {
    const id = `pattern_${++patternCounter}_${Date.now()}`;
    const instances: string[][] = [];
    const angleStep = (totalAngle / count) * (Math.PI / 180);

    const state = get();
    for (let i = 1; i < count; i++) {
      const angle = angleStep * i;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const instancePartIds: string[] = [];

      for (const srcId of sourcePartIds) {
        const srcPart = state.parts.get(srcId);
        if (!srcPart) continue;

        // Rotate position around axis
        const dx = srcPart.position[0] - axisPoint[0];
        const dy = srcPart.position[1] - axisPoint[1];
        const dz = srcPart.position[2] - axisPoint[2];

        // Simplified rotation around Y axis (most common)
        const newPartId = `${srcId}_cp_${i}`;
        const newPart: AssemblyPart = {
          ...srcPart,
          id: newPartId,
          name: `${srcPart.name} (CP ${i + 1})`,
          position: [
            axisPoint[0] + dx * cos - dz * sin,
            axisPoint[1] + dy,
            axisPoint[2] + dx * sin + dz * cos,
          ],
          rotation: [
            srcPart.rotation[0],
            srcPart.rotation[1] + angle,
            srcPart.rotation[2],
          ],
          fixed: false,
        };
        state.addPart(newPart);
        instancePartIds.push(newPartId);
      }
      instances.push(instancePartIds);
    }

    const pattern: ComponentPattern = {
      id,
      type: "circular",
      sourcePartIds,
      count,
      axis,
      axisPoint,
      totalAngle,
      instances,
    };
    set((s) => ({ patterns: [...s.patterns, pattern] }));
    return id;
  },

  removePattern: (id) => {
    const state = get();
    const pattern = state.patterns.find((p) => p.id === id);
    if (pattern) {
      // Remove all instanced parts
      for (const instanceParts of pattern.instances) {
        for (const partId of instanceParts) {
          state.removePart(partId);
        }
      }
    }
    set((s) => ({ patterns: s.patterns.filter((p) => p.id !== id) }));
  },

  // ── Visibility ────────────────────────────────────────────────────────────

  setShowMateIndicators: (v) => set({ showMateIndicators: v }),
  setShowDiagnostics: (v) => set({ showDiagnostics: v }),

  // ── Utility ───────────────────────────────────────────────────────────────

  getMatesForPart: (partId) => {
    return get().mates.filter(
      (m) => m.face1.partId === partId || m.face2.partId === partId
    );
  },

  getMateStatus: (mateId) => {
    const mate = get().mates.find((m) => m.id === mateId);
    if (!mate) return "error";
    if (mate.suppressed) return "suppressed";
    if (mate.satisfied) return "satisfied";
    return "unsatisfied";
  },

  clearAll: () => {
    set({
      parts: new Map(),
      mates: [],
      patterns: [],
      diagnostics: [],
      selectedPartId: null,
      selectedMateId: null,
      lastSolveResult: null,
      pickingMode: false,
      pickedFace1: null,
      pickedFace2: null,
    });
  },
}));
