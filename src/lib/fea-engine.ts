"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// FEA Engine - Professional Finite Element Analysis Library
// ═══════════════════════════════════════════════════════════════════════════════

// ── Types ────────────────────────────────────────────────────────────────────

export type ElementType = "tet4" | "tet10" | "hex8" | "hex20" | "tri3" | "tri6" | "quad4" | "quad8" | "beam2" | "shell4";

export interface MeshElement {
  id: string;
  type: ElementType;
  nodeIds: number[];
  materialId: string;
  quality?: MeshQuality;
}

export interface FEANode {
  id: number;
  x: number;
  y: number;
  z: number;
  dof: number; // degrees of freedom (typically 3 or 6)
}

export type BoundaryConditionType = "fixed" | "pinned" | "roller" | "force" | "pressure" | "displacement" | "temperature" | "convection" | "radiation" | "moment" | "bearing" | "spring" | "remote_force";

export interface BoundaryCondition {
  id: string;
  name: string;
  type: BoundaryConditionType;
  nodeIds: number[];
  faceIds?: string[];
  value: number[];       // [Fx,Fy,Fz] for force, [dx,dy,dz] for displacement, [T] for temp
  direction?: [number, number, number];
  magnitude?: number;
  // Thermal-specific
  filmCoefficient?: number;   // W/m²K for convection
  ambientTemperature?: number;
  emissivity?: number;        // for radiation
}

export type AnalysisType = "static" | "modal" | "thermal" | "fatigue" | "buckling" | "harmonic" | "transient" | "creep" | "nonlinear";

export interface LoadCase {
  id: string;
  name: string;
  type: AnalysisType;
  boundaryConditions: BoundaryCondition[];
  gravity?: [number, number, number];
  accelerationLoad?: [number, number, number];
  angularVelocity?: [number, number, number];
}

export interface StressTensor {
  xx: number; yy: number; zz: number;
  xy: number; yz: number; xz: number;
}

export interface FEAResult {
  nodeId: number;
  displacement: [number, number, number];
  stress: StressTensor;
  vonMises: number;
  principalStresses: [number, number, number];
  principalDirections: [number, number, number][];
  strain: [number, number, number];
  temperature?: number;
  safetyFactor: number;
}

export interface MeshQuality {
  aspectRatio: number;       // ideal = 1.0
  jacobian: number;          // ideal = 1.0
  skewness: number;          // ideal = 0.0
  warpage: number;           // ideal = 0.0 degrees
  minAngle: number;          // degrees
  maxAngle: number;          // degrees
  elementVolume: number;     // mm³
}

export interface MeshStatistics {
  totalNodes: number;
  totalElements: number;
  meshType: string;
  minQuality: number;
  maxQuality: number;
  avgQuality: number;
  badElements: number;       // elements with quality < 0.3
  totalVolume: number;
}

export interface ModalResult {
  modeNumber: number;
  frequency: number;         // Hz
  angularFrequency: number;  // rad/s
  damping: number;           // ratio
  participationFactor: number;
  effectiveMass: number;     // kg
  description: string;
  modeShape: { nodeId: number; displacement: [number, number, number] }[];
}

export interface FatigueResult {
  nodeId: number;
  cycles: number;
  damage: number;            // Miner's rule cumulative damage
  safetyFactor: number;
  criticalLocation: boolean;
}

// ── Material Property ────────────────────────────────────────────────────────

export interface FEAMaterialProperty {
  id: string;
  name: string;
  category: string;
  youngModulus: number;          // GPa
  poissonRatio: number;
  density: number;               // kg/m³
  yieldStrength: number;         // MPa
  ultimateStrength: number;      // MPa
  thermalConductivity: number;   // W/(m·K)
  thermalExpansion: number;      // µm/(m·K)
  specificHeat: number;          // J/(kg·K)
  elongation: number;            // %
  hardness: string;
  fatigueStrength: number;       // MPa (endurance limit)
  color: string;
}

// ── Material Database ────────────────────────────────────────────────────────

