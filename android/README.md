# LW Translator — Android shell (Phase 5)

A thin native wrapper around the LW Translator web app. It does not duplicate any
UI: it loads the app served by the venue server and adds the things a browser
tab cannot do on an Android phone.

## What the shell adds

| Capability | Where |
| --- | --- |
| Microphone permission + WebRTC media grant | `MainActivity.kt` |
| Audio focus, voice-communication mode, speakerphone | `AudioSessionController.kt` |
| Bluetooth / wired headset routing | `AudioSessionController.kt` |
| Keeps audio alive with the screen off | `AudioSessionService.kt` (foreground service) |
| Finds the venue server on the Wi-Fi (mDNS/NSD) | `ServerDiscovery.kt` |
| `window.LWNative` bridge for the web app | `NativeBridge.kt` |
| Plain-HTTP LAN access | `res/xml/network_security_config.xml` |

## Build and run

1. Open the `android/` folder in Android Studio (Gradle 8.7+/JDK 17).
2. Start the venue server on the laptop/mini-PC (`server/README.md`).
3. Run the app on a phone joined to the same private Wi-Fi.

The shell discovers `_lwtranslator._tcp` on the LAN and loads
`http://<server-ip>:8787/`. If discovery fails it falls back to
`http://lw-translator.local:8787/` (`DEFAULT_APP_URL` in `app/build.gradle.kts`).

## Bridge contract

The web side is `src/services/native/NativeBridge.ts`. Every method is optional,
so the same code runs in a normal browser. Methods currently used:

- `getServerHost()` — `host:port` from NSD discovery
- `startAudioSession(role)` / `stopAudioSession()`
- `setSpeakerphone(on)`, `hasHeadset()`
- `keepAwake(on)`, `reload(url)`, `openExternally(url)`

## Not included

App icons (`res/mipmap-*/ic_launcher`) and a signing config still need to be
added in Android Studio before producing a release build.
