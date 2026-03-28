// ============================================================================
// ShilpaSutra FEM Solver - 2D Plane Stress with CST Elements
// Constant Strain Triangle (CST) element formulation
// Global stiffness assembly, boundary conditions, Gaussian elimination
// Von Mises stress computation
// ============================================================================

// ── Types ───────────────────────────────────────────────────────────────────

export interface FEMNode {
  id: number;
  x: number;
  y: number;
}

export interface FEMElement {
  id: number;
  nodeIds: [number, number, number]; // CST triangle - 3 node IDs
}

export interface FEMMaterial {
  E: number;           // Young's modulus (Pa)
  nu: number;          // Poisson's ratio
  thickness: number;   // element thickness (m) for plane stress
  density: number;     // kg/m³
  yieldStrength: number; // Pa
}

export interface FEMBoundaryCondition {
  nodeId: number;
  type: "fixed" | "pinned" | "rollerX" | "rollerY";
}

export interface FEMLoad {
  nodeId: number;
  fx: number;  // force in x (N)
  fy: number;  // force in y (N)
}

export interface FEMElementResult {
  elementId: number;
  stressXX: number;
  stressYY: number;
  stressXY: number;
  vonMises: number;
  principalS1: number;
  principalS2: number;
  principalAngle: number; // radians
  strainXX: number;
  strainYY: number;
  strainXY: number;
}

export interface FEMNodeResult {
  nodeId: number;
  dispX: number;
  dispY: number;
  dispMag: number;
  vonMises: number; // averaged from adjacent elements
}

export interface FEMSolverResult {
  nodes: FEMNode[];
  elements: FEMElement[];
  nodeResults: FEMNodeResult[];
  elementResults: FEMElementResult[];
  displacements: Float32Array; // full displacement vector [u1,v1,u2,v2,...]
  maxDisplacement: number;
  maxVonMises: number;
  safetyFactor: number;
  solveTimeMs: number;
}

// ── CST Element Stiffness Matrix ────────────────────────────────────────────

function cstStiffness(
  n1: FEMNode, n2: FEMNode, n3: FEMNode,
  mat: FEMMaterial
): { Ke: number[][]; area: number } {
  const { E, nu, thickness: t } = mat;

  // Element area (2A)
  const x1 = n1.x, y1 = n1.y;
  const x2 = n2.x, y2 = n2.y;
  const x3 = n3.x, y3 = n3.y;

  const twoA = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
  const A = Math.abs(twoA) / 2;

  if (A < 1e-20) {
    // Degenerate element
    return { Ke: Array.from({ length: 6 }, () => new Array(6).fill(0)), area: 0 };
  }

  // Shape function derivatives (constant for CST)
  const b1 = (y2 - y3) / twoA;
  const b2 = (y3 - y1) / twoA;
  const b3 = (y1 - y2) / twoA;
  const c1 = (x3 - x2) / twoA;
  const c2 = (x1 - x3) / twoA;
  const c3 = (x2 - x1) / twoA;

  // B matrix (strain-displacement) [3x6]
  const B = [
    [b1, 0, b2, 0, b3, 0],
    [0, c1, 0, c2, 0, c3],
    [c1, b1, c2, b2, c3, b3],
  ];

  // D matrix (plane stress constitutive)
  const coeff = E / (1 - nu * nu);
  const D = [
    [coeff, coeff * nu, 0],
    [coeff * nu, coeff, 0],
    [0, 0, coeff * (1 - nu) / 2],
  ];

  // Ke = t * A * B^T * D * B
  // DB = D * B [3x6]
  const DB: number[][] = [[], [], []];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 6; j++) {
      DB[i][j] = 0;
      for (let k = 0; k < 3; k++) {
        DB[i][j] += D[i][k] * B[k][j];
      }
    }
  }

  // Ke = t * A * B^T * DB [6x6]
  const Ke: number[][] = Array.from({ length: 6 }, () => new Array(6).fill(0));
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      for (let k = 0; k < 3; k++) {
        Ke[i][j] += B[k][i] * DB[k][j];
      }
      Ke[i][j] *= t * A;
    }
  }

  return { Ke, area: A };
}

