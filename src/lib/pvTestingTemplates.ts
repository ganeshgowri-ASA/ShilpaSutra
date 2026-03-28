// ─── Solar PV Testing Equipment Templates ────────────────────────────────────
// Parametric templates for PV testing, measurement, and mounting equipment

export type PVTemplateCategory =
  | "EL Testing"
  | "IV Testing"
  | "Simulation"
  | "Mounting"
  | "Enclosures"
  | "IEC Chambers"
  | "Structural";

export interface PVTemplateParam {
  key: string;
  label: string;
  type: "number" | "select" | "boolean";
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { label: string; value: string | number }[];
}

export interface PVTemplate {
  id: string;
  name: string;
  category: PVTemplateCategory;
  description: string;
  tags: string[];
  thumbnail: string; // lucide icon name
  params: PVTemplateParam[];
  generateKCLScript: (inputs: Record<string, number | string | boolean>) => string;
}

// ─── Template 1: EL Imaging Camera ───────────────────────────────────────────
const elCameraTemplate: PVTemplate = {
  id: "el_camera",
  name: "EL Imaging Camera",
  category: "EL Testing",
  description: "Electroluminescence / IR imaging camera for solar module defect detection",
  tags: ["EL", "electroluminescence", "IR", "defect", "camera"],
  thumbnail: "Camera",
  params: [
    { key: "sensorType", label: "Sensor Type", type: "select", default: "InGaAs",
      options: [{ label: "InGaAs (EL)", value: "InGaAs" }, { label: "SWIR (1-1.7µm)", value: "SWIR" }, { label: "LWIR (8-14µm)", value: "LWIR" }] },
    { key: "resW", label: "Resolution Width (px)", type: "number", default: 1280, min: 320, max: 4096, step: 64, unit: "px" },
    { key: "resH", label: "Resolution Height (px)", type: "number", default: 1024, min: 240, max: 3072, step: 64, unit: "px" },
    { key: "bodyW", label: "Body Width", type: "number", default: 180, min: 80, max: 400, step: 5, unit: "mm" },
    { key: "bodyH", label: "Body Height", type: "number", default: 120, min: 60, max: 300, step: 5, unit: "mm" },
    { key: "bodyD", label: "Body Depth", type: "number", default: 90, min: 50, max: 250, step: 5, unit: "mm" },
    { key: "lensD", label: "Lens Diameter", type: "number", default: 50, min: 20, max: 120, step: 1, unit: "mm" },
    { key: "lensL", label: "Lens Protrusion", type: "number", default: 35, min: 10, max: 100, step: 1, unit: "mm" },
  ],
  generateKCLScript(p) {
    const w = Number(p.bodyW), h = Number(p.bodyH), d = Number(p.bodyD);
    const ld = Number(p.lensD), ll = Number(p.lensL);
    return `// EL Camera: ${p.sensorType} ${p.resW}x${p.resH}px
// Body
const body = startSketchOn("XY")
  |> startProfileAt([${-w/2}, ${-h/2}], %)
  |> line([${w}, 0], %)
  |> line([0, ${h}], %)
  |> line([${-w}, 0], %)
  |> close(%)
  |> extrude(${d}, %)

// Lens barrel
const lens = startSketchOn("XY")
  |> circle({ center: [0, 0], radius: ${ld/2} }, %)
  |> extrude(${ll}, %)
  |> translate([0, 0, ${d}], %)

// Sensor window recess
const sensorWindow = startSketchOn("XY")
  |> rectangle({ center: [0, 0], width: ${Math.round(w*0.7)}, height: ${Math.round(h*0.7)} }, %)
  |> extrude(-8, %)
`;
  },
};

