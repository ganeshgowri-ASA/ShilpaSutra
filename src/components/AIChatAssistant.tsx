'use client';
import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  'Create a gear with 24 teeth and 50mm pitch diameter',
  'Design a bracket with mounting holes',
  'Generate a pipe flange DN50 PN16',
  'Create a heat sink with 12 fins',
  'Design a bearing housing for 6205 bearing',
];

export default function AIChatAssistant({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Hello! I am ShilpaSutra AI Assistant. I can help you design CAD models, run simulations, and answer engineering questions. Try asking me to create a part or explain a concept.', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Parse and execute CAD commands
    setTimeout(() => {
      const lc = userMsg.content.toLowerCase().trim();
      const store = (window as any).__cadStore || null;
      let reply = '';

      try {
        // Import store dynamically to avoid SSR issues
        const { useCadStore } = require('@/stores/cad-store');
        const cadStore = useCadStore.getState();

        // ── Extrude command ──
        const extrudeMatch = lc.match(/extrude\s+(\d+(?:\.\d+)?)\s*(mm|cm|m)?/);
        if (extrudeMatch) {
          const dist = parseFloat(extrudeMatch[1]) / 10; // mm to scene units
          const result = cadStore.aiExtrude(dist);
          if (result) {
            reply = `Extruded selected sketch profile by ${extrudeMatch[1]}${extrudeMatch[2] || 'mm'}. Created solid body in Feature Tree.`;
          } else {
            reply = 'No valid sketch profile selected. Please select a rectangle or circle first, then try again.';
          }
        }
        // ── Fillet command ──
        else if (lc.match(/fillet\s+(\d+(?:\.\d+)?)\s*(mm|cm|m)?/)) {
          const match = lc.match(/fillet\s+(\d+(?:\.\d+)?)\s*(mm|cm|m)?/)!;
          const radius = parseFloat(match[1]);
          const success = cadStore.aiFilletSelected(radius);
          reply = success
            ? `Applied ${radius}mm fillet to selected solid. Edges rounded.`
            : 'Cannot fillet: select a solid body (box, cylinder, etc.) first.';
        }
        // ── Chamfer command ──
        else if (lc.match(/chamfer\s+(\d+(?:\.\d+)?)\s*(mm|cm|m)?/)) {
          const match = lc.match(/chamfer\s+(\d+(?:\.\d+)?)\s*(mm|cm|m)?/)!;
          const distance = parseFloat(match[1]);
          const success = cadStore.aiChamferSelected(distance);
          reply = success
            ? `Applied ${distance}mm chamfer to selected solid.`
            : 'Cannot chamfer: select a solid body first.';
        }
        // ── Mirror command ──
        else if (lc.match(/mirror\s+(xy|xz|yz)/)) {
          const match = lc.match(/mirror\s+(xy|xz|yz)/)!;
          const plane = match[1] as 'xy' | 'xz' | 'yz';
          const ids = cadStore.aiMirror(plane);
          reply = ids.length > 0
            ? `Mirrored selected object across ${plane.toUpperCase()} plane.`
            : 'No object selected to mirror.';
        }
        // ── Rotate command ──
        else if (lc.match(/rotate\s+(-?\d+(?:\.\d+)?)\s*(x|y|z)?/)) {
          const match = lc.match(/rotate\s+(-?\d+(?:\.\d+)?)\s*(x|y|z)?/)!;
          const angle = parseFloat(match[1]);
          const axis = (match[2] || 'y') as 'x' | 'y' | 'z';
          const success = cadStore.aiRotate(angle, axis);
          reply = success
            ? `Rotated selected object ${angle}° around ${axis.toUpperCase()} axis.`
            : 'No object selected to rotate.';
        }
        // ── Scale command ──
        else if (lc.match(/scale\s+(\d+(?:\.\d+)?)/)) {
          const match = lc.match(/scale\s+(\d+(?:\.\d+)?)/)!;
          const factor = parseFloat(match[1]);
          const success = cadStore.aiScale(factor);
          reply = success
            ? `Scaled selected object by factor ${factor}.`
            : 'No object selected to scale.';
        }
        // ── Add hole command ──
        else if (lc.match(/(?:add\s+)?hole\s+(\d+(?:\.\d+)?)\s*(mm|cm|m)?/)) {
          const match = lc.match(/(?:add\s+)?hole\s+(\d+(?:\.\d+)?)\s*(mm|cm|m)?/)!;
          const diameter = parseFloat(match[1]);
          const id = cadStore.aiAddHole(diameter, diameter * 2);
          reply = id
            ? `Added ${diameter}mm hole to selected solid.`
            : 'No object selected. Select a solid first.';
        }
        // ── Shell command ──
        else if (lc.match(/shell\s+(\d+(?:\.\d+)?)\s*(mm|cm|m)?/)) {
          const match = lc.match(/shell\s+(\d+(?:\.\d+)?)\s*(mm|cm|m)?/)!;
          const thickness = parseFloat(match[1]);
          const success = cadStore.aiShell(thickness);
          reply = success
            ? `Applied shell with ${thickness}mm wall thickness.`
            : 'Cannot shell: select a solid body first.';
        }
        // ── Create gear command ──
        else if (lc.match(/gear\s+(\d+)\s*(?:teeth|t)/)) {
          const match = lc.match(/gear\s+(\d+)\s*(?:teeth|t)(?:\s+(?:module|m)\s*(\d+(?:\.\d+)?))?(?:\s+(?:width|w)\s*(\d+(?:\.\d+)?))?/)!;
          const teeth = parseInt(match[1]);
          const mod = parseFloat(match[2] || '2');
          const width = parseFloat(match[3] || '10');
          cadStore.aiCreateGear(teeth, mod, width);
          reply = `Created ${teeth}-tooth gear (module ${mod}, width ${width}mm).`;
        }
        // ── Add primitive shapes ──
        else if (lc.match(/(?:add|create)\s+(box|cube|cylinder|sphere|cone)/)) {
          const match = lc.match(/(?:add|create)\s+(box|cube|cylinder|sphere|cone)/)!;
          const type = match[1] === 'cube' ? 'box' : match[1] as any;
          cadStore.addObject(type);
          reply = `Created a ${match[1]} in the scene. You can modify its properties in the Property Panel.`;
        }
        // ── Delete selected ──
        else if (lc.match(/delete|remove/)) {
          const sel = cadStore.getSelected();
          if (sel) {
            cadStore.deleteSelected();
            reply = `Deleted ${sel.name}.`;
          } else {
            reply = 'No object selected to delete.';
          }
        }
        // ── Undo ──
        else if (lc.match(/\bundo\b/)) {
          cadStore.undo();
          reply = 'Undone last action.';
        }
        // ── Default response ──
        else {
          reply = `I can execute these commands on your scene:\n` +
            `• "extrude 10mm" - Extrude selected sketch\n` +
            `• "fillet 2mm" - Round edges of selected solid\n` +
            `• "chamfer 1mm" - Bevel edges\n` +
            `• "mirror XZ" - Mirror across plane\n` +
            `• "rotate 45 Y" - Rotate around axis\n` +
            `• "scale 1.5" - Scale selected object\n` +
            `• "add hole 5mm" - Subtract hole from solid\n` +
            `• "shell 2mm" - Hollow out solid\n` +
            `• "gear 24 teeth" - Create gear\n` +
            `• "add box/cylinder/sphere" - Create primitive\n` +
            `• "delete" - Remove selected\n` +
            `Try a command!`;
        }
      } catch (err) {
        reply = 'Error executing command. Please try again.';
        console.warn('[AI Assistant] Error:', err);
      }

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: reply, timestamp: new Date() }]);
      setIsTyping(false);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-700 shadow-2xl z-[999] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-lg">\uD83E\uDD16</span>
          <div>
            <h3 className="text-white font-semibold text-sm">ShilpaSutra AI</h3>
            <span className="text-xs text-green-400">Online</span>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700">\u2715</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200 border border-gray-700'
            }`}>
              {msg.content}
              <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-400">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-3 py-2 border-t border-gray-700">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {SUGGESTIONS.slice(0, 3).map((s, i) => (
            <button key={i} onClick={() => setInput(s)} className="text-[10px] px-2 py-1 bg-gray-800 text-gray-400 rounded-full border border-gray-700 hover:border-blue-500 hover:text-blue-400 transition-colors truncate max-w-[180px]">
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Ask AI anything..." className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2.5 text-sm outline-none border border-gray-700 focus:border-blue-500" />
          <button onClick={sendMessage} disabled={!input.trim()} className="px-3 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
