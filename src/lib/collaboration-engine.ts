/**
 * CollaborationEngine – real-time multi-user infrastructure for ShilpaSutra.
 * Uses BroadcastChannel (same-origin tabs) with optional WebSocket upgrade.
 * CRDT-style LWW (Last-Write-Wins) map for conflict-free concurrent edits.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Permission = "owner" | "editor" | "viewer";

export interface CollabUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string; // hex color assigned to this user
  permission: Permission;
  cursor3D?: [number, number, number]; // world-space cursor
  selectedIds?: string[]; // currently selected object IDs
  isFollowable?: boolean;
  lastSeen: number; // ms timestamp
}

export type OperationType =
  | "add_object"
  | "remove_object"
  | "transform_object"
  | "update_property"
  | "add_sketch"
  | "update_sketch"
  | "cursor_move"
  | "selection_change"
  | "comment_add"
  | "comment_resolve"
  | "chat_message"
  | "join"
  | "leave"
  | "sync_request"
  | "sync_response";

export interface CollabOperation {
  id: string; // uuid
  type: OperationType;
  userId: string;
  sessionId: string;
  timestamp: number;
  vectorClock: Record<string, number>; // for ordering
  payload: unknown;
}

export interface Comment3D {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  position: [number, number, number];
  objectId?: string;
  timestamp: number;
  resolved: boolean;
  replies: CommentReply[];
  mentions: string[]; // user IDs
}

export interface CommentReply {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: number;
  mentions: string[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  attachedCommentId?: string;
}

export interface CollabSession {
  id: string;
  designId: string;
  shareToken: string;
  users: Map<string, CollabUser>;
  operations: CollabOperation[]; // bounded log
  comments: Map<string, Comment3D>;
  chatMessages: ChatMessage[];
  createdAt: number;
}

// CRDT LWW register entry
interface LWWEntry {
  value: unknown;
  timestamp: number;
  userId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USER_COLORS = [
  "#4F9CF9", "#FF6B6B", "#51CF66", "#FFD43B",
  "#CC5DE8", "#FF922B", "#20C997", "#F06595",
];
const MAX_OPS_LOG = 500;
const PRESENCE_TTL = 30_000; // 30 s
const CHANNEL_PREFIX = "shilpasutra:session:";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _colorIdx = 0;
function assignColor(): string {
  return USER_COLORS[_colorIdx++ % USER_COLORS.length];
}

function uuid(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---------------------------------------------------------------------------
// CollaborationEngine
// ---------------------------------------------------------------------------

type EngineEventMap = {
  "user-joined": CollabUser;
  "user-left": string; // userId
  "user-updated": CollabUser;
  "operation": CollabOperation;
  "comment-added": Comment3D;
  "comment-updated": Comment3D;
  "chat-message": ChatMessage;
  "sync": CollabSession;
  "connection-change": { connected: boolean; transport: "bc" | "ws" | "none" };
};

type Listener<K extends keyof EngineEventMap> = (data: EngineEventMap[K]) => void;

export class CollaborationEngine {
  private session: CollabSession;
  private localUser: CollabUser;
  private bc: BroadcastChannel | null = null;
  private ws: WebSocket | null = null;
  private wsUrl: string | null = null;
  private lwwStore: Map<string, LWWEntry> = new Map();
  private vectorClock: Record<string, number> = {};
  private presenceTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private listeners: { [K in keyof EngineEventMap]?: Listener<K>[] } = {};
  private isConnected = false;
  private transport: "bc" | "ws" | "none" = "none";

  constructor(
    designId: string,
    user: { id: string; name: string; email?: string; avatar?: string },
    wsUrl?: string
  ) {
    this.wsUrl = wsUrl ?? null;
    this.localUser = {
      ...user,
      color: assignColor(),
      permission: "editor",
      lastSeen: Date.now(),
    };
    this.session = {
      id: uuid(),
      designId,
      shareToken: this.generateShareToken(designId),
      users: new Map([[user.id, this.localUser]]),
      operations: [],
      comments: new Map(),
      chatMessages: [],
      createdAt: Date.now(),
    };
    this.vectorClock[user.id] = 0;
  }

  // ---------------------------------------------------------------------------
  // Connect / Disconnect
  // ---------------------------------------------------------------------------

  connect(): void {
    this.openBroadcastChannel();
    if (this.wsUrl) this.openWebSocket(this.wsUrl);
    this.broadcastJoin();
    this.startPresenceHeartbeat();
  }

  disconnect(): void {
    this.broadcastOp({ type: "leave", payload: { userId: this.localUser.id } });
    this.bc?.close();
    this.ws?.close();
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.isConnected = false;
    this.emit("connection-change", { connected: false, transport: "none" });
  }

  private openBroadcastChannel(): void {
    if (typeof BroadcastChannel === "undefined") return;
    this.bc = new BroadcastChannel(`${CHANNEL_PREFIX}${this.session.designId}`);
    this.bc.onmessage = (ev) => this.handleIncoming(ev.data as CollabOperation);
    this.transport = "bc";
    this.isConnected = true;
    this.emit("connection-change", { connected: true, transport: "bc" });
  }

  private openWebSocket(url: string): void {
    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        this.transport = "ws";
        this.reconnectAttempts = 0;
        this.emit("connection-change", { connected: true, transport: "ws" });
        this.requestSync();
      };
      this.ws.onmessage = (ev) => {
        try {
          const op = JSON.parse(ev.data) as CollabOperation;
          this.handleIncoming(op);
        } catch {
          /* ignore malformed */
        }
      };
      this.ws.onclose = () => this.scheduleReconnect(url);
      this.ws.onerror = () => this.scheduleReconnect(url);
    } catch {
      /* WebSocket unavailable */
    }
  }

  private scheduleReconnect(url: string): void {
    if (this.reconnectAttempts >= 5) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.openWebSocket(url);
    }, delay);
  }

  // ---------------------------------------------------------------------------
  // Operation Dispatch
  // ---------------------------------------------------------------------------

  private tick(): number {
    this.vectorClock[this.localUser.id] =
      (this.vectorClock[this.localUser.id] ?? 0) + 1;
    return this.vectorClock[this.localUser.id];
  }

  private broadcastOp(partial: Omit<CollabOperation, "id" | "userId" | "sessionId" | "timestamp" | "vectorClock">): void {
    this.tick();
    const op: CollabOperation = {
      id: uuid(),
      userId: this.localUser.id,
      sessionId: this.session.id,
      timestamp: Date.now(),
      vectorClock: { ...this.vectorClock },
      ...partial,
    };
    this.appendOp(op);
    this.bc?.postMessage(op);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(op));
    }
  }

  private handleIncoming(op: CollabOperation): void {
    if (op.userId === this.localUser.id) return; // echo suppression
    this.mergeVectorClock(op.vectorClock);
    this.appendOp(op);
    this.applyOperation(op);
    this.emit("operation", op);
  }

  private mergeVectorClock(remote: Record<string, number>): void {
    for (const [uid, tick] of Object.entries(remote)) {
      this.vectorClock[uid] = Math.max(this.vectorClock[uid] ?? 0, tick);
    }
  }

  private appendOp(op: CollabOperation): void {
    this.session.operations.push(op);
    if (this.session.operations.length > MAX_OPS_LOG) {
      this.session.operations.splice(0, this.session.operations.length - MAX_OPS_LOG);
    }
  }

  // ---------------------------------------------------------------------------
  // Apply Operations (state machine)
  // ---------------------------------------------------------------------------

  private applyOperation(op: CollabOperation): void {
    switch (op.type) {
      case "join": {
        const u = op.payload as CollabUser;
        if (!this.session.users.has(u.id)) {
          this.session.users.set(u.id, u);
          this.emit("user-joined", u);
        }
        break;
      }
      case "leave": {
        const { userId } = op.payload as { userId: string };
        this.session.users.delete(userId);
        this.emit("user-left", userId);
        break;
      }
      case "cursor_move":
      case "selection_change": {
        const upd = op.payload as Partial<CollabUser>;
        const existing = this.session.users.get(op.userId);
        if (existing) {
          Object.assign(existing, upd, { lastSeen: op.timestamp });
          this.emit("user-updated", existing);
        }
        break;
      }
      case "update_property": {
        const { key, value } = op.payload as { key: string; value: unknown };
        this.lwwApply(key, value, op.timestamp, op.userId);
        break;
      }
      case "comment_add": {
        const comment = op.payload as Comment3D;
        this.session.comments.set(comment.id, comment);
        this.emit("comment-added", comment);
        break;
      }
      case "comment_resolve": {
        const { commentId, resolved } = op.payload as { commentId: string; resolved: boolean };
        const c = this.session.comments.get(commentId);
        if (c) {
          c.resolved = resolved;
          this.emit("comment-updated", c);
        }
        break;
      }
      case "chat_message": {
        const msg = op.payload as ChatMessage;
        this.session.chatMessages.push(msg);
        this.emit("chat-message", msg);
        break;
      }
      case "sync_request": {
        if (this.isHost()) this.sendSyncResponse(op.userId);
        break;
      }
      case "sync_response": {
        const s = op.payload as Partial<CollabSession>;
        this.applySyncResponse(s);
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // CRDT – LWW Register
  // ---------------------------------------------------------------------------

  private lwwApply(key: string, value: unknown, ts: number, userId: string): void {
    const prev = this.lwwStore.get(key);
    if (!prev || ts > prev.timestamp || (ts === prev.timestamp && userId > prev.userId)) {
      this.lwwStore.set(key, { value, timestamp: ts, userId });
    }
  }

  lwwGet(key: string): unknown {
    return this.lwwStore.get(key)?.value;
  }

  // ---------------------------------------------------------------------------
  // Public API – Presence
  // ---------------------------------------------------------------------------

  updateCursor(position: [number, number, number]): void {
    this.localUser.cursor3D = position;
    this.broadcastOp({ type: "cursor_move", payload: { cursor3D: position } });
  }

  updateSelection(ids: string[]): void {
    this.localUser.selectedIds = ids;
    this.broadcastOp({ type: "selection_change", payload: { selectedIds: ids } });
  }

  // ---------------------------------------------------------------------------
  // Public API – Geometry
  // ---------------------------------------------------------------------------

  broadcastPropertyUpdate(key: string, value: unknown): void {
    this.lwwApply(key, value, Date.now(), this.localUser.id);
    this.broadcastOp({ type: "update_property", payload: { key, value } });
  }

  // ---------------------------------------------------------------------------
  // Public API – Comments
  // ---------------------------------------------------------------------------

  addComment(text: string, position: [number, number, number], objectId?: string, mentions: string[] = []): Comment3D {
    const comment: Comment3D = {
      id: uuid(),
      authorId: this.localUser.id,
      authorName: this.localUser.name,
      text,
      position,
      objectId,
      timestamp: Date.now(),
      resolved: false,
      replies: [],
      mentions,
    };
    this.session.comments.set(comment.id, comment);
    this.broadcastOp({ type: "comment_add", payload: comment });
    this.emit("comment-added", comment);
    return comment;
  }

  replyToComment(commentId: string, text: string, mentions: string[] = []): void {
    const comment = this.session.comments.get(commentId);
    if (!comment) return;
    const reply: CommentReply = {
      id: uuid(),
      authorId: this.localUser.id,
      authorName: this.localUser.name,
      text,
      timestamp: Date.now(),
      mentions,
    };
    comment.replies.push(reply);
    this.broadcastOp({ type: "comment_add", payload: comment });
    this.emit("comment-updated", comment);
  }

  resolveComment(commentId: string, resolved = true): void {
    const c = this.session.comments.get(commentId);
    if (c) {
      c.resolved = resolved;
      this.emit("comment-updated", c);
    }
    this.broadcastOp({ type: "comment_resolve", payload: { commentId, resolved } });
  }

  // ---------------------------------------------------------------------------
  // Public API – Chat
  // ---------------------------------------------------------------------------

  sendChatMessage(text: string, attachedCommentId?: string): ChatMessage {
    const msg: ChatMessage = {
      id: uuid(),
      userId: this.localUser.id,
      userName: this.localUser.name,
      text,
      timestamp: Date.now(),
      attachedCommentId,
    };
    this.session.chatMessages.push(msg);
    this.broadcastOp({ type: "chat_message", payload: msg });
    this.emit("chat-message", msg);
    return msg;
  }

  // ---------------------------------------------------------------------------
  // Sync
  // ---------------------------------------------------------------------------

  private requestSync(): void {
    this.broadcastOp({ type: "sync_request", payload: {} });
  }

  private isHost(): boolean {
    // The user with the lowest ID acts as host
    const ids = [...this.session.users.keys()].sort();
    return ids[0] === this.localUser.id;
  }

  private sendSyncResponse(targetUserId: string): void {
    const snapshot: Partial<CollabSession> = {
      id: this.session.id,
      designId: this.session.designId,
      comments: this.session.comments,
      chatMessages: this.session.chatMessages,
      operations: this.session.operations.slice(-100),
    };
    this.broadcastOp({ type: "sync_response", payload: snapshot });
    void targetUserId; // used by ws routing
  }

  private applySyncResponse(s: Partial<CollabSession>): void {
    if (s.comments) {
      for (const [id, c] of (s.comments instanceof Map ? s.comments : Object.entries(s.comments))) {
        if (!this.session.comments.has(id as string)) {
          this.session.comments.set(id as string, c as Comment3D);
        }
      }
    }
    if (s.chatMessages) {
      this.session.chatMessages = s.chatMessages;
    }
    this.emit("sync", this.session);
  }

  // ---------------------------------------------------------------------------
  // Presence heartbeat & offline handling
  // ---------------------------------------------------------------------------

  private broadcastJoin(): void {
    this.broadcastOp({ type: "join", payload: this.localUser });
  }

  private startPresenceHeartbeat(): void {
    this.presenceTimer = setInterval(() => {
      this.localUser.lastSeen = Date.now();
      this.broadcastOp({ type: "cursor_move", payload: { lastSeen: Date.now() } });
      this.pruneStaleUsers();
    }, 10_000);
  }

  private pruneStaleUsers(): void {
    const now = Date.now();
    for (const [uid, user] of this.session.users) {
      if (uid !== this.localUser.id && now - user.lastSeen > PRESENCE_TTL) {
        this.session.users.delete(uid);
        this.emit("user-left", uid);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Share link
  // ---------------------------------------------------------------------------

  private generateShareToken(designId: string): string {
    return btoa(`${designId}:${Date.now()}`).replace(/[+/=]/g, "").slice(0, 16);
  }

  getShareUrl(permission: Permission = "viewer"): string {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/designer?share=${this.session.shareToken}&role=${permission}`;
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getSession(): CollabSession { return this.session; }
  getLocalUser(): CollabUser { return this.localUser; }
  getUsers(): CollabUser[] { return [...this.session.users.values()]; }
  getComments(): Comment3D[] { return [...this.session.comments.values()]; }
  getChat(): ChatMessage[] { return this.session.chatMessages; }
  isOnline(): boolean { return this.isConnected; }

  setPermission(userId: string, permission: Permission): void {
    const u = this.session.users.get(userId);
    if (u) u.permission = permission;
  }

  // ---------------------------------------------------------------------------
  // Event emitter
  // ---------------------------------------------------------------------------

  on<K extends keyof EngineEventMap>(event: K, listener: Listener<K>): () => void {
    if (!this.listeners[event]) this.listeners[event] = [] as Listener<K>[];
    (this.listeners[event] as Listener<K>[]).push(listener);
    return () => this.off(event, listener);
  }

  off<K extends keyof EngineEventMap>(event: K, listener: Listener<K>): void {
    const arr = this.listeners[event] as Listener<K>[] | undefined;
    if (arr) {
      const idx = arr.indexOf(listener);
      if (idx !== -1) arr.splice(idx, 1);
    }
  }

  private emit<K extends keyof EngineEventMap>(event: K, data: EngineEventMap[K]): void {
    (this.listeners[event] as Listener<K>[] | undefined)?.forEach((fn) => fn(data));
  }
}

// ---------------------------------------------------------------------------
// Singleton factory (keyed by designId)
// ---------------------------------------------------------------------------

const _engines: Map<string, CollaborationEngine> = new Map();

export function getCollaborationEngine(
  designId: string,
  user?: { id: string; name: string; email?: string; avatar?: string },
  wsUrl?: string
): CollaborationEngine {
  if (!_engines.has(designId)) {
    if (!user) throw new Error("user required for first-time engine creation");
    const engine = new CollaborationEngine(designId, user, wsUrl);
    _engines.set(designId, engine);
  }
  return _engines.get(designId)!;
}

export function destroyCollaborationEngine(designId: string): void {
  const engine = _engines.get(designId);
  if (engine) {
    engine.disconnect();
    _engines.delete(designId);
  }
}