// ─── Template 2: IV Curve Tracer ──────────────────────────────────────────────
const ivTracerTemplate: PVTemplate = {
  id: "iv_tracer",
  name: "IV Curve Tracer",
  category: "IV Testing",
  description: "Portable IV curve tracer for Voc, Isc, Pmax, FF measurement with temperature correction",
  tags: ["IV", "Voc", "Isc", "Pmax", "fill factor", "tracer"],
  thumbnail: "Activity",
  params: [
    { key: "vocMax", label: "Max Voc", type: "number", default: 1000, min: 100, max: 2000, step: 50, unit: "V" },
    { key: "iscMax", label: "Max Isc", type: "number", default: 20, min: 1, max: 100, step: 1, unit: "A" },
    { key: "pmaxMax", label: "Max Pmax", type: "number", default: 10000, min: 500, max: 50000, step: 500, unit: "W" },
    { key: "tempCorr", label: "Temperature Correction", type: "boolean", default: true },
    { key: "caseW", label: "Case Width", type: "number", default: 300, min: 150, max: 500, step: 10, unit: "mm" },
    { key: "caseH", label: "Case Height", type: "number", default: 200, min: 100, max: 400, step: 10, unit: "mm" },
    { key: "caseD", label: "Case Depth", type: "number", default: 120, min: 60, max: 250, step: 5, unit: "mm" },
    { key: "screenW", label: "Display Width", type: "number", default: 150, min: 80, max: 280, step: 5, unit: "mm" },
    { key: "screenH", label: "Display Height", type: "number", default: 100, min: 50, max: 200, step: 5, unit: "mm" },
  ],
  generateKCLScript(p) {
    const cw = Number(p.caseW), ch = Number(p.caseH), cd = Number(p.caseD);
    const sw = Number(p.screenW), sh = Number(p.screenH);
    const tempNote = p.tempCorr ? "// Temperature correction enabled (STC 25°C)" : "";
    return `// IV Curve Tracer: Voc≤${p.vocMax}V, Isc≤${p.iscMax}A, Pmax≤${p.pmaxMax}W
${tempNote}
// Enclosure
const enclosure = startSketchOn("XY")
  |> startProfileAt([0, 0], %)
  |> line([${cw}, 0], %)
  |> line([0, ${ch}], %)
  |> line([${-cw}, 0], %)
  |> close(%)
  |> extrude(${cd}, %)

// Front panel display recess
const display = startSketchOn(enclosure, "END")
  |> startProfileAt([${(cw-sw)/2}, ${(ch-sh)/2}], %)
  |> line([${sw}, 0], %)
  |> line([0, ${sh}], %)
  |> line([${-sw}, 0], %)
  |> close(%)
  |> extrude(-3, %)

// Terminal block (right side)
const terminals = startSketchOn("XZ")
  |> circle({ center: [${cw+5}, ${cd/2}], radius: 8 }, %)
  |> extrude(20, %)
`;
  },
};

// ─── Template 3: Solar Simulator ─────────────────────────────────────────────
const solarSimulatorTemplate: PVTemplate = {
  id: "solar_simulator",
  name: "Solar Simulator",
  category: "Simulation",
  description: "Class AAA/ABA/AAB solar simulator for indoor module testing per IEC 60904-9",
  tags: ["solar simulator", "AAA", "irradiance", "spectrum", "IEC 60904"],
  thumbnail: "Sun",
  params: [
    { key: "simClass", label: "Simulator Class", type: "select", default: "AAA",
      options: [{ label: "Class AAA", value: "AAA" }, { label: "Class ABA", value: "ABA" }, { label: "Class AAB", value: "AAB" }, { label: "Class BBA", value: "BBA" }] },
    { key: "testAreaW", label: "Test Area Width", type: "number", default: 1200, min: 200, max: 3000, step: 50, unit: "mm" },
    { key: "testAreaH", label: "Test Area Height", type: "number", default: 800, min: 150, max: 2000, step: 50, unit: "mm" },
    { key: "irradiance", label: "Irradiance", type: "number", default: 1000, min: 100, max: 1200, step: 50, unit: "W/m²" },
    { key: "uniformity", label: "Uniformity (%)", type: "number", default: 2, min: 0.5, max: 10, step: 0.5, unit: "%" },
    { key: "lampHeight", label: "Lamp Height", type: "number", default: 600, min: 200, max: 2000, step: 50, unit: "mm" },
    { key: "frameW", label: "Frame Width", type: "number", default: 1500, min: 400, max: 3500, step: 50, unit: "mm" },
    { key: "frameH", label: "Frame Height", type: "number", default: 1000, min: 300, max: 2500, step: 50, unit: "mm" },
  ],
  generateKCLScript(p) {
    const fw = Number(p.frameW), fh = Number(p.frameH), lh = Number(p.lampHeight);
    const aw = Number(p.testAreaW), ah = Number(p.testAreaH);
    return `// Solar Simulator Class ${p.simClass}: ${p.irradiance}W/m² ±${p.uniformity}%
// Main frame structure
const frame = startSketchOn("XY")
  |> startProfileAt([0, 0], %)
  |> line([${fw}, 0], %)
  |> line([0, 30], %)
  |> line([${-fw}, 0], %)
  |> close(%)
  |> extrude(40, %)

// Vertical uprights (×2)
const upright1 = startSketchOn("XZ")
  |> rectangle({ center: [25, ${lh/2}], width: 50, height: ${lh} }, %)
  |> extrude(40, %)
const upright2 = startSketchOn("XZ")
  |> rectangle({ center: [${fw-25}, ${lh/2}], width: 50, height: ${lh} }, %)
  |> extrude(40, %)

// Lamp housing (top beam)
const lampHousing = startSketchOn("XY")
  |> rectangle({ center: [${fw/2}, 0], width: ${aw}, height: ${ah} }, %)
  |> extrude(80, %)
  |> translate([0, 0, ${lh}], %)

// Test table
const testTable = startSketchOn("XY")
  |> rectangle({ center: [${fw/2}, ${fh/2}], width: ${aw+100}, height: ${ah+100} }, %)
  |> extrude(20, %)
  |> translate([0, 0, 0], %)
`;
  },
};

