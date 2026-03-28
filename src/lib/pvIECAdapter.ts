// ─── IEC Test Template → PVTemplate Adapter ──────────────────────────────────
// Converts the 10 IEC test equipment templates (geometry-based, metres units)
// into the PVTemplate interface used by PVTestingTemplatePanel (KCL-based).

import { PV_IEC_ALL_TEMPLATES } from './pvIECTestRegistry';
import type { SolidPrimitive } from './pvIECTestTemplates';
import type { PVTemplate, PVTemplateParam } from './pvTestingTemplates';

// ── Lucide icon per IEC template id ──────────────────────────────────────────
const IEC_ICONS: Record<string, string> = {
  iec_mechanical_load_fixture:      'Gauge',
  iec_hail_impact_rig:              'Droplets',
  iec_uv_conditioning_chamber:      'Sun',
  iec_humidity_freeze_chamber:      'Cloud',
  iec_thermal_cycling_chamber:      'Thermometer',
  iec_salt_mist_chamber:            'Wind',
  iec_el_imaging_dark_box:          'Camera',
  iec_hipot_test_bench:             'Zap',
  iec_iv_curve_tracer_station:      'Activity',
  iec_bypass_diode_thermal_fixture: 'Cpu',
};

// ── IEC standard → short badge label ─────────────────────────────────────────
const IEC_BADGE: Record<string, string> = {
  iec_mechanical_load_fixture:      'MQT 16',
  iec_hail_impact_rig:              'MQT 8',
  iec_uv_conditioning_chamber:      'MQT 10',
  iec_humidity_freeze_chamber:      'MQT 12',
  iec_thermal_cycling_chamber:      'MQT 11',
  iec_salt_mist_chamber:            'IEC 61701',
  iec_el_imaging_dark_box:          '60904-13',
  iec_hipot_test_bench:             'MST 16',
  iec_iv_curve_tracer_station:      '60904-1',
  iec_bypass_diode_thermal_fixture: 'MQT 18',
};

// ── Convert one SolidPrimitive to a KCL snippet (positions in mm) ─────────────
function solidToKCL(s: SolidPrimitive, idx: number): string {
  const v = `s${idx}`;
  // IEC geometry is in metres → multiply by 1000 to get mm
  const x = +(s.position.x * 1000).toFixed(1);
  const y = +(s.position.y * 1000).toFixed(1);
  const z = +(s.position.z * 1000).toFixed(1);
  const w = +(s.dimensions.w * 1000).toFixed(1);
  const h = +(s.dimensions.h * 1000).toFixed(1);
  const d = +(s.dimensions.d * 1000).toFixed(1);

  if (s.type === 'box') {
    return `// ${s.label} [${s.material}]
const ${v} = startSketchOn("XY")
  |> rectangle({ center: [${x}, ${z}], width: ${w}, height: ${d} }, %)
  |> extrude(${h}, %)
  |> translate([0, 0, ${y}], %)
`;
  }
  // cylinder: w = outer diameter
  return `// ${s.label} [${s.material}]
const ${v} = startSketchOn("XY")
  |> circle({ center: [${x}, ${z}], radius: ${+(w / 2).toFixed(1)} }, %)
  |> extrude(${h}, %)
  |> translate([0, 0, ${y}], %)
`;
}

// ── Derive a user-friendly step value from field range ────────────────────────
function deriveStep(min: number, max: number): number {
  const r = max - min;
  if (r <= 10)   return 0.5;
  if (r <= 100)  return 1;
  if (r <= 1000) return 10;
  if (r <= 5000) return 50;
  return 100;
}

// ── Main adapter: returns PVTemplate[] wrapping all 10 IEC templates ──────────
export function adaptIECTemplates(): PVTemplate[] {
  return PV_IEC_ALL_TEMPLATES.map((t): PVTemplate => {
    const params: PVTemplateParam[] = t.parametricFields.map((f) => ({
      key:     f.id,
      label:   f.label,
      type:    'number' as const,
      default: f.defaultValue,
      min:     f.min,
      max:     f.max,
      step:    deriveStep(f.min, f.max),
      unit:    f.unit || undefined,
    }));

    const badge = IEC_BADGE[t.id] ?? t.standard;

    return {
      id:          t.id,
      name:        t.name,
      // All IEC test equipment templates go into the "IEC Chambers" category
      category:    'IEC Chambers' as PVTemplate['category'],
      description: `${t.description}`,
      tags: [
        t.standard,
        badge,
        t.category.replace(/_/g, ' '),
        'IEC',
        'test equipment',
        ...t.name.toLowerCase().split(' ').slice(0, 3),
      ],
      thumbnail: IEC_ICONS[t.id] ?? 'Settings',
      params,
      generateKCLScript(inputs) {
        const numP: Record<string, number> = {};
        for (const [k, v] of Object.entries(inputs)) numP[k] = Number(v);
        const prims = t.generateGeometry(numP);
        return [
          `// ${t.name}`,
          `// Standard: ${t.standard}`,
          `// ${prims.length} solid primitives (units: mm)`,
          '',
          ...prims.map((s, i) => solidToKCL(s, i)),
        ].join('\n');
      },
    };
  });
}
