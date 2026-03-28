"use client";
import { useState } from "react";
import Link from "next/link";
import { FileText, Box, Activity, Wind, Download, ChevronDown, Sun } from "lucide-react";

const OVERVIEW = [
  { icon: FileText, title: "2D Drawings", desc: "Generate front/top/side views with dimensions for fabrication" },
  { icon: Box, title: "3D Modeling", desc: "Build solid parametric models from IEC test chamber templates" },
  { icon: Activity, title: "FEA/Structural", desc: "Simulate mechanical loads, hail impact forces, structural stress" },
  { icon: Wind, title: "CFD/Thermal", desc: "Analyze airflow, temperature distribution in test chambers" },
  { icon: Download, title: "Export & Report", desc: "PDF drawings, STEP files, BOM, IEC compliance reports" },
];

const TEMPLATES = [
  { name: "EL Imaging Camera", std: "IEC TS 60904-13", desc: "InGaAs camera system for electroluminescence imaging of PV modules", fea: "Bracket/optical assembly structural load", cfd: "Sensor cooling thermal management" },
  { name: "IV Curve Tracer", std: "IEC 60904-1", desc: "Current-voltage characteristic measurement at STC conditions", fea: "Vibration analysis for probe/connection assembly", cfd: "Power electronics forced air cooling" },
  { name: "Solar Simulator", std: "IEC 60904-9", desc: "Class AAA xenon light source for indoor PV testing at STC", fea: "Lamp housing structural + thermal expansion stress", cfd: "Lamp cooling airflow, 1.5 m/s forced convection" },
  { name: "Thermal IR Camera", std: "IEC TS 60904-13", desc: "Infrared thermography for hot-spot and cell crack detection", fea: "Tripod/mounting bracket wind and dynamic load", cfd: "Detector Peltier cooling heat rejection analysis" },
  { name: "Pyranometer", std: "IEC 61724-1", desc: "Solar irradiance measurement sensor for monitoring stations", fea: "Wind load on mounting post up to 40 m/s gust", cfd: "Ventilation airflow around dome, 0.1°C accuracy" },
  { name: "PV Module (2000×1000mm)", std: "IEC 61215", desc: "Glass-glass bifacial 60-cell module 2000×1000mm", fea: "5400 Pa uniform load on 2 m² face = 10800 N total", cfd: "Convective HTC on front/back glass surface" },
  { name: "Ground-mounted PV Array", std: "IEC 61215", desc: "24-module array at 23° tilt on galvanised steel posts", fea: "Wind + snow load analysis on full racking structure", cfd: "Wind-driven airflow pattern under module rows" },
  { name: "Mechanical Load Test Fixture", std: "IEC 61215 MQT 16", desc: "Pneumatic pressure bag applying ±5400 Pa to module face", fea: "Frame deflection, glass stress at 5400 Pa uniform load", cfd: "Pressure uniformity distribution across module surface" },
  { name: "Hail Impact Drop Tower", std: "IEC 61215 MQT 8", desc: "227 g ice ball Ø25 mm dropped at 23 m/s impact velocity", fea: "Impact stress analysis: 227 g @ 23 m/s ≈ 60 J energy", cfd: "Air drag on falling ice ball trajectory calculation" },
  { name: "UV Conditioning Chamber", std: "IEC 61215 MQT 10", desc: "15 kWh/m² UV exposure at 60°C for polymer degradation test", fea: "Thermal expansion of aluminium chamber walls at 60°C", cfd: "60°C walls, 0.5 m/s internal forced air circulation" },
  { name: "Humidity Freeze Chamber", std: "IEC 61215 MQT 12", desc: "-40°C to +85°C rapid thermal cycling, 10 cycles minimum", fea: "Thermal stress on door seals and module frame joints", cfd: "-40°C to 85°C ramp, refrigeration heat exchanger CFD" },
  { name: "Thermal Cycling Chamber", std: "IEC 61215 MQT 11", desc: "200 cycles -40°C to +85°C at 85°C/85%RH damp heat", fea: "Bracket fatigue under 200+ thermal expansion cycles", cfd: "85°C/85%RH airflow pattern, module surface HTC calc" },
  { name: "Salt Mist Chamber", std: "IEC 61701", desc: "NaCl 5% spray at 35°C, 96 hours corrosion testing", fea: "Structural integrity post-corrosion fatigue analysis", cfd: "Salt mist spray plume, nozzle distribution pattern" },
  { name: "EL Imaging Dark Box", std: "IEC TS 60904-13", desc: "Light-tight enclosure for full-module EL photography", fea: "Frame and door seal load + door hinge stress", cfd: "Internal temperature uniformity in dark enclosure" },
  { name: "HiPot Test Bench", std: "IEC 61730 MST 16", desc: "1000 V + 2×Voc dielectric withstand test bench", fea: "Insulation bracket and HV terminal stress analysis", cfd: "Resistive heating dissipation in current-limiting probes" },
  { name: "IV Curve Tracer Station", std: "IEC 60904-1", desc: "Full-module IV curve measurement under solar simulator flash", fea: "Contact force distribution on bus-bar connections", cfd: "Flash lamp thermal pulse and cooling time analysis" },
  { name: "Bypass Diode Thermal Fixture", std: "IEC 61215 MQT 18", desc: "1.25×Isc thermal test, 1 hour continuous at Isc bypass", fea: "Junction box mounting under 1.25×Isc mechanical load", cfd: "Diode junction temperature rise, max 70°C limit" },
];

