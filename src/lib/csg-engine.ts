/**
 * CSG (Constructive Solid Geometry) engine
 * BSP-tree based boolean operations on Three.js meshes
 *
 * Implements union, subtract, and intersect using a Binary Space Partition tree.
 * Algorithm based on the classic CSG approach:
 *   1. Convert THREE.Mesh → BSP tree of polygons
 *   2. Perform CSG via tree clipping/inversion
 *   3. Convert BSP tree back → THREE.BufferGeometry
 */
import * as THREE from "three";

export type CSGOperation = "union" | "subtract" | "intersect";

// ---------------------------------------------------------------------------
// CSG Vertex
// ---------------------------------------------------------------------------

class CSGVertex {
  pos: THREE.Vector3;
  normal: THREE.Vector3;

  constructor(pos: THREE.Vector3, normal: THREE.Vector3) {
    this.pos = pos.clone();
    this.normal = normal.clone();
  }

  clone(): CSGVertex {
    return new CSGVertex(this.pos, this.normal);
  }

  flip(): void {
    this.normal.negate();
  }

  interpolate(other: CSGVertex, t: number): CSGVertex {
    return new CSGVertex(
      this.pos.clone().lerp(other.pos, t),
      this.normal.clone().lerp(other.normal, t).normalize()
    );
  }
}

// ---------------------------------------------------------------------------
// CSG Plane
// ---------------------------------------------------------------------------

const COPLANAR = 0;
const FRONT = 1;
const BACK = 2;
const SPANNING = 3;

class CSGPlane {
  normal: THREE.Vector3;
  w: number;

  static EPSILON = 1e-5;

  constructor(normal: THREE.Vector3, w: number) {
    this.normal = normal.clone();
    this.w = w;
  }

  static fromPoints(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): CSGPlane | null {
    const n = new THREE.Vector3()
      .crossVectors(
        new THREE.Vector3().subVectors(b, a),
        new THREE.Vector3().subVectors(c, a)
      )
      .normalize();
    if (n.lengthSq() < 1e-10) return null; // degenerate triangle
    return new CSGPlane(n, n.dot(a));
  }

  clone(): CSGPlane {
    return new CSGPlane(this.normal, this.w);
  }

  flip(): void {
    this.normal.negate();
    this.w = -this.w;
  }

