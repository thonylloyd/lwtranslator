import { createSocket } from "node:dgram";
import { networkInterfaces } from "node:os";

/**
 * Minimal mDNS responder (Phase 4/5).
 *
 * Phones cannot be told an IP address at a live event, so the server answers
 * multicast DNS queries for `lw-translator.local` (A record) and advertises
 * `_lwtranslator._tcp.local` (PTR + SRV + TXT) so the Android shell's NSD
 * discovery finds it automatically. No internet, no router configuration.
 */

const MDNS_ADDRESS = "224.0.0.251";
const MDNS_PORT = 5353;
const TTL = 120;

const TYPE_A = 1;
const TYPE_PTR = 12;
const TYPE_TXT = 16;
const TYPE_SRV = 33;
const TYPE_ANY = 255;
const CLASS_IN = 1;

function localIPv4() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i.address);
}

function encodeName(name) {
  const parts = name.split(".").filter(Boolean);
  const buffers = parts.map((part) => {
    const label = Buffer.from(part, "utf8");
    return Buffer.concat([Buffer.from([label.length]), label]);
  });
  return Buffer.concat([...buffers, Buffer.from([0])]);
}

function decodeName(buffer, offset) {
  const labels = [];
  let position = offset;
  let jumped = false;
  let end = offset;
  let guard = 0;
  while (position < buffer.length && guard++ < 128) {
    const length = buffer[position];
    if (length === 0) {
      if (!jumped) end = position + 1;
      break;
    }
    if ((length & 0xc0) === 0xc0) {
      // compression pointer
      const pointer = ((length & 0x3f) << 8) | buffer[position + 1];
      if (!jumped) end = position + 2;
      jumped = true;
      position = pointer;
      continue;
    }
    labels.push(buffer.subarray(position + 1, position + 1 + length).toString("utf8"));
    position += 1 + length;
    if (!jumped) end = position;
  }
  return { name: labels.join("."), end };
}

function record(name, type, data) {
  const head = encodeName(name);
  const meta = Buffer.alloc(10);
  meta.writeUInt16BE(type, 0);
  meta.writeUInt16BE(CLASS_IN, 2);
  meta.writeUInt32BE(TTL, 4);
  meta.writeUInt16BE(data.length, 8);
  return Buffer.concat([head, meta, data]);
}

function aRecord(name, ip) {
  return record(name, TYPE_A, Buffer.from(ip.split(".").map(Number)));
}

function srvRecord(name, target, port) {
  const head = Buffer.alloc(6);
  head.writeUInt16BE(0, 0); // priority
  head.writeUInt16BE(0, 2); // weight
  head.writeUInt16BE(port, 4);
  return record(name, TYPE_SRV, Buffer.concat([head, encodeName(target)]));
}

function txtRecord(name, entries) {
  const chunks = entries.map((entry) => {
    const value = Buffer.from(entry, "utf8");
    return Buffer.concat([Buffer.from([value.length]), value]);
  });
  return record(name, TYPE_TXT, Buffer.concat(chunks.length ? chunks : [Buffer.from([0])]));
}

function ptrRecord(name, target) {
  return record(name, TYPE_PTR, encodeName(target));
}

function answerPacket(answers) {
  const header = Buffer.alloc(12);
  header.writeUInt16BE(0, 0); // id (0 for mDNS responses)
  header.writeUInt16BE(0x8400, 2); // response + authoritative
  header.writeUInt16BE(0, 4); // questions
  header.writeUInt16BE(answers.length, 6);
  return Buffer.concat([header, ...answers]);
}

function parseQuestions(buffer) {
  if (buffer.length < 12) return [];
  const flags = buffer.readUInt16BE(2);
  if ((flags & 0x8000) !== 0) return []; // a response, not a query
  const count = buffer.readUInt16BE(4);
  const questions = [];
  let offset = 12;
  for (let i = 0; i < count && offset + 4 <= buffer.length; i += 1) {
    const { name, end } = decodeName(buffer, offset);
    const type = buffer.readUInt16BE(end);
    questions.push({ name: name.toLowerCase(), type });
    offset = end + 4;
  }
  return questions;
}

export function startMdns({ port, hostname = "lw-translator.local", instance = "LW Translator" }) {
  const serviceType = "_lwtranslator._tcp.local";
  const instanceName = `${instance}.${serviceType}`;
  const socket = createSocket({ type: "udp4", reuseAddr: true });

  socket.on("message", (message, remote) => {
    const questions = parseQuestions(message);
    if (questions.length === 0) return;
    const ips = localIPv4();
    if (ips.length === 0) return;

    const answers = [];
    for (const question of questions) {
      const wantsHost = question.name === hostname.toLowerCase();
      const wantsService = question.name === serviceType;
      const wantsInstance = question.name === instanceName.toLowerCase();

      if (wantsHost && (question.type === TYPE_A || question.type === TYPE_ANY)) {
        for (const ip of ips) answers.push(aRecord(hostname, ip));
      }
      if (wantsService && (question.type === TYPE_PTR || question.type === TYPE_ANY)) {
        answers.push(ptrRecord(serviceType, instanceName));
      }
      if (wantsService || wantsInstance) {
        answers.push(srvRecord(instanceName, hostname, port));
        answers.push(txtRecord(instanceName, [`port=${port}`, "path=/", "role=venue-server"]));
        for (const ip of ips) answers.push(aRecord(hostname, ip));
      }
    }
    if (answers.length === 0) return;
    const packet = answerPacket(answers);
    socket.send(packet, MDNS_PORT, MDNS_ADDRESS);
    // Also unicast back, which some Android/iOS resolvers prefer.
    socket.send(packet, remote.port, remote.address);
  });

  socket.on("error", () => socket.close());

  return new Promise((resolvePromise) => {
    socket.bind(MDNS_PORT, () => {
      try {
        socket.addMembership(MDNS_ADDRESS);
        socket.setMulticastTTL(255);
      } catch {
        /* interface without multicast support */
      }
      socket.unref();
      resolvePromise({
        hostname,
        serviceType,
        stop: () => socket.close(),
      });
    });
  });
}