const IEC_TABLE = [
  ["Mechanical Load","IEC 61215 MQT 16","±5400 Pa","Load frame + pressure bag"],
  ["Hail Impact","IEC 61215 MQT 8","25mm Ø ball, 23 m/s","Drop tower"],
  ["UV Exposure","IEC 61215 MQT 10","15 kWh/m² UV","UV chamber"],
  ["Damp Heat","IEC 61215 MQT 11","85°C/85%RH, 1000h","Damp heat chamber"],
  ["Humidity Freeze","IEC 61215 MQT 12","-40°C to 85°C cycles","Freeze chamber"],
  ["Salt Mist","IEC 61701","NaCl 5%, 96h","Salt mist chamber"],
  ["EL Imaging","IEC TS 60904-13","InGaAs camera, dark","EL imaging box"],
  ["HiPot","IEC 61730 MST 16","1000V+2×Voc","HiPot tester"],
  ["IV Curve","IEC 60904-1","STC: 1000W/m², 25°C","Solar simulator + tracer"],
  ["Bypass Diode","IEC 61215 MQT 18","1.25×Isc, thermal","Thermal fixture"],
];

const QUICK_LINKS = [
  { label: "Open PV Templates", href: "/designer" },
  { label: "2D Drawings", href: "/drawings" },
  { label: "FEA Analysis", href: "/fea-advanced" },
  { label: "CFD Analysis", href: "/cfd-advanced" },
  { label: "Reports", href: "/reports" },
  { label: "Import/Export", href: "/import-export" },
];

const STEPS = [
  { icon: FileText, label: "Generate 2D Drawing", getItems: (name: string) => [
    "Click 'PV Templates' button in designer toolbar",
    `Select ${name} from list`,
    "Click 'Generate 2D' → Opens /drawings with auto-filled dims",
    "Views: Front elevation, Top plan, Section A-A, Detail at 1:5",
  ]},
  { icon: Box, label: "Build 3D Model", getItems: () => [
    "In Parameters tab: set your specific dimensions",
    "Click 'Generate 3D' → Solid model appears in designer",
    "Use Modify tools to add fillets, chamfers, holes",
    "Export as STEP/IGES for manufacturing",
  ]},
  { icon: Activity, label: "Run FEA/Structural Analysis", getItems: (_n: string, fea: string) => [
    "Click 'Send to FEA' from template",
    "Pre-loaded: material properties (steel/aluminum/acrylic)",
    `Pre-loaded: ${fea}`,
    "Run analysis → view stress/displacement/safety factor",
  ]},
  { icon: Wind, label: "Run CFD/Thermal Analysis", getItems: (_n: string, _f: string, cfd: string) => [
    "Click 'Send to CFD' from template",
    "Pre-loaded: fluid domain, boundary temperatures",
    `Pre-loaded: ${cfd}`,
    "Run CFD → view temperature map, airflow vectors",
  ]},
  { icon: Download, label: "Export & Report", getItems: () => [
    "Click 'Pro PDF' → multi-view drawing with title block",
    "IEC standard reference auto-filled in title block",
    "BOM table with material specs",
    "Export STEP file for procurement",
  ]},
];

