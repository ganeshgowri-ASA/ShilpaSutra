// ═══════════════════════════════════════════════════════════════════════════════
// Drawing DSL — Declarative fluent builder for engineering drawings
// Replaces raw SVG string concatenation with a composable, type-safe API.
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Drawing, DrawingCommand, DrawingLayer, TitleBlockData,
  LineStyle, TextAlign, FontWeight, DimOrientation, HatchPattern,
} from './drawingEngine';

// ── Layer Builder ───────────────────────────────────────────────────────────

/** Fluent builder for a single drawing layer. */
export class LayerBuilder {
  private readonly _name: string;
  private _color: string = '#000000';
  private _lineWidth: number = 0.9;
  private _visible: boolean = true;
  private readonly _commands: DrawingCommand[] = [];
  private readonly _parent: DrawingBuilder;

  constructor(name: string, parent: DrawingBuilder) {
    this._name = name;
    this._parent = parent;
  }

  /** Set layer stroke color. */
  color(c: string): this { this._color = c; return this; }

  /** Set layer line width. */
  lineWidth(w: number): this { this._lineWidth = w; return this; }

  /** Set layer visibility. */
  visible(v: boolean): this { this._visible = v; return this; }

  // ── Primitive commands ──────────────────────────────────────────────────

  /** Draw a line segment. */
  line(x1: number, y1: number, x2: number, y2: number, style?: LineStyle): this {
    this._commands.push(Object.freeze({ type: 'line' as const, x1, y1, x2, y2, style }));
    return this;
  }

  /** Draw a rectangle. */
  rect(x: number, y: number, w: number, h: number, fill?: string, rx?: number): this {
    this._commands.push(Object.freeze({ type: 'rect' as const, x, y, w, h, fill, rx }));
    return this;
  }

  /** Draw a circle. */
  circle(cx: number, cy: number, r: number, fill?: string): this {
    this._commands.push(Object.freeze({ type: 'circle' as const, cx, cy, r, fill }));
    return this;
  }

  /** Draw an arc. */
  arc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): this {
    this._commands.push(Object.freeze({ type: 'arc' as const, cx, cy, r, startAngle, endAngle }));
    return this;
  }

  /** Draw text. */
  text(x: number, y: number, content: string, opts?: { size?: number; align?: TextAlign; weight?: FontWeight }): this {
    this._commands.push(Object.freeze({
      type: 'text' as const, x, y, content,
      size: opts?.size, align: opts?.align, weight: opts?.weight,
    }));
    return this;
  }

  /** Draw a hatch-filled rectangle. */
  hatch(x: number, y: number, w: number, h: number, pattern: HatchPattern = 'diagonal'): this {
    this._commands.push(Object.freeze({ type: 'hatch' as const, x, y, w, h, pattern }));
    return this;
  }

  /** Draw an arrow line. */
  arrow(x1: number, y1: number, x2: number, y2: number, headSize?: number): this {
    this._commands.push(Object.freeze({ type: 'arrow' as const, x1, y1, x2, y2, headSize }));
    return this;
  }

  // ── Dimension shorthands ──────────────────────────────────────────────

  /** Dimension sub-builder. */
  readonly dim = {
    /** Horizontal dimension between two x-positions. */
    horizontal: (a: number, b: number, offset: number, label: string, pos: number = 0): this => {
      this._commands.push(Object.freeze({
        type: 'dim' as const,
        orientation: 'horizontal' as DimOrientation,
        a, b, offset, pos, label,
      }));
      return this;
    },
    /** Vertical dimension between two y-positions. */
    vertical: (a: number, b: number, offset: number, label: string, pos: number = 0): this => {
      this._commands.push(Object.freeze({
        type: 'dim' as const,
        orientation: 'vertical' as DimOrientation,
        a, b, offset, pos, label,
      }));
      return this;
    },
  };

  // ── Composite helpers ─────────────────────────────────────────────────

  /** Draw a callout: text with a leader line. */
  callout(x: number, y: number, label: string, leaderDx: number = 30, leaderDy: number = -15): this {
    this.line(x, y, x + leaderDx, y + leaderDy);
    this.text(x + leaderDx + 2, y + leaderDy, label, { size: 5, align: 'left' });
    return this;
  }

  // ── Chain back to parent ──────────────────────────────────────────────

  /** Start a new layer, returning to the parent builder. */
  layer(name: string): LayerBuilder {
    return this._parent.layer(name);
  }

  /** Finalize and add title block, returning to parent builder. */
  titleBlock(tb: Partial<TitleBlockData>): DrawingBuilder {
    return this._parent.titleBlock(tb);
  }

  /** Build the final Drawing. */
  build(): Readonly<Drawing> {
    return this._parent.build();
  }

  /** @internal Produce the frozen DrawingLayer. */
  _buildLayer(): Readonly<DrawingLayer> {
    return Object.freeze({
      name: this._name,
      visible: this._visible,
      color: this._color,
      lineWidth: this._lineWidth,
      commands: Object.freeze([...this._commands]),
    });
  }
}

