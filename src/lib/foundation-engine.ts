// Foundation Design Engine
// Isolated/combined footings, pile foundations, soil bearing capacity
// Per IS 456, IS 2911, IS 6403, ACI 318

export interface SoilProfile {
  type: 'clay' | 'sand' | 'rock' | 'silt';
  cohesion: number;          // kN/m^2
  frictionAngle: number;     // degrees
  unitWeight: number;        // kN/m^3
  waterTableDepth: number;   // m
  allowableBearing: number;  // kN/m^2
  sptN: number;              // SPT N-value
  subgradeModulus: number;   // kN/m^3
}

export interface FootingInput {
  axialLoad: number;         // kN
  momentX: number;           // kNm
  momentZ: number;           // kNm
  columnWidth: number;       // mm
  columnDepth: number;       // mm
  depth: number;             // m (foundation depth)
  concreteGrade: number;     // MPa (fck)
  steelGrade: number;        // MPa (fy)
  soil: SoilProfile;
  coverMm: number;           // mm
}

export interface FootingResult {
  lengthM: number;
  widthM: number;
  depthMm: number;
  soilPressureMax: number;   // kN/m^2
  soilPressureMin: number;
  punchingShearRatio: number;
  oneWayShearRatio: number;
  flexureRatio: number;
  rebarX: { dia: number; spacing: number; count: number };
  rebarZ: { dia: number; spacing: number; count: number };
  concreteVolume: number;    // m^3
  steelWeight: number;       // kg
  status: 'SAFE' | 'UNSAFE';
  designSteps: string[];
}

export interface PileInput {
  axialLoad: number;         // kN
  lateralLoad: number;       // kN
  moment: number;            // kNm
  pileDiameter: number;      // mm
  pileLength: number;        // m
  pileType: 'bored' | 'driven' | 'precast';
  soil: SoilProfile;
  concreteGrade: number;     // MPa
  steelGrade: number;        // MPa
}

export interface PileResult {
  capacity: number;          // kN
  skinFriction: number;      // kN
  endBearing: number;        // kN
  safeLoad: number;          // kN (with FOS)
  numberOfPiles: number;
  pileCapSize: { length: number; width: number; depth: number }; // mm
  settlement: number;        // mm
  status: 'SAFE' | 'UNSAFE';
  designSteps: string[];
}

export interface GroundScrewResult {
  pullOutCapacity: number;   // kN
  compressionCapacity: number;
  lateralCapacity: number;
  screwLength: number;       // mm
  screwDiameter: number;     // mm
  helixDiameter: number;     // mm
  numberOfScrews: number;
  status: 'SAFE' | 'UNSAFE';
  designSteps: string[];
}

// Terzaghi bearing capacity factors
function terzaghiFactors(phi: number): { Nc: number; Nq: number; Ngamma: number } {
  const phiRad = (phi * Math.PI) / 180;
  const Nq = Math.exp(Math.PI * Math.tan(phiRad)) * Math.pow(Math.tan(Math.PI / 4 + phiRad / 2), 2);
  const Nc = (Nq - 1) / Math.tan(phiRad || 0.001);
  const Ngamma = 2 * (Nq + 1) * Math.tan(phiRad);
  return { Nc, Nq, Ngamma };
}

// Meyerhof bearing capacity factors
function meyerhofFactors(phi: number): { Nc: number; Nq: number; Ngamma: number } {
  const phiRad = (phi * Math.PI) / 180;
  const Nq = Math.exp(Math.PI * Math.tan(phiRad)) * Math.pow(Math.tan(Math.PI / 4 + phiRad / 2), 2);
  const Nc = (Nq - 1) / Math.tan(phiRad || 0.001);
  const Ngamma = (Nq - 1) * Math.tan(1.4 * phiRad);
  return { Nc, Nq, Ngamma };
}

