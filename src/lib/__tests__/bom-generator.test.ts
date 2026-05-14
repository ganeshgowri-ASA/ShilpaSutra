import {
  estimateMass,
  extractBOMFromObjects,
  buildNestedBOM,
  summarizeBOM,
  applyUnitCosts,
  getSampleBOM,
  type BOMItem,
  type CadObjectLike,
  type FeatureNodeLike,
} from "../bom-generator";

// ─── estimateMass ───────────────────────────────────────────────────────────

describe("estimateMass", () => {
  it("returns 0 for invalid dimension string", () => {
    expect(estimateMass("Steel AISI 1045", "no-dimensions")).toBe(0);
    expect(estimateMass("Steel AISI 1045", "")).toBe(0);
  });

  it("uses × separator (unicode)", () => {
    // 100mm × 100mm × 10mm of Steel AISI 1045 (7850 kg/m³)
    // volume = 0.1 * 0.1 * 0.01 = 0.0001 m³ → 0.785 kg
    const mass = estimateMass("Steel AISI 1045", "100×100×10");
    expect(mass).toBeCloseTo(0.785, 3);
  });

  it("uses x separator (ASCII)", () => {
    const mass = estimateMass("Steel AISI 1045", "100x100x10");
    expect(mass).toBeCloseTo(0.785, 3);
  });

  it("falls back to default steel density (7850) for unknown material", () => {
    const mass = estimateMass("UnknownMaterial", "100×100×10");
    expect(mass).toBeCloseTo(0.785, 3);
  });

  it("uses aluminium density for Al 6061-T6", () => {
    // Al 6061-T6: 2700 kg/m³, same volume
    const mass = estimateMass("Al 6061-T6", "100×100×10");
    expect(mass).toBeCloseTo(0.27, 3);
  });

  it("uses copper density (8900)", () => {
    const mass = estimateMass("Copper", "100×100×10");
    expect(mass).toBeCloseTo(0.89, 3);
  });

  it("returns a non-negative number for all known materials", () => {
    const materials = [
      "Steel AISI 1045", "Steel AISI 304", "Al 6061-T6", "Al 7075-T6",
      "Titanium Ti-6Al-4V", "Copper", "Brass", "Polycarbonate",
      "ABS Plastic", "Nylon PA66", "Grade 8.8", "Chrome Steel", "Spring Steel",
    ];
    for (const mat of materials) {
      expect(estimateMass(mat, "50×50×50")).toBeGreaterThan(0);
    }
  });
});

// ─── extractBOMFromObjects ──────────────────────────────────────────────────

describe("extractBOMFromObjects", () => {
  const baseObj: CadObjectLike = {
    id: "obj1",
    name: "Bracket",
    material: "Steel AISI 304",
    dimensions: { width: 100, height: 50, depth: 10 },
  };

  it("returns empty array for empty input", () => {
    expect(extractBOMFromObjects([])).toEqual([]);
  });

  it("maps a single object to a BOM item", () => {
    const bom = extractBOMFromObjects([baseObj]);
    expect(bom).toHaveLength(1);
    expect(bom[0].partName).toBe("Bracket");
    expect(bom[0].quantity).toBe(1);
    expect(bom[0].material).toBe("Steel AISI 304");
    expect(bom[0].partNumber).toMatch(/^SS-\d{3}$/);
  });

  it("groups identical objects by name+material into quantity > 1", () => {
    const objects: CadObjectLike[] = [
      { ...baseObj, id: "a" },
      { ...baseObj, id: "b" },
      { ...baseObj, id: "c" },
    ];
    const bom = extractBOMFromObjects(objects);
    expect(bom).toHaveLength(1);
    expect(bom[0].quantity).toBe(3);
  });

  it("treats same name with different material as separate BOM items", () => {
    const objs: CadObjectLike[] = [
      { id: "1", name: "Plate", material: "Steel AISI 304" },
      { id: "2", name: "Plate", material: "Al 6061-T6" },
    ];
    const bom = extractBOMFromObjects(objs);
    expect(bom).toHaveLength(2);
  });

  it("skips suppressed objects", () => {
    const objs: CadObjectLike[] = [
      { ...baseObj, id: "a", suppressed: false },
      { ...baseObj, id: "b", suppressed: true },
    ];
    const bom = extractBOMFromObjects(objs);
    expect(bom).toHaveLength(1);
    expect(bom[0].quantity).toBe(1);
  });

  it("defaults material to Steel AISI 1045 when not provided", () => {
    const obj: CadObjectLike = { id: "x", name: "Widget" };
    const bom = extractBOMFromObjects([obj]);
    expect(bom[0].material).toBe("Steel AISI 1045");
  });

  it("sets mass=0.1 when dimensions not provided", () => {
    const obj: CadObjectLike = { id: "x", name: "Widget" };
    const bom = extractBOMFromObjects([obj]);
    expect(bom[0].mass).toBe(0.1);
  });

  it("computes mass from dimensions when provided", () => {
    const bom = extractBOMFromObjects([baseObj]);
    expect(bom[0].mass).toBeGreaterThan(0);
  });

  it("sets dimensions string as 'W×H×D mm'", () => {
    const bom = extractBOMFromObjects([baseObj]);
    expect(bom[0].dimensions).toBe("100×50×10 mm");
  });

  it("sets dimensions to '—' when not provided", () => {
    const bom = extractBOMFromObjects([{ id: "x", name: "Widget" }]);
    expect(bom[0].dimensions).toBe("—");
  });
});

