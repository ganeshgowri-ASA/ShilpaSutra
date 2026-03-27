"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { X, Loader2, Send, Paperclip, ChevronDown, Minus, Maximize2, MessageSquare, Wand2, Zap, HelpCircle, CheckCircle2, SkipForward } from "lucide-react";
import { useCadStore } from "@/stores/cad-store";
import { runReasoningEngine } from "@/lib/ai-reasoning-engine";

const CHIPS = ["Dumbbell 20mm dia 20mm bar","Spur gear M2 Z20","L-bracket 100x80x3mm","Pipe flange DN50 PN16","Solar PV module 2mx1m","Hex bolt M8x40","Heat sink 50mm 12 fins","Bearing housing 30mm bore","Enclosure 150x100x60mm","T-slot 20x20 300mm","Hex nut M10","Cone 40mm base 80mm high"];
const SUGGESTIONS = [...CHIPS,"gear 24 teeth module 2mm","cylinder 25mm dia 120mm","plate 100x80mm 4 holes 6mm","pipe OD50 wall 3mm 200mm","NEMA 23 bracket","sphere 30mm","box 60x40x30mm","heatsink 60x60mm 10 fins"];

const CLARIFY: Record<string, string[]> = {
  bracket: ["Dimensions (LxWxH)?","Mounting holes?","Wall thickness (mm)?"],
  gear:    ["Module?","Teeth count?","Face width (mm)?"],
  box:     ["Outer dims (LxWxH)?","Wall thickness?","Add lid?"],
  pipe:    ["Outer diameter (mm)?","Wall thickness?","Length (mm)?"],
  flange:  ["Nominal bore (DN)?","Pressure rating (PN)?"],
  housing: ["Bore diameter (mm)?","Outer diameter?","Width (mm)?"],
  default: ["What dimensions?","What material?","Mounting holes?","Special features?"],
};

function getQuestions(prompt: string): string[] | null {
  const p = prompt.toLowerCase().trim();
  if (p.split(/\s+/).length >= 4 || /\d/.test(p)) return null;
  for (const [k, v] of Object.entries(CLARIFY)) if (p.includes(k)) return v;
  if (p.split(/\s+/).length <= 3) return CLARIFY.default;
  return null;
}

type Mode = "Normal" | "Extended" | "Deep";
type AIToolType = "ai_text_to_cad"|"ai_suggest"|"ai_optimize"|"ai_explain"|"ai_fea"|"ai_cfd";

const META: Record<AIToolType,{title:string;icon:React.ReactNode;placeholder:string;color:string}> = {
  ai_text_to_cad:{title:"Text to CAD",icon:<MessageSquare size={13}/>,placeholder:"Describe the 3D object…",color:"purple"},
  ai_suggest:    {title:"Suggest Fix", icon:<Wand2 size={13}/>,        placeholder:"Describe issue…",color:"amber"},
  ai_optimize:   {title:"Optimize",    icon:<Zap size={13}/>,           placeholder:"Optimization goal…",color:"emerald"},
  ai_explain:    {title:"Explain",     icon:<HelpCircle size={13}/>,    placeholder:"What to explain?",color:"blue"},
  ai_fea:        {title:"Stress",      icon:<Zap size={13}/>,           placeholder:"Loading conditions…",color:"red"},
  ai_cfd:        {title:"Flow",        icon:<Zap size={13}/>,           placeholder:"Flow conditions…",color:"cyan"},
};

const C: Record<string,{bg:string;bd:string;tx:string;hv:string;lt:string;cp:string}> = {
  purple: {bg:"bg-purple-600",bd:"border-purple-500/30",tx:"text-purple-400",hv:"hover:bg-purple-700",lt:"bg-purple-500/10",cp:"bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 border-purple-500/20"},
  amber:  {bg:"bg-amber-600", bd:"border-amber-500/30", tx:"text-amber-400", hv:"hover:bg-amber-700", lt:"bg-amber-500/10", cp:"bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border-amber-500/20"},
  emerald:{bg:"bg-emerald-600",bd:"border-emerald-500/30",tx:"text-emerald-400",hv:"hover:bg-emerald-700",lt:"bg-emerald-500/10",cp:"bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/20"},
  blue:   {bg:"bg-blue-600",  bd:"border-blue-500/30",  tx:"text-blue-400",  hv:"hover:bg-blue-700",  lt:"bg-blue-500/10",  cp:"bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 border-blue-500/20"},
  red:    {bg:"bg-red-600",   bd:"border-red-500/30",   tx:"text-red-400",   hv:"hover:bg-red-700",   lt:"bg-red-500/10",   cp:"bg-red-500/15 hover:bg-red-500/30 text-red-300 border-red-500/20"},
  cyan:   {bg:"bg-cyan-600",  bd:"border-cyan-500/30",  tx:"text-cyan-400",  hv:"hover:bg-cyan-700",  lt:"bg-cyan-500/10",  cp:"bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/20"},
};

