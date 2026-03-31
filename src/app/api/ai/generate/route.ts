import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  runReasoningEngine,
  type ReasoningStep,
  type BOMEntry,
  type AssemblyPart,
} from "@/lib/ai-reasoning-engine";

// ─── Type Definitions ────────────────────────────────────────────────

interface CADOperation {
  op: 'primitive' | 'extrude' | 'revolve' | 'fillet' | 'chamfer' | 'boolean' | 'pattern' | 'shell';
  params: Record<string, number | string | boolean>;
  children?: CADOperation[];
}

interface GeneratedObject {
  type: "box" | "cylinder" | "sphere" | "cone";
  name: string;
  dimensions: { width: number; height: number; depth: number };
  description: string;
}

interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface GenerateRequest {
  prompt: string;
  messages?: ConversationMessage[];
  conversationId?: string;
  useReasoning?: boolean;
  thinkingMode?: "Normal" | "Extended" | "Deep";
  imageBase64?: string; // base64 data URI for multimodal
  context?: {
    tool?: string;
    selectedObject?: { name: string; type: string } | null;
    sceneObjectCount?: number;
  };
}

interface GenerateResponse {
  success: boolean;
  object: GeneratedObject;
  operations?: CADOperation[];
  kclCode?: string;
  message: string;
  source: "ai" | "parametric" | "reasoning";
  conversationId?: string;
  fallback?: boolean;
  // Reasoning engine fields
  reasoning?: ReasoningStep[];
  assemblyParts?: AssemblyPart[];
  bom?: BOMEntry[];
  isAssembly?: boolean;
  simulationIntent?: any;
}

// ─── Dimension Parsing ───────────────────────────────────────────────

interface ParsedDimensions {
  width?: number;
  height?: number;
  depth?: number;
  diameter?: number;
  radius?: number;
  length?: number;
  thickness?: number;
  wallThickness?: number;
  pitch?: number;
}

