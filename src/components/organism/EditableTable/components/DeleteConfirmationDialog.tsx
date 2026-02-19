import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** When set, user must type this exact text to enable the confirm button (e.g. "delete"). */
  confirmRequiredText?: string;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  targetLabel,
  onConfirm,
  onCancel,
  confirmRequiredText,
}: DeleteConfirmationDialogProps): React.ReactElement {
  const label = targetLabel || "gli elementi selezionati";
  const [typedValue, setTypedValue] = React.useState("");

  const canConfirm = confirmRequiredText
    ? typedValue.trim().toLowerCase() === confirmRequiredText.trim().toLowerCase()
    : true;

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) setTypedValue("");
      onOpenChange(next);
    },
    [onOpenChange]
  );

  const handleConfirm = React.useCallback(() => {
    if (!canConfirm) return;
    setTypedValue("");
    onConfirm();
  }, [canConfirm, onConfirm]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Conferma eliminazione</DialogTitle>
          <DialogDescription>
            {`Confermi di voler eliminare ${label}?`}
            {confirmRequiredText && (
              <span className="block mt-2">
                Digita <strong>{confirmRequiredText}</strong> per confermare.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        {confirmRequiredText && (
          <Input
            type="text"
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            placeholder={confirmRequiredText}
            className="mt-2"
            aria-label={`Digita ${confirmRequiredText} per confermare`}
            autoComplete="off"
          />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Annulla
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm}
            aria-label="Conferma eliminazione"
          >
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
