// ═══════════════════════════════════════════════════════════════════════════════
// PV Array Engineering Drawing — Ground-mounted single-portrait 24-module array
// 2 rows × 12 columns, 23° tilt, driven screw piles, galvanised C-channel
// ═══════════════════════════════════════════════════════════════════════════════

import type { Drawing, DrawingLayer, DrawingCommand, TitleBlockData } from './drawingEngine';

// ── Array Specifications ────────────────────────────────────────────────────

export interface PVArraySpec {
  readonly moduleLengthMm: number;
  readonly moduleWidthMm: number;
  readonly rows: number;
  readonly cols: number;
  readonly totalModules: number;
  readonly tiltDeg: number;
  readonly rowPitchMm: number;
  readonly moduleGapMm: number;
  readonly groundClearanceMm: number;
  readonly pileDepthMm: number;
  readonly pileDiaMm: number;
  readonly railHeightMm: number;
  readonly railWidthMm: number;
  readonly clampWidthMm: number;
  readonly modulePowerWp: number;
  readonly stringVoltage: string;
  readonly orientation: 'portrait' | 'landscape';
}

export const STANDARD_ARRAY: Readonly<PVArraySpec> = Object.freeze({
  moduleLengthMm: 2000,
  moduleWidthMm: 1000,
  rows: 2,
  cols: 12,
  totalModules: 24,
  tiltDeg: 23,
  // Row spacing: module height × cos(23°) + shadow clearance ≈ 5200mm
  rowPitchMm: 5200,
  moduleGapMm: 20,
  groundClearanceMm: 300,
  pileDepthMm: 1500,
  pileDiaMm: 76,
  railHeightMm: 41,
  railWidthMm: 35,
  clampWidthMm: 35,
  modulePowerWp: 540,
  stringVoltage: '24 × ~40V = ~960V DC',
  orientation: 'portrait',
});

// ── Scale helpers ───────────────────────────────────────────────────────────

// Plan view at 1:200 scale for the full array
const PLAN_SCALE = 1 / 200;
// Elevation and section at 1:50
const ELEV_SCALE = 1 / 50;
// Detail at 1:5
const DETAIL_SCALE = 1 / 5;

function ps(mm: number): number { return mm * PLAN_SCALE; }
function es(mm: number): number { return mm * ELEV_SCALE; }
function ds(mm: number): number { return mm * DETAIL_SCALE; }

// ── View Offsets ────────────────────────────────────────────────────────────

const PLAN_VIEW = { x: 30, y: 30 };
const ELEV_VIEW = { x: 30, y: 210 };
const SECTION_VIEW = { x: 420, y: 30 };
const DETAIL_VIEW = { x: 420, y: 260 };
const BOM_VIEW = { x: 30, y: 340 };

// ── Plan View (top-down) ────────────────────────────────────────────────────

