import {
  materials,
  getMaterialByName,
  getMaterialsByCategory,
  getMaterialCategories,
  compareMaterials,
  calculateWeight,
  getMaterialColor,
} from "../materials";

describe("materials data", () => {
  it("contains at least one material with required fields", () => {
    expect(materials.length).toBeGreaterThan(0);
    for (const m of materials) {
      expect(m.name).toBeTruthy();
      expect(m.density).toBeGreaterThan(0);
      expect(m.color).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    }
  });

  it("has no duplicate material names", () => {
    const names = materials.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("getMaterialByName", () => {
  it("finds a material by exact name", () => {
    const mat = getMaterialByName("Steel 1045");
    expect(mat).toBeDefined();
    expect(mat?.name).toBe("Steel 1045");
  });

  it("finds a material by case-insensitive partial match", () => {
    const mat = getMaterialByName("aluminum 6061");
    expect(mat?.name).toBe("Aluminum 6061-T6");
  });

  it("returns undefined for an unknown material", () => {
    expect(getMaterialByName("Unobtainium")).toBeUndefined();
  });
});

describe("getMaterialsByCategory", () => {
  it("returns only materials in the requested category", () => {
    const steelMats = getMaterialsByCategory("Steel");
    expect(steelMats.length).toBeGreaterThan(0);
    for (const m of steelMats) {
      expect(m.category).toBe("Steel");
    }
  });

  it("is case-insensitive", () => {
    expect(getMaterialsByCategory("steel").length).toBe(
      getMaterialsByCategory("Steel").length
    );
  });

  it("returns empty array for unknown category", () => {
    expect(getMaterialsByCategory("Unobtainium")).toEqual([]);
  });
});

describe("getMaterialCategories", () => {
  it("returns a sorted list of unique categories", () => {
    const categories = getMaterialCategories();
    const sorted = [...categories].sort();
    expect(categories).toEqual(sorted);
    expect(new Set(categories).size).toBe(categories.length);
    expect(categories).toContain("Steel");
  });
});

describe("compareMaterials", () => {
  it("returns null when either material is unknown", () => {
    expect(compareMaterials("Steel 1045", "Unobtainium")).toBeNull();
    expect(compareMaterials("Unobtainium", "Steel 1045")).toBeNull();
  });

  it("compares two known materials", () => {
    const cmp = compareMaterials("Steel 1045", "Aluminum 6061-T6");
    expect(cmp).not.toBeNull();
    expect(cmp?.materialA.name).toBe("Steel 1045");
    expect(cmp?.materialB.name).toBe("Aluminum 6061-T6");
    expect(cmp?.differences.density.a).toBe(cmp?.materialA.density);
    expect(cmp?.differences.density.b).toBe(cmp?.materialB.density);
    expect(cmp?.differences.density.ratio).toBeCloseTo(
      (cmp?.materialA.density as number) / (cmp?.materialB.density as number)
    );
  });
});

describe("calculateWeight", () => {
  it("computes weight in kg from volume in mm3", () => {
    // Steel 1045 density = 7850 kg/m3; 1e9 mm3 = 1 m3
    const weight = calculateWeight("Steel 1045", 1e9);
    expect(weight).toBeCloseTo(7850);
  });

  it("returns null for unknown material", () => {
    expect(calculateWeight("Unobtainium", 1000)).toBeNull();
  });

  it("returns 0 for zero volume", () => {
    expect(calculateWeight("Steel 1045", 0)).toBe(0);
  });
});

describe("getMaterialColor", () => {
  it("returns the hex color for a known material", () => {
    expect(getMaterialColor("Steel 1045")).toBe("#8a8a8a");
  });

  it("returns null for unknown material", () => {
    expect(getMaterialColor("Unobtainium")).toBeNull();
  });
});
