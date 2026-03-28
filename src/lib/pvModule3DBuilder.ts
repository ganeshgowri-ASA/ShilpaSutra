/**
 * pvModule3DBuilder.ts — Parametric 3D PV array geometry builder.
 * Outputs JSON solid primitives {type,position,dimensions,rotation,material}
 * Scene unit: 1 unit = 10 mm. All input params in mm.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PVMaterial =
  | "pv_glass" | "pv_cell" | "pv_backsheet" | "al_frame"
  | "al_rail" | "al_zclamp" | "steel_torque" | "steel_leg" | "black_plastic";

export interface SolidPrimitive {
  id: string; name: string;
  type: "box" | "cylinder";
  position: [number, number, number];
  rotation: [number, number, number];
  /** box: [w,h,d]  cylinder: [outerR, length, innerR] — all scene units */
  dimensions: [number, number, number];
  material: PVMaterial;
  group?: string;
}

export interface BOMLine { partName: string; qty: number; material: string; dimensions: string; }

export interface PVBuildResult {
  primitives: SolidPrimitive[];
  bom: BOMLine[];
  meta: { totalModules: number; dcCapacityKWp: number; arraySizeM: [number,number]; tiltDeg: number; rowPitchMm: number; gcr: number; };
}

export interface PVArrayParams {
  moduleWidthMm: number;   // default 1000
  moduleHeightMm: number;  // default 2000
  totalThickMm: number;    // default 35
  frameODmm: number;       // frame outer dim 40mm
  frameWallMm: number;     // 3mm wall
  cols: number;            // modules per row, default 12
  rows: number;            // default 2
  tiltDeg: number;         // default 23
  gapXMm: number;          // inter-module gap, default 20
  rowPitchMm: number;      // default 5500
  torqueMm: number;        // HSS torque tube 80mm
  rearLegMm: number;       // rear leg height 2500
  frontLegMm: number;      // front leg height 1500
  legSizeMm: number;       // leg tube 100mm
  legWallMm: number;       // leg wall 6mm
  legEvery: number;        // leg pair every N modules, default 4
  railMm: number;          // C-channel rail 41mm
  zClampMm: number;        // Z-clamp 35mm
}

