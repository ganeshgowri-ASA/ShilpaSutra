"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import type { ModeShape, ModalAnalysisResult, BucklingResult } from "@/lib/feaModalBuckling";
import type { FEMNode } from "@/lib/femSolver";

interface FEAReportPanelProps {
  modalResult: ModalAnalysisResult | null;
  bucklingResult: BucklingResult | null;
  nodes: FEMNode[];
  dampingRatio: number;
  onDampingChange?: (value: number) => void;
  width?: number;
  height?: number;
}

function jetCmap(t: number): [number, number, number] {
  const c = Math.max(0, Math.min(1, t));
  let r: number, g: number, b: number;
  if (c < 0.125) { r = 0; g = 0; b = 0.5 + c * 4; }
  else if (c < 0.375) { r = 0; g = (c - 0.125) * 4; b = 1; }
  else if (c < 0.625) { r = (c - 0.375) * 4; g = 1; b = 1 - (c - 0.375) * 4; }
  else if (c < 0.875) { r = 1; g = 1 - (c - 0.625) * 4; b = 0; }
  else { r = 1 - (c - 0.875) * 4; g = 0; b = 0; }
  return [Math.max(0, Math.min(1, r)), Math.max(0, Math.min(1, g)), Math.max(0, Math.min(1, b))];
}

