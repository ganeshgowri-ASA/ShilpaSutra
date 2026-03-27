"use client";

import { useState } from "react";
import {
  Footprints,
  Play,
  Pause,
  Square,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Gauge,
  PersonStanding,
} from "lucide-react";
import {
  useVisualizationStore,
  type WalkthroughKeyframe,
} from "@/stores/visualization-store";

export default function WalkthroughPanel() {
  const {
    walkthroughActive,
    walkthroughSpeed,
    walkthroughEyeHeight,
    walkthroughKeyframes,
    walkthroughPlaying,
    walkthroughTime,
    toggleWalkthrough,
    setWalkthroughSpeed,
    setWalkthroughEyeHeight,
    addWalkthroughKeyframe,
    removeWalkthroughKeyframe,
    setWalkthroughPlaying,
    setWalkthroughTime,
    cameraPosition,
    cameraTarget,
  } = useVisualizationStore();

  const handleAddKeyframe = () => {
    const kf: WalkthroughKeyframe = {
      id: `kf-${Date.now()}`,
      position: [...cameraPosition],
      target: [...cameraTarget],
      time: walkthroughKeyframes.length > 0
        ? walkthroughKeyframes[walkthroughKeyframes.length - 1].time + 2
        : 0,
    };
    addWalkthroughKeyframe(kf);
  };

  const totalDuration = walkthroughKeyframes.length > 0
    ? walkthroughKeyframes[walkthroughKeyframes.length - 1].time
    : 0;

  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#21262d]">
        <Footprints size={13} className="text-[#00D4FF]" />
        <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
          Walkthrough
        </span>
        <button
          onClick={toggleWalkthrough}
          className={`ml-auto px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
            walkthroughActive
              ? "bg-[#00D4FF]/15 text-[#00D4FF]"
              : "bg-[#161b22] text-slate-500 hover:text-slate-300"
          }`}
        >
          {walkthroughActive ? "Active" : "Activate"}
        </button>
      </div>

      <div className="p-2 space-y-2">
        {/* Controls hint */}
        {walkthroughActive && (
          <div className="px-2 py-1.5 bg-[#161b22] rounded text-[9px] text-slate-500">
            <div className="font-bold text-slate-400 mb-0.5">Controls</div>
            <div>W/A/S/D - Move forward/left/back/right</div>
            <div>Mouse - Look around</div>
            <div>Shift - Sprint</div>
            <div>Space - Move up &middot; Ctrl - Move down</div>
          </div>
        )}

        {/* Speed & eye height */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 px-1">
            <Gauge size={11} className="text-slate-500" />
            <span className="text-[9px] text-slate-500 w-10">Speed</span>
            <input
              type="range"
              min={0.5}
              max={10}
              step={0.5}
              value={walkthroughSpeed}
              onChange={(e) => setWalkthroughSpeed(parseFloat(e.target.value))}
              className="flex-1 h-1 accent-[#00D4FF]"
            />
            <span className="text-[9px] text-slate-400 font-mono w-8 text-right">
              {walkthroughSpeed.toFixed(1)}
            </span>
          </div>

          <div className="flex items-center gap-2 px-1">
            <PersonStanding size={11} className="text-slate-500" />
            <span className="text-[9px] text-slate-500 w-10">Height</span>
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.1}
              value={walkthroughEyeHeight}
              onChange={(e) => setWalkthroughEyeHeight(parseFloat(e.target.value))}
              className="flex-1 h-1 accent-[#00D4FF]"
            />
            <span className="text-[9px] text-slate-400 font-mono w-8 text-right">
              {walkthroughEyeHeight.toFixed(1)}m
            </span>
          </div>
        </div>

        {/* Camera path recording */}
        <div className="border-t border-[#21262d] pt-2">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[9px] text-slate-600 font-bold uppercase">
              Camera Path
            </span>
            <button
              onClick={handleAddKeyframe}
              className="flex items-center gap-1 px-1.5 py-0.5 bg-[#161b22] border border-[#21262d] rounded text-[9px] text-slate-400 hover:text-[#00D4FF] hover:border-[#00D4FF]/30 transition-colors"
            >
              <Plus size={9} />
              Keyframe
            </button>
          </div>

          {/* Keyframes list */}
          {walkthroughKeyframes.length > 0 && (
            <div className="space-y-0.5 mb-2">
              {walkthroughKeyframes.map((kf, i) => (
                <div
                  key={kf.id}
                  className="flex items-center gap-1.5 px-2 py-0.5 bg-[#161b22] rounded group"
                >
                  <span className="text-[9px] text-slate-600 font-mono w-4">
                    {i + 1}
                  </span>
                  <span className="text-[9px] text-slate-400 flex-1 font-mono truncate">
                    t={kf.time.toFixed(1)}s
                  </span>
                  <span className="text-[8px] text-slate-600 font-mono">
                    ({kf.position.map((v) => v.toFixed(1)).join(", ")})
                  </span>
                  <button
                    onClick={() => removeWalkthroughKeyframe(kf.id)}
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={8} className="text-slate-600 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Playback controls */}
          {walkthroughKeyframes.length >= 2 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-1">
                <button
                  onClick={() => setWalkthroughPlaying(!walkthroughPlaying)}
                  className={`w-6 h-6 rounded flex items-center justify-center ${
                    walkthroughPlaying
                      ? "bg-[#00D4FF]/15 text-[#00D4FF]"
                      : "bg-[#161b22] text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {walkthroughPlaying ? <Pause size={11} /> : <Play size={11} />}
                </button>

                <button
                  onClick={() => {
                    setWalkthroughPlaying(false);
                    setWalkthroughTime(0);
                  }}
                  className="w-6 h-6 rounded bg-[#161b22] flex items-center justify-center text-slate-500 hover:text-slate-300"
                >
                  <Square size={11} />
                </button>

                <input
                  type="range"
                  min={0}
                  max={totalDuration}
                  step={0.1}
                  value={walkthroughTime}
                  onChange={(e) => setWalkthroughTime(parseFloat(e.target.value))}
                  className="flex-1 h-1 accent-[#00D4FF]"
                />

                <span className="text-[9px] text-slate-400 font-mono">
                  {walkthroughTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
