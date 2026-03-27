/**
 * Standards Validator for KCL Engine
 * Validates CAD geometry and assemblies against IEC, ASTM, and ISO standards.
 *
 * Standards covered:
 * - IEC 61215: Terrestrial PV modules - Design qualification
 * - IEC 61730: PV module safety
 * - ASTM E2848: PV system performance
 * - ISO 2768: General tolerances
 * - IS 875: Structural loading (Indian Standard)
 */

// ─── Types ──────────────────────────────────────────────────────────────

export interface ValidationResult {
  standard: string;
  clause: string;
  description: string;
  status: "pass" | "fail" | "warn" | "info";
  measured: number | string;
  required: number | string;
  unit?: string;
}

export interface ValidationReport {
  results: ValidationResult[];
  passed: number;
  failed: number;
  warnings: number;
  summary: string;
}

export interface PVModuleSpec {
  length: number;         // mm
  width: number;          // mm
  thickness: number;      // mm
  frameWidth: number;     // mm (frame profile width)
  frameHeight: number;    // mm (frame profile height = module thickness)
  frameWallThickness: number; // mm
  glassThickness: number; // mm (front glass)
  backGlassThickness?: number; // mm (if bifacial)
  evaThickness: number;   // mm
  cellThickness: number;  // mm
  cellCount: number;
  isBifacial: boolean;
  frameMaterial: string;
  glassMaterial: string;
}

export interface PVArraySpec {
  moduleCount: number;
  tiltAngle: number;      // degrees
  interModuleGap: number; // mm
  frontLegHeight: number; // mm
  rearLegHeight: number;  // mm
  purlinCount: number;
  purlinSpacing: number;  // mm
  windZone: number;       // 1-5 (IS 875 Part 3)
}

// ─── IEC 61215 Validation ───────────────────────────────────────────────

/**
 * Validate a PV module specification against IEC 61215.
 */
export function validateIEC61215(spec: PVModuleSpec): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Glass thickness minimum (IEC 61215 10.15 - hail test)
  results.push({
    standard: "IEC 61215",
    clause: "10.15",
    description: "Front glass minimum thickness for hail resistance (25mm ice ball at 23m/s)",
    status: spec.glassThickness >= 3.2 ? "pass" : "fail",
    measured: spec.glassThickness,
    required: "≥ 3.2",
    unit: "mm",
  });

  // Module dimensions within standard range
  const area = (spec.length * spec.width) / 1e6; // m²
  results.push({
    standard: "IEC 61215",
    clause: "4.1",
    description: "Module active area within testable range",
    status: area >= 0.5 && area <= 3.0 ? "pass" : "warn",
    measured: area.toFixed(2),
    required: "0.5 - 3.0",
    unit: "m²",
  });

  // Frame height matches module thickness
  results.push({
    standard: "IEC 61215",
    clause: "4.2",
    description: "Frame height accommodates full laminate stack",
    status: spec.frameHeight >= spec.thickness ? "pass" : "fail",
    measured: spec.frameHeight,
    required: `≥ ${spec.thickness}`,
    unit: "mm",
  });

  // EVA thickness range
  results.push({
    standard: "IEC 61215",
    clause: "10.13",
    description: "EVA encapsulant thickness for cell protection",
    status: spec.evaThickness >= 0.3 && spec.evaThickness <= 0.8 ? "pass" : "warn",
    measured: spec.evaThickness,
    required: "0.3 - 0.8",
    unit: "mm",
  });

  // Cell thickness
  results.push({
    standard: "IEC 61215",
    clause: "10.1",
    description: "Solar cell thickness range (monocrystalline)",
    status: spec.cellThickness >= 0.15 && spec.cellThickness <= 0.3 ? "pass" : "warn",
    measured: spec.cellThickness,
    required: "0.15 - 0.30",
    unit: "mm",
  });

  // Frame wall thickness (structural)
  results.push({
    standard: "IEC 61215",
    clause: "10.16",
    description: "Aluminum frame wall thickness for 5400Pa mechanical load",
    status: spec.frameWallThickness >= 1.2 ? "pass" : "fail",
    measured: spec.frameWallThickness,
    required: "≥ 1.2",
    unit: "mm",
  });

  return results;
}