function buildPlanView(arr: Readonly<PVArraySpec>): ReadonlyArray<DrawingCommand> {
  const cmds: DrawingCommand[] = [];
  const ox = PLAN_VIEW.x;
  const oy = PLAN_VIEW.y;

  cmds.push({ type: 'text', x: ox + 150, y: oy - 8, content: 'PLAN VIEW (1:200)', size: 6, align: 'center', weight: 'bold' });

  // Each module in portrait: width=1000mm across, length=2000mm deep (tilted, projected)
  const projectedDepth = arr.moduleLengthMm * Math.cos(arr.tiltDeg * Math.PI / 180);
  const modW = ps(arr.moduleWidthMm);
  const modD = ps(projectedDepth);
  const gap = ps(arr.moduleGapMm);
  const rowPitch = ps(arr.rowPitchMm);

  for (let row = 0; row < arr.rows; row++) {
    const ry = oy + 15 + row * rowPitch;
    for (let col = 0; col < arr.cols; col++) {
      const mx = ox + 15 + col * (modW + gap);
      cmds.push({ type: 'rect', x: mx, y: ry, w: modW, h: modD, fill: '#dbeafe' });
    }
    // Row label
    const rowLabelX = ox + 15 + arr.cols * (modW + gap) + 5;
    cmds.push({ type: 'text', x: rowLabelX, y: ry + modD / 2, content: `Row ${row + 1}`, size: 4, align: 'left' });
  }

  // Array dimensions
  const arrayW = arr.cols * (modW + gap) - gap;
  const arrayD = (arr.rows - 1) * rowPitch + modD;
  cmds.push({ type: 'dim', orientation: 'horizontal', a: ox + 15, b: ox + 15 + arrayW, offset: oy + 15 + arrayD + 12, pos: oy + 15 + arrayD, label: `${arr.cols * arr.moduleWidthMm + (arr.cols - 1) * arr.moduleGapMm}` });
  cmds.push({ type: 'dim', orientation: 'vertical', a: oy + 15, b: oy + 15 + rowPitch, offset: ox + 5, pos: ox + 15, label: `${arr.rowPitchMm}` });

  // Inter-row dimension
  cmds.push({ type: 'dim', orientation: 'vertical', a: oy + 15 + modD, b: oy + 15 + rowPitch, offset: ox, pos: ox + 15, label: `${Math.round(arr.rowPitchMm - projectedDepth)}` });

  // North arrow
  const naX = ox + 15 + arrayW + 30;
  const naY = oy + 30;
  cmds.push({ type: 'arrow', x1: naX, y1: naY + 25, x2: naX, y2: naY, headSize: 5 });
  cmds.push({ type: 'text', x: naX, y: naY - 5, content: 'N', size: 7, align: 'center', weight: 'bold' });

  // String cable routing (dashed line connecting modules)
  const cableY1 = oy + 15 + modD * 0.8;
  const cableY2 = oy + 15 + rowPitch + modD * 0.8;
  cmds.push({ type: 'line', x1: ox + 15, y1: cableY1, x2: ox + 15 + arrayW, y2: cableY1, style: 'dashed' });
  cmds.push({ type: 'line', x1: ox + 15 + arrayW, y1: cableY1, x2: ox + 15 + arrayW, y2: cableY2, style: 'dashed' });
  cmds.push({ type: 'line', x1: ox + 15 + arrayW, y1: cableY2, x2: ox + 15, y2: cableY2, style: 'dashed' });
  cmds.push({ type: 'text', x: ox + 15 + arrayW / 2, y: cableY1 - 3, content: 'STRING CABLE (DC)', size: 3, align: 'center' });

  // String combiner box
  const scbX = ox + 15 + arrayW + 15;
  const scbY = oy + 15 + (rowPitch + modD) / 2 - 5;
  cmds.push({ type: 'rect', x: scbX, y: scbY, w: 12, h: 10, fill: '#fef3c7' });
  cmds.push({ type: 'text', x: scbX + 6, y: scbY + 5, content: 'SCB', size: 3, align: 'center' });
  cmds.push({ type: 'line', x1: ox + 15 + arrayW, y1: (cableY1 + cableY2) / 2, x2: scbX, y2: scbY + 5, style: 'dashed' });

  // Inter-row cable tray
  const trayY = oy + 15 + modD + (rowPitch - modD) / 2;
  cmds.push({ type: 'line', x1: ox + 15, y1: trayY, x2: ox + 15 + arrayW, y2: trayY, style: 'hidden' });
  cmds.push({ type: 'text', x: ox + 15 + arrayW / 2, y: trayY + 4, content: 'CABLE TRAY', size: 3, align: 'center' });

  return cmds;
}

// ── Elevation Front View ────────────────────────────────────────────────────

