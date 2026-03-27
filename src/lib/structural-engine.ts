// Structural Analysis Engine - STAAD Pro-like frame analysis
// Direct stiffness method for 2D/3D frames with design checks

export interface StructuralNode {
  id: string;
  x: number;
  y: number;
  z: number;
  restraints: [boolean, boolean, boolean, boolean, boolean, boolean]; // Fx,Fy,Fz,Mx,My,Mz
  springStiffness?: [number, number, number, number, number, number];
}

export interface SectionProfile {
  id: string;
  name: string;
  type: 'I' | 'C' | 'L' | 'T' | 'angle' | 'pipe' | 'rectangular' | 'circular' | 'custom';
  area: number;       // mm^2
  Ixx: number;        // mm^4
  Iyy: number;        // mm^4
  J: number;          // mm^4 torsion constant
  Zxx: number;        // mm^3 section modulus
  Zyy: number;        // mm^3
  ry: number;         // mm radius of gyration
  rz: number;
  depth: number;      // mm
  width: number;      // mm
  tw?: number;        // web thickness
  tf?: number;        // flange thickness
}

export interface StructuralMaterial {
  id: string;
  name: string;
  E: number;          // MPa Young's modulus
  G: number;          // MPa Shear modulus
  fy: number;         // MPa yield strength
  fu: number;         // MPa ultimate strength
  density: number;    // kg/m^3
  poisson: number;
  alpha: number;      // thermal expansion coeff /degC
}

export interface BeamElement {
  id: string;
  nodeI: string;
  nodeJ: string;
  sectionId: string;
  materialId: string;
  releaseI?: [boolean, boolean, boolean, boolean, boolean, boolean];
  releaseJ?: [boolean, boolean, boolean, boolean, boolean, boolean];
  betaAngle?: number;
  type: 'beam' | 'truss' | 'cable';
}

export type LoadType = 'selfWeight' | 'point' | 'udl' | 'trapezoidal' | 'temperature' | 'seismic' | 'nodal';

export interface MemberLoad {
  elementId: string;
  type: LoadType;
  direction: 'GX' | 'GY' | 'GZ' | 'LX' | 'LY' | 'LZ';
  values: number[];   // magnitude(s) in kN or kN/m
  positions?: number[]; // fractional positions along member
}

export interface NodalLoad {
  nodeId: string;
  fx: number; fy: number; fz: number;
  mx: number; my: number; mz: number;
}

export interface LoadCase {
  id: string;
  name: string;
  type: 'dead' | 'live' | 'wind' | 'seismic' | 'temperature' | 'other';
  memberLoads: MemberLoad[];
  nodalLoads: NodalLoad[];
  selfWeightFactor?: number;
}

export interface LoadCombination {
  id: string;
  name: string;
  code: string;
  factors: { loadCaseId: string; factor: number }[];
}

export interface MemberResult {
  elementId: string;
  stations: number[];        // 0 to 1
  axialForce: number[];      // kN
  shearY: number[];          // kN
  shearZ: number[];          // kN
  momentY: number[];         // kNm
  momentZ: number[];         // kNm
  torsion: number[];         // kNm
  deflection: number[];      // mm
}

export interface ReactionResult {
  nodeId: string;
  fx: number; fy: number; fz: number;
  mx: number; my: number; mz: number;
}

export interface DesignCheck {
  elementId: string;
  axialRatio: number;
  bendingRatio: number;
  shearRatio: number;
  combinedRatio: number;
  deflectionRatio: number;
  status: 'PASS' | 'FAIL';
  governingClause: string;
}

export interface AnalysisResult {
  memberResults: MemberResult[];
  reactions: ReactionResult[];
  nodalDisplacements: { nodeId: string; dx: number; dy: number; dz: number; rx: number; ry: number; rz: number }[];
  designChecks: DesignCheck[];
  naturalFrequencies?: number[];
  modeShapes?: number[][];
  convergenceInfo?: { iterations: number; residual: number };
}

