import { BlockDef, Wire, SystemAnalysis } from "./sim-types";

// ─── Complex number arithmetic ────────────────────────────────────────────────

interface Cx { re: number; im: number }
const cx = (re: number, im = 0): Cx => ({ re, im });
const cxAdd = (a: Cx, b: Cx): Cx => ({ re: a.re + b.re, im: a.im + b.im });
const cxMul = (a: Cx, b: Cx): Cx => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const cxAbs = (a: Cx) => Math.sqrt(a.re * a.re + a.im * a.im);
const cxArg = (a: Cx) => Math.atan2(a.im, a.re) * (180 / Math.PI);

// Evaluate polynomial p(s) = c[0]*s^n + c[1]*s^(n-1) + ... + c[n]
function evalPoly(coeffs: number[], s: Cx): Cx {
  let result = cx(0, 0);
  for (const c of coeffs) {
    result = cxAdd(cxMul(result, s), cx(c));
  }
  return result;
}

// ─── Polynomial root finding ──────────────────────────────────────────────────
// Durand-Kerner method for up to degree 4

function polyRoots(coeffs: number[]): Cx[] {
  const n = coeffs.length - 1;
  if (n <= 0) return [];
  const a0 = coeffs[0];
  const norm = coeffs.map((c) => c / a0);

  if (n === 1) return [cx(-norm[1])];
  if (n === 2) {
    const disc = norm[1] * norm[1] - 4 * norm[2];
    if (disc >= 0) {
      return [cx((-norm[1] + Math.sqrt(disc)) / 2), cx((-norm[1] - Math.sqrt(disc)) / 2)];
    }
    const sq = Math.sqrt(-disc) / 2;
    return [{ re: -norm[1] / 2, im: sq }, { re: -norm[1] / 2, im: -sq }];
  }

  // Durand-Kerner for degree 3+
  let roots: Cx[] = Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / n;
    return { re: 0.4 * Math.cos(angle), im: 0.4 * Math.sin(angle) };
  });

  for (let iter = 0; iter < 200; iter++) {
    const next = roots.map((ri, i) => {
      let denom = cx(1, 0);
      for (let j = 0; j < n; j++) {
        if (j !== i) denom = cxMul(denom, { re: ri.re - roots[j].re, im: ri.im - roots[j].im });
      }
      const pVal = evalPoly(norm, ri);
      const absD = cxAbs(denom);
      if (absD < 1e-12) return ri;
      const step = { re: pVal.re / (denom.re * denom.re + denom.im * denom.im) * denom.re
                       + pVal.im / (denom.re * denom.re + denom.im * denom.im) * denom.im,
                    im: pVal.im / (denom.re * denom.re + denom.im * denom.im) * denom.re
                       - pVal.re / (denom.re * denom.re + denom.im * denom.im) * denom.im };
      return { re: ri.re - step.re, im: ri.im - step.im };
    });
    roots = next;
  }
  return roots;
}

// ─── Extract TF from diagram ──────────────────────────────────────────────────

function extractTF(blocks: BlockDef[]): { num: number[]; den: number[] } | null {
  const tfBlocks = blocks.filter((b) => b.type === "tf" || b.type === "plant");
  if (tfBlocks.length === 0) return null;
  const b = tfBlocks[0];
  const num = String(b.params.num || "1").trim().split(/\s+/).map(Number).filter(isFinite);
  const den = String(b.params.den || "1 1").trim().split(/\s+/).map(Number).filter(isFinite);
  return { num: num.length ? num : [1], den: den.length ? den : [1, 1] };
}

// ─── Bode computation ─────────────────────────────────────────────────────────

function computeBode(num: number[], den: number[], nPoints = 100) {
  const freqs: number[] = [];
  const mags: number[] = [];
  const phases: number[] = [];

  for (let i = 0; i < nPoints; i++) {
    const logW = -1 + (i / (nPoints - 1)) * 4; // 0.1 to 1000 rad/s
    const w = Math.pow(10, logW);
    const jw: Cx = { re: 0, im: w };
    const numVal = evalPoly(num, jw);
    const denVal = evalPoly(den, jw);
    const denAbs2 = denVal.re * denVal.re + denVal.im * denVal.im;
    if (denAbs2 < 1e-30) { freqs.push(w); mags.push(-Infinity); phases.push(0); continue; }
    const H: Cx = {
      re: (numVal.re * denVal.re + numVal.im * denVal.im) / denAbs2,
      im: (numVal.im * denVal.re - numVal.re * denVal.im) / denAbs2,
    };
    const mag = cxAbs(H);
    freqs.push(w);
    mags.push(20 * Math.log10(mag || 1e-12));
    phases.push(cxArg(H));
  }
  return { freqs, mags, phases };
}

// ─── Nyquist computation ──────────────────────────────────────────────────────

