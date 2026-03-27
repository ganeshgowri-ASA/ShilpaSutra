// ============================================================================
// ShilpaSutra CFD Wind Analysis for Solar PV Arrays
// IS 875 Part 3 / ASCE 7 wind load calculations
// ============================================================================

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface PVArrayConfig {
  /** Number of rows of PV modules */
  rows: number;
  /** Number of columns per row */
  columns: number;
  /** Module width (portrait/landscape) [m] */
  moduleWidth: number;
  /** Module height [m] */
  moduleHeight: number;
  /** Tilt angle from horizontal [degrees] */
  tiltAngle: number;
  /** Ground clearance at lowest edge [m] */
  groundClearance: number;
  /** Row-to-row spacing [m] */
  rowSpacing: number;
  /** Mounting type */
  mountType: "ground-fixed" | "ground-tracker" | "rooftop" | "carport";
}

export interface WindConditions {
  /** Basic wind speed [m/s] */
  basicWindSpeed: number;
  /** Wind direction [degrees from North, 0=N, 90=E, 180=S, 270=W] */
  windDirection: number;
  /** Terrain category (IS 875) or exposure category (ASCE 7) */
  terrainCategory: 1 | 2 | 3 | 4;
  /** Topography factor */
  topographyFactor: number;
  /** Importance factor */
  importanceFactor: number;
  /** Reference height above ground [m] */
  referenceHeight: number;
}

export interface WindLoadResult {
  /** Net pressure coefficient Cp,net */
  cpNet: number;
  /** Design wind pressure [Pa] */
  designPressure: number;
  /** Uplift force per module [N] */
  upliftForce: number;
  /** Drag force per module [N] */
  dragForce: number;
  /** Overturning moment per module [N.m] */
  overturningMoment: number;
  /** Dynamic pressure [Pa] */
  dynamicPressure: number;
}

export interface WindAnalysisReport {
  config: PVArrayConfig;
  conditions: WindConditions;
  /** Results per wind direction */
  directionResults: {
    direction: number;
    label: string;
    loads: WindLoadResult;
    /** CFD-computed pressure coefficient */
    cfdCp: number;
    /** Analytical (code) pressure coefficient */
    codeCp: number;
    /** Difference between CFD and code [%] */
    difference: number;
  }[];
  /** Critical (governing) load case */
  criticalCase: {
    direction: number;
    maxUplift: number;
    maxDrag: number;
    maxMoment: number;
  };
  /** Code reference used */
  codeReference: string;
  /** Design recommendations */
  recommendations: string[];
}

export interface CFDDomainConfig {
  /** Domain dimensions [m] */
  length: number;
  width: number;
  height: number;
  /** Grid resolution */
  nx: number;
  ny: number;
  /** Inlet velocity profile type */
  velocityProfile: "uniform" | "log-law" | "power-law";
  /** Power law exponent (terrain-dependent) */
  powerLawExponent: number;
  /** Roughness length z0 [m] */
  roughnessLength: number;
}

// ----------------------------------------------------------------------------
// Wind Code Constants
// ----------------------------------------------------------------------------

/** IS 875 Part 3 terrain category parameters */
const IS875_TERRAIN: Record<number, { alpha: number; z0: number; description: string }> = {
  1: { alpha: 0.10, z0: 0.002, description: "Open sea, smooth flat terrain" },
  2: { alpha: 0.15, z0: 0.02, description: "Open terrain with scattered obstructions" },
  3: { alpha: 0.20, z0: 0.2, description: "Terrain with many obstructions (suburban)" },
  4: { alpha: 0.27, z0: 2.0, description: "Terrain with large obstructions (urban)" },
};

/** ASCE 7 exposure category parameters */
const ASCE7_EXPOSURE: Record<number, { alpha: number; zg: number; description: string }> = {
  1: { alpha: 0.10, zg: 274, description: "Exposure D - Flat unobstructed" },
  2: { alpha: 0.143, zg: 274, description: "Exposure C - Open terrain" },
  3: { alpha: 0.20, zg: 366, description: "Exposure B - Urban/suburban" },
  4: { alpha: 0.25, zg: 457, description: "Exposure A - Large city centers" },
};

