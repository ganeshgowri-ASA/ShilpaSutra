import {
  evaluateMateResidual,
  createCoincidentMate,
  createConcentricMate,
  createDistanceMate,
  checkInterference,
  type AssemblyMate,
  type AssemblyPart,
  type MateFace,
} from "../mate-solver";

// ── helpers ─────────────────────────────────────────────────────────────────

function makeParts(...defs: { id: string; pos?: [number, number, number] }[]): Map<string, AssemblyPart> {
  const m = new Map<string, AssemblyPart>();
  for (const d of defs) {
    m.set(d.id, {
      id: d.id,
      name: d.id,
      position: d.pos ?? [0, 0, 0],
      rotation: [0, 0, 0],
      fixed: false,
    });
  }
  return m;
}

function face(partId: string, pos: [number, number, number], normal: [number, number, number]): MateFace {
  return { partId, position: pos, normal };
}

// ── checkInterference ────────────────────────────────────────────────────────

describe("checkInterference", () => {
  it("returns interferes=false when boxes do not overlap", () => {
    const result = checkInterference(
      { position: [0, 0, 0], size: [2, 2, 2] },
      { position: [10, 0, 0], size: [2, 2, 2] }
    );
    expect(result.interferes).toBe(false);
    expect(result.overlapVolume).toBe(0);
  });

  it("returns interferes=true when boxes overlap", () => {
    const result = checkInterference(
      { position: [0, 0, 0], size: [4, 4, 4] },
      { position: [2, 0, 0], size: [4, 4, 4] }
    );
    expect(result.interferes).toBe(true);
    expect(result.overlapVolume).toBeGreaterThan(0);
  });

  it("returns exact volume for fully-contained box", () => {
    // 2×2×2 box centered at 0; 1×1×1 box centered at 0 → inner fully inside outer
    const result = checkInterference(
      { position: [0, 0, 0], size: [2, 2, 2] },
      { position: [0, 0, 0], size: [1, 1, 1] }
    );
    expect(result.interferes).toBe(true);
    expect(result.overlapVolume).toBeCloseTo(1, 6); // 1×1×1 = 1
  });

  it("computes symmetric result", () => {
    const a = { position: [0, 0, 0] as [number, number, number], size: [3, 3, 3] as [number, number, number] };
    const b = { position: [2, 0, 0] as [number, number, number], size: [3, 3, 3] as [number, number, number] };
    const r1 = checkInterference(a, b);
    const r2 = checkInterference(b, a);
    expect(r1.overlapVolume).toBeCloseTo(r2.overlapVolume, 10);
  });

  it("treats touching boxes (edge-to-edge) as non-interfering", () => {
    const result = checkInterference(
      { position: [0, 0, 0], size: [2, 2, 2] },
      { position: [2, 0, 0], size: [2, 2, 2] }
    );
    expect(result.overlapVolume).toBe(0);
    expect(result.interferes).toBe(false);
  });
});

// ── evaluateMateResidual ─────────────────────────────────────────────────────

