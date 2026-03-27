/**
 * ShilpaSutra BOM Generator
 * Extract Bill of Materials from CAD feature tree, export CSV/Excel, cost estimation
 */

export interface BOMItem {
  id: string;
  partName: string;
  partNumber: string;
  quantity: number;
  material: string;
  mass: number;          // kg per unit
  dimensions: string;    // e.g. "200×100×50 mm"
  unitCost: number;
  level: number;         // 0 = top-level, 1 = sub-assembly, 2 = component
  parentId?: string;
  children?: string[];
  suppressed?: boolean;
}

export interface BOMSummary {
  totalParts: number;
  totalMass: number;
  totalCost: number;
  uniqueMaterials: string[];
  heaviestPart: string;
  mostExpensive: string;
}

/* ── Material density map (kg/m³) ── */
const MATERIAL_DENSITY: Record<string, number> = {
  "Steel AISI 1045": 7850,
  "Steel AISI 304": 7900,
  "Al 6061-T6": 2700,
  "Al 7075-T6": 2810,
  "Titanium Ti-6Al-4V": 4430,
  "Copper": 8900,
  "Brass": 8500,
  "Polycarbonate": 1200,
  "ABS Plastic": 1050,
  "Nylon PA66": 1140,
  "Grade 8.8": 7800,
  "Chrome Steel": 7810,
  "Spring Steel": 7850,
};

/* ── Estimate mass from dimensions and material ── */
export function estimateMass(material: string, dimensions: string): number {
  const density = MATERIAL_DENSITY[material] ?? 7850; // default steel
  // Parse "WxHxD mm" format
  const match = dimensions.match(/([\d.]+)[×x]([\d.]+)[×x]([\d.]+)/);
  if (!match) return 0;
  const [, w, h, d] = match.map(Number);
  const volumeM3 = (w / 1000) * (h / 1000) * (d / 1000);
  return parseFloat((density * volumeM3).toFixed(4));
}

/* ── Extract BOM from CAD objects ── */
export interface CadObjectLike {
  id: string;
  name: string;
  material?: string;
  dimensions?: { width: number; height: number; depth: number };
  componentType?: string;
  componentParams?: Record<string, number>;
  visible?: boolean;
  suppressed?: boolean;
}

export function extractBOMFromObjects(objects: CadObjectLike[]): BOMItem[] {
  const grouped: Record<string, { item: CadObjectLike; count: number }> = {};

  for (const obj of objects) {
    if (obj.suppressed) continue;
    const key = `${obj.name}__${obj.material || "Steel"}`;
    if (grouped[key]) {
      grouped[key].count += 1;
    } else {
      grouped[key] = { item: obj, count: 1 };
    }
  }

  return Object.entries(grouped).map(([, { item, count }], idx) => {
    const dims = item.dimensions
      ? `${item.dimensions.width}×${item.dimensions.height}×${item.dimensions.depth} mm`
      : "—";
    const material = item.material || "Steel AISI 1045";
    const mass = item.dimensions
      ? estimateMass(material, `${item.dimensions.width}x${item.dimensions.height}x${item.dimensions.depth}`)
      : 0.1;

    return {
      id: item.id,
      partName: item.name,
      partNumber: `SS-${String(idx + 1).padStart(3, "0")}`,
      quantity: count,
      material,
      mass,
      dimensions: dims,
      unitCost: 0,
      level: 0,
    };
  });
}

/* ── Build nested BOM from feature tree ── */
export interface FeatureNodeLike {
  id: string;
  name: string;
  type: string;
  children: string[];
  parentId?: string;
  params?: Record<string, unknown>;
}

export function buildNestedBOM(
  nodes: FeatureNodeLike[],
  objects: CadObjectLike[],
  parentId?: string,
  level = 0
): BOMItem[] {
  const result: BOMItem[] = [];
  const objectMap = new Map(objects.map(o => [o.id, o]));

  const topLevel = nodes.filter(n =>
    parentId ? n.parentId === parentId : !n.parentId
  );

  for (const node of topLevel) {
    const obj = objectMap.get(node.id);
    const material = obj?.material || "Steel AISI 1045";
    const dims = obj?.dimensions
      ? `${obj.dimensions.width}×${obj.dimensions.height}×${obj.dimensions.depth} mm`
      : "—";
    const mass = obj?.dimensions
      ? estimateMass(material, `${obj.dimensions.width}x${obj.dimensions.height}x${obj.dimensions.depth}`)
      : 0.1;

    result.push({
      id: node.id,
      partName: node.name,
      partNumber: `SS-${node.id.slice(-3).toUpperCase()}`,
      quantity: 1,
      material,
      mass,
      dimensions: dims,
      unitCost: 0,
      level,
      parentId,
      children: node.children,
    });

    if (node.children.length > 0) {
      const childItems = buildNestedBOM(nodes, objects, node.id, level + 1);
      result.push(...childItems);
    }
  }

  return result;
}

/* ── Summarize BOM ── */
export function summarizeBOM(bom: BOMItem[]): BOMSummary {
  const activeBOM = bom.filter(b => !b.suppressed);
  const totalMass = activeBOM.reduce((s, b) => s + b.quantity * b.mass, 0);
  const totalCost = activeBOM.reduce((s, b) => s + b.quantity * b.unitCost, 0);
  const materials = [...new Set(activeBOM.map(b => b.material))];
  const heaviest = activeBOM.reduce((a, b) => (b.mass > a.mass ? b : a), activeBOM[0] || { partName: "—", mass: 0 });
  const priciest = activeBOM.reduce((a, b) => (b.unitCost > a.unitCost ? b : a), activeBOM[0] || { partName: "—", unitCost: 0 });

  return {
    totalParts: activeBOM.reduce((s, b) => s + b.quantity, 0),
    totalMass: parseFloat(totalMass.toFixed(3)),
    totalCost: parseFloat(totalCost.toFixed(2)),
    uniqueMaterials: materials,
    heaviestPart: heaviest?.partName || "—",
    mostExpensive: priciest?.partName || "—",
  };
}

