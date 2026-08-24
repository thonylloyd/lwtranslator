import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { randomUUID } from "node:crypto";

import { WebSocketServer } from "ws";

import { Hub } from "./rooms.js";
import { store } from "./store.js";

const PORT = Number(process.env.PORT ?? 8787);
const SERVER_NAME = process.env.LW_SERVER_NAME ?? "LW Translator Server";
const VERSION = "1.0.0";
const STARTED_AT = Date.now();

const hub = new Hub();

/* ------------------------------------------------------------------ HTTP */

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...CORS,
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => `${i.address}:${PORT}`);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  if (url.pathname === "/health") {
    const stats = hub.stats();
    json(res, 200, {
      name: SERVER_NAME,
      version: VERSION,
      uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
      addresses: lanAddresses(),
      conferences: store.list().length,
      connectedPeers: stats.peers,
      liveChannels: stats.liveChannels,
    });
    return;
  }

  if (url.pathname === "/stats") {
    json(res, 200, hub.stats());
    return;
  }

  if (url.pathname === "/api/conferences") {
    if (req.method === "GET") return json(res, 200, store.list());
    if (req.method === "PUT") {
      const body = await readBody(req);
      if (!Array.isArray(body)) return json(res, 400, { error: "expected an array" });
      return json(res, 200, store.replaceAll(body));
    }
    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body || typeof body !== "object") return json(res, 400, { error: "invalid body" });
      const conference = { ...body, id: body.id ?? randomUUID() };
      store.upsert(conference);
      broadcastToRoom(conference.code, { type: "conference", conference });
      return json(res, 200, conference);
    }
    return json(res, 405, { error: "method not allowed" });
  }

  const match = url.pathname.match(/^\/api\/conferences\/([^/]+)$/);
  if (match) {
    const id = decodeURIComponent(match[1]);
    if (req.method === "DELETE") {
      store.remove(id);
      return json(res, 200, { ok: true });
    }
    const conference = store.list().find((c) => c.id === id) ?? store.byCode(id);
    if (!conference) return json(res, 404, { error: "not found" });
    return json(res, 200, conference);
  }

  json(res, 404, { error: "not found" });
});

/* -------------------------------------------------------------- Signaling */

const wss = new WebSocketServer({ server, path: "/signal" });

function send(peer, message) {
  if (peer.socket.readyState === peer.socket.OPEN) {
    peer.socket.send(JSON.stringify(message));
  }
}

function broadcastToRoom(code, message, except) {
  const room = code ? hub.rooms.get(String(code).trim().toUpperCase()) : null;
  if (!room) return;
  for (const peer of room.peers) {
    if (peer !== except) send(peer, message);
  }
}

function announceChannel(channel, room) {
  broadcastToRoom(room.code, {
    type: "channel-state",
    channelId: channel.id,
    languageCode: channel.languageCode,
    live: channel.live,
    listeners: channel.listeners,
  });
}

wss.on("connection", (socket) => {
  const peer = {
    id: randomUUID(),
    socket,
    role: "listener",
    room: null,
    published: new Set(),
    subscribed: new Set(),
  };

  socket.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch {
      return;
    }

    switch (message.type) {
      case "hello": {
        peer.role = message.role ?? "listener";
        const room = hub.join(peer, message.conferenceCode);
        send(peer, {
          type: "welcome",
          peerId: peer.id,
          serverName: SERVER_NAME,
          version: VERSION,
          conference: store.byCode(room.code) ?? null,
          channels: room.snapshot().channels,
        });
        break;
      }

      case "publish": {
        const channel = hub.publish(peer, message.channelId, message.languageCode);
        if (!channel) break;
        send(peer, { type: "publish-ack", channelId: channel.id, accepted: true });
        // Tell the already-waiting audience that a translator is live, and hand
        // the translator every existing subscriber so it can offer media.
        for (const subscriber of channel.subscribers) {
          send(subscriber, { type: "publisher-live", channelId: channel.id, peerId: peer.id });
          send(peer, { type: "subscriber-joined", channelId: channel.id, peerId: subscriber.id });
        }
        announceChannel(channel, peer.room);
        break;
      }

      case "subscribe": {
        const channel = hub.subscribe(peer, message.channelId, message.languageCode);
        if (!channel) break;
        send(peer, {
          type: "subscribe-ack",
          channelId: channel.id,
          live: channel.live,
          listeners: channel.listeners,
        });
        if (channel.publisher) {
          send(channel.publisher, {
            type: "subscriber-joined",
            channelId: channel.id,
            peerId: peer.id,
          });
          send(peer, {
            type: "publisher-live",
            channelId: channel.id,
            peerId: channel.publisher.id,
          });
        }
        announceChannel(channel, peer.room);
        break;
      }

      case "unsubscribe": {
        const channel = hub.unsubscribe(peer, message.channelId);
        if (!channel) break;
        if (channel.publisher) {
          send(channel.publisher, {
            type: "subscriber-left",
            channelId: channel.id,
            peerId: peer.id,
          });
        }
        announceChannel(channel, peer.room);
        break;
      }

      case "channel-state": {
        if (message.live === false) {
          const channel = hub.unpublish(peer, message.channelId);
          if (!channel) break;
          for (const subscriber of channel.subscribers) {
            send(subscriber, { type: "publisher-offline", channelId: channel.id });
          }
          announceChannel(channel, peer.room);
        }
        break;
      }

      case "offer":
      case "answer":
      case "candidate": {
        // Media negotiation relay: publisher <-> individual subscriber.
        const channel = peer.room?.channels.get(message.channelId);
        if (!channel) break;
        const direct = message.to ? peer.room.peerById.get(message.to) : null;
        const targets = direct
          ? [direct]
          : channel.publisher === peer
            ? [...channel.subscribers]
            : [channel.publisher];
        for (const target of targets) {
          if (!target || target === peer) continue;
          const { to: _ignored, ...rest } = message;
          send(target, { ...rest, from: peer.id });
        }
        break;
      }

      case "ping": {
        send(peer, { type: "pong", sentAt: message.sentAt ?? Date.now() });
        break;
      }

      default:
        break;
    }
  });

  socket.on("close", () => {
    const room = peer.room;
    const touched = hub.leave(peer);
    if (room) for (const channel of touched) announceChannel(channel, room);
  });
});

/* ----------------------------------------------------------- Stats ticker */

setInterval(() => {
  for (const room of hub.rooms.values()) {
    for (const channel of room.channels.values()) {
      broadcastToRoom(room.code, {
        type: "stats",
        channelId: channel.id,
        listeners: channel.listeners,
        live: channel.live,
      });
    }
  }
}, 2500).unref?.();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`${SERVER_NAME} v${VERSION} listening on port ${PORT}`);
  for (const address of lanAddresses()) console.log(`  http://${address}/health`);
});
