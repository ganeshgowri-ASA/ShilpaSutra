// ============================================================================
// ShilpaSutra CFD Turbulence Models
// k-epsilon, k-omega SST, Spalart-Allmaras implementations
// ============================================================================

import type { CFDGrid2D, CFDParams2D } from "./cfd-engine";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type TurbulenceModelType =
  | "laminar"
  | "k-epsilon"
  | "k-omega-sst"
  | "spalart-allmaras";

export interface TurbulenceState {
  /** Turbulent kinetic energy k [m²/s²] */
  k: Float64Array;
  /** Turbulent dissipation rate epsilon [m²/s³] (k-epsilon) */
  epsilon: Float64Array;
  /** Specific dissipation rate omega [1/s] (k-omega SST) */
  omega: Float64Array;
  /** Modified eddy viscosity nu_tilde [m²/s] (Spalart-Allmaras) */
  nuTilde: Float64Array;
  /** Effective (turbulent) eddy viscosity nu_t [m²/s] */
  nuT: Float64Array;
  /** Turbulence intensity field [fraction 0-1] */
  intensity: Float64Array;
}

export interface TurbulenceConstants {
  // k-epsilon constants
  Cmu: number;
  C1e: number;
  C2e: number;
  sigmaK: number;
  sigmaE: number;
  // k-omega SST constants
  betaStar: number;
  alpha1: number;
  beta1: number;
  sigmaK1: number;
  sigmaW1: number;
  alpha2: number;
  beta2: number;
  sigmaK2: number;
  sigmaW2: number;
  a1: number;
  // Spalart-Allmaras constants
  cb1: number;
  cb2: number;
  cv1: number;
  sigma_sa: number;
  kappa: number;
  cw2: number;
  cw3: number;
}

// Standard turbulence model constants
export const TURBULENCE_CONSTANTS: TurbulenceConstants = {
  // Standard k-epsilon (Launder & Spalding 1974)
  Cmu: 0.09,
  C1e: 1.44,
  C2e: 1.92,
  sigmaK: 1.0,
  sigmaE: 1.3,
  // k-omega SST (Menter 1994)
  betaStar: 0.09,
  alpha1: 5 / 9,
  beta1: 3 / 40,
  sigmaK1: 0.85,
  sigmaW1: 0.5,
  alpha2: 0.44,
  beta2: 0.0828,
  sigmaK2: 1.0,
  sigmaW2: 0.856,
  a1: 0.31,
  // Spalart-Allmaras
  cb1: 0.1355,
  cb2: 0.622,
  cv1: 7.1,
  sigma_sa: 2 / 3,
  kappa: 0.41,
  cw2: 0.3,
  cw3: 2.0,
};

// ----------------------------------------------------------------------------
// Initialization
// ----------------------------------------------------------------------------

export function createTurbulenceState(nx: number, ny: number): TurbulenceState {
  const n = nx * ny;
  return {
    k: new Float64Array(n),
    epsilon: new Float64Array(n),
    omega: new Float64Array(n),
    nuTilde: new Float64Array(n),
    nuT: new Float64Array(n),
    intensity: new Float64Array(n),
  };
}

/**
 * Initialize turbulence fields from inlet conditions.
 * k = 1.5 * (U * I)^2
 * epsilon = Cmu^0.75 * k^1.5 / l_mix
 * omega = k^0.5 / (Cmu^0.25 * l_mix)
 */
export function initializeTurbulence(
  state: TurbulenceState,
  nx: number,
  ny: number,
  inletVelocity: number,
  turbulenceIntensity: number,
  hydraulicDiameter: number,
): void {
  const C = TURBULENCE_CONSTANTS;
  const I = Math.max(0.001, turbulenceIntensity);
  const U = Math.abs(inletVelocity);
  const lMix = 0.07 * hydraulicDiameter;

  const kInit = 1.5 * Math.pow(U * I, 2);
  const epsInit = Math.pow(C.Cmu, 0.75) * Math.pow(kInit, 1.5) / Math.max(lMix, 1e-10);
  const omegaInit = Math.pow(kInit, 0.5) / (Math.pow(C.Cmu, 0.25) * Math.max(lMix, 1e-10));
  const nuTildeInit = Math.sqrt(1.5) * U * I * lMix;

  for (let idx = 0; idx < nx * ny; idx++) {
    state.k[idx] = kInit;
    state.epsilon[idx] = epsInit;
    state.omega[idx] = omegaInit;
    state.nuTilde[idx] = nuTildeInit;
    state.nuT[idx] = C.Cmu * kInit * kInit / Math.max(epsInit, 1e-20);
    state.intensity[idx] = I;
  }
}

