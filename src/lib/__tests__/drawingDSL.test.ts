import { drawing, DrawingBuilder, LayerBuilder } from '../drawingDSL';

// ── LayerBuilder ─────────────────────────────────────────────────────────────

describe('LayerBuilder', () => {
  describe('defaults', () => {
    it('has default color #000000', () => {
      const layer = new DrawingBuilder('T').layer('body');
      expect(layer._buildLayer().color).toBe('#000000');
    });

    it('has default lineWidth 0.9', () => {
      const layer = new DrawingBuilder('T').layer('body');
      expect(layer._buildLayer().lineWidth).toBe(0.9);
    });

    it('is visible by default', () => {
      const layer = new DrawingBuilder('T').layer('body');
      expect(layer._buildLayer().visible).toBe(true);
    });

    it('starts with no commands', () => {
      const layer = new DrawingBuilder('T').layer('body');
      expect(layer._buildLayer().commands).toHaveLength(0);
    });
  });

  describe('setters', () => {
    it('color() sets stroke color', () => {
      const layer = new DrawingBuilder('T').layer('body').color('#ff0000');
      expect(layer._buildLayer().color).toBe('#ff0000');
    });

    it('lineWidth() sets line width', () => {
      const layer = new DrawingBuilder('T').layer('body').lineWidth(2.5);
      expect(layer._buildLayer().lineWidth).toBe(2.5);
    });

    it('visible(false) hides the layer', () => {
      const layer = new DrawingBuilder('T').layer('body').visible(false);
      expect(layer._buildLayer().visible).toBe(false);
    });
  });

  describe('primitive commands', () => {
    it('line() adds a line command', () => {
      const layer = new DrawingBuilder('T').layer('body').line(0, 0, 100, 100);
      expect(layer._buildLayer().commands[0]).toMatchObject({
        type: 'line', x1: 0, y1: 0, x2: 100, y2: 100,
      });
    });

    it('line() passes optional style', () => {
      const layer = new DrawingBuilder('T').layer('body').line(0, 0, 10, 10, 'dashed');
      expect(layer._buildLayer().commands[0]).toMatchObject({ type: 'line', style: 'dashed' });
    });

    it('rect() adds a rect command', () => {
      const layer = new DrawingBuilder('T').layer('body').rect(5, 10, 200, 100);
      expect(layer._buildLayer().commands[0]).toMatchObject({
        type: 'rect', x: 5, y: 10, w: 200, h: 100,
      });
    });

    it('rect() passes fill and rx', () => {
      const layer = new DrawingBuilder('T').layer('body').rect(0, 0, 50, 50, 'blue', 8);
      expect(layer._buildLayer().commands[0]).toMatchObject({ fill: 'blue', rx: 8 });
    });

    it('circle() adds a circle command', () => {
      const layer = new DrawingBuilder('T').layer('body').circle(50, 50, 25);
      expect(layer._buildLayer().commands[0]).toMatchObject({
        type: 'circle', cx: 50, cy: 50, r: 25,
      });
    });

    it('circle() passes optional fill', () => {
      const layer = new DrawingBuilder('T').layer('body').circle(0, 0, 10, '#ccc');
      expect(layer._buildLayer().commands[0]).toMatchObject({ fill: '#ccc' });
    });

    it('arc() adds an arc command', () => {
      const layer = new DrawingBuilder('T').layer('body').arc(0, 0, 30, 0, 90);
      expect(layer._buildLayer().commands[0]).toMatchObject({
        type: 'arc', cx: 0, cy: 0, r: 30, startAngle: 0, endAngle: 90,
      });
    });

    it('text() adds a text command', () => {
      const layer = new DrawingBuilder('T').layer('body').text(10, 20, 'Hello');
      expect(layer._buildLayer().commands[0]).toMatchObject({
        type: 'text', x: 10, y: 20, content: 'Hello',
      });
    });

    it('text() forwards size, align, weight options', () => {
      const layer = new DrawingBuilder('T').layer('body')
        .text(0, 0, 'X', { size: 12, align: 'center', weight: 'bold' });
      expect(layer._buildLayer().commands[0]).toMatchObject({
        size: 12, align: 'center', weight: 'bold',
      });
    });

    it('hatch() adds a hatch command with default diagonal pattern', () => {
      const layer = new DrawingBuilder('T').layer('body').hatch(0, 0, 50, 50);
      expect(layer._buildLayer().commands[0]).toMatchObject({
        type: 'hatch', x: 0, y: 0, w: 50, h: 50, pattern: 'diagonal',
      });
    });

    it('hatch() passes explicit pattern', () => {
      const layer = new DrawingBuilder('T').layer('body').hatch(0, 0, 50, 50, 'cross');
      expect(layer._buildLayer().commands[0]).toMatchObject({ pattern: 'cross' });
    });

    it('arrow() adds an arrow command', () => {
      const layer = new DrawingBuilder('T').layer('body').arrow(0, 0, 40, 40, 6);
      expect(layer._buildLayer().commands[0]).toMatchObject({
        type: 'arrow', x1: 0, y1: 0, x2: 40, y2: 40, headSize: 6,
      });
    });
  });

  describe('dim sub-builder', () => {
    it('dim.horizontal() adds a horizontal dim command', () => {
      const layer = new DrawingBuilder('T').layer('body');
      layer.dim.horizontal(0, 100, -20, '100mm', 50);
      expect(layer._buildLayer().commands[0]).toMatchObject({
        type: 'dim', orientation: 'horizontal', a: 0, b: 100, offset: -20, label: '100mm', pos: 50,
      });
    });

    it('dim.horizontal() defaults pos to 0', () => {
      const layer = new DrawingBuilder('T').layer('body');
      layer.dim.horizontal(10, 50, -10, 'W');
      expect(layer._buildLayer().commands[0]).toMatchObject({ pos: 0 });
    });

    it('dim.vertical() adds a vertical dim command', () => {
      const layer = new DrawingBuilder('T').layer('body');
      layer.dim.vertical(0, 80, -15, '80mm');
      expect(layer._buildLayer().commands[0]).toMatchObject({
        type: 'dim', orientation: 'vertical', a: 0, b: 80, offset: -15, label: '80mm', pos: 0,
      });
    });
  });

  describe('callout()', () => {
    it('adds exactly two commands: line then text', () => {
      const layer = new DrawingBuilder('T').layer('body').callout(100, 100, 'Note A');
      const cmds = layer._buildLayer().commands;
      expect(cmds).toHaveLength(2);
      expect(cmds[0].type).toBe('line');
      expect(cmds[1].type).toBe('text');
    });

    it('leader line ends at leaderDx/leaderDy offset', () => {
      const layer = new DrawingBuilder('T').layer('body').callout(100, 200, 'X', 40, -20);
      const line = layer._buildLayer().commands[0] as { x2: number; y2: number };
      expect(line.x2).toBe(140);
      expect(line.y2).toBe(180);
    });

    it('text label matches the callout label', () => {
      const layer = new DrawingBuilder('T').layer('body').callout(0, 0, 'SHS 100x5');
      const textCmd = layer._buildLayer().commands[1] as { content: string };
      expect(textCmd.content).toBe('SHS 100x5');
    });
  });

  describe('method chaining', () => {
    it('all primitive methods return the same LayerBuilder instance', () => {
      const db = new DrawingBuilder('T');
      const layer = db.layer('body');
      expect(layer.line(0, 0, 1, 1)).toBe(layer);
      expect(layer.rect(0, 0, 1, 1)).toBe(layer);
      expect(layer.circle(0, 0, 1)).toBe(layer);
      expect(layer.arc(0, 0, 1, 0, 90)).toBe(layer);
      expect(layer.text(0, 0, '')).toBe(layer);
      expect(layer.hatch(0, 0, 1, 1)).toBe(layer);
      expect(layer.arrow(0, 0, 1, 1)).toBe(layer);
    });

    it('commands accumulate in insertion order', () => {
      const layer = new DrawingBuilder('T').layer('body')
        .line(0, 0, 10, 10)
        .circle(5, 5, 3)
        .text(0, 0, 'Label');
      const types = layer._buildLayer().commands.map(c => c.type);
      expect(types).toEqual(['line', 'circle', 'text']);
    });
  });

  describe('immutability', () => {
    it('_buildLayer() returns a frozen object', () => {
      const layer = new DrawingBuilder('T').layer('body').line(0, 0, 1, 1);
      expect(Object.isFrozen(layer._buildLayer())).toBe(true);
    });

    it('commands array is frozen', () => {
      const layer = new DrawingBuilder('T').layer('body').line(0, 0, 1, 1);
      expect(Object.isFrozen(layer._buildLayer().commands)).toBe(true);
    });

    it('each individual command is frozen', () => {
      const layer = new DrawingBuilder('T').layer('body').line(0, 0, 1, 1);
      expect(Object.isFrozen(layer._buildLayer().commands[0])).toBe(true);
    });
  });
});

