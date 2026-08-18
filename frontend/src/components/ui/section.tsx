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
    <section id={id} className={cn("overflow-hidden rounded-2xl border border-steel-800 bg-steel-900 p-5", className)}>
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
}: {
  compact?: boolean;
  wordmarkClassName?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span
        className={cn(
          "relative inline-flex overflow-hidden rounded-[22%] bg-[#1a1224]",
          compact ? "h-6 w-6" : "h-7 w-7",
        )}
      >
        <Image
          src="/logo.png"
          alt=""
          width={28}
          height={28}
          priority
          className="h-full w-full scale-[1.08] object-cover"
        />
      </span>
      <span className={wordmarkClassName}>InterviewAnvil</span>
    </span>
  );
}
