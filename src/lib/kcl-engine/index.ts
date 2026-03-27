/**
 * KCL Engine - Main API
 * Builds parametric PV modules and arrays with real cross-section profiles,
 * proper Z-stacking, and construction sequence for rollback slider.
 */
import * as THREE from "three";
import {
  createCChannelProfile,
  createRectProfile,
  createHollowRectProfile,
  createStructuralTubeProfile,
  createMountingRailProfile,
  mm,
} from "./sketch-profiles";
import {
  type SerializedMesh,
  extrudeAlongX,
  extrudeAlongZ,
  serializeAndDispose,
  createBoxMesh,
} from "./operations";
import {
  type ComponentInstance,
  type MaterialSpec,
  createComponent,
  MATERIALS,
  componentsToCadParts,
} from "./assembly-transforms";
import {
  pvArrayPositions,
  calculateMountingStructure,
  type PVArrayConfig,
} from "./patterns";
import {
  type KCLFunction,
  type KCLStep,
  type ConstructionSequence,
  mmToScene,
  generateKCLSource,
} from "./parser";
import {
  validateIEC61215,
  validateIEC61730,
  validatePVMounting,
  generateValidationReport,
  type PVModuleSpec,
  type PVArraySpec,
} from "./standards-validator";

// ─── Re-exports ─────────────────────────────────────────────────────────

export * from "./parser";
export * from "./sketch-profiles";
export * from "./operations";
export * from "./patterns";
export * from "./assembly-transforms";
export * from "./standards-validator";

// ─── Types ──────────────────────────────────────────────────────────────

export interface PVModuleParams {
  length: number;        // mm (default 2000)
  width: number;         // mm (default 1000)
  thickness: number;     // mm (default 35)
  frameProfileWidth: number;  // mm (default 40)
  frameWallThickness: number; // mm (default 1.5)
  frameLipHeight: number;     // mm (default 5)
  glassThicknessFront: number; // mm (default 3.2)
  glassThicknessBack: number;  // mm (default 2.0, for bifacial)
  evaThickness: number;       // mm (default 0.45)
  cellThickness: number;      // mm (default 0.2)
  isBifacial: boolean;
  junctionBoxSize: [number, number, number]; // [w, h, d] in mm (default [180, 35, 100])
}

export interface PVModuleBuildResult {
  components: ComponentInstance[];
  cadParts: ReturnType<typeof componentsToCadParts>;
  kclFunction: KCLFunction;
  kclCode: string;
  constructionSequence: ConstructionSequence;
  validationReport: ReturnType<typeof generateValidationReport>;
}

export interface PVArrayBuildResult {
  components: ComponentInstance[];
  cadParts: ReturnType<typeof componentsToCadParts>;
  kclCode: string;
  constructionSteps: KCLStep[];
  mountingStructure: ReturnType<typeof calculateMountingStructure>;
}

// ─── Default Parameters ─────────────────────────────────────────────────

export const DEFAULT_PV_MODULE: PVModuleParams = {
  length: 2000,
  width: 1000,
  thickness: 35,
  frameProfileWidth: 40,
  frameWallThickness: 1.5,
  frameLipHeight: 5,
  glassThicknessFront: 3.2,
  glassThicknessBack: 2.0,
  evaThickness: 0.45,
  cellThickness: 0.2,
  isBifacial: true,
  junctionBoxSize: [180, 35, 100],
};

// ─── PV Module Builder ──────────────────────────────────────────────────

/**
 * Build a complete PV module with real cross-section profiles and proper Z-stacking.
 *
 * Layer stack (from bottom, Z=0 upward):
 *   Z=0.0:   Back Glass 2.0mm
 *   Z=2.0:   EVA Rear 0.45mm
 *   Z=2.45:  Solar Cells 0.2mm
 *   Z=2.65:  EVA Front 0.45mm
 *   Z=3.1:   Front Glass 3.2mm
 *   Total laminate: 6.3mm
 *
 * Frame: Aluminum C-channel, 40mm wide × 35mm tall × 1.5mm wall
 * Junction Box: 180×100×35mm on bottom rail exterior
 */
