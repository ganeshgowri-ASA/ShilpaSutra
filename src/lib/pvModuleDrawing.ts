// ═══════════════════════════════════════════════════════════════════════════════
// PV Module Engineering Drawing — Pure data for glass-to-glass bifacial module
// 540Wp, 2000×1000×40mm, 6063-T5 Al frame, 144 half-cut mono cells
// ═══════════════════════════════════════════════════════════════════════════════

import type { Drawing, DrawingLayer, DrawingCommand, TitleBlockData } from './drawingEngine';

// ── Module Specifications ────────────────────────────────────────────────────

export interface PVModuleSpec {
  readonly lengthMm: number;
  readonly widthMm: number;
  readonly frameDepthMm: number;
  readonly frameThicknessMm: number;
  readonly frontGlassMm: number;
  readonly backGlassMm: number;
  readonly evaMm: number;
  readonly cellSizeMm: number;
  readonly cellRows: number;
  readonly cellCols: number;
  readonly cellCount: number;
  readonly junctionBoxL: number;
  readonly junctionBoxW: number;
  readonly junctionBoxH: number;
  readonly junctionBoxOffsetFromBottom: number;
  readonly mountingHoleDia: number;
  readonly mountingHoleInset: number;
  readonly mountingHolesPerSide: number;
  readonly bypassDiodes: number;
  readonly weightKg: number;
  readonly powerWp: number;
  readonly frameMaterial: string;
  readonly frameAlloy: string;
}

export const STANDARD_MODULE: Readonly<PVModuleSpec> = Object.freeze({
  lengthMm: 2000,
  widthMm: 1000,
  frameDepthMm: 40,
  frameThicknessMm: 1.8,
  frontGlassMm: 3.2,
  backGlassMm: 2.0,
  evaMm: 0.5,
  cellSizeMm: 166,
  cellRows: 6,
  cellCols: 24,
  cellCount: 144,
  junctionBoxL: 160,
  junctionBoxW: 80,
  junctionBoxH: 30,
  junctionBoxOffsetFromBottom: 667, // 1/3 from bottom
  mountingHoleDia: 8,
  mountingHoleInset: 150,
  mountingHolesPerSide: 4,
  bypassDiodes: 3,
  weightKg: 28,
  powerWp: 540,
  frameMaterial: '6063-T5 Anodized Aluminium',
  frameAlloy: '6063-T5',
});

// ── Scale: all coordinates at 1:20 → 1mm real = 0.05 SVG units ──────────────
// We use a drawing scale of 1:20, so 2000mm → 100 SVG units
const S = 1 / 20; // scale factor

function s(mm: number): number {
  return mm * S;
}

// ── View Offsets (A1 landscape 841×594 layout) ──────────────────────────────

const FRONT_VIEW = { x: 40, y: 30, label: 'FRONT VIEW' };
const REAR_VIEW = { x: 40, y: 200, label: 'REAR VIEW' };
const SECTION_AA = { x: 600, y: 30, label: 'SECTION A-A' };
const SECTION_BB = { x: 600, y: 160, label: 'SECTION B-B' };
const DETAIL_C = { x: 600, y: 290, label: 'DETAIL C - CORNER JOINT' };

// ── Front View (looking at glass face) ──────────────────────────────────────

