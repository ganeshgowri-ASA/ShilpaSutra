# ShilpaSutra (शिल्पसूत्र) - Project Context for Claude Code IDE

## Project Overview
ShilpaSutra ("The Formulas of Craftsmanship") is an AI-powered Text/Multimodal to CAD & CFD platform with a conversational design agent, parametric modeling, and simulation capabilities.

## Tech Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **3D Engine**: Three.js / React Three Fiber (R3F) for WebGL viewport
- **CAD Kernel**: OpenCASCADE.js (WASM) for B-rep geometry
- **CFD**: OpenFOAM (containerized API) + ML surrogate models
- **AI/LLM**: Claude API (primary), OpenRouter (multi-model routing)
- **Database**: PostgreSQL via Prisma ORM (Railway)
- **Auth**: NextAuth.js with role-based access
- **Deployment**: Vercel (frontend) + Railway (API/DB)
- **State**: Zustand for global state management

## Directory Structure
```
shilpasutra/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout with sidebar
│   │   ├── page.tsx            # Landing/dashboard
│   │   ├── designer/           # Main CAD workspace
│   │   │   └── page.tsx
│   │   ├── simulator/          # CFD simulation workspace
│   │   │   └── page.tsx
│   │   ├── library/            # Parts library browser
│   │   │   └── page.tsx
│   │   ├── api/                # API routes
│   │   │   ├── ai/             # LLM endpoints
│   │   │   ├── cad/            # CAD operations
│   │   │   ├── cfd/            # CFD simulation
│   │   │   └── auth/           # Auth endpoints
│   │   └── settings/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── cad/                # CAD-specific components
│   │   │   ├── Viewport3D.tsx  # Three.js 3D viewport
│   │   │   ├── SketchTools.tsx # 2D sketch toolbar
│   │   │   ├── ModelTree.tsx   # Feature tree sidebar
│   │   │   ├── PropertyPanel.tsx
│   │   │   └── ExportDialog.tsx
│   │   ├── ai/                 # AI components
│   │   │   ├── ChatSidebar.tsx # Zookeeper-style AI chat
│   │   │   ├── PromptInput.tsx
│   │   │   └── ModelViewer.tsx
│   │   ├── cfd/                # CFD components
│   │   │   ├── MeshViewer.tsx
│   │   │   ├── BoundarySetup.tsx
│   │   │   ├── SolverPanel.tsx
│   │   │   └── ResultsViewer.tsx
│   │   ├── library/            # Parts library
│   │   │   ├── PartCard.tsx
│   │   │   ├── PartBrowser.tsx
│   │   │   └── ParametricSliders.tsx
│   │   └── layout/             # Layout components
│   │       ├── Sidebar.tsx
│   │       ├── RibbonToolbar.tsx
│   │       ├── CommandPalette.tsx
│   │       └── StatusBar.tsx
│   ├── lib/                    # Utilities
│   │   ├── cad-engine.ts       # OpenCASCADE.js wrapper
│   │   ├── ai-client.ts        # LLM API client
│   │   ├── cfd-client.ts       # CFD API client
│   │   ├── export.ts           # STEP/STL/OBJ export
│   │   └── prisma.ts           # DB client
│   ├── stores/                 # Zustand stores
│   │   ├── cad-store.ts        # CAD state
│   │   ├── ai-store.ts         # Chat/AI state
│   │   └── cfd-store.ts        # CFD state
│   └── types/                  # TypeScript types
│       ├── cad.ts
│       ├── cfd.ts
│       └── ai.ts
├── prisma/
│   └── schema.prisma           # Database schema
├── public/
│   └── models/                 # Sample 3D models
├── CLAUDE.md                   # This file
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── vercel.json
```

## Module PRD (Nano-Granular)

### Module 1: Text/Multimodal to CAD Generation Engine
- 1.1 Natural language prompt → 3D B-rep model (parametric, editable)
- 1.2 Image/sketch upload → 3D model reconstruction
- 1.3 Multi-turn conversational design (incremental geometry)
- 1.4 Parametric code generation (KCL-like)
- 1.5 Selection-aware context (user clicks edge/face → agent understands)
- 1.6 Design intent reasoning and constraint proposal
- 1.7 Model analytics: mass, volume, surface area, center of mass
- 1.8 Export: STEP, STL, OBJ, glTF, FBX, PLY

### Module 2: 3D CAD Viewer & Editor (Web-based)
- 2.1 Three.js/R3F 3D viewport with orbit, pan, zoom
- 2.2 Point-and-click sketch tools (lines, arcs, circles, splines, constraints)
- 2.3 3D operations: extrude, revolve, loft, sweep, fillet, chamfer, shell, boolean
- 2.4 Assembly mode with component tree
- 2.5 Measurement tools (distance, angle, radius)
- 2.6 Section/cross-section views
- 2.7 Material/texture assignment
- 2.8 Undo/redo with full history

