import { useCallback, useEffect, useState } from "react";

import type { Channel, Conference } from "@/lib/types";
import { AudioManager } from "@/services/audio/AudioManager";
import { LocalServerService } from "@/services/local-server/LocalServerService";
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

  const connect = useCallback(async () => {
    if (!channel) return false;
    const { supported, channel: rtcChannel } = await webRTCClient.subscribe(
      channel.id,
      channel.languageCode,
    );
    setAudioReady(supported && Boolean(rtcChannel.remoteStream));
    // The translator's audio arrives asynchronously once media negotiation ends.
    rtcChannel.onRemoteStream((stream) => {
      if (stream) {
        audio.playRemote(stream);
        audio.setVolume(volume);
        setAudioReady(true);
      } else {
        audio.stopRemote();
        setAudioReady(false);
      }
    });
    setListening(true);
    return true;
  }, [audio, channel, volume]);

  const disconnect = useCallback(async () => {
    if (channel) await webRTCClient.stop(channel.id);
    audio.stopRemote();
    setListening(false);
    setAudioReady(false);
  }, [audio, channel]);

  const switchLanguage = useCallback(
    async (code: string) => {
      if (listening) await disconnect();
      selectLanguage(code);
    },
    [disconnect, listening, selectLanguage],
  );

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
    volume,
    selectLanguage,
    switchLanguage,
    connect,
    disconnect,
    setVolume,
  };
}
