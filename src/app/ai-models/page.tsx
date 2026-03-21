"use client";

import React, { useState } from "react";
import {
  Brain,
  Cpu,
  Zap,
  Eye,
  FileText,
  Box,
  Target,
  TrendingUp,
  BarChart3,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Database,
  Layers,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const modelCards = [
  {
    title: "Text-to-CAD Model",
    badge: "Claude Opus / Sonnet",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: Brain,
    capabilities: [
      "Natural language to B-rep geometry",
      "Parametric KCL code generation",
      "Multi-turn conversational design",
      "Design-intent reasoning & constraints",
      "Feature tree manipulation via chat",
    ],
    accuracy: "92.3%",
    latency: "2.1s avg",
    examplePrompts: [
      '"Create a flanged bearing housing with 4 M8 bolt holes"',
      '"Add a 2mm fillet to all vertical edges"',
      '"Make the wall thickness parametric, default 3mm"',
    ],
  },
  {
    title: "Vision-to-CAD Model",
    badge: "Multimodal Analysis",
    badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    icon: Eye,
    capabilities: [
      "Engineering drawing PDF parsing",
      "Hand-sketch recognition & digitization",
      "Photograph to 3D reconstruction",
      "GD&T symbol detection & extraction",
      "Dimension & tolerance auto-read",
    ],
    accuracy: "89.7%",
    latency: "3.4s avg",
    supportedFormats: ["PDF", "PNG", "JPG", "SVG", "DXF", "TIFF"],
  },
  {
    title: "Simulation AI",
    badge: "ML Surrogate",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    icon: Activity,
    capabilities: [
      "Mesh quality prediction & auto-refinement",
      "Solver parameter optimization",
      "Result interpolation between configs",
      "Rapid parametric sweep estimation",
      "Anomaly detection in simulation results",
    ],
    accuracy: "94.5%",
    latency: "0.8s avg",
    speedup: "~50x faster than full CFD solve",
  },
];

const pipelineStages = [
  {
    label: "Input",
    sub: "Text / Image / PDF",
    icon: FileText,
    desc: "Natural language prompts, engineering drawings, sketches, or photographs are accepted as input.",
  },
  {
    label: "Preprocessing",
    sub: "Tokenization & Vision",
    icon: Layers,
    desc: "Inputs are tokenized, images segmented, and PDFs parsed into structured geometric primitives.",
  },
  {
    label: "LLM Reasoning",
    sub: "Claude Opus / Sonnet",
    icon: Brain,
    desc: "Multi-model routing selects the optimal LLM. Complex geometry uses Opus; simple edits use Sonnet.",
  },
  {
    label: "KCL Generation",
    sub: "Parametric Code",
    icon: Cpu,
    desc: "The LLM emits KCL-like parametric code that defines geometry, constraints, and design intent.",
  },
  {
    label: "CAD Kernel",
    sub: "OpenCASCADE WASM",
    icon: Box,
    desc: "KCL is executed in OpenCASCADE.js producing a B-rep solid with full topology and metadata.",
  },
  {
    label: "3D Output",
    sub: "STEP / STL / glTF",
    icon: Target,
    desc: "Final geometry is rendered in the 3D viewport and available for export in industry-standard formats.",
  },
];

const trainingDataSources = [
  {
    name: "ABC Dataset",
    count: "1M+",
    description: "Large-scale collection of mechanical CAD models with rich B-rep annotations.",
    usage: "Primary training corpus for geometric reasoning and feature recognition.",
  },
  {
    name: "ShapeNet",
    count: "51,300",
    description: "Richly-annotated 3D shape repository across 55 common object categories.",
    usage: "Category classification, shape completion, and viewpoint estimation tasks.",
  },
  {
    name: "Thingi10K",
    count: "10,000",
    description: "Curated dataset of 3D-printable models with manifold mesh guarantees.",
    usage: "Mesh quality validation, printability analysis, and topology correction.",
  },
  {
    name: "CADLLM Dataset",
    count: "45,000+",
    description: "HuggingFace dataset pairing natural language with parametric CAD sequences.",
    usage: "Fine-tuning the text-to-CAD generation pipeline and prompt understanding.",
  },
  {
    name: "McGill 3D Benchmark",
    count: "460",
    description: "Articulated and non-rigid 3D shapes for segmentation benchmarking.",
    usage: "Feature segmentation accuracy evaluation and part decomposition training.",
  },
];

const benchmarkRows = [
  { task: "Text → CAD Generation", model: "Claude Opus", accuracy: "92.3%", latency: "2.1s" },
  { task: "PDF → CAD Reconstruction", model: "Vision + Opus", accuracy: "89.7%", latency: "3.4s" },
  { task: "Image → CAD Reconstruction", model: "Vision + Sonnet", accuracy: "85.1%", latency: "4.2s" },
  { task: "Feature Detection", model: "ML Surrogate v2", accuracy: "94.5%", latency: "0.3s" },
  { task: "Dimension Extraction", model: "Vision + OCR", accuracy: "96.2%", latency: "1.1s" },
  { task: "GD&T Symbol Parsing", model: "Vision + Opus", accuracy: "91.8%", latency: "1.8s" },
];

type CapabilityStatus = boolean;

const capabilityMatrix: {
  feature: string;
  textToCad: CapabilityStatus;
  visionToCad: CapabilityStatus;
  simulationAi: CapabilityStatus;
}[] = [
  { feature: "Geometry Generation", textToCad: true, visionToCad: true, simulationAi: false },
  { feature: "Parametric Code Output", textToCad: true, visionToCad: false, simulationAi: false },
  { feature: "Feature Detection", textToCad: true, visionToCad: true, simulationAi: true },
  { feature: "Tolerance Analysis", textToCad: false, visionToCad: true, simulationAi: true },
  { feature: "Material Suggestion", textToCad: true, visionToCad: false, simulationAi: true },
  { feature: "Simulation Setup", textToCad: false, visionToCad: false, simulationAi: true },
  { feature: "Mesh Generation", textToCad: false, visionToCad: false, simulationAi: true },
  { feature: "Multi-turn Editing", textToCad: true, visionToCad: true, simulationAi: false },
];

const performanceMetrics = [
  { label: "Avg Generation Time", value: "2.3s", icon: Clock, trend: "-12% vs last month" },
  { label: "Avg Accuracy", value: "93.4%", icon: Target, trend: "+2.1% vs last month" },
  { label: "Models Processed", value: "12,847", icon: Database, trend: "+847 this week" },
  { label: "Active Users", value: "1,234", icon: Users, trend: "+18% MoM growth" },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
      {children}
    </h2>
  );
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle className="w-5 h-5 text-emerald-400" />
  ) : (
    <XCircle className="w-5 h-5 text-gray-600" />
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AIModelsPage() {
  const [activeStage, setActiveStage] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-300">
      {/* ---------- Header ---------- */}
      <header className="border-b border-[#21262d] bg-[#161b22]">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20">
              <Brain className="w-8 h-8 text-[#00D4FF]" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                AI Engine
              </h1>
              <p className="text-gray-400 text-lg mt-1">
                Multimodal AI for CAD / CAE &mdash; powering every design
                decision in ShilpaSutra
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-16">
        {/* ---------- 1. Model Cards ---------- */}
        <section>
          <SectionHeading>
            <Cpu className="w-6 h-6 text-[#00D4FF]" />
            Core AI Models
          </SectionHeading>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {modelCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-xl border border-[#21262d] bg-[#161b22] p-6 flex flex-col gap-4 hover:border-[#00D4FF]/40 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-[#00D4FF]/10">
                      <Icon className="w-6 h-6 text-[#00D4FF]" />
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${card.badgeColor}`}
                    >
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white">{card.title}</h3>

                  <ul className="space-y-2 text-sm flex-1">
                    {card.capabilities.map((cap) => (
                      <li key={cap} className="flex items-start gap-2">
                        <Zap className="w-4 h-4 text-[#00D4FF] mt-0.5 shrink-0" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center gap-4 pt-3 border-t border-[#21262d] text-xs">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Target className="w-3.5 h-3.5" /> {card.accuracy}
                    </span>
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Clock className="w-3.5 h-3.5" /> {card.latency}
                    </span>
                  </div>

                  {"examplePrompts" in card && (
                    <div className="pt-3 border-t border-[#21262d]">
                      <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                        Example Prompts
                      </p>
                      <ul className="space-y-1.5">
                        {(card.examplePrompts ?? []).map((p) => (
                          <li
                            key={p}
                            className="text-xs bg-[#0d1117] rounded-md px-3 py-2 font-mono text-gray-400 leading-relaxed"
                          >
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {"supportedFormats" in card && (
                    <div className="pt-3 border-t border-[#21262d]">
                      <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                        Supported Formats
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(card.supportedFormats ?? []).map((fmt) => (
                          <span
                            key={fmt}
                            className="text-xs bg-[#0d1117] border border-[#21262d] rounded px-2 py-0.5 text-gray-300"
                          >
                            {fmt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {"speedup" in card && (
                    <div className="pt-3 border-t border-[#21262d]">
                      <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {card.speedup}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------- 2. Architecture Diagram ---------- */}
        <section>
          <SectionHeading>
            <Layers className="w-6 h-6 text-[#00D4FF]" />
            Processing Pipeline
          </SectionHeading>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {pipelineStages.map((stage, idx) => {
              const Icon = stage.icon;
              const isActive = activeStage === idx;
              return (
                <React.Fragment key={stage.label}>
                  <button
                    onClick={() => setActiveStage(isActive ? null : idx)}
                    className={`relative rounded-xl border p-4 text-left transition-all ${
                      isActive
                        ? "border-[#00D4FF] bg-[#00D4FF]/5 shadow-lg shadow-[#00D4FF]/10"
                        : "border-[#21262d] bg-[#161b22] hover:border-[#00D4FF]/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                          isActive
                            ? "bg-[#00D4FF] text-[#0d1117]"
                            : "bg-[#21262d] text-gray-400"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? "text-[#00D4FF]" : "text-gray-500"
                        }`}
                      />
                    </div>
                    <p className="text-sm font-semibold text-white leading-tight">
                      {stage.label}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {stage.sub}
                    </p>

                    {/* Arrow connector (hidden on last) */}
                    {idx < pipelineStages.length - 1 && (
                      <span className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-[#00D4FF]/50 text-lg font-bold select-none pointer-events-none">
                        &#8594;
                      </span>
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {activeStage !== null && (
            <div className="mt-4 rounded-xl border border-[#00D4FF]/30 bg-[#161b22] p-5 text-sm leading-relaxed animate-in fade-in">
              <p className="text-white font-semibold mb-1">
                Stage {activeStage + 1}: {pipelineStages[activeStage].label}
              </p>
              <p className="text-gray-400">
                {pipelineStages[activeStage].desc}
              </p>
            </div>
          )}
        </section>

        {/* ---------- 3. Training Data Sources ---------- */}
        <section>
          <SectionHeading>
            <Database className="w-6 h-6 text-[#00D4FF]" />
            Training Data Sources
          </SectionHeading>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {trainingDataSources.map((ds) => (
              <div
                key={ds.name}
                className="rounded-xl border border-[#21262d] bg-[#161b22] p-5 hover:border-[#00D4FF]/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-semibold">{ds.name}</h4>
                  <span className="text-xs font-bold bg-[#00D4FF]/10 text-[#00D4FF] px-2.5 py-1 rounded-full">
                    {ds.count} models
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-3">{ds.description}</p>
                <p className="text-xs text-gray-500 border-t border-[#21262d] pt-3">
                  <span className="text-gray-400 font-medium">Usage:</span>{" "}
                  {ds.usage}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- 4. Benchmarks Table ---------- */}
        <section>
          <SectionHeading>
            <BarChart3 className="w-6 h-6 text-[#00D4FF]" />
            Benchmarks
          </SectionHeading>

          <div className="rounded-xl border border-[#21262d] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#161b22] text-left text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Task</th>
                  <th className="px-6 py-4 font-semibold">Model</th>
                  <th className="px-6 py-4 font-semibold text-right">
                    Accuracy
                  </th>
                  <th className="px-6 py-4 font-semibold text-right">
                    Latency
                  </th>
                </tr>
              </thead>
              <tbody>
                {benchmarkRows.map((row, idx) => (
                  <tr
                    key={row.task}
                    className={`border-t border-[#21262d] ${
                      idx % 2 === 0 ? "bg-[#0d1117]" : "bg-[#161b22]/50"
                    } hover:bg-[#00D4FF]/5 transition-colors`}
                  >
                    <td className="px-6 py-3.5 text-white font-medium">
                      {row.task}
                    </td>
                    <td className="px-6 py-3.5 text-gray-400">{row.model}</td>
                    <td className="px-6 py-3.5 text-right">
                      <span
                        className={`font-semibold ${
                          parseFloat(row.accuracy) >= 93
                            ? "text-emerald-400"
                            : parseFloat(row.accuracy) >= 90
                            ? "text-[#00D4FF]"
                            : "text-yellow-400"
                        }`}
                      >
                        {row.accuracy}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right text-gray-400">
                      {row.latency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------- 5. Capabilities Matrix ---------- */}
        <section>
          <SectionHeading>
            <Zap className="w-6 h-6 text-[#00D4FF]" />
            Capabilities Matrix
          </SectionHeading>

          <div className="rounded-xl border border-[#21262d] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#161b22] text-left text-xs uppercase tracking-wider text-gray-400">
                  <th className="px-6 py-4 font-semibold">Feature</th>
                  <th className="px-6 py-4 font-semibold text-center">
                    Text-to-CAD
                  </th>
                  <th className="px-6 py-4 font-semibold text-center">
                    Vision-to-CAD
                  </th>
                  <th className="px-6 py-4 font-semibold text-center">
                    Simulation AI
                  </th>
                </tr>
              </thead>
              <tbody>
                {capabilityMatrix.map((row, idx) => (
                  <tr
                    key={row.feature}
                    className={`border-t border-[#21262d] ${
                      idx % 2 === 0 ? "bg-[#0d1117]" : "bg-[#161b22]/50"
                    }`}
                  >
                    <td className="px-6 py-3.5 text-white font-medium">
                      {row.feature}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-flex justify-center">
                        <StatusIcon ok={row.textToCad} />
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-flex justify-center">
                        <StatusIcon ok={row.visionToCad} />
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-flex justify-center">
                        <StatusIcon ok={row.simulationAi} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------- 6. Performance Metrics ---------- */}
        <section>
          <SectionHeading>
            <TrendingUp className="w-6 h-6 text-[#00D4FF]" />
            Performance Metrics
          </SectionHeading>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {performanceMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className="rounded-xl border border-[#21262d] bg-[#161b22] p-6 hover:border-[#00D4FF]/30 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-[#00D4FF]/10">
                      <Icon className="w-5 h-5 text-[#00D4FF]" />
                    </div>
                    <span className="text-sm text-gray-400">{metric.label}</span>
                  </div>
                  <p className="text-3xl font-extrabold text-white mb-1">
                    {metric.value}
                  </p>
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {metric.trend}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------- 7. Footer Note ---------- */}
        <section className="border-t border-[#21262d] pt-8 pb-4 text-center">
          <p className="text-xs text-gray-500">
            Benchmarks measured on internal validation sets. Production
            performance may vary based on input complexity and server load.
          </p>
          <p className="text-xs text-gray-600 mt-2">
            ShilpaSutra AI Engine &middot; Last updated March 2026
          </p>
        </section>
      </main>
    </div>
  );
}
