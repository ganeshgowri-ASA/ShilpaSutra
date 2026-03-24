'use client';

/**
 * ShilpaSutra Constraint Solver Bridge
 *
 * Bridges the constraint-store (which has the Gauss-Newton solver) with the
 * cad-store (which holds actual CadObject positions). Extracts geometric points
 * from sketch entities, feeds them to the solver, and writes results back.
 *
 * Also provides:
 * - Closed profile detection for Sketch → 3D extrude pipeline
 * - DOF (Degrees of Freedom) tracking per entity
 * - Constraint color coding: blue=under, green=full, red=over
 */

import type { CadObject } from '@/stores/cad-store';
import type { GeometricConstraint, ConstraintType } from '@/stores/constraint-store';

// ─── Types ──────────────────────────────────────────────────────────────────

type Vec3 = [number, number, number];

export interface SketchPoint {
  id: string;       // unique point ID like "obj_3_start" or "obj_3_center"
  entityId: string;  // parent CadObject ID
  role: 'start' | 'end' | 'center' | 'corner1' | 'corner2' | 'corner3' | 'corner4' | 'control';
  position: Vec3;
}

export interface EntityDOFInfo {
  entityId: string;
  dof: number; // remaining degrees of freedom
  status: 'under' | 'fully' | 'over';
}

export interface ClosedProfile {
  entityIds: string[];
  points: Vec3[]; // ordered profile points (2D projected)
  sketchPlane: 'xy' | 'xz' | 'yz';
}

export interface SolverBridgeResult {
  success: boolean;
  iterations: number;
  residual: number;
  updatedEntities: Map<string, Partial<CadObject>>;
  entityDOF: Map<string, EntityDOFInfo>;
  totalDOF: number;
  overallStatus: 'under' | 'fully' | 'over';
}

// ─── Point Extraction ───────────────────────────────────────────────────────

/**
 * Extract moveable points from a CadObject for the constraint solver.
 */
export function extractPoints(obj: CadObject): SketchPoint[] {
  const pts: SketchPoint[] = [];

  switch (obj.type) {
    case 'line':
      if (obj.linePoints && obj.linePoints.length >= 2) {
        pts.push({ id: `${obj.id}_start`, entityId: obj.id, role: 'start', position: [...obj.linePoints[0]] });
        pts.push({ id: `${obj.id}_end`, entityId: obj.id, role: 'end', position: [...obj.linePoints[1]] });
      }
      break;

    case 'circle':
      if (obj.circleCenter) {
        pts.push({ id: `${obj.id}_center`, entityId: obj.id, role: 'center', position: [...obj.circleCenter] });
        // Add a point on the circle for radius constraints
        const r = obj.circleRadius || 1;
        pts.push({ id: `${obj.id}_edge`, entityId: obj.id, role: 'end', position: [obj.circleCenter[0] + r, obj.circleCenter[1], obj.circleCenter[2]] });
      }
      break;

    case 'arc':
      if (obj.arcPoints && obj.arcPoints.length >= 2) {
        pts.push({ id: `${obj.id}_start`, entityId: obj.id, role: 'start', position: [...obj.arcPoints[0]] });
        pts.push({ id: `${obj.id}_end`, entityId: obj.id, role: 'end', position: [...obj.arcPoints[obj.arcPoints.length - 1]] });
        // Center point (estimated from arc)
        if (obj.arcPoints.length >= 3) {
          pts.push({ id: `${obj.id}_center`, entityId: obj.id, role: 'center', position: [...obj.arcPoints[1]] });
        }
      }
      break;

    case 'rectangle':
      if (obj.rectCorners) {
        const [c1, c2] = obj.rectCorners;
        pts.push({ id: `${obj.id}_corner1`, entityId: obj.id, role: 'corner1', position: [...c1] });
        pts.push({ id: `${obj.id}_corner2`, entityId: obj.id, role: 'corner2', position: [...c2] });
      }
      break;

    case 'ellipse':
      if (obj.ellipseCenter) {
        pts.push({ id: `${obj.id}_center`, entityId: obj.id, role: 'center', position: [...obj.ellipseCenter] });
      }
      break;

    case 'point':
      if (obj.pointPosition) {
        pts.push({ id: `${obj.id}_pos`, entityId: obj.id, role: 'center', position: [...obj.pointPosition] });
      }
      break;

    case 'polygon':
      if (obj.polygonPoints && obj.polygonPoints.length > 0) {
        obj.polygonPoints.forEach((p, i) => {
          pts.push({ id: `${obj.id}_v${i}`, entityId: obj.id, role: i === 0 ? 'start' : 'end', position: [...p] });
        });
      }
      break;

    case 'centerline':
      if (obj.centerlinePoints && obj.centerlinePoints.length >= 2) {
        pts.push({ id: `${obj.id}_start`, entityId: obj.id, role: 'start', position: [...obj.centerlinePoints[0]] });
        pts.push({ id: `${obj.id}_end`, entityId: obj.id, role: 'end', position: [...obj.centerlinePoints[1]] });
      }
      break;

    case 'slot':
      if (obj.slotCenter1 && obj.slotCenter2) {
        pts.push({ id: `${obj.id}_c1`, entityId: obj.id, role: 'start', position: [...obj.slotCenter1] });
        pts.push({ id: `${obj.id}_c2`, entityId: obj.id, role: 'end', position: [...obj.slotCenter2] });
      }
      break;
  }

  return pts;
}

