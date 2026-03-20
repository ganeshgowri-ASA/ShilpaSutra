"use client";
import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";

const CFDAdvancedViewport = dynamic(
  () =>
    import("@react-three/fiber").then((mod) => {
      const { Canvas } = mod;
      return function CFDCanvas(props: { showStreamlines: boolean; showParticles: boolean }) {
        return (
          <Canvas camera={{ position: [5, 3, 5], fov: 50 }} style={{ background: "#0a0a0f" }}>
            <CFDScene showStreamlines={props.showStreamlines} showParticles={props.showParticles} />
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

function CFDScene({ showStreamlines, showParticles }: { showStreamlines: boolean; showParticles: boolean }) {
  const { useFrame } = require("@react-three/fiber");
  const { OrbitControls, Grid, Line } = require("@react-three/drei");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const particlesRef = useRef<any>(null);
  const timeRef = useRef(0);

  // Generate streamline paths
  const streamlines = Array.from({ length: 8 }, (_, i) => {
    const yOff = (i - 3.5) * 0.4;
    return Array.from({ length: 20 }, (_, j) => {
      const x = -3 + j * 0.35;
      const y = yOff + Math.sin(x * 1.5 + i) * 0.3;
      const z = Math.cos(x * 0.8 + i * 0.5) * 0.2;
      return [x, y, z] as [number, number, number];
    });
  });

  useFrame((_state: unknown, delta: number) => {
    if (!particlesRef.current) return;
    timeRef.current += delta;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    particlesRef.current.children.forEach((child: any) => {
      const mesh = child;
      mesh.position.x += delta * 1.5;
      if (mesh.position.x > 4) {
        mesh.position.x = -3;
        mesh.position.y = (Math.random() - 0.5) * 3;
        mesh.position.z = (Math.random() - 0.5) * 2;
      }
    });
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.7} />
      <pointLight position={[-3, 2, -3]} intensity={0.3} color="#00D4FF" />
      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#1a1a2e"
        sectionSize={2}
        sectionColor="#252540"
        fadeDistance={15}
        position={[0, -2, 0]}
      />
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color="#334455" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Streamlines */}
      {showStreamlines &&
        streamlines.map((pts, i) => (
          <Line key={i} points={pts} color="#00D4FF" lineWidth={1.5} transparent opacity={0.5} />
        ))}
      {/* Particles */}
      {showParticles && (
        <group ref={particlesRef}>
          {Array.from({ length: 60 }, (_, i) => (
            <mesh
              key={i}
              position={[
                -3 + Math.random() * 7,
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 2,
              ]}
            >
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshBasicMaterial color="#00D4FF" />
            </mesh>
          ))}
        </group>
      )}
      <OrbitControls enableDamping dampingFactor={0.05} />
    </>
  );
}

/* ── Types ── */
type TurbulenceModel = "laminar" | "k-epsilon" | "k-omega-sst" | "spalart-allmaras";

interface BoundaryCondition {
  id: string;
  name: string;
  type: "inlet" | "outlet" | "wall" | "symmetry";
  velocity?: number;
  pressure?: number;
  temperature?: number;
}

interface ResidualPoint {
  iteration: number;
  continuity: number;
  momentum: number;
  energy: number;
}

interface ProbeResult {
  x: number;
  y: number;
  z: number;
  velocity: number;
  pressure: number;
  temperature: number;
}

type SidePanel = "turbulence" | "boundary" | "probes";

/* ── Data ── */
const defaultBCs: BoundaryCondition[] = [
  { id: "bc1", name: "Inlet", type: "inlet", velocity: 5.0, temperature: 300 },
  { id: "bc2", name: "Outlet", type: "outlet", pressure: 0 },
  { id: "bc3", name: "Top Wall", type: "wall", temperature: 350 },
  { id: "bc4", name: "Bottom Wall", type: "wall", temperature: 300 },
  { id: "bc5", name: "Side Symmetry", type: "symmetry" },
];

const residualData: ResidualPoint[] = Array.from({ length: 30 }, (_, i) => ({
  iteration: i + 1,
  continuity: Math.exp(-0.12 * i) + Math.random() * 0.015,
  momentum: 0.8 * Math.exp(-0.1 * i) + Math.random() * 0.01,
  energy: 0.6 * Math.exp(-0.08 * i) + Math.random() * 0.012,
}));

const turbulenceModels: { id: TurbulenceModel; label: string; desc: string }[] = [
  { id: "laminar", label: "Laminar", desc: "No turbulence model, low Re flows" },
  { id: "k-epsilon", label: "k-epsilon", desc: "Standard two-equation RANS model" },
  { id: "k-omega-sst", label: "k-omega SST", desc: "Menter SST model for separated flows" },
  { id: "spalart-allmaras", label: "Spalart-Allmaras", desc: "One-equation model for external aero" },
];

export default function CFDAdvancedPage() {
  const [turbModel, setTurbModel] = useState<TurbulenceModel>("k-omega-sst");
  const [boundaries, setBoundaries] = useState<BoundaryCondition[]>(defaultBCs);
  const [showStreamlines, setShowStreamlines] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const [sidePanel, setSidePanel] = useState<SidePanel>("turbulence");
  const [probes, setProbes] = useState<ProbeResult[]>([]);

  const addProbe = useCallback(() => {
    const newProbe: ProbeResult = {
      x: Math.round((Math.random() * 6 - 3) * 100) / 100,
      y: Math.round((Math.random() * 4 - 2) * 100) / 100,
      z: Math.round((Math.random() * 2 - 1) * 100) / 100,
      velocity: Math.round((Math.random() * 5 + 0.5) * 100) / 100,
      pressure: Math.round((101325 + Math.random() * 2000 - 1000) * 10) / 10,
      temperature: Math.round((295 + Math.random() * 60) * 10) / 10,
    };
    setProbes((prev) => [...prev, newProbe]);
  }, []);

  const updateBC = useCallback((id: string, field: string, value: number) => {
    setBoundaries((prev) =>
      prev.map((bc) => (bc.id === id ? { ...bc, [field]: value } : bc))
    );
  }, []);

  const maxResidual = Math.max(
    ...residualData.map((r) => Math.max(r.continuity, r.momentum, r.energy))
  );

  const panels: { id: SidePanel; label: string }[] = [
    { id: "turbulence", label: "Turbulence" },
    { id: "boundary", label: "Boundaries" },
    { id: "probes", label: "Probes" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="h-12 border-b border-[#1a1a2e] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[#00D4FF] font-bold text-sm">CFD</span>
          <span className="text-slate-400 text-xs">Advanced Computational Fluid Dynamics</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStreamlines(!showStreamlines)}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              showStreamlines
                ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                : "text-slate-500 border border-[#252540]"
            }`}
          >
            Streamlines
          </button>
          <button
            onClick={() => setShowParticles(!showParticles)}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              showParticles
                ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                : "text-slate-500 border border-[#252540]"
            }`}
          >
            Particles
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* 3D Viewport */}
        <div className="flex-1 relative flex flex-col">
          <div className="flex-1">
            <CFDAdvancedViewport showStreamlines={showStreamlines} showParticles={showParticles} />
          </div>
          {/* Residual Chart */}
          <div className="h-[200px] border-t border-[#1a1a2e] bg-[#0d0d14] p-3 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                Residual Convergence
              </span>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#00D4FF]" /> Continuity
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#ff6b6b]" /> Momentum
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#4ecdc4]" /> Energy
                </span>
              </div>
            </div>
            <svg viewBox="0 0 600 120" className="w-full h-[130px]">
              {/* Grid */}
              {[0, 0.5, 1].map((r) => (
                <line key={r} x1={40} y1={10 + r * 100} x2={590} y2={10 + r * 100} stroke="#1a1a2e" strokeWidth={1} />
              ))}
              {/* Continuity */}
              <polyline
                points={residualData
                  .map((p) => {
                    const x = 40 + ((p.iteration - 1) / 29) * 550;
                    const y = 110 - (p.continuity / maxResidual) * 100;
                    return `${x},${y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="#00D4FF"
                strokeWidth={1.5}
              />
              {/* Momentum */}
              <polyline
                points={residualData
                  .map((p) => {
                    const x = 40 + ((p.iteration - 1) / 29) * 550;
                    const y = 110 - (p.momentum / maxResidual) * 100;
                    return `${x},${y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="#ff6b6b"
                strokeWidth={1.5}
              />
              {/* Energy */}
              <polyline
                points={residualData
                  .map((p) => {
                    const x = 40 + ((p.iteration - 1) / 29) * 550;
                    const y = 110 - (p.energy / maxResidual) * 100;
                    return `${x},${y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="#4ecdc4"
                strokeWidth={1.5}
              />
            </svg>
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-[320px] border-l border-[#1a1a2e] bg-[#0d0d14] flex flex-col shrink-0">
          {/* Panel tabs */}
          <div className="flex border-b border-[#1a1a2e]">
            {panels.map((p) => (
              <button
                key={p.id}
                onClick={() => setSidePanel(p.id)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  sidePanel === p.id
                    ? "text-[#00D4FF] border-b-2 border-[#00D4FF] bg-[#00D4FF]/5"
                    : "text-slate-500 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {sidePanel === "turbulence" && (
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Turbulence Model
                </h4>
                <div className="space-y-2">
                  {turbulenceModels.map((tm) => (
                    <button
                      key={tm.id}
                      onClick={() => setTurbModel(tm.id)}
                      className={`w-full text-left p-3 rounded border transition-colors ${
                        turbModel === tm.id
                          ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-white"
                          : "border-[#1a1a2e] bg-[#0a0a0f] text-slate-400 hover:border-[#252540]"
                      }`}
                    >
                      <div className="text-xs font-medium">{tm.label}</div>
                      <div className="text-[10px] mt-0.5 opacity-60">{tm.desc}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-[#0a0a0f] rounded border border-[#1a1a2e]">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Active Model</div>
                  <div className="text-[#00D4FF] text-sm font-bold">
                    {turbulenceModels.find((t) => t.id === turbModel)?.label}
                  </div>
                </div>
              </div>
            )}

            {sidePanel === "boundary" && (
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Boundary Conditions
                </h4>
                <div className="space-y-3">
                  {boundaries.map((bc) => (
                    <div key={bc.id} className="p-3 bg-[#0a0a0f] rounded border border-[#1a1a2e]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-white">{bc.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                            bc.type === "inlet"
                              ? "bg-green-500/15 text-green-400"
                              : bc.type === "outlet"
                              ? "bg-red-500/15 text-red-400"
                              : bc.type === "wall"
                              ? "bg-yellow-500/15 text-yellow-400"
                              : "bg-blue-500/15 text-blue-400"
                          }`}
                        >
                          {bc.type}
                        </span>
                      </div>
                      {bc.velocity !== undefined && (
                        <div className="flex items-center gap-2 text-[11px] mt-1">
                          <span className="text-slate-500 w-16">Velocity</span>
                          <input
                            type="number"
                            value={bc.velocity}
                            onChange={(e) => updateBC(bc.id, "velocity", Number(e.target.value))}
                            className="flex-1 bg-[#0d0d14] border border-[#252540] rounded px-2 py-1 text-white text-xs outline-none focus:border-[#00D4FF]"
                          />
                          <span className="text-slate-600">m/s</span>
                        </div>
                      )}
                      {bc.pressure !== undefined && (
                        <div className="flex items-center gap-2 text-[11px] mt-1">
                          <span className="text-slate-500 w-16">Pressure</span>
                          <input
                            type="number"
                            value={bc.pressure}
                            onChange={(e) => updateBC(bc.id, "pressure", Number(e.target.value))}
                            className="flex-1 bg-[#0d0d14] border border-[#252540] rounded px-2 py-1 text-white text-xs outline-none focus:border-[#00D4FF]"
                          />
                          <span className="text-slate-600">Pa</span>
                        </div>
                      )}
                      {bc.temperature !== undefined && (
                        <div className="flex items-center gap-2 text-[11px] mt-1">
                          <span className="text-slate-500 w-16">Temp</span>
                          <input
                            type="number"
                            value={bc.temperature}
                            onChange={(e) => updateBC(bc.id, "temperature", Number(e.target.value))}
                            className="flex-1 bg-[#0d0d14] border border-[#252540] rounded px-2 py-1 text-white text-xs outline-none focus:border-[#00D4FF]"
                          />
                          <span className="text-slate-600">K</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sidePanel === "probes" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Probe Tool
                  </h4>
                  <button
                    onClick={addProbe}
                    className="px-2.5 py-1 bg-[#00D4FF]/15 text-[#00D4FF] text-[10px] rounded hover:bg-[#00D4FF]/25 transition-colors border border-[#00D4FF]/30"
                  >
                    + Add Probe
                  </button>
                </div>
                {probes.length === 0 && (
                  <div className="text-xs text-slate-500 text-center py-8">
                    No probes placed. Click &quot;Add Probe&quot; to sample field values.
                  </div>
                )}
                <div className="space-y-2">
                  {probes.map((probe, i) => (
                    <div key={i} className="p-3 bg-[#0a0a0f] rounded border border-[#1a1a2e]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-[#00D4FF]">Probe {i + 1}</span>
                        <button
                          onClick={() => setProbes((prev) => prev.filter((_, j) => j !== i))}
                          className="text-[10px] text-slate-500 hover:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500 mb-1">
                        ({probe.x}, {probe.y}, {probe.z})
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[10px]">
                        <div>
                          <span className="text-slate-500">V:</span>
                          <span className="text-white ml-1">{probe.velocity} m/s</span>
                        </div>
                        <div>
                          <span className="text-slate-500">P:</span>
                          <span className="text-white ml-1">{(probe.pressure / 1000).toFixed(1)} kPa</span>
                        </div>
                        <div>
                          <span className="text-slate-500">T:</span>
                          <span className="text-white ml-1">{probe.temperature} K</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
