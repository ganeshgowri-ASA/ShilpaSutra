// ============================================================================
// ShilpaSutra CFD Boundary Layer Meshing & Inflation Layers
// ============================================================================

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface BoundaryLayerConfig {
  /** Number of prism/inflation layers near walls */
  numLayers: number;
  /** Height of the first cell layer [m] */
  firstLayerHeight: number;
  /** Growth ratio between successive layers (typically 1.1-1.3) */
  growthRatio: number;
  /** Total boundary layer thickness [m] (computed) */
  totalThickness: number;
}

export interface RefinementZone {
  id: string;
  name: string;
  shape: "box" | "sphere" | "cylinder";
  center: [number, number, number];
  /** For box: [width, height, depth]; sphere: [radius, 0, 0]; cylinder: [radius, height, 0] */
  dimensions: [number, number, number];
  /** Target element size inside the zone [m] */
  elementSize: number;
  /** Transition layers from fine to coarse */
  transitionLayers: number;
}

export interface MeshQualityMetrics {
  totalCells: number;
  minOrthogonality: number;
  maxSkewness: number;
  maxAspectRatio: number;
  averageNonOrthogonality: number;
  boundaryLayerCells: number;
  refinementCells: number;
  /** Y+ distribution on walls (min, avg, max) */
  yPlusStats: { min: number; avg: number; max: number };
}

export interface MeshIndependenceResult {
  level: "coarse" | "medium" | "fine";
  cellCount: number;
  elementSize: number;
  /** Key result values for comparison (e.g., drag coefficient, pressure drop) */
  results: Record<string, number>;
  /** Richardson extrapolation error estimate [%] */
  richardsonError?: number;
  /** Grid Convergence Index [%] */
  gci?: number;
}

export interface InflationLayerDistribution {
  /** Array of layer heights from wall outward */
  heights: number[];
  /** Cumulative distance from wall for each layer edge */
  cumulativeDistances: number[];
  /** Total boundary layer thickness */
  totalThickness: number;
}

// ----------------------------------------------------------------------------
// Boundary Layer Computation
// ----------------------------------------------------------------------------

/**
 * Calculate boundary layer heights using geometric growth.
 * h_i = firstLayerHeight * growthRatio^i
 */
export function computeInflationLayers(config: BoundaryLayerConfig): InflationLayerDistribution {
  const heights: number[] = [];
  const cumulativeDistances: number[] = [];
  let cumDist = 0;

  for (let i = 0; i < config.numLayers; i++) {
    const h = config.firstLayerHeight * Math.pow(config.growthRatio, i);
    heights.push(h);
    cumDist += h;
    cumulativeDistances.push(cumDist);
  }

  return {
    heights,
    cumulativeDistances,
    totalThickness: cumDist,
  };
}

/**
 * Estimate first layer height for a target y+ value.
 *
 * Uses flat-plate turbulent boundary layer correlations:
 *   Cf = 0.058 * Re^(-0.2)       (turbulent)
 *   Cf = 0.664 / sqrt(Re)         (laminar, Re < 5e5)
 *   tau_w = 0.5 * Cf * rho * U²
 *   u_tau = sqrt(tau_w / rho)
 *   y = y+ * nu / u_tau
 */
export function estimateFirstLayerHeight(
  yPlusTarget: number,
  velocity: number,
  characteristicLength: number,
  density: number,
  viscosity: number,
): number {
  const Re = density * velocity * characteristicLength / viscosity;
  const Cf = Re < 5e5
    ? 0.664 / Math.sqrt(Math.max(Re, 1))
    : 0.058 / Math.pow(Re, 0.2);
  const tauW = 0.5 * Cf * density * velocity * velocity;
  const uTau = Math.sqrt(tauW / density);
  const nu = viscosity / density;
  return yPlusTarget * nu / Math.max(uTau, 1e-12);
}

/**
 * Create a recommended boundary layer config for a given turbulence model.
 */
