/**
 * Pattern Generators for KCL Engine
 * Linear and circular pattern generation for PV arrays and component repetition.
 */
import * as THREE from "three";
import { type SerializedMesh, transformMeshVertices, serializeGeometry } from "./operations";

// ─── Types ──────────────────────────────────────────────────────────────

export interface LinearPatternConfig {
  count: number;
  spacing: number;      // distance between instance origins (scene units)
  direction: [number, number, number]; // normalized direction vector
}

export interface CircularPatternConfig {
  count: number;
  center: [number, number, number];
  axis: [number, number, number]; // rotation axis
  totalAngle?: number;            // radians, default: 2π
  equalSpacing?: boolean;         // default: true
}

export interface PatternInstance {
  index: number;
  position: [number, number, number];
  rotation: [number, number, number];
  mesh?: SerializedMesh;
}

// ─── Linear Pattern ─────────────────────────────────────────────────────

/**
 * Generate positions for a linear pattern.
 */
export function linearPatternPositions(config: LinearPatternConfig): [number, number, number][] {
  const { count, spacing, direction } = config;
  const positions: [number, number, number][] = [];

  for (let i = 0; i < count; i++) {
    positions.push([
      direction[0] * spacing * i,
      direction[1] * spacing * i,
      direction[2] * spacing * i,
    ]);
  }

  return positions;
}

/**
 * Generate a linear pattern of mesh instances.
 * Returns array of translated mesh copies.
 */
export function linearPatternMeshes(
  sourceMesh: SerializedMesh,
  config: LinearPatternConfig
): SerializedMesh[] {
  const positions = linearPatternPositions(config);
  return positions.map(pos => {
    const mat = new THREE.Matrix4().makeTranslation(pos[0], pos[1], pos[2]);
    return transformMeshVertices(sourceMesh, mat);
  });
}

/**
 * Generate a linear pattern of transform matrices (for instanced rendering).
 */
export function linearPatternTransforms(config: LinearPatternConfig): THREE.Matrix4[] {
  const positions = linearPatternPositions(config);
  return positions.map(pos => new THREE.Matrix4().makeTranslation(pos[0], pos[1], pos[2]));
}

// ─── Circular Pattern ───────────────────────────────────────────────────

/**
 * Generate positions and rotations for a circular pattern.
 */
export function circularPatternInstances(config: CircularPatternConfig): PatternInstance[] {
  const { count, center, axis, totalAngle = Math.PI * 2, equalSpacing = true } = config;
  const instances: PatternInstance[] = [];
  const angleStep = equalSpacing ? totalAngle / count : totalAngle / (count - 1);

  const axisVec = new THREE.Vector3(...axis).normalize();

  for (let i = 0; i < count; i++) {
    const angle = angleStep * i;
    const rotMatrix = new THREE.Matrix4().makeRotationAxis(axisVec, angle);
    const pos = new THREE.Vector3(0, 0, 0).applyMatrix4(
      new THREE.Matrix4().makeTranslation(-center[0], -center[1], -center[2])
        .premultiply(rotMatrix)
        .premultiply(new THREE.Matrix4().makeTranslation(center[0], center[1], center[2]))
    );

    instances.push({
      index: i,
      position: [pos.x + center[0], pos.y + center[1], pos.z + center[2]],
      rotation: [
        axis[0] === 1 ? angle : 0,
        axis[1] === 1 ? angle : 0,
        axis[2] === 1 ? angle : 0,
      ],
    });
  }

  return instances;
}

/**
 * Generate a circular pattern of mesh instances.
 */
export function circularPatternMeshes(
  sourceMesh: SerializedMesh,
  config: CircularPatternConfig
): SerializedMesh[] {
  const { count, center, axis, totalAngle = Math.PI * 2 } = config;
  const angleStep = totalAngle / count;
  const axisVec = new THREE.Vector3(...axis).normalize();

  return Array.from({ length: count }, (_, i) => {
    const angle = angleStep * i;
    const mat = new THREE.Matrix4()
      .makeTranslation(-center[0], -center[1], -center[2])
      .premultiply(new THREE.Matrix4().makeRotationAxis(axisVec, angle))
      .premultiply(new THREE.Matrix4().makeTranslation(center[0], center[1], center[2]));
    return transformMeshVertices(sourceMesh, mat);
  });
}

// ─── PV Array Pattern ───────────────────────────────────────────────────

export interface PVArrayConfig {
  moduleCount: number;      // total modules (e.g., 24)
  columns: number;          // modules per row (e.g., 12)
  moduleWidth: number;      // scene units (portrait: shorter dim horizontal)
  moduleHeight: number;     // scene units (portrait: taller dim vertical)
  interModuleGap: number;   // gap between modules (scene units)
  tiltAngle: number;        // radians
  rowSpacing?: number;      // distance between rows (scene units, auto-calculated if omitted)
}

/**
 * Calculate positions for a PV array in portrait orientation.
 * Modules arranged in rows × columns with tilt.
 */
export function pvArrayPositions(config: PVArrayConfig): {
  positions: [number, number, number][];
  rotations: [number, number, number][];
  rows: number;
  columns: number;
} {
  const { moduleCount, columns, moduleWidth, moduleHeight, interModuleGap, tiltAngle } = config;
  const rows = Math.ceil(moduleCount / columns);

  // In portrait mode: moduleWidth is horizontal (X), moduleHeight is vertical (tilted plane)
  const colPitch = moduleWidth + interModuleGap;
  // Row spacing: projected horizontal distance of tilted module + gap
  const tiltedProjection = moduleHeight * Math.cos(tiltAngle);
  const rowPitch = config.rowSpacing ?? (tiltedProjection + interModuleGap * 4);

  const positions: [number, number, number][] = [];
  const rotations: [number, number, number][] = [];

  // Center the array
  const totalWidth = columns * colPitch - interModuleGap;
  const totalDepth = rows * rowPitch;

  for (let r = 0; r < rows; r++) {
    const modulesInRow = Math.min(columns, moduleCount - r * columns);
    for (let c = 0; c < modulesInRow; c++) {
      const x = c * colPitch - totalWidth / 2 + moduleWidth / 2;
      const z = r * rowPitch - totalDepth / 2 + tiltedProjection / 2;
      // Y offset due to tilt: center of module rises above ground
      const y = (moduleHeight / 2) * Math.sin(tiltAngle);

      positions.push([x, y, z]);
      rotations.push([tiltAngle, 0, 0]); // tilt around X-axis
    }
  }

  return { positions, rotations, rows, columns };
}

/**
 * Calculate mounting structure geometry for a PV array row.
 */
export interface MountingStructure {
  frontLegHeight: number;   // scene units
  rearLegHeight: number;    // scene units
  purlinPositions: number[]; // Y positions along module height
  groundBeamLength: number; // scene units
}

export function calculateMountingStructure(
  moduleHeight: number,
  tiltAngleDeg: number,
  frontLegMinHeight: number, // e.g., mm(500) = 0.5m clearance
  purlinOffsets: number[]     // offsets from bottom edge, e.g., [mm(400), mm(1600)]
): MountingStructure {
  const tiltRad = (tiltAngleDeg * Math.PI) / 180;

  // Front leg height (low side)
  const frontLegHeight = frontLegMinHeight;

  // Rear leg: front + vertical rise of tilted module
  const rearLegHeight = frontLegHeight + moduleHeight * Math.sin(tiltRad);

  // Ground beam horizontal span
  const groundBeamLength = moduleHeight * Math.cos(tiltRad);

  return {
    frontLegHeight,
    rearLegHeight,
    purlinPositions: purlinOffsets,
    groundBeamLength,
  };
}
