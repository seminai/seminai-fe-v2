import { useState, useMemo, useCallback } from "react";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import { PageHeader } from "@/components/organism/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileUp, PenLine } from "lucide-react";
import FileImportSection from "./FileImportSection";
import ManualProductForm from "./ManualProductForm";

class NavigationManager {
  private readonly navigateFn: NavigateFunction;

  constructor(navigateFn: NavigateFunction) {
    this.navigateFn = navigateFn;
  }

  public goBack(): void {
    this.navigateFn(-1);
  }

  public goToProducts(): void {
    this.navigateFn("/products");
  }
}

export default function NewProduct() {
  const navigate = useNavigate();
  const navigationManager = useMemo(
    () => new NavigationManager(navigate),
    [navigate],
  );

  const [creationMode, setCreationMode] = useState<null | "manual" | "import">(
    null,
  );

  const handleBackToChoice = useCallback(() => {
    setCreationMode(null);
  }, []);

  const handleCancel = useCallback(() => {
    navigationManager.goBack();
  }, [navigationManager]);

  const handleProductCreated = useCallback(() => {
    navigationManager.goToProducts();
  }, [navigationManager]);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] lg:h-screen">
      <div className="flex-shrink-0 bg-gray-50/50 backdrop-blur-sm z-10">
        <PageHeader title="Nuovo Prodotto">
          <div className="flex items-center gap-2">
            {creationMode !== null && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToChoice}
                className="text-muted-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Torna alla scelta
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleCancel}
              className="border-red-200 text-red-600 bg-transparent hover:bg-transparent hover:text-red-600 hover:border-red-200"
            >
              Annulla
            </Button>
          </div>
        </PageHeader>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {creationMode === null && (
          <div className="flex-1 overflow-auto px-6 pb-6">
            <div className="py-12">
              <h2 className="text-xl font-semibold text-center mb-2">
                Come vuoi aggiungere i prodotti?
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-8">
                Scegli tra importazione da file (CSV/Excel o DDT) oppure
                inserimento manuale dei dati prodotto.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-auto py-6 flex flex-col gap-2 border-2 hover:border-agri-green-500 hover:bg-agri-green-50 hover:text-foreground"
                  onClick={() => setCreationMode("import")}
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
                  onClick={() => setCreationMode("manual")}
                >
                  <PenLine className="h-10 w-10 text-agri-green-600" />
                  <span className="font-medium">Inserisci manualmente</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Compila il form con i dati del prodotto
                  </span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {creationMode === "import" && (
          <FileImportSection onImportCompleted={handleProductCreated} />
        )}

        {creationMode === "manual" && (
          <ManualProductForm onProductCreated={handleProductCreated} />
        )}
      </div>
    </div>
  );
}
