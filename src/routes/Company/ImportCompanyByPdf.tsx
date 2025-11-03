import * as React from "react";
import { useState } from "react";
import { type BulkCompanyInput } from "@/api/companies";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { VisuraCameraleParser } from "@/utils/visuraCameraleParser";

interface ImportCompanyByPdfProps {
  onImportSuccess: (companies: BulkCompanyInput[]) => void;
}

/**
 * Componente per importare dati aziendali da PDF (visura camerale)
 */
export function ImportCompanyByPdf({
  onImportSuccess,
}: ImportCompanyByPdfProps): React.ReactElement {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
        "Impossibile leggere il PDF. Assicurati che sia un file PDF valido."
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

      // Chiudi il dialog e resetta lo stato
      setIsDialogOpen(false);
      setImportErrors([]);
      setImportWarnings([]);
      setExtractedText("");
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
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  /**
   * Resetta lo stato quando il dialog viene chiuso
   */
  const handleDialogOpenChange = (open: boolean): void => {
    setIsDialogOpen(open);
    if (!open) {
      setImportErrors([]);
      setImportWarnings([]);
      setExtractedText("");
      setDragActive(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Importa da PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Importa Azienda da Visura Camerale</DialogTitle>
          <DialogDescription>
            Carica un file PDF della visura camerale. I dati dell'azienda
            verranno estratti automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Area Drag & Drop */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
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
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isProcessing}
            />

            <div className="space-y-2">
              <div className="flex justify-center">
                {isProcessing ? (
                  <Spinner size={40} ariaLabel="Elaborazione PDF" />
                ) : (
                  <Upload className="h-12 w-12 text-gray-400" />
                )}
              </div>

              {!isProcessing && (
                <>
                  <p className="text-sm font-medium text-gray-700">
                    Trascina qui il PDF della visura camerale
                  </p>
                  <p className="text-xs text-gray-500">
                    oppure clicca per selezionare il file
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
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

          {/* Informazioni */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm text-blue-900 mb-1">
                  Dati estratti automaticamente:
                </h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Nome azienda / Ragione sociale</li>
                  <li>• Partita IVA</li>
                  <li>• Codice fiscale</li>
                  <li>• Indirizzo sede legale</li>
                  <li>• Città e CAP</li>
                  <li>• Email / PEC</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
