"use client";
/**
 * PerformanceMonitor – Three.js/R3F viewport overlay
 * Toggle with Shift+F. Shows FPS, memory, draw calls, triangles.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";

interface PerfStats {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  memoryMB: number | null;
}

// Module-level store so R3F inner component can publish to outer DOM component
let _statsCallback: ((s: Partial<PerfStats>) => void) | null = null;
export function setStatsCallback(cb: typeof _statsCallback) {
  _statsCallback = cb;
}

/* ── R3F inner component – runs inside <Canvas> to read gl.info ── */
export function ViewportStatsCollector({ active }: { active: boolean }) {
  const { gl } = useThree();
  const frameCount = useRef(0);
  const lastSampleTime = useRef(performance.now());

  useFrame(() => {
    if (!active) return;
    frameCount.current++;
    const now = performance.now();
    const elapsed = now - lastSampleTime.current;
    if (elapsed >= 500) {
      const fps = Math.round((frameCount.current * 1000) / elapsed);
      frameCount.current = 0;
      lastSampleTime.current = now;
      const info = gl.info;
      _statsCallback?.({
        fps,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      });
    }
  });

  return null;
}

/* ── DOM overlay – rendered outside Canvas ── */
export default function PerformanceMonitor() {
  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState<PerfStats>({
    fps: 0,
    frameMs: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    memoryMB: null,
  });

  const rafRef = useRef<number | null>(null);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const lastFrameTime = useRef(performance.now());

  // Toggle with Shift+F
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "F" || e.key === "f")) {
        e.preventDefault();
        setVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Receive Three.js stats from canvas inner component
  useEffect(() => {
    setStatsCallback((partial) => setStats((prev) => ({ ...prev, ...partial })));
    return () => setStatsCallback(null);
  }, []);

  // RAF-based frame timing (DOM-side)
  const tick = useCallback(() => {
    const now = performance.now();
    const frameMs = Math.round((now - lastFrameTime.current) * 10) / 10;
    lastFrameTime.current = now;
    frameCount.current++;
    const elapsed = now - lastTime.current;
    if (elapsed >= 500) {
      frameCount.current = 0;
      lastTime.current = now;
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      setStats((prev) => ({
        ...prev,
        frameMs,
        memoryMB: mem ? Math.round(mem.usedJSHeapSize / 1_048_576) : null,
      }));
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!visible) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, tick]);

  if (!visible) return null;

  const fpsColor = stats.fps >= 55 ? "#4ade80" : stats.fps >= 30 ? "#facc15" : "#f87171";
  const frameColor = stats.frameMs <= 16 ? "#4ade80" : stats.frameMs <= 33 ? "#facc15" : "#f87171";
  const inpLabel = stats.frameMs <= 200 ? "Good" : stats.frameMs <= 500 ? "Needs Impr." : "Poor";
  const inpColor = stats.frameMs <= 200 ? "#4ade80" : stats.frameMs <= 500 ? "#facc15" : "#f87171";

  return (
    <div
      className="absolute top-12 right-2 z-50 select-none pointer-events-none"
      style={{ fontFamily: "ui-monospace, monospace" }}
    >
      <div
        className="rounded-lg px-3 py-2 text-[10px] space-y-0.5 min-w-[168px]"
        style={{ background: "rgba(0,0,0,0.82)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <div className="text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">
          Perf <span className="text-slate-600 normal-case font-normal">(Shift+F to hide)</span>
        </div>
        <Row label="FPS" value={String(stats.fps)} color={fpsColor} bold />
        <Row label="Frame" value={`${stats.frameMs} ms`} color={frameColor} />
        <Row label="INP" value={inpLabel} color={inpColor} />
        {stats.memoryMB !== null && (
          <Row label="Heap" value={`${stats.memoryMB} MB`} color="#94a3b8" />
        )}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 4, paddingTop: 4 }}>
          <Row label="Draw calls" value={String(stats.drawCalls)} color="#94a3b8" />
          <Row label="Triangles" value={stats.triangles.toLocaleString()} color="#94a3b8" />
          <Row label="Geometries" value={String(stats.geometries)} color="#94a3b8" />
          <Row label="Textures" value={String(stats.textures)} color="#94a3b8" />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ color, fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  );
}
