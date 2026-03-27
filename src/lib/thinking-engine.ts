// ─── Thinking Engine for Multi-Model Reasoning ─────────────────────────────
// Classifies prompt complexity, extracts parameters, identifies missing info,
// and generates clarifying questions before CAD generation.

// ─── Types ──────────────────────────────────────────────────────────────────

export type ThinkingMode = "normal" | "extended" | "deep" | "auto";

export interface ThinkingModeConfig {
  label: string;
  description: string;
  credits: number;
  color: string;
  bgColor: string;
}

export const THINKING_MODES: Record<ThinkingMode, ThinkingModeConfig> = {
  normal: {
    label: "Normal",
    description: "Direct generation, no questions asked",
    credits: 2,
    color: "#58a6ff",
    bgColor: "rgba(88, 166, 255, 0.1)",
  },
  extended: {
    label: "Extended",
    description: "AI asks 2-3 clarifying questions before generating",
    credits: 5,
    color: "#d2a8ff",
    bgColor: "rgba(210, 168, 255, 0.1)",
  },
  deep: {
    label: "Deep",
    description: "Full reasoning chain with parameter summary approval",
    credits: 8,
    color: "#f0883e",
    bgColor: "rgba(240, 136, 62, 0.1)",
  },
  auto: {
    label: "Auto",
    description: "Classifies prompt complexity and recommends thinking level",
    credits: 0, // dynamic
    color: "#3fb950",
    bgColor: "rgba(63, 185, 80, 0.1)",
  },
};

export interface ExtractedParameter {
  name: string;
  value: number;
  unit: string;
  raw: string;
}

export interface MissingParameter {
  name: string;
  label: string;
  type: "number" | "select" | "text";
  options?: string[];
  defaultValue?: string | number;
  unit?: string;
  hint?: string;
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  parameter: MissingParameter;
}

export interface ComplexityResult {
  recommended: ThinkingMode;
  confidence: number;
  reason: string;
  estimatedCredits: number;
  domain: string | null;
  partType: string | null;
}

export interface StandardInfo {
  code: string;
  name: string;
  status: "compliant" | "warning" | "info";
  message: string;
}

// ─── Domain Detection ───────────────────────────────────────────────────────

interface DomainRule {
  domain: string;
  keywords: string[];
  partTypes: string[];
  standards: StandardInfo[];
  requiredParams: string[];
}

