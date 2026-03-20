"use client";
import { useState, useCallback, useMemo } from "react";

/* ── Types ── */
type ReportTemplate = "design-review" | "fea-summary" | "cfd-report";

interface ReportSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  included: boolean;
}

interface ChartData {
  label: string;
  value: number;
  color: string;
}

/* ── Template Definitions ── */
const templateDefs: { id: ReportTemplate; label: string; desc: string; icon: string }[] = [
  { id: "design-review", label: "Design Review", desc: "Full design review with specifications, materials, and analysis summary", icon: "DR" },
  { id: "fea-summary", label: "FEA Summary", desc: "Finite element analysis results with stress, displacement, and safety factors", icon: "FE" },
  { id: "cfd-report", label: "CFD Report", desc: "Computational fluid dynamics analysis with flow and thermal results", icon: "CF" },
];

function getSections(template: ReportTemplate): ReportSection[] {
  const base: ReportSection[] = [
    { id: "cover", title: "Cover Page", icon: "C", content: "Project title, date, author, revision info", included: true },
    { id: "summary", title: "Executive Summary", icon: "S", content: "High-level overview of findings and recommendations", included: true },
  ];

  if (template === "design-review") {
    return [
      ...base,
      { id: "specs", title: "Design Specifications", icon: "Sp", content: "Material properties, dimensions, tolerances, and requirements", included: true },
      { id: "geometry", title: "Geometry Overview", icon: "G", content: "3D model views, section cuts, and key dimensions", included: true },
      { id: "materials", title: "Material Selection", icon: "Mt", content: "Material comparison table with properties and justification", included: true },
      { id: "analysis", title: "Analysis Summary", icon: "An", content: "FEA and CFD results overview with key metrics", included: true },
      { id: "bom", title: "Bill of Materials", icon: "B", content: "Complete parts list with quantities and costs", included: true },
      { id: "conclusion", title: "Conclusions", icon: "Co", content: "Final recommendations and next steps", included: true },
    ];
  }
  if (template === "fea-summary") {
    return [
      ...base,
      { id: "mesh", title: "Mesh Details", icon: "Mh", content: "Element types, mesh density, quality metrics", included: true },
      { id: "loads", title: "Loads & Constraints", icon: "L", content: "Applied forces, pressures, and boundary conditions", included: true },
      { id: "stress", title: "Stress Results", icon: "St", content: "Von Mises, principal stresses, and stress contour plots", included: true },
      { id: "displacement", title: "Displacement Results", icon: "D", content: "Deformation magnitude and directional components", included: true },
      { id: "safety", title: "Safety Factors", icon: "Sf", content: "Factor of safety distribution and critical regions", included: true },
      { id: "convergence", title: "Convergence Study", icon: "Cv", content: "Mesh refinement study and error estimates", included: true },
    ];
  }
  return [
    ...base,
    { id: "domain", title: "Domain Setup", icon: "Dm", content: "Computational domain dimensions and boundary locations", included: true },
    { id: "mesh-cfd", title: "Mesh Generation", icon: "Mh", content: "Mesh type, element count, y+ values, quality metrics", included: true },
    { id: "boundary", title: "Boundary Conditions", icon: "BC", content: "Inlet, outlet, wall conditions and fluid properties", included: true },
    { id: "flow", title: "Flow Results", icon: "F", content: "Velocity contours, pressure distribution, streamlines", included: true },
    { id: "thermal", title: "Thermal Results", icon: "T", content: "Temperature distribution, heat flux, Nusselt number", included: true },
    { id: "forces", title: "Forces & Coefficients", icon: "Fc", content: "Drag, lift coefficients, and surface forces", included: true },
  ];
}

const stressChartData: ChartData[] = [
  { label: "Von Mises", value: 187, color: "#00D4FF" },
  { label: "Principal 1", value: 201, color: "#ff6b6b" },
  { label: "Principal 2", value: 95, color: "#4ecdc4" },
  { label: "Shear Max", value: 68, color: "#ffd93d" },
];

const thermalChartData: ChartData[] = [
  { label: "Max Temp", value: 94, color: "#ff6b6b" },
  { label: "Avg Temp", value: 58, color: "#ffd93d" },
  { label: "Min Temp", value: 22, color: "#4ecdc4" },
  { label: "Heat Flux", value: 75, color: "#00D4FF" },
];

