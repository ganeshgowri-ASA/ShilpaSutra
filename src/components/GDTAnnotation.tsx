"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// GDTAnnotation — 3D billboard annotation + feature control frame editor
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import {
  GDT_SYMBOL_TABLE,
  GDTCharacteristic,
  FeatureControlFrame,
  DatumFeature,
  GDTAnnotationSet,
  MaterialConditionModifier,
  createFeatureControlFrame,
  createDatumFeature,
  addFrameToSet,
  removeFrameFromSet,
  addDatumToSet,
  computeToleranceZone,
  calculateISO286Fit,
  getISO2768Tolerance,
  COMMON_FITS,
} from "@/lib/gdt-engine";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GDTAnnotationProps {
  annotationSet: GDTAnnotationSet;
  onChange: (set: GDTAnnotationSet) => void;
  onClose?: () => void;
}

interface FCFEditorState {
  characteristic: GDTCharacteristic;
  toleranceValue: string;
  modifier: MaterialConditionModifier | "";
  datumA: string;
  datumB: string;
  datumC: string;
  freeState: boolean;
  tangentPlane: boolean;
}

const DEFAULT_FCF: FCFEditorState = {
  characteristic: "flatness",
  toleranceValue: "0.050",
  modifier: "",
  datumA: "",
  datumB: "",
  datumC: "",
  freeState: false,
  tangentPlane: false,
};

// ── Small reusable UI atoms ───────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-gray-400 uppercase tracking-wide">{children}</span>;
}

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T)}
      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Feature Control Frame SVG Preview ─────────────────────────────────────────

