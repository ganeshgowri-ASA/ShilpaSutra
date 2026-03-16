# ShilpaSutra - AI CAD & CFD Platform

> **The Formulas of Craftsmanship** - AI-powered Text/Multimodal to CAD & CFD platform with conversational design, parametric modeling, and simulation.

## Live Demo

**https://shilpa-sutra.vercel.app**

## Features

### Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Stats overview, quick actions, recent projects |
| CAD Designer | `/designer` | Zoo-like CAD workspace with ribbon toolbar, feature tree, 3D viewport, AI chat sidebar |
| CFD Simulator | `/simulator` | Full FEA/CFD workflow - geometry, meshing, physics, materials, solver, post-processing |
| Text-to-CAD | `/text-to-cad` | Natural language prompt to 3D model generation with 10 export formats |
| Assembly | `/assembly` | Component constraints, BOM, exploded view, motion study |
| 2D Drawings | `/drawings` | GD&T annotations, dimensions, multi-format export |
| Parts Library | `/library` | Searchable/filterable parametric components (Fasteners, Gears, Brackets, Bearings, Thermal, Enclosures) |
| Settings | `/settings` | Units, theme, viewport, AI engine, export, keyboard shortcuts |

### API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate-cad` | POST | Text-to-CAD generation with NLP prompt parsing, parametric generators (gear, bracket, bolt, flange, housing, heatsink) |
| `/api/simulate` | POST | FEA/CFD/Thermal/Modal/Fatigue simulation with convergence data, field results, and multi-physics support |

### Components

- **Viewport3D** - Three.js/React Three Fiber component with OrbitControls, grid, gizmo helper, contact shadows, environment lighting, and mode-specific sample geometry (designer/simulator/assembly)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **3D Engine**: Three.js + React Three Fiber + Drei
- **UI Components**: Radix UI, Framer Motion, Lucide Icons
- **State**: Zustand
- **Deployment**: Vercel
- **Backend (planned)**: OpenFOAM (CFD), CalculiX (FEA), CadQuery/Build123d (geometry kernel)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/ganeshgowri-ASA/ShilpaSutra.git
cd ShilpaSutra

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
  app/
    api/
      generate-cad/route.ts    # Text-to-CAD API
      simulate/route.ts        # Simulation API
    assembly/page.tsx          # Assembly workspace
    designer/page.tsx          # CAD Designer
    drawings/page.tsx          # 2D Drawings
    library/page.tsx           # Parts Library
    settings/page.tsx          # Settings
    simulator/page.tsx         # FEA/CFD Simulator
    text-to-cad/page.tsx       # Text-to-CAD
    layout.tsx                 # Root layout with sidebar navigation
    page.tsx                   # Dashboard
  components/
    Viewport3D.tsx             # Three.js 3D viewport component
```

## Roadmap

- [ ] Integrate real Three.js viewport into Designer and Simulator pages
- [ ] Connect AI backends (Claude/OpenAI) for intelligent text-to-CAD
- [ ] Wire up OpenFOAM WebSocket for real-time CFD
- [ ] Add CalculiX integration for FEA
- [ ] Implement CadQuery/Build123d geometry kernel
- [ ] Real-time collaboration (WebSocket)
- [ ] Version control for designs (Git-based)
- [ ] STEP/STL/OBJ file import/export
- [ ] Multi-user workspace

## License

MIT

---

Built with Next.js, Three.js, and AI. Deployed on Vercel.
