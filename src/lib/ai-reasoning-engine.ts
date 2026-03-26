// ─── AI Reasoning Engine for Text-to-CAD ─────────────────────────────────
// Decomposes complex engineering descriptions into multi-part assemblies
// with chain-of-thought reasoning and engineering knowledge.

// ─── Types ────────────────────────────────────────────────────────────────

export interface ReasoningStep {
  step: number;
  action: string;
  detail: string;
  status: "pending" | "active" | "done";
}

export interface BOMEntry {
  partName: string;
  quantity: number;
  material: string;
  dimensions: string;
  color: string;
}

export interface AssemblyPart {
  type: "box" | "cylinder" | "sphere" | "cone";
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  dimensions: { width: number; height: number; depth: number };
  material: string;
  color: string;
  opacity: number;
  metalness: number;
  roughness: number;
  visible: boolean;
  locked: boolean;
}

export interface ReasoningResult {
  objectType: string;
  reasoning: ReasoningStep[];
  parts: AssemblyPart[];
  bom: BOMEntry[];
  kclCode: string;
  summary: string;
}

// ─── Parsed Dimensions ───────────────────────────────────────────────────

export interface ParsedDims {
  length?: number;   // mm
  width?: number;    // mm
  height?: number;   // mm
  diameter?: number;  // mm
  radius?: number;    // mm
  thickness?: number; // mm
  wallThickness?: number;
  pitch?: number;
  threadSize?: number;
  finCount?: number;
  holeCount?: number;
  holeDiameter?: number;
}

// ─── Unit scale: mm to scene units ───────────────────────────────────────

const MM = 0.1; // 1mm = 0.1 scene units (10mm = 1 unit)

// ─── Dimension Parser ────────────────────────────────────────────────────

export function parseDimensionsAdvanced(prompt: string): ParsedDims {
  const t = prompt.toLowerCase();
  const dims: ParsedDims = {};

  // ── Unit conversion helper: convert value+unit to mm ──
  function toMM(value: number, unit: string): number {
    if (unit === "m" || unit === "meter" || unit === "meters" || unit === "metre" || unit === "metres") return value * 1000;
    if (unit === "cm" || unit === "centimeter" || unit === "centimeters") return value * 10;
    if (unit === "in" || unit === "inch" || unit === "inches") return value * 25.4;
    return value; // mm or no unit
  }

  // Generic "Nmm" / "Ncm" / "Nm" value extractor
  function parseWithUnit(match: RegExpMatchArray | null): number | null {
    if (!match) return null;
    const val = parseFloat(match[1]);
    const unit = (match[2] || "mm").replace(/\s/g, "");
    return toMM(val, unit);
  }

  // "2m x 1m x 35mm" - mixed unit triple
  const mixedTriple = t.match(/(\d+(?:\.\d+)?)\s*(m|meter|meters|metre|metres|cm|mm|in|inch)\s*x\s*(\d+(?:\.\d+)?)\s*(m|meter|meters|metre|metres|cm|mm|in|inch)\s*x\s*(\d+(?:\.\d+)?)\s*(m|meter|meters|metre|metres|cm|mm|in|inch)/);
  if (mixedTriple) {
    dims.length = toMM(parseFloat(mixedTriple[1]), mixedTriple[2]);
    dims.width = toMM(parseFloat(mixedTriple[3]), mixedTriple[4]);
    dims.height = toMM(parseFloat(mixedTriple[5]), mixedTriple[6]);
    return enrichDims(t, dims);
  }

  // "2m x 1m x 35mm" or "2000mm x 1000mm x 35mm"
  const meterPattern = t.match(/(\d+(?:\.\d+)?)\s*m\s*x\s*(\d+(?:\.\d+)?)\s*m\s*x\s*(\d+(?:\.\d+)?)\s*mm/);
  if (meterPattern) {
    dims.length = parseFloat(meterPattern[1]) * 1000;
    dims.width = parseFloat(meterPattern[2]) * 1000;
    dims.height = parseFloat(meterPattern[3]);
    return enrichDims(t, dims);
  }

  // "2m x 1m x 35mm" where all have same unit
  const allMeter = t.match(/(\d+(?:\.\d+)?)\s*m\s*x\s*(\d+(?:\.\d+)?)\s*m\s*x\s*(\d+(?:\.\d+)?)\s*m(?!m)/);
  if (allMeter) {
    dims.length = parseFloat(allMeter[1]) * 1000;
    dims.width = parseFloat(allMeter[2]) * 1000;
    dims.height = parseFloat(allMeter[3]) * 1000;
    return enrichDims(t, dims);
  }

  // "200x150x60mm" or "200x150x60cm"
  const mmTriple = t.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(mm|cm|m(?!m))/);
  if (mmTriple) {
    const unit = mmTriple[4];
    dims.length = toMM(parseFloat(mmTriple[1]), unit);
    dims.width = toMM(parseFloat(mmTriple[2]), unit);
    dims.height = toMM(parseFloat(mmTriple[3]), unit);
    return enrichDims(t, dims);
  }

  // "100x80x3" (no unit, assume mm)
  const triple = t.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
  if (triple) {
    dims.length = parseFloat(triple[1]);
    dims.width = parseFloat(triple[2]);
    dims.height = parseFloat(triple[3]);
    return enrichDims(t, dims);
  }

  // "50mm dia" or "50mm diameter" or "5cm dia"
  const diaMatch = t.match(/(\d+(?:\.\d+)?)\s*(mm|cm|m(?!m|e)|meter|meters)\s*(?:dia(?:meter)?|d\b)/);
  if (diaMatch) dims.diameter = parseWithUnit(diaMatch) ?? undefined;

  // "dia 50mm" or "diameter 50mm" or "diameter 5cm" or "sphere diameter 5mm"
  const diaMatch2 = t.match(/(?:dia(?:meter)?)\s*(\d+(?:\.\d+)?)\s*(mm|cm|m(?!m|e)|meter|meters)?/);
  if (!dims.diameter && diaMatch2) dims.diameter = parseWithUnit(diaMatch2) ?? undefined;

  // "M8" thread size
  const threadMatch = t.match(/\bm(\d+(?:\.\d+)?)\b/);
  if (threadMatch && !t.includes("meter") && !t.includes("metre")) {
    dims.threadSize = parseFloat(threadMatch[1]);
    dims.diameter = dims.threadSize;
  }

  // "40mm long" or "length 40mm" or "length 2m" or "length 2 meter" or "length 10cm"
  const longMatch = t.match(/(\d+(?:\.\d+)?)\s*(mm|cm|m(?!m|e)|meter|meters|metre|metres)\s*long/) ||
                    t.match(/length\s*(\d+(?:\.\d+)?)\s*(mm|cm|m(?!m|e)|meter|meters|metre|metres)?/);
  if (longMatch) dims.length = parseWithUnit(longMatch) ?? undefined;

  // "30mm tall" or "height 30mm" or "height 2m"
  const tallMatch = t.match(/(\d+(?:\.\d+)?)\s*(mm|cm|m(?!m|e)|meter|meters|metre|metres)\s*tall/) ||
                    t.match(/height\s*(\d+(?:\.\d+)?)\s*(mm|cm|m(?!m|e)|meter|meters|metre|metres)?/);
  if (tallMatch) dims.height = parseWithUnit(tallMatch) ?? undefined;

  // "width 1m" or "width 100mm" or "1m wide" or "100mm wide"
  const wideMatch = t.match(/(\d+(?:\.\d+)?)\s*(mm|cm|m(?!m|e)|meter|meters|metre|metres)\s*wide/) ||
                    t.match(/width\s*(\d+(?:\.\d+)?)\s*(mm|cm|m(?!m|e)|meter|meters|metre|metres)?/);
  if (wideMatch) dims.width = parseWithUnit(wideMatch) ?? undefined;

  // "3mm thick" or "thickness 3mm" or "35mm thick"
  const thickMatch = t.match(/(\d+(?:\.\d+)?)\s*(mm|cm|m(?!m|e)|meter|meters)\s*thick/) ||
                     t.match(/thick(?:ness)?\s*(\d+(?:\.\d+)?)\s*(mm|cm|m(?!m|e)|meter|meters)?/);
  if (thickMatch) dims.thickness = parseWithUnit(thickMatch) ?? undefined;

  // "wall 2mm"
  const wallMatch = t.match(/wall\s*(?:thickness)?\s*(\d+(?:\.\d+)?)\s*(?:mm)?/);
  if (wallMatch) dims.wallThickness = parseFloat(wallMatch[1]);

  // Standalone NNmm as fallback
  if (!dims.length && !dims.diameter) {
    const fallback = t.match(/(\d+(?:\.\d+)?)\s*mm/);
    if (fallback) dims.length = parseFloat(fallback[1]);
  }

  return enrichDims(t, dims);
}

