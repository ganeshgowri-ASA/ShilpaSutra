export interface Material {
  name: string;
  density: number;                // kg/m³
  youngsModulus: number;          // GPa
  yieldStrength: number;         // MPa
  ultimateStrength: number;      // MPa
  poissonRatio: number;
  thermalConductivity: number;   // W/(m·K)
  thermalExpansion: number;      // µm/m·K (CTE)
  specificHeat: number;          // J/(kg·K)
  electricalResistivity: number; // Ω·m
  hardness: string;              // e.g. "HRC 58-62", "HB 200"
  category: string;              // Steel, Aluminum, Titanium, Plastic, Composite, Metal, Ceramic, Wood, Rubber
  temperatureRange: { min: number; max: number }; // °C operating range
  color: string;                 // hex
}

export const materials: Material[] = [
  // ─── Existing 17 materials (enhanced) ───────────────────────────────
  {
    name: "Steel 1045",
    density: 7850,
    youngsModulus: 200,
    yieldStrength: 530,
    ultimateStrength: 625,
    poissonRatio: 0.29,
    thermalConductivity: 49.8,
    thermalExpansion: 11.2,
    specificHeat: 486,
    electricalResistivity: 1.71e-7,
    hardness: "HB 179-217",
    category: "Steel",
    temperatureRange: { min: -40, max: 500 },
    color: "#8a8a8a",
  },
  {
    name: "Aluminum 6061-T6",
    density: 2700,
    youngsModulus: 68.9,
    yieldStrength: 276,
    ultimateStrength: 310,
    poissonRatio: 0.33,
    thermalConductivity: 167,
    thermalExpansion: 23.6,
    specificHeat: 896,
    electricalResistivity: 3.99e-8,
    hardness: "HB 95",
    category: "Aluminum",
    temperatureRange: { min: -200, max: 200 },
    color: "#d4d4d4",
  },
  {
    name: "Titanium Ti-6Al-4V",
    density: 4430,
    youngsModulus: 113.8,
    yieldStrength: 880,
    ultimateStrength: 950,
    poissonRatio: 0.342,
    thermalConductivity: 6.7,
    thermalExpansion: 8.6,
    specificHeat: 526,
    electricalResistivity: 1.71e-6,
    hardness: "HRC 36",
    category: "Titanium",
    temperatureRange: { min: -200, max: 400 },
    color: "#b0c4d8",
  },
  {
    name: "ABS Plastic",
    density: 1050,
    youngsModulus: 2.3,
    yieldStrength: 40,
    ultimateStrength: 44,
    poissonRatio: 0.35,
    thermalConductivity: 0.17,
    thermalExpansion: 73.8,
    specificHeat: 1423,
    electricalResistivity: 1e14,
    hardness: "Shore D 100",
    category: "Plastic",
    temperatureRange: { min: -40, max: 80 },
    color: "#f0e68c",
  },
  {
    name: "Nylon PA66",
    density: 1140,
    youngsModulus: 3.0,
    yieldStrength: 82,
    ultimateStrength: 85,
    poissonRatio: 0.39,
    thermalConductivity: 0.25,
    thermalExpansion: 80,
    specificHeat: 1670,
    electricalResistivity: 1e12,
    hardness: "Shore D 80",
    category: "Plastic",
    temperatureRange: { min: -40, max: 120 },
    color: "#faf0e6",
  },
  {
    name: "Oak Wood",
    density: 750,
    youngsModulus: 12,
    yieldStrength: 58,
    ultimateStrength: 85,
    poissonRatio: 0.37,
    thermalConductivity: 0.17,
    thermalExpansion: 5.4,
    specificHeat: 2380,
    electricalResistivity: 1e14,
    hardness: "Janka 1290 lbf",
    category: "Wood",
    temperatureRange: { min: -40, max: 100 },
    color: "#8b6914",
  },
  {
    name: "Copper C11000",
    density: 8960,
    youngsModulus: 117,
    yieldStrength: 70,
    ultimateStrength: 220,
    poissonRatio: 0.34,
    thermalConductivity: 388,
    thermalExpansion: 16.5,
    specificHeat: 385,
    electricalResistivity: 1.72e-8,
    hardness: "HB 45",
    category: "Metal",
    temperatureRange: { min: -200, max: 200 },
    color: "#b87333",
  },
  {
    name: "Brass C36000",
    density: 8500,
    youngsModulus: 97,
    yieldStrength: 124,
    ultimateStrength: 338,
    poissonRatio: 0.34,
    thermalConductivity: 115,
    thermalExpansion: 20.5,
    specificHeat: 380,
    electricalResistivity: 6.63e-8,
    hardness: "HB 150",
    category: "Metal",
    temperatureRange: { min: -200, max: 200 },
    color: "#cfb53b",
  },
  {
    name: "Stainless Steel 304",
    density: 8000,
    youngsModulus: 193,
    yieldStrength: 215,
    ultimateStrength: 505,
    poissonRatio: 0.29,
    thermalConductivity: 16.2,
    thermalExpansion: 17.3,
    specificHeat: 500,
    electricalResistivity: 7.2e-7,
    hardness: "HB 187",
    category: "Steel",
    temperatureRange: { min: -200, max: 870 },
    color: "#c0c0c0",
  },
  {
    name: "Carbon Fiber CFRP",
    density: 1600,
    youngsModulus: 230,
    yieldStrength: 600,
    ultimateStrength: 1500,
    poissonRatio: 0.27,
    thermalConductivity: 7.0,
    thermalExpansion: -0.5,
    specificHeat: 795,
    electricalResistivity: 1.5e-5,
    hardness: "Shore D 85",
    category: "Composite",
    temperatureRange: { min: -60, max: 180 },
    color: "#1a1a1a",
  },
  {
    name: "HDPE",
    density: 955,
    youngsModulus: 1.1,
    yieldStrength: 26,
    ultimateStrength: 33,
    poissonRatio: 0.46,
    thermalConductivity: 0.48,
    thermalExpansion: 120,
    specificHeat: 1900,
    electricalResistivity: 1e16,
    hardness: "Shore D 66",
    category: "Plastic",
    temperatureRange: { min: -50, max: 80 },
    color: "#e8f5e9",
  },
  {
    name: "Polycarbonate",
    density: 1200,
    youngsModulus: 2.4,
    yieldStrength: 60,
    ultimateStrength: 70,
    poissonRatio: 0.37,
    thermalConductivity: 0.20,
    thermalExpansion: 66,
    specificHeat: 1200,
    electricalResistivity: 1e14,
    hardness: "Shore D 85",
    category: "Plastic",
    temperatureRange: { min: -40, max: 130 },
    color: "#e3f2fd",
  },
  {
    name: "Cast Iron ASTM A48",
    density: 7200,
    youngsModulus: 100,
    yieldStrength: 172,
    ultimateStrength: 214,
    poissonRatio: 0.26,
    thermalConductivity: 46,
    thermalExpansion: 10.6,
    specificHeat: 460,
    electricalResistivity: 1.0e-6,
    hardness: "HB 180-230",
    category: "Metal",
    temperatureRange: { min: -30, max: 350 },
    color: "#4a4a4a",
  },
  {
    name: "Inconel 718",
    density: 8190,
    youngsModulus: 200,
    yieldStrength: 1035,
    ultimateStrength: 1240,
    poissonRatio: 0.29,
    thermalConductivity: 11.4,
    thermalExpansion: 13.0,
    specificHeat: 435,
    electricalResistivity: 1.25e-6,
    hardness: "HRC 36-44",
    category: "Metal",
    temperatureRange: { min: -250, max: 700 },
    color: "#8fbc8f",
  },
  {
    name: "Bronze C93200",
    density: 8830,
    youngsModulus: 103,
    yieldStrength: 130,
    ultimateStrength: 241,
    poissonRatio: 0.34,
    thermalConductivity: 58,
    thermalExpansion: 18.0,
    specificHeat: 376,
    electricalResistivity: 1.1e-7,
    hardness: "HB 65",
    category: "Metal",
    temperatureRange: { min: -200, max: 230 },
    color: "#cd7f32",
  },
  {
    name: "Tool Steel D2",
    density: 7700,
    youngsModulus: 210,
    yieldStrength: 1400,
    ultimateStrength: 1850,
    poissonRatio: 0.28,
    thermalConductivity: 20,
    thermalExpansion: 10.4,
    specificHeat: 460,
    electricalResistivity: 6.5e-7,
    hardness: "HRC 58-62",
    category: "Steel",
    temperatureRange: { min: -40, max: 425 },
    color: "#606060",
  },
  {
    name: "Magnesium AZ31B",
    density: 1770,
    youngsModulus: 45,
    yieldStrength: 200,
    ultimateStrength: 260,
    poissonRatio: 0.35,
    thermalConductivity: 77,
    thermalExpansion: 26.0,
    specificHeat: 1024,
    electricalResistivity: 9.2e-8,
    hardness: "HB 49",
    category: "Metal",
    temperatureRange: { min: -40, max: 150 },
    color: "#e8e8e0",
  },

  // ─── New 18 materials ───────────────────────────────────────────────
  {
    name: "Steel AISI 4140",
    density: 7850,
    youngsModulus: 205,
    yieldStrength: 655,
    ultimateStrength: 1020,
    poissonRatio: 0.29,
    thermalConductivity: 42.6,
    thermalExpansion: 12.3,
    specificHeat: 473,
    electricalResistivity: 2.2e-7,
    hardness: "HRC 28-34",
    category: "Steel",
    temperatureRange: { min: -40, max: 500 },
    color: "#7a7a7a",
  },
  {
    name: "Stainless Steel 316L",
    density: 7990,
    youngsModulus: 193,
    yieldStrength: 170,
    ultimateStrength: 485,
    poissonRatio: 0.30,
    thermalConductivity: 14.6,
    thermalExpansion: 15.9,
    specificHeat: 500,
    electricalResistivity: 7.4e-7,
    hardness: "HB 149",
    category: "Steel",
    temperatureRange: { min: -200, max: 870 },
    color: "#b8b8b8",
  },
  {
    name: "Steel A36",
    density: 7860,
    youngsModulus: 200,
    yieldStrength: 250,
    ultimateStrength: 400,
    poissonRatio: 0.26,
    thermalConductivity: 51.9,
    thermalExpansion: 11.7,
    specificHeat: 486,
    electricalResistivity: 1.43e-7,
    hardness: "HB 119-159",
    category: "Steel",
    temperatureRange: { min: -45, max: 400 },
    color: "#6e6e6e",
  },
  {
    name: "Aluminum 7075-T6",
    density: 2810,
    youngsModulus: 71.7,
    yieldStrength: 503,
    ultimateStrength: 572,
    poissonRatio: 0.33,
    thermalConductivity: 130,
    thermalExpansion: 23.4,
    specificHeat: 960,
    electricalResistivity: 5.15e-8,
    hardness: "HB 150",
    category: "Aluminum",
    temperatureRange: { min: -200, max: 200 },
    color: "#c8c8c8",
  },
  {
    name: "Aluminum 2024-T3",
    density: 2780,
    youngsModulus: 73.1,
    yieldStrength: 345,
    ultimateStrength: 483,
    poissonRatio: 0.33,
    thermalConductivity: 121,
    thermalExpansion: 23.2,
    specificHeat: 875,
    electricalResistivity: 5.82e-8,
    hardness: "HB 120",
    category: "Aluminum",
    temperatureRange: { min: -200, max: 200 },
    color: "#d0d0d0",
  },
  {
    name: "Titanium Grade 2",
    density: 4510,
    youngsModulus: 103,
    yieldStrength: 275,
    ultimateStrength: 345,
    poissonRatio: 0.37,
    thermalConductivity: 16.4,
    thermalExpansion: 8.6,
    specificHeat: 523,
    electricalResistivity: 5.6e-7,
    hardness: "HB 200",
    category: "Titanium",
    temperatureRange: { min: -250, max: 315 },
    color: "#a8b8c8",
  },
  {
    name: "PEEK",
    density: 1310,
    youngsModulus: 3.6,
    yieldStrength: 100,
    ultimateStrength: 100,
    poissonRatio: 0.40,
    thermalConductivity: 0.25,
    thermalExpansion: 47,
    specificHeat: 2180,
    electricalResistivity: 1e14,
    hardness: "Shore D 85",
    category: "Plastic",
    temperatureRange: { min: -60, max: 260 },
    color: "#c4a882",
  },
  {
    name: "POM (Delrin)",
    density: 1410,
    youngsModulus: 2.9,
    yieldStrength: 68,
    ultimateStrength: 70,
    poissonRatio: 0.37,
    thermalConductivity: 0.31,
    thermalExpansion: 110,
    specificHeat: 1470,
    electricalResistivity: 1e14,
    hardness: "Shore D 90",
    category: "Plastic",
    temperatureRange: { min: -40, max: 100 },
    color: "#f5f5dc",
  },
  {
    name: "PTFE (Teflon)",
    density: 2170,
    youngsModulus: 0.5,
    yieldStrength: 23,
    ultimateStrength: 31,
    poissonRatio: 0.46,
    thermalConductivity: 0.25,
    thermalExpansion: 135,
    specificHeat: 1010,
    electricalResistivity: 1e18,
    hardness: "Shore D 55",
    category: "Plastic",
    temperatureRange: { min: -200, max: 260 },
    color: "#fefefe",
  },
  {
    name: "GFRP (Glass Fiber)",
    density: 1900,
    youngsModulus: 35,
    yieldStrength: 280,
    ultimateStrength: 500,
    poissonRatio: 0.28,
    thermalConductivity: 0.8,
    thermalExpansion: 10,
    specificHeat: 900,
    electricalResistivity: 1e12,
    hardness: "HB 60",
    category: "Composite",
    temperatureRange: { min: -60, max: 150 },
    color: "#d4e8c2",
  },
  {
    name: "Silicone Rubber",
    density: 1250,
    youngsModulus: 0.005,
    yieldStrength: 8,
    ultimateStrength: 11,
    poissonRatio: 0.49,
    thermalConductivity: 0.20,
    thermalExpansion: 250,
    specificHeat: 1460,
    electricalResistivity: 1e13,
    hardness: "Shore A 40-80",
    category: "Rubber",
    temperatureRange: { min: -55, max: 230 },
    color: "#e8dcc8",
  },
  {
    name: "Natural Rubber",
    density: 920,
    youngsModulus: 0.003,
    yieldStrength: 20,
    ultimateStrength: 25,
    poissonRatio: 0.49,
    thermalConductivity: 0.13,
    thermalExpansion: 670,
    specificHeat: 1880,
    electricalResistivity: 1e13,
    hardness: "Shore A 30-90",
    category: "Rubber",
    temperatureRange: { min: -55, max: 82 },
    color: "#deb887",
  },
  {
    name: "Alumina (Al2O3)",
    density: 3960,
    youngsModulus: 370,
    yieldStrength: 300,
    ultimateStrength: 380,
    poissonRatio: 0.22,
    thermalConductivity: 30,
    thermalExpansion: 8.1,
    specificHeat: 880,
    electricalResistivity: 1e14,
    hardness: "HV 1500-1700",
    category: "Ceramic",
    temperatureRange: { min: -200, max: 1750 },
    color: "#f0f0f0",
  },
  {
    name: "Tungsten Carbide",
    density: 15630,
    youngsModulus: 620,
    yieldStrength: 530,
    ultimateStrength: 1580,
    poissonRatio: 0.24,
    thermalConductivity: 84.02,
    thermalExpansion: 5.2,
    specificHeat: 292,
    electricalResistivity: 2.0e-7,
    hardness: "HRA 89-93",
    category: "Ceramic",
    temperatureRange: { min: -200, max: 800 },
    color: "#444444",
  },
  {
    name: "Beryllium Copper",
    density: 8250,
    youngsModulus: 131,
    yieldStrength: 1035,
    ultimateStrength: 1310,
    poissonRatio: 0.30,
    thermalConductivity: 115,
    thermalExpansion: 17.8,
    specificHeat: 420,
    electricalResistivity: 7.68e-8,
    hardness: "HRC 38-44",
    category: "Metal",
    temperatureRange: { min: -200, max: 315 },
    color: "#c49a6c",
  },
  {
    name: "Hastelloy C-276",
    density: 8890,
    youngsModulus: 205,
    yieldStrength: 355,
    ultimateStrength: 790,
    poissonRatio: 0.30,
    thermalConductivity: 10.2,
    thermalExpansion: 11.2,
    specificHeat: 427,
    electricalResistivity: 1.3e-6,
    hardness: "HB 194",
    category: "Metal",
    temperatureRange: { min: -200, max: 1090 },
    color: "#909090",
  },
  {
    name: "Monel 400",
    density: 8800,
    youngsModulus: 179,
    yieldStrength: 240,
    ultimateStrength: 550,
    poissonRatio: 0.32,
    thermalConductivity: 21.8,
    thermalExpansion: 13.9,
    specificHeat: 427,
    electricalResistivity: 5.15e-7,
    hardness: "HB 110-149",
    category: "Metal",
    temperatureRange: { min: -200, max: 480 },
    color: "#9e9e9e",
  },
  {
    name: "Zinc Alloy (Zamak 5)",
    density: 6600,
    youngsModulus: 85.5,
    yieldStrength: 228,
    ultimateStrength: 331,
    poissonRatio: 0.30,
    thermalConductivity: 109,
    thermalExpansion: 27.4,
    specificHeat: 419,
    electricalResistivity: 6.89e-8,
    hardness: "HB 91",
    category: "Metal",
    temperatureRange: { min: -40, max: 120 },
    color: "#a0a0b0",
  },
];

