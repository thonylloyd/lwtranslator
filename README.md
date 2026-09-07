# LW Translator

LW TRANSLATOR

Local Translation System v1

Holistic Product Requirements & Build Specification

Product Name: LW Translator
Full Name: LoveWorld Translator App
Version: v1.0
Product Type: Local, real-time multilingual translation audio platform
Primary Use Cases: Conferences, conventions, seminars, church services, meetings, educational events and multilingual gatherings

Core Technology

Frontend: React + TypeScript + Vite

Web Application/PWA: Built with Lovable

Android Application: Android Studio + Kotlin

Android Packaging: Native Android shell wrapping the PWA

Real-Time Audio: WebRTC

Local Real-Time Server: Node.js + TypeScript

WebRTC Distribution: SFU (Selective Forwarding Unit)

Persistent Database: Supabase

Network: Private local Wi-Fi LAN

Internet: Not required for live translation

1. PRODUCT OVERVIEW

LW Translator is a digital replacement for traditional conference translation receiver systems.

Instead of providing attendees with dedicated translation receivers and earpieces, LW Translator allows attendees to use their smartphones to receive live translated audio.

The system operates over a private local Wi-Fi network and does not require mobile data or internet connectivity for the live translation experience.

A translator speaks into the LW Translator application. Their audio is transmitted through a local server using WebRTC and distributed to audience members who have selected that translator's language channel.

The application will initially be built as a responsive PWA using Lovable and React/Vite. The Android application will subsequently wrap the PWA inside a native Android Studio/Kotlin shell while providing native Android capabilities where required.

Core principle

No internet. No mobile data. No dependency on venue internet for live translation.

2. PROBLEM STATEMENT

Traditional simultaneous translation systems often require:

Translator booths

Dedicated translation consoles

RF/IR transmitters

Dedicated audience receivers

Headsets

Batteries

Specialized event equipment

This creates significant logistical and financial overhead.

LW Translator seeks to replace the audience receiver component with smartphones while providing a modern, low-latency digital translation experience.

The system should allow an event organizer to deploy the service using:

A local server

A private Wi-Fi network

Translator smartphones

Audience smartphones

3. PRODUCT VISION

Create a professional multilingual translation platform that allows an event organizer to deploy an entire translation system without requiring internet connectivity.

An attendee should be able to:

Connect to the event Wi-Fi

Scan a QR code

Open LW Translator

Select their preferred language

Immediately listen to live translation

A translator should be able to:

Connect to the same Wi-Fi

Open Translator Mode

Select their assigned language

Grant microphone access

Tap GO LIVE

Begin broadcasting the translation

4. PRODUCT GOALS

G1 — Local operation

The live translation system must operate without internet access.

The following must NOT be required for live audio:

Mobile data

Public internet

Cloud server

External streaming service

G2 — Low-latency audio

Translated audio should reach listeners with minimal delay.

Target:

Less than 500 ms end-to-end latency under normal network conditions.

Preferred target:

Less than 250 ms.

G3 — Multiple languages

A single conference must support multiple simultaneous translation channels.

Example:

English

French

Spanish

Portuguese

German

G4 — Smartphone audience receivers

Audience members should be able to use ordinary Android smartphones and earphones/headphones.

G5 — Simple joining

Attendees should be able to join through:

QR code

Conference code

Local web address

Android application

G6 — Scalable architecture

The system should eventually support:

10 listeners

50 listeners

100 listeners

500 listeners

1,000+ listeners

The initial MVP should target approximately 50–100 concurrent listeners while keeping the architecture capable of scaling.

G7 — Android wrapper compatibility

The PWA must be designed from the beginning to work correctly inside a native Android WebView/shell.

The architecture must avoid unnecessary dependence on browser-only features that cannot work reliably inside Android WebView.

5. NON-GOALS FOR V1

The following are intentionally excluded from the initial version:

AI speech translation

Automatic speech-to-text translation

Cloud-based live audio streaming

Public internet streaming

Video conferencing

Video translation

