// ============================================================================
// ShilpaSutra CFD Solver - 2D Finite Volume SIMPLE Algorithm Web Worker
// Steady incompressible Navier-Stokes with k-omega SST turbulence
// ============================================================================

/* eslint-disable no-restricted-globals */

const workerSelf = self as unknown as {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage: (msg: unknown, transfer?: ArrayBuffer[]) => void;
};

// ── Types ───────────────────────────────────────────────────────────────────

export interface CFDSolverConfig {
  nx: number;               // grid cells in x
  ny: number;               // grid cells in y
  Lx: number;               // domain length (m)
  Ly: number;               // domain height (m)
  density: number;           // kg/m³
  viscosity: number;         // Pa·s (dynamic)
  inletVelocity: number;    // m/s
  inletTemperature: number;  // K
  wallTemperature: number;   // K
  specificHeat: number;      // J/(kg·K)
  thermalConductivity: number; // W/(m·K)
  maxIterations: number;
  convergenceTol: number;
  turbulenceEnabled: boolean;
  sorOmega: number;          // SOR relaxation (1.0-1.8)
  alphaU: number;            // velocity under-relaxation
  alphaP: number;            // pressure under-relaxation
}

export interface CFDSolverResult {
  u: Float32Array;           // velocity x-component (nx*ny)
  v: Float32Array;           // velocity y-component
  p: Float32Array;           // pressure field
  T: Float32Array;           // temperature field
  turbulenceIntensity: Float32Array;
  k: Float32Array;           // turbulent kinetic energy
  omega: Float32Array;       // specific dissipation rate
  nx: number;
  ny: number;
  Lx: number;
  Ly: number;
  converged: boolean;
  iterations: number;
  residuals: ResidualEntry[];
}

export interface ResidualEntry {
  iteration: number;
  continuity: number;
  xMomentum: number;
  yMomentum: number;
  energy: number;
  kResidual: number;
  omegaResidual: number;
}

// ── Helper: index into flat 2D array ────────────────────────────────────────

function idx(i: number, j: number, ny: number): number {
  return i * ny + j;
}

// ── Gauss-Seidel with SOR ───────────────────────────────────────────────────

function gaussSeidelSOR(
  phi: Float32Array,
  aP: Float32Array,
  aE: Float32Array,
  aW: Float32Array,
  aN: Float32Array,
  aS: Float32Array,
  source: Float32Array,
  nx: number,
  ny: number,
  omega: number,
  sweeps: number
): number {
  let maxResidual = 0;
  for (let sweep = 0; sweep < sweeps; sweep++) {
    maxResidual = 0;
    for (let i = 1; i < nx - 1; i++) {
      for (let j = 1; j < ny - 1; j++) {
        const id = idx(i, j, ny);
        const phiE = phi[idx(i + 1, j, ny)];
        const phiW = phi[idx(i - 1, j, ny)];
        const phiN = phi[idx(i, j + 1, ny)];
        const phiS = phi[idx(i, j - 1, ny)];

        if (Math.abs(aP[id]) < 1e-30) continue;

        const phiNew = (aE[id] * phiE + aW[id] * phiW + aN[id] * phiN + aS[id] * phiS + source[id]) / aP[id];
        const residual = Math.abs(phiNew - phi[id]);
        if (residual > maxResidual) maxResidual = residual;
        phi[id] = phi[id] + omega * (phiNew - phi[id]);
      }
    }
  }
  return maxResidual;
}

// ── k-omega SST turbulence model ────────────────────────────────────────────

interface TurbulenceFields {
  k: Float32Array;
  omega: Float32Array;
  nuT: Float32Array;  // turbulent viscosity
}

function initTurbulence(nx: number, ny: number, Uinlet: number): TurbulenceFields {
  const n = nx * ny;
  const k = new Float32Array(n);
  const omega = new Float32Array(n);
  const nuT = new Float32Array(n);

  const TI = 0.05;  // 5% turbulence intensity
  const kInit = 1.5 * (TI * Uinlet) ** 2;
  const omegaInit = kInit > 0 ? Math.sqrt(kInit) / (0.09 * 0.01) : 100;

  for (let i = 0; i < n; i++) {
    k[i] = Math.max(kInit, 1e-10);
    omega[i] = Math.max(omegaInit, 1);
    nuT[i] = k[i] / omega[i];
  }
  return { k, omega, nuT };
}

