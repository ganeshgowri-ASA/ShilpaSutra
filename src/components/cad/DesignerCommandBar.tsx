"use client";
import { useState, useCallback, useRef } from "react";
import { useCadStore } from "@/stores/cad-store";
import { Terminal, Grid3X3, Sparkles } from "lucide-react";

const COMMANDS = [
  "BOX", "CYLINDER", "SPHERE", "CONE",
  "EXTRUDE", "REVOLVE", "FILLET", "CHAMFER",
  "MOVE", "ROTATE", "COPY", "DELETE",
  "UNDO", "REDO", "MIRROR", "SHELL",
  "SCALE", "PATTERN",
];

// AI-powered natural language command suggestions
const AI_SUGGESTIONS: { pattern: RegExp; commands: string[]; description: string }[] = [
  { pattern: /^make\s/i, commands: ["make a box 50x30x20", "make a cylinder r10 h30", "make a gear 20 teeth", "make these parallel"], description: "AI: Create geometry" },
  { pattern: /^create\s/i, commands: ["create box 100x50x25", "create cylinder diameter 20", "create bolt holes M8 x4"], description: "AI: Create object" },
  { pattern: /^add\s/i, commands: ["add fillet 3mm", "add chamfer 2mm", "add hole diameter 10", "add bolt holes M6 x6"], description: "AI: Add feature" },
  { pattern: /^set\s/i, commands: ["set width 50", "set height 30", "set material steel", "set color red"], description: "AI: Set property" },
  { pattern: /^round\s|^fillet\s/i, commands: ["fillet 2mm all edges", "fillet 5mm selected", "round edges 3mm"], description: "AI: Round edges" },
  { pattern: /^optimize\s|^optim/i, commands: ["optimize for weight", "optimize for strength", "optimize topology"], description: "AI: Optimize" },
  { pattern: /^explain\s/i, commands: ["explain this geometry", "explain mass properties", "explain dimensions"], description: "AI: Explain" },
  { pattern: /^mirror\s/i, commands: ["mirror about XY", "mirror about XZ", "mirror about YZ"], description: "AI: Mirror" },
  { pattern: /^shell\s/i, commands: ["shell 2mm", "shell 1.5mm inward", "shell selected 3mm"], description: "AI: Shell" },
  { pattern: /^rotate\s/i, commands: ["rotate 45 about Y", "rotate 90 about Z", "rotate 180 about X"], description: "AI: Rotate" },
  { pattern: /^align\s|^parallel|^perpend/i, commands: ["align to origin", "make parallel", "make perpendicular", "align faces"], description: "AI: Align/Constrain" },
];

interface SuggestionItem {
  text: string;
  isAI: boolean;
  description?: string;
}

