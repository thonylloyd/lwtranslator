import { cn } from "@/lib/utils";
import type { ChannelStatus, ConnectionQuality } from "@/lib/types";

export function StatusPill({
  status,
  className,
}: {
  status: ChannelStatus | "connected" | "reconnecting" | "simulated";
  className?: string;
}) {
  const map: Record<string, { label: string; dot: string; text: string; bg: string }> = {
    live: { label: "LIVE", dot: "bg-live", text: "text-live", bg: "bg-live/12" },
    ready: { label: "READY", dot: "bg-ready", text: "text-ready", bg: "bg-ready/12" },
    offline: { label: "OFFLINE", dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted" },
    connected: { label: "CONNECTED", dot: "bg-primary", text: "text-primary", bg: "bg-primary/12" },
    reconnecting: { label: "RECONNECTING", dot: "bg-ready", text: "text-ready", bg: "bg-ready/12" },
    simulated: { label: "SIMULATED", dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted" },
  };
  const cfg = map[status] ?? map["offline"]!;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.7rem] font-semibold tracking-[0.14em]",
        cfg.bg,
        cfg.text,
        className,
      )}
    >
      <span
        className={cn("size-2 rounded-full", cfg.dot, status === "live" && "animate-pulse")}
        aria-hidden
      />
      {cfg.label}
    </span>
  );
}

export function QualityLabel({ quality }: { quality: ConnectionQuality }) {
  const label = quality === "unknown" ? "MEASURING" : quality.toUpperCase();
  const tone =
    quality === "excellent" || quality === "good"
      ? "text-primary"
      : quality === "fair"
        ? "text-ready"
        : quality === "poor"
          ? "text-live"
          : "text-muted-foreground";
  return <span className={cn("font-display text-sm font-semibold tracking-wide", tone)}>{label}</span>;
}
