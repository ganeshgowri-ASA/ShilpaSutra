import { createA3Viewport, renderDrawingToSVG } from '../drawingEngine';
import type { Drawing, DrawingLayer, Viewport } from '../drawingEngine';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeLayer(overrides: Partial<DrawingLayer> = {}): DrawingLayer {
  return Object.freeze({
    name: 'test',
    visible: true,
    color: '#000000',
    lineWidth: 1,
    commands: [],
    ...overrides,
  });
}

function makeDrawing(overrides: Partial<Drawing> = {}): Drawing {
  return Object.freeze({
    id: 'dwg_test',
    title: 'Test Drawing',
    standard: 'ISO',
    scale: 1,
    layers: [],
    notes: [],
    ...overrides,
  });
}

const A3 = createA3Viewport();

// ── createA3Viewport ──────────────────────────────────────────────────────────

describe('createA3Viewport', () => {
  it('returns correct A3 dimensions', () => {
    expect(A3.width).toBe(841);
    expect(A3.height).toBe(594);
  });

  it('returns zero pan and unit zoom', () => {
    expect(A3.panX).toBe(0);
    expect(A3.panY).toBe(0);
    expect(A3.zoom).toBe(1);
  });

  it('returns a frozen object', () => {
    expect(Object.isFrozen(A3)).toBe(true);
  });
});

// ── renderDrawingToSVG — structure ───────────────────────────────────────────

describe('renderDrawingToSVG — structure', () => {
  it('returns a valid SVG string starting with xml declaration', () => {
    const svg = renderDrawingToSVG(makeDrawing(), A3);
    expect(svg).toContain('<?xml version="1.0"');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('embeds viewport dimensions in the svg tag', () => {
    const vp: Viewport = { width: 200, height: 100, panX: 0, panY: 0, zoom: 1 };
    const svg = renderDrawingToSVG(makeDrawing(), vp);
    expect(svg).toContain('width="200mm"');
    expect(svg).toContain('height="100mm"');
  });

  it('produces valid viewBox reflecting zoom', () => {
    const vp: Viewport = { width: 400, height: 200, panX: 0, panY: 0, zoom: 2 };
    const svg = renderDrawingToSVG(makeDrawing(), vp);
    expect(svg).toContain('viewBox="0 0 200 100"');
  });

  it('skips hidden layers', () => {
    const hidden = makeLayer({ visible: false, commands: [
      Object.freeze({ type: 'rect' as const, x: 0, y: 0, w: 10, h: 10 }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [hidden] }), A3);
    expect(svg).not.toContain('<rect');
  });

  it('renders visible layers inside <g> tags', () => {
    const layer = makeLayer({ color: '#ff0000' });
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('<g stroke="#ff0000"');
    expect(svg).toContain('</g>');
  });

  it('renders multiple visible layers', () => {
    const l1 = makeLayer({ name: 'a', color: '#111' });
    const l2 = makeLayer({ name: 'b', color: '#222' });
    const svg = renderDrawingToSVG(makeDrawing({ layers: [l1, l2] }), A3);
    expect(svg).toContain('#111');
    expect(svg).toContain('#222');
  });
});

// ── renderDrawingToSVG — line command ────────────────────────────────────────

describe('renderDrawingToSVG — line command', () => {
  it('renders a basic line with coordinates', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'line' as const, x1: 10, y1: 20, x2: 100, y2: 200 }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('x1="10" y1="20" x2="100" y2="200"');
  });

  it('applies dashed stroke-dasharray for dashed style', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'line' as const, x1: 0, y1: 0, x2: 50, y2: 50, style: 'dashed' as const }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('stroke-dasharray="4,2"');
  });

  it('applies thick stroke-width multiplier for thick style', () => {
    const layer = makeLayer({ lineWidth: 2, commands: [
      Object.freeze({ type: 'line' as const, x1: 0, y1: 0, x2: 10, y2: 10, style: 'thick' as const }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('stroke-width="4"');
  });
});

// ── renderDrawingToSVG — rect command ────────────────────────────────────────

describe('renderDrawingToSVG — rect command', () => {
  it('renders rect with position and dimensions', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'rect' as const, x: 5, y: 10, w: 200, h: 100 }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('<rect x="5" y="10" width="200" height="100"');
  });

  it('defaults fill to none when not provided', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'rect' as const, x: 0, y: 0, w: 10, h: 10 }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('fill="none"');
  });

  it('includes rx attribute when provided', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'rect' as const, x: 0, y: 0, w: 50, h: 30, fill: 'blue', rx: 5 }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('rx="5"');
  });
});

// ── renderDrawingToSVG — circle command ──────────────────────────────────────

describe('renderDrawingToSVG — circle command', () => {
  it('renders circle with cx/cy/r', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'circle' as const, cx: 100, cy: 150, r: 25 }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('cx="100" cy="150" r="25"');
  });

  it('defaults fill to none', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'circle' as const, cx: 0, cy: 0, r: 10 }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('fill="none"');
  });
});

// ── renderDrawingToSVG — arc command ─────────────────────────────────────────

describe('renderDrawingToSVG — arc command', () => {
  it('renders an arc as an SVG path element', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'arc' as const, cx: 50, cy: 50, r: 30, startAngle: 0, endAngle: 90 }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('<path d="M');
    expect(svg).toContain('A30,30');
  });

  it('sets large-arc-flag=1 for arcs >180°', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'arc' as const, cx: 0, cy: 0, r: 10, startAngle: 0, endAngle: 270 }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain(' 1 1 ');
  });

  it('sets large-arc-flag=0 for arcs ≤180°', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'arc' as const, cx: 0, cy: 0, r: 10, startAngle: 0, endAngle: 90 }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain(' 0 1 ');
  });
});

