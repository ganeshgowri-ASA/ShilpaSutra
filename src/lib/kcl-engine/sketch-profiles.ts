/**
 * 2D Sketch Profiles for KCL Engine
 * Generates THREE.Shape profiles for extrusion into 3D solids.
 *
 * Profiles: C-channel (Al frame), rectangle, U-channel, I-beam, L-angle,
 * hollow rectangle, circular, slot, and custom polygon profiles.
 */
import * as THREE from "three";

// ─── Types ──────────────────────────────────────────────────────────────

export interface ProfileParams {
  /** Profile width (outer) in scene units */
  width: number;
  /** Profile height (outer) in scene units */
  height: number;
  /** Wall/flange thickness in scene units */
  thickness?: number;
  /** Web thickness in scene units (for I-beam, C-channel) */
  webThickness?: number;
  /** Flange thickness in scene units */
  flangeThickness?: number;
  /** Lip height for C-channel in scene units */
  lipHeight?: number;
  /** Inner radius for fillets */
  innerRadius?: number;
  /** Outer radius for fillets */
  outerRadius?: number;
}

export type ProfileType =
  | "rectangle"
  | "c_channel"
  | "u_channel"
  | "i_beam"
  | "l_angle"
  | "t_profile"
  | "hollow_rect"
  | "circle"
  | "hollow_circle"
  | "slot";

// ─── Unit Helper ────────────────────────────────────────────────────────

const MM = 0.1; // 1mm = 0.1 scene units

export function mm(value: number): number {
  return value * MM;
}

// ─── Profile Generators ─────────────────────────────────────────────────

/**
 * Create a simple rectangular profile.
 */
export function createRectProfile(width: number, height: number): THREE.Shape {
  const hw = width / 2;
  const hh = height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();
  return shape;
}

/**
 * Create a C-channel (aluminum extrusion) cross-section profile.
 * Standard PV module frame: 40mm wide x 35mm tall, 1.5mm wall, 5mm lip.
 *
 *  ┌────────────────────┐  ← top flange
 *  │                    │
 *  │  ┌──────────────┐  │  ← inner cavity (open on bottom)
 *  │  │              │  │
 *  │  │              │  │
 *  ├──┘              └──┤  ← web (sides)
 *  └─┐                ┌─┘  ← lips (inward return)
 *    └────────────────┘
 *
 * Opens downward (glass sits on the lip ledge from above).
 */
export function createCChannelProfile(params: {
  width: number;      // outer width (e.g., 40mm → mm(40))
  height: number;     // outer height (e.g., 35mm → mm(35))
  wallThickness: number; // wall/web thickness (e.g., 1.5mm → mm(1.5))
  flangeThickness?: number; // top flange thickness (defaults to wallThickness)
  lipHeight?: number;  // inward lip at bottom (e.g., 5mm → mm(5))
}): THREE.Shape {
  const { width: w, height: h, wallThickness: t } = params;
  const ft = params.flangeThickness ?? t;
  const lip = params.lipHeight ?? mm(5);

  const hw = w / 2;

  // Build C-channel outline clockwise from bottom-left lip
  const shape = new THREE.Shape();

  // Start at bottom-left exterior, going clockwise
  shape.moveTo(-hw, 0);               // bottom-left corner
  shape.lineTo(-hw, h);               // up left side
  shape.lineTo(hw, h);                // across top
  shape.lineTo(hw, 0);                // down right side
  shape.lineTo(hw - lip, 0);          // inward lip right
  shape.lineTo(hw - lip, t);          // up to web level
  shape.lineTo(hw - t, t);            // inner right corner
  shape.lineTo(hw - t, h - ft);       // up inside right
  shape.lineTo(-hw + t, h - ft);      // across inner top
  shape.lineTo(-hw + t, t);           // down inside left
  shape.lineTo(-hw + lip, t);         // inner left to lip
  shape.lineTo(-hw + lip, 0);         // down to lip bottom
  shape.closePath();

  return shape;
}

/**
 * Create a U-channel cross-section (like C-channel but without lips).
 */
export function createUChannelProfile(params: {
  width: number;
  height: number;
  wallThickness: number;
  flangeThickness?: number;
}): THREE.Shape {
  const { width: w, height: h, wallThickness: t } = params;
  const ft = params.flangeThickness ?? t;
  const hw = w / 2;

  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(-hw, h);
  shape.lineTo(hw, h);
  shape.lineTo(hw, 0);
  shape.lineTo(hw - t, 0);
  shape.lineTo(hw - t, h - ft);
  shape.lineTo(-hw + t, h - ft);
  shape.lineTo(-hw + t, 0);
  shape.closePath();

  return shape;
}

/**
 * Create an I-beam cross-section.
 */
export function createIBeamProfile(params: {
  width: number;        // flange width
  height: number;       // total height
  webThickness: number; // web thickness
  flangeThickness: number; // flange thickness
}): THREE.Shape {
  const { width: w, height: h, webThickness: tw, flangeThickness: tf } = params;
  const hw = w / 2;
  const htw = tw / 2;

  const shape = new THREE.Shape();
  // Bottom flange
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, tf);
  shape.lineTo(htw, tf);
  // Web
  shape.lineTo(htw, h - tf);
  // Top flange
  shape.lineTo(hw, h - tf);
  shape.lineTo(hw, h);
  shape.lineTo(-hw, h);
  shape.lineTo(-hw, h - tf);
  shape.lineTo(-htw, h - tf);
  // Web
  shape.lineTo(-htw, tf);
  shape.lineTo(-hw, tf);
  shape.closePath();

  return shape;
}

/**
 * Create an L-angle cross-section.
 */
