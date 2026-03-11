import * as React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
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
    <>
      {title && (
        <DrawerHeader className="px-4 sm:px-6">
          <DrawerTitle className="text-lg sm:text-xl">{title}</DrawerTitle>
          <DrawerDescription className="text-sm">
            Visualizza e modifica i dettagli dell'elemento selezionato
          </DrawerDescription>
        </DrawerHeader>
      )}
      <div
        className={`p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 ${
          title ? "max-h-[calc(100vh-120px)]" : "max-h-[calc(100vh-20px)]"
        }`}
      >
        {row ? detailsRenderer(row.data) : null}
      </div>
    </>
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
