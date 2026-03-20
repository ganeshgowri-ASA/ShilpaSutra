"use client";
import { useState } from "react";
import { useCadStore } from "@/stores/cad-store";
import {
  History, ChevronDown, ChevronRight, Undo2, Redo2,
  Box, Cylinder, Circle, Triangle, Minus, Spline, Square,
  GitBranch, RotateCcw, Trash2, Move, RotateCw,
  PanelBottomClose, PanelBottom,
} from "lucide-react";

function getOperationIcon(type: string, size = 12) {
  switch (type) {
    case "box": return <Box size={size} />;
    case "cylinder": return <Cylinder size={size} />;
    case "sphere": return <Circle size={size} />;
    case "cone": return <Triangle size={size} />;
    case "line": return <Minus size={size} />;
    case "arc": return <Spline size={size} />;
    case "circle": return <Circle size={size} />;
    case "rectangle": return <Square size={size} />;
    case "delete": return <Trash2 size={size} />;
    case "move": return <Move size={size} />;
    case "rotate": return <RotateCw size={size} />;
    default: return <GitBranch size={size} />;
  }
}

export default function HistoryTimeline() {
  const undoStack = useCadStore((s) => s.undoStack);
  const redoStack = useCadStore((s) => s.redoStack);
  const undo = useCadStore((s) => s.undo);
  const redo = useCadStore((s) => s.redo);
  const objects = useCadStore((s) => s.objects);

  const [collapsed, setCollapsed] = useState(true);
  const [expanded, setExpanded] = useState(true);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute bottom-14 right-2 z-10 bg-[#1a1a2e]/90 border border-[#16213e] rounded-lg px-2 py-1.5 flex items-center gap-1.5 text-slate-400 hover:text-white hover:border-[#00D4FF]/40 transition-colors backdrop-blur-sm pointer-events-auto"
        title="Show History Timeline"
      >
        <History size={12} />
        <span className="text-[10px]">History ({undoStack.length})</span>
      </button>
    );
  }

  // Build timeline entries from undo stack
  const timelineEntries = undoStack.map((entry, index) => {
    const prevEntry = index > 0 ? undoStack[index - 1] : null;
    const prevCount = prevEntry ? prevEntry.objects.length : 0;
    const curCount = entry.objects.length;

    let operationType = "modify";
    let description = "Modified";

    if (curCount > prevCount) {
      const newObj = entry.objects[entry.objects.length - 1];
      operationType = newObj?.type || "add";
      description = `Added ${newObj?.name || "object"}`;
    } else if (curCount < prevCount) {
      operationType = "delete";
      description = `Deleted ${prevCount - curCount} object(s)`;
    } else {
      // Same count - modification
      const changed = entry.objects.find((obj, i) => {
        const prev = prevEntry?.objects[i];
        if (!prev) return false;
        return JSON.stringify(obj.position) !== JSON.stringify(prev.position) ||
               JSON.stringify(obj.rotation) !== JSON.stringify(prev.rotation) ||
               JSON.stringify(obj.dimensions) !== JSON.stringify(prev.dimensions);
      });
      if (changed) {
        description = `Modified ${changed.name}`;
      }
    }

    return {
      index,
      operationType,
      description,
      objectCount: curCount,
      timestamp: index, // relative position
    };
  });

  const currentIndex = undoStack.length;

  return (
    <div className="absolute bottom-14 right-2 z-10 bg-[#1a1a2e]/95 border border-[#16213e] rounded-lg backdrop-blur-sm shadow-xl pointer-events-auto w-[240px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#16213e]">
        <div className="flex items-center gap-1.5">
          <History size={12} className="text-[#00D4FF]" />
          <span className="text-[11px] font-medium text-slate-300">History</span>
          <span className="text-[10px] text-slate-500">({undoStack.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-[#0f3460] disabled:opacity-30 transition-colors"
            title="Undo"
          >
            <Undo2 size={10} />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-[#0f3460] disabled:opacity-30 transition-colors"
            title="Redo"
          >
            <Redo2 size={10} />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-[#0f3460] transition-colors ml-1"
          >
            <PanelBottomClose size={10} />
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-h-[200px] overflow-y-auto px-1 py-1">
        {/* Current state */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-[#00D4FF]/15 text-[#00D4FF]">
          <div className="w-2 h-2 rounded-full bg-[#00D4FF] shrink-0" />
          <span className="text-[10px] flex-1 truncate">
            Current ({objects.length} objects)
          </span>
        </div>

        {/* Undo stack (reverse order - most recent first) */}
        {[...timelineEntries].reverse().map((entry) => (
          <div
            key={entry.index}
            onClick={() => {
              // Undo to reach this state
              const stepsBack = currentIndex - entry.index - 1;
              for (let i = 0; i < stepsBack; i++) {
                useCadStore.getState().undo();
              }
            }}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer text-slate-400 hover:bg-[#0f3460]/40 hover:text-slate-300 transition-colors group"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0 group-hover:bg-slate-400" />
            <span className="shrink-0 text-slate-500">
              {getOperationIcon(entry.operationType)}
            </span>
            <span className="text-[10px] flex-1 truncate">
              {entry.description}
            </span>
            <span className="text-[9px] text-slate-600">
              #{entry.index + 1}
            </span>
          </div>
        ))}

        {/* Redo stack */}
        {redoStack.length > 0 && (
          <>
            <div className="h-px bg-[#16213e] my-1 mx-2" />
            <div className="text-[9px] text-slate-600 px-2 py-0.5">
              Future ({redoStack.length})
            </div>
            {redoStack.map((entry, i) => (
              <div
                key={`redo_${i}`}
                onClick={() => {
                  const stepsForward = i + 1;
                  for (let j = 0; j < stepsForward; j++) {
                    useCadStore.getState().redo();
                  }
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer text-slate-600 hover:bg-[#0f3460]/30 hover:text-slate-400 transition-colors opacity-60"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" />
                <span className="text-[10px] flex-1 truncate">
                  Redo #{i + 1}
                </span>
              </div>
            ))}
          </>
        )}

        {timelineEntries.length === 0 && redoStack.length === 0 && (
          <div className="text-[10px] text-slate-600 text-center py-3">
            No history yet
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-[#16213e] text-[9px] text-slate-600">
        Ctrl+Z undo \u00B7 Ctrl+Y redo \u00B7 Click to jump
      </div>
    </div>
  );
}
