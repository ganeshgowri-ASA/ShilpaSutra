"use client";
import { useState, useMemo, useCallback } from "react";

/* ── Types ── */
interface MemberForce {
  id: string;
  member: string;
  node_i: string;
  node_j: string;
  axial_kN: number;
  shear_y_kN: number;
  shear_z_kN: number;
  moment_y_kNm: number;
  moment_z_kNm: number;
  torsion_kNm: number;
}

interface Reaction {
  id: string;
  node: string;
  fx_kN: number;
  fy_kN: number;
  fz_kN: number;
  mx_kNm: number;
  my_kNm: number;
  mz_kNm: number;
}

interface Displacement {
  id: string;
  node: string;
  dx_mm: number;
  dy_mm: number;
  dz_mm: number;
  rx_rad: number;
  ry_rad: number;
  rz_rad: number;
}

interface CodeCheckResult {
  id: string;
  member: string;
  section: string;
  code: string;
  ratio: number;
  status: "PASS" | "FAIL" | "WARNING";
  clause: string;
  govCase: string;
}

interface SafetyFactor {
  id: string;
  member: string;
  loadCase: string;
  yieldSF: number;
  bucklingSF: number;
  combinedSF: number;
  govMode: string;
}

/* ── Sample Data Generators ── */
function generateMemberForces(): MemberForce[] {
  const members: MemberForce[] = [];
  const memberNames = [
    "BEAM-1", "BEAM-2", "BEAM-3", "COL-1", "COL-2", "COL-3", "COL-4",
    "BRC-1", "BRC-2", "RAFTER-1", "RAFTER-2", "TIE-1", "PURLIN-1", "PURLIN-2",
  ];
  for (let i = 0; i < memberNames.length; i++) {
    members.push({
      id: `mf-${i}`,
      member: memberNames[i],
      node_i: `N${i * 2 + 1}`,
      node_j: `N${i * 2 + 2}`,
      axial_kN: +(Math.random() * 200 - 100).toFixed(2),
      shear_y_kN: +(Math.random() * 80 - 40).toFixed(2),
      shear_z_kN: +(Math.random() * 60 - 30).toFixed(2),
      moment_y_kNm: +(Math.random() * 120 - 60).toFixed(2),
      moment_z_kNm: +(Math.random() * 150 - 75).toFixed(2),
      torsion_kNm: +(Math.random() * 10 - 5).toFixed(2),
    });
  }
  return members;
}

function generateReactions(): Reaction[] {
  const nodes = ["N1", "N3", "N5", "N7"];
  return nodes.map((node, i) => ({
    id: `r-${i}`,
    node,
    fx_kN: +(Math.random() * 40 - 20).toFixed(2),
    fy_kN: +(50 + Math.random() * 150).toFixed(2),
    fz_kN: +(Math.random() * 30 - 15).toFixed(2),
    mx_kNm: +(Math.random() * 20 - 10).toFixed(2),
    my_kNm: +(Math.random() * 15 - 7.5).toFixed(2),
    mz_kNm: +(Math.random() * 25 - 12.5).toFixed(2),
  }));
}

function generateDisplacements(): Displacement[] {
  const disps: Displacement[] = [];
  for (let i = 1; i <= 12; i++) {
    disps.push({
      id: `d-${i}`,
      node: `N${i}`,
      dx_mm: +(Math.random() * 4 - 2).toFixed(3),
      dy_mm: +(Math.random() * 8 - 4).toFixed(3),
      dz_mm: +(Math.random() * 3 - 1.5).toFixed(3),
      rx_rad: +(Math.random() * 0.01 - 0.005).toFixed(5),
      ry_rad: +(Math.random() * 0.008 - 0.004).toFixed(5),
      rz_rad: +(Math.random() * 0.012 - 0.006).toFixed(5),
    });
  }
  return disps;
}

