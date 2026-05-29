# ShilpaSutra – Architecture Overview

> Last updated: 2026-05-29

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui |
| 3D Viewport | Three.js 0.169 · React Three Fiber 8 · @react-three/drei 9 |
| CAD Kernel | CSG (browser-side) via `csg-engine.ts`; STEP/IGES export via `step-iges-export.ts` |
| Sketch | `sketch-engine.ts` – constraint-based 2D sketcher |
| FEA | `fea-engine.ts` · `feaModalBuckling.ts` · `femSolver.ts` |
| CFD | `cfd-engine.ts` (grid/solver) · `cfd-turbulence.ts` · `cfd-boundary.ts` · `cfd-postprocess.ts` |
| AI/LLM | `@anthropic-ai/sdk` → `ai-reasoning-engine.ts`; route handlers in `app/api/ai/` |
| State | Zustand 5 – stores in `src/stores/` |
| Drawings | `drawingEngine.ts` (SVG renderer) · `drawingDSL.ts` · `iecDrawingAdapter.ts` |
| PV Testing | `pvIECTestTemplates.ts` + `pvIECTestTemplates2.ts` → aggregated by `pvIECTestRegistry.ts` |
| Export | `export-engine.ts` · `step-iges-export.ts` · `pdfExportPro.ts` · `bom-generator.ts` |
| Version Control | `versionControl.ts` (drawing history) · `drawingVersionControl.ts` (CFD history) |

---

## Module Map

### App Routes (`src/app/`)

| Route | Purpose |
|-------|---------|
| `/` | Landing / dashboard |
| `/designer` | Main CAD workspace (sketch + 3D ops + AI chat) |
| `/cfd` | CFD simulation (grid setup, solver, post-processing) |
| `/cfd-advanced` | Wind-load analysis for PV arrays |
| `/simulator` | Physics simulation workspace |
| `/drawings` | 2D drawing generator (A3/A4 sheets, IEC templates) |
| `/assembly` | Part assembly workspace |
| `/assembly-advanced` | Assembly with mate diagnostics |
| `/structural-analysis` | FEA / foundation sizing |
| `/fea-advanced` | Modal & buckling FEA |
| `/text-to-cad` | Natural-language → CAD wizard |
| `/pdf-to-cad` | PDF / scan → CAD reconstruction |
| `/library` | Parts library browser |
| `/templates` | Parametric template gallery |
| `/model-hub` | HuggingFace / Kaggle / Zoo model import + training |
| `/pv-workflows` | Photovoltaic array workflows |
| `/simscape` | Block-diagram system simulation (Simscape-like) |
| `/import-export` | File import/export hub |
| `/measure` | Measurement tools |
| `/renderer` | High-quality renderer viewport |
| `/reports` / `/reports-advanced` | Report generation |
| `/settings` | User preferences |
| `/wizard` | Guided design wizard |

### Key Stores (`src/stores/`)

| Store | Owns |
|-------|------|
| `cad-store.ts` | Feature tree, geometry, undo history, active tool, selection |
| `constraint-store.ts` | Sketch constraints and solver state |
| `assembly-store.ts` | Assembly components, mates, DoF |
| `layer-store.ts` | Drawing layers visibility and style |
| `settings-store.ts` | Theme, units, display preferences |

### Component Tree (`src/components/`)

```
components/
├── layout/          Sidebar nav
├── cad/             CAD-specific panels (FeatureTree, PropertyPanel, SketchToolbar,
│                    RibbonToolbar, ConstraintManager, ExportPanel, …)
├── cfd/             CFD panels (CFDFieldRenderer, ConvergencePlot, VersionHistoryPanel)
├── fea/             FEA report panel
├── fem/             FEM mesh renderer
├── drawings/        DrawingCanvas, IECDrawingSheet, primitives/, templates/
├── designer/        Assembly mate panels
├── 3d/              PVArrayViewer, IECEquipmentViewer
├── pdf-to-cad/      PdfCadViewport
└── (root)           Viewport3D, AIChatAssistantEnhanced, AIChatSidebar,
                     CommandPalette, CommandBar, StatusBar, SimulatorViewport,
                     CFDViewport, CFDAdvancedViewport, AssemblyViewport,
                     RendererViewport, KCLCodeEditor, …
```

---

## AI Pipeline

```
User prompt (text / image)
  │
  ▼
/api/ai/generate  ──► ai-reasoning-engine.ts
  │                    ├─ clarifying-questions.ts  (ambiguity resolution)
  │                    └─ cadCommandHandler.ts      (NL → CAD ops)
  │
  ▼
/api/generate-cad  ──► KCL / CSG geometry → cad-store
```

Model routing follows CLAUDE.md: complex tasks → `claude-opus-4-8`, default → `claude-sonnet-4-6`.

---

## Data Flow: Designer Page

```
designer/page.tsx
  ├─ Viewport3D            (Three.js canvas, cad-store subscriber)
  ├─ SketchToolbar / SketchOverlay
  ├─ FeatureTree / PropertyPanel
  ├─ RibbonToolbar
  ├─ AIChatAssistantEnhanced  (mode = "enhanced")
  ├─ AIChatSidebar            (mode = "basic")
  └─ AIToolPanelEnhanced      (per-tool AI assist)
```

---

## Known Tech Debt (filed as GitHub Issues)

| # | Item | Risk |
|---|------|------|
| - | `cad-store.ts` is 3,223 lines – split into feature slices | Medium |
| - | `Viewport3D.tsx` is 2,063 lines – extract sub-components | Medium |
| - | `react-icons` installed but never imported – remove | Low |
| - | `pvIECTestTemplates.ts` + `pvIECTestTemplates2.ts` artificially split – consolidate | Low |
| - | Major dep upgrades pending: framer-motion v12, R3F v9, Next.js 15 | High |

---

## Deployment

| Environment | Target |
|-------------|--------|
| Production | Vercel → `shilpasutra.vercel.app` |
| Database | Railway (PostgreSQL via Prisma) |
| CI | GitHub Actions (lint + type-check on PR) |

Merge strategy: `feature/*` → `develop` (PR) → `main` (Vercel production deploy).
