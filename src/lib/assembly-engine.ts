"use client";

// ============================================================================
// Assembly Constraint Engine - ShilpaSutra
// Professional assembly constraint solver, BOM generation, interference
// detection, and exploded view utilities.
// ============================================================================

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export type AssemblyConstraintType =
  | "mate"
  | "align"
  | "insert"
  | "angle"
  | "tangent"
  | "distance"
  | "gear"
  | "rack_pinion"
  | "cam"
  | "slot"
  | "parallel"
  | "perpendicular"
  | "concentric"
  | "lock"
  | "planar";

export interface AssemblyConstraint {
  id: string;
  type: AssemblyConstraintType;
  partAId: string;
  partBId: string;
  partAFace: string;
  partBFace: string;
  value: number;
  offset: number;
  flipped: boolean;
  suppressed: boolean;
}

export interface AssemblyPart {
  id: string;
  name: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  dimensions: Record<string, number>;
  color: string;
  material: string;
  mass: number;
  centerOfMass: [number, number, number];
  momentOfInertia: [number, number, number];
  fixed: boolean;
  visible: boolean;
  partNumber: string;
  description: string;
}

export interface BOMEntry {
  itemNumber: number;
  partNumber: string;
  name: string;
  quantity: number;
  material: string;
  mass: number;
  description: string;
  unitCost: number;
}

export interface AssemblyAnalysis {
  totalMass: number;
  centerOfMass: [number, number, number];
  momentOfInertia: [
    [number, number, number],
    [number, number, number],
    [number, number, number],
  ];
  interferenceCount: number;
  constraintStatus: "fully_constrained" | "under_constrained" | "over_constrained" | "conflicting";
}

export interface InterferenceResult {
  partAId: string;
  partBId: string;
  volume: number;
  type: "clearance" | "interference" | "contact";
}

// ---------------------------------------------------------------------------
// Vector / matrix helpers (inline to avoid external deps)
// ---------------------------------------------------------------------------

type Vec3 = [number, number, number];

function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
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

