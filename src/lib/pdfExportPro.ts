// ─── Professional PDF Export (ShilpaSutra) ───────────────────────────────────
// Multi-view drawing sheet with title block, BOM table, and dimension annotations
// Uses jsPDF (already in package.json) + html2canvas for canvas capture

import type { jsPDF } from "jspdf";

export interface BOMEntry {
  partNo: string;
  description: string;
  qty: number;
  material: string;
  mass?: string;
  notes?: string;
}

export interface TitleBlockData {
  projectName: string;
  modelName: string;
  drawnBy: string;
  checkedBy?: string;
  date: string;
  scale: string;
  revision: string;
  standard: string; // e.g. "IEC 61215", "ISO 9060"
  company?: string;
  drawingNo?: string;
}

export interface ViewCapture {
  label: "FRONT" | "TOP" | "RIGHT" | "ISOMETRIC";
  dataUrl: string;        // base64 PNG from canvas
  width: number;          // pixel width of capture
  height: number;         // pixel height of capture
}

export interface DimensionAnnotation {
  label: string;
  value: string;          // e.g. "2000 mm"
  xRel: number;           // relative x on page (0-1)
  yRel: number;           // relative y on page (0-1)
}

export interface PDFExportOptions {
  titleBlock: TitleBlockData;
  bom?: BOMEntry[];
  dimensions?: DimensionAnnotation[];
  views: ViewCapture[];
  filename?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function drawRect(pdf: jsPDF, x: number, y: number, w: number, h: number, fill?: string) {
  if (fill) {
    pdf.setFillColor(fill);
    pdf.rect(x, y, w, h, "F");
  } else {
    pdf.rect(x, y, w, h, "S");
  }
}

function drawLine(pdf: jsPDF, x1: number, y1: number, x2: number, y2: number) {
  pdf.line(x1, y1, x2, y2);
}

function label(pdf: jsPDF, text: string, x: number, y: number, size: number, color = "#334155", bold = false) {
  pdf.setFontSize(size);
  pdf.setTextColor(color);
  pdf.setFont("helvetica", bold ? "bold" : "normal");
  pdf.text(text, x, y);
}

// ─── Title Block ─────────────────────────────────────────────────────────────

function drawTitleBlock(pdf: jsPDF, tb: TitleBlockData, pageW: number, pageH: number) {
  const blkH = 48;
  const blkY = pageH - blkH - 5;
  const blkX = 15;
  const blkW = pageW - 30;
  const lineH = 8;

  pdf.setDrawColor("#334155");
  pdf.setLineWidth(0.4);

  // Background
  drawRect(pdf, blkX, blkY, blkW, blkH, "#f8fafc");
  pdf.setDrawColor("#334155");
  pdf.setLineWidth(0.6);
  drawRect(pdf, blkX, blkY, blkW, blkH);

  // Brand stripe
  drawRect(pdf, blkX, blkY, 48, blkH, "#0d1117");
  label(pdf, "शिल्पसूत्र", blkX + 4, blkY + 18, 9, "#00D4FF", true);
  label(pdf, "ShilpaSutra", blkX + 4, blkY + 26, 6.5, "#94a3b8");
  label(pdf, "CAD Platform", blkX + 4, blkY + 33, 5.5, "#64748b");

  // Dividers
  pdf.setLineWidth(0.3);
  drawLine(pdf, blkX + 48, blkY, blkX + 48, blkY + blkH);
  const col2 = blkX + 48;
  const colW = (blkW - 48) / 5;

  // Row 1 headers & values
  const r1y = blkY + 4;
  const r2y = blkY + 16;
  const r3y = blkY + 28;
  const r4y = blkY + 40;

  // Helper to draw a cell
  const cell = (x: number, y: number, w: number, hdr: string, val: string) => {
    label(pdf, hdr, x + 2, y + 5, 5, "#64748b");
    label(pdf, val, x + 2, y + 12, 7.5, "#0f172a", true);
    pdf.setLineWidth(0.2);
    drawLine(pdf, x, y, x + w, y);
  };

  cell(col2,               blkY,       colW * 2, "PROJECT", tb.projectName.substring(0, 35));
  cell(col2 + colW * 2,    blkY,       colW,     "MODEL", tb.modelName.substring(0, 20));
  cell(col2 + colW * 3,    blkY,       colW,     "DRAWING No.", tb.drawingNo || "SS-001");
  cell(col2 + colW * 4,    blkY,       colW,     "REV.", tb.revision);

  cell(col2,               blkY + 16,  colW,     "DRAWN BY", tb.drawnBy);
  cell(col2 + colW,        blkY + 16,  colW,     "CHECKED BY", tb.checkedBy || "—");
  cell(col2 + colW * 2,    blkY + 16,  colW,     "DATE", tb.date || formatDate());
  cell(col2 + colW * 3,    blkY + 16,  colW,     "SCALE", tb.scale);
  cell(col2 + colW * 4,    blkY + 16,  colW,     "STANDARD", tb.standard);

  if (tb.company) {
    label(pdf, tb.company, blkX + 4, blkY + 42, 5.5, "#94a3b8");
  }
}

// ─── BOM Table ───────────────────────────────────────────────────────────────

function drawBOMTable(pdf: jsPDF, bom: BOMEntry[], startY: number, pageW: number): number {
  if (!bom.length) return startY;
  const x = 15;
  const w = pageW - 30;
  const rowH = 7;
  const hdrH = 9;
  const cols = [16, w * 0.38, w * 0.08, w * 0.22, w * 0.12, w * 0.12];
  const colX = cols.reduce<number[]>((acc, c, i) => {
    acc.push(i === 0 ? x : acc[i - 1] + cols[i - 1]);
    return acc;
  }, []);

  // Header
  drawRect(pdf, x, startY, w, hdrH, "#1e293b");
  pdf.setDrawColor("#334155");
  pdf.setLineWidth(0.3);
  drawRect(pdf, x, startY, w, hdrH);
  const headers = ["ITEM", "DESCRIPTION", "QTY", "MATERIAL", "MASS", "NOTES"];
  headers.forEach((h, i) => label(pdf, h, colX[i] + 2, startY + 6, 6, "#94a3b8", true));

  let y = startY + hdrH;
  bom.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? "#f8fafc" : "#f1f5f9";
    drawRect(pdf, x, y, w, rowH, bg);
    pdf.setDrawColor("#cbd5e1");
    drawRect(pdf, x, y, w, rowH);
    const cells = [
      row.partNo,
      row.description,
      String(row.qty),
      row.material,
      row.mass || "—",
      row.notes || "—",
    ];
    cells.forEach((c, i) => label(pdf, c.substring(0, 28), colX[i] + 2, y + 5, 6.5, "#0f172a"));
    y += rowH;
  });

  return y + 4;
}

