/**
 * pv3DGeometry.ts — Detailed 3D geometry definitions for all 12 IEC PV test equipment templates.
 * Uses Three.js-compatible geometry primitives (box, cylinder, torus, sphere).
 * All dimensions in metres (scene units). Materials reference keys from materials3D.ts.
 */

import type { IECMaterialKey } from './materials3D';

// ─── Types ───────────────────────────────────────────────────────────────────

export type GeomPrimitiveType = 'box' | 'cylinder' | 'torus' | 'sphere';

export interface GeomPrimitive {
  id: string;
  type: GeomPrimitiveType;
  label: string;
  group: string;
  material: IECMaterialKey;
  position: [number, number, number];
  rotation: [number, number, number];
  /** box=[w,h,d] cylinder=[radius,height,0] torus=[radius,tube,0] sphere=[radius,0,0] */
  dimensions: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export interface IECEquipmentGeometry {
  id: string;
  name: string;
  standard: string;
  category: string;
  description: string;
  /** Overall bounding box [w,h,d] in metres for camera framing */
  boundingBox: [number, number, number];
  groups: string[];
  primitives: GeomPrimitive[];
}

// ─── UID helper ──────────────────────────────────────────────────────────────

let _uid = 0;
function uid(prefix: string): string {
  return `${prefix}_${++_uid}`;
}

// ─── Shorthand builders ──────────────────────────────────────────────────────

function box(
  label: string, group: string, material: IECMaterialKey,
  px: number, py: number, pz: number,
  w: number, h: number, d: number,
  rx = 0, ry = 0, rz = 0,
): GeomPrimitive {
  return {
    id: uid('b'), type: 'box', label, group, material,
    position: [px, py, pz], rotation: [rx, ry, rz], dimensions: [w, h, d],
    castShadow: true, receiveShadow: true,
  };
}

function cyl(
  label: string, group: string, material: IECMaterialKey,
  px: number, py: number, pz: number,
  radius: number, height: number,
  rx = 0, ry = 0, rz = 0,
): GeomPrimitive {
  return {
    id: uid('c'), type: 'cylinder', label, group, material,
    position: [px, py, pz], rotation: [rx, ry, rz], dimensions: [radius, height, 0],
    castShadow: true, receiveShadow: true,
  };
}

function torus(
  label: string, group: string, material: IECMaterialKey,
  px: number, py: number, pz: number,
  radius: number, tube: number,
  rx = 0, ry = 0, rz = 0,
): GeomPrimitive {
  return {
    id: uid('t'), type: 'torus', label, group, material,
    position: [px, py, pz], rotation: [rx, ry, rz], dimensions: [radius, tube, 0],
    castShadow: true, receiveShadow: true,
  };
}

function sphere(
  label: string, group: string, material: IECMaterialKey,
  px: number, py: number, pz: number,
  radius: number,
): GeomPrimitive {
  return {
    id: uid('s'), type: 'sphere', label, group, material,
    position: [px, py, pz], rotation: [0, 0, 0], dimensions: [radius, 0, 0],
    castShadow: true, receiveShadow: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Mechanical Load Test Fixture (IEC 61215 MQT 16)
//    2400×1300×200mm steel frame, SHS 100×100×5mm members, load beam 80×80×4mm,
//    load cells at corners, inflatable pressure bag, rubber-tipped support pins.
// ═══════════════════════════════════════════════════════════════════════════════

export function buildMechanicalLoadFixture(): IECEquipmentGeometry {
  const fw = 2.4, fd = 1.3, fh = 0.2;
  const shs = 0.1; // 100mm SHS section
  const wall = 0.005;
  const beam = 0.08; // 80mm load beam
  const beamWall = 0.004;
  const prims: GeomPrimitive[] = [];

  // Frame rails — 4 SHS members forming rectangle
  prims.push(box('Frame Rail Front', 'frame', 'steel', 0, 0, -(fd - shs) / 2, fw, fh, shs));
  prims.push(box('Frame Rail Rear', 'frame', 'steel', 0, 0, (fd - shs) / 2, fw, fh, shs));
  prims.push(box('Frame Rail Left', 'frame', 'steel', -(fw - shs) / 2, 0, 0, shs, fh, fd));
  prims.push(box('Frame Rail Right', 'frame', 'steel', (fw - shs) / 2, 0, 0, shs, fh, fd));

  // Inner hollow detail — cut visual (slightly recessed dark insets for SHS look)
  const inset = shs - 2 * wall;
  prims.push(box('SHS Hollow Front', 'frame', 'steel_blackout', 0, 0, -(fd - shs) / 2, fw - 2 * wall, fh - 2 * wall, inset));
  prims.push(box('SHS Hollow Rear', 'frame', 'steel_blackout', 0, 0, (fd - shs) / 2, fw - 2 * wall, fh - 2 * wall, inset));

  // Cross braces (2 intermediate members)
  prims.push(box('Cross Brace 1', 'frame', 'steel', 0, 0, -fd / 6, shs * 0.8, fh * 0.7, shs * 0.8));
  prims.push(box('Cross Brace 2', 'frame', 'steel', 0, 0, fd / 6, shs * 0.8, fh * 0.7, shs * 0.8));

  // Load beam (80×80×4mm, spans width at centre)
  prims.push(box('Load Beam', 'load_system', 'stainless_steel', 0, fh / 2 + beam / 2, 0, fw * 0.85, beam, beam));
  prims.push(box('Load Beam Inner', 'load_system', 'steel_blackout', 0, fh / 2 + beam / 2, 0, fw * 0.85 - 2 * beamWall, beam - 2 * beamWall, beam - 2 * beamWall));

  // Corner load cells (4)
  const lcSize = 0.06;
  const lcH = 0.04;
  const lcOffX = fw / 2 - shs;
  const lcOffZ = fd / 2 - shs;
  for (const [sx, sz, lbl] of [
    [-1, -1, 'NW'], [1, -1, 'NE'], [-1, 1, 'SW'], [1, 1, 'SE'],
  ] as const) {
    prims.push(cyl(`Load Cell ${lbl}`, 'load_system', 'stainless_steel',
      sx * lcOffX, -fh / 2 - lcH / 2, sz * lcOffZ, lcSize / 2, lcH));
    prims.push(cyl(`Load Cell Cap ${lbl}`, 'load_system', 'brass',
      sx * lcOffX, -fh / 2 - lcH - 0.005, sz * lcOffZ, lcSize / 2 - 0.005, 0.01));
  }

  // Inflatable pressure bag
  prims.push(box('Pressure Bag', 'pressure_system', 'rubber',
    0, fh / 2 + 0.025, 0, 2.0, 0.05, 1.0));

  // Test module (glass panel on top)
  prims.push(box('Test Module', 'test_specimen', 'glass',
    0, fh / 2 + 0.105, 0, 2.0, 0.035, 1.0));

  // Rubber-tipped support pins (8 around perimeter)
  const pinR = 0.02;
  const pinH = 0.12;
  const pinY = fh / 2 + 0.06;
  const ml = 2.0, mw = 1.0;
  const pinPositions: [number, number, string][] = [
    [-(ml / 2 - 0.05), -(mw / 2 - 0.05), 'NW'],
    [(ml / 2 - 0.05), -(mw / 2 - 0.05), 'NE'],
    [-(ml / 2 - 0.05), (mw / 2 - 0.05), 'SW'],
    [(ml / 2 - 0.05), (mw / 2 - 0.05), 'SE'],
    [0, -(mw / 2 - 0.05), 'N'],
    [0, (mw / 2 - 0.05), 'S'],
    [-(ml / 2 - 0.05), 0, 'W'],
    [(ml / 2 - 0.05), 0, 'E'],
  ];
  for (const [px, pz, lbl] of pinPositions) {
    prims.push(cyl(`Support Pin ${lbl}`, 'support_pins', 'steel', px, pinY, pz, pinR, pinH));
    prims.push(cyl(`Pin Tip ${lbl}`, 'support_pins', 'rubber', px, pinY + pinH / 2 + 0.005, pz, pinR + 0.003, 0.01));
  }

  // Pressure transducer mount
  prims.push(box('Transducer Mount', 'pressure_system', 'steel',
    fw / 2 - 0.1, fh / 2 + 0.04, 0, 0.08, 0.08, 0.08));
  prims.push(cyl('Pressure Gauge', 'pressure_system', 'brass',
    fw / 2 - 0.1, fh / 2 + 0.1, 0, 0.025, 0.03));

  // Vacuum pump port
  prims.push(cyl('Vacuum Port', 'pressure_system', 'stainless_steel',
    -(fw / 2 - 0.1), 0, 0, 0.025, fh));
  prims.push(cyl('Vacuum Fitting', 'pressure_system', 'brass',
    -(fw / 2 - 0.1), -fh / 2 - 0.02, 0, 0.015, 0.04));

  return {
    id: 'iec_mechanical_load_fixture',
    name: 'Mechanical Load Test Fixture',
    standard: 'IEC 61215 MQT 16',
    category: 'mechanical_test',
    description: '2400×1300×200mm SHS steel loading frame with inflatable pressure bag, 4 corner load cells, load beam 80×80×4mm, 8 rubber-tipped support pins.',
    boundingBox: [fw + 0.3, fh + 0.4, fd + 0.3],
    groups: ['frame', 'load_system', 'pressure_system', 'support_pins', 'test_specimen'],
    primitives: prims,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Salt Mist / Corrosion Test Chamber (IEC 61701)
//    600×500×400mm outer, 50mm SS316 walls, 4 nozzles top, door with rubber seal,
//    drain bottom, acrylic observation window.
// ═══════════════════════════════════════════════════════════════════════════════

export function buildSaltMistChamber(): IECEquipmentGeometry {
  const ow = 0.6, od = 0.5, oh = 0.4;
  const wall = 0.05; // 50mm walls
  const iw = ow - 2 * wall, id = od - 2 * wall, ih = oh - 2 * wall;
  const prims: GeomPrimitive[] = [];

  // Outer shell — SS316
  prims.push(box('Outer Shell', 'chamber_body', 'stainless_steel', 0, 0, 0, ow, oh, od));

  // Inner cavity (visually slightly darker stainless)
  prims.push(box('Inner Cavity', 'chamber_body', 'steel', 0, wall / 2, 0, iw, ih, id));

  // Door (front face, with rubber gasket seal)
  prims.push(box('Chamber Door', 'door', 'stainless_steel', 0, 0, -(od / 2 + 0.008), ow * 0.85, oh * 0.85, 0.015));
  prims.push(box('Door Handle', 'door', 'steel', ow * 0.35, 0, -(od / 2 + 0.02), 0.06, 0.025, 0.02));

  // Rubber seal (torus-like frame around door — approximated with 4 box strips)
  const sealT = 0.008;
  const doorW = ow * 0.85, doorH = oh * 0.85;
  prims.push(box('Seal Top', 'door', 'rubber', 0, doorH / 2, -(od / 2 + 0.004), doorW, sealT, sealT));
  prims.push(box('Seal Bottom', 'door', 'rubber', 0, -doorH / 2, -(od / 2 + 0.004), doorW, sealT, sealT));
  prims.push(box('Seal Left', 'door', 'rubber', -doorW / 2, 0, -(od / 2 + 0.004), sealT, doorH, sealT));
  prims.push(box('Seal Right', 'door', 'rubber', doorW / 2, 0, -(od / 2 + 0.004), sealT, doorH, sealT));

  // Observation window (circular acrylic on door)
  prims.push(cyl('Observation Window', 'door', 'acrylic', 0, 0.04, -(od / 2 + 0.01), 0.06, 0.012, Math.PI / 2));

  // 4 spray nozzles on top (stainless, protruding inward)
  const nozzleSpacing = iw / 3;
  for (let i = 0; i < 4; i++) {
    const nx = -iw / 2 + nozzleSpacing * (i * 0.8 + 0.35);
    prims.push(cyl(`Nozzle ${i + 1}`, 'spray_system', 'stainless_steel',
      nx, oh / 2 - wall - 0.02, 0, 0.012, 0.05));
    prims.push(sphere(`Nozzle Head ${i + 1}`, 'spray_system', 'brass',
      nx, oh / 2 - wall - 0.05, 0, 0.015));
  }

  // Salt solution inlet pipe (side)
  prims.push(cyl('Salt Inlet Pipe', 'spray_system', 'pvc',
    ow / 2 + 0.03, oh / 4, 0, 0.015, 0.06, 0, 0, Math.PI / 2));
  prims.push(cyl('Inlet Valve', 'spray_system', 'brass',
    ow / 2 + 0.06, oh / 4, 0, 0.02, 0.03, 0, 0, Math.PI / 2));

  // Drain at bottom
  prims.push(cyl('Floor Drain', 'drain', 'stainless_steel', 0, -oh / 2, 0, 0.025, wall));
  prims.push(cyl('Drain Pipe', 'drain', 'pvc', 0, -oh / 2 - 0.04, 0, 0.015, 0.06));
  prims.push(cyl('Drain Valve', 'drain', 'brass', 0, -oh / 2 - 0.08, 0, 0.02, 0.025));

  // Module rack inside (tilted 20°)
  const tilt = (20 * Math.PI) / 180;
  prims.push(box('Module Rack', 'test_specimen', 'pvc',
    0.05, -0.02, 0.03, iw * 0.8, 0.008, id * 0.7, tilt));

  // Compressed air BSP port (side)
  prims.push(cyl('Air Inlet BSP', 'spray_system', 'brass',
    -(ow / 2), 0.05, 0, 0.02, 0.04, 0, 0, Math.PI / 2));

  // Heating element (bottom)
  prims.push(box('Heater Plate', 'heating', 'copper',
    0, -oh / 2 + wall + 0.01, 0, iw * 0.9, 0.008, id * 0.9));

  // Temperature sensor
  prims.push(cyl('Temp Sensor', 'sensors', 'sensor',
    iw / 3, 0, id / 3, 0.008, 0.05));

  return {
    id: 'iec_salt_mist_chamber',
    name: 'Salt Mist / Corrosion Test Chamber',
    standard: 'IEC 61701',
    category: 'environmental_chamber',
    description: '600×500×400mm SS316 chamber with 50mm walls, 4 spray nozzles, door with rubber seal, drain, heater plate, module rack.',
    boundingBox: [ow + 0.2, oh + 0.3, od + 0.15],
    groups: ['chamber_body', 'door', 'spray_system', 'drain', 'test_specimen', 'heating', 'sensors'],
    primitives: prims,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. UV Conditioning Chamber (IEC 61215 MQT 10)
//    800×600×400mm, UV lamp array (8 lamps, 300mm spacing), reflector panels,
//    sample rack, ventilation louvers.
// ═══════════════════════════════════════════════════════════════════════════════

export function buildUVChamber(): IECEquipmentGeometry {
  const cw = 0.8, ch = 0.6, cd = 0.4;
  const wall = 0.04;
  const lampCount = 8;
  const lampSpacing = (cw - 2 * wall) / lampCount;
  const prims: GeomPrimitive[] = [];

  // Outer cabinet
  prims.push(box('Cabinet Shell', 'cabinet', 'insulated_steel', 0, 0, 0, cw, ch, cd));

  // Interior floor
  prims.push(box('Interior Floor', 'cabinet', 'aluminum',
    0, -ch / 2 + wall + 0.005, 0, cw - 2 * wall, 0.01, cd - 2 * wall));

  // Interior ceiling
  prims.push(box('Interior Ceiling', 'cabinet', 'aluminum',
    0, ch / 2 - wall - 0.005, 0, cw - 2 * wall, 0.01, cd - 2 * wall));

  // UV lamp array (8 UVA-340 lamps, horizontal tubes)
  for (let i = 0; i < lampCount; i++) {
    const lx = -cw / 2 + wall + lampSpacing * (i + 0.5);
    const ly = ch / 2 - wall - 0.04;
    const lampLen = cd - 2 * wall - 0.04;
    prims.push(cyl(`UVA-340 Lamp ${i + 1}`, 'uv_lamps', 'uva_lamp',
      lx, ly, 0, 0.016, lampLen, Math.PI / 2));
    // Lamp end caps
    prims.push(cyl(`Lamp Cap L ${i + 1}`, 'uv_lamps', 'aluminum',
      lx, ly, -(lampLen / 2 + 0.005), 0.018, 0.01, Math.PI / 2));
    prims.push(cyl(`Lamp Cap R ${i + 1}`, 'uv_lamps', 'aluminum',
      lx, ly, (lampLen / 2 + 0.005), 0.018, 0.01, Math.PI / 2));
  }

  // Reflector panels (polished aluminum behind lamps)
  prims.push(box('Reflector Panel', 'reflectors', 'reflector_aluminum',
    0, ch / 2 - wall - 0.01, 0, cw - 2 * wall - 0.01, 0.003, cd - 2 * wall - 0.02));

  // Side reflectors
  prims.push(box('Side Reflector L', 'reflectors', 'reflector_aluminum',
    -(cw / 2 - wall - 0.005), 0, 0, 0.003, ch - 2 * wall, cd - 2 * wall - 0.02));
  prims.push(box('Side Reflector R', 'reflectors', 'reflector_aluminum',
    (cw / 2 - wall - 0.005), 0, 0, 0.003, ch - 2 * wall, cd - 2 * wall - 0.02));

  // Sample rack (tilted 45°)
  const rackTilt = (45 * Math.PI) / 180;
  prims.push(box('Sample Rack', 'test_specimen', 'aluminum_perforated',
    0, -0.05, 0, cw * 0.75, 0.01, cd * 0.65, rackTilt));
  // Rack supports
  prims.push(box('Rack Support L', 'test_specimen', 'steel',
    -(cw * 0.35), -0.15, 0, 0.015, 0.25, 0.015));
  prims.push(box('Rack Support R', 'test_specimen', 'steel',
    (cw * 0.35), -0.15, 0, 0.015, 0.25, 0.015));

  // Ventilation louvers (front + rear)
  for (let j = 0; j < 3; j++) {
    const ly2 = -ch / 4 + j * 0.06;
    prims.push(box(`Louver Front ${j + 1}`, 'ventilation', 'steel',
      0, ly2, -(cd / 2 + 0.005), 0.15, 0.008, 0.008, 0.2));
    prims.push(box(`Louver Rear ${j + 1}`, 'ventilation', 'steel',
      0, ly2, (cd / 2 + 0.005), 0.15, 0.008, 0.008, -0.2));
  }

  // UV irradiance sensor
  prims.push(box('UV Sensor', 'sensors', 'sensor',
    cw / 2 - wall - 0.04, 0.1, 0, 0.06, 0.04, 0.04));
  prims.push(cyl('Sensor Probe', 'sensors', 'glass',
    cw / 2 - wall - 0.04, 0.1, -0.03, 0.008, 0.02, Math.PI / 2));

  // Control panel (external, bottom)
  prims.push(box('Control Panel', 'controls', 'plastic',
    0, -(ch / 2 + 0.1), 0, 0.25, 0.15, 0.15));
  prims.push(box('LCD Display', 'controls', 'lcd_display',
    0, -(ch / 2 + 0.06), -0.076, 0.12, 0.06, 0.005));

  // Door (front)
  prims.push(box('Access Door', 'door', 'insulated_steel',
    0, 0, -(cd / 2 + 0.015), cw * 0.9, ch * 0.9, 0.02));
  prims.push(box('Door Handle', 'door', 'steel',
    cw * 0.38, 0, -(cd / 2 + 0.03), 0.05, 0.02, 0.02));

  return {
    id: 'iec_uv_conditioning_chamber',
    name: 'UV Conditioning Chamber',
    standard: 'IEC 61215 MQT 10 / IEC 62788-7-2',
    category: 'environmental_chamber',
    description: '800×600×400mm insulated cabinet with 8× UVA-340 lamps at 300mm spacing, polished reflector panels, 45° sample rack, ventilation louvers.',
    boundingBox: [cw + 0.2, ch + 0.4, cd + 0.2],
    groups: ['cabinet', 'uv_lamps', 'reflectors', 'test_specimen', 'ventilation', 'sensors', 'controls', 'door'],
    primitives: prims,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Thermal Cycling / Damp Heat Chamber (IEC 61215 MQT 11)
//    Double-wall insulated (75mm PU foam), heater/cooler arrays,
//    thermocouple ports, circulation fan, module hanging rails, viewing window.
// ═══════════════════════════════════════════════════════════════════════════════

export function buildThermalCyclingChamber(): IECEquipmentGeometry {
  const cw = 1.6, cd = 1.2, ch = 1.8;
  const ins = 0.075; // 75mm insulation
  const iw = cw - 2 * ins, icd = cd - 2 * ins, ich = ch - 2 * ins;
  const prims: GeomPrimitive[] = [];

  // Outer shell
  prims.push(box('Outer Shell', 'cabinet', 'insulated_steel', 0, 0, 0, cw, ch, cd));

  // Inner shell (stainless steel interior)
  prims.push(box('Inner Shell', 'cabinet', 'stainless_steel', 0, 0, 0, iw, ich, icd));

  // Insulation layer visible at edges (PU foam ring)
  prims.push(box('Insulation Top', 'insulation', 'plastic',
    0, ch / 2 - ins / 2, 0, cw, ins, cd));
  prims.push(box('Insulation Bottom', 'insulation', 'plastic',
    0, -ch / 2 + ins / 2, 0, cw, ins, cd));

  // Module hanging rails (4 rails)
  const railCount = 4;
  for (let i = 0; i < railCount; i++) {
    const ry = ch / 2 - ins - (i + 1) * 0.3;
    prims.push(cyl(`Hanging Rail ${i + 1}`, 'interior', 'steel',
      0, ry, 0, 0.012, icd - 0.05, Math.PI / 2));
    // Rail brackets
    prims.push(box(`Rail Bracket L${i + 1}`, 'interior', 'steel',
      -(iw / 2 - 0.02), ry, 0, 0.03, 0.03, 0.02));
    prims.push(box(`Rail Bracket R${i + 1}`, 'interior', 'steel',
      (iw / 2 - 0.02), ry, 0, 0.03, 0.03, 0.02));
  }

  // Heater bank (4× 2kW strip heaters at bottom)
  for (let i = 0; i < 4; i++) {
    const hx = -cw * 0.25 + i * (cw * 0.15);
    prims.push(box(`Strip Heater ${i + 1}`, 'heating', 'copper',
      hx, -ch / 2 + ins + 0.04, 0, 0.12, 0.025, icd * 0.8));
  }

  // Heater guard plate
  prims.push(box('Heater Guard', 'heating', 'aluminum_perforated',
    -cw * 0.1, -ch / 2 + ins + 0.08, 0, cw * 0.45, 0.005, icd * 0.85));

  // Evaporator coils (cooling, top area — series of tubes)
  for (let i = 0; i < 3; i++) {
    prims.push(cyl(`Evaporator Coil ${i + 1}`, 'cooling', 'copper',
      cw * 0.15, ch / 2 - ins - 0.06 - i * 0.04, 0, 0.01, icd * 0.8, Math.PI / 2));
  }

  // Circulation fan (rear wall, centre)
  prims.push(cyl('Circulation Fan', 'airflow', 'steel',
    0, 0, cd / 2 - ins - 0.05, 0.2, 0.08, Math.PI / 2));
  prims.push(cyl('Fan Hub', 'airflow', 'steel',
    0, 0, cd / 2 - ins - 0.04, 0.04, 0.04, Math.PI / 2));

  // Viewing window (double-glazed, 400×400mm, front)
  prims.push(box('Window Outer Pane', 'door', 'glass',
    0, 0.1, -(cd / 2 + 0.002), 0.4, 0.4, 0.006));
  prims.push(box('Window Inner Pane', 'door', 'glass',
    0, 0.1, -(cd / 2 - 0.015), 0.4, 0.4, 0.006));
  prims.push(box('Window Frame', 'door', 'steel',
    0, 0.1, -(cd / 2), 0.44, 0.44, 0.025));

  // Access door
  prims.push(box('Access Door', 'door', 'insulated_steel',
    0, 0, -(cd / 2 + 0.02), cw * 0.5, ch * 0.85, 0.04));
  prims.push(box('Door Handle', 'door', 'steel',
    cw * 0.22, 0, -(cd / 2 + 0.045), 0.07, 0.025, 0.025));
  // Door seal
  prims.push(torus('Door Seal', 'door', 'rubber',
    0, 0, -(cd / 2 + 0.018), 0.35, 0.008, Math.PI / 2));

  // Thermocouple ports (6, right side wall)
  for (let i = 0; i < 6; i++) {
    const ty = -ch / 3 + i * (ch * 0.12);
    prims.push(cyl(`TC Port ${i + 1}`, 'sensors', 'brass',
      cw / 2, ty, 0, 0.008, 0.04, 0, 0, Math.PI / 2));
  }

  // Safety blow-off valve (top)
  prims.push(cyl('Blow-off Valve', 'safety', 'steel',
    0, ch / 2 + 0.05, 0, 0.04, 0.1));
  prims.push(cyl('Valve Cap', 'safety', 'brass',
    0, ch / 2 + 0.11, 0, 0.03, 0.02));

  // Control panel (external, floor level)
  prims.push(box('Control Panel', 'controls', 'plastic',
    0, -(ch / 2 + 0.15), 0, 0.3, 0.25, 0.2));
  prims.push(box('Panel Display', 'controls', 'lcd_display',
    0, -(ch / 2 + 0.08), -0.1, 0.15, 0.08, 0.005));

  // Compressor unit (rear, external)
  prims.push(box('Compressor', 'cooling', 'steel',
    0, -(ch / 2 - 0.3), cd / 2 + 0.2, 0.5, 0.6, 0.35));
  prims.push(cyl('Compressor Motor', 'cooling', 'steel',
    0, -(ch / 2 - 0.3), cd / 2 + 0.2, 0.15, 0.25));
  // Refrigerant lines
  prims.push(cyl('Refrigerant Line 1', 'cooling', 'copper',
    0.15, -(ch / 4), cd / 2 + 0.05, 0.01, 0.6));
  prims.push(cyl('Refrigerant Line 2', 'cooling', 'copper',
    -0.15, -(ch / 4), cd / 2 + 0.05, 0.008, 0.6));

  return {
    id: 'iec_thermal_cycling_chamber',
    name: 'Thermal Cycling / Damp Heat Chamber',
    standard: 'IEC 61215 MQT 11',
    category: 'environmental_chamber',
    description: '1600×1200×1800mm double-wall insulated chamber (75mm PU foam), 4× 2kW strip heaters, evaporator coils, 400mm circulation fan, 4 hanging rails, double-glazed viewing window, 6 TC ports.',
    boundingBox: [cw + 0.6, ch + 0.5, cd + 0.6],
    groups: ['cabinet', 'insulation', 'interior', 'heating', 'cooling', 'airflow', 'door', 'sensors', 'safety', 'controls'],
    primitives: prims,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Flash Solar Simulator (IEC 60904-9)
//    1200×1200×800mm light head, xenon lamps in ring pattern, elliptical
//    reflector, shutter mechanism, DUT table below.
// ═══════════════════════════════════════════════════════════════════════════════

export function buildFlashSimulator(): IECEquipmentGeometry {
  const lw = 1.2, ld = 1.2, lh = 0.8;
  const tableH = 0.9;
  const prims: GeomPrimitive[] = [];

  // Light head housing
  prims.push(box('Light Head Housing', 'light_head', 'steel', 0, tableH + lh / 2 + 0.3, 0, lw, lh, ld));

  // Elliptical reflector (interior top — large disc)
  prims.push(cyl('Elliptical Reflector', 'light_head', 'reflector_aluminum',
    0, tableH + 0.35, 0, lw / 2 - 0.05, 0.02));

  // Xenon lamps in ring pattern (8 lamps, arranged in circle R=0.35)
  const lampR = 0.35;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    const lx = Math.cos(angle) * lampR;
    const lz = Math.sin(angle) * lampR;
    const lampY = tableH + lh / 2 + 0.3;
    prims.push(cyl(`Xenon Lamp ${i + 1}`, 'xenon_array', 'xenon_lamp',
      lx, lampY, lz, 0.04, 0.15));
    prims.push(cyl(`Lamp Reflector ${i + 1}`, 'xenon_array', 'reflector_aluminum',
      lx, lampY + 0.1, lz, 0.06, 0.04));
    prims.push(cyl(`Lamp Base ${i + 1}`, 'xenon_array', 'brass',
      lx, lampY - 0.08, lz, 0.015, 0.02));
  }

  // Central trigger unit
  prims.push(cyl('Central Trigger', 'xenon_array', 'steel',
    0, tableH + lh / 2 + 0.3, 0, 0.05, 0.2));

  // Shutter mechanism (horizontal plates)
  prims.push(box('Shutter Plate 1', 'shutter', 'shutter_plate',
    -0.15, tableH + 0.28, 0, 0.55, 0.008, ld * 0.8));
  prims.push(box('Shutter Plate 2', 'shutter', 'shutter_plate',
    0.15, tableH + 0.28, 0, 0.55, 0.008, ld * 0.8));
  prims.push(cyl('Shutter Actuator', 'shutter', 'steel',
    lw / 2 - 0.05, tableH + 0.28, 0, 0.025, 0.08, 0, 0, Math.PI / 2));

  // Diffuser plate
  prims.push(box('Diffuser Plate', 'light_head', 'glass',
    0, tableH + 0.25, 0, lw * 0.9, 0.01, ld * 0.9));

  // DUT table
  prims.push(box('DUT Table Top', 'dut_table', 'steel',
    0, tableH / 2, 0, lw + 0.2, 0.04, ld + 0.2));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    prims.push(box(`Table Leg ${sx > 0 ? 'R' : 'L'}${sz > 0 ? 'R' : 'F'}`, 'dut_table', 'steel',
      sx * (lw / 2 + 0.05), tableH / 4, sz * (ld / 2 + 0.05), 0.05, tableH / 2, 0.05));
  }

  // Reference cell on table
  prims.push(box('Reference Cell', 'sensors', 'silicon',
    lw / 3, tableH / 2 + 0.03, 0, 0.1, 0.02, 0.1));

  // Support columns (4)
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    prims.push(box(`Support Column ${sx > 0 ? 'R' : 'L'}${sz > 0 ? 'R' : 'F'}`, 'structure', 'steel',
      sx * (lw / 2 - 0.03), tableH * 0.75, sz * (ld / 2 - 0.03), 0.06, tableH + lh, 0.06));
  }

  // Power supply unit (side)
  prims.push(box('PSU Cabinet', 'electronics', 'steel',
    lw / 2 + 0.4, 0.3, 0, 0.4, 0.6, 0.35));
  prims.push(box('PSU Display', 'electronics', 'lcd_display',
    lw / 2 + 0.4, 0.45, -0.176, 0.2, 0.1, 0.005));

  return {
    id: 'iec_flash_simulator',
    name: 'Flash Solar Simulator',
    standard: 'IEC 60904-9',
    category: 'electrical_test',
    description: '1200×1200×800mm light head with 8 xenon lamps in ring pattern, elliptical reflector, shutter mechanism, diffuser plate, DUT table with reference cell.',
    boundingBox: [lw + 1.0, tableH + lh + 0.5, ld + 0.5],
    groups: ['light_head', 'xenon_array', 'shutter', 'dut_table', 'sensors', 'structure', 'electronics'],
    primitives: prims,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. IV Curve Tracer (IEC 60904-1)
//    300×200×150mm enclosure, terminal block, BNC connectors, LCD display bezel.
// ═══════════════════════════════════════════════════════════════════════════════

export function buildIVTracer(): IECEquipmentGeometry {
  const ew = 0.3, ed = 0.2, eh = 0.15;
  const prims: GeomPrimitive[] = [];

  // Main enclosure
  prims.push(box('Enclosure', 'enclosure', 'steel', 0, 0, 0, ew, eh, ed));
  prims.push(box('Front Panel', 'enclosure', 'aluminum', 0, 0, -(ed / 2 + 0.002), ew - 0.01, eh - 0.01, 0.003));

  // LCD display bezel
  prims.push(box('LCD Bezel', 'display', 'plastic', 0, 0.02, -(ed / 2 + 0.005), 0.12, 0.065, 0.005));
  prims.push(box('LCD Screen', 'display', 'lcd_display', 0, 0.02, -(ed / 2 + 0.008), 0.1, 0.055, 0.003));

  // Control buttons
  for (let i = 0; i < 5; i++) {
    prims.push(cyl(`Button ${i + 1}`, 'controls', 'plastic',
      -0.06 + i * 0.03, -0.03, -(ed / 2 + 0.006), 0.006, 0.005, Math.PI / 2));
  }
  prims.push(cyl('Mode Selector', 'controls', 'plastic',
    0.1, -0.03, -(ed / 2 + 0.01), 0.012, 0.015, Math.PI / 2));

  // Terminal block (rear)
  prims.push(box('Terminal Block', 'connections', 'terminal_block',
    0, -0.02, ed / 2 + 0.005, 0.12, 0.04, 0.02));
  for (let i = 0; i < 4; i++) {
    prims.push(cyl(`Terminal ${i + 1}`, 'connections', 'brass',
      -0.04 + i * 0.028, -0.02, ed / 2 + 0.018, 0.005, 0.012, Math.PI / 2));
  }

  // BNC connectors (rear, 4)
  for (let i = 0; i < 4; i++) {
    prims.push(cyl(`BNC ${i + 1}`, 'connections', 'bnc_connector',
      -0.06 + i * 0.04, 0.035, ed / 2 + 0.01, 0.007, 0.02, Math.PI / 2));
    prims.push(cyl(`BNC Ring ${i + 1}`, 'connections', 'bnc_connector',
      -0.06 + i * 0.04, 0.035, ed / 2 + 0.022, 0.009, 0.005, Math.PI / 2));
  }

  prims.push(box('USB Port', 'connections', 'plastic',
    0.1, 0.03, ed / 2 + 0.005, 0.015, 0.006, 0.01));
  prims.push(box('Power Inlet', 'connections', 'plastic',
    -0.11, 0.03, ed / 2 + 0.005, 0.035, 0.025, 0.015));

  // Ventilation slots
  for (let i = 0; i < 4; i++) {
    prims.push(box(`Vent Slot ${i + 1}`, 'enclosure', 'steel_blackout',
      ew / 2 + 0.001, -0.03 + i * 0.02, 0, 0.002, 0.005, ed * 0.6));
  }

  // Rubber feet
  for (const [fx, fz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    prims.push(cyl(`Foot ${fx > 0 ? 'R' : 'L'}${fz > 0 ? 'R' : 'F'}`, 'enclosure', 'rubber',
      fx * (ew / 2 - 0.02), -eh / 2 - 0.005, fz * (ed / 2 - 0.02), 0.008, 0.01));
  }

  prims.push(box('Main PCB', 'internal', 'pcb_green',
    0, -0.02, 0, ew * 0.85, 0.002, ed * 0.8));

  return {
    id: 'iec_iv_curve_tracer',
    name: 'IV Curve Tracer',
    standard: 'IEC 60904-1',
    category: 'electrical_test',
    description: '300×200×150mm instrument enclosure with LCD display, 4 BNC connectors, terminal block, rotary selector, USB/RS232.',
    boundingBox: [ew + 0.1, eh + 0.1, ed + 0.1],
    groups: ['enclosure', 'display', 'controls', 'connections', 'internal'],
    primitives: prims,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Humidity Freeze Cycling Chamber (IEC 61215 MQT 12)
//    Walk-in 2000×1500×2200mm double-wall (100mm PU foam), 5-shelf rack,
//    roof compressor, 4 ceiling nozzles, 6 TC ports.
// ═══════════════════════════════════════════════════════════════════════════════

export function buildHumidityFreezeChamber(): IECEquipmentGeometry {
  const cw = 2.0, cd = 1.5, ch = 2.2;
  const ins = 0.1;
  const iw = cw - 2 * ins, icd = cd - 2 * ins, ich = ch - 2 * ins;
  const shelfCount = 5;
  const prims: GeomPrimitive[] = [];

  prims.push(box('Outer Shell', 'cabinet', 'insulated_steel', 0, 0, 0, cw, ch, cd));
  prims.push(box('Inner Cavity', 'cabinet', 'stainless_steel', 0, 0, 0, iw, ich, icd));

  // Shelves
  for (let i = 0; i < shelfCount; i++) {
    const sy = -ch / 2 + ins + (i + 1) * ((ch - 2 * ins) / (shelfCount + 1));
    prims.push(box(`Shelf ${i + 1}`, 'interior', 'aluminum', 0, sy, 0, iw - 0.05, 0.02, icd - 0.05));
    prims.push(box(`Shelf Bracket L${i + 1}`, 'interior', 'steel', -(iw / 2 - 0.02), sy, 0, 0.025, 0.04, 0.025));
    prims.push(box(`Shelf Bracket R${i + 1}`, 'interior', 'steel', (iw / 2 - 0.02), sy, 0, 0.025, 0.04, 0.025));
  }

  // Ceiling humidity nozzles (4)
  for (const [nx, nz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    prims.push(cyl(`Humidity Nozzle ${nx > 0 ? 'R' : 'L'}${nz > 0 ? 'R' : 'F'}`, 'humidity', 'stainless_steel',
      nx * (cw / 4), ch / 2 - ins - 0.04, nz * (cd / 4), 0.012, 0.06));
    prims.push(sphere(`Nozzle Tip ${nx > 0 ? 'R' : 'L'}${nz > 0 ? 'R' : 'F'}`, 'humidity', 'brass',
      nx * (cw / 4), ch / 2 - ins - 0.075, nz * (cd / 4), 0.015));
  }

  // Access door
  prims.push(box('Access Door', 'door', 'steel', 0, 0, -(cd / 2 + 0.02), 0.85, ch * 0.85, 0.04));
  prims.push(box('Door Handle', 'door', 'steel', 0.35, 0, -(cd / 2 + 0.045), 0.08, 0.03, 0.025));
  prims.push(box('Door Viewport', 'door', 'glass', 0, 0.3, -(cd / 2 + 0.025), 0.3, 0.3, 0.01));

  // Roof compressor
  prims.push(box('Compressor Housing', 'compressor', 'steel', 0, ch / 2 + 0.4, 0, 0.6, 0.8, 0.4));
  prims.push(cyl('Compressor Motor', 'compressor', 'steel', 0, ch / 2 + 0.4, 0, 0.18, 0.35));

  // TC ports (6, right side)
  for (let i = 0; i < 6; i++) {
    const ty = -ich / 3 + i * (ich * 0.12);
    prims.push(cyl(`TC Port ${i + 1}`, 'sensors', 'brass',
      cw / 2, ty, 0, 0.008, 0.04, 0, 0, Math.PI / 2));
  }

  prims.push(box('Control Panel', 'controls', 'plastic',
    cw / 2 + 0.15, 0, -(cd / 3), 0.25, 0.35, 0.12));

  return {
    id: 'iec_humidity_freeze_chamber',
    name: 'Humidity Freeze Cycling Chamber',
    standard: 'IEC 61215 MQT 12',
    category: 'environmental_chamber',
    description: '2000×1500×2200mm walk-in chamber, 100mm PU foam insulation, 5 shelves, 4 ceiling humidity nozzles, roof compressor, 6 TC ports.',
    boundingBox: [cw + 0.5, ch + 1.0, cd + 0.4],
    groups: ['cabinet', 'interior', 'humidity', 'door', 'compressor', 'sensors', 'controls'],
    primitives: prims,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Hail Impact Test Rig (IEC 61215 MQT 8)
//    3000mm steel drop tower with guide tube, steel ball, adjustable-tilt
//    module table, 9-point impact grid, safety cage.
// ═══════════════════════════════════════════════════════════════════════════════

export function buildHailImpactRig(): IECEquipmentGeometry {
  const th = 3.0, cs = 0.6, tl = 2.1, tw = 1.1;
  const prims: GeomPrimitive[] = [];

  // Guide rails
  prims.push(box('Guide Rail Left', 'tower', 'steel', -(cs / 2 - 0.01), th / 2, 0, 0.03, th, 0.03));
  prims.push(box('Guide Rail Right', 'tower', 'steel', (cs / 2 - 0.01), th / 2, 0, 0.03, th, 0.03));
  for (let i = 0; i < 3; i++) {
    prims.push(box(`Cross Brace ${i + 1}`, 'tower', 'steel', 0, th * (0.25 + i * 0.25), 0, cs - 0.02, 0.02, 0.02));
  }

  // Guide tube + ball
  prims.push(cyl('Guide Tube', 'tower', 'stainless_steel', 0, th / 2, 0, 0.05, th));
  prims.push(sphere('Steel Ball', 'projectile', 'stainless_steel', 0, th + 0.025, 0, 0.0125));
  prims.push(box('Release Mechanism', 'tower', 'steel', 0, th + 0.06, 0, 0.1, 0.04, 0.1));

  // Module fixture table
  const tableY = 0.45;
  prims.push(box('Module Table', 'test_table', 'steel', 0, tableY, cs / 2 + tl / 2, tl, 0.05, tw));
  prims.push(box('Table Leg FL', 'test_table', 'steel', 0, tableY / 2, cs / 2 + 0.02, 0.04, tableY, 0.04));
  prims.push(box('Table Leg FR', 'test_table', 'steel', 0, tableY / 2, cs / 2 + tl, 0.04, tableY, 0.04));

  // 9-point impact grid
  for (let r = 0; r < 3; r++) {
    for (let c2 = 0; c2 < 3; c2++) {
      prims.push(cyl(`Impact Point ${r * 3 + c2 + 1}`, 'impact_grid', 'plastic_amber',
        -(tl / 3) + r * (tl / 3), tableY + 0.03, cs / 2 + tw / 4 + c2 * (tw / 3), 0.015, 0.005));
    }
  }

  // Safety cage
  const cageH = th + 0.3;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    prims.push(box(`Cage Post ${sx > 0 ? 'R' : 'L'}${sz > 0 ? 'R' : 'F'}`, 'safety_cage', 'steel',
      sx * (cs / 2), cageH / 2, sz * (cs / 2), 0.03, cageH, 0.03));
  }
  prims.push(box('Cage Front', 'safety_cage', 'steel_mesh', 0, cageH / 2, -(cs / 2), cs, cageH, 0.005));
  prims.push(box('Cage Rear', 'safety_cage', 'steel_mesh', 0, cageH / 2, (cs / 2), cs, cageH, 0.005));
  prims.push(box('Cage Left', 'safety_cage', 'steel_mesh', -(cs / 2), cageH / 2, 0, 0.005, cageH, cs));
  prims.push(box('Cage Right', 'safety_cage', 'steel_mesh', (cs / 2), cageH / 2, 0, 0.005, cageH, cs));

  return {
    id: 'iec_hail_impact_rig',
    name: 'Hail Impact Test Rig',
    standard: 'IEC 61215 MQT 8',
    category: 'mechanical_test',
    description: '3000mm drop tower with guide tube, steel ball, module table, 9-point impact grid, safety cage.',
    boundingBox: [cs + tl + 0.3, th + 0.5, tw + 0.3],
    groups: ['tower', 'projectile', 'test_table', 'impact_grid', 'safety_cage'],
    primitives: prims,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. EL Imaging Dark Box (IEC TS 60904-13)
//    2500×1500×500mm light-tight enclosure, overhead camera rail, DC injection
//    contact block, corner module clips, light-trap baffles.
// ═══════════════════════════════════════════════════════════════════════════════

export function buildELDarkBox(): IECEquipmentGeometry {
  const bl = 2.5, bw = 1.5, bh = 0.5;
  const wall = 0.003;
  const mt = 0.035; // module thickness
  const camH = 0.3;
  const prims: GeomPrimitive[] = [];

  // Blackout enclosure
  prims.push(box('Enclosure', 'enclosure', 'steel_blackout', 0, 0, 0, bl, bh, bw));

  // Interior lining (matt black)
  prims.push(box('Interior Lining', 'enclosure', 'rubber',
    0, 0, 0, bl - 2 * wall, bh - 2 * wall, bw - 2 * wall));

  // Test module (DUT)
  prims.push(box('Test Module DUT', 'test_specimen', 'glass',
    0, -bh / 2 + mt / 2, 0, bl - 0.02, mt, bw - 0.02));

  // Corner clips (4)
  for (const [sx, sz, lbl] of [[-1, -1, 'NW'], [1, -1, 'NE'], [-1, 1, 'SW'], [1, 1, 'SE']] as const) {
    prims.push(box(`Module Clip ${lbl}`, 'fixtures', 'steel',
      sx * (bl / 2 - wall - 0.03), -bh / 2 + mt + 0.005, sz * (bw / 2 - wall - 0.03), 0.06, 0.01, 0.06));
  }

  // Camera rail system (2 parallel rails + cross bar)
  const camY = -bh / 2 + mt + camH;
  prims.push(box('Camera Rail Left', 'camera_system', 'steel',
    -(bl / 2 - 0.05), camY, 0, 0.015, 0.008, bw - 0.1));
  prims.push(box('Camera Rail Right', 'camera_system', 'steel',
    (bl / 2 - 0.05), camY, 0, 0.015, 0.008, bw - 0.1));
  prims.push(box('Camera Cross Bar', 'camera_system', 'steel',
    0, camY, 0, bl - 0.1, 0.012, 0.012));

  // EL Camera
  prims.push(box('EL Camera Body', 'camera_system', 'camera_body',
    0, camY + 0.1, 0, 0.3, 0.2, 0.15));
  prims.push(cyl('Camera Lens', 'camera_system', 'glass',
    0, camY + 0.025, 0, 0.06, 0.05, Math.PI / 2));
  // Camera mounting bracket
  prims.push(box('Camera Bracket', 'camera_system', 'steel',
    0, camY + 0.015, 0, 0.08, 0.015, 0.08));

  // DC injection contact block
  prims.push(box('DC Contact Block', 'electrical', 'steel',
    bl / 2 - wall - 0.06, -bh / 2 + 0.05, 0, 0.1, 0.06, 0.08));
  prims.push(cyl('DC Terminal +', 'electrical', 'brass',
    bl / 2 - wall - 0.04, -bh / 2 + 0.085, 0.02, 0.008, 0.015));
  prims.push(cyl('DC Terminal -', 'electrical', 'brass',
    bl / 2 - wall - 0.04, -bh / 2 + 0.085, -0.02, 0.008, 0.015));

  // Light-trap ventilation baffles (front + rear)
  prims.push(box('Baffle Front', 'ventilation', 'steel_blackout',
    0, -bh / 4, -(bw / 2), 0.15, 0.04, wall));
  prims.push(box('Baffle Rear', 'ventilation', 'steel_blackout',
    0, -bh / 4, (bw / 2), 0.15, 0.04, wall));

  // Lid with hinges
  prims.push(box('Enclosure Lid', 'enclosure', 'steel_blackout',
    0, bh / 2 + 0.008, 0, bl, 0.015, bw));
  prims.push(cyl('Hinge Left', 'enclosure', 'steel',
    -(bl / 2), bh / 2, bw / 2, 0.01, 0.1, 0, 0, Math.PI / 2));
  prims.push(cyl('Hinge Right', 'enclosure', 'steel',
    (bl / 2), bh / 2, bw / 2, 0.01, 0.1, 0, 0, Math.PI / 2));

  return {
    id: 'iec_el_imaging_dark_box',
    name: 'EL Imaging Dark Box',
    standard: 'IEC TS 60904-13',
    category: 'electrical_test',
    description: '2500×1500×500mm light-tight enclosure with overhead camera rail, EL camera, DC injection, corner clips, light-trap baffles.',
    boundingBox: [bl + 0.2, bh + 0.4, bw + 0.2],
    groups: ['enclosure', 'test_specimen', 'fixtures', 'camera_system', 'electrical', 'ventilation'],
    primitives: prims,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. Insulation / HiPot Test Bench (IEC 61730 MST 16)
//     1800×900×900mm steel table, rubber mat, HV transformer, hipot tester,
//     ground bus bar, module clamps, safety interlocks, warning beacon.
// ═══════════════════════════════════════════════════════════════════════════════

export function buildHiPotTestBench(): IECEquipmentGeometry {
  const bl = 1.8, bw = 0.9, bh = 0.9;
  const prims: GeomPrimitive[] = [];

  // Bench frame
  prims.push(box('Bench Frame', 'bench', 'steel', 0, -bh / 2, 0, bl, bh, bw));
  prims.push(box('Bench Worktop', 'bench', 'steel', 0, 0, 0, bl, 0.05, bw));

  // Rubber mat
  prims.push(box('Anti-Static Mat', 'bench', 'rubber', 0, 0.03, 0, bl - 0.05, 0.008, bw - 0.05));

  // Table legs (4)
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    prims.push(box(`Leg ${sx > 0 ? 'R' : 'L'}${sz > 0 ? 'R' : 'F'}`, 'bench', 'steel',
      sx * (bl / 2 - 0.04), -bh / 2, sz * (bw / 2 - 0.04), 0.05, bh, 0.05));
  }

  // HV isolation transformer
  prims.push(box('HV Transformer', 'hv_equipment', 'steel',
    -(bl / 2 - 0.25), 0.35, 0, 0.5, 0.6, 0.4));
  prims.push(cyl('Transformer Core', 'hv_equipment', 'copper',
    -(bl / 2 - 0.25), 0.35, 0, 0.12, 0.4));

  // DC hipot tester
  prims.push(box('Hipot Tester', 'hv_equipment', 'plastic',
    (bl / 2 - 0.2), 0.1, 0, 0.4, 0.2, 0.3));
  prims.push(box('Hipot Display', 'hv_equipment', 'lcd_display',
    (bl / 2 - 0.2), 0.15, -0.151, 0.2, 0.08, 0.005));
  // Hipot dial
  prims.push(cyl('Voltage Dial', 'hv_equipment', 'plastic',
    (bl / 2 - 0.1), 0.05, -0.151, 0.02, 0.015, Math.PI / 2));

  // Ground bus bar (copper, 1200mm)
  prims.push(box('Ground Bus Bar', 'grounding', 'copper',
    0, 0.04, -(bw / 2 - 0.03), 1.2, 0.01, 0.05));
  // Bus bar terminals
  for (let i = 0; i < 6; i++) {
    prims.push(cyl(`Bus Terminal ${i + 1}`, 'grounding', 'brass',
      -0.5 + i * 0.2, 0.052, -(bw / 2 - 0.03), 0.008, 0.015));
  }

  // Module clamps (adjustable, left + right)
  prims.push(box('Module Clamp Left', 'fixtures', 'steel',
    -(bl / 2 - 0.1), 0.06, 0, 0.04, 0.03, 0.04));
  prims.push(box('Module Clamp Right', 'fixtures', 'steel',
    (bl / 2 - 0.1), 0.06, 0, 0.04, 0.03, 0.04));
  prims.push(box('Clamp Rail', 'fixtures', 'steel',
    0, 0.045, 0, bl - 0.15, 0.01, 0.02));

  // Safety interlocks (2, front corners)
  prims.push(box('Interlock Switch L', 'safety', 'plastic',
    -(bl / 2 - 0.05), 0.15, -(bw / 2 - 0.05), 0.03, 0.03, 0.03));
  prims.push(box('Interlock Switch R', 'safety', 'plastic',
    (bl / 2 - 0.05), 0.15, -(bw / 2 - 0.05), 0.03, 0.03, 0.03));

  // Warning beacon (amber)
  prims.push(cyl('Warning Beacon', 'safety', 'plastic_amber',
    0, bh / 2 + 0.15, 0, 0.08, 0.12));
  prims.push(cyl('Beacon Base', 'safety', 'steel',
    0, bh / 2 + 0.06, 0, 0.03, 0.08));

  // HV cables (red, from transformer to tester)
  prims.push(cyl('HV Cable', 'hv_equipment', 'rubber',
    0, 0.2, 0.1, 0.008, bl * 0.6, 0, 0, Math.PI / 2));

  return {
    id: 'iec_hipot_test_bench',
    name: 'Insulation / HiPot Test Bench',
    standard: 'IEC 61730 MST 16',
    category: 'electrical_test',
    description: '1800×900×900mm steel bench with HV transformer, hipot tester, copper ground bus bar, module clamps, safety interlocks, amber beacon.',
    boundingBox: [bl + 0.3, bh + 0.5, bw + 0.2],
    groups: ['bench', 'hv_equipment', 'grounding', 'fixtures', 'safety'],
    primitives: prims,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. IV Curve Tracer Station (IEC 60904-1)
//     2000×1000×900mm optical bench with xenon flash simulator, reference cell,
//     DUT module clamp, rack-mounted tracer, temperature controller.
// ═══════════════════════════════════════════════════════════════════════════════

export function buildIVTracerStation(): IECEquipmentGeometry {
  const bl = 2.0, bw = 1.0, bh = 0.9;
  const ss = 1.2; // simulator size
  const prims: GeomPrimitive[] = [];

  // Optical bench
  prims.push(box('Bench Worktop', 'bench', 'steel', 0, 0, 0, bl, 0.05, bw));
  prims.push(box('Bench Frame', 'bench', 'steel', 0, -bh / 2, 0, bl, bh, bw));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    prims.push(box(`Bench Leg ${sx > 0 ? 'R' : 'L'}${sz > 0 ? 'R' : 'F'}`, 'bench', 'steel',
      sx * (bl / 2 - 0.05), -bh / 2, sz * (bw / 2 - 0.05), 0.06, bh, 0.06));
  }

  // Solar simulator head (overhead)
  const simH = bh / 2 + 1.2;
  prims.push(box('Simulator Head', 'simulator', 'steel', 0, simH, 0, ss, 0.04, ss));
  prims.push(box('Simulator Housing', 'simulator', 'steel', 0, simH + 0.15, 0, ss + 0.1, 0.28, ss + 0.1));

  // Xenon lamps (4, in 2×2 grid)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const lx = -ss / 2 + 0.3 + col * (ss - 0.6);
      const lz = -ss / 2 + 0.3 + row * (ss - 0.6);
      prims.push(cyl(`Xenon Lamp ${row * 2 + col + 1}`, 'simulator', 'xenon_lamp',
        lx, simH + 0.1, lz, 0.08, 0.12));
    }
  }

  // Support columns (4)
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    prims.push(box(`Support Col ${sx > 0 ? 'R' : 'L'}${sz > 0 ? 'R' : 'F'}`, 'structure', 'steel',
      sx * (ss / 2 + 0.05), (simH + 0.03) / 2, sz * (ss / 2 + 0.05), 0.05, simH + 0.03, 0.05));
  }

  // DUT module clamp
  prims.push(box('DUT Module', 'test_specimen', 'glass',
    0, bh / 2 + 0.02, 0, 2.1, 0.035, 1.1));
  prims.push(box('DUT Clamp L', 'test_specimen', 'steel',
    -1.05, bh / 2 + 0.04, 0, 0.03, 0.02, 0.04));
  prims.push(box('DUT Clamp R', 'test_specimen', 'steel',
    1.05, bh / 2 + 0.04, 0, 0.03, 0.02, 0.04));

  // Reference cell
  prims.push(box('Reference Cell', 'sensors', 'silicon',
    0.5, bh / 2 + 0.015, 0.3, 0.1, 0.02, 0.1));

  // Rack-mounted IV tracer unit
  prims.push(box('IV Tracer Rack', 'electronics', 'steel',
    bl / 2 + 0.35, 0.1, 0, 0.6, 0.4, 0.3));
  prims.push(box('Tracer Display', 'electronics', 'lcd_display',
    bl / 2 + 0.35, 0.2, -0.151, 0.25, 0.12, 0.005));

  // Temperature controller
  prims.push(box('Temp Controller', 'electronics', 'plastic',
    bl / 2 + 0.35, -0.15, 0, 0.2, 0.15, 0.1));

  // Cable management tray
  prims.push(box('Cable Tray', 'structure', 'plastic',
    0, bh / 2 + 0.025, bw / 2 + 0.05, bl, 0.05, 0.1));

  return {
    id: 'iec_iv_curve_tracer_station',
    name: 'IV Curve Tracer Station',
    standard: 'IEC 60904-1 / IEC 60904-9',
    category: 'electrical_test',
    description: '2000×1000×900mm optical bench with 1200mm xenon simulator (4 lamps), reference cell, DUT clamp, rack IV tracer, temp controller.',
    boundingBox: [bl + 1.0, simH + 0.5, bw + 0.3],
    groups: ['bench', 'simulator', 'structure', 'test_specimen', 'sensors', 'electronics'],
    primitives: prims,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. Bypass Diode Thermal Test Fixture (IEC 61215 MQT 18)
//     600×400×300mm insulated box, banana jack terminals, IR camera on arm,
//     external current source, thermal probe ports, ambient thermocouple.
// ═══════════════════════════════════════════════════════════════════════════════

export function buildBypassDiodeThermalFixture(): IECEquipmentGeometry {
  const bw = 0.6, bd = 0.4, bh = 0.3;
  const camArm = 0.4;
  const prims: GeomPrimitive[] = [];

  // Insulated test box
  prims.push(box('Test Box', 'enclosure', 'insulated_steel', 0, 0, 0, bw, bh, bd));
  prims.push(box('Interior Lining', 'enclosure', 'stainless_steel',
    0, 0, 0, bw - 0.04, bh - 0.04, bd - 0.04));

  // Lid (removable)
  prims.push(box('Box Lid', 'enclosure', 'insulated_steel',
    0, bh / 2 + 0.01, 0, bw + 0.02, 0.02, bd + 0.02));

  // Banana jack terminals (4, on top)
  const termLabels = ['Terminal +', 'Terminal -', 'Terminal S+', 'Terminal S-'];
  const termX = [-0.05, -0.1, 0.05, 0.1];
  for (let i = 0; i < 4; i++) {
    prims.push(cyl(termLabels[i], 'electrical', 'brass',
      termX[i] - bw / 2 + bw / 2, bh / 2 + 0.025, -(bd / 4), 0.006, 0.03));
    prims.push(box(`Term Base ${i + 1}`, 'electrical', 'plastic',
      termX[i] - bw / 2 + bw / 2, bh / 2 + 0.008, -(bd / 4), 0.02, 0.01, 0.02));
  }

  // IR camera adjustable arm (vertical post + camera)
  prims.push(box('Camera Arm Post', 'camera_system', 'steel',
    0, bh / 2 + camArm / 2, bd / 4, 0.025, camArm, 0.025));
  prims.push(box('Camera Arm Base', 'camera_system', 'steel',
    0, bh / 2, bd / 4, 0.06, 0.02, 0.06));

  // IR camera
  prims.push(box('IR Camera Body', 'camera_system', 'camera_body',
    0, bh / 2 + camArm, bd / 4, 0.35, 0.25, 0.18));
  prims.push(cyl('IR Camera Lens', 'camera_system', 'glass',
    0, bh / 2 + camArm - 0.08, bd / 4 - 0.1, 0.045, 0.06, Math.PI / 2));

  // Thermal probe ports (4, left side wall)
  for (let i = 0; i < 4; i++) {
    const ty = -bh / 2 + (i + 1) * (bh / 5);
    prims.push(cyl(`Thermal Probe ${i + 1}`, 'sensors', 'steel',
      -bw / 2, ty, 0, 0.01, 0.04, 0, 0, Math.PI / 2));
    prims.push(cyl(`Probe Gland ${i + 1}`, 'sensors', 'brass',
      -bw / 2 - 0.025, ty, 0, 0.012, 0.01, 0, 0, Math.PI / 2));
  }

  // External current source unit
  prims.push(box('Current Source', 'electronics', 'steel',
    bw / 2 + 0.25, -0.05, 0, 0.4, 0.3, 0.2));
  prims.push(box('Source Display', 'electronics', 'lcd_display',
    bw / 2 + 0.25, 0.02, -0.101, 0.15, 0.08, 0.005));
  // Source output terminals
  prims.push(cyl('Source Out +', 'electronics', 'brass',
    bw / 2 + 0.15, 0.08, -0.101, 0.008, 0.015, Math.PI / 2));
  prims.push(cyl('Source Out -', 'electronics', 'brass',
    bw / 2 + 0.35, 0.08, -0.101, 0.008, 0.015, Math.PI / 2));

  // Cable entry gland (right side)
  prims.push(cyl('Cable Gland', 'electrical', 'copper',
    bw / 2 + 0.02, bh / 4, 0, 0.01, 0.04, 0, 0, Math.PI / 2));

  // Ambient thermocouple reference (external, hanging)
  prims.push(cyl('Ambient TC', 'sensors', 'stainless_steel',
    bw / 2 + 0.02, -(bh / 2 - 0.03), bd / 4, 0.008, 0.04));

  // Test module (inside box)
  prims.push(box('Test Module', 'test_specimen', 'glass',
    0, -0.03, 0, bw * 0.7, 0.035, bd * 0.7));

  return {
    id: 'iec_bypass_diode_thermal_fixture',
    name: 'Bypass Diode Thermal Test Fixture',
    standard: 'IEC 61215 MQT 18',
    category: 'electrical_test',
    description: '600×400×300mm insulated box, 4 banana-jack terminals, IR camera on arm, external current source, 4 thermal probe ports, ambient TC.',
    boundingBox: [bw + 0.6, bh + camArm + 0.3, bd + 0.2],
    groups: ['enclosure', 'electrical', 'camera_system', 'sensors', 'electronics', 'test_specimen'],
    primitives: prims,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Registry — all 12 IEC equipment geometry builders
// ═══════════════════════════════════════════════════════════════════════════════

export type IECGeometryBuilderId =
  | 'iec_mechanical_load_fixture'
  | 'iec_salt_mist_chamber'
  | 'iec_uv_conditioning_chamber'
  | 'iec_thermal_cycling_chamber'
  | 'iec_flash_simulator'
  | 'iec_iv_curve_tracer'
  | 'iec_humidity_freeze_chamber'
  | 'iec_hail_impact_rig'
  | 'iec_el_imaging_dark_box'
  | 'iec_hipot_test_bench'
  | 'iec_iv_curve_tracer_station'
  | 'iec_bypass_diode_thermal_fixture';

export const IEC_GEOMETRY_BUILDERS: Record<IECGeometryBuilderId, () => IECEquipmentGeometry> = {
  iec_mechanical_load_fixture: buildMechanicalLoadFixture,
  iec_salt_mist_chamber: buildSaltMistChamber,
  iec_uv_conditioning_chamber: buildUVChamber,
  iec_thermal_cycling_chamber: buildThermalCyclingChamber,
  iec_flash_simulator: buildFlashSimulator,
  iec_iv_curve_tracer: buildIVTracer,
  iec_humidity_freeze_chamber: buildHumidityFreezeChamber,
  iec_hail_impact_rig: buildHailImpactRig,
  iec_el_imaging_dark_box: buildELDarkBox,
  iec_hipot_test_bench: buildHiPotTestBench,
  iec_iv_curve_tracer_station: buildIVTracerStation,
  iec_bypass_diode_thermal_fixture: buildBypassDiodeThermalFixture,
};

/**
 * Build geometry for a given IEC equipment template by its ID.
 * Returns undefined if ID is not recognised.
 */
export function buildIECEquipmentGeometry(templateId: string): IECEquipmentGeometry | undefined {
  const builder = IEC_GEOMETRY_BUILDERS[templateId as IECGeometryBuilderId];
  return builder ? builder() : undefined;
}

/**
 * Get all available IEC equipment geometry IDs.
 */
export function getAllIECGeometryIds(): IECGeometryBuilderId[] {
  return Object.keys(IEC_GEOMETRY_BUILDERS) as IECGeometryBuilderId[];
}
