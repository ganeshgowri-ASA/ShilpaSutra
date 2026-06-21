# ShilpaSutra — Roadmap & Status (2026-06-21)

> **Sunday roadmap pass.** Reflects codebase state on `main` as of 2026-06-21.

---

## Critical Blockers (Resolve First)

| # | Blocker | Impact |
|---|---------|--------|
| 1 | **30 draft PRs open, 0 merged to `main`** | Production site on Vercel has not received any of the 6+ weeks of cleanup, security, or enhancement work. Every weekly audit session creates a new PR on a new branch; PRs accumulate but never land. |
| 2 | **Vercel production deploy stale** | All 20 most-recent Vercel deployments are `CANCELED` (branch preview builds). The live site at shilpasutra.vercel.app is frozen at a commit before PR #158. |
| 3 | **9 confirmed-dead files still in `main`** | The same files are flagged, deleted in a branch, PR created, and then the PR is never merged — so they reappear the following week. |

**Action required:** Merge or close the PR backlog before opening new PRs. Start with the smallest-risk ones: security hardening (#162, #207), dead-file removals (#193, #194), and unit-test additions (#179, #201, #204).

---

## Module Implementation Status

### Module 1 — Text/Multimodal → CAD Generation

| Sub-feature | Status | Key files |
|-------------|--------|-----------|
| 1.1 NL prompt → 3D B-rep | ✅ | `api/generate-cad/route.ts`, `text-to-cad/page.tsx` |
| 1.2 Image/sketch → 3D reconstruction | 🔶 Partial | `pdf-to-cad/page.tsx` (PDF only; no sketch reconstruction) |
| 1.3 Multi-turn conversational design | ✅ | `AIChatAssistantEnhanced.tsx`, `AIChatSidebar.tsx` |
| 1.4 Parametric code (KCL-like) | ✅ | `ParametricPanel.tsx`, `ParametricSliders.tsx` |
| 1.5 Selection-aware context | 🔶 Partial | Basic selection state; not forwarded to AI system prompt |
| 1.6 Design intent / constraint proposal | 🔶 Partial | `clarifying-questions.ts` wired to text-to-cad and AIToolPanelEnhanced |
| 1.7 Model analytics (mass, volume, CoM) | 🔶 Partial | `MassPropertiesDialog.tsx` exists; not wired to AI output |
| 1.8 Export STEP/STL/OBJ/glTF/FBX/PLY | ✅ | `export-engine.ts`, `step-iges-export.ts`, `ExportPanel.tsx` |

### Module 2 — 3D CAD Viewer & Editor

| Sub-feature | Status | Key files |
|-------------|--------|-----------|
| 2.1 Three.js viewport (orbit/pan/zoom) | ✅ | `Viewport3D.tsx`, `ViewportControls.tsx`, `NavigationCube.tsx` |
| 2.2 Sketch tools (lines, arcs, circles, splines, constraints) | ✅ | `SketchToolbar.tsx`, `SketchOverlay.tsx`, `sketch-engine.ts` |
| 2.3 3D ops (extrude/revolve/fillet/boolean) | ✅ | `cad-operations.ts`, `ExtrudeDialog.tsx`, `RevolveDialog.tsx` |
| 2.4 Assembly mode with component tree | 🔶 Partial | `assembly/page.tsx`, `mate-solver.ts`; mate solving incomplete |
| 2.5 Measurement tools | ✅ | `MeasurementTool.tsx`, `DimensionTools.tsx` |
| 2.6 Section/cross-section views | ❌ | Button exists in toolbar; no geometry clipping implemented |
| 2.7 Material/texture assignment | ✅ | `AppearanceEditor.tsx`, `materials.ts` |
| 2.8 Undo/redo with full history | ✅ | `UndoHistoryPanel.tsx`, `HistoryTimeline.tsx` |

### Module 3 — CFD Simulation Engine

| Sub-feature | Status | Key files |
|-------------|--------|-----------|
| 3.1 Auto-mesh from CAD | 🔶 Partial | `cfd-engine.ts` defines mesh config; no real mesher |
| 3.2 Boundary condition setup | ✅ | `BoundarySetup` (cfd-advanced), `cfd-boundary.ts` |
| 3.3 Solver selection (laminar/k-ε/k-ω) | ✅ | `cfd-turbulence.ts` (6 models), `SolverPanel` |
| 3.4 Thermal simulation | 🔶 Partial | `structural-engine.ts` has thermal; CFD thermal BC incomplete |
| 3.5 Post-processing contours | ✅ | `cfd-postprocess.ts`, `CFDAdvancedViewport.tsx` |
| 3.6 Streamline visualization | ✅ | `cfd-postprocess.ts` (particle tracing) |
| 3.7 Force/drag/lift coefficients | ✅ | `cfd-postprocess.ts` |
| 3.8 OpenFOAM backend (containerized) | ❌ | `api/simulate/route.ts` returns mock data only |
| 3.9 ML surrogate models | ❌ | Not started |

### Module 4 — Parts Library & Templates

| Sub-feature | Status | Key files |
|-------------|--------|-----------|
| 4.1 Pre-built parametric components | ✅ | `library/page.tsx`, `ParametricSliders.tsx` |
| 4.2 FreeCAD library integration | ❌ | `import-export/page.tsx` exists; no `.fcstd` parser |
| 4.3 Community upload/share | 🔶 Partial | `model-hub/page.tsx` (UI scaffold); no backend storage |
| 4.4 Template gallery + thumbnails | ✅ | `templates/page.tsx`, `TemplateParameterDialog.tsx` |
| 4.5 Parametric customization sliders | ✅ | `ParametricSliders.tsx` |

### Module 5 — AI/ML Pipeline

| Sub-feature | Status | Key files |
|-------------|--------|-----------|
| 5.1 LLM integration (Claude + OpenRouter) | ✅ | `@anthropic-ai/sdk`, `api/ai/generate/route.ts` |
| 5.2 Vision model VLM (image → CAD) | 🔶 Partial | `api/ai/generate` accepts base64; `pdf-to-cad/page.tsx` |
| 5.3 RAG pipeline (CAD knowledge retrieval) | ❌ | Not started |
| 5.4 Fine-tuning pipeline (HuggingFace) | ❌ | Not started |
| 5.5 Model routing (complex → Opus, simple → Sonnet) | ❌ | Model IDs are hardcoded in each API route |
| 5.6 Feedback loop (user edits → improvements) | ❌ | Not started |

### Module 6 — Collaboration & Export

| Sub-feature | Status | Key files |
|-------------|--------|-----------|
| 6.1 Real-time collaboration | ❌ | Not started |
| 6.2 Version control (Git-like branching) | 🔶 Partial | `versionControl.ts`, `drawingVersionControl.ts` (local only) |
| 6.3 PDF/2D drawing export with GD&T | ✅ | `pdfExportPro.ts`, `bom-generator.ts`, `report-generator.ts` |
| 6.4 Share via link (public/private) | ❌ | Not started |
| 6.5 Embed widget | ❌ | Not started |

### Module 7 — UI/UX Shell

| Sub-feature | Status | Key files |
|-------------|--------|-----------|
| 7.1 Next.js + Tailwind responsive shell | ✅ | `layout.tsx`, `globals.css`, `tailwind.config.ts` |
| 7.2 Ribbon toolbar (7 tabs) | ✅ | `RibbonToolbar.tsx` |
| 7.3 Dark/light mode toggle | 🔶 Partial | Tailwind dark class present; toggle not surfaced in UI |
| 7.4 Command palette (Ctrl+K) | ✅ | `CommandPalette.tsx` |
| 7.5 AI chat sidebar (Zookeeper-style) | ✅ | `AIChatAssistantEnhanced.tsx` (enhanced), `AIChatSidebar.tsx` (basic) |
| 7.6 Property panel for selected geometry | ✅ | `PropertyPanel.tsx`, `EntityPropertiesPanel.tsx` |
| 7.7 Feature tree / model browser | ✅ | `FeatureTree.tsx`, `ComponentsPanel.tsx` |
| 7.8 Console/log viewer | ❌ | Not started |

---

## Summary Counts

| Status | Count | % |
|--------|-------|---|
| ✅ Complete | 29 | 60% |
| 🔶 Partial | 13 | 27% |
| ❌ Not started | 6 | 13% |

---

## Tech Debt Register

### T1 — Confirmed Dead Files (still in `main` as of 2026-06-21)

These files have zero import references anywhere in `src/`. They have been removed in branch PRs multiple times but those PRs were never merged.

| File | Lines | Dead Since |
|------|-------|-----------|
| `src/lib/drawing-engine.ts` | 757 | 2026-05-05 |
| `src/components/AIChatAssistant.tsx` | 241 | 2026-05-05 |
| `src/components/cad/AIToolPanel.tsx` | 659 | 2026-05-05 |
| `src/lib/csg-engine.ts` | 644 | 2026-05-12 |
| `src/lib/cadCommandHandler.ts` | 160 | 2026-05-12 |
| `src/lib/cfd-piso.ts` | 506 | 2026-05-19 |
| `src/lib/cfdSolver.worker.ts` | 574 | 2026-05-19 |
| `src/components/CFDViewport.tsx` | ~300 | 2026-05-19 |
| `src/lib/pvIECTestTemplates2.ts` | 222 | (split with part 1; merge pending) |

> **Note:** `drawing-engine.ts`, `AIChatAssistant.tsx`, `AIToolPanel.tsx`, and `csg-engine.ts` are deleted in this PR.

### T2 — Unused Dependency

- `react-icons` (^5.3.0): zero import sites in `src/`. All icons come from `lucide-react`. Safe to remove from `package.json`.

### T3 — Dead Functions in Live Files

| File | Dead exports |
|------|-------------|
| `src/lib/foundation-engine.ts` | `bearingCapacityIS6403()`, `designPileIS2911()`, `designGroundScrew()`, `designBallast()` — 4 of 5 exports are unused |
| `src/lib/solar-templates.ts` | `optimalTiltDeg()`, `rowPitchForNoShading()`, `calcGCR()`, `getTemplatesByCategory()`, `getTemplateById()` — 5 of 10 exports unused |
| `src/lib/materials3D.ts` | `createHighlightMaterial()`, `disposeIECMaterials()` — 2 of 3 exports unused |
| `src/lib/pvGeometryRenderer.ts` | `disposePVMaterials()`, `primToMesh()`, `getPVArrayBounds()` — 3 of ~7 exports unused |

### T4 — Orphaned Pages (no sidebar link)

These pages exist and build but are unreachable from the UI:

| Page | Lines | Notes |
|------|-------|-------|
| `src/app/wizard/page.tsx` | ~17K | Design wizard; may overlap with text-to-cad flow |
| `src/app/renderer/page.tsx` | ~28K | May overlap with `/ai-renderer` sidebar link |
| `src/app/measure/page.tsx` | ~29K | May overlap with `/measure` sidebar link |

### T5 — Duplicate Version Control Logic

`src/lib/versionControl.ts` (drawing-domain) and `src/lib/drawingVersionControl.ts` (CFD-domain) duplicate core logic: `generateId()`, FIFO version limits, localStorage read/write. Could be merged into one parameterised module.

---

## Next Sprint Priorities

### Immediate (unblock production)
1. **Merge or close the 30 open draft PRs** — pick the 3 smallest-risk ones per week and get them to `main`
2. **Verify Vercel production deploy** after first merge lands

### Sprint 1 (highest product impact)
1. **Module 3.8** — Wire `api/simulate` to a real OpenFOAM container (or a lightweight Python CFD microservice)
2. **Module 5.5** — Complexity-based model routing: route simple prompts to `claude-haiku-4-5`, complex ones to `claude-sonnet-4-6`
3. **Module 1.5** — Forward selected face/edge/vertex context to AI system prompt so the agent can reason about geometry selections

### Sprint 2
1. **Module 5.3** — RAG pipeline: embed CAD knowledge base, retrieve on each prompt
2. **Module 2.6** — Functional section/cross-section views (three-plane clip)
3. **Module 6.1** — Real-time collaboration foundation (WebSocket or CRDT-based)

### Sprint 3
1. **Module 6.4** — Share via link (public/private permalinks)
2. **Module 4.2** — FreeCAD `.fcstd` / STEP import pipeline
3. **Module 7.3** — Complete dark/light mode toggle
4. **Module 7.8** — Console/log viewer (dev-mode diagnostics)

---

## References

- `docs/PRD-v3-SolidWorks-Audit.md` — detailed feature gap list vs. SolidWorks 2026 / COMSOL
- `CLAUDE.md` — original PRD and session strategy
- Active PR list: github.com/ganeshgowri-ASA/ShilpaSutra/pulls (30 open drafts as of 2026-06-21)
