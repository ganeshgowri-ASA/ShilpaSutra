import * as THREE from "three";

function mat(color: string, metalness = 0.1, roughness = 0.7): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function mesh(geo: THREE.BufferGeometry, m: THREE.MeshStandardMaterial): THREE.Mesh {
  return new THREE.Mesh(geo, m);
}

function box(w: number, h: number, d: number): THREE.BoxGeometry {
  return new THREE.BoxGeometry(w, h, d);
}

function cyl(rt: number, rb: number, h: number, segs = 16): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(rt, rb, h, segs);
}

// ─── FASTENERS ────────────────────────────────────────────────────────────────

export function generateHexBolt(sizeM = 8, length = 30): THREE.Group {
  const g = new THREE.Group();
  const r = sizeM / 200;
  const len = length / 100;
  const head = mesh(cyl(r * 1.8, r * 1.8, r * 1.6, 6), mat("#aaaaaa", 0.9, 0.2));
  head.position.y = len / 2 + r * 0.8;
  const shaft = mesh(cyl(r, r, len, 12), mat("#aaaaaa", 0.9, 0.2));
  g.add(head, shaft);
  return g;
}

export function generateHexNut(sizeM = 8, height = 6): THREE.Group {
  const g = new THREE.Group();
  const r = sizeM / 200;
  const h = height / 100;
  const body = mesh(cyl(r * 2, r * 2, h, 6), mat("#aaaaaa", 0.9, 0.2));
  const hole = mesh(cyl(r, r, h * 1.1, 12), mat("#0d1117", 0, 1));
  g.add(body, hole);
  return g;
}

export function generateWasher(sizeM = 8, thickness = 1.5): THREE.Group {
  const g = new THREE.Group();
  const r = sizeM / 200;
  const t = thickness / 100;
  const body = mesh(cyl(r * 3, r * 3, t, 32), mat("#aaaaaa", 0.9, 0.2));
  const hole = mesh(cyl(r, r, t * 1.1, 16), mat("#0d1117", 0, 1));
  g.add(body, hole);
  return g;
}

export function generateLBracket(width = 50, height = 50, thickness = 3): THREE.Group {
  const g = new THREE.Group();
  const w = width / 100, h = height / 100, t = thickness / 100;
  const m = mat("#888888", 0.7, 0.3);
  const horiz = mesh(box(w, t, h * 0.5), m);
  horiz.position.y = h / 2;
  const vert = mesh(box(t, h, h * 0.5), m);
  vert.position.x = -w / 2 + t / 2;
  g.add(horiz, vert);
  return g;
}

// ─── ENERGY ───────────────────────────────────────────────────────────────────

export function generateSolarPVModule(widthMm = 1000, heightMm = 1650, thicknessMm = 35): THREE.Group {
  const g = new THREE.Group();
  const w = widthMm / 1000, h = heightMm / 1000, t = thicknessMm / 1000;

  // Glass substrate
  const substrate = mesh(box(w, h, t), mat("#c0cfe8", 0.5, 0.3));
  g.add(substrate);

  // Solar cells grid (6×10)
  const rows = 6, cols = 10;
  const cellMat = mat("#1a237e", 0.4, 0.5);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = mesh(box(w * 0.085, h * 0.13, 0.002), cellMat);
      cell.position.set(
        (c / cols - 0.5 + 0.5 / cols) * w * 0.9,
        (r / rows - 0.5 + 0.5 / rows) * h * 0.9,
        t / 2 + 0.001
      );
      g.add(cell);
    }
  }

  // Aluminum frame
  const frameMat = mat("#b0b0b0", 0.9, 0.2);
  const fw = 0.02;
  [[0, h / 2, 0, w + fw * 2, fw, t + 0.01],
   [0, -h / 2, 0, w + fw * 2, fw, t + 0.01],
   [w / 2, 0, 0, fw, h, t + 0.01],
   [-w / 2, 0, 0, fw, h, t + 0.01]
  ].forEach(([x, y, z, bw, bh, bd]) => {
    const rail = mesh(box(bw as number, bh as number, bd as number), frameMat);
    rail.position.set(x as number, y as number, z as number);
    g.add(rail);
  });

  return g;
}

