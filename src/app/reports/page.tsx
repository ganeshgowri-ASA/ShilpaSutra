"use client";
import { useState, useMemo, useCallback } from "react";

/* ── Types ── */
interface ReportSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  editable: boolean;
}

interface AnalysisResult {
  label: string;
  value: string;
  unit: string;
  status: "good" | "warning" | "critical";
}

interface BOMItem {
  id: string;
  partName: string;
  quantity: number;
  material: string;
  mass: number;
  cost: number;
}

type ReportTemplate = "engineering" | "design-review" | "test-report" | "quotation";
type SortDir = "asc" | "desc";

/* ── Sample Data ── */
function generateFEAResults(): AnalysisResult[] {
  return [
    { label: "Max Von Mises Stress", value: "187.4", unit: "MPa", status: "good" },
    { label: "Max Displacement", value: "0.342", unit: "mm", status: "good" },
    { label: "Min Safety Factor", value: "1.82", unit: "", status: "warning" },
    { label: "Total Strain Energy", value: "12.67", unit: "J", status: "good" },
    { label: "Max Principal Stress", value: "201.3", unit: "MPa", status: "warning" },
    { label: "Yield Utilization", value: "68.4", unit: "%", status: "good" },
  ];
}

function generateCFDResults(): AnalysisResult[] {
  return [
    { label: "Max Temperature", value: "94.2", unit: "\u00B0C", status: "warning" },
    { label: "Min Temperature", value: "22.1", unit: "\u00B0C", status: "good" },
    { label: "Avg Temperature", value: "58.3", unit: "\u00B0C", status: "good" },
    { label: "Max Velocity", value: "3.42", unit: "m/s", status: "good" },
    { label: "Drag Coefficient", value: "0.82", unit: "", status: "good" },
    { label: "Heat Transfer Rate", value: "245.8", unit: "W", status: "good" },
  ];
}

function generateBOM(): BOMItem[] {
  return [
    { id: "b1", partName: "Base Plate", quantity: 1, material: "Al 6061-T6", mass: 2.1, cost: 45.00 },
    { id: "b2", partName: "Bracket Left", quantity: 1, material: "Steel AISI 304", mass: 1.4, cost: 32.00 },
    { id: "b3", partName: "Bracket Right", quantity: 1, material: "Steel AISI 304", mass: 1.4, cost: 32.00 },
    { id: "b4", partName: "Shaft", quantity: 1, material: "Steel AISI 304", mass: 0.8, cost: 18.50 },
    { id: "b5", partName: "Motor Mount", quantity: 1, material: "Al 6061-T6", mass: 0.9, cost: 28.00 },
    { id: "b6", partName: "M8 Hex Bolt", quantity: 12, material: "Grade 8.8", mass: 0.04, cost: 0.85 },
    { id: "b7", partName: "M8 Nut", quantity: 12, material: "Grade 8", mass: 0.02, cost: 0.35 },
    { id: "b8", partName: "M8 Washer", quantity: 24, material: "Steel", mass: 0.01, cost: 0.15 },
    { id: "b9", partName: "Bearing 6205", quantity: 2, material: "Chrome Steel", mass: 0.12, cost: 8.50 },
    { id: "b10", partName: "Retaining Ring", quantity: 2, material: "Spring Steel", mass: 0.005, cost: 1.20 },
  ];
}

const convergenceData = Array.from({ length: 50 }, (_, i) => ({
  iteration: i + 1,
  residual: Math.exp(-0.08 * i) * (0.8 + Math.random() * 0.4),
}));

const stressDistribution = Array.from({ length: 20 }, (_, i) => ({
  range: `${i * 10}-${(i + 1) * 10}`,
  count: Math.floor(Math.random() * 40 + 5) * (i < 15 ? 1 : 0.3),
}));