const DOMAIN_RULES: DomainRule[] = [
  {
    domain: "solar-pv",
    keywords: ["solar", "pv", "photovoltaic", "bifacial", "monocrystalline", "polycrystalline", "solar panel", "pv module"],
    partTypes: ["pv-module", "solar-panel", "pv-frame", "solar-mount"],
    standards: [
      { code: "IEC 61215", name: "Terrestrial PV Module Design Qualification", status: "compliant", message: "Module design meets qualification standards" },
      { code: "IEC 61730", name: "PV Module Safety Qualification", status: "compliant", message: "Safety requirements validated" },
      { code: "IS 875", name: "Code of Practice for Design Loads", status: "info", message: "Wind/dead load analysis recommended" },
      { code: "UL 1703", name: "Flat-Plate PV Modules and Panels", status: "info", message: "UL listing applicable for US market" },
    ],
    requiredParams: ["length", "width", "height", "frameProfile", "glassThickness", "cellCount", "cellType"],
  },
  {
    domain: "structural",
    keywords: ["bracket", "beam", "truss", "frame", "support", "mount", "channel", "angle"],
    partTypes: ["l-bracket", "u-bracket", "beam", "truss", "mounting-bracket"],
    standards: [
      { code: "ASCE 7", name: "Minimum Design Loads", status: "info", message: "Load calculation standards applicable" },
      { code: "ISO 2768", name: "General Tolerances", status: "compliant", message: "Medium tolerance class applied" },
      { code: "AISC 360", name: "Steel Construction Specification", status: "info", message: "Steel design specifications" },
    ],
    requiredParams: ["length", "width", "thickness", "material", "holeCount", "holeDiameter"],
  },
  {
    domain: "fasteners",
    keywords: ["bolt", "nut", "screw", "washer", "rivet", "fastener", "hex", "socket"],
    partTypes: ["hex-bolt", "socket-bolt", "nut", "washer", "rivet"],
    standards: [
      { code: "ISO 4014", name: "Hex Head Bolt Dimensions", status: "compliant", message: "Bolt dimensions per ISO standard" },
      { code: "ISO 4032", name: "Hex Nut Dimensions", status: "compliant", message: "Nut dimensions per ISO standard" },
      { code: "ISO 898-1", name: "Mechanical Properties of Fasteners", status: "info", message: "Grade 8.8 default" },
    ],
    requiredParams: ["threadSize", "length", "grade", "headType"],
  },
  {
    domain: "thermal",
    keywords: ["heat sink", "heatsink", "fin", "cooling", "thermal", "radiator", "heat exchanger"],
    partTypes: ["heat-sink", "fin-array", "heat-exchanger"],
    standards: [
      { code: "JEDEC JESD51", name: "Thermal Measurement Standards", status: "info", message: "Thermal resistance measurement applicable" },
    ],
    requiredParams: ["baseWidth", "baseHeight", "baseThickness", "finCount", "finHeight", "finThickness"],
  },
  {
    domain: "enclosure",
    keywords: ["enclosure", "housing", "case", "box", "cabinet", "chassis"],
    partTypes: ["enclosure", "housing", "electronics-box"],
    standards: [
      { code: "IP 67", name: "Ingress Protection Rating", status: "info", message: "Sealing design recommended" },
      { code: "IEC 60529", name: "Degrees of Protection", status: "info", message: "IP rating classification" },
    ],
    requiredParams: ["length", "width", "height", "wallThickness", "lidType", "ventilation"],
  },
  {
    domain: "piping",
    keywords: ["pipe", "tube", "flange", "elbow", "tee", "reducer", "coupling", "valve"],
    partTypes: ["pipe", "flange", "elbow", "tee", "reducer"],
    standards: [
      { code: "ASME B16.5", name: "Pipe Flanges and Flanged Fittings", status: "compliant", message: "Flange dimensions per ASME" },
      { code: "ASME B31.3", name: "Process Piping", status: "info", message: "Process piping code applicable" },
    ],
    requiredParams: ["nominalSize", "schedule", "material", "pressure"],
  },
  {
    domain: "gears",
    keywords: ["gear", "spur", "helical", "bevel", "worm", "pinion", "rack"],
    partTypes: ["spur-gear", "helical-gear", "bevel-gear", "worm-gear"],
    standards: [
      { code: "ISO 1328", name: "Gear Accuracy", status: "compliant", message: "Quality grade 7 default" },
      { code: "AGMA 2001", name: "Fundamental Rating Factors", status: "info", message: "Load capacity calculations" },
    ],
    requiredParams: ["teeth", "module", "pressureAngle", "faceWidth", "material"],
  },
];

// ─── Complexity Classification ──────────────────────────────────────────────

export function parsePromptComplexity(text: string): ComplexityResult {
  const lower = text.toLowerCase().trim();

  // Detect domain
  let detectedDomain: DomainRule | null = null;
  let maxKeywordHits = 0;
  for (const rule of DOMAIN_RULES) {
    const hits = rule.keywords.filter((kw) => lower.includes(kw)).length;
    if (hits > maxKeywordHits) {
      maxKeywordHits = hits;
      detectedDomain = rule;
    }
  }

  // Count complexity signals
  const wordCount = lower.split(/\s+/).length;
  const hasDimensions = /\d+(?:\.\d+)?\s*(?:mm|cm|m|in|inch|ft)\b/.test(lower);
  const hasMultipleParts = /(?:with|and|plus|\+|including|assembly|mounted|attached)/.test(lower);
  const hasConstraints = /(?:tolerance|clearance|fit|grade|class|rating|pressure|load)/.test(lower);
  const hasMaterial = /(?:steel|aluminum|aluminium|brass|copper|titanium|carbon|plastic|nylon|stainless)/.test(lower);
  const hasCount = /\d+\s*(?:holes?|fins?|teeth|bolts?|slots?|ribs?)/.test(lower);
  const isAssembly = /(?:assembly|module|system|unit|kit|set|array|mounted|with.*and)/.test(lower);

  let complexityScore = 0;
  if (wordCount > 15) complexityScore += 2;
  else if (wordCount > 8) complexityScore += 1;
  if (hasDimensions) complexityScore += 1;
  if (hasMultipleParts) complexityScore += 2;
  if (hasConstraints) complexityScore += 2;
  if (hasMaterial) complexityScore += 1;
  if (hasCount) complexityScore += 1;
  if (isAssembly) complexityScore += 3;
  if (detectedDomain) complexityScore += 1;

  let recommended: ThinkingMode;
  let confidence: number;
  let reason: string;

  if (complexityScore <= 2) {
    recommended = "normal";
    confidence = 0.85;
    reason = "Simple geometry with clear parameters";
  } else if (complexityScore <= 5) {
    recommended = "extended";
    confidence = 0.75;
    reason = "Moderate complexity - a few clarifying questions will improve accuracy";
  } else {
    recommended = "deep";
    confidence = 0.9;
    reason = "Complex assembly or multi-parameter design requires full reasoning chain";
  }

  const credits = THINKING_MODES[recommended].credits;

  return {
    recommended,
    confidence,
    reason,
    estimatedCredits: credits,
    domain: detectedDomain?.domain || null,
    partType: detectedDomain?.partTypes[0] || null,
  };
}

