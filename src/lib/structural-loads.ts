"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// Structural Load Calculator
// Wind loads per IS 875 Part 3 / ASCE 7
// Dead load from material densities
// Live loads per IS 875 Part 2
// Load combinations per IS 456 / ASCE 7
// Solar PV wind uplift calculations
// ═══════════════════════════════════════════════════════════════════════════════

// ── Types ────────────────────────────────────────────────────────────────────

export interface WindLoadInput {
  basicWindSpeed: number;      // m/s (Vb)
  terrainCategory: 1 | 2 | 3 | 4;
  buildingHeight: number;      // meters
  buildingWidth: number;       // meters
  buildingDepth: number;       // meters
  topographyFactor?: number;   // k3 (default 1.0)
  importanceFactor?: number;   // k4 (default 1.0)
  code: "IS875" | "ASCE7";
}

export interface WindLoadResult {
  designWindSpeed: number;     // Vz (m/s)
  designWindPressure: number;  // pz (N/m²)
  windwardPressure: number;    // N/m²
  leewardPressure: number;     // N/m² (suction)
  upliftPressure: number;      // N/m² (roof)
  totalBaseShear: number;      // N
  overturningMoment: number;   // N·m
  details: {
    k1: number;               // risk coefficient
    k2: number;               // terrain/height factor
    k3: number;               // topography factor
    Cp_windward: number;
    Cp_leeward: number;
    Cp_roof: number;
  };
}

export interface DeadLoadInput {
  materialDensity: number;     // kg/m³
  volume: number;              // m³
  additionalDead: number;      // N (permanent equipment, etc.)
}

export interface DeadLoadResult {
  selfWeight: number;          // N
  totalDeadLoad: number;       // N
  uniformLoad: number;         // N/m² (if area provided)
}

export interface LiveLoadInput {
  occupancyType: string;
  area: number;                // m²
  code: "IS875" | "ASCE7";
}

export interface LiveLoadResult {
  uniformLoad: number;         // N/m²
  totalLiveLoad: number;       // N
  reductionFactor: number;
  reducedLoad: number;         // N/m²
}

export interface LoadCombination {
  name: string;
  code: string;
  factors: {
    dead: number;
    live: number;
    wind: number;
    earthquake?: number;
  };
  totalLoad: number;           // N
  description: string;
}

export interface SolarPVWindInput {
  tiltAngle: number;           // degrees
  moduleWidth: number;         // m
  moduleHeight: number;        // m
  mountHeight: number;         // m (from ground/roof)
  terrainCategory: 1 | 2 | 3 | 4;
  basicWindSpeed: number;      // m/s
  isRoofMounted: boolean;
  roofSlope?: number;          // degrees
}

export interface SolarPVWindResult {
  upliftForce: number;         // N per module
  downwardForce: number;       // N per module
  lateralForce: number;        // N per module
  netCp: number;               // net pressure coefficient
  designPressure: number;      // N/m²
  anchorForce: number;         // N per anchor point (assuming 4 points)
  safetyFactor: number;
}

// ── IS 875 / ASCE 7 Terrain Factors ─────────────────────────────────────────

/** IS 875-3 Table 2: k2 factor (terrain, height, structure size) */
function getK2_IS875(terrainCategory: number, height: number): number {
  // Simplified from IS 875 Part 3, Table 2 (Class B structures)
  const table: Record<number, { heights: number[]; values: number[] }> = {
    1: { heights: [10, 15, 20, 30, 50, 100, 150], values: [1.05, 1.09, 1.12, 1.15, 1.20, 1.26, 1.30] },
    2: { heights: [10, 15, 20, 30, 50, 100, 150], values: [1.00, 1.05, 1.07, 1.12, 1.17, 1.24, 1.28] },
    3: { heights: [10, 15, 20, 30, 50, 100, 150], values: [0.91, 0.97, 1.01, 1.06, 1.12, 1.20, 1.24] },
    4: { heights: [10, 15, 20, 30, 50, 100, 150], values: [0.80, 0.88, 0.93, 0.98, 1.05, 1.15, 1.20] },
  };

  const data = table[terrainCategory] || table[2];
  // Linear interpolation
  for (let i = 0; i < data.heights.length - 1; i++) {
    if (height <= data.heights[i]) return data.values[i];
    if (height <= data.heights[i + 1]) {
      const t = (height - data.heights[i]) / (data.heights[i + 1] - data.heights[i]);
      return data.values[i] + t * (data.values[i + 1] - data.values[i]);
    }
  }
  return data.values[data.values.length - 1];
}

