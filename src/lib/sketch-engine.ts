'use client';

/**
 * ShilpaSutra Sketch Engine
 * Core 2D sketch geometry operations for the CAD sketch plane.
 * Pure TypeScript, no external dependencies.
 * All angles in radians internally. Epsilon = 1e-10 for float comparisons.
 */

const EPS = 1e-10;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SketchEntity2D {
  type: 'line' | 'arc' | 'circle' | 'ellipse' | 'parabola' | 'construction';
  points?: [number, number][];   // for lines: [start, end]
  center?: [number, number];     // for arc/circle/ellipse
  radius?: number;               // for arc/circle
  startAngle?: number;           // for arc (radians)
  endAngle?: number;             // for arc (radians)
  rx?: number;                   // for ellipse: semi-major
  ry?: number;                   // for ellipse: semi-minor
  rotation?: number;             // for ellipse: rotation in radians
  focus?: [number, number];      // for parabola: focal point
  vertex?: [number, number];     // for parabola: vertex
  isConstruction?: boolean;      // construction geometry flag
}

export interface TrimResult {
  success: boolean;
  remainingSegments: { start: [number, number]; end: [number, number] }[];
}

export interface SketchFilletResult {
  trimmedLine1: { start: [number, number]; end: [number, number] };
  trimmedLine2: { start: [number, number]; end: [number, number] };
  arc: { center: [number, number]; radius: number; startAngle: number; endAngle: number };
}

export interface SketchChamferResult {
  trimmedLine1: { start: [number, number]; end: [number, number] };
  trimmedLine2: { start: [number, number]; end: [number, number] };
  chamferLine: { start: [number, number]; end: [number, number] };
}

