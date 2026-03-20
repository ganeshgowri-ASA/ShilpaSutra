"use client";
import { usePathname } from "next/navigation";
import { AboutButton } from "./AboutDialog";
import { Keyboard } from "lucide-react";

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

export default function StatusBar() {
  const pathname = usePathname();
  const helpText = contextHelp[pathname] || "ShilpaSutra - AI CAD & CFD Platform";

  return (
    <div className="h-6 bg-[#161b22] border-t border-[#21262d] flex items-center px-3 gap-3 shrink-0 z-40">
      <span className="text-[10px] text-slate-500 flex-1 truncate">{helpText}</span>

      <div className="flex items-center gap-2">
        <span className="text-[9px] text-slate-600 font-mono flex items-center gap-1">
          <Keyboard size={9} />
          Press ? for shortcuts
        </span>
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
