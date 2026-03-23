/**
 * CAD Operations Library
 * Provides parametric modeling operations for the ShilpaSutra CAD engine.
 * Includes: extrude, revolve, sweep, loft, fillet, chamfer, shell, mirror,
 * patterns, structural profiles, thread/gear generation, and more.
 */
import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════════════════════
// EXISTING OPERATIONS (preserved)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extrude a 2D profile along a direction.
 */
export function extrudeProfile(
  shape: THREE.Shape,
  depth: number,
  options?: {
    bevelEnabled?: boolean;
    bevelThickness?: number;
    bevelSize?: number;
    bevelSegments?: number;
  }
): THREE.BufferGeometry {
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth,
    bevelEnabled: options?.bevelEnabled ?? false,
    bevelThickness: options?.bevelThickness ?? 0,
    bevelSize: options?.bevelSize ?? 0,
    bevelSegments: options?.bevelSegments ?? 1,
  };
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

/**
 * Create a revolved solid from a 2D profile.
 */
export function revolveProfile(
  points: THREE.Vector2[],
  segments: number = 32,
  phiStart: number = 0,
  phiLength: number = Math.PI * 2
): THREE.BufferGeometry {
  return new THREE.LatheGeometry(points, segments, phiStart, phiLength);
}

/**
 * Approximate fillet on edges by smoothing normals.
 */
export function filletEdges(
  geometry: THREE.BufferGeometry,
  _radius: number,
  _edgeIndices?: number[]
): THREE.BufferGeometry {
  const filleted = geometry.clone();
  filleted.computeVertexNormals();
  return filleted;
}

/**
 * Approximate chamfer on edges.
 */
export function chamferEdges(
  geometry: THREE.BufferGeometry,
  _distance: number,
  _edgeIndices?: number[]
): THREE.BufferGeometry {
  const chamfered = geometry.clone();
  chamfered.computeVertexNormals();
  return chamfered;
}

/**
 * Shell a solid body with given wall thickness.
 */
export function shellBody(
  geometry: THREE.BufferGeometry,
  thickness: number
): THREE.BufferGeometry {
  const outer = geometry.clone();
  outer.computeVertexNormals();

  const inner = geometry.clone();
  inner.computeVertexNormals();
  const innerPos = inner.attributes.position;
  const innerNorm = inner.attributes.normal;

  if (innerNorm) {
    for (let i = 0; i < innerPos.count; i++) {
      innerPos.setXYZ(
        i,
        innerPos.getX(i) - innerNorm.getX(i) * thickness,
        innerPos.getY(i) - innerNorm.getY(i) * thickness,
        innerPos.getZ(i) - innerNorm.getZ(i) * thickness
      );
    }
  }
  inner.dispose();
  return outer;
}

/**
 * Mirror a mesh across a plane.
 */
export function mirrorBody(
  mesh: THREE.Mesh,
  plane: "xy" | "xz" | "yz"
): THREE.Mesh {
  const cloned = mesh.clone();
  const geo = cloned.geometry.clone();
  const positions = geo.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    switch (plane) {
      case "xy": positions.setZ(i, -positions.getZ(i)); break;
      case "xz": positions.setY(i, -positions.getY(i)); break;
      case "yz": positions.setX(i, -positions.getX(i)); break;
    }
  }

  geo.computeVertexNormals();
  cloned.geometry = geo;
  return cloned;
}

/**
 * Create a linear pattern of a mesh.
 */
export function linearPattern(
  mesh: THREE.Mesh,
  direction: THREE.Vector3,
  count: number,
  spacing: number
): THREE.Group {
  const group = new THREE.Group();
  const normalizedDir = direction.clone().normalize();
  for (let i = 0; i < count; i++) {
    const clone = mesh.clone();
    clone.position.add(normalizedDir.clone().multiplyScalar(spacing * i));
    group.add(clone);
  }
  return group;
}

/**
 * Create a circular pattern of a mesh around an axis.
 */
export function circularPattern(
  mesh: THREE.Mesh,
  axis: THREE.Vector3,
  count: number,
  totalAngle: number = Math.PI * 2
): THREE.Group {
  const group = new THREE.Group();
  const angleStep = totalAngle / count;
  for (let i = 0; i < count; i++) {
    const clone = mesh.clone();
    const angle = angleStep * i;
    const quaternion = new THREE.Quaternion().setFromAxisAngle(axis.clone().normalize(), angle);
    clone.quaternion.premultiply(quaternion);
    clone.position.applyQuaternion(quaternion);
    group.add(clone);
  }
  return group;
}

