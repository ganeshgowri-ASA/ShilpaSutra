/**
 * Clarifying Questions Engine
 * Detects ambiguity in Text-to-CAD prompts and returns targeted questions
 * before geometry generation begins.
 */

export interface ClarifyingQuestion {
  id: string;
  question: string;
  placeholder: string;
  unit?: string;
}

export interface ClarifyingResult {
  needed: boolean;
  domain: string;
  questions: ClarifyingQuestion[];
}

// ── Domain detection keywords ────────────────────────────────────────────────

const DOMAINS: Record<string, RegExp> = {
  pv_array:   /pv\s*array|solar\s*array|photovoltaic\s*array|panel\s*array/i,
  pv_module:  /pv\s*module|solar\s*module|solar\s*panel|bifacial/i,
  enclosure:  /enclos|housing|cabinet|box|case|junction\s*box/i,
  beam:       /beam|joist|rafter|girder|purlin/i,
  bracket:    /bracket|mount|clamp|clip/i,
  gear:       /gear|pinion|sprocket/i,
  pipe:       /pipe|tube|duct|conduit/i,
  flange:     /flange/i,
  heat_sink:  /heat.?sink|heatsink|cooler|thermal/i,
  bearing:    /bearing|bushing/i,
  fastener:   /bolt|screw|nut|washer|fastener/i,
  plate:      /plate|sheet|panel(?!\s*array)/i,
  shaft:      /shaft|axle|spindle/i,
  spring:     /spring|coil/i,
};

// ── Question banks per domain ─────────────────────────────────────────────────

const QUESTIONS: Record<string, ClarifyingQuestion[]> = {
  pv_array: [
    { id: "modules_count", question: "How many modules in the array?", placeholder: "e.g. 20", unit: "modules" },
    { id: "tilt_angle",    question: "Tilt angle?", placeholder: "e.g. 15°", unit: "°" },
    { id: "mounting_type", question: "Mounting type?", placeholder: "Ground / Rooftop / Carport" },
    { id: "row_spacing",   question: "Row spacing (m)?", placeholder: "e.g. 5", unit: "m" },
  ],
  pv_module: [
    { id: "width",       question: "Module width?", placeholder: "e.g. 1000", unit: "mm" },
    { id: "height",      question: "Module height?", placeholder: "e.g. 2000", unit: "mm" },
    { id: "frame_mat",   question: "Frame material?", placeholder: "Aluminum / Frameless" },
    { id: "glass_type",  question: "Glass type?", placeholder: "Monofacial / Bifacial" },
  ],
  enclosure: [
    { id: "length",      question: "Length (mm)?",  placeholder: "e.g. 200", unit: "mm" },
    { id: "width",       question: "Width (mm)?",   placeholder: "e.g. 150", unit: "mm" },
    { id: "height",      question: "Height (mm)?",  placeholder: "e.g. 80", unit: "mm" },
    { id: "ip_rating",   question: "IP rating?",    placeholder: "e.g. IP65" },
    { id: "material",    question: "Material?",     placeholder: "Aluminum / Polycarbonate / Steel" },
  ],
  beam: [
    { id: "length",       question: "Beam length?",        placeholder: "e.g. 6000", unit: "mm" },
    { id: "cross_section",question: "Cross-section type?", placeholder: "HEA200 / IPE300 / RHS / custom" },
    { id: "load",         question: "Applied load?",       placeholder: "e.g. 10 kN/m" },
    { id: "material",     question: "Material?",           placeholder: "S275 Steel / Aluminum 6061" },
  ],
  bracket: [
    { id: "dims",         question: "Dimensions (LxWxH)?", placeholder: "e.g. 100x80x5mm" },
    { id: "holes",        question: "Mounting holes?",      placeholder: "e.g. 4× M8" },
    { id: "material",     question: "Material?",            placeholder: "Aluminum / Steel / Stainless" },
    { id: "wall_thick",   question: "Wall thickness?",      placeholder: "e.g. 3mm", unit: "mm" },
  ],
  gear: [
    { id: "teeth",  question: "Number of teeth?",  placeholder: "e.g. 20" },
    { id: "module", question: "Module (m)?",        placeholder: "e.g. 2", unit: "mm" },
    { id: "width",  question: "Face width (mm)?",   placeholder: "e.g. 15", unit: "mm" },
    { id: "std",    question: "Standard?",           placeholder: "ISO 54 / AGMA / DIN 867" },
  ],
  pipe: [
    { id: "od",     question: "Outer diameter (mm)?", placeholder: "e.g. 60",  unit: "mm" },
    { id: "wall",   question: "Wall thickness (mm)?", placeholder: "e.g. 3",   unit: "mm" },
    { id: "length", question: "Length (mm)?",          placeholder: "e.g. 500", unit: "mm" },
    { id: "std",    question: "Standard?",             placeholder: "EN 10255 / ASME B36.10 / ISO 4200" },
  ],
  flange: [
    { id: "dn",    question: "Nominal bore (DN)?",   placeholder: "e.g. DN50" },
    { id: "pn",    question: "Pressure rating (PN)?",placeholder: "e.g. PN16" },
    { id: "std",   question: "Standard?",             placeholder: "EN 1092-1 / ASME B16.5" },
    { id: "mat",   question: "Material?",             placeholder: "Carbon Steel / Stainless / Cast Iron" },
  ],
  heat_sink: [
    { id: "base_dims", question: "Base dimensions (LxW)?", placeholder: "e.g. 60x60mm" },
    { id: "fins",      question: "Number of fins?",         placeholder: "e.g. 12" },
    { id: "fin_h",     question: "Fin height (mm)?",        placeholder: "e.g. 25", unit: "mm" },
    { id: "material",  question: "Material?",               placeholder: "Aluminum 6063 / Copper" },
  ],
  bearing: [
    { id: "bore",  question: "Bore diameter (mm)?",  placeholder: "e.g. 25", unit: "mm" },
    { id: "od",    question: "Outer diameter (mm)?", placeholder: "e.g. 52", unit: "mm" },
    { id: "width", question: "Width (mm)?",           placeholder: "e.g. 15", unit: "mm" },
    { id: "type",  question: "Bearing type?",         placeholder: "Deep groove / Angular / Roller" },
  ],
  fastener: [
    { id: "size",   question: "Thread size?",     placeholder: "e.g. M8, M12, 1/4-20 UNC" },
    { id: "length", question: "Length (mm)?",      placeholder: "e.g. 40", unit: "mm" },
    { id: "grade",  question: "Strength grade?",   placeholder: "8.8 / A4-80 / Grade 5" },
    { id: "std",    question: "Standard?",          placeholder: "ISO 4014 / DIN 933 / ASME B18" },
  ],
  plate: [
    { id: "dims",     question: "Plate dimensions (LxW)?", placeholder: "e.g. 200x100mm" },
    { id: "thick",    question: "Thickness (mm)?",          placeholder: "e.g. 10", unit: "mm" },
    { id: "holes",    question: "Hole pattern?",            placeholder: "e.g. 4× Ø8mm at corners" },
    { id: "material", question: "Material?",                placeholder: "S235 Steel / Aluminum 5052" },
  ],
  shaft: [
    { id: "dia",    question: "Shaft diameter (mm)?", placeholder: "e.g. 25", unit: "mm" },
    { id: "length", question: "Length (mm)?",          placeholder: "e.g. 300", unit: "mm" },
    { id: "key",    question: "Keyway?",               placeholder: "None / 6×6mm / 8×7mm" },
    { id: "mat",    question: "Material?",             placeholder: "C45 Steel / 304 Stainless" },
  ],
  spring: [
    { id: "wire_dia",  question: "Wire diameter (mm)?",   placeholder: "e.g. 3",  unit: "mm" },
    { id: "coil_dia",  question: "Coil outer diameter?",  placeholder: "e.g. 25", unit: "mm" },
    { id: "turns",     question: "Number of active coils?", placeholder: "e.g. 8" },
    { id: "free_len",  question: "Free length (mm)?",     placeholder: "e.g. 60", unit: "mm" },
  ],
  default: [
    { id: "dims",     question: "Overall dimensions?",  placeholder: "e.g. 100x50x30mm" },
    { id: "material", question: "Material?",             placeholder: "Aluminum / Steel / Plastic" },
    { id: "features", question: "Special features?",    placeholder: "holes, slots, threads, fillets…" },
  ],
};

