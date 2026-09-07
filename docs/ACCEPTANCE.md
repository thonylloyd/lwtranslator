# LW Translator — Acceptance criteria & MVP metric status

Legend: **Met** = implemented and verified here · **Met (venue check)** = implemented,
final confirmation needs the physical venue hardware · **Not met** = outstanding.

## Network

| Criterion                                         | Status            | Notes                                                                                |
| ------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------ |
| Router operates without internet                  | Met (venue check) | Nothing in the live path calls the internet: no STUN/TURN, no cloud, LAN hosts only. |
| Server connects to private LAN                    | Met               | Server binds `0.0.0.0:8787` and prints its LAN addresses on start.                   |
| Android phones connect to private LAN             | Met (venue check) | Shell allows cleartext local hosts and discovers the server via NSD/mDNS.            |
| PWA works on local network                        | Met               | Discovery probes same-origin, `lw-translator.local`, and a manual address.           |
| Android shell works on local network              | Met (venue check) | Needs a signed build on real devices.                                                |
| System remains functional with internet unplugged | Met               | Server, signaling and WebRTC are LAN-only; no external requests at runtime.          |

## PWA

| Criterion                              | Status | Notes                                                          |
| -------------------------------------- | ------ | -------------------------------------------------------------- |
| PWA is installable                     | Met    | `public/manifest.webmanifest` + icons, mobile-first shell.      |
| Shell can load without internet        | Met    | Venue server can host the built app (`npm run bundle`).         |
| Works inside Android WebView           | Met (venue check) | No browser-only APIs in the live path; bridge is optional.   |
| UI is mobile-first                     | Met    | Single-column, large touch targets throughout.                  |
| Local server service separated from UI | Met    | `src/services/local-server/*`.                                  |
| WebRTC service separated from UI       | Met    | `src/services/webrtc/*`.                                        |
| Audio service separated from UI        | Met    | `src/services/audio/*`.                                         |

## Translator

All met: join by code or list, pick assigned language channel, grant microphone,
GO LIVE, mute/unmute, stop broadcast, live listener count from the server.

## Audience

| Criterion                                    | Status | Notes                                                                    |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| Join conference                              | Met    | QR code, code entry, or a conference listed on the device.               |
| Select language                              | Met    | Channel list with per-channel live status.                               |
| Receive live translation                     | Met    | Real WebRTC audio over the LAN (verified with two browser contexts).     |
| Adjust volume                                | Met    | Volume slider applies to remote playback.                                |
| See connection status                        | Met    | Status pill, quality label, latency.                                     |
| Automatic reconnect after connection loss    | Met    | Signaling retries with backoff, then the channel is resubscribed and the screen shows "rejoining". |
| Switch translation language                  | Met    | In-session language chips switch channels without leaving the screen.     |

## Android

Implemented in the `android/` shell (WebView load, microphone permission,
audio focus/routing, Bluetooth and wired headsets, foreground audio service,
NSD discovery, lifecycle handling, no internet requirement). Confirmation of
each item requires a build on physical devices — the only remaining Android work
is app icons and signing in Android Studio.

## Multiple languages

| Criterion                                       | Status | Notes                                                                     |
| ----------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| Multiple channels operate simultaneously        | Met    | One publisher + many subscribers per channel, per conference room.        |
| Listeners can hear different languages at once  | Met    | Independent subscriptions per device.                                     |
| A translator cannot broadcast into another channel | Met | Server refuses a second publisher (`publish-ack accepted:false`) and the console shows "another translator is already live". Verified by the load check. |

## Administration

All met: create conference, configure language channels, assign translators,
generate the QR code (pointing at the venue server address when one is found),
see connected listeners per channel, see channel status, start/end conference,
plus server uptime, connected devices, latency, packet loss and LAN addresses.

## MVP success metric

> Can one translator speak into an Android smartphone and have 50+ people in the
> same venue hear the translation on their own smartphones with low latency while
> the venue has no internet connection?

Measured here on the venue server (`node server/scripts/load-test.js 60`):

- 60 listeners + 1 translator on one channel: **60/60 paired** with the translator
  and all told the channel is live
- signaling round-trip under that load: **7 ms average**
- full setup for 61 devices: **2.9 s**
- a second translator on the same channel: **refused**

Audio itself was verified earlier between two live browser sessions with real
SDP/ICE negotiation and a remote audio track, with no STUN/TURN and no internet.

Remaining to declare the metric fully proven: one on-site rehearsal with 50+
real phones on the venue Wi-Fi, checking measured latency and dropout rate on
the actual access points. Everything the software must provide for that test is
in place.
