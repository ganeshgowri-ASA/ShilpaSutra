# ShilpaSutra — Living Roadmap

**Last updated**: 2026-06-14 (Sunday roadmap pass)  
**Branch baseline**: `main` @ b433de4 (2026-03-31)  
**Status key**: ✅ Complete · 🔶 Partial · ❌ Not started

---

## ⚠️ Blocker: PR Merge Backlog

> **No PR has been merged to `main` since 2026-03-31.** Over 20 draft PRs and 113 open issues have accumulated since May 2026. Vercel has 0 green production deployments from these branches. Until at least one PR lands on `main`, all automated cleanup work resets every week.

**Recommended human actions (in order):**

| Priority | Action | PR / Issue |
|----------|--------|-----------|
| P0 | Merge the most recent security PR (error-leak strips, HTTP headers) | #220 |
| P1 | Merge this PR (dead-code + ROADMAP) after reviewing | this PR |
| P2 | Close all earlier draft PRs targeting the same 3 dead files as "superseded by #220" | #162 #172 #173 #177 #179 #187 #193 #194 #201 #204 #207 #213 #219 |
| P3 | Review and merge or close the security advisories PR | #209 |

---

## Module 1 — Text/Multimodal to CAD Generation

| Sub-feature | Status | Key files |
|------------|--------|-----------|
| 1.1 NL prompt → 3D B-rep (parametric) | 🔶 | `api/generate-cad/route.ts`, `cad-operations.ts` |
| 1.2 Image/sketch upload → 3D model | 🔶 | `api/ai/generate/route.ts` (vision via OpenRouter) |
| 1.3 Multi-turn conversational design | ✅ | `AIChatAssistantEnhanced.tsx`, `ai-reasoning-engine.ts` |
| 1.4 Parametric code generation (KCL-like) | 🔶 | `AIToolPanelEnhanced.tsx` (inline KCL; no dedicated editor) |
| 1.5 Selection-aware context | ✅ | `cad-store.ts` selection, `AIToolPanelEnhanced.tsx` |
| 1.6 Design intent reasoning + constraint proposal | ✅ | `clarifying-questions.ts`, `ai-reasoning-engine.ts` |
| 1.7 Model analytics (mass, volume, CoM) | ✅ | `MassPropertiesDialog.tsx`, `cad-operations.ts` |
| 1.8 Export: STEP, STL, OBJ, glTF, FBX, PLY | 🔶 | `export-engine.ts`, `step-iges-export.ts` (STEP/STL/OBJ; glTF/FBX/PLY partial) |

---

## Module 2 — 3D CAD Viewer & Editor

| Sub-feature | Status | Key files |
|------------|--------|-----------|
| 2.1 Three.js/R3F viewport with orbit/pan/zoom | ✅ | `Viewport3D.tsx`, `NavigationCube.tsx` |
| 2.2 Sketch tools (lines, arcs, circles, splines, constraints) | ✅ | `SketchToolbar.tsx`, `sketch-engine.ts`, `ConstraintManager.tsx` |
| 2.3 3D ops: extrude, revolve, loft, sweep, fillet, chamfer, shell, boolean | ✅ | `cad-operations.ts`, `ExtrudeDialog.tsx`, `RevolveDialog.tsx` |
| 2.4 Assembly mode with component tree | 🔶 | `assembly/page.tsx`, `assembly-engine.ts`, `mate-solver.ts` (wired but incomplete) |
| 2.5 Measurement tools (distance, angle, radius) | ✅ | `MeasurementTool.tsx`, `measure/page.tsx` |
| 2.6 Section/cross-section views | 🔶 | ClipPlane exists in Viewport3D; UI toggle missing |
| 2.7 Material/texture assignment | ✅ | `AppearanceEditor.tsx`, `materials.ts`, `materials3D.ts` |
| 2.8 Undo/redo with full history | ✅ | `UndoHistoryPanel.tsx`, `cad-store.ts` history stack |

---

## Module 3 — CFD Simulation Engine

| Sub-feature | Status | Key files |
|------------|--------|-----------|
| 3.1 Mesh generation from CAD geometry | ✅ | `cfd-engine.ts`, `MeshQualityPanel.tsx` |
| 3.2 Boundary condition setup | ✅ | `cfd-boundary.ts`, `BoundarySetup` in simulator |
| 3.3 Solver selection (laminar, k-ε, k-ω SST) | ✅ | `cfd-turbulence.ts` |
| 3.4 Thermal simulation | ✅ | `ThermalBlockDiagram.tsx`, `structural-engine.ts` |
| 3.5 Post-processing: velocity/pressure/temperature contours | ✅ | `CFDAdvancedViewport.tsx`, `cfd-postprocess.ts` |
| 3.6 Streamline visualization | 🔶 | `cfd-wind-analysis.ts` (wind only; general streamlines missing) |
| 3.7 Force/drag/lift coefficients | 🔶 | `cfd-postprocess.ts` has lift/drag; no UI panel |
| 3.8 OpenFOAM backend (containerised API) | ❌ | Not started — solver is JS-only in-browser |
| 3.9 ML surrogate models for parametric sweeps | ❌ | Not started |

---

## Module 4 — Parts Library & Template System

| Sub-feature | Status | Key files |
|------------|--------|-----------|
| 4.1 Pre-built parametric components | ✅ | `library/page.tsx` (IEC PV equipment catalog) |
| 4.2 FreeCAD library integration (.fcstd, .stp) | 🔶 | `import-export/page.tsx` (STEP import partial) |
| 4.3 Community upload/share | ❌ | Not started |
| 4.4 Template gallery with search | ✅ | `templates/page.tsx`, `pvIECTestTemplates.ts` |
| 4.5 Parametric customization sliders | ✅ | `ParametricSliders.tsx`, `ParametricPanel.tsx` |

