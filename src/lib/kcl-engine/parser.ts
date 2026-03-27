/**
 * KCL-Inspired Parametric Function Parser
 * Parses KCL-like parametric function definitions for the ShilpaSutra CAD engine.
 *
 * Syntax: fn pvModule(length = 2000, width = 1000, thickness = 35) { ... }
 * Supports: parameter defaults, expressions, unit annotations, and step sequencing.
 */

// ─── Types ──────────────────────────────────────────────────────────────

export interface KCLParam {
  name: string;
  defaultValue: number;
  unit: string; // "mm" | "deg" | "count" | "ratio"
  min?: number;
  max?: number;
  description?: string;
}

export interface KCLStep {
  id: string;
  index: number;
  operation: KCLOperation;
  label: string;
  description: string;
  params: Record<string, number | string>;
  dependsOn: string[];  // step IDs this step depends on
  resultRef?: string;    // variable name to reference this step's output
}

export type KCLOperation =
  | "sketch_profile"
  | "extrude"
  | "extrude_cut"
  | "revolve"
  | "chamfer"
  | "fillet"
  | "translate"
  | "rotate"
  | "mirror"
  | "linear_pattern"
  | "circular_pattern"
  | "boolean_union"
  | "boolean_subtract"
  | "assemble"
  | "set_material"
  | "validate";

export interface KCLFunction {
  name: string;
  params: KCLParam[];
  steps: KCLStep[];
  description?: string;
}

export interface KCLProgram {
  functions: KCLFunction[];
  globals: Record<string, number>;
  calls: KCLFunctionCall[];
}

export interface KCLFunctionCall {
  functionName: string;
  args: Record<string, number>;
  resultName?: string;
}

// ─── Unit Constants ─────────────────────────────────────────────────────

const UNIT_TO_MM: Record<string, number> = {
  mm: 1, cm: 10, m: 1000, in: 25.4, inch: 25.4, ft: 304.8,
};

const MM_TO_SCENE = 0.1; // 1mm = 0.1 scene units

export function mmToScene(mm: number): number {
  return mm * MM_TO_SCENE;
}

export function sceneToMm(scene: number): number {
  return scene / MM_TO_SCENE;
}

export function convertToMm(value: number, unit: string): number {
  return value * (UNIT_TO_MM[unit.toLowerCase()] ?? 1);
}

// ─── Parser ─────────────────────────────────────────────────────────────

/**
 * Parse a KCL function definition string into a KCLFunction AST.
 *
 * Example input:
 *   fn pvModule(length = 2000, width = 1000, thickness = 35) {
 *     sketch_profile("frame_top", profile: "c_channel", w: 40, h: 35)
 *     extrude("frame_top", depth: length)
 *     translate("frame_top", y: thickness / 2)
 *   }
 */
export function parseKCLFunction(source: string): KCLFunction | null {
  const fnMatch = source.match(
    /fn\s+(\w+)\s*\(([^)]*)\)\s*\{([\s\S]*?)\}/
  );
  if (!fnMatch) return null;

  const name = fnMatch[1];
  const paramStr = fnMatch[2].trim();
  const bodyStr = fnMatch[3].trim();

  const params = parseParams(paramStr);
  const steps = parseBody(bodyStr, params);

  return { name, params, steps };
}

/**
 * Parse multiple KCL function definitions from source.
 */
