import {
  estimateMass,
  extractBOMFromObjects,
  summarizeBOM,
  applyUnitCosts,
  buildNestedBOM,
  getSampleBOM,
  type BOMItem,
  type CadObjectLike,
  type FeatureNodeLike,
} from "../bom-generator";

describe("estimateMass", () => {
  it("calculates mass for known material using WxHxD format", () => {
    // 100×100×100 mm cube of steel (7850 kg/m³) = 0.001 m³ × 7850 = 7.85 kg
    const mass = estimateMass("Steel AISI 1045", "100×100×100 mm");
    expect(mass).toBeCloseTo(7.85, 2);
  });

  it("calculates mass for aluminium (lower density)", () => {
    // 100×100×100 mm cube of Al 6061-T6 (2700 kg/m³) = 2.7 kg
    const mass = estimateMass("Al 6061-T6", "100×100×100 mm");
    expect(mass).toBeCloseTo(2.7, 2);
  });

  it("falls back to steel density for unknown material", () => {
    const known = estimateMass("Steel AISI 1045", "100×100×100 mm");
    const unknown = estimateMass("UnknownAlloy", "100×100×100 mm");
    expect(unknown).toBeCloseTo(known, 2);
  });

  it("returns 0 for unparseable dimension string", () => {
    expect(estimateMass("Steel AISI 1045", "—")).toBe(0);
    expect(estimateMass("Steel AISI 1045", "")).toBe(0);
  });

  it("accepts x-separated dimension format", () => {
    const massX = estimateMass("Steel AISI 1045", "100x100x100");
    expect(massX).toBeCloseTo(7.85, 2);
  });

  it("scales linearly with volume", () => {
    const small = estimateMass("Copper", "10×10×10 mm");
    const large = estimateMass("Copper", "20×20×20 mm");
    expect(large / small).toBeCloseTo(8, 3); // 2³ = 8
  });
});

describe("extractBOMFromObjects", () => {
  const objs: CadObjectLike[] = [
    { id: "a1", name: "Bracket", material: "Al 6061-T6", dimensions: { width: 50, height: 20, depth: 10 } },
    { id: "a2", name: "Bracket", material: "Al 6061-T6", dimensions: { width: 50, height: 20, depth: 10 } },
    { id: "b1", name: "Bolt", material: "Grade 8.8" },
  ];

  it("groups identical parts by name+material and sums quantity", () => {
    const bom = extractBOMFromObjects(objs);
    const bracket = bom.find(b => b.partName === "Bracket");
    expect(bracket).toBeDefined();
    expect(bracket?.quantity).toBe(2);
  });

  it("assigns part numbers in SS-NNN format", () => {
    const bom = extractBOMFromObjects(objs);
    bom.forEach(b => expect(b.partNumber).toMatch(/^SS-\d{3}$/));
  });

  it("skips suppressed objects", () => {
    const withSuppressed: CadObjectLike[] = [
      ...objs,
      { id: "s1", name: "Ghost", suppressed: true },
    ];
    const bom = extractBOMFromObjects(withSuppressed);
    expect(bom.find(b => b.partName === "Ghost")).toBeUndefined();
  });

  it("uses fallback material when none specified", () => {
    const bom = extractBOMFromObjects([{ id: "x", name: "Part" }]);
    expect(bom[0].material).toBe("Steel AISI 1045");
  });

  it("returns empty array for empty input", () => {
    expect(extractBOMFromObjects([])).toHaveLength(0);
  });

  it("uses em-dash for missing dimensions", () => {
    const bom = extractBOMFromObjects([{ id: "x", name: "PartNoDims" }]);
    expect(bom[0].dimensions).toBe("—");
  });
});