Recording translation sessions

Payments

Subscription management

Social networking

Public user profiles

Complex user authentication

Automatic language translation

v1 is primarily a live human translation audio distribution system.

6. TARGET USERS

6.1 EVENT ADMINISTRATOR

The person responsible for setting up and managing the translation system.

Responsibilities:

Create conference

Configure languages

Assign translators

Monitor connections

Start/end conference

Monitor system health

6.2 TRANSLATOR

A human translator who listens to the speaker and simultaneously translates into another language.

Example:

Speaker:

English

Translator:

French

The translator broadcasts only the translated audio.

6.3 AUDIENCE MEMBER

An attendee who needs live translation.

The attendee:

Connects to the event's private Wi-Fi

Opens LW Translator

Joins the conference

Selects a language

Listens through headphones/earphones

7. CORE USER JOURNEYS

Administrator

Launch LW Translator
        ↓
Create Conference
        ↓
Enter Conference Details
        ↓
Add Languages
        ↓
Assign Translators
        ↓
Start Conference
        ↓
Display QR Code
        ↓
Monitor System
        ↓
End Conference


Translator

Connect to Event Wi-Fi
        ↓
Open LW Translator
        ↓
Select Translator Mode
        ↓
Join Conference
        ↓
Select Assigned Language
        ↓
Grant Microphone Permission
        ↓
GO LIVE
        ↓
Speak Translation


Audience

Connect to Event Wi-Fi
        ↓
Scan QR Code
        ↓
Open LW Translator
        ↓
Join Conference
        ↓
Select Language
        ↓
Connect
        ↓
Listen to Live Translation


8. HIGH-LEVEL SYSTEM ARCHITECTURE

LW Translator uses three primary layers.

Layer 1 — Application Layer

Built using:

Lovable + React + TypeScript + Vite

Responsible for:

UI

Admin dashboard

Audience interface

Translator interface

Conference management

Language management

QR joining

Connection status

Application state

Layer 2 — Native Android Shell

Built using:

Android Studio + Kotlin

The Android application will wrap the PWA inside a native Android shell.

The Android shell is responsible for capabilities where native Android provides a better or more reliable implementation than WebView alone.

Potential responsibilities:

Microphone permissions

Audio lifecycle

Audio focus

Bluetooth/headset handling

Background audio where technically appropriate

Local network capabilities

Native WebRTC integration if required

Android-specific connection management

Native notifications where required

Device lifecycle management

The Android shell should NOT duplicate the entire PWA.

The PWA remains the primary application interface.

Layer 3 — Local Real-Time Server

Built using:

Node.js + TypeScript

Responsible for:

WebRTC signaling

WebRTC connections

SFU

Audio distribution

Language channels

Connection management

Reconnection

Real-time statistics

9. OVERALL ARCHITECTURE

                         LW TRANSLATOR
                              │
                 ┌────────────┴────────────┐
                 │                         │
          APPLICATION LAYER          REAL-TIME LAYER
                 │                         │
       Lovable React/Vite PWA          WebRTC SFU
                 │                         │
                 │                    Local Node.js
                 │                       Server
                 │                         │
                 └────────────┬────────────┘
                              │
                       PRIVATE WI-FI
                              │
          ┌───────────────────┼───────────────────┐
          ↓                   ↓                   ↓
   Translator Phone      Audience Phone      Audience Phone


10. PWA + ANDROID SHELL ARCHITECTURE

This is a critical requirement.

The PWA should NOT simply be treated as an ordinary website.

It must be intentionally designed to operate in:

Normal mobile browser

PWA installation

Android WebView

Native Android shell

Architecture:

                  LW TRANSLATOR PWA
                         │
                React / TypeScript
                         │
          ┌──────────────┼──────────────┐
          ↓              ↓              ↓
       Browser        PWA Mode      Android Shell
          │              │              │
          │              │          Android Studio
          │              │              │
          └──────────────┴──────┬───────┘
                                ↓
                         Local LW Server
                                │
                              WebRTC