// ----------------------------------------------------------------------------
// k-epsilon Model
// ----------------------------------------------------------------------------

/**
 * Solve one iteration of the standard k-epsilon turbulence model.
 *
 * Transport equations:
 *   Dk/Dt = P_k - epsilon + d/dx_j[(nu + nu_t/sigma_k) dk/dx_j]
 *   De/Dt = C1e * epsilon/k * P_k - C2e * epsilon²/k + d/dx_j[(nu + nu_t/sigma_e) de/dx_j]
 *
 * Production term P_k = nu_t * S² where S is the strain rate magnitude.
 */
export function solveKEpsilon(
  state: TurbulenceState,
  grid: CFDGrid2D,
  params: CFDParams2D,
  alphaK: number = 0.7,
  alphaE: number = 0.7,
): void {
  const { nx, ny, dx, dy } = grid;
  const C = TURBULENCE_CONSTANTS;
  const nu = params.viscosity / params.density;
  const rho = params.density;

  const uIdx = (i: number, j: number) => j * (nx + 1) + i;
  const vIdx = (i: number, j: number) => j * nx + i;
  const pIdx = (i: number, j: number) => j * nx + i;

  for (let j = 1; j < ny - 1; j++) {
    for (let i = 1; i < nx - 1; i++) {
      const idx = pIdx(i, j);

      // Velocity gradients (central differences on cell centers)
      const uE = 0.5 * (grid.u[uIdx(i + 1, j)] + grid.u[uIdx(i + 2 <= nx ? i + 2 : i + 1, j)]);
      const uW = 0.5 * (grid.u[uIdx(i, j)] + grid.u[uIdx(i - 1 >= 0 ? i - 1 : 0, j)]);
      const vN = 0.5 * (grid.v[vIdx(i, j + 1)] + grid.v[vIdx(i, j + 2 <= ny ? j + 2 : j + 1)]);
      const vS = 0.5 * (grid.v[vIdx(i, j)] + grid.v[vIdx(i, j - 1 >= 0 ? j - 1 : 0)]);

      const dudx = (uE - uW) / (2 * dx);
      const dvdy = (vN - vS) / (2 * dy);

      const uN = 0.5 * (grid.u[uIdx(i, Math.min(j + 1, ny - 1))] + grid.u[uIdx(i + 1, Math.min(j + 1, ny - 1))]);
      const uS = 0.5 * (grid.u[uIdx(i, Math.max(j - 1, 0))] + grid.u[uIdx(i + 1, Math.max(j - 1, 0))]);
      const vE = 0.5 * (grid.v[vIdx(Math.min(i + 1, nx - 1), j)] + grid.v[vIdx(Math.min(i + 1, nx - 1), j + 1)]);
      const vW = 0.5 * (grid.v[vIdx(Math.max(i - 1, 0), j)] + grid.v[vIdx(Math.max(i - 1, 0), j + 1)]);

      const dudy = (uN - uS) / (2 * dy);
      const dvdx = (vE - vW) / (2 * dx);

      // Strain rate magnitude S = sqrt(2 * S_ij * S_ij)
      const S2 = 2 * (dudx * dudx + dvdy * dvdy) + (dudy + dvdx) * (dudy + dvdx);
      const S = Math.sqrt(Math.max(S2, 0));

      const nuT_local = state.nuT[idx];
      const k_c = Math.max(state.k[idx], 1e-10);
      const eps_c = Math.max(state.epsilon[idx], 1e-10);

      // Production P_k = nu_t * S^2
      const Pk = nuT_local * S2;

      // Diffusion of k
      const kE = state.k[pIdx(i + 1, j)];
      const kW = state.k[pIdx(i - 1, j)];
      const kN = state.k[pIdx(i, j + 1)];
      const kS = state.k[pIdx(i, j - 1)];
      const diffK = (nu + nuT_local / C.sigmaK) * ((kE - 2 * k_c + kW) / (dx * dx) + (kN - 2 * k_c + kS) / (dy * dy));

      // k equation: dk/dt = Pk - epsilon + diffusion
      const kNew = k_c + alphaK * (Pk - eps_c + diffK);
      state.k[idx] = Math.max(kNew, 1e-10);

      // Diffusion of epsilon
      const eE = state.epsilon[pIdx(i + 1, j)];
      const eW = state.epsilon[pIdx(i - 1, j)];
      const eN = state.epsilon[pIdx(i, j + 1)];
      const eS = state.epsilon[pIdx(i, j - 1)];
      const diffE = (nu + nuT_local / C.sigmaE) * ((eE - 2 * eps_c + eW) / (dx * dx) + (eN - 2 * eps_c + eS) / (dy * dy));

      // epsilon equation
      const epsNew = eps_c + alphaE * (C.C1e * eps_c / k_c * Pk - C.C2e * eps_c * eps_c / k_c + diffE);
      state.epsilon[idx] = Math.max(epsNew, 1e-10);

      // Update eddy viscosity: nu_t = Cmu * k² / epsilon
      state.nuT[idx] = C.Cmu * state.k[idx] * state.k[idx] / state.epsilon[idx];

      // Turbulence intensity: I = sqrt(2k/3) / U_ref
      const Uref = Math.max(Math.abs(params.inletVelocity), 1e-6);
      state.intensity[idx] = Math.sqrt(2 * state.k[idx] / 3) / Uref;
    }
  }
}

