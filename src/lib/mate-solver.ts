"use client";

// ===== Types =====

export type MateType =
  | 'coincident'   // face-to-face flush
  | 'concentric'   // cylinder axes aligned
  | 'distance'     // specified gap between faces
  | 'parallel'     // faces parallel
  | 'perpendicular'// faces at 90°
  | 'angle'        // specified angle between faces
  | 'lock'         // fix relative position/orientation
  | 'gear';        // mechanical: rotation ratio

export interface MateFace {
  position: [number, number, number];
  normal: [number, number, number];
  partId: string;
}

export interface AssemblyMate {
  id: string;
  type: MateType;
  face1: MateFace;
  face2: MateFace;
  value?: number;      // distance, angle, or gear ratio
  suppressed: boolean;
  satisfied: boolean;
}

export interface AssemblyPart {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number]; // euler angles
  fixed: boolean; // grounded part
}

export interface MateResult {
  success: boolean;
  iterations: number;
  maxResidual: number;
  partPositions: Map<string, { position: [number, number, number]; rotation: [number, number, number] }>;
}

// ===== Vec3 Helpers =====

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

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Compute the angle in radians between two unit vectors.
 */
function angleBetween(a: Vec3, b: Vec3): number {
  const d = clamp(vec3Dot(vec3Normalize(a), vec3Normalize(b)), -1, 1);
  return Math.acos(d);
}

/**
 * Rotate a vector around an arbitrary axis by the given angle (radians)
 * using Rodrigues' rotation formula.
 */
function rotateAroundAxis(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const k = vec3Normalize(axis);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  // v*cos(a) + (k x v)*sin(a) + k*(k.v)*(1-cos(a))
  const term1 = vec3Scale(v, cosA);
  const term2 = vec3Scale(vec3Cross(k, v), sinA);
  const term3 = vec3Scale(k, vec3Dot(k, v) * (1 - cosA));
  return vec3Add(vec3Add(term1, term2), term3);
}

// ===== World-space face helpers =====

/**
 * Get the world-space position of a face, accounting for part position offset.
 */
function worldFacePosition(face: MateFace, parts: Map<string, AssemblyPart>): Vec3 {
  const part = parts.get(face.partId);
  if (!part) return [...face.position];
  return vec3Add(part.position, face.position);
}

/**
 * Get the world-space normal of a face. For simplicity in this iterative solver
 * we treat the face normal as already in a consistent frame and apply only
 * the part's Euler rotation (XYZ order) to it.
 */
function worldFaceNormal(face: MateFace, parts: Map<string, AssemblyPart>): Vec3 {
  const part = parts.get(face.partId);
  if (!part) return vec3Normalize(face.normal);
  return vec3Normalize(applyEuler(face.normal, part.rotation));
}

/**
 * Apply Euler XYZ rotation to a vector.
 */
function applyEuler(v: Vec3, euler: Vec3): Vec3 {
  let out: Vec3 = [...v];
  // Rotate around X
  if (Math.abs(euler[0]) > 1e-12) {
    out = rotateAroundAxis(out, [1, 0, 0], euler[0]);
  }
  // Rotate around Y
  if (Math.abs(euler[1]) > 1e-12) {
    out = rotateAroundAxis(out, [0, 1, 0], euler[1]);
  }
  // Rotate around Z
  if (Math.abs(euler[2]) > 1e-12) {
    out = rotateAroundAxis(out, [0, 0, 1], euler[2]);
  }
  return out;
}

// ===== Residual Evaluation =====

/**
 * Evaluate the scalar residual of a single mate constraint.
 * Returns 0 when perfectly satisfied; larger values mean worse violation.
 */