// ─── Template 4: Thermal IR Camera ───────────────────────────────────────────
const irCameraTemplate: PVTemplate = {
  id: "thermal_ir_camera",
  name: "Thermal IR Camera",
  category: "EL Testing",
  description: "Uncooled LWIR thermal imaging camera for hot-spot detection on PV modules",
  tags: ["thermal", "IR", "infrared", "LWIR", "hot-spot", "NETD"],
  thumbnail: "Thermometer",
  params: [
    { key: "netd", label: "NETD (mK)", type: "number", default: 50, min: 20, max: 200, step: 5, unit: "mK" },
    { key: "pixW", label: "Pixel Array Width", type: "number", default: 640, min: 160, max: 1280, step: 80, unit: "px" },
    { key: "pixH", label: "Pixel Array Height", type: "number", default: 480, min: 120, max: 1024, step: 80, unit: "px" },
    { key: "waveMin", label: "Wavelength Min", type: "number", default: 7.5, min: 3, max: 12, step: 0.5, unit: "µm" },
    { key: "waveMax", label: "Wavelength Max", type: "number", default: 14, min: 8, max: 16, step: 0.5, unit: "µm" },
    { key: "bodyW", label: "Body Width", type: "number", default: 160, min: 80, max: 320, step: 5, unit: "mm" },
    { key: "bodyH", label: "Body Height", type: "number", default: 110, min: 60, max: 240, step: 5, unit: "mm" },
    { key: "bodyD", label: "Body Depth", type: "number", default: 80, min: 40, max: 200, step: 5, unit: "mm" },
  ],
  generateKCLScript(p) {
    const bw = Number(p.bodyW), bh = Number(p.bodyH), bd = Number(p.bodyD);
    return `// Thermal IR Camera: ${p.pixW}×${p.pixH}px, NETD ${p.netd}mK, ${p.waveMin}-${p.waveMax}µm
// Camera body
const body = startSketchOn("XY")
  |> startProfileAt([${-bw/2}, ${-bh/2}], %)
  |> line([${bw}, 0], %)
  |> line([0, ${bh}], %)
  |> line([${-bw}, 0], %)
  |> close(%)
  |> extrude(${bd}, %)

// Germanium lens (LWIR optic)
const lens = startSketchOn("XY")
  |> circle({ center: [0, 0], radius: 25 }, %)
  |> extrude(18, %)
  |> translate([0, 0, ${bd}], %)

// Handle grip
const grip = startSketchOn("YZ")
  |> rectangle({ center: [${-bh/2-30}, ${bd/2}], width: 60, height: ${bd} }, %)
  |> extrude(${bw*0.6}, %)
`;
  },
};