export function generateSolarArray(rows = 3, cols = 3, tiltDeg = 15): THREE.Group {
  const g = new THREE.Group();
  const pw = 1.0, ph = 1.65, gap = 0.15;
  const tilt = (tiltDeg * Math.PI) / 180;
  const panelMat = mat("#1a237e", 0.4, 0.5);
  const frameMat = mat("#888888", 0.8, 0.3);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const panel = mesh(box(pw, ph, 0.035), panelMat);
      panel.position.set(
        (c - (cols - 1) / 2) * (pw + gap),
        0.6 + Math.sin(tilt) * ph / 2,
        (r - (rows - 1) / 2) * (gap + 0.1)
      );
      panel.rotation.x = -tilt;
      g.add(panel);
    }
  }

  // Ground rails
  for (let i = 0; i < 2; i++) {
    const rail = mesh(box(cols * (pw + gap), 0.05, 0.05), frameMat);
    rail.position.set(0, 0.08, (i - 0.5) * (rows * 0.5));
    g.add(rail);
  }

  // Posts
  for (let c = 0; c < cols; c++) {
    const post = mesh(cyl(0.03, 0.03, 1.2), frameMat);
    post.position.set((c - (cols - 1) / 2) * (pw + gap), 0.6, 0);
    g.add(post);
  }

  return g;
}

export function generateWindTurbine(hubHeightM = 80, rotorDiaM = 90): THREE.Group {
  const g = new THREE.Group();
  const hubH = hubHeightM / 40;
  const rotorR = rotorDiaM / 80;

  // Tower
  const tower = mesh(cyl(0.06, 0.12, hubH, 16), mat("#e0e0e0", 0.3, 0.6));
  tower.position.y = hubH / 2;
  g.add(tower);

  // Nacelle
  const nacelle = mesh(box(0.35, 0.2, 0.18), mat("#cccccc", 0.4, 0.5));
  nacelle.position.y = hubH;
  g.add(nacelle);

  // Hub
  const hub = mesh(new THREE.SphereGeometry(0.09, 16, 12), mat("#bbbbbb", 0.5, 0.4));
  hub.position.set(0.18, hubH, 0);
  g.add(hub);

  // 3 Blades
  [0, 120, 240].forEach(deg => {
    const angle = (deg * Math.PI) / 180;
    const blade = mesh(box(0.07, rotorR, 0.04), mat("#f5f5f5", 0.1, 0.8));
    blade.position.set(
      0.18 + Math.cos(angle - Math.PI / 2) * rotorR / 2,
      hubH + Math.sin(angle - Math.PI / 2) * rotorR / 2,
      0
    );
    blade.rotation.z = angle;
    g.add(blade);
  });

  return g;
}

export function generateBatteryPack(widthMm = 200, heightMm = 150, depthMm = 100): THREE.Group {
  const g = new THREE.Group();
  const w = widthMm / 200, h = heightMm / 200, d = depthMm / 200;

  const body = mesh(box(w, h, d), mat("#1a1a2e", 0.2, 0.7));
  g.add(body);

  // Terminals
  const posTerminal = mesh(cyl(0.025, 0.025, 0.05, 16), mat("#ff4444", 0.8, 0.2));
  posTerminal.position.set(-w * 0.25, h / 2 + 0.025, 0);
  const negTerminal = mesh(cyl(0.025, 0.025, 0.05, 16), mat("#4444ff", 0.8, 0.2));
  negTerminal.position.set(w * 0.25, h / 2 + 0.025, 0);

  // Label area
  const label = mesh(box(w * 0.8, 0.01, d * 0.6), mat("#333333", 0, 0.9));
  label.position.set(0, h / 2 + 0.005, 0);

  g.add(posTerminal, negTerminal, label);
  return g;
}

