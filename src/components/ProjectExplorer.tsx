'use client';
import { useState } from 'react';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  icon?: string;
  children?: FileNode[];
  modified?: boolean;
}

const PROJECT_TREE: FileNode[] = [
  {
    name: 'Bracket Assembly v2', type: 'folder', children: [
      { name: 'main.kcl', type: 'file', icon: 'kcl', modified: true },
      { name: 'bracket.kcl', type: 'file', icon: 'kcl' },
      { name: 'fasteners.kcl', type: 'file', icon: 'kcl' },
      { name: 'assembly.kcl', type: 'file', icon: 'kcl' },
      {
        name: 'exports', type: 'folder', children: [
          { name: 'bracket_v2.step', type: 'file', icon: 'step' },
          { name: 'bracket_v2.stl', type: 'file', icon: 'stl' },
          { name: 'drawing.dxf', type: 'file', icon: 'dxf' },
        ]
      },
      {
        name: 'simulations', type: 'folder', children: [
          { name: 'stress_analysis.sim', type: 'file', icon: 'sim' },
          { name: 'thermal.sim', type: 'file', icon: 'sim' },
        ]
      },
    ]
  },
  {
    name: 'Gear Train 20T-40T', type: 'folder', children: [
      { name: 'main.kcl', type: 'file', icon: 'kcl' },
      { name: 'pinion_20t.kcl', type: 'file', icon: 'kcl' },
      { name: 'gear_40t.kcl', type: 'file', icon: 'kcl' },
    ]
  },
  {
    name: 'Heat Sink Thermal', type: 'folder', children: [
      { name: 'main.kcl', type: 'file', icon: 'kcl' },
      { name: 'thermal_sim.sim', type: 'file', icon: 'sim' },
    ]
  },
];

const FILE_ICONS: Record<string, { color: string; label: string }> = {
  kcl: { color: 'text-blue-400', label: 'KCL' },
  step: { color: 'text-green-400', label: 'STP' },
  stl: { color: 'text-yellow-400', label: 'STL' },
  dxf: { color: 'text-purple-400', label: 'DXF' },
  sim: { color: 'text-orange-400', label: 'SIM' },
};

function FileTree({ nodes, depth = 0 }: { nodes: FileNode[]; depth?: number }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'Bracket Assembly v2': true });

  return (
    <div>
      {nodes.map((node) => (
        <div key={node.name}>
          <button
            onClick={() => node.type === 'folder' && setExpanded(prev => ({ ...prev, [node.name]: !prev[node.name] }))}
            className={`w-full flex items-center gap-1.5 px-2 py-1 text-left text-xs hover:bg-gray-800 rounded transition-colors ${depth > 0 ? 'ml-' + (depth * 3) : ''}`}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
          >
            {node.type === 'folder' ? (
              <span className="text-gray-500 w-3 text-center text-[10px]">{expanded[node.name] ? '\u25BC' : '\u25B6'}</span>
            ) : (
              <span className="w-3" />
            )}
            {node.type === 'folder' ? (
              <span className="text-yellow-500 text-sm">{expanded[node.name] ? '\uD83D\uDCC2' : '\uD83D\uDCC1'}</span>
            ) : (
              <span className={`text-[9px] font-bold px-1 rounded ${FILE_ICONS[node.icon || '']?.color || 'text-gray-400'}`}>
                {FILE_ICONS[node.icon || '']?.label || 'F'}
              </span>
            )}
            <span className={`flex-1 truncate ${node.type === 'folder' ? 'text-gray-200 font-medium' : 'text-gray-400'}`}>{node.name}</span>
            {node.modified && <span className="w-2 h-2 rounded-full bg-blue-400" title="Modified" />}
          </button>
          {node.type === 'folder' && expanded[node.name] && node.children && (
            <FileTree nodes={node.children} depth={depth + 1} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function ProjectExplorer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed left-16 top-0 h-full w-64 bg-gray-900 border-r border-gray-700 shadow-xl z-[997] flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="text-white text-sm font-semibold">Explorer</span>
        <div className="flex items-center gap-1">
          <button className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 text-xs" title="New File">+</button>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 text-xs">X</button>
        </div>
      </div>

      <div className="px-2 py-2">
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search files..." className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1.5 outline-none border border-gray-700 focus:border-blue-500 placeholder-gray-500" />
      </div>

      <div className="flex-1 overflow-y-auto px-1">
        <div className="px-2 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Projects</div>
        <FileTree nodes={PROJECT_TREE} />
      </div>

      <div className="px-3 py-2 border-t border-gray-700 text-[10px] text-gray-500">
        3 projects | 12 files
      </div>
    </div>
  );
}
