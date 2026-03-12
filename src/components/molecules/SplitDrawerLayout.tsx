import type { ReactNode } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { useResizePanel } from "@/hooks/useResizePanel";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEFAULT_DRAWER_WIDTH = 400;
const MIN_DRAWER_WIDTH = 320;
const MAX_DRAWER_WIDTH = 800;
const STORAGE_KEY_DEFAULT = "seminai-drawer-width";

export interface SplitDrawerLayoutProps {
  main: ReactNode;
  drawerContent: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDrawerWidth?: number;
  minDrawerWidth?: number;
  maxDrawerWidth?: number;
  storageKey?: string;
  className?: string;
}

export function SplitDrawerLayout({
  main,
  drawerContent,
  open,
  onOpenChange,
  defaultDrawerWidth = DEFAULT_DRAWER_WIDTH,
  minDrawerWidth = MIN_DRAWER_WIDTH,
  maxDrawerWidth = MAX_DRAWER_WIDTH,
  storageKey = STORAGE_KEY_DEFAULT,
  className,
}: SplitDrawerLayoutProps): React.ReactElement {
  const isDesktop = useIsDesktop();
  const { width, isResizing, getResizeHandlers } = useResizePanel({
    defaultWidth: defaultDrawerWidth,
    minWidth: minDrawerWidth,
    maxWidth: maxDrawerWidth,
    storageKey,
  });

  if (!isDesktop) {
    return (
      <>
        {main}
        <Drawer open={open} onOpenChange={onOpenChange} direction="right">
          <DrawerContent
            data-vaul-drawer-direction="right"
            className="max-w-[90vw] sm:max-w-[400px]"
          >
            {drawerContent}
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <div
      className={cn("flex h-full w-full min-h-0", className)}
      data-slot="split-drawer-layout"
    >
      <div className="flex-1 min-w-0 min-h-0 overflow-hidden">{main}</div>

      {open && (
        <>
          <div
            role="separator"
            aria-label="Resize drawer"
            tabIndex={0}
            className={cn(
              "flex flex-shrink-0 w-1.5 cursor-col-resize select-none",
              "flex flex-col items-center justify-center",
              "hover:bg-neutral-200/60 transition-colors",
              isResizing && "bg-primary/10"
            )}
            onMouseDown={getResizeHandlers().onMouseDown}
          />
          <div
            className="relative flex flex-col flex-shrink-0 overflow-hidden rounded-l-2xl bg-neutral-50/80 border border-neutral-200/60 shadow-[0_0_40px_-12px_rgba(0,0,0,0.12)]"
            style={{ width: `${width}px` }}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 z-10 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-neutral-200/60"
              onClick={() => onOpenChange(false)}
              aria-label="Close drawer"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
            {drawerContent}
          </div>
        </>
      )}
    </div>
  );
}
