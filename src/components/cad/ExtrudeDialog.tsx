"use client";
import { useState, useCallback, useMemo } from "react";
import { useCadStore } from "@/stores/cad-store";
import { Layers, X, Check, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown } from "lucide-react";

interface ExtrudeDialogProps {
  onClose: () => void;
}

export default function ExtrudeDialog({ onClose }: ExtrudeDialogProps) {
  const selectedId = useCadStore((s) => s.selectedId);
  const objects = useCadStore((s) => s.objects);
  const featureHistory = useCadStore((s) => s.featureHistory);
  const sketchProfiles = useCadStore((s) => s.sketchProfiles);
  const extrudeFromSketch = useCadStore((s) => s.extrudeFromSketch);

  const selected = objects.find((o) => o.id === selectedId);
  const sketchTypes = ["rectangle", "circle", "polygon", "line"];

  // Find valid sketch profiles: either the selected object or entities from a locked sketch group
  const validProfiles = useMemo(() => {
    const profiles: { id: string; name: string; type: string }[] = [];

    // Check if selected object is a valid profile
    if (selected && (sketchTypes.includes(selected.type) || selected.isProfile)) {
      profiles.push({ id: selected.id, name: selected.name, type: selected.type });
    }

    // Check sketch groups for closed profiles
    for (const feat of featureHistory) {
      if (feat.type !== "sketch_group") continue;
      const entities = objects.filter((o) => o.sketchId === feat.id);
      for (const ent of entities) {
        if (ent.type === "rectangle" || ent.type === "circle" || ent.isProfile) {
          if (!profiles.find((p) => p.id === ent.id)) {
            profiles.push({ id: ent.id, name: ent.name, type: ent.type });
          }
        }
      }
    }

    // Also check all objects that are sketch types
    for (const obj of objects) {
      if ((obj.type === "rectangle" || obj.type === "circle") && !profiles.find((p) => p.id === obj.id)) {
        profiles.push({ id: obj.id, name: obj.name, type: obj.type });
      }
    }

    return profiles;
  }, [selected, objects, featureHistory, sketchProfiles]);

  const [selectedProfileId, setSelectedProfileId] = useState(
    selected && sketchTypes.includes(selected.type) ? selected.id :
    validProfiles.length > 0 ? validProfiles[0].id : ""
  );
  const [distance, setDistance] = useState(10);
  const [direction, setDirection] = useState<"normal" | "reverse" | "midplane" | "both">("normal");

  const handleApply = useCallback(() => {
    const profileId = selectedProfileId || (validProfiles.length > 0 ? validProfiles[0].id : null);
    if (!profileId) return;
    const actualDist = direction === "reverse" ? -distance : direction === "midplane" ? distance / 2 : distance;
    extrudeFromSketch(profileId, Math.abs(actualDist));
    onClose();
  }, [selectedProfileId, validProfiles, distance, direction, extrudeFromSketch, onClose]);

  if (validProfiles.length === 0) {
    return (
      <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-[#1a1a2e]/95 border border-red-500/40 rounded-lg p-4 z-20 backdrop-blur-sm shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Layers size={14} className="text-[#00D4FF]" />
          <span className="text-xs font-semibold text-white">Extrude</span>
          <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white"><X size={12} /></button>
        </div>
        <p className="text-[11px] text-red-400">
          No closed sketch profiles found.
        </p>
        <p className="text-[10px] text-slate-500 mt-1">
          Draw a Rectangle or Circle on a sketch plane first, then exit sketch mode.
        </p>
        <p className="text-[10px] text-slate-500 mt-1">
          Selected: {selected?.type || "none"} {selected?.name || ""}
        </p>
      </div>
    );
  }

  const selectedProfile = validProfiles.find((p) => p.id === selectedProfileId) || validProfiles[0];
  const directionIcons = {
    normal: <ArrowUp size={10} />,
    reverse: <ArrowDown size={10} />,
    midplane: <ArrowUpDown size={10} />,
    both: <ArrowUpDown size={10} />,
  };

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-[#1a1a2e]/95 border border-[#00D4FF]/40 rounded-lg p-4 z-20 backdrop-blur-sm shadow-xl min-w-[280px]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Layers size={14} className="text-[#00D4FF]" />
        <span className="text-xs font-semibold text-white">Extrude from Sketch</span>
        <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white"><X size={12} /></button>
      </div>

      {/* Profile selector */}
      <div className="mb-3">
        <label className="text-[10px] text-slate-400 block mb-1">Profile</label>
        {validProfiles.length === 1 ? (
          <div className="text-[11px] text-[#00D4FF] bg-[#0d1117] px-2 py-1.5 rounded border border-[#16213e]">
            {selectedProfile.name} <span className="text-slate-600">({selectedProfile.type})</span>
          </div>
        ) : (
          <div className="relative">
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="w-full bg-[#0d1117] text-white text-[11px] px-2 py-1.5 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none appearance-none pr-6"
            >
              {validProfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Distance input */}
      <div className="mb-4">
        <label className="text-[10px] text-slate-400 block mb-1">
          <ArrowUp size={10} className="inline mr-1" />
          Extrude Distance (mm)
        </label>
        <input
          type="number"
          value={distance}
          onChange={(e) => setDistance(parseFloat(e.target.value) || 1)}
          min={0.1}
          step={1}
          className="w-full bg-[#0d1117] text-white text-[11px] font-mono px-2 py-1.5 rounded border border-[#16213e] focus:border-[#00D4FF]/50 outline-none"
          autoFocus
        />
      </div>

      {/* Direction mode */}
      <div className="mb-4">
        <label className="text-[10px] text-slate-400 block mb-1">Direction</label>
        <div className="grid grid-cols-2 gap-1">
          {(["normal", "reverse", "midplane", "both"] as const).map((dir) => (
            <button
              key={dir}
              onClick={() => setDirection(dir)}
              className={`flex items-center justify-center gap-1 text-[10px] py-1 px-2 rounded border transition-colors ${
                direction === dir
                  ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]"
                  : "border-[#16213e] text-slate-500 hover:border-slate-500"
              }`}
            >
              {directionIcons[dir]}
              {dir.charAt(0).toUpperCase() + dir.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Preview info */}
      <div className="bg-[#0d1117] rounded p-2 mb-3 text-[10px] text-slate-500">
        Extrudes <span className="text-[#00D4FF]">{selectedProfile.name}</span> by{" "}
        <span className="text-[#00D4FF]">{distance}mm</span>{" "}
        {direction === "normal" ? "upward" : direction === "reverse" ? "downward" : direction === "midplane" ? "symmetric about plane" : "both directions"}.
        Creates a solid body added to the Feature Tree.
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleApply}
          className="flex-1 flex items-center justify-center gap-1 bg-[#00D4FF]/20 hover:bg-[#00D4FF]/30 text-[#00D4FF] text-[11px] px-3 py-1.5 rounded border border-[#00D4FF]/40 transition-colors"
        >
          <Check size={12} /> Extrude
        </button>
        <button
          onClick={onClose}
          className="flex items-center justify-center gap-1 text-slate-400 hover:text-white text-[11px] px-3 py-1.5 rounded border border-[#16213e] hover:border-slate-500 transition-colors"
        >
          <X size={12} /> Cancel
        </button>
      </div>
    </div>
  );
}
