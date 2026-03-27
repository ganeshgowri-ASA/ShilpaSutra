"use client";
import { useState } from "react";
import { designIsolatedFooting } from "@/lib/foundation-engine";
import type { AnalysisResult, DesignCheck } from "@/lib/structural-engine";
import type { FootingInput, SoilProfile } from "@/lib/foundation-engine";

// ---- Results Tab ----
export function ResultsTab({ result }: { result: AnalysisResult | null }) {
  const [view, setView] = useState<"displacements" | "reactions" | "members" | "checks">("displacements");

  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        Run analysis first to see results.
      </div>
    );
  }

  const statusColor = (r: number) =>
    r < 0.7 ? "text-green-400" : r < 1.0 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="flex flex-col gap-4 p-4 overflow-auto flex-1">
      <div className="flex gap-2">
        {(["displacements", "reactions", "members", "checks"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1 rounded text-xs capitalize border transition-colors ${
              view === v
                ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                : "border-[#30363d] text-slate-400 hover:border-slate-500"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "displacements" && (
        <table className="w-full text-xs text-slate-300 border-collapse">
          <thead>
            <tr className="text-slate-500 border-b border-[#21262d]">
              <th className="text-left py-1 pr-3">Node</th>
              <th className="text-right pr-3">dx (mm)</th>
              <th className="text-right pr-3">dy (mm)</th>
              <th className="text-right pr-3">dz (mm)</th>
              <th className="text-right">rz (rad)</th>
            </tr>
          </thead>
          <tbody>
            {result.nodalDisplacements.map((d) => (
              <tr key={d.nodeId} className="border-b border-[#21262d]/50">
                <td className="py-1 pr-3 text-cyan-400">{d.nodeId}</td>
                <td className="text-right pr-3">{d.dx.toFixed(3)}</td>
                <td className="text-right pr-3">{d.dy.toFixed(3)}</td>
                <td className="text-right pr-3">{d.dz.toFixed(3)}</td>
                <td className="text-right">{d.rz.toFixed(5)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === "reactions" && (
        <table className="w-full text-xs text-slate-300 border-collapse">
          <thead>
            <tr className="text-slate-500 border-b border-[#21262d]">
              <th className="text-left py-1 pr-3">Node</th>
              <th className="text-right pr-3">Fx (kN)</th>
              <th className="text-right pr-3">Fy (kN)</th>
              <th className="text-right">Mz (kNm)</th>
            </tr>
          </thead>
          <tbody>
            {result.reactions.map((r) => (
              <tr key={r.nodeId} className="border-b border-[#21262d]/50">
                <td className="py-1 pr-3 text-cyan-400">{r.nodeId}</td>
                <td className="text-right pr-3">{r.fx.toFixed(2)}</td>
                <td className="text-right pr-3">{r.fy.toFixed(2)}</td>
                <td className="text-right">{r.mz.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === "members" && (
        <table className="w-full text-xs text-slate-300 border-collapse">
          <thead>
            <tr className="text-slate-500 border-b border-[#21262d]">
              <th className="text-left py-1 pr-3">Member</th>
              <th className="text-right pr-3">Max Axial (kN)</th>
              <th className="text-right pr-3">Max Shear (kN)</th>
              <th className="text-right">Max Moment (kNm)</th>
            </tr>
          </thead>
          <tbody>
            {result.memberResults.map((m) => (
              <tr key={m.elementId} className="border-b border-[#21262d]/50">
                <td className="py-1 pr-3 text-cyan-400">{m.elementId}</td>
                <td className="text-right pr-3">{Math.max(...m.axialForce.map(Math.abs)).toFixed(2)}</td>
                <td className="text-right pr-3">{Math.max(...m.shearY.map(Math.abs)).toFixed(2)}</td>
                <td className="text-right">{Math.max(...m.momentZ.map(Math.abs)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === "checks" && (
        <div className="flex flex-col gap-2">
          {result.designChecks.map((c: DesignCheck) => (
            <div key={c.elementId} className="bg-[#161b22] border border-[#21262d] rounded p-3 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-cyan-400 font-medium">{c.elementId}</span>
                <span className={`font-bold ${c.status === "PASS" ? "text-green-400" : "text-red-400"}`}>
                  {c.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-slate-400">
                <span>Axial: <span className={statusColor(c.axialRatio)}>{c.axialRatio.toFixed(3)}</span></span>
                <span>Bending: <span className={statusColor(c.bendingRatio)}>{c.bendingRatio.toFixed(3)}</span></span>
                <span>Shear: <span className={statusColor(c.shearRatio)}>{c.shearRatio.toFixed(3)}</span></span>
                <span>Combined: <span className={statusColor(c.combinedRatio)}>{c.combinedRatio.toFixed(3)}</span></span>
                <span>Deflection: <span className={statusColor(c.deflectionRatio)}>{c.deflectionRatio.toFixed(3)}</span></span>
                <span className="text-slate-600 col-span-1">{c.governingClause}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Foundation Tab ----
const defaultSoil: SoilProfile = {
  type: "sand", cohesion: 0, frictionAngle: 30, unitWeight: 18,
  waterTableDepth: 3, allowableBearing: 150, sptN: 20, subgradeModulus: 15000,
};

export function FoundationTab() {
  const [axial, setAxial] = useState("500");
  const [mx, setMx] = useState("20");
  const [mz, setMz] = useState("10");
  const [depth, setDepth] = useState("1.5");
  const [fck, setFck] = useState("25");
  const [fy, setFy] = useState("500");
  const [bearing, setBearing] = useState("150");
  const [result, setResult] = useState<ReturnType<typeof designIsolatedFooting> | null>(null);

  const run = () => {
    const soil: SoilProfile = { ...defaultSoil, allowableBearing: parseFloat(bearing) };
    const input: FootingInput = {
      axialLoad: parseFloat(axial), momentX: parseFloat(mx), momentZ: parseFloat(mz),
      columnWidth: 300, columnDepth: 300, depth: parseFloat(depth),
      concreteGrade: parseFloat(fck), steelGrade: parseFloat(fy),
      soil, coverMm: 50,
    };
    setResult(designIsolatedFooting(input));
  };

  const field = (label: string, val: string, set: (v: string) => void, unit: string) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-400">{label} ({unit})</label>
      <input
        type="number" value={val} onChange={(e) => set(e.target.value)}
        className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-slate-200 focus:border-cyan-500 outline-none"
      />
    </div>
  );

  return (
    <div className="flex gap-4 p-4 overflow-auto flex-1">
      <div className="w-64 flex flex-col gap-3 shrink-0">
        <p className="text-xs text-slate-500 uppercase tracking-wider">Column Loads</p>
        {field("Axial Load", axial, setAxial, "kN")}
        {field("Moment X", mx, setMx, "kNm")}
        {field("Moment Z", mz, setMz, "kNm")}
        <p className="text-xs text-slate-500 uppercase tracking-wider mt-2">Design Params</p>
        {field("Foundation Depth", depth, setDepth, "m")}
        {field("Concrete Grade fck", fck, setFck, "MPa")}
        {field("Steel Grade fy", fy, setFy, "MPa")}
        {field("Allowable Bearing", bearing, setBearing, "kN/m²")}
        <button
          onClick={run}
          className="mt-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold py-2 rounded transition-colors"
        >
          Design Footing
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {result ? (
          <div className="flex flex-col gap-3 text-xs">
            <div className={`p-3 rounded border font-bold text-center ${result.status === "SAFE" ? "border-green-500 text-green-400 bg-green-500/10" : "border-red-500 text-red-400 bg-red-500/10"}`}>
              {result.status}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Size", `${result.lengthM.toFixed(2)} × ${result.widthM.toFixed(2)} m`],
                ["Depth", `${result.depthMm} mm`],
                ["Max Soil Pressure", `${result.soilPressureMax.toFixed(1)} kN/m²`],
                ["Punching Ratio", result.punchingShearRatio.toFixed(3)],
                ["Shear Ratio", result.oneWayShearRatio.toFixed(3)],
                ["Flexure Ratio", result.flexureRatio.toFixed(3)],
                ["Rebar X", `T${result.rebarX.dia}@${result.rebarX.spacing}mm`],
                ["Rebar Z", `T${result.rebarZ.dia}@${result.rebarZ.spacing}mm`],
                ["Concrete", `${result.concreteVolume.toFixed(2)} m³`],
                ["Steel", `${result.steelWeight.toFixed(1)} kg`],
              ].map(([k, v]) => (
                <div key={k} className="bg-[#161b22] border border-[#21262d] rounded p-2">
                  <p className="text-slate-500">{k}</p>
                  <p className="text-slate-200 font-medium">{v}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#161b22] border border-[#21262d] rounded p-3">
              <p className="text-slate-500 mb-2">Design Steps</p>
              {result.designSteps.map((s, i) => (
                <p key={i} className="text-slate-400 mb-1">{s}</p>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            Enter loads and click Design Footing
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Reports Tab ----
export function ReportsTab({ result }: { result: AnalysisResult | null }) {
  const generate = () => {
    if (!result) return;
    const lines = [
      "STRUCTURAL ANALYSIS REPORT",
      "==========================",
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "NODAL DISPLACEMENTS",
      ...result.nodalDisplacements.map(
        (d) => `  ${d.nodeId}: dx=${d.dx.toFixed(3)}mm  dy=${d.dy.toFixed(3)}mm  rz=${d.rz.toFixed(5)}rad`
      ),
      "",
      "SUPPORT REACTIONS",
      ...result.reactions.map(
        (r) => `  ${r.nodeId}: Fx=${r.fx.toFixed(2)}kN  Fy=${r.fy.toFixed(2)}kN  Mz=${r.mz.toFixed(2)}kNm`
      ),
      "",
      "DESIGN CHECKS SUMMARY",
      ...result.designChecks.map(
        (c) => `  ${c.elementId}: ${c.status}  Axial=${c.axialRatio.toFixed(3)}  Bending=${c.bendingRatio.toFixed(3)}  Shear=${c.shearRatio.toFixed(3)}`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "structural_report.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 p-4 overflow-auto flex-1">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Analysis Report</h3>
        <button
          onClick={generate}
          disabled={!result}
          className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black text-xs font-semibold px-4 py-1.5 rounded transition-colors"
        >
          Export TXT
        </button>
      </div>
      {result ? (
        <div className="flex flex-col gap-2 text-xs text-slate-400 font-mono bg-[#0d1117] border border-[#21262d] rounded p-4 overflow-auto">
          <p className="text-slate-200 font-bold">STRUCTURAL ANALYSIS REPORT</p>
          <p className="text-slate-500">Generated: {new Date().toLocaleString()}</p>
          <p className="text-slate-500 mt-2">Nodes: {result.nodalDisplacements.length}  |  Members: {result.memberResults.length}  |  Checks: {result.designChecks.length}</p>
          <p className="mt-2 text-slate-300">DESIGN SUMMARY</p>
          {result.designChecks.map((c) => (
            <p key={c.elementId} className={c.status === "PASS" ? "text-green-400" : "text-red-400"}>
              [{c.status}] {c.elementId} — Axial: {c.axialRatio.toFixed(3)} / Bending: {c.bendingRatio.toFixed(3)} / Shear: {c.shearRatio.toFixed(3)} / Combined: {c.combinedRatio.toFixed(3)}
            </p>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center flex-1 text-slate-500 text-sm">
          Run analysis to generate report.
        </div>
      )}
    </div>
  );
}
