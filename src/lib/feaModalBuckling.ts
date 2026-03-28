// ============================================================================
// ShilpaSutra FEA - Modal Analysis & Buckling Analysis
// Power iteration for eigenvalues, geometric stiffness for buckling
// ============================================================================

import {
  FEMNode,
  FEMElement,
  FEMMaterial,
  FEMBoundaryCondition,
  assembleConsistentMassMatrix,
} from "./femSolver";

// ── Types ───────────────────────────────────────────────────────────────────

export interface ModeShape {
  modeNumber: number;
  frequency: number;          // Hz
  angularFrequency: number;   // rad/s
  eigenvalue: number;
  modeShape: Float32Array;    // displacement vector for this mode
  description: string;
}

export interface ModalAnalysisResult {
  modes: ModeShape[];
  totalMass: number;
  solveTimeMs: number;
}

export interface BucklingResult {
  criticalLoadFactor: number;
  criticalLoad: number;       // N
  bucklingMode: Float32Array;
  safetyFactor: number;
  solveTimeMs: number;
}

// ── Stiffness Assembly (reuse from femSolver concepts) ──────────────────────

function assembleStiffnessMatrix(
  nodes: FEMNode[],
  elements: FEMElement[],
  mat: FEMMaterial
): Float64Array {
  const ndof = nodes.length * 2;
  const K = new Float64Array(ndof * ndof);

  const nodeMap = new Map<number, FEMNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  for (const elem of elements) {
    const n1 = nodeMap.get(elem.nodeIds[0])!;
    const n2 = nodeMap.get(elem.nodeIds[1])!;
    const n3 = nodeMap.get(elem.nodeIds[2])!;
    if (!n1 || !n2 || !n3) continue;

    const { E, nu, thickness: t } = mat;
    const twoA = (n2.x - n1.x) * (n3.y - n1.y) - (n3.x - n1.x) * (n2.y - n1.y);
    const A = Math.abs(twoA) / 2;
    if (A < 1e-20) continue;

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

    const coeff = E / (1 - nu * nu);
    const D = [
      [coeff, coeff * nu, 0],
      [coeff * nu, coeff, 0],
      [0, 0, coeff * (1 - nu) / 2],
    ];

    const DB: number[][] = [[], [], []];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 6; j++) {
        DB[i][j] = 0;
        for (let k = 0; k < 3; k++) DB[i][j] += D[i][k] * B[k][j];
      }
    }

    const Ke: number[][] = Array.from({ length: 6 }, () => new Array(6).fill(0));
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        for (let k = 0; k < 3; k++) Ke[i][j] += B[k][i] * DB[k][j];
        Ke[i][j] *= t * A;
      }
    }

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

  return K;
}

// ── Apply BCs to matrices (zero rows/cols for fixed DOFs) ───────────────────

function applyBCsToMatrices(
  K: Float64Array,
  M: Float64Array,
  ndof: number,
  bcs: FEMBoundaryCondition[]
): Set<number> {
  const fixedDofs = new Set<number>();
  for (const bc of bcs) {
    if (bc.type === "fixed" || bc.type === "pinned") {
      fixedDofs.add(bc.nodeId * 2);
      fixedDofs.add(bc.nodeId * 2 + 1);
    } else if (bc.type === "rollerX") {
      fixedDofs.add(bc.nodeId * 2 + 1);
    } else if (bc.type === "rollerY") {
      fixedDofs.add(bc.nodeId * 2);
    }
  }

  for (const dof of Array.from(fixedDofs)) {
    for (let j = 0; j < ndof; j++) {
      K[dof * ndof + j] = 0;
      K[j * ndof + dof] = 0;
      M[dof * ndof + j] = 0;
      M[j * ndof + dof] = 0;
    }
    K[dof * ndof + dof] = 1;
    M[dof * ndof + dof] = 1e-20; // near-zero mass for fixed DOFs
  }

  return fixedDofs;
}

// ── Matrix-Vector Multiply ──────────────────────────────────────────────────

// Using number[] for eigenvector operations to avoid Float64Array generic type issues
type Vec = number[];
type Mat = Float64Array;

