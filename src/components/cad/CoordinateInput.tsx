"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useCadStore } from "@/stores/cad-store";
import { Crosshair, Navigation } from "lucide-react";

type CoordMode = "absolute" | "relative" | "polar";

interface CoordinateInputProps {
  onCoordinateSubmit?: (point: [number, number, number]) => void;
}

export default function CoordinateInput({ onCoordinateSubmit }: CoordinateInputProps) {
  const cursorPosition = useCadStore((s) => s.cursorPosition);
  const unit = useCadStore((s) => s.unit);
  const sketchPlane = useCadStore((s) => s.sketchPlane);
  const sketchDrawState = useCadStore((s) => s.sketchDrawState);

  const [mode, setMode] = useState<CoordMode>("absolute");
  const [inputActive, setInputActive] = useState(false);
  const [xInput, setXInput] = useState("");
  const [yInput, setYInput] = useState("");
  const [zInput, setZInput] = useState("");
  const [rInput, setRInput] = useState(""); // for polar: distance
  const [aInput, setAInput] = useState(""); // for polar: angle
  const xRef = useRef<HTMLInputElement>(null);
  const yRef = useRef<HTMLInputElement>(null);
  const zRef = useRef<HTMLInputElement>(null);

  const SKETCH_Y = 0.02;

  // Keyboard shortcut to activate coordinate input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // @ toggles relative mode, # toggles absolute, < toggles polar
      if (e.key === "@") {
        e.preventDefault();
        setMode("relative");
        setInputActive(true);
        setTimeout(() => xRef.current?.focus(), 50);
      } else if (e.key === "#") {
        e.preventDefault();
        setMode("absolute");
        setInputActive(true);
        setTimeout(() => xRef.current?.focus(), 50);
      } else if (e.key === "<") {
        e.preventDefault();
        setMode("polar");
        setInputActive(true);
        setTimeout(() => xRef.current?.focus(), 50);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = useCallback(() => {
    let point: [number, number, number] | null = null;

    if (mode === "absolute") {
      const x = parseFloat(xInput);
      const y = parseFloat(yInput || "0");
      const z = parseFloat(zInput || "0");
      if (!isNaN(x)) {
        if (sketchPlane === "xz") point = [x, SKETCH_Y, z];
        else if (sketchPlane === "xy") point = [x, y, 0];
        else if (sketchPlane === "yz") point = [0, y, z];
        else point = [x, y, z];
      }
    } else if (mode === "relative") {
      const dx = parseFloat(xInput);
      const dy = parseFloat(yInput || "0");
      const dz = parseFloat(zInput || "0");
      const lastPoint = sketchDrawState.clickPoints.length > 0
        ? sketchDrawState.clickPoints[sketchDrawState.clickPoints.length - 1]
        : [0, SKETCH_Y, 0] as [number, number, number];
      if (!isNaN(dx)) {
        if (sketchPlane === "xz") point = [lastPoint[0] + dx, SKETCH_Y, lastPoint[2] + dz];
        else if (sketchPlane === "xy") point = [lastPoint[0] + dx, lastPoint[1] + dy, 0];
        else point = [lastPoint[0] + dx, lastPoint[1] + dy, lastPoint[2] + dz];
      }
    } else if (mode === "polar") {
      const r = parseFloat(rInput);
      const angleDeg = parseFloat(aInput);
      if (!isNaN(r) && !isNaN(angleDeg)) {
        const angleRad = angleDeg * Math.PI / 180;
        const dx = r * Math.cos(angleRad);
        const dy = r * Math.sin(angleRad);
        const lastPoint = sketchDrawState.clickPoints.length > 0
          ? sketchDrawState.clickPoints[sketchDrawState.clickPoints.length - 1]
          : [0, SKETCH_Y, 0] as [number, number, number];
        if (sketchPlane === "xz") point = [lastPoint[0] + dx, SKETCH_Y, lastPoint[2] + dy];
        else if (sketchPlane === "xy") point = [lastPoint[0] + dx, lastPoint[1] + dy, 0];
        else point = [lastPoint[0] + dx, lastPoint[1] + dy, lastPoint[2] + dy];
      }
    }

    if (point && onCoordinateSubmit) {
      onCoordinateSubmit(point);
    }

    // Reset
    setXInput("");
    setYInput("");
    setZInput("");
    setRInput("");
    setAInput("");
    setInputActive(false);
  }, [mode, xInput, yInput, zInput, rInput, aInput, sketchPlane, sketchDrawState, onCoordinateSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setInputActive(false);
      setXInput("");
      setYInput("");
      setZInput("");
    }
    if (e.key === "Tab") {
      e.preventDefault();
      // Move to next input
      const target = e.target as HTMLInputElement;
      if (target === xRef.current) yRef.current?.focus();
      else if (target === yRef.current) zRef.current?.focus();
      else if (target === zRef.current) xRef.current?.focus();
    }
    // Comma as separator: auto-tab to next field
    if (e.key === ",") {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      if (target === xRef.current) yRef.current?.focus();
      else if (target === yRef.current) zRef.current?.focus();
    }
  }, [handleSubmit]);

  const fmt = (n: number) => n.toFixed(2);

  return (
    <div className="flex items-center gap-2 text-[9px] font-mono">
      {/* Mode selector */}
      <div className="flex items-center gap-0.5 bg-[#161b22] rounded border border-[#21262d]">
        <button
          onClick={() => setMode("absolute")}
          className={`px-1.5 py-0.5 rounded-l text-[8px] font-semibold transition-colors ${
            mode === "absolute" ? "bg-[#00D4FF]/15 text-[#00D4FF]" : "text-slate-500 hover:text-white"
          }`}
          title="Absolute coordinates (#)"
        >
          ABS
        </button>
        <button
          onClick={() => setMode("relative")}
          className={`px-1.5 py-0.5 text-[8px] font-semibold transition-colors ${
            mode === "relative" ? "bg-[#00D4FF]/15 text-[#00D4FF]" : "text-slate-500 hover:text-white"
          }`}
          title="Relative coordinates (@)"
        >
          REL
        </button>
        <button
          onClick={() => setMode("polar")}
          className={`px-1.5 py-0.5 rounded-r text-[8px] font-semibold transition-colors ${
            mode === "polar" ? "bg-[#00D4FF]/15 text-[#00D4FF]" : "text-slate-500 hover:text-white"
          }`}
          title="Polar coordinates (<)"
        >
          POL
        </button>
      </div>

      {/* Coordinate display / input */}
      {inputActive ? (
        <div className="flex items-center gap-1">
          {mode === "polar" ? (
            <>
              <span className="text-slate-500">d:</span>
              <input
                ref={xRef}
                type="text"
                value={rInput}
                onChange={(e) => setRInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-14 bg-[#0d1117] border border-[#00D4FF]/40 rounded px-1 py-0.5 text-[9px] text-white outline-none font-mono"
                autoFocus
                placeholder="dist"
              />
              <span className="text-slate-500">&lt;</span>
              <input
                type="text"
                value={aInput}
                onChange={(e) => setAInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-12 bg-[#0d1117] border border-[#00D4FF]/40 rounded px-1 py-0.5 text-[9px] text-white outline-none font-mono"
                placeholder="ang°"
              />
            </>
          ) : (
            <>
              <span className="text-slate-500">{mode === "relative" ? "d" : ""}X:</span>
              <input
                ref={xRef}
                type="text"
                value={xInput}
                onChange={(e) => setXInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-14 bg-[#0d1117] border border-[#00D4FF]/40 rounded px-1 py-0.5 text-[9px] text-white outline-none font-mono"
                autoFocus
                placeholder="0.00"
              />
              <span className="text-slate-500">{mode === "relative" ? "d" : ""}Y:</span>
              <input
                ref={yRef}
                type="text"
                value={yInput}
                onChange={(e) => setYInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-14 bg-[#0d1117] border border-[#00D4FF]/40 rounded px-1 py-0.5 text-[9px] text-white outline-none font-mono"
                placeholder="0.00"
              />
              {!sketchPlane && (
                <>
                  <span className="text-slate-500">{mode === "relative" ? "d" : ""}Z:</span>
                  <input
                    ref={zRef}
                    type="text"
                    value={zInput}
                    onChange={(e) => setZInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-14 bg-[#0d1117] border border-[#00D4FF]/40 rounded px-1 py-0.5 text-[9px] text-white outline-none font-mono"
                    placeholder="0.00"
                  />
                </>
              )}
            </>
          )}
          <button
            onClick={handleSubmit}
            className="px-1.5 py-0.5 rounded bg-[#00D4FF]/15 text-[#00D4FF] text-[8px] font-bold hover:bg-[#00D4FF]/25 transition-colors"
          >
            GO
          </button>
          <button
            onClick={() => setInputActive(false)}
            className="px-1 py-0.5 text-slate-500 hover:text-white text-[8px] transition-colors"
          >
            ESC
          </button>
        </div>
      ) : (
        <div
          className="flex items-center gap-1 cursor-pointer hover:bg-[#161b22] rounded px-1 py-0.5 transition-colors"
          onClick={() => {
            setInputActive(true);
            setTimeout(() => xRef.current?.focus(), 50);
          }}
          title="Click to enter coordinates (# absolute, @ relative, < polar)"
        >
          <Crosshair size={9} className="text-slate-500" />
          <span className="text-slate-500">
            {cursorPosition
              ? `X:${fmt(cursorPosition[0])} Y:${fmt(cursorPosition[1])} Z:${fmt(cursorPosition[2])}`
              : "X:— Y:— Z:—"}
          </span>
          <span className="text-[7px] text-slate-700 ml-1">
            {sketchPlane ? `[${sketchPlane.toUpperCase()}]` : "[3D]"}
          </span>
        </div>
      )}

      {/* Unit indicator */}
      <span className="text-[8px] text-slate-600 border-l border-[#21262d] pl-1.5">{unit}</span>
    </div>
  );
}
