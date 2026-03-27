// ============================================================================
// ShilpaSutra CFD Post-Processing
// Velocity vectors, pressure contours, streamlines, section cuts, force reports
// ============================================================================

import type { CFDGrid2D } from "./cfd-engine";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface VectorGlyph {
  /** Position in grid coordinates */
  x: number;
  y: number;
  /** Velocity components */
  u: number;
  v: number;
  /** Velocity magnitude */
  magnitude: number;
  /** Color mapped from magnitude [0-1] */
  colorT: number;
}

export interface ContourCell {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  /** Normalized value for color mapping [0-1] */
  colorT: number;
}

export interface StreamlinePath2D {
  points: { x: number; y: number }[];
  magnitudes: number[];
}

export interface SectionCutResult {
  /** Position along cut axis */
  positions: number[];
  /** Field values along the cut */
  values: number[];
  /** Cut plane description */
  label: string;
}

export interface ForceCoefficients {
  dragCoefficient: number;
  liftCoefficient: number;
  pressureDrag: number;
  frictionDrag: number;
  pressureLift: number;
  totalDrag: number;
  totalLift: number;
  momentCoefficient: number;
}

export interface YPlusDistribution {
  /** Cell index along wall */
  positions: number[];
  /** Y+ values */
  values: number[];
  /** Statistics */
  min: number;
  max: number;
  avg: number;
  /** Whether Y+ is acceptable for the turbulence model */
  acceptable: boolean;
  recommendation: string;
}

// ----------------------------------------------------------------------------
// Velocity Vector Field
// ----------------------------------------------------------------------------

/**
 * Extract velocity vectors on a subsampled grid for visualization.
 * Returns arrow glyphs with position, direction, and color-mapped magnitude.
 */
export function extractVelocityVectors(
  grid: CFDGrid2D,
  skipX: number = 2,
  skipY: number = 2,
): VectorGlyph[] {
  const { nx, ny, dx, dy } = grid;
  const uIdx = (i: number, j: number) => j * (nx + 1) + i;
  const vIdx = (i: number, j: number) => j * nx + i;

  const vectors: VectorGlyph[] = [];
  let maxMag = 0;

  // First pass: compute magnitudes
  const mags: { x: number; y: number; u: number; v: number; mag: number }[] = [];
  for (let j = 0; j < ny; j += skipY) {
    for (let i = 0; i < nx; i += skipX) {
      const u = 0.5 * (grid.u[uIdx(i, j)] + grid.u[uIdx(i + 1, j)]);
      const v = 0.5 * (grid.v[vIdx(i, j)] + grid.v[vIdx(i, j + 1)]);
      const mag = Math.sqrt(u * u + v * v);
      maxMag = Math.max(maxMag, mag);
      mags.push({ x: (i + 0.5) * dx, y: (j + 0.5) * dy, u, v, mag });
    }
  }

  // Second pass: normalize colors
  for (const m of mags) {
    vectors.push({
      x: m.x,
      y: m.y,
      u: m.u,
      v: m.v,
      magnitude: m.mag,
      colorT: maxMag > 0 ? m.mag / maxMag : 0,
    });
  }

  return vectors;
}

// ----------------------------------------------------------------------------
// Pressure Contours
// ----------------------------------------------------------------------------

/**
 * Extract pressure field as contour cells for visualization.
 */
export function extractPressureContours(
  grid: CFDGrid2D,
  skipX: number = 1,
  skipY: number = 1,
): ContourCell[] {
  const { nx, ny, dx, dy } = grid;
  const pIdx = (i: number, j: number) => j * nx + i;

  let minP = Infinity, maxP = -Infinity;
  for (let k = 0; k < grid.p.length; k++) {
    if (grid.p[k] < minP) minP = grid.p[k];
    if (grid.p[k] > maxP) maxP = grid.p[k];
  }
  const range = maxP - minP || 1;

  const cells: ContourCell[] = [];
  for (let j = 0; j < ny; j += skipY) {
    for (let i = 0; i < nx; i += skipX) {
      const val = grid.p[pIdx(i, j)];
      cells.push({
        x: i * dx,
        y: j * dy,
        width: dx * skipX,
        height: dy * skipY,
        value: val,
        colorT: (val - minP) / range,
      });
    }
  }

  return cells;
}

