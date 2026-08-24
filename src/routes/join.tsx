import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { QrCode, Search, ServerCog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConferences } from "@/hooks/useConferences";
import { useConnection } from "@/hooks/useConnection";
import { DiscoveryService, LocalServerService } from "@/services/local-server/LocalServerService";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Join a Conference — LW Translator" },
      {
        name: "description",
        content:
          "Enter your conference code or scan the venue QR code to start listening to live translation.",
      },
      { property: "og:title", content: "Join a Conference — LW Translator" },
      {
        property: "og:description",
        content: "Enter your conference code to hear live translation on your phone.",
      },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const { conferences } = useConferences();
  const connection = useConnection(true);
  const [host, setHost] = useState(() => DiscoveryService.getOverride() ?? "");

  const submit = (value: string) => {
    const normalised = value.trim().toUpperCase();
    const found = conferences.find((c) => c.code === normalised);
    if (!found) {
      toast.error("Conference not found", {
        description: "Check the code shown on the venue screen.",
      });
      return;
    }
    void navigate({ to: "/listen/$code", params: { code: normalised } });
  };

  return (
    <AppShell eyebrow="Audience" title="Join conference">
      <form
        className="panel space-y-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit(code);
        }}
      >
        <div className="space-y-2">
          <label htmlFor="code" className="text-eyebrow">
            Conference code
          </label>
          <Input
            id="code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="LW4827"
            autoCapitalize="characters"
            autoComplete="off"
            inputMode="text"
            className="h-14 text-center font-display text-2xl tracking-[0.3em]"
          />
        </div>
        <Button type="submit" size="lg" className="h-12 w-full text-base">
          Find conference
        </Button>
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <QrCode className="size-4" /> Scanning the venue QR code opens this step automatically.
        </p>
      </form>

      <div className="panel mt-4 space-y-3 p-5">
        <p className="flex items-center gap-2 text-eyebrow">
          <ServerCog className="size-3.5" /> Local server
        </p>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            {connection.serverHost ?? "Searching the local network…"}
          </span>
          <span className={connection.simulated ? "text-muted-foreground" : "text-primary"}>
            {connection.simulated ? "Not found" : "Connected"}
          </span>
        </div>
        {connection.simulated && (
          <p className="text-xs text-muted-foreground">
            No LW Translator server answered on this network yet. Conference details still open, and
            live audio starts as soon as the venue server is reachable.
          </p>
        )}
        <div className="space-y-2">
          <label htmlFor="host" className="text-eyebrow">
            Server address (optional)
          </label>
          <Input
            id="host"
            value={host}
            onChange={(event) => setHost(event.target.value)}
            placeholder="192.168.1.20:8787"
            autoCapitalize="none"
            autoComplete="off"
            inputMode="url"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to search automatically. The venue server prints its address when it starts.
          </p>
        </div>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            LocalServerService.setHost(host.trim() || null);
            void connection.retry();
          }}
        >
          <Search className="mr-2 size-4" /> Search again
        </Button>
      </div>

      {conferences.length > 0 && (
        <div className="mt-6">
          <p className="text-eyebrow">Conferences on this device</p>
          <div className="mt-2 grid gap-2">
            {conferences.map((conference) => (
              <button
                key={conference.id}
                type="button"
                onClick={() => submit(conference.code)}
                className="panel flex items-center justify-between p-4 text-left transition-colors hover:border-primary/60"
              >
                <span>
                  <span className="block font-medium">{conference.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {conference.channels.length} language channels
                  </span>
                </span>
                <span className="font-display text-sm tracking-[0.2em] text-primary">
                  {conference.code}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
