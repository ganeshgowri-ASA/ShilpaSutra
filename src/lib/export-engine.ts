import * as THREE from "three";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportMesh {
  vertices: Float32Array; // x, y, z interleaved
  normals?: Float32Array; // x, y, z interleaved (per-vertex)
  indices?: Uint32Array; // triangle indices
}

export type ExportFormat = "stl" | "obj" | "ply" | "gltf" | "step";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Expand indexed geometry into flat triangle arrays. */
function expandTriangles(mesh: ExportMesh): {
  positions: Float32Array;
  normals: Float32Array;
  triangleCount: number;
} {
  const { vertices, normals, indices } = mesh;

  if (indices && indices.length > 0) {
    const triangleCount = indices.length / 3;
    const positions = new Float32Array(triangleCount * 9);
    const norms = new Float32Array(triangleCount * 9);

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      positions[i * 3] = vertices[idx * 3];
      positions[i * 3 + 1] = vertices[idx * 3 + 1];
      positions[i * 3 + 2] = vertices[idx * 3 + 2];

      if (normals && normals.length > 0) {
        norms[i * 3] = normals[idx * 3];
        norms[i * 3 + 1] = normals[idx * 3 + 1];
        norms[i * 3 + 2] = normals[idx * 3 + 2];
      }
    }

    return { positions, normals: norms, triangleCount };
  }

  const triangleCount = vertices.length / 9;
  return {
    positions: vertices,
    normals: normals ?? new Float32Array(vertices.length),
    triangleCount,
  };
}

/** Compute face normal from three vertices. */
function computeFaceNormal(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): [number, number, number] {
  const ux = bx - ax, uy = by - ay, uz = bz - az;
  const vx = cx - ax, vy = cy - ay, vz = cz - az;
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  return [nx / len, ny / len, nz / len];
}

// ---------------------------------------------------------------------------
// geometryToExportMesh
// ---------------------------------------------------------------------------

/**
 * Convert a Three.js BufferGeometry into an ExportMesh.
 * Works with both indexed and non-indexed geometries.
 */
export function geometryToExportMesh(geometry: THREE.BufferGeometry): ExportMesh {
  // Ensure normals exist
  if (!geometry.getAttribute("normal")) {
    geometry.computeVertexNormals();
  }

  const posAttr = geometry.getAttribute("position");
  const normAttr = geometry.getAttribute("normal");
  const indexAttr = geometry.getIndex();

  const vertices = new Float32Array(posAttr.array as ArrayLike<number>);
  const normals = normAttr
    ? new Float32Array(normAttr.array as ArrayLike<number>)
    : undefined;
  const indices = indexAttr
    ? new Uint32Array(indexAttr.array as ArrayLike<number>)
    : undefined;

  return { vertices, normals, indices };
}

// ---------------------------------------------------------------------------
// Binary STL export
// ---------------------------------------------------------------------------

/**
 * Generate a binary STL ArrayBuffer.
 *
 * Layout per the specification:
 *  - 80 bytes: header
 *  - 4 bytes : uint32 LE triangle count
 *  - Per triangle (50 bytes each):
 *      - 12 bytes: normal  (3 x float32 LE)
 *      - 36 bytes: vertices (3 vertices x 3 x float32 LE)
 *      -  2 bytes: attribute byte count (uint16 LE, 0)
 */