function buildElevationView(arr: Readonly<PVArraySpec>): ReadonlyArray<DrawingCommand> {
  const cmds: DrawingCommand[] = [];
  const ox = ELEV_VIEW.x;
  const oy = ELEV_VIEW.y;

  cmds.push({ type: 'text', x: ox + 180, y: oy - 8, content: 'FRONT ELEVATION (1:50)', size: 6, align: 'center', weight: 'bold' });

  // Ground line
  const groundY = oy + 100;
  cmds.push({ type: 'line', x1: ox - 10, y1: groundY, x2: ox + 360, y2: groundY, style: 'thick' });
  cmds.push({ type: 'hatch', x: ox - 10, y: groundY, w: 370, h: 6, pattern: 'diagonal' });

  // Tilt calculation
  const tiltRad = arr.tiltDeg * Math.PI / 180;
  const modLen = es(arr.moduleLengthMm);
  const modTiltH = modLen * Math.sin(tiltRad);
  const modTiltW = modLen * Math.cos(tiltRad);
  const clearance = es(arr.groundClearanceMm);

  // Front leg (shorter)
  const frontLegTop = groundY - clearance;
  // Rear leg (taller)
  const rearLegTop = groundY - clearance - modTiltH;

  // Show 3 modules across to represent the row
  const modW = es(arr.moduleWidthMm);
  const mGap = es(arr.moduleGapMm);
  const startX = ox + 20;

  for (let i = 0; i < 3; i++) {
    const mx = startX + i * (modW + mGap);
    // Module as tilted rectangle (simplified as line from front-bottom to rear-top)
    cmds.push({ type: 'line', x1: mx, y1: frontLegTop, x2: mx, y2: rearLegTop, style: 'thick' });
    cmds.push({ type: 'line', x1: mx + modW, y1: frontLegTop, x2: mx + modW, y2: rearLegTop, style: 'thick' });
    cmds.push({ type: 'line', x1: mx, y1: frontLegTop, x2: mx + modW, y2: frontLegTop });
    cmds.push({ type: 'line', x1: mx, y1: rearLegTop, x2: mx + modW, y2: rearLegTop });
    // Fill
    cmds.push({ type: 'rect', x: mx, y: rearLegTop, w: modW, h: frontLegTop - rearLegTop, fill: '#dbeafe' });
  }

  // Continuation marks
  cmds.push({ type: 'text', x: startX + 3 * (modW + mGap) + 5, y: (frontLegTop + rearLegTop) / 2, content: '...×12', size: 5, align: 'left' });

  // Front legs
  cmds.push({ type: 'line', x1: startX, y1: frontLegTop, x2: startX, y2: groundY });
  cmds.push({ type: 'line', x1: startX + 3 * (modW + mGap) - mGap, y1: frontLegTop, x2: startX + 3 * (modW + mGap) - mGap, y2: groundY });

  // Rails (horizontal lines at 1/3 and 2/3 height)
  const railY1 = rearLegTop + (frontLegTop - rearLegTop) / 3;
  const railY2 = rearLegTop + 2 * (frontLegTop - rearLegTop) / 3;
  const railEndX = startX + 3 * (modW + mGap) - mGap;
  cmds.push({ type: 'line', x1: startX, y1: railY1, x2: railEndX, y2: railY1, style: 'dashed' });
  cmds.push({ type: 'line', x1: startX, y1: railY2, x2: railEndX, y2: railY2, style: 'dashed' });
  cmds.push({ type: 'text', x: railEndX + 3, y: railY1, content: 'RAIL 1', size: 3, align: 'left' });
  cmds.push({ type: 'text', x: railEndX + 3, y: railY2, content: 'RAIL 2', size: 3, align: 'left' });

  // Dimensions
  cmds.push({ type: 'dim', orientation: 'vertical', a: frontLegTop, b: groundY, offset: ox, pos: startX, label: `${arr.groundClearanceMm}` });
  cmds.push({ type: 'dim', orientation: 'vertical', a: rearLegTop, b: frontLegTop, offset: ox + 340, pos: startX, label: `${Math.round(arr.moduleLengthMm * Math.sin(tiltRad))}` });

  // Tilt angle annotation
  const arcCx = startX + 5;
  const arcCy = frontLegTop;
  cmds.push({ type: 'arc', cx: arcCx, cy: arcCy, r: 15, startAngle: 270, endAngle: 270 + arr.tiltDeg });
  cmds.push({ type: 'text', x: arcCx + 18, y: arcCy - 8, content: `${arr.tiltDeg}deg`, size: 4, align: 'left' });

  // Module width dimension
  cmds.push({ type: 'dim', orientation: 'horizontal', a: startX, b: startX + modW, offset: rearLegTop - 10, pos: rearLegTop, label: '1000' });

  return cmds;
}