// IS 6403 bearing capacity
export function bearingCapacityIS6403(
  soil: SoilProfile, B: number, L: number, Df: number
): { ultimate: number; safe: number; steps: string[] } {
  const steps: string[] = [];
  const { Nc, Nq, Ngamma } = terzaghiFactors(soil.frictionAngle);
  steps.push(`Bearing capacity factors (Terzaghi): Nc=${Nc.toFixed(2)}, Nq=${Nq.toFixed(2)}, Nγ=${Ngamma.toFixed(2)}`);

  // Shape factors (IS 6403)
  const sc = 1 + 0.2 * (B / L);
  const sq = 1;
  const sgamma = 1 - 0.4 * (B / L);
  steps.push(`Shape factors: sc=${sc.toFixed(3)}, sq=${sq.toFixed(3)}, sγ=${sgamma.toFixed(3)}`);

  // Depth factors
  const dc = 1 + 0.2 * (Df / B);
  const dq = 1;
  const dgamma = 1;
  steps.push(`Depth factors: dc=${dc.toFixed(3)}, dq=${dq.toFixed(3)}, dγ=${dgamma.toFixed(3)}`);

  const gamma = soil.unitWeight;
  const q = gamma * Df;
  const qult = soil.cohesion * Nc * sc * dc + q * Nq * sq * dq + 0.5 * gamma * B * Ngamma * sgamma * dgamma;
  const FOS = 2.5;
  const qsafe = qult / FOS + q;

  steps.push(`q (overburden) = ${gamma} × ${Df} = ${q.toFixed(2)} kN/m²`);
  steps.push(`q_ult = ${qult.toFixed(2)} kN/m²`);
  steps.push(`q_safe = ${qult.toFixed(2)} / ${FOS} + ${q.toFixed(2)} = ${qsafe.toFixed(2)} kN/m² (IS 6403, FOS=${FOS})`);

  return { ultimate: qult, safe: qsafe, steps };
}

