import { useCallback, useEffect, useState } from "react";

import { LocalServerService } from "@/services/local-server/LocalServerService";

import { useConnection } from "./useConnection";

export interface LiveChannelState {
  live: boolean;
  listeners: number;
}

const EMPTY: LiveChannelState = { live: false, listeners: 0 };

/**
 * Live channel truth from the venue server (Phase 4).
 *
 * The conference repository stores configuration only; who is actually live and
 * how many listeners are attached is transient and comes from the local server
 * over the signaling socket. When no server is reachable the map stays empty and
 * callers fall back to their stored/demonstration values.
 */
export function useLiveChannels(conferenceCode?: string) {
  const connection = useConnection(true);
  const [channels, setChannels] = useState<Record<string, LiveChannelState>>({});

  useEffect(() => {
    if (conferenceCode) LocalServerService.identify("admin", conferenceCode);
  }, [conferenceCode, connection.state]);

  useEffect(() => {
    const signaling = LocalServerService.getSignaling();
    if (!signaling) {
      setChannels({});
      return;
    }
    const patch = (channelId: string, next: Partial<LiveChannelState>) =>
      setChannels((prev) => ({ ...prev, [channelId]: { ...(prev[channelId] ?? EMPTY), ...next } }));

    return signaling.onMessage((message) => {
      switch (message.type) {
        case "welcome":
          setChannels(
            Object.fromEntries(
              message.channels.map((c) => [c.channelId, { live: c.live, listeners: c.listeners }]),
            ),
          );
          break;
        case "channel-state":
        case "stats":
        case "subscribe-ack":
          patch(message.channelId, { live: message.live, listeners: message.listeners });
          break;
        case "publisher-live":
          patch(message.channelId, { live: true });
          break;
        case "publisher-offline":
          patch(message.channelId, { live: false });
          break;
        default:
          break;
      }
    });
  }, [connection.state, connection.serverHost]);

  const channelState = useCallback(
    (channelId: string): LiveChannelState | null => channels[channelId] ?? null,
    [channels],
  );

  const totalListeners = Object.values(channels).reduce((sum, c) => sum + c.listeners, 0);
  const liveCount = Object.values(channels).filter((c) => c.live).length;

  return {
    connection,
    /** True when these figures come from the venue server rather than local state. */
    fromServer: !connection.simulated && Object.keys(channels).length > 0,
    channels,
    channelState,
    totalListeners,
    liveCount,
  };
}