export function createLAngleProfile(params: {
  width: number;
  height: number;
  thickness: number;
}): THREE.Shape {
  const { width: w, height: h, thickness: t } = params;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(w, 0);
  shape.lineTo(w, t);
  shape.lineTo(t, t);
  shape.lineTo(t, h);
  shape.lineTo(0, h);
  shape.closePath();
  return shape;
}

/**
 * Create a T-profile cross-section.
 */
export function createTProfile(params: {
  width: number;       // flange width
  height: number;      // total height
  webThickness: number;
  flangeThickness: number;
}): THREE.Shape {
  const { width: w, height: h, webThickness: tw, flangeThickness: tf } = params;
  const hw = w / 2;
  const htw = tw / 2;

  const shape = new THREE.Shape();
  shape.moveTo(-htw, 0);
  shape.lineTo(htw, 0);
  shape.lineTo(htw, h - tf);
  shape.lineTo(hw, h - tf);
  shape.lineTo(hw, h);
  shape.lineTo(-hw, h);
  shape.lineTo(-hw, h - tf);
  shape.lineTo(-htw, h - tf);
  shape.closePath();
  return shape;
}

/**
 * Create a hollow rectangular profile (tube).
 */
export function createHollowRectProfile(params: {
  width: number;
  height: number;
  wallThickness: number;
}): THREE.Shape {
  const { width: w, height: h, wallThickness: t } = params;
  const hw = w / 2;
  const hh = h / 2;

  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-hw + t, -hh + t);
  hole.lineTo(hw - t, -hh + t);
  hole.lineTo(hw - t, hh - t);
  hole.lineTo(-hw + t, hh - t);
  hole.closePath();
  shape.holes.push(hole);

  return shape;
}

/**
 * Create a circular profile.
 */
export function createCircleProfile(radius: number, segments: number = 32): THREE.Shape {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  return shape;
}

/**
 * Create a hollow circular profile (pipe cross-section).
 */
export function createHollowCircleProfile(outerRadius: number, innerRadius: number, segments: number = 32): THREE.Shape {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

/**
 * Create a slot (obround) profile.
 */
export function createSlotProfile(length: number, width: number): THREE.Shape {
  const hw = width / 2;
  const hl = length / 2;
  const r = hw; // semicircle radius = half width

  const shape = new THREE.Shape();
  shape.moveTo(-hl + r, -hw);
  shape.lineTo(hl - r, -hw);
  shape.absarc(hl - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(-hl + r, hw);
  shape.absarc(-hl + r, 0, r, Math.PI / 2, -Math.PI / 2, false);
  shape.closePath();
  return shape;
}

// ─── Profile Factory ────────────────────────────────────────────────────

/**
 * Create a profile by type name and parameters.
 */
export function createProfile(type: ProfileType, params: ProfileParams): THREE.Shape {
  switch (type) {
    case "rectangle":
      return createRectProfile(params.width, params.height);

    case "c_channel":
      return createCChannelProfile({
        width: params.width,
        height: params.height,
        wallThickness: params.thickness ?? mm(1.5),
        flangeThickness: params.flangeThickness,
        lipHeight: params.lipHeight,
      });

    case "u_channel":
      return createUChannelProfile({
        width: params.width,
        height: params.height,
        wallThickness: params.thickness ?? mm(1.5),
        flangeThickness: params.flangeThickness,
      });

    case "i_beam":
      return createIBeamProfile({
        width: params.width,
        height: params.height,
        webThickness: params.webThickness ?? params.thickness ?? mm(3),
        flangeThickness: params.flangeThickness ?? params.thickness ?? mm(3),
      });

    case "l_angle":
      return createLAngleProfile({
        width: params.width,
        height: params.height,
        thickness: params.thickness ?? mm(3),
      });

    case "t_profile":
      return createTProfile({
        width: params.width,
        height: params.height,
        webThickness: params.webThickness ?? params.thickness ?? mm(3),
        flangeThickness: params.flangeThickness ?? params.thickness ?? mm(3),
      });

    case "hollow_rect":
      return createHollowRectProfile({
        width: params.width,
        height: params.height,
        wallThickness: params.thickness ?? mm(2),
      });

    case "circle":
      return createCircleProfile(params.width / 2);

    case "hollow_circle":
      return createHollowCircleProfile(
        params.width / 2,
        params.width / 2 - (params.thickness ?? mm(2))
      );

    case "slot":
      return createSlotProfile(params.width, params.height);

    default:
      return createRectProfile(params.width, params.height);
  }
}

// ─── PV Module Specific Profiles ────────────────────────────────────────

/**
 * Standard aluminum C-channel for PV module frame.
 * IEC 61215 compliant: typically 40mm wide × 35mm tall × 1.5mm wall.
 */
export function createPVFrameProfile(
  frameWidth: number = mm(40),
  frameHeight: number = mm(35),
  wallThickness: number = mm(1.5),
  lipHeight: number = mm(5)
): THREE.Shape {
  return createCChannelProfile({
    width: frameWidth,
    height: frameHeight,
    wallThickness,
    lipHeight,
  });
}

/**
 * Steel mounting rail profile (hat channel or C-channel for purlins).
 * Typically 41×41mm or 41×21mm steel strut.
 */
export function createMountingRailProfile(
  width: number = mm(41),
  height: number = mm(41),
  wallThickness: number = mm(2.5)
): THREE.Shape {
  return createCChannelProfile({
    width,
    height,
    wallThickness,
    lipHeight: mm(8),
  });
}

/**
 * Steel structural tube profile for mounting legs.
 * Typically 60×40mm or 80×40mm rectangular hollow section.
 */
export function createStructuralTubeProfile(
  width: number = mm(60),
  height: number = mm(40),
  wallThickness: number = mm(3)
): THREE.Shape {
  return createHollowRectProfile({ width, height, wallThickness });
}
