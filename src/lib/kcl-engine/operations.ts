/**
 * 3D Operations for KCL Engine
 * Provides extrude, chamfer, fillet, revolve operations that produce
 * serialized mesh data (vertices + indices) for rendering.
 */
import * as THREE from "three";

// ─── Types ──────────────────────────────────────────────────────────────

export interface SerializedMesh {
  meshVertices: number[];
  meshIndices: number[];
}

export interface ExtrudeOptions {
  depth: number;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
  direction?: "y" | "x" | "z"; // extrusion axis (default: z via ExtrudeGeometry, then rotated)
}

export interface RevolveOptions {
  angle?: number;       // radians, default: 2π
  segments?: number;    // default: 32
  axis?: "x" | "y" | "z"; // revolution axis
}

export interface ChamferOptions {
  distance: number;
}

export interface FilletOptions {
  radius: number;
  segments?: number;
}

// ─── Serialization Helper ───────────────────────────────────────────────

/**
 * Serialize a THREE.BufferGeometry into flat vertex/index arrays.
 */
export function serializeGeometry(geo: THREE.BufferGeometry): SerializedMesh {
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const meshVertices: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    meshVertices.push(pos.getX(i), pos.getY(i), pos.getZ(i));
  }
  const idx = geo.index;
  const meshIndices: number[] = [];
  if (idx) {
    for (let i = 0; i < idx.count; i++) meshIndices.push(idx.getX(i));
  } else {
    for (let i = 0; i < pos.count; i++) meshIndices.push(i);
  }
  return { meshVertices, meshIndices };
}

/**
 * Serialize and dispose a geometry (for one-shot use).
 */
export function serializeAndDispose(geo: THREE.BufferGeometry): SerializedMesh {
  const result = serializeGeometry(geo);
  geo.dispose();
  return result;
}

// ─── Extrude ────────────────────────────────────────────────────────────

/**
 * Extrude a 2D THREE.Shape into a 3D solid.
 * By default extrudes along Z then rotates to Y-up convention.
 */
export function extrudeShape(
  shape: THREE.Shape,
  options: ExtrudeOptions
): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: options.depth,
    bevelEnabled: options.bevelEnabled ?? false,
    bevelThickness: options.bevelThickness ?? 0,
    bevelSize: options.bevelSize ?? 0,
    bevelSegments: options.bevelSegments ?? 1,
  });
  return geo;
}

/**
 * Extrude and serialize a 2D profile shape.
 * Rotates the extrusion so the profile lies in XY and extrudes along Z (length axis).
 */
export function extrudeToMesh(
  shape: THREE.Shape,
  depth: number,
  options?: Partial<ExtrudeOptions>
): SerializedMesh {
  const geo = extrudeShape(shape, { depth, ...options });
  const result = serializeGeometry(geo);
  geo.dispose();
  return result;
}

/**
 * Extrude a profile along X-axis (for horizontal rails).
 * Profile is in YZ plane, extruded along X.
 */
export function extrudeAlongX(
  shape: THREE.Shape,
  length: number
): { geometry: THREE.BufferGeometry; mesh: SerializedMesh } {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
  });
  // ExtrudeGeometry extrudes along +Z, rotate so it goes along +X
  geo.rotateY(Math.PI / 2);
  const mesh = serializeGeometry(geo);
  return { geometry: geo, mesh };
}

/**
 * Extrude a profile along Y-axis (for vertical elements).
 * Profile is in XZ plane, extruded along Y.
 */
export function extrudeAlongY(
  shape: THREE.Shape,
  length: number
): { geometry: THREE.BufferGeometry; mesh: SerializedMesh } {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
  });
  // ExtrudeGeometry extrudes along +Z, rotate so it goes along +Y
  geo.rotateX(-Math.PI / 2);
  const mesh = serializeGeometry(geo);
  return { geometry: geo, mesh };
}

/**
 * Extrude a profile along Z-axis (default ExtrudeGeometry direction).
 */
export function extrudeAlongZ(
  shape: THREE.Shape,
  length: number
): { geometry: THREE.BufferGeometry; mesh: SerializedMesh } {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
  });
  const mesh = serializeGeometry(geo);
  return { geometry: geo, mesh };
}

// ─── Revolve ────────────────────────────────────────────────────────────

/**
 * Revolve a 2D profile around an axis.
 */
