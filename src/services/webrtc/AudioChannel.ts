import type { ChannelStatus } from "@/lib/types";

/**
 * A single language channel on the SFU. One publisher (the translator) and
 * many subscribers (the audience). The transport is filled in by
 * `WebRTCClient` once the local SFU exists (Phase 3).
 */
export interface AudioChannelInfo {
  id: string;
  languageCode: string;
  status: ChannelStatus;
}

export class AudioChannel {
  readonly id: string;
  readonly languageCode: string;
  status: ChannelStatus = "offline";
  /** Remote (subscribed) audio track, set by the SFU subscription. */
  remoteStream: MediaStream | null = null;
  /** Local (published) microphone track for a translator. */
  localStream: MediaStream | null = null;

  constructor(info: { id: string; languageCode: string }) {
    this.id = info.id;
    this.languageCode = info.languageCode;
  }

  attachLocal(stream: MediaStream) {
    this.localStream = stream;
    this.status = "ready";
  }

  attachRemote(stream: MediaStream) {
    this.remoteStream = stream;
    this.status = "live";
  }

  release() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.remoteStream = null;
    this.status = "offline";
  }
}
