export interface EngineeringMaterial {
  id: string;
  name: string;
  category: MaterialCategory;
  density: number; // kg/m³
  youngsModulus: number; // GPa
  poissonRatio: number;
  yieldStrength: number; // MPa
  ultimateStrength: number; // MPa
  thermalConductivity: number; // W/(m·K)
  color: string;
  texture: string;
  description: string;
}

export type MaterialCategory =
  | "Steel"
  | "Aluminum"
  | "Titanium"
  | "Plastic"
  | "Wood"
  | "Composite"
  | "Copper"
  | "Ceramic"
  | "Rubber";

export const materialCategories: { id: MaterialCategory; label: string; color: string }[] = [
  { id: "Steel", label: "Steel & Iron", color: "#8899aa" },
  { id: "Aluminum", label: "Aluminum Alloys", color: "#b0c4de" },
  { id: "Titanium", label: "Titanium Alloys", color: "#a8b5c4" },
  { id: "Copper", label: "Copper & Brass", color: "#b87333" },
  { id: "Plastic", label: "Plastics & Polymers", color: "#e94560" },
  { id: "Composite", label: "Composites", color: "#2d6a4f" },
  { id: "Wood", label: "Wood", color: "#8B4513" },
  { id: "Ceramic", label: "Ceramics", color: "#f5f5f0" },
  { id: "Rubber", label: "Rubber & Elastomers", color: "#333333" },
];