11. PWA REQUIREMENTS

The Lovable application must be built as a mobile-first PWA.

It must include:

Responsive design

PWA manifest

Service worker

Installable experience

Offline-capable application shell

Local server connection support

WebView compatibility

WebRTC-compatible architecture

Touch-friendly controls

Mobile-first navigation

The PWA should not assume that an internet connection is always available.

12. WEBVIEW-SAFE ARCHITECTURE

The PWA must be designed to operate correctly inside an Android WebView.

Avoid unnecessary reliance on browser-specific features that may behave differently inside WebView.

Create service abstractions for:

WebRTC

Audio

Local server discovery

Connection management

Native capabilities

Recommended conceptual structure:

src/
│
├── services/
│   ├── webrtc/
│   │   ├── WebRTCClient
│   │   ├── AudioChannel
│   │   └── ConnectionManager
│   │
│   ├── local-server/
│   │   ├── LocalServerService
│   │   ├── DiscoveryService
│   │   └── SignalingService
│   │
│   └── audio/
│       ├── AudioService
│       └── AudioManager
│
├── components/
├── pages/
├── hooks/
└── lib/


The UI must communicate with these service layers instead of embedding WebRTC/networking logic throughout the interface.

13. AUDIO SERVICE ABSTRACTION

Create an audio abstraction that can support both browser/PWA and Android implementations.

Concept:

AudioService
     │
     ├── WebAudioService
     │
     └── AndroidAudioService


The initial PWA can use the Web Audio/WebRTC implementation.

The Android shell can later provide native Android functionality when necessary.

This prevents the application from having to be rewritten when native audio capabilities are introduced.

14. LOCAL SERVER SERVICE

Create a dedicated:

LocalServerService

It must handle:

Server discovery

Server IP

Server health check

Conference discovery

WebSocket signaling

WebRTC endpoint

Reconnection

Local network status

The UI should never directly depend on a hardcoded server IP.

Instead:

LocalServerService.connect()


should handle the connection.

Possible server addresses:

192.168.1.20


or:

lw-translator.local


or a dynamically discovered local server.

15. LOCAL NETWORK ARCHITECTURE

The event uses a dedicated Wi-Fi network.

Example:

SSID: LW-TRANSLATOR-2026

Internet connection:

NOT REQUIRED

Example:

Wi-Fi Router / Access Point
          │
          ├── Local Server
          │
          ├── Translator 1
          ├── Translator 2
          ├── Translator 3
          ├── Audience 1
          ├── Audience 2
          └── Audience 100


The server and clients exist on the same LAN.

16. WEBRTC ARCHITECTURE

The system must use an SFU — Selective Forwarding Unit.

Do NOT create a separate peer-to-peer connection between the translator and every listener.

Incorrect

Translator
 ├── Listener 1
 ├── Listener 2
 ├── Listener 3
 └── Listener 100


Correct

             Translator
                  │
             WebRTC Audio
                  ↓
              ┌───────┐
              │  SFU  │
              └───┬───┘
                  │
       ┌──────────┼──────────┐
       ↓          ↓          ↓
    Listener   Listener   Listener


The translator sends one audio stream.

The SFU distributes it to listeners.

17. LANGUAGE CHANNELS

Each translation language represents a separate audio channel.

Example:

LOVEWORLD CONVENTION

AVAILABLE CHANNELS

Original Audio
English
French
Spanish
Portuguese
German


A translator may be assigned:

Translator:
John Doe

Language:
French

Input:
Original speaker audio

Output:
French translation


18. TRANSLATOR MODE

The translator screen must be extremely simple and optimized for live use.

Display

Conference name

Conference status

Assigned language

Microphone status

Live status

Connected listener count

Connection quality

Controls

GO LIVE

Mute

Unmute

STOP BROADCAST

Example:

LOVEWORLD CONVENTION

TRANSLATOR MODE

French

● READY

[ 🎙 GO LIVE ]

Listeners: 127

Connection
EXCELLENT


19. AUDIENCE MODE

