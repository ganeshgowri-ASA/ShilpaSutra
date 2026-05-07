import {
  lineLineIntersection,
  lineArcIntersection,
  arcArcIntersection,
  offsetLine,
  mirrorPoint,
  mirrorLine,
  movePoints,
  rotatePoints,
  linearSketchPattern,
  circularSketchPattern,
  circleFrom3Points,
  createCenterRectangle,
  createSlotProfile,
  createEllipsePoints,
  pointOnEllipse,
  arcFrom3Points,
} from "../sketch-engine";

const approx = (a: number, b: number, eps = 1e-8) => Math.abs(a - b) < eps;

describe("lineLineIntersection", () => {
  it("finds intersection of two perpendicular lines", () => {
    const pt = lineLineIntersection([0, 0], [2, 0], [1, -1], [1, 1]);
    expect(pt).not.toBeNull();
    expect(pt![0]).toBeCloseTo(1);
    expect(pt![1]).toBeCloseTo(0);
  });

  it("returns null for parallel lines", () => {
    expect(lineLineIntersection([0, 0], [1, 0], [0, 1], [1, 1])).toBeNull();
  });

  it("returns null for coincident lines", () => {
    expect(lineLineIntersection([0, 0], [1, 0], [0, 0], [1, 0])).toBeNull();
  });

  it("finds intersection of diagonal lines", () => {
    // y=x and y=-x+2 intersect at (1,1)
    const pt = lineLineIntersection([0, 0], [2, 2], [0, 2], [2, 0]);
    expect(pt).not.toBeNull();
    expect(pt![0]).toBeCloseTo(1);
    expect(pt![1]).toBeCloseTo(1);
  });
});

describe("lineArcIntersection", () => {
  it("finds two intersection points of a line through the center of a circle", () => {
    // Horizontal line through origin, circle at origin radius 5
    const pts = lineArcIntersection([0, 0], [1, 0], [0, 0], 5);
    expect(pts).toHaveLength(2);
    // Should be at x=±5, y=0
    const xs = pts.map(p => p[0]).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(-5);
    expect(xs[1]).toBeCloseTo(5);
  });

  it("finds one tangent point", () => {
    // Line y=5 is tangent to circle at origin radius 5
    const pts = lineArcIntersection([0, 5], [1, 5], [0, 0], 5);
    expect(pts).toHaveLength(1);
    expect(pts[0][1]).toBeCloseTo(5);
  });

  it("returns empty for non-intersecting line", () => {
    // Line y=10 does not intersect circle at origin radius 5
    const pts = lineArcIntersection([0, 10], [1, 10], [0, 0], 5);
    expect(pts).toHaveLength(0);
  });
});

describe("arcArcIntersection", () => {
  it("finds two intersections of equal circles at distance d", () => {
    // Two unit circles centered at (0,0) and (1,0)
    const pts = arcArcIntersection([0, 0], 1, [1, 0], 1);
    expect(pts).toHaveLength(2);
    // Both points should be equidistant from each center
    pts.forEach(p => {
      const d1 = Math.sqrt(p[0] ** 2 + p[1] ** 2);
      const d2 = Math.sqrt((p[0] - 1) ** 2 + p[1] ** 2);
      expect(d1).toBeCloseTo(1, 5);
      expect(d2).toBeCloseTo(1, 5);
    });
  });

  it("returns empty for disjoint circles", () => {
    expect(arcArcIntersection([0, 0], 1, [10, 0], 1)).toHaveLength(0);
  });

  it("returns empty for concentric circles", () => {
    expect(arcArcIntersection([0, 0], 1, [0, 0], 2)).toHaveLength(0);
  });

  it("returns one point for internally tangent circles", () => {
    // Circles at (0,0) r=2 and (1,0) r=1 are internally tangent at (2,0)
    const pts = arcArcIntersection([0, 0], 2, [1, 0], 1);
    expect(pts).toHaveLength(1);
    expect(pts[0][0]).toBeCloseTo(2);
    expect(pts[0][1]).toBeCloseTo(0);
  });
});

describe("offsetLine", () => {
  it("offsets horizontal line upward with positive distance", () => {
    const result = offsetLine([0, 0], [10, 0], 5);
    expect(result.start[1]).toBeCloseTo(5);
    expect(result.end[1]).toBeCloseTo(5);
    expect(result.start[0]).toBeCloseTo(0);
    expect(result.end[0]).toBeCloseTo(10);
  });

  it("offsets horizontal line downward with negative distance", () => {
    const result = offsetLine([0, 0], [10, 0], -5);
    expect(result.start[1]).toBeCloseTo(-5);
    expect(result.end[1]).toBeCloseTo(-5);
  });

  it("offsets vertical line to the left with negative distance", () => {
    const result = offsetLine([0, 0], [0, 10], -3);
    expect(result.start[0]).toBeCloseTo(3);
    expect(result.end[0]).toBeCloseTo(3);
  });
});