export function exportSTLBinary(mesh: ExportMesh, name = "model"): ArrayBuffer {
  const { positions, normals, triangleCount } = expandTriangles(mesh);

  const HEADER_SIZE = 80;
  const COUNT_SIZE = 4;
  const TRIANGLE_SIZE = 50; // 12 + 36 + 2
  const bufferSize = HEADER_SIZE + COUNT_SIZE + triangleCount * TRIANGLE_SIZE;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // Header (80 bytes) — write name padded with zeroes
  const header = `Binary STL - ${name}`.slice(0, 80);
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }

  // Triangle count
  view.setUint32(HEADER_SIZE, triangleCount, true);

  let offset = HEADER_SIZE + COUNT_SIZE;

  for (let t = 0; t < triangleCount; t++) {
    const base = t * 9;

    // Face normal — prefer computed from vertices for accuracy
    const [nx, ny, nz] = computeFaceNormal(
      positions[base], positions[base + 1], positions[base + 2],
      positions[base + 3], positions[base + 4], positions[base + 5],
      positions[base + 6], positions[base + 7], positions[base + 8],
    );

    // Normal
    view.setFloat32(offset, nx, true); offset += 4;
    view.setFloat32(offset, ny, true); offset += 4;
    view.setFloat32(offset, nz, true); offset += 4;

    // 3 vertices (9 floats)
    for (let v = 0; v < 9; v++) {
      view.setFloat32(offset, positions[base + v], true);
      offset += 4;
    }

    // Attribute byte count
    view.setUint16(offset, 0, true);
    offset += 2;
  }

  return buffer;
}

// ---------------------------------------------------------------------------
// ASCII STL export
// ---------------------------------------------------------------------------