/* ── Update unit costs ── */
export function applyUnitCosts(bom: BOMItem[], prices: Record<string, number>): BOMItem[] {
  return bom.map(item => ({
    ...item,
    unitCost: prices[item.partName] ?? prices[item.partNumber] ?? item.unitCost,
  }));
}

/* ── Export to CSV ── */
export function exportBOMToCSV(bom: BOMItem[], filename = "bom_export.csv"): void {
  const header = ["#", "Part Name", "Part No.", "Qty", "Material", "Mass/unit (kg)", "Total Mass (kg)", "Dimensions", "Unit Cost ($)", "Total Cost ($)"].join(",");
  const rows = bom.map((b, i) =>
    [
      i + 1,
      `"${b.partName}"`,
      b.partNumber,
      b.quantity,
      `"${b.material}"`,
      b.mass.toFixed(4),
      (b.quantity * b.mass).toFixed(3),
      `"${b.dimensions}"`,
      b.unitCost.toFixed(2),
      (b.quantity * b.unitCost).toFixed(2),
    ].join(",")
  );

  const totalMass = bom.reduce((s, b) => s + b.quantity * b.mass, 0);
  const totalCost = bom.reduce((s, b) => s + b.quantity * b.unitCost, 0);
  rows.push(["", "TOTAL", "", bom.reduce((s, b) => s + b.quantity, 0), "", "", totalMass.toFixed(3), "", "", totalCost.toFixed(2)].join(","));

  const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/* ── Export to Excel-compatible format (TSV in .xls wrapper) ── */
export function exportBOMToExcel(bom: BOMItem[], filename = "bom_export.xls"): void {
  const header = ["#", "Part Name", "Part No.", "Qty", "Material", "Mass/unit (kg)", "Total Mass (kg)", "Dimensions", "Unit Cost ($)", "Total Cost ($)"].join("\t");
  const rows = bom.map((b, i) =>
    [
      i + 1, b.partName, b.partNumber, b.quantity, b.material,
      b.mass.toFixed(4), (b.quantity * b.mass).toFixed(3), b.dimensions,
      b.unitCost.toFixed(2), (b.quantity * b.unitCost).toFixed(2),
    ].join("\t")
  );
  const totalMass = bom.reduce((s, b) => s + b.quantity * b.mass, 0);
  const totalCost = bom.reduce((s, b) => s + b.quantity * b.unitCost, 0);
  rows.push(["", "TOTAL", "", bom.reduce((s, b) => s + b.quantity, 0), "", "", totalMass.toFixed(3), "", "", totalCost.toFixed(2)].join("\t"));

  const xlsContent = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/></head><body><table><tr>${header.split("\t").map(h => `<th>${h}</th>`).join("")}</tr>${rows.map(r => `<tr>${r.split("\t").map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</table></body></html>`;
  const blob = new Blob([xlsContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/* ── Sample BOM for demos ── */
export function getSampleBOM(): BOMItem[] {
  return [
    { id: "b1", partName: "Base Plate", partNumber: "SS-001", quantity: 1, material: "Al 6061-T6", mass: 2.1, dimensions: "400×300×10 mm", unitCost: 45.00, level: 0 },
    { id: "b2", partName: "Bracket Left", partNumber: "SS-002", quantity: 1, material: "Steel AISI 304", mass: 1.4, dimensions: "150×100×8 mm", unitCost: 32.00, level: 0 },
    { id: "b3", partName: "Bracket Right", partNumber: "SS-003", quantity: 1, material: "Steel AISI 304", mass: 1.4, dimensions: "150×100×8 mm", unitCost: 32.00, level: 0 },
    { id: "b4", partName: "Shaft", partNumber: "SS-004", quantity: 1, material: "Steel AISI 1045", mass: 0.8, dimensions: "Ø30×200 mm", unitCost: 18.50, level: 0 },
    { id: "b5", partName: "Motor Mount", partNumber: "SS-005", quantity: 1, material: "Al 6061-T6", mass: 0.9, dimensions: "120×80×15 mm", unitCost: 28.00, level: 0 },
    { id: "b6", partName: "M8 Hex Bolt", partNumber: "SS-006", quantity: 12, material: "Grade 8.8", mass: 0.04, dimensions: "M8×30 mm", unitCost: 0.85, level: 0 },
    { id: "b7", partName: "M8 Nut", partNumber: "SS-007", quantity: 12, material: "Grade 8.8", mass: 0.02, dimensions: "M8 mm", unitCost: 0.35, level: 0 },
    { id: "b8", partName: "M8 Washer", partNumber: "SS-008", quantity: 24, material: "Steel AISI 304", mass: 0.01, dimensions: "Ø16×1.5 mm", unitCost: 0.15, level: 0 },
    { id: "b9", partName: "Bearing 6205", partNumber: "SS-009", quantity: 2, material: "Chrome Steel", mass: 0.12, dimensions: "Ø52×Ø25×15 mm", unitCost: 8.50, level: 0 },
    { id: "b10", partName: "Retaining Ring E30", partNumber: "SS-010", quantity: 2, material: "Spring Steel", mass: 0.005, dimensions: "Ø30 mm", unitCost: 1.20, level: 0 },
  ];
}