// ─── Parameter Extraction ───────────────────────────────────────────────────

export function extractParameters(text: string): ExtractedParameter[] {
  const params: ExtractedParameter[] = [];
  const lower = text.toLowerCase();

  // Pattern: NxNxN with optional unit (e.g., "2m x 1m x 35mm")
  const dimPattern = /(\d+(?:\.\d+)?)\s*(m|cm|mm|in|inch|ft)?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(m|cm|mm|in|inch|ft)?\s*(?:[x×]\s*(\d+(?:\.\d+)?)\s*(m|cm|mm|in|inch|ft)?)?/gi;
  let match = dimPattern.exec(lower);
  if (match) {
    const toMM = (v: number, u: string) => {
      if (u === "m") return v * 1000;
      if (u === "cm") return v * 10;
      if (u === "in" || u === "inch") return v * 25.4;
      if (u === "ft") return v * 304.8;
      return v; // mm or no unit
    };
    params.push({ name: "length", value: toMM(parseFloat(match[1]), match[2] || "mm"), unit: "mm", raw: match[0] });
    params.push({ name: "width", value: toMM(parseFloat(match[3]), match[4] || match[2] || "mm"), unit: "mm", raw: match[0] });
    if (match[5]) {
      params.push({ name: "height", value: toMM(parseFloat(match[5]), match[6] || match[2] || "mm"), unit: "mm", raw: match[0] });
    }
  }

  // Named dimensions: "length 200mm", "diameter 50mm", "thickness 3mm"
  const namedPatterns: { name: string; pattern: RegExp }[] = [
    { name: "length", pattern: /(?:length|long|len)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(m|cm|mm|in)?/i },
    { name: "width", pattern: /(?:width|wide|wid)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(m|cm|mm|in)?/i },
    { name: "height", pattern: /(?:height|tall|ht|h)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(m|cm|mm|in)?/i },
    { name: "diameter", pattern: /(?:diameter|dia|d|od)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(m|cm|mm|in)?/i },
    { name: "thickness", pattern: /(?:thickness|thick|thk|t)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(m|cm|mm|in)?/i },
    { name: "radius", pattern: /(?:radius|rad|r)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(m|cm|mm|in)?/i },
  ];

  for (const np of namedPatterns) {
    const m = np.pattern.exec(lower);
    if (m && !params.some((p) => p.name === np.name)) {
      const toMM = (v: number, u: string) => {
        if (u === "m") return v * 1000;
        if (u === "cm") return v * 10;
        if (u === "in") return v * 25.4;
        return v;
      };
      params.push({ name: np.name, value: toMM(parseFloat(m[1]), m[2] || "mm"), unit: "mm", raw: m[0] });
    }
  }

  // Count-based: "12 fins", "20 teeth", "4 holes"
  const countPatterns: { name: string; pattern: RegExp }[] = [
    { name: "finCount", pattern: /(\d+)\s*fins?/i },
    { name: "teeth", pattern: /(\d+)\s*teeth/i },
    { name: "holeCount", pattern: /(\d+)\s*(?:mounting\s*)?holes?/i },
    { name: "cellCount", pattern: /(\d+)\s*cells?/i },
    { name: "boltCount", pattern: /(\d+)\s*bolts?/i },
    { name: "slotCount", pattern: /(\d+)\s*(?:ventilation\s*)?slots?/i },
  ];

  for (const cp of countPatterns) {
    const m = cp.pattern.exec(lower);
    if (m) {
      params.push({ name: cp.name, value: parseInt(m[1]), unit: "count", raw: m[0] });
    }
  }

  // Thread size: "M8", "M12"
  const threadMatch = /\bm(\d+)\b/i.exec(lower);
  if (threadMatch) {
    params.push({ name: "threadSize", value: parseInt(threadMatch[1]), unit: "mm", raw: threadMatch[0] });
  }

  // Module (gears): "module 2"
  const moduleMatch = /module\s*[:=]?\s*(\d+(?:\.\d+)?)/i.exec(lower);
  if (moduleMatch) {
    params.push({ name: "module", value: parseFloat(moduleMatch[1]), unit: "mm", raw: moduleMatch[0] });
  }

  return params;
}