const defaultSections: ReportSection[] = [
  { id: "summary", title: "1. Project Summary", icon: "S", content: "This report presents the engineering analysis results for the Bracket Assembly (SS-BRK-001). The assembly consists of a base plate, two support brackets, a shaft, and motor mount. The design is intended for moderate load applications in industrial automation equipment.", editable: true },
  { id: "specs", title: "2. Design Specifications", icon: "D", content: "Overall dimensions: 400mm x 300mm x 250mm\nTotal mass: 6.74 kg\nPrimary material: Aluminum 6061-T6 (base, motor mount)\nSecondary material: Steel AISI 304 (brackets, shaft)\nDesign life: 10,000 hours\nOperating temperature: -20\u00B0C to 85\u00B0C\nMax operating load: 5 kN", editable: true },
  { id: "fea", title: "3. FEA Analysis Results", icon: "F", content: "Static structural analysis was performed using linear elastic FEM with tetrahedral elements. A total of 24,000 nodes and 18,500 elements were used. Loading: 1000N downward force on top face, fixed support on bottom face. Material: Steel AISI 1045.", editable: true },
  { id: "cfd", title: "4. CFD Analysis Results", icon: "T", content: "Conjugate heat transfer analysis was performed using the k-epsilon turbulence model. Inlet velocity: 1.5 m/s air flow. Heat source: 50W on motor mount surface. Ambient temperature: 22\u00B0C.", editable: true },
  { id: "bom", title: "5. Bill of Materials", icon: "B", content: "", editable: false },
  { id: "drawings", title: "6. Drawing References", icon: "R", content: "Sheet 1: General Assembly (SS-BRK-001-GA)\nSheet 2: Section Views (SS-BRK-001-SEC)\nSheet 3: Detail Views (SS-BRK-001-DET)\n\nAll drawings conform to ISO 128 / ASME Y14.5 standards.", editable: true },
  { id: "conclusions", title: "7. Conclusions & Recommendations", icon: "C", content: "The bracket assembly meets all design requirements with a minimum safety factor of 1.82 (target: 1.5). Thermal analysis shows peak temperature of 94.2\u00B0C which is within the 85\u00B0C operating limit with forced convection. Recommendations:\n- Consider adding a thermal pad between motor mount and bracket for improved heat dissipation\n- Increase fillet radius at bracket-base junction from 2mm to 4mm to reduce stress concentration\n- Add locating pins for assembly repeatability", editable: true },
];

const reportTemplates: { id: ReportTemplate; label: string; desc: string }[] = [
  { id: "engineering", label: "Engineering Report", desc: "Full analysis with FEA/CFD results" },
  { id: "design-review", label: "Design Review", desc: "Summary for design review meetings" },
  { id: "test-report", label: "Test Report", desc: "Test procedures and results" },
  { id: "quotation", label: "Quotation", desc: "Cost estimation and BOM" },
];