export default function ReportsAdvancedPage() {
  const [template, setTemplate] = useState<ReportTemplate>("design-review");
  const [sections, setSections] = useState<ReportSection[]>(getSections("design-review"));
  const [companyName, setCompanyName] = useState("ShilpaSutra Engineering");
  const [projectName, setProjectName] = useState("Bracket Assembly v2.1");
  const [author, setAuthor] = useState("Engineering Team");
  const [generating, setGenerating] = useState(false);

  const changeTemplate = useCallback((t: ReportTemplate) => {
    setTemplate(t);
    setSections(getSections(t));
  }, []);

  const toggleSection = useCallback((id: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, included: !s.included } : s)));
  }, []);

  const chartData = useMemo(() => {
    if (template === "cfd-report") return thermalChartData;
    return stressChartData;
  }, [template]);

  const maxChartVal = Math.max(...chartData.map((d) => d.value));

  const generatePDF = useCallback(() => {
    setGenerating(true);
    setTimeout(() => {
      const includedSections = sections.filter((s) => s.included);
      const lines = [
        `Report: ${templateDefs.find((t) => t.id === template)?.label}`,
        `Company: ${companyName}`,
        `Project: ${projectName}`,
        `Author: ${author}`,
        `Date: ${new Date().toLocaleDateString()}`,
        "",
        "Sections:",
        ...includedSections.map((s) => `  - ${s.title}: ${s.content}`),
        "",
        "Chart Data:",
        ...chartData.map((d) => `  ${d.label}: ${d.value}`),
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, "_")}_report.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setGenerating(false);
    }, 1000);
  }, [sections, template, companyName, projectName, author, chartData]);

  const includedCount = sections.filter((s) => s.included).length;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="h-12 border-b border-[#1a1a2e] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[#00D4FF] font-bold text-sm">RPT</span>
          <span className="text-slate-400 text-xs">Report Generator</span>
        </div>
        <button
          onClick={generatePDF}
          disabled={generating}
          className={`px-4 py-1.5 text-xs rounded font-medium transition-colors ${
            generating
              ? "bg-[#1a1a2e] text-slate-500 cursor-wait"
              : "bg-[#00D4FF] text-black hover:bg-[#00bde6]"
          }`}
        >
          {generating ? "Generating..." : "Export PDF"}
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Left: Config */}
        <div className="w-[340px] border-r border-[#1a1a2e] bg-[#0d0d14] overflow-y-auto p-4 shrink-0">
          {/* Template Selection */}
          <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-3">
            Report Template
          </h4>
          <div className="space-y-2 mb-6">
            {templateDefs.map((t) => (
              <button
                key={t.id}
                onClick={() => changeTemplate(t.id)}
                className={`w-full text-left p-3 rounded border transition-colors ${
                  template === t.id
                    ? "border-[#00D4FF]/40 bg-[#00D4FF]/10"
                    : "border-[#1a1a2e] bg-[#0a0a0f] hover:border-[#252540]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#00D4FF] bg-[#00D4FF]/10 px-1.5 py-0.5 rounded">
                    {t.icon}
                  </span>
                  <span className="text-xs font-medium text-white">{t.label}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">{t.desc}</div>
              </button>
            ))}
          </div>

          {/* Logo / Company Placeholder */}
          <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-3">
            Report Details
          </h4>
          <div className="mb-4">
            <div className="w-full h-16 border-2 border-dashed border-[#252540] rounded-lg flex items-center justify-center mb-3 bg-[#0a0a0f]">
              <span className="text-[10px] text-slate-500">Company Logo Placeholder</span>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Company</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-[#252540] rounded px-3 py-1.5 text-xs text-white outline-none focus:border-[#00D4FF]"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Project</label>
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-[#252540] rounded px-3 py-1.5 text-xs text-white outline-none focus:border-[#00D4FF]"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Author</label>
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-[#252540] rounded px-3 py-1.5 text-xs text-white outline-none focus:border-[#00D4FF]"
                />
              </div>
            </div>
          </div>

          {/* Sections Toggle */}
          <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-3">
            Sections ({includedCount}/{sections.length})
          </h4>
          <div className="space-y-1">
            {sections.map((section) => (
              <label
                key={section.id}
                className={`flex items-center gap-2.5 p-2 rounded cursor-pointer transition-colors ${
                  section.included ? "bg-[#00D4FF]/5" : "opacity-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={section.included}
                  onChange={() => toggleSection(section.id)}
                  className="accent-[#00D4FF]"
                />
                <span className="text-[10px] font-bold text-[#00D4FF] bg-[#00D4FF]/10 w-5 h-5 rounded flex items-center justify-center">
                  {section.icon}
                </span>
                <span className="text-xs text-white">{section.title}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Preview Header */}
          <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-6 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-24 h-8 bg-[#1a1a2e] rounded mb-3 flex items-center justify-center text-[9px] text-slate-500">
                  LOGO
                </div>
                <h2 className="text-lg font-bold text-white">{projectName}</h2>
                <div className="text-xs text-slate-400 mt-1">{companyName}</div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>{templateDefs.find((t) => t.id === template)?.label}</div>
                <div>Date: {new Date().toLocaleDateString()}</div>
                <div>Author: {author}</div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-6 mb-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
              {template === "cfd-report" ? "Thermal Results" : "Stress Analysis"}
            </h3>
            <div className="space-y-3">
              {chartData.map((d) => (
                <div key={d.label} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-24 shrink-0">{d.label}</span>
                  <div className="flex-1 h-6 bg-[#0a0a0f] rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-500"
                      style={{
                        width: `${(d.value / maxChartVal) * 100}%`,
                        backgroundColor: d.color,
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <span className="text-xs text-white font-medium w-12 text-right">
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section Previews */}
          {sections
            .filter((s) => s.included)
            .map((section, i) => (
              <div
                key={section.id}
                className="bg-[#0d0d14] border border-[#1a1a2e] rounded-xl p-5 mb-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-[#00D4FF] bg-[#00D4FF]/10 px-1.5 py-0.5 rounded">
                    {i + 1}
                  </span>
                  <h4 className="text-sm font-medium text-white">{section.title}</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{section.content}</p>
                <div className="mt-3 h-px bg-[#1a1a2e]" />
                <div className="mt-3 h-8 bg-[#0a0a0f] rounded flex items-center justify-center">
                  <span className="text-[10px] text-slate-600">
                    [Auto-generated content will appear here]
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
