// ═══════════════════════════════════════════════════════════════════════════════
// Unified Drawing Engine — Pure functions for rendering 2D engineering drawings
// Supports: IEC templates, CAD views, CFD plots, FEM meshes
// ═══════════════════════════════════════════════════════════════════════════════

// ── Core Drawing Types ──────────────────────────────────────────────────────

/** Primitive drawing command — every visual element reduces to one of these. */
export type DrawingCommand =
  | Readonly<{ type: 'line'; x1: number; y1: number; x2: number; y2: number; style?: LineStyle }>
  | Readonly<{ type: 'rect'; x: number; y: number; w: number; h: number; fill?: string; rx?: number }>
  | Readonly<{ type: 'circle'; cx: number; cy: number; r: number; fill?: string }>
  | Readonly<{ type: 'arc'; cx: number; cy: number; r: number; startAngle: number; endAngle: number }>
  | Readonly<{ type: 'text'; x: number; y: number; content: string; size?: number; align?: TextAlign; weight?: FontWeight }>
  | Readonly<{ type: 'dim'; orientation: DimOrientation; a: number; b: number; offset: number; pos: number; label: string }>
  | Readonly<{ type: 'hatch'; x: number; y: number; w: number; h: number; pattern: HatchPattern }>
  | Readonly<{ type: 'arrow'; x1: number; y1: number; x2: number; y2: number; headSize?: number }>;

export type LineStyle = 'solid' | 'dashed' | 'hidden' | 'center' | 'thick';
export type TextAlign = 'left' | 'center' | 'right';
export type FontWeight = 'normal' | 'bold';
export type DimOrientation = 'horizontal' | 'vertical';
export type HatchPattern = 'cross' | 'diagonal' | 'dots';

/** A named layer containing drawing commands. */
export interface DrawingLayer {
  readonly name: string;
  readonly visible: boolean;
  readonly color: string;
  readonly lineWidth: number;
  readonly commands: ReadonlyArray<DrawingCommand>;
}

/** A complete drawing with metadata, layers, and optional title block. */
export interface Drawing {
  readonly id: string;
  readonly title: string;
  readonly standard: string;
  readonly scale: number;
  readonly layers: ReadonlyArray<DrawingLayer>;
  readonly titleBlock?: Readonly<TitleBlockData>;
  readonly notes: ReadonlyArray<string>;
}

/** Title block metadata for engineering drawings. */
export interface TitleBlockData {
  readonly partNo: string;
  readonly scale: string;
  readonly material: string;
  readonly standard: string;
  readonly drawnBy: string;
  readonly date: string;
  readonly checkedBy: string;
  readonly approvedBy: string;
  readonly sheet: string;
  readonly rev: string;
  readonly project: string;
}

/** Viewport configuration for rendering. */
export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly panX: number;
  readonly panY: number;
  readonly zoom: number;
}

// ── Default Viewport ────────────────────────────────────────────────────────

/** A3 landscape viewport (841×594 SVG units ≈ mm). */
export function createA3Viewport(): Viewport {
  return Object.freeze({ width: 841, height: 594, panX: 0, panY: 0, zoom: 1 });
}

// ── SVG Renderer (Pure) ─────────────────────────────────────────────────────

/**
 * Render a Drawing to an SVG string.
 * Pure function — no side effects, fully deterministic.
 */
export function renderDrawingToSVG(drawing: Readonly<Drawing>, viewport: Readonly<Viewport>): string {
  const { width: W, height: H, panX, panY, zoom } = viewport;
  const parts: string[] = [];

  parts.push(
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm"`,
    `  viewBox="${-panX / zoom} ${-panY / zoom} ${W / zoom} ${H / zoom}"`,
    `  style="background:white" font-family="Arial,sans-serif">`,
  );

  for (const layer of drawing.layers) {
    if (!layer.visible) continue;
    parts.push(`<g stroke="${layer.color}" stroke-width="${layer.lineWidth}" fill="none">`);
    for (const cmd of layer.commands) {
      parts.push(renderCommandToSVG(cmd, layer));
    }
    parts.push(`</g>`);
  }

  if (drawing.titleBlock) {
    parts.push(renderTitleBlockSVG(drawing.titleBlock, drawing.notes, W, H));
  }

  parts.push(`</svg>`);
  return parts.join('\n');
}

