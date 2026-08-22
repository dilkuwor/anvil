import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-steel-700/80 bg-steel-900 px-3 py-1.5 text-sm text-foreground shadow-2xs transition-all duration-150 placeholder:text-muted-foreground/70 outline-none hover:border-steel-600 focus:border-accent focus:ring-2 focus:ring-accent/20 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