export function evaluateMateResidual(
  mate: AssemblyMate,
  parts: Map<string, AssemblyPart>
): number {
  if (mate.suppressed) return 0;

  const p1 = worldFacePosition(mate.face1, parts);
  const p2 = worldFacePosition(mate.face2, parts);
  const n1 = worldFaceNormal(mate.face1, parts);
  const n2 = worldFaceNormal(mate.face2, parts);

  switch (mate.type) {
    case 'coincident': {
      // Positions should coincide, normals should oppose (dot = -1)
      const posDelta = vec3Distance(p1, p2);
      const normalError = Math.abs(vec3Dot(n1, n2) + 1); // ideal dot = -1
      return posDelta + normalError;
    }

    case 'concentric': {
      // Axes (normals) should be parallel: |cross| = 0
      // Radial offset (perpendicular to axis) should be zero
      const axisError = vec3Length(vec3Cross(n1, n2));
      const delta = vec3Sub(p2, p1);
      const alongAxis = vec3Dot(delta, n1);
      const radial = vec3Length(vec3Sub(delta, vec3Scale(n1, alongAxis)));
      return radial + axisError;
    }

    case 'distance': {
      const gap = mate.value ?? 0;
      const delta = vec3Sub(p2, p1);
      const signedDist = vec3Dot(delta, n1);
      const distError = Math.abs(signedDist - gap);
      // Normals should oppose
      const normalError = Math.abs(vec3Dot(n1, n2) + 1);
      return distError + normalError;
    }

    case 'parallel': {
      // Normals parallel: cross product magnitude = 0
      return vec3Length(vec3Cross(n1, n2));
    }

    case 'perpendicular': {
      // Normals at 90°: dot product = 0
      return Math.abs(vec3Dot(n1, n2));
    }

    case 'angle': {
      const targetAngle = (mate.value ?? 0) * (Math.PI / 180); // value in degrees
      const currentAngle = angleBetween(n1, n2);
      return Math.abs(currentAngle - targetAngle);
    }

    case 'lock': {
      // Both position and orientation must be frozen relative
      const posDelta = vec3Distance(p1, p2);
      const normalError = Math.abs(1 - vec3Dot(n1, n2)); // ideally identical
      return posDelta + normalError;
    }

    case 'gear': {
      // Gear: axes should be parallel and the angular velocity ratio is enforced.
      // For the constraint residual we just check axis alignment since actual
      // rotation coupling requires dynamic state.
      const axisError = vec3Length(vec3Cross(n1, n2));
      return axisError;
    }

    default:
      return 0;
  }
}

// ===== Correction Step (per mate) =====

/**
 * Apply a correction to the movable part to reduce the mate residual.
 * Returns the damping-scaled positional and rotational deltas applied.
 */
