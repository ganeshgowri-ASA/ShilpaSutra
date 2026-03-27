"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  CollaborationEngine,
  CollabUser,
  Comment3D,
  ChatMessage,
  Permission,
} from "@/lib/collaboration-engine";
import { X, MessageSquare, Send, Link2, Lock, Eye, Edit3, Crown, CheckCircle, Circle, AtSign } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

const PERMISSION_ICONS: Record<Permission, React.ReactNode> = {
  owner: <Crown size={12} className="text-yellow-400" />,
  editor: <Edit3 size={12} className="text-blue-400" />,
  viewer: <Eye size={12} className="text-gray-400" />,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function UserAvatar({ user, size = 32 }: { user: CollabUser; size?: number }) {
  return (
    <div
      className="relative flex-shrink-0 rounded-full flex items-center justify-center text-white font-semibold text-xs select-none"
      style={{ width: size, height: size, backgroundColor: user.color }}
      title={`${user.name} (${user.permission})`}
    >
      {user.avatar ? (
        <img src={user.avatar} alt={user.name} className="rounded-full w-full h-full object-cover" />
      ) : (
        user.name.slice(0, 2).toUpperCase()
      )}
      <span className="absolute -top-0.5 -right-0.5">{PERMISSION_ICONS[user.permission]}</span>
    </div>
  );
}

interface CommentThreadProps {
  comment: Comment3D;
  engine: CollaborationEngine;
  localUserId: string;
}

function CommentThread({ comment, engine, localUserId }: CommentThreadProps) {
  const [replyText, setReplyText] = useState("");
  const [expanded, setExpanded] = useState(false);

  const handleReply = () => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    const mentions = (trimmed.match(/@(\w+)/g) ?? []).map((m) => m.slice(1));
    engine.replyToComment(comment.id, trimmed, mentions);
    setReplyText("");
  };

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 text-sm transition-colors ${
        comment.resolved
          ? "border-gray-700 bg-gray-800/40 opacity-60"
          : "border-gray-600 bg-gray-800/80"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
            style={{ backgroundColor: "#4F9CF9" }}
          >
            {comment.authorName.slice(0, 2).toUpperCase()}
          </div>
          <span className="font-medium text-gray-200 truncate">{comment.authorName}</span>
          <span className="text-gray-500 text-xs flex-shrink-0">{timeAgo(comment.timestamp)}</span>
        </div>
        <button
          onClick={() => engine.resolveComment(comment.id, !comment.resolved)}
          title={comment.resolved ? "Unresolve" : "Resolve"}
          className="text-gray-400 hover:text-green-400 transition-colors flex-shrink-0"
        >
          {comment.resolved ? <CheckCircle size={16} /> : <Circle size={16} />}
        </button>
      </div>

      {/* Body */}
      <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{comment.text}</p>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {expanded ? "Hide" : `Show ${comment.replies.length} repl${comment.replies.length === 1 ? "y" : "ies"}`}
          </button>
          {expanded && (
            <div className="mt-2 space-y-2 pl-3 border-l border-gray-600">
              {comment.replies.map((r) => (
                <div key={r.id} className="text-xs text-gray-400">
                  <span className="font-medium text-gray-300">{r.authorName}</span>
                  {" · "}
                  <span>{r.text}</span>
                  {" · "}
                  <span className="text-gray-500">{timeAgo(r.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reply input – only for editors/owners */}
      {!comment.resolved && (
        <div className="flex gap-1 pt-1">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()}
            placeholder="Reply… (@mention)"
            className="flex-1 bg-gray-700 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-blue-500"
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
  );
}

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------

interface CollaborationPanelProps {
  engine: CollaborationEngine;
  onClose?: () => void;
}

type Tab = "people" | "comments" | "chat" | "share";

export function CollaborationPanel({ engine, onClose }: CollaborationPanelProps) {
  const [tab, setTab] = useState<Tab>("people");
  const [users, setUsers] = useState<CollabUser[]>(engine.getUsers());
  const [comments, setComments] = useState<Comment3D[]>(engine.getComments());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(engine.getChat());
  const [chatInput, setChatInput] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to engine events
  useEffect(() => {
    const unsubs = [
      engine.on("user-joined", () => setUsers(engine.getUsers())),
      engine.on("user-left", () => setUsers(engine.getUsers())),
      engine.on("user-updated", () => setUsers(engine.getUsers())),
      engine.on("comment-added", () => setComments(engine.getComments())),
      engine.on("comment-updated", () => setComments(engine.getComments())),
      engine.on("chat-message", () => setChatMessages([...engine.getChat()])),
      engine.on("sync", () => {
        setUsers(engine.getUsers());
        setComments(engine.getComments());
        setChatMessages([...engine.getChat()]);
      }),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [engine]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendChat = useCallback(() => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    engine.sendChatMessage(trimmed);
    setChatInput("");
  }, [chatInput, engine]);

  const handleCopyLink = (permission: Permission) => {
    const url = engine.getShareUrl(permission);
    setShareLink(url);
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const localUser = engine.getLocalUser();
  const filteredComments = showResolved ? comments : comments.filter((c) => !c.resolved);

  const TAB_LABELS: { id: Tab; label: string; count?: number }[] = [
    { id: "people", label: "People", count: users.length },
    { id: "comments", label: "Comments", count: filteredComments.length },
    { id: "chat", label: "Chat", count: chatMessages.length > 0 ? undefined : undefined },
    { id: "share", label: "Share" },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white border-l border-gray-700 w-72 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-shrink-0">
        <span className="font-semibold text-gray-100">Collaboration</span>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${engine.isOnline() ? "bg-green-400" : "bg-red-400"}`} />
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 flex-shrink-0">
        {TAB_LABELS.map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === id
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {label}
            {count !== undefined && (
              <span className="ml-1 text-[10px] bg-gray-700 rounded-full px-1">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {/* ── People ── */}
        {tab === "people" && (
          <div className="p-3 space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors">
                <UserAvatar user={u} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-200 truncate">
                      {u.name}{u.id === localUser.id && " (you)"}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 capitalize">{u.permission}</span>
                </div>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: u.color }}
                />
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-gray-500 text-center py-6 text-xs">No collaborators yet</p>
            )}
          </div>
        )}

        {/* ── Comments ── */}
        {tab === "comments" && (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{filteredComments.length} comment{filteredComments.length !== 1 ? "s" : ""}</span>
              <button
                onClick={() => setShowResolved((s) => !s)}
                className="text-blue-400 hover:text-blue-300"
              >
                {showResolved ? "Hide resolved" : "Show resolved"}
              </button>
            </div>
            {filteredComments.length === 0 && (
              <div className="text-center py-8 text-gray-500 space-y-1">
                <MessageSquare size={24} className="mx-auto opacity-40" />
                <p className="text-xs">No comments yet</p>
                <p className="text-xs">Shift+click in the viewport to add one</p>
              </div>
            )}
            {filteredComments
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((c) => (
                <CommentThread
                  key={c.id}
                  comment={c}
                  engine={engine}
                  localUserId={localUser.id}
                />
              ))}
          </div>
        )}

        {/* ── Chat ── */}
        {tab === "chat" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.map((msg) => {
                const isMe = msg.userId === localUser.id;
                const user = users.find((u) => u.id === msg.userId);
                return (
                  <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold mt-0.5"
                      style={{ backgroundColor: user?.color ?? "#888" }}
                    >
                      {msg.userName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                      {!isMe && (
                        <span className="text-[10px] text-gray-500">{msg.userName}</span>
                      )}
                      <div
                        className={`px-3 py-1.5 rounded-2xl text-xs leading-relaxed ${
                          isMe
                            ? "bg-blue-600 text-white rounded-tr-sm"
                            : "bg-gray-700 text-gray-200 rounded-tl-sm"
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-gray-600">{timeAgo(msg.timestamp)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-gray-700 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                placeholder="Message… (@mention)"
                className="flex-1 bg-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleSendChat}
                disabled={!chatInput.trim()}
                className="p-2 text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Share ── */}
        {tab === "share" && (
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-3">Invite collaborators via link</p>
              <div className="space-y-2">
                {(["viewer", "editor"] as Permission[]).map((perm) => (
                  <button
                    key={perm}
                    onClick={() => handleCopyLink(perm)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-left"
                  >
                    <Link2 size={14} className="text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-200 capitalize font-medium text-xs">{perm} link</div>
                      <div className="text-gray-500 text-[10px] truncate">
                        {perm === "viewer" ? "Can view, comment only" : "Can edit the design"}
                      </div>
                    </div>
                    <Lock size={12} className="text-gray-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {shareLink && (
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500">Copied to clipboard:</p>
                <div className="bg-gray-800 rounded p-2 text-[10px] text-blue-400 break-all font-mono">
                  {shareLink}
                </div>
                {linkCopied && (
                  <p className="text-[10px] text-green-400 flex items-center gap-1">
                    <CheckCircle size={10} /> Link copied!
                  </p>
                )}
              </div>
            )}

            <div className="border-t border-gray-700 pt-4 space-y-2">
              <p className="text-xs text-gray-400 font-medium">Active collaborators</p>
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-2">
                  <UserAvatar user={u} size={24} />
                  <span className="flex-1 text-xs text-gray-300 truncate">
                    {u.name}{u.id === localUser.id && " (you)"}
                  </span>
                  {u.id !== localUser.id && localUser.permission === "owner" && (
                    <select
                      value={u.permission}
                      onChange={(e) => engine.setPermission(u.id, e.target.value as Permission)}
                      className="text-[10px] bg-gray-700 border-none rounded px-1 py-0.5 text-gray-300 cursor-pointer"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="owner">Owner</option>
                    </select>
                  )}
                  {(u.id === localUser.id || localUser.permission !== "owner") && (
                    <span className="text-[10px] text-gray-500 capitalize">{u.permission}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CollaborationPanel;
