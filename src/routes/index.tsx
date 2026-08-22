import { createFileRoute, Link } from "@tanstack/react-router";
import { Headphones, Mic, Radio, ShieldCheck, WifiOff } from "lucide-react";

import { BrandMark } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LW Translator — Live Translation Over Local Wi-Fi" },
      {
        name: "description",
        content:
          "LW Translator turns attendee smartphones into live translation receivers over a private venue Wi-Fi network. No internet required.",
      },
      { property: "og:title", content: "LW Translator — Live Translation Over Local Wi-Fi" },
      {
        property: "og:description",
        content:
          "Join a conference, pick your language and listen to live human translation on your phone. Works without internet.",
      },
    ],
  }),
  component: Welcome,
});

const ROLES = [
  {
    to: "/join",
    icon: Headphones,
    eyebrow: "Audience",
    title: "Listen",
    body: "Join the conference, choose your language and hear live translation on your phone.",
  },
  {
    to: "/translator",
    icon: Mic,
    eyebrow: "Translator",
    title: "Broadcast",
    body: "Open your assigned language channel and go live to the venue.",
  },
  {
    to: "/admin",
    icon: Radio,
    eyebrow: "Administrator",
    title: "Manage",
    body: "Create conferences, configure languages, assign translators and monitor channels.",
  },
] as const;

function Welcome() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 w-full max-w-3xl items-center px-4">
        <BrandMark />
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-6">
        <p className="text-eyebrow">LoveWorld Translator App</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
          Live translation, straight to every phone in the room.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          LW Translator replaces conference receivers and earpieces. Connect to the venue Wi-Fi,
          select a language and listen — no mobile data, no internet.
        </p>

        <div className="mt-8 grid gap-3">
          {ROLES.map((role) => (
            <Link
              key={role.to}
              to={role.to}
              className="panel group flex items-center gap-4 p-5 transition-colors hover:border-primary/60"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                <role.icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="text-eyebrow">{role.eyebrow}</span>
                <span className="mt-0.5 block font-display text-lg font-semibold">{role.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{role.body}</span>
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="panel flex items-start gap-3 p-4">
            <WifiOff className="mt-0.5 size-4 text-ready" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Internet-independent.</span> Live audio
              travels only across the private venue LAN.
            </p>
          </div>
          <div className="panel flex items-start gap-3 p-4">
            <ShieldCheck className="mt-0.5 size-4 text-primary" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Access controlled.</span> Conferences are
              reachable by code or QR only.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
