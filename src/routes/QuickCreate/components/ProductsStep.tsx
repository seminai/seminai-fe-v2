import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, PenLine } from "lucide-react";
import FileImportSection from "@/routes/Products/NewProduct/FileImportSection";
import ManualProductForm from "@/routes/Products/NewProduct/ManualProductForm";
import type { ProductsStepState } from "./WizardFooter";

interface ProductsStepProps {
  companyId: string;
  onComplete: () => void;
  /** Ref to store the import trigger function for external invocation (from wizard footer) */
  importTriggerRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  /** Ref to store the extraction trigger (pre-extraction primary CTA in footer) */
  extractionTriggerRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  /**
   * Ref populated with "go back to edit" while the import panel is on the
   * review step. Allows the wizard footer to intercept the back action.
   */
  importBackTriggerRef?: React.MutableRefObject<(() => void) | null>;
  /** Called when products step loading/ready state changes (for footer label and disabled) */
  onProductsStepStateChange?: (state: ProductsStepState) => void;
}

export default function ProductsStep({
  companyId,
  onComplete,
  importTriggerRef,
  extractionTriggerRef,
  importBackTriggerRef,
  onProductsStepStateChange,
}: ProductsStepProps): React.ReactElement {
  const [mode, setMode] = useState<null | "import" | "manual">(null);
  const [, setStepState] = useState<ProductsStepState>({
    isProductsLoading: false,
    hasProductsToLoad: false,
    needsExtraction: false,
    importStep: "edit",
  });

  const handleBackToChoice = useCallback(() => {
    setMode(null);
  }, []);

  const notifyLoading = useCallback(
    (loading: boolean) => {
      setStepState((prev) => {
        const next = { ...prev, isProductsLoading: loading };
        onProductsStepStateChange?.(next);
        return next;
      });
    },
    [onProductsStepStateChange],
  );

  const notifyHasProducts = useCallback(
    (has: boolean) => {
      setStepState((prev) => {
        const next = { ...prev, hasProductsToLoad: has };
        onProductsStepStateChange?.(next);
        return next;
      });
    },
    [onProductsStepStateChange],
  );

  const notifyNeedsExtraction = useCallback(
    (needs: boolean) => {
      setStepState((prev) => {
        if (prev.needsExtraction === needs) return prev;
        const next = { ...prev, needsExtraction: needs };
        onProductsStepStateChange?.(next);
        return next;
      });
    },
    [onProductsStepStateChange],
  );

  const notifyImportStep = useCallback(
    (importStep: "edit" | "review") => {
      setStepState((prev) => {
        if (prev.importStep === importStep) return prev;
        const next = { ...prev, importStep };
        onProductsStepStateChange?.(next);
        return next;
      });
    },
    [onProductsStepStateChange],
  );

  // When on choice screen: no loading, no products to load; clear ref
  useEffect(() => {
    if (mode !== null) return;
    const reset: ProductsStepState = {
      isProductsLoading: false,
      hasProductsToLoad: false,
      needsExtraction: false,
      importStep: "edit",
    };
    setStepState(reset);
    onProductsStepStateChange?.(reset);
    if (importTriggerRef) importTriggerRef.current = null;
    if (extractionTriggerRef) extractionTriggerRef.current = null;
    if (importBackTriggerRef) importBackTriggerRef.current = null;
  }, [
    mode,
    onProductsStepStateChange,
    importTriggerRef,
    extractionTriggerRef,
    importBackTriggerRef,
  ]);

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
          extractionTriggerRef={extractionTriggerRef}
          importBackTriggerRef={importBackTriggerRef}
          onLoadingChange={notifyLoading}
          onHasProductsToLoadChange={notifyHasProducts}
          onNeedsExtractionChange={notifyNeedsExtraction}
          onImportStepChange={notifyImportStep}
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
          importTriggerRef={importTriggerRef}
          onLoadingChange={notifyLoading}
          onHasProductsToLoadChange={notifyHasProducts}
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