// ── Global Stiffness Assembly ───────────────────────────────────────────────

function assembleGlobalStiffness(
  nodes: FEMNode[],
  elements: FEMElement[],
  mat: FEMMaterial
): { K: Float64Array; ndof: number; areas: number[] } {
  const ndof = nodes.length * 2;
  const K = new Float64Array(ndof * ndof);
  const areas: number[] = [];

  const nodeMap = new Map<number, FEMNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  for (const elem of elements) {
    const n1 = nodeMap.get(elem.nodeIds[0])!;
    const n2 = nodeMap.get(elem.nodeIds[1])!;
    const n3 = nodeMap.get(elem.nodeIds[2])!;
    if (!n1 || !n2 || !n3) { areas.push(0); continue; }

    const { Ke, area } = cstStiffness(n1, n2, n3, mat);
    areas.push(area);

    // DOF mapping: node i -> dofs [2*i, 2*i+1]
    const dofs = [
      elem.nodeIds[0] * 2, elem.nodeIds[0] * 2 + 1,
      elem.nodeIds[1] * 2, elem.nodeIds[1] * 2 + 1,
      elem.nodeIds[2] * 2, elem.nodeIds[2] * 2 + 1,
    ];

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        K[dofs[i] * ndof + dofs[j]] += Ke[i][j];
      }
    }
  }

  return { K, ndof, areas };
}

// ── Apply Boundary Conditions ───────────────────────────────────────────────

function applyBCs(
  K: Float64Array,
  F: Float64Array,
  ndof: number,
  bcs: FEMBoundaryCondition[]
): Set<number> {
  const fixedDofs = new Set<number>();

  for (const bc of bcs) {
    switch (bc.type) {
      case "fixed":
        fixedDofs.add(bc.nodeId * 2);
        fixedDofs.add(bc.nodeId * 2 + 1);
        break;
      case "pinned":
        fixedDofs.add(bc.nodeId * 2);
        fixedDofs.add(bc.nodeId * 2 + 1);
        break;
      case "rollerX":
        fixedDofs.add(bc.nodeId * 2 + 1); // fix Y
        break;
      case "rollerY":
        fixedDofs.add(bc.nodeId * 2); // fix X
        break;
    }
  }

  // Penalty method: set large value on diagonal for fixed DOFs
  const penalty = 1e30;
  Array.from(fixedDofs).forEach(dof => {
    for (let j = 0; j < ndof; j++) {
      K[dof * ndof + j] = 0;
      K[j * ndof + dof] = 0;
    }
    K[dof * ndof + dof] = penalty;
    F[dof] = 0;
  });

  return fixedDofs;
}

// ── Gaussian Elimination with Partial Pivoting ──────────────────────────────

function solveLinearSystem(K: Float64Array, F: Float64Array, n: number): Float64Array {
  // Augmented matrix: work in-place on K and F copies
  const A = new Float64Array(K);
  const b = new Float64Array(F);

  // Forward elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxVal = Math.abs(A[col * n + col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(A[row * n + col]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = row;
      }
    }

    // Swap rows
    if (maxRow !== col) {
      for (let j = col; j < n; j++) {
        const tmp = A[col * n + j];
        A[col * n + j] = A[maxRow * n + j];
        A[maxRow * n + j] = tmp;
      }
      const tmp = b[col];
      b[col] = b[maxRow];
      b[maxRow] = tmp;
    }

    const pivot = A[col * n + col];
    if (Math.abs(pivot) < 1e-30) continue;

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = A[row * n + col] / pivot;
      for (let j = col; j < n; j++) {
        A[row * n + j] -= factor * A[col * n + j];
      }
      b[row] -= factor * b[col];
    }
  }

  // Back substitution
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < n; j++) {
      sum -= A[i * n + j] * x[j];
    }
    const diag = A[i * n + i];
    x[i] = Math.abs(diag) > 1e-30 ? sum / diag : 0;
  }

  return x;
}

// ── Compute Element Stresses ────────────────────────────────────────────────