// ─── buildNestedBOM ─────────────────────────────────────────────────────────

describe("buildNestedBOM", () => {
  const objects: CadObjectLike[] = [
    { id: "a", name: "Shaft", material: "Steel AISI 1045", dimensions: { width: 30, height: 30, depth: 200 } },
    { id: "b", name: "Bearing", material: "Chrome Steel", dimensions: { width: 52, height: 52, depth: 15 } },
  ];
  const nodes: FeatureNodeLike[] = [
    { id: "a", name: "Shaft", type: "extrude", children: ["b"] },
    { id: "b", name: "Bearing", type: "primitive", children: [], parentId: "a" },
  ];

  it("returns empty array for no nodes", () => {
    expect(buildNestedBOM([], [])).toEqual([]);
  });

  it("builds top-level items with no parentId", () => {
    const bom = buildNestedBOM(nodes, objects);
    const topLevel = bom.filter(b => !b.parentId);
    expect(topLevel).toHaveLength(1);
    expect(topLevel[0].partName).toBe("Shaft");
  });

  it("recursively includes children", () => {
    const bom = buildNestedBOM(nodes, objects);
    expect(bom).toHaveLength(2);
    const child = bom.find(b => b.partName === "Bearing");
    expect(child).toBeDefined();
    expect(child!.level).toBe(1);
  });

  it("assigns ascending level for nested depth", () => {
    const bom = buildNestedBOM(nodes, objects);
    const shaft = bom.find(b => b.partName === "Shaft");
    const bearing = bom.find(b => b.partName === "Bearing");
    expect(shaft!.level).toBe(0);
    expect(bearing!.level).toBe(1);
  });

  it("uses default mass (0.1) for nodes without matching objects", () => {
    const orphanNodes: FeatureNodeLike[] = [
      { id: "z", name: "Ghost", type: "extrude", children: [] },
    ];
    const bom = buildNestedBOM(orphanNodes, []);
    expect(bom[0].mass).toBe(0.1);
  });
});

// ─── summarizeBOM ────────────────────────────────────────────────────────────