// ── Drawing Builder ─────────────────────────────────────────────────────────

/** Fluent builder for a complete Drawing. */
export class DrawingBuilder {
  private readonly _id: string;
  private readonly _title: string;
  private readonly _standard: string;
  private _scale: number = 1;
  private readonly _layers: LayerBuilder[] = [];
  private _titleBlock: Partial<TitleBlockData> | undefined;
  private readonly _notes: string[] = [];

  constructor(title: string, standard: string = '') {
    this._id = `dwg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this._title = title;
    this._standard = standard;
  }

  /** Set drawing scale factor. */
  scale(s: number): this { this._scale = s; return this; }

  /** Add a note to the drawing. */
  note(text: string): this { this._notes.push(text); return this; }

  /** Create (or return existing) layer. */
  layer(name: string): LayerBuilder {
    const existing = this._layers.find(l => l._buildLayer().name === name);
    if (existing) return existing;
    const lb = new LayerBuilder(name, this);
    this._layers.push(lb);
    return lb;
  }

  /** Set the title block data. */
  titleBlock(tb: Partial<TitleBlockData>): this {
    this._titleBlock = tb;
    return this;
  }

  /** Build the immutable Drawing object. */
  build(): Readonly<Drawing> {
    const today = new Date().toISOString().slice(0, 10);
    const tb: TitleBlockData | undefined = this._titleBlock
      ? Object.freeze({
          partNo: this._titleBlock.partNo ?? '',
          scale: this._titleBlock.scale ?? `1:${this._scale}`,
          material: this._titleBlock.material ?? '',
          standard: this._titleBlock.standard ?? this._standard,
          drawnBy: this._titleBlock.drawnBy ?? 'ShilpaSutra AI',
          date: this._titleBlock.date ?? today,
          checkedBy: this._titleBlock.checkedBy ?? '—',
          approvedBy: this._titleBlock.approvedBy ?? '—',
          sheet: this._titleBlock.sheet ?? '1 of 1',
          rev: this._titleBlock.rev ?? 'A',
          project: this._titleBlock.project ?? 'ShilpaSutra PV Lab',
        })
      : undefined;

    return Object.freeze({
      id: this._id,
      title: this._title,
      standard: this._standard,
      scale: this._scale,
      layers: Object.freeze(this._layers.map(l => l._buildLayer())),
      titleBlock: tb,
      notes: Object.freeze([...this._notes]),
    });
  }
}

// ── Public Factory ──────────────────────────────────────────────────────────

/**
 * Create a new drawing using the fluent DSL.
 * @example
 * ```ts
 * const fixture = drawing('Mechanical Load Fixture', 'IEC 61215 MQT 16')
 *   .layer('outline').color('#000').lineWidth(2)
 *     .rect(0, 0, 2400, 1300)
 *     .rect(50, 50, 2300, 1200)
 *   .layer('dimensions').color('#555')
 *     .dim.horizontal(0, 2400, -50, '2400')
 *     .dim.vertical(0, 1300, -50, '1300')
 *   .layer('annotations')
 *     .text(1200, 650, 'MODULE ZONE', { size: 24, align: 'center' })
 *     .callout(100, 100, 'SHS 100x100x5')
 *   .titleBlock({ partNo: 'SS-IEC-MLF-001', scale: '1:20', material: 'SHS S275' })
 *   .build();
 * ```
 */
export function drawing(title: string, standard: string = ''): DrawingBuilder {
  return new DrawingBuilder(title, standard);
}