/**
 * Get the point IDs that represent a line entity (start and end).
 * Used for constraints like horizontal, vertical, parallel, etc.
 */
export function getLinePointIds(obj: CadObject): [string, string] | null {
  switch (obj.type) {
    case 'line':
      if (obj.linePoints && obj.linePoints.length >= 2) {
        return [`${obj.id}_start`, `${obj.id}_end`];
      }
      break;
    case 'centerline':
      if (obj.centerlinePoints && obj.centerlinePoints.length >= 2) {
        return [`${obj.id}_start`, `${obj.id}_end`];
      }
      break;
    case 'rectangle':
      if (obj.rectCorners) {
        return [`${obj.id}_corner1`, `${obj.id}_corner2`];
      }
      break;
  }
  return null;
}

/**
 * Get the center point ID for circular entities.
 */
export function getCenterPointId(obj: CadObject): string | null {
  if (obj.type === 'circle' || obj.type === 'ellipse') return `${obj.id}_center`;
  if (obj.type === 'arc' && obj.arcPoints && obj.arcPoints.length >= 3) return `${obj.id}_center`;
  return null;
}

// ─── Build Entity IDs for Constraint ────────────────────────────────────────

/**
 * Given selected CadObjects and a constraint type, determine the correct
 * entity IDs to use in the constraint.
 */
