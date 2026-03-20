"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Plus,
  FolderOpen,
  Upload,
  PlayCircle,
  Box,
  Activity,
  Library,
  Sparkles,
  FileText,
  ClipboardList,
  HardDrive,
  Info,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Download,
  Cpu,
  X,
} from "lucide-react";

const stats = [
  { label: "CAD Models", value: "12", change: "+3 this week", icon: <Box size={14} />, color: "from-blue-600/20 to-blue-800/20", border: "border-blue-500/30", text: "text-blue-400" },
  { label: "Simulations", value: "8", change: "+2 this week", icon: <Activity size={14} />, color: "from-green-600/20 to-green-800/20", border: "border-green-500/30", text: "text-green-400" },
  { label: "Parts Library", value: "248", change: "Components", icon: <Library size={14} />, color: "from-purple-600/20 to-purple-800/20", border: "border-purple-500/30", text: "text-purple-400" },
  { label: "AI Generations", value: "37", change: "+12 this week", icon: <Sparkles size={14} />, color: "from-amber-600/20 to-amber-800/20", border: "border-amber-500/30", text: "text-amber-400" },
  { label: "Reports", value: "5", change: "Generated", icon: <ClipboardList size={14} />, color: "from-cyan-600/20 to-cyan-800/20", border: "border-cyan-500/30", text: "text-cyan-400" },
  { label: "Drawings", value: "9", change: "Sheets", icon: <FileText size={14} />, color: "from-rose-600/20 to-rose-800/20", border: "border-rose-500/30", text: "text-rose-400" },
];

const quickActions = [
  { title: "New Design", desc: "Start a new 3D CAD model", href: "/designer", icon: <Plus size={18} />, hotkey: "N" },
  { title: "Open File", desc: "Browse existing projects", href: "/library", icon: <FolderOpen size={18} />, hotkey: "O" },
  { title: "Import Model", desc: "STEP, STL, OBJ, glTF", href: "/import-export", icon: <Upload size={18} />, hotkey: "I" },
  { title: "Start Simulation", desc: "Run FEA or CFD analysis", href: "/simulator", icon: <PlayCircle size={18} />, hotkey: "S" },
];

const recentProjects = [
  { name: "Bracket Assembly v2", type: "CAD", modified: "2 min ago", status: "active", progress: 85 },
  { name: "Thermal Analysis - Motor Housing", type: "CFD", modified: "15 min ago", status: "complete", progress: 100 },
  { name: "Gear Train 20T", type: "CAD", modified: "1 hr ago", status: "active", progress: 60 },
  { name: "Structural FEA - Chassis", type: "FEA", modified: "3 hr ago", status: "complete", progress: 100 },
  { name: "Enclosure Design v3", type: "CAD", modified: "1 day ago", status: "draft", progress: 30 },
  { name: "Flow Simulation - Intake", type: "CFD", modified: "2 days ago", status: "complete", progress: 100 },
];

const activityFeed = [
  { action: "Exported", target: "Bracket_v2.step", time: "2 min ago", icon: <Download size={12} /> },
  { action: "Simulation complete", target: "Thermal_Motor.cfd", time: "15 min ago", icon: <CheckCircle2 size={12} /> },
  { action: "AI generated", target: "Gear_20T model", time: "30 min ago", icon: <Sparkles size={12} /> },
  { action: "Created", target: "Enclosure_v3.step", time: "1 hr ago", icon: <Plus size={12} /> },
  { action: "Report generated", target: "FEA_Report.pdf", time: "3 hr ago", icon: <FileText size={12} /> },
  { action: "Warning", target: "Mesh quality low on part_7", time: "5 hr ago", icon: <AlertCircle size={12} /> },
];

const typeColors: Record<string, string> = {
  CAD: "bg-blue-500/20 text-blue-400",
  FEA: "bg-green-500/20 text-green-400",
  CFD: "bg-orange-500/20 text-orange-400",
};

const statusIcons: Record<string, React.ReactNode> = {
  active: <Clock size={10} className="text-amber-400" />,
  complete: <CheckCircle2 size={10} className="text-green-400" />,
  draft: <FileText size={10} className="text-slate-500" />,
};

const storageUsed = 142;
const storageTotal = 500;
const storagePercent = Math.round((storageUsed / storageTotal) * 100);