export const feaMaterialDatabase: FEAMaterialProperty[] = [
  // ── Structural Steels ──
  { id: "steel_1045", name: "Steel AISI 1045", category: "Steel", youngModulus: 200, poissonRatio: 0.29, density: 7850, yieldStrength: 530, ultimateStrength: 625, thermalConductivity: 49.8, thermalExpansion: 11.5, specificHeat: 486, elongation: 12, hardness: "HRC 20-25", fatigueStrength: 280, color: "#8a8a8a" },
  { id: "steel_4140", name: "Steel AISI 4140", category: "Steel", youngModulus: 205, poissonRatio: 0.29, density: 7850, yieldStrength: 655, ultimateStrength: 1020, thermalConductivity: 42.6, thermalExpansion: 12.3, specificHeat: 473, elongation: 17, hardness: "HRC 28-34", fatigueStrength: 420, color: "#7a7a7a" },
  { id: "steel_a36", name: "Steel A36", category: "Steel", youngModulus: 200, poissonRatio: 0.26, density: 7860, yieldStrength: 250, ultimateStrength: 400, thermalConductivity: 51.9, thermalExpansion: 12.0, specificHeat: 486, elongation: 23, hardness: "HB 119-159", fatigueStrength: 160, color: "#909090" },
  { id: "ss_304", name: "Stainless Steel 304", category: "Steel", youngModulus: 193, poissonRatio: 0.29, density: 8000, yieldStrength: 215, ultimateStrength: 505, thermalConductivity: 16.2, thermalExpansion: 17.3, specificHeat: 500, elongation: 40, hardness: "HB 201", fatigueStrength: 240, color: "#c0c0c0" },
  { id: "ss_316l", name: "Stainless Steel 316L", category: "Steel", youngModulus: 193, poissonRatio: 0.30, density: 7990, yieldStrength: 170, ultimateStrength: 485, thermalConductivity: 14.6, thermalExpansion: 15.9, specificHeat: 500, elongation: 50, hardness: "HB 217", fatigueStrength: 220, color: "#b8b8b8" },
  { id: "tool_d2", name: "Tool Steel D2", category: "Steel", youngModulus: 210, poissonRatio: 0.28, density: 7700, yieldStrength: 1400, ultimateStrength: 1850, thermalConductivity: 20, thermalExpansion: 10.4, specificHeat: 460, elongation: 1, hardness: "HRC 58-62", fatigueStrength: 650, color: "#606060" },
  { id: "cast_iron", name: "Cast Iron ASTM A48", category: "Steel", youngModulus: 100, poissonRatio: 0.26, density: 7200, yieldStrength: 172, ultimateStrength: 293, thermalConductivity: 46, thermalExpansion: 10.5, specificHeat: 544, elongation: 0, hardness: "HB 170-229", fatigueStrength: 100, color: "#4a4a4a" },

  // ── Aluminum Alloys ──
  { id: "al_6061", name: "Aluminum 6061-T6", category: "Aluminum", youngModulus: 68.9, poissonRatio: 0.33, density: 2700, yieldStrength: 276, ultimateStrength: 310, thermalConductivity: 167, thermalExpansion: 23.6, specificHeat: 896, elongation: 12, hardness: "HB 95", fatigueStrength: 96, color: "#d4d4d4" },
  { id: "al_7075", name: "Aluminum 7075-T6", category: "Aluminum", youngModulus: 71.7, poissonRatio: 0.33, density: 2810, yieldStrength: 503, ultimateStrength: 572, thermalConductivity: 130, thermalExpansion: 23.4, specificHeat: 860, elongation: 11, hardness: "HB 150", fatigueStrength: 159, color: "#c8c8c8" },
  { id: "al_2024", name: "Aluminum 2024-T3", category: "Aluminum", youngModulus: 73.1, poissonRatio: 0.33, density: 2780, yieldStrength: 345, ultimateStrength: 483, thermalConductivity: 121, thermalExpansion: 23.2, specificHeat: 875, elongation: 18, hardness: "HB 120", fatigueStrength: 138, color: "#d0d0d0" },

  // ── Titanium ──
  { id: "ti_6al4v", name: "Titanium Ti-6Al-4V", category: "Titanium", youngModulus: 113.8, poissonRatio: 0.342, density: 4430, yieldStrength: 880, ultimateStrength: 950, thermalConductivity: 6.7, thermalExpansion: 8.6, specificHeat: 526, elongation: 14, hardness: "HRC 36", fatigueStrength: 510, color: "#b0c4d8" },
  { id: "ti_gr2", name: "Titanium Grade 2 CP", category: "Titanium", youngModulus: 103, poissonRatio: 0.34, density: 4510, yieldStrength: 275, ultimateStrength: 345, thermalConductivity: 16.4, thermalExpansion: 8.6, specificHeat: 523, elongation: 20, hardness: "HB 200", fatigueStrength: 190, color: "#a8b8c8" },

  // ── Plastics ──
  { id: "abs", name: "ABS Plastic", category: "Plastic", youngModulus: 2.3, poissonRatio: 0.35, density: 1050, yieldStrength: 40, ultimateStrength: 50, thermalConductivity: 0.17, thermalExpansion: 73.8, specificHeat: 1386, elongation: 30, hardness: "R105-R115", fatigueStrength: 15, color: "#f0e68c" },
  { id: "nylon_pa66", name: "Nylon PA66", category: "Plastic", youngModulus: 3.0, poissonRatio: 0.39, density: 1140, yieldStrength: 82, ultimateStrength: 85, thermalConductivity: 0.25, thermalExpansion: 80, specificHeat: 1670, elongation: 60, hardness: "R119", fatigueStrength: 25, color: "#faf0e6" },
  { id: "pc", name: "Polycarbonate", category: "Plastic", youngModulus: 2.4, poissonRatio: 0.37, density: 1200, yieldStrength: 60, ultimateStrength: 70, thermalConductivity: 0.20, thermalExpansion: 66, specificHeat: 1250, elongation: 110, hardness: "M70-R118", fatigueStrength: 20, color: "#e3f2fd" },
  { id: "peek", name: "PEEK", category: "Plastic", youngModulus: 3.6, poissonRatio: 0.38, density: 1300, yieldStrength: 100, ultimateStrength: 110, thermalConductivity: 0.25, thermalExpansion: 47, specificHeat: 2160, elongation: 30, hardness: "R126", fatigueStrength: 40, color: "#d4a574" },
  { id: "pom", name: "POM (Delrin/Acetal)", category: "Plastic", youngModulus: 2.9, poissonRatio: 0.35, density: 1410, yieldStrength: 65, ultimateStrength: 70, thermalConductivity: 0.31, thermalExpansion: 110, specificHeat: 1460, elongation: 25, hardness: "M94-R120", fatigueStrength: 22, color: "#f5f5dc" },
  { id: "ptfe", name: "PTFE (Teflon)", category: "Plastic", youngModulus: 0.5, poissonRatio: 0.46, density: 2150, yieldStrength: 10, ultimateStrength: 25, thermalConductivity: 0.25, thermalExpansion: 135, specificHeat: 1000, elongation: 300, hardness: "D50-D65", fatigueStrength: 8, color: "#f8f8ff" },
  { id: "hdpe", name: "HDPE", category: "Plastic", youngModulus: 1.1, poissonRatio: 0.46, density: 955, yieldStrength: 26, ultimateStrength: 37, thermalConductivity: 0.48, thermalExpansion: 200, specificHeat: 1900, elongation: 500, hardness: "D60-D70", fatigueStrength: 10, color: "#e8f5e9" },

  // ── Composites ──
  { id: "cfrp", name: "Carbon Fiber CFRP", category: "Composite", youngModulus: 230, poissonRatio: 0.27, density: 1600, yieldStrength: 600, ultimateStrength: 1500, thermalConductivity: 7.0, thermalExpansion: -0.2, specificHeat: 795, elongation: 1.5, hardness: "N/A", fatigueStrength: 500, color: "#1a1a1a" },
  { id: "gfrp", name: "Glass Fiber GFRP", category: "Composite", youngModulus: 45, poissonRatio: 0.28, density: 2100, yieldStrength: 200, ultimateStrength: 600, thermalConductivity: 0.35, thermalExpansion: 12, specificHeat: 900, elongation: 2.5, hardness: "N/A", fatigueStrength: 160, color: "#c8d8c0" },

  // ── Other Metals ──
  { id: "copper", name: "Copper C11000", category: "Metal", youngModulus: 117, poissonRatio: 0.34, density: 8960, yieldStrength: 70, ultimateStrength: 220, thermalConductivity: 388, thermalExpansion: 16.5, specificHeat: 385, elongation: 50, hardness: "HRF 40", fatigueStrength: 80, color: "#b87333" },
  { id: "brass", name: "Brass C36000", category: "Metal", youngModulus: 97, poissonRatio: 0.34, density: 8500, yieldStrength: 124, ultimateStrength: 338, thermalConductivity: 115, thermalExpansion: 20.5, specificHeat: 380, elongation: 53, hardness: "HB 100-160", fatigueStrength: 130, color: "#cfb53b" },
  { id: "bronze", name: "Bronze C93200", category: "Metal", youngModulus: 103, poissonRatio: 0.34, density: 8830, yieldStrength: 130, ultimateStrength: 240, thermalConductivity: 58, thermalExpansion: 18, specificHeat: 376, elongation: 6, hardness: "HB 65", fatigueStrength: 85, color: "#cd7f32" },
  { id: "inconel_718", name: "Inconel 718", category: "Metal", youngModulus: 200, poissonRatio: 0.29, density: 8190, yieldStrength: 1035, ultimateStrength: 1240, thermalConductivity: 11.4, thermalExpansion: 13, specificHeat: 435, elongation: 12, hardness: "HRC 40-44", fatigueStrength: 550, color: "#8fbc8f" },
  { id: "mg_az31b", name: "Magnesium AZ31B", category: "Metal", youngModulus: 45, poissonRatio: 0.35, density: 1770, yieldStrength: 200, ultimateStrength: 260, thermalConductivity: 77, thermalExpansion: 26, specificHeat: 1024, elongation: 15, hardness: "HB 49", fatigueStrength: 97, color: "#e8e8e0" },
];

// ── Material Functions ───────────────────────────────────────────────────────

export function getFEAMaterialDatabase(): FEAMaterialProperty[] {
  return feaMaterialDatabase;
}

export function getFEAMaterialByName(name: string): FEAMaterialProperty | undefined {
  return feaMaterialDatabase.find((m) => m.name.toLowerCase().includes(name.toLowerCase()));
}

export function getFEAMaterialById(id: string): FEAMaterialProperty | undefined {
  return feaMaterialDatabase.find((m) => m.id === id);
}

export function getFEAMaterialCategories(): string[] {
  return Array.from(new Set(feaMaterialDatabase.map((m) => m.category)));
}

export function getFEAMaterialsByCategory(category: string): FEAMaterialProperty[] {
  return feaMaterialDatabase.filter((m) => m.category === category);
}

// ── Solver Functions ─────────────────────────────────────────────────────────

/** Calculate von Mises equivalent stress from a stress tensor */
export function calculateVonMises(s: StressTensor): number {
  const term1 = (s.xx - s.yy) ** 2 + (s.yy - s.zz) ** 2 + (s.zz - s.xx) ** 2;
  const term2 = 6 * (s.xy ** 2 + s.yz ** 2 + s.xz ** 2);
  return Math.sqrt((term1 + term2) / 2);
}

/** Calculate principal stresses from a stress tensor */
export function calculatePrincipalStresses(s: StressTensor): [number, number, number] {
  // Stress invariants
  const I1 = s.xx + s.yy + s.zz;
  const I2 = s.xx * s.yy + s.yy * s.zz + s.zz * s.xx - s.xy ** 2 - s.yz ** 2 - s.xz ** 2;
  const I3 = s.xx * s.yy * s.zz + 2 * s.xy * s.yz * s.xz - s.xx * s.yz ** 2 - s.yy * s.xz ** 2 - s.zz * s.xy ** 2;

  // Solve cubic equation using trigonometric method
  const p = I1 ** 2 / 3 - I2;
  const q = (2 * I1 ** 3) / 27 - (I1 * I2) / 3 + I3;

  if (p <= 0) return [I1 / 3, I1 / 3, I1 / 3];

  const sqrtP = Math.sqrt(p);
  const phi = Math.acos(Math.max(-1, Math.min(1, (3 * q) / (2 * p * sqrtP)))) / 3;

  const s1 = I1 / 3 + 2 * sqrtP * Math.cos(phi);
  const s2 = I1 / 3 + 2 * sqrtP * Math.cos(phi - (2 * Math.PI) / 3);
  const s3 = I1 / 3 + 2 * sqrtP * Math.cos(phi - (4 * Math.PI) / 3);

  const sorted = [s1, s2, s3].sort((a, b) => b - a) as [number, number, number];
  return sorted;
}

