"use client";
import Link from "next/link";
import { useState } from "react";

const stats = [
  { label: "CAD Models", value: "12", icon: "📄", color: "from-blue-600 to-blue-800" },
  { label: "Simulations", value: "5", icon: "⚗️", color: "from-green-600 to-green-800" },
  { label: "Parts Library", value: "248", icon: "📦", color: "from-purple-600 to-purple-800" },
  { label: "AI Generations", value: "37", icon: "🤖", color: "from-amber-600 to-amber-800" },
];

const quickActions = [
  { title: "Text to CAD", desc: "Describe a part in plain English", href: "/text-to-cad", icon: "💬", hotkey: "T" },
  { title: "Import STEP", desc: "Upload existing CAD file", href: "/designer", icon: "📂", hotkey: "I" },
  { title: "From Template", desc: "Start from a sample project", href: "/library", icon: "📋", hotkey: "N" },
  { title: "AI Assistant", desc: "Ask ShilpaSutra AI anything", href: "/text-to-cad", icon: "🧠", hotkey: "A" },
];

const workspaces = [
  { title: "CAD Designer", desc: "3D modeling with sketch tools, extrude, revolve, loft, fillet, chamfer. AI-assisted parametric design.", href: "/designer", icon: "✏️", badge: "Pro" },
  { title: "FEA/CFD Simulator", desc: "Full simulation workflow: Geometry, Mesh, Physics, Materials, Solver, Results. OpenFOAM + CalculiX.", href: "/simulator", icon: "⚗️", badge: "New" },
  { title: "Parts Library", desc: "Browse 248+ parametric components. Search, filter, rate, and one-click import into designer.", href: "/library", icon: "📦", badge: "" },
  { title: "Assembly", desc: "Multi-part assemblies with constraints: coincident, concentric, distance, angle, tangent, gear.", href: "/assembly", icon: "🔧", badge: "" },
  { title: "2D Drawings", desc: "Engineering drawings with dimensions, GD&T symbols, title blocks, and annotations. ISO/ASME.", href: "/drawings", icon: "📐", badge: "" },
  { title: "Text to CAD", desc: "Describe any part and get a 3D model. Supports STEP, STL, OBJ export. AI-powered generation.", href: "/text-to-cad", icon: "🤖", badge: "AI" },
];

const recentFiles = [
  { name: "Bracket_v2.step", type: "CAD", modified: "2 hours ago", status: "saved" },
  { name: "Gear_20T_M2.step", type: "CAD", modified: "5 hours ago", status: "saved" },
  { name: "Pipe_Flange_DN50.stl", type: "CAD", modified: "1 day ago", status: "exported" },
  { name: "Bracket_FEA_Report.pdf", type: "SIM", modified: "1 day ago", status: "complete" },
  { name: "Motor_Mount_Assembly.asm", type: "ASM", modified: "2 days ago", status: "saved" },
];

const tips = [
  "Press Ctrl+K anywhere to open the Command Bar",
  "Use Text-to-CAD to generate parts from natural language descriptions",
  "Import STEP files directly into the Designer for editing",
  "Run FEA simulations on any CAD model with one click",
  "Export drawings as PDF with GD&T annotations",
];

export default function DashboardPage() {
  const [tipIndex, setTipIndex] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(true);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d1117]">
      {/* Onboarding Banner */}
      {showOnboarding && (
        <div className="bg-gradient-to-r from-[#e94560]/20 to-[#0f3460]/20 border-b border-[#e94560]/30 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">⭐</span>
            <span className="text-sm text-slate-200"><strong>Welcome to ShilpaSutra!</strong> Start with Text-to-CAD to create your first 3D model, or explore the Parts Library for ready-made components.</span>
          </div>
          <button onClick={() => setShowOnboarding(false)} className="text-slate-400 hover:text-white text-xl leading-none px-2">&times;</button>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-3xl">शिल्पसूत्र</span> ShilpaSutra
            </h1>
            <p className="text-slate-400 text-sm mt-1">AI-Powered CAD & CFD Design Platform | Text/Multimodal to CAD</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/text-to-cad" className="bg-[#e94560] hover:bg-[#d63750] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg">+ New Design</Link>
            <Link href="/text-to-cad" className="bg-[#161b22] border border-[#21262d] hover:border-[#e94560] text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors">Text to CAD</Link>
            <Link href="/settings" className="w-9 h-9 rounded-lg bg-[#161b22] border border-[#21262d] flex items-center justify-center text-slate-400 hover:text-white hover:border-[#30363d] transition-colors">⚙️</Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl p-4 shadow-lg`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/80">{s.label}</span>
                <span className="text-2xl">{s.icon}</span>
              </div>
              <div className="text-3xl font-bold mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Quick Start */}
        <div>
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">🚀 Quick Start - Choose How to Begin</h2>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((a) => (
              <Link key={a.title} href={a.href} className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 hover:border-[#e94560] hover:bg-[#161b22]/80 transition-all group">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{a.icon}</span>
                  <div>
                    <div className="font-semibold text-sm text-white group-hover:text-[#e94560] transition-colors">{a.title}</div>
                    <div className="text-xs text-slate-500">{a.desc}</div>
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-[10px] text-slate-600 bg-[#0d1117] px-1.5 py-0.5 rounded font-mono">Alt+{a.hotkey}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Tip Bar */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-lg px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">💡</span>
            <span className="text-sm text-slate-300">{tips[tipIndex]}</span>
          </div>
          <button onClick={() => setTipIndex((tipIndex + 1) % tips.length)} className="text-xs text-[#e94560] hover:text-white transition-colors">Next tip &rarr;</button>
        </div>

        {/* Two columns: Workspaces + Recent Files */}
        <div className="grid grid-cols-3 gap-4">
          {/* Workspaces */}
          <div className="col-span-2">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">🏗️ Workspaces</h2>
            <div className="grid grid-cols-2 gap-3">
              {workspaces.map((w) => (
                <Link key={w.title} href={w.href} className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 hover:border-[#30363d] hover:shadow-lg transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{w.icon}</span>
                      <h3 className="font-bold text-sm text-white group-hover:text-[#e94560] transition-colors">{w.title}</h3>
                    </div>
                    {w.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${w.badge === "AI" ? "bg-[#e94560]/20 text-[#e94560]" : w.badge === "New" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>{w.badge}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{w.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Files */}
          <div>
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">📁 Recent Files</h2>
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl divide-y divide-[#21262d]">
              {recentFiles.map((f) => (
                <div key={f.name} className="px-4 py-3 flex items-center justify-between hover:bg-[#21262d]/50 cursor-pointer transition-colors">
                  <div>
                    <div className="text-sm font-medium text-white">{f.name}</div>
                    <div className="text-xs text-slate-500">{f.modified}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${f.type === "CAD" ? "bg-blue-500/20 text-blue-400" : f.type === "SIM" ? "bg-green-500/20 text-green-400" : "bg-purple-500/20 text-purple-400"}`}>{f.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 py-4 border-t border-[#21262d]">
          ShilpaSutra v1.0 | AI Engine: Zookeeper v1 | Geometry Kernel: B-rep | Simulation: OpenFOAM + CalculiX
        </div>
      </div>
    </div>
  );
}
