"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload, Ruler, Trash2, Download, MapPin, X, Plus, RefreshCw, Crosshair,
} from "lucide-react";

type MeasureMode = "linear" | "chain" | "area" | "angle";
type Tab = "image" | "map";

interface Pt { x: number; y: number; id: number }

interface Measurement {
  id: string;
  mode: MeasureMode;
  points: Pt[];
  pixelValue: number; // raw pixel distance / area
  realValue: number | null; // converted using scale
  unit: string;
  label: string;
}

interface MapWaypoint { lat: number; lon: number; label: string }

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function dist2D(a: Pt, b: Pt) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function polyArea(pts: Pt[]) {
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

function angleBetween(a: Pt, vertex: Pt, b: Pt) {
  const v1 = { x: a.x - vertex.x, y: a.y - vertex.y };
  const v2 = { x: b.x - vertex.x, y: b.y - vertex.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
  if (mag1 === 0 || mag2 === 0) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * 180) / Math.PI;
}

function computeResult(mode: MeasureMode, pts: Pt[]): number {
  if (pts.length < 2) return 0;
  switch (mode) {
    case "linear": return dist2D(pts[0], pts[1]);
    case "chain": {
      let total = 0;
      for (let i = 1; i < pts.length; i++) total += dist2D(pts[i - 1], pts[i]);
      return total;
    }
    case "area": return pts.length >= 3 ? polyArea(pts) : 0;
    case "angle": return pts.length >= 3 ? angleBetween(pts[0], pts[1], pts[2]) : 0;
    default: return 0;
  }
}

let ptIdCounter = 0;

export default function MeasurePage() {
  const [tab, setTab] = useState<Tab>("image");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imgNat, setImgNat] = useState({ w: 0, h: 0 });
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });
  const [mode, setMode] = useState<MeasureMode>("linear");
  const [currentPts, setCurrentPts] = useState<Pt[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [scale, setScale] = useState<number | null>(null); // pixels per real unit
  const [scaleUnit, setScaleUnit] = useState("mm");
  const [calibStep, setCalibStep] = useState<"idle" | "picking" | "distance">("idle");
  const [calibPts, setCalibPts] = useState<Pt[]>([]);
  const [calibInput, setCalibInput] = useState("");
  const [hovPt, setHovPt] = useState<Pt | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Map tab
  const [waypoints, setWaypoints] = useState<MapWaypoint[]>([]);
  const [mapInputLat, setMapInputLat] = useState("");
  const [mapInputLon, setMapInputLon] = useState("");
  const [mapInputLabel, setMapInputLabel] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Update SVG size when container/image changes
  const updateSvgSize = useCallback(() => {
    if (containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      setSvgSize({ w: r.width, h: r.height });
    }
  }, []);

  useEffect(() => {
    updateSvgSize();
    window.addEventListener("resize", updateSvgSize);
    return () => window.removeEventListener("resize", updateSvgSize);
  }, [updateSvgSize, imageSrc]);

  const getSvgPt = useCallback((e: React.MouseEvent<SVGSVGElement>): Pt => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, id: ++ptIdCounter };
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImgNat({ w: img.naturalWidth, h: img.naturalHeight });
      setImageSrc(url);
      setMeasurements([]);
      setCurrentPts([]);
      setCalibStep("idle");
      setCalibPts([]);
      setScale(null);
    };
    img.src = url;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImgNat({ w: img.naturalWidth, h: img.naturalHeight });
      setImageSrc(url);
      setMeasurements([]);
      setCurrentPts([]);
      setCalibStep("idle");
      setCalibPts([]);
      setScale(null);
    };
    img.src = url;
  }, []);

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!imageSrc) return;
    const pt = getSvgPt(e);

    if (calibStep === "picking") {
      const next = [...calibPts, pt];
      setCalibPts(next);
      if (next.length >= 2) setCalibStep("distance");
      return;
    }

    const next = [...currentPts, pt];

    if (mode === "linear" && next.length === 2) {
      finalizeMeasurement(next);
      return;
    }
    if (mode === "angle" && next.length === 3) {
      finalizeMeasurement(next);
      return;
    }
    setCurrentPts(next);
  }, [imageSrc, calibStep, calibPts, currentPts, mode]);

  const handleSvgDblClick = useCallback(() => {
    if (mode === "chain" && currentPts.length >= 2) {
      finalizeMeasurement(currentPts);
    } else if (mode === "area" && currentPts.length >= 3) {
      finalizeMeasurement(currentPts);
    }
  }, [mode, currentPts]);

  const finalizeMeasurement = useCallback((pts: Pt[]) => {
    const pixelVal = computeResult(mode, pts);
    const realVal = scale ? pixelVal / scale : null;
    const unit = mode === "area" ? (scale ? `${scaleUnit}²` : "px²") : (scale ? scaleUnit : "px");
    const labels: Record<MeasureMode, string> = {
      linear: `Linear ${measurements.length + 1}`,
      chain: `Chain ${measurements.length + 1}`,
      area: `Area ${measurements.length + 1}`,
      angle: `Angle ${measurements.length + 1}`,
    };
    setMeasurements((prev) => [...prev, {
      id: `m-${Date.now()}`,
      mode,
      points: pts,
      pixelValue: pixelVal,
      realValue: realVal,
      unit,
      label: labels[mode],
    }]);
    setCurrentPts([]);
  }, [mode, scale, scaleUnit, measurements.length]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!imageSrc) return;
    setHovPt(getSvgPt(e));
  }, [imageSrc, getSvgPt]);

  const applyCalibration = useCallback(() => {
    const dist = parseFloat(calibInput);
    if (isNaN(dist) || dist <= 0 || calibPts.length < 2) return;
    const pixDist = dist2D(calibPts[0], calibPts[1]);
    setScale(pixDist / dist);
    setCalibStep("idle");
    setCalibPts([]);
    setCalibInput("");
  }, [calibInput, calibPts]);

  const formatValue = (m: Measurement) => {
    if (m.realValue !== null) {
      return m.mode === "area"
        ? `${m.realValue.toFixed(2)} ${m.unit}`
        : `${m.realValue.toFixed(2)} ${m.unit}`;
    }
    return m.mode === "angle"
      ? `${m.pixelValue.toFixed(1)}°`
      : `${m.pixelValue.toFixed(1)} px`;
  };

  const exportCSV = () => {
    const rows = ["Label,Mode,Value,Unit,Points"];
    measurements.forEach((m) => {
      const val = m.realValue !== null ? m.realValue.toFixed(2) : m.pixelValue.toFixed(2);
      rows.push(`"${m.label}",${m.mode},${val},${m.unit},"${m.points.map(p => `(${p.x.toFixed(0)};${p.y.toFixed(0)})`).join(" ")}"`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "measurements.csv";
    a.click();
  };

  // Map helpers
  const addWaypoint = () => {
    const lat = parseFloat(mapInputLat);
    const lon = parseFloat(mapInputLon);
    if (isNaN(lat) || isNaN(lon)) return;
    setWaypoints((prev) => [...prev, { lat, lon, label: mapInputLabel || `WP ${prev.length + 1}` }]);
    setMapInputLat(""); setMapInputLon(""); setMapInputLabel("");
  };

  const totalMapDist = waypoints.length >= 2
    ? waypoints.reduce((acc, wp, i) => i === 0 ? 0 : acc + haversine(waypoints[i - 1].lat, waypoints[i - 1].lon, wp.lat, wp.lon), 0)
    : 0;

  const renderSvgMeasurements = () => {
    const allMeasures = [...measurements];
    return (
      <>
        {/* Finalized measurements */}
        {allMeasures.map((m) => (
          <g key={m.id}>
            {(m.mode === "linear" || m.mode === "chain") && m.points.map((p, i) => (
              i > 0 && <line key={i} x1={m.points[i - 1].x} y1={m.points[i - 1].y} x2={p.x} y2={p.y}
                stroke="#00D4FF" strokeWidth={1.5} strokeOpacity={0.8} />
            ))}
            {m.mode === "area" && (
              <polygon points={m.points.map(p => `${p.x},${p.y}`).join(" ")}
                fill="#00D4FF" fillOpacity={0.15} stroke="#00D4FF" strokeWidth={1.5} />
            )}
            {m.mode === "angle" && m.points.length === 3 && (() => {
              const [a, v, b] = m.points;
              return (<><line x1={v.x} y1={v.y} x2={a.x} y2={a.y} stroke="#F59E0B" strokeWidth={1.5} />
                <line x1={v.x} y1={v.y} x2={b.x} y2={b.y} stroke="#F59E0B" strokeWidth={1.5} /></>);
            })()}
            {m.points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={4} fill="#00D4FF" stroke="#fff" strokeWidth={1} />
            ))}
            {m.points.length >= 1 && (() => {
              const mid = m.mode === "linear" || m.mode === "angle"
                ? { x: (m.points[0].x + (m.points[m.points.length - 1]?.x || m.points[0].x)) / 2, y: (m.points[0].y + (m.points[m.points.length - 1]?.y || m.points[0].y)) / 2 }
                : m.points.reduce((acc, p) => ({ x: acc.x + p.x / m.points.length, y: acc.y + p.y / m.points.length }), { x: 0, y: 0 });
              return (
                <g>
                  <rect x={mid.x - 30} y={mid.y - 12} width={60} height={16} rx={3} fill="#0d1117" fillOpacity={0.85} />
                  <text x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="middle" fill="#00D4FF" fontSize={10} fontFamily="monospace">
                    {formatValue(m)}
                  </text>
                </g>
              );
            })()}
          </g>
        ))}

        {/* Calibration line */}
        {calibPts.length === 2 && (
          <line x1={calibPts[0].x} y1={calibPts[0].y} x2={calibPts[1].x} y2={calibPts[1].y}
            stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="4 2" />
        )}
        {calibPts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill="#F59E0B" />
        ))}

        {/* Current active points */}
        {currentPts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill="#00D4FF" stroke="#fff" strokeWidth={1} />
        ))}
        {currentPts.length >= 2 && (mode === "linear" || mode === "chain") && currentPts.map((p, i) => (
          i > 0 && <line key={i} x1={currentPts[i - 1].x} y1={currentPts[i - 1].y} x2={p.x} y2={p.y}
            stroke="#00D4FF" strokeWidth={1.5} strokeDasharray="4 2" />
        ))}
        {mode === "area" && currentPts.length >= 2 && (
          <polygon points={currentPts.map(p => `${p.x},${p.y}`).join(" ")}
            fill="#00D4FF" fillOpacity={0.08} stroke="#00D4FF" strokeWidth={1.5} strokeDasharray="4 2" />
        )}

        {/* Preview line to hover */}
        {hovPt && currentPts.length >= 1 && (mode === "linear" || mode === "chain" || mode === "angle" || mode === "area") && (
          <line x1={currentPts[currentPts.length - 1].x} y1={currentPts[currentPts.length - 1].y}
            x2={hovPt.x} y2={hovPt.y} stroke="#00D4FF" strokeWidth={1} strokeDasharray="3 2" strokeOpacity={0.5} />
        )}
        {hovPt && calibStep === "picking" && calibPts.length === 1 && (
          <line x1={calibPts[0].x} y1={calibPts[0].y} x2={hovPt.x} y2={hovPt.y}
            stroke="#F59E0B" strokeWidth={1} strokeDasharray="3 2" strokeOpacity={0.6} />
        )}
        {/* Hover crosshair */}
        {hovPt && (
          <g>
            <circle cx={hovPt.x} cy={hovPt.y} r={6} fill="none" stroke="#00D4FF" strokeWidth={1} strokeOpacity={0.5} />
            <line x1={hovPt.x - 10} y1={hovPt.y} x2={hovPt.x + 10} y2={hovPt.y} stroke="#00D4FF" strokeWidth={0.5} strokeOpacity={0.5} />
            <line x1={hovPt.x} y1={hovPt.y - 10} x2={hovPt.x} y2={hovPt.y + 10} stroke="#00D4FF" strokeWidth={0.5} strokeOpacity={0.5} />
          </g>
        )}
      </>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#21262d]">
        <div className="flex items-center gap-3">
          <Ruler size={18} className="text-[#00D4FF]" />
          <h1 className="text-sm font-bold text-white">Smart Measurement Tool</h1>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setTab("image")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${tab === "image" ? "bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/40" : "text-slate-400 hover:text-white"}`}>
            Image Measure
          </button>
          <button onClick={() => setTab("map")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${tab === "map" ? "bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/40" : "text-slate-400 hover:text-white"}`}>
            Map Distance
          </button>
        </div>
      </div>

      {tab === "image" && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Tools & Results */}
          <div className="w-56 bg-[#161b22] border-r border-[#21262d] flex flex-col overflow-y-auto">
            {/* Mode tools */}
            <div className="p-3 border-b border-[#21262d]">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Measure Mode</div>
              {(["linear", "chain", "area", "angle"] as MeasureMode[]).map((m) => {
                const labels = { linear: "Linear (2 pts)", chain: "Chain (multi-pt)", area: "Area (polygon)", angle: "Angle (3 pts)" };
                return (
                  <button key={m} onClick={() => { setMode(m); setCurrentPts([]); }}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded mb-1 transition-colors ${mode === m ? "bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30" : "text-slate-400 hover:bg-[#21262d] hover:text-white"}`}>
                    {labels[m]}
                  </button>
                );
              })}
            </div>

            {/* Scale calibration */}
            <div className="p-3 border-b border-[#21262d]">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Scale Calibration</div>
              {scale ? (
                <div className="text-[10px] text-green-400 mb-2">
                  ✓ 1 px = {(1 / scale).toFixed(4)} {scaleUnit}
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 mb-2">No scale set (px mode)</div>
              )}
              {calibStep === "idle" && (
                <button onClick={() => { setCalibStep("picking"); setCalibPts([]); }}
                  className="w-full text-xs px-2 py-1 rounded border border-[#21262d] text-slate-400 hover:text-white hover:border-[#00D4FF]/40 transition-colors">
                  Set Scale…
                </button>
              )}
              {calibStep === "picking" && (
                <div className="text-[10px] text-yellow-400">
                  Click {2 - calibPts.length} point{2 - calibPts.length !== 1 ? "s" : ""} on image for known distance
                </div>
              )}
              {calibStep === "distance" && (
                <div className="space-y-1.5">
                  <input value={calibInput} onChange={(e) => setCalibInput(e.target.value)}
                    placeholder="Real distance" type="number" min="0.01"
                    className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white" />
                  <select value={scaleUnit} onChange={(e) => setScaleUnit(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white">
                    {["mm", "cm", "m", "in", "ft"].map((u) => <option key={u}>{u}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <button onClick={applyCalibration}
                      className="flex-1 text-xs px-2 py-1 rounded bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/40 hover:bg-[#00D4FF]/30">Apply</button>
                    <button onClick={() => { setCalibStep("idle"); setCalibPts([]); }}
                      className="px-2 py-1 rounded border border-[#21262d] text-slate-400 hover:text-white text-xs">✕</button>
                  </div>
                </div>
              )}
              {scale && (
                <button onClick={() => setScale(null)} className="mt-1 w-full text-[10px] text-slate-600 hover:text-red-400 transition-colors">
                  Clear scale
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="p-3 border-b border-[#21262d]">
              <div className="flex gap-1">
                <button onClick={() => { setCurrentPts([]); }}
                  className="flex-1 text-xs px-2 py-1 rounded border border-[#21262d] text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                  <RefreshCw size={10} /> Reset
                </button>
                <button onClick={() => { setMeasurements([]); setCurrentPts([]); }}
                  className="flex-1 text-xs px-2 py-1 rounded border border-[#21262d] text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1">
                  <Trash2 size={10} /> Clear
                </button>
              </div>
              {measurements.length > 0 && (
                <button onClick={exportCSV}
                  className="mt-1 w-full text-xs px-2 py-1 rounded bg-green-600/20 text-green-400 border border-green-600/40 hover:bg-green-600/30 transition-colors flex items-center gap-1 justify-center">
                  <Download size={10} /> Export CSV
                </button>
              )}
            </div>

            {/* Measurements list */}
            <div className="flex-1 p-2 overflow-y-auto">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 px-1">Results</div>
              {measurements.length === 0 && (
                <div className="text-[10px] text-slate-600 text-center py-4">No measurements yet</div>
              )}
              {measurements.map((m) => (
                <div key={m.id} className="mb-1.5 p-2 rounded bg-[#0d1117] border border-[#21262d] group">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">{m.label}</div>
                      <div className="text-xs font-mono text-[#00D4FF] mt-0.5">{formatValue(m)}</div>
                      {m.realValue === null && m.mode !== "angle" && (
                        <div className="text-[9px] text-slate-600">{m.pixelValue.toFixed(1)} px</div>
                      )}
                    </div>
                    <button onClick={() => setMeasurements((prev) => prev.filter((x) => x.id !== m.id))}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Image + SVG overlay */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!imageSrc ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex-1 flex flex-col items-center justify-center gap-4 transition-colors ${isDragging ? "bg-[#00D4FF]/5 border-2 border-dashed border-[#00D4FF]/40" : "bg-[#0a0a1a]"}`}>
                <Upload size={48} className="text-slate-600" />
                <div className="text-center">
                  <p className="text-sm text-slate-400 font-medium">Drop image here or click to upload</p>
                  <p className="text-xs text-slate-600 mt-1">Supports PNG, JPG, BMP, SVG, PDF previews</p>
                </div>
                <label className="px-4 py-2 rounded-lg bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/40 text-sm cursor-pointer hover:bg-[#00D4FF]/30 transition-colors">
                  Browse File
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            ) : (
              <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[#0a0a1a] flex items-center justify-center"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDrop={handleDrop}>
                <img ref={imgRef} src={imageSrc} alt="measurement target"
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
                  onLoad={updateSvgSize} />
                <svg ref={svgRef}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", cursor: "crosshair" }}
                  onClick={handleSvgClick}
                  onDoubleClick={handleSvgDblClick}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHovPt(null)}>
                  {renderSvgMeasurements()}
                </svg>
                {/* Hint bar */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[#161b22]/90 border border-[#21262d] rounded px-3 py-1 text-[10px] text-slate-400 backdrop-blur-sm pointer-events-none">
                  {mode === "linear" && `Click 2 points to measure distance (${currentPts.length}/2)`}
                  {mode === "chain" && `Click points, double-click to finish (${currentPts.length} pts)`}
                  {mode === "area" && `Click polygon points, double-click to close (${currentPts.length} pts)`}
                  {mode === "angle" && `Click 3 points: first ray, vertex, second ray (${currentPts.length}/3)`}
                  {calibStep === "picking" && ` | CALIBRATION: click 2 points`}
                </div>
                {/* Replace image button */}
                <label className="absolute top-2 right-2 px-2 py-1 bg-[#161b22]/90 border border-[#21262d] rounded text-[10px] text-slate-400 hover:text-white cursor-pointer transition-colors backdrop-blur-sm">
                  Change Image
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "map" && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel */}
          <div className="w-72 bg-[#161b22] border-r border-[#21262d] flex flex-col overflow-y-auto p-3 gap-3">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Add Waypoint</div>
              <div className="space-y-1.5">
                <input value={mapInputLabel} onChange={(e) => setMapInputLabel(e.target.value)}
                  placeholder="Label (optional)"
                  className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white" />
                <input value={mapInputLat} onChange={(e) => setMapInputLat(e.target.value)}
                  placeholder="Latitude (e.g. 28.6139)"
                  type="number" step="any"
                  className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white" />
                <input value={mapInputLon} onChange={(e) => setMapInputLon(e.target.value)}
                  placeholder="Longitude (e.g. 77.2090)"
                  type="number" step="any"
                  className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white" />
                <button onClick={addWaypoint}
                  className="w-full text-xs px-2 py-1.5 rounded bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/40 hover:bg-[#00D4FF]/30 transition-colors flex items-center gap-1 justify-center">
                  <Plus size={12} /> Add Waypoint
                </button>
              </div>
            </div>

            {/* Waypoints list */}
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Waypoints</div>
              {waypoints.length === 0 && <div className="text-[10px] text-slate-600">No waypoints added</div>}
              {waypoints.map((wp, i) => (
                <div key={i} className="flex items-start justify-between mb-1.5 p-2 bg-[#0d1117] rounded border border-[#21262d] group">
                  <div>
                    <div className="text-xs font-medium text-white">{wp.label}</div>
                    <div className="text-[9px] text-slate-500 font-mono">{wp.lat.toFixed(5)}, {wp.lon.toFixed(5)}</div>
                    {i > 0 && (
                      <div className="text-[9px] text-[#00D4FF] mt-0.5">
                        ↗ {(haversine(waypoints[i - 1].lat, waypoints[i - 1].lon, wp.lat, wp.lon) / 1000).toFixed(3)} km from prev
                      </div>
                    )}
                  </div>
                  <button onClick={() => setWaypoints((p) => p.filter((_, j) => j !== i))}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Total distance */}
            {waypoints.length >= 2 && (
              <div className="p-3 rounded bg-[#00D4FF]/10 border border-[#00D4FF]/30">
                <div className="text-[10px] text-slate-400 mb-1">Total Path Distance</div>
                <div className="text-xl font-bold font-mono text-[#00D4FF]">
                  {totalMapDist >= 1000 ? `${(totalMapDist / 1000).toFixed(3)} km` : `${totalMapDist.toFixed(1)} m`}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Geodesic (great-circle) distance</div>
              </div>
            )}

            <div className="text-[10px] text-slate-600 leading-relaxed">
              Uses Haversine formula for accurate geodesic distances on Earth&apos;s surface. Enter coordinates in decimal degrees (WGS84).
            </div>
          </div>

          {/* Right: Map iframe */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 relative">
              <iframe
                src="https://www.openstreetmap.org/export/embed.html?bbox=-180,-85,180,85&layer=mapnik"
                className="w-full h-full border-0"
                title="OpenStreetMap"
                loading="lazy"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#161b22]/90 border border-[#21262d] rounded px-4 py-2 text-[10px] text-slate-400 backdrop-blur-sm">
                <MapPin size={10} className="inline mr-1 text-[#00D4FF]" />
                Enter coordinates in the left panel. Map shown for reference.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
