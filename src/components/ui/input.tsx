import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type InputProps = ComponentProps<"input">;

function Input({ className, type, ...props }: InputProps) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-1 focus-visible:ring-4 focus-visible:ring-ring/10 focus-visible:outline-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                className,
            )}
            {...props}
        />
    );
}

export { Input };