function generateCodeChecks(): CodeCheckResult[] {
  const members = [
    "BEAM-1", "BEAM-2", "BEAM-3", "COL-1", "COL-2", "COL-3", "COL-4",
    "BRC-1", "BRC-2", "RAFTER-1", "RAFTER-2",
  ];
  const sections = ["ISMB 250", "ISMB 300", "ISHB 200", "ISA 100x100x10", "ISMC 200", "W12x26", "W10x33", "HEB 200", "IPE 240", "UB 254x146x37", "HEA 180"];
  const codes = ["IS 800:2007", "AISC 360-16", "EN 1993-1-1"];
  const clauses = ["Cl.8.2.1", "Cl.9.3.2", "Sec.E3", "Sec.H1", "Cl.6.3.1", "Cl.6.2.6"];
  return members.map((m, i) => {
    const ratio = +(Math.random() * 1.2).toFixed(3);
    return {
      id: `cc-${i}`,
      member: m,
      section: sections[i % sections.length],
      code: codes[i % codes.length],
      ratio,
      status: ratio > 1.0 ? "FAIL" : ratio > 0.85 ? "WARNING" : "PASS",
      clause: clauses[i % clauses.length],
      govCase: `LC${1 + Math.floor(Math.random() * 5)}`,
    };
  });
}

function generateSafetyFactors(): SafetyFactor[] {
  const members = ["BEAM-1", "BEAM-2", "COL-1", "COL-2", "COL-3", "BRC-1", "RAFTER-1", "RAFTER-2"];
  const modes = ["Yielding", "Lateral Torsional Buckling", "Local Buckling", "Flexural Buckling", "Combined Bending + Axial"];
  return members.map((m, i) => {
    const ysf = +(1.2 + Math.random() * 3).toFixed(2);
    const bsf = +(1.0 + Math.random() * 4).toFixed(2);
    return {
      id: `sf-${i}`,
      member: m,
      loadCase: `LC${1 + Math.floor(Math.random() * 4)}`,
      yieldSF: ysf,
      bucklingSF: bsf,
      combinedSF: +Math.min(ysf, bsf).toFixed(2),
      govMode: modes[i % modes.length],
    };
  });
}