function buildFrontView(mod: Readonly<PVModuleSpec>): ReadonlyArray<DrawingCommand> {
  const cmds: DrawingCommand[] = [];
  const ox = FRONT_VIEW.x;
  const oy = FRONT_VIEW.y;
  const w = s(mod.lengthMm);
  const h = s(mod.widthMm);
  const ft = s(mod.frameThicknessMm * 10); // frame visible width ~18mm at scale

  // View label
  cmds.push({ type: 'text', x: ox + w / 2, y: oy - 8, content: FRONT_VIEW.label, size: 6, align: 'center', weight: 'bold' });

  // Outer frame
  cmds.push({ type: 'rect', x: ox, y: oy, w, h });

  // Inner glass area
  const gx = ox + ft;
  const gy = oy + ft;
  const gw = w - 2 * ft;
  const gh = h - 2 * ft;
  cmds.push({ type: 'rect', x: gx, y: gy, w: gw, h: gh, fill: '#f0f8ff' });

  // Cell grid: 24 cols × 6 rows of half-cut cells
  const cellGap = s(2); // 2mm gap between cells
  const cellW = (gw - (mod.cellCols + 1) * cellGap) / mod.cellCols;
  const cellH = (gh - (mod.cellRows + 1) * cellGap) / mod.cellRows;

  for (let row = 0; row < mod.cellRows; row++) {
    for (let col = 0; col < mod.cellCols; col++) {
      const cx = gx + cellGap + col * (cellW + cellGap);
      const cy = gy + cellGap + row * (cellH + cellGap);
      cmds.push({ type: 'rect', x: cx, y: cy, w: cellW, h: cellH, fill: '#1a237e' });
    }
  }

  // Substring boundaries (3 substrings of 48 cells = 8 cols each)
  for (let i = 1; i < 3; i++) {
    const sx = gx + cellGap + i * 8 * (cellW + cellGap) - cellGap / 2;
    cmds.push({ type: 'line', x1: sx, y1: gy, x2: sx, y2: gy + gh, style: 'center' });
  }
  cmds.push({ type: 'text', x: gx + gw / 6, y: gy + gh + 6, content: 'S1 (48 cells)', size: 3.5, align: 'center' });
  cmds.push({ type: 'text', x: gx + gw / 2, y: gy + gh + 6, content: 'S2 (48 cells)', size: 3.5, align: 'center' });
  cmds.push({ type: 'text', x: gx + 5 * gw / 6, y: gy + gh + 6, content: 'S3 (48 cells)', size: 3.5, align: 'center' });

  // Section A-A cut line
  const cutY = oy + h / 2;
  cmds.push({ type: 'line', x1: ox - 8, y1: cutY, x2: ox + w + 8, y2: cutY, style: 'center' });
  cmds.push({ type: 'text', x: ox - 12, y: cutY, content: 'A', size: 5, align: 'center', weight: 'bold' });
  cmds.push({ type: 'text', x: ox + w + 12, y: cutY, content: 'A', size: 5, align: 'center', weight: 'bold' });

  // Dimensions
  cmds.push({ type: 'dim', orientation: 'horizontal', a: ox, b: ox + w, offset: oy - 18, pos: oy, label: '2000' });
  cmds.push({ type: 'dim', orientation: 'vertical', a: oy, b: oy + h, offset: ox - 18, pos: ox, label: '1000' });

  // Frame callout
  cmds.push({ type: 'text', x: ox + w + 5, y: oy + 5, content: 'FRAME: 6063-T5 Al', size: 3.5, align: 'left' });
  cmds.push({ type: 'text', x: ox + w + 5, y: oy + 10, content: '40mm depth profile', size: 3, align: 'left' });

  return cmds;
}

// ── Rear View (junction box, mounting holes, cable) ─────────────────────────