/** ASCE 7 Kz factor */
function getKz_ASCE7(terrainCategory: number, height: number): number {
  // ASCE 7-22 Table 26.10-1
  const exposureParams: Record<number, { alpha: number; zg: number }> = {
    1: { alpha: 7.0, zg: 365.76 },    // Exposure D
    2: { alpha: 9.5, zg: 274.32 },    // Exposure C
    3: { alpha: 9.5, zg: 274.32 },    // Exposure B
    4: { alpha: 11.5, zg: 213.36 },   // Exposure A
  };

  const params = exposureParams[terrainCategory] || exposureParams[2];
  const z = Math.max(4.57, Math.min(height, params.zg));
  return 2.01 * Math.pow(z / params.zg, 2 / params.alpha);
}

// ── Wind Load Calculator ─────────────────────────────────────────────────────

/** Calculate wind loads per IS 875 Part 3 or ASCE 7 */
export function calculateWindLoad(input: WindLoadInput): WindLoadResult {
  const { basicWindSpeed, terrainCategory, buildingHeight, buildingWidth, buildingDepth, code } = input;
  const k3 = input.topographyFactor ?? 1.0;
  const k4 = input.importanceFactor ?? 1.0;

  let designWindSpeed: number;
  let designWindPressure: number;
  let k1: number;
  let k2: number;

  if (code === "IS875") {
    // IS 875 Part 3
    k1 = 1.0; // Risk coefficient (design life 50 years)
    k2 = getK2_IS875(terrainCategory, buildingHeight);
    designWindSpeed = basicWindSpeed * k1 * k2 * k3;
    designWindPressure = 0.6 * designWindSpeed * designWindSpeed; // pz = 0.6 * Vz²
  } else {
    // ASCE 7
    k1 = k4; // Importance factor
    k2 = getKz_ASCE7(terrainCategory, buildingHeight);
    designWindSpeed = basicWindSpeed; // Already ultimate in ASCE 7-22
    const qz = 0.613 * k2 * (designWindSpeed ** 2); // velocity pressure (N/m²)
    designWindPressure = qz * k1;
  }

  // Pressure coefficients (rectangular building, h/w ratio)
  const hwRatio = buildingHeight / buildingWidth;
  const Cp_windward = 0.8;
  const Cp_leeward = hwRatio <= 0.5 ? -0.25 : hwRatio <= 1.0 ? -0.4 : hwRatio <= 2.0 ? -0.5 : -0.6;
  const Cp_roof = hwRatio < 0.5 ? -0.8 : hwRatio < 1.0 ? -0.9 : -1.0;

  const windwardPressure = designWindPressure * Cp_windward;
  const leewardPressure = designWindPressure * Cp_leeward;
  const upliftPressure = designWindPressure * Cp_roof;

  // Total forces
  const windwardArea = buildingWidth * buildingHeight;
  const totalBaseShear = (windwardPressure - leewardPressure) * windwardArea;
  const overturningMoment = totalBaseShear * buildingHeight * 0.6; // Approximate COP at 0.6h

  return {
    designWindSpeed: Math.round(designWindSpeed * 100) / 100,
    designWindPressure: Math.round(designWindPressure * 100) / 100,
    windwardPressure: Math.round(windwardPressure * 100) / 100,
    leewardPressure: Math.round(leewardPressure * 100) / 100,
    upliftPressure: Math.round(upliftPressure * 100) / 100,
    totalBaseShear: Math.round(totalBaseShear * 100) / 100,
    overturningMoment: Math.round(overturningMoment * 100) / 100,
    details: {
      k1,
      k2: Math.round(k2 * 1000) / 1000,
      k3,
      Cp_windward,
      Cp_leeward,
      Cp_roof,
    },
  };
}

