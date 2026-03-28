// ─── IEC PV Test Equipment 2D Engineering Drawing Data ─────────────────────
// Pure data objects — no JSX. Renderer in IECDrawingView.tsx.

// ── Shape types (discriminated union) ───────────────────────────────────────
export type ShapeStyle = 'solid' | 'dashed' | 'hidden' | 'thick' | 'center' | 'phantom';

export interface RectShape { type: 'rect'; x: number; y: number; w: number; h: number; fill?: string; style?: ShapeStyle }
export interface LineShape { type: 'line'; x: number; y: number; x2: number; y2: number; style?: ShapeStyle }
export interface CircleShape { type: 'circle'; x: number; y: number; r: number; fill?: string; style?: ShapeStyle }
export interface TextShape { type: 'text'; x: number; y: number; label: string; fontSize?: number; anchor?: 'start' | 'middle' | 'end'; bold?: boolean }
export interface ArcShape { type: 'arc'; cx: number; cy: number; r: number; startAngle: number; endAngle: number; style?: ShapeStyle }
export interface CrosshatchShape { type: 'crosshatch'; x: number; y: number; w: number; h: number; angle?: number; spacing?: number }

export type DrawingShape = RectShape | LineShape | CircleShape | TextShape | ArcShape | CrosshatchShape;

// ── Dimension & annotation types ────────────────────────────────────────────
export interface DimensionLine {
  dir: 'h' | 'v';
  p1: number; p2: number;   // start/end along dimension axis (mm)
  at: number;               // position on perpendicular axis (mm)
  offset: number;           // offset from geometry for dim line
  text: string;
  tolerance?: string;
}

export interface CenterMark { x: number; y: number; size: number }
export interface DatumRef { label: string; x: number; y: number; dir: 'up' | 'down' | 'left' | 'right' }

// ── View ────────────────────────────────────────────────────────────────────
export type ViewType = 'front' | 'top' | 'side' | 'section';
export interface DrawingView {
  label: string;
  viewType: ViewType;
  width_mm: number;
  height_mm: number;
  shapes: DrawingShape[];
  dimensions: DimensionLine[];
  centerMarks: CenterMark[];
  datumRefs: DatumRef[];
}

// ── BOM / Revision / Title Block ────────────────────────────────────────────
export interface BOMEntry { item: number; partNo: string; description: string; material: string; qty: number }
export interface RevisionEntry { rev: string; date: string; description: string; by: string }
export interface TitleBlockData {
  partNo: string; drawingNo: string; name: string; scale: string;
  material: string; standard: string; rev: string; date: string;
  drawnBy: string; checkedBy: string; approvedBy: string;
  sheet: string; project: string; surfaceFinish?: string; weight?: string;
}

