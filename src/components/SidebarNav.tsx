"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  LayoutDashboard,
  Pen,
  FileText,
  FileUp,
  Activity,
  Flame,
  Wind,
  Tornado,
  Boxes,
  Box,
  Library,
  Import,
  Sparkles,
  Bot,
  Ruler,
  Cpu,
  ClipboardList,
  FileBarChart,
  Settings,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  User,
  Eye,
  BarChart3,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

const iconSize = 16;

const navSections: NavSection[] = [
  {
    id: "design",
    label: "DESIGN",
    items: [
      { href: "/", label: "Dashboard", icon: <LayoutDashboard size={iconSize} /> },
      { href: "/designer", label: "CAD Designer", icon: <Pen size={iconSize} /> },
      { href: "/drawings", label: "2D Drawings", icon: <FileText size={iconSize} /> },
    ],
  },
  {
    id: "simulate",
    label: "SIMULATE",
    items: [
      { href: "/simulator", label: "FEA Basic", icon: <Activity size={iconSize} /> },
      { href: "/fea-advanced", label: "FEA Advanced", icon: <Flame size={iconSize} /> },
      { href: "/structural", label: "Structural", icon: <BarChart3 size={iconSize} /> },
      { href: "/cfd", label: "CFD Basic", icon: <Wind size={iconSize} /> },
      { href: "/cfd-advanced", label: "CFD Advanced", icon: <Tornado size={iconSize} /> },
    ],
  },
  {
    id: "tools",
    label: "TOOLS",
    items: [
      { href: "/assembly", label: "Assembly", icon: <Boxes size={iconSize} /> },
      { href: "/assembly-advanced", label: "Assembly Advanced", icon: <Box size={iconSize} /> },
      { href: "/visualization", label: "Visualization", icon: <Eye size={iconSize} /> },
      { href: "/library", label: "Parts Library", icon: <Library size={iconSize} /> },
      { href: "/import-export", label: "Import / Export", icon: <Import size={iconSize} /> },
    ],
  },
  {
    id: "ai",
    label: "AI",
    items: [
      { href: "/text-to-cad", label: "Text to CAD", icon: <Sparkles size={iconSize} /> },
      { href: "/pdf-to-cad", label: "PDF to CAD", icon: <FileUp size={iconSize} /> },
      { href: "/renderer", label: "AI Renderer", icon: <Bot size={iconSize} /> },
      { href: "/measure", label: "Measure Tool", icon: <Ruler size={iconSize} /> },
      { href: "/simscape", label: "SimScape", icon: <Cpu size={iconSize} /> },
    ],
  },
  {
    id: "reports",
    label: "REPORTS",
    items: [
      { href: "/reports", label: "Reports", icon: <ClipboardList size={iconSize} /> },
      { href: "/reports-advanced", label: "Reports Advanced", icon: <FileBarChart size={iconSize} /> },
    ],
  },
  {
    id: "configure",
    label: "CONFIGURE",
    items: [
      { href: "/settings", label: "Settings", icon: <Settings size={iconSize} /> },
    ],
  },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navSections.forEach((s) => (initial[s.id] = true));
    return initial;
  });

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside
      onMouseEnter={() => { if (collapsed) setCollapsed(false); }}
      onMouseLeave={() => { setCollapsed(true); }}
      className={`${
        collapsed ? "w-[52px]" : "w-[200px]"
      } bg-[#0d1117] border-r border-[#21262d] flex flex-col py-2 z-50 shrink-0 transition-all duration-200 ease-out overflow-hidden`}
    >
      {/* Logo + Collapse toggle */}
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between px-3"} mb-2`}>
        <Link
          href="/"
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#0080b0] flex items-center justify-center text-white font-black text-[10px] shadow-lg shadow-[#00D4FF]/15 hover:shadow-[#00D4FF]/30 hover:scale-105 transition-all duration-200 shrink-0"
          title="ShilpaSutra"
        >
          SS
        </Link>
        {!collapsed && (
          <span className="text-[11px] font-bold text-slate-200 tracking-wider ml-2 flex-1 truncate">
            ShilpaSutra
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-600 hover:text-white hover:bg-[#21262d] transition-all duration-150 shrink-0"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      <div className="w-full h-px bg-[#21262d]/80 mb-1" />

      {/* Nav Sections */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden thin-scrollbar px-1.5 space-y-0.5">
        {navSections.map((section) => {
          const isExpanded = expandedSections[section.id];
          return (
            <div key={section.id}>
              {/* Section header */}
              {!collapsed ? (
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-[8px] font-bold text-slate-600 uppercase tracking-[0.15em] hover:text-slate-400 transition-all duration-150"
                >
                  <span>{section.label}</span>
                  <ChevronRight
                    size={9}
                    className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                  />
                </button>
              ) : (
                <div className="w-full flex justify-center py-1.5">
                  <div className="w-4 h-px bg-[#21262d]" />
                </div>
              )}

              {/* Section items */}
              {(collapsed || isExpanded) && (
                <div className="space-y-px">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        className={`group relative flex items-center gap-2.5 rounded-md transition-all duration-150 ${
                          collapsed ? "justify-center mx-auto w-9 h-9" : "px-2.5 py-[6px]"
                        } ${
                          active
                            ? "text-[#00D4FF] bg-[#00D4FF]/8"
                            : "text-slate-500 hover:text-slate-200 hover:bg-[#161b22]"
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-[#00D4FF] rounded-r-full" />
                        )}
                        <span className={`shrink-0 transition-colors duration-150 ${active ? "text-[#00D4FF]" : ""}`}>{item.icon}</span>
                        {!collapsed && (
                          <span className="text-[11px] font-medium truncate">{item.label}</span>
                        )}
                        {/* Tooltip for collapsed mode */}
                        {collapsed && (
                          <span className="absolute left-[calc(100%+6px)] top-1/2 -translate-y-1/2 bg-[#161b22] text-slate-200 text-[10px] font-medium rounded-md px-2.5 py-1 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity shadow-xl shadow-black/40 border border-[#30363d] z-[60] tooltip-animate">
                            {item.label}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom section */}
      <div className="mt-auto px-1.5 space-y-1">
        <div className="w-full h-px bg-[#21262d]/80 mb-1" />

        {/* Ctrl+K hint */}
        {!collapsed && (
          <div className="flex items-center justify-center py-1" title="Press Ctrl+K for command palette">
            <span className="text-[9px] text-slate-600 font-mono bg-[#161b22] px-2.5 py-0.5 rounded-md border border-[#21262d]">
              Ctrl+K
            </span>
          </div>
        )}

        {/* User avatar */}
        <div
          className={`flex items-center gap-2 ${
            collapsed ? "justify-center" : "px-2"
          } py-1.5 cursor-pointer hover:bg-[#161b22] rounded-md transition-all duration-150`}
          title="User Profile"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#0080b0] flex items-center justify-center shrink-0 shadow-md shadow-[#00D4FF]/10">
            <User size={13} className="text-white" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <div className="text-[10px] font-semibold text-slate-200 leading-tight">Engineer</div>
              <div className="text-[8px] text-slate-600 leading-tight">Pro Plan</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