function parseDimensions(prompt: string): ParsedDimensions {
  const lower = prompt.toLowerCase();
  const dims: ParsedDimensions = {};

  // ── Unit conversion: value + unit string → millimeters ──
  const UNIT_TO_MM: Record<string, number> = {
    mm: 1, millimeter: 1, millimeters: 1, millimetre: 1, millimetres: 1,
    cm: 10, centimeter: 10, centimeters: 10, centimetre: 10, centimetres: 10,
    m: 1000, meter: 1000, meters: 1000, metre: 1000, metres: 1000,
    in: 25.4, inch: 25.4, inches: 25.4,
    ft: 304.8, foot: 304.8, feet: 304.8,
  };

  // Regex fragment matching supported unit tokens
  const U = "(?:mm|cm|millimeters?|millimetres?|centimeters?|centimetres?|meters?|metres?|m(?!m|e)|inch(?:es)?|in|feet|foot|ft)";

  function toMM(value: number, unit: string | undefined): number {
    if (!unit) return value; // no unit → assume mm
    const key = unit.toLowerCase().replace(/\s/g, "");
    return value * (UNIT_TO_MM[key] ?? 1);
  }

  // Helper: extract number+unit from a regex match (groups 1=value, 2=unit)
  function parseWithUnit(match: RegExpMatchArray | null): number | null {
    if (!match) return null;
    const val = parseFloat(match[1]);
    const unit = match[2] || "mm";
    return toMM(val, unit);
  }

  // "2m x 1m x 35mm" - mixed unit triple
  const mixedTripleRe = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${U})\\s*x\\s*(\\d+(?:\\.\\d+)?)\\s*(${U})\\s*x\\s*(\\d+(?:\\.\\d+)?)\\s*(${U})`);
  const mixedTriple = lower.match(mixedTripleRe);
  if (mixedTriple) {
    dims.width = toMM(parseFloat(mixedTriple[1]), mixedTriple[2]);
    dims.height = toMM(parseFloat(mixedTriple[3]), mixedTriple[4]);
    dims.depth = toMM(parseFloat(mixedTriple[5]), mixedTriple[6]);
    return dims;
  }

  // "100x50x30mm" or "100 x 50 x 30 mm"
  const wxhxd = lower.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*x\\s*(\\d+(?:\\.\\d+)?)\\s*x\\s*(\\d+(?:\\.\\d+)?)\\s*(${U})?`));
  if (wxhxd) {
    const unit = wxhxd[4];
    dims.width = toMM(parseFloat(wxhxd[1]), unit);
    dims.height = toMM(parseFloat(wxhxd[2]), unit);
    dims.depth = toMM(parseFloat(wxhxd[3]), unit);
  }

  // "100x50mm" (2D)
  if (!wxhxd) {
    const wxh = lower.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*x\\s*(\\d+(?:\\.\\d+)?)\\s*(${U})?`));
    if (wxh) {
      const unit = wxh[3];
      dims.width = toMM(parseFloat(wxh[1]), unit);
      dims.height = toMM(parseFloat(wxh[2]), unit);
    }
  }

  // "D50 H100" or "d50 h100"
  const dMatch = lower.match(/d\s*(\d+(?:\.\d+)?)/);
  if (dMatch) dims.diameter = parseFloat(dMatch[1]);

  const hMatch = lower.match(/(?:^|[\s,])h\s*(\d+(?:\.\d+)?)/);
  if (hMatch) dims.height = parseFloat(hMatch[1]);

  // "M8x1.25" thread spec
  const threadMatch = lower.match(/m(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
  if (threadMatch) {
    dims.diameter = parseFloat(threadMatch[1]);
    dims.pitch = parseFloat(threadMatch[2]);
  }

  // "3 inch" or "3in" or '3"'
  const inchMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:inch|inches|in|")/);
  if (inchMatch) {
    const mm = parseFloat(inchMatch[1]) * 25.4;
    if (!dims.width) dims.width = mm;
    if (!dims.diameter) dims.diameter = mm;
  }

  // "radius 25mm" or "r25"
  const radiusMatch = lower.match(new RegExp(`(?:radius|r)\\s*(\\d+(?:\\.\\d+)?)\\s*(${U})?`));
  if (radiusMatch) dims.radius = parseWithUnit(radiusMatch) ?? undefined;

  // "length 2 meter" or "length 100mm" or "2 meter long" or "100mm long"
  const lenMatch = lower.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${U})\\s*long`)) ||
                   lower.match(new RegExp(`length\\s*(\\d+(?:\\.\\d+)?)\\s*(${U})?`));
  if (lenMatch) dims.length = parseWithUnit(lenMatch) ?? undefined;

  // "width 1 meter" or "width 100mm" or "1 meter wide" or "100mm wide"
  const widthMatch = lower.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${U})\\s*wide`)) ||
                     lower.match(new RegExp(`width\\s*(\\d+(?:\\.\\d+)?)\\s*(${U})?`));
  if (widthMatch) dims.width = parseWithUnit(widthMatch) ?? undefined;

  // "height 50mm" or "height 2m" or "50mm tall"
  const heightMatch = lower.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${U})\\s*tall`)) ||
                      lower.match(new RegExp(`height\\s*(\\d+(?:\\.\\d+)?)\\s*(${U})?`));
  if (heightMatch) dims.height = parseWithUnit(heightMatch) ?? undefined;

  // "thickness 3mm" or "3mm thick" or "thickness 2m"
  const thickMatch = lower.match(new RegExp(`(?:thickness|thick)\\s*(\\d+(?:\\.\\d+)?)\\s*(${U})?`)) ||
                     lower.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${U})?\\s*thick`));
  if (thickMatch) dims.thickness = parseWithUnit(thickMatch) ?? undefined;

  // "wall 2mm" or "wall thickness 2mm"
  const wallMatch = lower.match(new RegExp(`wall\\s*(?:thickness)?\\s*(\\d+(?:\\.\\d+)?)\\s*(${U})?`));
  if (wallMatch) dims.wallThickness = parseWithUnit(wallMatch) ?? undefined;

  // Generic "NNmm" (first occurrence if no other dims found)
  if (!dims.width && !dims.diameter && !dims.radius) {
    const genericMm = lower.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${U})`));
    if (genericMm) dims.width = parseWithUnit(genericMm) ?? undefined;
  }

  return dims;
}