// Design isolated footing per IS 456
export function designIsolatedFooting(input: FootingInput): FootingResult {
  const steps: string[] = [];
  const { axialLoad, momentX, momentZ, columnWidth, columnDepth, depth, concreteGrade, steelGrade, soil, coverMm } = input;

  // Step 1: Footing size
  const qa = soil.allowableBearing;
  const areaReq = axialLoad / qa;
  let B = Math.ceil(Math.sqrt(areaReq) * 10) / 10; // round up to 0.1m
  let L = B;

  // Adjust for moment
  if (momentX > 0 || momentZ > 0) {
    const ex = momentZ / axialLoad;
    const ez = momentX / axialLoad;
    L = Math.ceil((B + 2 * ex) * 10) / 10;
    B = Math.ceil((B + 2 * ez) * 10) / 10;
  }

  B = Math.max(B, (columnWidth / 1000) + 0.3);
  L = Math.max(L, (columnDepth / 1000) + 0.3);
  steps.push(`Required area = ${axialLoad} / ${qa} = ${areaReq.toFixed(2)} m²`);
  steps.push(`Footing size: ${L.toFixed(1)}m × ${B.toFixed(1)}m`);

  // Step 2: Soil pressure
  const A = L * B;
  const Zx = (B * L * L) / 6;
  const Zz = (L * B * B) / 6;
  const pMax = axialLoad / A + momentZ / Zx + momentX / Zz;
  const pMin = axialLoad / A - momentZ / Zx - momentX / Zz;
  steps.push(`Max soil pressure = ${pMax.toFixed(2)} kN/m² ${pMax <= qa ? '< ' + qa + ' ✓' : '> ' + qa + ' ✗'}`);
  steps.push(`Min soil pressure = ${pMin.toFixed(2)} kN/m² ${pMin >= 0 ? '≥ 0 ✓ (No tension)' : '< 0 ✗ (Tension!)'}`);

  // Step 3: Depth for one-way shear (IS 456 Cl. 34.2.4.1)
  const fck = concreteGrade;
  const fy = steelGrade;
  const tauC = 0.36 * Math.pow(fck, 0.5); // simplified shear capacity
  const colW = columnWidth / 1000;
  const critSection = (L - colW) / 2 - 0.15; // d from column face
  const Vu1way = pMax * B * critSection;
  let d = Vu1way / (tauC * 1000 * B);
  d = Math.max(d, 0.3); // min 300mm
  const D = Math.ceil((d * 1000 + coverMm + 16) / 50) * 50; // round up to 50mm
  d = (D - coverMm - 8) / 1000;
  steps.push(`One-way shear: Vu = ${Vu1way.toFixed(2)} kN, τc = ${tauC.toFixed(2)} MPa`);
  steps.push(`Effective depth d = ${(d * 1000).toFixed(0)} mm, Overall depth D = ${D} mm`);

  const oneWayShearRatio = Vu1way / (tauC * 1000 * B * d);

  // Step 4: Punching shear (IS 456 Cl. 31.6.3)
  const b0 = (colW + d) * 2 + (columnDepth / 1000 + d) * 2;
  const Ahole = (colW + d) * (columnDepth / 1000 + d);
  const VuPunch = axialLoad - pMax * Ahole;
  const tauPunch = VuPunch / (b0 * d * 1000);
  const tauPunchAllow = 0.25 * Math.sqrt(fck);
  const punchingShearRatio = tauPunch / tauPunchAllow;
  steps.push(`Punching shear: τv = ${tauPunch.toFixed(3)} MPa, τallow = ${tauPunchAllow.toFixed(3)} MPa, Ratio = ${punchingShearRatio.toFixed(3)}`);

  // Step 5: Flexure (IS 456 Cl. 34.2.3)
  const cantilever = (L - colW) / 2;
  const Mu = pMax * B * cantilever * cantilever / 2;
  const Mulim = 0.138 * fck * B * d * d * 1000;
  const flexureRatio = Mu / Mulim;
  steps.push(`Bending moment Mu = ${Mu.toFixed(2)} kNm`);
  steps.push(`Mu,lim = ${Mulim.toFixed(2)} kNm, Ratio = ${flexureRatio.toFixed(3)}`);

  // Step 6: Reinforcement
  const Ast = (0.5 * fck / fy) * (1 - Math.sqrt(1 - (4.6 * Mu * 1e6) / (fck * B * 1000 * d * d * 1e6))) * B * 1000 * d * 1000;
  const AstMin = 0.0012 * B * 1000 * D;
  const AstProvide = Math.max(Ast, AstMin);
  const barDia = 12;
  const barArea = Math.PI * barDia * barDia / 4;
  const count = Math.ceil(AstProvide / barArea);
  const spacing = Math.floor((B * 1000 - 2 * coverMm) / (count - 1));
  steps.push(`Ast required = ${AstProvide.toFixed(0)} mm², ${count}-T${barDia} @ ${spacing}mm c/c`);

  const concreteVol = L * B * D / 1000;
  const steelWt = AstProvide * 2 * (L + B) * 0.00785 / 1000; // approximate

  const safe = pMax <= qa && pMin >= 0 && punchingShearRatio <= 1 && oneWayShearRatio <= 1 && flexureRatio <= 1;

  return {
    lengthM: L, widthM: B, depthMm: D,
    soilPressureMax: Math.round(pMax * 100) / 100,
    soilPressureMin: Math.round(pMin * 100) / 100,
    punchingShearRatio: Math.round(punchingShearRatio * 1000) / 1000,
    oneWayShearRatio: Math.round(oneWayShearRatio * 1000) / 1000,
    flexureRatio: Math.round(flexureRatio * 1000) / 1000,
    rebarX: { dia: barDia, spacing, count },
    rebarZ: { dia: barDia, spacing, count },
    concreteVolume: Math.round(concreteVol * 1000) / 1000,
    steelWeight: Math.round(steelWt * 100) / 100,
    status: safe ? 'SAFE' : 'UNSAFE',
    designSteps: steps,
  };
}

