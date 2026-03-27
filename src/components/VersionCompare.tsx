"use client";

import { useMemo } from "react";
import { X, Plus, Minus, Edit2, Box, Clock } from "lucide-react";
import { diffVersions, type VersionEntry } from "@/lib/version-control";

interface Props {
  versionA: VersionEntry;
  versionB: VersionEntry;
  onClose: () => void;
}

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatVal(v: unknown): string {
  if (Array.isArray(v)) return v.map((x) => (typeof x === "number" ? x.toFixed(2) : x)).join(", ");
  if (typeof v === "object" && v !== null) {
    return Object.entries(v as Record<string, number>)
      .map(([k, val]) => `${k}: ${typeof val === "number" ? val.toFixed(2) : val}`)
      .join(" | ");
  }
  return String(v);
}

export default function VersionCompare({ versionA, versionB, onClose }: Props) {
  const diff = useMemo(() => diffVersions(versionA, versionB), [versionA, versionB]);

  const totalChanges = diff.added.length + diff.removed.length + diff.modified.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0d1117] border border-[#21262d] rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#21262d]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/20">A</span>
              <div>
                <div className="text-xs font-medium text-white">{versionA.description}</div>
                <div className="flex items-center gap-1 text-[9px] text-slate-500">
                  <Clock size={8} />{timeLabel(versionA.timestamp)}
                  {versionA.tag && <span className="text-amber-400 ml-1">#{versionA.tag}</span>}
                </div>
              </div>
            </div>
            <div className="text-slate-600">↔</div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">B</span>
              <div>
                <div className="text-xs font-medium text-white">{versionB.description}</div>
                <div className="flex items-center gap-1 text-[9px] text-slate-500">
                  <Clock size={8} />{timeLabel(versionB.timestamp)}
                  {versionB.tag && <span className="text-amber-400 ml-1">#{versionB.tag}</span>}
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={15} /></button>
        </div>

        {/* Summary bar */}
        <div className="flex items-center gap-4 px-5 py-2.5 bg-[#161b22] border-b border-[#21262d]">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Plus size={12} />
            <span className="text-xs font-semibold">{diff.added.length} added</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-400">
            <Minus size={12} />
            <span className="text-xs font-semibold">{diff.removed.length} removed</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <Edit2 size={12} />
            <span className="text-xs font-semibold">{diff.modified.length} modified</span>
          </div>
          {totalChanges === 0 && (
            <span className="text-xs text-slate-500">Versions are identical</span>
          )}
        </div>

        {/* Diff content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

          {/* Added objects */}
          {diff.added.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Plus size={11} className="text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Added in B</span>
              </div>
              <div className="space-y-1">
                {diff.added.map((obj) => (
                  <div key={obj.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                    <Box size={11} className="text-emerald-400 shrink-0" />
                    <span className="text-[11px] text-slate-200 flex-1 truncate">{obj.name}</span>
                    <span className="text-[9px] text-slate-500">{obj.type}</span>
                    <div className="w-3 h-3 rounded-full border border-slate-600 shrink-0" style={{ backgroundColor: obj.color }} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Removed objects */}
          {diff.removed.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Minus size={11} className="text-red-400" />
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Removed in B</span>
              </div>
              <div className="space-y-1">
                {diff.removed.map((obj) => (
                  <div key={obj.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/15">
                    <Box size={11} className="text-red-400 shrink-0" />
                    <span className="text-[11px] text-slate-400 flex-1 truncate line-through">{obj.name}</span>
                    <span className="text-[9px] text-slate-500">{obj.type}</span>
                    <div className="w-3 h-3 rounded-full border border-slate-600 shrink-0" style={{ backgroundColor: obj.color }} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Modified objects */}
          {diff.modified.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Edit2 size={11} className="text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Modified</span>
              </div>
              <div className="space-y-2">
                {diff.modified.map(({ before, after, changedProps }) => (
                  <div key={before.id} className="rounded-lg border border-amber-500/15 bg-amber-500/5 overflow-hidden">
                    {/* Object header */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/5 border-b border-amber-500/10">
                      <Box size={10} className="text-amber-400 shrink-0" />
                      <span className="text-[11px] font-medium text-slate-200 flex-1">{before.name}</span>
                      <span className="text-[9px] text-slate-500">{changedProps.length} props changed</span>
                    </div>
                    {/* Property diff table */}
                    <div className="divide-y divide-[#21262d]">
                      {changedProps.map((prop) => {
                        const bKey = prop as keyof typeof before;
                        return (
                          <div key={prop} className="grid grid-cols-[80px_1fr_1fr] gap-0 text-[10px]">
                            <div className="px-3 py-1.5 text-slate-500 font-medium border-r border-[#21262d] truncate">{prop}</div>
                            <div className="px-3 py-1.5 text-red-300/80 bg-red-500/5 border-r border-[#21262d] truncate font-mono">
                              {formatVal(before[bKey])}
                            </div>
                            <div className="px-3 py-1.5 text-emerald-300/80 bg-emerald-500/5 truncate font-mono">
                              {formatVal(after[bKey])}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {totalChanges === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-600">
              <Box size={32} className="mb-3 opacity-30" />
              <p className="text-sm">No differences found between these versions.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 border-t border-[#21262d]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs bg-[#21262d] hover:bg-[#30363d] text-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
