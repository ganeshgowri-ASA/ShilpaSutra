'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Command {
  id: string;
  label: string;
  icon: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

export default function CommandBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const commands: Command[] = [
    { id: 'new-design', label: 'New Design', icon: '\u2795', category: 'Create', action: () => router.push('/designer') },
    { id: 'text-to-cad', label: 'Text to CAD', icon: '\uD83D\uDCAC', category: 'Create', action: () => router.push('/text-to-cad') },
    { id: 'open-simulator', label: 'Open Simulator', icon: '\u2699\uFE0F', category: 'Navigate', action: () => router.push('/simulator') },
    { id: 'open-library', label: 'Parts Library', icon: '\uD83D\uDCDA', category: 'Navigate', action: () => router.push('/library') },
    { id: 'open-assembly', label: 'Assembly', icon: '\uD83D\uDD27', category: 'Navigate', action: () => router.push('/assembly') },
    { id: 'open-drawings', label: '2D Drawings', icon: '\uD83D\uDCCF', category: 'Navigate', action: () => router.push('/drawings') },
    { id: 'open-settings', label: 'Settings', icon: '\u2699\uFE0F', category: 'Navigate', action: () => router.push('/settings') },
    { id: 'export-step', label: 'Export as STEP', icon: '\uD83D\uDCE4', category: 'Export', shortcut: 'Ctrl+E', action: () => alert('Export STEP - connect to API') },
    { id: 'export-stl', label: 'Export as STL', icon: '\uD83D\uDCE4', category: 'Export', action: () => alert('Export STL - connect to API') },
    { id: 'undo', label: 'Undo', icon: '\u21A9\uFE0F', category: 'Edit', shortcut: 'Ctrl+Z', action: () => document.execCommand('undo') },
    { id: 'redo', label: 'Redo', icon: '\u21AA\uFE0F', category: 'Edit', shortcut: 'Ctrl+Y', action: () => document.execCommand('redo') },
    { id: 'toggle-grid', label: 'Toggle Grid', icon: '\u2B1C', category: 'View', action: () => {} },
    { id: 'toggle-wireframe', label: 'Toggle Wireframe', icon: '\uD83D\uDD33', category: 'View', action: () => {} },
    { id: 'fit-view', label: 'Fit to View', icon: '\uD83D\uDD0D', category: 'View', shortcut: 'F', action: () => {} },
    { id: 'sketch-line', label: 'Sketch: Line', icon: '\u2796', category: 'Sketch', shortcut: 'L', action: () => {} },
    { id: 'sketch-rect', label: 'Sketch: Rectangle', icon: '\u25A1', category: 'Sketch', shortcut: 'R', action: () => {} },
    { id: 'sketch-circle', label: 'Sketch: Circle', icon: '\u25CB', category: 'Sketch', shortcut: 'C', action: () => {} },
    { id: 'op-extrude', label: 'Extrude', icon: '\u2B06\uFE0F', category: 'Operations', shortcut: 'E', action: () => {} },
    { id: 'op-revolve', label: 'Revolve', icon: '\uD83D\uDD04', category: 'Operations', action: () => {} },
    { id: 'op-fillet', label: 'Fillet', icon: '\u25D5', category: 'Operations', action: () => {} },
    { id: 'op-chamfer', label: 'Chamfer', icon: '\u25E2', category: 'Operations', action: () => {} },
    { id: 'op-boolean', label: 'Boolean Union/Subtract', icon: '\u2A01', category: 'Operations', action: () => {} },
    { id: 'constraint-dist', label: 'Constraint: Distance', icon: '\u2194\uFE0F', category: 'Constraints', action: () => {} },
    { id: 'constraint-angle', label: 'Constraint: Angle', icon: '\uD83D\uDCD0', category: 'Constraints', action: () => {} },
    { id: 'ai-assistant', label: 'Ask AI Assistant', icon: '\uD83E\uDD16', category: 'AI', shortcut: 'Ctrl+/', action: () => {} },
  ];

  const filtered = query
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()) || c.category.toLowerCase().includes(query.toLowerCase()))
    : commands;

  const grouped = filtered.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      // Also support Ctrl+Shift+P (VS Code style)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
    if (!isOpen) { setQuery(''); setSelectedIndex(0); }
  }, [isOpen]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const flatFiltered = Object.values(grouped).flat();

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, flatFiltered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && flatFiltered[selectedIndex]) {
      flatFiltered[selectedIndex].action();
      setIsOpen(false);
    }
  }, [flatFiltered, selectedIndex]);

  if (!isOpen) return null;

  let globalIndex = -1;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]" onClick={() => setIsOpen(false)}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-4 py-3 border-b border-gray-700">
          <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a command or search..." className="flex-1 bg-transparent text-white text-lg outline-none placeholder-gray-500" />
          <kbd className="px-2 py-1 text-xs bg-gray-800 text-gray-400 rounded border border-gray-600">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {Object.entries(grouped).length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">No commands found</div>
          )}
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category} className="mb-2">
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{category}</div>
              {cmds.map((cmd) => {
                globalIndex++;
                const idx = globalIndex;
                return (
                  <button key={cmd.id} onClick={() => { cmd.action(); setIsOpen(false); }} className={`w-full flex items-center px-3 py-2.5 rounded-lg text-left transition-colors ${idx === selectedIndex ? 'bg-blue-600/30 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
                    <span className="text-lg mr-3 w-6 text-center">{cmd.icon}</span>
                    <span className="flex-1 font-medium">{cmd.label}</span>
                    {cmd.shortcut && <kbd className="px-2 py-0.5 text-xs bg-gray-800 text-gray-400 rounded border border-gray-600">{cmd.shortcut}</kbd>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
          <span>\u2191\u2193 Navigate &middot; \u23CE Select &middot; Esc Close</span>
          <span>{filtered.length} commands</span>
        </div>
      </div>
    </div>
  );
}
