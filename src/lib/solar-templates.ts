// ─── Solar PV Design Templates ─────────────────────────────────────────────
// Parametric templates for ground-mounted, rooftop, tracker, and carport PV systems
// Includes auto-calculation of GCR, inter-row spacing, DC capacity, and BOS sizing

export type SolarTemplateCategory =
  | "pv_module"
  | "ground_mounted"
  | "single_axis_tracker"
  | "rooftop_ballasted"
  | "carport_canopy";

export interface TemplateParameter {
  key: string;
  label: string;
  type: "number" | "select" | "boolean";
  min?: number;
  max?: number;
  step?: number;
  default: number | string | boolean;
  unit?: string;
  options?: { label: string; value: string | number }[];
  derived?: boolean; // auto-calculated, not user-editable
}

export interface SolarTemplate {
  id: string;
  name: string;
  category: SolarTemplateCategory;
  description: string;
  tags: string[];
  thumbnail: string; // placeholder icon name
  params: TemplateParameter[];
  calculateDerived: (inputs: Record<string, number | string | boolean>) => DerivedResults;
}

export interface DerivedResults {
  gcr: number;              // Ground Coverage Ratio (0–1)
  totalAreaM2: number;      // Total land area in m²
  dcCapacityKWp: number;    // Total DC capacity in kWp
  interRowSpacingM: number; // Clear spacing between rows in m
  rowPitchM: number;        // Row-to-row pitch in m
  totalModules: number;     // Total module count
  frontLegHeightM?: number; // For fixed tilt: front post height
  rearLegHeightM?: number;  // For fixed tilt: rear post height
  inverterSizeKW?: number;  // Recommended inverter size
  dcCableLengthM?: number;  // Estimated DC cable length
  stringCount?: number;     // Number of strings
  combinerBoxCount?: number;
  notes: string[];
}

// ─── Module Manufacturer Presets ─────────────────────────────────────────────

