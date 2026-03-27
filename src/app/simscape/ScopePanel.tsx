"use client";
import { BlockDef, SimResult, SystemAnalysis } from "./sim-types";
import { Download } from "lucide-react";

// ─── Mini scope waveform (on canvas block) ────────────────────────────────────

export function ScopePlot({ values }: { values: number[] }) {
  if (!values.length) return null;
  const W = 100, H = 36;
  const minV = Math.min(...values), maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - minV) / range) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mt-1">
      <rect width={W} height={H} fill="#0a0a1a" rx={2} />
      <polyline points={pts.join(" ")} fill="none" stroke="#00D4FF" strokeWidth={1.2} />
    </svg>
  );
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(scopeBlocks: BlockDef[], simResult: SimResult) {
  const time = simResult.time;
  const headers = ["time", ...scopeBlocks.map((b) => b.name.replace(/,/g, ""))];
  const rows = time.map((t, i) => [
    t.toFixed(6),
    ...scopeBlocks.map((b) => (simResult.signals[b.id]?.[i] ?? 0).toFixed(8)),
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "scope_data.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ─── Bode plot SVG ────────────────────────────────────────────────────────────

function BodePlotSVG({ analysis }: { analysis: SystemAnalysis }) {
  const W = 340, H = 80;
  const { bodeFreq, bodeMag_dB, bodePhase_deg } = analysis;
  if (!bodeFreq.length) return null;

  const validMags = bodeMag_dB.filter(isFinite);
  const minMag = Math.min(...validMags), maxMag = Math.max(...validMags);
  const magRange = maxMag - minMag || 40;

  const minPh = Math.min(...bodePhase_deg), maxPh = Math.max(...bodePhase_deg);
  const phRange = maxPh - minPh || 180;

  const toX = (i: number) => (i / (bodeFreq.length - 1)) * W;
  const toYMag = (v: number) => H - ((v - minMag) / magRange) * (H - 4) - 2;
  const toYPh  = (v: number) => H - ((v - minPh)  / phRange)  * (H - 4) - 2;

  const magPts = bodeMag_dB
    .map((v, i) => isFinite(v) ? `${toX(i).toFixed(1)},${toYMag(v).toFixed(1)}` : null)
    .filter(Boolean).join(" ");
  const phPts = bodePhase_deg
    .map((v, i) => `${toX(i).toFixed(1)},${toYPh(v).toFixed(1)}`).join(" ");

  return (
    <div className="flex gap-3">
      <div>
        <div className="text-[8px] text-slate-500 mb-0.5">Magnitude (dB)</div>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect width={W} height={H} fill="#0a0a1a" rx={3} />
          <line x1={0} y1={H/2} x2={W} y2={H/2} stroke="#1e293b" strokeWidth={1} />
          <polyline points={magPts} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
          <text x={4} y={10} fontSize={7} fill="#475569" fontFamily="monospace">{maxMag.toFixed(1)}</text>
          <text x={4} y={H-2} fontSize={7} fill="#475569" fontFamily="monospace">{minMag.toFixed(1)}</text>
        </svg>
      </div>
      <div>
        <div className="text-[8px] text-slate-500 mb-0.5">Phase (°)</div>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect width={W} height={H} fill="#0a0a1a" rx={3} />
          <line x1={0} y1={H/2} x2={W} y2={H/2} stroke="#1e293b" strokeWidth={1} />
          <polyline points={phPts} fill="none" stroke="#a78bfa" strokeWidth={1.5} />
          <text x={4} y={10} fontSize={7} fill="#475569" fontFamily="monospace">{maxPh.toFixed(0)}°</text>
          <text x={4} y={H-2} fontSize={7} fill="#475569" fontFamily="monospace">{minPh.toFixed(0)}°</text>
        </svg>
      </div>
    </div>
  );
}

// ─── Nyquist plot SVG ─────────────────────────────────────────────────────────

function NyquistSVG({ analysis }: { analysis: SystemAnalysis }) {
  const W = 140, H = 100;
  const { nyquistRe, nyquistIm } = analysis;
  if (!nyquistRe.length) return null;

  const allRe = nyquistRe.filter(isFinite);
  const allIm = nyquistIm.filter(isFinite);
  const maxR = Math.max(...allRe.map(Math.abs), ...allIm.map(Math.abs), 1) * 1.2;

  const toX = (v: number) => (v / maxR + 1) * W / 2;
  const toY = (v: number) => (-v / maxR + 1) * H / 2;

  const pts = nyquistRe
    .map((r, i) => isFinite(r) && isFinite(nyquistIm[i])
      ? `${toX(r).toFixed(1)},${toY(nyquistIm[i]).toFixed(1)}` : null)
    .filter(Boolean).join(" ");

  return (
    <div>
      <div className="text-[8px] text-slate-500 mb-0.5">Nyquist</div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill="#0a0a1a" rx={3} />
        <line x1={W/2} y1={0} x2={W/2} y2={H} stroke="#1e293b" strokeWidth={1} />
        <line x1={0} y1={H/2} x2={W} y2={H/2} stroke="#1e293b" strokeWidth={1} />
        <circle cx={toX(-1)} cy={toY(0)} r={3} fill="none" stroke="#ef4444" strokeWidth={1} />
        <polyline points={pts} fill="none" stroke="#34d399" strokeWidth={1.5} />
      </svg>
    </div>
  );
}

// ─── Full scope panel ─────────────────────────────────────────────────────────

interface ScopePanelProps {
  scopeBlocks: BlockDef[];
  simResult: SimResult | null;
  tEnd: number;
  analysis: SystemAnalysis | null;
  open: boolean;
  onToggle: () => void;
}

export function ScopePanel({ scopeBlocks, simResult, tEnd, analysis, open, onToggle }: ScopePanelProps) {
  if (scopeBlocks.length === 0) return null;

  return (
    <div className={`bg-[#161b22] border-t border-[#21262d] shrink-0 transition-all ${open ? "h-56" : "h-8"}`}>
      <div className="flex items-center gap-2 px-3 py-1.5">
        <button onClick={onToggle} className="flex-1 flex items-center gap-2 text-[10px] text-slate-400 hover:text-white transition-colors text-left">
          <span className="font-medium">Scope Outputs ({scopeBlocks.length})</span>
          {!simResult && <span className="text-slate-600 ml-2">Run simulation to see output</span>}
        </button>
        {simResult && open && (
          <button onClick={() => exportCSV(scopeBlocks, simResult)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] text-slate-400 border border-[#21262d] hover:text-white hover:border-slate-500 transition-colors">
            <Download size={10} /> CSV
          </button>
        )}
      </div>

      {open && (
        <div className="flex gap-4 px-4 pb-2 overflow-x-auto">
          {/* Scope waveforms */}
          {scopeBlocks.map((sb) => {
            const vals = simResult?.signals[sb.id];
            const time = simResult?.time;
            if (!vals || !time) return (
              <div key={sb.id} className="flex-shrink-0 w-48 h-28 rounded border border-[#21262d] flex items-center justify-center">
                <span className="text-[10px] text-slate-600">{sb.name}: no data</span>
              </div>
            );
            const W2 = 180, H2 = 100;
            const minV = Math.min(...vals), maxV = Math.max(...vals);
            const range = maxV - minV || 1;
            const pts = vals.map((v, i) => {
              const x = (i / (vals.length - 1)) * W2;
              const y = H2 - ((v - minV) / range) * (H2 - 10) - 5;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            });
            return (
              <div key={sb.id} className="flex-shrink-0 flex flex-col gap-1">
                <div className="text-[9px] text-slate-500 font-medium">{sb.name}</div>
                <svg width={W2} height={H2} viewBox={`0 0 ${W2} ${H2}`}>
                  <rect width={W2} height={H2} fill="#0a0a1a" rx={4} />
                  <line x1={0} y1={H2/2} x2={W2} y2={H2/2} stroke="#1e293b" strokeWidth={1} />
                  <polyline points={pts.join(" ")} fill="none" stroke="#00D4FF" strokeWidth={1.5} />
                  <text x={4} y={H2-3} fontSize={8} fill="#475569" fontFamily="monospace">{minV.toFixed(2)}</text>
                  <text x={4} y={10} fontSize={8} fill="#475569" fontFamily="monospace">{maxV.toFixed(2)}</text>
                  <text x={W2-4} y={H2-3} fontSize={8} fill="#475569" fontFamily="monospace" textAnchor="end">{tEnd}s</text>
                </svg>
              </div>
            );
          })}
          {/* Bode + Nyquist (when analysis available) */}
          {analysis && simResult && (
            <div className="flex-shrink-0 flex flex-col gap-2 border-l border-[#21262d] pl-4">
              <div className="text-[9px] text-[#f59e0b] font-medium">Frequency Response</div>
              <BodePlotSVG analysis={analysis} />
              <NyquistSVG analysis={analysis} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
