// Solar PV Structural Templates
// Ground-mounted fixed tilt, tracker, rooftop ballasted systems
// Auto-sizing per IS 800, wind load per IS 875 Part 3

import {
  type StructuralNode, type BeamElement, type LoadCase, type MemberLoad,
  type NodalLoad, type SectionProfile, type StructuralMaterial,
  STANDARD_SECTIONS, STRUCTURAL_MATERIALS, solveFrame2D, checkMemberIS800,
  type DesignCheck,
} from "./structural-engine";
import { designGroundScrew, designBallast, type SoilProfile } from "./foundation-engine";

export interface PVModuleSpec {
  length: number;    // mm (typically 2278)
  width: number;     // mm (typically 1134)
  weight: number;    // kg (typically 28-32)
  power: number;     // Wp
}

export interface WindLoadParams {
  zone: 1 | 2 | 3 | 4 | 5 | 6;
  terrain: 1 | 2 | 3 | 4;
  structureClass: 'A' | 'B' | 'C';
  height: number;    // m above ground
  tilt: number;      // degrees
}

export interface PVStructureConfig {
  type: 'ground-fixed' | 'tracker' | 'rooftop-ballast';
  modules: number;
  tilt: number;              // degrees
  orientation: 'portrait' | 'landscape';
  rows: number;              // portrait rows (1=single, 2=double)
  moduleSpec: PVModuleSpec;
  wind: WindLoadParams;
  soil?: SoilProfile;
}

export interface BillOfMaterials {
  items: { description: string; section: string; length: number; quantity: number; weight: number }[];
  totalSteelWeight: number;  // kg
  totalBolts: { size: string; count: number }[];
  moduleCount: number;
  totalPower: number;        // kWp
}

export interface PVStructureResult {
  nodes: StructuralNode[];
  elements: BeamElement[];
  loadCase: LoadCase;
  designChecks: DesignCheck[];
  bom: BillOfMaterials;
  purlinSection: string;
  rafterSection: string;
  columnSection: string;
  bracingSection: string;
  foundationType: string;
  summary: string[];
}

// IS 875 Part 3 basic wind speed by zone (m/s)
const WIND_SPEED_MAP: Record<number, number> = { 1: 33, 2: 39, 3: 44, 4: 47, 5: 50, 6: 55 };

// Terrain roughness factors (k2) for category 2, class B at various heights
function getK2(terrain: number, height: number): number {
  if (height <= 10) return [1.05, 1.0, 0.91, 0.8][terrain - 1];
  if (height <= 15) return [1.09, 1.05, 0.97, 0.86][terrain - 1];
  return [1.12, 1.08, 1.01, 0.91][terrain - 1];
}

// Wind pressure on solar panels (IS 875 Part 3)
export function calculateWindLoad(params: WindLoadParams): { pressure: number; uplift: number; downforce: number; steps: string[] } {
  const steps: string[] = [];
  const Vb = WIND_SPEED_MAP[params.zone] || 44;
  steps.push(`Basic wind speed Vb = ${Vb} m/s (Zone ${params.zone})`);

  const k1 = 1.0; // risk coefficient
  const k2 = getK2(params.terrain, params.height);
  const k3 = 1.0; // topography
  const Vz = Vb * k1 * k2 * k3;
  steps.push(`Design wind speed Vz = ${Vb} × ${k1} × ${k2.toFixed(2)} × ${k3} = ${Vz.toFixed(1)} m/s`);

  const pz = 0.6 * Vz * Vz; // N/m² = Pa
  steps.push(`Wind pressure pz = 0.6 × ${Vz.toFixed(1)}² = ${pz.toFixed(0)} N/m²`);

  // Net pressure coefficients for solar panels (simplified)
  const tiltRad = (params.tilt * Math.PI) / 180;
  const CpNet = 1.2 + 0.4 * Math.sin(2 * tiltRad); // uplift case
  const CpDown = 0.8 + 0.3 * Math.sin(2 * tiltRad); // downforce case
  steps.push(`Cp,net (uplift) = ${CpNet.toFixed(2)}, Cp,net (down) = ${CpDown.toFixed(2)}`);

  const uplift = pz * CpNet / 1000; // kN/m²
  const downforce = pz * CpDown / 1000;
  steps.push(`Uplift = ${uplift.toFixed(3)} kN/m², Downforce = ${downforce.toFixed(3)} kN/m²`);

  return { pressure: pz / 1000, uplift, downforce, steps };
}

// Auto-size member based on required capacity
function autoSizeSection(
  requiredMoment: number, requiredShear: number, length: number, material: StructuralMaterial
): SectionProfile {
  const fy = material.fy;
  const gammaM0 = 1.1;
  const reqZxx = (requiredMoment * gammaM0 * 1e6) / fy; // mm³
  // Find smallest section with adequate capacity
  const sorted = [...STANDARD_SECTIONS].sort((a, b) => a.Zxx - b.Zxx);
  for (const s of sorted) {
    if (s.Zxx >= reqZxx) {
      // Check slenderness
      const lambda = length / s.ry;
      if (lambda < 250) return s; // IS 800 limit
    }
  }
  return sorted[sorted.length - 1]; // largest available
}