// ── Section (through one module + structure) ────────────────────────────────

function buildSectionView(arr: Readonly<PVArraySpec>): ReadonlyArray<DrawingCommand> {
  const cmds: DrawingCommand[] = [];
  const ox = SECTION_VIEW.x;
  const oy = SECTION_VIEW.y;

  cmds.push({ type: 'text', x: ox + 100, y: oy - 8, content: 'SECTION - MODULE MOUNTING (1:20)', size: 6, align: 'center', weight: 'bold' });

  // Use 1:20 scale for this section
  const ss = (mm: number): number => mm / 20;

  const groundY = oy + 180;

  // Ground line
  cmds.push({ type: 'line', x1: ox - 5, y1: groundY, x2: ox + 200, y2: groundY, style: 'thick' });
  cmds.push({ type: 'hatch', x: ox - 5, y: groundY, w: 205, h: 8, pattern: 'diagonal' });

  // Driven screw pile
  const pileX = ox + 50;
  const pileW = ss(arr.pileDiaMm);
  const pileAboveGround = ss(100); // 100mm above ground
  const pileBelow = ss(arr.pileDepthMm);
  cmds.push({ type: 'rect', x: pileX - pileW / 2, y: groundY - pileAboveGround, w: pileW, h: pileAboveGround + pileBelow, fill: '#9ca3af' });
  cmds.push({ type: 'hatch', x: pileX - pileW / 2, y: groundY, w: pileW, h: pileBelow, pattern: 'cross' });
  cmds.push({ type: 'text', x: pileX, y: groundY + pileBelow + 8, content: `SCREW PILE dia${arr.pileDiaMm}`, size: 3.5, align: 'center' });

  // Vertical post on pile
  const postW = ss(60);
  const postH = ss(arr.groundClearanceMm + arr.moduleLengthMm * Math.sin(arr.tiltDeg * Math.PI / 180) / 2);
  const postTop = groundY - postH;
  cmds.push({ type: 'rect', x: pileX - postW / 2, y: postTop, w: postW, h: postH, fill: '#d1d5db' });

  // Rail on top of post
  const railW = ss(arr.railWidthMm);
  const railH = ss(arr.railHeightMm);
  cmds.push({ type: 'rect', x: pileX - 30, y: postTop - railH, w: 60, h: railH, fill: '#6b7280' });
  cmds.push({ type: 'text', x: pileX + 35, y: postTop - railH / 2, content: `C-CHANNEL ${arr.railHeightMm}x${arr.railWidthMm}`, size: 3.5, align: 'left' });

  // Module on rail (tilted representation - simplified as rectangle)
  const modThick = ss(40); // 40mm module thickness
  const modX = pileX - 20;
  const modY = postTop - railH - modThick;
  cmds.push({ type: 'rect', x: modX, y: modY, w: 40, h: modThick, fill: '#bfdbfe' });
  cmds.push({ type: 'text', x: modX + 20, y: modY + modThick / 2, content: 'MODULE', size: 3.5, align: 'center' });

  // Clamp on module
  const clampW = ss(arr.clampWidthMm);
  cmds.push({ type: 'rect', x: modX - 2, y: modY - 2, w: clampW + 4, h: modThick + 4, fill: 'none' });
  cmds.push({ type: 'text', x: modX + clampW / 2, y: modY - 6, content: 'CLAMP', size: 3, align: 'center' });

  // Dimension chain
  cmds.push({ type: 'dim', orientation: 'vertical', a: groundY, b: groundY + pileBelow, offset: pileX + pileW / 2 + 15, pos: pileX + pileW / 2, label: `${arr.pileDepthMm}` });
  cmds.push({ type: 'dim', orientation: 'vertical', a: postTop, b: groundY, offset: pileX - postW / 2 - 12, pos: pileX - postW / 2, label: `${Math.round(postH * 20)}` });
  cmds.push({ type: 'dim', orientation: 'vertical', a: modY, b: modY + modThick, offset: modX - 10, pos: modX, label: '40' });

  return cmds;
}

