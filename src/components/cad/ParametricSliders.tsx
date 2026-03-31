"use client";

import { useState, useEffect } from "react";

// Minimal shape – accepts both the full engine AssemblyPart and the page-local one
interface PartLike {
  dimensions: { width: number; height: number; depth: number };
}

export interface ParametricSlidersProps {
  parts: PartLike[];
  onUpdate: (dims: Record<string, number>) => void;
  isRunning?: boolean;
}

export default function ParametricSliders({ parts, onUpdate, isRunning }: ParametricSlidersProps) {
  // Aggregate primary dimensions recursively if needed. For now we just extract max length/width/height across parts.
  const [localDims, setLocalDims] = useState<Record<string, number>>({});

  useEffect(() => {
    // If we have parts, let's find the bounding box scale to expose as "length", "width", "height" (in scene units -> mm)
    if (parts.length === 0) return;
    
    // Simplistic: grab dimensions of the first (base) part and expose them
    const basePart = parts[0];
    
    // Scale scene units to mm
    setLocalDims({
      length: basePart.dimensions.width * 10,
      thickness: basePart.dimensions.height * 10,
      width: basePart.dimensions.depth * 10,
    });
  }, [parts]);

  const handleChange = (key: string, value: number) => {
    const newDims = { ...localDims, [key]: value };
    setLocalDims(newDims);
    // Debounce this in a real app, but for now we immediately trigger update
  };
  
  const applyChanges = () => {
    onUpdate(localDims);
  };

  if (Object.keys(localDims).length === 0) return null;

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded p-3 mb-4 mt-2">
      <div className="flex items-center justify-between mb-3 border-b border-[#30363d] pb-2">
        <h4 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1">
          <svg className="w-3 h-3 text-[#00D4FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Parametric Fine-Tuning
        </h4>
        <button 
          onClick={applyChanges}
          disabled={isRunning}
          className="text-[10px] bg-[#00D4FF]/10 text-[#00D4FF] hover:bg-[#00D4FF]/20 px-2 py-1 rounded"
        >
          {isRunning ? "Running..." : "Apply & Simulate"}
        </button>
      </div>

      <div className="space-y-3">
        {Object.entries(localDims).map(([key, value]) => {
            const isAngle = key.includes("angle") || key.includes("tilt");
            const min = isAngle ? 0 : Math.max(1, value * 0.2);
            const max = isAngle ? 90 : Math.max(10, value * 3);
            
            return (
              <div key={key}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400 capitalize">{key}</span>
                  <span className="text-white font-mono">{value.toFixed(1)} {isAngle ? "deg" : "mm"}</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={isAngle ? 1 : 1}
                  value={value}
                  onChange={(e) => handleChange(key, parseFloat(e.target.value))}
                  onMouseUp={applyChanges} // trigger when sliding stops
                  className="w-full accent-[#00D4FF] h-1 bg-[#21262d] rounded-full appearance-none cursor-pointer"
                />
              </div>
            );
        })}
      </div>
      <p className="text-[9px] text-slate-500 mt-3 pt-2 border-t border-[#30363d]">
        Adjusting sliders will instantly reconstruct your CAD model and queue a background simulation based on detected physics intent.
      </p>
    </div>
  );
}
