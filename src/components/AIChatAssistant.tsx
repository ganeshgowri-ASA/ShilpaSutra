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

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const responses: Record<string, string> = {
        gear: 'I can generate a parametric gear for you. To create a gear with 24 teeth and 50mm pitch diameter, I would use the involute profile equation. The module would be m = 50/24 = 2.08mm. Shall I generate the KCL code and 3D model?',
        bracket: 'For a mounting bracket, I will create an L-shaped profile with configurable dimensions, fillet radii, and hole patterns. What material and load requirements do you have?',
        simulation: 'I can set up a simulation for your model. Supported analysis types include: Static Stress (FEA), Thermal Analysis, CFD Flow, Modal Analysis, and Fatigue. Which type would you like?',
        export: 'ShilpaSutra supports export to: STEP, STL, OBJ, IGES, GLTF, PLY, 3MF, BREP, PARASOLID, and DXF formats. Which format do you need?',
      };
      const lc = userMsg.content.toLowerCase();
      let reply = 'I understand your request. Let me analyze it and provide the best approach for your CAD design. Could you provide more specific dimensions or constraints?';
      if (lc.includes('gear')) reply = responses.gear;
      else if (lc.includes('bracket') || lc.includes('mount')) reply = responses.bracket;
      else if (lc.includes('simulat') || lc.includes('fea') || lc.includes('cfd')) reply = responses.simulation;
      else if (lc.includes('export') || lc.includes('step') || lc.includes('stl')) reply = responses.export;

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: reply, timestamp: new Date() }]);
      setIsTyping(false);
    }, 1500);
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
