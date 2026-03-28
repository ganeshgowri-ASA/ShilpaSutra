"use client";
import React, { useState, useCallback, useMemo } from "react";
import {
  Camera, Activity, Sun, Thermometer, Radio,
  Grid3X3, Square, Zap, X, ChevronRight, Search,
  Play, Settings, Filter,
  Gauge, Droplets, Wind, Cloud, Cpu, FileImage, Box, FlaskConical, Download,
} from "lucide-react";
import {
  allPVTemplates,
  PV_TEMPLATE_CATEGORIES,
  type PVTemplate,
  type PVTemplateCategory,
} from "@/lib/pvTestingTemplates";
import TemplateWorkflowGuide from "./TemplateWorkflowGuide";

// Map thumbnail names → lucide icons
const ICON_MAP: Record<string, React.ReactNode> = {
  Camera:      <Camera size={20} />,
  Activity:    <Activity size={20} />,
  Sun:         <Sun size={20} />,
  Thermometer: <Thermometer size={20} />,
  Radio:       <Radio size={20} />,
  Grid3X3:     <Grid3X3 size={20} />,
  Square:      <Square size={20} />,
  Zap:         <Zap size={20} />,
  Gauge:       <Gauge size={20} />,
  Droplets:    <Droplets size={20} />,
  Wind:        <Wind size={20} />,
  Cloud:       <Cloud size={20} />,
  Cpu:         <Cpu size={20} />,
};

const CATEGORY_COLORS: Record<PVTemplateCategory, string> = {
  "EL Testing":    "text-violet-400 border-violet-500/30 bg-violet-500/10",
  "IV Testing":    "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  "Simulation":    "text-amber-400 border-amber-500/30 bg-amber-500/10",
  "Mounting":      "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  "Enclosures":    "text-rose-400 border-rose-500/30 bg-rose-500/10",
  "IEC Chambers":  "text-orange-400 border-orange-500/30 bg-orange-500/10",
  "Structural":    "text-lime-400 border-lime-500/30 bg-lime-500/10",
};

interface ParamValues { [key: string]: number | string | boolean }

interface Props {
  onClose: () => void;
  onInsertScript?: (script: string, templateName: string) => void;
}

type TabId = "params" | "kcl" | "workflow";