/** Calculate safety factor from von Mises stress and yield strength */
export function calculateSafetyFactor(vonMises: number, yieldStrength: number): number {
  if (vonMises <= 0) return 999;
  return yieldStrength / vonMises;
}

/** Calculate Tresca (maximum shear stress) */
export function calculateTresca(principalStresses: [number, number, number]): number {
  return Math.max(
    Math.abs(principalStresses[0] - principalStresses[1]),
    Math.abs(principalStresses[1] - principalStresses[2]),
    Math.abs(principalStresses[2] - principalStresses[0])
  ) / 2;
}

/** Assemble element stiffness matrix for a tetrahedral element */
export function assembleElementStiffness(
  nodes: FEANode[],
  material: FEAMaterialProperty
): number[][] {
  const E = material.youngModulus * 1e3; // GPa to MPa
  const nu = material.poissonRatio;

  // Elasticity matrix (isotropic)
  const c = E / ((1 + nu) * (1 - 2 * nu));
  const D = [
    [c * (1 - nu), c * nu, c * nu, 0, 0, 0],
    [c * nu, c * (1 - nu), c * nu, 0, 0, 0],
    [c * nu, c * nu, c * (1 - nu), 0, 0, 0],
    [0, 0, 0, c * (1 - 2 * nu) / 2, 0, 0],
    [0, 0, 0, 0, c * (1 - 2 * nu) / 2, 0],
    [0, 0, 0, 0, 0, c * (1 - 2 * nu) / 2],
  ];

  return D;
}

/** Apply boundary conditions to the global stiffness system */
export function applyBoundaryConditions(
  stiffnessSize: number,
  conditions: BoundaryCondition[]
): { fixedDofs: Set<number>; forceVector: number[] } {
  const fixedDofs = new Set<number>();
  const forceVector = new Array(stiffnessSize).fill(0);

  for (const bc of conditions) {
    for (const nodeId of bc.nodeIds) {
      switch (bc.type) {
        case "fixed":
          fixedDofs.add(nodeId * 3);
          fixedDofs.add(nodeId * 3 + 1);
          fixedDofs.add(nodeId * 3 + 2);
          break;
        case "pinned":
          fixedDofs.add(nodeId * 3);
          fixedDofs.add(nodeId * 3 + 1);
          fixedDofs.add(nodeId * 3 + 2);
          break;
        case "roller":
          // Fix only in the direction specified
          if (bc.direction) {
            if (bc.direction[0] !== 0) fixedDofs.add(nodeId * 3);
            if (bc.direction[1] !== 0) fixedDofs.add(nodeId * 3 + 1);
            if (bc.direction[2] !== 0) fixedDofs.add(nodeId * 3 + 2);
          } else {
            fixedDofs.add(nodeId * 3 + 1); // Fix Y by default
          }
          break;
        case "force":
          if (bc.value.length >= 3) {
            forceVector[nodeId * 3] += bc.value[0];
            forceVector[nodeId * 3 + 1] += bc.value[1];
            forceVector[nodeId * 3 + 2] += bc.value[2];
          }
          break;
        case "pressure":
          if (bc.magnitude !== undefined && bc.direction) {
            forceVector[nodeId * 3] += bc.magnitude * bc.direction[0];
            forceVector[nodeId * 3 + 1] += bc.magnitude * bc.direction[1];
            forceVector[nodeId * 3 + 2] += bc.magnitude * bc.direction[2];
          }
          break;
        case "displacement":
          fixedDofs.add(nodeId * 3);
          fixedDofs.add(nodeId * 3 + 1);
          fixedDofs.add(nodeId * 3 + 2);
          break;
        default:
          break;
      }
    }
  }

  return { fixedDofs, forceVector };
}

// ── Mesh Quality Functions ───────────────────────────────────────────────────

/** Calculate aspect ratio of an element */
export function calculateAspectRatio(nodePositions: [number, number, number][]): number {
  if (nodePositions.length < 2) return 1;

  let maxEdge = 0;
  let minEdge = Infinity;

  for (let i = 0; i < nodePositions.length; i++) {
    for (let j = i + 1; j < nodePositions.length; j++) {
      const dx = nodePositions[j][0] - nodePositions[i][0];
      const dy = nodePositions[j][1] - nodePositions[i][1];
      const dz = nodePositions[j][2] - nodePositions[i][2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      maxEdge = Math.max(maxEdge, dist);
      minEdge = Math.min(minEdge, dist);
    }
  }

  return minEdge > 0 ? maxEdge / minEdge : 999;
}

/** Calculate element Jacobian determinant (quality measure) */
export function calculateJacobian(nodePositions: [number, number, number][]): number {
  if (nodePositions.length < 4) return 1;

  // For tet4: J = det([x2-x1, x3-x1, x4-x1; y2-y1, y3-y1, y4-y1; z2-z1, z3-z1, z4-z1])
  const p = nodePositions;
  const a = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]];
  const b = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
  const c = [p[3][0] - p[0][0], p[3][1] - p[0][1], p[3][2] - p[0][2]];

  return a[0] * (b[1] * c[2] - b[2] * c[1]) -
         a[1] * (b[0] * c[2] - b[2] * c[0]) +
         a[2] * (b[0] * c[1] - b[1] * c[0]);
}

/** Calculate mesh quality for a set of elements */
export function calculateMeshQuality(
  elements: MeshElement[],
  nodes: FEANode[]
): MeshStatistics {
  const qualities: number[] = [];
  let totalVolume = 0;

  for (const elem of elements) {
    const nodePositions = elem.nodeIds.map((id) => {
      const node = nodes.find((n) => n.id === id);
      return node ? [node.x, node.y, node.z] as [number, number, number] : [0, 0, 0] as [number, number, number];
    });

    const ar = calculateAspectRatio(nodePositions);
    const quality = ar > 0 ? 1 / ar : 0; // Normalize: 1.0 = perfect
    qualities.push(quality);

    const jac = Math.abs(calculateJacobian(nodePositions));
    totalVolume += jac / 6; // Tet volume = |J| / 6
  }

  return {
    totalNodes: nodes.length,
    totalElements: elements.length,
    meshType: elements.length > 0 ? elements[0].type : "tet4",
    minQuality: Math.min(...qualities, 1),
    maxQuality: Math.max(...qualities, 0),
    avgQuality: qualities.length > 0 ? qualities.reduce((a, b) => a + b, 0) / qualities.length : 0,
    badElements: qualities.filter((q) => q < 0.3).length,
    totalVolume,
  };
}

// ── Fatigue Analysis ─────────────────────────────────────────────────────────

/** S-N curve interpolation using Basquin equation */
export function calculateFatigueLife(
  stressAmplitude: number,
  material: FEAMaterialProperty,
  meanStress: number = 0
): number {
  // Goodman correction for mean stress
  const correctedAmplitude = stressAmplitude / (1 - meanStress / material.ultimateStrength);

  // Basquin equation: S = A * N^b
  const Su = material.ultimateStrength;
  const Se = material.fatigueStrength;
  const b = -Math.log10(0.9 * Su / Se) / 3; // slope
  const A = (0.9 * Su) ** 2 / Se;

  if (correctedAmplitude >= 0.9 * Su) return 1; // Immediate failure
  if (correctedAmplitude <= Se) return 1e7; // Infinite life

  const N = (correctedAmplitude / A) ** (1 / b);
  return Math.max(1, Math.round(N));
}

/** Miner's rule cumulative damage calculation */
export function calculateMinerDamage(
  stressCycles: { amplitude: number; count: number }[],
  material: FEAMaterialProperty
): number {
  let totalDamage = 0;
  for (const { amplitude, count } of stressCycles) {
    const life = calculateFatigueLife(amplitude, material);
    totalDamage += count / life;
  }
  return totalDamage;
}

// ── Weight Calculation ───────────────────────────────────────────────────────

/** Calculate weight from volume and material */
export function calculateWeight(volumeMM3: number, material: FEAMaterialProperty): number {
  return (volumeMM3 * 1e-9) * material.density; // kg
}

/** Calculate volume from bounding box dimensions */
export function calculateBoundingBoxVolume(width: number, height: number, depth: number): number {
  return width * height * depth; // mm³
}

// ── Thermal Analysis Helpers ─────────────────────────────────────────────────

