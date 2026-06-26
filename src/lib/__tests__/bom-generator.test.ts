import {
  estimateMass,
  extractBOMFromObjects,
  buildNestedBOM,
  summarizeBOM,
  applyUnitCosts,
  getSampleBOM,
  type CadObjectLike,
  type FeatureNodeLike,
  type BOMItem,
} from "../bom-generator";

describe("estimateMass", () => {
  it("calculates mass for a known material (Al 6061-T6)", () => {
    // 100×100×10 mm = 0.1 * 0.1 * 0.01 m³ = 0.0001 m³
    // density 2700 kg/m³ → 0.27 kg
    const mass = estimateMass("Al 6061-T6", "100x100x10");
    expect(mass).toBeCloseTo(0.27, 3);
  });

  it("defaults to steel density (7850) for unknown material", () => {
    const mass = estimateMass("unobtainium", "100x100x10");
    // 7850 * 0.0001 = 0.785 kg
    expect(mass).toBeCloseTo(0.785, 3);
  });

  it("returns 0 for malformed dimension string", () => {
    expect(estimateMass("Al 6061-T6", "no dimensions here")).toBe(0);
  });

  it("supports × (unicode times) separator", () => {
    const mass = estimateMass("Al 6061-T6", "100×100×10");
    expect(mass).toBeCloseTo(0.27, 3);
  });

  it("scales linearly with each dimension", () => {
    const m1 = estimateMass("Al 6061-T6", "100x100x10");
    const m2 = estimateMass("Al 6061-T6", "200x100x10");
    expect(m2).toBeCloseTo(m1 * 2, 3);
  });

  it("returns a non-negative value", () => {
    expect(estimateMass("Steel AISI 1045", "50x30x5")).toBeGreaterThanOrEqual(0);
  });
});

describe("extractBOMFromObjects", () => {
  const objs: CadObjectLike[] = [
    { id: "a1", name: "Bracket", material: "Al 6061-T6", dimensions: { width: 100, height: 50, depth: 10 } },
    { id: "a2", name: "Bracket", material: "Al 6061-T6", dimensions: { width: 100, height: 50, depth: 10 } },
    { id: "a3", name: "Base Plate", material: "Steel AISI 1045", dimensions: { width: 200, height: 150, depth: 8 } },
  ];

  it("groups identical name+material as one BOM item with quantity 2", () => {
    const bom = extractBOMFromObjects(objs);
    const bracket = bom.find((b) => b.partName === "Bracket");
    expect(bracket).toBeDefined();
    expect(bracket!.quantity).toBe(2);
  });

  it("returns separate item for different part", () => {
    const bom = extractBOMFromObjects(objs);
    expect(bom.length).toBe(2);
  });

  it("assigns sequential part numbers", () => {
    const bom = extractBOMFromObjects(objs);
    bom.forEach((b, i) => {
      expect(b.partNumber).toBe(`SS-${String(i + 1).padStart(3, "0")}`);
    });
  });

  it("skips suppressed objects", () => {
    const withSuppressed: CadObjectLike[] = [
      ...objs,
      { id: "sup1", name: "Ghost Part", material: "Steel AISI 1045", suppressed: true },
    ];
    const bom = extractBOMFromObjects(withSuppressed);
    expect(bom.find((b) => b.partName === "Ghost Part")).toBeUndefined();
  });

  it("defaults missing material to Steel AISI 1045", () => {
    const noMat: CadObjectLike[] = [{ id: "x1", name: "Widget" }];
    const bom = extractBOMFromObjects(noMat);
    expect(bom[0].material).toBe("Steel AISI 1045");
  });

  it("handles empty input", () => {
    expect(extractBOMFromObjects([])).toEqual([]);
  });

  it("uses fallback mass 0.1 when dimensions are missing", () => {
    const bom = extractBOMFromObjects([{ id: "nd", name: "No Dim", material: "Al 6061-T6" }]);
    expect(bom[0].mass).toBeCloseTo(0.1);
  });
});

describe("buildNestedBOM", () => {
  const nodes: FeatureNodeLike[] = [
    { id: "n1", name: "Assembly", type: "assembly", children: ["n2", "n3"] },
    { id: "n2", name: "Part A", type: "part", children: [], parentId: "n1" },
    { id: "n3", name: "Part B", type: "part", children: [], parentId: "n1" },
  ];
  const objects: CadObjectLike[] = [
    { id: "n1", name: "Assembly", material: "Al 6061-T6", dimensions: { width: 300, height: 200, depth: 10 } },
    { id: "n2", name: "Part A", material: "Steel AISI 1045" },
    { id: "n3", name: "Part B", material: "Steel AISI 1045" },
  ];

  it("returns top-level node when no parentId specified", () => {
    const bom = buildNestedBOM(nodes, objects);
    const top = bom.filter((b) => b.level === 0);
    expect(top.length).toBe(1);
    expect(top[0].partName).toBe("Assembly");
  });

  it("returns child nodes at level 1", () => {
    const bom = buildNestedBOM(nodes, objects);
    const children = bom.filter((b) => b.level === 1);
    expect(children.length).toBe(2);
  });

  it("total items = parent + children", () => {
    const bom = buildNestedBOM(nodes, objects);
    expect(bom.length).toBe(3);
  });

  it("assigns parentId correctly on child items", () => {
    const bom = buildNestedBOM(nodes, objects);
    const children = bom.filter((b) => b.level === 1);
    children.forEach((c) => expect(c.parentId).toBe("n1"));
  });

  it("handles empty node list", () => {
    expect(buildNestedBOM([], [])).toEqual([]);
  });
});

