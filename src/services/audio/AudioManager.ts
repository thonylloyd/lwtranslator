import { WebAudioService, type AudioService } from "./AudioService";

declare global {
  interface Window {
    LWAudioBridge?: AudioService;
  }
}

/**
 * Resolves the audio implementation for the current runtime.
 * The native Android shell can expose `window.LWAudioBridge` (native mic,
 * audio focus, Bluetooth routing) and it is picked up automatically.
 */
function resolve(): AudioService {
  if (typeof window !== "undefined" && window.LWAudioBridge) return window.LWAudioBridge;
  return new WebAudioService();
}

let instance: AudioService | null = null;

export const AudioManager = {
  get(): AudioService {
    if (!instance) instance = resolve();
    return instance;
  },
  isNative(): boolean {
    return this.get().name !== "web-audio";
  },
  reset() {
    instance?.releaseMicrophone();
    instance?.stopRemote();
    instance = null;
  },
};