// ----------------------------------------------------------------------------
// k-omega SST Model (Menter 1994)
// ----------------------------------------------------------------------------

/**
 * Solve one iteration of the k-omega SST turbulence model.
 *
 * Blends k-omega (near wall) with k-epsilon (free stream) using
 * blending functions F1 and F2.
 *
 * Dk/Dt = P_k - beta* * omega * k + d/dx_j[(nu + sigma_k * nu_t) dk/dx_j]
 * Domega/Dt = alpha * S² - beta * omega² + d/dx_j[(nu + sigma_w * nu_t) domega/dx_j] + CDkw
 */
export function solveKOmegaSST(
  state: TurbulenceState,
  grid: CFDGrid2D,
  params: CFDParams2D,
  wallDistance: Float64Array,
  alphaK: number = 0.6,
  alphaW: number = 0.6,
): void {
  const { nx, ny, dx, dy } = grid;
  const C = TURBULENCE_CONSTANTS;
  const nu = params.viscosity / params.density;

  const pIdx = (i: number, j: number) => j * nx + i;
  const uIdx = (i: number, j: number) => j * (nx + 1) + i;
  const vIdx = (i: number, j: number) => j * nx + i;

  for (let j = 1; j < ny - 1; j++) {
    for (let i = 1; i < nx - 1; i++) {
      const idx = pIdx(i, j);
      const d = Math.max(wallDistance[idx], 1e-10);

      const k_c = Math.max(state.k[idx], 1e-10);
      const omega_c = Math.max(state.omega[idx], 1e-10);
      const nuT_local = state.nuT[idx];

      // Velocity gradients
      const uE = 0.5 * (grid.u[uIdx(i + 1, j)] + grid.u[uIdx(Math.min(i + 2, nx), j)]);
      const uW = 0.5 * (grid.u[uIdx(i, j)] + grid.u[uIdx(Math.max(i - 1, 0), j)]);
      const vN = 0.5 * (grid.v[vIdx(i, j + 1)] + grid.v[vIdx(i, Math.min(j + 2, ny))]);
      const vS = 0.5 * (grid.v[vIdx(i, j)] + grid.v[vIdx(i, Math.max(j - 1, 0))]);
      const dudx = (uE - uW) / (2 * dx);
      const dvdy = (vN - vS) / (2 * dy);

      const uN = 0.5 * (grid.u[uIdx(i, Math.min(j + 1, ny - 1))] + grid.u[uIdx(i + 1, Math.min(j + 1, ny - 1))]);
      const uS = 0.5 * (grid.u[uIdx(i, Math.max(j - 1, 0))] + grid.u[uIdx(i + 1, Math.max(j - 1, 0))]);
      const vE = 0.5 * (grid.v[vIdx(Math.min(i + 1, nx - 1), j)] + grid.v[vIdx(Math.min(i + 1, nx - 1), j + 1)]);
      const vW = 0.5 * (grid.v[vIdx(Math.max(i - 1, 0), j)] + grid.v[vIdx(Math.max(i - 1, 0), j + 1)]);
      const dudy = (uN - uS) / (2 * dy);
      const dvdx = (vE - vW) / (2 * dx);

      const S2 = 2 * (dudx * dudx + dvdy * dvdy) + (dudy + dvdx) * (dudy + dvdx);

      // Cross-diffusion term CDkw
      const dkdx = (state.k[pIdx(i + 1, j)] - state.k[pIdx(i - 1, j)]) / (2 * dx);
      const dkdy = (state.k[pIdx(i, j + 1)] - state.k[pIdx(i, j - 1)]) / (2 * dy);
      const dwdx = (state.omega[pIdx(i + 1, j)] - state.omega[pIdx(i - 1, j)]) / (2 * dx);
      const dwdy = (state.omega[pIdx(i, j + 1)] - state.omega[pIdx(i, j - 1)]) / (2 * dy);
      const CDkw = Math.max(2 * params.density * C.sigmaW2 / omega_c * (dkdx * dwdx + dkdy * dwdy), 1e-20);

      // Blending function F1
      const arg1_1 = Math.sqrt(k_c) / (C.betaStar * omega_c * d);
      const arg1_2 = 500 * nu / (d * d * omega_c);
      const arg1_3 = 4 * params.density * C.sigmaW2 * k_c / (CDkw * d * d);
      const arg1 = Math.min(Math.max(arg1_1, arg1_2), arg1_3);
      const F1 = Math.tanh(Math.pow(arg1, 4));

      // Blended coefficients
      const alpha = F1 * C.alpha1 + (1 - F1) * C.alpha2;
      const beta = F1 * C.beta1 + (1 - F1) * C.beta2;
      const sigmaK = F1 * C.sigmaK1 + (1 - F1) * C.sigmaK2;
      const sigmaW = F1 * C.sigmaW1 + (1 - F1) * C.sigmaW2;

      // Blending function F2 (for eddy viscosity limiter)
      const arg2 = Math.max(2 * Math.sqrt(k_c) / (C.betaStar * omega_c * d), 500 * nu / (d * d * omega_c));
      const F2 = Math.tanh(arg2 * arg2);

      // Production (limited to 10 * beta* * k * omega)
      const Pk = Math.min(nuT_local * S2, 10 * C.betaStar * k_c * omega_c);

      // k equation diffusion
      const kE = state.k[pIdx(i + 1, j)];
      const kW_v = state.k[pIdx(i - 1, j)];
      const kN = state.k[pIdx(i, j + 1)];
      const kS = state.k[pIdx(i, j - 1)];
      const diffK = (nu + sigmaK * nuT_local) * ((kE - 2 * k_c + kW_v) / (dx * dx) + (kN - 2 * k_c + kS) / (dy * dy));

      const kNew = k_c + alphaK * (Pk - C.betaStar * omega_c * k_c + diffK);
      state.k[idx] = Math.max(kNew, 1e-10);

      // omega equation diffusion
      const wE = state.omega[pIdx(i + 1, j)];
      const wW = state.omega[pIdx(i - 1, j)];
      const wN = state.omega[pIdx(i, j + 1)];
      const wS = state.omega[pIdx(i, j - 1)];
      const diffW = (nu + sigmaW * nuT_local) * ((wE - 2 * omega_c + wW) / (dx * dx) + (wN - 2 * omega_c + wS) / (dy * dy));

      const crossDiff = (1 - F1) * CDkw / params.density;
      const omegaNew = omega_c + alphaW * (alpha * S2 - beta * omega_c * omega_c + diffW + crossDiff);
      state.omega[idx] = Math.max(omegaNew, 1e-10);

      // SST eddy viscosity: nu_t = a1 * k / max(a1 * omega, S * F2)
      const Smag = Math.sqrt(Math.max(S2, 0));
      state.nuT[idx] = C.a1 * state.k[idx] / Math.max(C.a1 * state.omega[idx], Smag * F2);

      const Uref = Math.max(Math.abs(params.inletVelocity), 1e-6);
      state.intensity[idx] = Math.sqrt(2 * state.k[idx] / 3) / Uref;
    }
  }
}

