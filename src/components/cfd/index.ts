// ============================================================================
// ShilpaSutra CFD Components - Barrel Export
// ============================================================================

export { default as CFDFieldRenderer } from "./CFDFieldRenderer";
export type {
  CFDFieldData,
  ColormapType,
  DisplayField,
  ProbeResult,
  StreamlineConfig,
  VectorConfig,
  ContourConfig,
} from "./CFDFieldRenderer";

export { default as ConvergencePlot } from "./ConvergencePlot";
export type { ResidualEntry } from "./ConvergencePlot";

export { default as VersionHistoryPanel } from "./VersionHistoryPanel";
