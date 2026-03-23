"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// Drawing Engine - Professional 2D Engineering Drawing Generation
// ═══════════════════════════════════════════════════════════════════════════════

// ── Types ────────────────────────────────────────────────────────────────────

export type ViewType = "front" | "top" | "right" | "left" | "bottom" | "back" | "isometric" | "section" | "detail" | "auxiliary";

export interface DrawingView {
  id: string;
  type: ViewType;
  position: [number, number];
  scale: number;
  rotation: number;
  visible: boolean;
  label: string;
  lines: DrawingLine[];
  hiddenLines: DrawingLine[];
}

export interface DrawingLine {
  x1: number; y1: number;
  x2: number; y2: number;
  type: "visible" | "hidden" | "center" | "phantom" | "dimension" | "extension" | "leader" | "section" | "construction";
  weight: number;
}

export type DimensionType = "linear" | "angular" | "radial" | "diameter" | "ordinate" | "arc_length" | "chamfer" | "chain" | "baseline";

export type ArrowStyle = "filled" | "open" | "dot" | "tick" | "none";

export interface DimensionAnnotation {
  id: string;
  type: DimensionType;
  startPoint: [number, number];
  endPoint: [number, number];
  textPosition: [number, number];
  value: number;
  text: string;
  tolerance?: { upper: number; lower: number };
  style: {
    arrowStyle: ArrowStyle;
    fontSize: number;
    textHeight: number;
    extensionOffset: number;
    extensionOvershoot: number;
    standard: "ISO" | "ANSI" | "JIS";
  };
  prefix?: string;
  suffix?: string;
  isDriving: boolean;
}

export type GDTType =
  | "position" | "flatness" | "straightness" | "circularity"
  | "cylindricity" | "perpendicularity" | "parallelism" | "angularity"
  | "profile_line" | "profile_surface" | "circular_runout" | "total_runout"
  | "symmetry" | "concentricity";

export type MaterialCondition = "MMC" | "LMC" | "RFS";

export interface GDTSymbol {
  id: string;
  type: GDTType;
  value: number;
  datumRefs: string[];
  materialCondition?: MaterialCondition;
  position: [number, number];
  projectedToleranceZone?: boolean;
  freeState?: boolean;
}

export type SurfaceFinishType = "machined" | "ground" | "lapped" | "polished" | "as_cast" | "as_forged" | "honed" | "EDM" | "laser_cut" | "3D_printed";

export interface SurfaceFinish {
  id: string;
  type: SurfaceFinishType;
  roughness: number;         // Ra in µm
  position: [number, number];
  direction?: number;        // angle in degrees
  layDirection?: "parallel" | "perpendicular" | "crossed" | "multidirectional" | "circular" | "radial";
  maxRoughness?: number;     // Rz
  process?: string;
}

export type WeldType = "fillet" | "groove" | "plug" | "slot" | "spot" | "seam" | "back" | "surfacing" | "flare_v" | "flare_bevel" | "edge" | "j_groove" | "u_groove";

export interface WeldSymbol {
  id: string;
  type: WeldType;
  size?: number;
  length?: number;
  pitch?: number;
  position: [number, number];
  arrowSide: boolean;
  otherSide: boolean;
  allAround: boolean;
  fieldWeld: boolean;
  contour?: "flush" | "convex" | "concave";
  process?: string;
}

export interface TitleBlock {
  companyName: string;
  drawingTitle: string;
  drawingNumber: string;
  revision: string;
  scale: string;
  date: string;
  drawnBy: string;
  checkedBy: string;
  approvedBy: string;
  material: string;
  finish: string;
  weight: string;
  sheet: string;
  tolerance: {
    linear: string;
    angular: string;
    surface: string;
  };
  thirdAngleProjection: boolean;
  units: "mm" | "inch";
  description: string;
}

export interface RevisionEntry {
  rev: string;
  description: string;
  date: string;
  approvedBy: string;
  zone?: string;
}

export type SheetSize = "A0" | "A1" | "A2" | "A3" | "A4" | "letter" | "legal" | "tabloid";