function buildRearView(mod: Readonly<PVModuleSpec>): ReadonlyArray<DrawingCommand> {
  const cmds: DrawingCommand[] = [];
  const ox = REAR_VIEW.x;
  const oy = REAR_VIEW.y;
  const w = s(mod.lengthMm);
  const h = s(mod.widthMm);

  // View label
  cmds.push({ type: 'text', x: ox + w / 2, y: oy - 8, content: REAR_VIEW.label, size: 6, align: 'center', weight: 'bold' });

  // Module outline (rear = mirrored, same rectangle)
  cmds.push({ type: 'rect', x: ox, y: oy, w, h });

  // Back glass area
  const ft = s(mod.frameThicknessMm * 10);
  cmds.push({ type: 'rect', x: ox + ft, y: oy + ft, w: w - 2 * ft, h: h - 2 * ft, fill: '#f5f5f5' });

  // Junction box (centered horizontally, 1/3 from bottom)
  const jbW = s(mod.junctionBoxL);
  const jbH = s(mod.junctionBoxW);
  const jbX = ox + w / 2 - jbW / 2;
  const jbY = oy + h - s(mod.junctionBoxOffsetFromBottom) - jbH / 2;
  cmds.push({ type: 'rect', x: jbX, y: jbY, w: jbW, h: jbH, fill: '#374151' });
  cmds.push({ type: 'text', x: jbX + jbW / 2, y: jbY + jbH / 2, content: 'J-BOX IP68', size: 3, align: 'center' });

  // Bypass diodes inside JB (3 diodes)
  const diodeSpacing = jbW / (mod.bypassDiodes + 1);
  for (let i = 1; i <= mod.bypassDiodes; i++) {
    const dx = jbX + i * diodeSpacing;
    const dy = jbY + jbH * 0.3;
    cmds.push({ type: 'rect', x: dx - 1.2, y: dy - 0.8, w: 2.4, h: 1.6, fill: '#ef4444' });
    cmds.push({ type: 'text', x: dx, y: dy + 3, content: `D${i}`, size: 2.5, align: 'center' });
  }

  // Cable exit from junction box
  const cableY = jbY + jbH;
  cmds.push({ type: 'line', x1: jbX + jbW / 2 - 2, y1: cableY, x2: jbX + jbW / 2 - 2, y2: cableY + 8 });
  cmds.push({ type: 'line', x1: jbX + jbW / 2 + 2, y1: cableY, x2: jbX + jbW / 2 + 2, y2: cableY + 8 });
  cmds.push({ type: 'text', x: jbX + jbW / 2, y: cableY + 11, content: '+   −', size: 3, align: 'center' });
  cmds.push({ type: 'text', x: jbX + jbW / 2, y: cableY + 15, content: 'MC4 CONNECTORS', size: 3, align: 'center' });

  // Junction box dimensions
  cmds.push({ type: 'dim', orientation: 'horizontal', a: jbX, b: jbX + jbW, offset: jbY - 8, pos: jbY, label: '160' });
  cmds.push({ type: 'dim', orientation: 'vertical', a: jbY, b: jbY + jbH, offset: jbX + jbW + 5, pos: jbX + jbW, label: '80' });

  // Mounting holes: 4 per long side, 150mm from corners
  const holeR = s(mod.mountingHoleDia) / 2;
  const inset = s(mod.mountingHoleInset);
  const holeSpacing = (w - 2 * inset) / (mod.mountingHolesPerSide - 1);

  for (let i = 0; i < mod.mountingHolesPerSide; i++) {
    const hx = ox + inset + i * holeSpacing;
    // Top edge holes
    cmds.push({ type: 'circle', cx: hx, cy: oy + s(20), r: holeR });
    // Bottom edge holes
    cmds.push({ type: 'circle', cx: hx, cy: oy + h - s(20), r: holeR });
  }

  // Mounting hole callout
  cmds.push({ type: 'text', x: ox + inset, y: oy - 4, content: '4× M8 MOUNTING HOLES PER SIDE', size: 3.5, align: 'left' });
  cmds.push({ type: 'dim', orientation: 'horizontal', a: ox, b: ox + inset, offset: oy + s(20) - 6, pos: oy + s(20), label: '150' });

  // Section B-B cut line through junction box
  const cutX = jbX + jbW / 2;
  cmds.push({ type: 'line', x1: cutX, y1: oy - 5, x2: cutX, y2: oy + h + 5, style: 'center' });
  cmds.push({ type: 'text', x: cutX, y: oy - 8, content: 'B', size: 5, align: 'center', weight: 'bold' });
  cmds.push({ type: 'text', x: cutX, y: oy + h + 9, content: 'B', size: 5, align: 'center', weight: 'bold' });

  return cmds;
}

// ── Section A-A (through 40mm frame profile) ────────────────────────────────

