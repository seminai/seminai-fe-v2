import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Upload, AlertCircle, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import Papa from "papaparse";
import type { DosageProduct } from "@/api/dosage-agent";

interface ImportProductsProps {
  onAddRows?: (rows: Array<Record<string, unknown>>) => void;
  onProductsChange?: (products: DosageProduct[]) => void;
  onCloseParentDrawer?: () => void;
  onOpenParentDrawer?: () => void;
}

type CsvRow = {
  name: string;
  "numero di registrazione": string;
  quantità: string;
  "unità di misura": string;
  "nome fornitore"?: string;
  "partita iva"?: string;
};

/**
 * ImportProducts - Componente per gestire l'importazione di prodotti fitosanitari da file CSV
 * Contiene tutta la logica di parsing, validazione e importazione
 */
export function ImportProducts({
  onAddRows,
  onProductsChange,
  onCloseParentDrawer,
  onOpenParentDrawer,
}: ImportProductsProps): React.ReactElement {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [shouldRestoreParentDrawer, setShouldRestoreParentDrawer] =
    useState(false);

  /**
   * Gestisce la selezione del file CSV e avvia il processo di importazione
   */
  const handleFileSelect = async (file: File): Promise<void> => {
    setIsProcessing(true);
    setImportErrors([]);
    setImportWarnings([]);
    setSelectedFile(file);

    // Validate file type
    if (!file.name.endsWith(".csv")) {
      const errorMsg =
        "Formato file non valido. Il file deve essere in formato CSV.";
      setImportErrors([errorMsg]);
      toast.error(errorMsg);
      setIsProcessing(false);
      return;
    }

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const errors: string[] = [];
          const warnings: string[] = [];
          const parsedProducts: DosageProduct[] = [];

          results.data.forEach((row, index) => {
            const rowNumber = index + 2; // +2 perché la prima riga è l'header e l'index parte da 0

            // Validate required fields
            if (!row.name || !row.name.trim()) {
              errors.push(
                `Riga ${rowNumber}: Campo "name" obbligatorio mancante`
              );
              return;
            }

            if (
              !row["numero di registrazione"] ||
              !row["numero di registrazione"].trim()
            ) {
              errors.push(
                `Riga ${rowNumber}: Campo "numero di registrazione" obbligatorio mancante`
              );
              return;
            }

            if (!row["quantità"] || !row["quantità"].trim()) {
              errors.push(
                `Riga ${rowNumber}: Campo "quantità" obbligatorio mancante`
              );
              return;
            }

            if (!row["unità di misura"] || !row["unità di misura"].trim()) {
              errors.push(
                `Riga ${rowNumber}: Campo "unità di misura" obbligatorio mancante`
              );
              return;
            }

            // Validate quantity
            const quantity = parseFloat(row["quantità"].replace(",", "."));
            if (isNaN(quantity) || quantity <= 0) {
              errors.push(
                `Riga ${rowNumber}: La quantità deve essere un numero positivo`
              );
              return;
            }

            // Warnings for optional fields
            if (!row["nome fornitore"] || !row["nome fornitore"].trim()) {
              warnings.push(
                `Riga ${rowNumber}: Campo "nome fornitore" non specificato`
              );
            }

            if (!row["partita iva"] || !row["partita iva"].trim()) {
              warnings.push(
                `Riga ${rowNumber}: Campo "partita iva" non specificato`
              );
            }

            parsedProducts.push({
              productName: row.name.trim(),
              registrationNumber: row["numero di registrazione"].trim(),
              quantity,
              quantityUnitOfMeasure: row["unità di misura"].trim(),
              supplierName: row["nome fornitore"]?.trim() || undefined,
              supplierVat: row["partita iva"]?.trim() || undefined,
            });
          });

          // Gestisci gli errori bloccanti
          if (errors.length > 0) {
            setImportErrors(errors);
            toast.error(`Errori trovati nel file: ${errors.length} errori`);
            setIsProcessing(false);
            return;
          }

          // Mostra i warnings ma non bloccare l'importazione
          if (warnings.length > 0) {
            setImportWarnings(warnings);
          }

          if (parsedProducts.length === 0) {
            const errorMsg = "Nessun prodotto valido trovato nel file";
            setImportErrors([errorMsg]);
            toast.error(errorMsg);
            setIsProcessing(false);
            return;
          }

          // Converti i prodotti in formato Record per EditableTable
          const rowsData: Array<Record<string, unknown>> = parsedProducts.map(
            (product) => ({
              productName: product.productName,
              registrationNumber: product.registrationNumber,
              quantity: product.quantity,
              quantityUnitOfMeasure: product.quantityUnitOfMeasure,
              supplierName: product.supplierName || "",
              supplierVat: product.supplierVat || "",
            })
          );

          // Se c'è onAddRows, aggiungi le righe alla tabella editabile
          if (onAddRows) {
            onAddRows(rowsData);
          } else if (onProductsChange) {
            // Altrimenti usa il metodo legacy
            onProductsChange(parsedProducts);
          }

          // Chiudi il dialog e resetta lo stato
          setIsDrawerOpen(false);
          setImportErrors([]);
          setImportWarnings([]);
          setSelectedFile(null);

          toast.success("Prodotti importati con successo", {
            description: `${parsedProducts.length} prodotti caricati`,
          });
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Errore sconosciuto";
          setImportErrors([errorMessage]);
          toast.error(`Errore nell'importazione: ${errorMessage}`);
        } finally {
          setIsProcessing(false);
        }
      },
      error: (error) => {
        const errorMsg = `Errore durante la lettura del file: ${error.message}`;
        setImportErrors([errorMsg]);
        toast.error(errorMsg);
        setIsProcessing(false);
      },
    });
  };

  /**
   * Gestisce il cambio del file input
   */
  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Resetta lo stato quando il dialog viene chiuso
   */
  const resetDrawerState = (): void => {
    setImportErrors([]);
    setImportWarnings([]);
    setSelectedFile(null);
    setIsProcessing(false);
  };

  const handleDrawerOpenChange = (open: boolean): void => {
    setIsDrawerOpen(open);
    if (!open) {
      resetDrawerState();
      if (shouldRestoreParentDrawer) {
        onOpenParentDrawer?.();
        setShouldRestoreParentDrawer(false);
      }
    }
  };

  const handleOpenDrawer = (): void => {
    onCloseParentDrawer?.();
    setShouldRestoreParentDrawer(true);
    setIsDrawerOpen(true);
  };

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={handleOpenDrawer}>
        <Upload className="h-4 w-4" />
        Importa Prodotti CSV
      </Button>
      <Drawer open={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
        <DrawerContent
          data-vaul-drawer-direction="right"
          className="max-w-[700px] bg-white"
        >
          <DrawerHeader className="border-b border-neutral-100 px-6 py-5">
            <DrawerTitle>Importa Prodotti Fitosanitari da CSV</DrawerTitle>
            <DrawerDescription>
              Carica un file CSV con i dati dei prodotti fitosanitari. Verifica
              che tutti i campi obbligatori siano presenti e corretti.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {/* File Upload Area */}
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                disabled={isProcessing}
                className="hidden"
                id="csv-products-upload"
              />
              <label
                htmlFor="csv-products-upload"
                className={`flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  isProcessing
                    ? "border-neutral-200 bg-neutral-50 cursor-not-allowed"
                    : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"
                }`}
              >
                <Upload
                  className={`h-12 w-12 mb-4 ${
                    isProcessing ? "text-neutral-300" : "text-neutral-400"
                  }`}
                />
                <p className="text-base font-medium text-neutral-900 mb-2">
                  {selectedFile ? selectedFile.name : "Carica file CSV"}
                </p>
                <p className="text-sm text-neutral-500 max-w-md">
                  Clicca per selezionare un file o trascina qui
                </p>
                {selectedFile && (
                  <p className="text-xs text-neutral-400 mt-2">
                    ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </label>
            </div>

            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spinner size={20} ariaLabel="Elaborazione file" />
                <span>Elaborazione file in corso...</span>
              </div>
            )}

            {importErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">
                    Errori trovati ({importErrors.length}):
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs max-h-40 overflow-y-auto">
                    {importErrors.slice(0, 10).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {importErrors.length > 10 && (
                      <li className="text-muted-foreground">
                        ... e altri {importErrors.length - 10} errori
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {importWarnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">
                    Avvisi ({importWarnings.length}):
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs max-h-40 overflow-y-auto">
                    {importWarnings.slice(0, 10).map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                    {importWarnings.length > 10 && (
                      <li className="text-muted-foreground">
                        ... e altri {importWarnings.length - 10} avvisi
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Info Panel */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-2">
                Formato CSV Richiesto:
              </h4>
              <p className="text-xs text-gray-600 mb-2">
                Il file deve contenere le seguenti colonne (i nomi devono
                corrispondere esattamente):
              </p>
              <ul className="text-xs text-gray-600 space-y-1 mb-3">
                <li>
                  <strong>Obbligatorie:</strong> name, numero di registrazione,
                  quantità, unità di misura
                </li>
                <li>
                  <strong>Opzionali:</strong> nome fornitore, partita iva
                </li>
              </ul>
              <div className="flex items-center gap-2">
                <a
                  href="/templates/prodotti_dosaggio_esempio.csv"
                  download="prodotti_dosaggio_esempio.csv"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Scarica template CSV di esempio
                </a>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
