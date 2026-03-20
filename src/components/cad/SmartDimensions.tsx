"use client";
import { useState, useCallback, useMemo } from "react";
import { Html } from "@react-three/drei";
import { useCadStore, type CadObject } from "@/stores/cad-store";

export type DimensionStyle = "iso" | "ansi" | "custom";
export type ArrowStyle = "filled" | "open" | "dot" | "tick";

interface DimensionConfig {
  style: DimensionStyle;
  fontSize: number;
  arrowStyle: ArrowStyle;
  showTolerance: boolean;
  tolerancePlus: number;
  toleranceMinus: number;
  isDriving: boolean;
}

const defaultConfig: DimensionConfig = {
  style: "iso",
  fontSize: 10,
  arrowStyle: "filled",
  showTolerance: false,
  tolerancePlus: 0.01,
  toleranceMinus: 0.01,
  isDriving: true,
};

function DimensionAnnotation({
  position,
  value,
  label,
  unit,
  config,
  onEdit,
  objectId,
  dimensionKey,
}: {
  position: [number, number, number];
  value: number;
  label: string;
  unit: string;
  config: DimensionConfig;
  onEdit: (objectId: string, key: string, value: number) => void;
  objectId: string;
  dimensionKey: string;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toFixed(2));

  const handleClick = useCallback(() => {
    if (config.isDriving) {
      setInputValue(value.toFixed(2));
      setEditing(true);
    }
  }, [config.isDriving, value]);

  const handleSubmit = useCallback(() => {
    const newValue = parseFloat(inputValue);
    if (!isNaN(newValue) && newValue > 0) {
      onEdit(objectId, dimensionKey, newValue);
    }
    setEditing(false);
  }, [inputValue, onEdit, objectId, dimensionKey]);

  const formatValue = () => {
    const formatted = value.toFixed(2);
    if (config.showTolerance) {
      return `${formatted} +${config.tolerancePlus}/-${config.toleranceMinus}`;
    }
    return formatted;
  };

  const borderColor = config.isDriving ? "#00D4FF" : "#888888";
  const bgColor = config.isDriving ? "#0d1117" : "#1a1a2e";

  return (
    <Html position={position} center style={{ pointerEvents: "auto" }}>
      {editing ? (
        <div
          className="bg-[#0d1117] border-2 border-[#00D4FF] rounded px-2 py-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[9px] text-slate-400 mb-0.5">{label}</div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") setEditing(false);
              }}
              className="w-16 bg-[#16213e] text-white text-[11px] font-mono px-1.5 py-0.5 rounded border border-[#00D4FF]/50 outline-none"
              autoFocus
              step="0.1"
            />
            <span className="text-[9px] text-[#00D4FF]">{unit}</span>
          </div>
          <div className="flex gap-1 mt-1">
            <button
              onClick={handleSubmit}
              className="text-[9px] bg-[#00D4FF]/20 text-[#00D4FF] px-2 py-0.5 rounded hover:bg-[#00D4FF]/30"
            >
              OK
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-[9px] text-slate-500 px-2 py-0.5 rounded hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          className={`rounded px-1.5 py-0.5 whitespace-nowrap border cursor-pointer hover:border-[#00D4FF] transition-colors`}
          style={{ backgroundColor: `${bgColor}e6`, borderColor: `${borderColor}66` }}
        >
          <span style={{ fontSize: config.fontSize }} className="text-white font-mono">
            {label}: {formatValue()}{" "}
            <span style={{ color: borderColor }}>{unit}</span>
          </span>
          {!config.isDriving && (
            <span className="text-[8px] text-slate-500 ml-1">(REF)</span>
          )}
        </div>
      )}
    </Html>
  );
}

export default function SmartDimensions() {
  const selectedId = useCadStore((s) => s.selectedId);
  const objects = useCadStore((s) => s.objects);
  const showDimensions = useCadStore((s) => s.showDimensions);
  const updateObject = useCadStore((s) => s.updateObject);
  const pushHistory = useCadStore((s) => s.pushHistory);
  const unit = useCadStore((s) => s.unit);

  const [config] = useState<DimensionConfig>(defaultConfig);

  const selected = objects.find((o) => o.id === selectedId);

  const handleDimensionEdit = useCallback(
    (objectId: string, key: string, value: number) => {
      pushHistory();
      const obj = objects.find((o) => o.id === objectId);
      if (!obj) return;

      switch (key) {
        case "width":
          updateObject(objectId, { dimensions: { ...obj.dimensions, width: value } });
          break;
        case "height":
          updateObject(objectId, {
            dimensions: { ...obj.dimensions, height: value },
            position: [obj.position[0], value / 2, obj.position[2]],
          });
          break;
        case "depth":
          updateObject(objectId, { dimensions: { ...obj.dimensions, depth: value } });
          break;
        case "radius":
          updateObject(objectId, {
            dimensions: { ...obj.dimensions, width: value },
          });
          break;
      }
    },
    [objects, updateObject, pushHistory]
  );

  const dimensions = useMemo(() => {
    if (!showDimensions || !selected) return [];
    const sketchTypes = ["line", "arc", "circle", "rectangle"];
    if (sketchTypes.includes(selected.type) || selected.visible === false) return [];

    const [px, py, pz] = selected.position;
    const { width, height, depth } = selected.dimensions;
    const dims: {
      position: [number, number, number];
      value: number;
      label: string;
      key: string;
    }[] = [];

    switch (selected.type) {
      case "box":
        dims.push(
          { position: [px, py - height / 2 - 0.6, pz + depth / 2], value: width, label: "W", key: "width" },
          { position: [px + width / 2 + 0.7, py, pz + depth / 2], value: height, label: "H", key: "height" },
          { position: [px - width / 2 - 0.7, py - height / 2, pz], value: depth, label: "D", key: "depth" }
        );
        break;
      case "cylinder":
      case "cone":
        dims.push(
          { position: [px + width / 2 + 0.4, py + height / 2 + 0.3, pz], value: width, label: "R", key: "radius" },
          { position: [px + width + 0.7, py, pz], value: height, label: "H", key: "height" }
        );
        break;
      case "sphere":
        dims.push(
          { position: [px, py + width + 0.5, pz], value: width * 2, label: "\u00D8", key: "radius" }
        );
        break;
    }

    return dims;
  }, [selected, showDimensions]);

  if (!showDimensions || !selected || dimensions.length === 0) return null;

  return (
    <group>
      {dimensions.map((dim) => (
        <DimensionAnnotation
          key={`${selected.id}_${dim.key}`}
          position={dim.position}
          value={dim.value}
          label={dim.label}
          unit={unit}
          config={config}
          onEdit={handleDimensionEdit}
          objectId={selected.id}
          dimensionKey={dim.key}
        />
      ))}
    </group>
  );
}