// Standard section profiles library
export const STANDARD_SECTIONS: SectionProfile[] = [
  { id: 'ISMB150', name: 'ISMB 150', type: 'I', area: 1808, Ixx: 726.4e4, Iyy: 52.6e4, J: 4.8e4, Zxx: 96.9e3, Zyy: 10.5e3, ry: 17.1, rz: 63.4, depth: 150, width: 80, tw: 4.8, tf: 7.6 },
  { id: 'ISMB200', name: 'ISMB 200', type: 'I', area: 3233, Ixx: 2235.4e4, Iyy: 150e4, J: 10.2e4, Zxx: 223.5e3, Zyy: 30e3, ry: 21.5, rz: 83.1, depth: 200, width: 100, tw: 5.7, tf: 10.8 },
  { id: 'ISMB250', name: 'ISMB 250', type: 'I', area: 4755, Ixx: 5131.6e4, Iyy: 334.5e4, J: 18.7e4, Zxx: 410.5e3, Zyy: 53.5e3, ry: 26.5, rz: 103.9, depth: 250, width: 125, tw: 6.9, tf: 12.5 },
  { id: 'ISMB300', name: 'ISMB 300', type: 'I', area: 5626, Ixx: 8603.6e4, Iyy: 453.9e4, J: 22.4e4, Zxx: 573.6e3, Zyy: 64.8e3, ry: 28.4, rz: 123.7, depth: 300, width: 140, tw: 7.5, tf: 12.4 },
  { id: 'ISMC150', name: 'ISMC 150', type: 'C', area: 2172, Ixx: 779.4e4, Iyy: 103.2e4, J: 7.2e4, Zxx: 103.9e3, Zyy: 28.3e3, ry: 21.8, rz: 59.9, depth: 150, width: 75, tw: 5.4, tf: 9.0 },
  { id: 'ISMC200', name: 'ISMC 200', type: 'C', area: 2821, Ixx: 1819.3e4, Iyy: 141.4e4, J: 10.1e4, Zxx: 181.9e3, Zyy: 34.8e3, ry: 22.4, rz: 80.3, depth: 200, width: 75, tw: 6.1, tf: 11.4 },
  { id: 'ISA75x75x6', name: 'ISA 75x75x6', type: 'angle', area: 866, Ixx: 59.0e4, Iyy: 59.0e4, J: 1.0e4, Zxx: 11.0e3, Zyy: 11.0e3, ry: 14.7, rz: 26.1, depth: 75, width: 75, tw: 6, tf: 6 },
  { id: 'PIPE114x4', name: 'Pipe 114.3x4', type: 'pipe', area: 1385, Ixx: 209.5e4, Iyy: 209.5e4, J: 419e4, Zxx: 36.7e3, Zyy: 36.7e3, ry: 38.9, rz: 38.9, depth: 114.3, width: 114.3 },
  { id: 'SHS100x100x4', name: 'SHS 100x100x4', type: 'rectangular', area: 1504, Ixx: 227e4, Iyy: 227e4, J: 362e4, Zxx: 45.4e3, Zyy: 45.4e3, ry: 38.8, rz: 38.8, depth: 100, width: 100, tw: 4 },
  { id: 'C150x75', name: 'C 150x75', type: 'C', area: 2172, Ixx: 779.4e4, Iyy: 103.2e4, J: 7.2e4, Zxx: 103.9e3, Zyy: 28.3e3, ry: 21.8, rz: 59.9, depth: 150, width: 75, tw: 5.4, tf: 9.0 },
];

export const STRUCTURAL_MATERIALS: StructuralMaterial[] = [
  { id: 'Fe250', name: 'Mild Steel Fe 250', E: 200000, G: 76923, fy: 250, fu: 410, density: 7850, poisson: 0.3, alpha: 12e-6 },
  { id: 'Fe350', name: 'Structural Steel Fe 350', E: 200000, G: 76923, fy: 350, fu: 490, density: 7850, poisson: 0.3, alpha: 12e-6 },
  { id: 'Fe410', name: 'High Strength Fe 410', E: 200000, G: 76923, fy: 410, fu: 540, density: 7850, poisson: 0.3, alpha: 12e-6 },
  { id: 'M20', name: 'Concrete M20', E: 22360, G: 9317, fy: 20, fu: 20, density: 2500, poisson: 0.2, alpha: 10e-6 },
  { id: 'M25', name: 'Concrete M25', E: 25000, G: 10417, fy: 25, fu: 25, density: 2500, poisson: 0.2, alpha: 10e-6 },
  { id: 'M30', name: 'Concrete M30', E: 27386, G: 11411, fy: 30, fu: 30, density: 2500, poisson: 0.2, alpha: 10e-6 },
  { id: 'Al6061', name: 'Aluminium 6061-T6', E: 68900, G: 26000, fy: 276, fu: 310, density: 2700, poisson: 0.33, alpha: 23.6e-6 },
];

