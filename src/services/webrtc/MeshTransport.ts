import type { ConnectionQuality } from "@/lib/types";
import { LocalServerService } from "@/services/local-server/LocalServerService";
import type { ServerSignal } from "@/services/local-server/SignalingService";

import type { AudioChannel } from "./AudioChannel";
import type { RtcStats, WebRTCTransport } from "./WebRTCClient";

/** LAN-only: host candidates are enough, no STUN/TURN and no internet needed. */
const RTC_CONFIG: RTCConfiguration = { iceServers: [], bundlePolicy: "max-bundle" };

function qualityFor(latency: number, loss: number): ConnectionQuality {
  if (latency < 120 && loss < 0.5) return "excellent";
  if (latency < 250 && loss < 1.5) return "good";
  if (latency < 450 && loss < 4) return "fair";
  return "poor";
}

interface ChannelSession {
  channel: AudioChannel;
  role: "publisher" | "subscriber";
  /** One peer connection per remote peer (audience member, or the translator). */
  peers: Map<string, RTCPeerConnection>;
  pending: Map<string, RTCIceCandidateInit[]>;
}

/**
 * Real WebRTC audio transport. The local venue server relays SDP/ICE only; the
 * media itself flows directly over the private Wi-Fi between the translator and
 * each listener, so latency stays in the sub-500ms target and nothing leaves
 * the LAN. A native Android WebRTC bridge can replace this class wholesale.
 */
export class MeshTransport implements WebRTCTransport {
  readonly name = "lan-webrtc";
  private sessions = new Map<string, ChannelSession>();
  private off: (() => void) | null = null;

  isAvailable() {
    return (
      typeof window !== "undefined" &&
      typeof RTCPeerConnection !== "undefined" &&
      Boolean(LocalServerService.getSignaling())
    );
  }

  private signaling() {
    return LocalServerService.getSignaling();
  }

  private attach() {
    if (this.off) return;
    const signaling = this.signaling();
    if (!signaling) return;
    this.off = signaling.onMessage((message) => void this.handle(message));
  }

  private detachIfIdle() {
    if (this.sessions.size > 0) return;
    this.off?.();
    this.off = null;
  }

  /* ------------------------------------------------------------- publisher */

  async publish(channel: AudioChannel) {
    if (!this.isAvailable() || !channel.localStream) return false;
    this.attach();
    this.sessions.set(channel.id, {
      channel,
      role: "publisher",
      peers: new Map(),
      pending: new Map(),
    });
    return (
      this.signaling()?.send({
        type: "publish",
        channelId: channel.id,
        languageCode: channel.languageCode,
      }) ?? false
    );
  }

  private async offerTo(session: ChannelSession, peerId: string) {
    const stream = session.channel.localStream;
    const signaling = this.signaling();
    if (!stream || !signaling) return;
    this.closePeer(session, peerId);
    const pc = this.createPeer(session, peerId);
    stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    signaling.send({
      type: "offer",
      channelId: session.channel.id,
      to: peerId,
      sdp: { type: offer.type, sdp: offer.sdp },
    });
  }

  /* ------------------------------------------------------------ subscriber */

  async subscribe(channel: AudioChannel) {
    if (!this.isAvailable()) return false;
    this.attach();
    this.sessions.set(channel.id, {
      channel,
      role: "subscriber",
      peers: new Map(),
      pending: new Map(),
    });
    return (
      this.signaling()?.send({
        type: "subscribe",
        channelId: channel.id,
        languageCode: channel.languageCode,
      }) ?? false
    );
  }

  /* ---------------------------------------------------------- negotiation */