export function generateInverterBox(widthMm = 350, heightMm = 400, depthMm = 150): THREE.Group {
  const g = new THREE.Group();
  const w = widthMm / 300, h = heightMm / 300, d = depthMm / 300;

  const body = mesh(box(w, h, d), mat("#2a2a3a", 0.3, 0.6));
  g.add(body);

  // Heat sink fins on right side
  for (let i = 0; i < 8; i++) {
    const fin = mesh(box(0.025, h * 0.7, d / 10), mat("#cccccc", 0.8, 0.2));
    fin.position.set(w / 2 + 0.012, 0, (i - 3.5) * (d / 9));
    g.add(fin);
  }

  // Display panel
  const display = mesh(box(w * 0.45, h * 0.3, 0.01), mat("#111111", 0, 0.9));
  display.position.set(0, h * 0.2, d / 2 + 0.001);
  g.add(display);

  return g;
}

export function generateChargeController(widthMm = 180, heightMm = 150): THREE.Group {
  const g = new THREE.Group();
  const w = widthMm / 250, h = heightMm / 250;

  const body = mesh(box(w, h, 0.08), mat("#1a2a1a", 0.2, 0.7));
  g.add(body);

  // PCB display
  const pcb = mesh(box(w * 0.6, h * 0.4, 0.01), mat("#0a3a0a", 0.1, 0.5));
  pcb.position.set(0, h * 0.1, 0.045);
  g.add(pcb);

  // LED indicators
  [[-w * 0.25, -h * 0.25], [0, -h * 0.25], [w * 0.25, -h * 0.25]].forEach(([x, y], i) => {
    const led = mesh(new THREE.SphereGeometry(0.008, 8, 6), mat(["#ff4444", "#44ff44", "#4444ff"][i], 0.1, 0.3));
    led.position.set(x, y, 0.045);
    g.add(led);
  });

  return g;
}

// ─── NATURE ───────────────────────────────────────────────────────────────────

export function generateTree(heightM = 8, canopyRadiusM = 3): THREE.Group {
  const g = new THREE.Group();
  const h = heightM / 8;
  const cr = canopyRadiusM / 6;

  const trunk = mesh(cyl(0.08, 0.13, h * 0.5, 8), mat("#5d3a1a", 0, 0.9));
  trunk.position.y = h * 0.25;
  g.add(trunk);

  const canopyPositions: [number, number, number, number][] = [
    [0, h * 0.65, 0, cr],
    [cr * 0.4, h * 0.6, cr * 0.3, cr * 0.7],
    [-cr * 0.3, h * 0.55, -cr * 0.4, cr * 0.65],
    [cr * 0.2, h * 0.72, -cr * 0.3, cr * 0.55],
  ];
  const greens = ["#2e7d32", "#388e3c", "#1b5e20", "#43a047"];
  canopyPositions.forEach(([x, y, z, r], i) => {
    const sphere = mesh(new THREE.SphereGeometry(r, 14, 10), mat(greens[i], 0, 0.9));
    sphere.position.set(x, y, z);
    g.add(sphere);
  });

  return g;
}

export function generatePineTree(heightM = 6, baseRadiusM = 1.5): THREE.Group {
  const g = new THREE.Group();
  const h = heightM / 6;
  const br = baseRadiusM / 3;

  const trunk = mesh(cyl(0.055, 0.075, h * 0.2, 8), mat("#4a2c17", 0, 0.9));
  trunk.position.y = h * 0.1;
  g.add(trunk);

  [
    [0, h * 0.35, br, h * 0.5, "#1b5e20"],
    [0, h * 0.60, br * 0.7, h * 0.4, "#2e7d32"],
    [0, h * 0.82, br * 0.4, h * 0.3, "#388e3c"],
  ].forEach(([, y, r, ch, color]) => {
    const cone = mesh(new THREE.ConeGeometry(r as number, ch as number, 8), mat(color as string, 0, 0.8));
    cone.position.y = y as number;
    g.add(cone);
  });

  return g;
}

