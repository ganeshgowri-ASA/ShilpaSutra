"use client";

import type { CadObject } from "@/stores/cad-store";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VersionEntry {
  id: string;
  parentId: string | null;
  branchId: string;
  timestamp: number;
  description: string;
  tag?: string;
  objectCount: number;
  objects: CadObject[];
  thumbnail?: string; // base64 canvas snapshot
}

export interface BranchEntry {
  id: string;
  name: string;
  headVersionId: string | null;
  parentVersionId: string | null; // version this branch forked from
  color: string;
  createdAt: number;
}

export interface VersionDiff {
  added: CadObject[];
  removed: CadObject[];
  modified: Array<{ before: CadObject; after: CadObject; changedProps: string[] }>;
}

// ── IndexedDB Helpers ─────────────────────────────────────────────────────────

const DB_NAME = "shilpasutra_vc";
const DB_VER = 1;
const VS = "versions";
const BS = "branches";
export const MAIN_BRANCH = "main";

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(VS)) {
        db.createObjectStore(VS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(BS)) {
        db.createObjectStore(BS, { keyPath: "id" });
      }
    };
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

async function dbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, "readonly").objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut<T>(store: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, "readwrite").objectStore(store).put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll<T>(store: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, "readonly").objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(store: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, "readwrite").objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Branch Operations ──────────────────────────────────────────────────────────

export async function ensureMainBranch(): Promise<BranchEntry> {
  const existing = await dbGet<BranchEntry>(BS, MAIN_BRANCH);
  if (existing) return existing;
  const main: BranchEntry = {
    id: MAIN_BRANCH,
    name: "main",
    headVersionId: null,
    parentVersionId: null,
    color: "#00D4FF",
    createdAt: Date.now(),
  };
  await dbPut(BS, main);
  return main;
}

export async function createBranch(
  name: string,
  fromVersionId: string,
  color?: string,
): Promise<BranchEntry> {
  const branchColor = color ?? "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
  const branch: BranchEntry = {
    id: crypto.randomUUID(),
    name,
    headVersionId: null,
    parentVersionId: fromVersionId,
    color: branchColor,
    createdAt: Date.now(),
  };
  await dbPut(BS, branch);
  return branch;
}

export async function getAllBranches(): Promise<BranchEntry[]> {
  return dbGetAll<BranchEntry>(BS);
}

export async function deleteBranch(branchId: string): Promise<void> {
  if (branchId === MAIN_BRANCH) return; // can't delete main
  await dbDelete(BS, branchId);
}

// ── Version Operations ─────────────────────────────────────────────────────────

export async function saveSnapshot(
  objects: CadObject[],
  description: string,
  branchId = MAIN_BRANCH,
  thumbnail?: string,
): Promise<VersionEntry> {
  await ensureMainBranch();
  const branch = await dbGet<BranchEntry>(BS, branchId);
  if (!branch) throw new Error(`Branch "${branchId}" not found`);

  const version: VersionEntry = {
    id: crypto.randomUUID(),
    parentId: branch.headVersionId,
    branchId,
    timestamp: Date.now(),
    description,
    objectCount: objects.length,
    objects: JSON.parse(JSON.stringify(objects)), // deep copy
    thumbnail,
  };
  await dbPut(VS, version);
  await dbPut(BS, { ...branch, headVersionId: version.id });
  return version;
}

export async function getAllVersions(): Promise<VersionEntry[]> {
  const all = await dbGetAll<VersionEntry>(VS);
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getVersionsByBranch(branchId: string): Promise<VersionEntry[]> {
  const all = await dbGetAll<VersionEntry>(VS);
  return all
    .filter((v) => v.branchId === branchId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export async function getVersion(id: string): Promise<VersionEntry | undefined> {
  return dbGet<VersionEntry>(VS, id);
}

export async function tagVersion(id: string, tag: string): Promise<void> {
  const v = await dbGet<VersionEntry>(VS, id);
  if (v) await dbPut(VS, { ...v, tag });
}

export async function deleteVersion(id: string): Promise<void> {
  await dbDelete(VS, id);
}

// ── Diff / Compare ─────────────────────────────────────────────────────────────

const DIFF_KEYS: (keyof CadObject)[] = [
  "position", "rotation", "scale", "dimensions", "color", "material", "name", "visible",
];

export function diffVersions(a: VersionEntry, b: VersionEntry): VersionDiff {
  const mapA = new Map(a.objects.map((o) => [o.id, o]));
  const mapB = new Map(b.objects.map((o) => [o.id, o]));
  const added: CadObject[] = [];
  const removed: CadObject[] = [];
  const modified: VersionDiff["modified"] = [];

  for (const [id, obj] of mapB) {
    if (!mapA.has(id)) added.push(obj);
  }
  for (const [id, obj] of mapA) {
    if (!mapB.has(id)) removed.push(obj);
  }
  for (const [id, objA] of mapA) {
    const objB = mapB.get(id);
    if (!objB) continue;
    const changedProps = DIFF_KEYS.filter(
      (k) => JSON.stringify(objA[k]) !== JSON.stringify(objB[k]),
    );
    if (changedProps.length > 0) modified.push({ before: objA, after: objB, changedProps });
  }

  return { added, removed, modified };
}

// ── Auto-save ──────────────────────────────────────────────────────────────────

const AUTO_SAVE_DELAY = 5 * 60 * 1000; // 5 minutes
let _autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleAutoSave(
  getObjects: () => CadObject[],
  branchId = MAIN_BRANCH,
): void {
  if (typeof window === "undefined") return;
  if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(async () => {
    try {
      const objects = getObjects();
      if (objects.length === 0) return;
      await saveSnapshot(objects, "Auto-save", branchId);
    } catch (e) {
      console.warn("[VersionControl] Auto-save failed:", e);
    } finally {
      _autoSaveTimer = null;
    }
  }, AUTO_SAVE_DELAY);
}

export function cancelAutoSave(): void {
  if (_autoSaveTimer) {
    clearTimeout(_autoSaveTimer);
    _autoSaveTimer = null;
  }
}