function computeNyquist(num: number[], den: number[], nPoints = 200) {
  const re: number[] = [], im: number[] = [];
  for (let i = 0; i < nPoints; i++) {
    const w = Math.pow(10, -1 + (i / (nPoints - 1)) * 4);
    const jw: Cx = { re: 0, im: w };
    const nv = evalPoly(num, jw), dv = evalPoly(den, jw);
    const d2 = dv.re * dv.re + dv.im * dv.im;
    if (d2 < 1e-30) { re.push(0); im.push(0); continue; }
    re.push((nv.re * dv.re + nv.im * dv.im) / d2);
    im.push((nv.im * dv.re - nv.re * dv.im) / d2);
  }
  return { re, im };
}

// ─── Root locus computation ───────────────────────────────────────────────────

function computeRootLocus(num: number[], den: number[], nGains = 40) {
  const gains: number[] = [];
  const allPoles: Array<Array<{ re: number; im: number }>> = [];
  const kVals = [0, 0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000,
                  2000, 5000, 10000, 50000].slice(0, nGains);
  for (const k of kVals) {
    // CL char. poly = den + k*num
    const n = Math.max(num.length, den.length);
    const numPad = [...Array(n - num.length).fill(0), ...num];
    const denPad = [...Array(n - den.length).fill(0), ...den];
    const charPoly = denPad.map((d, i) => d + k * (numPad[i] ?? 0));
    gains.push(k);
    allPoles.push(polyRoots(charPoly));
  }
  return { gains, poles: allPoles };
}

// ─── Stability metrics from step response ─────────────────────────────────────

function stepResponseMetrics(signals: number[], time: number[]) {
  const finalVal = signals[signals.length - 1] || 1;
  const peak = Math.max(...signals);
  const overshoot = finalVal !== 0 ? Math.max(0, (peak - finalVal) / Math.abs(finalVal) * 100) : 0;
  const threshold = 0.02 * Math.abs(finalVal);
  let settlingTime = time[time.length - 1];
  for (let i = signals.length - 1; i >= 0; i--) {
    if (Math.abs(signals[i] - finalVal) > threshold) { settlingTime = time[i] || 0; break; }
  }
  return { overshoot, settlingTime };
}

// ─── Main analysis entry ──────────────────────────────────────────────────────

export function analyzeSystem(
  blocks: BlockDef[],
  _wires: Wire[],
  scopeSignals?: { time: number[]; values: number[] }
): SystemAnalysis {
  const tf = extractTF(blocks);

  if (!tf) {
    return {
      poles: [], zeros: [], stable: "stable",
      gainMargin_dB: Infinity, phaseMargin_deg: 90,
      settlingTime: 0, overshoot_pct: 0,
      bodeFreq: [], bodeMag_dB: [], bodePhase_deg: [],
      nyquistRe: [], nyquistIm: [],
      rootLocusGains: [], rootLocusPoles: [],
    };
  }

  const poles = polyRoots(tf.den);
  const zeros = polyRoots(tf.num);
  const maxRe = poles.reduce((m, p) => Math.max(m, p.re), -Infinity);
  const stable = maxRe < -1e-6 ? "stable" : maxRe > 1e-6 ? "unstable" : "marginal";

  const bode = computeBode(tf.num, tf.den);
  const nyq = computeNyquist(tf.num, tf.den);
  const rloc = computeRootLocus(tf.num, tf.den);

  // Gain margin: at phase crossover (phase = -180°)
  let gainMargin_dB = Infinity;
  for (let i = 1; i < bode.phases.length; i++) {
    if (bode.phases[i - 1] > -180 && bode.phases[i] <= -180) {
      gainMargin_dB = -bode.mags[i];
      break;
    }
  }

  // Phase margin: at gain crossover (magnitude = 0 dB)
  let phaseMargin_deg = 90;
  for (let i = 1; i < bode.mags.length; i++) {
    if (bode.mags[i - 1] > 0 && bode.mags[i] <= 0) {
      phaseMargin_deg = 180 + bode.phases[i];
      break;
    }
  }

  const { overshoot, settlingTime } = scopeSignals
    ? stepResponseMetrics(scopeSignals.values, scopeSignals.time)
    : { overshoot: 0, settlingTime: 0 };

  return {
    poles, zeros, stable,
    gainMargin_dB: isFinite(gainMargin_dB) ? parseFloat(gainMargin_dB.toFixed(2)) : Infinity,
    phaseMargin_deg: parseFloat(phaseMargin_deg.toFixed(2)),
    settlingTime: parseFloat(settlingTime.toFixed(3)),
    overshoot_pct: parseFloat(overshoot.toFixed(2)),
    bodeFreq: bode.freqs,
    bodeMag_dB: bode.mags,
    bodePhase_deg: bode.phases,
    nyquistRe: nyq.re,
    nyquistIm: nyq.im,
    rootLocusGains: rloc.gains,
    rootLocusPoles: rloc.poles,
  };
}