function enrichDims(t: string, dims: ParsedDims): ParsedDims {
  // Fin count
  const finMatch = t.match(/(\d+)\s*fins?/);
  if (finMatch) dims.finCount = parseInt(finMatch[1]);

  // Hole count
  const holeMatch = t.match(/(\d+)\s*(?:mounting\s*)?holes?/);
  if (holeMatch) dims.holeCount = parseInt(holeMatch[1]);

  // Hole diameter
  const holeDiaMatch = t.match(/holes?\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*mm/);
  if (holeDiaMatch) dims.holeDiameter = parseFloat(holeDiaMatch[1]);

  // Pitch
  const pitchMatch = t.match(/pitch\s*(\d+(?:\.\d+)?)/);
  if (pitchMatch) dims.pitch = parseFloat(pitchMatch[1]);

  return dims;
}

// ─── Material Detection ──────────────────────────────────────────────────

export interface MaterialInfo {
  name: string;
  color: string;
  metalness: number;
  roughness: number;
  opacity: number;
}

const MATERIAL_DB: Record<string, MaterialInfo> = {
  aluminum: { name: "Aluminum 6061-T6", color: "#C0C0C0", metalness: 0.85, roughness: 0.25, opacity: 1 },
  steel: { name: "Steel (AISI 1045)", color: "#71797E", metalness: 0.75, roughness: 0.35, opacity: 1 },
  stainless: { name: "Stainless Steel 304", color: "#8A9A9E", metalness: 0.8, roughness: 0.2, opacity: 1 },
  glass: { name: "Tempered Glass", color: "#ADD8E6", metalness: 0.1, roughness: 0.05, opacity: 0.35 },
  silicon: { name: "Monocrystalline Silicon", color: "#1a237e", metalness: 0.3, roughness: 0.4, opacity: 1 },
  eva: { name: "EVA Encapsulant", color: "#f5f5dc", metalness: 0, roughness: 0.6, opacity: 0.5 },
  copper: { name: "Copper", color: "#B87333", metalness: 0.9, roughness: 0.2, opacity: 1 },
  brass: { name: "Brass", color: "#B5A642", metalness: 0.85, roughness: 0.25, opacity: 1 },
  plastic: { name: "ABS Plastic", color: "#2c2c2c", metalness: 0, roughness: 0.6, opacity: 1 },
  nylon: { name: "Nylon PA6", color: "#E8E8E0", metalness: 0, roughness: 0.5, opacity: 1 },
  rubber: { name: "Rubber", color: "#1a1a1a", metalness: 0, roughness: 0.9, opacity: 1 },
  titanium: { name: "Titanium Ti-6Al-4V", color: "#878681", metalness: 0.7, roughness: 0.3, opacity: 1 },
  carbon_fiber: { name: "Carbon Fiber", color: "#1c1c1c", metalness: 0.3, roughness: 0.3, opacity: 1 },
  zinc: { name: "Zinc Alloy", color: "#A8A9AD", metalness: 0.75, roughness: 0.3, opacity: 1 },
  junction_box: { name: "PPO Plastic", color: "#2d2d2d", metalness: 0, roughness: 0.5, opacity: 1 },
};

export function detectMaterial(prompt: string): MaterialInfo {
  const t = prompt.toLowerCase();
  if (t.includes("aluminum") || t.includes("aluminium") || t.includes("al ")) return MATERIAL_DB.aluminum;
  if (t.includes("stainless")) return MATERIAL_DB.stainless;
  if (t.includes("steel")) return MATERIAL_DB.steel;
  if (t.includes("glass")) return MATERIAL_DB.glass;
  if (t.includes("copper")) return MATERIAL_DB.copper;
  if (t.includes("brass")) return MATERIAL_DB.brass;
  if (t.includes("titanium")) return MATERIAL_DB.titanium;
  if (t.includes("carbon fiber") || t.includes("cfrp")) return MATERIAL_DB.carbon_fiber;
  if (t.includes("nylon") || t.includes("pa6") || t.includes("pa12")) return MATERIAL_DB.nylon;
  if (t.includes("plastic") || t.includes("abs") || t.includes("pla") || t.includes("petg")) return MATERIAL_DB.plastic;
  if (t.includes("rubber") || t.includes("silicone") || t.includes("epdm")) return MATERIAL_DB.rubber;
  return MATERIAL_DB.steel; // default
}

export function getMaterialByKey(key: string): MaterialInfo {
  return MATERIAL_DB[key] || MATERIAL_DB.steel;
}

// ─── Domain Object Detection ─────────────────────────────────────────────

export type DomainType =
  | "solar_pv_module"
  | "hex_bolt_assembly"
  | "l_bracket"
  | "heat_sink"
  | "electronics_enclosure"
  | "pipe_flange"
  | "gear"
  | "bearing"
  | "pcb_enclosure"
  | "pipe_fitting"
  | "dumbbell"
  | "pipe_tube"
  | "plate_with_holes"
  | "cone_part"
  | "sphere_part"
  | "cylinder_part"
  | "box_part"
  | "generic";

export function detectDomain(prompt: string): DomainType {
  const t = prompt.toLowerCase();
  if (t.includes("dumbbell") || t.includes("dumb bell") || t.includes("barbell")) return "dumbbell";
  if (t.includes("solar") && (t.includes("panel") || t.includes("module") || t.includes("pv"))) return "solar_pv_module";
  if (t.includes("pv") && (t.includes("module") || t.includes("panel"))) return "solar_pv_module";
  if ((t.includes("bolt") || t.includes("screw")) && (t.includes("nut") || t.includes("washer") || t.includes("hex"))) return "hex_bolt_assembly";
  if (t.includes("l-bracket") || t.includes("l bracket") || (t.includes("bracket") && t.includes("mounting"))) return "l_bracket";
  if (t.includes("heat sink") || t.includes("heatsink") || (t.includes("heat") && t.includes("fin"))) return "heat_sink";
  if (t.includes("enclosure") && (t.includes("electronic") || t.includes("lid") || t.includes("ventilation"))) return "electronics_enclosure";
  if (t.includes("enclosure") || t.includes("housing") || t.includes("case")) return "electronics_enclosure";
  if (t.includes("flange") && t.includes("pipe")) return "pipe_flange";
  if (t.includes("gear") || t.includes("spur gear") || /\d+\s*teeth/.test(t)) return "gear";
  if (t.includes("bearing")) return "bearing";
  if (t.includes("pcb") && t.includes("enclosure")) return "pcb_enclosure";
  if (t.includes("pipe") && t.includes("fitting")) return "pipe_fitting";
  if (t.includes("pipe") || t.includes("tube")) return "pipe_tube";
  if ((t.includes("plate") || t.includes("panel")) && t.includes("hole")) return "plate_with_holes";
  if (t.includes("bracket")) return "l_bracket";
  if (t.includes("bolt") || t.includes("screw")) return "hex_bolt_assembly";
  if (t.includes("heat") && t.includes("sink")) return "heat_sink";
  if (t.includes("enclosure")) return "electronics_enclosure";
  if (t.includes("cone") || t.includes("taper") || t.includes("funnel")) return "cone_part";
  if (t.includes("sphere") || t.includes("ball")) return "sphere_part";
  if (t.includes("cylinder") || t.includes("rod") || t.includes("shaft")) return "cylinder_part";
  if (t.includes("box") || t.includes("cube") || t.includes("block")) return "box_part";
  if (t.includes("plate") || t.includes("panel") || t.includes("sheet")) return "plate_with_holes";
  return "generic";
}