export function createBoundaryLayerConfig(
  turbulenceModel: "laminar" | "k-epsilon" | "k-omega-sst" | "spalart-allmaras",
  velocity: number,
  characteristicLength: number,
  density: number,
  viscosity: number,
): BoundaryLayerConfig {
  let yPlusTarget: number;
  let numLayers: number;
  let growthRatio: number;

  switch (turbulenceModel) {
    case "k-epsilon":
      // Wall functions: y+ ~ 30-100
      yPlusTarget = 50;
      numLayers = 5;
      growthRatio = 1.3;
      break;
    case "k-omega-sst":
    case "spalart-allmaras":
      // Resolve boundary layer: y+ ~ 1
      yPlusTarget = 1;
      numLayers = 15;
      growthRatio = 1.2;
      break;
    default:
      yPlusTarget = 1;
      numLayers = 10;
      growthRatio = 1.15;
  }

  const firstLayerHeight = estimateFirstLayerHeight(
    yPlusTarget, velocity, characteristicLength, density, viscosity,
  );

  const totalThickness = firstLayerHeight * (Math.pow(growthRatio, numLayers) - 1) / (growthRatio - 1);

  return { numLayers, firstLayerHeight, growthRatio, totalThickness };
}

// ----------------------------------------------------------------------------
// Mesh Refinement Zones
// ----------------------------------------------------------------------------

/**
 * Check if a point lies inside a refinement zone.
 */
export function isInsideRefinementZone(
  point: [number, number, number],
  zone: RefinementZone,
): boolean {
  const [px, py, pz] = point;
  const [cx, cy, cz] = zone.center;
  const [d0, d1, d2] = zone.dimensions;

  switch (zone.shape) {
    case "box": {
      const hw = d0 / 2, hh = d1 / 2, hd = d2 / 2;
      return Math.abs(px - cx) <= hw && Math.abs(py - cy) <= hh && Math.abs(pz - cz) <= hd;
    }
    case "sphere": {
      const r = d0;
      const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2 + (pz - cz) ** 2);
      return dist <= r;
    }
    case "cylinder": {
      const r = d0;
      const hh = d1 / 2;
      const radialDist = Math.sqrt((px - cx) ** 2 + (pz - cz) ** 2);
      return radialDist <= r && Math.abs(py - cy) <= hh;
    }
  }
}

/**
 * Compute the target element size at a point considering all refinement zones.
 * Returns the minimum element size from all zones containing the point,
 * or the base element size if outside all zones.
 */
export function getLocalElementSize(
  point: [number, number, number],
  zones: RefinementZone[],
  baseElementSize: number,
): number {
  let minSize = baseElementSize;
  for (const zone of zones) {
    if (isInsideRefinementZone(point, zone)) {
      minSize = Math.min(minSize, zone.elementSize);
    }
  }
  return minSize;
}

// ----------------------------------------------------------------------------
// Mesh Quality Assessment
// ----------------------------------------------------------------------------

/**
 * Compute mesh quality metrics for a 2D structured grid.
 */
export function computeMeshQuality(
  nx: number,
  ny: number,
  dx: number,
  dy: number,
  boundaryLayerConfig?: BoundaryLayerConfig,
  refinementZones?: RefinementZone[],
): MeshQualityMetrics {
  const totalCells = nx * ny;
  const aspectRatio = Math.max(dx / dy, dy / dx);

  // For structured grids, orthogonality is perfect (90 degrees)
  const minOrthogonality = 90;
  const averageNonOrthogonality = 0;

  // Skewness is 0 for rectangular cells
  const maxSkewness = 0;

  const boundaryLayerCells = boundaryLayerConfig
    ? nx * boundaryLayerConfig.numLayers * 2 // top and bottom
    : 0;

  const refinementCells = refinementZones
    ? refinementZones.reduce((sum, z) => {
      const zoneVolFraction = z.dimensions[0] * z.dimensions[1] / (nx * dx * ny * dy);
      const refineFactor = (dx / z.elementSize) * (dy / z.elementSize);
      return sum + Math.ceil(totalCells * zoneVolFraction * refineFactor);
    }, 0)
    : 0;

  return {
    totalCells: totalCells + boundaryLayerCells + refinementCells,
    minOrthogonality,
    maxSkewness,
    maxAspectRatio: aspectRatio,
    averageNonOrthogonality,
    boundaryLayerCells,
    refinementCells,
    yPlusStats: { min: 0, avg: 0, max: 0 },
  };
}

// ----------------------------------------------------------------------------
// Mesh Independence Study
// ----------------------------------------------------------------------------

/**
 * Generate mesh configurations for a mesh independence study.
 * Returns coarse, medium, and fine mesh settings with a constant refinement ratio.
 */