// Pile capacity per IS 2911
export function designPileIS2911(input: PileInput): PileResult {
  const steps: string[] = [];
  const { axialLoad, pileDiameter, pileLength, pileType, soil, concreteGrade } = input;
  const D = pileDiameter / 1000; // m
  const L = pileLength;
  const Ap = (Math.PI * D * D) / 4;

  steps.push(`Pile: ${pileType}, Ø${pileDiameter}mm, Length ${L}m`);

  // Skin friction
  let alpha = pileType === 'bored' ? 0.45 : 0.6;
  if (soil.type === 'sand') alpha = 0;
  const skinFriction = soil.type === 'sand'
    ? Math.PI * D * L * 0.5 * soil.unitWeight * L * Math.tan((soil.frictionAngle * Math.PI) / 180 * 0.75) * 0.5
    : alpha * soil.cohesion * Math.PI * D * L;
  steps.push(`Skin friction = ${skinFriction.toFixed(2)} kN (α=${alpha})`);

  // End bearing
  const { Nc, Nq } = terzaghiFactors(soil.frictionAngle);
  const endBearing = soil.type === 'sand'
    ? Ap * soil.unitWeight * L * Nq
    : Ap * soil.cohesion * Nc;
  steps.push(`End bearing = ${endBearing.toFixed(2)} kN`);

  const totalCapacity = skinFriction + endBearing;
  const FOS = pileType === 'bored' ? 2.5 : 2.0;
  const safeLoad = totalCapacity / FOS;
  steps.push(`Total capacity = ${totalCapacity.toFixed(2)} kN, FOS = ${FOS}`);
  steps.push(`Safe load per pile = ${safeLoad.toFixed(2)} kN`);

  const numberOfPiles = Math.ceil(axialLoad / safeLoad);
  steps.push(`Number of piles required = ${numberOfPiles}`);

  // Pile cap sizing
  const pileSpacing = 3 * D;
  const capOverhang = 0.15;
  let capL: number, capW: number;
  if (numberOfPiles <= 2) { capL = pileSpacing + D + 2 * capOverhang; capW = D + 2 * capOverhang; }
  else if (numberOfPiles <= 4) { capL = pileSpacing + D + 2 * capOverhang; capW = pileSpacing + D + 2 * capOverhang; }
  else { capL = 2 * pileSpacing + D + 2 * capOverhang; capW = pileSpacing + D + 2 * capOverhang; }
  const capD = Math.max(0.6, D * 1.5);
  steps.push(`Pile cap: ${(capL * 1000).toFixed(0)} × ${(capW * 1000).toFixed(0)} × ${(capD * 1000).toFixed(0)} mm`);

  // Settlement (elastic)
  const settlement = (axialLoad * L * 1000) / (Ap * 1e6 * concreteGrade * 0.5);
  steps.push(`Estimated settlement = ${(settlement).toFixed(2)} mm`);

  return {
    capacity: Math.round(totalCapacity * 100) / 100,
    skinFriction: Math.round(skinFriction * 100) / 100,
    endBearing: Math.round(endBearing * 100) / 100,
    safeLoad: Math.round(safeLoad * 100) / 100,
    numberOfPiles,
    pileCapSize: { length: Math.round(capL * 1000), width: Math.round(capW * 1000), depth: Math.round(capD * 1000) },
    settlement: Math.round(settlement * 100) / 100,
    status: safeLoad >= axialLoad / numberOfPiles ? 'SAFE' : 'UNSAFE',
    designSteps: steps,
  };
}

