import type { ConnectionState } from "@/lib/types";

export type SignalMessage =
  | { type: "hello"; role: "admin" | "translator" | "listener"; conferenceCode: string }
  | { type: "publish"; channelId: string; sdp?: string }
  | { type: "subscribe"; channelId: string; sdp?: string }
  | { type: "unsubscribe"; channelId: string }
  | { type: "answer"; sdp: string }
  | { type: "candidate"; candidate: unknown }
  | { type: "stats"; channelId: string; listeners: number; latencyMs: number }
  | { type: "channel-state"; channelId: string; live: boolean };

type Listener = (message: SignalMessage) => void;
type StateListener = (state: ConnectionState) => void;

/**
 * WebSocket signaling transport to the local LW server.
 *
 * Phase 2 will implement the server side (`ws://<host>/signal`). Until a local
 * server answers, `connect()` resolves to `false` and the UI falls back to the
 * clearly-labelled simulated mode — no fake WebRTC session is created.
 */
export class SignalingService {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private stateListeners = new Set<StateListener>();
  private state: ConnectionState = "idle";

  constructor(private readonly host: string) {}

  getState() {
    return this.state;
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
    this.setState("connecting");
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
        finish(true);
      };
      socket.onerror = () => {
        window.clearTimeout(timer);
        finish(false);
      };
      socket.onclose = () => {
        this.socket = null;
        if (settled && this.state === "connected") this.setState("reconnecting");
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as SignalMessage;
          this.listeners.forEach((l) => l(message));
        } catch {
          /* ignore malformed frames */
        }
      };
    });
  }

  send(message: SignalMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
    this.setState("idle");
  }
}