/* ── PDF Export ── */
function exportReportPDF() {
  // Generate a printable HTML and trigger print dialog
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to export PDF.");
    return;
  }

  const memberForces = generateMemberForces();
  const reactions = generateReactions();
  const displacements = generateDisplacements();
  const codeChecks = generateCodeChecks();
  const safetyFactors = generateSafetyFactors();

  const html = `<!DOCTYPE html>
<html><head><title>ShilpaSutra Structural Report</title>
<style>
  body { font-family: 'Courier New', monospace; font-size: 10px; padding: 20px; color: #000; background: #fff; }
  h1 { text-align: center; font-size: 16px; border-bottom: 2px solid #000; padding-bottom: 8px; }
  h2 { font-size: 13px; margin-top: 24px; border-bottom: 1px solid #666; padding-bottom: 4px; }
  h3 { font-size: 11px; color: #333; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 9px; }
  th, td { border: 1px solid #999; padding: 3px 6px; text-align: right; }
  th { background: #ddd; font-weight: bold; text-align: center; }
  td:first-child, th:first-child { text-align: left; }
  .pass { color: green; font-weight: bold; }
  .fail { color: red; font-weight: bold; }
  .warn { color: #b45309; font-weight: bold; }
  .header-info { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 10px; }
  .header-info div { flex: 1; }
  @media print { body { margin: 0; } }
</style></head><body>
<h1>STRUCTURAL ANALYSIS REPORT</h1>
<div class="header-info">
  <div>Project: ShilpaSutra Demo<br/>Engineer: Auto-Generated<br/>Date: ${new Date().toLocaleDateString()}</div>
  <div style="text-align:right">Software: ShilpaSutra v1.0<br/>Analysis Type: Linear Static<br/>Units: kN, m, C</div>
</div>

<h2>1. MEMBER FORCES SUMMARY</h2>
<table><tr><th>Member</th><th>Node-i</th><th>Node-j</th><th>Axial (kN)</th><th>Shear-Y (kN)</th><th>Shear-Z (kN)</th><th>Moment-Y (kNm)</th><th>Moment-Z (kNm)</th><th>Torsion (kNm)</th></tr>
${memberForces.map(m => `<tr><td>${m.member}</td><td>${m.node_i}</td><td>${m.node_j}</td><td>${m.axial_kN}</td><td>${m.shear_y_kN}</td><td>${m.shear_z_kN}</td><td>${m.moment_y_kNm}</td><td>${m.moment_z_kNm}</td><td>${m.torsion_kNm}</td></tr>`).join("")}
</table>

<h2>2. REACTIONS SUMMARY</h2>
<table><tr><th>Node</th><th>Fx (kN)</th><th>Fy (kN)</th><th>Fz (kN)</th><th>Mx (kNm)</th><th>My (kNm)</th><th>Mz (kNm)</th></tr>
${reactions.map(r => `<tr><td>${r.node}</td><td>${r.fx_kN}</td><td>${r.fy_kN}</td><td>${r.fz_kN}</td><td>${r.mx_kNm}</td><td>${r.my_kNm}</td><td>${r.mz_kNm}</td></tr>`).join("")}
</table>

<h2>3. DISPLACEMENT SUMMARY</h2>
<table><tr><th>Node</th><th>dX (mm)</th><th>dY (mm)</th><th>dZ (mm)</th><th>rX (rad)</th><th>rY (rad)</th><th>rZ (rad)</th></tr>
${displacements.map(d => `<tr><td>${d.node}</td><td>${d.dx_mm}</td><td>${d.dy_mm}</td><td>${d.dz_mm}</td><td>${d.rx_rad}</td><td>${d.ry_rad}</td><td>${d.rz_rad}</td></tr>`).join("")}
</table>

<h2>4. CODE CHECK RESULTS</h2>
<table><tr><th>Member</th><th>Section</th><th>Code</th><th>Ratio</th><th>Status</th><th>Clause</th><th>Gov. Case</th></tr>
${codeChecks.map(c => `<tr><td>${c.member}</td><td>${c.section}</td><td>${c.code}</td><td>${c.ratio}</td><td class="${c.status === "PASS" ? "pass" : c.status === "FAIL" ? "fail" : "warn"}">${c.status}</td><td>${c.clause}</td><td>${c.govCase}</td></tr>`).join("")}
</table>

<h2>5. SAFETY FACTORS</h2>
<table><tr><th>Member</th><th>Load Case</th><th>Yield SF</th><th>Buckling SF</th><th>Combined SF</th><th>Governing Mode</th></tr>
${safetyFactors.map(s => `<tr><td>${s.member}</td><td>${s.loadCase}</td><td>${s.yieldSF}</td><td>${s.bucklingSF}</td><td style="font-weight:bold;color:${s.combinedSF < 1.5 ? "red" : s.combinedSF < 2.0 ? "#b45309" : "green"}">${s.combinedSF}</td><td>${s.govMode}</td></tr>`).join("")}
</table>

<div style="margin-top:24px;border-top:1px solid #666;padding-top:8px;font-size:9px;color:#666;text-align:center">
Generated by ShilpaSutra AI CAD &amp; CFD Platform | ${new Date().toISOString()}
</div>
</body></html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}

/* ── Sort helper ── */
type SortDir = "asc" | "desc";

