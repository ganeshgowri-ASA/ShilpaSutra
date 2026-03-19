import { NextRequest, NextResponse } from "next/server";

interface GenerateRequest {
  prompt: string;
}

interface GeneratedObject {
  type: "box" | "cylinder" | "sphere" | "cone";
  name: string;
  dimensions: { width: number; height: number; depth: number };
  description: string;
}

// Built-in parametric generators
function generateFromPrompt(prompt: string): GeneratedObject {
  const lower = prompt.toLowerCase();

  if (lower.includes("gear") || lower.includes("spur")) {
    const teeth = parseInt(lower.match(/(\d+)\s*teeth/)?.[1] || "20");
    const radius = (teeth * 2) / (2 * Math.PI);
    return {
      type: "cylinder",
      name: `Spur Gear ${teeth}T`,
      dimensions: { width: Math.max(0.8, radius / 10), height: 0.5, depth: Math.max(0.8, radius / 10) },
      description: `Spur gear with ${teeth} teeth, module ~2mm, face width 10mm.`,
    };
  }

  if (lower.includes("bracket") || lower.includes("mount")) {
    const thickness = parseFloat(lower.match(/(\d+)\s*mm\s*thick/)?.[1] || "3") / 10;
    return {
      type: "box",
      name: "L-Bracket",
      dimensions: { width: 2, height: 2, depth: Math.max(0.3, thickness) },
      description: "L-bracket with mounting surface. Add fillets and holes as needed.",
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
      description: `M${size}x${length} hex bolt. Head: ${(size * 0.65).toFixed(1)}mm, AF: ${(size * 1.7).toFixed(1)}mm.`,
    };
  }

  if (lower.includes("flange") || lower.includes("pipe")) {
    const dnMatch = lower.match(/dn(\d+)/i);
    const dn = dnMatch ? parseInt(dnMatch[1]) : 50;
    return {
      type: "cylinder",
      name: `Pipe Flange DN${dn}`,
      dimensions: { width: dn / 20, height: 0.4, depth: dn / 20 },
      description: `DN${dn} pipe flange. OD: ${(dn * 1.5).toFixed(0)}mm, bore: ${dn}mm.`,
    };
  }

  if (lower.includes("heat") || lower.includes("sink") || lower.includes("fin")) {
    const fins = parseInt(lower.match(/(\d+)\s*fin/)?.[1] || "8");
    return {
      type: "box",
      name: `Heatsink ${fins}-fin`,
      dimensions: { width: 2, height: 1.5, depth: 2 },
      description: `Heatsink with ${fins} fins, base 50x50x3mm, fin height 25mm.`,
    };
  }

  if (lower.includes("box") || lower.includes("cube") || lower.includes("block")) {
    const sizeMatch = lower.match(/(\d+)\s*(?:mm|cm)/);
    const size = sizeMatch ? parseInt(sizeMatch[1]) / 10 : 2;
    return {
      type: "box",
      name: "Box",
      dimensions: { width: size, height: size, depth: size },
      description: `${size * 10}mm cube.`,
    };
  }

  if (lower.includes("sphere") || lower.includes("ball")) {
    const sizeMatch = lower.match(/(\d+)\s*(?:mm|cm|radius)/);
    const size = sizeMatch ? parseInt(sizeMatch[1]) / 10 : 1.5;
    return {
      type: "sphere",
      name: "Sphere",
      dimensions: { width: size, height: size, depth: size },
      description: `Sphere, radius ${size * 10}mm.`,
    };
  }

  if (lower.includes("cylinder") || lower.includes("tube") || lower.includes("rod") || lower.includes("shaft")) {
    const diaMatch = lower.match(/(\d+)\s*mm/);
    const dia = diaMatch ? parseInt(diaMatch[1]) / 20 : 1;
    return {
      type: "cylinder",
      name: "Cylinder",
      dimensions: { width: dia, height: dia * 2, depth: dia },
      description: `Cylinder, radius ${dia * 10}mm, height ${dia * 20}mm.`,
    };
  }

  if (lower.includes("cone") || lower.includes("taper")) {
    return {
      type: "cone",
      name: "Cone",
      dimensions: { width: 1, height: 2, depth: 1 },
      description: "Cone, base radius 10mm, height 20mm.",
    };
  }

  if (lower.includes("plate") || lower.includes("panel") || lower.includes("sheet")) {
    return {
      type: "box",
      name: "Plate",
      dimensions: { width: 3, height: 0.2, depth: 3 },
      description: "Flat plate 30x30x2mm.",
    };
  }

  if (lower.includes("bearing") || lower.includes("housing")) {
    const bore = parseInt(lower.match(/(\d+)\s*(?:mm|bore)/)?.[1] || "25");
    return {
      type: "cylinder",
      name: `Bearing Housing ${bore}mm`,
      dimensions: { width: bore / 10, height: bore / 15, depth: bore / 10 },
      description: `Bearing housing for ${bore}mm bore.`,
    };
  }

  // Default
  return {
    type: "box",
    name: "Generated Part",
    dimensions: { width: 2, height: 2, depth: 2 },
    description: "Generated a basic part. Modify dimensions in the properties panel.",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { prompt } = body;

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Check for OpenRouter API key
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (apiKey) {
      // Try calling OpenRouter API for AI-powered generation
      try {
        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://shilpasutra.vercel.app",
            "X-Title": "ShilpaSutra CAD",
          },
          body: JSON.stringify({
            model: "anthropic/claude-sonnet-4",
            messages: [
              {
                role: "system",
                content: `You are a CAD geometry generator. Given a user's description of a 3D part, respond with ONLY a JSON object (no markdown) containing:
{
  "type": "box" | "cylinder" | "sphere" | "cone",
  "name": "descriptive name",
  "dimensions": { "width": number, "height": number, "depth": number },
  "description": "brief description of what was generated"
}
Dimensions should be in reasonable scale (1-5 units). For cylinders, width=radius. Choose the closest primitive type.`,
              },
              { role: "user", content: prompt },
            ],
            max_tokens: 300,
            temperature: 0.3,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            try {
              const parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```/g, "").trim());
              if (parsed.type && parsed.name && parsed.dimensions) {
                return NextResponse.json({
                  success: true,
                  object: parsed,
                  message: `AI generated: "${parsed.name}". ${parsed.description || ""}`,
                  source: "ai",
                });
              }
            } catch {
              // JSON parse failed, fall through to parametric
            }
          }
        }
      } catch {
        // API call failed, fall through to parametric
      }
    }

    // Fallback: use built-in parametric generators
    const object = generateFromPrompt(prompt);

    return NextResponse.json({
      success: true,
      object,
      message: `Generated "${object.name}". ${object.description}`,
      source: "parametric",
      fallback: !apiKey,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate", details: String(error) },
      { status: 500 }
    );
  }
}
