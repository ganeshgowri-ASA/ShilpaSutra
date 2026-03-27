/**
 * ifc-engine.ts  –  IFC2x3 / IFC4 parser for ShilpaSutra
 * Parses STEP-P21 text format, extracts spatial hierarchy,
 * geometry, materials and property sets.
 */

/* ── Core types ─────────────────────────────────────────── */
export type IfcSchema = "IFC2X3" | "IFC4" | "IFC4X3" | "UNKNOWN";

export interface IfcEntity {
  id: number;
  type: string;
  attrs: (string | number | null | IfcRef | IfcList)[];
}

export interface IfcRef { ref: number }
export interface IfcList { items: (string | number | null | IfcRef | IfcList)[] }

export interface IfcSpatialNode {
  id: number;
  type: string;
  name: string;
  description: string;
  children: IfcSpatialNode[];
  geometryIds: number[];
  properties: Record<string, string | number | boolean>;
}

export interface IfcMeshData {
  entityId: number;
  entityType: string;
  name: string;
  category: IfcCategory;
  color: [number, number, number];
  vertices: Float32Array;
  indices: Uint32Array;
  position: [number, number, number];
  dimensions: { width: number; height: number; depth: number };
}

export interface IfcPropertySet {
  id: number;
  name: string;
  properties: Record<string, string | number | boolean>;
}

export interface IfcParseResult {
  schema: IfcSchema;
  projectName: string;
  originApplication: string;
  authorName: string;
  creationDate: string;
  entities: Map<number, IfcEntity>;
  spatialRoot: IfcSpatialNode | null;
  meshes: IfcMeshData[];
  propertySets: Map<number, IfcPropertySet>;
  typeCounts: Record<string, number>;
  stats: { totalEntities: number; geometryEntities: number; propertySetCount: number };
}

export type IfcCategory =
  | "wall" | "slab" | "beam" | "column" | "door" | "window"
  | "stair" | "roof" | "ramp" | "furniture" | "space" | "other";

/* ── Category mapping ───────────────────────────────────── */
const CATEGORY_MAP: Record<string, IfcCategory> = {
  IFCWALL: "wall", IFCWALLSTANDARDCASE: "wall",
  IFCSLAB: "slab", IFCFOOTING: "slab",
  IFCBEAM: "beam",
  IFCCOLUMN: "column",
  IFCDOOR: "door",
  IFCWINDOW: "window",
  IFCSTAIR: "stair", IFCSTAIRFLIGHT: "stair",
  IFCROOF: "roof",
  IFCRAMP: "ramp", IFCRAMPFLIGHT: "ramp",
  IFCFURNISHINGELEMENT: "furniture",
  IFCSPACE: "space",
};

export const CATEGORY_COLORS: Record<IfcCategory, [number, number, number]> = {
  wall:      [0.6,  0.45, 0.35],
  slab:      [0.55, 0.55, 0.55],
  beam:      [0.25, 0.45, 0.70],
  column:    [0.30, 0.60, 0.45],
  door:      [0.75, 0.60, 0.35],
  window:    [0.50, 0.75, 0.90],
  stair:     [0.65, 0.50, 0.65],
  roof:      [0.70, 0.35, 0.35],
  ramp:      [0.60, 0.60, 0.40],
  furniture: [0.80, 0.70, 0.55],
  space:     [0.40, 0.70, 0.70],
  other:     [0.50, 0.50, 0.50],
};