// ----------------------------------------------------------------------------
// Spalart-Allmaras Model
// ----------------------------------------------------------------------------

/**
 * Solve one iteration of the Spalart-Allmaras one-equation turbulence model.
 *
 * D(nuTilde)/Dt = cb1 * S_tilde * nuTilde
 *               - cw1 * fw * (nuTilde/d)²
 *               + (1/sigma) * d/dx_j[(nu + nuTilde) * d(nuTilde)/dx_j]
 *               + (cb2/sigma) * (d(nuTilde)/dx_j)²
 */
export function solveSpalartAllmaras(
  state: TurbulenceState,
  grid: CFDGrid2D,
  params: CFDParams2D,
  wallDistance: Float64Array,
  alphaNu: number = 0.7,
): void {
  const { nx, ny, dx, dy } = grid;
  const C = TURBULENCE_CONSTANTS;
  const nu = params.viscosity / params.density;

  const pIdx = (i: number, j: number) => j * nx + i;
  const uIdx = (i: number, j: number) => j * (nx + 1) + i;
  const vIdx = (i: number, j: number) => j * nx + i;

  const cw1 = C.cb1 / (C.kappa * C.kappa) + (1 + C.cb2) / C.sigma_sa;

  for (let j = 1; j < ny - 1; j++) {
    for (let i = 1; i < nx - 1; i++) {
      const idx = pIdx(i, j);
      const d = Math.max(wallDistance[idx], 1e-10);
      const nuTilde_c = Math.max(state.nuTilde[idx], 1e-12);

      // chi = nuTilde / nu
      const chi = nuTilde_c / nu;
      const chi3 = chi * chi * chi;
      const fv1 = chi3 / (chi3 + C.cv1 * C.cv1 * C.cv1);
      const fv2 = 1 - chi / (1 + chi * fv1);

      // Vorticity magnitude (strain rate proxy)
      const uN = 0.5 * (grid.u[uIdx(i, Math.min(j + 1, ny - 1))] + grid.u[uIdx(i + 1, Math.min(j + 1, ny - 1))]);
      const uS = 0.5 * (grid.u[uIdx(i, Math.max(j - 1, 0))] + grid.u[uIdx(i + 1, Math.max(j - 1, 0))]);
      const vE = 0.5 * (grid.v[vIdx(Math.min(i + 1, nx - 1), j)] + grid.v[vIdx(Math.min(i + 1, nx - 1), j + 1)]);
      const vW = 0.5 * (grid.v[vIdx(Math.max(i - 1, 0), j)] + grid.v[vIdx(Math.max(i - 1, 0), j + 1)]);
      const dudy = (uN - uS) / (2 * dy);
      const dvdx = (vE - vW) / (2 * dx);
      const Omega = Math.abs(dudy - dvdx);

      // Modified vorticity
      const Stilde = Math.max(Omega + nuTilde_c * fv2 / (C.kappa * C.kappa * d * d), 1e-10);

      // Wall destruction function
      const r = Math.min(nuTilde_c / (Stilde * C.kappa * C.kappa * d * d), 10);
      const g = r + C.cw2 * (Math.pow(r, 6) - r);
      const cw3_6 = Math.pow(C.cw3, 6);
      const fw = g * Math.pow((1 + cw3_6) / (Math.pow(g, 6) + cw3_6), 1 / 6);

      // Production
      const production = C.cb1 * Stilde * nuTilde_c;

      // Destruction
      const destruction = cw1 * fw * (nuTilde_c / d) * (nuTilde_c / d);

      // Diffusion
      const nuE = state.nuTilde[pIdx(i + 1, j)];
      const nuW = state.nuTilde[pIdx(i - 1, j)];
      const nuN = state.nuTilde[pIdx(i, j + 1)];
      const nuS = state.nuTilde[pIdx(i, j - 1)];
      const diffusion = (1 / C.sigma_sa) * (nu + nuTilde_c)
        * ((nuE - 2 * nuTilde_c + nuW) / (dx * dx) + (nuN - 2 * nuTilde_c + nuS) / (dy * dy));

      // Gradient squared term
      const dndx = (nuE - nuW) / (2 * dx);
      const dndy = (nuN - nuS) / (2 * dy);
      const gradSq = (C.cb2 / C.sigma_sa) * (dndx * dndx + dndy * dndy);

      // Update
      const nuTildeNew = nuTilde_c + alphaNu * (production - destruction + diffusion + gradSq);
      state.nuTilde[idx] = Math.max(nuTildeNew, 1e-12);

      // Eddy viscosity: nu_t = nuTilde * fv1
      const chiNew = state.nuTilde[idx] / nu;
      const chiNew3 = chiNew * chiNew * chiNew;
      const fv1New = chiNew3 / (chiNew3 + C.cv1 * C.cv1 * C.cv1);
      state.nuT[idx] = state.nuTilde[idx] * fv1New;
      state.k[idx] = state.nuT[idx] * Stilde; // approximate k from nu_t and S

      const Uref = Math.max(Math.abs(params.inletVelocity), 1e-6);
      state.intensity[idx] = Math.sqrt(2 * Math.max(state.k[idx], 0) / 3) / Uref;
    }
  }
}

