"use client";
import { useEffect, useState } from "react";
import { X, Keyboard } from "lucide-react";

const shortcutGroups = [
  {
    title: "General",
    shortcuts: [
      { keys: ["Ctrl", "K"], desc: "Command Palette" },
      { keys: ["Ctrl", "Shift", "P"], desc: "Search Commands" },
      { keys: ["?"], desc: "Keyboard Shortcuts" },
      { keys: ["Ctrl", "S"], desc: "Save Project" },
      { keys: ["Ctrl", "Z"], desc: "Undo" },
      { keys: ["Ctrl", "Shift", "Z"], desc: "Redo" },
      { keys: ["Ctrl", "D"], desc: "Duplicate" },
      { keys: ["Del"], desc: "Delete Selected" },
      { keys: ["Escape"], desc: "Deselect / Cancel" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["F"], desc: "Focus / Fit to View" },
      { keys: ["1"], desc: "Front View" },
      { keys: ["2"], desc: "Back View" },
      { keys: ["3"], desc: "Right View" },
      { keys: ["4"], desc: "Left View" },
      { keys: ["5"], desc: "Top View" },
      { keys: ["6"], desc: "Bottom View" },
      { keys: ["0"], desc: "Isometric View" },
      { keys: ["MMB"], desc: "Orbit" },
      { keys: ["Shift", "MMB"], desc: "Pan" },
      { keys: ["Scroll"], desc: "Zoom" },
    ],
  },
  {
    title: "Sketch Tools",
    shortcuts: [
      { keys: ["L"], desc: "Line" },
      { keys: ["C"], desc: "Circle" },
      { keys: ["R"], desc: "Rectangle" },
      { keys: ["A"], desc: "Arc" },
      { keys: ["T"], desc: "Trim" },
      { keys: ["X"], desc: "Extend" },
      { keys: ["O"], desc: "Offset" },
      { keys: ["M"], desc: "Mirror (Sketch)" },
      { keys: ["D"], desc: "Dimension" },
      { keys: ["Shift"], desc: "Ortho Lock (hold)" },
      { keys: ["Escape"], desc: "End Drawing" },
    ],
  },
  {
    title: "CAD Operations",
    shortcuts: [
      { keys: ["E"], desc: "Extrude" },
      { keys: ["B"], desc: "Box Primitive" },
      { keys: ["G"], desc: "Toggle Grid" },
      { keys: ["H"], desc: "Hide Selected" },
      { keys: ["W"], desc: "Move Tool" },
      { keys: ["S"], desc: "Scale Tool" },
      { keys: ["Ctrl", "C"], desc: "Copy" },
      { keys: ["Ctrl", "V"], desc: "Paste" },
    ],
  },
  {
    title: "View Controls",
    shortcuts: [
      { keys: ["F5"], desc: "Wireframe" },
      { keys: ["F6"], desc: "Shaded" },
      { keys: ["F7"], desc: "Realistic" },
      { keys: ["F8"], desc: "Ortho Mode Toggle" },
      { keys: ["F9"], desc: "Grid Snap Toggle" },
    ],
  },
  {
    title: "Selection",
    shortcuts: [
      { keys: ["Ctrl", "Click"], desc: "Multi-select" },
      { keys: ["Ctrl", "A"], desc: "Select All" },
      { keys: ["Right Click"], desc: "Context Menu" },
    ],
  },
];

export default function KeyboardShortcuts() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
        e.preventDefault();
        setVisible(v => !v);
      }
      if (e.key === "Escape" && visible) {
        setVisible(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setVisible(false)}>
      <div
        className="bg-[#161b22] border border-[#21262d] rounded-2xl shadow-2xl w-[800px] max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d]">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-[#00D4FF]" />
            <h2 className="text-base font-bold text-white">Keyboard Shortcuts</h2>
            <span className="text-[10px] text-slate-500 bg-[#0d1117] rounded-full px-2 py-0.5 font-mono">
              {shortcutGroups.reduce((acc, g) => acc + g.shortcuts.length, 0)} shortcuts
            </span>
          </div>
          <button onClick={() => setVisible(false)} className="text-slate-400 hover:text-white transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)] grid grid-cols-3 gap-6">
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
            <span className="mx-2 text-slate-700">|</span>
            <kbd className="bg-[#0d1117] border border-[#30363d] text-slate-400 text-[10px] font-mono px-1 py-0.5 rounded mx-0.5">Ctrl+K</kbd> Command Palette
          </span>
        </div>
      </div>
    </div>
  );
}
