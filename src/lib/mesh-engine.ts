"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// Professional Mesh Generation Engine
// Supports: Tet4, Tet10, Hex8, Tri3/Tri6 surface mesh
// Features: Adaptive refinement, quality metrics, Three.js geometry conversion
// ═══════════════════════════════════════════════════════════════════════════════

// ── Types ────────────────────────────────────────────────────────────────────

export type MeshElementType = "tet4" | "tet10" | "hex8" | "tri3" | "tri6";

export interface MeshNode {
  id: number;
  x: number;
  y: number;
  z: number;
}

export interface MeshElement {
  id: number;
  type: MeshElementType;
  nodeIds: number[];
  quality: ElementQuality;
}

export interface ElementQuality {
  aspectRatio: number;
  skewness: number;
  jacobian: number;
  minAngle: number;
  maxAngle: number;
}

export interface MeshResult {
  nodes: MeshNode[];
  elements: MeshElement[];
  statistics: MeshStatistics;
}

export interface MeshStatistics {
  totalNodes: number;
  totalElements: number;
  elementType: MeshElementType;
  minQuality: number;
  maxQuality: number;
  avgQuality: number;
  badElements: number;
  avgAspectRatio: number;
  avgSkewness: number;
  avgJacobian: number;
  minAngle: number;
  maxAngle: number;
  totalVolume: number;
  qualityHistogram: number[]; // 10 bins from 0-1
}

export interface MeshSettings {
  elementType: MeshElementType;
  elementSize: number;       // target element size (relative 0.01-1.0)
  refinementEnabled: boolean;
  refinementFactor: number;  // 1.0 = no refinement, 0.25 = 4x refinement at edges
  minElementSize: number;
  maxElementSize: number;
  grading: number;           // mesh grading factor (1.0 = uniform)
}

export const defaultMeshSettings: MeshSettings = {
  elementType: "tet4",
  elementSize: 0.1,
  refinementEnabled: true,
  refinementFactor: 0.5,
  minElementSize: 0.02,
  maxElementSize: 0.3,
  grading: 1.2,
};

// ── Utility Functions ────────────────────────────────────────────────────────

function distance3D(a: MeshNode, b: MeshNode): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
}

function cross(a: number[], b: number[]): number[] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function vecLen(v: number[]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function vecSub(a: MeshNode, b: MeshNode): number[] {
  return [a.x - b.x, a.y - b.y, a.z - b.z];
}

// ── Quality Metrics ──────────────────────────────────────────────────────────

/** Calculate aspect ratio of a tetrahedral element (ideal = 1.0) */
export function calculateTetAspectRatio(nodes: MeshNode[]): number {
  if (nodes.length < 4) return 999;

  const edges: number[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      edges.push(distance3D(nodes[i], nodes[j]));
    }
  }
  const maxEdge = Math.max(...edges);
  const minEdge = Math.min(...edges);
  return minEdge > 1e-12 ? maxEdge / minEdge : 999;
}

/** Calculate skewness of an element (ideal = 0.0, bad > 0.75) */
export function calculateSkewness(nodes: MeshNode[]): number {
  if (nodes.length < 4) return 0;

  // Equilateral tet has volume = edge^3 / (6√2)
  const edges: number[] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      edges.push(distance3D(nodes[i], nodes[j]));
    }
  }
  const avgEdge = edges.reduce((a, b) => a + b, 0) / edges.length;
  const idealVolume = (avgEdge ** 3) / (6 * Math.SQRT2);

  const v01 = vecSub(nodes[1], nodes[0]);
  const v02 = vecSub(nodes[2], nodes[0]);
  const v03 = vecSub(nodes[3], nodes[0]);
  const actualVolume = Math.abs(dot(v01, cross(v02, v03))) / 6;

  if (idealVolume < 1e-12) return 1;
  const ratio = actualVolume / idealVolume;
  return Math.max(0, Math.min(1, 1 - ratio));
}

