import { BlockDef, Wire, SimResult, BW, BH, INPUT_PORTS, OUTPUT_PORTS } from "./sim-types";

// ─── Simulation engine ────────────────────────────────────────────────────────

export function runSimulation(
  blocks: BlockDef[],
  wires: Wire[],
  tEnd = 10,
  steps = 500
): SimResult {
  const dt = tEnd / steps;
  const time = Array.from({ length: steps }, (_, i) => i * dt);
  const signals: Record<string, number[]> = {};
  blocks.forEach((b) => { signals[b.id] = new Array(steps).fill(0); });

  const state: Record<string, Record<string, number>> = {};
  blocks.forEach((b) => {
    const ic = parseFloat(String(b.params.ic ?? 0)) || 0;
    state[b.id] = { intState: ic, pidInt: 0, pidPrev: 0, derPrev: 0, ssState: ic };
  });

  // Build delay buffers
  const delayBufs: Record<string, number[]> = {};
  blocks.forEach((b) => {
    if (b.type === "delay") {
      const d = Number(b.params.delay) || 0.5;
      const len = Math.max(1, Math.ceil(d / dt));
      delayBufs[b.id] = new Array(len).fill(0);
    }
  });

  // Build adjacency: toId → fromId[] (ordered by port)
  const incomingMap: Record<string, Array<{ fromId: string; toPort: number }>> = {};
  blocks.forEach((b) => { incomingMap[b.id] = []; });
  wires.forEach((w) => {
    if (!incomingMap[w.toId]) incomingMap[w.toId] = [];
    incomingMap[w.toId].push({ fromId: w.fromId, toPort: w.toPort });
  });

  const sorted = topSort(blocks, wires);

  for (let n = 0; n < steps; n++) {
    const t = time[n];

    for (const block of sorted) {
      const incoming = incomingMap[block.id] || [];
      const inputs: number[] = [];
      incoming.forEach(({ fromId, toPort }) => {
        inputs[toPort] = signals[fromId][n] ?? 0;
      });
      const u = inputs[0] ?? 0;
      const u1 = inputs[1] ?? 0;
      const p = block.params;

      switch (block.type) {
        case "source": {
          const A = Number(p.amplitude) || 1;
          const f = Number(p.frequency) || 1;
          if (p.signal === "sine")   signals[block.id][n] = A * Math.sin(2 * Math.PI * f * t);
          else if (p.signal === "cosine") signals[block.id][n] = A * Math.cos(2 * Math.PI * f * t);
          else if (p.signal === "step")   signals[block.id][n] = t >= (Number(p.stepTime) || 1) ? A : 0;
          else if (p.signal === "ramp")   signals[block.id][n] = A * t;
          else if (p.signal === "square") signals[block.id][n] = A * Math.sign(Math.sin(2 * Math.PI * f * t));
          break;
        }
        case "step_input":
          signals[block.id][n] = t >= (Number(p.stepTime) || 0.5) ? (Number(p.amplitude) || 1) : 0;
          break;
        case "ramp_input":
          signals[block.id][n] = (Number(p.slope) || 1) * t;
          break;
        case "constant":
          signals[block.id][n] = Number(p.value) || 1;
          break;
        case "gain":
          signals[block.id][n] = u * (Number(p.gain) || 1);
          break;
        case "sum":
        case "feedback": {
          const signs = String(p.signs || (block.type === "feedback" ? "+-" : "++"));
          let s = 0;
          inputs.forEach((v, i) => { s += (signs[i] === "-" ? -1 : 1) * (v ?? 0); });
          signals[block.id][n] = s;
          break;
        }
        case "integrator": {
          if (n === 0) {
            const ic = Number(p.ic) || 0;
            signals[block.id][n] = ic;
            state[block.id].intState = ic;
          } else {
            state[block.id].intState += u * dt;
            signals[block.id][n] = state[block.id].intState;
          }
          break;
        }
        case "derivative": {
          if (n === 0) { signals[block.id][n] = 0; state[block.id].derPrev = u; }
          else {
            signals[block.id][n] = (u - state[block.id].derPrev) / dt;
            state[block.id].derPrev = u;
          }
          break;
        }
        case "tf":
        case "plant": {
          const denParts = String(p.den || "1 1").trim().split(/\s+/).map(Number);
          const tau = denParts.length >= 2 ? (denParts[0] || 1) : 1;
          const a = dt / (tau + dt);
          if (n === 0) signals[block.id][n] = 0;
          else signals[block.id][n] = (1 - a) * (signals[block.id][n - 1] ?? 0) + a * u;
          break;
        }
        case "pid": {
          const Kp = Number(p.kp) || 1;
          const Ki = Number(p.ki) || 0;
          const Kd = Number(p.kd) || 0;
          if (n === 0) { state[block.id].pidInt = 0; state[block.id].pidPrev = u; }
          state[block.id].pidInt += u * dt;
          const deriv = n === 0 ? 0 : (u - state[block.id].pidPrev) / dt;
          state[block.id].pidPrev = u;
          signals[block.id][n] = Kp * u + Ki * state[block.id].pidInt + Kd * deriv;
          break;
        }
        case "saturation": {
          const lo = Number(p.min) ?? -10;
          const hi = Number(p.max) ?? 10;
          signals[block.id][n] = Math.min(hi, Math.max(lo, u));
          break;
        }
        case "delay": {
          const buf = delayBufs[block.id];
          buf.push(u);
          signals[block.id][n] = buf.shift() ?? 0;
          break;
        }
        case "statespace": {
          // SISO: x' = a*x + b*u, y = c*x + d*u
          const a = parseFloat(String(p.a)) || -1;
          const b = parseFloat(String(p.b)) || 1;
          const c = parseFloat(String(p.c)) || 1;
          const d = parseFloat(String(p.d)) || 0;
          if (n === 0) state[block.id].ssState = parseFloat(String(p.ic)) || 0;
          const x = state[block.id].ssState;
          signals[block.id][n] = c * x + d * u;
          state[block.id].ssState = x + dt * (a * x + b * u);
          break;
        }
        case "scope":
        case "bode":
        case "rootlocus":
        case "nyquist":
          signals[block.id][n] = u;
          break;
      }
      // suppress u1 unused warning — it's used by sum/feedback via inputs array
      void u1;
    }
  }
  return { time, signals };
}

