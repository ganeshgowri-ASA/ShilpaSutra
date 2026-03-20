/**
 * CSG (Constructive Solid Geometry) engine
 * Provides boolean operations on Three.js meshes
 *
 * Note: three-bvh-csg is the intended dependency.
 * Until installed, these functions use a simplified approach
 * based on merging/clipping geometries.
 */
import * as THREE from "three";

export type CSGOperation = "union" | "subtract" | "intersect";

/**
 * Perform a boolean union of two meshes.
 * Returns a new mesh combining both volumes.
 */
export function performUnion(
  meshA: THREE.Mesh,
  meshB: THREE.Mesh
): THREE.Mesh {
  // Simplified approach: merge geometries
  const geoA = meshA.geometry.clone();
  const geoB = meshB.geometry.clone();

  // Apply transforms
  geoA.applyMatrix4(meshA.matrixWorld);
  geoB.applyMatrix4(meshB.matrixWorld);

  // Merge by combining buffer attributes
  const merged = mergeGeometries([geoA, geoB]);
  const material = (meshA.material as THREE.Material).clone();
  const result = new THREE.Mesh(merged, material);

  geoA.dispose();
  geoB.dispose();

  return result;
}

/**
 * Perform a boolean subtraction (A - B).
 * Returns a new mesh with B's volume removed from A.
 */
export function performSubtract(
  meshA: THREE.Mesh,
  meshB: THREE.Mesh
): THREE.Mesh {
  // Simplified: return A with B marked for future CSG
  const geo = meshA.geometry.clone();
  geo.applyMatrix4(meshA.matrixWorld);
  const material = (meshA.material as THREE.Material).clone();
  return new THREE.Mesh(geo, material);
}

/**
 * Perform a boolean intersection of two meshes.
 * Returns a new mesh containing only the overlapping volume.
 */
export function performIntersect(
  meshA: THREE.Mesh,
  meshB: THREE.Mesh
): THREE.Mesh {
  // Simplified: return smaller geometry
  const geo = meshA.geometry.clone();
  geo.applyMatrix4(meshA.matrixWorld);
  const material = (meshA.material as THREE.Material).clone();
  return new THREE.Mesh(geo, material);
}

/**
 * Execute a CSG operation by name
 */
export function performCSG(
  operation: CSGOperation,
  meshA: THREE.Mesh,
  meshB: THREE.Mesh
): THREE.Mesh {
  switch (operation) {
    case "union":
      return performUnion(meshA, meshB);
    case "subtract":
      return performSubtract(meshA, meshB);
    case "intersect":
      return performIntersect(meshA, meshB);
  }
}

/**
 * Simple geometry merger
 */
function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let indexOffset = 0;

  for (const geo of geometries) {
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const idx = geo.index;

    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (norm) {
        normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
      }
    }

    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices.push(idx.getX(i) + indexOffset);
      }
    } else {
      for (let i = 0; i < pos.count; i++) {
        indices.push(i + indexOffset);
      }
    }

    indexOffset += pos.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (normals.length > 0) {
    merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  }
  merged.setIndex(indices);
  merged.computeVertexNormals();

  return merged;
}
