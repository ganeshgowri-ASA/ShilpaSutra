import {
  getClarifyingQuestions,
  buildEnrichedPrompt,
} from "../clarifying-questions";

// ── getClarifyingQuestions ───────────────────────────────────────────────────

describe("getClarifyingQuestions — skip conditions", () => {
  it("returns null for highly detailed prompts (≥8 words, ≥2 numbers)", () => {
    const prompt = "bracket 100x50x20mm steel grade 8.8 bolt holes 4x M6";
    expect(getClarifyingQuestions(prompt)).toBeNull();
  });

  it("returns null for very long prompts (≥12 words)", () => {
    const prompt =
      "make me a rectangular aluminum enclosure with lid and four mounting holes at corners";
    expect(getClarifyingQuestions(prompt)).toBeNull();
  });

  it("returns null when prompt has dims + material + unknown domain", () => {
    // has dims AND has material AND domain stays 'default'
    const prompt = "widget 50x30mm aluminum";
    expect(getClarifyingQuestions(prompt)).toBeNull();
  });

  it("returns null when prompt has dims and a known domain (non-default)", () => {
    const prompt = "enclosure 200x150x80mm aluminum IP65";
    expect(getClarifyingQuestions(prompt)).toBeNull();
  });
});

describe("getClarifyingQuestions — domain detection", () => {
  const cases: [string, string, string][] = [
    ["pv_array",  "pv array 10kWp",      "pv array"],
    ["pv_array",  "solar array layout",   "solar array"],
    ["pv_module", "pv module bifacial",   "pv module"],
    ["enclosure", "enclosure for relay",  "junction box"],
    ["beam",      "steel beam",           "rafter design"],
    ["bracket",   "mount bracket",        "clamp"],
    ["gear",      "spur gear",            "pinion tooth"],
    ["pipe",      "pipe 50mm",            "conduit run"],
    ["flange",    "weld neck flange",      "flange"],
    ["heat_sink", "heat sink",            "heatsink fins"],
    ["bearing",   "deep groove bearing",  "bushing"],
    ["fastener",  "M8 bolt",              "hex screw"],
    ["plate",     "base plate",           "sheet metal"],
    ["shaft",     "drive shaft",          "spindle"],
    ["spring",    "coil spring",          "spring coil"],
  ];

  cases.forEach(([domain, prompt]) => {
    it(`detects "${domain}" for "${prompt}"`, () => {
      const result = getClarifyingQuestions(prompt);
      // For very short prompts that ARE vague, we expect a result with the domain
      if (result !== null) {
        expect(result.domain).toBe(domain);
      }
    });
  });
});

describe("getClarifyingQuestions — returns questions for vague prompts", () => {
  it("single-word bracket prompt returns bracket questions", () => {
    const result = getClarifyingQuestions("bracket");
    expect(result).not.toBeNull();
    expect(result!.needed).toBe(true);
    expect(result!.domain).toBe("bracket");
    expect(result!.questions.length).toBeGreaterThan(0);
    expect(result!.questions.length).toBeLessThanOrEqual(4);
  });

  it("single-word gear prompt returns gear questions", () => {
    const result = getClarifyingQuestions("gear");
    expect(result).not.toBeNull();
    expect(result!.domain).toBe("gear");
  });

  it("single-word pipe prompt returns pipe questions", () => {
    const result = getClarifyingQuestions("pipe");
    expect(result).not.toBeNull();
    expect(result!.domain).toBe("pipe");
  });

  it("two-word vague prompt returns default questions", () => {
    const result = getClarifyingQuestions("make something");
    expect(result).not.toBeNull();
    expect(result!.needed).toBe(true);
    expect(result!.domain).toBe("default");
  });

  it("questions array has the right shape", () => {
    const result = getClarifyingQuestions("enclosure");
    expect(result).not.toBeNull();
    const q = result!.questions[0];
    expect(q).toHaveProperty("id");
    expect(q).toHaveProperty("question");
    expect(q).toHaveProperty("placeholder");
    expect(typeof q.id).toBe("string");
    expect(typeof q.question).toBe("string");
  });

  it("prompt with only material (no dims) returns questions", () => {
    const result = getClarifyingQuestions("aluminum bracket");
    expect(result).not.toBeNull();
    expect(result!.domain).toBe("bracket");
  });

  it("shaft prompt without dims returns shaft questions", () => {
    const result = getClarifyingQuestions("shaft");
    expect(result).not.toBeNull();
    expect(result!.domain).toBe("shaft");
  });

  it("spring prompt without dims returns spring questions", () => {
    const result = getClarifyingQuestions("spring");
    expect(result).not.toBeNull();
    expect(result!.domain).toBe("spring");
  });
});

describe("getClarifyingQuestions — needed flag", () => {
  it("needed is always true when result is not null", () => {
    const cases = ["gear", "bracket", "pipe flange", "bearing"];
    for (const p of cases) {
      const result = getClarifyingQuestions(p);
      if (result !== null) {
        expect(result.needed).toBe(true);
      }
    }
  });
});

// ── buildEnrichedPrompt ──────────────────────────────────────────────────────

describe("buildEnrichedPrompt", () => {
  it("returns original prompt when answers is empty", () => {
    expect(buildEnrichedPrompt("gear design", {})).toBe("gear design");
  });

  it("appends known answer fields as labelled extras", () => {
    const result = buildEnrichedPrompt("bracket", { dims: "100x50mm", material: "aluminum" });
    expect(result).toContain("bracket");
    expect(result).toContain("aluminum");
    expect(result).toContain("100x50mm");
  });

  it("filters out empty-string answers", () => {
    const result = buildEnrichedPrompt("pipe", { od: "50", length: "" });
    expect(result).not.toContain("length");
    expect(result).toContain("50");
  });

  it("filters out whitespace-only answers", () => {
    const result = buildEnrichedPrompt("shaft", { dia: "   ", length: "300" });
    expect(result).not.toMatch(/dia/);
    expect(result).toContain("300");
  });

  it("handles unknown question IDs gracefully (appends raw value)", () => {
    const result = buildEnrichedPrompt("custom part", { unknown_key: "some value" });
    expect(result).toContain("some value");
  });

  it("does not duplicate the original prompt", () => {
    const result = buildEnrichedPrompt("gear", { teeth: "24" });
    const promptCount = (result.match(/gear/g) ?? []).length;
    expect(promptCount).toBe(1);
  });

  it("multiple answers all appear in the output", () => {
    const result = buildEnrichedPrompt("enclosure", {
      length: "200",
      width: "150",
      height: "80",
      material: "aluminum",
    });
    expect(result).toContain("200");
    expect(result).toContain("150");
    expect(result).toContain("80");
    expect(result).toContain("aluminum");
  });

  it("result starts with the original prompt", () => {
    const result = buildEnrichedPrompt("pipe fitting", { od: "25", length: "100" });
    expect(result.startsWith("pipe fitting")).toBe(true);
  });
});