export function generateBush(radiusM = 1): THREE.Group {
  const g = new THREE.Group();
  const r = radiusM / 2;
  const greens: [number, number, number, number, string][] = [
    [0, r * 0.3, 0, r, "#4caf50"],
    [r * 0.6, r * 0.1, 0, r * 0.7, "#388e3c"],
    [-r * 0.5, r * 0.1, r * 0.3, r * 0.65, "#2e7d32"],
    [0, r * 0.1, -r * 0.5, r * 0.6, "#33691e"],
  ];
  greens.forEach(([x, y, z, sr, color]) => {
    const s = mesh(new THREE.SphereGeometry(sr, 10, 8), mat(color, 0, 0.9));
    s.position.set(x, y, z);
    g.add(s);
  });
  return g;
}

export function generateRockFormation(sizeM = 1): THREE.Group {
  const g = new THREE.Group();
  const s = sizeM / 2;
  const rocks: [number, number, number, number, number, number, number, string][] = [
    [0, s * 0.4, 0, 0.2, 0.5, 0.1, s * 0.7, "#757575"],
    [s * 0.5, s * 0.2, s * 0.3, 0.5, 0.2, 0.3, s * 0.4, "#616161"],
    [-s * 0.4, s * 0.15, -s * 0.2, 0.3, 0.8, 0.2, s * 0.35, "#9e9e9e"],
  ];
  rocks.forEach(([x, y, z, rx, ry, rz, r, color]) => {
    const rock = mesh(new THREE.DodecahedronGeometry(r), mat(color, 0.1, 0.9));
    rock.rotation.set(rx, ry, rz);
    rock.position.set(x, y, z);
    g.add(rock);
  });
  return g;
}

export function generateFlowerPot(potHeightMm = 200, topRadiusMm = 100): THREE.Group {
  const g = new THREE.Group();
  const ph = potHeightMm / 300, tr = topRadiusMm / 300;

  const pot = mesh(cyl(tr, tr * 0.7, ph, 16), mat("#8d4e2a", 0.1, 0.8));
  pot.position.y = ph / 2;
  g.add(pot);

  const plant = mesh(new THREE.SphereGeometry(tr * 0.9, 12, 8), mat("#2e7d32", 0, 0.9));
  plant.position.y = ph + tr * 0.5;
  g.add(plant);

  const side = mesh(new THREE.SphereGeometry(tr * 0.5, 10, 6), mat("#388e3c", 0, 0.9));
  side.position.set(tr * 0.5, ph + tr * 0.55, 0);
  g.add(side);

  return g;
}

// ─── PEOPLE ───────────────────────────────────────────────────────────────────

export function generatePerson(
  heightM = 1.75,
  bodyColor = "#455a64",
  hatColor: string | null = null
): THREE.Group {
  const g = new THREE.Group();
  const h = heightM / 1.5;
  const skinMat = mat("#f0c27f", 0, 0.8);
  const bodyMat = mat(bodyColor, 0.1, 0.7);
  const pantsMat = mat("#263238", 0.1, 0.7);
  const shoesMat = mat("#1a1a1a", 0.1, 0.8);

  // Head
  const head = mesh(new THREE.SphereGeometry(h * 0.08, 16, 12), skinMat);
  head.position.y = h * 0.9;
  g.add(head);

  // Hard hat
  if (hatColor) {
    const hat = mesh(cyl(h * 0.1, h * 0.085, h * 0.065, 16), mat(hatColor, 0.2, 0.5));
    hat.position.y = h * 0.965;
    g.add(hat);
    const brim = mesh(cyl(h * 0.12, h * 0.12, h * 0.008, 16), mat(hatColor, 0.2, 0.5));
    brim.position.y = h * 0.935;
    g.add(brim);
  }

  // Torso
  const torso = mesh(box(h * 0.22, h * 0.3, h * 0.12), bodyMat);
  torso.position.y = h * 0.65;
  g.add(torso);

  // Arms
  [-1, 1].forEach(side => {
    const arm = mesh(cyl(h * 0.033, h * 0.033, h * 0.28, 8), bodyMat);
    arm.rotation.z = side * 0.3;
    arm.position.set(side * h * 0.15, h * 0.65, 0);
    g.add(arm);
  });

  // Legs
  [-1, 1].forEach(side => {
    const leg = mesh(cyl(h * 0.04, h * 0.04, h * 0.33, 8), pantsMat);
    leg.position.set(side * h * 0.07, h * 0.3, 0);
    g.add(leg);

    const foot = mesh(box(h * 0.06, h * 0.03, h * 0.12), shoesMat);
    foot.position.set(side * h * 0.07, h * 0.1, h * 0.04);
    g.add(foot);
  });

  return g;
}

