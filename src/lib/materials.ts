// Engineering Material Library for ShilpaSutra
// Each material includes mechanical, thermal, and physical properties

export interface EngineeringMaterial {
  id: string;
  name: string;
  category: MaterialCategory;
  density: number; // kg/m³
  youngsModulus: number; // GPa
  yieldStrength: number; // MPa
  ultimateTensileStrength: number; // MPa
  poissonsRatio: number;
  thermalConductivity: number; // W/(m·K)
  thermalExpansion: number; // µm/(m·K)
  specificHeat: number; // J/(kg·K)
  color: string; // hex color for 3D rendering
  metalness: number; // 0-1 for PBR rendering
  roughness: number; // 0-1 for PBR rendering
}

export type MaterialCategory =
  | "Steel"
  | "Aluminum"
  | "Titanium"
  | "Copper"
  | "Plastic"
  | "Wood"
  | "Composite"
  | "Other";

export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  "Steel",
  "Aluminum",
  "Titanium",
  "Copper",
  "Plastic",
  "Wood",
  "Composite",
  "Other",
];

export const materials: EngineeringMaterial[] = [
  // ── Steel Alloys ──────────────────────────────────────────
  {
    id: "aisi-1018",
    name: "AISI 1018 Mild Steel",
    category: "Steel",
    density: 7870,
    youngsModulus: 205,
    yieldStrength: 370,
    ultimateTensileStrength: 440,
    poissonsRatio: 0.29,
    thermalConductivity: 51.9,
    thermalExpansion: 11.5,
    specificHeat: 486,
    color: "#8a8a8a",
    metalness: 0.85,
    roughness: 0.4,
  },
  {
    id: "aisi-1045",
    name: "AISI 1045 Medium Carbon Steel",
    category: "Steel",
    density: 7850,
    youngsModulus: 206,
    yieldStrength: 530,
    ultimateTensileStrength: 625,
    poissonsRatio: 0.29,
    thermalConductivity: 49.8,
    thermalExpansion: 11.2,
    specificHeat: 486,
    color: "#7a7a7a",
    metalness: 0.85,
    roughness: 0.35,
  },
  {
    id: "aisi-4140",
    name: "AISI 4140 Alloy Steel",
    category: "Steel",
    density: 7850,
    youngsModulus: 210,
    yieldStrength: 655,
    ultimateTensileStrength: 1020,
    poissonsRatio: 0.29,
    thermalConductivity: 42.6,
    thermalExpansion: 12.3,
    specificHeat: 473,
    color: "#6e6e6e",
    metalness: 0.88,
    roughness: 0.3,
  },
  {
    id: "ss-304",
    name: "Stainless Steel 304",
    category: "Steel",
    density: 8000,
    youngsModulus: 193,
    yieldStrength: 215,
    ultimateTensileStrength: 505,
    poissonsRatio: 0.29,
    thermalConductivity: 16.2,
    thermalExpansion: 17.3,
    specificHeat: 500,
    color: "#c0c0c0",
    metalness: 0.9,
    roughness: 0.2,
  },
  {
    id: "ss-316",
    name: "Stainless Steel 316",
    category: "Steel",
    density: 8000,
    youngsModulus: 193,
    yieldStrength: 290,
    ultimateTensileStrength: 580,
    poissonsRatio: 0.3,
    thermalConductivity: 16.3,
    thermalExpansion: 15.9,
    specificHeat: 500,
    color: "#b8b8c0",
    metalness: 0.9,
    roughness: 0.2,
  },

  // ── Aluminum Alloys ───────────────────────────────────────
  {
    id: "al-6061-t6",
    name: "Aluminum 6061-T6",
    category: "Aluminum",
    density: 2700,
    youngsModulus: 68.9,
    yieldStrength: 276,
    ultimateTensileStrength: 310,
    poissonsRatio: 0.33,
    thermalConductivity: 167,
    thermalExpansion: 23.6,
    specificHeat: 896,
    color: "#d4d4d8",
    metalness: 0.8,
    roughness: 0.3,
  },
  {
    id: "al-7075-t6",
    name: "Aluminum 7075-T6",
    category: "Aluminum",
    density: 2810,
    youngsModulus: 71.7,
    yieldStrength: 503,
    ultimateTensileStrength: 572,
    poissonsRatio: 0.33,
    thermalConductivity: 130,
    thermalExpansion: 23.4,
    specificHeat: 960,
    color: "#cccccc",
    metalness: 0.82,
    roughness: 0.28,
  },
  {
    id: "al-2024-t3",
    name: "Aluminum 2024-T3",
    category: "Aluminum",
    density: 2780,
    youngsModulus: 73.1,
    yieldStrength: 345,
    ultimateTensileStrength: 483,
    poissonsRatio: 0.33,
    thermalConductivity: 121,
    thermalExpansion: 22.9,
    specificHeat: 875,
    color: "#c8c8c8",
    metalness: 0.8,
    roughness: 0.32,
  },

  // ── Titanium Alloys ───────────────────────────────────────
  {
    id: "ti-6al-4v",
    name: "Titanium Ti-6Al-4V",
    category: "Titanium",
    density: 4430,
    youngsModulus: 113.8,
    yieldStrength: 880,
    ultimateTensileStrength: 950,
    poissonsRatio: 0.342,
    thermalConductivity: 6.7,
    thermalExpansion: 8.6,
    specificHeat: 526,
    color: "#9ca3af",
    metalness: 0.75,
    roughness: 0.35,
  },
  {
    id: "ti-grade2",
    name: "Titanium Grade 2 (CP)",
    category: "Titanium",
    density: 4510,
    youngsModulus: 103,
    yieldStrength: 275,
    ultimateTensileStrength: 345,
    poissonsRatio: 0.34,
    thermalConductivity: 16.4,
    thermalExpansion: 8.9,
    specificHeat: 523,
    color: "#a0a0a8",
    metalness: 0.72,
    roughness: 0.38,
  },

  // ── Copper & Brass ────────────────────────────────────────
  {
    id: "copper-c110",
    name: "Copper C110 (ETP)",
    category: "Copper",
    density: 8940,
    youngsModulus: 117,
    yieldStrength: 69,
    ultimateTensileStrength: 220,
    poissonsRatio: 0.34,
    thermalConductivity: 388,
    thermalExpansion: 16.5,
    specificHeat: 385,
    color: "#b87333",
    metalness: 0.95,
    roughness: 0.15,
  },
  {
    id: "brass-c360",
    name: "Brass C360 (Free-Cutting)",
    category: "Copper",
    density: 8500,
    youngsModulus: 97,
    yieldStrength: 310,
    ultimateTensileStrength: 385,
    poissonsRatio: 0.34,
    thermalConductivity: 115,
    thermalExpansion: 20.5,
    specificHeat: 380,
    color: "#cd9b1d",
    metalness: 0.9,
    roughness: 0.2,
  },
  {
    id: "bronze-c932",
    name: "Bronze C932 (Bearing)",
    category: "Copper",
    density: 8800,
    youngsModulus: 103,
    yieldStrength: 152,
    ultimateTensileStrength: 241,
    poissonsRatio: 0.34,
    thermalConductivity: 59,
    thermalExpansion: 18.0,
    specificHeat: 376,
    color: "#a0522d",
    metalness: 0.88,
    roughness: 0.25,
  },

  // ── Plastics ──────────────────────────────────────────────
  {
    id: "abs",
    name: "ABS (Acrylonitrile Butadiene Styrene)",
    category: "Plastic",
    density: 1040,
    youngsModulus: 2.3,
    yieldStrength: 43,
    ultimateTensileStrength: 50,
    poissonsRatio: 0.35,
    thermalConductivity: 0.17,
    thermalExpansion: 73.8,
    specificHeat: 1400,
    color: "#f5f5dc",
    metalness: 0.0,
    roughness: 0.7,
  },
  {
    id: "nylon-6",
    name: "Nylon 6 (Polyamide)",
    category: "Plastic",
    density: 1140,
    youngsModulus: 2.9,
    yieldStrength: 70,
    ultimateTensileStrength: 85,
    poissonsRatio: 0.39,
    thermalConductivity: 0.25,
    thermalExpansion: 80,
    specificHeat: 1700,
    color: "#fffaf0",
    metalness: 0.0,
    roughness: 0.6,
  },
  {
    id: "pla",
    name: "PLA (Polylactic Acid)",
    category: "Plastic",
    density: 1240,
    youngsModulus: 3.5,
    yieldStrength: 60,
    ultimateTensileStrength: 65,
    poissonsRatio: 0.36,
    thermalConductivity: 0.13,
    thermalExpansion: 68,
    specificHeat: 1800,
    color: "#e8e8e0",
    metalness: 0.0,
    roughness: 0.65,
  },
  {
    id: "polycarbonate",
    name: "Polycarbonate (PC)",
    category: "Plastic",
    density: 1200,
    youngsModulus: 2.4,
    yieldStrength: 62,
    ultimateTensileStrength: 70,
    poissonsRatio: 0.37,
    thermalConductivity: 0.2,
    thermalExpansion: 65,
    specificHeat: 1250,
    color: "#e0e0e0",
    metalness: 0.05,
    roughness: 0.3,
  },
  {
    id: "peek",
    name: "PEEK (Polyether Ether Ketone)",
    category: "Plastic",
    density: 1310,
    youngsModulus: 4.1,
    yieldStrength: 91,
    ultimateTensileStrength: 100,
    poissonsRatio: 0.38,
    thermalConductivity: 0.25,
    thermalExpansion: 47,
    specificHeat: 2160,
    color: "#c8b88a",
    metalness: 0.0,
    roughness: 0.5,
  },

  // ── Wood ──────────────────────────────────────────────────
  {
    id: "oak",
    name: "Oak (Red Oak)",
    category: "Wood",
    density: 660,
    youngsModulus: 12.5,
    yieldStrength: 46,
    ultimateTensileStrength: 112,
    poissonsRatio: 0.35,
    thermalConductivity: 0.17,
    thermalExpansion: 5.4,
    specificHeat: 2380,
    color: "#8B6914",
    metalness: 0.0,
    roughness: 0.85,
  },
  {
    id: "pine",
    name: "Pine (Southern Yellow)",
    category: "Wood",
    density: 510,
    youngsModulus: 12.0,
    yieldStrength: 40,
    ultimateTensileStrength: 104,
    poissonsRatio: 0.33,
    thermalConductivity: 0.12,
    thermalExpansion: 5.0,
    specificHeat: 2300,
    color: "#deb887",
    metalness: 0.0,
    roughness: 0.9,
  },
  {
    id: "plywood",
    name: "Birch Plywood",
    category: "Wood",
    density: 680,
    youngsModulus: 12.4,
    yieldStrength: 44,
    ultimateTensileStrength: 85,
    poissonsRatio: 0.3,
    thermalConductivity: 0.15,
    thermalExpansion: 5.2,
    specificHeat: 2300,
    color: "#c4a35a",
    metalness: 0.0,
    roughness: 0.8,
  },

  // ── Composites ────────────────────────────────────────────
  {
    id: "cfrp",
    name: "Carbon Fiber Reinforced Polymer",
    category: "Composite",
    density: 1600,
    youngsModulus: 181,
    yieldStrength: 600,
    ultimateTensileStrength: 1500,
    poissonsRatio: 0.27,
    thermalConductivity: 7,
    thermalExpansion: -0.1,
    specificHeat: 795,
    color: "#1a1a2e",
    metalness: 0.3,
    roughness: 0.2,
  },
  {
    id: "gfrp",
    name: "Glass Fiber Reinforced Polymer",
    category: "Composite",
    density: 1900,
    youngsModulus: 35,
    yieldStrength: 200,
    ultimateTensileStrength: 600,
    poissonsRatio: 0.28,
    thermalConductivity: 0.35,
    thermalExpansion: 12,
    specificHeat: 900,
    color: "#e8e8d0",
    metalness: 0.1,
    roughness: 0.4,
  },
];

/** Look up a material by ID */
export function getMaterialById(id: string): EngineeringMaterial | undefined {
  return materials.find((m) => m.id === id);
}

/** Get all materials in a given category */
export function getMaterialsByCategory(category: MaterialCategory): EngineeringMaterial[] {
  return materials.filter((m) => m.category === category);
}

/** Compute mass from volume (m³) and material density */
export function computeMass(volumeM3: number, material: EngineeringMaterial): number {
  return volumeM3 * material.density;
}

/** Format material properties for display */
export function formatProperty(value: number, unit: string, decimals = 1): string {
  return `${value.toFixed(decimals)} ${unit}`;
}
