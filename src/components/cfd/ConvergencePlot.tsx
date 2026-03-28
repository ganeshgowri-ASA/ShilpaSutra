"use client";

import React, { useRef, useEffect, useMemo } from "react";

export interface ResidualEntry {
  iteration: number;
  continuity: number;
  xMomentum: number;
  yMomentum: number;
  energy: number;
  kResidual: number;
  omegaResidual: number;
}

interface ConvergencePlotProps {
  residuals: ResidualEntry[];
  width?: number;
  height?: number;
  convergenceTol?: number;
}

const COLORS: Record<string, string> = {
  continuity: "#ef4444",
  xMomentum: "#3b82f6",
  yMomentum: "#22c55e",
  energy: "#f59e0b",
  kResidual: "#a855f7",
  omegaResidual: "#ec4899",
};

export default function ConvergencePlot({
  residuals,
  width = 600,
  height = 300,
  convergenceTol = 1e-4,
}: ConvergencePlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const plotData = useMemo(() => {
    if (residuals.length === 0) return null;

    const keys = ["continuity", "xMomentum", "yMomentum", "energy", "kResidual", "omegaResidual"] as const;
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (const entry of residuals) {
      for (const key of keys) {
        const val = entry[key];
        if (val > 0) {
          const logVal = Math.log10(val);
          if (logVal < minVal) minVal = logVal;
          if (logVal > maxVal) maxVal = logVal;
        }
      }
    }

    if (!isFinite(minVal)) minVal = -8;
    if (!isFinite(maxVal)) maxVal = 2;
    minVal = Math.min(minVal, Math.log10(convergenceTol) - 1);
    maxVal = Math.max(maxVal, 1);

    return { keys, minVal, maxVal };
  }, [residuals, convergenceTol]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !plotData) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { keys, minVal, maxVal } = plotData;
    const padL = 60, padR = 120, padT = 20, padB = 40;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 0.5;
    const logRange = maxVal - minVal;
    for (let log = Math.ceil(minVal); log <= Math.floor(maxVal); log++) {
      const y = padT + plotH - ((log - minVal) / logRange) * plotH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`1e${log}`, padL - 5, y + 4);
    }

    // Convergence tolerance line
    const tolY = padT + plotH - ((Math.log10(convergenceTol) - minVal) / logRange) * plotH;
    ctx.strokeStyle = "rgba(239,68,68,0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, tolY);
    ctx.lineTo(padL + plotW, tolY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ef4444";
    ctx.font = "9px monospace";
    ctx.textAlign = "left";
    ctx.fillText("tol", padL + plotW + 4, tolY + 4);

    // Plot lines
    const maxIter = residuals.length - 1 || 1;
    for (const key of keys) {
      ctx.strokeStyle = COLORS[key];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < residuals.length; i++) {
        const val = residuals[i][key];
        if (val <= 0) continue;
        const x = padL + (i / maxIter) * plotW;
        const y = padT + plotH - ((Math.log10(val) - minVal) / logRange) * plotH;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Legend
    let legendY = padT + 10;
    ctx.font = "10px monospace";
    for (const key of keys) {
      ctx.fillStyle = COLORS[key];
      ctx.fillRect(padL + plotW + 10, legendY - 4, 10, 10);
      ctx.fillStyle = "#e2e8f0";
      ctx.textAlign = "left";
      ctx.fillText(key, padL + plotW + 24, legendY + 4);
      legendY += 16;
    }

    // Axes labels
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Iteration", padL + plotW / 2, height - 5);

    // X-axis ticks
    const xTicks = 5;
    for (let t = 0; t <= xTicks; t++) {
      const iterVal = Math.round((t / xTicks) * maxIter);
      const x = padL + (t / xTicks) * plotW;
      ctx.fillText(`${iterVal}`, x, height - padB + 15);
    }

    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, plotW, plotH);
  }, [residuals, plotData, width, height, convergenceTol]);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 mb-1">Convergence History</h3>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded border border-gray-700"
      />
      {residuals.length > 0 && (
        <div className="flex gap-4 text-xs text-gray-400 mt-1 font-mono">
          <span>Iterations: {residuals.length}</span>
          <span>Cont: {residuals[residuals.length - 1].continuity.toExponential(2)}</span>
          <span>U: {residuals[residuals.length - 1].xMomentum.toExponential(2)}</span>
          <span>V: {residuals[residuals.length - 1].yMomentum.toExponential(2)}</span>
        </div>
      )}
    </div>
  );
}