// ─── Helper: create a part with defaults ─────────────────────────────────

export function makePart(overrides: Partial<AssemblyPart> & { type: AssemblyPart["type"]; name: string }): AssemblyPart {
  return {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    dimensions: { width: 1, height: 1, depth: 1 },
    material: "Steel (AISI 1045)",
    color: "#71797E",
    opacity: 1,
    metalness: 0.4,
    roughness: 0.5,
    visible: true,
    locked: false,
    ...overrides,
  };
}

// ─── Domain Builders ─────────────────────────────────────────────────────
// Each returns { parts, bom, reasoning } for a specific domain object.

function buildSolarPVModule(dims: ParsedDims, prompt: string): { parts: AssemblyPart[]; bom: BOMEntry[]; reasoning: ReasoningStep[] } {
  const t = prompt.toLowerCase();
  const L = (dims.length || 2000) * MM;  // scene units
  const W = (dims.width || 1000) * MM;
  const H = (dims.height || 35) * MM;
  const frameT = 2 * MM; // frame cross-section thickness
  const glassT = 3.2 * MM;
  const cellT = 0.2 * MM;
  const evaT = 0.5 * MM;
  const isBifacial = t.includes("bifacial") || t.includes("glass-to-glass") || t.includes("glass to glass");
  const al = getMaterialByKey("aluminum");
  const glass = getMaterialByKey("glass");
  const si = getMaterialByKey("silicon");
  const eva = getMaterialByKey("eva");
  const jb = getMaterialByKey("junction_box");

  const reasoning: ReasoningStep[] = [
    { step: 1, action: "Identify object", detail: `Solar PV Module (${isBifacial ? "bifacial glass-to-glass" : "monofacial"})`, status: "done" },
    { step: 2, action: "Parse dimensions", detail: `${(dims.length || 2000)}mm x ${(dims.width || 1000)}mm x ${(dims.height || 35)}mm`, status: "done" },
    { step: 3, action: "Detect materials", detail: "Aluminum frame, tempered glass, EVA, silicon cells", status: "done" },
    { step: 4, action: "Decompose assembly", detail: `${isBifacial ? 10 : 9} sub-parts: 4 frame pieces, front glass, ${isBifacial ? "back glass" : "backsheet"}, EVA x2, cell array, junction box`, status: "done" },
    { step: 5, action: "Generate geometry", detail: "Positioning all parts relative to frame origin", status: "done" },
  ];

  const parts: AssemblyPart[] = [];
  const bom: BOMEntry[] = [];
  const yBase = H / 2;

  // Frame - 4 pieces (top, bottom, left, right)
  // Top frame rail
  parts.push(makePart({
    type: "box", name: "Frame - Top Rail",
    position: [0, yBase, W / 2 - frameT / 2],
    dimensions: { width: L, height: H, depth: frameT },
    material: al.name, color: al.color, metalness: al.metalness, roughness: al.roughness,
  }));
  // Bottom frame rail
  parts.push(makePart({
    type: "box", name: "Frame - Bottom Rail",
    position: [0, yBase, -W / 2 + frameT / 2],
    dimensions: { width: L, height: H, depth: frameT },
    material: al.name, color: al.color, metalness: al.metalness, roughness: al.roughness,
  }));
  // Left frame rail
  parts.push(makePart({
    type: "box", name: "Frame - Left Rail",
    position: [-L / 2 + frameT / 2, yBase, 0],
    dimensions: { width: frameT, height: H, depth: W - frameT * 2 },
    material: al.name, color: al.color, metalness: al.metalness, roughness: al.roughness,
  }));
  // Right frame rail
  parts.push(makePart({
    type: "box", name: "Frame - Right Rail",
    position: [L / 2 - frameT / 2, yBase, 0],
    dimensions: { width: frameT, height: H, depth: W - frameT * 2 },
    material: al.name, color: al.color, metalness: al.metalness, roughness: al.roughness,
  }));
  bom.push({ partName: "Aluminum Frame Rail", quantity: 4, material: al.name, dimensions: `${(dims.length || 2000)}x${(dims.height || 35)}x${20}mm`, color: al.color });

  // Front Glass
  const innerL = L - frameT * 2;
  const innerW = W - frameT * 2;
  const glassY = yBase + H / 2 - glassT / 2;
  parts.push(makePart({
    type: "box", name: "Front Glass",
    position: [0, glassY, 0],
    dimensions: { width: innerL, height: glassT, depth: innerW },
    material: glass.name, color: "#B0E0FF", metalness: glass.metalness, roughness: glass.roughness, opacity: 0.4,
  }));
  bom.push({ partName: "Front Tempered Glass", quantity: 1, material: glass.name, dimensions: `${(innerL / MM).toFixed(0)}x${(innerW / MM).toFixed(0)}x3.2mm`, color: "#B0E0FF" });

  // Front EVA
  const frontEvaY = glassY - glassT / 2 - evaT / 2;
  parts.push(makePart({
    type: "box", name: "EVA Layer (Front)",
    position: [0, frontEvaY, 0],
    dimensions: { width: innerL, height: evaT, depth: innerW },
    material: eva.name, color: eva.color, metalness: eva.metalness, roughness: eva.roughness, opacity: 0.5,
  }));

  // Solar Cell Array
  const cellY = frontEvaY - evaT / 2 - cellT / 2;
  parts.push(makePart({
    type: "box", name: "Solar Cell Array",
    position: [0, cellY, 0],
    dimensions: { width: innerL * 0.95, height: cellT, depth: innerW * 0.95 },
    material: si.name, color: "#1a237e", metalness: si.metalness, roughness: si.roughness,
  }));
  bom.push({ partName: "Solar Cell Array (6x10)", quantity: 1, material: si.name, dimensions: `${((innerL * 0.95) / MM).toFixed(0)}x${((innerW * 0.95) / MM).toFixed(0)}x0.2mm`, color: "#1a237e" });

  // Rear EVA
  const rearEvaY = cellY - cellT / 2 - evaT / 2;
  parts.push(makePart({
    type: "box", name: "EVA Layer (Rear)",
    position: [0, rearEvaY, 0],
    dimensions: { width: innerL, height: evaT, depth: innerW },
    material: eva.name, color: eva.color, metalness: eva.metalness, roughness: eva.roughness, opacity: 0.5,
  }));
  bom.push({ partName: "EVA Encapsulant Layer", quantity: 2, material: eva.name, dimensions: `${(innerL / MM).toFixed(0)}x${(innerW / MM).toFixed(0)}x0.5mm`, color: eva.color });

  // Back Glass / Backsheet
  const backY = yBase - H / 2 + glassT / 2;
  if (isBifacial) {
    parts.push(makePart({
      type: "box", name: "Back Glass (Bifacial)",
      position: [0, backY, 0],
      dimensions: { width: innerL, height: glassT, depth: innerW },
      material: glass.name, color: "#B0E0FF", metalness: glass.metalness, roughness: glass.roughness, opacity: 0.4,
    }));
    bom.push({ partName: "Back Tempered Glass", quantity: 1, material: glass.name, dimensions: `${(innerL / MM).toFixed(0)}x${(innerW / MM).toFixed(0)}x3.2mm`, color: "#B0E0FF" });
  } else {
    parts.push(makePart({
      type: "box", name: "Backsheet (TPT)",
      position: [0, backY, 0],
      dimensions: { width: innerL, height: 0.3 * MM, depth: innerW },
      material: "TPT Backsheet", color: "#FFFFFF", metalness: 0, roughness: 0.7,
    }));
    bom.push({ partName: "TPT Backsheet", quantity: 1, material: "TPT", dimensions: `${(innerL / MM).toFixed(0)}x${(innerW / MM).toFixed(0)}x0.3mm`, color: "#FFFFFF" });
  }

  // Junction Box
  const jbW = 12 * MM;
  const jbH = 3 * MM;
  const jbD = 8 * MM;
  parts.push(makePart({
    type: "box", name: "Junction Box",
    position: [0, yBase - H / 2 - jbH / 2, 0],
    dimensions: { width: jbW, height: jbH, depth: jbD },
    material: jb.name, color: jb.color, metalness: jb.metalness, roughness: jb.roughness,
  }));
  bom.push({ partName: "Junction Box", quantity: 1, material: jb.name, dimensions: "120x30x80mm", color: jb.color });

  return { parts, bom, reasoning };
}