/** Render a single DrawingCommand to an SVG fragment. */
function renderCommandToSVG(cmd: DrawingCommand, layer: Readonly<DrawingLayer>): string {
  switch (cmd.type) {
    case 'line':
      return `<line x1="${cmd.x1}" y1="${cmd.y1}" x2="${cmd.x2}" y2="${cmd.y2}"${lineStyleAttr(cmd.style, layer.lineWidth)}/>`;

    case 'rect':
      return `<rect x="${cmd.x}" y="${cmd.y}" width="${cmd.w}" height="${cmd.h}" fill="${cmd.fill ?? 'none'}"${cmd.rx ? ` rx="${cmd.rx}"` : ''}/>`;

    case 'circle':
      return `<circle cx="${cmd.cx}" cy="${cmd.cy}" r="${cmd.r}" fill="${cmd.fill ?? 'none'}"/>`;

    case 'arc': {
      const sa = cmd.startAngle * Math.PI / 180;
      const ea = cmd.endAngle * Math.PI / 180;
      const x1 = cmd.cx + cmd.r * Math.cos(sa);
      const y1 = cmd.cy + cmd.r * Math.sin(sa);
      const x2 = cmd.cx + cmd.r * Math.cos(ea);
      const y2 = cmd.cy + cmd.r * Math.sin(ea);
      const large = Math.abs(cmd.endAngle - cmd.startAngle) > 180 ? 1 : 0;
      return `<path d="M${x1},${y1} A${cmd.r},${cmd.r} 0 ${large} 1 ${x2},${y2}"/>`;
    }

    case 'text':
      return `<text x="${cmd.x}" y="${cmd.y}" font-size="${cmd.size ?? 6}" text-anchor="${textAnchorMap(cmd.align)}" fill="${layer.color}" stroke="none" font-weight="${cmd.weight ?? 'normal'}" dominant-baseline="middle">${escapeXml(cmd.content)}</text>`;

    case 'dim':
      return renderDimSVG(cmd, layer.color);

    case 'hatch':
      return renderHatchSVG(cmd, layer.color);

    case 'arrow':
      return renderArrowSVG(cmd, layer.color, cmd.headSize ?? 4);
  }
}

/** Render a dimension annotation (horizontal or vertical). */
function renderDimSVG(
  cmd: Extract<DrawingCommand, { type: 'dim' }>,
  color: string
): string {
  if (cmd.orientation === 'horizontal') {
    const y = cmd.offset;
    const mx = (cmd.a + cmd.b) / 2;
    return [
      `<line x1="${cmd.a}" y1="${cmd.pos}" x2="${cmd.a}" y2="${y + 2}" stroke="${color}" stroke-width="0.4"/>`,
      `<line x1="${cmd.b}" y1="${cmd.pos}" x2="${cmd.b}" y2="${y + 2}" stroke="${color}" stroke-width="0.4"/>`,
      `<line x1="${cmd.a}" y1="${y}" x2="${cmd.b}" y2="${y}" stroke="${color}" stroke-width="0.5"/>`,
      `<polygon points="${cmd.a},${y} ${cmd.a + 4},${y - 2} ${cmd.a + 4},${y + 2}" fill="${color}"/>`,
      `<polygon points="${cmd.b},${y} ${cmd.b - 4},${y - 2} ${cmd.b - 4},${y + 2}" fill="${color}"/>`,
      `<text x="${mx}" y="${y - 3}" font-size="6" text-anchor="middle" fill="${color}" stroke="none">${escapeXml(cmd.label)}</text>`,
    ].join('\n');
  }

  // vertical
  const x = cmd.offset;
  const my = (cmd.a + cmd.b) / 2;
  return [
    `<line x1="${cmd.pos}" y1="${cmd.a}" x2="${x + 2}" y2="${cmd.a}" stroke="${color}" stroke-width="0.4"/>`,
    `<line x1="${cmd.pos}" y1="${cmd.b}" x2="${x + 2}" y2="${cmd.b}" stroke="${color}" stroke-width="0.4"/>`,
    `<line x1="${x}" y1="${cmd.a}" x2="${x}" y2="${cmd.b}" stroke="${color}" stroke-width="0.5"/>`,
    `<polygon points="${x},${cmd.b} ${x - 2},${cmd.b - 4} ${x + 2},${cmd.b - 4}" fill="${color}"/>`,
    `<polygon points="${x},${cmd.a} ${x - 2},${cmd.a + 4} ${x + 2},${cmd.a + 4}" fill="${color}"/>`,
    `<text x="${x - 3}" y="${my}" font-size="6" text-anchor="middle" fill="${color}" stroke="none" transform="rotate(-90,${x - 3},${my})">${escapeXml(cmd.label)}</text>`,
  ].join('\n');
}

