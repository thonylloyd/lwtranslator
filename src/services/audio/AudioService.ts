/**
 * Platform-agnostic audio abstraction.
 *
 *   AudioService
 *     ├── WebAudioService     (browser / PWA — used today)
 *     └── AndroidAudioService (native shell bridge — added in Phase 5)
 *
 * The UI only ever talks to `AudioService`, so introducing native Android
 * audio later does not touch any component.
 */
export interface MicPermissionResult {
  granted: boolean;
  error?: string;
}

export interface AudioService {
  readonly name: string;
  isSupported(): boolean;
  requestMicrophone(): Promise<MicPermissionResult>;
  getMicStream(): MediaStream | null;
  setMicMuted(muted: boolean): void;
  isMicMuted(): boolean;
  /** 0..1 input level, for the translator VU meter. */
  getInputLevel(): number;
  playRemote(stream: MediaStream): void;
  stopRemote(): void;
  setVolume(volume: number): void;
  getVolume(): number;
  releaseMicrophone(): void;
}

/** Voice-optimised Opus-friendly capture constraints. */
export const VOICE_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export class WebAudioService implements AudioService {
  readonly name = "web-audio";
  private micStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private buffer: Uint8Array | null = null;
  private element: HTMLAudioElement | null = null;
  private volume = 0.85;
  private muted = false;

  isSupported() {
    return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
  }

  async requestMicrophone(): Promise<MicPermissionResult> {
    if (!this.isSupported()) {
      if (typeof window !== "undefined" && !window.isSecureContext) {
        const host = window.location.hostname;
        return {
          granted: false,
          error: `Phones only allow the microphone on a secure address. Open https://${host}:8443/ instead (accept the security warning once), then try again.`,
        };
      }
      return { granted: false, error: "Microphone capture is not available on this device." };
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: VOICE_CONSTRAINTS });
      this.micStream = stream;
      this.muted = false;
      this.setupMeter(stream);
      return { granted: true };
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Microphone permission was denied."
          : "Could not access the microphone.";
      return { granted: false, error: message };
    }
  }

  private setupMeter(stream: MediaStream) {
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new Ctx();
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      this.analyser = analyser;
      this.buffer = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      this.analyser = null;
    }
  }

  getMicStream() {
    return this.micStream;
  }

  setMicMuted(muted: boolean) {
    this.muted = muted;
    this.micStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  isMicMuted() {
    return this.muted;
  }

  getInputLevel() {
    if (this.muted || !this.analyser || !this.buffer) return 0;
    this.analyser.getByteTimeDomainData(this.buffer as Uint8Array<ArrayBuffer>);
    let peak = 0;
    for (let i = 0; i < this.buffer.length; i += 1) {
      peak = Math.max(peak, Math.abs(this.buffer[i]! - 128) / 128);
    }
    return Math.min(1, peak * 1.6);
  }

  playRemote(stream: MediaStream) {
    if (typeof document === "undefined") return;
    if (!this.element) {
      this.element = document.createElement("audio");
      this.element.autoplay = true;
      this.element.setAttribute("playsinline", "true");
    }
    this.element.srcObject = stream;
    this.element.volume = this.volume;
    void this.element.play().catch(() => undefined);
  }

  stopRemote() {
    if (!this.element) return;
    this.element.pause();
    this.element.srcObject = null;
  }

  setVolume(volume: number) {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.element) this.element.volume = this.volume;
  }

  getVolume() {
    return this.volume;
  }

  releaseMicrophone() {
    this.micStream?.getTracks().forEach((track) => track.stop());
    this.micStream = null;
    this.analyser = null;
    this.buffer = null;
    void this.audioContext?.close().catch(() => undefined);
    this.audioContext = null;
  }
}