export function generateMeshIndependenceConfigs(
  baseNx: number,
  baseNy: number,
  refinementRatio: number = 1.5,
): { level: "coarse" | "medium" | "fine"; nx: number; ny: number }[] {
  return [
    {
      level: "coarse",
      nx: Math.round(baseNx / refinementRatio),
      ny: Math.round(baseNy / refinementRatio),
    },
    {
      level: "medium",
      nx: baseNx,
      ny: baseNy,
    },
    {
      level: "fine",
      nx: Math.round(baseNx * refinementRatio),
      ny: Math.round(baseNy * refinementRatio),
    },
  ];
}

/**
 * Compute the Grid Convergence Index (GCI) using Richardson extrapolation.
 *
 * GCI_fine = Fs * |epsilon| / (r^p - 1)
 *
 * where:
 *   r = refinement ratio (h_coarse / h_fine)
 *   p = order of convergence = ln((f3 - f2)/(f2 - f1)) / ln(r)
 *   epsilon = (f2 - f1) / f1
 *   Fs = safety factor (1.25 for 3+ grids)
 */
export function computeGCI(
  coarseResult: number,
  mediumResult: number,
  fineResult: number,
  refinementRatio: number = 1.5,
  safetyFactor: number = 1.25,
): { gci: number; orderOfConvergence: number; richardsonExtrapolation: number } {
  const f1 = fineResult;
  const f2 = mediumResult;
  const f3 = coarseResult;
  const r = refinementRatio;

  // Order of convergence
  const e32 = f3 - f2;
  const e21 = f2 - f1;

  if (Math.abs(e21) < 1e-15 || Math.abs(e32) < 1e-15) {
    return { gci: 0, orderOfConvergence: 2, richardsonExtrapolation: f1 };
  }

  const ratio = e32 / e21;
  if (ratio <= 0) {
    // Oscillatory convergence - use nominal order 2
    const p = 2;
    const epsilon = Math.abs((f2 - f1) / Math.max(Math.abs(f1), 1e-10));
    const gci = safetyFactor * epsilon / (Math.pow(r, p) - 1) * 100;
    const richardson = f1 + (f1 - f2) / (Math.pow(r, p) - 1);
    return { gci, orderOfConvergence: p, richardsonExtrapolation: richardson };
  }

  const p = Math.abs(Math.log(ratio) / Math.log(r));
  const clampedP = Math.max(0.5, Math.min(p, 4)); // clamp to reasonable range

  const epsilon = Math.abs((f2 - f1) / Math.max(Math.abs(f1), 1e-10));
  const gci = safetyFactor * epsilon / (Math.pow(r, clampedP) - 1) * 100;
  const richardson = f1 + (f1 - f2) / (Math.pow(r, clampedP) - 1);

  return { gci, orderOfConvergence: clampedP, richardsonExtrapolation: richardson };
}

/**
 * Evaluate mesh independence from a set of results.
 * Returns whether the solution is mesh-independent (GCI < threshold).
 */
export function evaluateMeshIndependence(
  results: MeshIndependenceResult[],
  metric: string,
  gciThreshold: number = 2.0,
): {
  isIndependent: boolean;
  gci: number;
  orderOfConvergence: number;
  extrapolatedValue: number;
  recommendation: string;
} {
  if (results.length < 3) {
    return {
      isIndependent: false,
      gci: 100,
      orderOfConvergence: 0,
      extrapolatedValue: 0,
      recommendation: "Need at least 3 mesh levels for independence study.",
    };
  }

  const sorted = [...results].sort((a, b) => a.cellCount - b.cellCount);
  const coarse = sorted[0].results[metric] ?? 0;
  const medium = sorted[1].results[metric] ?? 0;
  const fine = sorted[2].results[metric] ?? 0;

  const r = Math.sqrt(sorted[2].cellCount / sorted[1].cellCount);
  const { gci, orderOfConvergence, richardsonExtrapolation } = computeGCI(coarse, medium, fine, r);

  const isIndependent = gci < gciThreshold;
  const recommendation = isIndependent
    ? `Medium mesh (${sorted[1].cellCount} cells) is sufficient. GCI = ${gci.toFixed(2)}%.`
    : `Solution is not mesh-independent (GCI = ${gci.toFixed(2)}%). Consider further refinement.`;

  return {
    isIndependent,
    gci,
    orderOfConvergence,
    extrapolatedValue: richardsonExtrapolation,
    recommendation,
  };
}
