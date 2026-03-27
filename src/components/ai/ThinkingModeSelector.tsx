"use client";
import { useState, useEffect } from "react";
import {
  Brain, Zap, Sparkles, Cpu, ChevronDown,
  CheckCircle2, AlertTriangle, Info,
} from "lucide-react";
import {
  type ThinkingMode,
  type ComplexityResult,
  type StandardInfo,
  THINKING_MODES,
  parsePromptComplexity,
  extractParameters,
  detectStandards,
  getRecommendationMessage,
} from "@/lib/thinking-engine";

// ─── Thinking Mode Pill Selector ────────────────────────────────────────────

interface ThinkingModeSelectorProps {
  value: ThinkingMode;
  onChange: (mode: ThinkingMode) => void;
  compact?: boolean;
}

const MODE_ICONS: Record<ThinkingMode, React.ReactNode> = {
  normal: <Zap size={10} />,
  extended: <Brain size={10} />,
  deep: <Cpu size={10} />,
  auto: <Sparkles size={10} />,
};

export function ThinkingModeSelector({ value, onChange, compact }: ThinkingModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-[#0d1117] rounded-lg p-0.5 border border-[#21262d]">
      {(Object.keys(THINKING_MODES) as ThinkingMode[]).map((mode) => {
        const config = THINKING_MODES[mode];
        const isActive = value === mode;
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
              isActive
                ? "text-white shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
            style={isActive ? { backgroundColor: config.bgColor, color: config.color } : undefined}
            title={config.description}
          >
            {MODE_ICONS[mode]}
            <span>{config.label}</span>
            {!compact && mode !== "auto" && (
              <span className="text-[8px] opacity-60">~{config.credits}cr</span>
            )}
            {mode === "auto" && !compact && (
              <span className="text-[8px] text-emerald-400/60">rec</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Credit Cost Estimate Display ───────────────────────────────────────────

interface CreditEstimateProps {
  mode: ThinkingMode;
  complexity?: ComplexityResult | null;
}

export function CreditEstimate({ mode, complexity }: CreditEstimateProps) {
  const config = THINKING_MODES[mode];
  const credits = mode === "auto" && complexity
    ? complexity.estimatedCredits
    : config.credits;

  return (
    <div className="flex items-center gap-1.5 text-[10px]" style={{ color: config.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
      <span>Estimated: ~{credits} credits ({config.label})</span>
    </div>
  );
}

// ─── Auto Mode Recommendation Banner ────────────────────────────────────────

interface AutoRecommendationProps {
  prompt: string;
  currentMode: ThinkingMode;
  onAccept: (mode: ThinkingMode) => void;
  onOverride: () => void;
}

export function AutoRecommendation({ prompt, currentMode, onAccept, onOverride }: AutoRecommendationProps) {
  const [complexity, setComplexity] = useState<ComplexityResult | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (currentMode === "auto" && prompt.trim().length > 5) {
      const result = parsePromptComplexity(prompt);
      setComplexity(result);
      setDismissed(false);
    } else {
      setComplexity(null);
    }
  }, [prompt, currentMode]);

  if (!complexity || currentMode !== "auto" || dismissed) return null;

  const recConfig = THINKING_MODES[complexity.recommended];
  const message = getRecommendationMessage(complexity);

  return (
    <div
      className="rounded-lg border p-2.5 text-[11px] space-y-1.5 animate-fade-in"
      style={{
        backgroundColor: recConfig.bgColor,
        borderColor: `${recConfig.color}33`,
      }}
    >
      <div className="flex items-start gap-2">
        <Sparkles size={12} style={{ color: recConfig.color }} className="mt-0.5 shrink-0" />
        <div className="flex-1">
          <div style={{ color: recConfig.color }} className="font-medium">
            This {complexity.domain?.replace("-", " ") || "design"} requires {recConfig.label} Thinking (~{complexity.estimatedCredits} credits)
          </div>
          <div className="text-slate-400 mt-0.5">{message}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-5">
        <button
          onClick={() => { onAccept(complexity.recommended); setDismissed(true); }}
          className="px-2.5 py-1 rounded text-[10px] font-bold transition-colors"
          style={{ backgroundColor: recConfig.color, color: "#0d1117" }}
        >
          Accept
        </button>
        <button
          onClick={() => { onOverride(); setDismissed(true); }}
          className="px-2.5 py-1 rounded text-[10px] font-medium text-slate-400 bg-[#21262d] hover:bg-[#30363d] transition-colors"
        >
          Override
        </button>
        <span className="text-[9px] text-slate-600 ml-auto">
          {(complexity.confidence * 100).toFixed(0)}% confidence
        </span>
      </div>
    </div>
  );
}

// ─── Standards Validation Badges ────────────────────────────────────────────

interface StandardsBadgesProps {
  prompt: string;
  collapsed?: boolean;
}

export function StandardsBadges({ prompt, collapsed: initialCollapsed }: StandardsBadgesProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed ?? true);
  const [standards, setStandards] = useState<StandardInfo[]>([]);

  useEffect(() => {
    if (prompt.trim().length > 5) {
      const complexity = parsePromptComplexity(prompt);
      const params = extractParameters(prompt);
      const detected = detectStandards(complexity.domain, params);
      setStandards(detected);
    } else {
      setStandards([]);
    }
  }, [prompt]);

  if (standards.length === 0) return null;

  const statusIcon = (status: StandardInfo["status"]) => {
    switch (status) {
      case "compliant":
        return <CheckCircle2 size={10} className="text-emerald-400" />;
      case "warning":
        return <AlertTriangle size={10} className="text-amber-400" />;
      case "info":
        return <Info size={10} className="text-[#58a6ff]" />;
    }
  };

  const statusColor = (status: StandardInfo["status"]) => {
    switch (status) {
      case "compliant": return "border-emerald-500/20 bg-emerald-500/5";
      case "warning": return "border-amber-500/20 bg-amber-500/5";
      case "info": return "border-[#58a6ff]/20 bg-[#58a6ff]/5";
    }
  };

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1.5 text-[10px] font-bold text-[#58a6ff] uppercase tracking-wider w-full"
      >
        {collapsed ? <ChevronDown size={10} className="rotate-[-90deg]" /> : <ChevronDown size={10} />}
        <CheckCircle2 size={10} />
        Standards ({standards.length})
      </button>
      {!collapsed && (
        <div className="mt-1.5 space-y-1">
          {standards.map((std, i) => (
            <div
              key={i}
              className={`flex items-start gap-1.5 px-2 py-1.5 rounded border text-[10px] ${statusColor(std.status)}`}
            >
              <span className="mt-0.5 shrink-0">{statusIcon(std.status)}</span>
              <div className="flex-1 min-w-0">
                <span className="font-mono font-bold text-slate-300">{std.code}</span>
                <span className="text-slate-500 ml-1">{std.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