function applyMateCorrection(
  mate: AssemblyMate,
  parts: Map<string, AssemblyPart>,
  damping: number
): void {
  if (mate.suppressed) return;

  const part1 = parts.get(mate.face1.partId);
  const part2 = parts.get(mate.face2.partId);
  if (!part1 || !part2) return;

  // Determine which part(s) to move
  const move1 = !part1.fixed;
  const move2 = !part2.fixed;
  if (!move1 && !move2) return;

  const p1 = worldFacePosition(mate.face1, parts);
  const p2 = worldFacePosition(mate.face2, parts);
  const n1 = worldFaceNormal(mate.face1, parts);
  const n2 = worldFaceNormal(mate.face2, parts);

  // Weight: if both can move, split correction 50/50
  const w1 = move1 && move2 ? 0.5 : move1 ? 1.0 : 0.0;
  const w2 = move1 && move2 ? 0.5 : move2 ? 1.0 : 0.0;

  switch (mate.type) {
    case 'coincident': {
      // Position: move p2 to p1 (or split)
      const posDelta = vec3Sub(p1, p2);
      if (move2) {
        part2.position = vec3Add(part2.position, vec3Scale(posDelta, damping * w2));
      }
      if (move1) {
        part1.position = vec3Sub(part1.position, vec3Scale(posDelta, damping * w1));
      }
      // Rotation: rotate part2 so n2 opposes n1 (n2 → -n1)
      applyNormalAlignment(n2, vec3Scale(n1, -1), part2, move2, part1, move1, damping);
      break;
    }

    case 'concentric': {
      // Align axes
      applyNormalAlignment(n2, n1, part2, move2, part1, move1, damping);
      // Remove radial offset
      const delta = vec3Sub(p2, p1);
      const along = vec3Dot(delta, n1);
      const radialVec = vec3Sub(delta, vec3Scale(n1, along));
      if (move2) {
        part2.position = vec3Sub(part2.position, vec3Scale(radialVec, damping * w2));
      }
      if (move1) {
        part1.position = vec3Add(part1.position, vec3Scale(radialVec, damping * w1));
      }
      break;
    }

    case 'distance': {
      const gap = mate.value ?? 0;
      const delta = vec3Sub(p2, p1);
      const signedDist = vec3Dot(delta, n1);
      const error = signedDist - gap;
      const correction = vec3Scale(n1, error);
      if (move2) {
        part2.position = vec3Sub(part2.position, vec3Scale(correction, damping * w2));
      }
      if (move1) {
        part1.position = vec3Add(part1.position, vec3Scale(correction, damping * w1));
      }
      // Align normals opposing
      applyNormalAlignment(n2, vec3Scale(n1, -1), part2, move2, part1, move1, damping);
      break;
    }

    case 'parallel': {
      // Align n2 to n1 (or -n1, whichever is closer)
      const target = vec3Dot(n1, n2) >= 0 ? n1 : vec3Scale(n1, -1);
      applyNormalAlignment(n2, target, part2, move2, part1, move1, damping);
      break;
    }

    case 'perpendicular': {
      // Rotate so dot(n1, n2) = 0
      const dot = vec3Dot(n1, n2);
      if (Math.abs(dot) > 1e-10) {
        // Rotate n2 by -asin(dot) around the cross axis
        const axis = vec3Cross(n1, n2);
        const axisLen = vec3Length(axis);
        if (axisLen > 1e-10) {
          const rotAngle = -Math.asin(clamp(dot, -1, 1)) * damping;
          if (move2) {
            applyRotationDelta(part2, axis, rotAngle * w2);
          }
          if (move1) {
            applyRotationDelta(part1, axis, -rotAngle * w1);
          }
        }
      }
      break;
    }

    case 'angle': {
      const targetAngle = (mate.value ?? 0) * (Math.PI / 180);
      const currentAngle = angleBetween(n1, n2);
      const errorAngle = currentAngle - targetAngle;
      if (Math.abs(errorAngle) > 1e-10) {
        const axis = vec3Cross(n1, n2);
        const axisLen = vec3Length(axis);
        if (axisLen > 1e-10) {
          const rotAngle = -errorAngle * damping;
          if (move2) {
            applyRotationDelta(part2, axis, rotAngle * w2);
          }
          if (move1) {
            applyRotationDelta(part1, axis, -rotAngle * w1);
          }
        }
      }
      break;
    }

    case 'lock': {
      // Snap p2 to p1
      const posDelta = vec3Sub(p1, p2);
      if (move2) {
        part2.position = vec3Add(part2.position, vec3Scale(posDelta, damping * w2));
      }
      if (move1) {
        part1.position = vec3Sub(part1.position, vec3Scale(posDelta, damping * w1));
      }
      // Align normals identically
      applyNormalAlignment(n2, n1, part2, move2, part1, move1, damping);
      break;
    }

    case 'gear': {
      // Align axes parallel (same direction)
      const target = vec3Dot(n1, n2) >= 0 ? n1 : vec3Scale(n1, -1);
      applyNormalAlignment(n2, target, part2, move2, part1, move1, damping);
      // Note: actual rotation coupling would require tracking angular state
      // over time, which is beyond a static constraint solver.
      break;
    }
  }
}

/**
 * Rotate a part so that `currentNormal` aligns toward `targetNormal`.
 */
function applyNormalAlignment(
  currentNormal: Vec3,
  targetNormal: Vec3,
  part2: AssemblyPart,
  move2: boolean,
  part1: AssemblyPart,
  move1: boolean,
  damping: number
): void {
  const axis = vec3Cross(currentNormal, targetNormal);
  const axisLen = vec3Length(axis);
  if (axisLen < 1e-10) return; // already aligned or anti-aligned

  const angle = angleBetween(currentNormal, targetNormal) * damping;
  const w2 = move1 && move2 ? 0.5 : move2 ? 1.0 : 0.0;
  const w1 = move1 && move2 ? 0.5 : move1 ? 1.0 : 0.0;

  if (move2) {
    applyRotationDelta(part2, axis, angle * w2);
  }
  if (move1) {
    applyRotationDelta(part1, axis, -angle * w1);
  }
}

/**
 * Apply an incremental rotation (axis-angle) to a part's Euler angles.
 * This is an approximation: we add the axis-angle delta scaled by angle
 * to the Euler representation. For small angles this is accurate.
 */
function applyRotationDelta(part: AssemblyPart, axis: Vec3, angle: number): void {
  const normAxis = vec3Normalize(axis);
  // For small angle increments, the Euler delta is approximately the rotation vector
  const delta: Vec3 = vec3Scale(normAxis, angle);
  part.rotation = vec3Add(part.rotation, delta);
}

// ===== Main Solver =====

/**
 * Iteratively solve all assembly mate constraints by adjusting part positions
 * and rotations. Uses a Gauss-Newton-like iterative correction approach with
 * damping for stability.
 */
