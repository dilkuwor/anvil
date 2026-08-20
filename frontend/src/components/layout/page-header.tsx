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
    <div className={cn("space-y-1", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {meta ? <div className="ml-auto text-[13px] tabular-nums text-muted-foreground">{meta}</div> : null}
      </div>
      {description || actions ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {actions ? <div className="shrink-0">{actions}</div> : null}
          {description ? (
            <p
              className={cn(
                "min-w-0 text-[13px] leading-5 text-muted-foreground",
                actions && "ml-auto max-w-xl text-right",
              )}
            >
              {description}
            </p>
          ) : null}
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
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-muted-foreground">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="inline-flex min-w-0 items-center gap-1.5">
            {index > 0 ? <span aria-hidden>/</span> : null}
            {item.href && !last ? (
              <Link href={item.href} className="hover:text-accent">
                {item.label}
              </Link>
            ) : (
              <span className={last ? "line-clamp-1 text-foreground" : undefined}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
