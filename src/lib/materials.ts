export interface Material {
  name: string;
  density: number;           // kg/m³
  youngsModulus: number;     // GPa
  yieldStrength: number;     // MPa
  poissonRatio: number;
  thermalConductivity: number; // W/(m·K)
  color: string;             // hex
}

export const materials: Material[] = [
  {
    name: "Steel 1045",
    density: 7850,
    youngsModulus: 200,
    yieldStrength: 530,
    poissonRatio: 0.29,
    thermalConductivity: 49.8,
    color: "#8a8a8a",
  },
  {
    name: "Aluminum 6061-T6",
    density: 2700,
    youngsModulus: 68.9,
    yieldStrength: 276,
    poissonRatio: 0.33,
    thermalConductivity: 167,
    color: "#d4d4d4",
  },
  {
    name: "Titanium Ti-6Al-4V",
    density: 4430,
    youngsModulus: 113.8,
    yieldStrength: 880,
    poissonRatio: 0.342,
    thermalConductivity: 6.7,
    color: "#b0c4d8",
  },
  {
    name: "ABS Plastic",
    density: 1050,
    youngsModulus: 2.3,
    yieldStrength: 40,
    poissonRatio: 0.35,
    thermalConductivity: 0.17,
    color: "#f0e68c",
  },
  {
    name: "Nylon PA66",
    density: 1140,
    youngsModulus: 3.0,
    yieldStrength: 82,
    poissonRatio: 0.39,
    thermalConductivity: 0.25,
    color: "#faf0e6",
  },
  {
    name: "Oak Wood",
    density: 750,
    youngsModulus: 12,
    yieldStrength: 58,
    poissonRatio: 0.37,
    thermalConductivity: 0.17,
    color: "#8b6914",
  },
  {
    name: "Copper C11000",
    density: 8960,
    youngsModulus: 117,
    yieldStrength: 70,
    poissonRatio: 0.34,
    thermalConductivity: 388,
    color: "#b87333",
  },
  {
    name: "Brass C36000",
    density: 8500,
    youngsModulus: 97,
    yieldStrength: 124,
    poissonRatio: 0.34,
    thermalConductivity: 115,
    color: "#cfb53b",
  },
  {
    name: "Stainless Steel 304",
    density: 8000,
    youngsModulus: 193,
    yieldStrength: 215,
    poissonRatio: 0.29,
    thermalConductivity: 16.2,
    color: "#c0c0c0",
  },
  {
    name: "Carbon Fiber CFRP",
    density: 1600,
    youngsModulus: 230,
    yieldStrength: 600,
    poissonRatio: 0.27,
    thermalConductivity: 7.0,
    color: "#1a1a1a",
  },
  {
    name: "HDPE",
    density: 955,
    youngsModulus: 1.1,
    yieldStrength: 26,
    poissonRatio: 0.46,
    thermalConductivity: 0.48,
    color: "#e8f5e9",
  },
  {
    name: "Polycarbonate",
    density: 1200,
    youngsModulus: 2.4,
    yieldStrength: 60,
    poissonRatio: 0.37,
    thermalConductivity: 0.20,
    color: "#e3f2fd",
  },
  {
    name: "Cast Iron ASTM A48",
    density: 7200,
    youngsModulus: 100,
    yieldStrength: 172,
    poissonRatio: 0.26,
    thermalConductivity: 46,
    color: "#4a4a4a",
  },
  {
    name: "Inconel 718",
    density: 8190,
    youngsModulus: 200,
    yieldStrength: 1035,
    poissonRatio: 0.29,
    thermalConductivity: 11.4,
    color: "#8fbc8f",
  },
  {
    name: "Bronze C93200",
    density: 8830,
    youngsModulus: 103,
    yieldStrength: 130,
    poissonRatio: 0.34,
    thermalConductivity: 58,
    color: "#cd7f32",
  },
  {
    name: "Tool Steel D2",
    density: 7700,
    youngsModulus: 210,
    yieldStrength: 1400,
    poissonRatio: 0.28,
    thermalConductivity: 20,
    color: "#606060",
  },
  {
    name: "Magnesium AZ31B",
    density: 1770,
    youngsModulus: 45,
    yieldStrength: 200,
    poissonRatio: 0.35,
    thermalConductivity: 77,
    color: "#e8e8e0",
  },
];

export function getMaterialByName(name: string): Material | undefined {
  return materials.find((m) => m.name.toLowerCase().includes(name.toLowerCase()));
}
