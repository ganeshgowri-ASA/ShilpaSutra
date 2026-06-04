import {
  lineLineIntersection,
  lineArcIntersection,
  arcArcIntersection,
  trimLine,
  extendLine,
  offsetLine,
  offsetArc,
  mirrorPoint,
  mirrorLine,
  mirrorArc,
  mirrorEntities,
  movePoints,
  rotatePoints,
  linearSketchPattern,
  circularSketchPattern,
  calculateDOF,
  circleFrom3Points,
  arcFrom3Points,
  createCenterRectangle,
  splitLine,
  breakLine,
  joinLines,
  lengthenLine,
  stretchLine,
  offsetPolyline,
  createSlotProfile,
  pointOnEllipse,
  projectToSketchPlane,
  sketchFillet,
  sketchChamfer,
  createSketchText,
} from '../sketch-engine';

const EPS = 1e-9;
function near(a: number, b: number, tol = 1e-9): boolean {
  return Math.abs(a - b) < tol;
}
function ptNear(a: [number, number], b: [number, number], tol = 1e-6): boolean {
  return near(a[0], b[0], tol) && near(a[1], b[1], tol);
}

// ─── lineLineIntersection ─────────────────────────────────────────────────────

describe('lineLineIntersection', () => {
  it('intersects two perpendicular lines at origin', () => {
    const p = lineLineIntersection([0, 0], [10, 0], [5, -5], [5, 5]);
    expect(p).not.toBeNull();
    expect(ptNear(p!, [5, 0])).toBe(true);
  });

  it('returns null for parallel lines', () => {
    expect(lineLineIntersection([0, 0], [10, 0], [0, 1], [10, 1])).toBeNull();
  });

  it('returns null for coincident lines', () => {
    expect(lineLineIntersection([0, 0], [10, 0], [0, 0], [10, 0])).toBeNull();
  });

  it('finds intersection of diagonal lines', () => {
    const p = lineLineIntersection([0, 0], [4, 4], [0, 4], [4, 0]);
    expect(p).not.toBeNull();
    expect(ptNear(p!, [2, 2])).toBe(true);
  });
});

// ─── lineArcIntersection ──────────────────────────────────────────────────────

describe('lineArcIntersection', () => {
  it('returns 2 points for chord through circle', () => {
    const pts = lineArcIntersection([-10, 0], [10, 0], [0, 0], 5);
    expect(pts.length).toBe(2);
    const xs = pts.map(p => p[0]).sort((a, b) => a - b);
    expect(near(xs[0], -5, 1e-6)).toBe(true);
    expect(near(xs[1], 5, 1e-6)).toBe(true);
  });

  it('returns 1 point for tangent line', () => {
    const pts = lineArcIntersection([-10, 5], [10, 5], [0, 0], 5);
    expect(pts.length).toBe(1);
    expect(near(pts[0][0], 0, 1e-4)).toBe(true);
    expect(near(pts[0][1], 5, 1e-4)).toBe(true);
  });

  it('returns 0 points for line outside circle', () => {
    const pts = lineArcIntersection([-10, 6], [10, 6], [0, 0], 5);
    expect(pts.length).toBe(0);
  });
});

// ─── arcArcIntersection ───────────────────────────────────────────────────────

describe('arcArcIntersection', () => {
  it('returns 2 points for crossing circles', () => {
    const pts = arcArcIntersection([0, 0], 5, [6, 0], 5);
    expect(pts.length).toBe(2);
  });

  it('returns 1 point for externally tangent circles', () => {
    const pts = arcArcIntersection([0, 0], 3, [6, 0], 3);
    expect(pts.length).toBe(1);
    expect(ptNear(pts[0], [3, 0], 1e-4)).toBe(true);
  });

  it('returns 0 points for distant circles', () => {
    const pts = arcArcIntersection([0, 0], 1, [100, 0], 1);
    expect(pts.length).toBe(0);
  });

  it('returns 0 points for concentric circles', () => {
    const pts = arcArcIntersection([0, 0], 2, [0, 0], 5);
    expect(pts.length).toBe(0);
  });
});

// ─── trimLine ─────────────────────────────────────────────────────────────────

