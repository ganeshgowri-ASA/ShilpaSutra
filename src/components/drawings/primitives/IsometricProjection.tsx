/**
 * Isometric projection utility functions.
 * Uses standard 30-degree isometric math.
 *
 * NOT a React component — pure utility functions returning SVG path data.
 */

const COS30 = Math.cos(Math.PI / 6); // ~0.866
const SIN30 = Math.sin(Math.PI / 6); // 0.5

/** Convert 3D coordinates to 2D isometric screen coordinates */
export function toIso(
  x: number,
  y: number,
  z: number
): { screenX: number; screenY: number } {
  return {
    screenX: (x - z) * COS30,
    screenY: (x + z) * SIN30 - y,
  };
}

/** Generate SVG path string for an isometric 3D box */
export function drawIsoBox(
  x: number,
  y: number,
  z: number,
  width: number,
  depth: number,
  height: number
): string {
  // 8 corners of the box
  const corners = [
    toIso(x, y, z), // 0: front-bottom-left
    toIso(x + width, y, z), // 1: front-bottom-right
    toIso(x + width, y, z + depth), // 2: back-bottom-right
    toIso(x, y, z + depth), // 3: back-bottom-left
    toIso(x, y + height, z), // 4: front-top-left
    toIso(x + width, y + height, z), // 5: front-top-right
    toIso(x + width, y + height, z + depth), // 6: back-top-right
    toIso(x, y + height, z + depth), // 7: back-top-left
  ];

  const p = (i: number) => `${corners[i].screenX},${corners[i].screenY}`;

  // Three visible faces of the box
  const top = `M${p(4)} L${p(5)} L${p(6)} L${p(7)} Z`;
  const left = `M${p(0)} L${p(4)} L${p(7)} L${p(3)} Z`;
  const right = `M${p(1)} L${p(5)} L${p(6)} L${p(2)} Z`;
  const front = `M${p(0)} L${p(1)} L${p(5)} L${p(4)} Z`;

  return `${top} ${left} ${right} ${front}`;
}

/** Generate SVG path for an isometric cylinder approximation */
export function drawIsoCylinder(
  x: number,
  y: number,
  z: number,
  radius: number,
  height: number,
  axis: "x" | "y" | "z" = "y"
): string {
  const segments = 24;
  const topPoints: { screenX: number; screenY: number }[] = [];
  const bottomPoints: { screenX: number; screenY: number }[] = [];

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle) * radius;
    const sin = Math.sin(angle) * radius;

    if (axis === "y") {
      topPoints.push(toIso(x + cos, y + height, z + sin));
      bottomPoints.push(toIso(x + cos, y, z + sin));
    } else if (axis === "x") {
      topPoints.push(toIso(x + height, y + cos, z + sin));
      bottomPoints.push(toIso(x, y + cos, z + sin));
    } else {
      topPoints.push(toIso(x + cos, y + sin, z + height));
      bottomPoints.push(toIso(x + cos, y + sin, z));
    }
  }

  // Top ellipse
  const topPath =
    `M${topPoints[0].screenX},${topPoints[0].screenY} ` +
    topPoints
      .slice(1)
      .map((p) => `L${p.screenX},${p.screenY}`)
      .join(" ") +
    " Z";

  // Bottom ellipse
  const bottomPath =
    `M${bottomPoints[0].screenX},${bottomPoints[0].screenY} ` +
    bottomPoints
      .slice(1)
      .map((p) => `L${p.screenX},${p.screenY}`)
      .join(" ") +
    " Z";

  // Side lines connecting visible portions
  const leftIdx = Math.floor(segments / 4);
  const rightIdx = Math.floor((3 * segments) / 4);
  const sides =
    `M${topPoints[leftIdx].screenX},${topPoints[leftIdx].screenY} ` +
    `L${bottomPoints[leftIdx].screenX},${bottomPoints[leftIdx].screenY} ` +
    `M${topPoints[rightIdx].screenX},${topPoints[rightIdx].screenY} ` +
    `L${bottomPoints[rightIdx].screenX},${bottomPoints[rightIdx].screenY}`;

  return `${topPath} ${bottomPath} ${sides}`;
}

/** Generate SVG polygon for an isometric panel from 3D points */
export function drawIsoPanel(points3D: [number, number, number][]): string {
  if (points3D.length < 3) return "";

  const projected = points3D.map(([px, py, pz]) => toIso(px, py, pz));

  return (
    `M${projected[0].screenX},${projected[0].screenY} ` +
    projected
      .slice(1)
      .map((p) => `L${p.screenX},${p.screenY}`)
      .join(" ") +
    " Z"
  );
}

/**
 * Generate hidden-line style for ghost/transparent mode.
 * Returns SVG attributes for dashed hidden lines.
 */
export function ghostLineStyle(): {
  strokeDasharray: string;
  opacity: number;
  fill: string;
} {
  return {
    strokeDasharray: "4,3",
    opacity: 0.4,
    fill: "none",
  };
}
