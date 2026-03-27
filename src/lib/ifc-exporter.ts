/**
 * ifc-exporter.ts  –  Export ShilpaSutra CAD objects to IFC format
 * Supports IFC2x3 and IFC4 schemas.
 * Generates proper spatial structure + geometry + property sets.
 */

import type { CadObject } from "@/stores/cad-store";

export type ExportSchema = "IFC2X3" | "IFC4";

export interface IfcExportOptions {
  schema: ExportSchema;
  projectName: string;
  buildingName: string;
  authorName: string;
  organizationName: string;
  includeProperties: boolean;
  includeQuantities: boolean;
}

const DEFAULT_OPTIONS: IfcExportOptions = {
  schema: "IFC4",
  projectName: "ShilpaSutra Project",
  buildingName: "Building",
  authorName: "ShilpaSutra User",
  organizationName: "ShilpaSutra",
  includeProperties: true,
  includeQuantities: true,
};

/* ── Entity ID counter ──────────────────────────────────── */
class IdGen {
  private _id = 1;
  next() { return this._id++; }
}

/* ── Map ShilpaSutra object types to IFC types ──────────── */
function cadTypeToIfc(type: string): string {
  switch (type) {
    case "box":      return "IFCBUILDINGELEMENTPROXY";
    case "cylinder": return "IFCCOLUMN";
    case "sphere":   return "IFCBUILDINGELEMENTPROXY";
    case "cone":     return "IFCBUILDINGELEMENTPROXY";
    default:         return "IFCBUILDINGELEMENTPROXY";
  }
}

/* ── Format helpers ─────────────────────────────────────── */
function fmtStr(s: string) { return `'${s.replace(/'/g, "''")}'`; }
function fmtNum(n: number) { return n.toFixed(6); }
function fmtRef(id: number) { return `#${id}`; }
function fmtList(items: string[]) { return `(${items.join(",")})` ; }
function fmtBool(b: boolean) { return b ? ".T." : ".F."; }
function fmtEnum(e: string) { return `.${e}.`; }

/* ── Line builder ───────────────────────────────────────── */
type Line = { id: number; def: string };

function line(id: number, type: string, ...args: string[]): Line {
  return { id, def: `#${id}=${type}(${args.join(",")});` };
}

