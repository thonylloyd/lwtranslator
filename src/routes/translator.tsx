import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Mic, MicOff, Square } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { QualityLabel, StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { languageByCode, type Channel, type Conference } from "@/lib/types";
import { useConferences } from "@/hooks/useConferences";
import { useLiveChannels } from "@/hooks/useLiveChannels";
import { useTranslatorSession } from "@/hooks/useTranslatorSession";

export const Route = createFileRoute("/translator")({
  head: () => ({
    meta: [
      { title: "Translator Mode — LW Translator" },
      {
        name: "description",
        content:
          "Translator console: join the conference, open your assigned language channel and go live.",
      },
      { property: "og:title", content: "Translator Mode — LW Translator" },
      {
        property: "og:description",
        content: "Go live on your assigned language channel in seconds.",
      },
    ],
  }),
  component: TranslatorPage,
});

function TranslatorPage() {
  const { conferences } = useConferences();
  const [conferenceId, setConferenceId] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const conference = conferences.find((c) => c.id === conferenceId);
  const channel = conference?.channels.find((c) => c.id === channelId);

  if (!conference) {
    return (
      <AppShell eyebrow="Translator" title="Join conference">
        <form
          className="panel space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            const found = conferences.find((c) => c.code === code.trim().toUpperCase());
            if (!found) {
              toast.error("Conference not found");
              return;
            }
            setConferenceId(found.id);
          }}
        >
          <label htmlFor="tcode" className="text-eyebrow">
            Conference code
          </label>
          <Input
            id="tcode"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="LW4827"
            className="h-14 text-center font-display text-2xl tracking-[0.3em]"
          />
          <Button type="submit" size="lg" className="h-12 w-full">
            Continue
          </Button>
        </form>

        {conferences.length > 0 && (
          <div className="mt-6 grid gap-2">
            <p className="text-eyebrow">Available conferences</p>
            {conferences.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setConferenceId(c.id)}
                className="panel flex items-center justify-between p-4 text-left transition-colors hover:border-primary/60"
              >
                <span className="font-medium">{c.name}</span>
                <span className="font-display text-sm tracking-[0.2em] text-primary">{c.code}</span>
              </button>
            ))}
          </div>
        )}
      </AppShell>
    );
  }

  if (!channel) {
    return (
      <AppShell eyebrow={conference.name} title="Select assigned language">
        <div className="grid gap-2">
          {conference.channels.map((c) => {
            const language = languageByCode(c.languageCode);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setChannelId(c.id)}
                className="panel flex items-center justify-between p-4 text-left transition-colors hover:border-primary/60"
              >
                <span className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden>
                    {language.flag}
                  </span>
                  <span>
                    <span className="block font-medium">{language.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {c.translatorName || "Unassigned"}
                    </span>
                  </span>
                </span>
                <StatusPill status={c.status} />
              </button>
            );
          })}
        </div>
        <Button variant="ghost" className="mt-4" onClick={() => setConferenceId(null)}>
          Change conference
        </Button>
      </AppShell>
    );
  }

  return (
    <TranslatorConsole
      conference={conference}
      channel={channel}
      onLeave={() => {
        setChannelId(null);
      }}
    />
  );
}

function TranslatorConsole({
  conference,
  channel,
  onLeave,
}: {
  conference: Conference;
  channel: Channel;
  onLeave: () => void;
}) {
  const session = useTranslatorSession(conference, channel);
  const live = useLiveChannels();
  const language = languageByCode(channel.languageCode);
  const { connection } = session;

  return (
    <AppShell
      eyebrow={conference.name}
      title="Translator mode"
      action={
        <StatusPill status={session.isLive ? "live" : session.micGranted ? "ready" : "offline"} />
      }
    >
      <div className="panel space-y-6 p-6 text-center">
        <div>
          <p className="font-display text-4xl font-semibold">
            {language.flag} {language.name}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.isMuted
              ? "Muted — listeners hear nothing"
              : session.isLive
                ? "Broadcasting translation"
                : session.micGranted
                  ? "Microphone ready"
                  : "Microphone permission required"}
          </p>
        </div>

        <div className="flex h-3 gap-1" aria-hidden>
          {Array.from({ length: 24 }).map((_, index) => (
            <span
              key={index}
              className={`flex-1 rounded-full transition-colors ${
                session.level * 24 > index ? "bg-primary" : "bg-secondary"
              }`}
            />
          ))}
        </div>

        {!session.micGranted ? (
          <Button
            size="lg"
            className="h-16 w-full text-base"
            onClick={() => void session.requestMic()}
          >
            <Mic className="mr-2 size-5" /> Enable microphone
          </Button>
        ) : !session.isLive ? (
          <Button size="lg" className="h-16 w-full text-base" onClick={() => void session.goLive()}>
            <Mic className="mr-2 size-5" /> GO LIVE
          </Button>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              size="lg"
              variant={session.isMuted ? "default" : "secondary"}
              className="h-14"
              onClick={() => session.setMuted(!session.isMuted)}
            >
              {session.isMuted ? (
                <Mic className="mr-2 size-5" />
              ) : (
                <MicOff className="mr-2 size-5" />
              )}
              {session.isMuted ? "Unmute" : "Mute"}
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="h-14"
              onClick={() => void session.stopBroadcast()}
            >
              <Square className="mr-2 size-4" /> Stop broadcast
            </Button>
          </div>
        )}

        {session.micError && <p className="text-xs text-destructive">{session.micError}</p>}

        <div className="grid grid-cols-3 gap-3 text-left">
          <div className="rounded-lg bg-secondary/60 p-3">
            <p className="text-eyebrow">Listeners</p>
            <p className="font-display text-lg font-semibold">
              {live.channelState(channel.id)?.listeners ?? channel.listeners}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-3">
            <p className="text-eyebrow">Connection</p>
            <QualityLabel quality={connection.quality} />
          </div>
          <div className="rounded-lg bg-secondary/60 p-3">
            <p className="text-eyebrow">Latency</p>
            <p className="font-display text-sm font-semibold">
              {connection.latencyMs ? `${connection.latencyMs} ms` : "—"}
            </p>
          </div>
        </div>
      </div>

      {session.isLive && !session.transportReady && (
        <div className="panel mt-4 flex items-start gap-3 border-ready/40 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ready" />
          <p className="text-xs text-muted-foreground">
            Your microphone is captured locally, but the local translation server is not connected,
            so no audio is leaving this device yet. Listener and latency figures are demonstration
            values.
          </p>
        </div>
      )}

      <Button variant="ghost" className="mt-4" onClick={onLeave}>
        Change language channel
      </Button>
    </AppShell>
  );
}