describe("summarizeBOM", () => {
  const sample = getSampleBOM();

  it("returns zero summary for empty BOM", () => {
    const s = summarizeBOM([]);
    expect(s.totalParts).toBe(0);
    expect(s.totalMass).toBe(0);
    expect(s.totalCost).toBe(0);
    expect(s.uniqueMaterials).toEqual([]);
  });

  it("counts total parts including quantities", () => {
    const bom: BOMItem[] = [
      { id: "1", partName: "A", partNumber: "SS-001", quantity: 3, material: "Steel AISI 304", mass: 1, dimensions: "", unitCost: 0, level: 0 },
      { id: "2", partName: "B", partNumber: "SS-002", quantity: 2, material: "Al 6061-T6", mass: 1, dimensions: "", unitCost: 0, level: 0 },
    ];
    expect(summarizeBOM(bom).totalParts).toBe(5);
  });

  it("sums total mass across quantities", () => {
    const bom: BOMItem[] = [
      { id: "1", partName: "A", partNumber: "SS-001", quantity: 2, material: "Steel", mass: 1.5, dimensions: "", unitCost: 0, level: 0 },
    ];
    expect(summarizeBOM(bom).totalMass).toBeCloseTo(3.0);
  });

  it("sums total cost across quantities", () => {
    const bom: BOMItem[] = [
      { id: "1", partName: "A", partNumber: "SS-001", quantity: 4, material: "Steel", mass: 1, dimensions: "", unitCost: 10.5, level: 0 },
    ];
    expect(summarizeBOM(bom).totalCost).toBeCloseTo(42.0);
  });

  it("collects unique materials", () => {
    const s = summarizeBOM(sample);
    expect(s.uniqueMaterials.length).toBeGreaterThan(1);
    expect(s.uniqueMaterials).toContain("Al 6061-T6");
    expect(s.uniqueMaterials).toContain("Steel AISI 304");
  });

  it("identifies heaviest part by unit mass", () => {
    const bom: BOMItem[] = [
      { id: "1", partName: "Light", partNumber: "SS-001", quantity: 1, material: "Al", mass: 0.5, dimensions: "", unitCost: 0, level: 0 },
      { id: "2", partName: "Heavy", partNumber: "SS-002", quantity: 1, material: "Steel", mass: 5.0, dimensions: "", unitCost: 0, level: 0 },
    ];
    expect(summarizeBOM(bom).heaviestPart).toBe("Heavy");
  });

  it("identifies most expensive part by unit cost", () => {
    const bom: BOMItem[] = [
      { id: "1", partName: "Cheap", partNumber: "SS-001", quantity: 1, material: "Al", mass: 1, dimensions: "", unitCost: 1.0, level: 0 },
      { id: "2", partName: "Pricey", partNumber: "SS-002", quantity: 1, material: "Steel", mass: 1, dimensions: "", unitCost: 99.0, level: 0 },
    ];
    expect(summarizeBOM(bom).mostExpensive).toBe("Pricey");
  });

  it("excludes suppressed items from totals", () => {
    const bom: BOMItem[] = [
      { id: "1", partName: "A", partNumber: "SS-001", quantity: 1, material: "Steel", mass: 2, dimensions: "", unitCost: 10, level: 0 },
      { id: "2", partName: "B", partNumber: "SS-002", quantity: 1, material: "Steel", mass: 5, dimensions: "", unitCost: 50, level: 0, suppressed: true },
    ];
    const s = summarizeBOM(bom);
    expect(s.totalParts).toBe(1);
    expect(s.totalMass).toBeCloseTo(2);
    expect(s.totalCost).toBeCloseTo(10);
  });
});

// ─── applyUnitCosts ──────────────────────────────────────────────────────────

describe("applyUnitCosts", () => {
  const bom: BOMItem[] = getSampleBOM().slice(0, 3);

  it("returns same length array", () => {
    expect(applyUnitCosts(bom, {}).length).toBe(bom.length);
  });

  it("applies cost by part name", () => {
    const updated = applyUnitCosts(bom, { "Base Plate": 999 });
    const plate = updated.find(b => b.partName === "Base Plate");
    expect(plate?.unitCost).toBe(999);
  });

  it("applies cost by part number", () => {
    const updated = applyUnitCosts(bom, { "SS-002": 777 });
    const item = updated.find(b => b.partNumber === "SS-002");
    expect(item?.unitCost).toBe(777);
  });

  it("prefers part name over part number when both match", () => {
    const updated = applyUnitCosts(bom, { "Base Plate": 100, "SS-001": 200 });
    const plate = updated.find(b => b.partName === "Base Plate");
    expect(plate?.unitCost).toBe(100);
  });

  it("leaves cost unchanged for unmatched items", () => {
    const original = bom[0].unitCost;
    const updated = applyUnitCosts(bom, { "NonExistent": 999 });
    expect(updated[0].unitCost).toBe(original);
  });

  it("does not mutate the original BOM", () => {
    const originalCost = bom[0].unitCost;
    applyUnitCosts(bom, { "Base Plate": 500 });
    expect(bom[0].unitCost).toBe(originalCost);
  });
});

// ─── getSampleBOM ────────────────────────────────────────────────────────────

describe("getSampleBOM", () => {
  it("returns 10 items", () => {
    expect(getSampleBOM()).toHaveLength(10);
  });

  it("has sequential part numbers SS-001 through SS-010", () => {
    const partNumbers = getSampleBOM().map(b => b.partNumber);
    expect(partNumbers).toContain("SS-001");
    expect(partNumbers).toContain("SS-010");
  });

  it("all items have positive quantity", () => {
    getSampleBOM().forEach(item => {
      expect(item.quantity).toBeGreaterThan(0);
    });
  });

  it("all items have non-negative mass", () => {
    getSampleBOM().forEach(item => {
      expect(item.mass).toBeGreaterThanOrEqual(0);
    });
  });

  it("all items have a non-empty part name", () => {
    getSampleBOM().forEach(item => {
      expect(item.partName.length).toBeGreaterThan(0);
    });
  });
});
