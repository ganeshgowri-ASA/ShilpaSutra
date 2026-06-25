/**
 * @jest-environment node
 *
 * Pure-function tests for the Unified Drawing Engine.
 * No DOM or React needed — these run in the Node environment.
 */

import {
  createA3Viewport,
  renderDrawingToSVG,
  type Drawing,
  type DrawingLayer,
  type DrawingCommand,
  type Viewport,
} from "@/lib/drawingEngine";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeLayer(
  commands: DrawingCommand[],
  visible = true
): DrawingLayer {
  return {
    name: "test",
    visible,
    color: "#000",
    lineWidth: 1,
    commands,
  };
}

function makeDrawing(layers: DrawingLayer[]): Drawing {
  return { id: "d1", title: "Test", standard: "ISO", scale: 1, layers, notes: [] };
}

// ── createA3Viewport ─────────────────────────────────────────────────────────

describe("createA3Viewport", () => {
  it("returns A3 landscape dimensions", () => {
    const vp = createA3Viewport();
    expect(vp.width).toBe(841);
    expect(vp.height).toBe(594);
  });

  it("has zero pan and 1× zoom by default", () => {
    const vp = createA3Viewport();
    expect(vp.panX).toBe(0);
    expect(vp.panY).toBe(0);
    expect(vp.zoom).toBe(1);
  });

  it("is frozen (immutable)", () => {
    const vp = createA3Viewport();
    expect(Object.isFrozen(vp)).toBe(true);
  });
});

// ── renderDrawingToSVG — root element ───────────────────────────────────────

describe("renderDrawingToSVG — root element", () => {
  const vp = createA3Viewport();

  it("produces a valid SVG opening tag", () => {
    const svg = renderDrawingToSVG(makeDrawing([]), vp);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("embeds correct width and height attributes", () => {
    const svg = renderDrawingToSVG(makeDrawing([]), vp);
    expect(svg).toContain(`width="841mm"`);
    expect(svg).toContain(`height="594mm"`);
  });

  it("includes XML declaration", () => {
    const svg = renderDrawingToSVG(makeDrawing([]), vp);
    expect(svg).toContain(`<?xml version="1.0"`);
  });
});

// ── renderDrawingToSVG — layer visibility ───────────────────────────────────

describe("renderDrawingToSVG — layer visibility", () => {
  const vp = createA3Viewport();
  const cmd: DrawingCommand = { type: "line", x1: 0, y1: 0, x2: 10, y2: 10 };

  it("renders visible layers", () => {
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd], true)]), vp);
    expect(svg).toContain("<line");
  });

  it("skips hidden layers entirely", () => {
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd], false)]), vp);
    expect(svg).not.toContain("<line");
  });

  it("renders only the visible layer when both exist", () => {
    const hidden = makeLayer([{ type: "rect", x: 0, y: 0, w: 10, h: 10 }], false);
    const visible = makeLayer([cmd], true);
    const svg = renderDrawingToSVG(makeDrawing([hidden, visible]), vp);
    expect(svg).toContain("<line");
    expect(svg).not.toContain("<rect");
  });
});

// ── renderDrawingToSVG — primitive commands ─────────────────────────────────

describe("renderDrawingToSVG — primitive commands", () => {
  const vp = createA3Viewport();

  it("renders a line command", () => {
    const cmd: DrawingCommand = { type: "line", x1: 5, y1: 10, x2: 50, y2: 100 };
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd])]), vp);
    expect(svg).toContain(`x1="5"`);
    expect(svg).toContain(`y2="100"`);
  });

  it("renders a rect command with fill", () => {
    const cmd: DrawingCommand = { type: "rect", x: 0, y: 0, w: 100, h: 50, fill: "#ff0" };
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd])]), vp);
    expect(svg).toContain("<rect");
    expect(svg).toContain(`width="100"`);
    expect(svg).toContain(`fill="#ff0"`);
  });

  it("renders a rect command with rx when provided", () => {
    const cmd: DrawingCommand = { type: "rect", x: 0, y: 0, w: 10, h: 10, rx: 3 };
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd])]), vp);
    expect(svg).toContain(`rx="3"`);
  });

  it("renders a circle command", () => {
    const cmd: DrawingCommand = { type: "circle", cx: 50, cy: 50, r: 20 };
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd])]), vp);
    expect(svg).toContain("<circle");
    expect(svg).toContain(`r="20"`);
  });

  it("renders a text command with content", () => {
    const cmd: DrawingCommand = { type: "text", x: 10, y: 20, content: "Hello" };
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd])]), vp);
    expect(svg).toContain("<text");
    expect(svg).toContain("Hello");
  });

  it("renders a hatch command with diagonal pattern", () => {
    const cmd: DrawingCommand = { type: "hatch", x: 0, y: 0, w: 50, h: 50, pattern: "diagonal" };
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd])]), vp);
    expect(svg).toContain("<pattern");
    expect(svg).toContain("<defs");
  });

  it("renders a hatch command with cross pattern", () => {
    const cmd: DrawingCommand = { type: "hatch", x: 0, y: 0, w: 50, h: 50, pattern: "cross" };
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd])]), vp);
    expect(svg).toContain("<pattern");
  });

  it("renders a hatch command with dots pattern", () => {
    const cmd: DrawingCommand = { type: "hatch", x: 0, y: 0, w: 50, h: 50, pattern: "dots" };
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd])]), vp);
    expect(svg).toContain("<circle");
  });

  it("renders an arrow command with polygon arrowhead", () => {
    const cmd: DrawingCommand = { type: "arrow", x1: 0, y1: 0, x2: 100, y2: 0 };
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd])]), vp);
    expect(svg).toContain("<line");
    expect(svg).toContain("<polygon");
  });

  it("skips zero-length arrow (no division by zero)", () => {
    const cmd: DrawingCommand = { type: "arrow", x1: 5, y1: 5, x2: 5, y2: 5 };
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd])]), vp);
    // Zero-length arrow produces empty string — no crash
    expect(svg).not.toContain("NaN");
  });
});

