import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
    {
        variants: {
            variant: {
                default:
                    "border-brand/25 bg-brand/10 text-brand",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground",
                destructive:
                    "border-destructive/25 bg-destructive/10 text-destructive",
                outline: "border-border text-foreground",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