export function generateEngineer(heightM = 1.75): THREE.Group {
  return generatePerson(heightM, "#1565c0", "#ffffff");
}

export function generateConstructionWorker(heightM = 1.75): THREE.Group {
  return generatePerson(heightM, "#ff8f00", "#ffcc00");
}

// ─── ENGINEERING ──────────────────────────────────────────────────────────────

export function generateIBeam(heightMm = 200, widthMm = 150, lengthMm = 3000): THREE.Group {
  const g = new THREE.Group();
  const ih = heightMm / 200, fw = widthMm / 200, len = lengthMm / 1500;
  const t = 0.015;
  const m = mat("#607d8b", 0.7, 0.3);

  // Top flange
  const topFlange = mesh(box(len, t * 2, fw), m);
  topFlange.position.y = ih / 2;
  // Bottom flange
  const botFlange = mesh(box(len, t * 2, fw), m);
  botFlange.position.y = -ih / 2;
  // Web
  const web = mesh(box(len, ih, t * 1.5), m);

  g.add(topFlange, botFlange, web);
  g.rotation.z = Math.PI / 2;
  return g;
}

export function generateCChannel(heightMm = 100, widthMm = 50, lengthMm = 1000): THREE.Group {
  const g = new THREE.Group();
  const ch = heightMm / 150, fw = widthMm / 150, len = lengthMm / 600;
  const t = 0.015;
  const m = mat("#607d8b", 0.7, 0.3);

  const web = mesh(box(len, ch, t * 2), m);
  const topFlange = mesh(box(len, t * 2, fw), m);
  topFlange.position.set(0, ch / 2, fw / 2);
  const botFlange = mesh(box(len, t * 2, fw), m);
  botFlange.position.set(0, -ch / 2, fw / 2);

  g.add(web, topFlange, botFlange);
  g.rotation.z = Math.PI / 2;
  return g;
}

export function generatePipeSection(odMm = 100, wallThickMm = 5, lengthMm = 500): THREE.Group {
  const g = new THREE.Group();
  const r = odMm / 200, wt = wallThickMm / 200, len = lengthMm / 300;
  const outer = mesh(cyl(r, r, len, 32), mat("#78909c", 0.8, 0.2));
  outer.rotation.x = Math.PI / 2;
  const inner = mesh(cyl(r - wt, r - wt, len * 1.01, 32), mat("#0d1117", 0, 1));
  inner.rotation.x = Math.PI / 2;
  g.add(outer, inner);
  return g;
}

export function generateFlange(odMm = 150, boreMm = 80, boltCount = 8): THREE.Group {
  const g = new THREE.Group();
  const r = odMm / 200, bore = boreMm / 200;
  const flangeMat = mat("#90a4ae", 0.7, 0.3);

  const body = mesh(cyl(r, r, 0.04, 32), flangeMat);
  const hole = mesh(cyl(bore, bore, 0.042, 32), mat("#0d1117", 0, 1));
  g.add(body, hole);

  const boltPCD = (r + bore) / 2 * 0.85;
  for (let i = 0; i < boltCount; i++) {
    const angle = (i / boltCount) * Math.PI * 2;
    const bolt = mesh(cyl(0.013, 0.013, 0.055, 8), mat("#444444", 0.8, 0.3));
    bolt.position.set(Math.cos(angle) * boltPCD, 0, Math.sin(angle) * boltPCD);
    g.add(bolt);
  }

  g.rotation.x = Math.PI / 2;
  return g;
}