The audience interface must use LIVE TRANSLATION terminology.

Example:

LOVEWORLD CONVENTION

LIVE TRANSLATION

Select Language

🇬🇧 English
🇫🇷 French
🇪🇸 Spanish
🇵🇹 Portuguese

[ CONNECT ]

Volume
━━━━━━━━━━━━

● LIVE


Once connected:

FRENCH TRANSLATION

● LIVE

Translator connected

Volume
━━━━━━━━━━━━━━

Connection: Excellent
Latency: 83 ms


The audience should never need to understand WebRTC or the local server architecture.

20. ADMIN DASHBOARD

The admin dashboard should contain:

Conference Overview

Conference name

Conference status

Conference code

QR code

Server status

Network status

Connected users

Translation Channels

LanguageTranslatorStatusListenersFrenchJohnLIVE127SpanishMaryLIVE84PortugueseDavidREADY0

System Status

Display:

Server online/offline

WebRTC status

Network status

Active connections

Packet loss

Average latency

Active channels

21. CONFERENCE CREATION

Admin selects:

Create Conference

Fields:

Conference name

Description

Event date

Start time

End time

Location

Available languages

The system generates:

Conference ID

Short conference code

QR code

Example:

Conference:
LoveWorld Convention 2026

Code:
LW4827

Status:
READY


22. QR CODE JOINING

The admin dashboard must generate a QR code.

The QR code should contain the local conference joining address.

Example concept:

http://lw.local/join/LW4827


The actual implementation should dynamically determine the local server address.

Flow:

QR Code
   ↓
LW Translator
   ↓
Conference Detected
   ↓
Select Language
   ↓
Listen to Live Translation


23. LOCAL SERVER DISCOVERY

The application should eventually support automatic discovery of the local LW Translator server.

Preferred mechanisms:

mDNS

Local DNS

QR code

Manual IP fallback

Example:

Searching for LW Translator Server...

● FOUND

LW Convention Server
192.168.1.20

[ JOIN ]


24. ANDROID SHELL REQUIREMENTS

The Android application will be built using:

Android Studio + Kotlin

The Android shell should:

Load the LW Translator PWA.

Provide required Android permissions.

Support microphone access.

Support audio output.

Support Bluetooth/headsets.

Support local network communication.

Handle Android audio focus.

Handle application lifecycle.

Support WebRTC.

Support reconnection.

Provide native functionality where WebView alone is insufficient.

The shell should not duplicate the PWA's UI unnecessarily.

25. ANDROID PERMISSIONS

The final Android implementation may require permissions such as:

RECORD_AUDIO
INTERNET
ACCESS_NETWORK_STATE
ACCESS_WIFI_STATE


Additional permissions should only be added when technically necessary.

Microphone permission must be explicitly requested before Translator Mode can broadcast.

26. ANDROID AUDIO LIFECYCLE

The Android implementation must account for:

Screen locking

Application backgrounding

Audio focus

Bluetooth headset connection

Wired headset connection

Phone calls

Other applications requesting audio focus

Microphone lifecycle

Audience playback should ideally continue under appropriate background conditions where Android permits.

Translator broadcasting should have clear behavior when the application is backgrounded or the device loses microphone access.

27. AUDIO REQUIREMENTS

WebRTC should use:

Opus codec

Target configuration:

Mono

Voice optimized

Low latency

Adaptive bitrate

Echo cancellation where appropriate

Noise suppression where appropriate

Automatic gain control where appropriate

The system should prioritize intelligibility and continuity over maximum audio quality.

28. AUDIO OUTPUT

Audience members should be encouraged to use:

Wired earphones

Bluetooth earphones

Headphones

The application should:

Respect device volume

Provide volume control

Stop audio when disconnected

Avoid unnecessarily loudspeaker playback

Clearly indicate active translation

29. RECONNECTION

If Wi-Fi briefly drops:

CONNECTED
   ↓
CONNECTION LOST
   ↓
RECONNECTING...
   ↓
CONNECTED
   ↓