describe("mirrorPoint", () => {
  it("mirrors point across horizontal axis", () => {
    const p = mirrorPoint([3, 4], [0, 0], [1, 0]);
    expect(p[0]).toBeCloseTo(3);
    expect(p[1]).toBeCloseTo(-4);
  });

  it("mirrors point across vertical axis", () => {
    const p = mirrorPoint([3, 4], [0, 0], [0, 1]);
    expect(p[0]).toBeCloseTo(-3);
    expect(p[1]).toBeCloseTo(4);
  });

  it("mirrors point across diagonal (y=x)", () => {
    // Mirror (3, 1) across y=x → (1, 3)
    const p = mirrorPoint([3, 1], [0, 0], [1, 1]);
    expect(p[0]).toBeCloseTo(1);
    expect(p[1]).toBeCloseTo(3);
  });

  it("point on mirror axis is unchanged", () => {
    const p = mirrorPoint([5, 0], [0, 0], [1, 0]);
    expect(p[0]).toBeCloseTo(5);
    expect(p[1]).toBeCloseTo(0);
  });
});

describe("mirrorLine", () => {
  it("mirrors a horizontal line across the x-axis", () => {
    const { start, end } = mirrorLine([0, 3], [4, 3], [0, 0], [1, 0]);
    expect(start[1]).toBeCloseTo(-3);
    expect(end[1]).toBeCloseTo(-3);
    expect(start[0]).toBeCloseTo(0);
    expect(end[0]).toBeCloseTo(4);
  });
});

describe("movePoints", () => {
  it("translates all points by (dx, dy)", () => {
    const pts: [number, number][] = [[0, 0], [1, 1], [2, 3]];
    const moved = movePoints(pts, 5, -2);
    expect(moved[0]).toEqual([5, -2]);
    expect(moved[1]).toEqual([6, -1]);
    expect(moved[2]).toEqual([7, 1]);
  });

  it("returns a new array and does not mutate original", () => {
    const pts: [number, number][] = [[0, 0]];
    movePoints(pts, 10, 10);
    expect(pts[0]).toEqual([0, 0]);
  });
});

describe("rotatePoints", () => {
  it("rotates 90° around origin", () => {
    const pts: [number, number][] = [[1, 0]];
    const rotated = rotatePoints(pts, [0, 0], 90);
    expect(rotated[0][0]).toBeCloseTo(0);
    expect(rotated[0][1]).toBeCloseTo(1);
  });

  it("rotates 180° around origin", () => {
    const pts: [number, number][] = [[2, 3]];
    const rotated = rotatePoints(pts, [0, 0], 180);
    expect(rotated[0][0]).toBeCloseTo(-2);
    expect(rotated[0][1]).toBeCloseTo(-3);
  });

  it("rotates around arbitrary center", () => {
    // Rotate (3, 1) 90° around (1, 1) → (1, 3)
    const rotated = rotatePoints([[3, 1]], [1, 1], 90);
    expect(rotated[0][0]).toBeCloseTo(1);
    expect(rotated[0][1]).toBeCloseTo(3);
  });

  it("0° rotation is identity", () => {
    const pts: [number, number][] = [[5, 7]];
    const rotated = rotatePoints(pts, [0, 0], 0);
    expect(rotated[0][0]).toBeCloseTo(5);
    expect(rotated[0][1]).toBeCloseTo(7);
  });
});

describe("linearSketchPattern", () => {
  it("returns N copies offset by spacing", () => {
    const pts: [number, number][] = [[0, 0]];
    const result = linearSketchPattern(pts, 10, 0, 3);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual([[0, 0]]);
    expect(result[1][0][0]).toBeCloseTo(10);
    expect(result[2][0][0]).toBeCloseTo(20);
  });

  it("applies both dx and dy offsets", () => {
    const pts: [number, number][] = [[0, 0]];
    const result = linearSketchPattern(pts, 5, 5, 2);
    expect(result[1][0]).toEqual([5, 5]);
  });
});

describe("circularSketchPattern", () => {
  it("returns N equally spaced copies around a center", () => {
    const pts: [number, number][] = [[10, 0]];
    const result = circularSketchPattern(pts, [0, 0], 4, 360);
    expect(result).toHaveLength(4);
    // Instance 1 at 90° → (0, 10)
    expect(result[1][0][0]).toBeCloseTo(0, 4);
    expect(result[1][0][1]).toBeCloseTo(10, 4);
    // Instance 2 at 180° → (-10, 0)
    expect(result[2][0][0]).toBeCloseTo(-10, 4);
    expect(result[2][0][1]).toBeCloseTo(0, 4);
  });
});

