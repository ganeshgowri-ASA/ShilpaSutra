"use client";

import { useCallback } from "react";

interface ReportGeneratorProps {
  objectType?: string;
  prompt?: string;
  parts?: { name: string; type: string; material: string; dimensions: { width: number; height: number; depth: number } }[];
  bom?: { partName: string; quantity: number; material: string; dimensions: string; color: string }[];
  simulationResults?: Record<string, any>;
  analysisType?: string;
}

export default function ReportGenerator({
  objectType,
  prompt,
  parts,
  bom,
  simulationResults,
  analysisType,
}: ReportGeneratorProps) {
  const generateReport = useCallback(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const projectId = `SS-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

    // Safety factor calculation
    const sf = simulationResults?.safetyFactor;
    const sfStatus = sf > 2 ? "PASS" : sf > 1 ? "MARGINAL" : "FAIL";
    const sfColor = sf > 2 ? "#22c55e" : sf > 1 ? "#f59e0b" : "#ef4444";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${objectType || "Engineering"} Report — ShilpaSutra</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; color: #1a1a2e; background: #fff; }
    
    /* Title block */
    .title-block { display: grid; grid-template-columns: 1fr auto; border: 2px solid #0d1117; margin: 20px 30px; }
    .title-left { padding: 16px 20px; border-right: 2px solid #0d1117; }
    .title-right { display: grid; grid-template-rows: 1fr 1fr 1fr; min-width: 260px; }
    .title-right > div { padding: 8px 16px; border-bottom: 1px solid #0d1117; display: flex; justify-content: space-between; align-items: center; }
    .title-right > div:last-child { border-bottom: none; }
    .company-name { font-size: 22px; font-weight: 700; color: #0d1117; letter-spacing: -0.5px; }
    .company-sub { font-size: 11px; color: #666; margin-top: 2px; }
    .project-title { font-size: 15px; font-weight: 600; color: #005f8a; margin-top: 8px; }
    .meta-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
    .meta-value { font-size: 12px; font-weight: 600; color: #1a1a2e; }
    
    /* Content */
    .content { max-width: 900px; margin: 0 auto; padding: 30px; }
    h2 { font-size: 14px; font-weight: 700; color: #005f8a; text-transform: uppercase; letter-spacing: 1.5px; margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #00D4FF; }
    h3 { font-size: 12px; font-weight: 600; color: #333; margin: 16px 0 8px; }
    p { font-size: 12px; line-height: 1.6; color: #444; margin-bottom: 8px; }
    
    /* Tables */
    table { width: 100%; border-collapse: collapse; margin: 10px 0 20px; font-size: 11px; }
    th { background: #0d1117; color: white; padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 7px 12px; border-bottom: 1px solid #e5e5e5; }
    tr:nth-child(even) td { background: #f8f9fa; }
    
    /* Status badges */
    .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 700; }
    .badge-pass { background: #dcfce7; color: #166534; }
    .badge-warn { background: #fef3c7; color: #92400e; }
    .badge-fail { background: #fecaca; color: #991b1b; }
    
    /* Contour legend */
    .contour-legend { display: flex; align-items: center; gap: 4px; margin: 10px 0; }
    .contour-bar { display: flex; height: 16px; flex: 1; border-radius: 3px; overflow: hidden; }
    .contour-bar > div { flex: 1; }
    
    /* Results grid */
    .results-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 12px 0; }
    .result-card { border: 1px solid #e5e5e5; border-radius: 6px; padding: 12px; text-align: center; }
    .result-value { font-size: 20px; font-weight: 700; margin: 4px 0; }
    .result-label { font-size: 10px; color: #888; text-transform: uppercase; }
    .result-unit { font-size: 11px; color: #666; }
    
    /* Print */
    @media print { 
      button { display: none !important; } 
      .title-block { margin: 10px 0; }
      .content { padding: 10px; }
    }
    
    .print-btn { background: #00D4FF; color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; margin: 0 30px 20px; }
    .print-btn:hover { background: #00b8d9; }
    .export-btns { display: flex; gap: 8px; margin: 0 30px 20px; }
  </style>
</head>
<body>
  <!-- Title Block (ISO standard layout) -->
  <div class="title-block">
    <div class="title-left">
      <div class="company-name">ShilpaSutra</div>
      <div class="company-sub">AI-Powered CAD · FEA · CFD Platform</div>
      <div class="project-title">${objectType || "Engineering Design"} — Analysis Report</div>
    </div>
    <div class="title-right">
      <div><span class="meta-label">Project ID</span><span class="meta-value">${projectId}</span></div>
      <div><span class="meta-label">Date</span><span class="meta-value">${dateStr}</span></div>
      <div><span class="meta-label">Rev</span><span class="meta-value">A</span></div>
    </div>
  </div>

  <div class="export-btns">
    <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
    <button class="print-btn" style="background:#21262d" onclick="exportAsImage()">📸 Save as Image</button>
  </div>

  <div class="content">
    <h2>1. Design Specification</h2>
    <p><strong>Prompt:</strong> ${prompt || "N/A"}</p>
    <p><strong>Object Type:</strong> ${objectType || "N/A"}</p>
    <p><strong>Total Parts:</strong> ${parts?.length || 0}</p>
    <p><strong>Analysis Type:</strong> ${analysisType ? analysisType.charAt(0).toUpperCase() + analysisType.slice(1) : "N/A"}</p>
    <p><strong>Generated:</strong> ${dateStr} at ${timeStr}</p>

    ${bom && bom.length > 0 ? `
    <h2>2. Bill of Materials (BOM)</h2>
    <table>
      <thead><tr><th>#</th><th>Part Name</th><th>Qty</th><th>Material</th><th>Dimensions</th></tr></thead>
      <tbody>
        ${bom.map((b, i) => `
          <tr>
            <td>${i + 1}</td>
            <td><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${b.color};margin-right:6px;vertical-align:middle;"></span>${b.partName}</td>
            <td>${b.quantity}</td>
            <td>${b.material}</td>
            <td style="font-family:monospace;font-size:10px;">${b.dimensions}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    ` : ""}

    ${simulationResults ? `
    <h2>3. ${analysisType ? analysisType.charAt(0).toUpperCase() + analysisType.slice(1) : ""} Analysis Results</h2>
    
    <!-- Contour Legend -->
    <h3>Color Contour Scale</h3>
    <div class="contour-legend">
      <span style="font-size:10px;color:#888;">MIN</span>
      <div class="contour-bar">
        <div style="background:#0000ff"></div><div style="background:#0080ff"></div>
        <div style="background:#00ffff"></div><div style="background:#00ff00"></div>
        <div style="background:#ffff00"></div><div style="background:#ff8000"></div>
        <div style="background:#ff0000"></div>
      </div>
      <span style="font-size:10px;color:#888;">MAX</span>
    </div>

    <div class="results-grid">
      ${simulationResults.vonMisesStress ? `
        <div class="result-card">
          <div class="result-label">Max Von Mises Stress</div>
          <div class="result-value" style="color:#ef4444">${simulationResults.vonMisesStress.max}</div>
          <div class="result-unit">${simulationResults.vonMisesStress.unit}</div>
        </div>
      ` : ""}
      ${simulationResults.displacement ? `
        <div class="result-card">
          <div class="result-label">Max Displacement</div>
          <div class="result-value" style="color:#3b82f6">${simulationResults.displacement.max}</div>
          <div class="result-unit">${simulationResults.displacement.unit}</div>
        </div>
      ` : ""}
      ${typeof simulationResults.safetyFactor === "number" ? `
        <div class="result-card">
          <div class="result-label">Safety Factor</div>
          <div class="result-value" style="color:${sfColor}">${simulationResults.safetyFactor}</div>
          <div class="result-unit"><span class="badge ${sf > 2 ? "badge-pass" : sf > 1 ? "badge-warn" : "badge-fail"}">${sfStatus}</span></div>
        </div>
      ` : ""}
      ${simulationResults.temperature ? `
        <div class="result-card">
          <div class="result-label">Max Temperature</div>
          <div class="result-value" style="color:#ef4444">${simulationResults.temperature.max}</div>
          <div class="result-unit">${simulationResults.temperature.unit}</div>
        </div>
        <div class="result-card">
          <div class="result-label">Min Temperature</div>
          <div class="result-value" style="color:#3b82f6">${simulationResults.temperature.min}</div>
          <div class="result-unit">${simulationResults.temperature.unit}</div>
        </div>
      ` : ""}
      ${simulationResults.velocity ? `
        <div class="result-card">
          <div class="result-label">Max Velocity</div>
          <div class="result-value" style="color:#3b82f6">${simulationResults.velocity.max}</div>
          <div class="result-unit">${simulationResults.velocity.unit}</div>
        </div>
        <div class="result-card">
          <div class="result-label">Max Pressure</div>
          <div class="result-value" style="color:#22c55e">${simulationResults.pressure?.max || "—"}</div>
          <div class="result-unit">${simulationResults.pressure?.unit || "Pa"}</div>
        </div>
      ` : ""}
    </div>

    ${simulationResults.vonMisesStress || simulationResults.temperature || simulationResults.velocity ? `
    <h3>Detailed Results Table</h3>
    <table>
      <thead><tr><th>Parameter</th><th>Maximum</th><th>Minimum</th><th>Average</th><th>Unit</th><th>Status</th></tr></thead>
      <tbody>
        ${Object.entries(simulationResults)
          .filter(([, v]: [string, any]) => v && typeof v === "object" && "max" in v)
          .map(([key, v]: [string, any]) => {
            const isOk = key.includes("safety") ? v.max > 1 : true;
            return `<tr>
              <td style="font-weight:600">${key.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase())}</td>
              <td style="font-family:monospace">${v.max}</td>
              <td style="font-family:monospace">${v.min ?? "—"}</td>
              <td style="font-family:monospace">${v.avg ?? "—"}</td>
              <td>${v.unit}</td>
              <td><span class="badge ${isOk ? "badge-pass" : "badge-fail"}">${isOk ? "OK" : "CHECK"}</span></td>
            </tr>`;
          }).join("")}
      </tbody>
    </table>
    ` : ""}
    ` : ""}

    <h2>${simulationResults ? "4" : "3"}. Material Properties</h2>
    <table>
      <thead><tr><th>Property</th><th>Value</th><th>Unit</th></tr></thead>
      <tbody>
        <tr><td>Young's Modulus (E)</td><td>205</td><td>GPa</td></tr>
        <tr><td>Poisson's Ratio (ν)</td><td>0.29</td><td>—</td></tr>
        <tr><td>Density (ρ)</td><td>7850</td><td>kg/m³</td></tr>
        <tr><td>Thermal Conductivity (k)</td><td>50</td><td>W/m·K</td></tr>
        <tr><td>Yield Strength (σ_y)</td><td>250</td><td>MPa</td></tr>
      </tbody>
    </table>

    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #ddd;font-size:10px;color:#999;text-align:center;">
      Generated by ShilpaSutra v2.0 — AI-Powered CAD, FEA & CFD Platform<br/>
      Report ID: ${projectId}-R${Math.floor(Math.random() * 900 + 100)} | ${dateStr} ${timeStr}
    </div>
  </div>

  <script>
    function exportAsImage() {
      // Use browser's built-in screenshot via the print dialog
      // For real image export you'd use html2canvas, but this works without dependencies
      alert('To save as image:\\n1. Press Print (Ctrl+P)\\n2. Select "Save as PDF"\\n3. Or use your browser\\'s screenshot tool (F12 → Ctrl+Shift+P → "Capture full size screenshot")');
    }
  </script>
</body>
</html>`;

    const w = window.open("", "_blank", "width=1000,height=900");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }, [objectType, prompt, parts, bom, simulationResults, analysisType]);

  return (
    <button
      onClick={generateReport}
      className="flex items-center gap-1.5 text-[10px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded transition-colors font-medium"
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Export Report (PDF)
    </button>
  );
}
