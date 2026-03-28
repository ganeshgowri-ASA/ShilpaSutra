/**
 * pvGeometryRenderer.ts
 * Converts pvModule3DBuilder SolidPrimitive[] → Three.js Meshes with proper PBR materials.
 * Extends existing cad-operations primitives; does NOT rewrite them.
 * Scene unit: 1 unit = 10 mm.
 */

import * as THREE from "three";
import type { SolidPrimitive, PVMaterial, PVBuildResult } from "./pvModule3DBuilder";

// ─── PBR material definitions ─────────────────────────────────────────────────

interface PBRDef {
  color: string; metalness: number; roughness: number;
  transparent?: boolean; opacity?: number; side?: THREE.Side;
}

const MAT_DEFS: Record<PVMaterial, PBRDef> = {
  pv_glass:    { color:"#1a2a7a", metalness:0.1,  roughness:0.05, transparent:true,  opacity:0.75, side:THREE.DoubleSide },
  pv_cell:     { color:"#0d1050", metalness:0.15, roughness:0.6  },
  pv_backsheet:{ color:"#e8e8e8", metalness:0.0,  roughness:0.9  },
  al_frame:    { color:"#c8d0d8", metalness:0.85, roughness:0.25 },
  al_rail:     { color:"#b8c0c8", metalness:0.8,  roughness:0.3  },
  al_zclamp:   { color:"#d0d8e0", metalness:0.8,  roughness:0.3  },
  steel_torque:{ color:"#9aacb0", metalness:0.9,  roughness:0.35 },
  steel_leg:   { color:"#90a8a8", metalness:0.85, roughness:0.4  },
  black_plastic:{ color:"#1a1a1a", metalness:0.05, roughness:0.8  },
};

// Material cache — reuse instances to reduce draw calls
const _matCache = new Map<PVMaterial, THREE.MeshStandardMaterial>();

export function getPVMaterial(key: PVMaterial): THREE.MeshStandardMaterial {
  let mat = _matCache.get(key);
  if (!mat) {
    const d = MAT_DEFS[key];
    mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(d.color),
      metalness: d.metalness,
      roughness: d.roughness,
      transparent: d.transparent ?? false,
      opacity: d.opacity ?? 1,
      side: d.side ?? THREE.FrontSide,
    });
    _matCache.set(key, mat);
  }
  return mat;
}

/** Dispose all cached materials (call on scene teardown) */
export function disposePVMaterials(): void {
  _matCache.forEach(m => m.dispose());
  _matCache.clear();
}

// ─── Primitive → Geometry ─────────────────────────────────────────────────────

function buildGeometry(prim: SolidPrimitive): THREE.BufferGeometry {
  const [a, b, cc] = prim.dimensions;
  if (prim.type === "cylinder") {
    // dimensions: [outerR, length, innerR]
    return new THREE.CylinderGeometry(a, a, b, 16, 1, false);
  }
  // box: [w, h, d]
  return new THREE.BoxGeometry(a, b, cc);
}

// ─── Single primitive → Mesh ──────────────────────────────────────────────────

export function primToMesh(prim: SolidPrimitive): THREE.Mesh {
  const geo = buildGeometry(prim);
  const mat = getPVMaterial(prim.material);
  const mesh = new THREE.Mesh(geo, mat);

  mesh.name = prim.name;
  mesh.userData.pvId = prim.id;
  mesh.userData.pvGroup = prim.group ?? "";
  mesh.userData.pvMaterial = prim.material;

  const [px, py, pz] = prim.position;
  const [rx, ry, rz] = prim.rotation;

  mesh.position.set(px, py, pz);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

// ─── Full build result → THREE.Group ─────────────────────────────────────────

export interface PVSceneOptions {
  /** Add ambient + directional lights if true (default false — caller may already have lights) */
  addLights?: boolean;
  /** Group primitives by their group tag into sub-Groups */
  useSubGroups?: boolean;
  /** LOD threshold: skip "inner cutout" style primitives when > this many total prims */
  lodMaxPrims?: number;
}

export function buildPVScene(
  result: PVBuildResult,
  options: PVSceneOptions = {}
): THREE.Group {
  const { addLights = false, useSubGroups = true, lodMaxPrims = 3000 } = options;
  const root = new THREE.Group();
  root.name = "PV_Array";

  // LOD: skip very-fine details when there are too many primitives
  const prims = result.primitives.length > lodMaxPrims
    ? result.primitives.filter(p => !p.name.startsWith("JB Term") && !p.name.startsWith("Frame Corner"))
    : result.primitives;

  if (useSubGroups) {
    // Build a sub-group per group tag
    const groups = new Map<string, THREE.Group>();
    for (const prim of prims) {
      const tag = prim.group ?? "misc";
      if (!groups.has(tag)) {
        const g = new THREE.Group();
        g.name = tag;
        groups.set(tag, g);
        root.add(g);
      }
      groups.get(tag)!.add(primToMesh(prim));
    }
  } else {
    for (const prim of prims) {
      root.add(primToMesh(prim));
    }
  }

  if (addLights) {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.4);
    sun.position.set(80, 160, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.far = 1000;
    root.add(ambient, sun);
  }

  return root;
}

// ─── Scene helpers ────────────────────────────────────────────────────────────

/**
 * Add ground plane at y=0 (galvanised gravel-look).
 */
export function addPVGroundPlane(scene: THREE.Scene | THREE.Group, sizeM = 200): void {
  const geo = new THREE.PlaneGeometry(sizeM * 10, sizeM * 10); // convert m→ scene units
  const mat = new THREE.MeshStandardMaterial({ color: "#b0a890", metalness: 0, roughness: 0.95 });
  const plane = new THREE.Mesh(geo, mat);
  plane.name = "Ground";
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  scene.add(plane);
}

/**
 * Highlight a group of primitives by group tag (e.g., row/module selection).
 * Returns list of meshes that were highlighted (for cleanup).
 */
export function highlightPVGroup(
  root: THREE.Group,
  groupTag: string,
  highlightColor = "#ffdd00"
): THREE.Mesh[] {
  const highlighted: THREE.Mesh[] = [];
  root.traverse(obj => {
    if (obj instanceof THREE.Mesh && obj.userData.pvGroup === groupTag) {
      (obj.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(highlightColor);
      (obj.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3;
      highlighted.push(obj);
    }
  });
  return highlighted;
}

export function clearPVHighlight(meshes: THREE.Mesh[]): void {
  for (const m of meshes) {
    (m.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x000000);
    (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
  }
}

/**
 * Dispose all geometry + materials in a PV group to free GPU memory.
 */
export function disposePVScene(root: THREE.Group): void {
  root.traverse(obj => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
      } else {
        (obj.material as THREE.Material)?.dispose();
      }
    }
  });
  disposePVMaterials();
}

/**
 * Compute an axis-aligned bounding box for the entire PV array scene group.
 */
export function getPVArrayBounds(root: THREE.Group): THREE.Box3 {
  const box3 = new THREE.Box3();
  box3.setFromObject(root);
  return box3;
}

/**
 * Return camera position/target to frame the full array nicely.
 */
export function framePVCamera(root: THREE.Group): {
  position: THREE.Vector3; target: THREE.Vector3;
} {
  const bounds = getPVArrayBounds(root);
  const centre = new THREE.Vector3();
  bounds.getCenter(centre);
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const dist = maxDim * 1.5;
  return {
    position: new THREE.Vector3(centre.x + dist * 0.6, centre.y + dist * 0.5, centre.z + dist),
    target: centre,
  };
}
