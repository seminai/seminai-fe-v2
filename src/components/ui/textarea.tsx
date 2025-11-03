import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-foreground/40 dark:placeholder:text-foreground/50 selection:bg-primary selection:text-primary-foreground flex w-full min-w-0 rounded-xl bg-white/70 dark:bg-input/30 backdrop-blur supports-[backdrop-filter]:bg-white/60 px-3 py-2 text-base inset-shadow-xs transition-[background-color,border-color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "border border-black/5 dark:border-white/10 hover:border-black/15 dark:hover:border-white/20",
        "focus-visible:ring-2 focus-visible:ring-[#0A84FF]/80 focus-visible:border-transparent",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
