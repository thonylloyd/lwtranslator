/**
 * Signaling load check for the MVP success metric: one translator plus N
 * listeners on one language channel of one conference.
 *
 * It measures how long the server takes to pair every listener with the
 * translator and the signaling round-trip latency under that load. Media itself
 * is negotiated peer-to-peer over the LAN, so this exercises the part the server
 * is responsible for.
 *
 *   node scripts/load-test.js [listeners] [host]
 */
import { WebSocket } from "ws";

const LISTENERS = Number(process.argv[2] ?? 50);
const HOST = process.argv[3] ?? "127.0.0.1:8787";
const CODE = "LOADTEST";
const CHANNEL = "ch-french";

const open = (role) =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://${HOST}/signal`);
    socket.once("open", () => {
      socket.send(JSON.stringify({ type: "hello", role, conferenceCode: CODE }));
      resolve(socket);
    });
    socket.once("error", reject);
  });

const started = Date.now();
const translator = await open("translator");
let paired = 0;
let rejected = 0;
const latencies = [];

translator.on("message", (raw) => {
  const message = JSON.parse(String(raw));
  if (message.type === "subscriber-joined") paired += 1;
  if (message.type === "publish-ack" && !message.accepted) rejected += 1;
  if (message.type === "pong") latencies.push(Date.now() - message.sentAt);
});
translator.send(JSON.stringify({ type: "publish", channelId: CHANNEL, languageCode: "fr" }));

// A second translator must be refused on the same channel.
const intruder = await open("translator");
let intruderRefused = false;
intruder.on("message", (raw) => {
  const message = JSON.parse(String(raw));
  if (message.type === "publish-ack" && message.accepted === false) intruderRefused = true;
});
intruder.send(JSON.stringify({ type: "publish", channelId: CHANNEL, languageCode: "fr" }));

const listeners = [];
let liveSeen = 0;
for (let i = 0; i < LISTENERS; i += 1) {
  const socket = await open("listener");
  socket.on("message", (raw) => {
    const message = JSON.parse(String(raw));
    if (message.type === "publisher-live") liveSeen += 1;
    if (message.type === "pong") latencies.push(Date.now() - message.sentAt);
  });
  socket.send(JSON.stringify({ type: "subscribe", channelId: CHANNEL, languageCode: "fr" }));
  listeners.push(socket);
}

await new Promise((r) => setTimeout(r, 1500));
for (const socket of [translator, ...listeners]) {
  socket.send(JSON.stringify({ type: "ping", sentAt: Date.now() }));
}
await new Promise((r) => setTimeout(r, 1000));

const avg = latencies.length
  ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
  : null;
console.log(`listeners connected:       ${listeners.length}`);
console.log(`paired with translator:    ${paired}`);
console.log(`listeners told "live":     ${liveSeen}`);
console.log(`second translator refused: ${intruderRefused ? "yes" : "NO"}`);
console.log(`own publish refused:       ${rejected === 0 ? "no (correct)" : "unexpected"}`);
console.log(`signaling RTT avg:         ${avg === null ? "n/a" : `${avg} ms`}`);
console.log(`total setup time:          ${Date.now() - started} ms`);

for (const socket of [translator, intruder, ...listeners]) socket.close();
process.exit(paired === listeners.length && intruderRefused ? 0 : 1);
