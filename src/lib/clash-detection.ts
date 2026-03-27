/**
 * Clash Detection Engine for ShilpaSutra Visualization Module
 *
 * Supports:
 * - Hard clash: geometry intersection between components
 * - Soft clash: clearance/tolerance violation (configurable minimum gap)
 * - Clash matrix: selective group-vs-group checking
 * - PV array clashes: module-to-structure, cable-to-frame, foundation-to-ground
 */

import type { ClashResult, ClashGroup, ModelComponent } from "@/stores/visualization-store";

// ── Bounding box types ─────────────────────────────────────────────

interface AABB {
  min: [number, number, number];
  max: [number, number, number];
}

interface OBB {
  center: [number, number, number];
  halfExtents: [number, number, number];
  axes: [[number, number, number], [number, number, number], [number, number, number]];
}

// ── Vector math helpers ────────────────────────────────────────────

function vec3Sub(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vec3Add(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vec3Scale(v: [number, number, number], s: number): [number, number, number] {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function vec3Dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function vec3Len(v: [number, number, number]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function vec3Mid(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

function vec3Abs(v: [number, number, number]): [number, number, number] {
  return [Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2])];
}

// ── Bounding box computation ───────────────────────────────────────

export function computeAABB(component: ModelComponent): AABB {
  if (component.boundingBox) {
    return { min: [...component.boundingBox.min], max: [...component.boundingBox.max] };
  }

  // Fallback: compute from mesh vertices
  if (component.meshData && component.meshData.vertices.length > 0) {
    const verts = component.meshData.vertices;
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

    for (let i = 0; i < verts.length; i += 3) {
      const x = verts[i] + component.position[0];
      const y = verts[i + 1] + component.position[1];
      const z = verts[i + 2] + component.position[2];
      min[0] = Math.min(min[0], x);
      min[1] = Math.min(min[1], y);
      min[2] = Math.min(min[2], z);
      max[0] = Math.max(max[0], x);
      max[1] = Math.max(max[1], y);
      max[2] = Math.max(max[2], z);
    }
    return { min, max };
  }

  // Default unit box at component position
  const pos = component.position;
  const s = component.scale;
  return {
    min: [pos[0] - s[0] / 2, pos[1] - s[1] / 2, pos[2] - s[2] / 2],
    max: [pos[0] + s[0] / 2, pos[1] + s[1] / 2, pos[2] + s[2] / 2],
  };
}

export function expandAABB(aabb: AABB, margin: number): AABB {
  return {
    min: [aabb.min[0] - margin, aabb.min[1] - margin, aabb.min[2] - margin],
    max: [aabb.max[0] + margin, aabb.max[1] + margin, aabb.max[2] + margin],
  };
}

// ── Intersection tests ─────────────────────────────────────────────

export function aabbIntersects(a: AABB, b: AABB): boolean {
  return (
    a.min[0] <= b.max[0] && a.max[0] >= b.min[0] &&
    a.min[1] <= b.max[1] && a.max[1] >= b.min[1] &&
    a.min[2] <= b.max[2] && a.max[2] >= b.min[2]
  );
}

export function aabbDistance(a: AABB, b: AABB): number {
  let sqDist = 0;
  for (let i = 0; i < 3; i++) {
    if (a.max[i] < b.min[i]) {
      const d = b.min[i] - a.max[i];
      sqDist += d * d;
    } else if (b.max[i] < a.min[i]) {
      const d = a.min[i] - b.max[i];
      sqDist += d * d;
    }
  }
  return Math.sqrt(sqDist);
}

function aabbCenter(aabb: AABB): [number, number, number] {
  return [
    (aabb.min[0] + aabb.max[0]) / 2,
    (aabb.min[1] + aabb.max[1]) / 2,
    (aabb.min[2] + aabb.max[2]) / 2,
  ];
}

function aabbOverlapVolume(a: AABB, b: AABB): number {
  const ox = Math.max(0, Math.min(a.max[0], b.max[0]) - Math.max(a.min[0], b.min[0]));
  const oy = Math.max(0, Math.min(a.max[1], b.max[1]) - Math.max(a.min[1], b.min[1]));
  const oz = Math.max(0, Math.min(a.max[2], b.max[2]) - Math.max(a.min[2], b.min[2]));
  return ox * oy * oz;
}

// ── Triangle-triangle intersection (for mesh-level hard clash) ─────

function triangleIntersectsTriangle(
  t1: [[number, number, number], [number, number, number], [number, number, number]],
  t2: [[number, number, number], [number, number, number], [number, number, number]]
): boolean {
  // Simplified SAT (Separating Axis Theorem) test for triangle-triangle
  const edges1 = [vec3Sub(t1[1], t1[0]), vec3Sub(t1[2], t1[1]), vec3Sub(t1[0], t1[2])];
  const edges2 = [vec3Sub(t2[1], t2[0]), vec3Sub(t2[2], t2[1]), vec3Sub(t2[0], t2[2])];

  const n1 = cross(edges1[0], edges1[1]);
  const n2 = cross(edges2[0], edges2[1]);

  // Test face normals
  if (separatedByAxis(n1, t1, t2)) return false;
  if (separatedByAxis(n2, t1, t2)) return false;

  // Test edge cross products (9 axes)
  for (const e1 of edges1) {
    for (const e2 of edges2) {
      const axis = cross(e1, e2);
      if (vec3Len(axis) > 1e-10) {
        if (separatedByAxis(axis, t1, t2)) return false;
      }
    }
  }

  return true;
}

function cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function separatedByAxis(
  axis: [number, number, number],
  t1: [number, number, number][],
  t2: [number, number, number][]
): boolean {
  let min1 = Infinity, max1 = -Infinity;
  let min2 = Infinity, max2 = -Infinity;

  for (const v of t1) {
    const d = vec3Dot(axis, v);
    min1 = Math.min(min1, d);
    max1 = Math.max(max1, d);
  }
  for (const v of t2) {
    const d = vec3Dot(axis, v);
    min2 = Math.min(min2, d);
    max2 = Math.max(max2, d);
  }

  return max1 < min2 || max2 < min1;
}

// ── Mesh-level clash detection ─────────────────────────────────────

function getMeshTriangles(
  comp: ModelComponent
): [number, number, number][][] {
  if (!comp.meshData || comp.meshData.vertices.length === 0) return [];

  const { vertices, indices } = comp.meshData;
  const pos = comp.position;
  const triangles: [number, number, number][][] = [];

  const getVert = (idx: number): [number, number, number] => [
    vertices[idx * 3] + pos[0],
    vertices[idx * 3 + 1] + pos[1],
    vertices[idx * 3 + 2] + pos[2],
  ];

  if (indices && indices.length > 0) {
    for (let i = 0; i < indices.length; i += 3) {
      triangles.push([getVert(indices[i]), getVert(indices[i + 1]), getVert(indices[i + 2])]);
    }
  } else {
    for (let i = 0; i < vertices.length / 3; i += 3) {
      triangles.push([getVert(i), getVert(i + 1), getVert(i + 2)]);
    }
  }

  return triangles;
}

function meshIntersectionTest(compA: ModelComponent, compB: ModelComponent): boolean {
  const trisA = getMeshTriangles(compA);
  const trisB = getMeshTriangles(compB);

  if (trisA.length === 0 || trisB.length === 0) return false;

  // Sample triangles for performance (max 200 checks)
  const maxChecks = 200;
  const stepA = Math.max(1, Math.floor(trisA.length / Math.sqrt(maxChecks)));
  const stepB = Math.max(1, Math.floor(trisB.length / Math.sqrt(maxChecks)));

  for (let i = 0; i < trisA.length; i += stepA) {
    for (let j = 0; j < trisB.length; j += stepB) {
      if (
        triangleIntersectsTriangle(
          trisA[i] as [[number, number, number], [number, number, number], [number, number, number]],
          trisB[j] as [[number, number, number], [number, number, number], [number, number, number]]
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

// ── Severity classification ────────────────────────────────────────

function classifySeverity(
  type: "hard" | "soft",
  overlapVolume: number,
  distance: number,
  minGap: number
): "critical" | "major" | "minor" {
  if (type === "hard") {
    if (overlapVolume > 0.01) return "critical";
    if (overlapVolume > 0.001) return "major";
    return "minor";
  }
  // Soft clash severity based on how close to minGap
  const ratio = distance / minGap;
  if (ratio < 0.25) return "critical";
  if (ratio < 0.5) return "major";
  return "minor";
}

// ── Main clash detection functions ─────────────────────────────────

export interface ClashDetectionOptions {
  minGap: number;
  checkHard: boolean;
  checkSoft: boolean;
  useMeshLevel: boolean;
  clashGroups?: ClashGroup[];
}

const DEFAULT_OPTIONS: ClashDetectionOptions = {
  minGap: 0.05,
  checkHard: true,
  checkSoft: true,
  useMeshLevel: false,
};

/**
 * Run clash detection between components.
 * If clashGroups are provided, only check pairs within those groups.
 * Otherwise, check all pairs.
 */
export function detectClashes(
  components: Map<string, ModelComponent>,
  options: Partial<ClashDetectionOptions> = {}
): ClashResult[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: ClashResult[] = [];
  const compArray = Array.from(components.values()).filter((c) => c.visible);

  // Precompute AABBs
  const aabbs = new Map<string, AABB>();
  for (const comp of compArray) {
    aabbs.set(comp.id, computeAABB(comp));
  }

  // Build pairs to check
  const pairs: [ModelComponent, ModelComponent][] = [];

  if (opts.clashGroups && opts.clashGroups.length > 0) {
    for (const group of opts.clashGroups) {
      const groupAComps = compArray.filter((c) => group.groupA.includes(c.id) || group.groupA.includes(c.modelId));
      const groupBComps = compArray.filter((c) => group.groupB.includes(c.id) || group.groupB.includes(c.modelId));

      for (const a of groupAComps) {
        for (const b of groupBComps) {
          if (a.id !== b.id) {
            pairs.push([a, b]);
          }
        }
      }
    }
  } else {
    // All-vs-all
    for (let i = 0; i < compArray.length; i++) {
      for (let j = i + 1; j < compArray.length; j++) {
        pairs.push([compArray[i], compArray[j]]);
      }
    }
  }

  // Check each pair
  for (const [compA, compB] of pairs) {
    const aabbA = aabbs.get(compA.id)!;
    const aabbB = aabbs.get(compB.id)!;

    // Hard clash: AABB intersection
    if (opts.checkHard && aabbIntersects(aabbA, aabbB)) {
      const overlap = aabbOverlapVolume(aabbA, aabbB);
      if (overlap > 0) {
        // Optional mesh-level verification
        let confirmed = true;
        if (opts.useMeshLevel) {
          confirmed = meshIntersectionTest(compA, compB);
        }

        if (confirmed) {
          const location = vec3Mid(aabbCenter(aabbA), aabbCenter(aabbB));
          results.push({
            id: `clash-h-${compA.id}-${compB.id}`,
            type: "hard",
            severity: classifySeverity("hard", overlap, 0, opts.minGap),
            componentA: compA.id,
            componentB: compB.id,
            location,
            distance: 0,
            description: `Hard clash: ${compA.name} intersects ${compB.name} (overlap vol: ${overlap.toFixed(4)})`,
            resolved: false,
          });
        }
      }
    }

    // Soft clash: clearance violation
    if (opts.checkSoft && !aabbIntersects(aabbA, aabbB)) {
      const dist = aabbDistance(aabbA, aabbB);
      if (dist < opts.minGap) {
        const location = vec3Mid(aabbCenter(aabbA), aabbCenter(aabbB));
        results.push({
          id: `clash-s-${compA.id}-${compB.id}`,
          type: "soft",
          severity: classifySeverity("soft", 0, dist, opts.minGap),
          componentA: compA.id,
          componentB: compB.id,
          location,
          distance: dist,
          description: `Soft clash: ${compA.name} ↔ ${compB.name} clearance ${dist.toFixed(3)}m < ${opts.minGap}m minimum`,
          resolved: false,
        });
      }
    }
  }

  return results;
}

/**
 * Generate a clash matrix summary: which discipline groups have clashes.
 */
export function generateClashMatrix(
  results: ClashResult[],
  components: Map<string, ModelComponent>,
  models: { id: string; discipline: string }[]
): Record<string, Record<string, number>> {
  const modelDiscipline = new Map<string, string>();
  for (const m of models) {
    modelDiscipline.set(m.id, m.discipline);
  }

  const matrix: Record<string, Record<string, number>> = {};

  for (const clash of results) {
    if (clash.resolved) continue;

    const compA = components.get(clash.componentA);
    const compB = components.get(clash.componentB);
    if (!compA || !compB) continue;

    const discA = modelDiscipline.get(compA.modelId) || "other";
    const discB = modelDiscipline.get(compB.modelId) || "other";

    if (!matrix[discA]) matrix[discA] = {};
    if (!matrix[discB]) matrix[discB] = {};

    matrix[discA][discB] = (matrix[discA][discB] || 0) + 1;
    if (discA !== discB) {
      matrix[discB][discA] = (matrix[discB][discA] || 0) + 1;
    }
  }

  return matrix;
}

/**
 * PV array-specific clash groups.
 */
export function createPVClashGroups(
  components: Map<string, ModelComponent>
): ClashGroup[] {
  const modules: string[] = [];
  const structures: string[] = [];
  const cables: string[] = [];
  const foundations: string[] = [];

  for (const [id, comp] of components) {
    const name = comp.name.toLowerCase();
    if (name.includes("module") || name.includes("panel") || name.includes("pv")) {
      modules.push(id);
    } else if (name.includes("structure") || name.includes("rack") || name.includes("frame")) {
      structures.push(id);
    } else if (name.includes("cable") || name.includes("wire") || name.includes("conduit")) {
      cables.push(id);
    } else if (name.includes("foundation") || name.includes("pile") || name.includes("ground")) {
      foundations.push(id);
    }
  }

  const groups: ClashGroup[] = [];

  if (modules.length > 0 && structures.length > 0) {
    groups.push({
      id: "pv-module-structure",
      name: "Module ↔ Structure",
      groupA: modules,
      groupB: structures,
    });
  }

  if (cables.length > 0 && structures.length > 0) {
    groups.push({
      id: "pv-cable-frame",
      name: "Cable ↔ Frame",
      groupA: cables,
      groupB: structures,
    });
  }

  if (foundations.length > 0) {
    groups.push({
      id: "pv-foundation-ground",
      name: "Foundation ↔ Ground",
      groupA: foundations,
      groupB: [...modules, ...structures],
    });
  }

  return groups;
}

/**
 * Export clash report as structured data (for PDF/CSV generation).
 */
export function exportClashReport(
  results: ClashResult[],
  components: Map<string, ModelComponent>
): {
  summary: { total: number; hard: number; soft: number; critical: number; major: number; minor: number; resolved: number };
  clashes: {
    id: string;
    type: string;
    severity: string;
    componentA: string;
    componentB: string;
    location: string;
    distance: string;
    description: string;
    resolved: boolean;
  }[];
} {
  const summary = {
    total: results.length,
    hard: results.filter((r) => r.type === "hard").length,
    soft: results.filter((r) => r.type === "soft").length,
    critical: results.filter((r) => r.severity === "critical").length,
    major: results.filter((r) => r.severity === "major").length,
    minor: results.filter((r) => r.severity === "minor").length,
    resolved: results.filter((r) => r.resolved).length,
  };

  const clashes = results.map((r) => {
    const compA = components.get(r.componentA);
    const compB = components.get(r.componentB);
    return {
      id: r.id,
      type: r.type,
      severity: r.severity,
      componentA: compA?.name || r.componentA,
      componentB: compB?.name || r.componentB,
      location: `(${r.location[0].toFixed(2)}, ${r.location[1].toFixed(2)}, ${r.location[2].toFixed(2)})`,
      distance: r.distance !== undefined ? `${r.distance.toFixed(3)}m` : "N/A",
      description: r.description,
      resolved: r.resolved,
    };
  });

  return { summary, clashes };
}
