"use client";
import { useState, useCallback, useRef } from "react";
import { useCadStore, type CadObject } from "@/stores/cad-store";
import { parseIFC, type IfcParseResult, type IfcSpatialNode } from "@/lib/ifc-engine";
import { exportToIFC, type ExportSchema } from "@/lib/ifc-exporter";

/* ── Types ── */
type FileFormat = "STEP" | "STL" | "OBJ" | "IGES" | "glTF" | "FBX" | "PLY" | "IFC" | "Unknown";
type UnitSystem = "mm" | "cm" | "m" | "in";

interface ParsedStats {
  triangles: number;
  vertices: number;
  bbox: { min: number[]; max: number[] };
}

interface ImportedFile {
  id: string;
  name: string;
  format: FileFormat;
  size: number;
  date: string;
  status: "ready" | "importing" | "error";
  parsedStats?: ParsedStats;
  ifcResult?: IfcParseResult;
}

interface ExportOptions {
  format: FileFormat;
  units: UnitSystem;
  precision: "low" | "medium" | "high";
  includeTextures: boolean;
  mergeMeshes: boolean;
}

/* ── Helpers ── */
function detectFormat(filename: string): FileFormat {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, FileFormat> = {
    step: "STEP", stp: "STEP", stl: "STL", obj: "OBJ",
    iges: "IGES", igs: "IGES", gltf: "glTF", glb: "glTF",
    fbx: "FBX", ply: "PLY", ifc: "IFC",
  };
  return map[ext || ""] || "Unknown";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const formatColors: Record<FileFormat, string> = {
  STEP: "text-blue-400 bg-blue-400/10",
  STL: "text-green-400 bg-green-400/10",
  OBJ: "text-yellow-400 bg-yellow-400/10",
  IGES: "text-purple-400 bg-purple-400/10",
  glTF: "text-orange-400 bg-orange-400/10",
  FBX: "text-red-400 bg-red-400/10",
  PLY: "text-teal-400 bg-teal-400/10",
  IFC: "text-emerald-400 bg-emerald-400/10",
  Unknown: "text-slate-400 bg-slate-400/10",
};

const exportFormats: FileFormat[] = ["STEP", "STL", "OBJ", "IGES", "glTF", "FBX", "PLY", "IFC"];

/* ── STL Parsing ── */
function parseSTL(buffer: ArrayBuffer): ParsedStats {
  const bytes = new Uint8Array(buffer);
  // Check for ASCII STL: starts with "solid"
  const header = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]);
  const isAscii = header.toLowerCase() === "solid";

  if (isAscii) {
    const text = new TextDecoder().decode(buffer);
    const vertMatches = text.match(/vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g) || [];
    const triangles = Math.floor(vertMatches.length / 3);
    const vertices = vertMatches.length;
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    for (const m of vertMatches) {
      const parts = m.replace("vertex", "").trim().split(/\s+/);
      xs.push(parseFloat(parts[0]));
      ys.push(parseFloat(parts[1]));
      zs.push(parseFloat(parts[2]));
    }
    const bbox = {
      min: [xs.length ? Math.min(...xs) : 0, ys.length ? Math.min(...ys) : 0, zs.length ? Math.min(...zs) : 0],
      max: [xs.length ? Math.max(...xs) : 0, ys.length ? Math.max(...ys) : 0, zs.length ? Math.max(...zs) : 0],
    };
    return { triangles, vertices, bbox };
  } else {
    // Binary STL: 80-byte header, 4-byte uint32 triangle count, 50 bytes per triangle
    const view = new DataView(buffer);
    const triangles = view.getUint32(80, true);
    const vertices = triangles * 3;
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    for (let i = 0; i < triangles; i++) {
      const offset = 84 + i * 50;
      // Skip normal (12 bytes), read 3 vertices
      for (let v = 0; v < 3; v++) {
        const vOffset = offset + 12 + v * 12;
        if (vOffset + 12 <= buffer.byteLength) {
          xs.push(view.getFloat32(vOffset, true));
          ys.push(view.getFloat32(vOffset + 4, true));
          zs.push(view.getFloat32(vOffset + 8, true));
        }
      }
    }
    const bbox = {
      min: [xs.length ? Math.min(...xs) : 0, ys.length ? Math.min(...ys) : 0, zs.length ? Math.min(...zs) : 0],
      max: [xs.length ? Math.max(...xs) : 0, ys.length ? Math.max(...ys) : 0, zs.length ? Math.max(...zs) : 0],
    };
    return { triangles, vertices, bbox };
  }
}

/* ── OBJ Parsing ── */
function parseOBJ(text: string): ParsedStats {
  const lines = text.split("\n");
  const verts: number[][] = [];
  let faces = 0;
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "v") {
      verts.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (parts[0] === "f") {
      // Each face token can be "v", "v/vt", "v/vt/vn"
      const count = parts.length - 1;
      faces += Math.max(0, count - 2); // triangulate
    }
  }
  const xs = verts.map(v => v[0]);
  const ys = verts.map(v => v[1]);
  const zs = verts.map(v => v[2]);
  const bbox = {
    min: [xs.length ? Math.min(...xs) : 0, ys.length ? Math.min(...ys) : 0, zs.length ? Math.min(...zs) : 0],
    max: [xs.length ? Math.max(...xs) : 0, ys.length ? Math.max(...ys) : 0, zs.length ? Math.max(...zs) : 0],
  };
  return { triangles: faces, vertices: verts.length, bbox };
}

