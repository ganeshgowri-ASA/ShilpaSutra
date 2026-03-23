"use client";
import { useState, useMemo, useCallback } from "react";
import { useCadStore } from "@/stores/cad-store";
import { Plus, Search, Clock, Star } from "lucide-react";

type CadTypeName = "box" | "cylinder" | "sphere";

interface ParamDef {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  def: number;
  step?: number;
}

interface ComponentDef {
  id: string;
  label: string;
  category: string;
  icon: string;
  params: ParamDef[];
  generate: (p: Record<string, number>) => { cadType: CadTypeName; w: number; h: number; d: number; color: string };
  /** material density in kg/m^3 for mass estimation */
  density?: number;
}

/* ---------- Material densities (kg/m^3) ---------- */
const STEEL = 7850;
const ALUMINUM = 2700;
const BRASS = 8500;
const SPRING_STEEL = 7800;
const STAINLESS = 8000;
const NYLON = 1150;

/* ==========================================================================
   COMPONENT LIBRARY  (25+ parametric components)
   ========================================================================== */

const COMPONENTS: ComponentDef[] = [
  /* -------- FASTENERS -------- */
  {
    id: "hex_bolt", label: "Hex Bolt", category: "Fasteners", icon: "🔩",
    density: STEEL,
    params: [
      { key: "size", label: "Thread (M)", unit: "", min: 3, max: 24, def: 8, step: 1 },
      { key: "length", label: "Length", unit: "mm", min: 10, max: 200, def: 40, step: 5 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.size / 100, h: p.length / 100, d: p.size / 100, color: "#8a9a8a" }),
  },
  {
    id: "hex_nut", label: "Hex Nut", category: "Fasteners", icon: "🔩",
    density: STEEL,
    params: [
      { key: "size", label: "Thread (M)", unit: "", min: 3, max: 24, def: 8, step: 1 },
    ],
    generate: (p) => ({ cadType: "box", w: p.size * 1.7 / 100, h: p.size * 0.8 / 100, d: p.size * 1.7 / 100, color: "#7a8a7a" }),
  },
  {
    id: "shcs", label: "Socket Head Cap Screw", category: "Fasteners", icon: "🔩",
    density: STEEL,
    params: [
      { key: "size", label: "Thread (M)", unit: "", min: 3, max: 20, def: 6, step: 1 },
      { key: "length", label: "Length", unit: "mm", min: 8, max: 150, def: 25, step: 5 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.size / 100, h: p.length / 100, d: p.size / 100, color: "#1a1a1a" }),
  },
  {
    id: "flat_washer", label: "Flat Washer", category: "Fasteners", icon: "⭕",
    density: STEEL,
    params: [
      { key: "size", label: "Bore (M)", unit: "", min: 3, max: 24, def: 8, step: 1 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.size * 2.2 / 100, h: p.size * 0.15 / 100, d: p.size * 2.2 / 100, color: "#b0b0b0" }),
  },
  {
    id: "lock_washer", label: "Lock Washer", category: "Fasteners", icon: "⭕",
    density: SPRING_STEEL,
    params: [
      { key: "size", label: "Bore (M)", unit: "", min: 3, max: 24, def: 8, step: 1 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.size * 2 / 100, h: p.size * 0.25 / 100, d: p.size * 2 / 100, color: "#a0a0a0" }),
  },
  {
    id: "set_screw", label: "Set Screw", category: "Fasteners", icon: "🔩",
    density: STEEL,
    params: [
      { key: "size", label: "Thread (M)", unit: "", min: 3, max: 16, def: 6, step: 1 },
      { key: "length", label: "Length", unit: "mm", min: 4, max: 40, def: 10, step: 2 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.size / 100, h: p.length / 100, d: p.size / 100, color: "#2a2a2a" }),
  },
  {
    id: "wing_nut", label: "Wing Nut", category: "Fasteners", icon: "🦋",
    density: STEEL,
    params: [
      { key: "size", label: "Thread (M)", unit: "", min: 4, max: 12, def: 6, step: 1 },
    ],
    generate: (p) => ({ cadType: "box", w: p.size * 3 / 100, h: p.size * 1.2 / 100, d: p.size * 1.5 / 100, color: "#8a8a7a" }),
  },
  {
    id: "eye_bolt", label: "Eye Bolt", category: "Fasteners", icon: "👁",
    density: STEEL,
    params: [
      { key: "size", label: "Thread (M)", unit: "", min: 6, max: 20, def: 10, step: 1 },
      { key: "length", label: "Shank Length", unit: "mm", min: 20, max: 150, def: 50, step: 5 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.size * 2.5 / 100, h: (p.length + p.size * 3) / 100, d: p.size * 2.5 / 100, color: "#909090" }),
  },

  /* -------- BEARINGS -------- */
  {
    id: "ball_bearing", label: "Ball Bearing", category: "Bearings", icon: "⚙️",
    density: STEEL,
    params: [
      { key: "series", label: "Series (60xx)", unit: "", min: 0, max: 9, def: 2, step: 1 },
      { key: "width", label: "Width", unit: "mm", min: 5, max: 30, def: 11, step: 1 },
    ],
    generate: (p) => {
      const od = (60 + p.series * 5) / 100;
      return { cadType: "cylinder", w: od, h: p.width / 100, d: od, color: "#a0b0c0" };
    },
  },
  {
    id: "roller_bearing", label: "Roller Bearing", category: "Bearings", icon: "⚙️",
    density: STEEL,
    params: [
      { key: "od", label: "Outer Dia", unit: "mm", min: 30, max: 200, def: 72, step: 5 },
      { key: "id", label: "Inner Dia", unit: "mm", min: 10, max: 100, def: 35, step: 5 },
      { key: "width", label: "Width", unit: "mm", min: 10, max: 50, def: 17, step: 1 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.od / 100, h: p.width / 100, d: p.od / 100, color: "#90a0b0" }),
  },
  {
    id: "thrust_bearing", label: "Thrust Bearing", category: "Bearings", icon: "⚙️",
    density: STEEL,
    params: [
      { key: "od", label: "Outer Dia", unit: "mm", min: 20, max: 150, def: 52, step: 5 },
      { key: "height", label: "Height", unit: "mm", min: 8, max: 30, def: 12, step: 1 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.od / 100, h: p.height / 100, d: p.od / 100, color: "#8090a0" }),
  },
  {
    id: "needle_bearing", label: "Needle Bearing", category: "Bearings", icon: "⚙️",
    density: STEEL,
    params: [
      { key: "od", label: "Outer Dia", unit: "mm", min: 15, max: 80, def: 32, step: 5 },
      { key: "width", label: "Width", unit: "mm", min: 8, max: 30, def: 12, step: 1 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.od / 100, h: p.width / 100, d: p.od / 100, color: "#7888a0" }),
  },

  /* -------- GEARS -------- */
  {
    id: "spur_gear", label: "Spur Gear", category: "Gears", icon: "⚙️",
    density: STEEL,
    params: [
      { key: "teeth", label: "Teeth", unit: "", min: 8, max: 100, def: 20, step: 1 },
      { key: "module", label: "Module", unit: "", min: 1, max: 5, def: 2, step: 0.5 },
      { key: "width", label: "Face Width", unit: "mm", min: 5, max: 50, def: 10, step: 1 },
    ],
    generate: (p) => {
      const pd = (p.teeth * p.module) / 100;
      return { cadType: "cylinder", w: pd, h: p.width / 100, d: pd, color: "#b0906a" };
    },
  },
  {
    id: "helical_gear", label: "Helical Gear", category: "Gears", icon: "⚙️",
    density: STEEL,
    params: [
      { key: "teeth", label: "Teeth", unit: "", min: 10, max: 80, def: 24, step: 1 },
      { key: "module", label: "Module", unit: "", min: 1, max: 5, def: 2, step: 0.5 },
      { key: "width", label: "Face Width", unit: "mm", min: 10, max: 60, def: 20, step: 2 },
      { key: "helix", label: "Helix Angle", unit: "deg", min: 10, max: 45, def: 20, step: 5 },
    ],
    generate: (p) => {
      const pd = (p.teeth * p.module) / 100;
      return { cadType: "cylinder", w: pd, h: p.width / 100, d: pd, color: "#c0a07a" };
    },
  },
  {
    id: "bevel_gear", label: "Bevel Gear", category: "Gears", icon: "⚙️",
    density: STEEL,
    params: [
      { key: "teeth", label: "Teeth", unit: "", min: 10, max: 60, def: 20, step: 1 },
      { key: "module", label: "Module", unit: "", min: 1, max: 4, def: 2, step: 0.5 },
      { key: "width", label: "Face Width", unit: "mm", min: 10, max: 40, def: 15, step: 1 },
    ],
    generate: (p) => {
      const pd = (p.teeth * p.module) / 100;
      return { cadType: "cylinder", w: pd, h: p.width / 100, d: pd, color: "#a08060" };
    },
  },
  {
    id: "worm_gear", label: "Worm Gear", category: "Gears", icon: "⚙️",
    density: BRASS,
    params: [
      { key: "teeth", label: "Teeth", unit: "", min: 20, max: 60, def: 30, step: 1 },
      { key: "module", label: "Module", unit: "", min: 1, max: 4, def: 2, step: 0.5 },
      { key: "width", label: "Face Width", unit: "mm", min: 10, max: 40, def: 20, step: 2 },
    ],
    generate: (p) => {
      const pd = (p.teeth * p.module) / 100;
      return { cadType: "cylinder", w: pd, h: p.width / 100, d: pd, color: "#d4aa60" };
    },
  },
  {
    id: "rack", label: "Rack", category: "Gears", icon: "📏",
    density: STEEL,
    params: [
      { key: "module", label: "Module", unit: "", min: 1, max: 5, def: 2, step: 0.5 },
      { key: "length", label: "Length", unit: "mm", min: 50, max: 500, def: 150, step: 10 },
      { key: "height", label: "Height", unit: "mm", min: 10, max: 40, def: 20, step: 2 },
    ],
    generate: (p) => ({ cadType: "box", w: p.length / 100, h: p.height / 100, d: p.module * 10 / 100, color: "#a09070" }),
  },

  /* -------- STRUCTURAL -------- */
  {
    id: "i_beam", label: "I-Beam", category: "Structural", icon: "🏗",
    density: STEEL,
    params: [
      { key: "height", label: "Height", unit: "mm", min: 50, max: 600, def: 200, step: 10 },
      { key: "flange", label: "Flange Width", unit: "mm", min: 30, max: 300, def: 100, step: 10 },
      { key: "length", label: "Length", unit: "mm", min: 100, max: 3000, def: 500, step: 50 },
    ],
    generate: (p) => ({ cadType: "box", w: p.flange / 100, h: p.height / 100, d: p.length / 100, color: "#808080" }),
  },
  {
    id: "c_channel", label: "C-Channel", category: "Structural", icon: "🏗",
    density: STEEL,
    params: [
      { key: "height", label: "Height", unit: "mm", min: 30, max: 400, def: 100, step: 10 },
      { key: "flange", label: "Flange Width", unit: "mm", min: 20, max: 100, def: 50, step: 5 },
      { key: "length", label: "Length", unit: "mm", min: 100, max: 3000, def: 500, step: 50 },
    ],
    generate: (p) => ({ cadType: "box", w: p.flange / 100, h: p.height / 100, d: p.length / 100, color: "#787878" }),
  },
  {
    id: "angle_iron", label: "Angle Iron", category: "Structural", icon: "🏗",
    density: STEEL,
    params: [
      { key: "leg", label: "Leg Size", unit: "mm", min: 20, max: 200, def: 50, step: 5 },
      { key: "thickness", label: "Thickness", unit: "mm", min: 2, max: 20, def: 5, step: 1 },
      { key: "length", label: "Length", unit: "mm", min: 100, max: 3000, def: 500, step: 50 },
    ],
    generate: (p) => ({ cadType: "box", w: p.leg / 100, h: p.leg / 100, d: p.length / 100, color: "#707070" }),
  },
  {
    id: "t_section", label: "T-Section", category: "Structural", icon: "🏗",
    density: STEEL,
    params: [
      { key: "height", label: "Height", unit: "mm", min: 30, max: 200, def: 80, step: 10 },
      { key: "flange", label: "Flange Width", unit: "mm", min: 30, max: 200, def: 80, step: 10 },
      { key: "length", label: "Length", unit: "mm", min: 100, max: 3000, def: 500, step: 50 },
    ],
    generate: (p) => ({ cadType: "box", w: p.flange / 100, h: p.height / 100, d: p.length / 100, color: "#686868" }),
  },
  {
    id: "round_bar", label: "Round Bar", category: "Structural", icon: "🏗",
    density: STEEL,
    params: [
      { key: "dia", label: "Diameter", unit: "mm", min: 5, max: 200, def: 25, step: 5 },
      { key: "length", label: "Length", unit: "mm", min: 50, max: 3000, def: 300, step: 50 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.dia / 100, h: p.length / 100, d: p.dia / 100, color: "#999999" }),
  },
  {
    id: "square_tube", label: "Square Tube", category: "Structural", icon: "🏗",
    density: STEEL,
    params: [
      { key: "side", label: "Side", unit: "mm", min: 10, max: 200, def: 40, step: 5 },
      { key: "wall", label: "Wall Thickness", unit: "mm", min: 1, max: 10, def: 3, step: 0.5 },
      { key: "length", label: "Length", unit: "mm", min: 100, max: 3000, def: 500, step: 50 },
    ],
    generate: (p) => ({ cadType: "box", w: p.side / 100, h: p.side / 100, d: p.length / 100, color: "#888888" }),
  },
  {
    id: "rect_tube", label: "Rectangular Tube", category: "Structural", icon: "🏗",
    density: STEEL,
    params: [
      { key: "w", label: "Width", unit: "mm", min: 20, max: 200, def: 60, step: 5 },
      { key: "h", label: "Height", unit: "mm", min: 10, max: 200, def: 40, step: 5 },
      { key: "wall", label: "Wall Thickness", unit: "mm", min: 1, max: 10, def: 3, step: 0.5 },
      { key: "length", label: "Length", unit: "mm", min: 100, max: 3000, def: 500, step: 50 },
    ],
    generate: (p) => ({ cadType: "box", w: p.w / 100, h: p.h / 100, d: p.length / 100, color: "#7e7e7e" }),
  },

  /* -------- SPRINGS -------- */
  {
    id: "comp_spring", label: "Compression Spring", category: "Springs", icon: "🌀",
    density: SPRING_STEEL,
    params: [
      { key: "dia", label: "Wire Dia", unit: "mm", min: 1, max: 10, def: 2, step: 0.5 },
      { key: "od", label: "Outer Dia", unit: "mm", min: 5, max: 60, def: 15, step: 1 },
      { key: "coils", label: "Coils", unit: "", min: 3, max: 20, def: 8, step: 1 },
      { key: "length", label: "Free Length", unit: "mm", min: 10, max: 200, def: 60, step: 5 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.od / 100, h: p.length / 100, d: p.od / 100, color: "#c0c060" }),
  },
  {
    id: "tens_spring", label: "Tension Spring", category: "Springs", icon: "🌀",
    density: SPRING_STEEL,
    params: [
      { key: "dia", label: "Wire Dia", unit: "mm", min: 0.5, max: 8, def: 1.5, step: 0.5 },
      { key: "od", label: "Outer Dia", unit: "mm", min: 4, max: 40, def: 10, step: 1 },
      { key: "length", label: "Body Length", unit: "mm", min: 10, max: 150, def: 40, step: 5 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.od / 100, h: p.length / 100, d: p.od / 100, color: "#b0b050" }),
  },
  {
    id: "tors_spring", label: "Torsion Spring", category: "Springs", icon: "🌀",
    density: SPRING_STEEL,
    params: [
      { key: "dia", label: "Wire Dia", unit: "mm", min: 0.5, max: 6, def: 1.5, step: 0.5 },
      { key: "od", label: "Outer Dia", unit: "mm", min: 5, max: 40, def: 12, step: 1 },
      { key: "coils", label: "Coils", unit: "", min: 2, max: 15, def: 5, step: 1 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.od / 100, h: (p.coils * p.dia * 1.2) / 100, d: p.od / 100, color: "#a0a048" }),
  },

  /* -------- PIPES & FITTINGS -------- */
  {
    id: "pipe_seg", label: "Pipe Segment", category: "Pipes & Fittings", icon: "🔧",
    density: STEEL,
    params: [
      { key: "od", label: "OD", unit: "mm", min: 10, max: 300, def: 50, step: 5 },
      { key: "wall", label: "Wall Thickness", unit: "mm", min: 1, max: 15, def: 3, step: 0.5 },
      { key: "length", label: "Length", unit: "mm", min: 50, max: 2000, def: 300, step: 25 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.od / 100, h: p.length / 100, d: p.od / 100, color: "#7090b0" }),
  },
  {
    id: "elbow_90", label: "Elbow 90\u00B0", category: "Pipes & Fittings", icon: "🔧",
    density: STEEL,
    params: [
      { key: "od", label: "OD", unit: "mm", min: 10, max: 200, def: 50, step: 5 },
      { key: "radius", label: "Bend Radius", unit: "mm", min: 20, max: 300, def: 75, step: 5 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.od / 100, h: p.radius / 100, d: p.od / 100, color: "#6080a0" }),
  },
  {
    id: "tee", label: "Tee", category: "Pipes & Fittings", icon: "🔧",
    density: STEEL,
    params: [
      { key: "od", label: "OD", unit: "mm", min: 10, max: 200, def: 50, step: 5 },
      { key: "length", label: "Run Length", unit: "mm", min: 30, max: 300, def: 100, step: 10 },
    ],
    generate: (p) => ({ cadType: "box", w: p.length / 100, h: p.od / 100, d: p.od / 100, color: "#607898" }),
  },
  {
    id: "reducer", label: "Reducer", category: "Pipes & Fittings", icon: "🔧",
    density: STEEL,
    params: [
      { key: "od1", label: "Large OD", unit: "mm", min: 20, max: 200, def: 60, step: 5 },
      { key: "od2", label: "Small OD", unit: "mm", min: 10, max: 150, def: 40, step: 5 },
      { key: "length", label: "Length", unit: "mm", min: 20, max: 200, def: 50, step: 5 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.od1 / 100, h: p.length / 100, d: p.od1 / 100, color: "#5070a0" }),
  },
  {
    id: "flange", label: "Flange", category: "Pipes & Fittings", icon: "🔧",
    density: STEEL,
    params: [
      { key: "od", label: "Flange OD", unit: "mm", min: 40, max: 400, def: 120, step: 10 },
      { key: "bore", label: "Bore", unit: "mm", min: 10, max: 200, def: 50, step: 5 },
      { key: "thickness", label: "Thickness", unit: "mm", min: 8, max: 40, def: 16, step: 2 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.od / 100, h: p.thickness / 100, d: p.od / 100, color: "#607090" }),
  },

  /* -------- ELECTRONICS -------- */
  {
    id: "standoff", label: "Standoff", category: "Electronics", icon: "📌",
    density: BRASS,
    params: [
      { key: "thread", label: "Thread (M)", unit: "", min: 2, max: 6, def: 3, step: 1 },
      { key: "length", label: "Length", unit: "mm", min: 5, max: 40, def: 10, step: 1 },
      { key: "hex", label: "Hex Size", unit: "mm", min: 4, max: 10, def: 5, step: 0.5 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.hex / 100, h: p.length / 100, d: p.hex / 100, color: "#d4aa60" }),
  },
  {
    id: "pcb_mount", label: "PCB Mount", category: "Electronics", icon: "📌",
    density: NYLON,
    params: [
      { key: "height", label: "Height", unit: "mm", min: 3, max: 25, def: 8, step: 1 },
      { key: "dia", label: "Diameter", unit: "mm", min: 4, max: 10, def: 6, step: 0.5 },
    ],
    generate: (p) => ({ cadType: "cylinder", w: p.dia / 100, h: p.height / 100, d: p.dia / 100, color: "#e8e8e0" }),
  },
  {
    id: "heat_sink", label: "Heat Sink", category: "Electronics", icon: "🌡",
    density: ALUMINUM,
    params: [
      { key: "w", label: "Width", unit: "mm", min: 10, max: 100, def: 40, step: 5 },
      { key: "h", label: "Height", unit: "mm", min: 5, max: 60, def: 20, step: 2 },
      { key: "d", label: "Depth", unit: "mm", min: 10, max: 100, def: 40, step: 5 },
      { key: "fins", label: "Fins", unit: "", min: 3, max: 20, def: 8, step: 1 },
    ],
    generate: (p) => ({ cadType: "box", w: p.w / 100, h: p.h / 100, d: p.d / 100, color: "#505050" }),
  },
  {
    id: "din_rail", label: "DIN Rail", category: "Electronics", icon: "📐",
    density: STEEL,
    params: [
      { key: "length", label: "Length", unit: "mm", min: 50, max: 1000, def: 200, step: 25 },
      { key: "type", label: "Width (35/15)", unit: "mm", min: 15, max: 35, def: 35, step: 20 },
    ],
    generate: (p) => ({ cadType: "box", w: p.type / 100, h: 0.075, d: p.length / 100, color: "#c0c0c0" }),
  },
];