export function generateMotor(diameterMm = 120, bodyLengthMm = 200, shaftDiaMm = 28): THREE.Group {
  const g = new THREE.Group();
  const r = diameterMm / 200, bl = bodyLengthMm / 200, sr = shaftDiaMm / 400;

  const body = mesh(cyl(r, r, bl, 32), mat("#37474f", 0.6, 0.4));
  const endCap = mesh(cyl(r * 0.7, r * 0.7, 0.04, 32), mat("#455a64", 0.5, 0.5));
  endCap.position.y = -bl / 2;
  const shaft = mesh(cyl(sr, sr, 0.3, 16), mat("#546e7a", 0.8, 0.2));
  shaft.position.y = bl / 2 + 0.15;

  // Mounting feet
  [-1, 1].forEach(side => {
    const foot = mesh(box(0.05, 0.04, r * 2.2), mat("#37474f", 0.6, 0.4));
    foot.position.set(side * (r + 0.02), -bl / 2 + 0.02, 0);
    g.add(foot);
  });

  g.add(body, endCap, shaft);
  g.rotation.x = Math.PI / 2;
  return g;
}

export function generateValve(dnMm = 80): THREE.Group {
  const g = new THREE.Group();
  const dn = dnMm / 200;

  const body = mesh(cyl(dn, dn, dn * 2.5, 16), mat("#546e7a", 0.6, 0.4));
  body.rotation.x = Math.PI / 2;
  g.add(body);

  // Bonnets (flanges on pipe ends)
  [-1, 1].forEach(side => {
    const bonnet = mesh(cyl(dn * 1.3, dn * 1.3, 0.03, 16), mat("#607d8b", 0.6, 0.4));
    bonnet.rotation.x = Math.PI / 2;
    bonnet.position.z = side * dn * 1.25;
    g.add(bonnet);
  });

  // Stem
  const stem = mesh(cyl(dn * 0.28, dn * 0.28, dn * 2.2, 12), mat("#37474f", 0.7, 0.3));
  stem.position.y = dn * 1.1;
  g.add(stem);

  // Handwheel
  const wheel = mesh(new THREE.TorusGeometry(dn * 0.75, dn * 0.06, 8, 24), mat("#78909c", 0.8, 0.2));
  wheel.position.y = dn * 2.3;
  g.add(wheel);

  // Handwheel spokes
  for (let i = 0; i < 4; i++) {
    const spoke = mesh(box(dn * 0.04, dn * 0.04, dn * 1.5), mat("#78909c", 0.8, 0.2));
    spoke.position.y = dn * 2.3;
    spoke.rotation.y = (i / 4) * Math.PI;
    g.add(spoke);
  }

  return g;
}

export function generateHeatExchanger(shellDiaMm = 300, lengthMm = 1500): THREE.Group {
  const g = new THREE.Group();
  const sr = shellDiaMm / 500, sl = lengthMm / 800;

  // Shell (semi-transparent)
  const shell = mesh(cyl(sr, sr, sl, 32), mat("#546e7a", 0.5, 0.5));
  (shell.material as THREE.MeshStandardMaterial).transparent = true;
  (shell.material as THREE.MeshStandardMaterial).opacity = 0.45;
  shell.rotation.x = Math.PI / 2;
  g.add(shell);

  // Tube bundle (3×3)
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      const tube = mesh(cyl(sr * 0.07, sr * 0.07, sl * 1.06, 8), mat("#90a4ae", 0.7, 0.3));
      tube.rotation.x = Math.PI / 2;
      tube.position.set(row * sr * 0.28, col * sr * 0.28, 0);
      g.add(tube);
    }
  }

  // End caps
  [-1, 1].forEach(side => {
    const cap = mesh(cyl(sr * 1.08, sr * 1.08, 0.04, 32), mat("#607d8b", 0.6, 0.4));
    cap.rotation.x = Math.PI / 2;
    cap.position.z = side * sl / 2;
    g.add(cap);

    // Nozzle
    const nozzle = mesh(cyl(sr * 0.2, sr * 0.2, sr * 0.5, 12), mat("#546e7a", 0.6, 0.4));
    nozzle.position.set(sr * 0.5, side * sr * 0.4, side * sl / 2);
    g.add(nozzle);
  });

  return g;
}

