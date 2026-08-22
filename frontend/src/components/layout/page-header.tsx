import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  meta,
  actions,
  className,
}: {
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {meta ? <div className="ml-auto text-[13px] tabular-nums text-muted-foreground font-medium">{meta}</div> : null}
      </div>
      {description || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 pt-0.5">
          {description ? (
            <p className="min-w-0 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : <div />}
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: { href?: string; label: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="inline-flex min-w-0 items-center gap-2">
            {index > 0 ? <span className="opacity-40" aria-hidden>/</span> : null}
            {item.href && !last ? (
              <Link href={item.href} className="transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className={last ? "line-clamp-1 font-medium text-foreground" : undefined}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
