# ShilpaSutra PRD v3 — SolidWorks 2026 V8 Engine Assembly Audit

**Version**: 3.0
**Date**: 2026-03-24
**Audit Sources**: SolidWorks Design Premium 2026, COMSOL Multiphysics 6.x, Zoo Design Studio
**Benchmark Assembly**: V8 Combustion Engine (120+ parts, 400+ mates)

---

## Executive Summary

This PRD documents every gap found between ShilpaSutra's current implementation and production CAD tools (SolidWorks 2026, COMSOL, Zoo). Features are prioritized by impact on real engineering workflows. The V8 engine assembly was used as the benchmark because it exercises every core CAD capability: complex sketches, multi-body solids, assemblies with mechanical mates, FEA thermal/structural, and CFD internal flow.

---

## 1. Sketch Entities

### 1.1 Current State (7 entities)
| Entity | Status |
|--------|--------|
| Line | ✅ Working |
| Arc (3-point) | ✅ Working |
| Circle (center-radius) | ✅ Working |
| Rectangle (corner) | ✅ Working |
| Polygon | ✅ Working |
| Spline | ✅ Working |
| Ellipse | ⚠️ Stub (maps to circle tool) |

### 1.2 SolidWorks Has 25+ Entities — Gaps
| Entity | Priority | Description |
|--------|----------|-------------|
| **Center Rectangle** | HIGH | Draw rectangle from center point outward |
| **3-Point Arc** | HIGH | Arc defined by start, end, and midpoint |
| **Tangent Arc** | HIGH | Arc tangent to previous line segment |
| **Ellipse (functional)** | HIGH | True ellipse with semi-major/semi-minor axes |
| **Centerline / Construction Line** | HIGH | Reference geometry for mirrors and dimensions |
| **Straight Slot** | MEDIUM | Slot profile (two semicircles connected by lines) |
| **Point / Reference Point** | HIGH | Single point entity for constraints and references |
| **Perimeter Circle (3-point)** | MEDIUM | Circle through 3 specified points |
| Parabola | LOW | Conic section |
| Partial Ellipse | LOW | Elliptical arc |
| Text (sketch) | LOW | Engraved/embossed text profiles |
| Center Point Arc | LOW | Arc from center, start angle, end angle |
| 3-Point Corner Rectangle | LOW | Rectangle from 3 corners |

---

## 2. Sketch Tools

### 2.1 Current State
| Tool | Status |
|------|--------|
| Trim | ⚠️ Button exists, no geometry logic |
| Extend | ⚠️ Button exists, no geometry logic |
| Offset | ⚠️ Button exists, no geometry logic |
| Mirror (sketch) | ⚠️ Button exists, no geometry logic |
| Sketch Fillet | ⚠️ Button exists, no geometry logic |
| Sketch Chamfer | ⚠️ Button exists, no geometry logic |
| Dimension | ✅ Visual only (does not drive geometry) |

### 2.2 Required Implementations
| Tool | Priority | Implementation Spec |
|------|----------|-------------------|
| **Trim** | HIGH | Click near intersection → remove segment between intersections. Power Trim: drag across multiple lines to trim all. Must compute line-line, line-arc, arc-arc intersection points, then split/remove segments. |
| **Extend** | HIGH | Click line endpoint → extend to nearest boundary (another line/arc). Compute intersection with all other entities, extend to closest. |
| **Offset** | HIGH | Select entity → specify distance → create parallel copy. For lines: perpendicular offset. For arcs: concentric arc. For chains: offset entire chain maintaining tangency. |
| **Mirror (sketch entities)** | HIGH | Select entities + mirror line → create mirrored copies. Apply reflection matrix about selected centerline. Auto-add symmetric constraints. |
| **Sketch Fillet** | HIGH | Click intersection of two lines → replace corner with tangent arc of specified radius. Trim both lines to arc endpoints. |
| **Sketch Chamfer** | HIGH | Click intersection of two lines → replace corner with straight line at specified distance. Trim both lines to chamfer endpoints. |
| **Move Entities** | MEDIUM | Select entities → drag or specify dx, dy. Move all selected sketch geometry. |
| **Copy Entities** | MEDIUM | Select entities → specify offset → create copies at offset position. |
| **Rotate Entities** | MEDIUM | Select entities → specify center + angle → rotate geometry. |
| **Linear Sketch Pattern** | MEDIUM | Select entities → specify direction, count, spacing → create linear array of copies. |
| **Circular Sketch Pattern** | MEDIUM | Select entities → specify center, count, angle → create circular array of copies. |