function buildHexBoltAssembly(dims: ParsedDims, prompt: string): { parts: AssemblyPart[]; bom: BOMEntry[]; reasoning: ReasoningStep[] } {
  const t = prompt.toLowerCase();
  const mSize = dims.threadSize || dims.diameter || 8;
  const boltLen = dims.length || (mSize * 5);
  const hasNut = t.includes("nut");
  const hasWasher = t.includes("washer");
  const mat = detectMaterial(prompt);
  const headH = mSize * 0.65;
  const headAF = mSize * 1.73; // across flats
  const headR = (headAF / 2) * MM;
  const shankR = (mSize / 2) * MM;
  const shankLen = boltLen * MM;
  const headHScene = headH * MM;

  const reasoning: ReasoningStep[] = [
    { step: 1, action: "Identify object", detail: `M${mSize} Hex Bolt Assembly`, status: "done" },
    { step: 2, action: "Parse dimensions", detail: `Thread: M${mSize}, Length: ${boltLen}mm${hasNut ? ", with nut" : ""}${hasWasher ? ", with washer" : ""}`, status: "done" },
    { step: 3, action: "Engineering lookup", detail: `Head height: ${headH.toFixed(1)}mm, AF: ${headAF.toFixed(1)}mm`, status: "done" },
    { step: 4, action: "Generate parts", detail: `${1 + (hasNut ? 1 : 0) + (hasWasher ? 1 : 0)} parts`, status: "done" },
  ];

  const parts: AssemblyPart[] = [];
  const bom: BOMEntry[] = [];

  // Bolt head
  parts.push(makePart({
    type: "cylinder", name: `M${mSize} Bolt Head`,
    position: [0, shankLen + headHScene / 2, 0],
    dimensions: { width: headR, height: headHScene, depth: headR },
    material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
  }));
  // Bolt shank
  parts.push(makePart({
    type: "cylinder", name: `M${mSize} Bolt Shank`,
    position: [0, shankLen / 2, 0],
    dimensions: { width: shankR, height: shankLen, depth: shankR },
    material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
  }));
  bom.push({ partName: `Hex Bolt M${mSize}x${boltLen}`, quantity: 1, material: mat.name, dimensions: `M${mSize}x${boltLen}mm`, color: mat.color });

  if (hasWasher) {
    const washerOD = mSize * 2.2;
    const washerT = mSize * 0.2;
    parts.push(makePart({
      type: "cylinder", name: `M${mSize} Washer`,
      position: [0, -washerT * MM / 2, 0],
      dimensions: { width: (washerOD / 2) * MM, height: washerT * MM, depth: (washerOD / 2) * MM },
      material: mat.name, color: "#A8A9AD", metalness: 0.8, roughness: 0.2,
    }));
    bom.push({ partName: `Flat Washer M${mSize}`, quantity: 1, material: mat.name, dimensions: `OD${washerOD.toFixed(0)}xID${(mSize + 0.5).toFixed(1)}x${washerT.toFixed(1)}mm`, color: "#A8A9AD" });
  }

  if (hasNut) {
    const nutH = mSize * 0.8;
    const nutAF = headAF;
    const nutY = hasWasher ? -(mSize * 0.2 + nutH / 2) * MM : -nutH * MM / 2;
    parts.push(makePart({
      type: "cylinder", name: `M${mSize} Hex Nut`,
      position: [0, nutY, 0],
      dimensions: { width: (nutAF / 2) * MM, height: nutH * MM, depth: (nutAF / 2) * MM },
      material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
    }));
    bom.push({ partName: `Hex Nut M${mSize}`, quantity: 1, material: mat.name, dimensions: `AF${nutAF.toFixed(1)}x${nutH.toFixed(1)}mm`, color: mat.color });
  }

  return { parts, bom, reasoning };
}

function buildLBracket(dims: ParsedDims, prompt: string): { parts: AssemblyPart[]; bom: BOMEntry[]; reasoning: ReasoningStep[] } {
  const L = (dims.length || 100) * MM;
  const W = (dims.width || 80) * MM;
  const T = (dims.thickness || dims.height || 3) * MM;
  const mat = detectMaterial(prompt);
  const holeCount = dims.holeCount || 4;
  const holeDia = dims.holeDiameter || Math.max(4, (dims.thickness || 3) * 1.5);

  const reasoning: ReasoningStep[] = [
    { step: 1, action: "Identify object", detail: `L-Bracket with ${holeCount} mounting holes`, status: "done" },
    { step: 2, action: "Parse dimensions", detail: `${(dims.length || 100)}x${(dims.width || 80)}x${(dims.thickness || dims.height || 3)}mm, ${mat.name}`, status: "done" },
    { step: 3, action: "Decompose", detail: `2 flanges + ${holeCount} hole markers`, status: "done" },
    { step: 4, action: "Generate geometry", detail: "Vertical flange + horizontal flange + holes", status: "done" },
  ];

  const parts: AssemblyPart[] = [];
  const bom: BOMEntry[] = [];

  // Vertical flange
  parts.push(makePart({
    type: "box", name: "Bracket - Vertical Flange",
    position: [0, W / 2, -T / 2],
    dimensions: { width: L, height: W, depth: T },
    material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
  }));

  // Horizontal flange
  parts.push(makePart({
    type: "box", name: "Bracket - Horizontal Flange",
    position: [0, T / 2, W / 2 - T],
    dimensions: { width: L, height: T, depth: W },
    material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
  }));

  bom.push({ partName: "L-Bracket Body", quantity: 1, material: mat.name, dimensions: `${(dims.length || 100)}x${(dims.width || 80)}x${(dims.thickness || dims.height || 3)}mm`, color: mat.color });

  // Mounting holes as visual markers (dark cylinders)
  const holesPerFlange = Math.floor(holeCount / 2);
  for (let i = 0; i < holesPerFlange; i++) {
    const xPos = -L / 2 + L * (i + 1) / (holesPerFlange + 1);
    // Holes on vertical flange
    parts.push(makePart({
      type: "cylinder", name: `Hole ${i + 1} (Vertical)`,
      position: [xPos, W * 0.7, -T / 2],
      rotation: [Math.PI / 2, 0, 0],
      dimensions: { width: holeDia * MM / 2, height: T * 1.1, depth: holeDia * MM / 2 },
      material: "Hole", color: "#0d1117", metalness: 0, roughness: 1,
    }));
    // Holes on horizontal flange
    parts.push(makePart({
      type: "cylinder", name: `Hole ${i + 1} (Horizontal)`,
      position: [xPos, T / 2, W * 0.3],
      dimensions: { width: holeDia * MM / 2, height: T * 1.1, depth: holeDia * MM / 2 },
      material: "Hole", color: "#0d1117", metalness: 0, roughness: 1,
    }));
  }
  bom.push({ partName: `Mounting Hole M${holeDia.toFixed(0)}`, quantity: holeCount, material: "-", dimensions: `${holeDia.toFixed(1)}mm dia`, color: "#0d1117" });

  return { parts, bom, reasoning };
}

