import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-steel-600 bg-steel-800 text-zinc-200",
        easy: "border-teal/30 bg-teal/10 text-teal",
        medium: "border-accent/30 bg-accent/10 text-accent-light",
        hard: "border-coral/30 bg-coral/10 text-coral",
        success: "border-success/30 bg-success/10 text-success",
        warning: "border-amber-800 bg-amber-950 text-amber-300",
        danger: "border-rose-800 bg-rose-950 text-rose-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