---

## 3. Sketch Constraints

### 3.1 Current Solver State
- **Solver**: Gauss-Newton with Levenberg-Marquardt damping ✅
- **15 constraint types** defined ✅
- **Conflict detection** ✅
- **Auto-inference** for near-horizontal, near-vertical, near-coincident ✅

### 3.2 Gaps
| Gap | Priority | Spec |
|-----|----------|------|
| **DOF tracking per entity** | HIGH | Each unconstrained point has 2 DOF (x, y on sketch plane). Track total DOF = 2×points - constraints_rank. Display in status bar. |
| **DOF color coding** | HIGH | Green = fully constrained (0 DOF), Blue = under-constrained (>0 DOF), Red = over-constrained (negative DOF). Color sketch entities accordingly. |
| **Smart Dimension drives geometry** | HIGH | When user adds a dimension and changes its value, the constraint solver MUST move geometry to satisfy the new dimension. Currently dimensions are visual-only. |
| **Auto-constraints while drawing** | HIGH | Detect near-horizontal (<5°) → snap and add horizontal constraint. Near-vertical → snap and add vertical. Endpoint near existing point → snap and add coincident. Near-tangent to arc → snap and add tangent. |
| **Fully-constrained sketch detection** | MEDIUM | Alert user when sketch reaches 0 DOF. Lock sketch color to green. Prevent adding redundant constraints. |
| **Drag under-constrained geometry** | MEDIUM | Allow dragging unconstrained points — solver re-solves in real-time maintaining all existing constraints. |

---

## 4. Solid Features

### 4.1 Current State
| Feature | Status |
|---------|--------|
| Boss Extrude | ✅ Working (ExtrudeGeometry) |
| Revolve | ✅ Working (LatheGeometry) |
| Fillet | ⚠️ Normal smoothing only (no real geometry) |
| Chamfer | ⚠️ Normal smoothing only (no real geometry) |
| Shell | ⚠️ Normal offset (no face removal) |
| Mirror Feature | ✅ Geometry mirroring |
| Linear Pattern | ✅ Clone-based |
| Circular Pattern | ✅ Clone-based |
| Boolean Union | ✅ Merge geometries |
| Boolean Subtract | ✅ Basic CSG |
| Boolean Intersect | ✅ Basic CSG |
| Loft | ⚠️ Skeletal |
| Sweep | ⚠️ Skeletal |

### 4.2 Missing Solid Operations
| Operation | Priority | Spec |
|-----------|----------|------|
| **Extrude Cut** | HIGH | Subtract extruded profile from existing body. Separate tool from Boss Extrude. User selects profile on face, specifies depth, geometry is CSG-subtracted. |
| **Revolve Cut** | HIGH | Subtract revolved profile from existing body. |
| **Shell (improved)** | HIGH | Remove selected faces, then offset remaining faces inward by wall thickness. Create inner walls. SolidWorks dialog: select faces to remove, specify thickness. |
| **Draft** | MEDIUM | Taper selected faces by specified angle relative to pull direction. Used for injection molding. |
| **Hole Wizard** | HIGH | Dialog with hole types: Simple, Counterbore, Countersink, Tapped. Parameters: diameter, depth, thread spec (M3-M24), head diameter. Place by clicking on face. |
| **Mirror Feature** | MEDIUM | Mirror a feature (not just body) about a reference plane. Maintains parametric link. |
| **3D Fillet (real geometry)** | HIGH | Select 3D edges → specify radius → generate actual fillet geometry (rolling ball algorithm or approximation). Replace current normal-smoothing stub. |
| **3D Chamfer (real geometry)** | HIGH | Select 3D edges → specify distance → generate actual chamfer geometry (face intersection). Replace current stub. |
| **Rib** | LOW | Structural rib from open sketch profile. |
| **Wrap** | LOW | Wrap sketch onto cylindrical/conical face. |

