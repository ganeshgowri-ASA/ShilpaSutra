"use client";
import Link from "next/link";
import { useState } from "react";

interface ModuleCard {
  title: string;
  desc: string;
  href: string;
  icon: string;
  badge?: string;
  badgeColor: string;
  status: "active" | "beta" | "new";
  lastAccessed?: string;
}

const stats = [
  { label: "CAD Models", value: "12", change: "+3 this week", icon: "M", color: "from-blue-600/20 to-blue-800/20", border: "border-blue-500/30", text: "text-blue-400" },
  { label: "Simulations", value: "8", change: "+2 this week", icon: "S", color: "from-green-600/20 to-green-800/20", border: "border-green-500/30", text: "text-green-400" },
  { label: "Parts Library", value: "248", change: "Components", icon: "P", color: "from-purple-600/20 to-purple-800/20", border: "border-purple-500/30", text: "text-purple-400" },
  { label: "AI Generations", value: "37", change: "+12 this week", icon: "A", color: "from-amber-600/20 to-amber-800/20", border: "border-amber-500/30", text: "text-amber-400" },
  { label: "Reports", value: "5", change: "Generated", icon: "R", color: "from-cyan-600/20 to-cyan-800/20", border: "border-cyan-500/30", text: "text-cyan-400" },
  { label: "Drawings", value: "9", change: "Sheets", icon: "D", color: "from-rose-600/20 to-rose-800/20", border: "border-rose-500/30", text: "text-rose-400" },
];

const quickActions = [
  { title: "Text to CAD", desc: "Describe a part in English", href: "/text-to-cad", icon: "AI", hotkey: "T" },
  { title: "New Design", desc: "Open 3D CAD Designer", href: "/designer", icon: "+", hotkey: "N" },
  { title: "Run Simulation", desc: "FEA or CFD analysis", href: "/simulator", icon: "F", hotkey: "S" },
  { title: "From Template", desc: "Start from parts library", href: "/library", icon: "L", hotkey: "L" },
];

const modules: ModuleCard[] = [
  { title: "CAD Designer", desc: "3D modeling with sketch tools, extrude, revolve, loft, fillet, chamfer, boolean ops. AI-assisted parametric design.", href: "/designer", icon: "D", badge: "Pro", badgeColor: "bg-blue-500/20 text-blue-400", status: "active", lastAccessed: "2 min ago" },
  { title: "FEA Simulator", desc: "Structural analysis with mesh generation, material library, loads, boundary conditions, Von Mises stress visualization.", href: "/simulator", icon: "F", badge: "v2", badgeColor: "bg-green-500/20 text-green-400", status: "active", lastAccessed: "15 min ago" },
  { title: "CFD Analysis", desc: "Thermal and fluid flow simulation with velocity, pressure, temperature contours and convergence tracking.", href: "/cfd", icon: "T", badge: "v2", badgeColor: "bg-green-500/20 text-green-400", status: "active", lastAccessed: "1 hr ago" },
  { title: "Assembly", desc: "Multi-part assemblies with mates, exploded views, BOM generation, interference detection, and section views.", href: "/assembly", icon: "A", badge: "v2", badgeColor: "bg-green-500/20 text-green-400", status: "active", lastAccessed: "3 hr ago" },
  { title: "Photo Renderer", desc: "PBR materials, HDR environments, professional lighting, turntable animation, high-res screenshot export.", href: "/renderer", icon: "R", badge: "v2", badgeColor: "bg-green-500/20 text-green-400", status: "active", lastAccessed: "1 day ago" },
  { title: "2D Drawings", desc: "Engineering drawings with orthographic views, dimensions, GD&T symbols, title blocks, PDF/DXF/SVG export.", href: "/drawings", icon: "2D", badge: "v2", badgeColor: "bg-green-500/20 text-green-400", status: "active", lastAccessed: "1 day ago" },
  { title: "Reports", desc: "Auto-generated engineering reports with FEA/CFD results, BOM, charts, convergence plots, PDF export.", href: "/reports", icon: "Re", badge: "v2", badgeColor: "bg-green-500/20 text-green-400", status: "active", lastAccessed: "2 days ago" },
  { title: "Parts Library", desc: "Browse 248+ parametric components: gears, brackets, fasteners, enclosures. Search, filter, one-click import.", href: "/library", icon: "Li", badge: "", badgeColor: "", status: "active", lastAccessed: "3 days ago" },
  { title: "Text to CAD", desc: "Describe any part in natural language and get a 3D model. Supports STEP, STL, OBJ export. AI-powered.", href: "/text-to-cad", icon: "AI", badge: "AI", badgeColor: "bg-[#e94560]/20 text-[#e94560]", status: "active", lastAccessed: "5 min ago" },
];

const recentFiles = [
  { name: "Bracket_v2.step", type: "CAD", modified: "2 hours ago", status: "saved" },
  { name: "Bracket_FEA_Analysis.sim", type: "FEA", modified: "15 min ago", status: "complete" },
  { name: "Thermal_CFD_Report.pdf", type: "CFD", modified: "1 hour ago", status: "exported" },
  { name: "Motor_Assembly.asm", type: "ASM", modified: "3 hours ago", status: "saved" },
  { name: "Gear_20T_M2.step", type: "CAD", modified: "5 hours ago", status: "saved" },
  { name: "Assembly_BOM.csv", type: "BOM", modified: "1 day ago", status: "exported" },
];

