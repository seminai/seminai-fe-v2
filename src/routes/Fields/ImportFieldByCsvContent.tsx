import * as React from "react";
import { AlertCircle, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CsvFieldImporter } from "@/components/organism/CsvFieldImporter";
import { SupportRequestForm } from "@/components/organism/SupportRequestForm";
import { type Company } from "@/api/companies";
import { CompanySearchSelect } from "./CompanySearchSelect";

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

interface ImportFieldByCsvContentProps {
  companies: Company[];
  selectedCompanyId: string;
  onCompanyChange: (value: string) => void;
  onFileSelect: (files: File[]) => void;
  isProcessing: boolean;
  onCancelProcessing?: () => void;
  processingProgress?: number | null;
  processingMessage?: string | null;
  processingElapsedMs?: number;
  importErrors: string[];
  importWarnings: string[];
  showSupportForm: boolean;
  onToggleSupportForm: () => void;
  onDownloadTemplate: () => void;
  onSupportRequestSuccess: () => void;
}

export function ImportFieldByCsvContent({
  companies,
  selectedCompanyId,
  onCompanyChange,
  onFileSelect,
  isProcessing,
  onCancelProcessing,
  processingProgress,
  processingMessage,
  processingElapsedMs = 0,
  importErrors,
  importWarnings,
  showSupportForm,
  onToggleSupportForm,
  onDownloadTemplate,
  onSupportRequestSuccess,
}: ImportFieldByCsvContentProps): React.ReactElement {
  return (
    <div className="space-y-4 p-4 flex flex-col flex-1">
      {/* Selezione azienda in evidenza per prima */}
      <div className="space-y-2">
        <label className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Seleziona azienda di destinazione
        </label>
        <CompanySearchSelect
          companies={companies}
          value={selectedCompanyId}
          onChange={onCompanyChange}
        />
      </div>

      {/* Area upload sotto alla selezione azienda */}
      <div
        className={`flex-1 transition-opacity duration-200 ${
          !selectedCompanyId ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <CsvFieldImporter
          onFileSelect={onFileSelect}
          isProcessing={isProcessing}
          onCancel={onCancelProcessing}
        />
      </div>

      {!selectedCompanyId && (
        <p className="text-xs text-muted-foreground text-center">
          Seleziona un'azienda per abilitare l'upload del file
        </p>
      )}

      {isProcessing && (
        <div className="space-y-3 rounded-lg border border-agri-green-100 bg-agri-green-50/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Spinner size={18} ariaLabel="Elaborazione file" />
              <span>{processingMessage || "Estrazione campi in corso..."}</span>
            </div>
            {processingElapsedMs > 0 && (
              <span className="text-xs tabular-nums text-gray-400">
                {formatElapsed(processingElapsedMs)}
              </span>
            )}
          </div>

          {typeof processingProgress === "number" && processingProgress > 0 && (
            <div className="space-y-1">
              <div className="w-full bg-gray-200/70 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full bg-agri-green-600 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(processingProgress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-right tabular-nums">
                {Math.round(processingProgress)}%
              </p>
            </div>
          )}

          {onCancelProcessing && (
            <button
              type="button"
              onClick={onCancelProcessing}
              className="text-xs text-red-500 hover:text-red-700 underline transition-colors"
            >
              Annulla estrazione
            </button>
          )}
        </div>
      )}

      {importErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">
              Errori trovati ({importErrors.length}):
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
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
            <ul className="list-disc list-inside space-y-1 text-xs">
              {importWarnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {showSupportForm && (
        <div className="bg-white p-6 rounded-3xl border border-agri-green-100 text-left shadow-lg shadow-agri-green-50">
          <h4 className="font-medium text-lg mb-4">Richiedi supporto</h4>
          <p className="text-sm text-gray-600 mb-4">
            In caso di problemi con l'importazione del file, compila il form qui
            sotto per contattare il servizio di supporto.
          </p>
          <SupportRequestForm
            onSuccess={onSupportRequestSuccess}
            className="shadow-none border-none bg-transparent p-0"
          />
        </div>
      )}

      {/* Footer: Scarica template a sinistra (testuale), Richiedi supporto a destra - space-between */}
      <div className="flex justify-between items-center pt-4 mt-auto border-t">
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={onDownloadTemplate}
          className="gap-2 p-0 h-auto font-normal"
        >
          <Download className="h-4 w-4" />
          Scarica template
        </Button>
        <button
          type="button"
          onClick={onToggleSupportForm}
          className="text-sm text-black hover:text-black underline transition-colors"
        >
          Richiedi supporto
        </button>
      </div>
    </div>
  );
}
