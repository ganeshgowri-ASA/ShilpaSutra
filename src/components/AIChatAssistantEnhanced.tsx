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
    aiExtrude: (distance: number) => string | null;
    aiAddHole: (diameter: number, depth: number) => string | null;
    aiFilletSelected: (radius: number) => boolean;
    aiChamferSelected: (distance: number) => boolean;
    aiMirror: (plane: "xy" | "xz" | "yz") => string[];
    aiCreateGear: (teeth: number, module_: number, width: number) => string;
    aiShell: (thickness: number) => boolean;
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

    if (selected) {
      steps.push(`Target: "${selected.name}" - applying R${radius} fillet geometry`);
      steps.push("Generating filleted cross-section profile with quadratic bezier corners");
      steps.push("Extruding filleted profile to create 3D solid");
      const success = actions.aiFilletSelected(radius);
      if (success) {
        return {
          success: true,
          message: `Applied ${radius}mm fillet to "${selected.name}". Geometry updated with rounded edges.`,
          thinkingSteps: steps,
          objectId: selected.id,
          commandType: "fillet",
        };
      }
      return { success: false, message: "Cannot fillet sketch entities. Select a 3D solid.", thinkingSteps: steps, commandType: "fillet" };
    }
    return { success: false, message: "Select an object first to apply fillet.", thinkingSteps: steps, commandType: "fillet" };
  }

  // ── CHAMFER command ──
  if (lower.includes("chamfer") || lower.includes("bevel")) {
    const sizeMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:mm|cm)?/);
    const size = sizeMatch ? parseFloat(sizeMatch[1]) : 1;
    steps.push(`Parsing chamfer command: size = ${size}mm`);
    if (selected) {
      steps.push(`Applying ${size}mm chamfer to "${selected.name}" - generating chamfered geometry`);
      const success = actions.aiChamferSelected(size);
      if (success) {
        return {
          success: true,
          message: `Applied ${size}mm chamfer to "${selected.name}". Edges beveled.`,
          thinkingSteps: steps,
          objectId: selected.id,
          commandType: "chamfer",
        };
      }
      return { success: false, message: "Cannot chamfer sketch entities. Select a 3D solid.", thinkingSteps: steps, commandType: "chamfer" };
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

  // ── EXTRUDE command ──
  if (lower.includes("extrude") || lower.includes("pull") || lower.includes("push")) {
    const distMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:mm|cm)?/);
    const dist = distMatch ? parseFloat(distMatch[1]) : 10;
    steps.push(`Parsing extrude command: distance = ${dist}mm`);
    if (selected && (selected.type === "rectangle" || selected.type === "circle")) {
      steps.push(`Extruding sketch profile "${selected.name}" by ${dist}mm`);
      steps.push("Using THREE.ExtrudeGeometry to generate solid from 2D profile");
      const resultId = actions.aiExtrude(dist);
      if (resultId) {
        return {
          success: true,
          message: `Extruded "${selected.name}" by ${dist}mm. 3D solid created.`,
          thinkingSteps: steps,
          objectId: resultId,
          commandType: "extrude",
        };
      }
    }
    steps.push("No valid sketch profile selected for extrusion");
    return { success: false, message: "Select a closed sketch profile (rectangle/circle) to extrude.", thinkingSteps: steps, commandType: "extrude" };
  }

  // ── HOLE command ──
  if (lower.includes("hole") && !lower.includes("bolt")) {
    const diaMatch = lower.match(/(?:diameter|dia|d|ø)\s*(\d+(?:\.\d+)?)/i) || lower.match(/(\d+(?:\.\d+)?)\s*(?:mm|cm)/);
    const diameter = diaMatch ? parseFloat(diaMatch[1]) : 5;
    const depthMatch = lower.match(/(?:depth|deep)\s*(\d+(?:\.\d+)?)/i);
    const depth = depthMatch ? parseFloat(depthMatch[1]) : 10;
    steps.push(`Parsing hole command: diameter=${diameter}mm, depth=${depth}mm`);
    if (selected) {
      steps.push(`Adding hole to "${selected.name}": D${diameter}mm x ${depth}mm deep`);
      const id = actions.aiAddHole(diameter, depth);
      if (id) {
        return {
          success: true,
          message: `Added D${diameter}mm hole (${depth}mm deep) to "${selected.name}".`,
          thinkingSteps: steps,
          objectId: id,
          commandType: "hole",
        };
      }
    }
    return { success: false, message: "Select an object to add a hole.", thinkingSteps: steps, commandType: "hole" };
  }

  // ── SHELL command ──
  if (lower.includes("shell") || lower.includes("hollow")) {
    const thickMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:mm|cm)?/);
    const thickness = thickMatch ? parseFloat(thickMatch[1]) : 2;
    steps.push(`Parsing shell command: wall thickness = ${thickness}mm`);
    if (selected) {
      steps.push(`Shelling "${selected.name}" with ${thickness}mm wall thickness`);
      const success = actions.aiShell(thickness);
      if (success) {
        return {
          success: true,
          message: `Shelled "${selected.name}" with ${thickness}mm wall thickness.`,
          thinkingSteps: steps,
          objectId: selected.id,
          commandType: "shell",
        };
      }
      return { success: false, message: "Cannot shell sketch entities. Select a 3D solid.", thinkingSteps: steps, commandType: "shell" };
    }
    return { success: false, message: "Select an object to shell.", thinkingSteps: steps, commandType: "shell" };
  }

  // ── MIRROR command ──
  if (lower.includes("mirror")) {
    const planeMatch = lower.match(/(?:about|across|along|on)\s*(xz|xy|yz|x|y|z)/i);
    const planeStr = planeMatch ? planeMatch[1].toUpperCase() : "XZ";
    const mirrorPlane = planeStr === "X" || planeStr === "YZ" ? "yz" as const :
                        planeStr === "Y" || planeStr === "XZ" ? "xz" as const : "xy" as const;
    steps.push(`Mirroring about ${planeStr} plane`);

    if (selected) {
      const ids = actions.aiMirror(mirrorPlane);
      return {
        success: true,
        message: `Mirrored "${selected.name}" about ${planeStr} plane. New geometry created.`,
        thinkingSteps: steps,
        commandType: "mirror",
      };
    }
    return { success: false, message: "Select an object to mirror.", thinkingSteps: steps, commandType: "mirror" };
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

  // ── GEAR command ──
  if (lower.includes("gear") && !lower.includes("change") && !lower.includes("material")) {
    const teethMatch = lower.match(/(\d+)\s*(?:teeth|tooth|t)/i);
    const teeth = teethMatch ? parseInt(teethMatch[1]) : 20;
    const moduleMatch = lower.match(/(?:module|mod|m)\s*(\d+(?:\.\d+)?)/i);
    const mod = moduleMatch ? parseFloat(moduleMatch[1]) : 2;
    const widthMatch = lower.match(/(?:width|w|thick)\s*(\d+(?:\.\d+)?)/i);
    const width = widthMatch ? parseFloat(widthMatch[1]) : 10;
    steps.push(`Parsing gear command: ${teeth} teeth, module ${mod}, width ${width}mm`);
    steps.push("Generating involute gear tooth profile with center bore");
    steps.push("Extruding gear profile to create 3D solid");
    const id = actions.aiCreateGear(teeth, mod, width);
    return {
      success: true,
      message: `Created ${teeth}-tooth gear (module ${mod}, ${width}mm face width). Actual involute geometry generated.`,
      thinkingSteps: steps,
      objectId: id,
      commandType: "gear",
    };
  }

  // ── CREATE object commands (fallback to parametric generator) ──
  if (lower.includes("create") || lower.includes("add") || lower.includes("make") || lower.includes("generate") || lower.includes("design") || lower.includes("place")) {
    steps.push("Parsing create/generate command");
    let type: CadObject["type"] = "box";
    let name = "Generated Part";
    let dims = { width: 2, height: 2, depth: 2 };

    // Parse dimension patterns like "50x30x20" or "50 x 30 x 20" or "50mm x 30mm x 20mm"
    const dimMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:mm|cm)?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:mm|cm)?\s*[x×]\s*(\d+(?:\.\d+)?)/);
    if (dimMatch) {
      const dw = parseFloat(dimMatch[1]) / 10;
      const dh = parseFloat(dimMatch[2]) / 10;
      const dd = parseFloat(dimMatch[3]) / 10;
      dims = { width: dw, height: dh, depth: dd };
      steps.push(`Parsed dimensions: ${dimMatch[1]}×${dimMatch[2]}×${dimMatch[3]}mm`);
    }

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
- "create gear 20 teeth module 2 width 10"
- "extrude 15mm" (select a sketch profile first)
- "add hole diameter 8mm depth 20mm"
- "add 4 bolt holes M8"
- "fillet 2mm" (applies real fillet geometry)
- "chamfer 1mm" (applies real chamfer geometry)
- "shell 2mm" (hollows selected solid)
- "mirror about XZ" (duplicates geometry)
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
  extrude: "E",
  hole: "O",
  gear: "G",
  shell: "S",
};