export interface DOFResult {
  totalDOF: number;
  perEntityDOF: Map<string, number>;
  status: 'under' | 'fully' | 'over';
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function dist(a: [number, number], b: [number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

function distSq(a: [number, number], b: [number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

function dot(a: [number, number], b: [number, number]): number {
  return a[0] * b[0] + a[1] * b[1];
}

function sub(a: [number, number], b: [number, number]): [number, number] {
  return [a[0] - b[0], a[1] - b[1]];
}

function add(a: [number, number], b: [number, number]): [number, number] {
  return [a[0] + b[0], a[1] + b[1]];
}

function scale(v: [number, number], s: number): [number, number] {
  return [v[0] * s, v[1] * s];
}

function length(v: [number, number]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}

function normalize(v: [number, number]): [number, number] {
  const len = length(v);
  if (len < EPS) return [0, 0];
  return [v[0] / len, v[1] / len];
}

function cross2D(a: [number, number], b: [number, number]): number {
  return a[0] * b[1] - a[1] * b[0];
}

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < EPS;
}

function pointsEqual(a: [number, number], b: [number, number]): boolean {
  return nearlyEqual(a[0], b[0]) && nearlyEqual(a[1], b[1]);
}

/** Parameter t of point projected onto line segment p1->p2. */
function paramOnSegment(p: [number, number], p1: [number, number], p2: [number, number]): number {
  const d = sub(p2, p1);
  const lenSq = dot(d, d);
  if (lenSq < EPS) return 0;
  return dot(sub(p, p1), d) / lenSq;
}

/** Normalise angle into [0, 2*PI). */
function normalizeAngle(a: number): number {
  const TWO_PI = 2 * Math.PI;
  let r = a % TWO_PI;
  if (r < 0) r += TWO_PI;
  return r;
}

/** Check if angle is between start and end (going counter-clockwise). */
function angleInArc(angle: number, start: number, end: number): boolean {
  const a = normalizeAngle(angle - start);
  const span = normalizeAngle(end - start);
  return a <= span + EPS;
}

// ─── 1. Intersection calculation ─────────────────────────────────────────────

/** Compute the intersection of two infinite lines defined by (p1,p2) and (p3,p4). Returns null if parallel. */
export function lineLineIntersection(
  p1: [number, number], p2: [number, number],
  p3: [number, number], p4: [number, number]
): [number, number] | null {
  const d1 = sub(p2, p1);
  const d2 = sub(p4, p3);
  const denom = cross2D(d1, d2);
  if (Math.abs(denom) < EPS) return null; // parallel or coincident

  const d3 = sub(p3, p1);
  const t = cross2D(d3, d2) / denom;

  return [p1[0] + t * d1[0], p1[1] + t * d1[1]];
}

/** Compute intersections of an infinite line (lineStart->lineEnd) with a circle (arcCenter, arcRadius). */
export function lineArcIntersection(
  lineStart: [number, number], lineEnd: [number, number],
  arcCenter: [number, number], arcRadius: number
): [number, number][] {
  const d = sub(lineEnd, lineStart);
  const f = sub(lineStart, arcCenter);

  const a = dot(d, d);
  const b = 2 * dot(f, d);
  const c = dot(f, f) - arcRadius * arcRadius;

  let discriminant = b * b - 4 * a * c;
  if (discriminant < -EPS) return [];
  if (discriminant < 0) discriminant = 0;

  const sqrtDisc = Math.sqrt(discriminant);
  const results: [number, number][] = [];

  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);

  results.push([lineStart[0] + t1 * d[0], lineStart[1] + t1 * d[1]]);
  if (Math.abs(t1 - t2) > EPS) {
    results.push([lineStart[0] + t2 * d[0], lineStart[1] + t2 * d[1]]);
  }

  return results;
}

/** Compute intersections of two circles (c1,r1) and (c2,r2). */
export function arcArcIntersection(
  c1: [number, number], r1: number,
  c2: [number, number], r2: number
): [number, number][] {
  const d = dist(c1, c2);
  if (d < EPS) return []; // concentric
  if (d > r1 + r2 + EPS) return []; // too far
  if (d < Math.abs(r1 - r2) - EPS) return []; // one inside the other

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const hSq = r1 * r1 - a * a;
  if (hSq < -EPS) return [];
  const h = hSq < 0 ? 0 : Math.sqrt(hSq);

  const dir = normalize(sub(c2, c1));
  const midPoint: [number, number] = [c1[0] + a * dir[0], c1[1] + a * dir[1]];
  const perp: [number, number] = [-dir[1], dir[0]];

  if (h < EPS) {
    return [midPoint];
  }

  return [
    [midPoint[0] + h * perp[0], midPoint[1] + h * perp[1]],
    [midPoint[0] - h * perp[0], midPoint[1] - h * perp[1]],
  ];
}

// ─── 2. Trim operation ───────────────────────────────────────────────────────

/**
 * Find all intersection points between the given line and otherEntities,
 * then remove the portion of the line surrounding the click point.
 */
export function trimLine(
  lineStart: [number, number], lineEnd: [number, number],
  clickPoint: [number, number],
  otherEntities: SketchEntity2D[]
): TrimResult {
  const dir = sub(lineEnd, lineStart);
  const segLen = length(dir);
  if (segLen < EPS) return { success: false, remainingSegments: [] };

  // Gather all intersection t-parameters on the line segment [0,1]
  const tValues: number[] = [];

  for (const entity of otherEntities) {
    let pts: [number, number][] = [];

    if (entity.type === 'line' && entity.points && entity.points.length >= 2) {
      const ix = lineLineIntersection(lineStart, lineEnd, entity.points[0], entity.points[1]);
      if (ix) pts.push(ix);
    } else if (entity.type === 'circle' && entity.center && entity.radius != null) {
      pts = lineArcIntersection(lineStart, lineEnd, entity.center, entity.radius);
    } else if (entity.type === 'arc' && entity.center && entity.radius != null) {
      const raw = lineArcIntersection(lineStart, lineEnd, entity.center, entity.radius);
      // Filter to only points on the arc span
      for (const p of raw) {
        const angle = normalizeAngle(Math.atan2(p[1] - entity.center[1], p[0] - entity.center[0]));
        if (angleInArc(angle, entity.startAngle ?? 0, entity.endAngle ?? 2 * Math.PI)) {
          pts.push(p);
        }
      }
    }

    for (const p of pts) {
      const t = paramOnSegment(p, lineStart, lineEnd);
      if (t > -EPS && t < 1 + EPS) {
        tValues.push(Math.max(0, Math.min(1, t)));
      }
    }
  }

  if (tValues.length === 0) {
    return { success: false, remainingSegments: [] };
  }

  // Sort t values and add segment boundaries
  tValues.push(0, 1);
  tValues.sort((a, b) => a - b);

  // Deduplicate
  const unique: number[] = [tValues[0]];
  for (let i = 1; i < tValues.length; i++) {
    if (tValues[i] - unique[unique.length - 1] > EPS) {
      unique.push(tValues[i]);
    }
  }

  // Find the click point's t parameter
  const tClick = paramOnSegment(clickPoint, lineStart, lineEnd);

  // Find which segment the click falls in
  let clickSegIdx = -1;
  for (let i = 0; i < unique.length - 1; i++) {
    if (tClick >= unique[i] - EPS && tClick <= unique[i + 1] + EPS) {
      clickSegIdx = i;
      break;
    }
  }

  if (clickSegIdx < 0) {
    return { success: false, remainingSegments: [] };
  }

  // Return all segments except the one containing the click
  const remaining: { start: [number, number]; end: [number, number] }[] = [];
  for (let i = 0; i < unique.length - 1; i++) {
    if (i === clickSegIdx) continue;
    if (unique[i + 1] - unique[i] < EPS) continue;
    remaining.push({
      start: add(lineStart, scale(dir, unique[i])),
      end: add(lineStart, scale(dir, unique[i + 1])),
    });
  }

  return { success: true, remainingSegments: remaining };
}

// ─── 3. Extend operation ─────────────────────────────────────────────────────

/**
 * Extend a line from one of its endpoints to the nearest boundary entity.
 * Returns the new endpoint, or null if no intersection found.
 */
export function extendLine(
  lineStart: [number, number], lineEnd: [number, number],
  extendFromEnd: boolean,
  boundaryEntities: SketchEntity2D[]
): [number, number] | null {
  const origin = extendFromEnd ? lineEnd : lineStart;
  const dir = extendFromEnd ? sub(lineEnd, lineStart) : sub(lineStart, lineEnd);
  const dirNorm = normalize(dir);

  let bestDist = Infinity;
  let bestPoint: [number, number] | null = null;

  for (const entity of boundaryEntities) {
    let candidates: [number, number][] = [];

    if (entity.type === 'line' && entity.points && entity.points.length >= 2) {
      const ix = lineLineIntersection(lineStart, lineEnd, entity.points[0], entity.points[1]);
      if (ix) {
        // Check that intersection lies on the boundary line segment
        const tBound = paramOnSegment(ix, entity.points[0], entity.points[1]);
        if (tBound > -EPS && tBound < 1 + EPS) {
          candidates.push(ix);
        }
      }
    } else if (entity.type === 'circle' && entity.center && entity.radius != null) {
      candidates = lineArcIntersection(lineStart, lineEnd, entity.center, entity.radius);
    } else if (entity.type === 'arc' && entity.center && entity.radius != null) {
      const raw = lineArcIntersection(lineStart, lineEnd, entity.center, entity.radius);
      for (const p of raw) {
        const angle = normalizeAngle(Math.atan2(p[1] - entity.center[1], p[0] - entity.center[0]));
        if (angleInArc(angle, entity.startAngle ?? 0, entity.endAngle ?? 2 * Math.PI)) {
          candidates.push(p);
        }
      }
    }

    for (const p of candidates) {
      // Must be in the extension direction (positive dot product with dir from origin)
      const toP = sub(p, origin);
      if (dot(toP, dirNorm) < EPS) continue;

      const d = dist(origin, p);
      if (d < bestDist) {
        bestDist = d;
        bestPoint = p;
      }
    }
  }

  return bestPoint;
}

// ─── 4. Offset operation ─────────────────────────────────────────────────────

/** Create an offset copy of a line segment at the given distance. Positive = left side, negative = right side. */
export function offsetLine(
  start: [number, number], end: [number, number],
  distance: number
): { start: [number, number]; end: [number, number] } {
  const d = sub(end, start);
  const len = length(d);
  if (len < EPS) return { start: [...start], end: [...end] };

  // Left-side normal
  const n: [number, number] = [-d[1] / len, d[0] / len];
  const offset: [number, number] = scale(n, distance);

  return {
    start: add(start, offset),
    end: add(end, offset),
  };
}

/** Create an offset copy of an arc/circle. Positive distance = outward, negative = inward. */
export function offsetArc(
  center: [number, number], radius: number,
  distance: number
): { center: [number, number]; radius: number } {
  const newRadius = radius + distance;
  return {
    center: [center[0], center[1]],
    radius: Math.max(0, newRadius),
  };
}

// ─── 5. Mirror operation ─────────────────────────────────────────────────────

/** Mirror a point about an axis line defined by (axisStart, axisEnd). */
export function mirrorPoint(
  point: [number, number],
  axisStart: [number, number], axisEnd: [number, number]
): [number, number] {
  const d = sub(axisEnd, axisStart);
  const lenSq = dot(d, d);
  if (lenSq < EPS) return [...point]; // degenerate axis

  const v = sub(point, axisStart);
  const t = dot(v, d) / lenSq;
  const proj: [number, number] = [axisStart[0] + t * d[0], axisStart[1] + t * d[1]];

  return [2 * proj[0] - point[0], 2 * proj[1] - point[1]];
}

/** Mirror a line segment about an axis. */
export function mirrorLine(
  start: [number, number], end: [number, number],
  axisStart: [number, number], axisEnd: [number, number]
): { start: [number, number]; end: [number, number] } {
  return {
    start: mirrorPoint(start, axisStart, axisEnd),
    end: mirrorPoint(end, axisStart, axisEnd),
  };
}

// ─── 6. Sketch Fillet ────────────────────────────────────────────────────────

/**
 * Given two lines that meet at a corner, compute a fillet arc of the specified radius.
 * Returns trimmed lines and the fillet arc, or null if geometry is degenerate.
 */
export function sketchFillet(
  line1Start: [number, number], line1End: [number, number],
  line2Start: [number, number], line2End: [number, number],
  radius: number
): SketchFilletResult | null {
  if (radius < EPS) return null;

  // Find the corner (intersection of the two lines)
  const corner = lineLineIntersection(line1Start, line1End, line2Start, line2End);
  if (!corner) return null; // parallel lines

  // Direction vectors from corner along each line
  const d1 = normalize(sub(line1End, line1Start));
  const d2 = normalize(sub(line2End, line2Start));

  // Determine which direction goes away from corner for each line
  const away1 = dot(sub(line1Start, corner), d1) > 0 ? scale(d1, -1) : d1;
  const away1Neg = dot(sub(line1End, corner), d1) > 0 ? d1 : scale(d1, -1);
  // Pick the direction that goes from corner toward the farther endpoint
  const dir1 = dist(add(corner, d1), line1End) < dist(add(corner, scale(d1, -1)), line1End) ? d1 : scale(d1, -1);
  const dir2 = dist(add(corner, d2), line2End) < dist(add(corner, scale(d2, -1)), line2End) ? d2 : scale(d2, -1);

  // Half-angle between the two directions
  const sinHalf = Math.abs(cross2D(dir1, dir2));
  if (sinHalf < EPS) return null; // lines are parallel

  // Distance from corner to tangent points
  const cosHalf = dot(dir1, dir2);
  const halfAngle = Math.acos(Math.max(-1, Math.min(1, cosHalf)));
  const tanDist = radius / Math.tan(halfAngle / 2);

  if (tanDist < EPS) return null;

  // Tangent points on each line
  const tp1: [number, number] = add(corner, scale(dir1, tanDist));
  const tp2: [number, number] = add(corner, scale(dir2, tanDist));

  // Fillet center: offset from corner along the bisector
  const bisector = normalize(add(dir1, dir2));
  const centerDist = radius / Math.sin(halfAngle / 2);
  const filletCenter: [number, number] = add(corner, scale(bisector, centerDist));

  // Verify radius
  const actualR = dist(filletCenter, tp1);
  if (Math.abs(actualR - radius) > 0.01) {
    // Try the other bisector direction
    const bisector2 = normalize(sub(dir1, dir2));
    // Fallback: just use computed center
  }

  // Compute arc angles
  const startAngle = Math.atan2(tp1[1] - filletCenter[1], tp1[0] - filletCenter[0]);
  const endAngle = Math.atan2(tp2[1] - filletCenter[1], tp2[0] - filletCenter[0]);

  // Determine trimmed lines: from original start to tangent point (or tangent point to original end)
  // Line1: keep the portion not near the corner
  const tl1Corner = paramOnSegment(corner, line1Start, line1End);
  const tl1Tp = paramOnSegment(tp1, line1Start, line1End);
  const trimmedLine1 = tl1Corner < 0.5
    ? { start: tp1, end: line1End }
    : { start: line1Start, end: tp1 };

  const tl2Corner = paramOnSegment(corner, line2Start, line2End);
  const trimmedLine2 = tl2Corner < 0.5
    ? { start: tp2, end: line2End }
    : { start: line2Start, end: tp2 };

  return {
    trimmedLine1,
    trimmedLine2,
    arc: {
      center: filletCenter,
      radius,
      startAngle,
      endAngle,
    },
  };
}

// ─── 7. Sketch Chamfer ───────────────────────────────────────────────────────

/**
 * Given two lines meeting at a corner, compute a chamfer (bevel) at the given distance.
 * The chamfer is equidistant from the corner along both lines.
 */
export function sketchChamfer(
  line1Start: [number, number], line1End: [number, number],
  line2Start: [number, number], line2End: [number, number],
  distance: number
): SketchChamferResult | null {
  if (distance < EPS) return null;

  const corner = lineLineIntersection(line1Start, line1End, line2Start, line2End);
  if (!corner) return null;

  const d1 = normalize(sub(line1End, line1Start));
  const d2 = normalize(sub(line2End, line2Start));

  // Direction away from corner on each line
  const dir1 = dist(add(corner, d1), line1End) < dist(add(corner, scale(d1, -1)), line1End) ? d1 : scale(d1, -1);
  const dir2 = dist(add(corner, d2), line2End) < dist(add(corner, scale(d2, -1)), line2End) ? d2 : scale(d2, -1);

  // Chamfer endpoints on each line
  const cp1: [number, number] = add(corner, scale(dir1, distance));
  const cp2: [number, number] = add(corner, scale(dir2, distance));

  const tl1Corner = paramOnSegment(corner, line1Start, line1End);
  const trimmedLine1 = tl1Corner < 0.5
    ? { start: cp1, end: line1End }
    : { start: line1Start, end: cp1 };

  const tl2Corner = paramOnSegment(corner, line2Start, line2End);
  const trimmedLine2 = tl2Corner < 0.5
    ? { start: cp2, end: line2End }
    : { start: line2Start, end: cp2 };

  return {
    trimmedLine1,
    trimmedLine2,
    chamferLine: { start: cp1, end: cp2 },
  };
}

// ─── 8. Move / Copy / Rotate / Pattern ───────────────────────────────────────

/** Translate an array of points by (dx, dy). */
export function movePoints(points: [number, number][], dx: number, dy: number): [number, number][] {
  return points.map(([x, y]) => [x + dx, y + dy]);
}

/** Rotate an array of points about a center by angleDeg degrees (CCW). */
export function rotatePoints(
  points: [number, number][], center: [number, number], angleDeg: number
): [number, number][] {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return points.map(([x, y]) => {
    const dx = x - center[0];
    const dy = y - center[1];
    return [
      center[0] + dx * cos - dy * sin,
      center[1] + dx * sin + dy * cos,
    ];
  });
}

/** Create a linear pattern: copy points `count` times, each offset by (dx, dy) from the previous. */
export function linearSketchPattern(
  points: [number, number][], dx: number, dy: number, count: number
): [number, number][][] {
  const result: [number, number][][] = [];
  for (let i = 0; i < count; i++) {
    result.push(movePoints(points, dx * i, dy * i));
  }
  return result;
}

/** Create a circular pattern: copy points `count` times equally spaced over totalAngleDeg. */
export function circularSketchPattern(
  points: [number, number][], center: [number, number], count: number, totalAngleDeg: number
): [number, number][][] {
  const result: [number, number][][] = [];
  const step = count > 1 ? totalAngleDeg / count : totalAngleDeg;
  for (let i = 0; i < count; i++) {
    result.push(rotatePoints(points, center, step * i));
  }
  return result;
}

// ─── 9. DOF (Degrees of Freedom) tracking ────────────────────────────────────

/**
 * Calculate degrees of freedom for a sketch.
 * Each unconstrained 2D point has 2 DOF. Constraints and fixed points remove DOF.
 */
export function calculateDOF(
  entityCount: number,
  constraintCount: number,
  fixedPointCount: number
): DOFResult {
  const rawDOF = 2 * entityCount;
  const totalDOF = rawDOF - constraintCount - 2 * fixedPointCount;

  let status: 'under' | 'fully' | 'over';
  if (totalDOF > 0) status = 'under';
  else if (totalDOF === 0) status = 'fully';
  else status = 'over';

  // Per-entity DOF is a simplified heuristic: distribute remaining DOF evenly
  const perEntityDOF = new Map<string, number>();
  const perEntity = entityCount > 0 ? Math.max(0, totalDOF) / entityCount : 0;
  for (let i = 0; i < entityCount; i++) {
    perEntityDOF.set(`entity_${i}`, Math.round(perEntity * 100) / 100);
  }

  return {
    totalDOF: Math.max(totalDOF, 0),
    perEntityDOF,
    status,
  };
}

// ─── 10. Utility: 3-point circle ─────────────────────────────────────────────

/**
 * Compute the circumscribed circle through three non-collinear points.
 * Returns null if the points are collinear or coincident.
 */
export function circleFrom3Points(
  p1: [number, number], p2: [number, number], p3: [number, number]
): { center: [number, number]; radius: number } | null {
  const ax = p1[0], ay = p1[1];
  const bx = p2[0], by = p2[1];
  const cx = p3[0], cy = p3[1];

  const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(D) < EPS) return null; // collinear

  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / D;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / D;

  const center: [number, number] = [ux, uy];
  const radius = dist(center, p1);

  return { center, radius };
}

// ─── 11. Utility: Slot profile ───────────────────────────────────────────────

/**
 * Create a slot (obround) profile: two semicircles connected by tangent lines.
 * center1 and center2 are the centers of the semicircular ends; width is the total slot width.
 */
export function createSlotProfile(
  center1: [number, number], center2: [number, number],
  width: number,
  slotType: 'straight' | 'arc' = 'straight'
): {
  lines: { start: [number, number]; end: [number, number] }[];
  arcs: { center: [number, number]; radius: number; startAngle: number; endAngle: number }[];
} {
  const halfWidth = width / 2;
  const d = sub(center2, center1);
  const len = length(d);

  if (len < EPS) {
    // Degenerate: both centers coincident, return a circle
    return {
      lines: [],
      arcs: [{ center: [...center1], radius: halfWidth, startAngle: 0, endAngle: 2 * Math.PI }],
    };
  }

  const dir = normalize(d);
  // Perpendicular (to the left of dir)
  const perp: [number, number] = [-dir[1], dir[0]];

  const offset = scale(perp, halfWidth);

  // Four corner points of the slot
  const p1: [number, number] = add(center1, offset);        // top-left
  const p2: [number, number] = add(center2, offset);        // top-right
  const p3: [number, number] = sub(center2, offset);        // bottom-right
  const p4: [number, number] = sub(center1, offset);        // bottom-left

  // Angle of the slot axis
  const axisAngle = Math.atan2(dir[1], dir[0]);
  const perpAngle = Math.atan2(perp[1], perp[0]);

  // Two tangent lines connecting the semicircles
  const line1 = { start: p1, end: p2 }; // top
  const line2 = { start: p3, end: p4 }; // bottom

  // Two semicircular arcs
  // Arc at center2: from top-right (p2) to bottom-right (p3), going clockwise (right semicircle)
  const arc1StartAngle = perpAngle;
  const arc1EndAngle = perpAngle + Math.PI;

  // Arc at center1: from bottom-left (p4) to top-left (p1), going clockwise (left semicircle)
  const arc2StartAngle = perpAngle + Math.PI;
  const arc2EndAngle = perpAngle + 2 * Math.PI;

  return {
    lines: [line1, line2],
    arcs: [
      {
        center: [...center2],
        radius: halfWidth,
        startAngle: normalizeAngle(arc1StartAngle),
        endAngle: normalizeAngle(arc1EndAngle),
      },
      {
        center: [...center1],
        radius: halfWidth,
        startAngle: normalizeAngle(arc2StartAngle),
        endAngle: normalizeAngle(arc2EndAngle),
      },
    ],
  };
}

// ─── 12. Ellipse ──────────────────────────────────────────────────────────────

/**
 * Create points on an ellipse for rendering.
 * Returns an array of [x,y] points around the ellipse.
 */
export function createEllipsePoints(
  center: [number, number],
  rx: number,
  ry: number,
  rotation: number = 0,
  segments: number = 64
): [number, number][] {
  const points: [number, number][] = [];
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    const px = rx * Math.cos(angle);
    const py = ry * Math.sin(angle);
    // Rotate by ellipse rotation
    points.push([
      center[0] + px * cos - py * sin,
      center[1] + px * sin + py * cos,
    ]);
  }
  return points;
}

/**
 * Check if a point is on an ellipse (within tolerance).
 */
export function pointOnEllipse(
  point: [number, number],
  center: [number, number],
  rx: number,
  ry: number,
  tolerance: number = 0.01
): boolean {
  if (rx < EPS || ry < EPS) return false;
  const dx = point[0] - center[0];
  const dy = point[1] - center[1];
  const val = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
  return Math.abs(val - 1.0) < tolerance;
}

// ─── 13. Parabola ─────────────────────────────────────────────────────────────

/**
 * Create points on a parabola for rendering.
 * Parabola defined by vertex and focus. Equation: (y-k)^2 = 4p(x-h) where p = dist(vertex, focus).
 */
export function createParabolaPoints(
  vertex: [number, number],
  focus: [number, number],
  tMin: number = -5,
  tMax: number = 5,
  segments: number = 64
): [number, number][] {
  const points: [number, number][] = [];
  const dx = focus[0] - vertex[0];
  const dy = focus[1] - vertex[1];
  const p = Math.sqrt(dx * dx + dy * dy);
  if (p < EPS) return points;

  // Direction from vertex to focus
  const angle = Math.atan2(dy, dx);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  for (let i = 0; i <= segments; i++) {
    const t = tMin + (tMax - tMin) * (i / segments);
    // Parabola in local coords: x = t^2/(4p), y = t
    const lx = (t * t) / (4 * p);
    const ly = t;
    // Rotate to world coords
    points.push([
      vertex[0] + lx * cos - ly * sin,
      vertex[1] + lx * sin + ly * cos,
    ]);
  }
  return points;
}

// ─── 14. 3-Point Arc ──────────────────────────────────────────────────────────

/**
 * Create an arc passing through three points.
 * Returns the arc center, radius, and start/end angles, or null if collinear.
 */
export function arcFrom3Points(
  p1: [number, number],
  p2: [number, number],
  p3: [number, number]
): { center: [number, number]; radius: number; startAngle: number; endAngle: number } | null {
  const circle = circleFrom3Points(p1, p2, p3);
  if (!circle) return null;

  const startAngle = Math.atan2(p1[1] - circle.center[1], p1[0] - circle.center[0]);
  const midAngle = Math.atan2(p2[1] - circle.center[1], p2[0] - circle.center[0]);
  const endAngle = Math.atan2(p3[1] - circle.center[1], p3[0] - circle.center[0]);

  // Determine arc direction: if midpoint is in the CCW arc from start to end, use that direction
  const normalizedMid = normalizeAngle(midAngle - startAngle);
  const normalizedEnd = normalizeAngle(endAngle - startAngle);

  if (normalizedMid <= normalizedEnd) {
    return { center: circle.center, radius: circle.radius, startAngle, endAngle };
  }
  // Reverse: go the other way
  return { center: circle.center, radius: circle.radius, startAngle: endAngle, endAngle: startAngle };
}

// ─── 15. Tangent Arc ──────────────────────────────────────────────────────────

/**
 * Create an arc tangent to a line at a given point, ending at another point.
 * The arc starts tangent to the line direction at startPoint.
 */
export function tangentArc(
  lineStart: [number, number],
  lineEnd: [number, number],
  tangentPoint: [number, number],
  endPoint: [number, number]
): { center: [number, number]; radius: number; startAngle: number; endAngle: number } | null {
  // Line direction at tangent point
  const lineDir = normalize(sub(lineEnd, lineStart));
  // Perpendicular to line (candidate center directions)
  const perp: [number, number] = [-lineDir[1], lineDir[0]];

  // The center lies on the line through tangentPoint perpendicular to lineDir
  // and equidistant from tangentPoint and endPoint (perpendicular bisector)
  const mid = scale(add(tangentPoint, endPoint), 0.5);
  const chordDir = sub(endPoint, tangentPoint);
  const chordPerp: [number, number] = [-chordDir[1], chordDir[0]];

  // Intersect: tangentPoint + t*perp = mid + s*chordPerp
  const center = lineLineIntersection(
    tangentPoint, add(tangentPoint, perp),
    mid, add(mid, chordPerp)
  );
  if (!center) return null;

  const radius = dist(center, tangentPoint);
  const startAngle = Math.atan2(tangentPoint[1] - center[1], tangentPoint[0] - center[0]);
  const endAngle = Math.atan2(endPoint[1] - center[1], endPoint[0] - center[0]);

  return { center, radius, startAngle, endAngle };
}

// ─── 16. Center Rectangle ────────────────────────────────────────────────────

/**
 * Create a rectangle from its center point and half-extents.
 * Returns four corners in order: TL, TR, BR, BL.
 */
export function createCenterRectangle(
  center: [number, number],
  halfWidth: number,
  halfHeight: number
): [number, number][] {
  return [
    [center[0] - halfWidth, center[1] + halfHeight],
    [center[0] + halfWidth, center[1] + halfHeight],
    [center[0] + halfWidth, center[1] - halfHeight],
    [center[0] - halfWidth, center[1] - halfHeight],
  ];
}

// ─── 17. Power Trim ──────────────────────────────────────────────────────────

/**
 * Power trim: trim all entities that a drag path crosses.
 * For each entity, check if the drag path intersects it, and if so, trim
 * at the intersection point nearest the drag path.
 * Returns a list of trimmed entity IDs and their remaining segments.
 */
export function powerTrim(
  dragPath: [number, number][],
  entities: (SketchEntity2D & { id: string })[]
): { id: string; remainingSegments: { start: [number, number]; end: [number, number] }[] }[] {
  const results: { id: string; remainingSegments: { start: [number, number]; end: [number, number] }[] }[] = [];

  if (dragPath.length < 2) return results;

  for (const entity of entities) {
    if (entity.type !== 'line' || !entity.points || entity.points.length < 2) continue;

    // Check each segment of the drag path for intersection with this entity
    let intersects = false;
    let bestClickPoint: [number, number] = dragPath[0];

    for (let i = 0; i < dragPath.length - 1; i++) {
      const ix = lineLineIntersection(
        dragPath[i], dragPath[i + 1],
        entity.points[0], entity.points[1]
      );
      if (ix) {
        // Check if intersection is on both segments
        const tDrag = paramOnSegment(ix, dragPath[i], dragPath[i + 1]);
        const tEntity = paramOnSegment(ix, entity.points[0], entity.points[1]);
        if (tDrag >= -EPS && tDrag <= 1 + EPS && tEntity >= -EPS && tEntity <= 1 + EPS) {
          intersects = true;
          bestClickPoint = ix;
          break;
        }
      }
    }

    if (intersects) {
      // Find other entities to trim against (all except current)
      const others = entities.filter((e) => e.id !== entity.id);
      const result = trimLine(
        entity.points[0], entity.points[1],
        bestClickPoint,
        others
      );
      if (result.success) {
        results.push({ id: entity.id, remainingSegments: result.remainingSegments });
      }
    }
  }

  return results;
}

// ─── 18. Split Entity ────────────────────────────────────────────────────────

/**
 * Split a line at a specific point into two segments.
 * Returns two line segments, or null if the point is not on the line.
 */
export function splitLine(
  lineStart: [number, number],
  lineEnd: [number, number],
  splitPoint: [number, number]
): { seg1: { start: [number, number]; end: [number, number] }; seg2: { start: [number, number]; end: [number, number] } } | null {
  const t = paramOnSegment(splitPoint, lineStart, lineEnd);
  if (t < EPS || t > 1 - EPS) return null; // Point not on segment interior

  const point: [number, number] = [
    lineStart[0] + t * (lineEnd[0] - lineStart[0]),
    lineStart[1] + t * (lineEnd[1] - lineStart[1]),
  ];

  return {
    seg1: { start: [...lineStart], end: point },
    seg2: { start: point, end: [...lineEnd] },
  };
}

// ─── 19. Convert Entities ────────────────────────────────────────────────────

/**
 * Convert a 3D edge to 2D sketch entities by projecting onto a sketch plane.
 * This is a utility for "Convert Entities" tool that projects 3D edges onto
 * the active sketch plane.
 */
export function projectToSketchPlane(
  points3D: [number, number, number][],
  plane: 'xy' | 'xz' | 'yz'
): [number, number][] {
  return points3D.map((p) => {
    switch (plane) {
      case 'xy': return [p[0], p[1]] as [number, number];
      case 'xz': return [p[0], p[2]] as [number, number];
      case 'yz': return [p[1], p[2]] as [number, number];
    }
  });
}

// ─── 20. Offset Entities ─────────────────────────────────────────────────────

/**
 * Offset a chain of connected line segments by a given distance.
 * Returns the offset polyline.
 */
export function offsetPolyline(
  points: [number, number][],
  distance: number
): [number, number][] {
  if (points.length < 2) return [...points.map(p => [...p] as [number, number])];

  const result: [number, number][] = [];

  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      // First point: offset perpendicular to first segment
      const d = sub(points[1], points[0]);
      const len = length(d);
      if (len < EPS) { result.push([...points[0]]); continue; }
      const n: [number, number] = [-d[1] / len, d[0] / len];
      result.push(add(points[0], scale(n, distance)));
    } else if (i === points.length - 1) {
      // Last point: offset perpendicular to last segment
      const d = sub(points[i], points[i - 1]);
      const len = length(d);
      if (len < EPS) { result.push([...points[i]]); continue; }
      const n: [number, number] = [-d[1] / len, d[0] / len];
      result.push(add(points[i], scale(n, distance)));
    } else {
      // Middle point: bisector of the two adjacent segments
      const d1 = normalize(sub(points[i], points[i - 1]));
      const d2 = normalize(sub(points[i + 1], points[i]));
      const n1: [number, number] = [-d1[1], d1[0]];
      const n2: [number, number] = [-d2[1], d2[0]];
      const bisector = normalize(add(n1, n2));
      // Miter length = distance / cos(half-angle)
      const dotVal = dot(n1, bisector);
      const miterLen = Math.abs(dotVal) > EPS ? distance / dotVal : distance;
      result.push(add(points[i], scale(bisector, miterLen)));
    }
  }

  return result;
}