function buildHeatSink(dims: ParsedDims, prompt: string): { parts: AssemblyPart[]; bom: BOMEntry[]; reasoning: ReasoningStep[] } {
  const t = prompt.toLowerCase();
  const isCylindrical = t.includes("cylindrical") || t.includes("round");
  const dia = (dims.diameter || 50) * MM;
  const baseH = 3 * MM;
  const totalH = (dims.height || 30) * MM;
  const finH = totalH - baseH;
  const finCount = dims.finCount || 12;
  const finT = 1.5 * MM;
  const al = getMaterialByKey("aluminum");
  const baseW = isCylindrical ? dia : (dims.length || 50) * MM;
  const baseD = isCylindrical ? dia : (dims.width || dims.length || 50) * MM;

  const reasoning: ReasoningStep[] = [
    { step: 1, action: "Identify object", detail: `${isCylindrical ? "Cylindrical" : "Rectangular"} Heat Sink with ${finCount} fins`, status: "done" },
    { step: 2, action: "Parse dimensions", detail: `${isCylindrical ? `Dia ${(dims.diameter || 50)}mm` : `${(dims.length || 50)}x${(dims.width || dims.length || 50)}mm`}, Height ${(dims.height || 30)}mm`, status: "done" },
    { step: 3, action: "Decompose", detail: `Base plate + ${finCount} fins`, status: "done" },
    { step: 4, action: "Generate geometry", detail: `${isCylindrical ? "Radial" : "Parallel"} fin arrangement`, status: "done" },
  ];

  const parts: AssemblyPart[] = [];
  const bom: BOMEntry[] = [];

  // Base
  if (isCylindrical) {
    parts.push(makePart({
      type: "cylinder", name: "Heat Sink Base",
      position: [0, baseH / 2, 0],
      dimensions: { width: dia / 2, height: baseH, depth: dia / 2 },
      material: al.name, color: "#1a1a2e", metalness: al.metalness, roughness: al.roughness,
    }));
  } else {
    parts.push(makePart({
      type: "box", name: "Heat Sink Base",
      position: [0, baseH / 2, 0],
      dimensions: { width: baseW, height: baseH, depth: baseD },
      material: al.name, color: "#1a1a2e", metalness: al.metalness, roughness: al.roughness,
    }));
  }
  bom.push({ partName: "Heat Sink Base", quantity: 1, material: al.name, dimensions: `${isCylindrical ? `D${(dims.diameter || 50)}` : `${(dims.length || 50)}x${(dims.width || dims.length || 50)}`}x3mm`, color: "#1a1a2e" });

  // Fins
  if (isCylindrical) {
    for (let i = 0; i < finCount; i++) {
      const angle = (i / finCount) * Math.PI * 2;
      const finLen = dia * 0.45;
      const cx = Math.cos(angle) * finLen / 2;
      const cz = Math.sin(angle) * finLen / 2;
      parts.push(makePart({
        type: "box", name: `Fin ${i + 1}`,
        position: [cx, baseH + finH / 2, cz],
        rotation: [0, -angle, 0],
        dimensions: { width: finLen, height: finH, depth: finT },
        material: al.name, color: al.color, metalness: al.metalness, roughness: al.roughness,
      }));
    }
  } else {
    const spacing = baseD / (finCount + 1);
    for (let i = 0; i < finCount; i++) {
      const zPos = -baseD / 2 + spacing * (i + 1);
      parts.push(makePart({
        type: "box", name: `Fin ${i + 1}`,
        position: [0, baseH + finH / 2, zPos],
        dimensions: { width: baseW * 0.95, height: finH, depth: finT },
        material: al.name, color: al.color, metalness: al.metalness, roughness: al.roughness,
      }));
    }
  }
  bom.push({ partName: "Cooling Fin", quantity: finCount, material: al.name, dimensions: `H${((totalH - 3)).toFixed(0)}mm x T1.5mm`, color: al.color });

  return { parts, bom, reasoning };
}

function buildElectronicsEnclosure(dims: ParsedDims, prompt: string): { parts: AssemblyPart[]; bom: BOMEntry[]; reasoning: ReasoningStep[] } {
  const t = prompt.toLowerCase();
  const L = (dims.length || 200) * MM;
  const W = (dims.width || 150) * MM;
  const H = (dims.height || 60) * MM;
  const wallT = (dims.wallThickness || 2.5) * MM;
  const hasLid = t.includes("lid") || t.includes("cover") || t.includes("top");
  const hasVents = t.includes("ventilation") || t.includes("vent") || t.includes("slot") || t.includes("cooling");
  const mat = detectMaterial(prompt);
  const lidH = 3 * MM;

  const reasoning: ReasoningStep[] = [
    { step: 1, action: "Identify object", detail: `Electronics Enclosure${hasLid ? " with lid" : ""}${hasVents ? " with ventilation" : ""}`, status: "done" },
    { step: 2, action: "Parse dimensions", detail: `${(dims.length || 200)}x${(dims.width || 150)}x${(dims.height || 60)}mm`, status: "done" },
    { step: 3, action: "Decompose", detail: `Base box + 4 walls${hasLid ? " + lid" : ""}${hasVents ? " + vent slots" : ""}`, status: "done" },
    { step: 4, action: "Generate geometry", detail: "Shell body with features", status: "done" },
  ];

  const parts: AssemblyPart[] = [];
  const bom: BOMEntry[] = [];

  // Bottom plate
  parts.push(makePart({
    type: "box", name: "Enclosure Base",
    position: [0, wallT / 2, 0],
    dimensions: { width: L, height: wallT, depth: W },
    material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
  }));

  // Front wall
  parts.push(makePart({
    type: "box", name: "Front Wall",
    position: [0, H / 2, W / 2 - wallT / 2],
    dimensions: { width: L, height: H, depth: wallT },
    material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
  }));

  // Back wall
  parts.push(makePart({
    type: "box", name: "Back Wall",
    position: [0, H / 2, -W / 2 + wallT / 2],
    dimensions: { width: L, height: H, depth: wallT },
    material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
  }));

  // Left wall
  parts.push(makePart({
    type: "box", name: "Left Wall",
    position: [-L / 2 + wallT / 2, H / 2, 0],
    dimensions: { width: wallT, height: H, depth: W - wallT * 2 },
    material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
  }));

  // Right wall
  parts.push(makePart({
    type: "box", name: "Right Wall",
    position: [L / 2 - wallT / 2, H / 2, 0],
    dimensions: { width: wallT, height: H, depth: W - wallT * 2 },
    material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
  }));

  bom.push({ partName: "Enclosure Body (Shell)", quantity: 1, material: mat.name, dimensions: `${(dims.length || 200)}x${(dims.width || 150)}x${(dims.height || 60)}mm, wall ${(dims.wallThickness || 2.5)}mm`, color: mat.color });

  if (hasLid) {
    parts.push(makePart({
      type: "box", name: "Enclosure Lid",
      position: [0, H + lidH / 2, 0],
      dimensions: { width: L + wallT, height: lidH, depth: W + wallT },
      material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
    }));
    bom.push({ partName: "Lid / Cover", quantity: 1, material: mat.name, dimensions: `${((L + wallT) / MM).toFixed(0)}x${((W + wallT) / MM).toFixed(0)}x3mm`, color: mat.color });
  }

  if (hasVents) {
    const slotCount = 6;
    const slotW = L * 0.5;
    const slotH = 1.5 * MM;
    const spacing = H * 0.5 / (slotCount + 1);
    for (let i = 0; i < slotCount; i++) {
      const yPos = H * 0.25 + spacing * (i + 1);
      parts.push(makePart({
        type: "box", name: `Vent Slot ${i + 1}`,
        position: [0, yPos, W / 2 - wallT / 2],
        dimensions: { width: slotW, height: slotH, depth: wallT * 1.1 },
        material: "Air", color: "#0d1117", metalness: 0, roughness: 1,
      }));
    }
    bom.push({ partName: "Ventilation Slot", quantity: slotCount, material: "-", dimensions: `${(slotW / MM).toFixed(0)}x1.5mm`, color: "#0d1117" });
  }

  return { parts, bom, reasoning };
}