// Generate ground-mounted fixed tilt PV structure
export function generateGroundMountStructure(config: PVStructureConfig): PVStructureResult {
  const { modules, tilt, orientation, rows, moduleSpec, wind, soil } = config;
  const summary: string[] = [];

  // Layout calculation
  const modulesPerString = orientation === 'portrait' ? Math.ceil(modules / rows) : modules;
  const moduleW = orientation === 'portrait' ? moduleSpec.width : moduleSpec.length;
  const moduleH = orientation === 'portrait' ? moduleSpec.length : moduleSpec.width;
  const tableWidth = moduleW * modulesPerString + (modulesPerString - 1) * 20; // 20mm gap
  const tableHeight = moduleH * rows + (rows - 1) * 20;

  summary.push(`Layout: ${modulesPerString} × ${rows} ${orientation} (${modules} modules, ${(modules * moduleSpec.power / 1000).toFixed(1)} kWp)`);
  summary.push(`Table size: ${(tableWidth / 1000).toFixed(1)}m × ${(tableHeight / 1000).toFixed(1)}m`);

  // Wind loads
  const windResult = calculateWindLoad(wind);
  summary.push(...windResult.steps);

  // Dead load
  const moduleArea = (moduleSpec.length * moduleSpec.width) / 1e6; // m²
  const deadLoadPerModule = moduleSpec.weight * 9.81 / 1000; // kN
  const deadLoadPerM2 = deadLoadPerModule / moduleArea;
  summary.push(`Dead load = ${deadLoadPerM2.toFixed(2)} kN/m²`);

  // Purlin span (between rafters)
  const purlinSpan = tableHeight / Math.cos((tilt * Math.PI) / 180); // mm along slope
  const purlinSpanM = purlinSpan / 1000;
  const purlinLoadUDL = (deadLoadPerM2 + windResult.downforce) * (moduleW / 1000); // kN/m on purlin
  const purlinMoment = purlinLoadUDL * purlinSpanM * purlinSpanM / 8;
  const purlinShear = purlinLoadUDL * purlinSpanM / 2;

  const mat = STRUCTURAL_MATERIALS[0]; // Fe250
  const purlinSection = autoSizeSection(purlinMoment, purlinShear, purlinSpanM * 1000, mat);
  summary.push(`Purlin: ${purlinSection.name} (span ${purlinSpanM.toFixed(1)}m, Mu=${purlinMoment.toFixed(2)} kNm)`);

  // Rafter
  const rafterSpan = tableWidth / 1000; // m
  const numPurlins = Math.ceil(rafterSpan / 1.5) + 1;
  const rafterLoad = (deadLoadPerM2 + windResult.downforce) * (tableHeight / 1000) / numPurlins;
  const rafterMoment = rafterLoad * numPurlins * rafterSpan / 8;
  const rafterShear = rafterLoad * numPurlins / 2;
  const rafterSection = autoSizeSection(rafterMoment, rafterShear, rafterSpan * 1000, mat);
  summary.push(`Rafter: ${rafterSection.name} (span ${rafterSpan.toFixed(1)}m)`);

  // Columns
  const columnHeight = 1.5 + (tableHeight / 2000) * Math.sin((tilt * Math.PI) / 180);
  const columnAxial = (deadLoadPerM2 * moduleArea * modules + windResult.downforce * moduleArea * modules) / 2;
  const columnMoment = windResult.uplift * moduleArea * modules * columnHeight / 4;
  const columnSection = autoSizeSection(columnMoment, columnAxial, columnHeight * 1000, mat);
  summary.push(`Column: ${columnSection.name} (height ${columnHeight.toFixed(1)}m)`);

  // Bracing
  const bracingSection = STANDARD_SECTIONS.find(s => s.type === 'angle') || STANDARD_SECTIONS[6];
  summary.push(`Bracing: ${bracingSection.name}`);

  // Generate structural model (simplified portal frame)
  const nodes: StructuralNode[] = [
    { id: "N1", x: 0, y: 0, z: 0, restraints: [true, true, false, false, false, true] },
    { id: "N2", x: rafterSpan * 1000, y: 0, z: 0, restraints: [true, true, false, false, false, true] },
    { id: "N3", x: 0, y: columnHeight * 1000, z: 0, restraints: [false, false, false, false, false, false] },
    { id: "N4", x: rafterSpan * 1000, y: (columnHeight + rafterSpan * Math.sin((tilt * Math.PI) / 180)) * 1000, z: 0, restraints: [false, false, false, false, false, false] },
  ];

  const elements: BeamElement[] = [
    { id: "COL1", nodeI: "N1", nodeJ: "N3", sectionId: columnSection.id, materialId: mat.id, type: "beam" },
    { id: "COL2", nodeI: "N2", nodeJ: "N4", sectionId: columnSection.id, materialId: mat.id, type: "beam" },
    { id: "RAFT", nodeI: "N3", nodeJ: "N4", sectionId: rafterSection.id, materialId: mat.id, type: "beam" },
  ];

  const loadCase: LoadCase = {
    id: "WL1", name: "DL+WL", type: "wind",
    nodalLoads: [{ nodeId: "N3", fx: windResult.uplift * moduleArea * modules * 0.3, fy: 0, fz: 0, mx: 0, my: 0, mz: 0 }],
    memberLoads: [{ elementId: "RAFT", type: "udl", direction: "GY", values: [-(deadLoadPerM2 + windResult.downforce) * (tableHeight / 1000)] }],
  };

  // Run analysis
  const result = solveFrame2D(nodes, elements, [purlinSection, rafterSection, columnSection, bracingSection], [mat], loadCase);

  // BOM
  const numTables = 1;
  const bom: BillOfMaterials = {
    items: [
      { description: "Purlin", section: purlinSection.name, length: purlinSpanM, quantity: numPurlins * numTables, weight: purlinSection.area * purlinSpanM * 7.85 / 1e3 },
      { description: "Rafter", section: rafterSection.name, length: rafterSpan, quantity: 2 * numTables, weight: rafterSection.area * rafterSpan * 7.85 / 1e3 },
      { description: "Column", section: columnSection.name, length: columnHeight, quantity: 2 * numTables, weight: columnSection.area * columnHeight * 7.85 / 1e3 },
      { description: "Bracing", section: bracingSection.name, length: Math.sqrt(rafterSpan ** 2 + columnHeight ** 2), quantity: 2 * numTables, weight: bracingSection.area * Math.sqrt(rafterSpan ** 2 + columnHeight ** 2) * 7.85 / 1e3 },
    ],
    totalSteelWeight: 0,
    totalBolts: [
      { size: "M12x40", count: numPurlins * 4 + 8 },
      { size: "M16x60", count: 12 },
      { size: "M20x80 (anchor)", count: 8 },
    ],
    moduleCount: modules,
    totalPower: modules * moduleSpec.power / 1000,
  };
  bom.totalSteelWeight = Math.round(bom.items.reduce((sum, it) => sum + it.weight * it.quantity, 0) * 100) / 100;
  summary.push(`Total steel weight: ${bom.totalSteelWeight.toFixed(1)} kg`);
  summary.push(`Bolts: ${bom.totalBolts.map(b => `${b.count}× ${b.size}`).join(", ")}`);

  return {
    nodes, elements, loadCase,
    designChecks: result.designChecks,
    bom,
    purlinSection: purlinSection.name,
    rafterSection: rafterSection.name,
    columnSection: columnSection.name,
    bracingSection: bracingSection.name,
    foundationType: soil ? "Ground Screw" : "Concrete Pier",
    summary,
  };
}

