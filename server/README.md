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
