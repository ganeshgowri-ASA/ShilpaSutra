/**
 * ShilpaSutra Report Generator
 * PDF generation using jsPDF for Design, FEA, CFD, BOM, and Compliance reports
 */
import { jsPDF } from "jspdf";

export type ReportType = "design" | "fea" | "cfd" | "bom" | "compliance" | "manufacturing";

export interface ReportConfig {
  title: string;
  projectName: string;
  projectNumber?: string;
  company: string;
  author: string;
  revision: string;
  date?: string;
  type: ReportType;
  logoDataUrl?: string;
  screenshotDataUrl?: string;
}

export interface AnalysisResult {
  label: string;
  value: string;
  unit: string;
  status: "pass" | "warn" | "fail" | "good" | "warning" | "critical";
}

export interface BOMEntry {
  partName: string;
  partNumber?: string;
  quantity: number;
  material: string;
  mass: number;
  dimensions?: string;
  unitCost: number;
  level?: number;
}

export interface ComplianceCheck {
  clause: string;
  description: string;
  requirement: string;
  actual: string;
  status: "pass" | "fail" | "na";
}

export interface ReportSection {
  title: string;
  content: string;
}

export interface ReportData {
  config: ReportConfig;
  sections: ReportSection[];
  feaResults?: AnalysisResult[];
  cfdResults?: AnalysisResult[];
  bom?: BOMEntry[];
  complianceChecks?: { standard: string; checks: ComplianceCheck[] }[];
}

/* ── Constants ── */
const MARGIN = 20;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const PRIMARY = [0, 180, 219] as const;   // #00B4DB cyan
const DARK = [15, 23, 42] as const;       // dark bg
const GRAY = [100, 116, 139] as const;

/* ── Helpers ── */
function setupFont(doc: jsPDF, size: number, bold = false, color: readonly [number, number, number] = [255, 255, 255]) {
  doc.setFontSize(size);
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setTextColor(color[0], color[1], color[2]);
}

function drawHRule(doc: jsPDF, y: number, color: readonly [number, number, number] = PRIMARY) {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

function drawHeaderFooter(doc: jsPDF, config: ReportConfig, pageNum: number, totalPages: number) {
  // Header bar
  doc.setFillColor(DARK[0], DARK[1], DARK[2]);
  doc.rect(0, 0, PAGE_W, 14, "F");
  setupFont(doc, 8, true, PRIMARY);
  doc.text("ShilpaSutra", MARGIN, 9);
  setupFont(doc, 7, false, GRAY);
  doc.text(`${config.company}  |  ${config.projectName}  |  Rev ${config.revision}`, MARGIN + 30, 9);

  // Footer bar
  doc.setFillColor(DARK[0], DARK[1], DARK[2]);
  doc.rect(0, PAGE_H - 10, PAGE_W, 10, "F");
  setupFont(doc, 7, false, GRAY);
  doc.text(`Generated: ${config.date || new Date().toLocaleDateString()}`, MARGIN, PAGE_H - 4);
  doc.text(`Page ${pageNum} / ${totalPages}`, PAGE_W - MARGIN - 20, PAGE_H - 4);
  doc.text(config.author, PAGE_W / 2, PAGE_H - 4, { align: "center" });
}

function newPage(doc: jsPDF, config: ReportConfig): number {
  doc.addPage();
  return 22; // y after header
}

function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.rect(MARGIN, y, 4, 7, "F");
  setupFont(doc, 12, true, [255, 255, 255]);
  doc.text(title, MARGIN + 7, y + 5.5);
  return y + 12;
}

function drawTable(
  doc: jsPDF,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  startY: number,
  config: ReportConfig
): number {
  let y = startY;
  const rowH = 7;
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();

  // Header row
  doc.setFillColor(DARK[0], DARK[1], DARK[2]);
  doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
  setupFont(doc, 8, true, PRIMARY);
  let x = MARGIN + 2;
  headers.forEach((h, i) => { doc.text(h, x, y + 5); x += colWidths[i]; });
  y += rowH;

  // Data rows
  rows.forEach((row, ri) => {
    if (y > PAGE_H - 20) {
      drawHeaderFooter(doc, config, totalPages, totalPages);
      y = newPage(doc, config);
    }
    if (ri % 2 === 1) {
      doc.setFillColor(22, 27, 34);
      doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
    }
    setupFont(doc, 8, false, [200, 210, 220]);
    x = MARGIN + 2;
    row.forEach((cell, i) => { doc.text(String(cell), x, y + 5); x += colWidths[i]; });
    y += rowH;
  });

  drawHRule(doc, y);
  return y + 4;
}