// ── renderDrawingToSVG — dimension annotations ──────────────────────────────

describe("renderDrawingToSVG — dimension annotations", () => {
  const vp = createA3Viewport();

  it("renders horizontal dimension with label", () => {
    const cmd: DrawingCommand = {
      type: "dim",
      orientation: "horizontal",
      a: 10,
      b: 110,
      offset: 130,
      pos: 100,
      label: "100mm",
    };
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd])]), vp);
    expect(svg).toContain("100mm");
    expect(svg).toContain("<polygon");
  });

  it("renders vertical dimension with label", () => {
    const cmd: DrawingCommand = {
      type: "dim",
      orientation: "vertical",
      a: 10,
      b: 80,
      offset: 5,
      pos: 50,
      label: "70mm",
    };
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd])]), vp);
    expect(svg).toContain("70mm");
  });
});

// ── renderDrawingToSVG — XML escaping ───────────────────────────────────────

describe("renderDrawingToSVG — XML escaping", () => {
  const vp = createA3Viewport();

  it("escapes ampersand in text content", () => {
    const cmd: DrawingCommand = { type: "text", x: 0, y: 0, content: "A & B" };
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd])]), vp);
    expect(svg).toContain("A &amp; B");
    expect(svg).not.toContain("A & B");
  });

  it("escapes angle brackets in text content", () => {
    const cmd: DrawingCommand = { type: "text", x: 0, y: 0, content: "<tag>" };
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd])]), vp);
    expect(svg).toContain("&lt;tag&gt;");
  });
});

// ── renderDrawingToSVG — title block ────────────────────────────────────────

describe("renderDrawingToSVG — title block", () => {
  const vp = createA3Viewport();

  it("includes title block when provided", () => {
    const drawing: Drawing = {
      ...makeDrawing([]),
      titleBlock: {
        partNo: "PART-001",
        scale: "1:10",
        material: "SS316",
        standard: "ISO 9001",
        drawnBy: "Engineer",
        date: "2026-06-25",
        checkedBy: "Lead",
        approvedBy: "Manager",
        sheet: "1/1",
        rev: "A",
        project: "ShilpaSutra",
      },
    };
    const svg = renderDrawingToSVG(drawing, vp);
    expect(svg).toContain("PART-001");
    expect(svg).toContain("SS316");
    expect(svg).toContain("1:10");
  });

  it("omits title block when not provided", () => {
    const drawing: Drawing = { ...makeDrawing([]), titleBlock: undefined };
    const svg = renderDrawingToSVG(drawing, vp);
    expect(svg).not.toContain("PART-001");
  });
});

// ── renderDrawingToSVG — arc command ────────────────────────────────────────

describe("renderDrawingToSVG — arc command", () => {
  const vp = createA3Viewport();

  it("renders an arc as SVG path", () => {
    const cmd: DrawingCommand = {
      type: "arc",
      cx: 50,
      cy: 50,
      r: 20,
      startAngle: 0,
      endAngle: 90,
    };
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd])]), vp);
    expect(svg).toContain("<path");
    expect(svg).toContain("A20,20");
  });

  it("sets large-arc-flag for arcs > 180°", () => {
    const cmd: DrawingCommand = {
      type: "arc",
      cx: 50,
      cy: 50,
      r: 10,
      startAngle: 0,
      endAngle: 270,
    };
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd])]), vp);
    expect(svg).toContain(" 1 1 "); // large-arc=1
  });

  it("sets large-arc-flag=0 for arcs ≤ 180°", () => {
    const cmd: DrawingCommand = {
      type: "arc",
      cx: 50,
      cy: 50,
      r: 10,
      startAngle: 0,
      endAngle: 180,
    };
    const svg = renderDrawingToSVG(makeDrawing([makeLayer([cmd])]), vp);
    expect(svg).toContain(" 0 1 "); // large-arc=0
  });
});