RESUME SELECTED LANGUAGE


The selected language should be retained.

The application should automatically attempt reconnection where appropriate.

30. SECURITY

Because the system is local, security is primarily focused on preventing unauthorized access.

v1 should use:

Random conference ID

Conference code

Optional admin PIN

Local-only access

No public indexing

Future versions may introduce:

Encrypted conference access

Translator authentication

Admin accounts

Device authorization

31. OFFLINE REQUIREMENT

LW Translator is:

Internet-independent but network-dependent.

Internet access is NOT required for live translation.

However, the devices must be connected to the private Wi-Fi LAN.

The PWA application shell should also be cached so that the application can open without downloading its interface from the public internet.

32. SUPABASE ARCHITECTURE

Supabase may be used for persistent application data.

However:

Supabase must never be placed in the critical live-audio path.

Use Supabase for:

Conference metadata

Admin accounts

Conference configurations

Translator assignments

Persistent settings

Optional analytics

Use the local server for:

Active conference

Connected users

WebRTC sessions

Live translation channels

Real-time statistics

If internet access disappears during a conference, active translation must continue.

33. CRITICAL LOCAL-FIRST ARCHITECTURE

Do NOT build the live audio path like:

Translator Phone
 ↓
Internet
 ↓
Cloud Server
 ↓
Internet
 ↓
Audience Phone


Instead:

Translator Phone
 ↓
Private Wi-Fi
 ↓
Local WebRTC Server
 ↓
Private Wi-Fi
 ↓
Audience Phone


This requirement must be preserved throughout development.

34. PERFORMANCE TARGETS

MVP

Target:

1 conference

5 language channels

10 translators

100 listeners

Future

Target:

20+ language channels

50+ translators

1,000+ listeners

Multiple Wi-Fi access points

Performance metrics:

Audio latency: target <500 ms

Preferred latency: <250 ms

Connection establishment: <5 seconds

Reconnection: <5 seconds where network permits

Minimal audio dropouts

CPU and memory usage monitored on local server

35. WEB/PWA SERVICE ARCHITECTURE

Create clean service abstractions.

Recommended:

src/
│
├── services/
│   ├── webrtc/
│   │   ├── WebRTCClient.ts
│   │   ├── AudioChannel.ts
│   │   └── ConnectionManager.ts
│   │
│   ├── local-server/
│   │   ├── LocalServerService.ts
│   │   ├── DiscoveryService.ts
│   │   └── SignalingService.ts
│   │
│   └── audio/
│       ├── AudioService.ts
│       └── AudioManager.ts
│
├── components/
├── pages/
├── hooks/
└── lib/


The exact structure may be adapted to the Lovable project's conventions, but the separation of concerns must remain.

36. UI/UX DIRECTION

The interface should feel:

Professional

Clean

Modern

Minimal

Fast

Accessible

Mobile-first

Suitable for LoveWorld events

Suitable for conferences and seminars

Avoid making the application look like a social media platform.

The core experience is:

LANGUAGE → CONNECTION → AUDIO

Audience

Primary action:

LISTEN

Translator

Primary action:

BROADCAST

Admin

Primary action:

MANAGE

37. BRANDING

Product name:

LW Translator

Full name:

LoveWorld Translator App

Suggested tagline:

Breaking Language Barriers.

Alternative:

Your Language. Your Connection.

Use LoveWorld/LW branding appropriately while keeping the interface professional and suitable for conferences and seminars.

38. MVP SCREENS

Audience

Welcome

Join Conference

Conference Found

Select Language

Live Translation

Connection Status

Translator

Translator Entry

Select Conference

Assigned Language

Translator Console

Live Broadcasting

Admin

Admin Entry

Dashboard

Create Conference

Conference Details

Language Management

Translator Management

QR Code

Live Monitoring

Conference End

39. DEVELOPMENT PHASES

PHASE 1 — LOVABLE PWA

Build:

Complete responsive PWA

All major screens

Audience experience

Translator experience

Admin dashboard

