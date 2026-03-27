"use client";

/**
 * CollaborationComments3D
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders 3D comment pins overlaid on the WebGL viewport (HTML overlay via CSS
 * transform; no Three.js dependency required, works with any canvas).
 *
 * Usage:
 *   <div style={{ position: "relative" }}>
 *     <Viewport3D … />
 *     <CollaborationComments3D engine={engine} camera={camera} renderer={renderer} />
 *   </div>
 *
 * Pin positions are projected from world-space → screen-space each frame using
 * a RAF loop that reads the live THREE.Camera matrices.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import * as THREE from "three";
import {
  CollaborationEngine,
  Comment3D,
  CollabUser,
} from "@/lib/collaboration-engine";
import {
  MessageSquare,
  Send,
  CheckCircle,
  Circle,
  AtSign,
  Plus,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PinPosition {
  x: number; // px from left
  y: number; // px from top
  visible: boolean;
}

interface CollaborationComments3DProps {
  engine: CollaborationEngine;
  /** Live THREE.Camera (PerspectiveCamera or OrthographicCamera) */
  camera?: THREE.Camera;
  /** Canvas element (used for size/bounds) */
  canvas?: HTMLCanvasElement | null;
  /** Optional: highlight objects on hover */
  onPinHover?: (objectId: string | undefined) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function worldToScreen(
  pos: [number, number, number],
  camera: THREE.Camera,
  width: number,
  height: number
): { x: number; y: number; visible: boolean } {
  const v = new THREE.Vector3(...pos);
  v.project(camera);
  // v.z in [-1, 1]; > 1 means behind camera
  const visible = v.z < 1;
  return {
    x: ((v.x + 1) / 2) * width,
    y: ((-v.y + 1) / 2) * height,
    visible,
  };
}

function timeAgo(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return new Date(ts).toLocaleDateString();
}

// Stable pastel color from a string
function colorForUser(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return `hsl(${Math.abs(h) % 360}, 70%, 55%)`;
}

// ---------------------------------------------------------------------------
// CommentPin (single annotation in world space)
// ---------------------------------------------------------------------------

interface CommentPinProps {
  comment: Comment3D;
  pinPos: PinPosition;
  engine: CollaborationEngine;
  users: CollabUser[];
  isActive: boolean;
  onActivate: (id: string) => void;
  localUserId: string;
}