// ─── Multi-View Layout ───────────────────────────────────────────────────────

function drawViews(
  pdf: jsPDF,
  views: ViewCapture[],
  areaX: number,
  areaY: number,
  areaW: number,
  areaH: number,
) {
  if (!views.length) return;

  // Layout: up to 4 views in 2×2 grid
  const pad = 4;
  const cellW = (areaW - pad) / 2;
  const cellH = (areaH - pad) / 2;
  const positions = [
    { x: areaX,             y: areaY },
    { x: areaX + cellW + pad, y: areaY },
    { x: areaX,             y: areaY + cellH + pad },
    { x: areaX + cellW + pad, y: areaY + cellH + pad },
  ];

  views.slice(0, 4).forEach((view, i) => {
    const pos = positions[i];
    const cw = cellW, ch = cellH;

    // View border
    pdf.setDrawColor("#334155");
    pdf.setLineWidth(0.4);
    drawRect(pdf, pos.x, pos.y, cw, ch, "#f8fafc");
    drawRect(pdf, pos.x, pos.y, cw, ch);

    // View label
    label(pdf, view.label, pos.x + 2, pos.y + 5, 7, "#64748b", true);
    drawLine(pdf, pos.x, pos.y + 7, pos.x + cw, pos.y + 7);

    // Image (fit inside cell with padding)
    const imgPad = 6;
    const imgX = pos.x + imgPad;
    const imgY = pos.y + 9;
    const imgW = cw - imgPad * 2;
    const imgH = ch - 12;
    const aspect = view.width / view.height;
    let drawW = imgW;
    let drawH = imgW / aspect;
    if (drawH > imgH) { drawH = imgH; drawW = imgH * aspect; }
    const offsetX = (imgW - drawW) / 2;
    const offsetY = (imgH - drawH) / 2;

    try {
      pdf.addImage(
        view.dataUrl,
        "PNG",
        imgX + offsetX,
        imgY + offsetY,
        drawW,
        drawH,
      );
    } catch {
      // If image fails, draw placeholder
      drawRect(pdf, imgX, imgY, imgW, imgH, "#e2e8f0");
      label(pdf, view.label, imgX + imgW / 2 - 10, imgY + imgH / 2, 8, "#94a3b8");
    }
  });
}