// ─── KCL Code Generation ────────────────────────────────────────────

function generateKCLCode(object: GeneratedObject, operations: CADOperation[]): string {
  const lines: string[] = [
    `// ShilpaSutra KCL - ${object.name}`,
    `// Auto-generated parametric code`,
    ``,
  ];

  for (const op of operations) {
    switch (op.op) {
      case 'primitive': {
        const p = op.params;
        switch (p.shape) {
          case 'box':
            lines.push(`sketch = startSketch('XZ')`);
            lines.push(`rect = rectangle([${-Number(p.width) / 2}, ${-Number(p.depth) / 2}], [${Number(p.width) / 2}, ${Number(p.depth) / 2}])`);
            lines.push(`profile = close(rect)`);
            lines.push(`body = extrude(profile, ${p.height})`);
            break;
          case 'cylinder':
            lines.push(`sketch = startSketch('XZ')`);
            lines.push(`circ = circle([0, 0], ${p.radius})`);
            lines.push(`profile = close(circ)`);
            lines.push(`body = extrude(profile, ${p.height})`);
            break;
          case 'sphere':
            lines.push(`sketch = startSketch('XZ')`);
            lines.push(`arc = semicircle([0, ${-Number(p.radius)}], [0, ${p.radius}])`);
            lines.push(`profile = close(arc)`);
            lines.push(`body = revolve(profile, axis='Y', angle=360)`);
            break;
          case 'cone':
            lines.push(`sketch = startSketch('XZ')`);
            lines.push(`tri = polygon([[0, 0], [${p.radius}, 0], [0, ${p.height}]])`);
            lines.push(`profile = close(tri)`);
            lines.push(`body = revolve(profile, axis='Y', angle=360)`);
            break;
        }
        break;
      }
      case 'extrude':
        lines.push(`body = extrude(profile, ${op.params.height})`);
        break;
      case 'revolve':
        lines.push(`body = revolve(profile, axis='${op.params.axis || 'Y'}', angle=${op.params.angle || 360})`);
        break;
      case 'fillet':
        lines.push(`fillet(body, edges='${op.params.edges || 'all'}', radius=${op.params.radius})`);
        break;
      case 'chamfer':
        lines.push(`chamfer(body, edges='${op.params.edges || 'all'}', distance=${op.params.distance})`);
        break;
      case 'shell':
        lines.push(`shell(body, thickness=${op.params.thickness}, removeFace='${op.params.removeFace || 'top'}')`);
        break;
      case 'boolean':
        lines.push(`body = boolean('${op.params.operation}', body, tool)`);
        break;
      case 'pattern': {
        const pType = op.params.type === 'circular' ? 'circularPattern' : 'linearPattern';
        lines.push(`body = ${pType}(body, count=${op.params.count}, spacing=${op.params.spacing || op.params.angle || 0})`);
        break;
      }
    }
  }

  lines.push(``);
  lines.push(`export(body)`);
  return lines.join('\n');
}

// ─── Operation Tree Builders ─────────────────────────────────────────