function solveTurbulence(
  turb: TurbulenceFields,
  u: Float32Array,
  v: Float32Array,
  nx: number,
  ny: number,
  dx: number,
  dy: number,
  rho: number,
  mu: number,
  sorOmega: number
): { kRes: number; omegaRes: number } {
  const n = nx * ny;
  const betaStar = 0.09;
  const beta1 = 0.075;
  const beta2 = 0.0828;
  const sigmaK1 = 0.85;
  const sigmaK2 = 1.0;
  const sigmaOm1 = 0.5;
  const sigmaOm2 = 0.856;
  const gamma1 = 5 / 9;
  const gamma2 = 0.44;

  const aP = new Float32Array(n);
  const aE = new Float32Array(n);
  const aW = new Float32Array(n);
  const aN = new Float32Array(n);
  const aS = new Float32Array(n);
  const srcK = new Float32Array(n);
  const srcOm = new Float32Array(n);

  // Production term: Pk = nuT * S^2
  for (let i = 1; i < nx - 1; i++) {
    for (let j = 1; j < ny - 1; j++) {
      const id = idx(i, j, ny);
      const dudx = (u[idx(i + 1, j, ny)] - u[idx(i - 1, j, ny)]) / (2 * dx);
      const dudy = (u[idx(i, j + 1, ny)] - u[idx(i, j - 1, ny)]) / (2 * dy);
      const dvdx = (v[idx(i + 1, j, ny)] - v[idx(i - 1, j, ny)]) / (2 * dx);
      const dvdy = (v[idx(i, j + 1, ny)] - v[idx(i, j - 1, ny)]) / (2 * dy);

      const S2 = 2 * dudx * dudx + 2 * dvdy * dvdy + (dudy + dvdx) ** 2;
      const Pk = Math.min(turb.nuT[id] * S2, 10 * betaStar * turb.k[id] * turb.omega[id]);

      // Blending function F1 (simplified)
      const distWall = Math.min(j * dy, (ny - 1 - j) * dy) + 1e-10;
      const arg1a = Math.sqrt(turb.k[id]) / (betaStar * turb.omega[id] * distWall + 1e-20);
      const arg1b = 500 * (mu / rho) / (distWall * distWall * turb.omega[id] + 1e-20);
      const arg1 = Math.min(Math.max(arg1a, arg1b), 10);
      const F1 = Math.tanh(arg1 ** 4);

      const sigmaK = F1 * sigmaK1 + (1 - F1) * sigmaK2;
      const sigmaOm = F1 * sigmaOm1 + (1 - F1) * sigmaOm2;
      const beta = F1 * beta1 + (1 - F1) * beta2;
      const gamma = F1 * gamma1 + (1 - F1) * gamma2;

      const effDiffK = mu + rho * sigmaK * turb.nuT[id];
      const effDiffOm = mu + rho * sigmaOm * turb.nuT[id];

      // k equation coefficients
      const Fe = rho * Math.max(u[id], 0) * dy;
      const Fw = rho * Math.max(-u[idx(i - 1, j, ny)], 0) * dy;
      const Fn = rho * Math.max(v[id], 0) * dx;
      const Fs = rho * Math.max(-v[idx(i, j - 1, ny)], 0) * dx;

      aE[id] = effDiffK * dy / dx + Math.max(-Fe, 0);
      aW[id] = effDiffK * dy / dx + Math.max(Fw, 0);
      aN[id] = effDiffK * dx / dy + Math.max(-Fn, 0);
      aS[id] = effDiffK * dx / dy + Math.max(Fs, 0);

      const destruction = rho * betaStar * turb.omega[id] * dx * dy;
      aP[id] = aE[id] + aW[id] + aN[id] + aS[id] + destruction;
      srcK[id] = Pk * dx * dy;

      // omega equation (reuse coefficient arrays after k solve)
      srcOm[id] = gamma * rho * S2 * dx * dy / (turb.omega[id] + 1e-20);

      // Cross-diffusion term for omega
      const dkdx = (turb.k[idx(i + 1, j, ny)] - turb.k[idx(i - 1, j, ny)]) / (2 * dx);
      const dkdy = (turb.k[idx(i, j + 1, ny)] - turb.k[idx(i, j - 1, ny)]) / (2 * dy);
      const domdx = (turb.omega[idx(i + 1, j, ny)] - turb.omega[idx(i - 1, j, ny)]) / (2 * dx);
      const domdy = (turb.omega[idx(i, j + 1, ny)] - turb.omega[idx(i, j - 1, ny)]) / (2 * dy);
      const CDkw = Math.max(2 * rho * sigmaOm2 * (dkdx * domdx + dkdy * domdy) / (turb.omega[id] + 1e-20), 1e-20);

      srcOm[id] += (1 - F1) * CDkw * dx * dy;

      // Update nuT
      turb.nuT[id] = turb.k[id] / (turb.omega[id] + 1e-20);
    }
  }

  // Solve k
  const kRes = gaussSeidelSOR(turb.k, aP, aE, aW, aN, aS, srcK, nx, ny, sorOmega, 5);

  // Rebuild coefficients for omega equation
  for (let i = 1; i < nx - 1; i++) {
    for (let j = 1; j < ny - 1; j++) {
      const id = idx(i, j, ny);
      const distWall = Math.min(j * dy, (ny - 1 - j) * dy) + 1e-10;
      const arg1a = Math.sqrt(turb.k[id]) / (betaStar * turb.omega[id] * distWall + 1e-20);
      const arg1b = 500 * (mu / rho) / (distWall * distWall * turb.omega[id] + 1e-20);
      const F1 = Math.tanh(Math.min(Math.max(arg1a, arg1b), 10) ** 4);
      const beta = F1 * beta1 + (1 - F1) * beta2;
      const sigmaOm = F1 * sigmaOm1 + (1 - F1) * sigmaOm2;
      const effDiffOm = mu + rho * sigmaOm * turb.nuT[id];

      aE[id] = effDiffOm * dy / dx;
      aW[id] = effDiffOm * dy / dx;
      aN[id] = effDiffOm * dx / dy;
      aS[id] = effDiffOm * dx / dy;
      const destruction = rho * beta * turb.omega[id] * dx * dy;
      aP[id] = aE[id] + aW[id] + aN[id] + aS[id] + destruction;
    }
  }

  const omegaRes = gaussSeidelSOR(turb.omega, aP, aE, aW, aN, aS, srcOm, nx, ny, sorOmega, 5);

  // Enforce positivity and update nuT
  for (let i = 0; i < n; i++) {
    turb.k[i] = Math.max(turb.k[i], 1e-10);
    turb.omega[i] = Math.max(turb.omega[i], 1);
    turb.nuT[i] = turb.k[i] / turb.omega[i];
  }

  return { kRes, omegaRes };
}

