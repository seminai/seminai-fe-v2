import * as React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { InternalRow } from "../types";

export interface DetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row?: InternalRow;
  title?: string;
  detailsRenderer?: (row: Record<string, unknown>) => React.ReactNode;
}

export function DetailsDrawer({
  open,
  onOpenChange,
  row,
  title,
  detailsRenderer,
}: DetailsDrawerProps): React.ReactElement | null {
  if (!detailsRenderer) {
    return null;
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        data-vaul-drawer-direction="right"
        className="!w-1/2 !max-w-[50vw] sm:!w-1/2"
        style={{ width: "50vw", maxWidth: "50vw" }}
      >
        {title && (
          <DrawerHeader className="px-4 sm:px-6">
            <DrawerTitle className="text-lg sm:text-xl">{title}</DrawerTitle>
            <DrawerDescription className="text-sm">
              Visualizza e modifica i dettagli dell'elemento selezionato
            </DrawerDescription>
          </DrawerHeader>
        )}
        <div
          className={`p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-${
            title ? "120px" : "20px"
          })]`}
        >
          {row ? detailsRenderer(row.data) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