/** Render a hatch pattern fill. */
function renderHatchSVG(
  cmd: Extract<DrawingCommand, { type: 'hatch' }>,
  color: string
): string {
  const id = `hatch-${cmd.x}-${cmd.y}`;
  const spacing = 4;
  let patternContent: string;

  switch (cmd.pattern) {
    case 'diagonal':
      patternContent = `<line x1="0" y1="${spacing}" x2="${spacing}" y2="0" stroke="${color}" stroke-width="0.3"/>`;
      break;
    case 'cross':
      patternContent = `<line x1="0" y1="${spacing / 2}" x2="${spacing}" y2="${spacing / 2}" stroke="${color}" stroke-width="0.2"/><line x1="${spacing / 2}" y1="0" x2="${spacing / 2}" y2="${spacing}" stroke="${color}" stroke-width="0.2"/>`;
      break;
    case 'dots':
      patternContent = `<circle cx="${spacing / 2}" cy="${spacing / 2}" r="0.5" fill="${color}"/>`;
      break;
  }

  return [
    `<defs><pattern id="${id}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">${patternContent}</pattern></defs>`,
    `<rect x="${cmd.x}" y="${cmd.y}" width="${cmd.w}" height="${cmd.h}" fill="url(#${id})" stroke="none"/>`,
  ].join('\n');
}

/** Render an arrow line with arrowhead. */
function renderArrowSVG(
  cmd: Extract<DrawingCommand, { type: 'arrow' }>,
  color: string,
  headSize: number
): string {
  const dx = cmd.x2 - cmd.x1;
  const dy = cmd.y2 - cmd.y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return '';
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const bx = cmd.x2 - ux * headSize, by = cmd.y2 - uy * headSize;

  return [
    `<line x1="${cmd.x1}" y1="${cmd.y1}" x2="${cmd.x2}" y2="${cmd.y2}" stroke="${color}" stroke-width="0.7"/>`,
    `<polygon points="${cmd.x2},${cmd.y2} ${bx + px * headSize * 0.4},${by + py * headSize * 0.4} ${bx - px * headSize * 0.4},${by - py * headSize * 0.4}" fill="${color}"/>`,
  ].join('\n');
}

// ── Canvas Renderer ─────────────────────────────────────────────────────────

/**
 * Render a Drawing onto an HTML Canvas.
 * Applies viewport pan/zoom. Mutates only the canvas context.
 */
export function renderDrawingToCanvas(
  drawing: Readonly<Drawing>,
  canvas: HTMLCanvasElement,
  viewport: Readonly<Viewport>
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width: W, height: H, panX, panY, zoom } = viewport;
  canvas.width = W * 2;
  canvas.height = H * 2;
  ctx.scale(2, 2); // retina

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  for (const layer of drawing.layers) {
    if (!layer.visible) continue;
    ctx.strokeStyle = layer.color;
    ctx.lineWidth = layer.lineWidth;

    for (const cmd of layer.commands) {
      renderCommandToCanvas(ctx, cmd, layer);
    }
  }

  ctx.restore();
}