Conference creation

Language management

Translator assignments

QR interface

Mock live status

Supabase integration

Local-server service interfaces

Do NOT create fake WebRTC functionality that pretends to be real.

Create clean interfaces/hooks for the future WebRTC implementation.

PHASE 2 — LOCAL SERVER

Build:

Node.js server

TypeScript

WebSocket signaling

Local conference API

Local server discovery

Health endpoint

PHASE 3 — WEBRTC

Implement:

Translator microphone capture

WebRTC connection

SFU

Audience subscription

Opus audio

Translation channels

PHASE 4 — PWA + LOCAL SERVER INTEGRATION

Connect the Lovable PWA to the local server.

Test:

Translator Phone
        ↓
Private Wi-Fi
        ↓
Laptop / Mini-PC Server
        ↓
Private Wi-Fi
        ↓
Audience Phones


PHASE 5 — ANDROID SHELL

Create a native Android Studio/Kotlin application that:

Loads the PWA

Provides microphone permissions

Handles audio lifecycle

Supports local networking

Supports Bluetooth/headphones

Integrates WebRTC as required

Handles Android-specific behavior

The Android application should reuse the PWA UI rather than creating a completely separate UI.

PHASE 6 — MULTI-LANGUAGE

Implement:

Multiple translation channels

Multiple translators

Channel switching

Listener counts

Translator assignments

PHASE 7 — CONFERENCE DEPLOYMENT

Implement:

QR joining

Server discovery

Reconnection

Network monitoring

Performance monitoring

Admin controls

Multi-access-point support

40. ACCEPTANCE CRITERIA

Network

Router operates without internet

Server connects to private LAN

Android phones connect to private LAN

PWA works on local network

Android shell works on local network

System remains functional when internet is disconnected

PWA

PWA is installable

Application shell can load without internet

PWA works correctly inside Android WebView

UI is mobile-first

Local server service is separated from UI

WebRTC service is separated from UI

Audio service is separated from UI

Translator

Translator can join conference

Translator can select assigned language

Translator can grant microphone permission

Translator can start broadcasting

Translator can mute/unmute

Translator can stop broadcasting

Translator can see listener count

Audience

Audience can join conference

Audience can select language

Audience can receive live translation

Audience can adjust volume

Audience sees connection status

Audience automatically reconnects after temporary connection loss

Audience can switch translation language

Android

Android app launches the PWA correctly

Android microphone permission works

Android audio playback works

Bluetooth headset works

Local server communication works

Android WebView can establish WebRTC connections

Android lifecycle is handled correctly

Application does not require public internet for live translation

Multiple Languages

Multiple translation channels operate simultaneously

Audience members can listen to different languages simultaneously

One translator cannot accidentally broadcast into another language channel

Administration

Admin can create conference

Admin can configure languages

Admin can assign translators

Admin can generate QR code

Admin can see connected listeners

Admin can see translation-channel status

Admin can end conference

41. MVP SUCCESS METRIC

The most important test is:

Can one translator speak into an Android smartphone and have 50+ people in the same physical venue hear the translation on their own smartphones with low latency while the venue has no internet connection?

If yes, the core LW Translator technology works.

Everything else is refinement.

42. FUTURE VERSIONS

v1.1

Better reconnection

Multiple access points

Improved monitoring

Translator authentication

Better analytics

Improved server discovery

v2

Improved native Android implementation

Native iOS application

Offline conference configuration

Conference templates

Multiple rooms

Advanced admin controls

Device management

v3

AI-assisted translation

Speech-to-text

Automatic translation

Translation transcripts

Recorded translation

Remote translators

AI translation should remain separate from the core human translation architecture so that it does not compromise the reliability of live human translation.

43. FINAL TECHNICAL DIRECTION

PWA

Lovable + React + TypeScript + Vite

Responsible for:

UI

Admin

Audience

Translator interface

Conference management

Language selection

QR joining

Android

Android Studio + Kotlin

Responsible for:

Native Android shell

Permissions

Audio lifecycle