// ── Dead Load Calculator ─────────────────────────────────────────────────────

/** Calculate dead loads from material properties */
export function calculateDeadLoad(input: DeadLoadInput, area?: number): DeadLoadResult {
  const selfWeight = input.materialDensity * input.volume * 9.81; // N = kg/m³ * m³ * g
  const totalDeadLoad = selfWeight + input.additionalDead;
  const uniformLoad = area && area > 0 ? totalDeadLoad / area : 0;

  return {
    selfWeight: Math.round(selfWeight * 100) / 100,
    totalDeadLoad: Math.round(totalDeadLoad * 100) / 100,
    uniformLoad: Math.round(uniformLoad * 100) / 100,
  };
}

// ── Live Load Calculator ─────────────────────────────────────────────────────

/** IS 875 Part 2 / ASCE 7 live loads by occupancy type */
const liveLoadTable: Record<string, { is875: number; asce7: number; description: string }> = {
  residential: { is875: 2000, asce7: 1915, description: "Residential dwellings" },
  office: { is875: 2500, asce7: 2394, description: "Office buildings" },
  retail: { is875: 4000, asce7: 4788, description: "Retail / shops" },
  assembly: { is875: 5000, asce7: 4788, description: "Assembly halls" },
  warehouse_light: { is875: 5000, asce7: 5985, description: "Light warehouse" },
  warehouse_heavy: { is875: 10000, asce7: 11970, description: "Heavy warehouse" },
  hospital: { is875: 3000, asce7: 3830, description: "Hospital wards" },
  library_reading: { is875: 3000, asce7: 2873, description: "Library reading rooms" },
  library_stacks: { is875: 6000, asce7: 7182, description: "Library stack rooms" },
  parking: { is875: 2500, asce7: 1915, description: "Parking garages" },
  roof_accessible: { is875: 1500, asce7: 958, description: "Accessible roof" },
  roof_inaccessible: { is875: 750, asce7: 958, description: "Inaccessible roof" },
  industrial_light: { is875: 5000, asce7: 5985, description: "Light industrial" },
  industrial_heavy: { is875: 10000, asce7: 11970, description: "Heavy industrial" },
  stairs: { is875: 3000, asce7: 4788, description: "Stairs and corridors" },
};

export function getOccupancyTypes(): { id: string; label: string }[] {
  return Object.entries(liveLoadTable).map(([id, data]) => ({
    id,
    label: data.description,
  }));
}

/** Calculate live loads with area reduction */
export function calculateLiveLoad(input: LiveLoadInput): LiveLoadResult {
  const loadData = liveLoadTable[input.occupancyType] || liveLoadTable.office;
  const baseLoad = input.code === "IS875" ? loadData.is875 : loadData.asce7;

  // Live load reduction per IS 875 / ASCE 7
  // IS 875: R = A > 50m² ? (100/sqrt(A)) * (some factor) : 1.0
  // ASCE 7: L = L0 * (0.25 + 15/sqrt(KLL*AT))
  let reductionFactor = 1.0;
  if (input.area > 37.16) { // ASCE 7 threshold
    if (input.code === "ASCE7") {
      const KLL = 4; // interior columns
      reductionFactor = 0.25 + 15 / Math.sqrt(KLL * input.area);
      reductionFactor = Math.max(0.5, Math.min(1.0, reductionFactor));
    } else {
      // IS 875 reduction
      reductionFactor = input.area > 50 ? Math.max(0.5, 1 - 0.01 * (input.area - 50)) : 1.0;
    }
  }

  const reducedLoad = baseLoad * reductionFactor;
  const totalLiveLoad = reducedLoad * input.area;

  return {
    uniformLoad: Math.round(baseLoad * 100) / 100,
    totalLiveLoad: Math.round(totalLiveLoad * 100) / 100,
    reductionFactor: Math.round(reductionFactor * 1000) / 1000,
    reducedLoad: Math.round(reducedLoad * 100) / 100,
  };
}

