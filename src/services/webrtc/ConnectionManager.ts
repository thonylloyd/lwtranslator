import type { ConnectionQuality, ConnectionState } from "@/lib/types";
import { LocalServerService } from "@/services/local-server/LocalServerService";

import { webRTCClient } from "./WebRTCClient";

export interface ConnectionSnapshot {
  state: ConnectionState;
  quality: ConnectionQuality;
  latencyMs: number | null;
  packetLoss: number | null;
  /** True when no local server/SFU is present and figures are demonstration values. */
  simulated: boolean;
  serverHost: string | null;
}

type Subscriber = (snapshot: ConnectionSnapshot) => void;

const INITIAL: ConnectionSnapshot = {
  state: "idle",
  quality: "unknown",
  latencyMs: null,
  packetLoss: null,
  simulated: true,
  serverHost: null,
};

function qualityFor(latency: number, loss: number): ConnectionQuality {
  if (latency < 120 && loss < 0.5) return "excellent";
  if (latency < 250 && loss < 1.5) return "good";
  if (latency < 450 && loss < 4) return "fair";
  return "poor";
}

/**
 * Owns connection lifecycle: discovery, connect, reconnect and live metrics.
 * When no local server answers it emits clearly-flagged simulated metrics so
 * the interface can be demonstrated before Phase 2/3 land.
 */
class ConnectionManagerImpl {
  private snapshot: ConnectionSnapshot = INITIAL;
  private subscribers = new Set<Subscriber>();
  private timer: ReturnType<typeof setInterval> | null = null;

  getSnapshot() {
    return this.snapshot;
  }

  subscribe(subscriber: Subscriber) {
    this.subscribers.add(subscriber);
    subscriber(this.snapshot);
    return () => {
      this.subscribers.delete(subscriber);
      if (this.subscribers.size === 0) this.stopMetrics();
    };
  }

  private emit(patch: Partial<ConnectionSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.subscribers.forEach((s) => s(this.snapshot));
  }

  async connect() {
    this.emit({ state: "discovering" });
    const info = await LocalServerService.connect();
    this.emit({
      state: info.reachable ? "connected" : "connected",
      simulated: !info.reachable,
      serverHost: info.host,
    });
    this.startMetrics();
    return info;
  }

  async retry() {
    this.emit({ state: "reconnecting" });
    return this.connect();
  }

  disconnect() {
    this.stopMetrics();
    LocalServerService.disconnect();
    this.snapshot = INITIAL;
    this.subscribers.forEach((s) => s(this.snapshot));
  }

  private startMetrics() {
    if (this.timer) return;
    const tick = async () => {
      const stats = await webRTCClient.getStats();
      if (stats) {
        this.emit({
          latencyMs: stats.latencyMs,
          packetLoss: stats.packetLoss,
          quality: stats.quality,
          simulated: false,
        });
        return;
      }
      const latency = Math.round(70 + Math.random() * 90);
      const loss = Number((Math.random() * 0.8).toFixed(2));
      this.emit({
        latencyMs: latency,
        packetLoss: loss,
        quality: qualityFor(latency, loss),
        simulated: true,
      });
    };
    void tick();
    this.timer = setInterval(tick, 2500);
  }

  private stopMetrics() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

export const ConnectionManager = new ConnectionManagerImpl();
export { qualityFor };