function matvec(A: Mat, x: Vec | Mat, n: number): Vec {
  const y: Vec = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += A[i * n + j] * (x[j] || 0);
    }
    y[i] = sum;
  }
  return y;
}

function vecNorm(x: Vec | Mat): number {
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += x[i] * x[i];
  return Math.sqrt(sum);
}

function vecScale(x: Vec, s: number): Vec {
  return x.map(v => v * s);
}

function vecDot(a: Vec | Mat, b: Vec | Mat): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) sum += a[i] * b[i];
  return sum;
}

// ── Solve K*x = M*v using Gaussian elimination ─────────────────────────────

function solveKxMv(K: Mat, M: Mat, v: Vec, n: number): Vec {
  const rhs = matvec(M, v, n);
  const A = new Float64Array(K);
  const b = [...rhs];

  for (let col = 0; col < n; col++) {
    let maxVal = Math.abs(A[col * n + col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(A[row * n + col]);
      if (val > maxVal) { maxVal = val; maxRow = row; }
    }
    if (maxRow !== col) {
      for (let j = col; j < n; j++) {
        const tmp = A[col * n + j]; A[col * n + j] = A[maxRow * n + j]; A[maxRow * n + j] = tmp;
      }
      const tmp = b[col]; b[col] = b[maxRow]; b[maxRow] = tmp;
    }
    const pivot = A[col * n + col];
    if (Math.abs(pivot) < 1e-30) continue;
    for (let row = col + 1; row < n; row++) {
      const factor = A[row * n + col] / pivot;
      for (let j = col; j < n; j++) A[row * n + j] -= factor * A[col * n + j];
      b[row] -= factor * b[col];
    }
  }

  const x: Vec = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < n; j++) sum -= A[i * n + j] * x[j];
    x[i] = Math.abs(A[i * n + i]) > 1e-30 ? sum / A[i * n + i] : 0;
  }
  return x;
}

// ── Inverse Power Iteration for smallest eigenvalues ────────────────────────
// Solves generalized: K * phi = lambda * M * phi
// Inverse iteration finds smallest eigenvalue of K^(-1)*M

function inversePowerIteration(
  K: Mat,
  M: Mat,
  ndof: number,
  numModes: number,
  maxIter: number,
  fixedDofs: Set<number>
): { eigenvalues: number[]; eigenvectors: Float32Array[] } {
  const eigenvalues: number[] = [];
  const eigenvectors: Float32Array[] = [];
  const fixedArr = Array.from(fixedDofs);

  for (let mode = 0; mode < numModes; mode++) {
    // Random initial vector
    let x: Vec = new Array(ndof).fill(0);
    for (let i = 0; i < ndof; i++) {
      x[i] = fixedDofs.has(i) ? 0 : (Math.random() - 0.5);
    }
    let norm = vecNorm(x);
    if (norm > 0) x = vecScale(x, 1 / norm);

    let eigenvalue = 0;

    for (let iter = 0; iter < maxIter; iter++) {
      // Solve K * y = M * x (inverse iteration step)
      const KCopy = new Float64Array(K);
      const y = solveKxMv(KCopy, M, x, ndof);

      // Zero out fixed DOFs
      for (const dof of fixedArr) y[dof] = 0;

      // Orthogonalize against previous modes (Gram-Schmidt)
      for (let prev = 0; prev < eigenvectors.length; prev++) {
        const prevVec: Vec = Array.from(eigenvectors[prev]);
        const dot = vecDot(y, matvec(M, prevVec, ndof));
        for (let i = 0; i < ndof; i++) {
          y[i] -= dot * (eigenvectors[prev][i] || 0);
        }
      }

      // Rayleigh quotient: lambda = x^T * K * x / (x^T * M * x)
      const Kx = matvec(K, y, ndof);
      const Mx = matvec(M, y, ndof);
      const num = vecDot(y, Kx);
      const den = vecDot(y, Mx);
      eigenvalue = den > 1e-30 ? num / den : 0;

      // Normalize
      norm = vecNorm(y);
      if (norm > 1e-30) {
        x = vecScale(y, 1 / norm);
      } else {
        break;
      }
    }

    // Filter out near-zero / fixed DOF modes
    if (eigenvalue > 1e-3) {
      eigenvalues.push(eigenvalue);
      const mode32 = new Float32Array(ndof);
      for (let i = 0; i < ndof; i++) mode32[i] = x[i];
      eigenvectors.push(mode32);
    }
  }

  return { eigenvalues, eigenvectors };
}

