import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
    {
        variants: {
            variant: {
                default:
                    "border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.12)] text-[#8B5CF6]",
                secondary:
                    "border-white/10 bg-white/[0.03] text-zinc-400",
                outline:
                    "border-white/10 bg-transparent text-zinc-400",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
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