export const materialsDatabase: EngineeringMaterial[] = [
  // Steels
  {
    id: "steel_1018", name: "AISI 1018 Steel", category: "Steel",
    density: 7870, youngsModulus: 205, poissonRatio: 0.29,
    yieldStrength: 370, ultimateStrength: 440,
    thermalConductivity: 51.9, color: "#7a8a9a", texture: "brushed",
    description: "Low-carbon steel, good weldability and machinability",
  },
  {
    id: "steel_1045", name: "AISI 1045 Steel", category: "Steel",
    density: 7850, youngsModulus: 206, poissonRatio: 0.29,
    yieldStrength: 530, ultimateStrength: 625,
    thermalConductivity: 49.8, color: "#6b7b8b", texture: "brushed",
    description: "Medium-carbon steel, good strength and hardness",
  },
  {
    id: "steel_4140", name: "AISI 4140 Alloy Steel", category: "Steel",
    density: 7850, youngsModulus: 210, poissonRatio: 0.29,
    yieldStrength: 655, ultimateStrength: 1020,
    thermalConductivity: 42.6, color: "#5a6a7a", texture: "polished",
    description: "Chromium-molybdenum alloy steel, high fatigue strength",
  },
  {
    id: "steel_304", name: "AISI 304 Stainless Steel", category: "Steel",
    density: 8000, youngsModulus: 193, poissonRatio: 0.29,
    yieldStrength: 215, ultimateStrength: 505,
    thermalConductivity: 16.2, color: "#c0c8d0", texture: "polished",
    description: "Austenitic stainless steel, excellent corrosion resistance",
  },
  {
    id: "steel_316", name: "AISI 316 Stainless Steel", category: "Steel",
    density: 8000, youngsModulus: 193, poissonRatio: 0.30,
    yieldStrength: 205, ultimateStrength: 515,
    thermalConductivity: 16.3, color: "#b8c0c8", texture: "polished",
    description: "Molybdenum-bearing austenitic stainless, marine grade",
  },
  {
    id: "steel_a36", name: "ASTM A36 Structural Steel", category: "Steel",
    density: 7850, youngsModulus: 200, poissonRatio: 0.26,
    yieldStrength: 250, ultimateStrength: 400,
    thermalConductivity: 50.2, color: "#808a94", texture: "matte",
    description: "Common structural steel, good weldability",
  },

  // Aluminum
  {
    id: "al_6061", name: "Al 6061-T6", category: "Aluminum",
    density: 2710, youngsModulus: 68.9, poissonRatio: 0.33,
    yieldStrength: 276, ultimateStrength: 310,
    thermalConductivity: 167, color: "#b8c8d8", texture: "brushed",
    description: "Most versatile heat-treatable aluminum alloy",
  },
  {
    id: "al_7075", name: "Al 7075-T6", category: "Aluminum",
    density: 2810, youngsModulus: 71.7, poissonRatio: 0.33,
    yieldStrength: 503, ultimateStrength: 572,
    thermalConductivity: 130, color: "#a8b8c8", texture: "polished",
    description: "High-strength aerospace aluminum alloy",
  },
  {
    id: "al_2024", name: "Al 2024-T4", category: "Aluminum",
    density: 2780, youngsModulus: 73.1, poissonRatio: 0.33,
    yieldStrength: 324, ultimateStrength: 469,
    thermalConductivity: 121, color: "#b0c0d0", texture: "brushed",
    description: "High-strength aircraft aluminum, good fatigue resistance",
  },
  {
    id: "al_5052", name: "Al 5052-H32", category: "Aluminum",
    density: 2680, youngsModulus: 70.3, poissonRatio: 0.33,
    yieldStrength: 193, ultimateStrength: 228,
    thermalConductivity: 138, color: "#c0d0e0", texture: "matte",
    description: "Marine-grade aluminum, excellent corrosion resistance",
  },

  // Titanium
  {
    id: "ti_6al4v", name: "Ti-6Al-4V (Grade 5)", category: "Titanium",
    density: 4430, youngsModulus: 113.8, poissonRatio: 0.34,
    yieldStrength: 880, ultimateStrength: 950,
    thermalConductivity: 6.7, color: "#909aa4", texture: "polished",
    description: "Most widely used titanium alloy, aerospace grade",
  },
  {
    id: "ti_cp2", name: "CP Titanium Grade 2", category: "Titanium",
    density: 4510, youngsModulus: 103, poissonRatio: 0.34,
    yieldStrength: 275, ultimateStrength: 345,
    thermalConductivity: 16.4, color: "#a0aab4", texture: "brushed",
    description: "Commercially pure titanium, excellent corrosion resistance",
  },

  // Copper & Brass
  {
    id: "cu_c110", name: "C110 Copper (ETP)", category: "Copper",
    density: 8940, youngsModulus: 117, poissonRatio: 0.34,
    yieldStrength: 69, ultimateStrength: 220,
    thermalConductivity: 388, color: "#b87333", texture: "polished",
    description: "Electrolytic tough pitch copper, high conductivity",
  },
  {
    id: "cu_brass_360", name: "Brass C360 (Free-Cutting)", category: "Copper",
    density: 8500, youngsModulus: 97, poissonRatio: 0.34,
    yieldStrength: 124, ultimateStrength: 338,
    thermalConductivity: 115, color: "#c9a84c", texture: "polished",
    description: "Free-machining brass, excellent machinability",
  },

  // Plastics
  {
    id: "abs", name: "ABS (Acrylonitrile Butadiene Styrene)", category: "Plastic",
    density: 1050, youngsModulus: 2.3, poissonRatio: 0.39,
    yieldStrength: 43, ultimateStrength: 44,
    thermalConductivity: 0.17, color: "#e8e0d0", texture: "matte",
    description: "Common 3D printing and injection molding plastic",
  },
  {
    id: "pla", name: "PLA (Polylactic Acid)", category: "Plastic",
    density: 1240, youngsModulus: 3.5, poissonRatio: 0.36,
    yieldStrength: 60, ultimateStrength: 65,
    thermalConductivity: 0.13, color: "#e0d8c8", texture: "matte",
    description: "Biodegradable 3D printing thermoplastic",
  },
  {
    id: "nylon_66", name: "Nylon 6/6", category: "Plastic",
    density: 1140, youngsModulus: 2.9, poissonRatio: 0.40,
    yieldStrength: 82, ultimateStrength: 85,
    thermalConductivity: 0.26, color: "#f5f0e8", texture: "matte",
    description: "Engineering nylon, high wear and chemical resistance",
  },
  {
    id: "peek", name: "PEEK", category: "Plastic",
    density: 1310, youngsModulus: 3.6, poissonRatio: 0.38,
    yieldStrength: 100, ultimateStrength: 100,
    thermalConductivity: 0.25, color: "#d0c8b8", texture: "matte",
    description: "High-performance engineering thermoplastic",
  },
  {
    id: "polycarbonate", name: "Polycarbonate (PC)", category: "Plastic",
    density: 1200, youngsModulus: 2.4, poissonRatio: 0.37,
    yieldStrength: 62, ultimateStrength: 65,
    thermalConductivity: 0.20, color: "#d8e8f0", texture: "gloss",
    description: "Transparent, impact-resistant engineering plastic",
  },

  // Composites
  {
    id: "cfrp", name: "Carbon Fiber (CFRP)", category: "Composite",
    density: 1600, youngsModulus: 181, poissonRatio: 0.30,
    yieldStrength: 600, ultimateStrength: 1500,
    thermalConductivity: 7.0, color: "#2a2a2a", texture: "weave",
    description: "Carbon fiber reinforced polymer, extreme strength-to-weight",
  },
  {
    id: "gfrp", name: "Glass Fiber (GFRP)", category: "Composite",
    density: 1900, youngsModulus: 35, poissonRatio: 0.28,
    yieldStrength: 200, ultimateStrength: 500,
    thermalConductivity: 0.3, color: "#e8e0b0", texture: "weave",
    description: "Fiberglass reinforced polymer, good strength and low cost",
  },
  {
    id: "kevlar", name: "Kevlar / Aramid Fiber", category: "Composite",
    density: 1440, youngsModulus: 124, poissonRatio: 0.36,
    yieldStrength: 400, ultimateStrength: 3000,
    thermalConductivity: 0.04, color: "#c8b040", texture: "weave",
    description: "Aramid fiber composite, exceptional impact resistance",
  },

  // Wood
  {
    id: "oak", name: "Red Oak", category: "Wood",
    density: 660, youngsModulus: 12.5, poissonRatio: 0.35,
    yieldStrength: 46, ultimateStrength: 100,
    thermalConductivity: 0.17, color: "#a0703c", texture: "grain",
    description: "Hardwood, furniture and structural applications",
  },
  {
    id: "birch_plywood", name: "Baltic Birch Plywood", category: "Wood",
    density: 680, youngsModulus: 12.0, poissonRatio: 0.30,
    yieldStrength: 40, ultimateStrength: 85,
    thermalConductivity: 0.15, color: "#c8a878", texture: "grain",
    description: "High-quality plywood, CNC machining and laser cutting",
  },

  // Ceramics
  {
    id: "alumina", name: "Alumina (Al₂O₃)", category: "Ceramic",
    density: 3950, youngsModulus: 370, poissonRatio: 0.22,
    yieldStrength: 250, ultimateStrength: 300,
    thermalConductivity: 30, color: "#f0f0e8", texture: "matte",
    description: "High-hardness structural ceramic, wear resistant",
  },
  {
    id: "zirconia", name: "Zirconia (ZrO₂)", category: "Ceramic",
    density: 6050, youngsModulus: 200, poissonRatio: 0.31,
    yieldStrength: 900, ultimateStrength: 1000,
    thermalConductivity: 2, color: "#e8e8e0", texture: "polished",
    description: "Yttria-stabilized zirconia, dental and industrial use",
  },

  // Rubber
  {
    id: "neoprene", name: "Neoprene (CR)", category: "Rubber",
    density: 1230, youngsModulus: 0.007, poissonRatio: 0.49,
    yieldStrength: 10, ultimateStrength: 25,
    thermalConductivity: 0.19, color: "#2a2a2a", texture: "matte",
    description: "Synthetic rubber, weather and chemical resistant",
  },
  {
    id: "silicone", name: "Silicone Rubber", category: "Rubber",
    density: 1100, youngsModulus: 0.005, poissonRatio: 0.49,
    yieldStrength: 7, ultimateStrength: 10,
    thermalConductivity: 0.27, color: "#d0d0d0", texture: "matte",
    description: "High-temperature silicone elastomer",
  },
];

export function getMaterialsByCategory(category: MaterialCategory): EngineeringMaterial[] {
  return materialsDatabase.filter((m) => m.category === category);
}

export function getMaterialById(id: string): EngineeringMaterial | undefined {
  return materialsDatabase.find((m) => m.id === id);
}

export function calculateMass(materialId: string, volumeM3: number): number {
  const mat = getMaterialById(materialId);
  if (!mat) return 0;
  return mat.density * volumeM3;
}
