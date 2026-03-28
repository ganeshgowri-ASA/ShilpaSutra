// ─── IEC / PV Template 2D Drawing Data ──────────────────────────────────────
// Defines front/top/section views for all IEC test-chamber and PV equipment
// templates. Coordinates are in actual mm; the renderer scales to fit.

export interface DrawingShape {
  type: 'rect' | 'line' | 'circle' | 'text';
  x: number; y: number;
  w?: number; h?: number;
  x2?: number; y2?: number;
  r?: number;
  label?: string;
  style?: 'solid' | 'dashed' | 'hidden' | 'thick';
  fill?: string;
}

export interface DrawingView {
  label: string;
  width_mm: number;
  height_mm: number;
  shapes: DrawingShape[];
}

export interface IECDrawingData {
  id: string;
  name: string;
  standard: string;
  partNo: string;
  material: string;
  scale: string;
  views: DrawingView[];
  notes: string[];
}

// ── Helper: rectangle shape ───────────────────────────────────────────────────
const R = (x: number, y: number, w: number, h: number, fill = 'none', style?: DrawingShape['style']): DrawingShape =>
  ({ type: 'rect', x, y, w, h, fill, style });
const L = (x: number, y: number, x2: number, y2: number, style?: DrawingShape['style']): DrawingShape =>
  ({ type: 'line', x, y, x2, y2, style });
const C = (x: number, y: number, r: number): DrawingShape =>
  ({ type: 'circle', x, y, r });
const T = (x: number, y: number, label: string): DrawingShape =>
  ({ type: 'text', x, y, label });