describe("summarizeBOM", () => {
  const bom: BOMItem[] = [
    {
      id: "1", partName: "Frame", partNumber: "SS-001", quantity: 1,
      material: "Al 6061-T6", mass: 5.0, dimensions: "—", unitCost: 100, level: 0,
    },
    {
      id: "2", partName: "Gear", partNumber: "SS-002", quantity: 4,
      material: "Steel AISI 1045", mass: 0.5, dimensions: "—", unitCost: 25, level: 1,
    },
    {
      id: "3", partName: "Seal", partNumber: "SS-003", quantity: 2,
      material: "Polycarbonate", mass: 0.05, dimensions: "—", unitCost: 5, level: 1,
      suppressed: true,
    },
  ];

  it("counts total parts excluding suppressed", () => {
    const s = summarizeBOM(bom);
    expect(s.totalParts).toBe(5); // 1 + 4 (Seal is suppressed)
  });

  it("sums mass correctly excluding suppressed", () => {
    const s = summarizeBOM(bom);
    // Frame: 1×5.0 = 5, Gear: 4×0.5 = 2 → total 7
    expect(s.totalMass).toBeCloseTo(7.0, 3);
  });

  it("sums cost correctly excluding suppressed", () => {
    const s = summarizeBOM(bom);
    // Frame: 1×100=100, Gear: 4×25=100 → total 200
    expect(s.totalCost).toBeCloseTo(200, 2);
  });

  it("reports unique materials", () => {
    const s = summarizeBOM(bom);
    expect(s.uniqueMaterials).toContain("Al 6061-T6");
    expect(s.uniqueMaterials).toContain("Steel AISI 1045");
    expect(s.uniqueMaterials).not.toContain("Polycarbonate"); // suppressed
  });

  it("identifies heaviest part", () => {
    const s = summarizeBOM(bom);
    expect(s.heaviestPart).toBe("Frame");
  });

  it("identifies most expensive part", () => {
    const s = summarizeBOM(bom);
    expect(s.mostExpensive).toBe("Frame");
  });

  it("handles empty BOM", () => {
    const s = summarizeBOM([]);
    expect(s.totalParts).toBe(0);
    expect(s.totalMass).toBe(0);
    expect(s.totalCost).toBe(0);
  });
});

describe("applyUnitCosts", () => {
  const bom: BOMItem[] = [
    { id: "1", partName: "Bracket", partNumber: "SS-001", quantity: 2, material: "Al 6061-T6", mass: 1, dimensions: "—", unitCost: 0, level: 0 },
    { id: "2", partName: "Bolt", partNumber: "SS-002", quantity: 10, material: "Grade 8.8", mass: 0.05, dimensions: "—", unitCost: 0, level: 0 },
  ];

  it("applies prices by part name", () => {
    const updated = applyUnitCosts(bom, { Bracket: 50, Bolt: 2 });
    expect(updated[0].unitCost).toBe(50);
    expect(updated[1].unitCost).toBe(2);
  });

  it("applies prices by part number as fallback", () => {
    const updated = applyUnitCosts(bom, { "SS-001": 75 });
    expect(updated[0].unitCost).toBe(75);
  });

  it("leaves cost at 0 for parts not in price list", () => {
    const updated = applyUnitCosts(bom, {});
    updated.forEach(b => expect(b.unitCost).toBe(0));
  });

  it("does not mutate original BOM items", () => {
    applyUnitCosts(bom, { Bracket: 999 });
    expect(bom[0].unitCost).toBe(0);
  });
});

describe("buildNestedBOM", () => {
  const nodes: FeatureNodeLike[] = [
    { id: "root", name: "Assembly", children: ["child1", "child2"] },
    { id: "child1", name: "Sub-part A", parentId: "root", children: [] },
    { id: "child2", name: "Sub-part B", parentId: "root", children: [] },
  ];
  const objects: CadObjectLike[] = [
    { id: "root", name: "Assembly" },
    { id: "child1", name: "Sub-part A", material: "Al 6061-T6" },
    { id: "child2", name: "Sub-part B", material: "Steel AISI 1045" },
  ];

  it("returns top-level items at level 0 by default", () => {
    const bom = buildNestedBOM(nodes, objects);
    const root = bom.find(b => b.partName === "Assembly");
    expect(root).toBeDefined();
    expect(root?.level).toBe(0);
  });

  it("returns children at level 1", () => {
    const bom = buildNestedBOM(nodes, objects);
    const childA = bom.find(b => b.partName === "Sub-part A");
    expect(childA?.level).toBe(1);
  });

  it("returns all 3 items in nested BOM", () => {
    const bom = buildNestedBOM(nodes, objects);
    expect(bom).toHaveLength(3);
  });
});

describe("getSampleBOM", () => {
  it("returns a non-empty array of BOM items", () => {
    const bom = getSampleBOM();
    expect(bom.length).toBeGreaterThan(0);
  });

  it("each item has required fields", () => {
    const bom = getSampleBOM();
    bom.forEach(item => {
      expect(item.id).toBeDefined();
      expect(item.partName).toBeDefined();
      expect(item.partNumber).toBeDefined();
      expect(typeof item.quantity).toBe("number");
      expect(typeof item.mass).toBe("number");
    });
  });
});
