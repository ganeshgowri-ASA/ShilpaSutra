// ═══════════════════════════════════════════════════════════════════════════════
// GD&T Engine — ISO 1101 / ASME Y14.5 Geometric Dimensioning & Tolerancing
// ═══════════════════════════════════════════════════════════════════════════════

// ── Symbol Definitions ────────────────────────────────────────────────────────

export type GDTCharacteristic =
  | "flatness" | "straightness" | "circularity" | "cylindricity"          // Form
  | "perpendicularity" | "parallelism" | "angularity"                      // Orientation
  | "position" | "concentricity" | "symmetry"                              // Location
  | "profile_line" | "profile_surface"                                     // Profile
  | "circular_runout" | "total_runout";                                    // Runout

export type MaterialConditionModifier = "MMC" | "LMC" | "RFS";
export type ToleranceZoneShape = "diameter" | "width" | "spherical";
export type DatumPrecedence = "primary" | "secondary" | "tertiary";

export interface GDTSymbolDef {
  unicode: string;
  asme: string;
  label: string;
  category: "Form" | "Orientation" | "Location" | "Profile" | "Runout";
  requiresDatum: boolean;
  canUseDiameterZone: boolean;
  canUseMMC: boolean;
}

export const GDT_SYMBOL_TABLE: Record<GDTCharacteristic, GDTSymbolDef> = {
  flatness:          { unicode: "⏥", asme: "⏥", label: "Flatness",           category: "Form",        requiresDatum: false, canUseDiameterZone: false, canUseMMC: false },
  straightness:      { unicode: "⏤", asme: "⏤", label: "Straightness",       category: "Form",        requiresDatum: false, canUseDiameterZone: true,  canUseMMC: true  },
  circularity:       { unicode: "○", asme: "○",  label: "Circularity",        category: "Form",        requiresDatum: false, canUseDiameterZone: false, canUseMMC: false },
  cylindricity:      { unicode: "⌭", asme: "⌭", label: "Cylindricity",       category: "Form",        requiresDatum: false, canUseDiameterZone: false, canUseMMC: false },
  perpendicularity:  { unicode: "⟂", asme: "⊥", label: "Perpendicularity",   category: "Orientation", requiresDatum: true,  canUseDiameterZone: true,  canUseMMC: true  },
  parallelism:       { unicode: "∥", asme: "∥", label: "Parallelism",        category: "Orientation", requiresDatum: true,  canUseDiameterZone: true,  canUseMMC: true  },
  angularity:        { unicode: "∠", asme: "∠", label: "Angularity",         category: "Orientation", requiresDatum: true,  canUseDiameterZone: true,  canUseMMC: true  },
  position:          { unicode: "⌖", asme: "⊕", label: "Position",           category: "Location",    requiresDatum: true,  canUseDiameterZone: true,  canUseMMC: true  },
  concentricity:     { unicode: "◎", asme: "◎", label: "Concentricity",      category: "Location",    requiresDatum: true,  canUseDiameterZone: false, canUseMMC: false },
  symmetry:          { unicode: "⌯", asme: "≡",  label: "Symmetry",           category: "Location",    requiresDatum: true,  canUseDiameterZone: false, canUseMMC: false },
  profile_line:      { unicode: "⌒", asme: "⌒", label: "Profile of a Line",  category: "Profile",     requiresDatum: false, canUseDiameterZone: false, canUseMMC: false },
  profile_surface:   { unicode: "⌓", asme: "⌓", label: "Profile of Surface", category: "Profile",     requiresDatum: false, canUseDiameterZone: false, canUseMMC: false },
  circular_runout:   { unicode: "↗", asme: "↗",  label: "Circular Runout",    category: "Runout",      requiresDatum: true,  canUseDiameterZone: false, canUseMMC: false },
  total_runout:      { unicode: "⟿", asme: "⟿", label: "Total Runout",       category: "Runout",      requiresDatum: true,  canUseDiameterZone: false, canUseMMC: false },
};

// ── Feature Control Frame ─────────────────────────────────────────────────────