// ─── Missing Parameter Identification ───────────────────────────────────────

const PART_TYPE_PARAMS: Record<string, MissingParameter[]> = {
  "pv-module": [
    { name: "frameProfile", label: "Frame Profile Type", type: "select", options: ["Aluminum C-channel", "Aluminum U-channel", "Steel angle", "Frameless"], defaultValue: "Aluminum C-channel", hint: "Profile shape for the module frame" },
    { name: "glassThickness", label: "Glass Thickness", type: "number", unit: "mm", defaultValue: 3.2, hint: "Standard: 3.2mm (front), 2.0mm (rear for bifacial)" },
    { name: "cellType", label: "Cell Technology", type: "select", options: ["Monocrystalline PERC", "Polycrystalline", "HJT", "TOPCon", "Thin-film"], defaultValue: "Monocrystalline PERC" },
    { name: "cellCount", label: "Cell Count", type: "select", options: ["60 (6x10)", "72 (6x12)", "120 (half-cut)", "144 (half-cut)"], defaultValue: "72 (6x12)" },
    { name: "backsheetType", label: "Backsheet / Rear Glass", type: "select", options: ["Glass-to-glass (bifacial)", "White backsheet", "Black backsheet", "Transparent backsheet"], defaultValue: "Glass-to-glass (bifacial)" },
    { name: "junctionBox", label: "Junction Box Position", type: "select", options: ["Center rear", "Edge-mounted", "Split (2-box)"], defaultValue: "Center rear" },
  ],
  "l-bracket": [
    { name: "material", label: "Material", type: "select", options: ["Mild Steel", "Stainless Steel 304", "Stainless Steel 316", "Aluminum 6061", "Galvanized Steel"], defaultValue: "Mild Steel" },
    { name: "holeCount", label: "Mounting Holes", type: "number", defaultValue: 4, hint: "Number of mounting holes" },
    { name: "holeDiameter", label: "Hole Diameter", type: "number", unit: "mm", defaultValue: 8, hint: "Clearance hole diameter" },
    { name: "bendRadius", label: "Bend Radius", type: "number", unit: "mm", defaultValue: 3, hint: "Inside bend radius" },
  ],
  "hex-bolt": [
    { name: "grade", label: "Bolt Grade", type: "select", options: ["4.6", "8.8", "10.9", "12.9", "A2-70", "A4-80"], defaultValue: "8.8" },
    { name: "headType", label: "Head Type", type: "select", options: ["Hex", "Socket (Allen)", "Carriage", "Flange"], defaultValue: "Hex" },
    { name: "threadType", label: "Thread Type", type: "select", options: ["Full thread", "Partial thread"], defaultValue: "Full thread" },
  ],
  "heat-sink": [
    { name: "material", label: "Material", type: "select", options: ["Aluminum 6063-T5", "Aluminum 6061-T6", "Copper C110", "Aluminum-Copper hybrid"], defaultValue: "Aluminum 6063-T5" },
    { name: "finSpacing", label: "Fin Spacing", type: "number", unit: "mm", defaultValue: 3, hint: "Gap between fins (affects airflow)" },
    { name: "mountType", label: "Mounting", type: "select", options: ["Through-hole", "Clip-on", "Adhesive", "Spring-loaded"], defaultValue: "Through-hole" },
  ],
  "enclosure": [
    { name: "wallThickness", label: "Wall Thickness", type: "number", unit: "mm", defaultValue: 2.5, hint: "Shell wall thickness" },
    { name: "lidType", label: "Lid Type", type: "select", options: ["Snap-fit", "Screw-down", "Hinged", "Slide-on"], defaultValue: "Screw-down" },
    { name: "ipRating", label: "IP Rating", type: "select", options: ["IP20 (Indoor)", "IP54 (Dust/splash)", "IP65 (Dust-tight/jet)", "IP67 (Submersible)"], defaultValue: "IP54 (Dust/splash)" },
    { name: "ventilation", label: "Ventilation", type: "select", options: ["None", "Louver slots", "Perforated panel", "Fan cutout"], defaultValue: "Louver slots" },
  ],
  "spur-gear": [
    { name: "pressureAngle", label: "Pressure Angle", type: "select", options: ["14.5°", "20°", "25°"], defaultValue: "20°" },
    { name: "faceWidth", label: "Face Width", type: "number", unit: "mm", defaultValue: 10, hint: "Gear tooth width" },
    { name: "material", label: "Material", type: "select", options: ["Carbon Steel (C45)", "Alloy Steel (42CrMo4)", "Stainless Steel", "Brass", "Nylon/POM"], defaultValue: "Carbon Steel (C45)" },
    { name: "bore", label: "Bore Diameter", type: "number", unit: "mm", defaultValue: 10, hint: "Shaft bore diameter" },
  ],
  "pipe": [
    { name: "schedule", label: "Pipe Schedule", type: "select", options: ["Sch 5", "Sch 10", "Sch 40", "Sch 80", "Sch 160"], defaultValue: "Sch 40" },
    { name: "material", label: "Material", type: "select", options: ["Carbon Steel (A106B)", "Stainless 304", "Stainless 316", "PVC", "Copper"], defaultValue: "Carbon Steel (A106B)" },
    { name: "endType", label: "End Connection", type: "select", options: ["Plain end", "Beveled", "Threaded", "Grooved"], defaultValue: "Plain end" },
  ],
  "flange": [
    { name: "pressureClass", label: "Pressure Class", type: "select", options: ["PN10", "PN16", "PN25", "PN40", "Class 150", "Class 300"], defaultValue: "PN16" },
    { name: "flangeType", label: "Flange Type", type: "select", options: ["Weld Neck", "Slip-On", "Blind", "Socket Weld", "Threaded"], defaultValue: "Weld Neck" },
    { name: "facing", label: "Flange Facing", type: "select", options: ["Raised Face (RF)", "Flat Face (FF)", "Ring-Type Joint (RTJ)"], defaultValue: "Raised Face (RF)" },
  ],
  default: [
    { name: "material", label: "Material", type: "select", options: ["Steel", "Aluminum", "Stainless Steel", "Brass", "Copper", "Plastic"], defaultValue: "Steel" },
    { name: "tolerance", label: "Tolerance Class", type: "select", options: ["Fine (ISO 2768-f)", "Medium (ISO 2768-m)", "Coarse (ISO 2768-c)"], defaultValue: "Medium (ISO 2768-m)" },
  ],
};