/* ---------- Derived constants ---------- */
const CATEGORIES = Array.from(new Set(COMPONENTS.map(c => c.category)));

const MAX_RECENT = 8;

/* ---------- Helpers ---------- */

/** Estimate bounding-box volume in m^3 from generate output */
function estimateMass(comp: ComponentDef, params: Record<string, number>): string {
  const geo = comp.generate(params);
  // volumes in meters (w/h/d are already /100 inside generate)
  let volM3: number;
  if (geo.cadType === "cylinder") {
    volM3 = Math.PI * (geo.w / 2) * (geo.d / 2) * geo.h;
  } else if (geo.cadType === "sphere") {
    volM3 = (4 / 3) * Math.PI * Math.pow(geo.w / 2, 3);
  } else {
    volM3 = geo.w * geo.h * geo.d;
  }
  const density = comp.density ?? STEEL;
  const massKg = volM3 * density;
  if (massKg < 0.001) return `${(massKg * 1e6).toFixed(1)} mg`;
  if (massKg < 1) return `${(massKg * 1000).toFixed(1)} g`;
  return `${massKg.toFixed(2)} kg`;
}

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export default function ComponentsPanel() {
  const addGeneratedObject = useCadStore(s => s.addGeneratedObject);

  const [activeCat, setActiveCat] = useState(CATEGORIES[0]);
  const [selected, setSelected] = useState<ComponentDef | null>(null);
  const [params, setParams] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  /* -- filtered list -- */
  const filteredComponents = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return COMPONENTS.filter(
        c => c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
      );
    }
    if (showRecent) {
      return COMPONENTS.filter(c => recentIds.includes(c.id)).sort(
        (a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id)
      );
    }
    return COMPONENTS.filter(c => c.category === activeCat);
  }, [searchQuery, showRecent, activeCat, recentIds]);

  const selectComp = useCallback((c: ComponentDef) => {
    setSelected(c);
    const defaults: Record<string, number> = {};
    c.params.forEach(p => { defaults[p.key] = p.def; });
    setParams(defaults);
  }, []);

  const addToScene = useCallback(() => {
    if (!selected) return;
    const geo = selected.generate(params);
    addGeneratedObject({
      type: geo.cadType,
      name: selected.label,
      color: geo.color,
      dimensions: { width: geo.w * 100, height: geo.h * 100, depth: geo.d * 100 },
    });
    // track recently used
    setRecentIds(prev => {
      const filtered = prev.filter(id => id !== selected.id);
      return [selected.id, ...filtered].slice(0, MAX_RECENT);
    });
  }, [selected, params, addGeneratedObject]);

  const massEstimate = useMemo(() => {
    if (!selected) return null;
    return estimateMass(selected, params);
  }, [selected, params]);

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-white text-xs">
      {/* Search bar */}
      <div className="p-2 border-b border-[#21262d] bg-[#161b22]">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowRecent(false); }}
            className="w-full bg-[#0d1117] border border-[#21262d] rounded pl-7 pr-2 py-1.5 text-[11px] text-white placeholder-slate-600 focus:border-[#00D4FF]/50 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Category tabs + Recent */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-[#21262d] bg-[#161b22]">
        {recentIds.length > 0 && (
          <button
            onClick={() => { setShowRecent(true); setSearchQuery(""); }}
            className={`px-2 py-0.5 rounded text-[10px] border transition-colors flex items-center gap-1 ${showRecent && !searchQuery ? "border-[#00D4FF]/50 text-[#00D4FF] bg-[#00D4FF]/10" : "border-[#21262d] text-slate-500 hover:text-white"}`}
          >
            <Clock size={10} /> Recent
          </button>
        )}
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCat(cat); setShowRecent(false); setSearchQuery(""); }}
            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${!showRecent && !searchQuery && activeCat === cat ? "border-[#00D4FF]/50 text-[#00D4FF] bg-[#00D4FF]/10" : "border-[#21262d] text-slate-500 hover:text-white"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Component count */}
      <div className="px-2 pt-1.5 pb-0.5 text-[10px] text-slate-600">
        {filteredComponents.length} component{filteredComponents.length !== 1 ? "s" : ""}
        {searchQuery && ` matching "${searchQuery}"`}
        {showRecent && !searchQuery && " recently used"}
      </div>

      {/* Component list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredComponents.map(comp => (
          <button
            key={comp.id}
            onClick={() => selectComp(comp)}
            className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center gap-2 ${selected?.id === comp.id ? "border-[#00D4FF]/40 bg-[#00D4FF]/10" : "border-[#21262d] hover:border-[#30363d] bg-[#161b22]"}`}
          >
            <span className="text-base flex-shrink-0">{comp.icon}</span>
            <div className="flex-1 min-w-0">
              <span className={`font-semibold block truncate ${selected?.id === comp.id ? "text-[#00D4FF]" : "text-slate-300"}`}>
                {comp.label}
              </span>
              {searchQuery && (
                <span className="text-[9px] text-slate-600">{comp.category}</span>
              )}
            </div>
            {recentIds.includes(comp.id) && !showRecent && (
              <Clock size={10} className="text-slate-600 flex-shrink-0" />
            )}
          </button>
        ))}
        {filteredComponents.length === 0 && (
          <div className="text-center text-slate-600 py-6">No components found</div>
        )}
      </div>

      {/* Parameter editor + mass preview */}
      {selected && (
        <div className="border-t border-[#21262d] p-3 space-y-2 bg-[#161b22]">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-300">{selected.icon} {selected.label}</div>
            {massEstimate && (
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Star size={9} className="text-[#00D4FF]/60" />
                <span>~{massEstimate}</span>
              </div>
            )}
          </div>
          {selected.params.map(p => (
            <div key={p.key}>
              <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                <span>{p.label} {p.unit && `(${p.unit})`}</span>
                <span className="text-white font-mono">{params[p.key] ?? p.def}</span>
              </div>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step ?? (p.max > 100 ? 5 : 1)}
                value={params[p.key] ?? p.def}
                onChange={e => setParams(prev => ({ ...prev, [p.key]: parseFloat(e.target.value) }))}
                className="w-full h-1 accent-[#00D4FF] cursor-pointer"
              />
            </div>
          ))}
          <button
            onClick={addToScene}
            className="w-full mt-2 flex items-center justify-center gap-1.5 bg-[#00D4FF] hover:bg-[#00b8d9] text-black font-bold py-1.5 rounded-lg transition-colors"
          >
            <Plus size={13} /> Add to Scene
          </button>
        </div>
      )}
    </div>
  );
}
