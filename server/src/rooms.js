/**
 * Room / channel bookkeeping for the SFU signaling hub.
 *
 * One room per conference code. Inside a room each language channel has at most
 * one publisher (the translator) and many subscribers (the audience).
 */

class Channel {
  constructor(id, languageCode) {
    this.id = id;
    this.languageCode = languageCode;
    this.publisher = null;
    this.subscribers = new Set();
  }

  get live() {
    return Boolean(this.publisher);
  }

  get listeners() {
    return this.subscribers.size;
  }
}

class Room {
  constructor(code) {
    this.code = code;
    this.peers = new Set();
    this.peerById = new Map();
    this.channels = new Map();
  }

  channel(id, languageCode = id) {
    let channel = this.channels.get(id);
    if (!channel) {
      channel = new Channel(id, languageCode);
      this.channels.set(id, channel);
    }
    return channel;
  }

  snapshot() {
    return {
      code: this.code,
      peers: this.peers.size,
      channels: [...this.channels.values()].map((c) => ({
        channelId: c.id,
        languageCode: c.languageCode,
        live: c.live,
        listeners: c.listeners,
      })),
    };
  }
}

export class Hub {
  constructor() {
    this.rooms = new Map();
  }

  room(code) {
    const key = String(code ?? "LOBBY")
      .trim()
      .toUpperCase();
    let room = this.rooms.get(key);
    if (!room) {
      room = new Room(key);
      this.rooms.set(key, room);
    }
    return room;
  }

  join(peer, code) {
    const room = this.room(code);
    peer.room = room;
    room.peers.add(peer);
    room.peerById.set(peer.id, peer);
    return room;
  }

  publish(peer, channelId, languageCode) {
    if (!peer.room) return null;
    const channel = peer.room.channel(channelId, languageCode);
    // One translator per language channel. A second translator is refused so a
    // live channel can never be hijacked mid-session.
    if (channel.publisher && channel.publisher !== peer) {
      return { channel, accepted: false, reason: "channel-busy" };
    }
    channel.publisher = peer;
    peer.published.add(channel.id);
    return { channel, accepted: true };
  }

  subscribe(peer, channelId, languageCode) {
    if (!peer.room) return null;
    const channel = peer.room.channel(channelId, languageCode);
    channel.subscribers.add(peer);
    peer.subscribed.add(channel.id);
    return channel;
  }

  unsubscribe(peer, channelId) {
    const channel = peer.room?.channels.get(channelId);
    if (!channel) return null;
    channel.subscribers.delete(peer);
    peer.subscribed.delete(channelId);
    return channel;
  }

  unpublish(peer, channelId) {
    const channel = peer.room?.channels.get(channelId);
    if (!channel) return null;
    if (channel.publisher === peer) channel.publisher = null;
    peer.published.delete(channelId);
    return channel;
  }

  leave(peer) {
    const room = peer.room;
    if (!room) return [];
    const touched = [];
    for (const channel of room.channels.values()) {
      if (channel.publisher === peer) {
        channel.publisher = null;
        touched.push(channel);
      }
      if (channel.subscribers.delete(peer)) touched.push(channel);
    }
    room.peers.delete(peer);
    room.peerById.delete(peer.id);
    peer.room = null;
    if (room.peers.size === 0) this.rooms.delete(room.code);
    return touched;
  }

  stats() {
    const rooms = [...this.rooms.values()].map((r) => r.snapshot());
    return {
      rooms,
      peers: rooms.reduce((sum, r) => sum + r.peers, 0),
      liveChannels: rooms.reduce((sum, r) => sum + r.channels.filter((c) => c.live).length, 0),
    };
  }
}
