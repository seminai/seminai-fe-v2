import * as React from "react";
import { type CompanyFile } from "@/api/files";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface FileViewerProps {
  file: CompanyFile | null;
  isOpen: boolean;
  onClose: () => void;
}

async function loadFileIntoIframe(
  file: CompanyFile,
  iframe: HTMLIFrameElement,
): Promise<void> {
  const mimeType = file.metadata.mimeType.toLowerCase();

  // PDFs and images: fetch as blob to avoid CORS / X-Frame-Options issues
  if (mimeType === "application/pdf" || mimeType.includes("image/")) {
    try {
      const response = await fetch(file.url, { credentials: "include" });
      if (!response.ok) throw new Error("fetch failed");
      const blob = await response.blob();
      iframe.src = URL.createObjectURL(blob);
    } catch {
      // Fallback: direct URL (may work for public buckets)
      iframe.src = file.url;
    }
    return;
  }

  // XML: load directly in iframe so the browser displays it (avoids CORS — no fetch from our origin)
  if (
    mimeType === "application/xml" ||
    mimeType === "text/xml" ||
    file.name.toLowerCase().endsWith(".xml")
  ) {
    iframe.src = file.url;
    return;
  }

  // Word documents
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    iframe.src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`;
    return;
  }

  // Excel files
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel"
  ) {
    try {
      const response = await fetch(file.url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch Excel file");
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const html = XLSX.utils.sheet_to_html(
        workbook.Sheets[workbook.SheetNames[0]],
      );
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(
          `<html><head><style>body{font-family:Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#f2f2f2}</style></head><body>${html}</body></html>`,
        );
        doc.close();
      }
    } catch {
      toast.error("Impossibile caricare il file Excel. Prova a scaricarlo.");
      iframe.src = file.url;
    }
    return;
  }

  // Fallback
  iframe.src = file.url;
}

export function FileViewer({ file, isOpen, onClose }: FileViewerProps) {
  // Callback ref: triggers re-render when iframe mounts inside the Drawer
  const [iframeEl, setIframeEl] = React.useState<HTMLIFrameElement | null>(
    null,
  );
  const loadedFileIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!isOpen || !file || !iframeEl) return;
    if (loadedFileIdRef.current === file.id) return;
    loadedFileIdRef.current = file.id;

    void loadFileIntoIframe(file, iframeEl);

    return () => {
      // Revoke blob URLs to avoid memory leaks
      if (iframeEl.src.startsWith("blob:")) {
        URL.revokeObjectURL(iframeEl.src);
      }
    };
  }, [isOpen, file, iframeEl]);

  React.useEffect(() => {
    if (!isOpen) loadedFileIdRef.current = null;
  }, [isOpen]);

  if (!file) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent
        className="!w-1/2 !max-w-[50vw] h-full"
        data-vaul-drawer-direction="right"
      >
        <DrawerHeader className="border-b">
          <DrawerTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {file.name}
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-hidden p-6">
          <iframe
            ref={setIframeEl}
            className="w-full h-full border rounded-lg"
            title={file.name}
            style={{ minHeight: "600px" }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
