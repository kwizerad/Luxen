import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-br from-primary to-[#3B82F6] text-primary-foreground shadow-sm shadow-primary/20",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-gradient-to-br from-destructive to-[#f87171] text-destructive-foreground shadow-sm shadow-destructive/20",
        outline: "text-foreground border-border/50 bg-background/50 backdrop-blur-sm",
        success:
          "border-transparent bg-gradient-to-br from-[#22C55E] to-[#4ade80] text-white shadow-sm",
        warning:
          "border-transparent bg-gradient-to-br from-[#F59E0B] to-[#fbbf24] text-white shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