// ── Detail: Mid-clamp and End-clamp ─────────────────────────────────────────

function buildClampDetail(arr: Readonly<PVArraySpec>): ReadonlyArray<DrawingCommand> {
  const cmds: DrawingCommand[] = [];
  const ox = DETAIL_VIEW.x;
  const oy = DETAIL_VIEW.y;

  cmds.push({ type: 'text', x: ox + 90, y: oy - 8, content: 'DETAIL - CLAMP TYPES (1:5)', size: 6, align: 'center', weight: 'bold' });

  // Mid-clamp detail (connects two adjacent modules)
  const mcX = ox;
  const mcY = oy + 10;

  cmds.push({ type: 'text', x: mcX + 30, y: mcY - 3, content: 'MID-CLAMP', size: 5, align: 'center', weight: 'bold' });

  // Rail profile
  const railW = ds(arr.railWidthMm);
  const railH = ds(arr.railHeightMm);
  cmds.push({ type: 'rect', x: mcX, y: mcY + 30, w: 60, h: railH, fill: '#d1d5db' });
  cmds.push({ type: 'hatch', x: mcX, y: mcY + 30, w: 60, h: railH, pattern: 'diagonal' });

  // Two module edges
  const modThick = ds(40);
  cmds.push({ type: 'rect', x: mcX, y: mcY + 30 - modThick, w: 25, h: modThick, fill: '#bfdbfe' });
  cmds.push({ type: 'rect', x: mcX + 35, y: mcY + 30 - modThick, w: 25, h: modThick, fill: '#bfdbfe' });

  // Gap between modules
  cmds.push({ type: 'dim', orientation: 'horizontal', a: mcX + 25, b: mcX + 35, offset: mcY + 30 - modThick - 6, pos: mcY + 30 - modThick, label: `${arr.moduleGapMm}` });

  // Clamp body
  cmds.push({ type: 'rect', x: mcX + 15, y: mcY + 30 - modThick - 4, w: 30, h: 4, fill: '#6b7280' });

  // Bolt
  cmds.push({ type: 'circle', cx: mcX + 30, cy: mcY + 30 + railH / 2, r: 2.5 });
  cmds.push({ type: 'text', x: mcX + 40, y: mcY + 30 + railH / 2, content: 'M8 BOLT', size: 3.5, align: 'left' });
  cmds.push({ type: 'text', x: mcX + 40, y: mcY + 30 + railH / 2 + 6, content: 'TORQUE: 16 Nm', size: 3.5, align: 'left' });

  // End-clamp detail
  const ecX = ox + 100;
  const ecY = oy + 10;

  cmds.push({ type: 'text', x: ecX + 25, y: ecY - 3, content: 'END-CLAMP', size: 5, align: 'center', weight: 'bold' });

  // Rail
  cmds.push({ type: 'rect', x: ecX, y: ecY + 30, w: 50, h: railH, fill: '#d1d5db' });
  cmds.push({ type: 'hatch', x: ecX, y: ecY + 30, w: 50, h: railH, pattern: 'diagonal' });

  // Single module edge
  cmds.push({ type: 'rect', x: ecX + 10, y: ecY + 30 - modThick, w: 40, h: modThick, fill: '#bfdbfe' });

  // End clamp body (L-shaped)
  cmds.push({ type: 'rect', x: ecX + 5, y: ecY + 30 - modThick - 4, w: 10, h: modThick + 4, fill: '#6b7280' });

  // Bolt
  cmds.push({ type: 'circle', cx: ecX + 10, cy: ecY + 30 + railH / 2, r: 2.5 });
  cmds.push({ type: 'text', x: ecX + 18, y: ecY + 30 + railH / 2, content: 'M8 BOLT', size: 3.5, align: 'left' });
  cmds.push({ type: 'text', x: ecX + 18, y: ecY + 30 + railH / 2 + 6, content: 'TORQUE: 16 Nm', size: 3.5, align: 'left' });

  return cmds;
}

