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
`channel-state`, `answer`, `candidate`, `ping`.

Server → client: `welcome`, `publish-ack`, `subscribe-ack`,
`channel-state`, `stats`, `pong`, `conference`.

One publisher (translator) and many subscribers (audience) per language
channel, scoped to a conference room by code. The `sdp`/`candidate` payloads
are relayed already, so Phase 3 only has to attach the media layer (SFU
tracks) behind the same message names.