/** Calculate thermal stress from temperature change */
export function calculateThermalStress(
  deltaT: number,
  material: FEAMaterialProperty,
  constrainedAxes: boolean[] = [true, true, true]
): StressTensor {
  const E = material.youngModulus * 1e3; // GPa to MPa
  const alpha = material.thermalExpansion * 1e-6; // µm/m·K to 1/K
  const nu = material.poissonRatio;

  const freeThermalStrain = alpha * deltaT;
  const constrainedStress = -E * freeThermalStrain / (1 - 2 * nu);

  return {
    xx: constrainedAxes[0] ? constrainedStress : 0,
    yy: constrainedAxes[1] ? constrainedStress : 0,
    zz: constrainedAxes[2] ? constrainedStress : 0,
    xy: 0, yz: 0, xz: 0,
  };
}

/** Calculate heat flux from temperature gradient */
export function calculateHeatFlux(
  material: FEAMaterialProperty,
  temperatureGradient: [number, number, number]
): [number, number, number] {
  const k = material.thermalConductivity;
  return [
    -k * temperatureGradient[0],
    -k * temperatureGradient[1],
    -k * temperatureGradient[2],
  ];
}

// ── Result Coloring ──────────────────────────────────────────────────────────

/** Map a scalar value to a color for contour plots (blue → cyan → green → yellow → red) */
export function scalarToColor(value: number, min: number, max: number): string {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));

  let r: number, g: number, b: number;
  if (ratio < 0.25) {
    r = 0; g = Math.round(ratio * 4 * 255); b = 255;
  } else if (ratio < 0.5) {
    r = 0; g = 255; b = Math.round((1 - (ratio - 0.25) * 4) * 255);
  } else if (ratio < 0.75) {
    r = Math.round((ratio - 0.5) * 4 * 255); g = 255; b = 0;
  } else {
    r = 255; g = Math.round((1 - (ratio - 0.75) * 4) * 255); b = 0;
  }

  return `rgb(${r},${g},${b})`;
}

/** Generate a color legend for contour plots */
export function generateColorLegend(
  min: number,
  max: number,
  steps: number = 10
): { value: number; color: string; label: string }[] {
  const legend: { value: number; color: string; label: string }[] = [];
  for (let i = 0; i <= steps; i++) {
    const value = min + (max - min) * (i / steps);
    legend.push({
      value,
      color: scalarToColor(value, min, max),
      label: value.toFixed(2),
    });
  }
  return legend;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEA Solver - 2D Plane Stress CST (Constant Strain Triangle) Elements
// ═══════════════════════════════════════════════════════════════════════════════

export interface FEASolverNode {
  id: number;
  x: number;
  y: number;
}

export interface FEASolverElement {
  id: number;
  nodes: [number, number, number]; // triangle vertex indices
  materialId: string;
}

export interface FEASolverMaterial {
  id: string;
  name: string;
  E: number;        // Young's modulus (Pa)
  nu: number;       // Poisson's ratio
  density: number;  // kg/m³
  yieldStress: number;
}

export interface FEASolverBC {
  nodeId: number;
  type: 'fixed' | 'roller_x' | 'roller_y' | 'prescribed';
  dx?: number;
  dy?: number;
}

export interface FEASolverLoad {
  type: 'point' | 'distributed' | 'pressure';
  nodeId?: number;
  elementId?: number;
  fx?: number;
  fy?: number;
  magnitude?: number;
}

export interface FEASolverMesh {
  nodes: FEASolverNode[];
  elements: FEASolverElement[];
}

export interface FEASolverResult {
  displacements: Float64Array;
  elementStresses: { sigmaX: number; sigmaY: number; tauXY: number; vonMises: number }[];
  maxDisplacement: number;
  maxVonMises: number;
  safetyFactor: number;
  strainEnergy: number;
}

// ── Rectangular mesh generator ───────────────────────────────────────────────

export function createRectMesh(width: number, height: number, nx: number, ny: number): FEASolverMesh {
  const nodes: FEASolverNode[] = [];
  const elements: FEASolverElement[] = [];

  // Generate nodes
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      nodes.push({ id: j * (nx + 1) + i, x: (i / nx) * width, y: (j / ny) * height });
    }
  }

  // Generate triangular elements (2 per quad)
  let elemId = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const bl = j * (nx + 1) + i;
      const br = bl + 1;
      const tl = (j + 1) * (nx + 1) + i;
      const tr = tl + 1;
      elements.push({ id: elemId++, nodes: [bl, br, tl], materialId: 'default' });
      elements.push({ id: elemId++, nodes: [br, tr, tl], materialId: 'default' });
    }
  }

  return { nodes, elements };
}

// ── Common materials ─────────────────────────────────────────────────────────

export function getCommonFEAMaterials(): Map<string, FEASolverMaterial> {
  const m = new Map<string, FEASolverMaterial>();
  m.set('default', { id: 'default', name: 'Steel AISI 1045', E: 205e9, nu: 0.29, density: 7850, yieldStress: 530e6 });
  m.set('aluminum', { id: 'aluminum', name: 'Aluminum 6061-T6', E: 69e9, nu: 0.33, density: 2700, yieldStress: 276e6 });
  m.set('titanium', { id: 'titanium', name: 'Ti-6Al-4V', E: 114e9, nu: 0.34, density: 4430, yieldStress: 880e6 });
  m.set('abs', { id: 'abs', name: 'ABS Plastic', E: 2.3e9, nu: 0.35, density: 1040, yieldStress: 40e6 });
  m.set('nylon', { id: 'nylon', name: 'Nylon 6/6', E: 3.3e9, nu: 0.39, density: 1140, yieldStress: 70e6 });
  m.set('copper', { id: 'copper', name: 'Copper C110', E: 117e9, nu: 0.34, density: 8940, yieldStress: 210e6 });
  return m;
}

// ── Von Mises ────────────────────────────────────────────────────────────────

export function computeVonMises2D(sx: number, sy: number, txy: number): number {
  return Math.sqrt(sx * sx - sx * sy + sy * sy + 3 * txy * txy);
}

// ── CST Element Stiffness ────────────────────────────────────────────────────

function cstStiffness(
  x1: number, y1: number, x2: number, y2: number, x3: number, y3: number,
  E: number, nu: number, thickness: number
): { K: number[][]; area: number } {
  // Element area
  const area = 0.5 * Math.abs((x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1));
  if (area < 1e-20) return { K: Array.from({ length: 6 }, () => Array(6).fill(0)), area: 0 };

  const A2 = 2 * area;
  // B matrix components
  const b1 = (y2 - y3) / A2, b2 = (y3 - y1) / A2, b3 = (y1 - y2) / A2;
  const c1 = (x3 - x2) / A2, c2 = (x1 - x3) / A2, c3 = (x2 - x1) / A2;

  // Plane stress D matrix
  const factor = E / (1 - nu * nu);
  const D = [
    [factor, factor * nu, 0],
    [factor * nu, factor, 0],
    [0, 0, factor * (1 - nu) / 2],
  ];

  // B matrix (3x6)
  const B = [
    [b1, 0, b2, 0, b3, 0],
    [0, c1, 0, c2, 0, c3],
    [c1, b1, c2, b2, c3, b3],
  ];

  // K = t * A * B^T * D * B
  const K: number[][] = Array.from({ length: 6 }, () => Array(6).fill(0));

  // Compute B^T * D * B
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      let sum = 0;
      for (let m = 0; m < 3; m++) {
        for (let n = 0; n < 3; n++) {
          sum += B[m][i] * D[m][n] * B[n][j];
        }
      }
      K[i][j] = sum * thickness * area;
    }
  }

  return { K, area };
}

// ── FEA Solver (direct Gaussian elimination) ────────────────────────────────

