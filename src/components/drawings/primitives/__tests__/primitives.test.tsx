import React from "react";
import { render } from "@testing-library/react";
import {
  HatchPattern,
  DimensionLine,
  SectionIndicator,
  LeaderCallout,
  TitleBlock,
  SheetFrame,
  HumanFigure,
  SpecificationTable,
  ValveSymbol,
  BOMTable,
  toIso,
  drawIsoBox,
  drawIsoCylinder,
  drawIsoPanel,
  ghostLineStyle,
} from "../index";

// Helper to render SVG children inside an <svg> wrapper
function renderSvg(ui: React.ReactElement) {
  return render(<svg xmlns="http://www.w3.org/2000/svg">{ui}</svg>);
}

describe("HatchPattern", () => {
  const materials = [
    "steel",
    "insulation",
    "concrete",
    "rubber",
    "glass",
    "aluminum",
    "copper",
    "air",
    "water",
  ] as const;

  materials.forEach((mat) => {
    it(`renders ${mat} pattern`, () => {
      const { container } = renderSvg(
        <HatchPattern material={mat} patternId={`hatch-${mat}`} />
      );
      const pattern = container.querySelector(`#hatch-${mat}`);
      expect(pattern).toBeTruthy();
    });
  });
});

describe("DimensionLine", () => {
  it("renders a linear dimension with arrowheads and text", () => {
    const { container } = renderSvg(
      <DimensionLine x1={0} y1={0} x2={100} y2={0} value="100" unit="mm" />
    );
    expect(container.querySelector(".dimension-line")).toBeTruthy();
    // Should have 2 arrowhead polygons + 2 extension lines + 1 dim line
    const lines = container.querySelectorAll("line");
    expect(lines.length).toBeGreaterThanOrEqual(3);
    const text = container.querySelector("text");
    expect(text?.textContent).toContain("100");
  });

  it("renders tolerance stack when provided", () => {
    const { container } = renderSvg(
      <DimensionLine
        x1={0}
        y1={0}
        x2={100}
        y2={0}
        value="50"
        tolerance={{ upper: 0.05, lower: -0.05 }}
      />
    );
    const texts = container.querySelectorAll("text");
    expect(texts.length).toBeGreaterThanOrEqual(2);
  });

  it("renders radius style", () => {
    const { container } = renderSvg(
      <DimensionLine
        x1={50}
        y1={50}
        x2={100}
        y2={50}
        value="25"
        style="radius"
      />
    );
    const text = container.querySelector("text");
    expect(text?.textContent).toContain("R");
  });

  it("renders diameter style", () => {
    const { container } = renderSvg(
      <DimensionLine
        x1={50}
        y1={50}
        x2={100}
        y2={50}
        value="50"
        style="diameter"
      />
    );
    const text = container.querySelector("text");
    expect(text?.textContent).toContain("\u2300");
  });
});

describe("SectionIndicator", () => {
  it("renders section line with labels", () => {
    const { container } = renderSvg(
      <SectionIndicator
        x1={0}
        y1={50}
        x2={200}
        y2={50}
        label="A-A"
        direction="down"
      />
    );
    expect(container.querySelector(".section-indicator")).toBeTruthy();
    const texts = container.querySelectorAll("text");
    expect(texts.length).toBe(2);
    expect(texts[0].textContent).toBe("A-A");
  });
});

describe("LeaderCallout", () => {
  it("renders text style callout", () => {
    const { container } = renderSvg(
      <LeaderCallout
        x={50}
        y={20}
        targetX={100}
        targetY={100}
        text="Note A"
      />
    );
    expect(container.querySelector(".leader-callout-text")).toBeTruthy();
    expect(container.querySelector("text")?.textContent).toBe("Note A");
  });

  it("renders balloon style callout", () => {
    const { container } = renderSvg(
      <LeaderCallout
        x={50}
        y={20}
        targetX={100}
        targetY={100}
        text="1"
        balloonNumber={1}
        style="balloon"
      />
    );
    expect(container.querySelector(".leader-callout-balloon")).toBeTruthy();
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(2); // target dot + balloon circle
  });

  it("renders flag style callout", () => {
    const { container } = renderSvg(
      <LeaderCallout
        x={50}
        y={20}
        targetX={100}
        targetY={100}
        text="Warning"
        style="flag"
      />
    );
    expect(container.querySelector(".leader-callout-flag")).toBeTruthy();
  });
});

describe("TitleBlock", () => {
  it("renders all fields", () => {
    const { container } = renderSvg(
      <TitleBlock
        equipmentName="COOLING TOWER"
        standard="ISO 9001"
        partNo="CT-2000"
        material="SS316"
        scale="1:10"
        sheet="1/3"
        rev="A"
        project="ShilpaSutra"
        drawnBy="Engineer"
        date="2026-03-29"
      />
    );
    expect(container.querySelector(".title-block")).toBeTruthy();
    const texts = container.querySelectorAll("text");
    const allText = Array.from(texts)
      .map((t) => t.textContent)
      .join(" ");
    expect(allText).toContain("COOLING TOWER");
    expect(allText).toContain("SS316");
  });
});

