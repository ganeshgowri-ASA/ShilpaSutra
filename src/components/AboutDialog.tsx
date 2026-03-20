"use client";
import { useState } from "react";
import { X, Info } from "lucide-react";

const techStack = [
  { label: "Frontend", value: "Next.js 14 + TypeScript + Tailwind CSS" },
  { label: "3D Engine", value: "Three.js / React Three Fiber" },
  { label: "CAD Kernel", value: "OpenCASCADE.js (WASM)" },
  { label: "AI Engine", value: "Claude (Anthropic)" },
  { label: "Simulation", value: "FEM + FVM" },
  { label: "State", value: "Zustand" },
  { label: "Database", value: "PostgreSQL via Prisma" },
  { label: "Deployment", value: "Vercel + Railway" },
];

export function AboutButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-slate-500 hover:text-white transition-colors"
        title="About ShilpaSutra"
      >
        <Info size={12} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="bg-[#161b22] border border-[#21262d] rounded-2xl shadow-2xl w-[420px] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#0090b8] flex items-center justify-center text-white font-black text-sm shadow-lg shadow-[#00D4FF]/20">
                  SS
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">ShilpaSutra</h2>
                  <p className="text-[10px] text-slate-500">The Formulas of Craftsmanship</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1">
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center justify-center">
                <span className="bg-[#00D4FF]/10 text-[#00D4FF] text-xs font-mono font-bold px-3 py-1 rounded-full border border-[#00D4FF]/20">
                  Version 2.0.0
                </span>
              </div>

              <p className="text-xs text-slate-400 text-center leading-relaxed">
                AI-powered Text/Multimodal to CAD & CFD platform with conversational design agent, parametric modeling, and simulation capabilities.
              </p>

              <div className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tech Stack</h3>
                {techStack.map(t => (
                  <div key={t.label} className="flex items-center justify-between text-xs py-0.5">
                    <span className="text-slate-500">{t.label}</span>
                    <span className="text-slate-300 text-[10px]">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[#21262d] text-center">
              <span className="text-[10px] text-slate-600">
                Built with care by the ShilpaSutra team
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