export function exportSTLAscii(mesh: ExportMesh, name = "model"): string {
  const { positions, triangleCount } = expandTriangles(mesh);
  const lines: string[] = [];

  lines.push(`solid ${name}`);

  for (let t = 0; t < triangleCount; t++) {
    const base = t * 9;
    const [nx, ny, nz] = computeFaceNormal(
      positions[base], positions[base + 1], positions[base + 2],
      positions[base + 3], positions[base + 4], positions[base + 5],
      positions[base + 6], positions[base + 7], positions[base + 8],
    );

    lines.push(`  facet normal ${nx} ${ny} ${nz}`);
    lines.push("    outer loop");
    lines.push(`      vertex ${positions[base]} ${positions[base + 1]} ${positions[base + 2]}`);
    lines.push(`      vertex ${positions[base + 3]} ${positions[base + 4]} ${positions[base + 5]}`);
    lines.push(`      vertex ${positions[base + 6]} ${positions[base + 7]} ${positions[base + 8]}`);
    lines.push("    endloop");
    lines.push("  endfacet");
  }

  lines.push(`endsolid ${name}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// OBJ export
// ---------------------------------------------------------------------------

export function exportOBJ(mesh: ExportMesh, name = "model"): string {
  const { vertices, normals, indices } = mesh;
  const lines: string[] = [];
  const vertexCount = vertices.length / 3;

  lines.push(`# Wavefront OBJ - ${name}`);
  lines.push(`# Generated by ShilpaSutra Export Engine`);
  lines.push(`o ${name}`);

  // Vertices
  for (let i = 0; i < vertexCount; i++) {
    const x = vertices[i * 3];
    const y = vertices[i * 3 + 1];
    const z = vertices[i * 3 + 2];
    lines.push(`v ${x} ${y} ${z}`);
  }

  // Normals
  const hasNormals = normals && normals.length > 0;
  if (hasNormals) {
    for (let i = 0; i < vertexCount; i++) {
      const nx = normals[i * 3];
      const ny = normals[i * 3 + 1];
      const nz = normals[i * 3 + 2];
      lines.push(`vn ${nx} ${ny} ${nz}`);
    }
  }

  // Faces (OBJ uses 1-based indices)
  if (indices && indices.length > 0) {
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i] + 1;
      const b = indices[i + 1] + 1;
      const c = indices[i + 2] + 1;
      if (hasNormals) {
        lines.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
      } else {
        lines.push(`f ${a} ${b} ${c}`);
      }
    }
  } else {
    // Non-indexed: every 3 vertices form a face
    const faceCount = vertexCount / 3;
    for (let i = 0; i < faceCount; i++) {
      const a = i * 3 + 1;
      const b = i * 3 + 2;
      const c = i * 3 + 3;
      if (hasNormals) {
        lines.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
      } else {
        lines.push(`f ${a} ${b} ${c}`);
      }
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// PLY export (ASCII)
// ---------------------------------------------------------------------------

export function exportPLY(mesh: ExportMesh, name = "model"): string {
  const { vertices, normals, indices } = mesh;
  const vertexCount = vertices.length / 3;
  const hasNormals = normals && normals.length > 0;

  let faceCount: number;
  if (indices && indices.length > 0) {
    faceCount = indices.length / 3;
  } else {
    faceCount = vertexCount / 3;
  }

  const lines: string[] = [];

  // Header
  lines.push("ply");
  lines.push("format ascii 1.0");
  lines.push(`comment Generated by ShilpaSutra Export Engine - ${name}`);
  lines.push(`element vertex ${vertexCount}`);
  lines.push("property float x");
  lines.push("property float y");
  lines.push("property float z");
  if (hasNormals) {
    lines.push("property float nx");
    lines.push("property float ny");
    lines.push("property float nz");
  }
  lines.push(`element face ${faceCount}`);
  lines.push("property list uchar int vertex_indices");
  lines.push("end_header");

  // Vertices
  for (let i = 0; i < vertexCount; i++) {
    let line = `${vertices[i * 3]} ${vertices[i * 3 + 1]} ${vertices[i * 3 + 2]}`;
    if (hasNormals) {
      line += ` ${normals[i * 3]} ${normals[i * 3 + 1]} ${normals[i * 3 + 2]}`;
    }
    lines.push(line);
  }

  // Faces
  if (indices && indices.length > 0) {
    for (let i = 0; i < indices.length; i += 3) {
      lines.push(`3 ${indices[i]} ${indices[i + 1]} ${indices[i + 2]}`);
    }
  } else {
    for (let i = 0; i < faceCount; i++) {
      lines.push(`3 ${i * 3} ${i * 3 + 1} ${i * 3 + 2}`);
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// glTF 2.0 export (JSON only, no binary buffer)
// ---------------------------------------------------------------------------

export function exportGLTF(mesh: ExportMesh, name = "model"): string {
  const { vertices, normals, indices } = mesh;
  const vertexCount = vertices.length / 3;
  const hasNormals = normals && normals.length > 0;
  const hasIndices = indices && indices.length > 0;

  // Compute bounding box for accessor min/max
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < vertexCount; i++) {
    const x = vertices[i * 3], y = vertices[i * 3 + 1], z = vertices[i * 3 + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }

  const accessors: Record<string, unknown>[] = [];
  const bufferViews: Record<string, unknown>[] = [];
  const attributes: Record<string, number> = {};

  let accessorIndex = 0;
  let byteOffset = 0;

  // Position accessor
  const positionByteLength = vertexCount * 3 * 4;
  bufferViews.push({
    buffer: 0,
    byteOffset,
    byteLength: positionByteLength,
    target: 34962, // ARRAY_BUFFER
  });
  accessors.push({
    bufferView: accessorIndex,
    componentType: 5126, // FLOAT
    count: vertexCount,
    type: "VEC3",
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
  });
  attributes["POSITION"] = accessorIndex;
  accessorIndex++;
  byteOffset += positionByteLength;

  // Normal accessor
  if (hasNormals) {
    const normalByteLength = vertexCount * 3 * 4;
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: normalByteLength,
      target: 34962,
    });
    accessors.push({
      bufferView: accessorIndex,
      componentType: 5126,
      count: vertexCount,
      type: "VEC3",
    });
    attributes["NORMAL"] = accessorIndex;
    accessorIndex++;
    byteOffset += normalByteLength;
  }

  // Index accessor
  let indicesAccessorIndex: number | undefined;
  if (hasIndices) {
    const indexByteLength = indices.length * 4;
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: indexByteLength,
      target: 34963, // ELEMENT_ARRAY_BUFFER
    });
    accessors.push({
      bufferView: accessorIndex,
      componentType: 5125, // UNSIGNED_INT
      count: indices.length,
      type: "SCALAR",
    });
    indicesAccessorIndex = accessorIndex;
    accessorIndex++;
    byteOffset += indexByteLength;
  }

  const primitive: Record<string, unknown> = { attributes, mode: 4 }; // TRIANGLES
  if (indicesAccessorIndex !== undefined) {
    primitive.indices = indicesAccessorIndex;
  }

  const gltf = {
    asset: {
      version: "2.0",
      generator: "ShilpaSutra Export Engine",
    },
    scene: 0,
    scenes: [{ name, nodes: [0] }],
    nodes: [{ name, mesh: 0 }],
    meshes: [{ name, primitives: [primitive] }],
    accessors,
    bufferViews,
    buffers: [
      {
        byteLength: byteOffset,
        uri: `${name}.bin`,
      },
    ],
  };

  return JSON.stringify(gltf, null, 2);
}

// ---------------------------------------------------------------------------
// STEP AP203 export stub
// ---------------------------------------------------------------------------

export function exportSTEP(mesh: ExportMesh, name = "model"): string {
  const { vertices, indices } = mesh;
  const vertexCount = vertices.length / 3;
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);

  const lines: string[] = [];

  lines.push("ISO-10303-21;");
  lines.push("HEADER;");
  lines.push(`FILE_DESCRIPTION(('ShilpaSutra CAD Export'),'2;1');`);
  lines.push(
    `FILE_NAME('${name}.stp','${timestamp}',('ShilpaSutra'),('ShilpaSutra'),` +
    `'ShilpaSutra Export Engine','ShilpaSutra','');`
  );
  lines.push("FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));");
  lines.push("ENDSEC;");
  lines.push("DATA;");

  let entityId = 1;
  const id = () => `#${entityId++}`;

  // Application context
  const appCtxId = id();
  lines.push(`${appCtxId}=APPLICATION_CONTEXT('automotive design');`);

  const appProtoId = id();
  lines.push(
    `${appProtoId}=APPLICATION_PROTOCOL_DEFINITION('international standard',` +
    `'automotive_design',2000,${appCtxId});`
  );

  // Product definition
  const prodCtxId = id();
  lines.push(`${prodCtxId}=PRODUCT_CONTEXT('',${appCtxId},'mechanical');`);

  const prodId = id();
  lines.push(`${prodId}=PRODUCT('${name}','${name}','',(${prodCtxId}));`);

  const prodDefFormId = id();
  lines.push(`${prodDefFormId}=PRODUCT_DEFINITION_FORMATION('','',${prodId});`);

  const prodDefCtxId = id();
  lines.push(
    `${prodDefCtxId}=PRODUCT_DEFINITION_CONTEXT('part definition',${appCtxId},'design');`
  );

  const prodDefId = id();
  lines.push(`${prodDefId}=PRODUCT_DEFINITION('design','',${prodDefFormId},${prodDefCtxId});`);

  // Shape representation
  const shapeDefId = id();
  lines.push(`${shapeDefId}=PRODUCT_DEFINITION_SHAPE('','Shape for ${name}',${prodDefId});`);

  // Cartesian points for each vertex
  const pointIds: string[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const pid = id();
    pointIds.push(pid);
    const x = vertices[i * 3];
    const y = vertices[i * 3 + 1];
    const z = vertices[i * 3 + 2];
    lines.push(`${pid}=CARTESIAN_POINT('',(${x},${y},${z}));`);
  }

  // Triangular faces as closed shells (simplified)
  const faceIds: string[] = [];
  const triIndices = indices && indices.length > 0 ? indices : null;
  const faceCount = triIndices ? triIndices.length / 3 : vertexCount / 3;

  for (let f = 0; f < faceCount; f++) {
    let a: number, b: number, c: number;
    if (triIndices) {
      a = triIndices[f * 3];
      b = triIndices[f * 3 + 1];
      c = triIndices[f * 3 + 2];
    } else {
      a = f * 3;
      b = f * 3 + 1;
      c = f * 3 + 2;
    }
    const faceId = id();
    faceIds.push(faceId);
    lines.push(
      `${faceId}=FACE_SURFACE('',(.T.),` +
      `PLANE('',AXIS2_PLACEMENT_3D('',${pointIds[a]},` +
      `DIRECTION('',(0.,0.,1.)),DIRECTION('',(1.,0.,0.)))));`
    );
  }

  // Closed shell
  const shellId = id();
  lines.push(`${shellId}=CLOSED_SHELL('',(${faceIds.join(",")}));`);

  // Manifold solid
  const solidId = id();
  lines.push(`${solidId}=MANIFOLD_SOLID_BREP('${name}',${shellId});`);

  // Shape representation
  const shapeRepId = id();
  lines.push(
    `${shapeRepId}=SHAPE_REPRESENTATION('${name}',(${solidId}),` +
    `(LENGTH_UNIT(),PLANE_ANGLE_UNIT(),SOLID_ANGLE_UNIT()));`
  );

  const shapeDefRepId = id();
  lines.push(
    `${shapeDefRepId}=SHAPE_DEFINITION_REPRESENTATION(${shapeDefId},${shapeRepId});`
  );

  lines.push("ENDSEC;");
  lines.push("END-ISO-10303-21;");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Browser download helper
// ---------------------------------------------------------------------------

/**
 * Trigger a file download in the browser.
 * No-ops in non-browser environments (e.g. SSR / Node).
 */
export function downloadFile(
  data: string | ArrayBuffer,
  filename: string,
  mimeType = "application/octet-stream",
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  let blob: Blob;
  if (typeof data === "string") {
    blob = new Blob([data], { type: mimeType });
  } else {
    blob = new Blob([data], { type: mimeType });
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

// ---------------------------------------------------------------------------
// Batch / scene export
// ---------------------------------------------------------------------------

/**
 * Export multiple meshes as a single file in the given format.
 * For formats that don't natively support multi-mesh (STL, PLY),
 * meshes are merged into one.
 */
export function exportScene(
  meshes: ExportMesh[],
  format: ExportFormat,
  name = "scene",
): string | ArrayBuffer {
  if (meshes.length === 0) {
    throw new Error("exportScene: no meshes provided");
  }

  // Merge all meshes into one ExportMesh
  const merged = mergeMeshes(meshes);

  switch (format) {
    case "stl":
      return exportSTLBinary(merged, name);
    case "obj":
      return exportOBJ(merged, name);
    case "ply":
      return exportPLY(merged, name);
    case "gltf":
      return exportGLTF(merged, name);
    case "step":
      return exportSTEP(merged, name);
    default:
      throw new Error(`exportScene: unsupported format "${format}"`);
  }
}

// ---------------------------------------------------------------------------
// Mesh merging utility
// ---------------------------------------------------------------------------

function mergeMeshes(meshes: ExportMesh[]): ExportMesh {
  if (meshes.length === 1) return meshes[0];

  let totalVertices = 0;
  let totalIndices = 0;
  let allHaveNormals = true;
  let anyHasIndices = false;

  for (const m of meshes) {
    totalVertices += m.vertices.length;
    if (!m.normals || m.normals.length === 0) allHaveNormals = false;
    if (m.indices && m.indices.length > 0) {
      totalIndices += m.indices.length;
      anyHasIndices = true;
    } else {
      // Non-indexed: will generate sequential indices
      totalIndices += m.vertices.length / 3; // number of vertex indices
      anyHasIndices = true;
    }
  }

  const vertices = new Float32Array(totalVertices);
  const normals = allHaveNormals ? new Float32Array(totalVertices) : undefined;
  const indices = new Uint32Array(totalIndices);

  let vOffset = 0; // float offset into vertices array
  let iOffset = 0; // offset into indices array

  for (const m of meshes) {
    const vertexBase = vOffset / 3; // vertex index offset

    // Copy vertices
    vertices.set(m.vertices, vOffset);
    if (normals && m.normals) {
      normals.set(m.normals, vOffset);
    }

    // Copy / generate indices
    if (m.indices && m.indices.length > 0) {
      for (let i = 0; i < m.indices.length; i++) {
        indices[iOffset + i] = m.indices[i] + vertexBase;
      }
      iOffset += m.indices.length;
    } else {
      const count = m.vertices.length / 3;
      for (let i = 0; i < count; i++) {
        indices[iOffset + i] = vertexBase + i;
      }
      iOffset += count;
    }

    vOffset += m.vertices.length;
  }

  return { vertices, normals, indices };
}
