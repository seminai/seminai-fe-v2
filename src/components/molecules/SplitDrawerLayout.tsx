import type { ReactNode } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { useResizePanel } from "@/hooks/useResizePanel";
import { cn } from "@/lib/utils";
import { ChevronLeft, X } from "lucide-react";
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
              "flex flex-shrink-0 w-2 cursor-col-resize select-none",
              "flex flex-col items-center justify-center",
              "bg-neutral-100 hover:bg-neutral-200 border-l border-neutral-200",
              "transition-colors",
              isResizing && "bg-primary/10"
            )}
            onMouseDown={getResizeHandlers().onMouseDown}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-sm"
              onClick={() => onOpenChange(false)}
              aria-label="Close drawer"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <div
            className="relative flex flex-col flex-shrink-0 overflow-hidden bg-white border-l border-neutral-200 shadow-2xl"
            style={{ width: `${width}px` }}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 z-10 h-7 w-7 rounded-sm text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
              aria-label="Close drawer"
            >
              <X className="h-4 w-4" />
            </Button>
            {drawerContent}
          </div>
        </>
      )}
    </div>
  );
}
