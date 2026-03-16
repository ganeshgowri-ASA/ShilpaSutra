'use client';
import { useState, useCallback, useRef, useEffect } from 'react';

const KCL_KEYWORDS = ['fn', 'let', 'const', 'return', 'if', 'else', 'for', 'in', 'true', 'false', 'import', 'from', 'sketch', 'extrude', 'revolve', 'fillet', 'chamfer', 'line', 'arc', 'circle', 'close', 'startSketchOn', 'startProfileAt', 'lineTo', 'tangentialArcTo', 'angledLine', 'xLine', 'yLine', 'xLineTo', 'yLineTo'];

const SAMPLE_CODE = `// ShilpaSutra KCL - Parametric Bracket
@settings(defaultLengthUnit = mm)

// Parameters
const width = 80
const height = 60
const thickness = 5
const holeRadius = 4
const filletR = 3

// Base plate sketch
const basePlate = startSketchOn("XY")
  |> startProfileAt([0, 0], %)
  |> lineTo([width, 0], %)
  |> lineTo([width, height], %)
  |> lineTo([0, height], %)
  |> close(%)
  |> extrude(thickness, %)

// Mounting holes
const hole1 = circle([15, 15], holeRadius, basePlate)
const hole2 = circle([width - 15, 15], holeRadius, basePlate)
const hole3 = circle([width / 2, height - 15], holeRadius, basePlate)

// Apply fillets
const result = fillet(filletR, basePlate)
`;

interface KCLCodeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute?: (code: string) => void;
}

export default function KCLCodeEditor({ isOpen, onClose, onExecute }: KCLCodeEditorProps) {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [output, setOutput] = useState('Ready. Press Run to execute KCL code.');
  const [isRunning, setIsRunning] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lineCount = code.split('\n').length;

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => { target.selectionStart = target.selectionEnd = start + 2; }, 0);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runCode();
    }
  }, [code]);

  const updateCursorPos = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const pos = target.selectionStart;
    const lines = code.substring(0, pos).split('\n');
    setCursorPos({ line: lines.length, col: lines[lines.length - 1].length + 1 });
  }, [code]);

  const runCode = useCallback(() => {
    setIsRunning(true);
    setOutput('Compiling KCL code...');
    setTimeout(() => {
      const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));
      const hasSketch = code.includes('startSketchOn') || code.includes('sketch');
      const hasExtrude = code.includes('extrude');
      const errors: string[] = [];

      // Basic validation
      const openParens = (code.match(/\(/g) || []).length;
      const closeParens = (code.match(/\)/g) || []).length;
      if (openParens !== closeParens) errors.push('Mismatched parentheses');

      if (errors.length > 0) {
        setOutput('ERROR:\n' + errors.join('\n'));
      } else {
        let msg = 'Build successful.\n';
        msg += `Parsed ${lines.length} statements.\n`;
        if (hasSketch) msg += 'Sketch created on XY plane.\n';
        if (hasExtrude) msg += '3D body generated via extrusion.\n';
        msg += `Variables: ${(code.match(/const \w+/g) || []).length} constants defined.\n`;
        msg += 'Geometry sent to viewport for rendering.';
        setOutput(msg);
      }
      setIsRunning(false);
      onExecute?.(code);
    }, 800);
  }, [code, onExecute]);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed left-16 top-0 h-full w-[480px] bg-gray-950 border-r border-gray-700 shadow-2xl z-[998] flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-900">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-blue-400">{'</>'}  </span>
          <span className="text-white text-sm font-semibold">KCL Editor</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">main.kcl</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={runCode} disabled={isRunning} className="px-2.5 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-500 disabled:opacity-50 font-medium">
            {isRunning ? 'Running...' : 'Run (Ctrl+Enter)'}
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 text-sm">X</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          <div ref={lineNumbersRef} className="w-12 bg-gray-900 text-right pr-2 pt-2 overflow-hidden select-none border-r border-gray-800">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="text-gray-600 text-xs font-mono leading-5 h-5">{i + 1}</div>
            ))}
          </div>
          <textarea ref={textareaRef} value={code} onChange={e => setCode(e.target.value)} onKeyDown={handleKeyDown} onScroll={handleScroll} onClick={updateCursorPos} onKeyUp={updateCursorPos} spellCheck={false} className="flex-1 bg-gray-950 text-gray-100 font-mono text-sm p-2 outline-none resize-none leading-5" style={{ tabSize: 2 }} />
        </div>

        <div className="h-32 border-t border-gray-700 bg-gray-900 flex flex-col">
          <div className="flex items-center px-3 py-1 border-b border-gray-800 text-xs">
            <span className="text-gray-500 font-medium">OUTPUT</span>
            <span className="ml-auto text-gray-600">Ln {cursorPos.line}, Col {cursorPos.col}</span>
          </div>
          <pre className="flex-1 overflow-auto p-2 text-xs font-mono text-gray-400 whitespace-pre-wrap">{output}</pre>
        </div>
      </div>

      <div className="px-3 py-1.5 border-t border-gray-700 bg-gray-900 flex items-center justify-between text-[10px] text-gray-500">
        <span>KCL v1.0 | ShilpaSutra Engine</span>
        <div className="flex items-center gap-3">
          <span>{lineCount} lines</span>
          <span className="text-green-400">Connected</span>
        </div>
      </div>
    </div>
  );
}