describe("summarizeBOM", () => {
  const sampleBOM = getSampleBOM();

  it("totalParts matches sum of all quantities", () => {
    const summary = summarizeBOM(sampleBOM);
    const expected = sampleBOM.reduce((s, b) => s + b.quantity, 0);
    expect(summary.totalParts).toBe(expected);
  });

  it("totalMass is sum of quantity * mass (rounded 3 dp)", () => {
    const summary = summarizeBOM(sampleBOM);
    const expected = parseFloat(
      sampleBOM.reduce((s, b) => s + b.quantity * b.mass, 0).toFixed(3)
    );
    expect(summary.totalMass).toBeCloseTo(expected, 2);
  });

  it("totalCost is sum of quantity * unitCost", () => {
    const summary = summarizeBOM(sampleBOM);
    const expected = parseFloat(
      sampleBOM.reduce((s, b) => s + b.quantity * b.unitCost, 0).toFixed(2)
    );
    expect(summary.totalCost).toBeCloseTo(expected, 1);
  });

  it("uniqueMaterials has no duplicates", () => {
    const summary = summarizeBOM(sampleBOM);
    expect(new Set(summary.uniqueMaterials).size).toBe(summary.uniqueMaterials.length);
  });

  it("heaviestPart names the part with highest mass", () => {
    const summary = summarizeBOM(sampleBOM);
    const heaviest = sampleBOM.reduce((a, b) => (b.mass > a.mass ? b : a));
    expect(summary.heaviestPart).toBe(heaviest.partName);
  });

  it("mostExpensive names the part with highest unitCost", () => {
    const summary = summarizeBOM(sampleBOM);
    const priciest = sampleBOM.reduce((a, b) => (b.unitCost > a.unitCost ? b : a));
    expect(summary.mostExpensive).toBe(priciest.partName);
  });

  it("suppressed items are excluded from totals", () => {
    const withSuppressed: BOMItem[] = [
      ...sampleBOM,
      { id: "s1", partName: "Ghost", partNumber: "SS-999", quantity: 99, material: "Steel AISI 1045", mass: 999, dimensions: "—", unitCost: 9999, level: 0, suppressed: true },
    ];
    const summary = summarizeBOM(withSuppressed);
    const baseSummary = summarizeBOM(sampleBOM);
    expect(summary.totalParts).toBe(baseSummary.totalParts);
    expect(summary.totalCost).toBeCloseTo(baseSummary.totalCost, 1);
  });

  it("handles empty BOM gracefully", () => {
    const summary = summarizeBOM([]);
    expect(summary.totalParts).toBe(0);
    expect(summary.totalMass).toBe(0);
    expect(summary.totalCost).toBe(0);
    expect(summary.uniqueMaterials).toEqual([]);
  });
});

describe("applyUnitCosts", () => {
  const bom = getSampleBOM();

  it("updates cost by part name", () => {
    const prices: Record<string, number> = { "Base Plate": 100 };
    const updated = applyUnitCosts(bom, prices);
    const basePlate = updated.find((b) => b.partName === "Base Plate");
    expect(basePlate!.unitCost).toBe(100);
  });

  it("updates cost by part number when name not found", () => {
    const prices: Record<string, number> = { "SS-004": 50 };
    const updated = applyUnitCosts(bom, prices);
    const shaft = updated.find((b) => b.partNumber === "SS-004");
    expect(shaft!.unitCost).toBe(50);
  });

  it("keeps existing cost when neither name nor number matches", () => {
    const prices: Record<string, number> = {};
    const updated = applyUnitCosts(bom, prices);
    updated.forEach((b, i) => {
      expect(b.unitCost).toBe(bom[i].unitCost);
    });
  });

  it("does not mutate original BOM", () => {
    const original = bom.map((b) => ({ ...b }));
    applyUnitCosts(bom, { "Base Plate": 999 });
    bom.forEach((b, i) => expect(b.unitCost).toBe(original[i].unitCost));
  });

  it("name match takes priority over part number match", () => {
    const prices: Record<string, number> = { "Base Plate": 100, "SS-001": 200 };
    const updated = applyUnitCosts(bom, prices);
    const basePlate = updated.find((b) => b.partName === "Base Plate");
    expect(basePlate!.unitCost).toBe(100);
  });
});

describe("getSampleBOM", () => {
  it("returns a non-empty array", () => {
    expect(getSampleBOM().length).toBeGreaterThan(0);
  });

  it("each item has required fields", () => {
    for (const item of getSampleBOM()) {
      expect(item.id).toBeDefined();
      expect(item.partName.length).toBeGreaterThan(0);
      expect(item.partNumber).toMatch(/^SS-\d{3}$/);
      expect(item.quantity).toBeGreaterThan(0);
      expect(item.mass).toBeGreaterThanOrEqual(0);
    }
  });

  it("contains at least one fastener with quantity > 1", () => {
    const bom = getSampleBOM();
    const fastener = bom.find((b) => b.quantity > 1);
    expect(fastener).toBeDefined();
  });
});
