export type ConferenceStatus = "ready" | "live" | "ended";
export type ChannelStatus = "offline" | "ready" | "live";
export type ConnectionState =
  | "idle"
  | "discovering"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed";
export type ConnectionQuality = "excellent" | "good" | "fair" | "poor" | "unknown";

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

export interface Channel {
  id: string;
  languageCode: string;
  translatorName: string;
  status: ChannelStatus;
  listeners: number;
}

export interface Conference {
  id: string;
  code: string;
  name: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  adminPin: string;
  status: ConferenceStatus;
  channels: Channel[];
  createdAt: string;
}

/** Live, non-persistent telemetry. Never stored in the database. */
export interface ChannelTelemetry {
  channelId: string;
  listeners: number;
  latencyMs: number;
  packetLoss: number;
  quality: ConnectionQuality;
}

export interface ServerInfo {
  host: string;
  name: string;
  reachable: boolean;
  /** True when no local LW server answered and the UI is showing simulated data. */
  simulated: boolean;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "sw", name: "Swahili", flag: "🇰🇪" },
  { code: "yo", name: "Yoruba", flag: "🇳🇬" },
  { code: "ig", name: "Igbo", flag: "🇳🇬" },
];

export function languageByCode(code: string): LanguageOption {
  return LANGUAGES.find((l) => l.code === code) ?? { code, name: code.toUpperCase(), flag: "🏳️" };
}
