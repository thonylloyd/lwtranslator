import { useCallback, useEffect, useState } from "react";

import { ConnectionManager, type ConnectionSnapshot } from "@/services/webrtc/ConnectionManager";

export function useConnection(autoConnect = false) {
  const [snapshot, setSnapshot] = useState<ConnectionSnapshot>(ConnectionManager.getSnapshot());

  useEffect(() => ConnectionManager.subscribe(setSnapshot), []);

  useEffect(() => {
    if (autoConnect) void ConnectionManager.connect();
  }, [autoConnect]);

  const connect = useCallback(() => ConnectionManager.connect(), []);
  const retry = useCallback(() => ConnectionManager.retry(), []);
  const disconnect = useCallback(() => ConnectionManager.disconnect(), []);

  return { ...snapshot, connect, retry, disconnect };
}
