# ShilpaSutra — Module Implementation Status

> Last audited: 2026-05-31 (Sunday roadmap pass)  
> Legend: ✅ complete · 🔶 partial · ❌ not started

---

## Module 1 — Text / Multimodal → CAD Generation

| # | Feature | Status | Key files |
|---|---------|--------|-----------|
| 1.1 | Natural language → 3D B-rep | ✅ | `app/text-to-cad/page.tsx`, `api/generate-cad/route.ts` |
| 1.2 | Image/sketch → 3D reconstruction | ✅ | `app/pdf-to-cad/page.tsx`, `components/pdf-to-cad/PdfCadViewport.tsx` |
| 1.3 | Multi-turn conversational design | ✅ | `components/AIChatAssistantEnhanced.tsx`, `components/AIChatSidebar.tsx` |
| 1.4 | Parametric KCL code generation | 🔶 | `lib/clarifying-questions.ts`; KCLCodeEditor removed (dead) |
| 1.5 | Selection-aware context | ✅ | `components/cad/EdgeSelector.tsx`, `SelectionFilter.tsx` |
| 1.6 | Design intent reasoning | ✅ | `lib/ai-reasoning-engine.ts` |
| 1.7 | Model analytics (mass, volume…) | ✅ | `components/cad/MassPropertiesDialog.tsx` |
| 1.8 | Export: STEP, STL, OBJ, glTF… | ✅ | `lib/step-iges-export.ts`, `lib/export-engine.ts`, `components/cad/ExportPanel.tsx` |

---

## Module 2 — 3D CAD Viewer & Editor

| # | Feature | Status | Key files |
|---|---------|--------|-----------|
| 2.1 | Three.js / R3F viewport | ✅ | `components/Viewport3D.tsx`, `components/SimulatorViewport.tsx` |
| 2.2 | Sketch tools | ✅ | `components/cad/SketchToolbar.tsx`, `SketchOverlay.tsx`, `SketchGrid.tsx` |
| 2.3 | 3D ops (extrude, revolve, fillet…) | ✅ | `ExtrudeDialog`, `RevolveDialog`, `HoleWizardDialog`, `ShellDraftPanel`, `PatternDialog` |
| 2.4 | Assembly mode | ✅ | `app/assembly/page.tsx`, `app/assembly-advanced/page.tsx` |
| 2.5 | Measurement tools | ✅ | `app/measure/page.tsx`, `components/cad/MeasurementTool.tsx` |
| 2.6 | Section / cross-section views | 🔶 | `SectionIndicator` in drawings only; not yet in 3D viewport |
| 2.7 | Material / texture assignment | ✅ | `components/cad/AppearanceEditor.tsx`, `lib/materials.ts`, `lib/materials3D.ts` |
| 2.8 | Undo/redo with full history | ✅ | `components/cad/UndoHistoryPanel.tsx`, `HistoryTimeline.tsx` |

---

## Module 3 — CFD Simulation Engine

| # | Feature | Status | Key files |
|---|---------|--------|-----------|
| 3.1 | Mesh generation from CAD | ✅ | `lib/cfd-engine.ts` |
| 3.2 | Boundary condition setup | ✅ | `lib/cfd-boundary.ts` |
| 3.3 | Solver (laminar, k-ε, k-ω SST) | ✅ | `lib/cfd-turbulence.ts`, `lib/cfd-engine.ts` |
| 3.4 | Thermal simulation | 🔶 | `lib/cfd-wind-analysis.ts`; thermal BCs not fully wired |
| 3.5 | Post-processing contours | 🔶 | `lib/cfd-postprocess.ts` exists but has zero consumers |
| 3.6 | Streamline visualization | 🔶 | Logic in `cfd-engine.ts`; no active UI renderer |
| 3.7 | Force / drag / lift coefficients | 🔶 | Partial in `cfd-engine.ts` |
| 3.8 | OpenFOAM backend (containerised) | ❌ | Not started |
| 3.9 | ML surrogate models | ❌ | Not started |

---

## Module 4 — Parts Library & Template System

| # | Feature | Status | Key files |
|---|---------|--------|-----------|
| 4.1 | Pre-built parametric components | ✅ | `app/library/page.tsx`, `components/cad/PVTestingTemplatePanel.tsx` |
| 4.2 | FreeCAD library integration | ❌ | Not started |
| 4.3 | Community upload / share | ❌ | Not started |
| 4.4 | Template gallery | ✅ | `app/templates/page.tsx`, `components/TemplateParameterDialog.tsx` |
| 4.5 | Parametric customisation sliders | ✅ | `components/cad/ParametricSliders.tsx`, `ParametricPanel.tsx` |