---

## 5. Assembly & Mates

### 5.1 Current State
- Assembly engine defines 15 mate types (type definitions only)
- No interactive mate creation workflow
- No mate solving (positions not updated by constraints)

### 5.2 Required Mate System
| Mate Type | Priority | Spec |
|-----------|----------|------|
| **Coincident** | HIGH | Face-to-face flush. Aligns face normals opposed, zero distance between faces. |
| **Concentric** | HIGH | Aligns cylindrical axes. Used for shaft-in-bore, bolt-in-hole. |
| **Distance** | HIGH | Specified gap between two faces. Offset along face normal. |
| **Parallel** | MEDIUM | Force two faces/planes parallel. |
| **Perpendicular** | MEDIUM | Force two faces/planes at 90°. |
| **Angle** | MEDIUM | Specified angle between two faces/planes. |
| **Lock** | MEDIUM | Fix relative position and orientation of two parts. |
| **Gear** | LOW | Mechanical mate: rotation of gear A drives gear B by ratio. |
| **Rack & Pinion** | LOW | Linear motion of rack drives rotation of pinion. |
| **Cam** | LOW | Follower traces cam profile. |

### 5.3 Mate Workflow
1. User clicks "Add Mate" in Assembly tab
2. Mate dialog opens: select two entities (faces/edges/points)
3. Choose mate type from dropdown
4. Preview alignment in real-time
5. Apply → solver positions parts to satisfy mate
6. Mate appears in Feature Tree under "MateGroup" node
7. Right-click mate → Edit, Suppress, Delete

---

## 6. Feature Tree (SolidWorks-style)

### 6.1 Current State
- Hierarchical tree with expand/collapse ✅
- Visibility and lock toggles ✅
- Search/filter ✅
- Context menu: Rename, Duplicate, Delete, Toggle Visibility, Suppress, Edit Sketch ✅
- Rollback bar visual ✅ (non-functional)
- Feature type icons ✅

### 6.2 Gaps
| Gap | Priority | Spec |
|-----|----------|------|
| **Edit Feature (double-click)** | HIGH | Double-click feature → open parameter dialog (extrude depth, fillet radius, etc.). Edit value → rebuild. |
| **Edit Sketch (double-click)** | HIGH | Double-click sketch node → enter sketch edit mode on that sketch's plane. |
| **Functional Rollback Bar** | HIGH | Drag rollback bar up → suppress all features below bar position. Drag down → unsuppress. Enables "what if" exploration. |
| **Suppress/Unsuppress** | HIGH | Right-click → Suppress: gray out feature, exclude from rebuild. Unsuppress: restore. |
| **Parent/Child Relations** | MEDIUM | Dialog showing which features depend on this feature, and which features this depends on. Shown as directed graph or table. |
| **What's Wrong** | MEDIUM | Right-click → What's Wrong: show error details for failed features (dangling references, zero-thickness, etc.). |
| **Feature color coding** | HIGH | Different icons for each feature type. Extrude=green arrow, Cut=red arrow, Fillet=orange arc, Revolve=blue arrow, Mirror=symmetry icon, Pattern=grid icon. |

---

## 7. Evaluate / Inspect Tools

### 7.1 Current State
- Mass Properties dialog ✅ (basic volume/mass/CoM)
- Distance measurement ✅
- Angle measurement ✅
- Section view tool ✅ (button only)

### 7.2 Gaps
| Tool | Priority | Spec |
|------|----------|------|
| **Interference Detection** | HIGH | Check all body pairs for volume overlap. Highlight interfering regions in red. Report interference volume. |
| **Section View (functional)** | HIGH | Define cutting plane (XY/XZ/YZ or custom). Clip all geometry on one side. Show cross-section with hatching. Interactive plane position slider. |
| **Curvature Display** | LOW | Color-map surfaces by Gaussian curvature. Used for surface quality analysis. |
| **Draft Analysis** | LOW | Color-map faces by draft angle relative to pull direction. Red=insufficient draft, Green=sufficient. |
| **Undercut Detection** | LOW | Identify regions that cannot be demolded in a straight pull. |
| **Wall Thickness Analysis** | MEDIUM | Color-map by local wall thickness. Highlight thin regions. |