export const DEFAULT_ARRAY: PVArrayParams = {
  moduleWidthMm:1000, moduleHeightMm:2000, totalThickMm:35,
  frameODmm:40, frameWallMm:3,
  cols:12, rows:2, tiltDeg:23, gapXMm:20, rowPitchMm:5500,
  torqueMm:80, rearLegMm:2500, frontLegMm:1500,
  legSizeMm:100, legWallMm:6, legEvery:4, railMm:41, zClampMm:35,
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

const S = 0.1; // mm → scene units
let _id = 0;
const uid = (p: string) => `${p}_${++_id}`;

function b(name: string, cx: number, cy: number, cz: number,
           wx: number, wy: number, wz: number,
           rx: number, ry: number, rz: number,
           mat: PVMaterial, group?: string): SolidPrimitive {
  return { id: uid("b"), name, type:"box", position:[cx,cy,cz], rotation:[rx,ry,rz], dimensions:[wx,wy,wz], material:mat, group };
}

function c(name: string, cx: number, cy: number, cz: number,
           oR: number, len: number, iR: number,
           rx: number, ry: number, rz: number,
           mat: PVMaterial, group?: string): SolidPrimitive {
  return { id: uid("c"), name, type:"cylinder", position:[cx,cy,cz], rotation:[rx,ry,rz], dimensions:[oR,len,iR], material:mat, group };
}

// ─── Single module (centred at origin, face = +Z) ─────────────────────────────

function modulePrims(p: PVArrayParams, g: string): SolidPrimitive[] {
  const { moduleWidthMm:W, moduleHeightMm:H, totalThickMm:T, frameODmm:FO, frameWallMm:fw } = p;
  const sw=W*S, sh=H*S, st=T*S, sfo=FO*S, sfw=fw*S;
  const glassT=(T-fw*2)*S, cellT=glassT*0.45, backT=0.3*S;
  const prims: SolidPrimitive[] = [];

  // Glass laminate
  prims.push(b("Glass"     , 0,0,0              , (W-FO*2)*S,(H-FO*2)*S,glassT , 0,0,0,"pv_glass",g));
  prims.push(b("Cell Layer", 0,0,-cellT*0.1     , (W-FO*2-10)*S,(H-FO*2-10)*S,cellT,0,0,0,"pv_cell",g));
  prims.push(b("Backsheet" , 0,0,-(glassT/2+backT/2), (W-FO*2)*S,(H-FO*2)*S,backT,0,0,0,"pv_backsheet",g));

  // Al frame – 4 C-channel members (approx as solid boxes; wall is visual detail)
  prims.push(b("Frame L", -sw/2+sfo/2, 0, 0, sfo,sh,st, 0,0,0,"al_frame",g));
  prims.push(b("Frame R",  sw/2-sfo/2, 0, 0, sfo,sh,st, 0,0,0,"al_frame",g));
  prims.push(b("Frame B",  0,-sh/2+sfo/2, 0, sw,sfo,st, 0,0,0,"al_frame",g));
  prims.push(b("Frame T",  0, sh/2-sfo/2, 0, sw,sfo,st, 0,0,0,"al_frame",g));

  // Junction box (rear centre, 150×100×40mm)
  const jbD=40*S;
  prims.push(b("Junction Box", 0,-sh*0.15, -(glassT/2+jbD/2+backT), 150*S,100*S,jbD, 0,0,0,"black_plastic",g));
  // 3 cable terminals
  const tz=-(glassT/2+jbD+backT+8*S);
  for(let i=-1;i<=1;i++) prims.push(c(`JB Term ${i+2}`, i*30*S,-sh*0.15,tz, 5*S,14*S,2*S, Math.PI/2,0,0,"black_plastic",g));

  return prims;
}

// ─── Full array ───────────────────────────────────────────────────────────────

export function buildPVArray(params: Partial<PVArrayParams> = {}): PVBuildResult {
  const p: PVArrayParams = { ...DEFAULT_ARRAY, ...params };
  const { cols,rows,tiltDeg,gapXMm,rowPitchMm,
          moduleWidthMm:W, moduleHeightMm:H,
          torqueMm:TT, rearLegMm:RL, frontLegMm:FL,
          legSizeMm:LS, legWallMm:LW, legEvery, railMm:RS, zClampMm:ZC, frameODmm:FO } = p;

  const tr = (tiltDeg*Math.PI)/180;
  const sw=W*S, sh=H*S;
  const pitchX=(W+gapXMm)*S;
  const rowPitch=rowPitchMm*S;
  const ttS=TT*S, lS=LS*S, rS=RS*S, zcS=ZC*S, foS=FO*S;
  const arrayW=(cols*W+(cols-1)*gapXMm)*S;
  const x0=-arrayW/2;
  const tubeY=((RL+FL)/2)*S;  // torque tube height
  const ttLen=arrayW+100*S;   // 500mm each side overhang → 100 scene units

  const primitives: SolidPrimitive[] = [];
  const bom: BOMLine[] = [];

  for(let row=0;row<rows;row++){
    const rz=row*rowPitch;
    const rg=`Row${row+1}`;

    // Torque tube
    primitives.push(b(`TorqueTube R${row+1}`, 0,tubeY,rz, ttLen,ttS,ttS, 0,0,0,"steel_torque",rg));

    // Mounting leg pairs
    const legXs: number[] = [];
    for(let c2=0;c2<=cols;c2+=legEvery) legXs.push(c2);
    if(!legXs.includes(cols)) legXs.push(cols);
    for(const ci of legXs){
      const lx=x0+ci*pitchX;
      const bzOff=(H*Math.cos(tr)/2)*S;
      // rear legs (taller, behind panel in Z+)
      primitives.push(b(`RearLeg R${row+1}C${ci}`, lx,RL*S/2,rz+bzOff, lS,RL*S,lS, 0,0,0,"steel_leg",rg));
      // front legs
      primitives.push(b(`FrontLeg R${row+1}C${ci}`, lx,FL*S/2,rz-bzOff, lS,FL*S,lS, 0,0,0,"steel_leg",rg));
    }

    // C-channel rails (2 per row, at 1/3 & 2/3 module height)
    const offsets=[0.17,-0.17];
    offsets.forEach((f,ri)=>{
      const ry2=tubeY+(H*f*Math.sin(tr))*S;
      const rz2=rz+(H*f*Math.cos(tr))*S;
      primitives.push(b(`Rail R${row+1}-${ri+1}`, 0,ry2,rz2, ttLen,rS,rS, tr,0,0,"al_rail",rg));
    });

    // PV modules
    for(let col=0;col<cols;col++){
      const mx=x0+col*pitchX+sw/2;
      const mg=`R${row+1}_C${col+1}`;

      // Flat module primitives → tilt-rotate then translate
      for(const prim of modulePrims(p, mg)){
        const [px,py,pz]=prim.position;
        const ny=py*Math.cos(tr)-pz*Math.sin(tr);
        const nz=py*Math.sin(tr)+pz*Math.cos(tr);
        const [ex,ey,ez]=prim.rotation;
        primitives.push({ ...prim, id:uid("m"),
          position:[mx+px, tubeY+ny, rz+nz],
          rotation:[ex+tr, ey, ez] });
      }

      // Z-clamps at top and bottom
      for(const sign of [1,-1]){
        const cy2=tubeY+sign*(sh/2-foS/2)*Math.cos(tr);
        const cz2=rz +sign*(sh/2-foS/2)*Math.sin(tr);
        primitives.push(b(`ZClamp R${row+1}C${col+1}${sign>0?'T':'B'}`,
          mx,cy2,cz2, zcS,zcS,8*S, tr,0,0,"al_zclamp",mg));
      }
    }
  }

  // BOM
  const total=rows*cols;
  const legPairs=(Math.ceil(cols/legEvery)+1);
  const ttMm=((ttLen/S)).toFixed(0);
  bom.push({partName:`PV Module 2000×1000×35mm`,qty:total,material:"Glass/Si/Al",dimensions:"2000×1000×35mm"});
  bom.push({partName:`Torque Tube ${TT}×${TT}mm HSS`,qty:rows,material:"Galv. Steel",dimensions:`${TT}×${TT}mm × ${ttMm}mm`});
  bom.push({partName:`Rear Leg ${LS}×${LS}mm SHS`,qty:rows*legPairs,material:"Galv. Steel",dimensions:`${LS}×${LS}×${LW}mm wall × H=${RL}mm`});
  bom.push({partName:`Front Leg ${LS}×${LS}mm SHS`,qty:rows*legPairs,material:"Galv. Steel",dimensions:`${LS}×${LS}×${LW}mm wall × H=${FL}mm`});
  bom.push({partName:`C-Rail ${RS}×${RS}mm`,qty:rows*2,material:"Al 6061-T6",dimensions:`${RS}×${RS}mm × ${ttMm}mm`});
  bom.push({partName:`Z-Clamp Al ${ZC}×${ZC}×8mm`,qty:total*2,material:"Al 6061-T6",dimensions:`${ZC}×${ZC}×8mm`});
  bom.push({partName:"Junction Box 150×100×40mm",qty:total,material:"ABS",dimensions:"150×100×40mm"});

  const gcr=parseFloat(((H*Math.cos(tr))/rowPitchMm).toFixed(3));
  return {
    primitives,
    bom,
    meta:{
      totalModules:total,
      dcCapacityKWp:parseFloat((total*0.55).toFixed(1)),
      arraySizeM:[(cols*W+(cols-1)*gapXMm)/1000,(rows*rowPitchMm)/1000],
      tiltDeg, rowPitchMm, gcr,
    },
  };
}

// ─── Prompt parser ────────────────────────────────────────────────────────────

export function parsePVPrompt(prompt: string): Partial<PVArrayParams> {
  const t=prompt.toLowerCase();
  const out: Partial<PVArrayParams>={};
  const modM=t.match(/(\d+)\s*(?:module|panel)/);
  if(modM){ const n=parseInt(modM[1]); out.cols=Math.ceil(n/2); out.rows=2; }
  const rcM=t.match(/(\d+)\s*[x×*]\s*(\d+)/);
  if(rcM){ out.rows=parseInt(rcM[1]); out.cols=parseInt(rcM[2]); }
  const tiltM=t.match(/(\d+)\s*(?:deg|°)/);
  if(tiltM) out.tiltDeg=parseInt(tiltM[1]);
  const pitchM=t.match(/(?:row\s*(?:spacing|pitch))\s*[=:]?\s*(\d+(?:\.\d+)?)\s*m/);
  if(pitchM) out.rowPitchMm=parseFloat(pitchM[1])*1000;
  return out;
}

export function isPVPrompt(prompt: string): boolean {
  const t=prompt.toLowerCase();
  return t.includes("pv array")||t.includes("pv module")||t.includes("solar panel")
    ||t.includes("solar array")||t.includes("photovoltaic")
    ||(t.includes("solar")&&(t.includes("module")||t.includes("rack")||t.includes("mount")));
}