function computeElementStresses(
  nodes: FEMNode[],
  elements: FEMElement[],
  displacements: Float64Array,
  mat: FEMMaterial
): FEMElementResult[] {
  const { E, nu } = mat;
  const nodeMap = new Map<number, FEMNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const coeff = E / (1 - nu * nu);
  const D = [
    [coeff, coeff * nu, 0],
    [coeff * nu, coeff, 0],
    [0, 0, coeff * (1 - nu) / 2],
  ];

  const results: FEMElementResult[] = [];

  for (const elem of elements) {
    const n1 = nodeMap.get(elem.nodeIds[0])!;
    const n2 = nodeMap.get(elem.nodeIds[1])!;
    const n3 = nodeMap.get(elem.nodeIds[2])!;
    if (!n1 || !n2 || !n3) continue;

    const twoA = (n2.x - n1.x) * (n3.y - n1.y) - (n3.x - n1.x) * (n2.y - n1.y);
    if (Math.abs(twoA) < 1e-20) continue;

    const b1 = (n2.y - n3.y) / twoA;
    const b2 = (n3.y - n1.y) / twoA;
    const b3 = (n1.y - n2.y) / twoA;
    const c1 = (n3.x - n2.x) / twoA;
    const c2 = (n1.x - n3.x) / twoA;
    const c3 = (n2.x - n1.x) / twoA;

    const B = [
      [b1, 0, b2, 0, b3, 0],
      [0, c1, 0, c2, 0, c3],
      [c1, b1, c2, b2, c3, b3],
    ];

    // Element displacement vector
    const ue = [
      displacements[elem.nodeIds[0] * 2],
      displacements[elem.nodeIds[0] * 2 + 1],
      displacements[elem.nodeIds[1] * 2],
      displacements[elem.nodeIds[1] * 2 + 1],
      displacements[elem.nodeIds[2] * 2],
      displacements[elem.nodeIds[2] * 2 + 1],
    ];

    // Strain: epsilon = B * ue
    const strain = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 6; j++) {
        strain[i] += B[i][j] * ue[j];
      }
    }

    // Stress: sigma = D * epsilon
    const stress = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        stress[i] += D[i][j] * strain[j];
      }
    }

    const sxx = stress[0];
    const syy = stress[1];
    const sxy = stress[2];

    // Von Mises (plane stress)
    const vonMises = Math.sqrt(sxx * sxx - sxx * syy + syy * syy + 3 * sxy * sxy);

    // Principal stresses
    const avg = (sxx + syy) / 2;
    const R = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy);
    const s1 = avg + R;
    const s2 = avg - R;
    const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);

    results.push({
      elementId: elem.id,
      stressXX: sxx,
      stressYY: syy,
      stressXY: sxy,
      vonMises,
      principalS1: s1,
      principalS2: s2,
      principalAngle: angle,
      strainXX: strain[0],
      strainYY: strain[1],
      strainXY: strain[2],
    });
  }

  return results;
}

// ── Main Solver ─────────────────────────────────────────────────────────────

