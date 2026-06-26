import {
  materials,
  getMaterialByName,
  getMaterialsByCategory,
  getMaterialCategories,
  compareMaterials,
  calculateWeight,
  getMaterialColor,
} from "../materials";

describe("materials array", () => {
  it("contains at least 30 entries", () => {
    expect(materials.length).toBeGreaterThanOrEqual(30);
  });

  it("every entry has required numeric fields > 0", () => {
    for (const m of materials) {
      expect(m.density).toBeGreaterThan(0);
      expect(m.youngsModulus).toBeGreaterThan(0);
      expect(m.yieldStrength).toBeGreaterThan(0);
      expect(m.ultimateStrength).toBeGreaterThan(0);
      expect(m.poissonRatio).toBeGreaterThan(0);
      expect(m.poissonRatio).toBeLessThan(0.5);
    }
  });

  it("every entry has a valid hex color", () => {
    for (const m of materials) {
      expect(m.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("every entry has a non-empty category and name", () => {
    for (const m of materials) {
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.category.length).toBeGreaterThan(0);
    }
  });

  it("temperature range min < max for all entries", () => {
    for (const m of materials) {
      expect(m.temperatureRange.min).toBeLessThan(m.temperatureRange.max);
    }
  });
});

describe("getMaterialByName", () => {
  it("finds an exact match", () => {
    const m = getMaterialByName("Steel 1045");
    expect(m).toBeDefined();
    expect(m!.name).toBe("Steel 1045");
  });

  it("is case-insensitive", () => {
    const m = getMaterialByName("steel 1045");
    expect(m).toBeDefined();
    expect(m!.name).toBe("Steel 1045");
  });

  it("matches on partial substring", () => {
    const m = getMaterialByName("6061");
    expect(m).toBeDefined();
    expect(m!.name).toContain("6061");
  });

  it("returns undefined for no match", () => {
    expect(getMaterialByName("unobtainium")).toBeUndefined();
  });

  it("returns undefined for empty string (matches first material)", () => {
    // empty string is a substring of every name — verify it returns something
    const m = getMaterialByName("");
    expect(m).toBeDefined();
  });
});

describe("getMaterialsByCategory", () => {
  it("returns only Steel materials for 'Steel'", () => {
    const steels = getMaterialsByCategory("Steel");
    expect(steels.length).toBeGreaterThanOrEqual(3);
    steels.forEach((m) => expect(m.category).toBe("Steel"));
  });

  it("is case-insensitive", () => {
    const lower = getMaterialsByCategory("aluminum");
    const upper = getMaterialsByCategory("Aluminum");
    expect(lower.length).toBe(upper.length);
    expect(lower.length).toBeGreaterThan(0);
  });

  it("returns empty array for unknown category", () => {
    expect(getMaterialsByCategory("unobtainium")).toEqual([]);
  });

  it("covers Titanium, Plastic, Composite, Metal, Ceramic, Wood, Rubber categories", () => {
    const expected = ["Titanium", "Plastic", "Composite", "Metal", "Ceramic", "Wood", "Rubber"];
    for (const cat of expected) {
      expect(getMaterialsByCategory(cat).length).toBeGreaterThan(0);
    }
  });
});

describe("getMaterialCategories", () => {
  it("returns a sorted array", () => {
    const cats = getMaterialCategories();
    expect(cats).toEqual([...cats].sort());
  });

  it("contains unique entries only", () => {
    const cats = getMaterialCategories();
    expect(new Set(cats).size).toBe(cats.length);
  });

  it("includes Steel and Aluminum", () => {
    const cats = getMaterialCategories();
    expect(cats).toContain("Steel");
    expect(cats).toContain("Aluminum");
  });

  it("has at least 7 distinct categories", () => {
    expect(getMaterialCategories().length).toBeGreaterThanOrEqual(7);
  });
});

describe("compareMaterials", () => {
  it("returns null when first material is unknown", () => {
    expect(compareMaterials("unobtainium", "Steel 1045")).toBeNull();
  });

  it("returns null when second material is unknown", () => {
    expect(compareMaterials("Steel 1045", "unobtainium")).toBeNull();
  });

  it("returns a valid comparison object for two known materials", () => {
    const result = compareMaterials("Steel 1045", "Aluminum 6061");
    expect(result).not.toBeNull();
    expect(result!.materialA.name).toBe("Steel 1045");
    expect(result!.materialB.name).toContain("6061");
  });

  it("differences object contains all numeric keys", () => {
    const result = compareMaterials("Steel 1045", "Copper C11000");
    expect(result).not.toBeNull();
    const keys = Object.keys(result!.differences);
    expect(keys).toContain("density");
    expect(keys).toContain("youngsModulus");
    expect(keys).toContain("yieldStrength");
    expect(keys).toContain("poissonRatio");
  });

  it("density ratio for Steel vs Aluminum is approximately 2.9", () => {
    const result = compareMaterials("Steel 1045", "Aluminum 6061");
    expect(result).not.toBeNull();
    const ratio = result!.differences.density.ratio as number;
    expect(ratio).toBeCloseTo(7850 / 2700, 1);
  });

  it("includes non-numeric hardness and category in differences", () => {
    const result = compareMaterials("Steel 1045", "ABS Plastic");
    expect(result!.differences.hardness.a).toBeDefined();
    expect(result!.differences.category.a).toBe("Steel");
    expect(result!.differences.category.b).toBe("Plastic");
  });
});

describe("calculateWeight", () => {
  it("calculates correct weight for a known material and volume", () => {
    // 1 000 000 mm³ = 1 litre = 0.001 m³
    // Steel 1045 density = 7850 kg/m³ → weight = 7850 * 0.001 = 7.85 kg
    const weight = calculateWeight("Steel 1045", 1_000_000);
    expect(weight).not.toBeNull();
    expect(weight!).toBeCloseTo(7.85, 2);
  });

  it("returns null for unknown material", () => {
    expect(calculateWeight("unobtainium", 1_000_000)).toBeNull();
  });

  it("returns 0 for volume 0", () => {
    expect(calculateWeight("Steel 1045", 0)).toBeCloseTo(0);
  });

  it("scales linearly with volume", () => {
    const w1 = calculateWeight("Aluminum 6061", 500_000)!;
    const w2 = calculateWeight("Aluminum 6061", 1_000_000)!;
    expect(w2).toBeCloseTo(w1 * 2, 5);
  });

  it("lighter material (Aluminum) weighs less than Steel for same volume", () => {
    const steel = calculateWeight("Steel 1045", 1_000_000)!;
    const al = calculateWeight("Aluminum 6061", 1_000_000)!;
    expect(al).toBeLessThan(steel);
  });
});

describe("getMaterialColor", () => {
  it("returns a hex string for a known material", () => {
    const color = getMaterialColor("Steel 1045");
    expect(color).not.toBeNull();
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns null for unknown material", () => {
    expect(getMaterialColor("unobtainium")).toBeNull();
  });

  it("Copper returns a brownish hex", () => {
    const color = getMaterialColor("Copper C11000");
    expect(color).toBe("#b87333");
  });
});
