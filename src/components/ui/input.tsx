import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type InputProps = ComponentProps<"input">;

function Input({ className, type, ...props }: InputProps) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                "flex h-9 w-full rounded-lg border border-input bg-card/60 px-3 py-1 text-base shadow-xs transition-[color,box-shadow,border-color] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/80 hover:border-foreground/20 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                className,
            )}
            {...props}
        />
    );
}

export { Input };
