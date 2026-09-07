# LW Translator — Local Venue Server (Phase 2)

Runs on a laptop/mini-PC on the venue's private Wi-Fi. No internet required.

## Run

```bash
cd server
npm install
npm start           # PORT=8787 by default
```

Optional environment variables:

| Variable         | Default                  | Purpose                          |
| ---------------- | ------------------------ | -------------------------------- |
| `PORT`           | `8787`                   | HTTP + WebSocket port            |
| `LW_SERVER_NAME` | `LW Translator Server`   | Name shown in the app            |
| `LW_DATA_FILE`   | `./data/conferences.json`| Conference persistence file      |

On start it prints the LAN URLs. Enter that `host:port` in the app
(Join screen → "Server host") or advertise it as `lw-translator.local`
via mDNS/router DNS so discovery finds it automatically.

## HTTP API

- `GET /health` — discovery probe: name, version, uptime, LAN addresses, peers, live channels
- `GET /stats` — per-room channel stats (listeners, live)
- `GET /api/conferences` — list conferences
- `POST /api/conferences` — create/update one conference
- `PUT /api/conferences` — replace the whole list (app sync)
- `GET|DELETE /api/conferences/:id`

## Signaling (`ws://<host>/signal`)

Client → server: `hello`, `publish`, `subscribe`, `unsubscribe`,
`channel-state`, `offer`, `answer`, `candidate` (each optionally targeted with
`to: <peerId>`), `ping`.

Server → client: `welcome`, `publish-ack`, `subscribe-ack`, `channel-state`,
`subscriber-joined`, `subscriber-left`, `publisher-live`, `publisher-offline`,
`offer`, `answer`, `candidate` (tagged with `from: <peerId>`), `stats`, `pong`,
`conference`.

One publisher (translator) and many subscribers (audience) per language
channel, scoped to a conference room by code. The server relays SDP/ICE only:
audio flows directly between the translator device and each listener over the
private Wi-Fi, so no media ever leaves the LAN and latency stays low. When a
translator goes live the server pairs it with every waiting listener
(`subscriber-joined` / `publisher-live`) so negotiation starts immediately.

## Hosting the app itself (Phase 4)

The server can serve the built PWA so phones need nothing but the venue Wi-Fi:

```bash
npm run build          # in the project root
cd server && npm run bundle   # copies the build into server/public
npm start
```

Override the folder with `LW_STATIC_DIR=/path/to/build`. Unknown paths fall back
to `index.html` so deep links like `/listen/ABC123` work offline.

## Automatic discovery (mDNS)

On start the server advertises itself on the LAN:

- hostname `lw-translator.local`
- service `_lwtranslator._tcp` on port 8787

Phones and the Android shell find it without typing an IP address. If UDP 5353
is unavailable (another mDNS daemon), the server keeps running and you enter the
printed `host:port` manually. Disable with `LW_MDNS=off`.

## Venue checklist

1. Wi-Fi router powered on, no internet needed.
2. Laptop/mini-PC joined to that Wi-Fi, `npm start` running.
3. Translator phone opens the app, picks its language, taps Go live.
4. Audience phones scan the conference QR code and pick a language.

## Multiple Wi-Fi access points

Large venues need more than one access point. Keep them all on the **same**
network (same subnet, one DHCP server, identical SSID and password, different
channels). Phones then keep the same server address as people walk between
areas, so translation keeps playing without rejoining. The admin screen lists
the addresses the server is reachable on — check them from a phone at each end
of the venue before the event.

## Load check

With the server running:

```bash
node scripts/load-test.js 60
```

It connects one translator plus 60 listeners on one channel, confirms every
listener is paired, confirms a second translator on the same channel is refused,
and prints the signaling round-trip time.
