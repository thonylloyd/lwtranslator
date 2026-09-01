/**
 * Contract between the PWA and the native Android shell (Phase 5).
 *
 * The shell (see `android/`) injects `window.LWNative` on every page load. Every
 * call is optional: on a plain browser the helpers below are no-ops, so the same
 * code runs unchanged in the PWA and inside the Android app.
 */
export interface LWNative {
  platform?: string;
  /** `host:port` of the venue server discovered over mDNS/NSD. */
  getServerHost?: () => string | null;
  /** Starts the native foreground audio session (focus, routing, background). */
  startAudioSession?: (role: "translator" | "listener") => void;
  stopAudioSession?: () => void;
  setSpeakerphone?: (enabled: boolean) => void;
  hasHeadset?: () => boolean;
  keepAwake?: (enabled: boolean) => void;
  reload?: (url?: string) => void;
  openExternally?: (url: string) => void;
}

declare global {
  interface Window {
    LWNative?: LWNative;
  }
}

function bridge(): LWNative | null {
  if (typeof window === "undefined") return null;
  return window.LWNative ?? null;
}

export const NativeBridge = {
  isNative() {
    return Boolean(bridge());
  },

  platform() {
    return bridge()?.platform ?? "web";
  },

  serverHost() {
    try {
      return bridge()?.getServerHost?.() ?? null;
    } catch {
      return null;
    }
  },

  /** Native audio focus + foreground session so audio survives screen lock. */
  startAudioSession(role: "translator" | "listener") {
    bridge()?.startAudioSession?.(role);
  },

  stopAudioSession() {
    bridge()?.stopAudioSession?.();
  },

  hasHeadset() {
    try {
      return bridge()?.hasHeadset?.() ?? null;
    } catch {
      return null;
    }
  },

  setSpeakerphone(enabled: boolean) {
    bridge()?.setSpeakerphone?.(enabled);
  },

  /** Keeps the screen on while translating or listening. */
  keepAwake(enabled: boolean) {
    bridge()?.keepAwake?.(enabled);
  },
};