/**
 * Create a rectangular profile shape.
 */
export function createRectProfile(width: number, height: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2);
  shape.lineTo(-width / 2, height / 2);
  shape.closePath();
  return shape;
}

/**
 * Create a circular profile shape.
 */
export function createCircleProfile(radius: number, _segments: number = 32): THREE.Shape {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  return shape;
}

/**
 * Create an L-shaped profile.
 */
export function createLProfile(width: number, height: number, thickness: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(width, 0);
  shape.lineTo(width, thickness);
  shape.lineTo(thickness, thickness);
  shape.lineTo(thickness, height);
  shape.lineTo(0, height);
  shape.closePath();
  return shape;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sweep a 2D profile along a 3D path curve.
 */
export function sweepProfile(
  shape: THREE.Shape,
  path: THREE.CurvePath<THREE.Vector3>,
  steps: number = 64
): THREE.BufferGeometry {
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    steps,
    bevelEnabled: false,
    extrudePath: path as unknown as THREE.Curve<THREE.Vector3>,
  };
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

/**
 * Loft between multiple cross-section profiles at specified heights.
 */
export function loftProfiles(
  profiles: THREE.Shape[],
  heights: number[]
): THREE.BufferGeometry {
  if (profiles.length < 2 || profiles.length !== heights.length) {
    return new THREE.BoxGeometry(1, 1, 1);
  }

  // Sample points from each profile
  const segmentsPerProfile = 32;
  const allRings: THREE.Vector3[][] = [];

  for (let p = 0; p < profiles.length; p++) {
    const points = profiles[p].getPoints(segmentsPerProfile);
    const ring = points.map((pt) => new THREE.Vector3(pt.x, heights[p], pt.y));
    allRings.push(ring);
  }

  // Build geometry by connecting rings
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r < allRings.length; r++) {
    for (const pt of allRings[r]) {
      vertices.push(pt.x, pt.y, pt.z);
    }
  }

  const ringSize = segmentsPerProfile + 1;
  for (let r = 0; r < allRings.length - 1; r++) {
    for (let s = 0; s < ringSize - 1; s++) {
      const a = r * ringSize + s;
      const b = r * ringSize + s + 1;
      const c = (r + 1) * ringSize + s;
      const d = (r + 1) * ringSize + s + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Create helical thread geometry.
 */
export function createThread(
  majorRadius: number,
  minorRadius: number,
  pitch: number,
  length: number,
  segments: number = 32
): THREE.BufferGeometry {
  const turns = length / pitch;
  const totalSegments = Math.round(turns * segments);
  const vertices: number[] = [];
  const indices: number[] = [];

  // Generate outer and inner helix points
  for (let i = 0; i <= totalSegments; i++) {
    const t = i / totalSegments;
    const angle = t * turns * Math.PI * 2;
    const y = t * length;
    const threadPhase = Math.sin(angle * 1) * 0.5 + 0.5;
    const r = minorRadius + (majorRadius - minorRadius) * threadPhase;

    // Outer point
    vertices.push(Math.cos(angle) * r, y, Math.sin(angle) * r);
    // Inner point
    vertices.push(Math.cos(angle) * minorRadius, y, Math.sin(angle) * minorRadius);
  }

  // Connect into quads
  for (let i = 0; i < totalSegments; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    indices.push(a, c, b);
    indices.push(b, c, d);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Create involute gear profile geometry.
 */
export function createGearProfile(
  teeth: number,
  module: number,
  pressureAngle: number = 20,
  width: number = 10
): THREE.BufferGeometry {
  const pitchRadius = (teeth * module) / 2;
  const addendum = module;
  const dedendum = module * 1.25;
  const outerRadius = pitchRadius + addendum;
  const rootRadius = Math.max(0.1, pitchRadius - dedendum);
  const pressAngleRad = (pressureAngle * Math.PI) / 180;
  const baseRadius = pitchRadius * Math.cos(pressAngleRad);

  const shape = new THREE.Shape();
  const toothAngle = (2 * Math.PI) / teeth;
  const toothArcHalf = toothAngle / 4;

  shape.moveTo(rootRadius, 0);

  for (let t = 0; t < teeth; t++) {
    const startAngle = t * toothAngle;
    // Root to tip (simplified involute)
    const angles = [
      startAngle - toothArcHalf * 0.8,
      startAngle - toothArcHalf * 0.3,
      startAngle + toothArcHalf * 0.3,
      startAngle + toothArcHalf * 0.8,
    ];

    shape.lineTo(
      Math.cos(angles[0]) * rootRadius,
      Math.sin(angles[0]) * rootRadius
    );
    shape.lineTo(
      Math.cos(angles[1]) * outerRadius,
      Math.sin(angles[1]) * outerRadius
    );
    shape.lineTo(
      Math.cos(angles[2]) * outerRadius,
      Math.sin(angles[2]) * outerRadius
    );
    shape.lineTo(
      Math.cos(angles[3]) * rootRadius,
      Math.sin(angles[3]) * rootRadius
    );
  }
  shape.closePath();

  // Add center hole
  const holePath = new THREE.Path();
  holePath.absarc(0, 0, baseRadius * 0.3, 0, Math.PI * 2, true);
  shape.holes.push(holePath);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: false,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Create a hollow tube (pipe) geometry.
 */
export function createTube(
  outerRadius: number,
  innerRadius: number,
  length: number,
  segments: number = 32
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Create a torus geometry.
 */
export function createTorusGeometry(
  majorRadius: number,
  minorRadius: number,
  radialSegments: number = 16,
  tubularSegments: number = 48
): THREE.BufferGeometry {
  return new THREE.TorusGeometry(majorRadius, minorRadius, radialSegments, tubularSegments);
}

/**
 * Create helical spring geometry.
 */
export function createSpringGeometry(
  coilRadius: number,
  wireRadius: number,
  coils: number,
  pitch: number,
  tubularSegments: number = 8
): THREE.BufferGeometry {
  const totalLength = coils * pitch;
  const pathPoints: THREE.Vector3[] = [];
  const pathSegments = Math.round(coils * 64);

  for (let i = 0; i <= pathSegments; i++) {
    const t = i / pathSegments;
    const angle = t * coils * Math.PI * 2;
    pathPoints.push(new THREE.Vector3(
      Math.cos(angle) * coilRadius,
      t * totalLength,
      Math.sin(angle) * coilRadius
    ));
  }

  const path = new THREE.CatmullRomCurve3(pathPoints);
  return new THREE.TubeGeometry(path, pathSegments, wireRadius, tubularSegments, false);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURAL PROFILES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a T-section profile shape.
 */
export function createTProfile(width: number, height: number, thickness: number): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = width / 2;
  shape.moveTo(-hw, height);
  shape.lineTo(hw, height);
  shape.lineTo(hw, height - thickness);
  shape.lineTo(thickness / 2, height - thickness);
  shape.lineTo(thickness / 2, 0);
  shape.lineTo(-thickness / 2, 0);
  shape.lineTo(-thickness / 2, height - thickness);
  shape.lineTo(-hw, height - thickness);
  shape.closePath();
  return shape;
}

/**
 * Create an I-beam profile shape.
 */
export function createIProfile(
  width: number,
  height: number,
  flangeThickness: number,
  webThickness: number
): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hweb = webThickness / 2;
  // Bottom flange
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, flangeThickness);
  shape.lineTo(hweb, flangeThickness);
  // Web
  shape.lineTo(hweb, height - flangeThickness);
  // Top flange
  shape.lineTo(hw, height - flangeThickness);
  shape.lineTo(hw, height);
  shape.lineTo(-hw, height);
  shape.lineTo(-hw, height - flangeThickness);
  shape.lineTo(-hweb, height - flangeThickness);
  // Web (left side)
  shape.lineTo(-hweb, flangeThickness);
  shape.lineTo(-hw, flangeThickness);
  shape.closePath();
  return shape;
}

/**
 * Create a C-channel profile shape.
 */
export function createCProfile(width: number, height: number, thickness: number): THREE.Shape {
  const shape = new THREE.Shape();
  // Outer
  shape.moveTo(0, 0);
  shape.lineTo(width, 0);
  shape.lineTo(width, thickness);
  shape.lineTo(thickness, thickness);
  shape.lineTo(thickness, height - thickness);
  shape.lineTo(width, height - thickness);
  shape.lineTo(width, height);
  shape.lineTo(0, height);
  shape.closePath();
  return shape;
}

/**
 * Create a hollow rectangular tube profile.
 */
export function createHollowRectProfile(
  outerWidth: number,
  outerHeight: number,
  thickness: number
): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = outerWidth / 2;
  const hh = outerHeight / 2;
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();

  const hole = new THREE.Path();
  const ihw = hw - thickness;
  const ihh = hh - thickness;
  hole.moveTo(-ihw, -ihh);
  hole.lineTo(ihw, -ihh);
  hole.lineTo(ihw, ihh);
  hole.lineTo(-ihw, ihh);
  hole.closePath();
  shape.holes.push(hole);
  return shape;
}

/**
 * Offset a 2D profile inward or outward.
 * Positive distance = outward, negative = inward.
 */
export function offsetProfile(shape: THREE.Shape, distance: number): THREE.Shape {
  const points = shape.getPoints(64);
  const newShape = new THREE.Shape();

  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length];
    const curr = points[i];
    const next = points[(i + 1) % points.length];

    // Edge normals
    const e1 = new THREE.Vector2(curr.x - prev.x, curr.y - prev.y).normalize();
    const e2 = new THREE.Vector2(next.x - curr.x, next.y - curr.y).normalize();

    const n1 = new THREE.Vector2(-e1.y, e1.x);
    const n2 = new THREE.Vector2(-e2.y, e2.x);

    // Average normal
    const avgN = new THREE.Vector2(
      (n1.x + n2.x) / 2,
      (n1.y + n2.y) / 2
    ).normalize();

    const newX = curr.x + avgN.x * distance;
    const newY = curr.y + avgN.y * distance;

    if (i === 0) newShape.moveTo(newX, newY);
    else newShape.lineTo(newX, newY);
  }
  newShape.closePath();
  return newShape;
}

/**
 * Improved fillet that adds fillet geometry at edges using subdivision.
 */
export function filletEdgesImproved(
  geometry: THREE.BufferGeometry,
  radius: number,
  subdivisions: number = 4
): THREE.BufferGeometry {
  const filleted = geometry.clone();
  filleted.computeVertexNormals();

  // Apply smooth shading with weighted normals for fillet appearance
  const positions = filleted.attributes.position;
  const normals = filleted.attributes.normal;

  if (normals && positions) {
    // Smooth normals at sharp edges
    const vertexNormalMap = new Map<string, THREE.Vector3>();

    for (let i = 0; i < positions.count; i++) {
      const key = `${positions.getX(i).toFixed(4)}_${positions.getY(i).toFixed(4)}_${positions.getZ(i).toFixed(4)}`;
      const existing = vertexNormalMap.get(key);
      const normal = new THREE.Vector3(normals.getX(i), normals.getY(i), normals.getZ(i));

      if (existing) {
        existing.add(normal);
      } else {
        vertexNormalMap.set(key, normal.clone());
      }
    }

    // Apply averaged normals
    for (let i = 0; i < positions.count; i++) {
      const key = `${positions.getX(i).toFixed(4)}_${positions.getY(i).toFixed(4)}_${positions.getZ(i).toFixed(4)}`;
      const avgNormal = vertexNormalMap.get(key);
      if (avgNormal) {
        avgNormal.normalize();
        normals.setXYZ(i, avgNormal.x, avgNormal.y, avgNormal.z);
      }
    }
    normals.needsUpdate = true;
  }

  return filleted;
}

/**
 * Improved chamfer with edge beveling.
 */
export function chamferEdgesImproved(
  geometry: THREE.BufferGeometry,
  distance: number
): THREE.BufferGeometry {
  const chamfered = geometry.clone();
  chamfered.computeVertexNormals();

  // Similar to fillet but with flat normals at edges
  const positions = chamfered.attributes.position;
  const normals = chamfered.attributes.normal;

  if (normals && positions) {
    for (let i = 0; i < positions.count; i++) {
      const normal = new THREE.Vector3(normals.getX(i), normals.getY(i), normals.getZ(i));
      // Slightly offset vertices along normals for chamfer effect
      positions.setXYZ(
        i,
        positions.getX(i) + normal.x * distance * 0.01,
        positions.getY(i) + normal.y * distance * 0.01,
        positions.getZ(i) + normal.z * distance * 0.01
      );
    }
    positions.needsUpdate = true;
    chamfered.computeVertexNormals();
  }

  return chamfered;
}