function buildDumbbell(dims: ParsedDims, prompt: string): { parts: AssemblyPart[]; bom: BOMEntry[]; reasoning: ReasoningStep[] } {
  const barLen = (dims.length || 10) * MM;
  const sphereDia = (dims.diameter || 5) * MM;
  const barDia = sphereDia * 0.3;
  const mat = detectMaterial(prompt);

  const reasoning: ReasoningStep[] = [
    { step: 1, action: "Identify object", detail: `Dumbbell / Barbell`, status: "done" },
    { step: 2, action: "Parse dimensions", detail: `Bar length: ${(dims.length || 10)}mm, Sphere diameter: ${(dims.diameter || 5)}mm`, status: "done" },
    { step: 3, action: "Decompose", detail: "1 cylindrical bar + 2 spheres at each end", status: "done" },
    { step: 4, action: "Generate geometry", detail: "3 parts positioned along X axis", status: "done" },
  ];

  const parts: AssemblyPart[] = [];
  const bom: BOMEntry[] = [];

  // Central bar (cylinder)
  parts.push(makePart({
    type: "cylinder", name: "Bar",
    position: [0, barLen / 2, 0],
    dimensions: { width: barDia / 2, height: barLen, depth: barDia / 2 },
    material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
  }));
  bom.push({ partName: "Cylindrical Bar", quantity: 1, material: mat.name, dimensions: `D${(barDia / MM).toFixed(1)}mm x L${(barLen / MM).toFixed(0)}mm`, color: mat.color });

  // Left sphere
  parts.push(makePart({
    type: "sphere", name: "Weight - Left",
    position: [0, 0, 0],
    dimensions: { width: sphereDia / 2, height: sphereDia / 2, depth: sphereDia / 2 },
    material: mat.name, color: "#4a4a5a", metalness: mat.metalness, roughness: mat.roughness,
  }));

  // Right sphere
  parts.push(makePart({
    type: "sphere", name: "Weight - Right",
    position: [0, barLen, 0],
    dimensions: { width: sphereDia / 2, height: sphereDia / 2, depth: sphereDia / 2 },
    material: mat.name, color: "#4a4a5a", metalness: mat.metalness, roughness: mat.roughness,
  }));
  bom.push({ partName: "Spherical Weight", quantity: 2, material: mat.name, dimensions: `D${(sphereDia / MM).toFixed(1)}mm`, color: "#4a4a5a" });

  return { parts, bom, reasoning };
}

function buildGear(dims: ParsedDims, prompt: string): { parts: AssemblyPart[]; bom: BOMEntry[]; reasoning: ReasoningStep[] } {
  const t = prompt.toLowerCase();
  const teethMatch = t.match(/(\d+)\s*teeth/);
  const teeth = teethMatch ? parseInt(teethMatch[1]) : 20;
  const mod = 2; // module in mm
  const pitchR = (teeth * mod) / 2;
  const outerR = (pitchR + mod) * MM;
  const rootR = (pitchR - 1.25 * mod) * MM;
  const faceWidth = (dims.thickness || dims.height || 10) * MM;
  const boreD = (dims.diameter || pitchR * 0.4) * MM;
  const mat = detectMaterial(prompt);

  const reasoning: ReasoningStep[] = [
    { step: 1, action: "Identify object", detail: `Spur Gear with ${teeth} teeth`, status: "done" },
    { step: 2, action: "Engineering calc", detail: `Module ${mod}mm, pitch radius ${pitchR.toFixed(1)}mm, outer ${(pitchR + mod).toFixed(1)}mm`, status: "done" },
    { step: 3, action: "Decompose", detail: "Gear body (cylinder) + hub + bore indicator", status: "done" },
    { step: 4, action: "Generate geometry", detail: `${teeth} teeth profile, face width ${(faceWidth / MM).toFixed(0)}mm`, status: "done" },
  ];

  const parts: AssemblyPart[] = [];
  const bom: BOMEntry[] = [];

  // Gear outer body (cylinder representing outer diameter)
  parts.push(makePart({
    type: "cylinder", name: `Gear Body (${teeth}T)`,
    position: [0, faceWidth / 2, 0],
    dimensions: { width: outerR, height: faceWidth, depth: outerR },
    material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
  }));

  // Root circle (slightly smaller, darker to show teeth profile)
  parts.push(makePart({
    type: "cylinder", name: "Root Circle",
    position: [0, faceWidth / 2, 0],
    dimensions: { width: rootR, height: faceWidth * 1.01, depth: rootR },
    material: mat.name, color: "#555566", metalness: mat.metalness, roughness: mat.roughness,
  }));

  // Hub (thicker center section)
  const hubR = boreD * 1.5;
  const hubH = faceWidth * 1.2;
  parts.push(makePart({
    type: "cylinder", name: "Hub",
    position: [0, hubH / 2, 0],
    dimensions: { width: hubR, height: hubH, depth: hubR },
    material: mat.name, color: "#666677", metalness: mat.metalness, roughness: mat.roughness,
  }));

  // Bore hole indicator
  parts.push(makePart({
    type: "cylinder", name: "Bore",
    position: [0, hubH / 2, 0],
    dimensions: { width: boreD / 2, height: hubH * 1.05, depth: boreD / 2 },
    material: "Hole", color: "#0d1117", metalness: 0, roughness: 1,
  }));

  bom.push({ partName: `Spur Gear ${teeth}T`, quantity: 1, material: mat.name, dimensions: `OD${((outerR / MM) * 2).toFixed(0)}mm, ${(faceWidth / MM).toFixed(0)}mm face`, color: mat.color });
  bom.push({ partName: "Bore", quantity: 1, material: "-", dimensions: `D${(boreD / MM).toFixed(1)}mm`, color: "#0d1117" });

  return { parts, bom, reasoning };
}