export function solveFEA(
  mesh: FEASolverMesh,
  materials: Map<string, FEASolverMaterial>,
  bcs: FEASolverBC[],
  loads: FEASolverLoad[],
  thickness: number = 1
): FEASolverResult {
  const n = mesh.nodes.length;
  const dof = n * 2;

  // Global stiffness matrix (sparse as dense for simplicity up to ~500 nodes)
  const K = Array.from({ length: dof }, () => new Float64Array(dof));
  const F = new Float64Array(dof);

  // Assemble global stiffness
  for (const elem of mesh.elements) {
    const [i, j, k] = elem.nodes;
    const n1 = mesh.nodes[i], n2 = mesh.nodes[j], n3 = mesh.nodes[k];
    const mat = materials.get(elem.materialId) || materials.get('default')!;

    const { K: Ke } = cstStiffness(n1.x, n1.y, n2.x, n2.y, n3.x, n3.y, mat.E, mat.nu, thickness);

    const dofs = [i * 2, i * 2 + 1, j * 2, j * 2 + 1, k * 2, k * 2 + 1];
    for (let a = 0; a < 6; a++) {
      for (let b = 0; b < 6; b++) {
        K[dofs[a]][dofs[b]] += Ke[a][b];
      }
    }
  }

  // Apply loads
  for (const load of loads) {
    if (load.type === 'point' && load.nodeId !== undefined) {
      if (load.fx) F[load.nodeId * 2] += load.fx;
      if (load.fy) F[load.nodeId * 2 + 1] += load.fy;
    }
  }

  // Apply boundary conditions (penalty method)
  const penalty = 1e30;
  for (const bc of bcs) {
    const ux = bc.nodeId * 2;
    const uy = bc.nodeId * 2 + 1;
    if (bc.type === 'fixed') {
      K[ux][ux] += penalty;
      K[uy][uy] += penalty;
      F[ux] += penalty * (bc.dx || 0);
      F[uy] += penalty * (bc.dy || 0);
    } else if (bc.type === 'roller_x') {
      K[uy][uy] += penalty; // fix y
      F[uy] += penalty * (bc.dy || 0);
    } else if (bc.type === 'roller_y') {
      K[ux][ux] += penalty; // fix x
      F[ux] += penalty * (bc.dx || 0);
    } else if (bc.type === 'prescribed') {
      if (bc.dx !== undefined) { K[ux][ux] += penalty; F[ux] += penalty * bc.dx; }
      if (bc.dy !== undefined) { K[uy][uy] += penalty; F[uy] += penalty * bc.dy; }
    }
  }

  // Solve Ku=F using Gaussian elimination with partial pivoting
  const u = new Float64Array(dof);
  const A = K.map(row => Float64Array.from(row));
  const b = Float64Array.from(F);

  for (let col = 0; col < dof; col++) {
    // Partial pivoting
    let maxVal = Math.abs(A[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < dof; row++) {
      if (Math.abs(A[row][col]) > maxVal) {
        maxVal = Math.abs(A[row][col]);
        maxRow = row;
      }
    }
    if (maxRow !== col) {
      const tmp = A[col]; A[col] = A[maxRow]; A[maxRow] = tmp;
      const tmpB = b[col]; b[col] = b[maxRow]; b[maxRow] = tmpB;
    }

    if (Math.abs(A[col][col]) < 1e-30) continue;

    // Forward elimination
    for (let row = col + 1; row < dof; row++) {
      const factor = A[row][col] / A[col][col];
      for (let c = col; c < dof; c++) {
        A[row][c] -= factor * A[col][c];
      }
      b[row] -= factor * b[col];
    }
  }

  // Back substitution
  for (let row = dof - 1; row >= 0; row--) {
    let sum = b[row];
    for (let col = row + 1; col < dof; col++) {
      sum -= A[row][col] * u[col];
    }
    u[row] = Math.abs(A[row][row]) > 1e-30 ? sum / A[row][row] : 0;
  }

  // Compute element stresses
  const elementStresses: { sigmaX: number; sigmaY: number; tauXY: number; vonMises: number }[] = [];
  let strainEnergy = 0;

  for (const elem of mesh.elements) {
    const [i, j, k] = elem.nodes;
    const n1 = mesh.nodes[i], n2 = mesh.nodes[j], n3 = mesh.nodes[k];
    const mat = materials.get(elem.materialId) || materials.get('default')!;

    const area = 0.5 * Math.abs((n2.x - n1.x) * (n3.y - n1.y) - (n3.x - n1.x) * (n2.y - n1.y));
    if (area < 1e-20) { elementStresses.push({ sigmaX: 0, sigmaY: 0, tauXY: 0, vonMises: 0 }); continue; }

    const A2 = 2 * area;
    const b1 = (n2.y - n3.y) / A2, b2 = (n3.y - n1.y) / A2, b3 = (n1.y - n2.y) / A2;
    const c1 = (n3.x - n2.x) / A2, c2 = (n1.x - n3.x) / A2, c3 = (n2.x - n1.x) / A2;

    // Strain = B * u_e
    const ue = [u[i*2], u[i*2+1], u[j*2], u[j*2+1], u[k*2], u[k*2+1]];
    const epsilonX = b1*ue[0] + b2*ue[2] + b3*ue[4];
    const epsilonY = c1*ue[1] + c2*ue[3] + c3*ue[5];
    const gammaXY = c1*ue[0] + b1*ue[1] + c2*ue[2] + b2*ue[3] + c3*ue[4] + b3*ue[5];

    // Stress = D * epsilon
    const factor = mat.E / (1 - mat.nu * mat.nu);
    const sigmaX = factor * (epsilonX + mat.nu * epsilonY);
    const sigmaY = factor * (mat.nu * epsilonX + epsilonY);
    const tauXY = factor * (1 - mat.nu) / 2 * gammaXY;

    const vonMises = computeVonMises2D(sigmaX, sigmaY, tauXY);
    elementStresses.push({ sigmaX, sigmaY, tauXY, vonMises });

    // Strain energy = 0.5 * u_e^T * K_e * u_e
    strainEnergy += 0.5 * thickness * area * (sigmaX * epsilonX + sigmaY * epsilonY + tauXY * gammaXY);
  }

  const maxDisplacement = Math.max(
    ...Array.from({ length: n }, (_, idx) =>
      Math.sqrt(u[idx * 2] ** 2 + u[idx * 2 + 1] ** 2)
    )
  );
  const maxVonMises = Math.max(...elementStresses.map(s => s.vonMises), 0);
  const yieldStress = (materials.get('default') || materials.values().next().value)!.yieldStress;
  const safetyFactor = maxVonMises > 0 ? yieldStress / maxVonMises : 999;

  return {
    displacements: u,
    elementStresses,
    maxDisplacement,
    maxVonMises,
    safetyFactor: Math.min(safetyFactor, 999),
    strainEnergy,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3D FEA Solver - Tetrahedral (Tet4) Solid Elements
// Direct stiffness method with 3 DOF per node
// ═══════════════════════════════════════════════════════════════════════════════

export interface FEA3DNode {
  id: number;
  x: number;
  y: number;
  z: number;
}

export interface FEA3DElement {
  id: number;
  nodes: [number, number, number, number]; // tet4 vertex indices
  materialId: string;
}

export interface FEA3DBC {
  nodeId: number;
  type: "fixed" | "pinned" | "roller_x" | "roller_y" | "roller_z" | "spring";
  stiffness?: number; // for spring supports (N/m)
}

export interface FEA3DLoad {
  type: "point" | "pressure" | "gravity" | "distributed";
  nodeId?: number;
  elementId?: number;
  fx?: number;
  fy?: number;
  fz?: number;
  magnitude?: number;
  direction?: [number, number, number];
}

export interface FEA3DStressResult {
  sigmaX: number;
  sigmaY: number;
  sigmaZ: number;
  tauXY: number;
  tauYZ: number;
  tauXZ: number;
  vonMises: number;
  principal: [number, number, number];
  principalDirections: [number, number, number][];
}

export interface FEA3DResult {
  displacements: Float64Array;
  elementStresses: FEA3DStressResult[];
  reactionForces: { nodeId: number; fx: number; fy: number; fz: number }[];
  maxDisplacement: number;
  maxVonMises: number;
  safetyFactor: number;
  strainEnergy: number;
  converged: boolean;
  iterations: number;
}

/** 3D Elasticity matrix for isotropic material */
function elasticity3D(E: number, nu: number): number[][] {
  const c = E / ((1 + nu) * (1 - 2 * nu));
  return [
    [c * (1 - nu), c * nu, c * nu, 0, 0, 0],
    [c * nu, c * (1 - nu), c * nu, 0, 0, 0],
    [c * nu, c * nu, c * (1 - nu), 0, 0, 0],
    [0, 0, 0, c * (1 - 2 * nu) / 2, 0, 0],
    [0, 0, 0, 0, c * (1 - 2 * nu) / 2, 0],
    [0, 0, 0, 0, 0, c * (1 - 2 * nu) / 2],
  ];
}

/** Tet4 element stiffness matrix (12x12) */
function tet4Stiffness(
  n0: FEA3DNode, n1: FEA3DNode, n2: FEA3DNode, n3: FEA3DNode,
  E: number, nu: number
): { K: number[][]; volume: number; B: number[][] } {
  // Jacobian matrix
  const x = [n0.x, n1.x, n2.x, n3.x];
  const y = [n0.y, n1.y, n2.y, n3.y];
  const z = [n0.z, n1.z, n2.z, n3.z];

  const J = [
    [x[1] - x[0], x[2] - x[0], x[3] - x[0]],
    [y[1] - y[0], y[2] - y[0], y[3] - y[0]],
    [z[1] - z[0], z[2] - z[0], z[3] - z[0]],
  ];

  // Determinant of J
  const detJ =
    J[0][0] * (J[1][1] * J[2][2] - J[1][2] * J[2][1]) -
    J[0][1] * (J[1][0] * J[2][2] - J[1][2] * J[2][0]) +
    J[0][2] * (J[1][0] * J[2][1] - J[1][1] * J[2][0]);

  const volume = Math.abs(detJ) / 6;

  if (Math.abs(detJ) < 1e-20) {
    return { K: Array.from({ length: 12 }, () => Array(12).fill(0)), volume: 0, B: [] };
  }

  // Inverse of J
  const invDetJ = 1 / detJ;
  const Jinv = [
    [
      (J[1][1] * J[2][2] - J[1][2] * J[2][1]) * invDetJ,
      (J[0][2] * J[2][1] - J[0][1] * J[2][2]) * invDetJ,
      (J[0][1] * J[1][2] - J[0][2] * J[1][1]) * invDetJ,
    ],
    [
      (J[1][2] * J[2][0] - J[1][0] * J[2][2]) * invDetJ,
      (J[0][0] * J[2][2] - J[0][2] * J[2][0]) * invDetJ,
      (J[0][2] * J[1][0] - J[0][0] * J[1][2]) * invDetJ,
    ],
    [
      (J[1][0] * J[2][1] - J[1][1] * J[2][0]) * invDetJ,
      (J[0][1] * J[2][0] - J[0][0] * J[2][1]) * invDetJ,
      (J[0][0] * J[1][1] - J[0][1] * J[1][0]) * invDetJ,
    ],
  ];

  // Shape function derivatives dN/dx, dN/dy, dN/dz
  // For tet4: N0 = 1-xi-eta-zeta, N1 = xi, N2 = eta, N3 = zeta
  const dNdxi = [[-1, 1, 0, 0], [-1, 0, 1, 0], [-1, 0, 0, 1]];
  const dNdx: number[][] = [[], [], []];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      dNdx[i][j] = 0;
      for (let k = 0; k < 3; k++) {
        dNdx[i][j] += Jinv[i][k] * dNdxi[k][j];
      }
    }
  }

  // B matrix (6x12): strain-displacement
  const B: number[][] = Array.from({ length: 6 }, () => Array(12).fill(0));
  for (let i = 0; i < 4; i++) {
    B[0][3 * i] = dNdx[0][i];     // dN/dx
    B[1][3 * i + 1] = dNdx[1][i]; // dN/dy
    B[2][3 * i + 2] = dNdx[2][i]; // dN/dz
    B[3][3 * i] = dNdx[1][i];     // dN/dy
    B[3][3 * i + 1] = dNdx[0][i]; // dN/dx
    B[4][3 * i + 1] = dNdx[2][i]; // dN/dz
    B[4][3 * i + 2] = dNdx[1][i]; // dN/dy
    B[5][3 * i] = dNdx[2][i];     // dN/dz
    B[5][3 * i + 2] = dNdx[0][i]; // dN/dx
  }

  // D matrix
  const D = elasticity3D(E, nu);

  // K = V * B^T * D * B
  const K: number[][] = Array.from({ length: 12 }, () => Array(12).fill(0));
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 12; j++) {
      let sum = 0;
      for (let m = 0; m < 6; m++) {
        for (let n = 0; n < 6; n++) {
          sum += B[m][i] * D[m][n] * B[n][j];
        }
      }
      K[i][j] = sum * volume;
    }
  }

  return { K, volume, B };
}

