"use client";
import { SystemAnalysis } from "./sim-types";

// ─── Root locus SVG ───────────────────────────────────────────────────────────

function RootLocusSVG({ analysis }: { analysis: SystemAnalysis }) {
  const { rootLocusPoles } = analysis;
  if (!rootLocusPoles.length) return null;

  const W = 160, H = 120;
  const allPoles = rootLocusPoles.flat();
  const allRe = allPoles.map((p) => p.re).filter(isFinite);
  const allIm = allPoles.map((p) => p.im).filter(isFinite);
  const maxR = Math.max(...allRe.map(Math.abs), ...allIm.map(Math.abs), 1) * 1.2;

  const toX = (v: number) => (v / maxR + 1) * W / 2;
  const toY = (v: number) => (-v / maxR + 1) * H / 2;

  // Build locus paths: one path per starting pole
  const nPoles = rootLocusPoles[0]?.length ?? 0;
  const paths: string[] = Array.from({ length: nPoles }, () => "");

  rootLocusPoles.forEach((gainsAtK) => {
    gainsAtK.forEach((pole, pi) => {
      if (!isFinite(pole.re) || !isFinite(pole.im)) return;
      const x = toX(pole.re).toFixed(1), y = toY(pole.im).toFixed(1);
      paths[pi] = paths[pi] ? `${paths[pi]} L${x},${y}` : `M${x},${y}`;
    });
  });

  const poleColors = ["#f59e0b", "#34d399", "#60a5fa", "#f87171", "#a78bfa"];

  return (
    <div>
      <div className="text-[8px] text-slate-500 mb-0.5">Root Locus</div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill="#0a0a1a" rx={3} />
        {/* Axes */}
        <line x1={W/2} y1={0} x2={W/2} y2={H} stroke="#1e293b" strokeWidth={1} />
        <line x1={0} y1={H/2} x2={W} y2={H/2} stroke="#1e293b" strokeWidth={1} />
        {/* Stability boundary label */}
        <text x={W/2+2} y={8} fontSize={6} fill="#374151" fontFamily="monospace">jω</text>
        <text x={W-12} y={H/2-2} fontSize={6} fill="#374151" fontFamily="monospace">σ</text>
        {/* Locus paths */}
        {paths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={poleColors[i % poleColors.length]} strokeWidth={1.5} opacity={0.8} />
        ))}
        {/* Open-loop poles (K=0) as × marks */}
        {rootLocusPoles[0]?.map((p, i) => {
          if (!isFinite(p.re) || !isFinite(p.im)) return null;
          const x = toX(p.re), y = toY(p.im);
          return (
            <g key={i}>
              <line x1={x-3} y1={y-3} x2={x+3} y2={y+3} stroke={poleColors[i % poleColors.length]} strokeWidth={1.5} />
              <line x1={x-3} y1={y+3} x2={x+3} y2={y-3} stroke={poleColors[i % poleColors.length]} strokeWidth={1.5} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Pole-zero map ────────────────────────────────────────────────────────────

function PoleZeroMap({ analysis }: { analysis: SystemAnalysis }) {
  const { poles, zeros } = analysis;
  const W = 140, H = 100;

  const allRe = [...poles, ...zeros].map((p) => p.re).filter(isFinite);
  const allIm = [...poles, ...zeros].map((p) => p.im).filter(isFinite);
  const maxR = Math.max(...allRe.map(Math.abs), ...allIm.map(Math.abs), 0.1) * 1.3;

  const toX = (v: number) => (v / maxR + 1) * W / 2;
  const toY = (v: number) => (-v / maxR + 1) * H / 2;

  return (
    <div>
      <div className="text-[8px] text-slate-500 mb-0.5">Pole-Zero Map</div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill="#0a0a1a" rx={3} />
        <line x1={W/2} y1={0} x2={W/2} y2={H} stroke="#1e293b" strokeWidth={1} />
        <line x1={0} y1={H/2} x2={W} y2={H/2} stroke="#1e293b" strokeWidth={1} />
        {poles.map((p, i) => {
          if (!isFinite(p.re) || !isFinite(p.im)) return null;
          const x = toX(p.re), y = toY(p.im);
          return (
            <g key={`p${i}`}>
              <line x1={x-4} y1={y-4} x2={x+4} y2={y+4} stroke="#ef4444" strokeWidth={1.5} />
              <line x1={x-4} y1={y+4} x2={x+4} y2={y-4} stroke="#ef4444" strokeWidth={1.5} />
            </g>
          );
        })}
        {zeros.map((z, i) => isFinite(z.re) && isFinite(z.im) ? (
          <circle key={`z${i}`} cx={toX(z.re)} cy={toY(z.im)} r={4} fill="none" stroke="#34d399" strokeWidth={1.5} />
        ) : null)}
      </svg>
      <div className="flex gap-3 mt-0.5">
        <span className="text-[7px] text-red-400">✕ poles ({poles.length})</span>
        <span className="text-[7px] text-emerald-400">○ zeros ({zeros.length})</span>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface SystemAnalysisPanelProps {
  analysis: SystemAnalysis;
}

export function SystemAnalysisPanel({ analysis }: SystemAnalysisPanelProps) {
  const { stable, gainMargin_dB, phaseMargin_deg, settlingTime, overshoot_pct } = analysis;

  const stableColor =
    stable === "stable"   ? "text-emerald-400" :
    stable === "unstable" ? "text-red-400"      : "text-yellow-400";
  const stableLabel =
    stable === "stable"   ? "STABLE" :
    stable === "unstable" ? "UNSTABLE" : "MARGINAL";
  const stableBg =
    stable === "stable"   ? "bg-emerald-900/30 border-emerald-800" :
    stable === "unstable" ? "bg-red-900/30 border-red-800"         : "bg-yellow-900/30 border-yellow-800";

  return (
    <div className="w-64 bg-[#161b22] border-l border-[#21262d] flex flex-col overflow-y-auto p-3 gap-3 shrink-0">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">System Analysis</div>

      {/* Stability badge */}
      <div className={`rounded px-2 py-1.5 border text-center ${stableBg}`}>
        <div className={`text-xs font-bold ${stableColor}`}>{stableLabel}</div>
        <div className="text-[9px] text-slate-400 mt-0.5">
          {stable === "stable" ? "All poles in LHP" :
           stable === "unstable" ? "Pole(s) in RHP" : "Pole(s) on jω-axis"}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Gain Margin", value: isFinite(gainMargin_dB) ? `${gainMargin_dB} dB` : "∞ dB", color: "#f59e0b" },
          { label: "Phase Margin", value: `${phaseMargin_deg}°`, color: "#a78bfa" },
          { label: "Settling Time", value: settlingTime > 0 ? `${settlingTime}s` : "N/A", color: "#34d399" },
          { label: "Overshoot", value: overshoot_pct > 0 ? `${overshoot_pct}%` : "0%", color: "#60a5fa" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#0d1117] rounded p-2 border border-[#21262d]">
            <div className="text-[8px] text-slate-500">{label}</div>
            <div className="text-xs font-mono font-bold mt-0.5" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Poles list */}
      {analysis.poles.length > 0 && (
        <div>
          <div className="text-[9px] text-slate-500 mb-1">Poles</div>
          <div className="flex flex-col gap-0.5">
            {analysis.poles.map((p, i) => (
              <div key={i} className="text-[9px] font-mono text-slate-300">
                {p.re.toFixed(3)}{p.im !== 0 ? ` ${p.im >= 0 ? "+" : ""}${p.im.toFixed(3)}j` : ""}
                <span className={`ml-1 text-[8px] ${p.re < 0 ? "text-emerald-500" : p.re > 0 ? "text-red-500" : "text-yellow-500"}`}>
                  {p.re < 0 ? "◀ LHP" : p.re > 0 ? "▶ RHP" : "jω"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zeros list */}
      {analysis.zeros.length > 0 && (
        <div>
          <div className="text-[9px] text-slate-500 mb-1">Zeros</div>
          <div className="flex flex-col gap-0.5">
            {analysis.zeros.map((z, i) => (
              <div key={i} className="text-[9px] font-mono text-slate-400">
                {z.re.toFixed(3)}{z.im !== 0 ? ` ${z.im >= 0 ? "+" : ""}${z.im.toFixed(3)}j` : ""}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visualizations */}
      <div className="flex flex-col gap-3">
        <PoleZeroMap analysis={analysis} />
        <RootLocusSVG analysis={analysis} />
      </div>
    </div>
  );
}
