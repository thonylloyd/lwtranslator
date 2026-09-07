import type { Conference, ServerInfo } from "@/lib/types";

import { DiscoveryService } from "./DiscoveryService";
import { SignalingService } from "./SignalingService";

export type PeerRole = "admin" | "translator" | "listener";

/**
 * Single entry point the UI uses to reach the local LW Translator server.
 * The UI never hardcodes an IP address: it calls `LocalServerService.connect()`.
 */
class LocalServerServiceImpl {
  private info: ServerInfo | null = null;
  private signaling: SignalingService | null = null;
  private identity: { role: PeerRole; conferenceCode: string } | null = null;

  getInfo() {
    return this.info;
  }

  getSignaling() {
    return this.signaling;
  }

  isLive() {
    return Boolean(this.signaling?.isOpen());
  }

  setHost(host: string | null) {
    DiscoveryService.setOverride(host);
    this.signaling?.disconnect();
    this.info = null;
    this.signaling = null;
  }

  /** Identifies this device to the server (replayed on every reconnect). */
  identify(role: PeerRole, conferenceCode: string) {
    this.identity = { role, conferenceCode };
    return this.signaling?.identify(role, conferenceCode) ?? false;
  }

  /** Discovers the server, then opens the signaling channel when reachable. */
  async connect(): Promise<ServerInfo> {
    const info = await DiscoveryService.discover();
    this.info = info;
    if (!info.reachable) {
      this.signaling = null;
      return info;
    }
    if (this.signaling?.isOpen() && this.signaling.getHost() === info.host) return this.info;
    this.signaling = new SignalingService(info.host);
    const ok = await this.signaling.connect();
    if (!ok) {
      this.signaling = null;
      this.info = { ...info, reachable: false, simulated: true };
      return this.info;
    }
    if (this.identity) {
      this.signaling.identify(this.identity.role, this.identity.conferenceCode);
    }
    return this.info;
  }

  async health(): Promise<ServerInfo> {
    const host = DiscoveryService.candidates()[0];
    const info = await DiscoveryService.probe(host ?? "lw-translator.local");
    this.info = info;
    return info;
  }

  /**
   * Full `/health` report from the venue server: connected devices, uptime,
   * live channels and the LAN addresses it is reachable on (used by the admin
   * monitoring panel). Returns null when no server answers.
   */
  async healthReport(): Promise<ServerHealth | null> {
    const base = this.baseUrl();
    if (!base) return null;
    try {
      const res = await fetch(`${base}/health`, { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as ServerHealth;
    } catch {
      return null;
    }
  }

  /** Round-trip latency to the venue server, or null when not connected. */
  latency() {
    return this.signaling?.measureLatency() ?? Promise.resolve(null);
  }

  private baseUrl() {
    const host = this.info?.host ?? DiscoveryService.candidates()[0];
    if (!host || typeof window === "undefined") return null;
    const scheme = window.location.protocol === "https:" ? "https" : "http";
    return `${scheme}://${host}`;
  }

  /** Conferences configured on the venue server (empty when unreachable). */
  async fetchConferences(): Promise<Conference[]> {
    const base = this.baseUrl();
    if (!base || !this.info?.reachable) return [];
    try {
      const res = await fetch(`${base}/api/conferences`, { cache: "no-store" });
      if (!res.ok) return [];
      const body = (await res.json()) as Conference[];
      return Array.isArray(body) ? body : [];
    } catch {
      return [];
    }
  }

  /** Publishes a conference to the venue server so other devices can join it. */
  async pushConference(conference: Conference): Promise<boolean> {
    const base = this.baseUrl();
    if (!base || !this.info?.reachable) return false;
    try {
      const res = await fetch(`${base}/api/conferences`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(conference),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  disconnect() {
    this.signaling?.disconnect();
    this.signaling = null;
  }
}

export const LocalServerService = new LocalServerServiceImpl();
export { DiscoveryService, SignalingService };
