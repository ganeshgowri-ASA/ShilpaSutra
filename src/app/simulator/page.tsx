"use client";
import { useState } from "react";

export default function SimulatorPage() {
  const [activeTab, setActiveTab] = useState("setup");
  return (
    <div className="h-full flex flex-col">
      <header className="border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">CFD Simulator</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium">Run Simulation</button>
          <button className="px-4 py-2 bg-surface-lighter rounded-lg text-sm">Import Geometry</button>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 bg-surface-light border-r border-gray-700 flex flex-col">
          <div className="flex border-b border-gray-700">
            {["setup","mesh","solver","results"].map(t=>(
              <button key={t} onClick={()=>setActiveTab(t)} className={`flex-1 px-3 py-2 text-xs font-medium capitalize ${activeTab===t?"bg-surface-lighter text-white border-b-2 border-brand-500":"text-gray-400"}`}>{t}</button>
            ))}
          </div>
          <div className="p-4 space-y-3 overflow-y-auto">
            {activeTab==="setup"&&<div className="space-y-3">
              <div><label className="text-xs text-gray-400 block mb-1">Simulation Type</label><select className="w-full bg-surface border border-gray-600 rounded px-3 py-2 text-sm"><option>Incompressible Flow</option><option>Heat Transfer</option></select></div>
              <div><label className="text-xs text-gray-400 block mb-1">Turbulence Model</label><select className="w-full bg-surface border border-gray-600 rounded px-3 py-2 text-sm"><option>k-epsilon</option><option>k-omega SST</option><option>Laminar</option></select></div>
              <div><label className="text-xs text-gray-400 block mb-1">Inlet Velocity (m/s)</label><input type="number" defaultValue="10" className="w-full bg-surface border border-gray-600 rounded px-3 py-2 text-sm"/></div>
            </div>}
            {activeTab==="mesh"&&<div className="space-y-3">
              <div><label className="text-xs text-gray-400 block mb-1">Mesh Type</label><select className="w-full bg-surface border border-gray-600 rounded px-3 py-2 text-sm"><option>Auto (Tet)</option><option>Hex</option></select></div>
              <div><label className="text-xs text-gray-400 block mb-1">Element Size (mm)</label><input type="number" defaultValue="5" className="w-full bg-surface border border-gray-600 rounded px-3 py-2 text-sm"/></div>
              <button className="w-full py-2 bg-brand-600 rounded text-sm">Generate Mesh</button>
            </div>}
            {activeTab==="solver"&&<div className="space-y-3">
              <div><label className="text-xs text-gray-400 block mb-1">Solver</label><select className="w-full bg-surface border border-gray-600 rounded px-3 py-2 text-sm"><option>simpleFoam</option><option>pimpleFoam</option></select></div>
              <div><label className="text-xs text-gray-400 block mb-1">Iterations</label><input type="number" defaultValue="1000" className="w-full bg-surface border border-gray-600 rounded px-3 py-2 text-sm"/></div>
            </div>}
            {activeTab==="results"&&<div className="space-y-2">
              <p className="text-sm text-gray-400">Run simulation to see results</p>
              {["Velocity","Pressure","Temperature","Streamlines"].map(r=>(<button key={r} className="w-full px-3 py-2 bg-surface-lighter rounded text-sm text-left hover:bg-gray-600">{r}</button>))}
            </div>}
          </div>
        </div>
        <div className="flex-1 bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-40 h-40 mx-auto mb-4 border-2 border-dashed border-gray-600 rounded-xl flex items-center justify-center">
              <svg className="w-20 h-20 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </div>
            <p className="text-gray-500">CFD Simulation Viewport</p>
            <p className="text-gray-600 text-sm mt-1">OpenFOAM + ML surrogate models</p>
          </div>
        </div>
      </div>
    </div>
  );
}