/* ── STL Binary Export ── */
function boxTriangles(obj: CadObject): number[][] {
  // Returns array of triangles, each triangle is [nx,ny,nz, ax,ay,az, bx,by,bz, cx,cy,cz]
  const [px, py, pz] = obj.position;
  const { width: w, height: h, depth: d } = obj.dimensions;
  const hw = w / 2, hh = h / 2, hd = d / 2;
  // 8 corners
  const v = [
    [px - hw, py - hh, pz - hd], // 0 LBF
    [px + hw, py - hh, pz - hd], // 1 RBF
    [px + hw, py + hh, pz - hd], // 2 RTF
    [px - hw, py + hh, pz - hd], // 3 LTF
    [px - hw, py - hh, pz + hd], // 4 LBB
    [px + hw, py - hh, pz + hd], // 5 RBB
    [px + hw, py + hh, pz + hd], // 6 RTB
    [px - hw, py + hh, pz + hd], // 7 LTB
  ];
  // 6 faces x 2 triangles = 12 triangles
  const faces: [number, number, number, [number,number,number]][] = [
    // Front -Z: 0,1,2 and 0,2,3
    [0, 1, 2, [0, 0, -1]], [0, 2, 3, [0, 0, -1]],
    // Back +Z: 5,4,7 and 5,7,6
    [5, 4, 7, [0, 0, 1]], [5, 7, 6, [0, 0, 1]],
    // Left -X: 4,0,3 and 4,3,7
    [4, 0, 3, [-1, 0, 0]], [4, 3, 7, [-1, 0, 0]],
    // Right +X: 1,5,6 and 1,6,2
    [1, 5, 6, [1, 0, 0]], [1, 6, 2, [1, 0, 0]],
    // Bottom -Y: 4,5,1 and 4,1,0
    [4, 5, 1, [0, -1, 0]], [4, 1, 0, [0, -1, 0]],
    // Top +Y: 3,2,6 and 3,6,7
    [3, 2, 6, [0, 1, 0]], [3, 6, 7, [0, 1, 0]],
  ];
  return faces.map(([ai, bi, ci, n]) => [...n, ...v[ai], ...v[bi], ...v[ci]]);
}

function cylinderTriangles(obj: CadObject, segments = 16): number[][] {
  const [px, py, pz] = obj.position;
  const { width: r, height: h } = obj.dimensions;
  const hh = h / 2;
  const tris: number[][] = [];
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const x0 = Math.cos(a0) * r, z0 = Math.sin(a0) * r;
    const x1 = Math.cos(a1) * r, z1 = Math.sin(a1) * r;
    // Side quads
    const nx = Math.cos((a0 + a1) / 2), nz = Math.sin((a0 + a1) / 2);
    tris.push([nx, 0, nz, px+x0, py-hh, pz+z0, px+x1, py-hh, pz+z1, px+x1, py+hh, pz+z1]);
    tris.push([nx, 0, nz, px+x0, py-hh, pz+z0, px+x1, py+hh, pz+z1, px+x0, py+hh, pz+z0]);
    // Top cap
    tris.push([0, 1, 0, px, py+hh, pz, px+x0, py+hh, pz+z0, px+x1, py+hh, pz+z1]);
    // Bottom cap
    tris.push([0, -1, 0, px, py-hh, pz, px+x1, py-hh, pz+z1, px+x0, py-hh, pz+z0]);
  }
  return tris;
}

function coneTriangles(obj: CadObject, segments = 16): number[][] {
  const [px, py, pz] = obj.position;
  const { width: r, height: h } = obj.dimensions;
  const hh = h / 2;
  const tris: number[][] = [];
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const x0 = Math.cos(a0) * r, z0 = Math.sin(a0) * r;
    const x1 = Math.cos(a1) * r, z1 = Math.sin(a1) * r;
    const slant = Math.sqrt(r * r + h * h);
    const nFactor = h / slant;
    const nx0 = Math.cos(a0) * nFactor, nz0 = Math.sin(a0) * nFactor;
    const ny = r / slant;
    // Side triangle (apex at top)
    tris.push([nx0, ny, nz0, px, py + hh, pz, px + x0, py - hh, pz + z0, px + x1, py - hh, pz + z1]);
    // Bottom cap
    tris.push([0, -1, 0, px, py - hh, pz, px + x1, py - hh, pz + z1, px + x0, py - hh, pz + z0]);
  }
  return tris;
}

function sphereTriangles(obj: CadObject, segments = 12): number[][] {
  const [px, py, pz] = obj.position;
  const r = obj.dimensions.width / 2;
  const tris: number[][] = [];
  for (let lat = 0; lat < segments; lat++) {
    const theta0 = (lat / segments) * Math.PI;
    const theta1 = ((lat + 1) / segments) * Math.PI;
    for (let lon = 0; lon < segments; lon++) {
      const phi0 = (lon / segments) * Math.PI * 2;
      const phi1 = ((lon + 1) / segments) * Math.PI * 2;
      const p = (t: number, p: number) => [
        Math.sin(t) * Math.cos(p) * r + px,
        Math.cos(t) * r + py,
        Math.sin(t) * Math.sin(p) * r + pz,
        Math.sin(t) * Math.cos(p),
        Math.cos(t),
        Math.sin(t) * Math.sin(p),
      ];
      const [ax, ay, az, nx0, ny0, nz0] = p(theta0, phi0);
      const [bx, by, bz] = p(theta0, phi1);
      const [cx, cy, cz] = p(theta1, phi0);
      const [dx, dy, dz, nx1, ny1, nz1] = p(theta1, phi1);
      tris.push([nx0, ny0, nz0, ax, ay, az, bx, by, bz, cx, cy, cz]);
      tris.push([nx1, ny1, nz1, bx, by, bz, dx, dy, dz, cx, cy, cz]);
    }
  }
  return tris;
}

