"use client";
import { useEffect, useState } from "react";
import { X, Keyboard } from "lucide-react";
import { useCadStore } from "@/stores/cad-store";

const shortcutGroups = [
  {
    title: "General",
    shortcuts: [
      { keys: ["Ctrl", "K"], desc: "Command Palette" },
      { keys: ["?"], desc: "Keyboard Shortcuts" },
      { keys: ["Ctrl", "S"], desc: "Save Project" },
      { keys: ["Ctrl", "Z"], desc: "Undo" },
      { keys: ["Ctrl", "Y"], desc: "Redo" },
      { keys: ["Ctrl", "Shift", "Z"], desc: "Redo (alternate)" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["Alt", "N"], desc: "New Design" },
      { keys: ["Alt", "O"], desc: "Open File" },
      { keys: ["Alt", "I"], desc: "Import Model" },
      { keys: ["Alt", "S"], desc: "Start Simulation" },
      { keys: ["Alt", "T"], desc: "Text to CAD" },
    ],
  },
  {
    title: "3D Viewport",
    shortcuts: [
      { keys: ["F"], desc: "Focus / Fit to View" },
      { keys: ["1"], desc: "Front View" },
      { keys: ["2"], desc: "Back View" },
      { keys: ["3"], desc: "Left View" },
      { keys: ["4"], desc: "Right View" },
      { keys: ["5"], desc: "Top View" },
      { keys: ["6"], desc: "Bottom View" },
      { keys: ["0"], desc: "Isometric View" },
    ],
  },
  {
    title: "CAD Tools",
    shortcuts: [
      { keys: ["E"], desc: "Extrude" },
      { keys: ["R"], desc: "Revolve" },
      { keys: ["L"], desc: "Line Tool" },
      { keys: ["C"], desc: "Circle Tool" },
      { keys: ["B"], desc: "Boolean Operation" },
      { keys: ["M"], desc: "Measure / Distance" },
      { keys: ["Delete"], desc: "Delete Selected" },
    ],
  },
];

export default function KeyboardShortcuts() {
  const [visible, setVisible] = useState(false);
  const undo = useCadStore((s) => s.undo);
  const redo = useCadStore((s) => s.redo);
  const canUndo = useCadStore((s) => s.canUndo);
  const canRedo = useCadStore((s) => s.canRedo);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";

      // Ctrl+Z → Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        if (inInput) return;
        e.preventDefault();
        if (canUndo()) undo();
        return;
      }

      // Ctrl+Y → Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        if (inInput) return;
        e.preventDefault();
        if (canRedo()) redo();
        return;
      }

      // Ctrl+Shift+Z → Redo (alternate)
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        if (inInput) return;
        e.preventDefault();
        if (canRedo()) redo();
        return;
      }

      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (inInput) return;
        e.preventDefault();
        setVisible(v => !v);
      }
      if (e.key === "Escape" && visible) {
        setVisible(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, undo, redo, canUndo, canRedo]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setVisible(false)}>
      <div
        className="bg-[#161b22] border border-[#21262d] rounded-2xl shadow-2xl w-[700px] max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d]">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-[#00D4FF]" />
            <h2 className="text-base font-bold text-white">Keyboard Shortcuts</h2>
          </div>
          <button onClick={() => setVisible(false)} className="text-slate-400 hover:text-white transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)] grid grid-cols-2 gap-6">
          {shortcutGroups.map(group => (
            <div key={group.title}>
              <h3 className="text-[10px] font-bold text-[#00D4FF] uppercase tracking-widest mb-3">{group.title}</h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-xs text-slate-300">{s.desc}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, j) => (
                        <span key={j}>
                          <kbd className="bg-[#0d1117] border border-[#30363d] text-slate-300 text-[10px] font-mono px-1.5 py-0.5 rounded shadow-sm min-w-[24px] text-center inline-block">
                            {k}
                          </kbd>
                          {j < s.keys.length - 1 && <span className="text-slate-600 text-[10px] mx-0.5">+</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#21262d] text-center">
          <span className="text-[10px] text-slate-500">
            Press <kbd className="bg-[#0d1117] border border-[#30363d] text-slate-400 text-[10px] font-mono px-1 py-0.5 rounded mx-0.5">?</kbd> to toggle this overlay
          </span>
        </div>
      </div>
    </div>
  );
}
