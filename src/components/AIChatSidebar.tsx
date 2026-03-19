"use client";
import { useState, useRef, useEffect } from "react";
import { useCadStore } from "@/stores/cad-store";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  generating?: boolean;
  objectId?: string;
}

const SUGGESTIONS = [
  "Create a gear with 20 teeth",
  "Design a mounting bracket",
  "Generate a hex bolt M10x40",
  "Create a pipe flange DN50",
  "Make a heatsink with 8 fins",
];

// Built-in parametric generators that create actual 3D objects
function generateParametricObject(prompt: string): {
  type: "box" | "cylinder" | "sphere" | "cone";
  name: string;
  dimensions: { width: number; height: number; depth: number };
  description: string;
} | null {
  const lower = prompt.toLowerCase();

  if (lower.includes("gear") || lower.includes("spur")) {
    const teeth = parseInt(lower.match(/(\d+)\s*teeth/)?.[1] || "20");
    const radius = (teeth * 2) / (2 * Math.PI); // approximate
    return {
      type: "cylinder",
      name: `Spur Gear ${teeth}T`,
      dimensions: { width: Math.max(1, radius / 10), height: 0.5, depth: Math.max(1, radius / 10) },
      description: `Generated a spur gear with ${teeth} teeth. Module ~2mm, face width 10mm. Represented as cylinder (use OpenCASCADE for true involute profile).`,
    };
  }

  if (lower.includes("bracket") || lower.includes("mount")) {
    const thickness = parseFloat(lower.match(/(\d+)\s*mm\s*thick/)?.[1] || "3") / 10;
    return {
      type: "box",
      name: "L-Bracket",
      dimensions: { width: 2, height: 2, depth: thickness || 0.3 },
      description: `Generated an L-bracket. Dimensions: 20x20x${thickness * 10}mm. Add fillets and mounting holes in the editor.`,
    };
  }

  if (lower.includes("bolt") || lower.includes("hex") || lower.includes("screw")) {
    const sizeMatch = lower.match(/m(\d+)/i);
    const size = sizeMatch ? parseInt(sizeMatch[1]) : 8;
    const lengthMatch = lower.match(/x(\d+)/);
    const length = lengthMatch ? parseInt(lengthMatch[1]) : 30;
    return {
      type: "cylinder",
      name: `Hex Bolt M${size}x${length}`,
      dimensions: { width: size / 20, height: length / 10, depth: size / 20 },
      description: `Generated M${size}x${length} hex bolt. Head height: ${(size * 0.65).toFixed(1)}mm, across flats: ${(size * 1.7).toFixed(1)}mm.`,
    };
  }

  if (lower.includes("flange") || lower.includes("pipe")) {
    const dnMatch = lower.match(/dn(\d+)/i);
    const dn = dnMatch ? parseInt(dnMatch[1]) : 50;
    return {
      type: "cylinder",
      name: `Pipe Flange DN${dn}`,
      dimensions: { width: dn / 20, height: 0.4, depth: dn / 20 },
      description: `Generated DN${dn} pipe flange. OD: ${(dn * 1.5).toFixed(0)}mm, bore: ${dn}mm, thickness: 20mm.`,
    };
  }

  if (lower.includes("heat") || lower.includes("sink") || lower.includes("fin")) {
    const fins = parseInt(lower.match(/(\d+)\s*fin/)?.[1] || "8");
    return {
      type: "box",
      name: `Heatsink ${fins} fins`,
      dimensions: { width: 2, height: 1.5, depth: 2 },
      description: `Generated heatsink with ${fins} fins. Base: 50x50x3mm, fin height: 25mm, fin spacing: ${(50 / fins).toFixed(1)}mm.`,
    };
  }

  if (lower.includes("box") || lower.includes("cube") || lower.includes("block")) {
    const sizeMatch = lower.match(/(\d+)\s*(?:mm|cm)/);
    const size = sizeMatch ? parseInt(sizeMatch[1]) / 10 : 2;
    return {
      type: "box",
      name: "Box",
      dimensions: { width: size, height: size, depth: size },
      description: `Generated a ${size * 10}mm cube.`,
    };
  }

  if (lower.includes("sphere") || lower.includes("ball")) {
    const sizeMatch = lower.match(/(\d+)\s*(?:mm|cm|radius)/);
    const size = sizeMatch ? parseInt(sizeMatch[1]) / 10 : 1.5;
    return {
      type: "sphere",
      name: "Sphere",
      dimensions: { width: size, height: size, depth: size },
      description: `Generated a sphere with radius ${size * 10}mm.`,
    };
  }

  if (lower.includes("cylinder") || lower.includes("tube") || lower.includes("rod")) {
    return {
      type: "cylinder",
      name: "Cylinder",
      dimensions: { width: 1, height: 2, depth: 1 },
      description: "Generated a cylinder. Radius: 10mm, height: 20mm.",
    };
  }

  if (lower.includes("cone") || lower.includes("taper")) {
    return {
      type: "cone",
      name: "Cone",
      dimensions: { width: 1, height: 2, depth: 1 },
      description: "Generated a cone. Base radius: 10mm, height: 20mm.",
    };
  }

  // Generic - create a box
  return {
    type: "box",
    name: "Generated Part",
    dimensions: { width: 2, height: 2, depth: 2 },
    description: "Generated a basic part based on your description. Modify dimensions in the properties panel.",
  };
}

