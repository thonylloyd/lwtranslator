# LW Translator — Plain English Guide

## What this is

LW Translator lets people in a room hear a live translation of what is being
said, on their own phones, through their own earphones.

One person (the translator) speaks the translation into a phone. Everyone else
opens a web page on their phone, picks a language, and hears that translator
almost instantly.

It works over a local Wi-Fi network in the building. **No internet is needed.**
Nothing is recorded, nothing leaves the room.

## The three kinds of people

| Who | What they do |
| --- | --- |
| Organiser (admin) | Creates the event, lists the languages, shows the QR code, watches how many people are listening |
| Translator | Picks a language, taps "Go live", speaks |
| Audience | Scans the QR code (or opens the link), picks a language, listens |

## What you need

1. **A Wi-Fi router.** Any normal router. It does *not* need internet — it just
   has to be switched on so the phones and the computer are on the same Wi-Fi.
2. **One computer** (laptop or small mini-PC). This is the "venue server". It sits
   quietly in the corner and passes the sound from the translator to the
   listeners.
3. **One phone per translator**, with earphones and ideally a headset mic.
4. **The audience's own phones**, each with earphones.

Rule of thumb: keep everyone on the same Wi-Fi network, and keep the router
close enough that phones at the back of the room still have good signal.

## Setting up, step by step

### Step 1 — Switch on the Wi-Fi

Power up the router. Note the Wi-Fi name and password. If it is an open guest
network, even easier. Nothing else to configure.

### Step 2 — Start the venue computer

Connect the computer to that Wi-Fi. Then start the app once:

```bash
cd server
npm install      # first time only
npm start
```

It prints something like:

```
LW Translator Server v1.0.0 listening on port 8787
  http://192.168.1.20:8787/
  advertising http://lw-translator.local:8787/ via mDNS
  Secure address (needed for translator microphones):
  https://192.168.1.20:8443/
```

Write down that address (`192.168.1.20:8787` in the example) — it is the only
technical thing anyone might need to type. Most of the time phones find the
computer by themselves, so you will not even need it.

To let the phones open the app straight from this computer (fully offline):

```bash
npm run build            # in the project's main folder
cd server && npm run bundle
npm start
```

Leave this window open for the whole event. Closing it stops the translation.

### Step 3 — Create the event

On the computer (or any phone on the same Wi-Fi) open the address above and go
to the organiser screen. Create the conference:

- Give it a name (e.g. "Sunday Service").
- Add the languages you will translate into.
- The app gives the event a short code (e.g. `ABC123`) and a QR code.

Print the QR code or put it on the screens in the room.

### Step 4 — The translator goes live

1. The translator opens the app on their phone and joins the event.
2. They choose their language.
3. They allow the microphone when the phone asks.
4. They tap **Go live** and start speaking.

Only one translator per language. If someone else tries to take over a language
that is already live, the app politely refuses and tells them why.

### Step 5 — The audience listens

1. They join the same Wi-Fi.
2. They scan the QR code (or type the event code on the join screen).
3. They tap the language they want.
4. They put in earphones and hear the translator.

Earphones matter: without them the phone's speaker will echo around the room.

## While the event is running

- **Switching language.** A listener can tap another language at any time and
  the sound switches over — no need to rejoin.
- **Losing signal.** If a phone wanders out of Wi-Fi range and comes back, it
  rejoins and resumes the same language automatically.
- **Watching the room.** The organiser screen shows which languages are live,
  how many people are listening to each one, how many devices are connected,
  and how long the venue computer has been running.
- **Adding a translator mid-event.** They just join and pick a free language.

## Big venues with more than one Wi-Fi point

If one router does not cover the whole hall, add more access points but keep
them on the **same** network: same Wi-Fi name and password, one router handing
out addresses, different channels. People can then walk from one end of the hall
to the other and the translation keeps playing.

Before the event, walk to the far corners with a phone and check it still hears
the translation.

## The phone app (Android)

There is also a proper Android app that shows the same screens but adds the
things a browser tab cannot do: it keeps the sound playing when the screen is
off, handles Bluetooth and wired earphones properly, and finds the venue
computer on the Wi-Fi by itself. It is built in Android Studio from the
`android/` folder; app icons and signing are the last steps there.

Everything works without it — the Android app is just a nicer experience for
translators who need the screen off.

## Quick checklist for event day

1. Router on. ☐
2. Venue computer on that Wi-Fi, `npm start` running. ☐
3. Event created, QR code printed and displayed. ☐
4. Translator phone joined, language picked, microphone allowed, "Go live" tapped. ☐
5. One test phone: scan QR, pick language, hear the translator. ☐
6. Sound checked at the back of the room. ☐

## If something goes wrong

| Symptom | What to do |
| --- | --- |
| Phone cannot open the app | Check it is on the venue Wi-Fi, then type the printed address on the join screen |
| "No local server found" | The window running `npm start` was closed, or the computer left the Wi-Fi |
| Listener hears nothing | Check the translator is showing "Live", and that the listener picked that same language |
| Echo in the room | Someone is listening on a phone speaker instead of earphones |
| Translator cannot go live | Another translator already owns that language; pick a different one |

### Translators: use the secure address

Phones only let a web page use the microphone over a secure link. Translators
must open **https://<computer-address>:8443/** (for example
`https://192.168.0.156:8443/`). The first time, the phone shows a security
warning — tap **Advanced → Proceed**. This is safe: it is your own venue computer.
