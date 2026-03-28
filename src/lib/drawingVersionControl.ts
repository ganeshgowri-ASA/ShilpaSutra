// ============================================================================
// ShilpaSutra Drawing Version Control / Rollback System
// localStorage-based versioning with FIFO limit, thumbnails, diff view
// ============================================================================

// ── Types ───────────────────────────────────────────────────────────────────

export type VersionType = "drawing" | "cfd-simulation" | "fem-simulation" | "fea-modal" | "fea-buckling" | "cad-model";

export interface VersionEntry {
  id: string;
  timestamp: number;
  type: VersionType;
  label: string;
  data: string;            // JSON-serialized state
  thumbnail: string;       // base64 data URL or empty
  parameters: Record<string, number | string | boolean>;
}

export interface VersionDiff {
  paramKey: string;
  oldValue: string | number | boolean | undefined;
  newValue: string | number | boolean | undefined;
  changed: boolean;
}

// ── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "shilpasutra_version_history";
const MAX_VERSIONS = 50;

// ── Utilities ───────────────────────────────────────────────────────────────

function generateId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Core Functions ──────────────────────────────────────────────────────────

export function getVersionHistory(): VersionEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as VersionEntry[];
  } catch {
    return [];
  }
}

export function saveVersion(
  type: VersionType,
  label: string,
  data: unknown,
  parameters: Record<string, number | string | boolean>,
  thumbnail: string = ""
): VersionEntry {
  const entry: VersionEntry = {
    id: generateId(),
    timestamp: Date.now(),
    type,
    label,
    data: JSON.stringify(data),
    thumbnail,
    parameters,
  };

  const history = getVersionHistory();
  history.push(entry);

  // FIFO: remove oldest entries beyond limit
  while (history.length > MAX_VERSIONS) {
    history.shift();
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Storage full - remove oldest half and retry
      const trimmed = history.slice(Math.floor(history.length / 2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    }
  }

  return entry;
}

export function restoreVersion(id: string): VersionEntry | null {
  const history = getVersionHistory();
  return history.find(v => v.id === id) || null;
}

export function deleteVersion(id: string): void {
  const history = getVersionHistory();
  const filtered = history.filter(v => v.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
}

export function clearVersionHistory(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// ── Diff ────────────────────────────────────────────────────────────────────

export function diffVersions(v1: VersionEntry, v2: VersionEntry): VersionDiff[] {
  const allKeys = Array.from(new Set([...Object.keys(v1.parameters), ...Object.keys(v2.parameters)]));
  const diffs: VersionDiff[] = [];

  for (const key of allKeys) {
    const oldVal = v1.parameters[key];
    const newVal = v2.parameters[key];
    diffs.push({
      paramKey: key,
      oldValue: oldVal,
      newValue: newVal,
      changed: oldVal !== newVal,
    });
  }

  return diffs;
}

// ── Export ───────────────────────────────────────────────────────────────────

export function exportVersionHistory(): string {
  const history = getVersionHistory();
  return JSON.stringify(history, null, 2);
}

export function importVersionHistory(json: string): boolean {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return false;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.slice(-MAX_VERSIONS)));
    }
    return true;
  } catch {
    return false;
  }
}

// ── Thumbnail Generation ────────────────────────────────────────────────────

export function captureThumbnail(canvas: HTMLCanvasElement, maxWidth: number = 200): string {
  const ratio = canvas.height / canvas.width;
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = maxWidth;
  thumbCanvas.height = Math.round(maxWidth * ratio);
  const ctx = thumbCanvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  return thumbCanvas.toDataURL("image/png", 0.7);
}

// ── Filter by type ──────────────────────────────────────────────────────────

export function getVersionsByType(type: VersionType): VersionEntry[] {
  return getVersionHistory().filter(v => v.type === type);
}

export function getLatestVersion(type?: VersionType): VersionEntry | null {
  const history = type ? getVersionsByType(type) : getVersionHistory();
  return history.length > 0 ? history[history.length - 1] : null;
}

// ── Format timestamp ────────────────────────────────────────────────────────

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