/* ── Cover Page ── */
function generateCoverPage(doc: jsPDF, config: ReportConfig, toc: string[]): void {
  // Dark background
  doc.setFillColor(DARK[0], DARK[1], DARK[2]);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  // Accent bar
  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.rect(0, 70, 6, 80, "F");

  // Title block
  setupFont(doc, 24, true, [255, 255, 255]);
  doc.text(config.title, MARGIN + 10, 100);
  setupFont(doc, 14, false, PRIMARY);
  doc.text(config.projectName, MARGIN + 10, 112);

  // Meta info
  setupFont(doc, 10, false, GRAY);
  const meta = [
    `Company: ${config.company}`,
    `Author: ${config.author}`,
    `Revision: ${config.revision}`,
    `Date: ${config.date || new Date().toLocaleDateString()}`,
    config.projectNumber ? `Part No: ${config.projectNumber}` : "",
  ].filter(Boolean);
  meta.forEach((line, i) => doc.text(line, MARGIN + 10, 130 + i * 7));

  // Screenshot placeholder
  if (config.screenshotDataUrl) {
    try {
      doc.addImage(config.screenshotDataUrl, "PNG", MARGIN + 10, 165, 120, 70);
    } catch { /* skip if image fails */ }
  } else {
    doc.setFillColor(22, 27, 34);
    doc.rect(MARGIN + 10, 165, 120, 70, "F");
    setupFont(doc, 9, false, GRAY);
    doc.text("[3D Model Viewport Screenshot]", MARGIN + 40, 203);
  }

  // TOC
  setupFont(doc, 10, true, PRIMARY);
  doc.text("Table of Contents", MARGIN + 10, 248);
  drawHRule(doc, 251, GRAY);
  setupFont(doc, 9, false, [200, 210, 220]);
  toc.forEach((entry, i) => doc.text(entry, MARGIN + 10, 256 + i * 6));

  // Footer
  setupFont(doc, 8, false, GRAY);
  doc.text("ShilpaSutra CAD & CFD Platform  |  Confidential", PAGE_W / 2, PAGE_H - 10, { align: "center" });
}

/* ── Section Generators ── */
function generateTextSection(doc: jsPDF, title: string, content: string, y: number, config: ReportConfig): number {
  y = drawSectionHeader(doc, title, y);
  setupFont(doc, 9, false, [180, 195, 210]);
  const lines = doc.splitTextToSize(content, CONTENT_W - 4);
  lines.forEach((line: string) => {
    if (y > PAGE_H - 20) { drawHeaderFooter(doc, config, 1, 1); y = newPage(doc, config); }
    doc.text(line, MARGIN, y);
    y += 5.5;
  });
  return y + 6;
}

function generateResultsSection(doc: jsPDF, title: string, results: AnalysisResult[], y: number, config: ReportConfig): number {
  y = drawSectionHeader(doc, title, y);
  const statusColor = (s: string): [number,number,number] =>
    s === "pass" || s === "good" ? [34, 197, 94] : s === "warn" || s === "warning" ? [234, 179, 8] : [239, 68, 68];
  const headers = ["Parameter", "Value", "Unit", "Status"];
  const colW = [80, 35, 25, 30];
  const rows = results.map(r => [r.label, r.value, r.unit, r.status.toUpperCase()]);
  y = drawTable(doc, headers, rows, colW, y, config);

  // Color-coded status column overlay
  results.forEach((r, i) => {
    const rowY = y - (results.length - i) * 7 - 4;
    const [cr, cg, cb] = statusColor(r.status);
    setupFont(doc, 8, true, [cr, cg, cb]);
    doc.text(r.status.toUpperCase(), MARGIN + 2 + 80 + 35 + 25, rowY + (results.length - i) * 7 - (results.length - i - 1) * 7);
  });
  return y;
}