export function buildConstraintEntityIds(
  type: ConstraintType,
  selectedObjects: CadObject[]
): string[] | null {
  if (selectedObjects.length === 0) return null;

  switch (type) {
    case 'horizontal':
    case 'vertical': {
      // For a single line: constrain its start and end points
      const obj = selectedObjects[0];
      const pts = getLinePointIds(obj);
      if (pts) return pts;
      // For two points
      if (selectedObjects.length >= 2) {
        const p1 = extractPoints(selectedObjects[0]);
        const p2 = extractPoints(selectedObjects[1]);
        if (p1.length > 0 && p2.length > 0) return [p1[0].id, p2[0].id];
      }
      return null;
    }

    case 'coincident': {
      if (selectedObjects.length < 2) return null;
      const p1 = extractPoints(selectedObjects[0]);
      const p2 = extractPoints(selectedObjects[1]);
      if (p1.length === 0 || p2.length === 0) return null;
      // Use endpoints nearest to each other
      return [p1[p1.length - 1].id, p2[0].id];
    }

    case 'fix': {
      const pts = extractPoints(selectedObjects[0]);
      return pts.map(p => p.id);
    }

    case 'equal': {
      if (selectedObjects.length < 2) return null;
      const l1 = getLinePointIds(selectedObjects[0]);
      const l2 = getLinePointIds(selectedObjects[1]);
      if (l1 && l2) return [...l1, ...l2];
      return null;
    }

    case 'parallel':
    case 'perpendicular': {
      if (selectedObjects.length < 2) return null;
      const l1 = getLinePointIds(selectedObjects[0]);
      const l2 = getLinePointIds(selectedObjects[1]);
      if (l1 && l2) return [...l1, ...l2];
      return null;
    }

    case 'concentric': {
      if (selectedObjects.length < 2) return null;
      const c1 = getCenterPointId(selectedObjects[0]);
      const c2 = getCenterPointId(selectedObjects[1]);
      if (c1 && c2) return [c1, c2];
      return null;
    }

    case 'tangent': {
      if (selectedObjects.length < 2) return null;
      // Circle + Line tangent
      const circle = selectedObjects.find(o => o.type === 'circle');
      const line = selectedObjects.find(o => o.type === 'line' || o.type === 'centerline');
      if (circle && line) {
        const cPts = extractPoints(circle);
        const lPts = getLinePointIds(line);
        if (cPts.length >= 2 && lPts) {
          return [cPts[0].id, cPts[1].id, ...lPts];
        }
      }
      return null;
    }

    case 'symmetric': {
      if (selectedObjects.length < 3) return null;
      const p1 = extractPoints(selectedObjects[0]);
      const p2 = extractPoints(selectedObjects[1]);
      const axis = getLinePointIds(selectedObjects[2]);
      if (p1.length > 0 && p2.length > 0 && axis) {
        return [p1[0].id, p2[0].id, ...axis];
      }
      return null;
    }

    case 'midpoint': {
      if (selectedObjects.length < 2) return null;
      const pointObj = selectedObjects.find(o => o.type === 'point');
      const lineObj = selectedObjects.find(o => o.type === 'line' || o.type === 'centerline');
      if (pointObj && lineObj) {
        const ptPts = extractPoints(pointObj);
        const linePts = getLinePointIds(lineObj);
        if (ptPts.length > 0 && linePts) {
          return [ptPts[0].id, ...linePts];
        }
      }
      return null;
    }

    case 'distance':
    case 'angle': {
      if (selectedObjects.length >= 2) {
        // Between two lines (angle) or two points (distance)
        const l1 = getLinePointIds(selectedObjects[0]);
        const l2 = getLinePointIds(selectedObjects[1]);
        if (l1 && l2) return [...l1, ...l2];
        // Two points
        const p1 = extractPoints(selectedObjects[0]);
        const p2 = extractPoints(selectedObjects[1]);
        if (p1.length > 0 && p2.length > 0) return [p1[0].id, p2[0].id];
      } else if (selectedObjects.length === 1) {
        const pts = getLinePointIds(selectedObjects[0]);
        if (pts) return pts;
      }
      return null;
    }

    case 'radius':
    case 'diameter': {
      const circle = selectedObjects.find(o => o.type === 'circle' || o.type === 'arc');
      if (circle) {
        const pts = extractPoints(circle);
        if (pts.length >= 2) return [pts[0].id, pts[1].id];
      }
      return null;
    }

    default:
      return null;
  }
}

// ─── Solve & Write Back ─────────────────────────────────────────────────────

/**
 * Run the constraint solver and produce updated CadObject properties.
 *
 * This function:
 * 1. Extracts all points from sketch entities
 * 2. Builds a position map for the solver
 * 3. Runs the iterative solver
 * 4. Maps solved positions back to CadObject updates
 */