export function solveFEM(
  nodes: FEMNode[],
  elements: FEMElement[],
  material: FEMMaterial,
  boundaryConditions: FEMBoundaryCondition[],
  loads: FEMLoad[]
): FEMSolverResult {
  const t0 = performance.now();
  const ndof = nodes.length * 2;

  // Assemble global stiffness
  const { K } = assembleGlobalStiffness(nodes, elements, material);

  // Build force vector
  const F = new Float64Array(ndof);
  for (const load of loads) {
    F[load.nodeId * 2] += load.fx;
    F[load.nodeId * 2 + 1] += load.fy;
  }

  // Apply BCs
  applyBCs(K, F, ndof, boundaryConditions);

  // Solve K*u = F
  const dispVec = solveLinearSystem(K, F, ndof);

  // Compute stresses
  const elementResults = computeElementStresses(nodes, elements, dispVec, material);

  // Node results: average von Mises from adjacent elements
  const nodeVonMises = new Map<number, number[]>();
  for (const n of nodes) nodeVonMises.set(n.id, []);

  for (const er of elementResults) {
    const elem = elements.find(e => e.id === er.elementId);
    if (!elem) continue;
    for (const nid of elem.nodeIds) {
      nodeVonMises.get(nid)?.push(er.vonMises);
    }
  }

  const nodeResults: FEMNodeResult[] = nodes.map(n => {
    const dx = dispVec[n.id * 2] || 0;
    const dy = dispVec[n.id * 2 + 1] || 0;
    const stresses = nodeVonMises.get(n.id) || [];
    const avgVM = stresses.length > 0 ? stresses.reduce((a, b) => a + b, 0) / stresses.length : 0;
    return {
      nodeId: n.id,
      dispX: dx,
      dispY: dy,
      dispMag: Math.sqrt(dx * dx + dy * dy),
      vonMises: avgVM,
    };
  });

  const maxDisp = Math.max(...nodeResults.map(n => n.dispMag), 0);
  const maxVM = Math.max(...elementResults.map(e => e.vonMises), 0);
  const sf = maxVM > 0 ? material.yieldStrength / maxVM : 999;

  // Convert to Float32Array for transfer
  const disp32 = new Float32Array(ndof);
  for (let i = 0; i < ndof; i++) disp32[i] = dispVec[i];

  return {
    nodes,
    elements,
    nodeResults,
    elementResults,
    displacements: disp32,
    maxDisplacement: maxDisp,
    maxVonMises: maxVM,
    safetyFactor: sf,
    solveTimeMs: performance.now() - t0,
  };
}

// ── Mesh Generator: Rectangular domain with triangles ───────────────────────

export function generateRectMesh(
  Lx: number, Ly: number, nx: number, ny: number
): { nodes: FEMNode[]; elements: FEMElement[] } {
  const nodes: FEMNode[] = [];
  const elements: FEMElement[] = [];

  // Generate nodes
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      nodes.push({
        id: j * (nx + 1) + i,
        x: (i / nx) * Lx,
        y: (j / ny) * Ly,
      });
    }
  }

  // Generate CST elements (2 triangles per quad)
  let elemId = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const n0 = j * (nx + 1) + i;
      const n1 = n0 + 1;
      const n2 = (j + 1) * (nx + 1) + i;
      const n3 = n2 + 1;

      elements.push({ id: elemId++, nodeIds: [n0, n1, n3] });
      elements.push({ id: elemId++, nodeIds: [n0, n3, n2] });
    }
  }

  return { nodes, elements };
}

// ── Consistent Mass Matrix for CST ─────────────────────────────────────────

export function assembleConsistentMassMatrix(
  nodes: FEMNode[],
  elements: FEMElement[],
  mat: FEMMaterial
): Float64Array {
  const ndof = nodes.length * 2;
  const M = new Float64Array(ndof * ndof);

  const nodeMap = new Map<number, FEMNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  for (const elem of elements) {
    const n1 = nodeMap.get(elem.nodeIds[0])!;
    const n2 = nodeMap.get(elem.nodeIds[1])!;
    const n3 = nodeMap.get(elem.nodeIds[2])!;
    if (!n1 || !n2 || !n3) continue;

    const twoA = (n2.x - n1.x) * (n3.y - n1.y) - (n3.x - n1.x) * (n2.y - n1.y);
    const A = Math.abs(twoA) / 2;

    // Consistent mass: Me = (rho * t * A / 12) * [2 1 1; 1 2 1; 1 1 2]
    // Expanded for 2 DOFs per node (6x6)
    const factor = mat.density * mat.thickness * A / 12;

    const dofs = [
      elem.nodeIds[0] * 2, elem.nodeIds[0] * 2 + 1,
      elem.nodeIds[1] * 2, elem.nodeIds[1] * 2 + 1,
      elem.nodeIds[2] * 2, elem.nodeIds[2] * 2 + 1,
    ];

    // Mass coupling: nodes i,j get factor * (2 if i==j, 1 otherwise)
    for (let a = 0; a < 3; a++) {
      for (let b = 0; b < 3; b++) {
        const mVal = a === b ? 2 * factor : factor;
        // x-x coupling
        M[dofs[a * 2] * ndof + dofs[b * 2]] += mVal;
        // y-y coupling
        M[dofs[a * 2 + 1] * ndof + dofs[b * 2 + 1]] += mVal;
      }
    }
  }

  return M;
}