---

## Module 5 — AI/ML Pipeline

| Sub-feature | Status | Key files |
|------------|--------|-----------|
| 5.1 LLM integration (Claude, OpenAI, Gemini) via OpenRouter | ✅ | `api/ai/generate/route.ts`, `ai-reasoning-engine.ts` |
| 5.2 Vision model for image/sketch → CAD | 🔶 | `pdf-to-cad/page.tsx`, `PdfCadViewport.tsx` (PDF only; general vision partial) |
| 5.3 RAG pipeline for CAD knowledge retrieval | ❌ | Not started — no vector store wired |
| 5.4 Fine-tuning pipeline (HuggingFace CADLLM) | ❌ | Not started |
| 5.5 Model routing: complex → Opus, simple → Sonnet | 🔶 | `ThinkingModeSelector.tsx` (manual only; no automatic routing) |
| 5.6 Feedback loop: user edits improve suggestions | ❌ | Not started |

---

## Module 6 — Collaboration & Export

| Sub-feature | Status | Key files |
|------------|--------|-----------|
| 6.1 Real-time collaboration (multiplayer CAD) | ❌ | Not started — no WebSocket/CRDT layer |
| 6.2 Version control (Git-like design branching) | 🔶 | `versionControl.ts`, `drawingVersionControl.ts` (local snapshots only) |
| 6.3 PDF/2D drawing export with GD&T | 🔶 | `pdfExportPro.ts` exists but **zero callers** (see #issue) |
| 6.4 Share via link (public/private) | ❌ | Not started |
| 6.5 Embed widget for external sites | ❌ | Not started |

---

## Module 7 — UI/UX Shell

| Sub-feature | Status | Key files |
|------------|--------|-----------|
| 7.1 Next.js + Tailwind responsive shell | ✅ | `layout.tsx`, `globals.css` |
| 7.2 Ribbon toolbar | ✅ | `RibbonToolbar.tsx`, `cad/DesignerCommandBar.tsx` |
| 7.3 Dark/light mode toggle | ✅ | `settings-store.ts`, `settings/page.tsx` |
| 7.4 Command palette (Ctrl+K) | ✅ | `CommandPalette.tsx`, `CommandBar.tsx` |
| 7.5 AI chat sidebar (Zookeeper-style) | ✅ | `AIChatAssistantEnhanced.tsx`, `AIChatSidebar.tsx` |
| 7.6 Property panel for selected geometry | ✅ | `PropertyPanel.tsx`, `EntityPropertiesPanel.tsx` |
| 7.7 Feature tree / model browser | ✅ | `FeatureTree.tsx`, `ProjectExplorer.tsx` |
| 7.8 Console/log viewer | 🔶 | `StatusBar.tsx` (status only; no full console) |

---

## Feature Completion Summary

| Module | ✅ Complete | 🔶 Partial | ❌ Not started |
|--------|------------|------------|---------------|
| 1. Text-to-CAD | 5 | 3 | 0 |
| 2. 3D Viewer | 6 | 2 | 0 |
| 3. CFD Engine | 5 | 2 | 2 |
| 4. Parts Library | 3 | 1 | 1 |
| 5. AI/ML Pipeline | 1 | 2 | 3 |
| 6. Collaboration | 0 | 2 | 3 |
| 7. UI/UX Shell | 6 | 1 | 0 |
| **Total** | **26/48** | **13/48** | **9/48** |

---

## Tech Debt Backlog (top items)

| Issue | Description | Effort | Risk |
|-------|-------------|--------|------|
| #218 | Merge dead-code PRs to main — same 3 files deleted every week | XS | None |
| #203 | Decompose `cad-store.ts` monolith (3 223 lines / 118 KB) | L | High |
| #210 | Extract shared vec3 math utilities (3-way duplication) | S | Low |
| #216 | Delete or wire up two orphaned `VersionHistoryPanel` components | S | Low |
| #209 | Bump `@anthropic-ai/sdk` to ≥0.101.0 (GHSA-5474, GHSA-p7fg) | XS | Low |
| #215 | Remove entire `src/components/cfd/` directory (4 files, ~972 lines, zero callers) | S | Low |
| #217 | Verify & remove `/api/generate-cad` if confirmed dead | XS | Low |
| #205 | Consolidate AIChatSidebar (basic) into AIChatAssistantEnhanced | M | Medium |

---

## Priority Stack (human action required)

```
P0 — Unblock Vercel: merge ≥1 PR into main (start with #220)
P1 — Security: API auth + rate limiting (#208, #222)
P2 — SDK security: bump @anthropic-ai/sdk (#209)
P3 — Scale: decompose cad-store.ts (#203)
P4 — Product: OpenFOAM backend (Module 3.8) — biggest missing capability
P5 — Product: RAG pipeline (Module 5.3)
P6 — Product: Real-time collaboration (Module 6.1)
P7 — Cleanup: vec3 consolidation (#210), cfd/ dir removal (#215)
```

---

## Next Sprint Candidates (automated sessions)

- Wire `pdfExportPro.ts` into at least one export button (Module 6.3, ~2 h)
- Add section-view UI toggle for existing ClipPlane in Viewport3D (Module 2.6, ~1 h)
- Auto model-routing: use `ai-reasoning-engine.ts` complexity score to select Opus vs Sonnet (Module 5.5, ~1 h)
- Wire `drawings/VersionHistoryPanel.tsx` into DrawingCanvas toolbar or delete it (#216)