function generateDashboardReport() {
  const now = new Date().toLocaleString();
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>ShilpaSutra Engineering Report</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; color: #1a1a2e; }
    h1 { color: #005f8a; border-bottom: 2px solid #00D4FF; padding-bottom: 8px; }
    h2 { color: #005f8a; margin-top: 28px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #00D4FF; color: white; padding: 8px 12px; text-align: left; }
    td { padding: 8px 12px; border-bottom: 1px solid #e0e0e0; }
    tr:nth-child(even) td { background: #f5f5f5; }
    .good { color: green; font-weight: bold; }
    .warning { color: orange; font-weight: bold; }
    .critical { color: red; font-weight: bold; }
    .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h1>ShilpaSutra Engineering Report</h1>
  <div class="meta">
    <strong>Project:</strong> ShilpaSutra Demo Assembly &nbsp;|&nbsp;
    <strong>Date:</strong> ${now} &nbsp;|&nbsp;
    <strong>Platform:</strong> ShilpaSutra v2.0
  </div>
  <button onclick="window.print()" style="background:#00D4FF;color:white;border:none;padding:8px 20px;border-radius:4px;cursor:pointer;font-size:14px;margin-bottom:20px;">Print / Save PDF</button>

  <h2>FEA Results Summary</h2>
  <table>
    <thead><tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>Max Von Mises Stress</td><td>187.4</td><td>MPa</td><td class="good">Good</td></tr>
      <tr><td>Max Displacement</td><td>0.342</td><td>mm</td><td class="good">Good</td></tr>
      <tr><td>Min Safety Factor</td><td>1.82</td><td>-</td><td class="warning">Warning</td></tr>
      <tr><td>Total Strain Energy</td><td>12.67</td><td>J</td><td class="good">Good</td></tr>
      <tr><td>Max Principal Stress</td><td>201.3</td><td>MPa</td><td class="warning">Warning</td></tr>
      <tr><td>Yield Utilization</td><td>68.4</td><td>%</td><td class="good">Good</td></tr>
    </tbody>
  </table>

  <h2>CFD Results Summary</h2>
  <table>
    <thead><tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>Max Temperature</td><td>94.2</td><td>°C</td><td class="warning">Warning</td></tr>
      <tr><td>Min Temperature</td><td>22.1</td><td>°C</td><td class="good">Good</td></tr>
      <tr><td>Avg Temperature</td><td>58.3</td><td>°C</td><td class="good">Good</td></tr>
      <tr><td>Max Velocity</td><td>3.42</td><td>m/s</td><td class="good">Good</td></tr>
      <tr><td>Drag Coefficient</td><td>0.82</td><td>-</td><td class="good">Good</td></tr>
      <tr><td>Heat Transfer Rate</td><td>245.8</td><td>W</td><td class="good">Good</td></tr>
    </tbody>
  </table>

  <h2>Bill of Materials (BOM)</h2>
  <table>
    <thead><tr><th>#</th><th>Part Name</th><th>Qty</th><th>Material</th><th>Mass (kg)</th><th>Cost (USD)</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Base Plate</td><td>1</td><td>Al 6061-T6</td><td>2.1</td><td>45.00</td></tr>
      <tr><td>2</td><td>Bracket Left</td><td>1</td><td>Steel AISI 304</td><td>1.4</td><td>32.00</td></tr>
      <tr><td>3</td><td>Bracket Right</td><td>1</td><td>Steel AISI 304</td><td>1.4</td><td>32.00</td></tr>
      <tr><td>4</td><td>Shaft</td><td>1</td><td>Steel AISI 304</td><td>0.8</td><td>18.50</td></tr>
      <tr><td>5</td><td>Motor Mount</td><td>1</td><td>Al 6061-T6</td><td>0.9</td><td>28.00</td></tr>
      <tr><td>6</td><td>M8 Hex Bolt</td><td>12</td><td>Grade 8.8</td><td>0.04</td><td>0.85</td></tr>
      <tr><td>7</td><td>M8 Nut</td><td>12</td><td>Grade 8</td><td>0.02</td><td>0.35</td></tr>
      <tr><td>8</td><td>Bearing 6205</td><td>2</td><td>Chrome Steel</td><td>0.12</td><td>8.50</td></tr>
    </tbody>
  </table>
  <p style="font-size:12px;color:#888;margin-top:32px;">Generated by ShilpaSutra v2.0 | AI-Powered CAD, FEA &amp; CFD Platform</p>
</body>
</html>`;
  const w = window.open("", "_blank", "width=1000,height=800");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

export default function DashboardPage() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d1117]">
      {/* Onboarding Banner */}
      {showOnboarding && (
        <div className="bg-gradient-to-r from-[#00D4FF]/10 to-[#00D4FF]/5 border-b border-[#00D4FF]/20 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-[#00D4FF]/20 flex items-center justify-center text-[#00D4FF] font-bold text-sm">
              <Info size={16} />
            </span>
            <span className="text-sm text-slate-200">
              <strong>Welcome to ShilpaSutra!</strong> Start with Text-to-CAD or open the Parts Library to begin designing.
              Press <kbd className="bg-[#21262d] px-1.5 py-0.5 rounded text-[10px] font-mono mx-0.5">?</kbd> for keyboard shortcuts.
            </span>
          </div>
          <button onClick={() => setShowOnboarding(false)} className="text-slate-400 hover:text-white transition-colors p-1">
            <X size={16} />
          </button>
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
            <button
              onClick={generateDashboardReport}
              className="bg-[#161b22] border border-[#21262d] hover:border-amber-400 text-slate-300 hover:text-amber-400 px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5"
            >
              <FileText size={14} />
              Generate Report
            </button>
            <Link
              href="/text-to-cad"
              className="bg-[#00D4FF] hover:bg-[#00b8d9] text-black px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-[#00D4FF]/20 flex items-center gap-1.5"
            >
              <Plus size={14} />
              New Design
            </Link>
            <Link
              href="/library"
              className="bg-[#161b22] border border-[#21262d] hover:border-[#00D4FF] text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5"
            >
              <Library size={14} />
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
                <span className={`${s.text}`}>{s.icon}</span>
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
                  <span className="w-10 h-10 rounded-lg bg-[#00D4FF]/10 text-[#00D4FF] flex items-center justify-center group-hover:bg-[#00D4FF]/20 transition-colors">
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

        {/* Recent Projects + Activity + System */}
        <div className="grid grid-cols-3 gap-4">
          {/* Recent Projects */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Projects</h2>
              <Link href="/library" className="text-[10px] text-[#00D4FF] hover:underline flex items-center gap-0.5">
                View all <ArrowRight size={10} />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {recentProjects.map((p) => (
                <div
                  key={p.name}
                  className="bg-[#161b22] border border-[#21262d] rounded-xl p-3 hover:border-[#30363d] hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${typeColors[p.type] || "bg-slate-500/20 text-slate-400"}`}>
                      {p.type}
                    </span>
                    <span className="flex items-center gap-1">
                      {statusIcons[p.status]}
                      <span className="text-[9px] text-slate-500 capitalize">{p.status}</span>
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white group-hover:text-[#00D4FF] transition-colors truncate mb-1">
                    {p.name}
                  </h3>
                  <div className="text-[9px] text-slate-600 mb-2">{p.modified}</div>
                  {/* Progress bar */}
                  <div className="w-full h-1 bg-[#21262d] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        p.progress === 100 ? "bg-green-500" : "bg-[#00D4FF]"
                      }`}
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  <div className="text-[8px] text-slate-600 mt-0.5 text-right">{p.progress}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column: Activity + Storage + System */}
          <div className="space-y-3">
            {/* Activity Feed */}
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Activity</h2>
              <div className="bg-[#161b22] border border-[#21262d] rounded-xl divide-y divide-[#21262d]">
                {activityFeed.map((a, i) => (
                  <div key={i} className="px-3 py-2 flex items-center gap-2 hover:bg-[#21262d]/50 transition-colors">
                    <span className="text-slate-500 shrink-0">{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-slate-300 truncate">
                        <span className="text-slate-500">{a.action}:</span> {a.target}
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-600 shrink-0">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Storage Usage */}
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive size={12} className="text-slate-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Storage</span>
              </div>
              <div className="w-full h-2 bg-[#21262d] rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full bg-gradient-to-r from-[#00D4FF] to-[#0090b8] rounded-full"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">{storageUsed} MB used</span>
                <span className="text-[10px] text-slate-500">{storageTotal} MB total</span>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Cpu size={12} className="text-slate-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System</span>
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>Version</span>
                <span className="text-white font-mono">ShilpaSutra v2.0</span>
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>AI Engine</span>
                <span className="text-[#00D4FF]">Claude</span>
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>CAD Kernel</span>
                <span className="text-white">OpenCASCADE.js</span>
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>Simulation</span>
                <span className="text-white">FEM + FVM</span>
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>Status</span>
                <span className="flex items-center gap-1 text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Online
                </span>
              </div>
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