export function buildPVModule(params: Partial<PVModuleParams> = {}): PVModuleBuildResult {
  const p = { ...DEFAULT_PV_MODULE, ...params };
  const components: ComponentInstance[] = [];
  let stepIndex = 0;

  // Convert to scene units
  const L = mm(p.length);      // module length (X direction)
  const W = mm(p.width);       // module width (Z direction, portrait mode)
  const H = mm(p.thickness);   // module thickness (Y direction)
  const fW = mm(p.frameProfileWidth); // frame profile outer width
  const fT = mm(p.frameWallThickness);
  const fLip = mm(p.frameLipHeight);

  // Layer thicknesses in scene units
  const backGlassT = mm(p.glassThicknessBack);
  const evaRearT = mm(p.evaThickness);
  const cellT = mm(p.cellThickness);
  const evaFrontT = mm(p.evaThickness);
  const frontGlassT = mm(p.glassThicknessFront);

  // Z-stack positions (Y-axis in Three.js = vertical/thickness direction)
  // Frame sits with bottom at Y=0, C-channel opens downward
  // Laminate stack starts at the lip ledge level inside the frame
  const laminateBase = fLip; // glass rests on the lip

  const backGlassY = laminateBase + backGlassT / 2;
  const evaRearY = laminateBase + backGlassT + evaRearT / 2;
  const cellY = laminateBase + backGlassT + evaRearT + cellT / 2;
  const evaFrontY = laminateBase + backGlassT + evaRearT + cellT + evaFrontT / 2;
  const frontGlassY = laminateBase + backGlassT + evaRearT + cellT + evaFrontT + frontGlassT / 2;

  // Inner dimensions (inside frame)
  const innerL = L - fW * 2;
  const innerW = W - fW * 2;

  // ── Step 1: Frame Rails (C-channel profiles) ─────────────────────────

  const frameProfile = createCChannelProfile({
    width: fW,
    height: H,
    wallThickness: fT,
    lipHeight: fLip,
  });

  // Top rail (along X-axis, at +Z side)
  const topRailGeo = new THREE.ExtrudeGeometry(frameProfile, {
    depth: L,
    bevelEnabled: false,
  });
  // Profile is in XY plane, extrude along Z → rotate to align along X
  topRailGeo.translate(-fW / 2, 0, 0); // center profile
  topRailGeo.rotateY(Math.PI / 2); // extrude along X
  topRailGeo.translate(-L / 2, 0, W / 2 - fW / 2);
  const topRailMesh = serializeAndDispose(topRailGeo);

  components.push(createComponent(
    "frame_top_rail", "Frame - Top Rail",
    topRailMesh,
    [0, 0, 0], [0, 0, 0],
    MATERIALS.aluminum,
    { width: L, height: H, depth: fW },
    stepIndex++,
    { part: "frame", railPosition: "top" }
  ));

  // Bottom rail (along X-axis, at -Z side)
  const bottomRailGeo = new THREE.ExtrudeGeometry(frameProfile, {
    depth: L,
    bevelEnabled: false,
  });
  bottomRailGeo.translate(-fW / 2, 0, 0);
  bottomRailGeo.rotateY(Math.PI / 2);
  bottomRailGeo.translate(-L / 2, 0, -W / 2 + fW / 2);
  const bottomRailMesh = serializeAndDispose(bottomRailGeo);

  components.push(createComponent(
    "frame_bottom_rail", "Frame - Bottom Rail",
    bottomRailMesh,
    [0, 0, 0], [0, 0, 0],
    MATERIALS.aluminum,
    { width: L, height: H, depth: fW },
    stepIndex++,
    { part: "frame", railPosition: "bottom" }
  ));

  // Left rail (along Z-axis, at -X side)
  const leftRailGeo = new THREE.ExtrudeGeometry(frameProfile, {
    depth: W - fW * 2, // shorter to fit between top/bottom rails
    bevelEnabled: false,
  });
  leftRailGeo.translate(-fW / 2, 0, 0);
  leftRailGeo.translate(0, 0, -W / 2 + fW); // position at -Z + frame width
  leftRailGeo.translate(-L / 2 + fW / 2, 0, 0);
  const leftRailMesh = serializeAndDispose(leftRailGeo);

  components.push(createComponent(
    "frame_left_rail", "Frame - Left Rail",
    leftRailMesh,
    [0, 0, 0], [0, 0, 0],
    MATERIALS.aluminum,
    { width: fW, height: H, depth: W - fW * 2 },
    stepIndex++,
    { part: "frame", railPosition: "left" }
  ));

  // Right rail (along Z-axis, at +X side)
  const rightRailGeo = new THREE.ExtrudeGeometry(frameProfile, {
    depth: W - fW * 2,
    bevelEnabled: false,
  });
  rightRailGeo.translate(-fW / 2, 0, 0);
  rightRailGeo.translate(0, 0, -W / 2 + fW);
  rightRailGeo.translate(L / 2 - fW / 2, 0, 0);
  const rightRailMesh = serializeAndDispose(rightRailGeo);

  components.push(createComponent(
    "frame_right_rail", "Frame - Right Rail",
    rightRailMesh,
    [0, 0, 0], [0, 0, 0],
    MATERIALS.aluminum,
    { width: fW, height: H, depth: W - fW * 2 },
    stepIndex++,
    { part: "frame", railPosition: "right" }
  ));

  // ── Step 2: Back Glass Layer ──────────────────────────────────────────

  const backGlassMesh = createBoxMesh(innerL, backGlassT, innerW, { y: backGlassY });

  components.push(createComponent(
    "back_glass", p.isBifacial ? "Back Glass (Bifacial)" : "Backsheet (TPT)",
    backGlassMesh,
    [0, 0, 0], [0, 0, 0],
    p.isBifacial ? MATERIALS.glass_back : MATERIALS.backsheet,
    { width: innerL, height: backGlassT, depth: innerW },
    stepIndex++,
    { part: "laminate", layer: "back_glass", zPosition: p.isBifacial ? 0 : 0 }
  ));

  // ── Step 3: Rear EVA Layer ────────────────────────────────────────────

  const evaRearMesh = createBoxMesh(innerL, evaRearT, innerW, { y: evaRearY });

  components.push(createComponent(
    "eva_rear", "EVA Layer (Rear)",
    evaRearMesh,
    [0, 0, 0], [0, 0, 0],
    MATERIALS.eva,
    { width: innerL, height: evaRearT, depth: innerW },
    stepIndex++,
    { part: "laminate", layer: "eva_rear", zPosition: p.glassThicknessBack }
  ));

  // ── Step 4: Solar Cell Array ──────────────────────────────────────────

  // Cells are slightly smaller than EVA (margin for busbar routing)
  const cellMargin = mm(10);
  const cellAreaL = innerL - cellMargin * 2;
  const cellAreaW = innerW - cellMargin * 2;
  const cellMesh = createBoxMesh(cellAreaL, cellT, cellAreaW, { y: cellY });

  components.push(createComponent(
    "solar_cells", "Solar Cell Array",
    cellMesh,
    [0, 0, 0], [0, 0, 0],
    MATERIALS.silicon_cell,
    { width: cellAreaL, height: cellT, depth: cellAreaW },
    stepIndex++,
    { part: "laminate", layer: "cells", zPosition: p.glassThicknessBack + p.evaThickness }
  ));

  // ── Step 5: Front EVA Layer ───────────────────────────────────────────

  const evaFrontMesh = createBoxMesh(innerL, evaFrontT, innerW, { y: evaFrontY });

  components.push(createComponent(
    "eva_front", "EVA Layer (Front)",
    evaFrontMesh,
    [0, 0, 0], [0, 0, 0],
    MATERIALS.eva,
    { width: innerL, height: evaFrontT, depth: innerW },
    stepIndex++,
    { part: "laminate", layer: "eva_front", zPosition: p.glassThicknessBack + p.evaThickness + p.cellThickness }
  ));

  // ── Step 6: Front Glass Layer ─────────────────────────────────────────

  const frontGlassMesh = createBoxMesh(innerL, frontGlassT, innerW, { y: frontGlassY });

  components.push(createComponent(
    "front_glass", "Front Glass",
    frontGlassMesh,
    [0, 0, 0], [0, 0, 0],
    MATERIALS.glass_tempered,
    { width: innerL, height: frontGlassT, depth: innerW },
    stepIndex++,
    { part: "laminate", layer: "front_glass", zPosition: p.glassThicknessBack + p.evaThickness * 2 + p.cellThickness }
  ));

  // ── Step 7: Junction Box ──────────────────────────────────────────────

  const [jbW, jbH, jbD] = p.junctionBoxSize.map(mm);
  const jbMesh = createBoxMesh(jbW, jbH, jbD, { y: -jbH / 2 });

  components.push(createComponent(
    "junction_box", "Junction Box",
    jbMesh,
    [0, 0, -W / 2 + fW + jbD / 2], [0, 0, 0], // on bottom rail exterior
    MATERIALS.junction_box,
    { width: jbW, height: jbH, depth: jbD },
    stepIndex++,
    { part: "electrical", type: "junction_box" }
  ));

  // ── Generate KCL function definition ──────────────────────────────────

  const kclFunction: KCLFunction = {
    name: "pvModule",
    description: `PV Module ${p.length}×${p.width}×${p.thickness}mm ${p.isBifacial ? "Bifacial" : "Monofacial"}`,
    params: [
      { name: "length", defaultValue: p.length, unit: "mm" },
      { name: "width", defaultValue: p.width, unit: "mm" },
      { name: "thickness", defaultValue: p.thickness, unit: "mm" },
      { name: "frameProfileWidth", defaultValue: p.frameProfileWidth, unit: "mm" },
      { name: "frameWallThickness", defaultValue: p.frameWallThickness, unit: "mm" },
      { name: "glassThicknessFront", defaultValue: p.glassThicknessFront, unit: "mm" },
      { name: "glassThicknessBack", defaultValue: p.glassThicknessBack, unit: "mm" },
      { name: "evaThickness", defaultValue: p.evaThickness, unit: "mm" },
      { name: "cellThickness", defaultValue: p.cellThickness, unit: "mm" },
    ],
    steps: [
      { id: "s0", index: 0, operation: "sketch_profile", label: "Sketch C-channel frame profile", description: `Create C-channel profile: ${p.frameProfileWidth}×${p.thickness}mm, ${p.frameWallThickness}mm wall`, params: { _ref: "frame_profile", profile: "c_channel", w: p.frameProfileWidth, h: p.thickness }, dependsOn: [] },
      { id: "s1", index: 1, operation: "extrude", label: "Extrude top rail", description: `Extrude frame profile along X for ${p.length}mm`, params: { _ref: "frame_top_rail", depth: p.length }, dependsOn: ["s0"] },
      { id: "s2", index: 2, operation: "extrude", label: "Extrude bottom rail", description: `Extrude frame profile along X for ${p.length}mm`, params: { _ref: "frame_bottom_rail", depth: p.length }, dependsOn: ["s0"] },
      { id: "s3", index: 3, operation: "extrude", label: "Extrude left rail", description: `Extrude frame profile along Z for ${p.width - p.frameProfileWidth * 2}mm`, params: { _ref: "frame_left_rail", depth: p.width - p.frameProfileWidth * 2 }, dependsOn: ["s0"] },
      { id: "s4", index: 4, operation: "extrude", label: "Extrude right rail", description: `Extrude frame profile along Z for ${p.width - p.frameProfileWidth * 2}mm`, params: { _ref: "frame_right_rail", depth: p.width - p.frameProfileWidth * 2 }, dependsOn: ["s0"] },
      { id: "s5", index: 5, operation: "sketch_profile", label: "Back glass layer", description: `Place back glass ${p.glassThicknessBack}mm at Z=0`, params: { _ref: "back_glass", profile: "rectangle" }, dependsOn: [] },
      { id: "s6", index: 6, operation: "sketch_profile", label: "EVA rear layer", description: `Place EVA rear ${p.evaThickness}mm at Z=${p.glassThicknessBack}mm`, params: { _ref: "eva_rear", profile: "rectangle" }, dependsOn: ["s5"] },
      { id: "s7", index: 7, operation: "sketch_profile", label: "Solar cell array", description: `Place cell array ${p.cellThickness}mm at Z=${p.glassThicknessBack + p.evaThickness}mm`, params: { _ref: "solar_cells", profile: "rectangle" }, dependsOn: ["s6"] },
      { id: "s8", index: 8, operation: "sketch_profile", label: "EVA front layer", description: `Place EVA front ${p.evaThickness}mm at Z=${p.glassThicknessBack + p.evaThickness + p.cellThickness}mm`, params: { _ref: "eva_front", profile: "rectangle" }, dependsOn: ["s7"] },
      { id: "s9", index: 9, operation: "sketch_profile", label: "Front glass layer", description: `Place front glass ${p.glassThicknessFront}mm at Z=${p.glassThicknessBack + p.evaThickness * 2 + p.cellThickness}mm`, params: { _ref: "front_glass", profile: "rectangle" }, dependsOn: ["s8"] },
      { id: "s10", index: 10, operation: "assemble", label: "Junction box", description: `Place junction box ${p.junctionBoxSize[0]}×${p.junctionBoxSize[2]}×${p.junctionBoxSize[1]}mm on bottom rail`, params: { _ref: "junction_box" }, dependsOn: ["s2"] },
      { id: "s11", index: 11, operation: "validate", label: "Validate IEC 61215/61730", description: "Run standards validation checks", params: { _ref: "validation", standard: "IEC 61215, IEC 61730" }, dependsOn: [] },
    ],
  };

  const kclCode = generateKCLSource(kclFunction);

  // ── Validation ────────────────────────────────────────────────────────

  const moduleSpec: PVModuleSpec = {
    length: p.length,
    width: p.width,
    thickness: p.thickness,
    frameWidth: p.frameProfileWidth,
    frameHeight: p.thickness,
    frameWallThickness: p.frameWallThickness,
    glassThickness: p.glassThicknessFront,
    backGlassThickness: p.isBifacial ? p.glassThicknessBack : undefined,
    evaThickness: p.evaThickness,
    cellThickness: p.cellThickness,
    cellCount: 60, // 6×10 typical
    isBifacial: p.isBifacial,
    frameMaterial: "Aluminum 6061-T6",
    glassMaterial: "Tempered Glass",
  };

  const validationReport = generateValidationReport(moduleSpec);

  return {
    components,
    cadParts: componentsToCadParts(components),
    kclFunction,
    kclCode,
    constructionSequence: {
      steps: kclFunction.steps,
      totalSteps: kclFunction.steps.length,
      currentStep: kclFunction.steps.length - 1,
    },
    validationReport,
  };
}