// ----------------------------------------------------------------------------
// Wind Speed Profile
// ----------------------------------------------------------------------------

/**
 * Calculate design wind speed at height z using power law profile.
 * V(z) = V_ref * (z / z_ref)^alpha
 */
export function windSpeedAtHeight(
  basicWindSpeed: number,
  height: number,
  terrainCategory: number,
  referenceHeight: number = 10,
): number {
  const terrain = IS875_TERRAIN[terrainCategory] || IS875_TERRAIN[2];
  return basicWindSpeed * Math.pow(Math.max(height, 1) / referenceHeight, terrain.alpha);
}

/**
 * Calculate dynamic pressure q = 0.5 * rho * V^2
 * Using standard air density at sea level (1.225 kg/m³)
 */
export function dynamicPressure(
  windSpeed: number,
  airDensity: number = 1.225,
): number {
  return 0.5 * airDensity * windSpeed * windSpeed;
}

// ----------------------------------------------------------------------------
// IS 875 Part 3 Wind Load Calculation
// ----------------------------------------------------------------------------

/**
 * Calculate net pressure coefficient for ground-mounted PV arrays
 * per IS 875 Part 3 recommendations for open structures.
 *
 * Cp depends on tilt angle, wind direction relative to panel, and row position.
 */
export function calculateIS875Cp(
  tiltAngle: number,
  windAngleOfAttack: number,
  isEdgeRow: boolean = false,
): { cpPositive: number; cpNegative: number; cpNet: number } {
  // Wind angle of attack relative to panel surface
  const aoa = Math.abs(windAngleOfAttack % 360);
  const tiltRad = tiltAngle * Math.PI / 180;

  // Simplified Cp values based on IS 875 Table for monoslope/duo-pitch structures
  let cpPositive: number;
  let cpNegative: number;

  if (aoa <= 45 || aoa >= 315) {
    // Wind from front (facing panel surface)
    cpPositive = 0.5 + 0.7 * Math.sin(tiltRad);
    cpNegative = -(0.4 + 0.5 * Math.sin(tiltRad));
  } else if (aoa >= 135 && aoa <= 225) {
    // Wind from behind
    cpPositive = 0.3 + 0.4 * Math.sin(tiltRad);
    cpNegative = -(0.8 + 0.6 * Math.sin(tiltRad));
  } else {
    // Wind from side (oblique)
    cpPositive = 0.4 + 0.3 * Math.sin(tiltRad);
    cpNegative = -(0.6 + 0.4 * Math.sin(tiltRad));
  }

  // Edge row amplification factor (increased turbulence)
  if (isEdgeRow) {
    cpPositive *= 1.2;
    cpNegative *= 1.3;
  }

  const cpNet = cpPositive + cpNegative;

  return { cpPositive, cpNegative, cpNet };
}

/**
 * Calculate design wind pressure per IS 875 Part 3.
 * pd = 0.6 * Vz² * k1 * k2 * k3 * Cp
 */
export function calculateIS875WindPressure(
  conditions: WindConditions,
  cp: number,
): number {
  const Vz = windSpeedAtHeight(
    conditions.basicWindSpeed,
    conditions.referenceHeight,
    conditions.terrainCategory,
  );
  // pd = 0.6 * Vz² (Pa) with correction factors
  const pd = 0.6 * Vz * Vz
    * conditions.importanceFactor
    * conditions.topographyFactor;
  return pd * Math.abs(cp);
}

// ----------------------------------------------------------------------------
// ASCE 7 Wind Load Calculation
// ----------------------------------------------------------------------------

/**
 * Calculate wind loads per ASCE 7-22 Chapter 29 (Open Buildings).
 * Uses velocity pressure exposure coefficient Kz.
 */