// ── Modal Analysis ──────────────────────────────────────────────────────────

export function solveModalAnalysis(
  nodes: FEMNode[],
  elements: FEMElement[],
  material: FEMMaterial,
  bcs: FEMBoundaryCondition[],
  numModes: number = 6,
  dampingRatio: number = 0.02
): ModalAnalysisResult {
  const t0 = performance.now();
  const ndof = nodes.length * 2;

  const K = assembleStiffnessMatrix(nodes, elements, material);
  const M = assembleConsistentMassMatrix(nodes, elements, material);
  const fixedDofs = applyBCsToMatrices(K, M, ndof, bcs);

  // Compute total mass
  let totalMass = 0;
  for (let i = 0; i < ndof; i++) totalMass += M[i * ndof + i];
  totalMass /= 2; // each node contributes to both x and y

  const { eigenvalues, eigenvectors } = inversePowerIteration(K, M, ndof, numModes + 4, 200, fixedDofs);

  // Sort by eigenvalue (ascending = lowest frequency first)
  const indexed = eigenvalues.map((val, i) => ({ val, vec: eigenvectors[i] }));
  indexed.sort((a, b) => a.val - b.val);

  const modes: ModeShape[] = [];
  const modeDescriptions = [
    "1st bending mode",
    "2nd bending mode",
    "1st torsional mode",
    "3rd bending mode",
    "2nd torsional mode",
    "4th bending mode",
    "Coupled mode",
    "Higher mode",
  ];

  for (let i = 0; i < Math.min(numModes, indexed.length); i++) {
    const omega = Math.sqrt(Math.max(0, indexed[i].val));
    const freq = omega / (2 * Math.PI);
    modes.push({
      modeNumber: i + 1,
      frequency: freq,
      angularFrequency: omega,
      eigenvalue: indexed[i].val,
      modeShape: indexed[i].vec,
      description: modeDescriptions[i] || `Mode ${i + 1}`,
    });
  }

  return {
    modes,
    totalMass,
    solveTimeMs: performance.now() - t0,
  };
}

// ── Geometric Stiffness Matrix (for buckling) ───────────────────────────────

function assembleGeometricStiffness(
  nodes: FEMNode[],
  elements: FEMElement[],
  stressField: { sxx: number; syy: number; sxy: number }[], // per-element
  thickness: number
): Float64Array {
  const ndof = nodes.length * 2;
  const Kg = new Float64Array(ndof * ndof);

  const nodeMap = new Map<number, FEMNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  for (let ei = 0; ei < elements.length; ei++) {
    const elem = elements[ei];
    const n1 = nodeMap.get(elem.nodeIds[0])!;
    const n2 = nodeMap.get(elem.nodeIds[1])!;
    const n3 = nodeMap.get(elem.nodeIds[2])!;
    if (!n1 || !n2 || !n3) continue;

    const twoA = (n2.x - n1.x) * (n3.y - n1.y) - (n3.x - n1.x) * (n2.y - n1.y);
    const A = Math.abs(twoA) / 2;
    if (A < 1e-20) continue;

    const stress = stressField[ei] || { sxx: 0, syy: 0, sxy: 0 };

    // Shape function derivatives
    const b1 = (n2.y - n3.y) / twoA;
    const b2 = (n3.y - n1.y) / twoA;
    const b3 = (n1.y - n2.y) / twoA;
    const c1 = (n3.x - n2.x) / twoA;
    const c2 = (n1.x - n3.x) / twoA;
    const c3 = (n2.x - n1.x) / twoA;

    const dN = [[b1, c1], [b2, c2], [b3, c3]]; // [dNi/dx, dNi/dy]

    // Geometric stiffness: Kg_ij = t * A * (sigma_xx * dNi/dx * dNj/dx + sigma_yy * dNi/dy * dNj/dy + sigma_xy * (...))
    for (let a = 0; a < 3; a++) {
      for (let b = 0; b < 3; b++) {
        const val = thickness * A * (
          stress.sxx * dN[a][0] * dN[b][0] +
          stress.syy * dN[a][1] * dN[b][1] +
          stress.sxy * (dN[a][0] * dN[b][1] + dN[a][1] * dN[b][0])
        );

        const dofA0 = elem.nodeIds[a] * 2;
        const dofB0 = elem.nodeIds[b] * 2;

        // Apply to both x-x and y-y DOF pairs
        Kg[dofA0 * ndof + dofB0] += val;
        Kg[(dofA0 + 1) * ndof + (dofB0 + 1)] += val;
      }
    }
  }

  return Kg;
}