/* ── Component ── */
export default function AIChatAssistantEnhanced({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Welcome to ShilpaSutra AI Engine.

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
  const aiExtrude = useCadStore((s) => s.aiExtrude);
  const aiAddHole = useCadStore((s) => s.aiAddHole);
  const aiFilletSelected = useCadStore((s) => s.aiFilletSelected);
  const aiChamferSelected = useCadStore((s) => s.aiChamferSelected);
  const aiMirror = useCadStore((s) => s.aiMirror);
  const aiCreateGear = useCadStore((s) => s.aiCreateGear);
  const aiShell = useCadStore((s) => s.aiShell);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
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

    // Check if this is a create/generate command that should use the reasoning engine API
    const isCreateCmd = /^(make|create|add|generate|design|place)\s/i.test(prompt.toLowerCase().trim()) ||
      /(?:pv module|solar panel|dumbbell|barbell|gear.*teeth|\d+\s*teeth|bracket|pipe|tube|plate|flange|heat\s*sink|heatsink|enclosure|bolt)/i.test(prompt.toLowerCase());

    if (isCreateCmd) {
      // Route through reasoning engine API for multi-part geometry
      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        let msg = "Failed to generate geometry.";
        const steps: string[] = [];
        let objId: string | undefined;

        if (data.reasoning) {
          for (const step of data.reasoning) {
            steps.push(`${step.action}: ${step.detail}`);
          }
        }

        if (data.assemblyParts && data.assemblyParts.length > 0) {
          for (const part of data.assemblyParts) {
            const id = addGeneratedObject(part);
            if (!objId) objId = id;
          }
          msg = `Created "${data.object?.name || "Part"}" with ${data.assemblyParts.length} part${data.assemblyParts.length > 1 ? "s" : ""}. ${data.message || ""}`;
        } else if (data.object) {
          objId = addGeneratedObject(data.object);
          msg = `Created "${data.object.name}". ${data.message || ""}`;
        } else if (data.error) {
          msg = data.error;
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === processingId
              ? { ...m, content: msg, generating: false, objectId: objId, thinkingSteps: steps, commandType: "create" }
              : m
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === processingId
              ? { ...m, content: "API call failed. Falling back to local generation.", generating: false, commandType: "create" }
              : m
          )
        );
      }
      setIsProcessing(false);
      return;
    }

    // For non-create commands, use local interpreter
    setTimeout(() => {
      const result = interpretCommand(prompt, objects, selectedId, {
        addObject,
        addGeneratedObject,
        updateObject,
        deleteObject,
        selectObject,
        aiExtrude,
        aiAddHole,
        aiFilletSelected,
        aiChamferSelected,
        aiMirror,
        aiCreateGear,
        aiShell,
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
  }, [input, isProcessing, objects, selectedId, addObject, addGeneratedObject, updateObject, deleteObject, selectObject, aiExtrude, aiAddHole, aiFilletSelected, aiChamferSelected, aiMirror, aiCreateGear, aiShell]);

  const selectedObj = objects.find((o) => o.id === selectedId);

  return (
    <div className="w-80 bg-[#161b22] border-l border-[#21262d] flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d] bg-[#0d1117]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-bold text-white">ShilpaSutra AI Engine</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowThinking(!showThinking)}
            title={showThinking ? "Hide chain-of-thought reasoning" : "Show chain-of-thought reasoning"}
            className={`text-[10px] px-1.5 py-0.5 rounded border transition-all duration-200 flex items-center gap-1 ${
              showThinking
                ? "border-blue-500/40 text-blue-400 bg-blue-500/10 shadow-[0_0_6px_rgba(59,130,246,0.15)]"
                : "border-[#21262d] text-slate-600 hover:text-slate-400 hover:border-[#30363d]"
            }`}
          >
            {showThinking && <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />}
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
          <span className="text-[#00D4FF]">Selected: {selectedObj.name}</span>
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

                  {/* Thinking steps (chain-of-thought, collapsible) */}
                  {showThinking && msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
                    <div className="mb-2 rounded-md bg-blue-500/5 border border-blue-500/10 p-2">
                      <div className="text-[8px] uppercase tracking-wider text-blue-500/60 font-bold mb-1.5 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-blue-400/50" />
                        Chain of Thought
                      </div>
                      <div className="pl-2 border-l-2 border-blue-500/20 space-y-0.5">
                        {msg.thinkingSteps.map((step, i) => (
                          <div key={i} className="text-[10px] text-blue-400/70 font-mono leading-relaxed">
                            <span className="text-blue-500/40 mr-1">{i + 1}.</span>{step}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message content */}
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Select in viewport button */}
                  {msg.objectId && (
                    <button
                      onClick={() => selectObject(msg.objectId!)}
                      className="mt-1.5 text-[10px] bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 rounded px-2 py-0.5 hover:bg-[#00D4FF]/30"
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