describe('trimLine', () => {
  it('trims middle segment when line crosses two circles', () => {
    const circles = [
      { type: 'circle' as const, center: [-3, 0] as [number, number], radius: 1 },
      { type: 'circle' as const, center: [3, 0] as [number, number], radius: 1 },
    ];
    const r = trimLine([-10, 0], [10, 0], [0, 0], circles);
    expect(r.success).toBe(true);
    expect(r.remainingSegments.length).toBeGreaterThanOrEqual(2);
  });

  it('returns failure with no intersecting entities', () => {
    const r = trimLine([0, 0], [10, 0], [5, 0], []);
    expect(r.success).toBe(false);
  });
});

// ─── extendLine ───────────────────────────────────────────────────────────────

describe('extendLine', () => {
  it('extends line to intersect a boundary circle', () => {
    const boundary = [{ type: 'circle' as const, center: [20, 0] as [number, number], radius: 3 }];
    const newEnd = extendLine([0, 0], [10, 0], true, boundary);
    expect(newEnd).not.toBeNull();
    expect(newEnd![0]).toBeCloseTo(17, 2);
  });

  it('returns null when no boundary ahead', () => {
    const result = extendLine([0, 0], [10, 0], true, []);
    expect(result).toBeNull();
  });
});

// ─── offsetLine ───────────────────────────────────────────────────────────────

describe('offsetLine', () => {
  it('offsets horizontal line upward with positive distance', () => {
    const r = offsetLine([0, 0], [10, 0], 5);
    expect(ptNear(r.start, [0, 5], 1e-6)).toBe(true);
    expect(ptNear(r.end, [10, 5], 1e-6)).toBe(true);
  });

  it('offsets downward with negative distance', () => {
    const r = offsetLine([0, 0], [10, 0], -3);
    expect(r.start[1]).toBeCloseTo(-3, 6);
  });

  it('returns copy for degenerate line', () => {
    const r = offsetLine([5, 5], [5, 5], 10);
    expect(ptNear(r.start, [5, 5], 1e-6)).toBe(true);
  });
});

// ─── offsetArc ────────────────────────────────────────────────────────────────

describe('offsetArc', () => {
  it('grows radius for positive offset', () => {
    const r = offsetArc([0, 0], 10, 5);
    expect(r.radius).toBeCloseTo(15, 6);
  });

  it('shrinks radius for negative offset', () => {
    const r = offsetArc([0, 0], 10, -4);
    expect(r.radius).toBeCloseTo(6, 6);
  });

  it('clamps radius to 0 when over-shrunk', () => {
    const r = offsetArc([0, 0], 5, -10);
    expect(r.radius).toBe(0);
  });
});

// ─── mirrorPoint ─────────────────────────────────────────────────────────────

describe('mirrorPoint', () => {
  it('mirrors over X-axis', () => {
    const p = mirrorPoint([3, 4], [0, 0], [10, 0]);
    expect(ptNear(p, [3, -4], 1e-6)).toBe(true);
  });

  it('mirrors over Y-axis', () => {
    const p = mirrorPoint([3, 4], [0, 0], [0, 10]);
    expect(ptNear(p, [-3, 4], 1e-6)).toBe(true);
  });

  it('returns original for degenerate axis', () => {
    const p = mirrorPoint([3, 4], [5, 5], [5, 5]);
    expect(ptNear(p, [3, 4], 1e-6)).toBe(true);
  });
});

// ─── mirrorLine ───────────────────────────────────────────────────────────────

describe('mirrorLine', () => {
  it('mirrors line over X-axis', () => {
    const r = mirrorLine([0, 2], [4, 2], [0, 0], [10, 0]);
    expect(ptNear(r.start, [0, -2], 1e-6)).toBe(true);
    expect(ptNear(r.end, [4, -2], 1e-6)).toBe(true);
  });
});

// ─── movePoints ───────────────────────────────────────────────────────────────

describe('movePoints', () => {
  it('translates all points', () => {
    const pts = movePoints([[0, 0], [1, 0], [1, 1]], 3, -2);
    expect(ptNear(pts[0], [3, -2])).toBe(true);
    expect(ptNear(pts[1], [4, -2])).toBe(true);
    expect(ptNear(pts[2], [4, -1])).toBe(true);
  });

  it('handles empty array', () => {
    expect(movePoints([], 5, 5)).toEqual([]);
  });
});

// ─── rotatePoints ─────────────────────────────────────────────────────────────