describe("SheetFrame", () => {
  it("renders A3 landscape frame with grid references", () => {
    const { container } = render(
      <SheetFrame size="A3" orientation="landscape">
        <rect x={0} y={0} width={100} height={100} fill="red" />
      </SheetFrame>
    );
    expect(container.querySelector(".sheet-frame")).toBeTruthy();
    // Should have grid labels
    const texts = container.querySelectorAll("text");
    expect(texts.length).toBeGreaterThanOrEqual(20); // 12*2 + 8*2 labels
  });
});

describe("IsometricProjection", () => {
  it("toIso converts 3D to 2D", () => {
    const result = toIso(10, 0, 0);
    expect(result.screenX).toBeCloseTo(10 * Math.cos(Math.PI / 6));
    expect(result.screenY).toBeCloseTo(10 * Math.sin(Math.PI / 6));
  });

  it("toIso origin maps to (0,0)", () => {
    const result = toIso(0, 0, 0);
    expect(result.screenX).toBeCloseTo(0);
    expect(result.screenY).toBeCloseTo(0);
  });

  it("drawIsoBox returns non-empty path", () => {
    const path = drawIsoBox(0, 0, 0, 10, 10, 10);
    expect(path.length).toBeGreaterThan(0);
    expect(path).toContain("M");
    expect(path).toContain("L");
  });

  it("drawIsoCylinder returns path for y-axis", () => {
    const path = drawIsoCylinder(0, 0, 0, 5, 20, "y");
    expect(path.length).toBeGreaterThan(0);
  });

  it("drawIsoPanel returns closed path", () => {
    const path = drawIsoPanel([
      [0, 0, 0],
      [10, 0, 0],
      [10, 10, 0],
      [0, 10, 0],
    ]);
    expect(path).toContain("Z");
  });

  it("drawIsoPanel returns empty for < 3 points", () => {
    expect(drawIsoPanel([[0, 0, 0]])).toBe("");
  });

  it("ghostLineStyle returns dash attributes", () => {
    const style = ghostLineStyle();
    expect(style.strokeDasharray).toBe("4,3");
    expect(style.fill).toBe("none");
  });
});

describe("HumanFigure", () => {
  it("renders figure with dimension", () => {
    const { container } = renderSvg(
      <HumanFigure x={50} y={200} scale={0.1} />
    );
    expect(container.querySelector(".human-figure")).toBeTruthy();
    const text = container.querySelector("text");
    expect(text?.textContent).toContain("1700");
  });

  it("hides dimension when showDimension=false", () => {
    const { container } = renderSvg(
      <HumanFigure x={50} y={200} scale={0.1} showDimension={false} />
    );
    expect(container.querySelector("text")).toBeNull();
  });
});

describe("SpecificationTable", () => {
  it("renders specs with title", () => {
    const { container } = renderSvg(
      <SpecificationTable
        x={0}
        y={0}
        width={100}
        title="SPECIFICATIONS"
        specs={[
          { label: "Power", value: "500", unit: "kW" },
          { label: "RPM", value: "1800" },
        ]}
      />
    );
    expect(container.querySelector(".specification-table")).toBeTruthy();
    const texts = container.querySelectorAll("text");
    const allText = Array.from(texts)
      .map((t) => t.textContent)
      .join(" ");
    expect(allText).toContain("Power");
    expect(allText).toContain("500 kW");
    expect(allText).toContain("1800");
  });
});

describe("ValveSymbol", () => {
  const types = [
    "gate",
    "globe",
    "check",
    "ball",
    "butterfly",
    "relief",
    "solenoid",
  ] as const;

  types.forEach((type) => {
    it(`renders ${type} valve`, () => {
      const { container } = renderSvg(
        <ValveSymbol x={50} y={50} type={type} />
      );
      expect(container.querySelector(`.valve-${type}`)).toBeTruthy();
    });
  });
});

describe("BOMTable", () => {
  it("renders BOM with header and items", () => {
    const { container } = renderSvg(
      <BOMTable
        x={0}
        y={0}
        width={200}
        items={[
          { no: 1, partName: "Shell", material: "SS316", qty: 1 },
          {
            no: 2,
            partName: "Gasket",
            material: "Rubber",
            qty: 4,
            remarks: "NBR",
          },
        ]}
      />
    );
    expect(container.querySelector(".bom-table")).toBeTruthy();
    const texts = container.querySelectorAll("text");
    const allText = Array.from(texts)
      .map((t) => t.textContent)
      .join(" ");
    expect(allText).toContain("PART NAME");
    expect(allText).toContain("Shell");
    expect(allText).toContain("NBR");
  });
});