// ── renderDrawingToSVG — text command ────────────────────────────────────────

describe('renderDrawingToSVG — text command', () => {
  it('renders text content at given position', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'text' as const, x: 50, y: 30, content: 'Hello CAD' }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('Hello CAD');
    expect(svg).toContain('x="50" y="30"');
  });

  it('escapes XML special characters in content', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'text' as const, x: 0, y: 0, content: '<b>&amp;"' }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('&lt;b&gt;&amp;amp;&quot;');
  });

  it('uses text-anchor=start for left align', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'text' as const, x: 0, y: 0, content: 'hi', align: 'left' as const }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('text-anchor="start"');
  });

  it('uses text-anchor=end for right align', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'text' as const, x: 0, y: 0, content: 'hi', align: 'right' as const }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('text-anchor="end"');
  });

  it('uses text-anchor=middle by default', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'text' as const, x: 0, y: 0, content: 'hi' }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('text-anchor="middle"');
  });

  it('defaults font-size to 6 when not specified', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'text' as const, x: 0, y: 0, content: 'test' }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('font-size="6"');
  });
});

// ── renderDrawingToSVG — dim command ─────────────────────────────────────────

describe('renderDrawingToSVG — dim command', () => {
  it('renders horizontal dimension with label', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'dim' as const, orientation: 'horizontal' as const, a: 0, b: 200, offset: -10, pos: 0, label: '200mm' }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('200mm');
    expect(svg).toContain('<polygon');
  });

  it('renders vertical dimension with label', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'dim' as const, orientation: 'vertical' as const, a: 0, b: 100, offset: -10, pos: 0, label: '100mm' }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('100mm');
    expect(svg).toContain('rotate(-90');
  });
});

// ── renderDrawingToSVG — hatch command ───────────────────────────────────────

describe('renderDrawingToSVG — hatch command', () => {
  it('renders diagonal hatch pattern', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'hatch' as const, x: 0, y: 0, w: 50, h: 50, pattern: 'diagonal' as const }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('<pattern');
    expect(svg).toContain('<defs>');
  });

  it('renders cross hatch pattern', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'hatch' as const, x: 10, y: 10, w: 30, h: 30, pattern: 'cross' as const }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('<pattern');
  });

  it('renders dots hatch pattern', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'hatch' as const, x: 5, y: 5, w: 20, h: 20, pattern: 'dots' as const }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('<circle');
  });
});

// ── renderDrawingToSVG — arrow command ───────────────────────────────────────

describe('renderDrawingToSVG — arrow command', () => {
  it('renders an arrow with a line and polygon head', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'arrow' as const, x1: 0, y1: 0, x2: 100, y2: 0 }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    expect(svg).toContain('<line');
    expect(svg).toContain('<polygon');
  });

  it('returns empty string for zero-length arrow', () => {
    const layer = makeLayer({ commands: [
      Object.freeze({ type: 'arrow' as const, x1: 5, y1: 5, x2: 5, y2: 5 }),
    ]});
    const svg = renderDrawingToSVG(makeDrawing({ layers: [layer] }), A3);
    // zero-length arrow produces no geometry
    expect(svg).not.toContain('<polygon');
  });
});

// ── renderDrawingToSVG — title block ─────────────────────────────────────────

describe('renderDrawingToSVG — title block', () => {
  it('includes title block fields when titleBlock is provided', () => {
    const drawing = makeDrawing({
      titleBlock: {
        partNo: 'SS-001', scale: '1:10', material: 'Steel',
        standard: 'ISO 9001', drawnBy: 'Alice', date: '2026-05-28',
        checkedBy: 'Bob', approvedBy: 'Carol', sheet: '1 of 1', rev: 'B', project: 'ShilpaSutra',
      },
    });
    const svg = renderDrawingToSVG(drawing, A3);
    expect(svg).toContain('SS-001');
    expect(svg).toContain('1:10');
    expect(svg).toContain('Steel');
    expect(svg).toContain('Alice');
  });

  it('does not include title block section when titleBlock is absent', () => {
    const svg = renderDrawingToSVG(makeDrawing(), A3);
    expect(svg).not.toContain('DRAWN BY');
  });

  it('renders notes inside the title block', () => {
    const drawing = makeDrawing({
      notes: ['All dimensions in mm', 'Surface finish Ra 1.6'],
      titleBlock: {
        partNo: '', scale: '', material: '', standard: '',
        drawnBy: '', date: '', checkedBy: '', approvedBy: '',
        sheet: '', rev: '', project: '',
      },
    });
    const svg = renderDrawingToSVG(drawing, A3);
    expect(svg).toContain('All dimensions in mm');
    expect(svg).toContain('Surface finish Ra 1.6');
  });

  it('escapes XML special chars in title block fields', () => {
    const drawing = makeDrawing({
      titleBlock: {
        partNo: 'A&B', scale: '1:1', material: '', standard: '',
        drawnBy: '', date: '', checkedBy: '', approvedBy: '',
        sheet: '', rev: '', project: '',
      },
    });
    const svg = renderDrawingToSVG(drawing, A3);
    expect(svg).toContain('A&amp;B');
    expect(svg).not.toContain('A&B');
  });
});