describe('rotatePoints', () => {
  it('rotates 90 degrees CCW about origin', () => {
    const pts = rotatePoints([[1, 0]], [0, 0], 90);
    expect(near(pts[0][0], 0, 1e-6)).toBe(true);
    expect(near(pts[0][1], 1, 1e-6)).toBe(true);
  });

  it('rotates 180 degrees CCW about origin', () => {
    const pts = rotatePoints([[3, 0]], [0, 0], 180);
    expect(near(pts[0][0], -3, 1e-5)).toBe(true);
    expect(near(pts[0][1], 0, 1e-5)).toBe(true);
  });

  it('rotation by 0 degrees returns same points', () => {
    const pts = rotatePoints([[2, 3]], [0, 0], 0);
    expect(ptNear(pts[0], [2, 3], 1e-6)).toBe(true);
  });
});

// ─── linearSketchPattern ─────────────────────────────────────────────────────

describe('linearSketchPattern', () => {
  it('creates 3 copies at correct offsets', () => {
    const copies = linearSketchPattern([[0, 0]], 5, 0, 3);
    expect(copies.length).toBe(3);
    expect(ptNear(copies[0][0], [0, 0])).toBe(true);
    expect(ptNear(copies[1][0], [5, 0])).toBe(true);
    expect(ptNear(copies[2][0], [10, 0])).toBe(true);
  });
});

// ─── circularSketchPattern ────────────────────────────────────────────────────

describe('circularSketchPattern', () => {
  it('creates 4 copies at 90° intervals', () => {
    const copies = circularSketchPattern([[1, 0]], [0, 0], 4, 360);
    expect(copies.length).toBe(4);
    expect(ptNear(copies[0][0], [1, 0], 1e-5)).toBe(true);
    expect(near(copies[1][0][0], 0, 1e-5)).toBe(true);
    expect(near(copies[1][0][1], 1, 1e-5)).toBe(true);
  });
});

// ─── calculateDOF ─────────────────────────────────────────────────────────────

describe('calculateDOF', () => {
  it('fully constrained sketch returns status=fully and DOF=0', () => {
    const r = calculateDOF(3, 6, 0);
    expect(r.status).toBe('fully');
    expect(r.totalDOF).toBe(0);
  });

  it('under-constrained returns status=under', () => {
    const r = calculateDOF(4, 2, 0);
    expect(r.status).toBe('under');
    expect(r.totalDOF).toBeGreaterThan(0);
  });

  it('over-constrained clamps totalDOF to 0 and sets status=over', () => {
    const r = calculateDOF(1, 10, 0);
    expect(r.status).toBe('over');
    expect(r.totalDOF).toBe(0);
  });

  it('perEntityDOF has one entry per entity', () => {
    const r = calculateDOF(3, 4, 0);
    expect(r.perEntityDOF.size).toBe(3);
  });
});

// ─── circleFrom3Points ────────────────────────────────────────────────────────

describe('circleFrom3Points', () => {
  it('computes circle through (0,1),(1,0),(-1,0)', () => {
    const c = circleFrom3Points([0, 1], [1, 0], [-1, 0]);
    expect(c).not.toBeNull();
    expect(near(c!.radius, 1, 1e-5)).toBe(true);
    expect(ptNear(c!.center, [0, 0], 1e-5)).toBe(true);
  });

  it('returns null for collinear points', () => {
    expect(circleFrom3Points([0, 0], [1, 0], [2, 0])).toBeNull();
  });

  it('returns null for coincident points', () => {
    expect(circleFrom3Points([0, 0], [0, 0], [0, 0])).toBeNull();
  });
});

// ─── arcFrom3Points ───────────────────────────────────────────────────────────

describe('arcFrom3Points', () => {
  it('computes arc through 3 points on a unit circle', () => {
    const arc = arcFrom3Points([1, 0], [0, 1], [-1, 0]);
    expect(arc).not.toBeNull();
    expect(near(arc!.radius, 1, 1e-5)).toBe(true);
  });

  it('returns null for collinear points', () => {
    expect(arcFrom3Points([0, 0], [5, 0], [10, 0])).toBeNull();
  });
});

// ─── createCenterRectangle ────────────────────────────────────────────────────

describe('createCenterRectangle', () => {
  it('returns 4 corners with correct x/y extents', () => {
    const pts = createCenterRectangle([5, 5], 2, 3);
    expect(pts.length).toBe(4);
    const xs = pts.map(p => p[0]).sort((a, b) => a - b);
    const ys = pts.map(p => p[1]).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(3, 6);
    expect(xs[3]).toBeCloseTo(7, 6);
    expect(ys[0]).toBeCloseTo(2, 6);
    expect(ys[3]).toBeCloseTo(8, 6);
  });
});

