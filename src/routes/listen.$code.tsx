import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AlertTriangle, Headphones, RefreshCw, Volume2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { QualityLabel, StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { languageByCode } from "@/lib/types";
import { useConferenceByCode } from "@/hooks/useConferences";
import { useListenerSession } from "@/hooks/useListenerSession";
import { useLiveChannels } from "@/hooks/useLiveChannels";

export const Route = createFileRoute("/listen/$code")({
  head: () => ({
    meta: [
      { title: "Live Translation — LW Translator" },
      {
        name: "description",
        content:
          "Select your language and listen to live human translation over the venue Wi-Fi network.",
      },
      { property: "og:title", content: "Live Translation — LW Translator" },
      {
        property: "og:description",
        content: "Pick a language channel and listen to live translation.",
      },
    ],
  }),
  component: ListenPage,
});

function ListenPage() {
  const { code } = useParams({ from: "/listen/$code" });
  const { conference } = useConferenceByCode(code);
  const session = useListenerSession(conference);
  const live = useLiveChannels(conference?.code);

  if (!conference) {
    return (
      <AppShell eyebrow="Audience" title="Conference not found">
        <div className="panel space-y-4 p-5">
          <p className="text-sm text-muted-foreground">
            No conference matches the code{" "}
            <span className="font-display text-foreground">{code}</span> on this device. Ask the
            event team for the current code or rescan the QR code.
          </p>
          <Button asChild variant="secondary">
            <Link to="/join">Back to join</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const { connection } = session;
  const selected = session.channel;

  return (
    <AppShell
      eyebrow={conference.name}
      title={
        session.listening
          ? `${languageByCode(selected?.languageCode ?? "").name} translation`
          : "Live translation"
      }
      action={
        <StatusPill
          status={session.listening ? "live" : connection.simulated ? "simulated" : "connected"}
        />
      }
    >
      {!session.listening ? (
        <div className="space-y-4">
          <p className="text-eyebrow">Select language</p>
          <div className="grid gap-2">
            {conference.channels.map((channel) => {
              const language = languageByCode(channel.languageCode);
              const active = session.languageCode === channel.languageCode;
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => session.selectLanguage(channel.languageCode)}
                  className={`panel flex items-center justify-between p-4 text-left transition-colors ${
                    active ? "border-primary" : "hover:border-primary/50"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>
                      {language.flag}
                    </span>
                    <span>
                      <span className="block font-medium">{language.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {channel.translatorName
                          ? `Translator: ${channel.translatorName}`
                          : "Translator not assigned"}
                      </span>
                    </span>
                  </span>
                  <StatusPill status={live.channelState(channel.id)?.live ? "live" : channel.status} />
                </button>
              );
            })}
          </div>
          <Button
            size="lg"
            className="h-14 w-full text-base"
            disabled={!selected}
            onClick={() => void session.connect()}
          >
            <Headphones className="mr-2 size-5" /> Connect
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Use earphones or headphones for the best experience.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="panel space-y-5 p-6 text-center">
            <div className="flex justify-center">
              <StatusPill status="live" className="live-glow" />
            </div>
            <div>
              <p className="font-display text-3xl font-semibold">
                {languageByCode(selected?.languageCode ?? "").flag}{" "}
                {languageByCode(selected?.languageCode ?? "").name}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {live.channelState(selected?.id ?? "")?.live === false
                  ? "Waiting for the translator to go live"
                  : selected?.translatorName
                    ? `${selected.translatorName} · translator connected`
                    : "Waiting for the translator"}
              </p>
            </div>

            <div className="space-y-2 text-left">
              <p className="flex items-center gap-2 text-eyebrow">
                <Volume2 className="size-3.5" /> Volume
              </p>
              <Slider
                value={[Math.round(session.volume * 100)]}
                max={100}
                step={1}
                onValueChange={([value]) => session.setVolume((value ?? 0) / 100)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
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

          {!session.audioReady && (
            <div className="panel flex items-start gap-3 border-ready/40 p-4">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ready" />
              <p className="text-xs text-muted-foreground">
                Channel selected and monitored, but the local translation server is not streaming
                yet. Connection figures shown are demonstration values until the venue server is
                online.
              </p>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => void session.disconnect()}>
              <RefreshCw className="mr-2 size-4" /> Change language
            </Button>
            <Button variant="destructive" onClick={() => void session.disconnect()}>
              Stop listening
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
