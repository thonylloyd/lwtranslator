import { useEffect, useState } from "react";

import type { ServerHealth } from "@/lib/types";
import { LocalServerService } from "@/services/local-server/LocalServerService";

/**
 * Polls the venue server's `/health` endpoint for network and performance
 * monitoring (connected devices, uptime, LAN addresses). Returns null whenever
 * no local server answers, so callers can fall back to their own figures.
 */
export function useServerHealth(intervalMs = 5000) {
  const [health, setHealth] = useState<ServerHealth | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const report = await LocalServerService.healthReport();
      if (!cancelled) setHealth(report);
    };
    void tick();
    const timer = setInterval(() => void tick(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return health;
}
