"use client";
import { useRef } from "react";
import { Paperclip, X, FileText, FileCode2 } from "lucide-react";

export interface Attachment {
  id: string;
  name: string;
  ext: string;
  type: "image" | "cad" | "doc" | "pdf";
  url: string;
  base64?: string;
  /** Textual hint injected into the AI prompt */
  contextHint: string;
}

const MAX_ATTACHMENTS = 3;
const ACCEPT = "image/*,.pdf,.dxf,.step,.stp,.iges,.igs,.docx,.doc";

function classify(file: File): Attachment["type"] {
  if (file.type.startsWith("image/")) return "image";
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (["dxf", "step", "stp", "iges", "igs"].includes(ext)) return "cad";
  if (["docx", "doc"].includes(ext)) return "doc";
  return "pdf";
}

function contextHint(type: Attachment["type"], name: string): string {
  if (type === "image") return `Reference image attached: ${name}`;
  if (type === "cad") return `CAD Reference: ${name} – use dimensions from this file`;
  if (type === "doc") return `Specification document: ${name} – extract requirements`;
  return `Reference document: ${name}`;
}

function ExtBadge({ ext }: { ext: string }) {
  return (
    <div className="w-8 h-8 rounded bg-[#21262d] flex items-center justify-center text-[8px] font-mono uppercase text-slate-400">
      {ext.slice(0, 4)}
    </div>
  );
}

function FileIcon({ type }: { type: Attachment["type"] }) {
  if (type === "cad") return <FileCode2 size={14} className="text-orange-400" />;
  if (type === "doc") return <FileText size={14} className="text-blue-400" />;
  return <FileText size={14} className="text-slate-400" />;
}

interface Props {
  attachments: Attachment[];
  onChange: (next: Attachment[]) => void;
  /** Optional accent color class e.g. "text-purple-400" */
  accentClass?: string;
}

export default function AttachmentBar({
  attachments,
  onChange,
  accentClass = "text-purple-400",
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    const slots = MAX_ATTACHMENTS - attachments.length;
    Array.from(files)
      .slice(0, slots)
      .forEach((f) => {
        const type = classify(f);
        const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const ext = f.name.split(".").pop() ?? "";
        const url = URL.createObjectURL(f);
        const base: Attachment = {
          id,
          name: f.name,
          ext,
          type,
          url,
          contextHint: contextHint(type, f.name),
        };

        if (type === "image") {
          const reader = new FileReader();
          reader.onload = (ev) =>
            onChange([...attachments, { ...base, base64: ev.target?.result as string }]);
          reader.readAsDataURL(f);
        } else {
          onChange([...attachments, base]);
        }
      });
  };

  const remove = (id: string) => {
    const att = attachments.find((a) => a.id === id);
    if (att) URL.revokeObjectURL(att.url);
    onChange(attachments.filter((a) => a.id !== id));
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Existing attachments */}
      {attachments.map((att) => (
        <div
          key={att.id}
          className="flex items-center gap-1.5 bg-[#161b22] border border-[#21262d] rounded-md px-2 py-1 max-w-[180px]"
          title={att.contextHint}
        >
          {att.type === "image" && att.base64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={att.base64} alt={att.name} className="w-8 h-8 rounded object-cover shrink-0" />
          ) : (
            <ExtBadge ext={att.ext} />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-slate-300 truncate">{att.name}</div>
            <div className="text-[8px] text-slate-600 uppercase flex items-center gap-1">
              <FileIcon type={att.type} />
              {att.type}
            </div>
          </div>
          <button
            onClick={() => remove(att.id)}
            className="text-slate-600 hover:text-red-400 shrink-0 transition-colors"
            title="Remove"
          >
            <X size={10} />
          </button>
        </div>
      ))}

      {/* Add button */}
      {attachments.length < MAX_ATTACHMENTS && (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            className={`flex items-center gap-1 text-[10px] ${accentClass} opacity-60 hover:opacity-100 bg-[#161b22] border border-dashed border-[#21262d] hover:border-[#30363d] rounded-md px-2 py-1 transition-all`}
            title={`Attach file — PDF, DXF, STEP, IGES, PNG, JPG, Word (max ${MAX_ATTACHMENTS})`}
          >
            <Paperclip size={11} />
            <span>
              Attach{attachments.length > 0 ? ` (${MAX_ATTACHMENTS - attachments.length} left)` : ""}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </>
      )}
    </div>
  );
}

/** Build a prompt suffix from all attachments' context hints */
export function buildAttachmentContext(attachments: Attachment[]): string {
  if (attachments.length === 0) return "";
  return "\n\nAttached references:\n" + attachments.map((a) => `- ${a.contextHint}`).join("\n");
}

/** Get the first image attachment's base64 (for multimodal vision API) */
export function getImageBase64(attachments: Attachment[]): string | undefined {
  return attachments.find((a) => a.type === "image")?.base64;
}
