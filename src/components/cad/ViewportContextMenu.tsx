"use client";
import { useEffect, useRef } from "react";
import { useCadStore } from "@/stores/cad-store";
import {
  Copy, Clipboard, Trash2, CopyPlus, EyeOff, Eye, Settings2,
} from "lucide-react";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

export default function ViewportContextMenu({ x, y, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedId = useCadStore((s) => s.selectedId);
  const selectedIds = useCadStore((s) => s.selectedIds);
  const objects = useCadStore((s) => s.objects);
  const deleteSelected = useCadStore((s) => s.deleteSelected);
  const duplicateSelected = useCadStore((s) => s.duplicateSelected);
  const updateObject = useCadStore((s) => s.updateObject);
  const toggleVisibility = useCadStore((s) => s.toggleVisibility);
  const featureHistory = useCadStore((s) => s.featureHistory);

  const hasSelection = selectedIds.length > 0 || selectedId !== null;
  const selCount = selectedIds.length > 0 ? selectedIds.length : selectedId ? 1 : 0;

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Adjust position so menu stays within viewport
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 260);

  const selectedObj = objects.find((o) => o.id === (selectedId ?? selectedIds[0]));
  const isHidden = selectedObj ? selectedObj.visible === false : false;

  const handleCopy = () => {
    if (!selectedObj) return;
    const state = useCadStore.getState();
    state.addGeneratedObject({
      ...JSON.parse(JSON.stringify(selectedObj)),
      name: `${selectedObj.name} (Copy)`,
      position: [
        selectedObj.position[0] + 0.5,
        selectedObj.position[1],
        selectedObj.position[2] + 0.5,
      ],
    });
    onClose();
  };

  const handleDelete = () => {
    deleteSelected();
    onClose();
  };

  const handleDuplicate = () => {
    duplicateSelected();
    onClose();
  };

  const handleToggleVisible = () => {
    if (!selectedId && selectedIds.length === 0) return;
    const idsToToggle = selectedIds.length > 0 ? selectedIds : [selectedId!];
    idsToToggle.forEach((id) => {
      const feat = featureHistory.find((f) => f.objectId === id);
      if (feat) {
        toggleVisibility(feat.id);
      } else {
        const obj = objects.find((o) => o.id === id);
        if (obj) updateObject(id, { visible: !obj.visible });
      }
    });
    onClose();
  };

  const menuItems = [
    {
      label: "Copy",
      icon: <Copy size={13} />,
      shortcut: "Ctrl+C",
      action: handleCopy,
      disabled: !hasSelection,
    },
    {
      label: "Paste",
      icon: <Clipboard size={13} />,
      shortcut: "Ctrl+V",
      action: () => { handleCopy(); },
      disabled: !hasSelection,
    },
    { type: "separator" as const },
    {
      label: "Duplicate",
      icon: <CopyPlus size={13} />,
      shortcut: "Ctrl+D",
      action: handleDuplicate,
      disabled: !hasSelection,
    },
    {
      label: "Delete",
      icon: <Trash2 size={13} />,
      shortcut: "Del",
      action: handleDelete,
      disabled: !hasSelection,
      danger: true,
    },
    { type: "separator" as const },
    {
      label: isHidden ? "Show" : "Hide",
      icon: isHidden ? <Eye size={13} /> : <EyeOff size={13} />,
      shortcut: "H",
      action: handleToggleVisible,
      disabled: !hasSelection,
    },
    {
      label: "Properties",
      icon: <Settings2 size={13} />,
      shortcut: "",
      action: () => {
        useCadStore.getState().setPropertyPanelCollapsed(false);
        onClose();
      },
      disabled: !hasSelection,
    },
  ];

  return (
    <div
      ref={menuRef}
      style={{ left: adjustedX, top: adjustedY }}
      className="fixed z-[9999] min-w-[180px] bg-[#16213e] border border-[#1a2744] rounded-lg shadow-2xl shadow-black/60 py-1 text-xs select-none"
    >
      {/* Header */}
      {hasSelection && (
        <div className="px-3 py-1.5 text-[10px] text-slate-500 border-b border-[#1a2744] mb-1">
          {selCount} object{selCount !== 1 ? "s" : ""} selected
        </div>
      )}

      {menuItems.map((item, i) => {
        if (item.type === "separator") {
          return <div key={i} className="my-1 border-t border-[#1a2744]" />;
        }
        return (
          <button
            key={i}
            onClick={item.disabled ? undefined : item.action}
            disabled={item.disabled}
            className={[
              "w-full flex items-center gap-2.5 px-3 py-1.5 transition-colors",
              item.disabled
                ? "opacity-40 cursor-not-allowed text-slate-500"
                : item.danger
                ? "text-red-400 hover:bg-red-900/30 cursor-pointer"
                : "text-slate-300 hover:bg-[#0f3460] hover:text-white cursor-pointer",
            ].join(" ")}
          >
            <span className="w-4 flex items-center justify-center text-slate-400">
              {item.icon}
            </span>
            <span className="flex-1 text-left">{item.label}</span>
            {item.shortcut && (
              <span className="text-[9px] text-slate-600 font-mono">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
