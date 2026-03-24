"use client";
import { useState, useCallback } from "react";
import { useCadStore } from "@/stores/cad-store";

type CubeFace = "front" | "back" | "left" | "right" | "top" | "bottom";
type CubeEdge = "front-top" | "front-bottom" | "front-left" | "front-right" |
  "back-top" | "back-bottom" | "back-left" | "back-right" |
  "top-left" | "top-right" | "bottom-left" | "bottom-right";
type CubeCorner = "front-top-left" | "front-top-right" | "front-bottom-left" | "front-bottom-right" |
  "back-top-left" | "back-top-right" | "back-bottom-left" | "back-bottom-right";

/**
 * SolidWorks-style navigation cube for 3D viewport orientation.
 * Click faces, edges, or corners to snap to standard views.
 * Shows current orientation with highlighted face.
 */
export default function NavigationCube() {
  const setCameraView = useCadStore((s) => s.setCameraView);
  const [hoveredFace, setHoveredFace] = useState<string | null>(null);

  const handleFaceClick = useCallback((face: CubeFace) => {
    setCameraView(face);
  }, [setCameraView]);

  const handleCornerClick = useCallback((_corner: CubeCorner) => {
    setCameraView("iso");
  }, [setCameraView]);

  const handleEdgeClick = useCallback((edge: CubeEdge) => {
    // Map edges to closest standard views
    const edgeMap: Record<string, string> = {
      "front-top": "front", "front-bottom": "front",
      "front-left": "front", "front-right": "front",
      "back-top": "back", "back-bottom": "back",
      "top-left": "top", "top-right": "top",
      "bottom-left": "bottom", "bottom-right": "bottom",
    };
    setCameraView(edgeMap[edge] || "iso");
  }, [setCameraView]);

  const faceStyle = (face: string) => ({
    fill: hoveredFace === face ? "rgba(0, 212, 255, 0.25)" : "rgba(22, 27, 34, 0.85)",
    stroke: hoveredFace === face ? "#00D4FF" : "#30363d",
    strokeWidth: hoveredFace === face ? 1.5 : 0.8,
    cursor: "pointer" as const,
  });

  const labelStyle = {
    fill: "#8b949e",
    fontSize: 7,
    fontFamily: "system-ui, sans-serif",
    fontWeight: 600,
    textAnchor: "middle" as const,
    dominantBaseline: "central" as const,
    pointerEvents: "none" as const,
  };

  return (
    <div className="absolute top-3 right-3 z-[6] pointer-events-auto select-none" title="Navigation Cube - Click to change view">
      <svg width={80} height={80} viewBox="0 0 100 100">
        {/* Isometric cube - 3 visible faces */}
        {/* Top face */}
        <polygon
          points="50,10 85,28 50,46 15,28"
          {...faceStyle("top")}
          onMouseEnter={() => setHoveredFace("top")}
          onMouseLeave={() => setHoveredFace(null)}
          onClick={() => handleFaceClick("top")}
        />
        <text x={50} y={28} {...labelStyle}>TOP</text>

        {/* Left face */}
        <polygon
          points="15,28 50,46 50,82 15,64"
          {...faceStyle("left")}
          onMouseEnter={() => setHoveredFace("left")}
          onMouseLeave={() => setHoveredFace(null)}
          onClick={() => handleFaceClick("left")}
        />
        <text x={32} y={55} {...labelStyle}>LEFT</text>

        {/* Right face (front in iso view) */}
        <polygon
          points="50,46 85,28 85,64 50,82"
          {...faceStyle("front")}
          onMouseEnter={() => setHoveredFace("front")}
          onMouseLeave={() => setHoveredFace(null)}
          onClick={() => handleFaceClick("front")}
        />
        <text x={68} y={55} {...labelStyle}>FRONT</text>

        {/* Edge highlights on hover */}
        {/* Top-front edge */}
        <line x1={50} y1={46} x2={85} y2={28}
          stroke="transparent" strokeWidth={6} cursor="pointer"
          onMouseEnter={() => setHoveredFace("edge-tf")}
          onMouseLeave={() => setHoveredFace(null)}
          onClick={() => handleEdgeClick("front-top")}
        />
        {/* Top-left edge */}
        <line x1={15} y1={28} x2={50} y2={46}
          stroke="transparent" strokeWidth={6} cursor="pointer"
          onMouseEnter={() => setHoveredFace("edge-tl")}
          onMouseLeave={() => setHoveredFace(null)}
          onClick={() => handleEdgeClick("top-left")}
        />

        {/* Corner dots for iso clicks */}
        {[
          { cx: 50, cy: 10, corner: "back-top-left" as CubeCorner },
          { cx: 85, cy: 28, corner: "front-top-right" as CubeCorner },
          { cx: 15, cy: 28, corner: "back-top-right" as CubeCorner },
          { cx: 50, cy: 46, corner: "front-top-left" as CubeCorner },
          { cx: 50, cy: 82, corner: "front-bottom-left" as CubeCorner },
          { cx: 85, cy: 64, corner: "front-bottom-right" as CubeCorner },
          { cx: 15, cy: 64, corner: "back-bottom-right" as CubeCorner },
        ].map((c) => (
          <circle
            key={c.corner}
            cx={c.cx} cy={c.cy} r={3}
            fill={hoveredFace === c.corner ? "#00D4FF" : "transparent"}
            stroke={hoveredFace === c.corner ? "#00D4FF" : "transparent"}
            cursor="pointer"
            onMouseEnter={() => setHoveredFace(c.corner)}
            onMouseLeave={() => setHoveredFace(null)}
            onClick={() => handleCornerClick(c.corner)}
          />
        ))}

        {/* Axis labels */}
        <text x={92} y={48} fill="#ef4444" fontSize={8} fontWeight={700} fontFamily="monospace">X</text>
        <text x={5} y={48} fill="#22c55e" fontSize={8} fontWeight={700} fontFamily="monospace">Y</text>
        <text x={50} y={6} fill="#3b82f6" fontSize={8} fontWeight={700} fontFamily="monospace" textAnchor="middle">Z</text>
      </svg>

      {/* Quick view buttons below cube */}
      <div className="flex items-center justify-center gap-0.5 mt-0.5">
        {(["front", "top", "right", "iso"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setCameraView(v)}
            className="text-[7px] px-1.5 py-0.5 rounded text-slate-500 hover:text-[#00D4FF] hover:bg-[#00D4FF]/10 transition-all font-medium uppercase"
          >
            {v === "iso" ? "3D" : v.charAt(0)}
          </button>
        ))}
      </div>
    </div>
  );
}
