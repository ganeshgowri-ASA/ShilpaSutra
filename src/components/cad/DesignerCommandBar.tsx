"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useCadStore } from "@/stores/cad-store";
import { Terminal, Grid3X3 } from "lucide-react";

const COMMANDS = [
  "BOX", "CYLINDER", "SPHERE", "CONE",
  "EXTRUDE", "REVOLVE", "FILLET", "CHAMFER",
  "MOVE", "ROTATE", "COPY", "DELETE",
  "UNDO", "REDO", "MIRROR", "SHELL",
  "SCALE", "PATTERN",
];

export default function DesignerCommandBar() {
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const executeCommand = useCadStore((s) => s.executeCommand);
  const commandHistory = useCadStore((s) => s.commandHistory);
  const unit = useCadStore((s) => s.unit);
  const snapGrid = useCadStore((s) => s.snapGrid);
  const setSnapGrid = useCadStore((s) => s.setSnapGrid);
  const selectedIds = useCadStore((s) => s.selectedIds);
  const selectedId = useCadStore((s) => s.selectedId);

  const selCount = selectedIds.length || (selectedId ? 1 : 0);

  const suggestions = input.trim()
    ? COMMANDS.filter((c) => c.startsWith(input.trim().toUpperCase())).slice(0, 6)
    : [];

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;
      executeCommand(input.trim());
      setInput("");
      setHistoryIndex(-1);
      setShowSuggestions(false);
    },
    [input, executeCommand]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const history = commandHistory;
        const newIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(newIndex);
        if (newIndex >= 0 && newIndex < history.length) {
          setInput(history[history.length - 1 - newIndex]);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const newIndex = Math.max(historyIndex - 1, -1);
        setHistoryIndex(newIndex);
        if (newIndex >= 0) {
          setInput(commandHistory[commandHistory.length - 1 - newIndex]);
        } else {
          setInput("");
        }
      } else if (e.key === "Tab" && suggestions.length > 0) {
        e.preventDefault();
        setInput(suggestions[0] + " ");
        setShowSuggestions(false);
      } else if (e.key === "Escape") {
        setInput("");
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
    },
    [historyIndex, commandHistory, suggestions]
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
            }}
            onFocus={() => setShowSuggestions(input.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Type command: EXTRUDE, FILLET 5, MOVE 10,0,0..."
            className="w-full bg-transparent text-[11px] text-slate-300 outline-none placeholder-slate-600 font-mono"
          />

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 bg-[#0d1117] border border-[#16213e] rounded-lg shadow-xl py-1 min-w-[200px] z-50">
              {suggestions.map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setInput(cmd + " ");
                    setShowSuggestions(false);
                    inputRef.current?.focus();
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-slate-400 hover:bg-[#0f3460] hover:text-white transition-colors"
                >
                  {cmd}
                </button>
              ))}
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
