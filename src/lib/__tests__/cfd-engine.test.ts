import {
  getFluidMaterial,
  calculateYPlus,
  estimateBoundaryLayerThickness,
  calculateReynoldsNumber,
  estimateFirstLayerHeight,
  checkConvergence,
  calculateRelaxationFactors,
  estimateRemainingIterations,
  calculateDragCoefficient,
  calculateLiftCoefficient,
  calculateMassFlowRate,
  calculatePressureDrop,
  createDefaultSolverSettings,
  createDefaultBoundaryCondition,
  createDefaultMeshSettings,
  generateForceReport,
  ResidualHistory,
} from "@/lib/cfd-engine";

function residuals(overrides: Partial<ResidualHistory> = {}): ResidualHistory {
  return {
    iteration: 0,
    continuity: 1e-7,
    xMomentum: 1e-7,
    yMomentum: 1e-7,
    zMomentum: 1e-7,
    energy: 1e-7,
    turbulence1: 1e-7,
    turbulence2: 1e-7,
    ...overrides,
  };
}

describe("getFluidMaterial", () => {
  it("finds a known material by id", () => {
    const air = getFluidMaterial("air-20c");
    expect(air).toBeDefined();
    expect(air?.name).toContain("Air");
  });

  it("returns undefined for an unknown id", () => {
    expect(getFluidMaterial("does-not-exist")).toBeUndefined();
  });
});

describe("calculateReynoldsNumber", () => {
  it("computes Re = rho * U * L / mu", () => {
    expect(calculateReynoldsNumber(2, 1, 1.2, 0.0002)).toBeCloseTo(12000);
  });

  it("uses the magnitude of velocity", () => {
    expect(calculateReynoldsNumber(-2, 1, 1.2, 0.0002)).toBeCloseTo(12000);
  });

  it("throws for non-positive viscosity", () => {
    expect(() => calculateReynoldsNumber(1, 1, 1, 0)).toThrow();
  });
});

describe("calculateYPlus", () => {
  it("computes y+ from wall shear stress", () => {
    const yPlus = calculateYPlus(1, 1000, 0.001, 0.0001);
    const frictionVelocity = Math.sqrt(1 / 1000);
    const expected = (frictionVelocity * 0.0001) / (0.001 / 1000);
    expect(yPlus).toBeCloseTo(expected);
  });

  it("throws for non-positive density or viscosity", () => {
    expect(() => calculateYPlus(1, 0, 0.001, 0.0001)).toThrow();
    expect(() => calculateYPlus(1, 1000, 0, 0.0001)).toThrow();
  });
});

describe("estimateBoundaryLayerThickness", () => {
  it("uses the laminar Blasius correlation below Re=5e5", () => {
    const re = 1e5;
    const l = 1;
    expect(estimateBoundaryLayerThickness(re, l)).toBeCloseTo(
      (5.0 * l) / Math.sqrt(re),
    );
  });

  it("uses the turbulent 1/5 power law above Re=5e5", () => {
    const re = 1e6;
    const l = 1;
    expect(estimateBoundaryLayerThickness(re, l)).toBeCloseTo(
      (0.37 * l) / Math.pow(re, 0.2),
    );
  });

  it("throws for non-positive inputs", () => {
    expect(() => estimateBoundaryLayerThickness(0, 1)).toThrow();
    expect(() => estimateBoundaryLayerThickness(1e5, 0)).toThrow();
  });
});

describe("estimateFirstLayerHeight", () => {
  it("returns a positive layer height for typical flow conditions", () => {
    const height = estimateFirstLayerHeight(1, 10, 1, 1.8e-5, 1.2);
    expect(height).toBeGreaterThan(0);
  });

  it("throws when any input is non-positive", () => {
    expect(() => estimateFirstLayerHeight(1, 0, 1, 1.8e-5, 1.2)).toThrow();
    expect(() => estimateFirstLayerHeight(1, 10, 0, 1.8e-5, 1.2)).toThrow();
    expect(() => estimateFirstLayerHeight(1, 10, 1, 0, 1.2)).toThrow();
    expect(() => estimateFirstLayerHeight(1, 10, 1, 1.8e-5, 0)).toThrow();
  });
});

describe("checkConvergence", () => {
  it("is true when every residual is below the criteria", () => {
    expect(checkConvergence(residuals(), 1e-6)).toBe(true);
  });

  it("is false when any single residual is above the criteria", () => {
    expect(checkConvergence(residuals({ energy: 1e-3 }), 1e-6)).toBe(false);
    expect(checkConvergence(residuals({ turbulence2: 1e-3 }), 1e-6)).toBe(false);
  });
});

describe("calculateRelaxationFactors", () => {
  it("uses conservative factors when residuals are large", () => {
    const factors = calculateRelaxationFactors(0, residuals({ continuity: 1 }));
    expect(factors.pressure).toBeCloseTo(0.1);
    expect(factors.velocity).toBeCloseTo(0.3);
  });

  it("uses aggressive factors once residuals are well converged", () => {
    const factors = calculateRelaxationFactors(200, residuals());
    expect(factors.pressure).toBeCloseTo(0.4);
    expect(factors.velocity).toBeCloseTo(0.8);
  });
});

