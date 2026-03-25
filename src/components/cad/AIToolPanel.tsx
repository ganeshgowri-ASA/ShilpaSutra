"use client";
import { useState, useRef, useEffect } from "react";
import { useCadStore } from "@/stores/cad-store";
import {
  X, Loader2, Send, MessageSquare, Wand2, Zap, HelpCircle,
} from "lucide-react";

type AIToolType = "ai_text_to_cad" | "ai_suggest" | "ai_optimize" | "ai_explain";

const TOOL_CONFIG: Record<AIToolType, {
  title: string;
  icon: React.ReactNode;
  placeholder: string;
  description: string;
  color: string;
}> = {
  ai_text_to_cad: {
    title: "Text to CAD",
    icon: <MessageSquare size={14} />,
    placeholder: "Describe the 3D object you want to create...",
    description: "Generate 3D geometry from a natural language description.",
    color: "purple",
  },
  ai_suggest: {
    title: "Suggest Fix",
    icon: <Wand2 size={14} />,
    placeholder: "Describe the issue or what you want improved...",
    description: "Get AI suggestions to fix issues with the selected geometry.",
    color: "amber",
  },
  ai_optimize: {
    title: "Optimize",
    icon: <Zap size={14} />,
    placeholder: "What optimization goal? (e.g., reduce weight, simplify...)",
    description: "Optimize the selected object for weight, topology, or printability.",
    color: "emerald",
  },
  ai_explain: {
    title: "Explain",
    icon: <HelpCircle size={14} />,
    placeholder: "What do you want explained about this model?",
    description: "Get an AI explanation of the selected geometry or feature.",
    color: "blue",
  },
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; hoverBg: string; lightBg: string }> = {
  purple: { bg: "bg-purple-600", border: "border-purple-500/30", text: "text-purple-400", hoverBg: "hover:bg-purple-700", lightBg: "bg-purple-500/10" },
  amber: { bg: "bg-amber-600", border: "border-amber-500/30", text: "text-amber-400", hoverBg: "hover:bg-amber-700", lightBg: "bg-amber-500/10" },
  emerald: { bg: "bg-emerald-600", border: "border-emerald-500/30", text: "text-emerald-400", hoverBg: "hover:bg-emerald-700", lightBg: "bg-emerald-500/10" },
  blue: { bg: "bg-blue-600", border: "border-blue-500/30", text: "text-blue-400", hoverBg: "hover:bg-blue-700", lightBg: "bg-blue-500/10" },
};

interface AIToolPanelProps {
  toolType: AIToolType;
  onClose: () => void;
}

