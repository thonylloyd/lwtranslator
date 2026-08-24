import type { Channel, Conference, ConferenceStatus } from "@/lib/types";

/**
 * Persistent conference configuration repository.
 *
 * This is the ONLY place persistence happens. It is deliberately swappable:
 * the local implementation below keeps data on-device (so the app keeps working
 * with no internet), and a Cloud-backed implementation can replace it later
 * without touching the UI. Live audio never goes through this layer.
 */
export interface ConferenceRepository {
  list(): Conference[];
  get(id: string): Conference | undefined;
  getByCode(code: string): Conference | undefined;
  create(input: NewConference): Conference;
  update(id: string, patch: Partial<Conference>): void;
  setStatus(id: string, status: ConferenceStatus): void;
  upsertChannel(id: string, channel: Omit<Channel, "listeners"> & { listeners?: number }): void;
  removeChannel(id: string, channelId: string): void;
  remove(id: string): void;
  /** Merges conferences coming from the venue server into the local copy. */
  mergeRemote(list: Conference[]): void;
  subscribe(listener: () => void): () => void;
}

export interface NewConference {
  name: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  adminPin: string;
  languageCodes: string[];
}

const STORAGE_KEY = "lw.conferences.v1";

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "LW";
  for (let i = 0; i < 4; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function randomId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}`;
}

const SEED: Conference[] = [
  {
    id: "seed-loveworld-convention",
    code: "LW4827",
    name: "LoveWorld Convention 2026",
    description: "Main auditorium — plenary sessions with live translation.",
    eventDate: "2026-09-14",
    startTime: "09:00",
    endTime: "17:30",
    location: "Main Auditorium",
    adminPin: "2468",
    status: "ready",
    createdAt: new Date().toISOString(),
    channels: [
      {
        id: "seed-fr",
        languageCode: "fr",
        translatorName: "John Doe",
        status: "ready",
        listeners: 0,
      },
      {
        id: "seed-es",
        languageCode: "es",
        translatorName: "Mary Ade",
        status: "ready",
        listeners: 0,
      },
      {
        id: "seed-pt",
        languageCode: "pt",
        translatorName: "David Silva",
        status: "offline",
        listeners: 0,
      },
    ],
  },
];

class LocalConferenceRepository implements ConferenceRepository {
  private cache: Conference[] | null = null;
  private listeners = new Set<() => void>();

  private read(): Conference[] {
    if (this.cache) return this.cache;
    if (typeof window === "undefined") return SEED;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      this.cache = raw ? (JSON.parse(raw) as Conference[]) : SEED;
    } catch {
      this.cache = SEED;
    }
    return this.cache;
  }

  private write(next: Conference[]) {
    this.cache = next;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    this.listeners.forEach((l) => l());
  }

  list() {
    return this.read();
  }

  get(id: string) {
    return this.read().find((c) => c.id === id);
  }

  getByCode(code: string) {
    const normalised = code.trim().toUpperCase();
    return this.read().find((c) => c.code === normalised);
  }

  create(input: NewConference) {
    const conference: Conference = {
      id: randomId(),
      code: randomCode(),
      name: input.name,
      description: input.description,
      eventDate: input.eventDate,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      adminPin: input.adminPin,
      status: "ready",
      createdAt: new Date().toISOString(),
      channels: input.languageCodes.map((languageCode) => ({
        id: randomId(),
        languageCode,
        translatorName: "",
        status: "offline" as const,
        listeners: 0,
      })),
    };
    this.write([conference, ...this.read()]);
    return conference;
  }

  update(id: string, patch: Partial<Conference>) {
    this.write(this.read().map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  setStatus(id: string, status: ConferenceStatus) {
    this.update(id, { status });
  }

  upsertChannel(id: string, channel: Omit<Channel, "listeners"> & { listeners?: number }) {
    this.write(
      this.read().map((c) => {
        if (c.id !== id) return c;
        const exists = c.channels.some((ch) => ch.id === channel.id);
        const channels = exists
          ? c.channels.map((ch) => (ch.id === channel.id ? { ...ch, ...channel } : ch))
          : [...c.channels, { listeners: 0, ...channel }];
        return { ...c, channels };
      }),
    );
  }

  removeChannel(id: string, channelId: string) {
    this.write(
      this.read().map((c) =>
        c.id === id ? { ...c, channels: c.channels.filter((ch) => ch.id !== channelId) } : c,
      ),
    );
  }

  remove(id: string) {
    this.write(this.read().filter((c) => c.id !== id));
  }

  mergeRemote(list: Conference[]) {
    if (list.length === 0) return;
    const local = this.read();
    const byId = new Map(local.map((c) => [c.id, c] as const));
    for (const remote of list) {
      if (!remote?.id) continue;
      const existing = byId.get(remote.id);
      byId.set(remote.id, existing ? { ...existing, ...remote } : remote);
    }
    this.write([...byId.values()]);
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const conferenceRepository: ConferenceRepository = new LocalConferenceRepository();
export { randomId };