// ----------------------------------------------------------------------------
// Wall Distance Computation
// ----------------------------------------------------------------------------

/**
 * Compute the minimum distance from each cell center to the nearest wall.
 * Walls are identified as the top/bottom boundaries (j=0, j=ny-1).
 */
export function computeWallDistance(nx: number, ny: number, dy: number): Float64Array {
  const wallDist = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const dBot = (j + 0.5) * dy;
    const dTop = (ny - j - 0.5) * dy;
    const d = Math.min(dBot, dTop);
    for (let i = 0; i < nx; i++) {
      wallDist[j * nx + i] = d;
    }
  }
  return wallDist;
}

// ----------------------------------------------------------------------------
// Dispatcher
// ----------------------------------------------------------------------------

/**
 * Solve one turbulence iteration based on the selected model.
 */
export function solveTurbulenceStep(
  model: TurbulenceModelType,
  state: TurbulenceState,
  grid: CFDGrid2D,
  params: CFDParams2D,
  wallDistance: Float64Array,
): void {
  switch (model) {
    case "k-epsilon":
      solveKEpsilon(state, grid, params);
      break;
    case "k-omega-sst":
      solveKOmegaSST(state, grid, params, wallDistance);
      break;
    case "spalart-allmaras":
      solveSpalartAllmaras(state, grid, params, wallDistance);
      break;
    case "laminar":
    default:
      // No turbulence model - nuT = 0
      state.nuT.fill(0);
      state.k.fill(0);
      state.intensity.fill(0);
      break;
  }
}

