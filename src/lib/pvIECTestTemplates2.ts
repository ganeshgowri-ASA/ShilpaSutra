// ─── IEC Solar PV Testing Equipment Templates – Part 2 (Templates 6–10) ──────
// Standards: IEC 61701, IEC TS 60904-13, IEC 61730 MST 16, IEC 61215 MQT 18

import type { SolidPrimitive, ParametricField, IECTestTemplate } from './pvIECTestTemplates';

// ── 6. Salt Mist / Corrosion Test Chamber (IEC 61701) ────────────────────────
export const saltMistChamber: IECTestTemplate = {
  id: 'iec_salt_mist_chamber',
  name: 'Salt Mist / Corrosion Test Chamber',
  description: '900×600×600mm acrylic-walled chamber with central salt spray tower nozzle, 20° tilt module rack, 200mm drainage sump with drain valve, 25mm BSP air inlet, and hinged observation lid.',
  standard: 'IEC 61701',
  category: 'environmental_chamber',
  parametricFields: [
    { id: 'chamberWidth',  label: 'Chamber Width',   defaultValue: 900,  unit: 'mm', min: 500,  max: 2000 },
    { id: 'chamberDepth',  label: 'Chamber Depth',   defaultValue: 600,  unit: 'mm', min: 400,  max: 1500 },
    { id: 'chamberHeight', label: 'Chamber Height',  defaultValue: 600,  unit: 'mm', min: 400,  max: 1200 },
    { id: 'nozzleHeight',  label: 'Spray Nozzle Ht', defaultValue: 400,  unit: 'mm', min: 100,  max: 800  },
    { id: 'rackTilt',      label: 'Rack Tilt Angle', defaultValue: 20,   unit: 'deg',min: 15,   max: 45   },
    { id: 'sumpDepth',     label: 'Sump Depth',      defaultValue: 200,  unit: 'mm', min: 100,  max: 400  },
  ],
  generateGeometry(p: Record<string, number> = {}): SolidPrimitive[] {
    const cw  = (p.chamberWidth  ?? 900)  / 1000;
    const cd  = (p.chamberDepth  ?? 600)  / 1000;
    const ch  = (p.chamberHeight ?? 600)  / 1000;
    const nh  = (p.nozzleHeight  ?? 400)  / 1000;
    const sd  = (p.sumpDepth     ?? 200)  / 1000;
    const tilt = ((p.rackTilt    ?? 20)   * Math.PI) / 180;
    const wall = 0.008; // 8mm acrylic
    return [
      { type: 'box', position: { x:0,y:0,z:-(cd/2) }, dimensions: { w:cw,h:ch+sd,d:wall }, rotation: { x:0,y:0,z:0 }, material: 'acrylic', label: 'Chamber Front Wall'  },
      { type: 'box', position: { x:0,y:0,z: (cd/2) }, dimensions: { w:cw,h:ch+sd,d:wall }, rotation: { x:0,y:0,z:0 }, material: 'acrylic', label: 'Chamber Rear Wall'   },
      { type: 'box', position: { x:-(cw/2),y:0,z:0  }, dimensions: { w:wall,h:ch+sd,d:cd }, rotation: { x:0,y:0,z:0 }, material: 'acrylic', label: 'Chamber Left Wall'  },
      { type: 'box', position: { x: (cw/2),y:0,z:0  }, dimensions: { w:wall,h:ch+sd,d:cd }, rotation: { x:0,y:0,z:0 }, material: 'acrylic', label: 'Chamber Right Wall' },
      { type: 'box', position: { x:0,y:-(ch/2),z:0  }, dimensions: { w:cw,h:sd,d:cd }, rotation: { x:0,y:0,z:0 }, material: 'pvc', label: 'Drainage Sump' },
      { type: 'cylinder', position: { x:-(cw/4),y:-(ch/2)-sd+0.02,z:0 }, dimensions: { w:0.02,h:0.06,d:0.02 }, rotation: { x:0,y:0,z:0 }, material: 'pvc', label: 'Sump Drain Valve' },
      { type: 'cylinder', position: { x:0,y:-(ch/2)+nh,z:0 }, dimensions: { w:0.015,h:nh,d:0.015 }, rotation: { x:0,y:0,z:0 }, material: 'pvc', label: 'Salt Spray Tower' },
      { type: 'cylinder', position: { x:0,y:-(ch/2)+nh+0.01,z:0 }, dimensions: { w:0.04,h:0.04,d:0.04 }, rotation: { x:0,y:0,z:0 }, material: 'pvc', label: 'Salt Spray Nozzle' },
      { type: 'box', position: { x:cw/4,y:-0.05,z:0 }, dimensions: { w:0.7,h:0.008,d:0.5 }, rotation: { x:tilt,y:0,z:0 }, material: 'pvc', label: 'Module Tilt Rack 20°' },
      { type: 'box', position: { x:0,y:(ch/2+0.005),z:0 }, dimensions: { w:cw,h:0.01,d:cd }, rotation: { x:0,y:0,z:0 }, material: 'acrylic', label: 'Hinged Observation Lid' },
      { type: 'box', position: { x:0,y:(ch/2+0.005),z:-(cd/4) }, dimensions: { w:0.05,h:0.05,d:0.05 }, rotation: { x:0,y:0,z:0 }, material: 'acrylic', label: 'Lid Observation Port 50×50mm' },
      { type: 'cylinder', position: { x:-(cw/2),y:0.05,z:0 }, dimensions: { w:0.025,h:0.05,d:0.025 }, rotation: { x:0,y:Math.PI/2,z:0 }, material: 'brass', label: 'Air Supply BSP Port' },
    ];
  },
};

