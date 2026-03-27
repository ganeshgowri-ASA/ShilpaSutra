"use client";
import { useState, useCallback, useMemo } from "react";
import {
  generateReport,
  IEC_61215_CHECKS,
  IS_800_CHECKS,
  ISO_2768_CHECKS,
  type ReportType,
} from "@/lib/report-generator";
import { getSampleBOM, exportBOMToCSV, exportBOMToExcel, summarizeBOM } from "@/lib/bom-generator";

/* ── Types ── */
type ReportTemplate = "design-review" | "fea-summary" | "cfd-report" | "compliance" | "manufacturing";

interface ReportSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  included: boolean;
  order: number;
}

/* ── Template definitions ── */
const TEMPLATES: { id: ReportTemplate; label: string; desc: string; icon: string }[] = [
  { id: "design-review", label: "Design Review", desc: "Specs, materials, analysis summary, BOM", icon: "DR" },
  { id: "fea-summary", label: "FEA Summary", desc: "Stress, displacement, safety factors", icon: "FE" },
  { id: "cfd-report", label: "CFD Report", desc: "Flow, thermal, force coefficients", icon: "CF" },
  { id: "compliance", label: "Compliance", desc: "IEC 61215 / IS 800 / ISO 2768 checks", icon: "CL" },
  { id: "manufacturing", label: "Manufacturing", desc: "BOM, tolerances, fabrication notes", icon: "MF" },
];

function getSections(t: ReportTemplate): ReportSection[] {
  const base = [
    { id: "cover", title: "Cover Page", icon: "CV", content: "Project title, date, author, revision info", included: true, order: 0 },
    { id: "summary", title: "Executive Summary", icon: "ES", content: "High-level findings and recommendations", included: true, order: 1 },
  ];
  const byTemplate: Record<ReportTemplate, Omit<ReportSection, "order">[]> = {
    "design-review": [
      { id: "specs", title: "Design Specifications", icon: "Sp", content: "Material properties, dimensions, tolerances", included: true },
      { id: "geometry", title: "Geometry Overview", icon: "G", content: "3D model views and key dimensions", included: true },
      { id: "materials", title: "Material Selection", icon: "Mt", content: "Material comparison with justification", included: true },
      { id: "analysis", title: "Analysis Summary", icon: "An", content: "FEA/CFD results overview", included: true },
      { id: "bom", title: "Bill of Materials", icon: "B", content: "Parts list with quantities and costs", included: true },
      { id: "conclusion", title: "Conclusions", icon: "Co", content: "Recommendations and next steps", included: true },
    ],
    "fea-summary": [
      { id: "mesh", title: "Mesh Details", icon: "Mh", content: "Element types, density, quality metrics", included: true },
      { id: "loads", title: "Loads & Constraints", icon: "L", content: "Applied forces, pressures, boundary conditions", included: true },
      { id: "stress", title: "Stress Results", icon: "St", content: "Von Mises, principal stresses, contour plots", included: true },
      { id: "displacement", title: "Displacement Results", icon: "D", content: "Deformation magnitude and directional components", included: true },
      { id: "safety", title: "Safety Factors", icon: "Sf", content: "Factor of safety distribution and critical regions", included: true },
      { id: "convergence", title: "Convergence Study", icon: "Cv", content: "Mesh refinement study and error estimates", included: true },
    ],
    "cfd-report": [
      { id: "domain", title: "Domain Setup", icon: "Dm", content: "Computational domain dimensions and boundary locations", included: true },
      { id: "mesh-cfd", title: "Mesh Generation", icon: "Mh", content: "Mesh type, element count, y+ values, quality", included: true },
      { id: "boundary", title: "Boundary Conditions", icon: "BC", content: "Inlet, outlet, wall conditions and fluid properties", included: true },
      { id: "flow", title: "Flow Results", icon: "F", content: "Velocity contours, pressure distribution, streamlines", included: true },
      { id: "thermal", title: "Thermal Results", icon: "T", content: "Temperature distribution, heat flux, Nusselt number", included: true },
      { id: "forces", title: "Forces & Coefficients", icon: "Fc", content: "Drag, lift coefficients and surface forces", included: true },
    ],
    "compliance": [
      { id: "iec61215", title: "IEC 61215 Compliance", icon: "IE", content: "PV module qualification test compliance matrix", included: true },
      { id: "is800", title: "IS 800 Structural Check", icon: "IS", content: "Structural steel design code compliance summary", included: true },
      { id: "iso2768", title: "ISO 2768 Tolerances", icon: "TO", content: "General tolerance compliance matrix", included: true },
      { id: "cert", title: "Certification Summary", icon: "CS", content: "Overall compliance status and certification readiness", included: true },
    ],
    "manufacturing": [
      { id: "bom-mfg", title: "Bill of Materials", icon: "B", content: "Complete BOM with supplier info and lead times", included: true },
      { id: "tolerances", title: "Tolerance Table", icon: "T", content: "Critical dimensions and GD&T callouts", included: true },
      { id: "surface", title: "Surface Finish", icon: "SF", content: "Ra requirements per surface, coating specs", included: true },
      { id: "welding", title: "Weld Specifications", icon: "W", content: "Joint types, filler material, pre/post heat treatment", included: true },
      { id: "inspection", title: "Inspection Plan", icon: "I", content: "Dimensional check list and acceptance criteria", included: true },
    ],
  };
  return [
    ...base,
    ...(byTemplate[t] || []).map((s, i) => ({ ...s, order: i + 2 })),
  ];
}