// ─── splitLine ────────────────────────────────────────────────────────────────

describe('splitLine', () => {
  it('splits at midpoint', () => {
    const r = splitLine([0, 0], [10, 0], [5, 0]);
    expect(r).not.toBeNull();
    expect(ptNear(r!.seg1.end, [5, 0], 1e-6)).toBe(true);
    expect(ptNear(r!.seg2.start, [5, 0], 1e-6)).toBe(true);
  });

  it('returns null for point at endpoint', () => {
    expect(splitLine([0, 0], [10, 0], [0, 0])).toBeNull();
    expect(splitLine([0, 0], [10, 0], [10, 0])).toBeNull();
  });
});

// ─── breakLine ────────────────────────────────────────────────────────────────

describe('breakLine', () => {
  it('breaks at midpoint within tolerance', () => {
    const r = breakLine([0, 0], [10, 0], [5, 0]);
    expect(r).not.toBeNull();
    expect(r!.seg1.start[0]).toBeCloseTo(0, 6);
    expect(r!.seg2.end[0]).toBeCloseTo(10, 6);
  });

  it('returns null for point outside segment', () => {
    expect(breakLine([0, 0], [10, 0], [15, 0])).toBeNull();
  });
});

// ─── joinLines ────────────────────────────────────────────────────────────────

describe('joinLines', () => {
  it('joins two touching collinear segments', () => {
    const r = joinLines([0, 0], [5, 0], [5, 0], [10, 0]);
    expect(r).not.toBeNull();
    const xs = [r!.start[0], r!.end[0]].sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(0, 6);
    expect(xs[1]).toBeCloseTo(10, 6);
  });

  it('returns null for distant segments', () => {
    expect(joinLines([0, 0], [4, 0], [10, 0], [20, 0])).toBeNull();
  });
});

// ─── lengthenLine ─────────────────────────────────────────────────────────────

describe('lengthenLine', () => {
  it('extends end by positive delta', () => {
    const r = lengthenLine([0, 0], [10, 0], 5, 'end');
    expect(r.end[0]).toBeCloseTo(15, 6);
  });

  it('shortens end with negative delta', () => {
    const r = lengthenLine([0, 0], [10, 0], -3, 'end');
    expect(r.end[0]).toBeCloseTo(7, 6);
  });

  it('extends start end by positive delta', () => {
    const r = lengthenLine([0, 0], [10, 0], 4, 'start');
    expect(r.start[0]).toBeCloseTo(-4, 6);
  });
});

// ─── stretchLine ──────────────────────────────────────────────────────────────

describe('stretchLine', () => {
  it('moves endpoint inside selection window', () => {
    const r = stretchLine([0, 0], [10, 0], [8, -2], [12, 2], [5, 0]);
    expect(r.end[0]).toBeCloseTo(15, 6);
    expect(r.start[0]).toBeCloseTo(0, 6); // outside window, unchanged
  });

  it('leaves points outside window unchanged', () => {
    const r = stretchLine([0, 0], [10, 0], [20, -1], [30, 1], [5, 5]);
    expect(ptNear(r.start, [0, 0])).toBe(true);
    expect(ptNear(r.end, [10, 0])).toBe(true);
  });
});

// ─── offsetPolyline ───────────────────────────────────────────────────────────

describe('offsetPolyline', () => {
  it('offsets horizontal polyline upward', () => {
    const pts: [number, number][] = [[0, 0], [5, 0], [10, 0]];
    const r = offsetPolyline(pts, 2);
    expect(r.length).toBe(3);
    r.forEach(p => expect(near(p[1], 2, 1e-5)).toBe(true));
  });

  it('returns copy for single-point input', () => {
    const r = offsetPolyline([[3, 4]], 5);
    expect(r.length).toBe(1);
    expect(ptNear(r[0], [3, 4])).toBe(true);
  });
});

// ─── createSlotProfile ────────────────────────────────────────────────────────

describe('createSlotProfile', () => {
  it('returns 2 lines and 2 arcs for normal slot', () => {
    const r = createSlotProfile([0, 0], [10, 0], 4);
    expect(r.lines.length).toBe(2);
    expect(r.arcs.length).toBe(2);
    r.arcs.forEach(arc => expect(arc.radius).toBeCloseTo(2, 6));
  });

  it('returns 0 lines and 1 arc for degenerate (zero-length) slot', () => {
    const r = createSlotProfile([5, 5], [5, 5], 3);
    expect(r.lines.length).toBe(0);
    expect(r.arcs.length).toBe(1);
    expect(r.arcs[0].radius).toBeCloseTo(1.5, 6);
  });
});