export default function FEAReportPanel({
  modalResult,
  bucklingResult,
  nodes,
  dampingRatio,
  onDampingChange,
  width = 800,
  height = 400,
}: FEAReportPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedMode, setSelectedMode] = useState(0);
  const [animPhase, setAnimPhase] = useState(0);
  const animRef = useRef<number>(0);

  const selectedModeData = useMemo(() => {
    if (!modalResult || modalResult.modes.length === 0) return null;
    return modalResult.modes[Math.min(selectedMode, modalResult.modes.length - 1)];
  }, [modalResult, selectedMode]);

  // Animation loop for mode shape
  useEffect(() => {
    if (!selectedModeData) return;
    let running = true;
    const animate = () => {
      if (!running) return;
      setAnimPhase(prev => (prev + 0.03) % (2 * Math.PI));
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [selectedModeData]);

  // Render mode shape
  const renderModeShape = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedModeData || nodes.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const modeVec = selectedModeData.modeShape;
    const canvasW = width;
    const canvasH = height;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Compute bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of nodes) {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }
    const domW = maxX - minX || 1;
    const domH = maxY - minY || 1;
    const pad = 50;
    const scale = Math.min((canvasW - 2 * pad) / domW, (canvasH - 2 * pad) / domH);
    const ox = pad + ((canvasW - 2 * pad) - domW * scale) / 2 - minX * scale;
    const oy = canvasH - pad - ((canvasH - 2 * pad) - domH * scale) / 2 + minY * scale;

    const toScreen = (x: number, y: number): [number, number] => [ox + x * scale, oy - y * scale];

    // Find max displacement in mode shape
    let maxDisp = 0;
    for (let i = 0; i < nodes.length; i++) {
      const dx = modeVec[i * 2] || 0;
      const dy = modeVec[i * 2 + 1] || 0;
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > maxDisp) maxDisp = mag;
    }
    if (maxDisp < 1e-20) maxDisp = 1;

    const dispScale = (Math.min(domW, domH) * 0.15) / maxDisp;
    const sinPhase = Math.sin(animPhase);

    // Draw undeformed (ghost)
    ctx.strokeStyle = "rgba(100,100,100,0.3)";
    ctx.lineWidth = 0.5;
    for (const n of nodes) {
      const [sx, sy] = toScreen(n.x, n.y);
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw deformed nodes
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const dx = (modeVec[i * 2] || 0) * dispScale * sinPhase;
      const dy = (modeVec[i * 2 + 1] || 0) * dispScale * sinPhase;

      const dispMag = Math.sqrt((modeVec[i * 2] || 0) ** 2 + (modeVec[i * 2 + 1] || 0) ** 2);
      const t = dispMag / maxDisp;
      const [r, g, b] = jetCmap(t);

      const [sx, sy] = toScreen(n.x + dx, n.y + dy);

      ctx.fillStyle = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mode info overlay
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(10, 10, 200, 50);
    ctx.fillStyle = "#3b82f6";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`Mode ${selectedModeData.modeNumber}: ${selectedModeData.frequency.toFixed(2)} Hz`, 20, 30);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px monospace";
    ctx.fillText(selectedModeData.description, 20, 48);
  }, [selectedModeData, nodes, animPhase, width, height]);

  useEffect(() => { renderModeShape(); }, [renderModeShape]);

  return (
    <div className="space-y-3">
      {/* Mode Shape Viewer */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Mode Shape Animation</h3>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="rounded-lg border border-gray-700"
        />
      </div>

      {/* Mode selector */}
      {modalResult && modalResult.modes.length > 0 && (
        <div className="flex gap-2">
          {modalResult.modes.map((mode, i) => (
            <button
              key={mode.modeNumber}
              onClick={() => setSelectedMode(i)}
              className={`px-3 py-1 rounded text-xs font-mono border transition-colors ${
                selectedMode === i
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              Mode {mode.modeNumber}
            </button>
          ))}
        </div>
      )}

      {/* Frequency Table */}
      {modalResult && modalResult.modes.length > 0 && (
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="bg-gray-800 text-gray-300">
                <th className="px-3 py-2 text-left">Mode</th>
                <th className="px-3 py-2 text-right">Frequency (Hz)</th>
                <th className="px-3 py-2 text-right">Angular (rad/s)</th>
                <th className="px-3 py-2 text-right">Period (s)</th>
                <th className="px-3 py-2 text-right">Damped Freq (Hz)</th>
                <th className="px-3 py-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {modalResult.modes.map(mode => {
                const dampedFreq = mode.frequency * Math.sqrt(1 - dampingRatio * dampingRatio);
                const period = mode.frequency > 0 ? 1 / mode.frequency : Infinity;
                return (
                  <tr key={mode.modeNumber} className="border-t border-gray-800 hover:bg-gray-800/50">
                    <td className="px-3 py-1.5 text-blue-400">{mode.modeNumber}</td>
                    <td className="px-3 py-1.5 text-right text-green-400">{mode.frequency.toFixed(3)}</td>
                    <td className="px-3 py-1.5 text-right text-gray-300">{mode.angularFrequency.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right text-gray-400">{period.toFixed(4)}</td>
                    <td className="px-3 py-1.5 text-right text-yellow-400">{dampedFreq.toFixed(3)}</td>
                    <td className="px-3 py-1.5 text-gray-400">{mode.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Damping ratio input */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-400 font-mono">Damping Ratio (ζ):</label>
        <input
          type="range"
          min="0"
          max="0.2"
          step="0.005"
          value={dampingRatio}
          onChange={(e) => onDampingChange?.(parseFloat(e.target.value))}
          className="w-40"
        />
        <span className="text-xs text-gray-300 font-mono w-12">{dampingRatio.toFixed(3)}</span>
      </div>

      {/* Buckling Results */}
      {bucklingResult && (
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-3">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Buckling Analysis</h3>
          <div className="grid grid-cols-3 gap-3 text-xs font-mono">
            <div>
              <div className="text-gray-400">Critical Load Factor</div>
              <div className="text-blue-400 font-bold text-lg">{bucklingResult.criticalLoadFactor.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-gray-400">Critical Load</div>
              <div className="text-yellow-400 font-bold text-lg">{(bucklingResult.criticalLoad / 1000).toFixed(2)} kN</div>
            </div>
            <div>
              <div className="text-gray-400">Safety Factor</div>
              <div className={`font-bold text-lg ${bucklingResult.safetyFactor >= 2 ? "text-green-400" : bucklingResult.safetyFactor >= 1 ? "text-yellow-400" : "text-red-400"}`}>
                {bucklingResult.safetyFactor.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="text-gray-500 text-xs mt-2">
            Solve time: {bucklingResult.solveTimeMs.toFixed(1)} ms
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {modalResult && (
        <div className="flex gap-4 text-xs font-mono text-gray-500">
          <span>Total mass: {modalResult.totalMass.toFixed(2)} kg</span>
          <span>Modes computed: {modalResult.modes.length}</span>
          <span>Modal solve time: {modalResult.solveTimeMs.toFixed(1)} ms</span>
        </div>
      )}
    </div>
  );
}
