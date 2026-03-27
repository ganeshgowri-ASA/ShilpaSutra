"use client";
import React, { Component, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

const VisualizationViewport = dynamic(
  () =>
    import("@react-three/fiber").then((mod) => {
      const { Canvas } = mod;
      return function VisualizationCanvas(props: {
        showClash: boolean;
        showWireframe: boolean;
        showBoundingBoxes: boolean;
      }) {
        return (
          <Canvas camera={{ position: [6, 4, 6], fov: 50 }} style={{ background: "#0a0a0f" }}>
            <VisualizationScene {...props} />
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

function VisualizationScene({
  showClash,
  showWireframe,
  showBoundingBoxes,
}: {
  showClash: boolean;
  showWireframe: boolean;
  showBoundingBoxes: boolean;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { OrbitControls, Grid, Box, Sphere } = require("@react-three/drei");

  // Two overlapping boxes to demonstrate clash detection
  const clashColor = showClash ? "#ef4444" : "#3b82f6";

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <pointLight position={[-4, 4, -4]} intensity={0.6} color="#60a5fa" />
      <OrbitControls makeDefault />
      <Grid args={[20, 20]} cellColor="#1e293b" sectionColor="#334155" fadeDistance={25} />

      {/* Primary body */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 1, 1.5]} />
        <meshStandardMaterial
          color="#3b82f6"
          wireframe={showWireframe}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Secondary body — partially overlapping (clash zone) */}
      <mesh position={[1.2, 0.5, 0]}>
        <boxGeometry args={[1.5, 0.8, 1.2]} />
        <meshStandardMaterial
          color={clashColor}
          wireframe={showWireframe}
          transparent
          opacity={0.75}
        />
      </mesh>

      {/* Third body — no clash */}
      <mesh position={[-2.5, 0.6, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial
          color="#10b981"
          wireframe={showWireframe}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Bounding boxes */}
      {showBoundingBoxes && (
        <>
          <Box args={[2.05, 1.05, 1.55]} position={[0, 0.5, 0]}>
            <meshBasicMaterial color="#facc15" wireframe />
          </Box>
          <Box args={[1.55, 0.85, 1.25]} position={[1.2, 0.5, 0]}>
            <meshBasicMaterial color="#facc15" wireframe />
          </Box>
          <Sphere args={[0.82, 16, 16]} position={[-2.5, 0.6, 0]}>
            <meshBasicMaterial color="#facc15" wireframe />
          </Sphere>
        </>
      )}
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

const CLASH_PAIRS = [
  { a: "Body_1", b: "Body_2", volume: 0.34, severity: "Hard" },
];

const COMPONENTS = [
  { id: "body_1", name: "Body_1", visible: true, color: "#3b82f6", status: "ok" },
  { id: "body_2", name: "Body_2", visible: true, color: "#ef4444", status: "clash" },
  { id: "body_3", name: "Sphere_1", visible: true, color: "#10b981", status: "ok" },
];

export default function VisualizationPage() {
  const [showClash, setShowClash] = useState(true);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(false);
  const [activeTab, setActiveTab] = useState<"components" | "clash" | "display">("components");

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#21262d] bg-[#161b22]">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
          3D Visualization &amp; Clash Detection
        </span>
        {showClash && CLASH_PAIRS.length > 0 && (
          <span className="px-2 py-0.5 text-[10px] bg-red-900/50 text-red-400 rounded-full border border-red-800">
            {CLASH_PAIRS.length} clash{CLASH_PAIRS.length !== 1 ? "es" : ""} detected
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 3D Viewport */}
        <div className="flex-1 flex flex-col">
          <ViewportErrorBoundary>
            <VisualizationViewport
              showClash={showClash}
              showWireframe={showWireframe}
              showBoundingBoxes={showBoundingBoxes}
            />
          </ViewportErrorBoundary>
        </div>

        {/* Side Panel */}
        <div className="w-64 flex flex-col border-l border-[#21262d] bg-[#161b22] overflow-y-auto">
          {/* Tabs */}
          <div className="flex border-b border-[#21262d]">
            {(["components", "clash", "display"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                  activeTab === tab
                    ? "text-blue-400 border-b-2 border-blue-400 bg-[#0d1117]"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 p-3 space-y-2">
            {activeTab === "components" && (
              <>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Scene Objects</p>
                {COMPONENTS.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#0d1117] border border-[#21262d]"
                  >
                    <span
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ background: c.color }}
                    />
                    <span className="text-[11px] flex-1 truncate">{c.name}</span>
                    {c.status === "clash" && (
                      <span className="text-[9px] text-red-400 border border-red-800 px-1 rounded">
                        CLASH
                      </span>
                    )}
                  </div>
                ))}
              </>
            )}

            {activeTab === "clash" && (
              <>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Clash Report</p>
                {CLASH_PAIRS.length === 0 ? (
                  <p className="text-[11px] text-emerald-400">No clashes detected</p>
                ) : (
                  CLASH_PAIRS.map((cp, i) => (
                    <div key={i} className="p-2 rounded bg-red-950/30 border border-red-900/50">
                      <p className="text-[11px] font-medium text-red-400">
                        {cp.a} ↔ {cp.b}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Type: {cp.severity} &nbsp;|&nbsp; Volume: {cp.volume.toFixed(2)} mm³
                      </p>
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === "display" && (
              <>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Display Options</p>
                {[
                  { label: "Highlight Clashes", value: showClash, set: setShowClash },
                  { label: "Wireframe Mode", value: showWireframe, set: setShowWireframe },
                  { label: "Bounding Boxes", value: showBoundingBoxes, set: setShowBoundingBoxes },
                ].map(({ label, value, set }) => (
                  <label key={label} className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-[11px] text-slate-300">{label}</span>
                    <button
                      onClick={() => set((v) => !v)}
                      className={`w-8 h-4 rounded-full transition-colors ${
                        value ? "bg-blue-600" : "bg-[#21262d]"
                      }`}
                    >
                      <span
                        className={`block w-3 h-3 rounded-full bg-white shadow transition-transform ${
                          value ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </label>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