function buildOperations(object: GeneratedObject, prompt: string): CADOperation[] {
  const lower = prompt.toLowerCase();
  const ops: CADOperation[] = [];

  // Primary shape primitive
  const w = object.dimensions.width * 10;
  const h = object.dimensions.height * 10;
  const d = object.dimensions.depth * 10;

  switch (object.type) {
    case 'box':
      ops.push({
        op: 'primitive',
        params: { shape: 'box', width: w, height: h, depth: d },
      });
      break;
    case 'cylinder':
      ops.push({
        op: 'primitive',
        params: { shape: 'cylinder', radius: w, height: h },
      });
      break;
    case 'sphere':
      ops.push({
        op: 'primitive',
        params: { shape: 'sphere', radius: w },
      });
      break;
    case 'cone':
      ops.push({
        op: 'primitive',
        params: { shape: 'cone', radius: w, height: h },
      });
      break;
  }

  // Detect additional operations from prompt
  const filletMatch = lower.match(/fillet\s*(?:radius)?\s*(\d+(?:\.\d+)?)/);
  if (filletMatch || lower.includes('fillet') || lower.includes('rounded')) {
    const r = filletMatch ? parseFloat(filletMatch[1]) : 2;
    ops.push({ op: 'fillet', params: { radius: r, edges: 'all_vertical' } });
  }

  const chamferMatch = lower.match(/chamfer\s*(\d+(?:\.\d+)?)/);
  if (chamferMatch || lower.includes('chamfer') || lower.includes('beveled')) {
    const dist = chamferMatch ? parseFloat(chamferMatch[1]) : 1;
    ops.push({ op: 'chamfer', params: { distance: dist, edges: 'all' } });
  }

  if (lower.includes('shell') || lower.includes('hollow') || lower.includes('wall thickness')) {
    const wallMatch = lower.match(/(?:wall\s*(?:thickness)?|shell)\s*(\d+(?:\.\d+)?)/);
    const thickness = wallMatch ? parseFloat(wallMatch[1]) : 2;
    ops.push({ op: 'shell', params: { thickness, removeFace: 'top' } });
  }

  if (lower.includes('pattern') || lower.includes('array')) {
    const countMatch = lower.match(/(\d+)\s*(?:copies|instances|pattern|array)/);
    const count = countMatch ? parseInt(countMatch[1]) : 4;
    if (lower.includes('circular') || lower.includes('radial')) {
      ops.push({ op: 'pattern', params: { type: 'circular', count, angle: 360 / count } });
    } else {
      ops.push({ op: 'pattern', params: { type: 'linear', count, spacing: 20 } });
    }
  }

  return ops;
}

// ─── Enhanced Parametric Generators ──────────────────────────────────