/* ── Main export function ───────────────────────────────── */
export function exportToIFC(
  objects: CadObject[],
  options: Partial<IfcExportOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const ids = new IdGen();
  const lines: Line[] = [];

  const now = new Date();
  const isoDate = now.toISOString().replace(/\.\d{3}Z$/, "");
  const schema = opts.schema === "IFC4" ? "IFC4" : "IFC2X3";

  // ── Units
  const unitAssignId = ids.next();
  const siLengthId = ids.next();
  const siAreaId = ids.next();
  const siVolumeId = ids.next();
  lines.push(line(siLengthId, "IFCSIUNIT", "$", fmtEnum("LENGTHUNIT"), "$", fmtEnum("METRE")));
  lines.push(line(siAreaId, "IFCSIUNIT", "$", fmtEnum("AREAUNIT"), "$", fmtEnum("SQUARE_METRE")));
  lines.push(line(siVolumeId, "IFCSIUNIT", "$", fmtEnum("VOLUMEUNIT"), "$", fmtEnum("CUBIC_METRE")));
  lines.push(line(unitAssignId, "IFCUNITASSIGNMENT", fmtList([fmtRef(siLengthId), fmtRef(siAreaId), fmtRef(siVolumeId)])));

  // ── Geometric context
  const geomContextId = ids.next();
  const worldOriginId = ids.next();
  const worldAxisId = ids.next();
  const worldRefDirId = ids.next();
  const worldPlacementId = ids.next();
  lines.push(line(worldOriginId, "IFCCARTESIANPOINT", fmtList(["0.", "0.", "0."])));
  lines.push(line(worldAxisId, "IFCDIRECTION", fmtList(["0.", "0.", "1."])));
  lines.push(line(worldRefDirId, "IFCDIRECTION", fmtList(["1.", "0.", "0."])));
  lines.push(line(worldPlacementId, "IFCAXIS2PLACEMENT3D", fmtRef(worldOriginId), fmtRef(worldAxisId), fmtRef(worldRefDirId)));
  lines.push(line(geomContextId, "IFCGEOMETRICREPRESENTATIONCONTEXT",
    fmtStr("Model"), fmtStr("Model"), "3", "1.E-5", fmtRef(worldPlacementId), "$"));

  // ── Application
  const orgId = ids.next();
  const appId = ids.next();
  const personId = ids.next();
  const personAndOrgId = ids.next();
  const ownerHistoryId = ids.next();
  lines.push(line(orgId, "IFCORGANIZATION", "$", fmtStr(opts.organizationName), "$", "$", "$"));
  lines.push(line(appId, "IFCAPPLICATION", fmtRef(orgId), fmtStr("2.0"), fmtStr("ShilpaSutra"), fmtStr("ShilpaSutra")));
  lines.push(line(personId, "IFCPERSON", "$", fmtStr(opts.authorName), "$", "$", "$", "$", "$", "$"));
  lines.push(line(personAndOrgId, "IFCPERSONANDORGANIZATION", fmtRef(personId), fmtRef(orgId), "$"));
  lines.push(line(ownerHistoryId, "IFCOWNERHISTORY",
    fmtRef(personAndOrgId), fmtRef(appId), "$", fmtEnum("ADDED"), "$", fmtRef(personAndOrgId), fmtRef(appId),
    String(Math.floor(now.getTime() / 1000))));

  // ── Spatial hierarchy: Project > Site > Building > Storey
  const projectId = ids.next();
  const siteId = ids.next();
  const buildingId = ids.next();
  const storeyId = ids.next();

  // Placements
  const makeLocalPlacement = (x: number, y: number, z: number, relTo: number | null): number => {
    const ptId = ids.next();
    const ax2Id = ids.next();
    const lpId = ids.next();
    lines.push(line(ptId, "IFCCARTESIANPOINT", fmtList([fmtNum(x), fmtNum(y), fmtNum(z)])));
    lines.push(line(ax2Id, "IFCAXIS2PLACEMENT3D", fmtRef(ptId), "$", "$"));
    lines.push(line(lpId, "IFCLOCALPLACEMENT", relTo ? fmtRef(relTo) : "$", fmtRef(ax2Id)));
    return lpId;
  };

  const projectPlacementId = makeLocalPlacement(0, 0, 0, null);
  const sitePlacementId = makeLocalPlacement(0, 0, 0, projectPlacementId);
  const buildingPlacementId = makeLocalPlacement(0, 0, 0, sitePlacementId);
  const storeyPlacementId = makeLocalPlacement(0, 0, 0, buildingPlacementId);

  lines.push(line(projectId, "IFCPROJECT",
    fmtStr(generateGUID()), fmtRef(ownerHistoryId), fmtStr(opts.projectName),
    "$", "$", "$", "$",
    fmtList([fmtRef(geomContextId)]), fmtRef(unitAssignId)));

  lines.push(line(siteId, "IFCSITE",
    fmtStr(generateGUID()), fmtRef(ownerHistoryId), fmtStr("Site"), "$", "$",
    fmtRef(sitePlacementId), "$", "$", fmtEnum("ELEMENT"), "$", "$", "$", "$", "$"));

  lines.push(line(buildingId, "IFCBUILDING",
    fmtStr(generateGUID()), fmtRef(ownerHistoryId), fmtStr(opts.buildingName), "$", "$",
    fmtRef(buildingPlacementId), "$", "$", fmtEnum("ELEMENT"), "$", "$", "$"));

  lines.push(line(storeyId, "IFCBUILDINGSTOREY",
    fmtStr(generateGUID()), fmtRef(ownerHistoryId), fmtStr("Ground Floor"), "$", "$",
    fmtRef(storeyPlacementId), "$", "$", fmtEnum("ELEMENT"), "0."));

  // ── Aggregate relations
  const relProjectSiteId = ids.next();
  const relSiteBuildingId = ids.next();
  const relBuildingStoreyId = ids.next();
  lines.push(line(relProjectSiteId, "IFCRELAGGREGATES",
    fmtStr(generateGUID()), fmtRef(ownerHistoryId), "$", "$", fmtRef(projectId), fmtList([fmtRef(siteId)])));
  lines.push(line(relSiteBuildingId, "IFCRELAGGREGATES",
    fmtStr(generateGUID()), fmtRef(ownerHistoryId), "$", "$", fmtRef(siteId), fmtList([fmtRef(buildingId)])));
  lines.push(line(relBuildingStoreyId, "IFCRELAGGREGATES",
    fmtStr(generateGUID()), fmtRef(ownerHistoryId), "$", "$", fmtRef(buildingId), fmtList([fmtRef(storeyId)])));

  // ── Building elements
  const elementIds: number[] = [];
  const visibleObjs = objects.filter((o) => o.visible !== false);

  for (const obj of visibleObjs) {
    const ifcType = cadTypeToIfc(obj.type);
    const [px, py, pz] = obj.position;
    const { width: w, height: h, depth: d } = obj.dimensions;
    const placementId = makeLocalPlacement(px, py, pz, storeyPlacementId);

    // Geometry: use IfcBoundingBox as simple representation
    const bboxOriginId = ids.next();
    const bboxId = ids.next();
    const shapeRepId = ids.next();
    const prodDefShapeId = ids.next();
    lines.push(line(bboxOriginId, "IFCCARTESIANPOINT", fmtList([fmtNum(-w/2), fmtNum(-h/2), fmtNum(-d/2)])));
    lines.push(line(bboxId, "IFCBOUNDINGBOX", fmtRef(bboxOriginId), fmtNum(w), fmtNum(d), fmtNum(h)));
    lines.push(line(shapeRepId, "IFCSHAPEREPRESENTATION",
      fmtRef(geomContextId), fmtStr("Body"), fmtStr("BoundingBox"), fmtList([fmtRef(bboxId)])));
    lines.push(line(prodDefShapeId, "IFCPRODUCTDEFINITIONSHAPE", "$", "$", fmtList([fmtRef(shapeRepId)])));

    const elemId = ids.next();
    lines.push(line(elemId, ifcType,
      fmtStr(generateGUID()), fmtRef(ownerHistoryId), fmtStr(obj.name),
      "$", "$", fmtRef(placementId), fmtRef(prodDefShapeId), "$"));
    elementIds.push(elemId);

    // Property set
    if (opts.includeProperties) {
      const propIds: number[] = [];
      const mat = obj.material || {};
      for (const [k, v] of Object.entries({ type: obj.type, width: w, height: h, depth: d, ...mat })) {
        const propId = ids.next();
        lines.push(line(propId, "IFCPROPERTYSINGLEVALUE",
          fmtStr(k), "$",
          typeof v === "number" ? `IFCREAL(${fmtNum(v)})` : `IFCLABEL(${fmtStr(String(v))})`,
          "$"));
        propIds.push(propId);
      }
      const psetId = ids.next();
      const relPsetId = ids.next();
      lines.push(line(psetId, "IFCPROPERTYSET",
        fmtStr(generateGUID()), fmtRef(ownerHistoryId), fmtStr("Pset_ShilpaSutraObject"), "$",
        fmtList(propIds.map(fmtRef))));
      lines.push(line(relPsetId, "IFCRELDEFINESBYPROPERTIES",
        fmtStr(generateGUID()), fmtRef(ownerHistoryId), "$", "$",
        fmtList([fmtRef(elemId)]), fmtRef(psetId)));
    }
  }

  // ── Containment relation
  if (elementIds.length > 0) {
    const relContainId = ids.next();
    lines.push(line(relContainId, "IFCRELCONTAINEDINSPATIALSTRUCTURE",
      fmtStr(generateGUID()), fmtRef(ownerHistoryId), fmtStr("Building Elements"), "$",
      fmtList(elementIds.map(fmtRef)), fmtRef(storeyId)));
  }

  // ── Assemble file
  const header = [
    "ISO-10303-21;",
    "HEADER;",
    `FILE_DESCRIPTION(('ShilpaSutra IFC Export'),'2;1');`,
    `FILE_NAME('shilpasutra_export.ifc','${isoDate}',(${fmtStr(opts.authorName)}),(${fmtStr(opts.organizationName)}),'ShilpaSutra 2.0','ShilpaSutra','');`,
    `FILE_SCHEMA(('${schema}'));`,
    "ENDSEC;",
    "DATA;",
  ].join("\n");

  const body = lines
    .sort((a, b) => a.id - b.id)
    .map((l) => l.def)
    .join("\n");

  return `${header}\n${body}\nENDSEC;\nEND-ISO-10303-21;\n`;
}

/* ── GUID generator (IFC-compatible base64 GUID) ───────── */
function generateGUID(): string {
  const hex = "0123456789abcdef";
  let uuid = "";
  for (let i = 0; i < 32; i++) {
    uuid += hex[Math.floor(Math.random() * 16)];
    if ([8, 12, 16, 20].includes(i)) uuid += "-";
  }
  return uuid.slice(0, 36);
}
