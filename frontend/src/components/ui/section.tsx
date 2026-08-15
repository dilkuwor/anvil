import { cn } from "@/lib/utils";

export function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-steel-800 bg-steel-900 p-5", className)}>
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

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md bg-accent font-bold text-zinc-950",
          compact ? "h-6 w-6 text-[11px]" : "h-7 w-7 text-xs",
        )}
      >
        A
      </span>
      InterviewAnvil
    </span>
  );
}