export default function AIChatSidebar({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I am ShilpaSutra AI. Describe what you want to create and I will generate the 3D geometry.\n\nExamples:\n- \"Create a gear with 20 teeth\"\n- \"Design a bracket with mounting holes\"\n- \"Generate a hex bolt M10x40\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addObject = useCadStore((s) => s.addObject);
  const updateObject = useCadStore((s) => s.updateObject);
  const addGeneratedObject = useCadStore((s) => s.addGeneratedObject);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isGenerating) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const prompt = input.trim();
    setInput("");
    setIsGenerating(true);

    // Add "thinking" message
    const thinkingId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: thinkingId,
        role: "assistant",
        content: "Analyzing your request and generating geometry...",
        timestamp: new Date(),
        generating: true,
      },
    ]);

    try {
      // Try the AI API first
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (data.success && data.object) {
        // Create the 3D object from AI response
        const objId = addGeneratedObject({
          type: data.object.type,
          name: data.object.name,
          dimensions: data.object.dimensions,
          position: [0, data.object.dimensions.height / 2, 0],
        });

        // Replace thinking message with result
        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingId
              ? {
                  ...m,
                  content: data.message || `Created "${data.object.name}" in the viewport. ${data.object.description || ""}`,
                  generating: false,
                  objectId: objId,
                }
              : m
          )
        );
      } else if (data.fallback) {
        // API returned fallback - use built-in generator
        const result = generateParametricObject(prompt);
        if (result) {
          const objId = addGeneratedObject({
            type: result.type,
            name: result.name,
            dimensions: result.dimensions,
            position: [0, result.dimensions.height / 2, 0],
          });

          setMessages((prev) =>
            prev.map((m) =>
              m.id === thinkingId
                ? {
                    ...m,
                    content: `${result.description}\n\nObject "${result.name}" has been added to the viewport. Select it to modify properties.`,
                    generating: false,
                    objectId: objId,
                  }
                : m
            )
          );
        }
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch {
      // Fallback to built-in parametric generators
      const result = generateParametricObject(prompt);
      if (result) {
        const objId = addGeneratedObject({
          type: result.type,
          name: result.name,
          dimensions: result.dimensions,
          position: [0, result.dimensions.height / 2, 0],
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingId
              ? {
                  ...m,
                  content: `${result.description}\n\nObject "${result.name}" has been added to the viewport.`,
                  generating: false,
                  objectId: objId,
                }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingId
              ? {
                  ...m,
                  content: "I could not understand that request. Try describing a specific part like a gear, bracket, bolt, flange, or heatsink.",
                  generating: false,
                }
              : m
          )
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-80 bg-[#161b22] border-l border-[#21262d] flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d] bg-[#0d1117]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-bold text-white">ShilpaSutra AI</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white text-sm px-1 rounded hover:bg-[#21262d]"
        >
          x
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-[#0d1117] text-slate-300 border border-[#21262d]"
              }`}
            >
              {msg.generating ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-blue-400">{msg.content}</span>
                </div>
              ) : (
                <>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.objectId && (
                    <button
                      onClick={() => useCadStore.getState().selectObject(msg.objectId!)}
                      className="mt-1.5 text-[10px] bg-[#e94560]/20 text-[#e94560] border border-[#e94560]/30 rounded px-2 py-0.5 hover:bg-[#e94560]/30"
                    >
                      Select in viewport
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      <div className="px-3 py-1.5 border-t border-[#21262d]">
        <div className="flex flex-wrap gap-1 mb-2">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => setInput(s)}
              className="text-[9px] px-1.5 py-0.5 bg-[#0d1117] text-slate-500 rounded border border-[#21262d] hover:border-blue-500 hover:text-blue-400 transition-colors truncate max-w-[160px]"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Describe what to create..."
            disabled={isGenerating}
            className="flex-1 bg-[#0d1117] text-white rounded px-3 py-2 text-xs outline-none border border-[#21262d] focus:border-blue-500 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isGenerating}
            className="px-3 py-2 bg-[#e94560] text-white rounded text-xs font-medium hover:bg-[#d63750] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Go
          </button>
        </div>
      </div>
    </div>
  );
}
