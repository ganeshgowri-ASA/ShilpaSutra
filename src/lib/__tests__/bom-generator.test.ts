import {
  estimateMass,
  extractBOMFromObjects,
  summarizeBOM,
  applyUnitCosts,
  getSampleBOM,
  type CadObjectLike,
  type BOMItem,
} from "../bom-generator";

describe("estimateMass", () => {
  it("returns correct mass for known material and dimensions", () => {
    // 100×100×10 mm of Steel AISI 1045 (7850 kg/m³)
    // volume = 0.1 * 0.1 * 0.01 = 1e-4 m³ → 7850 * 1e-4 = 0.785 kg
    const mass = estimateMass("Steel AISI 1045", "100x100x10");
    expect(mass).toBeCloseTo(0.785, 3);
  });

  it("uses default steel density for unknown material", () => {
    const known = estimateMass("Steel AISI 1045", "50x50x50");
    const unknown = estimateMass("UnknownMaterial", "50x50x50");
    expect(unknown).toBeCloseTo(known, 3);
  });

  it("returns 0 for unparseable dimensions", () => {
    expect(estimateMass("Steel AISI 1045", "invalid")).toBe(0);
    expect(estimateMass("Steel AISI 1045", "")).toBe(0);
  });

  it("handles × separator", () => {
    const a = estimateMass("Al 6061-T6", "100×200×10");
    const b = estimateMass("Al 6061-T6", "100x200x10");
    expect(a).toBeCloseTo(b, 3);
  });

  it("uses aluminium density for Al 6061-T6", () => {
    // 100×100×10 mm, ρ = 2700 kg/m³ → 2700 * 1e-4 = 0.27 kg
    const mass = estimateMass("Al 6061-T6", "100x100x10");
    expect(mass).toBeCloseTo(0.27, 3);
  });
});

describe("extractBOMFromObjects", () => {
  const objects: CadObjectLike[] = [
    { id: "a", name: "Plate", material: "Steel AISI 304" },
    { id: "b", name: "Plate", material: "Steel AISI 304" },
    { id: "c", name: "Shaft", material: "Al 6061-T6" },
    { id: "d", name: "Bolt", material: undefined, suppressed: true },
  ];

  it("groups identical name+material pairs", () => {
    const bom = extractBOMFromObjects(objects);
    const plate = bom.find(b => b.partName === "Plate");
    expect(plate?.quantity).toBe(2);
  });

  it("excludes suppressed objects", () => {
    const bom = extractBOMFromObjects(objects);
    const bolt = bom.find(b => b.partName === "Bolt");
    expect(bolt).toBeUndefined();
  });

  it("assigns sequential part numbers", () => {
    const bom = extractBOMFromObjects(objects);
    expect(bom[0].partNumber).toMatch(/^SS-\d{3}$/);
    expect(bom[1].partNumber).toMatch(/^SS-\d{3}$/);
  });

  it("assigns default material when not specified", () => {
    const bom = extractBOMFromObjects([{ id: "x", name: "Part" }]);
    expect(bom[0].material).toBe("Steel AISI 1045");
  });

  it("returns empty array for empty input", () => {
    expect(extractBOMFromObjects([])).toEqual([]);
  });

  it("computes mass from dimensions when provided", () => {
    const bom = extractBOMFromObjects([
      {
        id: "x",
        name: "Block",
        material: "Steel AISI 1045",
        dimensions: { width: 100, height: 100, depth: 10 },
      },
    ]);
    expect(bom[0].mass).toBeCloseTo(0.785, 3);
  });
});

describe("summarizeBOM", () => {
  const bom: BOMItem[] = [
    { id: "1", partName: "A", partNumber: "SS-001", quantity: 2, material: "Steel AISI 1045", mass: 1.0, dimensions: "—", unitCost: 10, level: 0 },
    { id: "2", partName: "B", partNumber: "SS-002", quantity: 1, material: "Al 6061-T6", mass: 3.0, dimensions: "—", unitCost: 20, level: 0 },
    { id: "3", partName: "C", partNumber: "SS-003", quantity: 1, material: "Steel AISI 1045", mass: 0.5, dimensions: "—", unitCost: 5, level: 0, suppressed: true },
  ];

  it("excludes suppressed items from totals", () => {
    const summary = summarizeBOM(bom);
    expect(summary.totalParts).toBe(3); // 2+1 (not suppressed)
  });

  it("sums total mass correctly", () => {
    const summary = summarizeBOM(bom);
    // A: 2*1.0=2.0, B: 1*3.0=3.0, C suppressed
    expect(summary.totalMass).toBeCloseTo(5.0, 3);
  });

  it("sums total cost correctly", () => {
    const summary = summarizeBOM(bom);
    // A: 2*10=20, B: 1*20=20
    expect(summary.totalCost).toBeCloseTo(40, 2);
  });

  it("identifies unique materials excluding suppressed", () => {
    const summary = summarizeBOM(bom);
    expect(summary.uniqueMaterials).toContain("Steel AISI 1045");
    expect(summary.uniqueMaterials).toContain("Al 6061-T6");
  });

  it("identifies heaviest part", () => {
    const summary = summarizeBOM(bom);
    expect(summary.heaviestPart).toBe("B");
  });

  it("identifies most expensive part", () => {
    const summary = summarizeBOM(bom);
    expect(summary.mostExpensive).toBe("B");
  });

  it("handles empty bom gracefully", () => {
    const summary = summarizeBOM([]);
    expect(summary.totalParts).toBe(0);
    expect(summary.totalMass).toBe(0);
    expect(summary.totalCost).toBe(0);
    expect(summary.uniqueMaterials).toEqual([]);
  });
});

describe("applyUnitCosts", () => {
  const bom: BOMItem[] = [
    { id: "1", partName: "Plate", partNumber: "SS-001", quantity: 1, material: "Steel", mass: 1, dimensions: "—", unitCost: 0, level: 0 },
    { id: "2", partName: "Bolt",  partNumber: "SS-002", quantity: 4, material: "Steel", mass: 0.1, dimensions: "—", unitCost: 0, level: 0 },
  ];

  it("applies price by part name", () => {
    const updated = applyUnitCosts(bom, { Plate: 50 });
    expect(updated[0].unitCost).toBe(50);
  });

  it("applies price by part number", () => {
    const updated = applyUnitCosts(bom, { "SS-002": 2.5 });
    expect(updated[1].unitCost).toBe(2.5);
  });

  it("prefers part name over part number when both match", () => {
    const updated = applyUnitCosts(bom, { Plate: 99, "SS-001": 1 });
    expect(updated[0].unitCost).toBe(99);
  });

  it("leaves unmatched items at their original cost", () => {
    const updated = applyUnitCosts(bom, {});
    expect(updated[0].unitCost).toBe(0);
    expect(updated[1].unitCost).toBe(0);
  });

  it("does not mutate the original bom array", () => {
    applyUnitCosts(bom, { Plate: 100 });
    expect(bom[0].unitCost).toBe(0);
  });
});

describe("getSampleBOM", () => {
  it("returns a non-empty array", () => {
    const bom = getSampleBOM();
    expect(bom.length).toBeGreaterThan(0);
  });

  it("each item has required fields", () => {
    const bom = getSampleBOM();
    for (const item of bom) {
      expect(item.id).toBeTruthy();
      expect(item.partName).toBeTruthy();
      expect(item.partNumber).toBeTruthy();
      expect(typeof item.quantity).toBe("number");
      expect(typeof item.mass).toBe("number");
    }
  });
});
