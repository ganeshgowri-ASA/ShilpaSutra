"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, CheckCircle2, XCircle, RefreshCw, Play, Brain,
  Database, Boxes, Zap, ChevronDown, Loader2,
} from "lucide-react";
import {
  parseModelFile, testPlatformConnection, createTrainingJob,
  simulateTrainingStep, isSupportedFormat,
  type GeometryStats, type PlatformConfig, type TrainingJob, type ImportedModel,
} from "@/lib/model-hub-engine";

const TABS = ["Model Import", "AI Platforms", "Training Pipeline"] as const;
type Tab = typeof TABS[number];

const PLATFORM_META: Record<PlatformConfig["id"], { name: string; color: string; desc: string }> = {
  huggingface: { name: "HuggingFace", color: "#ff9d00", desc: "Upload CAD datasets & fine-tune text-to-3D models" },
  kaggle: { name: "Kaggle", color: "#20BEFF", desc: "Browse CAD / engineering datasets" },
  replicate: { name: "Replicate", color: "#a855f7", desc: "Run inference on hosted generative models" },
  zoo: { name: "Zoo Design", color: "#00D4FF", desc: "Import parametric designs from Zoo Keeper" },
};

export default function ModelHubPage() {
  const [tab, setTab] = useState<Tab>("Model Import");
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedModels, setImportedModels] = useState<ImportedModel[]>([]);
  const [pendingStats, setPendingStats] = useState<{ file: File; stats: GeometryStats } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [platforms, setPlatforms] = useState<Record<PlatformConfig["id"], PlatformConfig>>({
    huggingface: { id: "huggingface", name: "HuggingFace", apiKey: "", connected: false },
    kaggle: { id: "kaggle", name: "Kaggle", apiKey: "", connected: false },
    replicate: { id: "replicate", name: "Replicate", apiKey: "", connected: false },
    zoo: { id: "zoo", name: "Zoo Design", connected: false, apiKey: "" },
  });
  const [connectingId, setConnectingId] = useState<PlatformConfig["id"] | null>(null);

  const [jobs, setJobs] = useState<TrainingJob[]>([]);
  const [jobName, setJobName] = useState("");
  const [baseModel, setBaseModel] = useState<TrainingJob["baseModel"]>("text-to-3d");
  const [epochs, setEpochs] = useState(10);
  const [lr, setLr] = useState(0.0001);
  const [batchSize, setBatchSize] = useState(8);

  useEffect(() => {
    const running = jobs.some(j => j.status === "running" || j.status === "queued");
    if (!running) return;
    const t = setInterval(() => {
      setJobs(prev => prev.map(j =>
        j.status === "running" || j.status === "queued" ? simulateTrainingStep(j) : j
      ));
    }, 800);
    return () => clearInterval(t);
  }, [jobs]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    if (!isSupportedFormat(file.name)) {
      alert("Unsupported format. Use: STEP, IGES, STL, OBJ, glTF, GLB");
      return;
    }
    setImporting(true);
    const stats = await parseModelFile(file);
    setPendingStats({ file, stats });
    setImporting(false);
  }, []);

  const confirmImport = () => {
    if (!pendingStats) return;
    const model: ImportedModel = {
      id: `model-${Date.now()}`,
      name: pendingStats.file.name,
      format: pendingStats.stats.format,
      stats: pendingStats.stats,
      addedAt: new Date().toLocaleString(),
    };
    setImportedModels(prev => [model, ...prev]);
    setPendingStats(null);
  };

  const handleConnect = async (id: PlatformConfig["id"]) => {
    setConnectingId(id);
    const ok = await testPlatformConnection(id, platforms[id].apiKey);
    setPlatforms(prev => ({
      ...prev,
      [id]: { ...prev[id], connected: ok, lastSync: ok ? new Date().toLocaleTimeString() : undefined },
    }));
    setConnectingId(null);
  };

  const launchJob = () => {
    if (!jobName.trim()) return;
    const job = createTrainingJob(jobName, baseModel, epochs, lr, batchSize);
    setJobs(prev => [job, ...prev]);
    setJobName("");
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0d1117] text-slate-200 min-h-screen">
      {/* Header */}
      <div className="border-b border-[#21262d] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-[#a855f7]/20 border border-[#00D4FF]/30 flex items-center justify-center">
            <Brain size={18} className="text-[#00D4FF]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Model Hub</h1>
            <p className="text-[11px] text-slate-500">Import 3D models · Connect ML platforms · Train AI models</p>
          </div>
        </div>
        <div className="flex gap-1 mt-4">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                tab === t ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                  : "text-slate-500 hover:text-slate-300 hover:bg-[#161b22]"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {/* ── Tab A: Model Import ── */}
        {tab === "Model Import" && (
          <div className="space-y-4 max-w-2xl">
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                dragging ? "border-[#00D4FF] bg-[#00D4FF]/5" : "border-[#30363d] hover:border-[#00D4FF]/50 hover:bg-[#161b22]"}`}>
              <input ref={fileInputRef} type="file" className="hidden"
                accept=".step,.stp,.iges,.igs,.stl,.obj,.gltf,.glb"
                onChange={e => handleFiles(e.target.files)} />
              {importing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={32} className="text-[#00D4FF] animate-spin" />
                  <p className="text-slate-400 text-sm">Parsing file…</p>
                </div>
              ) : (
                <>
                  <Upload size={36} className="mx-auto text-slate-600 mb-3" />
                  <p className="text-slate-300 font-semibold">Drop your 3D model here</p>
                  <p className="text-slate-500 text-xs mt-1">STEP · IGES · STL · OBJ · glTF · GLB</p>
                </>
              )}
            </div>

            {pendingStats && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">{pendingStats.file.name}</h3>
                  <span className="text-[10px] bg-[#00D4FF]/15 text-[#00D4FF] px-2 py-0.5 rounded-full">{pendingStats.stats.format}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["Vertices", pendingStats.stats.vertices.toLocaleString()],
                    ["Faces", pendingStats.stats.faces.toLocaleString()],
                    ["File Size", pendingStats.stats.fileSize],
                    [`BBox X`, `${pendingStats.stats.boundingBox.x} m`],
                    [`BBox Y`, `${pendingStats.stats.boundingBox.y} m`],
                    [`BBox Z`, `${pendingStats.stats.boundingBox.z} m`],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-[#0d1117] rounded-lg p-2.5">
                      <div className="text-[9px] text-slate-500 uppercase tracking-wider">{k}</div>
                      <div className="text-sm font-mono font-semibold text-slate-200 mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={confirmImport}
                    className="flex-1 py-2 bg-[#00D4FF]/15 hover:bg-[#00D4FF]/25 text-[#00D4FF] text-xs font-semibold rounded-lg transition-all border border-[#00D4FF]/30">
                    Add to Parts Library
                  </button>
                  <button onClick={() => setPendingStats(null)}
                    className="py-2 px-4 text-slate-500 hover:text-slate-300 text-xs rounded-lg hover:bg-[#21262d] transition-all">
                    Discard
                  </button>
                </div>
              </div>
            )}

            {importedModels.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Imported Models</h3>
                {importedModels.map(m => (
                  <div key={m.id} className="flex items-center gap-3 bg-[#161b22] border border-[#21262d] rounded-lg px-4 py-3">
                    <Boxes size={16} className="text-slate-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-200 truncate">{m.name}</div>
                      <div className="text-[10px] text-slate-500">{m.stats.vertices.toLocaleString()} verts · {m.stats.faces.toLocaleString()} faces · {m.stats.fileSize}</div>
                    </div>
                    <span className="text-[10px] text-slate-500">{m.addedAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab B: AI Platforms ── */}
        {tab === "AI Platforms" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            {(Object.keys(PLATFORM_META) as PlatformConfig["id"][]).map(id => {
              const meta = PLATFORM_META[id];
              const cfg = platforms[id];
              const isConnecting = connectingId === id;
              return (
                <div key={id} className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${meta.color}20`, border: `1px solid ${meta.color}40` }}>
                        <Database size={14} style={{ color: meta.color }} />
                      </div>
                      <span className="text-sm font-semibold text-white">{meta.name}</span>
                    </div>
                    {cfg.connected
                      ? <CheckCircle2 size={15} className="text-emerald-400" />
                      : <XCircle size={15} className="text-slate-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500">{meta.desc}</p>
                  <input
                    type="password"
                    placeholder="API Key"
                    value={cfg.apiKey}
                    onChange={e => setPlatforms(prev => ({ ...prev, [id]: { ...prev[id], apiKey: e.target.value } }))}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#00D4FF]/50"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleConnect(id)} disabled={isConnecting || !cfg.apiKey}
                      className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                      style={{ background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}30` }}>
                      {isConnecting ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                      {isConnecting ? "Testing…" : "Connect"}
                    </button>
                    {cfg.connected && (
                      <button className="py-1.5 px-3 text-xs text-slate-400 hover:text-slate-200 rounded-lg hover:bg-[#21262d] transition-all flex items-center gap-1">
                        <RefreshCw size={11} /> Sync
                      </button>
                    )}
                  </div>
                  {cfg.connected && cfg.lastSync && (
                    <p className="text-[10px] text-emerald-500">Connected · Last sync {cfg.lastSync}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Tab C: Training Pipeline ── */}
        {tab === "Training Pipeline" && (
          <div className="flex gap-6 max-w-5xl">
            <div className="w-72 shrink-0 space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">New Training Job</h3>
              <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 space-y-3">
                <input value={jobName} onChange={e => setJobName(e.target.value)} placeholder="Job name"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#00D4FF]/50" />
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Base Model</label>
                  <div className="relative">
                    <select value={baseModel} onChange={e => setBaseModel(e.target.value as TrainingJob["baseModel"])}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-slate-300 appearance-none focus:outline-none focus:border-[#00D4FF]/50">
                      <option value="text-to-3d">Text-to-3D</option>
                      <option value="image-to-3d">Image-to-3D</option>
                      <option value="cad-llm">CAD LLM</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>
                {[
                  { label: "Epochs", value: epochs, set: setEpochs, min: 1, max: 100, step: 1 },
                  { label: "Batch Size", value: batchSize, set: setBatchSize, min: 1, max: 64, step: 1 },
                ].map(({ label, value, set, min, max, step }) => (
                  <div key={label}>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">{label}: <span className="text-slate-300">{value}</span></label>
                    <input type="range" min={min} max={max} step={step} value={value}
                      onChange={e => set(Number(e.target.value))}
                      className="w-full accent-[#00D4FF]" />
                  </div>
                ))}
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Learning Rate: <span className="text-slate-300">{lr}</span></label>
                  <input type="range" min={0.00001} max={0.01} step={0.00001} value={lr}
                    onChange={e => setLr(parseFloat(e.target.value))}
                    className="w-full accent-[#00D4FF]" />
                </div>
                <button onClick={launchJob} disabled={!jobName.trim()}
                  className="w-full py-2 bg-[#00D4FF]/15 hover:bg-[#00D4FF]/25 text-[#00D4FF] text-xs font-semibold rounded-lg transition-all border border-[#00D4FF]/30 disabled:opacity-40 flex items-center justify-center gap-1.5">
                  <Play size={12} /> Launch Training
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-3 min-w-0">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Training Jobs</h3>
              {jobs.length === 0 && (
                <div className="bg-[#161b22] border border-dashed border-[#30363d] rounded-xl p-8 text-center">
                  <Brain size={28} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-slate-500 text-sm">No training jobs yet</p>
                </div>
              )}
              {jobs.map(job => {
                const statusColor = { queued: "#64748b", running: "#00D4FF", completed: "#10b981", failed: "#ef4444" }[job.status];
                const last10 = job.lossValues.slice(-10);
                const maxLoss = Math.max(...last10, 2.5);
                return (
                  <div key={job.id} className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-white">{job.name}</span>
                        <span className="ml-2 text-[10px] text-slate-500">{job.baseModel}</span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: statusColor, background: `${statusColor}20` }}>
                        {job.status}
                      </span>
                    </div>
                    <div className="w-full bg-[#0d1117] rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${job.progress}%`, background: statusColor }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{job.progress.toFixed(0)}% · Epoch {Math.ceil(job.progress / 100 * job.epochs)}/{job.epochs}</span>
                      {job.lossValues.length > 0 && <span>Loss: {job.lossValues.at(-1)?.toFixed(4)}</span>}
                    </div>
                    {last10.length > 1 && (
                      <svg viewBox={`0 0 100 30`} className="w-full h-8" preserveAspectRatio="none">
                        <polyline
                          points={last10.map((v, i) => `${(i / (last10.length - 1)) * 100},${30 - (v / maxLoss) * 28}`).join(" ")}
                          fill="none" stroke={statusColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
