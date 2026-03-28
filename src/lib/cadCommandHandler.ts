/**
 * cadCommandHandler.ts
 * Top-level command router for Text-to-CAD.
 * PV-related prompts → pvModule3DBuilder (real 3D solid geometry).
 * Everything else → existing ai-reasoning-engine (unchanged).
 *
 * Converts pvModule3DBuilder SolidPrimitive[] → AssemblyPart[] so the
 * existing 3D viewport and feature tree work without modification.
 */

import { runReasoningEngine, type ReasoningResult, type AssemblyPart, type BOMEntry, type ReasoningStep } from "./ai-reasoning-engine";
import { buildPVArray, parsePVPrompt, isPVPrompt, type SolidPrimitive, type PVBuildResult } from "./pvModule3DBuilder";

// ─── Material → PBR mapping (scene-compatible) ────────────────────────────────

const PV_MAT_MAP: Record<string, { color: string; metalness: number; roughness: number; opacity: number }> = {
  pv_glass:     { color:"#1a2a7a", metalness:0.1,  roughness:0.05, opacity:0.75 },
  pv_cell:      { color:"#0d1050", metalness:0.15, roughness:0.6,  opacity:1    },
  pv_backsheet: { color:"#e8e8e8", metalness:0.0,  roughness:0.9,  opacity:1    },
  al_frame:     { color:"#c8d0d8", metalness:0.85, roughness:0.25, opacity:1    },
  al_rail:      { color:"#b8c0c8", metalness:0.8,  roughness:0.3,  opacity:1    },
  al_zclamp:    { color:"#d0d8e0", metalness:0.8,  roughness:0.3,  opacity:1    },
  steel_torque: { color:"#9aacb0", metalness:0.9,  roughness:0.35, opacity:1    },
  steel_leg:    { color:"#90a8a8", metalness:0.85, roughness:0.4,  opacity:1    },
  black_plastic:{ color:"#1a1a1a", metalness:0.05, roughness:0.8,  opacity:1    },
};

// ─── SolidPrimitive → AssemblyPart ────────────────────────────────────────────

function solidToAssemblyPart(prim: SolidPrimitive): AssemblyPart {
  const m = PV_MAT_MAP[prim.material] ?? { color:"#888888", metalness:0.5, roughness:0.5, opacity:1 };
  const [w, h, d] = prim.dimensions;
  return {
    type: prim.type === "cylinder" ? "cylinder" : "box",
    name: prim.name,
    position: prim.position,
    rotation: prim.rotation,
    scale: [1, 1, 1],
    dimensions: { width: w, height: h, depth: d },
    material: prim.material,
    color: m.color,
    opacity: m.opacity,
    metalness: m.metalness,
    roughness: m.roughness,
    visible: true,
    locked: false,
  };
}

// ─── PVBuildResult → ReasoningResult ─────────────────────────────────────────

function pvResultToReasoningResult(pv: PVBuildResult, prompt: string): ReasoningResult {
  const { totalModules, dcCapacityKWp, arraySizeM, tiltDeg, rowPitchMm, gcr } = pv.meta;

  const reasoning: ReasoningStep[] = [
    { step:1, action:"Parse prompt",       detail:`Detected PV array: ${totalModules} modules, ${tiltDeg}° tilt`, status:"done" },
    { step:2, action:"Module geometry",    detail:"Glass laminate + Al C-frame + junction box per module", status:"done" },
    { step:3, action:"Structural racking", detail:`Torque tube 80×80mm HSS + legs (rear ${pv.bom[2]?.dimensions ?? ""})`, status:"done" },
    { step:4, action:"Rails & clamps",     detail:`C-channel rails (2/row) + Z-clamps at module corners`, status:"done" },
    { step:5, action:"Array layout",       detail:`${arraySizeM[0].toFixed(1)}m × ${arraySizeM[1].toFixed(1)}m, GCR=${gcr}, ${dcCapacityKWp} kWp DC`, status:"done" },
  ];

  const bom: BOMEntry[] = pv.bom.map(b => ({
    partName: b.partName,
    quantity: b.qty,
    material: b.material,
    dimensions: b.dimensions,
    color: "#888",
  }));

  const parts: AssemblyPart[] = pv.primitives.map(solidToAssemblyPart);

  // KCL-style pseudocode summary
  const kcl = [
    `// PV Array — ${totalModules} modules, ${tiltDeg}° tilt, ground-mounted`,
    `const pvArray = buildPVArray({`,
    `  cols: ${Math.round(Math.sqrt(totalModules * 6))}, rows: 2,`,
    `  tiltDeg: ${tiltDeg},`,
    `  rowPitchMm: ${rowPitchMm},`,
    `})`,
    `// DC capacity: ${dcCapacityKWp} kWp  |  GCR: ${gcr}`,
    `// Array footprint: ${arraySizeM[0].toFixed(1)} m × ${arraySizeM[1].toFixed(1)} m`,
  ].join("\n");

  return {
    objectType: "Solar PV Array",
    reasoning,
    parts,
    bom,
    kclCode: kcl,
    summary: `Generated ${totalModules}-module PV array (${dcCapacityKWp} kWp) with full structural racking. ${parts.length} solid primitives. GCR ${gcr}, row pitch ${rowPitchMm}mm.`,
  };
}

// ─── Clarifying question logic ────────────────────────────────────────────────

export interface ClarificationRequest {
  needsClarification: true;
  question: string;
  suggestions: string[];
}

function checkNeedsClarification(prompt: string): ClarificationRequest | null {
  const t = prompt.toLowerCase();

  // Has at least a rough module count or explicit array size?
  const hasCount = /\d+\s*(?:module|panel|pv)|(\d+)\s*[x×*]\s*\d+/.test(t);
  const hasTilt  = /\d+\s*(?:deg|°)/.test(t);

  if (!hasCount && !hasTilt) {
    return {
      needsClarification: true,
      question: "To generate an accurate 3D PV array, please specify:\n1. How many modules? (e.g., '24 modules' or '2×12')\n2. What tilt angle? (e.g., '23°')\n3. Mounting type? (ground-mounted / rooftop / tracker)",
      suggestions: [
        "24-module ground-mounted PV array at 23° tilt",
        "2×12 PV array 20° tilt 5500mm row pitch",
        "Single PV module 2000×1000×35mm",
      ],
    };
  }
  if (!hasCount) {
    return {
      needsClarification: true,
      question: "How many PV modules? (e.g., '24 modules' or a grid like '2 rows × 12 columns')",
      suggestions: ["12 modules", "24 modules", "2×12 array"],
    };
  }
  return null;
}

// ─── Main command handler ─────────────────────────────────────────────────────

export type CommandResult =
  | ReasoningResult
  | ClarificationRequest;

/**
 * Route a Text-to-CAD command prompt.
 * PV prompts → real 3D solid geometry via pvModule3DBuilder.
 * All other prompts → existing ai-reasoning-engine.
 */
export function handleCADCommand(prompt: string): CommandResult {
  if (!isPVPrompt(prompt)) {
    return runReasoningEngine(prompt);
  }

  // Optionally ask clarifying question if params are too vague
  const clarify = checkNeedsClarification(prompt);
  if (clarify) return clarify;

  // Parse params from prompt and build 3D geometry
  const pvParams = parsePVPrompt(prompt);
  const pvResult = buildPVArray(pvParams);
  return pvResultToReasoningResult(pvResult, prompt);
}

/** Type-guard: check if result needs clarification */
export function isClarificationRequest(r: CommandResult): r is ClarificationRequest {
  return (r as ClarificationRequest).needsClarification === true;
}