export function parseKCLProgram(source: string): KCLProgram {
  const functions: KCLFunction[] = [];
  const globals: Record<string, number> = {};
  const calls: KCLFunctionCall[] = [];

  // Parse global constants: let NAME = VALUE
  const globalPattern = /let\s+(\w+)\s*=\s*([0-9.]+)\s*(mm|cm|m|in|ft)?/g;
  let gm;
  while ((gm = globalPattern.exec(source)) !== null) {
    const val = parseFloat(gm[2]);
    const unit = gm[3] || "mm";
    globals[gm[1]] = convertToMm(val, unit);
  }

  // Parse functions
  const fnPattern = /fn\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\}/g;
  let fm;
  while ((fm = fnPattern.exec(source)) !== null) {
    const fn = parseKCLFunction(fm[0]);
    if (fn) functions.push(fn);
  }

  // Parse function calls: result = functionName(arg1: val1, arg2: val2)
  const callPattern = /(?:(\w+)\s*=\s*)?(\w+)\s*\(([^)]*)\)\s*;?/g;
  let cm;
  while ((cm = callPattern.exec(source)) !== null) {
    const funcName = cm[2];
    if (funcName === "fn" || funcName === "let") continue;
    if (!functions.some(f => f.name === funcName)) continue;
    const args = parseCallArgs(cm[3]);
    calls.push({
      functionName: funcName,
      args,
      resultName: cm[1] || undefined,
    });
  }

  return { functions, globals, calls };
}

function parseParams(paramStr: string): KCLParam[] {
  if (!paramStr) return [];
  return paramStr.split(",").map((p) => {
    const trimmed = p.trim();
    // name = value unit
    const m = trimmed.match(
      /(\w+)\s*(?:=\s*([0-9.]+)\s*(mm|cm|m|in|deg|count|ratio)?)?/
    );
    if (!m) return null;
    return {
      name: m[1],
      defaultValue: m[2] ? parseFloat(m[2]) : 0,
      unit: m[3] || "mm",
    } as KCLParam;
  }).filter(Boolean) as KCLParam[];
}

function parseBody(bodyStr: string, params: KCLParam[]): KCLStep[] {
  const lines = bodyStr.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("//"));
  const steps: KCLStep[] = [];
  const paramMap = new Map(params.map(p => [p.name, p.defaultValue]));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // pattern: operation("ref", key: value, key: value)
    const m = line.match(/(\w+)\s*\(\s*"([^"]*)"(?:\s*,\s*(.*))?\s*\)/);
    if (!m) continue;

    const operation = m[1] as KCLOperation;
    const ref = m[2];
    const argsStr = m[3] || "";

    const stepParams: Record<string, number | string> = {};
    const deps: string[] = [];

    // Parse key: value pairs
    if (argsStr) {
      const pairs = argsStr.split(",").map(s => s.trim());
      for (const pair of pairs) {
        const kv = pair.match(/(\w+)\s*:\s*(.+)/);
        if (!kv) continue;
        const key = kv[1];
        const valStr = kv[2].trim().replace(/["']/g, "");

        // Check if it's a parameter reference or expression
        const numVal = evaluateExpression(valStr, paramMap);
        if (numVal !== null) {
          stepParams[key] = numVal;
        } else {
          stepParams[key] = valStr;
        }
      }
    }

    // Track dependencies
    if (argsStr.includes("ref:")) {
      const refMatch = argsStr.match(/ref:\s*"?(\w+)"?/);
      if (refMatch) deps.push(refMatch[1]);
    }

    steps.push({
      id: `step_${i}`,
      index: i,
      operation,
      label: `${operation}("${ref}")`,
      description: describeStep(operation, ref, stepParams),
      params: { _ref: ref, ...stepParams },
      dependsOn: deps,
      resultRef: ref,
    });
  }

  return steps;
}

function evaluateExpression(expr: string, vars: Map<string, number>): number | null {
  // Simple expression evaluator: handles variable refs, basic arithmetic
  const trimmed = expr.trim();

  // Direct number
  const num = parseFloat(trimmed);
  if (!isNaN(num) && /^[0-9.]+$/.test(trimmed)) return num;

  // Variable reference
  if (vars.has(trimmed)) return vars.get(trimmed)!;

  // Simple binary: "a / b", "a * b", "a + b", "a - b"
  const binMatch = trimmed.match(/^(\w+)\s*([+\-*/])\s*([0-9.]+|\w+)$/);
  if (binMatch) {
    const left = vars.has(binMatch[1]) ? vars.get(binMatch[1])! : parseFloat(binMatch[1]);
    const right = vars.has(binMatch[3]) ? vars.get(binMatch[3])! : parseFloat(binMatch[3]);
    if (isNaN(left) || isNaN(right)) return null;
    switch (binMatch[2]) {
      case "+": return left + right;
      case "-": return left - right;
      case "*": return left * right;
      case "/": return right !== 0 ? left / right : null;
    }
  }

  return null;
}

