"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useCadStore } from "@/stores/cad-store";
import { runReasoningEngine } from "@/lib/ai-reasoning-engine";
import { Terminal, Grid3X3, Sparkles, X, CheckCircle2, AlertCircle, Brain, Zap, Cpu } from "lucide-react";
import { type ThinkingMode, THINKING_MODES, parsePromptComplexity } from "@/lib/thinking-engine";
import { InlineAttachButton, type AttachedFile } from "@/components/ai/AttachmentUpload";

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

// Process natural language AI commands (sync ops like fillet/chamfer/mirror)
function processAICommandSync(
  input: string,
  selectedObj: { name: string; type: string; dimensions: { width: number; height: number; depth: number }; material?: string } | null,
  objectCount: number,
  actions: {
    aiFilletSelected: (r: number) => boolean;
    aiChamferSelected: (d: number) => boolean;
    aiShell: (t: number) => boolean;
    aiMirror: (p: "xy" | "xz" | "yz") => string[];
  }
): { success: boolean; message: string } | null {
  const lower = input.toLowerCase().trim();

  // Fillet
  if (lower.match(/^(fillet|round)/)) {
    const r = parseFloat(lower.match(/(\d+(?:\.\d+)?)/)?.[1] || "2");
    if (!selectedObj) return { success: false, message: "Select an object first to apply fillet." };
    const ok = actions.aiFilletSelected(r);
    return ok
      ? { success: true, message: `Applied ${r}mm fillet to "${selectedObj.name}".` }
      : { success: false, message: "Cannot fillet this object type." };
  }
  // Chamfer
  if (lower.match(/^(chamfer|bevel)/)) {
    const d = parseFloat(lower.match(/(\d+(?:\.\d+)?)/)?.[1] || "1");
    if (!selectedObj) return { success: false, message: "Select an object first to apply chamfer." };
    const ok = actions.aiChamferSelected(d);
    return ok
      ? { success: true, message: `Applied ${d}mm chamfer to "${selectedObj.name}".` }
      : { success: false, message: "Cannot chamfer this object type." };
  }
  // Shell
  if (lower.match(/^shell/)) {
    const t = parseFloat(lower.match(/(\d+(?:\.\d+)?)/)?.[1] || "2");
    if (!selectedObj) return { success: false, message: "Select an object first to apply shell." };
    const ok = actions.aiShell(t);
    return ok
      ? { success: true, message: `Applied ${t}mm shell to "${selectedObj.name}".` }
      : { success: false, message: "Cannot shell this object type." };
  }
  // Mirror
  if (lower.includes("mirror")) {
    const plane = lower.includes("xz") ? "xz" : lower.includes("yz") ? "yz" : "xy";
    const ids = actions.aiMirror(plane as "xy" | "xz" | "yz");
    return ids.length > 0
      ? { success: true, message: `Mirrored ${ids.length} object(s) about ${plane.toUpperCase()} plane.` }
      : { success: false, message: "No objects to mirror." };
  }
  // Optimize / explain / help
  if (lower.includes("optimize")) {
    return { success: true, message: selectedObj
      ? `Optimization for "${selectedObj.name}": consider shell (2mm) to reduce mass ~60%, add ribs for support, fillet stress concentrators.`
      : "Select an object to optimize." };
  }
  if (lower.includes("explain")) {
    return { success: true, message: selectedObj
      ? `"${selectedObj.name}" is a ${selectedObj.type}, ${(selectedObj.dimensions.width*10).toFixed(0)}×${(selectedObj.dimensions.height*10).toFixed(0)}×${(selectedObj.dimensions.depth*10).toFixed(0)}mm.`
      : "Select an object to explain." };
  }
  if (lower.includes("what") || lower.includes("scene") || lower.includes("list")) {
    return { success: true, message: `Scene contains ${objectCount} object(s).${selectedObj ? ` Selected: "${selectedObj.name}".` : ""}` };
  }

  return null; // Not handled by sync commands
}

// Check if input is a create/generate command that should go through the reasoning engine API
function isCreateCommand(input: string): boolean {
  const lower = input.toLowerCase().trim();
  return /^(make|create|add|generate|design|place)\s/.test(lower) ||
         lower.includes("pv module") || lower.includes("solar panel") ||
         lower.includes("dumbbell") || lower.includes("barbell") ||
         lower.includes("gear") || lower.includes("bracket") ||
         lower.includes("pipe") || lower.includes("tube") ||
         lower.includes("plate") || lower.includes("flange") ||
         lower.includes("heat sink") || lower.includes("heatsink") ||
         lower.includes("enclosure") || lower.includes("bolt");
}