// ── BOM Table ───────────────────────────────────────────────────────────────

function buildBOMTable(arr: Readonly<PVArraySpec>): ReadonlyArray<DrawingCommand> {
  const cmds: DrawingCommand[] = [];
  const ox = BOM_VIEW.x;
  const oy = BOM_VIEW.y;

  cmds.push({ type: 'text', x: ox + 100, y: oy - 5, content: 'BILL OF MATERIALS', size: 6, align: 'center', weight: 'bold' });

  const colWidths = [20, 120, 30, 50, 80];
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const rowH = 9;
  const headers = ['#', 'DESCRIPTION', 'QTY', 'UNIT', 'SPECIFICATION'];

  const midClampsPerRow = (arr.cols - 1) * 2; // 2 rails, (cols-1) mid-clamps each
  const endClampsPerRow = 2 * 2; // 2 end clamps per rail
  const pilesPerRow = Math.ceil(arr.cols / 3) + 1; // roughly every 3 modules

  const bomData: ReadonlyArray<ReadonlyArray<string>> = [
    ['1', 'PV MODULE 540Wp BIFACIAL', `${arr.totalModules}`, 'pcs', '2000x1000mm, IEC 61215'],
    ['2', 'C-CHANNEL RAIL (GALV STEEL)', `${arr.rows * 2}`, 'pcs', `${arr.railHeightMm}x${arr.railWidthMm}mm, L=${arr.cols * arr.moduleWidthMm + (arr.cols - 1) * arr.moduleGapMm}mm`],
    ['3', 'SCREW PILE FOUNDATION', `${arr.rows * pilesPerRow}`, 'pcs', `dia${arr.pileDiaMm}mm, depth ${arr.pileDepthMm}mm`],
    ['4', 'MID-CLAMP (AL)', `${arr.rows * midClampsPerRow}`, 'pcs', `${arr.clampWidthMm}mm, M8 bolt`],
    ['5', 'END-CLAMP (AL)', `${arr.rows * endClampsPerRow}`, 'pcs', `${arr.clampWidthMm}mm, M8 bolt`],
    ['6', 'DC CABLE (SOLAR)', '1', 'lot', '4mm2 PV1-F, ~120m'],
    ['7', 'STRING COMBINER BOX', '1', 'pcs', '1-string, IP65, DC fuse'],
    ['8', 'VERTICAL POST (GALV STEEL)', `${arr.rows * pilesPerRow}`, 'pcs', '60x60mm SHS, variable height'],
    ['9', 'GROUNDING CABLE', '1', 'lot', '6mm2 Cu, bonding all frames'],
  ];

  // Header row
  let cx = ox;
  for (let i = 0; i < headers.length; i++) {
    cmds.push({ type: 'rect', x: cx, y: oy, w: colWidths[i], h: rowH, fill: '#e2e8f0' });
    cmds.push({ type: 'text', x: cx + colWidths[i] / 2, y: oy + rowH / 2, content: headers[i], size: 3.5, align: 'center', weight: 'bold' });
    cx += colWidths[i];
  }

  // Data rows
  for (let r = 0; r < bomData.length; r++) {
    cx = ox;
    const ry = oy + (r + 1) * rowH;
    for (let c = 0; c < bomData[r].length; c++) {
      cmds.push({ type: 'rect', x: cx, y: ry, w: colWidths[c], h: rowH });
      cmds.push({ type: 'text', x: cx + 3, y: ry + rowH / 2, content: bomData[r][c], size: 3, align: 'left' });
      cx += colWidths[c];
    }
  }

  // Table outer border
  cmds.push({ type: 'rect', x: ox, y: oy, w: totalW, h: (bomData.length + 1) * rowH });

  return cmds;
}

