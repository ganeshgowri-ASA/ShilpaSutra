"use client";

import React, { useState, useCallback } from "react";
import {
  Grid3X3,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Box,
  Layers,
  Scissors,
  RotateCw,
  Square,
  LayoutGrid,
} from "lucide-react";

type LayoutMode = "single" | "quad" | "triple-h" | "triple-v";
type ViewStyle = "wireframe" | "shaded" | "shaded-edges" | "xray";

interface ViewportInfo {
  id: string;
  label: string;
  plane: string;
}

const VIEWPORTS: ViewportInfo[] = [
  { id: "top", label: "Top", plane: "XY" },
  { id: "front", label: "Front", plane: "XZ" },
  { id: "right", label: "Right", plane: "YZ" },
  { id: "perspective", label: "Perspective", plane: "3D" },
];

interface MultiViewportProps {
  children: React.ReactNode;
  onViewStyleChange?: (style: string) => void;
  onLayoutChange?: (layout: string) => void;
}

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ active, onClick, title, children }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        flex items-center justify-center w-8 h-8 rounded-md transition-all duration-150
        ${
          active
            ? "bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/50"
            : "text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] border border-transparent"
        }
      `}
    >
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="w-px h-5 bg-[#21262d] mx-1" />;
}

export default function MultiViewport({
  children,
  onViewStyleChange,
  onLayoutChange,
}: MultiViewportProps) {
  const [layout, setLayout] = useState<LayoutMode>("single");
  const [activeViewport, setActiveViewport] = useState<string>("perspective");
  const [maximizedViewport, setMaximizedViewport] = useState<string | null>(null);
  const [viewStyle, setViewStyle] = useState<ViewStyle>("shaded-edges");
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [isPerspective, setIsPerspective] = useState(true);
  const [showSectionPlane, setShowSectionPlane] = useState(false);

  const handleLayoutChange = useCallback(
    (newLayout: LayoutMode) => {
      setLayout(newLayout);
      setMaximizedViewport(null);
      onLayoutChange?.(newLayout);
    },
    [onLayoutChange]
  );

  const handleViewStyleChange = useCallback(
    (style: ViewStyle) => {
      setViewStyle(style);
      onViewStyleChange?.(style);
    },
    [onViewStyleChange]
  );

  const handleViewportClick = useCallback((id: string) => {
    setActiveViewport(id);
  }, []);

  const handleViewportDoubleClick = useCallback(
    (id: string) => {
      if (maximizedViewport) {
        setMaximizedViewport(null);
      } else {
        setMaximizedViewport(id);
        setActiveViewport(id);
      }
    },
    [maximizedViewport]
  );

  const renderViewportPanel = (viewport: ViewportInfo) => {
    const isActive = activeViewport === viewport.id;

    return (
      <div
        key={viewport.id}
        onClick={() => handleViewportClick(viewport.id)}
        onDoubleClick={() => handleViewportDoubleClick(viewport.id)}
        className={`
          relative overflow-hidden bg-[#0d1117] transition-all duration-150 cursor-pointer
          border-2
          ${isActive ? "border-[#00D4FF]" : "border-[#21262d] hover:border-[#30363d]"}
        `}
      >
        {/* Viewport label */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
          <span
            className={`
              px-2 py-0.5 text-[11px] font-medium rounded
              ${
                isActive
                  ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                  : "bg-[#161b22] text-[#8b949e] border border-[#21262d]"
              }
            `}
          >
            {viewport.label}
          </span>
          <span className="text-[10px] text-[#484f58] font-mono">{viewport.plane}</span>
        </div>

        {/* Maximize/minimize hint */}
        <div className="absolute top-2 right-2 z-10 opacity-0 hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewportDoubleClick(viewport.id);
            }}
            className="p-1 rounded bg-[#161b22]/80 text-[#8b949e] hover:text-[#c9d1d9] border border-[#21262d]"
            title={maximizedViewport ? "Restore layout" : "Maximize viewport"}
          >
            {maximizedViewport ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>

        {/* Grid overlay hint */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
            <div
              className="w-full h-full"
              style={{
                backgroundImage:
                  "linear-gradient(#8b949e 1px, transparent 1px), linear-gradient(90deg, #8b949e 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>
        )}

        {/* Axes indicator */}
        {showAxes && (
          <div className="absolute bottom-3 left-3 z-10">
            <svg width="36" height="36" viewBox="0 0 36 36">
              <line x1="18" y1="18" x2="34" y2="18" stroke="#ef4444" strokeWidth="1.5" />
              <line x1="18" y1="18" x2="18" y2="2" stroke="#22c55e" strokeWidth="1.5" />
              <line x1="18" y1="18" x2="8" y2="28" stroke="#3b82f6" strokeWidth="1.5" />
              <text x="34" y="16" fill="#ef4444" fontSize="7" fontWeight="bold">
                X
              </text>
              <text x="20" y="6" fill="#22c55e" fontSize="7" fontWeight="bold">
                Y
              </text>
              <text x="3" y="32" fill="#3b82f6" fontSize="7" fontWeight="bold">
                Z
              </text>
            </svg>
          </div>
        )}

        {/* Projection label */}
        <div className="absolute bottom-2 right-2 z-10">
          <span className="text-[9px] text-[#484f58] font-mono uppercase tracking-wider">
            {viewport.id === "perspective" ? (isPerspective ? "persp" : "ortho") : "ortho"}
          </span>
        </div>

        {/* Content slot */}
        <div className="w-full h-full flex items-center justify-center">
          {viewport.id === "perspective" ? (
            children
          ) : (
            <div className="text-[#30363d] text-xs font-mono select-none">
              {viewport.label} View
            </div>
          )}
        </div>
      </div>
    );
  };

  const visibleViewports =
    maximizedViewport
      ? VIEWPORTS.filter((v) => v.id === maximizedViewport)
      : VIEWPORTS;

  const renderLayout = () => {
    if (layout === "single" || maximizedViewport) {
      const vp = maximizedViewport
        ? VIEWPORTS.find((v) => v.id === maximizedViewport)!
        : VIEWPORTS.find((v) => v.id === activeViewport) || VIEWPORTS[3];
      return <div className="w-full h-full">{renderViewportPanel(vp)}</div>;
    }

    if (layout === "quad") {
      return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-px bg-[#21262d]">
          {VIEWPORTS.map((vp) => renderViewportPanel(vp))}
        </div>
      );
    }

    if (layout === "triple-h") {
      return (
        <div className="w-full h-full grid grid-rows-2 gap-px bg-[#21262d]">
          <div className="w-full">{renderViewportPanel(VIEWPORTS[3])}</div>
          <div className="w-full grid grid-cols-3 gap-px">
            {VIEWPORTS.slice(0, 3).map((vp) => renderViewportPanel(vp))}
          </div>
        </div>
      );
    }

    if (layout === "triple-v") {
      return (
        <div className="w-full h-full grid grid-cols-2 gap-px bg-[#21262d]">
          <div className="h-full">{renderViewportPanel(VIEWPORTS[3])}</div>
          <div className="h-full grid grid-rows-3 gap-px">
            {VIEWPORTS.slice(0, 3).map((vp) => renderViewportPanel(vp))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#0d1117] select-none">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-[#161b22] border-b border-[#21262d]">
        {/* Layout buttons */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            active={layout === "single"}
            onClick={() => handleLayoutChange("single")}
            title="Single viewport"
          >
            <Square size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={layout === "quad"}
            onClick={() => handleLayoutChange("quad")}
            title="Quad view (2x2)"
          >
            <LayoutGrid size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={layout === "triple-h"}
            onClick={() => handleLayoutChange("triple-h")}
            title="Triple horizontal"
          >
            <Grid3X3 size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={layout === "triple-v"}
            onClick={() => handleLayoutChange("triple-v")}
            title="Triple vertical"
          >
            <Layers size={14} />
          </ToolbarButton>
        </div>

        <ToolbarSeparator />

        {/* View style buttons */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            active={viewStyle === "wireframe"}
            onClick={() => handleViewStyleChange("wireframe")}
            title="Wireframe"
          >
            <Box size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={viewStyle === "shaded"}
            onClick={() => handleViewStyleChange("shaded")}
            title="Shaded"
          >
            <div className="w-3.5 h-3.5 rounded-sm bg-current opacity-60" />
          </ToolbarButton>
          <ToolbarButton
            active={viewStyle === "shaded-edges"}
            onClick={() => handleViewStyleChange("shaded-edges")}
            title="Shaded + Edges"
          >
            <div className="w-3.5 h-3.5 rounded-sm border border-current opacity-60 bg-current/30" />
          </ToolbarButton>
          <ToolbarButton
            active={viewStyle === "xray"}
            onClick={() => handleViewStyleChange("xray")}
            title="X-Ray / Transparent"
          >
            <Eye size={14} />
          </ToolbarButton>
        </div>

        <ToolbarSeparator />

        {/* Toggle buttons */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            active={showGrid}
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle grid"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="1" y="1" width="12" height="12" />
              <line x1="1" y1="7" x2="13" y2="7" />
              <line x1="7" y1="1" x2="7" y2="13" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            active={showAxes}
            onClick={() => setShowAxes(!showAxes)}
            title="Toggle origin axes"
          >
            <RotateCw size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={!isPerspective}
            onClick={() => setIsPerspective(!isPerspective)}
            title={isPerspective ? "Switch to Orthographic" : "Switch to Perspective"}
          >
            <span className="text-[10px] font-bold leading-none">
              {isPerspective ? "P" : "O"}
            </span>
          </ToolbarButton>
          <ToolbarButton
            active={showSectionPlane}
            onClick={() => setShowSectionPlane(!showSectionPlane)}
            title="Toggle section plane"
          >
            <Scissors size={14} />
          </ToolbarButton>
        </div>

        <ToolbarSeparator />

        {/* Active viewport indicator */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-[#484f58] font-mono uppercase tracking-wider">
            {viewStyle.replace("-", "+")}
          </span>
          <span className="text-[10px] text-[#484f58]">|</span>
          <span className="text-[10px] text-[#00D4FF] font-mono uppercase tracking-wider">
            {VIEWPORTS.find((v) => v.id === activeViewport)?.label ?? "Perspective"}
          </span>
          {maximizedViewport && (
            <button
              onClick={() => setMaximizedViewport(null)}
              className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-[#8b949e] hover:text-[#c9d1d9] bg-[#21262d] rounded border border-[#30363d] transition-colors"
              title="Restore layout"
            >
              <Minimize2 size={10} />
              Restore
            </button>
          )}
        </div>
      </div>

      {/* Viewport area */}
      <div className="flex-1 overflow-hidden">{renderLayout()}</div>
    </div>
  );
}