// ─── Dimension Annotations ───────────────────────────────────────────────────

function drawDimensions(
  pdf: jsPDF,
  dims: DimensionAnnotation[],
  pageW: number,
  pageH: number,
) {
  dims.forEach((dim) => {
    const x = dim.xRel * pageW;
    const y = dim.yRel * pageH;
    pdf.setFontSize(6);
    pdf.setTextColor("#0284c7");
    pdf.setFont("helvetica", "bold");
    pdf.text(`${dim.label}: ${dim.value}`, x, y);
    // Small leader line
    pdf.setDrawColor("#0284c7");
    pdf.setLineWidth(0.2);
    pdf.line(x - 3, y - 1, x - 1, y - 1);
  });
}

// ─── Main Export Function ─────────────────────────────────────────────────────

export async function exportProfessionalPDF(options: PDFExportOptions): Promise<void> {
  const { jsPDF: JsPDF } = await import("jspdf");

  const pageW = 297;  // A3 landscape
  const pageH = 210;

  const pdf = new JsPDF({ orientation: "landscape", unit: "mm", format: "a3" });

  // Page border
  pdf.setDrawColor("#334155");
  pdf.setLineWidth(0.8);
  pdf.rect(5, 5, pageW - 10, pageH - 10, "S");
  pdf.setLineWidth(0.3);
  pdf.rect(7, 7, pageW - 14, pageH - 14, "S");

  // Page title (top left)
  label(pdf, "ENGINEERING DRAWING", 15, 14, 9, "#0f172a", true);
  label(pdf, `ShilpaSutra CAD Platform  ·  ${options.titleBlock.standard}`, 15, 20, 6, "#64748b");

  // Draw views in upper area
  const titleBlockH = 54;
  const bomH = options.bom && options.bom.length > 0 ? Math.min(8 + options.bom.length * 7 + 16, 50) : 0;
  const viewAreaY = 22;
  const viewAreaH = pageH - titleBlockH - viewAreaY - (bomH > 0 ? bomH + 4 : 0);

  drawViews(pdf, options.views, 15, viewAreaY, pageW - 30, viewAreaH);

  // Dimension annotations
  if (options.dimensions?.length) {
    drawDimensions(pdf, options.dimensions, pageW, pageH);
  }

  // BOM table (above title block if bom provided)
  if (options.bom && options.bom.length > 0) {
    const bomY = pageH - titleBlockH - bomH - 4;
    label(pdf, "BILL OF MATERIALS", 15, bomY - 2, 7, "#0f172a", true);
    drawBOMTable(pdf, options.bom, bomY, pageW);
  }

  // Title block
  drawTitleBlock(pdf, options.titleBlock, pageW, pageH);

  // Generate filename
  const dateStr = formatDate().replace(/-/g, "");
  const safeName = (options.titleBlock.modelName || "Model").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = options.filename || `ShilpaSutra_${safeName}_${dateStr}.pdf`;

  pdf.save(filename);
}

// ─── Convenience: capture canvas element ─────────────────────────────────────

export async function captureCanvasAsDataUrl(
  canvas: HTMLCanvasElement | null,
): Promise<string | null> {
  if (!canvas) return null;
  return canvas.toDataURL("image/png");
}

// ─── Quick export with single view ───────────────────────────────────────────

export async function quickExportPDF(
  modelName: string,
  canvasDataUrl: string | null,
  bom?: BOMEntry[],
): Promise<void> {
  const today = formatDate();
  const views: ViewCapture[] = canvasDataUrl
    ? [{ label: "ISOMETRIC", dataUrl: canvasDataUrl, width: 1280, height: 720 }]
    : [];

  await exportProfessionalPDF({
    views,
    bom,
    titleBlock: {
      projectName: modelName || "Untitled Project",
      modelName: modelName || "Model",
      drawnBy: "ShilpaSutra AI",
      date: today,
      scale: "NTS",
      revision: "A",
      standard: "IEC 61215 / ISO 9060",
      drawingNo: `SS-${Date.now().toString().slice(-6)}`,
    },
  });
}
