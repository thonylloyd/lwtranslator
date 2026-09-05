import type { Conference, ConnectionState } from "@/lib/types";

export type ClientSignal =
  | { type: "hello"; role: "admin" | "translator" | "listener"; conferenceCode: string }
  | { type: "publish"; channelId: string; languageCode?: string; sdp?: string }
  | { type: "subscribe"; channelId: string; languageCode?: string; sdp?: string }
  | { type: "unsubscribe"; channelId: string }
  | { type: "offer"; channelId: string; sdp: RTCSessionDescriptionInit; to?: string }
  | { type: "answer"; channelId: string; sdp: RTCSessionDescriptionInit; to?: string }
  | { type: "candidate"; channelId: string; candidate: RTCIceCandidateInit | null; to?: string }
  | { type: "channel-state"; channelId: string; live: boolean }
  | { type: "ping"; sentAt: number };

export type ServerSignal =
  | {
      type: "welcome";
      peerId: string;
      serverName: string;
      version: string;
      conference: Conference | null;
      channels: { channelId: string; languageCode: string; live: boolean; listeners: number }[];
    }
  | { type: "publish-ack"; channelId: string; accepted: boolean; reason?: string }
  | { type: "subscribe-ack"; channelId: string; live: boolean; listeners: number }
  | {
      type: "channel-state";
      channelId: string;
      languageCode?: string;
      live: boolean;
      listeners: number;
    }
  | { type: "stats"; channelId: string; listeners: number; live: boolean }
  | { type: "conference"; conference: Conference }
  | { type: "pong"; sentAt: number }
  | { type: "offer"; channelId: string; sdp: RTCSessionDescriptionInit; from?: string }
  | { type: "answer"; channelId: string; sdp: RTCSessionDescriptionInit; from?: string }
  | { type: "candidate"; channelId: string; candidate: RTCIceCandidateInit | null; from?: string }
  | { type: "subscriber-joined"; channelId: string; peerId: string }
  | { type: "subscriber-left"; channelId: string; peerId: string }
  | { type: "publisher-live"; channelId: string; peerId: string }
  | { type: "publisher-offline"; channelId: string };

/** Kept for backwards compatibility with Phase 1 imports. */
export type SignalMessage = ClientSignal | ServerSignal;

type Listener = (message: ServerSignal) => void;
type StateListener = (state: ConnectionState) => void;

/**
 * WebSocket signaling transport to the local LW server (`ws://<host>/signal`).
 *
 * Phase 2: the venue server implements this protocol (see `server/`). When no
 * server answers, `connect()` resolves to `false` and the UI falls back to the
 * clearly-labelled simulated mode — no fake WebRTC session is created.
 */
export class SignalingService {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private stateListeners = new Set<StateListener>();
  private state: ConnectionState = "idle";
  private hello: Extract<ClientSignal, { type: "hello" }> | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private closedByUs = false;
  private latencyMs: number | null = null;

  constructor(private readonly host: string) {}

  getState() {
    return this.state;
  }

  getHost() {
    return this.host;
  }

  /** Last measured round-trip latency to the venue server, in ms. */
  getLatencyMs() {
    return this.latencyMs;
  }

  isOpen() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  onMessage(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStateChange(listener: StateListener) {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private setState(state: ConnectionState) {
    this.state = state;
    this.stateListeners.forEach((l) => l(state));
  }

  async connect(timeoutMs = 1500): Promise<boolean> {
    if (typeof window === "undefined") return false;
    this.closedByUs = false;
    this.setState(this.reconnectAttempts > 0 ? "reconnecting" : "connecting");
    const scheme = window.location.protocol === "https:" ? "wss" : "ws";
    return new Promise<boolean>((resolve) => {
      let settled = false;
      let socket: WebSocket;
      try {
        socket = new WebSocket(`${scheme}://${this.host}/signal`);
      } catch {
        this.setState("failed");
        resolve(false);
        return;
      }
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        this.setState(ok ? "connected" : "failed");
        resolve(ok);
      };
      const timer = window.setTimeout(() => {
        socket.close();
        finish(false);
      }, timeoutMs);

      socket.onopen = () => {
        window.clearTimeout(timer);
        this.socket = socket;
        this.reconnectAttempts = 0;
        if (this.hello) this.send(this.hello);
        void this.measureLatency();
        finish(true);
      };
      socket.onerror = () => {
        window.clearTimeout(timer);
        finish(false);
      };
      socket.onclose = () => {
        this.socket = null;
        if (this.closedByUs) return;
        if (settled) {
          this.setState("reconnecting");
          this.scheduleReconnect();
        }
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as ServerSignal;
          if (message.type === "pong") {
            this.latencyMs = Math.max(1, Date.now() - message.sentAt);
          }
          this.listeners.forEach((l) => l(message));
        } catch {
          /* ignore malformed frames */
        }
      };
    });
  }

  /** Identifies this peer to the server and replays on every reconnect. */
  identify(role: "admin" | "translator" | "listener", conferenceCode: string) {
    this.hello = { type: "hello", role, conferenceCode };
    return this.send(this.hello);
  }

  private scheduleReconnect() {
    if (typeof window === "undefined" || this.reconnectTimer !== null) return;
    this.reconnectAttempts += 1;
    const delay = Math.min(15000, 500 * 2 ** (this.reconnectAttempts - 1));
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  /** Round-trips a ping frame and returns the latency, or null when offline. */
  async measureLatency(timeoutMs = 2000): Promise<number | null> {
    if (typeof window === "undefined" || !this.isOpen()) return null;
    const sentAt = Date.now();
    return new Promise<number | null>((resolve) => {
      const timer = window.setTimeout(() => {
        off();
        resolve(null);
      }, timeoutMs);
      const off = this.onMessage((message) => {
        if (message.type !== "pong" || message.sentAt !== sentAt) return;
        window.clearTimeout(timer);
        off();
        this.latencyMs = Math.max(1, Date.now() - sentAt);
        resolve(this.latencyMs);
      });
      this.send({ type: "ping", sentAt });
    });
  }

  send(message: ClientSignal) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  disconnect() {
    this.closedByUs = true;
    if (this.reconnectTimer !== null && typeof window !== "undefined") {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.latencyMs = null;
    this.setState("idle");
  }
}