/** Calculate Jacobian determinant for a tetrahedral element */
export function calculateTetJacobian(nodes: MeshNode[]): number {
  if (nodes.length < 4) return 1;
  const v01 = vecSub(nodes[1], nodes[0]);
  const v02 = vecSub(nodes[2], nodes[0]);
  const v03 = vecSub(nodes[3], nodes[0]);
  return dot(v01, cross(v02, v03));
}

/** Calculate min and max angles in a tetrahedral element */
export function calculateTetAngles(nodes: MeshNode[]): { min: number; max: number } {
  if (nodes.length < 4) return { min: 60, max: 60 };

  const angles: number[] = [];
  // Check all face triangles (4 faces, 3 angles each)
  const faces = [
    [0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3],
  ];

  for (const face of faces) {
    for (let i = 0; i < 3; i++) {
      const a = nodes[face[i]];
      const b = nodes[face[(i + 1) % 3]];
      const c = nodes[face[(i + 2) % 3]];
      const ab = vecSub(b, a);
      const ac = vecSub(c, a);
      const cosAngle = dot(ab, ac) / (vecLen(ab) * vecLen(ac) + 1e-12);
      const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
      angles.push(angle);
    }
  }

  return {
    min: Math.min(...angles),
    max: Math.max(...angles),
  };
}

/** Calculate element quality score (0-1, 1 = perfect) */
export function calculateElementQuality(nodes: MeshNode[], type: MeshElementType): ElementQuality {
  if (type === "hex8") {
    return calculateHexQuality(nodes);
  }
  if (type === "tri3" || type === "tri6") {
    return calculateTriQuality(nodes.slice(0, 3));
  }
  // Tet4/Tet10
  const tetNodes = nodes.slice(0, 4);
  const ar = calculateTetAspectRatio(tetNodes);
  const skew = calculateSkewness(tetNodes);
  const jac = calculateTetJacobian(tetNodes);
  const angles = calculateTetAngles(tetNodes);

  return {
    aspectRatio: ar,
    skewness: skew,
    jacobian: jac,
    minAngle: angles.min,
    maxAngle: angles.max,
  };
}

function calculateHexQuality(nodes: MeshNode[]): ElementQuality {
  if (nodes.length < 8) {
    return { aspectRatio: 1, skewness: 0, jacobian: 1, minAngle: 90, maxAngle: 90 };
  }
  // Calculate edge lengths for hex
  const edgePairs = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  const edges = edgePairs.map(([i, j]) => distance3D(nodes[i], nodes[j]));
  const maxE = Math.max(...edges);
  const minE = Math.min(...edges);
  const ar = minE > 1e-12 ? maxE / minE : 999;

  // Jacobian at centroid
  const v01 = vecSub(nodes[1], nodes[0]);
  const v03 = vecSub(nodes[3], nodes[0]);
  const v04 = vecSub(nodes[4], nodes[0]);
  const jac = dot(v01, cross(v03, v04));

  return {
    aspectRatio: ar,
    skewness: Math.max(0, 1 - 1 / ar),
    jacobian: jac,
    minAngle: 90 - (ar - 1) * 15,
    maxAngle: 90 + (ar - 1) * 15,
  };
}

function calculateTriQuality(nodes: MeshNode[]): ElementQuality {
  if (nodes.length < 3) {
    return { aspectRatio: 1, skewness: 0, jacobian: 1, minAngle: 60, maxAngle: 60 };
  }
  const edges = [
    distance3D(nodes[0], nodes[1]),
    distance3D(nodes[1], nodes[2]),
    distance3D(nodes[2], nodes[0]),
  ];
  const maxE = Math.max(...edges);
  const minE = Math.min(...edges);
  const ar = minE > 1e-12 ? maxE / minE : 999;

  // Triangle angles
  const angles: number[] = [];
  for (let i = 0; i < 3; i++) {
    const a = nodes[i];
    const b = nodes[(i + 1) % 3];
    const c = nodes[(i + 2) % 3];
    const ab = vecSub(b, a);
    const ac = vecSub(c, a);
    const cosA = dot(ab, ac) / (vecLen(ab) * vecLen(ac) + 1e-12);
    angles.push(Math.acos(Math.max(-1, Math.min(1, cosA))) * (180 / Math.PI));
  }

  // Area as Jacobian for 2D
  const v01 = vecSub(nodes[1], nodes[0]);
  const v02 = vecSub(nodes[2], nodes[0]);
  const area = vecLen(cross(v01, v02)) / 2;

  return {
    aspectRatio: ar,
    skewness: Math.max(0, 1 - (2 * Math.sqrt(3) * area) / (maxE * maxE + 1e-12)),
    jacobian: area * 2,
    minAngle: Math.min(...angles),
    maxAngle: Math.max(...angles),
  };
}