function vec3Length(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Length(v);
  if (len < 1e-12) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function vec3Distance(a: Vec3, b: Vec3): number {
  return vec3Length(vec3Sub(a, b));
}

/** Resolve a named face to an outward-pointing normal in local space. */
function faceNormal(face: string): Vec3 {
  const map: Record<string, Vec3> = {
    "+x": [1, 0, 0],
    "-x": [-1, 0, 0],
    "+y": [0, 1, 0],
    "-y": [0, -1, 0],
    "+z": [0, 0, 1],
    "-z": [0, 0, -1],
    top: [0, 1, 0],
    bottom: [0, -1, 0],
    front: [0, 0, 1],
    back: [0, 0, -1],
    left: [-1, 0, 0],
    right: [1, 0, 0],
  };
  return map[face.toLowerCase()] ?? [0, 1, 0];
}

/** Return the local-space center point for a named face based on dimensions. */
function faceCenter(part: AssemblyPart, face: string): Vec3 {
  const hw = (part.dimensions.width ?? 1) / 2;
  const hh = (part.dimensions.height ?? 1) / 2;
  const hd = (part.dimensions.depth ?? 1) / 2;

  const map: Record<string, Vec3> = {
    "+x": [hw, 0, 0],
    "-x": [-hw, 0, 0],
    "+y": [0, hh, 0],
    "-y": [0, -hh, 0],
    "+z": [0, 0, hd],
    "-z": [0, 0, -hd],
    top: [0, hh, 0],
    bottom: [0, -hh, 0],
    front: [0, 0, hd],
    back: [0, 0, -hd],
    left: [-hw, 0, 0],
    right: [hw, 0, 0],
  };
  return map[face.toLowerCase()] ?? [0, 0, 0];
}

/** Simple rotation of a vector by Euler angles (XYZ order, radians). */
function rotateVec3(v: Vec3, rotation: Vec3): Vec3 {
  const [rx, ry, rz] = rotation;
  let [x, y, z] = v;

  // Rotate around X
  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const y1 = y * cosX - z * sinX;
  const z1 = y * sinX + z * cosX;
  y = y1;
  z = z1;

  // Rotate around Y
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const x2 = x * cosY + z * sinY;
  const z2 = -x * sinY + z * cosY;
  x = x2;
  z = z2;

  // Rotate around Z
  const cosZ = Math.cos(rz);
  const sinZ = Math.sin(rz);
  const x3 = x * cosZ - y * sinZ;
  const y3 = x * sinZ + y * cosZ;
  x = x3;
  y = y3;

  return [x, y, z];
}

/** World-space position of a face center. */
function worldFaceCenter(part: AssemblyPart, face: string): Vec3 {
  const local = faceCenter(part, face);
  const rotated = rotateVec3(local, part.rotation);
  return vec3Add(part.position, rotated);
}

/** World-space normal of a face. */
function worldFaceNormal(part: AssemblyPart, face: string): Vec3 {
  const local = faceNormal(face);
  return vec3Normalize(rotateVec3(local, part.rotation));
}

// ---------------------------------------------------------------------------
// Constraint Solvers
// ---------------------------------------------------------------------------

const SOLVER_TOLERANCE = 1e-6;
const MAX_ITERATIONS = 100;
const RELAXATION_FACTOR = 0.5;

/**
 * Mate constraint: faces co-planar with normals opposing.
 * Moves partB so that its face meets partA's face.
 */
export function solveMateConstraint(
  partA: AssemblyPart,
  partB: AssemblyPart,
  constraint: AssemblyConstraint,
): AssemblyPart {
  if (constraint.suppressed || partB.fixed) return partB;

  const targetPoint = worldFaceCenter(partA, constraint.partAFace);
  const normalA = worldFaceNormal(partA, constraint.partAFace);
  const localFaceB = faceCenter(partB, constraint.partBFace);
  const rotatedFaceB = rotateVec3(localFaceB, partB.rotation);

  // The face of B should sit on A's face plane, normal opposing
  const offset = constraint.flipped ? constraint.offset : -constraint.offset;
  const offsetVec = vec3Scale(normalA, offset);
  const desiredPos = vec3Sub(vec3Add(targetPoint, offsetVec), rotatedFaceB);

  const updated = { ...partB, position: desiredPos as Vec3 };

  // Align normals to be anti-parallel
  const normalB = worldFaceNormal(partB, constraint.partBFace);
  const dot = vec3Dot(normalA, normalB);
  if (Math.abs(dot + 1) > SOLVER_TOLERANCE) {
    // Compute rotation to flip B's normal to oppose A's normal
    const cross = vec3Cross(normalB, vec3Scale(normalA, -1));
    const crossLen = vec3Length(cross);
    if (crossLen > SOLVER_TOLERANCE) {
      const angle = Math.acos(Math.max(-1, Math.min(1, -dot)));
      const axis = vec3Normalize(cross);
      updated.rotation = [
        partB.rotation[0] + axis[0] * angle * RELAXATION_FACTOR,
        partB.rotation[1] + axis[1] * angle * RELAXATION_FACTOR,
        partB.rotation[2] + axis[2] * angle * RELAXATION_FACTOR,
      ];
    }
  }

  return updated;
}

/**
 * Align constraint: faces co-planar with normals in the same direction.
 */
export function solveAlignConstraint(
  partA: AssemblyPart,
  partB: AssemblyPart,
  constraint: AssemblyConstraint,
): AssemblyPart {
  if (constraint.suppressed || partB.fixed) return partB;

  const targetPoint = worldFaceCenter(partA, constraint.partAFace);
  const normalA = worldFaceNormal(partA, constraint.partAFace);
  const localFaceB = faceCenter(partB, constraint.partBFace);
  const rotatedFaceB = rotateVec3(localFaceB, partB.rotation);

  const offsetVec = vec3Scale(normalA, constraint.offset);
  const desiredPos = vec3Sub(vec3Add(targetPoint, offsetVec), rotatedFaceB);

  const updated = { ...partB, position: desiredPos as Vec3 };

  // Align normals to be parallel (same direction)
  const normalB = worldFaceNormal(partB, constraint.partBFace);
  const dot = vec3Dot(normalA, normalB);
  if (Math.abs(dot - 1) > SOLVER_TOLERANCE) {
    const cross = vec3Cross(normalB, normalA);
    const crossLen = vec3Length(cross);
    if (crossLen > SOLVER_TOLERANCE) {
      const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
      const axis = vec3Normalize(cross);
      updated.rotation = [
        partB.rotation[0] + axis[0] * angle * RELAXATION_FACTOR,
        partB.rotation[1] + axis[1] * angle * RELAXATION_FACTOR,
        partB.rotation[2] + axis[2] * angle * RELAXATION_FACTOR,
      ];
    }
  }

  return updated;
}

/**
 * Insert constraint: cylindrical alignment (concentric + mate).
 * Aligns axes and mates faces with optional offset.
 */
export function solveInsertConstraint(
  partA: AssemblyPart,
  partB: AssemblyPart,
  constraint: AssemblyConstraint,
): AssemblyPart {
  if (constraint.suppressed || partB.fixed) return partB;

  // First align axes (concentric)
  let updated = solveConcentricConstraint(partA, partB);

  // Then mate faces along the axis
  const normalA = worldFaceNormal(partA, constraint.partAFace);
  const faceACenter = worldFaceCenter(partA, constraint.partAFace);
  const localFaceB = faceCenter(updated, constraint.partBFace);
  const rotatedFaceB = rotateVec3(localFaceB, updated.rotation);

  const offset = constraint.flipped ? -constraint.offset : constraint.offset;
  const projection = vec3Dot(vec3Sub(vec3Add(updated.position, rotatedFaceB), faceACenter), normalA);
  const correction = vec3Scale(normalA, -(projection - offset));

  updated = {
    ...updated,
    position: vec3Add(updated.position, correction) as Vec3,
  };

  return updated;
}

/**
 * Angle constraint: maintain a specific angle between two faces.
 */
export function solveAngleConstraint(
  partA: AssemblyPart,
  partB: AssemblyPart,
  constraint: AssemblyConstraint,
): AssemblyPart {
  if (constraint.suppressed || partB.fixed) return partB;

  const normalA = worldFaceNormal(partA, constraint.partAFace);
  const normalB = worldFaceNormal(partB, constraint.partBFace);
  const targetAngle = (constraint.value * Math.PI) / 180; // value in degrees

  const currentAngle = Math.acos(Math.max(-1, Math.min(1, vec3Dot(normalA, normalB))));
  const angleDiff = targetAngle - currentAngle;

  if (Math.abs(angleDiff) < SOLVER_TOLERANCE) return partB;

  const cross = vec3Cross(normalB, normalA);
  const crossLen = vec3Length(cross);
  if (crossLen < SOLVER_TOLERANCE) return partB;

  const axis = vec3Normalize(cross);
  const correction = angleDiff * RELAXATION_FACTOR;

  return {
    ...partB,
    rotation: [
      partB.rotation[0] + axis[0] * correction,
      partB.rotation[1] + axis[1] * correction,
      partB.rotation[2] + axis[2] * correction,
    ] as Vec3,
  };
}

/**
 * Distance constraint: maintain a specific distance between face centers.
 */
export function solveDistanceConstraint(
  partA: AssemblyPart,
  partB: AssemblyPart,
  constraint: AssemblyConstraint,
): AssemblyPart {
  if (constraint.suppressed || partB.fixed) return partB;

  const faceAWorld = worldFaceCenter(partA, constraint.partAFace);
  const faceBWorld = worldFaceCenter(partB, constraint.partBFace);

  const delta = vec3Sub(faceBWorld, faceAWorld);
  const currentDist = vec3Length(delta);
  const targetDist = constraint.value + constraint.offset;

  if (Math.abs(currentDist - targetDist) < SOLVER_TOLERANCE) return partB;

  const direction = currentDist > SOLVER_TOLERANCE ? vec3Normalize(delta) : [0, 1, 0] as Vec3;
  const correction = vec3Scale(
    direction,
    (targetDist - currentDist) * RELAXATION_FACTOR,
  );

  return {
    ...partB,
    position: vec3Add(partB.position, correction) as Vec3,
  };
}

/**
 * Concentric constraint: align center axes of two cylindrical features.
 */
export function solveConcentricConstraint(
  partA: AssemblyPart,
  partB: AssemblyPart,
): AssemblyPart {
  if (partB.fixed) return partB;

  // Project partB center onto partA axis and move laterally
  const axisA = vec3Normalize(rotateVec3([0, 1, 0], partA.rotation));
  const delta = vec3Sub(partB.position, partA.position);
  const proj = vec3Dot(delta, axisA);
  const onAxis = vec3Add(partA.position, vec3Scale(axisA, proj));

  const lateral = vec3Sub(partB.position, onAxis);
  const correction = vec3Scale(lateral, -RELAXATION_FACTOR);

  return {
    ...partB,
    position: vec3Add(partB.position, correction) as Vec3,
  };
}

/**
 * Iterative constraint system solver.
 * Repeatedly applies individual constraint solvers until convergence or
 * the iteration limit is reached.
 */
export function solveConstraintSystem(
  parts: AssemblyPart[],
  constraints: AssemblyConstraint[],
): { parts: AssemblyPart[]; converged: boolean; iterations: number; maxError: number } {
  const partMap = new Map<string, AssemblyPart>();
  for (const p of parts) {
    partMap.set(p.id, { ...p });
  }

  const activeConstraints = constraints.filter((c) => !c.suppressed);
  let converged = false;
  let iterations = 0;
  let maxError = Infinity;

  while (iterations < MAX_ITERATIONS && !converged) {
    maxError = 0;
    iterations++;

    for (const constraint of activeConstraints) {
      const partA = partMap.get(constraint.partAId);
      const partB = partMap.get(constraint.partBId);
      if (!partA || !partB) continue;

      const oldPos: Vec3 = [...partB.position] as Vec3;
      const oldRot: Vec3 = [...partB.rotation] as Vec3;

      let updated: AssemblyPart;
      switch (constraint.type) {
        case "mate":
          updated = solveMateConstraint(partA, partB, constraint);
          break;
        case "align":
        case "parallel":
        case "planar":
          updated = solveAlignConstraint(partA, partB, constraint);
          break;
        case "insert":
          updated = solveInsertConstraint(partA, partB, constraint);
          break;
        case "angle":
        case "perpendicular":
          updated = solveAngleConstraint(partA, partB, constraint);
          break;
        case "distance":
          updated = solveDistanceConstraint(partA, partB, constraint);
          break;
        case "concentric":
          updated = solveConcentricConstraint(partA, partB);
          break;
        case "lock":
          // Lock keeps partB at its current position relative to partA
          updated = partB;
          break;
        case "tangent":
        case "gear":
        case "rack_pinion":
        case "cam":
        case "slot":
          // Advanced constraints - apply distance solver as approximation
          updated = solveDistanceConstraint(partA, partB, constraint);
          break;
        default:
          updated = partB;
      }

      partMap.set(constraint.partBId, updated);

      // Measure error as positional + rotational change
      const posError = vec3Distance(oldPos, updated.position);
      const rotError = vec3Distance(oldRot, updated.rotation);
      maxError = Math.max(maxError, posError + rotError);
    }

    converged = maxError < SOLVER_TOLERANCE;
  }

  return {
    parts: Array.from(partMap.values()),
    converged,
    iterations,
    maxError,
  };
}

// ---------------------------------------------------------------------------
// BOM Generation
// ---------------------------------------------------------------------------

/**
 * Generate a Bill of Materials from an array of assembly parts.
 * Duplicate part numbers are consolidated with increased quantity.
 */
export function generateBOM(parts: AssemblyPart[]): BOMEntry[] {
  const consolidation = new Map<string, { part: AssemblyPart; count: number }>();

  for (const part of parts) {
    const key = part.partNumber || part.id;
    const existing = consolidation.get(key);
    if (existing) {
      existing.count++;
    } else {
      consolidation.set(key, { part, count: 1 });
    }
  }

  const bom: BOMEntry[] = [];
  let itemNumber = 1;

  consolidation.forEach(({ part, count }) => {
    bom.push({
      itemNumber,
      partNumber: part.partNumber || part.id,
      name: part.name,
      quantity: count,
      material: part.material,
      mass: part.mass,
      description: part.description,
      unitCost: 0,
    });
    itemNumber++;
  });

  return bom;
}

/**
 * Export BOM to CSV format.
 */
export function exportBOMToCSV(bom: BOMEntry[]): string {
  const headers = [
    "Item",
    "Part Number",
    "Name",
    "Qty",
    "Material",
    "Mass (kg)",
    "Description",
    "Unit Cost",
  ];

  const rows = bom.map((entry) =>
    [
      entry.itemNumber,
      `"${entry.partNumber}"`,
      `"${entry.name}"`,
      entry.quantity,
      `"${entry.material}"`,
      entry.mass.toFixed(4),
      `"${entry.description.replace(/"/g, '""')}"`,
      entry.unitCost.toFixed(2),
    ].join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Export BOM to pretty-printed JSON.
 */
export function exportBOMToJSON(bom: BOMEntry[]): string {
  return JSON.stringify(bom, null, 2);
}

/**
 * Calculate total mass of all parts in the assembly.
 */
export function calculateTotalMass(parts: AssemblyPart[]): number {
  return parts.reduce((sum, part) => sum + part.mass, 0);
}

/**
 * Calculate the center of mass of the entire assembly.
 */
export function calculateCenterOfMass(parts: AssemblyPart[]): Vec3 {
  const totalMass = calculateTotalMass(parts);
  if (totalMass < 1e-12) return [0, 0, 0];

  let cx = 0;
  let cy = 0;
  let cz = 0;

  for (const part of parts) {
    const worldCoM = vec3Add(part.position, rotateVec3(part.centerOfMass, part.rotation));
    cx += worldCoM[0] * part.mass;
    cy += worldCoM[1] * part.mass;
    cz += worldCoM[2] * part.mass;
  }

  return [cx / totalMass, cy / totalMass, cz / totalMass];
}

// ---------------------------------------------------------------------------
// Assembly Analysis
// ---------------------------------------------------------------------------

/**
 * Perform full assembly analysis: mass properties, interference, constraints.
 */
export function analyzeAssembly(
  parts: AssemblyPart[],
  constraints: AssemblyConstraint[],
): AssemblyAnalysis {
  const totalMass = calculateTotalMass(parts);
  const centerOfMass = calculateCenterOfMass(parts);
  const interferences = checkAllInterferences(parts);
  const interferenceCount = interferences.filter((r) => r.type === "interference").length;

  // Compute aggregate moment of inertia using parallel axis theorem
  const inertia: [[number, number, number], [number, number, number], [number, number, number]] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  for (const part of parts) {
    const worldCoM = vec3Add(part.position, rotateVec3(part.centerOfMass, part.rotation));
    const d = vec3Sub(worldCoM, centerOfMass);
    const dSq = vec3Dot(d, d);

    // Diagonal terms: I_local + m*(d^2 - d_i^2)
    inertia[0][0] += part.momentOfInertia[0] + part.mass * (dSq - d[0] * d[0]);
    inertia[1][1] += part.momentOfInertia[1] + part.mass * (dSq - d[1] * d[1]);
    inertia[2][2] += part.momentOfInertia[2] + part.mass * (dSq - d[2] * d[2]);

    // Off-diagonal terms (products of inertia)
    inertia[0][1] -= part.mass * d[0] * d[1];
    inertia[0][2] -= part.mass * d[0] * d[2];
    inertia[1][2] -= part.mass * d[1] * d[2];
  }

  // Symmetric
  inertia[1][0] = inertia[0][1];
  inertia[2][0] = inertia[0][2];
  inertia[2][1] = inertia[1][2];

  // Determine constraint status
  const activeConstraints = constraints.filter((c) => !c.suppressed);
  const movableParts = parts.filter((p) => !p.fixed);
  const dof = movableParts.length * 6; // 6 DOF per unconstrained part
  const constraintDof = activeConstraints.length; // rough approximation

  let constraintStatus: AssemblyAnalysis["constraintStatus"];
  if (movableParts.length === 0 || constraintDof === dof) {
    constraintStatus = "fully_constrained";
  } else if (constraintDof < dof) {
    constraintStatus = "under_constrained";
  } else if (constraintDof > dof * 1.5) {
    constraintStatus = "over_constrained";
  } else {
    constraintStatus = "fully_constrained";
  }

  if (interferenceCount > 0 && constraintStatus === "fully_constrained") {
    constraintStatus = "conflicting";
  }

  return {
    totalMass,
    centerOfMass,
    momentOfInertia: inertia,
    interferenceCount,
    constraintStatus,
  };
}

// ---------------------------------------------------------------------------
// Interference Detection
// ---------------------------------------------------------------------------

/**
 * Check interference between two parts using bounding-box overlap approximation.
 * Returns clearance, contact, or interference result with estimated overlap volume.
 */
export function checkInterference(
  partA: AssemblyPart,
  partB: AssemblyPart,
): InterferenceResult {
  const CONTACT_THRESHOLD = 0.01;

  // Compute axis-aligned bounding boxes in world space
  const halfExtentsA: Vec3 = [
    ((partA.dimensions.width ?? 1) * partA.scale[0]) / 2,
    ((partA.dimensions.height ?? 1) * partA.scale[1]) / 2,
    ((partA.dimensions.depth ?? 1) * partA.scale[2]) / 2,
  ];
  const halfExtentsB: Vec3 = [
    ((partB.dimensions.width ?? 1) * partB.scale[0]) / 2,
    ((partB.dimensions.height ?? 1) * partB.scale[1]) / 2,
    ((partB.dimensions.depth ?? 1) * partB.scale[2]) / 2,
  ];

  const overlapX = (halfExtentsA[0] + halfExtentsB[0]) - Math.abs(partA.position[0] - partB.position[0]);
  const overlapY = (halfExtentsA[1] + halfExtentsB[1]) - Math.abs(partA.position[1] - partB.position[1]);
  const overlapZ = (halfExtentsA[2] + halfExtentsB[2]) - Math.abs(partA.position[2] - partB.position[2]);

  if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) {
    // No overlap at all
    const gap = Math.max(-overlapX, -overlapY, -overlapZ);
    return {
      partAId: partA.id,
      partBId: partB.id,
      volume: 0,
      type: "clearance",
    };
  }

  const overlapVolume = overlapX * overlapY * overlapZ;

  if (overlapVolume < CONTACT_THRESHOLD) {
    return {
      partAId: partA.id,
      partBId: partB.id,
      volume: overlapVolume,
      type: "contact",
    };
  }

  return {
    partAId: partA.id,
    partBId: partB.id,
    volume: overlapVolume,
    type: "interference",
  };
}

/**
 * Check all pairwise interferences in the assembly.
 */
export function checkAllInterferences(parts: AssemblyPart[]): InterferenceResult[] {
  const results: InterferenceResult[] = [];

  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const result = checkInterference(parts[i], parts[j]);
      results.push(result);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Exploded View Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate exploded-view positions for each part.
 * Each part is moved outward from the assembly center of mass by the given
 * explosion factor. Constrained pairs are pushed apart along their constraint
 * axis when possible.
 */
export function calculateExplodedPositions(
  parts: AssemblyPart[],
  constraints: AssemblyConstraint[],
  factor: number,
): Map<string, Vec3> {
  const result = new Map<string, Vec3>();
  const assemblyCom = calculateCenterOfMass(parts);

  // Build adjacency info from constraints for directional explosion
  const constraintAxes = new Map<string, Vec3>();
  for (const c of constraints) {
    if (c.suppressed) continue;
    const partA = parts.find((p) => p.id === c.partAId);
    if (partA) {
      const normal = worldFaceNormal(partA, c.partAFace);
      constraintAxes.set(`${c.partAId}-${c.partBId}`, normal);
    }
  }

  for (const part of parts) {
    if (part.fixed) {
      result.set(part.id, [...part.position] as Vec3);
      continue;
    }

    const direction = vec3Sub(part.position, assemblyCom);
    const dist = vec3Length(direction);

    let explosionDir: Vec3;
    if (dist > SOLVER_TOLERANCE) {
      explosionDir = vec3Normalize(direction);
    } else {
      // Part is at center - try to find a constraint-based direction
      let found = false;
      constraintAxes.forEach((axis, key) => {
        if (!found && key.includes(part.id)) {
          explosionDir = axis;
          found = true;
        }
      });
      if (!found) {
        explosionDir = [0, 1, 0];
      }
    }

    const offset = vec3Scale(explosionDir!, dist * factor);
    result.set(part.id, vec3Add(part.position, offset) as Vec3);
  }

  return result;
}

/**
 * Generate an assembly order based on constraint dependencies.
 * Uses topological sorting: fixed / least-dependent parts come first.
 * Returns an ordered array of part IDs.
 */
export function generateAssemblyOrder(
  parts: AssemblyPart[],
  constraints: AssemblyConstraint[],
): string[] {
  // Build dependency graph: partB depends on partA for each constraint
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, Set<string>>();

  for (const part of parts) {
    inDegree.set(part.id, 0);
    adjacency.set(part.id, new Set());
  }

  for (const constraint of constraints) {
    if (constraint.suppressed) continue;
    // partB depends on partA being placed first
    adjacency.get(constraint.partAId)?.add(constraint.partBId);
    inDegree.set(
      constraint.partBId,
      (inDegree.get(constraint.partBId) ?? 0) + 1,
    );
  }

  // Fixed parts should be placed first - set their in-degree to -1 for priority
  const fixedParts = parts.filter((p) => p.fixed).map((p) => p.id);

  // Kahn's algorithm for topological sort
  const queue: string[] = [];
  const result: string[] = [];

  // Seed with fixed parts first
  for (const id of fixedParts) {
    if ((inDegree.get(id) ?? 0) === 0) {
      queue.push(id);
    }
  }

  // Then add remaining zero-in-degree parts
  inDegree.forEach((deg, id) => {
    if (deg === 0 && !fixedParts.includes(id)) {
      queue.push(id);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    const neighbors = adjacency.get(current);
    if (neighbors) {
      neighbors.forEach((neighbor) => {
        const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) {
          queue.push(neighbor);
        }
      });
    }
  }

  // If there are cycles, append any remaining parts
  for (const part of parts) {
    if (!result.includes(part.id)) {
      result.push(part.id);
    }
  }

  return result;
}