/* ── Main Page Component ── */
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"forces" | "reactions" | "displacements" | "codecheck" | "safety">("forces");
  const [selectedCode, setSelectedCode] = useState<"IS 800:2007" | "AISC 360-16" | "EN 1993-1-1">("IS 800:2007");
  const [sortCol, setSortCol] = useState<string>("");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Generate data with useMemo so it's stable per render
  const memberForces = useMemo(() => generateMemberForces(), []);
  const reactions = useMemo(() => generateReactions(), []);
  const displacements = useMemo(() => generateDisplacements(), []);
  const codeChecks = useMemo(() => generateCodeChecks(), []);
  const safetyFactors = useMemo(() => generateSafetyFactors(), []);

  const filteredCodeChecks = useMemo(
    () => codeChecks.filter((c) => c.code === selectedCode),
    [codeChecks, selectedCode]
  );

  const handleSort = useCallback((col: string) => {
    setSortDir((prev) => (sortCol === col ? (prev === "asc" ? "desc" : "asc") : "asc"));
    setSortCol(col);
  }, [sortCol]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function sortData<T>(data: T[], col: string): T[] {
    if (!col) return data;
    return [...data].sort((a, b) => {
      const av = (a as any)[col];
      const bv = (b as any)[col];
      const cmp = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  const sortIcon = (col: string) =>
    sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const tabs = [
    { id: "forces" as const, label: "Member Forces", count: memberForces.length },
    { id: "reactions" as const, label: "Reactions", count: reactions.length },
    { id: "displacements" as const, label: "Displacements", count: displacements.length },
    { id: "codecheck" as const, label: "Code Check", count: codeChecks.length },
    { id: "safety" as const, label: "Safety Factors", count: safetyFactors.length },
  ];

  const passCount = codeChecks.filter((c) => c.status === "PASS").length;
  const failCount = codeChecks.filter((c) => c.status === "FAIL").length;
  const warnCount = codeChecks.filter((c) => c.status === "WARNING").length;
  const avgSF = safetyFactors.length > 0
    ? (safetyFactors.reduce((s, f) => s + f.combinedSF, 0) / safetyFactors.length).toFixed(2)
    : "N/A";
  const minSF = safetyFactors.length > 0
    ? Math.min(...safetyFactors.map((f) => f.combinedSF)).toFixed(2)
    : "N/A";

  const thClass = "px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white select-none";
  const tdClass = "px-3 py-1.5 text-xs text-slate-300 font-mono";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#21262d] px-4 py-2 flex items-center gap-3 shrink-0">
        <span className="text-xs font-bold text-[#e94560]">Structural Reports</span>
        <span className="text-[10px] text-slate-500">STAAD-Style Analysis Output</span>
        <div className="flex-1" />

        {/* Summary badges */}
        <div className="flex items-center gap-2 mr-4">
          <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/30 rounded px-2 py-0.5">
            Pass: {passCount}
          </span>
          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded px-2 py-0.5">
            Warn: {warnCount}
          </span>
          <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 rounded px-2 py-0.5">
            Fail: {failCount}
          </span>
          <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded px-2 py-0.5">
            Min SF: {minSF}
          </span>
        </div>

        <a
          href="/simulator"
          className="text-[10px] text-slate-400 hover:text-white border border-[#21262d] rounded px-2 py-1 hover:bg-[#21262d] transition-colors"
        >
          Back to Simulator
        </a>
        <button
          onClick={exportReportPDF}
          className="bg-[#e94560] hover:bg-[#d63750] text-white text-xs px-4 py-1.5 rounded font-semibold transition-colors"
        >
          Export PDF
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-[#161b22] border-b border-[#21262d] flex items-center shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSortCol(""); }}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs border-b-2 transition-all ${
              activeTab === tab.id
                ? "border-[#e94560] text-white bg-[#0d1117]"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.label}
            <span className="text-[9px] bg-[#21262d] text-slate-400 rounded px-1.5 py-0.5">{tab.count}</span>
          </button>
        ))}
        {activeTab === "codecheck" && (
          <div className="ml-auto mr-3 flex items-center gap-2">
            <span className="text-[10px] text-slate-500">Design Code:</span>
            <select
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value as typeof selectedCode)}
              className="bg-[#0d1117] text-xs text-white rounded px-2 py-1 border border-[#21262d]"
            >
              <option value="IS 800:2007">IS 800:2007 (Indian)</option>
              <option value="AISC 360-16">AISC 360-16 (US)</option>
              <option value="EN 1993-1-1">EN 1993-1-1 (Eurocode)</option>
            </select>
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "forces" && (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-[#161b22] z-10">
              <tr>
                {[
                  ["member", "Member"],
                  ["node_i", "Node-i"],
                  ["node_j", "Node-j"],
                  ["axial_kN", "Axial (kN)"],
                  ["shear_y_kN", "Shear-Y (kN)"],
                  ["shear_z_kN", "Shear-Z (kN)"],
                  ["moment_y_kNm", "Moment-Y (kNm)"],
                  ["moment_z_kNm", "Moment-Z (kNm)"],
                  ["torsion_kNm", "Torsion (kNm)"],
                ].map(([key, label]) => (
                  <th key={key} onClick={() => handleSort(key)} className={thClass}>
                    {label}{sortIcon(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortData(memberForces, sortCol).map((m, i) => (
                <tr key={m.id} className={`border-b border-[#21262d] ${i % 2 === 0 ? "bg-[#0d1117]" : "bg-[#161b22]/50"} hover:bg-[#21262d]/50`}>
                  <td className={`${tdClass} text-white font-semibold`}>{m.member}</td>
                  <td className={tdClass}>{m.node_i}</td>
                  <td className={tdClass}>{m.node_j}</td>
                  <td className={`${tdClass} ${m.axial_kN < 0 ? "text-blue-400" : "text-red-400"}`}>{m.axial_kN}</td>
                  <td className={tdClass}>{m.shear_y_kN}</td>
                  <td className={tdClass}>{m.shear_z_kN}</td>
                  <td className={tdClass}>{m.moment_y_kNm}</td>
                  <td className={tdClass}>{m.moment_z_kNm}</td>
                  <td className={tdClass}>{m.torsion_kNm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === "reactions" && (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-[#161b22] z-10">
              <tr>
                {[
                  ["node", "Node"],
                  ["fx_kN", "Fx (kN)"],
                  ["fy_kN", "Fy (kN)"],
                  ["fz_kN", "Fz (kN)"],
                  ["mx_kNm", "Mx (kNm)"],
                  ["my_kNm", "My (kNm)"],
                  ["mz_kNm", "Mz (kNm)"],
                ].map(([key, label]) => (
                  <th key={key} onClick={() => handleSort(key)} className={thClass}>
                    {label}{sortIcon(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortData(reactions, sortCol).map((r, i) => (
                <tr key={r.id} className={`border-b border-[#21262d] ${i % 2 === 0 ? "bg-[#0d1117]" : "bg-[#161b22]/50"} hover:bg-[#21262d]/50`}>
                  <td className={`${tdClass} text-white font-semibold`}>{r.node}</td>
                  <td className={tdClass}>{r.fx_kN}</td>
                  <td className={`${tdClass} text-green-400 font-semibold`}>{r.fy_kN}</td>
                  <td className={tdClass}>{r.fz_kN}</td>
                  <td className={tdClass}>{r.mx_kNm}</td>
                  <td className={tdClass}>{r.my_kNm}</td>
                  <td className={tdClass}>{r.mz_kNm}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#161b22] border-t-2 border-[#e94560]">
                <td className={`${tdClass} text-white font-bold`}>TOTAL</td>
                <td className={`${tdClass} font-bold`}>{reactions.reduce((s, r) => s + r.fx_kN, 0).toFixed(2)}</td>
                <td className={`${tdClass} font-bold text-green-400`}>{reactions.reduce((s, r) => s + r.fy_kN, 0).toFixed(2)}</td>
                <td className={`${tdClass} font-bold`}>{reactions.reduce((s, r) => s + r.fz_kN, 0).toFixed(2)}</td>
                <td className={`${tdClass} font-bold`}>{reactions.reduce((s, r) => s + r.mx_kNm, 0).toFixed(2)}</td>
                <td className={`${tdClass} font-bold`}>{reactions.reduce((s, r) => s + r.my_kNm, 0).toFixed(2)}</td>
                <td className={`${tdClass} font-bold`}>{reactions.reduce((s, r) => s + r.mz_kNm, 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        )}

        {activeTab === "displacements" && (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-[#161b22] z-10">
              <tr>
                {[
                  ["node", "Node"],
                  ["dx_mm", "dX (mm)"],
                  ["dy_mm", "dY (mm)"],
                  ["dz_mm", "dZ (mm)"],
                  ["rx_rad", "rX (rad)"],
                  ["ry_rad", "rY (rad)"],
                  ["rz_rad", "rZ (rad)"],
                ].map(([key, label]) => (
                  <th key={key} onClick={() => handleSort(key)} className={thClass}>
                    {label}{sortIcon(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortData(displacements, sortCol).map((d, i) => {
                const maxD = Math.max(Math.abs(d.dx_mm), Math.abs(d.dy_mm), Math.abs(d.dz_mm));
                return (
                  <tr key={d.id} className={`border-b border-[#21262d] ${i % 2 === 0 ? "bg-[#0d1117]" : "bg-[#161b22]/50"} hover:bg-[#21262d]/50`}>
                    <td className={`${tdClass} text-white font-semibold`}>{d.node}</td>
                    <td className={tdClass}>{d.dx_mm}</td>
                    <td className={`${tdClass} ${maxD === Math.abs(d.dy_mm) ? "text-amber-400 font-semibold" : ""}`}>{d.dy_mm}</td>
                    <td className={tdClass}>{d.dz_mm}</td>
                    <td className={tdClass}>{d.rx_rad}</td>
                    <td className={tdClass}>{d.ry_rad}</td>
                    <td className={tdClass}>{d.rz_rad}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#161b22] border-t-2 border-[#e94560]">
                <td className={`${tdClass} text-white font-bold`}>MAX ABS</td>
                <td className={`${tdClass} font-bold`}>{Math.max(...displacements.map((d) => Math.abs(d.dx_mm))).toFixed(3)}</td>
                <td className={`${tdClass} font-bold text-amber-400`}>{Math.max(...displacements.map((d) => Math.abs(d.dy_mm))).toFixed(3)}</td>
                <td className={`${tdClass} font-bold`}>{Math.max(...displacements.map((d) => Math.abs(d.dz_mm))).toFixed(3)}</td>
                <td className={`${tdClass} font-bold`}>{Math.max(...displacements.map((d) => Math.abs(d.rx_rad))).toFixed(5)}</td>
                <td className={`${tdClass} font-bold`}>{Math.max(...displacements.map((d) => Math.abs(d.ry_rad))).toFixed(5)}</td>
                <td className={`${tdClass} font-bold`}>{Math.max(...displacements.map((d) => Math.abs(d.rz_rad))).toFixed(5)}</td>
              </tr>
            </tfoot>
          </table>
        )}

        {activeTab === "codecheck" && (
          <div>
            <div className="p-3 bg-[#161b22] border-b border-[#21262d]">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
                  <div className="text-[10px] text-slate-500 uppercase">Design Code</div>
                  <div className="text-sm text-white font-bold mt-1">{selectedCode}</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {selectedCode === "IS 800:2007" && "Limit State Method - Indian Standard for Steel Structures"}
                    {selectedCode === "AISC 360-16" && "Specification for Structural Steel Buildings (LRFD)"}
                    {selectedCode === "EN 1993-1-1" && "Eurocode 3: Design of Steel Structures (General Rules)"}
                  </div>
                </div>
                <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
                  <div className="text-[10px] text-slate-500 uppercase">Utilization Summary</div>
                  <div className="flex items-end gap-2 mt-1">
                    <span className="text-2xl font-bold text-white">
                      {(filteredCodeChecks.reduce((s, c) => s + c.ratio, 0) / Math.max(filteredCodeChecks.length, 1) * 100).toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-slate-500 mb-1">avg. utilization</span>
                  </div>
                </div>
                <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
                  <div className="text-[10px] text-slate-500 uppercase">Check Summary</div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-green-400">{filteredCodeChecks.filter((c) => c.status === "PASS").length} Pass</span>
                    <span className="text-xs text-amber-400">{filteredCodeChecks.filter((c) => c.status === "WARNING").length} Warn</span>
                    <span className="text-xs text-red-400">{filteredCodeChecks.filter((c) => c.status === "FAIL").length} Fail</span>
                  </div>
                </div>
              </div>
            </div>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-[#161b22] z-10">
                <tr>
                  {[
                    ["member", "Member"],
                    ["section", "Section"],
                    ["code", "Code"],
                    ["ratio", "Ratio"],
                    ["status", "Status"],
                    ["clause", "Clause"],
                    ["govCase", "Gov. Case"],
                  ].map(([key, label]) => (
                    <th key={key} onClick={() => handleSort(key)} className={thClass}>
                      {label}{sortIcon(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortData(filteredCodeChecks, sortCol).map((c, i) => (
                  <tr key={c.id} className={`border-b border-[#21262d] ${i % 2 === 0 ? "bg-[#0d1117]" : "bg-[#161b22]/50"} hover:bg-[#21262d]/50`}>
                    <td className={`${tdClass} text-white font-semibold`}>{c.member}</td>
                    <td className={tdClass}>{c.section}</td>
                    <td className={`${tdClass} text-slate-500`}>{c.code}</td>
                    <td className={tdClass}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              c.ratio > 1 ? "bg-red-500" : c.ratio > 0.85 ? "bg-amber-500" : "bg-green-500"
                            }`}
                            style={{ width: `${Math.min(c.ratio * 100, 100)}%` }}
                          />
                        </div>
                        <span className="w-12 text-right">{c.ratio.toFixed(3)}</span>
                      </div>
                    </td>
                    <td className={tdClass}>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.status === "PASS"
                            ? "bg-green-500/20 text-green-400"
                            : c.status === "FAIL"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className={`${tdClass} text-slate-500`}>{c.clause}</td>
                    <td className={tdClass}>{c.govCase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "safety" && (
          <div>
            <div className="p-3 bg-[#161b22] border-b border-[#21262d]">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
                  <div className="text-[10px] text-slate-500 uppercase">Min Safety Factor</div>
                  <div className={`text-2xl font-bold mt-1 ${parseFloat(minSF) < 1.5 ? "text-red-400" : parseFloat(minSF) < 2.0 ? "text-amber-400" : "text-green-400"}`}>
                    {minSF}
                  </div>
                </div>
                <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
                  <div className="text-[10px] text-slate-500 uppercase">Avg Safety Factor</div>
                  <div className="text-2xl font-bold mt-1 text-blue-400">{avgSF}</div>
                </div>
                <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
                  <div className="text-[10px] text-slate-500 uppercase">Members Below 1.5</div>
                  <div className="text-2xl font-bold mt-1 text-red-400">
                    {safetyFactors.filter((s) => s.combinedSF < 1.5).length}
                  </div>
                </div>
                <div className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
                  <div className="text-[10px] text-slate-500 uppercase">Members Above 2.0</div>
                  <div className="text-2xl font-bold mt-1 text-green-400">
                    {safetyFactors.filter((s) => s.combinedSF >= 2.0).length}
                  </div>
                </div>
              </div>
            </div>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-[#161b22] z-10">
                <tr>
                  {[
                    ["member", "Member"],
                    ["loadCase", "Load Case"],
                    ["yieldSF", "Yield SF"],
                    ["bucklingSF", "Buckling SF"],
                    ["combinedSF", "Combined SF"],
                    ["govMode", "Governing Mode"],
                  ].map(([key, label]) => (
                    <th key={key} onClick={() => handleSort(key)} className={thClass}>
                      {label}{sortIcon(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortData(safetyFactors, sortCol).map((s, i) => (
                  <tr key={s.id} className={`border-b border-[#21262d] ${i % 2 === 0 ? "bg-[#0d1117]" : "bg-[#161b22]/50"} hover:bg-[#21262d]/50`}>
                    <td className={`${tdClass} text-white font-semibold`}>{s.member}</td>
                    <td className={tdClass}>{s.loadCase}</td>
                    <td className={`${tdClass} ${s.yieldSF < 1.5 ? "text-red-400" : "text-green-400"}`}>{s.yieldSF}</td>
                    <td className={`${tdClass} ${s.bucklingSF < 1.5 ? "text-red-400" : "text-green-400"}`}>{s.bucklingSF}</td>
                    <td className={tdClass}>
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        s.combinedSF < 1.5 ? "bg-red-500/20 text-red-400" : s.combinedSF < 2.0 ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"
                      }`}>
                        {s.combinedSF}
                      </span>
                    </td>
                    <td className={`${tdClass} text-slate-400`}>{s.govMode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-[#161b22] border-t border-[#21262d] px-4 py-1.5 flex items-center gap-4 text-[10px] text-slate-500 shrink-0">
        <span>Analysis: Linear Static</span>
        <span>|</span>
        <span>Units: kN, m, C</span>
        <span>|</span>
        <span>Members: {memberForces.length}</span>
        <span>|</span>
        <span>Nodes: {displacements.length}</span>
        <span>|</span>
        <span>Support Nodes: {reactions.length}</span>
        <div className="flex-1" />
        <span>ShilpaSutra Structural Report v1.0</span>
      </div>
    </div>
  );
}