function buildPipeTube(dims: ParsedDims, prompt: string): { parts: AssemblyPart[]; bom: BOMEntry[]; reasoning: ReasoningStep[] } {
  const od = (dims.diameter || 50) * MM;
  const wall = (dims.wallThickness || dims.thickness || 3) * MM;
  const id = od - wall * 2;
  const len = (dims.length || dims.height || 100) * MM;
  const mat = detectMaterial(prompt);

  const reasoning: ReasoningStep[] = [
    { step: 1, action: "Identify object", detail: `Pipe / Tube`, status: "done" },
    { step: 2, action: "Parse dimensions", detail: `OD ${(od / MM).toFixed(0)}mm, wall ${(wall / MM).toFixed(1)}mm, length ${(len / MM).toFixed(0)}mm`, status: "done" },
    { step: 3, action: "Decompose", detail: "Outer cylinder + inner bore", status: "done" },
    { step: 4, action: "Generate geometry", detail: `ID ${(id / MM).toFixed(0)}mm`, status: "done" },
  ];

  const parts: AssemblyPart[] = [];
  const bom: BOMEntry[] = [];

  // Outer cylinder
  parts.push(makePart({
    type: "cylinder", name: "Pipe Outer",
    position: [0, len / 2, 0],
    dimensions: { width: od / 2, height: len, depth: od / 2 },
    material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
  }));

  // Inner bore (dark cylinder to represent hollow)
  parts.push(makePart({
    type: "cylinder", name: "Pipe Bore",
    position: [0, len / 2, 0],
    dimensions: { width: id / 2, height: len * 1.01, depth: id / 2 },
    material: "Hole", color: "#0d1117", metalness: 0, roughness: 1,
  }));

  bom.push({ partName: "Pipe", quantity: 1, material: mat.name, dimensions: `OD${(od / MM).toFixed(0)} x ID${(id / MM).toFixed(0)} x L${(len / MM).toFixed(0)}mm`, color: mat.color });

  return { parts, bom, reasoning };
}

function buildPlateWithHoles(dims: ParsedDims, prompt: string): { parts: AssemblyPart[]; bom: BOMEntry[]; reasoning: ReasoningStep[] } {
  const L = (dims.length || 100) * MM;
  const W = (dims.width || dims.length || 100) * MM;
  const T = (dims.thickness || dims.height || 5) * MM;
  const holeCount = dims.holeCount || 4;
  const holeDia = (dims.holeDiameter || 8) * MM;
  const mat = detectMaterial(prompt);

  const reasoning: ReasoningStep[] = [
    { step: 1, action: "Identify object", detail: `Plate with ${holeCount} holes`, status: "done" },
    { step: 2, action: "Parse dimensions", detail: `${(L / MM).toFixed(0)}x${(W / MM).toFixed(0)}x${(T / MM).toFixed(0)}mm`, status: "done" },
    { step: 3, action: "Decompose", detail: `Base plate + ${holeCount} holes`, status: "done" },
    { step: 4, action: "Generate geometry", detail: `Hole dia ${(holeDia / MM).toFixed(1)}mm`, status: "done" },
  ];

  const parts: AssemblyPart[] = [];
  const bom: BOMEntry[] = [];

  // Base plate
  parts.push(makePart({
    type: "box", name: "Plate",
    position: [0, T / 2, 0],
    dimensions: { width: L, height: T, depth: W },
    material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
  }));
  bom.push({ partName: "Base Plate", quantity: 1, material: mat.name, dimensions: `${(L / MM).toFixed(0)}x${(W / MM).toFixed(0)}x${(T / MM).toFixed(0)}mm`, color: mat.color });

  // Holes arranged in grid pattern
  const cols = Math.ceil(Math.sqrt(holeCount));
  const rows = Math.ceil(holeCount / cols);
  const margin = L * 0.15;
  const spacingX = cols > 1 ? (L - margin * 2) / (cols - 1) : 0;
  const spacingZ = rows > 1 ? (W - margin * 2) / (rows - 1) : 0;

  let placed = 0;
  for (let r = 0; r < rows && placed < holeCount; r++) {
    for (let c = 0; c < cols && placed < holeCount; c++) {
      const x = cols > 1 ? -L / 2 + margin + c * spacingX : 0;
      const z = rows > 1 ? -W / 2 + margin + r * spacingZ : 0;
      parts.push(makePart({
        type: "cylinder", name: `Hole ${placed + 1}`,
        position: [x, T / 2, z],
        dimensions: { width: holeDia / 2, height: T * 1.1, depth: holeDia / 2 },
        material: "Hole", color: "#0d1117", metalness: 0, roughness: 1,
      }));
      placed++;
    }
  }
  bom.push({ partName: `Hole M${(holeDia / MM).toFixed(0)}`, quantity: holeCount, material: "-", dimensions: `D${(holeDia / MM).toFixed(1)}mm`, color: "#0d1117" });

  return { parts, bom, reasoning };
}

function buildConePart(dims: ParsedDims, prompt: string): { parts: AssemblyPart[]; bom: BOMEntry[]; reasoning: ReasoningStep[] } {
  const r = (dims.radius || (dims.diameter ? dims.diameter / 2 : 25)) * MM;
  const h = (dims.height || dims.length || 50) * MM;
  const mat = detectMaterial(prompt);

  const reasoning: ReasoningStep[] = [
    { step: 1, action: "Identify object", detail: `Cone`, status: "done" },
    { step: 2, action: "Parse dimensions", detail: `Base radius ${(r / MM).toFixed(0)}mm, height ${(h / MM).toFixed(0)}mm`, status: "done" },
    { step: 3, action: "Generate geometry", detail: "Single cone primitive", status: "done" },
  ];

  const parts: AssemblyPart[] = [
    makePart({
      type: "cone", name: "Cone",
      position: [0, h / 2, 0],
      dimensions: { width: r, height: h, depth: r },
      material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
    }),
  ];
  const bom: BOMEntry[] = [
    { partName: "Cone", quantity: 1, material: mat.name, dimensions: `R${(r / MM).toFixed(0)}mm x H${(h / MM).toFixed(0)}mm`, color: mat.color },
  ];

  return { parts, bom, reasoning };
}

function buildSpherePart(dims: ParsedDims, prompt: string): { parts: AssemblyPart[]; bom: BOMEntry[]; reasoning: ReasoningStep[] } {
  const r = (dims.radius || (dims.diameter ? dims.diameter / 2 : 25)) * MM;
  const mat = detectMaterial(prompt);

  const reasoning: ReasoningStep[] = [
    { step: 1, action: "Identify object", detail: `Sphere`, status: "done" },
    { step: 2, action: "Parse dimensions", detail: `Radius ${(r / MM).toFixed(0)}mm`, status: "done" },
    { step: 3, action: "Generate geometry", detail: "Single sphere primitive", status: "done" },
  ];

  const parts: AssemblyPart[] = [
    makePart({
      type: "sphere", name: "Sphere",
      position: [0, r, 0],
      dimensions: { width: r, height: r, depth: r },
      material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
    }),
  ];
  const bom: BOMEntry[] = [
    { partName: "Sphere", quantity: 1, material: mat.name, dimensions: `R${(r / MM).toFixed(0)}mm`, color: mat.color },
  ];

  return { parts, bom, reasoning };
}

function buildCylinderPart(dims: ParsedDims, prompt: string): { parts: AssemblyPart[]; bom: BOMEntry[]; reasoning: ReasoningStep[] } {
  const dia = (dims.diameter || dims.width || 20) * MM;
  const h = (dims.height || dims.length || dia * 2 / MM) * MM;
  const mat = detectMaterial(prompt);

  const reasoning: ReasoningStep[] = [
    { step: 1, action: "Identify object", detail: `Cylinder / Rod / Shaft`, status: "done" },
    { step: 2, action: "Parse dimensions", detail: `Diameter ${(dia / MM).toFixed(0)}mm, height ${(h / MM).toFixed(0)}mm`, status: "done" },
    { step: 3, action: "Generate geometry", detail: "Single cylinder primitive", status: "done" },
  ];

  const parts: AssemblyPart[] = [
    makePart({
      type: "cylinder", name: prompt.slice(0, 40),
      position: [0, h / 2, 0],
      dimensions: { width: dia / 2, height: h, depth: dia / 2 },
      material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
    }),
  ];
  const bom: BOMEntry[] = [
    { partName: prompt.slice(0, 40), quantity: 1, material: mat.name, dimensions: `D${(dia / MM).toFixed(0)}mm x H${(h / MM).toFixed(0)}mm`, color: mat.color },
  ];

  return { parts, bom, reasoning };
}