export function revolveProfile(
  points: THREE.Vector2[],
  options?: RevolveOptions
): THREE.BufferGeometry {
  const segments = options?.segments ?? 32;
  const angle = options?.angle ?? Math.PI * 2;
  return new THREE.LatheGeometry(points, segments, 0, angle);
}

/**
 * Revolve and serialize.
 */
export function revolveToMesh(
  points: THREE.Vector2[],
  options?: RevolveOptions
): SerializedMesh {
  const geo = revolveProfile(points, options);
  const result = serializeGeometry(geo);
  geo.dispose();
  return result;
}

// ─── Box / Thin Slab ───────────────────────────────────────────────────

/**
 * Create a box geometry, optionally with offset positioning, and serialize.
 * Used for glass layers, EVA, backsheet etc. in PV modules.
 */
export function createBoxMesh(
  width: number,
  height: number,
  depth: number,
  offset?: { x?: number; y?: number; z?: number }
): SerializedMesh {
  const geo = new THREE.BoxGeometry(width, height, depth);
  if (offset) {
    geo.translate(offset.x ?? 0, offset.y ?? 0, offset.z ?? 0);
  }
  return serializeAndDispose(geo);
}

/**
 * Create a cylinder geometry and serialize.
 */
export function createCylinderMesh(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments: number = 32
): SerializedMesh {
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
  return serializeAndDispose(geo);
}

// ─── Boolean Operations via Geometry Merging ────────────────────────────

/**
 * Merge multiple geometries into a single geometry (visual union).
 * For proper CSG, use the csg-engine.ts module.
 */
export function mergeGeometries(geometries: THREE.BufferGeometry[]): SerializedMesh {
  if (geometries.length === 0) return { meshVertices: [], meshIndices: [] };
  if (geometries.length === 1) return serializeAndDispose(geometries[0]);

  let totalVerts = 0;
  let totalIndices = 0;
  for (const geo of geometries) {
    totalVerts += geo.attributes.position.count;
    totalIndices += geo.index ? geo.index.count : geo.attributes.position.count;
  }

  const meshVertices: number[] = new Array(totalVerts * 3);
  const meshIndices: number[] = new Array(totalIndices);
  let vertOffset = 0;
  let idxOffset = 0;
  let vertCount = 0;

  for (const geo of geometries) {
    geo.computeVertexNormals();
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      meshVertices[vertOffset++] = pos.getX(i);
      meshVertices[vertOffset++] = pos.getY(i);
      meshVertices[vertOffset++] = pos.getZ(i);
    }
    const idx = geo.index;
    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        meshIndices[idxOffset++] = idx.getX(i) + vertCount;
      }
    } else {
      for (let i = 0; i < pos.count; i++) {
        meshIndices[idxOffset++] = i + vertCount;
      }
    }
    vertCount += pos.count;
    geo.dispose();
  }

  return { meshVertices, meshIndices };
}

// ─── Transform Helpers ──────────────────────────────────────────────────

/**
 * Apply a transform matrix to serialized mesh vertices.
 */
export function transformMeshVertices(
  mesh: SerializedMesh,
  matrix: THREE.Matrix4
): SerializedMesh {
  const verts = [...mesh.meshVertices];
  const v = new THREE.Vector3();
  for (let i = 0; i < verts.length; i += 3) {
    v.set(verts[i], verts[i + 1], verts[i + 2]);
    v.applyMatrix4(matrix);
    verts[i] = v.x;
    verts[i + 1] = v.y;
    verts[i + 2] = v.z;
  }
  return { meshVertices: verts, meshIndices: [...mesh.meshIndices] };
}

/**
 * Translate serialized mesh vertices.
 */
export function translateMesh(
  mesh: SerializedMesh,
  dx: number,
  dy: number,
  dz: number
): SerializedMesh {
  const mat = new THREE.Matrix4().makeTranslation(dx, dy, dz);
  return transformMeshVertices(mesh, mat);
}

/**
 * Rotate serialized mesh vertices around an axis.
 */
export function rotateMesh(
  mesh: SerializedMesh,
  axis: "x" | "y" | "z",
  angle: number
): SerializedMesh {
  const mat = new THREE.Matrix4();
  switch (axis) {
    case "x": mat.makeRotationX(angle); break;
    case "y": mat.makeRotationY(angle); break;
    case "z": mat.makeRotationZ(angle); break;
  }
  return transformMeshVertices(mesh, mat);
}