function parseCallArgs(argsStr: string): Record<string, number> {
  const args: Record<string, number> = {};
  if (!argsStr) return args;
  const pairs = argsStr.split(",").map(s => s.trim());
  for (const pair of pairs) {
    const kv = pair.match(/(\w+)\s*:\s*([0-9.]+)/);
    if (kv) {
      args[kv[1]] = parseFloat(kv[2]);
    }
  }
  return args;
}

function describeStep(op: KCLOperation, ref: string, params: Record<string, number | string>): string {
  switch (op) {
    case "sketch_profile":
      return `Create ${params.profile || "rectangular"} sketch profile "${ref}" (${params.w || "?"}×${params.h || "?"}mm)`;
    case "extrude":
      return `Extrude "${ref}" to depth ${params.depth || "?"}mm`;
    case "extrude_cut":
      return `Cut-extrude "${ref}" to depth ${params.depth || "?"}mm`;
    case "revolve":
      return `Revolve "${ref}" by ${params.angle || 360}°`;
    case "chamfer":
      return `Chamfer "${ref}" at ${params.distance || "?"}mm`;
    case "fillet":
      return `Fillet "${ref}" with radius ${params.radius || "?"}mm`;
    case "translate":
      return `Translate "${ref}" by (${params.x || 0}, ${params.y || 0}, ${params.z || 0})`;
    case "rotate":
      return `Rotate "${ref}" by ${params.angle || 0}° around ${params.axis || "Y"}`;
    case "linear_pattern":
      return `Linear pattern of "${ref}": ${params.count || "?"} copies, spacing ${params.spacing || "?"}mm`;
    case "circular_pattern":
      return `Circular pattern of "${ref}": ${params.count || "?"} copies`;
    case "set_material":
      return `Set material of "${ref}" to ${params.material || "?"}`;
    case "validate":
      return `Validate "${ref}" against ${params.standard || "?"} standard`;
    default:
      return `${op}("${ref}")`;
  }
}

// ─── KCL Code Generator ────────────────────────────────────────────────

/**
 * Generate KCL source code from a function definition.
 */
export function generateKCLSource(fn: KCLFunction): string {
  const paramDefs = fn.params
    .map(p => `${p.name} = ${p.defaultValue}${p.unit !== "mm" ? " " + p.unit : ""}`)
    .join(", ");

  const stepLines = fn.steps.map(s => {
    const args = Object.entries(s.params)
      .filter(([k]) => k !== "_ref")
      .map(([k, v]) => `${k}: ${typeof v === "string" ? `"${v}"` : v}`)
      .join(", ");
    const ref = s.params._ref || s.resultRef || "";
    return `  ${s.operation}("${ref}"${args ? ", " + args : ""})`;
  });

  return `fn ${fn.name}(${paramDefs}) {\n${stepLines.join("\n")}\n}`;
}

/**
 * Create a KCL construction sequence for rollback slider integration.
 * Returns an ordered list of steps that can be played forward/backward.
 */
export interface ConstructionSequence {
  steps: KCLStep[];
  totalSteps: number;
  currentStep: number;
}

export function createConstructionSequence(fn: KCLFunction, paramOverrides?: Record<string, number>): ConstructionSequence {
  // Apply parameter overrides
  const resolvedSteps = fn.steps.map(step => {
    if (!paramOverrides) return step;
    const resolved = { ...step, params: { ...step.params } };
    for (const [key, val] of Object.entries(resolved.params)) {
      if (typeof val === "string" && paramOverrides[val] !== undefined) {
        resolved.params[key] = paramOverrides[val];
      }
    }
    return resolved;
  });

  return {
    steps: resolvedSteps,
    totalSteps: resolvedSteps.length,
    currentStep: resolvedSteps.length - 1,
  };
}