/** Render a single DrawingCommand onto a canvas 2D context. */
function renderCommandToCanvas(
  ctx: CanvasRenderingContext2D,
  cmd: DrawingCommand,
  layer: Readonly<DrawingLayer>
): void {
  switch (cmd.type) {
    case 'line':
      ctx.beginPath();
      applyLineStyle(ctx, cmd.style, layer.lineWidth);
      ctx.moveTo(cmd.x1, cmd.y1);
      ctx.lineTo(cmd.x2, cmd.y2);
      ctx.stroke();
      ctx.setLineDash([]);
      break;

    case 'rect':
      if (cmd.fill && cmd.fill !== 'none') {
        ctx.fillStyle = cmd.fill;
        ctx.fillRect(cmd.x, cmd.y, cmd.w, cmd.h);
      }
      ctx.strokeRect(cmd.x, cmd.y, cmd.w, cmd.h);
      break;

    case 'circle':
      ctx.beginPath();
      ctx.arc(cmd.cx, cmd.cy, cmd.r, 0, Math.PI * 2);
      if (cmd.fill && cmd.fill !== 'none') {
        ctx.fillStyle = cmd.fill;
        ctx.fill();
      }
      ctx.stroke();
      break;

    case 'arc': {
      const sa = cmd.startAngle * Math.PI / 180;
      const ea = cmd.endAngle * Math.PI / 180;
      ctx.beginPath();
      ctx.arc(cmd.cx, cmd.cy, cmd.r, sa, ea);
      ctx.stroke();
      break;
    }

    case 'text':
      ctx.fillStyle = layer.color;
      ctx.font = `${cmd.weight === 'bold' ? 'bold ' : ''}${cmd.size ?? 6}px Arial`;
      ctx.textAlign = cmd.align ?? 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cmd.content, cmd.x, cmd.y);
      break;

    case 'dim':
      renderDimCanvas(ctx, cmd, layer.color);
      break;

    case 'arrow': {
      const hs = cmd.headSize ?? 4;
      ctx.beginPath();
      ctx.moveTo(cmd.x1, cmd.y1);
      ctx.lineTo(cmd.x2, cmd.y2);
      ctx.stroke();
      // arrowhead
      const dx = cmd.x2 - cmd.x1, dy = cmd.y2 - cmd.y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const ux = dx / len, uy = dy / len;
        const px = -uy, py = ux;
        const bx = cmd.x2 - ux * hs, by = cmd.y2 - uy * hs;
        ctx.fillStyle = layer.color;
        ctx.beginPath();
        ctx.moveTo(cmd.x2, cmd.y2);
        ctx.lineTo(bx + px * hs * 0.4, by + py * hs * 0.4);
        ctx.lineTo(bx - px * hs * 0.4, by - py * hs * 0.4);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'hatch':
      // simplified canvas hatch: diagonal lines
      ctx.save();
      ctx.beginPath();
      ctx.rect(cmd.x, cmd.y, cmd.w, cmd.h);
      ctx.clip();
      ctx.lineWidth = 0.3;
      for (let i = -cmd.h; i < cmd.w + cmd.h; i += 4) {
        ctx.moveTo(cmd.x + i, cmd.y);
        ctx.lineTo(cmd.x + i + cmd.h, cmd.y + cmd.h);
      }
      ctx.stroke();
      ctx.restore();
      break;
  }
}

/** Render dimension on canvas. */
function renderDimCanvas(
  ctx: CanvasRenderingContext2D,
  cmd: Extract<DrawingCommand, { type: 'dim' }>,
  color: string
): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 0.5;
  ctx.font = '6px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (cmd.orientation === 'horizontal') {
    const y = cmd.offset;
    ctx.beginPath();
    ctx.moveTo(cmd.a, cmd.pos); ctx.lineTo(cmd.a, y + 2);
    ctx.moveTo(cmd.b, cmd.pos); ctx.lineTo(cmd.b, y + 2);
    ctx.moveTo(cmd.a, y); ctx.lineTo(cmd.b, y);
    ctx.stroke();
    ctx.fillText(cmd.label, (cmd.a + cmd.b) / 2, y - 4);
  } else {
    const x = cmd.offset;
    ctx.beginPath();
    ctx.moveTo(cmd.pos, cmd.a); ctx.lineTo(x + 2, cmd.a);
    ctx.moveTo(cmd.pos, cmd.b); ctx.lineTo(x + 2, cmd.b);
    ctx.moveTo(x, cmd.a); ctx.lineTo(x, cmd.b);
    ctx.stroke();
    ctx.save();
    ctx.translate(x - 4, (cmd.a + cmd.b) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(cmd.label, 0, 0);
    ctx.restore();
  }
}

