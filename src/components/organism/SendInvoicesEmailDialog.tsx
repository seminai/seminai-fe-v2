import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { emailApiService } from "@/api/email";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const INVOICE_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic";

interface SendInvoicesEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendInvoicesEmailDialog({
  open,
  onOpenChange,
}: SendInvoicesEmailDialogProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const resetForm = () => {
    setName("");
    setEmail("");
    setMessage("");
    setFiles([]);
    setErrorMessage("");
    setSuccessMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isSubmitting) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files;
    if (!selected?.length) return;
    setFiles(Array.from(selected));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedName || !trimmedEmail || files.length === 0) {
      setErrorMessage(t("landing.emailFallback.validation.required"));
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage(t("landing.emailFallback.validation.invalidEmail"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await emailApiService.sendContactEmail({
        name: trimmedName,
        email: trimmedEmail,
        body:
          trimmedMessage ||
          t("landing.emailFallback.defaultBody", { name: trimmedName }),
        files,
      });

      setSuccessMessage(
        response.message ?? t("landing.emailFallback.status.success"),
      );
      setName("");
      setEmail("");
      setMessage("");
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsSubmitting(false);
    } catch {
      setIsSubmitting(false);
      setErrorMessage(t("landing.emailFallback.status.error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("landing.emailFallback.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("landing.emailFallback.dialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1.5 text-left">
            <span className="text-sm font-medium">
              {t("landing.emailFallback.fields.name")}
            </span>
            <input
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder={t("landing.emailFallback.placeholders.name")}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              required
            />
          </label>

          <label className="block space-y-1.5 text-left">
            <span className="text-sm font-medium">
              {t("landing.emailFallback.fields.email")}
            </span>
            <input
              type="email"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder={t("landing.emailFallback.placeholders.email")}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              required
            />
          </label>

          <label className="block space-y-1.5 text-left">
            <span className="text-sm font-medium">
              {t("landing.emailFallback.fields.message")}
            </span>
            <textarea
              className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder={t("landing.emailFallback.placeholders.message")}
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setErrorMessage("");
                setSuccessMessage("");
              }}
            />
          </label>

          <div className="space-y-2 text-left">
            <span className="text-sm font-medium">
              {t("landing.emailFallback.fields.files")}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept={INVOICE_ACCEPT}
              multiple
              className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-agri-green-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-agri-green-700"
              onChange={handleFilesChange}
            />
            <p className="text-xs text-muted-foreground">
              {t("landing.emailFallback.filesHint")}
            </p>
            {files.length > 0 && (
              <ul className="space-y-1 text-sm">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.lastModified}`}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2"
                  >
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => removeFile(index)}
                    >
                      {t("landing.emailFallback.removeFile")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {errorMessage && (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="text-sm text-agri-green-700" role="status">
              {successMessage}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              className={cn("bg-agri-green-600 hover:bg-agri-green-700")}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t("landing.emailFallback.status.submitting")
                : t("landing.emailFallback.status.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