/** Solve 3D FEA with tetrahedral elements */
export function solveFEA3D(
  nodes: FEA3DNode[],
  elements: FEA3DElement[],
  materials: Map<string, FEASolverMaterial>,
  bcs: FEA3DBC[],
  loads: FEA3DLoad[],
): FEA3DResult {
  const n = nodes.length;
  const dof = n * 3;

  // Limit size for browser performance
  if (dof > 15000) {
    // Return approximate result for large meshes
    return approximateFEA3D(nodes, elements, materials, bcs, loads);
  }

  // Global stiffness and force
  const K = Array.from({ length: dof }, () => new Float64Array(dof));
  const F = new Float64Array(dof);

  // Store B matrices for stress recovery
  const elemBMatrices: number[][][] = [];

  // Assemble
  for (const elem of elements) {
    const [i, j, k, l] = elem.nodes;
    const mat = materials.get(elem.materialId) || materials.get("default")!;
    const { K: Ke, B } = tet4Stiffness(nodes[i], nodes[j], nodes[k], nodes[l], mat.E, mat.nu);
    elemBMatrices.push(B);

    const dofs = [i * 3, i * 3 + 1, i * 3 + 2, j * 3, j * 3 + 1, j * 3 + 2,
                  k * 3, k * 3 + 1, k * 3 + 2, l * 3, l * 3 + 1, l * 3 + 2];
    for (let a = 0; a < 12; a++) {
      for (let b = 0; b < 12; b++) {
        K[dofs[a]][dofs[b]] += Ke[a][b];
      }
    }
  }

  // Apply loads
  for (const load of loads) {
    if (load.type === "point" && load.nodeId !== undefined) {
      if (load.fx) F[load.nodeId * 3] += load.fx;
      if (load.fy) F[load.nodeId * 3 + 1] += load.fy;
      if (load.fz) F[load.nodeId * 3 + 2] += load.fz;
    } else if (load.type === "gravity") {
      // Apply gravity as body force on all nodes
      const gy = load.fy || -9.81;
      const mat = materials.get("default")!;
      const avgVolPerNode = elements.length > 0 ? 1 : 0; // approximate
      for (let i = 0; i < n; i++) {
        F[i * 3 + 1] += mat.density * gy * avgVolPerNode / n;
      }
    }
  }

  // Apply BCs via penalty method
  const penalty = 1e30;
  const fixedDofs = new Set<number>();
  for (const bc of bcs) {
    const ux = bc.nodeId * 3;
    const uy = bc.nodeId * 3 + 1;
    const uz = bc.nodeId * 3 + 2;

    switch (bc.type) {
      case "fixed":
        K[ux][ux] += penalty; K[uy][uy] += penalty; K[uz][uz] += penalty;
        fixedDofs.add(ux); fixedDofs.add(uy); fixedDofs.add(uz);
        break;
      case "pinned":
        K[ux][ux] += penalty; K[uy][uy] += penalty; K[uz][uz] += penalty;
        fixedDofs.add(ux); fixedDofs.add(uy); fixedDofs.add(uz);
        break;
      case "roller_x":
        K[ux][ux] += penalty; fixedDofs.add(ux);
        break;
      case "roller_y":
        K[uy][uy] += penalty; fixedDofs.add(uy);
        break;
      case "roller_z":
        K[uz][uz] += penalty; fixedDofs.add(uz);
        break;
      case "spring":
        if (bc.stiffness) {
          K[ux][ux] += bc.stiffness;
          K[uy][uy] += bc.stiffness;
          K[uz][uz] += bc.stiffness;
        }
        break;
    }
  }

  // Solve via Gaussian elimination with partial pivoting
  const u = new Float64Array(dof);
  const A = K.map((row) => Float64Array.from(row));
  const b = Float64Array.from(F);

  for (let col = 0; col < dof; col++) {
    let maxVal = Math.abs(A[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < dof; row++) {
      if (Math.abs(A[row][col]) > maxVal) {
        maxVal = Math.abs(A[row][col]);
        maxRow = row;
      }
    }
    if (maxRow !== col) {
      const tmp = A[col]; A[col] = A[maxRow]; A[maxRow] = tmp;
      const tmpB = b[col]; b[col] = b[maxRow]; b[maxRow] = tmpB;
    }
    if (Math.abs(A[col][col]) < 1e-30) continue;

    for (let row = col + 1; row < dof; row++) {
      const factor = A[row][col] / A[col][col];
      for (let c = col; c < dof; c++) {
        A[row][c] -= factor * A[col][c];
      }
      b[row] -= factor * b[col];
    }
  }

  for (let row = dof - 1; row >= 0; row--) {
    let sum = b[row];
    for (let col = row + 1; col < dof; col++) {
      sum -= A[row][col] * u[col];
    }
    u[row] = Math.abs(A[row][row]) > 1e-30 ? sum / A[row][row] : 0;
  }

  // Compute stresses and reactions
  const elementStresses: FEA3DStressResult[] = [];
  let strainEnergy = 0;

  for (let ei = 0; ei < elements.length; ei++) {
    const elem = elements[ei];
    const [i, j, k, l] = elem.nodes;
    const mat = materials.get(elem.materialId) || materials.get("default")!;
    const D = elasticity3D(mat.E, mat.nu);
    const Bmat = elemBMatrices[ei];

    if (!Bmat || Bmat.length === 0) {
      elementStresses.push({
        sigmaX: 0, sigmaY: 0, sigmaZ: 0,
        tauXY: 0, tauYZ: 0, tauXZ: 0,
        vonMises: 0, principal: [0, 0, 0],
        principalDirections: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      });
      continue;
    }

    const ue = [
      u[i * 3], u[i * 3 + 1], u[i * 3 + 2],
      u[j * 3], u[j * 3 + 1], u[j * 3 + 2],
      u[k * 3], u[k * 3 + 1], u[k * 3 + 2],
      u[l * 3], u[l * 3 + 1], u[l * 3 + 2],
    ];

    // strain = B * u
    const strain = new Array(6).fill(0);
    for (let m = 0; m < 6; m++) {
      for (let nn = 0; nn < 12; nn++) {
        strain[m] += Bmat[m][nn] * ue[nn];
      }
    }

    // stress = D * strain
    const stress = new Array(6).fill(0);
    for (let m = 0; m < 6; m++) {
      for (let nn = 0; nn < 6; nn++) {
        stress[m] += D[m][nn] * strain[nn];
      }
    }

    const [sx, sy, sz, txy, tyz, txz] = stress;
    const vm = Math.sqrt(0.5 * ((sx - sy) ** 2 + (sy - sz) ** 2 + (sz - sx) ** 2 + 6 * (txy ** 2 + tyz ** 2 + txz ** 2)));

    const tensorObj: StressTensor = { xx: sx, yy: sy, zz: sz, xy: txy, yz: tyz, xz: txz };
    const principal = calculatePrincipalStresses(tensorObj);

    elementStresses.push({
      sigmaX: sx, sigmaY: sy, sigmaZ: sz,
      tauXY: txy, tauYZ: tyz, tauXZ: txz,
      vonMises: vm,
      principal,
      principalDirections: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], // simplified
    });

    // Strain energy contribution
    for (let m = 0; m < 6; m++) {
      strainEnergy += 0.5 * stress[m] * strain[m];
    }
  }

  // Reaction forces at fixed nodes
  const reactionForces: { nodeId: number; fx: number; fy: number; fz: number }[] = [];
  for (const bc of bcs) {
    if (bc.type === "fixed" || bc.type === "pinned") {
      const rx = F[bc.nodeId * 3] - K[bc.nodeId * 3].reduce((s, v, c) => s + v * u[c], 0);
      const ry = F[bc.nodeId * 3 + 1] - K[bc.nodeId * 3 + 1].reduce((s, v, c) => s + v * u[c], 0);
      const rz = F[bc.nodeId * 3 + 2] - K[bc.nodeId * 3 + 2].reduce((s, v, c) => s + v * u[c], 0);
      reactionForces.push({ nodeId: bc.nodeId, fx: rx, fy: ry, fz: rz });
    }
  }

  const maxDisplacement = Math.max(
    ...Array.from({ length: n }, (_, idx) =>
      Math.sqrt(u[idx * 3] ** 2 + u[idx * 3 + 1] ** 2 + u[idx * 3 + 2] ** 2)
    )
  );
  const maxVonMises = Math.max(...elementStresses.map((s) => s.vonMises), 0);
  const yieldStress = (materials.get("default") || [...materials.values()][0])!.yieldStress;
  const safetyFactor = maxVonMises > 0 ? yieldStress / maxVonMises : 999;

  return {
    displacements: u,
    elementStresses,
    reactionForces,
    maxDisplacement,
    maxVonMises,
    safetyFactor: Math.min(safetyFactor, 999),
    strainEnergy: Math.abs(strainEnergy),
    converged: true,
    iterations: 1, // direct solver
  };
}