  private createPeer(session: ChannelSession, peerId: string) {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    session.peers.set(peerId, pc);

    pc.onicecandidate = (event) => {
      this.signaling()?.send({
        type: "candidate",
        channelId: session.channel.id,
        to: peerId,
        candidate: event.candidate ? event.candidate.toJSON() : null,
      });
    };
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) session.channel.attachRemote(stream);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        this.closePeer(session, peerId);
        if (session.role === "subscriber") session.channel.detachRemote();
      }
    };
    return pc;
  }

  private closePeer(session: ChannelSession, peerId: string) {
    const pc = session.peers.get(peerId);
    if (!pc) return;
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.onconnectionstatechange = null;
    try {
      pc.close();
    } catch {
      /* already closed */
    }
    session.peers.delete(peerId);
    session.pending.delete(peerId);
  }

  private async flushCandidates(session: ChannelSession, peerId: string, pc: RTCPeerConnection) {
    const queued = session.pending.get(peerId);
    if (!queued) return;
    session.pending.delete(peerId);
    for (const candidate of queued) {
      await pc.addIceCandidate(candidate).catch(() => undefined);
    }
  }

  private async handle(message: ServerSignal) {
    if (!("channelId" in message)) return;
    const session = this.sessions.get(message.channelId);
    if (!session) return;
    const from = "from" in message ? message.from : undefined;

    switch (message.type) {
      case "subscriber-joined": {
        if (session.role === "publisher") await this.offerTo(session, message.peerId);
        break;
      }
      case "subscriber-left": {
        this.closePeer(session, message.peerId);
        break;
      }
      case "publisher-offline": {
        session.peers.forEach((_pc, peerId) => this.closePeer(session, peerId));
        session.channel.detachRemote();
        break;
      }
      case "offer": {
        if (session.role !== "subscriber" || !from) break;
        this.closePeer(session, from);
        const pc = this.createPeer(session, from);
        await pc.setRemoteDescription(message.sdp);
        await this.flushCandidates(session, from, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.signaling()?.send({
          type: "answer",
          channelId: session.channel.id,
          to: from,
          sdp: { type: answer.type, sdp: answer.sdp },
        });
        break;
      }
      case "answer": {
        const pc = from ? session.peers.get(from) : undefined;
        if (!pc || !from) break;
        await pc.setRemoteDescription(message.sdp).catch(() => undefined);
        await this.flushCandidates(session, from, pc);
        break;
      }
      case "candidate": {
        if (!from || !message.candidate) break;
        const pc = session.peers.get(from);
        if (!pc || !pc.remoteDescription) {
          const queue = session.pending.get(from) ?? [];
          queue.push(message.candidate);
          session.pending.set(from, queue);
          break;
        }
        await pc.addIceCandidate(message.candidate).catch(() => undefined);
        break;
      }
      default:
        break;
    }
  }

  /* ---------------------------------------------------------------- teardown */

  async unpublish(channel: AudioChannel) {
    const session = this.sessions.get(channel.id);
    if (session?.role === "publisher") {
      this.signaling()?.send({ type: "channel-state", channelId: channel.id, live: false });
      session.peers.forEach((_pc, peerId) => this.closePeer(session, peerId));
      this.sessions.delete(channel.id);
    }
    this.detachIfIdle();
  }

  async unsubscribe(channel: AudioChannel) {
    const session = this.sessions.get(channel.id);
    if (session?.role === "subscriber") {
      this.signaling()?.send({ type: "unsubscribe", channelId: channel.id });
      session.peers.forEach((_pc, peerId) => this.closePeer(session, peerId));
      this.sessions.delete(channel.id);
    }
    this.detachIfIdle();
  }

  /** Real media statistics from the active peer connections. */
  async getStats(): Promise<RtcStats | null> {
    const pcs = [...this.sessions.values()].flatMap((s) => [...s.peers.values()]);
    const connected = pcs.filter((pc) => pc.connectionState === "connected");
    if (connected.length === 0) return null;

    let rttSum = 0;
    let rttCount = 0;
    let lost = 0;
    let received = 0;

    for (const pc of connected) {
      const report = await pc.getStats().catch(() => null);
      if (!report) continue;
      report.forEach((stat) => {
        const s = stat as Record<string, number | string>;
        if (stat.type === "candidate-pair" && typeof s["currentRoundTripTime"] === "number") {
          rttSum += (s["currentRoundTripTime"] as number) * 1000;
          rttCount += 1;
        }
        if (stat.type === "inbound-rtp" || stat.type === "remote-inbound-rtp") {
          if (typeof s["packetsLost"] === "number") lost += s["packetsLost"] as number;
          if (typeof s["packetsReceived"] === "number") received += s["packetsReceived"] as number;
        }
      });
    }

    const latencyMs = rttCount > 0 ? Math.round(rttSum / rttCount) : 0;
    const total = lost + received;
    const packetLoss = total > 0 ? Number(((lost / total) * 100).toFixed(2)) : 0;
    return { latencyMs, packetLoss, quality: qualityFor(latencyMs, packetLoss) };
  }
}
