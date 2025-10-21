import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-agri-green-600 text-white shadow-sm hover:bg-agri-green-700 focus-visible:ring-agri-green-600/20 dark:focus-visible:ring-agri-green-600/40",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-600/20 dark:focus-visible:ring-red-600/40",
        outline:
          "border border-agri-green-600 bg-background text-agri-green-600 shadow-sm hover:bg-agri-green-600 hover:text-white hover:border-agri-green-600 dark:border-agri-green-600 dark:hover:bg-agri-green-600 dark:hover:text-white",
        secondary:
          "bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-blue-600/20 dark:focus-visible:ring-blue-600/40",
        ghost:
          "text-agri-green-700 hover:bg-agri-green-100 hover:text-agri-green-800 dark:hover:bg-agri-green-100/10 dark:hover:text-agri-green-600",
        link: "text-agri-green-600 underline-offset-4 hover:underline hover:text-agri-green-700",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-xl gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-xl px-6 has-[>svg]:px-4",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
