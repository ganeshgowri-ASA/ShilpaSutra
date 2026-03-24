"use client";
import { useState, useCallback } from "react";
import { useCadStore } from "@/stores/cad-store";
import { X, Plus, Copy, Trash2, Check, Settings2, Table2 } from "lucide-react";

interface DesignConfig {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  overrides: Record<string, { dimensions?: { width: number; height: number; depth: number }; color?: string; visible?: boolean }>;
  createdAt: number;
}

/**
 * Configuration Manager - SolidWorks-style design variation management.
 * Save multiple design configurations and switch between them.
 * Also includes Design Table for parametric variations.
 */
export default function ConfigurationManager({ onClose }: { onClose: () => void }) {
  const objects = useCadStore((s) => s.objects);
  const updateObject = useCadStore((s) => s.updateObject);
  const [tab, setTab] = useState<"configs" | "table">("configs");
  const [configs, setConfigs] = useState<DesignConfig[]>([
    {
      id: "default",
      name: "Default",
      description: "Original design configuration",
      isActive: true,
      overrides: {},
      createdAt: Date.now(),
    },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Design table columns based on first few objects
  const tableObjects = objects.slice(0, 10);

  const handleAddConfig = useCallback(() => {
    const newId = `config-${Date.now()}`;
    const newConfig: DesignConfig = {
      id: newId,
      name: `Configuration ${configs.length + 1}`,
      description: "",
      isActive: false,
      overrides: {},
      createdAt: Date.now(),
    };
    setConfigs(prev => [...prev, newConfig]);
  }, [configs.length]);

  const handleDuplicateConfig = useCallback((config: DesignConfig) => {
    const newId = `config-${Date.now()}`;
    const dup: DesignConfig = {
      ...config,
      id: newId,
      name: `${config.name} (Copy)`,
      isActive: false,
      createdAt: Date.now(),
    };
    setConfigs(prev => [...prev, dup]);
  }, []);

  const handleDeleteConfig = useCallback((id: string) => {
    if (id === "default") return;
    setConfigs(prev => prev.filter(c => c.id !== id));
  }, []);

  const handleActivateConfig = useCallback((id: string) => {
    setConfigs(prev => prev.map(c => ({ ...c, isActive: c.id === id })));
    const config = configs.find(c => c.id === id);
    if (config) {
      // Apply overrides to objects
      Object.entries(config.overrides).forEach(([objId, overrides]) => {
        const update: Record<string, unknown> = {};
        if (overrides.dimensions) update.dimensions = overrides.dimensions;
        if (overrides.color) update.color = overrides.color;
        if (overrides.visible !== undefined) update.visible = overrides.visible;
        if (Object.keys(update).length > 0) updateObject(objId, update);
      });
    }
  }, [configs, updateObject]);

  const handleRename = useCallback((id: string) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, name: editName } : c));
    setEditingId(null);
  }, [editName]);

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto animate-scale-in">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl shadow-black/50 w-[500px] max-h-[70vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d]">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-[#00D4FF]" />
            <span className="text-sm font-semibold text-white">Configuration Manager</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#21262d] transition-all">
            <X size={14} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-[#21262d]">
          <button
            onClick={() => setTab("configs")}
            className={`flex-1 py-2 text-[10px] font-semibold transition-all relative ${
              tab === "configs" ? "text-[#00D4FF]" : "text-slate-500 hover:text-white"
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Settings2 size={11} />
              Configurations
            </div>
            {tab === "configs" && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#00D4FF] rounded-full" />}
          </button>
          <button
            onClick={() => setTab("table")}
            className={`flex-1 py-2 text-[10px] font-semibold transition-all relative ${
              tab === "table" ? "text-[#00D4FF]" : "text-slate-500 hover:text-white"
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Table2 size={11} />
              Design Table
            </div>
            {tab === "table" && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#00D4FF] rounded-full" />}
          </button>
        </div>

        {/* Configurations list */}
        {tab === "configs" && (
          <div className="p-3 space-y-1.5 max-h-[45vh] overflow-y-auto">
            {configs.map((config) => (
              <div
                key={config.id}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
                  config.isActive
                    ? "bg-[#00D4FF]/5 border-[#00D4FF]/20"
                    : "border-[#21262d] hover:bg-[#21262d]/50 hover:border-[#30363d]"
                }`}
                onClick={() => handleActivateConfig(config.id)}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                  config.isActive ? "border-[#00D4FF] bg-[#00D4FF]/20" : "border-[#30363d]"
                }`}>
                  {config.isActive && <Check size={8} className="text-[#00D4FF]" />}
                </div>

                <div className="flex-1 min-w-0">
                  {editingId === config.id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleRename(config.id)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(config.id)}
                      className="bg-[#0d1117] border border-[#00D4FF]/30 rounded px-2 py-0.5 text-[10px] text-white w-full focus:outline-none"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      className="text-[11px] font-medium text-slate-300 truncate"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingId(config.id);
                        setEditName(config.name);
                      }}
                    >
                      {config.name}
                    </div>
                  )}
                  <div className="text-[8px] text-slate-600">
                    {Object.keys(config.overrides).length} overrides
                    {config.isActive && <span className="text-[#00D4FF] ml-1.5 font-semibold">ACTIVE</span>}
                  </div>
                </div>

                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDuplicateConfig(config)}
                    className="p-1 rounded hover:bg-[#21262d] text-slate-500 hover:text-white transition-all"
                    title="Duplicate"
                  >
                    <Copy size={11} />
                  </button>
                  {config.id !== "default" && (
                    <button
                      onClick={() => handleDeleteConfig(config.id)}
                      className="p-1 rounded hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={handleAddConfig}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-[#21262d] text-slate-500 hover:text-[#00D4FF] hover:border-[#00D4FF]/30 hover:bg-[#00D4FF]/5 transition-all text-[10px] font-medium"
            >
              <Plus size={12} />
              Add Configuration
            </button>
          </div>
        )}

        {/* Design Table */}
        {tab === "table" && (
          <div className="p-3 overflow-auto max-h-[45vh]">
            {tableObjects.length === 0 ? (
              <div className="text-center py-8 text-[10px] text-slate-600">
                Add objects to the scene to populate the design table.
              </div>
            ) : (
              <table className="w-full text-[9px]">
                <thead>
                  <tr className="border-b border-[#21262d]">
                    <th className="text-left py-1.5 px-2 text-slate-500 font-semibold">Object</th>
                    <th className="text-center py-1.5 px-1 text-slate-500 font-semibold">W</th>
                    <th className="text-center py-1.5 px-1 text-slate-500 font-semibold">H</th>
                    <th className="text-center py-1.5 px-1 text-slate-500 font-semibold">D</th>
                    <th className="text-center py-1.5 px-1 text-slate-500 font-semibold">Color</th>
                    <th className="text-center py-1.5 px-1 text-slate-500 font-semibold">Visible</th>
                  </tr>
                </thead>
                <tbody>
                  {tableObjects.map((obj) => (
                    <tr key={obj.id} className="border-b border-[#21262d]/50 hover:bg-[#21262d]/30">
                      <td className="py-1.5 px-2 text-slate-300 font-medium truncate max-w-[120px]">{obj.name}</td>
                      <td className="text-center py-1.5 px-1">
                        <input
                          type="number"
                          value={obj.dimensions.width.toFixed(1)}
                          onChange={(e) => updateObject(obj.id, { dimensions: { ...obj.dimensions, width: parseFloat(e.target.value) || 1 } })}
                          className="w-10 bg-[#0d1117] border border-[#21262d] rounded px-1 py-0.5 text-center text-white font-mono focus:border-[#00D4FF]/50 focus:outline-none"
                          step={0.1}
                        />
                      </td>
                      <td className="text-center py-1.5 px-1">
                        <input
                          type="number"
                          value={obj.dimensions.height.toFixed(1)}
                          onChange={(e) => updateObject(obj.id, { dimensions: { ...obj.dimensions, height: parseFloat(e.target.value) || 1 } })}
                          className="w-10 bg-[#0d1117] border border-[#21262d] rounded px-1 py-0.5 text-center text-white font-mono focus:border-[#00D4FF]/50 focus:outline-none"
                          step={0.1}
                        />
                      </td>
                      <td className="text-center py-1.5 px-1">
                        <input
                          type="number"
                          value={obj.dimensions.depth.toFixed(1)}
                          onChange={(e) => updateObject(obj.id, { dimensions: { ...obj.dimensions, depth: parseFloat(e.target.value) || 1 } })}
                          className="w-10 bg-[#0d1117] border border-[#21262d] rounded px-1 py-0.5 text-center text-white font-mono focus:border-[#00D4FF]/50 focus:outline-none"
                          step={0.1}
                        />
                      </td>
                      <td className="text-center py-1.5 px-1">
                        <input
                          type="color"
                          value={obj.color || "#4a9eff"}
                          onChange={(e) => updateObject(obj.id, { color: e.target.value })}
                          className="w-5 h-5 rounded cursor-pointer bg-transparent border-none"
                        />
                      </td>
                      <td className="text-center py-1.5 px-1">
                        <input
                          type="checkbox"
                          checked={obj.visible !== false}
                          onChange={(e) => updateObject(obj.id, { visible: e.target.checked })}
                          className="accent-[#00D4FF]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#21262d]">
          <span className="text-[8px] text-slate-600">
            {configs.length} configuration{configs.length !== 1 ? "s" : ""} · {objects.length} objects
          </span>
          <button onClick={onClose} className="px-3 py-1.5 text-[10px] text-slate-400 hover:text-white border border-[#21262d] rounded-md hover:bg-[#21262d] transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