/* ── PDF Export ── */
function exportReportPDF(sections: ReportSection[], feaResults: AnalysisResult[], cfdResults: AnalysisResult[], bom: BOMItem[]) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) { alert("Please allow popups to export PDF."); return; }

  const html = `<!DOCTYPE html>
<html><head><title>ShilpaSutra Engineering Report</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; padding: 40px; color: #000; background: #fff; max-width: 800px; margin: 0 auto; }
  .cover { text-align: center; padding: 80px 0; border-bottom: 3px solid #e94560; margin-bottom: 30px; }
  .cover h1 { font-size: 28px; color: #1a1a2e; margin: 0; }
  .cover h2 { font-size: 18px; color: #e94560; margin: 8px 0; }
  .cover .meta { color: #666; font-size: 12px; margin-top: 20px; }
  h2 { font-size: 16px; color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: 4px; margin-top: 30px; }
  h3 { font-size: 13px; color: #333; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0 20px; font-size: 10px; }
  th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: right; }
  th { background: #f0f0f0; font-weight: bold; text-align: center; }
  td:first-child, th:first-child { text-align: left; }
  .good { color: #16a34a; } .warning { color: #d97706; } .critical { color: #dc2626; }
  .toc { margin: 20px 0; } .toc a { text-decoration: none; color: #1a1a2e; }
  .page-num { text-align: center; font-size: 9px; color: #999; margin-top: 40px; }
  pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
  @media print { body { margin: 0; padding: 20px; } }
</style></head><body>
<div class="cover">
  <h1>ENGINEERING ANALYSIS REPORT</h1>
  <h2>Bracket Assembly - SS-BRK-001</h2>
  <div class="meta">
    <p>Project: ShilpaSutra Demo | Author: ShilpaSutra AI</p>
    <p>Date: ${new Date().toLocaleDateString()} | Rev: A</p>
    <p>Software: ShilpaSutra CAD &amp; CFD Platform v2.0</p>
  </div>
</div>
<div class="toc">
  <h2>Table of Contents</h2>
  ${sections.map((s, i) => `<div style="margin:4px 0"><a href="#">${s.title}</a></div>`).join("")}
</div>
${sections.map(s => {
    let sectionHtml = `<h2>${s.title}</h2>`;
    if (s.content) sectionHtml += `<pre>${s.content}</pre>`;
    if (s.id === "fea") {
      sectionHtml += `<h3>FEA Results Summary</h3><table><tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Status</th></tr>`;
      sectionHtml += feaResults.map(r => `<tr><td>${r.label}</td><td>${r.value}</td><td>${r.unit}</td><td class="${r.status}">${r.status.toUpperCase()}</td></tr>`).join("");
      sectionHtml += `</table>`;
    }
    if (s.id === "cfd") {
      sectionHtml += `<h3>CFD Results Summary</h3><table><tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Status</th></tr>`;
      sectionHtml += cfdResults.map(r => `<tr><td>${r.label}</td><td>${r.value}</td><td>${r.unit}</td><td class="${r.status}">${r.status.toUpperCase()}</td></tr>`).join("");
      sectionHtml += `</table>`;
    }
    if (s.id === "bom") {
      sectionHtml += `<table><tr><th>#</th><th>Part Name</th><th>Qty</th><th>Material</th><th>Mass (kg)</th><th>Unit Cost</th><th>Total</th></tr>`;
      sectionHtml += bom.map((b, i) => `<tr><td>${i+1}</td><td>${b.partName}</td><td>${b.quantity}</td><td>${b.material}</td><td>${b.mass.toFixed(3)}</td><td>$${b.cost.toFixed(2)}</td><td>$${(b.quantity * b.cost).toFixed(2)}</td></tr>`).join("");
      const totalMass = bom.reduce((s,b) => s + b.quantity * b.mass, 0);
      const totalCost = bom.reduce((s,b) => s + b.quantity * b.cost, 0);
      sectionHtml += `<tr style="font-weight:bold;background:#f0f0f0"><td colspan="4">TOTAL</td><td>${totalMass.toFixed(3)}</td><td></td><td>$${totalCost.toFixed(2)}</td></tr></table>`;
    }
    return sectionHtml;
  }).join("")}
<div class="page-num">Generated by ShilpaSutra | ${new Date().toISOString()}</div>
</body></html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}

