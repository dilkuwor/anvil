import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageLoader({
  variant = "page",
}: {
  variant?: "screen" | "page" | "inline";
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center",
        variant === "screen" && "min-h-dvh",
        variant === "page" && "min-h-[calc(100dvh-8rem)] flex-1",
        variant === "inline" && "py-10",
      )}
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="relative inline-flex h-10 w-10 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-steel-800/80" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent shadow-[0_0_14px_rgba(249,115,22,0.35)]" />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  body: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-steel-800/90 bg-steel-900/80 text-muted-foreground shadow-2xs">
        <Icon className="h-5 w-5 text-accent/80" />
      </div>
      <h3 className="mt-3.5 text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] leading-5 text-muted-foreground">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-coral/30 bg-coral/5 px-6 py-10 text-center shadow-2xs">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-coral/25 bg-coral/10 text-coral shadow-2xs">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h3 className="mt-3.5 text-sm font-semibold tracking-tight text-coral">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-[13px] text-muted-foreground leading-relaxed">{message}</p>
      {onRetry ? (
        <Button className="mt-4" variant="secondary" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      ) : null}
    </div>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number } = {}) {
  return (
    <div className="w-full space-y-4 rounded-2xl border border-steel-800/90 bg-steel-900 p-5 shadow-xs animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-5 w-40 rounded-lg" />
        <Skeleton className="h-4 w-20 rounded-lg" />
      </div>
      <div className="space-y-3 pt-2">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="h-4 flex-1 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

