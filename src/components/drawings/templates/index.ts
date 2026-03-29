// ═══════════════════════════════════════════════════════════════════════════════
// Equipment Drawing Templates — Index
// All IEC/industrial equipment professional GA drawing templates
// ═══════════════════════════════════════════════════════════════════════════════

export { default as ThermalCyclingChamber } from "./ThermalCyclingChamber";
export { default as UVConditioningChamber } from "./UVConditioningChamber";
export { default as HumidityFreezeChamber } from "./HumidityFreezeChamber";
export { default as SaltMistChamber } from "./SaltMistChamber";
export { default as MechanicalLoadFrame } from "./MechanicalLoadFrame";
export { default as SolarSimulator } from "./SolarSimulator";
export { default as IgnitabilityChamber } from "./IgnitabilityChamber";
export { default as ChillerUnit } from "./ChillerUnit";

export type { ThermalCyclingChamberParams } from "./ThermalCyclingChamber";
export type { UVConditioningChamberParams } from "./UVConditioningChamber";
export type { HumidityFreezeChamberParams } from "./HumidityFreezeChamber";
export type { SaltMistChamberParams } from "./SaltMistChamber";
export type { MechanicalLoadFrameParams } from "./MechanicalLoadFrame";
export type { SolarSimulatorParams } from "./SolarSimulator";
export type { IgnitabilityChamberParams } from "./IgnitabilityChamber";
export type { ChillerUnitParams } from "./ChillerUnit";

/** Template registry for ID → component mapping */
export const EQUIPMENT_TEMPLATES = {
  thermal_cycling_chamber: {
    id: "thermal_cycling_chamber",
    name: "Thermal Cycling Chamber",
    standard: "IEC 61215 MQT 11",
    description: "Temperature cycling test for PV modules (-40°C to +85°C)",
    keywords: ["thermal", "cycling", "temperature", "tcc", "mqt 11", "iec 61215"],
  },
  iec_uv_conditioning_chamber: {
    id: "iec_uv_conditioning_chamber",
    name: "UV Conditioning Chamber",
    standard: "IEC 61215 MQT 10",
    description: "UV preconditioning exposure for PV modules",
    keywords: ["uv", "ultraviolet", "conditioning", "preconditioning", "mqt 10"],
  },
  humidity_freeze_chamber: {
    id: "humidity_freeze_chamber",
    name: "Humidity-Freeze Chamber",
    standard: "IEC 61215 MQT 12",
    description: "Combined humidity and freeze testing for PV modules",
    keywords: ["humidity", "freeze", "damp", "heat", "mqt 12", "85/85"],
  },
  salt_mist_chamber: {
    id: "salt_mist_chamber",
    name: "Salt Mist Chamber",
    standard: "IEC 61701",
    description: "Salt spray corrosion testing for PV modules",
    keywords: ["salt", "mist", "spray", "corrosion", "fog", "iec 61701"],
  },
  mechanical_load_test: {
    id: "mechanical_load_test",
    name: "Mechanical Load Frame",
    standard: "IEC 62782 / IEC 61215 MQT 16",
    description: "Mechanical load test frame for PV modules (up to 5400Pa)",
    keywords: ["mechanical", "load", "frame", "mqt 16", "iec 62782", "pressure"],
  },
  solar_simulator: {
    id: "solar_simulator",
    name: "Solar Simulator",
    standard: "IEC 60904-9",
    description: "Class AAA solar simulator for PV module I-V characterization",
    keywords: ["solar", "simulator", "sun", "aaa", "iv", "flash", "iec 60904"],
  },
  ignitability_chamber: {
    id: "ignitability_chamber",
    name: "Ignitability Test Chamber",
    standard: "IEC 61730 / UL 790",
    description: "Fire/ignitability test chamber for PV modules",
    keywords: ["ignitability", "fire", "flame", "burn", "chimney", "ul 790", "iec 61730"],
  },
  chiller_unit: {
    id: "chiller_unit",
    name: "Chiller Unit",
    standard: "Industrial",
    description: "Industrial chiller unit for test lab cooling",
    keywords: ["chiller", "cooling", "refrigeration", "condenser", "compressor"],
  },
} as const;

export type EquipmentTemplateId = keyof typeof EQUIPMENT_TEMPLATES;
