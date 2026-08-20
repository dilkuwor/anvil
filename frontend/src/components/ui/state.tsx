import { Button } from "@/components/ui/button";
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
      <span className="relative inline-flex h-8 w-8">
        <span className="absolute inset-0 rounded-full border-2 border-steel-800" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" />
      </span>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-1 py-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{body}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-coral/30 bg-coral/5 px-5 py-8 text-center">
      <p className="text-sm text-coral">{message}</p>
      {onRetry ? (
        <Button className="mt-4" variant="secondary" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      ) : null}
    </div>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number } = {}) {
  return <PageLoader key={rows} />;
}
