export type GDTCharacteristic =
  | "flatness"
  | "straightness"
  | "circularity"
  | "cylindricity"
  | "profile_line"
  | "profile_surface"
  | "perpendicularity"
  | "parallelism"
  | "angularity"
  | "position"
  | "concentricity"
  | "symmetry"
  | "circular_runout"
  | "total_runout";

export type GDTCategory = "Form" | "Orientation" | "Location" | "Profile" | "Runout";

export interface GDTSymbolDef {
  id: GDTCharacteristic;
  label: string;
  symbol: string;
  unicode: string;
  category: GDTCategory;
  requiresDatum: boolean;
  description: string;
}

export interface GDTFeatureControlFrame {
  id: string;
  characteristic: GDTCharacteristic;
  tolerance: number;
  toleranceUnit: "mm" | "in";
  modifier?: "MMC" | "LMC" | "RFS";
  primaryDatum?: string;
  secondaryDatum?: string;
  tertiaryDatum?: string;
  primaryModifier?: "MMC" | "LMC";
  secondaryModifier?: "MMC" | "LMC";
  diametricalZone?: boolean;
}

export interface DatumReference {
  id: string;
  label: string; // A, B, C, etc.
  description: string;
  surfaceType: "planar" | "cylindrical" | "point" | "edge";
}

export const gdtSymbolDefinitions: GDTSymbolDef[] = [
  // Form tolerances
  { id: "flatness", label: "Flatness", symbol: "⏥", unicode: "\u23E5", category: "Form", requiresDatum: false, description: "Surface must lie between two parallel planes" },
  { id: "straightness", label: "Straightness", symbol: "⏤", unicode: "\u23E4", category: "Form", requiresDatum: false, description: "Line element must lie between two parallel lines" },
  { id: "circularity", label: "Circularity", symbol: "○", unicode: "\u25CB", category: "Form", requiresDatum: false, description: "Cross-section must lie between two concentric circles" },
  { id: "cylindricity", label: "Cylindricity", symbol: "⌭", unicode: "\u232D", category: "Form", requiresDatum: false, description: "Surface must lie between two coaxial cylinders" },

  // Profile tolerances
  { id: "profile_line", label: "Profile of a Line", symbol: "⌒", unicode: "\u2312", category: "Profile", requiresDatum: false, description: "Line profile must lie within tolerance zone" },
  { id: "profile_surface", label: "Profile of a Surface", symbol: "⌓", unicode: "\u2313", category: "Profile", requiresDatum: false, description: "Surface profile must lie within tolerance zone" },

  // Orientation tolerances
  { id: "perpendicularity", label: "Perpendicularity", symbol: "⊥", unicode: "\u27C2", category: "Orientation", requiresDatum: true, description: "Feature must be perpendicular to datum within tolerance" },
  { id: "parallelism", label: "Parallelism", symbol: "∥", unicode: "\u2225", category: "Orientation", requiresDatum: true, description: "Feature must be parallel to datum within tolerance" },
  { id: "angularity", label: "Angularity", symbol: "∠", unicode: "\u2220", category: "Orientation", requiresDatum: true, description: "Feature at specified angle to datum within tolerance" },

  // Location tolerances
  { id: "position", label: "Position", symbol: "⊕", unicode: "\u2295", category: "Location", requiresDatum: true, description: "Feature axis/center must be within tolerance zone" },
  { id: "concentricity", label: "Concentricity", symbol: "◎", unicode: "\u25CE", category: "Location", requiresDatum: true, description: "Median points must lie within tolerance zone" },
  { id: "symmetry", label: "Symmetry", symbol: "⌯", unicode: "\u232F", category: "Location", requiresDatum: true, description: "Median plane must lie within tolerance zone" },

  // Runout tolerances
  { id: "circular_runout", label: "Circular Runout", symbol: "↗", unicode: "\u2197", category: "Runout", requiresDatum: true, description: "Surface deviation during one revolution about datum axis" },
  { id: "total_runout", label: "Total Runout", symbol: "↗↗", unicode: "\u2197\u2197", category: "Runout", requiresDatum: true, description: "Surface deviation during full axial traverse about datum axis" },
];

export const modifierSymbols: Record<string, string> = {
  MMC: "\u24C2", // Ⓜ
  LMC: "\u24C1", // Ⓛ
  RFS: "\u24C8", // Ⓢ
  DIAMETER: "\u2300", // ⌀
};

export function formatFCF(frame: GDTFeatureControlFrame): string {
  const sym = gdtSymbolDefinitions.find((s) => s.id === frame.characteristic);
  if (!sym) return "";

  let result = `| ${sym.symbol} | `;
  if (frame.diametricalZone) result += "\u2300 ";
  result += `${frame.tolerance}`;
  if (frame.modifier) result += ` ${modifierSymbols[frame.modifier]}`;
  result += " |";

  if (frame.primaryDatum) {
    result += ` ${frame.primaryDatum}`;
    if (frame.primaryModifier) result += ` ${modifierSymbols[frame.primaryModifier]}`;
    result += " |";
  }
  if (frame.secondaryDatum) {
    result += ` ${frame.secondaryDatum}`;
    if (frame.secondaryModifier) result += ` ${modifierSymbols[frame.secondaryModifier]}`;
    result += " |";
  }
  if (frame.tertiaryDatum) {
    result += ` ${frame.tertiaryDatum} |`;
  }

  return result;
}

export function getSymbolsByCategory(category: GDTCategory): GDTSymbolDef[] {
  return gdtSymbolDefinitions.filter((s) => s.category === category);
}

export const defaultDatums: DatumReference[] = [
  { id: "datum_a", label: "A", description: "Primary datum - bottom face", surfaceType: "planar" },
  { id: "datum_b", label: "B", description: "Secondary datum - back face", surfaceType: "planar" },
  { id: "datum_c", label: "C", description: "Tertiary datum - left face", surfaceType: "planar" },
];