export const MODULE_PRESETS = [
  { label: "Generic 550W (2279×1134×35mm)", value: "generic_550", watt: 550, lengthMm: 2279, widthMm: 1134, thicknessMm: 35 },
  { label: "Jinko Tiger Neo 580W (2465×1134×30mm)", value: "jinko_580", watt: 580, lengthMm: 2465, widthMm: 1134, thicknessMm: 30 },
  { label: "LONGi Hi-MO 6 545W (2256×1133×30mm)", value: "longi_545", watt: 545, lengthMm: 2256, widthMm: 1133, thicknessMm: 30 },
  { label: "Canadian Solar 600W (2384×1303×35mm)", value: "cs_600", watt: 600, lengthMm: 2384, widthMm: 1303, thicknessMm: 35 },
  { label: "Trina Vertex S+ 420W (1762×1134×30mm)", value: "trina_420", watt: 420, lengthMm: 1762, widthMm: 1134, thicknessMm: 30 },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

/** Optimal tilt angle ≈ latitude (simplified), bounded 10–35° for India */
export function optimalTiltDeg(latitudeDeg: number): number {
  return Math.max(10, Math.min(35, Math.round(latitudeDeg)));
}

/** Inter-row pitch for zero-shade at winter solstice (latitude-based shadow length) */
export function rowPitchForNoShading(
  moduleLengthM: number,
  tiltDeg: number,
  latitudeDeg: number
): number {
  const tiltRad = (tiltDeg * Math.PI) / 180;
  // Sun elevation at winter solstice noon = 90 - lat - 23.45
  const sunElev = Math.max(10, 90 - latitudeDeg - 23.45);
  const sunElevRad = (sunElev * Math.PI) / 180;
  const shadow = moduleLengthM * Math.cos(tiltRad); // horizontal projection
  const shadowLen = (moduleLengthM * Math.sin(tiltRad)) / Math.tan(sunElevRad);
  return parseFloat((shadow + shadowLen).toFixed(3));
}

/** Ground Coverage Ratio = module width projected / row pitch */
export function calcGCR(moduleLengthM: number, tiltDeg: number, rowPitchM: number): number {
  const proj = moduleLengthM * Math.cos((tiltDeg * Math.PI) / 180);
  return parseFloat((proj / rowPitchM).toFixed(3));
}

// ─── Template Definitions ─────────────────────────────────────────────────────

export const SOLAR_TEMPLATES: SolarTemplate[] = [

  // ── 1. PV Module (single panel with cell layout) ──────────────────────────
  {
    id: "pv_module_bifacial",
    name: "Glass-Glass Bifacial Module",
    category: "pv_module",
    description: "Bifacial glass-glass mono-PERC module with configurable cell layout and frame dimensions.",
    tags: ["bifacial", "glass-glass", "mono-PERC", "module"],
    thumbnail: "solar",
    params: [
      { key: "moduleLengthMm", label: "Module Length", type: "number", min: 1600, max: 2500, step: 1, default: 2279, unit: "mm" },
      { key: "moduleWidthMm", label: "Module Width", type: "number", min: 900, max: 1400, step: 1, default: 1134, unit: "mm" },
      { key: "thicknessMm", label: "Module Thickness", type: "number", min: 25, max: 45, step: 1, default: 35, unit: "mm" },
      { key: "wattPeak", label: "Power (Wp)", type: "number", min: 300, max: 750, step: 5, default: 550, unit: "Wp" },
      { key: "cellRows", label: "Cell Rows", type: "number", min: 4, max: 10, step: 1, default: 6, unit: "" },
      { key: "cellCols", label: "Cell Columns", type: "number", min: 8, max: 24, step: 1, default: 12, unit: "" },
      { key: "halfCut", label: "Half-Cut Cells", type: "boolean", default: true },
    ],
    calculateDerived: (inputs) => {
      const watt = Number(inputs.wattPeak || 550);
      return {
        gcr: 0, totalAreaM2: (Number(inputs.moduleLengthMm) / 1000) * (Number(inputs.moduleWidthMm) / 1000),
        dcCapacityKWp: watt / 1000, interRowSpacingM: 0, rowPitchM: 0, totalModules: 1,
        notes: [
          `Power density: ${(watt / ((Number(inputs.moduleLengthMm) / 1000) * (Number(inputs.moduleWidthMm) / 1000))).toFixed(0)} W/m²`,
          inputs.halfCut ? "Half-cut cells reduce resistive losses by ~2%" : "Full-cell layout",
          "Glass-glass construction improves bifacial gain 10–15%",
        ],
      };
    },
  },

  // ── 2. Ground-Mounted Fixed Tilt Array ────────────────────────────────────
  {
    id: "ground_fixed_tilt",
    name: "Ground-Mounted Fixed Tilt Array",
    category: "ground_mounted",
    description: "Portrait/landscape fixed-tilt ground mount with inter-row shadow analysis and BOS sizing.",
    tags: ["ground-mount", "fixed-tilt", "portrait", "landscape"],
    thumbnail: "zap",
    params: [
      { key: "modulePreset", label: "Module Type", type: "select", default: "generic_550",
        options: MODULE_PRESETS.map(m => ({ label: m.label, value: m.value })) },
      { key: "totalCapacityKWp", label: "Total DC Capacity", type: "number", min: 10, max: 100000, step: 10, default: 1000, unit: "kWp" },
      { key: "tiltDeg", label: "Tilt Angle", type: "number", min: 0, max: 40, step: 1, default: 23, unit: "°" },
      { key: "azimuthDeg", label: "Azimuth (S=180°)", type: "number", min: 90, max: 270, step: 5, default: 180, unit: "°" },
      { key: "latitudeDeg", label: "Site Latitude", type: "number", min: 8, max: 37, step: 0.1, default: 22.5, unit: "°N" },
      { key: "orientation", label: "Module Orientation", type: "select", default: "portrait",
        options: [{ label: "Portrait (2-up)", value: "portrait" }, { label: "Landscape (1-high)", value: "landscape" }] },
      { key: "modulesPerString", label: "Modules per String", type: "number", min: 10, max: 30, step: 1, default: 20, unit: "" },
      { key: "gcTarget", label: "Target GCR", type: "number", min: 0.2, max: 0.6, step: 0.01, default: 0.4, unit: "" },
    ],
    calculateDerived: (inputs) => {
      const preset = MODULE_PRESETS.find(m => m.value === inputs.modulePreset) || MODULE_PRESETS[0];
      const capKWp = Number(inputs.totalCapacityKWp);
      const tilt = Number(inputs.tiltDeg);
      const lat = Number(inputs.latitudeDeg);
      const gcTarget = Number(inputs.gcTarget || 0.4);
      const mPerString = Number(inputs.modulesPerString || 20);

      const moduleLenM = preset.lengthMm / 1000;
      const moduleWidM = preset.widthMm / 1000;
      const totalMods = Math.ceil((capKWp * 1000) / preset.watt);
      const rowPitch = rowPitchForNoShading(moduleLenM, tilt, lat);
      const gcr = calcGCR(moduleLenM, tilt, rowPitch);
      const totalAreaM2 = (totalMods * moduleLenM * moduleWidM) / gcTarget;

      const tiltRad = (tilt * Math.PI) / 180;
      const frontLeg = 0.3; // min clearance m
      const rearLeg = parseFloat((frontLeg + moduleLenM * Math.sin(tiltRad)).toFixed(3));

      const strings = Math.ceil(totalMods / mPerString);
      const inverterKW = Math.ceil(capKWp * 0.95 / 100) * 100;
      const dcCable = parseFloat((totalMods * 12).toFixed(0)); // ~12m avg per module
      const combiners = Math.ceil(strings / 16);

      const notes = [
        `Row pitch: ${rowPitch.toFixed(2)} m (no-shade at winter solstice, lat ${lat}°)`,
        `GCR: ${gcr.toFixed(2)} (target: ${gcTarget})`,
        `Optimal tilt for lat ${lat}°N: ${optimalTiltDeg(lat)}°`,
        `Front post: ${frontLeg} m | Rear post: ${rearLeg.toFixed(2)} m`,
        `${strings} strings × ${mPerString} modules`,
      ];
      return {
        gcr, totalAreaM2: parseFloat(totalAreaM2.toFixed(1)), dcCapacityKWp: capKWp,
        interRowSpacingM: parseFloat((rowPitch - moduleLenM * Math.cos(tiltRad)).toFixed(3)),
        rowPitchM: rowPitch, totalModules: totalMods,
        frontLegHeightM: frontLeg, rearLegHeightM: rearLeg,
        inverterSizeKW: inverterKW, dcCableLengthM: dcCable,
        stringCount: strings, combinerBoxCount: combiners, notes,
      };
    },
  },

  // ── 3. Single-Axis Tracker (SAT) ──────────────────────────────────────────
  {
    id: "single_axis_tracker",
    name: "Single-Axis Tracker (SAT) Array",
    category: "single_axis_tracker",
    description: "Horizontal single-axis tracker with backtracking algorithm. ~25% higher yield vs fixed.",
    tags: ["tracker", "SAT", "horizontal", "backtracking"],
    thumbnail: "refresh-cw",
    params: [
      { key: "modulePreset", label: "Module Type", type: "select", default: "generic_550",
        options: MODULE_PRESETS.map(m => ({ label: m.label, value: m.value })) },
      { key: "totalCapacityKWp", label: "Total DC Capacity", type: "number", min: 100, max: 500000, step: 100, default: 5000, unit: "kWp" },
      { key: "latitudeDeg", label: "Site Latitude", type: "number", min: 8, max: 37, step: 0.1, default: 22.5, unit: "°N" },
      { key: "modulesPerTracker", label: "Modules per Tracker Torque Tube", type: "number", min: 20, max: 120, step: 4, default: 60, unit: "" },
      { key: "gcTarget", label: "Target GCR", type: "number", min: 0.25, max: 0.45, step: 0.01, default: 0.35, unit: "" },
      { key: "trackerRowSpacingM", label: "Tracker Row Spacing", type: "number", min: 4, max: 12, step: 0.5, default: 7.5, unit: "m" },
      { key: "hubHeightM", label: "Tracker Hub Height", type: "number", min: 1.0, max: 3.0, step: 0.1, default: 1.5, unit: "m" },
    ],
    calculateDerived: (inputs) => {
      const preset = MODULE_PRESETS.find(m => m.value === inputs.modulePreset) || MODULE_PRESETS[0];
      const capKWp = Number(inputs.totalCapacityKWp);
      const gcTarget = Number(inputs.gcTarget || 0.35);
      const rowSpacing = Number(inputs.trackerRowSpacingM || 7.5);
      const totalMods = Math.ceil((capKWp * 1000) / preset.watt);
      const moduleLenM = preset.lengthMm / 1000;

      // SAT GCR based on module width / row spacing (N-S axis)
      const gcr = parseFloat((preset.widthMm / 1000 / rowSpacing).toFixed(3));
      const totalAreaM2 = parseFloat(((totalMods * moduleLenM * preset.widthMm / 1000) / gcTarget).toFixed(1));
      const trackerCount = Math.ceil(totalMods / Number(inputs.modulesPerTracker || 60));
      const strings = Math.ceil(totalMods / 20);
      const inverterKW = Math.ceil(capKWp * 0.95 / 500) * 500;
      const combiners = Math.ceil(strings / 16);

      return {
        gcr, totalAreaM2, dcCapacityKWp: capKWp,
        interRowSpacingM: parseFloat((rowSpacing - preset.widthMm / 1000).toFixed(3)),
        rowPitchM: rowSpacing, totalModules: totalMods,
        inverterSizeKW: inverterKW, stringCount: strings,
        combinerBoxCount: combiners,
        notes: [
          `${trackerCount} tracker torque tubes`,
          `SAT GCR: ${gcr.toFixed(2)} (row spacing: ${rowSpacing} m)`,
          "Backtracking prevents inter-row shading at low sun angles",
          "Expected energy gain: ~20–25% over fixed tilt",
          `Hub height: ${inputs.hubHeightM} m (flood level clearance)`,
        ],
      };
    },
  },

  // ── 4. Rooftop Ballasted System ───────────────────────────────────────────
  {
    id: "rooftop_ballasted",
    name: "Rooftop Ballasted Racking System",
    category: "rooftop_ballasted",
    description: "Flat-roof ballasted system with wind-optimized low-tilt (10–15°) and concrete ballast blocks.",
    tags: ["rooftop", "ballasted", "flat-roof", "low-tilt"],
    thumbnail: "home",
    params: [
      { key: "modulePreset", label: "Module Type", type: "select", default: "generic_550",
        options: MODULE_PRESETS.map(m => ({ label: m.label, value: m.value })) },
      { key: "roofAreaM2", label: "Available Roof Area", type: "number", min: 50, max: 50000, step: 50, default: 500, unit: "m²" },
      { key: "tiltDeg", label: "Tilt Angle", type: "number", min: 5, max: 20, step: 1, default: 10, unit: "°" },
      { key: "gcTarget", label: "Target GCR", type: "number", min: 0.3, max: 0.6, step: 0.01, default: 0.45, unit: "" },
      { key: "windSpeedMs", label: "Design Wind Speed", type: "number", min: 20, max: 55, step: 1, default: 39, unit: "m/s" },
      { key: "modulesPerRow", label: "Modules per Row", type: "number", min: 1, max: 20, step: 1, default: 4, unit: "" },
    ],
    calculateDerived: (inputs) => {
      const preset = MODULE_PRESETS.find(m => m.value === inputs.modulePreset) || MODULE_PRESETS[0];
      const roofArea = Number(inputs.roofAreaM2);
      const gcTarget = Number(inputs.gcTarget || 0.45);
      const tilt = Number(inputs.tiltDeg);
      const moduleLenM = preset.lengthMm / 1000;
      const moduleWidM = preset.widthMm / 1000;

      const totalMods = Math.floor((roofArea * gcTarget) / (moduleLenM * moduleWidM));
      const capKWp = parseFloat(((totalMods * preset.watt) / 1000).toFixed(1));
      const rowPitch = parseFloat((moduleLenM * Math.cos((tilt * Math.PI) / 180) + 0.6).toFixed(3));
      const gcr = calcGCR(moduleLenM, tilt, rowPitch);

      // Ballast weight estimate: ~15–20 kg/module for wind zone
      const windFactor = Math.max(1, (Number(inputs.windSpeedMs) - 30) / 5);
      const ballastPerModule = parseFloat((15 * windFactor).toFixed(1));
      const totalBallastKg = parseFloat((ballastPerModule * totalMods).toFixed(0));

      return {
        gcr, totalAreaM2: roofArea, dcCapacityKWp: capKWp,
        interRowSpacingM: parseFloat((rowPitch - moduleLenM * Math.cos((tilt * Math.PI) / 180)).toFixed(3)),
        rowPitchM: rowPitch, totalModules: totalMods,
        inverterSizeKW: Math.ceil(capKWp * 0.95 / 10) * 10,
        notes: [
          `${totalMods} modules → ${capKWp} kWp on ${roofArea} m² roof`,
          `Ballast: ~${ballastPerModule} kg/module = ${totalBallastKg} kg total`,
          `Low tilt (${tilt}°) reduces wind uplift and ballast requirement`,
          "Check roof structural load capacity (≥150 kg/m² typical requirement)",
          `Row pitch: ${rowPitch.toFixed(2)} m with 0.6 m maintenance walkway`,
        ],
      };
    },
  },

  // ── 5. Carport / Canopy Structure ─────────────────────────────────────────
  {
    id: "carport_canopy",
    name: "Solar Carport / Canopy Structure",
    category: "carport_canopy",
    description: "Elevated canopy structure over parking or walkways. Dual-post or cantilever design.",
    tags: ["carport", "canopy", "parking", "elevated"],
    thumbnail: "layout",
    params: [
      { key: "modulePreset", label: "Module Type", type: "select", default: "generic_550",
        options: MODULE_PRESETS.map(m => ({ label: m.label, value: m.value })) },
      { key: "parkingSpaces", label: "Number of Parking Spaces", type: "number", min: 4, max: 500, step: 4, default: 40, unit: "" },
      { key: "spaceLengthM", label: "Parking Space Length", type: "number", min: 4.5, max: 6, step: 0.1, default: 5.0, unit: "m" },
      { key: "spaceWidthM", label: "Parking Space Width", type: "number", min: 2.3, max: 3.0, step: 0.1, default: 2.5, unit: "m" },
      { key: "tiltDeg", label: "Canopy Tilt", type: "number", min: 3, max: 15, step: 1, default: 5, unit: "°" },
      { key: "clearanceHeightM", label: "Min Clearance Height", type: "number", min: 2.1, max: 4.5, step: 0.1, default: 2.7, unit: "m" },
      { key: "designType", label: "Structure Type", type: "select", default: "dual_post",
        options: [{ label: "Dual Post (T-structure)", value: "dual_post" }, { label: "Cantilever (Single Post)", value: "cantilever" }] },
    ],
    calculateDerived: (inputs) => {
      const preset = MODULE_PRESETS.find(m => m.value === inputs.modulePreset) || MODULE_PRESETS[0];
      const spaces = Number(inputs.parkingSpaces);
      const spLen = Number(inputs.spaceLengthM);
      const spWid = Number(inputs.spaceWidthM);
      const tilt = Number(inputs.tiltDeg);
      const moduleLenM = preset.lengthMm / 1000;
      const moduleWidM = preset.widthMm / 1000;

      const totalAreaM2 = parseFloat((spaces * spLen * spWid).toFixed(1));
      // Modules fit in canopy bay: 2 per bay longitudinally, 1 or 2 across width
      const modsLong = Math.floor(spLen / moduleWidM);
      const modsWide = Math.floor(spWid / moduleLenM) || 1;
      // For double-row carport bays
      const bays = Math.ceil(spaces / 2);
      const totalMods = bays * modsLong * modsWide * 2;
      const capKWp = parseFloat(((totalMods * preset.watt) / 1000).toFixed(1));

      const tiltRad = (tilt * Math.PI) / 180;
      const rearHeight = parseFloat((Number(inputs.clearanceHeightM) + moduleLenM * Math.sin(tiltRad)).toFixed(2));

      return {
        gcr: parseFloat(((totalMods * moduleLenM * moduleWidM) / totalAreaM2).toFixed(2)),
        totalAreaM2, dcCapacityKWp: capKWp,
        interRowSpacingM: 0, rowPitchM: spLen, totalModules: totalMods,
        frontLegHeightM: Number(inputs.clearanceHeightM),
        rearLegHeightM: rearHeight,
        inverterSizeKW: Math.ceil(capKWp * 0.95 / 5) * 5,
        notes: [
          `${spaces} spaces → ${bays} bays → ${totalMods} modules → ${capKWp} kWp`,
          `Front post: ${inputs.clearanceHeightM} m | Rear: ${rearHeight} m`,
          inputs.designType === "cantilever"
            ? "Cantilever: wider vehicle access, higher steel tonnage"
            : "Dual-post T-structure: balanced loads, standard connections",
          "EV charging integration: allow 22kW EVSE per 4 spaces",
          "IS 875 Part 3 wind load analysis required for structural design",
        ],
      };
    },
  },
];

// ─── Template Utilities ───────────────────────────────────────────────────────

export function getTemplatesByCategory(cat: SolarTemplateCategory): SolarTemplate[] {
  return SOLAR_TEMPLATES.filter(t => t.category === cat);
}

export function getTemplateById(id: string): SolarTemplate | undefined {
  return SOLAR_TEMPLATES.find(t => t.id === id);
}

/** Match a natural-language prompt to the best template */
export function matchTemplateFromPrompt(prompt: string): SolarTemplate | null {
  const t = prompt.toLowerCase();
  if (t.includes("tracker") || t.includes("sat ") || t.includes("single axis")) return getTemplateById("single_axis_tracker") || null;
  if (t.includes("carport") || t.includes("canopy") || t.includes("parking")) return getTemplateById("carport_canopy") || null;
  if (t.includes("rooftop") || t.includes("roof") || t.includes("ballast")) return getTemplateById("rooftop_ballasted") || null;
  if (t.includes("module") && !t.includes("array") && !t.includes("plant")) return getTemplateById("pv_module_bifacial") || null;
  if (t.includes("ground") || t.includes("plant") || t.includes("farm") || t.includes("mw") || t.includes("kwp")) return getTemplateById("ground_fixed_tilt") || null;
  return null;
}

/** Extract capacity hint from natural language (e.g., "1MW" → 1000, "500kWp" → 500) */
export function extractCapacityKWp(prompt: string): number | null {
  const mwMatch = prompt.match(/(\d+(?:\.\d+)?)\s*mw/i);
  if (mwMatch) return parseFloat(mwMatch[1]) * 1000;
  const kwpMatch = prompt.match(/(\d+(?:\.\d+)?)\s*kwp/i);
  if (kwpMatch) return parseFloat(kwpMatch[1]);
  const kwMatch = prompt.match(/(\d+(?:\.\d+)?)\s*kw/i);
  if (kwMatch) return parseFloat(kwMatch[1]);
  return null;
}

/** Build default param values merged with any overrides */
export function buildDefaultInputs(
  template: SolarTemplate,
  overrides?: Partial<Record<string, number | string | boolean>>
): Record<string, number | string | boolean> {
  const defaults: Record<string, number | string | boolean> = {};
  for (const p of template.params) defaults[p.key] = p.default;
  return { ...defaults, ...overrides };
}