// ── Ambiguity heuristics ─────────────────────────────────────────────────────

const HAS_DIMS = /\d+\s*(mm|cm|m|in|inch|ft|"|')|[×x]\s*\d|\d\s*[×x]/i;
const HAS_MATERIAL = /aluminum|aluminium|steel|iron|copper|brass|titanium|plastic|abs|pla|nylon|carbon|wood|concrete/i;

function hasDimensions(prompt: string): boolean {
  return HAS_DIMS.test(prompt);
}

function hasMaterial(prompt: string): boolean {
  return HAS_MATERIAL.test(prompt);
}

/**
 * Analyse a prompt and return whether clarifying questions are needed.
 * Returns null if the prompt is specific enough to generate directly.
 */
export function getClarifyingQuestions(prompt: string): ClarifyingResult | null {
  const p = prompt.trim();

  // If prompt is very detailed (lots of numbers / long) — skip questions
  const wordCount = p.split(/\s+/).length;
  const numberCount = (p.match(/\d+/g) ?? []).length;
  if (wordCount >= 8 && numberCount >= 2) return null;
  if (wordCount >= 12) return null;

  // Detect domain
  let domain = "default";
  for (const [d, rx] of Object.entries(DOMAINS)) {
    if (rx.test(p)) { domain = d; break; }
  }

  // For very short / vague prompts always ask
  const vague = wordCount <= 2;
  const missingDims = !hasDimensions(p);
  const missingMat  = !hasMaterial(p);

  if (!vague && !missingDims && !missingMat && domain === "default") return null;
  if (!vague && !missingDims && domain !== "default") return null;

  const questions = (QUESTIONS[domain] ?? QUESTIONS.default).slice(0, 4);

  return {
    needed: true,
    domain,
    questions,
  };
}

/** Append user answers to the original prompt */
export function buildEnrichedPrompt(
  prompt: string,
  answers: Record<string, string>
): string {
  const extras = Object.entries(answers)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => {
      const q = Object.values(QUESTIONS)
        .flat()
        .find((q) => q.id === k);
      return q ? `${q.question.replace("?", "")}: ${v}` : v;
    });
  if (extras.length === 0) return prompt;
  return `${prompt}\n${extras.join(", ")}`;
}
