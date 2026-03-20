"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface Keyframe { time: number; label: string; }

const DURATION = 10; // seconds

export default function AnimationTimeline({ onClose }: { onClose: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [keyframes, setKeyframes] = useState<Keyframe[]>([
    { time: 0, label: "Start" },
    { time: 5, label: "Mid" },
    { time: 10, label: "End" },
  ]);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  const tick = useCallback((now: number) => {
    if (!lastRef.current) lastRef.current = now;
    const delta = (now - lastRef.current) / 1000;
    lastRef.current = now;
    setCurrentTime(prev => {
      const next = prev + delta;
      if (next >= DURATION) { setPlaying(false); return DURATION; }
      return next;
    });
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (playing) {
      lastRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, tick]);

  const addKeyframe = () => {
    const t = Math.round(currentTime * 10) / 10;
    if (!keyframes.find(k => k.time === t)) {
      setKeyframes(prev => [...prev, { time: t, label: `K${prev.length + 1}` }].sort((a, b) => a.time - b.time));
    }
  };

  const pct = (currentTime / DURATION) * 100;

  return (
    <div className="bg-[#161b22] border-t border-[#21262d] shrink-0 select-none">
      <div className="flex items-center gap-2 px-3 py-1.5">
        {/* Controls */}
        <button onClick={() => { setCurrentTime(0); setPlaying(false); }}
          title="Stop" className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#21262d]">
          ■
        </button>
        <button onClick={() => { if (currentTime >= DURATION) setCurrentTime(0); setPlaying(!playing); }}
          title={playing ? "Pause" : "Play"}
          className="w-6 h-6 rounded flex items-center justify-center text-[#00D4FF] hover:bg-[#21262d]">
          {playing ? "⏸" : "▶"}
        </button>

        <span className="text-[10px] font-mono text-slate-400 w-12 shrink-0">
          {currentTime.toFixed(1)}s
        </span>

        {/* Timeline bar */}
        <div className="flex-1 relative h-6 bg-[#0d1117] rounded border border-[#21262d] cursor-pointer"
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            setCurrentTime(Math.max(0, Math.min(DURATION, ratio * DURATION)));
          }}>
          {/* Progress fill */}
          <div className="absolute left-0 top-0 h-full bg-[#00D4FF]/20 rounded transition-none"
            style={{ width: `${pct}%` }} />
          {/* Playhead */}
          <div className="absolute top-0 h-full w-0.5 bg-[#00D4FF]"
            style={{ left: `${pct}%` }} />
          {/* Keyframe markers */}
          {keyframes.map(kf => (
            <div key={kf.time} className="absolute top-0 h-full flex flex-col items-center"
              style={{ left: `${(kf.time / DURATION) * 100}%` }}>
              <div className="w-0.5 h-full bg-yellow-400/60" />
              <div className="absolute -top-4 text-[8px] text-yellow-400 whitespace-nowrap -translate-x-1/2">{kf.label}</div>
            </div>
          ))}
        </div>

        <span className="text-[10px] text-slate-600 shrink-0">{DURATION}s</span>

        <button onClick={addKeyframe}
          className="text-[10px] px-2 py-0.5 rounded border border-[#21262d] text-slate-400 hover:text-white hover:border-[#00D4FF]/40 transition-colors shrink-0">
          + Keyframe
        </button>

        <button onClick={onClose} className="text-slate-500 hover:text-white text-xs shrink-0">✕</button>
      </div>

      {/* Keyframe list */}
      <div className="flex gap-2 px-3 pb-1.5 overflow-x-auto">
        {keyframes.map(kf => (
          <div key={kf.time}
            onClick={() => setCurrentTime(kf.time)}
            className="flex items-center gap-1 bg-[#0d1117] border border-[#21262d] rounded px-2 py-0.5 cursor-pointer hover:border-yellow-400/40 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            <span className="text-[9px] text-slate-400">{kf.label}</span>
            <span className="text-[9px] text-slate-600">{kf.time}s</span>
          </div>
        ))}
      </div>
    </div>
  );
}
