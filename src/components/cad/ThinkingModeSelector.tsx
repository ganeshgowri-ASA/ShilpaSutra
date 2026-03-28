"use client";
import { useState } from "react";
import { ChevronDown, Zap, Lightbulb, Brain, Sparkles } from "lucide-react";

export type ThinkingMode = "Normal" | "Extended" | "Deep" | "Auto";

interface ModeConfig {
  mode: ThinkingMode;
  icon: React.ReactNode;
  label: string;
  desc: string;
  credits: string;
  tokenHint: string;
}

const MODES: ModeConfig[] = [
  {
    mode: "Normal",
    icon: <Zap size={11} />,
    label: "Normal",
    desc: "Fast generation, no extended reasoning",
    credits: "~10 credits",
    tokenHint: "~1–2k tokens",
  },
  {
    mode: "Extended",
    icon: <Lightbulb size={11} />,
    label: "Extended",
    desc: "More reasoning steps, better for complex parts",
    credits: "~50 credits",
    tokenHint: "~3–5k tokens",
  },
  {
    mode: "Deep",
    icon: <Brain size={11} />,
    label: "Deep",
    desc: "Full chain-of-thought, shows all reasoning",
    credits: "~100 credits",
    tokenHint: "~8–10k tokens",
  },
  {
    mode: "Auto",
    icon: <Sparkles size={11} />,
    label: "Auto",
    desc: "AI picks depth based on prompt complexity",
    credits: "varies",
    tokenHint: "adaptive",
  },
];

/** Resolve Auto mode to a concrete API mode based on prompt analysis */
export function resolveThinkingMode(
  mode: ThinkingMode,
  prompt: string
): "Normal" | "Extended" | "Deep" {
  if (mode !== "Auto") return mode;
  const words = prompt.trim().split(/\s+/).length;
  const isComplex =
    /assembl|array|pattern|multiple|system|complex|analysis|simulation|optimi/i.test(
      prompt
    );
  if (isComplex || words > 20) return "Deep";
  if (words > 10) return "Extended";
  return "Normal";
}

interface Props {
  value: ThinkingMode;
  onChange: (mode: ThinkingMode) => void;
  className?: string;
}

export default function ThinkingModeSelector({ value, onChange, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const current = MODES.find((m) => m.mode === value) ?? MODES[0];

  return (
    <div className={`relative ${className}`}>
      <button
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-[#161b22] border border-[#21262d] rounded-md px-2 py-1 hover:border-[#30363d] hover:text-slate-300 transition-colors whitespace-nowrap"
        title={`Thinking mode: ${current.label} (${current.credits})`}
      >
        <span className="text-purple-400">{current.icon}</span>
        <span>{current.label}</span>
        <span className="text-slate-600 hidden sm:inline">{current.credits}</span>
        <ChevronDown size={9} className={open ? "rotate-180" : ""} style={{ transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-[#0d1117] border border-[#21262d] rounded-lg shadow-2xl shadow-black/60 min-w-[220px]">
          <div className="px-3 py-1.5 text-[9px] text-slate-600 uppercase tracking-wider border-b border-[#21262d]">
            Thinking Mode
          </div>
          {MODES.map((m) => (
            <button
              key={m.mode}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(m.mode);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 hover:bg-[#161b22] flex items-start gap-2.5 transition-colors ${
                value === m.mode ? "bg-purple-500/5" : ""
              }`}
            >
              <span
                className={`mt-0.5 shrink-0 ${
                  value === m.mode ? "text-purple-400" : "text-slate-500"
                }`}
              >
                {m.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[11px] font-medium ${
                      value === m.mode ? "text-white" : "text-slate-300"
                    }`}
                  >
                    {m.label}
                  </span>
                  <span className="text-[9px] text-purple-400 shrink-0">{m.credits}</span>
                </div>
                <div className="text-[9px] text-slate-600 mt-0.5 leading-relaxed">{m.desc}</div>
                <div className="text-[8px] text-slate-700 mt-0.5">{m.tokenHint}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
