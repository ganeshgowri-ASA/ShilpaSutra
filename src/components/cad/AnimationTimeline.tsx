"use client";
import { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Plus, Trash2, ChevronDown } from "lucide-react";

interface Keyframe {
  id: string;
  time: number; // seconds
  objectId: string;
  objectName: string;
  posX: number; posY: number; posZ: number;
  rotX: number; rotY: number; rotZ: number;
}

const DURATION = 10; // seconds

export default function AnimationTimeline() {
  const [playing, setPlaying]       = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [keyframes, setKeyframes]   = useState<Keyframe[]>([
    { id: "kf1", time: 0, objectId: "obj1", objectName: "Box 1",    posX: 0,   posY: 0,   posZ: 0,   rotX: 0,   rotY: 0,   rotZ: 0   },
    { id: "kf2", time: 5, objectId: "obj1", objectName: "Box 1",    posX: 2,   posY: 0.5, posZ: 0,   rotX: 0,   rotY: 180, rotZ: 0   },
    { id: "kf3", time: 0, objectId: "obj2", objectName: "Cylinder 1", posX: -1, posY: 0, posZ: 0,   rotX: 0,   rotY: 0,   rotZ: 0   },
    { id: "kf4", time: 8, objectId: "obj2", objectName: "Cylinder 1", posX: 1,  posY: 1, posZ: 1,   rotX: 90,  rotY: 0,   rotZ: 0   },
  ]);
  const [selectedKf, setSelectedKf] = useState<string | null>(null);
  const [collapsed, setCollapsed]   = useState(false);
  const rafRef  = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  // Playback loop
  useEffect(() => {
    if (playing) {
      const tick = (ts: number) => {
        if (lastRef.current === null) lastRef.current = ts;
        const dt = (ts - lastRef.current) / 1000;
        lastRef.current = ts;
        setCurrentTime(t => {
          const next = t + dt;
          if (next >= DURATION) { setPlaying(false); return DURATION; }
          return next;
        });
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRef.current = null;
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing]);

  const stop = () => { setPlaying(false); setCurrentTime(0); };

  const addKeyframe = () => {
    const newKf: Keyframe = {
      id: `kf${Date.now()}`, time: parseFloat(currentTime.toFixed(1)),
      objectId: "obj1", objectName: "Box 1",
      posX: 0, posY: 0, posZ: 0, rotX: 0, rotY: 0, rotZ: 0,
    };
    setKeyframes(prev => [...prev, newKf].sort((a, b) => a.time - b.time));
    setSelectedKf(newKf.id);
  };

  const deleteKf = (id: string) => { setKeyframes(prev => prev.filter(k => k.id !== id)); setSelectedKf(null); };

  const updateKf = (id: string, patch: Partial<Keyframe>) => {
    setKeyframes(prev => prev.map(k => k.id === id ? { ...k, ...patch } : k));
  };

  const selectedKfData = keyframes.find(k => k.id === selectedKf);
  const pct = (currentTime / DURATION) * 100;
  const uniqueObjects = Array.from(new Set(keyframes.map(k => k.objectName)));

  if (collapsed) {
    return (
      <div className="bg-[#161b22] border-t border-[#21262d] px-3 py-1.5 flex items-center gap-3 text-xs select-none">
        <button onClick={() => setCollapsed(false)} className="text-slate-500 hover:text-white flex items-center gap-1">
          <ChevronDown size={12} className="rotate-180" /> Animation
        </button>
        <button onClick={() => setPlaying(!playing)} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-[#00D4FF]">
          {playing ? <Pause size={12} /> : <Play size={12} />}
        </button>
        <span className="text-slate-600 font-mono">{currentTime.toFixed(1)}s</span>
        <div className="flex-1 h-1 bg-[#21262d] rounded-full overflow-hidden">
          <div className="h-full bg-[#00D4FF]" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#161b22] border-t border-[#21262d] flex flex-col select-none" style={{ height: 180 }}>
      {/* Toolbar row */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#21262d] flex-shrink-0">
        <button onClick={() => setCollapsed(true)} className="text-slate-500 hover:text-white flex items-center gap-1 text-[10px]">
          <ChevronDown size={12} /> Timeline
        </button>
        <div className="w-px h-4 bg-[#21262d] mx-1" />
        <button onClick={() => setPlaying(!playing)} title={playing ? "Pause" : "Play"}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#21262d] text-slate-400 hover:text-[#00D4FF] transition-colors">
          {playing ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button onClick={stop} title="Stop"
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#21262d] text-slate-400 hover:text-red-400 transition-colors">
          <Square size={13} />
        </button>
        <span className="text-[10px] font-mono text-slate-400 w-12">{currentTime.toFixed(2)}s</span>
        <button onClick={addKeyframe}
          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-[#21262d] text-slate-400 hover:text-[#00D4FF] hover:border-[#00D4FF]/40 transition-colors ml-1">
          <Plus size={11} /> Add Keyframe
        </button>
        {selectedKf && (
          <button onClick={() => deleteKf(selectedKf)}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-[#21262d] text-slate-400 hover:text-red-400 hover:border-red-400/40 transition-colors">
            <Trash2 size={11} /> Delete
          </button>
        )}
        <div className="flex-1" />
        <span className="text-[10px] text-slate-600">{DURATION}s</span>
      </div>

      {/* Timeline tracks */}
      <div className="flex flex-1 overflow-hidden">
        {/* Object labels */}
        <div className="w-28 border-r border-[#21262d] flex-shrink-0">
          <div className="h-5 border-b border-[#21262d] px-2 flex items-center">
            <span className="text-[9px] text-slate-600 uppercase tracking-wider">Object</span>
          </div>
          {uniqueObjects.map(name => (
            <div key={name} className="h-8 px-2 flex items-center border-b border-[#21262d]/50">
              <span className="text-[10px] text-slate-400 truncate">{name}</span>
            </div>
          ))}
        </div>

        {/* Track area */}
        <div className="flex-1 relative overflow-x-auto overflow-y-hidden">
          {/* Time ruler */}
          <div className="h-5 border-b border-[#21262d] relative bg-[#0d1117]">
            {Array.from({ length: DURATION + 1 }, (_, i) => (
              <div key={i} className="absolute top-0 flex flex-col items-center" style={{ left: `${(i / DURATION) * 100}%` }}>
                <div className="w-px h-3 bg-[#21262d]" />
                <span className="text-[8px] text-slate-600 mt-0.5">{i}s</span>
              </div>
            ))}
            {/* Playhead */}
            <div className="absolute top-0 bottom-0 w-px bg-[#00D4FF] z-10 pointer-events-none" style={{ left: `${pct}%` }}>
              <div className="w-2 h-2 bg-[#00D4FF] rounded-sm -ml-1 -mt-0.5" />
            </div>
          </div>

          {/* Keyframe rows */}
          {uniqueObjects.map(name => {
            const objKfs = keyframes.filter(k => k.objectName === name);
            return (
              <div key={name} className="h-8 relative border-b border-[#21262d]/50 hover:bg-[#21262d]/20">
                {objKfs.map(kf => (
                  <button key={kf.id} onClick={() => setSelectedKf(kf.id === selectedKf ? null : kf.id)}
                    title={`${kf.objectName} @ ${kf.time}s`}
                    style={{ left: `${(kf.time / DURATION) * 100}%` }}
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-sm rotate-45 border transition-all ${kf.id === selectedKf ? "bg-[#00D4FF] border-[#00D4FF]" : "bg-amber-400 border-amber-600 hover:scale-125"}`}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Keyframe editor */}
        {selectedKfData && (
          <div className="w-44 border-l border-[#21262d] flex-shrink-0 overflow-y-auto p-2 space-y-1.5 text-[10px]">
            <div className="font-bold text-[#00D4FF] mb-1">{selectedKfData.objectName}</div>
            {[
              { label: "Time (s)", key: "time" as const, step: 0.1, min: 0, max: DURATION },
              { label: "Pos X", key: "posX" as const, step: 0.1, min: -10, max: 10 },
              { label: "Pos Y", key: "posY" as const, step: 0.1, min: -10, max: 10 },
              { label: "Pos Z", key: "posZ" as const, step: 0.1, min: -10, max: 10 },
              { label: "Rot Y (°)", key: "rotY" as const, step: 5, min: -360, max: 360 },
            ].map(f => (
              <div key={f.key}>
                <div className="flex justify-between text-slate-500">
                  <span>{f.label}</span>
                  <span className="text-white font-mono">{selectedKfData[f.key].toFixed(1)}</span>
                </div>
                <input type="range" min={f.min} max={f.max} step={f.step}
                  value={selectedKfData[f.key]}
                  onChange={e => updateKf(selectedKfData.id, { [f.key]: parseFloat(e.target.value) })}
                  className="w-full h-0.5 accent-[#00D4FF] cursor-pointer" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
