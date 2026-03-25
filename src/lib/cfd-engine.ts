"use client";

// ============================================================================
// ShilpaSutra CFD Engine - Computational Fluid Dynamics Library
// ============================================================================

// ----------------------------------------------------------------------------
// Type Definitions
// ----------------------------------------------------------------------------

export interface FluidMaterial {
  id: string;
  name: string;
  density: number;                // kg/m³
  dynamicViscosity: number;       // Pa·s
  specificHeat: number;           // J/(kg·K)
  thermalConductivity: number;    // W/(m·K)
  prandtlNumber: number;         // dimensionless
}

export type TurbulenceModel =
  | "laminar"
  | "k-epsilon"
  | "k-omega-sst"
  | "spalart-allmaras"
  | "les-smagorinsky"
  | "des";

export type BoundaryConditionType =
  | "velocity-inlet"
  | "pressure-inlet"
  | "pressure-outlet"
  | "wall"
  | "symmetry"
  | "periodic"
  | "farfield"
  | "mass-flow-inlet"
  | "outflow";

export interface CFDBoundaryCondition {
  id: string;
  name: string;
  type: BoundaryConditionType;
  faceIds: string[];
  velocity: [number, number, number];       // m/s
  pressure: number;                         // Pa
  temperature: number;                      // K
  turbulentIntensity: number;               // fraction (0-1)
  hydraulicDiameter: number;                // m
  wallFunction: "standard" | "enhanced" | "scalable" | "none";
}

export interface RefinementRegion {
  id: string;
  name: string;
  center: [number, number, number];
  dimensions: [number, number, number];
  elementSize: number;
}

export interface MeshSettings {
  elementSize: number;                      // m
  refinementRegions: RefinementRegion[];
  boundaryLayerLayers: number;
  boundaryLayerGrowthRate: number;
  boundaryLayerFirstLayerHeight: number;    // m
  meshType: "tetrahedral" | "hexahedral" | "polyhedral" | "hybrid";
}

export interface RelaxationFactors {
  pressure: number;
  velocity: number;
  turbulence: number;
}

export interface SolverSettings {
  algorithm: "SIMPLE" | "SIMPLEC" | "PISO" | "coupled";
  pressureScheme: string;
  momentumScheme: string;
  turbulenceScheme: string;
  maxIterations: number;
  convergenceCriteria: number;
  relaxation: RelaxationFactors;
  timeStep: number;                         // s
  endTime: number;                          // s
  transient: boolean;
}

export interface CFDResult {
  nodeId: string;
  velocity: [number, number, number];       // m/s
  pressure: number;                         // Pa
  temperature: number;                      // K
  turbulentKE: number;                      // m²/s²
  turbulentDissipation: number;             // m²/s³
  wallShearStress: number;                  // Pa
  yPlus: number;                            // dimensionless
}

export interface ResidualHistory {
  iteration: number;
  continuity: number;
  xMomentum: number;
  yMomentum: number;
  zMomentum: number;
  energy: number;
  turbulence1: number;
  turbulence2: number;
}

export interface ForceReport {
  dragForce: [number, number, number];      // N
  liftForce: [number, number, number];      // N
  momentForce: [number, number, number];    // N·m
  dragCoefficient: number;                  // dimensionless
  liftCoefficient: number;                  // dimensionless
}

export interface ProbePoint {
  id: string;
  position: [number, number, number];       // m
  velocity: [number, number, number];       // m/s
  pressure: number;                         // Pa
  temperature: number;                      // K
}

export interface StreamlinePoint {
  position: [number, number, number];
  velocity: [number, number, number];
  magnitude: number;
}

export type StreamlinePath = StreamlinePoint[];

export interface VelocityFieldNode {
  position: [number, number, number];
  velocity: [number, number, number];
}

export interface VorticityFieldNode {
  position: [number, number, number];
  vorticity: [number, number, number];
  magnitude: number;
}

// ----------------------------------------------------------------------------
// Fluid Material Database (real-world property values)
// ----------------------------------------------------------------------------

