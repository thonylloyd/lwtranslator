import { useCallback, useEffect, useRef, useState } from "react";

import type { Channel, Conference } from "@/lib/types";
import { AudioManager } from "@/services/audio/AudioManager";
import { LocalServerService } from "@/services/local-server/LocalServerService";
import { NativeBridge } from "@/services/native/NativeBridge";

import { webRTCClient } from "@/services/webrtc/WebRTCClient";

import { useConnection } from "./useConnection";

export type BroadcastState = "idle" | "ready" | "live" | "muted";

/** Translator broadcast session: mic permission, level metering, go-live. */
export function useTranslatorSession(
  conference: Conference | undefined,
  channel: Channel | undefined,
) {
  const connection = useConnection(true);
  const [broadcastState, setBroadcastState] = useState<BroadcastState>("idle");
  const [micError, setMicError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [transportReady, setTransportReady] = useState(false);
  const raf = useRef<number | null>(null);

  const audio = AudioManager.get();

  useEffect(() => {
    const loop = () => {
      setLevel(audio.getInputLevel());
      raf.current = requestAnimationFrame(loop);
    };
    if (broadcastState === "live" || broadcastState === "ready" || broadcastState === "muted") {
      raf.current = requestAnimationFrame(loop);
    }
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [broadcastState, audio]);

  useEffect(() => () => audio.releaseMicrophone(), [audio]);

  useEffect(() => {
    if (conference) LocalServerService.identify("translator", conference.code);
  }, [conference, connection.state]);

  const requestMic = useCallback(async () => {
    const result = await audio.requestMicrophone();
    setMicError(result.error ?? null);
    if (result.granted) setBroadcastState("ready");
    return result.granted;
  }, [audio]);

  const goLive = useCallback(async () => {
    if (!conference || !channel) return false;
    const stream = audio.getMicStream() ?? (await requestMic().then(() => audio.getMicStream()));
    if (!stream) return false;
    const { supported } = await webRTCClient.publish(channel.id, channel.languageCode, stream);
    setTransportReady(supported);
    setBroadcastState("live");
    // On the Android shell this keeps the mic alive with the screen off.
    NativeBridge.startAudioSession("translator");
    NativeBridge.keepAwake(true);
    return true;
  }, [audio, channel, conference, requestMic]);

  const setMuted = useCallback(
    (muted: boolean) => {
      audio.setMicMuted(muted);
      setBroadcastState(muted ? "muted" : "live");
    },
    [audio],
  );

  const stopBroadcast = useCallback(async () => {
    if (channel) await webRTCClient.stop(channel.id);
    audio.releaseMicrophone();
    NativeBridge.stopAudioSession();
    NativeBridge.keepAwake(false);
    setBroadcastState("idle");
    setTransportReady(false);
    setLevel(0);
  }, [audio, channel]);


  return {
    connection,
    broadcastState,
    isLive: broadcastState === "live" || broadcastState === "muted",
    isMuted: broadcastState === "muted",
    micGranted: broadcastState !== "idle",
    micError,
    level,
    /** false = the local SFU is not connected yet, so no audio is actually leaving the device. */
    transportReady,
    nativeAudio: AudioManager.isNative(),
    requestMic,
    goLive,
    setMuted,
    stopBroadcast,
  };
}
