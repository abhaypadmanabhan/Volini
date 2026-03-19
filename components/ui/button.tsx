"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default:
                    "bg-[#8B5CF6] text-white shadow-[0_0_32px_rgba(139,92,246,0.35)] hover:bg-[#7C3AED] hover:scale-[1.03] active:scale-[0.98]",
                outline:
                    "border border-[rgba(139,92,246,0.3)] bg-transparent text-[#8B5CF6] hover:bg-[rgba(139,92,246,0.1)]",
                ghost:
                    "bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white",
                secondary:
                    "bg-[rgba(139,92,246,0.12)] text-[#8B5CF6] border border-[rgba(139,92,246,0.25)] hover:bg-[rgba(139,92,246,0.2)]",
            },
            size: {
                default: "h-11 px-8 py-3",
                sm: "h-8 px-4 text-xs",
                lg: "h-13 px-10 text-base",
                icon: "h-9 w-9",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