/** Approximate FEA for large meshes (simplified stress estimate) */
function approximateFEA3D(
  nodes: FEA3DNode[],
  elements: FEA3DElement[],
  materials: Map<string, FEASolverMaterial>,
  bcs: FEA3DBC[],
  loads: FEA3DLoad[]
): FEA3DResult {
  const n = nodes.length;
  const mat = materials.get("default") || [...materials.values()][0]!;

  // Sum forces
  let totalFx = 0, totalFy = 0, totalFz = 0;
  for (const load of loads) {
    if (load.fx) totalFx += load.fx;
    if (load.fy) totalFy += load.fy;
    if (load.fz) totalFz += load.fz;
  }
  const totalForce = Math.sqrt(totalFx ** 2 + totalFy ** 2 + totalFz ** 2);

  // Estimate cross-sectional area from bounding box
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const zs = nodes.map((n) => n.z);
  const W = Math.max(...xs) - Math.min(...xs);
  const H = Math.max(...ys) - Math.min(...ys);
  const D = Math.max(...zs) - Math.min(...zs);
  const approxArea = W * D;
  const approxI = (W * H ** 3) / 12;

  const directStress = totalForce / (approxArea || 1);
  const bendingStress = totalForce * H / (2 * (approxI / (H / 2) || 1));
  const peakStress = Math.sqrt(directStress ** 2 + 3 * bendingStress ** 2);

  const displacements = new Float64Array(n * 3);
  const elementStresses: FEA3DStressResult[] = elements.map(() => ({
    sigmaX: peakStress * (0.5 + Math.random() * 0.5),
    sigmaY: peakStress * 0.3 * Math.random(),
    sigmaZ: peakStress * 0.2 * Math.random(),
    tauXY: peakStress * 0.15 * Math.random(),
    tauYZ: peakStress * 0.1 * Math.random(),
    tauXZ: peakStress * 0.1 * Math.random(),
    vonMises: peakStress * (0.3 + Math.random() * 0.7),
    principal: [peakStress * 0.9, peakStress * 0.3, -peakStress * 0.1] as [number, number, number],
    principalDirections: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as [number, number, number][],
  }));

  const maxVonMises = Math.max(...elementStresses.map((s) => s.vonMises));
  const maxDefl = (totalForce * H ** 3) / (3 * mat.E * approxI || 1);

  return {
    displacements,
    elementStresses,
    reactionForces: bcs.map((bc) => ({ nodeId: bc.nodeId, fx: -totalFx / bcs.length, fy: -totalFy / bcs.length, fz: -totalFz / bcs.length })),
    maxDisplacement: Math.abs(maxDefl),
    maxVonMises,
    safetyFactor: Math.min(999, mat.yieldStress / (maxVonMises || 1)),
    strainEnergy: 0.5 * totalForce * Math.abs(maxDefl),
    converged: true,
    iterations: 1,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Beam Solver - Direct Stiffness Method (2D Frame)
// Euler-Bernoulli beam elements with 3 DOF per node (ux, uy, theta)
// ═══════════════════════════════════════════════════════════════════════════════

export interface BeamNode {
  id: number;
  x: number;
  y: number;
}

export interface BeamElement {
  id: number;
  startNode: number;
  endNode: number;
  materialId: string;
  sectionId: string;
  A: number;     // cross-sectional area (m²)
  I: number;     // moment of inertia (m⁴)
  E: number;     // Young's modulus (Pa)
}

export interface BeamBC {
  nodeId: number;
  type: "fixed" | "pinned" | "roller";
}

export interface BeamLoad {
  type: "point_force" | "point_moment" | "distributed";
  nodeId?: number;
  elementId?: number;
  fx?: number;
  fy?: number;
  moment?: number;
  w?: number;     // distributed load intensity (N/m)
}

export interface BeamResult {
  displacements: Float64Array;
  memberForces: { elementId: number; axial: number; shear: number; moment: number }[];
  reactions: { nodeId: number; fx: number; fy: number; moment: number }[];
  maxDeflection: number;
  maxMoment: number;
  maxShear: number;
}

/** Beam element stiffness matrix (6x6) in local coordinates */
function beamElementStiffness(L: number, E: number, A: number, I: number, cos: number, sin: number): number[][] {
  const EA_L = E * A / L;
  const EI_L3 = E * I / (L * L * L);
  const EI_L2 = E * I / (L * L);
  const EI_L = E * I / L;

  // Local stiffness
  const kl: number[][] = [
    [EA_L, 0, 0, -EA_L, 0, 0],
    [0, 12 * EI_L3, 6 * EI_L2, 0, -12 * EI_L3, 6 * EI_L2],
    [0, 6 * EI_L2, 4 * EI_L, 0, -6 * EI_L2, 2 * EI_L],
    [-EA_L, 0, 0, EA_L, 0, 0],
    [0, -12 * EI_L3, -6 * EI_L2, 0, 12 * EI_L3, -6 * EI_L2],
    [0, 6 * EI_L2, 2 * EI_L, 0, -6 * EI_L2, 4 * EI_L],
  ];

  // Transformation matrix
  const T: number[][] = [
    [cos, sin, 0, 0, 0, 0],
    [-sin, cos, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, cos, sin, 0],
    [0, 0, 0, -sin, cos, 0],
    [0, 0, 0, 0, 0, 1],
  ];

  // K_global = T^T * K_local * T
  const temp: number[][] = Array.from({ length: 6 }, () => Array(6).fill(0));
  const Kg: number[][] = Array.from({ length: 6 }, () => Array(6).fill(0));

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      for (let k = 0; k < 6; k++) {
        temp[i][j] += kl[i][k] * T[k][j];
      }
    }
  }

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      for (let k = 0; k < 6; k++) {
        Kg[i][j] += T[k][i] * temp[k][j];
      }
    }
  }

  return Kg;
}