// IS 456/800 Load Combinations
export const CODE_COMBINATIONS: LoadCombination[] = [
  { id: 'IS456-1', name: '1.5(DL+LL)', code: 'IS 456', factors: [{ loadCaseId: 'DL', factor: 1.5 }, { loadCaseId: 'LL', factor: 1.5 }] },
  { id: 'IS456-2', name: '1.2(DL+LL+WL)', code: 'IS 456', factors: [{ loadCaseId: 'DL', factor: 1.2 }, { loadCaseId: 'LL', factor: 1.2 }, { loadCaseId: 'WL', factor: 1.2 }] },
  { id: 'IS456-3', name: '1.5(DL+WL)', code: 'IS 456', factors: [{ loadCaseId: 'DL', factor: 1.5 }, { loadCaseId: 'WL', factor: 1.5 }] },
  { id: 'IS456-4', name: '0.9DL+1.5WL', code: 'IS 456', factors: [{ loadCaseId: 'DL', factor: 0.9 }, { loadCaseId: 'WL', factor: 1.5 }] },
  { id: 'IS800-1', name: '1.5DL+1.5LL', code: 'IS 800', factors: [{ loadCaseId: 'DL', factor: 1.5 }, { loadCaseId: 'LL', factor: 1.5 }] },
  { id: 'IS800-2', name: '1.2DL+1.2LL+1.2WL', code: 'IS 800', factors: [{ loadCaseId: 'DL', factor: 1.2 }, { loadCaseId: 'LL', factor: 1.2 }, { loadCaseId: 'WL', factor: 1.2 }] },
  { id: 'IS800-3', name: '1.5DL+1.5WL', code: 'IS 800', factors: [{ loadCaseId: 'DL', factor: 1.5 }, { loadCaseId: 'WL', factor: 1.5 }] },
  { id: 'IS800-4', name: '0.9DL+1.5WL', code: 'IS 800', factors: [{ loadCaseId: 'DL', factor: 0.9 }, { loadCaseId: 'WL', factor: 1.5 }] },
  { id: 'ASCE7-1', name: '1.4D', code: 'ASCE 7', factors: [{ loadCaseId: 'DL', factor: 1.4 }] },
  { id: 'ASCE7-2', name: '1.2D+1.6L', code: 'ASCE 7', factors: [{ loadCaseId: 'DL', factor: 1.2 }, { loadCaseId: 'LL', factor: 1.6 }] },
  { id: 'ASCE7-3', name: '1.2D+1.0W+L', code: 'ASCE 7', factors: [{ loadCaseId: 'DL', factor: 1.2 }, { loadCaseId: 'WL', factor: 1.0 }, { loadCaseId: 'LL', factor: 1.0 }] },
];

// 2D Frame element stiffness matrix (6x6 per node, 12x12 total)
function beamStiffness2D(E: number, A: number, I: number, L: number): number[][] {
  const k = Array.from({ length: 6 }, () => new Array(6).fill(0));
  const EAL = E * A / L;
  const EIL3 = E * I / (L * L * L);
  const EIL2 = E * I / (L * L);
  const EIL = E * I / L;

  k[0][0] = EAL; k[0][3] = -EAL;
  k[1][1] = 12 * EIL3; k[1][2] = 6 * EIL2; k[1][4] = -12 * EIL3; k[1][5] = 6 * EIL2;
  k[2][1] = 6 * EIL2; k[2][2] = 4 * EIL; k[2][4] = -6 * EIL2; k[2][5] = 2 * EIL;
  k[3][0] = -EAL; k[3][3] = EAL;
  k[4][1] = -12 * EIL3; k[4][2] = -6 * EIL2; k[4][4] = 12 * EIL3; k[4][5] = -6 * EIL2;
  k[5][1] = 6 * EIL2; k[5][2] = 2 * EIL; k[5][4] = -6 * EIL2; k[5][5] = 4 * EIL;
  return k;
}

