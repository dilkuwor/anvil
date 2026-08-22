import Image from "next/image";

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