// ─── Topological sort (Kahn's algorithm) ──────────────────────────────────────

export function topSort(blocks: BlockDef[], wires: Wire[]): BlockDef[] {
  const inDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};
  blocks.forEach((b) => { inDegree[b.id] = 0; adj[b.id] = []; });
  wires.forEach((w) => {
    inDegree[w.toId] = (inDegree[w.toId] || 0) + 1;
    (adj[w.fromId] = adj[w.fromId] || []).push(w.toId);
  });
  const queue = blocks.filter((b) => inDegree[b.id] === 0).map((b) => b.id);
  const sorted: BlockDef[] = [];
  const idMap = Object.fromEntries(blocks.map((b) => [b.id, b]));
  while (queue.length) {
    const id = queue.shift()!;
    if (idMap[id]) sorted.push(idMap[id]);
    (adj[id] || []).forEach((nid) => {
      inDegree[nid]--;
      if (inDegree[nid] === 0) queue.push(nid);
    });
  }
  blocks.forEach((b) => { if (!sorted.find((s) => s.id === b.id)) sorted.push(b); });
  return sorted;
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

export function portPos(
  block: BlockDef,
  kind: "in" | "out",
  port = 0,
  total = 1
): { x: number; y: number } {
  const step = BH / (total + 1);
  if (kind === "in") return { x: block.x, y: block.y + step * (port + 1) };
  return { x: block.x + BW, y: block.y + step * (port + 1) };
}

export function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const cx = (x1 + x2) / 2;
  return `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`;
}

let _id = Date.now();
export const uid = () => `b${++_id}`;