// ── Title Block SVG ─────────────────────────────────────────────────────────

/** Render title block and notes as SVG. */
function renderTitleBlockSVG(
  tb: Readonly<TitleBlockData>,
  notes: ReadonlyArray<string>,
  sheetW: number,
  sheetH: number
): string {
  const MARGIN = 8, FRAME = 18;
  const TB_H = 110;
  const x = MARGIN + FRAME;
  const y = sheetH - MARGIN - TB_H;
  const w = sheetW - 2 * (MARGIN + FRAME);
  const C = '#1e3a5f';
  const lw = 0.6;

  const cell = (label: string, value: string, bx: number, by: number, bw: number): string =>
    `<g><rect x="${bx}" y="${by}" width="${bw}" height="28" fill="#f0f6ff" stroke="${C}" stroke-width="${lw}"/><text x="${bx + 3}" y="${by + 9}" font-size="6" fill="${C}">${escapeXml(label)}</text><text x="${bx + 3}" y="${by + 22}" font-size="8" fill="${C}" font-weight="bold">${escapeXml(value)}</text></g>`;

  const rows = [
    cell('EQUIPMENT NAME', tb.standard ? `${tb.standard}` : '—', x, y, 280),
    cell('STANDARD', tb.standard, x + 280, y, 160),
    cell('PART NO.', tb.partNo, x + 440, y, 120),
    cell('MATERIAL', tb.material, x + 560, y, 140),
    cell('SCALE', tb.scale, x + 700, y, w - 700),
    cell('DRAWN BY', tb.drawnBy, x, y + 28, 120),
    cell('DATE', tb.date, x + 120, y + 28, 90),
    cell('CHECKED BY', tb.checkedBy, x + 210, y + 28, 100),
    cell('APPROVED BY', tb.approvedBy, x + 310, y + 28, 90),
    cell('SHEET', tb.sheet, x + 400, y + 28, 80),
    cell('REV.', tb.rev, x + 480, y + 28, 40),
    cell('PROJECT', tb.project, x + 520, y + 28, w - 520),
  ];

  const noteLines = notes.map((note, i) =>
    `<text x="${x + 6}" y="${y + 79 + i * 9}" font-size="6" fill="#374151">${escapeXml(note)}</text>`
  );

  return [
    `<g>`,
    `<rect x="${x}" y="${y}" width="${w}" height="${TB_H}" fill="#f0f6ff" stroke="${C}" stroke-width="1.5"/>`,
    ...rows,
    `<rect x="${x}" y="${y + 56}" width="${w}" height="${TB_H - 56}" fill="white" stroke="${C}" stroke-width="${lw}"/>`,
    `<text x="${x + 6}" y="${y + 67}" font-size="6.5" fill="${C}" font-weight="bold">NOTES:</text>`,
    ...noteLines,
    `</g>`,
  ].join('\n');
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function lineStyleAttr(style: LineStyle | undefined, baseWidth: number): string {
  switch (style) {
    case 'dashed': return ` stroke-dasharray="4,2"`;
    case 'hidden': return ` stroke-dasharray="2,2" stroke-width="${baseWidth * 0.5}"`;
    case 'center': return ` stroke-dasharray="8,2,2,2" stroke-width="${baseWidth * 0.5}"`;
    case 'thick': return ` stroke-width="${baseWidth * 2}"`;
    default: return '';
  }
}

function applyLineStyle(ctx: CanvasRenderingContext2D, style: LineStyle | undefined, baseWidth: number): void {
  switch (style) {
    case 'dashed': ctx.setLineDash([4, 2]); break;
    case 'hidden': ctx.setLineDash([2, 2]); ctx.lineWidth = baseWidth * 0.5; break;
    case 'center': ctx.setLineDash([8, 2, 2, 2]); ctx.lineWidth = baseWidth * 0.5; break;
    case 'thick': ctx.lineWidth = baseWidth * 2; break;
    default: ctx.setLineDash([]); break;
  }
}

function textAnchorMap(align: TextAlign | undefined): string {
  switch (align) {
    case 'left': return 'start';
    case 'right': return 'end';
    default: return 'middle';
  }
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