export function calculateASCE7Kz(
  height: number,
  exposureCategory: number,
): number {
  const exp = ASCE7_EXPOSURE[exposureCategory] || ASCE7_EXPOSURE[2];
  const z = Math.max(height, 4.6); // minimum height = 15 ft ≈ 4.6 m
  return 2.01 * Math.pow(z / exp.zg, 2 / exp.alpha);
}

/**
 * Calculate ASCE 7 velocity pressure qz.
 * qz = 0.613 * Kz * Kzt * Kd * Ke * V² (in Pa, when V in m/s)
 */
export function calculateASCE7VelocityPressure(
  conditions: WindConditions,
): number {
  const Kz = calculateASCE7Kz(conditions.referenceHeight, conditions.terrainCategory);
  const Kzt = conditions.topographyFactor;
  const Kd = 0.85; // wind directionality factor for solar panels
  const Ke = 1.0; // ground elevation factor (sea level)
  const V = conditions.basicWindSpeed;

  return 0.613 * Kz * Kzt * Kd * Ke * V * V;
}

// ----------------------------------------------------------------------------
// PV Array Domain Setup
// ----------------------------------------------------------------------------

/**
 * Create a CFD domain configuration for PV array wind analysis.
 * Domain extends 5H upstream, 15H downstream, 5H lateral, 6H height
 * where H is the max panel height.
 */
export function createPVDomainConfig(
  pvConfig: PVArrayConfig,
  conditions: WindConditions,
  meshDensity: "coarse" | "medium" | "fine" = "medium",
): CFDDomainConfig {
  const tiltRad = pvConfig.tiltAngle * Math.PI / 180;
  const maxPanelHeight = pvConfig.groundClearance
    + pvConfig.moduleHeight * Math.sin(tiltRad);
  const H = Math.max(maxPanelHeight, 2); // minimum reference height 2m

  const arrayLength = pvConfig.rows * pvConfig.rowSpacing;
  const arrayWidth = pvConfig.columns * pvConfig.moduleWidth;

  const domainLength = 5 * H + arrayLength + 15 * H;
  const domainWidth = 2 * 5 * H + arrayWidth;
  const domainHeight = 6 * H;

  const terrain = IS875_TERRAIN[conditions.terrainCategory] || IS875_TERRAIN[2];

  const resMultiplier = meshDensity === "coarse" ? 0.5 : meshDensity === "fine" ? 2 : 1;
  const baseRes = Math.round(40 * resMultiplier);

  return {
    length: domainLength,
    width: domainWidth,
    height: domainHeight,
    nx: Math.round(baseRes * domainLength / H),
    ny: Math.round(baseRes * domainHeight / H),
    velocityProfile: "power-law",
    powerLawExponent: terrain.alpha,
    roughnessLength: terrain.z0,
  };
}

/**
 * Calculate wind loads on a PV module for a specific direction.
 */
export function calculatePVWindLoads(
  pvConfig: PVArrayConfig,
  conditions: WindConditions,
  cfdCp?: number,
): WindLoadResult {
  // Use CFD Cp if available, otherwise use code Cp
  const aoa = conditions.windDirection;
  const { cpNet } = calculateIS875Cp(pvConfig.tiltAngle, aoa);
  const effectiveCp = cfdCp ?? cpNet;

  const Vz = windSpeedAtHeight(
    conditions.basicWindSpeed,
    conditions.referenceHeight,
    conditions.terrainCategory,
  );
  const q = dynamicPressure(Vz);
  const moduleArea = pvConfig.moduleWidth * pvConfig.moduleHeight;

  const tiltRad = pvConfig.tiltAngle * Math.PI / 180;

  // Net design pressure
  const designPressure = q * Math.abs(effectiveCp)
    * conditions.importanceFactor * conditions.topographyFactor;

  // Force components
  const normalForce = designPressure * moduleArea;
  const upliftForce = normalForce * Math.cos(tiltRad);
  const dragForce = normalForce * Math.sin(tiltRad);

  // Overturning moment about base
  const leverArm = pvConfig.groundClearance + 0.5 * pvConfig.moduleHeight * Math.sin(tiltRad);
  const overturningMoment = normalForce * leverArm;

  return {
    cpNet: effectiveCp,
    designPressure,
    upliftForce,
    dragForce,
    overturningMoment,
    dynamicPressure: q,
  };
}