// ── Buckling Analysis ───────────────────────────────────────────────────────

export function solveBuckling(
  nodes: FEMNode[],
  elements: FEMElement[],
  material: FEMMaterial,
  bcs: FEMBoundaryCondition[],
  appliedLoad: number, // reference load in N
  stressField: { sxx: number; syy: number; sxy: number }[]
): BucklingResult {
  const t0 = performance.now();
  const ndof = nodes.length * 2;

  const K = assembleStiffnessMatrix(nodes, elements, material);
  const Kg = assembleGeometricStiffness(nodes, elements, stressField, material.thickness);

  // Apply BCs
  const fixedDofs = new Set<number>();
  for (const bc of bcs) {
    if (bc.type === "fixed" || bc.type === "pinned") {
      fixedDofs.add(bc.nodeId * 2);
      fixedDofs.add(bc.nodeId * 2 + 1);
    } else if (bc.type === "rollerX") {
      fixedDofs.add(bc.nodeId * 2 + 1);
    } else if (bc.type === "rollerY") {
      fixedDofs.add(bc.nodeId * 2);
    }
  }

  for (const dof of Array.from(fixedDofs)) {
    for (let j = 0; j < ndof; j++) {
      K[dof * ndof + j] = 0; K[j * ndof + dof] = 0;
      Kg[dof * ndof + j] = 0; Kg[j * ndof + dof] = 0;
    }
    K[dof * ndof + dof] = 1;
    Kg[dof * ndof + dof] = 1e-20;
  }

  // Power iteration for: (K + lambda * Kg) * phi = 0
  // Equivalent to: K * phi = -lambda * Kg * phi → eigenvalue of K^(-1) * (-Kg)
  // Negate Kg for standard form
  const negKg = new Float64Array(ndof * ndof);
  for (let i = 0; i < negKg.length; i++) negKg[i] = -Kg[i];

  // Inverse power iteration: find smallest eigenvalue of K w.r.t. -Kg
  const fixedArr = Array.from(fixedDofs);
  let x: Vec = new Array(ndof).fill(0);
  for (let i = 0; i < ndof; i++) x[i] = fixedDofs.has(i) ? 0 : (Math.random() - 0.5);
  let norm = vecNorm(x);
  if (norm > 0) x = vecScale(x, 1 / norm);

  let lambda = 0;
  for (let iter = 0; iter < 200; iter++) {
    const KCopy = new Float64Array(K);
    const y = solveKxMv(KCopy, negKg, x, ndof);

    for (const dof of fixedArr) y[dof] = 0;

    const Ky = matvec(K, y, ndof);
    const Kgy = matvec(negKg, y, ndof);
    const num = vecDot(y, Ky);
    const den = vecDot(y, Kgy);
    lambda = den > 1e-30 ? num / den : 1e10;

    norm = vecNorm(y);
    if (norm > 1e-30) x = vecScale(y, 1 / norm);
    else break;
  }

  const criticalLoadFactor = Math.abs(lambda);
  const criticalLoad = criticalLoadFactor * appliedLoad;
  const bucklingMode = new Float32Array(ndof);
  for (let i = 0; i < ndof; i++) bucklingMode[i] = x[i];

  return {
    criticalLoadFactor,
    criticalLoad,
    bucklingMode,
    safetyFactor: criticalLoadFactor,
    solveTimeMs: performance.now() - t0,
  };
}