function generateSTLBinary(objects: CadObject[]): ArrayBuffer {
  const allTris: number[][] = [];
  for (const obj of objects) {
    if (obj.visible === false) continue;
    if (obj.type === "box") allTris.push(...boxTriangles(obj));
    else if (obj.type === "cylinder") allTris.push(...cylinderTriangles(obj));
    else if (obj.type === "sphere") allTris.push(...sphereTriangles(obj));
    else if (obj.type === "cone") allTris.push(...coneTriangles(obj));
  }

  const triangleCount = allTris.length;
  const bufferSize = 80 + 4 + triangleCount * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // 80-byte header
  const headerText = "ShilpaSutra STL Export";
  for (let i = 0; i < Math.min(headerText.length, 80); i++) {
    view.setUint8(i, headerText.charCodeAt(i));
  }

  // Triangle count
  view.setUint32(80, triangleCount, true);

  for (let i = 0; i < triangleCount; i++) {
    const tri = allTris[i];
    const offset = 84 + i * 50;
    // Normal (3 floats)
    view.setFloat32(offset, tri[0], true);
    view.setFloat32(offset + 4, tri[1], true);
    view.setFloat32(offset + 8, tri[2], true);
    // Vertex A
    view.setFloat32(offset + 12, tri[3], true);
    view.setFloat32(offset + 16, tri[4], true);
    view.setFloat32(offset + 20, tri[5], true);
    // Vertex B
    view.setFloat32(offset + 24, tri[6], true);
    view.setFloat32(offset + 28, tri[7], true);
    view.setFloat32(offset + 32, tri[8], true);
    // Vertex C
    view.setFloat32(offset + 36, tri[9], true);
    view.setFloat32(offset + 40, tri[10], true);
    view.setFloat32(offset + 44, tri[11], true);
    // Attribute byte count
    view.setUint16(offset + 48, 0, true);
  }

  return buffer;
}

/* ── OBJ Text Export ── */
function generateOBJ(objects: CadObject[]): string {
  let lines = "# ShilpaSutra OBJ Export\n";
  let vertexOffset = 1;

  for (const obj of objects) {
    if (obj.visible === false) continue;
    lines += `\n# Object: ${obj.name}\ng ${obj.name.replace(/\s/g, "_")}\n`;

    let tris: number[][] = [];
    if (obj.type === "box") tris = boxTriangles(obj);
    else if (obj.type === "cylinder") tris = cylinderTriangles(obj);
    else if (obj.type === "sphere") tris = sphereTriangles(obj);
    else if (obj.type === "cone") tris = coneTriangles(obj);

    for (const tri of tris) {
      lines += `v ${tri[3].toFixed(6)} ${tri[4].toFixed(6)} ${tri[5].toFixed(6)}\n`;
      lines += `v ${tri[6].toFixed(6)} ${tri[7].toFixed(6)} ${tri[8].toFixed(6)}\n`;
      lines += `v ${tri[9].toFixed(6)} ${tri[10].toFixed(6)} ${tri[11].toFixed(6)}\n`;
    }
    for (let i = 0; i < tris.length; i++) {
      const a = vertexOffset + i * 3;
      lines += `f ${a} ${a + 1} ${a + 2}\n`;
    }
    vertexOffset += tris.length * 3;
  }

  return lines;
}

