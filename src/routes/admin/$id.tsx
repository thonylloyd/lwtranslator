import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Activity, Plus, ServerCog, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { QualityLabel, StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LANGUAGES, languageByCode } from "@/lib/types";
import { useConference } from "@/hooks/useConferences";
import { useConnection } from "@/hooks/useConnection";
import { randomId } from "@/services/data/conferenceStore";

export const Route = createFileRoute("/admin/$id")({
  head: () => ({
    meta: [
      { title: "Conference Control — LW Translator" },
      {
        name: "description",
        content:
          "Conference control: QR joining, language channels, translator assignments and live monitoring.",
      },
      { property: "og:title", content: "Conference Control — LW Translator" },
      {
        property: "og:description",
        content: "Monitor translation channels and share the join QR code.",
      },
    ],
  }),
  component: ConferenceDetail,
});

function ConferenceDetail() {
  const { id } = useParams({ from: "/admin/$id" });
  const { conference, repository } = useConference(id);
  const connection = useConnection(true);
  const [joinUrl, setJoinUrl] = useState("");
  const [newLanguage, setNewLanguage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || !conference) return;
    setJoinUrl(`${window.location.origin}/listen/${conference.code}`);
  }, [conference]);

  if (!conference) {
    return (
      <AppShell eyebrow="Administrator" title="Conference not found">
        <Button asChild variant="secondary">
          <Link to="/admin">Back to dashboard</Link>
        </Button>
      </AppShell>
    );
  }

  const totalListeners = conference.channels.reduce((sum, c) => sum + c.listeners, 0);
  const liveChannels = conference.channels.filter((c) => c.status === "live").length;

  return (
    <AppShell
      eyebrow={conference.location || "Conference"}
      title={conference.name}
      action={
        <StatusPill
          status={
            conference.status === "live"
              ? "live"
              : conference.status === "ready"
                ? "ready"
                : "offline"
          }
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="panel space-y-3 p-5">
          <p className="text-eyebrow">Conference code</p>
          <p className="font-display text-3xl font-semibold tracking-[0.2em] text-primary">
            {conference.code}
          </p>
          <p className="text-xs text-muted-foreground">
            {conference.eventDate} · {conference.startTime}–{conference.endTime}
          </p>
          <div className="flex gap-2 pt-1">
            {conference.status !== "live" ? (
              <Button
                className="flex-1"
                onClick={() => {
                  repository.setStatus(conference.id, "live");
                  toast.success("Conference started");
                }}
              >
                Start conference
              </Button>
            ) : (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  repository.setStatus(conference.id, "ended");
                  conference.channels.forEach((channel) =>
                    repository.upsertChannel(conference.id, {
                      ...channel,
                      status: "offline",
                      listeners: 0,
                    }),
                  );
                  toast.success("Conference ended");
                }}
              >
                End conference
              </Button>
            )}
          </div>
        </div>

        <div className="panel flex flex-col items-center gap-3 p-5">
          <p className="text-eyebrow">Scan to join</p>
          <div className="rounded-xl bg-foreground p-3">
            {joinUrl && (
              <QRCodeSVG value={joinUrl} size={132} bgColor="transparent" fgColor="#0b1020" />
            )}
          </div>
          <p className="break-all text-center text-[0.7rem] text-muted-foreground">
            {joinUrl || "Preparing local join address…"}
          </p>
        </div>
      </div>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-eyebrow">Translation channels</p>
          <span className="text-xs text-muted-foreground">
            {liveChannels} live · {totalListeners} listeners
          </span>
        </div>
        <div className="mt-2 grid gap-2">
          {conference.channels.map((channel) => {
            const language = languageByCode(channel.languageCode);
            return (
              <div key={channel.id} className="panel space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">
                    {language.flag} {language.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <StatusPill status={channel.status} />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${language.name} channel`}
                      onClick={() => repository.removeChannel(conference.id, channel.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor={`t-${channel.id}`} className="text-xs text-muted-foreground">
                      Assigned translator
                    </Label>
                    <Input
                      id={`t-${channel.id}`}
                      defaultValue={channel.translatorName}
                      placeholder="Translator name"
                      onBlur={(event) =>
                        repository.upsertChannel(conference.id, {
                          ...channel,
                          translatorName: event.target.value,
                          status: event.target.value ? "ready" : "offline",
                        })
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground sm:pb-2.5">
                    Listeners: <span className="text-foreground">{channel.listeners}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <form
          className="panel mt-3 flex flex-wrap items-end gap-2 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!newLanguage) return;
            if (conference.channels.some((c) => c.languageCode === newLanguage)) {
              toast.error("That language already has a channel");
              return;
            }
            repository.upsertChannel(conference.id, {
              id: randomId(),
              languageCode: newLanguage,
              translatorName: "",
              status: "offline",
            });
            setNewLanguage("");
          }}
        >
          <div className="min-w-40 flex-1 space-y-1.5">
            <Label htmlFor="add-language" className="text-xs text-muted-foreground">
              Add language channel
            </Label>
            <select
              id="add-language"
              value={newLanguage}
              onChange={(event) => setNewLanguage(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select language…</option>
              {LANGUAGES.filter(
                (l) => !conference.channels.some((c) => c.languageCode === l.code),
              ).map((language) => (
                <option key={language.code} value={language.code}>
                  {language.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="secondary">
            <Plus className="mr-1.5 size-4" /> Add
          </Button>
        </form>
      </section>

      <section className="mt-6 panel space-y-3 p-5">
        <p className="flex items-center gap-2 text-eyebrow">
          <Activity className="size-3.5" /> System status
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Local server" value={connection.simulated ? "Offline" : "Online"} />
          <Stat label="Active channels" value={String(liveChannels)} />
          <Stat
            label="Avg latency"
            value={connection.latencyMs ? `${connection.latencyMs} ms` : "—"}
          />
          <Stat
            label="Packet loss"
            value={connection.packetLoss !== null ? `${connection.packetLoss}%` : "—"}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <ServerCog className="size-3.5" /> {connection.serverHost ?? "Searching local network…"}
          </span>
          <span className="flex items-center gap-2">
            Connection <QualityLabel quality={connection.quality} />
          </span>
        </div>
        {connection.simulated && (
          <p className="text-xs text-muted-foreground">
            No local LW Translator server detected. Metrics shown are demonstration values; they
            become real once the local Node.js server and SFU are running on the venue LAN.
          </p>
        )}
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/60 p-3">
      <p className="text-eyebrow">{label}</p>
      <p className="font-display text-sm font-semibold">{value}</p>
    </div>
  );
}
