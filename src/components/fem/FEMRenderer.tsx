"use client";

import React, { useRef, useEffect, useCallback, useMemo, useState } from "react";
import type { FEMNode, FEMElement, FEMSolverResult, FEMBoundaryCondition, FEMLoad } from "@/lib/femSolver";

interface FEMRendererProps {
  result: FEMSolverResult | null;
  boundaryConditions: FEMBoundaryCondition[];
  loads: FEMLoad[];
  showMesh: boolean;
  showDisplacement: boolean;
  showStress: boolean;
  showPrincipalStress: boolean;
  showLoads: boolean;
  showBCs: boolean;
  displacementScale: number;
  width?: number;
  height?: number;
}

type ColormapFn = (t: number) => [number, number, number];

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

export default function FEMRenderer({
  result,
  boundaryConditions,
  loads,
  showMesh,
  showDisplacement,
  showStress,
  showPrincipalStress,
  showLoads,
  showBCs,
  displacementScale,
  width = 800,
  height = 500,
}: FEMRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const transform = useMemo(() => {
    if (!result) return { ox: 0, oy: 0, scale: 1 };
    const { nodes } = result;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of nodes) {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }
    const domW = maxX - minX || 1;
    const domH = maxY - minY || 1;
    const pad = 60;
    const scaleX = (width - 2 * pad) / domW;
    const scaleY = (height - 2 * pad) / domH;
    const scale = Math.min(scaleX, scaleY);
    const ox = pad + ((width - 2 * pad) - domW * scale) / 2 - minX * scale;
    const oy = height - pad - ((height - 2 * pad) - domH * scale) / 2 + minY * scale;
    return { ox, oy, scale };
  }, [result, width, height]);

  const toScreen = useCallback((x: number, y: number): [number, number] => {
    return [transform.ox + x * transform.scale, transform.oy - y * transform.scale];
  }, [transform]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    const { nodes, elements, nodeResults, elementResults, displacements } = result;
    const nodeMap = new Map<number, FEMNode>();
    for (const n of nodes) nodeMap.set(n.id, n);

    const maxVM = result.maxVonMises || 1;

    // Helper: get displaced position
    const getPos = (nodeId: number): [number, number] => {
      const n = nodeMap.get(nodeId)!;
      if (showDisplacement && displacements) {
        const dx = displacements[nodeId * 2] * displacementScale;
        const dy = displacements[nodeId * 2 + 1] * displacementScale;
        return toScreen(n.x + dx, n.y + dy);
      }
      return toScreen(n.x, n.y);
    };

    // ── Draw stress-filled elements ─────────────────────────────────────
    if (showStress) {
      for (let ei = 0; ei < elements.length; ei++) {
        const elem = elements[ei];
        const er = elementResults[ei];
        if (!er) continue;

        const t = Math.min(1, er.vonMises / maxVM);
        const [r, g, b] = jetCmap(t);
        ctx.fillStyle = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;

        const [x1, y1] = getPos(elem.nodeIds[0]);
        const [x2, y2] = getPos(elem.nodeIds[1]);
        const [x3, y3] = getPos(elem.nodeIds[2]);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ── Draw mesh wireframe ─────────────────────────────────────────────
    if (showMesh) {
      ctx.strokeStyle = showStress ? "rgba(0,0,0,0.3)" : "rgba(100,180,255,0.6)";
      ctx.lineWidth = 0.5;
      for (const elem of elements) {
        const [x1, y1] = getPos(elem.nodeIds[0]);
        const [x2, y2] = getPos(elem.nodeIds[1]);
        const [x3, y3] = getPos(elem.nodeIds[2]);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.closePath();
        ctx.stroke();
      }
    }

    // ── Displacement field (colored nodes) ──────────────────────────────
    if (showDisplacement && !showStress) {
      const maxDisp = result.maxDisplacement || 1;
      for (const elem of elements) {
        // Average displacement of element
        let avgDisp = 0;
        for (const nid of elem.nodeIds) {
          const nr = nodeResults.find(r => r.nodeId === nid);
          avgDisp += (nr?.dispMag || 0);
        }
        avgDisp /= 3;
        const t = Math.min(1, avgDisp / maxDisp);
        const [r, g, b] = jetCmap(t);
        ctx.fillStyle = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;

        const [x1, y1] = getPos(elem.nodeIds[0]);
        const [x2, y2] = getPos(elem.nodeIds[1]);
        const [x3, y3] = getPos(elem.nodeIds[2]);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ── Principal stress vectors ────────────────────────────────────────
    if (showPrincipalStress) {
      for (let ei = 0; ei < elements.length; ei++) {
        const elem = elements[ei];
        const er = elementResults[ei];
        if (!er) continue;

        // Centroid
        const n1 = nodeMap.get(elem.nodeIds[0])!;
        const n2 = nodeMap.get(elem.nodeIds[1])!;
        const n3 = nodeMap.get(elem.nodeIds[2])!;
        const cx = (n1.x + n2.x + n3.x) / 3;
        const cy = (n1.y + n2.y + n3.y) / 3;
        const [sx, sy] = toScreen(cx, cy);

        const angle = er.principalAngle;
        const len = 8 * Math.min(1, Math.abs(er.principalS1) / maxVM + 0.3);

        // S1 direction (tension = blue, compression = red)
        const cos1 = Math.cos(angle);
        const sin1 = Math.sin(angle);
        ctx.strokeStyle = er.principalS1 >= 0 ? "#3b82f6" : "#ef4444";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx - cos1 * len, sy + sin1 * len);
        ctx.lineTo(sx + cos1 * len, sy - sin1 * len);
        ctx.stroke();

        // S2 direction (perpendicular)
        const cos2 = -sin1;
        const sin2 = cos1;
        const len2 = 8 * Math.min(1, Math.abs(er.principalS2) / maxVM + 0.3);
        ctx.strokeStyle = er.principalS2 >= 0 ? "#3b82f6" : "#ef4444";
        ctx.beginPath();
        ctx.moveTo(sx - cos2 * len2, sy + sin2 * len2);
        ctx.lineTo(sx + cos2 * len2, sy - sin2 * len2);
        ctx.stroke();
      }
    }

    // ── Load arrows ─────────────────────────────────────────────────────
    if (showLoads) {
      ctx.fillStyle = "#f59e0b";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;

      let maxF = 0;
      for (const l of loads) {
        const mag = Math.sqrt(l.fx * l.fx + l.fy * l.fy);
        if (mag > maxF) maxF = mag;
      }
      if (maxF === 0) maxF = 1;

      for (const l of loads) {
        const n = nodeMap.get(l.nodeId);
        if (!n) continue;
        const [px, py] = toScreen(n.x, n.y);
        const mag = Math.sqrt(l.fx * l.fx + l.fy * l.fy);
        if (mag < 1e-20) continue;

        const arrowLen = 30 * (mag / maxF) + 15;
        const dx = (l.fx / mag) * arrowLen;
        const dy = -(l.fy / mag) * arrowLen;

        ctx.beginPath();
        ctx.moveTo(px - dx, py - dy);
        ctx.lineTo(px, py);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(dy, dx);
        const headLen = 8;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - headLen * Math.cos(angle - 0.4), py - headLen * Math.sin(angle - 0.4));
        ctx.lineTo(px - headLen * Math.cos(angle + 0.4), py - headLen * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();

        // Label
        ctx.font = "10px monospace";
        ctx.fillText(`${(mag / 1000).toFixed(1)} kN`, px - dx - 5, py - dy - 8);
      }
    }

    // ── Boundary condition symbols ──────────────────────────────────────
    if (showBCs) {
      for (const bc of boundaryConditions) {
        const n = nodeMap.get(bc.nodeId);
        if (!n) continue;
        const [px, py] = toScreen(n.x, n.y);

        if (bc.type === "fixed" || bc.type === "pinned") {
          // Triangle symbol
          ctx.fillStyle = "rgba(34,197,94,0.8)";
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px - 8, py + 12);
          ctx.lineTo(px + 8, py + 12);
          ctx.closePath();
          ctx.fill();

          if (bc.type === "fixed") {
            // Ground hatching
            ctx.strokeStyle = "#22c55e";
            ctx.lineWidth = 1;
            for (let h = 0; h < 4; h++) {
              const hx = px - 8 + h * 5;
              ctx.beginPath();
              ctx.moveTo(hx, py + 12);
              ctx.lineTo(hx - 4, py + 18);
              ctx.stroke();
            }
          }
        } else if (bc.type === "rollerX" || bc.type === "rollerY") {
          // Circle roller
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py + 8, 5, 0, Math.PI * 2);
          ctx.stroke();

          // Ground line
          ctx.beginPath();
          if (bc.type === "rollerX") {
            ctx.moveTo(px - 10, py + 14);
            ctx.lineTo(px + 10, py + 14);
          } else {
            ctx.moveTo(px + 6, py - 5);
            ctx.lineTo(px + 6, py + 15);
          }
          ctx.stroke();
        }
      }
    }

    // ── Colorbar ────────────────────────────────────────────────────────
    if (showStress || showDisplacement) {
      const barX = width - 30;
      const barY = 30;
      const barH = height - 60;
      const barW = 14;
      const maxVal = showStress ? maxVM : (result.maxDisplacement || 1);
      const unit = showStress ? "Pa" : "m";
      const label = showStress ? "Von Mises" : "Displacement";

      for (let py = 0; py < barH; py++) {
        const t = 1 - py / barH;
        const [r, g, b] = jetCmap(t);
        ctx.fillStyle = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
        ctx.fillRect(barX, barY + py, barW, 1);
      }
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);

      ctx.fillStyle = "#fff";
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${maxVal.toExponential(2)} ${unit}`, barX - 3, barY + 8);
      ctx.fillText(`${(maxVal / 2).toExponential(2)}`, barX - 3, barY + barH / 2 + 4);
      ctx.fillText(`0`, barX - 3, barY + barH);
      ctx.fillText(label, barX - 3, barY - 6);
    }
  }, [result, width, height, showMesh, showDisplacement, showStress, showPrincipalStress, showLoads, showBCs, displacementScale, boundaryConditions, loads, toScreen, transform]);

  useEffect(() => { render(); }, [render]);

  if (!result) {
    return (
      <div className="flex items-center justify-center bg-gray-900 rounded-lg border border-gray-700" style={{ width, height }}>
        <p className="text-gray-400">No FEM results. Run the solver to visualize.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg border border-gray-700"
      />
      <div className="grid grid-cols-4 gap-2 text-xs font-mono">
        <div className="bg-gray-800 rounded p-2 border border-gray-700">
          <div className="text-gray-400">Max Displacement</div>
          <div className="text-blue-400 font-bold">{result.maxDisplacement.toExponential(3)} m</div>
        </div>
        <div className="bg-gray-800 rounded p-2 border border-gray-700">
          <div className="text-gray-400">Max Von Mises</div>
          <div className="text-red-400 font-bold">{result.maxVonMises.toExponential(3)} Pa</div>
        </div>
        <div className="bg-gray-800 rounded p-2 border border-gray-700">
          <div className="text-gray-400">Safety Factor</div>
          <div className={`font-bold ${result.safetyFactor >= 2 ? "text-green-400" : result.safetyFactor >= 1 ? "text-yellow-400" : "text-red-400"}`}>
            {result.safetyFactor.toFixed(2)}
          </div>
        </div>
        <div className="bg-gray-800 rounded p-2 border border-gray-700">
          <div className="text-gray-400">Solve Time</div>
          <div className="text-gray-300">{result.solveTimeMs.toFixed(1)} ms</div>
        </div>
      </div>
    </div>
  );
}
