"use client";
import { create } from "zustand";

export type ConstraintType =
  | "coincident"
  | "parallel"
  | "perpendicular"
  | "tangent"
  | "equal"
  | "fix"
  | "horizontal"
  | "vertical"
  | "concentric"
  | "symmetric";

export type ConstraintStatus = "under" | "fully" | "over";

export interface GeometricConstraint {
  id: string;
  type: ConstraintType;
  entityIds: string[];
  value?: number;
  referenceAxis?: [number, number, number];
  locked: boolean;
  satisfied: boolean;
}

export interface ConstraintSolverResult {
  success: boolean;
  iterations: number;
  residual: number;
  status: ConstraintStatus;
}

interface ConstraintState {
  constraints: GeometricConstraint[];
  constraintStatus: ConstraintStatus;
  solverIterations: number;
  maxIterations: number;
  tolerance: number;
  showConstraints: boolean;
  selectedConstraintId: string | null;

  addConstraint: (constraint: Omit<GeometricConstraint, "id" | "locked" | "satisfied">) => string;
  removeConstraint: (id: string) => void;
  updateConstraint: (id: string, updates: Partial<GeometricConstraint>) => void;
  toggleConstraintLock: (id: string) => void;
  selectConstraint: (id: string | null) => void;
  setShowConstraints: (show: boolean) => void;
  clearConstraints: () => void;
  solveConstraints: (positions: Map<string, [number, number, number]>) => ConstraintSolverResult;
  getConstraintsForEntity: (entityId: string) => GeometricConstraint[];
  getConstraintStatus: () => ConstraintStatus;
}

let constraintCounter = 0;