### Module 3: CFD Simulation Engine
- 3.1 Mesh generation from CAD geometry (auto-mesh)
- 3.2 Boundary condition setup (inlet, outlet, wall, symmetry)
- 3.3 Solver selection (laminar, turbulent k-epsilon, k-omega SST)
- 3.4 Thermal simulation support
- 3.5 Post-processing: velocity/pressure/temperature contours
- 3.6 Streamline visualization
- 3.7 Force/drag/lift coefficient calculation
- 3.8 OpenFOAM backend integration (containerized API)
- 3.9 ML surrogate models for rapid parametric sweeps

### Module 4: Parts Library & Template System
- 4.1 Pre-built parametric components (gears, brackets, enclosures, fasteners)
- 4.2 FreeCAD library integration (.fcstd, .stp imports)
- 4.3 Community upload/share mechanism
- 4.4 Template gallery with thumbnails and search
- 4.5 Parametric customization sliders

### Module 5: AI/ML Pipeline
- 5.1 LLM integration (Claude, OpenAI, Gemini, DeepSeek) via OpenRouter
- 5.2 Vision model for image/sketch → CAD (VLM)
- 5.3 RAG pipeline for CAD knowledge retrieval
- 5.4 Fine-tuning pipeline using HuggingFace datasets (CADLLM)
- 5.5 Model routing: complex → Opus, simple → Sonnet
- 5.6 Feedback loop: user edits improve suggestions

### Module 6: Collaboration & Export
- 6.1 Real-time collaboration (multiplayer CAD)
- 6.2 Version control with Git-like branching for designs
- 6.3 PDF/2D drawing export with GD&T annotations
- 6.4 Share via link (public/private)
- 6.5 Embed widget for external sites

### Module 7: UI/UX Shell
- 7.1 Next.js + Tailwind responsive shell
- 7.2 Ribbon toolbar (Home, Design, Analysis, AI, Export, Settings)
- 7.3 Dark/light mode toggle
- 7.4 Command palette (Ctrl+K)
- 7.5 AI chat sidebar (Zookeeper-style)
- 7.6 Property panel for selected geometry
- 7.7 Feature tree / model browser
- 7.8 Console/log viewer

## Claude Code IDE Session Strategy

### Batch 1 - Critical Foundation (Opus, Parallel)
| Session | Branch | Scope |
|---------|--------|-------|
| S1 | feat/3d-viewer-core | Module 2.1-2.3: Three.js viewport, sketch tools, 3D ops |
| S2 | feat/ai-text-to-cad | Module 1.1-1.3, 5.1: Text → 3D pipeline, LLM integration |
| S3 | feat/cfd-engine | Module 3.1-3.5: Mesh gen, boundary conditions, solver |
| S4 | feat/ui-shell | Module 7.1-7.5: Next.js shell, toolbar, AI sidebar, dark mode |

### Batch 2 - Enhancement (Sonnet, Parallel)
| Session | Branch | Scope |
|---------|--------|-------|
| S5 | feat/parts-library | Module 4.1-4.5: Component library, FreeCAD import |
| S6 | feat/image-to-cad | Module 1.2, 5.2: Image/sketch → CAD reconstruction |
| S7 | feat/cfd-advanced | Module 3.6-3.9: Streamlines, coefficients, ML surrogates |
| S8 | feat/export-collab | Module 6.1-6.5: Export, sharing, version control |

### Batch 3 - Polish & QA (Sonnet)
| Session | Branch | Scope |
|---------|--------|-------|
| S9 | feat/rag-pipeline | Module 5.3-5.4: RAG + fine-tuning |
| S10 | feat/ui-polish | Module 7.6-7.8: Property panel, feature tree, console |
| S11 | fix/qa-testing | End-to-end QA, edge cases |
| S12 | docs/notion-sync | Documentation, changelog |

## Key References
- Zoo Design Studio: https://zoo.dev
- FreeCAD: https://github.com/FreeCAD/FreeCAD
- CADAM (Text-to-CAD): https://github.com/Adam-CAD/CADAM
- ScadLM (Agentic CAD): https://github.com/KrishKrosh/ScadLM
- GenCFD (ETH Zurich): https://github.com/camlab-ethz/GenCFD
- CADLLM Dataset: https://huggingface.co/datasets/lanlanguai/CADLLM
- OpenCASCADE.js: https://github.com/nicholasgasior/opencascade.js

## Deployment
- Vercel: shilpasutra.vercel.app
- Railway: PostgreSQL database
- GitHub: ganeshgowri-ASA/ShilpaSutra

## Merge Strategy
1. Each session creates PR from feature branch → develop
2. After QA, develop → main (triggers Vercel production deploy)
3. Rollback: git revert on main if issues found
