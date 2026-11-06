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

## Dependencies (grep of `src/` imports; no node_modules in audit env, so not depcheck-verified)
No static import found in `src/` for: `react-icons`, `framer-motion`, `class-variance-authority`, all `@radix-ui/*`, `html2canvas`, `three-bvh-csg`. Verify (dynamic/string use, planned work) before removing from `package.json`. Used: `file-saver`, `docx`, `jspdf`, `@anthropic-ai/sdk`.
No large binary assets are tracked (largest file is `package-lock.json`, ~460 KB).