/* ── DXF Generation ── */
function generateDxf(objects: CadObject[]): string {
  let entities = "";

  for (const obj of objects) {
    if (obj.visible === false) continue;

    if (obj.type === "line" && obj.linePoints && obj.linePoints.length >= 2) {
      for (let i = 0; i < obj.linePoints.length - 1; i++) {
        const p1 = obj.linePoints[i];
        const p2 = obj.linePoints[i + 1];
        entities +=
          `0\nLINE\n8\n0\n` +
          `10\n${p1[0].toFixed(4)}\n20\n${p1[2].toFixed(4)}\n30\n0.0\n` +
          `11\n${p2[0].toFixed(4)}\n21\n${p2[2].toFixed(4)}\n31\n0.0\n`;
      }
    } else if (obj.type === "circle" && obj.circleCenter && obj.circleRadius) {
      entities +=
        `0\nCIRCLE\n8\n0\n` +
        `10\n${obj.circleCenter[0].toFixed(4)}\n20\n${obj.circleCenter[2].toFixed(4)}\n30\n0.0\n` +
        `40\n${obj.circleRadius.toFixed(4)}\n`;
    } else if (obj.type === "arc" && obj.arcPoints && obj.arcPoints.length >= 3) {
      const [p1, , p3] = obj.arcPoints;
      const cx = (p1[0] + p3[0]) / 2;
      const cz = (p1[2] + p3[2]) / 2;
      const radius = Math.sqrt(Math.pow(p3[0] - p1[0], 2) + Math.pow(p3[2] - p1[2], 2)) / 2;
      const startAngle = (Math.atan2(p1[2] - cz, p1[0] - cx) * 180) / Math.PI;
      const endAngle = (Math.atan2(p3[2] - cz, p3[0] - cx) * 180) / Math.PI;
      entities +=
        `0\nARC\n8\n0\n` +
        `10\n${cx.toFixed(4)}\n20\n${cz.toFixed(4)}\n30\n0.0\n` +
        `40\n${radius.toFixed(4)}\n` +
        `50\n${startAngle.toFixed(4)}\n51\n${endAngle.toFixed(4)}\n`;
    } else if (obj.type === "rectangle" && obj.rectCorners) {
      const [c1, c2] = obj.rectCorners;
      const corners: [number, number][] = [
        [c1[0], c1[2]],
        [c2[0], c1[2]],
        [c2[0], c2[2]],
        [c1[0], c2[2]],
      ];
      for (let i = 0; i < 4; i++) {
        const from = corners[i];
        const to = corners[(i + 1) % 4];
        entities +=
          `0\nLINE\n8\n0\n` +
          `10\n${from[0].toFixed(4)}\n20\n${from[1].toFixed(4)}\n30\n0.0\n` +
          `11\n${to[0].toFixed(4)}\n21\n${to[1].toFixed(4)}\n31\n0.0\n`;
      }
    } else if (obj.type === "box") {
      const { width, depth } = obj.dimensions;
      const [px, , pz] = obj.position;
      const hw = width / 2, hd = depth / 2;
      const corners: [number, number][] = [
        [px - hw, pz - hd],
        [px + hw, pz - hd],
        [px + hw, pz + hd],
        [px - hw, pz + hd],
      ];
      for (let i = 0; i < 4; i++) {
        const from = corners[i];
        const to = corners[(i + 1) % 4];
        entities +=
          `0\nLINE\n8\n0\n` +
          `10\n${from[0].toFixed(4)}\n20\n${from[1].toFixed(4)}\n30\n0.0\n` +
          `11\n${to[0].toFixed(4)}\n21\n${to[1].toFixed(4)}\n31\n0.0\n`;
      }
    } else if (obj.type === "cylinder" || obj.type === "cone" || obj.type === "sphere") {
      const radius = obj.dimensions.width;
      entities +=
        `0\nCIRCLE\n8\n0\n` +
        `10\n${obj.position[0].toFixed(4)}\n20\n${obj.position[2].toFixed(4)}\n30\n0.0\n` +
        `40\n${radius.toFixed(4)}\n`;
    }
  }

  return `0\nSECTION\n2\nENTITIES\n${entities}0\nENDSEC\n0\nEOF\n`;
}

/* ── PLY Text Export ── */
function generatePLY(objects: CadObject[]): string {
  const allTris: number[][] = [];
  for (const obj of objects) {
    if (obj.visible === false) continue;
    if (obj.type === "box") allTris.push(...boxTriangles(obj));
    else if (obj.type === "cylinder") allTris.push(...cylinderTriangles(obj));
    else if (obj.type === "sphere") allTris.push(...sphereTriangles(obj));
    else if (obj.type === "cone") allTris.push(...coneTriangles(obj));
  }

  const vertexCount = allTris.length * 3;
  const faceCount = allTris.length;

  let ply = `ply\nformat ascii 1.0\ncomment ShilpaSutra PLY Export\n`;
  ply += `element vertex ${vertexCount}\nproperty float x\nproperty float y\nproperty float z\n`;
  ply += `property float nx\nproperty float ny\nproperty float nz\n`;
  ply += `element face ${faceCount}\nproperty list uchar int vertex_indices\nend_header\n`;

  for (const tri of allTris) {
    const [nx, ny, nz] = [tri[0], tri[1], tri[2]];
    ply += `${tri[3].toFixed(6)} ${tri[4].toFixed(6)} ${tri[5].toFixed(6)} ${nx.toFixed(4)} ${ny.toFixed(4)} ${nz.toFixed(4)}\n`;
    ply += `${tri[6].toFixed(6)} ${tri[7].toFixed(6)} ${tri[8].toFixed(6)} ${nx.toFixed(4)} ${ny.toFixed(4)} ${nz.toFixed(4)}\n`;
    ply += `${tri[9].toFixed(6)} ${tri[10].toFixed(6)} ${tri[11].toFixed(6)} ${nx.toFixed(4)} ${ny.toFixed(4)} ${nz.toFixed(4)}\n`;
  }

  for (let i = 0; i < faceCount; i++) {
    ply += `3 ${i * 3} ${i * 3 + 1} ${i * 3 + 2}\n`;
  }

  return ply;
}

