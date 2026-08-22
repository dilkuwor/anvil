import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-medium tracking-tight transition-colors select-none",
  {
    variants: {
      variant: {
        default: "border border-steel-700/80 bg-steel-800/90 text-foreground",
        easy: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:border-teal/35 dark:bg-teal/10 dark:text-teal font-medium",
        medium: "border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:border-accent/35 dark:bg-accent/10 dark:text-accent-light font-medium",
        hard: "border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:border-coral/35 dark:bg-coral/10 dark:text-coral font-medium",
        success: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:border-success/35 dark:bg-success/10 dark:text-success font-medium",
        warning: "border border-amber-400/35 bg-amber-500/15 text-amber-700 dark:border-amber-500/35 dark:bg-amber-950/60 dark:text-amber-300 font-medium",
        danger: "border border-rose-400/35 bg-rose-500/15 text-rose-700 dark:border-rose-500/35 dark:bg-rose-950/60 dark:text-rose-300 font-medium",
        accent: "border border-accent/30 bg-accent/10 text-accent dark:border-accent/35 dark:bg-accent/15 dark:text-accent font-medium",
        outline: "border border-steel-700/80 bg-transparent text-muted-foreground",
      },
      size: {
        sm: "rounded px-1.5 py-0.5 text-[11px] leading-3.5",
        default: "rounded-md px-2 py-0.5 text-xs leading-4",
        lg: "rounded-md px-2.5 py-1 text-xs font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };

