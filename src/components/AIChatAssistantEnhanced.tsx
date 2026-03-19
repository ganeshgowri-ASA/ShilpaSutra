"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useCadStore, type CadObject, getMaterialColor, materialList } from "@/stores/cad-store";

/* ── Types ── */
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  generating?: boolean;
  objectId?: string;
  thinkingSteps?: string[];
  commandType?: string;
}

/* ── Command Interpreter ── */
interface CommandResult {
  success: boolean;
  message: string;
  thinkingSteps: string[];
  objectId?: string;
  commandType: string;
}

function interpretCommand(
  input: string,
  objects: CadObject[],
  selectedId: string | null,
  actions: {
    addObject: (type: CadObject["type"]) => string;
    addGeneratedObject: (obj: Partial<CadObject> & { type: CadObject["type"]; name: string }) => string;
    updateObject: (id: string, updates: Partial<CadObject>) => void;
    deleteObject: (id: string) => void;
    selectObject: (id: string | null) => void;
  }
): CommandResult {
  const lower = input.toLowerCase().trim();
  const steps: string[] = [];
  const selected = objects.find((o) => o.id === selectedId);

  // ── FILLET command ──
  if (lower.includes("fillet") || lower.includes("round")) {
    const radiusMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:mm|cm|r)?/);
    const radius = radiusMatch ? parseFloat(radiusMatch[1]) : 2;
    steps.push(`Parsing fillet command: radius = ${radius}mm`);

    if (lower.includes("all")) {
      steps.push(`Target: ALL edges on all ${objects.filter(o => !["line","arc","circle","rectangle"].includes(o.type)).length} solid objects`);
      steps.push("Applying fillet operation (simulated - marking objects as filleted)");
      const meshObjects = objects.filter(o => !["line", "arc", "circle", "rectangle"].includes(o.type));
      meshObjects.forEach((obj) => {
        actions.updateObject(obj.id, { name: `${obj.name} (R${radius} fillet)` });
      });
      return {
        success: true,
        message: `Applied ${radius}mm fillet to all edges on ${meshObjects.length} object(s). In production, this would invoke OpenCASCADE FilletMaker on each edge.`,
        thinkingSteps: steps,
        commandType: "fillet",
      };
    } else if (selected) {
      steps.push(`Target: Selected object "${selected.name}"`);
      steps.push(`Applying ${radius}mm fillet to all edges of ${selected.name}`);
      actions.updateObject(selected.id, { name: `${selected.name} (R${radius} fillet)` });
      return {
        success: true,
        message: `Applied ${radius}mm fillet to all edges of "${selected.name}".`,
        thinkingSteps: steps,
        objectId: selected.id,
        commandType: "fillet",
      };
    } else {
      steps.push("No object selected - cannot apply fillet");
      return {
        success: false,
        message: "Please select an object first, or say 'fillet all edges'.",
        thinkingSteps: steps,
        commandType: "fillet",
      };
    }
  }

  // ── CHAMFER command ──
  if (lower.includes("chamfer") || lower.includes("bevel")) {
    const sizeMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:mm|cm)?/);
    const size = sizeMatch ? parseFloat(sizeMatch[1]) : 1;
    steps.push(`Parsing chamfer command: size = ${size}mm`);

    if (selected) {
      steps.push(`Applying ${size}mm chamfer to "${selected.name}"`);
      actions.updateObject(selected.id, { name: `${selected.name} (${size}mm chamfer)` });
      return {
        success: true,
        message: `Applied ${size}mm chamfer to "${selected.name}".`,
        thinkingSteps: steps,
        objectId: selected.id,
        commandType: "chamfer",
      };
    }
    return { success: false, message: "Select an object to chamfer.", thinkingSteps: steps, commandType: "chamfer" };
  }

  // ── BOLT HOLES command ──
  if (lower.includes("bolt") && lower.includes("hole")) {
    const countMatch = lower.match(/(\d+)\s*(?:bolt|hole)/);
    const count = countMatch ? parseInt(countMatch[1]) : 4;
    const sizeMatch = lower.match(/m(\d+)/i);
    const boltSize = sizeMatch ? parseInt(sizeMatch[1]) : 8;
    steps.push(`Parsing bolt hole command: ${count} holes, M${boltSize}`);

    if (selected) {
      steps.push(`Target object: "${selected.name}" (${selected.type})`);
      steps.push(`Calculating bolt hole pattern: ${count} holes evenly spaced`);
      steps.push(`Hole diameter: ${boltSize + 1}mm (M${boltSize} clearance hole per IS/ISO)`);

      const pcdRadius = Math.min(selected.dimensions.width, selected.dimensions.depth) * 0.35;
      steps.push(`PCD radius: ${(pcdRadius * 10).toFixed(1)}mm`);

      // Add cylinder objects as bolt holes
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = selected.position[0] + pcdRadius * Math.cos(angle);
        const z = selected.position[2] + pcdRadius * Math.sin(angle);
        actions.addGeneratedObject({
          type: "cylinder",
          name: `Bolt Hole M${boltSize} #${i + 1}`,
          dimensions: { width: (boltSize + 1) / 20, height: selected.dimensions.height + 0.1, depth: (boltSize + 1) / 20 },
          position: [x, selected.position[1], z],
          color: "#333333",
        });
      }

      return {
        success: true,
        message: `Added ${count}x M${boltSize} bolt holes to "${selected.name}" on a ${(pcdRadius * 20).toFixed(0)}mm PCD. In production, these would be boolean-subtracted from the solid.`,
        thinkingSteps: steps,
        objectId: selected.id,
        commandType: "bolt-holes",
      };
    }
    steps.push("No object selected for bolt hole placement");
    return { success: false, message: "Select an object to add bolt holes.", thinkingSteps: steps, commandType: "bolt-holes" };
  }

  // ── MIRROR command ──
  if (lower.includes("mirror")) {
    const planeMatch = lower.match(/(?:about|across|along|on)\s*(xz|xy|yz|x|y|z)/i);
    const plane = planeMatch ? planeMatch[1].toUpperCase() : "XZ";
    steps.push(`Parsing mirror command: plane = ${plane}`);

    const targets = lower.includes("all")
      ? objects.filter((o) => !["line", "arc", "circle", "rectangle"].includes(o.type))
      : selected
      ? [selected]
      : [];

    if (targets.length === 0) {
      return { success: false, message: "Select an object or say 'mirror all'.", thinkingSteps: steps, commandType: "mirror" };
    }

    steps.push(`Mirroring ${targets.length} object(s) about ${plane} plane`);

    targets.forEach((obj) => {
      const newPos: [number, number, number] = [...obj.position];
      if (plane.includes("Y") || plane === "XZ") newPos[1] = -newPos[1];
      if (plane.includes("X") || plane === "YZ") newPos[0] = -newPos[0];
      if (plane.includes("Z") || plane === "XY") newPos[2] = -newPos[2];

      actions.addGeneratedObject({
        type: obj.type,
        name: `${obj.name} (mirrored)`,
        dimensions: { ...obj.dimensions },
        position: newPos,
        color: obj.color,
        material: obj.material,
      });
    });

    return {
      success: true,
      message: `Mirrored ${targets.length} object(s) about the ${plane} plane.`,
      thinkingSteps: steps,
      commandType: "mirror",
    };
  }

  // ── MOVE / TRANSLATE command ──
  if (lower.includes("move") || lower.includes("translate") || lower.includes("shift")) {
    steps.push("Parsing move/translate command");
    const coordMatch = lower.match(/(?:to|by)\s*\(?\s*(-?\d+(?:\.\d+)?)\s*[,\s]+\s*(-?\d+(?:\.\d+)?)\s*[,\s]+\s*(-?\d+(?:\.\d+)?)/);
    if (selected && coordMatch) {
      const dx = parseFloat(coordMatch[1]) / 10;
      const dy = parseFloat(coordMatch[2]) / 10;
      const dz = parseFloat(coordMatch[3]) / 10;
      steps.push(`Moving "${selected.name}" by (${dx * 10}, ${dy * 10}, ${dz * 10})mm`);
      const newPos: [number, number, number] = [
        selected.position[0] + dx,
        selected.position[1] + dy,
        selected.position[2] + dz,
      ];
      actions.updateObject(selected.id, { position: newPos });
      return {
        success: true,
        message: `Moved "${selected.name}" by (${dx * 10}, ${dy * 10}, ${dz * 10})mm.`,
        thinkingSteps: steps,
        objectId: selected.id,
        commandType: "move",
      };
    }
    return { success: false, message: "Specify coordinates: 'move by (10, 0, 5)'", thinkingSteps: steps, commandType: "move" };
  }

  // ── ROTATE command ──
  if (lower.includes("rotate") || lower.includes("turn") || lower.includes("spin")) {
    steps.push("Parsing rotate command");
    const angleMatch = lower.match(/(-?\d+(?:\.\d+)?)\s*(?:deg|degrees|°)?/);
    const axisMatch = lower.match(/(?:around|about|on)\s*(x|y|z)/i);
    if (selected && angleMatch) {
      const angle = parseFloat(angleMatch[1]);
      const axis = axisMatch ? axisMatch[1].toLowerCase() : "y";
      const rad = (angle * Math.PI) / 180;
      steps.push(`Rotating "${selected.name}" by ${angle} degrees about ${axis.toUpperCase()} axis`);
      const rot: [number, number, number] = [...selected.rotation];
      if (axis === "x") rot[0] += rad;
      else if (axis === "y") rot[1] += rad;
      else rot[2] += rad;
      actions.updateObject(selected.id, { rotation: rot });
      return {
        success: true,
        message: `Rotated "${selected.name}" by ${angle} degrees about ${axis.toUpperCase()} axis.`,
        thinkingSteps: steps,
        objectId: selected.id,
        commandType: "rotate",
      };
    }
    return { success: false, message: "Specify: 'rotate 45 degrees about Y'", thinkingSteps: steps, commandType: "rotate" };
  }

  // ── SCALE / RESIZE command ──
  if (lower.includes("scale") || lower.includes("resize")) {
    steps.push("Parsing scale command");
    const factorMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:x|times|factor)?/);
    if (selected && factorMatch) {
      const factor = parseFloat(factorMatch[1]);
      steps.push(`Scaling "${selected.name}" by factor ${factor}`);
      actions.updateObject(selected.id, {
        dimensions: {
          width: selected.dimensions.width * factor,
          height: selected.dimensions.height * factor,
          depth: selected.dimensions.depth * factor,
        },
      });
      return {
        success: true,
        message: `Scaled "${selected.name}" by ${factor}x.`,
        thinkingSteps: steps,
        objectId: selected.id,
        commandType: "scale",
      };
    }
    return { success: false, message: "Specify: 'scale 2x' or 'resize 1.5 times'", thinkingSteps: steps, commandType: "scale" };
  }

  // ── CHANGE MATERIAL command ──
  if (lower.includes("material") || lower.includes("change to") || lower.includes("make it")) {
    steps.push("Parsing material change command");
    const matName = materialList.find((m) => lower.includes(m.toLowerCase().split(" ")[0].toLowerCase()));
    if (selected && matName) {
      steps.push(`Changing material of "${selected.name}" to ${matName}`);
      actions.updateObject(selected.id, { material: matName, color: getMaterialColor(matName) });
      return {
        success: true,
        message: `Changed material of "${selected.name}" to ${matName}.`,
        thinkingSteps: steps,
        objectId: selected.id,
        commandType: "material",
      };
    }
    return { success: false, message: `Available materials: ${materialList.join(", ")}`, thinkingSteps: steps, commandType: "material" };
  }

  // ── DELETE / REMOVE command ──
  if (lower.includes("delete") || lower.includes("remove")) {
    steps.push("Parsing delete command");
    if (lower.includes("all")) {
      steps.push(`Deleting all ${objects.length} objects`);
      objects.forEach((o) => actions.deleteObject(o.id));
      return { success: true, message: `Deleted all ${objects.length} objects from the scene.`, thinkingSteps: steps, commandType: "delete" };
    }
    if (selected) {
      const name = selected.name;
      steps.push(`Deleting "${name}"`);
      actions.deleteObject(selected.id);
      return { success: true, message: `Deleted "${name}".`, thinkingSteps: steps, commandType: "delete" };
    }
    return { success: false, message: "Select an object to delete.", thinkingSteps: steps, commandType: "delete" };
  }

  // ── DUPLICATE / COPY command ──
  if (lower.includes("duplicate") || lower.includes("copy") || lower.includes("clone")) {
    steps.push("Parsing duplicate command");
    if (selected) {
      const offsetMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:mm|cm)/);
      const offset = offsetMatch ? parseFloat(offsetMatch[1]) / 10 : 2;
      steps.push(`Duplicating "${selected.name}" with offset ${offset * 10}mm`);
      const newId = actions.addGeneratedObject({
        type: selected.type,
        name: `${selected.name} (copy)`,
        dimensions: { ...selected.dimensions },
        position: [selected.position[0] + offset, selected.position[1], selected.position[2]],
        color: selected.color,
        material: selected.material,
      });
      return {
        success: true,
        message: `Duplicated "${selected.name}" with ${offset * 10}mm X offset.`,
        thinkingSteps: steps,
        objectId: newId,
        commandType: "duplicate",
      };
    }
    return { success: false, message: "Select an object to duplicate.", thinkingSteps: steps, commandType: "duplicate" };
  }

  // ── ARRAY / PATTERN command ──
  if (lower.includes("array") || lower.includes("pattern") || lower.includes("repeat")) {
    steps.push("Parsing array/pattern command");
    const countMatch = lower.match(/(\d+)\s*(?:times|copies|count|x)/);
    const count = countMatch ? parseInt(countMatch[1]) : 3;
    const spacingMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:mm|cm)\s*(?:spacing|apart|gap)/);
    const spacing = spacingMatch ? parseFloat(spacingMatch[1]) / 10 : 2;

    if (selected) {
      steps.push(`Creating linear array of "${selected.name}": ${count} copies, ${spacing * 10}mm spacing`);
      for (let i = 1; i <= count; i++) {
        actions.addGeneratedObject({
          type: selected.type,
          name: `${selected.name} [${i + 1}]`,
          dimensions: { ...selected.dimensions },
          position: [selected.position[0] + spacing * i, selected.position[1], selected.position[2]],
          color: selected.color,
          material: selected.material,
        });
      }
      return {
        success: true,
        message: `Created linear array: ${count} copies of "${selected.name}" at ${spacing * 10}mm spacing.`,
        thinkingSteps: steps,
        objectId: selected.id,
        commandType: "array",
      };
    }
    return { success: false, message: "Select an object to create an array.", thinkingSteps: steps, commandType: "array" };
  }

  // ── CREATE object commands (fallback to parametric generator) ──
  if (lower.includes("create") || lower.includes("add") || lower.includes("make") || lower.includes("generate") || lower.includes("design") || lower.includes("place")) {
    steps.push("Parsing create/generate command");
    let type: CadObject["type"] = "box";
    let name = "Generated Part";
    let dims = { width: 2, height: 2, depth: 2 };

    if (lower.includes("gear") || lower.includes("spur")) {
      const teeth = parseInt(lower.match(/(\d+)\s*teeth/)?.[1] || "20");
      type = "cylinder";
      name = `Spur Gear ${teeth}T`;
      const r = (teeth * 2) / (2 * Math.PI) / 10;
      dims = { width: Math.max(0.5, r), height: 0.5, depth: Math.max(0.5, r) };
      steps.push(`Generating spur gear: ${teeth} teeth, module ~2mm`);
    } else if (lower.includes("bracket") || lower.includes("mount")) {
      type = "box";
      name = "L-Bracket";
      dims = { width: 2, height: 2, depth: 0.3 };
      steps.push("Generating L-bracket: 20x20x3mm");
    } else if (lower.includes("bolt") || lower.includes("screw")) {
      const sizeMatch = lower.match(/m(\d+)/i);
      const size = sizeMatch ? parseInt(sizeMatch[1]) : 8;
      const lengthMatch = lower.match(/x(\d+)/);
      const length = lengthMatch ? parseInt(lengthMatch[1]) : 30;
      type = "cylinder";
      name = `Hex Bolt M${size}x${length}`;
      dims = { width: size / 20, height: length / 10, depth: size / 20 };
      steps.push(`Generating M${size}x${length} hex bolt`);
    } else if (lower.includes("heatsink") || lower.includes("heat sink") || lower.includes("fin")) {
      type = "box";
      name = "Heatsink";
      dims = { width: 2, height: 1.5, depth: 2 };
      steps.push("Generating heatsink with fins");
    } else if (lower.includes("sphere") || lower.includes("ball")) {
      type = "sphere";
      const sizeMatch = lower.match(/(\d+)\s*(?:mm|cm|radius)/);
      const r = sizeMatch ? parseInt(sizeMatch[1]) / 10 : 1.5;
      name = "Sphere";
      dims = { width: r, height: r, depth: r };
      steps.push(`Generating sphere: radius ${r * 10}mm`);
    } else if (lower.includes("cylinder") || lower.includes("tube") || lower.includes("rod") || lower.includes("shaft")) {
      type = "cylinder";
      name = "Cylinder";
      dims = { width: 1, height: 2, depth: 1 };
      steps.push("Generating cylinder");
    } else if (lower.includes("cone") || lower.includes("taper")) {
      type = "cone";
      name = "Cone";
      dims = { width: 1, height: 2, depth: 1 };
      steps.push("Generating cone");
    } else if (lower.includes("box") || lower.includes("cube") || lower.includes("block")) {
      type = "box";
      name = "Box";
      const sizeMatch = lower.match(/(\d+)\s*(?:mm|cm)/);
      const s = sizeMatch ? parseInt(sizeMatch[1]) / 10 : 2;
      dims = { width: s, height: s, depth: s };
      steps.push(`Generating box: ${s * 10}mm`);
    } else if (lower.includes("flange") || lower.includes("pipe")) {
      type = "cylinder";
      const dnMatch = lower.match(/dn(\d+)/i);
      const dn = dnMatch ? parseInt(dnMatch[1]) : 50;
      name = `Pipe Flange DN${dn}`;
      dims = { width: dn / 20, height: 0.4, depth: dn / 20 };
      steps.push(`Generating DN${dn} pipe flange`);
    } else {
      steps.push("Creating generic box part");
    }

    steps.push(`Object type: ${type}, name: "${name}"`);
    steps.push("Adding to scene at origin");

    const objId = actions.addGeneratedObject({
      type,
      name,
      dimensions: dims,
      position: [0, dims.height / 2, 0],
    });

    return {
      success: true,
      message: `Created "${name}" in the viewport. Select it to modify properties.`,
      thinkingSteps: steps,
      objectId: objId,
      commandType: "create",
    };
  }

  // ── SCENE INFO / WHAT'S IN SCENE ──
  if (lower.includes("what") || lower.includes("list") || lower.includes("scene") || lower.includes("show")) {
    steps.push("Gathering scene information");
    if (objects.length === 0) {
      return { success: true, message: "The scene is empty. Use commands like 'create a box' or 'add a gear with 20 teeth' to add objects.", thinkingSteps: steps, commandType: "info" };
    }
    const summary = objects.map((o) => `- ${o.name} (${o.type}) at [${o.position.map(p => (p * 10).toFixed(0)).join(", ")}]mm`).join("\n");
    return {
      success: true,
      message: `Scene contains ${objects.length} object(s):\n${summary}${selected ? `\n\nCurrently selected: "${selected.name}"` : ""}`,
      thinkingSteps: steps,
      commandType: "info",
    };
  }

  // ── HELP ──
  if (lower.includes("help") || lower === "?" || lower.includes("command")) {
    return {
      success: true,
      message: `Available commands:
- "create a box/cylinder/sphere/cone"
- "add a gear with 20 teeth"
- "add 4 bolt holes M8"
- "fillet all edges 2mm"
- "chamfer 1mm"
- "mirror about XZ"
- "move by (10, 0, 5)"
- "rotate 45 degrees about Y"
- "scale 2x"
- "duplicate 20mm apart"
- "array 5 copies 30mm spacing"
- "change material to aluminum"
- "delete selected"
- "what's in the scene?"`,
      thinkingSteps: ["Showing help information"],
      commandType: "help",
    };
  }

  // ── FALLBACK: try to create something ──
  steps.push("No specific command matched, attempting to create object from description");
  return interpretCommand(`create ${input}`, objects, selectedId, actions);
}