/* ── Chart data ── */
const STRESS_CHART = [
  { label: "Von Mises", value: 187, color: "#00D4FF" },
  { label: "Principal 1", value: 201, color: "#ff6b6b" },
  { label: "Principal 2", value: 95, color: "#4ecdc4" },
  { label: "Shear Max", value: 68, color: "#ffd93d" },
];
const THERMAL_CHART = [
  { label: "Max Temp (°C)", value: 94, color: "#ff6b6b" },
  { label: "Avg Temp (°C)", value: 58, color: "#ffd93d" },
  { label: "Min Temp (°C)", value: 22, color: "#4ecdc4" },
  { label: "Heat Flux (W/m²)", value: 750, color: "#00D4FF" },
];

/* ── Drag-to-reorder helper ── */
function useDragOrder(sections: ReportSection[], setSections: React.Dispatch<React.SetStateAction<ReportSection[]>>) {
  const [dragId, setDragId] = useState<string | null>(null);

  const onDragStart = (id: string) => setDragId(id);
  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setSections(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(s => s.id === dragId);
      const toIdx = arr.findIndex(s => s.id === targetId);
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr.map((s, i) => ({ ...s, order: i }));
    });
    setDragId(null);
  };
  return { onDragStart, onDrop, dragId };
}

/* ── Main Component ── */
export default function ReportsAdvancedPage() {
  const [template, setTemplate] = useState<ReportTemplate>("design-review");
  const [sections, setSections] = useState<ReportSection[]>(getSections("design-review"));
  const [company, setCompany] = useState("ShilpaSutra Engineering");
  const [projectName, setProjectName] = useState("PV Mounting Structure v2.1");
  const [projectNo, setProjectNo] = useState("SS-PV-001");
  const [author, setAuthor] = useState("Engineering Team");
  const [revision, setRevision] = useState("A");
  const [generating, setGenerating] = useState(false);
  const [activePreview, setActivePreview] = useState<string | null>(null);

  const bom = useMemo(() => getSampleBOM(), []);
  const bomSummary = useMemo(() => summarizeBOM(bom), [bom]);
  const { onDragStart, onDrop, dragId } = useDragOrder(sections, setSections);

  const changeTemplate = useCallback((t: ReportTemplate) => {
    setTemplate(t);
    setSections(getSections(t));
    setActivePreview(null);
  }, []);

  const toggleSection = useCallback((id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, included: !s.included } : s));
  }, []);

  const chartData = template === "cfd-report" ? THERMAL_CHART : STRESS_CHART;
  const maxChart = Math.max(...chartData.map(d => d.value));
  const includedSections = sections.filter(s => s.included);

  const complianceSets = [
    { standard: "IEC 61215", checks: IEC_61215_CHECKS },
    { standard: "IS 800", checks: IS_800_CHECKS },
    { standard: "ISO 2768 m-K", checks: ISO_2768_CHECKS },
  ];

  const handleExportPDF = useCallback(() => {
    setGenerating(true);
    setTimeout(() => {
      try {
        const typeMap: Record<ReportTemplate, ReportType> = {
          "design-review": "design",
          "fea-summary": "fea",
          "cfd-report": "cfd",
          "compliance": "compliance",
          "manufacturing": "manufacturing",
        };
        generateReport({
          config: {
            title: TEMPLATES.find(t => t.id === template)?.label || "Report",
            projectName,
            projectNumber: projectNo,
            company,
            author,
            revision,
            type: typeMap[template],
          },
          sections: includedSections
            .filter(s => s.id !== "bom" && s.id !== "bom-mfg" && !["iec61215","is800","iso2768","cert"].includes(s.id))
            .map(s => ({ title: s.title, content: s.content })),
          bom: includedSections.some(s => s.id === "bom" || s.id === "bom-mfg")
            ? bom.map(b => ({ ...b, unitCost: b.unitCost }))
            : undefined,
          complianceChecks: template === "compliance" ? complianceSets : undefined,
        });
      } finally {
        setGenerating(false);
      }
    }, 100);
  }, [sections, template, company, projectName, projectNo, author, revision, bom, includedSections, complianceSets]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="h-12 border-b border-[#1a1a2e] flex items-center px-4 gap-3 shrink-0">
        <span className="text-[#00D4FF] font-bold text-sm">RPT+</span>
        <span className="text-slate-400 text-xs">Advanced Report Generator</span>
        <div className="flex-1" />
        <button onClick={() => exportBOMToCSV(bom)} className="text-[10px] text-slate-400 hover:text-white border border-[#1a1a2e] rounded px-2 py-1">BOM CSV</button>
        <button onClick={() => exportBOMToExcel(bom)} className="text-[10px] text-slate-400 hover:text-white border border-[#1a1a2e] rounded px-2 py-1">BOM Excel</button>
        <button onClick={handleExportPDF} disabled={generating}
          className={`px-4 py-1.5 text-xs rounded font-medium transition-colors ${generating ? "bg-[#1a1a2e] text-slate-500 cursor-wait" : "bg-[#00D4FF] text-black hover:bg-[#00bde6]"}`}>
          {generating ? "Generating…" : "Export PDF"}
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Left: Config */}
        <div className="w-[300px] border-r border-[#1a1a2e] bg-[#0d0d14] overflow-y-auto p-4 shrink-0 space-y-5">
          {/* Template */}
          <div>
            <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Template</h4>
            <div className="space-y-1.5">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => changeTemplate(t.id)}
                  className={`w-full text-left p-2.5 rounded border transition-colors ${template === t.id ? "border-[#00D4FF]/40 bg-[#00D4FF]/10" : "border-[#1a1a2e] hover:border-[#252540]"}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#00D4FF] bg-[#00D4FF]/10 px-1.5 py-0.5 rounded">{t.icon}</span>
                    <span className="text-xs font-medium text-white">{t.label}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 ml-7">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Report Details */}
          <div>
            <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Report Details</h4>
            <div className="space-y-2">
              {[
                { label: "Company", val: company, set: setCompany },
                { label: "Project Name", val: projectName, set: setProjectName },
                { label: "Project No.", val: projectNo, set: setProjectNo },
                { label: "Author", val: author, set: setAuthor },
                { label: "Revision", val: revision, set: setRevision },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-[10px] text-slate-500 block mb-0.5">{f.label}</label>
                  <input value={f.val} onChange={e => f.set(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-[#252540] rounded px-2 py-1.5 text-xs text-white outline-none focus:border-[#00D4FF]" />
                </div>
              ))}
            </div>
          </div>

          {/* Sections (drag to reorder) */}
          <div>
            <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">
              Sections — drag to reorder ({includedSections.length}/{sections.length})
            </h4>
            <div className="space-y-1">
              {sections.map(s => (
                <label key={s.id}
                  draggable
                  onDragStart={() => onDragStart(s.id)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => onDrop(s.id)}
                  className={`flex items-center gap-2 p-2 rounded cursor-grab transition-colors select-none ${s.included ? "bg-[#00D4FF]/5" : "opacity-50"} ${dragId === s.id ? "opacity-30" : ""}`}>
                  <span className="text-slate-600 text-xs">⠿</span>
                  <input type="checkbox" checked={s.included} onChange={() => toggleSection(s.id)} className="accent-[#00D4FF]" />
                  <span className="text-[10px] font-bold text-[#00D4FF] bg-[#00D4FF]/10 w-6 h-5 rounded flex items-center justify-center text-[9px]">{s.icon}</span>
                  <span className="text-xs text-white flex-1 truncate">{s.title}</span>
                </label>
              ))}
            </div>
          </div>

          {/* BOM Summary */}
          <div>
            <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">BOM Summary</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { l: "Parts", v: bomSummary.totalParts },
                { l: "Mass (kg)", v: bomSummary.totalMass.toFixed(2) },
                { l: "Materials", v: bomSummary.uniqueMaterials.length },
                { l: "Cost ($)", v: bomSummary.totalCost.toFixed(0) },
              ].map(m => (
                <div key={m.l} className="bg-[#0a0a0f] border border-[#1a1a2e] rounded p-2">
                  <div className="text-[9px] text-slate-500">{m.l}</div>
                  <div className="text-sm font-bold text-[#00D4FF]">{m.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* Cover preview */}
          <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-20 h-7 bg-[#1a1a2e] rounded mb-2 flex items-center justify-center text-[9px] text-slate-500">LOGO</div>
                <h2 className="text-base font-bold text-white">{projectName}</h2>
                <div className="text-xs text-slate-400">{company}</div>
                <div className="text-[10px] text-slate-500 mt-1">P/N: {projectNo}  |  Rev {revision}</div>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <div className="font-medium text-white">{TEMPLATES.find(t => t.id === template)?.label}</div>
                <div>{new Date().toLocaleDateString()}</div>
                <div>Author: {author}</div>
              </div>
            </div>
          </div>

          {/* Chart (non-compliance templates) */}
          {template !== "compliance" && template !== "manufacturing" && (
            <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                {template === "cfd-report" ? "Thermal Results" : "Stress Analysis"}
              </h3>
              <div className="space-y-2.5">
                {chartData.map(d => (
                  <div key={d.label} className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 w-28 shrink-0">{d.label}</span>
                    <div className="flex-1 h-5 bg-[#0a0a0f] rounded overflow-hidden">
                      <div className="h-full rounded" style={{ width: `${(d.value / maxChart) * 100}%`, backgroundColor: d.color, opacity: 0.7 }} />
                    </div>
                    <span className="text-xs text-white font-medium w-12 text-right">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compliance preview */}
          {template === "compliance" && complianceSets.map(({ standard, checks }) => {
            const passed = checks.filter(c => c.status === "pass").length;
            return (
              <div key={standard} className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a2e]">
                  <span className="text-xs font-bold text-white">{standard}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${passed === checks.length ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
                    {passed}/{checks.length} PASS
                  </span>
                </div>
                <div className="px-4 py-2 grid grid-cols-5 gap-1">
                  {checks.map((c, i) => (
                    <div key={i} title={`${c.clause}: ${c.description}`}
                      className={`rounded p-1.5 text-center ${c.status === "pass" ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                      <div className="text-[9px] font-mono text-slate-400">{c.clause}</div>
                      <div className={`text-[9px] font-bold ${c.status === "pass" ? "text-green-400" : "text-red-400"}`}>
                        {c.status === "pass" ? "✓" : "✗"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Section previews */}
          {includedSections.map((section, i) => (
            <div key={section.id} className={`bg-[#0d0d14] border rounded-xl p-4 transition-colors cursor-pointer ${activePreview === section.id ? "border-[#00D4FF]/40" : "border-[#1a1a2e] hover:border-[#252540]"}`}
              onClick={() => setActivePreview(activePreview === section.id ? null : section.id)}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-[#00D4FF] bg-[#00D4FF]/10 px-1.5 py-0.5 rounded">{i + 1}</span>
                <h4 className="text-sm font-medium text-white">{section.title}</h4>
                <span className="ml-auto text-[10px] text-slate-500">{activePreview === section.id ? "▲" : "▼"}</span>
              </div>
              {activePreview === section.id ? (
                <p className="text-xs text-slate-300 leading-relaxed mt-2">{section.content}</p>
              ) : (
                <p className="text-[10px] text-slate-500 truncate">{section.content}</p>
              )}
              {activePreview !== section.id && (
                <div className="mt-2 h-6 bg-[#0a0a0f] rounded flex items-center justify-center">
                  <span className="text-[9px] text-slate-600">[Click to expand · Auto-generated content will appear here]</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