function buildSectionAA(mod: Readonly<PVModuleSpec>): ReadonlyArray<DrawingCommand> {
  const cmds: DrawingCommand[] = [];
  const ox = SECTION_AA.x;
  const oy = SECTION_AA.y;

  cmds.push({ type: 'text', x: ox + 60, y: oy - 8, content: SECTION_AA.label, size: 6, align: 'center', weight: 'bold' });

  // Scale this section at 1:2 for detail (frame depth 40mm → 20 SVG units)
  const detailS = 1 / 2;
  const ds = (mm: number): number => mm * detailS;

  const frameW = ds(mod.widthMm); // too wide at 1:2, limit to profile width
  const profileW = ds(100); // show 100mm slice of module width
  const profileH = ds(mod.frameDepthMm); // 40mm depth

  // Frame outer profile
  cmds.push({ type: 'rect', x: ox, y: oy, w: profileW, h: profileH });
  cmds.push({ type: 'hatch', x: ox, y: oy, w: ds(mod.frameThicknessMm * 10), h: profileH, pattern: 'diagonal' });
  cmds.push({ type: 'hatch', x: ox + profileW - ds(mod.frameThicknessMm * 10), y: oy, w: ds(mod.frameThicknessMm * 10), h: profileH, pattern: 'diagonal' });

  // Glass stack inside frame (top to bottom):
  // Front glass 3.2mm, EVA 0.5mm, Cells ~0.2mm, EVA 0.5mm, Back glass 2.0mm
  const stackStartX = ox + ds(mod.frameThicknessMm * 10);
  const stackW = profileW - 2 * ds(mod.frameThicknessMm * 10);
  let layerY = oy + ds(5); // 5mm from top of frame

  // Front glass
  const fgH = ds(mod.frontGlassMm);
  cmds.push({ type: 'rect', x: stackStartX, y: layerY, w: stackW, h: fgH, fill: '#bfdbfe' });
  cmds.push({ type: 'text', x: ox + profileW + 5, y: layerY + fgH / 2, content: `Front glass ${mod.frontGlassMm}mm`, size: 3.5, align: 'left' });
  layerY += fgH;

  // EVA
  const evaH = ds(mod.evaMm);
  cmds.push({ type: 'rect', x: stackStartX, y: layerY, w: stackW, h: evaH, fill: '#fef3c7' });
  layerY += evaH;

  // Cell layer
  const cellH = ds(0.2);
  cmds.push({ type: 'rect', x: stackStartX, y: layerY, w: stackW, h: cellH, fill: '#1a237e' });
  cmds.push({ type: 'text', x: ox + profileW + 5, y: layerY, content: 'Cells 0.2mm', size: 3.5, align: 'left' });
  layerY += cellH;

  // EVA
  cmds.push({ type: 'rect', x: stackStartX, y: layerY, w: stackW, h: evaH, fill: '#fef3c7' });
  cmds.push({ type: 'text', x: ox + profileW + 5, y: layerY + evaH / 2, content: `EVA ${mod.evaMm}mm`, size: 3.5, align: 'left' });
  layerY += evaH;

  // Back glass
  const bgH = ds(mod.backGlassMm);
  cmds.push({ type: 'rect', x: stackStartX, y: layerY, w: stackW, h: bgH, fill: '#e5e7eb' });
  cmds.push({ type: 'text', x: ox + profileW + 5, y: layerY + bgH / 2, content: `Back glass ${mod.backGlassMm}mm`, size: 3.5, align: 'left' });

  // Frame profile hatching for top/bottom flanges
  cmds.push({ type: 'hatch', x: ox, y: oy, w: profileW, h: ds(2), pattern: 'diagonal' });
  cmds.push({ type: 'hatch', x: ox, y: oy + profileH - ds(2), w: profileW, h: ds(2), pattern: 'diagonal' });

  // Dimensions
  cmds.push({ type: 'dim', orientation: 'vertical', a: oy, b: oy + profileH, offset: ox - 12, pos: ox, label: '40' });
  cmds.push({ type: 'dim', orientation: 'vertical', a: oy + ds(5), b: oy + ds(5) + fgH, offset: ox + profileW + 35, pos: ox + profileW, label: '3.2' });
  cmds.push({ type: 'dim', orientation: 'vertical', a: layerY, b: layerY + bgH, offset: ox + profileW + 35, pos: ox + profileW, label: '2.0' });

  return cmds;
}

// ── Section B-B (through junction box) ──────────────────────────────────────