export default function DesignerCommandBar() {
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [commandResponse, setCommandResponse] = useState<{ message: string; success: boolean } | null>(null);
  const [thinkingMode, setThinkingMode] = useState<ThinkingMode>("auto");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const responseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const executeCommand = useCadStore((s) => s.executeCommand);
  const commandHistory = useCadStore((s) => s.commandHistory);
  const unit = useCadStore((s) => s.unit);
  const snapGrid = useCadStore((s) => s.snapGrid);
  const setSnapGrid = useCadStore((s) => s.setSnapGrid);
  const selectedIds = useCadStore((s) => s.selectedIds);
  const selectedId = useCadStore((s) => s.selectedId);
  const objects = useCadStore((s) => s.objects);
  const addGeneratedObject = useCadStore((s) => s.addGeneratedObject);
  const addAssemblyFromParts = useCadStore((s) => s.addAssemblyFromParts);
  const aiFilletSelected = useCadStore((s) => s.aiFilletSelected);
  const aiChamferSelected = useCadStore((s) => s.aiChamferSelected);
  const aiShell = useCadStore((s) => s.aiShell);
  const aiMirror = useCadStore((s) => s.aiMirror);

  const selCount = selectedIds.length || (selectedId ? 1 : 0);
  const selectedObj = objects.find((o) => o.id === selectedId) || null;

  // Auto-dismiss response after 6 seconds
  useEffect(() => {
    if (commandResponse) {
      responseTimerRef.current = setTimeout(() => setCommandResponse(null), 6000);
      return () => { if (responseTimerRef.current) clearTimeout(responseTimerRef.current); };
    }
  }, [commandResponse]);

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
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;
      const cmd = input.trim();
      const upper = cmd.toUpperCase().split(/\s+/)[0];
      const isStandardCmd = COMMANDS.includes(upper);

      setInput("");
      setHistoryIndex(-1);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(0);

      if (isStandardCmd) {
        executeCommand(cmd);
        setCommandResponse({ success: true, message: `Executed: ${upper}` });
        return;
      }

      // Try sync commands first (fillet, chamfer, shell, mirror, etc.)
      const syncResult = processAICommandSync(cmd, selectedObj, objects.length, {
        aiFilletSelected,
        aiChamferSelected,
        aiShell,
        aiMirror,
      });
      if (syncResult) {
        if (!syncResult.success) executeCommand(cmd);
        setCommandResponse(syncResult);
        return;
      }

      // For create/generate commands → use reasoning engine (local + API)
      if (isCreateCommand(cmd)) {
        setCommandResponse({ success: true, message: "Generating geometry..." });
        try {
          const res = await fetch("/api/ai/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: cmd }),
          });
          const data = await res.json();
          if (data.assemblyParts && data.assemblyParts.length > 0) {
            addAssemblyFromParts(data.assemblyParts, data.object?.name || "Assembly");
            setCommandResponse({
              success: true,
              message: `Created "${data.object?.name || "Part"}" (${data.assemblyParts.length} part${data.assemblyParts.length > 1 ? "s" : ""}). ${data.message || ""}`,
            });
          } else if (data.object) {
            addGeneratedObject(data.object);
            setCommandResponse({
              success: true,
              message: `Created "${data.object.name}". ${data.message || ""}`,
            });
          } else {
            setCommandResponse({ success: false, message: data.error || "Failed to generate." });
          }
        } catch {
          // Fallback: use local reasoning engine directly (no API needed)
          try {
            const result = runReasoningEngine(cmd);
            if (result.parts.length > 0) {
              addAssemblyFromParts(result.parts, result.objectType);
              setCommandResponse({
                success: true,
                message: `Created "${result.objectType}" (${result.parts.length} parts, offline). ${result.summary}`,
              });
            } else {
              setCommandResponse({ success: false, message: "Could not parse. Try: 'create box 50x30x20mm'." });
            }
          } catch {
            setCommandResponse({ success: false, message: "Generation failed. Try a simpler description." });
          }
        }
        return;
      }

      // Fallback
      executeCommand(cmd);
      setCommandResponse({ success: false, message: `Unknown command: "${cmd}". Try "create a PV module" or "fillet 3mm".` });
    },
    [input, executeCommand, selectedObj, objects.length, addGeneratedObject, addAssemblyFromParts, aiFilletSelected, aiChamferSelected, aiShell, aiMirror]
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
      {/* Command response notification */}
      {commandResponse && (
        <div className={`absolute bottom-full left-0 right-0 mb-0 px-4 py-2 text-xs flex items-center gap-2 animate-fade-in z-50 border-b ${
          commandResponse.success
            ? "bg-[#0d1117]/95 border-emerald-500/20 text-emerald-300"
            : "bg-[#0d1117]/95 border-amber-500/20 text-amber-300"
        }`}>
          {commandResponse.success
            ? <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
            : <AlertCircle size={12} className="text-amber-400 shrink-0" />
          }
          <span className="flex-1 font-mono leading-relaxed">{commandResponse.message}</span>
          <button
            onClick={() => setCommandResponse(null)}
            className="text-slate-500 hover:text-white shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}
      {/* Thinking mode compact toggle */}
      <div className="flex items-center gap-0.5 mr-2 shrink-0">
        {(["normal", "extended", "deep", "auto"] as ThinkingMode[]).map((mode) => {
          const isActive = thinkingMode === mode;
          const icons: Record<ThinkingMode, React.ReactNode> = {
            normal: <Zap size={9} />,
            extended: <Brain size={9} />,
            deep: <Cpu size={9} />,
            auto: <Sparkles size={9} />,
          };
          return (
            <button
              key={mode}
              onClick={() => setThinkingMode(mode)}
              className={`p-1 rounded transition-colors ${
                isActive ? "text-white" : "text-slate-600 hover:text-slate-400"
              }`}
              style={isActive ? { color: THINKING_MODES[mode].color } : undefined}
              title={`${THINKING_MODES[mode].label}: ${THINKING_MODES[mode].description}`}
            >
              {icons[mode]}
            </button>
          );
        })}
      </div>

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

        {/* Inline attach button */}
        <InlineAttachButton
          onAttach={setAttachments}
          existingAttachments={attachments}
        />
        {attachments.length > 0 && (
          <span className="text-[9px] text-purple-400">{attachments.length} file{attachments.length > 1 ? "s" : ""}</span>
        )}
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

        {/* Thinking mode indicator */}
        <span
          className="text-[9px] font-medium px-1.5 py-0.5 rounded"
          style={{
            color: THINKING_MODES[thinkingMode].color,
            backgroundColor: THINKING_MODES[thinkingMode].bgColor,
          }}
        >
          {THINKING_MODES[thinkingMode].label}
          {thinkingMode !== "auto" && <span className="opacity-60 ml-0.5">~{THINKING_MODES[thinkingMode].credits}cr</span>}
        </span>
      </div>
    </div>
  );
}
