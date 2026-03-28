// ─── IEC Solar PV Test Equipment Registry ─────────────────────────────────────
// Combines Part 1 (templates 1–5) and Part 2 (templates 6–10) into a single
// registry with category metadata and template-browser integration helpers.

export type { SolidPrimitive, ParametricField, IECTestTemplate } from './pvIECTestTemplates';

import { PV_IEC_TEMPLATES_PART1 } from './pvIECTestTemplates';
import { PV_IEC_TEMPLATES_PART2 } from './pvIECTestTemplates2';
export { PV_IEC_TEMPLATES_PART1 } from './pvIECTestTemplates';
import type { IECTestTemplate } from './pvIECTestTemplates';

// ── Combined registry ─────────────────────────────────────────────────────────
export const PV_IEC_ALL_TEMPLATES: IECTestTemplate[] = [
  ...PV_IEC_TEMPLATES_PART1,
  ...PV_IEC_TEMPLATES_PART2,
];

// ── Category labels for template browser UI ──────────────────────────────────
export const IEC_CATEGORY_LABELS: Record<string, string> = {
  mechanical_test:      'Mechanical Testing',
  environmental_chamber:'Environmental Chambers',
  electrical_test:      'Electrical & EL Testing',
};

// ── Standards reference map ───────────────────────────────────────────────────
export const IEC_STANDARDS_REFERENCE: Record<string, string> = {
  'IEC 61215 MQT 16':         'Mechanical Load – Static and Dynamic',
  'IEC 61215 MQT 8 / EN 61215':'Module Breakage / Hail Impact',
  'IEC 61215 MQT 10 / IEC 62788-7-2': 'UV Conditioning (60 kWh/m²)',
  'IEC 61215 MQT 12':         'Humidity Freeze (−40°C / 85°C / 85% RH)',
  'IEC 61215 MQT 11':         'Thermal Cycling (200 cycles, −40°C to +85°C)',
  'IEC 61701':                'Salt Mist Corrosion (Severity 6)',
  'IEC TS 60904-13':          'Electroluminescence (EL) Imaging',
  'IEC 61730 MST 16':         'Insulation Resistance / Dielectric Withstand',
  'IEC 60904-1 / IEC 60904-9':'IV Curve Measurement / Solar Simulator Class AAA',
  'IEC 61215 MQT 18':         'Bypass Diode Thermal Test',
};

// ── Helper: look up template by id ────────────────────────────────────────────
export function getIECTemplateById(id: string): IECTestTemplate | undefined {
  return PV_IEC_ALL_TEMPLATES.find(t => t.id === id);
}

// ── Helper: filter templates by category ─────────────────────────────────────
export function getIECTemplatesByCategory(category: string): IECTestTemplate[] {
  return PV_IEC_ALL_TEMPLATES.filter(t => t.category === category);
}

// ── Template browser entries (id, name, standard, category, description) ─────
export const IEC_TEMPLATE_BROWSER_ENTRIES = PV_IEC_ALL_TEMPLATES.map(t => ({
  id:          t.id,
  name:        t.name,
  standard:    t.standard,
  category:    t.category,
  categoryLabel: IEC_CATEGORY_LABELS[t.category] ?? t.category,
  description: t.description,
  fieldCount:  t.parametricFields.length,
}));
