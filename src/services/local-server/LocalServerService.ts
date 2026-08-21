import type { ServerInfo } from "@/lib/types";

import { DiscoveryService } from "./DiscoveryService";
import { SignalingService } from "./SignalingService";

/**
 * Single entry point the UI uses to reach the local LW Translator server.
 * The UI never hardcodes an IP address: it calls `LocalServerService.connect()`.
 */
class LocalServerServiceImpl {
  private info: ServerInfo | null = null;
  private signaling: SignalingService | null = null;

  getInfo() {
    return this.info;
  }

  getSignaling() {
    return this.signaling;
  }

  setHost(host: string | null) {
    DiscoveryService.setOverride(host);
    this.info = null;
    this.signaling = null;
  }

  /** Discovers the server, then opens the signaling channel when reachable. */
  async connect(): Promise<ServerInfo> {
    const info = await DiscoveryService.discover();
    this.info = info;
    if (!info.reachable) {
      this.signaling = null;
      return info;
    }
    this.signaling = new SignalingService(info.host);
    const ok = await this.signaling.connect();
    if (!ok) {
      this.signaling = null;
      this.info = { ...info, reachable: false, simulated: true };
    }
    return this.info;
  }

  async health(): Promise<ServerInfo> {
    const host = DiscoveryService.candidates()[0];
    const info = await DiscoveryService.probe(host ?? "lw-translator.local");
    this.info = info;
    return info;
  }

  disconnect() {
    this.signaling?.disconnect();
    this.signaling = null;
  }
}

export const LocalServerService = new LocalServerServiceImpl();
export { DiscoveryService, SignalingService };