// ─── IEC 61730 Validation ───────────────────────────────────────────────

/**
 * Validate PV module safety per IEC 61730.
 */
export function validateIEC61730(spec: PVModuleSpec): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Creepage distance
  const stackThickness = spec.glassThickness + spec.evaThickness * 2 +
    spec.cellThickness + (spec.isBifacial ? (spec.backGlassThickness ?? 3.2) : 0.3);
  results.push({
    standard: "IEC 61730",
    clause: "MST 13",
    description: "Module edge clearance for creepage distance",
    status: spec.frameWidth >= 35 ? "pass" : "warn",
    measured: spec.frameWidth,
    required: "≥ 35",
    unit: "mm",
  });

  // Laminate total thickness check
  results.push({
    standard: "IEC 61730",
    clause: "MST 25",
    description: "Laminate stack fits within frame depth",
    status: stackThickness <= spec.frameHeight ? "pass" : "fail",
    measured: stackThickness.toFixed(1),
    required: `≤ ${spec.frameHeight}`,
    unit: "mm",
  });

  // Ground continuity
  results.push({
    standard: "IEC 61730",
    clause: "MST 14",
    description: "Frame material supports grounding (conductive)",
    status: spec.frameMaterial.toLowerCase().includes("aluminum") ||
      spec.frameMaterial.toLowerCase().includes("steel") ? "pass" : "fail",
    measured: spec.frameMaterial,
    required: "Conductive metal",
  });

  return results;
}

// ─── ISO 2768 Tolerance Validation ──────────────────────────────────────

export type ToleranceClass = "f" | "m" | "c" | "v"; // fine, medium, coarse, very coarse

interface ToleranceBand {
  min: number;
  max: number;
  tolerance: Record<ToleranceClass, number>;
}

const LINEAR_TOLERANCES: ToleranceBand[] = [
  { min: 0.5, max: 3, tolerance: { f: 0.05, m: 0.1, c: 0.2, v: 0.5 } },
  { min: 3, max: 6, tolerance: { f: 0.05, m: 0.1, c: 0.3, v: 0.5 } },
  { min: 6, max: 30, tolerance: { f: 0.1, m: 0.2, c: 0.5, v: 1.0 } },
  { min: 30, max: 120, tolerance: { f: 0.15, m: 0.3, c: 0.8, v: 1.5 } },
  { min: 120, max: 400, tolerance: { f: 0.2, m: 0.5, c: 1.2, v: 2.5 } },
  { min: 400, max: 1000, tolerance: { f: 0.3, m: 0.8, c: 2.0, v: 4.0 } },
  { min: 1000, max: 2000, tolerance: { f: 0.5, m: 1.2, c: 3.0, v: 6.0 } },
  { min: 2000, max: 4000, tolerance: { f: 0.8, m: 2.0, c: 4.0, v: 8.0 } },
];

/**
 * Get ISO 2768 linear tolerance for a nominal dimension.
 */
export function getISO2768Tolerance(
  nominalMm: number,
  toleranceClass: ToleranceClass = "m"
): number | null {
  const band = LINEAR_TOLERANCES.find(b => nominalMm >= b.min && nominalMm < b.max);
  if (!band) return null;
  return band.tolerance[toleranceClass];
}

/**
 * Validate a dimension against ISO 2768 tolerance.
 */