// ----------------------------------------------------------------------------
// Full Wind Analysis Report
// ----------------------------------------------------------------------------

/**
 * Run a complete wind analysis for a PV array across multiple wind directions.
 * Compares CFD results with IS 875 Part 3 / ASCE 7 analytical values.
 */
export function generateWindAnalysisReport(
  pvConfig: PVArrayConfig,
  conditions: WindConditions,
  directions: number[] = [0, 45, 90, 135, 180],
  cfdCpValues?: Record<number, number>,
): WindAnalysisReport {
  const directionResults = directions.map(dir => {
    const dirConditions = { ...conditions, windDirection: dir };
    const loads = calculatePVWindLoads(pvConfig, dirConditions, cfdCpValues?.[dir]);
    const { cpNet: codeCp } = calculateIS875Cp(pvConfig.tiltAngle, dir);
    const cfdCp = cfdCpValues?.[dir] ?? codeCp;
    const difference = codeCp !== 0 ? ((cfdCp - codeCp) / Math.abs(codeCp)) * 100 : 0;

    const labels: Record<number, string> = {
      0: "North (0°)", 45: "NE (45°)", 90: "East (90°)",
      135: "SE (135°)", 180: "South (180°)", 225: "SW (225°)",
      270: "West (270°)", 315: "NW (315°)",
    };

    return {
      direction: dir,
      label: labels[dir] || `${dir}°`,
      loads,
      cfdCp,
      codeCp,
      difference: Math.round(difference * 10) / 10,
    };
  });

  // Find critical case
  const maxUpliftCase = directionResults.reduce((max, r) =>
    r.loads.upliftForce > max.loads.upliftForce ? r : max, directionResults[0]);
  const maxDragCase = directionResults.reduce((max, r) =>
    r.loads.dragForce > max.loads.dragForce ? r : max, directionResults[0]);
  const maxMomentCase = directionResults.reduce((max, r) =>
    r.loads.overturningMoment > max.loads.overturningMoment ? r : max, directionResults[0]);

  const criticalCase = {
    direction: maxUpliftCase.direction,
    maxUplift: maxUpliftCase.loads.upliftForce,
    maxDrag: maxDragCase.loads.dragForce,
    maxMoment: maxMomentCase.loads.overturningMoment,
  };

  // Generate recommendations
  const recommendations: string[] = [];
  const maxUpliftPressure = Math.max(...directionResults.map(r => r.loads.designPressure));

  if (pvConfig.tiltAngle > 25) {
    recommendations.push(`High tilt angle (${pvConfig.tiltAngle}°) increases wind loads. Consider reducing to 15-25° if generation allows.`);
  }
  if (pvConfig.groundClearance < 0.5) {
    recommendations.push("Low ground clearance may cause ground-effect acceleration. Ensure minimum 0.5m clearance.");
  }
  if (maxUpliftPressure > 2000) {
    recommendations.push("High uplift pressures detected. Verify foundation/anchor design for pullout resistance.");
  }
  if (conditions.terrainCategory <= 1) {
    recommendations.push("Open terrain exposure increases wind loads significantly. Consider wind fencing if practical.");
  }

  recommendations.push(
    `Critical wind direction: ${maxUpliftCase.label} produces maximum uplift of ${criticalCase.maxUplift.toFixed(0)} N/module.`,
    `Design foundation for overturning moment of ${criticalCase.maxMoment.toFixed(0)} N.m per module.`,
    `Verify all connections for ${maxUpliftPressure.toFixed(0)} Pa design pressure.`,
  );

  return {
    config: pvConfig,
    conditions,
    directionResults,
    criticalCase,
    codeReference: "IS 875 Part 3:2015 / ASCE 7-22 Chapter 29",
    recommendations,
  };
}

