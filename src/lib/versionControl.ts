// ═══════════════════════════════════════════════════════════════════════════════
// Drawing Version Control — Immutable snapshot history with diff & rollback
// ═══════════════════════════════════════════════════════════════════════════════

import type { Drawing, DrawingLayer, DrawingCommand } from './drawingEngine';
import { renderDrawingToSVG, createA3Viewport } from './drawingEngine';

// ── Types ───────────────────────────────────────────────────────────────────

/** A single saved snapshot of a drawing. */
export interface DrawingVersion {
  readonly id: string;
  readonly drawingId: string;
  readonly timestamp: number;
  readonly drawing: Readonly<Drawing>;
  readonly thumbnail: string;
  readonly description: string;
  readonly tags: ReadonlyArray<string>;
}

/** Describes differences between two versions. */
export interface DrawingDiff {
  readonly v1: string;
  readonly v2: string;
  readonly layersAdded: ReadonlyArray<string>;
  readonly layersRemoved: ReadonlyArray<string>;
  readonly layersModified: ReadonlyArray<LayerDiff>;
  readonly metadataChanged: ReadonlyArray<string>;
}

/** Describes changes within a single layer. */
export interface LayerDiff {
  readonly layerName: string;
  readonly commandsAdded: number;
  readonly commandsRemoved: number;
  readonly commandsModified: number;
  readonly colorChanged: boolean;
  readonly visibilityChanged: boolean;
}

// ── Thumbnail Generation ────────────────────────────────────────────────────