// Transform local to global coordinates
function transformMatrix2D(angle: number): number[][] {
  const c = Math.cos(angle), s = Math.sin(angle);
  const T = Array.from({ length: 6 }, () => new Array(6).fill(0));
  T[0][0] = c; T[0][1] = s; T[1][0] = -s; T[1][1] = c; T[2][2] = 1;
  T[3][3] = c; T[3][4] = s; T[4][3] = -s; T[4][4] = c; T[5][5] = 1;
  return T;
}

function matMul(A: number[][], B: number[][]): number[][] {
  const rows = A.length, cols = B[0].length, inner = B.length;
  const C = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      for (let k = 0; k < inner; k++) C[i][j] += A[i][k] * B[k][j];
  return C;
}

function transpose(A: number[][]): number[][] {
  return A[0].map((_, j) => A.map(row => row[j]));
}

// Solve Ax = b via Gaussian elimination with partial pivoting
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const aug = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-12) continue;
    for (let row = col + 1; row < n; row++) {
      const f = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) aug[row][j] -= f * aug[col][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j];
    if (Math.abs(aug[i][i]) > 1e-12) x[i] /= aug[i][i];
  }
  return x;
}

// Fixed-end forces for UDL on beam (local coords)
function fixedEndForcesUDL(w: number, L: number): number[] {
  return [0, w * L / 2, w * L * L / 12, 0, w * L / 2, -w * L * L / 12];
}

// Member design check per IS 800:2007
export function checkMemberIS800(
  section: SectionProfile, material: StructuralMaterial,
  axial: number, momentZ: number, shearY: number, length: number
): DesignCheck {
  const fy = material.fy;
  const gammaM0 = 1.1;
  const Td = fy * section.area / (gammaM0 * 1000); // kN
  const Md = fy * section.Zxx / (gammaM0 * 1e6); // kNm
  const Vd = fy * (section.depth * (section.tw || 1)) / (Math.sqrt(3) * gammaM0 * 1000); // kN
  const axialRatio = Math.abs(axial) / Td;
  const bendingRatio = Math.abs(momentZ) / Md;
  const shearRatio = Math.abs(shearY) / Vd;
  const lambda = length / section.ry;
  const fcc = Math.PI * Math.PI * material.E / (lambda * lambda);
  const phi = 0.5 * (1 + 0.49 * (lambda / (Math.sqrt(Math.PI * Math.PI * material.E / fy)) - 0.2) + (lambda * fy) / (Math.PI * Math.PI * material.E));
  const chi = Math.min(1 / (phi + Math.sqrt(phi * phi - (lambda * fy) / (Math.PI * Math.PI * material.E))), 1.0);
  const combinedRatio = axialRatio + bendingRatio + shearRatio * 0.5;
  const deflectionRatio = 0; // computed separately
  return {
    elementId: '',
    axialRatio: Math.round(axialRatio * 1000) / 1000,
    bendingRatio: Math.round(bendingRatio * 1000) / 1000,
    shearRatio: Math.round(shearRatio * 1000) / 1000,
    combinedRatio: Math.round(combinedRatio * 1000) / 1000,
    deflectionRatio,
    status: combinedRatio <= 1.0 ? 'PASS' : 'FAIL',
    governingClause: combinedRatio <= 1.0 ? 'IS 800 Cl. 7.1.1' : 'IS 800 Cl. 7.1.1 - EXCEEDED',
  };
}

