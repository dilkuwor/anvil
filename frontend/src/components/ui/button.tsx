import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-accent via-accent to-accent-light text-white font-semibold shadow-xs shadow-accent/25 hover:brightness-105 hover:shadow-md hover:shadow-accent/20 active:brightness-95",
        secondary:
          "border border-steel-700/80 bg-steel-800/90 text-foreground hover:bg-steel-700 hover:border-steel-600 shadow-2xs",
        outline:
          "border border-steel-700/80 bg-background/50 backdrop-blur-xs hover:bg-steel-800 hover:text-foreground hover:border-steel-600 shadow-2xs",
        ghost:
          "hover:bg-steel-800/70 text-muted-foreground hover:text-foreground",
        destructive:
          "bg-gradient-to-b from-rose-500 to-rose-600 text-white font-semibold shadow-xs hover:from-rose-600 hover:to-rose-700 active:brightness-95",
      },
      size: {
        default: "h-9 px-4 py-2 text-sm",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-lg px-5 text-[15px] font-semibold",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