---

## 8. FEA Simulation (COMSOL-style)

### 8.1 Current State
- Element types defined (tet4-hex20) ✅
- Boundary conditions defined (10+ types) ✅
- Analysis types defined (static through nonlinear) ✅
- Result types defined (displacement, vonMises, etc.) ✅
- UI for setup ✅
- **No actual solver** — results are placeholder/generated

### 8.2 Gaps for COMSOL Parity
| Gap | Priority | Spec |
|-----|----------|------|
| **Mesh generation from CAD** | HIGH | Convert Three.js geometry to FEA mesh. Tetrahedral auto-mesh with boundary layer refinement. |
| **Linear static solver** | HIGH | Ku=F direct solver for small models. Sparse matrix assembly from element stiffness matrices. |
| **Result visualization on mesh** | HIGH | Map scalar fields (vonMises, displacement magnitude) to vertex colors. Use jet/rainbow colormap with legend. |
| **Modal analysis** | MEDIUM | Eigenvalue solver for natural frequencies and mode shapes. |
| **Thermal steady-state** | MEDIUM | KT=Q heat conduction solver. Temperature field visualization. |
| **Contact analysis** | LOW | Node-to-surface contact for assembly simulation. |
| **Nonlinear (large deformation)** | LOW | Newton-Raphson iteration with updated stiffness. |
| **Fatigue life estimation** | LOW | S-N curve lookup from stress results. |

---

## 9. CFD Simulation

### 9.1 Current State
- Turbulence models defined (6 types) ✅
- Boundary conditions defined (9 types) ✅
- Solver algorithms defined (SIMPLE/PISO/etc.) ✅
- **No actual flow solver** — results are placeholder

### 9.2 Gaps
| Gap | Priority | Spec |
|-----|----------|------|
| **Mesh generation (volume)** | HIGH | Generate volume mesh from CAD with boundary layer inflation. |
| **Pressure-velocity coupling** | HIGH | SIMPLE algorithm for incompressible steady flow. |
| **Result contour plots** | HIGH | Velocity/pressure/temperature scalar fields on cut planes. |
| **Streamline visualization** | MEDIUM | Particle tracing through velocity field. |
| **Force coefficients** | MEDIUM | Integrate pressure/shear on surfaces for drag/lift. |
| **ML surrogate models** | LOW | Train neural network on parametric sweep results for rapid prediction. |

---

## 10. AI Integration (Zoo Zookeeper-style)

### 10.1 Current State
- Chat sidebar with command interpreter ✅
- Pattern matching for: fillet, chamfer, extrude, gear, bolt hole, mirror, shell ✅
- Actual geometry generation via aiExtrude, aiCreateGear, etc. ✅
- Basic context awareness (knows selected object) ✅

### 10.2 Gaps
| Gap | Priority | Spec |
|-----|----------|------|
| **Full context awareness** | HIGH | AI knows: active sketch, all features in tree, what's selected (face/edge/point), current constraints, DOF status. Include in system prompt. |
| **Sketch-level commands** | HIGH | "draw a rectangle 50x30 at origin" → generates sketch entities. "Add M8 hole at center" → creates circle profile. |
| **Constraint suggestions** | MEDIUM | "What constraints am I missing?" → analyzes sketch, suggests under-constrained geometry and appropriate constraints. |
| **Design intent reasoning** | MEDIUM | "I need a bracket for a NEMA 17 motor" → suggests complete workflow: base plate sketch → extrude → mounting holes → fillets → material assignment. |
| **Multi-step workflows** | MEDIUM | "Create a gear train with 3:1 ratio" → creates two gears with correct tooth counts, positions them, adds gear mate. |
| **LLM API integration** | HIGH | Connect to Claude API for actual natural language understanding instead of regex pattern matching. |

---

## 11. App Behavior & UX

### 11.1 Current State
- Dark theme with professional styling ✅
- Ribbon toolbar with 7 tabs ✅
- Command palette (Ctrl+K) ✅
- Keyboard shortcuts ✅
- 3D viewport with orbit/pan/zoom ✅

