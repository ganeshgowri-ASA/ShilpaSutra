# Dead-code audit (2026-11-06)

Method: static import graph over `src/` (static, dynamic `import()`, `require`, `@/` alias), excluding Next entry files (`page|layout|route|...`) and tests. Cross-checked by repo-wide basename grep.

## Removed in this PR (0 references anywhere)
- `components/KCLCodeEditor.tsx`, `components/ProjectExplorer.tsx`
- `components/cad/MeshQualityPanel.tsx`
- `components/drawings/DrawingCanvas.tsx`
- `components/3d/PVArrayViewer.tsx`, `components/3d/IECEquipmentViewer.tsx`

## Deferred (tracked in a GitHub issue) — likely planned features, need owner decision
Engines with no importers: `lib/assembly-engine.ts`, `cad-operations.ts`, `cadCommandHandler.ts`, `cfd-piso.ts`, `cfd-postprocess.ts`, `cfdSolver.worker.ts`, `csg-engine.ts`, `drawing-engine.ts`, `fea-engine.ts`.
Components referenced only by name elsewhere: `AIChatAssistant`, `cad/AIToolPanel`, `drawings/VersionHistoryPanel`, `layout/Sidebar` (re-export shim).
Barrel files with no importers: `components/{cfd,fea,fem,designer/assembly}/index.ts`.

## Dependencies / assets (no node_modules in audit env, so unverified by depcheck)
Candidates to verify with `npx depcheck`: `file-saver`, `html2canvas`, `react-icons`, `three-bvh-csg` (only used by the unused csg-engine?), `@radix-ui/*` (no `components/ui` dir exists). No large binary assets in repo (largest tracked file is package-lock.json).
