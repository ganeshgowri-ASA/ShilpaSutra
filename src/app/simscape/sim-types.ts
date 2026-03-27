// ─── Types ────────────────────────────────────────────────────────────────────

export type BlockType =
  | "source" | "gain" | "sum" | "integrator" | "tf" | "pid" | "scope" | "constant"
  | "step_input" | "ramp_input" | "plant" | "feedback" | "saturation"
  | "delay" | "derivative" | "statespace" | "bode" | "rootlocus" | "nyquist";

export interface BlockDef {
  id: string;
  type: BlockType;
  name: string;
  x: number;
  y: number;
  params: Record<string, number | string>;
}

export interface Wire {
  id: string;
  fromId: string;
  fromPort: number;
  toId: string;
  toPort: number;
}

export interface SimResult {
  time: number[];
  signals: Record<string, number[]>;
}

export interface SystemAnalysis {
  poles: Array<{ re: number; im: number }>;
  zeros: Array<{ re: number; im: number }>;
  stable: "stable" | "unstable" | "marginal";
  gainMargin_dB: number;
  phaseMargin_deg: number;
  settlingTime: number;
  overshoot_pct: number;
  bodeFreq: number[];
  bodeMag_dB: number[];
  bodePhase_deg: number[];
  nyquistRe: number[];
  nyquistIm: number[];
  rootLocusGains: number[];
  rootLocusPoles: Array<Array<{ re: number; im: number }>>;
}

// ─── Block dimensions ─────────────────────────────────────────────────────────

export const BW = 120;
export const BH = 56;
export const PORT_R = 5;

// ─── Block metadata ───────────────────────────────────────────────────────────

export const BLOCK_COLORS: Record<BlockType, string> = {
  source:     "#16a34a",
  gain:       "#2563eb",
  sum:        "#ea580c",
  integrator: "#7c3aed",
  tf:         "#0891b2",
  pid:        "#ca8a04",
  scope:      "#dc2626",
  constant:   "#475569",
  step_input: "#059669",
  ramp_input: "#0d9488",
  plant:      "#0e7490",
  feedback:   "#b45309",
  saturation: "#9333ea",
  delay:      "#6366f1",
  derivative: "#8b5cf6",
  statespace: "#1d4ed8",
  bode:       "#be185d",
  rootlocus:  "#c2410c",
  nyquist:    "#4338ca",
};

export const BLOCK_LABELS: Record<BlockType, string> = {
  source:     "Source",
  gain:       "Gain",
  sum:        "Sum",
  integrator: "∫ 1/s",
  tf:         "TF",
  pid:        "PID",
  scope:      "Scope",
  constant:   "K",
  step_input: "Step",
  ramp_input: "Ramp",
  plant:      "Plant",
  feedback:   "∑ (−)",
  saturation: "Sat",
  delay:      "Delay",
  derivative: "d/dt",
  statespace: "SS",
  bode:       "Bode",
  rootlocus:  "RootLocus",
  nyquist:    "Nyquist",
};

export const DEFAULT_PARAMS: Record<BlockType, Record<string, number | string>> = {
  source:     { signal: "sine", amplitude: 1, frequency: 1, stepTime: 1 },
  gain:       { gain: 2 },
  sum:        { signs: "++" },
  integrator: { ic: 0 },
  tf:         { num: "1", den: "1 1" },
  pid:        { kp: 1, ki: 0.1, kd: 0.01 },
  scope:      {},
  constant:   { value: 1 },
  step_input: { amplitude: 1, stepTime: 0.5 },
  ramp_input: { slope: 1 },
  plant:      { num: "1", den: "1 2 1" },
  feedback:   { signs: "+-" },
  saturation: { min: -10, max: 10 },
  delay:      { delay: 0.5 },
  derivative: {},
  statespace: { a: "-1", b: "1", c: "1", d: "0", ic: "0" },
  bode:       {},
  rootlocus:  {},
  nyquist:    {},
};

export const INPUT_PORTS: Record<BlockType, number> = {
  source: 0, constant: 0, step_input: 0, ramp_input: 0,
  gain: 1, integrator: 1, tf: 1, scope: 1, plant: 1,
  saturation: 1, delay: 1, derivative: 1, statespace: 1,
  bode: 1, rootlocus: 1, nyquist: 1,
  pid: 1, sum: 2, feedback: 2,
};

export const OUTPUT_PORTS: Record<BlockType, number> = {
  source: 1, constant: 1, step_input: 1, ramp_input: 1,
  gain: 1, integrator: 1, tf: 1, plant: 1,
  saturation: 1, delay: 1, derivative: 1, statespace: 1,
  pid: 1, sum: 1, feedback: 1,
  scope: 0, bode: 0, rootlocus: 0, nyquist: 0,
};

// ─── Library groups ───────────────────────────────────────────────────────────

export const LIBRARY_GROUPS: Array<{ label: string; types: BlockType[] }> = [
  { label: "Sources",    types: ["source", "step_input", "ramp_input", "constant"] },
  { label: "Linear",    types: ["gain", "sum", "integrator", "derivative", "tf", "statespace"] },
  { label: "Control",   types: ["pid", "feedback", "plant"] },
  { label: "Nonlinear", types: ["saturation", "delay"] },
  { label: "Viewers",   types: ["scope", "bode", "rootlocus", "nyquist"] },
];
