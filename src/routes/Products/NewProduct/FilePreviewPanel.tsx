import { useCallback, useEffect, useRef } from "react";
import { FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface FilePreviewPanelProps {
  fileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
}

class ExcelRenderer {
  public static async renderToIframe(
    url: string,
    iframe: HTMLIFrameElement,
  ): Promise<void> {
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      throw new Error("Failed to fetch Excel file");
    }
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const html = XLSX.utils.sheet_to_html(
      workbook.Sheets[workbook.SheetNames[0]],
    );
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(
        `<html><head><style>
          body { font-family: Arial, sans-serif; padding: 12px; margin: 0; font-size: 12px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: 600; }
          tr:nth-child(even) { background-color: #fafafa; }
        </style></head><body>${html}</body></html>`,
      );
      doc.close();
    }
  }
}

class MimeTypeClassifier {
  public static isPdf(mimeType: string): boolean {
    return mimeType.toLowerCase() === "application/pdf";
  }

  public static isExcel(mimeType: string): boolean {
    const lower = mimeType.toLowerCase();
    return (
      lower ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      lower === "application/vnd.ms-excel"
    );
  }

  public static isCsv(mimeType: string): boolean {
    const lower = mimeType.toLowerCase();
    return lower === "text/csv" || lower === "application/csv";
  }

  public static isImage(mimeType: string): boolean {
    return mimeType.toLowerCase().startsWith("image/");
  }
}

export default function FilePreviewPanel({
  fileUrl,
  fileName,
  mimeType,
}: FilePreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const loadPreview = useCallback(async () => {
    if (!fileUrl || !mimeType || !iframeRef.current) return;

    if (
      MimeTypeClassifier.isPdf(mimeType) ||
      MimeTypeClassifier.isImage(mimeType)
    ) {
      iframeRef.current.src = fileUrl;
      return;
    }

    if (MimeTypeClassifier.isExcel(mimeType)) {
      try {
        await ExcelRenderer.renderToIframe(fileUrl, iframeRef.current);
      } catch {
        toast.error("Impossibile visualizzare il file Excel.");
        iframeRef.current.src = fileUrl;
      }
      return;
    }

    if (MimeTypeClassifier.isCsv(mimeType)) {
      try {
        const response = await fetch(fileUrl, { credentials: "include" });
        const text = await response.text();
        const rows = text.split("\n").map((line) => line.split(/[,;\t]/));
        const headerRow = rows[0] ?? [];
        const bodyRows = rows.slice(1).filter((r) => r.some((c) => c.trim()));
        const tableHtml = `<table><thead><tr>${headerRow.map((h) => `<th>${h.trim()}</th>`).join("")}</tr></thead><tbody>${bodyRows.map((r) => `<tr>${r.map((c) => `<td>${c.trim()}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
        const doc =
          iframeRef.current.contentDocument ||
          iframeRef.current.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(
            `<html><head><style>
              body { font-family: Arial, sans-serif; padding: 12px; margin: 0; font-size: 12px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: 600; }
              tr:nth-child(even) { background-color: #fafafa; }
            </style></head><body>${tableHtml}</body></html>`,
          );
          doc.close();
        }
      } catch {
        iframeRef.current.src = fileUrl;
      }
      return;
    }

    iframeRef.current.src = fileUrl;
  }, [fileUrl, mimeType]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  if (!fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-8">
        <FileText className="h-16 w-16 opacity-30" />
        <p className="text-sm font-medium">Nessun file caricato</p>
        <p className="text-xs text-center">
          Carica un file CSV/Excel o DDT PDF per vederne l&apos;anteprima qui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {fileName && (
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-gray-50 flex-shrink-0">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{fileName}</span>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          title={fileName ?? "Anteprima file"}
        />
      </div>
    </div>
  );
}