describe("evaluateMateResidual", () => {
  it("returns 0 for suppressed mates", () => {
    const mate: AssemblyMate = {
      id: "m1",
      type: "coincident",
      face1: face("p1", [0, 0, 0], [0, 0, 1]),
      face2: face("p2", [0, 0, 0], [0, 0, -1]),
      suppressed: true,
      satisfied: false,
    };
    const parts = makeParts({ id: "p1" }, { id: "p2" });
    expect(evaluateMateResidual(mate, parts)).toBe(0);
  });

  it("coincident mate is ~0 when faces touch with opposing normals", () => {
    const mate: AssemblyMate = {
      id: "m1",
      type: "coincident",
      face1: face("p1", [0, 0, 0], [0, 0, 1]),
      face2: face("p2", [0, 0, 0], [0, 0, -1]),
      suppressed: false,
      satisfied: false,
    };
    const parts = makeParts({ id: "p1" }, { id: "p2" });
    expect(evaluateMateResidual(mate, parts)).toBeCloseTo(0, 6);
  });

  it("coincident mate has positive residual when faces are offset", () => {
    const mate: AssemblyMate = {
      id: "m1",
      type: "coincident",
      face1: face("p1", [0, 0, 0], [0, 0, 1]),
      face2: face("p2", [0, 0, 5], [0, 0, -1]),
      suppressed: false,
      satisfied: false,
    };
    const parts = makeParts({ id: "p1" }, { id: "p2" });
    expect(evaluateMateResidual(mate, parts)).toBeGreaterThan(0);
  });

  it("parallel mate is ~0 when normals are already parallel", () => {
    const mate: AssemblyMate = {
      id: "m1",
      type: "parallel",
      face1: face("p1", [0, 0, 0], [0, 0, 1]),
      face2: face("p2", [0, 0, 10], [0, 0, 1]),
      suppressed: false,
      satisfied: false,
    };
    const parts = makeParts({ id: "p1" }, { id: "p2" });
    expect(evaluateMateResidual(mate, parts)).toBeCloseTo(0, 6);
  });

  it("perpendicular mate is ~0 when normals are at 90°", () => {
    const mate: AssemblyMate = {
      id: "m1",
      type: "perpendicular",
      face1: face("p1", [0, 0, 0], [1, 0, 0]),
      face2: face("p2", [0, 0, 0], [0, 1, 0]),
      suppressed: false,
      satisfied: false,
    };
    const parts = makeParts({ id: "p1" }, { id: "p2" });
    expect(evaluateMateResidual(mate, parts)).toBeCloseTo(0, 6);
  });

  it("distance mate residual is 0 when gap equals value", () => {
    const mate: AssemblyMate = {
      id: "m1",
      type: "distance",
      face1: face("p1", [0, 0, 0], [0, 0, 1]),
      face2: face("p2", [0, 0, 5], [0, 0, -1]),
      value: 5,
      suppressed: false,
      satisfied: false,
    };
    const parts = makeParts({ id: "p1" }, { id: "p2" });
    expect(evaluateMateResidual(mate, parts)).toBeCloseTo(0, 6);
  });
});

// ── factory helpers ──────────────────────────────────────────────────────────

describe("createCoincidentMate", () => {
  it("creates a mate with type coincident", () => {
    const f1 = face("p1", [0, 0, 0], [0, 0, 1]);
    const f2 = face("p2", [0, 0, 0], [0, 0, -1]);
    const mate = createCoincidentMate(f1, f2);
    expect(mate.type).toBe("coincident");
    expect(mate.suppressed).toBe(false);
    expect(mate.satisfied).toBe(false);
    expect(mate.face1).toEqual(f1);
    expect(mate.face2).toEqual(f2);
  });
});

describe("createConcentricMate", () => {
  it("creates a mate with type concentric", () => {
    const f1 = face("p1", [0, 0, 0], [0, 1, 0]);
    const f2 = face("p2", [1, 0, 0], [0, 1, 0]);
    const mate = createConcentricMate(f1, f2);
    expect(mate.type).toBe("concentric");
    expect(mate.suppressed).toBe(false);
  });
});

describe("createDistanceMate", () => {
  it("creates a mate with type distance and correct value", () => {
    const f1 = face("p1", [0, 0, 0], [0, 0, 1]);
    const f2 = face("p2", [0, 0, 10], [0, 0, -1]);
    const mate = createDistanceMate(f1, f2, 10);
    expect(mate.type).toBe("distance");
    expect(mate.value).toBe(10);
  });

  it("stores value=0 for a flush distance", () => {
    const f1 = face("p1", [0, 0, 0], [0, 0, 1]);
    const f2 = face("p2", [0, 0, 0], [0, 0, -1]);
    const mate = createDistanceMate(f1, f2, 0);
    expect(mate.value).toBe(0);
  });
});