export function solveAndMapBack(
  sketchEntities: CadObject[],
  constraints: GeometricConstraint[],
  solverFn: (positions: Map<string, Vec3>) => { success: boolean; iterations: number; residual: number; status: 'under' | 'fully' | 'over' }
): SolverBridgeResult {
  // 1. Extract all points
  const allPoints: SketchPoint[] = [];
  for (const entity of sketchEntities) {
    allPoints.push(...extractPoints(entity));
  }

  // 2. Build position map
  const positions = new Map<string, Vec3>();
  for (const pt of allPoints) {
    positions.set(pt.id, [...pt.position]);
  }

  // 3. Run solver
  const result = solverFn(positions);

  // 4. Map solved positions back to entity updates
  const updatedEntities = new Map<string, Partial<CadObject>>();

  for (const entity of sketchEntities) {
    const updates: Partial<CadObject> = {};
    let changed = false;

    switch (entity.type) {
      case 'line': {
        const startPt = positions.get(`${entity.id}_start`);
        const endPt = positions.get(`${entity.id}_end`);
        if (startPt && endPt) {
          const orig = entity.linePoints;
          if (orig && (
            Math.abs(startPt[0] - orig[0][0]) > 1e-10 ||
            Math.abs(startPt[1] - orig[0][1]) > 1e-10 ||
            Math.abs(startPt[2] - orig[0][2]) > 1e-10 ||
            Math.abs(endPt[0] - orig[1][0]) > 1e-10 ||
            Math.abs(endPt[1] - orig[1][1]) > 1e-10 ||
            Math.abs(endPt[2] - orig[1][2]) > 1e-10
          )) {
            updates.linePoints = [startPt, endPt];
            changed = true;
          }
        }
        break;
      }

      case 'circle': {
        const centerPt = positions.get(`${entity.id}_center`);
        const edgePt = positions.get(`${entity.id}_edge`);
        if (centerPt) {
          updates.circleCenter = centerPt;
          changed = true;
        }
        if (centerPt && edgePt) {
          const dx = edgePt[0] - centerPt[0];
          const dy = edgePt[1] - centerPt[1];
          const dz = edgePt[2] - centerPt[2];
          const newR = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (Math.abs(newR - (entity.circleRadius || 0)) > 1e-10) {
            updates.circleRadius = newR;
            updates.dimensions = { width: newR * 2, height: 0, depth: newR * 2 };
            changed = true;
          }
        }
        break;
      }

      case 'arc': {
        const startPt = positions.get(`${entity.id}_start`);
        const endPt = positions.get(`${entity.id}_end`);
        if (startPt && endPt && entity.arcPoints) {
          const newPoints: Vec3[] = [startPt];
          if (entity.arcPoints.length >= 3) {
            const midPt = positions.get(`${entity.id}_center`);
            if (midPt) newPoints.push(midPt);
          }
          newPoints.push(endPt);
          updates.arcPoints = newPoints;
          changed = true;
        }
        break;
      }

      case 'rectangle': {
        const c1 = positions.get(`${entity.id}_corner1`);
        const c2 = positions.get(`${entity.id}_corner2`);
        if (c1 && c2) {
          updates.rectCorners = [c1, c2];
          updates.dimensions = {
            width: Math.abs(c2[0] - c1[0]),
            height: 0,
            depth: Math.abs(c2[2] - c1[2]),
          };
          changed = true;
        }
        break;
      }

      case 'ellipse': {
        const centerPt = positions.get(`${entity.id}_center`);
        if (centerPt) {
          updates.ellipseCenter = centerPt;
          changed = true;
        }
        break;
      }

      case 'point': {
        const posPt = positions.get(`${entity.id}_pos`);
        if (posPt) {
          updates.pointPosition = posPt;
          changed = true;
        }
        break;
      }

      case 'centerline': {
        const startPt = positions.get(`${entity.id}_start`);
        const endPt = positions.get(`${entity.id}_end`);
        if (startPt && endPt) {
          updates.centerlinePoints = [startPt, endPt];
          changed = true;
        }
        break;
      }

      case 'slot': {
        const c1 = positions.get(`${entity.id}_c1`);
        const c2 = positions.get(`${entity.id}_c2`);
        if (c1 && c2) {
          updates.slotCenter1 = c1;
          updates.slotCenter2 = c2;
          changed = true;
        }
        break;
      }
    }

    if (changed) {
      updatedEntities.set(entity.id, updates);
    }
  }

  // 5. Calculate DOF per entity
  const entityDOF = new Map<string, EntityDOFInfo>();
  const entityConstraintCount = new Map<string, number>();

  for (const c of constraints) {
    // Count constraints per entity
    const entityIdsInConstraint = new Set<string>();
    for (const ptId of c.entityIds) {
      // Extract entity ID from point ID
      const parts = ptId.split('_');
      // Point IDs are like "obj_3_1234_start" - entity ID is everything before the last part
      const entityId = parts.slice(0, -1).join('_');
      entityIdsInConstraint.add(entityId);
    }
    Array.from(entityIdsInConstraint).forEach(eid => {
      entityConstraintCount.set(eid, (entityConstraintCount.get(eid) || 0) + 1);
    });
  }

  let totalDOF = 0;
  for (const entity of sketchEntities) {
    const pts = extractPoints(entity);
    const rawDOF = pts.length * 2; // 2 DOF per 2D point (x, z on XZ plane)
    const cCount = entityConstraintCount.get(entity.id) || 0;
    const remaining = Math.max(0, rawDOF - cCount);
    totalDOF += remaining;

    let status: 'under' | 'fully' | 'over' = 'under';
    if (remaining === 0 && cCount <= rawDOF) status = 'fully';
    else if (cCount > rawDOF) status = 'over';

    entityDOF.set(entity.id, {
      entityId: entity.id,
      dof: remaining,
      status,
    });
  }

  const overallStatus: 'under' | 'fully' | 'over' =
    totalDOF > 0 ? 'under' : totalDOF === 0 ? 'fully' : 'over';

  return {
    success: result.success,
    iterations: result.iterations,
    residual: result.residual,
    updatedEntities,
    entityDOF,
    totalDOF,
    overallStatus,
  };
}