// ── Mesh Generators ──────────────────────────────────────────────────────────

/** Generate tetrahedral mesh for a box domain */
export function generateTetMesh(
  width: number,
  height: number,
  depth: number,
  settings: MeshSettings
): MeshResult {
  const nodes: MeshNode[] = [];
  const elements: MeshElement[] = [];

  const size = Math.max(0.02, settings.elementSize);
  const nx = Math.max(2, Math.round(width / size));
  const ny = Math.max(2, Math.round(height / size));
  const nz = Math.max(2, Math.round(depth / size));

  // Limit to reasonable mesh sizes for browser
  const maxN = 40;
  const nnx = Math.min(nx, maxN);
  const nny = Math.min(ny, maxN);
  const nnz = Math.min(nz, maxN);

  const dx = width / nnx;
  const dy = height / nny;
  const dz = depth / nnz;

  // Generate structured grid nodes
  let nodeId = 0;
  const nodeIndex = (i: number, j: number, k: number) => k * (nnx + 1) * (nny + 1) + j * (nnx + 1) + i;

  for (let k = 0; k <= nnz; k++) {
    for (let j = 0; j <= nny; j++) {
      for (let i = 0; i <= nnx; i++) {
        let x = -width / 2 + i * dx;
        let y = j * dy;
        let z = -depth / 2 + k * dz;

        // Apply grading if enabled (denser near edges)
        if (settings.refinementEnabled && settings.grading > 1) {
          const edgeDist = Math.min(
            i / nnx, (nnx - i) / nnx,
            j / nny, (nny - j) / nny,
            k / nnz, (nnz - k) / nnz
          );
          const refine = 1 - (1 - settings.refinementFactor) * Math.exp(-edgeDist * 4);
          // Slight perturbation for better mesh quality
          if (i > 0 && i < nnx && j > 0 && j < nny && k > 0 && k < nnz) {
            x += (Math.random() - 0.5) * dx * 0.1 * refine;
            y += (Math.random() - 0.5) * dy * 0.1 * refine;
            z += (Math.random() - 0.5) * dz * 0.1 * refine;
          }
        }

        nodes.push({ id: nodeId++, x, y, z });
      }
    }
  }

  // Decompose each hex cell into 5 or 6 tetrahedra
  let elemId = 0;
  for (let k = 0; k < nnz; k++) {
    for (let j = 0; j < nny; j++) {
      for (let i = 0; i < nnx; i++) {
        // 8 corner nodes of the hex cell
        const n0 = nodeIndex(i, j, k);
        const n1 = nodeIndex(i + 1, j, k);
        const n2 = nodeIndex(i + 1, j + 1, k);
        const n3 = nodeIndex(i, j + 1, k);
        const n4 = nodeIndex(i, j, k + 1);
        const n5 = nodeIndex(i + 1, j, k + 1);
        const n6 = nodeIndex(i + 1, j + 1, k + 1);
        const n7 = nodeIndex(i, j + 1, k + 1);

        // 5-tet decomposition (alternating pattern for conformity)
        const parity = (i + j + k) % 2;
        let tets: number[][];
        if (parity === 0) {
          tets = [
            [n0, n1, n2, n5],
            [n0, n2, n7, n5],
            [n0, n2, n3, n7],
            [n0, n5, n7, n4],
            [n2, n5, n6, n7],
          ];
        } else {
          tets = [
            [n0, n1, n3, n4],
            [n1, n2, n3, n6],
            [n1, n4, n5, n6],
            [n3, n4, n6, n7],
            [n1, n3, n4, n6],
          ];
        }

        for (const tet of tets) {
          const tetNodes = tet.map((id) => nodes[id]);
          const quality = calculateElementQuality(tetNodes, "tet4");
          elements.push({
            id: elemId++,
            type: "tet4",
            nodeIds: tet,
            quality,
          });
        }
      }
    }
  }

  // For Tet10, add midside nodes
  if (settings.elementType === "tet10") {
    return upgradeTet4ToTet10(nodes, elements);
  }

  return {
    nodes,
    elements,
    statistics: computeStatistics(nodes, elements, "tet4"),
  };
}