// ── 7. EL Imaging Dark Box (IEC TS 60904-13) ─────────────────────────────────
export const elImagingDarkBox: IECTestTemplate = {
  id: 'iec_el_imaging_dark_box',
  name: 'EL Imaging Dark Box',
  description: '2500×1500×500mm light-tight enclosure with overhead camera rail system (adjustable 200–400mm height), DC injection contact block (0–15A), corner module clips, and light-trap ventilation baffles.',
  standard: 'IEC TS 60904-13',
  category: 'electrical_test',
  parametricFields: [
    { id: 'boxLength',    label: 'Box Length',       defaultValue: 2500, unit: 'mm', min: 1500, max: 3500 },
    { id: 'boxWidth',     label: 'Box Width',        defaultValue: 1500, unit: 'mm', min: 1000, max: 2500 },
    { id: 'boxHeight',    label: 'Box Height',       defaultValue: 500,  unit: 'mm', min: 300,  max: 800  },
    { id: 'cameraHeight', label: 'Camera Height',    defaultValue: 300,  unit: 'mm', min: 200,  max: 400  },
    { id: 'injectCurrent',label: 'Inject Current',   defaultValue: 10,   unit: 'A',  min: 1,    max: 15   },
    { id: 'moduleThick',  label: 'Module Thickness', defaultValue: 35,   unit: 'mm', min: 20,   max: 50   },
  ],
  generateGeometry(p: Record<string, number> = {}): SolidPrimitive[] {
    const bl = (p.boxLength    ?? 2500) / 1000;
    const bw = (p.boxWidth     ?? 1500) / 1000;
    const bh = (p.boxHeight    ?? 500)  / 1000;
    const ch = (p.cameraHeight ?? 300)  / 1000;
    const mt = (p.moduleThick  ?? 35)   / 1000;
    const wall = 0.003;
    const camY = -bh/2 + mt + ch;
    return [
      { type: 'box', position: { x:0,y:0,z:0 }, dimensions: { w:bl,h:bh,d:bw }, rotation: { x:0,y:0,z:0 }, material: 'steel_blackout', label: 'Blackout Enclosure' },
      { type: 'box', position: { x:0,y:-bh/2+mt/2,z:0 }, dimensions: { w:bl-2*wall,h:mt,d:bw-2*wall }, rotation: { x:0,y:0,z:0 }, material: 'glass', label: 'Test Module (DUT)' },
      { type: 'box', position: { x: -(bl/2-wall-0.03), y:-bh/2+mt+0.005,z: -(bw/2-wall-0.03) }, dimensions: { w:0.06,h:0.01,d:0.06 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Module Clip NW' },
      { type: 'box', position: { x:  (bl/2-wall-0.03), y:-bh/2+mt+0.005,z: -(bw/2-wall-0.03) }, dimensions: { w:0.06,h:0.01,d:0.06 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Module Clip NE' },
      { type: 'box', position: { x: -(bl/2-wall-0.03), y:-bh/2+mt+0.005,z:  (bw/2-wall-0.03) }, dimensions: { w:0.06,h:0.01,d:0.06 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Module Clip SW' },
      { type: 'box', position: { x:  (bl/2-wall-0.03), y:-bh/2+mt+0.005,z:  (bw/2-wall-0.03) }, dimensions: { w:0.06,h:0.01,d:0.06 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Module Clip SE' },
      { type: 'box', position: { x:-(bl/2-0.05), y:camY,z:0 }, dimensions: { w:0.01,h:0.005,d:bw-0.1 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Camera Rail Left'  },
      { type: 'box', position: { x: (bl/2-0.05), y:camY,z:0 }, dimensions: { w:0.01,h:0.005,d:bw-0.1 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Camera Rail Right' },
      { type: 'box', position: { x:0,y:camY+0.075,z:0 }, dimensions: { w:0.3,h:0.2,d:0.15 }, rotation: { x:0,y:0,z:0 }, material: 'camera_body', label: 'EL Camera Body' },
      { type: 'cylinder', position: { x:0,y:camY+0.025,z:0 }, dimensions: { w:0.06,h:0.05,d:0.06 }, rotation: { x:Math.PI/2,y:0,z:0 }, material: 'glass', label: 'Camera Lens 50mm' },
      { type: 'box', position: { x:bl/2-wall-0.06,y:-bh/2+0.05,z:0 }, dimensions: { w:0.1,h:0.06,d:0.08 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'DC Injection Contact Block' },
      { type: 'box', position: { x:0,y:-bh/2+0.01,z:-(bw/2) }, dimensions: { w:0.15,h:0.04,d:wall }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Light-Trap Ventilation Baffle' },
    ];
  },
};

// ── 8. Insulation Resistance / Dielectric Withstand Test Bench (IEC 61730 MST 16) ──
export const hipotTestBench: IECTestTemplate = {
  id: 'iec_hipot_test_bench',
  name: 'Insulation / Dielectric Withstand Test Bench',
  description: '1800×900×900mm steel table with rubber mat, HV isolation transformer (500×400×600mm), DC hipot tester (0–10kV), 1200mm copper ground bus, adjustable module clamp (1000–2200mm), safety interlocks and warning beacon.',
  standard: 'IEC 61730 MST 16',
  category: 'electrical_test',
  parametricFields: [
    { id: 'benchLength', label: 'Bench Length',     defaultValue: 1800, unit: 'mm', min: 1200, max: 2400 },
    { id: 'benchWidth',  label: 'Bench Width',      defaultValue: 900,  unit: 'mm', min: 600,  max: 1500 },
    { id: 'benchHeight', label: 'Bench Height',     defaultValue: 900,  unit: 'mm', min: 700,  max: 1200 },
    { id: 'maxVoltage',  label: 'Max HV Output',    defaultValue: 10000,unit: 'V',  min: 1000, max: 20000 },
    { id: 'clampMin',    label: 'Clamp Min Width',  defaultValue: 1000, unit: 'mm', min: 500,  max: 1500 },
    { id: 'clampMax',    label: 'Clamp Max Width',  defaultValue: 2200, unit: 'mm', min: 1500, max: 3000 },
  ],
  generateGeometry(p: Record<string, number> = {}): SolidPrimitive[] {
    const bl = (p.benchLength ?? 1800) / 1000;
    const bw = (p.benchWidth  ?? 900)  / 1000;
    const bh = (p.benchHeight ?? 900)  / 1000;
    return [
      { type: 'box', position: { x:0,y:0,z:0 }, dimensions: { w:bl,h:0.05,d:bw }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Bench Worktop' },
      { type: 'box', position: { x:0,y:-bh/2,z:0 }, dimensions: { w:bl,h:bh,d:bw }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Bench Frame' },
      { type: 'box', position: { x:0,y:0.01,z:0 }, dimensions: { w:bl-0.05,h:0.008,d:bw-0.05 }, rotation: { x:0,y:0,z:0 }, material: 'rubber', label: 'Anti-Static Rubber Mat' },
      { type: 'box', position: { x:-(bl/2-0.25),y:0.35,z:0 }, dimensions: { w:0.5,h:0.6,d:0.4 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'HV Isolation Transformer' },
      { type: 'box', position: { x:(bl/2-0.2),y:0.1,z:0 }, dimensions: { w:0.4,h:0.2,d:0.3 }, rotation: { x:0,y:0,z:0 }, material: 'plastic', label: 'DC Hipot Tester 0–10kV' },
      { type: 'box', position: { x:0,y:0.005,z:-(bw/2-0.03) }, dimensions: { w:1.2,h:0.01,d:0.05 }, rotation: { x:0,y:0,z:0 }, material: 'copper', label: 'Ground Bus Bar 1200mm' },
      { type: 'box', position: { x:-(bl/2-0.1),y:0.06,z:0 }, dimensions: { w:0.04,h:0.02,d:0.04 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Module Clamp Left'  },
      { type: 'box', position: { x: (bl/2-0.1),y:0.06,z:0 }, dimensions: { w:0.04,h:0.02,d:0.04 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Module Clamp Right' },
      { type: 'box', position: { x:-(bl/2-0.05),y:0.15,z:-(bw/2-0.05) }, dimensions: { w:0.03,h:0.03,d:0.03 }, rotation: { x:0,y:0,z:0 }, material: 'plastic', label: 'Safety Interlock Switch L' },
      { type: 'box', position: { x: (bl/2-0.05),y:0.15,z:-(bw/2-0.05) }, dimensions: { w:0.03,h:0.03,d:0.03 }, rotation: { x:0,y:0,z:0 }, material: 'plastic', label: 'Safety Interlock Switch R' },
      { type: 'cylinder', position: { x:0,y:bh/2+0.25,z:0 }, dimensions: { w:0.2,h:0.2,d:0.2 }, rotation: { x:0,y:0,z:0 }, material: 'plastic_amber', label: 'HV Warning Beacon 200mm' },
    ];
  },
};

// ── 9. IV Curve Tracer Station (IEC 60904-1) ─────────────────────────────────
export const ivCurveTracerStation: IECTestTemplate = {
  id: 'iec_iv_curve_tracer_station',
  name: 'IV Curve Tracer Station',
  description: '2000×1000×900mm optical bench with 1200×1200mm xenon flash solar simulator (4 lamps), reference cell, DUT module clamp (2100×1100mm), rack-mounted tracer unit, temperature controller and cable management tray.',
  standard: 'IEC 60904-1 / IEC 60904-9',
  category: 'electrical_test',
  parametricFields: [
    { id: 'benchLength',  label: 'Bench Length',     defaultValue: 2000, unit: 'mm', min: 1500, max: 3000 },
    { id: 'benchWidth',   label: 'Bench Width',      defaultValue: 1000, unit: 'mm', min: 800,  max: 1500 },
    { id: 'simSize',      label: 'Simulator Size',   defaultValue: 1200, unit: 'mm', min: 800,  max: 2000 },
    { id: 'lampCount',    label: 'Xenon Lamps',      defaultValue: 4,    unit: '',   min: 1,    max: 8    },
    { id: 'dutLength',    label: 'DUT Module Length',defaultValue: 2100, unit: 'mm', min: 1000, max: 2500 },
    { id: 'dutWidth',     label: 'DUT Module Width', defaultValue: 1100, unit: 'mm', min: 700,  max: 1400 },
  ],
  generateGeometry(p: Record<string, number> = {}): SolidPrimitive[] {
    const bl  = (p.benchLength ?? 2000) / 1000;
    const bw  = (p.benchWidth  ?? 1000) / 1000;
    const bh  = 0.9;
    const ss  = (p.simSize     ?? 1200) / 1000;
    const lc  = Math.round(p.lampCount ?? 4);
    const dl  = (p.dutLength   ?? 2100) / 1000;
    const dw  = (p.dutWidth    ?? 1100) / 1000;
    const simH = bh / 2 + 1.2;
    const lamps: SolidPrimitive[] = Array.from({ length: lc }, (_, i) => {
      const row = Math.floor(i / 2), col = i % 2;
      return {
        type: 'cylinder' as const,
        position: { x: -ss/2 + 0.3 + col * (ss - 0.6), y: simH + 0.05, z: -ss/2 + 0.3 + row * (ss - 0.6) },
        dimensions: { w: 0.08, h: 0.12, d: 0.08 },
        rotation: { x: 0, y: 0, z: 0 },
        material: 'xenon_lamp',
        label: `Xenon Flash Lamp ${i + 1}`,
      };
    });
    return [
      { type: 'box', position: { x:0,y:0,z:0 }, dimensions: { w:bl,h:0.05,d:bw }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Optical Bench Worktop' },
      { type: 'box', position: { x:0,y:-bh/2,z:0 }, dimensions: { w:bl,h:bh,d:bw }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Bench Frame' },
      { type: 'box', position: { x:0,y:simH,z:0 }, dimensions: { w:ss,h:0.04,d:ss }, rotation: { x:0,y:0,z:0 }, material: 'steel_reflector', label: 'Solar Simulator Array 1200×1200mm' },
      { type: 'box', position: { x:0,y:bh/2+0.018,z:0 }, dimensions: { w:dl,h:0.035,d:dw }, rotation: { x:0,y:0,z:0 }, material: 'glass', label: 'DUT Module Under Test' },
      { type: 'box', position: { x:0.08,y:bh/2+0.01,z:0 }, dimensions: { w:0.1,h:0.1,d:0.1 }, rotation: { x:0,y:0,z:0 }, material: 'silicon', label: 'Reference Cell 100×100mm' },
      { type: 'box', position: { x:bl/2+0.35,y:0.1,z:0 }, dimensions: { w:0.6,h:0.4,d:0.3 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'IV Tracer Rack Unit' },
      { type: 'box', position: { x:bl/2+0.35,y:-0.15,z:0 }, dimensions: { w:0.2,h:0.15,d:0.1 }, rotation: { x:0,y:0,z:0 }, material: 'plastic', label: 'Temperature Controller' },
      { type: 'box', position: { x:0,y:bh/2+0.025,z:bw/2+0.05 }, dimensions: { w:bl,h:0.05,d:0.1 }, rotation: { x:0,y:0,z:0 }, material: 'plastic', label: 'Cable Management Tray' },
      ...lamps,
    ];
  },
};

// ── 10. Bypass Diode Thermal Test Fixture (IEC 61215 MQT 18) ─────────────────
export const bypassDiodeThermalFixture: IECTestTemplate = {
  id: 'iec_bypass_diode_thermal_fixture',
  name: 'Bypass Diode Thermal Test Fixture',
  description: '600×400×300mm insulated test box with 4 banana-jack terminals, overhead IR camera on adjustable arm (±150mm), external current source unit, 4 thermal probe ports on side wall, and external ambient thermocouple.',
  standard: 'IEC 61215 MQT 18',
  category: 'electrical_test',
  parametricFields: [
    { id: 'boxWidth',    label: 'Box Width',         defaultValue: 600,  unit: 'mm', min: 400,  max: 1000 },
    { id: 'boxDepth',    label: 'Box Depth',         defaultValue: 400,  unit: 'mm', min: 300,  max: 700  },
    { id: 'boxHeight',   label: 'Box Height',        defaultValue: 300,  unit: 'mm', min: 200,  max: 500  },
    { id: 'maxCurrent',  label: 'Max Test Current',  defaultValue: 20,   unit: 'A',  min: 5,    max: 50   },
    { id: 'camArmHeight',label: 'Camera Arm Height', defaultValue: 400,  unit: 'mm', min: 200,  max: 600  },
    { id: 'probeCount',  label: 'Thermal Probes',    defaultValue: 4,    unit: '',   min: 2,    max: 8    },
  ],
  generateGeometry(p: Record<string, number> = {}): SolidPrimitive[] {
    const bw  = (p.boxWidth     ?? 600) / 1000;
    const bd  = (p.boxDepth     ?? 400) / 1000;
    const bh  = (p.boxHeight    ?? 300) / 1000;
    const cah = (p.camArmHeight ?? 400) / 1000;
    const pc  = Math.round(p.probeCount ?? 4);
    const probes: SolidPrimitive[] = Array.from({ length: pc }, (_, i) => ({
      type: 'cylinder' as const,
      position: { x: -bw/2, y: -bh/2 + (i + 1) * (bh / (pc + 1)), z: 0 },
      dimensions: { w: 0.012, h: 0.04, d: 0.012 },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
      material: 'steel',
      label: `Thermal Probe Port ${i + 1}`,
    }));
    return [
      { type: 'box', position: { x:0,y:0,z:0 }, dimensions: { w:bw,h:bh,d:bd }, rotation: { x:0,y:0,z:0 }, material: 'insulated_steel', label: 'Insulated Test Box' },
      { type: 'box', position: { x:-(bw/2-0.05),y:bh/2+0.005,z:-(bd/4) }, dimensions: { w:0.02,h:0.01,d:0.02 }, rotation: { x:0,y:0,z:0 }, material: 'brass', label: 'Terminal + (Banana Jack)' },
      { type: 'box', position: { x:-(bw/2-0.1), y:bh/2+0.005,z:-(bd/4) }, dimensions: { w:0.02,h:0.01,d:0.02 }, rotation: { x:0,y:0,z:0 }, material: 'brass', label: 'Terminal − (Banana Jack)' },
      { type: 'box', position: { x: (bw/2-0.05),y:bh/2+0.005,z:-(bd/4) }, dimensions: { w:0.02,h:0.01,d:0.02 }, rotation: { x:0,y:0,z:0 }, material: 'brass', label: 'Terminal S+ (Banana Jack)' },
      { type: 'box', position: { x: (bw/2-0.1), y:bh/2+0.005,z:-(bd/4) }, dimensions: { w:0.02,h:0.01,d:0.02 }, rotation: { x:0,y:0,z:0 }, material: 'brass', label: 'Terminal S− (Banana Jack)' },
      { type: 'box', position: { x:0,y:bh/2+cah/2,z:bd/4 }, dimensions: { w:0.02,h:cah,d:0.02 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'IR Camera Adjustable Arm' },
      { type: 'box', position: { x:0,y:bh/2+cah,z:bd/4 }, dimensions: { w:0.4,h:0.3,d:0.2 }, rotation: { x:0,y:0,z:0 }, material: 'camera_body', label: 'IR Camera Body' },
      { type: 'cylinder', position: { x:0,y:bh/2+cah-0.05,z:bd/4-0.12 }, dimensions: { w:0.05,h:0.06,d:0.05 }, rotation: { x:Math.PI/2,y:0,z:0 }, material: 'glass', label: 'IR Camera Lens' },
      { type: 'box', position: { x:bw/2+0.25,y:-0.05,z:0 }, dimensions: { w:0.4,h:0.3,d:0.2 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'External Current Source Unit' },
      { type: 'cylinder', position: { x:bw/2+0.08,y:bh/4,z:0 }, dimensions: { w:0.01,h:0.08,d:0.01 }, rotation: { x:0,y:Math.PI/2,z:0 }, material: 'copper', label: 'Cable Entry Gland' },
      { type: 'cylinder', position: { x:bw/2+0.02,y:-(bh/2-0.03),z:bd/4 }, dimensions: { w:0.012,h:0.04,d:0.012 }, rotation: { x:0,y:0,z:0 }, material: 'steel', label: 'Ambient Thermocouple Ref' },
      ...probes,
    ];
  },
};

export const PV_IEC_TEMPLATES_PART2: IECTestTemplate[] = [
  saltMistChamber,
  elImagingDarkBox,
  hipotTestBench,
  ivCurveTracerStation,
  bypassDiodeThermalFixture,
];