// ── Template Drawing Library ──────────────────────────────────────────────────
const DRAWINGS: IECDrawingData[] = [

  // 1. Mechanical Load Test Fixture
  {
    id: 'iec_mechanical_load_fixture', name: 'Mechanical Load Test Fixture',
    standard: 'IEC 61215 MQT 16', partNo: 'SS-IEC-MLF-001',
    material: 'SHS Steel S275 / Rubber', scale: '1:20',
    views: [
      { label: 'FRONT VIEW', width_mm: 2400, height_mm: 200, shapes: [
        R(0, 0, 2400, 200, '#e8f4fd', 'thick'),            // frame
        R(100, 60, 2200, 50, '#fef3c7'),                   // pressure bag
        R(200, 110, 2000, 35, '#dbeafe'),                  // module
        C(200, 30, 50), C(2200, 30, 50),                  // corner pins (circles = cylinders)
        L(0, 100, 2400, 100, 'dashed'),                   // frame midline
        T(1200, 80, 'INFLATABLE PRESSURE BAG'),
        T(1200, 125, 'TEST MODULE (DUT)'),
      ]},
      { label: 'TOP VIEW', width_mm: 2400, height_mm: 1300, shapes: [
        R(0, 0, 2400, 1300, '#e8f4fd', 'thick'),
        R(200, 150, 2000, 1000, '#dbeafe'),                // module footprint
        C(200, 150, 50), C(2200, 150, 50),                // pins NW NE
        C(200, 1150, 50), C(2200, 1150, 50),              // pins SW SE
        C(1200, 150, 50), C(1200, 1150, 50),              // edge pins N S
        C(200, 650, 50), C(2200, 650, 50),                // edge pins W E
        T(1200, 650, '2000 × 1000 MODULE ZONE'),
        R(2300, 0, 100, 200, '#fee2e2'),                  // transducer
        T(2350, 100, 'TRANSDUCER'),
      ]},
      { label: 'SECTION A-A', width_mm: 2000, height_mm: 400, shapes: [
        R(0, 200, 2000, 100, '#dbeafe'),                  // module
        R(0, 100, 2000, 100, '#fef3c7'),                  // pressure bag
        R(0, 0, 2000, 100, '#e8f4fd'),                    // top frame
        R(0, 300, 2000, 100, '#e8f4fd'),                  // bottom frame
        C(50, 200, 25), C(1950, 200, 25),                 // corner support pins
        T(1000, 150, '5400 Pa MAX LOAD'), T(1000, 250, 'MODULE'),
      ]},
    ],
    notes: ['1. TEST LOAD: ±5400 Pa UNIFORM PRESSURE (IEC 61215 MQT 16)',
      '2. FRAME: SHS 100×100×5mm STEEL S275', '3. SUPPORT PINS: 8× RUBBER-TIPPED Ø50mm',
      '4. PRESSURE BAG: INFLATABLE, 0–5400 Pa', '5. TOLERANCES: ±2mm'],
  },

  // 2. Hail Impact Test Rig
  {
    id: 'iec_hail_impact_rig', name: 'Hail Impact Test Rig',
    standard: 'IEC 61215 MQT 8', partNo: 'SS-IEC-HAI-001',
    material: 'Structural Steel', scale: '1:25',
    views: [
      { label: 'FRONT VIEW', width_mm: 700, height_mm: 3200, shapes: [
        R(250, 0, 200, 3000, '#e8f4fd', 'thick'),          // tower / guide tube
        C(350, 100, 50),                                   // steel ball at top
        R(0, 0, 700, 3000, 'none', 'dashed'),             // safety cage outline
        R(50, 2800, 600, 50, '#e8f4fd'),                  // tilted table (simplified)
        L(0, 0, 700, 0), L(0, 3000, 700, 3000),          // cage top/bottom rails
        T(350, 3100, 'SAFETY CAGE 600×600×3000mm'),
        T(350, 50, 'STEEL BALL Ø25 / 227g'),
      ]},
      { label: 'SECTION A-A', width_mm: 700, height_mm: 500, shapes: [
        R(250, 0, 200, 300, '#dbeafe'),                   // guide tube
        C(350, 0, 50),                                    // ball
        R(0, 300, 700, 50, '#e8f4fd'),                    // tilted table
        L(0, 300, 700, 280, 'dashed'),                    // tilt indication
        T(350, 200, 'GUIDE TUBE Ø100'),
        T(350, 380, 'MODULE TABLE (0–45°)'),
      ]},
    ],
    notes: ['1. BALL: 227g OR 535g STEEL (IEC 61215 MQT 8)', '2. DROP HEIGHT: AS PER STANDARD',
      '3. IMPACT VELOCITY: 23 m/s (227g)', '4. TABLE TILT: 0° – 45° ADJUSTABLE',
      '5. SAFETY CAGE: 600×600×3000mm STEEL MESH'],
  },

  // 3. UV Conditioning Chamber
  {
    id: 'iec_uv_conditioning_chamber', name: 'UV Conditioning Chamber',
    standard: 'IEC 61215 MQT 10', partNo: 'SS-IEC-UVC-001',
    material: 'Insulated Steel / Aluminium', scale: '1:15',
    views: [
      { label: 'FRONT VIEW', width_mm: 1200, height_mm: 900, shapes: [
        R(0, 0, 1200, 900, '#e8f4fd', 'thick'),
        R(400, 300, 400, 500, '#fff', 'dashed'),          // door
        R(50, 700, 300, 100, '#fef3c7'),                  // control panel
        T(600, 450, '1200×800×900 CHAMBER'), T(200, 750, 'CONTROL PANEL'),
      ]},
      { label: 'SECTION A-A', width_mm: 800, height_mm: 900, shapes: [
        R(0, 0, 800, 900, '#e8f4fd', 'thick'),
        // 8 UV lamps across top
        ...[0,1,2,3,4,5,6,7].map(i => C(50+i*100, 60, 16)),
        // tilted shelf at 45°
        L(100, 700, 700, 400),
        R(0, 800, 800, 40, '#d1fae5'),                   // floor
        T(400, 60, 'UVA-340 LAMPS ×8'), T(400, 550, 'MODULE SHELF 45°'),
      ]},
    ],
    notes: ['1. UV DOSE: 60 kWh/m² PER IEC 61215 MQT 10', '2. LAMPS: 8× UVA-340 FLUORESCENT',
      '3. TEMP: 60±5°C', '4. SHELF TILT: 45°', '5. CABINET: INSULATED STEEL 40mm'],
  },

  // 4. Humidity Freeze Chamber
  {
    id: 'iec_humidity_freeze_chamber', name: 'Humidity Freeze Cycling Chamber',
    standard: 'IEC 61215 MQT 12', partNo: 'SS-IEC-HFC-001',
    material: 'Double-Wall SS / PU Foam', scale: '1:20',
    views: [
      { label: 'FRONT VIEW', width_mm: 2000, height_mm: 2200, shapes: [
        R(0, 0, 2000, 2200, '#e8f4fd', 'thick'),
        R(100, 100, 800, 2000, '#fff', 'dashed'),         // door
        R(250, 300, 300, 300, '#dbeafe'),                 // viewport
        R(600, 0, 800, 400, '#fee2e2'),                   // roof compressor
        T(1000, 1100, '2000×1500×2200 WALK-IN CHAMBER'),
        T(350, 1500, 'ACCESS DOOR\n800×2000mm'), T(350, 200, 'VIEWPORT 300×300'),
      ]},
      { label: 'SECTION A-A', width_mm: 1500, height_mm: 2200, shapes: [
        R(0, 0, 1500, 2200, '#e8f4fd', 'thick'),
        R(100, 100, 1300, 2000, '#f0fdf4'),              // interior
        // 5 shelves
        ...[0,1,2,3,4].map(i => R(150, 400+i*350, 1200, 25, '#d1fae5')),
        ...[[-1,-1],[1,-1],[-1,1],[1,1]].map(([xf,zf]) => C(750+xf*350, 150, 12)),
        T(750, 1100, 'INTERNAL SHELVES ×5'), T(750, 100, 'HUMIDITY NOZZLES ×4'),
      ]},
    ],
    notes: ['1. TEMP RANGE: −40°C TO +85°C (MQT 12)', '2. HUMIDITY: 10% – 98% RH',
      '3. INSULATION: 100mm PU FOAM', '4. CAPACITY: 10 MODULES ON 5 SHELVES',
      '5. COMPRESSOR: ROOF-MOUNTED'],
  },

  // 5. Thermal Cycling Chamber
  {
    id: 'iec_thermal_cycling_chamber', name: 'Thermal Cycling / Damp Heat Chamber',
    standard: 'IEC 61215 MQT 11', partNo: 'SS-IEC-TCC-001',
    material: 'Insulated Steel', scale: '1:20',
    views: [
      { label: 'FRONT VIEW', width_mm: 1600, height_mm: 1800, shapes: [
        R(0, 0, 1600, 1800, '#e8f4fd', 'thick'),
        R(600, 400, 400, 400, '#dbeafe'),                 // viewing window
        R(100, 1600, 300, 200, '#fef3c7'),                // control panel
        T(800, 900, '1600×1200×1800 CABINET'), T(250, 1680, 'CONTROL PANEL'),
      ]},
      { label: 'SECTION A-A', width_mm: 1200, height_mm: 1800, shapes: [
        R(0, 0, 1200, 1800, '#e8f4fd', 'thick'),
        R(75, 75, 1050, 1650, '#f0fdf4'),                // interior
        C(600, 150, 200),                                 // circulation fan Ø400
        R(150, 1500, 500, 100, '#fee2e2'),               // heater bank
        ...[0,1,2,3].map(i => L(200, 400+i*300, 1000, 400+i*300, 'dashed')), // hanging rails
        T(600, 100, 'Ø400 CIRCULATION FAN'),
        T(400, 1550, 'HEATER BANK 4×2kW'),
        T(600, 550, 'HANGING RAILS ×4'),
      ]},
    ],
    notes: ['1. CYCLE: −40°C TO +85°C, 200 CYCLES (MQT 11)', '2. DAMP HEAT: 85°C / 85% RH',
      '3. FAN: Ø400mm AXIAL CIRCULATION', '4. HEATERS: 4×2kW STRIP HEATERS',
      '5. WINDOW: 400×400mm DOUBLE-GLAZED'],
  },

  // 6. Salt Mist Chamber
  {
    id: 'iec_salt_mist_chamber', name: 'Salt Mist / Corrosion Test Chamber',
    standard: 'IEC 61701', partNo: 'SS-IEC-SMC-001',
    material: 'Acrylic / PVC', scale: '1:10',
    views: [
      { label: 'FRONT VIEW', width_mm: 900, height_mm: 800, shapes: [
        R(0, 200, 900, 600, '#e8f4fd', 'thick'),          // chamber
        R(0, 0, 900, 200, '#fee2e2'),                     // sump
        R(50, 10, 800, 200, 'none', 'dashed'),            // hinged lid
        T(450, 400, '900×600×600 ACRYLIC CHAMBER'), T(450, 100, 'DRAINAGE SUMP 200mm'),
      ]},
      { label: 'SECTION A-A', width_mm: 600, height_mm: 800, shapes: [
        R(0, 200, 600, 600, '#e8f4fd', 'thick'),
        R(0, 0, 600, 200, '#fee2e2'),                     // sump
        L(300, 200, 300, 600),                            // nozzle tower
        L(250, 400, 550, 280),                            // tilted rack 20°
        C(300, 600, 15),                                  // nozzle
        T(300, 550, 'SPRAY NOZZLE'), T(400, 320, 'RACK 20°'), T(300, 100, 'SUMP 200mm'),
      ]},
    ],
    notes: ['1. SALT: 5% NaCl SOLUTION (IEC 61701 SEVERITY 6)', '2. TEMP: 35±2°C',
      '3. CHAMBER WALLS: 8mm ACRYLIC', '4. RACK TILT: 15°–45° ADJUSTABLE',
      '5. SUMP DEPTH: 200mm WITH DRAIN VALVE'],
  },

  // 7. EL Imaging Dark Box
  {
    id: 'iec_el_imaging_dark_box', name: 'EL Imaging Dark Box',
    standard: 'IEC TS 60904-13', partNo: 'SS-IEC-ELB-001',
    material: 'Blackout Steel / Aluminium', scale: '1:25',
    views: [
      { label: 'FRONT VIEW', width_mm: 2500, height_mm: 500, shapes: [
        R(0, 0, 2500, 500, '#1e293b', 'thick'),
        R(0, 0, 2500, 35, '#374151'),                     // module inside
        R(1100, 50, 300, 200, '#374151'),                 // camera body
        C(1250, 180, 30),                                 // lens
        T(1250, 420, 'BLACKOUT ENCLOSURE 2500×1500×500'),
      ]},
      { label: 'TOP VIEW', width_mm: 2500, height_mm: 1500, shapes: [
        R(0, 0, 2500, 1500, '#1e293b', 'thick'),
        R(0, 0, 2500, 35, '#374151'),                     // module
        L(50, 250, 2450, 250, 'dashed'),                  // camera rail left
        L(50, 1250, 2450, 1250, 'dashed'),                // camera rail right
        R(1100, 600, 300, 300, '#374151'),                // camera body
        T(1250, 750, 'EL CAMERA'), T(1250, 100, 'TEST MODULE (DUT)'),
        T(1250, 1400, 'DC INJECTION BLOCK'),
      ]},
    ],
    notes: ['1. ENCLOSURE: LIGHT-TIGHT BLACKOUT STEEL', '2. CAMERA: InGaAs 1024×1024px (EL)',
      '3. INJECT CURRENT: 0–15A DC', '4. CAMERA HEIGHT: 200–400mm ADJUSTABLE',
      '5. BAFFLES: LIGHT-TRAP VENTILATION'],
  },

  // 8. HiPot / Insulation Test Bench
  {
    id: 'iec_hipot_test_bench', name: 'Insulation / Dielectric Withstand Test Bench',
    standard: 'IEC 61730 MST 16', partNo: 'SS-IEC-HPB-001',
    material: 'Steel / Rubber', scale: '1:15',
    views: [
      { label: 'FRONT VIEW', width_mm: 1800, height_mm: 1100, shapes: [
        R(0, 200, 1800, 50, '#e8f4fd', 'thick'),          // bench top
        R(0, 250, 1800, 850, '#e8f4fd'),                  // bench frame
        R(50, 50, 500, 600, '#fef3c7'),                   // HV transformer
        R(1400, 50, 400, 200, '#d1fae5'),                 // hipot tester
        R(200, 195, 1200, 10, '#374151'),                 // rubber mat
        L(50, 205, 1750, 205, 'dashed'),                  // ground bus
        T(300, 350, 'HV ISOLATION\nTRANSFORMER'), T(1600, 150, 'HIPOT\n0–10kV'),
        T(900, 230, 'GROUND BUS 1200mm'),
      ]},
      { label: 'TOP VIEW', width_mm: 1800, height_mm: 900, shapes: [
        R(0, 0, 1800, 900, '#e8f4fd', 'thick'),
        R(50, 50, 500, 600, '#fef3c7'),                   // transformer
        R(1400, 50, 350, 200, '#d1fae5'),                 // tester
        L(50, 870, 1250, 870),                            // ground bus
        T(900, 450, '1800×900 BENCH SURFACE'),
      ]},
    ],
    notes: ['1. MAX HV OUTPUT: 10kV DC (IEC 61730 MST 16)', '2. CLAMP RANGE: 1000–2200mm',
      '3. RUBBER MAT: ANTI-STATIC 8mm', '4. GROUND BUS: 1200mm COPPER',
      '5. SAFETY INTERLOCKS: 2× DOOR SENSORS + BEACON'],
  },

  // 9. IV Curve Tracer Station
  {
    id: 'iec_iv_curve_tracer_station', name: 'IV Curve Tracer Station',
    standard: 'IEC 60904-1 / IEC 60904-9', partNo: 'SS-IEC-IVS-001',
    material: 'Steel / Optical Bench', scale: '1:20',
    views: [
      { label: 'FRONT VIEW', width_mm: 2200, height_mm: 2200, shapes: [
        R(0, 900, 2000, 50, '#e8f4fd', 'thick'),          // bench top
        R(0, 950, 2000, 900, '#e8f4fd'),                  // bench frame
        R(300, 0, 1200, 900, '#fef3c7'),                  // simulator array
        R(300, 850, 1200, 35, '#dbeafe'),                 // DUT module
        C(200, 860, 50),                                  // reference cell
        R(2050, 750, 600, 400, '#d1fae5'),                // tracer rack
        ...[0,1,2,3].flatMap(i => [C(450+i*300, 100, 40), C(450+i*300, 800, 40)]),
        T(900, 400, '4× XENON FLASH LAMPS\n1200×1200mm SIM'),
        T(1000, 870, 'DUT MODULE'), T(2350, 950, 'IV TRACER\nRACK UNIT'),
      ]},
    ],
    notes: ['1. SIMULATOR CLASS: AAA (IEC 60904-9)', '2. LAMPS: 4× XENON FLASH',
      '3. BENCH LENGTH: 2000mm OPTICAL BENCH', '4. DUT: UP TO 2100×1100mm MODULE',
      '5. REFERENCE CELL: 100×100mm CALIBRATED Si'],
  },

  // 10. Bypass Diode Thermal Fixture
  {
    id: 'iec_bypass_diode_thermal_fixture', name: 'Bypass Diode Thermal Test Fixture',
    standard: 'IEC 61215 MQT 18', partNo: 'SS-IEC-BDT-001',
    material: 'Insulated Steel / Brass', scale: '1:8',
    views: [
      { label: 'FRONT VIEW', width_mm: 1000, height_mm: 900, shapes: [
        R(200, 300, 600, 300, '#e8f4fd', 'thick'),        // test box
        L(500, 0, 500, 300),                              // camera arm
        R(350, 0, 300, 200, '#374151'),                   // IR camera body
        C(500, 220, 25),                                  // camera lens
        R(850, 350, 400, 300, '#d1fae5'),                 // current source unit
        C(200, 320, 12), C(200, 370, 12), C(800, 320, 12), C(800, 370, 12),
        T(500, 450, 'TEST BOX 600×400×300'), T(500, 100, 'IR CAMERA'),
        T(1050, 500, 'CURRENT\nSOURCE 20A'),
      ]},
    ],
    notes: ['1. TEST CURRENT: UP TO 20A (IEC 61215 MQT 18)', '2. TERMINALS: 4× BANANA JACK',
      '3. IR CAMERA: ADJUSTABLE ARM ±150mm', '4. THERMAL PROBES: 4× SIDE WALL',
      '5. INSULATED BOX: 600×400×300mm'],
  },

  // 11. PV Module Frame
  {
    id: 'pv_module_frame', name: 'PV Module Frame',
    standard: 'IEC 61215', partNo: 'SS-PV-FRM-001',
    material: 'Anodized Aluminium 6063-T5', scale: '1:20',
    views: [
      { label: 'FRONT VIEW', width_mm: 2000, height_mm: 35, shapes: [
        R(0, 0, 2000, 35, '#d1fae5', 'thick'),
        R(0, 0, 40, 35, '#6ee7b7'),                       // left profile
        R(1960, 0, 40, 35, '#6ee7b7'),                    // right profile
        T(1000, 20, '2000mm — Al FRAME PROFILE 40×35mm'),
      ]},
      { label: 'TOP VIEW', width_mm: 2000, height_mm: 1000, shapes: [
        R(0, 0, 2000, 1000, 'none', 'thick'),
        R(0, 0, 40, 1000, '#d1fae5'),                     // left rail
        R(1960, 0, 40, 1000, '#d1fae5'),                  // right rail
        R(0, 0, 2000, 40, '#d1fae5'),                     // top rail
        R(0, 960, 2000, 40, '#d1fae5'),                   // bottom rail
        R(40, 40, 1920, 920, '#dbeafe'),                  // glass / laminate
        R(900, 600, 200, 130, '#374151'),                 // junction box
        T(1000, 500, 'GLASS / CELL LAMINATE'), T(1000, 665, 'J-BOX'),
      ]},
      { label: 'SECTION A-A (PROFILE)', width_mm: 40, height_mm: 35, shapes: [
        R(0, 0, 40, 35, '#d1fae5', 'thick'),
        R(2, 2, 36, 6, '#a7f3d0'),                       // flange top
        R(2, 27, 36, 6, '#a7f3d0'),                      // flange bottom
        R(2, 8, 4, 19, '#a7f3d0'),                        // web inner
        T(20, 18, '40×35'),
      ]},
    ],
    notes: ['1. PROFILE: 40×35mm ANODISED Al 6063-T5', '2. WALL THICKNESS: 1.8mm',
      '3. CORNER KEYS: STEEL INJECTION', '4. JUNCTION BOX: IP68 RATED',
      '5. MODULE SIZE: 2000×1000mm (STANDARD)'],
  },

  // 12. Ground-Mounted PV Array
  {
    id: 'ground_pv_array', name: 'Ground-Mounted PV Array',
    standard: 'IEC 61215', partNo: 'SS-PV-ARR-001',
    material: 'Al C-Channel / Steel Posts', scale: '1:100',
    views: [
      { label: 'FRONT ELEVATION', width_mm: 13200, height_mm: 3000, shapes: [
        // 12 modules per row, 2 rows
        ...[0,1,2,3,4,5,6,7,8,9,10,11].flatMap(i => [
          R(i*1050, 800, 1000, 2000, '#dbeafe'),          // row 1 module
          R(i*1050, 100, 1000, 2000, '#bfdbfe'),          // row 2 module (higher)
        ]),
        // legs
        ...[0,4,8,12].map(i => L(i*1050+500, 2800, i*1050+300, 3000)),
        T(6600, 2950, '2 ROWS × 12 MODULES = 24 TOTAL'),
        T(6600, 50, '23° TILT, PORTRAIT ORIENTATION'),
      ]},
      { label: 'SIDE VIEW', width_mm: 6000, height_mm: 3000, shapes: [
        // tilt view showing module at 23°
        L(500, 2800, 2300, 800),                          // module tilt line
        L(500, 2800, 500, 3000),                          // front leg
        L(2300, 800, 2300, 3000),                         // rear leg
        L(200, 3000, 2600, 3000),                         // ground
        T(1400, 1800, '23° TILT'), T(500, 2900, 'H=1500'), T(2300, 2900, 'H=2500'),
      ]},
    ],
    notes: ['1. LAYOUT: 2 ROWS × 12 MODULES PORTRAIT', '2. TILT: 23° FIXED',
      '3. RAILS: Al C-CHANNEL 41×35mm', '4. LEGS: STEEL TUBE 100×100×6mm',
      '5. Z-CLAMPS: 35mm Al, 4× PER MODULE'],
  },
];

// ── Lookup function ───────────────────────────────────────────────────────────
export function getIECDrawingData(templateId: string): IECDrawingData | null {
  return DRAWINGS.find(d => d.id === templateId) ?? null;
}

export const IEC_DRAWING_IDS = DRAWINGS.map(d => d.id);