function buildBoxPart(dims: ParsedDims, prompt: string): { parts: AssemblyPart[]; bom: BOMEntry[]; reasoning: ReasoningStep[] } {
  const w = (dims.length || dims.width || 50) * MM;
  const h = (dims.height || 50) * MM;
  const d = (dims.width || dims.length || 50) * MM;
  const mat = detectMaterial(prompt);

  const reasoning: ReasoningStep[] = [
    { step: 1, action: "Identify object", detail: `Box / Cube / Block`, status: "done" },
    { step: 2, action: "Parse dimensions", detail: `${(w / MM).toFixed(0)}x${(h / MM).toFixed(0)}x${(d / MM).toFixed(0)}mm`, status: "done" },
    { step: 3, action: "Generate geometry", detail: "Single box primitive", status: "done" },
  ];

  const parts: AssemblyPart[] = [
    makePart({
      type: "box", name: prompt.slice(0, 40),
      position: [0, h / 2, 0],
      dimensions: { width: w, height: h, depth: d },
      material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
    }),
  ];
  const bom: BOMEntry[] = [
    { partName: prompt.slice(0, 40), quantity: 1, material: mat.name, dimensions: `${(w / MM).toFixed(0)}x${(h / MM).toFixed(0)}x${(d / MM).toFixed(0)}mm`, color: mat.color },
  ];

  return { parts, bom, reasoning };
}

function buildGenericPart(dims: ParsedDims, prompt: string): { parts: AssemblyPart[]; bom: BOMEntry[]; reasoning: ReasoningStep[] } {
  const mat = detectMaterial(prompt);
  const t = prompt.toLowerCase();
  let pType: "box" | "cylinder" | "sphere" | "cone" = "box";
  if (t.includes("cylinder") || t.includes("rod") || t.includes("shaft") || t.includes("tube") || t.includes("pipe")) pType = "cylinder";
  else if (t.includes("sphere") || t.includes("ball")) pType = "sphere";
  else if (t.includes("cone") || t.includes("taper")) pType = "cone";

  const w = (dims.length || dims.diameter || 50) * MM;
  const h = (dims.height || dims.length || 50) * MM;
  const d = (dims.width || dims.diameter || 50) * MM;

  const reasoning: ReasoningStep[] = [
    { step: 1, action: "Identify object", detail: `Generic ${pType} part`, status: "done" },
    { step: 2, action: "Parse dimensions", detail: `${(w / MM).toFixed(0)}x${(h / MM).toFixed(0)}x${(d / MM).toFixed(0)}mm`, status: "done" },
    { step: 3, action: "Generate geometry", detail: `Single ${pType} with ${mat.name}`, status: "done" },
  ];

  const dimObj = pType === "cylinder" || pType === "sphere" || pType === "cone"
    ? { width: w / 2, height: h, depth: d / 2 }
    : { width: w, height: h, depth: d };

  const parts: AssemblyPart[] = [
    makePart({
      type: pType, name: prompt.slice(0, 40),
      position: [0, h / 2, 0],
      dimensions: dimObj,
      material: mat.name, color: mat.color, metalness: mat.metalness, roughness: mat.roughness,
    }),
  ];

  const bom: BOMEntry[] = [
    { partName: prompt.slice(0, 40), quantity: 1, material: mat.name, dimensions: `${(w / MM).toFixed(0)}x${(h / MM).toFixed(0)}x${(d / MM).toFixed(0)}mm`, color: mat.color },
  ];

  return { parts, bom, reasoning };
}

// ─── KCL Code Generator ──────────────────────────────────────────────────

function generateAssemblyKCL(result: { parts: AssemblyPart[]; bom: BOMEntry[] }, objectType: string): string {
  const lines: string[] = [
    `// ShilpaSutra KCL - ${objectType}`,
    `// Auto-generated multi-part assembly`,
    `// Parts: ${result.parts.length}`,
    ``,
  ];

  for (const part of result.parts) {
    const safeName = part.name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
    lines.push(`// --- ${part.name} ---`);
    if (part.type === "box") {
      lines.push(`sketch_${safeName} = startSketch('XZ')`);
      lines.push(`rect_${safeName} = rectangle([${(-part.dimensions.width / 2).toFixed(3)}, ${(-part.dimensions.depth / 2).toFixed(3)}], [${(part.dimensions.width / 2).toFixed(3)}, ${(part.dimensions.depth / 2).toFixed(3)}])`);
      lines.push(`profile_${safeName} = close(rect_${safeName})`);
      lines.push(`${safeName} = extrude(profile_${safeName}, ${part.dimensions.height.toFixed(3)})`);
      lines.push(`translate(${safeName}, [${part.position.map(p => p.toFixed(3)).join(", ")}])`);
    } else if (part.type === "cylinder") {
      lines.push(`sketch_${safeName} = startSketch('XZ')`);
      lines.push(`circ_${safeName} = circle([0, 0], ${part.dimensions.width.toFixed(3)})`);
      lines.push(`profile_${safeName} = close(circ_${safeName})`);
      lines.push(`${safeName} = extrude(profile_${safeName}, ${part.dimensions.height.toFixed(3)})`);
      lines.push(`translate(${safeName}, [${part.position.map(p => p.toFixed(3)).join(", ")}])`);
    }
    lines.push(``);
  }

  lines.push(`// BOM:`);
  for (const b of result.bom) {
    lines.push(`// ${b.quantity}x ${b.partName} (${b.material}) - ${b.dimensions}`);
  }
  lines.push(``);
  lines.push(`export(assembly)`);
  return lines.join("\n");
}

// ─── Main Reasoning Entry Point ──────────────────────────────────────────

export function runReasoningEngine(prompt: string): ReasoningResult {
  const domain = detectDomain(prompt);
  const dims = parseDimensionsAdvanced(prompt);

  let result: { parts: AssemblyPart[]; bom: BOMEntry[]; reasoning: ReasoningStep[] };

  switch (domain) {
    case "solar_pv_module":
      result = buildSolarPVModule(dims, prompt);
      break;
    case "hex_bolt_assembly":
      result = buildHexBoltAssembly(dims, prompt);
      break;
    case "l_bracket":
      result = buildLBracket(dims, prompt);
      break;
    case "heat_sink":
      result = buildHeatSink(dims, prompt);
      break;
    case "electronics_enclosure":
    case "pcb_enclosure":
      result = buildElectronicsEnclosure(dims, prompt);
      break;
    case "dumbbell":
      result = buildDumbbell(dims, prompt);
      break;
    case "gear":
      result = buildGear(dims, prompt);
      break;
    case "pipe_tube":
    case "pipe_fitting":
    case "pipe_flange":
      result = buildPipeTube(dims, prompt);
      break;
    case "plate_with_holes":
      result = buildPlateWithHoles(dims, prompt);
      break;
    case "cone_part":
      result = buildConePart(dims, prompt);
      break;
    case "sphere_part":
      result = buildSpherePart(dims, prompt);
      break;
    case "cylinder_part":
      result = buildCylinderPart(dims, prompt);
      break;
    case "box_part":
      result = buildBoxPart(dims, prompt);
      break;
    default:
      result = buildGenericPart(dims, prompt);
      break;
  }

  const objectType = domain.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const kclCode = generateAssemblyKCL(result, objectType);

  return {
    objectType,
    reasoning: result.reasoning,
    parts: result.parts,
    bom: result.bom,
    kclCode,
    summary: `Generated ${objectType} with ${result.parts.length} parts. ${result.bom.map(b => `${b.quantity}x ${b.partName}`).join(", ")}.`,
  };
}
