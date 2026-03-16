"use client";
import { useState } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const [units, setUnits] = useState("mm");
  const [theme, setTheme] = useState("dark");
  const [gridSnap, setGridSnap] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [renderQuality, setRenderQuality] = useState("high");
  const [aiModel, setAiModel] = useState("claude-sonnet");
  const [exportFormat, setExportFormat] = useState("STEP");
  const [language, setLanguage] = useState("en");

  const sections = [
    {
      title: "General",
      icon: "⚙",
      settings: [
        { label: "Language", type: "select", value: language, onChange: setLanguage, options: ["en", "hi", "de", "ja", "zh"] },
        { label: "Auto-save interval", type: "select", value: autoSave ? "5min" : "off", onChange: (v: string) => setAutoSave(v !== "off"), options: ["off", "1min", "5min", "10min"] },
        { label: "Theme", type: "select", value: theme, onChange: setTheme, options: ["dark", "light", "system"] },
      ]
    },
    {
      title: "Units & Measurement",
      icon: "📏",
      settings: [
        { label: "Default Units", type: "select", value: units, onChange: setUnits, options: ["mm", "cm", "m", "in", "ft"] },
        { label: "Angle Units", type: "select", value: "deg", onChange: () => {}, options: ["deg", "rad"] },
        { label: "Grid Snap", type: "toggle", value: gridSnap, onChange: setGridSnap },
      ]
    },
    {
      title: "3D Viewport",
      icon: "🖥",
      settings: [
        { label: "Render Quality", type: "select", value: renderQuality, onChange: setRenderQuality, options: ["low", "medium", "high", "ultra"] },
        { label: "Show Grid", type: "toggle", value: true, onChange: () => {} },
        { label: "Show Axes", type: "toggle", value: true, onChange: () => {} },
        { label: "Perspective", type: "select", value: "perspective", onChange: () => {}, options: ["perspective", "orthographic"] },
      ]
    },
    {
      title: "AI Engine",
      icon: "🤖",
      settings: [
        { label: "AI Model", type: "select", value: aiModel, onChange: setAiModel, options: ["claude-sonnet", "gpt-4o", "gemini-pro", "deepseek-v3"] },
        { label: "Auto-suggest in KCL", type: "toggle", value: true, onChange: () => {} },
        { label: "AI Chat in Designer", type: "toggle", value: true, onChange: () => {} },
      ]
    },
    {
      title: "Export & Import",
      icon: "📤",
      settings: [
        { label: "Default Export Format", type: "select", value: exportFormat, onChange: setExportFormat, options: ["STEP", "STL", "OBJ", "IGES", "glTF"] },
        { label: "STL Quality (triangles)", type: "select", value: "medium", onChange: () => {}, options: ["low", "medium", "high"] },
        { label: "Include Metadata", type: "toggle", value: true, onChange: () => {} },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      <div className="bg-gradient-to-r from-[#16213e] to-[#0f3460] border-b border-[#0f3460] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-white">← Back</Link>
            <h1 className="text-xl font-bold">⚙ Settings & Preferences</h1>
          </div>
          <button className="bg-[#e94560] hover:bg-[#d63750] px-4 py-2 rounded-lg text-sm font-bold">Save All</button>
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl">
        <div className="space-y-6">
          {sections.map(section => (
            <div key={section.title} className="bg-[#16213e] border border-[#0f3460] rounded-xl p-5">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span>{section.icon}</span> {section.title}
              </h2>
              <div className="space-y-4">
                {section.settings.map((s: any) => (
                  <div key={s.label} className="flex items-center justify-between py-2 border-b border-[#0f3460]/50 last:border-0">
                    <span className="text-sm text-slate-300">{s.label}</span>
                    {s.type === "select" ? (
                      <select
                        value={s.value}
                        onChange={(e) => s.onChange(e.target.value)}
                        className="bg-[#0d1117] border border-[#0f3460] rounded-lg px-3 py-1.5 text-sm text-white"
                      >
                        {s.options.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => s.onChange(!s.value)}
                        className={`w-12 h-6 rounded-full transition-colors ${s.value ? "bg-[#e94560]" : "bg-[#0f3460]"} relative`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${s.value ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Keyboard Shortcuts */}
          <div className="bg-[#16213e] border border-[#0f3460] rounded-xl p-5">
            <h2 className="text-lg font-bold mb-4">⌨ Keyboard Shortcuts</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["Ctrl+K", "Command Bar"],
                ["Ctrl+S", "Save Project"],
                ["Ctrl+Z", "Undo"],
                ["Ctrl+Shift+Z", "Redo"],
                ["Ctrl+E", "Toggle KCL Editor"],
                ["Ctrl+G", "Toggle Grid"],
                ["F", "Fit to View"],
                ["Esc", "Cancel / Deselect"],
                ["Delete", "Delete Selected"],
                ["Space", "Toggle AI Chat"],
              ].map(([key, action]) => (
                <div key={key} className="flex items-center justify-between py-1.5 border-b border-[#0f3460]/30">
                  <span className="text-slate-400">{action}</span>
                  <kbd className="bg-[#0d1117] px-2 py-0.5 rounded text-xs font-mono text-[#e94560]">{key}</kbd>
                </div>
              ))}
            </div>
          </div>

          {/* About */}
          <div className="bg-[#0d1117] border border-[#0f3460] rounded-xl p-5 text-sm text-slate-400">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white font-bold">ShilpaSutra v1.0</span> | शिल्पसूत्र - The Formulas of Craftsmanship
              </div>
              <div>Next.js + Three.js + R3F | B-rep + OpenFOAM + CalculiX</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