const typeColors: Record<string, string> = {
  CAD: "bg-blue-500/20 text-blue-400",
  FEA: "bg-green-500/20 text-green-400",
  CFD: "bg-orange-500/20 text-orange-400",
  ASM: "bg-purple-500/20 text-purple-400",
  BOM: "bg-cyan-500/20 text-cyan-400",
};

export default function DashboardPage() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d1117]">
      {/* Onboarding Banner */}
      {showOnboarding && (
        <div className="bg-gradient-to-r from-[#00D4FF]/10 to-[#e94560]/10 border-b border-[#00D4FF]/20 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-[#00D4FF]/20 flex items-center justify-center text-[#00D4FF] font-bold text-sm">SS</span>
            <span className="text-sm text-slate-200">
              <strong>Welcome to ShilpaSutra!</strong> Start with Text-to-CAD or open the Parts Library to begin.
            </span>
          </div>
          <button onClick={() => setShowOnboarding(false)} className="text-slate-400 hover:text-white text-xl leading-none px-2">&times;</button>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-0.5">AI-Powered CAD, FEA, CFD & Engineering Platform</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/text-to-cad" className="bg-[#00D4FF] hover:bg-[#00b8d9] text-black px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-[#00D4FF]/20">
              + New Design
            </Link>
            <Link href="/library" className="bg-[#161b22] border border-[#21262d] hover:border-[#00D4FF] text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors">
              Parts Library
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-6 gap-3">
          {stats.map((s) => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl p-3 border ${s.border}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{s.label}</span>
                <span className={`w-6 h-6 rounded bg-[#0d1117]/50 text-[10px] font-bold flex items-center justify-center ${s.text}`}>{s.icon}</span>
              </div>
              <div className={`text-2xl font-bold mt-1 ${s.text}`}>{s.value}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{s.change}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((a) => (
              <Link
                key={a.title}
                href={a.href}
                className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 hover:border-[#00D4FF]/50 hover:shadow-lg hover:shadow-[#00D4FF]/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-lg bg-[#00D4FF]/10 text-[#00D4FF] flex items-center justify-center font-bold text-sm group-hover:bg-[#00D4FF]/20 transition-colors">
                    {a.icon}
                  </span>
                  <div>
                    <div className="font-semibold text-sm text-white group-hover:text-[#00D4FF] transition-colors">{a.title}</div>
                    <div className="text-[10px] text-slate-500">{a.desc}</div>
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-[9px] text-slate-600 bg-[#0d1117] px-1.5 py-0.5 rounded font-mono">Alt+{a.hotkey}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Modules + Recent Files */}
        <div className="grid grid-cols-3 gap-4">
          {/* Modules Grid */}
          <div className="col-span-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Workspaces</h2>
            <div className="grid grid-cols-3 gap-3">
              {modules.map((m) => (
                <Link
                  key={m.title}
                  href={m.href}
                  className="bg-[#161b22] border border-[#21262d] rounded-xl p-3 hover:border-[#30363d] hover:shadow-lg transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-[#21262d] text-[10px] font-bold text-[#00D4FF] flex items-center justify-center group-hover:bg-[#00D4FF]/20 transition-colors">
                        {m.icon}
                      </span>
                      <h3 className="font-bold text-xs text-white group-hover:text-[#00D4FF] transition-colors">{m.title}</h3>
                    </div>
                    {m.badge && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${m.badgeColor}`}>{m.badge}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{m.desc}</p>
                  {m.lastAccessed && (
                    <div className="text-[9px] text-slate-600 mt-2">Last: {m.lastAccessed}</div>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Files */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Files</h2>
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl divide-y divide-[#21262d]">
              {recentFiles.map((f) => (
                <div key={f.name} className="px-4 py-2.5 flex items-center justify-between hover:bg-[#21262d]/50 cursor-pointer transition-colors">
                  <div>
                    <div className="text-xs font-medium text-white">{f.name}</div>
                    <div className="text-[10px] text-slate-500">{f.modified}</div>
                  </div>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${typeColors[f.type] || "bg-slate-500/20 text-slate-400"}`}>
                    {f.type}
                  </span>
                </div>
              ))}
            </div>

            {/* Project summary */}
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 mt-3 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Summary</div>
              <div className="text-[10px] text-slate-500">Total Models: <span className="text-white">12</span></div>
              <div className="text-[10px] text-slate-500">Simulations Run: <span className="text-white">8</span></div>
              <div className="text-[10px] text-slate-500">Reports Generated: <span className="text-white">5</span></div>
              <div className="text-[10px] text-slate-500">Storage Used: <span className="text-white">142 MB</span></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-600 py-4 border-t border-[#21262d]">
          ShilpaSutra v2.0 | AI Engine: Claude | Geometry Kernel: OpenCASCADE.js | Simulation: FEM + FVM
        </div>
      </div>
    </div>
  );
}