// Single-axis tracker structure
export function generateTrackerStructure(config: PVStructureConfig): PVStructureResult {
  const trackerConfig = { ...config, tilt: 0 }; // tracker at 0 for stow
  const result = generateGroundMountStructure(trackerConfig);
  result.summary.unshift("Single-Axis Tracker (SAT) — torque tube design");
  result.summary.push("Tracker rotation range: ±60°");
  result.summary.push("Stow angle: 0° (flat) for high wind");
  result.foundationType = "Ground Screw (torque tube pier)";
  return result;
}

// Rooftop ballasted structure
export function generateRooftopStructure(config: PVStructureConfig): PVStructureResult {
  const result = generateGroundMountStructure({ ...config, tilt: Math.min(config.tilt, 15) });
  const windResult = calculateWindLoad(config.wind);
  const moduleArea = (config.moduleSpec.length * config.moduleSpec.width) / 1e6;
  const upliftPerModule = windResult.uplift * moduleArea;
  const ballast = designBallast(upliftPerModule * config.modules, 0.4, 5.0);
  result.summary.unshift("Rooftop Ballasted System (low-tilt)");
  result.summary.push(...ballast.steps);
  result.foundationType = `Concrete Ballast (${ballast.numberOfBlocks} blocks)`;
  return result;
}

// Default module spec (standard 540Wp bifacial)
export const DEFAULT_MODULE: PVModuleSpec = { length: 2278, width: 1134, weight: 28.5, power: 540 };

export const DEFAULT_SOIL: SoilProfile = {
  type: "sand", cohesion: 0, frictionAngle: 30, unitWeight: 18,
  waterTableDepth: 5, allowableBearing: 150, sptN: 20, subgradeModulus: 25000,
};
