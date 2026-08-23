import type { ConnectionQuality, ConnectionState } from "@/lib/types";
import { conferenceRepository } from "@/services/data/conferenceStore";
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
  /** Name reported by the venue server's /health endpoint. */
  serverName: string | null;
}

type Subscriber = (snapshot: ConnectionSnapshot) => void;

const INITIAL: ConnectionSnapshot = {
  state: "idle",
  quality: "unknown",
  latencyMs: null,
  packetLoss: null,
  simulated: true,
  serverHost: null,
  serverName: null,
};

function qualityFor(latency: number, loss: number): ConnectionQuality {
  if (latency < 120 && loss < 0.5) return "excellent";
  if (latency < 250 && loss < 1.5) return "good";
  if (latency < 450 && loss < 4) return "fair";
  return "poor";
}

/**
 * Owns connection lifecycle: discovery, connect, reconnect and live metrics.
 * When the Phase 2 venue server answers, metrics come from real signaling
 * round-trips; otherwise clearly-flagged simulated metrics are emitted so the
 * interface can still be demonstrated.
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
      state: "connected",
      simulated: !info.reachable,
      serverHost: info.host,
      serverName: info.reachable ? info.name : null,
    });
    if (info.reachable) void this.syncConferences();
    this.startMetrics();
    return info;
  }

  /** Pulls conferences configured on the venue server into the local store. */
  private async syncConferences() {
    const remote = await LocalServerService.fetchConferences();
    if (remote.length > 0) conferenceRepository.mergeRemote(remote);
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
      // Phase 2: no media stats yet, but the signaling socket gives real RTT.
      const rtt = LocalServerService.isLive() ? await LocalServerService.latency() : null;
      if (rtt !== null) {
        this.emit({
          state: "connected",
          latencyMs: rtt,
          packetLoss: 0,
          quality: qualityFor(rtt, 0),
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