// ─── FURNITURE / ARCHITECTURE ─────────────────────────────────────────────────

export function generateDesk(widthMm = 1400, depthMm = 700, heightMm = 740): THREE.Group {
  const g = new THREE.Group();
  const w = widthMm / 800, d = depthMm / 800, h = heightMm / 800;
  const topMat = mat("#8d6e63", 0.1, 0.6);
  const legMat = mat("#6d4c41", 0.1, 0.7);

  // Tabletop
  const top = mesh(box(w, 0.04, d), topMat);
  top.position.y = h;
  g.add(top);

  // Legs
  [[-w / 2 + 0.04, d / 2 - 0.04], [w / 2 - 0.04, d / 2 - 0.04],
   [-w / 2 + 0.04, -d / 2 + 0.04], [w / 2 - 0.04, -d / 2 + 0.04]].forEach(([x, z]) => {
    const leg = mesh(box(0.05, h, 0.05), legMat);
    leg.position.set(x, h / 2, z);
    g.add(leg);
  });

  // Stretchers
  const stretcherMat = mat("#795548", 0.1, 0.7);
  const sH = mesh(box(w * 0.85, 0.03, 0.04), stretcherMat);
  sH.position.set(0, h * 0.3, 0);
  g.add(sH);

  return g;
}

export function generateChair(seatHeightMm = 450, widthMm = 500): THREE.Group {
  const g = new THREE.Group();
  const sh = seatHeightMm / 600, sw = widthMm / 600;
  const m = mat("#455a64", 0.2, 0.7);

  // Seat
  const seat = mesh(box(sw, 0.04, sw), m);
  seat.position.y = sh;
  g.add(seat);

  // Back
  const back = mesh(box(sw, sw * 0.95, 0.04), m);
  back.position.set(0, sh + sw * 0.5, -sw / 2 + 0.02);
  g.add(back);

  // Legs
  [[-sw / 2 + 0.03, -sw / 2 + 0.03], [sw / 2 - 0.03, -sw / 2 + 0.03],
   [-sw / 2 + 0.03, sw / 2 - 0.03], [sw / 2 - 0.03, sw / 2 - 0.03]].forEach(([x, z]) => {
    const leg = mesh(cyl(0.018, 0.018, sh, 8), m);
    leg.position.set(x, sh / 2, z);
    g.add(leg);
  });

  return g;
}

export function generateDoorFrame(widthMm = 900, heightMm = 2100, depthMm = 100): THREE.Group {
  const g = new THREE.Group();
  const fw = widthMm / 1200, fh = heightMm / 1200, fd = depthMm / 1200;
  const t = 0.06;
  const frameMat = mat("#795548", 0.1, 0.7);
  const doorMat = mat("#a1887f", 0.1, 0.6);

  // Jambs
  const leftJamb = mesh(box(t, fh, fd), frameMat);
  leftJamb.position.set(-fw / 2, fh / 2, 0);
  const rightJamb = mesh(box(t, fh, fd), frameMat);
  rightJamb.position.set(fw / 2, fh / 2, 0);

  // Header
  const header = mesh(box(fw + t * 2, t, fd), frameMat);
  header.position.set(0, fh, 0);

  // Door panel
  const door = mesh(box(fw - 0.01, fh - 0.02, 0.04), doorMat);
  door.position.set(0, fh / 2, 0);

  // Door knob
  const knob = mesh(new THREE.SphereGeometry(0.025, 10, 8), mat("#c9a84c", 0.9, 0.1));
  knob.position.set(fw * 0.38, fh * 0.48, 0.025);
  g.add(leftJamb, rightJamb, header, door, knob);
  return g;
}

