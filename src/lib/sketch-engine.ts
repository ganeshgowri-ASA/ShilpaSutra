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
  type: 'line' | 'arc' | 'circle';
  points?: [number, number][];   // for lines: [start, end]
  center?: [number, number];     // for arc/circle
  radius?: number;               // for arc/circle
  startAngle?: number;           // for arc (radians)
  endAngle?: number;             // for arc (radians)
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
  width: number
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
