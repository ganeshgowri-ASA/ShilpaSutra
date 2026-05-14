import { drawing, DrawingBuilder, LayerBuilder } from "../drawingDSL";

// ─── factory function ────────────────────────────────────────────────────────

describe("drawing() factory", () => {
  it("returns a DrawingBuilder instance", () => {
    expect(drawing("Test Drawing")).toBeInstanceOf(DrawingBuilder);
  });

  it("builds a Drawing with correct title", () => {
    const d = drawing("Bracket Assembly").build();
    expect(d.title).toBe("Bracket Assembly");
  });

  it("sets standard when provided", () => {
    const d = drawing("Frame", "ISO 2768").build();
    expect(d.standard).toBe("ISO 2768");
  });

  it("defaults standard to empty string", () => {
    const d = drawing("Frame").build();
    expect(d.standard).toBe("");
  });

  it("assigns a unique id per build", () => {
    const a = drawing("A").build();
    const b = drawing("B").build();
    expect(a.id).not.toBe(b.id);
  });
});

// ─── DrawingBuilder ──────────────────────────────────────────────────────────

describe("DrawingBuilder", () => {
  it("defaults scale to 1", () => {
    const d = drawing("X").build();
    expect(d.scale).toBe(1);
  });

  it("respects scale()", () => {
    const d = drawing("X").scale(20).build();
    expect(d.scale).toBe(20);
  });

  it("accumulates notes", () => {
    const d = drawing("X").note("Note A").note("Note B").build();
    expect(d.notes).toEqual(["Note A", "Note B"]);
  });

  it("starts with no layers", () => {
    const d = drawing("X").build();
    expect(d.layers).toHaveLength(0);
  });

  it("adds distinct layers", () => {
    const d = drawing("X").layer("outline").build().layers;
    expect(d).toHaveLength(1);
    expect(d[0].name).toBe("outline");
  });

  it("returns same LayerBuilder for duplicate layer name", () => {
    const b = drawing("X");
    const l1 = b.layer("outline");
    const l2 = b.layer("outline");
    expect(l1).toBe(l2);
  });

  it("produces frozen Drawing", () => {
    const d = drawing("X").build();
    expect(Object.isFrozen(d)).toBe(true);
  });

  it("produces frozen layers array", () => {
    const d = drawing("X").layer("outline").build();
    expect(Object.isFrozen(d.layers)).toBe(true);
  });

  it("titleBlock sets default fields", () => {
    const d = drawing("X").titleBlock({ partNo: "SS-001" }).build();
    expect(d.titleBlock?.partNo).toBe("SS-001");
    expect(d.titleBlock?.drawnBy).toBe("ShilpaSutra AI");
    expect(d.titleBlock?.sheet).toBe("1 of 1");
    expect(d.titleBlock?.rev).toBe("A");
  });

  it("titleBlock can override all fields", () => {
    const d = drawing("X")
      .titleBlock({ drawnBy: "Alice", rev: "C", sheet: "2 of 5" })
      .build();
    expect(d.titleBlock?.drawnBy).toBe("Alice");
    expect(d.titleBlock?.rev).toBe("C");
    expect(d.titleBlock?.sheet).toBe("2 of 5");
  });

  it("titleBlock scale defaults to 1:scale", () => {
    const d = drawing("X").scale(10).titleBlock({}).build();
    expect(d.titleBlock?.scale).toBe("1:10");
  });

  it("no titleBlock when not set", () => {
    const d = drawing("X").build();
    expect(d.titleBlock).toBeUndefined();
  });
});

// ─── LayerBuilder ────────────────────────────────────────────────────────────