export default function PVWorkflowsPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d1117] p-6 space-y-8">
      {/* Section 1: Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sun size={20} className="text-[#00D4FF]" />
          <h1 className="text-2xl font-bold text-white">Solar PV Testing Workflows</h1>
        </div>
        <p className="text-slate-400 text-sm">How to use ShilpaSutra for complete IEC-compliant PV test equipment design and analysis</p>
      </div>

      {/* Section 2: Overview cards */}
      <div className="grid grid-cols-5 gap-3">
        {OVERVIEW.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-[#161b22] border border-[#21262d] rounded-lg p-4 flex flex-col gap-2 hover:border-[#00D4FF]/20 transition-colors">
            <Icon size={18} className="text-[#00D4FF]" />
            <div className="text-[12px] font-semibold text-white">{title}</div>
            <div className="text-[10px] text-slate-400 leading-relaxed">{desc}</div>
          </div>
        ))}
      </div>

      {/* Section 3: Step-by-step accordion */}
      <div>
        <h2 className="text-[10px] font-bold text-slate-500 mb-3 tracking-[0.15em] uppercase">Step-by-step Workflows</h2>
        <div className="space-y-1">
          {TEMPLATES.map((t, i) => (
            <div key={i} className="bg-[#161b22] border border-[#21262d] rounded-lg overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#1a1f28] transition-colors duration-150"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-semibold text-white">{t.name}</span>
                  <span className="text-[9px] bg-[#00D4FF]/10 text-[#00D4FF] px-2 py-0.5 rounded-full border border-[#00D4FF]/20">{t.std}</span>
                </div>
                <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <div className="px-4 pb-4 border-t border-[#21262d]">
                  <p className="text-[11px] text-slate-400 mt-3 mb-4">{t.desc}</p>
                  <div className="space-y-0">
                    {STEPS.map(({ icon: SIcon, label, getItems }, si) => {
                      const items = getItems(t.name, t.fea, t.cfd);
                      return (
                        <div key={si} className="flex gap-3">
                          <div className="flex flex-col items-center shrink-0">
                            <div className="w-6 h-6 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/30 flex items-center justify-center">
                              <SIcon size={11} className="text-[#00D4FF]" />
                            </div>
                            {si < 4 && <div className="w-px flex-1 bg-[#21262d] min-h-[12px] mt-1 mb-1" />}
                          </div>
                          <div className="pb-3">
                            <div className="text-[11px] font-semibold text-slate-200 mb-1 pt-0.5">Step {si + 1}: {label}</div>
                            <ul className="space-y-0.5">
                              {items.map((item: string, j: number) => (
                                <li key={j} className="text-[10px] text-slate-500 flex gap-1.5">
                                  <span className="text-[#00D4FF]/50 shrink-0 mt-px">→</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Quick nav */}
      <div>
        <h2 className="text-[10px] font-bold text-slate-500 mb-3 tracking-[0.15em] uppercase">Quick Navigation</h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map(({ label, href }) => (
            <Link key={href} href={href}
              className="px-4 py-2 bg-[#161b22] border border-[#21262d] rounded-lg text-[11px] font-medium text-slate-300 hover:text-[#00D4FF] hover:border-[#00D4FF]/30 transition-all duration-150">
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Section 5: IEC Standards table */}
      <div>
        <h2 className="text-[10px] font-bold text-slate-500 mb-3 tracking-[0.15em] uppercase">IEC Standards Reference</h2>
        <div className="bg-[#161b22] border border-[#21262d] rounded-lg overflow-hidden">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[#21262d] bg-[#0d1117]">
                {["Test","Standard","Test Condition","Equipment"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {IEC_TABLE.map(([test, std, cond, equip], i) => (
                <tr key={i} className={`border-b border-[#21262d]/50 hover:bg-[#0d1117]/50 transition-colors ${i === IEC_TABLE.length - 1 ? "border-b-0" : ""}`}>
                  <td className="px-4 py-2.5 font-medium text-slate-300">{test}</td>
                  <td className="px-4 py-2.5 text-[#00D4FF] font-mono text-[10px]">{std}</td>
                  <td className="px-4 py-2.5 text-slate-400">{cond}</td>
                  <td className="px-4 py-2.5 text-slate-400">{equip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