export default function PVTestingTemplatePanel({ onClose, onInsertScript }: Props) {
  const [activeCategory, setActiveCategory] = useState<PVTemplateCategory | "All">("All");
  const [selectedTemplate, setSelectedTemplate] = useState<PVTemplate | null>(null);
  const [paramValues, setParamValues]     = useState<ParamValues>({});
  const [searchQuery, setSearchQuery]     = useState("");
  const [generatedScript, setGeneratedScript] = useState("");
  const [activeTab, setActiveTab]         = useState<TabId>("params");

  const filteredTemplates = useMemo(() => {
    let list = activeCategory === "All"
      ? allPVTemplates
      : allPVTemplates.filter((t) => t.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeCategory, searchQuery]);

  const handleSelectTemplate = useCallback((tpl: PVTemplate) => {
    setSelectedTemplate(tpl);
    setActiveTab("params");
    setGeneratedScript("");
    const defaults: ParamValues = {};
    tpl.params.forEach((p) => { defaults[p.key] = p.default; });
    setParamValues(defaults);
  }, []);

  const handleParamChange = useCallback((key: string, value: number | string | boolean) => {
    setParamValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleGenerate = useCallback(() => {
    if (!selectedTemplate) return;
    const script = selectedTemplate.generateKCLScript(paramValues);
    setGeneratedScript(script);
    setActiveTab("kcl");
  }, [selectedTemplate, paramValues]);

  const handleInsert = useCallback(() => {
    if (!selectedTemplate || !generatedScript) return;
    if (onInsertScript) {
      onInsertScript(generatedScript, selectedTemplate.name);
    } else {
      window.dispatchEvent(new CustomEvent("shilpasutra:insert-kcl", {
        detail: { script: generatedScript, name: selectedTemplate.name },
      }));
    }
    onClose();
  }, [selectedTemplate, generatedScript, onInsertScript, onClose]);

  return (
    <div className="flex flex-col w-[760px] max-w-full h-[640px] bg-[#0d1117] border border-[#21262d] rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-[#21262d] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Sun size={14} className="text-amber-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">PV Testing Templates</div>
            <div className="text-[10px] text-slate-500">
              {allPVTemplates.length} templates · Solar PV measurement, IEC chambers &amp; mounting
            </div>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#21262d] transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Left: Browser ── */}
        <div className="w-64 flex flex-col border-r border-[#21262d] shrink-0">
          {/* Search */}
          <div className="px-3 py-2.5 border-b border-[#21262d]">
            <div className="flex items-center gap-2 bg-[#161b22] border border-[#21262d] rounded-lg px-2.5 py-1.5">
              <Search size={11} className="text-slate-500 shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates…"
                className="flex-1 bg-transparent text-[11px] text-slate-300 placeholder:text-slate-600 outline-none"
              />
            </div>
          </div>

          {/* Category filters */}
          <div className="px-3 pt-2.5 pb-1.5 border-b border-[#21262d]">
            <div className="text-[9px] text-slate-600 font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Filter size={9} /> Category
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveCategory("All")}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                  activeCategory === "All"
                    ? "bg-[#00D4FF]/15 text-[#00D4FF] border-[#00D4FF]/30"
                    : "text-slate-500 border-transparent hover:text-slate-300"
                }`}
              >
                All ({allPVTemplates.length})
              </button>
              {PV_TEMPLATE_CATEGORIES.map((cat) => {
                const count = allPVTemplates.filter((t) => t.category === cat).length;
                if (count === 0) return null;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                      activeCategory === cat
                        ? CATEGORY_COLORS[cat]
                        : "text-slate-500 border-transparent hover:text-slate-300"
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredTemplates.length === 0 && (
              <div className="text-center py-8 text-slate-600 text-[11px]">No templates found</div>
            )}
            {filteredTemplates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => handleSelectTemplate(tpl)}
                className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all ${
                  selectedTemplate?.id === tpl.id
                    ? "bg-[#00D4FF]/10 border border-[#00D4FF]/20"
                    : "hover:bg-[#161b22] border border-transparent"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${CATEGORY_COLORS[tpl.category]}`}>
                  {ICON_MAP[tpl.thumbnail] ?? <Settings size={16} />}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-slate-200 truncate">{tpl.name}</div>
                  <div className={`text-[9px] font-medium mt-0.5 ${CATEGORY_COLORS[tpl.category].split(" ")[0]}`}>
                    {tpl.category}
                  </div>
                </div>
                {selectedTemplate?.id === tpl.id && (
                  <ChevronRight size={12} className="text-[#00D4FF] shrink-0 mt-1.5 ml-auto" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right: Detail ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {!selectedTemplate ? (
            <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
              <div className="text-center">
                <Sun size={32} className="mx-auto mb-3 text-slate-700" />
                <div className="text-[12px] font-medium mb-1">Select a template</div>
                <div className="text-[10px]">Choose from {allPVTemplates.length} PV equipment templates</div>
              </div>
            </div>
          ) : (
            <>
              {/* Template header */}
              <div className="px-4 py-3 border-b border-[#21262d] shrink-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${CATEGORY_COLORS[selectedTemplate.category]}`}>
                    {selectedTemplate.category}
                  </div>
                  {selectedTemplate.tags[0] && (
                    <div className="px-2 py-0.5 rounded text-[9px] font-medium border border-[#30363d] text-slate-500">
                      {selectedTemplate.tags[0]}
                    </div>
                  )}
                </div>
                <div className="text-[13px] font-semibold text-white">{selectedTemplate.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{selectedTemplate.description}</div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[#21262d] shrink-0">
                {(["params", "kcl", "workflow"] as TabId[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      if (tab === "kcl" && !generatedScript) return;
                      setActiveTab(tab);
                    }}
                    className={`px-4 py-2 text-[11px] font-medium transition-colors capitalize ${
                      activeTab === tab
                        ? "text-[#00D4FF] border-b-2 border-[#00D4FF]"
                        : tab === "kcl" && !generatedScript
                          ? "text-slate-600 cursor-not-allowed"
                          : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {tab === "params" ? "Parameters" : tab === "kcl" ? "KCL Script" : "Workflow"}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === "params" && (
                  <div className="p-4 space-y-3">
                    {selectedTemplate.params.map((param) => (
                      <div key={param.key} className="flex items-center justify-between gap-3">
                        <label className="text-[11px] text-slate-400 w-36 shrink-0">
                          {param.label}
                          {param.unit && <span className="text-slate-600 ml-1">({param.unit})</span>}
                        </label>
                        {param.type === "select" ? (
                          <select
                            value={String(paramValues[param.key] ?? param.default)}
                            onChange={(e) => handleParamChange(param.key, e.target.value)}
                            className="flex-1 bg-[#161b22] border border-[#21262d] rounded-md px-2.5 py-1.5 text-[11px] text-slate-200 outline-none focus:border-[#00D4FF]/40"
                          >
                            {param.options?.map((opt) => (
                              <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                            ))}
                          </select>
                        ) : param.type === "boolean" ? (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(paramValues[param.key] ?? param.default)}
                              onChange={(e) => handleParamChange(param.key, e.target.checked)}
                              className="w-3.5 h-3.5 rounded accent-cyan-500"
                            />
                            <span className="text-[11px] text-slate-400">
                              {(paramValues[param.key] ?? param.default) ? "Enabled" : "Disabled"}
                            </span>
                          </label>
                        ) : (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="range"
                              min={param.min} max={param.max} step={param.step ?? 1}
                              value={Number(paramValues[param.key] ?? param.default)}
                              onChange={(e) => handleParamChange(param.key, Number(e.target.value))}
                              className="flex-1 accent-cyan-500"
                            />
                            <input
                              type="number"
                              min={param.min} max={param.max} step={param.step ?? 1}
                              value={Number(paramValues[param.key] ?? param.default)}
                              onChange={(e) => handleParamChange(param.key, Number(e.target.value))}
                              className="w-20 bg-[#161b22] border border-[#21262d] rounded-md px-2 py-1 text-[11px] text-slate-200 text-right outline-none focus:border-[#00D4FF]/40"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "kcl" && (
                  <div className="p-3">
                    <pre className="text-[10px] text-emerald-300 font-mono whitespace-pre-wrap bg-[#0a1a0a] border border-emerald-900/30 rounded-lg p-3 leading-relaxed">
                      {generatedScript}
                    </pre>
                  </div>
                )}

                {activeTab === "workflow" && (
                  <TemplateWorkflowGuide template={selectedTemplate} />
                )}
              </div>

              {/* Action bar */}
              <div className="px-4 py-3 border-t border-[#21262d] shrink-0 space-y-2">
                {/* Workflow shortcut buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { icon: <FileImage size={10} />, label: "2D Drawing", href: `/drawings?template=${selectedTemplate.id}`, cls: "text-sky-400 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20" },
                    { icon: <Box size={10} />,       label: "3D Model",   href: `/designer?template=${selectedTemplate.id}`, cls: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20" },
                    { icon: <FlaskConical size={10} />, label: "FEA",     href: `/fea-advanced?template=${selectedTemplate.id}`, cls: "text-orange-400 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20" },
                    { icon: <Wind size={10} />,      label: "CFD",        href: `/cfd-advanced?template=${selectedTemplate.id}`, cls: "text-violet-400 border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20" },
                    { icon: <Download size={10} />,  label: "PDF",        href: `/export?template=${selectedTemplate.id}&format=pdf`, cls: "text-rose-400 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20" },
                  ].map(({ icon, label, href, cls }) => (
                    <a
                      key={label}
                      href={href}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border transition-all ${cls}`}
                    >
                      {icon} {label}
                    </a>
                  ))}
                </div>
                {/* KCL actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] text-slate-600">
                    {selectedTemplate.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="mr-2">#{tag}</span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleGenerate}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[#161b22] border border-[#21262d] text-slate-300 hover:border-[#00D4FF]/30 hover:text-[#00D4FF] transition-all"
                    >
                      <Settings size={11} /> Preview KCL
                    </button>
                    <button
                      onClick={generatedScript ? handleInsert : handleGenerate}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#00D4FF]/15 border border-[#00D4FF]/30 text-[#00D4FF] hover:bg-[#00D4FF]/25 transition-all"
                    >
                      <Play size={11} />
                      {generatedScript ? "Insert to Designer" : "Generate"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