/**
 * Extract temperature field as contour cells.
 */
export function extractTemperatureContours(
  grid: CFDGrid2D,
  skipX: number = 1,
  skipY: number = 1,
): ContourCell[] {
  const { nx, ny, dx, dy } = grid;
  const pIdx = (i: number, j: number) => j * nx + i;

  let minT = Infinity, maxT = -Infinity;
  for (let k = 0; k < grid.T.length; k++) {
    if (grid.T[k] < minT) minT = grid.T[k];
    if (grid.T[k] > maxT) maxT = grid.T[k];
  }
  const range = maxT - minT || 1;

  const cells: ContourCell[] = [];
  for (let j = 0; j < ny; j += skipY) {
    for (let i = 0; i < nx; i += skipX) {
      const val = grid.T[pIdx(i, j)];
      cells.push({
        x: i * dx,
        y: j * dy,
        width: dx * skipX,
        height: dy * skipY,
        value: val,
        colorT: (val - minT) / range,
      });
    }
  }

  return cells;
}

/**
 * Extract turbulence intensity contours from a turbulence intensity field.
 */
export function extractTurbulenceIntensityContours(
  intensity: Float64Array,
  nx: number,
  ny: number,
  dx: number,
  dy: number,
): ContourCell[] {
  let minI = Infinity, maxI = -Infinity;
  for (let k = 0; k < intensity.length; k++) {
    if (intensity[k] < minI) minI = intensity[k];
    if (intensity[k] > maxI) maxI = intensity[k];
  }
  const range = maxI - minI || 1;

  const cells: ContourCell[] = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const val = intensity[j * nx + i];
      cells.push({
        x: i * dx,
        y: j * dy,
        width: dx,
        height: dy,
        value: val,
        colorT: (val - minI) / range,
      });
    }
  }
  return cells;
}

// ----------------------------------------------------------------------------
// Streamlines (2D, RK4 integration)
// ----------------------------------------------------------------------------

/**
 * Compute streamlines by integrating velocity field from seed points.
 * Uses bilinear interpolation and 4th-order Runge-Kutta.
 */
export function computeStreamlines(
  grid: CFDGrid2D,
  numLines: number = 10,
  maxSteps: number = 2000,
): StreamlinePath2D[] {
  const { nx, ny, dx, dy, width, height } = grid;
  const uIdx = (i: number, j: number) => j * (nx + 1) + i;
  const vIdx = (i: number, j: number) => j * nx + i;

  function interpVelocity(px: number, py: number): [number, number] | null {
    if (px < 0 || px > width || py < 0 || py > height) return null;

    // u interpolation (at vertical faces)
    const ui = px / dx;
    const uj = py / dy - 0.5;
    const i0u = Math.max(0, Math.min(nx, Math.floor(ui)));
    const j0u = Math.max(0, Math.min(ny - 2, Math.floor(uj)));
    const i1u = Math.min(nx, i0u + 1);
    const j1u = Math.min(ny - 1, j0u + 1);
    const su = Math.max(0, Math.min(1, ui - i0u));
    const tu = Math.max(0, Math.min(1, uj - j0u));
    const uVal = (1 - su) * (1 - tu) * grid.u[uIdx(i0u, j0u)]
      + su * (1 - tu) * grid.u[uIdx(i1u, j0u)]
      + (1 - su) * tu * grid.u[uIdx(i0u, j1u)]
      + su * tu * grid.u[uIdx(i1u, j1u)];

    // v interpolation (at horizontal faces)
    const vi = px / dx - 0.5;
    const vj = py / dy;
    const i0v = Math.max(0, Math.min(nx - 2, Math.floor(vi)));
    const j0v = Math.max(0, Math.min(ny, Math.floor(vj)));
    const i1v = Math.min(nx - 1, i0v + 1);
    const j1v = Math.min(ny, j0v + 1);
    const sv = Math.max(0, Math.min(1, vi - i0v));
    const tv = Math.max(0, Math.min(1, vj - j0v));
    const vVal = (1 - sv) * (1 - tv) * grid.v[vIdx(i0v, j0v)]
      + sv * (1 - tv) * grid.v[vIdx(i1v, j0v)]
      + (1 - sv) * tv * grid.v[vIdx(i0v, j1v)]
      + sv * tv * grid.v[vIdx(i1v, j1v)];

    return [uVal, vVal];
  }

  const stepSize = Math.min(dx, dy) * 0.4;
  const streamlines: StreamlinePath2D[] = [];

  for (let n = 0; n < numLines; n++) {
    const points: { x: number; y: number }[] = [];
    const magnitudes: number[] = [];
    let px = dx * 0.5;
    let py = (n + 0.5) * height / numLines;

    for (let step = 0; step < maxSteps; step++) {
      const v1 = interpVelocity(px, py);
      if (!v1) break;
      const mag = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
      if (mag < 1e-12) break;

      points.push({ x: px, y: py });
      magnitudes.push(mag);

      // RK4
      const k1 = v1;
      const v2 = interpVelocity(px + 0.5 * stepSize * k1[0], py + 0.5 * stepSize * k1[1]);
      if (!v2) break;
      const v3 = interpVelocity(px + 0.5 * stepSize * v2[0], py + 0.5 * stepSize * v2[1]);
      if (!v3) break;
      const v4 = interpVelocity(px + stepSize * v3[0], py + stepSize * v3[1]);
      if (!v4) break;

      px += (stepSize / 6) * (k1[0] + 2 * v2[0] + 2 * v3[0] + v4[0]);
      py += (stepSize / 6) * (k1[1] + 2 * v2[1] + 2 * v3[1] + v4[1]);

      if (px < 0 || px > width || py < 0 || py > height) break;
    }

    if (points.length > 1) {
      streamlines.push({ points, magnitudes });
    }
  }

  return streamlines;
}

