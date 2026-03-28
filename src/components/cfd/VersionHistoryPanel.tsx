"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  getVersionHistory,
  deleteVersion,
  diffVersions,
  exportVersionHistory,
  importVersionHistory,
  formatTimestamp,
  clearVersionHistory,
  type VersionEntry,
  type VersionDiff,
  type VersionType,
} from "@/lib/drawingVersionControl";

interface VersionHistoryPanelProps {
  filterType?: VersionType;
  onRestore?: (entry: VersionEntry) => void;
}

export default function VersionHistoryPanel({ filterType, onRestore }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<VersionDiff[] | null>(null);

  const refresh = useCallback(() => {
    const all = getVersionHistory();
    setVersions(filterType ? all.filter(v => v.type === filterType) : all);
  }, [filterType]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = useCallback((id: string) => {
    deleteVersion(id);
    refresh();
    if (selectedId === id) setSelectedId(null);
    if (compareId === id) { setCompareId(null); setDiffs(null); }
  }, [refresh, selectedId, compareId]);

  const handleCompare = useCallback(() => {
    if (!selectedId || !compareId) return;
    const v1 = versions.find(v => v.id === selectedId);
    const v2 = versions.find(v => v.id === compareId);
    if (v1 && v2) {
      setDiffs(diffVersions(v1, v2));
    }
  }, [selectedId, compareId, versions]);

  const handleExport = useCallback(() => {
    const json = exportVersionHistory();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shilpasutra-versions-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      if (importVersionHistory(text)) {
        refresh();
      }
    };
    input.click();
  }, [refresh]);

  const handleClear = useCallback(() => {
    clearVersionHistory();
    refresh();
    setSelectedId(null);
    setCompareId(null);
    setDiffs(null);
  }, [refresh]);

  const typeColors: Record<VersionType, string> = {
    "drawing": "bg-blue-600",
    "cfd-simulation": "bg-red-600",
    "fem-simulation": "bg-green-600",
    "fea-modal": "bg-purple-600",
    "fea-buckling": "bg-yellow-600",
    "cad-model": "bg-cyan-600",
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-3 max-h-[600px] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-300">Version History</h3>
        <div className="flex gap-1">
          <button onClick={handleExport} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-2 py-1 rounded border border-gray-700">
            Export
          </button>
          <button onClick={handleImport} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-2 py-1 rounded border border-gray-700">
            Import
          </button>
          <button onClick={handleClear} className="text-xs bg-red-900/50 hover:bg-red-800/50 text-red-400 px-2 py-1 rounded border border-red-800">
            Clear
          </button>
        </div>
      </div>

      {/* Version list */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {versions.length === 0 && (
          <p className="text-gray-500 text-xs text-center py-4">No versions saved yet.</p>
        )}
        {versions.map((v) => (
          <div
            key={v.id}
            onClick={() => setSelectedId(v.id === selectedId ? null : v.id)}
            className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs border transition-colors ${
              selectedId === v.id ? "border-blue-500 bg-blue-900/20" : compareId === v.id ? "border-yellow-500 bg-yellow-900/20" : "border-transparent hover:bg-gray-800"
            }`}
          >
            {/* Thumbnail */}
            {v.thumbnail ? (
              <img src={v.thumbnail} alt="" className="w-12 h-8 rounded border border-gray-700 object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-8 rounded border border-gray-700 bg-gray-800 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-600 text-[8px]">N/A</span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`${typeColors[v.type]} text-white px-1 py-0.5 rounded text-[9px] font-bold`}>
                  {v.type.split("-").map(w => w[0].toUpperCase()).join("")}
                </span>
                <span className="text-gray-300 truncate">{v.label}</span>
              </div>
              <span className="text-gray-500">{formatTimestamp(v.timestamp)}</span>
            </div>

            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onRestore?.(v); }}
                className="bg-green-900/50 hover:bg-green-800/50 text-green-400 px-1.5 py-0.5 rounded text-[10px] border border-green-800"
              >
                Restore
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setCompareId(v.id === compareId ? null : v.id); }}
                className={`px-1.5 py-0.5 rounded text-[10px] border ${
                  compareId === v.id ? "bg-yellow-800/50 text-yellow-300 border-yellow-600" : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"
                }`}
              >
                Diff
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(v.id); }}
                className="bg-red-900/30 hover:bg-red-800/40 text-red-500 px-1.5 py-0.5 rounded text-[10px] border border-red-900"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Compare button */}
      {selectedId && compareId && selectedId !== compareId && (
        <button
          onClick={handleCompare}
          className="mt-2 w-full bg-yellow-700 hover:bg-yellow-600 text-white text-xs py-1.5 rounded font-mono"
        >
          Compare Selected Versions
        </button>
      )}

      {/* Diff view */}
      {diffs && (
        <div className="mt-2 bg-gray-800 rounded border border-gray-700 p-2 max-h-40 overflow-y-auto">
          <h4 className="text-xs font-semibold text-gray-300 mb-1">Parameter Diff</h4>
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left pr-2">Parameter</th>
                <th className="text-right pr-2">Old</th>
                <th className="text-right">New</th>
              </tr>
            </thead>
            <tbody>
              {diffs.map(d => (
                <tr key={d.paramKey} className={d.changed ? "text-yellow-400" : "text-gray-600"}>
                  <td className="pr-2">{d.paramKey}</td>
                  <td className="text-right pr-2">{d.oldValue !== undefined ? String(d.oldValue) : "—"}</td>
                  <td className="text-right">{d.newValue !== undefined ? String(d.newValue) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setDiffs(null)} className="text-xs text-gray-500 hover:text-gray-300 mt-1">Close diff</button>
        </div>
      )}

      <div className="text-[10px] text-gray-600 mt-1">{versions.length}/50 versions</div>
    </div>
  );
}