// ─── pointOnEllipse ──────────────────────────────────────────────────────────

describe('pointOnEllipse', () => {
  it('recognises point on ellipse boundary', () => {
    expect(pointOnEllipse([3, 0], [0, 0], 3, 2)).toBe(true);
    expect(pointOnEllipse([0, 2], [0, 0], 3, 2)).toBe(true);
  });

  it('rejects point inside ellipse', () => {
    expect(pointOnEllipse([0, 0], [0, 0], 3, 2)).toBe(false);
  });

  it('returns false for degenerate ellipse', () => {
    expect(pointOnEllipse([1, 0], [0, 0], 0, 2)).toBe(false);
  });
});

// ─── projectToSketchPlane ─────────────────────────────────────────────────────

describe('projectToSketchPlane', () => {
  const pts3D: [number, number, number][] = [[1, 2, 3]];

  it('projects onto XY plane', () => {
    const r = projectToSketchPlane(pts3D, 'xy');
    expect(ptNear(r[0], [1, 2])).toBe(true);
  });

  it('projects onto XZ plane', () => {
    const r = projectToSketchPlane(pts3D, 'xz');
    expect(ptNear(r[0], [1, 3])).toBe(true);
  });

  it('projects onto YZ plane', () => {
    const r = projectToSketchPlane(pts3D, 'yz');
    expect(ptNear(r[0], [2, 3])).toBe(true);
  });
});

// ─── mirrorEntities ──────────────────────────────────────────────────────────

describe('mirrorEntities', () => {
  it('mirrors multiple points over X-axis', () => {
    const pts = mirrorEntities([[1, 3], [2, 4]], [0, 0], [10, 0]);
    expect(ptNear(pts[0], [1, -3], 1e-6)).toBe(true);
    expect(ptNear(pts[1], [2, -4], 1e-6)).toBe(true);
  });
});

// ─── mirrorArc ────────────────────────────────────────────────────────────────

describe('mirrorArc', () => {
  it('mirrors arc center over X-axis', () => {
    const r = mirrorArc([0, 5], 3, 0, Math.PI, [0, 0], [10, 0]);
    expect(ptNear(r.center, [0, -5], 1e-6)).toBe(true);
    expect(near(r.radius, 3, 1e-6)).toBe(true);
  });
});

// ─── sketchFillet ─────────────────────────────────────────────────────────────

describe('sketchFillet', () => {
  it('computes fillet for a right-angle corner', () => {
    const r = sketchFillet([0, 0], [10, 0], [10, 0], [10, 10], 2);
    expect(r).not.toBeNull();
    expect(near(r!.arc.radius, 2, 1e-4)).toBe(true);
  });

  it('returns null for zero radius', () => {
    expect(sketchFillet([0, 0], [10, 0], [10, 0], [10, 10], 0)).toBeNull();
  });
});

// ─── sketchChamfer ────────────────────────────────────────────────────────────

describe('sketchChamfer', () => {
  it('computes chamfer for a right-angle corner', () => {
    const r = sketchChamfer([0, 0], [10, 0], [10, 0], [10, 10], 3);
    expect(r).not.toBeNull();
    // Chamfer line should have length close to 3√2 for equal distances
    const chamfer = r!.chamferLine;
    const dx = chamfer.end[0] - chamfer.start[0];
    const dy = chamfer.end[1] - chamfer.start[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    expect(len).toBeCloseTo(3 * Math.SQRT2, 3);
  });

  it('returns null for zero distance', () => {
    expect(sketchChamfer([0, 0], [10, 0], [10, 0], [10, 10], 0)).toBeNull();
  });
});

// ─── createSketchText ─────────────────────────────────────────────────────────

describe('createSketchText', () => {
  it('returns non-empty segments for known characters', () => {
    const segs = createSketchText('A', [0, 0], 1.0);
    expect(segs.length).toBeGreaterThan(0);
  });

  it('returns empty for space character', () => {
    const segs = createSketchText(' ', [0, 0], 1.0);
    expect(segs.length).toBe(0);
  });

  it('generates segments for multi-char string', () => {
    const segs = createSketchText('CAD', [0, 0], 1.0);
    expect(segs.length).toBeGreaterThan(3);
  });
});
