import * as React from "react";
import { useState } from "react";
import { type BulkCompanyInput } from "@/api/companies";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Upload, AlertCircle, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { VisuraCameraleParser } from "@/utils/visuraCameraleParser";

interface ImportCompanyByPdfProps {
  onImportSuccess: (companies: BulkCompanyInput[]) => void;
  /** When true, render only the form content (no Drawer/Trigger); for use inside create drawer */
  embedded?: boolean;
  onCloseParentDrawer?: () => void;
}

/**
 * Componente per importare dati aziendali da PDF (visura camerale)
 */
export function ImportCompanyByPdf({
  onImportSuccess,
  embedded = false,
  onCloseParentDrawer,
}: ImportCompanyByPdfProps): React.ReactElement {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");

  /**
   * Estrae il testo da un PDF usando pdfjs-dist (browser-compatible)
   */
  const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
      // Importa pdfjs-dist dinamicamente
      const pdfjsLib = await import("pdfjs-dist");

      // Configura il worker - OBBLIGATORIO anche se non lo usiamo
      // Usa jsdelivr che è più affidabile
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      // Leggi il file come ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Carica il documento PDF
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });
      const pdf = await loadingTask.promise;

      // Estrai il testo da tutte le pagine
      const textParts: string[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Estrai il testo dagli items del contenuto
        const pageText = textContent.items
          .map((item) => {
            // TextItem ha la proprietà str
            if ("str" in item) {
              return item.str;
            }
            return "";
          })
          .join(" ");

        textParts.push(pageText);
      }

      const fullText = textParts.join("\n\n");
      return fullText;
    } catch (error) {
      console.error("Errore nell'estrazione del testo dal PDF:", error);
      throw new Error(
        "Impossibile leggere il PDF. Assicurati che sia un file PDF valido.",
      );
    }
  };

  /**
   * Gestisce la selezione/drop del file PDF
   */
  const handleFileSelect = async (file: File): Promise<void> => {
    // Verifica che sia un PDF
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast.error("Per favore carica un file PDF");
      return;
    }

    setIsProcessing(true);
    setImportErrors([]);
    setImportWarnings([]);
    setExtractedText("");

    try {
      // Estrai il testo dal PDF
      const text = await extractTextFromPdf(file);
      setExtractedText(text);

      // Parsa il testo per estrarre i dati aziendali
      const parsedData = VisuraCameraleParser.parse(text);

      // Valida i dati estratti
      const validation = VisuraCameraleParser.validate(parsedData);

      if (!validation.isValid) {
        setImportErrors(validation.errors);
        toast.error("Dati incompleti nel PDF");
        setIsProcessing(false);
        return;
      }

      // Prepara l'oggetto azienda per l'importazione
      const company: BulkCompanyInput = {
        name: parsedData.name,
        vatNumber: parsedData.vatNumber,
        fiscalCode: parsedData.fiscalCode,
      };

      // Aggiungi campi opzionali se presenti
      if (parsedData.address) company.address = parsedData.address;
      if (parsedData.city) company.city = parsedData.city;
      if (parsedData.cap) company.cap = parsedData.cap;
      if (parsedData.email) company.email = parsedData.email;
      if (parsedData.nation) company.nation = parsedData.nation;

      // Chiama la callback per aggiungere l'azienda alla tabella
      onImportSuccess([company]);

      toast.success("Dati estratti con successo dal PDF");

      setImportErrors([]);
      setImportWarnings([]);
      setExtractedText("");
      if (embedded) {
        onCloseParentDrawer?.();
      } else {
        setIsDrawerOpen(false);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Errore sconosciuto";
      toast.error(`Errore nell'importazione: ${errorMessage}`);
      setImportErrors([errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Gestisce il drag & drop
   */
  const handleDrag = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  /**
   * Resetta lo stato quando la drawer viene chiusa
   */
  const handleDrawerOpenChange = (open: boolean): void => {
    setIsDrawerOpen(open);
    if (!open) {
      setImportErrors([]);
      setImportWarnings([]);
      setExtractedText("");
      setDragActive(false);
    }
  };

  const importContent = (
    <div className="space-y-4 p-4 overflow-x-hidden">
      {/* Area Drag & Drop */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 ${
          dragActive
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-gray-300 hover:border-gray-400"
        } ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
          id="pdf-file-input"
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center justify-center text-center">
          {isProcessing ? (
            <Spinner size={40} ariaLabel="Elaborazione PDF" className="mb-4" />
          ) : (
            <Upload
              className={`h-12 w-12 mb-4 transition-colors ${
                dragActive ? "text-primary" : "text-gray-400"
              }`}
            />
          )}

          {!isProcessing && (
            <>
              <h3 className="text-lg font-medium mb-2">
                Trascina qui il PDF della visura camerale
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                oppure clicca per selezionare un file
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  document.getElementById("pdf-file-input")?.click()
                }
                disabled={isProcessing}
              >
                Seleziona File
              </Button>
              <p className="text-xs text-gray-400 mt-4">
                Formati supportati: PDF
              </p>
            </>
          )}

          {isProcessing && (
            <p className="text-sm text-gray-600">
              Elaborazione del PDF in corso...
            </p>
          )}
        </div>
      </div>

      {/* Errori */}
      {importErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">
              Errori trovati ({importErrors.length}):
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              {importErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {importWarnings.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">
              Avvisi ({importWarnings.length}):
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              {importWarnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Testo estratto (debug - solo per sviluppo) */}
      {extractedText && import.meta.env.DEV && (
        <details className="bg-gray-50 p-4 rounded-lg">
          <summary className="font-medium text-sm mb-2 cursor-pointer">
            Testo estratto (debug)
          </summary>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
            {extractedText.substring(0, 1000)}
            {extractedText.length > 1000 && "..."}
          </pre>
        </details>
      )}
    </div>
  );

  if (embedded) {
    return importContent;
  }

  return (
    <Drawer open={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 bg-transparent hover:bg-transparent hover:text-black hover:border-agri-green-600"
        >
          <FileText className="h-4 w-4" />
          Importa file
        </Button>
      </DrawerTrigger>
      <DrawerContent
        data-vaul-drawer-direction="right"
        className="!w-1/2 !max-w-[50vw] h-full overflow-y-auto overflow-x-hidden bg-white p-2"
      >
        <DrawerHeader>
          <DrawerTitle>Importa Azienda da Visura Camerale</DrawerTitle>
          <DrawerDescription>
            Carica un file PDF della visura camerale. I dati dell'azienda
            verranno estratti automaticamente.
          </DrawerDescription>
        </DrawerHeader>
        {importContent}
      </DrawerContent>
    </Drawer>
  );
}