describe("estimateRemainingIterations", () => {
  it("returns Infinity when history is too short", () => {
    expect(estimateRemainingIterations([residuals()], 1e-6)).toBe(Infinity);
  });

  it("returns Infinity when residuals are not decreasing", () => {
    const history = Array.from({ length: 12 }, (_, i) =>
      residuals({ iteration: i, continuity: 1e-3 }),
    );
    expect(estimateRemainingIterations(history, 1e-6)).toBe(Infinity);
  });

  it("estimates a finite iteration count for decaying residuals", () => {
    const history = Array.from({ length: 20 }, (_, i) =>
      residuals({ iteration: i, continuity: 1 * Math.pow(10, -i / 5) }),
    );
    const remaining = estimateRemainingIterations(history, 1e-6);
    expect(remaining).toBeGreaterThan(0);
    expect(Number.isFinite(remaining)).toBe(true);
  });
});

describe("calculateDragCoefficient / calculateLiftCoefficient", () => {
  it("computes Cd = F / (0.5 * rho * U^2 * A)", () => {
    expect(calculateDragCoefficient(10, 1.2, 5, 2)).toBeCloseTo(
      10 / (0.5 * 1.2 * 25 * 2),
    );
  });

  it("computes Cl = F / (0.5 * rho * U^2 * A)", () => {
    expect(calculateLiftCoefficient(4, 1.2, 5, 2)).toBeCloseTo(
      4 / (0.5 * 1.2 * 25 * 2),
    );
  });

  it("throws when dynamic pressure times area is zero", () => {
    expect(() => calculateDragCoefficient(10, 1.2, 0, 2)).toThrow();
    expect(() => calculateLiftCoefficient(10, 1.2, 5, 0)).toThrow();
  });
});

describe("calculateMassFlowRate / calculatePressureDrop", () => {
  it("computes mdot = rho * U * A", () => {
    expect(calculateMassFlowRate(3, 1.2, 2)).toBeCloseTo(7.2);
  });

  it("computes deltaP = inlet - outlet", () => {
    expect(calculatePressureDrop(101500, 101000)).toBeCloseTo(500);
  });
});

describe("createDefaultSolverSettings", () => {
  it("defaults laminar flow to no turbulence scheme", () => {
    const settings = createDefaultSolverSettings("laminar");
    expect(settings.turbulenceScheme).toBe("none");
    expect(settings.relaxation.turbulence).toBe(1.0);
    expect(settings.algorithm).toBe("SIMPLE");
  });

  it("switches to the PISO algorithm for transient runs", () => {
    const settings = createDefaultSolverSettings("k-epsilon", true);
    expect(settings.algorithm).toBe("PISO");
    expect(settings.transient).toBe(true);
  });

  it("forces transient PISO settings for LES/DES models", () => {
    const settings = createDefaultSolverSettings("les-smagorinsky");
    expect(settings.algorithm).toBe("PISO");
    expect(settings.transient).toBe(true);
    expect(settings.timeStep).toBeCloseTo(1e-4);
  });
});

describe("createDefaultBoundaryCondition", () => {
  it("uses standard wall functions only for wall boundaries", () => {
    const wall = createDefaultBoundaryCondition("bc1", "Wall", "wall");
    expect(wall.wallFunction).toBe("standard");

    const inlet = createDefaultBoundaryCondition("bc2", "Inlet", "velocity-inlet");
    expect(inlet.wallFunction).toBe("none");
  });

  it("initializes pressure and temperature to standard atmospheric conditions", () => {
    const bc = createDefaultBoundaryCondition("bc3", "Outlet", "pressure-outlet");
    expect(bc.pressure).toBeCloseTo(101325);
    expect(bc.temperature).toBeCloseTo(293.15);
  });
});

describe("createDefaultMeshSettings", () => {
  it("scales element size and boundary layer height off the characteristic length", () => {
    const mesh = createDefaultMeshSettings(2);
    expect(mesh.elementSize).toBeCloseTo(0.1);
    expect(mesh.boundaryLayerFirstLayerHeight).toBeCloseTo(0.002);
  });
});

describe("generateForceReport", () => {
  it("computes force magnitudes and coefficients from vector components", () => {
    const report = generateForceReport(
      [3, 4, 0],
      [0, 5, 0],
      [0, 0, 1],
      1.2,
      10,
      2,
    );
    expect(report.dragForce).toEqual([3, 4, 0]);
    expect(report.dragCoefficient).toBeCloseTo(
      calculateDragCoefficient(5, 1.2, 10, 2),
    );
    expect(report.liftCoefficient).toBeCloseTo(
      calculateLiftCoefficient(5, 1.2, 10, 2),
    );
  });
});