/* ── CSV Export ── */
function exportBOMCSV(bom: BOMItem[]) {
  const header = "Part Name,Quantity,Material,Mass (kg),Unit Cost ($),Total Cost ($)\n";
  const rows = bom.map(b => `${b.partName},${b.quantity},${b.material},${b.mass},${b.cost.toFixed(2)},${(b.quantity * b.cost).toFixed(2)}`).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const link = document.createElement("a");
  link.download = "bom_export.csv";
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

/* ── Main Component ── */
export default function ReportsPage() {
  const [template, setTemplate] = useState<ReportTemplate>("engineering");
  const [sections, setSections] = useState<ReportSection[]>(defaultSections);
  const [activeSection, setActiveSection] = useState("summary");
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const feaResults = useMemo(() => generateFEAResults(), []);
  const cfdResults = useMemo(() => generateCFDResults(), []);
  const bom = useMemo(() => generateBOM(), []);

  const totalMass = bom.reduce((s, b) => s + b.quantity * b.mass, 0);
  const totalCost = bom.reduce((s, b) => s + b.quantity * b.cost, 0);

  const updateSectionContent = (id: string, content: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, content } : s));
  };

  const maxBarHeight = Math.max(...stressDistribution.map(d => d.count));

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#21262d] px-4 py-2 flex items-center gap-3 shrink-0">
        <span className="text-xs font-bold text-[#00D4FF]">Engineering Reports</span>
        <div className="h-5 w-px bg-[#21262d]" />

        {/* Template selector */}
        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value as ReportTemplate)}
          className="bg-[#21262d] text-xs text-white rounded px-2 py-1 border border-[#30363d]"
        >
          {reportTemplates.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>

        <div className="flex-1" />

        {/* Quick stats */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/30 rounded px-2 py-0.5">
            SF: 1.82
          </span>
          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded px-2 py-0.5">
            Peak: 94.2C
          </span>
          <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded px-2 py-0.5">
            Parts: {bom.length}
          </span>
        </div>

        <div className="h-5 w-px bg-[#21262d]" />

        <button
          onClick={() => exportBOMCSV(bom)}
          className="text-[10px] text-slate-400 hover:text-white border border-[#21262d] rounded px-2 py-1 hover:bg-[#21262d]"
        >
          Export BOM CSV
        </button>
        <button
          onClick={() => exportReportPDF(sections, feaResults, cfdResults, bom)}
          className="bg-[#00D4FF] hover:bg-[#00b8d9] text-black text-xs px-4 py-1.5 rounded font-semibold"
        >
          Export PDF
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left - Section Navigator */}
        <div className="w-60 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0">
          <div className="px-3 py-2 border-b border-[#21262d]">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Report Sections</div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full text-left px-3 py-2 rounded text-xs mb-1 flex items-center gap-2 ${
                  activeSection === s.id
                    ? "bg-[#00D4FF]/10 border border-[#00D4FF]/40 text-white"
                    : "text-slate-400 hover:bg-[#21262d] hover:text-white"
                }`}
              >
                <span className="w-5 h-5 rounded bg-[#21262d] text-[10px] flex items-center justify-center font-bold text-[#00D4FF]">{s.icon}</span>
                <span className="truncate">{s.title}</span>
              </button>
            ))}
          </div>

          {/* Template info */}
          <div className="px-3 py-2 border-t border-[#21262d]">
            <div className="text-[9px] text-slate-500">
              Template: <span className="text-white">{reportTemplates.find(t => t.id === template)?.label}</span>
            </div>
            <div className="text-[9px] text-slate-500">
              Sections: <span className="text-white">{sections.length}</span>
            </div>
            <div className="text-[9px] text-slate-500">
              Last updated: <span className="text-white">Just now</span>
            </div>
          </div>
        </div>

        {/* Center - Report Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {sections.filter(s => s.id === activeSection).map(section => (
              <div key={section.id}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">{section.title}</h2>
                  {section.editable && (
                    <button
                      onClick={() => setEditingSection(editingSection === section.id ? null : section.id)}
                      className="text-[10px] text-[#00D4FF] hover:text-white border border-[#21262d] rounded px-2 py-1"
                    >
                      {editingSection === section.id ? "Done" : "Edit"}
                    </button>
                  )}
                </div>

                {/* Content */}
                {section.editable && editingSection === section.id ? (
                  <textarea
                    value={section.content}
                    onChange={(e) => updateSectionContent(section.id, e.target.value)}
                    className="w-full h-48 bg-[#0d1117] text-sm text-slate-300 rounded-lg p-4 border border-[#21262d] focus:border-[#00D4FF] outline-none resize-y font-mono"
                  />
                ) : section.content ? (
                  <div className="bg-[#161b22] rounded-lg p-4 border border-[#21262d] text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {section.content}
                  </div>
                ) : null}

                {/* FEA Results */}
                {section.id === "fea" && (
                  <div className="mt-4 space-y-4">
                    <h3 className="text-sm font-bold text-slate-300">FEA Results Summary</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {feaResults.map(r => (
                        <div key={r.label} className="bg-[#161b22] rounded-lg p-3 border border-[#21262d]">
                          <div className="text-[10px] text-slate-500 uppercase">{r.label}</div>
                          <div className={`text-xl font-bold mt-1 ${r.status === "good" ? "text-green-400" : r.status === "warning" ? "text-amber-400" : "text-red-400"}`}>
                            {r.value} <span className="text-xs font-normal text-slate-500">{r.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Stress Distribution Chart */}
                    <div className="bg-[#161b22] rounded-lg p-4 border border-[#21262d]">
                      <div className="text-xs font-bold text-slate-300 mb-3">Stress Distribution Histogram</div>
                      <div className="flex items-end gap-1 h-32">
                        {stressDistribution.map((d, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center">
                            <div
                              className="w-full rounded-t"
                              style={{
                                height: `${(d.count / maxBarHeight) * 100}%`,
                                backgroundColor: i < 8 ? "#22c55e" : i < 14 ? "#eab308" : "#ef4444",
                                minHeight: "2px",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-[8px] text-slate-500 mt-1">
                        <span>0 MPa</span>
                        <span>100 MPa</span>
                        <span>200 MPa</span>
                      </div>
                    </div>

                    {/* Convergence Plot */}
                    <div className="bg-[#161b22] rounded-lg p-4 border border-[#21262d]">
                      <div className="text-xs font-bold text-slate-300 mb-3">Solver Convergence</div>
                      <div className="flex items-end gap-px h-24">
                        {convergenceData.map((d, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-[#00D4FF]/60 rounded-t"
                            style={{ height: `${Math.min(100, d.residual * 100)}%` }}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-[8px] text-slate-500 mt-1">
                        <span>Iteration 1</span>
                        <span>Iteration 50</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* CFD Results */}
                {section.id === "cfd" && (
                  <div className="mt-4 space-y-4">
                    <h3 className="text-sm font-bold text-slate-300">CFD Results Summary</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {cfdResults.map(r => (
                        <div key={r.label} className="bg-[#161b22] rounded-lg p-3 border border-[#21262d]">
                          <div className="text-[10px] text-slate-500 uppercase">{r.label}</div>
                          <div className={`text-xl font-bold mt-1 ${r.status === "good" ? "text-green-400" : r.status === "warning" ? "text-amber-400" : "text-red-400"}`}>
                            {r.value} <span className="text-xs font-normal text-slate-500">{r.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Temperature Profile */}
                    <div className="bg-[#161b22] rounded-lg p-4 border border-[#21262d]">
                      <div className="text-xs font-bold text-slate-300 mb-3">Temperature Profile Along Flow Path</div>
                      <div className="flex items-end gap-px h-24">
                        {Array.from({ length: 40 }, (_, i) => {
                          const t = i / 39;
                          const temp = 22 + 72 * (1 - Math.exp(-3 * t)) * (0.9 + Math.random() * 0.2);
                          return (
                            <div
                              key={i}
                              className="flex-1 rounded-t"
                              style={{
                                height: `${((temp - 20) / 80) * 100}%`,
                                backgroundColor: temp < 50 ? "#3b82f6" : temp < 70 ? "#22c55e" : temp < 85 ? "#eab308" : "#ef4444",
                              }}
                            />
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[8px] text-slate-500 mt-1">
                        <span>Inlet</span>
                        <span>Mid-section</span>
                        <span>Outlet</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* BOM */}
                {section.id === "bom" && (
                  <div className="mt-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-300">Bill of Materials</h3>
                      <button
                        onClick={() => exportBOMCSV(bom)}
                        className="text-[10px] text-[#00D4FF] hover:text-white border border-[#21262d] rounded px-2 py-1"
                      >
                        Export CSV
                      </button>
                    </div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#161b22]">
                          <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase">#</th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase">Part Name</th>
                          <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-400 uppercase">Qty</th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase">Material</th>
                          <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-400 uppercase">Mass (kg)</th>
                          <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-400 uppercase">Unit Cost</th>
                          <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-400 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bom.map((b, i) => (
                          <tr key={b.id} className={`border-b border-[#21262d] ${i % 2 === 0 ? "bg-[#0d1117]" : "bg-[#161b22]/50"}`}>
                            <td className="px-3 py-1.5 text-xs text-slate-500">{i + 1}</td>
                            <td className="px-3 py-1.5 text-xs text-white font-medium">{b.partName}</td>
                            <td className="px-3 py-1.5 text-xs text-slate-300 text-center">{b.quantity}</td>
                            <td className="px-3 py-1.5 text-xs text-slate-400">{b.material}</td>
                            <td className="px-3 py-1.5 text-xs text-slate-300 text-right font-mono">{(b.quantity * b.mass).toFixed(3)}</td>
                            <td className="px-3 py-1.5 text-xs text-slate-300 text-right font-mono">${b.cost.toFixed(2)}</td>
                            <td className="px-3 py-1.5 text-xs text-white text-right font-mono font-medium">${(b.quantity * b.cost).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#161b22] border-t-2 border-[#00D4FF]">
                          <td colSpan={4} className="px-3 py-2 text-xs text-white font-bold">TOTAL</td>
                          <td className="px-3 py-2 text-xs text-white text-right font-bold font-mono">{totalMass.toFixed(3)}</td>
                          <td className="px-3 py-2 text-xs text-slate-500 text-right">—</td>
                          <td className="px-3 py-2 text-xs text-[#00D4FF] text-right font-bold font-mono">${totalCost.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right - Quick Reference */}
        <div className="w-56 bg-[#161b22] border-l border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
          <div className="px-3 py-2 border-b border-[#21262d]">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Reference</div>
          </div>

          {/* Project Info */}
          <div className="px-3 py-2 border-b border-[#21262d] space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Project</div>
            <div className="text-[9px] text-slate-500">Name: <span className="text-white">Bracket Assembly</span></div>
            <div className="text-[9px] text-slate-500">Part: <span className="text-white">SS-BRK-001</span></div>
            <div className="text-[9px] text-slate-500">Rev: <span className="text-white">A</span></div>
            <div className="text-[9px] text-slate-500">Date: <span className="text-white">2026-03-20</span></div>
          </div>

          {/* Key Metrics */}
          <div className="px-3 py-2 border-b border-[#21262d] space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Key Metrics</div>
            <div className="bg-[#0d1117] rounded p-2 border border-[#21262d]">
              <div className="text-[9px] text-slate-500">Safety Factor</div>
              <div className="text-lg font-bold text-amber-400">1.82</div>
            </div>
            <div className="bg-[#0d1117] rounded p-2 border border-[#21262d]">
              <div className="text-[9px] text-slate-500">Max Stress</div>
              <div className="text-lg font-bold text-green-400">187.4 <span className="text-xs">MPa</span></div>
            </div>
            <div className="bg-[#0d1117] rounded p-2 border border-[#21262d]">
              <div className="text-[9px] text-slate-500">Peak Temperature</div>
              <div className="text-lg font-bold text-amber-400">94.2 <span className="text-xs">C</span></div>
            </div>
            <div className="bg-[#0d1117] rounded p-2 border border-[#21262d]">
              <div className="text-[9px] text-slate-500">Total Mass</div>
              <div className="text-lg font-bold text-blue-400">{totalMass.toFixed(2)} <span className="text-xs">kg</span></div>
            </div>
            <div className="bg-[#0d1117] rounded p-2 border border-[#21262d]">
              <div className="text-[9px] text-slate-500">Estimated Cost</div>
              <div className="text-lg font-bold text-[#00D4FF]">${totalCost.toFixed(0)}</div>
            </div>
          </div>

          {/* Links */}
          <div className="px-3 py-2 space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Related</div>
            <a href="/simulator" className="block text-[10px] text-[#00D4FF] hover:text-white">Open FEA Simulator</a>
            <a href="/cfd" className="block text-[10px] text-[#00D4FF] hover:text-white">Open CFD Analysis</a>
            <a href="/assembly" className="block text-[10px] text-[#00D4FF] hover:text-white">Open Assembly</a>
            <a href="/drawings" className="block text-[10px] text-[#00D4FF] hover:text-white">Open 2D Drawings</a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#161b22] border-t border-[#21262d] px-4 py-1.5 flex items-center gap-4 text-[10px] text-slate-500 shrink-0">
        <span>Template: {reportTemplates.find(t => t.id === template)?.label}</span>
        <span>|</span>
        <span>Sections: {sections.length}</span>
        <span>|</span>
        <span>BOM Items: {bom.length}</span>
        <span>|</span>
        <span>Total Mass: {totalMass.toFixed(2)} kg</span>
        <div className="flex-1" />
        <span>ShilpaSutra Report Engine v2.0</span>
      </div>
    </div>
  );
}
