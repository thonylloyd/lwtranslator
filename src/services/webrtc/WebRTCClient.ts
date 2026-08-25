import type { ConnectionQuality } from "@/lib/types";

import { AudioChannel } from "./AudioChannel";
import { MeshTransport } from "./MeshTransport";

export interface RtcStats {
  latencyMs: number;
  packetLoss: number;
  quality: ConnectionQuality;
}

/**
 * Thin, UI-agnostic wrapper around the local SFU connection.
 *
 * IMPORTANT: this client does NOT emulate WebRTC. Every method returns a
 * `supported: false` result until the local Node.js SFU (Phase 2/3) answers on
 * the private LAN. The Android shell may replace this implementation with a
 * native WebRTC bridge without any UI change.
 */
export interface WebRTCTransport {
  readonly name: string;
  isAvailable(): boolean;
  publish(channel: AudioChannel): Promise<boolean>;
  subscribe(channel: AudioChannel): Promise<boolean>;
  unpublish(channel: AudioChannel): Promise<void>;
  unsubscribe(channel: AudioChannel): Promise<void>;
  getStats(): Promise<RtcStats | null>;
}

export class WebRTCClient {
  private transport: WebRTCTransport = new MeshTransport();
  private channels = new Map<string, AudioChannel>();

  setTransport(transport: WebRTCTransport) {
    this.transport = transport;
  }

  get transportName() {
    return this.transport.name;
  }

  isAvailable() {
    return this.transport.isAvailable();
  }

  channel(id: string, languageCode: string) {
    const existing = this.channels.get(id);
    if (existing) return existing;
    const channel = new AudioChannel({ id, languageCode });
    this.channels.set(id, channel);
    return channel;
  }

  async publish(id: string, languageCode: string, stream: MediaStream) {
    const channel = this.channel(id, languageCode);
    channel.attachLocal(stream);
    const supported = await this.transport.publish(channel);
    return { supported, channel };
  }

  async subscribe(id: string, languageCode: string) {
    const channel = this.channel(id, languageCode);
    const supported = await this.transport.subscribe(channel);
    return { supported, channel };
  }

  async stop(id: string) {
    const channel = this.channels.get(id);
    if (!channel) return;
    await this.transport.unpublish(channel);
    await this.transport.unsubscribe(channel);
    channel.release();
    this.channels.delete(id);
  }

  getStats() {
    return this.transport.getStats();
  }
}

export const webRTCClient = new WebRTCClient();
