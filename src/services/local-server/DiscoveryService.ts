import type { ServerInfo } from "@/lib/types";

/**
 * Discovers the local LW Translator server on the private Wi-Fi LAN.
 *
 * v1 strategy (in priority order):
 *   1. explicit override (QR code / manual entry, persisted locally)
 *   2. same origin as the app (the PWA is usually served by the local server)
 *   3. mDNS-style hostname `lw-translator.local`
 *
 * Real mDNS enumeration is not available to browsers; the native Android shell
 * can inject a discovered host through `window.LWNative` and this service will
 * pick it up without any UI change.
 */

const OVERRIDE_KEY = "lw.server.host";
const DEFAULT_PORT = 8787;
const DEFAULT_CANDIDATES = [
  `lw-translator.local:${DEFAULT_PORT}`,
  "lw-translator.local",
  `lw.local:${DEFAULT_PORT}`,
  "lw.local",
];

/** A bare hostname also gets probed on the server's default port. */
function withDefaultPort(host: string): string[] {
  return host.includes(":") ? [host] : [host, `${host}:${DEFAULT_PORT}`];
}

declare global {
  interface Window {
    LWNative?: { getServerHost?: () => string | null };
  }
}

function isBrowser() {
  return typeof window !== "undefined";
}

export const DiscoveryService = {
  getOverride(): string | null {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(OVERRIDE_KEY);
  },

  setOverride(host: string | null) {
    if (!isBrowser()) return;
    if (host) window.localStorage.setItem(OVERRIDE_KEY, host);
    else window.localStorage.removeItem(OVERRIDE_KEY);
  },

  candidates(): string[] {
    const list: string[] = [];
    const nativeHost = isBrowser() ? window.LWNative?.getServerHost?.() : null;
    if (nativeHost) list.push(...withDefaultPort(nativeHost));
    const override = this.getOverride();
    if (override) list.push(...withDefaultPort(override));
    if (isBrowser()) list.push(...withDefaultPort(window.location.host));
    list.push(...DEFAULT_CANDIDATES);
    return [...new Set(list.filter(Boolean))];
  },

  /** Probes `/health` on each candidate. Returns the first server that answers. */
  async discover(timeoutMs = 1200): Promise<ServerInfo> {
    for (const host of this.candidates()) {
      const info = await this.probe(host, timeoutMs);
      if (info.reachable) return info;
    }
    return {
      host: this.candidates()[0] ?? "lw-translator.local",
      name: "No local server found",
      reachable: false,
      simulated: true,
    };
  },

  async probe(host: string, timeoutMs = 1200): Promise<ServerInfo> {
    if (!isBrowser()) return { host, name: host, reachable: false, simulated: true };
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const scheme = window.location.protocol === "https:" ? "https" : "http";
      const res = await fetch(`${scheme}://${host}/health`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json().catch(() => ({}))) as { name?: string };
      return { host, name: body.name ?? "LW Translator Server", reachable: true, simulated: false };
    } catch {
      return { host, name: host, reachable: false, simulated: true };
    } finally {
      window.clearTimeout(timer);
    }
  },
};
