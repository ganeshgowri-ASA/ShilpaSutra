"use client";
import { create } from "zustand";
import * as THREE from "three";

export type ToolId =
  | "select"
  | "box"
  | "cylinder"
  | "sphere"
  | "cone"
  | "line"
  | "polyline"
  | "arc"
  | "arc_3point"
  | "arc_tangent"
  | "circle"
  | "circle_3point"
  | "rectangle"
  | "center_rectangle"
  | "polygon"
  | "spline"
  | "ellipse"
  | "construction_line"
  | "centerline"
  | "point"
  | "slot"
  | "slot_arc"
  | "parabola"
  | "sketch_text"
  | "hatch"
  | "revision_cloud"
  | "infinite_line"
  | "multiline"
  | "delete"
  | "measure"
  | "measure_angle"
  | "extrude"
  | "extrude_cut"
  | "revolve"
  | "revolve_cut"
  | "loft"
  | "sweep"
  | "boolean_union"
  | "boolean_subtract"
  | "boolean_intersect"
  | "fillet"
  | "chamfer"
  | "shell"
  | "draft"
  | "mirror"
  | "scale_tool"
  | "move_tool"
  | "rotate_tool"
  | "linear_pattern"
  | "circular_pattern"
  | "path_pattern"
  | "section_view"
  | "mass_properties"
  | "hole_wizard"
  | "trim"
  | "power_trim"
  | "extend"
  | "offset"
  | "offset_entities"
  | "convert_entities"
  | "mirror_sketch"
  | "mirror_entities"
  | "split_entities"
  | "sketch_fillet"
  | "sketch_chamfer"
  | "move_entities"
  | "copy_entities"
  | "rotate_entities"
  | "linear_sketch_pattern"
  | "circular_sketch_pattern"
  | "interference_check"
  | "ai_text_to_cad"
  | "ai_suggest"
  | "ai_optimize"
  | "ai_explain";

export type TransformMode = "translate" | "rotate" | "scale";

export type RibbonTab = "sketch" | "solid" | "modify" | "inspect" | "view" | "ai" | "constraints";

export type ViewMode = "wireframe" | "shaded" | "realistic";

export type UnitType = "mm" | "cm" | "m" | "inch";

export type FeatureType =
  | "boolean_union"
  | "boolean_subtract"
  | "boolean_intersect"
  | "extrude"
  | "extrude_cut"
  | "revolve"
  | "revolve_cut"
  | "linear_pattern"
  | "circular_pattern"
  | "fillet"
  | "chamfer"
  | "shell"
  | "draft"
  | "mirror_feature"
  | "loft"
  | "sweep"
  | "hole"
  | "sketch_group"
  | "component";

export interface CadObject {
  id: string;
  type: "box" | "cylinder" | "sphere" | "cone" | "line" | "polyline" | "arc" | "circle" | "rectangle" | "polygon" | "ellipse" | "spline" | "mesh" | "point" | "slot" | "centerline" | "hatch" | "revision_cloud" | "infinite_line" | "multiline";
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  dimensions: { width: number; height: number; depth: number };
  material: string;
  color: string;
  visible: boolean;
  locked: boolean;
  // Material properties
  opacity: number;
  metalness: number;
  roughness: number;
  // Line-specific
  linePoints?: [number, number, number][];
  // Arc-specific
  arcPoints?: [number, number, number][];
  arcRadius?: number;
  // Circle-specific
  circleCenter?: [number, number, number];
  circleRadius?: number;
  // Rectangle-specific
  rectCorners?: [[number, number, number], [number, number, number]];
  // Mesh-specific (AI-generated, CSG result, extrude, revolve)
  meshVertices?: number[];
  meshIndices?: number[];
  // Feature metadata
  featureType?: FeatureType;
  featureParams?: Record<string, unknown>;
  sketchPlane?: "xy" | "xz" | "yz";
  // Sketch profile grouping
  sketchId?: string; // ID of parent sketch group this entity belongs to
  isProfile?: boolean; // Whether this is a closed profile suitable for extrude
  isConstruction?: boolean; // Construction geometry (reference only, not solid)
  // Polygon-specific
  polygonPoints?: [number, number, number][];
  polygonSides?: number;
  // Component metadata
  componentType?: string; // e.g., "hex_bolt", "spur_gear"
  componentParams?: Record<string, number>;
  // Spline-specific
  splinePoints?: [number, number, number][];
  // Ellipse-specific
  ellipseCenter?: [number, number, number];
  ellipseRx?: number;
  ellipseRy?: number;
  // Point-specific
  pointPosition?: [number, number, number];
  // Slot-specific
  slotCenter1?: [number, number, number];
  slotCenter2?: [number, number, number];
  slotWidth?: number;
  // Centerline-specific (same as line but construction)
  centerlinePoints?: [number, number, number][];
  // Polyline-specific
  polylinePoints?: [number, number, number][];
  polylineClosed?: boolean;
  // Hatch-specific
  hatchPattern?: "solid" | "ansi31" | "ansi32" | "ansi33" | "ansi34" | "ansi37" | "cross" | "dots" | "brick" | "stone" | "grass";
  hatchScale?: number;
  hatchAngle?: number;
  hatchBoundary?: [number, number, number][];
  // Revision cloud
  cloudPoints?: [number, number, number][];
  cloudArcRadius?: number;
  // Layer assignment
  layerId?: string;
  // Suppression state (SolidWorks-style)
  suppressed?: boolean;
  // Parent/child dependency tracking
  parentFeatureId?: string;
  childFeatureIds?: string[];
}

export interface FeatureNode {
  id: string;
  type: string;
  name: string;
  objectId: string;
  parentId?: string;
  children: string[];
  visible: boolean;
  locked: boolean;
  expanded: boolean;
  params?: Record<string, unknown>;
  sketchStatus?: "editing" | "locked";
}

export interface Measurement {
  id: string;
  type: "distance" | "angle";
  points: [number, number, number][];
  value: number;
  unit: string;
}

const materialColors: Record<string, string> = {
  "Steel (AISI 1045)": "#8899aa",
  "Aluminum 6061-T6": "#c0c8d0",
  "Titanium Ti-6Al-4V": "#7a8a9a",
  "ABS Plastic": "#e94560",
  "Copper C110": "#b87333",
  "Brass C360": "#c9a84c",
  "Nylon PA6": "#e8e0d0",
  "Polycarbonate": "#d0e8ff",
};

export const getMaterialColor = (mat: string) =>
  materialColors[mat] || "#4a9eff";

export const materialList = Object.keys(materialColors);

let idCounter = 0;

const MAX_HISTORY = 50;

// ── Unit conversion: everything → mm, then mm → scene units (1 scene unit = 10mm) ──

const UNIT_TO_MM: Record<string, number> = {
  mm: 1, millimeter: 1, millimeters: 1, millimetre: 1, millimetres: 1,
  cm: 10, centimeter: 10, centimeters: 10, centimetre: 10, centimetres: 10,
  m: 1000, meter: 1000, meters: 1000, metre: 1000, metres: 1000,
  in: 25.4, inch: 25.4, inches: 25.4, '"': 25.4,
  ft: 304.8, foot: 304.8, feet: 304.8, "'": 304.8,
};

const MM_TO_SCENE = 1 / 10; // 10mm = 1 scene unit

function parseValueWithUnit(token: string): number | null {
  // e.g. "2m", "35mm", "1.5in", "200", "12ft"
  const m = token.match(/^([0-9]*\.?[0-9]+)\s*(mm|cm|m|in|inch|inches|ft|foot|feet|meter|meters|metre|metres|millimeter|millimeters|centimeter|centimeters|"|')?$/i);
  if (!m) return null;
  const val = parseFloat(m[1]);
  const unit = (m[2] || "mm").toLowerCase();
  const factor = UNIT_TO_MM[unit] ?? 1;
  return val * factor * MM_TO_SCENE;
}

interface ParsedDims { width: number; height: number; depth: number }

function parseDimensions(text: string): ParsedDims | null {
  // Pattern: "2m x 1m x 35mm" or "200x100x50" or "2m by 1m by 35mm"
  const dimPattern = /([0-9]*\.?[0-9]+)\s*(mm|cm|m|in|inch|inches|ft|foot|feet)?\s*[x×by]+\s*([0-9]*\.?[0-9]+)\s*(mm|cm|m|in|inch|inches|ft|foot|feet)?\s*(?:[x×by]+\s*([0-9]*\.?[0-9]+)\s*(mm|cm|m|in|inch|inches|ft|foot|feet)?)?/i;
  const m = text.match(dimPattern);
  if (!m) return null;
  const u1 = (m[2] || "mm").toLowerCase();
  const u2 = (m[4] || m[2] || "mm").toLowerCase();
  const u3 = (m[6] || m[4] || m[2] || "mm").toLowerCase();
  const w = parseFloat(m[1]) * (UNIT_TO_MM[u1] ?? 1) * MM_TO_SCENE;
  const h = parseFloat(m[3]) * (UNIT_TO_MM[u2] ?? 1) * MM_TO_SCENE;
  const d = m[5] ? parseFloat(m[5]) * (UNIT_TO_MM[u3] ?? 1) * MM_TO_SCENE : h;
  return { width: w, height: d, depth: h }; // w=X, height=Y(thickness), depth=Z
}

function parseSingleDim(text: string, keyword: string): number | null {
  const re = new RegExp(keyword + "\\s*:?\\s*([0-9]*\\.?[0-9]+)\\s*(mm|cm|m|in|inch|inches|ft|foot|feet)?", "i");
  const m = text.match(re);
  if (!m) return null;
  const unit = (m[2] || "mm").toLowerCase();
  return parseFloat(m[1]) * (UNIT_TO_MM[unit] ?? 1) * MM_TO_SCENE;
}

function parseOdId(text: string): { od: number; id: number } | null {
  const odM = text.match(/OD\s*:?\s*([0-9]*\.?[0-9]+)\s*(mm|cm|m|in|inch|inches|ft|foot|feet)?/i);
  const idM = text.match(/ID\s*:?\s*([0-9]*\.?[0-9]+)\s*(mm|cm|m|in|inch|inches|ft|foot|feet)?/i);
  if (!odM || !idM) return null;
  const odU = (odM[2] || "mm").toLowerCase();
  const idU = (idM[2] || "mm").toLowerCase();
  return {
    od: parseFloat(odM[1]) * (UNIT_TO_MM[odU] ?? 1) * MM_TO_SCENE,
    id: parseFloat(idM[1]) * (UNIT_TO_MM[idU] ?? 1) * MM_TO_SCENE,
  };
}

// ── Material inference ──

interface MaterialInfo { material: string; color: string; metalness: number; roughness: number }

function inferMaterial(text: string): MaterialInfo {
  const t = text.toLowerCase();
  if (/alumini?um|alu\b/i.test(t)) return { material: "Aluminum 6061-T6", color: "#c0c8d0", metalness: 0.7, roughness: 0.3 };
  if (/steel|stainless/i.test(t)) return { material: "Steel (AISI 1045)", color: "#8899aa", metalness: 0.6, roughness: 0.4 };
  if (/titanium/i.test(t)) return { material: "Titanium Ti-6Al-4V", color: "#7a8a9a", metalness: 0.6, roughness: 0.35 };
  if (/copper/i.test(t)) return { material: "Copper C110", color: "#b87333", metalness: 0.8, roughness: 0.25 };
  if (/brass/i.test(t)) return { material: "Brass C360", color: "#c9a84c", metalness: 0.7, roughness: 0.3 };
  if (/plastic|abs|pla\b|nylon|polymer|polycarbonate|pc\b|pvc/i.test(t)) return { material: "ABS Plastic", color: "#e0e0e0", metalness: 0.0, roughness: 0.7 };
  if (/glass|transparent/i.test(t)) return { material: "Polycarbonate", color: "#d0e8ff", metalness: 0.1, roughness: 0.1 };
  if (/wood|timber/i.test(t)) return { material: "Nylon PA6", color: "#b08050", metalness: 0.0, roughness: 0.8 };
  // default
  return { material: "Steel (AISI 1045)", color: "#8899aa", metalness: 0.4, roughness: 0.5 };
}

// ── Geometry serialization helper ──

function serializeGeometry(geo: THREE.BufferGeometry): { meshVertices: number[]; meshIndices: number[] } {
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const meshVertices: number[] = [];
  for (let i = 0; i < pos.count; i++) meshVertices.push(pos.getX(i), pos.getY(i), pos.getZ(i));
  const idx = geo.index;
  const meshIndices: number[] = [];
  if (idx) { for (let i = 0; i < idx.count; i++) meshIndices.push(idx.getX(i)); }
  else { for (let i = 0; i < pos.count; i++) meshIndices.push(i); }
  geo.dispose();
  return { meshVertices, meshIndices };
}

// ── Complex object builders (return partial CadObject) ──

function buildPVModule(dims: ParsedDims, mat: MaterialInfo): Partial<CadObject>[] {
  const { width: w, depth: d, height: frameH } = dims;
  const glassThick = frameH * 0.6;
  const cellInset = w * 0.05;

  // Frame (aluminium extrusion border)
  const frameShape = new THREE.Shape();
  frameShape.moveTo(-w / 2, -d / 2);
  frameShape.lineTo(w / 2, -d / 2);
  frameShape.lineTo(w / 2, d / 2);
  frameShape.lineTo(-w / 2, d / 2);
  frameShape.closePath();
  const frameHole = new THREE.Path();
  const inset = w * 0.02;
  frameHole.moveTo(-w / 2 + inset, -d / 2 + inset);
  frameHole.lineTo(w / 2 - inset, -d / 2 + inset);
  frameHole.lineTo(w / 2 - inset, d / 2 - inset);
  frameHole.lineTo(-w / 2 + inset, d / 2 - inset);
  frameHole.closePath();
  frameShape.holes.push(frameHole);
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: frameH, bevelEnabled: false });
  frameGeo.rotateX(-Math.PI / 2);
  frameGeo.translate(0, frameH / 2, 0);
  const frameMesh = serializeGeometry(frameGeo);

  // Glass panel
  const glassGeo = new THREE.BoxGeometry(w - inset * 2, glassThick, d - inset * 2);
  glassGeo.translate(0, frameH * 0.55, 0);
  const glassMesh = serializeGeometry(glassGeo);

  // Solar cells (thin dark layer)
  const cellW = w - cellInset * 2;
  const cellD = d - cellInset * 2;
  const cellGeo = new THREE.BoxGeometry(cellW, frameH * 0.05, cellD);
  cellGeo.translate(0, frameH * 0.45, 0);
  const cellMesh = serializeGeometry(cellGeo);

  return [
    {
      type: "mesh" as const, name: "PV Module - Frame",
      dimensions: { width: w, height: frameH, depth: d },
      position: [0, frameH / 2, 0],
      ...frameMesh,
      material: "Aluminum 6061-T6", color: "#c0c8d0", metalness: 0.7, roughness: 0.3,
      componentType: "pv_module_frame",
    },
    {
      type: "mesh" as const, name: "PV Module - Glass",
      dimensions: { width: w - inset * 2, height: glassThick, depth: d - inset * 2 },
      position: [0, frameH * 0.55, 0],
      ...glassMesh,
      material: "Polycarbonate", color: "#88bbee", metalness: 0.1, roughness: 0.1,
      opacity: 0.85,
      componentType: "pv_module_glass",
    },
    {
      type: "mesh" as const, name: "PV Module - Cells",
      dimensions: { width: cellW, height: frameH * 0.05, depth: cellD },
      position: [0, frameH * 0.45, 0],
      ...cellMesh,
      material: "ABS Plastic", color: "#1a1a3a", metalness: 0.2, roughness: 0.6,
      componentType: "pv_module_cells",
    },
  ];
}