// ─── Template 5: Pyranometer ─────────────────────────────────────────────────
const pyranometerTemplate: PVTemplate = {
  id: "pyranometer",
  name: "Pyranometer",
  category: "IV Testing",
  description: "Secondary standard pyranometer for GHI/DHI/DNI solar irradiance measurement",
  tags: ["pyranometer", "GHI", "DHI", "DNI", "irradiance", "Class A"],
  thumbnail: "Radio",
  params: [
    { key: "measType", label: "Measurement Type", type: "select", default: "GHI",
      options: [{ label: "GHI (Global Horizontal)", value: "GHI" }, { label: "DHI (Diffuse Horizontal)", value: "DHI" }, { label: "DNI (Direct Normal)", value: "DNI" }] },
    { key: "isoClass", label: "ISO 9060 Class", type: "select", default: "Class A",
      options: [{ label: "Class A (Secondary Std)", value: "Class A" }, { label: "Class B (First Class)", value: "Class B" }, { label: "Class C (Second Class)", value: "Class C" }] },
    { key: "sensitivity", label: "Sensitivity", type: "number", default: 10, min: 5, max: 30, step: 0.5, unit: "µV/(W/m²)" },
    { key: "domeD", label: "Dome Outer Diameter", type: "number", default: 50, min: 30, max: 100, step: 1, unit: "mm" },
    { key: "bodyD", label: "Body Diameter", type: "number", default: 75, min: 40, max: 150, step: 1, unit: "mm" },
    { key: "bodyH", label: "Body Height", type: "number", default: 55, min: 30, max: 120, step: 1, unit: "mm" },
    { key: "mountD", label: "Mount Stud Diameter", type: "number", default: 12, min: 6, max: 25, step: 1, unit: "mm" },
  ],
  generateKCLScript(p) {
    const bd = Number(p.bodyD), bh = Number(p.bodyH);
    const dd = Number(p.domeD), md = Number(p.mountD);
    return `// Pyranometer: ${p.measType} ${p.isoClass}, sensitivity ${p.sensitivity}µV/(W/m²)
// Main housing cylinder
const housing = startSketchOn("XY")
  |> circle({ center: [0, 0], radius: ${bd/2} }, %)
  |> extrude(${bh}, %)

// Desiccant/levelling ring
const levelRing = startSketchOn(housing, "END")
  |> circle({ center: [0, 0], radius: ${bd/2+4} }, %)
  |> subtract(circle({ center: [0, 0], radius: ${bd/2-2} }, %)
  |> extrude(8, %)

// Glass dome
const dome = startSketchOn(housing, "END")
  |> circle({ center: [0, 0], radius: ${dd/2} }, %)
  |> extrude(${Math.round(dd*0.45)}, %)

// Mounting stud
const stud = startSketchOn(housing, "START")
  |> circle({ center: [0, 0], radius: ${md/2} }, %)
  |> extrude(-20, %)
`;
  },
};