/* ── STEP-P21 tokeniser ─────────────────────────────────── */
function parseAttrs(raw: string): IfcEntity["attrs"] {
  const result: IfcEntity["attrs"] = [];
  let i = 0;
  const s = raw.trim();

  function skipWs() { while (i < s.length && /\s/.test(s[i])) i++; }
  function readToken(): string | number | null | IfcRef | IfcList {
    skipWs();
    if (i >= s.length) return null;
    if (s[i] === "#") {
      i++;
      let num = "";
      while (i < s.length && /\d/.test(s[i])) num += s[i++];
      return { ref: parseInt(num, 10) } as IfcRef;
    }
    if (s[i] === "(") {
      i++; // skip '('
      const items: IfcList["items"] = [];
      skipWs();
      while (i < s.length && s[i] !== ")") {
        items.push(readToken());
        skipWs();
        if (s[i] === ",") i++;
        skipWs();
      }
      if (s[i] === ")") i++;
      return { items } as IfcList;
    }
    if (s[i] === "'") {
      i++;
      let str = "";
      while (i < s.length && s[i] !== "'") { str += s[i++]; }
      if (s[i] === "'") i++;
      return str;
    }
    if (s[i] === "$") { i++; return null; }
    if (s[i] === "*") { i++; return "*"; }
    // number or enum
    let tok = "";
    while (i < s.length && s[i] !== "," && s[i] !== ")" && !/\s/.test(s[i])) tok += s[i++];
    if (tok === "" ) return null;
    const n = parseFloat(tok);
    return isNaN(n) ? tok : n;
  }

  let p = 0;
  while (p < s.length) {
    skipWs();
    if (p >= s.length) break;
    result.push(readToken());
    skipWs();
    if (s[i] === ",") i++;
    p = i;
  }
  return result;
}