  /**
   * Split a polygon by this plane. Distributes the polygon (or its fragments)
   * into the four output arrays: coplanarFront, coplanarBack, front, back.
   */
  splitPolygon(
    polygon: CSGPolygon,
    coplanarFront: CSGPolygon[],
    coplanarBack: CSGPolygon[],
    front: CSGPolygon[],
    back: CSGPolygon[]
  ): void {
    let polygonType = 0;
    const types: number[] = [];

    for (const vertex of polygon.vertices) {
      const t = this.normal.dot(vertex.pos) - this.w;
      const type =
        t < -CSGPlane.EPSILON ? BACK : t > CSGPlane.EPSILON ? FRONT : COPLANAR;
      polygonType |= type;
      types.push(type);
    }

    switch (polygonType) {
      case COPLANAR:
        if (this.normal.dot(polygon.plane.normal) > 0) {
          coplanarFront.push(polygon);
        } else {
          coplanarBack.push(polygon);
        }
        break;
      case FRONT:
        front.push(polygon);
        break;
      case BACK:
        back.push(polygon);
        break;
      case SPANNING: {
        const f: CSGVertex[] = [];
        const b: CSGVertex[] = [];

        for (let i = 0; i < polygon.vertices.length; i++) {
          const j = (i + 1) % polygon.vertices.length;
          const ti = types[i];
          const tj = types[j];
          const vi = polygon.vertices[i];
          const vj = polygon.vertices[j];

          if (ti !== BACK) f.push(vi);
          if (ti !== FRONT) b.push(vi);

          if ((ti | tj) === SPANNING) {
            // Compute intersection point
            const denom = this.normal.dot(
              new THREE.Vector3().subVectors(vj.pos, vi.pos)
            );
            let t = 0;
            if (Math.abs(denom) > 1e-10) {
              t = (this.w - this.normal.dot(vi.pos)) / denom;
            }
            t = Math.max(0, Math.min(1, t));
            const v = vi.interpolate(vj, t);
            f.push(v);
            b.push(v.clone());
          }
        }

        if (f.length >= 3) {
          front.push(new CSGPolygon(f));
        }
        if (b.length >= 3) {
          back.push(new CSGPolygon(b));
        }
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// CSG Polygon (convex, typically a triangle)
// ---------------------------------------------------------------------------

class CSGPolygon {
  vertices: CSGVertex[];
  plane: CSGPlane;

  constructor(vertices: CSGVertex[]) {
    this.vertices = vertices.map((v) => v.clone());
    const p = CSGPlane.fromPoints(
      vertices[0].pos,
      vertices[1].pos,
      vertices[2].pos
    );
    this.plane = p ?? new CSGPlane(new THREE.Vector3(0, 0, 1), 0);
  }

  clone(): CSGPolygon {
    return new CSGPolygon(this.vertices);
  }

  flip(): void {
    this.vertices.reverse();
    for (const v of this.vertices) {
      v.flip();
    }
    this.plane.flip();
  }
}

// ---------------------------------------------------------------------------
// CSG Node (BSP tree)
// ---------------------------------------------------------------------------

class CSGNode {
  plane: CSGPlane | null;
  front: CSGNode | null;
  back: CSGNode | null;
  polygons: CSGPolygon[];

  constructor(polygons?: CSGPolygon[]) {
    this.plane = null;
    this.front = null;
    this.back = null;
    this.polygons = [];
    if (polygons && polygons.length > 0) {
      this.build(polygons);
    }
  }

  clone(): CSGNode {
    const node = new CSGNode();
    node.plane = this.plane ? this.plane.clone() : null;
    node.front = this.front ? this.front.clone() : null;
    node.back = this.back ? this.back.clone() : null;
    node.polygons = this.polygons.map((p) => p.clone());
    return node;
  }

  /**
   * Invert all polygons and planes in this BSP tree (swap inside/outside).
   */
  invert(): void {
    for (const polygon of this.polygons) {
      polygon.flip();
    }
    if (this.plane) {
      this.plane.flip();
    }
    if (this.front) {
      this.front.invert();
    }
    if (this.back) {
      this.back.invert();
    }
    // Swap front and back subtrees
    const temp = this.front;
    this.front = this.back;
    this.back = temp;
  }

  /**
   * Clip an array of polygons to this BSP tree.
   * Recursively removes polygons that are inside this tree.
   */
  clipPolygons(polygons: CSGPolygon[]): CSGPolygon[] {
    if (!this.plane) return polygons.slice();

    let front: CSGPolygon[] = [];
    let back: CSGPolygon[] = [];

    for (const polygon of polygons) {
      this.plane.splitPolygon(polygon, front, back, front, back);
    }

    if (this.front) {
      front = this.front.clipPolygons(front);
    }
    if (this.back) {
      back = this.back.clipPolygons(back);
    } else {
      // No back node means polygons behind are removed (inside the solid)
      back = [];
    }

    return front.concat(back);
  }

  /**
   * Remove all polygons in this BSP tree that are inside the other BSP tree.
   */
  clipTo(bsp: CSGNode): void {
    this.polygons = bsp.clipPolygons(this.polygons);
    if (this.front) {
      this.front.clipTo(bsp);
    }
    if (this.back) {
      this.back.clipTo(bsp);
    }
  }

  /**
   * Return all polygons in this BSP tree (flattened).
   */
  allPolygons(): CSGPolygon[] {
    let polygons = this.polygons.slice();
    if (this.front) {
      polygons = polygons.concat(this.front.allPolygons());
    }
    if (this.back) {
      polygons = polygons.concat(this.back.allPolygons());
    }
    return polygons;
  }

  /**
   * Build a BSP tree from a list of polygons. Picks the first polygon's plane
   * as the splitting plane and distributes the rest.
   */
  build(polygons: CSGPolygon[]): void {
    if (polygons.length === 0) return;

    if (!this.plane) {
      this.plane = polygons[0].plane.clone();
    }

    const front: CSGPolygon[] = [];
    const back: CSGPolygon[] = [];

    for (const polygon of polygons) {
      this.plane.splitPolygon(
        polygon,
        this.polygons,
        this.polygons,
        front,
        back
      );
    }

    if (front.length > 0) {
      if (!this.front) {
        this.front = new CSGNode();
      }
      this.front.build(front);
    }

    if (back.length > 0) {
      if (!this.back) {
        this.back = new CSGNode();
      }
      this.back.build(back);
    }
  }
}

// ---------------------------------------------------------------------------
// Mesh ↔ CSG conversions
// ---------------------------------------------------------------------------

/**
 * Convert a THREE.Mesh to a CSGNode BSP tree.
 * Extracts triangles from BufferGeometry and applies the mesh's world matrix.
 */
function meshToCSG(mesh: THREE.Mesh): CSGNode {
  mesh.updateMatrixWorld(true);
  const geo = mesh.geometry;
  const posAttr = geo.attributes.position;
  const normAttr = geo.attributes.normal;
  const index = geo.index;

  // Compute normals if missing
  if (!normAttr) {
    geo.computeVertexNormals();
  }
  const normals = geo.attributes.normal;

  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);

  const polygons: CSGPolygon[] = [];
  const triCount = index ? index.count / 3 : posAttr.count / 3;

  for (let i = 0; i < triCount; i++) {
    const vertices: CSGVertex[] = [];

    for (let j = 0; j < 3; j++) {
      const idx = index ? index.getX(i * 3 + j) : i * 3 + j;

      const pos = new THREE.Vector3(
        posAttr.getX(idx),
        posAttr.getY(idx),
        posAttr.getZ(idx)
      ).applyMatrix4(mesh.matrixWorld);

      const normal = new THREE.Vector3(
        normals.getX(idx),
        normals.getY(idx),
        normals.getZ(idx)
      )
        .applyMatrix3(normalMatrix)
        .normalize();

      vertices.push(new CSGVertex(pos, normal));
    }

    // Skip degenerate triangles
    const edge1 = new THREE.Vector3().subVectors(vertices[1].pos, vertices[0].pos);
    const edge2 = new THREE.Vector3().subVectors(vertices[2].pos, vertices[0].pos);
    if (edge1.cross(edge2).lengthSq() > 1e-10) {
      polygons.push(new CSGPolygon(vertices));
    }
  }

  return new CSGNode(polygons);
}

/**
 * Convert a CSGNode BSP tree back to a THREE.BufferGeometry.
 * Triangulates polygons with more than 3 vertices using a fan approach.
 */
function csgToGeometry(node: CSGNode): THREE.BufferGeometry {
  const polygons = node.allPolygons();
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let vertexIndex = 0;

  for (const polygon of polygons) {
    const verts = polygon.vertices;

    // Fan triangulation for convex polygons
    for (let i = 2; i < verts.length; i++) {
      const v0 = verts[0];
      const v1 = verts[i - 1];
      const v2 = verts[i];

      positions.push(v0.pos.x, v0.pos.y, v0.pos.z);
      positions.push(v1.pos.x, v1.pos.y, v1.pos.z);
      positions.push(v2.pos.x, v2.pos.y, v2.pos.z);

      normals.push(v0.normal.x, v0.normal.y, v0.normal.z);
      normals.push(v1.normal.x, v1.normal.y, v1.normal.z);
      normals.push(v2.normal.x, v2.normal.y, v2.normal.z);

      indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
      vertexIndex += 3;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(normals, 3)
  );
  geometry.setIndex(indices);

  return geometry;
}

// ---------------------------------------------------------------------------
// CSG Boolean Operations
// ---------------------------------------------------------------------------

/**
 * CSG Union: A ∪ B
 *
 * Algorithm:
 *   a.clipTo(b) - remove parts of a inside b
 *   b.clipTo(a) - remove parts of b inside a
 *   b.clipTo(a) again after inverting to remove coplanar faces from b
 *   Combine remaining polygons
 */
function csgUnion(a: CSGNode, b: CSGNode): CSGNode {
  const aNode = a.clone();
  const bNode = b.clone();

  aNode.clipTo(bNode);
  bNode.clipTo(aNode);
  bNode.invert();
  bNode.clipTo(aNode);
  bNode.invert();
  aNode.build(bNode.allPolygons());

  return aNode;
}

/**
 * CSG Subtract: A - B
 *
 * Algorithm:
 *   Invert a
 *   a.clipTo(b) - clip inverted a to b
 *   b.clipTo(a) - clip b to inverted a
 *   Invert b, clip to a again, invert back (remove coplanar faces)
 *   Combine and invert result
 */
function csgSubtract(a: CSGNode, b: CSGNode): CSGNode {
  const aNode = a.clone();
  const bNode = b.clone();

  aNode.invert();
  aNode.clipTo(bNode);
  bNode.clipTo(aNode);
  bNode.invert();
  bNode.clipTo(aNode);
  bNode.invert();
  aNode.build(bNode.allPolygons());
  aNode.invert();

  return aNode;
}

/**
 * CSG Intersect: A ∩ B
 *
 * Algorithm:
 *   Invert both a and b
 *   Perform union of the inverts (gives complement of intersection)
 *   Invert result
 */
function csgIntersect(a: CSGNode, b: CSGNode): CSGNode {
  const aNode = a.clone();
  const bNode = b.clone();

  aNode.invert();
  bNode.clipTo(aNode);
  bNode.invert();
  aNode.clipTo(bNode);
  bNode.clipTo(aNode);
  aNode.build(bNode.allPolygons());
  aNode.invert();

  return aNode;
}

// ---------------------------------------------------------------------------
// Public API - preserves existing exports
// ---------------------------------------------------------------------------

/**
 * Perform a boolean union of two meshes.
 * Returns a new mesh combining both volumes.
 */
export function performUnion(
  meshA: THREE.Mesh,
  meshB: THREE.Mesh
): THREE.Mesh {
  const a = meshToCSG(meshA);
  const b = meshToCSG(meshB);
  const result = csgUnion(a, b);
  const geometry = csgToGeometry(result);
  const material = (meshA.material as THREE.Material).clone();
  return new THREE.Mesh(geometry, material);
}

/**
 * Perform a boolean subtraction (A - B).
 * Returns a new mesh with B's volume removed from A.
 */
export function performSubtract(
  meshA: THREE.Mesh,
  meshB: THREE.Mesh
): THREE.Mesh {
  const a = meshToCSG(meshA);
  const b = meshToCSG(meshB);
  const result = csgSubtract(a, b);
  const geometry = csgToGeometry(result);
  const material = (meshA.material as THREE.Material).clone();
  return new THREE.Mesh(geometry, material);
}

/**
 * Perform a boolean intersection of two meshes.
 * Returns a new mesh containing only the overlapping volume.
 */
export function performIntersect(
  meshA: THREE.Mesh,
  meshB: THREE.Mesh
): THREE.Mesh {
  const a = meshToCSG(meshA);
  const b = meshToCSG(meshB);
  const result = csgIntersect(a, b);
  const geometry = csgToGeometry(result);
  const material = (meshA.material as THREE.Material).clone();
  return new THREE.Mesh(geometry, material);
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
 * Simple geometry merger (utility for non-CSG combining)
 */
function mergeGeometries(
  geometries: THREE.BufferGeometry[]
): THREE.BufferGeometry {
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
  merged.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  if (normals.length > 0) {
    merged.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3)
    );
  }
  merged.setIndex(indices);
  merged.computeVertexNormals();

  return merged;
}

export { mergeGeometries };
