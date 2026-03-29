"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { EQUIPMENT_TEMPLATES, type EquipmentTemplateId } from "@/components/drawings/templates";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  category: string;
  action: () => void;
  shortcut?: string;
}

interface RecentDrawing {
  id: string;
  name: string;
  standard: string;
  timestamp: number;
  url: string;
}

// ─── Recent Drawings Store ────────────────────────────────────────────────────

const RECENT_KEY = "shilpasutra_recent_drawings";
const MAX_RECENT = 5;

function getRecentDrawings(): RecentDrawing[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch { return []; }
}

export function addRecentDrawing(id: string, name: string, standard: string, url: string) {
  if (typeof window === "undefined") return;
  try {
    const recent = getRecentDrawings().filter(r => r.id !== id);
    recent.unshift({ id, name, standard, timestamp: Date.now(), url });
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {}
}

// ─── Toast System ─────────────────────────────────────────────────────────────

let toastListeners: ((msg: string) => void)[] = [];
export function showToast(msg: string) {
  toastListeners.forEach(fn => fn(msg));
}

function ToastContainer() {
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const listener = (msg: string) => {
      const id = nextId.current++;
      setToasts(prev => [...prev, { id, msg }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };
    toastListeners.push(listener);
    return () => { toastListeners = toastListeners.filter(l => l !== listener); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-16 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className="bg-[#161b22] border border-[#00D4FF]/40 rounded-lg px-4 py-2.5 shadow-2xl animate-in slide-in-from-right-5 text-xs text-white flex items-center gap-2"
          style={{ animation: "slideInRight 0.3s ease-out" }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="#00D4FF">
            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm3.78-9.72a.75.75 0 0 0-1.06-1.06L7 8.94 5.28 7.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l4.25-4.25z" />
          </svg>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Command Palette ──────────────────────────────────────────────────────────

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Build commands list
  const commands: CommandItem[] = [
    // Pages
    { id: "nav-dashboard", label: "Dashboard", category: "Navigate", action: () => router.push("/") },
    { id: "nav-designer", label: "CAD Designer", category: "Navigate", action: () => router.push("/designer") },
    { id: "nav-drawings", label: "2D Drawings", category: "Navigate", action: () => router.push("/drawings") },
    { id: "nav-library", label: "Equipment Library", category: "Navigate", action: () => router.push("/library"), shortcut: "Ctrl+L" },
    { id: "nav-simulator", label: "FEA Simulator", category: "Navigate", action: () => router.push("/simulator") },
    { id: "nav-cfd", label: "CFD Simulator", category: "Navigate", action: () => router.push("/cfd") },
    { id: "nav-settings", label: "Settings", category: "Navigate", action: () => router.push("/settings") },

    // Equipment templates
    ...Object.entries(EQUIPMENT_TEMPLATES).map(([id, t]) => ({
      id: `template-${id}`,
      label: t.name,
      description: t.standard,
      category: "Equipment",
      action: () => router.push(`/drawings?template=${id}`),
    })),

    // Actions
    { id: "action-export-svg", label: "Export SVG", category: "Action", action: () => { document.dispatchEvent(new CustomEvent("shilpasutra:export", { detail: "svg" })); }, shortcut: "Ctrl+E" },
    { id: "action-toggle-dims", label: "Toggle Dimensions Panel", category: "Action", action: () => { document.dispatchEvent(new CustomEvent("shilpasutra:toggle-dims")); }, shortcut: "Ctrl+D" },
    { id: "action-compare", label: "Compare Templates", category: "Action", action: () => { document.dispatchEvent(new CustomEvent("shilpasutra:compare")); } },
  ];

  // Add recent drawings
  const recentDrawings = getRecentDrawings();
  recentDrawings.forEach((r, i) => {
    commands.push({
      id: `recent-${r.id}`,
      label: r.name,
      description: `${r.standard} - opened ${new Date(r.timestamp).toLocaleDateString()}`,
      category: "Recent",
      action: () => router.push(r.url),
    });
  });

  const filtered = query
    ? commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  // Keyboard shortcut to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
      // Ctrl+E = export SVG
      if ((e.ctrlKey || e.metaKey) && e.key === "e" && !open) {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("shilpasutra:export", { detail: "svg" }));
      }
      // Ctrl+D = toggle dimensions
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && !open) {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("shilpasutra:toggle-dims"));
      }
      // Ctrl+1/2/3 = quick template switch
      if ((e.ctrlKey || e.metaKey) && ["1", "2", "3"].includes(e.key) && !open) {
        e.preventDefault();
        const templateIds = Object.keys(EQUIPMENT_TEMPLATES);
        const idx = parseInt(e.key) - 1;
        if (templateIds[idx]) {
          router.push(`/drawings?template=${templateIds[idx]}`);
        }
      }
      // Escape to close
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, router]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Navigate with arrow keys
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
      setOpen(false);
    }
  };

  useEffect(() => { setSelectedIndex(0); }, [query]);

  if (!open) return <ToastContainer />;

  return (
    <>
      <ToastContainer />
      {/* Backdrop */}
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Palette */}
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[201] w-[560px] max-w-[90vw]">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#21262d]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="#6b7280">
              <path d="M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zm-.82 4.74a6 6 0 1 1 1.06-1.06l3.04 3.04a.75.75 0 1 1-1.06 1.06l-3.04-3.04z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search templates, pages, actions..."
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            />
            <kbd className="px-1.5 py-0.5 rounded bg-[#21262d] text-[9px] text-slate-500 font-mono border border-[#30363d]">ESC</kbd>
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">No results found</div>
            ) : (
              <>
                {/* Group by category */}
                {["Recent", "Equipment", "Navigate", "Action"].filter(cat => filtered.some(c => c.category === cat)).map(cat => (
                  <div key={cat}>
                    <div className="px-4 py-1.5 text-[9px] text-slate-500 uppercase font-bold tracking-wider bg-[#0d1117]/50">{cat}</div>
                    {filtered.filter(c => c.category === cat).map((cmd, i) => {
                      const globalIdx = filtered.indexOf(cmd);
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => { cmd.action(); setOpen(false); }}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                            selectedIndex === globalIdx
                              ? "bg-[#00D4FF]/10 text-white"
                              : "text-slate-300 hover:bg-[#21262d]"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-medium truncate">{cmd.label}</div>
                            {cmd.description && <div className="text-[10px] text-slate-500 truncate">{cmd.description}</div>}
                          </div>
                          {cmd.shortcut && (
                            <kbd className="shrink-0 ml-3 px-1.5 py-0.5 rounded bg-[#21262d] text-[9px] text-slate-500 font-mono border border-[#30363d]">
                              {cmd.shortcut}
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-[#21262d] text-[9px] text-slate-600">
            <span><kbd className="px-1 py-0.5 rounded bg-[#21262d] border border-[#30363d] font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="px-1 py-0.5 rounded bg-[#21262d] border border-[#30363d] font-mono">↵</kbd> select</span>
            <span><kbd className="px-1 py-0.5 rounded bg-[#21262d] border border-[#30363d] font-mono">esc</kbd> close</span>
            <span className="ml-auto">Ctrl+K to toggle</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Template Comparison Mode ─────────────────────────────────────────────────

export function TemplateCompareMode({ onClose }: { onClose: () => void }) {
  const [left, setLeft] = useState<EquipmentTemplateId>("thermal_cycling_chamber");
  const [right, setRight] = useState<EquipmentTemplateId>("humidity_freeze_chamber");

  return (
    <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-8">
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl w-full max-w-5xl max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d]">
          <h2 className="text-sm font-bold text-white">Compare Templates</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg">&times;</button>
        </div>
        <div className="flex gap-4 p-4">
          {[{ val: left, set: setLeft }, { val: right, set: setRight }].map((side, i) => (
            <div key={i} className="flex-1">
              <select
                value={side.val}
                onChange={e => side.set(e.target.value as EquipmentTemplateId)}
                className="w-full bg-[#0d1117] border border-[#21262d] rounded px-3 py-2 text-xs text-white mb-3"
              >
                {Object.entries(EQUIPMENT_TEMPLATES).map(([id, t]) => (
                  <option key={id} value={id}>{t.name}</option>
                ))}
              </select>
              <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-4">
                <div className="text-sm font-bold text-white mb-1">{EQUIPMENT_TEMPLATES[side.val].name}</div>
                <div className="text-[10px] text-[#00D4FF] font-mono mb-2">{EQUIPMENT_TEMPLATES[side.val].standard}</div>
                <div className="text-[10px] text-slate-400">{EQUIPMENT_TEMPLATES[side.val].description}</div>
                <div className="mt-3 text-[9px] text-slate-500">
                  {EQUIPMENT_TEMPLATES[side.val].keywords.join(" \u00B7 ")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Progress Indicator ───────────────────────────────────────────────────────

export function ExplorationProgress() {
  const [explored, setExplored] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("shilpasutra_explored");
      if (stored) setExplored(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  const total = Object.keys(EQUIPMENT_TEMPLATES).length;
  const count = explored.size;
  const pct = Math.round((count / total) * 100);

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <div className="flex-1 h-1 bg-[#21262d] rounded-full overflow-hidden">
        <div className="h-full bg-[#00D4FF] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-slate-500 font-mono whitespace-nowrap">{count}/{total} explored</span>
    </div>
  );
}

// ─── Recent Drawings Sidebar Widget ───────────────────────────────────────────

export function RecentDrawingsWidget() {
  const [recent, setRecent] = useState<RecentDrawing[]>([]);
  const router = useRouter();

  useEffect(() => {
    setRecent(getRecentDrawings());
  }, []);

  if (recent.length === 0) return null;

  return (
    <div className="px-3 py-2 border-t border-[#21262d]">
      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Recent Drawings</div>
      <div className="space-y-0.5">
        {recent.map(r => (
          <button
            key={r.id}
            onClick={() => router.push(r.url)}
            className="w-full text-left px-2 py-1 rounded text-[9px] bg-[#0d1117] hover:bg-[#21262d] border border-transparent hover:border-[#21262d] transition-colors"
          >
            <div className="text-slate-300 truncate">{r.name}</div>
            <div className="text-slate-600 text-[8px]">{r.standard}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
