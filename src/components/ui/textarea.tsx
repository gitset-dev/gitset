import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type TextareaProps = ComponentProps<"textarea">;

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content flex min-h-16 w-full rounded-lg border border-input bg-card/60 px-3 py-2 text-base shadow-xs transition-[color,box-shadow,border-color] placeholder:text-muted-foreground/80 hover:border-foreground/20 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
