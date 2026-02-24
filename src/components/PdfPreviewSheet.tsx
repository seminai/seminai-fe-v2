import { ExternalLink, FileText } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type PdfPreviewSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** URL of the PDF to display (remote or blob URL) */
  pdfUrl: string;
  /** File name to show in the header */
  fileName?: string;
};

export function PdfPreviewSheet({
  open,
  onOpenChange,
  pdfUrl,
  fileName,
}: PdfPreviewSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-2xl w-full flex flex-col p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-500 shrink-0" />
            <SheetTitle className="truncate">
              {fileName || "Anteprima PDF"}
            </SheetTitle>
          </div>
          <SheetDescription className="flex items-center gap-2">
            <span className="truncate">Anteprima del documento</span>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-7 px-2 text-xs"
              asChild
            >
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                Apri in nuova tab <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 min-h-0 p-2">
          <iframe
            src={pdfUrl}
            className="w-full h-full rounded-lg border"
            title={fileName || "PDF Preview"}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