export interface DrawingSheet {
  size: SheetSize;
  orientation: "landscape" | "portrait";
  views: DrawingView[];
  dimensions: DimensionAnnotation[];
  gdtSymbols: GDTSymbol[];
  surfaceFinishes: SurfaceFinish[];
  weldSymbols: WeldSymbol[];
  titleBlock: TitleBlock;
  revisions: RevisionEntry[];
  notes: string[];
  border: boolean;
}

// ── Sheet Dimensions ─────────────────────────────────────────────────────────

const SHEET_SIZES: Record<SheetSize, { width: number; height: number }> = {
  A0: { width: 1189, height: 841 },
  A1: { width: 841, height: 594 },
  A2: { width: 594, height: 420 },
  A3: { width: 420, height: 297 },
  A4: { width: 297, height: 210 },
  letter: { width: 279.4, height: 215.9 },
  legal: { width: 355.6, height: 215.9 },
  tabloid: { width: 431.8, height: 279.4 },
};

export function getSheetDimensions(size: SheetSize, orientation: "landscape" | "portrait"): { width: number; height: number } {
  const dims = SHEET_SIZES[size];
  if (orientation === "landscape") {
    return { width: Math.max(dims.width, dims.height), height: Math.min(dims.width, dims.height) };
  }
  return { width: Math.min(dims.width, dims.height), height: Math.max(dims.width, dims.height) };
}

// ── GD&T Symbols ─────────────────────────────────────────────────────────────

const GDT_SYMBOLS: Record<GDTType, { unicode: string; label: string; category: string }> = {
  position: { unicode: "⌖", label: "Position", category: "Location" },
  flatness: { unicode: "⏥", label: "Flatness", category: "Form" },
  straightness: { unicode: "⏤", label: "Straightness", category: "Form" },
  circularity: { unicode: "○", label: "Circularity", category: "Form" },
  cylindricity: { unicode: "⌭", label: "Cylindricity", category: "Form" },
  perpendicularity: { unicode: "⟂", label: "Perpendicularity", category: "Orientation" },
  parallelism: { unicode: "∥", label: "Parallelism", category: "Orientation" },
  angularity: { unicode: "∠", label: "Angularity", category: "Orientation" },
  profile_line: { unicode: "⌒", label: "Profile of a Line", category: "Profile" },
  profile_surface: { unicode: "⌓", label: "Profile of a Surface", category: "Profile" },
  circular_runout: { unicode: "↗", label: "Circular Runout", category: "Runout" },
  total_runout: { unicode: "↗↗", label: "Total Runout", category: "Runout" },
  symmetry: { unicode: "⌯", label: "Symmetry", category: "Location" },
  concentricity: { unicode: "◎", label: "Concentricity", category: "Location" },
};

export function getGDTUnicodeSymbol(type: GDTType): string {
  return GDT_SYMBOLS[type]?.unicode || "?";
}

export function getAllGDTTypes(): { type: GDTType; label: string; unicode: string; category: string }[] {
  return Object.entries(GDT_SYMBOLS).map(([type, info]) => ({
    type: type as GDTType,
    ...info,
  }));
}