// ─── Closed Profile Detection ───────────────────────────────────────────────

const EPS = 1e-4;

function vec3Near(a: Vec3, b: Vec3): boolean {
  return Math.abs(a[0] - b[0]) < EPS &&
         Math.abs(a[1] - b[1]) < EPS &&
         Math.abs(a[2] - b[2]) < EPS;
}

/**
 * Detect closed profiles from a set of sketch entities (lines forming a closed loop).
 * Returns arrays of ordered points forming closed profiles.
 */
export function detectClosedProfiles(
  entities: CadObject[],
  sketchPlane: 'xy' | 'xz' | 'yz' = 'xz'
): ClosedProfile[] {
  const profiles: ClosedProfile[] = [];

  // Single-entity closed profiles (rectangle, circle, polygon, ellipse, slot)
  for (const ent of entities) {
    if (ent.type === 'rectangle' && ent.rectCorners) {
      const [c1, c2] = ent.rectCorners;
      profiles.push({
        entityIds: [ent.id],
        points: [c1, [c2[0], c1[1], c1[2]], c2, [c1[0], c2[1], c2[2]]],
        sketchPlane,
      });
    } else if (ent.type === 'circle' && ent.circleCenter && ent.circleRadius) {
      profiles.push({
        entityIds: [ent.id],
        points: [ent.circleCenter], // Circle is inherently closed
        sketchPlane,
      });
    } else if (ent.type === 'polygon' && ent.polygonPoints && ent.polygonPoints.length >= 3) {
      profiles.push({
        entityIds: [ent.id],
        points: ent.polygonPoints,
        sketchPlane,
      });
    } else if (ent.type === 'ellipse' && ent.ellipseCenter && ent.ellipseRx && ent.ellipseRy) {
      profiles.push({
        entityIds: [ent.id],
        points: [ent.ellipseCenter],
        sketchPlane,
      });
    } else if (ent.type === 'slot' && ent.slotCenter1 && ent.slotCenter2 && ent.slotWidth) {
      profiles.push({
        entityIds: [ent.id],
        points: [ent.slotCenter1, ent.slotCenter2],
        sketchPlane,
      });
    }
  }

  // Multi-line closed loops
  const lines = entities.filter(e => e.type === 'line' && e.linePoints && e.linePoints.length >= 2);
  if (lines.length >= 3) {
    // Build adjacency: find chains of connected lines
    const used = new Set<string>();

    for (const startLine of lines) {
      if (used.has(startLine.id)) continue;
      const chain: CadObject[] = [startLine];
      const chainPoints: Vec3[] = [startLine.linePoints![0], startLine.linePoints![1]];
      used.add(startLine.id);

      let currentEnd = startLine.linePoints![1];
      let found = true;

      while (found) {
        found = false;
        for (const line of lines) {
          if (used.has(line.id)) continue;
          const lp = line.linePoints!;

          if (vec3Near(lp[0], currentEnd)) {
            chain.push(line);
            chainPoints.push(lp[1]);
            currentEnd = lp[1];
            used.add(line.id);
            found = true;
            break;
          } else if (vec3Near(lp[1], currentEnd)) {
            chain.push(line);
            chainPoints.push(lp[0]);
            currentEnd = lp[0];
            used.add(line.id);
            found = true;
            break;
          }
        }
      }

      // Check if the chain forms a closed loop
      if (chain.length >= 3 && vec3Near(currentEnd, startLine.linePoints![0])) {
        profiles.push({
          entityIds: chain.map(l => l.id),
          points: chainPoints.slice(0, -1), // Remove duplicate closing point
          sketchPlane,
        });
      } else {
        // Unmark so other chains can try these lines
        for (const l of chain) {
          used.delete(l.id);
        }
        // Only mark the start line to avoid infinite loops
        used.add(startLine.id);
      }
    }
  }

  return profiles;
}