function CommentPin({
  comment,
  pinPos,
  engine,
  users,
  isActive,
  onActivate,
  localUserId,
}: CommentPinProps) {
  const [replyText, setReplyText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive) inputRef.current?.focus();
  }, [isActive]);

  if (!pinPos.visible) return null;

  const author = users.find((u) => u.id === comment.authorId);
  const pinColor = author?.color ?? colorForUser(comment.authorName);

  const handleReply = () => {
    const t = replyText.trim();
    if (!t) return;
    const mentions = (t.match(/@(\w+)/g) ?? []).map((m) => m.slice(1));
    engine.replyToComment(comment.id, t, mentions);
    setReplyText("");
  };

  return (
    <div
      style={{
        position: "absolute",
        left: pinPos.x,
        top: pinPos.y,
        transform: "translate(-50%, -100%)",
        zIndex: isActive ? 60 : 50,
        pointerEvents: "auto",
      }}
    >
      {/* Pin bubble */}
      <button
        onClick={() => onActivate(isActive ? "" : comment.id)}
        className="flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs font-semibold shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{
          backgroundColor: comment.resolved ? "#4B5563" : pinColor,
          outline: isActive ? "2px solid white" : "none",
          outlineOffset: "1px",
        }}
        title={comment.text}
      >
        <MessageSquare size={10} />
        {comment.replies.length > 0 && (
          <span>{comment.replies.length + 1}</span>
        )}
      </button>

      {/* Connector line */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-0.5 h-3 bottom-0 translate-y-full"
        style={{ backgroundColor: comment.resolved ? "#4B5563" : pinColor, opacity: 0.7 }}
      />

      {/* Tooltip popup */}
      {isActive && (
        <div
          className="absolute bottom-full mb-6 left-1/2 -translate-x-1/2 w-64 bg-gray-900 border border-gray-600 rounded-xl shadow-2xl p-3 space-y-2"
          style={{ zIndex: 70 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
              style={{ backgroundColor: pinColor }}
            >
              {comment.authorName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-gray-200">{comment.authorName}</span>
              <span className="text-[10px] text-gray-500 ml-1">{timeAgo(comment.timestamp)}</span>
            </div>
            <button
              onClick={() => engine.resolveComment(comment.id, !comment.resolved)}
              title={comment.resolved ? "Unresolve" : "Resolve"}
              className="text-gray-400 hover:text-green-400 transition-colors flex-shrink-0"
            >
              {comment.resolved ? <CheckCircle size={14} /> : <Circle size={14} />}
            </button>
          </div>

          {/* Text */}
          <p className="text-xs text-gray-300 leading-relaxed">{comment.text}</p>

          {/* Replies */}
          {comment.replies.length > 0 && (
            <div className="space-y-1.5 pl-2 border-l-2 border-gray-700">
              {comment.replies.map((r) => (
                <div key={r.id} className="text-[11px] text-gray-400">
                  <span className="font-medium text-gray-300">{r.authorName}: </span>
                  {r.text}
                  <span className="text-gray-600 ml-1">{timeAgo(r.timestamp)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Mentions */}
          {comment.mentions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {comment.mentions.map((m) => (
                <span key={m} className="text-[10px] bg-blue-900/40 text-blue-300 rounded px-1">
                  @{users.find((u) => u.id === m)?.name ?? m}
                </span>
              ))}
            </div>
          )}

          {/* Reply input */}
          {!comment.resolved && (
            <div className="flex gap-1 pt-1 border-t border-gray-700">
              <input
                ref={inputRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) handleReply();
                  if (e.key === "Escape") onActivate("");
                }}
                placeholder="Reply… use @name to mention"
                className="flex-1 bg-gray-800 rounded px-2 py-1 text-[11px] text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleReply}
                disabled={!replyText.trim()}
                className="p-1 text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors"
              >
                <Send size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// New comment composer (appears at click location)
// ---------------------------------------------------------------------------

interface NewCommentFormProps {
  x: number;
  y: number;
  onSubmit: (text: string, mentions: string[]) => void;
  onCancel: () => void;
  users: CollabUser[];
}

function NewCommentForm({ x, y, onSubmit, onCancel, users }: NewCommentFormProps) {
  const [text, setText] = useState("");
  const [showMention, setShowMention] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setText(v);
    const match = v.match(/@(\w*)$/);
    if (match) {
      setMentionFilter(match[1].toLowerCase());
      setShowMention(true);
    } else {
      setShowMention(false);
    }
  };

  const insertMention = (user: CollabUser) => {
    setText((t) => t.replace(/@\w*$/, `@${user.name.replace(/\s/g, "_")} `));
    setShowMention(false);
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    const t = text.trim();
    if (!t) return;
    const rawMentions = (t.match(/@(\w+)/g) ?? []).map((m) => m.slice(1));
    const mentionIds = rawMentions
      .map((n) => users.find((u) => u.name.replace(/\s/g, "_") === n)?.id)
      .filter(Boolean) as string[];
    onSubmit(t, mentionIds);
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(mentionFilter)
  );

  return (
    <div
      style={{ position: "absolute", left: x, top: y, zIndex: 80, pointerEvents: "auto" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-gray-900 border border-blue-500 rounded-xl shadow-2xl p-3 w-60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-200">New comment</span>
          <button onClick={onCancel} className="text-gray-500 hover:text-white">
            <X size={12} />
          </button>
        </div>
        <div className="relative">
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleInput}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) handleSubmit();
              if (e.key === "Escape") onCancel();
            }}
            placeholder="Add a comment… @mention"
            rows={3}
            className="w-full bg-gray-800 rounded-lg px-2 py-1.5 text-xs text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
          {showMention && filteredUsers.length > 0 && (
            <div className="absolute left-0 bottom-full mb-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-1 z-90">
              {filteredUsers.slice(0, 5).map((u) => (
                <button
                  key={u.id}
                  onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                  className="w-full flex items-center gap-2 px-2 py-1 hover:bg-gray-700 text-xs text-gray-300"
                >
                  <div
                    className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold"
                    style={{ backgroundColor: u.color }}
                  >
                    {u.name.slice(0, 2).toUpperCase()}
                  </div>
                  {u.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-600">⌘↵ to post</span>
          <div className="flex gap-1">
            <button
              onClick={onCancel}
              className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-40 transition-colors"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CollaborationComments3D({
  engine,
  camera,
  canvas,
  onPinHover,
}: CollaborationComments3DProps) {
  const [comments, setComments] = useState<Comment3D[]>(engine.getComments());
  const [users, setUsers] = useState<CollabUser[]>(engine.getUsers());
  const [pinPositions, setPinPositions] = useState<Record<string, PinPosition>>({});
  const [activeCommentId, setActiveCommentId] = useState<string>("");
  const [newCommentPos, setNewCommentPos] = useState<{
    screen: [number, number];
    world: [number, number, number];
  } | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const rafRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const localUser = engine.getLocalUser();

  // Subscribe to engine
  useEffect(() => {
    const unsubs = [
      engine.on("comment-added", () => setComments(engine.getComments())),
      engine.on("comment-updated", () => setComments(engine.getComments())),
      engine.on("user-joined", () => setUsers(engine.getUsers())),
      engine.on("user-left", () => setUsers(engine.getUsers())),
      engine.on("sync", () => {
        setComments(engine.getComments());
        setUsers(engine.getUsers());
      }),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [engine]);

  // RAF loop: project 3D positions to screen
  useEffect(() => {
    if (!camera || !canvas) return;
    const tick = () => {
      const w = canvas.clientWidth || canvas.width;
      const h = canvas.clientHeight || canvas.height;
      const next: Record<string, PinPosition> = {};
      for (const c of comments) {
        next[c.id] = worldToScreen(c.position, camera, w, h);
      }
      setPinPositions(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [camera, canvas, comments]);

  // Shift+click to place comment
  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isAddMode) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      // Unproject to get approximate world position
      let worldPos: [number, number, number] = [0, 0, 0];
      if (camera) {
        const nx = (sx / rect.width) * 2 - 1;
        const ny = -(sy / rect.height) * 2 + 1;
        const v = new THREE.Vector3(nx, ny, 0.5).unproject(camera);
        worldPos = [v.x, v.y, v.z];
      }
      setNewCommentPos({ screen: [sx, sy], world: worldPos });
      setIsAddMode(false);
    },
    [isAddMode, camera]
  );

  const handleNewCommentSubmit = (text: string, mentions: string[]) => {
    if (!newCommentPos) return;
    engine.addComment(text, newCommentPos.world, undefined, mentions);
    setNewCommentPos(null);
  };

  const canComment = localUser.permission === "editor" || localUser.permission === "owner";

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: isAddMode || newCommentPos ? "auto" : "none",
        cursor: isAddMode ? "crosshair" : "default",
        zIndex: 40,
      }}
      onClick={handleContainerClick}
    >
      {/* Rendered pins */}
      {comments.map((c) => {
        const pos = pinPositions[c.id];
        if (!pos) return null;
        return (
          <CommentPin
            key={c.id}
            comment={c}
            pinPos={pos}
            engine={engine}
            users={users}
            isActive={activeCommentId === c.id}
            onActivate={setActiveCommentId}
            localUserId={localUser.id}
          />
        );
      })}

      {/* New comment form */}
      {newCommentPos && (
        <NewCommentForm
          x={newCommentPos.screen[0]}
          y={newCommentPos.screen[1]}
          onSubmit={handleNewCommentSubmit}
          onCancel={() => setNewCommentPos(null)}
          users={users}
        />
      )}

      {/* Add comment toggle button */}
      {canComment && !newCommentPos && (
        <div
          style={{ position: "absolute", bottom: 16, right: 16, pointerEvents: "auto", zIndex: 55 }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setIsAddMode((m) => !m); }}
            title={isAddMode ? "Cancel (click to place)" : "Add comment to 3D location"}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium shadow-lg transition-all ${
              isAddMode
                ? "bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-1 ring-offset-gray-900 animate-pulse"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600"
            }`}
          >
            {isAddMode ? (
              <>
                <X size={13} />
                Cancel
              </>
            ) : (
              <>
                <Plus size={13} />
                <MessageSquare size={13} />
                Comment
              </>
            )}
          </button>
        </div>
      )}

      {isAddMode && (
        <div
          style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", pointerEvents: "none", zIndex: 55 }}
          className="bg-blue-900/80 text-blue-200 text-xs px-3 py-1.5 rounded-full shadow"
        >
          Click anywhere in the viewport to place a comment
        </div>
      )}
    </div>
  );
}

export default CollaborationComments3D;