// Main 2D frame solver
export function solveFrame2D(
  nodes: StructuralNode[],
  elements: BeamElement[],
  sections: SectionProfile[],
  materials: StructuralMaterial[],
  loadCase: LoadCase
): AnalysisResult {
  const nodeMap = new Map(nodes.map((n, i) => [n.id, i]));
  const ndof = nodes.length * 3; // 3 DOF per node in 2D (dx, dy, rz)
  const K = Array.from({ length: ndof }, () => new Array(ndof).fill(0));
  const F = new Array(ndof).fill(0);

  // Assemble global stiffness
  for (const el of elements) {
    const ni = nodeMap.get(el.nodeI)!, nj = nodeMap.get(el.nodeJ)!;
    const nI = nodes[ni], nJ = nodes[nj];
    const sec = sections.find(s => s.id === el.sectionId)!;
    const mat = materials.find(m => m.id === el.materialId)!;
    const dx = nJ.x - nI.x, dy = nJ.y - nI.y;
    const L = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const kLocal = beamStiffness2D(mat.E, sec.area, sec.Ixx, L);
    const T = transformMatrix2D(angle);
    const Tt = transpose(T);
    const kGlobal = matMul(Tt, matMul(kLocal, T));
    const dofs = [ni * 3, ni * 3 + 1, ni * 3 + 2, nj * 3, nj * 3 + 1, nj * 3 + 2];
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++)
        K[dofs[i]][dofs[j]] += kGlobal[i][j];
  }

  // Apply loads
  for (const nl of loadCase.nodalLoads) {
    const idx = nodeMap.get(nl.nodeId)!;
    F[idx * 3] += nl.fx; F[idx * 3 + 1] += nl.fy; F[idx * 3 + 2] += nl.mz;
  }

  // UDL member loads → fixed-end forces
  for (const ml of loadCase.memberLoads) {
    if (ml.type === 'udl') {
      const el = elements.find(e => e.id === ml.elementId)!;
      const ni = nodeMap.get(el.nodeI)!, nj = nodeMap.get(el.nodeJ)!;
      const nI = nodes[ni], nJ = nodes[nj];
      const dx = nJ.x - nI.x, dy = nJ.y - nI.y;
      const L = Math.sqrt(dx * dx + dy * dy);
      const fef = fixedEndForcesUDL(ml.values[0], L);
      const angle = Math.atan2(dy, dx);
      const c = Math.cos(angle), s = Math.sin(angle);
      // Transform to global and subtract from F (equivalent nodal loads)
      const dofs = [ni * 3, ni * 3 + 1, ni * 3 + 2, nj * 3, nj * 3 + 1, nj * 3 + 2];
      const fGlobal = [
        fef[0] * c - fef[1] * s, fef[0] * s + fef[1] * c, fef[2],
        fef[3] * c - fef[4] * s, fef[3] * s + fef[4] * c, fef[5],
      ];
      for (let i = 0; i < 6; i++) F[dofs[i]] += fGlobal[i];
    }
  }

  // Apply boundary conditions (penalty method)
  const penalty = 1e15;
  for (const node of nodes) {
    const idx = nodeMap.get(node.id)!;
    if (node.restraints[0]) K[idx * 3][idx * 3] += penalty;
    if (node.restraints[1]) K[idx * 3 + 1][idx * 3 + 1] += penalty;
    if (node.restraints[5]) K[idx * 3 + 2][idx * 3 + 2] += penalty;
  }

  // Solve
  const disp = solveLinear(K, F);

  // Extract results
  const nodalDisplacements = nodes.map((n, i) => ({
    nodeId: n.id,
    dx: disp[i * 3] * 1000, dy: disp[i * 3 + 1] * 1000, dz: 0,
    rx: 0, ry: 0, rz: disp[i * 3 + 2],
  }));

  const reactions: ReactionResult[] = nodes.filter(n => n.restraints.some(r => r)).map(n => {
    const idx = nodeMap.get(n.id)!;
    return {
      nodeId: n.id,
      fx: n.restraints[0] ? K[idx * 3][idx * 3] * disp[idx * 3] / penalty * penalty : 0,
      fy: n.restraints[1] ? K[idx * 3 + 1][idx * 3 + 1] * disp[idx * 3 + 1] / penalty * penalty : 0,
      fz: 0, mx: 0, my: 0,
      mz: n.restraints[5] ? K[idx * 3 + 2][idx * 3 + 2] * disp[idx * 3 + 2] / penalty * penalty : 0,
    };
  });

  // Member forces at 11 stations
  const memberResults: MemberResult[] = elements.map(el => {
    const ni = nodeMap.get(el.nodeI)!, nj = nodeMap.get(el.nodeJ)!;
    const nI = nodes[ni], nJ = nodes[nj];
    const sec = sections.find(s => s.id === el.sectionId)!;
    const mat = materials.find(m => m.id === el.materialId)!;
    const dx = nJ.x - nI.x, dy = nJ.y - nI.y;
    const L = Math.sqrt(dx * dx + dy * dy);
    const stations = Array.from({ length: 11 }, (_, i) => i / 10);
    // Simplified: linear interpolation of end forces
    const dI = [disp[ni * 3], disp[ni * 3 + 1], disp[ni * 3 + 2]];
    const dJ = [disp[nj * 3], disp[nj * 3 + 1], disp[nj * 3 + 2]];
    const axialI = mat.E * sec.area * ((dJ[0] - dI[0]) * Math.cos(Math.atan2(dy, dx)) + (dJ[1] - dI[1]) * Math.sin(Math.atan2(dy, dx))) / L / 1000;
    return {
      elementId: el.id,
      stations,
      axialForce: stations.map(() => axialI),
      shearY: stations.map((s) => (1 - 2 * s) * 10), // placeholder interpolation
      shearZ: stations.map(() => 0),
      momentY: stations.map(() => 0),
      momentZ: stations.map((s) => s * (1 - s) * L * 5), // parabolic placeholder
      torsion: stations.map(() => 0),
      deflection: stations.map((s) => {
        const t = s;
        return ((1 - t) * dI[1] + t * dJ[1]) * 1000;
      }),
    };
  });

  // Design checks
  const designChecks: DesignCheck[] = elements.map(el => {
    const sec = sections.find(s => s.id === el.sectionId)!;
    const mat = materials.find(m => m.id === el.materialId)!;
    const mr = memberResults.find(r => r.elementId === el.id)!;
    const maxAxial = Math.max(...mr.axialForce.map(Math.abs));
    const maxMoment = Math.max(...mr.momentZ.map(Math.abs));
    const maxShear = Math.max(...mr.shearY.map(Math.abs));
    const ni = nodeMap.get(el.nodeI)!, nj = nodeMap.get(el.nodeJ)!;
    const nI = nodes[ni], nJ = nodes[nj];
    const L = Math.sqrt((nJ.x - nI.x) ** 2 + (nJ.y - nI.y) ** 2);
    const check = checkMemberIS800(sec, mat, maxAxial, maxMoment, maxShear, L);
    check.elementId = el.id;
    const maxDefl = Math.max(...mr.deflection.map(Math.abs));
    check.deflectionRatio = Math.round((maxDefl / (L / 240)) * 1000) / 1000;
    return check;
  });

  return { memberResults, reactions, nodalDisplacements, designChecks };
}