export const FLUID_MATERIALS: FluidMaterial[] = [
  // Air at various temperatures
  {
    id: "air-20c",
    name: "Air (20°C, 1 atm)",
    density: 1.204,
    dynamicViscosity: 1.825e-5,
    specificHeat: 1007,
    thermalConductivity: 0.02514,
    prandtlNumber: 0.7309,
  },
  {
    id: "air-100c",
    name: "Air (100°C, 1 atm)",
    density: 0.9458,
    dynamicViscosity: 2.181e-5,
    specificHeat: 1012,
    thermalConductivity: 0.03095,
    prandtlNumber: 0.7111,
  },
  {
    id: "air-200c",
    name: "Air (200°C, 1 atm)",
    density: 0.7459,
    dynamicViscosity: 2.573e-5,
    specificHeat: 1026,
    thermalConductivity: 0.03655,
    prandtlNumber: 0.6936,
  },
  // Water at various temperatures
  {
    id: "water-20c",
    name: "Water (20°C)",
    density: 998.2,
    dynamicViscosity: 1.002e-3,
    specificHeat: 4182,
    thermalConductivity: 0.5984,
    prandtlNumber: 7.01,
  },
  {
    id: "water-50c",
    name: "Water (50°C)",
    density: 988.1,
    dynamicViscosity: 5.468e-4,
    specificHeat: 4181,
    thermalConductivity: 0.6435,
    prandtlNumber: 3.55,
  },
  {
    id: "water-100c",
    name: "Water (100°C)",
    density: 958.4,
    dynamicViscosity: 2.82e-4,
    specificHeat: 4216,
    thermalConductivity: 0.6791,
    prandtlNumber: 1.75,
  },
  // Engine Oils
  {
    id: "engine-oil-sae30",
    name: "Engine Oil SAE 30",
    density: 876,
    dynamicViscosity: 0.2907,
    specificHeat: 1845,
    thermalConductivity: 0.145,
    prandtlNumber: 3700,
  },
  {
    id: "engine-oil-sae10w40",
    name: "Engine Oil SAE 10W-40",
    density: 865,
    dynamicViscosity: 0.0956,
    specificHeat: 1900,
    thermalConductivity: 0.144,
    prandtlNumber: 1262,
  },
  // Hydraulic Oil
  {
    id: "hydraulic-oil",
    name: "Hydraulic Oil (ISO VG 46)",
    density: 870,
    dynamicViscosity: 0.0397,
    specificHeat: 1880,
    thermalConductivity: 0.135,
    prandtlNumber: 552,
  },
  // Ethylene Glycol / Coolant
  {
    id: "ethylene-glycol",
    name: "Ethylene Glycol",
    density: 1113,
    dynamicViscosity: 1.61e-2,
    specificHeat: 2382,
    thermalConductivity: 0.252,
    prandtlNumber: 151,
  },
  {
    id: "coolant-50-50",
    name: "Coolant (50/50 EG/Water)",
    density: 1067,
    dynamicViscosity: 3.72e-3,
    specificHeat: 3300,
    thermalConductivity: 0.416,
    prandtlNumber: 29.5,
  },
  // Gases
  {
    id: "nitrogen-20c",
    name: "Nitrogen (20°C, 1 atm)",
    density: 1.165,
    dynamicViscosity: 1.76e-5,
    specificHeat: 1040,
    thermalConductivity: 0.02583,
    prandtlNumber: 0.7085,
  },
  {
    id: "oxygen-20c",
    name: "Oxygen (20°C, 1 atm)",
    density: 1.331,
    dynamicViscosity: 2.018e-5,
    specificHeat: 920,
    thermalConductivity: 0.02615,
    prandtlNumber: 0.7094,
  },
  {
    id: "co2-20c",
    name: "Carbon Dioxide (20°C, 1 atm)",
    density: 1.839,
    dynamicViscosity: 1.47e-5,
    specificHeat: 844,
    thermalConductivity: 0.01662,
    prandtlNumber: 0.7462,
  },
  {
    id: "methane-20c",
    name: "Methane (20°C, 1 atm)",
    density: 0.668,
    dynamicViscosity: 1.087e-5,
    specificHeat: 2226,
    thermalConductivity: 0.03281,
    prandtlNumber: 0.7361,
  },
  {
    id: "steam-100c",
    name: "Steam (100°C, 1 atm)",
    density: 0.5977,
    dynamicViscosity: 1.227e-5,
    specificHeat: 2034,
    thermalConductivity: 0.02509,
    prandtlNumber: 0.9960,
  },
];

/**
 * Look up a fluid material by its id.
 */
export function getFluidMaterial(id: string): FluidMaterial | undefined {
  return FLUID_MATERIALS.find((m) => m.id === id);
}

// ----------------------------------------------------------------------------
// Mesh Quality Functions
// ----------------------------------------------------------------------------

/**
 * Calculate the dimensionless wall distance y+ from wall shear stress.
 *
 * y+ = (u_tau * y) / nu
 * where u_tau = sqrt(tau_w / rho)
 */
export function calculateYPlus(
  wallShearStress: number,
  density: number,
  viscosity: number,
  firstLayerHeight: number,
): number {
  if (density <= 0 || viscosity <= 0) {
    throw new Error("Density and viscosity must be positive.");
  }
  const frictionVelocity = Math.sqrt(Math.abs(wallShearStress) / density);
  const kinematicViscosity = viscosity / density;
  return (frictionVelocity * firstLayerHeight) / kinematicViscosity;
}

/**
 * Estimate the boundary layer thickness using the Blasius correlation
 * for a flat plate (turbulent flow approximation).
 *
 * delta ≈ 0.37 * L / Re_L^(1/5)   (turbulent)
 * delta ≈ 5.0 * L / Re_L^(1/2)    (laminar, Re < 5e5)
 */
export function estimateBoundaryLayerThickness(
  reynoldsNumber: number,
  characteristicLength: number,
): number {
  if (reynoldsNumber <= 0 || characteristicLength <= 0) {
    throw new Error("Reynolds number and characteristic length must be positive.");
  }
  if (reynoldsNumber < 5e5) {
    // Laminar Blasius solution
    return (5.0 * characteristicLength) / Math.sqrt(reynoldsNumber);
  }
  // Turbulent 1/5 power law
  return (0.37 * characteristicLength) / Math.pow(reynoldsNumber, 0.2);
}

/**
 * Calculate the Reynolds number.
 *
 * Re = rho * U * L / mu
 */
export function calculateReynoldsNumber(
  velocity: number,
  characteristicLength: number,
  density: number,
  viscosity: number,
): number {
  if (viscosity <= 0) {
    throw new Error("Viscosity must be positive.");
  }
  return (density * Math.abs(velocity) * characteristicLength) / viscosity;
}

/**
 * Estimate the first cell layer height for a target y+ value.
 *
 * Uses the flat-plate skin friction estimate:
 *   Cf ≈ 0.058 * Re_L^(-0.2)   (turbulent)
 *   tau_w = 0.5 * Cf * rho * U²
 *   u_tau = sqrt(tau_w / rho)
 *   y = y+ * nu / u_tau
 */
export function estimateFirstLayerHeight(
  yPlusTarget: number,
  velocity: number,
  characteristicLength: number,
  viscosity: number,
  density: number,
): number {
  if (velocity <= 0 || characteristicLength <= 0 || viscosity <= 0 || density <= 0) {
    throw new Error("All input values must be positive.");
  }

  const Re = calculateReynoldsNumber(velocity, characteristicLength, density, viscosity);

  // Skin friction coefficient (Schlichting correlation for turbulent flat plate)
  const Cf = Re < 5e5
    ? 0.664 / Math.sqrt(Re)       // laminar Blasius
    : 0.058 / Math.pow(Re, 0.2);  // turbulent

  const wallShearStress = 0.5 * Cf * density * velocity * velocity;
  const frictionVelocity = Math.sqrt(wallShearStress / density);
  const kinematicViscosity = viscosity / density;

  return (yPlusTarget * kinematicViscosity) / frictionVelocity;
}

// ----------------------------------------------------------------------------
// Convergence Helpers
// ----------------------------------------------------------------------------