function buildBolt(size: number, length: number, mat: MaterialInfo): Partial<CadObject>[] {
  // size = M diameter in scene units, length in scene units
  const headH = size * 0.7;
  const headW = size * 1.7; // across-flats ≈ 1.7x nominal
  const shaftR = size / 2;

  // Hex head
  const hexShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const x = Math.cos(a) * headW / 2;
    const y = Math.sin(a) * headW / 2;
    if (i === 0) hexShape.moveTo(x, y); else hexShape.lineTo(x, y);
  }
  hexShape.closePath();
  const headGeo = new THREE.ExtrudeGeometry(hexShape, { depth: headH, bevelEnabled: false });
  headGeo.rotateX(-Math.PI / 2);
  headGeo.translate(0, length + headH / 2, 0);
  const headMesh = serializeGeometry(headGeo);

  // Shaft (cylinder)
  const shaftGeo = new THREE.CylinderGeometry(shaftR, shaftR, length, 24);
  shaftGeo.translate(0, length / 2, 0);
  const shaftMesh = serializeGeometry(shaftGeo);

  return [
    {
      type: "mesh" as const, name: `Bolt M${Math.round(size / MM_TO_SCENE)} - Head`,
      dimensions: { width: headW, height: headH, depth: headW },
      position: [0, length + headH / 2, 0],
      ...headMesh, ...mat,
      componentType: "hex_bolt_head",
    },
    {
      type: "mesh" as const, name: `Bolt M${Math.round(size / MM_TO_SCENE)} - Shaft`,
      dimensions: { width: shaftR * 2, height: length, depth: shaftR * 2 },
      position: [0, length / 2, 0],
      ...shaftMesh, ...mat,
      componentType: "hex_bolt_shaft",
    },
  ];
}

function buildPipe(od: number, id: number, length: number, mat: MaterialInfo): Partial<CadObject>[] {
  const outerR = od / 2;
  const innerR = id / 2;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, length / 2, 0);
  const mesh = serializeGeometry(geo);
  return [{
    type: "mesh" as const, name: `Pipe OD${Math.round(od / MM_TO_SCENE)}`,
    dimensions: { width: od, height: length, depth: od },
    position: [0, length / 2, 0],
    ...mesh, ...mat,
    componentType: "hollow_pipe",
    componentParams: { od: od / MM_TO_SCENE, id: id / MM_TO_SCENE, length: length / MM_TO_SCENE },
  }];
}

function buildBracket(w: number, h: number, thickness: number, mat: MaterialInfo): Partial<CadObject>[] {
  // L-shaped bracket
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(w, 0);
  shape.lineTo(w, thickness);
  shape.lineTo(thickness, thickness);
  shape.lineTo(thickness, h);
  shape.lineTo(0, h);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w * 0.6, bevelEnabled: false });
  geo.translate(-w / 2, 0, -w * 0.3);
  const mesh = serializeGeometry(geo);
  return [{
    type: "mesh" as const, name: "L-Bracket",
    dimensions: { width: w, height: h, depth: w * 0.6 },
    position: [0, h / 2, 0],
    ...mesh, ...mat,
    componentType: "l_bracket",
  }];
}

function buildFlange(od: number, id: number, thickness: number, boltCircle: number, numHoles: number, holeD: number, mat: MaterialInfo): Partial<CadObject>[] {
  const outerR = od / 2;
  const innerR = id / 2;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  const centerHole = new THREE.Path();
  centerHole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
  shape.holes.push(centerHole);
  // Bolt holes
  const boltR = boltCircle / 2;
  const holeR = holeD / 2;
  for (let i = 0; i < numHoles; i++) {
    const a = (i / numHoles) * Math.PI * 2;
    const cx = Math.cos(a) * boltR;
    const cy = Math.sin(a) * boltR;
    const bh = new THREE.Path();
    bh.absarc(cx, cy, holeR, 0, Math.PI * 2, true);
    shape.holes.push(bh);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, thickness / 2, 0);
  const mesh = serializeGeometry(geo);
  return [{
    type: "mesh" as const, name: "Flange",
    dimensions: { width: od, height: thickness, depth: od },
    position: [0, thickness / 2, 0],
    ...mesh, ...mat,
    componentType: "flange",
    componentParams: { od: od / MM_TO_SCENE, id: id / MM_TO_SCENE, thickness: thickness / MM_TO_SCENE, numHoles, holeD: holeD / MM_TO_SCENE },
  }];
}

function buildIBeam(h: number, w: number, length: number, flangeT: number, webT: number, mat: MaterialInfo): Partial<CadObject>[] {
  const shape = new THREE.Shape();
  // I-beam cross section (bottom flange, web, top flange)
  shape.moveTo(-w / 2, -h / 2);
  shape.lineTo(w / 2, -h / 2);
  shape.lineTo(w / 2, -h / 2 + flangeT);
  shape.lineTo(webT / 2, -h / 2 + flangeT);
  shape.lineTo(webT / 2, h / 2 - flangeT);
  shape.lineTo(w / 2, h / 2 - flangeT);
  shape.lineTo(w / 2, h / 2);
  shape.lineTo(-w / 2, h / 2);
  shape.lineTo(-w / 2, h / 2 - flangeT);
  shape.lineTo(-webT / 2, h / 2 - flangeT);
  shape.lineTo(-webT / 2, -h / 2 + flangeT);
  shape.lineTo(-w / 2, -h / 2 + flangeT);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geo.translate(0, 0, -length / 2);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, length / 2, 0);
  const mesh = serializeGeometry(geo);
  return [{
    type: "mesh" as const, name: "I-Beam",
    dimensions: { width: w, height: length, depth: h },
    position: [0, length / 2, 0],
    ...mesh, ...mat,
    componentType: "i_beam",
  }];
}

function buildChannel(h: number, w: number, length: number, flangeT: number, webT: number, mat: MaterialInfo): Partial<CadObject>[] {
  // C-channel cross section
  const shape = new THREE.Shape();
  shape.moveTo(0, -h / 2);
  shape.lineTo(w, -h / 2);
  shape.lineTo(w, -h / 2 + flangeT);
  shape.lineTo(webT, -h / 2 + flangeT);
  shape.lineTo(webT, h / 2 - flangeT);
  shape.lineTo(w, h / 2 - flangeT);
  shape.lineTo(w, h / 2);
  shape.lineTo(0, h / 2);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geo.translate(-w / 2, 0, -length / 2);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, length / 2, 0);
  const mesh = serializeGeometry(geo);
  return [{
    type: "mesh" as const, name: "Channel",
    dimensions: { width: w, height: length, depth: h },
    position: [0, length / 2, 0],
    ...mesh, ...mat,
    componentType: "c_channel",
  }];
}

function buildAngle(legA: number, legB: number, length: number, thickness: number, mat: MaterialInfo): Partial<CadObject>[] {
  // L-angle profile
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(legA, 0);
  shape.lineTo(legA, thickness);
  shape.lineTo(thickness, thickness);
  shape.lineTo(thickness, legB);
  shape.lineTo(0, legB);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geo.translate(-legA / 2, -legB / 2, -length / 2);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, length / 2, 0);
  const mesh = serializeGeometry(geo);
  return [{
    type: "mesh" as const, name: "Angle",
    dimensions: { width: legA, height: length, depth: legB },
    position: [0, length / 2, 0],
    ...mesh, ...mat,
    componentType: "angle_profile",
  }];
}

interface HistoryEntry {
  objects: CadObject[];
  selectedId: string | null;
  featureHistory: FeatureNode[];
}

interface CadState {
  objects: CadObject[];
  selectedId: string | null;
  selectedIds: string[];
  activeTool: ToolId;
  transformMode: TransformMode;
  snapGrid: boolean;
  unit: UnitType;
  gridSize: number;

  // Ribbon
  activeRibbonTab: RibbonTab;
  ribbonCollapsed: boolean;

  // View
  viewMode: ViewMode;
  showGrid: boolean;
  showOrigin: boolean;
  showDimensions: boolean;
  perspectiveMode: boolean;

  // Feature tree
  featureHistory: FeatureNode[];
  selectedFeatures: string[];
  featureTreeCollapsed: boolean;

  // Property panel
  propertyPanelCollapsed: boolean;

  // Undo/redo
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];

  // Measurement
  measurePoints: [number, number, number][];
  measureResult: { distance: number; dx: number; dy: number; dz: number } | null;
  measurements: Measurement[];

  // Cursor position (updated from viewport raycaster)
  cursorPosition: [number, number, number] | null;

  // Command bar
  commandHistory: string[];

  // Camera target view
  cameraView: string | null;

  // Sketch mode
  sketchPlane: "xy" | "xz" | "yz" | null;
  autoConstraints: boolean;

  // Sketch profiles
  activeSketchId: string | null;
  sketchProfiles: Record<string, string[]>; // sketchId -> objectIds[]

  // Rollback
  rollbackIndex: number | null;

  // Active operation dialogs
  activeOperation: "fillet" | "chamfer" | "shell" | "draft" | "linear_pattern" | "circular_pattern" | "mirror" | "path_pattern" | null;

  // Construction mode
  isConstructionMode: boolean;

  // Sketch draw state (shared with overlay)
  sketchDrawState: {
    clickPoints: [number, number, number][];
    previewPoint: [number, number, number] | null;
    activeTool: ToolId;
    snapType: string | null; // "Endpoint" | "Midpoint" | "Center" | "Intersection" | "Grid" | null
    alignH: boolean;
    alignV: boolean;
    alignRefPoint: [number, number, number] | null;
  };

  // Dynamic input
  dynamicInputValue: string;
  dynamicInputActive: boolean;

  // History timeline
  showHistoryTimeline: boolean;

  // Actions
  setActiveTool: (tool: ToolId) => void;
  setTransformMode: (mode: TransformMode) => void;
  setSnapGrid: (v: boolean) => void;
  setUnit: (u: UnitType) => void;
  setActiveRibbonTab: (tab: RibbonTab) => void;
  setRibbonCollapsed: (v: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setShowGrid: (v: boolean) => void;
  setShowOrigin: (v: boolean) => void;
  setShowDimensions: (v: boolean) => void;
  setPerspectiveMode: (v: boolean) => void;
  setFeatureTreeCollapsed: (v: boolean) => void;
  setPropertyPanelCollapsed: (v: boolean) => void;
  setCameraView: (view: string | null) => void;
  setSketchPlane: (plane: "xy" | "xz" | "yz" | null) => void;
  enterSketchMode: (plane: "xy" | "xz" | "yz") => void;
  exitSketchMode: () => void;
  setAutoConstraints: (v: boolean) => void;
  setActiveOperation: (op: CadState["activeOperation"]) => void;
  setShowHistoryTimeline: (v: boolean) => void;
  setIsConstructionMode: (v: boolean) => void;
  setSketchDrawState: (state: Partial<CadState["sketchDrawState"]>) => void;
  setDynamicInputValue: (v: string) => void;
  setDynamicInputActive: (v: boolean) => void;

  addObject: (type: CadObject["type"]) => string;
  addLine: (points: [number, number, number][]) => string;
  addArc: (points: [number, number, number][], radius: number) => string;
  addCircle: (center: [number, number, number], radius: number) => string;
  addRectangle: (corner1: [number, number, number], corner2: [number, number, number]) => string;
  addPolygon: (points: [number, number, number][], sides: number) => string;
  addEllipse: (center: [number, number, number], rx: number, ry: number) => string;
  addGeneratedObject: (obj: Partial<CadObject> & { type: CadObject["type"]; name: string }) => string;
  selectObject: (id: string | null) => void;
  toggleSelectObject: (id: string) => void;
  selectAll: () => void;
  duplicateSelected: () => void;
  updateObject: (id: string, updates: Partial<CadObject>) => void;
  deleteSelected: () => void;
  deleteObject: (id: string) => void;
  getSelected: () => CadObject | undefined;
  snapToGrid: (value: number) => number;
  setCursorPosition: (pos: [number, number, number] | null) => void;

  // Feature tree actions
  addFeature: (node: Omit<FeatureNode, "children" | "expanded">) => void;
  removeFeature: (id: string) => void;
  reorderFeature: (id: string, newIndex: number) => void;
  renameFeature: (id: string, name: string) => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;

  // Undo/redo
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Measurement
  addMeasurePoint: (point: [number, number, number]) => void;
  clearMeasure: () => void;
  addMeasurement: (measurement: Omit<Measurement, "id">) => void;
  clearMeasurements: () => void;

  // Boolean CSG
  booleanUnion: (objectIds: string[]) => void;
  booleanSubtract: (targetId: string, toolId: string) => void;
  booleanIntersect: (objectIds: string[]) => void;

  // Sketch → Feature
  extrudeFromSketch: (sketchId: string, distance: number) => void;
  revolveFromSketch: (sketchId: string, angle: number) => void;

  // Sketch profile management
  createSketchGroup: (plane: "xy" | "xz" | "yz") => string;
  exitAndLockSketch: () => void;
  getSketchProfiles: (sketchId: string) => CadObject[];

  // Enhanced extrude supporting polygon/line profiles
  extrudeProfile: (sketchId: string, distance: number, direction: "normal" | "reverse" | "midplane" | "both") => void;

  // AI scene bridge
  aiExtrude: (distance: number) => string | null;
  aiAddHole: (diameter: number, depth: number) => string | null;
  aiFilletSelected: (radius: number) => boolean;
  aiChamferSelected: (distance: number) => boolean;
  aiMirror: (plane: "xy" | "xz" | "yz") => string[];
  aiRotate: (angleDeg: number, axis: "x" | "y" | "z") => boolean;
  aiScale: (factor: number) => boolean;
  aiCreateGear: (teeth: number, module_: number, width: number) => string;
  aiShell: (thickness: number) => boolean;

  // New sketch entity methods
  addPoint: (position: [number, number, number]) => string;
  addSlot: (center1: [number, number, number], center2: [number, number, number], width: number) => string;
  addCenterline: (points: [number, number, number][]) => string;
  addCenterRectangle: (center: [number, number, number], halfW: number, halfD: number) => string;
  addPolyline: (points: [number, number, number][], closed?: boolean) => string;
  addHatch: (boundary: [number, number, number][], pattern: CadObject["hatchPattern"], scale?: number, angle?: number) => string;
  addRevisionCloud: (points: [number, number, number][], arcRadius?: number) => string;

  // Solid operations
  extrudeCut: (sketchId: string, distance: number) => void;
  revolveCut: (sketchId: string, angle: number) => void;
  holeWizard: (position: [number, number, number], diameter: number, depth: number, holeType: "simple" | "counterbore" | "countersink" | "tapped") => string;

  // Feature tree: suppress/unsuppress
  suppressFeature: (id: string) => void;
  unsuppressFeature: (id: string) => void;
  getParentChildRelations: (id: string) => { parents: string[]; children: string[] };
  rollbackTo: (index: number) => void;

  // Command
  executeCommand: (cmd: string) => void;
}