// ── Load Combinations ────────────────────────────────────────────────────────

/** Generate load combinations per IS 456/IS 875 or ASCE 7 */
export function generateLoadCombinations(
  deadLoad: number,
  liveLoad: number,
  windLoad: number,
  code: "IS875" | "ASCE7"
): LoadCombination[] {
  if (code === "IS875") {
    return [
      {
        name: "LC1: 1.5 DL",
        code: "IS 456 Cl.36.4.1",
        factors: { dead: 1.5, live: 0, wind: 0 },
        totalLoad: 1.5 * deadLoad,
        description: "Dead load only (maximum gravity)",
      },
      {
        name: "LC2: 1.5 (DL + LL)",
        code: "IS 456 Cl.36.4.1",
        factors: { dead: 1.5, live: 1.5, wind: 0 },
        totalLoad: 1.5 * (deadLoad + liveLoad),
        description: "Dead + Live (standard gravity combination)",
      },
      {
        name: "LC3: 1.2 (DL + LL + WL)",
        code: "IS 456 Cl.36.4.1",
        factors: { dead: 1.2, live: 1.2, wind: 1.2 },
        totalLoad: 1.2 * (deadLoad + liveLoad + windLoad),
        description: "All loads acting together",
      },
      {
        name: "LC4: 1.5 (DL + WL)",
        code: "IS 456 Cl.36.4.1",
        factors: { dead: 1.5, live: 0, wind: 1.5 },
        totalLoad: 1.5 * (deadLoad + windLoad),
        description: "Dead + Wind (no live load)",
      },
      {
        name: "LC5: 0.9 DL + 1.5 WL",
        code: "IS 456 Cl.36.4.1",
        factors: { dead: 0.9, live: 0, wind: 1.5 },
        totalLoad: 0.9 * deadLoad + 1.5 * windLoad,
        description: "Minimum gravity + Wind (uplift check)",
      },
      {
        name: "LC6: 1.2 DL + 1.6 LL",
        code: "IS 875 Pt.5",
        factors: { dead: 1.2, live: 1.6, wind: 0 },
        totalLoad: 1.2 * deadLoad + 1.6 * liveLoad,
        description: "Maximum live load dominance",
      },
    ];
  } else {
    // ASCE 7-22 combinations
    return [
      {
        name: "LC1: 1.4 D",
        code: "ASCE 7-22 2.3.1(1)",
        factors: { dead: 1.4, live: 0, wind: 0 },
        totalLoad: 1.4 * deadLoad,
        description: "Dead load only",
      },
      {
        name: "LC2: 1.2D + 1.6L",
        code: "ASCE 7-22 2.3.1(2)",
        factors: { dead: 1.2, live: 1.6, wind: 0 },
        totalLoad: 1.2 * deadLoad + 1.6 * liveLoad,
        description: "Gravity loads (primary live)",
      },
      {
        name: "LC3: 1.2D + 1.0W + L",
        code: "ASCE 7-22 2.3.1(4)",
        factors: { dead: 1.2, live: 1.0, wind: 1.0 },
        totalLoad: 1.2 * deadLoad + liveLoad + windLoad,
        description: "Gravity + Wind",
      },
      {
        name: "LC4: 1.2D + 1.0W",
        code: "ASCE 7-22 2.3.1(4)",
        factors: { dead: 1.2, live: 0, wind: 1.0 },
        totalLoad: 1.2 * deadLoad + windLoad,
        description: "Dead + Wind (no live)",
      },
      {
        name: "LC5: 0.9D + 1.0W",
        code: "ASCE 7-22 2.3.1(6)",
        factors: { dead: 0.9, live: 0, wind: 1.0 },
        totalLoad: 0.9 * deadLoad + windLoad,
        description: "Minimum gravity + Wind (uplift check)",
      },
      {
        name: "LC6: 1.2D + 1.6L + 0.5W",
        code: "ASCE 7-22 2.3.1(2)",
        factors: { dead: 1.2, live: 1.6, wind: 0.5 },
        totalLoad: 1.2 * deadLoad + 1.6 * liveLoad + 0.5 * windLoad,
        description: "Primary live + reduced wind",
      },
    ];
  }
}