export default function DesignerCommandBar() {
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const executeCommand = useCadStore((s) => s.executeCommand);
  const commandHistory = useCadStore((s) => s.commandHistory);
  const unit = useCadStore((s) => s.unit);
  const snapGrid = useCadStore((s) => s.snapGrid);
  const setSnapGrid = useCadStore((s) => s.setSnapGrid);
  const selectedIds = useCadStore((s) => s.selectedIds);
  const selectedId = useCadStore((s) => s.selectedId);

  const selCount = selectedIds.length || (selectedId ? 1 : 0);

  // Build combined suggestions: standard commands + AI suggestions
  const getSuggestions = useCallback((text: string): SuggestionItem[] => {
    if (!text.trim()) return [];
    const upper = text.trim().toUpperCase();
    const items: SuggestionItem[] = [];

    // Standard command matches
    const stdMatches = COMMANDS.filter((c) => c.startsWith(upper));
    stdMatches.slice(0, 4).forEach((cmd) => {
      items.push({ text: cmd, isAI: false });
    });

    // AI natural language matches
    for (const suggestion of AI_SUGGESTIONS) {
      if (suggestion.pattern.test(text.trim())) {
        suggestion.commands.forEach((cmd) => {
          if (!items.some((i) => i.text === cmd)) {
            items.push({ text: cmd, isAI: true, description: suggestion.description });
          }
        });
        break; // Only match first AI pattern
      }
    }

    // If input looks like natural language (contains spaces, starts with lowercase verb)
    if (text.includes(" ") && items.filter((i) => i.isAI).length === 0) {
      items.push({ text: text.trim(), isAI: true, description: "AI: Process with ShilpaSutra AI" });
    }

    return items.slice(0, 8);
  }, []);

  const suggestions = getSuggestions(input);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;
      executeCommand(input.trim());
      setInput("");
      setHistoryIndex(-1);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(0);
    },
    [input, executeCommand]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (showSuggestions && suggestions.length > 0) {
          setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        } else {
          const history = commandHistory;
          const newIndex = Math.min(historyIndex + 1, history.length - 1);
          setHistoryIndex(newIndex);
          if (newIndex >= 0 && newIndex < history.length) {
            setInput(history[history.length - 1 - newIndex]);
          }
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (showSuggestions && suggestions.length > 0) {
          setSelectedSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        } else {
          const newIndex = Math.max(historyIndex - 1, -1);
          setHistoryIndex(newIndex);
          if (newIndex >= 0) {
            setInput(commandHistory[commandHistory.length - 1 - newIndex]);
          } else {
            setInput("");
          }
        }
      } else if (e.key === "Tab" && suggestions.length > 0) {
        e.preventDefault();
        const selected = suggestions[selectedSuggestionIndex] || suggestions[0];
        setInput(selected.text + " ");
        setShowSuggestions(false);
        setSelectedSuggestionIndex(0);
      } else if (e.key === "Escape") {
        setInput("");
        setShowSuggestions(false);
        setSelectedSuggestionIndex(0);
        inputRef.current?.blur();
      }
    },
    [historyIndex, commandHistory, suggestions, showSuggestions, selectedSuggestionIndex]
  );

  return (
    <div className="h-10 bg-[#1a1a2e] border-t border-[#16213e] flex items-center px-3 shrink-0 select-none relative">
      {/* Command input */}
      <div className="flex items-center gap-2 flex-1">
        <Terminal size={14} className="text-slate-600 shrink-0" />
        <form onSubmit={handleSubmit} className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
              setSelectedSuggestionIndex(0);
            }}
            onFocus={() => setShowSuggestions(input.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Type command or natural language: 'make a box 50x30x20', 'add fillet 3mm'..."
            className="w-full bg-transparent text-[11px] text-slate-300 outline-none placeholder-slate-600 font-mono"
          />

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 bg-[#0d1117] border border-[#16213e] rounded-lg shadow-xl py-1 min-w-[300px] z-50">
              {suggestions.map((item, i) => (
                <button
                  key={`${item.text}-${i}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setInput(item.text + " ");
                    setShowSuggestions(false);
                    setSelectedSuggestionIndex(0);
                    inputRef.current?.focus();
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] font-mono flex items-center gap-2 transition-colors ${
                    i === selectedSuggestionIndex
                      ? "bg-[#0f3460] text-white"
                      : "text-slate-400 hover:bg-[#0f3460] hover:text-white"
                  }`}
                >
                  {item.isAI ? (
                    <Sparkles size={10} className="text-purple-400 shrink-0" />
                  ) : (
                    <Terminal size={10} className="text-slate-600 shrink-0" />
                  )}
                  <span className="flex-1 truncate">{item.text}</span>
                  {item.isAI && item.description && (
                    <span className="text-[9px] text-purple-400/60 shrink-0">{item.description}</span>
                  )}
                  {!item.isAI && (
                    <span className="text-[9px] text-slate-600 shrink-0">CMD</span>
                  )}
                </button>
              ))}
              <div className="px-3 py-1 border-t border-[#16213e] text-[9px] text-slate-600 flex items-center gap-2">
                <span>Tab to complete</span>
                <span className="text-slate-700">|</span>
                <span>Arrow keys to navigate</span>
                <span className="text-slate-700">|</span>
                <Sparkles size={8} className="text-purple-500/50" />
                <span className="text-purple-500/50">AI-powered</span>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono shrink-0 ml-4">
        <span className="text-slate-400">{unit}</span>

        <button
          onClick={() => setSnapGrid(!snapGrid)}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
            snapGrid
              ? "text-[#00D4FF] bg-[#00D4FF]/10"
              : "text-slate-600 hover:text-slate-400"
          }`}
          title="Toggle Grid Snap (G)"
        >
          <Grid3X3 size={10} />
          <span>Snap {snapGrid ? "ON" : "OFF"}</span>
        </button>

        {selCount > 0 && (
          <span className="text-[#00D4FF]">
            {selCount} selected
          </span>
        )}

        <span className="text-slate-600">0, 0, 0</span>
      </div>
    </div>
  );
}
