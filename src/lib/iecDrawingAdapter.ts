// ═══════════════════════════════════════════════════════════════════════════════
// IEC Drawing Adapter — Converts IECDrawingData to unified Drawing format
// Bridge between legacy IEC template data and the new drawingEngine types.
// ═══════════════════════════════════════════════════════════════════════════════

import type { IECDrawingData, DrawingView as IECView, DrawingShape } from './iecDrawingData';
import type { Drawing, DrawingCommand, TitleBlockData } from './drawingEngine';
import { drawing as dsl } from './drawingDSL';

/**
 * Convert an IECDrawingData template into a unified Drawing.
 * Each IEC view becomes a layer with its shapes translated to DrawingCommands.
 */
export function iecToDrawing(data: Readonly<IECDrawingData>): Readonly<Drawing> {
  const builder = dsl(data.name, data.standard);

  // Convert each view into a drawing layer
  for (const view of data.views) {
    const layer = builder.layer(view.label).color('#1e3a5f').lineWidth(0.9);

    for (const shape of view.shapes) {
      convertShape(layer, shape);
    }
  }

  // Add notes
  for (const note of data.notes) {
    builder.note(note);
  }

  // Set title block
  builder.titleBlock({
    partNo: data.partNo,
    scale: data.scale,
    material: data.material,
    standard: data.standard,
    drawnBy: 'ShilpaSutra AI',
    date: new Date().toISOString().slice(0, 10),
    checkedBy: '—',
    approvedBy: '—',
    sheet: '1 of 1',
    rev: 'A',
    project: 'ShilpaSutra PV Lab',
  });

  return builder.build();
}

/**
 * Convert all IEC templates to the unified Drawing format.
 */
export function convertAllIECDrawings(
  templates: ReadonlyArray<IECDrawingData>
): ReadonlyArray<Readonly<Drawing>> {
  return templates.map(iecToDrawing);
}

// ── Shape Converter ─────────────────────────────────────────────────────────

/** Map a legacy DrawingShape to DSL layer commands. */
function convertShape(
  layer: ReturnType<ReturnType<typeof dsl>['layer']>,
  shape: Readonly<DrawingShape>
): void {
  const lineStyle = mapLineStyle(shape.style);

  switch (shape.type) {
    case 'rect':
      layer.rect(shape.x, shape.y, shape.w ?? 0, shape.h ?? 0, shape.fill ?? undefined);
      if (lineStyle && lineStyle !== 'solid') {
        // Add dashed border line overlay for dashed/hidden rects
        const w = shape.w ?? 0, h = shape.h ?? 0;
        layer.line(shape.x, shape.y, shape.x + w, shape.y, lineStyle);
        layer.line(shape.x + w, shape.y, shape.x + w, shape.y + h, lineStyle);
        layer.line(shape.x + w, shape.y + h, shape.x, shape.y + h, lineStyle);
        layer.line(shape.x, shape.y + h, shape.x, shape.y, lineStyle);
      }
      break;

    case 'line':
      layer.line(shape.x, shape.y, shape.x2 ?? shape.x, shape.y2 ?? shape.y, lineStyle);
      break;

    case 'circle':
      layer.circle(shape.x, shape.y, shape.r ?? 5, shape.fill ?? undefined);
      break;

    case 'text':
      layer.text(shape.x, shape.y, shape.label ?? '', { size: 6, align: 'center' });
      break;
  }
}

/** Map legacy style strings to the engine's LineStyle. */
function mapLineStyle(style: DrawingShape['style']): 'solid' | 'dashed' | 'hidden' | 'thick' | undefined {
  switch (style) {
    case 'solid': return 'solid';
    case 'dashed': return 'dashed';
    case 'hidden': return 'hidden';
    case 'thick': return 'thick';
    default: return undefined;
  }
}