// ─── PV Array Builder ───────────────────────────────────────────────────

export interface PVArrayParams {
  moduleParams?: Partial<PVModuleParams>;
  moduleCount: number;      // total modules (default 24)
  columns: number;          // modules per row (default 12)
  interModuleGap: number;   // mm (default 10)
  tiltAngle: number;        // degrees (default 23)
  frontLegHeight: number;   // mm (default 500)
  purlinOffsets: number[];   // mm from bottom edge (default [400, 1600])
}

export const DEFAULT_PV_ARRAY: PVArrayParams = {
  moduleCount: 24,
  columns: 12,
  interModuleGap: 10,
  tiltAngle: 23,
  frontLegHeight: 500,
  purlinOffsets: [400, 1600],
};

/**
 * Build a complete PV array with mounting structure.
 *
 * 24 modules in series, portrait mode (2000mm vertical × 1000mm horizontal)
 * 10mm inter-module gap
 * Ground-mounted structure with 23-degree tilt
 * Front leg ~500mm, rear leg ~1281mm
 * 2 purlins per module at 400mm and 1600mm from bottom edge
 */
export function buildPVArray(params: Partial<PVArrayParams> = {}): PVArrayBuildResult {
  const p = { ...DEFAULT_PV_ARRAY, ...params };
  const moduleParams = { ...DEFAULT_PV_MODULE, ...p.moduleParams };
  const components: ComponentInstance[] = [];
  let stepIndex = 0;

  const tiltRad = (p.tiltAngle * Math.PI) / 180;

  // Module dimensions in scene units
  // Portrait mode: width (shorter=1000mm) is horizontal, length (taller=2000mm) is vertical
  const modW = mm(moduleParams.width);   // horizontal (X)
  const modH = mm(moduleParams.length);  // vertical (tilted)
  const modT = mm(moduleParams.thickness);

  // Mounting structure calculation
  const mounting = calculateMountingStructure(
    mm(moduleParams.length),
    p.tiltAngle,
    mm(p.frontLegHeight),
    p.purlinOffsets.map(mm)
  );

  // Array layout
  const gap = mm(p.interModuleGap);
  const rows = Math.ceil(p.moduleCount / p.columns);
  const colPitch = modW + gap;
  const totalWidth = p.columns * colPitch - gap;

  // Row depth (horizontal projection of tilted module)
  const tiltedProjection = modH * Math.cos(tiltRad);
  const rowPitch = tiltedProjection + gap * 10; // spacing between rows

  // ── Build Mounting Structure (per row) ────────────────────────────────

  for (let r = 0; r < rows; r++) {
    const rowZ = r * rowPitch;
    const modulesInRow = Math.min(p.columns, p.moduleCount - r * p.columns);

    // Front legs (vertical posts)
    const frontLegProfile = createStructuralTubeProfile(mm(60), mm(40), mm(3));
    for (let c = 0; c <= modulesInRow; c++) {
      const x = c * colPitch - totalWidth / 2;
      // Skip intermediate legs (place at every 3rd position to avoid clutter)
      if (c > 0 && c < modulesInRow && c % 3 !== 0) continue;

      const legH = mounting.frontLegHeight;
      const legGeo = new THREE.ExtrudeGeometry(frontLegProfile, {
        depth: legH,
        bevelEnabled: false,
      });
      legGeo.rotateX(-Math.PI / 2); // extrude upward (Y)
      legGeo.translate(x, 0, rowZ);
      const legMesh = serializeAndDispose(legGeo);

      components.push(createComponent(
        `front_leg_r${r}_c${c}`, `Front Leg R${r + 1}-C${c + 1}`,
        legMesh,
        [0, 0, 0], [0, 0, 0],
        MATERIALS.steel_galvanized,
        { width: mm(60), height: legH, depth: mm(40) },
        stepIndex,
        { part: "structure", type: "front_leg", row: r, col: c }
      ));
    }
    stepIndex++;

    // Rear legs (taller)
    for (let c = 0; c <= modulesInRow; c++) {
      const x = c * colPitch - totalWidth / 2;
      if (c > 0 && c < modulesInRow && c % 3 !== 0) continue;

      const legH = mounting.rearLegHeight;
      const legGeo = new THREE.ExtrudeGeometry(frontLegProfile, {
        depth: legH,
        bevelEnabled: false,
      });
      legGeo.rotateX(-Math.PI / 2);
      legGeo.translate(x, 0, rowZ + tiltedProjection);
      const legMesh = serializeAndDispose(legGeo);

      components.push(createComponent(
        `rear_leg_r${r}_c${c}`, `Rear Leg R${r + 1}-C${c + 1}`,
        legMesh,
        [0, 0, 0], [0, 0, 0],
        MATERIALS.steel_galvanized,
        { width: mm(60), height: legH, depth: mm(40) },
        stepIndex,
        { part: "structure", type: "rear_leg", row: r, col: c }
      ));
    }
    stepIndex++;

    // Purlins (horizontal rails at tilt angle, supporting modules)
    const purlinProfile = createMountingRailProfile(mm(41), mm(41), mm(2.5));
    for (const purlinOffset of p.purlinOffsets) {
      const pOff = mm(purlinOffset);
      // Position along tilted plane
      const py = mounting.frontLegHeight + pOff * Math.sin(tiltRad);
      const pz = rowZ + pOff * Math.cos(tiltRad);

      const purlinGeo = new THREE.ExtrudeGeometry(purlinProfile, {
        depth: totalWidth,
        bevelEnabled: false,
      });
      purlinGeo.rotateY(Math.PI / 2); // extrude along X
      purlinGeo.translate(-totalWidth / 2, py, pz);
      const purlinMesh = serializeAndDispose(purlinGeo);

      components.push(createComponent(
        `purlin_r${r}_${purlinOffset}`, `Purlin R${r + 1} @${purlinOffset}mm`,
        purlinMesh,
        [0, 0, 0], [0, 0, 0],
        MATERIALS.steel_structural,
        { width: totalWidth, height: mm(41), depth: mm(41) },
        stepIndex,
        { part: "structure", type: "purlin", row: r, offset: purlinOffset }
      ));
    }
    stepIndex++;

    // ── Place PV Modules (per row) ──────────────────────────────────────

    for (let c = 0; c < modulesInRow; c++) {
      const moduleResult = buildPVModule(p.moduleParams);
      const x = c * colPitch - totalWidth / 2 + modW / 2;

      // Position module: tilted on the mounting structure
      // Module center at the midpoint of the tilted plane
      const midPurlinY = mounting.frontLegHeight + (modH / 2) * Math.sin(tiltRad);
      const midPurlinZ = rowZ + (modH / 2) * Math.cos(tiltRad);

      for (const comp of moduleResult.components) {
        // Offset from module local coords to array position
        // Module local: centered at origin, flat (no tilt)
        // We need to tilt and translate
        const tilted: ComponentInstance = {
          ...comp,
          id: `${comp.id}_r${r}_c${c}`,
          name: `M${r * p.columns + c + 1} - ${comp.name}`,
          position: [
            comp.position[0] + x,
            comp.position[1] + midPurlinY,
            comp.position[2] + midPurlinZ,
          ],
          rotation: [tiltRad, 0, 0], // tilt around X
          constructionStepIndex: stepIndex,
        };
        components.push(tilted);
      }
      stepIndex++;
    }
  }

  // ── KCL Code ──────────────────────────────────────────────────────────

  const kclCode = `// PV Array: ${p.moduleCount} modules, ${p.columns} columns × ${rows} rows
// Tilt: ${p.tiltAngle}°, Inter-module gap: ${p.interModuleGap}mm
// Mounting: Front leg ${p.frontLegHeight}mm, Rear leg ${mounting.rearLegHeight / mm(1)}mm

fn pvArray(moduleCount = ${p.moduleCount}, columns = ${p.columns}, tiltAngle = ${p.tiltAngle} deg) {
  // Mounting structure
  sketch_profile("leg_profile", profile: "hollow_rect", w: 60, h: 40, t: 3)
  sketch_profile("purlin_profile", profile: "c_channel", w: 41, h: 41, t: 2.5)

  // Per-row construction
  linear_pattern("front_legs", count: ${Math.ceil(p.columns / 3) + 1}, spacing: ${colPitch / mm(1)})
  linear_pattern("rear_legs", count: ${Math.ceil(p.columns / 3) + 1}, spacing: ${colPitch / mm(1)})
  extrude("purlin_400mm", depth: ${totalWidth / mm(1)})
  extrude("purlin_1600mm", depth: ${totalWidth / mm(1)})

  // Place modules
  linear_pattern("pv_modules", count: ${p.moduleCount}, spacing: ${colPitch / mm(1)})
  rotate("pv_modules", angle: ${p.tiltAngle}, axis: "X")

  // Validate
  validate("array", standard: "IEC 62548, IS 875")
}`;

  const constructionSteps: KCLStep[] = components
    .reduce<KCLStep[]>((acc, comp) => {
      const existing = acc.find(s => s.index === comp.constructionStepIndex);
      if (!existing) {
        acc.push({
          id: `arr_step_${comp.constructionStepIndex}`,
          index: comp.constructionStepIndex,
          operation: "assemble",
          label: comp.name,
          description: `Place ${comp.name}`,
          params: {},
          dependsOn: [],
        });
      }
      return acc;
    }, [])
    .sort((a, b) => a.index - b.index);

  return {
    components,
    cadParts: componentsToCadParts(components),
    kclCode,
    constructionSteps,
    mountingStructure: mounting,
  };
}

// ─── Convenience: Build PV Module for AI Reasoning Engine ───────────────

/**
 * Build a PV module and return parts compatible with the existing
 * addAssemblyFromParts() store API. This replaces the flat-rectangle
 * approach in ai-reasoning-engine.ts with real geometry.
 */
export function buildPVModuleForStore(params: Partial<PVModuleParams> = {}): {
  parts: ReturnType<typeof componentsToCadParts>;
  kclCode: string;
  constructionSteps: KCLStep[];
  validationSummary: string;
} {
  const result = buildPVModule(params);
  return {
    parts: result.cadParts,
    kclCode: result.kclCode,
    constructionSteps: result.constructionSequence.steps,
    validationSummary: result.validationReport.summary,
  };
}

/**
 * Build a PV array and return parts for the store.
 */
export function buildPVArrayForStore(params: Partial<PVArrayParams> = {}): {
  parts: ReturnType<typeof componentsToCadParts>;
  kclCode: string;
  constructionSteps: KCLStep[];
} {
  const result = buildPVArray(params);
  return {
    parts: result.cadParts,
    kclCode: result.kclCode,
    constructionSteps: result.constructionSteps,
  };
}