// ─── 21. Mirror Entities ─────────────────────────────────────────────────────

/**
 * Mirror a set of 2D points about an axis defined by two points.
 * Returns the mirrored points.
 */
export function mirrorEntities(
  points: [number, number][],
  axisStart: [number, number],
  axisEnd: [number, number]
): [number, number][] {
  return points.map((p) => mirrorPoint(p, axisStart, axisEnd));
}

/**
 * Mirror an arc about an axis.
 */
export function mirrorArc(
  center: [number, number],
  radius: number,
  startAngle: number,
  endAngle: number,
  axisStart: [number, number],
  axisEnd: [number, number]
): { center: [number, number]; radius: number; startAngle: number; endAngle: number } {
  const newCenter = mirrorPoint(center, axisStart, axisEnd);

  // Mirror the start and end angle points
  const startPt: [number, number] = [
    center[0] + radius * Math.cos(startAngle),
    center[1] + radius * Math.sin(startAngle),
  ];
  const endPt: [number, number] = [
    center[0] + radius * Math.cos(endAngle),
    center[1] + radius * Math.sin(endAngle),
  ];

  const mirStart = mirrorPoint(startPt, axisStart, axisEnd);
  const mirEnd = mirrorPoint(endPt, axisStart, axisEnd);

  const newStartAngle = Math.atan2(mirStart[1] - newCenter[1], mirStart[0] - newCenter[0]);
  const newEndAngle = Math.atan2(mirEnd[1] - newCenter[1], mirEnd[0] - newCenter[0]);

  // Mirror reverses arc direction
  return { center: newCenter, radius, startAngle: newEndAngle, endAngle: newStartAngle };
}