export function identifyMissingParams(
  partType: string | null,
  extractedParams: ExtractedParameter[]
): MissingParameter[] {
  const key = partType && PART_TYPE_PARAMS[partType] ? partType : "default";
  const required = PART_TYPE_PARAMS[key];
  const extractedNames = new Set(extractedParams.map((p) => p.name));

  return required.filter((p) => !extractedNames.has(p.name));
}

// ─── Question Generation ────────────────────────────────────────────────────

export function generateQuestions(missingParams: MissingParameter[]): ClarifyingQuestion[] {
  return missingParams.map((param, i) => ({
    id: `q-${i}-${param.name}`,
    question: formatQuestion(param),
    parameter: param,
  }));
}

function formatQuestion(param: MissingParameter): string {
  const unitSuffix = param.unit ? ` (${param.unit})` : "";
  switch (param.name) {
    case "frameProfile":
      return "What frame profile type should be used?";
    case "glassThickness":
      return `What glass thickness${unitSuffix}? Standard is 3.2mm for front glass.`;
    case "cellType":
      return "Which cell technology?";
    case "cellCount":
      return "How many cells in the module layout?";
    case "backsheetType":
      return "What rear encapsulant type?";
    case "junctionBox":
      return "Where should the junction box be positioned?";
    case "material":
      return "What material should be used?";
    case "holeCount":
      return `How many mounting holes?`;
    case "holeDiameter":
      return `What hole diameter${unitSuffix}?`;
    case "wallThickness":
      return `What wall thickness${unitSuffix}?`;
    case "grade":
      return "What bolt grade/strength class?";
    case "headType":
      return "What bolt head type?";
    case "pressureAngle":
      return "What pressure angle for the gear teeth?";
    case "faceWidth":
      return `What gear face width${unitSuffix}?`;
    case "schedule":
      return "What pipe schedule?";
    case "pressureClass":
      return "What pressure class/rating?";
    default:
      return `What value for ${param.label}${unitSuffix}?`;
  }
}