/** Generate a small base64-encoded SVG thumbnail of a drawing. */
function generateThumbnail(drawing: Readonly<Drawing>): string {
  const vp = { ...createA3Viewport(), width: 200, height: 141 };
  const svg = renderDrawingToSVG(drawing, vp);
  if (typeof btoa === 'function') {
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ── Version ID Generation ───────────────────────────────────────────────────

function makeVersionId(): string {
  return `ver_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Storage Key ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'shilpasutra_drawing_versions';

// ── Drawing Version Control ─────────────────────────────────────────────────

/**
 * Manages an append-only history of drawing snapshots.
 * Supports save, restore, diff, undo/redo, and JSON import/export.
 */
export class DrawingVersionControl {
  private versions: DrawingVersion[] = [];
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private currentVersionId: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  // ── Core Operations ─────────────────────────────────────────────────

  /**
   * Save a snapshot of the given drawing.
   * @returns The new version ID.
   */
  save(drawing: Readonly<Drawing>, description: string, tags: ReadonlyArray<string> = []): string {
    const id = makeVersionId();
    const version: DrawingVersion = Object.freeze({
      id,
      drawingId: drawing.id,
      timestamp: Date.now(),
      drawing,
      thumbnail: generateThumbnail(drawing),
      description,
      tags: Object.freeze([...tags]),
    });

    this.versions = [...this.versions, version];

    if (this.currentVersionId) {
      this.undoStack = [...this.undoStack, this.currentVersionId];
    }
    this.redoStack = [];
    this.currentVersionId = id;

    this.persistToStorage();
    return id;
  }

  /** Restore a drawing from a specific version ID. */
  restore(versionId: string): Readonly<Drawing> {
    const version = this.versions.find(v => v.id === versionId);
    if (!version) {
      throw new Error(`Version not found: ${versionId}`);
    }

    if (this.currentVersionId && this.currentVersionId !== versionId) {
      this.undoStack = [...this.undoStack, this.currentVersionId];
      this.redoStack = [];
    }
    this.currentVersionId = versionId;

    return version.drawing;
  }

  /** List all versions for a given drawing, newest first. */
  list(drawingId: string): ReadonlyArray<DrawingVersion> {
    return this.versions
      .filter(v => v.drawingId === drawingId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /** List all versions across all drawings, newest first. */
  listAll(): ReadonlyArray<DrawingVersion> {
    return [...this.versions].sort((a, b) => b.timestamp - a.timestamp);
  }

  // ── Undo / Redo ───────────────────────────────────────────────────────

  /** Undo: restore the previous version. */
  undo(): Readonly<Drawing> | null {
    if (this.undoStack.length === 0) return null;
    const prevId = this.undoStack[this.undoStack.length - 1];
    this.undoStack = this.undoStack.slice(0, -1);

    if (this.currentVersionId) {
      this.redoStack = [...this.redoStack, this.currentVersionId];
    }
    this.currentVersionId = prevId;

    const version = this.versions.find(v => v.id === prevId);
    return version?.drawing ?? null;
  }

  /** Redo: restore the next version after an undo. */
  redo(): Readonly<Drawing> | null {
    if (this.redoStack.length === 0) return null;
    const nextId = this.redoStack[this.redoStack.length - 1];
    this.redoStack = this.redoStack.slice(0, -1);

    if (this.currentVersionId) {
      this.undoStack = [...this.undoStack, this.currentVersionId];
    }
    this.currentVersionId = nextId;

    const version = this.versions.find(v => v.id === nextId);
    return version?.drawing ?? null;
  }

  /** Check if undo is available. */
  canUndo(): boolean { return this.undoStack.length > 0; }

  /** Check if redo is available. */
  canRedo(): boolean { return this.redoStack.length > 0; }

  /** Get current version ID. */
  getCurrentVersionId(): string | null { return this.currentVersionId; }

  // ── Diff ──────────────────────────────────────────────────────────────

  /** Compare two versions and return a structured diff. */
  diff(v1Id: string, v2Id: string): DrawingDiff {
    const ver1 = this.versions.find(v => v.id === v1Id);
    const ver2 = this.versions.find(v => v.id === v2Id);
    if (!ver1 || !ver2) {
      throw new Error(`Version not found: ${!ver1 ? v1Id : v2Id}`);
    }

    const d1 = ver1.drawing;
    const d2 = ver2.drawing;

    const names1 = new Set(d1.layers.map(l => l.name));
    const names2 = new Set(d2.layers.map(l => l.name));

    const layersAdded = Array.from(names2).filter(n => !names1.has(n));
    const layersRemoved = Array.from(names1).filter(n => !names2.has(n));

    const layersModified: LayerDiff[] = [];
    for (const name of Array.from(names1)) {
      if (!names2.has(name)) continue;
      const l1 = d1.layers.find(l => l.name === name);
      const l2 = d2.layers.find(l => l.name === name);
      if (!l1 || !l2) continue;

      const diff = diffLayer(l1, l2);
      if (diff.commandsAdded > 0 || diff.commandsRemoved > 0 ||
          diff.commandsModified > 0 || diff.colorChanged || diff.visibilityChanged) {
        layersModified.push(diff);
      }
    }

    const metadataChanged: string[] = [];
    if (d1.title !== d2.title) metadataChanged.push('title');
    if (d1.standard !== d2.standard) metadataChanged.push('standard');
    if (d1.scale !== d2.scale) metadataChanged.push('scale');

    return Object.freeze({
      v1: v1Id, v2: v2Id,
      layersAdded: Object.freeze(layersAdded),
      layersRemoved: Object.freeze(layersRemoved),
      layersModified: Object.freeze(layersModified),
      metadataChanged: Object.freeze(metadataChanged),
    });
  }

  // ── Import / Export ───────────────────────────────────────────────────

  /** Export all versions as a JSON string. */
  export(): string {
    return JSON.stringify({
      versions: this.versions,
      undoStack: this.undoStack,
      redoStack: this.redoStack,
      currentVersionId: this.currentVersionId,
    }, null, 2);
  }

  /** Import versions from a JSON string (merges with existing). */
  import(json: string): void {
    const data = JSON.parse(json) as {
      versions: DrawingVersion[];
      undoStack?: string[];
      redoStack?: string[];
      currentVersionId?: string | null;
    };

    const existingIds = new Set(this.versions.map(v => v.id));
    const newVersions = (data.versions ?? []).filter(v => !existingIds.has(v.id));
    this.versions = [...this.versions, ...newVersions];

    if (data.undoStack) this.undoStack = data.undoStack;
    if (data.redoStack) this.redoStack = data.redoStack;
    if (data.currentVersionId !== undefined) this.currentVersionId = data.currentVersionId;

    this.persistToStorage();
  }

  // ── Pruning ───────────────────────────────────────────────────────────

  /** Remove old versions, keeping only the most recent `keepLast` per drawing. */
  prune(keepLast: number): void {
    const grouped = new Map<string, DrawingVersion[]>();
    for (const v of this.versions) {
      const arr = grouped.get(v.drawingId) ?? [];
      arr.push(v);
      grouped.set(v.drawingId, arr);
    }

    const kept: DrawingVersion[] = [];
    grouped.forEach((versions) => {
      versions.sort((a, b) => b.timestamp - a.timestamp);
      kept.push(...versions.slice(0, keepLast));
    });

    const keptIds = new Set(kept.map(v => v.id));
    this.versions = kept;
    this.undoStack = this.undoStack.filter(id => keptIds.has(id));
    this.redoStack = this.redoStack.filter(id => keptIds.has(id));

    if (this.currentVersionId && !keptIds.has(this.currentVersionId)) {
      this.currentVersionId = kept.length > 0 ? kept[0].id : null;
    }

    this.persistToStorage();
  }

  // ── Persistence ───────────────────────────────────────────────────────

  private persistToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, this.export());
    } catch {
      // Storage full — prune and retry
      this.prune(5);
      try {
        localStorage.setItem(STORAGE_KEY, this.export());
      } catch {
        // Silently fail if still too large
      }
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) this.import(data);
    } catch {
      // Corrupted data — start fresh
    }
  }
}

// ── Layer Diff Helper ───────────────────────────────────────────────────────

function diffLayer(l1: Readonly<DrawingLayer>, l2: Readonly<DrawingLayer>): LayerDiff {
  const cmds1 = l1.commands.map(commandFingerprint);
  const cmds2 = l2.commands.map(commandFingerprint);
  const set1 = new Set(cmds1);
  const set2 = new Set(cmds2);

  let added = 0, removed = 0;
  set2.forEach(fp => { if (!set1.has(fp)) added++; });
  set1.forEach(fp => { if (!set2.has(fp)) removed++; });

  return {
    layerName: l1.name,
    commandsAdded: added,
    commandsRemoved: removed,
    commandsModified: Math.min(added, removed),
    colorChanged: l1.color !== l2.color,
    visibilityChanged: l1.visible !== l2.visible,
  };
}

/** Produce a stable string fingerprint of a command for diffing. */
function commandFingerprint(cmd: DrawingCommand): string {
  return JSON.stringify(cmd);
}
