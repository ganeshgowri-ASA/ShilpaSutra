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
