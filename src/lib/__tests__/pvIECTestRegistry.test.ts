import {
  PV_IEC_ALL_TEMPLATES,
  PV_IEC_TEMPLATES_PART1,
  IEC_CATEGORY_LABELS,
  IEC_STANDARDS_REFERENCE,
  IEC_TEMPLATE_BROWSER_ENTRIES,
  getIECTemplateById,
  getIECTemplatesByCategory,
} from "../pvIECTestRegistry";

describe("PV_IEC_ALL_TEMPLATES", () => {
  it("combines part 1 and part 2 templates", () => {
    expect(PV_IEC_ALL_TEMPLATES.length).toBeGreaterThan(
      PV_IEC_TEMPLATES_PART1.length
    );
  });

  it("has unique template ids", () => {
    const ids = PV_IEC_ALL_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only uses categories present in IEC_CATEGORY_LABELS", () => {
    for (const t of PV_IEC_ALL_TEMPLATES) {
      expect(Object.keys(IEC_CATEGORY_LABELS)).toContain(t.category);
    }
  });
});

describe("getIECTemplateById", () => {
  it("finds an existing template", () => {
    const first = PV_IEC_ALL_TEMPLATES[0];
    expect(getIECTemplateById(first.id)).toEqual(first);
  });

  it("returns undefined for an unknown id", () => {
    expect(getIECTemplateById("does-not-exist")).toBeUndefined();
  });
});

describe("getIECTemplatesByCategory", () => {
  it("returns only templates matching the category", () => {
    const category = PV_IEC_ALL_TEMPLATES[0].category;
    const filtered = getIECTemplatesByCategory(category);
    expect(filtered.length).toBeGreaterThan(0);
    for (const t of filtered) {
      expect(t.category).toBe(category);
    }
  });

  it("returns empty array for unknown category", () => {
    expect(getIECTemplatesByCategory("not-a-category")).toEqual([]);
  });
});

describe("IEC_TEMPLATE_BROWSER_ENTRIES", () => {
  it("has one browser entry per template with a resolved category label", () => {
    expect(IEC_TEMPLATE_BROWSER_ENTRIES.length).toBe(
      PV_IEC_ALL_TEMPLATES.length
    );
    for (const entry of IEC_TEMPLATE_BROWSER_ENTRIES) {
      expect(entry.categoryLabel).toBe(IEC_CATEGORY_LABELS[entry.category]);
      expect(entry.fieldCount).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("IEC_STANDARDS_REFERENCE", () => {
  it("maps every entry to a non-empty description", () => {
    for (const [standard, description] of Object.entries(
      IEC_STANDARDS_REFERENCE
    )) {
      expect(standard.length).toBeGreaterThan(0);
      expect(description.length).toBeGreaterThan(0);
    }
  });
});