describe("LayerBuilder", () => {
  function getLayer(name = "outline") {
    return drawing("X").layer(name);
  }

  it("defaults to black color", () => {
    expect(getLayer()._buildLayer().color).toBe("#000000");
  });

  it("color() sets color", () => {
    expect(getLayer().color("#ff0000")._buildLayer().color).toBe("#ff0000");
  });

  it("defaults lineWidth to 0.9", () => {
    expect(getLayer()._buildLayer().lineWidth).toBe(0.9);
  });

  it("lineWidth() sets lineWidth", () => {
    expect(getLayer().lineWidth(2.5)._buildLayer().lineWidth).toBe(2.5);
  });

  it("defaults visible to true", () => {
    expect(getLayer()._buildLayer().visible).toBe(true);
  });

  it("visible(false) hides layer", () => {
    expect(getLayer().visible(false)._buildLayer().visible).toBe(false);
  });

  it("returns this for chaining from color/lineWidth/visible", () => {
    const lb = getLayer();
    expect(lb.color("#aaa")).toBe(lb);
    expect(lb.lineWidth(1)).toBe(lb);
    expect(lb.visible(true)).toBe(lb);
  });

  describe("primitive commands", () => {
    it("line() records a line command", () => {
      const layer = getLayer().line(0, 0, 100, 0)._buildLayer();
      expect(layer.commands).toHaveLength(1);
      expect(layer.commands[0].type).toBe("line");
    });

    it("rect() records a rect command", () => {
      const layer = getLayer().rect(10, 10, 200, 100)._buildLayer();
      expect(layer.commands[0].type).toBe("rect");
    });

    it("circle() records a circle command", () => {
      const layer = getLayer().circle(50, 50, 25)._buildLayer();
      expect(layer.commands[0].type).toBe("circle");
    });

    it("arc() records an arc command", () => {
      const layer = getLayer().arc(0, 0, 10, 0, Math.PI)._buildLayer();
      expect(layer.commands[0].type).toBe("arc");
    });

    it("text() records a text command with content", () => {
      const layer = getLayer().text(10, 20, "Hello")._buildLayer();
      const cmd = layer.commands[0];
      expect(cmd.type).toBe("text");
      if (cmd.type === "text") expect(cmd.content).toBe("Hello");
    });

    it("hatch() defaults pattern to 'diagonal'", () => {
      const layer = getLayer().hatch(0, 0, 50, 50)._buildLayer();
      const cmd = layer.commands[0];
      expect(cmd.type).toBe("hatch");
      if (cmd.type === "hatch") expect(cmd.pattern).toBe("diagonal");
    });

    it("arrow() records an arrow command", () => {
      const layer = getLayer().arrow(0, 0, 100, 0)._buildLayer();
      expect(layer.commands[0].type).toBe("arrow");
    });

    it("commands are frozen", () => {
      const layer = getLayer().line(0, 0, 1, 1)._buildLayer();
      expect(Object.isFrozen(layer.commands[0])).toBe(true);
    });

    it("accumulates multiple commands in order", () => {
      const layer = getLayer()
        .line(0, 0, 100, 0)
        .rect(0, 0, 100, 50)
        .circle(50, 25, 10)
        ._buildLayer();
      expect(layer.commands.map(c => c.type)).toEqual(["line", "rect", "circle"]);
    });
  });

  describe("dim shorthand", () => {
    it("dim.horizontal() adds a horizontal dim command", () => {
      const lb = getLayer();
      lb.dim.horizontal(0, 200, -30, "200mm");
      const cmd = lb._buildLayer().commands[0];
      expect(cmd.type).toBe("dim");
      if (cmd.type === "dim") {
        expect(cmd.orientation).toBe("horizontal");
        expect(cmd.label).toBe("200mm");
      }
    });

    it("dim.vertical() adds a vertical dim command", () => {
      const lb = getLayer();
      lb.dim.vertical(0, 150, -30, "150mm");
      const cmd = lb._buildLayer().commands[0];
      expect(cmd.type).toBe("dim");
      if (cmd.type === "dim") expect(cmd.orientation).toBe("vertical");
    });
  });

  describe("callout helper", () => {
    it("callout() adds line + text commands", () => {
      const layer = getLayer().callout(50, 100, "Steel SHS 100x100")._buildLayer();
      expect(layer.commands).toHaveLength(2);
      expect(layer.commands[0].type).toBe("line");
      expect(layer.commands[1].type).toBe("text");
    });
  });

  describe("chain back to parent", () => {
    it("layer() from LayerBuilder chains to a sibling layer", () => {
      const d = drawing("X")
        .layer("outline").line(0, 0, 10, 10)
        .layer("dims").line(10, 10, 20, 20)
        .build();
      expect(d.layers).toHaveLength(2);
    });

    it("build() from LayerBuilder delegates to parent", () => {
      const d = drawing("X").layer("outline").line(0, 0, 1, 1).build();
      expect(d.title).toBe("X");
      expect(d.layers[0].commands).toHaveLength(1);
    });

    it("titleBlock() from LayerBuilder delegates to parent", () => {
      const d = drawing("X")
        .layer("outline")
        .titleBlock({ partNo: "SS-999" })
        .build();
      expect(d.titleBlock?.partNo).toBe("SS-999");
    });
  });
});

// ─── end-to-end fluent chain ─────────────────────────────────────────────────

describe("full fluent chain", () => {
  it("builds a valid drawing with multiple layers and titleBlock", () => {
    const d = drawing("Mechanical Load Frame", "IEC 61215 MQT 16")
      .scale(20)
      .note("All dimensions in mm")
      .layer("outline").color("#000").lineWidth(2)
        .rect(0, 0, 2400, 1300)
      .layer("dimensions").color("#555")
        .dim.horizontal(0, 2400, -50, "2400")
        .dim.vertical(0, 1300, -50, "1300")
      .layer("annotations")
        .text(1200, 650, "MODULE ZONE", { size: 24, align: "center" })
        .callout(100, 100, "SHS 100x100x5")
      .titleBlock({ partNo: "SS-IEC-MLF-001", scale: "1:20", material: "SHS S275" })
      .build();

    expect(d.title).toBe("Mechanical Load Frame");
    expect(d.standard).toBe("IEC 61215 MQT 16");
    expect(d.scale).toBe(20);
    expect(d.notes).toEqual(["All dimensions in mm"]);
    expect(d.layers).toHaveLength(3);
    expect(d.layers[0].name).toBe("outline");
    expect(d.layers[1].name).toBe("dimensions");
    expect(d.layers[2].name).toBe("annotations");
    expect(d.layers[2].commands).toHaveLength(3); // text + line + text (callout)
    expect(d.titleBlock?.partNo).toBe("SS-IEC-MLF-001");
    expect(d.titleBlock?.scale).toBe("1:20");
    expect(d.titleBlock?.material).toBe("SHS S275");
  });
});