---

## Module 5 — AI / ML Pipeline

| # | Feature | Status | Key files |
|---|---------|--------|-----------|
| 5.1 | Multi-model LLM (Claude, OpenRouter) | ✅ | `api/ai/generate/route.ts`, `api/generate-cad/route.ts` |
| 5.2 | Vision model (image → CAD) | 🔶 | Base64 image forwarding in `api/ai/generate`; no dedicated VLM pipeline |
| 5.3 | RAG pipeline for CAD knowledge | ❌ | `app/model-hub/page.tsx` has placeholder UI only |
| 5.4 | Fine-tuning pipeline (HuggingFace) | ❌ | `app/model-hub/page.tsx` has placeholder UI only |
| 5.5 | Model routing (complex→Opus, simple→Sonnet) | 🔶 | Static Sonnet in both routes; no complexity-based routing |
| 5.6 | Feedback loop (user edits → suggestions) | ❌ | Not started |

---

## Module 6 — Collaboration & Export

| # | Feature | Status | Key files |
|---|---------|--------|-----------|
| 6.1 | Real-time collaboration (multiplayer) | ❌ | Not started; no WebSocket / CRDT layer |
| 6.2 | Version control (Git-like branching) | 🔶 | Local-only via `lib/versionControl.ts` + `drawingVersionControl.ts` |
| 6.3 | PDF / 2D drawing export with GD&T | ✅ | `lib/pdfExportPro.ts`, `components/cad/ReportGenerator.tsx` |
| 6.4 | Share via link (public/private) | ❌ | Not started |
| 6.5 | Embed widget | ❌ | Not started |

---

## Module 7 — UI/UX Shell

| # | Feature | Status | Key files |
|---|---------|--------|-----------|
| 7.1 | Next.js 14 + Tailwind shell | ✅ | `app/layout.tsx`, `app/globals.css` |
| 7.2 | Ribbon toolbar | ✅ | `components/cad/RibbonToolbar.tsx` |
| 7.3 | Dark / light mode toggle | ✅ | `stores/settings-store.ts` (`theme: dark/light/system`) |
| 7.4 | Command palette (Ctrl+K) | ✅ | `components/CommandPalette.tsx`, `CommandBar.tsx` |
| 7.5 | AI chat sidebar | ✅ | `components/AIChatAssistantEnhanced.tsx`, `AIChatSidebar.tsx` |
| 7.6 | Property panel | ✅ | `components/cad/PropertyPanel.tsx`, `EntityPropertiesPanel.tsx` |
| 7.7 | Feature tree / model browser | ✅ | `components/cad/FeatureTree.tsx` |
| 7.8 | Console / log viewer | 🔶 | `components/StatusBar.tsx`; no dedicated log viewer |

---

## Summary

| Status | Modules | Count |
|--------|---------|-------|
| ✅ complete | 1.1-1.3, 1.5-1.8, 2.1-2.5, 2.7-2.8, 3.1-3.3, 4.1, 4.4-4.5, 5.1, 6.3, 7.1-7.7 | ~29 |
| 🔶 partial | 1.4, 2.6, 3.4-3.7, 5.2, 5.5, 6.2, 7.8 | ~9 |
| ❌ not started | 3.8-3.9, 4.2-4.3, 5.3-5.4, 5.6, 6.1, 6.4-6.5 | ~10 |

### Priority gaps for next sprints
1. **Module 3.8** — OpenFOAM containerised backend (blocks production CFD)
2. **Module 5.3** — RAG pipeline (model-hub UI exists; needs vector store + retrieval)
3. **Module 6.1** — Real-time collaboration (no WebSocket layer yet)
4. **Module 5.5** — Complexity-based model routing (static Sonnet; Opus reserved for complex tasks per PRD)
5. **Module 3.9** — ML surrogates for parametric sweeps

### Tech debt
- 17 confirmed-dead source files remain in `main` (tracked across 30 open draft PRs — see issue).
- `package.json` lists `framer-motion`, `react-icons`, `html2canvas`, `three-bvh-csg` with zero import sites.
- `lib/cfd-postprocess.ts` and `lib/cfdSolver.worker.ts` exist but have no consumers; wire or remove.
- Two duplicate version-control libs (`versionControl.ts` + `drawingVersionControl.ts`); consolidate.