// ── Section Properties ───────────────────────────────────────────────────────

export type SectionType = "i_beam" | "c_channel" | "l_angle" | "t_section" | "rect_tube" | "rect_solid" | "circular" | "circular_hollow";

export interface SectionProperties {
  type: SectionType;
  name: string;
  area: number;              // mm²
  Ixx: number;               // mm⁴ (moment of inertia about x)
  Iyy: number;               // mm⁴ (moment of inertia about y)
  Sx: number;                // mm³ (section modulus)
  Sy: number;                // mm³
  rx: number;                // mm (radius of gyration)
  ry: number;                // mm
  J: number;                 // mm⁴ (torsional constant)
  Zx: number;                // mm³ (plastic section modulus)
}

export interface SectionDimensions {
  type: SectionType;
  d?: number;    // depth/diameter (mm)
  bf?: number;   // flange width (mm)
  tf?: number;   // flange thickness (mm)
  tw?: number;   // web thickness (mm)
  b?: number;    // width (mm)
  h?: number;    // height (mm)
  t?: number;    // thickness (mm)
}

/** Calculate section properties from dimensions */
export function calculateSectionProperties(dims: SectionDimensions): SectionProperties {
  const { type } = dims;

  switch (type) {
    case "i_beam": {
      const d = dims.d || 300;
      const bf = dims.bf || 150;
      const tf = dims.tf || 10;
      const tw = dims.tw || 7;
      const hw = d - 2 * tf;
      const area = 2 * bf * tf + hw * tw;
      const Ixx = (bf * d ** 3 - (bf - tw) * hw ** 3) / 12;
      const Iyy = (2 * tf * bf ** 3 + hw * tw ** 3) / 12;
      const Sx = Ixx / (d / 2);
      const Sy = Iyy / (bf / 2);
      const Zx = bf * tf * (d - tf) + tw * hw ** 2 / 4;
      return {
        type, name: `I ${d}x${bf}`,
        area, Ixx, Iyy, Sx, Sy,
        rx: Math.sqrt(Ixx / area), ry: Math.sqrt(Iyy / area),
        J: (2 * bf * tf ** 3 + hw * tw ** 3) / 3,
        Zx,
      };
    }
    case "c_channel": {
      const d = dims.d || 200;
      const bf = dims.bf || 75;
      const tf = dims.tf || 10;
      const tw = dims.tw || 6;
      const hw = d - 2 * tf;
      const area = 2 * bf * tf + hw * tw;
      const Ixx = (tw * d ** 3 + 2 * bf * tf ** 3 + 2 * bf * tf * ((d - tf) / 2) ** 2 - (tw > 0 ? (tw) * hw ** 3 : 0)) / 12;
      const Iyy = (2 * tf * bf ** 3 + hw * tw ** 3) / 12;
      return {
        type, name: `C ${d}x${bf}`,
        area, Ixx: Math.abs(Ixx), Iyy,
        Sx: Math.abs(Ixx) / (d / 2), Sy: Iyy / bf,
        rx: Math.sqrt(Math.abs(Ixx) / area), ry: Math.sqrt(Iyy / area),
        J: (2 * bf * tf ** 3 + hw * tw ** 3) / 3,
        Zx: area * d / 4,
      };
    }
    case "l_angle": {
      const d = dims.d || 100;
      const b = dims.b || 100;
      const t = dims.t || 10;
      const area = (d + b - t) * t;
      const Ixx = (b * t ** 3 + t * (d - t) ** 3) / 3;
      const Iyy = (d * t ** 3 + t * (b - t) ** 3) / 3;
      return {
        type, name: `L ${d}x${b}x${t}`,
        area, Ixx, Iyy,
        Sx: Ixx / d, Sy: Iyy / b,
        rx: Math.sqrt(Ixx / area), ry: Math.sqrt(Iyy / area),
        J: area * t ** 2 / 3,
        Zx: area * d / 4,
      };
    }
    case "t_section": {
      const d = dims.d || 200;
      const bf = dims.bf || 150;
      const tf = dims.tf || 10;
      const tw = dims.tw || 8;
      const area = bf * tf + (d - tf) * tw;
      const ybar = (bf * tf * (d - tf / 2) + (d - tf) * tw * (d - tf) / 2) / area;
      const Ixx = bf * tf ** 3 / 12 + bf * tf * (d - tf / 2 - ybar) ** 2 +
                  tw * (d - tf) ** 3 / 12 + tw * (d - tf) * ((d - tf) / 2 - ybar) ** 2;
      const Iyy = (tf * bf ** 3 + (d - tf) * tw ** 3) / 12;
      return {
        type, name: `T ${d}x${bf}`,
        area, Ixx, Iyy,
        Sx: Ixx / Math.max(ybar, d - ybar), Sy: Iyy / (bf / 2),
        rx: Math.sqrt(Ixx / area), ry: Math.sqrt(Iyy / area),
        J: (bf * tf ** 3 + (d - tf) * tw ** 3) / 3,
        Zx: area * d / 4,
      };
    }
    case "rect_tube": {
      const b = dims.b || 100;
      const h = dims.h || 200;
      const t = dims.t || 6;
      const area = 2 * t * (b + h - 2 * t);
      const Ixx = (b * h ** 3 - (b - 2 * t) * (h - 2 * t) ** 3) / 12;
      const Iyy = (h * b ** 3 - (h - 2 * t) * (b - 2 * t) ** 3) / 12;
      return {
        type, name: `RHS ${h}x${b}x${t}`,
        area, Ixx, Iyy,
        Sx: Ixx / (h / 2), Sy: Iyy / (b / 2),
        rx: Math.sqrt(Ixx / area), ry: Math.sqrt(Iyy / area),
        J: 2 * t * (b - t) ** 2 * (h - t) ** 2 / (b + h - 2 * t),
        Zx: b * t * (h - t) + t * (h - 2 * t) ** 2 / 4,
      };
    }
    case "rect_solid": {
      const b = dims.b || 100;
      const h = dims.h || 200;
      const area = b * h;
      const Ixx = b * h ** 3 / 12;
      const Iyy = h * b ** 3 / 12;
      return {
        type, name: `Rect ${h}x${b}`,
        area, Ixx, Iyy,
        Sx: b * h ** 2 / 6, Sy: h * b ** 2 / 6,
        rx: h / Math.sqrt(12), ry: b / Math.sqrt(12),
        J: b * h ** 3 * (1 / 3 - 0.21 * (h / b) * (1 - h ** 4 / (12 * b ** 4))),
        Zx: b * h ** 2 / 4,
      };
    }
    case "circular": {
      const d = dims.d || 100;
      const r = d / 2;
      const area = Math.PI * r ** 2;
      const I = Math.PI * r ** 4 / 4;
      return {
        type, name: `Circle D=${d}`,
        area, Ixx: I, Iyy: I,
        Sx: Math.PI * r ** 3 / 4, Sy: Math.PI * r ** 3 / 4,
        rx: r / 2, ry: r / 2,
        J: Math.PI * r ** 4 / 2,
        Zx: d ** 3 / 6,
      };
    }
    case "circular_hollow": {
      const d = dims.d || 100;
      const t = dims.t || 6;
      const R = d / 2;
      const r = R - t;
      const area = Math.PI * (R ** 2 - r ** 2);
      const I = Math.PI * (R ** 4 - r ** 4) / 4;
      return {
        type, name: `CHS D=${d} t=${t}`,
        area, Ixx: I, Iyy: I,
        Sx: I / R, Sy: I / R,
        rx: Math.sqrt(I / area), ry: Math.sqrt(I / area),
        J: Math.PI * (R ** 4 - r ** 4) / 2,
        Zx: (d ** 3 - (d - 2 * t) ** 3) / 6,
      };
    }
    default:
      return {
        type: "rect_solid", name: "Default",
        area: 10000, Ixx: 8.33e7, Iyy: 8.33e7,
        Sx: 1.67e5, Sy: 1.67e5,
        rx: 28.87, ry: 28.87,
        J: 1e8, Zx: 2.5e5,
      };
  }
}