function generateFromPrompt(prompt: string): GeneratedObject {
  const lower = prompt.toLowerCase();
  const dims = parseDimensions(prompt);

  // Dumbbell / Barbell
  if (lower.includes("dumbbell") || lower.includes("barbell")) {
    const diaM = lower.match(/(\d+(?:\.\d+)?)\s*mm\s*(?:dia|diameter)/);
    const sphereD = diaM ? parseFloat(diaM[1]) : (dims.diameter || dims.width || 20);
    const lenM = lower.match(/(\d+(?:\.\d+)?)\s*mm\s*(?:bar|long|length)/);
    const barLen = lenM ? parseFloat(lenM[1]) : (dims.height || dims.length || sphereD * 5);
    const barD = sphereD * 0.25;
    return {
      type: "cylinder",
      name: "Dumbbell",
      dimensions: { width: barD / 20, height: barLen / 10, depth: barD / 20 },
      description: `Dumbbell: bar D${barD.toFixed(1)}mm x L${barLen}mm, weights D${sphereD}mm. Full assembly has 3 parts.`,
    };
  }

  // Enclosure (box with wall thickness)
  if (lower.includes("enclosure") || lower.includes("case") || lower.includes("housing") && !lower.includes("bearing")) {
    const w = (dims.width || 100) / 10;
    const h = (dims.height || 60) / 10;
    const d = (dims.depth || 40) / 10;
    const wall = dims.wallThickness || 2;
    return {
      type: "box",
      name: "Enclosure",
      dimensions: { width: w, height: h, depth: d },
      description: `Enclosure ${w * 10}x${h * 10}x${d * 10}mm, wall thickness ${wall}mm. Shell operation applied.`,
    };
  }

  // Pulley / Wheel
  if (lower.includes("pulley") || lower.includes("wheel") || lower.includes("sheave")) {
    const od = dims.diameter || 60;
    const bore = dims.radius ? dims.radius * 2 : 10;
    const width = dims.thickness || 15;
    return {
      type: "cylinder",
      name: `Pulley OD${od}`,
      dimensions: { width: od / 20, height: width / 10, depth: od / 20 },
      description: `Pulley, OD ${od}mm, bore ${bore}mm, width ${width}mm. V-groove profile.`,
    };
  }

  // Spring
  if (lower.includes("spring") || lower.includes("coil")) {
    const od = dims.diameter || 20;
    const wireD = dims.thickness || 2;
    const freeLen = dims.length || dims.height || 50;
    const coils = Math.round(freeLen / (wireD * 2));
    return {
      type: "cylinder",
      name: `Compression Spring`,
      dimensions: { width: od / 20, height: freeLen / 10, depth: od / 20 },
      description: `Compression spring, OD ${od}mm, wire ${wireD}mm, free length ${freeLen}mm, ${coils} active coils.`,
    };
  }

  // Pipe / Tube
  if (lower.includes("pipe") || lower.includes("tube")) {
    const od = dims.diameter || 50;
    const wall = dims.wallThickness || dims.thickness || 3;
    const len = dims.length || dims.height || 100;
    return {
      type: "cylinder",
      name: `Pipe OD${od}`,
      dimensions: { width: od / 20, height: len / 10, depth: od / 20 },
      description: `Pipe OD ${od}mm, wall ${wall}mm, ID ${od - wall * 2}mm, length ${len}mm.`,
    };
  }

  // Motor mount
  if (lower.includes("motor mount") || lower.includes("motor bracket") || lower.includes("nema")) {
    const nemaMatch = lower.match(/nema\s*(\d+)/i);
    const nemaSize = nemaMatch ? parseInt(nemaMatch[1]) : 23;
    const boltCircle = nemaSize === 17 ? 31 : nemaSize === 23 ? 47.14 : nemaSize === 34 ? 69.6 : 47.14;
    const faceW = nemaSize === 17 ? 42.3 : nemaSize === 23 ? 57.2 : nemaSize === 34 ? 86.3 : 57.2;
    return {
      type: "box",
      name: `NEMA ${nemaSize} Motor Mount`,
      dimensions: { width: faceW / 10, height: 0.5, depth: faceW / 10 },
      description: `NEMA ${nemaSize} motor mount plate. Face ${faceW}mm, bolt circle ${boltCircle.toFixed(1)}mm, 4x mounting holes.`,
    };
  }

  // Phone case
  if (lower.includes("phone case") || lower.includes("phone cover") || lower.includes("iphone") || lower.includes("smartphone")) {
    const w = dims.width || 75;
    const h = dims.height || 150;
    const d = dims.depth || 10;
    return {
      type: "box",
      name: "Phone Case",
      dimensions: { width: w / 10, height: h / 10, depth: d / 10 },
      description: `Phone case ${w}x${h}x${d}mm with rounded corners and camera cutout.`,
    };
  }

  // Generic prismatic profile / extrusion
  if (lower.includes("extrusion") || lower.includes("profile") || lower.includes("t-slot") || lower.includes("alumin")) {
    const size = dims.width || 20;
    const len = dims.length || dims.height || 200;
    return {
      type: "box",
      name: `Extrusion Profile ${size}x${size}`,
      dimensions: { width: size / 10, height: len / 10, depth: size / 10 },
      description: `${size}x${size}mm aluminium extrusion profile, length ${len}mm. T-slot compatible.`,
    };
  }

  // ─── Original generators (enhanced with dimension parsing) ─────────

  if (lower.includes("gear") || lower.includes("spur")) {
    const teeth = parseInt(lower.match(/(\d+)\s*teeth/)?.[1] || "20");
    const radius = (teeth * 2) / (2 * Math.PI);
    return {
      type: "cylinder",
      name: `Spur Gear ${teeth}T`,
      dimensions: { width: Math.max(0.8, radius / 10), height: 0.5, depth: Math.max(0.8, radius / 10) },
      description: `Spur gear with ${teeth} teeth, module ~2mm, face width 10mm.`,
    };
  }

  if (lower.includes("bracket") || lower.includes("mount")) {
    const thickness = (dims.thickness || 3) / 10;
    const w = (dims.width || 20) / 10;
    const h = (dims.height || 20) / 10;
    return {
      type: "box",
      name: "L-Bracket",
      dimensions: { width: w, height: h, depth: Math.max(0.3, thickness) },
      description: `L-bracket ${w * 10}x${h * 10}mm, thickness ${thickness * 10}mm. Add fillets and holes as needed.`,
    };
  }

  if (lower.includes("bolt") || lower.includes("hex") || lower.includes("screw")) {
    const size = dims.diameter || 8;
    const length = dims.length || dims.height || 30;
    const pitch = dims.pitch || (size <= 6 ? 1 : size <= 10 ? 1.25 : 1.75);
    return {
      type: "cylinder",
      name: `Hex Bolt M${size}x${length}`,
      dimensions: { width: size / 20, height: length / 10, depth: size / 20 },
      description: `M${size}x${length} hex bolt, pitch ${pitch}mm. Head: ${(size * 0.65).toFixed(1)}mm, AF: ${(size * 1.7).toFixed(1)}mm.`,
    };
  }

  if (lower.includes("flange")) {
    const dnMatch = lower.match(/dn(\d+)/i);
    const dn = dnMatch ? parseInt(dnMatch[1]) : (dims.diameter || 50);
    return {
      type: "cylinder",
      name: `Pipe Flange DN${dn}`,
      dimensions: { width: dn / 20, height: 0.4, depth: dn / 20 },
      description: `DN${dn} pipe flange. OD: ${(dn * 1.5).toFixed(0)}mm, bore: ${dn}mm.`,
    };
  }

  if (lower.includes("heat") || lower.includes("sink") || lower.includes("fin")) {
    const fins = parseInt(lower.match(/(\d+)\s*fin/)?.[1] || "8");
    const w = (dims.width || 50) / 10;
    const d = (dims.depth || 50) / 10;
    return {
      type: "box",
      name: `Heatsink ${fins}-fin`,
      dimensions: { width: w, height: 1.5, depth: d },
      description: `Heatsink with ${fins} fins, base ${w * 10}x${d * 10}x3mm, fin height 25mm.`,
    };
  }

  if (lower.includes("box") || lower.includes("cube") || lower.includes("block")) {
    const size = (dims.width || 20) / 10;
    const h = dims.height ? dims.height / 10 : size;
    const d = dims.depth ? dims.depth / 10 : size;
    return {
      type: "box",
      name: "Box",
      dimensions: { width: size, height: h, depth: d },
      description: `Box ${size * 10}x${h * 10}x${d * 10}mm.`,
    };
  }

  if (lower.includes("sphere") || lower.includes("ball")) {
    const r = (dims.radius || dims.diameter ? (dims.diameter || 30) / 2 : dims.width || 15) / 10;
    return {
      type: "sphere",
      name: "Sphere",
      dimensions: { width: r, height: r, depth: r },
      description: `Sphere, radius ${r * 10}mm.`,
    };
  }

  if (lower.includes("cylinder") || lower.includes("rod") || lower.includes("shaft")) {
    const dia = dims.diameter || dims.width || 20;
    const h = dims.height || dims.length || dia * 2;
    return {
      type: "cylinder",
      name: "Cylinder",
      dimensions: { width: dia / 20, height: h / 10, depth: dia / 20 },
      description: `Cylinder, diameter ${dia}mm, height ${h}mm.`,
    };
  }

  if (lower.includes("cone") || lower.includes("taper")) {
    const r = (dims.radius || dims.diameter ? (dims.diameter || 20) / 2 : 10) / 10;
    const h = (dims.height || 20) / 10;
    return {
      type: "cone",
      name: "Cone",
      dimensions: { width: r, height: h, depth: r },
      description: `Cone, base radius ${r * 10}mm, height ${h * 10}mm.`,
    };
  }

  if (lower.includes("plate") || lower.includes("panel") || lower.includes("sheet")) {
    const w = (dims.width || 30) / 10;
    const d = (dims.depth || dims.width || 30) / 10;
    const t = (dims.thickness || 2) / 10;
    return {
      type: "box",
      name: "Plate",
      dimensions: { width: w, height: t, depth: d },
      description: `Flat plate ${w * 10}x${d * 10}x${t * 10}mm.`,
    };
  }

  if (lower.includes("bearing")) {
    const bore = dims.diameter || 25;
    return {
      type: "cylinder",
      name: `Bearing Housing ${bore}mm`,
      dimensions: { width: bore / 10, height: bore / 15, depth: bore / 10 },
      description: `Bearing housing for ${bore}mm bore.`,
    };
  }

  // Default
  return {
    type: "box",
    name: "Generated Part",
    dimensions: { width: 2, height: 2, depth: 2 },
    description: "Generated a basic part. Modify dimensions in the properties panel.",
  };
}