### 11.2 Behavioral Gaps
| Gap | Priority | Spec |
|-----|----------|------|
| **Sketch mode transparency** | HIGH | When entering sketch mode, only active sketch plane visible. Other geometry semi-transparent (opacity 0.15). Non-sketch geometry non-selectable. |
| **Grid snap in sketch** | MEDIUM | When grid snap is ON, all sketch points snap to grid intersections. Visual feedback: highlight nearest grid point. |
| **Viewport context menu** | MEDIUM | Right-click in empty viewport: Zoom to Fit, Section View, Change Appearance, Select All, Paste. Right-click on object: Edit, Suppress, Hide, Properties. |
| **Enhanced status bar** | HIGH | Show: Current Tool | Mouse X,Y,Z | Snap Status | Units (mm) | Object Count | Constraint Status (DOF count) | Selection info. |
| **Selection highlighting** | MEDIUM | Selected entities: bright emissive glow. Hovered entities: subtle highlight. Pre-selection (mouse near): dashed outline. |
| **Undo/Redo for ALL operations** | HIGH | Every sketch edit, feature creation, parameter change, and transform must push to undo stack. Currently some operations don't register. |

---

## 12. Implementation Priority Matrix

### Phase 1 — Critical (This PR)
1. Sketch entities: Center Rectangle, 3-Point Arc, Tangent Arc, Ellipse, Centerline, Point, Perimeter Circle, Slot
2. Sketch tools: Trim, Extend, Offset, Mirror, Sketch Fillet, Sketch Chamfer
3. Constraint solver: DOF tracking, color coding, smart dimension driving, auto-constraints
4. Feature Tree: Edit Feature, Edit Sketch, functional rollback bar, suppress/unsuppress, parent/child
5. Solid ops: Extrude Cut, Revolve Cut, improved Shell, Hole Wizard, 3D Fillet/Chamfer
6. Assembly mates: Coincident, Concentric, Distance, Parallel, Perpendicular, Angle, Lock, Gear
7. AI: Full context awareness, real geometry generation
8. Evaluate: Interference Detection, functional Section View, enhanced Measure
9. App behavior: Sketch mode transparency, status bar, undo/redo completeness

### Phase 2 — Enhancement
1. Draft, Rib, Wrap features
2. Advanced mates (Rack & Pinion, Cam)
3. FEA linear static solver
4. CFD steady-state solver
5. ML surrogate models
6. Curvature/draft/undercut analysis

### Phase 3 — Polish
1. Text sketch entity
2. Parabola/conic sections
3. Nonlinear FEA
4. Transient CFD
5. Real-time collaboration
6. Version control for designs

---

## 13. Technical Constraints

- **Runtime**: Browser-based (WebGL via Three.js/R3F)
- **CAD Kernel**: Three.js geometry + OpenCASCADE.js (WASM) for future B-rep
- **No native solver**: FEA/CFD are UI + type definitions; actual solving requires backend API (OpenFOAM container, CalculiX)
- **Build**: `npm run build` must pass with 0 errors
- **Compatibility**: All existing UI/styling preserved; additive changes only

---

## Appendix A: SolidWorks Feature Comparison Matrix

| Category | SolidWorks 2026 | ShilpaSutra (Current) | Gap |
|----------|----------------|----------------------|-----|
| Sketch Entities | 25+ | 7 | 18+ |
| Sketch Tools | 15+ | 7 (non-functional) | 8+ |
| Constraints | 15+ fully functional | 15 types, solver works | DOF tracking, driving dims |
| Solid Features | 30+ | 13 (many skeletal) | 17+ |
| Assembly Mates | 12 standard + 6 mechanical | Type defs only | Full workflow |
| Feature Tree | Full parametric editing | View/organize only | Edit, rollback, suppress |
| Evaluate Tools | 8+ | 4 (2 functional) | 4+ |
| FEA | Simulation Professional | Types + UI only | Solver |
| CFD | Flow Simulation | Types + UI only | Solver |
| AI | None (Zookeeper is Zoo.dev) | Command interpreter | LLM integration |