/* ── Main parser ────────────────────────────────────────── */
export function parseIFC(text: string): IfcParseResult {
  const entities = new Map<number, IfcEntity>();
  const typeCounts: Record<string, number> = {};

  // Header extraction
  let schema: IfcSchema = "UNKNOWN";
  let originApplication = "";
  let authorName = "";
  let creationDate = "";

  const schemaMatch = text.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i);
  if (schemaMatch) {
    const s = schemaMatch[1].toUpperCase();
    if (s.includes("IFC4X3")) schema = "IFC4X3";
    else if (s.includes("IFC4")) schema = "IFC4";
    else if (s.includes("IFC2X3") || s.includes("IFC2X2")) schema = "IFC2X3";
  }

  const appMatch = text.match(/FILE_NAME\s*\([^,]*,\s*'([^']*)',\s*\([^)]*\),\s*\([^)]*\),\s*'([^']*)'/i);
  if (appMatch) { creationDate = appMatch[1]; originApplication = appMatch[2]; }

  const authorMatch = text.match(/FILE_NAME\s*\([^,]*,[^,]*,\s*\('([^']*)'/i);
  if (authorMatch) authorName = authorMatch[1];

  // Parse DATA section entities
  const dataMatch = text.match(/DATA;([\s\S]*?)ENDSEC/i);
  if (dataMatch) {
    const lines = dataMatch[1].split("\n");
    for (const line of lines) {
      const m = line.match(/^\s*#(\d+)\s*=\s*([A-Z][A-Z0-9_]*)\s*\(([^]*?)\)\s*;?\s*$/);
      if (!m) continue;
      const id = parseInt(m[1], 10);
      const type = m[2].toUpperCase();
      const rawAttrs = m[3];
      try {
        const attrs = parseAttrs(rawAttrs);
        entities.set(id, { id, type, attrs });
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      } catch { /* skip malformed entity */ }
    }
  }

  // Helper to resolve string attr
  function str(e: IfcEntity, idx: number): string {
    const v = e.attrs[idx];
    return typeof v === "string" ? v : "";
  }
  function ref(e: IfcEntity, idx: number): number {
    const v = e.attrs[idx];
    return (v && typeof v === "object" && "ref" in v) ? v.ref : -1;
  }

  // Project name
  let projectName = "IFC Model";
  entities.forEach((e) => {
    if (e.type === "IFCPROJECT") projectName = str(e, 2) || projectName;
  });

  // Property sets
  const propertySets = new Map<number, IfcPropertySet>();
  entities.forEach((e) => {
    if (e.type === "IFCPROPERTYSET") {
      const name = str(e, 2);
      const props: Record<string, string | number | boolean> = {};
      const propsListAttr = e.attrs[4];
      if (propsListAttr && typeof propsListAttr === "object" && "items" in propsListAttr) {
        for (const item of propsListAttr.items) {
          if (item && typeof item === "object" && "ref" in item) {
            const pe = entities.get(item.ref);
            if (pe && (pe.type === "IFCPROPERTYSINGLEVALUE" || pe.type === "IFCQUANTITYLENGTH")) {
              const pName = str(pe, 0);
              const pVal = pe.attrs[2];
              if (pName) props[pName] = typeof pVal === "string" || typeof pVal === "number" ? pVal : String(pVal ?? "");
            }
          }
        }
      }
      propertySets.set(e.id, { id: e.id, name, properties: props });
    }
  });

  // Build entity→property set map
  const entityPsets = new Map<number, number[]>();
  entities.forEach((e) => {
    if (e.type === "IFCRELDEFINESBYPROPERTIES") {
      const relObjsAttr = e.attrs[4];
      const psetRef = ref(e, 5);
      if (relObjsAttr && typeof relObjsAttr === "object" && "items" in relObjsAttr) {
        for (const item of relObjsAttr.items) {
          if (item && typeof item === "object" && "ref" in item) {
            const eid = item.ref;
            if (!entityPsets.has(eid)) entityPsets.set(eid, []);
            entityPsets.get(eid)!.push(psetRef);
          }
        }
      }
    }
  });

  // Build spatial hierarchy
  const containsMap = new Map<number, number[]>(); // parent→[child ids]
  entities.forEach((e) => {
    if (e.type === "IFCRELCONTAINEDINSPATIALSTRUCTURE" || e.type === "IFCRELAGGREGATES") {
      const parentRef = ref(e, e.type === "IFCRELAGGREGATES" ? 4 : 5);
      const childrenAttr = e.attrs[e.type === "IFCRELAGGREGATES" ? 5 : 4];
      if (!containsMap.has(parentRef)) containsMap.set(parentRef, []);
      if (childrenAttr && typeof childrenAttr === "object" && "items" in childrenAttr) {
        for (const c of childrenAttr.items) {
          if (c && typeof c === "object" && "ref" in c) containsMap.get(parentRef)!.push(c.ref);
        }
      }
    }
  });

  function buildNode(id: number): IfcSpatialNode {
    const e = entities.get(id)!;
    const name = str(e, 2) || e.type;
    const desc = str(e, 3) || "";
    const props: Record<string, string | number | boolean> = {};
    const psetIds = entityPsets.get(id) || [];
    for (const psid of psetIds) {
      const ps = propertySets.get(psid);
      if (ps) Object.assign(props, ps.properties);
    }
    const children: IfcSpatialNode[] = [];
    for (const cid of containsMap.get(id) || []) {
      if (entities.has(cid)) children.push(buildNode(cid));
    }
    return { id, type: e.type, name, description: desc, children, geometryIds: [], properties: props };
  }

  let spatialRoot: IfcSpatialNode | null = null;
  entities.forEach((e) => {
    if (e.type === "IFCPROJECT") spatialRoot = buildNode(e.id);
  });

  // Generate geometry (simple box per building element)
  const meshes: IfcMeshData[] = [];
  const GEOMETRY_TYPES = new Set(Object.keys(CATEGORY_MAP));
  let gIdx = 0;

  entities.forEach((e) => {
    if (!GEOMETRY_TYPES.has(e.type)) return;
    const name = str(e, 2) || e.type;
    const cat: IfcCategory = CATEGORY_MAP[e.type] || "other";
    const color = CATEGORY_COLORS[cat];

    // Default dimensions by category
    const dims = categoryDefaultDims(cat, gIdx);
    const pos: [number, number, number] = [
      (gIdx % 10) * (dims.width + 0.5),
      dims.height / 2,
      Math.floor(gIdx / 10) * (dims.depth + 0.5),
    ];

    const { vertices, indices } = buildBoxGeometry(pos, dims);
    meshes.push({ entityId: e.id, entityType: e.type, name, category: cat, color, vertices, indices, position: pos, dimensions: dims });
    gIdx++;
  });

  const stats = {
    totalEntities: entities.size,
    geometryEntities: meshes.length,
    propertySetCount: propertySets.size,
  };

  return { schema, projectName, originApplication, authorName, creationDate, entities, spatialRoot, meshes, propertySets, typeCounts, stats };
}

/* ── Geometry helpers ───────────────────────────────────── */
function categoryDefaultDims(cat: IfcCategory, idx: number): { width: number; height: number; depth: number } {
  const seed = ((idx * 7 + 3) % 5) * 0.1 + 1.0; // slight variation
  switch (cat) {
    case "wall":   return { width: 3.0 * seed, height: 3.0, depth: 0.2 };
    case "slab":   return { width: 4.0, height: 0.2, depth: 4.0 };
    case "beam":   return { width: 3.0 * seed, height: 0.3, depth: 0.2 };
    case "column": return { width: 0.3, height: 3.0, depth: 0.3 };
    case "door":   return { width: 0.9, height: 2.1, depth: 0.1 };
    case "window": return { width: 1.2, height: 1.2, depth: 0.1 };
    case "stair":  return { width: 1.2, height: 2.5, depth: 3.0 };
    case "roof":   return { width: 5.0, height: 0.3, depth: 5.0 };
    case "space":  return { width: 4.0, height: 3.0, depth: 4.0 };
    default:       return { width: 1.0, height: 1.0, depth: 1.0 };
  }
}

function buildBoxGeometry(pos: [number, number, number], dims: { width: number; height: number; depth: number }) {
  const [px, py, pz] = pos;
  const hw = dims.width / 2, hh = dims.height / 2, hd = dims.depth / 2;

  const verts = new Float32Array([
    // positions (x,y,z)  normals (nx,ny,nz)
    // Front
    px-hw, py-hh, pz+hd, 0,0,1,  px+hw, py-hh, pz+hd, 0,0,1,
    px+hw, py+hh, pz+hd, 0,0,1,  px-hw, py+hh, pz+hd, 0,0,1,
    // Back
    px+hw, py-hh, pz-hd, 0,0,-1, px-hw, py-hh, pz-hd, 0,0,-1,
    px-hw, py+hh, pz-hd, 0,0,-1, px+hw, py+hh, pz-hd, 0,0,-1,
    // Left
    px-hw, py-hh, pz-hd,-1,0,0,  px-hw, py-hh, pz+hd,-1,0,0,
    px-hw, py+hh, pz+hd,-1,0,0,  px-hw, py+hh, pz-hd,-1,0,0,
    // Right
    px+hw, py-hh, pz+hd, 1,0,0,  px+hw, py-hh, pz-hd, 1,0,0,
    px+hw, py+hh, pz-hd, 1,0,0,  px+hw, py+hh, pz+hd, 1,0,0,
    // Top
    px-hw, py+hh, pz+hd, 0,1,0,  px+hw, py+hh, pz+hd, 0,1,0,
    px+hw, py+hh, pz-hd, 0,1,0,  px-hw, py+hh, pz-hd, 0,1,0,
    // Bottom
    px-hw, py-hh, pz-hd, 0,-1,0, px+hw, py-hh, pz-hd, 0,-1,0,
    px+hw, py-hh, pz+hd, 0,-1,0, px-hw, py-hh, pz+hd, 0,-1,0,
  ]);

  const indices = new Uint32Array([
    0,1,2, 0,2,3,    // front
    4,5,6, 4,6,7,    // back
    8,9,10, 8,10,11, // left
    12,13,14, 12,14,15, // right
    16,17,18, 16,18,19, // top
    20,21,22, 20,22,23, // bottom
  ]);

  return { vertices: verts, indices };
}