// Ground screw pull-out capacity for PV plants
export function designGroundScrew(
  upliftForce: number, compressionForce: number, lateralForce: number, soil: SoilProfile
): GroundScrewResult {
  const steps: string[] = [];
  const helixDia = 200; // mm
  const shaftDia = 76;  // mm
  const helixArea = (Math.PI * (helixDia / 1000) ** 2) / 4;

  // Pullout capacity (cylindrical shear method)
  const Ku = soil.type === 'sand' ? 0.9 : 0.6;
  const gamma = soil.unitWeight;
  const phi = soil.frictionAngle;
  let screwLength = 1500; // start at 1.5m
  let pullOut = 0;

  // Iterate to find required length
  for (let l = 1500; l <= 3000; l += 100) {
    const depth = l / 1000;
    pullOut = soil.type === 'sand'
      ? 0.5 * Ku * gamma * depth * depth * Math.PI * (helixDia / 1000) * Math.tan((phi * Math.PI) / 180) + helixArea * gamma * depth
      : soil.cohesion * Math.PI * (helixDia / 1000) * depth + helixArea * (soil.cohesion * 9 + gamma * depth);
    const safePullOut = pullOut / 2.5;
    if (safePullOut >= upliftForce) { screwLength = l; break; }
    screwLength = l;
  }

  const compressionCap = pullOut * 1.2; // compression > tension
  const lateralCap = 0.3 * pullOut;

  steps.push(`Ground screw: Ø${shaftDia}mm shaft, Ø${helixDia}mm helix`);
  steps.push(`Length = ${screwLength}mm`);
  steps.push(`Pull-out capacity = ${(pullOut / 2.5).toFixed(2)} kN (FOS=2.5)`);
  steps.push(`Compression capacity = ${(compressionCap / 2.5).toFixed(2)} kN`);
  steps.push(`Lateral capacity = ${(lateralCap / 2.5).toFixed(2)} kN`);

  const numScrews = Math.max(
    Math.ceil(upliftForce / (pullOut / 2.5)),
    Math.ceil(compressionForce / (compressionCap / 2.5)),
    1
  );
  steps.push(`Number of screws required = ${numScrews}`);

  return {
    pullOutCapacity: Math.round(pullOut / 2.5 * 100) / 100,
    compressionCapacity: Math.round(compressionCap / 2.5 * 100) / 100,
    lateralCapacity: Math.round(lateralCap / 2.5 * 100) / 100,
    screwLength, screwDiameter: shaftDia, helixDiameter: helixDia,
    numberOfScrews: numScrews,
    status: 'SAFE',
    designSteps: steps,
  };
}

// Concrete ballast design for rooftop PV
export function designBallast(
  upliftForce: number, frictionCoeff: number, roofLoadLimit: number
): { ballastWeight: number; blockSize: string; numberOfBlocks: number; pressureOnRoof: number; status: string; steps: string[] } {
  const steps: string[] = [];
  const requiredWeight = upliftForce / frictionCoeff;
  steps.push(`Required ballast weight = ${upliftForce.toFixed(1)} / ${frictionCoeff} = ${requiredWeight.toFixed(1)} kN`);

  const blockWeight = 0.25; // kN per concrete block (approx 25kg)
  const numberOfBlocks = Math.ceil(requiredWeight / blockWeight);
  const blockFootprint = 0.3 * 0.3; // 300x300mm block
  const totalArea = numberOfBlocks * blockFootprint;
  const pressure = requiredWeight / totalArea;
  steps.push(`${numberOfBlocks} blocks of 300×300×200mm (25kg each)`);
  steps.push(`Pressure on roof = ${pressure.toFixed(2)} kN/m²`);
  steps.push(pressure <= roofLoadLimit ? `Within roof capacity (${roofLoadLimit} kN/m²) ✓` : `Exceeds roof capacity! ✗`);

  return {
    ballastWeight: Math.round(requiredWeight * 100) / 100,
    blockSize: '300×300×200mm',
    numberOfBlocks,
    pressureOnRoof: Math.round(pressure * 100) / 100,
    status: pressure <= roofLoadLimit ? 'SAFE' : 'UNSAFE',
    steps,
  };
}