function buildSectionBB(mod: Readonly<PVModuleSpec>): ReadonlyArray<DrawingCommand> {
  const cmds: DrawingCommand[] = [];
  const ox = SECTION_BB.x;
  const oy = SECTION_BB.y;

  cmds.push({ type: 'text', x: ox + 50, y: oy - 8, content: SECTION_BB.label, size: 6, align: 'center', weight: 'bold' });

  // Detail scale 1:2
  const ds = (mm: number): number => mm / 2;

  // Module cross-section (simplified)
  const modH = ds(mod.frameDepthMm); // 40mm
  const modW = ds(200); // 200mm slice
  cmds.push({ type: 'rect', x: ox, y: oy, w: modW, h: modH });

  // Glass stack
  cmds.push({ type: 'rect', x: ox + ds(18), y: oy + ds(5), w: modW - ds(36), h: ds(mod.frontGlassMm + mod.backGlassMm + 2 * mod.evaMm + 0.2), fill: '#bfdbfe' });

  // Junction box on rear surface
  const jbW = ds(mod.junctionBoxW); // 80mm wide (this is the B-B section, so we see the W dimension)
  const jbH = ds(mod.junctionBoxH); // 30mm deep
  const jbX = ox + modW / 2 - jbW / 2;
  const jbY = oy + modH; // sits on back surface
  cmds.push({ type: 'rect', x: jbX, y: jbY, w: jbW, h: jbH, fill: '#4b5563' });
  cmds.push({ type: 'text', x: jbX + jbW / 2, y: jbY + jbH / 2, content: 'JB', size: 4, align: 'center' });

  // Cable gland entries
  const glandR = ds(8);
  cmds.push({ type: 'circle', cx: jbX + jbW * 0.25, cy: jbY + jbH, r: glandR });
  cmds.push({ type: 'circle', cx: jbX + jbW * 0.75, cy: jbY + jbH, r: glandR });
  cmds.push({ type: 'text', x: jbX + jbW / 2, y: jbY + jbH + ds(20), content: 'PG7 CABLE GLANDS', size: 3.5, align: 'center' });

  // Dimensions
  cmds.push({ type: 'dim', orientation: 'vertical', a: jbY, b: jbY + jbH, offset: jbX + jbW + 8, pos: jbX + jbW, label: '30' });
  cmds.push({ type: 'dim', orientation: 'horizontal', a: jbX, b: jbX + jbW, offset: jbY - 6, pos: jbY, label: '80' });
  cmds.push({ type: 'dim', orientation: 'vertical', a: oy, b: oy + modH, offset: ox - 10, pos: ox, label: '40' });

  return cmds;
}

// ── Detail C (frame corner joint) ───────────────────────────────────────────

function buildDetailC(mod: Readonly<PVModuleSpec>): ReadonlyArray<DrawingCommand> {
  const cmds: DrawingCommand[] = [];
  const ox = DETAIL_C.x;
  const oy = DETAIL_C.y;

  cmds.push({ type: 'text', x: ox + 40, y: oy - 8, content: DETAIL_C.label, size: 6, align: 'center', weight: 'bold' });

  // Scale 1:1 for detail
  const cornerSize = 50; // 50mm shown at 1:1 → 50 SVG units

  // Two frame profiles meeting at mitre
  // Horizontal profile
  cmds.push({ type: 'rect', x: ox, y: oy, w: cornerSize, h: s(mod.frameDepthMm) * 20 }); // frame depth at ~1:1
  const frameH = s(mod.frameDepthMm) * 20; // ~40 SVG units

  // Vertical profile
  cmds.push({ type: 'rect', x: ox, y: oy, w: frameH, h: cornerSize });

  // Mitre line at 45 degrees
  cmds.push({ type: 'line', x1: ox, y1: oy, x2: ox + frameH, y2: oy + frameH, style: 'thick' });

  // Hatching for frame material (frame wall ~1.8mm at 1:1 scale)
  cmds.push({ type: 'hatch', x: ox, y: oy, w: cornerSize, h: 3.6, pattern: 'diagonal' });
  cmds.push({ type: 'hatch', x: ox, y: oy + frameH - 3.6, w: cornerSize, h: 3.6, pattern: 'diagonal' });

  // Corner key insert
  cmds.push({ type: 'rect', x: ox + frameH / 2 - 4, y: oy + frameH / 2 - 4, w: 8, h: 8, fill: '#9ca3af' });
  cmds.push({ type: 'text', x: ox + frameH / 2, y: oy + frameH / 2, content: 'KEY', size: 3, align: 'center' });

  // Sealant bead
  cmds.push({ type: 'line', x1: ox + 2, y1: oy + 2, x2: ox + frameH - 2, y2: oy + frameH - 2, style: 'dashed' });

  // Annotations
  cmds.push({ type: 'text', x: ox + cornerSize + 5, y: oy + 8, content: 'MITRE JOINT 45deg', size: 3.5, align: 'left' });
  cmds.push({ type: 'text', x: ox + cornerSize + 5, y: oy + 14, content: 'STEEL CORNER KEY', size: 3.5, align: 'left' });
  cmds.push({ type: 'text', x: ox + cornerSize + 5, y: oy + 20, content: 'SILICONE SEALANT', size: 3.5, align: 'left' });
  cmds.push({ type: 'text', x: ox + cornerSize + 5, y: oy + 26, content: 'CRIMPED + SEALED', size: 3.5, align: 'left' });

  // Dimension
  cmds.push({ type: 'dim', orientation: 'vertical', a: oy, b: oy + frameH, offset: ox - 10, pos: ox, label: '40' });

  return cmds;
}