// ─── AI System Prompt ────────────────────────────────────────────────

const CAD_SYSTEM_PROMPT = `You are ShilpaSutra's CAD geometry generation engine. You translate natural language descriptions of 3D parts into structured CAD data.

CAPABILITIES:
- Primitive shapes: box, cylinder, sphere, cone
- Feature operations: extrude, revolve, fillet, chamfer, boolean (union/subtract/intersect), shell, pattern (linear/circular)
- Parametric dimensions: all measurements in mm
- Design intent: infer appropriate tolerances, wall thicknesses, and structural features

RESPONSE FORMAT:
Respond with ONLY a JSON object (no markdown, no explanation). The JSON must contain:

{
  "object": {
    "type": "box" | "cylinder" | "sphere" | "cone",
    "name": "descriptive name",
    "dimensions": { "width": number, "height": number, "depth": number },
    "description": "brief engineering description"
  },
  "operations": [
    {
      "op": "primitive" | "extrude" | "revolve" | "fillet" | "chamfer" | "boolean" | "pattern" | "shell",
      "params": { ... },
      "children": []
    }
  ],
  "kclCode": "// KCL parametric code string"
}

OPERATION PARAM SCHEMAS:
- primitive: { shape: "box"|"cylinder"|"sphere"|"cone", width?, height?, depth?, radius? }
- extrude: { height: number, direction?: "normal"|"+X"|"-X"|"+Y"|"-Y"|"+Z"|"-Z" }
- revolve: { axis: "X"|"Y"|"Z", angle: number (degrees) }
- fillet: { radius: number, edges: "all"|"all_vertical"|"all_horizontal"|"top"|"bottom"|"selected" }
- chamfer: { distance: number, edges: "all"|"all_vertical"|"top"|"bottom"|"selected" }
- boolean: { operation: "union"|"subtract"|"intersect" }
- shell: { thickness: number, removeFace: "top"|"bottom"|"front"|"back"|"left"|"right" }
- pattern: { type: "linear"|"circular", count: number, spacing?: number, axis?: "X"|"Y"|"Z", angle?: number }

KCL CODE STYLE:
\`\`\`
sketch = startSketch('XZ')
rect = rectangle([-w/2, -d/2], [w/2, d/2])
profile = close(rect)
body = extrude(profile, height)
fillet(body, edges='all_vertical', radius=3)
shell(body, thickness=2, removeFace='top')
export(body)
\`\`\`

DIMENSION CONVENTIONS:
- Dimensions are in mm unless stated otherwise
- width=X axis, height=Y axis, depth=Z axis
- For viewport display, divide mm by 10 for unit scale (e.g., 50mm = 5.0 units)
- "radius" for cylinders/spheres refers to the display radius (mm/10)

DESIGN RULES:
- Always add fillets to sharp edges on enclosures and brackets (radius 1-3mm)
- Default wall thickness for enclosures: 2mm
- Bolt holes should be 0.5mm larger than nominal bolt size
- Mounting brackets need at least 2 mounting holes
- Minimum printable wall: 0.8mm, recommended: 1.5mm+

When the user provides a conversational follow-up, modify the previously generated geometry accordingly. Maintain dimensional consistency across turns.`;

