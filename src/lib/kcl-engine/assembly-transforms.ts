/**
 * Assembly Transforms for KCL Engine
 * Component positioning, rotation, and hierarchical assembly construction.
 */
import * as THREE from "three";
import { type SerializedMesh, transformMeshVertices } from "./operations";

// ─── Types ──────────────────────────────────────────────────────────────

export interface ComponentInstance {
  id: string;
  name: string;
  mesh: SerializedMesh;
  position: [number, number, number];
  rotation: [number, number, number]; // Euler angles in radians
  scale: [number, number, number];
  material: MaterialSpec;
  dimensions: { width: number; height: number; depth: number };
  constructionStepIndex: number;
  parentId?: string;
  metadata?: Record<string, string | number>;
}

export interface MaterialSpec {
  name: string;
  color: string;
  metalness: number;
  roughness: number;
  opacity: number;
}

export interface AssemblyNode {
  id: string;
  name: string;
  components: ComponentInstance[];
  children: AssemblyNode[];
  transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
}

// ─── Material Presets ───────────────────────────────────────────────────

export const MATERIALS = {
  aluminum: {
    name: "Aluminum 6061-T6",
    color: "#C0C0C0",
    metalness: 0.85,
    roughness: 0.25,
    opacity: 1.0,
  },
  aluminum_anodized: {
    name: "Anodized Aluminum",
    color: "#A8A8A8",
    metalness: 0.75,
    roughness: 0.3,
    opacity: 1.0,
  },
  glass_tempered: {
    name: "Tempered Glass",
    color: "#B0E0FF",
    metalness: 0.1,
    roughness: 0.05,
    opacity: 0.35,
  },
  glass_back: {
    name: "Back Glass",
    color: "#D0EEFF",
    metalness: 0.1,
    roughness: 0.05,
    opacity: 0.4,
  },
  eva: {
    name: "EVA Encapsulant",
    color: "#F5F5DC",
    metalness: 0.0,
    roughness: 0.6,
    opacity: 0.5,
  },
  silicon_cell: {
    name: "Monocrystalline Silicon",
    color: "#1A1A3E",
    metalness: 0.3,
    roughness: 0.4,
    opacity: 1.0,
  },
  junction_box: {
    name: "PPO Plastic",
    color: "#2D2D2D",
    metalness: 0.0,
    roughness: 0.8,
    opacity: 1.0,
  },
  backsheet: {
    name: "TPT Backsheet",
    color: "#FFFFFF",
    metalness: 0.0,
    roughness: 0.7,
    opacity: 1.0,
  },
  steel_galvanized: {
    name: "Galvanized Steel",
    color: "#8899AA",
    metalness: 0.6,
    roughness: 0.4,
    opacity: 1.0,
  },
  steel_structural: {
    name: "Structural Steel",
    color: "#6B7B8D",
    metalness: 0.55,
    roughness: 0.45,
    opacity: 1.0,
  },
} as const;

export type MaterialPreset = keyof typeof MATERIALS;

// ─── Transform Functions ────────────────────────────────────────────────

/**
 * Create a component instance with positioned mesh.
 */
export function createComponent(
  id: string,
  name: string,
  mesh: SerializedMesh,
  position: [number, number, number],
  rotation: [number, number, number],
  material: MaterialSpec,
  dimensions: { width: number; height: number; depth: number },
  stepIndex: number,
  metadata?: Record<string, string | number>
): ComponentInstance {
  return {
    id,
    name,
    mesh,
    position,
    rotation,
    scale: [1, 1, 1],
    material,
    dimensions,
    constructionStepIndex: stepIndex,
    metadata,
  };
}

/**
 * Translate a component.
 */
export function translateComponent(
  comp: ComponentInstance,
  dx: number,
  dy: number,
  dz: number
): ComponentInstance {
  return {
    ...comp,
    position: [
      comp.position[0] + dx,
      comp.position[1] + dy,
      comp.position[2] + dz,
    ],
  };
}

/**
 * Rotate a component around its origin by Euler angles (radians).
 */
export function rotateComponent(
  comp: ComponentInstance,
  rx: number,
  ry: number,
  rz: number
): ComponentInstance {
  return {
    ...comp,
    rotation: [
      comp.rotation[0] + rx,
      comp.rotation[1] + ry,
      comp.rotation[2] + rz,
    ],
  };
}