/**
 * Create a THREE.Shape from a closed profile's points.
 * Projects 3D points onto the sketch plane's 2D coordinate system.
 */
export function profileToShape(profile: ClosedProfile): { u: number; v: number }[] {
  const plane = profile.sketchPlane;
  return profile.points.map(p => {
    switch (plane) {
      case 'xy': return { u: p[0], v: p[1] };
      case 'yz': return { u: p[1], v: p[2] };
      case 'xz':
      default: return { u: p[0], v: p[2] };
    }
  });
}

// ─── Constraint Color for Entity ────────────────────────────────────────────

/**
 * Get the constraint-based color for an entity.
 */
export function getConstraintColor(entityId: string, entityDOF: Map<string, EntityDOFInfo>): string {
  const info = entityDOF.get(entityId);
  if (!info) return '#3b82f6'; // Blue - under-constrained (default)
  switch (info.status) {
    case 'fully': return '#22c55e'; // Green
    case 'over': return '#ef4444'; // Red
    default: return '#3b82f6'; // Blue
  }
}

// ─── Smart Dimension Helper ─────────────────────────────────────────────────

/**
 * Calculate the current dimension value between entities for Smart Dimension display.
 */
export function measureDimension(
  type: 'distance' | 'angle' | 'radius' | 'diameter',
  entities: CadObject[]
): number | null {
  if (entities.length === 0) return null;

  switch (type) {
    case 'distance': {
      if (entities.length >= 2) {
        const p1 = extractPoints(entities[0]);
        const p2 = extractPoints(entities[1]);
        if (p1.length > 0 && p2.length > 0) {
          const a = p1[0].position;
          const b = p2[0].position;
          return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
        }
      } else if (entities.length === 1) {
        // Length of a line
        const pts = extractPoints(entities[0]);
        if (pts.length >= 2) {
          const a = pts[0].position;
          const b = pts[pts.length - 1].position;
          return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
        }
      }
      return null;
    }

    case 'radius': {
      const circle = entities.find(e => e.type === 'circle');
      if (circle && circle.circleRadius) return circle.circleRadius;
      return null;
    }

    case 'diameter': {
      const circle = entities.find(e => e.type === 'circle');
      if (circle && circle.circleRadius) return circle.circleRadius * 2;
      return null;
    }

    case 'angle': {
      if (entities.length >= 2) {
        const pts1 = getLinePointIds(entities[0]);
        const pts2 = getLinePointIds(entities[1]);
        if (pts1 && pts2) {
          const e1Pts = extractPoints(entities[0]);
          const e2Pts = extractPoints(entities[1]);
          if (e1Pts.length >= 2 && e2Pts.length >= 2) {
            const d1: Vec3 = [
              e1Pts[1].position[0] - e1Pts[0].position[0],
              e1Pts[1].position[1] - e1Pts[0].position[1],
              e1Pts[1].position[2] - e1Pts[0].position[2],
            ];
            const d2: Vec3 = [
              e2Pts[1].position[0] - e2Pts[0].position[0],
              e2Pts[1].position[1] - e2Pts[0].position[1],
              e2Pts[1].position[2] - e2Pts[0].position[2],
            ];
            const l1 = Math.sqrt(d1[0]**2 + d1[1]**2 + d1[2]**2);
            const l2 = Math.sqrt(d2[0]**2 + d2[1]**2 + d2[2]**2);
            if (l1 > 1e-10 && l2 > 1e-10) {
              const dot = (d1[0]*d2[0] + d1[1]*d2[1] + d1[2]*d2[2]) / (l1 * l2);
              return Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
            }
          }
        }
      }
      return null;
    }
  }
}
