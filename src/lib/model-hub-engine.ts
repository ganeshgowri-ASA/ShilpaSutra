// Model Hub Engine - file parsing, API integrations, training job management

export interface GeometryStats {
  vertices: number;
  faces: number;
  boundingBox: { x: number; y: number; z: number };
  fileSize: string;
  format: string;
  meshCount: number;
}

export interface PlatformConfig {
  id: "huggingface" | "kaggle" | "replicate" | "zoo";
  name: string;
  apiKey: string;
  connected: boolean;
  lastSync?: string;
}

export interface TrainingJob {
  id: string;
  name: string;
  baseModel: "text-to-3d" | "image-to-3d" | "cad-llm";
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  lossValues: number[];
  createdAt: string;
  epochs: number;
  learningRate: number;
  batchSize: number;
}

export interface ImportedModel {
  id: string;
  name: string;
  format: string;
  stats: GeometryStats;
  addedAt: string;
}

// ─── File Parsing ──────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function estimateSTLStats(buffer: ArrayBuffer): Partial<GeometryStats> {
  const view = new DataView(buffer);
  // Binary STL: 80 header + 4 triangle count + n * 50
  if (buffer.byteLength > 84) {
    const triangleCount = view.getUint32(80, true);
    if (80 + 4 + triangleCount * 50 === buffer.byteLength) {
      return { faces: triangleCount, vertices: triangleCount * 3 };
    }
  }
  // ASCII STL estimate
  const text = new TextDecoder().decode(buffer.slice(0, 1024));
  const facetCount = (new TextDecoder().decode(buffer).match(/facet normal/g) || []).length;
  return { faces: facetCount, vertices: facetCount * 3 };
}

function estimateOBJStats(text: string): Partial<GeometryStats> {
  const vertices = (text.match(/^v\s/gm) || []).length;
  const faces = (text.match(/^f\s/gm) || []).length;
  return { vertices, faces };
}

function estimateGLTFStats(text: string): Partial<GeometryStats> {
  try {
    const json = JSON.parse(text);
    const meshCount = (json.meshes || []).length;
    const accessors = json.accessors || [];
    const posAccessor = accessors.find((a: { type?: string }) => a.type === "VEC3");
    const vertices = posAccessor?.count || 0;
    return { vertices, faces: Math.floor(vertices / 3), meshCount };
  } catch {
    return { vertices: 0, faces: 0 };
  }
}

export async function parseModelFile(file: File): Promise<GeometryStats> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const format = ext.toUpperCase();
  const fileSize = formatFileSize(file.size);
  const baseStats: GeometryStats = {
    vertices: 0, faces: 0,
    boundingBox: { x: 0, y: 0, z: 0 },
    fileSize, format, meshCount: 1,
  };

  try {
    if (ext === "stl") {
      const buf = await file.arrayBuffer();
      const s = estimateSTLStats(buf);
      return { ...baseStats, ...s, boundingBox: estimateBBox(s.vertices || 0) };
    }
    if (ext === "obj") {
      const text = await file.text();
      const s = estimateOBJStats(text);
      return { ...baseStats, ...s, boundingBox: estimateBBox(s.vertices || 0) };
    }
    if (ext === "gltf") {
      const text = await file.text();
      const s = estimateGLTFStats(text);
      return { ...baseStats, ...s, boundingBox: estimateBBox(s.vertices || 0) };
    }
    // STEP / IGES / GLB - return size-based estimates
    const approxVerts = Math.floor(file.size / 64);
    return { ...baseStats, vertices: approxVerts, faces: Math.floor(approxVerts / 3),
      boundingBox: estimateBBox(approxVerts) };
  } catch {
    return baseStats;
  }
}

function estimateBBox(vertices: number): { x: number; y: number; z: number } {
  const scale = Math.cbrt(vertices) * 0.1;
  return {
    x: parseFloat((scale * 1.2).toFixed(2)),
    y: parseFloat((scale * 0.8).toFixed(2)),
    z: parseFloat((scale * 1.0).toFixed(2)),
  };
}

// ─── Platform API Stubs ────────────────────────────────────────────────────────

export async function testHuggingFaceConnection(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch("https://huggingface.co/api/whoami-v2", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function testReplicateConnection(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.replicate.com/v1/account", {
      headers: { Authorization: `Token ${apiKey}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function testKaggleConnection(_apiKey: string): Promise<boolean> {
  // Kaggle uses username+key; stub returns true for non-empty key
  return _apiKey.length > 0;
}

export async function testZooConnection(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.zoo.dev/user", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function testPlatformConnection(
  platform: PlatformConfig["id"],
  apiKey: string
): Promise<boolean> {
  if (!apiKey.trim()) return false;
  switch (platform) {
    case "huggingface": return testHuggingFaceConnection(apiKey);
    case "replicate": return testReplicateConnection(apiKey);
    case "kaggle": return testKaggleConnection(apiKey);
    case "zoo": return testZooConnection(apiKey);
  }
}

// ─── Training Job Management ───────────────────────────────────────────────────

export function createTrainingJob(
  name: string,
  baseModel: TrainingJob["baseModel"],
  epochs: number,
  learningRate: number,
  batchSize: number
): TrainingJob {
  return {
    id: `job-${Date.now()}`,
    name,
    baseModel,
    status: "queued",
    progress: 0,
    lossValues: [],
    createdAt: new Date().toISOString(),
    epochs,
    learningRate,
    batchSize,
  };
}

export function simulateTrainingStep(job: TrainingJob): TrainingJob {
  if (job.status === "queued") {
    return { ...job, status: "running", progress: 0 };
  }
  if (job.status === "running") {
    const newProgress = Math.min(100, job.progress + Math.random() * 8 + 2);
    const lastLoss = job.lossValues.at(-1) ?? 2.5;
    const newLoss = Math.max(0.05, lastLoss * (0.92 + Math.random() * 0.06));
    const lossValues = [...job.lossValues, parseFloat(newLoss.toFixed(4))];
    const status = newProgress >= 100 ? "completed" : "running";
    return { ...job, progress: parseFloat(newProgress.toFixed(1)), lossValues, status };
  }
  return job;
}

export const SUPPORTED_FORMATS = ["step", "stp", "iges", "igs", "stl", "obj", "gltf", "glb"];

export function isSupportedFormat(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return SUPPORTED_FORMATS.includes(ext);
}
