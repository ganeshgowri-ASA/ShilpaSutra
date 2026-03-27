"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
  Layers,
  AlertTriangle,
  Scissors,
  Footprints,
  Ruler,
  MessageSquare,
  Clock,
  ChevronDown,
} from "lucide-react";

import ModelTreePanel from "@/components/visualization/ModelTreePanel";
import PropertiesPanel from "@/components/visualization/PropertiesPanel";
import VisualizationToolbar from "@/components/visualization/VisualizationToolbar";
import SectionCutsPanel from "@/components/visualization/SectionCutsPanel";
import WalkthroughPanel from "@/components/visualization/WalkthroughPanel";
import ClashDetectionPanel from "@/components/visualization/ClashDetectionPanel";
import MeasurementPanel from "@/components/visualization/MeasurementPanel";
import AnnotationsPanel from "@/components/visualization/AnnotationsPanel";
import FederationPanel from "@/components/visualization/FederationPanel";
import TimelinePanel from "@/components/visualization/TimelinePanel";

// Dynamic import for the 3D viewport to avoid SSR issues
const VisualizationViewport = dynamic(
  () => import("@/components/visualization/VisualizationViewport"),
  { ssr: false, loading: () => <ViewportLoader /> }
);

function ViewportLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#080b10]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin mx-auto mb-2" />
        <div className="text-[11px] text-slate-500">Loading 3D Viewport...</div>
      </div>
    </div>
  );
}

type RightPanelTab = "properties" | "federation" | "clashes" | "sections" | "walkthrough" | "measurements" | "annotations";

export default function VisualizationPage() {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeRightTab, setActiveRightTab] = useState<RightPanelTab>("properties");

  const rightTabs: { id: RightPanelTab; label: string; icon: React.ReactNode }[] = [
    { id: "properties", label: "Properties", icon: <PanelRight size={12} /> },
    { id: "federation", label: "Federation", icon: <Layers size={12} /> },
    { id: "clashes", label: "Clashes", icon: <AlertTriangle size={12} /> },
    { id: "sections", label: "Sections", icon: <Scissors size={12} /> },
    { id: "walkthrough", label: "Walkthrough", icon: <Footprints size={12} /> },
    { id: "measurements", label: "Measure", icon: <Ruler size={12} /> },
    { id: "annotations", label: "Annotate", icon: <MessageSquare size={12} /> },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#0a0e14] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0d1117] border-b border-[#21262d] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-[#00D4FF] flex items-center justify-center">
            <Layers size={13} className="text-white" />
          </div>
          <span className="text-[12px] font-bold text-slate-200">
            3D Visualization
          </span>
          <span className="text-[9px] text-slate-600 bg-[#161b22] px-1.5 py-0.5 rounded">
            Navisworks-style Review
          </span>
        </div>
        <div className="flex-1" />
        <span className="text-[9px] text-slate-700">
          ShilpaSutra Visualization Module
        </span>
      </div>

      {/* Toolbar */}
      <VisualizationToolbar />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Model Tree */}
        {leftPanelOpen && (
          <div className="w-[240px] shrink-0">
            <ModelTreePanel />
          </div>
        )}

        {/* Left panel toggle */}
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className="w-5 shrink-0 flex items-center justify-center bg-[#0d1117] border-x border-[#21262d] text-slate-600 hover:text-slate-300 transition-colors"
        >
          {leftPanelOpen ? <PanelLeftClose size={12} /> : <PanelLeft size={12} />}
        </button>

        {/* Center - 3D Viewport */}
        <div className="flex-1 flex flex-col min-w-0">
          <VisualizationViewport />

          {/* Timeline (bottom overlay) */}
          <TimelinePanel />
        </div>

        {/* Right panel toggle */}
        <button
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className="w-5 shrink-0 flex items-center justify-center bg-[#0d1117] border-x border-[#21262d] text-slate-600 hover:text-slate-300 transition-colors"
        >
          {rightPanelOpen ? <PanelRightClose size={12} /> : <PanelRight size={12} />}
        </button>

        {/* Right panel */}
        {rightPanelOpen && (
          <div className="w-[280px] shrink-0 flex flex-col bg-[#0d1117] border-l border-[#21262d]">
            {/* Tab bar */}
            <div className="flex border-b border-[#21262d] overflow-x-auto thin-scrollbar">
              {rightTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveRightTab(tab.id)}
                  className={`flex items-center gap-1 px-2 py-1.5 text-[9px] font-medium whitespace-nowrap transition-colors border-b-2 ${
                    activeRightTab === tab.id
                      ? "text-[#00D4FF] border-[#00D4FF]"
                      : "text-slate-600 border-transparent hover:text-slate-400"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto thin-scrollbar">
              {activeRightTab === "properties" && <PropertiesPanel />}
              {activeRightTab === "federation" && (
                <div className="p-2">
                  <FederationPanel />
                </div>
              )}
              {activeRightTab === "clashes" && (
                <div className="p-2">
                  <ClashDetectionPanel />
                </div>
              )}
              {activeRightTab === "sections" && (
                <div className="p-2">
                  <SectionCutsPanel />
                </div>
              )}
              {activeRightTab === "walkthrough" && (
                <div className="p-2">
                  <WalkthroughPanel />
                </div>
              )}
              {activeRightTab === "measurements" && (
                <div className="p-2">
                  <MeasurementPanel />
                </div>
              )}
              {activeRightTab === "annotations" && (
                <div className="p-2">
                  <AnnotationsPanel />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
