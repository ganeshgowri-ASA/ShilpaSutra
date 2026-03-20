"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface NavItem {
  href: string;
  label: string;
  abbr: string;
  icon: string;
  tooltip: string;
  section: "main" | "ai" | "bottom";
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", abbr: "Home", icon: "H", tooltip: "Dashboard - Home", section: "main" },
  { href: "/designer", label: "CAD Designer", abbr: "CAD", icon: "D", tooltip: "3D CAD Designer", section: "main" },
  { href: "/simulator", label: "FEA Simulator", abbr: "FEA", icon: "F", tooltip: "FEA Stress Simulator", section: "main" },
  { href: "/cfd", label: "CFD Analysis", abbr: "CFD", icon: "T", tooltip: "CFD Thermal Analysis", section: "main" },
  { href: "/assembly", label: "Assembly", abbr: "Asm", icon: "A", tooltip: "Assembly Workspace", section: "main" },
  { href: "/renderer", label: "Renderer", abbr: "Rnd", icon: "R", tooltip: "Photo Rendering (PBR)", section: "main" },
  { href: "/drawings", label: "2D Drawings", abbr: "2D", icon: "2", tooltip: "2D Drawings & GD&T", section: "main" },
  { href: "/reports", label: "Reports", abbr: "Rep", icon: "P", tooltip: "Engineering Reports", section: "main" },
  { href: "/library", label: "Parts Library", abbr: "Lib", icon: "L", tooltip: "Parts & Components Library", section: "main" },
  { href: "/text-to-cad", label: "Text to CAD", abbr: "AI", icon: "AI", tooltip: "AI Text / Multimodal to CAD", section: "ai" },
  { href: "/settings", label: "Settings", abbr: "Set", icon: "S", tooltip: "Settings & Preferences", section: "bottom" },
];

export default function SidebarNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-[60px] bg-[#161b22] border-r border-[#21262d] flex flex-col items-center py-2 gap-0.5 z-50 shrink-0 max-md:w-[48px]">
      {/* Logo */}
      <Link
        href="/"
        className="w-9 h-9 max-md:w-7 max-md:h-7 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#0090b8] flex items-center justify-center text-white font-black text-xs mb-2 shadow-lg shadow-[#00D4FF]/20 hover:scale-105 transition-transform"
        title="ShilpaSutra"
      >
        SS
      </Link>

      <div className="w-7 h-px bg-[#21262d] mb-1" />

      {/* Main Nav */}
      {navItems
        .filter((i) => i.section === "main")
        .map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.tooltip}
              className={`group relative w-10 h-10 max-md:w-8 max-md:h-8 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all duration-150 ${
                active
                  ? "text-[#00D4FF] bg-[#00D4FF]/10"
                  : "text-slate-500 hover:text-[#00D4FF] hover:bg-[#00D4FF]/5"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#00D4FF] rounded-r-full" />
              )}
              <span className="text-[11px] font-bold leading-none max-md:text-[9px]">{item.icon}</span>
              <span className="text-[7px] font-medium text-center leading-none opacity-60 group-hover:opacity-100 max-md:hidden">
                {item.abbr}
              </span>
              {/* Tooltip */}
              <span className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-[#1f2937] text-white text-[10px] rounded px-2 py-1 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-[#374151] z-50">
                {item.tooltip}
              </span>
            </Link>
          );
        })}

      <div className="w-7 h-px bg-[#21262d] my-1" />

      {/* AI Section */}
      <span className="text-[6px] text-slate-600 font-bold tracking-widest uppercase">AI</span>
      {navItems
        .filter((i) => i.section === "ai")
        .map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.tooltip}
              className={`group relative w-10 h-10 max-md:w-8 max-md:h-8 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all duration-150 ${
                active
                  ? "text-[#00D4FF] bg-[#00D4FF]/15"
                  : "text-[#00D4FF]/60 hover:text-[#00D4FF] hover:bg-[#00D4FF]/10"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#00D4FF] rounded-r-full" />
              )}
              <span className="text-[11px] font-bold leading-none max-md:text-[9px]">{item.icon}</span>
              <span className="text-[7px] font-medium text-center leading-none opacity-60 group-hover:opacity-100 max-md:hidden">
                {item.abbr}
              </span>
              <span className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-[#1f2937] text-white text-[10px] rounded px-2 py-1 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-[#374151] z-50">
                {item.tooltip}
              </span>
            </Link>
          );
        })}

      <div className="flex-1" />

      {/* Ctrl+K hint */}
      <div className="w-9 h-7 rounded flex items-center justify-center max-md:hidden" title="Press Ctrl+K for command bar">
        <span className="text-[7px] text-slate-600 font-mono leading-tight text-center">Ctrl+K</span>
      </div>

      {/* Bottom section */}
      {navItems
        .filter((i) => i.section === "bottom")
        .map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.tooltip}
              className={`group relative w-10 h-10 max-md:w-8 max-md:h-8 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all duration-150 ${
                active
                  ? "text-[#00D4FF] bg-[#00D4FF]/10"
                  : "text-slate-500 hover:text-white hover:bg-[#21262d]"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#00D4FF] rounded-r-full" />
              )}
              <span className="text-[11px] font-bold leading-none max-md:text-[9px]">{item.icon}</span>
              <span className="text-[7px] font-medium text-center leading-none opacity-60 group-hover:opacity-100 max-md:hidden">
                {item.abbr}
              </span>
              <span className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-[#1f2937] text-white text-[10px] rounded px-2 py-1 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-[#374151] z-50">
                {item.tooltip}
              </span>
            </Link>
          );
        })}

      {/* User Avatar */}
      <div
        className="w-8 h-8 max-md:w-6 max-md:h-6 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#0090b8] flex items-center justify-center text-[10px] font-bold mt-1 cursor-pointer hover:scale-105 transition-transform shadow-lg"
        title="User Profile"
      >
        U
      </div>
    </aside>
  );
}