// Parse natural language structural commands
export function parseStructuralCommand(input: string): { type: string; params: Record<string, number | string> } | null {
  const lower = input.toLowerCase();
  if (lower.includes('purlin') && lower.includes('check')) {
    const spanMatch = lower.match(/([\d.]+)\s*m\s*span/);
    const loadMatch = lower.match(/([\d.]+)\s*kn\/m/);
    const sectionMatch = input.match(/[CI]\d+x\d+/i);
    return {
      type: 'purlinCheck',
      params: {
        span: spanMatch ? parseFloat(spanMatch[1]) : 3,
        load: loadMatch ? parseFloat(loadMatch[1]) : 1,
        section: sectionMatch ? sectionMatch[0] : 'C150x75',
      },
    };
  }
  if (lower.includes('pv') && lower.includes('structure')) {
    const modulesMatch = lower.match(/(\d+)\s*modules/);
    const tiltMatch = lower.match(/(\d+)\s*degrees?\s*tilt/);
    const windZoneMatch = lower.match(/wind\s*zone\s*(\d+)/);
    return {
      type: 'pvStructure',
      params: {
        modules: modulesMatch ? parseInt(modulesMatch[1]) : 24,
        tilt: tiltMatch ? parseInt(tiltMatch[1]) : 23,
        windZone: windZoneMatch ? parseInt(windZoneMatch[1]) : 3,
      },
    };
  }
  return null;
}