// ─── 22. Text on Sketch ──────────────────────────────────────────────────────

/**
 * Generate outline points for text characters on a sketch plane.
 * Returns polyline segments for each character (simplified block font).
 */
export function createSketchText(
  text: string,
  origin: [number, number],
  charHeight: number = 1.0,
  charSpacing: number = 0.6
): { start: [number, number]; end: [number, number] }[] {
  const segments: { start: [number, number]; end: [number, number] }[] = [];
  const charWidth = charHeight * 0.6;
  let xOffset = 0;

  for (const char of text.toUpperCase()) {
    const cx = origin[0] + xOffset;
    const cy = origin[1];
    const w = charWidth;
    const h = charHeight;

    // Simplified block-letter segments for common characters
    const charSegments = getCharSegments(char, cx, cy, w, h);
    segments.push(...charSegments);
    xOffset += charWidth + charSpacing * charHeight * 0.3;
  }

  return segments;
}

function getCharSegments(
  char: string,
  x: number, y: number,
  w: number, h: number
): { start: [number, number]; end: [number, number] }[] {
  const segs: { start: [number, number]; end: [number, number] }[] = [];
  const l = x, r = x + w, b = y, t = y + h, m = y + h / 2, cx = x + w / 2;

  switch (char) {
    case 'A':
      segs.push({ start: [l, b], end: [cx, t] }, { start: [cx, t], end: [r, b] }, { start: [l + w * 0.15, m], end: [r - w * 0.15, m] });
      break;
    case 'B':
      segs.push({ start: [l, b], end: [l, t] }, { start: [l, t], end: [r - w * 0.15, t] }, { start: [r - w * 0.15, t], end: [r, t - h * 0.1] }, { start: [r, t - h * 0.1], end: [r, m + h * 0.05] }, { start: [r, m + h * 0.05], end: [l, m] }, { start: [l, m], end: [r, m - h * 0.05] }, { start: [r, m - h * 0.05], end: [r, b + h * 0.1] }, { start: [r, b + h * 0.1], end: [l, b] });
      break;
    case 'C':
      segs.push({ start: [r, t], end: [l, t] }, { start: [l, t], end: [l, b] }, { start: [l, b], end: [r, b] });
      break;
    case 'D':
      segs.push({ start: [l, b], end: [l, t] }, { start: [l, t], end: [r - w * 0.2, t] }, { start: [r - w * 0.2, t], end: [r, m] }, { start: [r, m], end: [r - w * 0.2, b] }, { start: [r - w * 0.2, b], end: [l, b] });
      break;
    case 'E':
      segs.push({ start: [r, t], end: [l, t] }, { start: [l, t], end: [l, b] }, { start: [l, b], end: [r, b] }, { start: [l, m], end: [r - w * 0.2, m] });
      break;
    case 'F':
      segs.push({ start: [r, t], end: [l, t] }, { start: [l, t], end: [l, b] }, { start: [l, m], end: [r - w * 0.2, m] });
      break;
    case 'H':
      segs.push({ start: [l, b], end: [l, t] }, { start: [r, b], end: [r, t] }, { start: [l, m], end: [r, m] });
      break;
    case 'I':
      segs.push({ start: [cx, b], end: [cx, t] }, { start: [l + w * 0.2, t], end: [r - w * 0.2, t] }, { start: [l + w * 0.2, b], end: [r - w * 0.2, b] });
      break;
    case 'L':
      segs.push({ start: [l, t], end: [l, b] }, { start: [l, b], end: [r, b] });
      break;
    case 'M':
      segs.push({ start: [l, b], end: [l, t] }, { start: [l, t], end: [cx, m] }, { start: [cx, m], end: [r, t] }, { start: [r, t], end: [r, b] });
      break;
    case 'N':
      segs.push({ start: [l, b], end: [l, t] }, { start: [l, t], end: [r, b] }, { start: [r, b], end: [r, t] });
      break;
    case 'O':
      segs.push({ start: [l, b], end: [l, t] }, { start: [l, t], end: [r, t] }, { start: [r, t], end: [r, b] }, { start: [r, b], end: [l, b] });
      break;
    case 'P':
      segs.push({ start: [l, b], end: [l, t] }, { start: [l, t], end: [r, t] }, { start: [r, t], end: [r, m] }, { start: [r, m], end: [l, m] });
      break;
    case 'R':
      segs.push({ start: [l, b], end: [l, t] }, { start: [l, t], end: [r, t] }, { start: [r, t], end: [r, m] }, { start: [r, m], end: [l, m] }, { start: [cx, m], end: [r, b] });
      break;
    case 'S':
      segs.push({ start: [r, t], end: [l, t] }, { start: [l, t], end: [l, m] }, { start: [l, m], end: [r, m] }, { start: [r, m], end: [r, b] }, { start: [r, b], end: [l, b] });
      break;
    case 'T':
      segs.push({ start: [l, t], end: [r, t] }, { start: [cx, t], end: [cx, b] });
      break;
    case 'U':
      segs.push({ start: [l, t], end: [l, b] }, { start: [l, b], end: [r, b] }, { start: [r, b], end: [r, t] });
      break;
    case 'V':
      segs.push({ start: [l, t], end: [cx, b] }, { start: [cx, b], end: [r, t] });
      break;
    case 'W':
      segs.push({ start: [l, t], end: [l + w * 0.25, b] }, { start: [l + w * 0.25, b], end: [cx, m] }, { start: [cx, m], end: [r - w * 0.25, b] }, { start: [r - w * 0.25, b], end: [r, t] });
      break;
    case 'X':
      segs.push({ start: [l, t], end: [r, b] }, { start: [r, t], end: [l, b] });
      break;
    case 'Y':
      segs.push({ start: [l, t], end: [cx, m] }, { start: [r, t], end: [cx, m] }, { start: [cx, m], end: [cx, b] });
      break;
    case 'Z':
      segs.push({ start: [l, t], end: [r, t] }, { start: [r, t], end: [l, b] }, { start: [l, b], end: [r, b] });
      break;
    case '0': case 'G': case 'J': case 'K': case 'Q':
      segs.push({ start: [l, b], end: [l, t] }, { start: [l, t], end: [r, t] }, { start: [r, t], end: [r, b] }, { start: [r, b], end: [l, b] });
      break;
    case '1':
      segs.push({ start: [cx, b], end: [cx, t] });
      break;
    case ' ':
      break;
    case '-':
      segs.push({ start: [l + w * 0.1, m], end: [r - w * 0.1, m] });
      break;
    default:
      // Fallback: draw a small box
      segs.push({ start: [l, b], end: [l, t] }, { start: [l, t], end: [r, t] }, { start: [r, t], end: [r, b] }, { start: [r, b], end: [l, b] });
      break;
  }
  return segs;
}