// ----------------------------------------------------------------------------
// Section Cuts
// ----------------------------------------------------------------------------

/**
 * Extract field values along a horizontal cut (constant y).
 */
export function extractHorizontalCut(
  grid: CFDGrid2D,
  yPosition: number,
  field: "velocity" | "pressure" | "temperature",
): SectionCutResult {
  const { nx, ny, dx, dy } = grid;
  const j = Math.max(0, Math.min(ny - 1, Math.round(yPosition / dy)));
  const uIdx = (i: number, jj: number) => jj * (nx + 1) + i;
  const pIdx = (i: number, jj: number) => jj * nx + i;

  const positions: number[] = [];
  const values: number[] = [];

  for (let i = 0; i < nx; i++) {
    positions.push((i + 0.5) * dx);
    switch (field) {
      case "velocity": {
        const u = 0.5 * (grid.u[uIdx(i, j)] + grid.u[uIdx(i + 1, j)]);
        const v = 0.5 * (grid.v[i * 1 + j * nx] + grid.v[i + (j + 1) * nx]);
        values.push(Math.sqrt(u * u + v * v));
        break;
      }
      case "pressure":
        values.push(grid.p[pIdx(i, j)]);
        break;
      case "temperature":
        values.push(grid.T[pIdx(i, j)]);
        break;
    }
  }

  return {
    positions,
    values,
    label: `${field} at y = ${yPosition.toFixed(3)} m`,
  };
}

/**
 * Extract field values along a vertical cut (constant x).
 */
export function extractVerticalCut(
  grid: CFDGrid2D,
  xPosition: number,
  field: "velocity" | "pressure" | "temperature",
): SectionCutResult {
  const { nx, ny, dx, dy } = grid;
  const i = Math.max(0, Math.min(nx - 1, Math.round(xPosition / dx)));
  const uIdx = (ii: number, j: number) => j * (nx + 1) + ii;
  const pIdx = (ii: number, j: number) => j * nx + ii;

  const positions: number[] = [];
  const values: number[] = [];

  for (let j = 0; j < ny; j++) {
    positions.push((j + 0.5) * dy);
    switch (field) {
      case "velocity": {
        const u = 0.5 * (grid.u[uIdx(i, j)] + grid.u[uIdx(i + 1, j)]);
        const v = 0.5 * (grid.v[i + j * nx] + grid.v[i + (j + 1) * nx]);
        values.push(Math.sqrt(u * u + v * v));
        break;
      }
      case "pressure":
        values.push(grid.p[pIdx(i, j)]);
        break;
      case "temperature":
        values.push(grid.T[pIdx(i, j)]);
        break;
    }
  }

  return {
    positions,
    values,
    label: `${field} at x = ${xPosition.toFixed(3)} m`,
  };
}