// ── Assemble Complete PV Array Drawing ──────────────────────────────────────

export function createPVArrayDrawing(arr: Readonly<PVArraySpec> = STANDARD_ARRAY): Readonly<Drawing> {
  const outlineLayer: DrawingLayer = {
    name: 'outline',
    visible: true,
    color: '#000000',
    lineWidth: 0.9,
    commands: [
      ...buildPlanView(arr),
      ...buildElevationView(arr),
    ],
  };

  const sectionLayer: DrawingLayer = {
    name: 'sections',
    visible: true,
    color: '#000000',
    lineWidth: 0.7,
    commands: [
      ...buildSectionView(arr),
      ...buildClampDetail(arr),
    ],
  };

  const bomLayer: DrawingLayer = {
    name: 'bom',
    visible: true,
    color: '#1e3a5f',
    lineWidth: 0.4,
    commands: buildBOMTable(arr),
  };

  const annotationLayer: DrawingLayer = {
    name: 'annotations',
    visible: true,
    color: '#1e3a5f',
    lineWidth: 0.3,
    commands: [
      { type: 'text', x: 420, y: 220, content: `ARRAY: ${arr.totalModules} MODULES (${arr.rows}R x ${arr.cols}C)`, size: 7, align: 'left', weight: 'bold' },
      { type: 'text', x: 420, y: 230, content: `TOTAL POWER: ${arr.totalModules * arr.modulePowerWp / 1000} kWp`, size: 5, align: 'left' },
      { type: 'text', x: 420, y: 238, content: `STRING VOLTAGE: ${arr.stringVoltage}`, size: 5, align: 'left' },
      { type: 'text', x: 420, y: 246, content: `ROW PITCH: ${arr.rowPitchMm}mm (tilt ${arr.tiltDeg}deg)`, size: 5, align: 'left' },
      { type: 'text', x: 420, y: 254, content: `ORIENTATION: ${arr.orientation.toUpperCase()}`, size: 5, align: 'left' },
    ],
  };

  const titleBlock: TitleBlockData = {
    partNo: 'SS-PV-ARRAY-001',
    scale: '1:200 / 1:50 / 1:5',
    material: 'Galv Steel + Al 6063-T5 + Tempered Glass',
    standard: 'IEC 62548 / AS/NZS 5033',
    drawnBy: 'ShilpaSutra AI',
    date: new Date().toISOString().slice(0, 10),
    checkedBy: '-',
    approvedBy: '-',
    sheet: '1 of 1',
    rev: 'A',
    project: 'ShilpaSutra PV Lab',
  };

  return Object.freeze({
    id: 'pv-array-24mod-ground',
    title: 'PV Array 24-Module Ground Mount - Engineering Drawing',
    standard: 'IEC 62548 / AS/NZS 5033',
    scale: 200,
    layers: Object.freeze([outlineLayer, sectionLayer, bomLayer, annotationLayer]),
    titleBlock,
    notes: Object.freeze([
      '1. ALL DIMENSIONS IN MILLIMETRES UNLESS OTHERWISE STATED',
      '2. ARRAY: 2 ROWS x 12 COLUMNS, PORTRAIT, 24 MODULES TOTAL',
      '3. TILT: 23deg FIXED, ROW PITCH 5200mm',
      '4. STRUCTURE: GALVANISED STEEL POSTS + C-CHANNEL RAILS',
      '5. FOUNDATION: DRIVEN SCREW PILES dia76, 1500mm DEPTH',
      '6. CLAMP TORQUE: 16 Nm (M8), STAINLESS HARDWARE',
      '7. GROUND CLEARANCE: MIN 300mm',
      '8. CABLE: 4mm2 PV1-F, MC4 CONNECTORS',
    ]),
  });
}