export default function AIToolPanelEnhanced({toolType,onClose}:{toolType:AIToolType;onClose:()=>void}) {
  const [input,setInput]           = useState("");
  const [loading,setLoading]       = useState(false);
  const [result,setResult]         = useState<string|null>(null);
  const [error,setError]           = useState<string|null>(null);
  const [minimized,setMinimized]   = useState(false);
  const [mode,setMode]             = useState<Mode>("Normal");
  const [showModeMenu,setModeMenu] = useState(false);
  const [file,setFile]             = useState<{name:string;url:string;isImg:boolean;base64?:string}|null>(null);
  const [analyzing,setAnalyzing]   = useState(false);
  const [questions,setQuestions]   = useState<string[]|null>(null);
  const [answers,setAnswers]       = useState<Record<string,string>>({});
  const [showAc,setShowAc]         = useState(false);
  const [acIdx,setAcIdx]           = useState(-1);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  const addObj   = useCadStore(s=>s.addGeneratedObject);
  const addAsm   = useCadStore(s=>s.addAssemblyFromParts);
  const objects  = useCadStore(s=>s.objects);
  const selId    = useCadStore(s=>s.selectedId);
  const selObj   = objects.find(o=>o.id===selId);
  const m = META[toolType]; const c = C[m.color];
  const isCAD = toolType==="ai_text_to_cad";
  const acList = isCAD ? (input.trim().length<2 ? SUGGESTIONS.slice(0,8) : SUGGESTIONS.filter(s=>s.toLowerCase().includes(input.toLowerCase())).slice(0,8)) : [];

  useEffect(()=>{ inputRef.current?.focus(); },[]);

  const pick = useCallback((s:string)=>{ setInput(s); setShowAc(false); setAcIdx(-1); setTimeout(()=>inputRef.current?.focus(),0); },[]);

  const doGen = useCallback(async(prompt:string)=>{
    setLoading(true); setResult(null); setError(null);
    const imageBase64 = file?.isImg ? file.base64 : undefined;
    if (imageBase64) setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/generate",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          prompt:`[${m.title.toUpperCase()}] ${prompt}`,
          thinkingMode:mode,
          imageBase64: imageBase64 || undefined,
          context:{tool:toolType,selectedObject:selObj?{name:selObj.name,type:selObj.type}:null,sceneObjectCount:objects.length},
        })});
      setAnalyzing(false);
      const d = await res.json();
      if (d.error) { setError(d.error); return; }
      if (d.assemblyParts?.length>0) { addAsm(d.assemblyParts,d.object?.name||"Assembly"); setResult(`Created "${d.object?.name||"Assembly"}" with ${d.assemblyParts.length} parts. ${d.message||""}`); }
      else if (d.object) { addObj(d.object); setResult(`Created "${d.object.name}" successfully. ${d.message||""}`); }
      else setResult(d.message||d.response||"Done.");
    } catch {
      setAnalyzing(false);
      if (isCAD) { try { const r=runReasoningEngine(prompt); if(r.parts.length>0){addAsm(r.parts,r.objectType);setResult(`Created "${r.objectType}" (${r.parts.length} parts, offline). ${r.summary}`);}else setResult("Could not parse. Try: 'box 50x30x20mm' or 'gear 20 teeth M2'."); } catch { setResult("Generation failed. Try a simpler description."); } }
      else setError("Request failed. Check connection.");
    } finally { setLoading(false); }
  },[m.title,mode,file,toolType,selObj,objects,isCAD,addObj,addAsm]);

  const submit = useCallback(()=>{
    if (!input.trim()||loading) return;
    setShowAc(false);
    if (isCAD && !questions) { const q=getQuestions(input.trim()); if(q){setQuestions(q);return;} }
    const extra = Object.entries(answers).filter(([,v])=>v.trim()).map(([q,a])=>`${q} ${a}`).join(", ");
    setQuestions(null); setAnswers({});
    doGen(input.trim()+(extra?"\n"+extra:""));
  },[input,loading,isCAD,questions,answers,doGen]);

  if (minimized) return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
      <div className={`bg-[#0d1117]/95 backdrop-blur-xl border ${c.bd} rounded-lg shadow-lg px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-[#161b22]`} onClick={()=>setMinimized(false)}>
        <span className={c.tx}>{m.icon}</span><span className="text-[11px] font-bold text-white">{m.title}</span>
        {result&&<span className="text-[9px] text-slate-500 truncate max-w-[140px]">{result.slice(0,45)}…</span>}
        <button onClick={e=>{e.stopPropagation();setMinimized(false);}} className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white"><Maximize2 size={11}/></button>
        <button onClick={e=>{e.stopPropagation();onClose();}} className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-red-400"><X size={11}/></button>
      </div>
    </div>
  );

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-[460px] max-h-[85vh] overflow-y-auto">
      <div className={`bg-[#0d1117]/97 backdrop-blur-xl border ${c.bd} rounded-xl shadow-2xl shadow-black/50 overflow-hidden`}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#21262d]">
          <div className="flex items-center gap-2">
            <span className={c.tx}>{m.icon}</span>
            <span className="text-xs font-bold text-white">{m.title}</span>
            {selObj&&<span className="text-[9px] bg-[#21262d] text-slate-400 rounded px-1.5 py-0.5">{selObj.name}</span>}
          </div>
          <div className="flex gap-1">
            <button onClick={()=>setMinimized(true)} className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#21262d] transition-colors"><Minus size={13}/></button>
            <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><X size={13}/></button>
          </div>
        </div>

        {/* Prompt chips */}
        {isCAD&&(
          <div className="px-4 pt-3 pb-2">
            <p className="text-[9px] text-slate-600 uppercase tracking-wider font-semibold mb-1.5">Quick prompts</p>
            <div className="flex flex-wrap gap-1.5">
              {CHIPS.map(chip=>(
                <button key={chip} onClick={()=>pick(chip)} className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${c.cp}`}>{chip}</button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-3">
          <div className="relative">
            <textarea ref={inputRef} value={input}
              onChange={e=>{setInput(e.target.value);setShowAc(true);setAcIdx(-1);}}
              onFocus={()=>setShowAc(true)} onBlur={()=>setTimeout(()=>setShowAc(false),150)}
              onKeyDown={e=>{
                if(showAc&&acList.length>0){
                  if(e.key==="ArrowDown"){e.preventDefault();setAcIdx(i=>Math.min(i+1,acList.length-1));return;}
                  if(e.key==="ArrowUp"){e.preventDefault();setAcIdx(i=>Math.max(i-1,-1));return;}
                  if(e.key==="Tab"&&acIdx>=0){e.preventDefault();pick(acList[acIdx]);return;}
                }
                if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();if(showAc&&acIdx>=0)pick(acList[acIdx]);else{setShowAc(false);submit();}}
                if(e.key==="Escape"){showAc?setShowAc(false):setMinimized(true);}
              }}
              placeholder={m.placeholder} rows={2}
              className="w-full bg-[#161b22] text-xs text-slate-200 rounded-lg px-3 py-2.5 pr-20 outline-none border border-[#21262d] focus:border-purple-500/50 resize-none placeholder-slate-600"
            />
            <div className="absolute right-2 bottom-2.5 flex items-center gap-1">
              <button onClick={()=>fileRef.current?.click()} className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${file?"text-purple-400 bg-purple-500/15":"text-slate-500 hover:text-slate-300 hover:bg-[#21262d]"}`} title="Attach file"><Paperclip size={12}/></button>
              <input ref={fileRef} type="file" accept="image/*,.pdf,.dxf,.svg" className="hidden" onChange={e=>{
                const f=e.target.files?.[0];
                if(f){
                  const url=URL.createObjectURL(f);
                  const isImg=f.type.startsWith("image/");
                  if(isImg){const reader=new FileReader();reader.onload=ev=>{setFile({name:f.name,url,isImg,base64:ev.target?.result as string});};reader.readAsDataURL(f);}
                  else setFile({name:f.name,url,isImg:false});
                }
                e.target.value="";
              }}/>
              <button onClick={submit} disabled={!input.trim()||loading} className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${input.trim()&&!loading?`${c.bg} text-white ${c.hv}`:"bg-[#21262d] text-slate-600 cursor-not-allowed"}`}>
                {loading?<Loader2 size={12} className="animate-spin"/>:analyzing?<Loader2 size={12} className="animate-spin text-yellow-400"/>:<Send size={12}/>}
              </button>
            </div>
            {/* Autocomplete */}
            {showAc&&acList.length>0&&isCAD&&(
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#0d1117] border border-[#21262d] rounded-lg shadow-2xl max-h-[160px] overflow-y-auto">
                {input.trim().length<2&&<div className="px-3 py-1.5 text-[9px] text-slate-600 uppercase tracking-wider border-b border-[#21262d]">Suggestions</div>}
                {acList.map((s,i)=>(
                  <button key={s} onMouseDown={e=>{e.preventDefault();pick(s);}} className={`w-full text-left px-3 py-2 text-[11px] truncate transition-colors ${i===acIdx?"bg-purple-600/20 text-purple-300":"text-slate-300 hover:bg-[#161b22] hover:text-white"}`}>{s}</button>
                ))}
              </div>
            )}
          </div>

          {/* File preview + thinking mode */}
          {(file||isCAD)&&(
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {file&&(
                <div className="flex items-center gap-1.5 bg-[#161b22] border border-[#21262d] rounded-md px-2 py-1">
                  {file.isImg
                    // eslint-disable-next-line @next/next/no-img-element
                    ?<img src={file.url} alt="preview" className="w-8 h-8 rounded object-cover"/>
                    :<div className="w-8 h-8 rounded bg-[#21262d] flex items-center justify-center text-[9px] text-slate-400 font-mono uppercase">{file.name.split(".").pop()}</div>}
                  <span className="text-[10px] text-slate-400 max-w-[110px] truncate">{file.name}</span>
                  <button onClick={()=>setFile(null)} className="text-slate-600 hover:text-red-400"><X size={10}/></button>
                </div>
              )}
              {isCAD&&(
                <div className="relative ml-auto">
                  <button onBlur={()=>setTimeout(()=>setModeMenu(false),150)} onClick={()=>setModeMenu(!showModeMenu)}
                    className="flex items-center gap-1 text-[10px] text-slate-400 bg-[#161b22] border border-[#21262d] rounded-md px-2 py-1 hover:border-[#30363d] transition-colors">
                    <span>{mode==="Deep"?"🧠":mode==="Extended"?"💡":"⚡"}</span>{mode}<ChevronDown size={9}/>
                  </button>
                  {showModeMenu&&(
                    <div className="absolute right-0 top-full mt-1 z-50 bg-[#0d1117] border border-[#21262d] rounded-lg shadow-xl min-w-[140px]">
                      {(["Normal","Extended","Deep"] as Mode[]).map(md=>(
                        <button key={md} onMouseDown={e=>{e.preventDefault();setMode(md);setModeMenu(false);}}
                          className={`w-full text-left px-3 py-2 text-[11px] hover:bg-[#161b22] flex items-center gap-2 ${mode===md?"text-white font-semibold":"text-slate-400"}`}>
                          <span>{md==="Deep"?"🧠":md==="Extended"?"💡":"⚡"}</span>
                          <div><div>{md}</div><div className="text-[9px] text-slate-600">{md==="Normal"?"Fast":md==="Extended"?"More reasoning":"Full chain-of-thought"}</div></div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Clarifying questions */}
        {questions&&(
          <div className="px-4 pb-3">
            <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2"><HelpCircle size={11} className="text-amber-400"/><span className="text-[10px] font-semibold text-amber-400">A few quick questions…</span></div>
              <div className="space-y-2">
                {questions.map(q=>(
                  <div key={q} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 w-[140px] shrink-0">{q}</span>
                    <input type="text" value={answers[q]||""} onChange={e=>setAnswers(a=>({...a,[q]:e.target.value}))} placeholder="optional"
                      className="flex-1 bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-[10px] text-slate-200 placeholder-slate-700 outline-none focus:border-purple-500/40"/>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2.5">
                <button onClick={()=>submit()} className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] font-semibold py-1.5 rounded-md ${c.bg} text-white ${c.hv} transition-colors`}>
                  <CheckCircle2 size={11}/> Generate with answers
                </button>
                <button onClick={()=>{setQuestions(null);setAnswers({});doGen(input.trim());}} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 px-2 transition-colors">
                  <SkipForward size={11}/> Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Result / Error */}
        {(result||error)&&(
          <div className="px-4 pb-3">
            <div className={`rounded-lg px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${error?`bg-red-500/10 border border-red-500/20 text-red-400`:`${c.lt} border ${c.bd} ${c.tx}`}`}>{error||result}</div>
          </div>
        )}

        {/* Loading */}
        {loading&&(
          <div className="px-4 pb-3">
            <div className={`flex items-center gap-2 ${c.tx} text-xs`}>
              <Loader2 size={12} className="animate-spin"/>
              <span>{analyzing?"Analyzing image…":mode==="Deep"?"Deep reasoning…":mode==="Extended"?"Extended thinking…":"Generating…"}</span>
              {mode!=="Normal"&&<span className="text-[9px] text-slate-600">{mode==="Deep"?"(up to 8k tokens)":"(up to 4k tokens)"}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