// ─── Template 6: Ground-Mounted PV Array ─────────────────────────────────────
const groundPVArrayTemplate: PVTemplate = {
  id: "ground_pv_array",
  name: "Ground-Mounted PV Array",
  category: "Mounting",
  description: "2000×1000mm glass-glass modules on C-channel rails with Z-clamps, 23° tilt, 2×12 layout",
  tags: ["ground mount", "PV array", "C-channel", "Z-clamp", "bifacial", "fixed tilt"],
  thumbnail: "Grid3X3",
  params: [
    { key: "modW", label: "Module Width", type: "number", default: 1000, min: 800, max: 1200, step: 10, unit: "mm" },
    { key: "modH", label: "Module Height", type: "number", default: 2000, min: 1600, max: 2500, step: 10, unit: "mm" },
    { key: "modT", label: "Module Thickness", type: "number", default: 6, min: 4, max: 12, step: 0.5, unit: "mm" },
    { key: "tiltDeg", label: "Tilt Angle", type: "number", default: 23, min: 5, max: 45, step: 1, unit: "°" },
    { key: "numCols", label: "Modules per Row", type: "number", default: 12, min: 2, max: 24, step: 1 },
    { key: "numRows", label: "Number of Rows", type: "number", default: 2, min: 1, max: 6, step: 1 },
    { key: "colPitch", label: "Column Pitch", type: "number", default: 1050, min: 1000, max: 1300, step: 10, unit: "mm" },
    { key: "frontH", label: "Front Rail Height", type: "number", default: 400, min: 200, max: 1200, step: 50, unit: "mm" },
    { key: "rowPitch", label: "Row Pitch", type: "number", default: 6000, min: 3000, max: 15000, step: 100, unit: "mm" },
  ],
  generateKCLScript(p) {
    const mw = Number(p.modW), mh = Number(p.modH), mt = Number(p.modT);
    const tilt = Number(p.tiltDeg), cols = Number(p.numCols), rows = Number(p.numRows);
    const cp = Number(p.colPitch), fh = Number(p.frontH), rp = Number(p.rowPitch);
    const rearH = Math.round(fh + mh * Math.sin(tilt * Math.PI / 180));
    return `// Ground PV Array: ${rows}×${cols} modules, ${tilt}° tilt, glass-glass ${mw}×${mh}mm
// Module geometry (single module, replicated)
const module = startSketchOn("XZ")
  |> rectangle({ center: [${mw/2}, ${mh/2}], width: ${mw}, height: ${mh} }, %)
  |> extrude(${mt}, %)
  |> rotate({ angle: ${tilt}, axis: "X" }, %)

// C-channel purlin rail (along row)
const rail = startSketchOn("YZ")
  |> startProfileAt([0, 0], %)
  |> line([40, 0], %)
  |> line([0, 8], %)
  |> line([-32, 0], %)
  |> line([0, 24], %)
  |> line([-8, 0], %)
  |> line([0, -8], %)
  |> line([0, -24], %)
  |> close(%)
  |> extrude(${cols * cp}, %)
  |> translate([0, ${fh}, 0], %)

// Front post (×${cols+1} posts per row)
const frontPost = startSketchOn("XY")
  |> rectangle({ center: [0, 0], width: 80, height: 80 }, %)
  |> extrude(${fh}, %)

// Rear post
const rearPost = startSketchOn("XY")
  |> rectangle({ center: [0, 0], width: 80, height: 80 }, %)
  |> extrude(${rearH}, %)
  |> translate([${Math.round(mh * Math.cos(tilt * Math.PI / 180))}, 0, 0], %)

// Z-clamp (representative)
const zClamp = startSketchOn("YZ")
  |> startProfileAt([0, 0], %)
  |> line([30, 0], %)
  |> line([0, 5], %)
  |> line([-20, 0], %)
  |> line([0, ${mt+4}], %)
  |> line([20, 0], %)
  |> line([0, 5], %)
  |> line([-30, 0], %)
  |> close(%)
  |> extrude(35, %)
`;
  },
};