// ── Assemble Complete PV Module Drawing ─────────────────────────────────────

export function createPVModuleDrawing(mod: Readonly<PVModuleSpec> = STANDARD_MODULE): Readonly<Drawing> {
  const outlineLayer: DrawingLayer = {
    name: 'outline',
    visible: true,
    color: '#000000',
    lineWidth: 0.9,
    commands: [
      ...buildFrontView(mod),
      ...buildRearView(mod),
    ],
  };

  const sectionLayer: DrawingLayer = {
    name: 'sections',
    visible: true,
    color: '#000000',
    lineWidth: 0.7,
    commands: [
      ...buildSectionAA(mod),
      ...buildSectionBB(mod),
      ...buildDetailC(mod),
    ],
  };

  const dimensionLayer: DrawingLayer = {
    name: 'dimensions',
    visible: true,
    color: '#555555',
    lineWidth: 0.4,
    commands: [],
  };

  const annotationLayer: DrawingLayer = {
    name: 'annotations',
    visible: true,
    color: '#1e3a5f',
    lineWidth: 0.3,
    commands: [
      // Module info block
      { type: 'text', x: 40, y: 380, content: `PV MODULE: ${mod.powerWp}Wp BIFACIAL`, size: 7, align: 'left', weight: 'bold' },
      { type: 'text', x: 40, y: 390, content: `${mod.lengthMm} x ${mod.widthMm} x ${mod.frameDepthMm}mm`, size: 5, align: 'left' },
      { type: 'text', x: 40, y: 398, content: `${mod.cellCount} half-cut mono cells (${mod.cellRows}x${mod.cellCols})`, size: 5, align: 'left' },
      { type: 'text', x: 40, y: 406, content: `Cell size: ${mod.cellSizeMm}mm`, size: 5, align: 'left' },
      { type: 'text', x: 40, y: 414, content: `Weight: ${mod.weightKg} kg`, size: 5, align: 'left' },
      { type: 'text', x: 40, y: 422, content: `Glass: ${mod.frontGlassMm}mm front + ${mod.backGlassMm}mm back (tempered)`, size: 5, align: 'left' },
      { type: 'text', x: 40, y: 430, content: `Frame: ${mod.frameMaterial}`, size: 5, align: 'left' },
      { type: 'text', x: 40, y: 438, content: `Junction Box: ${mod.junctionBoxL}x${mod.junctionBoxW}x${mod.junctionBoxH}mm IP68`, size: 5, align: 'left' },
      { type: 'text', x: 40, y: 446, content: `Bypass Diodes: ${mod.bypassDiodes} (1 per ${mod.cellCount / mod.bypassDiodes}-cell substring)`, size: 5, align: 'left' },
    ],
  };

  const titleBlock: TitleBlockData = {
    partNo: 'SS-PV-MODULE-001',
    scale: '1:20',
    material: `${mod.frameAlloy} Al + Tempered Glass`,
    standard: 'IEC 61215 / IEC 61730',
    drawnBy: 'ShilpaSutra AI',
    date: new Date().toISOString().slice(0, 10),
    checkedBy: '-',
    approvedBy: '-',
    sheet: '1 of 1',
    rev: 'A',
    project: 'ShilpaSutra PV Lab',
  };

  return Object.freeze({
    id: 'pv-module-540wp',
    title: 'PV Module 540Wp Bifacial - Engineering Drawing',
    standard: 'IEC 61215 / IEC 61730',
    scale: 20,
    layers: Object.freeze([outlineLayer, sectionLayer, dimensionLayer, annotationLayer]),
    titleBlock,
    notes: Object.freeze([
      '1. ALL DIMENSIONS IN MILLIMETRES UNLESS OTHERWISE STATED',
      '2. FRAME MATERIAL: 6063-T5 ANODIZED ALUMINIUM, 40mm DEPTH',
      '3. GLASS: 3.2mm TEMPERED (FRONT) + 2.0mm TEMPERED (BACK)',
      '4. MOUNTING: 4x M8 HOLES PER LONG SIDE, 150mm FROM CORNERS',
      '5. JUNCTION BOX: IP68, 3 BYPASS DIODES, MC4 CONNECTORS',
      '6. WEIGHT: 28 kg, POWER: 540Wp BIFACIAL',
      '7. TOLERANCES: FRAME +/-0.5mm, GLASS +/-0.3mm',
    ]),
  });
}
