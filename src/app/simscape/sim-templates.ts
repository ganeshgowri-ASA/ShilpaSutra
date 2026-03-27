import { BlockDef, Wire } from "./sim-types";

export interface ControlTemplate {
  name: string;
  description: string;
  blocks: BlockDef[];
  wires: Wire[];
}

// ─── DC Motor Speed Control (PID) ─────────────────────────────────────────────
// Reference: J*dω/dt + b*ω = K*u → TF: K/(Js+b) ≈ 1/(0.5s+1)

const dcMotor: ControlTemplate = {
  name: "DC Motor Speed Control (PID)",
  description: "PID control of DC motor angular velocity. Plant: 1/(0.5s+1).",
  blocks: [
    { id: "t1_ref",   type: "step_input", name: "Speed Ref",  x: 60,  y: 130, params: { amplitude: 1, stepTime: 0.5 } },
    { id: "t1_sum",   type: "feedback",   name: "Error",      x: 220, y: 130, params: { signs: "+-" } },
    { id: "t1_pid",   type: "pid",        name: "PID",        x: 380, y: 130, params: { kp: 10, ki: 5, kd: 0.5 } },
    { id: "t1_sat",   type: "saturation", name: "Voltage Lim",x: 520, y: 130, params: { min: -12, max: 12 } },
    { id: "t1_plant", type: "plant",      name: "DC Motor",   x: 660, y: 130, params: { num: "1", den: "0.5 1" } },
    { id: "t1_sc",    type: "scope",      name: "Speed",      x: 820, y: 130, params: {} },
  ],
  wires: [
    { id: "tw1", fromId: "t1_ref",   fromPort: 0, toId: "t1_sum",   toPort: 0 },
    { id: "tw2", fromId: "t1_sum",   fromPort: 0, toId: "t1_pid",   toPort: 0 },
    { id: "tw3", fromId: "t1_pid",   fromPort: 0, toId: "t1_sat",   toPort: 0 },
    { id: "tw4", fromId: "t1_sat",   fromPort: 0, toId: "t1_plant", toPort: 0 },
    { id: "tw5", fromId: "t1_plant", fromPort: 0, toId: "t1_sc",    toPort: 0 },
    { id: "tw6", fromId: "t1_plant", fromPort: 0, toId: "t1_sum",   toPort: 1 },
  ],
};

// ─── Temperature Control Loop ─────────────────────────────────────────────────
// Heater with slow thermal dynamics: TF = 1/(10s+1)

const tempControl: ControlTemplate = {
  name: "Temperature Control Loop",
  description: "PID temperature control. Slow thermal plant: 1/(10s+1).",
  blocks: [
    { id: "t2_ref",   type: "step_input", name: "Setpoint",   x: 60,  y: 130, params: { amplitude: 100, stepTime: 1 } },
    { id: "t2_sum",   type: "feedback",   name: "Error",      x: 220, y: 130, params: { signs: "+-" } },
    { id: "t2_pid",   type: "pid",        name: "PID",        x: 380, y: 130, params: { kp: 2, ki: 0.5, kd: 1 } },
    { id: "t2_sat",   type: "saturation", name: "Power Lim",  x: 520, y: 130, params: { min: 0, max: 100 } },
    { id: "t2_plant", type: "plant",      name: "Heater",     x: 660, y: 130, params: { num: "1", den: "10 1" } },
    { id: "t2_sc",    type: "scope",      name: "Temp (°C)",  x: 820, y: 130, params: {} },
  ],
  wires: [
    { id: "tw1", fromId: "t2_ref",   fromPort: 0, toId: "t2_sum",   toPort: 0 },
    { id: "tw2", fromId: "t2_sum",   fromPort: 0, toId: "t2_pid",   toPort: 0 },
    { id: "tw3", fromId: "t2_pid",   fromPort: 0, toId: "t2_sat",   toPort: 0 },
    { id: "tw4", fromId: "t2_sat",   fromPort: 0, toId: "t2_plant", toPort: 0 },
    { id: "tw5", fromId: "t2_plant", fromPort: 0, toId: "t2_sc",    toPort: 0 },
    { id: "tw6", fromId: "t2_plant", fromPort: 0, toId: "t2_sum",   toPort: 1 },
  ],
};

// ─── Cruise Control ───────────────────────────────────────────────────────────
// Car dynamics: m*dv/dt = F - b*v → TF: 1/(ms+b) = 1/(1000s+50) ≈ 1/(20s+1) scaled

