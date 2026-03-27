"use client";
import { useState, useMemo, useCallback } from "react";
import {
  generateReport,
  parseNLReportRequest,
  IEC_61215_CHECKS,
  IS_800_CHECKS,
  ISO_2768_CHECKS,
  type ReportType,
  type AnalysisResult,
} from "@/lib/report-generator";
import {
  getSampleBOM,
  exportBOMToCSV,
  exportBOMToExcel,
  summarizeBOM,
  type BOMItem,
} from "@/lib/bom-generator";

/* ── Types ── */
interface ReportSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  editable: boolean;
  included: boolean;
}

type ReportTemplate = "engineering" | "design-review" | "test-report" | "compliance" | "manufacturing";

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
    { label: "Max Temperature", value: "94.2", unit: "°C", status: "warning" },
    { label: "Min Temperature", value: "22.1", unit: "°C", status: "good" },
    { label: "Max Velocity", value: "3.42", unit: "m/s", status: "good" },
    { label: "Drag Coefficient", value: "0.82", unit: "", status: "good" },
    { label: "Heat Transfer Rate", value: "245.8", unit: "W", status: "good" },
  ];
}

const reportTemplates: { id: ReportTemplate; label: string; desc: string }[] = [
  { id: "engineering", label: "Engineering Report", desc: "Full analysis with FEA/CFD results" },
  { id: "design-review", label: "Design Review", desc: "Summary for design review meetings" },
  { id: "test-report", label: "Test Report", desc: "Test procedures and results" },
  { id: "compliance", label: "Compliance Report", desc: "IEC/ISO/IS standard compliance checks" },
  { id: "manufacturing", label: "Manufacturing Report", desc: "BOM, tolerances, fabrication notes" },
];

const defaultSections: ReportSection[] = [
  { id: "summary", title: "1. Project Summary", icon: "S", included: true, editable: true, content: "This report presents the engineering analysis results for the Bracket Assembly (SS-BRK-001). The assembly consists of a base plate, two support brackets, a shaft, and motor mount. Design is intended for moderate-load industrial automation applications." },
  { id: "specs", title: "2. Design Specifications", icon: "D", included: true, editable: true, content: "Overall dimensions: 400×300×250 mm\nTotal mass: 6.74 kg\nPrimary material: Aluminum 6061-T6\nSecondary material: Steel AISI 304\nDesign life: 10,000 hours\nOperating temperature: −20°C to 85°C\nMax operating load: 5 kN" },
  { id: "fea", title: "3. FEA Analysis Results", icon: "F", included: true, editable: true, content: "Static structural FEM with 24,000 nodes, 18,500 elements. Load: 1000 N downward force on top face; fixed support on bottom face. Material: Steel AISI 1045." },
  { id: "cfd", title: "4. CFD Analysis Results", icon: "T", included: true, editable: true, content: "Conjugate heat transfer, k-ε turbulence model. Inlet: 1.5 m/s air. Heat source: 50 W on motor mount. Ambient: 22°C." },
  { id: "bom", title: "5. Bill of Materials", icon: "B", included: true, editable: false, content: "" },
  { id: "drawings", title: "6. Drawing References", icon: "R", included: true, editable: true, content: "Sheet 1: General Assembly (SS-BRK-001-GA)\nSheet 2: Section Views (SS-BRK-001-SEC)\nSheet 3: Detail Views (SS-BRK-001-DET)\n\nAll drawings conform to ISO 128 / ASME Y14.5 standards." },
  { id: "compliance", title: "7. Compliance Checks", icon: "C", included: false, editable: false, content: "" },
  { id: "conclusions", title: "8. Conclusions", icon: "X", included: true, editable: true, content: "Assembly meets all design requirements with SF = 1.82 (target: 1.5). Peak thermal: 94.2°C within limits under forced convection.\n\nRecommendations:\n• Add thermal pad between motor mount and bracket\n• Increase fillet radius at bracket junction from 2 mm to 4 mm" },
];

