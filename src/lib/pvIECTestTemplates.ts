// ─── IEC Solar PV Testing Equipment Templates – Part 1 (Templates 1–5) ───────
// Standards: IEC 61215, IEC 61730, IEC 62788
// Templates: Mechanical Load, Hail Impact, UV Chamber, Humidity Freeze, Thermal Cycling

export interface SolidPrimitive {
  type: 'box' | 'cylinder';
  position: { x: number; y: number; z: number };
  dimensions: { w: number; h: number; d: number };
  rotation: { x: number; y: number; z: number };
  material: string;
  label: string;
}

export interface ParametricField {
  id: string;
  label: string;
  defaultValue: number;
  unit: string;
  min: number;
  max: number;
}

export interface IECTestTemplate {
  id: string;
  name: string;
  description: string;
  standard: string;
  category: string;
  parametricFields: ParametricField[];
  generateGeometry: (params?: Record<string, number>) => SolidPrimitive[];
}

// ── 1. Mechanical Load Test Fixture (IEC 61215 MQT 16) ───────────────────────
export const mechanicalLoadFixture: IECTestTemplate = {
  id: 'iec_mechanical_load_fixture',
  name: 'Mechanical Load Test Fixture',
  description: '2400×1300mm SHS steel loading frame with inflatable pressure bag (0–5400 Pa), 8 rubber-tipped support pins, vacuum pump port and pressure transducer mount.',
  standard: 'IEC 61215 MQT 16',
  category: 'mechanical_test',
  parametricFields: [
    { id: 'frameWidth',   label: 'Frame Width',       defaultValue: 2400, unit: 'mm', min: 1500, max: 3000 },
    { id: 'frameDepth',   label: 'Frame Depth',       defaultValue: 1300, unit: 'mm', min: 900,  max: 2000 },
    { id: 'frameHeight',  label: 'Frame Height',      defaultValue: 200,  unit: 'mm', min: 100,  max: 400  },
    { id: 'maxPressure',  label: 'Max Pressure',      defaultValue: 5400, unit: 'Pa', min: 1000, max: 8000 },
    { id: 'moduleLength', label: 'Module Length',     defaultValue: 2000, unit: 'mm', min: 1000, max: 2500 },
    { id: 'moduleWidth',  label: 'Module Width',      defaultValue: 1000, unit: 'mm', min: 700,  max: 1400 },
  ],
  generateGeometry(p: Record<string, number> = {}): SolidPrimitive[] {
    const fw = (p.frameWidth  ?? 2400) / 1000;
    const fd = (p.frameDepth  ?? 1300) / 1000;
    const fh = (p.frameHeight ?? 200)  / 1000;
    const ml = (p.moduleLength ?? 2000) / 1000;
    const mw = (p.moduleWidth  ?? 1000) / 1000;
    const r  = 0.1; // SHS 100mm section
    const pin = { w: 0.05, h: 0.12, d: 0.05 };
    const py  = fh / 2 + 0.06;
    return [
      { type: 'box', position: { x: 0, y: 0, z: -(fd - r) / 2 }, dimensions: { w: fw, h: fh, d: r }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Frame Rail Front' },
      { type: 'box', position: { x: 0, y: 0, z:  (fd - r) / 2 }, dimensions: { w: fw, h: fh, d: r }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Frame Rail Rear'  },
      { type: 'box', position: { x: -(fw - r) / 2, y: 0, z: 0  }, dimensions: { w: r,  h: fh, d: fd }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Frame Rail Left'  },
      { type: 'box', position: { x:  (fw - r) / 2, y: 0, z: 0  }, dimensions: { w: r,  h: fh, d: fd }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Frame Rail Right' },
      { type: 'box', position: { x: 0, y: fh / 2 + 0.025, z: 0 }, dimensions: { w: ml, h: 0.05, d: mw }, rotation: { x:0,y:0,z:0 }, material: 'rubber', label: 'Inflatable Pressure Bag' },
      { type: 'box', position: { x: 0, y: fh / 2 + 0.105, z: 0 }, dimensions: { w: ml, h: 0.035, d: mw }, rotation: { x:0,y:0,z:0 }, material: 'glass', label: 'Test Module' },
      { type: 'cylinder', position: { x: -(ml/2 - 0.05), y: py, z: -(mw/2 - 0.05) }, dimensions: pin, rotation: { x:0,y:0,z:0 }, material: 'rubber', label: 'Pin Corner NW' },
      { type: 'cylinder', position: { x:  (ml/2 - 0.05), y: py, z: -(mw/2 - 0.05) }, dimensions: pin, rotation: { x:0,y:0,z:0 }, material: 'rubber', label: 'Pin Corner NE' },
      { type: 'cylinder', position: { x: -(ml/2 - 0.05), y: py, z:  (mw/2 - 0.05) }, dimensions: pin, rotation: { x:0,y:0,z:0 }, material: 'rubber', label: 'Pin Corner SW' },
      { type: 'cylinder', position: { x:  (ml/2 - 0.05), y: py, z:  (mw/2 - 0.05) }, dimensions: pin, rotation: { x:0,y:0,z:0 }, material: 'rubber', label: 'Pin Corner SE' },
      { type: 'cylinder', position: { x: 0,            y: py, z: -(mw/2 - 0.05) }, dimensions: pin, rotation: { x:0,y:0,z:0 }, material: 'rubber', label: 'Pin Edge N'  },
      { type: 'cylinder', position: { x: 0,            y: py, z:  (mw/2 - 0.05) }, dimensions: pin, rotation: { x:0,y:0,z:0 }, material: 'rubber', label: 'Pin Edge S'  },
      { type: 'cylinder', position: { x: -(ml/2-0.05), y: py, z: 0              }, dimensions: pin, rotation: { x:0,y:0,z:0 }, material: 'rubber', label: 'Pin Edge W'  },
      { type: 'cylinder', position: { x:  (ml/2-0.05), y: py, z: 0              }, dimensions: pin, rotation: { x:0,y:0,z:0 }, material: 'rubber', label: 'Pin Edge E'  },
      { type: 'box', position: { x: fw/2 - 0.1, y: fh/2 + 0.04, z: 0 }, dimensions: { w: 0.08, h: 0.08, d: 0.08 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Pressure Transducer' },
      { type: 'cylinder', position: { x: -(fw/2 - 0.1), y: 0, z: 0 }, dimensions: { w: 0.05, h: fh, d: 0.05 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Vacuum Pump Port' },
    ];
  },
};

// ── 2. Module Breakage / Hail Impact Test Rig (IEC 61215 MQT 8) ──────────────
export const hailImpactRig: IECTestTemplate = {
  id: 'iec_hail_impact_rig',
  name: 'Hail Impact Test Rig',
  description: '3000mm steel drop tower with 100mm guide tube, 227 g or 535 g steel ball, adjustable-tilt module table (0–45°), 9-point impact grid and 600×600×3000mm safety cage.',
  standard: 'IEC 61215 MQT 8 / EN 61215',
  category: 'mechanical_test',
  parametricFields: [
    { id: 'towerHeight',  label: 'Drop Tower Height', defaultValue: 3000, unit: 'mm', min: 1500, max: 5000 },
    { id: 'tableTilt',   label: 'Table Tilt Angle',  defaultValue: 0,    unit: 'deg', min: 0,   max: 45   },
    { id: 'ballMass',    label: 'Ball Mass',          defaultValue: 227,  unit: 'g',  min: 100,  max: 600  },
    { id: 'cageSize',    label: 'Cage Width/Depth',   defaultValue: 600,  unit: 'mm', min: 400,  max: 1200 },
    { id: 'tableLength', label: 'Table Length',       defaultValue: 2100, unit: 'mm', min: 1200, max: 2500 },
    { id: 'tableWidth',  label: 'Table Width',        defaultValue: 1100, unit: 'mm', min: 800,  max: 1600 },
  ],
  generateGeometry(p: Record<string, number> = {}): SolidPrimitive[] {
    const th = (p.towerHeight ?? 3000) / 1000;
    const cs = (p.cageSize   ?? 600)  / 1000;
    const tl = (p.tableLength ?? 2100) / 1000;
    const tw = (p.tableWidth  ?? 1100) / 1000;
    const tiltDeg = p.tableTilt ?? 0;
    const tiltRad = (tiltDeg * Math.PI) / 180;
    return [
      { type: 'box', position: { x: -(cs/2 - 0.01), y: th/2, z: 0 }, dimensions: { w: 0.02, h: th, d: 0.02 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Guide Rail Left'  },
      { type: 'box', position: { x:  (cs/2 - 0.01), y: th/2, z: 0 }, dimensions: { w: 0.02, h: th, d: 0.02 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Guide Rail Right' },
      { type: 'cylinder', position: { x: 0, y: th/2, z: 0 }, dimensions: { w: 0.1, h: th, d: 0.1 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Ball Drop Guide Tube' },
      { type: 'cylinder', position: { x: 0, y: th + 0.02, z: 0 }, dimensions: { w: 0.025, h: 0.025, d: 0.025 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Steel Ball' },
      { type: 'box', position: { x: 0, y: 0.45, z: cs/2 + tl/2 }, dimensions: { w: tl, h: 0.05, d: tw }, rotation: { x: tiltRad,y:0,z:0 }, material: 'steel', label: 'Module Fixture Table' },
      { type: 'box', position: { x: -(cs/2), y: th/2, z: -(cs/2) }, dimensions: { w: 0.01, h: th, d: 0.01 }, rotation: { x:0,y:0,z:0 }, material: 'steel_mesh', label: 'Safety Cage Post NW' },
      { type: 'box', position: { x:  (cs/2), y: th/2, z: -(cs/2) }, dimensions: { w: 0.01, h: th, d: 0.01 }, rotation: { x:0,y:0,z:0 }, material: 'steel_mesh', label: 'Safety Cage Post NE' },
      { type: 'box', position: { x: -(cs/2), y: th/2, z:  (cs/2) }, dimensions: { w: 0.01, h: th, d: 0.01 }, rotation: { x:0,y:0,z:0 }, material: 'steel_mesh', label: 'Safety Cage Post SW' },
      { type: 'box', position: { x:  (cs/2), y: th/2, z:  (cs/2) }, dimensions: { w: 0.01, h: th, d: 0.01 }, rotation: { x:0,y:0,z:0 }, material: 'steel_mesh', label: 'Safety Cage Post SE' },
      { type: 'box', position: { x: 0, y: th/2, z: -(cs/2) }, dimensions: { w: cs, h: th, d: 0.005 }, rotation: { x:0,y:0,z:0 }, material: 'steel_mesh', label: 'Safety Cage Panel Front' },
      { type: 'box', position: { x: 0, y: th/2, z:  (cs/2) }, dimensions: { w: cs, h: th, d: 0.005 }, rotation: { x:0,y:0,z:0 }, material: 'steel_mesh', label: 'Safety Cage Panel Rear' },
    ];
  },
};

// ── 3. UV Conditioning Chamber (IEC 61215 MQT 10 / IEC 62788-7-2) ────────────
export const uvConditioningChamber: IECTestTemplate = {
  id: 'iec_uv_conditioning_chamber',
  name: 'UV Conditioning Chamber',
  description: '1200×800×900mm insulated steel cabinet with 8× UVA-340 fluorescent lamps, 45° tilted module shelf, front/rear ventilation louvers, and UV irradiance sensor. Operating at 60±5°C.',
  standard: 'IEC 61215 MQT 10 / IEC 62788-7-2',
  category: 'environmental_chamber',
  parametricFields: [
    { id: 'cabinetWidth',  label: 'Cabinet Width',   defaultValue: 1200, unit: 'mm', min: 800,  max: 2000 },
    { id: 'cabinetDepth',  label: 'Cabinet Depth',   defaultValue: 800,  unit: 'mm', min: 600,  max: 1500 },
    { id: 'cabinetHeight', label: 'Cabinet Height',  defaultValue: 900,  unit: 'mm', min: 600,  max: 1500 },
    { id: 'lampCount',     label: 'UVA-340 Lamps',   defaultValue: 8,    unit: '',   min: 4,    max: 16   },
    { id: 'shelfTilt',     label: 'Shelf Tilt Angle',defaultValue: 45,   unit: 'deg',min: 0,    max: 75   },
    { id: 'tempSetpoint',  label: 'Temperature',     defaultValue: 60,   unit: '°C', min: 40,   max: 80   },
  ],
  generateGeometry(p: Record<string, number> = {}): SolidPrimitive[] {
    const cw = (p.cabinetWidth  ?? 1200) / 1000;
    const cd = (p.cabinetDepth  ?? 800)  / 1000;
    const ch = (p.cabinetHeight ?? 900)  / 1000;
    const lc = Math.round(p.lampCount ?? 8);
    const tilt = ((p.shelfTilt ?? 45) * Math.PI) / 180;
    const wall = 0.04;
    const lamps: SolidPrimitive[] = Array.from({ length: lc }, (_, i) => ({
      type: 'cylinder' as const,
      position: { x: -cw / 2 + wall + (i + 0.5) * ((cw - 2 * wall) / lc), y: ch / 2 - wall - 0.02, z: 0 },
      dimensions: { w: 0.032, h: 0.032, d: cd - 2 * wall },
      rotation: { x: Math.PI / 2, y: 0, z: 0 },
      material: 'uva_lamp',
      label: `UVA-340 Lamp ${i + 1}`,
    }));
    return [
      { type: 'box', position: { x:0,y:0,z:0 }, dimensions: { w: cw, h: ch, d: cd }, rotation: { x:0,y:0,z:0 }, material: 'insulated_steel', label: 'Chamber Cabinet' },
      { type: 'box', position: { x:0,y:-ch/2+wall+0.01,z:0 }, dimensions: { w:cw-2*wall,h:0.02,d:cd-2*wall }, rotation: { x:0,y:0,z:0 }, material: 'aluminum', label: 'Chamber Interior Floor' },
      { type: 'box', position: { x:0,y:-0.1,z:0 }, dimensions: { w: cw-2*wall-0.05, h: 0.015, d: (cd-2*wall)*0.85 }, rotation: { x: tilt,y:0,z:0 }, material: 'aluminum_perforated', label: 'Module Shelf 45°' },
      { type: 'box', position: { x:0,y:0,z:-(cd/2+0.01) }, dimensions: { w:0.2, h:0.05, d:0.01 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Ventilation Louver Front' },
      { type: 'box', position: { x:0,y:0,z: (cd/2+0.01) }, dimensions: { w:0.2, h:0.05, d:0.01 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Ventilation Louver Rear'  },
      { type: 'box', position: { x:cw/2-wall-0.02,y:0.1,z:0 }, dimensions: { w:0.08,h:0.06,d:0.06 }, rotation: { x:0,y:0,z:0 }, material: 'sensor', label: 'UV Irradiance Sensor' },
      { type: 'box', position: { x:0,y:-(ch/2+0.1),z:0 }, dimensions: { w:0.3,h:0.2,d:0.2 }, rotation: { x:0,y:0,z:0 }, material: 'plastic', label: 'Control Panel' },
      ...lamps,
    ];
  },
};

// ── 4. Humidity Freeze Cycling Chamber (IEC 61215 MQT 12) ────────────────────
export const humidityFreezeChamber: IECTestTemplate = {
  id: 'iec_humidity_freeze_chamber',
  name: 'Humidity Freeze Cycling Chamber',
  description: 'Walk-in 2000×1500×2200mm double-wall (100mm PU foam) chamber. 5-shelf internal rack for 10 modules. Roof-mounted compressor, 4 ceiling humidity nozzles, 6 thermocouple ports. −40°C to +85°C, 10–98% RH.',
  standard: 'IEC 61215 MQT 12',
  category: 'environmental_chamber',
  parametricFields: [
    { id: 'chamberWidth',  label: 'Chamber Width',   defaultValue: 2000, unit: 'mm', min: 1200, max: 3000 },
    { id: 'chamberDepth',  label: 'Chamber Depth',   defaultValue: 1500, unit: 'mm', min: 1000, max: 2500 },
    { id: 'chamberHeight', label: 'Chamber Height',  defaultValue: 2200, unit: 'mm', min: 1500, max: 3000 },
    { id: 'insulThick',    label: 'Insulation',      defaultValue: 100,  unit: 'mm', min: 50,   max: 200  },
    { id: 'shelfCount',    label: 'Shelf Count',     defaultValue: 5,    unit: '',   min: 2,    max: 10   },
    { id: 'minTemp',       label: 'Min Temperature', defaultValue: -40,  unit: '°C', min: -60,  max: 0    },
  ],
  generateGeometry(p: Record<string, number> = {}): SolidPrimitive[] {
    const cw  = (p.chamberWidth  ?? 2000) / 1000;
    const cd  = (p.chamberDepth  ?? 1500) / 1000;
    const ch  = (p.chamberHeight ?? 2200) / 1000;
    const ins = (p.insulThick    ?? 100)  / 1000;
    const sc  = Math.round(p.shelfCount ?? 5);
    const shelves: SolidPrimitive[] = Array.from({ length: sc }, (_, i) => ({
      type: 'box' as const,
      position: { x: 0, y: -ch/2 + ins + (i + 1) * ((ch - 2*ins) / (sc + 1)), z: 0 },
      dimensions: { w: cw - 2*ins - 0.05, h: 0.025, d: cd - 2*ins - 0.05 },
      rotation: { x:0,y:0,z:0 },
      material: 'aluminum',
      label: `Internal Shelf ${i + 1}`,
    }));
    const nozzles: SolidPrimitive[] = [-1, 1].flatMap(x => [-1, 1].map(z => ({
      type: 'cylinder' as const,
      position: { x: x * (cw/4), y: ch/2 - ins - 0.05, z: z * (cd/4) },
      dimensions: { w: 0.025, h: 0.08, d: 0.025 },
      rotation: { x:0,y:0,z:0 },
      material: 'steel',
      label: 'Humidity Nozzle',
    })));
    return [
      { type: 'box', position: { x:0,y:0,z:0 }, dimensions: { w:cw,h:ch,d:cd }, rotation: { x:0,y:0,z:0 }, material: 'insulated_steel', label: 'Chamber Outer Shell' },
      { type: 'box', position: { x:0,y:0,z:0 }, dimensions: { w:cw-2*ins,h:ch-2*ins,d:cd-2*ins }, rotation: { x:0,y:0,z:0 }, material: 'stainless_steel', label: 'Chamber Interior' },
      { type: 'box', position: { x:0,y:0,z:-(cd/2+0.001) }, dimensions: { w:0.8,h:2.0,d:0.2 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Access Door' },
      { type: 'box', position: { x:0,y:0.3,z:-(cd/2+0.002) }, dimensions: { w:0.3,h:0.3,d:0.05 }, rotation: { x:0,y:0,z:0 }, material: 'glass', label: 'Door Viewport 300×300mm' },
      { type: 'box', position: { x:0,y:ch/2+0.4,z:0 }, dimensions: { w:0.6,h:0.8,d:0.4 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Roof Compressor Unit' },
      { type: 'box', position: { x:cw/2-ins-0.02,y:0,z:0 }, dimensions: { w:0.04,h:ch-2*ins,d:0.01 }, rotation: { x:0,y:0,z:0 }, material: 'copper', label: 'Thermocouple Port Panel' },
      ...shelves,
      ...nozzles,
    ];
  },
};

// ── 5. Thermal Cycling / Damp Heat Chamber (IEC 61215 MQT 11) ────────────────
export const thermalCyclingChamber: IECTestTemplate = {
  id: 'iec_thermal_cycling_chamber',
  name: 'Thermal Cycling / Damp Heat Chamber',
  description: '1600×1200×1800mm cabinet with 4 module hanging rails, 400mm circulation fan, 4×2kW strip heaters, 400×400mm double-glazed window and safety blow-off valve.',
  standard: 'IEC 61215 MQT 11',
  category: 'environmental_chamber',
  parametricFields: [
    { id: 'cabWidth',    label: 'Cabinet Width',   defaultValue: 1600, unit: 'mm', min: 1000, max: 2400 },
    { id: 'cabDepth',    label: 'Cabinet Depth',   defaultValue: 1200, unit: 'mm', min: 800,  max: 2000 },
    { id: 'cabHeight',   label: 'Cabinet Height',  defaultValue: 1800, unit: 'mm', min: 1200, max: 2800 },
    { id: 'railCount',   label: 'Hanging Rails',   defaultValue: 4,    unit: '',   min: 2,    max: 8    },
    { id: 'heaterPower', label: 'Heater Power',    defaultValue: 2000, unit: 'W',  min: 500,  max: 5000 },
    { id: 'fanDia',      label: 'Fan Diameter',    defaultValue: 400,  unit: 'mm', min: 200,  max: 600  },
  ],
  generateGeometry(p: Record<string, number> = {}): SolidPrimitive[] {
    const cw = (p.cabWidth  ?? 1600) / 1000;
    const cd = (p.cabDepth  ?? 1200) / 1000;
    const ch = (p.cabHeight ?? 1800) / 1000;
    const rc = Math.round(p.railCount ?? 4);
    const fd = (p.fanDia    ?? 400)  / 1000;
    const ins = 0.075;
    const rails: SolidPrimitive[] = Array.from({ length: rc }, (_, i) => ({
      type: 'cylinder' as const,
      position: { x: 0, y: ch/2 - ins - (i + 1) * 0.3, z: 0 },
      dimensions: { w: 0.025, h: 0.025, d: cd - 2*ins },
      rotation: { x: Math.PI / 2, y: 0, z: 0 },
      material: 'steel',
      label: `Hanging Rail ${i + 1}`,
    }));
    return [
      { type: 'box', position: { x:0,y:0,z:0 }, dimensions: { w:cw,h:ch,d:cd }, rotation: { x:0,y:0,z:0 }, material: 'insulated_steel', label: 'Chamber Cabinet' },
      { type: 'cylinder', position: { x:0,y:0,z:cd/2-ins-0.05 }, dimensions: { w:fd,h:0.1,d:fd }, rotation: { x:Math.PI/2,y:0,z:0 }, material: 'steel', label: '400mm Circulation Fan' },
      { type: 'box', position: { x:-cw*0.3,y:-ch/2+ins+0.03,z:0 }, dimensions: { w:cw*0.35,h:0.06,d:cd-2*ins-0.05 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Heater Bank (4×2kW)' },
      { type: 'box', position: { x:0,y:0.1,z:-(cd/2+0.001) }, dimensions: { w:0.4,h:0.4,d:0.04 }, rotation: { x:0,y:0,z:0 }, material: 'glass', label: 'Viewing Window 400×400mm' },
      { type: 'cylinder', position: { x:0,y:ch/2+0.05,z:0 }, dimensions: { w:0.08,h:0.1,d:0.08 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Safety Blow-off Valve' },
      { type: 'box', position: { x:0,y:-(ch/2+0.15),z:0 }, dimensions: { w:0.3,h:0.25,d:0.2 }, rotation: { x:0,y:0,z:0 }, material: 'plastic', label: 'Control Panel' },
      ...rails,
    ];
  },
};

export const PV_IEC_TEMPLATES_PART1: IECTestTemplate[] = [
  mechanicalLoadFixture,
  hailImpactRig,
  uvConditioningChamber,
  humidityFreezeChamber,
  thermalCyclingChamber,
];