function generateBOMSection(doc: jsPDF, bom: BOMEntry[], y: number, config: ReportConfig): number {
  y = drawSectionHeader(doc, "Bill of Materials", y);
  const headers = ["#", "Part Name", "Qty", "Material", "Mass(kg)", "Dims", "Unit($)", "Total($)"];
  const colW = [8, 45, 10, 35, 16, 25, 18, 18];
  const totalMass = bom.reduce((s, b) => s + b.quantity * b.mass, 0);
  const totalCost = bom.reduce((s, b) => s + b.quantity * b.unitCost, 0);
  const rows = bom.map((b, i) => [
    String(i + 1),
    "  ".repeat(b.level || 0) + b.partName,
    String(b.quantity),
    b.material,
    (b.quantity * b.mass).toFixed(3),
    b.dimensions || "—",
    b.unitCost.toFixed(2),
    (b.quantity * b.unitCost).toFixed(2),
  ]);
  rows.push(["", "TOTAL", "", "", totalMass.toFixed(3), "", "", totalCost.toFixed(2)]);
  return drawTable(doc, headers, rows, colW, y, config);
}

function generateComplianceSection(
  doc: jsPDF,
  checks: { standard: string; checks: ComplianceCheck[] }[],
  y: number,
  config: ReportConfig
): number {
  for (const group of checks) {
    y = drawSectionHeader(doc, `Compliance: ${group.standard}`, y);
    const headers = ["Clause", "Description", "Required", "Actual", "Status"];
    const colW = [20, 55, 35, 35, 25];
    const rows = group.checks.map(c => [c.clause, c.description, c.requirement, c.actual, c.status.toUpperCase()]);
    const passCount = group.checks.filter(c => c.status === "pass").length;
    y = drawTable(doc, headers, rows, colW, y, config);
    setupFont(doc, 9, true, passCount === group.checks.length ? [34, 197, 94] : [234, 179, 8]);
    doc.text(`${passCount}/${group.checks.length} checks passed`, MARGIN, y);
    y += 8;
  }
  return y;
}

/* ── Main Export ── */
export function generateReport(data: ReportData): void {
  const { config, sections, feaResults, cfdResults, bom, complianceChecks } = data;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Build TOC entries
  const toc = sections.map((s, i) => `${i + 1}. ${s.title}`);
  if (feaResults) toc.push(`${toc.length + 1}. FEA Analysis Results`);
  if (cfdResults) toc.push(`${toc.length + 1}. CFD Analysis Results`);
  if (bom) toc.push(`${toc.length + 1}. Bill of Materials`);
  if (complianceChecks) toc.push(`${toc.length + 1}. Compliance Checks`);

  // Cover page
  generateCoverPage(doc, config, toc.slice(0, 6));

  // Content pages
  let y = 22;
  for (const section of sections) {
    if (y > PAGE_H - 40) { doc.addPage(); y = 22; }
    y = generateTextSection(doc, section.title, section.content, y, config);
  }

  if (feaResults && feaResults.length > 0) {
    if (y > PAGE_H - 60) { doc.addPage(); y = 22; }
    y = generateResultsSection(doc, "FEA Analysis Results", feaResults, y, config);
  }

  if (cfdResults && cfdResults.length > 0) {
    if (y > PAGE_H - 60) { doc.addPage(); y = 22; }
    y = generateResultsSection(doc, "CFD Analysis Results", cfdResults, y, config);
  }

  if (bom && bom.length > 0) {
    if (y > PAGE_H - 60) { doc.addPage(); y = 22; }
    y = generateBOMSection(doc, bom, y, config);
  }

  if (complianceChecks && complianceChecks.length > 0) {
    if (y > PAGE_H - 60) { doc.addPage(); y = 22; }
    generateComplianceSection(doc, complianceChecks, y, config);
  }

  // Apply header/footer to all pages
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (i > 1) drawHeaderFooter(doc, config, i, totalPages);
  }

  const filename = `${config.projectName.replace(/\s+/g, "_")}_${config.type}_report_Rev${config.revision}.pdf`;
  doc.save(filename);
}