const cruiseControl: ControlTemplate = {
  name: "Cruise Control",
  description: "Automotive cruise control. Vehicle plant: 1/(20s+1), vel in m/s.",
  blocks: [
    { id: "t3_ref",   type: "step_input", name: "Speed Ref",  x: 60,  y: 130, params: { amplitude: 30, stepTime: 1 } },
    { id: "t3_sum",   type: "feedback",   name: "Error",      x: 220, y: 130, params: { signs: "+-" } },
    { id: "t3_pid",   type: "pid",        name: "PID",        x: 380, y: 130, params: { kp: 0.5, ki: 0.1, kd: 0.05 } },
    { id: "t3_sat",   type: "saturation", name: "Throttle",   x: 520, y: 130, params: { min: 0, max: 5000 } },
    { id: "t3_plant", type: "plant",      name: "Vehicle",    x: 660, y: 130, params: { num: "1", den: "20 1" } },
    { id: "t3_sc",    type: "scope",      name: "Velocity",   x: 820, y: 130, params: {} },
  ],
  wires: [
    { id: "tw1", fromId: "t3_ref",   fromPort: 0, toId: "t3_sum",   toPort: 0 },
    { id: "tw2", fromId: "t3_sum",   fromPort: 0, toId: "t3_pid",   toPort: 0 },
    { id: "tw3", fromId: "t3_pid",   fromPort: 0, toId: "t3_sat",   toPort: 0 },
    { id: "tw4", fromId: "t3_sat",   fromPort: 0, toId: "t3_plant", toPort: 0 },
    { id: "tw5", fromId: "t3_plant", fromPort: 0, toId: "t3_sc",    toPort: 0 },
    { id: "tw6", fromId: "t3_plant", fromPort: 0, toId: "t3_sum",   toPort: 1 },
  ],
};

// ─── Inverted Pendulum ────────────────────────────────────────────────────────
// Linearized pendulum (unstable): TF = 1/(s^2 - g/l) ≈ 1/(s^2 - 9.8)
// Using state-space for unstable plant: a=9.8, b=1, c=1, d=0

const invertedPendulum: ControlTemplate = {
  name: "Inverted Pendulum",
  description: "Stabilization of inverted pendulum (unstable plant). SS: a=9.8.",
  blocks: [
    { id: "t4_ref",   type: "constant",   name: "Upright",    x: 60,  y: 130, params: { value: 0 } },
    { id: "t4_sum",   type: "feedback",   name: "Error",      x: 220, y: 130, params: { signs: "+-" } },
    { id: "t4_pid",   type: "pid",        name: "Stabilizer", x: 380, y: 130, params: { kp: 50, ki: 5, kd: 10 } },
    { id: "t4_sat",   type: "saturation", name: "Force Lim",  x: 520, y: 130, params: { min: -100, max: 100 } },
    { id: "t4_plant", type: "statespace", name: "Pendulum",   x: 660, y: 130, params: { a: "9.8", b: "1", c: "1", d: "0", ic: "0.1" } },
    { id: "t4_sc",    type: "scope",      name: "Angle",      x: 820, y: 130, params: {} },
  ],
  wires: [
    { id: "tw1", fromId: "t4_ref",   fromPort: 0, toId: "t4_sum",   toPort: 0 },
    { id: "tw2", fromId: "t4_sum",   fromPort: 0, toId: "t4_pid",   toPort: 0 },
    { id: "tw3", fromId: "t4_pid",   fromPort: 0, toId: "t4_sat",   toPort: 0 },
    { id: "tw4", fromId: "t4_sat",   fromPort: 0, toId: "t4_plant", toPort: 0 },
    { id: "tw5", fromId: "t4_plant", fromPort: 0, toId: "t4_sc",    toPort: 0 },
    { id: "tw6", fromId: "t4_plant", fromPort: 0, toId: "t4_sum",   toPort: 1 },
  ],
};

// ─── Water Level Control ──────────────────────────────────────────────────────
// Tank with integrating plant: flow → level, TF = 1/(As) = 1/s
// Using integrator to model tank integration

const waterLevel: ControlTemplate = {
  name: "Water Level Control",
  description: "Water tank level control. Integrating plant: 1/s (pure integrator).",
  blocks: [
    { id: "t5_ref",  type: "step_input", name: "Level Ref",  x: 60,  y: 130, params: { amplitude: 1, stepTime: 0.5 } },
    { id: "t5_sum",  type: "feedback",   name: "Error",      x: 220, y: 130, params: { signs: "+-" } },
    { id: "t5_pid",  type: "pid",        name: "PID",        x: 380, y: 130, params: { kp: 3, ki: 0.5, kd: 0.8 } },
    { id: "t5_sat",  type: "saturation", name: "Valve",      x: 520, y: 130, params: { min: 0, max: 5 } },
    { id: "t5_int",  type: "integrator", name: "Tank",       x: 660, y: 130, params: { ic: 0 } },
    { id: "t5_sc",   type: "scope",      name: "Level",      x: 820, y: 130, params: {} },
  ],
  wires: [
    { id: "tw1", fromId: "t5_ref",  fromPort: 0, toId: "t5_sum",  toPort: 0 },
    { id: "tw2", fromId: "t5_sum",  fromPort: 0, toId: "t5_pid",  toPort: 0 },
    { id: "tw3", fromId: "t5_pid",  fromPort: 0, toId: "t5_sat",  toPort: 0 },
    { id: "tw4", fromId: "t5_sat",  fromPort: 0, toId: "t5_int",  toPort: 0 },
    { id: "tw5", fromId: "t5_int",  fromPort: 0, toId: "t5_sc",   toPort: 0 },
    { id: "tw6", fromId: "t5_int",  fromPort: 0, toId: "t5_sum",  toPort: 1 },
  ],
};

export const CONTROL_TEMPLATES: ControlTemplate[] = [
  dcMotor, tempControl, cruiseControl, invertedPendulum, waterLevel,
];