// ─── Template 7: PV Module Frame ─────────────────────────────────────────────
const pvModuleFrameTemplate: PVTemplate = {
  id: "pv_module_frame",
  name: "PV Module Frame",
  category: "Enclosures",
  description: "40×35mm anodized aluminium extrusion frame with corner keys and junction box",
  tags: ["module frame", "aluminium", "anodized", "corner key", "junction box"],
  thumbnail: "Square",
  params: [
    { key: "frameW", label: "Module Width", type: "number", default: 1000, min: 600, max: 1200, step: 10, unit: "mm" },
    { key: "frameH", label: "Module Height", type: "number", default: 2000, min: 1000, max: 2500, step: 10, unit: "mm" },
    { key: "profileW", label: "Profile Width", type: "number", default: 40, min: 30, max: 60, step: 2, unit: "mm" },
    { key: "profileH", label: "Profile Height", type: "number", default: 35, min: 25, max: 55, step: 2, unit: "mm" },
    { key: "wallT", label: "Wall Thickness", type: "number", default: 1.8, min: 1.0, max: 3.5, step: 0.1, unit: "mm" },
    { key: "glassT", label: "Glass+Cell Stack", type: "number", default: 6, min: 3, max: 12, step: 0.5, unit: "mm" },
    { key: "jboxW", label: "Junction Box Width", type: "number", default: 120, min: 80, max: 200, step: 5, unit: "mm" },
    { key: "jboxH", label: "Junction Box Height", type: "number", default: 80, min: 50, max: 150, step: 5, unit: "mm" },
  ],
  generateKCLScript(p) {
    const fw = Number(p.frameW), fh = Number(p.frameH);
    const pw = Number(p.profileW), ph = Number(p.profileH), wt = Number(p.wallT);
    const gt = Number(p.glassT), jw = Number(p.jboxW), jh = Number(p.jboxH);
    return `// PV Module Frame: ${fw}×${fh}mm, ${pw}×${ph}mm anodized Al profile
// Bottom rail
const bottomRail = startSketchOn("XY")
  |> startProfileAt([0, 0], %)
  |> line([${fw}, 0], %)
  |> line([0, ${pw}], %)
  |> line([${-fw}, 0], %)
  |> close(%)
  |> extrude(${ph}, %)

// Top rail
const topRail = startSketchOn("XY")
  |> startProfileAt([0, ${fh - pw}], %)
  |> line([${fw}, 0], %)
  |> line([0, ${pw}], %)
  |> line([${-fw}, 0], %)
  |> close(%)
  |> extrude(${ph}, %)

// Left side rail
const leftRail = startSketchOn("XY")
  |> startProfileAt([0, ${pw}], %)
  |> line([${pw}, 0], %)
  |> line([0, ${fh - 2*pw}], %)
  |> line([${-pw}, 0], %)
  |> close(%)
  |> extrude(${ph}, %)

// Right side rail
const rightRail = startSketchOn("XY")
  |> startProfileAt([${fw - pw}, ${pw}], %)
  |> line([${pw}, 0], %)
  |> line([0, ${fh - 2*pw}], %)
  |> line([${-pw}, 0], %)
  |> close(%)
  |> extrude(${ph}, %)

// Glass/cell laminate
const glassStack = startSketchOn("XY")
  |> startProfileAt([${pw}, ${pw}], %)
  |> line([${fw - 2*pw}, 0], %)
  |> line([0, ${fh - 2*pw}], %)
  |> line([${-(fw - 2*pw)}, 0], %)
  |> close(%)
  |> extrude(${gt}, %)
  |> translate([0, 0, ${(ph - gt)/2}], %)

// Junction box
const jbox = startSketchOn("XY")
  |> rectangle({ center: [${fw/2}, ${fh*0.6}], width: ${jw}, height: ${jh} }, %)
  |> extrude(22, %)
  |> translate([0, 0, ${ph}], %)
`;
  },
};

