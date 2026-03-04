import * as React from "react";
import { AlertCircle, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CsvFieldImporter } from "@/components/organism/CsvFieldImporter";
import { SupportRequestForm } from "@/components/organism/SupportRequestForm";
import { type Company } from "@/api/companies";
import { CompanySearchSelect } from "./CompanySearchSelect";

interface ImportFieldByCsvContentProps {
  companies: Company[];
  selectedCompanyId: string;
  onCompanyChange: (value: string) => void;
  onFileSelect: (files: File[]) => void;
  isProcessing: boolean;
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
        />
      </div>

      {!selectedCompanyId && (
        <p className="text-xs text-muted-foreground text-center">
          Seleziona un'azienda per abilitare l'upload del file
        </p>
      )}

      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Spinner size={20} ariaLabel="Elaborazione file" />
          <span>
            Estrazione campi in corso... (potrebbe richiedere alcuni minuti)
          </span>
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
