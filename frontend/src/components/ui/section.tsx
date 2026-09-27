import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionCard({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "overflow-hidden rounded-2xl border border-steel-800 bg-steel-900 p-5 shadow-xs transition-colors dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground", className)}>
      {children}
    </h2>
  );
}

/**
 * One header for every card: an icon tile, a sentence-case title, an optional meta pill and an
 * optional action on the right, with a divider underneath. Use it as the first child of a
 * padded SectionCard; it stretches to the card's edges so the divider runs full width.
 */
export function CardHeader({
  icon: Icon,
  title,
  meta,
  action,
  className,
  flush = false,
}: {
  icon: LucideIcon;
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** For cards with no padding (p-0): the header carries its own horizontal padding only. */
  flush?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 border-b border-steel-800/80",
        flush ? "px-4 py-3" : "-mx-4 mb-4 px-4 pb-3 sm:-mx-5 sm:px-5",
        className,
      )}
    >
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </span>
      <h2 className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight text-foreground">{title}</h2>
      {meta ? (
        <span className="shrink-0 rounded-full border border-steel-800 bg-steel-950/60 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
          {meta}
        </span>
      ) : null}
      {action}
    </div>
  );
}

export function BrandMark({
  compact = false,
  wordmarkClassName,
  wordmark = "Anvil",
}: {
  compact?: boolean;
  wordmarkClassName?: string;
  wordmark?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold leading-none tracking-tight">
      <span
        className={cn(
          "relative inline-flex shrink-0 overflow-hidden rounded-[22%]",
          compact ? "h-6 w-6" : "h-7 w-7",
        )}
      >
        <Image
          src="/logo-app-v6.png"
          alt="Anvil logo"
          width={28}
          height={28}
          className="h-full w-full object-cover"
        />
      </span>
      <span className={cn("leading-none", wordmarkClassName)}>{wordmark}</span>
    </span>
  );
}
