"use client";
import { usePathname } from "next/navigation";
import { AboutButton } from "./AboutDialog";
import { Keyboard, Grid3X3, MousePointer2 } from "lucide-react";
import { useCadStore } from "@/stores/cad-store";

const contextHelp: Record<string, string> = {
  "/": "Dashboard - View projects, activity, and quick actions",
  "/designer": "CAD Designer - Create and edit 3D models with sketch tools and operations",
  "/simulator": "FEA Simulator - Run structural analysis with mesh generation and stress visualization",
  "/cfd": "CFD Analysis - Thermal and fluid flow simulation with contour visualization",
  "/cfd-advanced": "Advanced CFD - Turbulence models, streamlines, and probe points",
  "/assembly": "Assembly - Build multi-part assemblies with mates and BOM",
  "/assembly-advanced": "Advanced Assembly - Constraints, interference detection, and section views",
  "/renderer": "Photo Renderer - PBR materials, HDR environments, and turntable animation",
  "/drawings": "2D Drawings - Engineering drawings with dimensions, GD&T, and export",
  "/reports": "Reports - Auto-generated engineering reports with analysis results",
  "/reports-advanced": "Advanced Reports - Custom templates, charts, and batch export",
  "/library": "Parts Library - Browse and import 248+ parametric components",
  "/text-to-cad": "Text to CAD - Describe a part in natural language to generate a 3D model",
  "/import-export": "Import/Export - STEP, STL, OBJ, glTF file management",
  "/fea-advanced": "Advanced FEA - Modal analysis, thermal simulation, and fatigue studies",
  "/settings": "Settings - Preferences, themes, AI configuration, and account",
};

function DesignerStatusInfo() {
  const activeTool = useCadStore((s) => s.activeTool);
  const snapGrid = useCadStore((s) => s.snapGrid);
  const objects = useCadStore((s) => s.objects);
  const selectedIds = useCadStore((s) => s.selectedIds);
  const selectedId = useCadStore((s) => s.selectedId);
  const cursorPosition = useCadStore((s) => s.cursorPosition);

  const selCount = selectedIds.length > 0 ? selectedIds.length : selectedId ? 1 : 0;
  const toolLabel = activeTool
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const fmt = (n: number) => n.toFixed(2);

  return (
    <>
      {/* Active tool */}
      <div className="flex items-center gap-1 px-2 border-r border-[#21262d]">
        <MousePointer2 size={9} className="text-slate-500" />
        <span className="text-[9px] text-[#4a9eff] font-mono font-semibold">{toolLabel}</span>
      </div>

      {/* Cursor XYZ */}
      <div className="flex items-center gap-1 px-2 border-r border-[#21262d]">
        <span className="text-[9px] text-slate-500 font-mono">
          {cursorPosition
            ? `X ${fmt(cursorPosition[0])}  Y ${fmt(cursorPosition[1])}  Z ${fmt(cursorPosition[2])}`
            : "X —  Y —  Z —"}
        </span>
      </div>

      {/* Grid snap */}
      <div className="flex items-center gap-1 px-2 border-r border-[#21262d]">
        <Grid3X3 size={9} className={snapGrid ? "text-green-400" : "text-slate-600"} />
        <span className={`text-[9px] font-mono ${snapGrid ? "text-green-400" : "text-slate-600"}`}>
          Snap {snapGrid ? "ON" : "OFF"}
        </span>
      </div>

      {/* Object / selection count */}
      <div className="flex items-center gap-1 px-2 border-r border-[#21262d]">
        <span className="text-[9px] text-slate-500 font-mono">
          {objects.length} obj{objects.length !== 1 ? "s" : ""}
        </span>
        {selCount > 0 && (
          <span className="text-[9px] text-[#4a9eff] font-mono ml-1">
            ({selCount} sel)
          </span>
        )}
      </div>
    </>
  );
}

export default function StatusBar() {
  const pathname = usePathname();
  const helpText = contextHelp[pathname] || "ShilpaSutra - AI CAD & CFD Platform";
  const isDesigner = pathname === "/designer";

  return (
    <div className="h-6 bg-[#161b22] border-t border-[#21262d] flex items-center px-3 gap-0 shrink-0 z-40">
      {isDesigner ? (
        <DesignerStatusInfo />
      ) : (
        <span className="text-[10px] text-slate-500 flex-1 truncate px-0">{helpText}</span>
      )}

      <div className="flex items-center gap-2 ml-auto">
        {!isDesigner && (
          <span className="text-[9px] text-slate-600 font-mono flex items-center gap-1">
            <Keyboard size={9} />
            Press ? for shortcuts
          </span>
        )}
        {isDesigner && (
          <span className="text-[9px] text-slate-600 font-mono flex items-center gap-1">
            <Keyboard size={9} />
            Ctrl+Z Undo · Ctrl+D Dup · Del Remove · F Fit
          </span>
        )}
        <div className="w-px h-3 bg-[#21262d]" />
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[9px] text-slate-500">Online</span>
        </span>
        <div className="w-px h-3 bg-[#21262d]" />
        <span className="text-[9px] text-slate-600 font-mono">v2.0</span>
        <AboutButton />
      </div>
    </div>
  );
}