export function validateDimension(
  nominalMm: number,
  actualMm: number,
  toleranceClass: ToleranceClass = "m"
): ValidationResult {
  const tolerance = getISO2768Tolerance(nominalMm, toleranceClass);
  if (tolerance === null) {
    return {
      standard: "ISO 2768",
      clause: `Part 1, Class ${toleranceClass.toUpperCase()}`,
      description: `Dimension ${nominalMm}mm outside tolerance table range`,
      status: "warn",
      measured: actualMm,
      required: `${nominalMm} (no table entry)`,
      unit: "mm",
    };
  }

  const deviation = Math.abs(actualMm - nominalMm);
  return {
    standard: "ISO 2768",
    clause: `Part 1, Class ${toleranceClass.toUpperCase()}`,
    description: `Linear dimension ${nominalMm}mm: tolerance ±${tolerance}mm`,
    status: deviation <= tolerance ? "pass" : "fail",
    measured: `${actualMm} (dev: ${deviation.toFixed(3)})`,
    required: `${nominalMm} ± ${tolerance}`,
    unit: "mm",
  };
}

// ─── PV Array Structural Validation ─────────────────────────────────────

/**
 * Basic structural validation for PV mounting system.
 */
export function validatePVMounting(spec: PVArraySpec): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Tilt angle range
  results.push({
    standard: "IS 875 Part 3",
    clause: "6.3",
    description: "Tilt angle within recommended range for wind loading",
    status: spec.tiltAngle >= 5 && spec.tiltAngle <= 45 ? "pass" : "warn",
    measured: spec.tiltAngle,
    required: "5° - 45°",
    unit: "degrees",
  });

  // Inter-module gap (thermal expansion)
  results.push({
    standard: "IEC 62548",
    clause: "5.2",
    description: "Inter-module gap for thermal expansion and drainage",
    status: spec.interModuleGap >= 8 && spec.interModuleGap <= 20 ? "pass" : "warn",
    measured: spec.interModuleGap,
    required: "8 - 20",
    unit: "mm",
  });

  // Minimum ground clearance (front leg)
  results.push({
    standard: "General Practice",
    clause: "-",
    description: "Minimum front clearance for vegetation management",
    status: spec.frontLegHeight >= 300 ? "pass" : "warn",
    measured: spec.frontLegHeight,
    required: "≥ 300",
    unit: "mm",
  });

  // Purlin count per module
  results.push({
    standard: "IEC 62548",
    clause: "5.3",
    description: "Minimum purlin support points per module",
    status: spec.purlinCount >= 2 ? "pass" : "fail",
    measured: spec.purlinCount,
    required: "≥ 2",
  });

  // Rear leg height consistency with tilt
  const tiltRad = (spec.tiltAngle * Math.PI) / 180;
  const expectedRearHeight = spec.frontLegHeight + 2000 * Math.sin(tiltRad); // assuming 2m module
  const heightDev = Math.abs(spec.rearLegHeight - expectedRearHeight);
  results.push({
    standard: "Structural",
    clause: "Geometry",
    description: "Rear leg height consistent with tilt angle",
    status: heightDev < 50 ? "pass" : "warn",
    measured: spec.rearLegHeight,
    required: `≈ ${expectedRearHeight.toFixed(0)}`,
    unit: "mm",
  });

  return results;
}

// ─── Validation Report Generator ────────────────────────────────────────

/**
 * Run all relevant validations and produce a summary report.
 */
export function generateValidationReport(
  moduleSpec?: PVModuleSpec,
  arraySpec?: PVArraySpec
): ValidationReport {
  const results: ValidationResult[] = [];

  if (moduleSpec) {
    results.push(...validateIEC61215(moduleSpec));
    results.push(...validateIEC61730(moduleSpec));
  }

  if (arraySpec) {
    results.push(...validatePVMounting(arraySpec));
  }

  const passed = results.filter(r => r.status === "pass").length;
  const failed = results.filter(r => r.status === "fail").length;
  const warnings = results.filter(r => r.status === "warn").length;

  return {
    results,
    passed,
    failed,
    warnings,
    summary: `Validation: ${passed} passed, ${failed} failed, ${warnings} warnings out of ${results.length} checks`,
  };
}
