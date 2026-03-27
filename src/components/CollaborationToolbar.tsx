"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  CollaborationEngine,
  CollabUser,
  Permission,
} from "@/lib/collaboration-engine";
import {
  Users,
  Share2,
  Eye,
  Mic,
  MicOff,
  Navigation,
  X,
  MessageSquare,
  Link2,
  CheckCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CollaborationToolbarProps {
  engine: CollaborationEngine;
  onTogglePanel?: () => void;
  isPanelOpen?: boolean;
}

// ---------------------------------------------------------------------------
// Avatar stack (up to N visible + overflow)
// ---------------------------------------------------------------------------

const MAX_VISIBLE = 4;

function AvatarStack({ users, localId }: { users: CollabUser[]; localId: string }) {
  const visible = users.slice(0, MAX_VISIBLE);
  const overflow = users.length - MAX_VISIBLE;

  return (
    <div className="flex -space-x-2 items-center">
      {visible.map((u) => (
        <div
          key={u.id}
          className="relative w-7 h-7 rounded-full border-2 border-gray-900 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-sm"
          style={{ backgroundColor: u.color }}
          title={`${u.name}${u.id === localId ? " (you)" : ""} — ${u.permission}`}
        >
          {u.avatar ? (
            <img src={u.avatar} alt={u.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            u.name.slice(0, 2).toUpperCase()
          )}
          {/* Online pulse */}
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-gray-900" />
        </div>
      ))}
      {overflow > 0 && (
        <div className="w-7 h-7 rounded-full border-2 border-gray-900 bg-gray-700 flex items-center justify-center text-gray-300 text-[10px] font-bold flex-shrink-0">
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Follow mode dropdown
// ---------------------------------------------------------------------------

function FollowDropdown({
  users,
  localId,
  followingId,
  onFollow,
  onClose,
}: {
  users: CollabUser[];
  localId: string;
  followingId: string | null;
  onFollow: (userId: string | null) => void;
  onClose: () => void;
}) {
  const others = users.filter((u) => u.id !== localId && u.isFollowable !== false);

  return (
    <div className="absolute top-full right-0 mt-1 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 py-1">
      <div className="px-3 py-1.5 text-[10px] text-gray-500 uppercase tracking-wide font-medium">
        Follow a collaborator
      </div>
      {followingId && (
        <button
          onClick={() => { onFollow(null); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 text-xs text-red-400 transition-colors"
        >
          <X size={12} />
          Stop following
        </button>
      )}
      {others.length === 0 && (
        <p className="px-3 py-2 text-xs text-gray-500">No one else is here</p>
      )}
      {others.map((u) => (
        <button
          key={u.id}
          onClick={() => { onFollow(u.id); onClose(); }}
          className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 text-xs transition-colors ${
            followingId === u.id ? "text-blue-400" : "text-gray-300"
          }`}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
            style={{ backgroundColor: u.color }}
          >
            {u.name.slice(0, 2).toUpperCase()}
          </div>
          <span className="truncate">{u.name}</span>
          {followingId === u.id && <CheckCircle size={12} className="ml-auto flex-shrink-0" />}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Share popover
// ---------------------------------------------------------------------------

function SharePopover({
  engine,
  onClose,
}: {
  engine: CollaborationEngine;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<Permission | null>(null);

  const copy = (perm: Permission) => {
    const url = engine.getShareUrl(perm);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(perm);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="absolute top-full right-0 mt-1 w-56 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 p-3 space-y-2">
      <div className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-2">
        Share this design
      </div>
      {(["viewer", "editor"] as Permission[]).map((perm) => (
        <button
          key={perm}
          onClick={() => copy(perm)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-left transition-colors"
        >
          <Link2 size={12} className="text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-gray-200 capitalize font-medium">{perm} link</div>
            <div className="text-gray-500 text-[10px]">
              {perm === "viewer" ? "View & comment only" : "Full edit access"}
            </div>
          </div>
          {copied === perm ? (
            <CheckCircle size={12} className="text-green-400 flex-shrink-0" />
          ) : (
            <span className="text-[10px] text-gray-500">Copy</span>
          )}
        </button>
      ))}
      <button
        onClick={onClose}
        className="w-full text-center text-[10px] text-gray-500 hover:text-gray-300 pt-1 transition-colors"
      >
        Close
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Voice note indicator (placeholder – real impl would use MediaRecorder)
// ---------------------------------------------------------------------------

function VoiceNoteButton() {
  const [recording, setRecording] = useState(false);

  const toggle = () => setRecording((r) => !r);

  return (
    <button
      onClick={toggle}
      title={recording ? "Stop recording voice note" : "Record voice note"}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-all ${
        recording
          ? "bg-red-600/20 text-red-400 border border-red-500/50 animate-pulse"
          : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/60"
      }`}
    >
      {recording ? <MicOff size={13} /> : <Mic size={13} />}
      {recording && <span className="text-[10px]">REC</span>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Toolbar
// ---------------------------------------------------------------------------

export function CollaborationToolbar({
  engine,
  onTogglePanel,
  isPanelOpen = false,
}: CollaborationToolbarProps) {
  const [users, setUsers] = useState<CollabUser[]>(engine.getUsers());
  const [showFollow, setShowFollow] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [followingId, setFollowingId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(engine.isOnline());
  const [unreadChat, setUnreadChat] = useState(0);
  const followRef = useRef<HTMLDivElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const localUser = engine.getLocalUser();

  // Subscribe to presence events
  useEffect(() => {
    const unsubs = [
      engine.on("user-joined", () => setUsers(engine.getUsers())),
      engine.on("user-left", () => setUsers(engine.getUsers())),
      engine.on("user-updated", () => setUsers(engine.getUsers())),
      engine.on("connection-change", (ev) => setIsOnline(ev.connected)),
      engine.on("chat-message", () => {
        if (!isPanelOpen) setUnreadChat((n) => n + 1);
      }),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [engine, isPanelOpen]);

  // Clear unread when panel opens on chat
  useEffect(() => {
    if (isPanelOpen) setUnreadChat(0);
  }, [isPanelOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (followRef.current && !followRef.current.contains(e.target as Node)) {
        setShowFollow(false);
      }
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShowShare(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleFollow = useCallback((userId: string | null) => {
    setFollowingId(userId);
    // In a full impl, this would sync viewport camera to target user's camera
    if (userId) {
      const target = users.find((u) => u.id === userId);
      console.info(`[Collab] Following ${target?.name}`);
    }
  }, [users]);

  const othersCount = users.filter((u) => u.id !== localUser.id).length;

  return (
    <div className="flex items-center gap-1 px-2 py-1 select-none">
      {/* Connection status */}
      <div className="flex items-center gap-1 mr-1" title={isOnline ? "Connected" : "Offline"}>
        <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-400" : "bg-yellow-500"}`} />
        {!isOnline && <span className="text-[10px] text-yellow-500">Offline</span>}
      </div>

      {/* Avatar stack */}
      {users.length > 0 && (
        <AvatarStack users={users} localId={localUser.id} />
      )}

      {/* Follow mode */}
      {othersCount > 0 && (
        <div className="relative" ref={followRef}>
          <button
            onClick={() => { setShowFollow((s) => !s); setShowShare(false); }}
            title="Follow a collaborator"
            className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors ${
              followingId
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/50"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/60"
            }`}
          >
            <Navigation size={13} />
            {followingId && (
              <span className="text-[10px]">
                {users.find((u) => u.id === followingId)?.name.split(" ")[0] ?? "…"}
              </span>
            )}
          </button>
          {showFollow && (
            <FollowDropdown
              users={users}
              localId={localUser.id}
              followingId={followingId}
              onFollow={handleFollow}
              onClose={() => setShowFollow(false)}
            />
          )}
        </div>
      )}

      {/* Voice note */}
      <VoiceNoteButton />

      {/* Chat / panel toggle */}
      <button
        onClick={() => { onTogglePanel?.(); setUnreadChat(0); }}
        title="Toggle collaboration panel"
        className={`relative flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors ${
          isPanelOpen
            ? "bg-blue-600/20 text-blue-400"
            : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/60"
        }`}
      >
        <Users size={13} />
        {unreadChat > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] text-white font-bold">
            {unreadChat > 9 ? "9+" : unreadChat}
          </span>
        )}
      </button>

      {/* Share */}
      <div className="relative" ref={shareRef}>
        <button
          onClick={() => { setShowShare((s) => !s); setShowFollow(false); }}
          title="Share design"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            showShare
              ? "bg-blue-600 text-white"
              : "bg-blue-600/80 hover:bg-blue-600 text-white"
          }`}
        >
          <Share2 size={13} />
          Share
        </button>
        {showShare && (
          <SharePopover engine={engine} onClose={() => setShowShare(false)} />
        )}
      </div>
    </div>
  );
}

export default CollaborationToolbar;