/**
 * Check whether all residuals have dropped below the convergence criteria.
 */
export function checkConvergence(
  residuals: ResidualHistory,
  criteria: number,
): boolean {
  return (
    residuals.continuity < criteria &&
    residuals.xMomentum < criteria &&
    residuals.yMomentum < criteria &&
    residuals.zMomentum < criteria &&
    residuals.energy < criteria &&
    residuals.turbulence1 < criteria &&
    residuals.turbulence2 < criteria
  );
}

/**
 * Adaptively compute relaxation factors based on the current iteration
 * and recent residual magnitudes. Uses a simple ramp-up strategy:
 * start conservative, increase towards the target as residuals drop.
 */
export function calculateRelaxationFactors(
  iteration: number,
  residuals: ResidualHistory,
): RelaxationFactors {
  const maxResidual = Math.max(
    residuals.continuity,
    residuals.xMomentum,
    residuals.yMomentum,
    residuals.zMomentum,
  );

  // Ramp factor: starts at 0 when iteration=0, approaches 1 as iterations grow
  const ramp = Math.min(1.0, iteration / 200);

  if (maxResidual > 1e-1) {
    // Highly under-converged: use very conservative factors
    return {
      pressure: 0.1 + 0.1 * ramp,
      velocity: 0.3 + 0.1 * ramp,
      turbulence: 0.3 + 0.1 * ramp,
    };
  }

  if (maxResidual > 1e-3) {
    // Moderately converged
    return {
      pressure: 0.2 + 0.1 * ramp,
      velocity: 0.5 + 0.15 * ramp,
      turbulence: 0.5 + 0.15 * ramp,
    };
  }

  // Well converged: use aggressive factors
  return {
    pressure: 0.3 + 0.1 * ramp,
    velocity: 0.7 + 0.1 * ramp,
    turbulence: 0.7 + 0.1 * ramp,
  };
}

/**
 * Estimate how many more iterations are needed to reach convergence,
 * based on the log-linear decay rate of residuals over the last N entries.
 *
 * Returns Infinity if residuals are not decreasing, or if history is too short.
 */
export function estimateRemainingIterations(
  residualHistory: ResidualHistory[],
  targetCriteria: number = 1e-6,
): number {
  if (residualHistory.length < 10) {
    return Infinity;
  }

  // Use continuity residual as the representative metric
  const recent = residualHistory.slice(-20);
  const first = recent[0];
  const last = recent[recent.length - 1];

  if (last.continuity >= first.continuity || last.continuity <= 0 || first.continuity <= 0) {
    // Residuals are not decreasing
    return Infinity;
  }

  const iterationSpan = last.iteration - first.iteration;
  if (iterationSpan <= 0) return Infinity;

  // Log-linear decay rate per iteration
  const decayRate = (Math.log10(first.continuity) - Math.log10(last.continuity)) / iterationSpan;

  if (decayRate <= 0) return Infinity;

  const ordersRemaining = Math.log10(last.continuity) - Math.log10(targetCriteria);
  if (ordersRemaining <= 0) return 0;

  return Math.ceil(ordersRemaining / decayRate);
}

// ----------------------------------------------------------------------------
// Post-Processing Functions
// ----------------------------------------------------------------------------

/**
 * Calculate streamlines by integrating the velocity field from seed points
 * using a 4th-order Runge-Kutta scheme.
 *
 * The velocityField is provided as a lookup function that returns the
 * interpolated velocity at an arbitrary point in space.
 */
