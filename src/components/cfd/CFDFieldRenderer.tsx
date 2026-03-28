"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

export type ColormapType = "jet" | "viridis" | "hot";
export type DisplayField = "velocity" | "pressure" | "temperature" | "turbulence";

export interface CFDFieldData {
  u: Float32Array;
  v: Float32Array;
  p: Float32Array;
  T: Float32Array;
  turbulenceIntensity: Float32Array;
  nx: number;
  ny: number;
  Lx: number;
  Ly: number;
}

export interface ProbeResult {
  x: number;
  y: number;
  u: number;
  v: number;
  pressure: number;
  temperature: number;
  velocityMag: number;
}

export interface StreamlineConfig {
  enabled: boolean;
  count: number;
  stepSize: number;
  maxSteps: number;
}

export interface VectorConfig {
  enabled: boolean;
  spacing: number;
  scale: number;
}

export interface ContourConfig {
  enabled: boolean;
  levels: number;
  showLabels: boolean;
}

interface CFDFieldRendererProps {
  data: CFDFieldData | null;
  displayField: DisplayField;
  colormap: ColormapType;
  streamlines: StreamlineConfig;
  vectors: VectorConfig;
  contours: ContourConfig;
  onProbe?: (result: ProbeResult) => void;
  width?: number;
  height?: number;
}

// ── Colormap Functions ──────────────────────────────────────────────────────

function jetColormap(t: number): [number, number, number] {
  const c = Math.max(0, Math.min(1, t));
  let r: number, g: number, b: number;
  if (c < 0.125) {
    r = 0; g = 0; b = 0.5 + c * 4;
  } else if (c < 0.375) {
    r = 0; g = (c - 0.125) * 4; b = 1;
  } else if (c < 0.625) {
    r = (c - 0.375) * 4; g = 1; b = 1 - (c - 0.375) * 4;
  } else if (c < 0.875) {
    r = 1; g = 1 - (c - 0.625) * 4; b = 0;
  } else {
    r = 1 - (c - 0.875) * 4; g = 0; b = 0;
  }
  return [Math.max(0, Math.min(1, r)), Math.max(0, Math.min(1, g)), Math.max(0, Math.min(1, b))];
}

function viridisColormap(t: number): [number, number, number] {
  const c = Math.max(0, Math.min(1, t));
  // Simplified viridis approximation
  const r = Math.max(0, Math.min(1, -0.0155 + c * (0.298 + c * (2.06 - c * 1.51))));
  const g = Math.max(0, Math.min(1, 0.0135 + c * (1.24 + c * (-0.908 + c * 0.542))));
  const b = Math.max(0, Math.min(1, 0.332 + c * (1.44 + c * (-3.32 + c * 2.15))));
  return [r, g, b];
}

function hotColormap(t: number): [number, number, number] {
  const c = Math.max(0, Math.min(1, t));
  const r = Math.min(1, c * 3);
  const g = Math.max(0, Math.min(1, (c - 0.333) * 3));
  const b = Math.max(0, Math.min(1, (c - 0.667) * 3));
  return [r, g, b];
}

function getColormap(type: ColormapType): (t: number) => [number, number, number] {
  switch (type) {
    case "jet": return jetColormap;
    case "viridis": return viridisColormap;
    case "hot": return hotColormap;
  }
}

// ── Field Access ────────────────────────────────────────────────────────────

function getFieldArray(data: CFDFieldData, field: DisplayField): Float32Array {
  switch (field) {
    case "velocity": {
      const mag = new Float32Array(data.u.length);
      for (let i = 0; i < mag.length; i++) {
        mag[i] = Math.sqrt(data.u[i] * data.u[i] + data.v[i] * data.v[i]);
      }
      return mag;
    }
    case "pressure": return data.p;
    case "temperature": return data.T;
    case "turbulence": return data.turbulenceIntensity;
  }
}

function getFieldRange(arr: Float32Array): [number, number] {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    if (isFinite(arr[i])) {
      if (arr[i] < min) min = arr[i];
      if (arr[i] > max) max = arr[i];
    }
  }
  if (!isFinite(min)) min = 0;
  if (!isFinite(max)) max = 1;
  if (max === min) max = min + 1;
  return [min, max];
}