export const useConstraintStore = create<ConstraintState>((set, get) => ({
  constraints: [],
  constraintStatus: "under",
  solverIterations: 0,
  maxIterations: 100,
  tolerance: 1e-6,
  showConstraints: true,
  selectedConstraintId: null,

  addConstraint: (constraint) => {
    const id = `constraint_${++constraintCounter}_${Date.now()}`;
    const newConstraint: GeometricConstraint = {
      ...constraint,
      id,
      locked: false,
      satisfied: false,
    };
    set((s) => ({
      constraints: [...s.constraints, newConstraint],
    }));
    // Re-evaluate status
    const state = get();
    const status = state.getConstraintStatus();
    set({ constraintStatus: status });
    return id;
  },

  removeConstraint: (id) => {
    set((s) => ({
      constraints: s.constraints.filter((c) => c.id !== id),
      selectedConstraintId: s.selectedConstraintId === id ? null : s.selectedConstraintId,
    }));
    const state = get();
    set({ constraintStatus: state.getConstraintStatus() });
  },

  updateConstraint: (id, updates) => {
    set((s) => ({
      constraints: s.constraints.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  },

  toggleConstraintLock: (id) => {
    set((s) => ({
      constraints: s.constraints.map((c) =>
        c.id === id ? { ...c, locked: !c.locked } : c
      ),
    }));
  },

  selectConstraint: (id) => set({ selectedConstraintId: id }),

  setShowConstraints: (show) => set({ showConstraints: show }),

  clearConstraints: () => set({ constraints: [], constraintStatus: "under", selectedConstraintId: null }),

  solveConstraints: (positions) => {
    const { constraints, maxIterations, tolerance } = get();
    if (constraints.length === 0) {
      return { success: true, iterations: 0, residual: 0, status: "under" as ConstraintStatus };
    }

    let iterations = 0;
    let residual = Infinity;

    // Iterative constraint solver using projection method
    for (let iter = 0; iter < maxIterations; iter++) {
      iterations = iter + 1;
      let maxResidual = 0;

      for (const constraint of constraints) {
        if (constraint.locked) continue;

        const entityPositions = constraint.entityIds
          .map((id) => positions.get(id))
          .filter(Boolean) as [number, number, number][];

        if (entityPositions.length < 1) continue;

        let constraintResidual = 0;

        switch (constraint.type) {
          case "coincident": {
            if (entityPositions.length >= 2) {
              const dx = entityPositions[1][0] - entityPositions[0][0];
              const dy = entityPositions[1][1] - entityPositions[0][1];
              const dz = entityPositions[1][2] - entityPositions[0][2];
              constraintResidual = Math.sqrt(dx * dx + dy * dy + dz * dz);

              if (constraintResidual > tolerance) {
                const mid: [number, number, number] = [
                  (entityPositions[0][0] + entityPositions[1][0]) / 2,
                  (entityPositions[0][1] + entityPositions[1][1]) / 2,
                  (entityPositions[0][2] + entityPositions[1][2]) / 2,
                ];
                positions.set(constraint.entityIds[0], mid);
                positions.set(constraint.entityIds[1], mid);
              }
            }
            break;
          }
          case "horizontal": {
            if (entityPositions.length >= 2) {
              constraintResidual = Math.abs(entityPositions[1][1] - entityPositions[0][1]);
              if (constraintResidual > tolerance) {
                const avgY = (entityPositions[0][1] + entityPositions[1][1]) / 2;
                positions.set(constraint.entityIds[0], [entityPositions[0][0], avgY, entityPositions[0][2]]);
                positions.set(constraint.entityIds[1], [entityPositions[1][0], avgY, entityPositions[1][2]]);
              }
            }
            break;
          }
          case "vertical": {
            if (entityPositions.length >= 2) {
              constraintResidual = Math.abs(entityPositions[1][0] - entityPositions[0][0]);
              if (constraintResidual > tolerance) {
                const avgX = (entityPositions[0][0] + entityPositions[1][0]) / 2;
                positions.set(constraint.entityIds[0], [avgX, entityPositions[0][1], entityPositions[0][2]]);
                positions.set(constraint.entityIds[1], [avgX, entityPositions[1][1], entityPositions[1][2]]);
              }
            }
            break;
          }
          case "fix": {
            constraintResidual = 0; // Fixed points have zero residual
            break;
          }
          case "equal": {
            if (entityPositions.length >= 2 && constraint.value !== undefined) {
              // Equal length constraint
              constraintResidual = 0;
            }
            break;
          }
          case "parallel": {
            constraintResidual = 0; // Simplified
            break;
          }
          case "perpendicular": {
            constraintResidual = 0; // Simplified
            break;
          }
          case "tangent": {
            constraintResidual = 0; // Simplified
            break;
          }
          case "concentric": {
            if (entityPositions.length >= 2) {
              const dx = entityPositions[1][0] - entityPositions[0][0];
              const dz = entityPositions[1][2] - entityPositions[0][2];
              constraintResidual = Math.sqrt(dx * dx + dz * dz);
              if (constraintResidual > tolerance) {
                const cx = (entityPositions[0][0] + entityPositions[1][0]) / 2;
                const cz = (entityPositions[0][2] + entityPositions[1][2]) / 2;
                positions.set(constraint.entityIds[0], [cx, entityPositions[0][1], cz]);
                positions.set(constraint.entityIds[1], [cx, entityPositions[1][1], cz]);
              }
            }
            break;
          }
          case "symmetric": {
            constraintResidual = 0; // Simplified
            break;
          }
        }

        maxResidual = Math.max(maxResidual, constraintResidual);
      }

      residual = maxResidual;
      if (residual < tolerance) break;
    }

    // Update constraint satisfaction
    const satisfied = residual < tolerance;
    set((s) => ({
      solverIterations: iterations,
      constraints: s.constraints.map((c) => ({ ...c, satisfied })),
    }));

    // Determine overall status
    const { constraints: updatedConstraints } = get();
    const totalEntities = new Set(updatedConstraints.flatMap((c) => c.entityIds)).size;
    const dof = totalEntities * 3; // 3 DOF per entity (x, y, z)
    const constraintCount = updatedConstraints.length;

    let status: ConstraintStatus;
    if (constraintCount < dof) {
      status = "under";
    } else if (constraintCount === dof) {
      status = "fully";
    } else {
      status = "over";
    }

    set({ constraintStatus: status });
    return { success: satisfied, iterations, residual, status };
  },

  getConstraintsForEntity: (entityId) => {
    return get().constraints.filter((c) => c.entityIds.includes(entityId));
  },

  getConstraintStatus: () => {
    const { constraints } = get();
    if (constraints.length === 0) return "under";
    const totalEntities = new Set(constraints.flatMap((c) => c.entityIds)).size;
    const dof = totalEntities * 3;
    if (constraints.length < dof) return "under";
    if (constraints.length === dof) return "fully";
    return "over";
  },
}));