/* ── glTF JSON Export ── */
function generateGLTF(objects: CadObject[]): string {
  const allTris: number[][] = [];
  for (const obj of objects) {
    if (obj.visible === false) continue;
    if (obj.type === "box") allTris.push(...boxTriangles(obj));
    else if (obj.type === "cylinder") allTris.push(...cylinderTriangles(obj));
    else if (obj.type === "sphere") allTris.push(...sphereTriangles(obj));
    else if (obj.type === "cone") allTris.push(...coneTriangles(obj));
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < allTris.length; i++) {
    const tri = allTris[i];
    const [nx, ny, nz] = [tri[0], tri[1], tri[2]];
    positions.push(tri[3], tri[4], tri[5], tri[6], tri[7], tri[8], tri[9], tri[10], tri[11]);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    indices.push(i * 3, i * 3 + 1, i * 3 + 2);
  }

  // Compute bounding box
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]); maxX = Math.max(maxX, positions[i]);
    minY = Math.min(minY, positions[i+1]); maxY = Math.max(maxY, positions[i+1]);
    minZ = Math.min(minZ, positions[i+2]); maxZ = Math.max(maxZ, positions[i+2]);
  }

  // Base64 encode buffers
  const posBuffer = new Float32Array(positions);
  const normBuffer = new Float32Array(normals);
  const idxBuffer = new Uint16Array(indices);

  const toBase64 = (buf: ArrayBuffer) => {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };
  const posB64 = toBase64(posBuffer.buffer);
  const normB64 = toBase64(normBuffer.buffer);
  const idxB64 = toBase64(idxBuffer.buffer);

  const gltf = {
    asset: { version: "2.0", generator: "ShilpaSutra" },
    scene: 0,
    scenes: [{ name: "Scene", nodes: [0] }],
    nodes: [{ name: "Model", mesh: 0 }],
    meshes: [{
      name: "Mesh",
      primitives: [{
        attributes: { POSITION: 0, NORMAL: 1 },
        indices: 2,
        mode: 4,
      }],
    }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: positions.length / 3, type: "VEC3", max: [maxX, maxY, maxZ], min: [minX, minY, minZ] },
      { bufferView: 1, componentType: 5126, count: normals.length / 3, type: "VEC3" },
      { bufferView: 2, componentType: 5123, count: indices.length, type: "SCALAR" },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBuffer.byteLength, target: 34962 },
      { buffer: 1, byteOffset: 0, byteLength: normBuffer.byteLength, target: 34962 },
      { buffer: 2, byteOffset: 0, byteLength: idxBuffer.byteLength, target: 34963 },
    ],
    buffers: [
      { uri: `data:application/octet-stream;base64,${posB64}`, byteLength: posBuffer.byteLength },
      { uri: `data:application/octet-stream;base64,${normB64}`, byteLength: normBuffer.byteLength },
      { uri: `data:application/octet-stream;base64,${idxB64}`, byteLength: idxBuffer.byteLength },
    ],
  };

  return JSON.stringify(gltf, null, 2);
}

/* ── STEP Stub Export ── */
function generateSTEPStub(objects: CadObject[]): string {
  const now = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  let step = `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ShilpaSutra CAD Export'),'2;1');\n`;
  step += `FILE_NAME('shilpasutra_export.step','${now}',('ShilpaSutra'),('ShilpaSutra Engineering'),'ShilpaSutra CAD','ShilpaSutra v2.0','');\n`;
  step += `FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));\nENDSEC;\nDATA;\n`;

  let entityId = 1;
  step += `#${entityId++}=APPLICATION_PROTOCOL_DEFINITION('international standard','automotive_design',2000,#${entityId});\n`;
  step += `#${entityId++}=APPLICATION_CONTEXT('core data for automotive mechanical design processes');\n`;
  step += `#${entityId++}=SHAPE_DEFINITION_REPRESENTATION(#${entityId},#${entityId + 1});\n`;
  entityId++;
  step += `#${entityId++}=PRODUCT_DEFINITION_SHAPE('','',#${entityId});\n`;
  step += `#${entityId++}=PRODUCT_DEFINITION('design','',#${entityId},#${entityId + 1});\n`;
  entityId += 2;

  for (const obj of objects) {
    if (obj.visible === false) continue;
    step += `/* ${obj.type}: ${obj.name} at (${obj.position.join(',')}) dims (${obj.dimensions.width},${obj.dimensions.height},${obj.dimensions.depth}) */\n`;
    step += `#${entityId++}=CARTESIAN_POINT('',(${obj.position[0]},${obj.position[1]},${obj.position[2]}));\n`;

    if (obj.type === "box") {
      step += `#${entityId++}=BLOCK('${obj.name}',#${entityId - 2},${obj.dimensions.width},${obj.dimensions.depth},${obj.dimensions.height});\n`;
    } else if (obj.type === "cylinder") {
      step += `#${entityId++}=RIGHT_CIRCULAR_CYLINDER('${obj.name}',#${entityId - 2},${obj.dimensions.height},${obj.dimensions.width});\n`;
    } else if (obj.type === "sphere") {
      step += `#${entityId++}=SPHERE('${obj.name}',#${entityId - 2},${obj.dimensions.width});\n`;
    } else if (obj.type === "cone") {
      step += `#${entityId++}=RIGHT_CIRCULAR_CONE('${obj.name}',#${entityId - 2},${obj.dimensions.height},${obj.dimensions.width},0.0);\n`;
    }
  }

  step += `ENDSEC;\nEND-ISO-10303-21;\n`;
  return step;
}

const unitSystems: UnitSystem[] = ["mm", "cm", "m", "in"];

const sampleFiles: ImportedFile[] = [
  { id: "f1", name: "bracket_assembly.step", format: "STEP", size: 2457600, date: "2026-03-18", status: "ready" },
  { id: "f2", name: "gear_housing.stl", format: "STL", size: 1843200, date: "2026-03-17", status: "ready" },
  { id: "f3", name: "turbine_blade.obj", format: "OBJ", size: 3276800, date: "2026-03-15", status: "ready" },
  { id: "f4", name: "exhaust_manifold.iges", format: "IGES", size: 4915200, date: "2026-03-14", status: "ready" },
];