// ----------------------------------------------------------------------------
// Force & Moment Calculation
// ----------------------------------------------------------------------------

/**
 * Compute drag, lift, and moment coefficients from wall pressures and shear stresses.
 */
export function computeForceCoefficients(
  grid: CFDGrid2D,
  density: number,
  viscosity: number,
  inletVelocity: number,
  referenceLength: number,
): ForceCoefficients {
  const { nx, ny, dx, dy } = grid;
  const uIdx = (i: number, j: number) => j * (nx + 1) + i;
  const pIdx = (i: number, j: number) => j * nx + i;

  if (Math.abs(inletVelocity) < 1e-12) {
    return {
      dragCoefficient: 0, liftCoefficient: 0,
      pressureDrag: 0, frictionDrag: 0, pressureLift: 0,
      totalDrag: 0, totalLift: 0, momentCoefficient: 0,
    };
  }

  const qRef = 0.5 * density * inletVelocity * inletVelocity;
  const mu = viscosity;

  // Friction drag from wall shear stress
  let frictionDrag = 0;
  // Bottom wall: tau = mu * du/dy at y=0
  for (let i = 0; i < nx; i++) {
    const dudy = (grid.u[uIdx(i, 1)] - grid.u[uIdx(i, 0)]) / dy;
    frictionDrag += mu * Math.abs(dudy) * dx;
  }
  // Top wall
  for (let i = 0; i < nx; i++) {
    const dudy = (grid.u[uIdx(i, ny - 1)] - grid.u[uIdx(i, Math.max(ny - 2, 0))]) / dy;
    frictionDrag += mu * Math.abs(dudy) * dx;
  }

  // Pressure drag from inlet-outlet pressure difference
  let pressureDrag = 0;
  for (let j = 0; j < ny; j++) {
    pressureDrag += (grid.p[pIdx(0, j)] - grid.p[pIdx(nx - 1, j)]) * dy;
  }

  // Pressure lift from top-bottom pressure difference
  let pressureLift = 0;
  for (let i = 0; i < nx; i++) {
    pressureLift += (grid.p[pIdx(i, 0)] - grid.p[pIdx(i, ny - 1)]) * dx;
  }

  const totalDrag = Math.abs(frictionDrag) + Math.abs(pressureDrag);
  const totalLift = Math.abs(pressureLift);

  // Moment about center (pitch moment)
  let moment = 0;
  const xCenter = grid.width / 2;
  const yCenter = grid.height / 2;
  // Moment from bottom wall pressure
  for (let i = 0; i < nx; i++) {
    const x = (i + 0.5) * dx;
    const armX = x - xCenter;
    const pBot = grid.p[pIdx(i, 0)];
    moment += pBot * dx * armX; // pressure force * moment arm
  }
  // Moment from top wall pressure
  for (let i = 0; i < nx; i++) {
    const x = (i + 0.5) * dx;
    const armX = x - xCenter;
    const pTop = grid.p[pIdx(i, ny - 1)];
    moment -= pTop * dx * armX;
  }

  const cd = qRef * referenceLength > 0 ? totalDrag / (qRef * referenceLength) : 0;
  const cl = qRef * referenceLength > 0 ? totalLift / (qRef * referenceLength) : 0;
  const cm = qRef * referenceLength * referenceLength > 0
    ? Math.abs(moment) / (qRef * referenceLength * referenceLength) : 0;

  return {
    dragCoefficient: cd,
    liftCoefficient: cl,
    pressureDrag: Math.abs(pressureDrag),
    frictionDrag: Math.abs(frictionDrag),
    pressureLift: Math.abs(pressureLift),
    totalDrag,
    totalLift,
    momentCoefficient: cm,
  };
}

