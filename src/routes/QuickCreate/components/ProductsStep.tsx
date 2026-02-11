import * as React from "react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, PenLine } from "lucide-react";
import FileImportSection from "@/routes/Products/NewProduct/FileImportSection";
import ManualProductForm from "@/routes/Products/NewProduct/ManualProductForm";

interface ProductsStepProps {
  companyId: string;
  onComplete: () => void;
  /** Ref to store the import trigger function for external invocation (from wizard footer) */
  importTriggerRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

export default function ProductsStep({
  companyId,
  onComplete,
  importTriggerRef,
}: ProductsStepProps): React.ReactElement {
  const [mode, setMode] = useState<null | "import" | "manual">(null);

  const handleBackToChoice = useCallback(() => {
    setMode(null);
  }, []);

  if (mode === "import") {
    return (
      <div className="flex flex-col flex-1">
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToChoice}
            className="text-muted-foreground"
          >
            Torna alla scelta
          </Button>
        </div>
        <FileImportSection
          preselectedCompanyId={companyId}
          onImportCompleted={onComplete}
          hideImportButton={!!importTriggerRef}
          importTriggerRef={importTriggerRef}
        />
      </div>
    );
  }

  if (mode === "manual") {
    return (
      <div className="flex flex-col flex-1">
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToChoice}
            className="text-muted-foreground"
          >
            Torna alla scelta
          </Button>
        </div>
        <ManualProductForm
          preselectedCompanyId={companyId}
          onProductCreated={onComplete}
        />
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-neutral-800 mb-2 text-center">
        Carica Prodotti a Magazzino
      </h2>
      <p className="text-neutral-500 mb-8 text-center">
        Scegli tra importazione da file (CSV/Excel o DDT) oppure inserimento
        manuale dei dati prodotto.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        <Button
          variant="outline"
          size="lg"
          className="h-auto py-6 flex flex-col gap-2 border-2 hover:border-agri-green-500 hover:bg-agri-green-50 hover:text-foreground"
          onClick={() => setMode("import")}
        >
          <FileUp className="h-10 w-10 text-agri-green-600" />
          <span className="font-medium">Importa da file</span>
          <span className="text-xs text-muted-foreground font-normal">
            CSV, Excel o file DDT PDF
          </span>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-auto py-6 flex flex-col gap-2 border-2 hover:border-agri-green-500 hover:bg-agri-green-50 hover:text-foreground"
          onClick={() => setMode("manual")}
        >
          <PenLine className="h-10 w-10 text-agri-green-600" />
          <span className="font-medium">Inserisci manualmente</span>
          <span className="text-xs text-muted-foreground font-normal">
            Compila il form con i dati del prodotto
          </span>
        </Button>
      </div>
    </>
  );
}
