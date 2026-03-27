"use client";
import { useRef, useCallback } from "react";
import { Paperclip, X, FileText, Image, Box, File } from "lucide-react";
import { ACCEPTED_EXTENSIONS, getFileTypeLabel, getFileTypeIcon } from "@/lib/thinking-engine";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AttachedFile {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  preview?: string; // data URL for images
}

interface AttachmentUploadProps {
  attachments: AttachedFile[];
  onAttach: (files: AttachedFile[]) => void;
  onRemove: (id: string) => void;
  compact?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  image: <Image size={14} className="text-purple-400" />,
  cad: <Box size={14} className="text-[#00D4FF]" />,
  pdf: <FileText size={14} className="text-red-400" />,
  doc: <FileText size={14} className="text-blue-400" />,
  file: <File size={14} className="text-slate-400" />,
};

// ─── Component ──────────────────────────────────────────────────────────────

export function AttachmentUpload({ attachments, onAttach, onRemove, compact }: AttachmentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const newAttachments: AttachedFile[] = [];

      Array.from(fileList).forEach((file) => {
        const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
        if (!ACCEPTED_EXTENSIONS.includes(ext)) return;

        const attachment: AttachedFile = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          file,
          name: file.name,
          type: file.type || ext,
          size: file.size,
        };

        // Generate preview for images
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (e) => {
            attachment.preview = e.target?.result as string;
            onAttach([...attachments, ...newAttachments]);
          };
          reader.readAsDataURL(file);
        }

        newAttachments.push(attachment);
      });

      if (newAttachments.length > 0) {
        onAttach([...attachments, ...newAttachments]);
      }
    },
    [attachments, onAttach]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const accept = ACCEPTED_EXTENSIONS.join(",");

  return (
    <div className="space-y-1.5">
      {/* Upload button */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {/* Paperclip button (inline) */}
      {compact ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="p-1.5 rounded hover:bg-[#21262d] text-slate-500 hover:text-slate-300 transition-colors"
          title="Attach file (PDF, DXF, STEP, IGES, Word, Image)"
        >
          <Paperclip size={14} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#21262d] hover:border-[#58a6ff]/50 bg-[#0d1117] text-slate-500 hover:text-slate-300 transition-colors text-[11px]"
        >
          <Paperclip size={12} />
          <span>Attach PDF, DXF, STEP, IGES, Word, or Image</span>
        </button>
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((att) => {
            const iconType = getFileTypeIcon(att.name);
            return (
              <div
                key={att.id}
                className="flex items-center gap-1.5 bg-[#0d1117] border border-[#21262d] rounded-lg px-2 py-1 text-[10px] group"
              >
                {att.preview ? (
                  <img
                    src={att.preview}
                    alt={att.name}
                    className="w-5 h-5 rounded object-cover"
                  />
                ) : (
                  FILE_ICONS[iconType]
                )}
                <div className="min-w-0">
                  <div className="text-slate-300 truncate max-w-[120px]">{att.name}</div>
                  <div className="text-slate-600">
                    {getFileTypeLabel(att.name)} &middot; {formatSize(att.size)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(att.id)}
                  className="p-0.5 rounded hover:bg-[#21262d] text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                >
                  <X size={10} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Inline Paperclip Button (for use next to text input) ───────────────────

interface InlineAttachButtonProps {
  onAttach: (files: AttachedFile[]) => void;
  existingAttachments: AttachedFile[];
}

export function InlineAttachButton({ onAttach, existingAttachments }: InlineAttachButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const newAttachments: AttachedFile[] = [];

      Array.from(fileList).forEach((file) => {
        const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
        if (!ACCEPTED_EXTENSIONS.includes(ext)) return;

        const attachment: AttachedFile = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          file,
          name: file.name,
          type: file.type || ext,
          size: file.size,
        };

        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (e) => {
            attachment.preview = e.target?.result as string;
            onAttach([...existingAttachments, ...newAttachments]);
          };
          reader.readAsDataURL(file);
        }

        newAttachments.push(attachment);
      });

      if (newAttachments.length > 0) {
        onAttach([...existingAttachments, ...newAttachments]);
      }
    },
    [existingAttachments, onAttach]
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.join(",")}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="p-1.5 rounded hover:bg-[#21262d] text-slate-500 hover:text-slate-300 transition-colors"
        title="Attach file"
      >
        <Paperclip size={14} />
      </button>
    </>
  );
}