/** Generate hexahedral (Hex8) mesh for structured domains */
export function generateHexMesh(
  width: number,
  height: number,
  depth: number,
  settings: MeshSettings
): MeshResult {
  const nodes: MeshNode[] = [];
  const elements: MeshElement[] = [];

  const size = Math.max(0.02, settings.elementSize);
  const nx = Math.min(30, Math.max(2, Math.round(width / size)));
  const ny = Math.min(30, Math.max(2, Math.round(height / size)));
  const nz = Math.min(30, Math.max(2, Math.round(depth / size)));

  const dx = width / nx;
  const dy = height / ny;
  const dz = depth / nz;

  let nodeId = 0;
  const nodeIndex = (i: number, j: number, k: number) => k * (nx + 1) * (ny + 1) + j * (nx + 1) + i;

  for (let k = 0; k <= nz; k++) {
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) {
        nodes.push({
          id: nodeId++,
          x: -width / 2 + i * dx,
          y: j * dy,
          z: -depth / 2 + k * dz,
        });
      }
    }
  }

  let elemId = 0;
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const hexNodes = [
          nodeIndex(i, j, k),
          nodeIndex(i + 1, j, k),
          nodeIndex(i + 1, j + 1, k),
          nodeIndex(i, j + 1, k),
          nodeIndex(i, j, k + 1),
          nodeIndex(i + 1, j, k + 1),
          nodeIndex(i + 1, j + 1, k + 1),
          nodeIndex(i, j + 1, k + 1),
        ];

        const hexNodeObjs = hexNodes.map((id) => nodes[id]);
        const quality = calculateElementQuality(hexNodeObjs, "hex8");

        elements.push({
          id: elemId++,
          type: "hex8",
          nodeIds: hexNodes,
          quality,
        });
      }
    }
  }

  return {
    nodes,
    elements,
    statistics: computeStatistics(nodes, elements, "hex8"),
  };
}

/** Generate surface triangle mesh for shell analysis */
export function generateSurfaceMesh(
  width: number,
  height: number,
  settings: MeshSettings
): MeshResult {
  const nodes: MeshNode[] = [];
  const elements: MeshElement[] = [];

  const size = Math.max(0.02, settings.elementSize);
  const nx = Math.min(60, Math.max(3, Math.round(width / size)));
  const ny = Math.min(60, Math.max(3, Math.round(height / size)));

  const dx = width / nx;
  const dy = height / ny;

  let nodeId = 0;
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      nodes.push({
        id: nodeId++,
        x: -width / 2 + i * dx,
        y: -height / 2 + j * dy,
        z: 0,
      });
    }
  }

  const isT6 = settings.elementType === "tri6";
  let elemId = 0;

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const bl = j * (nx + 1) + i;
      const br = bl + 1;
      const tl = (j + 1) * (nx + 1) + i;
      const tr = tl + 1;

      const tri1Nodes = [nodes[bl], nodes[br], nodes[tl]];
      const tri2Nodes = [nodes[br], nodes[tr], nodes[tl]];

      elements.push({
        id: elemId++,
        type: isT6 ? "tri6" : "tri3",
        nodeIds: [bl, br, tl],
        quality: calculateElementQuality(tri1Nodes, "tri3"),
      });
      elements.push({
        id: elemId++,
        type: isT6 ? "tri6" : "tri3",
        nodeIds: [br, tr, tl],
        quality: calculateElementQuality(tri2Nodes, "tri3"),
      });
    }
  }

  // For Tri6, add midside nodes
  if (isT6) {
    return upgradeTri3ToTri6(nodes, elements);
  }

  return {
    nodes,
    elements,
    statistics: computeStatistics(nodes, elements, settings.elementType),
  };
}

