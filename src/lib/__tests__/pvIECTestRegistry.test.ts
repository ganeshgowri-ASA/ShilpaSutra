import {
  PV_IEC_ALL_TEMPLATES,
  IEC_CATEGORY_LABELS,
  IEC_TEMPLATE_BROWSER_ENTRIES,
  getIECTemplateById,
  getIECTemplatesByCategory,
} from "../pvIECTestRegistry";

describe("pvIECTestRegistry", () => {
  it("has unique template ids", () => {
    const ids = PV_IEC_ALL_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("looks up templates by id", () => {
    const first = PV_IEC_ALL_TEMPLATES[0];
    expect(getIECTemplateById(first.id)).toBe(first);
    expect(getIECTemplateById("does-not-exist")).toBeUndefined();
  });

  it("filters templates by category", () => {
    for (const category of Object.keys(IEC_CATEGORY_LABELS)) {
      for (const t of getIECTemplatesByCategory(category)) {
        expect(t.category).toBe(category);
      }
    }
    expect(getIECTemplatesByCategory("nope")).toEqual([]);
  });

  it("builds one browser entry per template with a category label", () => {
    expect(IEC_TEMPLATE_BROWSER_ENTRIES).toHaveLength(PV_IEC_ALL_TEMPLATES.length);
    for (const e of IEC_TEMPLATE_BROWSER_ENTRIES) {
      expect(e.categoryLabel).toBeTruthy();
    }
  });
});