/**
 * Get human-readable description for a turbulence model.
 */
export function getTurbulenceModelInfo(model: TurbulenceModelType): {
  name: string;
  description: string;
  recommended: string;
  yPlusRange: [number, number];
} {
  switch (model) {
    case "k-epsilon":
      return {
        name: "Standard k-epsilon",
        description: "Two-equation RANS model. Good for fully turbulent flows away from walls.",
        recommended: "Internal flows, mixing, free shear flows",
        yPlusRange: [30, 300],
      };
    case "k-omega-sst":
      return {
        name: "k-omega SST (Menter)",
        description: "Blends k-omega near walls with k-epsilon in free stream. Best general-purpose RANS model.",
        recommended: "External aerodynamics, separated flows, adverse pressure gradients",
        yPlusRange: [1, 5],
      };
    case "spalart-allmaras":
      return {
        name: "Spalart-Allmaras",
        description: "One-equation model designed for aerospace applications.",
        recommended: "External aerodynamics, thin boundary layers, attached flows",
        yPlusRange: [1, 5],
      };
    default:
      return {
        name: "Laminar",
        description: "No turbulence model. Solves Navier-Stokes directly.",
        recommended: "Low Reynolds number flows (Re < 2300), creeping flows",
        yPlusRange: [0, 0],
      };
  }
}