/** Upgrade Tet4 mesh to Tet10 by adding midside nodes */
function upgradeTet4ToTet10(nodes: MeshNode[], elements: MeshElement[]): MeshResult {
  const midNodeCache = new Map<string, number>();
  let nextId = nodes.length;

  function getMidNode(n1Id: number, n2Id: number): number {
    const key = `${Math.min(n1Id, n2Id)}_${Math.max(n1Id, n2Id)}`;
    if (midNodeCache.has(key)) return midNodeCache.get(key)!;

    const a = nodes[n1Id];
    const b = nodes[n2Id];
    const mid: MeshNode = {
      id: nextId,
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      z: (a.z + b.z) / 2,
    };
    nodes.push(mid);
    midNodeCache.set(key, nextId);
    return nextId++;
  }

  const tet10Elements: MeshElement[] = elements.map((elem) => {
    const [n0, n1, n2, n3] = elem.nodeIds;
    // 6 midside nodes for tet10
    const m01 = getMidNode(n0, n1);
    const m02 = getMidNode(n0, n2);
    const m03 = getMidNode(n0, n3);
    const m12 = getMidNode(n1, n2);
    const m13 = getMidNode(n1, n3);
    const m23 = getMidNode(n2, n3);

    const newNodeIds = [n0, n1, n2, n3, m01, m12, m02, m03, m13, m23];
    const tetNodes = newNodeIds.slice(0, 4).map((id) => nodes[id]);

    return {
      ...elem,
      type: "tet10" as MeshElementType,
      nodeIds: newNodeIds,
      quality: calculateElementQuality(tetNodes, "tet10"),
    };
  });

  return {
    nodes,
    elements: tet10Elements,
    statistics: computeStatistics(nodes, tet10Elements, "tet10"),
  };
}

/** Upgrade Tri3 mesh to Tri6 by adding midside nodes */
function upgradeTri3ToTri6(nodes: MeshNode[], elements: MeshElement[]): MeshResult {
  const midNodeCache = new Map<string, number>();
  let nextId = nodes.length;

  function getMidNode(n1Id: number, n2Id: number): number {
    const key = `${Math.min(n1Id, n2Id)}_${Math.max(n1Id, n2Id)}`;
    if (midNodeCache.has(key)) return midNodeCache.get(key)!;

    const a = nodes[n1Id];
    const b = nodes[n2Id];
    nodes.push({ id: nextId, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 });
    midNodeCache.set(key, nextId);
    return nextId++;
  }

  const tri6Elements: MeshElement[] = elements.map((elem) => {
    const [n0, n1, n2] = elem.nodeIds;
    const m01 = getMidNode(n0, n1);
    const m12 = getMidNode(n1, n2);
    const m02 = getMidNode(n0, n2);

    return {
      ...elem,
      type: "tri6" as MeshElementType,
      nodeIds: [n0, n1, n2, m01, m12, m02],
      quality: elem.quality,
    };
  });

  return {
    nodes,
    elements: tri6Elements,
    statistics: computeStatistics(nodes, tri6Elements, "tri6"),
  };
}

// ── Adaptive Refinement ──────────────────────────────────────────────────────