describe("circleFrom3Points", () => {
  it("finds the circumscribed circle of a right triangle", () => {
    // A right triangle with hypotenuse as diameter: (0,0), (4,0), (0,4) → circle center (2,2), radius √8
    const c = circleFrom3Points([0, 0], [4, 0], [0, 4]);
    expect(c).not.toBeNull();
    expect(c!.center[0]).toBeCloseTo(2);
    expect(c!.center[1]).toBeCloseTo(2);
    expect(c!.radius).toBeCloseTo(Math.sqrt(8), 5);
  });

  it("returns null for collinear points", () => {
    expect(circleFrom3Points([0, 0], [1, 1], [2, 2])).toBeNull();
  });
});

describe("createCenterRectangle", () => {
  it("returns 4 points forming the rectangle (takes halfWidth, halfHeight)", () => {
    const pts = createCenterRectangle([0, 0], 5, 3);
    expect(pts).toHaveLength(4);
    const xs = pts.map(p => p[0]);
    const ys = pts.map(p => p[1]);
    expect(Math.max(...xs)).toBeCloseTo(5);
    expect(Math.min(...xs)).toBeCloseTo(-5);
    expect(Math.max(...ys)).toBeCloseTo(3);
    expect(Math.min(...ys)).toBeCloseTo(-3);
  });

  it("is centered on the given point", () => {
    const pts = createCenterRectangle([10, 20], 2, 1);
    const xs = pts.map(p => p[0]);
    const ys = pts.map(p => p[1]);
    expect(Math.max(...xs)).toBeCloseTo(12);
    expect(Math.min(...xs)).toBeCloseTo(8);
    expect(Math.max(...ys)).toBeCloseTo(21);
    expect(Math.min(...ys)).toBeCloseTo(19);
  });
});

describe("createSlotProfile", () => {
  it("returns an object with lines and arcs arrays", () => {
    const slot = createSlotProfile([0, 0], [10, 0], 4);
    expect(slot).toHaveProperty("lines");
    expect(slot).toHaveProperty("arcs");
    expect(Array.isArray(slot.lines)).toBe(true);
    expect(Array.isArray(slot.arcs)).toBe(true);
  });

  it("has two end arcs for a straight slot", () => {
    const slot = createSlotProfile([0, 0], [10, 0], 4, "straight");
    expect(slot.arcs).toHaveLength(2);
  });

  it("degenerate slot (same centers) returns a single circle arc", () => {
    const slot = createSlotProfile([5, 5], [5, 5], 3);
    expect(slot.lines).toHaveLength(0);
    expect(slot.arcs).toHaveLength(1);
  });
});

describe("createEllipsePoints", () => {
  it("returns segments+1 points (closed loop)", () => {
    // Implementation uses i <= segments so returns segments+1 points
    const pts = createEllipsePoints([0, 0], 5, 3, 0, 36);
    expect(pts).toHaveLength(37);
  });

  it("points lie approximately on the ellipse", () => {
    const rx = 5, ry = 3;
    const pts = createEllipsePoints([0, 0], rx, ry, 0, 360);
    // Skip last point (duplicate of first in closed loop)
    pts.slice(0, -1).forEach(([x, y]) => {
      const norm = (x / rx) ** 2 + (y / ry) ** 2;
      expect(norm).toBeCloseTo(1, 5);
    });
  });
});

describe("pointOnEllipse", () => {
  it("returns true for a point on the ellipse", () => {
    // (5, 0) is on ellipse centered at (0,0) with rx=5, ry=3
    expect(pointOnEllipse([5, 0], [0, 0], 5, 3)).toBe(true);
  });

  it("returns true for top point (0, ry)", () => {
    expect(pointOnEllipse([0, 3], [0, 0], 5, 3)).toBe(true);
  });

  it("returns false for a point clearly off the ellipse", () => {
    expect(pointOnEllipse([0, 0], [0, 0], 5, 3)).toBe(false);
    expect(pointOnEllipse([10, 10], [0, 0], 5, 3)).toBe(false);
  });
});

describe("arcFrom3Points", () => {
  it("finds arc through 3 points on a known circle", () => {
    // Circle at (0,0) r=5 — points at 0°, 90°, 180°
    const arc = arcFrom3Points([5, 0], [0, 5], [-5, 0]);
    expect(arc).not.toBeNull();
    expect(arc!.center[0]).toBeCloseTo(0, 4);
    expect(arc!.center[1]).toBeCloseTo(0, 4);
    expect(arc!.radius).toBeCloseTo(5, 4);
  });

  it("returns null for collinear points", () => {
    expect(arcFrom3Points([0, 0], [1, 0], [2, 0])).toBeNull();
  });
});