// ─── POST Handler ────────────────────────────────────────────────────

// ─── Thinking Mode Config ─────────────────────────────────────────────────
function thinkingConfig(mode: "Normal" | "Extended" | "Deep" | undefined): {
  max_tokens: number; temperature: number; systemSuffix: string;
} {
  switch (mode) {
    case "Deep":
      return {
        max_tokens: 8000, temperature: 0.7,
        systemSuffix: "\n\nDEEP REASONING MODE: Perform full engineering analysis. Consider material selection, structural integrity, manufacturing constraints, tolerances, and assembly sequence. Think step by step before generating the final JSON.",
      };
    case "Extended":
      return {
        max_tokens: 4000, temperature: 0.5,
        systemSuffix: "\n\nEXTENDED THINKING MODE: Think carefully about the geometry decomposition and provide a detailed chain-of-thought before the JSON.",
      };
    default: // Normal
      return { max_tokens: 2000, temperature: 0.3, systemSuffix: "" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { prompt, messages, conversationId, thinkingMode, imageBase64 } = body;

    if ((!prompt || prompt.trim().length === 0) && (!messages || messages.length === 0)) {
      return NextResponse.json({ error: "Prompt or messages array is required" }, { status: 400 });
    }

    const activePrompt = prompt || messages?.[messages.length - 1]?.content || "";
    const currentConversationId = conversationId || randomUUID();
    const modeConfig = thinkingConfig(thinkingMode);

    // ── Step 1: Reasoning Engine FIRST (local, fast, handles complex assemblies) ──
    try {
      const reasoningResult = runReasoningEngine(activePrompt);
      if (reasoningResult.parts.length >= 1) {
        const primaryPart = reasoningResult.parts[0];
        const isAssembly = reasoningResult.parts.length > 1;
        return NextResponse.json({
          success: true,
          object: {
            type: primaryPart.type,
            name: reasoningResult.objectType,
            dimensions: primaryPart.dimensions,
            description: reasoningResult.summary,
          },
          kclCode: reasoningResult.kclCode,
          message: reasoningResult.summary,
          source: "reasoning",
          conversationId: currentConversationId,
          reasoning: reasoningResult.reasoning,
          assemblyParts: reasoningResult.parts,
          bom: reasoningResult.bom,
          isAssembly,
          simulationIntent: reasoningResult.simulationIntent,
        } as GenerateResponse);
      }
    } catch {
      // Reasoning engine failed, fall through to AI
    }

    // ── Step 2: OpenRouter AI (handles natural language / image input) ──
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (apiKey) {
      try {
        const systemContent = CAD_SYSTEM_PROMPT + modeConfig.systemSuffix;
        const apiMessages: ConversationMessage[] = [
          { role: "system", content: systemContent },
        ];

        if (messages && messages.length > 0) {
          for (const msg of messages) {
            if (msg.role !== "system") apiMessages.push(msg);
          }
        } else if (imageBase64) {
          // Multimodal: send image + text
          apiMessages.push({
            role: "user",
            content: JSON.stringify([
              { type: "image_url", image_url: { url: imageBase64 } },
              { type: "text", text: `${activePrompt}\n\nAnalyze this image and generate CAD geometry that matches it. Describe the shape, dimensions, and components you see, then generate the JSON.` },
            ]),
          });
        } else {
          apiMessages.push({ role: "user", content: activePrompt });
        }

        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://shilpasutra.vercel.app",
            "X-Title": "ShilpaSutra CAD",
          },
          body: JSON.stringify({
            model: imageBase64 ? "anthropic/claude-sonnet-4-5" : "anthropic/claude-sonnet-4",
            messages: apiMessages,
            max_tokens: modeConfig.max_tokens,
            temperature: modeConfig.temperature,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            try {
              const cleaned = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
              // Extract JSON from text (for Extended/Deep modes that add prose)
              const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const object: GeneratedObject = parsed.object || parsed;
                if (object.type && object.name && object.dimensions) {
                  const ops = parsed.operations || buildOperations(object, activePrompt);
                  return NextResponse.json({
                    success: true,
                    object,
                    operations: ops,
                    kclCode: parsed.kclCode || generateKCLCode(object, ops),
                    message: `AI generated: "${object.name}". ${object.description || ""}`,
                    source: "ai",
                    conversationId: currentConversationId,
                  } as GenerateResponse);
                }
              }
            } catch {
              // JSON parse failed
            }
          }
        }
      } catch {
        // API call failed
      }
    }

    // ── Step 3: Parametric fallback ──
    const object = generateFromPrompt(activePrompt);
    const operations = buildOperations(object, activePrompt);
    const kclCode = generateKCLCode(object, operations);
    return NextResponse.json({
      success: true,
      object,
      operations,
      kclCode,
      message: `Generated "${object.name}". ${object.description}`,
      source: "parametric",
      conversationId: currentConversationId,
      fallback: !apiKey,
    } as GenerateResponse);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate", details: String(error) },
      { status: 500 }
    );
  }
}
