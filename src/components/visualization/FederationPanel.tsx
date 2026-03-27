"use client";

import { useState, useCallback } from "react";
import {
  Layers,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Palette,
  Upload,
} from "lucide-react";
import {
  useVisualizationStore,
  DISCIPLINE_COLORS,
  type FederatedModel,
  type ModelComponent,
} from "@/stores/visualization-store";

const DISCIPLINES = [
  "structural",
  "electrical",
  "mechanical",
  "architectural",
  "piping",
  "other",
] as const;

export default function FederationPanel() {
  const {
    models,
    components,
    addModel,
    removeModel,
    toggleModelVisibility,
    setModelOpacity,
    colorByDiscipline,
    addComponent,
  } = useVisualizationStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const [newModelDiscipline, setNewModelDiscipline] = useState<typeof DISCIPLINES[number]>("structural");

  const handleAddDemoModel = useCallback(() => {
    if (!newModelName.trim()) return;

    const modelId = `model-${Date.now()}`;
    const discipline = newModelDiscipline;
    const color = DISCIPLINE_COLORS[discipline] || DISCIPLINE_COLORS.other;

    // Create model
    const model: FederatedModel = {
      id: modelId,
      name: newModelName.trim(),
      discipline,
      visible: true,
      opacity: 1,
      color,
      componentIds: [],
      loaded: true,
    };

    addModel(model);

    // Add demo components based on discipline
    const demoComponents = generateDemoComponents(modelId, discipline);
    const componentIds: string[] = [];

    for (const comp of demoComponents) {
      addComponent(comp);
      componentIds.push(comp.id);
    }

    // Update model with component IDs
    model.componentIds = componentIds;

    setNewModelName("");
    setShowAddForm(false);
  }, [newModelName, newModelDiscipline, addModel, addComponent]);

  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#21262d]">
        <Layers size={13} className="text-[#00D4FF]" />
        <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
          Model Federation
        </span>
        <span className="ml-auto text-[9px] text-slate-600">
          {models.length} models
        </span>
      </div>

      <div className="p-2 space-y-2">
        {/* Actions */}
        <div className="flex gap-1">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-2 py-1 bg-[#00D4FF]/10 text-[#00D4FF] rounded text-[9px] font-medium hover:bg-[#00D4FF]/20 transition-colors"
          >
            <Plus size={10} />
            Add Model
          </button>
          <button
            onClick={colorByDiscipline}
            disabled={models.length === 0}
            className="flex items-center gap-1 px-2 py-1 bg-[#161b22] text-slate-400 rounded text-[9px] hover:text-slate-200 transition-colors disabled:opacity-30"
          >
            <Palette size={10} />
            Color by Discipline
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="px-2 py-2 bg-[#161b22] rounded space-y-1.5">
            <input
              type="text"
              placeholder="Model name..."
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#21262d] rounded text-[9px] text-slate-300 px-2 py-1 placeholder-slate-700 focus:outline-none focus:border-[#00D4FF]/30"
            />
            <select
              value={newModelDiscipline}
              onChange={(e) =>
                setNewModelDiscipline(e.target.value as typeof DISCIPLINES[number])
              }
              className="w-full bg-[#0d1117] border border-[#21262d] rounded text-[9px] text-slate-300 px-2 py-1 focus:outline-none"
            >
              {DISCIPLINES.map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              <button
                onClick={handleAddDemoModel}
                disabled={!newModelName.trim()}
                className="flex-1 px-2 py-1 bg-[#00D4FF]/15 text-[#00D4FF] rounded text-[9px] font-medium hover:bg-[#00D4FF]/25 transition-colors disabled:opacity-30"
              >
                Add Demo Model
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-2 py-1 bg-[#21262d] text-slate-500 rounded text-[9px] hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Discipline legend */}
        <div className="flex flex-wrap gap-1.5 px-1">
          {DISCIPLINES.filter((d) => d !== "other").map((d) => (
            <div key={d} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: DISCIPLINE_COLORS[d] }}
              />
              <span className="text-[8px] text-slate-600 capitalize">{d}</span>
            </div>
          ))}
        </div>

        {/* Model list */}
        <div className="space-y-0.5">
          {models.length === 0 ? (
            <div className="text-center py-3 text-slate-700">
              <Upload size={18} className="mx-auto mb-1" />
              <div className="text-[9px]">No models loaded</div>
              <div className="text-[8px] text-slate-800">
                Add a model to begin federation
              </div>
            </div>
          ) : (
            models.map((model) => {
              const compCount = model.componentIds.length;
              return (
                <div
                  key={model.id}
                  className="px-2 py-1.5 bg-[#161b22] rounded group"
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: model.color }}
                    />
                    <span className="text-[10px] font-medium text-slate-200 flex-1 truncate">
                      {model.name}
                    </span>
                    <span className="text-[8px] text-slate-600">
                      {compCount} parts
                    </span>
                    <button
                      onClick={() => toggleModelVisibility(model.id)}
                      className="w-4 h-4 flex items-center justify-center"
                    >
                      {model.visible ? (
                        <Eye size={10} className="text-slate-500" />
                      ) : (
                        <EyeOff size={10} className="text-slate-700" />
                      )}
                    </button>
                    <button
                      onClick={() => removeModel(model.id)}
                      className="w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={9} className="text-slate-600 hover:text-red-400" />
                    </button>
                  </div>

                  {/* Opacity slider */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] text-slate-600">Opacity</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={model.opacity}
                      onChange={(e) =>
                        setModelOpacity(model.id, parseFloat(e.target.value))
                      }
                      className="flex-1 h-0.5 accent-[#00D4FF]"
                    />
                    <span className="text-[8px] text-slate-600 font-mono w-6 text-right">
                      {Math.round(model.opacity * 100)}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Demo component generator ───────────────────────────────────────

function generateDemoComponents(
  modelId: string,
  discipline: string
): ModelComponent[] {
  const comps: ModelComponent[] = [];
  const prefix = discipline.charAt(0).toUpperCase() + discipline.slice(1);
  const baseId = `${modelId}-comp`;

  const createComp = (
    suffix: string,
    name: string,
    pos: [number, number, number],
    scale: [number, number, number],
    phase?: number,
    parentId?: string
  ): ModelComponent => ({
    id: `${baseId}-${suffix}`,
    name,
    modelId,
    parentId: parentId || null,
    children: [],
    visible: true,
    selected: false,
    position: pos,
    rotation: [0, 0, 0],
    scale,
    metadata: {
      discipline,
      material: discipline === "structural" ? "Steel" : discipline === "electrical" ? "Copper" : "Aluminum",
      weight: `${(scale[0] * scale[1] * scale[2] * 7.85).toFixed(1)} kg`,
    },
    constructionPhase: phase,
    phaseStatus: "planned",
  });

  switch (discipline) {
    case "structural":
      comps.push(createComp("found-1", `${prefix} Foundation A`, [-2, -0.5, 0], [1, 1, 1], 0));
      comps.push(createComp("found-2", `${prefix} Foundation B`, [2, -0.5, 0], [1, 1, 1], 0));
      comps.push(createComp("col-1", `${prefix} Column Left`, [-2, 1.5, 0], [0.3, 3, 0.3], 1));
      comps.push(createComp("col-2", `${prefix} Column Right`, [2, 1.5, 0], [0.3, 3, 0.3], 1));
      comps.push(createComp("beam-1", `${prefix} Beam Top`, [0, 3, 0], [4.5, 0.2, 0.3], 1));
      comps.push(createComp("brace-1", `${prefix} Brace Diagonal`, [0, 1.5, 0], [0.15, 3.5, 0.15], 1));
      break;

    case "electrical":
      comps.push(createComp("panel-1", `${prefix} PV Module 1`, [-1.5, 3.2, 0], [1.5, 0.04, 1], 2));
      comps.push(createComp("panel-2", `${prefix} PV Module 2`, [0, 3.2, 0], [1.5, 0.04, 1], 2));
      comps.push(createComp("panel-3", `${prefix} PV Module 3`, [1.5, 3.2, 0], [1.5, 0.04, 1], 2));
      comps.push(createComp("cable-1", `${prefix} DC Cable Run`, [0, 2.5, 0.5], [4, 0.05, 0.05], 3));
      comps.push(createComp("jbox-1", `${prefix} Junction Box`, [2.5, 2.5, 0.5], [0.3, 0.2, 0.2], 3));
      comps.push(createComp("inv-1", `${prefix} Inverter`, [3, 1, 0], [0.5, 0.6, 0.3], 3));
      break;

    case "mechanical":
      comps.push(createComp("tracker-1", `${prefix} Tracker Motor`, [-2, 2.8, 0], [0.2, 0.2, 0.2], 2));
      comps.push(createComp("actuator-1", `${prefix} Linear Actuator`, [0, 2.8, 0], [0.15, 0.8, 0.15], 2));
      comps.push(createComp("bearing-1", `${prefix} Bearing Block`, [2, 2.8, 0], [0.2, 0.15, 0.15], 2));
      break;

    default:
      comps.push(createComp("part-1", `${prefix} Component 1`, [0, 0, 0], [1, 1, 1], 0));
      comps.push(createComp("part-2", `${prefix} Component 2`, [2, 0, 0], [1, 1, 1], 1));
      break;
  }

  // Wire up parent-child for first component as root
  if (comps.length > 1) {
    const root = comps[0];
    for (let i = 1; i < comps.length; i++) {
      comps[i].parentId = root.id;
      root.children.push(comps[i].id);
    }
  }

  return comps;
}