// ── DrawingBuilder ────────────────────────────────────────────────────────────

describe('DrawingBuilder', () => {
  describe('constructor', () => {
    it('stores the title', () => {
      expect(new DrawingBuilder('My Part', 'ISO 2768').build().title).toBe('My Part');
    });

    it('stores the standard', () => {
      expect(new DrawingBuilder('Test', 'ISO 2768').build().standard).toBe('ISO 2768');
    });

    it('default standard is empty string', () => {
      expect(new DrawingBuilder('Test').build().standard).toBe('');
    });

    it('generates a unique id per instance', () => {
      const id1 = new DrawingBuilder('A').build().id;
      const id2 = new DrawingBuilder('B').build().id;
      expect(id1).not.toBe(id2);
    });

    it('id starts with "dwg_"', () => {
      expect(new DrawingBuilder('A').build().id).toMatch(/^dwg_/);
    });
  });

  describe('scale()', () => {
    it('default scale is 1', () => {
      expect(new DrawingBuilder('Test').build().scale).toBe(1);
    });

    it('scale() sets the scale factor', () => {
      expect(new DrawingBuilder('Test').scale(20).build().scale).toBe(20);
    });
  });

  describe('note()', () => {
    it('adds a single note', () => {
      const built = new DrawingBuilder('Test').note('Remove burrs').build();
      expect(built.notes).toContain('Remove burrs');
    });

    it('accumulates multiple notes in insertion order', () => {
      const built = new DrawingBuilder('Test')
        .note('Note 1').note('Note 2').note('Note 3').build();
      expect(built.notes).toEqual(['Note 1', 'Note 2', 'Note 3']);
    });
  });

  describe('layer()', () => {
    it('creates a LayerBuilder', () => {
      expect(new DrawingBuilder('T').layer('outline')).toBeInstanceOf(LayerBuilder);
    });

    it('returns the same instance for the same layer name', () => {
      const db = new DrawingBuilder('T');
      expect(db.layer('outline')).toBe(db.layer('outline'));
    });

    it('different names produce different instances', () => {
      const db = new DrawingBuilder('T');
      expect(db.layer('A')).not.toBe(db.layer('B'));
    });

    it('built Drawing includes all created layers by name', () => {
      const built = new DrawingBuilder('T')
        .layer('outline').line(0, 0, 1, 1)
        .layer('dims').line(0, 0, 2, 2)
        .build();
      const names = built.layers.map(l => l.name);
      expect(names).toContain('outline');
      expect(names).toContain('dims');
    });

    it('layers appear in the order they were first created', () => {
      const built = new DrawingBuilder('T')
        .layer('A').layer('B').layer('C').build();
      expect(built.layers.map(l => l.name)).toEqual(['A', 'B', 'C']);
    });
  });

  describe('titleBlock()', () => {
    it('is undefined when not set', () => {
      expect(new DrawingBuilder('Test').build().titleBlock).toBeUndefined();
    });

    it('is defined when set', () => {
      const built = new DrawingBuilder('Test').titleBlock({ partNo: 'P-001' }).build();
      expect(built.titleBlock).toBeDefined();
      expect(built.titleBlock!.partNo).toBe('P-001');
    });

    it('defaults drawnBy to "ShilpaSutra AI"', () => {
      expect(new DrawingBuilder('T').titleBlock({}).build().titleBlock!.drawnBy)
        .toBe('ShilpaSutra AI');
    });

    it('defaults date to today (YYYY-MM-DD)', () => {
      const today = new Date().toISOString().slice(0, 10);
      expect(new DrawingBuilder('T').titleBlock({}).build().titleBlock!.date).toBe(today);
    });

    it('respects an explicitly provided date', () => {
      const built = new DrawingBuilder('T').titleBlock({ date: '2026-01-01' }).build();
      expect(built.titleBlock!.date).toBe('2026-01-01');
    });

    it('scale in titleBlock defaults to 1:<drawing scale>', () => {
      const built = new DrawingBuilder('T').scale(50).titleBlock({}).build();
      expect(built.titleBlock!.scale).toBe('1:50');
    });

    it('standard in titleBlock defaults to drawing standard', () => {
      const built = new DrawingBuilder('T', 'IEC 61215').titleBlock({}).build();
      expect(built.titleBlock!.standard).toBe('IEC 61215');
    });

    it('rev defaults to "A"', () => {
      expect(new DrawingBuilder('T').titleBlock({}).build().titleBlock!.rev).toBe('A');
    });

    it('sheet defaults to "1 of 1"', () => {
      expect(new DrawingBuilder('T').titleBlock({}).build().titleBlock!.sheet).toBe('1 of 1');
    });

    it('titleBlock object is frozen', () => {
      const built = new DrawingBuilder('T').titleBlock({}).build();
      expect(Object.isFrozen(built.titleBlock)).toBe(true);
    });
  });

  describe('build() immutability', () => {
    it('returned Drawing is frozen', () => {
      expect(Object.isFrozen(new DrawingBuilder('T').build())).toBe(true);
    });

    it('layers array is frozen', () => {
      const built = new DrawingBuilder('T').layer('outline').build();
      expect(Object.isFrozen(built.layers)).toBe(true);
    });

    it('notes array is frozen', () => {
      const built = new DrawingBuilder('T').note('A').build();
      expect(Object.isFrozen(built.notes)).toBe(true);
    });

    it('successive build() calls return distinct objects', () => {
      const db = new DrawingBuilder('T');
      expect(db.build()).not.toBe(db.build());
    });
  });
});