// ── Top-level drawing data ──────────────────────────────────────────────────
export interface IECDrawingData {
  id: string;
  titleBlock: TitleBlockData;
  views: DrawingView[];
  notes: string[];
  bom: BOMEntry[];
  revisions: RevisionEntry[];
  generalTolerances: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const R = (x: number, y: number, w: number, h: number, fill?: string, style?: ShapeStyle): RectShape =>
  ({ type: 'rect', x, y, w, h, fill, style });
const Li = (x: number, y: number, x2: number, y2: number, style?: ShapeStyle): LineShape =>
  ({ type: 'line', x, y, x2, y2, style });
const Ci = (x: number, y: number, r: number, fill?: string, style?: ShapeStyle): CircleShape =>
  ({ type: 'circle', x, y, r, fill, style });
const Tx = (x: number, y: number, label: string, bold?: boolean): TextShape =>
  ({ type: 'text', x, y, label, bold });
const Xh = (x: number, y: number, w: number, h: number, angle = 45, spacing = 4): CrosshatchShape =>
  ({ type: 'crosshatch', x, y, w, h, angle, spacing });
const Hd = (p1: number, p2: number, at: number, offset: number, text: string, tolerance?: string): DimensionLine =>
  ({ dir: 'h', p1, p2, at, offset, text, tolerance });
const Vd = (p1: number, p2: number, at: number, offset: number, text: string, tolerance?: string): DimensionLine =>
  ({ dir: 'v', p1, p2, at, offset, text, tolerance });
const Cm = (x: number, y: number, size = 6): CenterMark => ({ x, y, size });
const Dr = (label: string, x: number, y: number, dir: DatumRef['dir'] = 'down'): DatumRef => ({ label, x, y, dir });

// ── 1. Mechanical Load Test Fixture ─────────────────────────────────────────
const mechanicalLoadFixture: IECDrawingData = {
  id: 'iec_mechanical_load_fixture',
  generalTolerances: '±0.5 unless noted',
  titleBlock: {
    partNo: 'SS-IEC-MLF-001', drawingNo: 'DWG-MLF-001', name: 'Mechanical Load Test Fixture',
    scale: '1:20', material: 'Steel S275 SHS 100×100×5', standard: 'IEC 61215 MQT 16',
    rev: 'A', date: '2026-03-28', drawnBy: 'ShilpaSutra AI', checkedBy: '—',
    approvedBy: '—', sheet: '1 of 1', project: 'ShilpaSutra PV Lab',
    surfaceFinish: 'Hot-dip galvanised', weight: '≈185 kg',
  },
  views: [
    { label: 'FRONT VIEW', viewType: 'front', width_mm: 2400, height_mm: 250, shapes: [
      R(0, 0, 2400, 100, undefined, 'thick'), R(0, 150, 2400, 100, undefined, 'thick'),
      Xh(0, 0, 2400, 100), Xh(0, 150, 2400, 100),
      R(100, 100, 2200, 50, '#e8e8e8'), Tx(1200, 125, 'PRESSURE BAG'),
      Li(0, 50, 2400, 50, 'center'), Li(1200, 0, 1200, 250, 'center'),
      Ci(200, 50, 25), Ci(2200, 50, 25), Ci(200, 200, 25), Ci(2200, 200, 25),
    ], dimensions: [
      Hd(0, 2400, 0, -20, '2400', '±2'), Hd(100, 2300, 125, 15, '2200'),
      Vd(0, 100, 0, -20, '100'), Vd(100, 150, 2400, 20, '50'),
      Vd(0, 250, 2400, 35, '250'),
    ], centerMarks: [Cm(200, 50), Cm(2200, 50), Cm(200, 200), Cm(2200, 200)],
      datumRefs: [Dr('A', 0, 250, 'down'), Dr('B', 0, 0, 'left')] },
    { label: 'TOP VIEW', viewType: 'top', width_mm: 2400, height_mm: 1300, shapes: [
      R(0, 0, 2400, 1300, undefined, 'thick'),
      R(200, 150, 2000, 1000, '#f0f0f0', 'dashed'),
      Tx(1200, 650, 'MODULE ZONE 2000×1000'),
      Ci(200, 150, 25), Ci(1200, 150, 25), Ci(2200, 150, 25),
      Ci(200, 1150, 25), Ci(1200, 1150, 25), Ci(2200, 1150, 25),
      Ci(200, 650, 25), Ci(2200, 650, 25),
      Li(1200, 0, 1200, 1300, 'center'), Li(0, 650, 2400, 650, 'center'),
    ], dimensions: [
      Hd(0, 2400, 0, -20, '2400', '±2'), Vd(0, 1300, 0, -20, '1300', '±2'),
      Hd(0, 200, 1300, 15, '200'), Hd(200, 2200, 1300, 30, '2000'),
      Vd(0, 150, 2400, 15, '150'), Vd(150, 1150, 2400, 30, '1000'),
    ], centerMarks: [Cm(200,150), Cm(1200,150), Cm(2200,150), Cm(200,650),
      Cm(2200,650), Cm(200,1150), Cm(1200,1150), Cm(2200,1150)],
      datumRefs: [Dr('A', 0, 1300, 'down'), Dr('B', 0, 0, 'left')] },
    { label: 'SECTION A-A', viewType: 'section', width_mm: 2400, height_mm: 400, shapes: [
      R(0, 0, 2400, 100, undefined, 'thick'), Xh(0, 0, 100, 100), Xh(2300, 0, 100, 100),
      R(0, 300, 2400, 100, undefined, 'thick'), Xh(0, 300, 100, 100), Xh(2300, 300, 100, 100),
      R(100, 100, 2200, 50, '#e8e8e8'), Tx(1200, 125, 'PRESSURE BAG 5400 Pa'),
      R(100, 150, 2200, 150, '#dbeafe'), Tx(1200, 225, 'MODULE (DUT)'),
      Li(0, 200, 2400, 200, 'center'),
    ], dimensions: [
      Hd(0, 2400, 0, -15, '2400'), Vd(0, 400, 0, -20, '400'),
      Vd(0, 100, 2400, 15, '100'), Vd(100, 150, 2400, 30, '50 BAG'),
      Vd(150, 300, 2400, 45, '150 MODULE'), Vd(300, 400, 2400, 15, '100'),
    ], centerMarks: [], datumRefs: [Dr('A', 0, 400, 'down')] },
  ],
  bom: [
    { item: 1, partNo: 'MLF-FR-01', description: 'Main frame SHS 100×100×5', material: 'Steel S275', qty: 1 },
    { item: 2, partNo: 'MLF-BG-01', description: 'Inflatable pressure bag 2200×1100', material: 'Reinforced PVC', qty: 1 },
    { item: 3, partNo: 'MLF-SP-01', description: 'Support pin Ø50 rubber-tipped', material: 'Steel/Rubber', qty: 8 },
    { item: 4, partNo: 'MLF-TR-01', description: 'Pressure transducer 0–6000 Pa', material: 'SS316', qty: 1 },
    { item: 5, partNo: 'MLF-VL-01', description: 'Air supply valve ½" BSP', material: 'Brass', qty: 2 },
  ],
  revisions: [
    { rev: 'A', date: '2026-03-28', description: 'Initial release', by: 'AI' },
  ],
  notes: [
    '1. TEST LOAD: ±5400 Pa UNIFORM (IEC 61215 MQT 16)',
    '2. FRAME: SHS 100×100×5mm STEEL S275, HOT-DIP GALVANISED',
    '3. SUPPORT PINS: 8× RUBBER-TIPPED Ø50mm, SHORE A 70',
    '4. WELD: ALL WELDS FILLET 6mm, AWS D1.1',
    '5. SURFACE: HOT-DIP GALVANISED TO ISO 1461',
    '6. TOLERANCES: ±2mm FRAME, ±0.5mm PIN POSITIONS',
  ],
};

// ── 2. Salt Mist Chamber ────────────────────────────────────────────────────
const saltMistChamber: IECDrawingData = {
  id: 'iec_salt_mist_chamber',
  generalTolerances: '±0.5 unless noted',
  titleBlock: {
    partNo: 'SS-IEC-SMC-001', drawingNo: 'DWG-SMC-001', name: 'Salt Mist Corrosion Test Chamber',
    scale: '1:10', material: 'SS316L / Acrylic', standard: 'IEC 61701 MQT 11',
    rev: 'A', date: '2026-03-28', drawnBy: 'ShilpaSutra AI', checkedBy: '—',
    approvedBy: '—', sheet: '1 of 1', project: 'ShilpaSutra PV Lab',
    surfaceFinish: 'Electropolished internal', weight: '≈95 kg',
  },
  views: [
    { label: 'FRONT VIEW', viewType: 'front', width_mm: 900, height_mm: 900, shapes: [
      R(0, 0, 900, 700, undefined, 'thick'),
      R(0, 700, 900, 200, undefined, 'thick'), Xh(0, 700, 900, 200),
      R(50, 20, 800, 30, undefined, 'dashed'), // lid hinge
      Li(50, 0, 850, 0, 'thick'), // lid top
      R(300, 100, 300, 500, '#f0f0f0', 'dashed'), // viewing window
      Tx(450, 350, 'ACRYLIC WINDOW'), Tx(450, 800, 'SUMP 200mm'),
      Ci(100, 650, 10), Ci(800, 650, 10), // nozzle positions
      Tx(100, 670, 'N1'), Tx(800, 670, 'N2'),
      R(750, 850, 100, 50), Tx(800, 875, 'DRAIN'),
    ], dimensions: [
      Hd(0, 900, 0, -20, '900', '±1'), Vd(0, 700, 0, -20, '700', '±1'),
      Vd(700, 900, 0, -35, '200'), Hd(300, 600, 100, -15, '300 WINDOW'),
      Vd(100, 600, 900, 15, '500 WINDOW'),
    ], centerMarks: [Cm(100, 650), Cm(800, 650)],
      datumRefs: [Dr('A', 0, 900, 'down'), Dr('B', 0, 0, 'left')] },
    { label: 'TOP VIEW', viewType: 'top', width_mm: 900, height_mm: 700, shapes: [
      R(0, 0, 900, 700, undefined, 'thick'),
      Li(450, 0, 450, 700, 'center'), Li(0, 350, 900, 350, 'center'),
      Ci(150, 175, 8), Ci(450, 175, 8), Ci(750, 175, 8), // nozzle array row 1
      Ci(150, 525, 8), Ci(450, 525, 8), Ci(750, 525, 8), // nozzle array row 2
      Tx(450, 350, 'NOZZLE ARRAY 2×3'),
      R(50, 50, 800, 600, undefined, 'dashed'), // internal rack area
    ], dimensions: [
      Hd(0, 900, 0, -15, '900'), Vd(0, 700, 0, -15, '700'),
      Hd(0, 150, 700, 15, '150'), Hd(150, 450, 700, 15, '300'),
      Vd(0, 175, 900, 15, '175'), Vd(175, 525, 900, 15, '350'),
    ], centerMarks: [Cm(150,175), Cm(450,175), Cm(750,175),
      Cm(150,525), Cm(450,525), Cm(750,525)],
      datumRefs: [Dr('A', 0, 700, 'down')] },
    { label: 'SIDE VIEW', viewType: 'side', width_mm: 700, height_mm: 900, shapes: [
      R(0, 0, 700, 700, undefined, 'thick'),
      R(0, 700, 700, 200, undefined, 'thick'), Xh(0, 700, 700, 200),
      Li(100, 150, 600, 550), // rack at 15°–20°
      Tx(350, 350, 'RACK 15°–20°'), Tx(350, 800, 'SUMP'),
      Ci(350, 100, 10), // nozzle tower top
      Li(350, 100, 350, 650, 'center'), Tx(370, 400, 'NOZZLE RISER'),
    ], dimensions: [
      Hd(0, 700, 0, -15, '700'), Vd(0, 900, 0, -20, '900'),
      Vd(0, 700, 700, 15, '700 CHAMBER'), Vd(700, 900, 700, 15, '200 SUMP'),
    ], centerMarks: [Cm(350, 100)],
      datumRefs: [Dr('A', 0, 900, 'down')] },
    { label: 'SECTION A-A', viewType: 'section', width_mm: 900, height_mm: 900, shapes: [
      R(0, 0, 900, 700, undefined, 'thick'),
      Xh(0, 0, 20, 700), Xh(880, 0, 20, 700), // wall sections
      R(0, 700, 900, 200, undefined, 'thick'), Xh(0, 700, 900, 200),
      Li(150, 200, 750, 550), // tilted specimen rack
      Ci(450, 100, 12), // spray nozzle
      Tx(450, 80, 'SPRAY NOZZLE Ø8'),
      R(400, 850, 100, 50), Tx(450, 875, 'DRAIN VALVE'),
      Tx(450, 400, 'SPECIMEN RACK'), Tx(450, 770, '5% NaCl SOLUTION'),
    ], dimensions: [
      Hd(0, 20, 0, -10, '20 WALL'), Hd(880, 900, 0, -10, '20'),
      Vd(0, 700, 450, 0, '700 INT.'), Vd(700, 900, 450, 0, '200 SUMP'),
    ], centerMarks: [Cm(450, 100)],
      datumRefs: [] },
  ],
  bom: [
    { item: 1, partNo: 'SMC-BD-01', description: 'Chamber body 900×700×700', material: 'SS316L 2mm', qty: 1 },
    { item: 2, partNo: 'SMC-SP-01', description: 'Sump tank 900×700×200', material: 'SS316L 3mm', qty: 1 },
    { item: 3, partNo: 'SMC-NZ-01', description: 'Spray nozzle Ø8mm', material: 'PTFE/SS316', qty: 6 },
    { item: 4, partNo: 'SMC-RK-01', description: 'Specimen rack 800×600', material: 'PP', qty: 2 },
    { item: 5, partNo: 'SMC-DR-01', description: 'Drain valve ¾" BSP', material: 'SS316', qty: 1 },
    { item: 6, partNo: 'SMC-LD-01', description: 'Hinged lid with seal', material: 'Acrylic 10mm', qty: 1 },
    { item: 7, partNo: 'SMC-HT-01', description: 'Immersion heater 2kW', material: 'Incoloy', qty: 1 },
  ],
  revisions: [{ rev: 'A', date: '2026-03-28', description: 'Initial release', by: 'AI' }],
  notes: [
    '1. SALT SOLUTION: 5% NaCl, pH 6.5–7.2 (IEC 61701 SEV 6)',
    '2. CHAMBER TEMP: 35±2°C CONTINUOUS',
    '3. WALLS: SS316L 2mm ELECTROPOLISHED INTERNAL',
    '4. DOOR SEAL: SILICONE GASKET, IP65',
    '5. NOZZLE ARRAY: 6× PTFE, 0.5–3.0 mL/80cm²/hr',
    '6. WELD: ALL WELDS TIG, PASSIVATED POST-WELD',
  ],
};

// ── 3. UV Conditioning Chamber ──────────────────────────────────────────────
const uvChamber: IECDrawingData = {
  id: 'iec_uv_chamber',
  generalTolerances: '±0.5 unless noted',
  titleBlock: {
    partNo: 'SS-IEC-UVC-001', drawingNo: 'DWG-UVC-001', name: 'UV Conditioning Chamber',
    scale: '1:10', material: 'Insulated Steel / Aluminium', standard: 'IEC 61215 MQT 10',
    rev: 'A', date: '2026-03-28', drawnBy: 'ShilpaSutra AI', checkedBy: '—',
    approvedBy: '—', sheet: '1 of 1', project: 'ShilpaSutra PV Lab',
    surfaceFinish: 'Powder-coated exterior, Al reflector interior', weight: '≈120 kg',
  },
  views: [
    { label: 'FRONT VIEW', viewType: 'front', width_mm: 1200, height_mm: 900, shapes: [
      R(0, 0, 1200, 900, undefined, 'thick'),
      R(400, 200, 400, 600, '#f0f0f0', 'dashed'), // door outline
      R(50, 750, 300, 120, '#e8e8e8'), // control panel
      Tx(200, 810, 'CONTROL PANEL'),
      R(820, 30, 350, 80, '#e8e8e8'), // UV monitor display
      Tx(995, 70, 'UV IRRADIANCE DISPLAY'),
      Tx(600, 500, 'ACCESS DOOR 400×600'),
      Li(600, 0, 600, 900, 'center'), Li(0, 450, 1200, 450, 'center'),
    ], dimensions: [
      Hd(0, 1200, 0, -20, '1200', '±2'), Vd(0, 900, 0, -20, '900', '±2'),
      Hd(400, 800, 900, 15, '400 DOOR'), Vd(200, 800, 1200, 15, '600 DOOR'),
    ], centerMarks: [], datumRefs: [Dr('A', 0, 900, 'down'), Dr('B', 0, 0, 'left')] },
    { label: 'TOP VIEW', viewType: 'top', width_mm: 1200, height_mm: 800, shapes: [
      R(0, 0, 1200, 800, undefined, 'thick'),
      // 8 UV lamp positions
      ...[0,1,2,3,4,5,6,7].map(i => R(50 + i * 140, 350, 120, 20, '#ffe0b2')),
      ...[0,1,2,3,4,5,6,7].map(i => Tx(110 + i * 140, 340, `L${i + 1}`)),
      Li(600, 0, 600, 800, 'center'), Li(0, 400, 1200, 400, 'center'),
      // Irradiance sensor positions
      Ci(300, 200, 8), Ci(600, 200, 8), Ci(900, 200, 8),
      Ci(300, 600, 8), Ci(600, 600, 8), Ci(900, 600, 8),
      Tx(300, 220, 'S1'), Tx(600, 220, 'S2'), Tx(900, 220, 'S3'),
      Tx(300, 620, 'S4'), Tx(600, 620, 'S5'), Tx(900, 620, 'S6'),
    ], dimensions: [
      Hd(0, 1200, 0, -15, '1200'), Vd(0, 800, 0, -15, '800'),
      Hd(50, 190, 370, 30, '140 TYP LAMP PITCH'),
      Hd(0, 300, 200, -10, '300'), Hd(300, 600, 200, -10, '300'), Hd(600, 900, 200, -10, '300'),
    ], centerMarks: [Cm(300,200), Cm(600,200), Cm(900,200),
      Cm(300,600), Cm(600,600), Cm(900,600)],
      datumRefs: [Dr('A', 0, 800, 'down')] },
    { label: 'SECTION A-A', viewType: 'section', width_mm: 800, height_mm: 900, shapes: [
      R(0, 0, 800, 900, undefined, 'thick'),
      Xh(0, 0, 30, 900), Xh(770, 0, 30, 900), // wall insulation
      // 8 UV lamps at top
      ...[0,1,2,3,4,5,6,7].map(i => Ci(60 + i * 90, 80, 12)),
      // Reflector behind lamps
      R(30, 30, 740, 20, '#d0d0d0'),
      Tx(400, 35, 'AL REFLECTOR'),
      Tx(400, 80, 'UVA-340 LAMPS ×8'),
      // Angled module shelf
      Li(100, 800, 700, 400), // 45° shelf
      Tx(500, 550, 'MODULE SHELF 45°'),
      // Irradiance sensor
      Ci(400, 200, 6), Tx(420, 200, 'IRRADIANCE SENSOR'),
      R(0, 870, 800, 30, '#e0e0e0'), Tx(400, 885, 'FLOOR / DRAIN'),
    ], dimensions: [
      Hd(0, 800, 0, -15, '800 DEPTH'), Vd(0, 900, 0, -20, '900'),
      Vd(0, 30, 800, 15, '30 WALL'), Vd(30, 80, 800, 30, '50 LAMP ZONE'),
      Hd(60, 150, 80, 15, '90 TYP'),
    ], centerMarks: [...[0,1,2,3,4,5,6,7].map(i => Cm(60 + i * 90, 80))],
      datumRefs: [Dr('A', 0, 900, 'down')] },
  ],
  bom: [
    { item: 1, partNo: 'UVC-CB-01', description: 'Chamber body 1200×800×900', material: 'Steel 2mm + 40mm PU', qty: 1 },
    { item: 2, partNo: 'UVC-LP-01', description: 'UVA-340 fluorescent lamp 40W', material: 'Glass/phosphor', qty: 8 },
    { item: 3, partNo: 'UVC-RF-01', description: 'Al reflector sheet 740×800', material: 'Al 6061 1mm polished', qty: 1 },
    { item: 4, partNo: 'UVC-SN-01', description: 'Irradiance sensor UV-A/B', material: 'Si photodiode', qty: 6 },
    { item: 5, partNo: 'UVC-SH-01', description: 'Module shelf 45° adjustable', material: 'Al 6063-T5', qty: 1 },
    { item: 6, partNo: 'UVC-CT-01', description: 'Temperature controller PID', material: '—', qty: 1 },
  ],
  revisions: [{ rev: 'A', date: '2026-03-28', description: 'Initial release', by: 'AI' }],
  notes: [
    '1. UV DOSE: 60 kWh/m² MINIMUM (IEC 61215 MQT 10)',
    '2. LAMPS: 8× UVA-340 FLUORESCENT 40W, 280–400nm',
    '3. IRRADIANCE: ≥60 W/m² UV-A, MONITORED 6 POSITIONS',
    '4. CHAMBER TEMP: 60±5°C DURING EXPOSURE',
    '5. REFLECTOR: POLISHED AL, ≥85% REFLECTANCE',
    '6. INSULATION: 40mm PU FOAM, λ ≤ 0.025 W/(m·K)',
  ],
};

// ── 4. Thermal Cycling Chamber ──────────────────────────────────────────────
const thermalCyclingChamber: IECDrawingData = {
  id: 'iec_thermal_cycling_chamber',
  generalTolerances: '±0.5 unless noted',
  titleBlock: {
    partNo: 'SS-IEC-TCC-001', drawingNo: 'DWG-TCC-001', name: 'Thermal Cycling Chamber',
    scale: '1:15', material: 'Double-wall insulated steel', standard: 'IEC 61215 MQT 11',
    rev: 'A', date: '2026-03-28', drawnBy: 'ShilpaSutra AI', checkedBy: '—',
    approvedBy: '—', sheet: '1 of 1', project: 'ShilpaSutra PV Lab',
    surfaceFinish: 'Powder-coated exterior, SS304 interior', weight: '≈350 kg',
  },
  views: [
    { label: 'FRONT VIEW', viewType: 'front', width_mm: 1600, height_mm: 1800, shapes: [
      R(0, 0, 1600, 1800, undefined, 'thick'),
      R(500, 400, 600, 600, '#f0f0f0', 'dashed'), // viewing window
      Tx(800, 700, 'VIEWING WINDOW\n600×600 DOUBLE-GLAZED'),
      R(100, 1500, 400, 250, '#e8e8e8'), // control panel
      Tx(300, 1625, 'PLC/HMI PANEL'),
      Li(800, 0, 800, 1800, 'center'), Li(0, 900, 1600, 900, 'center'),
      // TC port positions on front face
      Ci(1400, 300, 8), Ci(1400, 600, 8), Ci(1400, 900, 8), Ci(1400, 1200, 8),
      Tx(1430, 300, 'TC1'), Tx(1430, 600, 'TC2'), Tx(1430, 900, 'TC3'), Tx(1430, 1200, 'TC4'),
    ], dimensions: [
      Hd(0, 1600, 0, -20, '1600', '±2'), Vd(0, 1800, 0, -25, '1800', '±2'),
      Hd(500, 1100, 400, -15, '600 WINDOW'), Vd(400, 1000, 1100, 15, '600 WINDOW'),
      Vd(300, 600, 1500, 15, '300 TC PITCH'),
    ], centerMarks: [Cm(1400,300), Cm(1400,600), Cm(1400,900), Cm(1400,1200)],
      datumRefs: [Dr('A', 0, 1800, 'down'), Dr('B', 0, 0, 'left')] },
    { label: 'TOP VIEW', viewType: 'top', width_mm: 1600, height_mm: 1200, shapes: [
      R(0, 0, 1600, 1200, undefined, 'thick'),
      R(50, 50, 1500, 1100, '#f8f8f8', 'dashed'), // internal
      Li(800, 0, 800, 1200, 'center'), Li(0, 600, 1600, 600, 'center'),
      // Heater positions (top-mounted)
      R(200, 200, 400, 100, '#ffd0d0'), Tx(400, 250, 'HEATER 1 (2kW)'),
      R(1000, 200, 400, 100, '#ffd0d0'), Tx(1200, 250, 'HEATER 2 (2kW)'),
      R(200, 900, 400, 100, '#ffd0d0'), Tx(400, 950, 'HEATER 3 (2kW)'),
      R(1000, 900, 400, 100, '#ffd0d0'), Tx(1200, 950, 'HEATER 4 (2kW)'),
      // Cooler coil (center)
      R(550, 450, 500, 300, '#d0e0ff', 'dashed'), Tx(800, 600, 'EVAPORATOR COIL'),
    ], dimensions: [
      Hd(0, 1600, 0, -15, '1600'), Vd(0, 1200, 0, -15, '1200'),
      Hd(200, 600, 200, -10, '400 HTR'), Hd(1000, 1400, 200, -10, '400 HTR'),
    ], centerMarks: [],
      datumRefs: [Dr('A', 0, 1200, 'down')] },
    { label: 'SIDE VIEW', viewType: 'side', width_mm: 1200, height_mm: 1800, shapes: [
      R(0, 0, 1200, 1800, undefined, 'thick'),
      R(30, 30, 1140, 1740, '#f8f8f8', 'dashed'), // inner wall
      Xh(0, 0, 30, 1800), Xh(1170, 0, 30, 1800), // insulation
      // Hanging rails (4 levels)
      Li(100, 400, 1100, 400, 'dashed'), Li(100, 700, 1100, 700, 'dashed'),
      Li(100, 1000, 1100, 1000, 'dashed'), Li(100, 1300, 1100, 1300, 'dashed'),
      Tx(600, 390, 'RAIL 1'), Tx(600, 690, 'RAIL 2'),
      Tx(600, 990, 'RAIL 3'), Tx(600, 1290, 'RAIL 4'),
      // Circulation fan at top
      Ci(600, 150, 100, undefined, 'dashed'), Tx(600, 150, 'Ø400 FAN'),
      // Heater bank at bottom
      R(200, 1600, 800, 80, '#ffd0d0'), Tx(600, 1640, 'HEATER BANK 4×2kW'),
    ], dimensions: [
      Hd(0, 1200, 0, -15, '1200 DEPTH'), Vd(0, 1800, 0, -20, '1800'),
      Hd(0, 30, 1800, 15, '30 INSUL.'),
      Vd(400, 700, 1200, 15, '300 RAIL PITCH'),
    ], centerMarks: [Cm(600, 150)],
      datumRefs: [Dr('A', 0, 1800, 'down')] },
    { label: 'SECTION A-A', viewType: 'section', width_mm: 1600, height_mm: 1800, shapes: [
      R(0, 0, 1600, 1800, undefined, 'thick'),
      Xh(0, 0, 40, 1800), Xh(1560, 0, 40, 1800), // wall section
      Xh(0, 0, 1600, 40), Xh(0, 1760, 1600, 40), // top/bottom wall
      R(40, 40, 1520, 1720, '#f8f8f8'), // interior
      Ci(800, 150, 200, undefined, 'dashed'), Tx(800, 150, 'Ø400 CIRC. FAN'),
      R(200, 1600, 500, 80, '#ffd0d0'), R(900, 1600, 500, 80, '#ffd0d0'),
      Tx(450, 1640, '2kW'), Tx(1150, 1640, '2kW'),
      // Modules hanging from rails
      Li(200, 400, 200, 1500), Li(600, 400, 600, 1500),
      Li(1000, 400, 1000, 1500), Li(1400, 400, 1400, 1500),
      Tx(400, 950, 'MODULE'), Tx(1200, 950, 'MODULE'),
    ], dimensions: [
      Hd(0, 40, 0, -10, '40 WALL'), Vd(0, 40, 0, -10, '40'),
      Hd(200, 600, 400, -10, '400 MODULE PITCH'),
    ], centerMarks: [Cm(800, 150)],
      datumRefs: [] },
  ],
  bom: [
    { item: 1, partNo: 'TCC-CB-01', description: 'Chamber body double-wall 1600×1200×1800', material: 'Steel/SS304', qty: 1 },
    { item: 2, partNo: 'TCC-HT-01', description: 'Strip heater 2kW 240V', material: 'Incoloy 800', qty: 4 },
    { item: 3, partNo: 'TCC-FN-01', description: 'Circulation fan Ø400mm axial', material: 'Al/SS', qty: 1 },
    { item: 4, partNo: 'TCC-RL-01', description: 'Module hanging rail 1100mm', material: 'SS304', qty: 4 },
    { item: 5, partNo: 'TCC-TC-01', description: 'TC feedthrough K-type Ø8mm', material: 'SS316', qty: 4 },
    { item: 6, partNo: 'TCC-WN-01', description: 'Viewing window 600×600 double-glazed', material: 'Borosilicate', qty: 1 },
    { item: 7, partNo: 'TCC-IN-01', description: 'Insulation panel 40mm PU', material: 'PU foam', qty: 1 },
    { item: 8, partNo: 'TCC-RF-01', description: 'Refrigeration unit 5kW', material: 'R-404A system', qty: 1 },
  ],
  revisions: [{ rev: 'A', date: '2026-03-28', description: 'Initial release', by: 'AI' }],
  notes: [
    '1. CYCLE: −40°C TO +85°C, 200 CYCLES (IEC 61215 MQT 11)',
    '2. RAMP RATE: ≤100°C/hr, DWELL ≥10 min AT EXTREMES',
    '3. TC PORTS: 4× K-TYPE FEEDTHROUGH, Ø8mm SS316',
    '4. INSULATION: 40mm PU FOAM, DOUBLE-WALL CONSTRUCTION',
    '5. HEATERS: 4×2kW STRIP, INCOLOY 800',
    '6. FAN: Ø400mm AXIAL, 2800 RPM, SS IMPELLER',
  ],
};

// ── 5. Humidity Freeze Chamber ──────────────────────────────────────────────
const humidityFreezeChamber: IECDrawingData = {
  id: 'iec_humidity_freeze_chamber',
  generalTolerances: '±0.5 unless noted',
  titleBlock: {
    partNo: 'SS-IEC-HFC-001', drawingNo: 'DWG-HFC-001', name: 'Humidity Freeze Cycling Chamber',
    scale: '1:20', material: 'Double-wall SS304 / PU foam', standard: 'IEC 61215 MQT 12',
    rev: 'A', date: '2026-03-28', drawnBy: 'ShilpaSutra AI', checkedBy: '—',
    approvedBy: '—', sheet: '1 of 1', project: 'ShilpaSutra PV Lab',
    surfaceFinish: 'SS304 #4 brush interior', weight: '≈480 kg',
  },
  views: [
    { label: 'FRONT VIEW', viewType: 'front', width_mm: 2000, height_mm: 2200, shapes: [
      R(0, 0, 2000, 2200, undefined, 'thick'),
      R(100, 100, 800, 1900, '#f0f0f0', 'dashed'), // access door
      R(200, 300, 400, 300, '#e0e8f0'), // viewport
      Tx(400, 450, 'VIEWPORT\n400×300'),
      R(1200, 0, 600, 350, '#ffe0e0'), // roof compressor housing
      Tx(1500, 175, 'COMPRESSOR\nHOUSING'),
      Li(1000, 0, 1000, 2200, 'center'),
      // Humidity probe positions
      Ci(1600, 600, 8), Ci(1600, 1100, 8), Ci(1600, 1600, 8),
      Tx(1640, 600, 'HP1'), Tx(1640, 1100, 'HP2'), Tx(1640, 1600, 'HP3'),
    ], dimensions: [
      Hd(0, 2000, 0, -25, '2000', '±3'), Vd(0, 2200, 0, -25, '2200', '±3'),
      Hd(100, 900, 100, -15, '800 DOOR'), Vd(100, 2000, 900, 15, '1900 DOOR'),
      Vd(600, 1100, 1700, 15, '500 PROBE PITCH'),
    ], centerMarks: [Cm(1600,600), Cm(1600,1100), Cm(1600,1600)],
      datumRefs: [Dr('A', 0, 2200, 'down'), Dr('B', 0, 0, 'left')] },
    { label: 'TOP VIEW', viewType: 'top', width_mm: 2000, height_mm: 1500, shapes: [
      R(0, 0, 2000, 1500, undefined, 'thick'),
      R(100, 100, 1800, 1300, '#f8f8f8', 'dashed'), // interior
      // Condensation drain channels
      Li(100, 750, 1900, 750, 'center'),
      R(900, 1350, 200, 100, '#d0e8ff'), Tx(1000, 1400, 'DRAIN'),
      // Humidity nozzle positions (4 corners)
      Ci(300, 300, 10), Ci(1700, 300, 10), Ci(300, 1200, 10), Ci(1700, 1200, 10),
      Tx(300, 320, 'HN1'), Tx(1700, 320, 'HN2'), Tx(300, 1220, 'HN3'), Tx(1700, 1220, 'HN4'),
      Li(1000, 0, 1000, 1500, 'center'),
    ], dimensions: [
      Hd(0, 2000, 0, -15, '2000'), Vd(0, 1500, 0, -15, '1500'),
      Hd(0, 300, 300, -10, '300'), Hd(300, 1700, 300, -10, '1400'),
      Vd(0, 300, 300, -10, '300'), Vd(300, 1200, 300, -10, '900'),
    ], centerMarks: [Cm(300,300), Cm(1700,300), Cm(300,1200), Cm(1700,1200)],
      datumRefs: [Dr('A', 0, 1500, 'down')] },
    { label: 'SECTION A-A', viewType: 'section', width_mm: 2000, height_mm: 2200, shapes: [
      R(0, 0, 2000, 2200, undefined, 'thick'),
      Xh(0, 0, 50, 2200), Xh(1950, 0, 50, 2200), // walls
      Xh(0, 0, 2000, 50), Xh(0, 2150, 2000, 50), // top/bottom
      R(50, 50, 1900, 2100, '#f0f8ff'), // interior
      // 5 shelves
      R(100, 400, 1800, 20, '#d0d0d0'), R(100, 750, 1800, 20, '#d0d0d0'),
      R(100, 1100, 1800, 20, '#d0d0d0'), R(100, 1450, 1800, 20, '#d0d0d0'),
      R(100, 1800, 1800, 20, '#d0d0d0'),
      Tx(1000, 600, 'SHELF 1'), Tx(1000, 950, 'SHELF 2'),
      // Humidity nozzles at top
      Ci(300, 150, 8), Ci(1000, 150, 8), Ci(1700, 150, 8),
      Tx(1000, 130, 'HUMIDITY NOZZLES ×4'),
      // Condensation zone at bottom
      R(50, 2050, 1900, 100, '#e0f0ff'), Tx(1000, 2100, 'CONDENSATION / DRAIN ZONE'),
    ], dimensions: [
      Hd(0, 50, 0, -10, '50 WALL'), Vd(0, 50, 0, -10, '50'),
      Vd(400, 750, 2000, 15, '350 SHELF PITCH'),
      Vd(2050, 2150, 2000, 15, '100 DRAIN'),
    ], centerMarks: [Cm(300,150), Cm(1000,150), Cm(1700,150)],
      datumRefs: [] },
  ],
  bom: [
    { item: 1, partNo: 'HFC-CB-01', description: 'Walk-in chamber body 2000×1500×2200', material: 'SS304/PU 100mm', qty: 1 },
    { item: 2, partNo: 'HFC-SH-01', description: 'Module shelf 1800×1300', material: 'SS304 perforated', qty: 5 },
    { item: 3, partNo: 'HFC-HN-01', description: 'Humidity nozzle ultrasonic', material: 'SS316/PTFE', qty: 4 },
    { item: 4, partNo: 'HFC-HP-01', description: 'Humidity probe capacitive', material: '—', qty: 3 },
    { item: 5, partNo: 'HFC-DR-01', description: 'Condensation drain assembly', material: 'SS304', qty: 1 },
    { item: 6, partNo: 'HFC-CP-01', description: 'Compressor unit 8kW', material: 'R-404A', qty: 1 },
    { item: 7, partNo: 'HFC-VP-01', description: 'Viewport 400×300 heated', material: 'Borosilicate', qty: 1 },
  ],
  revisions: [{ rev: 'A', date: '2026-03-28', description: 'Initial release', by: 'AI' }],
  notes: [
    '1. TEMP: −40°C TO +85°C, HUMIDITY 85% RH (IEC 61215 MQT 12)',
    '2. INSULATION: 100mm PU FOAM, DOUBLE-WALL SS304',
    '3. CAPACITY: 10 MODULES ON 5 PERFORATED SHELVES',
    '4. CONDENSATION ZONE: 100mm DEPTH WITH SS DRAIN',
    '5. HUMIDITY PROBES: 3× CAPACITIVE, ±1.5% RH ACCURACY',
    '6. DOOR SEAL: HEATED SILICONE GASKET, ANTI-ICE',
  ],
};

// ── 6. Damp Heat Chamber ────────────────────────────────────────────────────
const dampHeatChamber: IECDrawingData = {
  id: 'iec_damp_heat_chamber',
  generalTolerances: '±0.5 unless noted',
  titleBlock: {
    partNo: 'SS-IEC-DHC-001', drawingNo: 'DWG-DHC-001', name: 'Damp Heat Test Chamber',
    scale: '1:15', material: 'SS304 / PU insulation', standard: 'IEC 61215 MQT 13',
    rev: 'A', date: '2026-03-28', drawnBy: 'ShilpaSutra AI', checkedBy: '—',
    approvedBy: '—', sheet: '1 of 1', project: 'ShilpaSutra PV Lab',
    surfaceFinish: 'SS304 electropolished interior', weight: '≈310 kg',
  },
  views: [
    { label: 'FRONT VIEW', viewType: 'front', width_mm: 1800, height_mm: 2000, shapes: [
      R(0, 0, 1800, 2000, undefined, 'thick'),
      R(500, 300, 800, 1200, '#f0f0f0', 'dashed'), // door
      Tx(900, 900, 'DOOR 800×1200'),
      R(100, 1700, 350, 250, '#e8e8e8'), // control panel
      Tx(275, 1825, 'PID CONTROLLER\n85°C / 85% RH'),
      Li(900, 0, 900, 2000, 'center'),
      // Heating element indicators
      R(1500, 400, 200, 100, '#ffd0d0'), Tx(1600, 450, 'HTR'),
      R(1500, 800, 200, 100, '#ffd0d0'), Tx(1600, 850, 'HTR'),
      R(1500, 1200, 200, 100, '#ffd0d0'), Tx(1600, 1250, 'HTR'),
    ], dimensions: [
      Hd(0, 1800, 0, -20, '1800', '±2'), Vd(0, 2000, 0, -20, '2000', '±2'),
      Hd(500, 1300, 300, -15, '800 DOOR'), Vd(300, 1500, 1300, 15, '1200 DOOR'),
    ], centerMarks: [],
      datumRefs: [Dr('A', 0, 2000, 'down'), Dr('B', 0, 0, 'left')] },
    { label: 'TOP VIEW', viewType: 'top', width_mm: 1800, height_mm: 1400, shapes: [
      R(0, 0, 1800, 1400, undefined, 'thick'),
      R(50, 50, 1700, 1300, '#f8f8f8', 'dashed'), // interior
      Li(900, 0, 900, 1400, 'center'), Li(0, 700, 1800, 700, 'center'),
      // Circulation fans (2×)
      Ci(500, 400, 80, undefined, 'dashed'), Ci(1300, 400, 80, undefined, 'dashed'),
      Tx(500, 400, 'FAN 1'), Tx(1300, 400, 'FAN 2'),
      // Water reservoir
      R(700, 1100, 400, 200, '#d0e8ff'), Tx(900, 1200, 'WATER\nRESERVOIR'),
    ], dimensions: [
      Hd(0, 1800, 0, -15, '1800'), Vd(0, 1400, 0, -15, '1400'),
      Hd(500, 1300, 400, -10, '800 FAN SPACING'),
    ], centerMarks: [Cm(500, 400), Cm(1300, 400)],
      datumRefs: [Dr('A', 0, 1400, 'down')] },
    { label: 'SIDE VIEW', viewType: 'side', width_mm: 1400, height_mm: 2000, shapes: [
      R(0, 0, 1400, 2000, undefined, 'thick'),
      Xh(0, 0, 40, 2000), Xh(1360, 0, 40, 2000), // insulation
      R(40, 40, 1320, 1920, '#f8f8f8'), // interior
      // Heating elements (side-mounted)
      R(60, 400, 30, 600, '#ffd0d0'), R(1310, 400, 30, 600, '#ffd0d0'),
      Tx(75, 700, 'HTR', true), Tx(1325, 700, 'HTR', true),
      // Module positions
      Li(200, 500, 200, 1600), Li(500, 500, 500, 1600),
      Li(900, 500, 900, 1600), Li(1200, 500, 1200, 1600),
      Tx(700, 1050, 'MODULES (VERTICAL)'),
    ], dimensions: [
      Hd(0, 1400, 0, -15, '1400 DEPTH'), Vd(0, 2000, 0, -20, '2000'),
      Hd(0, 40, 2000, 15, '40 INSUL.'),
      Hd(200, 500, 500, -10, '300 MODULE PITCH'),
    ], centerMarks: [],
      datumRefs: [Dr('A', 0, 2000, 'down')] },
    { label: 'SECTION A-A', viewType: 'section', width_mm: 1800, height_mm: 2000, shapes: [
      R(0, 0, 1800, 2000, undefined, 'thick'),
      Xh(0, 0, 40, 2000), Xh(1760, 0, 40, 2000),
      Xh(0, 0, 1800, 40), Xh(0, 1960, 1800, 40),
      R(40, 40, 1720, 1920, '#f8f8f8'),
      // Circulation fans at top
      Ci(600, 150, 80, undefined, 'dashed'), Ci(1200, 150, 80, undefined, 'dashed'),
      Tx(900, 150, 'CIRCULATION FANS ×2'),
      // Heating elements
      R(100, 400, 40, 1200, '#ffd0d0'), R(1660, 400, 40, 1200, '#ffd0d0'),
      Tx(120, 1000, 'HTR 3kW'), Tx(1680, 1000, 'HTR 3kW'),
      // Water tray at bottom
      R(200, 1800, 1400, 120, '#d0e8ff'), Tx(900, 1860, 'WATER TRAY / HUMIDIFIER'),
    ], dimensions: [
      Hd(0, 40, 0, -10, '40'), Vd(0, 40, 0, -10, '40'),
      Vd(400, 1600, 1800, 15, '1200 HTR LENGTH'),
    ], centerMarks: [Cm(600, 150), Cm(1200, 150)],
      datumRefs: [] },
  ],
  bom: [
    { item: 1, partNo: 'DHC-CB-01', description: 'Chamber body 1800×1400×2000', material: 'SS304/PU 40mm', qty: 1 },
    { item: 2, partNo: 'DHC-HT-01', description: 'Finned strip heater 3kW', material: 'Incoloy 800', qty: 3 },
    { item: 3, partNo: 'DHC-FN-01', description: 'Circulation fan Ø300mm', material: 'SS304', qty: 2 },
    { item: 4, partNo: 'DHC-HM-01', description: 'Water tray humidifier 1400×800', material: 'SS304', qty: 1 },
    { item: 5, partNo: 'DHC-TP-01', description: 'Temp/humidity sensor Pt100+cap', material: '—', qty: 2 },
    { item: 6, partNo: 'DHC-DR-01', description: 'Condensate drain valve ½"', material: 'SS316', qty: 2 },
  ],
  revisions: [{ rev: 'A', date: '2026-03-28', description: 'Initial release', by: 'AI' }],
  notes: [
    '1. CONDITIONS: 85°C ±2°C / 85% ±5% RH, 1000 hrs (IEC 61215 MQT 13)',
    '2. HEATING: 3× FINNED STRIP 3kW, INCOLOY 800',
    '3. HUMIDITY: WATER TRAY WITH IMMERSION HEATERS',
    '4. CIRCULATION: 2× Ø300mm FANS, SS304 IMPELLER',
    '5. INSULATION: 40mm PU FOAM, λ ≤ 0.025 W/(m·K)',
    '6. ALL INTERNAL SURFACES: SS304 ELECTROPOLISHED',
  ],
};

// ── 7. PV Module IV Curve Tracer ────────────────────────────────────────────
const pvModuleIVTracer: IECDrawingData = {
  id: 'iec_pv_module_iv_tracer',
  generalTolerances: '±0.5 unless noted',
  titleBlock: {
    partNo: 'SS-IEC-IVT-001', drawingNo: 'DWG-IVT-001', name: 'PV Module IV Curve Tracer',
    scale: '1:10', material: 'Steel / Optical Bench', standard: 'IEC 60904-1 / IEC 60904-9',
    rev: 'A', date: '2026-03-28', drawnBy: 'ShilpaSutra AI', checkedBy: '—',
    approvedBy: '—', sheet: '1 of 1', project: 'ShilpaSutra PV Lab',
    surfaceFinish: 'Powder-coated enclosure', weight: '≈25 kg',
  },
  views: [
    { label: 'FRONT VIEW', viewType: 'front', width_mm: 600, height_mm: 400, shapes: [
      R(0, 0, 600, 400, undefined, 'thick'), // enclosure
      R(30, 30, 540, 200, '#f0f0f0'), // front panel
      // Kelvin 4-wire terminals
      Ci(100, 100, 12), Ci(200, 100, 12), Ci(400, 100, 12), Ci(500, 100, 12),
      Tx(100, 130, 'V+'), Tx(200, 130, 'I+'), Tx(400, 130, 'I−'), Tx(500, 130, 'V−'),
      Tx(300, 80, 'KELVIN 4-WIRE'),
      // Display
      R(100, 170, 400, 50, '#d0e0ff'), Tx(300, 195, 'LCD DISPLAY'),
      // Reference cell connector
      Ci(550, 300, 10), Tx(540, 330, 'REF CELL'),
      // Shunt resistor indicator
      R(50, 280, 200, 60, '#ffe0e0'), Tx(150, 310, 'SHUNT RESISTOR\n0.001Ω ±0.1%'),
    ], dimensions: [
      Hd(0, 600, 0, -20, '600', '±1'), Vd(0, 400, 0, -20, '400', '±1'),
      Hd(100, 200, 100, -15, '100'), Hd(200, 400, 100, -15, '200'),
      Hd(400, 500, 100, -15, '100'),
    ], centerMarks: [Cm(100,100), Cm(200,100), Cm(400,100), Cm(500,100), Cm(550,300)],
      datumRefs: [Dr('A', 0, 400, 'down')] },
    { label: 'TOP VIEW', viewType: 'top', width_mm: 600, height_mm: 300, shapes: [
      R(0, 0, 600, 300, undefined, 'thick'),
      Li(300, 0, 300, 300, 'center'), Li(0, 150, 600, 150, 'center'),
      // Ventilation slots
      R(200, 10, 200, 5), R(200, 20, 200, 5), R(200, 30, 200, 5),
      Tx(300, 50, 'VENT SLOTS'),
      // USB/RS485 connectors
      R(520, 100, 60, 20, '#e0e0e0'), Tx(550, 140, 'USB'),
      R(520, 170, 60, 20, '#e0e0e0'), Tx(550, 210, 'RS485'),
    ], dimensions: [
      Hd(0, 600, 0, -15, '600'), Vd(0, 300, 0, -15, '300'),
    ], centerMarks: [],
      datumRefs: [] },
    { label: 'SIDE VIEW', viewType: 'side', width_mm: 300, height_mm: 400, shapes: [
      R(0, 0, 300, 400, undefined, 'thick'),
      R(20, 20, 260, 360, '#f8f8f8', 'dashed'), // internal PCB area
      // Heat sink fins at rear
      R(270, 50, 30, 300, '#d0d0d0'),
      Tx(285, 200, 'HEATSINK'),
      // Fan
      Ci(150, 350, 30, undefined, 'dashed'), Tx(150, 350, 'FAN'),
    ], dimensions: [
      Hd(0, 300, 0, -15, '300 DEPTH'), Vd(0, 400, 0, -15, '400'),
    ], centerMarks: [Cm(150, 350)],
      datumRefs: [] },
    { label: 'SECTION A-A', viewType: 'section', width_mm: 600, height_mm: 400, shapes: [
      R(0, 0, 600, 400, undefined, 'thick'),
      Xh(0, 0, 10, 400), Xh(590, 0, 10, 400), // enclosure walls
      // Shunt resistor (internal)
      R(50, 250, 200, 80, '#ffe0e0'), Tx(150, 290, 'SHUNT 0.001Ω'),
      // Main PCB
      R(30, 150, 540, 5, '#90c090'), Tx(300, 140, 'MAIN PCB'),
      // MOSFET load bank
      R(350, 250, 200, 80, '#e0e0e0'), Tx(450, 290, 'MOSFET LOAD'),
      // Power terminals at top
      Ci(100, 50, 10), Ci(200, 50, 10), Ci(400, 50, 10), Ci(500, 50, 10),
    ], dimensions: [
      Vd(150, 250, 600, 15, '100 PCB-SHUNT'),
    ], centerMarks: [Cm(100,50), Cm(200,50), Cm(400,50), Cm(500,50)],
      datumRefs: [] },
  ],
  bom: [
    { item: 1, partNo: 'IVT-EN-01', description: 'Enclosure 600×300×400', material: 'Steel 1.5mm', qty: 1 },
    { item: 2, partNo: 'IVT-SH-01', description: 'Current shunt 0.001Ω ±0.1%', material: 'Manganin', qty: 1 },
    { item: 3, partNo: 'IVT-TM-01', description: 'Kelvin terminal block 4-wire', material: 'Brass/Au plated', qty: 2 },
    { item: 4, partNo: 'IVT-ML-01', description: 'MOSFET electronic load 20A/100V', material: '—', qty: 1 },
    { item: 5, partNo: 'IVT-RC-01', description: 'Reference cell mount bracket', material: 'Al 6063', qty: 1 },
    { item: 6, partNo: 'IVT-PC-01', description: 'Main PCB with ADC/DAC', material: 'FR4', qty: 1 },
  ],
  revisions: [{ rev: 'A', date: '2026-03-28', description: 'Initial release', by: 'AI' }],
  notes: [
    '1. VOLTAGE RANGE: 0–100V DC, ACCURACY ±0.5% (IEC 60904-1)',
    '2. CURRENT RANGE: 0–20A DC, KELVIN 4-WIRE CONNECTION',
    '3. SHUNT: MANGANIN 0.001Ω ±0.1%, TCR <15 ppm/°C',
    '4. REFERENCE CELL: 100×100mm CALIBRATED Si, MOUNTED COPLANAR',
    '5. DATA RATE: 1000 POINTS/SWEEP, 10ms SWEEP TIME',
    '6. COMPLIANCE: IEC 60904-1 AND IEC 60904-9 CLASS AAA',
  ],
};

// ── 8. EL Imaging System ────────────────────────────────────────────────────
const elImagingSystem: IECDrawingData = {
  id: 'iec_el_imaging_system',
  generalTolerances: '±0.5 unless noted',
  titleBlock: {
    partNo: 'SS-IEC-ELI-001', drawingNo: 'DWG-ELI-001', name: 'EL Imaging System',
    scale: '1:20', material: 'Blackout Steel / Aluminium', standard: 'IEC TS 60904-13',
    rev: 'A', date: '2026-03-28', drawnBy: 'ShilpaSutra AI', checkedBy: '—',
    approvedBy: '—', sheet: '1 of 1', project: 'ShilpaSutra PV Lab',
    surfaceFinish: 'Matte black powder coat interior', weight: '≈180 kg',
  },
  views: [
    { label: 'FRONT VIEW', viewType: 'front', width_mm: 2500, height_mm: 600, shapes: [
      R(0, 0, 2500, 600, '#1a1a1a', 'thick'), // dark enclosure
      R(50, 50, 2400, 40, '#303030'), // module support rail
      Tx(1250, 70, 'MODULE SUPPORT RAIL'),
      R(1050, 200, 400, 250, '#303030'), // camera body
      Ci(1250, 350, 40, '#404040'), // lens
      Tx(1250, 480, 'InGaAs CAMERA'),
      // LED array positions
      R(100, 150, 300, 20, '#404040'), R(2100, 150, 300, 20, '#404040'),
      Tx(250, 140, 'LED ARRAY L'), Tx(2250, 140, 'LED ARRAY R'),
      Li(1250, 0, 1250, 600, 'center'),
    ], dimensions: [
      Hd(0, 2500, 0, -20, '2500', '±3'), Vd(0, 600, 0, -20, '600', '±2'),
      Hd(1050, 1450, 200, -15, '400 CAMERA'),
      Vd(50, 90, 2500, 15, '40 MODULE RAIL'),
    ], centerMarks: [Cm(1250, 350)],
      datumRefs: [Dr('A', 0, 600, 'down'), Dr('B', 1250, 0, 'up')] },
    { label: 'TOP VIEW', viewType: 'top', width_mm: 2500, height_mm: 1500, shapes: [
      R(0, 0, 2500, 1500, '#1a1a1a', 'thick'),
      R(50, 50, 2400, 40, '#303030'), // module
      Tx(1250, 70, 'DUT MODULE'),
      R(1050, 600, 400, 300, '#303030'), // camera
      Tx(1250, 750, 'CAMERA'),
      // Dark room frame corners
      R(0, 0, 50, 50, '#303030'), R(2450, 0, 50, 50, '#303030'),
      R(0, 1450, 50, 50, '#303030'), R(2450, 1450, 50, 50, '#303030'),
      // DC injection block
      R(2200, 1200, 250, 200, '#404040'), Tx(2325, 1300, 'DC INJECT\n0–15A'),
      Li(1250, 0, 1250, 1500, 'center'), Li(0, 750, 2500, 750, 'center'),
    ], dimensions: [
      Hd(0, 2500, 0, -15, '2500'), Vd(0, 1500, 0, -15, '1500'),
      Hd(1050, 1450, 600, -10, '400'), Vd(600, 900, 1450, 15, '300 CAMERA BODY'),
    ], centerMarks: [],
      datumRefs: [Dr('A', 0, 1500, 'down')] },
    { label: 'SIDE VIEW', viewType: 'side', width_mm: 1500, height_mm: 600, shapes: [
      R(0, 0, 1500, 600, '#1a1a1a', 'thick'),
      R(50, 50, 1400, 40, '#303030'), // module edge
      Tx(750, 70, 'MODULE (EDGE)'),
      // Camera on adjustable rail
      R(600, 200, 300, 250, '#303030'), Ci(750, 350, 40, '#404040'),
      Li(750, 90, 750, 200, 'dashed'), // camera-to-module distance
      Tx(750, 480, 'CAMERA ARM'),
      // Light baffles
      Li(200, 0, 200, 600, 'dashed'), Li(1300, 0, 1300, 600, 'dashed'),
      Tx(200, 590, 'BAFFLE'), Tx(1300, 590, 'BAFFLE'),
    ], dimensions: [
      Hd(0, 1500, 0, -15, '1500 DEPTH'), Vd(0, 600, 0, -15, '600'),
      Vd(90, 200, 1500, 15, '110–310 ADJ.'),
    ], centerMarks: [Cm(750, 350)],
      datumRefs: [] },
    { label: 'SECTION A-A', viewType: 'section', width_mm: 2500, height_mm: 600, shapes: [
      R(0, 0, 2500, 600, '#1a1a1a', 'thick'),
      Xh(0, 0, 20, 600), Xh(2480, 0, 20, 600), // walls
      R(50, 50, 2400, 40, '#404040'), // module
      R(1050, 200, 400, 250, '#505050'), // camera
      Ci(1250, 350, 35, '#606060'), // lens
      // Module support structure
      R(200, 90, 50, 510, '#303030'), R(2250, 90, 50, 510, '#303030'),
      Tx(225, 300, 'SUPPORT'), Tx(2275, 300, 'SUPPORT'),
    ], dimensions: [
      Hd(0, 20, 0, -10, '20 WALL'),
      Vd(50, 90, 2500, 15, '40 MODULE'),
    ], centerMarks: [Cm(1250, 350)],
      datumRefs: [] },
  ],
  bom: [
    { item: 1, partNo: 'ELI-FR-01', description: 'Dark room frame 2500×1500×600', material: 'Steel 2mm', qty: 1 },
    { item: 2, partNo: 'ELI-CA-01', description: 'InGaAs camera 1024×1024px', material: '—', qty: 1 },
    { item: 3, partNo: 'ELI-LD-01', description: 'LED array 300mm strip', material: 'IR LED 940nm', qty: 2 },
    { item: 4, partNo: 'ELI-RL-01', description: 'Module support rail 2400mm', material: 'Al 6063-T5', qty: 2 },
    { item: 5, partNo: 'ELI-DC-01', description: 'DC injection block 0–15A', material: 'Cu bus bar', qty: 1 },
    { item: 6, partNo: 'ELI-BF-01', description: 'Light baffle panel', material: 'Black anodised Al', qty: 4 },
  ],
  revisions: [{ rev: 'A', date: '2026-03-28', description: 'Initial release', by: 'AI' }],
  notes: [
    '1. ENCLOSURE: LIGHT-TIGHT BLACKOUT, <0.01 lux INTERNAL',
    '2. CAMERA: InGaAs 1024×1024px, 900–1700nm (IEC TS 60904-13)',
    '3. DC INJECTION: 0–15A, FORWARD BIAS ISC',
    '4. CAMERA HEIGHT: 200–400mm ADJUSTABLE VIA RAIL',
    '5. BAFFLES: LIGHT-TRAP VENTILATION, 4× PANELS',
    '6. INTERIOR: MATTE BLACK POWDER COAT, <5% REFLECTANCE',
  ],
};

// ── 9. Flash Solar Simulator ────────────────────────────────────────────────
const flashSolarSimulator: IECDrawingData = {
  id: 'iec_flash_solar_simulator',
  generalTolerances: '±0.5 unless noted',
  titleBlock: {
    partNo: 'SS-IEC-FSS-001', drawingNo: 'DWG-FSS-001', name: 'Flash Solar Simulator',
    scale: '1:20', material: 'Steel / Optical components', standard: 'IEC 60904-9',
    rev: 'A', date: '2026-03-28', drawnBy: 'ShilpaSutra AI', checkedBy: '—',
    approvedBy: '—', sheet: '1 of 1', project: 'ShilpaSutra PV Lab',
    surfaceFinish: 'Matt black interior, powder-coated exterior', weight: '≈450 kg',
  },
  views: [
    { label: 'FRONT VIEW', viewType: 'front', width_mm: 2200, height_mm: 2500, shapes: [
      // Lamp housing at top
      R(200, 0, 1800, 600, undefined, 'thick'),
      // 4 xenon lamps
      Ci(500, 200, 50), Ci(900, 200, 50), Ci(1300, 200, 50), Ci(1700, 200, 50),
      Tx(1100, 200, '4× XENON FLASH'),
      // Collimator/optics
      R(300, 600, 1600, 200, '#e0e0e0'), Tx(1100, 700, 'COLLIMATOR OPTICS'),
      // Test plane / bench
      R(0, 1400, 2200, 50, undefined, 'thick'), // bench surface
      R(100, 1450, 2000, 1000, '#f0f0f0', 'dashed'), // bench frame
      R(300, 1350, 1600, 40, '#dbeafe'), // DUT module
      Tx(1100, 1370, 'DUT MODULE'),
      // Reference cell
      Ci(200, 1380, 15), Tx(200, 1410, 'REF CELL'),
      Li(1100, 0, 1100, 2500, 'center'),
    ], dimensions: [
      Hd(0, 2200, 1400, -35, '2200', '±3'), Vd(0, 2500, 0, -25, '2500'),
      Hd(200, 2000, 0, -15, '1800 LAMP HOUSING'),
      Vd(0, 600, 2200, 15, '600 LAMP ZONE'),
      Vd(600, 800, 2200, 30, '200 COLLIMATOR'),
      Vd(800, 1400, 2200, 45, '600 LIGHT PATH'),
      Hd(500, 900, 200, 15, '400 LAMP PITCH'),
    ], centerMarks: [Cm(500,200), Cm(900,200), Cm(1300,200), Cm(1700,200), Cm(200,1380)],
      datumRefs: [Dr('A', 0, 1400, 'down'), Dr('B', 1100, 0, 'up')] },
    { label: 'TOP VIEW', viewType: 'top', width_mm: 2200, height_mm: 1600, shapes: [
      R(0, 0, 2200, 1600, undefined, 'thick'),
      // Uniformity zones (3×3 grid)
      R(200, 100, 600, 466, '#f0f8ff', 'dashed'), R(800, 100, 600, 466, '#f0f8ff', 'dashed'),
      R(1400, 100, 600, 466, '#f0f8ff', 'dashed'),
      R(200, 566, 600, 468, '#f0f8ff', 'dashed'), R(800, 566, 600, 468, '#f0f8ff', 'dashed'),
      R(1400, 566, 600, 468, '#f0f8ff', 'dashed'),
      R(200, 1034, 600, 466, '#f0f8ff', 'dashed'), R(800, 1034, 600, 466, '#f0f8ff', 'dashed'),
      R(1400, 1034, 600, 466, '#f0f8ff', 'dashed'),
      Tx(1100, 800, 'UNIFORMITY ZONES 3×3'),
      // Reference cell plane
      Ci(200, 200, 15), Tx(200, 230, 'REF'),
      Li(1100, 0, 1100, 1600, 'center'), Li(0, 800, 2200, 800, 'center'),
    ], dimensions: [
      Hd(0, 2200, 0, -15, '2200'), Vd(0, 1600, 0, -15, '1600'),
      Hd(200, 800, 100, -10, '600 ZONE'), Vd(100, 566, 200, -10, '466 ZONE'),
    ], centerMarks: [Cm(200, 200)],
      datumRefs: [Dr('A', 0, 1600, 'down')] },
    { label: 'SIDE VIEW', viewType: 'side', width_mm: 1600, height_mm: 2500, shapes: [
      R(200, 0, 1200, 600, undefined, 'thick'), // lamp housing
      R(300, 600, 1000, 200, '#e0e0e0'), // collimator
      R(0, 1400, 1600, 50, undefined, 'thick'), // bench
      R(50, 1450, 1500, 1000, '#f0f0f0'), // bench frame
      // Light path
      Li(800, 800, 200, 1350, 'dashed'), Li(800, 800, 1400, 1350, 'dashed'),
      Tx(800, 1100, 'LIGHT CONE'),
      Li(800, 0, 800, 2500, 'center'),
    ], dimensions: [
      Hd(0, 1600, 1400, -20, '1600 DEPTH'), Vd(0, 2500, 0, -20, '2500'),
      Vd(0, 600, 1600, 15, '600'), Vd(600, 800, 1600, 15, '200'),
      Vd(800, 1400, 1600, 15, '600 WORKING DIST.'),
    ], centerMarks: [],
      datumRefs: [Dr('A', 0, 1400, 'down')] },
  ],
  bom: [
    { item: 1, partNo: 'FSS-LH-01', description: 'Lamp housing 1800×1200×600', material: 'Steel 2mm', qty: 1 },
    { item: 2, partNo: 'FSS-XL-01', description: 'Xenon flash lamp 3kW', material: 'Quartz/Xe', qty: 4 },
    { item: 3, partNo: 'FSS-CO-01', description: 'Collimator lens assembly', material: 'BK7 glass', qty: 4 },
    { item: 4, partNo: 'FSS-TB-01', description: 'Test bench 2200×1600', material: 'Steel/Al', qty: 1 },
    { item: 5, partNo: 'FSS-RC-01', description: 'Reference cell Si calibrated', material: 'c-Si', qty: 1 },
    { item: 6, partNo: 'FSS-PS-01', description: 'Flash power supply 12kW', material: '—', qty: 1 },
    { item: 7, partNo: 'FSS-RF-01', description: 'Parabolic reflector Ø300', material: 'Al polished', qty: 4 },
  ],
  revisions: [{ rev: 'A', date: '2026-03-28', description: 'Initial release', by: 'AI' }],
  notes: [
    '1. CLASS: AAA PER IEC 60904-9 (SPECTRAL, SPATIAL, TEMPORAL)',
    '2. LAMPS: 4× XENON FLASH 3kW, PULSE 1–10ms',
    '3. UNIFORMITY: ±2% OVER 2000×1300mm TEST PLANE',
    '4. SPECTRAL MATCH: 0.75–1.25 FOR ALL 6 INTERVALS',
    '5. WORKING DISTANCE: 600mm LAMP-TO-DUT',
    '6. REFERENCE CELL: CALIBRATED Si, COPLANAR WITH DUT',
  ],
};

// ── 10. Bypass Diode Tester ─────────────────────────────────────────────────
const bypassDiodeTester: IECDrawingData = {
  id: 'iec_bypass_diode_tester',
  generalTolerances: '±0.5 unless noted',
  titleBlock: {
    partNo: 'SS-IEC-BDT-001', drawingNo: 'DWG-BDT-001', name: 'Bypass Diode Thermal Test Fixture',
    scale: '1:5', material: 'Insulated Steel / Brass', standard: 'IEC 61215 MQT 18',
    rev: 'A', date: '2026-03-28', drawnBy: 'ShilpaSutra AI', checkedBy: '—',
    approvedBy: '—', sheet: '1 of 1', project: 'ShilpaSutra PV Lab',
    surfaceFinish: 'Powder-coated enclosure', weight: '≈18 kg',
  },
  views: [
    { label: 'FRONT VIEW', viewType: 'front', width_mm: 800, height_mm: 600, shapes: [
      R(100, 200, 600, 300, undefined, 'thick'), // test box
      // Thermal camera on arm
      Li(400, 0, 400, 200), // arm
      R(250, 0, 300, 150, '#404040'), // IR camera body
      Ci(400, 130, 25, '#505050'), // lens
      Tx(400, 60, 'IR CAMERA'),
      // Terminals
      Ci(130, 250, 10), Ci(130, 300, 10), Ci(130, 350, 10), Ci(130, 400, 10),
      Tx(110, 250, 'T1'), Tx(110, 300, 'T2'), Tx(110, 350, 'T3'), Tx(110, 400, 'T4'),
      // Heat sink at bottom
      R(200, 500, 400, 80, '#d0d0d0'), Tx(400, 540, 'HEAT SINK'),
      // Forward bias circuit
      R(720, 250, 200, 200, '#e0f0e0'), Tx(820, 350, 'FORWARD\nBIAS\nCIRCUIT\n20A'),
    ], dimensions: [
      Hd(100, 700, 200, -15, '600 TEST BOX'), Vd(200, 500, 100, -15, '300'),
      Hd(250, 550, 0, -10, '300 CAMERA'), Vd(0, 150, 250, -10, '150 CAM'),
      Vd(500, 580, 700, 15, '80 HEATSINK'),
    ], centerMarks: [Cm(400,130), Cm(130,250), Cm(130,300), Cm(130,350), Cm(130,400)],
      datumRefs: [Dr('A', 100, 500, 'down')] },
    { label: 'TOP VIEW', viewType: 'top', width_mm: 800, height_mm: 500, shapes: [
      R(100, 50, 600, 400, undefined, 'thick'), // test box
      Li(400, 0, 400, 500, 'center'), Li(100, 250, 700, 250, 'center'),
      // Diode positions inside box (3 typical bypass diodes)
      R(200, 150, 80, 40, '#ffe0e0'), R(360, 150, 80, 40, '#ffe0e0'), R(520, 150, 80, 40, '#ffe0e0'),
      Tx(240, 170, 'D1'), Tx(400, 170, 'D2'), Tx(560, 170, 'D3'),
      // Thermocouple positions
      Ci(240, 220, 5), Ci(400, 220, 5), Ci(560, 220, 5),
      Tx(240, 240, 'TC'), Tx(400, 240, 'TC'), Tx(560, 240, 'TC'),
    ], dimensions: [
      Hd(100, 700, 50, -15, '600'), Vd(50, 450, 100, -15, '400'),
      Hd(200, 360, 150, -10, '160 DIODE PITCH'),
    ], centerMarks: [Cm(240,170), Cm(400,170), Cm(560,170)],
      datumRefs: [] },
    { label: 'SIDE VIEW', viewType: 'side', width_mm: 500, height_mm: 600, shapes: [
      R(50, 200, 400, 300, undefined, 'thick'), // test box
      R(50, 500, 400, 80, '#d0d0d0'), // heat sink
      // Camera arm
      Li(250, 0, 250, 200),
      R(100, 0, 300, 150, '#404040'), Ci(250, 130, 25, '#505050'),
      // Cable exit
      R(420, 300, 50, 50, '#e0e0e0'), Tx(445, 325, 'CABLE\nEXIT'),
    ], dimensions: [
      Hd(50, 450, 200, -15, '400 DEPTH'), Vd(200, 500, 50, -15, '300'),
      Vd(0, 200, 450, 15, '200 CAM ARM'),
    ], centerMarks: [Cm(250, 130)],
      datumRefs: [] },
    { label: 'SECTION A-A', viewType: 'section', width_mm: 800, height_mm: 600, shapes: [
      R(100, 200, 600, 300, undefined, 'thick'),
      Xh(100, 200, 20, 300), Xh(680, 200, 20, 300), // walls
      // Diode on substrate
      R(250, 300, 80, 30, '#ffe0e0'), R(370, 300, 80, 30, '#ffe0e0'), R(490, 300, 80, 30, '#ffe0e0'),
      // Heat sink fins
      R(200, 500, 400, 10), R(200, 515, 400, 10), R(200, 530, 400, 10),
      R(200, 545, 400, 10), R(200, 560, 400, 10),
      Tx(400, 540, 'Al HEAT SINK FINS'),
      // Thermal paste
      R(200, 490, 400, 10, '#ffe8d0'), Tx(400, 495, 'THERMAL PASTE'),
    ], dimensions: [
      Hd(100, 120, 200, -10, '20 WALL'),
      Vd(300, 330, 700, 15, '30 DIODE'),
    ], centerMarks: [],
      datumRefs: [] },
  ],
  bom: [
    { item: 1, partNo: 'BDT-BX-01', description: 'Test box 600×400×300', material: 'Steel 1.5mm insulated', qty: 1 },
    { item: 2, partNo: 'BDT-IR-01', description: 'IR thermal camera FLIR', material: '—', qty: 1 },
    { item: 3, partNo: 'BDT-AM-01', description: 'Camera arm adjustable ±150mm', material: 'Al tube', qty: 1 },
    { item: 4, partNo: 'BDT-HS-01', description: 'Heat sink 400×300 finned', material: 'Al 6063', qty: 1 },
    { item: 5, partNo: 'BDT-FB-01', description: 'Forward bias circuit 20A', material: 'PCB/MOSFET', qty: 1 },
    { item: 6, partNo: 'BDT-TC-01', description: 'K-type thermocouple', material: 'NiCr/NiAl', qty: 4 },
  ],
  revisions: [{ rev: 'A', date: '2026-03-28', description: 'Initial release', by: 'AI' }],
  notes: [
    '1. TEST CURRENT: 1.25× ISC, MAX 20A (IEC 61215 MQT 18)',
    '2. IR CAMERA: ±2°C ACCURACY, 320×240px MINIMUM',
    '3. FORWARD BIAS CIRCUIT: CONSTANT CURRENT SOURCE',
    '4. THERMOCOUPLE: 4× K-TYPE SURFACE-MOUNT',
    '5. HEAT SINK: Al FINNED, THERMAL RESISTANCE <0.5°C/W',
    '6. TEST DURATION: 1 HOUR AT 1.25× ISC',
  ],
};

// ── 11. Wet Leakage Current Tester ──────────────────────────────────────────
const wetLeakageTester: IECDrawingData = {
  id: 'iec_wet_leakage_tester',
  generalTolerances: '±0.5 unless noted',
  titleBlock: {
    partNo: 'SS-IEC-WLT-001', drawingNo: 'DWG-WLT-001', name: 'Wet Leakage Current Tester',
    scale: '1:15', material: 'SS304 / HDPE', standard: 'IEC 61215 MQT 15 / IEC 61730 MST 17',
    rev: 'A', date: '2026-03-28', drawnBy: 'ShilpaSutra AI', checkedBy: '—',
    approvedBy: '—', sheet: '1 of 1', project: 'ShilpaSutra PV Lab',
    surfaceFinish: 'SS304 brushed, HDPE liner', weight: '≈140 kg',
  },
  views: [
    { label: 'FRONT VIEW', viewType: 'front', width_mm: 2200, height_mm: 400, shapes: [
      R(0, 0, 2200, 400, undefined, 'thick'), // water bath
      R(0, 300, 2200, 100, '#d0e8ff'), // water level
      Tx(1100, 350, 'WATER LEVEL 50–100mm'),
      R(100, 50, 2000, 200, '#dbeafe', 'dashed'), // module outline
      Tx(1100, 150, 'MODULE (DUT) SUBMERGED'),
      // HV cable entry
      R(2100, 100, 80, 50, '#ffe0e0'), Tx(2140, 125, 'HV'),
      // Safety interlock indicator
      Ci(50, 50, 15, '#ff0000'), Tx(50, 80, 'SAFETY\nINTERLOCK'),
      Li(1100, 0, 1100, 400, 'center'),
    ], dimensions: [
      Hd(0, 2200, 0, -20, '2200', '±3'), Vd(0, 400, 0, -20, '400', '±1'),
      Hd(100, 2100, 50, -10, '2000 MODULE ZONE'),
      Vd(300, 400, 2200, 15, '100 WATER DEPTH'),
    ], centerMarks: [Cm(50, 50)],
      datumRefs: [Dr('A', 0, 400, 'down')] },
    { label: 'TOP VIEW', viewType: 'top', width_mm: 2200, height_mm: 1200, shapes: [
      R(0, 0, 2200, 1200, undefined, 'thick'),
      R(100, 100, 2000, 1000, '#dbeafe', 'dashed'), // module
      Tx(1100, 600, 'MODULE (DUT)'),
      // Electrode grid
      Li(200, 200, 200, 1000, 'dashed'), Li(600, 200, 600, 1000, 'dashed'),
      Li(1000, 200, 1000, 1000, 'dashed'), Li(1400, 200, 1400, 1000, 'dashed'),
      Li(1800, 200, 1800, 1000, 'dashed'),
      Li(200, 200, 1800, 200, 'dashed'), Li(200, 600, 1800, 600, 'dashed'),
      Li(200, 1000, 1800, 1000, 'dashed'),
      Tx(1100, 180, 'ELECTRODE GRID 400mm PITCH'),
      // HV cable routing
      Li(2100, 600, 2200, 600, 'thick'), Tx(2160, 580, 'HV CABLE'),
      Li(1100, 0, 1100, 1200, 'center'), Li(0, 600, 2200, 600, 'center'),
    ], dimensions: [
      Hd(0, 2200, 0, -15, '2200'), Vd(0, 1200, 0, -15, '1200'),
      Hd(200, 600, 200, -10, '400 GRID PITCH'),
      Vd(200, 600, 200, -10, '400 GRID PITCH'),
    ], centerMarks: [],
      datumRefs: [Dr('A', 0, 1200, 'down')] },
    { label: 'SIDE VIEW', viewType: 'side', width_mm: 1200, height_mm: 400, shapes: [
      R(0, 0, 1200, 400, undefined, 'thick'),
      R(0, 300, 1200, 100, '#d0e8ff'), // water
      R(100, 50, 1000, 200, '#dbeafe', 'dashed'), // module edge
      Tx(600, 150, 'MODULE (EDGE)'),
      // Drain
      R(1100, 350, 80, 50), Tx(1140, 375, 'DRAIN'),
    ], dimensions: [
      Hd(0, 1200, 0, -15, '1200 DEPTH'), Vd(0, 400, 0, -15, '400'),
    ], centerMarks: [],
      datumRefs: [] },
    { label: 'SECTION A-A', viewType: 'section', width_mm: 2200, height_mm: 400, shapes: [
      R(0, 0, 2200, 400, undefined, 'thick'),
      Xh(0, 0, 15, 400), Xh(2185, 0, 15, 400), // walls
      Xh(0, 385, 2200, 15), // floor
      R(0, 300, 2200, 85, '#d0e8ff'), // water
      R(100, 100, 2000, 30, '#dbeafe'), // module
      // Electrode wires in water
      Li(300, 300, 300, 385, 'dashed'), Li(700, 300, 700, 385, 'dashed'),
      Li(1100, 300, 1100, 385, 'dashed'), Li(1500, 300, 1500, 385, 'dashed'),
      Li(1900, 300, 1900, 385, 'dashed'),
      Tx(1100, 345, 'SS ELECTRODE GRID'),
      // HV connection
      Li(2100, 130, 2200, 130, 'thick'), Tx(2150, 120, 'HV 500V/1000V'),
    ], dimensions: [
      Hd(0, 15, 0, -10, '15 WALL'),
      Vd(100, 130, 2200, 15, '30 MODULE'),
      Vd(300, 385, 2200, 30, '85 WATER'),
    ], centerMarks: [],
      datumRefs: [] },
  ],
  bom: [
    { item: 1, partNo: 'WLT-BT-01', description: 'Water bath 2200×1200×400', material: 'SS304 2mm', qty: 1 },
    { item: 2, partNo: 'WLT-EG-01', description: 'Electrode grid SS mesh 400mm pitch', material: 'SS316 wire', qty: 1 },
    { item: 3, partNo: 'WLT-HV-01', description: 'HV power supply 0–1000V DC', material: '—', qty: 1 },
    { item: 4, partNo: 'WLT-SI-01', description: 'Safety interlock system', material: '—', qty: 1 },
    { item: 5, partNo: 'WLT-LN-01', description: 'HDPE liner 3mm', material: 'HDPE', qty: 1 },
    { item: 6, partNo: 'WLT-DR-01', description: 'Drain valve 1" BSP', material: 'SS316', qty: 1 },
    { item: 7, partNo: 'WLT-MA-01', description: 'Microammeter 0–10µA', material: '—', qty: 1 },
  ],
  revisions: [{ rev: 'A', date: '2026-03-28', description: 'Initial release', by: 'AI' }],
  notes: [
    '1. TEST VOLTAGE: 500V DC (IEC 61215) OR 1000V (IEC 61730 MST 17)',
    '2. LEAKAGE LIMIT: <50µA FOR SYSTEM VOLTAGE ≤1000V',
    '3. WATER: RESISTIVITY <3500 Ω·cm, SURFACTANT ADDED',
    '4. ELECTRODE: SS316 MESH GRID, 400mm PITCH',
    '5. SAFETY INTERLOCK: 2× LIMIT SWITCHES + E-STOP',
    '6. HV CABLE: DOUBLE-INSULATED, ROUTED IN CONDUIT',
  ],
};

// ── 12. Grounding Continuity Tester ─────────────────────────────────────────
const groundingContinuityTester: IECDrawingData = {
  id: 'iec_grounding_continuity',
  generalTolerances: '±0.5 unless noted',
  titleBlock: {
    partNo: 'SS-IEC-GCT-001', drawingNo: 'DWG-GCT-001', name: 'Grounding Continuity Test Fixture',
    scale: '1:5', material: 'Steel / Brass / Spring steel', standard: 'IEC 61730 MST 13',
    rev: 'A', date: '2026-03-28', drawnBy: 'ShilpaSutra AI', checkedBy: '—',
    approvedBy: '—', sheet: '1 of 1', project: 'ShilpaSutra PV Lab',
    surfaceFinish: 'Nickel plated contacts', weight: '≈8 kg',
  },
  views: [
    { label: 'FRONT VIEW', viewType: 'front', width_mm: 500, height_mm: 350, shapes: [
      R(0, 0, 500, 350, undefined, 'thick'), // enclosure
      // Probe array (4 spring-loaded probes)
      R(50, 30, 60, 120), R(160, 30, 60, 120), R(280, 30, 60, 120), R(390, 30, 60, 120),
      Ci(80, 30, 8), Ci(190, 30, 8), Ci(310, 30, 8), Ci(420, 30, 8), // probe tips
      Tx(80, 80, 'P1'), Tx(190, 80, 'P2'), Tx(310, 80, 'P3'), Tx(420, 80, 'P4'),
      // Ohmmeter display
      R(100, 180, 300, 80, '#d0e8ff'), Tx(250, 220, 'LOW-R OHMMETER\n0.001–1.000 Ω'),
      // Current source indicator
      R(50, 290, 180, 40, '#e0f0e0'), Tx(140, 310, '2A / 12V DC'),
      // Pass/Fail LED
      Ci(400, 310, 12, '#00cc00'), Tx(400, 340, 'PASS'),
      Ci(450, 310, 12, '#ff0000'), Tx(450, 340, 'FAIL'),
    ], dimensions: [
      Hd(0, 500, 0, -15, '500', '±1'), Vd(0, 350, 0, -15, '350', '±1'),
      Hd(50, 160, 30, -10, '110 PROBE PITCH'),
      Vd(30, 150, 50, -10, '120 PROBE'),
    ], centerMarks: [Cm(80,30), Cm(190,30), Cm(310,30), Cm(420,30)],
      datumRefs: [Dr('A', 0, 350, 'down')] },
    { label: 'TOP VIEW', viewType: 'top', width_mm: 500, height_mm: 250, shapes: [
      R(0, 0, 500, 250, undefined, 'thick'),
      Li(250, 0, 250, 250, 'center'), Li(0, 125, 500, 125, 'center'),
      // Probe positions (top view)
      Ci(80, 60, 10), Ci(190, 60, 10), Ci(310, 60, 10), Ci(420, 60, 10),
      Tx(250, 60, 'PROBE ARRAY'),
      // Cable exits
      R(450, 100, 50, 50, '#e0e0e0'), Tx(475, 125, 'CABLE'),
      // Spring mechanism visible
      R(60, 30, 40, 60, undefined, 'dashed'), R(170, 30, 40, 60, undefined, 'dashed'),
      R(290, 30, 40, 60, undefined, 'dashed'), R(400, 30, 40, 60, undefined, 'dashed'),
    ], dimensions: [
      Hd(0, 500, 0, -15, '500'), Vd(0, 250, 0, -15, '250'),
      Hd(80, 190, 60, 15, '110'), Hd(190, 310, 60, 15, '120'), Hd(310, 420, 60, 15, '110'),
    ], centerMarks: [Cm(80,60), Cm(190,60), Cm(310,60), Cm(420,60)],
      datumRefs: [] },
    { label: 'SIDE VIEW', viewType: 'side', width_mm: 250, height_mm: 350, shapes: [
      R(0, 0, 250, 350, undefined, 'thick'),
      // Contact force spring (cross section)
      R(80, 20, 40, 120, undefined, 'dashed'), // probe housing
      Li(100, 20, 100, 0), // probe tip extended
      Ci(100, 0, 6), // probe tip
      // Spring inside
      Li(90, 40, 110, 55), Li(110, 55, 90, 70), Li(90, 70, 110, 85),
      Li(110, 85, 90, 100), Li(90, 100, 110, 115),
      Tx(160, 70, 'CONTACT FORCE\nSPRING 5N ±10%'),
      // Internal PCB
      R(20, 180, 210, 5, '#90c090'), Tx(125, 175, 'PCB'),
    ], dimensions: [
      Hd(0, 250, 0, -15, '250 DEPTH'), Vd(0, 350, 0, -15, '350'),
      Vd(0, 20, 250, 15, '20 PROBE EXT.'),
      Vd(20, 140, 250, 30, '120 SPRING'),
    ], centerMarks: [Cm(100, 0)],
      datumRefs: [] },
    { label: 'SECTION A-A', viewType: 'section', width_mm: 500, height_mm: 350, shapes: [
      R(0, 0, 500, 350, undefined, 'thick'),
      Xh(0, 0, 10, 350), Xh(490, 0, 10, 350), // enclosure walls
      // Probe assemblies in section
      R(65, 20, 30, 130, '#e0e0e0'), R(175, 20, 30, 130, '#e0e0e0'),
      R(295, 20, 30, 130, '#e0e0e0'), R(405, 20, 30, 130, '#e0e0e0'),
      // Springs
      Ci(80, 80, 3), Ci(190, 80, 3), Ci(310, 80, 3), Ci(420, 80, 3),
      Tx(250, 80, 'SPRING-LOADED PROBES'),
      // PCB
      R(20, 180, 460, 5, '#90c090'),
      // Wiring
      Li(80, 150, 80, 180, 'dashed'), Li(190, 150, 190, 180, 'dashed'),
      Li(310, 150, 310, 180, 'dashed'), Li(420, 150, 420, 180, 'dashed'),
      // Current source
      R(50, 250, 150, 60, '#e0f0e0'), Tx(125, 280, '2A SOURCE'),
      // Kelvin sense
      R(300, 250, 150, 60, '#d0e8ff'), Tx(375, 280, 'SENSE ADC'),
    ], dimensions: [
      Hd(0, 10, 0, -10, '10 WALL'),
      Vd(20, 150, 500, 15, '130 PROBE ASSY'),
    ], centerMarks: [],
      datumRefs: [] },
  ],
  bom: [
    { item: 1, partNo: 'GCT-EN-01', description: 'Enclosure 500×250×350', material: 'Steel 1.2mm', qty: 1 },
    { item: 2, partNo: 'GCT-PR-01', description: 'Spring-loaded probe Ø8 tip', material: 'BeCu/Ni plated', qty: 4 },
    { item: 3, partNo: 'GCT-SP-01', description: 'Contact force spring 5N', material: 'Spring steel', qty: 4 },
    { item: 4, partNo: 'GCT-OH-01', description: 'Low-R ohmmeter 0.001–1Ω', material: '—', qty: 1 },
    { item: 5, partNo: 'GCT-CS-01', description: 'Constant current source 2A/12V', material: 'PCB', qty: 1 },
    { item: 6, partNo: 'GCT-PC-01', description: 'Main PCB with ADC', material: 'FR4', qty: 1 },
  ],
  revisions: [{ rev: 'A', date: '2026-03-28', description: 'Initial release', by: 'AI' }],
  notes: [
    '1. TEST CURRENT: 2× MODULE ISC OR 2A MIN (IEC 61730 MST 13)',
    '2. RESISTANCE LIMIT: <0.1Ω BETWEEN FRAME AND GROUND',
    '3. PROBE CONTACT FORCE: 5N ±10% SPRING-LOADED',
    '4. MEASUREMENT: 4-WIRE KELVIN SENSE, 0.001Ω RESOLUTION',
    '5. PROBES: NICKEL-PLATED BeCu, Ø8mm TIP',
    '6. TEST DURATION: 2 MINUTES PER BONDING POINT',
  ],
};

const DRAWINGS: IECDrawingData[] = [
  mechanicalLoadFixture,
  saltMistChamber,
  uvChamber,
  thermalCyclingChamber,
  humidityFreezeChamber,
  dampHeatChamber,
  pvModuleIVTracer,
  elImagingSystem,
  flashSolarSimulator,
  bypassDiodeTester,
  wetLeakageTester,
  groundingContinuityTester,
];

// ── Lookup ──────────────────────────────────────────────────────────────────
export function getIECDrawingData(templateId: string): IECDrawingData | null {
  return DRAWINGS.find(d => d.id === templateId) ?? null;
}

export function getAllIECDrawings(): IECDrawingData[] {
  return DRAWINGS;
}

export const IEC_DRAWING_IDS: string[] = DRAWINGS.map(d => d.id);