// ── SIMPLE Algorithm ────────────────────────────────────────────────────────

function solveSIMPLE(config: CFDSolverConfig): CFDSolverResult {
  const { nx, ny, Lx, Ly, density: rho, viscosity: mu, inletVelocity: Uin,
          inletTemperature: Tin, wallTemperature: Twall,
          specificHeat: cp, thermalConductivity: kTherm,
          maxIterations, convergenceTol, turbulenceEnabled,
          sorOmega, alphaU, alphaP } = config;

  const dx = Lx / (nx - 1);
  const dy = Ly / (ny - 1);
  const n = nx * ny;

  // Field arrays
  const u = new Float32Array(n);
  const v = new Float32Array(n);
  const p = new Float32Array(n);
  const T = new Float32Array(n);
  const pp = new Float32Array(n);  // pressure correction

  // Coefficient arrays
  const aP_u = new Float32Array(n);
  const aE_u = new Float32Array(n);
  const aW_u = new Float32Array(n);
  const aN_u = new Float32Array(n);
  const aS_u = new Float32Array(n);
  const src_u = new Float32Array(n);

  const aP_v = new Float32Array(n);
  const aE_v = new Float32Array(n);
  const aW_v = new Float32Array(n);
  const aN_v = new Float32Array(n);
  const aS_v = new Float32Array(n);
  const src_v = new Float32Array(n);

  const aP_pp = new Float32Array(n);
  const aE_pp = new Float32Array(n);
  const aW_pp = new Float32Array(n);
  const aN_pp = new Float32Array(n);
  const aS_pp = new Float32Array(n);
  const src_pp = new Float32Array(n);

  const aP_T = new Float32Array(n);
  const aE_T = new Float32Array(n);
  const aW_T = new Float32Array(n);
  const aN_T = new Float32Array(n);
  const aS_T = new Float32Array(n);
  const src_T = new Float32Array(n);

  // Initialize fields
  for (let i = 0; i < n; i++) {
    u[i] = Uin * 0.5;
    T[i] = Tin;
  }

  // Boundary conditions: inlet (left wall)
  for (let j = 0; j < ny; j++) {
    u[idx(0, j, ny)] = Uin;
    v[idx(0, j, ny)] = 0;
    T[idx(0, j, ny)] = Tin;
  }
  // Top/bottom walls
  for (let i = 0; i < nx; i++) {
    u[idx(i, 0, ny)] = 0;
    v[idx(i, 0, ny)] = 0;
    u[idx(i, ny - 1, ny)] = 0;
    v[idx(i, ny - 1, ny)] = 0;
    T[idx(i, 0, ny)] = Twall;
    T[idx(i, ny - 1, ny)] = Twall;
  }

  // Turbulence
  let turb: TurbulenceFields | null = null;
  if (turbulenceEnabled) {
    turb = initTurbulence(nx, ny, Uin);
  }

  const residuals: ResidualEntry[] = [];
  let converged = false;
  let iter = 0;

  for (iter = 0; iter < maxIterations; iter++) {
    // ─── Step 1: Assemble and solve momentum (u) ───
    for (let i = 1; i < nx - 1; i++) {
      for (let j = 1; j < ny - 1; j++) {
        const id = idx(i, j, ny);
        const muEff = mu + (turb ? rho * turb.nuT[id] : 0);

        // Diffusion
        const De = muEff * dy / dx;
        const Dw = muEff * dy / dx;
        const Dn = muEff * dx / dy;
        const Ds = muEff * dx / dy;

        // Convection (upwind)
        const Fe = rho * u[idx(i + 1, j, ny)] * dy;
        const Fw = rho * u[idx(i - 1, j, ny)] * dy;
        const Fn = rho * v[idx(i, j + 1, ny)] * dx;
        const Fs = rho * v[idx(i, j - 1, ny)] * dx;

        aE_u[id] = De + Math.max(-Fe, 0);
        aW_u[id] = Dw + Math.max(Fw, 0);
        aN_u[id] = Dn + Math.max(-Fn, 0);
        aS_u[id] = Ds + Math.max(Fs, 0);
        aP_u[id] = aE_u[id] + aW_u[id] + aN_u[id] + aS_u[id] + (Fe - Fw + Fn - Fs);

        // Pressure gradient source
        const dpdx = (p[idx(i + 1, j, ny)] - p[idx(i - 1, j, ny)]) / (2 * dx);
        src_u[id] = -dpdx * dx * dy;

        // Under-relaxation
        aP_u[id] = aP_u[id] / alphaU;
        src_u[id] += (1 - alphaU) * aP_u[id] * u[id];
      }
    }
    const uRes = gaussSeidelSOR(u, aP_u, aE_u, aW_u, aN_u, aS_u, src_u, nx, ny, sorOmega, 10);

    // ─── Step 2: Assemble and solve momentum (v) ───
    for (let i = 1; i < nx - 1; i++) {
      for (let j = 1; j < ny - 1; j++) {
        const id = idx(i, j, ny);
        const muEff = mu + (turb ? rho * turb.nuT[id] : 0);

        const De = muEff * dy / dx;
        const Dw = muEff * dy / dx;
        const Dn = muEff * dx / dy;
        const Ds = muEff * dx / dy;

        const Fe = rho * u[idx(i + 1, j, ny)] * dy;
        const Fw = rho * u[idx(i - 1, j, ny)] * dy;
        const Fn = rho * v[idx(i, j + 1, ny)] * dx;
        const Fs = rho * v[idx(i, j - 1, ny)] * dx;

        aE_v[id] = De + Math.max(-Fe, 0);
        aW_v[id] = Dw + Math.max(Fw, 0);
        aN_v[id] = Dn + Math.max(-Fn, 0);
        aS_v[id] = Ds + Math.max(Fs, 0);
        aP_v[id] = aE_v[id] + aW_v[id] + aN_v[id] + aS_v[id] + (Fe - Fw + Fn - Fs);

        const dpdy = (p[idx(i, j + 1, ny)] - p[idx(i, j - 1, ny)]) / (2 * dy);
        src_v[id] = -dpdy * dx * dy;

        aP_v[id] = aP_v[id] / alphaU;
        src_v[id] += (1 - alphaU) * aP_v[id] * v[id];
      }
    }
    const vRes = gaussSeidelSOR(v, aP_v, aE_v, aW_v, aN_v, aS_v, src_v, nx, ny, sorOmega, 10);

    // ─── Step 3: Pressure correction equation ───
    pp.fill(0);
    let contRes = 0;
    for (let i = 1; i < nx - 1; i++) {
      for (let j = 1; j < ny - 1; j++) {
        const id = idx(i, j, ny);
        const dU = Math.abs(aP_u[id]) > 1e-30 ? dy / aP_u[id] : 0;
        const dV = Math.abs(aP_v[id]) > 1e-30 ? dx / aP_v[id] : 0;

        aE_pp[id] = rho * dU * dy;
        aW_pp[id] = rho * dU * dy;
        aN_pp[id] = rho * dV * dx;
        aS_pp[id] = rho * dV * dx;
        aP_pp[id] = aE_pp[id] + aW_pp[id] + aN_pp[id] + aS_pp[id];

        // Mass imbalance source
        const massIn = rho * u[idx(i - 1, j, ny)] * dy + rho * v[idx(i, j - 1, ny)] * dx;
        const massOut = rho * u[id] * dy + rho * v[id] * dx;
        src_pp[id] = massIn - massOut;
        contRes += Math.abs(src_pp[id]);
      }
    }
    gaussSeidelSOR(pp, aP_pp, aE_pp, aW_pp, aN_pp, aS_pp, src_pp, nx, ny, sorOmega, 20);

    // ─── Step 4: Correct pressure and velocities ───
    for (let i = 1; i < nx - 1; i++) {
      for (let j = 1; j < ny - 1; j++) {
        const id = idx(i, j, ny);
        p[id] += alphaP * pp[id];

        if (Math.abs(aP_u[id]) > 1e-30) {
          u[id] += dy * (pp[idx(i - 1, j, ny)] - pp[idx(i + 1, j, ny)]) / (2 * aP_u[id]);
        }
        if (Math.abs(aP_v[id]) > 1e-30) {
          v[id] += dx * (pp[idx(i, j - 1, ny)] - pp[idx(i, j + 1, ny)]) / (2 * aP_v[id]);
        }
      }
    }

    // ─── Step 5: Solve energy equation ───
    for (let i = 1; i < nx - 1; i++) {
      for (let j = 1; j < ny - 1; j++) {
        const id = idx(i, j, ny);
        const kEff = kTherm + (turb ? rho * cp * turb.nuT[id] / 0.85 : 0);

        const De = kEff * dy / dx;
        const Dw = kEff * dy / dx;
        const Dn = kEff * dx / dy;
        const Ds = kEff * dx / dy;

        const Fe = rho * cp * u[idx(i + 1, j, ny)] * dy;
        const Fw = rho * cp * u[idx(i - 1, j, ny)] * dy;
        const Fn = rho * cp * v[idx(i, j + 1, ny)] * dx;
        const Fs = rho * cp * v[idx(i, j - 1, ny)] * dx;

        aE_T[id] = De + Math.max(-Fe, 0);
        aW_T[id] = Dw + Math.max(Fw, 0);
        aN_T[id] = Dn + Math.max(-Fn, 0);
        aS_T[id] = Ds + Math.max(Fs, 0);
        aP_T[id] = aE_T[id] + aW_T[id] + aN_T[id] + aS_T[id] + (Fe - Fw + Fn - Fs);
        src_T[id] = 0;
      }
    }
    const tRes = gaussSeidelSOR(T, aP_T, aE_T, aW_T, aN_T, aS_T, src_T, nx, ny, sorOmega, 10);

    // Re-apply BCs
    for (let j = 0; j < ny; j++) {
      u[idx(0, j, ny)] = Uin;
      v[idx(0, j, ny)] = 0;
      T[idx(0, j, ny)] = Tin;
      // Outlet: zero-gradient
      u[idx(nx - 1, j, ny)] = u[idx(nx - 2, j, ny)];
      v[idx(nx - 1, j, ny)] = v[idx(nx - 2, j, ny)];
      p[idx(nx - 1, j, ny)] = 0; // reference pressure
      T[idx(nx - 1, j, ny)] = T[idx(nx - 2, j, ny)];
    }
    for (let i = 0; i < nx; i++) {
      u[idx(i, 0, ny)] = 0;
      v[idx(i, 0, ny)] = 0;
      u[idx(i, ny - 1, ny)] = 0;
      v[idx(i, ny - 1, ny)] = 0;
      T[idx(i, 0, ny)] = Twall;
      T[idx(i, ny - 1, ny)] = Twall;
    }

    // ─── Step 6: Solve turbulence ───
    let kRes = 0, omegaRes = 0;
    if (turb && turbulenceEnabled) {
      const turbRes = solveTurbulence(turb, u, v, nx, ny, dx, dy, rho, mu, sorOmega);
      kRes = turbRes.kRes;
      omegaRes = turbRes.omegaRes;
    }

    // Record residuals
    const entry: ResidualEntry = {
      iteration: iter,
      continuity: contRes / (n + 1e-20),
      xMomentum: uRes,
      yMomentum: vRes,
      energy: tRes,
      kResidual: kRes,
      omegaResidual: omegaRes,
    };
    residuals.push(entry);

    // Progress callback every 10 iterations
    if (iter % 10 === 0) {
      workerSelf.postMessage({
        type: "progress",
        iteration: iter,
        maxIterations,
        residual: entry,
      });
    }

    // Check convergence
    if (entry.continuity < convergenceTol && entry.xMomentum < convergenceTol && entry.yMomentum < convergenceTol) {
      converged = true;
      break;
    }
  }

  // Compute turbulence intensity field
  const turbulenceIntensity = new Float32Array(n);
  if (turb) {
    for (let i = 0; i < n; i++) {
      const Umag = Math.sqrt(u[i] * u[i] + v[i] * v[i]) + 1e-20;
      turbulenceIntensity[i] = Math.sqrt(2 * turb.k[i] / 3) / Umag;
    }
  }

  return {
    u, v, p, T, turbulenceIntensity,
    k: turb ? turb.k : new Float32Array(n),
    omega: turb ? turb.omega : new Float32Array(n),
    nx, ny, Lx, Ly,
    converged,
    iterations: iter,
    residuals,
  };
}

// ── Web Worker Message Handler ──────────────────────────────────────────────

workerSelf.onmessage = (e: MessageEvent) => {
  const { type, config } = e.data;

  if (type === "solve") {
    try {
      const result = solveSIMPLE(config as CFDSolverConfig);

      // Transfer ArrayBuffers for zero-copy
      workerSelf.postMessage(
        { type: "result", result },
        [
          result.u.buffer as ArrayBuffer,
          result.v.buffer as ArrayBuffer,
          result.p.buffer as ArrayBuffer,
          result.T.buffer as ArrayBuffer,
          result.turbulenceIntensity.buffer as ArrayBuffer,
          result.k.buffer as ArrayBuffer,
          result.omega.buffer as ArrayBuffer,
        ]
      );
    } catch (err) {
      workerSelf.postMessage({ type: "error", message: String(err) });
    }
  }
};