Microphone

Bluetooth

Local networking

Android-specific capabilities

WebRTC support where required

Database

Supabase

Responsible for:

Persistent application data

Conference configurations

Translator assignments

Admin data

Real-Time Server

Node.js + TypeScript

Responsible for:

Signaling

WebRTC

SFU

Audio distribution

Language channels

Real-time connection management

Network

Private Wi-Fi LAN

Responsible for:

Local communication

Internet

NOT REQUIRED FOR LIVE TRANSLATION

44. FINAL SYSTEM FLOW

                         SPEAKER
                            │
                            ↓
                    HUMAN TRANSLATOR
                            │
                            ↓
                  LW TRANSLATOR APP
                            │
                            │ WebRTC
                            ↓
                ┌────────────────────┐
                │   LOCAL LW SERVER  │
                │        SFU         │
                └──────────┬─────────┘
                           │
                     PRIVATE WI-FI
                           │
            ┌──────────────┼──────────────┐
            ↓              ↓              ↓
         PHONE          PHONE          PHONE
           🇫🇷            🇪🇸            🇵🇹
            │              │              │
            ↓              ↓              ↓
        FRENCH          SPANISH       PORTUGUESE
       TRANSLATION      TRANSLATION     TRANSLATION


45. LOVABLE MASTER BUILD INSTRUCTION

Build the LW Translator — Local Translation System v1 based strictly on this PRD.

Start by building the complete responsive, mobile-first PWA and its functional application architecture.

Implement the following roles:

Admin

Translator

Audience

Build the database schema and Supabase integration for:

Conferences

Languages

Translators

Translator assignments

Conference settings

Admin data

Build all screens described in this PRD.

Use realistic mock live data where the WebRTC infrastructure is not yet connected.

Do NOT build fake WebRTC functionality that pretends to be real.

Instead, create clean service interfaces/hooks/components where the future local WebRTC server will be integrated.

The architecture must allow the WebRTC/SFU layer to be connected later without rewriting the UI.

Create dedicated abstractions for:

WebRTC

Audio

Local server communication

Server discovery

Signaling

Connection management

The PWA must be:

Mobile-first

Responsive

Installable

WebView-compatible

Local-network-ready

Internet-independent for the application shell where possible

Designed to work inside a native Android shell

Do NOT build the Android application inside Lovable.

The production Android application will be created separately using Android Studio + Kotlin and will wrap this PWA inside a native Android shell.

Therefore, design the PWA so that native Android capabilities can later be introduced without changing the application's core UI architecture.

The Android shell must eventually be able to provide native capabilities for:

Microphone permissions

Audio lifecycle

Audio focus

Bluetooth/headsets

Local networking

Background audio where technically appropriate

Native WebRTC support where required

Android lifecycle handling

The live audio path must NEVER depend on Supabase, a cloud server, or public internet connectivity.

The intended live architecture is:

Translator Android App
        ↓
Private Wi-Fi
        ↓
Local LW WebRTC Server / SFU
        ↓
Private Wi-Fi
        ↓
Audience Android Apps / PWA


The audience experience must prioritize:

JOIN → SELECT LANGUAGE → LIVE TRANSLATION → LISTEN

The translator experience must prioritize:

JOIN → SELECT ASSIGNED LANGUAGE → GO LIVE → BROADCAST

The administrator experience must prioritize:

CREATE CONFERENCE → CONFIGURE LANGUAGES → ASSIGN TRANSLATORS → DISPLAY QR → MONITOR

Use Translation instead of Interpretation throughout the user-facing application.

Use Translator instead of Interpreter throughout the user-facing application.

Use Live Translation instead of Live Interpretation throughout the user-facing application.

Do not introduce unnecessary features outside this PRD.

Build the foundation cleanly so the project can progress from PWA prototype → local WebRTC server → real live translation → native Android shell → production conference deployment without requiring a major architectural rewrite.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://lwtranslator.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d7771f8b-df4e-48ba-ab6e-9db5e133d094).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