// ── Solar PV Wind Uplift ─────────────────────────────────────────────────────

/** Calculate wind uplift on tilted solar PV modules */
export function calculateSolarPVWindLoad(input: SolarPVWindInput): SolarPVWindResult {
  const { tiltAngle, moduleWidth, moduleHeight, mountHeight, terrainCategory, basicWindSpeed, isRoofMounted } = input;

  // Design wind speed at module height
  const effectiveHeight = isRoofMounted ? mountHeight + (input.roofSlope ? 5 : 3) : mountHeight;
  const k2 = getK2_IS875(terrainCategory, Math.max(effectiveHeight, 5));
  const Vz = basicWindSpeed * k2;
  const qz = 0.6 * Vz * Vz; // N/m²

  // Net pressure coefficients for tilted panels (AS/NZS 1170.2 / ASCE 7 Chapter 29)
  const tiltRad = tiltAngle * Math.PI / 180;

  // Cp_net depends on tilt angle and edge/interior zone
  let Cp_uplift: number;
  let Cp_downward: number;

  if (tiltAngle <= 5) {
    Cp_uplift = -1.3;
    Cp_downward = 0.3;
  } else if (tiltAngle <= 15) {
    Cp_uplift = -1.5;
    Cp_downward = 0.5;
  } else if (tiltAngle <= 25) {
    Cp_uplift = -1.8;
    Cp_downward = 0.8;
  } else if (tiltAngle <= 35) {
    Cp_uplift = -2.0;
    Cp_downward = 1.2;
  } else {
    Cp_uplift = -2.2;
    Cp_downward = 1.5;
  }

  // Roof-mounted gets additional factors
  if (isRoofMounted) {
    Cp_uplift *= 1.1;
    Cp_downward *= 0.9;
  }

  const moduleArea = moduleWidth * moduleHeight;
  const designPressureUplift = qz * Cp_uplift;
  const designPressureDown = qz * Cp_downward;

  const upliftForce = Math.abs(designPressureUplift) * moduleArea;
  const downwardForce = designPressureDown * moduleArea;
  const lateralForce = qz * Math.sin(tiltRad) * moduleArea * 1.2;

  // Anchor force assuming 4 anchor points with safety factor 2.0
  const anchorForce = (upliftForce / 4) * 2.0;
  const moduleWeight = moduleArea * 12 * 9.81; // ~12 kg/m² typical PV module
  const safetyFactor = (moduleWeight + anchorForce * 4 / 2) / (upliftForce > 0 ? upliftForce : 1);

  return {
    upliftForce: Math.round(upliftForce * 100) / 100,
    downwardForce: Math.round(downwardForce * 100) / 100,
    lateralForce: Math.round(lateralForce * 100) / 100,
    netCp: Cp_uplift,
    designPressure: Math.round(Math.abs(designPressureUplift) * 100) / 100,
    anchorForce: Math.round(anchorForce * 100) / 100,
    safetyFactor: Math.round(safetyFactor * 100) / 100,
  };
}

// ── Beam Validation: Simply Supported Beam ───────────────────────────────────

/** Validate: Simply supported beam max deflection = 5wL^4 / (384EI) */
export function validateSimplySupportedBeam(
  w: number,     // distributed load (N/m)
  L: number,     // span (m)
  E: number,     // Young's modulus (Pa)
  I: number      // moment of inertia (m⁴)
): { maxDeflection: number; maxMoment: number; maxShear: number } {
  const maxDeflection = (5 * w * L ** 4) / (384 * E * I);
  const maxMoment = (w * L ** 2) / 8;
  const maxShear = (w * L) / 2;

  return {
    maxDeflection,
    maxMoment,
    maxShear,
  };
}
