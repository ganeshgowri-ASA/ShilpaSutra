"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GitBranch, Clock, Tag, Trash2, RotateCcw, GitCompare,
  ChevronRight, Plus, X, Check,
} from "lucide-react";
import {
  getAllVersions,
  getAllBranches,
  createBranch,
  tagVersion,
  deleteVersion,
  MAIN_BRANCH,
  type BranchEntry,
  type VersionEntry,
} from "@/lib/version-control";
import { useCadStore } from "@/stores/cad-store";

interface Props {
  onClose: () => void;
  onCompare: (a: VersionEntry, b: VersionEntry) => void;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function VersionHistory({ onClose, onCompare }: Props) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [branches, setBranches] = useState<BranchEntry[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>(MAIN_BRANCH);
  const [selectedA, setSelectedA] = useState<VersionEntry | null>(null);
  const [selectedB, setSelectedB] = useState<VersionEntry | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<VersionEntry | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [newBranchVersion, setNewBranchVersion] = useState<VersionEntry | null>(null);
  const [newBranchName, setNewBranchName] = useState("");
  const [loading, setLoading] = useState(true);
  const tagRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [vs, bs] = await Promise.all([getAllVersions(), getAllBranches()]);
    setVersions(vs);
    setBranches(bs);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (editingTag && tagRef.current) tagRef.current.focus(); }, [editingTag]);

  const filteredVersions = versions.filter((v) => v.branchId === activeBranchId);
  const activeBranch = branches.find((b) => b.id === activeBranchId);

  const handleRestore = useCallback(async () => {
    if (!restoreTarget) return;
    useCadStore.setState({ objects: restoreTarget.objects as ReturnType<typeof useCadStore.getState>["objects"] });
    setRestoreTarget(null);
  }, [restoreTarget]);

  const handleSaveTag = useCallback(async (versionId: string) => {
    if (!tagInput.trim()) { setEditingTag(null); return; }
    await tagVersion(versionId, tagInput.trim());
    setTagInput("");
    setEditingTag(null);
    load();
  }, [tagInput, load]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteVersion(id);
    load();
  }, [load]);

  const handleCreateBranch = useCallback(async () => {
    if (!newBranchVersion || !newBranchName.trim()) return;
    await createBranch(newBranchName.trim(), newBranchVersion.id);
    setNewBranchVersion(null);
    setNewBranchName("");
    load();
  }, [newBranchVersion, newBranchName, load]);

  const handleCompare = useCallback(() => {
    if (selectedA && selectedB) onCompare(selectedA, selectedB);
  }, [selectedA, selectedB, onCompare]);

  const toggleSelection = useCallback((v: VersionEntry) => {
    if (!selectedA) { setSelectedA(v); return; }
    if (selectedA.id === v.id) { setSelectedA(null); return; }
    if (!selectedB) { setSelectedB(v); return; }
    if (selectedB.id === v.id) { setSelectedB(null); return; }
    // Replace B with newly clicked
    setSelectedB(v);
  }, [selectedA, selectedB]);

  const isSelected = (v: VersionEntry) => selectedA?.id === v.id || selectedB?.id === v.id;
  const selectionLabel = (v: VersionEntry) =>
    selectedA?.id === v.id ? "A" : selectedB?.id === v.id ? "B" : null;

  return (
    <div className="fixed right-0 top-0 h-full w-[340px] bg-[#0d1117] border-l border-[#21262d] z-40 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d]">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-[#00D4FF]" />
          <span className="text-sm font-bold text-white">Version History</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={14} /></button>
      </div>

      {/* Branch selector */}
      <div className="px-3 py-2 border-b border-[#21262d] flex gap-1.5 flex-wrap">
        {branches.map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveBranchId(b.id)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border ${
              b.id === activeBranchId
                ? "bg-[#21262d] text-white border-[#484f58]"
                : "bg-transparent text-slate-500 border-transparent hover:border-[#21262d] hover:text-slate-300"
            }`}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
            {b.name}
          </button>
        ))}
      </div>

      {/* Compare toolbar */}
      {(selectedA || selectedB) && (
        <div className="px-3 py-2 bg-[#161b22] border-b border-[#21262d] flex items-center gap-2">
          <span className="text-[10px] text-slate-400 flex-1">
            {selectedA && selectedB ? "Compare A↔B ready" : "Select one more version"}
          </span>
          {selectedA && selectedB && (
            <button
              onClick={handleCompare}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20 hover:bg-[#00D4FF]/20 transition-colors"
            >
              <GitCompare size={10} /> Compare
            </button>
          )}
          <button
            onClick={() => { setSelectedA(null); setSelectedB(null); }}
            className="text-slate-600 hover:text-slate-300 transition-colors"
          ><X size={11} /></button>
        </div>
      )}

      {/* Version list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {loading && <div className="text-xs text-slate-600 text-center py-8">Loading…</div>}
        {!loading && filteredVersions.length === 0 && (
          <div className="text-xs text-slate-600 text-center py-8">
            No versions on <span className="text-slate-400">{activeBranch?.name ?? activeBranchId}</span>.<br />
            Use Quick Save to create snapshots.
          </div>
        )}

        {filteredVersions.map((v, idx) => {
          const sel = isSelected(v);
          const label = selectionLabel(v);
          return (
            <div
              key={v.id}
              className={`rounded-lg border transition-all ${
                sel
                  ? "border-[#00D4FF]/40 bg-[#00D4FF]/5"
                  : "border-[#21262d] bg-[#161b22] hover:border-[#30363d]"
              }`}
            >
              {/* Timeline dot */}
              <div className="flex gap-2 p-2.5">
                <div className="flex flex-col items-center mt-0.5">
                  <div className={`w-2 h-2 rounded-full border-2 ${
                    idx === 0 ? "border-[#00D4FF] bg-[#00D4FF]/30" : "border-slate-600 bg-[#161b22]"
                  }`} />
                  {idx < filteredVersions.length - 1 && (
                    <div className="w-px flex-1 bg-[#21262d] mt-1 min-h-[16px]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-slate-200 truncate font-medium">{v.description}</div>
                      {v.tag && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Tag size={8} className="text-amber-400" />
                          <span className="text-[9px] text-amber-400">{v.tag}</span>
                        </div>
                      )}
                      <div className="text-[9px] text-slate-600 mt-0.5">{v.objectCount} objects · {timeAgo(v.timestamp)}</div>
                    </div>
                    {label && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#00D4FF]/20 text-[#00D4FF] shrink-0">{label}</span>
                    )}
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-1 mt-1.5">
                    <button
                      onClick={() => toggleSelection(v)}
                      title={sel ? "Deselect" : "Select for compare"}
                      className={`p-1 rounded text-[9px] transition-colors ${
                        sel ? "text-[#00D4FF] hover:text-[#00D4FF]/70" : "text-slate-600 hover:text-slate-300"
                      }`}
                    ><GitCompare size={10} /></button>
                    <button
                      onClick={() => setRestoreTarget(v)}
                      title="Restore this version"
                      className="p-1 rounded text-slate-600 hover:text-emerald-400 transition-colors"
                    ><RotateCcw size={10} /></button>
                    <button
                      onClick={() => { setEditingTag(v.id); setTagInput(v.tag ?? ""); }}
                      title="Tag this version"
                      className="p-1 rounded text-slate-600 hover:text-amber-400 transition-colors"
                    ><Tag size={10} /></button>
                    <button
                      onClick={() => { setNewBranchVersion(v); setNewBranchName(""); }}
                      title="Branch from here"
                      className="p-1 rounded text-slate-600 hover:text-violet-400 transition-colors"
                    ><GitBranch size={10} /></button>
                    <button
                      onClick={() => handleDelete(v.id)}
                      title="Delete version"
                      className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors ml-auto"
                    ><Trash2 size={10} /></button>
                  </div>

                  {/* Inline tag editor */}
                  {editingTag === v.id && (
                    <div className="flex gap-1 mt-1.5">
                      <input
                        ref={tagRef}
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveTag(v.id);
                          if (e.key === "Escape") setEditingTag(null);
                        }}
                        placeholder="Tag name…"
                        className="flex-1 text-[10px] bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-slate-200 outline-none focus:border-amber-500/50"
                      />
                      <button onClick={() => handleSaveTag(v.id)} className="p-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"><Check size={10} /></button>
                      <button onClick={() => setEditingTag(null)} className="p-1 rounded text-slate-600 hover:text-slate-300 transition-colors"><X size={10} /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Restore confirmation */}
      {restoreTarget && (
        <div className="px-3 py-3 bg-[#161b22] border-t border-[#21262d]">
          <div className="text-xs text-slate-300 mb-2">
            Restore <span className="text-white font-medium">"{restoreTarget.description}"</span>?<br />
            <span className="text-slate-500 text-[10px]">Current unsaved changes will be lost.</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleRestore} className="flex-1 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-colors">Restore</button>
            <button onClick={() => setRestoreTarget(null)} className="flex-1 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-xs text-slate-400 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Create branch modal */}
      {newBranchVersion && (
        <div className="px-3 py-3 bg-[#161b22] border-t border-[#21262d]">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
            <GitBranch size={11} className="text-violet-400" />
            Branch from <span className="text-white font-medium ml-1">"{newBranchVersion.description}"</span>
          </div>
          <div className="flex gap-2">
            <input
              autoFocus
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateBranch();
                if (e.key === "Escape") setNewBranchVersion(null);
              }}
              placeholder="Branch name…"
              className="flex-1 text-[10px] bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-slate-200 outline-none focus:border-violet-500/50"
            />
            <button
              onClick={handleCreateBranch}
              disabled={!newBranchName.trim()}
              className="px-2 py-1 rounded bg-violet-600 hover:bg-violet-700 text-[10px] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            ><Plus size={10} /></button>
            <button onClick={() => setNewBranchVersion(null)} className="p-1 rounded text-slate-600 hover:text-slate-300 transition-colors"><X size={10} /></button>
          </div>
        </div>
      )}

      {/* Branch info footer */}
      <div className="px-3 py-2 border-t border-[#21262d]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeBranch?.color ?? "#00D4FF" }} />
          <ChevronRight size={10} className="text-slate-600" />
          <span className="text-[10px] text-slate-400">{activeBranch?.name ?? activeBranchId}</span>
          <span className="ml-auto text-[10px] text-slate-600">{filteredVersions.length} versions</span>
        </div>
      </div>
    </div>
  );
}