// ----------------------------------------------------------------------------
// Y+ Wall Distance Visualization
// ----------------------------------------------------------------------------

/**
 * Compute Y+ distribution along walls.
 */
export function computeYPlusDistribution(
  grid: CFDGrid2D,
  density: number,
  viscosity: number,
  turbulenceModel: "laminar" | "k-epsilon" | "k-omega-sst" | "spalart-allmaras",
): YPlusDistribution {
  const { nx, ny, dx, dy } = grid;
  const uIdx = (i: number, j: number) => j * (nx + 1) + i;
  const nu = viscosity / density;

  const positions: number[] = [];
  const values: number[] = [];

  // Bottom wall y+ computation
  for (let i = 0; i < nx; i++) {
    const x = (i + 0.5) * dx;
    const dudy = Math.abs((grid.u[uIdx(i, 1)] - grid.u[uIdx(i, 0)]) / dy);
    const tauW = viscosity * dudy;
    const uTau = Math.sqrt(Math.abs(tauW) / density);
    const yPlus = uTau * (0.5 * dy) / nu;

    positions.push(x);
    values.push(yPlus);
  }

  const validValues = values.filter(v => v > 0);
  const min = validValues.length > 0 ? Math.min(...validValues) : 0;
  const max = validValues.length > 0 ? Math.max(...validValues) : 0;
  const avg = validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : 0;

  // Check acceptability based on turbulence model
  let acceptable = true;
  let recommendation = "";
  switch (turbulenceModel) {
    case "k-epsilon":
      acceptable = avg >= 20 && avg <= 300;
      recommendation = acceptable
        ? `Y+ avg = ${avg.toFixed(1)} is in acceptable range for k-epsilon wall functions (30-300).`
        : `Y+ avg = ${avg.toFixed(1)} is outside recommended range for k-epsilon (30-300). Adjust first cell height.`;
      break;
    case "k-omega-sst":
    case "spalart-allmaras":
      acceptable = max <= 5;
      recommendation = acceptable
        ? `Y+ max = ${max.toFixed(1)} is acceptable for ${turbulenceModel} (requires Y+ < 5).`
        : `Y+ max = ${max.toFixed(1)} exceeds limit for ${turbulenceModel}. Refine near-wall mesh to Y+ < 5.`;
      break;
    default:
      recommendation = "No specific Y+ requirement for laminar flow.";
  }

  return { positions, values, min, max, avg, acceptable, recommendation };
}

// ----------------------------------------------------------------------------
// Color Maps
// ----------------------------------------------------------------------------

/**
 * Map a normalized value [0-1] to an RGB color string.
 */
export function valueToColor(t: number, colormap: "rainbow" | "jet" | "viridis" | "coolwarm" = "jet"): string {
  const c = Math.max(0, Math.min(1, t));

  if (colormap === "coolwarm") {
    const r = c < 0.5 ? Math.round(59 + c * 2 * 196) : 255;
    const g = c < 0.5 ? Math.round(76 + c * 2 * 179) : Math.round(255 - (c - 0.5) * 2 * 179);
    const b = c < 0.5 ? 255 : Math.round(255 - (c - 0.5) * 2 * 196);
    return `rgb(${r},${g},${b})`;
  }

  if (colormap === "viridis") {
    const r = Math.round(68 + c * 185);
    const g = Math.round(1 + c * 205 - c * c * 100);
    const b = Math.round(84 + c * 60 - Math.pow(c, 1.5) * 140);
    return `rgb(${Math.min(253, r)},${Math.min(231, g)},${Math.max(37, b)})`;
  }

  // Rainbow / Jet
  if (c < 0.25) return `rgb(0,${Math.round(c * 4 * 255)},255)`;
  if (c < 0.5) return `rgb(0,255,${Math.round((1 - (c - 0.25) * 4) * 255)})`;
  if (c < 0.75) return `rgb(${Math.round((c - 0.5) * 4 * 255)},255,0)`;
  return `rgb(255,${Math.round((1 - (c - 0.75) * 4) * 255)},0)`;
}
