import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground">
        LW
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-sm font-semibold">LW Translator</span>
          <span className="block text-[0.68rem] text-muted-foreground">Breaking Language Barriers</span>
        </span>
      )}
    </Link>
  );
}

export function AppShell({
  children,
  eyebrow,
  title,
  action,
  className,
}: {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4">
          <BrandMark />
          {action}
        </div>
      </header>
      <main className={cn("mx-auto w-full max-w-3xl px-4 pb-16 pt-6", className)}>
        {(eyebrow || title) && (
          <div className="mb-6">
            {eyebrow && <p className="text-eyebrow">{eyebrow}</p>}
            {title && <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h1>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