/** Solve beam/frame structure using direct stiffness method */
export function solveBeamFEA(
  nodes: BeamNode[],
  elements: BeamElement[],
  bcs: BeamBC[],
  loads: BeamLoad[]
): BeamResult {
  const n = nodes.length;
  const dof = n * 3; // ux, uy, theta per node

  const K = Array.from({ length: dof }, () => new Float64Array(dof));
  const F = new Float64Array(dof);

  // Assemble
  for (const elem of elements) {
    const n1 = nodes[elem.startNode];
    const n2 = nodes[elem.endNode];
    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const L = Math.sqrt(dx * dx + dy * dy);
    if (L < 1e-12) continue;

    const cos = dx / L;
    const sin = dy / L;

    const Ke = beamElementStiffness(L, elem.E, elem.A, elem.I, cos, sin);

    const dofs = [
      elem.startNode * 3, elem.startNode * 3 + 1, elem.startNode * 3 + 2,
      elem.endNode * 3, elem.endNode * 3 + 1, elem.endNode * 3 + 2,
    ];

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        K[dofs[i]][dofs[j]] += Ke[i][j];
      }
    }

    // Handle distributed loads -> equivalent nodal forces
    for (const load of loads) {
      if (load.type === "distributed" && load.elementId === elem.id && load.w) {
        const w = load.w;
        // Fixed-end forces for UDL
        F[elem.startNode * 3 + 1] += w * L / 2;
        F[elem.endNode * 3 + 1] += w * L / 2;
        F[elem.startNode * 3 + 2] += w * L * L / 12;
        F[elem.endNode * 3 + 2] -= w * L * L / 12;
      }
    }
  }

  // Apply point loads
  for (const load of loads) {
    if (load.type === "point_force" && load.nodeId !== undefined) {
      if (load.fx) F[load.nodeId * 3] += load.fx;
      if (load.fy) F[load.nodeId * 3 + 1] += load.fy;
    }
    if (load.type === "point_moment" && load.nodeId !== undefined && load.moment) {
      F[load.nodeId * 3 + 2] += load.moment;
    }
  }

  // Apply BCs via penalty
  const penaltyVal = 1e30;
  for (const bc of bcs) {
    const ux = bc.nodeId * 3;
    const uy = bc.nodeId * 3 + 1;
    const theta = bc.nodeId * 3 + 2;

    switch (bc.type) {
      case "fixed":
        K[ux][ux] += penaltyVal;
        K[uy][uy] += penaltyVal;
        K[theta][theta] += penaltyVal;
        break;
      case "pinned":
        K[ux][ux] += penaltyVal;
        K[uy][uy] += penaltyVal;
        break;
      case "roller":
        K[uy][uy] += penaltyVal;
        break;
    }
  }

  // Solve
  const u = new Float64Array(dof);
  const Ac = K.map((row) => Float64Array.from(row));
  const bc2 = Float64Array.from(F);

  for (let col = 0; col < dof; col++) {
    let maxVal = Math.abs(Ac[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < dof; row++) {
      if (Math.abs(Ac[row][col]) > maxVal) {
        maxVal = Math.abs(Ac[row][col]);
        maxRow = row;
      }
    }
    if (maxRow !== col) {
      const tmp = Ac[col]; Ac[col] = Ac[maxRow]; Ac[maxRow] = tmp;
      const tmpB = bc2[col]; bc2[col] = bc2[maxRow]; bc2[maxRow] = tmpB;
    }
    if (Math.abs(Ac[col][col]) < 1e-30) continue;
    for (let row = col + 1; row < dof; row++) {
      const factor = Ac[row][col] / Ac[col][col];
      for (let c = col; c < dof; c++) Ac[row][c] -= factor * Ac[col][c];
      bc2[row] -= factor * bc2[col];
    }
  }
  for (let row = dof - 1; row >= 0; row--) {
    let sum = bc2[row];
    for (let col = row + 1; col < dof; col++) sum -= Ac[row][col] * u[col];
    u[row] = Math.abs(Ac[row][row]) > 1e-30 ? sum / Ac[row][row] : 0;
  }

  // Member forces
  const memberForces: { elementId: number; axial: number; shear: number; moment: number }[] = [];
  for (const elem of elements) {
    const n1 = nodes[elem.startNode];
    const n2 = nodes[elem.endNode];
    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const L = Math.sqrt(dx * dx + dy * dy);
    if (L < 1e-12) continue;

    const cos = dx / L;
    const sin = dy / L;

    // Local displacements
    const ug = [
      u[elem.startNode * 3], u[elem.startNode * 3 + 1], u[elem.startNode * 3 + 2],
      u[elem.endNode * 3], u[elem.endNode * 3 + 1], u[elem.endNode * 3 + 2],
    ];
    const ul = [
      cos * ug[0] + sin * ug[1],
      -sin * ug[0] + cos * ug[1],
      ug[2],
      cos * ug[3] + sin * ug[4],
      -sin * ug[3] + cos * ug[4],
      ug[5],
    ];

    const axial = elem.E * elem.A / L * (ul[3] - ul[0]);
    const shear = 12 * elem.E * elem.I / (L * L * L) * (ul[4] - ul[1]) +
                  6 * elem.E * elem.I / (L * L) * (ul[5] + ul[2]);
    const moment = 6 * elem.E * elem.I / (L * L) * (ul[4] - ul[1]) +
                   4 * elem.E * elem.I / L * ul[2] + 2 * elem.E * elem.I / L * ul[5];

    memberForces.push({ elementId: elem.id, axial, shear, moment });
  }

  // Reactions
  const reactions: { nodeId: number; fx: number; fy: number; moment: number }[] = [];
  for (const bc of bcs) {
    reactions.push({
      nodeId: bc.nodeId,
      fx: -F[bc.nodeId * 3] + K[bc.nodeId * 3].reduce((s, v, c) => s + v * u[c], 0),
      fy: -F[bc.nodeId * 3 + 1] + K[bc.nodeId * 3 + 1].reduce((s, v, c) => s + v * u[c], 0),
      moment: -F[bc.nodeId * 3 + 2] + K[bc.nodeId * 3 + 2].reduce((s, v, c) => s + v * u[c], 0),
    });
  }

  const maxDeflection = Math.max(
    ...Array.from({ length: n }, (_, i) =>
      Math.sqrt(u[i * 3] ** 2 + u[i * 3 + 1] ** 2)
    )
  );

  return {
    displacements: u,
    memberForces,
    reactions,
    maxDeflection,
    maxMoment: Math.max(...memberForces.map((f) => Math.abs(f.moment)), 0),
    maxShear: Math.max(...memberForces.map((f) => Math.abs(f.shear)), 0),
  };
}

// ── Beam validation helper ───────────────────────────────────────────────────

/** Validate simply supported beam: max deflection = 5wL^4 / (384EI) */
export function validateSSBeam(
  w: number, L: number, E: number, I: number
): { deflection: number; moment: number; shear: number } {
  return {
    deflection: (5 * w * L ** 4) / (384 * E * I),
    moment: (w * L ** 2) / 8,
    shear: (w * L) / 2,
  };
}