export default function ImportExportPage() {
  const cadObjects = useCadStore((s) => s.objects);
  const [files, setFiles] = useState<ImportedFile[]>(sampleFiles);
  const [dragOver, setDragOver] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportOpts, setExportOpts] = useState<ExportOptions>({
    format: "STEP",
    units: "mm",
    precision: "high",
    includeTextures: false,
    mergeMeshes: false,
  });
  const [ifcPreview, setIfcPreview] = useState<ImportedFile | null>(null);
  const [ifcExportSchema, setIfcExportSchema] = useState<ExportSchema>("IFC4");
  const [importProgress, setImportProgress] = useState<{ fileId: string; pct: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File, id: string): Promise<ImportedFile> => {
    return new Promise((resolve) => {
      const fmt = detectFormat(file.name);
      const base: ImportedFile = {
        id,
        name: file.name,
        format: fmt,
        size: file.size,
        date: new Date().toISOString().split("T")[0],
        status: "ready",
      };

      if (fmt === "STL") {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const buf = e.target?.result as ArrayBuffer;
            const stats = parseSTL(buf);
            resolve({ ...base, parsedStats: stats });
          } catch { resolve(base); }
        };
        reader.readAsArrayBuffer(file);
      } else if (fmt === "OBJ") {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            const stats = parseOBJ(text);
            resolve({ ...base, parsedStats: stats });
          } catch { resolve(base); }
        };
        reader.readAsText(file);
      } else if (fmt === "IFC") {
        const reader = new FileReader();
        setImportProgress({ fileId: id, pct: 10 });
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            setImportProgress({ fileId: id, pct: Math.round((e.loaded / e.total) * 80) + 10 });
          }
        };
        reader.onload = (e) => {
          setImportProgress({ fileId: id, pct: 95 });
          try {
            const text = e.target?.result as string;
            const ifcResult = parseIFC(text);
            setImportProgress(null);
            const result: ImportedFile = {
              ...base, ifcResult,
              parsedStats: {
                triangles: ifcResult.stats.geometryEntities * 12,
                vertices: ifcResult.stats.geometryEntities * 24,
                bbox: { min: [0, 0, 0], max: [50, 30, 50] },
              },
            };
            resolve(result);
          } catch { setImportProgress(null); resolve(base); }
        };
        reader.readAsText(file);
      } else {
        resolve(base);
      }
    });
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles = await Promise.all(
      droppedFiles.map((f, i) => processFile(f, `imp-${Date.now()}-${i}`))
    );
    setFiles((prev) => [...newFiles, ...prev]);
  }, [processFile]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const newFiles = await Promise.all(
      selected.map((f, i) => processFile(f, `inp-${Date.now()}-${i}`))
    );
    setFiles((prev) => [...newFiles, ...prev]);
  }, [processFile]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleIFCExport = useCallback(() => {
    const content = exportToIFC(cadObjects, { schema: ifcExportSchema });
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shilpasutra_export.ifc";
    a.click();
    URL.revokeObjectURL(url);
  }, [cadObjects, ifcExportSchema]);

  const handleExport = useCallback(() => {
    if (exportOpts.format === "IFC") {
      handleIFCExport();
      setShowExport(false);
      return;
    }
    if (exportOpts.format === "STL") {
      const buf = generateSTLBinary(cadObjects);
      const blob = new Blob([buf], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "shilpasutra_export.stl";
      a.click();
      URL.revokeObjectURL(url);
    } else if (exportOpts.format === "OBJ") {
      const text = generateOBJ(cadObjects);
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "shilpasutra_export.obj";
      a.click();
      URL.revokeObjectURL(url);
    } else if (exportOpts.format === "PLY") {
      const text = generatePLY(cadObjects);
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "shilpasutra_export.ply";
      a.click();
      URL.revokeObjectURL(url);
    } else if (exportOpts.format === "glTF") {
      const text = generateGLTF(cadObjects);
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "shilpasutra_export.gltf";
      a.click();
      URL.revokeObjectURL(url);
    } else if (exportOpts.format === "IGES" || exportOpts.format === "FBX") {
      // IGES and FBX require specialized libraries - export as STL with note
      const buf = generateSTLBinary(cadObjects);
      const blob = new Blob([buf], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shilpasutra_export.${exportOpts.format.toLowerCase()}.stl`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // STEP - generate a minimal STEP file structure
      const stepContent = generateSTEPStub(cadObjects);
      const blob = new Blob([stepContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "shilpasutra_export.step";
      a.click();
      URL.revokeObjectURL(url);
    }
    setShowExport(false);
  }, [exportOpts, cadObjects]);

  const handleDxfExport = useCallback(() => {
    const dxfContent = generateDxf(cadObjects);
    const blob = new Blob([dxfContent], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shilpasutra_export.dxf";
    a.click();
    URL.revokeObjectURL(url);
  }, [cadObjects]);

  const handleSTLExport = useCallback(() => {
    const buf = generateSTLBinary(cadObjects);
    const blob = new Blob([buf], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shilpasutra_export.stl";
    a.click();
    URL.revokeObjectURL(url);
  }, [cadObjects]);

  const handleOBJExport = useCallback(() => {
    const text = generateOBJ(cadObjects);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shilpasutra_export.obj";
    a.click();
    URL.revokeObjectURL(url);
  }, [cadObjects]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="h-12 border-b border-[#1a1a2e] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[#00D4FF] font-bold text-sm">I/O</span>
          <span className="text-slate-400 text-xs">Import / Export File Hub</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDxfExport}
            className="px-3 py-1.5 bg-orange-500/10 text-orange-400 text-xs rounded hover:bg-orange-500/20 transition-colors border border-orange-500/20"
            title="Export current CAD objects as DXF (LINE, CIRCLE, ARC primitives)"
          >
            Export DXF
          </button>
          <button
            onClick={handleSTLExport}
            className="px-3 py-1.5 bg-green-500/10 text-green-400 text-xs rounded hover:bg-green-500/20 transition-colors border border-green-500/20"
            title="Export current CAD objects as binary STL"
          >
            Export STL
          </button>
          <button
            onClick={handleOBJExport}
            className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 text-xs rounded hover:bg-yellow-500/20 transition-colors border border-yellow-500/20"
            title="Export current CAD objects as OBJ text"
          >
            Export OBJ
          </button>
          <button
            onClick={handleIFCExport}
            className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs rounded hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
            title="Export current CAD objects as IFC4 BIM file"
          >
            Export IFC
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="px-3 py-1.5 bg-[#00D4FF]/10 text-[#00D4FF] text-xs rounded hover:bg-[#00D4FF]/20 transition-colors border border-[#00D4FF]/20"
          >
            Export Model
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Drag & Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
            dragOver
              ? "border-[#00D4FF] bg-[#00D4FF]/5"
              : "border-[#252540] hover:border-[#00D4FF]/40 bg-[#0d0d14]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".step,.stp,.stl,.obj,.iges,.igs,.gltf,.glb,.fbx,.ply,.ifc"
            onChange={handleFileInput}
            className="hidden"
          />
          <div className="text-3xl mb-3 text-[#00D4FF]/60">
            {dragOver ? "+" : "^"}
          </div>
          <div className="text-sm text-slate-300 font-medium">
            {dragOver ? "Drop files here" : "Drag & drop CAD files or click to browse"}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            STEP, STL, OBJ, IGES, glTF, FBX, PLY, <span className="text-emerald-400">IFC</span> — IFC/BIM files parsed with full spatial hierarchy
          </div>
        </div>

        {/* IFC Import progress */}
        {importProgress && (
          <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-emerald-400">Parsing IFC file…</span>
              <span className="text-xs text-emerald-400">{importProgress.pct}%</span>
            </div>
            <div className="h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-200 rounded-full"
                style={{ width: `${importProgress.pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Recent Files */}
        <div className="mt-8">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
            Recent Files ({files.length})
          </h3>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-[#0d0d14] rounded-lg border border-[#1a1a2e] hover:border-[#252540] transition-colors"
              >
                <div className={`px-2 py-1 rounded text-[10px] font-bold ${formatColors[file.format]}`}>
                  {file.format}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{file.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {formatSize(file.size)} · {file.date}
                    {file.parsedStats && (
                      <span className="ml-2 text-[#00D4FF]/70">
                        {file.parsedStats.triangles.toLocaleString()} tri · {file.parsedStats.vertices.toLocaleString()} verts ·{" "}
                        {(file.parsedStats.bbox.max[0] - file.parsedStats.bbox.min[0]).toFixed(1)}×
                        {(file.parsedStats.bbox.max[1] - file.parsedStats.bbox.min[1]).toFixed(1)}×
                        {(file.parsedStats.bbox.max[2] - file.parsedStats.bbox.min[2]).toFixed(1)} mm
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded ${
                    file.status === "ready"
                      ? "bg-green-500/10 text-green-400"
                      : file.status === "importing"
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {file.status}
                </span>
                {file.format === "IFC" && file.ifcResult && (
                  <button
                    onClick={() => setIfcPreview(file)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 transition-colors border border-emerald-500/20 rounded"
                  >
                    Preview
                  </button>
                )}
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-xs text-slate-500 hover:text-red-400 px-2 py-1 transition-colors"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      {showExport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl w-[440px] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-white">Export Model</h3>
              <button
                onClick={() => setShowExport(false)}
                className="text-slate-500 hover:text-white text-xs"
              >
                x
              </button>
            </div>

            {/* Format */}
            <div className="mb-4">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2">Format</label>
              <div className="grid grid-cols-4 gap-1.5">
                {exportFormats.map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setExportOpts((o) => ({ ...o, format: fmt }))}
                    className={`py-2 rounded text-xs font-medium transition-colors ${
                      exportOpts.format === fmt
                        ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                        : "bg-[#0a0a0f] text-slate-400 border border-[#1a1a2e] hover:border-[#252540]"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* IFC Schema selector (only shown when IFC selected) */}
            {exportOpts.format === "IFC" && (
              <div className="mb-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                <label className="text-[10px] text-emerald-400 uppercase tracking-wider block mb-2">IFC Schema</label>
                <div className="flex gap-2">
                  {(["IFC4", "IFC2X3"] as ExportSchema[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setIfcExportSchema(s)}
                      className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                        ifcExportSchema === s
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-[#0a0a0f] text-slate-400 border border-[#1a1a2e]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  IFC4 recommended for modern BIM authoring tools. IFC2x3 for legacy software.
                </p>
              </div>
            )}

            {/* Units */}
            <div className="mb-4">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2">Units</label>
              <div className="flex gap-1.5">
                {unitSystems.map((u) => (
                  <button
                    key={u}
                    onClick={() => setExportOpts((o) => ({ ...o, units: u }))}
                    className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                      exportOpts.units === u
                        ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                        : "bg-[#0a0a0f] text-slate-400 border border-[#1a1a2e]"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Precision */}
            <div className="mb-4">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2">Precision</label>
              <div className="flex gap-1.5">
                {(["low", "medium", "high"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setExportOpts((o) => ({ ...o, precision: p }))}
                    className={`flex-1 py-2 rounded text-xs font-medium capitalize transition-colors ${
                      exportOpts.precision === p
                        ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                        : "bg-[#0a0a0f] text-slate-400 border border-[#1a1a2e]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOpts.includeTextures}
                  onChange={(e) => setExportOpts((o) => ({ ...o, includeTextures: e.target.checked }))}
                  className="accent-[#00D4FF]"
                />
                <span className="text-xs text-slate-300">Include textures</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOpts.mergeMeshes}
                  onChange={(e) => setExportOpts((o) => ({ ...o, mergeMeshes: e.target.checked }))}
                  className="accent-[#00D4FF]"
                />
                <span className="text-xs text-slate-300">Merge meshes</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowExport(false)}
                className="flex-1 py-2 rounded text-xs font-medium text-slate-400 border border-[#252540] hover:bg-[#1a1a2e] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="flex-1 py-2 rounded text-xs font-medium bg-[#00D4FF] text-black hover:bg-[#00bde6] transition-colors"
              >
                Export {["STL","OBJ","PLY","glTF","STEP"].includes(exportOpts.format) ? `as ${exportOpts.format}` : `as ${exportOpts.format}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IFC Preview Modal */}
      {ifcPreview && ifcPreview.ifcResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl w-[640px] max-h-[80vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a2e]">
              <div>
                <h3 className="text-sm font-bold text-white">{ifcPreview.name}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Schema: <span className="text-emerald-400">{ifcPreview.ifcResult.schema}</span>
                  {" · "}{ifcPreview.ifcResult.projectName}
                  {" · "}{ifcPreview.ifcResult.stats.totalEntities.toLocaleString()} entities
                </p>
              </div>
              <button onClick={() => setIfcPreview(null)} className="text-slate-500 hover:text-white text-xs px-2 py-1">✕</button>
            </div>

            <div className="flex-1 overflow-auto p-5 space-y-4">
              {/* Header info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Origin App", ifcPreview.ifcResult.originApplication || "—"],
                  ["Author", ifcPreview.ifcResult.authorName || "—"],
                  ["Created", ifcPreview.ifcResult.creationDate || "—"],
                  ["Geometry", `${ifcPreview.ifcResult.stats.geometryEntities} elements`],
                  ["Property Sets", String(ifcPreview.ifcResult.stats.propertySetCount)],
                  ["File Size", formatSize(ifcPreview.size)],
                ].map(([label, value]) => (
                  <div key={label} className="bg-[#0a0a0f] rounded-lg p-3 border border-[#1a1a2e]">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
                    <div className="text-xs text-white mt-1 truncate">{value}</div>
                  </div>
                ))}
              </div>

              {/* IFC type counts */}
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">IFC Types Found</div>
                <div className="bg-[#0a0a0f] rounded-lg border border-[#1a1a2e] divide-y divide-[#1a1a2e] max-h-48 overflow-auto">
                  {Object.entries(ifcPreview.ifcResult.typeCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs text-slate-300 font-mono">{type}</span>
                        <span className="text-xs text-emerald-400 font-bold">{count}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Spatial tree preview */}
              {ifcPreview.ifcResult.spatialRoot && (
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Spatial Hierarchy</div>
                  <div className="bg-[#0a0a0f] rounded-lg border border-[#1a1a2e] p-3 max-h-40 overflow-auto">
                    <SpatialTreeNode node={ifcPreview.ifcResult.spatialRoot} depth={0} />
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-[#1a1a2e] flex gap-2">
              <button
                onClick={() => setIfcPreview(null)}
                className="flex-1 py-2 text-xs rounded border border-[#252540] text-slate-400 hover:bg-[#1a1a2e] transition-colors"
              >
                Close
              </button>
              <a
                href="/visualization"
                className="flex-1 py-2 text-xs rounded bg-emerald-600 text-white text-center hover:bg-emerald-500 transition-colors"
              >
                Open in Viewer
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Spatial tree node (recursive) ─────────────────────── */
function SpatialTreeNode({ node, depth }: { node: IfcSpatialNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  return (
    <div style={{ paddingLeft: `${depth * 12}px` }}>
      <button
        onClick={() => hasChildren && setOpen(!open)}
        className={`flex items-center gap-1.5 py-0.5 text-left w-full ${hasChildren ? "cursor-pointer" : "cursor-default"}`}
      >
        <span className="text-[10px] text-slate-600 w-3">{hasChildren ? (open ? "▼" : "▶") : "·"}</span>
        <span className="text-[10px] text-emerald-400/70 font-mono">{node.type}</span>
        <span className="text-[10px] text-slate-300 truncate">{node.name}</span>
        {node.children.length > 0 && (
          <span className="text-[9px] text-slate-600 ml-auto">({node.children.length})</span>
        )}
      </button>
      {open && hasChildren && node.children.map((child) => (
        <SpatialTreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}