const stressDistribution = Array.from({ length: 20 }, (_, i) => ({
  count: Math.floor(Math.random() * 40 + 5) * (i < 15 ? 1 : 0.3),
}));
const convergenceData = Array.from({ length: 50 }, (_, i) => ({
  residual: Math.exp(-0.08 * i) * (0.8 + Math.random() * 0.4),
}));

/* ── Compliance Badge ── */
function ComplianceBadge({ standard, passed, total }: { standard: string; passed: number; total: number }) {
  const ok = passed === total;
  return (
    <div className={`flex items-center gap-1.5 rounded px-2 py-1 border text-[10px] ${ok ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-green-400" : "bg-amber-400"}`} />
      <span className="font-bold">{standard}</span>
      <span>{passed}/{total}</span>
    </div>
  );
}

/* ── Main Component ── */
export default function ReportsPage() {
  const [template, setTemplate] = useState<ReportTemplate>("engineering");
  const [sections, setSections] = useState<ReportSection[]>(defaultSections);
  const [activeSection, setActiveSection] = useState("summary");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [nlPrompt, setNlPrompt] = useState("");
  const [projectName, setProjectName] = useState("Bracket Assembly");
  const [company, setCompany] = useState("ShilpaSutra Engineering");
  const [author, setAuthor] = useState("Engineering Team");
  const [generating, setGenerating] = useState(false);

  const feaResults = useMemo(() => generateFEAResults(), []);
  const cfdResults = useMemo(() => generateCFDResults(), []);
  const bom: BOMItem[] = useMemo(() => getSampleBOM(), []);
  const bomSummary = useMemo(() => summarizeBOM(bom), [bom]);
  const maxBar = Math.max(...stressDistribution.map(d => d.count));

  // Sync included sections when template changes
  const handleTemplateChange = useCallback((t: ReportTemplate) => {
    setTemplate(t);
    setSections((prev: ReportSection[]) => prev.map((s: ReportSection) => ({
      ...s,
      included: t === "compliance"
        ? (s.id === "summary" || s.id === "compliance")
        : t === "manufacturing"
        ? (s.id === "summary" || s.id === "specs" || s.id === "bom")
        : s.id !== "compliance",
    })));
  }, []);

  const updateContent = (id: string, content: string) =>
    setSections((prev: ReportSection[]) => prev.map((s: ReportSection) => s.id === id ? { ...s, content } : s));

  const toggleSection = (id: string) =>
    setSections((prev: ReportSection[]) => prev.map((s: ReportSection) => s.id === id ? { ...s, included: !s.included } : s));

  const handleNLGenerate = () => {
    const cfg = parseNLReportRequest(nlPrompt);
    if (cfg.type) {
      const map: Record<string, ReportTemplate> = { fea: "engineering", cfd: "engineering", bom: "manufacturing", compliance: "compliance", manufacturing: "manufacturing", design: "design-review" };
      handleTemplateChange((map[cfg.type] as ReportTemplate) || "engineering");
    }
    if (cfg.title) setSections((prev: ReportSection[]) => prev.map((s: ReportSection) => s.id === "summary" ? { ...s, content: `${cfg.title} for ${projectName}.\n\nAuto-generated from prompt: "${nlPrompt}"` } : s));
  };

  const handleExportPDF = useCallback(() => {
    setGenerating(true);
    setTimeout(() => {
      try {
        generateReport({
          config: {
            title: reportTemplates.find((t: { id: ReportTemplate; label: string; desc: string }) => t.id === template)?.label || "Engineering Report",
            projectName,
            company,
            author,
            revision: "A",
            type: (template === "compliance" ? "compliance" : template === "manufacturing" ? "manufacturing" : template === "engineering" ? "fea" : "design") as ReportType,
          },
          sections: sections.filter((s: ReportSection) => s.included && s.content).map((s: ReportSection) => ({ title: s.title, content: s.content })),
          feaResults: sections.find((s: ReportSection) => s.id === "fea" && s.included) ? feaResults : undefined,
          cfdResults: sections.find((s: ReportSection) => s.id === "cfd" && s.included) ? cfdResults : undefined,
          bom: sections.find((s: ReportSection) => s.id === "bom" && s.included) ? bom : undefined,
          complianceChecks: sections.find((s: ReportSection) => s.id === "compliance" && s.included)
            ? [
                { standard: "IEC 61215", checks: IEC_61215_CHECKS },
                { standard: "IS 800", checks: IS_800_CHECKS },
                { standard: "ISO 2768 m-K", checks: ISO_2768_CHECKS },
              ]
            : undefined,
        });
      } finally {
        setGenerating(false);
      }
    }, 100);
  }, [sections, feaResults, cfdResults, bom, template, projectName, company, author]);

  const includedSections = sections.filter((s: ReportSection) => s.included);
  const active = sections.find((s: ReportSection) => s.id === activeSection);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#21262d] px-4 py-2 flex items-center gap-2 shrink-0 flex-wrap">
        <span className="text-xs font-bold text-[#00D4FF]">Engineering Reports</span>
        <div className="h-5 w-px bg-[#21262d]" />
        <select value={template} onChange={(e: { target: { value: string } }) => handleTemplateChange(e.target.value as ReportTemplate)}
          className="bg-[#21262d] text-xs text-white rounded px-2 py-1 border border-[#30363d]">
          {reportTemplates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <div className="flex-1" />
        <ComplianceBadge standard="IEC 61215" passed={IEC_61215_CHECKS.filter(c => c.status === "pass").length} total={IEC_61215_CHECKS.length} />
        <ComplianceBadge standard="IS 800" passed={IS_800_CHECKS.filter(c => c.status === "pass").length} total={IS_800_CHECKS.length} />
        <ComplianceBadge standard="ISO 2768" passed={ISO_2768_CHECKS.filter(c => c.status === "pass").length} total={ISO_2768_CHECKS.length} />
        <div className="h-5 w-px bg-[#21262d]" />
        <button onClick={() => exportBOMToCSV(bom)} className="text-[10px] text-slate-400 hover:text-white border border-[#21262d] rounded px-2 py-1 hover:bg-[#21262d]">BOM CSV</button>
        <button onClick={() => exportBOMToExcel(bom)} className="text-[10px] text-slate-400 hover:text-white border border-[#21262d] rounded px-2 py-1 hover:bg-[#21262d]">BOM Excel</button>
        <button onClick={handleExportPDF} disabled={generating}
          className={`text-xs px-4 py-1.5 rounded font-semibold ${generating ? "bg-slate-600 text-slate-400 cursor-wait" : "bg-[#00D4FF] hover:bg-[#00b8d9] text-black"}`}>
          {generating ? "Generating…" : "Export PDF"}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left – Section Navigator */}
        <div className="w-60 bg-[#161b22] border-r border-[#21262d] flex flex-col shrink-0">
          <div className="px-3 py-2 border-b border-[#21262d] flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sections</span>
            <span className="text-[10px] text-slate-500">{includedSections.length}/{sections.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {sections.map((s: ReportSection) => (
              <div key={s.id} className="flex items-center gap-1">
                <input type="checkbox" checked={s.included} onChange={() => toggleSection(s.id)}
                  className="accent-[#00D4FF] shrink-0" />
                <button onClick={() => setActiveSection(s.id)}
                  className={`flex-1 text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 ${activeSection === s.id ? "bg-[#00D4FF]/10 border border-[#00D4FF]/40 text-white" : "text-slate-400 hover:bg-[#21262d] hover:text-white"} ${!s.included ? "opacity-50" : ""}`}>
                  <span className="w-5 h-5 rounded bg-[#21262d] text-[10px] flex items-center justify-center font-bold text-[#00D4FF] shrink-0">{s.icon}</span>
                  <span className="truncate text-[11px]">{s.title}</span>
                </button>
              </div>
            ))}
          </div>
          {/* NL report generator */}
          <div className="px-3 py-2 border-t border-[#21262d]">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">AI Generate</div>
            <textarea value={nlPrompt} onChange={(e: { target: { value: string } }) => setNlPrompt(e.target.value)} rows={2}
              placeholder="e.g. Generate structural report for PV mounting structure"
              className="w-full bg-[#0d1117] text-[10px] text-slate-300 rounded p-1.5 border border-[#21262d] resize-none outline-none focus:border-[#00D4FF]" />
            <button onClick={handleNLGenerate} disabled={!nlPrompt.trim()}
              className="mt-1 w-full text-[10px] bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/30 rounded py-1 hover:bg-[#00D4FF]/20 disabled:opacity-40">
              Configure from Prompt
            </button>
          </div>
          {/* Meta */}
          <div className="px-3 py-2 border-t border-[#21262d] space-y-1">
            <div className="text-[9px] text-slate-500">Template: <span className="text-white">{reportTemplates.find(t => t.id === template)?.label}</span></div>
            <div className="text-[9px] text-slate-500">Total Mass: <span className="text-white">{bomSummary.totalMass.toFixed(2)} kg</span></div>
            <div className="text-[9px] text-slate-500">BOM Cost: <span className="text-[#00D4FF]">${bomSummary.totalCost.toFixed(2)}</span></div>
          </div>
        </div>

        {/* Center – Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Report metadata inputs */}
            <div className="bg-[#161b22] rounded-lg p-4 border border-[#21262d] grid grid-cols-3 gap-3">
              {[{ label: "Project", val: projectName, set: setProjectName }, { label: "Company", val: company, set: setCompany }, { label: "Author", val: author, set: setAuthor }].map(f => (
                <div key={f.label}>
                  <div className="text-[9px] text-slate-500 mb-1">{f.label}</div>
                  <input value={f.val} onChange={(e: { target: { value: string } }) => f.set(e.target.value)}
                    className="w-full bg-[#0d1117] text-xs text-white rounded px-2 py-1 border border-[#21262d] outline-none focus:border-[#00D4FF]" />
                </div>
              ))}
            </div>

            {/* Active section content */}
            {active && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-white">{active.title}</h2>
                  {active.editable && (
                    <button onClick={() => setEditingSection(editingSection === active.id ? null : active.id)}
                      className="text-[10px] text-[#00D4FF] border border-[#21262d] rounded px-2 py-1">
                      {editingSection === active.id ? "Done" : "Edit"}
                    </button>
                  )}
                </div>
                {active.editable && editingSection === active.id ? (
                  <textarea value={active.content} onChange={(e: { target: { value: string } }) => updateContent(active.id, e.target.value)}
                    className="w-full h-40 bg-[#0d1117] text-sm text-slate-300 rounded-lg p-4 border border-[#21262d] focus:border-[#00D4FF] outline-none resize-y font-mono" />
                ) : active.content ? (
                  <div className="bg-[#161b22] rounded-lg p-4 border border-[#21262d] text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {active.content}
                  </div>
                ) : null}

                {/* FEA section */}
                {active.id === "fea" && (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {feaResults.map((r: AnalysisResult) => (
                        <div key={r.label} className="bg-[#161b22] rounded-lg p-3 border border-[#21262d]">
                          <div className="text-[10px] text-slate-500 uppercase">{r.label}</div>
                          <div className={`text-xl font-bold mt-1 ${r.status === "good" ? "text-green-400" : r.status === "warning" ? "text-amber-400" : "text-red-400"}`}>
                            {r.value} <span className="text-xs font-normal text-slate-500">{r.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#161b22] rounded-lg p-4 border border-[#21262d]">
                      <div className="text-xs font-bold text-slate-300 mb-3">Stress Distribution Histogram</div>
                      <div className="flex items-end gap-1 h-28">
                        {stressDistribution.map((d, i) => (
                          <div key={i} className="flex-1 rounded-t" style={{ height: `${(d.count / maxBar) * 100}%`, backgroundColor: i < 8 ? "#22c55e" : i < 14 ? "#eab308" : "#ef4444", minHeight: 2 }} />
                        ))}
                      </div>
                      <div className="flex justify-between text-[8px] text-slate-500 mt-1"><span>0 MPa</span><span>100 MPa</span><span>200 MPa</span></div>
                    </div>
                    <div className="bg-[#161b22] rounded-lg p-4 border border-[#21262d]">
                      <div className="text-xs font-bold text-slate-300 mb-3">Solver Convergence</div>
                      <div className="flex items-end gap-px h-20">
                        {convergenceData.map((d, i) => (
                          <div key={i} className="flex-1 bg-[#00D4FF]/60 rounded-t" style={{ height: `${Math.min(100, d.residual * 100)}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* CFD section */}
                {active.id === "cfd" && (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {cfdResults.map((r: AnalysisResult) => (
                      <div key={r.label} className="bg-[#161b22] rounded-lg p-3 border border-[#21262d]">
                        <div className="text-[10px] text-slate-500 uppercase">{r.label}</div>
                        <div className={`text-xl font-bold mt-1 ${r.status === "good" ? "text-green-400" : "text-amber-400"}`}>
                          {r.value} <span className="text-xs font-normal text-slate-500">{r.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* BOM section */}
                {active.id === "bom" && (
                  <div className="mt-2 space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                      {[{ label: "Total Parts", val: bomSummary.totalParts }, { label: "Total Mass", val: `${bomSummary.totalMass.toFixed(2)} kg` }, { label: "Unique Materials", val: bomSummary.uniqueMaterials.length }, { label: "Total Cost", val: `$${bomSummary.totalCost.toFixed(2)}` }].map(m => (
                        <div key={m.label} className="bg-[#161b22] rounded p-2 border border-[#21262d]">
                          <div className="text-[9px] text-slate-500">{m.label}</div>
                          <div className="text-sm font-bold text-[#00D4FF]">{m.val}</div>
                        </div>
                      ))}
                    </div>
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#161b22]">
                          {["#", "Part Name", "P/N", "Qty", "Material", "Mass", "Unit $", "Total $"].map(h => (
                            <th key={h} className="px-2 py-2 text-left text-[10px] font-bold text-slate-400 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bom.map((b, i) => (
                          <tr key={b.id} className={`border-b border-[#21262d] ${i % 2 === 0 ? "bg-[#0d1117]" : "bg-[#161b22]/50"}`}>
                            <td className="px-2 py-1.5 text-slate-500">{i + 1}</td>
                            <td className="px-2 py-1.5 font-medium text-white">{b.partName}</td>
                            <td className="px-2 py-1.5 text-slate-500 font-mono">{b.partNumber}</td>
                            <td className="px-2 py-1.5 text-center">{b.quantity}</td>
                            <td className="px-2 py-1.5 text-slate-400">{b.material}</td>
                            <td className="px-2 py-1.5 text-right font-mono">{(b.quantity * b.mass).toFixed(3)}</td>
                            <td className="px-2 py-1.5 text-right font-mono">${b.unitCost.toFixed(2)}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-white">${(b.quantity * b.unitCost).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[#00D4FF] bg-[#161b22]">
                          <td colSpan={5} className="px-2 py-2 font-bold text-white">TOTAL</td>
                          <td className="px-2 py-2 text-right font-bold font-mono text-white">{bomSummary.totalMass.toFixed(3)}</td>
                          <td className="px-2 py-2" />
                          <td className="px-2 py-2 text-right font-bold font-mono text-[#00D4FF]">${bomSummary.totalCost.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Compliance section */}
                {active.id === "compliance" && (
                  <div className="mt-4 space-y-4">
                    {[
                      { std: "IEC 61215 – PV Module Qualification", checks: IEC_61215_CHECKS },
                      { std: "IS 800 – Structural Steel Design", checks: IS_800_CHECKS },
                      { std: "ISO 2768 m-K – General Tolerances", checks: ISO_2768_CHECKS },
                    ].map(({ std, checks }) => {
                      const passed = checks.filter(c => c.status === "pass").length;
                      return (
                        <div key={std} className="bg-[#161b22] rounded-lg border border-[#21262d] overflow-hidden">
                          <div className="px-4 py-2 bg-[#21262d] flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{std}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${passed === checks.length ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
                              {passed}/{checks.length} PASS
                            </span>
                          </div>
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="border-b border-[#21262d]">
                                {["Clause", "Description", "Requirement", "Actual", "Status"].map(h => (
                                  <th key={h} className="px-3 py-1.5 text-left text-[10px] text-slate-400 font-bold uppercase">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {checks.map((c, i) => (
                                <tr key={i} className={`border-b border-[#21262d]/50 ${i % 2 === 0 ? "" : "bg-[#21262d]/20"}`}>
                                  <td className="px-3 py-1.5 font-mono text-[#00D4FF]">{c.clause}</td>
                                  <td className="px-3 py-1.5 text-slate-300">{c.description}</td>
                                  <td className="px-3 py-1.5 text-slate-400">{c.requirement}</td>
                                  <td className="px-3 py-1.5 text-slate-300">{c.actual}</td>
                                  <td className="px-3 py-1.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.status === "pass" ? "bg-green-500/20 text-green-400" : c.status === "fail" ? "bg-red-500/20 text-red-400" : "bg-slate-500/20 text-slate-400"}`}>
                                      {c.status.toUpperCase()}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right – Quick Reference */}
        <div className="w-52 bg-[#161b22] border-l border-[#21262d] flex flex-col shrink-0 overflow-y-auto">
          <div className="px-3 py-2 border-b border-[#21262d]">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Quick Ref</div>
          </div>
          <div className="px-3 py-2 border-b border-[#21262d] space-y-1.5">
            {[{ label: "Safety Factor", val: "1.82", color: "text-amber-400" }, { label: "Max Stress", val: "187.4 MPa", color: "text-green-400" }, { label: "Peak Temp", val: "94.2°C", color: "text-amber-400" }, { label: "Total Mass", val: `${bomSummary.totalMass.toFixed(2)} kg`, color: "text-blue-400" }, { label: "BOM Cost", val: `$${bomSummary.totalCost.toFixed(0)}`, color: "text-[#00D4FF]" }].map(m => (
              <div key={m.label} className="bg-[#0d1117] rounded p-2 border border-[#21262d]">
                <div className="text-[9px] text-slate-500">{m.label}</div>
                <div className={`text-sm font-bold ${m.color}`}>{m.val}</div>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Navigate</div>
            {["/simulator", "/cfd", "/assembly", "/drawings"].map(href => (
              <a key={href} href={href} className="block text-[10px] text-[#00D4FF] hover:text-white capitalize">{href.slice(1)}</a>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#161b22] border-t border-[#21262d] px-4 py-1 flex items-center gap-3 text-[10px] text-slate-500 shrink-0">
        <span>{reportTemplates.find(t => t.id === template)?.label}</span>
        <span>|</span>
        <span>Sections: {includedSections.length}</span>
        <span>|</span>
        <span>BOM: {bom.length} parts</span>
        <span>|</span>
        <span>Mass: {bomSummary.totalMass.toFixed(2)} kg</span>
        <div className="flex-1" />
        <span>ShilpaSutra Report Engine v2.0</span>
      </div>
    </div>
  );
}
