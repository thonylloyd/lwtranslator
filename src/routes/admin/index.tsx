import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LANGUAGES, languageByCode } from "@/lib/types";
import { LocalServerService } from "@/services/local-server/LocalServerService";
import { useConferences } from "@/hooks/useConferences";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — LW Translator" },
      {
        name: "description",
        content: "Create conferences, configure language channels, assign translators and monitor live channels.",
      },
      { property: "og:title", content: "Admin Dashboard — LW Translator" },
      { property: "og:description", content: "Manage conferences and translation channels for your event." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { conferences, repository } = useConferences();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [languageCodes, setLanguageCodes] = useState<string[]>(["fr", "es"]);

  const toggleLanguage = (code: string) =>
    setLanguageCodes((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
    );

  return (
    <AppShell
      eyebrow="Administrator"
      title="Conferences"
      action={
        <Button size="sm" onClick={() => setCreating((v) => !v)}>
          <Plus className="mr-1.5 size-4" /> New
        </Button>
      }
    >
      {creating && (
        <form
          className="panel mb-6 space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const name = String(data.get("name") ?? "").trim();
            if (!name) {
              toast.error("Conference name is required");
              return;
            }
            if (languageCodes.length === 0) {
              toast.error("Select at least one language");
              return;
            }
            const conference = repository.create({
              name,
              description: String(data.get("description") ?? ""),
              eventDate: String(data.get("eventDate") ?? ""),
              startTime: String(data.get("startTime") ?? ""),
              endTime: String(data.get("endTime") ?? ""),
              location: String(data.get("location") ?? ""),
              adminPin: String(data.get("adminPin") ?? ""),
              languageCodes,
            });
            setCreating(false);
            // Share it with the venue server so other devices can join it.
            void LocalServerService.pushConference(conference);
            toast.success(`Conference created · ${conference.code}`);
            void navigate({ to: "/admin/$id", params: { id: conference.id } });
          }}
        >
          <p className="text-eyebrow">Create conference</p>
          <div className="space-y-2">
            <Label htmlFor="name">Conference name</Label>
            <Input id="name" name="name" placeholder="LoveWorld Convention 2026" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="eventDate">Date</Label>
              <Input id="eventDate" name="eventDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start</Label>
              <Input id="startTime" name="startTime" type="time" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End</Label>
              <Input id="endTime" name="endTime" type="time" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="Main Auditorium" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPin">Admin PIN (optional)</Label>
              <Input id="adminPin" name="adminPin" inputMode="numeric" placeholder="2468" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Translation languages</Label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((language) => {
                const active = languageCodes.includes(language.code);
                return (
                  <button
                    key={language.code}
                    type="button"
                    onClick={() => toggleLanguage(language.code)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {language.flag} {language.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Create conference
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {conferences.length === 0 && (
          <p className="panel p-5 text-sm text-muted-foreground">
            No conferences yet. Create one to generate a code and QR for your attendees.
          </p>
        )}
        {conferences.map((conference) => (
          <Link
            key={conference.id}
            to="/admin/$id"
            params={{ id: conference.id }}
            className="panel block p-5 transition-colors hover:border-primary/60"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold">{conference.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3.5" /> {conference.eventDate || "Date TBC"}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" /> {conference.location || "Venue TBC"}
                  </span>
                </p>
              </div>
              <StatusPill status={conference.status === "live" ? "live" : conference.status === "ready" ? "ready" : "offline"} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-display tracking-[0.2em] text-primary">{conference.code}</span>
              {conference.channels.map((channel) => (
                <span key={channel.id} className="rounded-full bg-secondary/70 px-2 py-0.5">
                  {languageByCode(channel.languageCode).name}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