// ─── Additional Modify Operations ──────────────────────────────────────────

/**
 * Break a line at a given point, producing two segments.
 * The breakPoint must lie on or near the line (within tolerance).
 */
export function breakLine(
  start: [number, number],
  end: [number, number],
  breakPoint: [number, number],
  tolerance: number = 0.1
): { seg1: { start: [number, number]; end: [number, number] }; seg2: { start: [number, number]; end: [number, number] } } | null {
  const lineDir = sub(end, start);
  const lineLen = length(lineDir);
  if (lineLen < EPS) return null;

  const toPoint = sub(breakPoint, start);
  const t = dot(toPoint, lineDir) / (lineLen * lineLen);
  if (t < 0 || t > 1) return null;

  const projected: [number, number] = add(start, scale(lineDir, t));
  if (dist(projected, breakPoint) > tolerance) return null;

  return {
    seg1: { start, end: projected },
    seg2: { start: projected, end },
  };
}

/**
 * Join two collinear or touching line segments into one.
 * Returns null if lines can't be joined (too far apart or not collinear enough).
 */
export function joinLines(
  line1Start: [number, number],
  line1End: [number, number],
  line2Start: [number, number],
  line2End: [number, number],
  tolerance: number = 0.15
): { start: [number, number]; end: [number, number] } | null {
  // Find the closest pair of endpoints
  const pairs: [number, [number, number], [number, number], [number, number], [number, number]][] = [
    [dist(line1End, line2Start), line1Start, line1End, line2Start, line2End],
    [dist(line1End, line2End), line1Start, line1End, line2End, line2Start],
    [dist(line1Start, line2Start), line1End, line1Start, line2Start, line2End],
    [dist(line1Start, line2End), line1End, line1Start, line2End, line2Start],
  ];
  pairs.sort((a, b) => a[0] - b[0]);

  const [gap, outerA, innerA, innerB, outerB] = pairs[0];
  if (gap > tolerance) return null;

  return { start: outerA, end: outerB };
}

