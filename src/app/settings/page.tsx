"use client";
import { useSettingsStore } from "@/stores/settings-store";
import { useState } from "react";

const shortcuts = [
  ["Ctrl+K", "Command Bar"],
  ["Ctrl+S", "Save Project"],
  ["Ctrl+Z", "Undo"],
  ["Ctrl+Shift+Z", "Redo"],
  ["Ctrl+E", "Toggle KCL Editor"],
  ["Ctrl+G", "Toggle Grid"],
  ["Ctrl+N", "New Design"],
  ["F", "Fit to View"],
  ["Esc", "Cancel / Deselect"],
  ["Delete", "Delete Selected"],
  ["Space", "Toggle AI Chat"],
  ["Ctrl+Shift+E", "Export Model"],
] as const;

export default function SettingsPage() {
  const settings = useSettingsStore();
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState("general");

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sections = [
    { id: "general", label: "General", icon: "G" },
    { id: "viewport", label: "3D Viewport", icon: "3D" },
    { id: "ai", label: "AI Settings", icon: "AI" },
    { id: "export", label: "Export", icon: "Ex" },
    { id: "shortcuts", label: "Shortcuts", icon: "K" },
    { id: "about", label: "About", icon: "i" },
  ];

  return (
    <div className="flex h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* Settings Sidebar */}
      <div className="w-52 bg-[#161b22] border-r border-[#21262d] flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b border-[#21262d]">
          <h1 className="text-sm font-bold text-[#00D4FF]">Settings</h1>
          <p className="text-[10px] text-slate-500 mt-0.5">Preferences & Configuration</p>
        </div>
        <div className="flex-1 py-2 space-y-0.5 px-2">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
                activeSection === s.id
                  ? "bg-[#00D4FF]/10 text-[#00D4FF] border-l-2 border-[#00D4FF]"
                  : "text-slate-400 hover:text-white hover:bg-[#21262d]"
              }`}
            >
              <span className="w-6 h-6 rounded bg-[#21262d] flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                {s.icon}
              </span>
              {s.label}
            </button>
          ))}
        </div>
        <div className="px-3 py-3 border-t border-[#21262d] space-y-2">
          <button
            onClick={handleSave}
            className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
              saved
                ? "bg-green-600 text-white"
                : "bg-[#00D4FF] hover:bg-[#00b8d9] text-black shadow-lg shadow-[#00D4FF]/20"
            }`}
          >
            {saved ? "Saved!" : "Save All"}
          </button>
          <button
            onClick={() => {
              settings.reset();
            }}
            className="w-full bg-[#21262d] hover:bg-[#30363d] py-2 rounded-lg text-xs text-slate-400 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-6">
          {/* General */}
          {activeSection === "general" && (
            <div className="space-y-6">
              <SectionHeader title="General" desc="App-wide preferences and defaults" />
              <SettingRow label="Theme" desc="App color scheme">
                <SelectInput
                  value={settings.theme}
                  onChange={(v) => settings.update({ theme: v as "dark" | "light" | "system" })}
                  options={[
                    { value: "dark", label: "Dark" },
                    { value: "light", label: "Light" },
                    { value: "system", label: "System" },
                  ]}
                />
              </SettingRow>
              <SettingRow label="Language" desc="Interface language">
                <SelectInput
                  value={settings.language}
                  onChange={(v) => settings.update({ language: v })}
                  options={[
                    { value: "en", label: "English" },
                    { value: "hi", label: "Hindi" },
                    { value: "de", label: "German" },
                    { value: "ja", label: "Japanese" },
                    { value: "zh", label: "Chinese" },
                  ]}
                />
              </SettingRow>
              <SettingRow label="Auto-save Interval" desc="How often to auto-save your work">
                <SelectInput
                  value={settings.autoSaveInterval}
                  onChange={(v) => settings.update({ autoSaveInterval: v })}
                  options={[
                    { value: "off", label: "Off" },
                    { value: "1min", label: "1 min" },
                    { value: "5min", label: "5 min" },
                    { value: "10min", label: "10 min" },
                  ]}
                />
              </SettingRow>
              <SettingRow label="Default Units" desc="Measurement units for new designs">
                <SelectInput
                  value={settings.defaultUnits}
                  onChange={(v) => settings.update({ defaultUnits: v })}
                  options={[
                    { value: "mm", label: "Millimeters (mm)" },
                    { value: "cm", label: "Centimeters (cm)" },
                    { value: "m", label: "Meters (m)" },
                    { value: "inch", label: "Inches (in)" },
                  ]}
                />
              </SettingRow>
              <SettingRow label="Angle Units" desc="Units for angular measurements">
                <SelectInput
                  value={settings.angleUnits}
                  onChange={(v) => settings.update({ angleUnits: v })}
                  options={[
                    { value: "deg", label: "Degrees" },
                    { value: "rad", label: "Radians" },
                  ]}
                />
              </SettingRow>
            </div>
          )}

          {/* Viewport */}
          {activeSection === "viewport" && (
            <div className="space-y-6">
              <SectionHeader title="3D Viewport" desc="Rendering and display settings" />
              <SettingRow label="Default Grid Size" desc="Grid spacing in current units">
                <NumberInput
                  value={settings.gridSize}
                  onChange={(v) => settings.update({ gridSize: v })}
                  min={1}
                  max={100}
                  step={1}
                />
              </SettingRow>
              <SettingRow label="Snap Precision" desc="Grid snap resolution">
                <NumberInput
                  value={settings.snapPrecision}
                  onChange={(v) => settings.update({ snapPrecision: v })}
                  min={0.1}
                  max={10}
                  step={0.1}
                />
              </SettingRow>
              <SettingRow label="Anti-aliasing" desc="Rendering quality vs performance">
                <SelectInput
                  value={settings.antiAliasing}
                  onChange={(v) => settings.update({ antiAliasing: v })}
                  options={[
                    { value: "off", label: "Off" },
                    { value: "low", label: "Low (2x MSAA)" },
                    { value: "medium", label: "Medium (4x MSAA)" },
                    { value: "high", label: "High (8x MSAA)" },
                  ]}
                />
              </SettingRow>
              <SettingRow label="Projection" desc="Camera projection mode">
                <SelectInput
                  value={settings.perspectiveMode}
                  onChange={(v) => settings.update({ perspectiveMode: v })}
                  options={[
                    { value: "perspective", label: "Perspective" },
                    { value: "orthographic", label: "Orthographic" },
                  ]}
                />
              </SettingRow>
              <SettingRow label="Show Grid" desc="Display grid in viewport">
                <ToggleSwitch
                  value={settings.showGrid}
                  onChange={(v) => settings.update({ showGrid: v })}
                />
              </SettingRow>
              <SettingRow label="Show Axes" desc="Display XYZ axes indicator">
                <ToggleSwitch
                  value={settings.showAxes}
                  onChange={(v) => settings.update({ showAxes: v })}
                />
              </SettingRow>
            </div>
          )}

          {/* AI */}
          {activeSection === "ai" && (
            <div className="space-y-6">
              <SectionHeader title="AI Settings" desc="Model selection and API configuration" />
              <SettingRow label="Default AI Model" desc="Model used for text-to-CAD generation">
                <SelectInput
                  value={settings.aiModel}
                  onChange={(v) => settings.update({ aiModel: v })}
                  options={[
                    { value: "claude-sonnet", label: "Claude Sonnet" },
                    { value: "claude-opus", label: "Claude Opus" },
                    { value: "gpt-4o", label: "GPT-4o" },
                    { value: "gemini-pro", label: "Gemini Pro" },
                  ]}
                />
              </SettingRow>
              <SettingRow label="Anthropic API Key" desc="For Claude models">
                <MaskedInput
                  value={settings.apiKeyAnthropic}
                  onChange={(v) => settings.update({ apiKeyAnthropic: v })}
                  placeholder="sk-ant-..."
                />
              </SettingRow>
              <SettingRow label="OpenAI API Key" desc="For GPT models">
                <MaskedInput
                  value={settings.apiKeyOpenAI}
                  onChange={(v) => settings.update({ apiKeyOpenAI: v })}
                  placeholder="sk-..."
                />
              </SettingRow>
              <SettingRow label="Google AI API Key" desc="For Gemini models">
                <MaskedInput
                  value={settings.apiKeyGoogle}
                  onChange={(v) => settings.update({ apiKeyGoogle: v })}
                  placeholder="AIza..."
                />
              </SettingRow>
              <SettingRow label="Temperature" desc="Creativity vs precision (0-1)">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={settings.temperature}
                    onChange={(e) => settings.update({ temperature: parseFloat(e.target.value) })}
                    className="w-32 h-1 bg-[#21262d] rounded-lg appearance-none cursor-pointer accent-[#00D4FF]"
                  />
                  <span className="text-xs text-[#00D4FF] font-mono w-8">{settings.temperature}</span>
                </div>
              </SettingRow>
              <SettingRow label="Max Tokens" desc="Maximum output length">
                <NumberInput
                  value={settings.maxTokens}
                  onChange={(v) => settings.update({ maxTokens: v })}
                  min={256}
                  max={16384}
                  step={256}
                />
              </SettingRow>
            </div>
          )}

          {/* Export */}
          {activeSection === "export" && (
            <div className="space-y-6">
              <SectionHeader title="Export Defaults" desc="Default settings for file exports" />
              <SettingRow label="Default Format" desc="Preferred export file format">
                <SelectInput
                  value={settings.defaultExportFormat}
                  onChange={(v) => settings.update({ defaultExportFormat: v })}
                  options={[
                    { value: "STEP", label: "STEP (.stp)" },
                    { value: "STL", label: "STL (.stl)" },
                    { value: "OBJ", label: "OBJ (.obj)" },
                    { value: "IGES", label: "IGES (.igs)" },
                    { value: "glTF", label: "glTF (.gltf)" },
                  ]}
                />
              </SettingRow>
              <SettingRow label="Mesh Quality" desc="Tessellation quality for mesh exports">
                <SelectInput
                  value={settings.meshQuality}
                  onChange={(v) => settings.update({ meshQuality: v })}
                  options={[
                    { value: "low", label: "Low (fast)" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High (detailed)" },
                  ]}
                />
              </SettingRow>
              <SettingRow label="Include Metadata" desc="Embed material, author, date in exports">
                <ToggleSwitch
                  value={settings.includeMetadata}
                  onChange={(v) => settings.update({ includeMetadata: v })}
                />
              </SettingRow>
            </div>
          )}

          {/* Shortcuts */}
          {activeSection === "shortcuts" && (
            <div className="space-y-6">
              <SectionHeader title="Keyboard Shortcuts" desc="Quick access to common actions" />
              <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
                <div className="grid grid-cols-2 gap-px bg-[#21262d]">
                  {shortcuts.map(([key, action]) => (
                    <div
                      key={key}
                      className="bg-[#161b22] flex items-center justify-between px-4 py-2.5"
                    >
                      <span className="text-xs text-slate-300">{action}</span>
                      <kbd className="bg-[#0d1117] border border-[#21262d] px-2.5 py-1 rounded text-[10px] font-mono text-[#00D4FF]">
                        {key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* About */}
          {activeSection === "about" && (
            <div className="space-y-6">
              <SectionHeader title="About" desc="Application information" />
              <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00D4FF] to-[#0090b8] flex items-center justify-center text-white font-black text-lg shadow-lg shadow-[#00D4FF]/20">
                    SS
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">ShilpaSutra</h3>
                    <p className="text-xs text-slate-500">
                      The Formulas of Craftsmanship
                    </p>
                  </div>
                </div>
                <div className="space-y-3 text-xs">
                  <InfoRow label="Version" value="2.0.0" />
                  <InfoRow label="Framework" value="Next.js 14 + React 18" />
                  <InfoRow label="3D Engine" value="Three.js + React Three Fiber" />
                  <InfoRow label="CAD Kernel" value="OpenCASCADE.js (WASM)" />
                  <InfoRow label="Simulation" value="FEM + FVM + ML Surrogates" />
                  <InfoRow label="AI Engine" value="Claude + Multi-model routing" />
                  <InfoRow label="GitHub" value="ganeshgowri-ASA/ShilpaSutra" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Reusable Components ---

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="pb-3 border-b border-[#21262d]">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
    </div>
  );
}

function SettingRow({
  label,
  desc,
  children,
}: {
  label: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#21262d]/50">
      <div>
        <div className="text-sm text-slate-200">{label}</div>
        <div className="text-[10px] text-slate-500 mt-0.5">{desc}</div>
      </div>
      {children}
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#00D4FF] transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || min)}
      min={min}
      max={max}
      step={step}
      className="w-24 bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#00D4FF] transition-colors"
    />
  );
}

function ToggleSwitch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full transition-colors relative ${
        value ? "bg-[#00D4FF]" : "bg-[#21262d]"
      }`}
    >
      <div
        className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform shadow ${
          value ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function MaskedInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-44 bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#00D4FF] transition-colors font-mono"
      />
      <button
        onClick={() => setShow(!show)}
        className="text-[10px] text-slate-500 hover:text-white px-1.5 transition-colors"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-[#21262d]/50">
      <span className="text-slate-500">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