// ── drawing() factory ─────────────────────────────────────────────────────────

describe('drawing() factory', () => {
  it('returns a DrawingBuilder', () => {
    expect(drawing('Test')).toBeInstanceOf(DrawingBuilder);
  });

  it('sets title and standard on the builder', () => {
    const built = drawing('Shaft Assy', 'ISO 2768-mK').build();
    expect(built.title).toBe('Shaft Assy');
    expect(built.standard).toBe('ISO 2768-mK');
  });

  it('default standard is empty string', () => {
    expect(drawing('Test').build().standard).toBe('');
  });

  it('layer() cross-navigation from LayerBuilder delegates to parent', () => {
    const db = drawing('Test');
    const layerA = db.layer('A');
    const layerB = layerA.layer('B');
    expect(layerB).toBeInstanceOf(LayerBuilder);
    expect(layerB._buildLayer().name).toBe('B');
    expect(layerA).not.toBe(layerB);
  });

  it('build() called from LayerBuilder delegates to parent DrawingBuilder', () => {
    const result = drawing('Test').layer('body').line(0, 0, 1, 1).build();
    expect(result.title).toBe('Test');
    expect(result.layers).toHaveLength(1);
  });

  it('titleBlock() called from LayerBuilder delegates to parent then builds', () => {
    const result = drawing('Test')
      .layer('body')
      .rect(0, 0, 100, 50)
      .titleBlock({ partNo: 'SS-999' })
      .build();
    expect(result.titleBlock!.partNo).toBe('SS-999');
    expect(result.layers[0].commands[0]).toMatchObject({ type: 'rect' });
  });

  it('full fluent chain produces correct Drawing structure', () => {
    const result = drawing('Mechanical Load Fixture', 'IEC 61215 MQT 16')
      .scale(20)
      .note('ALL DIMS IN MM')
      .layer('outline').color('#000').lineWidth(2)
        .rect(0, 0, 2400, 1300)
      .layer('dims').color('#555')
        .dim.horizontal(0, 2400, -50, '2400')
      .layer('notes')
        .text(1200, 650, 'MODULE ZONE', { size: 24, align: 'center' })
        .callout(100, 100, 'SHS 100×100×5')
      .titleBlock({ partNo: 'SS-IEC-MLF-001', scale: '1:20', material: 'SHS S275' })
      .build();

    expect(result.title).toBe('Mechanical Load Fixture');
    expect(result.standard).toBe('IEC 61215 MQT 16');
    expect(result.scale).toBe(20);
    expect(result.notes).toEqual(['ALL DIMS IN MM']);
    expect(result.layers).toHaveLength(3);
    expect(result.layers[0].name).toBe('outline');
    expect(result.layers[1].name).toBe('dims');
    expect(result.layers[2].name).toBe('notes');
    expect(result.layers[0].commands[0]).toMatchObject({ type: 'rect', w: 2400, h: 1300 });
    expect(result.layers[1].commands[0]).toMatchObject({
      type: 'dim', orientation: 'horizontal', label: '2400',
    });
    // notes layer: 1 text + callout (line + text) = 3 commands
    expect(result.layers[2].commands).toHaveLength(3);
    expect(result.titleBlock!.partNo).toBe('SS-IEC-MLF-001');
    expect(result.titleBlock!.material).toBe('SHS S275');
  });
});