/**
 * Stretch line endpoints within a selection window by a delta.
 * Points inside the window are moved; points outside stay fixed.
 */
export function stretchLine(
  start: [number, number],
  end: [number, number],
  windowMin: [number, number],
  windowMax: [number, number],
  delta: [number, number]
): { start: [number, number]; end: [number, number] } {
  const inWindow = (p: [number, number]) =>
    p[0] >= windowMin[0] && p[0] <= windowMax[0] &&
    p[1] >= windowMin[1] && p[1] <= windowMax[1];

  const newStart: [number, number] = inWindow(start)
    ? [start[0] + delta[0], start[1] + delta[1]]
    : start;
  const newEnd: [number, number] = inWindow(end)
    ? [end[0] + delta[0], end[1] + delta[1]]
    : end;

  return { start: newStart, end: newEnd };
}

/**
 * Lengthen or shorten a line by a delta distance from one end.
 * Positive delta extends, negative shortens.
 */
export function lengthenLine(
  start: [number, number],
  end: [number, number],
  delta: number,
  fromEnd: "start" | "end" = "end"
): { start: [number, number]; end: [number, number] } {
  const dir = sub(end, start);
  const len = length(dir);
  if (len < EPS) return { start, end };

  const unitDir: [number, number] = [dir[0] / len, dir[1] / len];

  if (fromEnd === "end") {
    const newEnd: [number, number] = [end[0] + unitDir[0] * delta, end[1] + unitDir[1] * delta];
    return { start, end: newEnd };
  } else {
    const newStart: [number, number] = [start[0] - unitDir[0] * delta, start[1] - unitDir[1] * delta];
    return { start: newStart, end };
  }
}

/**
 * Fillet with preview: returns the fillet arc and trimmed lines for visual preview
 * before committing. Same as sketchFillet but named for clarity.
 */
export function filletPreview(
  line1Start: [number, number],
  line1End: [number, number],
  line2Start: [number, number],
  line2End: [number, number],
  radius: number
): SketchFilletResult | null {
  return sketchFillet(line1Start, line1End, line2Start, line2End, radius);
}

/**
 * Chamfer with preview: returns chamfer line and trimmed lines.
 */
export function chamferPreview(
  line1Start: [number, number],
  line1End: [number, number],
  line2Start: [number, number],
  line2End: [number, number],
  dist1: number,
  dist2?: number
): SketchChamferResult | null {
  return sketchChamfer(line1Start, line1End, line2Start, line2End, dist1, dist2);
}
