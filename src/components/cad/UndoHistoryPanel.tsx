"use client";
import { useState } from "react";
import { useCadStore } from "@/stores/cad-store";
import { History, ChevronDown, ChevronUp, Undo2, Redo2, X } from "lucide-react";

/**
 * Visual undo history panel - shows all operations with ability to jump to any state.
 * SolidWorks-style history browser with rollback capability.
 */
export default function UndoHistoryPanel({ onClose }: { onClose: () => void }) {
  const undoStack = useCadStore((s) => s.undoStack);
  const redoStack = useCadStore((s) => s.redoStack);
  const undo = useCadStore((s) => s.undo);
  const redo = useCadStore((s) => s.redo);
  const [collapsed, setCollapsed] = useState(false);

  // Build operation list from undo/redo stacks
  const operations = undoStack.map((state, index) => {
    const prevState = index > 0 ? undoStack[index - 1] : null;
    const objCount = state.objects.length;
    const prevCount = prevState ? prevState.objects.length : 0;

    let opType = "Modified";
    let opColor = "#3b82f6";
    if (objCount > prevCount) { opType = "Added"; opColor = "#22c55e"; }
    else if (objCount < prevCount) { opType = "Deleted"; opColor = "#ef4444"; }

    const latestObj = state.objects[state.objects.length - 1];
    const label = latestObj
      ? `${opType} ${latestObj.name || latestObj.type}`
      : `${opType} (${objCount} objects)`;

    return { index, label, opType, opColor, objCount };
  });

  const handleJumpTo = (targetIndex: number) => {
    const stepsBack = undoStack.length - 1 - targetIndex;
    for (let i = 0; i < stepsBack; i++) {
      undo();
    }
  };

  return (
    <div className="absolute top-14 left-3 z-20 pointer-events-auto w-56 animate-scale-in">
      <div className="bg-[#161b22]/97 border border-[#30363d] rounded-lg backdrop-blur-md shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d]">
          <div className="flex items-center gap-1.5">
            <History size={12} className="text-[#00D4FF]" />
            <span className="text-[10px] font-semibold text-slate-300">Undo History</span>
            <span className="text-[8px] text-slate-600 font-mono">({undoStack.length})</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className="p-0.5 rounded hover:bg-[#21262d] text-slate-400 hover:text-white disabled:opacity-20 transition-all"
              title="Undo"
            >
              <Undo2 size={11} />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className="p-0.5 rounded hover:bg-[#21262d] text-slate-400 hover:text-white disabled:opacity-20 transition-all"
              title="Redo"
            >
              <Redo2 size={11} />
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-0.5 rounded hover:bg-[#21262d] text-slate-500 transition-all"
            >
              {collapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
            </button>
            <button onClick={onClose} className="p-0.5 rounded hover:bg-[#21262d] text-slate-500 hover:text-red-400 transition-all">
              <X size={11} />
            </button>
          </div>
        </div>

        {/* Operations list */}
        {!collapsed && (
          <div className="max-h-60 overflow-y-auto py-1">
            {operations.length === 0 && (
              <div className="px-3 py-4 text-center text-[10px] text-slate-600">No operations yet</div>
            )}

            {/* Current state indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#00D4FF]/5">
              <div className="w-2 h-2 rounded-full bg-[#00D4FF] shadow-[0_0_4px_rgba(0,212,255,0.4)]" />
              <span className="text-[9px] text-[#00D4FF] font-semibold">Current State</span>
              <span className="text-[8px] text-slate-600 ml-auto font-mono">{undoStack.length > 0 ? undoStack[undoStack.length - 1].objects.length : 0} objs</span>
            </div>

            {/* Undo stack (reverse order - most recent first) */}
            {[...operations].reverse().map((op) => (
              <button
                key={op.index}
                onClick={() => handleJumpTo(op.index)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#21262d]/50 transition-all"
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: op.opColor }} />
                <span className="text-[9px] text-slate-400 truncate flex-1">{op.label}</span>
                <span className="text-[7px] text-slate-600 font-mono">#{op.index + 1}</span>
              </button>
            ))}

            {/* Redo stack (grayed out future states) */}
            {redoStack.length > 0 && (
              <>
                <div className="border-t border-[#21262d] mx-2 my-1" />
                <div className="px-3 py-1 text-[7px] text-slate-600 uppercase tracking-wider font-semibold">
                  Redo ({redoStack.length})
                </div>
                {redoStack.map((state, i) => (
                  <button
                    key={`redo-${i}`}
                    onClick={redo}
                    className="w-full flex items-center gap-2 px-3 py-1 text-left hover:bg-[#21262d]/30 transition-all opacity-40"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    <span className="text-[9px] text-slate-600 truncate flex-1">
                      {state.objects.length} objects
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