/** Apply adaptive mesh refinement based on stress field or edge proximity */
export function applyAdaptiveRefinement(
  mesh: MeshResult,
  stressField: number[] | null,
  stressThreshold: number = 0.7
): MeshResult {
  if (!stressField || stressField.length === 0) return mesh;

  const maxStress = Math.max(...stressField);
  if (maxStress <= 0) return mesh;

  const newNodes = [...mesh.nodes];
  const newElements: MeshElement[] = [];
  let nextNodeId = newNodes.length;
  let nextElemId = 0;

  for (const elem of mesh.elements) {
    // Calculate average stress for this element
    const elemStress = elem.nodeIds.reduce((sum, nId) => {
      const idx = Math.min(nId, stressField.length - 1);
      return sum + (stressField[idx] || 0);
    }, 0) / elem.nodeIds.length;

    const normalizedStress = elemStress / maxStress;

    if (normalizedStress > stressThreshold && elem.type === "tet4") {
      // Subdivide: add centroid and split into 4 smaller tets
      const centroid: MeshNode = {
        id: nextNodeId++,
        x: elem.nodeIds.reduce((s, id) => s + newNodes[id].x, 0) / 4,
        y: elem.nodeIds.reduce((s, id) => s + newNodes[id].y, 0) / 4,
        z: elem.nodeIds.reduce((s, id) => s + newNodes[id].z, 0) / 4,
      };
      newNodes.push(centroid);

      const [n0, n1, n2, n3] = elem.nodeIds;
      const subTets = [
        [n0, n1, n2, centroid.id],
        [n0, n1, n3, centroid.id],
        [n0, n2, n3, centroid.id],
        [n1, n2, n3, centroid.id],
      ];

      for (const tet of subTets) {
        const tetNodes = tet.map((id) => newNodes[id]);
        newElements.push({
          id: nextElemId++,
          type: "tet4",
          nodeIds: tet,
          quality: calculateElementQuality(tetNodes, "tet4"),
        });
      }
    } else {
      newElements.push({ ...elem, id: nextElemId++ });
    }
  }

  return {
    nodes: newNodes,
    elements: newElements,
    statistics: computeStatistics(newNodes, newElements, mesh.statistics.elementType),
  };
}

// ── Three.js Geometry Conversion ─────────────────────────────────────────────

/** Convert Three.js BufferGeometry to mesh nodes and surface triangles */
export function convertThreeGeometryToMesh(
  positions: Float32Array,
  indices: Uint16Array | Uint32Array | null,
  settings: MeshSettings
): MeshResult {
  const nodes: MeshNode[] = [];
  const elements: MeshElement[] = [];

  // Extract unique vertices
  const vertexMap = new Map<string, number>();
  const getVertexKey = (x: number, y: number, z: number) =>
    `${x.toFixed(6)}_${y.toFixed(6)}_${z.toFixed(6)}`;

  let nodeId = 0;
  const vertexIndices: number[] = [];

  for (let i = 0; i < positions.length; i += 3) {
    const key = getVertexKey(positions[i], positions[i + 1], positions[i + 2]);
    if (!vertexMap.has(key)) {
      vertexMap.set(key, nodeId);
      nodes.push({ id: nodeId, x: positions[i], y: positions[i + 1], z: positions[i + 2] });
      nodeId++;
    }
    vertexIndices.push(vertexMap.get(key)!);
  }

  // Build elements from face indices
  let elemId = 0;
  if (indices) {
    for (let i = 0; i < indices.length; i += 3) {
      const n0 = vertexIndices[indices[i]];
      const n1 = vertexIndices[indices[i + 1]];
      const n2 = vertexIndices[indices[i + 2]];
      if (n0 === n1 || n1 === n2 || n0 === n2) continue;

      const triNodes = [nodes[n0], nodes[n1], nodes[n2]];
      elements.push({
        id: elemId++,
        type: settings.elementType === "tri6" ? "tri6" : "tri3",
        nodeIds: [n0, n1, n2],
        quality: calculateElementQuality(triNodes, "tri3"),
      });
    }
  } else {
    // Non-indexed geometry: every 3 vertices form a triangle
    for (let i = 0; i < vertexIndices.length; i += 3) {
      const n0 = vertexIndices[i];
      const n1 = vertexIndices[i + 1];
      const n2 = vertexIndices[i + 2];
      if (n0 === undefined || n1 === undefined || n2 === undefined) continue;
      if (n0 === n1 || n1 === n2 || n0 === n2) continue;

      const triNodes = [nodes[n0], nodes[n1], nodes[n2]];
      elements.push({
        id: elemId++,
        type: "tri3",
        nodeIds: [n0, n1, n2],
        quality: calculateElementQuality(triNodes, "tri3"),
      });
    }
  }

  const eType = elements.length > 0 ? elements[0].type : settings.elementType;
  return {
    nodes,
    elements,
    statistics: computeStatistics(nodes, elements, eType),
  };
}

