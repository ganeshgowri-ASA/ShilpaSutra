export default function Dashboard() {
  const stats = [
    { label: "CAD Models", value: "12", icon: "cube", color: "bg-blue-500" },
    { label: "CFD Simulations", value: "5", icon: "chart", color: "bg-green-500" },
    { label: "Parts Library", value: "248", icon: "archive", color: "bg-purple-500" },
    { label: "AI Generations", value: "37", icon: "sparkles", color: "bg-amber-500" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <header className="border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              शिल्पसूत्र <span className="text-brand-500">ShilpaSutra</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">AI-Powered CAD & CFD Design Platform</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-brand-600 hover:bg-brand-700 rounded-lg text-sm font-medium transition">
              + New Design
            </button>
            <button className="px-4 py-2 bg-surface-lighter hover:bg-gray-600 rounded-lg text-sm transition">
              Import File
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-surface-light rounded-xl p-5 border border-gray-700 hover:border-brand-500 transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center opacity-80`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/designer" className="bg-surface-light rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition group">
            <h3 className="text-lg font-semibold group-hover:text-blue-400 transition">CAD Designer</h3>
            <p className="text-gray-400 text-sm mt-2">Create 3D models with AI-powered text-to-CAD, sketch tools, and parametric modeling</p>
            <div className="mt-4 text-blue-400 text-sm font-medium">Open Designer &rarr;</div>
          </a>
          <a href="/simulator" className="bg-surface-light rounded-xl p-6 border border-gray-700 hover:border-green-500 transition group">
            <h3 className="text-lg font-semibold group-hover:text-green-400 transition">CFD Simulator</h3>
            <p className="text-gray-400 text-sm mt-2">Run fluid dynamics simulations with automated meshing, boundary conditions, and visualization</p>
            <div className="mt-4 text-green-400 text-sm font-medium">Open Simulator &rarr;</div>
          </a>
          <a href="/library" className="bg-surface-light rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition group">
            <h3 className="text-lg font-semibold group-hover:text-purple-400 transition">Parts Library</h3>
            <p className="text-gray-400 text-sm mt-2">Browse parametric components, templates, and community-shared designs</p>
            <div className="mt-4 text-purple-400 text-sm font-medium">Browse Library &rarr;</div>
          </a>
        </div>

        {/* Recent Projects */}
        <div className="bg-surface-light rounded-xl border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold">Recent Projects</h2>
          </div>
          <div className="divide-y divide-gray-700">
            {["Bracket Assembly v2", "Turbine Blade CFD", "Gear Housing", "Heat Sink Design"].map((name, i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-surface-lighter transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-lighter rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">{name}</p>
                    <p className="text-gray-400 text-xs">Modified {i + 1}h ago</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-surface-lighter text-gray-300">
                  {i < 2 ? "CAD" : "CFD"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