/* ── Natural Language Report Config Builder ── */
export function parseNLReportRequest(prompt: string): Partial<ReportConfig> {
  const lower = prompt.toLowerCase();
  let type: ReportType = "design";
  if (lower.includes("structural") || lower.includes("fea") || lower.includes("stress")) type = "fea";
  else if (lower.includes("cfd") || lower.includes("flow") || lower.includes("thermal")) type = "cfd";
  else if (lower.includes("bom") || lower.includes("bill of material")) type = "bom";
  else if (lower.includes("compliance") || lower.includes("iec") || lower.includes("iso")) type = "compliance";
  else if (lower.includes("manufacturing") || lower.includes("fabrication")) type = "manufacturing";

  const titleMap: Record<ReportType, string> = {
    design: "Design Review Report",
    fea: "Structural Analysis Report",
    cfd: "CFD Analysis Report",
    bom: "Bill of Materials Report",
    compliance: "Compliance Verification Report",
    manufacturing: "Manufacturing Report",
  };

  return { type, title: titleMap[type] };
}

/* ── Pre-built Compliance Data ── */
export const IEC_61215_CHECKS: ComplianceCheck[] = [
  { clause: "10.1", description: "Performance at STC", requirement: "Pmax ≥ rated × 0.98", actual: "Pmax = 99.5% rated", status: "pass" },
  { clause: "10.2", description: "Performance at NOCT", requirement: "Efficiency ≥ 18%", actual: "η = 19.2%", status: "pass" },
  { clause: "10.3", description: "Temperature coefficients", requirement: "Pmax TC ≤ -0.5%/°C", actual: "-0.38%/°C", status: "pass" },
  { clause: "10.4", description: "Low irradiance performance", requirement: "Efficiency ≥ 95% of STC at 200 W/m²", actual: "96.1%", status: "pass" },
  { clause: "10.9", description: "Hot-spot endurance", requirement: "No cell damage after test", actual: "No damage observed", status: "pass" },
  { clause: "10.11", description: "UV preconditioning", requirement: "Pmax degradation ≤ 5%", actual: "2.1% degradation", status: "pass" },
  { clause: "10.13", description: "Damp heat test", requirement: "Pmax degradation ≤ 5%", actual: "3.8% degradation", status: "pass" },
  { clause: "10.18", description: "Mechanical load test", requirement: "No failure at 2400 Pa", actual: "Passed 2400 Pa", status: "pass" },
];

export const IS_800_CHECKS: ComplianceCheck[] = [
  { clause: "6.1", description: "Tension members", requirement: "Td ≤ Ag × fy / γm0", actual: "Utilization: 0.72", status: "pass" },
  { clause: "7.1", description: "Compression members", requirement: "Pd ≤ Ae × fcd", actual: "Utilization: 0.68", status: "pass" },
  { clause: "8.1", description: "Flexural members", requirement: "Md ≤ Zpz × fy / γm0", actual: "Utilization: 0.81", status: "pass" },
  { clause: "9.2", description: "Shear capacity", requirement: "Vd ≤ Av × fyw / (√3 × γm0)", actual: "Utilization: 0.45", status: "pass" },
  { clause: "10.1", description: "Connection design", requirement: "Bolt shear capacity adequate", actual: "SF = 2.1", status: "pass" },
  { clause: "5.6", description: "Deflection limits", requirement: "δ ≤ L/300", actual: "δ = L/420", status: "pass" },
];

export const ISO_2768_CHECKS: ComplianceCheck[] = [
  { clause: "m-K", description: "Linear dimensions ≤100mm", requirement: "±0.1mm", actual: "Max deviation: 0.07mm", status: "pass" },
  { clause: "m-K", description: "Linear dimensions 100–300mm", requirement: "±0.2mm", actual: "Max deviation: 0.14mm", status: "pass" },
  { clause: "m-K", description: "Angular dimensions", requirement: "±0°30′", actual: "Max deviation: 0°22′", status: "pass" },
  { clause: "m-K", description: "Flatness ≤100mm", requirement: "0.1mm", actual: "0.06mm", status: "pass" },
  { clause: "m-K", description: "Roundness", requirement: "0.05mm", actual: "0.03mm", status: "pass" },
  { clause: "m-K", description: "Straightness ≤100mm", requirement: "0.1mm", actual: "0.08mm", status: "pass" },
];