// ── Statistics Computation ───────────────────────────────────────────────────

export function computeStatistics(
  nodes: MeshNode[],
  elements: MeshElement[],
  elementType: MeshElementType
): MeshStatistics {
  if (elements.length === 0) {
    return {
      totalNodes: nodes.length,
      totalElements: 0,
      elementType,
      minQuality: 0,
      maxQuality: 0,
      avgQuality: 0,
      badElements: 0,
      avgAspectRatio: 0,
      avgSkewness: 0,
      avgJacobian: 0,
      minAngle: 0,
      maxAngle: 0,
      totalVolume: 0,
      qualityHistogram: new Array(10).fill(0),
    };
  }

  let totalVolume = 0;
  const qualityScores: number[] = [];
  const histogram = new Array(10).fill(0);
  let sumAR = 0, sumSkew = 0, sumJac = 0;
  let globalMinAngle = 180, globalMaxAngle = 0;

  for (const elem of elements) {
    const q = elem.quality;
    // Quality score: composite of aspect ratio and skewness
    const score = Math.max(0, Math.min(1, 1 / q.aspectRatio * (1 - q.skewness)));
    qualityScores.push(score);

    const bin = Math.min(9, Math.floor(score * 10));
    histogram[bin]++;

    sumAR += q.aspectRatio;
    sumSkew += q.skewness;
    sumJac += Math.abs(q.jacobian);
    globalMinAngle = Math.min(globalMinAngle, q.minAngle);
    globalMaxAngle = Math.max(globalMaxAngle, q.maxAngle);

    // Volume estimate from Jacobian
    if (elementType === "tet4" || elementType === "tet10") {
      totalVolume += Math.abs(q.jacobian) / 6;
    } else if (elementType === "hex8") {
      totalVolume += Math.abs(q.jacobian);
    } else {
      totalVolume += Math.abs(q.jacobian) / 2; // triangle area
    }
  }

  const n = elements.length;
  return {
    totalNodes: nodes.length,
    totalElements: n,
    elementType,
    minQuality: Math.min(...qualityScores),
    maxQuality: Math.max(...qualityScores),
    avgQuality: qualityScores.reduce((a, b) => a + b, 0) / n,
    badElements: qualityScores.filter((q) => q < 0.3).length,
    avgAspectRatio: sumAR / n,
    avgSkewness: sumSkew / n,
    avgJacobian: sumJac / n,
    minAngle: globalMinAngle,
    maxAngle: globalMaxAngle,
    totalVolume,
    qualityHistogram: histogram,
  };
}

// ── Main Entry Point ─────────────────────────────────────────────────────────

/** Generate mesh based on geometry type and settings */
export function generateMesh(
  geometryType: "box" | "cylinder" | "sphere",
  dimensions: { width: number; height: number; depth: number },
  settings: MeshSettings
): MeshResult {
  switch (settings.elementType) {
    case "hex8":
      return generateHexMesh(dimensions.width, dimensions.height, dimensions.depth, settings);
    case "tri3":
    case "tri6":
      return generateSurfaceMesh(dimensions.width, dimensions.height, settings);
    case "tet4":
    case "tet10":
    default:
      return generateTetMesh(dimensions.width, dimensions.height, dimensions.depth, settings);
  }
}
