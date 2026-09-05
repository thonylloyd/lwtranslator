import { useCallback, useEffect, useRef, useState } from "react";

import type { Channel, Conference } from "@/lib/types";
import { AudioManager } from "@/services/audio/AudioManager";
import { LocalServerService } from "@/services/local-server/LocalServerService";
import { NativeBridge } from "@/services/native/NativeBridge";

import { webRTCClient } from "@/services/webrtc/WebRTCClient";

import { useConnection } from "./useConnection";

const LANGUAGE_KEY = "lw.listener.language";

/** Audience listening session: language selection, subscribe, volume. */
export function useListenerSession(conference: Conference | undefined) {
  const connection = useConnection(true);
  const audio = AudioManager.get();
  const [languageCode, setLanguageCode] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [volume, setVolumeState] = useState(0.85);
  const [resuming, setResuming] = useState(false);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(LANGUAGE_KEY);
    if (saved) setLanguageCode(saved);
  }, []);

  const selectLanguage = useCallback((code: string) => {
    setLanguageCode(code);
    if (typeof window !== "undefined") window.localStorage.setItem(LANGUAGE_KEY, code);
  }, []);

  useEffect(() => {
    if (conference) LocalServerService.identify("listener", conference.code);
  }, [conference, connection.state]);

  const channel: Channel | undefined = conference?.channels.find(
    (c) => c.languageCode === languageCode,
  );

  /** Subscribes to one language channel and plays its audio when it arrives. */
  const subscribeTo = useCallback(
    async (target: Channel) => {
      const { supported, channel: rtcChannel } = await webRTCClient.subscribe(
        target.id,
        target.languageCode,
      );
      setAudioReady(supported && Boolean(rtcChannel.remoteStream));
      // The translator's audio arrives asynchronously once media negotiation ends.
      rtcChannel.onRemoteStream((stream) => {
        if (stream) {
          audio.playRemote(stream);
          audio.setVolume(volumeRef.current);
          setAudioReady(true);
        } else {
          audio.stopRemote();
          setAudioReady(false);
        }
      });
      setListening(true);
      // Keeps playback alive in the Android shell when the phone locks.
      NativeBridge.startAudioSession("listener");
      return true;
    },
    [audio],
  );

  const connect = useCallback(async () => {
    if (!channel) return false;
    return subscribeTo(channel);
  }, [channel, subscribeTo]);

  const disconnect = useCallback(async () => {
    if (channel) await webRTCClient.stop(channel.id);
    audio.stopRemote();
    NativeBridge.stopAudioSession();
    setListening(false);
    setAudioReady(false);
  }, [audio, channel]);

  /**
   * Switching language mid-session: leave the current channel and, when the
   * listener was already listening, join the new one straight away.
   */
  const switchLanguage = useCallback(
    async (code: string) => {
      const wasListening = listening;
      const next = conference?.channels.find((c) => c.languageCode === code);
      if (channel) {
        await webRTCClient.stop(channel.id);
        audio.stopRemote();
        setAudioReady(false);
      }
      selectLanguage(code);
      if (wasListening && next) return subscribeTo(next);
      setListening(false);
      return false;
    },
    [audio, channel, conference, listening, selectLanguage, subscribeTo],
  );

  /**
   * Automatic recovery after a brief Wi-Fi drop: once signaling is back the
   * previously selected language channel is resubscribed without user action.
   */
  const previousState = useRef(connection.state);
  useEffect(() => {
    const dropped = previousState.current === "reconnecting" || previousState.current === "failed";
    previousState.current = connection.state;
    if (!dropped || connection.state !== "connected" || !listening || !channel) return;
    setResuming(true);
    void webRTCClient
      .stop(channel.id)
      .then(() => subscribeTo(channel))
      .finally(() => setResuming(false));
  }, [channel, connection.state, listening, subscribeTo]);

  const setVolume = useCallback(
    (value: number) => {
      setVolumeState(value);
      audio.setVolume(value);
    },
    [audio],
  );

  return {
    connection,
    languageCode,
    channel,
    listening,
    /** false = subscribed to the channel but the local SFU is not streaming audio yet. */
    audioReady,
    /** True while the session is being restored after a connection drop. */
    resuming,
    volume,
    selectLanguage,
    switchLanguage,
    connect,
    disconnect,
    setVolume,
  };
}