export default function AIToolPanel({ toolType, onClose }: AIToolPanelProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedId = useCadStore((s) => s.selectedId);
  const objects = useCadStore((s) => s.objects);
  const addGeneratedObject = useCadStore((s) => s.addGeneratedObject);
  const selectedObj = objects.find((o) => o.id === selectedId);

  const config = TOOL_CONFIG[toolType];
  const colors = COLOR_MAP[config.color];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `[${config.title.toUpperCase()}] ${input}`,
          context: {
            tool: toolType,
            selectedObject: selectedObj ? {
              name: selectedObj.name,
              type: selectedObj.type,
              dimensions: selectedObj.dimensions,
              position: selectedObj.position,
            } : null,
            sceneObjectCount: objects.length,
          },
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        // If the response contains geometry, add it to the scene
        if (data.object) {
          addGeneratedObject(data.object);
          setResult(`Created "${data.object.name}" successfully. ${data.message || ""}`);
        } else if (data.message) {
          setResult(data.message);
        } else if (data.response) {
          setResult(data.response);
        } else {
          setResult("AI processed your request. Check the viewport for changes.");
        }
      }
    } catch {
      // Provide a helpful offline/fallback response
      if (toolType === "ai_explain") {
        setResult(selectedObj
          ? `"${selectedObj.name}" is a ${selectedObj.type} with dimensions ${selectedObj.dimensions.width}x${selectedObj.dimensions.height}x${selectedObj.dimensions.depth}mm. Position: [${selectedObj.position.join(", ")}].`
          : "Select an object in the viewport to get an AI explanation of its geometry and features."
        );
      } else if (toolType === "ai_suggest") {
        setResult(selectedObj
          ? `Suggestions for "${selectedObj.name}":\n- Consider adding fillets to sharp edges for strength\n- Check wall thickness for manufacturability\n- Verify draft angles for moldability`
          : "Select an object to receive AI-powered fix suggestions."
        );
      } else if (toolType === "ai_optimize") {
        setResult(selectedObj
          ? `Optimization analysis for "${selectedObj.name}":\n- Current volume can be reduced with topology optimization\n- Consider shell operation to reduce material\n- Add ribs for structural support with less mass`
          : "Select an object to receive optimization recommendations."
        );
      } else if (toolType === "ai_text_to_cad") {
        // Attempt to create a basic object from the prompt
        const lower = input.toLowerCase();
        let type: "box" | "cylinder" | "sphere" | "cone" = "box";
        if (lower.includes("cylinder") || lower.includes("tube") || lower.includes("pipe")) type = "cylinder";
        else if (lower.includes("sphere") || lower.includes("ball")) type = "sphere";
        else if (lower.includes("cone") || lower.includes("funnel")) type = "cone";

        const dimMatch = lower.match(/(\d+)\s*(?:mm|cm|x)/);
        const size = dimMatch ? parseFloat(dimMatch[1]) / 10 : 1;

        addGeneratedObject({
          type,
          name: input.slice(0, 30),
          position: [0, size / 2, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          dimensions: { width: size, height: size, depth: size },
          material: "steel",
          color: "#6366f1",
          visible: true,
          locked: false,
          opacity: 1,
          metalness: 0.8,
          roughness: 0.3,
        });
        setResult(`Created a ${type} from your description. Refine it using the AI chat or property panel.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const needsSelection = toolType !== "ai_text_to_cad" && !selectedObj;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-[420px] animate-scale-in">
      <div className={`bg-[#0d1117]/95 backdrop-blur-xl border ${colors.border} rounded-xl shadow-2xl shadow-black/40 overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#21262d]">
          <div className="flex items-center gap-2">
            <span className={colors.text}>{config.icon}</span>
            <span className="text-xs font-bold text-white">{config.title}</span>
            {selectedObj && (
              <span className="text-[9px] bg-[#21262d] text-slate-400 rounded px-1.5 py-0.5">
                {selectedObj.name}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#21262d] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Description */}
        <div className="px-4 py-2 text-[10px] text-slate-500">
          {config.description}
        </div>

        {/* Warning if selection needed */}
        {needsSelection && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400">
            Select an object in the viewport first for best results.
          </div>
        )}

        {/* Input area */}
        <div className="px-4 pb-3">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
                if (e.key === "Escape") onClose();
              }}
              placeholder={config.placeholder}
              rows={2}
              className="w-full bg-[#161b22] text-xs text-slate-200 rounded-lg px-3 py-2.5 pr-10 outline-none border border-[#21262d] focus:border-purple-500/50 resize-none placeholder-slate-600"
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              className={`absolute right-2 bottom-2.5 w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                input.trim() && !isLoading
                  ? `${colors.bg} text-white ${colors.hoverBg}`
                  : "bg-[#21262d] text-slate-600 cursor-not-allowed"
              }`}
            >
              {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            </button>
          </div>
        </div>

        {/* Result area */}
        {(result || error) && (
          <div className="px-4 pb-3">
            <div className={`rounded-lg px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
              error
                ? "bg-red-500/10 border border-red-500/20 text-red-400"
                : `${colors.lightBg} border ${colors.border} ${colors.text}`
            }`}>
              {error || result}
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="px-4 pb-3">
            <div className={`flex items-center gap-2 ${colors.text} text-xs`}>
              <Loader2 size={12} className="animate-spin" />
              <span>Processing with ShilpaSutra AI...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