export function calculateStreamlines(
  velocityField: (position: [number, number, number]) => [number, number, number] | null,
  seedPoints: [number, number, number][],
  stepSize: number = 0.01,
  maxSteps: number = 500,
): StreamlinePath[] {
  const streamlines: StreamlinePath[] = [];

  for (const seed of seedPoints) {
    const path: StreamlinePath = [];
    let pos: [number, number, number] = [...seed];

    for (let step = 0; step < maxSteps; step++) {
      const v = velocityField(pos);
      if (!v) break;

      const magnitude = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      if (magnitude < 1e-12) break;

      path.push({
        position: [...pos] as [number, number, number],
        velocity: [...v] as [number, number, number],
        magnitude,
      });

      // RK4 integration
      const k1 = v;

      const p2: [number, number, number] = [
        pos[0] + 0.5 * stepSize * k1[0],
        pos[1] + 0.5 * stepSize * k1[1],
        pos[2] + 0.5 * stepSize * k1[2],
      ];
      const k2 = velocityField(p2);
      if (!k2) break;

      const p3: [number, number, number] = [
        pos[0] + 0.5 * stepSize * k2[0],
        pos[1] + 0.5 * stepSize * k2[1],
        pos[2] + 0.5 * stepSize * k2[2],
      ];
      const k3 = velocityField(p3);
      if (!k3) break;

      const p4: [number, number, number] = [
        pos[0] + stepSize * k3[0],
        pos[1] + stepSize * k3[1],
        pos[2] + stepSize * k3[2],
      ];
      const k4 = velocityField(p4);
      if (!k4) break;

      pos = [
        pos[0] + (stepSize / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
        pos[1] + (stepSize / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
        pos[2] + (stepSize / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
      ];
    }

    if (path.length > 0) {
      streamlines.push(path);
    }
  }

  return streamlines;
}

/**
 * Calculate the vorticity field (curl of velocity) from a discrete velocity field.
 *
 * Uses central finite differences on structured/unstructured node data.
 * Assumes the nodes are sorted and a spacing h can be derived, or uses
 * a user-supplied grid spacing.
 */
export function calculateVorticity(
  velocityField: VelocityFieldNode[],
  gridSpacing: number = 0.01,
): VorticityFieldNode[] {
  const vorticityField: VorticityFieldNode[] = [];
  const h = gridSpacing;

  // Build a spatial lookup map for finite difference stencil
  const posMap = new Map<string, [number, number, number]>();
  for (const node of velocityField) {
    const key = `${node.position[0].toFixed(8)},${node.position[1].toFixed(8)},${node.position[2].toFixed(8)}`;
    posMap.set(key, node.velocity);
  }

  function lookupVelocity(x: number, y: number, z: number): [number, number, number] | null {
    const key = `${x.toFixed(8)},${y.toFixed(8)},${z.toFixed(8)}`;
    return posMap.get(key) ?? null;
  }

  for (const node of velocityField) {
    const [x, y, z] = node.position;

    // Central differences: dv/dx ≈ (v(x+h) - v(x-h)) / (2h)
    const vxp = lookupVelocity(x + h, y, z);
    const vxm = lookupVelocity(x - h, y, z);
    const vyp = lookupVelocity(x, y + h, z);
    const vym = lookupVelocity(x, y - h, z);
    const vzp = lookupVelocity(x, y, z + h);
    const vzm = lookupVelocity(x, y, z - h);

    if (!vxp || !vxm || !vyp || !vym || !vzp || !vzm) {
      // Boundary node - skip or use forward/backward difference
      continue;
    }

    // omega_x = dw/dy - dv/dz
    const omegaX = (vyp[2] - vym[2]) / (2 * h) - (vzp[1] - vzm[1]) / (2 * h);
    // omega_y = du/dz - dw/dx
    const omegaY = (vzp[0] - vzm[0]) / (2 * h) - (vxp[2] - vxm[2]) / (2 * h);
    // omega_z = dv/dx - du/dy
    const omegaZ = (vxp[1] - vxm[1]) / (2 * h) - (vyp[0] - vym[0]) / (2 * h);

    const magnitude = Math.sqrt(omegaX * omegaX + omegaY * omegaY + omegaZ * omegaZ);

    vorticityField.push({
      position: [...node.position] as [number, number, number],
      vorticity: [omegaX, omegaY, omegaZ],
      magnitude,
    });
  }

  return vorticityField;
}

/**
 * Calculate the drag coefficient.
 *
 * Cd = F_drag / (0.5 * rho * U² * A)
 */
export function calculateDragCoefficient(
  force: number,
  density: number,
  velocity: number,
  referenceArea: number,
): number {
  const dynamicPressure = 0.5 * density * velocity * velocity;
  if (dynamicPressure * referenceArea === 0) {
    throw new Error("Dynamic pressure times reference area must be non-zero.");
  }
  return force / (dynamicPressure * referenceArea);
}

/**
 * Calculate the lift coefficient.
 *
 * Cl = F_lift / (0.5 * rho * U² * A)
 */
export function calculateLiftCoefficient(
  force: number,
  density: number,
  velocity: number,
  referenceArea: number,
): number {
  const dynamicPressure = 0.5 * density * velocity * velocity;
  if (dynamicPressure * referenceArea === 0) {
    throw new Error("Dynamic pressure times reference area must be non-zero.");
  }
  return force / (dynamicPressure * referenceArea);
}

/**
 * Calculate mass flow rate through a surface.
 *
 * mdot = rho * U * A
 *
 * For non-uniform flow, integrate rho * (v · n) dA.
 * This function provides the simplified uniform-flow version.
 */
export function calculateMassFlowRate(
  velocity: number,
  density: number,
  area: number,
): number {
  return density * velocity * area;
}

/**
 * Calculate the pressure drop between two locations.
 *
 * deltaP = P_inlet - P_outlet
 */
export function calculatePressureDrop(
  inletPressure: number,
  outletPressure: number,
): number {
  return inletPressure - outletPressure;
}

// ----------------------------------------------------------------------------
// Utility: Default Settings Generators
// ----------------------------------------------------------------------------

/**
 * Create default solver settings for a given turbulence model.
 */
export function createDefaultSolverSettings(
  turbulenceModel: TurbulenceModel,
  transient: boolean = false,
): SolverSettings {
  const base: SolverSettings = {
    algorithm: "SIMPLE",
    pressureScheme: "second-order",
    momentumScheme: "second-order-upwind",
    turbulenceScheme: "second-order-upwind",
    maxIterations: 2000,
    convergenceCriteria: 1e-6,
    relaxation: {
      pressure: 0.3,
      velocity: 0.7,
      turbulence: 0.7,
    },
    timeStep: 0.001,
    endTime: 1.0,
    transient,
  };

  if (transient) {
    base.algorithm = "PISO";
    base.maxIterations = 50; // inner iterations per time step
  }

  switch (turbulenceModel) {
    case "laminar":
      base.turbulenceScheme = "none";
      base.relaxation.turbulence = 1.0;
      break;
    case "les-smagorinsky":
    case "des":
      base.algorithm = "PISO";
      base.transient = true;
      base.timeStep = 1e-4;
      base.maxIterations = 30;
      break;
    case "spalart-allmaras":
      base.relaxation.turbulence = 0.6;
      break;
    default:
      break;
  }

  return base;
}

/**
 * Create a default boundary condition with sensible initial values.
 */
export function createDefaultBoundaryCondition(
  id: string,
  name: string,
  type: BoundaryConditionType,
): CFDBoundaryCondition {
  return {
    id,
    name,
    type,
    faceIds: [],
    velocity: [0, 0, 0],
    pressure: 101325,       // 1 atm in Pa
    temperature: 293.15,    // 20°C in K
    turbulentIntensity: 0.05,
    hydraulicDiameter: 0.1,
    wallFunction: type === "wall" ? "standard" : "none",
  };
}

/**
 * Create default mesh settings for a given characteristic length scale.
 */
export function createDefaultMeshSettings(
  characteristicLength: number,
): MeshSettings {
  return {
    elementSize: characteristicLength / 20,
    refinementRegions: [],
    boundaryLayerLayers: 10,
    boundaryLayerGrowthRate: 1.2,
    boundaryLayerFirstLayerHeight: characteristicLength / 1000,
    meshType: "tetrahedral",
  };
}

/**
 * Generate a complete force report from raw force components and
 * reference flow conditions.
 */
export function generateForceReport(
  dragForce: [number, number, number],
  liftForce: [number, number, number],
  momentForce: [number, number, number],
  density: number,
  velocity: number,
  referenceArea: number,
): ForceReport {
  const dragMagnitude = Math.sqrt(
    dragForce[0] ** 2 + dragForce[1] ** 2 + dragForce[2] ** 2,
  );
  const liftMagnitude = Math.sqrt(
    liftForce[0] ** 2 + liftForce[1] ** 2 + liftForce[2] ** 2,
  );

  return {
    dragForce,
    liftForce,
    momentForce,
    dragCoefficient: calculateDragCoefficient(dragMagnitude, density, velocity, referenceArea),
    liftCoefficient: calculateLiftCoefficient(liftMagnitude, density, velocity, referenceArea),
  };
}

// ============================================================================
// 2D Navier-Stokes Solver (Staggered Grid, SIMPLE Algorithm)
// ============================================================================

// ----------------------------------------------------------------------------
// 2D CFD Type Definitions
// ----------------------------------------------------------------------------

export interface CFDGrid2D {
  nx: number; ny: number;
  dx: number; dy: number;
  width: number; height: number;
  u: Float64Array;    // (nx+1)*ny
  v: Float64Array;    // nx*(ny+1)
  p: Float64Array;    // nx*ny
  T: Float64Array;    // nx*ny (temperature)
}

export interface CFDParams2D {
  density: number;
  viscosity: number;
  inletVelocity: number;
  maxIterations: number;
  convergenceTol: number;
  alphaU: number; // velocity under-relaxation (0.7)
  alphaP: number; // pressure under-relaxation (0.3)
  thermal: boolean;
  thermalConductivity?: number;
}

export interface CFDBCs2D {
  left: { type: 'velocity-inlet' | 'pressure-outlet' | 'wall' | 'symmetry'; velocity?: number; temperature?: number };
  right: { type: 'velocity-inlet' | 'pressure-outlet' | 'wall' | 'symmetry'; velocity?: number; temperature?: number };
  top: { type: 'velocity-inlet' | 'pressure-outlet' | 'wall' | 'symmetry'; velocity?: number; temperature?: number };
  bottom: { type: 'velocity-inlet' | 'pressure-outlet' | 'wall' | 'symmetry'; velocity?: number; temperature?: number };
}

export interface CFDResult2D {
  converged: boolean;
  iterations: number;
  residualHistory: number[];
  maxVelocity: number;
  maxPressure: number;
  dragCoefficient: number;
  liftCoefficient: number;
  grid: CFDGrid2D;
  streamlines: { x: number[]; y: number[] }[];
}

// ----------------------------------------------------------------------------
// Grid Creation
// ----------------------------------------------------------------------------

/**
 * Create a 2D staggered grid with Float64Arrays for u, v, p, T fields.
 * Uses a staggered (MAC) grid arrangement:
 *   u stored at (nx+1)*ny faces (vertical cell faces)
 *   v stored at nx*(ny+1) faces (horizontal cell faces)
 *   p, T stored at nx*ny cell centres
 */
export function createCFDGrid(nx: number, ny: number, width: number, height: number): CFDGrid2D {
  const dx = width / nx;
  const dy = height / ny;
  return {
    nx, ny, dx, dy, width, height,
    u: new Float64Array((nx + 1) * ny),
    v: new Float64Array(nx * (ny + 1)),
    p: new Float64Array(nx * ny),
    T: new Float64Array(nx * ny),
  };
}

// ----------------------------------------------------------------------------
// Boundary Conditions
// ----------------------------------------------------------------------------

/**
 * Apply boundary conditions to the staggered grid.
 *
 * Left/right boundaries affect u at i=0 and i=nx, plus v ghost extrapolation.
 * Top/bottom boundaries affect v at j=0 and j=ny, plus u ghost extrapolation.
 */
export function applyBCs(grid: CFDGrid2D, bcs: CFDBCs2D): void {
  const { nx, ny } = grid;

  // Helper indices for staggered arrays
  const uIdx = (i: number, j: number) => j * (nx + 1) + i;
  const vIdx = (i: number, j: number) => j * nx + i;
  const pIdx = (i: number, j: number) => j * nx + i;

  // --- Left boundary (i = 0) ---
  for (let j = 0; j < ny; j++) {
    if (bcs.left.type === 'velocity-inlet') {
      grid.u[uIdx(0, j)] = bcs.left.velocity ?? 0;
    } else if (bcs.left.type === 'pressure-outlet') {
      grid.u[uIdx(0, j)] = grid.u[uIdx(1, j)]; // zero-gradient
      grid.p[pIdx(0, j)] = 0;
    } else if (bcs.left.type === 'wall') {
      grid.u[uIdx(0, j)] = 0;
    } else if (bcs.left.type === 'symmetry') {
      grid.u[uIdx(0, j)] = 0; // normal velocity = 0
    }
    if (bcs.left.temperature !== undefined) {
      grid.T[pIdx(0, j)] = bcs.left.temperature;
    }
  }

  // --- Right boundary (i = nx) ---
  for (let j = 0; j < ny; j++) {
    if (bcs.right.type === 'velocity-inlet') {
      grid.u[uIdx(nx, j)] = bcs.right.velocity ?? 0;
    } else if (bcs.right.type === 'pressure-outlet') {
      grid.u[uIdx(nx, j)] = grid.u[uIdx(nx - 1, j)]; // zero-gradient
      grid.p[pIdx(nx - 1, j)] = 0;
    } else if (bcs.right.type === 'wall') {
      grid.u[uIdx(nx, j)] = 0;
    } else if (bcs.right.type === 'symmetry') {
      grid.u[uIdx(nx, j)] = 0;
    }
    if (bcs.right.temperature !== undefined) {
      grid.T[pIdx(nx - 1, j)] = bcs.right.temperature;
    }
  }

  // --- Bottom boundary (j = 0) ---
  for (let i = 0; i < nx; i++) {
    if (bcs.bottom.type === 'velocity-inlet') {
      grid.v[vIdx(i, 0)] = bcs.bottom.velocity ?? 0;
    } else if (bcs.bottom.type === 'pressure-outlet') {
      grid.v[vIdx(i, 0)] = grid.v[vIdx(i, 1)];
      grid.p[pIdx(i, 0)] = 0;
    } else if (bcs.bottom.type === 'wall') {
      grid.v[vIdx(i, 0)] = 0;
    } else if (bcs.bottom.type === 'symmetry') {
      grid.v[vIdx(i, 0)] = 0;
    }
    if (bcs.bottom.temperature !== undefined) {
      grid.T[pIdx(i, 0)] = bcs.bottom.temperature;
    }
  }

  // --- Top boundary (j = ny) ---
  for (let i = 0; i < nx; i++) {
    if (bcs.top.type === 'velocity-inlet') {
      grid.v[vIdx(i, ny)] = bcs.top.velocity ?? 0;
    } else if (bcs.top.type === 'pressure-outlet') {
      grid.v[vIdx(i, ny)] = grid.v[vIdx(i, ny - 1)];
      grid.p[pIdx(i, ny - 1)] = 0;
    } else if (bcs.top.type === 'wall') {
      grid.v[vIdx(i, ny)] = 0;
    } else if (bcs.top.type === 'symmetry') {
      grid.v[vIdx(i, ny)] = 0;
    }
    if (bcs.top.temperature !== undefined) {
      grid.T[pIdx(i, ny - 1)] = bcs.top.temperature;
    }
  }

  // Wall no-slip for tangential velocities (ghost-cell approach)
  for (let i = 1; i < nx; i++) {
    if (bcs.bottom.type === 'wall') {
      grid.u[uIdx(i, 0)] = -grid.u[uIdx(i, 1)]; // mirror for no-slip at wall
    }
    if (bcs.top.type === 'wall') {
      grid.u[uIdx(i, ny - 1)] = -grid.u[uIdx(i, ny - 2)];
    }
  }
  for (let j = 1; j < ny; j++) {
    if (bcs.left.type === 'wall') {
      grid.v[vIdx(0, j)] = -grid.v[vIdx(1, j)];
    }
    if (bcs.right.type === 'wall') {
      grid.v[vIdx(nx - 1, j)] = -grid.v[vIdx(nx - 2, j)];
    }
  }
}

// ----------------------------------------------------------------------------
// SIMPLE Algorithm Solver
// ----------------------------------------------------------------------------

/**
 * Solve the 2D incompressible Navier-Stokes equations using the SIMPLE
 * (Semi-Implicit Method for Pressure-Linked Equations) algorithm on
 * a staggered grid.
 *
 * Steps per iteration:
 *   1. Momentum predictor: compute u*, v* from current pressure field
 *   2. Pressure correction: solve Poisson equation via Gauss-Seidel
 *   3. Velocity correction: update u, v from pressure correction
 *   4. Under-relaxation for stability
 *   5. Check convergence (continuity residual)
 */
export function solveSIMPLE(grid: CFDGrid2D, params: CFDParams2D): CFDResult2D {
  const { nx, ny, dx, dy } = grid;
  const { density: rho, viscosity: mu, alphaU, alphaP, maxIterations, convergenceTol } = params;
  const nu = mu / rho;

  const uIdx = (i: number, j: number) => j * (nx + 1) + i;
  const vIdx = (i: number, j: number) => j * nx + i;
  const pIdx = (i: number, j: number) => j * nx + i;

  // Pressure correction field
  const pp = new Float64Array(nx * ny);
  const residualHistory: number[] = [];
  let converged = false;
  let iter = 0;

  for (iter = 0; iter < maxIterations; iter++) {
    // --- Step 1: Momentum predictor (u*, v*) ---
    // Solve for intermediate velocities using current pressure
    // Simple first-order upwind + central diffusion
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx; i++) {
        const uE = grid.u[uIdx(i + 1 <= nx ? i + 1 : i, j)];
        const uW = grid.u[uIdx(i - 1, j)];
        const uN = grid.u[uIdx(i, j + 1 < ny ? j + 1 : j)];
        const uS = grid.u[uIdx(i, j - 1)];
        const uC = grid.u[uIdx(i, j)];

        // Diffusion
        const diff = nu * ((uE - 2 * uC + uW) / (dx * dx) + (uN - 2 * uC + uS) / (dy * dy));
        // Convection (first-order upwind)
        const uc = 0.5 * (grid.u[uIdx(i, j)] + grid.u[uIdx(i + 1 <= nx ? i + 1 : i, j)]);
        const vc = 0.5 * (grid.v[vIdx(Math.min(i, nx - 1), j)] + grid.v[vIdx(Math.min(i, nx - 1), j + 1 < ny + 1 ? j + 1 : j)]);
        const conv = uc * (uE - uW) / (2 * dx) + vc * (uN - uS) / (2 * dy);
        // Pressure gradient
        const pGrad = (i < nx && i > 0)
          ? (grid.p[pIdx(Math.min(i, nx - 1), j)] - grid.p[pIdx(Math.max(i - 1, 0), j)]) / dx
          : 0;

        grid.u[uIdx(i, j)] = uC + alphaU * (diff - conv - pGrad / rho - uC + uC);
        // Simplified: u* = uC + alphaU * dt_pseudo * (diff - conv - gradP/rho)
        // Using a pseudo-timestep approach folded into under-relaxation
        const dtPseudo = 0.25 * Math.min(dx * dx, dy * dy) / (nu + 1e-12);
        grid.u[uIdx(i, j)] = uC + alphaU * dtPseudo * (diff - conv - pGrad / rho);
      }
    }

    for (let j = 1; j < ny; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const vE = grid.v[vIdx(i + 1, j)];
        const vW = grid.v[vIdx(i - 1, j)];
        const vN = grid.v[vIdx(i, j + 1 <= ny ? j + 1 : j)];
        const vS = grid.v[vIdx(i, j - 1)];
        const vC = grid.v[vIdx(i, j)];

        const diff = nu * ((vE - 2 * vC + vW) / (dx * dx) + (vN - 2 * vC + vS) / (dy * dy));
        const uc = 0.5 * (grid.u[uIdx(i, Math.min(j, ny - 1))] + grid.u[uIdx(i + 1, Math.min(j, ny - 1))]);
        const vc = 0.5 * (grid.v[vIdx(i, j)] + grid.v[vIdx(i, j + 1 <= ny ? j + 1 : j)]);
        const conv = uc * (vE - vW) / (2 * dx) + vc * (vN - vS) / (2 * dy);
        const pGrad = (j < ny && j > 0)
          ? (grid.p[pIdx(i, Math.min(j, ny - 1))] - grid.p[pIdx(i, Math.max(j - 1, 0))]) / dy
          : 0;

        const dtPseudo = 0.25 * Math.min(dx * dx, dy * dy) / (nu + 1e-12);
        grid.v[vIdx(i, j)] = vC + alphaU * dtPseudo * (diff - conv - pGrad / rho);
      }
    }

    // --- Step 2: Pressure correction (Poisson equation via Gauss-Seidel) ---
    // Compute divergence of u* as the RHS
    pp.fill(0);
    const gsIterations = 50;
    const coeffX = 1 / (dx * dx);
    const coeffY = 1 / (dy * dy);
    const aP = -2 * (coeffX + coeffY);

    for (let gsIter = 0; gsIter < gsIterations; gsIter++) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          // Divergence of velocity at cell (i, j)
          const divU = (grid.u[uIdx(i + 1, j)] - grid.u[uIdx(i, j)]) / dx
                     + (grid.v[vIdx(i, j + 1)] - grid.v[vIdx(i, j)]) / dy;

          const ppE = (i < nx - 1) ? pp[pIdx(i + 1, j)] : 0;
          const ppW = (i > 0) ? pp[pIdx(i - 1, j)] : 0;
          const ppN = (j < ny - 1) ? pp[pIdx(i, j + 1)] : 0;
          const ppS = (j > 0) ? pp[pIdx(i, j - 1)] : 0;

          pp[pIdx(i, j)] = (rho * divU / (0.25 * Math.min(dx * dx, dy * dy) / (nu + 1e-12))
                           - coeffX * (ppE + ppW) - coeffY * (ppN + ppS)) / aP;
        }
      }
    }

    // --- Step 3: Velocity correction ---
    const dtPseudo = 0.25 * Math.min(dx * dx, dy * dy) / (nu + 1e-12);
    for (let j = 0; j < ny; j++) {
      for (let i = 1; i < nx; i++) {
        grid.u[uIdx(i, j)] -= dtPseudo / rho * (pp[pIdx(Math.min(i, nx - 1), j)] - pp[pIdx(i - 1, j)]) / dx;
      }
    }
    for (let j = 1; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        grid.v[vIdx(i, j)] -= dtPseudo / rho * (pp[pIdx(i, Math.min(j, ny - 1))] - pp[pIdx(i, j - 1)]) / dy;
      }
    }

    // --- Step 4: Pressure update with under-relaxation ---
    for (let k = 0; k < nx * ny; k++) {
      grid.p[k] += alphaP * pp[k];
    }

    // --- Step 5: Thermal solve (if enabled) ---
    if (params.thermal && params.thermalConductivity) {
      const alpha = params.thermalConductivity / (rho * 1000); // thermal diffusivity (assuming Cp~1000)
      for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          const TC = grid.T[pIdx(i, j)];
          const TE = grid.T[pIdx(i + 1, j)];
          const TW = grid.T[pIdx(i - 1, j)];
          const TN = grid.T[pIdx(i, j + 1)];
          const TS = grid.T[pIdx(i, j - 1)];
          const uc = 0.5 * (grid.u[uIdx(i, j)] + grid.u[uIdx(i + 1, j)]);
          const vc = 0.5 * (grid.v[vIdx(i, j)] + grid.v[vIdx(i, j + 1)]);
          const diffT = alpha * ((TE - 2 * TC + TW) / (dx * dx) + (TN - 2 * TC + TS) / (dy * dy));
          const convT = uc * (TE - TW) / (2 * dx) + vc * (TN - TS) / (2 * dy);
          grid.T[pIdx(i, j)] = TC + dtPseudo * (diffT - convT);
        }
      }
    }

    // --- Convergence check: continuity residual ---
    let maxResidual = 0;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const divU = Math.abs(
          (grid.u[uIdx(i + 1, j)] - grid.u[uIdx(i, j)]) / dx
          + (grid.v[vIdx(i, j + 1)] - grid.v[vIdx(i, j)]) / dy
        );
        if (divU > maxResidual) maxResidual = divU;
      }
    }
    residualHistory.push(maxResidual);

    if (maxResidual < convergenceTol) {
      converged = true;
      iter++;
      break;
    }
  }

  // Compute max velocity and pressure
  let maxVelocity = 0;
  for (let k = 0; k < grid.u.length; k++) {
    const absU = Math.abs(grid.u[k]);
    if (absU > maxVelocity) maxVelocity = absU;
  }
  for (let k = 0; k < grid.v.length; k++) {
    const absV = Math.abs(grid.v[k]);
    if (absV > maxVelocity) maxVelocity = absV;
  }
  let maxPressure = 0;
  for (let k = 0; k < grid.p.length; k++) {
    const absP = Math.abs(grid.p[k]);
    if (absP > maxPressure) maxPressure = absP;
  }

  const { cd, cl } = computeDragLift(grid, params);
  const streamlines = computeStreamlines2D(grid, 8);

  return {
    converged,
    iterations: iter,
    residualHistory,
    maxVelocity,
    maxPressure,
    dragCoefficient: cd,
    liftCoefficient: cl,
    grid,
    streamlines,
  };
}