export function generateStaircase(steps = 8, widthMm = 1200): THREE.Group {
  const g = new THREE.Group();
  const sw = widthMm / 800;
  const stepH = 0.175, stepD = 0.27;
  const riserMat = mat("#bcaaa4", 0.1, 0.7);
  const treadMat = mat("#d7ccc8", 0.1, 0.6);

  for (let i = 0; i < steps; i++) {
    const tread = mesh(box(sw, stepH, stepD), riserMat);
    tread.position.set(0, i * stepH + stepH / 2, i * stepD);
    g.add(tread);
    const nosing = mesh(box(sw, 0.015, stepD + 0.025), treadMat);
    nosing.position.set(0, i * stepH + stepH + 0.007, i * stepD);
    g.add(nosing);
  }

  // Side stringers
  [-1, 1].forEach(side => {
    const stringer = mesh(box(0.04, steps * stepH, steps * stepD), mat("#795548", 0.1, 0.7));
    stringer.position.set(side * (sw / 2 + 0.02), (steps * stepH) / 2, (steps * stepD) / 2);
    g.add(stringer);
  });

  g.position.z = -(steps * stepD) / 2;
  return g;
}

// ─── Registry ─────────────────────────────────────────────────────────────────
// Maps part id → generator function with default params

export const MODEL_GENERATORS: Record<string, (params: Record<string, number>) => THREE.Group> = {
  bolt:               p => generateHexBolt(p.size, p.length),
  nut:                p => generateHexNut(p.size, p.height),
  washer:             p => generateWasher(p.size, p.thickness),
  lbracket:           p => generateLBracket(p.width, p.height, p.thickness),
  "solar-pv":         p => generateSolarPVModule(p.width, p.height, p.thickness),
  "solar-array":      p => generateSolarArray(p.rows, p.cols, p.tilt),
  "wind-turbine":     p => generateWindTurbine(p.hubHeight, p.rotorDia),
  "battery-pack":     p => generateBatteryPack(p.width, p.height, p.depth),
  inverter:           p => generateInverterBox(p.width, p.height, p.depth),
  "charge-controller": p => generateChargeController(p.width, p.height),
  tree:               p => generateTree(p.height, p.canopyR),
  "pine-tree":        p => generatePineTree(p.height, p.baseR),
  bush:               p => generateBush(p.radius),
  rock:               p => generateRockFormation(p.size),
  "flower-pot":       p => generateFlowerPot(p.potHeight, p.topRadius),
  engineer:           p => generateEngineer(p.height),
  "standing-person":  p => generatePerson(p.height, "#455a64"),
  "construction-worker": p => generateConstructionWorker(p.height),
  ibeam:              p => generateIBeam(p.height, p.width, p.length),
  cchannel:           p => generateCChannel(p.height, p.width, p.length),
  "pipe-section":     p => generatePipeSection(p.od, p.wallThick, p.length),
  flange:             p => generateFlange(p.od, p.bore, p.bolts),
  motor:              p => generateMotor(p.diameter, p.bodyLength, p.shaftDia),
  valve:              p => generateValve(p.dn),
  "heat-exchanger":   p => generateHeatExchanger(p.shellDia, p.length),
  desk:               p => generateDesk(p.width, p.depth, p.height),
  chair:              p => generateChair(p.seatHeight, p.width),
  "door-frame":       p => generateDoorFrame(p.width, p.height, p.depth),
  staircase:          p => generateStaircase(p.steps, p.width),
};
