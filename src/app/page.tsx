"use client";
import Link from "next/link";
import { useState } from "react";

const stats = [
  { label: "CAD Models", value: "12", icon: "□", color: "from-blue-600 to-blue-800" },
  { label: "Simulations", value: "5", icon: "⚙", color: "from-green-600 to-green-800" },
  { label: "Parts Library", value: "248", icon: "▦", color: "from-purple-600 to-purple-800" },
  { label: "AI Generations", value: "37", icon: "☆", color: "from-amber-600 to-amber-800" },
];

const features = [
  { title: "CAD Designer", desc: "Create 3D models with AI text-to-CAD, KCL code editor, sketch tools, and parametric modeling.", href: "/designer", icon: "✎", tag: "3 modes: Click + Code + AI" },
  { title: "FEA/CFD Simulator", desc: "Full simulation workflow: Geometry > Mesh > Physics > Materials > Solver > Results.", href: "/simulator", icon: "⚙", tag: "6-step guided workflow" },
  { title: "Parts Library", desc: "Browse 248+ parametric components with search, filters, ratings, and one-click import.", href: "/library", icon: "▦", tag: "Grid + List views" },
  { title: "2D Drawings", desc: "Generate engineering drawings with dimensions, GD&T symbols, title blocks, and annotations.", href: "/drawings", icon: "📏", tag: "ISO 128 / ASME Y14.5" },
  { title: "Assembly", desc: "Build multi-part assemblies with constraints: coincident, concentric, distance, angle.", href: "/assembly", icon: "🔧", tag: "10 constraint types" },
  { title: "Text to CAD", desc: "Describe any part in plain English and get a 3D model. Supports STEP, STL, OBJ export.", href: "/text-to-cad", icon: "💬", tag: "AI-powered generation" },
];

const recentProjects = [
  { name: "Bracket Assembly v2", type: "CAD", updated: "2 hours ago", status: "Active" },
  { name: "Pipe Flow CFD", type: "CFD", updated: "5 hours ago", status: "Completed" },
  { name: "Gear Train 20T-40T", type: "CAD", updated: "1 day ago", status: "Active" },
  { name: "Heat Sink Thermal", type: "FEA", updated: "2 days ago", status: "Completed" },
  { name: "Enclosure Modal", type: "FEA", updated: "3 days ago", status: "Draft" },
];

const quickStart = [
  { label: "Text to CAD", desc: "Describe a part in plain English", icon: "💬", href: "/text-to-cad" },
  { label: "Import STEP", desc: "Upload existing CAD file", icon: "📂", href: "/designer" },
  { label: "From Template", desc: "Start from a sample project", icon: "📄", href: "/library" },
  { label: "AI Assistant", desc: "Ask ShilpaSutra AI anything", icon: "🤖", href: "/designer" },
];

const tips = [
  "Press Ctrl+K anywhere to open the Command Bar",
  "Use Text-to-CAD to generate models from descriptions",
  "Click any part in the Library to import it into Designer",
  "The KCL code editor supports auto-complete and AI suggestions",
  "Export your designs as STEP, STL, OBJ, or IGES formats",
];