export function createFeatureControlFrame(
  type: GDTType,
  tolerance: number,
  datumRefs: string[] = [],
  materialCondition?: MaterialCondition
): GDTSymbol {
  return {
    id: `gdt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    value: tolerance,
    datumRefs,
    materialCondition,
    position: [0, 0],
  };
}

// ── View Projection Functions ────────────────────────────────────────────────

export type Vertex3D = [number, number, number];
export type Edge3D = [number, number]; // indices into vertex array

/** Project 3D vertices to Front View (XY plane, looking along -Z) */
export function projectToFrontView(
  vertices: Vertex3D[],
  edges: Edge3D[],
  scale: number = 1
): DrawingLine[] {
  return edges.map(([i, j]) => ({
    x1: vertices[i][0] * scale,
    y1: -vertices[i][1] * scale,
    x2: vertices[j][0] * scale,
    y2: -vertices[j][1] * scale,
    type: "visible" as const,
    weight: 0.5,
  }));
}

/** Project 3D vertices to Top View (XZ plane, looking along -Y) */
export function projectToTopView(
  vertices: Vertex3D[],
  edges: Edge3D[],
  scale: number = 1
): DrawingLine[] {
  return edges.map(([i, j]) => ({
    x1: vertices[i][0] * scale,
    y1: -vertices[i][2] * scale,
    x2: vertices[j][0] * scale,
    y2: -vertices[j][2] * scale,
    type: "visible" as const,
    weight: 0.5,
  }));
}

/** Project 3D vertices to Right View (YZ plane, looking along +X) */
export function projectToRightView(
  vertices: Vertex3D[],
  edges: Edge3D[],
  scale: number = 1
): DrawingLine[] {
  return edges.map(([i, j]) => ({
    x1: vertices[i][2] * scale,
    y1: -vertices[i][1] * scale,
    x2: vertices[j][2] * scale,
    y2: -vertices[j][1] * scale,
    type: "visible" as const,
    weight: 0.5,
  }));
}

/** Project 3D vertices to Isometric View */
export function projectToIsometric(
  vertices: Vertex3D[],
  edges: Edge3D[],
  scale: number = 1
): DrawingLine[] {
  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);

  const project = (v: Vertex3D): [number, number] => [
    (v[0] * cos30 - v[2] * cos30) * scale,
    -(v[0] * sin30 + v[2] * sin30 - v[1]) * scale,
  ];

  return edges.map(([i, j]) => {
    const p1 = project(vertices[i]);
    const p2 = project(vertices[j]);
    return {
      x1: p1[0], y1: p1[1],
      x2: p2[0], y2: p2[1],
      type: "visible" as const,
      weight: 0.5,
    };
  });
}

// ── Dimension Functions ──────────────────────────────────────────────────────

export function createLinearDimension(
  p1: [number, number],
  p2: [number, number],
  offset: number = 10,
  standard: "ISO" | "ANSI" | "JIS" = "ISO"
): DimensionAnnotation {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const perpAngle = angle + Math.PI / 2;

  const textX = (p1[0] + p2[0]) / 2 + Math.cos(perpAngle) * offset;
  const textY = (p1[1] + p2[1]) / 2 + Math.sin(perpAngle) * offset;

  return {
    id: `dim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: "linear",
    startPoint: p1,
    endPoint: p2,
    textPosition: [textX, textY],
    value: length,
    text: length.toFixed(2),
    style: {
      arrowStyle: standard === "ISO" ? "filled" : "open",
      fontSize: 3.5,
      textHeight: 3.5,
      extensionOffset: 1.5,
      extensionOvershoot: 2,
      standard,
    },
    isDriving: true,
  };
}

export function createAngularDimension(
  center: [number, number],
  p1: [number, number],
  p2: [number, number]
): DimensionAnnotation {
  const angle1 = Math.atan2(p1[1] - center[1], p1[0] - center[0]);
  const angle2 = Math.atan2(p2[1] - center[1], p2[0] - center[0]);
  let angleDeg = ((angle2 - angle1) * 180) / Math.PI;
  if (angleDeg < 0) angleDeg += 360;

  const midAngle = (angle1 + angle2) / 2;
  const radius = Math.sqrt(
    ((p1[0] - center[0]) ** 2 + (p1[1] - center[1]) ** 2 +
     (p2[0] - center[0]) ** 2 + (p2[1] - center[1]) ** 2) / 2
  );

  return {
    id: `dim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: "angular",
    startPoint: p1,
    endPoint: p2,
    textPosition: [
      center[0] + Math.cos(midAngle) * radius * 1.2,
      center[1] + Math.sin(midAngle) * radius * 1.2,
    ],
    value: angleDeg,
    text: `${angleDeg.toFixed(1)}°`,
    style: {
      arrowStyle: "filled",
      fontSize: 3.5,
      textHeight: 3.5,
      extensionOffset: 1.5,
      extensionOvershoot: 2,
      standard: "ISO",
    },
    isDriving: true,
  };
}

export function createRadialDimension(
  center: [number, number],
  radius: number,
  angle: number = 45
): DimensionAnnotation {
  const rad = (angle * Math.PI) / 180;
  const endPoint: [number, number] = [
    center[0] + Math.cos(rad) * radius,
    center[1] + Math.sin(rad) * radius,
  ];

  return {
    id: `dim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: "radial",
    startPoint: center,
    endPoint,
    textPosition: [
      center[0] + Math.cos(rad) * radius * 0.6,
      center[1] + Math.sin(rad) * radius * 0.6,
    ],
    value: radius,
    text: `R${radius.toFixed(2)}`,
    prefix: "R",
    isDriving: true,
    style: {
      arrowStyle: "filled",
      fontSize: 3.5,
      textHeight: 3.5,
      extensionOffset: 1.5,
      extensionOvershoot: 2,
      standard: "ISO",
    },
  };
}

