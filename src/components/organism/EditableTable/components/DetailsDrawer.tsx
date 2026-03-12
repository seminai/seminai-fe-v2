import * as React from "react";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { SplitDrawerLayout } from "@/components/molecules/SplitDrawerLayout";
import { InternalRow } from "../types";

export interface DetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row?: InternalRow;
  title?: string;
  detailsRenderer?: (row: Record<string, unknown>) => React.ReactNode;
  /** Main content (table + filters etc.). Used as the left side on desktop split layout. */
  children?: React.ReactNode;
}

export function DetailsDrawer({
  open,
  onOpenChange,
  row,
  title,
  detailsRenderer,
  children,
}: DetailsDrawerProps): React.ReactElement | null {
  if (!detailsRenderer) {
    return (children ?? null) as React.ReactElement | null;
  }

  const drawerContent = (
    <div className="flex flex-col h-full overflow-y-auto bg-neutral-50/80">
      {title && (
        <div className="flex flex-col gap-1 px-5 pt-4 pb-3">
          <h2 className="text-foreground font-semibold text-lg tracking-tight pr-8">{title}</h2>
          <p className="text-muted-foreground text-xs">
            Visualizza e modifica i dettagli dell'elemento selezionato
          </p>
        </div>
      )}
      <div
        className={`px-4 pb-4 overflow-y-auto flex-1 min-h-0 ${
          title ? "max-h-[calc(100vh-100px)]" : "max-h-[calc(100vh-20px)]"
        }`}
      >
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {row ? detailsRenderer(row.data) : null}
        </div>
      </div>
    </div>
  );

  if (children !== undefined) {
    return (
      <SplitDrawerLayout
        main={children}
        drawerContent={drawerContent}
        open={open}
        onOpenChange={onOpenChange}
        defaultDrawerWidth={400}
        minDrawerWidth={320}
        maxDrawerWidth={800}
        storageKey="seminai-editable-table-details-drawer-width"
      />
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        data-vaul-drawer-direction="right"
        className="!w-1/2 !max-w-[50vw] sm:!w-1/2"
        style={{ width: "50vw", maxWidth: "50vw" }}
      >
        {drawerContent}
      </DrawerContent>
    </Drawer>
  );
}