export default function Dashboard() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [tipIdx, setTipIdx] = useState(0);

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      {/* Onboarding Banner */}
      {showOnboarding && (
        <div className="bg-gradient-to-r from-[#e94560]/20 to-[#0f3460]/20 border-b border-[#e94560]/30 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">🌟</span>
            <span className="text-sm"><strong>Welcome to ShilpaSutra!</strong> Start with Text-to-CAD to create your first 3D model, or explore the Parts Library for ready-made components.</span>
          </div>
          <button onClick={() => setShowOnboarding(false)} className="text-slate-400 hover:text-white text-sm px-2">✕</button>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-[#16213e] to-[#0f3460] border-b border-[#0f3460] px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">शिल्पसूत्र <span className="text-[#e94560]">ShilpaSutra</span></h1>
            <p className="text-slate-400 text-sm mt-1">AI-Powered CAD & CFD Design Platform | Text/Multimodal to CAD</p>
          </div>
          <div className="flex gap-2">
            <Link href="/designer" className="bg-[#e94560] hover:bg-[#d63750] px-4 py-2 rounded-lg text-sm font-bold">+ New Design</Link>
            <Link href="/text-to-cad" className="bg-[#0f3460] hover:bg-[#1a4a80] px-4 py-2 rounded-lg text-sm border border-[#0f3460]">Text to CAD</Link>
            <Link href="/settings" className="bg-[#0f3460] hover:bg-[#1a4a80] px-3 py-2 rounded-lg text-sm border border-[#0f3460]">⚙</Link>
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          {stats.map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl p-4`}>
              <div className="flex items-center justify-between">
                <div><div className="text-xs text-white/70">{s.label}</div><div className="text-2xl font-bold mt-1">{s.value}</div></div>
                <div className="text-3xl opacity-50">{s.icon}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Quick Start */}
        <div>
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">🚀 Quick Start - Choose how to begin</h2>
          <div className="grid grid-cols-4 gap-3">
            {quickStart.map(q => (
              <Link key={q.label} href={q.href} className="bg-[#16213e] border border-[#0f3460] hover:border-[#e94560] rounded-xl p-4 transition-all hover:scale-[1.02] group">
                <div className="text-2xl mb-2">{q.icon}</div>
                <div className="text-sm font-medium group-hover:text-[#e94560]">{q.label}</div>
                <div className="text-xs text-slate-500 mt-1">{q.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-[#0d1117] border border-[#0f3460] rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">💡</span>
            <span className="text-xs text-slate-400">{tips[tipIdx]}</span>
          </div>
          <button onClick={() => setTipIdx((tipIdx + 1) % tips.length)} className="text-xs text-[#e94560] hover:underline">Next tip →</button>
        </div>

        {/* Workspace Cards */}
        <div>
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">⚙ Workspaces</h2>
          <div className="grid grid-cols-3 gap-4">
            {features.map(f => (
              <Link key={f.title} href={f.href} className="bg-[#16213e] border border-[#0f3460] hover:border-[#e94560] rounded-xl p-5 transition-all hover:scale-[1.01] group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{f.icon}</span>
                  <h3 className="font-bold group-hover:text-[#e94560]">{f.title}</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                <div className="mt-3 text-[10px] bg-[#0f3460] inline-block px-2 py-1 rounded text-slate-300">{f.tag}</div>
                <div className="mt-2 text-xs text-[#e94560] group-hover:underline">Open {f.title} →</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Projects */}
        <div>
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">📁 Recent Projects</h2>
          <div className="bg-[#16213e] border border-[#0f3460] rounded-xl overflow-hidden">
            <div className="grid grid-cols-5 gap-4 px-4 py-2 text-[10px] text-slate-500 uppercase tracking-wider border-b border-[#0f3460]">
              <span>Name</span><span>Type</span><span>Updated</span><span>Status</span><span>Actions</span>
            </div>
            {recentProjects.map(p => (
              <div key={p.name} className="grid grid-cols-5 gap-4 px-4 py-3 text-xs hover:bg-[#0f3460]/30 border-b border-[#0f3460]/50">
                <span className="font-medium">{p.name}</span>
                <span className={`${p.type==="CAD" ? "text-blue-400" : p.type==="CFD" ? "text-green-400" : "text-purple-400"}`}>{p.type}</span>
                <span className="text-slate-500">{p.updated}</span>
                <span className={`${p.status==="Active" ? "text-green-400" : p.status==="Completed" ? "text-blue-400" : "text-slate-500"}`}>{p.status}</span>
                <div className="flex gap-2">
                  <button className="text-[#e94560] hover:underline">Open</button>
                  <button className="text-slate-500 hover:text-white">Clone</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Info */}
        <div className="bg-[#0d1117] border border-[#0f3460] rounded-xl p-4 text-xs text-slate-500">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-white font-bold">ShilpaSutra v1.0</span> | Zoo-inspired AI-native CAD | Text-to-CAD + KCL Code + Point & Click
            </div>
            <div className="flex gap-4">
              <span>Engine: B-rep + OpenFOAM + CalculiX</span>
              <span>Stack: Next.js + Three.js + R3F</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}"use client";
import Link from "next/link";
import { useState } from "react";

const stats = [
  { label: "CAD Models", value: "12", icon: "□", color: "from-blue-600 to-blue-800" },
  { label: "Simulations", value: "5", icon: "⚙", color: "from-green-600 to-green-800" },
  { label: "Parts Library", value: "248", icon: "▦", color: "from-purple-600 to-purple-800" },
  { label: "AI Generations", value: "37", icon: "☆", color: "from-amber-600 to-amber-800" },
];

const features = [
  { title: "CAD Designer", desc: "Create 3D models with AI text-to-CAD, KCL code editor, sketch tools, and parametric modeling.", href: "/designer", icon: "✎", tag: "3 modes: Click + Code + AI" },
  { title: "FEA/CFD Simulator", desc: "Full simulation workflow: Geometry > Mesh > Physics > Materials > Solver > Results.", href: "/simulator", icon: "⚙", tag: "6-step guided workflow" },
  { title: "Parts Library", desc: "Browse 248+ parametric components with search, filters, ratings, and one-click import.", href: "/library", icon: "▦", tag: "Grid + List views" },
  { title: "2D Drawings", desc: "Generate engineering drawings with dimensions, GD&T symbols, title blocks, and annotations.", href: "/drawings", icon: "📏", tag: "ISO 128 / ASME Y14.5" },
  { title: "Assembly", desc: "Build multi-part assemblies with constraints: coincident, concentric, distance, angle.", href: "/assembly", icon: "🔧", tag: "10 constraint types" },
  { title: "Text to CAD", desc: "Describe any part in plain English and get a 3D model. Supports STEP, STL, OBJ export.", href: "/text-to-cad", icon: "💬", tag: "AI-powered generation" },
];

const recentProjects = [
  { name: "Bracket Assembly v2", type: "CAD", updated: "2 hours ago", status: "Active" },
  { name: "Pipe Flow CFD", type: "CFD", updated: "5 hours ago", status: "Completed" },
  { name: "Gear Train 20T-40T", type: "CAD", updated: "1 day ago", status: "Active" },
  { name: "Heat Sink Thermal", type: "FEA", updated: "2 days ago", status: "Completed" },
  { name: "Enclosure Modal", type: "FEA", updated: "3 days ago", status: "Draft" },
];

const quickStart = [
  { label: "Text to CAD", desc: "Describe a part in plain English", icon: "💬", href: "/text-to-cad" },
  { label: "Import STEP", desc: "Upload existing CAD file", icon: "📂", href: "/designer" },
  { label: "From Template", desc: "Start from a sample project", icon: "📄", href: "/library" },
  { label: "AI Assistant", desc: "Ask ShilpaSutra AI anything", icon: "🤖", href: "/designer" },
];

const tips = [
  "Press Ctrl+K anywhere to open the Command Bar",
  "Use Text-to-CAD to generate models from descriptions",
  "Click any part in the Library to import it into Designer",
  "The KCL code editor supports auto-complete and AI suggestions",
  "Export your designs as STEP, STL, OBJ, or IGES formats",
];

export default function Dashboard() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [tipIdx, setTipIdx] = useState(0);

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      {/* Onboarding Banner */}
      {showOnboarding && (
        <div className="bg-gradient-to-r from-[#e94560]/20 to-[#0f3460]/20 border-b border-[#e94560]/30 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">🌟</span>
            <span className="text-sm"><strong>Welcome to ShilpaSutra!</strong> Start with Text-to-CAD to create your first 3D model, or explore the Parts Library for ready-made components.</span>
          </div>
          <button onClick={() => setShowOnboarding(false)} className="text-slate-400 hover:text-white text-sm px-2">✕</button>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-[#16213e] to-[#0f3460] border-b border-[#0f3460] px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">शिल्पसूत्र <span className="text-[#e94560]">ShilpaSutra</span></h1>
            <p className="text-slate-400 text-sm mt-1">AI-Powered CAD & CFD Design Platform | Text/Multimodal to CAD</p>
          </div>
          <div className="flex gap-2">
            <Link href="/designer" className="bg-[#e94560] hover:bg-[#d63750] px-4 py-2 rounded-lg text-sm font-bold">+ New Design</Link>
            <Link href="/text-to-cad" className="bg-[#0f3460] hover:bg-[#1a4a80] px-4 py-2 rounded-lg text-sm border border-[#0f3460]">Text to CAD</Link>
            <Link href="/settings" className="bg-[#0f3460] hover:bg-[#1a4a80] px-3 py-2 rounded-lg text-sm border border-[#0f3460]">⚙</Link>
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          {stats.map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl p-4`}>
              <div className="flex items-center justify-between">
                <div><div className="text-xs text-white/70">{s.label}</div><div className="text-2xl font-bold mt-1">{s.value}</div></div>
                <div className="text-3xl opacity-50">{s.icon}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Quick Start */}
        <div>
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">🚀 Quick Start - Choose how to begin</h2>
          <div className="grid grid-cols-4 gap-3">
            {quickStart.map(q => (
              <Link key={q.label} href={q.href} className="bg-[#16213e] border border-[#0f3460] hover:border-[#e94560] rounded-xl p-4 transition-all hover:scale-[1.02] group">
                <div className="text-2xl mb-2">{q.icon}</div>
                <div className="text-sm font-medium group-hover:text-[#e94560]">{q.label}</div>
                <div className="text-xs text-slate-500 mt-1">{q.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-[#0d1117] border border-[#0f3460] rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">💡</span>
            <span className="text-xs text-slate-400">{tips[tipIdx]}</span>
          </div>
          <button onClick={() => setTipIdx((tipIdx + 1) % tips.length)} className="text-xs text-[#e94560] hover:underline">Next tip →</button>
        </div>

        {/* Workspace Cards */}
        <div>
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">⚙ Workspaces</h2>
          <div className="grid grid-cols-3 gap-4">
            {features.map(f => (
              <Link key={f.title} href={f.href} className="bg-[#16213e] border border-[#0f3460] hover:border-[#e94560] rounded-xl p-5 transition-all hover:scale-[1.01] group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{f.icon}</span>
                  <h3 className="font-bold group-hover:text-[#e94560]">{f.title}</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                <div className="mt-3 text-[10px] bg-[#0f3460] inline-block px-2 py-1 rounded text-slate-300">{f.tag}</div>
                <div className="mt-2 text-xs text-[#e94560] group-hover:underline">Open {f.title} →</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Projects */}
        <div>
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">📁 Recent Projects</h2>
          <div className="bg-[#16213e] border border-[#0f3460] rounded-xl overflow-hidden">
            <div className="grid grid-cols-5 gap-4 px-4 py-2 text-[10px] text-slate-500 uppercase tracking-wider border-b border-[#0f3460]">
              <span>Name</span><span>Type</span><span>Updated</span><span>Status</span><span>Actions</span>
            </div>
            {recentProjects.map(p => (
              <div key={p.name} className="grid grid-cols-5 gap-4 px-4 py-3 text-xs hover:bg-[#0f3460]/30 border-b border-[#0f3460]/50">
                <span className="font-medium">{p.name}</span>
                <span className={`${p.type==="CAD" ? "text-blue-400" : p.type==="CFD" ? "text-green-400" : "text-purple-400"}`}>{p.type}</span>
                <span className="text-slate-500">{p.updated}</span>
                <span className={`${p.status==="Active" ? "text-green-400" : p.status==="Completed" ? "text-blue-400" : "text-slate-500"}`}>{p.status}</span>
                <div className="flex gap-2">
                  <button className="text-[#e94560] hover:underline">Open</button>
                  <button className="text-slate-500 hover:text-white">Clone</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Info */}
        <div className="bg-[#0d1117] border border-[#0f3460] rounded-xl p-4 text-xs text-slate-500">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-white font-bold">ShilpaSutra v1.0</span> | Zoo-inspired AI-native CAD | Text-to-CAD + KCL Code + Point & Click
            </div>
            <div className="flex gap-4">
              <span>Engine: B-rep + OpenFOAM + CalculiX</span>
              <span>Stack: Next.js + Three.js + R3F</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