// ─── Helper Functions ───────────────────────────────────────────────────

/**
 * Find a material by name (case-insensitive partial match).
 */
export function getMaterialByName(name: string): Material | undefined {
  return materials.find((m) => m.name.toLowerCase().includes(name.toLowerCase()));
}

/**
 * Get all materials in a given category.
 */
export function getMaterialsByCategory(category: string): Material[] {
  return materials.filter(
    (m) => m.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Get a sorted list of unique material categories.
 */
export function getMaterialCategories(): string[] {
  const categories = new Set(materials.map((m) => m.category));
  return Array.from(categories).sort();
}

/**
 * Compare two materials side-by-side.
 * Returns a structured comparison of all numeric and categorical properties.
 */
export function compareMaterials(
  nameA: string,
  nameB: string
): {
  materialA: Material;
  materialB: Material;
  differences: Record<
    string,
    { a: number | string; b: number | string; ratio?: number }
  >;
} | null {
  const matA = getMaterialByName(nameA);
  const matB = getMaterialByName(nameB);
  if (!matA || !matB) return null;

  const numericKeys: (keyof Material)[] = [
    "density",
    "youngsModulus",
    "yieldStrength",
    "ultimateStrength",
    "poissonRatio",
    "thermalConductivity",
    "thermalExpansion",
    "specificHeat",
    "electricalResistivity",
  ];

  const differences: Record<
    string,
    { a: number | string; b: number | string; ratio?: number }
  > = {};

  for (const key of numericKeys) {
    const a = matA[key] as number;
    const b = matB[key] as number;
    differences[key] = {
      a,
      b,
      ratio: b !== 0 ? a / b : Infinity,
    };
  }

  // Non-numeric comparisons
  differences.hardness = { a: matA.hardness, b: matB.hardness };
  differences.category = { a: matA.category, b: matB.category };

  return { materialA: matA, materialB: matB, differences };
}

/**
 * Calculate weight from a material name and a volume in mm³.
 * Returns weight in kilograms.
 */
export function calculateWeight(
  materialName: string,
  volume_mm3: number
): number | null {
  const mat = getMaterialByName(materialName);
  if (!mat) return null;
  // density is kg/m³; 1 m³ = 1e9 mm³
  return (mat.density * volume_mm3) / 1e9;
}

/**
 * Get the hex color string for a material by name.
 */
export function getMaterialColor(name: string): string | null {
  const mat = getMaterialByName(name);
  return mat ? mat.color : null;
}
