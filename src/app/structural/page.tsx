"use client";
import React, { Component, useState } from "react";
import dynamic from "next/dynamic";

const StructuralViewport = dynamic(
  () =>
    import("@react-three/fiber").then((mod) => {
      const { Canvas } = mod;
      return function StructuralCanvas(props: {
        analysisType: string;
        showDeformed: boolean;
        scaleFactor: number;
      }) {
        return (
          <Canvas camera={{ position: [5, 3, 5], fov: 50 }} style={{ background: "#0a0a0f" }}>
            <StructuralScene {...props} />
          </Canvas>
        );
      };
    }),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0f] text-slate-500">
        Loading 3D viewport...
      </div>
    ),
  }
);

function StructuralScene({
  analysisType,
  showDeformed,
  scaleFactor,
}: {
  analysisType: string;
  showDeformed: boolean;
  scaleFactor: number;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { OrbitControls, Grid } = require("@react-three/drei");
  const THREE = require("three");

  // Stress colour map: blue (low) → red (high)
  const stressColors = [
    "#1d4ed8", "#2563eb", "#3b82f6", "#06b6d4",
    "#10b981", "#84cc16", "#facc15", "#f97316",
    "#ef4444", "#dc2626",
  ];

  const beamSegments = Array.from({ length: 10 }, (_, i) => {
    const x = -2 + i * 0.4;
    const stressIdx = Math.min(9, Math.floor((i / 9) * 10));
    const deformY = showDeformed ? Math.sin((i / 9) * Math.PI) * 0.3 * scaleFactor : 0;
    return { x, deformY, color: stressColors[stressIdx] };
  });

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
      <pointLight position={[-3, 5, 3]} intensity={0.5} color="#a78bfa" />
      <OrbitControls makeDefault />
      <Grid args={[20, 20]} cellColor="#1e293b" sectionColor="#334155" fadeDistance={25} />

      {/* Support pins */}
      <mesh position={[-2, -0.15, 0]}>
        <coneGeometry args={[0.12, 0.25, 6]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[2, -0.15, 0]}>
        <coneGeometry args={[0.12, 0.25, 6]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>

      {/* Beam segments coloured by stress */}
      {beamSegments.map((seg, i) => (
        <mesh key={i} position={[seg.x + 0.2, seg.deformY + 0.2, 0]}>
          <boxGeometry args={[0.42, 0.2, 0.3]} />
          <meshStandardMaterial color={seg.color} />
        </mesh>
      ))}

      {/* Applied load arrow (point load at mid-span) */}
      <mesh position={[0, 0.8, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.07, 0.35, 8]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
    </>
  );
}

// Error Boundary for the 3D viewport
class ViewportErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0f] text-red-400 gap-2 p-6">
          <p className="text-lg font-semibold">3D Viewport Error</p>
          <p className="text-sm text-slate-400">{this.state.error.message}</p>
          <button
            className="mt-3 px-4 py-1.5 text-xs bg-[#1e293b] hover:bg-[#334155] text-slate-300 rounded"
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ANALYSIS_TYPES = ["Static", "Modal", "Buckling", "Fatigue"];

const RESULTS = {
  Static: { maxStress: "124.3 MPa", maxDisp: "2.14 mm", safetyFactor: "1.61", status: "pass" },
  Modal: { maxStress: "—", maxDisp: "—", safetyFactor: "—", status: "info", freq: "42.7 Hz (Mode 1)" },
  Buckling: { maxStress: "—", maxDisp: "—", safetyFactor: "3.42", status: "pass" },
  Fatigue: { maxStress: "89.1 MPa", maxDisp: "—", safetyFactor: "1.28", status: "warn" },
};

export default function StructuralPage() {
  const [analysisType, setAnalysisType] = useState("Static");
  const [showDeformed, setShowDeformed] = useState(true);
  const [scaleFactor, setScaleFactor] = useState(1);

  const result = RESULTS[analysisType as keyof typeof RESULTS];

  const statusColor =
    result.status === "pass"
      ? "text-emerald-400"
      : result.status === "warn"
      ? "text-yellow-400"
      : "text-blue-400";

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#21262d] bg-[#161b22]">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
          Structural Analysis
        </span>
        <span className={`text-[10px] font-medium ${statusColor}`}>
          {result.status === "pass" ? "PASS" : result.status === "warn" ? "WARNING" : "INFO"}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 3D Viewport */}
        <div className="flex-1 flex flex-col">
          {/* Stress legend */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#21262d] bg-[#0d1117]">
            <span className="text-[10px] text-slate-500 mr-1">Stress:</span>
            {["#1d4ed8", "#3b82f6", "#06b6d4", "#10b981", "#facc15", "#f97316", "#ef4444"].map(
              (c) => (
                <span key={c} className="w-5 h-3 rounded-sm" style={{ background: c }} />
              )
            )}
            <span className="text-[10px] text-slate-500 ml-1">Low → High</span>
          </div>

          <ViewportErrorBoundary>
            <StructuralViewport
              analysisType={analysisType}
              showDeformed={showDeformed}
              scaleFactor={scaleFactor}
            />
          </ViewportErrorBoundary>
        </div>

        {/* Side Panel */}
        <div className="w-64 flex flex-col border-l border-[#21262d] bg-[#161b22] overflow-y-auto">
          {/* Analysis type */}
          <div className="p-3 border-b border-[#21262d]">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Analysis Type</p>
            <div className="grid grid-cols-2 gap-1">
              {ANALYSIS_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setAnalysisType(t)}
                  className={`py-1 text-[10px] rounded transition-colors ${
                    analysisType === t
                      ? "bg-blue-600 text-white"
                      : "bg-[#0d1117] text-slate-400 hover:text-slate-200 border border-[#21262d]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="p-3 border-b border-[#21262d] space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Results</p>
            {[
              { label: "Max Stress", value: result.maxStress },
              { label: "Max Displacement", value: result.maxDisp },
              { label: "Safety Factor", value: result.safetyFactor },
              ...("freq" in result ? [{ label: "1st Frequency", value: result.freq }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500">{label}</span>
                <span className="text-[11px] text-slate-200 font-mono">{value}</span>
              </div>
            ))}
          </div>

          {/* Display options */}
          <div className="p-3 space-y-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Display</p>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[11px] text-slate-300">Show Deformed Shape</span>
              <button
                onClick={() => setShowDeformed((v) => !v)}
                className={`w-8 h-4 rounded-full transition-colors ${
                  showDeformed ? "bg-blue-600" : "bg-[#21262d]"
                }`}
              >
                <span
                  className={`block w-3 h-3 rounded-full bg-white shadow transition-transform ${
                    showDeformed ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[11px] text-slate-300">Deformation Scale</span>
                <span className="text-[10px] text-slate-400 font-mono">{scaleFactor}×</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={scaleFactor}
                onChange={(e) => setScaleFactor(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
