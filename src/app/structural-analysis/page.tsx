"use client";
import { useState } from "react";
import { GeometryTab, LoadsTab, MaterialsTab, AnalysisTab } from "./GeometryLoadsTabs";
import { ResultsTab, FoundationTab, ReportsTab } from "./ResultsTabs";
import {
  solveFrame2D,
  type StructuralNode,
  type BeamElement,
  type SectionProfile,
  type StructuralMaterial,
  type LoadCase,
  type AnalysisResult,
} from "@/lib/structural-engine";

// ---- Default model ----
const DEFAULT_NODES: StructuralNode[] = [
  { id: "N1", x: 0,    y: 0,    z: 0, restraints: [true,  true,  false, false, false, true]  },
  { id: "N2", x: 0,    y: 4000, z: 0, restraints: [false, false, false, false, false, false] },
  { id: "N3", x: 5000, y: 4000, z: 0, restraints: [false, false, false, false, false, false] },
  { id: "N4", x: 5000, y: 0,    z: 0, restraints: [true,  true,  false, false, false, true]  },
];

const DEFAULT_SECTIONS: SectionProfile[] = [{
  id: "S1", name: "ISMB 200", type: "I",
  area: 3233, Ixx: 2235e4, Iyy: 150e4, J: 15e4,
  Zxx: 223500, Zyy: 20000, ry: 21.5, rz: 8.5,
  depth: 200, width: 100, tw: 5.7, tf: 10.8,
}];

const DEFAULT_MATERIALS: StructuralMaterial[] = [{
  id: "M1", name: "Fe 415 Steel",
  E: 200000, G: 77000, fy: 250, fu: 410,
  density: 7850, poisson: 0.3, alpha: 12e-6,
}];

const DEFAULT_ELEMENTS: BeamElement[] = [
  { id: "B1", nodeI: "N1", nodeJ: "N2", sectionId: "S1", materialId: "M1", type: "beam" },
  { id: "B2", nodeI: "N2", nodeJ: "N3", sectionId: "S1", materialId: "M1", type: "beam" },
  { id: "B3", nodeI: "N3", nodeJ: "N4", sectionId: "S1", materialId: "M1", type: "beam" },
];

const DEFAULT_LC: LoadCase = {
  id: "LC1", name: "Dead Load", type: "dead",
  memberLoads: [{ elementId: "B2", type: "udl", direction: "GY", values: [-10] }],
  nodalLoads: [],
};

const DEFAULT_COMBO_NAME = "1.5 DL";
const DEFAULT_COMBO_FACTOR = 1.5;

type TabId = "geometry" | "loads" | "materials" | "analysis" | "results" | "foundation" | "reports";

const TABS: { id: TabId; label: string }[] = [
  { id: "geometry",   label: "Geometry"   },
  { id: "loads",      label: "Loads"      },
  { id: "materials",  label: "Materials"  },
  { id: "analysis",   label: "Analysis"   },
  { id: "results",    label: "Results"    },
  { id: "foundation", label: "Foundation" },
  { id: "reports",    label: "Reports"    },
];

export default function StructuralAnalysisPage() {
  const [activeTab, setActiveTab]   = useState<TabId>("geometry");
  const [nodes,     setNodes]       = useState<StructuralNode[]>(DEFAULT_NODES);
  const [elements,  setElements]    = useState<BeamElement[]>(DEFAULT_ELEMENTS);
  const [sections]                  = useState<SectionProfile[]>(DEFAULT_SECTIONS);
  const [materials]                 = useState<StructuralMaterial[]>(DEFAULT_MATERIALS);
  const [loadCase,  setLoadCase]    = useState<LoadCase>(DEFAULT_LC);
  const [comboName, setComboName]   = useState(DEFAULT_COMBO_NAME);
  const [comboFactor, setComboFactor] = useState(DEFAULT_COMBO_FACTOR);
  const [result,    setResult]      = useState<AnalysisResult | null>(null);
  const [running,   setRunning]     = useState(false);
  const [log,       setLog]         = useState<string[]>([]);

  const runAnalysis = () => {
    setRunning(true);
    setLog([]);
    try {
      const logs: string[] = [];
      logs.push(`[INFO] Model: ${nodes.length} nodes, ${elements.length} members`);
      logs.push(`[INFO] Running Linear Static — combination: ${comboName} (factor ${comboFactor})`);
      // Scale loads by combination factor
      const scaledLC: LoadCase = {
        ...loadCase,
        memberLoads: loadCase.memberLoads.map((l) => ({ ...l, values: l.values.map((v) => v * comboFactor) })),
        nodalLoads: loadCase.nodalLoads.map((n) => ({ ...n, fx: n.fx * comboFactor, fy: n.fy * comboFactor, fz: n.fz * comboFactor, mx: n.mx * comboFactor, my: n.my * comboFactor, mz: n.mz * comboFactor })),
      };
      const res = solveFrame2D(nodes, elements, sections, materials, scaledLC);
      logs.push(`[OK] Analysis complete`);
      const pass = res.designChecks.filter((c) => c.status === "PASS").length;
      logs.push(`[SUMMARY] ${pass} PASS, ${res.designChecks.length - pass} FAIL`);
      setResult(res);
      setLog(logs);
      setActiveTab("results");
    } catch (e) {
      setLog([`[ERROR] ${e instanceof Error ? e.message : String(e)}`]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-slate-200">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#21262d] bg-[#0d1117] shrink-0">
        <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-[9px] font-black text-white">
          SA
        </div>
        <span className="text-sm font-semibold">Structural Analysis</span>
        <span className="text-xs text-slate-500">— Direct Stiffness Method (IS 800 / IS 456)</span>
        {result && (
          <span className="ml-auto text-xs text-green-400 bg-green-400/10 border border-green-400/30 px-2 py-0.5 rounded">
            Analysis Complete
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[#21262d] bg-[#0d1117] shrink-0 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === t.id
                ? "border-cyan-500 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto flex flex-col">
        {activeTab === "geometry" && (
          <GeometryTab nodes={nodes} setNodes={setNodes} elements={elements} setElements={setElements} />
        )}
        {activeTab === "loads" && (
          <LoadsTab loadCase={loadCase} setLoadCase={setLoadCase} />
        )}
        {activeTab === "materials" && (
          <MaterialsTab sections={sections} materials={materials} />
        )}
        {activeTab === "analysis" && (
          <AnalysisTab
            comboName={comboName} setComboName={setComboName}
            comboFactor={comboFactor} setComboFactor={setComboFactor}
            onRun={runAnalysis} running={running} log={log}
          />
        )}
        {activeTab === "results"    && <ResultsTab result={result} />}
        {activeTab === "foundation" && <FoundationTab />}
        {activeTab === "reports"    && <ReportsTab result={result} />}
      </div>
    </div>
  );
}