// ----------------------------------------------------------------------------
// 2D Streamline Computation (RK4)
// ----------------------------------------------------------------------------

/**
 * Compute 2D streamlines by integrating the velocity field using
 * 4th-order Runge-Kutta. Seed points are evenly distributed along
 * the left boundary.
 */
export function computeStreamlines2D(
  grid: CFDGrid2D,
  numLines: number,
): { x: number[]; y: number[] }[] {
  const { nx, ny, dx, dy, width, height } = grid;
  const streamlines: { x: number[]; y: number[] }[] = [];

  const uIdx = (i: number, j: number) => j * (nx + 1) + i;
  const vIdx = (i: number, j: number) => j * nx + i;

  // Bilinear interpolation of velocity at arbitrary (x, y)
  function interpVelocity(px: number, py: number): [number, number] | null {
    if (px < 0 || px > width || py < 0 || py > height) return null;

    // Interpolate u (defined at vertical faces: x = i*dx, y = (j+0.5)*dy)
    const ui = px / dx;
    const uj = py / dy - 0.5;
    const i0u = Math.max(0, Math.min(nx, Math.floor(ui)));
    const j0u = Math.max(0, Math.min(ny - 2, Math.floor(uj)));
    const i1u = Math.min(nx, i0u + 1);
    const j1u = Math.min(ny - 1, j0u + 1);
    const su = ui - i0u;
    const tu = uj - j0u;
    const uVal = (1 - su) * (1 - tu) * grid.u[uIdx(i0u, j0u)]
               + su * (1 - tu) * grid.u[uIdx(i1u, j0u)]
               + (1 - su) * tu * grid.u[uIdx(i0u, j1u)]
               + su * tu * grid.u[uIdx(i1u, j1u)];

    // Interpolate v (defined at horizontal faces: x = (i+0.5)*dx, y = j*dy)
    const vi = px / dx - 0.5;
    const vj = py / dy;
    const i0v = Math.max(0, Math.min(nx - 2, Math.floor(vi)));
    const j0v = Math.max(0, Math.min(ny, Math.floor(vj)));
    const i1v = Math.min(nx - 1, i0v + 1);
    const j1v = Math.min(ny, j0v + 1);
    const sv = vi - i0v;
    const tv = vj - j0v;
    const vVal = (1 - sv) * (1 - tv) * grid.v[vIdx(i0v, j0v)]
               + sv * (1 - tv) * grid.v[vIdx(i1v, j0v)]
               + (1 - sv) * tv * grid.v[vIdx(i0v, j1v)]
               + sv * tv * grid.v[vIdx(i1v, j1v)];

    return [uVal, vVal];
  }

  const stepSize = Math.min(dx, dy) * 0.5;
  const maxSteps = Math.ceil((width + height) / stepSize) * 2;

  for (let n = 0; n < numLines; n++) {
    const xs: number[] = [];
    const ys: number[] = [];
    let px = dx * 0.5;
    let py = (n + 0.5) * height / numLines;

    for (let step = 0; step < maxSteps; step++) {
      const v1 = interpVelocity(px, py);
      if (!v1) break;
      const mag = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
      if (mag < 1e-12) break;

      xs.push(px);
      ys.push(py);

      // RK4 integration
      const k1 = v1;
      const v2 = interpVelocity(px + 0.5 * stepSize * k1[0], py + 0.5 * stepSize * k1[1]);
      if (!v2) break;
      const k2 = v2;
      const v3 = interpVelocity(px + 0.5 * stepSize * k2[0], py + 0.5 * stepSize * k2[1]);
      if (!v3) break;
      const k3 = v3;
      const v4 = interpVelocity(px + stepSize * k3[0], py + stepSize * k3[1]);
      if (!v4) break;
      const k4 = v4;

      px += (stepSize / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
      py += (stepSize / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);

      if (px < 0 || px > width || py < 0 || py > height) break;
    }

    if (xs.length > 1) {
      streamlines.push({ x: xs, y: ys });
    }
  }

  return streamlines;
}

// ----------------------------------------------------------------------------
// Drag and Lift Coefficients
// ----------------------------------------------------------------------------

/**
 * Estimate drag and lift coefficients from the 2D velocity field.
 * Computes wall shear stress on bottom and top walls and integrates
 * to get friction drag. Pressure drag is estimated from inlet/outlet
 * pressure difference.
 */
export function computeDragLift(
  grid: CFDGrid2D,
  params: CFDParams2D,
): { cd: number; cl: number } {
  const { nx, ny, dx, dy } = grid;
  const { density: rho, viscosity: mu, inletVelocity: Uinf } = params;

  const uIdx = (i: number, j: number) => j * (nx + 1) + i;
  const pIdx = (i: number, j: number) => j * nx + i;

  if (Math.abs(Uinf) < 1e-12) {
    return { cd: 0, cl: 0 };
  }

  const dynPressure = 0.5 * rho * Uinf * Uinf;
  const refLength = grid.height; // 2D reference "area" is the height

  // Friction drag: wall shear on bottom wall (j=0) and top wall (j=ny-1)
  let frictionDragX = 0;
  let frictionLiftY = 0;

  // Bottom wall shear: tau = mu * du/dy at y=0
  for (let i = 0; i < nx; i++) {
    const dudyBottom = (grid.u[uIdx(i, 1)] - grid.u[uIdx(i, 0)]) / dy;
    frictionDragX += mu * dudyBottom * dx;
  }
  // Top wall shear: tau = mu * du/dy at y=height
  for (let i = 0; i < nx; i++) {
    const dudyTop = (grid.u[uIdx(i, ny - 1)] - grid.u[uIdx(i, Math.max(ny - 2, 0))]) / dy;
    frictionDragX += mu * dudyTop * dx;
  }

  // Pressure drag: integrate pressure difference on left and right boundaries
  let pressureDragX = 0;
  for (let j = 0; j < ny; j++) {
    const pLeft = grid.p[pIdx(0, j)];
    const pRight = grid.p[pIdx(nx - 1, j)];
    pressureDragX += (pLeft - pRight) * dy;
  }

  // Lift from pressure on top and bottom
  for (let i = 0; i < nx; i++) {
    const pBottom = grid.p[pIdx(i, 0)];
    const pTop = grid.p[pIdx(i, ny - 1)];
    frictionLiftY += (pBottom - pTop) * dx;
  }

  const totalDrag = Math.abs(frictionDragX) + Math.abs(pressureDragX);
  const totalLift = Math.abs(frictionLiftY);

  const cd = (dynPressure * refLength > 0) ? totalDrag / (dynPressure * refLength) : 0;
  const cl = (dynPressure * refLength > 0) ? totalLift / (dynPressure * refLength) : 0;

  return { cd, cl };
}
