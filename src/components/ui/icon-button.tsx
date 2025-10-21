import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-xl transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-agri-green-600 text-white hover:bg-agri-green-700 focus-visible:ring-agri-green-600/20",
        secondary:
          "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600/20",
        success:
          "bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600/20",
        danger:
          "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600/20",
        warning:
          "bg-yellow-600 text-white hover:bg-yellow-700 focus-visible:ring-yellow-600/20",
        info: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600/20",
        ghost:
          "text-agri-green-700 hover:bg-agri-green-100 hover:text-agri-green-800",
        outline:
          "border border-agri-green-600 bg-background text-agri-green-600 hover:bg-agri-green-600 hover:text-white hover:border-agri-green-600",
      },
      size: {
        sm: "h-8 w-8 p-1",
        default: "h-10 w-10 p-2",
        lg: "h-12 w-12 p-3",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  children: React.ReactNode;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <button
        className={cn(iconButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

export { IconButton, iconButtonVariants };
