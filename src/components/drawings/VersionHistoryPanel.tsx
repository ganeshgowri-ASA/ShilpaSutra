"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// VersionHistoryPanel — Sidebar showing drawing version history with rollback
// Features: thumbnail previews, restore, diff, export/import, pruning
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from "react";
import type { DrawingVersion, DrawingDiff } from "@/lib/versionControl";
import type { Drawing } from "@/lib/drawingEngine";
import { DrawingVersionControl } from "@/lib/versionControl";

// ── Props ───────────────────────────────────────────────────────────────────

interface VersionHistoryPanelProps {
  /** The version control instance. */
  versionControl: DrawingVersionControl;
  /** Current drawing ID to filter versions. */
  drawingId: string;
  /** Called when a version is restored. */
  onRestore: (drawing: Readonly<Drawing>) => void;
  /** Class name for the outer container. */
  className?: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function VersionHistoryPanel({
  versionControl,
  drawingId,
  onRestore,
  className = "",
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<ReadonlyArray<DrawingVersion>>(
    () => versionControl.list(drawingId)
  );
  const [selectedIds, setSelectedIds] = useState<[string, string] | null>(null);
  const [diffResult, setDiffResult] = useState<DrawingDiff | null>(null);
  const [showImport, setShowImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentId = versionControl.getCurrentVersionId();

  const refresh = useCallback(() => {
    setVersions(versionControl.list(drawingId));
  }, [versionControl, drawingId]);

  // ── Actions ─────────────────────────────────────────────────────────

  const handleRestore = useCallback((versionId: string) => {
    const drawing = versionControl.restore(versionId);
    onRestore(drawing);
    refresh();
  }, [versionControl, onRestore, refresh]);

  const handleDiff = useCallback(() => {
    if (!selectedIds) return;
    const result = versionControl.diff(selectedIds[0], selectedIds[1]);
    setDiffResult(result);
  }, [versionControl, selectedIds]);

  const handleExport = useCallback(() => {
    const json = versionControl.export();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drawing-versions-${drawingId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [versionControl, drawingId]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      versionControl.import(reader.result as string);
      refresh();
      setShowImport(false);
    };
    reader.readAsText(file);
  }, [versionControl, refresh]);

  const handlePrune = useCallback(() => {
    versionControl.prune(10);
    refresh();
  }, [versionControl, refresh]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (!prev) return [id, id];
      if (prev[0] === id) return null;
      if (prev[1] === id) return [prev[0], prev[0]];
      return [prev[0], id];
    });
    setDiffResult(null);
  }, []);

  // ── Format helpers ──────────────────────────────────────────────────

  const formatTime = (ts: number): string => {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const timeAgo = (ts: number): string => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col bg-white border-l w-72 ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">Version History</h3>
        <p className="text-xs text-gray-400 mt-0.5">{versions.length} version{versions.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-gray-50">
        <button onClick={handleExport} className="px-2 py-0.5 text-xs rounded hover:bg-gray-200" title="Export versions">
          Export
        </button>
        <button onClick={() => { setShowImport(true); fileInputRef.current?.click(); }}
          className="px-2 py-0.5 text-xs rounded hover:bg-gray-200" title="Import versions">
          Import
        </button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        {selectedIds && selectedIds[0] !== selectedIds[1] && (
          <button onClick={handleDiff} className="px-2 py-0.5 text-xs rounded bg-blue-50 hover:bg-blue-100 text-blue-600">
            Diff
          </button>
        )}
        <div className="flex-1" />
        <button onClick={handlePrune} className="px-2 py-0.5 text-xs rounded hover:bg-red-100 text-red-500" title="Keep last 10 versions">
          Prune
        </button>
      </div>

      {/* Diff result */}
      {diffResult && (
        <div className="mx-2 mt-2 p-2 bg-blue-50 rounded text-xs border border-blue-200">
          <div className="font-semibold text-blue-700 mb-1">Diff Result</div>
          {diffResult.layersAdded.length > 0 && (
            <div className="text-green-600">+ Layers added: {diffResult.layersAdded.join(', ')}</div>
          )}
          {diffResult.layersRemoved.length > 0 && (
            <div className="text-red-600">− Layers removed: {diffResult.layersRemoved.join(', ')}</div>
          )}
          {diffResult.layersModified.map(lm => (
            <div key={lm.layerName} className="text-amber-600">
              ~ {lm.layerName}: +{lm.commandsAdded} −{lm.commandsRemoved}
              {lm.colorChanged ? ' [color]' : ''}
              {lm.visibilityChanged ? ' [vis]' : ''}
            </div>
          ))}
          {diffResult.metadataChanged.length > 0 && (
            <div className="text-gray-600">Metadata: {diffResult.metadataChanged.join(', ')}</div>
          )}
          <button onClick={() => setDiffResult(null)} className="mt-1 text-blue-500 hover:underline">
            Close
          </button>
        </div>
      )}

      {/* Version list */}
      <div className="flex-1 overflow-y-auto">
        {versions.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400">
            No versions saved yet.<br />Press Ctrl+S to save.
          </div>
        ) : (
          versions.map(v => {
            const isCurrent = v.id === currentId;
            const isSelected = selectedIds?.includes(v.id);

            return (
              <div
                key={v.id}
                className={`flex gap-2 px-3 py-2 border-b cursor-pointer transition-colors ${
                  isCurrent ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                } ${isSelected ? 'bg-yellow-50' : ''} hover:bg-gray-50`}
                onClick={() => toggleSelect(v.id)}
              >
                {/* Thumbnail */}
                <div className="w-16 h-11 bg-gray-100 rounded border flex-shrink-0 overflow-hidden">
                  {v.thumbnail && (
                    <img src={v.thumbnail} alt="Version thumbnail"
                      className="w-full h-full object-contain" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-gray-700 truncate">
                      {v.description || 'Untitled snapshot'}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] px-1 rounded bg-blue-100 text-blue-600 flex-shrink-0">
                        current
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {formatTime(v.timestamp)} · {timeAgo(v.timestamp)}
                  </div>
                  {v.tags.length > 0 && (
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {v.tags.map(tag => (
                        <span key={tag} className="text-[9px] px-1 rounded bg-gray-100 text-gray-500">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Restore button */}
                  {!isCurrent && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRestore(v.id); }}
                      className="mt-1 text-[10px] px-2 py-0.5 rounded bg-gray-100 hover:bg-blue-100 text-blue-600"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t bg-gray-50 text-[10px] text-gray-400">
        Ctrl+Z Undo · Ctrl+Y Redo · Ctrl+S Save
      </div>
    </div>
  );
}