function FCFPreview({ state }: { state: FCFEditorState }) {
  const sym = GDT_SYMBOL_TABLE[state.characteristic];
  const tol = parseFloat(state.toleranceValue) || 0;
  const datums = [state.datumA, state.datumB, state.datumC].filter(Boolean);
  const zonePrefix = sym.canUseDiameterZone ? "⌀" : "";
  const modSuffix = state.modifier === "MMC" ? " Ⓜ" : state.modifier === "LMC" ? " Ⓛ" : "";
  const cellH = 28;
  const symW = 32;
  const tolW = 60;
  const datumW = 26;
  const totalW = symW + tolW + datums.length * datumW;

  return (
    <svg
      width={totalW + 2}
      height={cellH + 2}
      viewBox={`-1 -1 ${totalW + 2} ${cellH + 2}`}
      className="font-mono"
    >
      <rect x={0} y={0} width={totalW} height={cellH} fill="transparent" stroke="#ffaa00" strokeWidth="1.2" />
      <rect x={0} y={0} width={symW} height={cellH} fill="transparent" stroke="#ffaa00" strokeWidth="0.6" />
      <text x={symW / 2} y={cellH * 0.68} fontSize="14" fill="#ffaa00" textAnchor="middle">{sym.unicode}</text>
      <line x1={symW} y1={0} x2={symW} y2={cellH} stroke="#ffaa00" strokeWidth="0.6" />
      <text x={symW + 5} y={cellH * 0.68} fontSize="11" fill="#ffaa00">
        {zonePrefix}{tol.toFixed(3)}{modSuffix}
      </text>
      {datums.map((d, i) => {
        const dx = symW + tolW + i * datumW;
        return (
          <g key={d}>
            <line x1={dx} y1={0} x2={dx} y2={cellH} stroke="#ffaa00" strokeWidth="0.6" />
            <text x={dx + datumW / 2} y={cellH * 0.68} fontSize="11" fill="#ffaa00" textAnchor="middle">{d}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Annotation List Row ────────────────────────────────────────────────────────

function AnnotationRow({
  frame,
  onDelete,
}: {
  frame: FeatureControlFrame;
  onDelete: () => void;
}) {
  const sym = GDT_SYMBOL_TABLE[frame.characteristic];
  const zone = computeToleranceZone(frame);
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded border border-gray-700 text-sm">
      <span className="text-lg text-yellow-400 w-6 text-center">{sym.unicode}</span>
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium truncate">{sym.label}</div>
        <div className="text-gray-400 text-xs truncate">{zone.description}</div>
      </div>
      {frame.datumRefs.length > 0 && (
        <div className="flex gap-1">
          {frame.datumRefs.map(d => (
            <span key={d.letter} className="px-1.5 py-0.5 bg-yellow-900 text-yellow-300 rounded text-xs font-bold">{d.letter}</span>
          ))}
        </div>
      )}
      <button
        onClick={onDelete}
        className="text-gray-500 hover:text-red-400 transition-colors px-1"
        title="Delete annotation"
      >
        ✕
      </button>
    </div>
  );
}

// ── Datum Row ──────────────────────────────────────────────────────────────────

function DatumRow({ datum, onDelete }: { datum: DatumFeature; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded border border-gray-700 text-sm">
      <svg width="20" height="20" viewBox="-10 -20 20 20">
        <polygon points="0,0 -7,-12 7,-12" fill="#ffaa00" />
        <rect x="-6" y="-19" width="12" height="8" fill="none" stroke="#ffaa00" strokeWidth="0.8" />
        <text x="0" y="-13" fontSize="6" fill="#ffaa00" textAnchor="middle" fontWeight="bold">{datum.letter}</text>
      </svg>
      <span className="text-white font-bold">{datum.letter}</span>
      <span className="text-gray-400 flex-1 text-xs capitalize">{datum.featureType}</span>
      <button onClick={onDelete} className="text-gray-500 hover:text-red-400 transition-colors px-1">✕</button>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function GDTAnnotation({ annotationSet, onChange, onClose }: GDTAnnotationProps) {
  const [tab, setTab] = useState<"fcf" | "datum" | "fit" | "iso2768">("fcf");
  const [fcfState, setFCFState] = useState<FCFEditorState>(DEFAULT_FCF);
  const [newDatumLetter, setNewDatumLetter] = useState("A");
  const [fitDiameter, setFitDiameter] = useState("25");
  const [fitName, setFitName] = useState("H7/g6");
  const [iso2768Size, setIso2768Size] = useState("50");
  const [iso2768Grade, setIso2768Grade] = useState<"f"|"m"|"c"|"v">("m");

  const characteristicOptions = Object.entries(GDT_SYMBOL_TABLE).map(([k, v]) => ({
    value: k as GDTCharacteristic,
    label: `${v.unicode}  ${v.label}  (${v.category})`,
  }));

  const handleAddFCF = useCallback(() => {
    const tol = parseFloat(fcfState.toleranceValue);
    if (isNaN(tol) || tol <= 0) return;
    const datums = [fcfState.datumA, fcfState.datumB, fcfState.datumC].filter(Boolean);
    const sym = GDT_SYMBOL_TABLE[fcfState.characteristic];
    if (sym.requiresDatum && datums.length === 0) return;

    const frame = createFeatureControlFrame(
      fcfState.characteristic,
      tol,
      datums,
      {
        modifier: fcfState.modifier || undefined,
        freeState: fcfState.freeState,
        tangentPlane: fcfState.tangentPlane,
      }
    );
    onChange(addFrameToSet(annotationSet, frame));
    setFCFState(DEFAULT_FCF);
  }, [fcfState, annotationSet, onChange]);

  const handleAddDatum = useCallback(() => {
    if (!newDatumLetter.trim()) return;
    const datum = createDatumFeature(newDatumLetter.toUpperCase(), [0, 0, 0]);
    onChange(addDatumToSet(annotationSet, datum));
    const next = String.fromCharCode(newDatumLetter.toUpperCase().charCodeAt(0) + 1);
    setNewDatumLetter(next <= "Z" ? next : "A");
  }, [newDatumLetter, annotationSet, onChange]);

  const sym = GDT_SYMBOL_TABLE[fcfState.characteristic];

  // Fit calc
  const selectedFit = COMMON_FITS.find(f => f.name === fitName) ?? COMMON_FITS[0];
  const diameter = parseFloat(fitDiameter) || 25;
  const fitResult = calculateISO286Fit(diameter, "H", selectedFit.holeGrade, selectedFit.shaft, selectedFit.shaftGrade);

  // ISO 2768
  const isoResult = getISO2768Tolerance(parseFloat(iso2768Size) || 50, iso2768Grade);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h2 className="font-semibold text-yellow-400 flex items-center gap-2">
          <span className="text-xl">⌖</span> GD&amp;T Annotations
          <span className="text-xs text-gray-500 font-normal">ISO 1101 / ASME Y14.5</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange({ ...annotationSet, visible: !annotationSet.visible })}
            className={`text-xs px-2 py-1 rounded transition-colors ${annotationSet.visible ? "bg-yellow-800 text-yellow-200" : "bg-gray-700 text-gray-400"}`}
          >
            {annotationSet.visible ? "Visible" : "Hidden"}
          </button>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white px-1">✕</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 text-sm">
        {(["fcf", "datum", "fit", "iso2768"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 capitalize transition-colors ${tab === t ? "text-yellow-400 border-b-2 border-yellow-400" : "text-gray-400 hover:text-gray-200"}`}
          >
            {t === "fcf" ? "Control Frame" : t === "datum" ? "Datums" : t === "fit" ? "Fit Calc" : "ISO 2768"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ── FCF Editor ── */}
        {tab === "fcf" && (
          <>
            <div className="space-y-3">
              <div>
                <Label>Characteristic</Label>
                <Select
                  value={fcfState.characteristic}
                  onChange={v => setFCFState(s => ({ ...s, characteristic: v }))}
                  options={characteristicOptions}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tolerance (mm)</Label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={fcfState.toleranceValue}
                    onChange={e => setFCFState(s => ({ ...s, toleranceValue: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                  />
                </div>
                <div>
                  <Label>Modifier</Label>
                  <Select
                    value={fcfState.modifier}
                    onChange={v => setFCFState(s => ({ ...s, modifier: v }))}
                    options={[
                      { value: "", label: "RFS (none)" },
                      ...(sym.canUseMMC ? [{ value: "MMC" as const, label: "MMC ⓜ" }, { value: "LMC" as const, label: "LMC ⓛ" }] : []),
                    ]}
                  />
                </div>
              </div>

              {sym.requiresDatum && (
                <div className="grid grid-cols-3 gap-2">
                  {(["datumA", "datumB", "datumC"] as const).map((k, i) => (
                    <div key={k}>
                      <Label>Datum {["A (1°)", "B (2°)", "C (3°)"][i]}</Label>
                      <input
                        type="text"
                        maxLength={2}
                        value={fcfState[k]}
                        onChange={e => setFCFState(s => ({ ...s, [k]: e.target.value.toUpperCase() }))}
                        placeholder={["A", "B", "C"][i]}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white uppercase"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1 text-gray-400 cursor-pointer">
                  <input type="checkbox" checked={fcfState.freeState} onChange={e => setFCFState(s => ({ ...s, freeState: e.target.checked }))} className="accent-yellow-400" />
                  Free State
                </label>
                <label className="flex items-center gap-1 text-gray-400 cursor-pointer">
                  <input type="checkbox" checked={fcfState.tangentPlane} onChange={e => setFCFState(s => ({ ...s, tangentPlane: e.target.checked }))} className="accent-yellow-400" />
                  Tangent Plane
                </label>
              </div>
            </div>

            {/* Preview */}
            <div>
              <Label>Preview</Label>
              <div className="mt-1 p-3 bg-gray-800 rounded flex items-center justify-center min-h-12">
                <FCFPreview state={fcfState} />
              </div>
            </div>

            <button
              onClick={handleAddFCF}
              className="w-full py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded font-medium text-sm transition-colors"
            >
              Add Annotation
            </button>

            {/* Existing FCFs */}
            {annotationSet.frames.length > 0 && (
              <div className="space-y-2">
                <Label>Current Annotations ({annotationSet.frames.length})</Label>
                {annotationSet.frames.map(frame => (
                  <AnnotationRow
                    key={frame.id}
                    frame={frame}
                    onDelete={() => onChange(removeFrameFromSet(annotationSet, frame.id))}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Datum Editor ── */}
        {tab === "datum" && (
          <>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Datum Letter</Label>
                <input
                  type="text"
                  maxLength={2}
                  value={newDatumLetter}
                  onChange={e => setNewDatumLetter(e.target.value.toUpperCase())}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white uppercase"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddDatum}
                  className="px-4 py-1 bg-yellow-700 hover:bg-yellow-600 text-white rounded text-sm transition-colors"
                >
                  Add Datum
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500">Click a face in the 3D viewport to place the datum triangle after adding.</p>
            {annotationSet.datums.length > 0 && (
              <div className="space-y-2">
                <Label>Datum Features ({annotationSet.datums.length})</Label>
                {annotationSet.datums.map(datum => (
                  <DatumRow
                    key={datum.id}
                    datum={datum}
                    onDelete={() => onChange({ ...annotationSet, datums: annotationSet.datums.filter(d => d.id !== datum.id) })}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Fit Calculator ── */}
        {tab === "fit" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nominal ⌀ (mm)</Label>
                <input
                  type="number"
                  value={fitDiameter}
                  onChange={e => setFitDiameter(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                />
              </div>
              <div>
                <Label>Fit Type</Label>
                <select
                  value={fitName}
                  onChange={e => setFitName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                >
                  {COMMON_FITS.map(f => (
                    <option key={f.name} value={f.name}>{f.name} — {f.description}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`p-3 rounded border text-sm space-y-1 ${fitResult.type === "clearance" ? "bg-green-900/30 border-green-700" : fitResult.type === "interference" ? "bg-red-900/30 border-red-700" : "bg-yellow-900/30 border-yellow-700"}`}>
              <div className="font-semibold capitalize text-white">{fitResult.type} Fit</div>
              <div className="text-gray-300">{fitResult.description}</div>
              <div className="text-gray-400 text-xs">{fitResult.application}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-800 rounded p-2">
                <div className="text-gray-400 mb-1">Hole {fitResult.holeTolerance.grade}</div>
                <div className="text-green-400">+{(fitResult.holeTolerance.upper * 1000).toFixed(0)} µm</div>
                <div className="text-red-400">{(fitResult.holeTolerance.lower * 1000).toFixed(0)} µm</div>
              </div>
              <div className="bg-gray-800 rounded p-2">
                <div className="text-gray-400 mb-1">Shaft {fitResult.shaftTolerance.grade}</div>
                <div className="text-green-400">{fitResult.shaftTolerance.upper >= 0 ? "+" : ""}{(fitResult.shaftTolerance.upper * 1000).toFixed(0)} µm</div>
                <div className="text-red-400">{(fitResult.shaftTolerance.lower * 1000).toFixed(0)} µm</div>
              </div>
              <div className="bg-gray-800 rounded p-2">
                <div className="text-gray-400 mb-1">Max Clearance</div>
                <div className={fitResult.maxClearance >= 0 ? "text-green-400" : "text-red-400"}>{(fitResult.maxClearance * 1000).toFixed(0)} µm</div>
              </div>
              <div className="bg-gray-800 rounded p-2">
                <div className="text-gray-400 mb-1">Min Clearance</div>
                <div className={fitResult.minClearance >= 0 ? "text-green-400" : "text-red-400"}>{(fitResult.minClearance * 1000).toFixed(0)} µm</div>
              </div>
            </div>
          </div>
        )}

        {/* ── ISO 2768 ── */}
        {tab === "iso2768" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nominal Size (mm)</Label>
                <input
                  type="number"
                  value={iso2768Size}
                  onChange={e => setIso2768Size(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                />
              </div>
              <div>
                <Label>Grade</Label>
                <Select
                  value={iso2768Grade}
                  onChange={v => setIso2768Grade(v)}
                  options={[
                    { value: "f", label: "f — Fine" },
                    { value: "m", label: "m — Medium" },
                    { value: "c", label: "c — Coarse" },
                    { value: "v", label: "v — Very Coarse" },
                  ]}
                />
              </div>
            </div>

            <div className="p-3 bg-gray-800 rounded text-sm space-y-2">
              <div className="font-semibold text-yellow-400">{isoResult.grade}</div>
              <div className="grid grid-cols-1 gap-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Linear tolerance</span>
                  <span className="text-white">±{isoResult.linearTolerance.toFixed(3)} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Angular tolerance</span>
                  <span className="text-white">±{isoResult.angularTolerance.toFixed(3)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Straightness / Flatness</span>
                  <span className="text-white">{isoResult.straightnessFlatnessTolerance.toFixed(3)} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Circularity</span>
                  <span className="text-white">{isoResult.circularityTolerance.toFixed(3)} mm</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Standard toggle */}
      <div className="px-4 py-2 border-t border-gray-700 flex items-center gap-2 text-xs text-gray-500">
        <span>Standard:</span>
        {(["ISO_1101", "ASME_Y14.5"] as const).map(s => (
          <button
            key={s}
            onClick={() => onChange({ ...annotationSet, standard: s })}
            className={`px-2 py-0.5 rounded transition-colors ${annotationSet.standard === s ? "bg-yellow-800 text-yellow-200" : "hover:text-gray-300"}`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>
    </div>
  );
}