export function createDiameterDimension(
  center: [number, number],
  diameter: number,
  angle: number = 45
): DimensionAnnotation {
  const rad = (angle * Math.PI) / 180;
  const r = diameter / 2;

  return {
    id: `dim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: "diameter",
    startPoint: [center[0] - Math.cos(rad) * r, center[1] - Math.sin(rad) * r],
    endPoint: [center[0] + Math.cos(rad) * r, center[1] + Math.sin(rad) * r],
    textPosition: [
      center[0] + Math.cos(rad) * r * 0.5,
      center[1] + Math.sin(rad) * r * 0.5 - 3,
    ],
    value: diameter,
    text: `⌀${diameter.toFixed(2)}`,
    prefix: "⌀",
    isDriving: true,
    style: {
      arrowStyle: "filled",
      fontSize: 3.5,
      textHeight: 3.5,
      extensionOffset: 1.5,
      extensionOvershoot: 2,
      standard: "ISO",
    },
  };
}

export function formatDimensionText(
  value: number,
  tolerance?: { upper: number; lower: number },
  prefix?: string,
  suffix?: string
): string {
  let text = prefix || "";
  text += value.toFixed(2);
  if (tolerance) {
    if (tolerance.upper === -tolerance.lower) {
      text += ` ±${Math.abs(tolerance.upper).toFixed(3)}`;
    } else {
      text += ` +${tolerance.upper.toFixed(3)}/-${Math.abs(tolerance.lower).toFixed(3)}`;
    }
  }
  text += suffix || "";
  return text;
}

/** Auto-detect dimensions from bounding box */
export function autoDetectDimensions(
  boundingBox: { min: [number, number, number]; max: [number, number, number] }
): DimensionAnnotation[] {
  const { min, max } = boundingBox;
  const width = max[0] - min[0];
  const height = max[1] - min[1];
  const depth = max[2] - min[2];

  const dims: DimensionAnnotation[] = [];

  // Width dimension (bottom of front view)
  if (width > 0.01) {
    dims.push(createLinearDimension(
      [min[0], -min[1] + 10],
      [max[0], -min[1] + 10],
      8
    ));
  }

  // Height dimension (right of front view)
  if (height > 0.01) {
    dims.push(createLinearDimension(
      [max[0] + 10, -min[1]],
      [max[0] + 10, -max[1]],
      8
    ));
  }

  // Depth dimension (bottom of top view)
  if (depth > 0.01) {
    dims.push(createLinearDimension(
      [min[0], -min[2] + 10],
      [max[0], -max[2] + 10],
      8
    ));
  }

  return dims;
}

// ── Title Block ──────────────────────────────────────────────────────────────

export function createDefaultTitleBlock(): TitleBlock {
  return {
    companyName: "ShilpaSutra Engineering",
    drawingTitle: "Untitled Drawing",
    drawingNumber: "DWG-001",
    revision: "A",
    scale: "1:1",
    date: new Date().toISOString().split("T")[0],
    drawnBy: "",
    checkedBy: "",
    approvedBy: "",
    material: "Steel AISI 1045",
    finish: "As machined",
    weight: "",
    sheet: "1 of 1",
    tolerance: {
      linear: "±0.1 mm",
      angular: "±0.5°",
      surface: "Ra 3.2 µm",
    },
    thirdAngleProjection: true,
    units: "mm",
    description: "",
  };
}

export function renderTitleBlockSVG(
  block: TitleBlock,
  x: number,
  y: number,
  width: number,
  height: number
): string {
  const row = height / 8;
  const col = width / 4;

  return `
    <g transform="translate(${x},${y})">
      <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#333" stroke-width="0.5"/>
      <!-- Company name -->
      <rect x="0" y="0" width="${width}" height="${row * 2}" fill="none" stroke="#333" stroke-width="0.3"/>
      <text x="${width / 2}" y="${row * 1.2}" text-anchor="middle" font-size="5" font-weight="bold" fill="#ccc">${block.companyName}</text>
      <!-- Drawing title -->
      <rect x="0" y="${row * 2}" width="${width}" height="${row * 2}" fill="none" stroke="#333" stroke-width="0.3"/>
      <text x="${width / 2}" y="${row * 3.2}" text-anchor="middle" font-size="4" fill="#aaa">${block.drawingTitle}</text>
      <!-- Drawing number + Rev -->
      <rect x="0" y="${row * 4}" width="${col * 3}" height="${row}" fill="none" stroke="#333" stroke-width="0.3"/>
      <text x="2" y="${row * 4.8}" font-size="2.5" fill="#888">DWG NO: <tspan fill="#ccc">${block.drawingNumber}</tspan></text>
      <rect x="${col * 3}" y="${row * 4}" width="${col}" height="${row}" fill="none" stroke="#333" stroke-width="0.3"/>
      <text x="${col * 3 + 2}" y="${row * 4.8}" font-size="2.5" fill="#888">REV: <tspan fill="#ccc">${block.revision}</tspan></text>
      <!-- Scale + Date -->
      <rect x="0" y="${row * 5}" width="${col * 2}" height="${row}" fill="none" stroke="#333" stroke-width="0.3"/>
      <text x="2" y="${row * 5.8}" font-size="2.5" fill="#888">SCALE: <tspan fill="#ccc">${block.scale}</tspan></text>
      <rect x="${col * 2}" y="${row * 5}" width="${col * 2}" height="${row}" fill="none" stroke="#333" stroke-width="0.3"/>
      <text x="${col * 2 + 2}" y="${row * 5.8}" font-size="2.5" fill="#888">DATE: <tspan fill="#ccc">${block.date}</tspan></text>
      <!-- Drawn/Checked/Approved -->
      <rect x="0" y="${row * 6}" width="${col * 2}" height="${row}" fill="none" stroke="#333" stroke-width="0.3"/>
      <text x="2" y="${row * 6.8}" font-size="2.5" fill="#888">DRAWN: <tspan fill="#ccc">${block.drawnBy}</tspan></text>
      <rect x="${col * 2}" y="${row * 6}" width="${col}" height="${row}" fill="none" stroke="#333" stroke-width="0.3"/>
      <text x="${col * 2 + 2}" y="${row * 6.8}" font-size="2.5" fill="#888">CHK: <tspan fill="#ccc">${block.checkedBy}</tspan></text>
      <rect x="${col * 3}" y="${row * 6}" width="${col}" height="${row}" fill="none" stroke="#333" stroke-width="0.3"/>
      <text x="${col * 3 + 2}" y="${row * 6.8}" font-size="2.5" fill="#888">APR: <tspan fill="#ccc">${block.approvedBy}</tspan></text>
      <!-- Material + Weight -->
      <rect x="0" y="${row * 7}" width="${col * 2}" height="${row}" fill="none" stroke="#333" stroke-width="0.3"/>
      <text x="2" y="${row * 7.8}" font-size="2.5" fill="#888">MAT: <tspan fill="#ccc">${block.material}</tspan></text>
      <rect x="${col * 2}" y="${row * 7}" width="${col}" height="${row}" fill="none" stroke="#333" stroke-width="0.3"/>
      <text x="${col * 2 + 2}" y="${row * 7.8}" font-size="2.5" fill="#888">WT: <tspan fill="#ccc">${block.weight}</tspan></text>
      <rect x="${col * 3}" y="${row * 7}" width="${col}" height="${row}" fill="none" stroke="#333" stroke-width="0.3"/>
      <text x="${col * 3 + 2}" y="${row * 7.8}" font-size="2.5" fill="#888">SHT: <tspan fill="#ccc">${block.sheet}</tspan></text>
      <!-- Projection symbol -->
      ${block.thirdAngleProjection ?
        `<circle cx="${width - 8}" cy="${row * 1}" r="2" fill="none" stroke="#666" stroke-width="0.3"/>
         <line x1="${width - 12}" y1="${row * 1}" x2="${width - 4}" y2="${row * 1}" stroke="#666" stroke-width="0.3"/>` : ""}
    </g>
  `;
}

// ── SVG Export ────────────────────────────────────────────────────────────────

export function generateSVG(sheet: DrawingSheet): string {
  const dims = getSheetDimensions(sheet.size, sheet.orientation);
  const margin = 10;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}mm" height="${dims.height}mm" viewBox="0 0 ${dims.width} ${dims.height}" style="background:#0d1117">
<style>
  text { font-family: 'Arial', sans-serif; }
  .dim-text { font-size: 3.5px; fill: #00D4FF; }
  .dim-line { stroke: #00D4FF; stroke-width: 0.3; }
  .visible-line { stroke: #e0e0e0; stroke-width: 0.5; }
  .hidden-line { stroke: #666; stroke-width: 0.3; stroke-dasharray: 3,1.5; }
  .center-line { stroke: #00aa00; stroke-width: 0.2; stroke-dasharray: 8,2,2,2; }
</style>
`;

  // Border
  if (sheet.border) {
    svg += `<rect x="${margin}" y="${margin}" width="${dims.width - 2 * margin}" height="${dims.height - 2 * margin}" fill="none" stroke="#444" stroke-width="0.7"/>
`;
  }

  // Views
  for (const view of sheet.views) {
    if (!view.visible) continue;
    svg += `<g transform="translate(${view.position[0]},${view.position[1]})">
`;
    // View label
    svg += `<text x="0" y="-5" font-size="3" fill="#888" text-anchor="middle">${view.label}</text>
`;
    // Visible lines
    for (const line of view.lines) {
      const cls = line.type === "hidden" ? "hidden-line" : line.type === "center" ? "center-line" : "visible-line";
      svg += `  <line x1="${line.x1}" y1="${line.y1}" x2="${line.x2}" y2="${line.y2}" class="${cls}"/>
`;
    }
    // Hidden lines
    for (const line of view.hiddenLines) {
      svg += `  <line x1="${line.x1}" y1="${line.y1}" x2="${line.x2}" y2="${line.y2}" class="hidden-line"/>
`;
    }
    svg += `</g>
`;
  }

  // Dimensions
  for (const dim of sheet.dimensions) {
    svg += renderDimensionSVG(dim);
  }

  // GD&T symbols
  for (const gdt of sheet.gdtSymbols) {
    svg += renderGDTSVG(gdt);
  }

  // Title block
  const tbWidth = 120;
  const tbHeight = 40;
  svg += renderTitleBlockSVG(
    sheet.titleBlock,
    dims.width - margin - tbWidth,
    dims.height - margin - tbHeight,
    tbWidth,
    tbHeight
  );

  // Notes
  if (sheet.notes.length > 0) {
    svg += `<g transform="translate(${margin + 5},${dims.height - margin - tbHeight - 10})">
`;
    svg += `<text x="0" y="0" font-size="3" font-weight="bold" fill="#aaa">NOTES:</text>
`;
    sheet.notes.forEach((note, i) => {
      svg += `<text x="0" y="${(i + 1) * 4}" font-size="2.5" fill="#888">${i + 1}. ${note}</text>
`;
    });
    svg += `</g>
`;
  }

  svg += `</svg>`;
  return svg;
}

function renderDimensionSVG(dim: DimensionAnnotation): string {
  const { startPoint: s, endPoint: e, textPosition: t, text } = dim;
  return `
  <g class="dimension">
    <line x1="${s[0]}" y1="${s[1]}" x2="${e[0]}" y2="${e[1]}" class="dim-line"/>
    <line x1="${s[0]}" y1="${s[1]}" x2="${s[0]}" y2="${t[1]}" class="dim-line" stroke-dasharray="1,1"/>
    <line x1="${e[0]}" y1="${e[1]}" x2="${e[0]}" y2="${t[1]}" class="dim-line" stroke-dasharray="1,1"/>
    <polygon points="${s[0]},${t[1]} ${s[0]+1.5},${t[1]-0.8} ${s[0]+1.5},${t[1]+0.8}" fill="#00D4FF"/>
    <polygon points="${e[0]},${t[1]} ${e[0]-1.5},${t[1]-0.8} ${e[0]-1.5},${t[1]+0.8}" fill="#00D4FF"/>
    <text x="${t[0]}" y="${t[1] - 1}" class="dim-text" text-anchor="middle">${text}</text>
  </g>
`;
}

function renderGDTSVG(gdt: GDTSymbol): string {
  const { position: p, type, value, datumRefs } = gdt;
  const symbol = getGDTUnicodeSymbol(type);
  const width = 12 + datumRefs.length * 6;

  return `
  <g transform="translate(${p[0]},${p[1]})">
    <rect x="0" y="-4" width="${width}" height="8" fill="none" stroke="#ffaa00" stroke-width="0.3"/>
    <line x1="6" y1="-4" x2="6" y2="4" stroke="#ffaa00" stroke-width="0.3"/>
    <text x="3" y="1.5" font-size="4" fill="#ffaa00" text-anchor="middle">${symbol}</text>
    <text x="9" y="1.5" font-size="2.5" fill="#ffaa00" text-anchor="middle">${value.toFixed(3)}</text>
    ${datumRefs.map((d, i) => `
      <line x1="${12 + i * 6}" y1="-4" x2="${12 + i * 6}" y2="4" stroke="#ffaa00" stroke-width="0.3"/>
      <text x="${15 + i * 6}" y="1.5" font-size="2.5" fill="#ffaa00" text-anchor="middle">${d}</text>
    `).join("")}
  </g>
`;
}

// ── DXF Export ────────────────────────────────────────────────────────────────

export function generateDXF(sheet: DrawingSheet): string {
  let dxf = `0\nSECTION\n2\nHEADER\n0\nENDSEC\n`;
  dxf += `0\nSECTION\n2\nENTITIES\n`;

  // Export all view lines
  for (const view of sheet.views) {
    if (!view.visible) continue;
    for (const line of [...view.lines, ...view.hiddenLines]) {
      dxf += `0\nLINE\n8\n0\n`;
      dxf += `10\n${(view.position[0] + line.x1).toFixed(4)}\n`;
      dxf += `20\n${(view.position[1] + line.y1).toFixed(4)}\n`;
      dxf += `30\n0.0\n`;
      dxf += `11\n${(view.position[0] + line.x2).toFixed(4)}\n`;
      dxf += `21\n${(view.position[1] + line.y2).toFixed(4)}\n`;
      dxf += `31\n0.0\n`;
    }
  }

  // Export dimensions as text
  for (const dim of sheet.dimensions) {
    dxf += `0\nTEXT\n8\nDIMENSIONS\n`;
    dxf += `10\n${dim.textPosition[0].toFixed(4)}\n`;
    dxf += `20\n${dim.textPosition[1].toFixed(4)}\n`;
    dxf += `30\n0.0\n`;
    dxf += `40\n3.5\n`;
    dxf += `1\n${dim.text}\n`;
  }

  dxf += `0\nENDSEC\n0\nEOF\n`;
  return dxf;
}

// ── Drawing Sheet Factory ────────────────────────────────────────────────────

export function createDrawingSheet(
  size: SheetSize = "A3",
  orientation: "landscape" | "portrait" = "landscape"
): DrawingSheet {
  return {
    size,
    orientation,
    views: [],
    dimensions: [],
    gdtSymbols: [],
    surfaceFinishes: [],
    weldSymbols: [],
    titleBlock: createDefaultTitleBlock(),
    revisions: [],
    notes: [
      "ALL DIMENSIONS IN MILLIMETERS",
      "REMOVE ALL BURRS AND SHARP EDGES",
      "GENERAL TOLERANCE PER ISO 2768-mK",
    ],
    border: true,
  };
}
