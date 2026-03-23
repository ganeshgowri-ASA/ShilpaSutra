"use client";
import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

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
  | "symmetric"
  | "distance"
  | "angle"
  | "radius"
  | "diameter"
  | "midpoint";

export type ConstraintStatus = "under" | "fully" | "over";

export interface GeometricConstraint {
  id: string;
  type: ConstraintType;
  entityIds: string[];
  /** Legacy / general purpose numeric value. */
  value?: number;
  /** Dimensional target for distance / angle / radius / diameter constraints. */
  targetValue?: number;
  /** Reference axis for symmetric constraints (unit vector). */
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

export interface ConstraintConflict {
  constraintIds: string[];
  description: string;
}

export interface InferredConstraint {
  type: ConstraintType;
  entityIds: string[];
  confidence: number;
  description: string;
}

// ---------------------------------------------------------------------------
// Vector helpers (3-component)
// ---------------------------------------------------------------------------

type Vec3 = [number, number, number];

function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vec3Scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function vec3Dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function vec3Cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function vec3Len(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function vec3Normalize(v: Vec3): Vec3 {
  const l = vec3Len(v);
  if (l < 1e-15) return [0, 0, 0];
  return [v[0] / l, v[1] / l, v[2] / l];
}

function vec3Dist(a: Vec3, b: Vec3): number {
  return vec3Len(vec3Sub(a, b));
}

function vec3Mid(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

// ---------------------------------------------------------------------------
// Gauss-Newton Constraint Solver
// ---------------------------------------------------------------------------

/**
 * Evaluates the scalar residual for a single constraint given entity positions.
 * Returns the residual value — zero means fully satisfied.
 */
function evaluateConstraintResidual(
  constraint: GeometricConstraint,
  positions: Map<string, Vec3>
): number {
  const pts = constraint.entityIds
    .map((id) => positions.get(id))
    .filter(Boolean) as Vec3[];

  switch (constraint.type) {
    // ----- Point-point constraints -----
    case "coincident": {
      if (pts.length < 2) return 0;
      return vec3Dist(pts[0], pts[1]);
    }

    case "horizontal": {
      if (pts.length < 2) return 0;
      return Math.abs(pts[1][1] - pts[0][1]);
    }

    case "vertical": {
      if (pts.length < 2) return 0;
      return Math.abs(pts[1][0] - pts[0][0]);
    }

    case "fix": {
      // Fixed point — residual is always 0 (position is not changed)
      return 0;
    }

    case "concentric": {
      if (pts.length < 2) return 0;
      const dx = pts[1][0] - pts[0][0];
      const dz = pts[1][2] - pts[0][2];
      return Math.sqrt(dx * dx + dz * dz);
    }

    // ----- Line-line constraints (4 points: p0, p1, p2, p3) -----
    case "parallel": {
      // entityIds: [lineA_start, lineA_end, lineB_start, lineB_end]
      if (pts.length < 4) return 0;
      const dA = vec3Sub(pts[1], pts[0]);
      const dB = vec3Sub(pts[3], pts[2]);
      const cross = vec3Cross(dA, dB);
      return vec3Len(cross);
    }

    case "perpendicular": {
      if (pts.length < 4) return 0;
      const dirA = vec3Sub(pts[1], pts[0]);
      const dirB = vec3Sub(pts[3], pts[2]);
      return Math.abs(vec3Dot(dirA, dirB));
    }

    case "tangent": {
      // entityIds: [circle_center, circle_radius_point, line_start, line_end]
      // Tangency: distance from center to line equals radius.
      if (pts.length < 4) return 0;
      const center = pts[0];
      const radiusPt = pts[1];
      const r = vec3Dist(center, radiusPt);
      const lineDir = vec3Sub(pts[3], pts[2]);
      const lineLen = vec3Len(lineDir);
      if (lineLen < 1e-15) return 0;
      const toCenter = vec3Sub(center, pts[2]);
      const crossT = vec3Cross(toCenter, lineDir);
      const distToLine = vec3Len(crossT) / lineLen;
      return Math.abs(distToLine - r);
    }

    case "symmetric": {
      // entityIds: [pointA, pointB, axis_start, axis_end]
      // Points A and B should be mirror images about the axis.
      if (pts.length < 4) return 0;
      const axisDir = vec3Normalize(vec3Sub(pts[3], pts[2]));
      const midAB = vec3Mid(pts[0], pts[1]);
      // Midpoint should lie on the axis line
      const toMid = vec3Sub(midAB, pts[2]);
      const crossS = vec3Cross(toMid, axisDir);
      const midOffAxis = vec3Len(crossS);
      // The vector A->B should be perpendicular to axis
      const ab = vec3Sub(pts[1], pts[0]);
      const dotPerp = Math.abs(vec3Dot(ab, axisDir));
      return midOffAxis + dotPerp;
    }

    case "equal": {
      // entityIds: [segA_start, segA_end, segB_start, segB_end]
      if (pts.length < 4) return 0;
      const lenA = vec3Dist(pts[0], pts[1]);
      const lenB = vec3Dist(pts[2], pts[3]);
      return Math.abs(lenA - lenB);
    }

    // ----- Dimensional constraints -----
    case "distance": {
      if (pts.length < 2) return 0;
      const target = constraint.targetValue ?? constraint.value ?? 0;
      return Math.abs(vec3Dist(pts[0], pts[1]) - target);
    }

    case "angle": {
      // entityIds: [segA_start, segA_end, segB_start, segB_end]
      if (pts.length < 4) return 0;
      const dAng1 = vec3Sub(pts[1], pts[0]);
      const dAng2 = vec3Sub(pts[3], pts[2]);
      const l1 = vec3Len(dAng1);
      const l2 = vec3Len(dAng2);
      if (l1 < 1e-15 || l2 < 1e-15) return 0;
      const cosAngle = Math.max(-1, Math.min(1, vec3Dot(dAng1, dAng2) / (l1 * l2)));
      const currentAngle = Math.acos(cosAngle) * (180 / Math.PI);
      const target = constraint.targetValue ?? constraint.value ?? 0;
      return Math.abs(currentAngle - target);
    }

    case "radius": {
      // entityIds: [center, point_on_circle]
      if (pts.length < 2) return 0;
      const target = constraint.targetValue ?? constraint.value ?? 0;
      return Math.abs(vec3Dist(pts[0], pts[1]) - target);
    }

    case "diameter": {
      // entityIds: [center, point_on_circle]
      if (pts.length < 2) return 0;
      const target = constraint.targetValue ?? constraint.value ?? 0;
      return Math.abs(vec3Dist(pts[0], pts[1]) * 2 - target);
    }

    case "midpoint": {
      // entityIds: [midpoint, seg_start, seg_end]
      if (pts.length < 3) return 0;
      const expected = vec3Mid(pts[1], pts[2]);
      return vec3Dist(pts[0], expected);
    }

    default:
      return 0;
  }
}

/**
 * Applies a single Gauss-Newton correction step for a constraint, mutating
 * the positions map in-place. Uses finite-difference Jacobian computation
 * and applies a damped correction.
 */
function applyConstraintCorrection(
  constraint: GeometricConstraint,
  positions: Map<string, Vec3>,
  fixedIds: Set<string>,
  damping: number
): number {
  const residual = evaluateConstraintResidual(constraint, positions);
  if (residual < 1e-12) return 0;

  const epsilon = 1e-8;
  const movableIds = constraint.entityIds.filter((id) => !fixedIds.has(id) && positions.has(id));
  if (movableIds.length === 0) return residual;

  // Build Jacobian row (partial derivatives of residual w.r.t. each DOF)
  const jacobian: number[] = [];
  const dofIds: { entityId: string; component: number }[] = [];

  for (const entityId of movableIds) {
    const pos = positions.get(entityId)!;
    for (let c = 0; c < 3; c++) {
      const original = pos[c];

      // Forward perturbation
      pos[c] = original + epsilon;
      positions.set(entityId, [...pos] as Vec3);
      const rPlus = evaluateConstraintResidual(constraint, positions);

      // Backward perturbation
      pos[c] = original - epsilon;
      positions.set(entityId, [...pos] as Vec3);
      const rMinus = evaluateConstraintResidual(constraint, positions);

      // Restore
      pos[c] = original;
      positions.set(entityId, [...pos] as Vec3);

      const drdx = (rPlus - rMinus) / (2 * epsilon);
      jacobian.push(drdx);
      dofIds.push({ entityId, component: c });
    }
  }

  // Gauss-Newton step: delta = J^T * r / (J^T * J + lambda)
  const jtj = jacobian.reduce((sum, j) => sum + j * j, 0);
  if (jtj < 1e-20) return residual;

  // Levenberg-Marquardt style regularization
  const lambda = 1e-6;
  const scale = damping * residual / (jtj + lambda);

  for (let i = 0; i < dofIds.length; i++) {
    const { entityId, component } = dofIds[i];
    const pos = positions.get(entityId)!;
    const correction = -jacobian[i] * scale;
    pos[component] += correction;
    positions.set(entityId, [...pos] as Vec3);
  }

  return evaluateConstraintResidual(constraint, positions);
}

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

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
  solveConstraints: (positions: Map<string, Vec3>) => ConstraintSolverResult;
  getConstraintsForEntity: (entityId: string) => GeometricConstraint[];
  getConstraintStatus: () => ConstraintStatus;
  detectConflicts: () => ConstraintConflict[];
  inferConstraints: (
    positions: Map<string, Vec3>,
    segments?: Array<{ id: string; startId: string; endId: string }>
  ) => InferredConstraint[];
}

// ---------------------------------------------------------------------------
// Counter
// ---------------------------------------------------------------------------

let constraintCounter = 0;

// ---------------------------------------------------------------------------
// Zustand Store
// ---------------------------------------------------------------------------

export const useConstraintStore = create<ConstraintState>((set, get) => ({
  constraints: [],
  constraintStatus: "under",
  solverIterations: 0,
  maxIterations: 100,
  tolerance: 1e-6,
  showConstraints: true,
  selectedConstraintId: null,

  // -----------------------------------------------------------------------
  // CRUD
  // -----------------------------------------------------------------------

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

  clearConstraints: () =>
    set({ constraints: [], constraintStatus: "under", selectedConstraintId: null }),

  // -----------------------------------------------------------------------
  // Gauss-Newton Iterative Constraint Solver
  // -----------------------------------------------------------------------

  solveConstraints: (positions) => {
    const { constraints, maxIterations, tolerance } = get();
    if (constraints.length === 0) {
      return { success: true, iterations: 0, residual: 0, status: "under" as ConstraintStatus };
    }

    // Collect fixed entity IDs (from "fix" constraints)
    const fixedIds = new Set<string>();
    for (const c of constraints) {
      if (c.type === "fix") {
        for (const eid of c.entityIds) fixedIds.add(eid);
      }
    }

    let iterations = 0;
    let globalResidual = Infinity;

    // Adaptive damping — start strong, ease off as we converge
    const baseDamping = 0.8;

    for (let iter = 0; iter < maxIterations; iter++) {
      iterations = iter + 1;
      let maxRes = 0;

      // Damping decreases slightly per iteration for stability
      const damping = baseDamping * Math.max(0.3, 1 - iter / maxIterations);

      for (const constraint of constraints) {
        if (constraint.locked) continue;

        const res = applyConstraintCorrection(constraint, positions, fixedIds, damping);
        maxRes = Math.max(maxRes, res);
      }

      globalResidual = maxRes;
      if (globalResidual < tolerance) break;
    }

    // Update per-constraint satisfaction
    const satisfiedMap = new Map<string, boolean>();
    for (const c of constraints) {
      const res = evaluateConstraintResidual(c, positions);
      satisfiedMap.set(c.id, res < tolerance);
    }

    set((s) => ({
      solverIterations: iterations,
      constraints: s.constraints.map((c) => ({
        ...c,
        satisfied: satisfiedMap.get(c.id) ?? c.satisfied,
      })),
    }));

    // Determine DOF-based status
    const { constraints: updated } = get();
    const totalEntities = new Set(updated.flatMap((c) => c.entityIds)).size;
    const dof = totalEntities * 3;
    const constraintCount = updated.length;

    let status: ConstraintStatus;
    if (constraintCount < dof) {
      status = "under";
    } else if (constraintCount === dof) {
      status = "fully";
    } else {
      status = "over";
    }

    set({ constraintStatus: status });
    return { success: globalResidual < tolerance, iterations, residual: globalResidual, status };
  },

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

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

  // -----------------------------------------------------------------------
  // Conflict Detection
  // -----------------------------------------------------------------------

  detectConflicts: () => {
    const { constraints } = get();
    const conflicts: ConstraintConflict[] = [];

    // Build entity → constraints index
    const entityConstraints = new Map<string, GeometricConstraint[]>();
    for (const c of constraints) {
      for (const eid of c.entityIds) {
        const list = entityConstraints.get(eid) ?? [];
        list.push(c);
        entityConstraints.set(eid, list);
      }
    }

    // 1. Detect contradictory directional constraints on same pair
    const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    const pairConstraints = new Map<string, GeometricConstraint[]>();
    for (const c of constraints) {
      if (c.entityIds.length >= 2) {
        const key = pairKey(c.entityIds[0], c.entityIds[1]);
        const list = pairConstraints.get(key) ?? [];
        list.push(c);
        pairConstraints.set(key, list);
      }
    }

    pairConstraints.forEach((cList, pair) => {
      const types = cList.map((c) => c.type);

      // Horizontal + Vertical on same pair → conflict unless coincident
      if (types.includes("horizontal") && types.includes("vertical") && !types.includes("coincident")) {
        conflicts.push({
          constraintIds: cList.filter((c) => c.type === "horizontal" || c.type === "vertical").map((c) => c.id),
          description: `Horizontal and vertical constraints on same point pair (${pair}) without coincident — may over-constrain.`,
        });
      }

      // Parallel + Perpendicular on same segments
      if (types.includes("parallel") && types.includes("perpendicular")) {
        conflicts.push({
          constraintIds: cList.filter((c) => c.type === "parallel" || c.type === "perpendicular").map((c) => c.id),
          description: `Parallel and perpendicular constraints on the same segments (${pair}) are contradictory.`,
        });
      }

      // Multiple distance constraints with different targets
      const distConstraints = cList.filter((c) => c.type === "distance");
      if (distConstraints.length > 1) {
        const targets = distConstraints.map((c) => c.targetValue ?? c.value ?? 0);
        const allSame = targets.every((t) => Math.abs(t - targets[0]) < 1e-10);
        if (!allSame) {
          conflicts.push({
            constraintIds: distConstraints.map((c) => c.id),
            description: `Multiple distance constraints on the same pair (${pair}) with different target values.`,
          });
        }
      }
    });

    // 2. Detect fix + movement constraints
    const fixedEntities = new Set<string>();
    for (const c of constraints) {
      if (c.type === "fix") {
        for (const eid of c.entityIds) fixedEntities.add(eid);
      }
    }

    for (const c of constraints) {
      if (c.type === "fix") continue;
      const affectsFixed = c.entityIds.filter((eid) => fixedEntities.has(eid));
      // If ALL entities in the constraint are fixed, the constraint might conflict
      if (affectsFixed.length === c.entityIds.length && c.entityIds.length >= 2) {
        conflicts.push({
          constraintIds: [c.id],
          description: `Constraint "${c.type}" (${c.id}) acts on entities that are all fixed — may be unsatisfiable.`,
        });
      }
    }

    // 3. Over-constrained entities (more constraints than DOFs)
    entityConstraints.forEach((cList, eid) => {
      if (cList.length > 6) {
        conflicts.push({
          constraintIds: cList.map((c) => c.id),
          description: `Entity "${eid}" is referenced by ${cList.length} constraints (likely over-constrained).`,
        });
      }
    });

    return conflicts;
  },

  // -----------------------------------------------------------------------
  // Auto-Constraint Inference
  // -----------------------------------------------------------------------

  inferConstraints: (
    positions,
    segments
  ) => {
    const inferred: InferredConstraint[] = [];
    const angleTolDeg = 3; // degrees
    const distTol = 0.05; // absolute distance for near-coincident
    const lengthRelTol = 0.02; // 2% relative tolerance for equal length

    const pointIds = Array.from(positions.keys());

    // --- Near-coincident points ---
    for (let i = 0; i < pointIds.length; i++) {
      for (let j = i + 1; j < pointIds.length; j++) {
        const a = positions.get(pointIds[i])!;
        const b = positions.get(pointIds[j])!;
        const d = vec3Dist(a, b);
        if (d > 0 && d < distTol) {
          inferred.push({
            type: "coincident",
            entityIds: [pointIds[i], pointIds[j]],
            confidence: Math.max(0, 1 - d / distTol),
            description: `Points ${pointIds[i]} and ${pointIds[j]} are nearly coincident (distance: ${d.toFixed(6)}).`,
          });
        }
      }
    }

    if (!segments || segments.length === 0) return inferred;

    // Precompute segment directions and lengths
    const segData = segments.map((seg) => {
      const start = positions.get(seg.startId);
      const end = positions.get(seg.endId);
      if (!start || !end) return null;
      const dir = vec3Sub(end, start);
      const len = vec3Len(dir);
      return { ...seg, start, end, dir, len };
    }).filter(Boolean) as Array<{
      id: string; startId: string; endId: string;
      start: Vec3; end: Vec3; dir: Vec3; len: number;
    }>;

    for (let i = 0; i < segData.length; i++) {
      const s = segData[i];
      if (s.len < 1e-12) continue;

      const normalized = vec3Normalize(s.dir);

      // --- Near-horizontal ---
      // A line is horizontal if its Y component is near zero relative to its length
      const yAngle = Math.abs(Math.asin(Math.max(-1, Math.min(1, normalized[1])))) * (180 / Math.PI);
      if (yAngle > 0 && yAngle < angleTolDeg) {
        inferred.push({
          type: "horizontal",
          entityIds: [s.startId, s.endId],
          confidence: Math.max(0, 1 - yAngle / angleTolDeg),
          description: `Segment ${s.id} is nearly horizontal (off by ${yAngle.toFixed(2)} degrees).`,
        });
      }

      // --- Near-vertical ---
      const xzLen = Math.sqrt(normalized[0] * normalized[0] + normalized[2] * normalized[2]);
      const xAngle = Math.abs(Math.asin(Math.max(-1, Math.min(1, xzLen)))) * (180 / Math.PI);
      // If xzLen is near 0, the line is nearly vertical in the XZ plane
      // But "vertical" in our context means same X coordinate, so check the X component:
      const xComponent = Math.abs(normalized[0]);
      const xAngleFromVert = Math.abs(Math.asin(Math.max(-1, Math.min(1, xComponent)))) * (180 / Math.PI);
      // Vertical means direction is purely in Y (and possibly Z)
      // More precisely: vertical constraint means pts[0].x == pts[1].x
      const vertAngle = Math.abs(Math.atan2(Math.abs(s.dir[0]), Math.abs(s.dir[1]))) * (180 / Math.PI);
      if (vertAngle > 0 && vertAngle < angleTolDeg && Math.abs(s.dir[1]) > 1e-6) {
        inferred.push({
          type: "vertical",
          entityIds: [s.startId, s.endId],
          confidence: Math.max(0, 1 - vertAngle / angleTolDeg),
          description: `Segment ${s.id} is nearly vertical (off by ${vertAngle.toFixed(2)} degrees).`,
        });
      }

      // --- Pairwise segment comparisons ---
      for (let j = i + 1; j < segData.length; j++) {
        const t = segData[j];
        if (t.len < 1e-12) continue;

        const normT = vec3Normalize(t.dir);

        // Near-equal length
        const avgLen = (s.len + t.len) / 2;
        if (avgLen > 1e-12) {
          const relDiff = Math.abs(s.len - t.len) / avgLen;
          if (relDiff > 0 && relDiff < lengthRelTol) {
            inferred.push({
              type: "equal",
              entityIds: [s.startId, s.endId, t.startId, t.endId],
              confidence: Math.max(0, 1 - relDiff / lengthRelTol),
              description: `Segments ${s.id} and ${t.id} have nearly equal length (diff: ${(relDiff * 100).toFixed(2)}%).`,
            });
          }
        }

        // Near-perpendicular
        const dot = Math.abs(vec3Dot(normalized, normT));
        const perpAngle = Math.abs(Math.acos(Math.max(0, Math.min(1, dot)))) * (180 / Math.PI);
        const perpDeviation = Math.abs(90 - perpAngle);
        if (perpDeviation > 0 && perpDeviation < angleTolDeg) {
          inferred.push({
            type: "perpendicular",
            entityIds: [s.startId, s.endId, t.startId, t.endId],
            confidence: Math.max(0, 1 - perpDeviation / angleTolDeg),
            description: `Segments ${s.id} and ${t.id} are nearly perpendicular (off by ${perpDeviation.toFixed(2)} degrees).`,
          });
        }

        // Near-parallel (angle between directions close to 0 or 180)
        const crossMag = vec3Len(vec3Cross(normalized, normT));
        const parallelAngle = Math.abs(Math.asin(Math.max(-1, Math.min(1, crossMag)))) * (180 / Math.PI);
        if (parallelAngle > 0 && parallelAngle < angleTolDeg) {
          inferred.push({
            type: "parallel",
            entityIds: [s.startId, s.endId, t.startId, t.endId],
            confidence: Math.max(0, 1 - parallelAngle / angleTolDeg),
            description: `Segments ${s.id} and ${t.id} are nearly parallel (off by ${parallelAngle.toFixed(2)} degrees).`,
          });
        }
      }
    }

    // Sort by confidence descending
    inferred.sort((a, b) => b.confidence - a.confidence);
    return inferred;
  },
}));
