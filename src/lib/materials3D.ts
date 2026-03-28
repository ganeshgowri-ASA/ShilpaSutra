/**
 * materials3D.ts — Shared PBR material library for IEC test equipment 3D rendering.
 * All materials use MeshStandardMaterial for PBR (metalness/roughness workflow).
 * Materials are cached for reuse across components.
 */

import {
  MeshStandardMaterial,
  Color,
  FrontSide,
  DoubleSide,
  type Side,
} from 'three';

// ─── Material definition ─────────────────────────────────────────────────────

export interface PBRMaterialDef {
  color: string;
  metalness: number;
  roughness: number;
  transparent?: boolean;
  opacity?: number;
  side?: Side;
  emissive?: string;
  emissiveIntensity?: number;
}

// ─── IEC equipment material keys ─────────────────────────────────────────────

export type IECMaterialKey =
  | 'steel'
  | 'stainless_steel'
  | 'insulated_steel'
  | 'steel_blackout'
  | 'steel_mesh'
  | 'steel_reflector'
  | 'aluminum'
  | 'aluminum_perforated'
  | 'copper'
  | 'brass'
  | 'rubber'
  | 'glass'
  | 'acrylic'
  | 'plastic'
  | 'plastic_amber'
  | 'pvc'
  | 'sensor'
  | 'uva_lamp'
  | 'xenon_lamp'
  | 'camera_body'
  | 'silicon'
  | 'lcd_display'
  | 'pcb_green'
  | 'bnc_connector'
  | 'reflector_aluminum'
  | 'shutter_plate'
  | 'terminal_block';

// ─── PBR definitions for each IEC material ───────────────────────────────────

export const IEC_MATERIAL_DEFS: Record<IECMaterialKey, PBRMaterialDef> = {
  steel: {
    color: '#8a9198',
    metalness: 0.85,
    roughness: 0.35,
  },
  stainless_steel: {
    color: '#c0c8d0',
    metalness: 0.9,
    roughness: 0.2,
  },
  insulated_steel: {
    color: '#d0d4d8',
    metalness: 0.3,
    roughness: 0.7,
  },
  steel_blackout: {
    color: '#1a1a1e',
    metalness: 0.6,
    roughness: 0.5,
  },
  steel_mesh: {
    color: '#a0a8b0',
    metalness: 0.7,
    roughness: 0.5,
    transparent: true,
    opacity: 0.6,
  },
  steel_reflector: {
    color: '#e8ecf0',
    metalness: 0.95,
    roughness: 0.05,
  },
  aluminum: {
    color: '#c8d0d8',
    metalness: 0.85,
    roughness: 0.25,
  },
  aluminum_perforated: {
    color: '#b8c0c8',
    metalness: 0.8,
    roughness: 0.35,
    transparent: true,
    opacity: 0.85,
  },
  copper: {
    color: '#b87333',
    metalness: 0.9,
    roughness: 0.3,
  },
  brass: {
    color: '#cd9b1d',
    metalness: 0.85,
    roughness: 0.3,
  },
  rubber: {
    color: '#2a2a2a',
    metalness: 0.02,
    roughness: 0.95,
  },
  glass: {
    color: '#88ccee',
    metalness: 0.05,
    roughness: 0.05,
    transparent: true,
    opacity: 0.35,
    side: DoubleSide,
  },
  acrylic: {
    color: '#e0e8f0',
    metalness: 0.02,
    roughness: 0.1,
    transparent: true,
    opacity: 0.4,
    side: DoubleSide,
  },
  plastic: {
    color: '#404050',
    metalness: 0.05,
    roughness: 0.7,
  },
  plastic_amber: {
    color: '#ffaa00',
    metalness: 0.05,
    roughness: 0.5,
    emissive: '#ff8800',
    emissiveIntensity: 0.4,
  },
  pvc: {
    color: '#e0dcd0',
    metalness: 0.02,
    roughness: 0.8,
  },
  sensor: {
    color: '#2a3a4a',
    metalness: 0.4,
    roughness: 0.6,
  },
  uva_lamp: {
    color: '#9060ff',
    metalness: 0.1,
    roughness: 0.2,
    emissive: '#7040cc',
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.85,
  },
  xenon_lamp: {
    color: '#f0f0ff',
    metalness: 0.15,
    roughness: 0.15,
    emissive: '#e0e0ff',
    emissiveIntensity: 0.5,
  },
  camera_body: {
    color: '#1a1a20',
    metalness: 0.3,
    roughness: 0.6,
  },
  silicon: {
    color: '#1a1a50',
    metalness: 0.15,
    roughness: 0.6,
  },
  lcd_display: {
    color: '#102030',
    metalness: 0.1,
    roughness: 0.2,
    emissive: '#004466',
    emissiveIntensity: 0.3,
  },
  pcb_green: {
    color: '#1a5c2a',
    metalness: 0.15,
    roughness: 0.7,
  },
  bnc_connector: {
    color: '#c0a040',
    metalness: 0.9,
    roughness: 0.25,
  },
  reflector_aluminum: {
    color: '#f0f0f5',
    metalness: 0.95,
    roughness: 0.03,
  },
  shutter_plate: {
    color: '#303038',
    metalness: 0.7,
    roughness: 0.4,
  },
  terminal_block: {
    color: '#e8e0d0',
    metalness: 0.1,
    roughness: 0.8,
  },
};

// ─── Material cache ──────────────────────────────────────────────────────────

const _iecMatCache = new Map<string, MeshStandardMaterial>();

/**
 * Get or create a cached MeshStandardMaterial for a given IEC material key.
 * Returns a shared instance (do not modify directly; clone if per-mesh changes needed).
 */
export function getIECMaterial(key: string): MeshStandardMaterial {
  const cached = _iecMatCache.get(key);
  if (cached) return cached;

  const def = IEC_MATERIAL_DEFS[key as IECMaterialKey];
  if (!def) {
    // Fallback: neutral grey
    const fallback = new MeshStandardMaterial({
      color: new Color('#808080'),
      metalness: 0.3,
      roughness: 0.6,
    });
    fallback.name = key;
    _iecMatCache.set(key, fallback);
    return fallback;
  }

  const mat = new MeshStandardMaterial({
    color: new Color(def.color),
    metalness: def.metalness,
    roughness: def.roughness,
    transparent: def.transparent ?? false,
    opacity: def.opacity ?? 1,
    side: def.side ?? FrontSide,
  });

  if (def.emissive) {
    mat.emissive = new Color(def.emissive);
    mat.emissiveIntensity = def.emissiveIntensity ?? 0;
  }

  mat.name = key;
  _iecMatCache.set(key, mat);
  return mat;
}

/**
 * Create a highlight clone of a material (for hover/selection effects).
 * Not cached — caller is responsible for disposal.
 */
export function createHighlightMaterial(
  baseMat: MeshStandardMaterial,
  highlightColor = '#00d4ff',
  intensity = 0.4
): MeshStandardMaterial {
  const clone = baseMat.clone();
  clone.emissive = new Color(highlightColor);
  clone.emissiveIntensity = intensity;
  return clone;
}

/**
 * Dispose all cached IEC materials (call on unmount).
 */
export function disposeIECMaterials(): void {
  _iecMatCache.forEach(m => m.dispose());
  _iecMatCache.clear();
}