export function solveMates(
  mates: AssemblyMate[],
  parts: Map<string, AssemblyPart>,
  maxIterations: number = 50,
  tolerance: number = 1e-4
): MateResult {
  // Clone parts so we don't mutate during residual evaluation within an iteration
  const workingParts = new Map<string, AssemblyPart>();
  parts.forEach((part, id) => {
    workingParts.set(id, {
      ...part,
      position: [...part.position],
      rotation: [...part.rotation],
    });
  });

  const activeMates = mates.filter((m) => !m.suppressed);

  let iterations = 0;
  let maxResidual = Infinity;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;

    // Damping decreases over iterations for fine convergence
    const damping = Math.max(0.1, 0.6 * Math.pow(0.95, iter));

    // Apply correction for each mate
    for (const mate of activeMates) {
      applyMateCorrection(mate, workingParts, damping);
    }

    // Compute max residual across all active mates
    maxResidual = 0;
    for (const mate of activeMates) {
      const r = evaluateMateResidual(mate, workingParts);
      mate.satisfied = r < tolerance;
      if (r > maxResidual) maxResidual = r;
    }

    if (maxResidual < tolerance) break;
  }

  // Build result positions map
  const partPositions = new Map<
    string,
    { position: [number, number, number]; rotation: [number, number, number] }
  >();
  workingParts.forEach((part, id) => {
    partPositions.set(id, {
      position: [...part.position],
      rotation: [...part.rotation],
    });
  });

  // Write back solved positions to the input parts map
  workingParts.forEach((part, id) => {
    const original = parts.get(id);
    if (original) {
      original.position = [...part.position];
      original.rotation = [...part.rotation];
    }
  });

  return {
    success: maxResidual < tolerance,
    iterations,
    maxResidual,
    partPositions,
  };
}

// ===== Mate Factory Functions =====

/**
 * Create a coincident mate between two faces.
 * Face2 will be moved so its position aligns with face1, normals opposing.
 */
export function createCoincidentMate(
  face1: MateFace,
  face2: MateFace
): Partial<AssemblyMate> {
  return {
    type: 'coincident',
    face1,
    face2,
    suppressed: false,
    satisfied: false,
  };
}

/**
 * Create a concentric mate (align cylinder axes and remove radial offset).
 */
export function createConcentricMate(
  face1: MateFace,
  face2: MateFace
): Partial<AssemblyMate> {
  return {
    type: 'concentric',
    face1,
    face2,
    suppressed: false,
    satisfied: false,
  };
}

/**
 * Create a distance mate with a specified gap along the face normal.
 */
export function createDistanceMate(
  face1: MateFace,
  face2: MateFace,
  distance: number
): Partial<AssemblyMate> {
  return {
    type: 'distance',
    face1,
    face2,
    value: distance,
    suppressed: false,
    satisfied: false,
  };
}

// ===== Interference Check =====

/**
 * Check whether two axis-aligned bounding boxes overlap, and compute
 * the approximate overlap volume if they do.
 */
export function checkInterference(
  part1: { position: [number, number, number]; size: [number, number, number] },
  part2: { position: [number, number, number]; size: [number, number, number] }
): { interferes: boolean; overlapVolume: number } {
  // Compute AABB min/max for each part (position is center)
  const min1: Vec3 = [
    part1.position[0] - part1.size[0] / 2,
    part1.position[1] - part1.size[1] / 2,
    part1.position[2] - part1.size[2] / 2,
  ];
  const max1: Vec3 = [
    part1.position[0] + part1.size[0] / 2,
    part1.position[1] + part1.size[1] / 2,
    part1.position[2] + part1.size[2] / 2,
  ];
  const min2: Vec3 = [
    part2.position[0] - part2.size[0] / 2,
    part2.position[1] - part2.size[1] / 2,
    part2.position[2] - part2.size[2] / 2,
  ];
  const max2: Vec3 = [
    part2.position[0] + part2.size[0] / 2,
    part2.position[1] + part2.size[1] / 2,
    part2.position[2] + part2.size[2] / 2,
  ];

  // Overlap per axis
  const overlapX = Math.max(0, Math.min(max1[0], max2[0]) - Math.max(min1[0], min2[0]));
  const overlapY = Math.max(0, Math.min(max1[1], max2[1]) - Math.max(min1[1], min2[1]));
  const overlapZ = Math.max(0, Math.min(max1[2], max2[2]) - Math.max(min1[2], min2[2]));

  const overlapVolume = overlapX * overlapY * overlapZ;
  const interferes = overlapVolume > 0;

  return { interferes, overlapVolume };
}
