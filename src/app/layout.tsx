import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "ShilpaSutra - AI CAD & CFD Platform",
  description: "AI-powered Text/Multimodal to CAD & CFD platform with conversational design agent, parametric modeling, and simulation.",
};

const navItems = [
  { href: "/", label: "Dashboard", emoji: "🏠", tooltip: "Dashboard - Home", section: "main" },
  { href: "/designer", label: "CAD Designer", emoji: "✏️", tooltip: "3D CAD Designer", section: "main" },
  { href: "/simulator", label: "FEA Sim", emoji: "⚗️", tooltip: "FEA Stress Simulator", section: "main" },
  { href: "/cfd", label: "CFD Thermal", emoji: "🌡️", tooltip: "CFD Thermal Analysis", section: "main" },
  { href: "/library", label: "Parts Library", emoji: "📦", tooltip: "Parts & Components Library", section: "main" },
  { href: "/assembly", label: "Assembly", emoji: "🔧", tooltip: "Assembly Workspace", section: "main" },
  { href: "/renderer", label: "Renderer", emoji: "📷", tooltip: "Photo Rendering (PBR)", section: "main" },
  { href: "/drawings", label: "Drawings", emoji: "📐", tooltip: "2D Drawings & GD&T", section: "main" },
  { href: "/reports", label: "Reports", emoji: "📊", tooltip: "Structural Reports (STAAD)", section: "main" },
  { href: "/text-to-cad", label: "Text to CAD", emoji: "🤖", tooltip: "AI Text / Multimodal to CAD", section: "ai" },
  { href: "/settings", label: "Settings", emoji: "⚙️", tooltip: "Settings & Preferences", section: "bottom" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0d1117] text-white flex h-screen overflow-hidden">
        <ClientProviders>
          <aside className="w-[64px] bg-[#161b22] border-r border-[#21262d] flex flex-col items-center py-3 gap-1 z-50 shrink-0">
            <a href="/" className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#e94560] to-[#c73652] flex items-center justify-center text-white font-black text-sm mb-3 shadow-lg hover:scale-105 transition-transform" title="ShilpaSutra">SS</a>
            <div className="w-8 h-px bg-[#21262d] mb-1" />
            {navItems.filter(i => i.section === "main").map((item) => (
              <a key={item.href} href={item.href} title={item.tooltip} className="group relative w-11 h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-white hover:bg-[#21262d] transition-all duration-150">
                <span className="text-xl leading-none">{item.emoji}</span>
                <span className="text-[8px] font-medium text-center leading-none opacity-70 group-hover:opacity-100 max-w-[52px] truncate px-0.5">{item.label.split(" ")[0]}</span>
                <span className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-[#1f2937] text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-[#374151] z-50">{item.tooltip}</span>
              </a>
            ))}
            <div className="w-8 h-px bg-[#21262d] my-1" />
            <span className="text-[7px] text-slate-600 font-bold tracking-widest uppercase">AI</span>
            {navItems.filter(i => i.section === "ai").map((item) => (
              <a key={item.href} href={item.href} title={item.tooltip} className="group relative w-11 h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[#e94560] hover:text-white hover:bg-[#e94560]/20 transition-all duration-150">
                <span className="text-xl leading-none">{item.emoji}</span>
                <span className="text-[8px] font-medium text-center leading-none opacity-70 group-hover:opacity-100 max-w-[52px] truncate px-0.5">{item.label.split(" ")[0]}</span>
                <span className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-[#1f2937] text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-[#374151] z-50">{item.tooltip}</span>
              </a>
            ))}
            <div className="flex-1" />
            <div className="w-10 h-8 rounded flex items-center justify-center" title="Press Ctrl+K for command bar">
              <span className="text-[8px] text-slate-600 font-mono leading-tight text-center">Ctrl+K</span>
            </div>
            {navItems.filter(i => i.section === "bottom").map((item) => (
              <a key={item.href} href={item.href} title={item.tooltip} className="group relative w-11 h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-white hover:bg-[#21262d] transition-all duration-150">
                <span className="text-xl leading-none">{item.emoji}</span>
                <span className="text-[8px] font-medium text-center leading-none opacity-70 group-hover:opacity-100">{item.label}</span>
                <span className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-[#1f2937] text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-[#374151] z-50">{item.tooltip}</span>
              </a>
            ))}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold mt-1 cursor-pointer hover:scale-105 transition-transform" title="User Profile">A</div>
          </aside>
          <main className="flex-1 overflow-hidden flex flex-col min-w-0">{children}</main>
        </ClientProviders>
      </body>
    </html>
  );
}