// ─── Template 8: String Inverter Cabinet ─────────────────────────────────────
const stringInverterTemplate: PVTemplate = {
  id: "string_inverter",
  name: "String Inverter Cabinet",
  category: "Enclosures",
  description: "String inverter enclosure with AC/DC terminals, disconnect switch, and monitoring module",
  tags: ["inverter", "string", "cabinet", "AC", "DC", "disconnect"],
  thumbnail: "Zap",
  params: [
    { key: "ratedKW", label: "Rated Power", type: "number", default: 60, min: 3, max: 250, step: 1, unit: "kW" },
    { key: "cabinetW", label: "Cabinet Width", type: "number", default: 700, min: 300, max: 1200, step: 50, unit: "mm" },
    { key: "cabinetH", label: "Cabinet Height", type: "number", default: 1000, min: 400, max: 2000, step: 50, unit: "mm" },
    { key: "cabinetD", label: "Cabinet Depth", type: "number", default: 300, min: 150, max: 600, step: 25, unit: "mm" },
    { key: "numDCIn", label: "DC Input Strings", type: "number", default: 8, min: 1, max: 24, step: 1 },
    { key: "acVoltage", label: "AC Output Voltage", type: "number", default: 400, min: 208, max: 690, step: 1, unit: "V" },
    { key: "ipRating", label: "IP Rating", type: "select", default: "IP65",
      options: [{ label: "IP54", value: "IP54" }, { label: "IP65", value: "IP65" }, { label: "IP66", value: "IP66" }] },
  ],
  generateKCLScript(p) {
    const cw = Number(p.cabinetW), ch = Number(p.cabinetH), cd = Number(p.cabinetD);
    const dcIn = Number(p.numDCIn);
    return `// String Inverter ${p.ratedKW}kW: ${dcIn}-string DC in, ${p.acVoltage}V AC out, ${p.ipRating}
// Cabinet shell
const cabinet = startSketchOn("XY")
  |> startProfileAt([0, 0], %)
  |> line([${cw}, 0], %)
  |> line([0, ${ch}], %)
  |> line([${-cw}, 0], %)
  |> close(%)
  |> extrude(${cd}, %)

// Door (front face cutout)
const door = startSketchOn(cabinet, "END")
  |> startProfileAt([${cw*0.05}, ${ch*0.05}], %)
  |> line([${cw*0.9}, 0], %)
  |> line([0, ${ch*0.9}], %)
  |> line([${-cw*0.9}, 0], %)
  |> close(%)
  |> extrude(-3, %)

// DC terminal block row
const dcTerminals = startSketchOn("XY")
  |> rectangle({ center: [${cw/2}, ${ch*0.25}], width: ${cw*0.8}, height: 40 }, %)
  |> extrude(30, %)
  |> translate([0, 0, ${cd}], %)

// AC output bus
const acBus = startSketchOn("XY")
  |> rectangle({ center: [${cw/2}, ${ch*0.75}], width: ${cw*0.6}, height: 50 }, %)
  |> extrude(25, %)
  |> translate([0, 0, ${cd}], %)

// Disconnect switch
const disconnectSwitch = startSketchOn(cabinet, "END")
  |> circle({ center: [${cw*0.85}, ${ch*0.5}], radius: 18 }, %)
  |> extrude(-5, %)
`;
  },
};

// ─── Template Registry ────────────────────────────────────────────────────────
export const PV_TESTING_TEMPLATES: PVTemplate[] = [
  elCameraTemplate,
  ivTracerTemplate,
  solarSimulatorTemplate,
  irCameraTemplate,
  pyranometerTemplate,
  groundPVArrayTemplate,
  pvModuleFrameTemplate,
  stringInverterTemplate,
];

export const PV_TEMPLATE_CATEGORIES: PVTemplateCategory[] = [
  "EL Testing",
  "IV Testing",
  "Simulation",
  "Mounting",
  "Enclosures",
  "IEC Chambers",
  "Structural",
];

export function getPVTemplatesByCategory(cat: PVTemplateCategory): PVTemplate[] {
  return PV_TESTING_TEMPLATES.filter((t) => t.category === cat);
}

export function getPVTemplateById(id: string): PVTemplate | undefined {
  return PV_TESTING_TEMPLATES.find((t) => t.id === id);
}

// ─── Unified Template Registry (all 18+ templates) ───────────────────────────
// Lazily evaluated to avoid circular-import issues at module initialisation.
import { adaptIECTemplates } from './pvIECAdapter';

/** Combined array: 8 KCL equipment templates + 10 IEC test-chamber templates */
export const allPVTemplates: PVTemplate[] = [
  ...PV_TESTING_TEMPLATES,
  ...adaptIECTemplates(),
];

/** All categories derived from allPVTemplates (preserves PV_TEMPLATE_CATEGORIES order) */
export const ALL_PV_CATEGORIES: PVTemplateCategory[] = PV_TEMPLATE_CATEGORIES;

// ─── W3-4: IEC 61215 / 61730 / 62788 Test Equipment Templates ────────────────
// Re-exported from pvIECTestRegistry for unified template browser access.
export {
  PV_IEC_ALL_TEMPLATES,
  PV_IEC_TEMPLATES_PART1,
  IEC_TEMPLATE_BROWSER_ENTRIES,
  IEC_CATEGORY_LABELS,
  IEC_STANDARDS_REFERENCE,
  getIECTemplateById,
  getIECTemplatesByCategory,
} from './pvIECTestRegistry';

export { PV_IEC_TEMPLATES_PART2 } from './pvIECTestTemplates2';

export type {
  SolidPrimitive,
  ParametricField,
  IECTestTemplate,
} from './pvIECTestTemplates';