function bilinearInterp(data: Float32Array, nx: number, ny: number, fx: number, fy: number): number {
  const i0 = Math.floor(fx);
  const j0 = Math.floor(fy);
  const i1 = Math.min(i0 + 1, nx - 1);
  const j1 = Math.min(j0 + 1, ny - 1);
  const si = fx - i0;
  const sj = fy - j0;
  const v00 = data[i0 * ny + j0] || 0;
  const v10 = data[i1 * ny + j0] || 0;
  const v01 = data[i0 * ny + j1] || 0;
  const v11 = data[i1 * ny + j1] || 0;
  return (1 - si) * (1 - sj) * v00 + si * (1 - sj) * v10 + (1 - si) * sj * v01 + si * sj * v11;
}

// ── Streamline Tracing (RK4) ────────────────────────────────────────────────

function traceStreamline(
  uField: Float32Array, vField: Float32Array,
  nx: number, ny: number,
  startX: number, startY: number,
  dt: number, maxSteps: number
): [number, number][] {
  const points: [number, number][] = [];
  let x = startX;
  let y = startY;

  for (let step = 0; step < maxSteps; step++) {
    if (x < 0 || x >= nx - 1 || y < 0 || y >= ny - 1) break;
    points.push([x, y]);

    // RK4 integration
    const u1 = bilinearInterp(uField, nx, ny, x, y);
    const v1 = bilinearInterp(vField, nx, ny, x, y);
    const mag1 = Math.sqrt(u1 * u1 + v1 * v1);
    if (mag1 < 1e-10) break;
    const dx1 = u1 / mag1;
    const dy1 = v1 / mag1;

    const u2 = bilinearInterp(uField, nx, ny, x + 0.5 * dt * dx1, y + 0.5 * dt * dy1);
    const v2 = bilinearInterp(vField, nx, ny, x + 0.5 * dt * dx1, y + 0.5 * dt * dy1);
    const mag2 = Math.sqrt(u2 * u2 + v2 * v2);
    if (mag2 < 1e-10) break;
    const dx2 = u2 / mag2;
    const dy2 = v2 / mag2;

    const u3 = bilinearInterp(uField, nx, ny, x + 0.5 * dt * dx2, y + 0.5 * dt * dy2);
    const v3 = bilinearInterp(vField, nx, ny, x + 0.5 * dt * dx2, y + 0.5 * dt * dy2);
    const mag3 = Math.sqrt(u3 * u3 + v3 * v3);
    if (mag3 < 1e-10) break;
    const dx3 = u3 / mag3;
    const dy3 = v3 / mag3;

    const u4 = bilinearInterp(uField, nx, ny, x + dt * dx3, y + dt * dy3);
    const v4 = bilinearInterp(vField, nx, ny, x + dt * dx3, y + dt * dy3);
    const mag4 = Math.sqrt(u4 * u4 + v4 * v4);
    if (mag4 < 1e-10) break;
    const dx4 = u4 / mag4;
    const dy4 = v4 / mag4;

    x += dt * (dx1 + 2 * dx2 + 2 * dx3 + dx4) / 6;
    y += dt * (dy1 + 2 * dy2 + 2 * dy3 + dy4) / 6;
  }

  return points;
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function CFDFieldRenderer({
  data,
  displayField,
  colormap,
  streamlines,
  vectors,
  contours,
  onProbe,
  width = 900,
  height = 500,
}: CFDFieldRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [probePoint, setProbePoint] = useState<ProbeResult | null>(null);

  const cmap = useMemo(() => getColormap(colormap), [colormap]);

  const fieldArr = useMemo(() => {
    if (!data) return null;
    return getFieldArray(data, displayField);
  }, [data, displayField]);

  const fieldRange = useMemo(() => {
    if (!fieldArr) return [0, 1] as [number, number];
    return getFieldRange(fieldArr);
  }, [fieldArr]);

  // ── Render the field to canvas ────────────────────────────────────────────
  const renderField = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || !fieldArr) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { nx, ny } = data;
    const cellW = width / nx;
    const cellH = height / ny;
    const [fMin, fMax] = fieldRange;

    // Draw field as colored rectangles
    const imgData = ctx.createImageData(width, height);
    for (let px = 0; px < width; px++) {
      for (let py = 0; py < height; py++) {
        const fi = (px / width) * (nx - 1);
        const fj = ((height - 1 - py) / height) * (ny - 1);
        const val = bilinearInterp(fieldArr, nx, ny, fi, fj);
        const t = (val - fMin) / (fMax - fMin + 1e-20);
        const [r, g, b] = cmap(t);
        const idx = (py * width + px) * 4;
        imgData.data[idx] = Math.round(r * 255);
        imgData.data[idx + 1] = Math.round(g * 255);
        imgData.data[idx + 2] = Math.round(b * 255);
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // ── Contour isolines ────────────────────────────────────────────────────
    if (contours.enabled && contours.levels > 0) {
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1;
      ctx.font = "10px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.85)";

      for (let lvl = 1; lvl < contours.levels; lvl++) {
        const threshold = fMin + (lvl / contours.levels) * (fMax - fMin);

        // Marching squares (simplified)
        for (let i = 0; i < nx - 1; i++) {
          for (let j = 0; j < ny - 1; j++) {
            const v00 = fieldArr[i * ny + j];
            const v10 = fieldArr[(i + 1) * ny + j];
            const v01 = fieldArr[i * ny + (j + 1)];
            const v11 = fieldArr[(i + 1) * ny + (j + 1)];

            const b00 = v00 >= threshold ? 1 : 0;
            const b10 = v10 >= threshold ? 1 : 0;
            const b01 = v01 >= threshold ? 1 : 0;
            const b11 = v11 >= threshold ? 1 : 0;
            const code = b00 | (b10 << 1) | (b01 << 2) | (b11 << 3);

            if (code === 0 || code === 15) continue;

            const x0 = (i / (nx - 1)) * width;
            const x1 = ((i + 1) / (nx - 1)) * width;
            const y0 = height - ((j + 1) / (ny - 1)) * height;
            const y1 = height - (j / (ny - 1)) * height;

            const lerp = (a: number, b: number, va: number, vb: number) => {
              const d = vb - va;
              if (Math.abs(d) < 1e-20) return (a + b) / 2;
              return a + ((threshold - va) / d) * (b - a);
            };

            const xBot = lerp(x0, x1, v00, v10);
            const xTop = lerp(x0, x1, v01, v11);
            const yLeft = lerp(y1, y0, v00, v01);
            const yRight = lerp(y1, y0, v10, v11);

            ctx.beginPath();
            // Draw contour segment based on marching squares case
            if (code === 1 || code === 14) { ctx.moveTo(xBot, y1); ctx.lineTo(x0, yLeft); }
            else if (code === 2 || code === 13) { ctx.moveTo(xBot, y1); ctx.lineTo(x1, yRight); }
            else if (code === 3 || code === 12) { ctx.moveTo(x0, yLeft); ctx.lineTo(x1, yRight); }
            else if (code === 4 || code === 11) { ctx.moveTo(x0, yLeft); ctx.lineTo(xTop, y0); }
            else if (code === 6 || code === 9) { ctx.moveTo(xBot, y1); ctx.lineTo(xTop, y0); }
            else if (code === 7 || code === 8) { ctx.moveTo(x1, yRight); ctx.lineTo(xTop, y0); }
            else if (code === 5) {
              ctx.moveTo(xBot, y1); ctx.lineTo(x0, yLeft);
              ctx.moveTo(x1, yRight); ctx.lineTo(xTop, y0);
            } else if (code === 10) {
              ctx.moveTo(xBot, y1); ctx.lineTo(x1, yRight);
              ctx.moveTo(x0, yLeft); ctx.lineTo(xTop, y0);
            }
            ctx.stroke();

            // Draw label at midpoint of first segment
            if (contours.showLabels && i % 8 === 0 && j % 8 === 0) {
              const labelText = threshold.toFixed(2);
              ctx.fillStyle = "rgba(0,0,0,0.7)";
              ctx.fillRect(xBot - 2, y1 - 12, ctx.measureText(labelText).width + 4, 14);
              ctx.fillStyle = "#fff";
              ctx.fillText(labelText, xBot, y1 - 1);
            }
          }
        }
      }
    }

    // ── Velocity vectors ────────────────────────────────────────────────────
    if (vectors.enabled) {
      const spacing = vectors.spacing;
      const scale = vectors.scale;
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1.5;

      for (let i = spacing; i < nx - spacing; i += spacing) {
        for (let j = spacing; j < ny - spacing; j += spacing) {
          const id = i * ny + j;
          const uu = data.u[id];
          const vv = data.v[id];
          const mag = Math.sqrt(uu * uu + vv * vv);
          if (mag < 1e-10) continue;

          const px = (i / (nx - 1)) * width;
          const py = height - (j / (ny - 1)) * height;
          const arrowLen = Math.min(scale * mag * cellW * 2, cellW * spacing * 0.8);
          const dx = (uu / mag) * arrowLen;
          const dy = -(vv / mag) * arrowLen; // flip y for canvas

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + dx, py + dy);
          ctx.stroke();

          // Arrowhead
          const headLen = Math.min(arrowLen * 0.3, 6);
          const angle = Math.atan2(dy, dx);
          ctx.beginPath();
          ctx.moveTo(px + dx, py + dy);
          ctx.lineTo(px + dx - headLen * Math.cos(angle - 0.4), py + dy - headLen * Math.sin(angle - 0.4));
          ctx.lineTo(px + dx - headLen * Math.cos(angle + 0.4), py + dy - headLen * Math.sin(angle + 0.4));
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // ── Streamlines (RK4) ───────────────────────────────────────────────────
    if (streamlines.enabled && streamlines.count > 0) {
      ctx.lineWidth = 1.5;
      const numLines = streamlines.count;

      for (let s = 0; s < numLines; s++) {
        const startY = 1 + ((ny - 2) * (s + 0.5)) / numLines;
        const pts = traceStreamline(
          data.u, data.v, nx, ny,
          1, startY,
          streamlines.stepSize, streamlines.maxSteps
        );

        if (pts.length < 2) continue;

        // Color streamline by velocity magnitude
        ctx.beginPath();
        for (let k = 0; k < pts.length - 1; k++) {
          const [xi, yi] = pts[k];
          const px1 = (xi / (nx - 1)) * width;
          const py1 = height - (yi / (ny - 1)) * height;
          const px2 = (pts[k + 1][0] / (nx - 1)) * width;
          const py2 = height - (pts[k + 1][1] / (ny - 1)) * height;

          const mag = Math.sqrt(
            bilinearInterp(data.u, nx, ny, xi, yi) ** 2 +
            bilinearInterp(data.v, nx, ny, xi, yi) ** 2
          );
          const t = (mag - fieldRange[0]) / (fieldRange[1] - fieldRange[0] + 1e-20);
          const [cr, cg, cb] = cmap(Math.max(0, Math.min(1, t)));

          ctx.strokeStyle = `rgba(${Math.round(cr * 255)},${Math.round(cg * 255)},${Math.round(cb * 255)},0.9)`;
          ctx.beginPath();
          ctx.moveTo(px1, py1);
          ctx.lineTo(px2, py2);
          ctx.stroke();
        }

        // Arrowhead at the end
        if (pts.length >= 2) {
          const last = pts[pts.length - 1];
          const prev = pts[pts.length - 2];
          const px1 = (last[0] / (nx - 1)) * width;
          const py1 = height - (last[1] / (ny - 1)) * height;
          const px0 = (prev[0] / (nx - 1)) * width;
          const py0 = height - (prev[1] / (ny - 1)) * height;
          const angle = Math.atan2(py1 - py0, px1 - px0);
          const headLen = 8;
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.beginPath();
          ctx.moveTo(px1, py1);
          ctx.lineTo(px1 - headLen * Math.cos(angle - 0.4), py1 - headLen * Math.sin(angle - 0.4));
          ctx.lineTo(px1 - headLen * Math.cos(angle + 0.4), py1 - headLen * Math.sin(angle + 0.4));
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // ── Probe point marker ──────────────────────────────────────────────────
    if (probePoint) {
      const px = (probePoint.x / data.Lx) * width;
      const py = height - (probePoint.y / data.Ly) * height;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ff0";
      ctx.fill();

      // Label
      const label = `V=${probePoint.velocityMag.toFixed(2)} m/s  P=${probePoint.pressure.toFixed(1)} Pa  T=${probePoint.temperature.toFixed(1)} K`;
      const tw = ctx.measureText(label).width;
      const lx = Math.min(px + 10, width - tw - 10);
      const ly = Math.max(py - 20, 16);
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(lx - 4, ly - 12, tw + 8, 16);
      ctx.fillStyle = "#fff";
      ctx.font = "11px monospace";
      ctx.fillText(label, lx, ly);
    }

    // ── Colorbar legend ─────────────────────────────────────────────────────
    const barX = width - 30;
    const barY = 20;
    const barH = height - 40;
    const barW = 16;

    for (let py = 0; py < barH; py++) {
      const t = 1 - py / barH;
      const [r, g, b] = cmap(t);
      ctx.fillStyle = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
      ctx.fillRect(barX, barY + py, barW, 1);
    }
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = "#fff";
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    const unit = displayField === "velocity" ? "m/s" : displayField === "pressure" ? "Pa" : displayField === "temperature" ? "K" : "";
    ctx.fillText(`${fMax.toFixed(2)} ${unit}`, barX - 4, barY + 10);
    ctx.fillText(`${((fMax + fMin) / 2).toFixed(2)}`, barX - 4, barY + barH / 2 + 4);
    ctx.fillText(`${fMin.toFixed(2)}`, barX - 4, barY + barH);
    ctx.textAlign = "left";
  }, [data, fieldArr, fieldRange, cmap, displayField, width, height, streamlines, vectors, contours, probePoint]);

  useEffect(() => {
    renderField();
  }, [renderField]);

  // ── Probe on click ────────────────────────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!data) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const worldX = (cx / width) * data.Lx;
    const worldY = (1 - cy / height) * data.Ly;
    const fi = (cx / width) * (data.nx - 1);
    const fj = ((height - cy) / height) * (data.ny - 1);

    const uVal = bilinearInterp(data.u, data.nx, data.ny, fi, fj);
    const vVal = bilinearInterp(data.v, data.nx, data.ny, fi, fj);
    const pVal = bilinearInterp(data.p, data.nx, data.ny, fi, fj);
    const tVal = bilinearInterp(data.T, data.nx, data.ny, fi, fj);

    const result: ProbeResult = {
      x: worldX,
      y: worldY,
      u: uVal,
      v: vVal,
      pressure: pVal,
      temperature: tVal,
      velocityMag: Math.sqrt(uVal * uVal + vVal * vVal),
    };
    setProbePoint(result);
    onProbe?.(result);
  }, [data, width, height, onProbe]);

  // ── Export as PNG ─────────────────────────────────────────────────────────
  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `cfd-${displayField}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [displayField]);

  if (!data) {
    return (
      <div className="flex items-center justify-center bg-gray-900 rounded-lg border border-gray-700" style={{ width, height }}>
        <p className="text-gray-400">No CFD data. Run the solver to visualize fields.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleClick}
        className="rounded-lg border border-gray-700 cursor-crosshair"
        style={{ background: "#111" }}
      />
      <button
        onClick={exportPNG}
        className="absolute top-2 left-2 bg-gray-800/80 hover:bg-gray-700 text-white text-xs px-3 py-1 rounded border border-gray-600"
      >
        Export PNG
      </button>
      {probePoint && (
        <div className="absolute bottom-2 left-2 bg-gray-900/90 text-green-400 text-xs font-mono p-2 rounded border border-gray-700">
          Probe ({probePoint.x.toFixed(3)}, {probePoint.y.toFixed(3)}) |
          V: {probePoint.velocityMag.toFixed(3)} m/s |
          P: {probePoint.pressure.toFixed(1)} Pa |
          T: {probePoint.temperature.toFixed(1)} K
        </div>
      )}
    </div>
  );
}