/* ── Suggestions ── */
const SUGGESTIONS = [
  "fillet all edges 2mm",
  "add 4 bolt holes M8",
  "mirror about XZ",
  "create a gear with 20 teeth",
  "what's in the scene?",
];

const COMMAND_ICONS: Record<string, string> = {
  fillet: "R",
  chamfer: "C",
  "bolt-holes": "O",
  mirror: "M",
  move: "T",
  rotate: "R",
  scale: "S",
  material: "M",
  delete: "X",
  duplicate: "D",
  array: "A",
  create: "+",
  info: "?",
  help: "H",
};

/* ── Component ── */
export default function AIChatAssistantEnhanced({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Welcome to ShilpaSutra AI Assistant (Zookeeper Mode).

I can understand natural language commands to modify your 3D scene:

- "fillet all edges 2mm"
- "add 4 bolt holes M8"
- "mirror about XZ"
- "create a gear with 20 teeth"
- "scale 1.5x"
- "rotate 45 degrees about Y"

I'm context-aware and know what's in your scene. Try asking "what's in the scene?" or type "help" for all commands.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showThinking, setShowThinking] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const objects = useCadStore((s) => s.objects);
  const selectedId = useCadStore((s) => s.selectedId);
  const addObject = useCadStore((s) => s.addObject);
  const addGeneratedObject = useCadStore((s) => s.addGeneratedObject);
  const updateObject = useCadStore((s) => s.updateObject);
  const deleteObject = useCadStore((s) => s.deleteObject);
  const selectObject = useCadStore((s) => s.selectObject);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(() => {
    if (!input.trim() || isProcessing) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const prompt = input.trim();
    setInput("");
    setIsProcessing(true);

    // Add processing indicator
    const processingId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: processingId,
        role: "assistant",
        content: "Processing command...",
        timestamp: new Date(),
        generating: true,
      },
    ]);

    // Simulate thinking delay for UX
    setTimeout(() => {
      const result = interpretCommand(prompt, objects, selectedId, {
        addObject,
        addGeneratedObject,
        updateObject,
        deleteObject,
        selectObject,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === processingId
            ? {
                ...m,
                content: result.message,
                generating: false,
                objectId: result.objectId,
                thinkingSteps: result.thinkingSteps,
                commandType: result.commandType,
              }
            : m
        )
      );
      setIsProcessing(false);
    }, 400 + Math.random() * 400);
  }, [input, isProcessing, objects, selectedId, addObject, addGeneratedObject, updateObject, deleteObject, selectObject]);

  const selectedObj = objects.find((o) => o.id === selectedId);

  return (
    <div className="w-80 bg-[#161b22] border-l border-[#21262d] flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d] bg-[#0d1117]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-bold text-white">AI Assistant</span>
          <span className="text-[9px] bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded px-1.5 py-0.5">Zookeeper</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowThinking(!showThinking)}
            title="Toggle thinking chain"
            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
              showThinking ? "border-blue-500/40 text-blue-400 bg-blue-500/10" : "border-[#21262d] text-slate-600"
            }`}
          >
            Think
          </button>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white text-sm px-1 rounded hover:bg-[#21262d]"
          >
            x
          </button>
        </div>
      </div>

      {/* Context bar - shows current scene state */}
      <div className="px-3 py-1.5 border-b border-[#21262d] bg-[#0d1117]/50 flex items-center gap-2 text-[10px]">
        <span className="text-slate-500">Scene: <span className="text-slate-300">{objects.length} obj</span></span>
        <span className="text-slate-600">|</span>
        {selectedObj ? (
          <span className="text-[#e94560]">Selected: {selectedObj.name}</span>
        ) : (
          <span className="text-slate-600">No selection</span>
        )}
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
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-purple-400">Interpreting...</span>
                </div>
              ) : (
                <>
                  {/* Command type badge */}
                  {msg.commandType && msg.role === "assistant" && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[9px] font-mono bg-[#21262d] text-slate-400 rounded px-1.5 py-0.5">
                        {COMMAND_ICONS[msg.commandType] || ">"} {msg.commandType.toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Thinking steps (collapsible) */}
                  {showThinking && msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
                    <div className="mb-2 pl-2 border-l-2 border-purple-500/30 space-y-0.5">
                      {msg.thinkingSteps.map((step, i) => (
                        <div key={i} className="text-[10px] text-purple-400/70 font-mono">
                          {step}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Message content */}
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Select in viewport button */}
                  {msg.objectId && (
                    <button
                      onClick={() => selectObject(msg.objectId!)}
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
              className="text-[9px] px-1.5 py-0.5 bg-[#0d1117] text-slate-500 rounded border border-[#21262d] hover:border-purple-500 hover:text-purple-400 transition-colors truncate max-w-[160px]"
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
            placeholder="Type a command..."
            disabled={isProcessing}
            className="flex-1 bg-[#0d1117] text-white rounded px-3 py-2 text-xs outline-none border border-[#21262d] focus:border-purple-500 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isProcessing}
            className="px-3 py-2 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Run
          </button>
        </div>
      </div>
    </div>
  );
}