// ----------------------------------------------------------------------------
// Natural Language CFD Setup for PV Wind Analysis
// ----------------------------------------------------------------------------

export interface ParsedPVWindCommand {
  velocity: number;
  direction: number;
  directionLabel: string;
  tiltAngle: number;
  rows: number;
  columns: number;
  terrainCategory: 1 | 2 | 3 | 4;
  description: string;
}

/**
 * Parse a natural language command for PV wind analysis.
 * Example: "Run wind analysis on PV array at 40 m/s from south"
 */
export function parsePVWindCommand(text: string): ParsedPVWindCommand | null {
  const t = text.toLowerCase();

  // Check if this is a PV/solar wind analysis command
  if (!t.includes("pv") && !t.includes("solar") && !t.includes("panel")) {
    return null;
  }
  if (!t.includes("wind") && !t.includes("load") && !t.includes("analysis")) {
    return null;
  }

  // Extract velocity
  let velocity = 40;
  const msMatch = text.match(/(\d+(?:\.\d+)?)\s*m\/s/i);
  const kmhMatch = text.match(/(\d+(?:\.\d+)?)\s*km\/h/i);
  const mphMatch = text.match(/(\d+(?:\.\d+)?)\s*mph/i);
  if (msMatch) velocity = parseFloat(msMatch[1]);
  else if (kmhMatch) velocity = parseFloat(kmhMatch[1]) / 3.6;
  else if (mphMatch) velocity = parseFloat(mphMatch[1]) * 0.44704;

  // Extract direction
  let direction = 180; // default south
  let directionLabel = "South";
  const dirMap: Record<string, { deg: number; label: string }> = {
    "north": { deg: 0, label: "North" },
    "northeast": { deg: 45, label: "Northeast" },
    "ne ": { deg: 45, label: "Northeast" },
    "east": { deg: 90, label: "East" },
    "southeast": { deg: 135, label: "Southeast" },
    "se ": { deg: 135, label: "Southeast" },
    "south": { deg: 180, label: "South" },
    "southwest": { deg: 225, label: "Southwest" },
    "sw ": { deg: 225, label: "Southwest" },
    "west": { deg: 270, label: "West" },
    "northwest": { deg: 315, label: "Northwest" },
    "nw ": { deg: 315, label: "Northwest" },
  };

  for (const [key, val] of Object.entries(dirMap)) {
    if (t.includes(key)) {
      direction = val.deg;
      directionLabel = val.label;
      break;
    }
  }

  // Extract degree direction
  const degMatch = text.match(/(\d+)\s*(?:deg|degrees?|°)/i);
  if (degMatch) {
    direction = parseInt(degMatch[1]) % 360;
    directionLabel = `${direction}°`;
  }

  // Extract tilt angle
  let tiltAngle = 20;
  const tiltMatch = text.match(/(\d+)\s*(?:deg|degrees?|°)\s*tilt/i)
    || text.match(/tilt(?:ed)?\s*(?:at|to)?\s*(\d+)/i);
  if (tiltMatch) tiltAngle = parseInt(tiltMatch[1]);

  // Extract array size
  let rows = 4, columns = 10;
  const rowMatch = text.match(/(\d+)\s*rows?/i);
  const colMatch = text.match(/(\d+)\s*col(?:umn)?s?/i);
  if (rowMatch) rows = parseInt(rowMatch[1]);
  if (colMatch) columns = parseInt(colMatch[1]);

  // Extract terrain
  let terrainCategory: 1 | 2 | 3 | 4 = 2;
  if (t.includes("open") || t.includes("flat") || t.includes("coastal")) terrainCategory = 1;
  else if (t.includes("suburban") || t.includes("residential")) terrainCategory = 3;
  else if (t.includes("urban") || t.includes("city")) terrainCategory = 4;

  return {
    velocity,
    direction,
    directionLabel,
    tiltAngle,
    rows,
    columns,
    terrainCategory,
    description: text.trim(),
  };
}
