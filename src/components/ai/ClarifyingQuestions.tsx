"use client";
import { useState, useEffect } from "react";
import { HelpCircle, ChevronDown, Check } from "lucide-react";
import {
  type ThinkingMode,
  type ClarifyingQuestion,
  type ComplexityResult,
  parsePromptComplexity,
  extractParameters,
  identifyMissingParams,
  generateQuestions,
} from "@/lib/thinking-engine";

// ─── Types ──────────────────────────────────────────────────────────────────

interface QuestionAnswer {
  questionId: string;
  paramName: string;
  value: string;
}

interface ClarifyingQuestionsProps {
  prompt: string;
  thinkingMode: ThinkingMode;
  onAnswersReady: (answers: QuestionAnswer[]) => void;
  onSkip: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ClarifyingQuestions({
  prompt,
  thinkingMode,
  onAnswersReady,
  onSkip,
}: ClarifyingQuestionsProps) {
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [complexity, setComplexity] = useState<ComplexityResult | null>(null);

  useEffect(() => {
    if (!prompt.trim() || thinkingMode === "normal") {
      setQuestions([]);
      return;
    }

    const comp = parsePromptComplexity(prompt);
    setComplexity(comp);
    const extracted = extractParameters(prompt);
    const missing = identifyMissingParams(comp.partType, extracted);

    // Limit questions based on thinking mode
    const maxQuestions = thinkingMode === "extended" ? 3 : thinkingMode === "deep" ? missing.length : 0;
    const limited = missing.slice(0, maxQuestions);
    const generated = generateQuestions(limited);
    setQuestions(generated);

    // Pre-fill defaults
    const defaults: Record<string, string> = {};
    generated.forEach((q) => {
      if (q.parameter.defaultValue !== undefined) {
        defaults[q.id] = String(q.parameter.defaultValue);
      }
    });
    setAnswers(defaults);
  }, [prompt, thinkingMode]);

  if (questions.length === 0) return null;

  const allAnswered = questions.every((q) => answers[q.id]?.trim());

  const handleSubmit = () => {
    const result: QuestionAnswer[] = questions.map((q) => ({
      questionId: q.id,
      paramName: q.parameter.name,
      value: answers[q.id] || String(q.parameter.defaultValue ?? ""),
    }));
    onAnswersReady(result);
  };

  return (
    <div className="rounded-lg border border-purple-500/20 bg-[#0d1117] overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/5 border-b border-purple-500/20">
        <HelpCircle size={12} className="text-purple-400" />
        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
          Clarifying Questions
        </span>
        {complexity?.domain && (
          <span className="text-[9px] text-slate-500 ml-auto">
            {complexity.domain.replace("-", " ")}
          </span>
        )}
      </div>

      {/* Questions */}
      <div className="p-2.5 space-y-2.5">
        {questions.map((q) => (
          <div key={q.id} className="space-y-1">
            <label className="text-[10px] text-slate-300 font-medium flex items-center gap-1">
              {q.question}
              {q.parameter.hint && (
                <span className="text-[9px] text-slate-600 font-normal">({q.parameter.hint})</span>
              )}
            </label>

            {q.parameter.type === "select" && q.parameter.options ? (
              <div className="relative">
                <select
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  className="w-full bg-[#161b22] border border-[#21262d] rounded px-2 py-1.5 text-[11px] text-slate-300 outline-none focus:border-purple-500/50 appearance-none pr-6"
                >
                  {q.parameter.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={10}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
                />
              </div>
            ) : q.parameter.type === "number" ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder={String(q.parameter.defaultValue ?? "")}
                  className="flex-1 bg-[#161b22] border border-[#21262d] rounded px-2 py-1.5 text-[11px] text-slate-300 outline-none focus:border-purple-500/50"
                />
                {q.parameter.unit && (
                  <span className="text-[10px] text-slate-600">{q.parameter.unit}</span>
                )}
              </div>
            ) : (
              <input
                type="text"
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                placeholder={String(q.parameter.defaultValue ?? "")}
                className="w-full bg-[#161b22] border border-[#21262d] rounded px-2 py-1.5 text-[11px] text-slate-300 outline-none focus:border-purple-500/50"
              />
            )}
          </div>
        ))}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-bold bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white transition-colors"
          >
            <Check size={10} />
            Confirm & Generate
          </button>
          <button
            onClick={onSkip}
            className="px-3 py-1.5 rounded text-[10px] font-medium text-slate-500 hover:text-slate-300 bg-[#21262d] hover:bg-[#30363d] transition-colors"
          >
            Skip — use defaults
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Parameter Summary (for Deep mode approval) ────────────────────────────

interface ParameterSummaryProps {
  prompt: string;
  answers: QuestionAnswer[];
  onApprove: () => void;
  onEdit: () => void;
}

export function ParameterSummary({ prompt, answers, onApprove, onEdit }: ParameterSummaryProps) {
  const extracted = extractParameters(prompt);

  return (
    <div className="rounded-lg border border-[#f0883e]/20 bg-[#0d1117] overflow-hidden animate-fade-in">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#f0883e]/5 border-b border-[#f0883e]/20">
        <Check size={12} className="text-[#f0883e]" />
        <span className="text-[10px] font-bold text-[#f0883e] uppercase tracking-wider">
          Parameter Summary — Approve to Generate
        </span>
      </div>

      <div className="p-2.5">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-[#21262d] text-slate-500">
              <th className="text-left py-1 pr-2">Parameter</th>
              <th className="text-left py-1">Value</th>
            </tr>
          </thead>
          <tbody>
            {/* Extracted from prompt */}
            {extracted.map((p, i) => (
              <tr key={`e-${i}`} className="border-b border-[#21262d]/30">
                <td className="py-1 pr-2 text-slate-400 capitalize">{p.name}</td>
                <td className="py-1 text-slate-300 font-mono">
                  {p.value} {p.unit}
                </td>
              </tr>
            ))}
            {/* From clarifying questions */}
            {answers.map((a) => (
              <tr key={a.questionId} className="border-b border-[#21262d]/30">
                <td className="py-1 pr-2 text-purple-400 capitalize">{a.paramName}</td>
                <td className="py-1 text-slate-300 font-mono">{a.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center gap-2 mt-2.5">
          <button
            onClick={onApprove}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-bold bg-[#f0883e] hover:bg-[#f09b5e] text-[#0d1117] transition-colors"
          >
            <Check size={10} />
            Approve & Generate
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 rounded text-[10px] font-medium text-slate-500 hover:text-slate-300 bg-[#21262d] hover:bg-[#30363d] transition-colors"
          >
            Edit Parameters
          </button>
        </div>
      </div>
    </div>
  );
}
