import type { ChannelStatus } from "@/lib/types";

/**
 * A single language channel. One publisher (the translator) and many
 * subscribers (the audience). Media negotiation is relayed by the local venue
 * server; see `MeshTransport`.
 */
export interface AudioChannelInfo {
  id: string;
  languageCode: string;
  status: ChannelStatus;
}

type RemoteListener = (stream: MediaStream | null) => void;

export class AudioChannel {
  readonly id: string;
  readonly languageCode: string;
  status: ChannelStatus = "offline";
  /** Remote (subscribed) audio track, set by the SFU subscription. */
  remoteStream: MediaStream | null = null;
  /** Local (published) microphone track for a translator. */
  localStream: MediaStream | null = null;
  private remoteListeners = new Set<RemoteListener>();

  constructor(info: { id: string; languageCode: string }) {
    this.id = info.id;
    this.languageCode = info.languageCode;
  }

  /** Notified whenever the remote audio stream arrives or drops. */
  onRemoteStream(listener: RemoteListener) {
    this.remoteListeners.add(listener);
    if (this.remoteStream) listener(this.remoteStream);
    return () => this.remoteListeners.delete(listener);
  }

  attachLocal(stream: MediaStream) {
    this.localStream = stream;
    this.status = "ready";
  }

  attachRemote(stream: MediaStream) {
    this.remoteStream = stream;
    this.status = "live";
    this.remoteListeners.forEach((l) => l(stream));
  }

  detachRemote() {
    this.remoteStream = null;
    this.status = "ready";
    this.remoteListeners.forEach((l) => l(null));
  }

  release() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.remoteStream = null;
    this.status = "offline";
    this.remoteListeners.forEach((l) => l(null));
    this.remoteListeners.clear();
  }
}