/**
 * Apply a tilt transform to a component (for PV module mounting).
 * Tilts around X-axis at a given pivot height.
 */
export function applyTilt(
  comp: ComponentInstance,
  tiltAngleRad: number,
  pivotY: number = 0
): ComponentInstance {
  // Translate to pivot, rotate, translate back
  const dy = comp.position[1] - pivotY;
  const dz = comp.position[2];
  const newY = pivotY + dy * Math.cos(tiltAngleRad) - dz * Math.sin(tiltAngleRad);
  const newZ = dy * Math.sin(tiltAngleRad) + dz * Math.cos(tiltAngleRad);

  return {
    ...comp,
    position: [comp.position[0], newY, newZ],
    rotation: [comp.rotation[0] + tiltAngleRad, comp.rotation[1], comp.rotation[2]],
  };
}

/**
 * Mirror a component across a plane.
 */
export function mirrorComponent(
  comp: ComponentInstance,
  plane: "xy" | "xz" | "yz"
): ComponentInstance {
  const pos = [...comp.position] as [number, number, number];
  const rot = [...comp.rotation] as [number, number, number];

  switch (plane) {
    case "xy": pos[2] = -pos[2]; rot[0] = -rot[0]; break;
    case "xz": pos[1] = -pos[1]; rot[2] = -rot[2]; break;
    case "yz": pos[0] = -pos[0]; rot[1] = -rot[1]; break;
  }

  return { ...comp, position: pos, rotation: rot };
}

// ─── Assembly Builder ───────────────────────────────────────────────────

/**
 * Create an assembly node that groups components.
 */
export function createAssemblyNode(
  id: string,
  name: string,
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0]
): AssemblyNode {
  return {
    id,
    name,
    components: [],
    children: [],
    transform: { position, rotation, scale: [1, 1, 1] },
  };
}

/**
 * Add a component to an assembly node.
 */
export function addToAssembly(node: AssemblyNode, comp: ComponentInstance): AssemblyNode {
  return {
    ...node,
    components: [...node.components, { ...comp, parentId: node.id }],
  };
}

/**
 * Flatten an assembly tree into a flat list of components with world transforms applied.
 */
export function flattenAssembly(node: AssemblyNode): ComponentInstance[] {
  const result: ComponentInstance[] = [];
  const parentPos = node.transform.position;
  const parentRot = node.transform.rotation;

  for (const comp of node.components) {
    result.push({
      ...comp,
      position: [
        comp.position[0] + parentPos[0],
        comp.position[1] + parentPos[1],
        comp.position[2] + parentPos[2],
      ],
      rotation: [
        comp.rotation[0] + parentRot[0],
        comp.rotation[1] + parentRot[1],
        comp.rotation[2] + parentRot[2],
      ],
    });
  }

  for (const child of node.children) {
    const childComps = flattenAssembly({
      ...child,
      transform: {
        ...child.transform,
        position: [
          child.transform.position[0] + parentPos[0],
          child.transform.position[1] + parentPos[1],
          child.transform.position[2] + parentPos[2],
        ],
        rotation: [
          child.transform.rotation[0] + parentRot[0],
          child.transform.rotation[1] + parentRot[1],
          child.transform.rotation[2] + parentRot[2],
        ],
      },
    });
    result.push(...childComps);
  }

  return result;
}

/**
 * Convert assembly components to CadObject-compatible format for the store.
 */
export function componentsToCadParts(
  components: ComponentInstance[]
): Array<{
  type: "mesh";
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  dimensions: { width: number; height: number; depth: number };
  meshVertices: number[];
  meshIndices: number[];
  material: string;
  color: string;
  metalness: number;
  roughness: number;
  opacity: number;
  constructionStepIndex?: number;
}> {
  return components.map(comp => ({
    type: "mesh" as const,
    name: comp.name,
    position: comp.position,
    rotation: comp.rotation,
    scale: comp.scale,
    dimensions: comp.dimensions,
    meshVertices: comp.mesh.meshVertices,
    meshIndices: comp.mesh.meshIndices,
    material: comp.material.name,
    color: comp.material.color,
    metalness: comp.material.metalness,
    roughness: comp.material.roughness,
    opacity: comp.material.opacity,
    constructionStepIndex: comp.constructionStepIndex,
  }));
}
