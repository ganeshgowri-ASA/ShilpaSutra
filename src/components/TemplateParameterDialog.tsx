"use client";

// ─── Template Parameter Dialog ────────────────────────────────────────────────
// Dynamic parameter form for solar PV templates with real-time derived-value
// preview and manufacturer module presets.

import { useState, useMemo, useCallback } from "react";
import {
  SOLAR_TEMPLATES,
  buildDefaultInputs,
  type SolarTemplate,
  type DerivedResults,
} from "@/lib/solar-templates";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateParameterDialogProps {
  templateId: string;
  onClose: () => void;
  onGenerate: (templateId: string, inputs: Record<string, number | string | boolean>, derived: DerivedResults) => void;
}

// ─── Derived Results Card ─────────────────────────────────────────────────────

function DerivedResultsCard({ derived }: { derived: DerivedResults }) {
  const stats = [
    { label: "DC Capacity", value: derived.dcCapacityKWp >= 1000 ? `${(derived.dcCapacityKWp / 1000).toFixed(2)} MWp` : `${derived.dcCapacityKWp.toFixed(1)} kWp` },
    { label: "Total Modules", value: derived.totalModules.toLocaleString() },
    { label: "Land Area", value: derived.totalAreaM2 >= 10000 ? `${(derived.totalAreaM2 / 10000).toFixed(2)} ha` : `${derived.totalAreaM2.toFixed(0)} m²` },
    { label: "GCR", value: derived.gcr > 0 ? derived.gcr.toFixed(2) : "—" },
    { label: "Row Pitch", value: derived.rowPitchM > 0 ? `${derived.rowPitchM.toFixed(2)} m` : "—" },
    { label: "Clear Spacing", value: derived.interRowSpacingM > 0 ? `${derived.interRowSpacingM.toFixed(2)} m` : "—" },
    ...(derived.frontLegHeightM !== undefined ? [{ label: "Front Post", value: `${derived.frontLegHeightM} m` }] : []),
    ...(derived.rearLegHeightM !== undefined ? [{ label: "Rear Post", value: `${derived.rearLegHeightM.toFixed(2)} m` }] : []),
    ...(derived.inverterSizeKW !== undefined ? [{ label: "Inverter", value: `${derived.inverterSizeKW} kW` }] : []),
    ...(derived.stringCount !== undefined ? [{ label: "Strings", value: derived.stringCount.toString() }] : []),
    ...(derived.combinerBoxCount !== undefined ? [{ label: "Combiner Boxes", value: derived.combinerBoxCount.toString() }] : []),
  ];

  return (
    <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
        Calculated Results
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-white/5 px-3 py-2">
            <p className="text-[10px] text-zinc-400">{s.label}</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{s.value}</p>
          </div>
        ))}
      </div>
      {derived.notes.length > 0 && (
        <ul className="mt-3 space-y-1">
          {derived.notes.map((n, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-400">
              <span className="mt-0.5 text-amber-400">›</span>
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Single Parameter Field ───────────────────────────────────────────────────

interface ParamFieldProps {
  param: SolarTemplate["params"][number];
  value: number | string | boolean;
  onChange: (key: string, val: number | string | boolean) => void;
}

function ParamField({ param, value, onChange }: ParamFieldProps) {
  if (param.type === "boolean") {
    return (
      <label className="flex cursor-pointer items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 hover:border-amber-500/50">
        <span className="text-sm text-zinc-200">{param.label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={!!value}
          onClick={() => onChange(param.key, !value)}
          className={`relative h-5 w-9 rounded-full transition-colors ${value ? "bg-amber-500" : "bg-zinc-600"}`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`}
          />
        </button>
      </label>
    );
  }

  if (param.type === "select" && param.options) {
    return (
      <div>
        <label className="mb-1 block text-xs text-zinc-400">{param.label}</label>
        <select
          value={String(value)}
          onChange={(e) => onChange(param.key, e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none"
        >
          {param.options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // number
  const numVal = Number(value);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs text-zinc-400">{param.label}</label>
        <span className="text-xs font-medium text-amber-400">
          {numVal} {param.unit}
        </span>
      </div>
      <input
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={numVal}
        onChange={(e) => onChange(param.key, parseFloat(e.target.value))}
        className="w-full accent-amber-500"
      />
      <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
        <span>{param.min} {param.unit}</span>
        <span>{param.max} {param.unit}</span>
      </div>
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export default function TemplateParameterDialog({
  templateId,
  onClose,
  onGenerate,
}: TemplateParameterDialogProps) {
  const template = useMemo(() => SOLAR_TEMPLATES.find(t => t.id === templateId), [templateId]);
  const [inputs, setInputs] = useState<Record<string, number | string | boolean>>(
    () => template ? buildDefaultInputs(template) : {}
  );

  const handleChange = useCallback((key: string, val: number | string | boolean) => {
    setInputs(prev => ({ ...prev, [key]: val }));
  }, []);

  const derived = useMemo(() => {
    if (!template) return null;
    try { return template.calculateDerived(inputs); }
    catch { return null; }
  }, [template, inputs]);

  const handleGenerate = useCallback(() => {
    if (!template || !derived) return;
    onGenerate(templateId, inputs, derived);
    onClose();
  }, [template, derived, templateId, inputs, onGenerate, onClose]);

  if (!template) return null;

  // Split params: non-derived first (editable), then any derived display
  const editableParams = template.params.filter(p => !p.derived);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              Solar Template
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-white">{template.name}</h2>
            <p className="mt-1 text-xs text-zinc-400">{template.description}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {editableParams.map((param) => (
              <ParamField
                key={param.key}
                param={param}
                value={inputs[param.key] ?? param.default}
                onChange={handleChange}
              />
            ))}
          </div>

          {derived && <DerivedResultsCard derived={derived} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!derived}
            className="rounded-lg bg-amber-500 px-6 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
          >
            Generate in Designer →
          </button>
        </div>
      </div>
    </div>
  );
}