// ─── Standards Detection ────────────────────────────────────────────────────

export function detectStandards(domain: string | null, params: ExtractedParameter[]): StandardInfo[] {
  if (!domain) return [];

  const rule = DOMAIN_RULES.find((r) => r.domain === domain);
  if (!rule) return [];

  const standards = [...rule.standards];

  // Add parameter-specific validations
  if (domain === "solar-pv") {
    const thickness = params.find((p) => p.name === "height" || p.name === "thickness");
    if (thickness && thickness.value < 30) {
      standards.push({
        code: "IEC 61215",
        name: "Frame Thickness Check",
        status: "warning",
        message: `Frame thickness ${thickness.value}mm may be below minimum for mechanical load tests`,
      });
    }
  }

  if (domain === "structural") {
    const thickness = params.find((p) => p.name === "thickness");
    if (thickness && thickness.value < 2) {
      standards.push({
        code: "ISO 2768",
        name: "Minimum Thickness",
        status: "warning",
        message: `Thickness ${thickness.value}mm is very thin - verify structural adequacy`,
      });
    }
  }

  return standards;
}

// ─── AI Recommendation Message ──────────────────────────────────────────────

export function getRecommendationMessage(complexity: ComplexityResult): string {
  const mode = THINKING_MODES[complexity.recommended];
  switch (complexity.recommended) {
    case "deep":
      return `I recommend Deep Thinking for this ${complexity.domain ? complexity.domain.replace("-", " ") : "complex"} assembly to save rework. Full parameter verification and standards check included.`;
    case "extended":
      return `Extended Thinking recommended - I'll ask a few clarifying questions to ensure accurate generation.`;
    case "normal":
      return `This looks straightforward. Normal mode will generate directly.`;
    default:
      return `Estimated: ~${mode.credits} credits (${mode.label})`;
  }
}

// ─── Token Usage Tracking ───────────────────────────────────────────────────

export interface TokenUsage {
  mode: ThinkingMode;
  inputTokens: number;
  outputTokens: number;
  totalCredits: number;
  timestamp: number;
}

export function estimateTokenUsage(mode: ThinkingMode, promptLength: number): TokenUsage {
  const baseTokens = Math.ceil(promptLength / 4);
  const multipliers: Record<ThinkingMode, { input: number; output: number }> = {
    normal: { input: 1, output: 1 },
    extended: { input: 1.5, output: 2.5 },
    deep: { input: 2, output: 4 },
    auto: { input: 1.2, output: 1.5 },
  };

  const m = multipliers[mode];
  return {
    mode,
    inputTokens: Math.ceil(baseTokens * m.input),
    outputTokens: Math.ceil(baseTokens * m.output),
    totalCredits: THINKING_MODES[mode].credits || THINKING_MODES.normal.credits,
    timestamp: Date.now(),
  };
}

// ─── Accepted File Types ────────────────────────────────────────────────────

export const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/svg+xml": [".svg"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  // CAD formats (generic MIME)
  "application/octet-stream": [".dxf", ".step", ".stp", ".iges", ".igs"],
};

export const ACCEPTED_EXTENSIONS = [".pdf", ".dxf", ".step", ".stp", ".iges", ".igs", ".docx", ".png", ".jpg", ".jpeg", ".svg"];

export function getFileTypeLabel(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() || "";
  const labels: Record<string, string> = {
    pdf: "PDF Document",
    dxf: "DXF Drawing",
    step: "STEP Model",
    stp: "STEP Model",
    iges: "IGES Model",
    igs: "IGES Model",
    docx: "Word Document",
    png: "PNG Image",
    jpg: "JPEG Image",
    jpeg: "JPEG Image",
    svg: "SVG Vector",
  };
  return labels[ext] || "File";
}

export function getFileTypeIcon(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() || "";
  if (["png", "jpg", "jpeg", "svg"].includes(ext)) return "image";
  if (["step", "stp", "iges", "igs", "dxf"].includes(ext)) return "cad";
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "doc";
  return "file";
}
