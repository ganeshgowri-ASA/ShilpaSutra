"use client";
// ─── Template Workflow Guide ──────────────────────────────────────────────────
// Shows a 5-step design→analysis→export workflow for any PV template,
// with navigation buttons that route to the correct app page with URL params.

import React from "react";
import { FileImage, Box, FlaskConical, Wind, Download, ChevronRight } from "lucide-react";
import type { PVTemplate } from "@/lib/pvTestingTemplates";

interface WorkflowStep {
  step: number;
  icon: React.ReactNode;
  label: string;
  detail: string;
  tooltip: string;
  href: string;
  cls: string;
}

// ── Build CFD URL params per template ────────────────────────────────────────
function cfdParams(id: string): Record<string, string> {
  if (id.includes('uv_conditioning'))      return { temp: '60', airflow: '0.5' };
  if (id.includes('thermal_cycling'))      return { temp_max: '85', airflow: '2.0' };
  if (id.includes('humidity_freeze'))      return { temp_max: '85', rh: '85' };
  if (id.includes('salt_mist'))            return { temp: '35', spray: '1' };
  if (id.includes('simulator') ||
      id.includes('iv_curve'))             return { temp: '25', airflow: '1.0' };
  if (id.includes('array') ||
      id.includes('ground_pv'))            return { wind_speed: '11', temp: '45' };
  return { temp: '25', airflow: '0.5' };
}

// ── Build FEA URL params per template ────────────────────────────────────────
function feaParams(id: string): Record<string, string> {
  if (id.includes('mechanical_load'))  return { pressure: '5400', load: 'uniform' };
  if (id.includes('hail'))             return { impact: '227', velocity: '23' };
  if (id.includes('thermal_cycling'))  return { temp_min: '-40', temp_max: '85' };
  if (id.includes('humidity_freeze'))  return { temp_min: '-40', temp_max: '85' };
  if (id.includes('array') ||
      id.includes('ground_pv'))        return { wind_pressure: '2400', snow: '1000' };
  if (id.includes('frame'))            return { wind_pressure: '2400' };
  return { pressure: '1000' };
}

// ── Gather top 3 numeric param defaults as drawing dimensions ─────────────────
function drawingParams(template: PVTemplate): Record<string, string> {
  const out: Record<string, string> = {};
  let count = 0;
  for (const p of template.params) {
    if (p.type === 'number' && count < 3) {
      out[p.key] = String(p.default);
      count++;
    }
  }
  return out;
}

// ── Assemble the 5 workflow steps ─────────────────────────────────────────────
function buildSteps(template: PVTemplate): WorkflowStep[] {
  const id = template.id;
  const name = encodeURIComponent(id);

  const drawUrl = `/drawings?template=${name}&${new URLSearchParams(drawingParams(template))}`;
  const feaUrl  = `/fea-advanced?${new URLSearchParams({ template: id, ...feaParams(id) })}`;
  const cfdUrl  = `/cfd-advanced?${new URLSearchParams({ template: id, ...cfdParams(id) })}`;

  return [
    {
      step: 1,
      icon: <FileImage size={12} />,
      label: 'Generate 2D',
      detail: 'Opens /drawings with template dims pre-filled (front/top/side views)',
      tooltip: 'Engineering drawing with GD&T annotations',
      href: drawUrl,
      cls: 'text-sky-400 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/25',
    },
    {
      step: 2,
      icon: <Box size={12} />,
      label: 'Generate 3D',
      detail: 'Inserts solid geometry into the current CAD viewport',
      tooltip: 'Parametric 3D model via KCL script',
      href: `/designer?template=${name}`,
      cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/25',
    },
    {
      step: 3,
      icon: <FlaskConical size={12} />,
      label: 'Send to FEA',
      detail: 'Navigates to /fea-advanced with template geometry + default BCs',
      tooltip: 'Structural analysis (e.g. 5400 Pa for Mech Load, wind + snow for arrays)',
      href: feaUrl,
      cls: 'text-orange-400 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/25',
    },
    {
      step: 4,
      icon: <Wind size={12} />,
      label: 'Send to CFD',
      detail: 'Navigates to /cfd-advanced with airflow/thermal boundary conditions',
      tooltip: 'CFD analysis (e.g. 60°C / 0.5 m/s for UV Chamber)',
      href: cfdUrl,
      cls: 'text-violet-400 border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/25',
    },
    {
      step: 5,
      icon: <Download size={12} />,
      label: 'Export PDF',
      detail: 'Multi-view PDF drawing package with BOM',
      tooltip: 'Exports STEP, DXF and annotated PDF drawing set',
      href: `/export?template=${name}&format=pdf`,
      cls: 'text-rose-400 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/25',
    },
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TemplateWorkflowGuide({ template }: { template: PVTemplate }) {
  const steps = buildSteps(template);

  return (
    <div className="p-4 space-y-1.5">
      <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider mb-3">
        Design → Analysis → Export Pipeline
      </div>

      {steps.map((s, idx) => (
        <div key={s.step} className="flex items-start gap-3">
          {/* Numbered connector */}
          <div className="flex flex-col items-center shrink-0 pt-0.5">
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold ${s.cls}`}>
              {s.step}
            </div>
            {idx < steps.length - 1 && (
              <div className="w-px h-3 bg-[#21262d] mt-0.5" />
            )}
          </div>

          {/* Step content */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-200">{s.label}</span>
              <a
                href={s.href}
                title={s.tooltip}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${s.cls}`}
              >
                {s.icon}
                {s.label}
                <ChevronRight size={9} />
              </a>
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">{s.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