export const useCadStore = create<CadState>((set, get) => ({
  objects: [],
  selectedId: null,
  selectedIds: [],
  activeTool: "select",
  transformMode: "translate",
  snapGrid: true,
  unit: "mm",
  gridSize: 0.5,

  // Ribbon
  activeRibbonTab: "solid",
  ribbonCollapsed: false,

  // View
  viewMode: "shaded",
  showGrid: true,
  showOrigin: true,
  showDimensions: true,
  perspectiveMode: true,

  // Feature tree
  featureHistory: [],
  selectedFeatures: [],
  featureTreeCollapsed: false,

  // Property panel
  propertyPanelCollapsed: false,

  // Undo/redo
  undoStack: [],
  redoStack: [],

  // Measurement
  measurePoints: [],
  measureResult: null,
  measurements: [],

  // Cursor position
  cursorPosition: null,

  // Command
  commandHistory: [],

  // Camera
  cameraView: null,

  // Sketch mode
  sketchPlane: null,
  autoConstraints: true,

  // Sketch profiles
  activeSketchId: null,
  sketchProfiles: {},
  rollbackIndex: null,

  // Active operation
  activeOperation: null,

  // Construction mode
  isConstructionMode: false,

  // Sketch draw state
  sketchDrawState: {
    clickPoints: [],
    previewPoint: null,
    activeTool: "select",
    snapType: null,
    alignH: false,
    alignV: false,
    alignRefPoint: null,
  },

  // Dynamic input
  dynamicInputValue: "",
  dynamicInputActive: false,

  // History timeline
  showHistoryTimeline: false,

  // Setters
  setActiveTool: (tool) => set({ activeTool: tool, measurePoints: [], measureResult: null }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  setSnapGrid: (v) => set({ snapGrid: v }),
  setUnit: (u) => set({ unit: u }),
  setActiveRibbonTab: (tab) => set({ activeRibbonTab: tab }),
  setRibbonCollapsed: (v) => set({ ribbonCollapsed: v }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setShowGrid: (v) => set({ showGrid: v }),
  setShowOrigin: (v) => set({ showOrigin: v }),
  setShowDimensions: (v) => set({ showDimensions: v }),
  setPerspectiveMode: (v) => set({ perspectiveMode: v }),
  setFeatureTreeCollapsed: (v) => set({ featureTreeCollapsed: v }),
  setPropertyPanelCollapsed: (v) => set({ propertyPanelCollapsed: v }),
  setCameraView: (view) => set({ cameraView: view }),
  setSketchPlane: (plane) => set({ sketchPlane: plane }),
  enterSketchMode: (plane) => {
    const sketchId = `sketch_${Date.now()}`;
    set({
      sketchPlane: plane,
      activeRibbonTab: "sketch",
      activeSketchId: sketchId,
      activeTool: "line",
    });
    // Add sketch group to feature history
    get().addFeature({
      id: sketchId,
      type: "sketch_group",
      name: `Sketch ${get().featureHistory.filter(f => f.type === "sketch_group").length + 1}`,
      objectId: sketchId,
      visible: true,
      locked: false,
    });
    // Update feature with sketch status
    set((s) => ({
      featureHistory: s.featureHistory.map(f =>
        f.id === sketchId ? { ...f, sketchStatus: "editing" as const, params: { plane } } : f
      ),
    }));
  },
  exitSketchMode: () => {
    const { activeSketchId, objects, featureHistory } = get();
    if (activeSketchId) {
      // Find sketch entities created during this sketch session
      const sketchEntities = objects.filter(o => o.sketchId === activeSketchId);
      const entityCount = sketchEntities.length;
      // Check for closed profiles
      const hasClosedProfile = sketchEntities.some(o =>
        o.type === "rectangle" || o.type === "circle" ||
        (o.type === "polygon" && o.polygonPoints && o.polygonPoints.length >= 3) ||
        o.isProfile
      );
      // Update sketch group in feature history
      set((s) => ({
        featureHistory: s.featureHistory.map(f =>
          f.id === activeSketchId
            ? { ...f, sketchStatus: "locked" as const, params: { ...((f.params as Record<string, unknown>) || {}), entityCount, hasClosedProfile } }
            : f
        ),
        sketchProfiles: {
          ...s.sketchProfiles,
          [activeSketchId]: sketchEntities.map(o => o.id),
        },
      }));
    }
    set({ sketchPlane: null, activeTool: "select", activeSketchId: null, activeRibbonTab: "solid" });
  },
  setAutoConstraints: (v) => set({ autoConstraints: v }),
  setActiveOperation: (op) => set({ activeOperation: op }),
  setShowHistoryTimeline: (v) => set({ showHistoryTimeline: v }),
  setIsConstructionMode: (v) => set({ isConstructionMode: v }),
  setSketchDrawState: (state) => set((s) => {
    const defaults = {
      clickPoints: [] as [number, number, number][],
      previewPoint: null as [number, number, number] | null,
      activeTool: "select" as ToolId,
      snapType: null as string | null,
      alignH: false,
      alignV: false,
      alignRefPoint: null as [number, number, number] | null,
    };
    return {
      sketchDrawState: { ...defaults, ...s.sketchDrawState, ...state },
    };
  }),
  setDynamicInputValue: (v) => set({ dynamicInputValue: v }),
  setDynamicInputActive: (v) => set({ dynamicInputActive: v }),

  snapToGrid: (value: number) => {
    const { snapGrid, gridSize } = get();
    if (!snapGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  },

  pushHistory: () => {
    const { objects, selectedId, featureHistory, undoStack } = get();
    const entry: HistoryEntry = {
      objects: JSON.parse(JSON.stringify(objects)),
      selectedId,
      featureHistory: JSON.parse(JSON.stringify(featureHistory)),
    };
    const newStack = [...undoStack, entry];
    if (newStack.length > MAX_HISTORY) newStack.shift();
    set({ undoStack: newStack, redoStack: [] });
  },

  undo: () => {
    const { undoStack, objects, selectedId, featureHistory } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    const currentEntry: HistoryEntry = {
      objects: JSON.parse(JSON.stringify(objects)),
      selectedId,
      featureHistory: JSON.parse(JSON.stringify(featureHistory)),
    };
    set({
      objects: prev.objects,
      selectedId: prev.selectedId,
      featureHistory: prev.featureHistory,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, currentEntry],
    });
  },

  redo: () => {
    const { redoStack, objects, selectedId, featureHistory } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const currentEntry: HistoryEntry = {
      objects: JSON.parse(JSON.stringify(objects)),
      selectedId,
      featureHistory: JSON.parse(JSON.stringify(featureHistory)),
    };
    set({
      objects: next.objects,
      selectedId: next.selectedId,
      featureHistory: next.featureHistory,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, currentEntry],
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  addMeasurePoint: (point) => {
    const { measurePoints } = get();
    if (measurePoints.length === 0) {
      set({ measurePoints: [point], measureResult: null });
    } else {
      const p1 = measurePoints[0];
      const dx = point[0] - p1[0];
      const dy = point[1] - p1[1];
      const dz = point[2] - p1[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      set({
        measurePoints: [measurePoints[0], point],
        measureResult: {
          distance: Math.round(distance * 1000) / 1000,
          dx: Math.round(Math.abs(dx) * 1000) / 1000,
          dy: Math.round(Math.abs(dy) * 1000) / 1000,
          dz: Math.round(Math.abs(dz) * 1000) / 1000,
        },
      });
    }
  },

  clearMeasure: () => set({ measurePoints: [], measureResult: null }),

  addMeasurement: (measurement) => {
    const id = `meas_${Date.now()}`;
    set((s) => ({
      measurements: [...s.measurements, { ...measurement, id }],
    }));
  },

  clearMeasurements: () => set({ measurements: [] }),

  // Feature tree actions
  addFeature: (node) => {
    set((s) => ({
      featureHistory: [
        ...s.featureHistory,
        { ...node, children: [], expanded: true },
      ],
    }));
  },

  removeFeature: (id) => {
    set((s) => ({
      featureHistory: s.featureHistory.filter((f) => f.id !== id),
    }));
  },

  reorderFeature: (id, newIndex) => {
    set((s) => {
      const features = [...s.featureHistory];
      const oldIndex = features.findIndex((f) => f.id === id);
      if (oldIndex === -1) return s;
      const [item] = features.splice(oldIndex, 1);
      features.splice(newIndex, 0, item);
      return { featureHistory: features };
    });
  },

  renameFeature: (id, name) => {
    set((s) => ({
      featureHistory: s.featureHistory.map((f) =>
        f.id === id ? { ...f, name } : f
      ),
    }));
    // Also rename the associated object
    const feature = get().featureHistory.find((f) => f.id === id);
    if (feature) {
      get().updateObject(feature.objectId, { name });
    }
  },

  toggleVisibility: (id) => {
    const feature = get().featureHistory.find((f) => f.id === id);
    if (!feature) return;
    const newVisible = !feature.visible;
    set((s) => ({
      featureHistory: s.featureHistory.map((f) =>
        f.id === id ? { ...f, visible: newVisible } : f
      ),
    }));
    get().updateObject(feature.objectId, { visible: newVisible });
  },

  toggleLock: (id) => {
    const feature = get().featureHistory.find((f) => f.id === id);
    if (!feature) return;
    const newLocked = !feature.locked;
    set((s) => ({
      featureHistory: s.featureHistory.map((f) =>
        f.id === id ? { ...f, locked: newLocked } : f
      ),
    }));
    get().updateObject(feature.objectId, { locked: newLocked });
  },

  selectObject: (id) => set({ selectedId: id, selectedIds: id ? [id] : [] }),

  toggleSelectObject: (id) => {
    set((s) => {
      const ids = s.selectedIds.includes(id)
        ? s.selectedIds.filter((i) => i !== id)
        : [...s.selectedIds, id];
      return { selectedIds: ids, selectedId: ids.length > 0 ? ids[ids.length - 1] : null };
    });
  },

  selectAll: () => {
    const { objects } = get();
    const ids = objects.filter((o) => o.visible !== false).map((o) => o.id);
    set({ selectedIds: ids, selectedId: ids.length > 0 ? ids[ids.length - 1] : null });
  },

  duplicateSelected: () => {
    const { selectedId, selectedIds, objects } = get();
    const idsTodup = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    if (idsTodup.length === 0) return;
    get().pushHistory();
    const newIds: string[] = [];
    idsTodup.forEach((id) => {
      const obj = objects.find((o) => o.id === id);
      if (!obj) return;
      const newId = `obj_${++idCounter}_${Date.now()}`;
      const newObj: CadObject = {
        ...JSON.parse(JSON.stringify(obj)),
        id: newId,
        name: `${obj.name} (Copy)`,
        position: [obj.position[0] + 0.5, obj.position[1], obj.position[2] + 0.5],
      };
      set((s) => ({ objects: [...s.objects, newObj] }));
      get().addFeature({
        id: `feat_${newId}`,
        type: newObj.type,
        name: newObj.name,
        objectId: newId,
        visible: true,
        locked: false,
      });
      newIds.push(newId);
    });
    set({ selectedIds: newIds, selectedId: newIds.length > 0 ? newIds[newIds.length - 1] : null });
  },

  setCursorPosition: (pos) => set({ cursorPosition: pos }),

  addObject: (type) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const defaults: Record<
      string,
      { dims: { width: number; height: number; depth: number }; name: string }
    > = {
      box: { dims: { width: 2, height: 2, depth: 2 }, name: "Box" },
      cylinder: { dims: { width: 1, height: 2, depth: 1 }, name: "Cylinder" },
      sphere: { dims: { width: 1.5, height: 1.5, depth: 1.5 }, name: "Sphere" },
      cone: { dims: { width: 1, height: 2, depth: 1 }, name: "Cone" },
    };
    const d = defaults[type] || defaults.box;
    const count = get().objects.filter((o) => o.type === type).length;
    const obj: CadObject = {
      id,
      type,
      name: `${d.name} ${count + 1}`,
      position: [0, d.dims.height / 2, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions: { ...d.dims },
      material: "Steel (AISI 1045)",
      color: getMaterialColor("Steel (AISI 1045)"),
      visible: true,
      locked: false,
      opacity: 1,
      metalness: 0.4,
      roughness: 0.5,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));

    // Add feature node
    get().addFeature({
      id: `feat_${id}`,
      type: obj.type,
      name: obj.name,
      objectId: id,
      visible: true,
      locked: false,
    });

    return id;
  },

  addLine: (points) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.type === "line").length;
    const obj: CadObject = {
      id,
      type: "line",
      name: `Line ${count + 1}`,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions: { width: 0, height: 0, depth: 0 },
      material: "Steel (AISI 1045)",
      color: "#00ffff",
      visible: true,
      locked: false,
      opacity: 1,
      metalness: 0,
      roughness: 1,
      linePoints: points,
      sketchId: get().activeSketchId || undefined,
      sketchPlane: get().sketchPlane || undefined,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));
    get().addFeature({
      id: `feat_${id}`,
      type: "line",
      name: obj.name,
      objectId: id,
      visible: true,
      locked: false,
    });
    return id;
  },

  addArc: (points, radius) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.type === "arc").length;
    const obj: CadObject = {
      id,
      type: "arc",
      name: `Arc ${count + 1}`,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions: { width: 0, height: 0, depth: 0 },
      material: "Steel (AISI 1045)",
      color: "#ff00ff",
      visible: true,
      locked: false,
      opacity: 1,
      metalness: 0,
      roughness: 1,
      arcPoints: points,
      arcRadius: radius,
      sketchId: get().activeSketchId || undefined,
      sketchPlane: get().sketchPlane || undefined,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));
    get().addFeature({
      id: `feat_${id}`,
      type: "arc",
      name: obj.name,
      objectId: id,
      visible: true,
      locked: false,
    });
    return id;
  },

  addCircle: (center, radius) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.type === "circle").length;
    const obj: CadObject = {
      id,
      type: "circle",
      name: `Circle ${count + 1}`,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions: { width: radius * 2, height: 0, depth: radius * 2 },
      material: "Steel (AISI 1045)",
      color: "#00ff00",
      visible: true,
      locked: false,
      opacity: 1,
      metalness: 0,
      roughness: 1,
      circleCenter: center,
      circleRadius: radius,
      sketchId: get().activeSketchId || undefined,
      sketchPlane: get().sketchPlane || undefined,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));
    get().addFeature({
      id: `feat_${id}`,
      type: "circle",
      name: obj.name,
      objectId: id,
      visible: true,
      locked: false,
    });
    return id;
  },

  addRectangle: (corner1, corner2) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.type === "rectangle").length;
    const obj: CadObject = {
      id,
      type: "rectangle",
      name: `Rectangle ${count + 1}`,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions: {
        width: Math.abs(corner2[0] - corner1[0]),
        height: 0,
        depth: Math.abs(corner2[2] - corner1[2]),
      },
      material: "Steel (AISI 1045)",
      color: "#ffaa00",
      visible: true,
      locked: false,
      opacity: 1,
      metalness: 0,
      roughness: 1,
      rectCorners: [corner1, corner2],
      sketchId: get().activeSketchId || undefined,
      sketchPlane: get().sketchPlane || undefined,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));
    get().addFeature({
      id: `feat_${id}`,
      type: "rectangle",
      name: obj.name,
      objectId: id,
      visible: true,
      locked: false,
    });
    return id;
  },

  addPolygon: (points, sides) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.type === "polygon").length;
    const obj: CadObject = {
      id,
      type: "polygon",
      name: `Polygon ${count + 1}`,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions: { width: 0, height: 0, depth: 0 },
      material: "Steel (AISI 1045)",
      color: "#ff6600",
      visible: true,
      locked: false,
      opacity: 1,
      metalness: 0,
      roughness: 1,
      polygonPoints: points,
      polygonSides: sides,
      isProfile: true,
      sketchId: get().activeSketchId || undefined,
      sketchPlane: get().sketchPlane || undefined,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));
    get().addFeature({
      id: `feat_${id}`,
      type: "polygon",
      name: obj.name,
      objectId: id,
      visible: true,
      locked: false,
    });
    return id;
  },

  addEllipse: (center, rx, ry) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.type === "ellipse").length;
    const obj: CadObject = {
      id,
      type: "ellipse",
      name: `Ellipse ${count + 1}`,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions: { width: rx * 2, height: 0, depth: ry * 2 },
      material: "Steel (AISI 1045)",
      color: "#9966ff",
      visible: true,
      locked: false,
      opacity: 1,
      metalness: 0,
      roughness: 1,
      ellipseCenter: center,
      ellipseRx: rx,
      ellipseRy: ry,
      isProfile: true,
      sketchId: get().activeSketchId || undefined,
      sketchPlane: get().sketchPlane || undefined,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));
    get().addFeature({
      id: `feat_${id}`,
      type: "ellipse",
      name: obj.name,
      objectId: id,
      visible: true,
      locked: false,
    });
    return id;
  },

  addGeneratedObject: (partial) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const obj: CadObject = {
      id,
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions: { width: 2, height: 2, depth: 2 },
      material: "Steel (AISI 1045)",
      color: getMaterialColor("Steel (AISI 1045)"),
      visible: true,
      locked: false,
      opacity: 1,
      metalness: 0.4,
      roughness: 0.5,
      ...partial,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));
    get().addFeature({
      id: `feat_${id}`,
      type: obj.type,
      name: obj.name,
      objectId: id,
      visible: true,
      locked: false,
    });
    return id;
  },

  updateObject: (id, updates) =>
    set((s) => ({
      objects: s.objects.map((o) => {
        if (o.id !== id) return o;
        const merged = { ...o, ...updates };
        if (updates.material && !updates.color) {
          merged.color = getMaterialColor(updates.material);
        }
        return merged;
      }),
    })),

  deleteSelected: () => {
    const { selectedId, selectedIds } = get();
    const idsToDelete = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    if (idsToDelete.length === 0) return;
    get().pushHistory();
    set((s) => ({
      objects: s.objects.filter((o) => !idsToDelete.includes(o.id)),
      featureHistory: s.featureHistory.filter((f) => !idsToDelete.includes(f.objectId)),
      selectedId: null,
      selectedIds: [],
    }));
  },

  deleteObject: (id) => {
    get().pushHistory();
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== id),
      featureHistory: s.featureHistory.filter((f) => f.objectId !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
      selectedIds: s.selectedIds.filter((i) => i !== id),
    }));
  },

  getSelected: () => {
    const { objects, selectedId } = get();
    return objects.find((o) => o.id === selectedId);
  },

  executeCommand: (cmd: string) => {
    const store = get();
    const raw = cmd.trim();
    const upper = raw.toUpperCase();
    const parts = upper.split(/\s+/);
    const command = parts[0];

    set((s) => ({
      commandHistory: [...s.commandHistory.slice(-49), raw],
    }));

    // ── 1. Simple keyword commands (backward compatible) ──
    switch (command) {
      case "UNDO": store.undo(); return;
      case "REDO": store.redo(); return;
      case "DELETE": store.deleteSelected(); return;
      case "COPY": {
        const sel = store.getSelected();
        if (sel) store.addGeneratedObject({ ...sel, name: `${sel.name} (Copy)` });
        return;
      }
    }

    // ── 2. CAD operations on selected object ──
    const lower = raw.toLowerCase();

    // Fillet: "fillet 5mm", "fillet radius 2"
    if (/^fillet\b/i.test(raw)) {
      const r = parseSingleDim(raw, "(?:fillet|radius)") ?? parseValueWithUnit(parts[1]?.toLowerCase() ?? "") ?? 1 * MM_TO_SCENE;
      store.aiFilletSelected(r / MM_TO_SCENE * 10); // aiFilletSelected expects mm
      return;
    }

    // Chamfer: "chamfer 3mm", "chamfer distance 5"
    if (/^chamfer\b/i.test(raw)) {
      const d = parseSingleDim(raw, "(?:chamfer|distance)") ?? parseValueWithUnit(parts[1]?.toLowerCase() ?? "") ?? 1 * MM_TO_SCENE;
      store.aiChamferSelected(d / MM_TO_SCENE * 10);
      return;
    }

    // Extrude: "extrude 50mm", "extrude 2in"
    if (/^extrude\b/i.test(raw)) {
      const dist = parseSingleDim(raw, "extrude") ?? parseValueWithUnit(parts[1]?.toLowerCase() ?? "");
      if (dist) {
        store.aiExtrude(dist);
      } else {
        store.setActiveTool("extrude");
      }
      return;
    }

    // Shell: "shell 2mm"
    if (/^shell\b/i.test(raw)) {
      const t = parseSingleDim(raw, "shell") ?? parseValueWithUnit(parts[1]?.toLowerCase() ?? "") ?? 0.2;
      store.aiShell(t / MM_TO_SCENE * 10);
      return;
    }

    // Mirror: "mirror xy", "mirror about yz"
    if (/^mirror\b/i.test(raw)) {
      const plane = /yz/i.test(raw) ? "yz" : /xz/i.test(raw) ? "xz" : "xy";
      store.aiMirror(plane);
      return;
    }

    // Scale: "scale 2", "scale 0.5x", "scale 150%"
    if (/^scale\b/i.test(raw)) {
      const m = raw.match(/([0-9]*\.?[0-9]+)\s*[x%]?/i);
      if (m) {
        let factor = parseFloat(m[1]);
        if (raw.includes("%")) factor /= 100;
        store.aiScale(factor);
      }
      return;
    }

    // Rotate: "rotate 45", "rotate 90 x", "rotate 180 z"
    if (/^rotate\b/i.test(raw)) {
      const am = raw.match(/([0-9]*\.?[0-9]+)/);
      const angle = am ? parseFloat(am[1]) : 0;
      const axis = /\bx\b/i.test(raw) ? "x" : /\bz\b/i.test(raw) ? "z" : "y";
      store.aiRotate(angle, axis);
      return;
    }

    // Move: "move 10 20 30", "move x 5mm"
    if (/^move\b/i.test(raw)) {
      const sel = store.getSelected();
      if (sel && parts.length >= 4) {
        const x = parseValueWithUnit(parts[1].toLowerCase()) ?? 0;
        const y = parseValueWithUnit(parts[2].toLowerCase()) ?? 0;
        const z = parseValueWithUnit(parts[3].toLowerCase()) ?? 0;
        store.pushHistory();
        store.updateObject(sel.id, {
          position: [sel.position[0] + x, sel.position[1] + y, sel.position[2] + z],
        });
      }
      return;
    }

    // Linear pattern: "pattern linear 3 x 50mm" or "pattern 3x2 10mm"
    if (/^pattern\b.*linear/i.test(raw) || /^linear.?pattern/i.test(raw)) {
      const sel = store.getSelected();
      if (!sel) return;
      const countM = raw.match(/(\d+)\s*(?:copies|count|times|x\b)/i);
      const count = countM ? parseInt(countM[1]) : 3;
      const spacing = parseSingleDim(raw, "(?:spacing|gap|pitch)") ?? parseDimensions(raw)?.width ?? 2;
      const dir: "x" | "z" = /\bz\b/i.test(raw) ? "z" : "x";
      store.pushHistory();
      for (let i = 1; i < count; i++) {
        const pos: [number, number, number] = [...sel.position];
        if (dir === "x") pos[0] += spacing * i;
        else pos[2] += spacing * i;
        store.addGeneratedObject({
          ...sel,
          name: `${sel.name} [${i + 1}]`,
          position: pos,
        });
      }
      return;
    }

    // Circular pattern: "pattern circular 6 radius 50mm"
    if (/^pattern\b.*circular/i.test(raw) || /^circular.?pattern/i.test(raw)) {
      const sel = store.getSelected();
      if (!sel) return;
      const countM = raw.match(/(\d+)\s*(?:copies|count|times)?/i);
      const count = countM ? parseInt(countM[1]) : 6;
      const radius = parseSingleDim(raw, "radius") ?? 5;
      store.pushHistory();
      for (let i = 1; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const pos: [number, number, number] = [
          sel.position[0] + Math.cos(a) * radius,
          sel.position[1],
          sel.position[2] + Math.sin(a) * radius,
        ];
        const rot: [number, number, number] = [
          sel.rotation[0],
          sel.rotation[1] + a,
          sel.rotation[2],
        ];
        store.addGeneratedObject({
          ...sel,
          name: `${sel.name} [${i + 1}]`,
          position: pos,
          rotation: rot,
        });
      }
      return;
    }

    // ── 3. Simple primitives with optional dimensions ──
    const dims = parseDimensions(raw);
    const mat = inferMaterial(raw);

    if (/^box\b|^cube\b/i.test(raw)) {
      const id = store.addObject("box");
      if (dims) store.updateObject(id, { dimensions: dims, ...mat, position: [0, dims.height / 2, 0] });
      else store.updateObject(id, mat);
      return;
    }
    if (/^cylinder\b/i.test(raw)) {
      const id = store.addObject("cylinder");
      if (dims) store.updateObject(id, { dimensions: { width: dims.width / 2, height: dims.height, depth: dims.depth / 2 }, ...mat, position: [0, dims.height / 2, 0] });
      else store.updateObject(id, mat);
      return;
    }
    if (/^sphere\b|^ball\b/i.test(raw)) {
      const id = store.addObject("sphere");
      const r = parseValueWithUnit(parts[1]?.toLowerCase() ?? "");
      if (r) store.updateObject(id, { dimensions: { width: r, height: r, depth: r }, ...mat, position: [0, r, 0] });
      else store.updateObject(id, mat);
      return;
    }
    if (/^cone\b/i.test(raw)) {
      const id = store.addObject("cone");
      if (dims) store.updateObject(id, { dimensions: { width: dims.width / 2, height: dims.height, depth: dims.depth / 2 }, ...mat });
      else store.updateObject(id, mat);
      return;
    }

    // ── 4. Complex object recognition (natural language) ──

    // PV module / solar panel: "create a PV module 2m x 1m x 35mm"
    if (/pv\s*module|solar\s*panel|photovoltaic/i.test(raw)) {
      const d = dims ?? { width: 200 * MM_TO_SCENE, depth: 100 * MM_TO_SCENE, height: 3.5 * MM_TO_SCENE };
      const pvParts = buildPVModule(d, mat);
      pvParts.forEach((p) => store.addGeneratedObject(p as Partial<CadObject> & { type: CadObject["type"]; name: string }));
      return;
    }

    // Gear: "gear 20 teeth module 2 width 10mm" or "spur gear 24T"
    if (/gear\b/i.test(raw)) {
      const teethM = raw.match(/(\d+)\s*(?:teeth|tooth|t\b)/i);
      const teeth = teethM ? parseInt(teethM[1]) : 20;
      const mod = parseSingleDim(raw, "module") ?? 0.2; // scene units
      const width = parseSingleDim(raw, "(?:width|thick|face)") ?? 1;
      store.aiCreateGear(teeth, mod / MM_TO_SCENE * 10, width / MM_TO_SCENE * 10);
      return;
    }

    // Bolt: "bolt M8", "bolt M8 x 30mm", "hex bolt M12 length 50mm"
    if (/bolt\b|screw\b|fastener\b/i.test(raw)) {
      const mMatch = raw.match(/M\s*(\d+)/i);
      const mSize = mMatch ? parseInt(mMatch[1]) : 8;
      const length = parseSingleDim(raw, "(?:length|long|l)") ?? parseDimensions(raw)?.depth ?? (mSize * 2.5 * MM_TO_SCENE);
      const boltMat = /stainless|steel/i.test(raw) ? inferMaterial("steel") : inferMaterial(raw);
      const boltParts = buildBolt(mSize * MM_TO_SCENE, length, boltMat);
      boltParts.forEach((p) => store.addGeneratedObject(p as Partial<CadObject> & { type: CadObject["type"]; name: string }));
      return;
    }

    // Pipe: "pipe OD 50mm ID 40mm length 200mm" or "pipe 2in x 1.5in x 300mm"
    if (/pipe\b|tube\b|tubing\b/i.test(raw)) {
      const odid = parseOdId(raw);
      const length = parseSingleDim(raw, "(?:length|long|height|h)") ?? 10;
      if (odid) {
        const pipeParts = buildPipe(odid.od, odid.id, length, mat);
        pipeParts.forEach((p) => store.addGeneratedObject(p as Partial<CadObject> & { type: CadObject["type"]; name: string }));
      } else if (dims) {
        // Interpret as OD x ID x length
        const pipeParts = buildPipe(dims.width, dims.depth, dims.height || 10, mat);
        pipeParts.forEach((p) => store.addGeneratedObject(p as Partial<CadObject> & { type: CadObject["type"]; name: string }));
      } else {
        // Default hollow cylinder
        const pipeParts = buildPipe(5, 4, 10, mat);
        pipeParts.forEach((p) => store.addGeneratedObject(p as Partial<CadObject> & { type: CadObject["type"]; name: string }));
      }
      return;
    }

    // Bracket: "bracket 50x80x5mm" or "L-bracket"
    if (/bracket\b|l-bracket\b|l\s+bracket\b/i.test(raw)) {
      const d = dims ?? { width: 5, height: 5, depth: 0.5 };
      const thickness = parseSingleDim(raw, "(?:thick|thickness|t)") ?? Math.min(d.width, d.depth) * 0.15;
      const bracketParts = buildBracket(d.width, d.depth, thickness, mat);
      bracketParts.forEach((p) => store.addGeneratedObject(p as Partial<CadObject> & { type: CadObject["type"]; name: string }));
      return;
    }

    // Flange: "flange OD 150mm ID 80mm thickness 20mm 8 holes"
    if (/flange\b/i.test(raw)) {
      const odid = parseOdId(raw);
      const od = odid?.od ?? (dims?.width ?? 15);
      const id = odid?.id ?? (od * 0.5);
      const thickness = parseSingleDim(raw, "(?:thick|thickness|t)") ?? dims?.height ?? 2;
      const holesM = raw.match(/(\d+)\s*holes?/i);
      const numHoles = holesM ? parseInt(holesM[1]) : 8;
      const boltCircle = od * 0.75;
      const holeD = od * 0.06;
      const flangeParts = buildFlange(od, id, thickness, boltCircle, numHoles, holeD, mat);
      flangeParts.forEach((p) => store.addGeneratedObject(p as Partial<CadObject> & { type: CadObject["type"]; name: string }));
      return;
    }

    // I-beam: "I-beam 200x100x3000mm" or "I beam H200 W100 L3m"
    if (/i[- ]?beam\b|h[- ]?beam\b|wide\s*flange/i.test(raw)) {
      const d = dims ?? { width: 10, height: 30, depth: 20 };
      const flangeT = parseSingleDim(raw, "(?:flange|ft)") ?? d.width * 0.12;
      const webT = parseSingleDim(raw, "(?:web|wt)") ?? d.width * 0.08;
      // dims: width=flange width, depth=beam height, height=length
      const beamParts = buildIBeam(d.depth, d.width, d.height, flangeT, webT, mat);
      beamParts.forEach((p) => store.addGeneratedObject(p as Partial<CadObject> & { type: CadObject["type"]; name: string }));
      return;
    }

    // Channel: "channel 100x50x2000mm"
    if (/channel\b|c[- ]?channel\b/i.test(raw)) {
      const d = dims ?? { width: 5, height: 20, depth: 10 };
      const flangeT = d.width * 0.12;
      const webT = d.width * 0.08;
      const chParts = buildChannel(d.depth, d.width, d.height, flangeT, webT, mat);
      chParts.forEach((p) => store.addGeneratedObject(p as Partial<CadObject> & { type: CadObject["type"]; name: string }));
      return;
    }

    // Angle profile: "angle 50x50x3000mm thickness 5mm"
    if (/\bangle\s*(?:profile|section|iron|steel)?\b/i.test(raw) && !/rotate/i.test(raw)) {
      const d = dims ?? { width: 5, height: 20, depth: 5 };
      const thickness = parseSingleDim(raw, "(?:thick|thickness|t)") ?? d.width * 0.1;
      const angleParts = buildAngle(d.width, d.depth, d.height, thickness, mat);
      angleParts.forEach((p) => store.addGeneratedObject(p as Partial<CadObject> & { type: CadObject["type"]; name: string }));
      return;
    }

    // ── 5. Generic box with parsed dimensions (fallback for "create a plate 200x100x10mm") ──
    if (dims) {
      store.pushHistory();
      store.addGeneratedObject({
        type: "box",
        name: raw.length > 40 ? raw.slice(0, 37) + "..." : raw,
        dimensions: dims,
        position: [0, dims.height / 2, 0],
        ...mat,
      });
      return;
    }

    // ── 6. Fallback: try original simple keywords ──
    switch (command) {
      case "BOX": store.addObject("box"); break;
      case "CYLINDER": store.addObject("cylinder"); break;
      case "SPHERE": store.addObject("sphere"); break;
      case "CONE": store.addObject("cone"); break;
      default: break;
    }
  },

  // ── Boolean CSG ──────────────────────────────────────────────
  booleanUnion: (objectIds) => {
    const { objects } = get();
    const targets = objectIds.map((id) => objects.find((o) => o.id === id)).filter(Boolean) as CadObject[];
    if (targets.length < 2) return;
    get().pushHistory();

    // Build merged geometry using Three.js (import inline to avoid SSR issues)
const createGeo = (obj: CadObject): THREE.BufferGeometry => {
      let geo: THREE.BufferGeometry;
      switch (obj.type) {
        case "box": geo = new THREE.BoxGeometry(obj.dimensions.width, obj.dimensions.height, obj.dimensions.depth); break;
        case "cylinder": geo = new THREE.CylinderGeometry(obj.dimensions.width, obj.dimensions.width, obj.dimensions.height, 32); break;
        case "sphere": geo = new THREE.SphereGeometry(obj.dimensions.width, 32, 32); break;
        case "cone": geo = new THREE.ConeGeometry(obj.dimensions.width, obj.dimensions.height, 32); break;
        case "mesh":
          geo = new THREE.BufferGeometry();
          if (obj.meshVertices && obj.meshIndices) {
            geo.setAttribute("position", new THREE.Float32BufferAttribute(obj.meshVertices, 3));
            geo.setIndex(obj.meshIndices);
          }
          break;
        default: geo = new THREE.BoxGeometry(1, 1, 1);
      }
      const mat = new THREE.Matrix4().compose(
        new THREE.Vector3(...obj.position),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...obj.rotation)),
        new THREE.Vector3(...obj.scale)
      );
      geo.applyMatrix4(mat);
      return geo;
    };

    const serializeGeo = (geo: THREE.BufferGeometry) => {
      geo.computeVertexNormals();
      const pos = geo.attributes.position;
      const vertices: number[] = [];
      for (let i = 0; i < pos.count; i++) vertices.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      const idx = geo.index;
      const indices: number[] = [];
      if (idx) { for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i)); }
      else { for (let i = 0; i < pos.count; i++) indices.push(i); }
      return { vertices, indices };
    };

    // Merge all geometries (union = additive merge)
    const geos = targets.map(createGeo);
    const positions: number[] = [];
    const indices: number[] = [];
    let offset = 0;
    for (const g of geos) {
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      const idx = g.index;
      if (idx) { for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + offset); }
      else { for (let i = 0; i < pos.count; i++) indices.push(i + offset); }
      offset += pos.count;
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    merged.setIndex(indices);
    const { vertices, indices: idxs } = serializeGeo(merged);

    const id = `obj_${++idCounter}_${Date.now()}`;
    const newObj: CadObject = {
      id, type: "mesh", name: `Union ${get().objects.filter(o => o.featureType === "boolean_union").length + 1}`,
      position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      dimensions: { width: 1, height: 1, depth: 1 },
      material: targets[0].material, color: targets[0].color,
      visible: true, locked: false, opacity: 1, metalness: 0.4, roughness: 0.5,
      meshVertices: vertices, meshIndices: idxs,
      featureType: "boolean_union",
      featureParams: { sourceIds: objectIds },
    };
    set((s) => ({
      objects: [...s.objects.filter((o) => !objectIds.includes(o.id)), newObj],
      featureHistory: [...s.featureHistory.filter((f) => !objectIds.includes(f.objectId)),
        { id: `feat_${id}`, type: "boolean_union", name: newObj.name, objectId: id, children: [], expanded: true, visible: true, locked: false }],
      selectedId: id, selectedIds: [id],
    }));
    geos.forEach((g) => g.dispose());
    merged.dispose();
  },

  booleanSubtract: (targetId, toolId) => {
    const { objects } = get();
    const target = objects.find((o) => o.id === targetId);
    const tool = objects.find((o) => o.id === toolId);
    if (!target || !tool) return;
    get().pushHistory();

const createGeo = (obj: CadObject): THREE.BufferGeometry => {
      let geo: THREE.BufferGeometry;
      switch (obj.type) {
        case "box": geo = new THREE.BoxGeometry(obj.dimensions.width, obj.dimensions.height, obj.dimensions.depth); break;
        case "cylinder": geo = new THREE.CylinderGeometry(obj.dimensions.width, obj.dimensions.width, obj.dimensions.height, 32); break;
        case "sphere": geo = new THREE.SphereGeometry(obj.dimensions.width, 32, 32); break;
        case "cone": geo = new THREE.ConeGeometry(obj.dimensions.width, obj.dimensions.height, 32); break;
        default:
          geo = new THREE.BufferGeometry();
          if (obj.meshVertices && obj.meshIndices) {
            geo.setAttribute("position", new THREE.Float32BufferAttribute(obj.meshVertices, 3));
            geo.setIndex(obj.meshIndices);
          }
      }
      const mat = new THREE.Matrix4().compose(
        new THREE.Vector3(...obj.position),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...obj.rotation)),
        new THREE.Vector3(...obj.scale)
      );
      geo.applyMatrix4(mat);
      return geo;
    };

    // Subtract: keep target geometry but mark with inverted tool overlay
    const geoA = createGeo(target);
    geoA.computeVertexNormals();
    const pos = geoA.attributes.position;
    const vertices: number[] = [];
    for (let i = 0; i < pos.count; i++) vertices.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    const idx = geoA.index;
    const indices: number[] = [];
    if (idx) { for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i)); }
    else { for (let i = 0; i < pos.count; i++) indices.push(i); }

    const id = `obj_${++idCounter}_${Date.now()}`;
    const newObj: CadObject = {
      id, type: "mesh", name: `Subtract ${get().objects.filter(o => o.featureType === "boolean_subtract").length + 1}`,
      position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      dimensions: { width: 1, height: 1, depth: 1 },
      material: target.material, color: target.color,
      visible: true, locked: false, opacity: 1, metalness: 0.4, roughness: 0.5,
      meshVertices: vertices, meshIndices: indices,
      featureType: "boolean_subtract",
      featureParams: { targetId, toolId },
    };
    set((s) => ({
      objects: [...s.objects.filter((o) => o.id !== targetId && o.id !== toolId), newObj],
      featureHistory: [...s.featureHistory.filter((f) => f.objectId !== targetId && f.objectId !== toolId),
        { id: `feat_${id}`, type: "boolean_subtract", name: newObj.name, objectId: id, children: [], expanded: true, visible: true, locked: false }],
      selectedId: id, selectedIds: [id],
    }));
    geoA.dispose();
  },

  booleanIntersect: (objectIds) => {
    const { objects } = get();
    const targets = objectIds.map((id) => objects.find((o) => o.id === id)).filter(Boolean) as CadObject[];
    if (targets.length < 2) return;
    get().pushHistory();

// Compute bounding box intersection
    const getBox = (obj: CadObject): THREE.Box3 => {
      let geo: THREE.BufferGeometry;
      switch (obj.type) {
        case "box": geo = new THREE.BoxGeometry(obj.dimensions.width, obj.dimensions.height, obj.dimensions.depth); break;
        case "cylinder": geo = new THREE.CylinderGeometry(obj.dimensions.width, obj.dimensions.width, obj.dimensions.height, 32); break;
        case "sphere": geo = new THREE.SphereGeometry(obj.dimensions.width, 32, 32); break;
        case "cone": geo = new THREE.ConeGeometry(obj.dimensions.width, obj.dimensions.height, 32); break;
        default: geo = new THREE.BoxGeometry(1, 1, 1);
      }
      geo.computeBoundingBox();
      const box = geo.boundingBox!.clone();
      box.translate(new THREE.Vector3(...obj.position));
      geo.dispose();
      return box;
    };

    let intersection = getBox(targets[0]);
    for (let i = 1; i < targets.length; i++) {
      intersection = intersection.intersect(getBox(targets[i]));
    }

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    intersection.getSize(size);
    intersection.getCenter(center);

    const geo = new THREE.BoxGeometry(Math.max(0.01, size.x), Math.max(0.01, size.y), Math.max(0.01, size.z));
    geo.computeVertexNormals();
    const pos = geo.attributes.position;
    const vertices: number[] = [];
    for (let i = 0; i < pos.count; i++) vertices.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    const idx = geo.index;
    const indices: number[] = [];
    if (idx) { for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i)); }
    else { for (let i = 0; i < pos.count; i++) indices.push(i); }

    const id = `obj_${++idCounter}_${Date.now()}`;
    const newObj: CadObject = {
      id, type: "mesh", name: `Intersect ${get().objects.filter(o => o.featureType === "boolean_intersect").length + 1}`,
      position: [center.x, center.y, center.z], rotation: [0, 0, 0], scale: [1, 1, 1],
      dimensions: { width: size.x, height: size.y, depth: size.z },
      material: targets[0].material, color: targets[0].color,
      visible: true, locked: false, opacity: 1, metalness: 0.4, roughness: 0.5,
      meshVertices: vertices, meshIndices: indices,
      featureType: "boolean_intersect",
      featureParams: { sourceIds: objectIds },
    };
    set((s) => ({
      objects: [...s.objects.filter((o) => !objectIds.includes(o.id)), newObj],
      featureHistory: [...s.featureHistory.filter((f) => !objectIds.includes(f.objectId)),
        { id: `feat_${id}`, type: "boolean_intersect", name: newObj.name, objectId: id, children: [], expanded: true, visible: true, locked: false }],
      selectedId: id, selectedIds: [id],
    }));
    geo.dispose();
  },

  // ── Extrude from Sketch ──────────────────────────────────────
  extrudeFromSketch: (sketchId, distance) => {
    const { objects } = get();
    const sketch = objects.find((o) => o.id === sketchId);
    if (!sketch) return;
    if (!["rectangle", "circle", "polygon", "line", "ellipse", "slot"].includes(sketch.type) && !sketch.isProfile) return;
    get().pushHistory();

    let geo: THREE.BufferGeometry | null = null;
    const sketchP = sketch.sketchPlane || "xz";

    if (sketch.type === "rectangle" && sketch.rectCorners) {
      const [c1, c2] = sketch.rectCorners;
      const shape = new THREE.Shape();
      if (sketchP === "xy") {
        shape.moveTo(c1[0], c1[1]);
        shape.lineTo(c2[0], c1[1]);
        shape.lineTo(c2[0], c2[1]);
        shape.lineTo(c1[0], c2[1]);
      } else if (sketchP === "yz") {
        shape.moveTo(c1[1], c1[2]);
        shape.lineTo(c2[1], c1[2]);
        shape.lineTo(c2[1], c2[2]);
        shape.lineTo(c1[1], c2[2]);
      } else {
        shape.moveTo(c1[0], c1[2]);
        shape.lineTo(c2[0], c1[2]);
        shape.lineTo(c2[0], c2[2]);
        shape.lineTo(c1[0], c2[2]);
      }
      shape.closePath();
      geo = new THREE.ExtrudeGeometry(shape, { depth: distance, bevelEnabled: false });
      if (sketchP === "xz") geo.rotateX(-Math.PI / 2);
      else if (sketchP === "yz") geo.rotateY(Math.PI / 2);
    } else if (sketch.type === "circle" && sketch.circleCenter && sketch.circleRadius) {
      const shape = new THREE.Shape();
      if (sketchP === "xy") {
        shape.absarc(sketch.circleCenter[0], sketch.circleCenter[1], sketch.circleRadius, 0, Math.PI * 2, false);
      } else if (sketchP === "yz") {
        shape.absarc(sketch.circleCenter[1], sketch.circleCenter[2], sketch.circleRadius, 0, Math.PI * 2, false);
      } else {
        shape.absarc(sketch.circleCenter[0], sketch.circleCenter[2], sketch.circleRadius, 0, Math.PI * 2, false);
      }
      geo = new THREE.ExtrudeGeometry(shape, { depth: distance, bevelEnabled: false });
      if (sketchP === "xz") geo.rotateX(-Math.PI / 2);
      else if (sketchP === "yz") geo.rotateY(Math.PI / 2);
    } else if (sketch.type === "polygon" && sketch.polygonPoints && sketch.polygonPoints.length >= 3) {
      const shape = new THREE.Shape();
      const pts = sketch.polygonPoints;
      shape.moveTo(pts[0][0], pts[0][2]);
      for (let i = 1; i < pts.length; i++) {
        shape.lineTo(pts[i][0], pts[i][2]);
      }
      shape.closePath();
      geo = new THREE.ExtrudeGeometry(shape, { depth: distance, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
    } else if (sketch.type === "ellipse" && sketch.ellipseCenter && sketch.ellipseRx && sketch.ellipseRy) {
      const shape = new THREE.Shape();
      const segments = 64;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = sketch.ellipseCenter[0] + Math.cos(angle) * sketch.ellipseRx;
        const z = sketch.ellipseCenter[2] + Math.sin(angle) * sketch.ellipseRy;
        if (i === 0) shape.moveTo(x, z);
        else shape.lineTo(x, z);
      }
      shape.closePath();
      geo = new THREE.ExtrudeGeometry(shape, { depth: distance, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
    } else if (sketch.type === "slot" && sketch.slotCenter1 && sketch.slotCenter2 && sketch.slotWidth) {
      const c1 = sketch.slotCenter1;
      const c2 = sketch.slotCenter2;
      const hw = sketch.slotWidth / 2;
      const dx = c2[0] - c1[0];
      const dz = c2[2] - c1[2];
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 1e-10) {
        const nx = -dz / len * hw;
        const nz = dx / len * hw;
        const shape = new THREE.Shape();
        shape.moveTo(c1[0] + nx, c1[2] + nz);
        shape.lineTo(c2[0] + nx, c2[2] + nz);
        // Right semicircle
        const angle2 = Math.atan2(nz, nx);
        for (let i = 0; i <= 16; i++) {
          const a = angle2 - Math.PI * (i / 16);
          shape.lineTo(c2[0] + Math.cos(a) * hw, c2[2] + Math.sin(a) * hw);
        }
        shape.lineTo(c1[0] - nx, c1[2] - nz);
        // Left semicircle
        for (let i = 0; i <= 16; i++) {
          const a = angle2 + Math.PI + Math.PI * (i / 16);
          shape.lineTo(c1[0] + Math.cos(a) * hw, c1[2] + Math.sin(a) * hw);
        }
        shape.closePath();
        geo = new THREE.ExtrudeGeometry(shape, { depth: distance, bevelEnabled: false });
        geo.rotateX(-Math.PI / 2);
      }
    } else if (sketch.type === "line" && sketch.sketchId) {
      // Check if this line is part of a closed loop in the sketch
      const sketchEntities = objects.filter(o => o.sketchId === sketch.sketchId && o.type === "line" && o.linePoints && o.linePoints.length >= 2);
      if (sketchEntities.length >= 3) {
        // Try to find a closed loop starting from this line
        const EPS = 1e-4;
        const nearEqual = (a: [number, number, number], b: [number, number, number]) =>
          Math.abs(a[0] - b[0]) < EPS && Math.abs(a[1] - b[1]) < EPS && Math.abs(a[2] - b[2]) < EPS;

        const used = new Set<string>();
        const chain: [number, number, number][] = [];
        let current = sketch;
        chain.push(current.linePoints![0]);
        chain.push(current.linePoints![1]);
        used.add(current.id);
        let currentEnd = current.linePoints![1];

        let found = true;
        while (found) {
          found = false;
          for (const ent of sketchEntities) {
            if (used.has(ent.id)) continue;
            const lp = ent.linePoints!;
            if (nearEqual(lp[0], currentEnd)) {
              chain.push(lp[1]);
              currentEnd = lp[1];
              used.add(ent.id);
              found = true;
              break;
            } else if (nearEqual(lp[1], currentEnd)) {
              chain.push(lp[0]);
              currentEnd = lp[0];
              used.add(ent.id);
              found = true;
              break;
            }
          }
        }

        // Check if closed
        if (chain.length >= 4 && nearEqual(currentEnd, chain[0])) {
          const shape = new THREE.Shape();
          const sp = sketchP;
          if (sp === "xz") {
            shape.moveTo(chain[0][0], chain[0][2]);
            for (let i = 1; i < chain.length - 1; i++) {
              shape.lineTo(chain[i][0], chain[i][2]);
            }
          } else if (sp === "xy") {
            shape.moveTo(chain[0][0], chain[0][1]);
            for (let i = 1; i < chain.length - 1; i++) {
              shape.lineTo(chain[i][0], chain[i][1]);
            }
          } else {
            shape.moveTo(chain[0][1], chain[0][2]);
            for (let i = 1; i < chain.length - 1; i++) {
              shape.lineTo(chain[i][1], chain[i][2]);
            }
          }
          shape.closePath();
          geo = new THREE.ExtrudeGeometry(shape, { depth: distance, bevelEnabled: false });
          if (sp === "xz") geo.rotateX(-Math.PI / 2);
          else if (sp === "yz") geo.rotateY(Math.PI / 2);
        }
      }
    } else if (sketch.isProfile) {
      // Generic profile with polygon points
      if (sketch.polygonPoints && sketch.polygonPoints.length >= 3) {
        const shape = new THREE.Shape();
        const pts = sketch.polygonPoints;
        shape.moveTo(pts[0][0], pts[0][2]);
        for (let i = 1; i < pts.length; i++) {
          shape.lineTo(pts[i][0], pts[i][2]);
        }
        shape.closePath();
        geo = new THREE.ExtrudeGeometry(shape, { depth: distance, bevelEnabled: false });
        geo.rotateX(-Math.PI / 2);
      }
    }

    if (!geo) return;
    geo.computeVertexNormals();
    const pos = geo.attributes.position;
    const vertices: number[] = [];
    for (let i = 0; i < pos.count; i++) vertices.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    const idx = geo.index;
    const indices: number[] = [];
    if (idx) { for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i)); }
    else { for (let i = 0; i < pos.count; i++) indices.push(i); }

    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.featureType === "extrude").length;
    // Find the parent sketch group for proper hierarchy
    const parentSketchId = sketch.sketchId;
    const parentFeature = parentSketchId ? get().featureHistory.find(f => f.id === parentSketchId) : null;

    const newObj: CadObject = {
      id, type: "mesh", name: `Extrude ${count + 1}`,
      position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      dimensions: { width: 1, height: distance, depth: 1 },
      material: "Steel (AISI 1045)", color: getMaterialColor("Steel (AISI 1045)"),
      visible: true, locked: false, opacity: 1, metalness: 0.4, roughness: 0.5,
      meshVertices: vertices, meshIndices: indices,
      featureType: "extrude",
      featureParams: { sketchId, distance, sketchType: sketch.type, parentSketchId },
    };
    // Hide sketch entities (they're consumed by the extrude) but keep them in the tree
    const sketchEntities = parentSketchId ? objects.filter(o => o.sketchId === parentSketchId) : [sketch];
    const hiddenIds = new Set(sketchEntities.map(o => o.id));

    set((s) => ({
      objects: [
        ...s.objects.map(o => hiddenIds.has(o.id) ? { ...o, visible: false } : o),
        newObj,
      ],
      featureHistory: [
        ...s.featureHistory,
        {
          id: `feat_${id}`,
          type: "extrude",
          name: newObj.name,
          objectId: id,
          parentId: parentSketchId || undefined,
          children: [],
          expanded: true,
          visible: true,
          locked: false,
          params: { distance, sketchType: sketch.type },
        },
      ],
      selectedId: id,
      selectedIds: [id],
    }));
    geo.dispose();
  },

  // ── Revolve from Sketch ──────────────────────────────────────
  revolveFromSketch: (sketchId, angle) => {
    const { objects } = get();
    const sketch = objects.find((o) => o.id === sketchId);
    if (!sketch) return;
    if (!["rectangle", "circle", "polygon"].includes(sketch.type) && !sketch.isProfile) return;
    get().pushHistory();

const phiLength = (angle * Math.PI) / 180;
    let geo: THREE.BufferGeometry | null = null;

    if (sketch.type === "rectangle" && sketch.rectCorners) {
      const [c1, c2] = sketch.rectCorners;
      // Use rect corners as profile: right side of rect as lathe profile
      const minZ = Math.min(c1[2], c2[2]);
      const maxZ = Math.max(c1[2], c2[2]);
      const maxX = Math.max(Math.abs(c1[0]), Math.abs(c2[0]));
      const minX = Math.min(Math.abs(c1[0]), Math.abs(c2[0]));
      const points: THREE.Vector2[] = [
        new THREE.Vector2(minX, minZ),
        new THREE.Vector2(maxX, minZ),
        new THREE.Vector2(maxX, maxZ),
        new THREE.Vector2(minX, maxZ),
      ];
      geo = new THREE.LatheGeometry(points, 32, 0, phiLength);
    } else if (sketch.type === "circle" && sketch.circleCenter && sketch.circleRadius) {
      // Revolve a circle around Y: creates a torus
      const r = sketch.circleRadius;
      const cx = sketch.circleCenter[0];
      const points: THREE.Vector2[] = [];
      const segs = 16;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        points.push(new THREE.Vector2(cx + Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3));
      }
      geo = new THREE.LatheGeometry(points, 32, 0, phiLength);
    }

    if (!geo) return;
    geo.computeVertexNormals();
    const pos = geo.attributes.position;
    const vertices: number[] = [];
    for (let i = 0; i < pos.count; i++) vertices.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    const idx = geo.index;
    const indices: number[] = [];
    if (idx) { for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i)); }
    else { for (let i = 0; i < pos.count; i++) indices.push(i); }

    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.featureType === "revolve").length;
    const newObj: CadObject = {
      id, type: "mesh", name: `Revolve ${count + 1}`,
      position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      dimensions: { width: 1, height: 1, depth: 1 },
      material: "Steel (AISI 1045)", color: getMaterialColor("Steel (AISI 1045)"),
      visible: true, locked: false, opacity: 1, metalness: 0.4, roughness: 0.5,
      meshVertices: vertices, meshIndices: indices,
      featureType: "revolve",
      featureParams: { sketchId, angle, sketchType: sketch.type },
    };
    const parentSketchId = sketch.sketchId;
    const sketchEntities2 = parentSketchId ? objects.filter(o => o.sketchId === parentSketchId) : [sketch];
    const hiddenIds2 = new Set(sketchEntities2.map(o => o.id));

    set((s) => ({
      objects: [
        ...s.objects.map(o => hiddenIds2.has(o.id) ? { ...o, visible: false } : o),
        newObj,
      ],
      featureHistory: [
        ...s.featureHistory,
        {
          id: `feat_${id}`,
          type: "revolve",
          name: newObj.name,
          objectId: id,
          parentId: parentSketchId || undefined,
          children: [],
          expanded: true,
          visible: true,
          locked: false,
          params: { angle, sketchType: sketch.type },
        },
      ],
      selectedId: id,
      selectedIds: [id],
    }));
    geo.dispose();
  },

  // ── Sketch profile management ──
  createSketchGroup: (plane) => {
    const sketchId = `sketch_${Date.now()}`;
    get().addFeature({
      id: sketchId,
      type: "sketch_group",
      name: `Sketch ${get().featureHistory.filter(f => f.type === "sketch_group").length + 1}`,
      objectId: sketchId,
      visible: true,
      locked: false,
    });
    set({ activeSketchId: sketchId });
    return sketchId;
  },

  exitAndLockSketch: () => {
    get().exitSketchMode();
  },

  getSketchProfiles: (sketchId) => {
    const { objects, sketchProfiles } = get();
    const ids = sketchProfiles[sketchId] || [];
    return objects.filter(o => ids.includes(o.id));
  },

  // ── Enhanced extrude with direction modes ──
  extrudeProfile: (sketchId, distance, direction) => {
    const { objects } = get();
    // Find closed profiles in the sketch
    const sketchEntities = objects.filter(o => o.sketchId === sketchId || o.id === sketchId);
    const profile = sketchEntities.find(o =>
      o.type === "rectangle" || o.type === "circle" || o.isProfile
    );
    if (!profile) {
      // Try finding any selected sketch entity
      const sel = get().getSelected();
      if (sel && (sel.type === "rectangle" || sel.type === "circle")) {
        get().extrudeFromSketch(sel.id, direction === "midplane" ? distance / 2 : distance);
        return;
      }
      return;
    }
    const actualDistance = direction === "midplane" ? distance / 2 : distance;
    get().extrudeFromSketch(profile.id, actualDistance);
  },

  // ── AI Scene Bridge Methods ──
  aiExtrude: (distance) => {
    const selected = get().getSelected();
    if (!selected) return null;
    if (selected.type === "rectangle" || selected.type === "circle") {
      get().extrudeFromSketch(selected.id, distance);
      return get().selectedId;
    }
    return null;
  },

  aiAddHole: (diameter, depth) => {
    const selected = get().getSelected();
    if (!selected) return null;
    get().pushHistory();
    const radius = diameter / 2 / 10; // Convert mm to scene units
    const id = get().addGeneratedObject({
      type: "cylinder",
      name: `Hole D${diameter}`,
      dimensions: { width: radius, height: depth / 10, depth: radius },
      position: [...selected.position] as [number, number, number],
      color: "#333333",
      featureType: "boolean_subtract" as const,
      featureParams: { diameter, depth, parentId: selected.id },
    });
    return id;
  },

  aiFilletSelected: (radius) => {
    const selected = get().getSelected();
    if (!selected || ["line", "arc", "circle", "rectangle"].includes(selected.type)) return false;
    get().pushHistory();
    // Generate filleted geometry using Three.js rounded box approximation
    const w = selected.dimensions.width;
    const h = selected.dimensions.height;
    const d = selected.dimensions.depth;
    const r = Math.min(radius / 10, Math.min(w, h, d) / 2.5);

    // Create a rounded box shape
    const shape = new THREE.Shape();
    shape.moveTo(-w/2 + r, -d/2);
    shape.lineTo(w/2 - r, -d/2);
    shape.quadraticCurveTo(w/2, -d/2, w/2, -d/2 + r);
    shape.lineTo(w/2, d/2 - r);
    shape.quadraticCurveTo(w/2, d/2, w/2 - r, d/2);
    shape.lineTo(-w/2 + r, d/2);
    shape.quadraticCurveTo(-w/2, d/2, -w/2, d/2 - r);
    shape.lineTo(-w/2, -d/2 + r);
    shape.quadraticCurveTo(-w/2, -d/2, -w/2 + r, -d/2);

    const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, h/2, 0);
    geo.computeVertexNormals();

    const pos = geo.attributes.position;
    const vertices: number[] = [];
    for (let i = 0; i < pos.count; i++) vertices.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    const idx = geo.index;
    const indices: number[] = [];
    if (idx) { for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i)); }
    else { for (let i = 0; i < pos.count; i++) indices.push(i); }

    get().updateObject(selected.id, {
      type: "mesh",
      meshVertices: vertices,
      meshIndices: indices,
      name: `${selected.name} (R${radius} fillet)`,
      featureType: "fillet" as FeatureType,
      featureParams: { radius, originalType: selected.type },
    });
    geo.dispose();
    return true;
  },

  aiChamferSelected: (distance) => {
    const selected = get().getSelected();
    if (!selected || ["line", "arc", "circle", "rectangle"].includes(selected.type)) return false;
    get().pushHistory();
    const w = selected.dimensions.width;
    const h = selected.dimensions.height;
    const d = selected.dimensions.depth;
    const c = Math.min(distance / 10, Math.min(w, h, d) / 2.5);

    const shape = new THREE.Shape();
    shape.moveTo(-w/2 + c, -d/2);
    shape.lineTo(w/2 - c, -d/2);
    shape.lineTo(w/2, -d/2 + c);
    shape.lineTo(w/2, d/2 - c);
    shape.lineTo(w/2 - c, d/2);
    shape.lineTo(-w/2 + c, d/2);
    shape.lineTo(-w/2, d/2 - c);
    shape.lineTo(-w/2, -d/2 + c);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, h/2, 0);
    geo.computeVertexNormals();

    const pos = geo.attributes.position;
    const vertices: number[] = [];
    for (let i = 0; i < pos.count; i++) vertices.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    const idx = geo.index;
    const indices: number[] = [];
    if (idx) { for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i)); }
    else { for (let i = 0; i < pos.count; i++) indices.push(i); }

    get().updateObject(selected.id, {
      type: "mesh",
      meshVertices: vertices,
      meshIndices: indices,
      name: `${selected.name} (${distance}mm chamfer)`,
      featureType: "chamfer" as FeatureType,
      featureParams: { distance, originalType: selected.type },
    });
    geo.dispose();
    return true;
  },

  aiMirror: (plane) => {
    const selected = get().getSelected();
    if (!selected) return [];
    get().pushHistory();
    const newPos: [number, number, number] = [selected.position[0], selected.position[1], selected.position[2]];
    if (plane === "yz") newPos[0] = -newPos[0];
    if (plane === "xy") newPos[2] = -newPos[2];
    if (plane === "xz") newPos[1] = -newPos[1];

    const id = get().addGeneratedObject({
      type: selected.type,
      name: `${selected.name} (mirrored)`,
      dimensions: { ...selected.dimensions },
      position: newPos,
      rotation: [...selected.rotation] as [number, number, number],
      color: selected.color,
      material: selected.material,
      meshVertices: selected.meshVertices ? [...selected.meshVertices] : undefined,
      meshIndices: selected.meshIndices ? [...selected.meshIndices] : undefined,
      featureType: "mirror_feature" as FeatureType,
      featureParams: { plane, sourceId: selected.id },
    });
    return [id];
  },

  aiRotate: (angleDeg, axis) => {
    const selected = get().getSelected();
    if (!selected) return false;
    get().pushHistory();
    const rad = (angleDeg * Math.PI) / 180;
    const rot: [number, number, number] = [selected.rotation[0], selected.rotation[1], selected.rotation[2]];
    if (axis === "x") rot[0] += rad;
    else if (axis === "y") rot[1] += rad;
    else rot[2] += rad;
    get().updateObject(selected.id, { rotation: rot });
    return true;
  },

  aiScale: (factor) => {
    const selected = get().getSelected();
    if (!selected) return false;
    get().pushHistory();
    get().updateObject(selected.id, {
      dimensions: {
        width: selected.dimensions.width * factor,
        height: selected.dimensions.height * factor,
        depth: selected.dimensions.depth * factor,
      },
    });
    return true;
  },

  aiCreateGear: (teeth, module_, width) => {
    get().pushHistory();
    const pitchRadius = (teeth * module_) / 20; // scene units
    const outerRadius = pitchRadius * 1.1;
    const innerRadius = pitchRadius * 0.85;
    const faceWidth = width / 10;

    // Generate gear tooth profile
    const shape = new THREE.Shape();
    const toothCount = teeth;
    for (let i = 0; i < toothCount; i++) {
      const a0 = (i / toothCount) * Math.PI * 2;
      const a1 = ((i + 0.15) / toothCount) * Math.PI * 2;
      const a2 = ((i + 0.35) / toothCount) * Math.PI * 2;
      const a3 = ((i + 0.5) / toothCount) * Math.PI * 2;
      const a4 = ((i + 0.65) / toothCount) * Math.PI * 2;
      const a5 = ((i + 0.85) / toothCount) * Math.PI * 2;
      if (i === 0) {
        shape.moveTo(Math.cos(a0) * innerRadius, Math.sin(a0) * innerRadius);
      }
      shape.lineTo(Math.cos(a1) * innerRadius, Math.sin(a1) * innerRadius);
      shape.lineTo(Math.cos(a2) * outerRadius, Math.sin(a2) * outerRadius);
      shape.lineTo(Math.cos(a3) * outerRadius, Math.sin(a3) * outerRadius);
      shape.lineTo(Math.cos(a4) * outerRadius, Math.sin(a4) * outerRadius);
      shape.lineTo(Math.cos(a5) * innerRadius, Math.sin(a5) * innerRadius);
    }
    shape.closePath();

    // Add center hole
    const holePath = new THREE.Path();
    const holeRadius = innerRadius * 0.3;
    holePath.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
    shape.holes.push(holePath);

    const geo = new THREE.ExtrudeGeometry(shape, { depth: faceWidth, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();

    const pos = geo.attributes.position;
    const vertices: number[] = [];
    for (let i = 0; i < pos.count; i++) vertices.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    const idx = geo.index;
    const indices: number[] = [];
    if (idx) { for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i)); }
    else { for (let i = 0; i < pos.count; i++) indices.push(i); }

    const id = get().addGeneratedObject({
      type: "mesh",
      name: `Gear ${teeth}T M${module_}`,
      dimensions: { width: outerRadius * 2, height: faceWidth, depth: outerRadius * 2 },
      position: [0, faceWidth / 2, 0],
      meshVertices: vertices,
      meshIndices: indices,
      color: "#b0906a",
      material: "Steel (AISI 1045)",
      featureParams: { teeth, module: module_, width },
    });
    geo.dispose();
    return id;
  },

  aiShell: (thickness) => {
    const selected = get().getSelected();
    if (!selected || selected.type === "line" || selected.type === "arc" || selected.type === "circle" || selected.type === "rectangle") return false;
    get().pushHistory();
    const t = thickness / 10;
    const w = selected.dimensions.width;
    const h = selected.dimensions.height;
    const d = selected.dimensions.depth;

    // Create outer and inner boxes to simulate shell
    const outerShape = new THREE.Shape();
    outerShape.moveTo(-w/2, -d/2);
    outerShape.lineTo(w/2, -d/2);
    outerShape.lineTo(w/2, d/2);
    outerShape.lineTo(-w/2, d/2);
    outerShape.closePath();

    const innerHole = new THREE.Path();
    innerHole.moveTo(-w/2 + t, -d/2 + t);
    innerHole.lineTo(w/2 - t, -d/2 + t);
    innerHole.lineTo(w/2 - t, d/2 - t);
    innerHole.lineTo(-w/2 + t, d/2 - t);
    innerHole.closePath();
    outerShape.holes.push(innerHole);

    const geo = new THREE.ExtrudeGeometry(outerShape, { depth: h - t, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, (h - t) / 2, 0);
    geo.computeVertexNormals();

    const pos = geo.attributes.position;
    const vertices: number[] = [];
    for (let i = 0; i < pos.count; i++) vertices.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    const idx = geo.index;
    const indices: number[] = [];
    if (idx) { for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i)); }
    else { for (let i = 0; i < pos.count; i++) indices.push(i); }

    get().updateObject(selected.id, {
      type: "mesh",
      meshVertices: vertices,
      meshIndices: indices,
      name: `${selected.name} (shell ${thickness}mm)`,
      featureType: "shell" as FeatureType,
      featureParams: { thickness, originalType: selected.type },
    });
    geo.dispose();
    return true;
  },

  // ── New Sketch Entities ───────────────────────────────────────

  addPoint: (position) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.type === "point").length;
    const obj: CadObject = {
      id, type: "point",
      name: `Point ${count + 1}`,
      position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      dimensions: { width: 0, height: 0, depth: 0 },
      material: "Steel (AISI 1045)", color: "#ffff00",
      visible: true, locked: false, opacity: 1, metalness: 0, roughness: 1,
      pointPosition: position,
      sketchId: get().activeSketchId || undefined,
      sketchPlane: get().sketchPlane || undefined,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));
    get().addFeature({ id: `feat_${id}`, type: "point", name: obj.name, objectId: id, visible: true, locked: false });
    return id;
  },

  addSlot: (center1, center2, width) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.type === "slot").length;
    const obj: CadObject = {
      id, type: "slot",
      name: `Slot ${count + 1}`,
      position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      dimensions: { width, height: 0, depth: 0 },
      material: "Steel (AISI 1045)", color: "#ff8800",
      visible: true, locked: false, opacity: 1, metalness: 0, roughness: 1,
      slotCenter1: center1, slotCenter2: center2, slotWidth: width,
      isProfile: true,
      sketchId: get().activeSketchId || undefined,
      sketchPlane: get().sketchPlane || undefined,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));
    get().addFeature({ id: `feat_${id}`, type: "slot", name: obj.name, objectId: id, visible: true, locked: false });
    return id;
  },

  addCenterline: (points) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.type === "centerline").length;
    const obj: CadObject = {
      id, type: "centerline",
      name: `Centerline ${count + 1}`,
      position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      dimensions: { width: 0, height: 0, depth: 0 },
      material: "Steel (AISI 1045)", color: "#ff6600",
      visible: true, locked: false, opacity: 1, metalness: 0, roughness: 1,
      centerlinePoints: points, isConstruction: true,
      sketchId: get().activeSketchId || undefined,
      sketchPlane: get().sketchPlane || undefined,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));
    get().addFeature({ id: `feat_${id}`, type: "centerline", name: obj.name, objectId: id, visible: true, locked: false });
    return id;
  },

  addCenterRectangle: (center, halfW, halfD) => {
    const c1: [number, number, number] = [center[0] - halfW, center[1], center[2] - halfD];
    const c2: [number, number, number] = [center[0] + halfW, center[1], center[2] + halfD];
    return get().addRectangle(c1, c2);
  },

  addPolyline: (points, closed = false) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.type === "polyline").length;
    const obj: CadObject = {
      id, type: "polyline",
      name: `Polyline ${count + 1}`,
      position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      dimensions: { width: 0, height: 0, depth: 0 },
      material: "Steel (AISI 1045)", color: "#4a9eff",
      visible: true, locked: false, opacity: 1, metalness: 0, roughness: 1,
      polylinePoints: points, polylineClosed: closed,
      sketchId: get().activeSketchId || undefined,
      sketchPlane: get().sketchPlane || undefined,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));
    get().addFeature({ id: `feat_${id}`, type: "polyline", name: obj.name, objectId: id, visible: true, locked: false });
    return id;
  },

  addHatch: (boundary, pattern = "ansi31", hatchScale = 1, angle = 0) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.type === "hatch").length;
    const obj: CadObject = {
      id, type: "hatch",
      name: `Hatch ${count + 1}`,
      position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      dimensions: { width: 0, height: 0, depth: 0 },
      material: "Steel (AISI 1045)", color: "#666666",
      visible: true, locked: false, opacity: 0.6, metalness: 0, roughness: 1,
      hatchPattern: pattern, hatchScale, hatchAngle: angle, hatchBoundary: boundary,
      sketchId: get().activeSketchId || undefined,
      sketchPlane: get().sketchPlane || undefined,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));
    get().addFeature({ id: `feat_${id}`, type: "hatch", name: obj.name, objectId: id, visible: true, locked: false });
    return id;
  },

  addRevisionCloud: (points, arcRadius = 0.3) => {
    get().pushHistory();
    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.type === "revision_cloud").length;
    const obj: CadObject = {
      id, type: "revision_cloud",
      name: `Rev Cloud ${count + 1}`,
      position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      dimensions: { width: 0, height: 0, depth: 0 },
      material: "Steel (AISI 1045)", color: "#ff4444",
      visible: true, locked: false, opacity: 1, metalness: 0, roughness: 1,
      cloudPoints: points, cloudArcRadius: arcRadius,
      sketchId: get().activeSketchId || undefined,
      sketchPlane: get().sketchPlane || undefined,
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id, selectedIds: [id] }));
    get().addFeature({ id: `feat_${id}`, type: "revision_cloud", name: obj.name, objectId: id, visible: true, locked: false });
    return id;
  },

  // ── Extrude Cut (subtract via sketch profile) ────────────────

  extrudeCut: (sketchId, distance) => {
    const { objects } = get();
    const sketch = objects.find((o) => o.id === sketchId);
    if (!sketch) return;
    get().pushHistory();

    const sketchP = sketch.sketchPlane || "xz";
    let cutShape: THREE.Shape | null = null;

    if (sketch.type === "circle" && sketch.circleCenter && sketch.circleRadius) {
      cutShape = new THREE.Shape();
      if (sketchP === "xz") cutShape.absarc(sketch.circleCenter[0], sketch.circleCenter[2], sketch.circleRadius, 0, Math.PI * 2, false);
      else if (sketchP === "xy") cutShape.absarc(sketch.circleCenter[0], sketch.circleCenter[1], sketch.circleRadius, 0, Math.PI * 2, false);
      else cutShape.absarc(sketch.circleCenter[1], sketch.circleCenter[2], sketch.circleRadius, 0, Math.PI * 2, false);
    } else if (sketch.type === "rectangle" && sketch.rectCorners) {
      const [c1, c2] = sketch.rectCorners;
      cutShape = new THREE.Shape();
      if (sketchP === "xz") { cutShape.moveTo(c1[0], c1[2]); cutShape.lineTo(c2[0], c1[2]); cutShape.lineTo(c2[0], c2[2]); cutShape.lineTo(c1[0], c2[2]); }
      else if (sketchP === "xy") { cutShape.moveTo(c1[0], c1[1]); cutShape.lineTo(c2[0], c1[1]); cutShape.lineTo(c2[0], c2[1]); cutShape.lineTo(c1[0], c2[1]); }
      else { cutShape.moveTo(c1[1], c1[2]); cutShape.lineTo(c2[1], c1[2]); cutShape.lineTo(c2[1], c2[2]); cutShape.lineTo(c1[1], c2[2]); }
      cutShape.closePath();
    }

    if (!cutShape) return;

    const geo = new THREE.ExtrudeGeometry(cutShape, { depth: distance, bevelEnabled: false });
    if (sketchP === "xz") geo.rotateX(-Math.PI / 2);
    else if (sketchP === "yz") geo.rotateY(Math.PI / 2);
    geo.computeVertexNormals();

    const pos = geo.attributes.position;
    const vertices: number[] = [];
    for (let i = 0; i < pos.count; i++) vertices.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    const idx = geo.index;
    const indices: number[] = [];
    if (idx) { for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i)); }
    else { for (let i = 0; i < pos.count; i++) indices.push(i); }

    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.featureType === "extrude_cut").length;
    const parentSketchId = sketch.sketchId;

    const newObj: CadObject = {
      id, type: "mesh", name: `Cut-Extrude ${count + 1}`,
      position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      dimensions: { width: 1, height: distance, depth: 1 },
      material: "Steel (AISI 1045)", color: "#cc3333",
      visible: true, locked: false, opacity: 1, metalness: 0.4, roughness: 0.5,
      meshVertices: vertices, meshIndices: indices,
      featureType: "extrude_cut",
      featureParams: { sketchId, distance, sketchType: sketch.type, parentSketchId },
    };

    set((s) => ({
      objects: [...s.objects, newObj],
      featureHistory: [...s.featureHistory, {
        id: `feat_${id}`, type: "extrude_cut", name: newObj.name, objectId: id,
        parentId: parentSketchId || undefined,
        children: [], expanded: true, visible: true, locked: false,
        params: { distance, sketchType: sketch.type },
      }],
      selectedId: id, selectedIds: [id],
    }));
    geo.dispose();
  },

  revolveCut: (sketchId, angle) => {
    // Same as revolveFromSketch but creates a cut feature
    const { objects } = get();
    const sketch = objects.find((o) => o.id === sketchId);
    if (!sketch) return;
    get().pushHistory();

    const phiLength = (angle * Math.PI) / 180;
    let geo: THREE.BufferGeometry | null = null;

    if (sketch.type === "rectangle" && sketch.rectCorners) {
      const [c1, c2] = sketch.rectCorners;
      const minZ = Math.min(c1[2], c2[2]);
      const maxZ = Math.max(c1[2], c2[2]);
      const maxX = Math.max(Math.abs(c1[0]), Math.abs(c2[0]));
      const minX = Math.min(Math.abs(c1[0]), Math.abs(c2[0]));
      const points: THREE.Vector2[] = [
        new THREE.Vector2(minX, minZ), new THREE.Vector2(maxX, minZ),
        new THREE.Vector2(maxX, maxZ), new THREE.Vector2(minX, maxZ),
      ];
      geo = new THREE.LatheGeometry(points, 32, 0, phiLength);
    }

    if (!geo) return;
    geo.computeVertexNormals();
    const pos = geo.attributes.position;
    const vertices: number[] = [];
    for (let i = 0; i < pos.count; i++) vertices.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    const idx = geo.index;
    const indices: number[] = [];
    if (idx) { for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i)); }
    else { for (let i = 0; i < pos.count; i++) indices.push(i); }

    const id = `obj_${++idCounter}_${Date.now()}`;
    const count = get().objects.filter((o) => o.featureType === "revolve_cut").length;
    const newObj: CadObject = {
      id, type: "mesh", name: `Cut-Revolve ${count + 1}`,
      position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      dimensions: { width: 1, height: 1, depth: 1 },
      material: "Steel (AISI 1045)", color: "#cc3333",
      visible: true, locked: false, opacity: 1, metalness: 0.4, roughness: 0.5,
      meshVertices: vertices, meshIndices: indices,
      featureType: "revolve_cut",
      featureParams: { sketchId, angle },
    };
    set((s) => ({
      objects: [...s.objects, newObj],
      featureHistory: [...s.featureHistory, {
        id: `feat_${id}`, type: "revolve_cut", name: newObj.name, objectId: id,
        children: [], expanded: true, visible: true, locked: false,
      }],
      selectedId: id, selectedIds: [id],
    }));
    geo.dispose();
  },

  holeWizard: (position, diameter, depth, holeType) => {
    get().pushHistory();
    const radius = diameter / 2 / 10;
    const hDepth = depth / 10;

    let geo: THREE.BufferGeometry;
    if (holeType === "counterbore") {
      // Counterbore: larger cylinder on top + smaller cylinder below
      const topGeo = new THREE.CylinderGeometry(radius * 1.8, radius * 1.8, hDepth * 0.3, 32);
      topGeo.translate(0, hDepth * 0.15, 0);
      const bottomGeo = new THREE.CylinderGeometry(radius, radius, hDepth, 32);
      bottomGeo.translate(0, -hDepth * 0.35, 0);
      // Merge
      const merged = new THREE.BufferGeometry();
      const verts: number[] = [];
      const idxs: number[] = [];
      [topGeo, bottomGeo].forEach(g => {
        g.computeVertexNormals();
        const p = g.attributes.position;
        const offset = verts.length / 3;
        for (let i = 0; i < p.count; i++) verts.push(p.getX(i), p.getY(i), p.getZ(i));
        const ix = g.index;
        if (ix) { for (let i = 0; i < ix.count; i++) idxs.push(ix.getX(i) + offset); }
        g.dispose();
      });
      merged.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      merged.setIndex(idxs);
      merged.computeVertexNormals();
      geo = merged;
    } else if (holeType === "countersink") {
      geo = new THREE.ConeGeometry(radius * 1.5, hDepth, 32);
    } else {
      geo = new THREE.CylinderGeometry(radius, radius, hDepth, 32);
    }

    geo.computeVertexNormals();
    const pos = geo.attributes.position;
    const vertices: number[] = [];
    for (let i = 0; i < pos.count; i++) vertices.push(pos.getX(i) + position[0], pos.getY(i) + position[1], pos.getZ(i) + position[2]);
    const idx = geo.index;
    const indices: number[] = [];
    if (idx) { for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i)); }
    else { for (let i = 0; i < pos.count; i++) indices.push(i); }

    const id = get().addGeneratedObject({
      type: "mesh",
      name: `${holeType === "tapped" ? "Tapped " : holeType === "counterbore" ? "CBore " : holeType === "countersink" ? "CSink " : ""}Hole D${diameter}`,
      dimensions: { width: radius * 2, height: hDepth, depth: radius * 2 },
      position: position,
      meshVertices: vertices, meshIndices: indices,
      color: "#555555",
      featureType: "hole" as FeatureType,
      featureParams: { diameter, depth, holeType },
    });
    geo.dispose();
    return id;
  },

  // ── Feature Tree: Suppress/Unsuppress ────────────────────────

  suppressFeature: (id) => {
    const feature = get().featureHistory.find(f => f.id === id);
    if (!feature) return;
    get().pushHistory();
    set((s) => ({
      featureHistory: s.featureHistory.map(f =>
        f.id === id ? { ...f, visible: false, locked: true } : f
      ),
      objects: s.objects.map(o =>
        o.id === feature.objectId ? { ...o, visible: false, suppressed: true } : o
      ),
    }));
  },

  unsuppressFeature: (id) => {
    const feature = get().featureHistory.find(f => f.id === id);
    if (!feature) return;
    get().pushHistory();
    set((s) => ({
      featureHistory: s.featureHistory.map(f =>
        f.id === id ? { ...f, visible: true, locked: false } : f
      ),
      objects: s.objects.map(o =>
        o.id === feature.objectId ? { ...o, visible: true, suppressed: false } : o
      ),
    }));
  },

  getParentChildRelations: (id) => {
    const { featureHistory } = get();
    const feature = featureHistory.find(f => f.id === id);
    if (!feature) return { parents: [], children: [] };
    const parents = feature.parentId ? [feature.parentId] : [];
    const children = featureHistory.filter(f => f.parentId === id).map(f => f.id);
    return { parents, children };
  },

  rollbackTo: (index) => {
    const { featureHistory, objects } = get();
    if (index < 0 || index >= featureHistory.length) return;
    get().pushHistory();
    // Suppress all features after the rollback index
    const featureIds = featureHistory.slice(index + 1).map(f => f.id);
    const objectIds = featureHistory.slice(index + 1).map(f => f.objectId);
    set((s) => ({
      featureHistory: s.featureHistory.map((f, i) =>
        i > index ? { ...f, visible: false, locked: true } : { ...f, visible: true, locked: false }
      ),
      objects: s.objects.map(o =>
        objectIds.includes(o.id) ? { ...o, visible: false, suppressed: true } :
        featureHistory.slice(0, index + 1).some(f => f.objectId === o.id) ? { ...o, visible: true, suppressed: false } : o
      ),
      rollbackIndex: index,
    }));
  },
}));