export interface DatumReference {
  letter: string;
  modifier?: MaterialConditionModifier;
  precedence: DatumPrecedence;
}

export interface FeatureControlFrame {
  id: string;
  characteristic: GDTCharacteristic;
  toleranceValue: number;               // in mm (or degrees for angularity)
  toleranceZone: ToleranceZoneShape;
  modifier?: MaterialConditionModifier;
  datumRefs: DatumReference[];
  projectedToleranceZone?: number;      // projected zone height in mm
  freeState: boolean;
  statisticalTolerance: boolean;
  tangentPlane: boolean;
  position?: [number, number, number];  // 3D anchor point
  normal?: [number, number, number];    // face normal for billboard
  leaderPoints?: [number, number][];    // 2D leader line waypoints
  featureLabel?: string;               // annotation label (e.g. "Face A")
}

export function createFeatureControlFrame(
  characteristic: GDTCharacteristic,
  toleranceValue: number,
  datumRefs: string[] = [],
  opts: Partial<Pick<FeatureControlFrame, "toleranceZone" | "modifier" | "freeState" | "statisticalTolerance" | "tangentPlane">> = {}
): FeatureControlFrame {
  return {
    id: `fcf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    characteristic,
    toleranceValue,
    toleranceZone: opts.toleranceZone ?? (GDT_SYMBOL_TABLE[characteristic].canUseDiameterZone ? "diameter" : "width"),
    modifier: opts.modifier,
    datumRefs: datumRefs.map((letter, i) => ({
      letter,
      precedence: (["primary", "secondary", "tertiary"] as DatumPrecedence[])[i] ?? "primary",
    })),
    freeState: opts.freeState ?? false,
    statisticalTolerance: opts.statisticalTolerance ?? false,
    tangentPlane: opts.tangentPlane ?? false,
  };
}

// ── Tolerance Zone Calculation ─────────────────────────────────────────────────

export interface ToleranceZone {
  shape: ToleranceZoneShape;
  value: number;           // half-width or radius, depending on shape
  description: string;
  visualColor: string;
  opacity: number;
}

export function computeToleranceZone(fcf: FeatureControlFrame): ToleranceZone {
  const halfVal = fcf.toleranceValue / 2;

  switch (fcf.toleranceZone) {
    case "diameter":
      return {
        shape: "diameter",
        value: halfVal,
        description: `Cylindrical zone ⌀${fcf.toleranceValue.toFixed(3)} mm`,
        visualColor: "#00D4FF",
        opacity: 0.18,
      };
    case "spherical":
      return {
        shape: "spherical",
        value: halfVal,
        description: `Spherical zone S⌀${fcf.toleranceValue.toFixed(3)} mm`,
        visualColor: "#AA44FF",
        opacity: 0.15,
      };
    default:
      return {
        shape: "width",
        value: halfVal,
        description: `Two parallel planes ${fcf.toleranceValue.toFixed(3)} mm apart`,
        visualColor: "#FFAA00",
        opacity: 0.20,
      };
  }
}

/** Verify whether actual deviation is within the tolerance zone */
export function checkConformance(
  actualDeviation: number,
  fcf: FeatureControlFrame
): { pass: boolean; margin: number; percentUsed: number } {
  const zone = computeToleranceZone(fcf);
  const allowable = fcf.toleranceZone === "width" ? zone.value * 2 : zone.value * 2; // diameter = total
  const pass = actualDeviation <= allowable;
  return {
    pass,
    margin: allowable - actualDeviation,
    percentUsed: (actualDeviation / allowable) * 100,
  };
}

// ── ISO 2768 General Tolerances ───────────────────────────────────────────────

export type ISO2768LinearGrade = "f" | "m" | "c" | "v";   // fine, medium, coarse, very coarse
export type ISO2768AngularGrade = "f" | "m" | "c" | "v";
export type ISO2768GeometricGrade = "H" | "K" | "L";       // H=fine, K=medium, L=coarse

// Linear tolerances in mm for nominal ranges (ISO 2768-1 Table 1)
const ISO2768_LINEAR: Record<ISO2768LinearGrade, [number, number, number][]> = {
  //                      [maxRange, plusMinus_tolerance]  (ranges: ≤3, ≤6, ≤30, ≤120, ≤400, ≤1000, ≤2000, ≤4000)
  f: [[3,0.05],[6,0.05],[30,0.1],[120,0.15],[400,0.2],[1000,0.3],[2000,0.5],[4000,0.5]],
  m: [[3,0.1],[6,0.1],[30,0.2],[120,0.3],[400,0.5],[1000,0.8],[2000,1.2],[4000,2.0]],
  c: [[3,0.2],[6,0.3],[30,0.5],[120,0.8],[400,1.2],[1000,2.0],[2000,3.0],[4000,4.0]],
  v: [[3,0.5],[6,1.0],[30,1.5],[120,2.5],[400,4.0],[1000,6.0],[2000,8.0],[4000,12.0]],
};

// Angular tolerances in degrees
const ISO2768_ANGULAR: Record<ISO2768AngularGrade, [number, number][]> = {
  f: [[10,1],[50,0.5],[120,0.25],[400,0.166],[Infinity,0.083]],
  m: [[10,1],[50,1],[120,0.5],[400,0.333],[Infinity,0.166]],
  c: [[10,1.5],[50,1],[120,0.75],[400,0.5],[Infinity,0.25]],
  v: [[10,3],[50,2],[120,1],[400,0.666],[Infinity,0.333]],
};

// Geometric tolerances in mm (ISO 2768-2 Table 1: straightness/flatness)
const ISO2768_GEOMETRIC: Record<ISO2768GeometricGrade, [number, number][]> = {
  // [maxLength, tolerance]
  H: [[10,0.02],[30,0.05],[100,0.1],[300,0.2],[1000,0.3],[3000,0.4]],
  K: [[10,0.05],[30,0.1],[100,0.2],[300,0.4],[1000,0.6],[3000,0.8]],
  L: [[10,0.1],[30,0.2],[100,0.4],[300,0.8],[1000,1.2],[3000,1.6]],
};

export interface ISO2768Result {
  grade: string;
  linearTolerance: number;         // ± mm
  angularTolerance: number;        // ± degrees
  straightnessFlatnessTolerance: number; // mm
  circularityTolerance: number;    // mm
  description: string;
}

export function getISO2768Tolerance(
  nominalSize: number,           // mm
  linearGrade: ISO2768LinearGrade = "m",
  geometricGrade: ISO2768GeometricGrade = "K"
): ISO2768Result {
  // Linear
  const linRow = ISO2768_LINEAR[linearGrade].find(([max]) => nominalSize <= max);
  const linearTol = linRow ? linRow[1] : ISO2768_LINEAR[linearGrade].at(-1)![1];

  // Angular (use same grade for linear and angular in combined grade)
  const angRow = ISO2768_ANGULAR[linearGrade as ISO2768AngularGrade].find(([max]) => nominalSize <= max);
  const angularTol = angRow ? angRow[1] : 0.166;

  // Geometric
  const geoRow = ISO2768_GEOMETRIC[geometricGrade].find(([max]) => nominalSize <= max);
  const geoTol = geoRow ? geoRow[1] : ISO2768_GEOMETRIC[geometricGrade].at(-1)![1];

  const gradeLabels: Record<ISO2768LinearGrade, string> = { f: "Fine", m: "Medium", c: "Coarse", v: "Very Coarse" };
  const geoGradeLabels: Record<ISO2768GeometricGrade, string> = { H: "Fine", K: "Medium", L: "Coarse" };

  return {
    grade: `ISO 2768-${linearGrade}${geometricGrade}`,
    linearTolerance: linearTol,
    angularTolerance: angularTol,
    straightnessFlatnessTolerance: geoTol,
    circularityTolerance: geoTol * 0.6,
    description: `Linear: ${gradeLabels[linearGrade]}, Geometric: ${geoGradeLabels[geometricGrade]}`,
  };
}

// ── ISO 286 / ANSI B4.1 Fit Calculations ─────────────────────────────────────

export type FitType = "clearance" | "interference" | "transition";
export type HoleSystem = "H";   // ISO basis = hole basis
export type ShaftFundamental = "a"|"b"|"c"|"d"|"e"|"f"|"g"|"h"|"js"|"k"|"m"|"n"|"p"|"r"|"s"|"t"|"u"|"v"|"x"|"y"|"z";

export interface FitResult {
  type: FitType;
  nominalSize: number;
  holeTolerance: { upper: number; lower: number; grade: string };
  shaftTolerance: { upper: number; lower: number; grade: string };
  maxClearance: number;      // positive = clearance, negative = interference
  minClearance: number;
  maxInterference: number;   // positive = interference
  minInterference: number;
  description: string;
  application: string;
}

// Fundamental deviations (EI for holes, ei for shafts) from ISO 286-1
// Values in µm for diameter range 18-30 mm (representative)
// Full table requires interpolation; this is a simplified version
function getShaftDeviation(shaft: ShaftFundamental, diameter: number): { ei: number; es?: number } {
  // Simplified: approximate fundamental deviations in µm
  const deviations: Record<ShaftFundamental, number> = {
    a: -270, b: -140, c: -60, d: -20, e: -14, f: -6, g: -2, h: 0,
    js: 0, k: 1, m: 4, n: 5, p: 9, r: 13, s: 19, t: 23,
    u: 28, v: 33, x: 38, y: 45, z: 60,
  };
  const scale = diameter <= 3 ? 0.6 : diameter <= 18 ? 0.8 : diameter <= 80 ? 1.0 : diameter <= 250 ? 1.3 : 1.6;
  return { ei: Math.round(deviations[shaft] * scale) };
}

// IT grade tolerances in µm (simplified, valid ~18-50mm range)
const IT_GRADES: Record<number, number> = {
  1: 0.8, 2: 1.2, 3: 2, 4: 3, 5: 5, 6: 8, 7: 12, 8: 19,
  9: 30, 10: 48, 11: 75, 12: 120, 13: 190, 14: 300, 15: 470, 16: 750,
};

function getITGrade(gradeStr: string, diameter: number): number {
  const num = parseInt(gradeStr.replace(/\D/g, ""), 10);
  const base = IT_GRADES[num] ?? 50;
  const scale = diameter <= 3 ? 0.5 : diameter <= 18 ? 0.75 : diameter <= 80 ? 1.0 : diameter <= 250 ? 1.4 : 1.8;
  return Math.round(base * scale);
}

export function calculateISO286Fit(
  nominalDiameter: number,    // mm
  holeFundamental: "H",
  holeGrade: number,          // IT grade 1-16
  shaftFundamental: ShaftFundamental,
  shaftGrade: number
): FitResult {
  const itHole = getITGrade(`IT${holeGrade}`, nominalDiameter);   // µm
  const itShaft = getITGrade(`IT${shaftGrade}`, nominalDiameter); // µm
  const shaftDev = getShaftDeviation(shaftFundamental, nominalDiameter);

  // Hole: EI = 0 (basis hole H), ES = EI + IT
  const holeEI = 0;
  const holeES = itHole;

  // Shaft
  const shaftei = shaftDev.ei;
  const shaftes = shaftei + itShaft;

  // Clearances in µm (positive = clearance, negative = interference)
  const maxClearanceMicron = holeES - shaftei;
  const minClearanceMicron = holeEI - shaftes;

  let fitType: FitType;
  if (minClearanceMicron >= 0) fitType = "clearance";
  else if (maxClearanceMicron <= 0) fitType = "interference";
  else fitType = "transition";

  const fitDescriptions: Record<FitType, string> = {
    clearance: "Running/sliding fit — always clearance between parts",
    interference: "Press/shrink fit — always interference; requires force assembly",
    transition: "Transition fit — either clearance or interference depending on actual sizes",
  };

  const fitApplications: Record<FitType, string> = {
    clearance: "Bearings, bushings, sliding shafts",
    interference: "Hubs, gear presses, permanent assemblies",
    transition: "Keys, locating fits, precision assemblies",
  };

  return {
    type: fitType,
    nominalSize: nominalDiameter,
    holeTolerance: {
      upper: holeES / 1000,    // convert to mm
      lower: holeEI / 1000,
      grade: `${holeFundamental}${holeGrade}`,
    },
    shaftTolerance: {
      upper: shaftes / 1000,
      lower: shaftei / 1000,
      grade: `${shaftFundamental}${shaftGrade}`,
    },
    maxClearance: maxClearanceMicron / 1000,
    minClearance: minClearanceMicron / 1000,
    maxInterference: -minClearanceMicron / 1000,
    minInterference: -maxClearanceMicron / 1000,
    description: fitDescriptions[fitType],
    application: fitApplications[fitType],
  };
}

/** Common named fits (ISO 286 hole-basis system) */
export const COMMON_FITS: { name: string; hole: string; shaft: ShaftFundamental; shaftGrade: number; holeGrade: number; description: string }[] = [
  { name: "H7/g6", hole: "H", shaft: "g", shaftGrade: 6, holeGrade: 7, description: "Close sliding fit" },
  { name: "H7/h6", hole: "H", shaft: "h", shaftGrade: 6, holeGrade: 7, description: "Sliding fit" },
  { name: "H7/k6", hole: "H", shaft: "k", shaftGrade: 6, holeGrade: 7, description: "Transition, locating fit" },
  { name: "H7/n6", hole: "H", shaft: "n", shaftGrade: 6, holeGrade: 7, description: "Transition, light press" },
  { name: "H7/p6", hole: "H", shaft: "p", shaftGrade: 6, holeGrade: 7, description: "Interference, press fit" },
  { name: "H7/s6", hole: "H", shaft: "s", shaftGrade: 6, holeGrade: 7, description: "Interference, heavy press" },
  { name: "H8/f7", hole: "H", shaft: "f", shaftGrade: 7, holeGrade: 8, description: "Free running fit" },
  { name: "H8/h7", hole: "H", shaft: "h", shaftGrade: 7, holeGrade: 8, description: "Easy sliding fit" },
  { name: "H11/c11", hole: "H", shaft: "c", shaftGrade: 11, holeGrade: 11, description: "Loose running fit" },
];

// ── Datum Feature ─────────────────────────────────────────────────────────────

export interface DatumFeature {
  id: string;
  letter: string;        // A, B, C ...
  position: [number, number, number];
  normal: [number, number, number];
  featureType: "plane" | "axis" | "point" | "edge";
  label?: string;
}

export function createDatumFeature(
  letter: string,
  position: [number, number, number],
  normal: [number, number, number] = [0, 1, 0],
  featureType: DatumFeature["featureType"] = "plane"
): DatumFeature {
  return {
    id: `datum_${letter}_${Date.now()}`,
    letter,
    position,
    normal,
    featureType,
  };
}

// ── Annotation Store Types ────────────────────────────────────────────────────

export interface GDTAnnotationSet {
  frames: FeatureControlFrame[];
  datums: DatumFeature[];
  visible: boolean;
  standard: "ISO_1101" | "ASME_Y14.5";
}

export function createAnnotationSet(standard: GDTAnnotationSet["standard"] = "ISO_1101"): GDTAnnotationSet {
  return { frames: [], datums: [], visible: true, standard };
}

export function addFrameToSet(set: GDTAnnotationSet, frame: FeatureControlFrame): GDTAnnotationSet {
  return { ...set, frames: [...set.frames, frame] };
}

export function removeFrameFromSet(set: GDTAnnotationSet, id: string): GDTAnnotationSet {
  return { ...set, frames: set.frames.filter(f => f.id !== id) };
}

export function addDatumToSet(set: GDTAnnotationSet, datum: DatumFeature): GDTAnnotationSet {
  return { ...set, datums: [...set.datums, datum] };
}

// ── 2D Drawing Auto-callout ────────────────────────────────────────────────────

export interface DrawingCallout {
  fcfId: string;
  characteristic: GDTCharacteristic;
  svgX: number;
  svgY: number;
  leaderX: number;
  leaderY: number;
  frameWidth: number;
  frameHeight: number;
}

/** Generate 2D drawing callout positions for a set of FCFs */
export function generateDrawingCallouts(
  frames: FeatureControlFrame[],
  viewOffsetX: number,
  viewOffsetY: number
): DrawingCallout[] {
  return frames.map((frame, i) => {
    const px = frame.position ? frame.position[0] + viewOffsetX : viewOffsetX + 20 + i * 40;
    const py = frame.position ? -frame.position[1] + viewOffsetY : viewOffsetY - 20;
    const datumCount = frame.datumRefs.length;
    const frameWidth = 24 + 18 + datumCount * 10;

    return {
      fcfId: frame.id,
      characteristic: frame.characteristic,
      svgX: px,
      svgY: py - 14,
      leaderX: px,
      leaderY: py,
      frameWidth,
      frameHeight: 8,
    };
  });
}

/** Render an FCF as an SVG string (for 2D drawing export) */
export function renderFCFtoSVG(frame: FeatureControlFrame, x: number, y: number): string {
  const sym = GDT_SYMBOL_TABLE[frame.characteristic];
  const cellH = 8;
  const symW = 10;
  const tolW = 18;
  const datumW = 10;
  const totalW = symW + tolW + frame.datumRefs.length * datumW;

  const zonePrefix = frame.toleranceZone === "diameter" ? "⌀" : frame.toleranceZone === "spherical" ? "S⌀" : "";
  const modSuffix = frame.modifier === "MMC" ? "Ⓜ" : frame.modifier === "LMC" ? "Ⓛ" : "";

  let svgStr = `<g transform="translate(${x},${y})" class="gdt-fcf">`;
  // Outer frame
  svgStr += `<rect x="0" y="0" width="${totalW}" height="${cellH}" fill="none" stroke="#ffaa00" stroke-width="0.4"/>`;
  // Symbol cell
  svgStr += `<rect x="0" y="0" width="${symW}" height="${cellH}" fill="none" stroke="#ffaa00" stroke-width="0.2"/>`;
  svgStr += `<text x="${symW / 2}" y="${cellH * 0.72}" font-size="5" fill="#ffaa00" text-anchor="middle">${sym.unicode}</text>`;
  // Divider + tolerance
  svgStr += `<line x1="${symW}" y1="0" x2="${symW}" y2="${cellH}" stroke="#ffaa00" stroke-width="0.2"/>`;
  svgStr += `<text x="${symW + 2}" y="${cellH * 0.72}" font-size="2.8" fill="#ffaa00">${zonePrefix}${frame.toleranceValue.toFixed(3)}${modSuffix}</text>`;
  // Datum references
  frame.datumRefs.forEach((d, i) => {
    const dx = symW + tolW + i * datumW;
    svgStr += `<line x1="${dx}" y1="0" x2="${dx}" y2="${cellH}" stroke="#ffaa00" stroke-width="0.2"/>`;
    svgStr += `<text x="${dx + datumW / 2}" y="${cellH * 0.72}" font-size="2.8" fill="#ffaa00" text-anchor="middle">${d.letter}${d.modifier === "MMC" ? "Ⓜ" : ""}</text>`;
  });
  svgStr += `</g>`;
  return svgStr;
}

/** Render a datum triangle symbol as SVG */
export function renderDatumTriangleSVG(datum: DatumFeature, x: number, y: number): string {
  return `
<g transform="translate(${x},${y})" class="gdt-datum">
  <polygon points="0,0 -3,-5.2 3,-5.2" fill="#ffaa00"/>
  <line x1="0" y1="-5.2" x2="0" y2="-10" stroke="#ffaa00" stroke-width="0.4"/>
  <rect x="-3.5" y="-15" width="7" height="5" fill="none" stroke="#ffaa00" stroke-width="0.4"/>
  <text x="0" y="-11.5" font-size="3" fill="#ffaa00" text-anchor="middle" font-weight="bold">${datum.letter}</text>
</g>`;
}
